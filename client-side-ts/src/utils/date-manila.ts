import { isValid } from "date-fns";

const MANILA_TIMEZONE = "Asia/Manila";

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MANILA_TIMEZONE,
});

export const parseDateInputToManilaDate = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const iso = `${value}T00:00:00+08:00`;
  const parsed = new Date(iso);
  return isValid(parsed) ? parsed : null;
};

export const formatEventDateKey = (value: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIMEZONE,
  }).format(value);

export const formatEventDateLabel = (value: Date | string | null | undefined): string => {
  if (!value) return "TBA";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!date || Number.isNaN(date.getTime())) return "TBA";
  return formatter.format(date);
};

export const getManilaStartOfDay = (date = new Date()): Date => {
  if (!date || Number.isNaN(date.getTime())) return new Date(0);
  const [year, month, day] = formatEventDateKey(date)
    .split("-")
    .map(Number);
  return new Date(year, month - 1, day);
};

export const isSameManilaCalendarDate = (a: Date, b: Date): boolean =>
  formatEventDateKey(a) === formatEventDateKey(b);

// Product sale-window helpers

const toDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// A product without an end date never expires.
export const isProductExpired = (end_date?: string | Date | null): boolean => {
  const end = toDate(end_date);
  return end ? end.getTime() < Date.now() : false;
};

// A product without a start date is considered already started.
export const isProductNotStarted = (
  start_date?: string | Date | null
): boolean => {
  const start = toDate(start_date);
  return start ? start.getTime() > Date.now() : false;
};
