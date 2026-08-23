import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Calendar, MapPin, Pencil, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AttendeesTable } from "@/features/admin/event-management";
import {
  AttendeeSettingsModal,
  EditEventModal,
} from "@/features/admin/event-management/components/modals";
import {
  getEventById,
  updateEventDetails,
} from "@/features/events/api/eventService";
import type {
  CampusLimit,
  CanonicalSessionConfig,
  Event as ApiEvent,
  EventMerchMeta,
} from "@/features/events/types/event.types";
import { useAuth } from "@/features/auth";
import { useAdminPermissions } from "@/features/admin/hooks/useAdminPermissions";
import type { Campus } from "@/features/auth/types/auth.types";
import { showToast } from "@/utils/alertHelper";

interface EventDetails {
  id: string;
  title: string;
  status: "ongoing" | "ended" | "upcoming";
  startDate: string;
  rawStartDate?: string;
  startTime: string;
  endTime: string;
  endDate: string;
  rawEndDate?: string;
  location: string;
  description: string;
  image: string;
  campusCodes: Campus[];
  venues: string[];
  limits: Record<string, number>;
  merch: EventMerchMeta | null;
  attendanceType: "open" | "ticketed";
  eventTheme?: string;
  eventVenueSpecific?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  sessionConfig: CanonicalSessionConfig;
}

const CAMPUS_CODE_TO_NAME: Record<Campus, string> = {
  UC_MAIN: "University of Cebu Main Campus",
  UC_BANILAD: "University of Cebu Banilad Campus",
  UC_LM: "University of Cebu Lapu-Lapu & Mandaue",
  UC_PT: "University of Cebu Pardo & Talisay",
  UC_CS: "University of Cebu Main Campus",
};

const DEFAULT_CAMPUSES: Campus[] = ["UC_MAIN", "UC_BANILAD", "UC_LM", "UC_PT"];

const normalizeCampusForFilter = (campus: Campus): Campus =>
  campus === "UC_CS" ? "UC_MAIN" : campus;

interface SessionConfigType {
  enabled?: boolean;
  timeRange?: string;
}

interface EventSessionConfig {
  morning?: SessionConfigType;
  afternoon?: SessionConfigType;
  evening?: SessionConfigType;
  oneSessionOnly?: boolean;
}

type EventStatus = EventDetails["status"];

import { formatEventDateLabel, formatEventDateKey } from "@/utils/date-manila";

const MANILA_UTC_OFFSET = "+08:00";
const TIME_ONLY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeTimeValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return TIME_ONLY_PATTERN.test(trimmed) ? trimmed : null;
};

const buildManilaDateTime = (
  dateValue: string | Date | null | undefined,
  timeValue: string | null,
  fallbackTime: string
): Date | null => {
  if (!dateValue) return null;

  const parsedDate =
    typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) return null;

  const dateKey = formatEventDateKey(parsedDate);
  const time = timeValue ?? fallbackTime;
  const parsedDateTime = new Date(
    `${dateKey}T${time}:00${MANILA_UTC_OFFSET}`
  );

  return Number.isNaN(parsedDateTime.getTime()) ? null : parsedDateTime;
};

const normalizeStatus = (
  value: unknown,
  eventDate?: string | Date | null,
  eventEndDate?: string | Date | null,
  eventStartTime?: string,
  eventEndTime?: string
): EventStatus => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "ended" || normalized === "cancelled") return "ended";

  const startsAt = buildManilaDateTime(
    eventDate,
    normalizeTimeValue(eventStartTime),
    "00:00"
  );
  const endsAt = buildManilaDateTime(
    eventEndDate ?? eventDate,
    normalizeTimeValue(eventEndTime),
    "23:59"
  );

  if (startsAt && endsAt) {
    const now = new Date();
    if (now < startsAt) return "upcoming";
    if (now > endsAt) return "ended";
    return "ongoing";
  }

  if (normalized === "ongoing") return "ongoing";
  if (eventDate) {
    const parsedStartDate =
      typeof eventDate === "string" ? new Date(eventDate) : eventDate;
    const parsedEndDate = eventEndDate
      ? typeof eventEndDate === "string"
        ? new Date(eventEndDate)
        : eventEndDate
      : parsedStartDate;

    if (
      parsedStartDate &&
      !Number.isNaN(parsedStartDate.getTime()) &&
      parsedEndDate &&
      !Number.isNaN(parsedEndDate.getTime())
    ) {
      const todayKey = formatEventDateKey(new Date());
      const startKey = formatEventDateKey(parsedStartDate);
      const endKey = formatEventDateKey(parsedEndDate);
      if (todayKey >= startKey && todayKey <= endKey) {
        return "ongoing";
      }
      if (todayKey > endKey) {
        return "ended";
      }
    }
  }

  return "upcoming";
};

