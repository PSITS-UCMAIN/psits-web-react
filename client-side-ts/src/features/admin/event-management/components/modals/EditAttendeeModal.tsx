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
import {
  getEditableAttendee,
  editAttendeeV2,
} from "@/features/events/api/eventService";
import type {
  EventMerchMeta,
  EditableAttendeeData,
} from "@/features/events/types/event.types";

interface EditAttendeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditComplete?: () => void;
  eventId: string;
  attendeeIdNumber: string;
  adminCampus?: string;
  merch?: EventMerchMeta | null;
}

interface EditFormData {
  studentId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  course: string;
  yearLevel: string;
  shirtSize: string;
  shirtPrice: string;
}

const COURSE_OPTIONS = ["BSIT", "BSCS", "ACT"];
const YEAR_LEVEL_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const REQUIRED_MESSAGE = "This field is required";
const EDIT_CONFIRMATION_PHRASE =
  "I confirm that the edited fields are correct.";

const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'.,-]+$/;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

type FormErrors = Partial<
  Record<keyof EditFormData | "adminPassword" | "confirmationPhrase", string>
>;

const CAMPUS_ID_SUFFIX_LABELS: Record<string, string> = {
  UC_BANILAD: "ucb",
  UC_LM: "uclm",
  UC_PT: "ucpt",
};

const shouldShowShirtFields = (merch?: EventMerchMeta | null): boolean => {
  if (!merch) return false;
  return merch.category === "ict-congress" && merch.type === "Tshirt w/ Bundle";
};

const validateName = (
  value: string,
  fieldLabel: string,
  isRequired: boolean = true
): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return isRequired ? REQUIRED_MESSAGE : undefined;
  if (trimmed.length < NAME_MIN_LENGTH)
    return `${fieldLabel} must be at least ${NAME_MIN_LENGTH} characters`;
  if (trimmed.length > NAME_MAX_LENGTH)
    return `${fieldLabel} must not exceed ${NAME_MAX_LENGTH} characters`;
  if (!NAME_REGEX.test(trimmed))
    return `${fieldLabel} contains invalid characters`;
  return undefined;
};

const validateEmail = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return REQUIRED_MESSAGE;
  if (!EMAIL_REGEX.test(trimmed)) return "Please enter a valid email address";
  return undefined;
};

const yearNumberToLabel = (year: number): string => {
  const labels: Record<number, string> = {
    1: "1st Year",
    2: "2nd Year",
    3: "3rd Year",
    4: "4th Year",
  };
  return labels[year] ?? "";
};

