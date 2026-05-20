import React, { useState } from "react";
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

interface AddEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddEvent?: (event: EventFormData) => void;
}

export interface EventFormData {
  eventName: string;
  eventDescription: string;
  eventSchedule: Date | undefined;
  location: string;
  image: File | null;
  sessions: SessionData[];
}

export interface SessionData {
  date: string;
  morningSession: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  afternoonSession: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  eveningSession: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

export const AddEventModal: React.FC<AddEventModalProps> = ({
  open,
  onOpenChange,
  onAddEvent,
}) => {
  const [activeTab, setActiveTab] = useState("event-info");
  const [formData, setFormData] = useState<EventFormData>({
    eventName: "",
    eventDescription: "",
    eventSchedule: undefined,
    location: "",
    image: null,
    sessions: [],
  });

  const handleSubmit = () => {
    // Map formData to Event type
    const eventDate = formData.eventSchedule || new Date();
    const newEvent = {
      id: Date.now().toString(),
      title: formData.eventName,
      date: eventDate.toLocaleDateString(),
      image: formData.image
        ? URL.createObjectURL(formData.image)
        : "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&h=600&fit=crop",
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
      startTime: formData.sessions[0]?.morningSession.startTime || "8:00 AM",
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
    if (onAddEvent) onAddEvent(newEvent);
    // Reset form
    setFormData({
      eventName: "",
      eventDescription: "",
      eventSchedule: undefined,
      location: "",
      image: null,
      sessions: [],
    });
    setActiveTab("event-info");
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      eventName: "",
      eventDescription: "",
      eventSchedule: undefined,
      location: "",
      image: null,
      sessions: [],
    });
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
              Add Event
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
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="cursor-pointer bg-[#1C9DDE] hover:bg-[#1C9DDE]"
            >
              Add Event
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
