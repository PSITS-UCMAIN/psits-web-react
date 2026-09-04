import { Sunrise, Sun, Sunset } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/TimePicker";

import type { EventFormData } from "./AddEventModal";

interface SessionSetupTabProps {
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
}

interface SessionField {
  key: "morning" | "afternoon" | "evening";
  label: string;
  icon?: React.ReactNode;
}

const SESSION_FIELDS: SessionField[] = [
  {
    key: "morning",
    label: "Morning Session",
    icon: <Sunrise className="h-5 w-5 text-[#1C9DDE]" aria-hidden="true" />,
  },
  {
    key: "afternoon",
    label: "Afternoon Session",
    icon: <Sun className="h-5 w-5 text-[#1C9DDE]" aria-hidden="true" />,
  },
  {
    key: "evening",
    label: "Evening Session",
    icon: <Sunset className="h-5 w-5 text-[#1C9DDE]" aria-hidden="true" />,
  },
];

const SESSION_DEFAULTS: Record<
  SessionField["key"],
  { start: string; end: string }
> = {
  morning: { start: "07:30", end: "12:00" },
  afternoon: { start: "13:00", end: "17:00" },
  evening: { start: "18:00", end: "21:00" },
};

const formatDateLabel = (date?: Date): string => {
  if (!date || Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
};

export const SessionSetupTab: React.FC<SessionSetupTabProps> = ({
  formData,
  setFormData,
}) => {
  const selectedDateLabel = formatDateLabel(formData.eventSchedule?.from);

  const updateRange = (
    sessionKey: SessionField["key"],
    field: "startTime" | "endTime",
    value: string
  ) => {
    setFormData((prev) => {
      const current = prev.sessionConfig[sessionKey];
      const [start, end] = current.timeRange.split(" - ");
      const defaults = SESSION_DEFAULTS[sessionKey];

      const range =
        field === "startTime"
          ? `${value} - ${end?.trim() || defaults.end}`
          : `${start?.trim() || defaults.start} - ${value}`;

      return {
        ...prev,
        sessionConfig: {
          ...prev.sessionConfig,
          [sessionKey]: { ...current, timeRange: range },
        },
      };
    });
  };

  const toggleEnabled = (sessionKey: SessionField["key"], enabled: boolean) => {
    setFormData((prev) => {
      const current = prev.sessionConfig[sessionKey];
      const defaults = SESSION_DEFAULTS[sessionKey];
      const timeRange =
        enabled && !current.timeRange.trim()
          ? `${defaults.start} - ${defaults.end}`
          : current.timeRange;

      return {
        ...prev,
        sessionConfig: {
          ...prev.sessionConfig,
          [sessionKey]: { ...current, enabled, timeRange },
        },
      };
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Configure attendance windows for <strong>{selectedDateLabel}</strong>.
        At least one session must be enabled with a valid 24-hour time range.
      </p>

      {SESSION_FIELDS.map((session) => {
        const field = formData.sessionConfig[session.key];
        const [startTime = "", endTime = ""] = field.timeRange.split(" - ");

        return (
          <section
            key={session.key}
            className="rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                id={`session-${session.key}`}
                checked={field.enabled}
                onCheckedChange={(checked) =>
                  toggleEnabled(session.key, checked === true)
                }
                className="data-[state=checked]:bg-[#1C9DDE]"
              />
              {session.icon}
              <Label
                htmlFor={`session-${session.key}`}
                className="cursor-pointer"
              >
                {session.label}
              </Label>
            </div>

            {field.enabled && (
              <div className="mt-4 flex items-center gap-2">
                <TimePicker
                  id={`${session.key}-start`}
                  value={startTime}
                  placeholder="From"
                  onChange={(value) =>
                    updateRange(session.key, "startTime", value)
                  }
                />

                <span className="shrink-0 text-sm text-slate-500">to</span>

                <TimePicker
                  id={`${session.key}-end`}
                  value={endTime}
                  placeholder="To"
                  onChange={(value) =>
                    updateRange(session.key, "endTime", value)
                  }
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
