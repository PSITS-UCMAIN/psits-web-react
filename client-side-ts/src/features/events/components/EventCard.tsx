import defaultThumbnail from "@/assets/empty.webp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_COLORS,
} from "@/constants/attendance.constants";
import { QRCodeDisplay } from "@/features/events/components/QRCodeDisplay";
import { SessionStatusList } from "@/features/events/components/SessionStatusList";
import { applyToEvent } from "@/features/events";
import { useAuth } from "@/features/auth";
import type { EventData } from "@/features/events/types/event.types";
import { createQRPayload } from "@/features/events/utils/qrPayload.utils";
import { formatEventDateKey } from "@/utils/date-manila";
import { CalendarDays, CheckCircle2, MapPin, XCircle } from "lucide-react";
import React, { useMemo, useState } from "react";

interface EventCardProps {
  event: EventData;
  studentId: string;
  onApplied?: () => void;
}

const AttendancePill = React.memo<{ attended: boolean; label?: string }>(
  ({ attended, label }) => (
    <div className="flex items-center gap-1.5">
      {attended ? (
        <CheckCircle2
          className={`h-4 w-4 flex-shrink-0 ${ATTENDANCE_COLORS.present.icon}`}
        />
      ) : (
        <XCircle
          className={`h-4 w-4 flex-shrink-0 ${ATTENDANCE_COLORS.absent.icon}`}
        />
      )}
      {label && (
        <span className="text-xs font-medium text-gray-600">{label}</span>
      )}
      <Badge
        variant="outline"
        className={`border-0 text-xs font-semibold ${
          attended
            ? ATTENDANCE_COLORS.present.badge
            : ATTENDANCE_COLORS.absent.badge
        }`}
      >
        {attended ? ATTENDANCE_STATUS.PRESENT : ATTENDANCE_STATUS.ABSENT}
      </Badge>
    </div>
  )
);

const MANILA_UTC_OFFSET = "+08:00";
const TIME_ONLY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SESSION_ORDER = ["morning", "afternoon", "evening"] as const;

const normalizeTimeValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return TIME_ONLY_PATTERN.test(trimmed) ? trimmed : null;
};

const getFirstSessionStartTime = (
  sessionConfig: EventData["sessionConfig"]
): string | null => {
  if (!sessionConfig) return null;

  for (const sessionKey of SESSION_ORDER) {
    const session = sessionConfig[sessionKey];
    if (!session?.enabled) continue;

    const [start] = String(session.timeRange ?? "").split(" - ");
    const normalizedStart = normalizeTimeValue(start);
    if (normalizedStart) return normalizedStart;
  }

  return null;
};

const buildManilaDateTime = (
  dateValue: Date | undefined,
  timeValue: string | null,
  fallbackTime: string
): Date | null => {
  if (!dateValue || Number.isNaN(dateValue.getTime())) return null;

  const dateKey = formatEventDateKey(dateValue);
  const time = timeValue ?? fallbackTime;
  const parsedDateTime = new Date(
    `${dateKey}T${time}:00${MANILA_UTC_OFFSET}`
  );

  return Number.isNaN(parsedDateTime.getTime()) ? null : parsedDateTime;
};

