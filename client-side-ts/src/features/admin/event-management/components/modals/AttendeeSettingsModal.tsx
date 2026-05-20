import React, { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AttendeeSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venues?: string[];
  onSave: (limits: Record<string, number>) => void;
}

const DEFAULT_CAMPUSES = [
  "University of Cebu Main Campus",
  "University of Cebu Banilad Campus",
  "University of Cebu Lapu-Lapu & Mandaue",
  "University of Cebu Pardo & Talisay",
];

export const AttendeeSettingsModal: React.FC<AttendeeSettingsModalProps> = ({
  open,
  onOpenChange,
  venues,
  onSave,
}) => {
  const campuses = venues && venues.length > 0 ? venues : DEFAULT_CAMPUSES;

  const [limits, setLimits] = useState<Record<string, number>>(
    campuses.reduce((acc, venue) => ({ ...acc, [venue]: 0 }), {})
  );

  const handleIncrement = (venue: string) => {
    setLimits((prev) => ({ ...prev, [venue]: prev[venue] + 1 }));
  };

  const handleDecrement = (venue: string) => {
    setLimits((prev) => ({ ...prev, [venue]: Math.max(0, prev[venue] - 1) }));
  };

  const handleRemove = (venue: string) => {
    setLimits((prev) => ({ ...prev, [venue]: 0 }));
  };

  const handleSave = () => {
    onSave(limits);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset limits
    setLimits(campuses.reduce((acc, venue) => ({ ...acc, [venue]: 0 }), {}));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-0 overflow-y-auto rounded-lg p-0 sm:max-w-lg sm:rounded-xl"
        showCloseButton={false}
      >
        <DialogHeader className="flex-none border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl leading-6 font-semibold">
              Attendee Settings
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <p className="text-muted-foreground mb-6 text-sm">
            Set the maximum limit for attendees per location.
          </p>

          <div className="space-y-4">
            {campuses.map((venue) => (
              <div
                key={venue}
                className="flex flex-col items-start justify-between gap-3 py-2 sm:flex-row sm:items-center"
              >
                <span className="max-w-xs text-sm font-medium break-words">
                  {venue}
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(venue)}
                    className="h-8 cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    Remove
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleDecrement(venue)}
                      className="h-8 w-8 cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <input
                      aria-label={`Limit for ${venue}`}
                      type="number"
                      min={0}
                      value={limits[venue] ?? 0}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = parseInt(raw === "" ? "0" : raw, 10);
                        setLimits((prev) => ({
                          ...prev,
                          [venue]: Number.isNaN(parsed)
                            ? 0
                            : Math.max(0, parsed),
                        }));
                      }}
                      className="w-16 rounded-md border px-2 py-1 text-center text-sm"
                    />

                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleIncrement(venue)}
                      className="h-8 w-8 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background flex flex-none flex-col items-center gap-3 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full cursor-pointer sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="w-full cursor-pointer bg-[#1C9DDE] hover:bg-[#1C9DDE] sm:w-auto"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
