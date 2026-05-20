import React, { useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markAttendanceV2 } from "@/features/events/api/eventService";
import { searchStudentByIdV2 } from "@/features/student/api/student";

interface StudentDetails {
  id_number: string;
  name: string;
  campus: string;
  course: string;
  year: number;
}

interface MarkAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onAttendanceMarked: () => void;
}

export const MarkAttendanceModal: React.FC<MarkAttendanceModalProps> = ({
  open,
  onOpenChange,
  eventId,
  onAttendanceMarked,
}) => {
  const [studentId, setStudentId] = useState("");
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(
    null
  );
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const handleSearch = async () => {
    if (!studentId.trim()) {
      setError("Please enter a student ID");
      return;
    }

    setIsSearching(true);
    setError("");
    setStudentDetails(null);

    try {
      const student = await searchStudentByIdV2(studentId.trim());

      if (student) {
        const fullName =
          student.name || `${student.first_name} ${student.last_name}`.trim();
        const campus = student.campus || "";
        const course = student.course || "";

        setStudentDetails({
          id_number: student.id_number,
          name: fullName,
          campus: campus,
          course: course,
          year: Number(student.year) || 1,
        });
      } else {
        setError("Student not found");
      }
    } catch (searchError) {
      setError(
        typeof searchError === "string"
          ? searchError
          : "Failed to search for student"
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleMarkPresent = async () => {
    if (!studentDetails) return;

    setIsMarking(true);
    setError("");

    try {
      const result = await markAttendanceV2(eventId, studentDetails.id_number, {
        campus: studentDetails.campus,
        attendeeName: studentDetails.name,
        course: studentDetails.course,
        year: studentDetails.year,
      });

      if (result) {
        handleReset();
        onOpenChange(false);
        onAttendanceMarked();
      } else {
        setError("Failed to mark attendance");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to mark attendance"
      );
    } finally {
      setIsMarking(false);
    }
  };

  const handleReset = () => {
    setStudentId("");
    setStudentDetails(null);
    setError("");
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-full max-w-md gap-0 rounded-lg p-0 sm:max-w-xs sm:rounded-xl"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl leading-6 font-semibold">
              Mark Attendance
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6">
          {/* Search Input */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                placeholder="Enter student ID"
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                className="pr-12"
                disabled={isSearching}
              />
              <Button
                size="icon-sm"
                onClick={handleSearch}
                disabled={isSearching}
                className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 rounded-full bg-[#1C9DDE] hover:bg-[#1789c4]"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {/* Student Details */}
          {studentDetails && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Student Details</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Student ID
                  </span>
                  <span className="text-sm font-medium">
                    {studentDetails.id_number}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Name</span>
                  <span className="text-sm font-medium">
                    {studentDetails.name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Course & Year
                  </span>
                  <span className="text-sm font-medium">
                    {studentDetails.course} - Year {studentDetails.year}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Campus</span>
                  <span className="text-sm font-medium">
                    {studentDetails.campus}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isMarking}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMarkPresent}
                  disabled={isMarking}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {isMarking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Mark Present
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
