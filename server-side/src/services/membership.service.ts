import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Student } from "../models/student.model";
import { Admin } from "../models/admin.model";
import { Merch } from "../models/merch.model";
import { Orders } from "../models/orders.model";
import { Log } from "../models/log.model";
import { Settings } from "../models/settings.model";
import { Membership, IMembershipDocument } from "../models/membership.model";
import { MembershipHistory } from "../models/history.model";
import { format, startOfDay, endOfDay } from "date-fns";
import { admin_model, role_model } from "../model_template/model_data";
import { membershipRequestReceipt } from "../mail_template/mail.template";
import { IMembershipRequest } from "../mail_template/mail.interface";
import { IStudent } from "../models/student.interface";
import { IHistory } from "../models/history.interface";
import { IOrders } from "../models/orders.interface";
import { IAdmin, IAdminDocument } from "../models/admin.interface";
import { user_model } from "../model_template/model_data";
import { account_status, membership_status } from "../enums/status.enums";
import { studentService } from "./student.service";
import { AppError } from "../util/app.error.util";

export interface CreateMembershipDto {
  membership_name: string;
  start_date: Date;
  end_date: Date;
  term_name: string;
}

export interface UpdateMembershipDto {
  membership_name?: string;
  start_date?: Date;
  end_date?: Date;
  term_name?: string;
}

export interface MembershipReportFilters {
  name?: string;
  from?: string;
  to?: string;
}

