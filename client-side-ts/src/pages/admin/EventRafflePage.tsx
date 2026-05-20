import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { getEventById } from "@/features/events/api/eventService";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import RaffleDraw from "@/features/admin/event-raffle/raffle";

const EventRafflePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const normalizedEventId = eventId?.trim() ?? "";

  const [eventName, setEventName] = useState("Loading Event...");
  const [eventDate, setEventDate] = useState("");

  useEffect(() => {
    if (normalizedEventId) {
      getEventById(normalizedEventId).then((event) => {
        if (event) {
          setEventName(event.eventName || "Untitled Event");
          if (event.eventDate) {
            setEventDate(
              new Date(event.eventDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            );
          } else {
            setEventDate("TBA");
          }
        }
      });
    }
  }, [normalizedEventId]);

  const handleBack = () => navigate("/admin/events");
  const handleBackToEvent = () =>
    navigate(`/admin/events/${normalizedEventId}`);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-background border-b border-slate-200/60 px-6 py-5 sm:py-4">
        <h1 className="text-2xl font-semibold">Raffle Draw</h1>
        <p className="text-muted-foreground text-sm">
          Run a raffle draw for event attendees
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 px-6 py-4">
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
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleBackToEvent();
                  }}
                >
                  Event Management
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Raffle</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Raffle Draw */}
          <div
            className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm"
            style={{ minHeight: "80vh" }}
          >
            <RaffleDraw eventName={eventName} eventDate={eventDate} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventRafflePage;
