import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Student } from "../models/student.model";
import { IStudentDocument } from "../models/student.interface";
import { Admin } from "../models/admin.model";
import { Merch } from "../models/merch.model";
import { Orders } from "../models/orders.model";
import { Log } from "../models/log.model";
import { Settings } from "../models/settings.model";
import { MembershipHistory, IHistoryDocument } from "../models/history.model";
import { Membership } from "../models/membership.model";
import { EmailQueue } from "../models/email.model";
import { Counter } from "../models/counter.model";
import {
  formatMembershipReference,
  manilaYear,
  membershipCounterKey,
} from "../util/reference.util";
import { isOrganizationalMemberRecord } from "../util/role.util";
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
import { AppError } from "../util/app.error.util";

/** Matches a generated code, e.g. "2026-000241". */
const SEQUENTIAL_CODE = /^(\d{4})-(\d+)$/;

const parseSequential = (
  code?: string | null
): { year: number; seq: number } | null => {
  const match = SEQUENTIAL_CODE.exec(String(code ?? "").trim());
  return match ? { year: Number(match[1]), seq: Number(match[2]) } : null;
};

/** Accepts a real Date or the ISO strings some legacy rows stored instead. */
const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export type MembershipHistoryType = "members" | "non-members";

/**
 * Batch-fetches the Student documents referenced by a set of history records'
 * `student` FKs and builds a Map keyed by ObjectId string.
 *
 * Used to project the denormalized `id_number`/`name`/`year`/`course`/`rfid`
 * fields back into the response shape so the frontend API contract is
 * unchanged even though the schema no longer stores them.
 */
const buildStudentMap = async (
  records: Array<Pick<IHistoryDocument, "student">>
): Promise<Map<string, IStudentDocument>> => {
  const ids = Array.from(
    new Set(
      records
        .map((r) => r.student)
        .filter((id): id is mongoose.Types.ObjectId => Boolean(id))
    )
  );
  if (ids.length === 0) return new Map();
  const students = await Student.find({ _id: { $in: ids } }).lean();
  return new Map(
    students.map((s) => [String(s._id), s as unknown as IStudentDocument])
  );
};

/**
 * Projects a history record's student FK back into the original denormalized
 * field names. Orphan records (FK null or pointing to a deleted Student)
 * fall back to empty strings / 0.
 */
const projectStudentFields = (
  record: IHistoryDocument,
  studentMap: Map<string, IStudentDocument>
): Record<string, unknown> => {
  const student = record.student
    ? studentMap.get(String(record.student))
    : undefined;
  const fullName = student
    ? `${student.first_name} ${student.middle_name ?? ""} ${student.last_name}`.trim()
    : "";
  return {
    ...record.toObject(),
    id_number: student?.id_number ?? "",
    rfid: student?.rfid ?? "",
    name: fullName,
    year: student?.year ?? 0,
    course: student?.course ?? "",
  };
};

class HistoryService {
  //record membership history
  record = async (query: IHistory) => {
    return await new MembershipHistory(query).save();
  };
  //Get all membership history
  getAll = async (filters: { type?: MembershipHistoryType } = {}) => {
    const history: IHistoryDocument[] = await MembershipHistory.find().sort({
      date: -1,
    });
    if (!history) {
      throw new AppError("No history found!", 404);
    }

    // Surface the parent term's name + term so reports can filter by them.
    // Legacy rows without membership_id get empty values.
    const terms = await Membership.find().select("term_name membership_name");
    const termById = new Map(terms.map((term) => [String(term._id), term]));

    const studentMap = await buildStudentMap(history);

    // The Members / Non-members split is about the linked student's
    // organizational membership, not the history row's own membership_id (which
    // only links the row to a membership term). Classify from the batched
    // studentMap so no per-row student lookup is needed.
    const rows = filters.type
      ? history.filter(
          (record) =>
            isOrganizationalMemberRecord(record, studentMap) ===
            (filters.type === "members")
        )
      : history;

    return rows.map((record) => ({
      ...projectStudentFields(record, studentMap),
      term_name: record.membership_id
        ? (termById.get(String(record.membership_id))?.term_name ?? "")
        : "",
      membership_name: record.membership_id
        ? (termById.get(String(record.membership_id))?.membership_name ?? "")
        : "",
    }));
  };

