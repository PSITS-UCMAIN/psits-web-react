import mongoose, { ClientSession, Types } from "mongoose";
import { IAttendance } from "../models/attendance.interface";
import { Attendance } from "../models/attendance.model";
import { IAttendanceSession, IAttendee } from "../models/attendee.interface";
import { ISessionConfig } from "../models/event.interface";
import { Event } from "../models/event.model";
import { parseTimeRangeToMinutes } from "../utils/timeRange";

const TIMEZONE = "Asia/Manila";

const SESSION_NAMES: Array<keyof IAttendanceSession> = [
  "morning",
  "afternoon",
  "evening",
];

export class AttendanceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "AttendanceError";
  }
}

export const ATTENDANCE_ERROR_STATUS_MAP: Record<string, number> = {
  INVALID_EVENT_ID: 400,
  EVENT_NOT_FOUND: 404,
  EVENT_NOT_ACTIVE: 400,
  WRONG_DATE: 400,
  NO_ACTIVE_SESSION: 400,
  AMBIGUOUS_SESSION: 400,
  ATTENDEE_NOT_FOUND: 404,
  ALREADY_RECORDED: 409,
  ALREADY_RECORDED_OTHER_SESSION: 409,
};

export interface MarkAttendanceInput {
  eventId: string;
  attendeeIdNumber: string;
  attendeeName: string;
  campus: string;
  course: string;
  year: number;
  confirmedByAdminName: string;
}

export interface MarkAttendanceResult {
  session: keyof IAttendanceSession;
  attendee: {
    id_number: string;
    name: string;
    campus: string;
    attendance: IAttendanceSession;
    confirmedBy: string;
  };
  isNewAttendee: boolean;
}

export type HydratableAttendee = IAttendee & {
  _id?: Types.ObjectId | string | null;
};

type EventWithAttendees<
  TAttendee extends HydratableAttendee = HydratableAttendee,
> = {
  _id?: unknown;
  attendees?: TAttendee[] | null;
};

type EventAttendee = HydratableAttendee & { _id: Types.ObjectId };
type AttendanceEventMetadata = {
  _id?: unknown;
  attendanceType: string;
  eventDate: Date;
  status: string;
  sessionConfig?: ISessionConfig;
};

function getNowInManila(): {
  dateString: string;
  hour: number;
  minute: number;
} {
  const now = new Date();

  const dateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(timeParts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(timeParts.find((p) => p.type === "minute")?.value ?? 0);

  return { dateString, hour, minute };
}

function getEventDateInManila(eventDate: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(eventDate));
}

function buildEventLookupQuery(eventId: string) {
  const objectId = new mongoose.Types.ObjectId(eventId);
  return { $or: [{ _id: objectId }, { eventId: objectId }] };
}

function toObjectIdString(value: unknown): string | null {
  if (!value) return null;
  const normalized = String(value);
  return normalized && normalized !== "undefined" && normalized !== "null"
    ? normalized
    : null;
}

function toObjectId(value: unknown): Types.ObjectId | null {
  const normalized = toObjectIdString(value);
  if (!normalized || !Types.ObjectId.isValid(normalized)) {
    return null;
  }

  return new Types.ObjectId(normalized);
}

