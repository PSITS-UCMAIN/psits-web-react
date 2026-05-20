import React, { useCallback, useState } from "react";
import { Upload, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { EventFormData } from "./AddEventModal";

interface EventInfoTabProps {
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
}

export const EventInfoTab: React.FC<EventInfoTabProps> = ({
  formData,
  setFormData,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleFileChange = (file: File | null) => {
    if (file && file.type.startsWith("image/")) {
      setFormData((prev) => ({ ...prev, image: file }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      handleFileChange(file);
    },
    [handleFileChange]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileChange(file);
  };

  return (
    <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-2">
      {/* Left Column - Image Upload + Location */}
      <div className="flex flex-col">
        <Label className="mb-2 text-sm font-medium">Event Image</Label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex max-h-[320px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragging ? "border-[#1C9DDE] bg-[#1C9DDE]/10" : "border-gray-300",
            imagePreview && "border-solid p-0"
          )}
        >
          {imagePreview ? (
            <div className="relative h-[280px] w-full">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-full w-full rounded-lg object-cover"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setImagePreview(null);
                  setFormData((prev) => ({ ...prev, image: null }));
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <>
              <Upload className="mb-4 h-12 w-12 text-gray-400" />
              <p className="mb-1 text-base font-medium text-gray-700">
                Choose a file or drag & drop it here
              </p>
              <p className="mb-4 text-sm text-gray-500">
                Uploading a new image will replace the current one
              </p>
              <label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span>Browse File</span>
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </label>
            </>
          )}
        </div>

        {/* Location (placed below image upload per request) */}
        <div className="mt-4">
          <Label htmlFor="location" className="text-sm font-medium">
            Location
          </Label>
          <div className="relative">
            <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              id="location"
              placeholder="Enter event location"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
              className="w-full pl-10"
            />
          </div>
        </div>
      </div>

      {/* Right Column - Form Fields */}
      <div className="flex h-full flex-col gap-4">
        {/* Event Name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="eventName" className="text-sm font-medium">
            Event Name
          </Label>
          <Input
            id="eventName"
            placeholder="Enter event name"
            value={formData.eventName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, eventName: e.target.value }))
            }
            className="w-full"
          />
        </div>

        {/* Event Description */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="eventDescription" className="text-sm font-medium">
            Event Description
          </Label>
          <Textarea
            id="eventDescription"
            placeholder="Enter event description"
            value={formData.eventDescription}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                eventDescription: e.target.value,
              }))
            }
            className="max-h-40 min-h-[100px] w-full resize-none overflow-y-auto"
          />
        </div>

        {/* Event Schedule (right column) */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">Event Schedule</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.eventSchedule && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.eventSchedule ? (
                  format(formData.eventSchedule, "PPP")
                ) : (
                  <span>Choose date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.eventSchedule}
                onSelect={(date) =>
                  setFormData((prev) => ({ ...prev, eventSchedule: date }))
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};
