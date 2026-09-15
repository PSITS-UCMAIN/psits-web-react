import { Request, Response } from "express";

import { settingsService } from "../services/settings.service";
import { studentService } from "../services/student.service";
import { Settings } from "../models/settings.model";
import { IStudent } from "../models/student.interface";

import { membership_status } from "../enums/status.enums";
import { historyService } from "../services/history.service";
import { ISettings } from "../models/settings.interface";

import { format } from "date-fns";
import { membershipRequestReceipt } from "../mail_template/mail.template";
import { IMembershipRequest } from "../mail_template/mail.interface";
import { membershipService } from "../services/membership.service";
import { logService } from "../services/log.service";
import { logs_action } from "../enums/logs.enums";
import { catchAsync } from "../util/catch.async.util";
import { nextMembershipReference } from "../util/reference.util";
import { Membership } from "../models/membership.model";
import { AppError } from "../util/app.error.util";
import {
  formatReceiptReference,
  hasActiveMembership,
  normalizeMembershipStatus,
} from "../util/membership.util";

class MembershipController {
  // Membership related controller methods can be added here if needed

  approveMembershipController = catchAsync(
    async (req: Request, res: Response) => {
      const { id_number, admin, rfid } = req.body;

      // Independent reads — issued together rather than in series so approval
      // costs one round trip here instead of three. getSpecific throws a 404
      // AppError when the student does not exist, which catchAsync surfaces.
      const [settings, student, activeParent] = await Promise.all([
        settingsService.getConfig() as Promise<ISettings | null>,
        studentService.getSpecific(id_number) as Promise<IStudent>,
        membershipService.getActiveParent(),
      ]);

      if (!settings) {
        return res
          .status(500)
          .json({ message: "No membership price in the backend" });
      }

      
      // Block duplicate another approval for a student who already has an active membership.
      if (hasActiveMembership(student.membershipStatus)) {
        return res.status(409).json({
          message: `${studentService.fullNameFormat(
            student
          )} already has an active membership.`,
        });
      }

      // Approval requires an active membership term; the history record is
      // linked to it via membership_id.
      if (!activeParent) {
        return res.status(400).json({
          message: "No active membership. Create a membership term first.",
        });
      }

      // The reference_code is generated server-side; any value sent by a client
      // is ignored. It is claimed only once the approval has passed validation,
      // so a rejected approval no longer burns a number in the sequence, and
      // alongside the status update since neither depends on the other.
      const [reference_code, result] = await Promise.all([
        nextMembershipReference(),
        membershipService.checkApplication(student),
      ]);

      if (!result.status) {
        return res.status(400).json({ message: result.message });
      }
      const historyQuery = {
        membership_id: activeParent._id,
        id_number,
        rfid,
        reference_code,
        name: studentService.fullNameFormat(student),
        year: student.year,
        course: student.course,
        date: new Date(),
        admin: admin ? admin : req.admin.name,
        total: settings?.membership_price || 0,
      };

      const savedHistory = await historyService.record(historyQuery);

      if (!savedHistory) {
        console.error("Failed to save membership history.");

        return res
          .status(500)
          .json({ message: "Failed to save membership history" });
      }

      const data: IMembershipRequest = {
        name: studentService.fullNameFormat(student),
        reference_code,
        reference_display: formatReceiptReference(
          reference_code,
          activeParent.term_name
        ),
        total: settings?.membership_price ?? 0,
        course: student.course,
        year: student.year,
        admin: admin ?? req.admin.name,
        date: format(new Date(), "MMMM d, yyyy"),
      };

      // The approval is already durable at this point, so the receipt and the
      // audit log are not awaited — rendering the template and handing the mail
      // to Resend is a third-party round trip the admin should not wait on.
      // membershipRequestReceipt writes its queue entry as "pending" and only
      // marks it "sent" once Resend accepts it, so anything that fails or is cut
      // short here is picked up by the 1AM resendPendingEmails job.
      if (student?.email) {
        void membershipRequestReceipt(
          data,
          student.email,
          (student as any)._id,
          reference_code
        ).catch((err: unknown) =>
          console.error(
            `Membership receipt for ${reference_code} failed to send; left queued for retry:`,
            err instanceof Error ? err.message : err
          )
        );
      }

      void logService
        .create({
          admin: admin ?? req.admin?.name ?? "Unknown Admin",
          admin_id: req.admin?._id,
          action: logs_action.APPROVE_MEMBERSHIP,
          target: studentService.fullNameFormat(student),
          target_id: (student as any)._id,
          target_model: "Membership",
        })
        .catch((err: unknown) =>
          console.error(
            "Failed to write APPROVE_MEMBERSHIP log:",
            err instanceof Error ? err.message : err
          )
        );

      return res
        .status(200)
        .json({ message: "Membership approved successfully" });
    }
  );

