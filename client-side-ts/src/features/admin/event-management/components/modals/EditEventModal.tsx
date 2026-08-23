import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EventInfoTab } from "./EventInfoTab";
import { SessionSetupTab } from "./SessionSetupTab";
import type { EventFormData } from "./AddEventModal";
import { showToast } from "@/utils/alertHelper";
import { updateEventDetails } from "@/features/events/api/eventService";
import axios from "axios";
import { format } from "date-fns";

type SessionKey = "morning" | "afternoon" | "evening";

/** Shape the API may return for a single session. Tolerant of both variants. */
interface IncomingSession {
  enabled?: boolean;
  timeRange?: string;
  startTime?: string;
  endTime?: string;
}

interface EditEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveEvent?: (event: unknown) => void;
  eventData: {
    id: string;
    title: string;
    description?: string;
    eventVenue?: string;
    startDate?: string;
    image: string;
    eventTheme?: string;
    eventVenueSpecific?: string;
    eventStartTime?: string;
    eventEndTime?: string;
    eventEndDate?: string;
    attendanceType?: EventFormData["attendanceType"];
    sessionConfig?: Partial<Record<SessionKey, IncomingSession>> & {
      oneSessionOnly?: boolean;
    };
  } | null;
}

const SESSION_KEYS: SessionKey[] = ["morning", "afternoon", "evening"];
const formatDateKey = (date: Date): string => format(date, "yyyy-MM-dd");

/**
 * Factory rather than a shared constant: each form instance gets its own
 * nested objects, so an accidental in-place mutation can't leak across modals.
 */
const createDisabledSessions = (): EventFormData["sessionConfig"] => ({
  morning: { enabled: false, timeRange: "" },
  afternoon: { enabled: false, timeRange: "" },
  evening: { enabled: false, timeRange: "" },
  oneSessionOnly: false,
});

/**
 * Normalizes whatever the API gives us into the form's canonical
 * { enabled, timeRange: "HH:mm - HH:mm" } shape.
 */
const normalizeSessionConfig = (
  incoming?: (Partial<Record<SessionKey, IncomingSession>> & {
    oneSessionOnly?: boolean;
  })
): EventFormData["sessionConfig"] => {
  const base = createDisabledSessions();
  if (!incoming) return base;

  base.oneSessionOnly = Boolean(incoming.oneSessionOnly);

  for (const key of SESSION_KEYS) {
    const session = incoming[key];
    if (!session) continue;

    const timeRange =
      session.timeRange ??
      (session.startTime && session.endTime
        ? `${session.startTime} - ${session.endTime}`
        : "");

    base[key] = {
      enabled: Boolean(session.enabled),
      timeRange,
    };
  }

  return base;
};

/** A session is only persistable if it's on AND has a complete range. */
const isSessionComplete = (timeRange: string): boolean => {
  const [start, end] = timeRange.split(" - ");
  return Boolean(start?.trim() && end?.trim());
};

