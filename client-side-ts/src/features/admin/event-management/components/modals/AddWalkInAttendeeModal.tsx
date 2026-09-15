import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, Search, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/utils/alertHelper";
import { validateId } from "@/utils/studentId";
import {
  addWalkInAttendeeV2,
  searchStudentsV2,
} from "@/features/events/api/eventService";
import type {
  AddWalkInAttendeeV2Payload,
  AddWalkInAttendeeV2Response,
  EventMerchMeta,
  StudentSearchResult,
} from "@/features/events/types/event.types";

export interface WalkInAttendeeFormData {
  studentId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  campus: string;
  course: string;
  yearLevel: string;
  shirtSize: string;
  shirtPrice: string;
}

interface AddWalkInAttendeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAttendee?: (attendee: WalkInAttendeeFormData) => void;
  eventId: string;
  adminCampus?: string;
  merch?: EventMerchMeta | null;
}

const COURSE_OPTIONS = ["BSIT", "BSCS", "ACT"];
const YEAR_LEVEL_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const REQUIRED_MESSAGE = "This field is required";

// Validation constants
const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'.,-]+$/;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

type FormErrors = Partial<Record<keyof WalkInAttendeeFormData, string>>;

const shouldShowShirtFields = (merch?: EventMerchMeta | null): boolean => {
  if (!merch) return false;
  return merch.category === "ict-congress" && merch.type === "Tshirt w/ Bundle";
};

const getYearLevelLabel = (year: number): string => {
  const suffixes: Record<number, string> = {
    1: "1st Year",
    2: "2nd Year",
    3: "3rd Year",
    4: "4th Year",
  };
  return suffixes[year] ?? "";
};

// Validation helper functions
const validateName = (
  value: string,
  fieldLabel: string,
  isRequired: boolean = true
): string | undefined => {
  const trimmed = value.trim();

  if (!trimmed) {
    return isRequired ? REQUIRED_MESSAGE : undefined;
  }

  if (trimmed.length < NAME_MIN_LENGTH) {
    return `${fieldLabel} must be at least ${NAME_MIN_LENGTH} characters`;
  }

  if (trimmed.length > NAME_MAX_LENGTH) {
    return `${fieldLabel} must not exceed ${NAME_MAX_LENGTH} characters`;
  }

  if (!NAME_REGEX.test(trimmed)) {
    return `${fieldLabel} contains invalid characters`;
  }

  return undefined;
};

const validateEmail = (value: string): string | undefined => {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined; // Email is optional for walk-in attendees
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return "Please enter a valid email address";
  }

  return undefined;
};