  //Get history records linked to a membership term (activation records)
  getByMembership = async (
    membershipId: string | string[]
  ): Promise<Record<string, unknown>[]> => {
    const ids = Array.isArray(membershipId) ? membershipId : [membershipId];
    const records: IHistoryDocument[] = await MembershipHistory.find({
      membership_id: { $in: ids },
    }).sort({ date: -1 });

    const studentMap = await buildStudentMap(records);
    return records.map((record) => projectStudentFields(record, studentMap));
  };

  /**
   * Corrects the reference code on an existing membership record.
   *
   * Any non-empty string is accepted — codes may need to match a paper receipt
   * book, and legacy rows are free-form.
   *
   * With `cascade`, every record dated after this one in the same year is
   * renumbered to stay contiguous with the new value — old randomized codes
   * included, since that is how a legacy row pulls the records behind it into
   * the sequence — and the year's counter is advanced past the highest result so
   * the next approval cannot collide. Without it, only this record changes and
   * the counter is left alone.
   */
  updateReferenceCode = async (
    id: string,
    referenceCode: string,
    options: { cascade?: boolean } = {}
  ) => {
    const nextCode = String(referenceCode ?? "").trim();
    if (!nextCode) {
      throw new AppError("Reference code is required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Membership record not found", 404);
    }

    const record = await MembershipHistory.findById(id);
    if (!record) {
      throw new AppError("Membership record not found", 404);
    }

    const previousCode = record.reference_code;
    if (previousCode === nextCode) {
      return { record, previousCode, emailsRelinked: 0, renumbered: [] };
    }

    if (options.cascade) {
      return this.cascadeRenumber(record, previousCode, nextCode);
    }

    const clash = await MembershipHistory.findOne({
      reference_code: nextCode,
      _id: { $ne: record._id },
    });
    if (clash) {
      throw new AppError(
        `Reference code "${nextCode}" is already used by another record`,
        409
      );
    }

    record.reference_code = nextCode;
    try {
      await record.save();
    } catch (error: any) {
      // Unique index, in case another write landed between the check and save.
      if (error?.code === 11000) {
        throw new AppError(
          `Reference code "${nextCode}" is already used by another record`,
          409
        );
      }
      throw error;
    }

    // Both resend paths look the record up by reference code, so queued receipt
    // emails would be orphaned without this.
    const relink = await EmailQueue.updateMany(
      { subtype: "membership", referenceCode: previousCode },
      { $set: { referenceCode: nextCode } }
    );

    // Keep the counter pinned to the real end of the sequence. Without this,
    // editing the highest code downwards left the counter stale and the next
    // approval skipped the numbers that were just freed.
    const affectedYear =
      parseSequential(nextCode)?.year ?? parseSequential(previousCode)?.year;
    if (affectedYear) {
      await this.syncCounterToHighest(affectedYear);
    }

    return {
      record,
      previousCode,
      emailsRelinked: relink.modifiedCount ?? 0,
      renumbered: [] as Array<{ from: string; to: string }>,
    };
  };

  /**
   * Sets the year's counter to the highest sequential code currently in use, so
   * the next approval continues directly from the real end of the sequence.
   */
  private syncCounterToHighest = async (year: number) => {
    const codes = await MembershipHistory.find({
      reference_code: { $regex: `^${year}-\\d+$` },
    })
      .select("reference_code")
      .lean();

    const highest = codes.reduce((max: number, doc: any) => {
      const parsed = parseSequential(doc.reference_code);
      return parsed && parsed.seq > max ? parsed.seq : max;
    }, 0);

    await Counter.updateOne(
      { _id: membershipCounterKey(year) },
      { $set: { seq: highest } },
      { upsert: true }
    );

    return highest;
  };

