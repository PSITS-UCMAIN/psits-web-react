import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
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
import { updateEvent } from "@/features/events/api/eventService";
import { showToast } from "@/utils/alertHelper";

interface UpdatedEventData {
  id: string;
  title: string;
  date: string;
  image: string;
  status: "view";
  description: string;
  location: string;
  locationAddress: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  venues: string[];
}

interface EditEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveEvent?: (event: UpdatedEventData) => void;
  eventData: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    startDate?: string;
    image: string;
  } | null;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  open,
  onOpenChange,
  onSaveEvent,
  eventData,
}) => {
  const [activeTab, setActiveTab] = useState("event-info");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    eventName: "",
    eventDescription: "",
    eventSchedule: undefined,
    location: "",
    image: null,
    sessions: [],
  });

  // Populate form data when eventData changes
  useEffect(() => {
    if (eventData && open) {
      setFormData({
        eventName: eventData.title || "",
        eventDescription: eventData.description || "",
        eventSchedule: eventData.startDate
          ? new Date(eventData.startDate)
          : undefined,
        location: eventData.location || "",
        image: null, // Keep as null since we can't convert URL to File
        sessions: [],
      });
    }
  }, [eventData, open]);

  const handleSubmit = async () => {
    if (!eventData) return;

    // Validate required fields
    if (!formData.eventName.trim()) {
      showToast("error", "Event name is required");
      return;
    }

    if (!formData.eventSchedule) {
      showToast("error", "Event schedule is required");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare API payload
      const eventDate = formData.eventSchedule;
      const updatePayload: Partial<{
        eventName: string;
        eventDescription: string;
        eventDate: string;
        location: string;
        sessionConfig: Record<string, unknown>;
      }> = {
        eventName: formData.eventName,
        eventDescription: formData.eventDescription,
        eventDate: eventDate.toISOString(),
        location: formData.location,
      };

      // Add session configuration if needed
      if (formData.sessions.length > 0) {
        updatePayload.sessionConfig = formData.sessions as unknown as Record<
          string,
          unknown
        >;
      }

      // Call update API
      const success = await updateEvent(eventData.id, updatePayload);

      if (success) {
        // Prepare updated event for local state update
        const updatedEvent = {
          id: eventData.id,
          title: formData.eventName,
          date: eventDate.toLocaleDateString(),
          image: formData.image
            ? URL.createObjectURL(formData.image)
            : eventData.image,
          status: "view" as const,
          description: formData.eventDescription,
          location: formData.location,
          locationAddress: formData.location,
          startDate: eventDate.toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          startTime:
            formData.sessions[0]?.morningSession.startTime || "8:00 AM",
          endDate: eventDate.toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          endTime:
            formData.sessions[formData.sessions.length - 1]?.eveningSession
              .endTime || "5:00 PM",
          venues: [formData.location],
        };

        if (onSaveEvent) onSaveEvent(updatedEvent);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error updating event:", error);
      showToast("error", "Failed to update event");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setActiveTab("event-info");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[80vh] w-full max-w-4xl flex-col gap-0 overflow-y-auto rounded-lg p-0 sm:max-w-2xl sm:rounded-xl"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl leading-6 font-semibold">
              Edit Event
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCancel}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent px-6 py-0">
            <TabsTrigger
              value="event-info"
              className="cursor-pointer rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:text-[#1C9DDE] data-[state=active]:shadow-none"
            >
              Event Info
            </TabsTrigger>
            <TabsTrigger
              value="session-setup"
              className="border-blue data-[state=active]:border-b[#1C9DDE] cursor-pointer rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:text-[#1C9DDE] data-[state=active]:shadow-none"
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
              className="cursor-pointer"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="cursor-pointer bg-[#1C9DDE] hover:bg-[#1C9DDE]"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
