import React, { useEffect, useMemo, useState } from "react";
import { X, Eye, EyeOff, Loader2, Info } from "lucide-react";
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
import { addAttendeeV2 } from "@/features/events/api/eventService";
import type { EventMerchMeta } from "@/features/events/types/event.types";

interface AddAttendeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAttendee?: (attendee: AttendeeFormData) => void;
  eventId: string;
  adminCampus?: string;
  merch?: EventMerchMeta | null;
}

export interface AttendeeFormData {
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
  password: string;
  confirmPassword: string;
}

const CAMPUS_ID_SUFFIX_LABELS: Record<string, string> = {
  "UC_BANILAD": "ucb",
  "UC_LM": "uclm",
  "UC_PT": "ucpt",
};

const COURSE_OPTIONS = ["BSIT", "BSCS", "ACT"];
const YEAR_LEVEL_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const REQUIRED_MESSAGE = "This field is required";

// Validation constants
const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'.,-]+$/;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_NUMBER_REGEX = /[0-9]/;
const PASSWORD_SYMBOL_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

type FormErrors = Partial<Record<keyof AttendeeFormData, string>>;

const shouldShowShirtFields = (merch?: EventMerchMeta | null): boolean => {
  if (!merch) return false;
  return merch.category === "ict-congress" && merch.type === "Tshirt w/ Bundle";
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
    return REQUIRED_MESSAGE;
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return "Please enter a valid email address";
  }

  return undefined;
};

const validatePassword = (value: string): string | undefined => {
  if (!value) {
    return REQUIRED_MESSAGE;
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }

  if (!PASSWORD_UPPERCASE_REGEX.test(value)) {
    return "Password must include at least 1 uppercase letter";
  }

  if (!PASSWORD_LOWERCASE_REGEX.test(value)) {
    return "Password must include at least 1 lowercase letter";
  }

  if (!PASSWORD_NUMBER_REGEX.test(value)) {
    return "Password must include at least 1 number";
  }

  if (!PASSWORD_SYMBOL_REGEX.test(value)) {
    return "Password must include at least 1 symbol (e.g., #, -, @)";
  }

  return undefined;
};

export const AddAttendeeModal: React.FC<AddAttendeeModalProps> = ({
  open,
  onOpenChange,
  onAddAttendee,
  eventId,
  adminCampus,
  merch,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<AttendeeFormData>({
    studentId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    campus: "",
    course: "",
    yearLevel: "",
    shirtSize: "",
    shirtPrice: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const suffixLabel = adminCampus ? CAMPUS_ID_SUFFIX_LABELS[adminCampus] : null;

  useEffect(() => {
    if (!adminCampus) return;

    setFormData((prev) => ({
      ...prev,
      campus: adminCampus,
    }));
  }, [adminCampus]);

  useEffect(() => {
    if (!isShirtFieldVisible) {
      setFormData((prev) => ({
        ...prev,
        shirtSize: "",
      }));
    }
  }, [isShirtFieldVisible]);

  const handleChange = (field: keyof AttendeeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!formData.studentId.trim()) {
      nextErrors.studentId = REQUIRED_MESSAGE;
    } else if (!validateId(formData.studentId).valid) {
      nextErrors.studentId = "Student ID must be exactly 8 digits";
    }

    // First Name validation
    const firstNameError = validateName(formData.firstName, "First name", true);
    if (firstNameError) {
      nextErrors.firstName = firstNameError;
    }

    // Middle Name validation (optional)
    const middleNameError = validateName(
      formData.middleName,
      "Middle name",
      false
    );
    if (middleNameError) {
      nextErrors.middleName = middleNameError;
    }

    // Last Name validation
    const lastNameError = validateName(formData.lastName, "Last name", true);
    if (lastNameError) {
      nextErrors.lastName = lastNameError;
    }

    // Email validation
    const emailError = validateEmail(formData.email);
    if (emailError) {
      nextErrors.email = emailError;
    }

    if (!formData.campus.trim()) {
      nextErrors.campus = REQUIRED_MESSAGE;
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

    // Price validation (always required)
    if (!formData.shirtPrice.trim()) {
      nextErrors.shirtPrice = REQUIRED_MESSAGE;
    } else {
      const priceNum = Number(formData.shirtPrice);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        nextErrors.shirtPrice = "Price must be a non-negative number";
      }
    }

    // Password validation
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      nextErrors.password = passwordError;
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = REQUIRED_MESSAGE;
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
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
      const result = await addAttendeeV2(eventId, {
        studentId: formData.studentId.trim(),
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        course: formData.course.trim(),
        yearLevel: formData.yearLevel,
        shirtSize: formData.shirtSize.trim() || undefined,
        shirtPrice: Number(formData.shirtPrice),
        password: formData.password,
      });

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
      campus: adminCampus ?? "",
      course: "",
      yearLevel: "",
      shirtSize: "",
      shirtPrice: "",
      password: "",
      confirmPassword: "",
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
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
    { label: "Campus", value: formData.campus.trim() || "--" },
    { label: "Course", value: formData.course.trim() || "--" },
    { label: "Year Level", value: formData.yearLevel.trim() || "--" },
    { label: "Initial Password", value: formData.password || "--" },
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
        className="flex max-h-[80vh] w-full max-w-4xl flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-w-2xl sm:rounded-xl"
        showCloseButton={false}
      >
        <DialogHeader className="flex-none border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl leading-6 font-semibold">
              {isPreviewMode ? "Preview Attendee Details" : "Add Attendee"}
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
              <div className="from-primary/10 to-primary/5 border-primary/20 rounded-xl border bg-gradient-to-r p-4">
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
                  Please verify all values before submission. Accurate attendee
                  records reduce account duplication, failed notifications, and
                  reconciliation conflicts across modules.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Credential note for campuses with suffixed IDs */}
              {suffixLabel && (
                <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <p className="text-xs leading-relaxed text-blue-900">
                    This student&apos;s login credentials will use the
                    campus-suffixed ID format (e.g., 21123456-{suffixLabel} for{" "}
                    {adminCampus}). Please ensure the student is aware of their
                    full login ID.
                  </p>
                </div>
              )}

              {/* Student ID Number */}
              <div>
                <Label htmlFor="studentId" className="mb-2">
                  Student ID Number
                </Label>
                <Input
                  id="studentId"
                  placeholder="Enter student ID number"
                  value={formData.studentId}
                  onChange={(e) => handleChange("studentId", e.target.value)}
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
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
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
                  Email Address
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

              {/* Campus, Course, Year Level */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="campus" className="mb-2">
                    Campus
                  </Label>
                  <Input
                    id="campus"
                    value={formData.campus}
                    disabled
                    readOnly
                    placeholder="Campus"
                  />
                  {errors.campus ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.campus}
                    </p>
                  ) : null}
                </div>
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

              {/* Price (always visible and editable) */}
              <div>
                <Label htmlFor="shirtPrice" className="mb-2">
                  Price
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

              {/* Password Fields */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="password" className="mb-2">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute top-1/2 right-2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.password}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground mt-1 text-xs">
                    Min. 8 characters with uppercase, lowercase, number & symbol
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="mb-2">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleChange("confirmPassword", e.target.value)
                      }
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute top-1/2 right-2 -translate-y-1/2"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.confirmPassword ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.confirmPassword}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-background flex flex-none items-center justify-end gap-3 border-t px-6 py-4">
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