  revokeAllMembershipController = catchAsync(
    async (req: Request, res: Response) => {
      const result = await membershipService.revokeMembership();
      if (result.status) {
        await logService.create({
          admin: req.admin?.name ?? "Unknown Admin",
          admin_id: req.admin?._id,
          action: logs_action.REVOKE_MEMBERSHIP,
          target: "All memberships",
          target_model: "Membership",
        });
        res.status(200).json({
          message: result.message,
        });
      } else {
        res.status(404).json({
          message: result.message,
        });
      }
    }
  );

  getMembershipHistoryController = catchAsync(
    async (req: Request, res: Response) => {
      const history = await historyService.getAll();
      if (!history) {
        res.status(401).json({ message: "No History" });
      }
      res.status(200).json(history);
    }
  );

  /**
   * Manual correction of a membership reference code — for records whose code is
   * wrong, or is a LEGACY-* placeholder. Does not move the sequence counter.
   */
  updateMembershipReferenceController = catchAsync(
    async (req: Request, res: Response) => {
      const { reference_code, cascade } = req.body;

      const { record, previousCode, emailsRelinked, renumbered } =
        await historyService.updateReferenceCode(
          String(req.params.id),
          reference_code,
          { cascade: cascade === true || cascade === "true" }
        );

      // A financial record's identifier changed — keep both values traceable,
      // along with how many follow-on records the cascade rewrote.
      await logService.create({
        admin: req.admin?.name ?? "System",
        admin_id: req.admin?._id,
        action: logs_action.UPDATE_MEMBERSHIP_REFERENCE,
        target:
          `${previousCode || "(blank)"} → ${record.reference_code} for ${record.name}` +
          (renumbered.length
            ? ` (+${renumbered.length} renumbered: ${renumbered
                .map((r) => `${r.from}→${r.to}`)
                .join(", ")})`
            : ""),
        target_id: String(record._id),
        target_model: "Membership",
      });

      return res.status(200).json({
        message: "Reference code updated",
        data: {
          reference_code: record.reference_code,
          emailsRelinked,
          renumbered,
        },
      });
    }
  );

  getMembershipRequestController = catchAsync(
    async (req: Request, res: Response) => {
      const students = await membershipService.getPendingMembership();
      if (!students) {
        res.status(401).json({ message: "No students request" });
      }
      res.status(200).json(students);
    }
  );

  getActiveMembershipCountController = catchAsync(
    async (req: Request, res: Response) => {
      const response = await membershipService.getActiveMembershipCount();

      res.status(200).json({ message: response });
    }
  );
  getMemberPriceController = catchAsync(async (req: Request, res: Response) => {
    const settings = await settingsService.getMembershipPrice();
    return res
      .status(200)
      .json({ membership_price: settings.membership_price });
  });
  changeMemberPriceController = catchAsync(
    async (req: Request, res: Response) => {
      const { price } = req.body;
      const update = await settingsService.updateMembershipPrice(price);
      await logService.create({
        admin: req.admin?.name ?? "Unknown Admin",
        admin_id: req.admin?._id,
        action: logs_action.CHANGE_MEMBER_PRICE,
        target: `PHP ${price}`,
        target_model: "Membership",
      });
      if (update.matchedCount === 0 && !(await Settings.exists({}))) {
        return res
          .status(200)
          .json({ message: "Member price created successfully" });
      }
      return res
        .status(200)
        .json({ message: "Member price updated successfully" });
    }
  );

  // CREATE - Create a new membership term (parent). A term carries no student;
  // students request against it and activation is recorded in history on
  // approval. Creating a term deactivates any currently active term.
  createMembershipController = catchAsync(
    async (req: Request, res: Response) => {
      const {
        membership_name,
        start_date,
        end_date,
        term_name,
      } = req.body;

      if (
        !membership_name ||
        !start_date ||
        !end_date ||
        !term_name
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const newMembership = await membershipService.createMembership({
        membership_name,
        start_date,
        end_date,
        term_name,
      });

      await logService.create({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.CREATE_MEMBERSHIP,
        target: `${membership_name} (${term_name})`,
        target_id: newMembership._id,
        target_model: "Membership",
      });

      return res.status(201).json({
        message: "Membership term created successfully",
        data: newMembership,
      });
    }
  );

  // READ - Get all memberships (optional report filters: name + period overlap from/to)
  getAllMembershipController = catchAsync(
    async (req: Request, res: Response) => {
      const { name, from, to } = req.query;
      const filters = {
        name: typeof name === "string" ? name : undefined,
        from: typeof from === "string" ? from : undefined,
        to: typeof to === "string" ? to : undefined,
      };
      const memberships = await membershipService.getAllMemberships(filters);
      return res.status(200).json({ data: memberships });
    }
  );

  // READ - Get membership by ID
  getMembershipByIdController = catchAsync(
    async (req: Request, res: Response) => {
      const id = String(req.params.id);
      const membership = await membershipService.getMembershipById(id);
      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }
      return res.status(200).json({ data: membership });
    }
  );