const getSessionBounds = (
  sessionConfig: EventSessionConfig | undefined
): { startTime: string; endTime: string } => {
  const order: Array<"morning" | "afternoon" | "evening"> = [
    "morning",
    "afternoon",
    "evening",
  ];

  const enabledRanges = order
    .map((key) => sessionConfig?.[key])
    .filter((session): session is SessionConfigType =>
      Boolean(session?.enabled && session?.timeRange)
    )
    .map((session) => String(session.timeRange));

  if (enabledRanges.length === 0) {
    return { startTime: "TBA", endTime: "TBA" };
  }

  const [firstStart = "TBA"] = enabledRanges[0].split(" - ");
  const lastRange = enabledRanges[enabledRanges.length - 1];
  const [, lastEnd = "TBA"] = lastRange.split(" - ");

  return { startTime: firstStart, endTime: lastEnd };
};

const normalizeSessionConfig = (
  sessionConfig: EventSessionConfig | undefined
): CanonicalSessionConfig => ({
  morning: {
    enabled: Boolean(sessionConfig?.morning?.enabled),
    timeRange: sessionConfig?.morning?.timeRange ?? "",
  },
  afternoon: {
    enabled: Boolean(sessionConfig?.afternoon?.enabled),
    timeRange: sessionConfig?.afternoon?.timeRange ?? "",
  },
  evening: {
    enabled: Boolean(sessionConfig?.evening?.enabled),
    timeRange: sessionConfig?.evening?.timeRange ?? "",
  },
  oneSessionOnly: Boolean(sessionConfig?.oneSessionOnly),
});

const normalizeMerchMeta = (value: unknown): EventMerchMeta | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as {
    category?: unknown;
    type?: unknown;
    selectedSizes?: unknown;
    selectedVariations?: unknown;
  };

  const selectedSizesSource =
    raw.selectedSizes && typeof raw.selectedSizes === "object"
      ? raw.selectedSizes
      : {};

  const selectedSizesEntries = Object.entries(selectedSizesSource) as Array<
    [string, { custom?: unknown; price?: unknown }]
  >;

  const selectedSizes: EventMerchMeta["selectedSizes"] = {};

  for (const [size, option] of selectedSizesEntries) {
    if (!option || typeof option !== "object") {
      continue;
    }

    selectedSizes[size] = {
      custom: Boolean(option.custom),
      price: String(option.price ?? "0"),
    };
  }

  return {
    category: typeof raw.category === "string" ? raw.category : null,
    type: typeof raw.type === "string" ? raw.type : null,
    selectedSizes,
    selectedVariations: Array.isArray(raw.selectedVariations)
      ? raw.selectedVariations.map((item) => String(item))
      : [],
  };
};