function normalizeTimestamp(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function buildDefaultAttendance(): IAttendanceSession {
  return {
    morning: { attended: false, timestamp: null },
    afternoon: { attended: false, timestamp: null },
    evening: { attended: false, timestamp: null },
  };
}

export function normalizeAttendance(
  value?: Partial<IAttendanceSession> | null
): IAttendanceSession {
  return {
    morning: {
      attended: Boolean(value?.morning?.attended),
      timestamp: normalizeTimestamp(value?.morning?.timestamp),
    },
    afternoon: {
      attended: Boolean(value?.afternoon?.attended),
      timestamp: normalizeTimestamp(value?.afternoon?.timestamp),
    },
    evening: {
      attended: Boolean(value?.evening?.attended),
      timestamp: normalizeTimestamp(value?.evening?.timestamp),
    },
  };
}

export function isAttendancePresent(
  value?: Partial<IAttendanceSession> | null
): boolean {
  const attendance = normalizeAttendance(value);

  return [attendance.morning, attendance.afternoon, attendance.evening].some(
    (session) => Boolean(session.attended)
  );
}

function buildAttendanceKey(eventId: string, attendeeId: string) {
  return `${eventId}:${attendeeId}`;
}

function extractAttendeeRef(
  attendee: HydratableAttendee
): Types.ObjectId | null {
  return toObjectId(attendee._id);
}

function hydrateAttendeeFromMap<T extends HydratableAttendee>(
  eventId: string | null,
  attendee: T,
  attendanceMap: Map<string, Pick<IAttendance, "attendance" | "confirmedBy">>
): T {
  const attendeeRef = extractAttendeeRef(attendee);
  const record =
    eventId && attendeeRef
      ? attendanceMap.get(buildAttendanceKey(eventId, attendeeRef.toString()))
      : undefined;

  const attendance = record
    ? normalizeAttendance(record.attendance)
    : normalizeAttendance(attendee.attendance);
  const confirmedBy = record?.confirmedBy ?? attendee.confirmedBy ?? "";

  return {
    ...attendee,
    attendance,
    confirmedBy,
  };
}

async function getAttendanceMap(
  pairs: Array<{
    eventId: unknown;
    attendeeRef: unknown;
  }>
): Promise<Map<string, Pick<IAttendance, "attendance" | "confirmedBy">>> {
  const eventIds = new Set<string>();
  const attendeeIds = new Set<string>();

  for (const pair of pairs) {
    const eventId = toObjectIdString(pair.eventId);
    const attendeeId = toObjectIdString(pair.attendeeRef);
    if (!eventId || !attendeeId) continue;
    eventIds.add(eventId);
    attendeeIds.add(attendeeId);
  }

  if (eventIds.size === 0 || attendeeIds.size === 0) {
    return new Map();
  }

  const attendanceDocs = await Attendance.find({
    event: { $in: Array.from(eventIds, (id) => new Types.ObjectId(id)) },
    attendeeRef: {
      $in: Array.from(attendeeIds, (id) => new Types.ObjectId(id)),
    },
  })
    .select("event attendeeRef attendance confirmedBy")
    .lean();

  return new Map(
    attendanceDocs.map((doc) => [
      buildAttendanceKey(String(doc.event), String(doc.attendeeRef)),
      {
        attendance: normalizeAttendance(doc.attendance),
        confirmedBy: doc.confirmedBy ?? "",
      },
    ])
  );
}

export async function hydrateAttendeesAttendance<T extends HydratableAttendee>(
  eventId: unknown,
  attendees: T[]
): Promise<T[]> {
  if (!Array.isArray(attendees) || attendees.length === 0) {
    return [];
  }

  const eventIdString = toObjectIdString(eventId);
  const attendanceMap = await getAttendanceMap(
    attendees
      .filter((attendee) => Boolean(toObjectIdString(attendee._id)))
      .map((attendee) => ({
        eventId,
        attendeeRef: attendee._id!,
      }))
  );

  return attendees.map((attendee) =>
    hydrateAttendeeFromMap(eventIdString, attendee, attendanceMap)
  );
}

export async function hydrateEventsAttendance<T extends EventWithAttendees>(
  events: T[]
): Promise<T[]> {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  const pairs = events.flatMap((event) =>
    (Array.isArray(event.attendees) ? event.attendees : [])
      .filter((attendee) => Boolean(toObjectIdString(attendee._id)))
      .map((attendee) => ({
        eventId: event._id ?? "",
        attendeeRef: attendee._id!,
      }))
  );

  const attendanceMap = await getAttendanceMap(pairs);

  return events.map((event) => {
    const eventId = toObjectIdString(event._id);
    const attendees = Array.isArray(event.attendees) ? event.attendees : [];

    return {
      ...event,
      attendees: attendees.map((attendee) =>
        hydrateAttendeeFromMap(eventId, attendee, attendanceMap)
      ),
    };
  });
}

function getActiveSession(event: {
  sessionConfig?: ISessionConfig;
  eventDate: Date;
  status: string;
}): keyof IAttendanceSession {
  if (event.status === "Ended" || event.status === "Cancelled") {
    throw new AttendanceError(
      "EVENT_NOT_ACTIVE",
      "This event is not currently active."
    );
  }

  const manila = getNowInManila();
  const eventDateManila = getEventDateInManila(event.eventDate);

  if (manila.dateString !== eventDateManila) {
    throw new AttendanceError(
      "WRONG_DATE",
      "Attendance can only be recorded on the event date."
    );
  }

  const matchedSessions: Array<keyof IAttendanceSession> = [];
  const currentMinutes = manila.hour * 60 + manila.minute;

  for (const sessionName of SESSION_NAMES) {
    const config = event.sessionConfig?.[sessionName];
    if (!config?.enabled || !config.timeRange) continue;

    const bounds = parseTimeRangeToMinutes(config.timeRange);
    if (!bounds) continue;

    if (
      currentMinutes >= bounds.startMinutes &&
      currentMinutes <= bounds.endMinutes
    ) {
      matchedSessions.push(sessionName);
    }
  }

  if (matchedSessions.length === 0) {
    throw new AttendanceError(
      "NO_ACTIVE_SESSION",
      "Current time does not fall within any active session."
    );
  }

  if (matchedSessions.length > 1) {
    throw new AttendanceError(
      "AMBIGUOUS_SESSION",
      `Ambiguous session time: current time matches multiple sessions (${matchedSessions.join(", ")})`
    );
  }

  return matchedSessions[0] as keyof IAttendanceSession;
}

async function findProjectedAttendee(
  eventId: Types.ObjectId,
  attendeeMatch: Record<string, unknown>,
  session: ClientSession
): Promise<EventAttendee | null> {
  const projectedEvent = await Event.findById(
    eventId,
    {
      attendees: { $elemMatch: attendeeMatch },
    },
    { session }
  ).lean();

  const projectedAttendees = Array.isArray(projectedEvent?.attendees)
    ? (projectedEvent.attendees as unknown as EventAttendee[])
    : [];

  return projectedAttendees[0] ?? null;
}

async function resolveAttendanceAttendee(
  event: Pick<AttendanceEventMetadata, "_id">,
  input: MarkAttendanceInput,
  session: ClientSession
): Promise<{ attendee: EventAttendee; isNewAttendee: boolean }> {
  const eventObjectId = toObjectId(event._id);
  if (!eventObjectId) {
    throw new AttendanceError("EVENT_NOT_FOUND", "Event not found");
  }

  const attendee = await findProjectedAttendee(
    eventObjectId,
    {
      id_number: input.attendeeIdNumber,
    },
    session
  );

  if (!attendee) {
    throw new AttendanceError(
      "ATTENDEE_NOT_FOUND",
      "Student is not registered for this event"
    );
  }

  return { attendee, isNewAttendee: false };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

async function ensureAttendanceSeed(
  eventId: Types.ObjectId,
  attendee: EventAttendee,
  session: ClientSession
) {
  try {
    await Attendance.updateOne(
      {
        event: eventId,
        attendeeRef: attendee._id,
      },
      {
        $setOnInsert: {
          event: eventId,
          attendeeRef: attendee._id,
          id_number: attendee.id_number,
          attendance: normalizeAttendance(attendee.attendance),
          confirmedBy: attendee.confirmedBy ?? "",
        },
      },
      { upsert: true, session }
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }
}

/**
 * Upserts the `Attendance` collection record for an attendee so it matches
 * the attendee's embedded attendance. This keeps the separate Attendance
 * collection in sync when an attendee is added via the V2 add/walk-in flows
 * (which only write to the embedded `event.attendees[].attendance`), so
 * hydration does not surface a stale all-false record as "Absent".
 */
export async function syncAttendanceForAttendee(
  eventId: Types.ObjectId,
  attendee: EventAttendee,
  session: ClientSession
) {
  await Attendance.updateOne(
    { event: eventId, attendeeRef: attendee._id },
    {
      $set: {
        event: eventId,
        attendeeRef: attendee._id,
        id_number: attendee.id_number,
        attendance: normalizeAttendance(attendee.attendance),
        confirmedBy: attendee.confirmedBy ?? "",
      },
    },
    { upsert: true, session }
  );
}

/**
 * Deletes the `Attendance` collection record for an attendee that is being
 * removed from an event, so hydration doesn't later resurrect a dangling
 * attendance record for an attendee that no longer exists.
 */
export async function deleteAttendanceForAttendee(
  eventId: Types.ObjectId,
  attendeeRef: Types.ObjectId,
  session: ClientSession
) {
  await Attendance.deleteOne(
    { event: eventId, attendeeRef },
    { session }
  );
}

async function updateAttendanceRecord(
  eventId: Types.ObjectId,
  attendee: EventAttendee,
  sessionName: keyof IAttendanceSession,
  confirmedByAdminName: string,
  timestamp: Date,
  oneSessionOnly: boolean,
  session: ClientSession
) {
  await ensureAttendanceSeed(eventId, attendee, session);

  const existingRecord = await Attendance.findOne(
    { event: eventId, attendeeRef: attendee._id },
    null,
    { session }
  ).lean<IAttendance | null>();

  if (
    oneSessionOnly &&
    existingRecord &&
    SESSION_NAMES.some(
      (name) =>
        name !== sessionName &&
        existingRecord.attendance?.[name]?.attended === true
    )
  ) {
    throw new AttendanceError(
      "ALREADY_RECORDED_OTHER_SESSION",
      "Attendance already recorded for another session"
    );
  }

  const updatedRecord = await Attendance.findOneAndUpdate(
    {
      event: eventId,
      attendeeRef: attendee._id,
      [`attendance.${sessionName}.attended`]: { $ne: true },
    },
    {
      $set: {
        [`attendance.${sessionName}`]: {
          attended: true,
          timestamp,
        },
        confirmedBy: confirmedByAdminName,
        id_number: attendee.id_number,
      },
    },
    { new: true, session }
  );

  if (!updatedRecord) {
    throw new AttendanceError(
      "ALREADY_RECORDED",
      `Attendance already recorded for ${sessionName}`
    );
  }

  return updatedRecord;
}

export async function markAttendance(
  input: MarkAttendanceInput
): Promise<MarkAttendanceResult> {
  if (!mongoose.Types.ObjectId.isValid(input.eventId)) {
    throw new AttendanceError("INVALID_EVENT_ID", "Invalid event ID format");
  }

  const dbSession = await mongoose.startSession();

  try {
    dbSession.startTransaction();

    const query = buildEventLookupQuery(input.eventId);
    const event = await Event.findOne(query)
      .select("_id eventDate status sessionConfig attendanceType")
      .session(dbSession)
      .lean<AttendanceEventMetadata | null>();
    if (!event) {
      throw new AttendanceError("EVENT_NOT_FOUND", "Event not found");
    }

    const sessionName = getActiveSession(event);
    const { attendee, isNewAttendee } = await resolveAttendanceAttendee(
      event,
      input,
      dbSession
    );
    const eventObjectId = toObjectId(event._id);
    if (!eventObjectId) {
      throw new AttendanceError("EVENT_NOT_FOUND", "Event not found");
    }
    const timestamp = new Date();
    const attendanceRecord = await updateAttendanceRecord(
      eventObjectId,
      attendee,
      sessionName,
      input.confirmedByAdminName,
      timestamp,
      Boolean(event.sessionConfig?.oneSessionOnly),
      dbSession
    );

    await dbSession.commitTransaction();

    return {
      session: sessionName,
      attendee: {
        id_number: attendee.id_number,
        name: attendee.name,
        campus: attendee.campus,
        attendance: normalizeAttendance(attendanceRecord.attendance),
        confirmedBy: attendanceRecord.confirmedBy ?? input.confirmedByAdminName,
      },
      isNewAttendee,
    };
  } catch (error) {
    if (dbSession.inTransaction()) {
      await dbSession.abortTransaction();
    }
    throw error;
  } finally {
    dbSession.endSession();
  }
}