  // READ - Get activation history records linked to a membership term
  getMembershipHistoriesController = catchAsync(
    async (req: Request, res: Response) => {
      const id = String(req.params.id);
      const membership = await membershipService.getMembershipById(id);
      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }
      const histories = await historyService.getByMembership(id);
      return res.status(200).json({ data: histories });
    }
  );

  // REQUEST - Admin requests membership on a student's behalf (student self-
  // requests via PUT /api/v2/students/membership-request; this is the optional
  // admin path). Sets the student's status to PENDING.
  requestMembershipForStudentController = catchAsync(
    async (req: Request, res: Response) => {
      const { id_number } = req.body;

      if (!id_number) {
        return res.status(400).json({ message: "Student ID is required" });
      }

      const student = await studentService.getSpecific(id_number);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const status = normalizeMembershipStatus(student.membershipStatus);
      if (status === "active") {
        return res.status(400).json({ message: "Membership is already active." });
      }
      if (status === "pending") {
        return res
          .status(400)
          .json({ message: "Student already has a pending membership request." });
      }

      // Stamp `applied` so the requests queue shows when membership was asked
      // for, not when the account was registered. ISO, since the field is a
      // String on the schema.
      await studentService.updateOneDynamic(student.id_number, {
        membershipStatus: membership_status.PENDING,
        applied: new Date().toISOString(),
      });

      await logService.create({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.REQUEST_MEMBERSHIP,
        target: `${student.id_number} - ${studentService.fullNameFormat(student)}`,
        target_id: student._id,
        target_model: "Membership",
      });

      return res.status(200).json({
        message: "Membership requested for student.",
        status: "pending",
        rawStatus: membership_status.PENDING,
      });
    }
  );

  // UPDATE - Update membership
  updateMembershipController = catchAsync(
    async (req: Request, res: Response) => {
      const id = String(req.params.id);
      const { membership_name, start_date, end_date, term_name } = req.body;

      const updateData: any = {};
      if (membership_name) updateData.membership_name = membership_name;
      if (start_date) updateData.start_date = start_date;
      if (end_date) updateData.end_date = end_date;
      if (term_name) updateData.term_name = term_name;

      const updated = await membershipService.updateMembership(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Membership not found" });
      }

      await logService.create({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: "UPDATE_MEMBERSHIP",
        target: `Membership ${id}`,
        target_id: id,
        target_model: "Membership",
      });

      return res.status(200).json({
        message: "Membership updated successfully",
        data: updated,
      });
    }
  );

  // ACTIVATE - Re-activate an inactive term. Deactivates any other active
  // term (single-active constraint) and makes this term active again.
  activateMembershipController = catchAsync(
    async (req: Request, res: Response) => {
      const id = String(req.params.id);
      const membership = await membershipService.getMembershipById(id);
      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }

      const { membership: activated, alreadyActive } =
        await membershipService.activateMembershipById(id);

      await logService.create({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.ACTIVATE_MEMBERSHIP,
        target: `${activated.membership_name} (${activated.term_name})`,
        target_id: String(activated._id),
        target_model: "Membership",
      });

      return res.status(200).json({
        message: alreadyActive
          ? "Membership is already active"
          : "Membership activated successfully",
        data: activated,
      });
    }
  );

  // DELETE/REVOKE - Revoke a membership term. Students activated under it are
  // set to NONE; history records are preserved.
  revokeMembershipController = catchAsync(
    async (req: Request, res: Response) => {
      const id = String(req.params.id);
      const membership = await membershipService.getMembershipById(id);
      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }

      await membershipService.revokeMembershipById(id);

      await logService.create({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.REVOKE_MEMBERSHIP,
        target: `Membership ${id}`,
        target_id: id,
        target_model: "Membership",
      });

      return res.status(200).json({ message: "Membership revoked successfully" });
    }
  );

  // EXPIRE - Expire past-due memberships
  expirePastDueMembershipsController = catchAsync(
    async (req: Request, res: Response) => {
      const expiredCount = await membershipService.expirePastDueMemberships();
      return res.status(200).json({
        message: `Expired ${expiredCount} membership(s)`,
        count: expiredCount,
      });
    }
  );
}

export const membershipController = new MembershipController();