export const EditAttendeeModal: React.FC<EditAttendeeModalProps> = ({
  open,
  onOpenChange,
  onEditComplete,
  eventId,
  attendeeIdNumber,
  adminCampus,
  merch,
}) => {
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<EditableAttendeeData | null>(
    null
  );
  const [formData, setFormData] = useState<EditFormData>({
    studentId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    course: "",
    yearLevel: "",
    shirtSize: "",
    shirtPrice: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");

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

  // Fetch editable data when modal opens
  useEffect(() => {
    if (!open || !eventId || !attendeeIdNumber) return;

    let isMounted = true;

    const fetchData = async () => {
      setIsLoadingData(true);
      setLoadError(null);

      const result = await getEditableAttendee(eventId, attendeeIdNumber);

      if (!isMounted) return;

      if (!result) {
        setLoadError("Unable to load attendee details.");
        setIsLoadingData(false);
        return;
      }

      const data = result.data;
      setOriginalData(data);
      setFormData({
        studentId: data.baseIdNumber,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        email: data.email,
        course: data.course,
        yearLevel: yearNumberToLabel(data.year),
        shirtSize: data.shirtSize,
        shirtPrice: data.shirtPrice.toString(),
      });
      setIsLoadingData(false);
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [open, eventId, attendeeIdNumber]);

  const handleChange = (field: keyof EditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const getChangedFields = (): Record<string, unknown> => {
    if (!originalData) return {};

    const changes: Record<string, unknown> = {};

    if (formData.studentId.trim() !== originalData.baseIdNumber) {
      changes.studentId = formData.studentId.trim();
    }
    if (formData.firstName.trim() !== originalData.firstName) {
      changes.firstName = formData.firstName.trim();
    }
    if (formData.middleName.trim() !== originalData.middleName) {
      changes.middleName = formData.middleName.trim();
    }
    if (formData.lastName.trim() !== originalData.lastName) {
      changes.lastName = formData.lastName.trim();
    }
    if (formData.email.trim() !== originalData.email) {
      changes.email = formData.email.trim();
    }
    if (formData.course.trim() !== originalData.course) {
      changes.course = formData.course.trim();
    }

    const originalYearLabel = yearNumberToLabel(originalData.year);
    if (formData.yearLevel !== originalYearLabel) {
      changes.yearLevel = formData.yearLevel;
    }

    if (formData.shirtSize.trim() !== originalData.shirtSize) {
      changes.shirtSize = formData.shirtSize.trim();
    }

    const newPrice = Number(formData.shirtPrice);
    if (Number.isFinite(newPrice) && newPrice !== originalData.shirtPrice) {
      changes.shirtPrice = newPrice;
    }

    return changes;
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!formData.studentId.trim()) {
      nextErrors.studentId = REQUIRED_MESSAGE;
    } else if (!validateId(formData.studentId).valid) {
      nextErrors.studentId =
        "Student ID must be exactly a numeric 8-digit value (e.g. 20201234)";
    }

    const firstNameError = validateName(formData.firstName, "First name", true);
    if (firstNameError) nextErrors.firstName = firstNameError;

    const middleNameError = validateName(
      formData.middleName,
      "Middle name",
      false
    );
    if (middleNameError) nextErrors.middleName = middleNameError;

    const lastNameError = validateName(formData.lastName, "Last name", true);
    if (lastNameError) nextErrors.lastName = lastNameError;

    const emailError = validateEmail(formData.email);
    if (emailError) nextErrors.email = emailError;

    if (!formData.course.trim()) nextErrors.course = REQUIRED_MESSAGE;
    if (!formData.yearLevel.trim()) nextErrors.yearLevel = REQUIRED_MESSAGE;

    if (isShirtFieldVisible && !formData.shirtSize.trim()) {
      nextErrors.shirtSize = REQUIRED_MESSAGE;
    }

    if (!formData.shirtPrice.trim()) {
      nextErrors.shirtPrice = REQUIRED_MESSAGE;
    } else {
      const priceNum = Number(formData.shirtPrice);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        nextErrors.shirtPrice = "Price must be a non-negative number";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateConfirmation = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!adminPassword.trim()) {
      nextErrors.adminPassword = "Admin password is required";
    }

    if (confirmationPhrase !== EDIT_CONFIRMATION_PHRASE) {
      nextErrors.confirmationPhrase = "Confirmation phrase does not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinueToConfirm = () => {
    if (!validateForm()) {
      showToast("error", "Please fix the errors before continuing.");
      return;
    }

    const changes = getChangedFields();
    if (Object.keys(changes).length === 0) {
      showToast("error", "No changes detected.");
      return;
    }

    setStep("confirm");
  };

  const handleSubmit = async () => {
    if (!validateConfirmation()) return;

    const changes = getChangedFields();
    if (Object.keys(changes).length === 0) {
      showToast("error", "No changes detected.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await editAttendeeV2(eventId, attendeeIdNumber, {
        adminPassword: adminPassword.trim(),
        confirmationPhrase,
        changes,
      });

      if (result) {
        onEditComplete?.();
        handleReset();
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
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
    });
    setErrors({});
    setStep("edit");
    setAdminPassword("");
    setShowAdminPassword(false);
    setConfirmationPhrase("");
    setOriginalData(null);
    setLoadError(null);
  };

  const handleCancel = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleReset();
    }
    onOpenChange(nextOpen);
  };

  const changedFields = getChangedFields();
  const changedFieldKeys = Object.keys(changedFields);

  const isFieldChanged = (field: string): boolean => {
    return changedFieldKeys.includes(field);
  };

  const changedFieldLabel: Record<string, string> = {
    studentId: "Student ID",
    firstName: "First Name",
    middleName: "Middle Name",
    lastName: "Last Name",
    email: "Email Address",
    course: "Course",
    yearLevel: "Year Level",
    shirtSize: "Shirt Size",
    shirtPrice: "Price",
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="flex max-h-[80vh] w-full max-w-4xl flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-w-2xl sm:rounded-xl"
        showCloseButton={false}
      >
        <DialogHeader className="flex-none border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl leading-6 font-semibold">
              {step === "confirm" ? "Confirm Changes" : "Edit Attendee"}
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
          {isLoadingData ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="text-muted-foreground text-sm">
                Loading attendee details...
              </div>
            </div>
          ) : loadError ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
              <p className="text-sm font-medium">{loadError}</p>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="cursor-pointer"
              >
                Close
              </Button>
            </div>
          ) : step === "confirm" ? (
            <div className="space-y-6">
              {/* Changed fields summary */}
              <div>
                <h4 className="mb-3 text-sm font-semibold">
                  Fields to be updated
                </h4>
                <div className="rounded-xl border">
                  <div className="space-y-0">
                    {changedFieldKeys.map((key, index) => (
                      <div
                        key={key}
                        className={`grid grid-cols-1 gap-1 px-4 py-3 md:grid-cols-[180px_1fr_1fr] md:gap-4 ${
                          index !== changedFieldKeys.length - 1
                            ? "border-b"
                            : ""
                        }`}
                      >
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          {changedFieldLabel[key] ?? key}
                        </p>
                        <p className="text-sm line-through opacity-50">
                          {key === "shirtPrice"
                            ? `PHP ${originalData?.shirtPrice ?? 0}`
                            : key === "yearLevel"
                              ? yearNumberToLabel(originalData?.year ?? 0)
                              : key === "studentId"
                                ? (originalData?.baseIdNumber ?? "")
                                : String(
                                    (
                                      originalData as unknown as Record<
                                        string,
                                        unknown
                                      >
                                    )?.[key] ?? ""
                                  )}
                        </p>
                        <p className="text-sm font-medium">
                          {key === "shirtPrice"
                            ? `PHP ${changedFields[key]}`
                            : String(changedFields[key] ?? "")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Admin password */}
              <div>
                <Label htmlFor="adminPassword" className="mb-2">
                  Admin Password
                </Label>
                <div className="relative">
                  <Input
                    id="adminPassword"
                    type={showAdminPassword ? "text" : "password"}
                    placeholder="Enter your admin password"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setErrors((prev) => ({
                        ...prev,
                        adminPassword: undefined,
                      }));
                    }}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-2 -translate-y-1/2"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                  >
                    {showAdminPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.adminPassword ? (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.adminPassword}
                  </p>
                ) : null}
              </div>

              {/* Confirmation phrase */}
              <div>
                <Label htmlFor="confirmationPhrase" className="mb-2">
                  Confirmation Phrase
                </Label>
                <p className="text-muted-foreground mb-2 text-xs">
                  Type exactly:{" "}
                  <span className="font-mono font-medium">
                    {EDIT_CONFIRMATION_PHRASE}
                  </span>
                </p>
                <Input
                  id="confirmationPhrase"
                  placeholder="Type the confirmation phrase"
                  value={confirmationPhrase}
                  onChange={(e) => {
                    setConfirmationPhrase(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      confirmationPhrase: undefined,
                    }));
                  }}
                />
                {errors.confirmationPhrase ? (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.confirmationPhrase}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                <p className="text-xs leading-relaxed text-amber-900">
                  This action will update the attendee record and the
                  corresponding student account. Please ensure all changes are
                  accurate before confirming.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Credential note */}
              {suffixLabel && (
                <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <p className="text-xs leading-relaxed text-blue-900">
                    This student&apos;s login credentials use the
                    campus-suffixed ID format (e.g., 21419890-{suffixLabel} for{" "}
                    {adminCampus}). Changes to the Student ID will update their
                    login credentials accordingly.
                  </p>
                </div>
              )}

              {/* Student ID Number */}
              <div>
                <Label htmlFor="editStudentId" className="mb-2">
                  Student ID Number
                </Label>
                <div className="relative">
                  <Input
                    id="editStudentId"
                    placeholder="Enter student ID number"
                    value={formData.studentId}
                    onChange={(e) => handleChange("studentId", e.target.value)}
                    className={
                      isFieldChanged("studentId")
                        ? "border-blue-400 bg-blue-50/30"
                        : ""
                    }
                  />
                </div>
                {errors.studentId ? (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.studentId}
                  </p>
                ) : null}
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="editFirstName" className="mb-2">
                    First Name
                  </Label>
                  <Input
                    id="editFirstName"
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    maxLength={NAME_MAX_LENGTH}
                    className={
                      isFieldChanged("firstName")
                        ? "border-blue-400 bg-blue-50/30"
                        : ""
                    }
                  />
                  {errors.firstName ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.firstName}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="editMiddleName" className="mb-2">
                    Middle Name{" "}
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <Input
                    id="editMiddleName"
                    placeholder="Enter middle name"
                    value={formData.middleName}
                    onChange={(e) => handleChange("middleName", e.target.value)}
                    maxLength={NAME_MAX_LENGTH}
                    className={
                      isFieldChanged("middleName")
                        ? "border-blue-400 bg-blue-50/30"
                        : ""
                    }
                  />
                  {errors.middleName ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.middleName}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="editLastName" className="mb-2">
                    Last Name
                  </Label>
                  <Input
                    id="editLastName"
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    maxLength={NAME_MAX_LENGTH}
                    className={
                      isFieldChanged("lastName")
                        ? "border-blue-400 bg-blue-50/30"
                        : ""
                    }
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
                <Label htmlFor="editEmail" className="mb-2">
                  Email Address
                </Label>
                <Input
                  id="editEmail"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className={
                    isFieldChanged("email")
                      ? "border-blue-400 bg-blue-50/30"
                      : ""
                  }
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
                  <Label htmlFor="editCampus" className="mb-2">
                    Campus
                  </Label>
                  <Input
                    id="editCampus"
                    value={originalData?.campus ?? adminCampus ?? ""}
                    disabled
                    readOnly
                    placeholder="Campus"
                  />
                </div>
                <div>
                  <Label htmlFor="editCourse" className="mb-2">
                    Course
                  </Label>
                  <Select
                    value={formData.course}
                    onValueChange={(value) => handleChange("course", value)}
                  >
                    <SelectTrigger
                      className={`w-full ${
                        isFieldChanged("course")
                          ? "border-blue-400 bg-blue-50/30"
                          : ""
                      }`}
                    >
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
                  <Label htmlFor="editYearLevel" className="mb-2">
                    Year Level
                  </Label>
                  <Select
                    value={formData.yearLevel}
                    onValueChange={(value) => handleChange("yearLevel", value)}
                  >
                    <SelectTrigger
                      className={`w-full ${
                        isFieldChanged("yearLevel")
                          ? "border-blue-400 bg-blue-50/30"
                          : ""
                      }`}
                    >
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
                  <Label htmlFor="editShirtSize" className="mb-2">
                    Shirt Size
                  </Label>
                  <Select
                    value={formData.shirtSize}
                    onValueChange={(value) => handleChange("shirtSize", value)}
                  >
                    <SelectTrigger
                      className={`w-full ${
                        isFieldChanged("shirtSize")
                          ? "border-blue-400 bg-blue-50/30"
                          : ""
                      }`}
                    >
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

              {/* Price */}
              <div>
                <Label htmlFor="editShirtPrice" className="mb-2">
                  Price
                </Label>
                <div className="relative">
                  <Input
                    id="editShirtPrice"
                    type="number"
                    placeholder="Enter price"
                    value={formData.shirtPrice}
                    onChange={(e) => handleChange("shirtPrice", e.target.value)}
                    className={`pr-12 ${
                      isFieldChanged("shirtPrice")
                        ? "border-blue-400 bg-blue-50/30"
                        : ""
                    }`}
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
        {!isLoadingData && !loadError && (
          <div className="bg-background flex flex-none items-center justify-end gap-3 border-t px-6 py-4">
            {step === "confirm" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("edit");
                    setErrors({});
                  }}
                  disabled={isSubmitting}
                >
                  Back to Edit
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="bg-[#1C9DDE] hover:bg-[#1C9DDE]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    "Confirm & Save Changes"
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleContinueToConfirm}
                  className="bg-[#1C9DDE] hover:bg-[#1C9DDE]"
                  disabled={isSubmitting}
                >
                  Review Changes
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
