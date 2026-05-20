import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_COLORS,
} from "@/constants/attendance.constants";

interface SessionData {
  key: string;
  label: string;
  attended: boolean;
  timeRange: string;
  hasRecord: boolean;
}

interface SessionStatusListProps {
  sessions: SessionData[];
  variant?: "past" | "upcoming";
  filterRecorded?: boolean;
}

export const SessionStatusList = React.memo<SessionStatusListProps>(
  ({ sessions, variant = "upcoming", filterRecorded = false }) => {
    const displaySessions = filterRecorded
      ? sessions.filter((s) => s.hasRecord)
      : sessions;

    if (displaySessions.length === 0) return null;

    return (
      <div
        className={
          variant === "past"
            ? "divide-y divide-gray-200"
            : "divide-y divide-gray-200 rounded-lg border border-gray-200 bg-gray-50 px-3"
        }
      >
        {displaySessions.map((session) => {
          const isPast = variant === "past";
          const statusColor = session.attended
            ? ATTENDANCE_COLORS.present.badge
            : isPast
              ? ATTENDANCE_COLORS.absent.badge
              : ATTENDANCE_COLORS.pending.badge;

          return (
            <div
              key={session.key}
              className={`flex items-center justify-between ${
                variant === "past"
                  ? "py-1.5 first:pt-1 last:pb-1"
                  : "py-2 first:pt-2 last:pb-2"
              }`}
            >
              <span className="truncate pr-2 text-xs font-medium text-gray-600">
                {session.label}
                {session.timeRange && (
                  <span className="ml-1 text-[10px] font-normal text-gray-400">
                    {session.timeRange}
                  </span>
                )}
              </span>
              <Badge
                variant="outline"
                className={`flex-shrink-0 border-0 text-[11px] font-semibold ${statusColor}`}
              >
                {session.attended ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {ATTENDANCE_STATUS.PRESENT}
                  </>
                ) : isPast ? (
                  <>
                    <XCircle className="mr-1 h-3 w-3" />
                    {ATTENDANCE_STATUS.ABSENT}
                  </>
                ) : (
                  ATTENDANCE_STATUS.PENDING
                )}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  }
);

SessionStatusList.displayName = "SessionStatusList";