const formatFullMonthDate = (value?: string): string => {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const formatTimeToAMPM = (timeStr?: string): string => {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return timeStr || "TBA";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${formattedHour}:${minStr} ${ampm}`;
};

const mapApiEventToEventDetails = (
  routeEventId: string,
  event: ApiEvent
): EventDetails => {
  const sessionConfig = event.sessionConfig as EventSessionConfig | undefined;
  const { startTime, endTime } = getSessionBounds(sessionConfig);
  const effectiveStartTime =
    normalizeTimeValue(event.eventStartTime) ?? startTime;
  const effectiveEndTime = normalizeTimeValue(event.eventEndTime) ?? endTime;
  const mappedCampusCodes = Array.isArray(event.limit)
    ? event.limit
        .map((item) => {
          const campusCode =
            item && typeof item === "object" && "campus" in item
              ? String((item as { campus?: unknown }).campus ?? "")
              : "";
          if (campusCode in CAMPUS_CODE_TO_NAME) {
            return normalizeCampusForFilter(campusCode as Campus);
          }
          return null;
        })
        .filter((campus): campus is Campus => Boolean(campus))
    : [];

  const image =
    Array.isArray(event.eventImage) && event.eventImage.length > 0
      ? String(event.eventImage[0])
      : "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&h=600&fit=crop";

  const normalizedCampusCodes = Array.from(
    new Set<Campus>([
      "UC_MAIN",
      ...(mappedCampusCodes.length > 0 ? mappedCampusCodes : DEFAULT_CAMPUSES),
    ])
  );

  const limits: Record<string, number> = {};
  for (const code of normalizedCampusCodes) {
    const entry = Array.isArray(event.limit)
      ? event.limit.find(
          (item) =>
            item &&
            typeof item === "object" &&
            "campus" in item &&
            String((item as { campus?: unknown }).campus) === code
        )
      : undefined;
    const limitValue =
      entry &&
      typeof entry === "object" &&
      "limit" in entry &&
      typeof (entry as { limit?: unknown }).limit === "number"
        ? (entry as { limit: number }).limit
        : 0;
    limits[CAMPUS_CODE_TO_NAME[code]] = limitValue;
  }

  return {
    id: String(event.eventId ?? routeEventId),
    title: String(event.eventName ?? "Untitled Event"),
    status: normalizeStatus(
      event.status,
      event.eventDate,
      event.eventEndDate ?? event.eventDate,
      effectiveStartTime,
      effectiveEndTime
    ),
    startDate: formatEventDateLabel(event.eventDate),
    rawStartDate: event.eventDate ? String(event.eventDate) : undefined,
    startTime,
    endDate: formatEventDateLabel(event.eventEndDate ?? event.eventDate),
    rawEndDate: event.eventEndDate
      ? String(event.eventEndDate)
      : event.eventDate
        ? String(event.eventDate)
        : undefined,
    endTime,
    location:
      (typeof event.eventVenue === "string" && event.eventVenue) ||
      "Location not specified",
    description:
      (typeof event.eventDescription === "string" && event.eventDescription) ||
      "No description available.",
    image,
    campusCodes: normalizedCampusCodes,
    venues: normalizedCampusCodes.map((code) => CAMPUS_CODE_TO_NAME[code]),
    limits,
    merch: normalizeMerchMeta(event.merch),
    attendanceType:
      event.attendanceType === "open" || event.attendanceType === "ticketed"
        ? event.attendanceType
        : "ticketed",
    eventTheme: event.eventTheme as string | undefined,
    eventVenueSpecific: event.eventVenueSpecific as string | undefined,
    eventStartTime: event.eventStartTime as string | undefined,
    eventEndTime: event.eventEndTime as string | undefined,
    sessionConfig: normalizeSessionConfig(sessionConfig),
  };
};

const EventManagement: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const normalizedRouteEventId = eventId?.trim() ?? "";
  const hasValidRouteEventId = normalizedRouteEventId.length > 0;
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] =
    useState<boolean>(hasValidRouteEventId);
  const [loadError, setLoadError] = useState<string | null>(
    hasValidRouteEventId ? null : "Missing event ID from route."
  );
  const [activeCampus, setActiveCampus] = useState<Campus | "all">("all");
  const [isAttendeeSettingsOpen, setIsAttendeeSettingsOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const isAdmin = user?.role === "admin";
  const isUcMainAdmin = isAdmin && user?.campus === "UC_MAIN";
  const { canManageEvents } = useAdminPermissions();

  const availableCampusCodes = useMemo(() => {
    const eventCampusCodes = eventDetails?.campusCodes ?? DEFAULT_CAMPUSES;

    if (!isAdmin || isUcMainAdmin) {
      return eventCampusCodes;
    }

    const userCampus = user?.campus;
    if (!userCampus) {
      return [eventCampusCodes[0]];
    }

    const normalizedUserCampus = normalizeCampusForFilter(userCampus);
    if (eventCampusCodes.includes(normalizedUserCampus)) {
      return [normalizedUserCampus];
    }

    return [normalizedUserCampus];
  }, [eventDetails?.campusCodes, isAdmin, isUcMainAdmin, user?.campus]);

  const activeCampusValue =
    isUcMainAdmin && activeCampus === "all"
      ? "all"
      : activeCampus !== "all" && availableCampusCodes.includes(activeCampus)
        ? activeCampus
        : availableCampusCodes[0];

  const handleCampusChange = (campusCode: string) => {
    if (campusCode === "all" && isUcMainAdmin) {
      setActiveCampus("all");
    } else if (campusCode in CAMPUS_CODE_TO_NAME) {
      setActiveCampus(normalizeCampusForFilter(campusCode as Campus));
    }
  };

  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = tabsScrollRef.current;
    if (!container) return;

    // Only hijack vertical wheel scroll if there's actually horizontal overflow
    if (container.scrollWidth <= container.clientWidth) return;

    e.preventDefault();
    container.scrollLeft += e.deltaY;
  };

  useEffect(() => {
    if (!hasValidRouteEventId) {
      return;
    }

    let isMounted = true;

    const fetchEvent = async () => {
      setIsLoadingEvent(true);
      setLoadError(null);

      const result = await getEventById(normalizedRouteEventId);

      if (!isMounted) return;

      if (!result) {
        setEventDetails(null);
        setLoadError("Unable to load event details.");
        setIsLoadingEvent(false);
        return;
      }

      setEventDetails(
        mapApiEventToEventDetails(normalizedRouteEventId, result)
      );
      setIsLoadingEvent(false);
    };

    fetchEvent();

    return () => {
      isMounted = false;
    };
  }, [hasValidRouteEventId, normalizedRouteEventId, refetchTrigger]);

  const handleBack = () => {
    navigate("/admin/events");
  };

  const handleEditEvent = () => {
    if (!eventDetails || !isUcMainAdmin || !canManageEvents) return;
    setIsEditEventOpen(true);
  };

  const handleAttendeeSettings = () => {
    if (!isUcMainAdmin || !canManageEvents) return;
    setIsAttendeeSettingsOpen(true);
  };

  const handleSaveAttendeeLimits = async (limits: Record<string, number>) => {
    if (!eventDetails) return;

    const nameToCode: Record<string, Campus> = {};
    for (const [code, name] of Object.entries(CAMPUS_CODE_TO_NAME)) {
      nameToCode[name] = code as Campus;
    }

    const campusLimits: CampusLimit[] = Object.entries(limits)
      .map(([venueName, limit]) => {
        const campus = nameToCode[venueName];
        if (!campus) return null;
        return { campus, limit };
      })
      .filter((entry): entry is CampusLimit => entry !== null);

    try {
      const res = await updateEventDetails(eventDetails.id, {
        limit: campusLimits,
      });
      if (res) {
        showToast("success", "Attendee limits updated successfully");
        setRefetchTrigger((prev) => prev + 1);
      } else {
        showToast("error", "Failed to update attendee limits");
      }
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : "Failed to update attendee limits";
      showToast("error", message);
    }
  };

  const retryFetch = () => {
    if (!hasValidRouteEventId) return;
    setLoadError(null);
    setIsLoadingEvent(true);

    getEventById(normalizedRouteEventId).then((result) => {
      if (!result) {
        setEventDetails(null);
        setLoadError("Unable to load event details.");
        setIsLoadingEvent(false);
        return;
      }

      setEventDetails(
        mapApiEventToEventDetails(normalizedRouteEventId, result)
      );
      setIsLoadingEvent(false);
    });
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-background px-6 py-5 sm:py-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold">Event Management</h1>
            <p className="text-muted-foreground text-sm">
              Edit event details and manage attendees
            </p>
          </div>

          {isUcMainAdmin && canManageEvents && (
            <div className="flex w-full justify-end sm:w-auto">
              <Button
                variant="outline"
                onClick={handleAttendeeSettings}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Attendee Settings
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 px-6 py-4">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleBack();
                  }}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Events
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Event Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {isLoadingEvent ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="text-muted-foreground text-sm">
                Loading event...
              </div>
            </div>
          ) : loadError ? (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">{loadError}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={retryFetch}
                  className="cursor-pointer"
                >
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="cursor-pointer"
                >
                  Back to Events
                </Button>
              </div>
            </div>
          ) : !eventDetails ? (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Event not found.</p>
              <Button
                variant="outline"
                onClick={handleBack}
                className="cursor-pointer"
              >
                Back to Events
              </Button>
            </div>
          ) : (
            <>
              {/* Event Details Section — compact bordered card */}
              <div className="bg-card flex flex-col gap-4 rounded-xl border p-4 sm:flex-row">
                {/* Event Image (thumbnail) */}
                <div className="sm:w-56 sm:flex-shrink-0 md:w-90">
                  <div className="bg-muted aspect-[4/3] w-full overflow-hidden rounded-lg sm:aspect-auto sm:h-48 md:h-56">
                    <img
                      src={eventDetails.image}
                      alt={eventDetails.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                {/* Event Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{eventDetails.title}</h2>
                    <Badge
                      variant={
                        eventDetails.status === "ongoing"
                          ? "default"
                          : eventDetails.status === "ended"
                            ? "secondary"
                            : "outline"
                      }
                      className="capitalize"
                    >
                      {eventDetails.status}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
                      Brief Details
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <Calendar className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {formatFullMonthDate(eventDetails.rawStartDate)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatTimeToAMPM(
                              eventDetails.eventStartTime ||
                                eventDetails.startTime
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Calendar className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {formatFullMonthDate(eventDetails.rawEndDate)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatTimeToAMPM(
                              eventDetails.eventEndTime || eventDetails.endTime
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p className="text-sm font-medium">
                      {eventDetails.location || "Location not specified"}
                      {eventDetails.eventVenueSpecific &&
                        ` (${eventDetails.eventVenueSpecific})`}
                    </p>
                  </div>

                  {eventDetails.eventTheme && (
                    <div className="bg-muted/50 rounded-lg border p-3">
                      <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                        Event Theme
                      </p>
                      <p className="mt-0.5 text-sm font-semibold italic">
                        "{eventDetails.eventTheme}"
                      </p>
                    </div>
                  )}

                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {eventDetails.description}
                  </p>

                  {isUcMainAdmin && canManageEvents && (
                    <Button
                      onClick={handleEditEvent}
                      variant="outline"
                      className="w-full"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Event
                    </Button>
                  )}
                </div>
              </div>

              {/* Attendees Section - campuses tabs */}
              <div className="-mt-4 space-y-4">
                <Tabs
                  value={activeCampusValue}
                  onValueChange={handleCampusChange}
                >
                  <div className="relative">
                    <div
                      ref={tabsScrollRef}
                      onWheel={handleTabsWheel}
                      className="scrollbar-hide overflow-x-auto scroll-smooth"
                      style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                      }}
                    >
                      <TabsList className="inline-flex w-max gap-2 rounded-none border-0 bg-transparent px-2">
                        {isUcMainAdmin && (
                          <TabsTrigger
                            value="all"
                            className="mx-1 cursor-pointer rounded-none !bg-transparent px-4 py-3 whitespace-nowrap ring-0 outline-none hover:bg-transparent focus:bg-transparent focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[#1C9DDE] data-[state=active]:underline data-[state=active]:decoration-[#1C9DDE] data-[state=active]:decoration-2 data-[state=active]:underline-offset-11"
                          >
                            All Campuses
                          </TabsTrigger>
                        )}
                        {availableCampusCodes.map((campusCode) => (
                          <TabsTrigger
                            key={campusCode}
                            value={campusCode}
                            className="mx-1 cursor-pointer rounded-none !bg-transparent px-4 py-3 whitespace-nowrap ring-0 outline-none hover:bg-transparent focus:bg-transparent focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[#1C9DDE] data-[state=active]:underline data-[state=active]:decoration-[#1C9DDE] data-[state=active]:decoration-2 data-[state=active]:underline-offset-11"
                          >
                            {CAMPUS_CODE_TO_NAME[campusCode]}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>

                    <div className="from-background pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l to-transparent" />
                  </div>

                  {isUcMainAdmin && (
                    <TabsContent value="all" className="mt-6">
                      <AttendeesTable
                        venue="All Campuses"
                        eventId={eventDetails.id}
                        campusCode="all"
                        adminCampus={user?.campus}
                        merch={eventDetails.merch}
                        eventStatus={eventDetails.status}
                        attendanceType={eventDetails.attendanceType}
                      />
                    </TabsContent>
                  )}
                  {availableCampusCodes.map((campusCode) => (
                    <TabsContent
                      key={campusCode}
                      value={campusCode}
                      className="mt-6"
                    >
                      <AttendeesTable
                        venue={CAMPUS_CODE_TO_NAME[campusCode]}
                        eventId={eventDetails.id}
                        campusCode={campusCode}
                        adminCampus={user?.campus}
                        merch={eventDetails.merch}
                        eventStatus={eventDetails.status}
                        attendanceType={eventDetails.attendanceType}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AttendeeSettingsModal
        open={isAttendeeSettingsOpen}
        onOpenChange={setIsAttendeeSettingsOpen}
        venues={
          eventDetails?.venues ??
          DEFAULT_CAMPUSES.map((code) => CAMPUS_CODE_TO_NAME[code])
        }
        initialLimits={eventDetails?.limits}
        onSave={handleSaveAttendeeLimits}
      />
      <EditEventModal
        open={isEditEventOpen}
        onOpenChange={setIsEditEventOpen}
        onSaveEvent={() => setRefetchTrigger((prev) => prev + 1)}
        eventData={{
          id: eventDetails?.id ?? "",
          title: eventDetails?.title ?? "",
          description: eventDetails?.description ?? "",
          eventVenue: eventDetails?.location ?? "",
          startDate: eventDetails?.rawStartDate ?? "",
          eventEndDate: eventDetails?.rawEndDate ?? "",
          image: eventDetails?.image ?? "",
          eventTheme: eventDetails?.eventTheme ?? "",
          eventVenueSpecific: eventDetails?.eventVenueSpecific ?? "",
          eventStartTime: eventDetails?.eventStartTime ?? "",
          eventEndTime: eventDetails?.eventEndTime ?? "",
          sessionConfig: eventDetails?.sessionConfig,
        }}
      />
    </div>
  );
};

export default EventManagement;
