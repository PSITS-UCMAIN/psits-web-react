import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/features/auth";
import { getStudentProfileV2 } from "@/features/student";
import {
  listPositions,
  submitApplication,
  getApplicationsForUser,
} from "@/api/recruitment.api";
import type { Application, RecruitmentPosition } from "@/types/recruitment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Upload, Check, X } from "lucide-react";
import { toast } from "sonner";

const COURSES = ["BSIT", "BSCS"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const POSITIONS_PAGE_LIMIT = 100;
const ROLE_CARDS_PER_PAGE = 6;
const ROLE_CATEGORIES = [
  "All",
  "Officer",
  "Media",
  "Devs",
  "Associate(Volunteer)",
] as const;
type RoleCategory = (typeof ROLE_CATEGORIES)[number];
const YEAR_MAP: Record<string, string> = {
  "1": "1st Year",
  "2": "2nd Year",
  "3": "3rd Year",
  "4": "4th Year",
};

const getPositionTimestamp = (position: RecruitmentPosition) => {
  const timestamp = new Date(
    position.updatedAt || position.createdAt
  ).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatApplicationDeadline = (value?: string) => {
  if (!value) return null;

  const deadline = new Date(value);
  if (!Number.isFinite(deadline.getTime())) return null;

  return deadline.toLocaleDateString();
};

const normalizePositionLabel = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const getPositionKey = (role: string, position: string | null) =>
  `${normalizePositionLabel(role)}:${normalizePositionLabel(position || role)}`;

const getPositionCategory = (position: RecruitmentPosition): RoleCategory => {
  const title = position.title.toLowerCase();

  if (title.includes("officer")) return "Officer";
  if (title.includes("media") || title.includes("videographer")) {
    return "Media";
  }
  if (title.includes("associate") || title.includes("volunteer")) {
    return "Associate(Volunteer)";
  }
  if (title.includes("developer") || title.includes("dev")) return "Devs";

  return "All";
};

const parsePositionTitle = (title: string) => {
  const [base, ...rest] = title.split(" - ");
  return {
    baseRole: base.trim(),
    subLabel: rest.length > 0 ? rest.join(" - ").trim() : null,
  };
};

const isPositionCurrentlyOpen = (position?: RecruitmentPosition) => {
  if (
    !position ||
    position.isActive === false ||
    position.hiringStatus !== "OPEN"
  ) {
    return false;
  }

  const now = Date.now();

  const opensAt = position.applicationOpensAt
    ? new Date(position.applicationOpensAt).getTime()
    : null;
  if (opensAt && Number.isFinite(opensAt) && now < opensAt) return false;

  const deadline = position.applicationDeadline
    ? new Date(position.applicationDeadline).getTime()
    : null;
  if (deadline && Number.isFinite(deadline) && deadline < now) return false;

  return true;
};

type StatusStep = {
  key: string;
  label: string;
  description: string;
};

const STATUS_STEPS: StatusStep[] = [
  {
    key: "SUBMITTED",
    label: "Submitted",
    description: "Your application has been received and is pending review.",
  },
  {
    key: "UNDER_REVIEW",
    label: "Under review",
    description:
      "Your application is being reviewed by the PSITS team before the interview stage.",
  },
  {
    key: "INTERVIEW_SCHEDULED",
    label: "Set schedule",
    description: "An interview schedule has been assigned to your application.",
  },
  {
    key: "INTERVIEWING",
    label: "Interview",
    description: "Your interview is currently being completed and evaluated.",
  },
  {
    key: "APPROVED",
    label: "Decision Pending",
    description:
      "Your application is now waiting for the final approval decision.",
  },
  {
    key: "DONE",
    label: "Approved",
    description:
      "Congratulations! Your application has been approved. Please check your email for the next steps.",
  },
];

const REJECTED_STEP: StatusStep = {
  key: "REJECTED",
  label: "Rejected",
  description:
    "Thank you for your interest. We encourage you to apply again in the future.",
};

function formatInterviewDate(date: Date | null) {
  if (!date) return "";

  return date.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function normalizeInterviewEndLabel(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const timeOnlyMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/i);
  if (timeOnlyMatch) {
    const hour = Number(timeOnlyMatch[1]);
    const minute = Number(timeOnlyMatch[2]);

    if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
      const suffix = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
    }
  }

  return trimmed;
}

function parseInterviewNotes(notes?: string) {
  const officerMatch = notes?.match(/officer in charge:\s*(.+?)(?:;|$)/i);
  const typeMatch = notes?.match(/interview type:\s*(.+?)(?:;|$)/i);
  const startsMatch = notes?.match(/starts\s*([^;]+)$/i);
  const endsMatch = notes?.match(/ends\s*([^;]+)$/i);

  return {
    officer: officerMatch?.[1]?.trim() ?? "",
    type: typeMatch?.[1]?.trim() ?? "",
    starts: normalizeInterviewEndLabel(startsMatch?.[1]?.trim()),
    ends: normalizeInterviewEndLabel(endsMatch?.[1]?.trim()),
  };
}

const ApplicationStatus = ({
  application,
  onReapply,
}: {
  application: Application;
  onReapply?: () => void;
}) => {
  const isRejected = application.status === "REJECTED";
  const isApproved = application.status === "APPROVED";
  const interviewDate = application.interview?.scheduledAt
    ? new Date(application.interview.scheduledAt)
    : null;
  const interviewNotes = application.interview?.notes;
  const interviewStatus = application.interview?.status;
  const parsedInterviewNotes = parseInterviewNotes(interviewNotes);
  const interviewOfficer = parsedInterviewNotes.officer || "";
  const interviewType = parsedInterviewNotes.type || "";
  const interviewStartTime = parsedInterviewNotes.starts || "";
  const interviewEndTime = parsedInterviewNotes.ends || "";
  const isInterviewCompleted = interviewStatus === "COMPLETED";
  const isDecisionPending =
    application.status === "INTERVIEWING" && isInterviewCompleted;
  const latestDecision = application.statusHistory
    ?.slice()
    .sort(
      (a, b) =>
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    )
    .find((item) => item.status === "APPROVED" || item.status === "REJECTED");

  const currentStep = (() => {
    switch (application.status) {
      case "SUBMITTED":
        return 1;

      case "INTERVIEW_SCHEDULED":
        return 2;

      case "INTERVIEWING":
        return isDecisionPending ? 4 : 3;

      case "APPROVED":
        return 5;

      case "REJECTED":
        return 5;

      default:
        return 0;
    }
  })();

  const steps = isRejected
    ? [...STATUS_STEPS.slice(0, 5), REJECTED_STEP]
    : STATUS_STEPS;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">Application Status</h2>

      <div className="mt-2 mb-5 h-[1.5px] w-full bg-sky-400" />

      <div className="relative">
        {steps.map((step, index) => {
          const active = index <= currentStep;
          const isCurrent = index === currentStep;
          const rejectedHere = isRejected && isCurrent;

          const shouldShowDescription =
            isCurrent || rejectedHere || (index === 0 && currentStep === 1);

          return (
            <div
              key={step.label}
              className="relative flex items-start gap-3 pb-3 last:pb-0"
            >
              {/* Vertical line */}
              {index !== steps.length - 1 && (
                <div
                  className={`absolute top-6 left-[11px] h-full w-[2px] ${
                    index < currentStep ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
              )}

              {/* Filled circle marker */}
              <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                {rejectedHere ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 p-[3px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white p-[2px]">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-red-500">
                        <X className="h-3 w-3 text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                ) : active ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 p-[3px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white p-[2px]">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-green-500">
                        <Check
                          className="h-3 w-3 text-white"
                          strokeWidth={2.5}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 p-[3px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white p-[2px]">
                      <div className="h-full w-full rounded-full bg-gray-300" />
                    </div>
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="pt-0.5">
                <p
                  className={`text-base ${
                    isCurrent || rejectedHere
                      ? "font-semibold text-gray-900"
                      : active
                        ? "font-medium text-gray-900"
                        : "font-normal text-gray-400"
                  }`}
                >
                  {step.label}
                </p>

                {shouldShowDescription && step.description && (
                  <p className="mt-0.5 text-sm text-gray-500">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(application.interview || interviewDate || interviewOfficer) &&
        (application.status === "INTERVIEW_SCHEDULED" ||
          application.status === "INTERVIEWING") && (
          <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-slate-700">
            <p className="mb-2 font-semibold text-sky-800">Interview details</p>
            {interviewDate && (
              <p>
                <span className="font-medium">Scheduled:</span>{" "}
                {formatInterviewDate(interviewDate)}
              </p>
            )}
            {interviewOfficer && (
              <p>
                <span className="font-medium">Officer in charge:</span>{" "}
                {interviewOfficer}
              </p>
            )}
            {interviewStatus && (
              <p>
                <span className="font-medium">Interview status:</span>{" "}
                {interviewStatus}
              </p>
            )}
            {interviewType && (
              <p>
                <span className="font-medium">Interview type:</span>{" "}
                {interviewType}
              </p>
            )}
            {interviewStartTime && (
              <p>
                <span className="font-medium">Starts:</span>{" "}
                {interviewStartTime}
              </p>
            )}
            {interviewEndTime && (
              <p>
                <span className="font-medium">Ends:</span> {interviewEndTime}
              </p>
            )}
          </div>
        )}

      {(isApproved || isRejected) && latestDecision && (
        <div
          className={`mt-6 rounded-2xl border p-4 text-sm ${
            isApproved
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <p className="mb-1 font-semibold">
            {isApproved
              ? "Final decision: Approved"
              : "Final decision: Rejected"}
          </p>
          <p>
            {latestDecision.note ||
              (isApproved
                ? "Congratulations! You have been accepted."
                : "Thank you for your interest. We encourage you to apply again in the future.")}
          </p>
        </div>
      )}

      {isRejected && onReapply && (
        <div className="mt-6 flex justify-center border-t border-gray-100 pt-5">
          <Button type="button" onClick={onReapply} className="w-full max-w-xs">
            Apply Again
          </Button>
        </div>
      )}
    </div>
  );
};

export const ApplicationPage = () => {
  const { user } = useAuth();

  const [positions, setPositions] = useState<RecruitmentPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [positionsLoadFailed, setPositionsLoadFailed] = useState(false);

  const [existingApplication, setExistingApplication] =
    useState<Application | null>(null);
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  // When a rejected applicant chooses to reapply, we keep
  // `existingApplication` around (still REJECTED) but show the form
  // instead of the status page until they submit a new application.
  const [reapplying, setReapplying] = useState(false);

  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [roleCardsPage, setRoleCardsPage] = useState(1);
  const [roleSearch, setRoleSearch] = useState("");
  const [activeRoleCategory, setActiveRoleCategory] =
    useState<RoleCategory>("All");
  const [requirementsDialogPosition, setRequirementsDialogPosition] =
    useState<RecruitmentPosition | null>(null);
  const [subPosition, setSubPosition] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [resume, setResume] = useState<File | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [form, setForm] = useState({
    studentId: "",
    lastName: "",
    middleName: "",
    firstName: "",
    email: "",
    course: "",
    year: "",
  });

  // Profile details come from the server (login session) and are read-only
  // for the student; they cannot be edited on the application form.
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.idNumber) {
        setProfileLoading(false);
        return;
      }
      try {
        const profile = await getStudentProfileV2(user.idNumber);
        setForm({
          studentId: profile.id_number || "",
          firstName: profile.first_name || "",
          middleName: profile.middle_name || "",
          lastName: profile.last_name || "",
          email: profile.email || "",
          course: profile.course || "",
          year: YEAR_MAP[String(profile.year)] || "",
        });
      } catch (err) {
        console.error("Failed to load student profile:", err);
        toast.error("Couldn't load your profile. Refresh to retry.");
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user?.idNumber]);

  // Sync the logged-in user's profile fields into the form the first time
  // `user` becomes available (or changes identity). Adjusting state during
  // render — rather than in a useEffect — avoids the extra "commit, then
  // re-render" pass that react-hooks/set-state-in-effect warns about — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [loadedUser, setLoadedUser] = useState(user);
  if (user && user !== loadedUser) {
    setLoadedUser(user);
    setForm((prev) => ({
      ...prev,
      studentId: user.idNumber || prev.studentId,
      email: user.email || prev.email,
      course: user.course || prev.course,
      year:
        user.year !== undefined
          ? YEAR_MAP[String(user.year)] || prev.year
          : prev.year,
      ...(user.name
        ? (() => {
            const parts = user.name.trim().split(/\s+/);
            return {
              firstName: parts[0] || prev.firstName,
              lastName:
                parts.length > 1 ? parts[parts.length - 1] : prev.lastName,
            };
          })()
        : {}),
    }));
  }

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const firstPage = await listPositions({
          status: "OPEN",
          page: 1,
          limit: POSITIONS_PAGE_LIMIT,
        });
        const firstPayload = firstPage.data.data;
        const allPositions: RecruitmentPosition[] = [
          ...(firstPayload?.positions || []),
        ];
        const totalPages = Number(firstPayload?.pagination?.totalPages || 1);

        if (totalPages > 1) {
          const remainingPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              listPositions({
                status: "OPEN",
                page: index + 2,
                limit: POSITIONS_PAGE_LIMIT,
              })
            )
          );

          remainingPages.forEach((pageResult) => {
            allPositions.push(...(pageResult.data.data?.positions || []));
          });
        }

        setPositions(allPositions);
      } catch (err) {
        console.error("Failed to load positions:", err);
        setPositionsLoadFailed(true);
        toast.error("Couldn't load open positions. Try refreshing.");
      } finally {
        setPositionsLoading(false);
      }
    };
    fetchPositions();
  }, []);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await getApplicationsForUser();
        const apps: Application[] = res.data.data || [];
        const active = apps.find((a) => a.status !== "WITHDRAWN");
        setExistingApplication(active || null);
      } catch (err) {
        console.error("Failed to load applications:", err);
      } finally {
        setApplicationsLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const positionsByCatalogKey = useMemo(() => {
    const byKey = new Map<string, RecruitmentPosition>();

    positions.forEach((position) => {
      const { baseRole, subLabel } = parsePositionTitle(position.title);
      const key = getPositionKey(baseRole, subLabel);
      const current = byKey.get(key);
      const nextIsOpen = isPositionCurrentlyOpen(position);
      const currentIsOpen = isPositionCurrentlyOpen(current);

      if (
        !current ||
        (nextIsOpen && !currentIsOpen) ||
        (nextIsOpen === currentIsOpen &&
          getPositionTimestamp(position) > getPositionTimestamp(current))
      ) {
        byKey.set(key, position);
      }
    });

    return byKey;
  }, [positions]);

  const openPositions = useMemo(
    () =>
      Array.from(positionsByCatalogKey.values())
        .filter(isPositionCurrentlyOpen)
        .sort(
          (first, second) =>
            first.sortOrder - second.sortOrder ||
            first.title.localeCompare(second.title)
        ),
    [positionsByCatalogKey]
  );

  useEffect(() => {
    setRoleCardsPage(1);
  }, [activeRoleCategory]);

  const filteredOpenPositions = useMemo(() => {
    const byCategory =
      activeRoleCategory === "All"
        ? openPositions
        : openPositions.filter(
            (position) => getPositionCategory(position) === activeRoleCategory
          );

    const normalizedSearch = roleSearch.trim().toLowerCase();
    if (!normalizedSearch) return byCategory;

    return byCategory.filter((position) => {
      const title = position.title.toLowerCase();
      const description = (position.description || "").toLowerCase();
      const responsibilities = (position.responsibilities || [])
        .join(" ")
        .toLowerCase();
      const requirements = (position.requirements || [])
        .join(" ")
        .toLowerCase();

      return [title, description, responsibilities, requirements].some(
        (value) => value.includes(normalizedSearch)
      );
    });
  }, [activeRoleCategory, openPositions, roleSearch]);

  const hasAnyOpenPositions = openPositions.length > 0;
  const totalRoleCardPages = Math.max(
    1,
    Math.ceil(filteredOpenPositions.length / ROLE_CARDS_PER_PAGE)
  );
  const currentRoleCardsPage = Math.min(roleCardsPage, totalRoleCardPages);
  const visibleOpenPositions = filteredOpenPositions.slice(
    (currentRoleCardsPage - 1) * ROLE_CARDS_PER_PAGE,
    currentRoleCardsPage * ROLE_CARDS_PER_PAGE
  );
  const selectedPosition = openPositions.find(
    (position) => position._id === selectedPositionId
  );
  const selectedPositionResponsibilities =
    selectedPosition?.responsibilities ?? [];
  const selectedPositionRequirements = selectedPosition?.requirements ?? [];
  const selectedPositionDeadline = formatApplicationDeadline(
    selectedPosition?.applicationDeadline
  );

  const isFormValid =
    selectedPositionId &&
    acknowledged &&
    resume &&
    form.studentId &&
    form.lastName &&
    form.firstName &&
    form.email &&
    form.course &&
    form.year;

  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);

    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  const handleResume = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Resume must be a PDF file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume must be under 5MB.");
      return;
    }

    setResume(file);
    setUploadOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleResume(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = () => {
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    handleResume(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !resume) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("resume", resume);
      formData.append("studentId", form.studentId);
      formData.append("lastName", form.lastName);
      formData.append("middleName", form.middleName);
      formData.append("firstName", form.firstName);
      formData.append("email", form.email);
      formData.append("course", form.course);
      formData.append("year", form.year);
      if (subPosition) formData.append("subPosition", subPosition);

      const res = await submitApplication(selectedPositionId, formData);
      setExistingApplication(res.data.data);
      setReapplying(false);
      toast.success("Application submitted!");
    } catch (err) {
      console.error("Submission failed:", err);
      const message =
        (err as { response?: { data?: { message?: string; error?: string } } })
          .response?.data?.message ||
        (err as { response?: { data?: { message?: string; error?: string } } })
          .response?.data?.error ||
        "Application submission failed. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (applicationsLoading || profileLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  // Show the status page whenever there's an existing application, unless
  // it's REJECTED and the student has chosen to reapply (`reapplying`).
  if (existingApplication && !reapplying) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-light text-gray-800">
          Submit PSITS membership application
        </h1>
        <ApplicationStatus
          application={existingApplication}
          onReapply={
            existingApplication.status === "REJECTED"
              ? () => setReapplying(true)
              : undefined
          }
        />
      </div>
    );
  }

  if (positionsLoading || positionsLoadFailed || !hasAnyOpenPositions) {
    const message = positionsLoading
      ? "Loading..."
      : positionsLoadFailed
        ? "Couldn't load open positions. Refresh to retry."
        : "Thank you to everyone who applied! Applications are now closed. Stay tuned for the next Application Period.";

    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-light text-gray-800">
          PSITS Membership Application
        </h1>
        <div className="h-[30vh] rounded-2xl border border-sky-200 bg-white p-8 text-center shadow-sm">
          {positionsLoading ? (
            <p className="text-gray-500">{message}</p>
          ) : positionsLoadFailed ? (
            <p className="text-gray-600">{message}</p>
          ) : (
            <>
              <h2 className="align-center text-3xl font-medium text-gray-800 md:mt-9">
                Application Period is Over
              </h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!selectedPosition) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 md:w-[65vw] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-light whitespace-nowrap text-gray-800">
              Available Roles
            </h1>

            <div className="relative -top-2 w-36 sm:w-44 md:w-[210px]">
              <Input
                type="search"
                value={roleSearch}
                onChange={(event) => setRoleSearch(event.target.value)}
                placeholder="Search roles"
                className="h-9 w-full rounded-full border-sky-200 bg-white pl-9 text-sm focus-visible:ring-sky-200"
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="6" />
                <path d="m16 16 4 4" />
              </svg>
            </div>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap items-center gap-2">
            {ROLE_CATEGORIES.map((category) => {
              const isActive = activeRoleCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveRoleCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "border-sky-500 bg-sky-500 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {visibleOpenPositions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            {roleSearch.trim()
              ? `No open roles match "${roleSearch.trim()}" in this category.`
              : "No open roles in this category yet."}
          </div>
        ) : (
          <>
            <div className="md:max-h-auto grid gap-3 md:w-[65vw] md:grid-cols-3 md:overflow-y-auto">
              {visibleOpenPositions.map((position) => {
                const responsibilities = position.responsibilities ?? [];
                const requirements = position.requirements ?? [];
                const deadline = formatApplicationDeadline(
                  position.applicationDeadline
                );

                return (
                  <article
                    key={position._id}
                    className="flex flex-col rounded-2xl border border-l-4 border-gray-200 border-l-sky-300 bg-white p-6 shadow-sm hover:border-sky-500 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h2 className="text-xl font-medium text-gray-800">
                        {position.title}
                      </h2>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        Open
                      </span>
                    </div>

                    {position.description && (
                      <p className="mb-4 text-sm text-gray-600">
                        {position.description}
                      </p>
                    )}

                    {responsibilities.length > 0 && (
                      <div className="mb-4 text-sm text-gray-700">
                        <p className="mb-1 font-medium">Responsibilities</p>
                        <ul className="list-disc space-y-1 pl-5">
                          {responsibilities.map((responsibility, index) => (
                            <li key={`${responsibility}-${index}`}>
                              {responsibility}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {requirements.length > 0 && (
                      <div className="mb-4 text-sm break-all text-gray-700">
                        {requirements.length > 0 && (
                          <Button
                            type="button"
                            variant="link"
                            className="mt-1 h-auto p-0 text-sky-600"
                            onClick={() =>
                              setRequirementsDialogPosition(position)
                            }
                          >
                            View requirements
                          </Button>
                        )}
                      </div>
                    )}

                    {deadline && (
                      <p className="mb-4 text-sm text-gray-500">
                        Application will close on {deadline}
                      </p>
                    )}

                    <Button
                      type="button"
                      className="mt-auto w-full"
                      onClick={() => {
                        const { subLabel } = parsePositionTitle(position.title);
                        setSelectedPositionId(position._id);
                        setSubPosition(subLabel || "");
                        setAcknowledged(false);
                      }}
                    >
                      Apply
                    </Button>
                  </article>
                );
              })}
            </div>

            {totalRoleCardPages > 1 && (
              <div className="mt-7 flex flex-col items-center justify-between gap-3 text-sm text-gray-500 sm:flex-row">
                <span>
                  Showing {(currentRoleCardsPage - 1) * ROLE_CARDS_PER_PAGE + 1}{" "}
                  to{" "}
                  {Math.min(
                    currentRoleCardsPage * ROLE_CARDS_PER_PAGE,
                    filteredOpenPositions.length
                  )}{" "}
                  of {filteredOpenPositions.length} roles
                </span>
                <nav
                  aria-label="Role card pages"
                  className="flex items-center gap-1"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Previous roles page"
                    disabled={currentRoleCardsPage === 1}
                    onClick={() =>
                      setRoleCardsPage((page) => Math.max(1, page - 1))
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  {Array.from({ length: totalRoleCardPages }, (_, index) => {
                    const page = index + 1;

                    return (
                      <Button
                        key={page}
                        type="button"
                        variant={
                          page === currentRoleCardsPage ? "default" : "ghost"
                        }
                        size="sm"
                        aria-label={`Page ${page}`}
                        aria-current={
                          page === currentRoleCardsPage ? "page" : undefined
                        }
                        onClick={() => setRoleCardsPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Next roles page"
                    disabled={currentRoleCardsPage === totalRoleCardPages}
                    onClick={() =>
                      setRoleCardsPage((page) =>
                        Math.min(totalRoleCardPages, page + 1)
                      )
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              </div>
            )}
          </>
        )}
        <Dialog
          open={requirementsDialogPosition !== null}
          onOpenChange={(open) => {
            if (!open) setRequirementsDialogPosition(null);
          }}
        >
          <DialogContent className="max-h-[85vh] overflow-hidden rounded-2xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {requirementsDialogPosition?.title} Requirements
              </DialogTitle>
              <DialogDescription>
                Full requirements for this role.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto overscroll-contain pr-2">
              <ul className="list-disc space-y-2 pl-5 text-sm break-all text-gray-700">
                {requirementsDialogPosition?.requirements.map(
                  (requirement, index) => (
                    <li key={`${requirement}-${index}`}>{requirement}</li>
                  )
                )}
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-light text-gray-800">
        Submit PSITS membership application
      </h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:divide-x md:divide-gray-100">
          {/* Role Information */}
          <div className="space-y-4 md:pr-8">
            <h2 className="text-lg font-medium text-gray-800">
              Role Information
            </h2>

            <div className="overflow-y-auto rounded-xl border border-gray-200 bg-slate-50 p-4 break-all">
              <h3 className="font-medium text-gray-800">
                {selectedPosition.title}
              </h3>
              {selectedPosition.description && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedPosition.description}
                </p>
              )}
              {selectedPositionResponsibilities.length > 0 && (
                <div className="mt-3 text-sm text-gray-700">
                  <p className="mb-1 font-medium">Responsibilities</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {selectedPositionResponsibilities.map(
                      (responsibility, index) => (
                        <li key={`${responsibility}-${index}`}>
                          {responsibility}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {selectedPositionRequirements.length > 0 && (
                <div className="mt-3 text-sm text-gray-700">
                  <p className="mb-1 font-medium">Requirements</p>
                  <div className="max-h-32 overflow-y-auto overscroll-contain pr-2">
                    <ul className="list-disc space-y-1 pl-5">
                      {selectedPositionRequirements.map(
                        (requirement, index) => (
                          <li key={`${requirement}-${index}`}>{requirement}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              )}
              {!selectedPosition.description &&
                selectedPositionResponsibilities.length === 0 &&
                selectedPositionRequirements.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    No additional details provided for this role yet.
                  </p>
                )}
              {selectedPositionDeadline && (
                <p className="mt-3 text-sm text-gray-500">
                  Application will close on {selectedPositionDeadline}
                </p>
              )}
            </div>

            <label className="text-black-600 flex items-center gap-2">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(v === true)}
                className="-mt-6 border-gray-300 data-[state=checked]:border-[#1C9DDE] data-[state=checked]:bg-[#1C9DDE]"
              />
              I have read and understand the role requirements{" "}
              <span className="text-red-500">*</span>
            </label>

            <div>
              <h3 className="font-medium text-gray-800">Upload resume</h3>
              <p className="mb-2 text-xs text-gray-500">
                Your resume will be analyzed by our system for initial
                screening.
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                  className="gap-1.5 rounded-xl text-sky-500"
                >
                  <Upload className="h-4 w-4 text-sky-500" />
                  Upload File
                </Button>
                <span className="text-sm text-gray-500">
                  {resume ? resume.name : "No file chosen"}
                </span>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="space-y-4 md:pl-8">
            <h2 className="text-lg font-medium text-gray-800">Personal Info</h2>
            <p className="-mt-2 text-xs text-gray-500">
              Loaded from your account. To update these, edit your account
              profile.
            </p>

            <Input
              placeholder="Student ID Number *"
              value={form.studentId}
              readOnly
              className="bg-slate-50 text-slate-600"
            />
            <Input
              placeholder="Last Name *"
              value={form.lastName}
              readOnly
              className="bg-slate-50 text-slate-600"
            />
            <Input
              placeholder="Middle Name"
              value={form.middleName}
              readOnly
              className="bg-slate-50 text-slate-600"
            />
            <Input
              placeholder="First Name *"
              value={form.firstName}
              readOnly
              className="bg-slate-50 text-slate-600"
            />
            <Input
              type="email"
              placeholder="Email Address *"
              value={form.email}
              readOnly
              className="bg-slate-50 text-slate-600"
            />

            <div className="flex gap-3">
              <Select value={form.course} disabled>
                <SelectTrigger className="flex-1 bg-slate-50 text-slate-600">
                  <SelectValue
                    placeholder={
                      <span>
                        Course <span className="text-red-500">*</span>
                      </span>
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {COURSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={form.year} disabled>
                <SelectTrigger className="flex-1 bg-slate-50 text-slate-600">
                  <SelectValue
                    placeholder={
                      <span>
                        Year <span className="text-red-500">*</span>
                      </span>
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => {
              setSelectedPositionId("");
              setSubPosition("");
              setAcknowledged(false);
            }}
            className="w-full max-w-xs"
          >
            Back to roles
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid || submitting}
            className="w-full max-w-xs"
          >
            {submitting ? "Submitting..." : "Submit application"}
          </Button>
        </div>
      </form>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="w-[92vw] max-w-sm rounded-3xl p-6 sm:p-6">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          <label
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragging ? "border-sky-500 bg-sky-50" : "border-sky-200"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 text-sky-400" />
            <span className="text-sm text-gray-600">Drag & drop or browse</span>
            <span className="text-xs text-gray-500">
              Only PDF files are accepted (max 5MB)
            </span>
            <span className="mt-2 rounded-md bg-sky-500 px-4 py-1.5 text-sm text-white">
              Choose File
            </span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationPage;
