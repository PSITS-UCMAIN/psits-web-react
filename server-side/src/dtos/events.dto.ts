export const CAMPUS_OPTIONS = [
  "UC_MAIN",
  "UC_BANILAD",
  "UC_LM",
  "UC_PT",
  "UC_CS",
] as const;

export type CampusOption = (typeof CAMPUS_OPTIONS)[number];

const SESSIONS_ORDERED = ["morning", "afternoon", "evening"] as const;
type SessionName = (typeof SESSIONS_ORDERED)[number];

const TIME_RANGE_RE = /^([01]\d|2[0-3]):[0-5]\d - ([01]\d|2[0-3]):[0-5]\d$/;

export interface ParsedSessionConfigEntry {
  enabled: boolean;
  timeRange: string;
}

export interface ParsedSessionConfig {
  morning: ParsedSessionConfigEntry;
  afternoon: ParsedSessionConfigEntry;
  evening: ParsedSessionConfigEntry;
  oneSessionOnly: boolean;
}

const defaultParsedSessionConfig = (): ParsedSessionConfig => ({
  morning: { enabled: false, timeRange: "" },
  afternoon: { enabled: false, timeRange: "" },
  evening: { enabled: false, timeRange: "" },
  oneSessionOnly: false,
});

const parseSingleSessionEntry = (
  name: SessionName,
  raw: unknown,
): ParsedSessionConfigEntry | { error: string } => {
  if (typeof raw !== "object" || raw === null) {
    return {
      error: `sessionConfig.${name} must be an object`,
    };
  }

  const parsed = raw as Partial<ParsedSessionConfigEntry>;

  if (typeof parsed.enabled !== "boolean") {
    return {
      error: `sessionConfig.${name}.enabled must be a boolean`,
    };
  }

  if (typeof parsed.timeRange !== "string") {
    return {
      error: `sessionConfig.${name}.timeRange must be a string`,
    };
  }

  if (!parsed.enabled) {
    return { enabled: false, timeRange: "" };
  }

  if (!TIME_RANGE_RE.test(parsed.timeRange)) {
    return {
      error: `${name} session timeRange must be 'HH:mm - HH:mm' in 24-hour format`,
    };
  }

  const [startStr, endStr] = parsed.timeRange.split(" - ");
  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  if (endMinutes <= startMinutes) {
    return {
      error: `${name} session end time must be later than start time`,
    };
  }

  return {
    enabled: parsed.enabled,
    timeRange: parsed.timeRange,
  };
};

export const parseSessionConfigPayload = (
  raw: unknown,
): ParsedSessionConfig | { error: string } => {
  let parsed: unknown;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { error: "sessionConfig must be valid JSON" };
    }
  } else {
    parsed = raw;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { error: "sessionConfig must be an object" };
  }

  const candidate = parsed as Record<string, unknown>;
  const result = defaultParsedSessionConfig();

  for (const sessionName of SESSIONS_ORDERED) {
    const entry = parseSingleSessionEntry(sessionName, candidate[sessionName]);
    if ("error" in entry) {
      return { error: entry.error };
    }
    result[sessionName] = entry;
  }

  if (candidate.oneSessionOnly !== undefined) {
    if (typeof candidate.oneSessionOnly !== "boolean") {
      return { error: "sessionConfig.oneSessionOnly must be a boolean" };
    }
    result.oneSessionOnly = candidate.oneSessionOnly;
  }

  if (SESSIONS_ORDERED.every((name) => !result[name].enabled)) {
    return {
      error:
        "At least one session (morning, afternoon, or evening) must be enabled",
    };
  }

  if (SESSIONS_ORDERED.every((name) => !result[name].timeRange)) {
    return {
      error:
        "At least one enabled session must have a configured time range",
    };
  }

  const enabledSessions = SESSIONS_ORDERED.filter(
    (name) => result[name].enabled,
  );
  if (enabledSessions.length >= 2) {
    const ranges = enabledSessions.map((name) => {
      const [start] = result[name].timeRange.split(" - ").map(Number);
      return { name, start };
    });
    ranges.sort((a, b) => a.start - b.start);

    for (let i = 1; i < ranges.length; i++) {
      const previous = ranges[i - 1];
      const current = ranges[i];
      const [, previousEnd] = result[previous.name].timeRange
        .split(" - ")
        .map(Number);
      if (current.start <= previousEnd) {
        return {
          error: `Enabled sessions '${previous.name}' and '${current.name}' overlap`,
        };
      }
    }
  }

  return result;
};

export interface CampusLimit {
  campus: CampusOption;
  limit: number;
}

export const parseCampusLimitsPayload = (
  raw: unknown,
): CampusLimit[] | { error: string } => {
  if (raw === undefined || raw === null || raw === "") {
    return [];
  }

  let parsed: unknown;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { error: "limit must be valid JSON" };
    }
  } else {
    parsed = raw;
  }

  if (!Array.isArray(parsed)) {
    return { error: "limit must be an array" };
  }

  const limits: CampusLimit[] = [];
  for (let index = 0; index < parsed.length; index++) {
    const item = parsed[index];
    if (typeof item !== "object" || item === null) {
      return { error: `limit[${index}] must be an object` };
    }

    const candidate = item as Partial<CampusLimit>;
    if (
      typeof candidate.campus !== "string" ||
      !CAMPUS_OPTIONS.includes(candidate.campus as CampusOption)
    ) {
      return {
        error: `limit[${index}].campus must be one of: ${CAMPUS_OPTIONS.join(", ")}`,
      };
    }

    if (
      typeof candidate.limit !== "number" ||
      !Number.isInteger(candidate.limit) ||
      candidate.limit < 0
    ) {
      return {
        error: `limit[${index}].limit must be a non-negative integer`,
      };
    }

    limits.push({
      campus: candidate.campus as CampusOption,
      limit: candidate.limit,
    });
  }

  return limits;
};
