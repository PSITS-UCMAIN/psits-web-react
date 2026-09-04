import type { EventItem } from "@/data/sections-data";

const MANILA_TIMEZONE = "Asia/Manila";

export const isEventPast = (event: EventItem, now = new Date()): boolean =>
  now.getTime() > new Date(event.endDateTime).getTime();

export const formatEventDateRange = (event: EventItem): string => {
  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIMEZONE,
    month: "long",
    day: "numeric",
  }).format(start);

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dateLabel} - ${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
};

export const getManilaDateParts = (
  iso: string
): { year: number; month: string; day: string } => {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: get("month"),
    day: get("day"),
  };
};
