// @ts-nocheck
// src/services/recruitment.service.ts

import { RecruitmentPosition } from "../models/recruitmentPosition.model";
import { Application } from "../models/application.model";
import { Student } from "../models/student.model";
import { Admin } from "../models/admin.model";
import { AppError } from "../util/app.error.util";
import {
  hiringStatus,
  applicationStatus,
  interviewStatus,
} from "../enums/recruitment.enums";
import { account_status, membership_status } from "../enums/status.enums";
import { verifyAccessToken } from "../util/jwt.util";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "../lib/r2Client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  recruitmentApprovedMail,
  recruitmentAccountCreatedMail,
  recruitmentInterviewScheduledMail,
  recruitmentInterviewRescheduledMail,
  recruitmentRejectedMail,
} from "../mail_template/mail.template";
import { adminService } from "./admin.service";
import { campus_type } from "../enums/campus.enums";

const OPENING_CONFLICT_STRATEGIES = {
  updateExisting: "update_existing",
  closeOldCreateNew: "close_old_create_new",
};

const toBooleanQuery = (value: any) =>
  value === true || value === "true" || value === "1";

const toPositiveInteger = (value: any, fallback: number) => {
  const parsed = parseInt(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toStringList = (value: unknown) =>
  (Array.isArray(value) ? value : [value])
    .flatMap((item) => String(item ?? "").split(","))
    .map((item) => item.trim())
    .filter(Boolean);

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toRequirementList = (value: any) =>
  String(value ?? "")
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);

export class RecruitmentService {
  /** Create a new recruitment position */
  async createPosition(req: any) {
    const {
      title,
      description,
      responsibilities,
      requirements,
      isActive,
      applicationDeadline,
      sortOrder,
      slots,
    } = req.body;

    // Validate required fields
    if (!title || !description || !responsibilities || !requirements) {
      throw new AppError(
        "Title, description, responsibilities, and requirements are required.",
        400
      );
    }

    // Validate deadline if provided
    if (applicationDeadline) {
      const deadline = new Date(applicationDeadline);
      if (isNaN(deadline.getTime())) {
        throw new AppError("Invalid application deadline format.", 400);
      }
      // Prevent opening with expired deadline
      const now = Date.now();
      if (isActive && deadline.getTime() < now) {
        throw new AppError(
          "Application deadline must be in future for open positions.",
          400
        );
      }
    }

    const position = new RecruitmentPosition({
      title,
      description,
      responsibilities,
      requirements,
      hiringStatus: hiringStatus.DRAFT, // Default to DRAFT on creation
      isActive: isActive ?? true,
      applicationDeadline,
      sortOrder: sortOrder ?? 0,
      createdBy: req.userV2?.sub || req.admin?._id.toString(),
    });

    await position.save();
    return position;
  }

  /** Admin: bulk-create positions from the "Open Role Application" modal */
  async createPositionsFromOpening(req: any) {
    const {
      startDate,
      endDate,
      startTime,
      endTime,
      roles,
      roleRequirements,
      requirementsByItem,
      conflictStrategy,
    } = req.body;

    if (
      !startDate ||
      !endDate ||
      !startTime ||
      !endTime ||
      !Array.isArray(roles)
    ) {
      throw new AppError("Missing required fields.", 400);
    }

    const combineDateAndTime = (dateIso: string, time24: string) => {
      const date = new Date(dateIso);
      const [hours, minutes] = time24.split(":").map(Number);
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const applicationOpensAt = combineDateAndTime(startDate, startTime);
    const applicationDeadline = combineDateAndTime(endDate, endTime);

    if (applicationDeadline < new Date()) {
      throw new AppError(
        "Application deadline must be in future for open positions.",
        400
      );
    }

    const fallbackRequirements = toRequirementList(roleRequirements);
    const createdBy = req.userV2?.sub || req.admin?._id.toString();
    const docs: any[] = [];
    let sortOrder = 0;

    for (const role of roles) {
      if (!role.enabled) continue;
      const enabledSubPositions = (role.positions || []).filter(
        (p: any) => p.enabled
      );
      if (enabledSubPositions.length === 0) {
        const itemRequirements = toRequirementList(
          requirementsByItem?.[role.id]
        );
        const requirements =
          itemRequirements.length > 0 ? itemRequirements : fallbackRequirements;

        // e.g. "Volunteer" — enabled with no sub-positions
        docs.push({
          title: role.title,
          hiringStatus: hiringStatus.OPEN,
          isActive: true,
          slots: role.slots ?? undefined,
          requirements,
          applicationOpensAt,
          applicationDeadline,
          sortOrder: sortOrder++,
          createdBy,
        });
        continue;
      }

      for (const position of enabledSubPositions) {
        const itemRequirements = toRequirementList(
          requirementsByItem?.[position.id]
        );
        const requirements =
          itemRequirements.length > 0 ? itemRequirements : fallbackRequirements;

        docs.push({
          title: `${role.title} - ${position.name}`,
          hiringStatus: hiringStatus.OPEN,
          isActive: true,
          slots: position.slots ?? undefined,
          requirements,
          applicationOpensAt,
          applicationDeadline,
          sortOrder: sortOrder++,
          createdBy,
        });
      }
    }

    if (docs.length === 0) {
      throw new AppError("No roles or positions were selected.", 400);
    }

    const selectedTitles = docs.map((doc) => doc.title);
    // Block re-creating a title while any *live* position document for it
    // still exists — OPEN, CLOSED, or DRAFT, as long as it's active.
    // Archived positions (isActive: false — set when deletePosition can't
    // hard-delete due to existing applications) don't block reuse; the
    // archive itself is the "deletion" for title-reuse purposes.
    const existingOpenPositions = await RecruitmentPosition.find({
      title: { $in: selectedTitles },
      isActive: true,
    }).sort({ createdAt: -1 });

    if (
      existingOpenPositions.length > 0 &&
      !Object.values(OPENING_CONFLICT_STRATEGIES).includes(conflictStrategy)
    ) {
      return {
        conflict: true,
        conflicts: existingOpenPositions.map((position: any) => ({
          _id: position._id,
          title: position.title,
          slots: position.slots,
          applicationOpensAt: position.applicationOpensAt,
          applicationDeadline: position.applicationDeadline,
          createdAt: position.createdAt,
        })),
      };
    }

    if (
      conflictStrategy === OPENING_CONFLICT_STRATEGIES.closeOldCreateNew &&
      existingOpenPositions.length > 0
    ) {
      // Create the replacements first so we have real _ids to reassign
      // applicants onto, then move every application from each old
      // position to its same-titled replacement, then hard-delete the old
      // position — safe now that it has zero applications left, so it
      // never becomes a permanently-archived zombie row.
      const created = await RecruitmentPosition.insertMany(docs);
      const newByTitle = new Map(created.map((p: any) => [p.title, p]));

      for (const oldPosition of existingOpenPositions) {
        const replacement = newByTitle.get(oldPosition.title);
        if (!replacement) continue; // titles always match here by construction

        await Application.updateMany(
          { position: oldPosition._id },
          { $set: { position: replacement._id } }
        );

        await RecruitmentPosition.deleteOne({ _id: oldPosition._id });
      }

      return created;
    }

    if (conflictStrategy === OPENING_CONFLICT_STRATEGIES.updateExisting) {
      const existingByTitle = existingOpenPositions.reduce(
        (map: Map<string, any[]>, position: any) => {
          const list = map.get(position.title) ?? [];
          list.push(position);
          map.set(position.title, list);
          return map;
        },
        new Map()
      );

      const savedPositions = [];

      for (const doc of docs) {
        const matchingPositions = existingByTitle.get(doc.title) ?? [];
        const [primaryPosition, ...duplicatePositions] = matchingPositions;

        if (!primaryPosition) {
          const created = await RecruitmentPosition.create(doc);
          savedPositions.push(created);
          continue;
        }

        primaryPosition.set({
          slots: doc.slots,
          requirements: doc.requirements,
          applicationOpensAt: doc.applicationOpensAt,
          applicationDeadline: doc.applicationDeadline,
          sortOrder: doc.sortOrder,
          hiringStatus: hiringStatus.OPEN,
          isActive: true,
          createdBy,
        });
        await primaryPosition.save();
        savedPositions.push(primaryPosition);

        if (duplicatePositions.length > 0) {
          await RecruitmentPosition.updateMany(
            {
              _id: {
                $in: duplicatePositions.map((position: any) => position._id),
              },
            },
            {
              $set: {
                hiringStatus: hiringStatus.CLOSED,
                isActive: false,
              },
            }
          );
        }
      }

      return savedPositions;
    }

    return RecruitmentPosition.insertMany(docs);
  }

  /** Get all positions with filtering */
  async listPositions(req: any) {
    const { search, status, page = 1, limit = 10, availableOnly } = req.query;
    const query: any = {};
    const currentPage = toPositiveInteger(page, 1);
    const pageLimit = toPositiveInteger(limit, 10);

    // Lazily close any OPEN positions whose deadline has passed.
    // Cheap enough to run on every list call — indexed on hiringStatus +
    // applicationDeadline — and keeps the UI honest without a cron job.
    await RecruitmentPosition.updateMany(
      {
        hiringStatus: hiringStatus.OPEN,
        applicationDeadline: { $lt: new Date() },
      },
      { $set: { hiringStatus: hiringStatus.CLOSED } }
    );

    // Public API defaults to only active/open positions unless filtered
    if (req.path.startsWith("/public")) {
      query.isActive = true;
      query.hiringStatus = hiringStatus.OPEN;
    } else {
      if (status) query.hiringStatus = status;
    }

    if (toBooleanQuery(availableOnly)) {
      const now = new Date();
      query.isActive = true;
      query.hiringStatus = hiringStatus.OPEN;
      query.$and = [
        {
          $or: [
            { applicationOpensAt: { $exists: false } },
            { applicationOpensAt: null },
            { applicationOpensAt: { $lte: now } },
          ],
        },
        {
          $or: [
            { applicationDeadline: { $exists: false } },
            { applicationDeadline: null },
            { applicationDeadline: { $gte: now } },
          ],
        },
      ];
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const positions = await RecruitmentPosition.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip((currentPage - 1) * pageLimit)
      .limit(pageLimit);

    const total = await RecruitmentPosition.countDocuments(query);

    return {
      positions,
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit),
      },
    };
  }

  /** Get a single position by ID */
  async getPositionById(id: string, req?: any) {
    const position = await RecruitmentPosition.findById(id);
    if (!position) throw new AppError("Position not found.", 404);

    if (
      position.hiringStatus === hiringStatus.OPEN &&
      position.applicationDeadline &&
      position.applicationDeadline < new Date()
    ) {
      position.hiringStatus = hiringStatus.CLOSED;
      await position.save();
    }

    return position;
  }

  /** Update a position */
  async updatePosition(id: string, req: any) {
    const position = await RecruitmentPosition.findById(id);
    if (!position) throw new AppError("Position not found.", 404);

    const {
      title,
      description,
      responsibilities,
      requirements,
      hiringStatus: newHiringStatus,
      isActive,
      applicationDeadline,
      sortOrder,
      slots,
    } = req.body;

    if (title) position.title = title;
    if (description) position.description = description;
    if (responsibilities) position.responsibilities = responsibilities;
    if (requirements) position.requirements = requirements;
    if (newHiringStatus !== undefined) position.hiringStatus = newHiringStatus;
    if (isActive !== undefined) position.isActive = isActive;
    if (applicationDeadline)
      position.applicationDeadline = new Date(applicationDeadline);
    if (sortOrder !== undefined) position.sortOrder = sortOrder;
    if (slots !== undefined) position.slots = slots;

    // Validate deadline if position is being opened
    if (
      position.isActive &&
      position.hiringStatus === hiringStatus.OPEN &&
      position.applicationDeadline
    ) {
      const now = Date.now();
      if (
        position.applicationDeadline &&
        position.applicationDeadline.getTime() < now
      ) {
        throw new AppError(
          "Application deadline must be in future for open positions.",
          400
        );
      }
    }

    await position.save();
    return position;
  }

  /** Toggle hiring status (OPEN/CLOSED/DRAFT) */
  async toggleHiringStatus(id: string, req: any) {
    const position = await RecruitmentPosition.findById(id);
    if (!position) throw new AppError("Position not found.", 404);

    const { status } = req.body;
    if (!Object.values(hiringStatus).includes(status as any)) {
      throw new AppError("Invalid hiring status.", 400);
    }

    position.hiringStatus = status as any;
    await position.save();
    return position;
  }

  /** Soft-delete/archive position (remove from active listings) */
  async deletePosition(id: string) {
    const position = await RecruitmentPosition.findById(id);
    if (!position) throw new AppError("Position not found.", 404);

    // Check if there are existing applications - soft disable rather than hard delete
    const hasApplications = await Application.countDocuments({
      position: id,
    }).exec();
    if (hasApplications > 0) {
      position.isActive = false;
      await position.save();
      throw new AppError(
        "Cannot delete position with existing applications. Archive instead.",
        400
      );
    }

    await position.deleteOne();
    return { message: "Position deleted successfully" };
  }

  /** Submit a new application (student endpoint) */
  async submitApplication(positionId: string, req: any) {
    const studentId = req.userV2.sub;
    const position = await RecruitmentPosition.findById(positionId);

    // Validate position exists and is open
    if (!position) throw new AppError("Position not found.", 404);
    if (!position.isActive || position.hiringStatus !== hiringStatus.OPEN) {
      throw new AppError(
        "Position is not currently accepting applications.",
        400
      );
    }

    if (
      position.applicationOpensAt &&
      position.applicationOpensAt > new Date()
    ) {
      throw new AppError("Application is not open yet.", 400);
    }

    // Validate deadline not expired — also lazily flip the position closed
    // so it doesn't keep showing OPEN to other readers after this point.
    if (
      position.applicationDeadline &&
      position.applicationDeadline < new Date()
    ) {
      if (position.hiringStatus === hiringStatus.OPEN) {
        position.hiringStatus = hiringStatus.CLOSED;
        await position.save();
      }
      throw new AppError("Application deadline has passed.", 400);
    }

    // Check for duplicate application
    const existingApp = await Application.findOne({
      position: positionId,
      applicant: studentId,
      status: { $ne: applicationStatus.REJECTED },
    }).exec();

    if (existingApp) {
      throw new AppError(
        "You have already submitted an application for this position.",
        400
      );
    }

    // ── Reserve a slot atomically (only if this position has a slot cap) ──
    // The $expr condition means "only match/update if slotsFilled < slots"
    // is evaluated and applied in the same atomic operation, so two
    // simultaneous applicants can never both win the last slot.
    const hasSlotLimit =
      typeof position.slots === "number" && position.slots > 0;
    let reservedPosition: any = null;

    if (hasSlotLimit) {
      reservedPosition = await RecruitmentPosition.findOneAndUpdate(
        {
          _id: positionId,
          hiringStatus: hiringStatus.OPEN,
          isActive: true,
          $expr: { $lt: ["$slotsFilled", "$slots"] },
        },
        { $inc: { slotsFilled: 1 } },
        { new: true }
      );

      if (!reservedPosition) {
        throw new AppError("No slots available for this position.", 400);
      }

      // This reservation just filled the last slot — close hiring.
      if (reservedPosition.slotsFilled >= (reservedPosition.slots ?? 0)) {
        reservedPosition.hiringStatus = hiringStatus.CLOSED;
        await reservedPosition.save();
      }
    }

    const releaseReservation = async () => {
      if (!hasSlotLimit) return;
      await RecruitmentPosition.updateOne(
        { _id: positionId },
        {
          $inc: { slotsFilled: -1 },
          $set: { hiringStatus: hiringStatus.OPEN },
        }
      );
    };

    // Get student snapshot for historical record
    const student = await Student.findById(studentId)
      .select("first_name last_name id_number email course year")
      .lean();
    if (!student) {
      await releaseReservation();
      throw new AppError("Student not found.", 404);
    }

    // Extract document metadata from request files (multer middleware)
    const files = req.files as any;
    const resume = files.resume?.[0];
    if (!resume) {
      await releaseReservation();
      throw new AppError("Resume is required.", 400);
    }

    //Future feature: enable when application letters are required.
    //if (!resume || !applicationLetter) {
    // throw new AppError("Resume and application letter are required.", 400);
    //}

    // Use the key multer-s3 actually uploaded the file to — do NOT
    // regenerate this, since any mismatch means the DB points at an
    // object that doesn't exist in the bucket (NoSuchKey on download).
    const resumeStorageKey = resume.key;
    if (!resumeStorageKey) {
      await releaseReservation();
      throw new AppError(
        "Resume upload succeeded but no storage key was returned.",
        500
      );
    }

    const application = new Application({
      position: positionId,
      applicant: studentId,
      applicantSnapshot: {
        name: `${student.first_name || req.body.firstName} ${
          student.last_name || req.body.lastName
        }`.trim(),
        idNumber: student.id_number,
        email: student.email || req.body.email,
        course: student.course || req.body.course,
        year: student.year || req.body.year,
      },
      documents: {
        resume: {
          storageKey: resumeStorageKey,
          originalFilename: resume.originalname,
          mimeType: resume.mimetype,
          size: resume.size,
          uploadTimestamp: new Date(),
        },
        //applicationLetter: {
        //storageKey: letterStorageKey,
        // originalFilename: applicationLetter.originalname,
        // mimeType: applicationLetter.mimetype,
        //size: applicationLetter.size,
        //uploadTimestamp: new Date(),
        // },
      },
      status: applicationStatus.SUBMITTED,
      statusHistory: [
        {
          status: applicationStatus.SUBMITTED,
          changedAt: new Date(),
          changedBy: studentId,
        },
      ],
    });

    try {
      await application.save();
      return application;
    } catch (error) {
      // Roll back the slot reservation — the application was never actually created.
      await releaseReservation();

      const rawMessage =
        error instanceof Error
          ? error.message
          : String(error ?? "Unknown error");

      console.error("Application Save Error:");
      console.error({
        rawMessage,
        positionId,
        applicant: studentId,
        resumeStorageKey,
        resumeFileName: resume?.originalname,
        resumeMimeType: resume?.mimetype,
        resumeSize: resume?.size,
      });

      throw new AppError(`Failed to save application: ${rawMessage}`, 500);
    }
  }

  /** Get current user's applications */
  async getApplicationsForUser(req: any) {
    const studentId = req.userV2.sub;
    const applications = await Application.find({ applicant: studentId })
      .populate("position", "title hiringStatus")
      .sort({ createdAt: -1 });

    // Sanitize response - never expose internalNotes, reviewer info, or
    // volunteer temp credentials to students
    return applications.map((app) => {
      const obj = app.toObject();
      delete obj.internalNotes;
      delete obj.reviewer;
      delete obj.volunteerAccount;
      return obj;
    });
  }

  /** Get a specific application by owner (student) */
  async getApplicationForUser(id: string, req: any) {
    const studentId = req.userV2.sub;
    const app = await Application.findOne({ _id: id, applicant: studentId });

    if (!app)
      throw new AppError(
        "Application not found or you do not have access.",
        404
      );

    const obj = app.toObject();
    delete obj.internalNotes;
    delete obj.reviewer;
    delete obj.volunteerAccount;
    return obj;
  }

  /** Admin: Get one filtered and sorted page of applicants. */
  async getApplicants(req: any) {
    const page = toPositiveInteger(req.query.page, 1);
    const limit = Math.min(toPositiveInteger(req.query.limit, 10), 50);
    const positionId = String(req.query.positionId ?? "").trim();
    const search = String(req.query.search ?? "").trim();
    const statuses = toStringList(req.query.status);
    const roles = toStringList(req.query.roles ?? req.query.role);
    const courses = toStringList(req.query.courses ?? req.query.course);
    const years = toStringList(req.query.years ?? req.query.year)
      .map((year) => year.match(/\d/)?.[0])
      .filter((year): year is string => Boolean(year));
    const verificationOnly = toBooleanQuery(req.query.verificationOnly);

    const statusMap: Record<string, string> = {
      Pending: applicationStatus.SUBMITTED,
      Scheduled: applicationStatus.INTERVIEW_SCHEDULED,
      "Interview Completed": applicationStatus.INTERVIEWING,
      Approved: applicationStatus.APPROVED,
      Rejected: applicationStatus.REJECTED,
      "For Verification": applicationStatus.APPROVED,
    };

    const conditions: Record<string, any>[] = [];
    const mappedStatuses = statuses
      .map((status) => statusMap[status] ?? status)
      .filter(Boolean);

    if (positionId) conditions.push({ position: positionId });
    if (mappedStatuses.length)
      conditions.push({ status: { $in: mappedStatuses } });
    if (courses.length)
      conditions.push({ "applicantSnapshot.course": { $in: courses } });
    if (years.length) {
      conditions.push({
        $expr: {
          $regexMatch: {
            input: { $toString: { $ifNull: ["$applicantSnapshot.year", ""] } },
            regex: `^[${years.join("")}]`,
          },
        },
      });
    }
    if (search) {
      const pattern = escapeRegex(search);
      conditions.push({
        $or: [
          { "applicantSnapshot.name": { $regex: pattern, $options: "i" } },
          {
            "applicantSnapshot.idNumber": {
              $regex: pattern,
              $options: "i",
            },
          },
          { "applicantSnapshot.email": { $regex: pattern, $options: "i" } },
        ],
      });
    }
    if (verificationOnly || statuses.includes("For Verification")) {
      conditions.push({ status: applicationStatus.APPROVED });
      conditions.push({ "volunteerAccount.username": { $exists: false } });
    }

    const applicationMatch =
      conditions.length === 0
        ? {}
        : conditions.length === 1
          ? conditions[0]
          : { $and: conditions };

    const sortField = String(req.query.sortField ?? "createdAt");
    const sortDirection = req.query.sortDirection === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = {};

    switch (sortField) {
      case "name":
        sort["applicantSnapshot.name"] = sortDirection;
        break;
      case "id_number":
        sort["applicantSnapshot.idNumber"] = sortDirection;
        break;
      case "courseYear":
        sort["applicantSnapshot.course"] = sortDirection;
        sort["applicantSnapshot.year"] = sortDirection;
        break;
      case "roleApplied":
        sort["position.title"] = sortDirection;
        break;
      case "status":
        sort.status = sortDirection;
        break;
      default:
        sort.createdAt = -1;
    }
    sort._id = -1;

    // Position is stored as a string in some older records and as an ObjectId
    // in newer records. Comparing their string forms keeps both formats visible.
    const positionLookup = [
      {
        $lookup: {
          from: RecruitmentPosition.collection.name,
          let: { applicationPositionId: { $toString: "$position" } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$_id" }, "$$applicationPositionId"],
                },
              },
            },
            { $project: { title: 1 } },
          ],
          as: "positionDetails",
        },
      },
      {
        $set: {
          position: { $arrayElemAt: ["$positionDetails", 0] },
        },
      },
      { $unset: "positionDetails" },
    ];

    const roleMatch = roles.length
      ? [{ $match: { "position.title": { $in: roles } } }]
      : [];

    const [pageResult, summaryRows, positionIds] = await Promise.all([
      Application.aggregate([
        { $match: applicationMatch },
        ...positionLookup,
        ...roleMatch,
        {
          $facet: {
            applicants: [
              { $sort: sort },
              { $skip: (page - 1) * limit },
              { $limit: limit },
            ],
            total: [{ $count: "count" }],
          },
        },
      ]),
      Application.aggregate([
        {
          $group: {
            _id: null,
            pending: {
              $sum: {
                $cond: [
                  { $eq: ["$status", applicationStatus.SUBMITTED] },
                  1,
                  0,
                ],
              },
            },
            approved: {
              $sum: {
                $cond: [{ $eq: ["$status", applicationStatus.APPROVED] }, 1, 0],
              },
            },
            rejected: {
              $sum: {
                $cond: [{ $eq: ["$status", applicationStatus.REJECTED] }, 1, 0],
              },
            },
            verifications: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", applicationStatus.APPROVED] },
                      {
                        $eq: [
                          { $ifNull: ["$volunteerAccount.username", null] },
                          null,
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      Application.distinct("position"),
    ]);

    const roleOptions = await RecruitmentPosition.distinct("title", {
      _id: { $in: positionIds },
    });
    const result = pageResult[0] ?? { applicants: [], total: [] };
    const total = Number(result.total?.[0]?.count ?? 0);
    const summary = summaryRows[0] ?? {};

    return {
      applicants: result.applicants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        pending: Number(summary.pending ?? 0),
        approved: Number(summary.approved ?? 0),
        rejected: Number(summary.rejected ?? 0),
        verifications: Number(summary.verifications ?? 0),
      },
      filterOptions: { roles: roleOptions.sort() },
    };
  }

  /** Admin: Get full application details */
  async getApplicationDetails(id: string) {
    const app = await Application.findById(id)
      .populate("position", "title description responsibilities requirements")
      .populate("applicant", "name id_number email course year");

    if (!app) throw new AppError("Application not found.", 404);

    return app;
  }

  /** Admin: Get a short-lived signed URL to view/download an applicant's resume */
  async getResumeUrl(id: string) {
    const app = await Application.findById(id).select("documents.resume");
    if (!app) throw new AppError("Application not found.", 404);

    const storageKey = app.documents?.resume?.storageKey;
    if (!storageKey) {
      throw new AppError("No resume on file for this application.", 404);
    }

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      throw new AppError("Resume storage is not configured.", 500);
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn: 300 }); // 5 minutes

    return { url, expiresIn: 300 };
  }

  /** Admin: Stream an applicant's resume as an attachment download */
  async getResumeDownload(id: string) {
    const app = await Application.findById(id).select("documents.resume");
    if (!app) throw new AppError("Application not found.", 404);

    const storageKey = app.documents?.resume?.storageKey;
    if (!storageKey) {
      throw new AppError("No resume on file for this application.", 404);
    }

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      throw new AppError("Resume storage is not configured.", 500);
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    });

    const object = await r2Client.send(command);

    return {
      body: object.Body as NodeJS.ReadableStream,
      fileName: app.documents?.resume?.originalFilename ?? "resume.pdf",
      contentType: object.ContentType ?? "application/octet-stream",
      contentLength: object.ContentLength ?? 0,
    };
  }

  /** Admin: Create the volunteer account for an Approved applicant */
  async verifyApplicantAccount(applicationId: string, req: any) {
    const adminId =
      req.userV2?.sub || (req.admin ? req.admin._id.toString() : null);
    if (!adminId) throw new AppError("Authentication required.", 401);

    const app = await Application.findById(applicationId).populate(
      "position",
      "title"
    );
    if (!app) throw new AppError("Application not found.", 404);

    if (app.status !== applicationStatus.APPROVED) {
      throw new AppError("Only approved applications can be verified.", 400);
    }

    const existingAdminAccount = await adminService.fetch({
      id_number: `${app.applicantSnapshot.idNumber}-admin`,
    });

    if (existingAdminAccount.length > 0) {
      throw new AppError(
        "Admin account already exists for this applicant.",
        400
      );
    }

    const idNumber = app.applicantSnapshot.idNumber;
    const username = `${String(idNumber)}-admin`;

    // Temp password: 10 chars from an unambiguous alphabet.
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const tempPassword = Array.from({ length: 10 }, () => {
      return chars[randomInt(0, chars.length)];
    }).join("");

    const snapshotName = app.applicantSnapshot.name || "";
    const nameParts = snapshotName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName =
      nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    const yearMatch = String(app.applicantSnapshot.year ?? "").match(/\d+/);
    const year = yearMatch ? Number(yearMatch[0]) : 1;

    const positionTitle = (app.position as any)?.title ?? "";

    // Extract role and sub-role from the position title.
    // e.g. "Developer - Frontend" → role="Developer", subRole="Frontend"
    //      "Volunteer"             → role="Volunteer", subRole=undefined
    const titleParts = positionTitle.split(" - ");
    const role = titleParts[0]?.trim() || "Volunteer";
    const subRole =
      titleParts.length > 1
        ? titleParts.slice(1).join(" - ").trim()
        : undefined;

    // Upsert the student record so the account exists even if the student
    // doc was created out-of-band. `rfid` is a required field on Student,
    // so reuse the (unique) id_number as a stable placeholder.
    //id_number, name, password, email, position, course, year, campus

    const accountBody: Request = {
      id_number: `${idNumber}-admin`,
      name: snapshotName,
      password: tempPassword,
      email: app.applicantSnapshot.email || "",
      position: role,
      course: app.applicantSnapshot.course || "",
      year: year,
      campus: app.applicantSnapshot.campus || campus_type.MAIN,
    };
    await adminService.create(accountBody, req);

    app.volunteerAccount = {
      username,
      tempPassword,
      createdAt: new Date(),
    };
    app.statusHistory.push({
      status: applicationStatus.APPROVED,
      changedAt: new Date(),
      changedBy: adminId,
      note: "Volunteer account created.",
    });
    await app.save();

    // Send account-creation email with credentials — best-effort, don't
    // block on failure. This is sent only on verification (account creation),
    // not on approval. The approval email is sent separately in
    // updateApplicationStatus when the status changes to APPROVED.
    try {
      await recruitmentAccountCreatedMail({
        applicantName: snapshotName,
        applicantEmail: app.applicantSnapshot.email,
        role,
        subRole,
        username,
        tempPassword,
      });
    } catch (err) {
      console.error(
        "Failed to send recruitment account creation email:",
        err instanceof Error ? err.message : err
      );
    }

    return { username, tempPassword };
  }

  /** Admin: Delete a rejected/withdrawn application */
  async deleteApplication(id: string, req: any) {
    const adminId =
      req.userV2?.sub || (req.admin ? req.admin._id.toString() : null);
    if (!adminId) throw new AppError("Authentication required.", 401);

    const app = await Application.findById(id);
    if (!app) throw new AppError("Application not found.", 404);

    // Only terminal, non-actionable states can be deleted. This prevents
    // accidentally removing active/in-progress applications.
    if (
      app.status !== applicationStatus.REJECTED &&
      app.status !== applicationStatus.WITHDRAWN
    ) {
      throw new AppError(
        "Only rejected or withdrawn applications can be deleted.",
        400
      );
    }

    await app.deleteOne();
    return { message: "Application deleted successfully" };
  }

  /** Admin: Delete every rejected application without loading them in the UI. */
  async clearRejectedApplications(req: any) {
    const adminId =
      req.userV2?.sub || (req.admin ? req.admin._id.toString() : null);
    if (!adminId) throw new AppError("Authentication required.", 401);

    const result = await Application.deleteMany({
      status: applicationStatus.REJECTED,
    });

    return {
      message: "Rejected applications cleared successfully",
      deletedCount: result.deletedCount ?? 0,
    };
  }

  /** Update application status (admin only) */
  async updateApplicationStatus(id: string, req: any) {
    const { status, note } = req.body;
    const adminId =
      req.userV2.sub || (req.admin ? req.admin._id.toString() : null);

    if (!adminId) throw new AppError("Authentication required.", 401);

    const app = await Application.findById(id).populate(
      "position",
      "title slots slotsFilled hiringStatus applicationDeadline isActive"
    );
    if (!app) throw new AppError("Application not found.", 404);

    // Validate allowed transition
    const allowedTransitions: Record<string, string[]> = {
      [applicationStatus.SUBMITTED]: [
        applicationStatus.INTERVIEW_SCHEDULED,
        applicationStatus.APPROVED,
        applicationStatus.REJECTED,
      ],
      [applicationStatus.INTERVIEW_SCHEDULED]: [
        applicationStatus.INTERVIEWING,
        applicationStatus.APPROVED,
        applicationStatus.REJECTED,
      ],
      [applicationStatus.INTERVIEWING]: [
        applicationStatus.APPROVED,
        applicationStatus.REJECTED,
      ],
    };

    // app.status may be a terminal state (APPROVED/REJECTED/WITHDRAWN) that
    // isn't a key in allowedTransitions at all — default to [] instead of
    // letting `allowedTransitions[app.status]` come back undefined.
    const allowedNextStatuses = allowedTransitions[app.status] ?? [];

    // `.includes()` checks values; the old `status in allowedTransitions[...]`
    // was checking array indices, which is not what was intended.
    if (!allowedNextStatuses.includes(status)) {
      throw new AppError(
        `Invalid status transition from ${app.status} to ${status}.`,
        400
      );
    }

    app.status = status;
    app.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: adminId,
      note,
    });
    app.reviewer = adminId;
    app.internalNotes =
      (app.internalNotes || "") +
      `\n[${new Date().toISOString()}] ${note || ""}`;

    await app.save();

    // Release the reserved slot when an application is rejected — only if
    // this position actually tracks slots. Also reopens hiring if the
    // position was auto-closed for being full (but leaves it CLOSED if the
    // deadline has since passed or an admin explicitly closed it for other
    // reasons — see the deadline guard below).
    if (status === applicationStatus.REJECTED) {
      const position = app.position as any;
      const hasSlotLimit =
        typeof position?.slots === "number" && position.slots > 0;

      if (hasSlotLimit) {
        const deadlinePassed =
          position.applicationDeadline &&
          new Date(position.applicationDeadline) < new Date();

        const update: any = { $inc: { slotsFilled: -1 } };

        if (
          position.hiringStatus === hiringStatus.CLOSED &&
          position.isActive &&
          !deadlinePassed
        ) {
          update.$set = { hiringStatus: hiringStatus.OPEN };
        }

        await RecruitmentPosition.updateOne(
          {
            _id: position._id,
            slotsFilled: { $gt: 0 },
          },
          update
        );
      }
    }

    // Send rejection email automatically when the decision is REJECTED.
    // Fire-and-forget so the status update responds immediately instead of
    // blocking on the email provider's network latency.
    if (status === applicationStatus.REJECTED) {
      recruitmentRejectedMail({
        applicantName: app.applicantSnapshot.name || "",
        applicantEmail: app.applicantSnapshot.email || "",
        reason: note || undefined,
      }).catch((err) => {
        console.error(
          "Failed to send recruitment rejection email:",
          err instanceof Error ? err.message : err
        );
      });
    }

    // Send approval email automatically when the decision is APPROVED.
    // The account-creation email (with credentials) is sent separately
    // later in verifyApplicantAccount when the volunteer account is created.
    if (status === applicationStatus.APPROVED) {
      try {
        const positionTitle = (app.position as any)?.title ?? "";
        const titleParts = positionTitle.split(" - ");
        const role = titleParts[0]?.trim() || "Volunteer";
        const subRole =
          titleParts.length > 1
            ? titleParts.slice(1).join(" - ").trim()
            : undefined;

        await recruitmentApprovedMail({
          applicantName: app.applicantSnapshot.name || "",
          applicantEmail: app.applicantSnapshot.email || "",
          role,
          subRole,
        });
      } catch (err) {
        console.error(
          "Failed to send recruitment approval email:",
          err instanceof Error ? err.message : err
        );
      }
    }

    return app;
  }

  /** Schedule an interview */
  async createInterview(applicationId: string, req: any) {
    const adminId =
      req.userV2.sub || (req.admin ? req.admin._id.toString() : null);
    if (!adminId) throw new AppError("Authentication required.", 401);

    const app = await Application.findById(applicationId).populate(
      "position",
      "title"
    );
    if (!app) throw new AppError("Application not found.", 404);

    const { scheduledAt, location, notes } = req.body;

    if (!scheduledAt)
      throw new AppError("Scheduled date/time is required.", 400);

    const interviewDate = new Date(scheduledAt);
    if (interviewDate < new Date()) {
      throw new AppError("Interview date must be in the future.", 400);
    }

    app.interview = {
      scheduledAt: interviewDate,
      location: location || "",
      notes: notes || "",
      status: "SCHEDULED" as const,
      scheduledBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    app.status = applicationStatus.INTERVIEW_SCHEDULED;
    app.statusHistory.push({
      status: applicationStatus.INTERVIEW_SCHEDULED,
      changedAt: new Date(),
      changedBy: adminId,
      note: "Interview scheduled.",
    });
    app.reviewer = adminId;
    app.internalNotes =
      (app.internalNotes || "") +
      `\n[${new Date().toISOString()}] Interview scheduled. ${location || ""}`;

    await app.save();

    // Send interview schedule notification email — best-effort, don't
    // block on failure. Parses the interview mode from the notes field
    // (stored as "Interview type: [type]; ...") and formats the date/time
    // from the scheduledAt timestamp.
    try {
      const scheduledAt = app.interview.scheduledAt;
      const dateStr = scheduledAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Manila",
      });
      const timeStr = scheduledAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      });

      const modeMatch = (notes || "").match(/Interview type:\s*(.+?)(?:;|$)/i);
      const mode = modeMatch?.[1]?.trim() || "Face-to-Face";

      const officerMatch = (notes || "").match(
        /officer in charge:\s*(.+?)(?:;|$)/i
      );
      const officer = officerMatch?.[1]?.trim() || "";

      await recruitmentInterviewScheduledMail({
        applicantName: app.applicantSnapshot.name || "",
        applicantEmail: app.applicantSnapshot.email || "",
        interviewDate: dateStr,
        interviewTime: timeStr,
        mode,
        officer,
      });
    } catch (err) {
      console.error(
        "Failed to send interview schedule email:",
        err instanceof Error ? err.message : err
      );
    }

    return app;
  }

  /** Update/reschedule an interview */
  async updateInterview(applicationId: string, req: any) {
    const adminId =
      req.userV2.sub || (req.admin ? req.admin._id.toString() : null);
    if (!adminId) throw new AppError("Authentication required.", 401);

    const app = await Application.findById(applicationId).populate(
      "position",
      "title"
    );
    if (!app) throw new AppError("Application not found.", 404);

    if (!app.interview)
      throw new AppError("No interview scheduled for this application.", 400);

    if (
      app.status === applicationStatus.APPROVED ||
      app.status === applicationStatus.REJECTED
    ) {
      throw new AppError(
        `Cannot reschedule an interview for an application that is already ${app.status.toLowerCase()}.`,
        400
      );
    }

    const { scheduledAt, location, notes, status } = req.body;

    if (scheduledAt) {
      const interviewDate = new Date(scheduledAt);
      if (interviewDate < new Date()) {
        throw new AppError("Interview date must be in the future.", 400);
      }
      app.interview.scheduledAt = interviewDate;
    }
    if (location !== undefined) app.interview.location = location;
    if (notes !== undefined) app.interview.notes = notes;
    if (status !== undefined) {
      if (!Object.values(interviewStatus).includes(status as any)) {
        throw new AppError("Invalid interview status.", 400);
      }
      app.interview.status = status as any;
    }
    app.interview.updatedAt = new Date();
    app.interview.scheduledBy = adminId;

    await app.save();

    // Send interview reschedule notification email — best-effort, don't
    // block on failure. Parses the interview mode from the notes field
    // (stored as "Interview type: [type]; ...") and formats the new date/time
    // from the updated scheduledAt timestamp.
    try {
      const rescheduledAt = app.interview.scheduledAt;
      const dateStr = rescheduledAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Manila",
      });
      const timeStr = rescheduledAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      });

      const modeMatch = (app.interview.notes || "").match(
        /Interview type:\s*(.+?)(?:;|$)/i
      );
      const mode = modeMatch?.[1]?.trim() || "Face-to-Face";

      const officerMatch = (app.interview.notes || "").match(
        /officer in charge:\s*(.+?)(?:;|$)/i
      );
      const officer = officerMatch?.[1]?.trim() || "";

      await recruitmentInterviewRescheduledMail({
        applicantName: app.applicantSnapshot.name || "",
        applicantEmail: app.applicantSnapshot.email || "",
        interviewDate: dateStr,
        interviewTime: timeStr,
        mode,
        officer,
      });
    } catch (err) {
      console.error(
        "Failed to send interview reschedule email:",
        err instanceof Error ? err.message : err
      );
    }

    return app;
  }

  /** Cancel/remove interview */
  async deleteInterview(applicationId: string) {
    const app = await Application.findById(applicationId);
    if (!app) throw new AppError("Application not found.", 404);

    if (!app.interview) throw new AppError("No interview to cancel.", 400);

    app.interview.status = "CANCELLED" as const;
    app.interview.updatedAt = new Date();

    await app.save();
    return app;
  }
}

export const recruitmentService = new RecruitmentService();
