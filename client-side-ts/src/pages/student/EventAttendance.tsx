import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/features/auth";
import type {
  AttendeeData,
  Event,
  EventData,
  SessionConfig,
} from "@/features/events";
import { getManilaStartOfDay } from "@/utils/date-manila";
import { EventCard, getMyEvents } from "@/features/events";
import React, { useEffect, useState, useCallback } from "react";
import { InfinitySpin } from "react-loader-spinner";

// ─── Mapper: Raw Event → Frontend EventData ───────────────────────────────────
// The event already has `attendees` pre-filtered to the requesting student
// (0 or 1 records) — handled server-side
const mapEventToEventData = (event: Event): EventData | null => {
  let imageUrl: string | undefined = undefined;
  if (Array.isArray(event.eventImage) && event.eventImage.length > 0) {
    imageUrl = event.eventImage[0];
  } else if (typeof event.eventImage === "string") {
    imageUrl = event.eventImage;
  }

  // attendees is already [myRecord] | [] from the API
  const parsedAttendees: AttendeeData[] = (event.attendees || []).map(
    (att) => ({
      id_number: att.id_number,
      name: att.name,
      isAttended: false, // sessions are the source of truth
      attendance: (att.attendance as AttendeeData["attendance"]) || {},
    })
  );

  const dateValue =
    typeof event.eventDate === "string"
      ? new Date(event.eventDate)
      : event.eventDate;
  if (!dateValue || Number.isNaN(dateValue.getTime())) return null;

  const rawEndDate = event.eventEndDate
    ? typeof event.eventEndDate === "string"
      ? new Date(event.eventEndDate)
      : event.eventEndDate
    : null;
  // Fallback to start date so same-day events always have a defined end boundary.
  const endDateValue =
    rawEndDate && !Number.isNaN(rawEndDate.getTime()) ? rawEndDate : dateValue;

  return {
    id: (event.eventId || event._id) as string,
    title: event.eventName,
    description: event.eventDescription || "No description available",
    imageUrl,
    location: "University of Cebu Main Campus",
    date: getManilaStartOfDay(dateValue),
    endDate: getManilaStartOfDay(endDateValue),
    status: event.status,
    startTime: event.eventStartTime,
    endTime: event.eventEndTime,
    attendanceType: event.attendanceType || "open",
    attendees: parsedAttendees,
    sessionConfig: event.sessionConfig as SessionConfig | undefined,
  };
};

const isUpcoming = (date: Date): boolean => date >= getManilaStartOfDay();

const isPast = (date: Date): boolean => date < getManilaStartOfDay();

const EventAttendance: React.FC = () => {
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<EventData[]>([]);
  const [pastEvents, setPastEvents] = useState<EventData[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(
    getManilaStartOfDay().getFullYear().toString()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!user?.idNumber) {
      setError("User information not available");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Single call — backend filters attendees to the requesting student via JWT.
      const transformedEvents: EventData[] = (await getMyEvents())
        .map(mapEventToEventData)
        .filter((event): event is EventData => event !== null);

      // Sort by date - most recent first
      transformedEvents.sort(
        (a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)
      );

      // Upcoming: today and any future dates, sorted newest first
      setUpcomingEvents(
        transformedEvents
          .filter((e) => e.date && isUpcoming(e.date))
          .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
      );
      setPastEvents(
        transformedEvents
          .filter((e) => e.date && isPast(e.date))
          .map((e) => ({ ...e, isPast: true }))
      );
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("An error occurred while fetching events");
    } finally {
      setIsLoading(false);
    }
  }, [user?.idNumber]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
  }, [fetchEvents]);

  // Derived state for filtering
  const filteredPastEvents = pastEvents.filter(
    (event) => event.date?.getFullYear().toString() === selectedYear
  );

  const availableYears = Array.from(
    new Set(
      pastEvents
        .filter((e) => e.date)
        .map((e) => e.date!.getFullYear().toString())
    )
  ).sort((a, b) => parseInt(b) - parseInt(a));

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <InfinitySpin width="200" color="#0d6efd" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <h2 className="mb-6 text-2xl font-semibold">Event Attendance</h2>

      {/* TODAY'S & UPCOMING EVENTS */}
      <section className="bg-muted mb-10 rounded-b-lg p-0 sm:p-8">
        <div className="mx-auto max-w-screen-xl px-0 sm:px-2">
          <Card className="rounded-2xl px-4 py-10 sm:p-10">
            <CardHeader>
              <CardTitle>Today's &amp; Upcoming Events</CardTitle>
              <CardDescription className="text-slate-600">
                See upcoming scheduled events and your attendance status.
              </CardDescription>
            </CardHeader>
            <div className="mt-4 space-y-6">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    studentId={user?.idNumber || ""}
                    onApplied={fetchEvents}
                  />
                ))
              ) : (
                <p className="text-muted-foreground py-10 text-center">
                  No upcoming events scheduled.
                </p>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* PAST EVENTS */}
      <section className="mx-auto max-w-screen-xl px-0">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">Past Events</h3>
            <p className="text-muted-foreground text-sm">
              Review previous events and your attendance records.
            </p>
          </div>
          {availableYears.length > 0 && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="mt-6 space-y-6">
          {filteredPastEvents.length > 0 ? (
            filteredPastEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                studentId={user?.idNumber || ""}
                onApplied={fetchEvents}
              />
            ))
          ) : (
            <p className="text-muted-foreground py-10 text-center italic">
              No past events found for {selectedYear}.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default EventAttendance;