export const EditEventModal: React.FC<EditEventModalProps> = ({
  open,
  onOpenChange,
  onSaveEvent,
  eventData,
}) => {
  const [activeTab, setActiveTab] = useState("event-info");
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<EventFormData>({
    eventName: "",
    eventDescription: "",
    eventSchedule: undefined,
    attendanceType: "open",
    image: null,
    sessionConfig: createDisabledSessions(),
    eventVenue: "",
    eventTheme: "",
    eventVenueSpecific: "",
    eventStartTime: "",
    eventEndTime: "",
  });

  useEffect(() => {
    if (open && eventData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form state from props when modal opens
      setFormData({
        eventName: eventData.title || "",
        eventDescription: eventData.description || "",
        eventSchedule: eventData.startDate
          ? {
              from: new Date(eventData.startDate),
              to: eventData.eventEndDate
                ? new Date(eventData.eventEndDate)
                : undefined,
            }
          : undefined,
        attendanceType: eventData.attendanceType || "open",
        image: null,
        sessionConfig: normalizeSessionConfig(eventData.sessionConfig),
        eventVenue: eventData.eventVenue || "",
        eventTheme: eventData.eventTheme || "",
        eventVenueSpecific: eventData.eventVenueSpecific || "",
        eventStartTime: eventData.eventStartTime || "",
        eventEndTime: eventData.eventEndTime || "",
      });
    }
  }, [eventData, open]);

  const handleCancel = () => {
    setActiveTab("event-info");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!eventData?.id) return;

    // Guard: an enabled session with a half-filled range would persist garbage.
    const incompleteSession = SESSION_KEYS.find(
      (key) =>
        formData.sessionConfig[key].enabled &&
        !isSessionComplete(formData.sessionConfig[key].timeRange)
    );

    if (incompleteSession) {
      setActiveTab("session-setup");
      showToast(
        "error",
        `Please set both a start and end time for the ${incompleteSession} session.`
      );
      return;
    }

    try {
      setIsSaving(true);

      const payload: Parameters<typeof updateEventDetails>[1] = {
        eventName: formData.eventName,
        eventDescription: formData.eventDescription,
        eventDate: formData.eventSchedule?.from
          ? formatDateKey(formData.eventSchedule.from)
          : undefined,
        eventEndDate: formData.eventSchedule?.to
          ? formatDateKey(formData.eventSchedule.to)
          : undefined,
        eventVenue: formData.eventVenue,
        eventTheme: formData.eventTheme,
        eventVenueSpecific: formData.eventVenueSpecific,
        eventStartTime: formData.eventStartTime,
        eventEndTime: formData.eventEndTime,
        attendanceType: formData.attendanceType,
        sessionConfig: formData.sessionConfig,
      };

      if (formData.image) {
        payload.image = formData.image;
      }

      const res = await updateEventDetails(eventData.id, payload);

      if (res) {
        showToast("success", "Event updated successfully");
        if (onSaveEvent) {
          onSaveEvent(res.data || res);
        }
        onOpenChange(false);
      } else {
        showToast("error", "Failed to update event");
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as { message?: string } | undefined)
            ?.message ?? error.message)
        : error instanceof Error
          ? error.message
          : "Failed to update event";
      showToast("error", message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-auto flex max-h-[90vh] w-[92%] max-w-4xl flex-col gap-0 overflow-y-auto rounded-3xl p-0 sm:w-full sm:max-w-2xl sm:rounded-xl">
        <DialogHeader className="px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl leading-6 font-semibold">
              Edit Event
            </DialogTitle>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent px-6 py-0">
            <TabsTrigger
              value="event-info"
              className="cursor-pointer rounded-none border-b-2 border-transparent px-0 pb-3 text-sm text-gray-500 data-[state=active]:border-b-[#1C9DDE] data-[state=active]:bg-transparent data-[state=active]:text-[#1C9DDE] data-[state=active]:shadow-none"
            >
              Event Info
            </TabsTrigger>
            <TabsTrigger
              value="session-setup"
              className="cursor-pointer rounded-none border-b-2 border-transparent px-0 pb-3 text-sm text-gray-500 data-[state=active]:border-b-[#1C9DDE] data-[state=active]:bg-transparent data-[state=active]:text-[#1C9DDE] data-[state=active]:shadow-none"
            >
              Session Setup
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <TabsContent value="event-info" className="mt-0 h-full">
              <EventInfoTab
                formData={formData}
                setFormData={setFormData}
                initialImage={eventData?.image}
                isEdit
              />
            </TabsContent>

            <TabsContent value="session-setup" className="mt-0 h-full">
              <SessionSetupTab formData={formData} setFormData={setFormData} />
            </TabsContent>
          </div>

          <div className="bg-background flex items-center justify-end gap-3 border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="cursor-pointer"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="cursor-pointer bg-[#1C9DDE] hover:bg-[#1C9DDE]"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
