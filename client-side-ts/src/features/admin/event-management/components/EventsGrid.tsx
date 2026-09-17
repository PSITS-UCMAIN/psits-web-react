import React from "react";
import { MoreVertical, BarChart3, Ticket } from "lucide-react";
import { EventCard } from "./EventCard";
import type { Event as ApiEvent } from "@/features/events/types/event.types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EventsGridProps {
  events: ApiEvent[];
  viewMode?: "grid" | "list";
  onManageEvent?: (eventId: string) => void;
  onViewStatistics?: (eventId: string) => void;
  onViewRaffle?: (eventId: string) => void;
}

interface EventsGridSkeletonProps {
  viewMode?: "grid" | "list";
}

export const EventsGridSkeleton: React.FC<EventsGridSkeletonProps> = ({
  viewMode = "grid",
}) => {
  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-3 px-4 pb-8 sm:px-6 lg:px-8">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="border-border bg-background flex items-center gap-4 rounded-xl border px-4 py-3"
          >
            <Skeleton className="h-13 w-13 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-full rounded-full" />
              <Skeleton className="h-3 w-28 rounded-full" />
            </div>
            <Skeleton className="hidden h-9 w-32 rounded-full sm:block" />
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 pb-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            <div className="p-6">
              <Skeleton className="aspect-4/3 w-full rounded-lg" />
            </div>
            <div className="space-y-4 p-4 pt-0">
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 flex-1 rounded-2xl" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EventsGrid: React.FC<EventsGridProps> = ({
  events,
  viewMode = "grid",
  onManageEvent,
  onViewStatistics,
  onViewRaffle,
}) => {
  if (events.length === 0) {
    return (
      <div className="px-4 py-12 pb-8 text-center sm:px-6 lg:px-8">
        <p className="text-lg text-gray-500">No events found</p>
        <p className="mt-2 text-sm text-gray-400">
          Create your first event to get started
        </p>
      </div>
    );
  }

  const sortedEvents = [...events].sort(
    (a, b) =>
      new Date(b.eventDate ?? 0).getTime() -
      new Date(a.eventDate ?? 0).getTime()
  );

  const getEventId = (event: ApiEvent): string =>
    String(event.eventId ?? event._id ?? "unknown-id");

  const getEventTitle = (event: ApiEvent): string =>
    String(event.eventName ?? "Untitled Event");

  const getEventDate = (event: ApiEvent): string =>
    String(event.eventDate ?? "TBA");

  const getEventImage = (event: ApiEvent): string => {
    const firstImage = Array.isArray(event.eventImage)
      ? event.eventImage[0]
      : undefined;

    return firstImage ? String(firstImage) : "/default-placeholder.png";
  };

  /* ── LIST VIEW ── */
  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-3 px-4 pb-8 sm:px-6 lg:px-8">
        {sortedEvents.map((event) => {
          const eventId = getEventId(event);
          const eventTitle = getEventTitle(event);
          const eventDate = getEventDate(event);
          const eventImage = getEventImage(event);

          return (
            <div
              key={eventId}
              className="border-border bg-background hover:bg-muted/40 flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors"
            >
              {/* Thumbnail */}
              <div className="bg-muted h-13 w-13 shrink-0 overflow-hidden rounded-xl">
                <img
                  src={eventImage}
                  alt={eventTitle}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f1f5f9'/%3E%3Cg transform='translate(50,50)'%3E%3Crect x='-20' y='-16' width='40' height='32' rx='4' fill='%23cbd5e1'/%3E%3Ccircle cx='0' cy='-3' r='7' fill='%23f1f5f9'/%3E%3Cellipse cx='0' cy='13' rx='11' ry='7' fill='%23f1f5f9'/%3E%3C/g%3E%3C/svg%3E`;
                  }}
                />
              </div>

              {/* Title + Date */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{eventTitle}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {eventDate}
                </p>
              </div>

              {/* Manage Event button */}
              <Button
                onClick={() => onManageEvent?.(eventId)}
                className="hidden shrink-0 cursor-pointer rounded-full bg-[#1C9DDE] px-5 text-sm hover:bg-[#1C9DDE]/90 sm:flex"
              >
                Manage Event
              </Button>

              {/* Kebab menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 cursor-pointer"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* Show Manage on mobile via dropdown */}
                  <DropdownMenuItem
                    className="sm:hidden"
                    onClick={() => onManageEvent?.(eventId)}
                  >
                    Manage Event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewStatistics?.(eventId)}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Statistics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewRaffle?.(eventId)}>
                    <Ticket className="mr-2 h-4 w-4" />
                    Raffle
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── GRID VIEW ── */
  return (
    <div className="px-4 pb-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {sortedEvents.map((event) => (
          <EventCard
            key={getEventId(event)}
            event={event}
            onManageEvent={onManageEvent}
            onViewStatistics={onViewStatistics}
            onViewRaffle={onViewRaffle}
          />
        ))}
      </div>
    </div>
  );
};

export default EventsGrid;