export const AddWalkInAttendeeModal: React.FC<AddWalkInAttendeeModalProps> = ({
  open,
  onOpenChange,
  onAddAttendee,
  eventId,
  adminCampus,
  merch,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [formData, setFormData] = useState<WalkInAttendeeFormData>(() => ({
    studentId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    course: "",
    yearLevel: "",
    shirtSize: "",
    shirtPrice: "",
    campus: adminCampus ?? "",
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const isShirtFieldVisible = useMemo(
    () => shouldShowShirtFields(merch),
    [merch]
  );

  const shirtSizeOptions = useMemo(() => {
    if (!merch?.selectedSizes || typeof merch.selectedSizes !== "object") {
      return [];
    }
    return Object.keys(merch.selectedSizes);
  }, [merch]);

  // Debounce student search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchStudentsV2(trimmed);
        if (results) {
          setSearchResults(results);
          setShowSearchResults(results.length > 0);
        }
      } catch {
        // searchStudentsV2 already shows toast on error
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleChange = (field: keyof WalkInAttendeeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSelectStudent = (student: StudentSearchResult) => {
    // Strip campus suffix from id_number for the raw 8-digit input
    const baseId = student.id_number.split("-")[0]?.trim() ?? "";

    setFormData((prev) => ({
      ...prev,
      studentId: baseId,
      firstName: student.first_name ?? "",
      middleName: student.middle_name ?? "",
      lastName: student.last_name ?? "",
      email: student.email ?? "",
      course: student.course ?? "",
      yearLevel: student.year ? getYearLevelLabel(student.year) : "",
    }));
    setErrors({});
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!formData.studentId.trim()) {
      nextErrors.studentId = REQUIRED_MESSAGE;
    } else if (!validateId(formData.studentId).valid) {
      nextErrors.studentId = "Student ID must be exactly 8 digits";
    }

    const firstNameError = validateName(formData.firstName, "First name", true);
    if (firstNameError) {
      nextErrors.firstName = firstNameError;
    }

    const middleNameError = validateName(
      formData.middleName,
      "Middle name",
      false
    );
    if (middleNameError) {
      nextErrors.middleName = middleNameError;
    }

    const lastNameError = validateName(formData.lastName, "Last name", true);
    if (lastNameError) {
      nextErrors.lastName = lastNameError;
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      nextErrors.email = emailError;
    }

    if (!formData.course.trim()) {
      nextErrors.course = REQUIRED_MESSAGE;
    }

    if (!formData.yearLevel.trim()) {
      nextErrors.yearLevel = REQUIRED_MESSAGE;
    }

    if (isShirtFieldVisible && !formData.shirtSize.trim()) {
      nextErrors.shirtSize = REQUIRED_MESSAGE;
    }

    if (formData.shirtPrice.trim()) {
      const priceNum = Number(formData.shirtPrice);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        nextErrors.shirtPrice = "Price must be a non-negative number";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast("error", "Please complete required fields.");
      return;
    }

    setIsLoading(true);
    try {
      const payload: AddWalkInAttendeeV2Payload = {
        studentId: formData.studentId.trim(),
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        course: formData.course.trim(),
        yearLevel: formData.yearLevel,
        shirtSize: formData.shirtSize.trim() || undefined,
        shirtPrice: formData.shirtPrice.trim()
          ? Number(formData.shirtPrice)
          : 0,
      };

      const result: AddWalkInAttendeeV2Response | false =
        await addWalkInAttendeeV2(eventId, payload);

      if (result) {
        onAddAttendee?.(formData);
        handleReset();
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      studentId: "",
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      course: "",
      yearLevel: "",
      shirtSize: "",
      shirtPrice: "",
      campus: adminCampus ?? "",
    });
    setErrors({});
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setIsSearching(false);
    setIsPreviewMode(false);
  };

  const handleCancel = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleContinueToPreview = () => {
    if (!validateForm()) {
      showToast("error", "Please complete required fields.");
      return;
    }
    setIsPreviewMode(true);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleReset();
    }
    onOpenChange(nextOpen);
  };

  const previewFullName = [
    formData.firstName.trim(),
    formData.middleName.trim(),
    formData.lastName.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const previewInitials =
    `${formData.firstName.trim().charAt(0)}${formData.lastName
      .trim()
      .charAt(0)}`
      .toUpperCase()
      .trim();

  const previewRows: Array<{ label: string; value: string }> = [
    { label: "Student ID", value: formData.studentId.trim() || "--" },
    { label: "First Name", value: formData.firstName.trim() || "--" },
    { label: "Middle Name", value: formData.middleName.trim() || "--" },
    { label: "Last Name", value: formData.lastName.trim() || "--" },
    { label: "Email Address", value: formData.email.trim() || "--" },
    { label: "Course", value: formData.course.trim() || "--" },
    { label: "Year Level", value: formData.yearLevel.trim() || "--" },
  ];

  if (isShirtFieldVisible) {
    previewRows.push({
      label: "Shirt Size",
      value: formData.shirtSize.trim() || "--",
    });
  }
  previewRows.push({
    label: "Price",
    value: formData.shirtPrice.trim() ? `PHP ${formData.shirtPrice}` : "--",
  });

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="mx-auto flex max-h-[95vh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden !rounded-3xl p-0 sm:w-full sm:max-w-xl sm:rounded-xl"
        showCloseButton={false}
      >
        <DialogHeader className="flex-none px-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="mt-5 text-xl leading-6 font-semibold">
              {isPreviewMode ? "Preview Attendee" : "Add Attendee"}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {isPreviewMode ? (
            <div className="space-y-6">
              <div className="from-primary/10 to-primary/5 border-primary/20 rounded-2xl border bg-gradient-to-r p-4">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/15 text-primary flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold">
                    {previewInitials || "--"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold">
                      {previewFullName || "Unnamed Attendee"}
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {formData.email.trim() || "--"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Student ID:{" "}
                      <span className="font-mono">
                        {formData.studentId.trim() || "--"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border">
                <div className="bg-muted/20 space-y-0">
                  {previewRows.map((field, index) => (
                    <div
                      key={field.label}
                      className={`grid grid-cols-1 gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-4 ${
                        index !== previewRows.length - 1 ? "border-b" : ""
                      }`}
                    >
                      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        {field.label}
                      </p>
                      <p className="text-sm leading-6 break-words">
                        {field.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                <p className="text-xs leading-relaxed text-amber-900">
                  Please verify all values before submission. This walk-in
                  attendee will be registered for attendance tracking only and
                  will not receive a student account.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Student Search */}
              <div>
                <Label htmlFor="studentSearch" className="mb-2">
                  Search Existing Student
                </Label>
                <p className="text-muted-foreground mb-1 text-xs">
                  Search by student ID, first name, or last name to pre-fill the
                  form. Leave blank to enter manually.
                </p>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="studentSearch"
                    placeholder="Search student ID, first name, last name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowSearchResults(true);
                    }}
                    className="pl-9"
                  />
                  {isSearching && (
                    <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchQuery.trim() && (
                  <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border">
                    {searchResults.map((student) => (
                      <button
                        key={student.id_number}
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        className="hover:bg-muted/50 flex w-full items-start gap-3 px-3 py-2 text-left"
                      >
                        <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {student.first_name} {student.middle_name}{" "}
                            {student.last_name}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            ID: {student.id_number} • {student.course} - Year{" "}
                            {student.year}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery && !isSearching && searchResults.length === 0 && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    No students found. Fill in the form below manually.
                  </p>
                )}
              </div>

              {/* Student ID Number */}
              <div>
                <Label htmlFor="studentId" className="mb-2">
                  Student ID Number
                </Label>
                <Input
                  id="studentId"
                  placeholder="Enter 8-digit student ID"
                  value={formData.studentId}
                  onChange={(e) => handleChange("studentId", e.target.value)}
                  maxLength={8}
                />
                {errors.studentId ? (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.studentId}
                  </p>
                ) : null}
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="firstName" className="mb-2">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    maxLength={NAME_MAX_LENGTH}
                  />
                  {errors.firstName ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.firstName}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="middleName" className="mb-2">
                    Middle Name{" "}
                  </Label>
                  <Input
                    id="middleName"
                    placeholder="Enter middle name"
                    value={formData.middleName}
                    onChange={(e) => handleChange("middleName", e.target.value)}
                    maxLength={NAME_MAX_LENGTH}
                  />
                  {errors.middleName ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.middleName}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="lastName" className="mb-2">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    maxLength={NAME_MAX_LENGTH}
                  />
                  {errors.lastName ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.lastName}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Email Address */}
              <div>
                <Label htmlFor="email" className="mb-2">
                  Email Address{" "}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
                {errors.email ? (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              {/* Course, Year Level */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="course" className="mb-2">
                    Course
                  </Label>
                  <Select
                    value={formData.course}
                    onValueChange={(value) => handleChange("course", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {COURSE_OPTIONS.map((course) => (
                        <SelectItem key={course} value={course}>
                          {course}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.course ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.course}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="yearLevel" className="mb-2">
                    Year Level
                  </Label>
                  <Select
                    value={formData.yearLevel}
                    onValueChange={(value) => handleChange("yearLevel", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select year level" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_LEVEL_OPTIONS.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.yearLevel ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.yearLevel}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Shirt Size (conditional) */}
              {isShirtFieldVisible ? (
                <div>
                  <Label htmlFor="shirtSize" className="mb-2">
                    Shirt Size
                  </Label>
                  <Select
                    value={formData.shirtSize}
                    onValueChange={(value) => handleChange("shirtSize", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {shirtSizeOptions.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.shirtSize ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.shirtSize}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Price (optional for walk-in, defaults to 0) */}
              <div>
                <Label htmlFor="shirtPrice" className="mb-2">
                  Price{" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    id="shirtPrice"
                    type="number"
                    placeholder="Enter price"
                    value={formData.shirtPrice}
                    onChange={(e) => handleChange("shirtPrice", e.target.value)}
                    className="pr-12"
                    min="0"
                  />
                  <div className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm font-medium">
                    PHP
                  </div>
                </div>
                {errors.shirtPrice ? (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.shirtPrice}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-background flex flex-none items-center justify-end gap-3 px-6 py-4">
          {isPreviewMode ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsPreviewMode(false)}
                disabled={isLoading}
              >
                Back to Edit
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-[#1C9DDE] hover:bg-[#1C9DDE]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Attendee...
                  </>
                ) : (
                  "Confirm & Add Attendee"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleContinueToPreview}
                className="bg-[#1C9DDE] hover:bg-[#1C9DDE]"
                disabled={isLoading}
              >
                Preview Details
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
