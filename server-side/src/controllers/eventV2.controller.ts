import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "../lib/r2Client";
import { attendeeRegistrationMail } from "../mail_template/mail.template";
import { Admin } from "../models/admin.model";
import { IAttendee } from "../models/attendee.interface";
import { IEvent } from "../models/event.interface";
import { Event } from "../models/event.model";
import { Merch } from "../models/merch.model";
import { Student } from "../models/student.model";
import {
  ATTENDANCE_ERROR_STATUS_MAP,
  AttendanceError,
  buildDefaultAttendance,
  deleteAttendanceForAttendee,
  hydrateAttendeesAttendance,
  hydrateEventsAttendance,
  markAttendance,
  syncAttendanceForAttendee,
} from "../services/attendance.service";
import { EventV2Service } from "../services/eventV2.service";
import { computeEventStatistics } from "../services/eventStatistics.service";
import { logService } from "../services/log.service";
import { logs_action } from "../enums/logs.enums";
import { campus_type } from "../enums/campus.enums";
import {
  parseCampusLimitsPayload,
  parseSessionConfigPayload,
} from "../dtos/events.dto";

const logAdminAction = (
  req: Request,
  action: string,
  target: string,
  target_id?: string,
  target_model = "Event"
) =>
  logService.create({
    admin:
      req.admin?.name ??
      (req.userV2 as { idNumber?: string } | undefined)?.idNumber ??
      "Unknown Admin",
    admin_id: req.admin?._id,
    action,
    target,
    target_id:
      target_id && Types.ObjectId.isValid(target_id)
        ? new Types.ObjectId(target_id)
        : undefined,
    target_model,
  });

/**
 * Returns a Date object representing the start of the day (00:00:00)
 * 6 days prior to the current date.
 */
const getSevenDayWindowCutoffDate = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  date.setHours(0, 0, 0, 0);
  return date;
};

const buildEventLookupQuery = (eventId: string) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return null;
  }

  const objectId = new mongoose.Types.ObjectId(eventId);

  return {
    $or: [{ _id: objectId }, { eventId: objectId }],
  };
};

const buildProxyImageUrl = (
  req: Request,
  file: Express.MulterS3.File
): string =>
  `${req.protocol}://${req.get("host")}/api/v2/events/image/${file.key}`;

const LEGACY_CAMPUS_MAP: Record<string, string> = {
  "UC-Main": "UC_MAIN",
  "UC-Banilad": "UC_BANILAD",
  "UC-LM": "UC_LM",
  "UC-PT": "UC_PT",
  "UC-CS": "UC_CS",
};

const normalizeCampusValue = (value: unknown): string => {
  const str = String(value ?? "").trim();
  return LEGACY_CAMPUS_MAP[str] ?? str;
};

/**
 * Defensive fix for legacy hyphenated campus codes (e.g. "UC-Main") stored
 * in `limit` / `sales_data` before the campus enum was changed to underscore
 * format. Mongoose validates the whole document on save, so any stale
 * subdocument with an old value will throw "event validation failed" even
 * if that subdocument wasn't the one being modified.
 */
const normalizeEventCampusFields = (event: IEvent): void => {
  if (Array.isArray(event.limit)) {
    for (const entry of event.limit) {
      if (entry && typeof entry === "object" && "campus" in entry) {
        entry.campus = normalizeCampusValue(
          entry.campus
        ) as typeof entry.campus;
      }
    }
  }
  if (Array.isArray(event.sales_data)) {
    for (const entry of event.sales_data) {
      if (entry && typeof entry === "object" && "campus" in entry) {
        entry.campus = normalizeCampusValue(
          entry.campus
        ) as typeof entry.campus;
      }
    }
  }
};

type AttendeeAttendanceFilter =
  | "morning_attended"
  | "afternoon_attended"
  | "evening_attended"
  | "no_sessions_attended";

interface AttendeeQueryParams {
  page: number;
  limit: number;
  search?: string;
  campus?: string;
  attendanceStatus?: AttendeeAttendanceFilter[];
  course?: string[];
  yearLevel?: number[];
  registeredOn?: string;
  exportAll?: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const parseNumberOrDefault = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const normalizePagination = (pageRaw: unknown, limitRaw: unknown) => {
  const pageParsed = parseNumberOrDefault(pageRaw, DEFAULT_PAGE);
  const limitParsed = parseNumberOrDefault(limitRaw, DEFAULT_LIMIT);

  const page = pageParsed < 1 ? DEFAULT_PAGE : Math.floor(pageParsed);
  const limit =
    limitParsed < 1
      ? DEFAULT_LIMIT
      : Math.min(Math.floor(limitParsed), MAX_LIMIT);

  return { page, limit };
};

const parseCsvString = (value: unknown): string[] | undefined => {
  if (typeof value !== "string") return undefined;

  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return values.length > 0 ? values : undefined;
};

const parseAttendanceStatusFilter = (
  value: unknown
): AttendeeAttendanceFilter[] | undefined => {
  const values = parseCsvString(value);
  if (!values) return undefined;

  const allowed: AttendeeAttendanceFilter[] = [
    "morning_attended",
    "afternoon_attended",
    "evening_attended",
    "no_sessions_attended",
  ];
  const filtered = values.filter((item): item is AttendeeAttendanceFilter =>
    allowed.includes(item as AttendeeAttendanceFilter)
  );

  return filtered.length > 0 ? filtered : undefined;
};

const parseYearLevelFilter = (value: unknown): number[] | undefined => {
  const values = parseCsvString(value);
  if (!values) return undefined;

  const years = values
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);

  return years.length > 0 ? years : undefined;
};

const parseRegisteredOn = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !value.trim()) return undefined;

  const normalized = value.trim();
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateOnlyPattern.test(normalized)) return undefined;

  const [year, month, day] = normalized.split("-").map((part) => Number(part));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }

  return normalized;
};

const normalizeAttendeeQueryParams = (req: Request): AttendeeQueryParams => {
  const { page, limit } = normalizePagination(req.query.page, req.query.limit);

  return {
    page,
    limit,
    search:
      typeof req.query.search === "string" && req.query.search.trim().length > 0
        ? req.query.search.trim()
        : undefined,
    campus:
      typeof req.query.campus === "string" && req.query.campus.trim().length > 0
        ? req.query.campus.trim()
        : undefined,
    attendanceStatus: parseAttendanceStatusFilter(
      req.query.attendanceStatus ?? req.query.status
    ),
    course: parseCsvString(req.query.course),
    yearLevel: parseYearLevelFilter(req.query.yearLevel),
    registeredOn: parseRegisteredOn(
      req.query.registeredOn ?? req.query.confirmedOn
    ),
    exportAll: req.query.exportAll === "true",
  };
};

const isAttendeePresent = (attendee: IAttendee): boolean => {
  const attendance = attendee.attendance;
  if (!attendance) return false;

  return [attendance.morning, attendance.afternoon, attendance.evening].some(
    (session) => Boolean(session?.attended)
  );
};

const getAttendeeAttendanceStatuses = (
  attendee: IAttendee
): AttendeeAttendanceFilter[] => {
  const statuses: AttendeeAttendanceFilter[] = [];
  const attendance = attendee.attendance;

  if (attendance?.morning?.attended) {
    statuses.push("morning_attended");
  }
  if (attendance?.afternoon?.attended) {
    statuses.push("afternoon_attended");
  }
  if (attendance?.evening?.attended) {
    statuses.push("evening_attended");
  }

  if (statuses.length === 0) {
    statuses.push("no_sessions_attended");
  }

  return statuses;
};