/** Escapes regex metacharacters so the report `name` filter is a plain substring match. */
const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class MembershipService {
  //Check membership application
  checkApplication = async (student: IStudent) => {
    // Term-based: approval always marks the student ACTIVE in the active term.
    // No first/renewal distinction. Ensure rfid is present (idempotent).
    const updateQuery: Record<string, unknown> = {
      membershipStatus: membership_status.ACTIVE,
    };
    if (student.rfid) updateQuery.rfid = student.rfid;

    const result = await studentService.updateOneDynamic(
      student.id_number,
      updateQuery
    );
    if (!result) {
      throw new AppError("Did not update the student", 404);
    }
    return result;
  };

  //Revoke All Membership
  revokeMembership = async () => {
    const revokeMembership = await Student.updateMany(
      {},
      {
        $set: {
          membershipStatus: "NOT_APPLIED",
        },
      }
    );

    if (!revokeMembership) {
      throw new AppError("Cannot revoke membership", 404);
    }

    return {
      status: true,
      message: "All Student Membership has been revoked successfully",
    };
  };

  //Fetch all who've request the membership
  getPendingMembership = async () => {
    const students: IStudent[] = await studentService.getAllStudents({
      membershipStatus: membership_status.PENDING,
    });
    if (!students) {
      throw new AppError("No student found", 404);
    }
    return students;
  };

  //Number of active membership
  getActiveMembershipCount = async () => {
    const count = await Student.countDocuments({
      status: account_status.ACTIVE,
      membershipStatus: membership_status.ACTIVE,
    });
    if (!count) {
      throw new AppError("No count!", 404);
    }
    return count;
  };

  //Get Membership Price
  getMemberPrice = async () => {
    const settings = await Settings.findOne();
    if (!settings) {
      throw new AppError("No settings available", 404);
    }
    return settings;
  };

  //Change Membership Price
  changeMemberPrice = async (req: Request) => {
    const { price } = req.body;

    const settings = await Settings.find();
    if (settings.length === 0) {
      await new Settings({
        membership_price: price,
      }).save();
      await new Settings({ membership_price: price }).save();
      return { status: true, message: "Membership fee created" };
    }
    const update = await Settings.updateOne(
      {},
      {
        $set: {
          membership_price: price,
        },
      }
    );
    if (update.matchedCount > 0) {
      return { status: true, message: "Memberhsip Fee Updated" };
    } else {
      return { status: false, message: "Error updating fee" };
    }
  };

  //CREATE - Create the membership term (parent). A term has no student; the
  //single-active constraint is system-wide: activating a new term deactivates
  //any currently active term.
  createMembership = async (
    data: CreateMembershipDto
  ): Promise<IMembershipDocument> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Membership.updateMany(
        { is_active: true },
        { $set: { is_active: false } }
      ).session(session);

      const newMembership = new Membership({
        ...data,
        is_active: true,
      });

      await newMembership.save({ session });
      await session.commitTransaction();
      session.endSession();

      return newMembership;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  };

  //READ - Get the single active membership term (null when none is active)
  getActiveParent = async (): Promise<IMembershipDocument | null> => {
    return await Membership.findOne({ is_active: true });
  };

  //READ - Get all memberships, optionally filtered for reports (name + period overlap)
  getAllMemberships = async (
    filters?: MembershipReportFilters
  ): Promise<IMembershipDocument[]> => {
    const query: Record<string, unknown> = {};

    if (filters?.name?.trim()) {
      query.membership_name = {
        $regex: escapeRegex(filters.name.trim()),
        $options: "i",
      };
    }

    // Period overlap: a membership is avail in [from, to] when
    // start_date <= to AND end_date >= from.
    const startCond: Record<string, unknown> = {};
    const endCond: Record<string, unknown> = {};

    if (filters?.to && !Number.isNaN(new Date(filters.to).getTime())) {
      startCond.$lte = new Date(filters.to);
    }
    if (filters?.from && !Number.isNaN(new Date(filters.from).getTime())) {
      endCond.$gte = new Date(filters.from);
    }

    if (Object.keys(startCond).length > 0) query.start_date = startCond;
    if (Object.keys(endCond).length > 0) query.end_date = endCond;

    return await Membership.find(query).sort({ created_at: -1 });
  };

  //READ - Get membership by ID
  getMembershipById = async (
    id: string
  ): Promise<IMembershipDocument | null> => {
    return await Membership.findById(id);
  };

  //UPDATE - Update membership details
  updateMembership = async (
    id: string,
    data: UpdateMembershipDto
  ): Promise<IMembershipDocument | null> => {
    return await Membership.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  };

  //ACTIVATE - Re-activate an inactive term. Single-active constraint is
  //system-wide: activating this term deactivates any other active term,
  //mirroring createMembership.
  activateMembershipById = async (
    id: string
  ): Promise<{ membership: IMembershipDocument; alreadyActive: boolean }> => {
    const membership = await Membership.findById(id);
    if (!membership) {
      throw new AppError("Membership not found", 404);
    }

    if (membership.is_active) {
      return { membership, alreadyActive: true };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Membership.updateMany(
        { is_active: true },
        { $set: { is_active: false } }
      ).session(session);

      membership.is_active = true;
      await membership.save({ session });

      await session.commitTransaction();
      session.endSession();

      return { membership, alreadyActive: false };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  };

  //Deactivate students whose activation history links to the given term(s)
  deactivateLinkedStudents = async (
    membershipIds: Array<mongoose.Types.ObjectId | string | number>
  ): Promise<number> => {
    if (membershipIds.length === 0) return 0;

    const histories = await MembershipHistory.find({
      membership_id: { $in: membershipIds },
    })
      .select("student")
      .lean();

    // The denormalized `id_number` was removed from the schema; resolve it
    // from the referenced students in a single batch query.
    const studentIds = Array.from(
      new Set(
        histories
          .map((h) => h.student)
          .filter((id): id is mongoose.Types.ObjectId => Boolean(id))
      )
    );
    const idNumbers: string[] = studentIds.length
      ? (
          await Student.find({ _id: { $in: studentIds } })
            .select("id_number")
            .lean()
        ).map((s) => s.id_number)
      : [];
    if (idNumbers.length === 0) return 0;

    const result = await Student.updateMany(
      {
        id_number: { $in: idNumbers },
        membershipStatus: membership_status.ACTIVE,
      },
      { $set: { membershipStatus: membership_status.NONE } }
    );
    return result.modifiedCount;
  };

  //DELETE/REVOKE - Revoke a membership term. Students activated under it
  //(via history membership_id) flip to NONE.
  revokeMembershipById = async (
    id: string
  ): Promise<{
    success: boolean;
    message: string;
    deactivatedStudents: number;
  }> => {
    const membership = await Membership.findById(id);
    if (!membership) {
      throw new AppError("Membership not found", 404);
    }

    membership.is_active = false;
    await membership.save();

    const deactivatedStudents = await this.deactivateLinkedStudents([id]);

    return {
      success: true,
      message: "Membership revoked successfully",
      deactivatedStudents,
    };
  };

  //EXPIRE - Check and expire past-due membership terms. Students activated
  //under an expired term (via history membership_id) flip to NONE.
  expirePastDueMemberships = async (): Promise<number> => {
    const now = new Date();
    const expired = await Membership.find({
      end_date: { $lt: now },
      is_active: true,
    });

    for (const membership of expired) {
      membership.is_active = false;
      await membership.save();

      await this.deactivateLinkedStudents([membership._id]);
    }

    return expired.length;
  };
}

const membershipService = new MembershipService();

export { membershipService };
