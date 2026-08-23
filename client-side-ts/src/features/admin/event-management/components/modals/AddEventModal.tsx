import React, { useState } from "react";
import { XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EventInfoTab } from "./EventInfoTab";
import { SessionSetupTab } from "./SessionSetupTab";
import type { CanonicalSessionConfig } from "@/features/events/types/event.types";
import { createEventV2 } from "@/features/events/api/eventService";
import { showToast } from "@/utils/alertHelper";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

export interface EventFormData {
  eventName: string;
  eventDescription: string;
  eventSchedule?: DateRange;
  attendanceType: "open" | "ticketed";
  image: File | null;
  sessionConfig: CanonicalSessionConfig;
  eventVenue?: string;
  eventTheme?: string;
  eventVenueSpecific?: string;
  eventStartTime?: string;
  eventEndTime?: string;
}

interface AddEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const defaultSessionConfig: CanonicalSessionConfig = {
  morning: { enabled: true, timeRange: "07:30 - 12:00" },
  afternoon: { enabled: false, timeRange: "13:00 - 15:00" },
  evening: { enabled: false, timeRange: "18:00 - 20:00" },
  oneSessionOnly: false,
};

const emptyFormData = (): EventFormData => ({
  eventName: "",
  eventDescription: "",
  eventSchedule: undefined,
  attendanceType: "open",
  image: null,
  sessionConfig: defaultSessionConfig,
});

const formatDateKey = (date: Date): string => format(date, "yyyy-MM-dd");

const parseMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const validateSessions = (config: CanonicalSessionConfig): string | null => {
  const enabled = ["morning", "afternoon", "evening"] as const;
  const ranges: Array<{ name: string; start: number; end: number }> = [];

  for (const name of enabled) {
    const entry = config[name];
    if (!entry.enabled) continue;
    const [start, end] = entry.timeRange.split(" - ");
    if (!start || !end) return `${name} session needs a full time range`;
    const startMinutes = parseMinutes(start);
    const endMinutes = parseMinutes(end);
    if (!(endMinutes > startMinutes)) {
      return `${name} session end time must be after start time`;
    }
    ranges.push({ name, start: startMinutes, end: endMinutes });
  }

  if (ranges.length === 0) return "Enable at least one session";

  ranges.sort((a, b) => a.start - b.start);
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].start <= ranges[i - 1].end) {
      return `${ranges[i - 1].name} and ${ranges[i].name} sessions overlap`;
    }
  }

  return null;
};

export const AddEventModal: React.FC<AddEventModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState("event-info");
  const [formData, setFormData] = useState<EventFormData>(emptyFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const dateError = validateSessions(formData.sessionConfig);
    if (dateError) {
      showToast("error", dateError);
      return;
    }

    if (!formData.eventName.trim()) {
      showToast("error", "Event name is required");
      return;
    }

    if (!formData.eventSchedule?.from) {
      showToast("error", "Event schedule is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createEventV2({
        eventName: formData.eventName,
        eventDescription: formData.eventDescription,
        eventDate: formatDateKey(formData.eventSchedule.from),
        eventEndDate: formData.eventSchedule?.to
          ? formatDateKey(formData.eventSchedule.to)
          : undefined,
        attendanceType: formData.attendanceType,
        status: "Upcoming",
        sessionConfig: formData.sessionConfig,
        images: formData.image ? [formData.image] : [],
        eventVenue: formData.eventVenue,
        eventTheme: formData.eventTheme,
        eventVenueSpecific: formData.eventVenueSpecific,
        eventStartTime: formData.eventStartTime,
        eventEndTime: formData.eventEndTime,
      });

      if (result) {
        showToast("success", "Event created successfully");
        onOpenChange(false);
        setActiveTab("event-info");
        setFormData(emptyFormData());
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setActiveTab("event-info");
    setFormData(emptyFormData());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="mx-auto flex max-h-[90vh] w-[92%] max-w-4xl flex-col gap-0 overflow-y-auto rounded-3xl p-0 sm:w-full sm:max-w-2xl sm:rounded-xl"
      >
        <DialogHeader className="px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl leading-6 font-semibold">
              Add Event
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="h-8 w-8 cursor-pointer rounded-full"
            >
              <XCircle className="h-4 w-4" />
            </Button>
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
              <EventInfoTab formData={formData} setFormData={setFormData} />
            </TabsContent>
            <TabsContent value="session-setup" className="mt-0 h-full">
              <SessionSetupTab formData={formData} setFormData={setFormData} />
            </TabsContent>
          </div>

          <div className="bg-background flex items-center justify-end gap-3 border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="cursor-pointer bg-[#1C9DDE] hover:bg-[#1C9DDE]"
            >
              {isSubmitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Create Event
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