const formatDateInTimeZone = (
  dateValue: Date,
  timeZone: string
): string | null => {
  if (Number.isNaN(dateValue.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

const isSameDay = (
  dateValue: Date | null | undefined,
  yyyyMmDd: string
): boolean => {
  if (!dateValue) return false;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const attendeeDateInManila = formatDateInTimeZone(date, "Asia/Manila");
  return attendeeDateInManila === yyyyMmDd;
};

const matchesCampusFilter = (
  attendeeCampus: string,
  campusFilter: string
): boolean => {
  return attendeeCampus === campusFilter;
};

const filterAttendees = (
  attendees: IAttendee[],
  params: AttendeeQueryParams
): IAttendee[] => {
  return attendees.filter((attendee) => {
    if (params.campus && !matchesCampusFilter(attendee.campus, params.campus)) {
      return false;
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      const matchesSearch =
        attendee.name.toLowerCase().includes(q) ||
        attendee.id_number.toLowerCase().includes(q) ||
        attendee.course.toLowerCase().includes(q);

      if (!matchesSearch) return false;
    }

    if (params.attendanceStatus && params.attendanceStatus.length > 0) {
      const attendeeStatuses = getAttendeeAttendanceStatuses(attendee);
      const matchesAttendanceStatus = params.attendanceStatus.some((status) =>
        attendeeStatuses.includes(status)
      );

      if (!matchesAttendanceStatus) {
        return false;
      }
    }

    if (params.course && params.course.length > 0) {
      if (!params.course.includes(attendee.course)) {
        return false;
      }
    }

    if (params.yearLevel && params.yearLevel.length > 0) {
      if (!params.yearLevel.includes(attendee.year)) {
        return false;
      }
    }

    if (params.registeredOn) {
      if (!isSameDay(attendee.transactDate, params.registeredOn)) {
        return false;
      }
    }

    return true;
  });
};

interface AttendeeResponseDto {
  id_number: string;
  name: string;
  email?: string;
  course: string;
  year: number;
  campus: string;
  attendance: IAttendee["attendance"];
  confirmedBy: string;
  shirtSize: string;
  shirtPrice: number;
  raffleIsRemoved: boolean;
  raffleIsWinner: boolean;
  transactBy: string;
  transactDate: Date | null;
  isPresent: boolean;
}

interface MerchSizeDto {
  custom: boolean;
  price: string;
}

interface EventMerchDto {
  category: string | null;
  type: string | null;
  selectedSizes: Record<string, MerchSizeDto>;
  selectedVariations: string[];
}

type EventWithoutAttendees = Omit<IEvent, "attendees"> & {
  _id: unknown;
  __v?: unknown;
};

type EventByIdV2ResponseDto = EventWithoutAttendees & {
  merch: EventMerchDto | null;
};

const normalizeMerchSizes = (value: unknown): Record<string, MerchSizeDto> => {
  if (!value || typeof value !== "object") {
    return {};
  }

  if (value instanceof Map) {
    return Array.from(value.entries()).reduce<Record<string, MerchSizeDto>>(
      (acc, [size, config]) => {
        if (typeof size !== "string" || !config || typeof config !== "object") {
          return acc;
        }

        const parsed = config as { custom?: unknown; price?: unknown };
        acc[size] = {
          custom: Boolean(parsed.custom),
          price: String(parsed.price ?? "0"),
        };
        return acc;
      },
      {}
    );
  }

  return Object.entries(value).reduce<Record<string, MerchSizeDto>>(
    (acc, [size, config]) => {
      if (!config || typeof config !== "object") {
        return acc;
      }

      const parsed = config as { custom?: unknown; price?: unknown };
      acc[size] = {
        custom: Boolean(parsed.custom),
        price: String(parsed.price ?? "0"),
      };
      return acc;
    },
    {}
  );
};

const mapPaginatedAttendees = (attendees: IAttendee[]) => {
  return attendees.map<AttendeeResponseDto>((attendee) => ({
    id_number: attendee.id_number,
    name: attendee.name,
    course: attendee.course,
    year: attendee.year,
    campus: attendee.campus,
    attendance: attendee.attendance,
    confirmedBy: attendee.confirmedBy,
    shirtSize: attendee.shirtSize,
    shirtPrice: attendee.shirtPrice,
    raffleIsRemoved: attendee.raffleIsRemoved,
    raffleIsWinner: attendee.raffleIsWinner,
    transactBy: attendee.transactBy,
    transactDate: attendee.transactDate,
    isPresent: isAttendeePresent(attendee),
  }));
};

export const getAllEventsV2Controller = async (req: Request, res: Response) => {
  try {
    // Admins manage past events too (edit, statistics, certificates), so they
    // see everything. Students only see the recent/upcoming window.
    const isAdmin = req.userV2?.role === "admin";
    const dateFilter = isAdmin
      ? {}
      : { eventDate: { $gte: getSevenDayWindowCutoffDate() } };

    const events: IEvent[] = await Event.find(dateFilter).select(
      "-attendees"
    );

    if (!events || events.length === 0) {
      return res.status(404).json({ message: "No events found" });
    }

    return res.status(200).json({ data: events });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getEventByIdV2Controller = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!eventId || typeof eventId !== "string") {
      return res.status(400).json({ message: "Event ID is required" });
    }

    const query = buildEventLookupQuery(eventId);

    if (!query) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    const event = await Event.findOne(query).select("-attendees");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const merchDocument = await Merch.findById(event.eventId)
      .select("category type selectedSizes selectedVariations")
      .lean();

    const merch: EventMerchDto | null = merchDocument
      ? {
          category:
            typeof merchDocument.category === "string"
              ? merchDocument.category
              : null,
          type:
            typeof merchDocument.type === "string" ? merchDocument.type : null,
          selectedSizes: normalizeMerchSizes(merchDocument.selectedSizes),
          selectedVariations: Array.isArray(merchDocument.selectedVariations)
            ? merchDocument.selectedVariations.map((item) => String(item))
            : [],
        }
      : null;

    const eventObject = event.toObject() as EventWithoutAttendees;
    const responseDto: EventByIdV2ResponseDto = {
      ...eventObject,
      merch,
    };

    return res.status(200).json({ data: responseDto });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getEventAttendeesV2Controller = async (
  req: Request,
  res: Response
) => {
  try {
    const { eventId } = req.params;

    if (!eventId || typeof eventId !== "string") {
      return res.status(400).json({ message: "Event ID is required" });
    }

    const query = buildEventLookupQuery(eventId);

    if (!query) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    const claims = req.userV2;

    if (!claims || claims.role !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const params = normalizeAttendeeQueryParams(req);

    const isUcMainAdmin = claims.campus === campus_type.MAIN;
    const effectiveCampus = isUcMainAdmin ? params.campus : claims.campus;

    let hydratedAttendees;
    try {
      hydratedAttendees = await EventV2Service.getEventAttendees(eventId);
    } catch (err: any) {
      if (err.message === "Event not found") {
        return res.status(404).json({ message: "Event not found" });
      }
      throw err;
    }

    const filteredAttendees = filterAttendees(hydratedAttendees, {
      ...params,
      campus: effectiveCampus,
    });

    const total = filteredAttendees.length;

    if (params.exportAll) {
      const idNumbers = filteredAttendees.map((a) => a.id_number);
      const students = await Student.find(
        { id_number: { $in: idNumbers } },
        { id_number: 1, email: 1 }
      ).lean();

      const emailMap = new Map(students.map((s) => [s.id_number, s.email]));

      const exportData = mapPaginatedAttendees(filteredAttendees).map(
        (attendee) => ({
          ...attendee,
          email: emailMap.get(attendee.id_number) || undefined,
        })
      );

      return res.status(200).json({
        data: exportData,
        pagination: {
          page: 1,
          limit: total,
          total,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        access: {
          isUcMainAdmin,
          campusScope: effectiveCampus ?? "all",
        },
      });
    }

    const totalPages = total === 0 ? 1 : Math.ceil(total / params.limit);
    const page = Math.min(params.page, totalPages);
    const startIndex = (page - 1) * params.limit;
    const paginated = filteredAttendees.slice(
      startIndex,
      startIndex + params.limit
    );

    const pageIdNumbers = paginated.map((a) => a.id_number);
    const pageStudents = await Student.find(
      { id_number: { $in: pageIdNumbers } },
      { id_number: 1, email: 1 }
    ).lean();
    const pageEmailMap = new Map(
      pageStudents.map((s) => [s.id_number, s.email])
    );

    const dataWithEmail = mapPaginatedAttendees(paginated).map((attendee) => ({
      ...attendee,
      email: pageEmailMap.get(attendee.id_number) || undefined,
    }));

    return res.status(200).json({
      data: dataWithEmail,
      pagination: {
        page,
        limit: params.limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      access: {
        isUcMainAdmin,
        campusScope: effectiveCampus ?? "all",
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ── Event Raffle V2 ─────────────────────────────────────────────────────

type RaffleAttendeeDto = {
  attendeeId: string;
  id_number: string;
  name: string;
  campus: string;
  course: string;
  year: number;
};

type RaffleAttendee = IAttendee & {
  _id: unknown;
};

const RAFFLE_FILTERABLE_CAMPUSES = ["UC_MAIN", "UC_BANILAD", "UC_LM", "UC_PT"];

const RAFFLE_ELIGIBLE_CAMPUSES = [...RAFFLE_FILTERABLE_CAMPUSES, "UC_CS"];

const buildRaffleCampusFilter = (
  campusParam: string | undefined
): string[] | null => {
  if (!campusParam) return null;

  const normalized = campusParam.trim();
  if (normalized === "UC_MAIN") {
    return ["UC_MAIN", "UC_CS"];
  }

  return [normalized];
};

const isEligibleForRaffle = (
  attendee: Pick<RaffleAttendee, "raffleIsWinner" | "raffleIsRemoved">
): boolean => {
  return (
    attendee.raffleIsWinner === false && attendee.raffleIsRemoved === false
  );
};

const toRaffleAttendeeDto = (
  attendee: Pick<
    RaffleAttendee,
    "_id" | "id_number" | "name" | "campus" | "course" | "year"
  >
): RaffleAttendeeDto => {
  return {
    attendeeId: String(attendee._id),
    id_number: attendee.id_number,
    name: attendee.name,
    campus: attendee.campus,
    course: attendee.course,
    year: attendee.year,
  };
};

export const getEligibleAttendeesRaffleV2Controller = async (
  req: Request,
  res: Response
) => {
  try {
    const claims = req.userV2;
    if (!claims || claims.role !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    if (claims.campus !== campus_type.MAIN) {
      return res
        .status(403)
        .json({ message: "Only UC_MAIN admins can access raffle controls" });
    }

    const eventId = req.params.eventId as string;
    if (!eventId || !Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    const campusParam = req.query.campus as string | undefined;
    if (
      campusParam &&
      !RAFFLE_FILTERABLE_CAMPUSES.includes(campusParam.trim())
    ) {
      return res.status(400).json({ message: "Invalid campus" });
    }

    const query = buildEventLookupQuery(eventId);

    if (!query) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    const event = await Event.findOne(query).select("attendees");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendees: RaffleAttendee[] = Array.isArray(event.attendees)
      ? (event.attendees as unknown as RaffleAttendee[])
      : [];

    const campusFilter = buildRaffleCampusFilter(campusParam);

    const matchesCampus = (attendee: Pick<RaffleAttendee, "campus">) => {
      if (!RAFFLE_ELIGIBLE_CAMPUSES.includes(attendee.campus)) {
        return false;
      }

      return campusFilter === null || campusFilter.includes(attendee.campus);
    };

    const eligible = attendees
      .filter((a) => isEligibleForRaffle(a) && matchesCampus(a))
      .map((a) => toRaffleAttendeeDto(a));

    const winners = attendees
      .filter((a) => a.raffleIsWinner === true && matchesCampus(a))
      .map((a) => toRaffleAttendeeDto(a));

    return res.status(200).json({
      eligible,
      winners,
      totalEligible: eligible.length,
      ...(campusFilter && { campus: campusParam!.trim() }),
    });
  } catch (error) {
    console.error("Error loading raffle pool:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const drawEventRaffleWinnerController = async (
  req: Request,
  res: Response
) => {
  const eventId = req.params.eventId as string;

  try {
    const claims = req.userV2;

    if (!claims || claims.role !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    if (claims.campus !== campus_type.MAIN) {
      return res
        .status(403)
        .json({ message: "Only UC_MAIN admins can access raffle controls" });
    }

    if (!eventId || !Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    const query = buildEventLookupQuery(eventId);

    if (!query) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    const campusParam = req.query.campus as string | undefined;
    if (
      campusParam &&
      !RAFFLE_FILTERABLE_CAMPUSES.includes(campusParam.trim())
    ) {
      return res.status(400).json({ message: "Invalid campus" });
    }

    const event = await Event.findOne(query).select("attendees");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendees: RaffleAttendee[] = Array.isArray(event.attendees)
      ? (event.attendees as unknown as RaffleAttendee[])
      : [];
    const campusFilter = buildRaffleCampusFilter(campusParam);

    const eligible = attendees.filter(
      (attendee) =>
        isEligibleForRaffle(attendee) &&
        RAFFLE_ELIGIBLE_CAMPUSES.includes(attendee.campus) &&
        (campusFilter === null || campusFilter.includes(attendee.campus))
    );

    if (eligible.length === 0) {
      return res
        .status(404)
        .json({ message: "No eligible attendees left for raffle draw" });
    }

    const randomIndex = randomInt(0, eligible.length);
    const chosen = eligible[randomIndex];

    chosen.raffleIsWinner = true;
    chosen.raffleIsRemoved = true;

    event.markModified("attendees");
    await event.save();

    await logAdminAction(
      req,
      logs_action.RAFFLE_DRAW,
      `${chosen.name} (${chosen.id_number})`,
      eventId,
      "Raffle"
    );

    return res.status(200).json({
      message: "Success",
      winner: toRaffleAttendeeDto(chosen),
    });
  } catch (error) {
    console.error("Error drawing raffle winner:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const undoEventRaffleWinnerController = async (
  req: Request,
  res: Response
) => {
  try {
    const claims = req.userV2;

    if (!claims || claims.role !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    if (claims.campus !== campus_type.MAIN) {
      return res
        .status(403)
        .json({ message: "Only UC_MAIN admins can access raffle controls" });
    }

    const eventId = req.params.eventId as string;
    const attendeeId = req.params.attendeeId as string;

    if (!eventId || !Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    const query = buildEventLookupQuery(eventId);

    if (!query) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    const event = await Event.findOne(query).select("attendees");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendees: RaffleAttendee[] = Array.isArray(event.attendees)
      ? (event.attendees as unknown as RaffleAttendee[])
      : [];

    const attendee = attendees.find((item) => String(item._id) === attendeeId);

    if (!attendee) {
      return res.status(404).json({ message: "Attendee not found" });
    }

    attendee.raffleIsWinner = false;
    attendee.raffleIsRemoved = false;

    event.markModified("attendees");
    await event.save();

    await logAdminAction(
      req,
      logs_action.RAFFLE_UNDO,
      `${attendee.name} (${attendee.id_number})`,
      eventId,
      "Raffle"
    );

    return res.status(200).json({ message: "Win undone" });
  } catch (error) {
    console.error("Error undoing raffle winner:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ── Add Attendee V2 ─────────────────────────────────────────────────────

// Validation constants (mirror frontend rules)
const V_NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'.,-]+$/;
const V_NAME_MIN = 2;
const V_NAME_MAX = 50;
const V_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
const V_PWD_MIN = 8;
const V_STUDENT_ID_REGEX = /^\d{8}$/;
const V_VALID_COURSES = ["BSIT", "BSCS", "ACT"];
const V_VALID_CAMPUSES = ["UC_BANILAD", "UC_LM", "UC_PT"];
const V_DISABLED_ADD_ATTENDEE_CAMPUSES = ["UC_MAIN", "UC_CS"];

const CAMPUS_ID_SUFFIX: Record<string, string> = {
  UC_BANILAD: "ucb",
  UC_LM: "uclm",
  UC_PT: "ucpt",
};

const buildCampusScopedStudentId = (rawStudentId: string, campus: string) => {
  const baseId = rawStudentId.trim().split("-")[0]?.trim() ?? "";
  const suffix = CAMPUS_ID_SUFFIX[campus];

  if (!baseId || !suffix) {
    return null;
  }

  return `${baseId}-${suffix}`;
};

const validateNameField = (
  value: string | undefined,
  label: string,
  required: boolean
): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return required ? `${label} is required` : null;
  if (trimmed.length < V_NAME_MIN)
    return `${label} must be at least ${V_NAME_MIN} characters`;
  if (trimmed.length > V_NAME_MAX)
    return `${label} must not exceed ${V_NAME_MAX} characters`;
  if (!V_NAME_REGEX.test(trimmed))
    return `${label} contains invalid characters`;
  return null;
};

const validatePasswordStrength = (password: string): string | null => {
  if (!password) return "Password is required";
  if (password.length < V_PWD_MIN)
    return `Password must be at least ${V_PWD_MIN} characters`;
  if (!/[A-Z]/.test(password))
    return "Password must include at least 1 uppercase letter";
  if (!/[a-z]/.test(password))
    return "Password must include at least 1 lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must include at least 1 number";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password))
    return "Password must include at least 1 symbol";
  return null;
};

const parseYearLevel = (yearLevel: string): number | null => {
  const num = parseInt(yearLevel, 10);
  if (!Number.isFinite(num) || num < 1 || num > 4) return null;
  return num;
};

interface AddAttendeeV2Body {
  studentId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  course?: string;
  yearLevel?: string;
  shirtSize?: string;
  shirtPrice?: number;
  password?: string;
}

export const addAttendeeV2Controller = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    // ── Auth guard ──────────────────────────────────────────────────────
    const claims = req.userV2;
    if (!claims || claims.role !== "admin") {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "Admin access required",
      });
    }

    const adminCampus = claims.campus;
    if (V_DISABLED_ADD_ATTENDEE_CAMPUSES.includes(adminCampus)) {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: `Adding attendees via V2 is not allowed for ${adminCampus}`,
      });
    }

    if (!V_VALID_CAMPUSES.includes(adminCampus)) {
      return res.status(400).json({
        error: "INVALID_CAMPUS",
        message: "Admin campus is invalid",
      });
    }

    // ── Event ID param ──────────────────────────────────────────────────
    const eventId = req.params.eventId as string;
    const query = buildEventLookupQuery(eventId);
    if (!query) {
      return res.status(400).json({
        error: "INVALID_EVENT_ID",
        message: "Invalid event ID format",
      });
    }

    // ── Body extraction & validation ────────────────────────────────────
    const {
      studentId,
      firstName,
      middleName,
      lastName,
      email,
      course,
      yearLevel,
      shirtSize,
      shirtPrice,
      password,
    } = req.body as AddAttendeeV2Body;

    // Required field presence
    if (!studentId?.trim()) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Student ID is required" });
    }

    if (!V_STUDENT_ID_REGEX.test(studentId.trim())) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "Student ID must be exactly 8 digits",
      });
    }

    const normalizedStudentId = buildCampusScopedStudentId(
      studentId,
      adminCampus
    );
    if (!normalizedStudentId) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "Unable to derive campus-based Student ID",
      });
    }

    const firstNameErr = validateNameField(firstName, "First name", true);
    if (firstNameErr) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: firstNameErr });
    }

    const middleNameErr = validateNameField(middleName, "Middle name", false);
    if (middleNameErr) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: middleNameErr });
    }

    const lastNameErr = validateNameField(lastName, "Last name", true);
    if (lastNameErr) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: lastNameErr });
    }

    if (!email?.trim()) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Email is required" });
    }
    if (!V_EMAIL_REGEX.test(email.trim())) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Invalid email format" });
    }

    if (!course?.trim() || !V_VALID_COURSES.includes(course.trim())) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Invalid course" });
    }

    if (!yearLevel?.trim()) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Year level is required" });
    }
    const yearNumber = parseYearLevel(yearLevel);
    if (yearNumber === null) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Invalid year level" });
    }

    if (!password) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Password is required" });
    }
    const pwdErr = validatePasswordStrength(password);
    if (pwdErr) {
      return res.status(400).json({ error: "VALIDATION", message: pwdErr });
    }

    // ── Fetch event ─────────────────────────────────────────────────────
    const event = await Event.findOne(query);
    if (!event) {
      return res
        .status(404)
        .json({ error: "EVENT_NOT_FOUND", message: "Event not found" });
    }

    const campusLimit = event.limit.find(
      (entry) => entry.campus === adminCampus
    );
    const campusAttendeeCount = Array.isArray(event.attendees)
      ? event.attendees.filter((attendee) => attendee.campus === adminCampus)
          .length
      : 0;

    if (
      campusLimit &&
      campusLimit.limit > 0 &&
      campusAttendeeCount >= campusLimit.limit
    ) {
      return res.status(409).json({
        error: "CAMPUS_LIMIT_REACHED",
        message: `Campus attendee limit reached for ${adminCampus}`,
      });
    }

    // ── Duplicate attendee check ────────────────────────────────────────
    const attendeeList = Array.isArray(event.attendees)
      ? (event.attendees as unknown as IAttendee[])
      : [];

    const alreadyRegistered = attendeeList.some(
      (a) => a.id_number === normalizedStudentId && a.campus === adminCampus
    );
    if (alreadyRegistered) {
      return res.status(409).json({
        error: "ATTENDEE_EXISTS",
        message: "Student is already registered for this event at this campus",
      });
    }

    // ── Validate user-provided price ──────────────────────────────────
    if (shirtPrice == null) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Price is required" });
    }
    const resolvedPrice = Number(shirtPrice);
    if (!Number.isFinite(resolvedPrice) || resolvedPrice < 0) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "Price must be a non-negative number",
      });
    }

    // ── Check existing student ──────────────────────────────────────────
    const existingStudent = await Student.findOne({
      id_number: normalizedStudentId,
    });
    const isNewStudent = !existingStudent;

    // For new students, verify email is not already taken
    if (isNewStudent) {
      const emailTaken = await Student.findOne({
        email: email.trim().toLowerCase(),
      });
      if (emailTaken) {
        return res.status(409).json({
          error: "EMAIL_CONFLICT",
          message: "A student with this email already exists",
        });
      }
    }

    // ── Build attendee name ─────────────────────────────────────────────
    const attendeeName = [
      firstName!.trim(),
      middleName?.trim(),
      lastName!.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    // ── Transaction ─────────────────────────────────────────────────────
    session.startTransaction();

    // Step 1: Create student if new
    if (isNewStudent) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await Student.create(
        [
          {
            id_number: normalizedStudentId,
            rfid: "N/A",
            password: hashedPassword,
            first_name: firstName!.trim(),
            middle_name: middleName?.trim() ?? "",
            last_name: lastName!.trim(),
            email: email.trim(),
            course: course!.trim(),
            year: yearNumber,
            status: "True",
            membershipStatus: "NOT_APPLIED",
            campus: adminCampus,
            role: "all",
            isRequest: false,
            isFirstApplication: true,
            createdAt: new Date(),
          },
        ],
        { session }
      );
    }

    // Step 2: Push attendee into event as registered-only — attendance is
    // left unmarked until it's actually confirmed (QR scan / Mark Attendance).
    event.attendees.push({
      id_number: normalizedStudentId,
      name: attendeeName,
      course: course!.trim(),
      year: yearNumber,
      campus: adminCampus,
      shirtSize: shirtSize?.trim() ?? "",
      shirtPrice: resolvedPrice,
      transactBy: claims.idNumber,
      transactDate: new Date(),
      attendance: buildDefaultAttendance(),
      confirmedBy: "",
      raffleIsRemoved: false,
      raffleIsWinner: false,
    } as IAttendee);

    // Step 3: Update sales data (campus-specific)

    if (resolvedPrice > 0) {
      const campusData = event.sales_data.find((s) => s.campus === adminCampus);
      if (campusData) {
        campusData.unitsSold += 1;
        campusData.totalRevenue += resolvedPrice;
      }
      event.totalUnitsSold = (event.totalUnitsSold ?? 0) + 1;
      event.totalRevenueAll = (event.totalRevenueAll ?? 0) + resolvedPrice;
    }

    normalizeEventCampusFields(event);
    await event.save({ session });

    // Step 4: Sync the separate Attendance collection so hydration does not
    // surface a stale all-false record as "Absent" for this attendee.
    const savedAttendee = event.attendees[event.attendees.length - 1] as
      | (IAttendee & { _id?: Types.ObjectId })
      | undefined;
    if (savedAttendee?._id) {
      await syncAttendanceForAttendee(
        event._id as Types.ObjectId,
        savedAttendee as IAttendee & { _id: Types.ObjectId },
        session
      );
    }

    await session.commitTransaction();
    session.endSession();

    await logAdminAction(req, logs_action.ADD_ATTENDEE, attendeeName, eventId);

    let emailSent = true;
    if (isNewStudent) {
      try {
        await attendeeRegistrationMail({
          studentName: attendeeName,
          studentEmail: email.trim(),
          eventName: event.eventName,
          campus: adminCampus,
          studentId: normalizedStudentId,
          password: password,
        });
      } catch (emailError) {
        emailSent = false;
        console.error("Failed to send registration email:", emailError);
      }
    }

    return res.status(201).json({
      message: isNewStudent
        ? emailSent
          ? "Account created and attendee registered successfully"
          : "Account created and attendee registered successfully, but email notification failed"
        : "Attendee registered successfully",
      data: {
        isNewStudent,
        emailSent,
        attendee: {
          id_number: normalizedStudentId,
          name: attendeeName,
          campus: adminCampus,
          course: course!.trim(),
          year: yearNumber,
          shirtSize: shirtSize?.trim() ?? "",
          shirtPrice: resolvedPrice,
        },
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    console.error("Error in addAttendeeV2Controller:", error);

    // Duplicate key error (race condition on id_number)
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return res.status(409).json({
        error: "DUPLICATE_ENTRY",
        message: "Student ID already exists",
      });
    }

    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};
interface AddWalkInAttendeeV2Body {
  studentId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  course?: string;
  yearLevel?: string;
  shirtSize?: string;
  shirtPrice?: number;
}

/**
 * POST /api/v2/events/:eventId/attendees/walk-in
 *
 * Lightweight manual attendee registration that does NOT create a student
 * account (no password, no email notification). Available to ALL campuses
 * (including UC_MAIN / UC_CS which are blocked from addAttendeeV2).
 *
 * The attendee is pushed directly into the event's `attendees` array so they
 * can later be marked present via the existing attendance flow.
 */
export const addWalkInAttendeeV2Controller = async (
  req: Request,
  res: Response
) => {
  const session = await mongoose.startSession();

  try {
    // ── Auth guard ──────────────────────────────────────────────────────
    const claims = req.userV2;
    if (!claims || claims.role !== "admin") {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "Admin access required",
      });
    }

    const adminCampus = claims.campus;

    // ── Event ID param ──────────────────────────────────────────────────
    const eventId = req.params.eventId as string;
    const query = buildEventLookupQuery(eventId);
    if (!query) {
      return res.status(400).json({
        error: "INVALID_EVENT_ID",
        message: "Invalid event ID format",
      });
    }

    // ── Body extraction & validation ────────────────────────────────────
    const {
      studentId,
      firstName,
      middleName,
      lastName,
      email,
      course,
      yearLevel,
      shirtSize,
      shirtPrice,
    } = req.body as AddWalkInAttendeeV2Body;

    // Required field presence
    if (!studentId?.trim()) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Student ID is required" });
    }

    if (!V_STUDENT_ID_REGEX.test(studentId.trim())) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "Student ID must be exactly 8 digits",
      });
    }

    // Derive campus-scoped ID. For UC_BANILAD/UC_LM/UC_PT this appends the
    // campus suffix (e.g. 21123456-uclm). For UC_MAIN/UC_CS there is no
    // suffix, so we fall back to the raw 8-digit ID.
    const normalizedStudentId =
      buildCampusScopedStudentId(studentId, adminCampus) ?? studentId.trim();

    const firstNameErr = validateNameField(firstName, "First name", true);
    if (firstNameErr) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: firstNameErr });
    }

    const middleNameErr = validateNameField(middleName, "Middle name", false);
    if (middleNameErr) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: middleNameErr });
    }

    const lastNameErr = validateNameField(lastName, "Last name", true);
    if (lastNameErr) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: lastNameErr });
    }

    // Email is optional for walk-in attendees
    if (email?.trim() && !V_EMAIL_REGEX.test(email.trim())) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Invalid email format" });
    }

    if (!course?.trim() || !V_VALID_COURSES.includes(course.trim())) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Invalid course" });
    }

    if (!yearLevel?.trim()) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Year level is required" });
    }
    const yearNumber = parseYearLevel(yearLevel);
    if (yearNumber === null) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Invalid year level" });
    }

    // ── Fetch event ─────────────────────────────────────────────────────
    const event = await Event.findOne(query);
    if (!event) {
      return res
        .status(404)
        .json({ error: "EVENT_NOT_FOUND", message: "Event not found" });
    }

    const campusLimit = event.limit.find(
      (entry) => entry.campus === adminCampus
    );
    const campusAttendeeCount = Array.isArray(event.attendees)
      ? event.attendees.filter((attendee) => attendee.campus === adminCampus)
          .length
      : 0;

    if (
      campusLimit &&
      campusLimit.limit > 0 &&
      campusAttendeeCount >= campusLimit.limit
    ) {
      return res.status(409).json({
        error: "CAMPUS_LIMIT_REACHED",
        message: `Campus attendee limit reached for ${adminCampus}`,
      });
    }

    // ── Duplicate attendee check ────────────────────────────────────────
    const attendeeList = Array.isArray(event.attendees)
      ? (event.attendees as unknown as IAttendee[])
      : [];

    const alreadyRegistered = attendeeList.some(
      (a) => a.id_number === normalizedStudentId && a.campus === adminCampus
    );
    if (alreadyRegistered) {
      return res.status(409).json({
        error: "ATTENDEE_EXISTS",
        message: "Student is already registered for this event at this campus",
      });
    }

    // ── Validate user-provided price ──────────────────────────────────
    const resolvedPrice = shirtPrice == null ? 0 : Number(shirtPrice);
    if (!Number.isFinite(resolvedPrice) || resolvedPrice < 0) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "Price must be a non-negative number",
      });
    }

    // ── Build attendee name ─────────────────────────────────────────────
    const attendeeName = [
      firstName!.trim(),
      middleName?.trim(),
      lastName!.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    // ── Transaction ─────────────────────────────────────────────────────
    session.startTransaction();

    // Step 1: Push attendee into event (no student account creation) as
    // registered-only — attendance is left unmarked until it's actually
    // confirmed (QR scan / Mark Attendance).
    event.attendees.push({
      id_number: normalizedStudentId,
      name: attendeeName,
      course: course!.trim(),
      year: yearNumber,
      campus: adminCampus,
      shirtSize: shirtSize?.trim() ?? "",
      shirtPrice: resolvedPrice,
      transactBy: claims.idNumber,
      transactDate: new Date(),
      attendance: buildDefaultAttendance(),
      confirmedBy: "",
      raffleIsRemoved: false,
      raffleIsWinner: false,
    } as IAttendee);

    // Step 2: Update sales data (campus-specific)
    if (resolvedPrice > 0) {
      const campusData = event.sales_data.find((s) => s.campus === adminCampus);
      if (campusData) {
        campusData.unitsSold += 1;
        campusData.totalRevenue += resolvedPrice;
      }
      event.totalUnitsSold = (event.totalUnitsSold ?? 0) + 1;
      event.totalRevenueAll = (event.totalRevenueAll ?? 0) + resolvedPrice;
    }

    normalizeEventCampusFields(event);
    await event.save({ session });

    // Step 3: Sync the separate Attendance collection so hydration does not
    // surface a stale all-false record as "Absent" for this attendee.
    const savedAttendee = event.attendees[event.attendees.length - 1] as
      | (IAttendee & { _id?: Types.ObjectId })
      | undefined;
    if (savedAttendee?._id) {
      await syncAttendanceForAttendee(
        event._id as Types.ObjectId,
        savedAttendee as IAttendee & { _id: Types.ObjectId },
        session
      );
    }

    await session.commitTransaction();
    session.endSession();

    await logAdminAction(req, logs_action.ADD_ATTENDEE, attendeeName, eventId);

    return res.status(201).json({
      message: "Walk-in attendee registered successfully",
      data: {
        attendee: {
          id_number: normalizedStudentId,
          name: attendeeName,
          campus: adminCampus,
          course: course!.trim(),
          year: yearNumber,
          shirtSize: shirtSize?.trim() ?? "",
          shirtPrice: resolvedPrice,
        },
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    console.error("Error in addWalkInAttendeeV2Controller:", error);

    // Duplicate key error (race condition on id_number)
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return res.status(409).json({
        error: "DUPLICATE_ENTRY",
        message: "Student ID already exists",
      });
    }

    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

export const getMyEventsController = async (req: Request, res: Response) => {
  try {
    const idNumber = req.userV2?.idNumber;
    const campus = req.userV2?.campus;

    if (!idNumber) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Exclude sensitive/unnecessary fields with - prefix
    const events = await Event.find()
      .select("-totalRevenueAll -totalUnitsSold -limit -sales_data")
      .sort({ eventDate: 1 })
      .lean();

    // Drop malformed records so a single bad event cannot break the student list.
    const validEvents = events.filter((event) => {
      if (!event.eventDate) return false;
      const date =
        event.eventDate instanceof Date
          ? event.eventDate
          : new Date(String(event.eventDate));
      return !Number.isNaN(date.getTime());
    });

    // Just filter attendees
    const filteredEvents = validEvents.map((event) => ({
      ...event,
      attendees: (event.attendees || []).filter((att) => {
        if (!campus) {
          return att.id_number === idNumber;
        }
        return (
          att.id_number === idNumber &&
          att.campus?.toLowerCase() === campus.toLowerCase()
        );
      }),
    }));
    const hydratedEvents = await hydrateEventsAttendance(filteredEvents);

    return res.status(200).json({ data: hydratedEvents });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ── Student Self-Apply V2 ────────────────────────────────────────────────

export const applyToEventV2Controller = async (req: Request, res: Response) => {
  try {
    const claims = req.userV2;
    if (!claims || claims.role !== "student") {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "Student access required",
      });
    }

    const studentCampus = claims.campus;

    const eventId = req.params.eventId as string;
    const query = buildEventLookupQuery(eventId);
    if (!query) {
      return res.status(400).json({
        error: "INVALID_EVENT_ID",
        message: "Invalid event ID format",
      });
    }

    const event = await Event.findOne(query);
    if (!event) {
      return res
        .status(404)
        .json({ error: "EVENT_NOT_FOUND", message: "Event not found" });
    }

    // ── Students can only pre-register before the event starts. Late
    // attendees must be registered manually by an admin.
    const normalizedEventStatus = String(event.status ?? "")
      .trim()
      .toLowerCase();
    const isRegistrationManuallyClosed =
      normalizedEventStatus === "ended" || normalizedEventStatus === "cancelled";

    if (
      isRegistrationManuallyClosed ||
      hasEventStartedBySchedule(
        event.eventDate,
        event.eventStartTime,
        event.sessionConfig
      )
    ) {
      return res.status(409).json({
        error: "APPLICATIONS_CLOSED",
        message:
          "Student registration is closed. Please ask an admin to add you.",
      });
    }

    // ── Campus limit check (same rule as admin add) ─────────────────────
    const campusLimit = event.limit.find(
      (entry) => entry.campus === studentCampus
    );
    const campusAttendeeCount = Array.isArray(event.attendees)
      ? event.attendees.filter((a) => a.campus === studentCampus).length
      : 0;

    if (
      campusLimit &&
      campusLimit.limit > 0 &&
      campusAttendeeCount >= campusLimit.limit
    ) {
      return res.status(409).json({
        error: "CAMPUS_LIMIT_REACHED",
        message: `Attendee limit reached for ${studentCampus}`,
      });
    }

    // ── Duplicate check ──────────────────────────────────────────────────
    const attendeeList = Array.isArray(event.attendees)
      ? (event.attendees as unknown as IAttendee[])
      : [];

    const alreadyApplied = attendeeList.some(
      (a) => a.id_number === claims.idNumber
    );
    if (alreadyApplied) {
      return res.status(409).json({
        error: "ALREADY_APPLIED",
        message: "You have already applied to this event",
      });
    }

    // ── Auto-pull student profile ───────────────────────────────────────
    const student = await Student.findOne({ id_number: claims.idNumber });
    if (!student) {
      return res.status(404).json({
        error: "STUDENT_NOT_FOUND",
        message: "Student account not found",
      });
    }

    const attendeeName = [
      student.first_name,
      student.middle_name,
      student.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    event.attendees.push({
      id_number: student.id_number,
      name: attendeeName,
      course: student.course,
      year: student.year,
      campus: studentCampus,
      shirtSize: "",
      shirtPrice: 0,
      transactBy: student.id_number, // self-applied
      transactDate: new Date(),
      attendance: {
        morning: { attended: false, timestamp: null },
        afternoon: { attended: false, timestamp: null },
        evening: { attended: false, timestamp: null },
      },
      confirmedBy: "",
      raffleIsRemoved: false,
      raffleIsWinner: false,
    } as IAttendee);

    normalizeEventCampusFields(event);
    await event.save();

    return res.status(201).json({
      message: "Applied successfully",
      data: {
        id_number: student.id_number,
        name: attendeeName,
        campus: studentCampus,
      },
    });
  } catch (error) {
    console.error("Error in applyToEventV2Controller:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

export const getEventStatisticsV2Controller = async (
  req: Request,
  res: Response
) => {
  try {
    const { eventId } = req.params;

    if (!eventId || typeof eventId !== "string") {
      return res.status(400).json({ message: "Event ID is required" });
    }

    const query = buildEventLookupQuery(eventId);
    if (!query) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    const claims = req.userV2;
    if (!claims || claims.role !== "admin") {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const requesterCampus = claims.campus;
    const isUcMainAdmin = requesterCampus === campus_type.MAIN;
    const campusScope = isUcMainAdmin ? "all" : requesterCampus;

    const event = await Event.findOne(query)
      .select("_id attendees sales_data totalRevenueAll totalUnitsSold eventId")
      .lean();

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendeeList = Array.isArray(event.attendees)
      ? (event.attendees as unknown as IAttendee[])
      : [];
    const hydratedAttendees = await hydrateAttendeesAttendance(
      event._id,
      attendeeList
    );
    const salesData = Array.isArray(event.sales_data) ? event.sales_data : [];

    const statistics = computeEventStatistics(
      hydratedAttendees,
      salesData,
      campusScope
    );

    return res.status(200).json({
      data: statistics,
      access: {
        isUcMainAdmin,
        campusScope: campusScope === "all" ? "all" : requesterCampus,
      },
    });
  } catch (error) {
    console.error("Error fetching event statistics:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// ─── Mark Attendance V2 ─────────────────────────────────────────────────────

export const markAttendanceV2Controller = async (
  req: Request,
  res: Response
) => {
  try {
    const claims = req.userV2;
    if (!claims || claims.role !== "admin") {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "Admin access required",
      });
    }

    const eventId = req.params.eventId as string;
    const idNumber = req.params.idNumber as string;
    const { campus, attendeeName, course, year } = req.body;

    if (!idNumber?.trim()) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Student ID is required" });
    }
    if (!attendeeName?.trim()) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Attendee name is required" });
    }
    if (!campus?.trim()) {
      return res
        .status(400)
        .json({ error: "VALIDATION", message: "Campus is required" });
    }

    const admin = await Admin.findById(claims.sub).select("name");
    const adminName = admin?.name ?? claims.idNumber;

    const result = await markAttendance({
      eventId,
      attendeeIdNumber: idNumber.trim(),
      attendeeName: attendeeName.trim(),
      campus: campus.trim(),
      course: course?.trim() || "Unknown",
      year: Number(year) || 1,
      confirmedByAdminName: adminName,
    });

    await logAdminAction(
      req,
      logs_action.UPDATE_ATTENDEE,
      `${attendeeName.trim()} (${idNumber.trim()})`,
      eventId
    );

    return res.status(200).json({
      message: `Attendance for ${result.session} successfully recorded`,
      session: result.session,
      data: result.attendee,
      isNewAttendee: result.isNewAttendee,
    });
  } catch (error) {
    if (error instanceof AttendanceError) {
      const status = ATTENDANCE_ERROR_STATUS_MAP[error.code] || 400;
      return res
        .status(status)
        .json({ error: error.code, message: error.message });
    }
    console.error("Error in markAttendanceV2Controller:", error);
    return res
      .status(500)
      .json({ error: "INTERNAL_ERROR", message: "Internal server error" });
  }
};

// ── Get Editable Attendee V2 ────────────────────────────────────────────────

const stripCampusSuffix = (idNumber: string): string => {
  const dashIndex = idNumber.indexOf("-");
  return dashIndex === -1 ? idNumber : idNumber.substring(0, dashIndex);
};

export const getEditableAttendeeV2Controller = async (
  req: Request,
  res: Response
) => {
  try {
    const claims = req.userV2;
    if (!claims) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const idNumber = req.params.idNumber as string;

    if (claims.role === "student" && claims.idNumber !== idNumber?.trim()) {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "You can only mark your own attendance",
      });
    }

    if (claims.role !== "admin" && claims.role !== "student") {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "Admin or student access required",
      });
    }

    const adminCampus = claims.campus;
    if (V_DISABLED_ADD_ATTENDEE_CAMPUSES.includes(adminCampus)) {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: `Editing attendees is not allowed for ${adminCampus}`,
      });
    }

    if (!V_VALID_CAMPUSES.includes(adminCampus)) {
      return res.status(400).json({
        error: "INVALID_CAMPUS",
        message: "Admin campus is invalid",
      });
    }

    const eventId = req.params.eventId as string;
    const query = buildEventLookupQuery(eventId);
    if (!query) {
      return res.status(400).json({
        error: "INVALID_EVENT_ID",
        message: "Invalid event ID format",
      });
    }

    if (!idNumber?.trim()) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "Student ID is required",
      });
    }

    const event = await Event.findOne(query).select("attendees");
    if (!event) {
      return res
        .status(404)
        .json({ error: "EVENT_NOT_FOUND", message: "Event not found" });
    }

    const attendeeList = Array.isArray(event.attendees)
      ? (event.attendees as unknown as IAttendee[])
      : [];

    const attendee = attendeeList.find((a) => a.id_number === idNumber.trim());
    if (!attendee) {
      return res.status(404).json({
        error: "ATTENDEE_NOT_FOUND",
        message: "Attendee not found in this event",
      });
    }

    if (attendee.campus !== adminCampus) {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "You can only edit attendees from your own campus",
      });
    }

    const student = await Student.findOne({
      id_number: attendee.id_number,
    }).lean();

    return res.status(200).json({
      data: {
        id_number: attendee.id_number,
        baseIdNumber: stripCampusSuffix(attendee.id_number),
        firstName: student?.first_name ?? "",
        middleName: student?.middle_name ?? "",
        lastName: student?.last_name ?? "",
        email: student?.email ?? "",
        course: attendee.course,
        year: attendee.year,
        campus: attendee.campus,
        shirtSize: attendee.shirtSize ?? "",
        shirtPrice: attendee.shirtPrice ?? 0,
      },
    });
  } catch (error) {
    console.error("Error in getEditableAttendeeV2Controller:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

// ── Edit Attendee V2 ────────────────────────────────────────────────────────

const EDIT_CONFIRMATION_PHRASE =
  "I confirm that the edited fields are correct.";

interface EditAttendeeV2Body {
  adminPassword?: string;
  confirmationPhrase?: string;
  changes?: {
    studentId?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    course?: string;
    yearLevel?: string;
    shirtSize?: string;
    shirtPrice?: number;
  };
}

export const editAttendeeV2Controller = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    // ── Auth guard ──────────────────────────────────────────────────────
    const claims = req.userV2;
    if (!claims || claims.role !== "admin") {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "Admin access required",
      });
    }

    const adminCampus = claims.campus;
    if (V_DISABLED_ADD_ATTENDEE_CAMPUSES.includes(adminCampus)) {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: `Editing attendees is not allowed for ${adminCampus}`,
      });
    }

    if (!V_VALID_CAMPUSES.includes(adminCampus)) {
      return res.status(400).json({
        error: "INVALID_CAMPUS",
        message: "Admin campus is invalid",
      });
    }

    // ── Validate admin password ─────────────────────────────────────────
    const { adminPassword, confirmationPhrase, changes } =
      req.body as EditAttendeeV2Body;

    if (!adminPassword) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "Admin password is required",
      });
    }

    const admin = await Admin.findById(claims.sub).select("password");
    if (!admin) {
      return res.status(404).json({
        error: "ADMIN_NOT_FOUND",
        message: "Admin account not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(adminPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "INVALID_PASSWORD",
        message: "Incorrect admin password",
      });
    }

    // ── Validate confirmation phrase ────────────────────────────────────
    if (
      !confirmationPhrase ||
      confirmationPhrase !== EDIT_CONFIRMATION_PHRASE
    ) {
      return res.status(400).json({
        error: "INVALID_CONFIRMATION",
        message: "Confirmation phrase does not match",
      });
    }

    // ── Validate changes object ─────────────────────────────────────────
    if (!changes || typeof changes !== "object") {
      return res.status(400).json({
        error: "VALIDATION",
        message: "No changes provided",
      });
    }

    const changeKeys = Object.keys(changes).filter(
      (key) => (changes as Record<string, unknown>)[key] !== undefined
    );
    if (changeKeys.length === 0) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "No changes provided",
      });
    }

    // ── Validate each provided field ────────────────────────────────────
    if (changes.studentId !== undefined) {
      if (!changes.studentId.trim()) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Student ID is required",
        });
      }
      if (!V_STUDENT_ID_REGEX.test(changes.studentId.trim())) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Student ID must be exactly 8 digits",
        });
      }
    }

    if (changes.firstName !== undefined) {
      const err = validateNameField(changes.firstName, "First name", true);
      if (err) {
        return res.status(400).json({ error: "VALIDATION", message: err });
      }
    }

    if (changes.middleName !== undefined) {
      const err = validateNameField(changes.middleName, "Middle name", false);
      if (err) {
        return res.status(400).json({ error: "VALIDATION", message: err });
      }
    }

    if (changes.lastName !== undefined) {
      const err = validateNameField(changes.lastName, "Last name", true);
      if (err) {
        return res.status(400).json({ error: "VALIDATION", message: err });
      }
    }

    if (changes.email !== undefined) {
      if (!changes.email.trim()) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Email is required",
        });
      }
      if (!V_EMAIL_REGEX.test(changes.email.trim())) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Invalid email format",
        });
      }
    }

    if (changes.course !== undefined) {
      if (
        !changes.course.trim() ||
        !V_VALID_COURSES.includes(changes.course.trim())
      ) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Invalid course",
        });
      }
    }

    let parsedYear: number | null = null;
    if (changes.yearLevel !== undefined) {
      if (!changes.yearLevel.trim()) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Year level is required",
        });
      }
      parsedYear = parseYearLevel(changes.yearLevel);
      if (parsedYear === null) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Invalid year level",
        });
      }
    }

    if (changes.shirtPrice !== undefined) {
      const price = Number(changes.shirtPrice);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Price must be a non-negative number",
        });
      }
    }

    // ── Find event and attendee ─────────────────────────────────────────
    const eventId = req.params.eventId as string;
    const idNumber = req.params.idNumber as string;
    const query = buildEventLookupQuery(eventId);
    if (!query) {
      return res.status(400).json({
        error: "INVALID_EVENT_ID",
        message: "Invalid event ID format",
      });
    }

    if (!idNumber?.trim()) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "Student ID is required",
      });
    }

    const event = await Event.findOne(query);
    if (!event) {
      return res
        .status(404)
        .json({ error: "EVENT_NOT_FOUND", message: "Event not found" });
    }

    const attendeeList = Array.isArray(event.attendees)
      ? (event.attendees as unknown as IAttendee[])
      : [];

    const attendeeIndex = attendeeList.findIndex(
      (a) => a.id_number === idNumber.trim()
    );

    if (attendeeIndex === -1) {
      return res.status(404).json({
        error: "ATTENDEE_NOT_FOUND",
        message: "Attendee not found in this event",
      });
    }

    const attendee = attendeeList[attendeeIndex];

    if (attendee.campus !== adminCampus) {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "You can only edit attendees from your own campus",
      });
    }

    // ── Start transaction ───────────────────────────────────────────────
    session.startTransaction();

    const studentUpdateFields: Record<string, unknown> = {};
    const currentIdNumber = attendee.id_number;

    // ── Handle id_number change ─────────────────────────────────────────
    if (changes.studentId !== undefined) {
      const newScopedId = buildCampusScopedStudentId(
        changes.studentId,
        adminCampus
      );
      if (!newScopedId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          error: "VALIDATION",
          message: "Unable to derive campus-based Student ID",
        });
      }

      if (newScopedId !== currentIdNumber) {
        // Check for duplicate in event attendees
        const duplicateInEvent = attendeeList.some(
          (a, idx) => idx !== attendeeIndex && a.id_number === newScopedId
        );
        if (duplicateInEvent) {
          await session.abortTransaction();
          session.endSession();
          return res.status(409).json({
            error: "DUPLICATE_ENTRY",
            message: "A student with this ID already exists in this event",
          });
        }

        // Check for duplicate in Student collection
        const duplicateStudent = await Student.findOne({
          id_number: newScopedId,
        }).session(session);
        if (duplicateStudent) {
          await session.abortTransaction();
          session.endSession();
          return res.status(409).json({
            error: "DUPLICATE_ENTRY",
            message: "A student with this ID already exists",
          });
        }

        attendee.id_number = newScopedId;
        studentUpdateFields.id_number = newScopedId;
      }
    }

    // ── Handle name change ──────────────────────────────────────────────
    const hasNameChange =
      changes.firstName !== undefined ||
      changes.middleName !== undefined ||
      changes.lastName !== undefined;

    if (hasNameChange) {
      const existingStudent = await Student.findOne({
        id_number: currentIdNumber,
      })
        .select("first_name middle_name last_name")
        .session(session);

      const newFirstName =
        changes.firstName !== undefined
          ? changes.firstName.trim()
          : (existingStudent?.first_name ?? "");
      const newMiddleName =
        changes.middleName !== undefined
          ? changes.middleName.trim()
          : (existingStudent?.middle_name ?? "");
      const newLastName =
        changes.lastName !== undefined
          ? changes.lastName.trim()
          : (existingStudent?.last_name ?? "");

      if (changes.firstName !== undefined) {
        studentUpdateFields.first_name = newFirstName;
      }
      if (changes.middleName !== undefined) {
        studentUpdateFields.middle_name = newMiddleName;
      }
      if (changes.lastName !== undefined) {
        studentUpdateFields.last_name = newLastName;
      }

      const attendeeName = [newFirstName, newMiddleName, newLastName]
        .filter(Boolean)
        .join(" ");
      attendee.name = attendeeName;
    }

    // ── Handle email change ─────────────────────────────────────────────
    if (changes.email !== undefined) {
      const normalizedEmail = changes.email.trim().toLowerCase();
      const emailTaken = await Student.findOne({
        email: normalizedEmail,
        id_number: { $ne: currentIdNumber },
      }).session(session);

      if (emailTaken) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({
          error: "EMAIL_CONFLICT",
          message: "A student with this email already exists",
        });
      }

      studentUpdateFields.email = changes.email.trim();
    }

    // ── Handle course change ────────────────────────────────────────────
    if (changes.course !== undefined) {
      attendee.course = changes.course.trim();
      studentUpdateFields.course = changes.course.trim();
    }

    // ── Handle year change ──────────────────────────────────────────────
    if (parsedYear !== null) {
      attendee.year = parsedYear;
      studentUpdateFields.year = parsedYear;
    }

    // ── Handle shirtSize change ─────────────────────────────────────────
    if (changes.shirtSize !== undefined) {
      attendee.shirtSize = changes.shirtSize.trim();
    }

    // ── Handle shirtPrice change ────────────────────────────────────────
    if (changes.shirtPrice !== undefined) {
      const newPrice = Number(changes.shirtPrice);
      const oldPrice = attendee.shirtPrice ?? 0;
      const delta = newPrice - oldPrice;

      if (delta !== 0) {
        const campusData = event.sales_data.find(
          (s) => s.campus === adminCampus
        );
        if (campusData) {
          campusData.totalRevenue += delta;
        }
        event.totalRevenueAll = (event.totalRevenueAll ?? 0) + delta;

        // Handle unitsSold transitions
        if (oldPrice === 0 && newPrice > 0) {
          if (campusData) {
            campusData.unitsSold += 1;
          }
          event.totalUnitsSold = (event.totalUnitsSold ?? 0) + 1;
        } else if (oldPrice > 0 && newPrice === 0) {
          if (campusData) {
            campusData.unitsSold = Math.max(0, campusData.unitsSold - 1);
          }
          event.totalUnitsSold = Math.max(0, (event.totalUnitsSold ?? 0) - 1);
        }
      }

      attendee.shirtPrice = newPrice;
    }

    // ── Track editedBy ──────────────────────────────────────────────────
    if (!Array.isArray(attendee.editedBy)) {
      attendee.editedBy = [];
    }
    attendee.editedBy.push(claims.idNumber);

    // ── Save event ──────────────────────────────────────────────────────
    normalizeEventCampusFields(event);
    await event.save({ session });

    // ── Update student document ─────────────────────────────────────────
    if (Object.keys(studentUpdateFields).length > 0) {
      const studentIdForLookup =
        studentUpdateFields.id_number !== undefined
          ? currentIdNumber
          : attendee.id_number;

      await Student.updateOne(
        { id_number: studentIdForLookup },
        { $set: studentUpdateFields },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    await logAdminAction(
      req,
      logs_action.UPDATE_ATTENDEE,
      `${attendee.name} (${attendee.id_number})`,
      eventId
    );

    return res.status(200).json({
      message: "Attendee updated successfully",
      data: {
        attendee: {
          id_number: attendee.id_number,
          name: attendee.name,
          campus: attendee.campus,
          course: attendee.course,
          year: attendee.year,
          shirtSize: attendee.shirtSize,
          shirtPrice: attendee.shirtPrice,
        },
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    console.error("Error in editAttendeeV2Controller:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return res.status(409).json({
        error: "DUPLICATE_ENTRY",
        message: "Student ID already exists",
      });
    }

    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

// ── Remove Attendee V2 ───────────────────────────────────────────────────────

/**
 * DELETE /api/v2/events/:eventId/attendees/:idNumber
 *
 * Permanently removes an attendee from an event. Restricted to admins with
 * STANDARD, EXECUTIVE, ADMIN, or DEVELOPER access (see adminAccessAuthenticateV2
 * on the route).
 */
export const removeAttendeeV2Controller = async (
  req: Request,
  res: Response
) => {
  const session = await mongoose.startSession();

  try {
    // ── Auth guard ──────────────────────────────────────────────────────
    const claims = req.userV2;
    if (!claims || claims.role !== "admin") {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "Admin access required",
      });
    }

    const adminCampus = claims.campus;

    // ── Find event and attendee ─────────────────────────────────────────
    const eventId = req.params.eventId as string;
    const idNumber = req.params.idNumber as string;
    const query = buildEventLookupQuery(eventId);
    if (!query) {
      return res.status(400).json({
        error: "INVALID_EVENT_ID",
        message: "Invalid event ID format",
      });
    }

    if (!idNumber?.trim()) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "Student ID is required",
      });
    }

    const event = await Event.findOne(query);
    if (!event) {
      return res
        .status(404)
        .json({ error: "EVENT_NOT_FOUND", message: "Event not found" });
    }

    const attendeeList = Array.isArray(event.attendees)
      ? (event.attendees as unknown as (IAttendee & { _id?: Types.ObjectId })[])
      : [];

    const attendeeIndex = attendeeList.findIndex(
      (a) => a.id_number === idNumber.trim()
    );

    if (attendeeIndex === -1) {
      return res.status(404).json({
        error: "ATTENDEE_NOT_FOUND",
        message: "Attendee not found in this event",
      });
    }

    const attendee = attendeeList[attendeeIndex];

    // UC_MAIN admins can remove any attendee; other campuses are scoped to
    // their own campus's attendees only (mirrors editAttendeeV2Controller /
    // getEventStatisticsV2Controller's campus scoping).
    if (attendee.campus !== adminCampus && adminCampus !== campus_type.MAIN) {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "You can only remove attendees from your own campus",
      });
    }

    const removedAttendeeSnapshot = {
      id_number: attendee.id_number,
      name: attendee.name,
      campus: attendee.campus,
      shirtPrice: attendee.shirtPrice ?? 0,
    };
    const attendeeObjectId = attendee._id;

    // ── Start transaction ───────────────────────────────────────────────
    session.startTransaction();

    // Undo sales figures this attendee contributed, if any.
    if (removedAttendeeSnapshot.shirtPrice > 0) {
      const campusData = event.sales_data.find(
        (s) => s.campus === removedAttendeeSnapshot.campus
      );
      if (campusData) {
        campusData.totalRevenue = Math.max(
          0,
          campusData.totalRevenue - removedAttendeeSnapshot.shirtPrice
        );
        campusData.unitsSold = Math.max(0, campusData.unitsSold - 1);
      }
      event.totalRevenueAll = Math.max(
        0,
        (event.totalRevenueAll ?? 0) - removedAttendeeSnapshot.shirtPrice
      );
      event.totalUnitsSold = Math.max(0, (event.totalUnitsSold ?? 0) - 1);
    }

    event.attendees.splice(attendeeIndex, 1);

    normalizeEventCampusFields(event);
    await event.save({ session });

    if (attendeeObjectId) {
      await deleteAttendanceForAttendee(
        event._id as Types.ObjectId,
        attendeeObjectId,
        session
      );
    }

    await session.commitTransaction();
    session.endSession();

    await logAdminAction(
      req,
      logs_action.REMOVE_ATTENDEE,
      `${removedAttendeeSnapshot.name} (${removedAttendeeSnapshot.id_number})`,
      eventId
    );

    return res.status(200).json({
      message: "Attendee removed successfully",
      data: removedAttendeeSnapshot,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    console.error("Error in removeAttendeeV2Controller:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

// ── Change Attendee Password V2 ─────────────────────────────────────────────

interface ChangeAttendeePasswordV2Body {
  adminPassword?: string;
  newPassword?: string;
}

export const changeAttendeePasswordV2Controller = async (
  req: Request,
  res: Response
) => {
  const session = await mongoose.startSession();

  try {
    // ── Auth guard ──────────────────────────────────────────────────────
    const claims = req.userV2;
    if (!claims || claims.role !== "admin") {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: "Admin access required",
      });
    }

    const adminCampus = claims.campus;
    if (V_DISABLED_ADD_ATTENDEE_CAMPUSES.includes(adminCampus)) {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message: `Changing passwords is not allowed for ${adminCampus}`,
      });
    }

    if (!V_VALID_CAMPUSES.includes(adminCampus)) {
      return res.status(400).json({
        error: "INVALID_CAMPUS",
        message: "Admin campus is invalid",
      });
    }

    const { adminPassword, newPassword } =
      req.body as ChangeAttendeePasswordV2Body;

    // ── Validate admin password ─────────────────────────────────────────
    if (!adminPassword) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "Admin password is required",
      });
    }

    const admin = await Admin.findById(claims.sub).select("password");
    if (!admin) {
      return res.status(404).json({
        error: "ADMIN_NOT_FOUND",
        message: "Admin account not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(adminPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "INVALID_PASSWORD",
        message: "Incorrect admin password",
      });
    }

    // ── Validate new password ───────────────────────────────────────────
    if (!newPassword) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "New password is required",
      });
    }

    const pwdErr = validatePasswordStrength(newPassword);
    if (pwdErr) {
      return res.status(400).json({ error: "VALIDATION", message: pwdErr });
    }

    const eventId = req.params.eventId as string;
    const idNumber = req.params.idNumber as string;
    const query = buildEventLookupQuery(eventId);
    if (!query) {
      return res.status(400).json({
        error: "INVALID_EVENT_ID",
        message: "Invalid event ID format",
      });
    }

    if (!idNumber?.trim()) {
      return res.status(400).json({
        error: "VALIDATION",
        message: "Student ID is required",
      });
    }

    const event = await Event.findOne(query).select("attendees");
    if (!event) {
      return res
        .status(404)
        .json({ error: "EVENT_NOT_FOUND", message: "Event not found" });
    }

    const attendeeList = Array.isArray(event.attendees)
      ? (event.attendees as unknown as IAttendee[])
      : [];

    const attendee = attendeeList.find((a) => a.id_number === idNumber.trim());

    if (!attendee) {
      return res.status(404).json({
        error: "ATTENDEE_NOT_FOUND",
        message: "Attendee not found in this event",
      });
    }

    if (attendee.campus !== adminCampus) {
      return res.status(403).json({
        error: "INSUFFICIENT_PERMISSIONS",
        message:
          "You can only change passwords for attendees from your own campus",
      });
    }

    // ── Update password ─────────────────────────────────────────────────
    session.startTransaction();

    const student = await Student.findOne({
      id_number: attendee.id_number,
    }).session(session);

    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        error: "STUDENT_NOT_FOUND",
        message: "Student account not found",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;
    await student.save({ session });

    // Track editedBy
    if (!Array.isArray(attendee.editedBy)) {
      attendee.editedBy = [];
    }
    attendee.editedBy.push(claims.idNumber);
    normalizeEventCampusFields(event);
    await event.save({ session });

    await session.commitTransaction();
    session.endSession();

    await logAdminAction(
      req,
      logs_action.CHANGE_PASSWORD,
      `${attendee.name ?? idNumber} (${attendee.id_number})`,
      eventId
    );

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    console.error("Error in changeAttendeePasswordV2Controller:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

// ── V2 Event Creation ────────────────────────────────────────────────────────

interface CreateEventV2Body {
  eventName?: string;
  eventDescription?: string;
  eventDate?: string;
  eventEndDate?: string;
  attendanceType?: string;
  status?: string;
  sessionConfig?: unknown;
  limit?: unknown;
  eventVenue?: string;
  eventTheme?: string;
  eventVenueSpecific?: string;
  eventStartTime?: string;
  eventEndTime?: string;
}

const MANILA_TIME_ZONE = "Asia/Manila";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MANILA_UTC_OFFSET = "+08:00";
const TIME_ONLY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SESSION_ORDER = ["morning", "afternoon", "evening"] as const;

const formatManilaDateKey = (date: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const parseManilaMidnightDate = (value: string): Date | null => {
  if (!DATE_ONLY_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatManilaDateKey(parsed) === value ? parsed : null;
};

const parseEventCalendarDate = (value: string): Date | null => {
  const normalized = value.trim();
  if (!normalized) return null;

  if (DATE_ONLY_PATTERN.test(normalized)) {
    return parseManilaMidnightDate(normalized);
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;

  return parseManilaMidnightDate(formatManilaDateKey(parsed));
};

const normalizeTimeValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return TIME_ONLY_PATTERN.test(trimmed) ? trimmed : null;
};

const getFirstSessionStartTime = (sessionConfig: unknown): string | null => {
  if (!sessionConfig || typeof sessionConfig !== "object") return null;

  const sessions = sessionConfig as Record<string, unknown>;
  for (const sessionKey of SESSION_ORDER) {
    const session = sessions[sessionKey];
    if (!session || typeof session !== "object") continue;

    const data = session as { enabled?: unknown; timeRange?: unknown };
    if (data.enabled !== true || typeof data.timeRange !== "string") continue;

    const [start] = data.timeRange.split(" - ");
    const normalizedStart = normalizeTimeValue(start);
    if (normalizedStart) return normalizedStart;
  }

  return null;
};

const getLastSessionEndTime = (sessionConfig: unknown): string | null => {
  if (!sessionConfig || typeof sessionConfig !== "object") return null;

  const sessions = sessionConfig as Record<string, unknown>;
  for (const sessionKey of [...SESSION_ORDER].reverse()) {
    const session = sessions[sessionKey];
    if (!session || typeof session !== "object") continue;

    const data = session as { enabled?: unknown; timeRange?: unknown };
    if (data.enabled !== true || typeof data.timeRange !== "string") continue;

    const [, end] = data.timeRange.split(" - ");
    const normalizedEnd = normalizeTimeValue(end);
    if (normalizedEnd) return normalizedEnd;
  }

  return null;
};

const buildManilaDateTime = (
  dateValue: Date | null | undefined,
  timeValue: string | null,
  fallbackTime: string
): Date | null => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const dateKey = formatManilaDateKey(date);
  const time = timeValue ?? fallbackTime;
  const parsedDateTime = new Date(
    `${dateKey}T${time}:00${MANILA_UTC_OFFSET}`
  );

  return Number.isNaN(parsedDateTime.getTime()) ? null : parsedDateTime;
};

const hasEventStartedBySchedule = (
  eventDate: Date | null | undefined,
  eventStartTime: unknown,
  sessionConfig: unknown
) => {
  const startTime =
    getFirstSessionStartTime(sessionConfig) ??
    normalizeTimeValue(eventStartTime);
  const startsAt = buildManilaDateTime(eventDate, startTime, "00:00");

  return !startsAt || new Date() >= startsAt;
};

export const getEventImageController = async (req: Request, res: Response) => {
  try {
    const key = req.params[0];
    if (!key) {
      return res.status(400).json({ message: "Image key is required" });
    }

    if (!R2_BUCKET_NAME) {
      return res.status(500).json({ message: "Image storage not configured" });
    }

    const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
    const object = await r2Client.send(command);

    if (!object.Body) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.setHeader(
      "Content-Type",
      object.ContentType || "application/octet-stream"
    );
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const stream = object.Body as NodeJS.ReadableStream;
    stream.pipe(res);
  } catch (error: any) {
    if (error?.name === "NoSuchKey" || error?.Code === "NoSuchKey") {
      return res.status(404).json({ message: "Image not found" });
    }
    console.error("Error streaming event image:", error);
    return res.status(500).json({ message: "Failed to load image" });
  }
};

export const createEventV2Controller = async (req: Request, res: Response) => {
  const body = req.body as CreateEventV2Body;

  const eventName =
    typeof body.eventName === "string" ? body.eventName.trim() : "";
  const eventDate =
    typeof body.eventDate === "string" ? body.eventDate.trim() : "";

  if (!eventName) {
    return res.status(400).json({
      error: "VALIDATION",
      message: "Event name is required",
    });
  }

  if (eventName.length > 120) {
    return res.status(400).json({
      error: "VALIDATION",
      message: "Event name must be at most 120 characters",
    });
  }

  const parsedDate = parseManilaMidnightDate(eventDate);
  if (!parsedDate) {
    return res.status(400).json({
      error: "VALIDATION",
      message: "Event date must be a valid yyyy-MM-dd calendar date",
    });
  }

  const attendanceType =
    body.attendanceType === "ticketed" ? "ticketed" : "open";

  const status =
    body.status === "Upcoming" ||
    body.status === "Ended" ||
    body.status === "Cancelled"
      ? body.status
      : "Ongoing";

  const parsedSessionConfigResult = parseSessionConfigPayload(
    body.sessionConfig
  );
  if ("error" in parsedSessionConfigResult) {
    return res.status(400).json({
      error: "VALIDATION",
      message: parsedSessionConfigResult.error,
    });
  }

  const parsedLimitResult = parseCampusLimitsPayload(body.limit);
  if ("error" in parsedLimitResult) {
    return res.status(400).json({
      error: "VALIDATION",
      message: parsedLimitResult.error,
    });
  }

  try {
    const imageUrl =
      (req.files as Express.MulterS3.File[] | undefined)?.map((file) =>
        buildProxyImageUrl(req, file)
      ) ?? [];

    const createdBy =
      req.admin?.name ??
      (typeof req.userV2?.sub === "string" ? req.userV2.sub : "unknown-admin");

    const parsedEndDate = body.eventEndDate
      ? parseManilaMidnightDate(body.eventEndDate)
      : null;
    const derivedEventStartTime =
      getFirstSessionStartTime(parsedSessionConfigResult) ??
      normalizeTimeValue(body.eventStartTime) ??
      "";
    const derivedEventEndTime =
      getLastSessionEndTime(parsedSessionConfigResult) ??
      normalizeTimeValue(body.eventEndTime) ??
      "";

    const eventFields: Record<string, unknown> = {
      eventId: new mongoose.Types.ObjectId(),
      eventName,
      eventImage: imageUrl,
      eventDate: parsedDate,
      eventDescription:
        typeof body.eventDescription === "string" ? body.eventDescription : "",
      attendanceType,
      status,
      sessionConfig: parsedSessionConfigResult,
      createdBy,
      attendees: [],
      eventVenue:
        typeof body.eventVenue === "string" ? body.eventVenue.trim() : "",
      eventTheme:
        typeof body.eventTheme === "string" ? body.eventTheme.trim() : "",
      eventVenueSpecific:
        typeof body.eventVenueSpecific === "string"
          ? body.eventVenueSpecific.trim()
          : "",
      eventStartTime: derivedEventStartTime,
      eventEndTime: derivedEventEndTime,
    };

    if (parsedEndDate) {
      eventFields.eventEndDate = parsedEndDate;
    }

    if (parsedLimitResult.length > 0) {
      eventFields.limit = parsedLimitResult;
    }

    const newEvent = new Event(eventFields);

    await newEvent.save();

    await logAdminAction(
      req,
      logs_action.CREATE_EVENT,
      eventName,
      String(newEvent._id)
    );

    return res.status(201).json({
      message: "Event created successfully",
      data: newEvent.toObject(),
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to create event",
    });
  }
};

export const getAllEventsRawController = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const events = await EventV2Service.getAllEventsRaw();
    return res.status(200).json({
      data: events,
      message: "Fetched raw events successfully",
    });
  } catch (error) {
    console.error("Error in getAllEventsRawController:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

export const updateEventV2Controller = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const eventId = req.params.eventId as string;
    const claims = (req as any).userV2;

    if (claims.role !== "admin" || claims.campus !== campus_type.MAIN) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Only UC_MAIN admins can edit events",
      });
    }

    const {
      eventName,
      eventDescription,
      eventDate,
      eventEndDate,
      eventVenue,
      eventTheme,
      eventVenueSpecific,
      eventStartTime,
      eventEndTime,
      limit,
      sessionConfig,
    } = req.body;
    // eventDate may arrive as a plain ISO string OR as a range-picker object
    // like { from, to } — only the start date maps to the eventDate field.
    let normalizedEventDate: Date | undefined;
    if (eventDate !== undefined) {
      const rawDateValue =
        eventDate && typeof eventDate === "object" && "from" in eventDate
          ? (eventDate as { from?: string }).from
          : eventDate;

      if (typeof rawDateValue !== "string" || !rawDateValue.trim()) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Event date must be a valid date string",
        });
      }

      const parsed = parseEventCalendarDate(rawDateValue);
      if (!parsed) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Invalid event date",
        });
      }
      normalizedEventDate = parsed;
    }

    // eventEndDate may arrive as a plain ISO string or as a range-picker
    // object like { from, to } — only the "to" value maps to eventEndDate.
    let normalizedEventEndDate: Date | undefined;
    if (eventEndDate !== undefined) {
      const rawEndDateValue =
        eventEndDate && typeof eventEndDate === "object" && "to" in eventEndDate
          ? (eventEndDate as { to?: string }).to
          : eventEndDate;

      if (typeof rawEndDateValue !== "string" || !rawEndDateValue.trim()) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Event end date must be a valid date string",
        });
      }

      const parsedEnd = parseEventCalendarDate(rawEndDateValue);
      if (!parsedEnd) {
        return res.status(400).json({
          error: "VALIDATION",
          message: "Invalid event end date",
        });
      }
      normalizedEventEndDate = parsedEnd;
    }

    const updateFields: Record<string, unknown> = {
      eventName,
      eventDescription,
      ...(normalizedEventDate !== undefined && {
        eventDate: normalizedEventDate,
      }),
      ...(normalizedEventEndDate !== undefined && {
        eventEndDate: normalizedEventEndDate,
      }),
      eventVenue,
      eventTheme,
      eventVenueSpecific,
      eventStartTime,
      eventEndTime,
    };

    const uploadedFiles = req.files as Express.MulterS3.File[] | undefined;
    if (uploadedFiles && uploadedFiles.length > 0) {
      updateFields.eventImage = uploadedFiles.map((file) =>
        buildProxyImageUrl(req, file)
      );
    }

    if (sessionConfig !== undefined) {
      const parsedSessionConfigResult =
        parseSessionConfigPayload(sessionConfig);
      if ("error" in parsedSessionConfigResult) {
        return res.status(400).json({
          error: "VALIDATION",
          message: parsedSessionConfigResult.error,
        });
      }
      updateFields.sessionConfig = parsedSessionConfigResult;
      updateFields.eventStartTime =
        getFirstSessionStartTime(parsedSessionConfigResult) ??
        normalizeTimeValue(eventStartTime) ??
        "";
      updateFields.eventEndTime =
        getLastSessionEndTime(parsedSessionConfigResult) ??
        normalizeTimeValue(eventEndTime) ??
        "";
    }

    if (limit !== undefined) {
      const parsedLimitResult = parseCampusLimitsPayload(limit);
      if ("error" in parsedLimitResult) {
        return res.status(400).json({
          error: "VALIDATION",
          message: parsedLimitResult.error,
        });
      }
      updateFields.limit = parsedLimitResult;
    }

    if (limit !== undefined) {
      const parsedLimitResult = parseCampusLimitsPayload(limit);
      if ("error" in parsedLimitResult) {
        return res.status(400).json({
          error: "VALIDATION",
          message: parsedLimitResult.error,
        });
      }
      updateFields.limit = parsedLimitResult;
    }

    const updatedEvent = await EventV2Service.updateEvent(
      eventId,
      updateFields
    );

    if (!updatedEvent) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Event not found",
      });
    }

    await logAdminAction(
      req,
      logs_action.UPDATE_EVENT,
      updatedEvent.eventName ?? eventId,
      eventId
    );

    return res.status(200).json({
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (error: any) {
    console.error("Error in updateEventV2Controller:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: error.message,
    });
  }
};