export const EventCard: React.FC<EventCardProps> = ({
  event,
  studentId,
  onApplied,
}) => {
  const {
    title,
    description,
    imageUrl,
    location,
    attendees,
    sessionConfig,
    isPast,
  } = event;
  const normalizedStatus = String(event.status ?? "").toLowerCase();
  const eventStartsAt = buildManilaDateTime(
    event.date,
    normalizeTimeValue(event.startTime) ??
      getFirstSessionStartTime(sessionConfig),
    "00:00"
  );
  /**
   * End boundary: use the event's end date (or fall back to start date for
   * same-day events) at 23:59 Manila time — identical to the admin-side
   * normalizeStatus logic. This ensures that on the event day itself the
   * window is still considered open, and "Registration closed" only appears
   * once the end date's calendar day has fully passed.
   */
  const eventEndsAt = buildManilaDateTime(
    event.endDate ?? event.date,
    normalizeTimeValue(event.endTime),
    "23:59"
  );
  const now = new Date();
  const isWithinEventWindow =
    (!eventStartsAt || now >= eventStartsAt) &&
    (!eventEndsAt || now <= eventEndsAt);
  const isRegistrationManuallyClosed =
    normalizedStatus === "ended" || normalizedStatus === "cancelled";
  const isStudentRegistrationOpen =
    !isRegistrationManuallyClosed && isWithinEventWindow;

  const { user } = useAuth();

  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string>("");
  const [isRegister, setIsRegister] = useState(false);

  const handleApply = async () => {
    setIsRegister(true);
    const result = await applyToEvent(event.id);
    setIsRegister(false);
    if (result) {
      onApplied?.();
    }
  };
  const imgSrc = useMemo(() => {
    if (!imageUrl) return defaultThumbnail;
    return failedImageUrl === imageUrl ? defaultThumbnail : imageUrl;
  }, [imageUrl, failedImageUrl]);

  const imgLoading = loadedSrc !== imgSrc;

  // ── Student attendee lookup ────────────────────────────────────────────────
  const studentAttendee = useMemo(() => {
    if (!attendees) return undefined;
    return attendees.find((att) => String(att.id_number) === String(studentId));
  }, [attendees, studentId]);

  // ── Attendance helpers ─────────────────────────────────────────────────────
  const hasAnyAttendance = useMemo(() => {
    if (!studentAttendee) return false;
    if (sessionConfig) {
      return Object.entries(sessionConfig).some(([sessionKey, config]) => {
        const cfg = config as { enabled?: boolean };
        return (
          cfg.enabled &&
          studentAttendee.attendance?.[sessionKey]?.attended === true
        );
      });
    }
    return studentAttendee.isAttended === true;
  }, [studentAttendee, sessionConfig]);

  const formatDate = (eventDate?: Date | string): string => {
    if (!eventDate) return "Date TBA";
    const date =
      typeof eventDate === "string" ? new Date(eventDate) : eventDate;
    if (!date || Number.isNaN(date.getTime())) return "Date TBA";
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    }).format(date);
  };

  const sessions = useMemo(() => {
    if (!sessionConfig) return null;
    const activeSessions = Object.entries(sessionConfig)
      .filter(([_, config]) => (config as { enabled?: boolean }).enabled)
      .map(([key, config]) => {
        const attended = studentAttendee?.attendance?.[key]?.attended === true;
        const timeRange = (config as { timeRange?: string }).timeRange ?? "";
        return {
          key,
          label:
            key.charAt(0).toUpperCase() +
            key
              .slice(1)
              .replace(/([A-Z])/g, " $1")
              .trim(),
          attended,
          timeRange,
          hasRecord: studentAttendee?.attendance?.[key] !== undefined,
        };
      });
    return activeSessions.length > 0 ? activeSessions : null;
  }, [sessionConfig, studentAttendee]);

  const hasAnySessions = useMemo(
    () => sessions?.some((s) => s.hasRecord) ?? false,
    [sessions]
  );

  // ── QR code value ────────────────────────────────────────────────────────
  const qrValue = useMemo(() => {
    return JSON.stringify(
      createQRPayload(
        event.id,
        studentId,
        studentAttendee?.name ?? user?.name ?? "",
        user?.campus ?? "",
        user?.course ?? "",
        Number(user?.year) || 1
      )
    );
  }, [
    event.id,
    studentId,
    studentAttendee?.name,
    user?.name,
    user?.campus,
    user?.course,
    user?.year,
  ]);

  // ── QR visibility gate ──────────────────────────────────────────────────
  // Students must register first; only attendees already attached to this
  // event can show a QR that admin attendance can accept.
  const canShowQR = useMemo(() => {
    return Boolean(studentAttendee);
  }, [studentAttendee]);

  return (
    <Card className="h-full rounded-2xl transition-all hover:shadow-md">
      <CardContent className="flex flex-col items-start gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        {/* ── Thumbnail ──────────────────────────────────────────────────── */}
        <div className="relative h-48 w-full flex-shrink-0 overflow-hidden rounded-xl bg-gray-200 sm:h-40 sm:w-48 md:h-56 md:w-72">
          {imgLoading && (
            <div className="absolute inset-0 animate-pulse bg-gray-100" />
          )}
          <img
            src={imgSrc}
            alt={title}
            className={`h-full w-full object-cover transition-opacity ${imgLoading ? "opacity-0" : "opacity-100"}`}
            onError={() => {
              if (imageUrl) {
                setFailedImageUrl(imageUrl);
              }
            }}
            onLoad={() => setLoadedSrc(imgSrc)}
          />
          {isPast && (
            <div className="absolute inset-0 flex items-end bg-black/30 p-2">
              <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                Past Event
              </span>
            </div>
          )}
        </div>

        {/* ── Event Info ─────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-tight font-semibold sm:text-xl md:text-2xl">
            {title}
          </h3>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-sky-500" />
              <span className="text-xs text-slate-700">
                {location || "University of Cebu Main Campus"}
              </span>
            </div>
            {event.date && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 text-sky-500" />
                <span className="text-xs text-slate-600">
                  {formatDate(event.date)}
                </span>
              </div>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-slate-500 sm:mt-3 sm:text-sm">
            {description}
          </p>
        </div>

        {/* ══ PAST — Inline Attendance Summary ══════════════════════════════ */}
        {isPast ? (
          <div className="mt-2 w-full flex-shrink-0 sm:mt-0 sm:w-56">
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-center text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                Attendance Summary
              </p>
              {!studentAttendee || (sessions && !hasAnySessions) ? (
                <div className="flex items-center justify-center gap-1.5 py-1">
                  <XCircle className="h-4 w-4 text-gray-400" />
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${ATTENDANCE_COLORS.absent.badge}`}
                  >
                    {ATTENDANCE_STATUS.ABSENT}
                  </span>
                </div>
              ) : sessions && sessions.length > 0 ? (
                <SessionStatusList
                  sessions={sessions}
                  variant="past"
                  filterRecorded
                />
              ) : (
                <div className="flex justify-center py-1">
                  <AttendancePill attended={hasAnyAttendance} />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ══ TODAY / UPCOMING — QR Dialog ════════════════════════════════ */
          <div className="mt-4 w-full flex-shrink-0 sm:mt-0 sm:w-auto">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full cursor-pointer bg-sky-600 hover:bg-sky-700 sm:w-auto"
                >
                  Attendance QR
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl p-4 sm:max-w-4xl sm:p-6">
                <div className="grid grid-cols-1 place-items-center gap-4 sm:gap-8 md:grid-cols-2">
                  {/* Left: Image */}
                  <div className="flex w-full items-center justify-center overflow-hidden rounded-xl pt-4">
                    <img
                      src={imgSrc}
                      alt={title}
                      className="h-40 w-full rounded-xl object-cover sm:h-64 md:h-80"
                    />
                  </div>

                  {/* Right: QR + Status */}
                  <div className="flex w-full flex-col items-center gap-4">
                    <DialogHeader className="w-full text-center">
                      <DialogTitle className="text-lg text-sky-600 sm:text-2xl">
                        {title}
                      </DialogTitle>
                      <DialogDescription>
                        {event.date && formatDate(event.date)}
                      </DialogDescription>
                    </DialogHeader>

                    {canShowQR ? (
                      <>
                        <QRCodeDisplay value={qrValue} size={160} />

                        {/* Per-session attendance status */}
                        {sessions && sessions.length > 0 && (
                          <div className="w-full space-y-2">
                            <p className="text-center text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                              Attendance Status
                            </p>
                            <SessionStatusList
                              sessions={sessions}
                              variant="upcoming"
                            />
                          </div>
                        )}
                      </>
                    ) : isStudentRegistrationOpen ? (
                      <div className="flex w-full flex-col items-center gap-3 px-4 py-6 text-center">
                        <h4 className="text-base font-semibold text-gray-800">
                          {title}
                        </h4>
                        <div className="max-h-32 w-full overflow-y-auto rounded-lg bg-gray-50 px-3 py-2">
                          <p className="text-xs leading-relaxed text-gray-500">
                            {description}
                          </p>
                        </div>
                        <Button
                          onClick={handleApply}
                          disabled={isRegister}
                          className="mt-1 bg-sky-600 hover:bg-sky-700"
                          size="sm"
                        >
                          {isRegister ? "Registering..." : "Register Event"}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex w-full flex-col items-center gap-3 px-4 py-6 text-center">
                        <h4 className="text-base font-semibold text-gray-800">
                          Registration closed
                        </h4>
                        <div className="max-h-32 w-full overflow-y-auto rounded-lg bg-gray-50 px-3 py-2">
                          <p className="text-xs leading-relaxed text-gray-500">
                            Please ask an admin to add you as a late attendee.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