  /**
   * Renumbers the edited record plus every record dated after it in the same
   * year, keeping the run contiguous.
   *
   * Followers are ordered by date, not by the numeric part of the code. Most
   * records carry an old randomized code, so a code-based order would find
   * almost nothing and the cascade would silently do nothing; the date is the
   * only ordering every record shares, and it is what the original backfill
   * used. Old-format records are therefore swept into the sequence too, which
   * is the point of renumbering from a legacy row.
   *
   * Writes happen in two phases inside a transaction: every affected record is
   * first parked on a temporary code, then given its final one. A single-phase
   * write would trip the unique index whenever the new range overlaps the old
   * (renaming 241 -> 242 while 242 still exists).
   */
  private cascadeRenumber = async (
    record: IHistoryDocument,
    previousCode: string,
    nextCode: string
  ) => {
    const from = parseSequential(previousCode);
    const to = parseSequential(nextCode);

    if (!to) {
      throw new AppError(
        "Renumbering needs the new code in YYYY-NNNNNN form",
        400
      );
    }
    if (from && from.year !== to.year) {
      throw new AppError(
        "Renumbering cannot move a record to another year",
        400
      );
    }

    // Ordering is by date, so the edited record needs a usable one to have a
    // position at all.
    const recordDate = toDate(record.date);
    if (!recordDate) {
      throw new AppError(
        "Renumbering needs a usable date on this record to place it in the sequence",
        400
      );
    }

    const recordYear = manilaYear(recordDate);
    if (recordYear !== to.year) {
      throw new AppError(
        `This record is dated ${recordYear}, so it cannot take a ${to.year} code while renumbering`,
        400
      );
    }

    // The year is derived per record rather than queried, since a Manila-year
    // range query would have to straddle two UTC dates. History is small enough
    // that reading it whole costs less than the complexity.
    const others = await MembershipHistory.find({ _id: { $ne: record._id } });

    // Ties on identical timestamps fall back to id, so the order is stable and
    // matches the backfill's.
    const selfRank: [number, string] = [
      recordDate.getTime(),
      String(record._id),
    ];

    const followers: Array<{
      doc: (typeof others)[number];
      rank: [number, string];
    }> = [];

    for (const doc of others) {
      const date = toDate(doc.date);
      // Undated rows have no position in the run, so they are left untouched.
      if (!date || manilaYear(date) !== to.year) continue;

      const rank: [number, string] = [date.getTime(), String(doc._id)];
      if (
        rank[0] > selfRank[0] ||
        (rank[0] === selfRank[0] && rank[1] > selfRank[1])
      ) {
        followers.push({ doc, rank });
      }
    }

    followers.sort(
      (a, b) => a.rank[0] - b.rank[0] || a.rank[1].localeCompare(b.rank[1])
    );

    const plan: Array<{ doc: IHistoryDocument; from: string; to: string }> = [
      { doc: record, from: previousCode, to: nextCode },
      ...followers.map(({ doc }, index) => ({
        doc,
        from: doc.reference_code,
        to: formatMembershipReference(to.year, to.seq + index + 1),
      })),
    ];

    // Any target already held by a record outside the plan is a hard conflict.
    const planIds = new Set(plan.map((p) => String(p.doc._id)));
    const targets = plan.map((p) => p.to);
    const outsiders = await MembershipHistory.find({
      reference_code: { $in: targets },
    })
      .select("reference_code")
      .lean();
    const blocked = outsiders.find((o: any) => !planIds.has(String(o._id)));
    if (blocked) {
      throw new AppError(
        `Reference code "${(blocked as any).reference_code}" is already used by another record`,
        409
      );
    }

    const session = await mongoose.startSession();
    let emailsRelinked = 0;
    try {
      await session.withTransaction(async () => {
        emailsRelinked = 0;

        // Phase 1 — park everything on a collision-proof temporary code.
        for (const step of plan) {
          await MembershipHistory.updateOne(
            { _id: step.doc._id },
            { $set: { reference_code: `__RENUM-${step.doc._id}` } },
            { session }
          );
        }

        // Phase 2 — assign the final codes and move the receipt emails with them.
        for (const step of plan) {
          await MembershipHistory.updateOne(
            { _id: step.doc._id },
            { $set: { reference_code: step.to } },
            { session }
          );
          const relink = await EmailQueue.updateMany(
            { subtype: "membership", referenceCode: step.from },
            { $set: { referenceCode: step.to } },
            { session }
          );
          emailsRelinked += relink.modifiedCount ?? 0;
        }
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new AppError(
          "Renumbering hit a duplicate reference code and was rolled back",
          409
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }

    // Point the counter at the highest sequential code that actually exists for
    // the year, in whichever direction the cascade moved things. Using $max on
    // just the cascade's own highest left a gap after a downward renumber — the
    // counter stayed put and the next approval jumped past the freed numbers.
    // Setting it to the real maximum is still collision-proof, because nothing
    // sits above it by definition.
    await this.syncCounterToHighest(to.year);

    const updated = await MembershipHistory.findById(record._id);

    return {
      record: updated ?? record,
      previousCode,
      emailsRelinked,
      renumbered: plan.slice(1).map((p) => ({ from: p.from, to: p.to })),
    };
  };
}
const historyService = new HistoryService();
export { historyService };
