import { Checkbox } from "@/components/ui/checkbox";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Ban,
  Check,
  MoreHorizontal,
  Pencil,
  Search,
  SlidersHorizontal,
  UserPen,
  X,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useRecruitmentData,
  POSITIONS_PER_PAGE,
  DEFAULT_FILTERS,
} from "../hooks/useRecruitmentData";
import type {
  RecruitmentApplicant,
  RecruitmentFilters,
  RecruitmentPosition,
  RecruitmentSort,
  RecruitmentSortField,
  OpenRecruitmentValues,
  RecruitmentOpeningConflict,
  RecruitmentOpeningConflictStrategy,
  ScheduleInterviewValues,
} from "../types/Recruitment.types";
import { ApplicantInfoModal } from "./ApplicantInfoModal";
import { InterviewSchedulingModal } from "./InterviewSchedulingModal";
import OpenRole from "./OpenRole";
import PositionEditModal from "./PositionEditModal";
import { VerificationModal } from "./VerificationModal";
import { AccountVerifiedModal } from "./AccountVerifiedModal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAdminPermissions } from "@/features/admin/hooks/useAdminPermissions";

import {
  ApplicantMobileCard,
  RejectedApplicantMobileCard,
  PositionMobileCard,
} from "./RecruitmentMobileTable";

const courses = ["BSIT", "BSCS"];
const years = ["1", "2", "3", "4"];

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  "For Verification": "bg-slate-100 text-slate-700",
  Scheduled: "bg-blue-100 text-blue-700",
  Interviewed: "bg-gray-100 text-gray-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

const POSITION_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  OPEN: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-red-100 text-red-700",
};

const AVATAR_COLORS = [
  "bg-orange-400",
  "bg-blue-400",
  "bg-purple-400",
  "bg-teal-400",
  "bg-pink-400",
];

function getAvatarColor(name: string) {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function getPaginationItems(
  currentPage: number,
  totalPages: number
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);

  return items;
}

// Convert an ISO timestamp to a local "YYYY-MM-DD" string for the date input.
function toLocalDateStringForInput(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Convert "HH:mm AM/PM" (12h) → "HH:mm" (24h) for the TimePicker.
function to24HourTime(time12?: string) {
  if (!time12) return "";
  const [time, meridiem] = time12.trim().split(/\s+/);
  if (!time || !meridiem) return "";
  const [hourText, minuteText] = time.split(":");
  let hour = Number(hourText);
  const minute = Number(minuteText || 0);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "";
  const isPM = meridiem.toUpperCase() === "PM";
  if (isPM && hour < 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

interface RecruitmentFilterPopoverProps {
  filters: RecruitmentFilters;
  roleOptions: string[];
  onApply: (filters: RecruitmentFilters) => void;
}

interface SortableHeaderProps {
  label: string;
  field: RecruitmentSortField;
  className?: string;
  sort: RecruitmentSort;
  onSort: (field: RecruitmentSortField) => void;
}

const SortableHeader = ({
  label,
  field,
  className,
  sort,
  onSort,
}: SortableHeaderProps) => (
  <button
    type="button"
    onClick={() => onSort(field)}
    className={cn(
      "flex cursor-pointer items-center gap-1 font-medium",
      className
    )}
  >
    {label}
    <ArrowUpDown
      className={cn(
        "h-3.5 w-3.5",
        sort.field === field ? "text-[#1c9dde]" : "text-slate-400"
      )}
    />
  </button>
);

const RecruitmentFilterPopover = ({
  filters,
  roleOptions,
  onApply,
}: RecruitmentFilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  const hasActiveFilters =
    filters.roles.length > 0 ||
    filters.courses.length > 0 ||
    filters.years.length > 0 ||
    filters.status !== "all";

  const updateSingle = (field: "roles" | "courses" | "years", value: string) =>
    setDraft((current) => ({
      ...current,
      [field]: value && value !== "all" ? [value] : [],
    }));

  const handleCancel = () => {
    setDraft(filters);
    setIsOpen(false);
  };

  const handleApply = () => {
    onApply(draft);
    setIsOpen(false);
  };

  const clearAppliedFilters = () => {
    setDraft(DEFAULT_FILTERS);
    onApply(DEFAULT_FILTERS);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (open) setDraft(filters);
          setIsOpen(open);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 shrink-0 rounded-full border-[#e8e8e8] bg-white px-3 hover:bg-white sm:px-4"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={8}
          collisionPadding={24}
          className="w-80 rounded-2xl p-5 shadow-xl"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-medium">Filter</h2>
            <button
              type="button"
              className="cursor-pointer text-xs text-red-500"
              onClick={() => setDraft(DEFAULT_FILTERS)}
            >
              Reset Filter
            </button>
          </div>
          <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Role</Label>
              <Select
                value={draft.roles[0] ?? ""}
                onValueChange={(v) => updateSingle("roles", v)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-[#ececec]">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Course</Label>
              <Select
                value={draft.courses[0] ?? ""}
                onValueChange={(v) => updateSingle("courses", v)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-[#ececec]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                Year Level
              </Label>
              <Select
                value={draft.years[0] ?? ""}
                onValueChange={(v) => updateSingle("years", v)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-[#ececec]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-4"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 rounded-full bg-[#1c9dde] px-5 hover:bg-[#168bc7]"
              onClick={handleApply}
            >
              Apply Filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Clear filters"
          title="Clear filters"
          className="h-9 w-9 rounded-full border-[#e8e8e8] bg-white text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={clearAppliedFilters}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-[#e5e5e5] bg-white px-5 py-4 text-left">
    <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
      {label}
    </span>
    <p className="mt-1 text-2xl font-semibold text-[#2b2b2b]">{value}</p>
  </div>
);

export const RecruitmentViews = () => {
  const { canManageRecruitment } = useAdminPermissions();
  const {
    activeTab,
    setActiveTab,
    applicants,
    pagedApplicants,
    selectedIds,
    toggleApplicantSelection,
    clearSelection,
    search,
    setSearch,
    filters,
    setFilters,
    sort,
    roleOptions,
    toggleSort,
    currentPage,
    totalPages,
    setPage,
    applicantPagination,
    applicantSummary,
    positionsPage,
    setPositionsPage,
    positionsTotalPages,
    positionsTotal,
    openPositionsCount,
    isLoading,
    isMutating,
    error,
    mutationError,
    clearMutationError,
    approveApplicant,
    rejectApplicant,
    moveToInterviewing,
    refetch,
    selectedApplicant,
    isDetailsLoading,
    detailsError,
    viewApplicantDetails,
    closeApplicantDetails,
    viewResume,
    scheduleInterview,
    rescheduleInterview,
    downloadResume,
    isResumeLoading,
    resumeError,
    openRoleApplication,
    positions,
    isPositionsLoading,
    positionsError,
    updatePosition,
    closePosition,
    reopenPosition,
    deletePosition,
    verificationApplicants,
    verifyApplicant,
    verifiedAccount,
    clearVerifiedAccount,
    rejectedApplicants,
    deleteRejectedApplicant,
    clearAllRejectedApplicants,
  } = useRecruitmentData();

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openPositionMenuId, setOpenPositionMenuId] = useState<string | null>(
    null
  );
  const [editingPosition, setEditingPosition] =
    useState<RecruitmentPosition | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isOpenRoleOpen, setIsOpenRoleOpen] = useState(false);
  const [openingConflict, setOpeningConflict] = useState<{
    values: OpenRecruitmentValues;
    conflicts: RecruitmentOpeningConflict[];
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecruitmentApplicant | null>(
    null
  );
  const [positionDeleteTarget, setPositionDeleteTarget] =
    useState<RecruitmentPosition | null>(null);
  const [isClearAllRejectedOpen, setIsClearAllRejectedOpen] = useState(false);

  const [selectedRejectedIds, setSelectedRejectedIds] = useState<string[]>([]);
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([]);
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false);

  const [isBulkDeletePositionsOpen, setIsBulkDeletePositionsOpen] =
    useState(false);

  // Pre-fill the scheduling modal with the selected applicant's current
  // interview data (used when rescheduling) so the admin sees the existing
  // schedule instead of a blank form.
  const scheduleInitialValues: ScheduleInterviewValues | null = useMemo(() => {
    if (!selectedApplicant) return null;
    return {
      date: toLocalDateStringForInput(selectedApplicant.interviewDate),
      startTime: to24HourTime(selectedApplicant.interviewStart),
      endTime: to24HourTime(selectedApplicant.interviewEnd),
      officer: selectedApplicant.interviewOfficer || "",
      interviewType: selectedApplicant.interviewType || "",
    };
  }, [selectedApplicant]);

  const counts = applicantSummary;
  const total = applicantPagination.total;
  const applicantStart =
    total > 0 ? (currentPage - 1) * applicantPagination.limit + 1 : 0;
  const applicantEnd =
    total > 0 ? Math.min(applicantStart + applicants.length - 1, total) : 0;
  const applicantPageItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const allOnPageSelected =
    pagedApplicants.length > 0 &&
    pagedApplicants.every((a) => selectedIds.includes(a.id));

  const toggleSelectAllOnPage = () => {
    pagedApplicants.forEach((a) => {
      const isSelected = selectedIds.includes(a.id);
      if (allOnPageSelected && isSelected) toggleApplicantSelection(a.id);
      if (!allOnPageSelected && !isSelected) toggleApplicantSelection(a.id);
    });
  };

  const allRejectedSelected =
    rejectedApplicants.length > 0 &&
    rejectedApplicants.every((a) => selectedRejectedIds.includes(a.id));

  const toggleRejectedSelection = (id: string) => {
    setSelectedRejectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  const allPositionsSelected =
    positions.length > 0 &&
    positions.every((p) => selectedPositionIds.includes(p._id));

  const positionsStart =
    positionsTotal > 0 ? (positionsPage - 1) * POSITIONS_PER_PAGE + 1 : 0;
  const positionsEnd =
    positionsTotal > 0
      ? Math.min(positionsStart + positions.length - 1, positionsTotal)
      : 0;

  const togglePositionSelection = (id: string) => {
    setSelectedPositionIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  const selectedOpenPositionIds = positions
    .filter(
      (position) =>
        selectedPositionIds.includes(position._id) &&
        position.hiringStatus === "OPEN"
    )
    .map((position) => position._id);
  const selectedClosedPositionIds = positions
    .filter(
      (position) =>
        selectedPositionIds.includes(position._id) &&
        position.hiringStatus === "CLOSED"
    )
    .map((position) => position._id);

  const handleBulkPositionStatusChange = async (
    ids: string[],
    updateStatus: (id: string) => Promise<void>
  ) => {
    setIsBulkStatusUpdating(true);
    try {
      await Promise.all(ids.map(updateStatus));
    } finally {
      setIsBulkStatusUpdating(false);
    }
  };

  // Only CLOSED positions are eligible for deletion (matches the per-row
  // menu, which only shows "Delete Role Application" once a position is
  // closed). Any OPEN/DRAFT rows in the selection are filtered out here so
  // bulk delete never attempts to remove a live position.
  const deletablePositionIds = useMemo(
    () =>
      selectedPositionIds.filter((id) =>
        positions.find((p) => p._id === id && p.hiringStatus === "CLOSED")
      ),
    [selectedPositionIds, positions]
  );

  const handleBulkDeletePositions = async () => {
    await Promise.all(deletablePositionIds.map((id) => deletePosition(id)));
    setSelectedPositionIds([]);
    setIsBulkDeletePositionsOpen(false);
  };

  const handleOpenRoleConfirm = async (data: OpenRecruitmentValues) => {
    try {
      await openRoleApplication(data);
      setOpeningConflict(null);
      setIsOpenRoleOpen(false);
    } catch (error) {
      const conflictError = error as {
        code?: string;
        conflicts?: RecruitmentOpeningConflict[];
      };

      if (conflictError.code === "RECRUITMENT_POSITION_CONFLICT") {
        setOpeningConflict({
          values: data,
          conflicts: conflictError.conflicts ?? [],
        });
      }
    }
  };

  const resolveOpeningConflict = async (
    strategy: RecruitmentOpeningConflictStrategy
  ) => {
    if (!openingConflict) return;

    try {
      await openRoleApplication({
        ...openingConflict.values,
        conflictStrategy: strategy,
      });
      setOpeningConflict(null);
      setIsOpenRoleOpen(false);
    } catch (error) {
      const conflictError = error as {
        code?: string;
        conflicts?: RecruitmentOpeningConflict[];
      };

      if (conflictError.code === "RECRUITMENT_POSITION_CONFLICT") {
        setOpeningConflict((current) =>
          current
            ? {
                ...current,
                conflicts: conflictError.conflicts ?? current.conflicts,
              }
            : current
        );
      }
    }
  };

  return (
    <div className="bg-background flex min-h-full flex-1 flex-col text-[#333] [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer">
      <header className="flex flex-col justify-between gap-4 px-4 py-4 sm:flex-row sm:items-start sm:px-6 sm:py-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Applications</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage applicants and their details
          </p>
        </div>

        {canManageRecruitment && (
          <Button
            type="button"
            className="h-10 shrink-0 rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
            onClick={() => setIsOpenRoleOpen(true)}
          >
            <Plus className="h-4 w-1" />
            Open Role Application
          </Button>
        )}
      </header>
      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {/* Stat cards */}
        {isLoading ? (
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-[76px] rounded-2xl" />
            <Skeleton className="h-[76px] rounded-2xl" />
            <Skeleton className="h-[76px] rounded-2xl" />
          </div>
        ) : (
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard label="Pending" value={counts.pending} />
            <StatCard label="Approved" value={counts.approved} />
            <StatCard label="Verifications" value={counts.verifications} />
            <StatCard label="Open Roles" value={openPositionsCount} />
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>
              Unable to load applicant data{error ? `: ${error}` : "."}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-red-300 bg-white text-red-700 hover:bg-red-100"
              onClick={refetch}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Action failures (reject/approve/etc) surface here without hiding
              already-loaded data, unlike the load-error banner above. */}
        {mutationError && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>{mutationError}</span>
            <button
              type="button"
              onClick={clearMutationError}
              className="cursor-pointer rounded-md p-1 hover:bg-amber-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="rounded-[22px] border border-[#e5e5e5] bg-white px-4 py-5 sm:px-6">
          {/* Row 1: pill tabs + search */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-[#f2f2f2] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("applicants")}
                className={`shrink-0 rounded-full px-2.5 py-1.5 text-sm font-medium whitespace-nowrap sm:px-3 sm:text-sm ${
                  activeTab === "applicants"
                    ? "bg-white text-[#303030] shadow-sm"
                    : "text-[#777] hover:text-[#303030]"
                }`}
              >
                Applicants
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("applications")}
                className={`shirnk-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                  activeTab === "applications"
                    ? "bg-white text-[#303030] shadow-sm"
                    : "text-[#777] hover:text-[#303030]"
                }`}
              >
                Open Roles
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("verification")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                  activeTab === "verification"
                    ? "bg-white text-[#303030] shadow-sm"
                    : "text-[#777] hover:text-[#303030]"
                }`}
              >
                Verifications
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rejected")}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  activeTab === "rejected"
                    ? "bg-white text-[#303030] shadow-sm"
                    : "text-[#777] hover:text-[#303030]"
                }`}
              >
                Rejected
                {applicantSummary.rejected > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                    {applicantSummary.rejected}
                  </span>
                )}
              </button>
            </div>

            <div className="relative w-56">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#999]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="rounded-full border-[#e0e0e0] pl-9"
              />
            </div>
          </div>

          {/* Row 2: filter dropdowns */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Select
              value={filters.roles[0] ?? "all"}
              onValueChange={(v) =>
                setFilters((current) => ({
                  ...current,
                  roles: v === "all" ? [] : [v],
                }))
              }
            >
              <SelectTrigger className="h-9 w-[140px] rounded-full border-[#e8e8e8] text-sm">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(v) =>
                setFilters((current) => ({
                  ...current,
                  status: v as RecruitmentFilters["status"],
                }))
              }
            >
              <SelectTrigger className="h-9 w-[150px] rounded-full border-[#e8e8e8] text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="For Verification">
                  For Verification
                </SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Interviewed">Interviewed</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <RecruitmentFilterPopover
              filters={filters}
              roleOptions={roleOptions}
              onApply={setFilters}
            />
          </div>

          {/* Table / Verification cards */}
          {activeTab === "applications" ? (
            <div>
              {selectedPositionIds.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {canManageRecruitment &&
                      selectedOpenPositionIds.length > 0 && (
                        <button
                          type="button"
                          disabled={isMutating || isBulkStatusUpdating}
                          onClick={() =>
                            handleBulkPositionStatusChange(
                              selectedOpenPositionIds,
                              closePosition
                            )
                          }
                          className="cursor-pointer font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Close selected ({selectedOpenPositionIds.length})
                        </button>
                      )}
                    {canManageRecruitment &&
                      selectedClosedPositionIds.length > 0 && (
                        <button
                          type="button"
                          disabled={isMutating || isBulkStatusUpdating}
                          onClick={() =>
                            handleBulkPositionStatusChange(
                              selectedClosedPositionIds,
                              reopenPosition
                            )
                          }
                          className="cursor-pointer font-medium text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reopen selected ({selectedClosedPositionIds.length})
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={() => setSelectedPositionIds([])}
                      disabled={isBulkStatusUpdating}
                      className="cursor-pointer font-medium text-[#1c9dde] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear selection
                    </button>
                    {deletablePositionIds.length > 0 &&
                      canManageRecruitment && (
                        <button
                          type="button"
                          onClick={() => setIsBulkDeletePositionsOpen(true)}
                          disabled={isBulkStatusUpdating}
                          className="cursor-pointer font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete selected ({deletablePositionIds.length})
                        </button>
                      )}
                  </div>
                </div>
              )}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px] table-fixed border-collapse text-sm">
                  <thead>
                    <tr className="rounded-md bg-[#efefef] text-[#2f2f2f]">
                      <th className="w-[4%] rounded-l-md px-3 py-2 text-left">
                        <Checkbox
                          checked={allPositionsSelected}
                          onCheckedChange={(checked) =>
                            setSelectedPositionIds(
                              checked ? positions.map((p) => p._id) : []
                            )
                          }
                          aria-label="Select all positions"
                          className="data-[state=checked]:border-[#1C9DDE] data-[state=checked]:bg-[#1C9DDE]"
                        />
                      </th>

                      <th className="w-[22%] px-3 py-2 text-left font-medium">
                        Position
                      </th>

                      <th className="w-[12%] px-3 py-2 text-left font-medium">
                        Status
                      </th>

                      <th className="w-[12%] px-3 py-2 text-left font-medium">
                        Slots
                      </th>

                      <th className="w-[17%] px-3 py-2 text-left font-medium">
                        Deadline
                      </th>

                      <th className="w-[18%] px-3 py-2 text-left font-medium">
                        Created
                      </th>

                      <th className="w-[15%] rounded-r-md px-3 py-2 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isPositionsLoading ? (
                      Array.from({ length: 5 }, (_, row) => (
                        <tr key={row} className="border-b border-[#ededed]">
                          {Array.from({ length: 7 }, (_, cell) => (
                            <td key={cell} className="px-3 py-3">
                              <Skeleton className="h-4 w-full rounded-full" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : positionsError ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-16 text-center text-sm text-red-600"
                        >
                          {positionsError}
                        </td>
                      </tr>
                    ) : positions.length > 0 ? (
                      positions.map((position) => (
                        <tr
                          key={position._id}
                          className="border-b border-[#ededed] text-[#303030] hover:bg-slate-50"
                        >
                          {/* Checkbox */}
                          <td className="px-3 py-3">
                            <Checkbox
                              checked={selectedPositionIds.includes(
                                position._id
                              )}
                              onCheckedChange={() =>
                                togglePositionSelection(position._id)
                              }
                              aria-label={`Select ${position.title}`}
                              className="data-[state=checked]:border-[#1C9DDE] data-[state=checked]:bg-[#1C9DDE] data-[state=checked]:text-white"
                            />
                          </td>

                          {/* Position */}
                          <td className="truncate px-3 py-3 font-medium text-slate-900">
                            {position.title}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-medium",
                                POSITION_STATUS_STYLES[position.hiringStatus] ??
                                  "bg-slate-100 text-slate-600"
                              )}
                            >
                              {position.hiringStatus}
                            </span>
                          </td>

                          {/* Slots */}
                          <td className="px-3 py-3">{position.slots ?? "—"}</td>

                          {/* Deadline */}
                          <td className="px-3 py-3">
                            {position.applicationDeadline
                              ? new Date(
                                  position.applicationDeadline
                                ).toLocaleDateString()
                              : "—"}
                          </td>

                          {/* Created */}
                          <td className="px-3 py-3">
                            {new Date(position.createdAt).toLocaleDateString()}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3 text-right">
                            {canManageRecruitment && (
                              <Popover
                                open={openPositionMenuId === position._id}
                                onOpenChange={(open) =>
                                  setOpenPositionMenuId(
                                    open ? position._id : null
                                  )
                                }
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    disabled={isMutating}
                                    className="h-7 w-7 rounded-full border text-slate-500 hover:bg-slate-100"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>

                                <PopoverContent
                                  align="end"
                                  className="w-56 rounded-xl border-[#ececec] p-1.5 shadow-lg"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPosition(position);
                                      setOpenPositionMenuId(null);
                                    }}
                                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                                  >
                                    <Pencil className="h-4 w-4 text-slate-500" />
                                    Edit Role Application
                                  </button>

                                  {position.hiringStatus === "CLOSED" ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        reopenPosition(position._id);
                                        setOpenPositionMenuId(null);
                                      }}
                                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-emerald-600 hover:bg-slate-50"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                      Reopen Role Application
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        closePosition(position._id);
                                        setOpenPositionMenuId(null);
                                      }}
                                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-50"
                                    >
                                      <Ban className="h-4 w-4" />
                                      Close Role Application
                                    </button>
                                  )}

                                  {position.hiringStatus === "CLOSED" && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPositionDeleteTarget(position);
                                        setOpenPositionMenuId(null);
                                      }}
                                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete Role Application
                                    </button>
                                  )}
                                </PopoverContent>
                              </Popover>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-16 text-center text-sm text-[#777]"
                        >
                          No open roles yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="block space-y-3 md:hidden">
                {isPositionsLoading ? (
                  Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-xl" />
                  ))
                ) : positionsError ? (
                  <p className="py-16 text-center text-sm text-red-600">
                    {positionsError}
                  </p>
                ) : positions.length > 0 ? (
                  positions.map((position) => (
                    <PositionMobileCard
                      key={position._id}
                      position={position}
                      selected={selectedPositionIds.includes(position._id)}
                      onToggleSelect={togglePositionSelection}
                      canManage={canManageRecruitment}
                      isMutating={isMutating}
                      onEdit={setEditingPosition}
                      onClose={closePosition}
                      onReopen={reopenPosition}
                      onDelete={setPositionDeleteTarget}
                    />
                  ))
                ) : (
                  <p className="py-16 text-center text-sm text-[#777]">
                    No open roles yet.
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 text-sm text-[#777] sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {positionsStart} to {positionsEnd} of {positionsTotal}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={positionsPage <= 1 || isPositionsLoading}
                    onClick={() =>
                      setPositionsPage(Math.max(1, positionsPage - 1))
                    }
                    className="h-8 rounded-full border-[#e8e8e8] bg-white px-3 text-xs"
                  >
                    Previous
                  </Button>
                  <span className="rounded-full bg-[#1c9dde] px-3 py-1 text-xs font-medium text-white">
                    {positionsPage}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      positionsPage >= positionsTotalPages || isPositionsLoading
                    }
                    onClick={() =>
                      setPositionsPage(
                        Math.min(positionsTotalPages, positionsPage + 1)
                      )
                    }
                    className="h-8 rounded-full border-[#e8e8e8] bg-white px-3 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : activeTab === "applicants" ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                {selectedIds.length > 0 && (
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span>{selectedIds.length} selected</span>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="cursor-pointer font-medium text-[#1c9dde] hover:underline"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
                <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
                  <thead>
                    <tr className="rounded-md bg-[#efefef] text-[#2f2f2f]">
                      <th className="w-[4%] rounded-l-md px-3 py-2 text-left">
                        <Checkbox
                          checked={allOnPageSelected}
                          onCheckedChange={toggleSelectAllOnPage}
                          aria-label="Select all on page"
                          className="data-[state=checked]:border-[#1C9DDE] data-[state=checked]:bg-[#1C9DDE] data-[state=checked]:text-white"
                        />
                      </th>
                      <th className="w-[24%] px-3 py-2 text-left">
                        <SortableHeader
                          label="Applicant"
                          field="name"
                          sort={sort}
                          onSort={toggleSort}
                        />
                      </th>
                      <th className="w-[14%] px-3 py-2 text-left font-medium">
                        ID Number
                      </th>
                      <th className="w-[14%] px-3 py-2 text-left">
                        <SortableHeader
                          label="Course / Year"
                          field="courseYear"
                          sort={sort}
                          onSort={toggleSort}
                        />
                      </th>
                      <th className="w-[16%] px-3 py-2 text-left">
                        <SortableHeader
                          label="Role Applied"
                          field="roleApplied"
                          sort={sort}
                          onSort={toggleSort}
                        />
                      </th>
                      <th className="w-[14%] px-3 py-2 text-left">
                        <SortableHeader
                          label="Status"
                          field="status"
                          sort={sort}
                          onSort={toggleSort}
                        />
                      </th>
                      <th className="w-[14%] rounded-r-md px-3 py-2 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }, (_, index) => (
                        <tr key={index} className="border-b border-[#ededed]">
                          {Array.from({ length: 7 }, (_, cell) => (
                            <td key={cell} className="px-3 py-3">
                              <Skeleton className="h-4 w-full rounded-full" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : pagedApplicants.length > 0 ? (
                      pagedApplicants.map((applicant) => (
                        <tr
                          key={applicant.id}
                          className="border-b border-[#ededed] text-[#303030] hover:bg-slate-50"
                        >
                          <td className="px-3 py-3">
                            <Checkbox
                              checked={selectedIds.includes(applicant.id)}
                              onCheckedChange={() =>
                                toggleApplicantSelection(applicant.id)
                              }
                              aria-label={`Select ${applicant.name}`}
                              className="data-[state=checked]:border-[#1C9DDE] data-[state=checked]:bg-[#1C9DDE] data-[state=checked]:text-white"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                                  getAvatarColor(applicant.name || "?")
                                )}
                              >
                                {getInitial(applicant.name)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900">
                                  {applicant.name || "—"}
                                </p>
                                <p className="truncate text-xs text-[#8a8a8a]">
                                  {applicant.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="truncate px-3 py-3">
                            {applicant.id_number || "—"}
                          </td>
                          <td className="truncate px-3 py-3">
                            {[applicant.course, applicant.year]
                              .filter(Boolean)
                              .join(" • ") || "—"}
                          </td>
                          <td className="truncate px-3 py-3">
                            {applicant.roleApplied || "—"}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                                STATUS_STYLES[applicant.status] ??
                                  "bg-slate-100 text-slate-600"
                              )}
                            >
                              {applicant.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Popover
                              open={openMenuId === applicant.id}
                              onOpenChange={(open) =>
                                setOpenMenuId(open ? applicant.id : null)
                              }
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  disabled={isMutating}
                                  className="h-7 w-7 rounded-full border text-slate-500 hover:bg-slate-100"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="end"
                                className="w-52 rounded-xl border-[#ececec] p-1.5 shadow-lg"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    viewApplicantDetails(applicant.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                                >
                                  <UserPen className="h-4 w-4 text-slate-500" />
                                  View Details
                                </button>
                                {canManageRecruitment && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={
                                        applicant.status !== "Interviewed"
                                      }
                                      title={
                                        applicant.status !== "Interviewed" &&
                                        applicant.status !== "Approved" &&
                                        applicant.status !== "Rejected"
                                          ? "Available after the interview is completed"
                                          : undefined
                                      }
                                      onClick={() => {
                                        approveApplicant(applicant.id);
                                        setOpenMenuId(null);
                                      }}
                                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-emerald-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                                    >
                                      <Check className="h-4 w-4" />
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={
                                        applicant.status !== "Interviewed"
                                      }
                                      title={
                                        applicant.status !== "Interviewed" &&
                                        applicant.status !== "Approved" &&
                                        applicant.status !== "Rejected"
                                          ? "Available after the interview is completed"
                                          : undefined
                                      }
                                      onClick={() => {
                                        rejectApplicant(applicant.id);
                                        setOpenMenuId(null);
                                      }}
                                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                                    >
                                      <X className="h-4 w-4" />
                                      Reject
                                    </button>
                                  </>
                                )}
                              </PopoverContent>
                            </Popover>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-16 text-center text-sm text-[#777]"
                        >
                          No applicants found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="block space-y-3 md:hidden">
                {selectedIds.length > 0 && (
                  <div className="mb-1 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span>{selectedIds.length} selected</span>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="font-medium text-[#1c9dde]"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
                {isLoading ? (
                  Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-xl" />
                  ))
                ) : pagedApplicants.length > 0 ? (
                  pagedApplicants.map((applicant) => (
                    <ApplicantMobileCard
                      key={applicant.id}
                      applicant={applicant}
                      selected={selectedIds.includes(applicant.id)}
                      onToggleSelect={toggleApplicantSelection}
                      onViewDetails={viewApplicantDetails}
                      canManage={canManageRecruitment}
                      isMutating={isMutating}
                      onApprove={approveApplicant}
                      onReject={rejectApplicant}
                    />
                  ))
                ) : (
                  <p className="py-16 text-center text-sm text-[#777]">
                    No applicants found.
                  </p>
                )}
              </div>
            </>
          ) : activeTab === "rejected" ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-medium text-slate-700">
                  Rejected Applicants
                </h2>
                {applicantSummary.rejected > 0 && canManageRecruitment && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isMutating}
                    onClick={() => setIsClearAllRejectedOpen(true)}
                    className="h-8 rounded-full border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Clear All
                  </Button>
                )}
              </div>

              {selectedRejectedIds.length > 0 && (
                <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span>{selectedRejectedIds.length} selected</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRejectedIds([])}
                    className="cursor-pointer font-medium text-[#1c9dde] hover:underline"
                  >
                    Clear selection
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : rejectedApplicants.length > 0 ? (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[700px] table-fixed border-collapse text-sm">
                      <thead>
                        <tr className="rounded-md bg-[#efefef] text-[#2f2f2f]">
                          <th className="w-[4%] rounded-l-md px-3 py-2 text-left">
                            <Checkbox
                              checked={allRejectedSelected}
                              onCheckedChange={(checked) =>
                                setSelectedRejectedIds(
                                  checked
                                    ? rejectedApplicants.map((a) => a.id)
                                    : []
                                )
                              }
                              aria-label="Select all rejected applicants"
                              className="data-[state=checked]:border-[#1C9DDE] data-[state=checked]:bg-[#1C9DDE] data-[state=checked]:text-white"
                            />
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Applicant
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Role Applied
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Rejected On
                          </th>
                          <th className="rounded-r-md px-3 py-2 text-right font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rejectedApplicants.map((applicant) => (
                          <tr
                            key={applicant.id}
                            className="border-b border-[#ededed] text-[#303030] hover:bg-slate-50"
                          >
                            <td className="px-3 py-3">
                              <Checkbox
                                checked={selectedRejectedIds.includes(
                                  applicant.id
                                )}
                                onCheckedChange={() =>
                                  toggleRejectedSelection(applicant.id)
                                }
                                aria-label={`Select ${applicant.name}`}
                                className="data-[state=checked]:border-[#1C9DDE] data-[state=checked]:bg-[#1C9DDE] data-[state=checked]:text-white"
                              />
                            </td>
                            <td className="truncate px-3 py-3 font-medium">
                              {applicant.name || "—"}
                            </td>
                            <td className="truncate px-3 py-3">
                              {applicant.roleApplied || "—"}
                            </td>
                            <td className="px-3 py-3">
                              {applicant.rejectedAt
                                ? new Date(
                                    applicant.rejectedAt
                                  ).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                disabled={isMutating}
                                className="h-7 w-7 rounded-full border text-red-500 hover:bg-red-50"
                                onClick={() => setDeleteTarget(applicant)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="block space-y-3 md:hidden">
                    {rejectedApplicants.map((applicant) => (
                      <RejectedApplicantMobileCard
                        key={applicant.id}
                        applicant={applicant}
                        selected={selectedRejectedIds.includes(applicant.id)}
                        onToggleSelect={toggleRejectedSelection}
                        canManage={canManageRecruitment}
                        isMutating={isMutating}
                        onDelete={setDeleteTarget}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-16 text-center text-sm text-[#777]">
                  No rejected applicants.
                </p>
              )}
            </div>
          ) : (
            <div>
              <h2 className="mb-4 text-center text-base font-medium text-slate-700">
                Verification Required
              </h2>
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-56 rounded-2xl" />
                  ))}
                </div>
              ) : verificationApplicants.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {verificationApplicants.map((applicant) => (
                    <VerificationModal
                      key={applicant.id}
                      applicant={applicant}
                      isApproving={isMutating}
                      onApprove={verifyApplicant}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-[#777]">
                  No applicants awaiting verification.
                </p>
              )}
            </div>
          )}

          {/* Pagination (applicants tab only — the positions and
              verification tabs aren't paginated with these controls) */}
          {(activeTab === "applicants" ||
            activeTab === "rejected" ||
            activeTab === "verification") && (
            <div className="mt-7 flex flex-col items-center justify-between gap-3 text-xs text-[#8a8a8a] sm:flex-row">
              <span>
                Showing {applicantStart} to {applicantEnd} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 disabled:cursor-not-allowed disabled:text-[#c9c9c9]"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                >
                  Previous
                </button>
                {applicantPageItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1 text-[#8a8a8a]"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setPage(item)}
                      className={cn(
                        "h-7 min-w-7 cursor-pointer rounded-full px-2",
                        item === currentPage
                          ? "bg-[#1c9dde] text-white"
                          : "border border-[#eeeeee] bg-white text-[#696969]"
                      )}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 disabled:cursor-not-allowed disabled:text-[#c9c9c9]"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <ApplicantInfoModal
        applicant={selectedApplicant}
        open={!!selectedApplicant || isDetailsLoading}
        isLoading={isDetailsLoading}
        error={detailsError}
        onClose={closeApplicantDetails}
        onSetSchedule={() => setIsScheduleOpen(true)}
        onReschedule={() => setIsScheduleOpen(true)}
        canReschedule={
          selectedApplicant?.status !== "Approved" &&
          selectedApplicant?.status !== "Rejected"
        }
        onMarkInterviewCompleted={() =>
          selectedApplicant && moveToInterviewing(selectedApplicant.id)
        }
        canMarkInterviewCompleted={selectedApplicant?.status === "Scheduled"}
        isInterviewCompleted={
          selectedApplicant?.status === "Interviewed" ||
          selectedApplicant?.status === "Approved" ||
          selectedApplicant?.status === "Rejected"
        }
        isMutating={isMutating}
        onViewResume={viewResume}
        onDownloadResume={downloadResume}
        isResumeLoading={isResumeLoading}
        resumeError={resumeError}
      />

      <InterviewSchedulingModal
        key={`${selectedApplicant?.id ?? "schedule"}-${isScheduleOpen}`}
        open={isScheduleOpen}
        isSubmitting={isMutating}
        initialValues={scheduleInitialValues}
        onClose={() => setIsScheduleOpen(false)}
        onConfirm={async (values) => {
          if (!selectedApplicant) return;
          const hasInterview = Boolean(
            selectedApplicant.interviewDate ||
            selectedApplicant.interviewOfficer ||
            selectedApplicant.interviewType ||
            selectedApplicant.interviewStart ||
            selectedApplicant.interviewEnd
          );
          if (hasInterview) {
            await rescheduleInterview(selectedApplicant.id, values);
          } else {
            await scheduleInterview(selectedApplicant.id, values);
          }
          setIsScheduleOpen(false);
        }}
      />
      <OpenRole
        open={isOpenRoleOpen}
        isSubmitting={isMutating}
        onClose={() => {
          setIsOpenRoleOpen(false);
          setOpeningConflict(null);
        }}
        onConfirm={handleOpenRoleConfirm}
      />
      <Dialog
        open={!!openingConflict}
        onOpenChange={(open) => !open && setOpeningConflict(null)}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Some role applications already exist
                </DialogTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Choose how to handle the existing role before continuing.
                </p>
              </div>
            </div>

            <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {(openingConflict?.conflicts || [])
                .slice(0, 6)
                .map((conflict) => (
                  <div
                    key={conflict._id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-700">
                      {conflict.title}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {conflict.slots ?? 0} slot
                      {conflict.slots === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              {(openingConflict?.conflicts.length || 0) > 6 && (
                <p className="px-1 text-xs text-slate-500">
                  +{(openingConflict?.conflicts.length || 0) - 6} more
                </p>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                className="h-auto rounded-xl px-3 py-2 text-sm"
                disabled={isMutating}
                onClick={() => setOpeningConflict(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto rounded-xl px-3 py-2 text-sm"
                disabled={isMutating}
                onClick={() => resolveOpeningConflict("update_existing")}
              >
                Update existing
              </Button>
              <Button
                type="button"
                className="h-auto rounded-xl bg-[#1C9DDE] px-3 py-2 text-sm hover:bg-[#168bc7]"
                disabled={isMutating}
                onClick={() => resolveOpeningConflict("close_old_create_new")}
              >
                Delete old and Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <PositionEditModal
        open={!!editingPosition}
        isSubmitting={isMutating}
        position={editingPosition}
        onClose={() => setEditingPosition(null)}
        onConfirm={async (data) => {
          if (!editingPosition) return;
          try {
            await updatePosition(editingPosition._id, data);
            setEditingPosition(null);
          } catch {
            // mutationError is already set by the hook
          }
        }}
      />
      <AccountVerifiedModal
        result={verifiedAccount}
        onClose={clearVerifiedAccount}
      />

      {/* Delete single rejected applicant — confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Delete this applicant?
            </DialogTitle>
            <p className="text-sm text-slate-500">
              This will permanently remove{" "}
              <span className="font-medium text-slate-700">
                {deleteTarget?.name}
              </span>
              's rejected application. This action cannot be undone.
            </p>
            <div className="mt-2 flex w-full justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 rounded-full"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-9 flex-1 rounded-full bg-red-500 hover:bg-red-600"
                disabled={isMutating}
                onClick={async () => {
                  if (!deleteTarget) return;
                  await deleteRejectedApplicant(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                {isMutating ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear all rejected applicants — confirmation */}
      <Dialog
        open={isClearAllRejectedOpen}
        onOpenChange={setIsClearAllRejectedOpen}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Clear all rejected applicants?
            </DialogTitle>
            <p className="text-sm text-slate-500">
              This will permanently delete{" "}
              <span className="font-medium text-slate-700">
                {applicantSummary.rejected}
              </span>{" "}
              rejected application
              {applicantSummary.rejected === 1 ? "" : "s"}. This action cannot
              be undone.
            </p>
            <div className="mt-2 flex w-full justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 rounded-full"
                onClick={() => setIsClearAllRejectedOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-9 flex-1 rounded-full bg-red-500 hover:bg-red-600"
                disabled={isMutating}
                onClick={async () => {
                  await clearAllRejectedApplicants();
                  setIsClearAllRejectedOpen(false);
                }}
              >
                {isMutating ? "Deleting..." : "Delete All"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete a closed position — confirmation */}
      <Dialog
        open={!!positionDeleteTarget}
        onOpenChange={(open) => !open && setPositionDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Delete this role application?
            </DialogTitle>
            <p className="text-sm text-slate-500">
              This will permanently remove{" "}
              <span className="font-medium text-slate-700">
                {positionDeleteTarget?.title}
              </span>
              . This action cannot be undone.
            </p>
            <div className="mt-2 flex w-full justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 rounded-full"
                onClick={() => setPositionDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-9 flex-1 rounded-full bg-red-500 hover:bg-red-600"
                disabled={isMutating}
                onClick={async () => {
                  if (!positionDeleteTarget) return;
                  await deletePosition(positionDeleteTarget._id);
                  setPositionDeleteTarget(null);
                }}
              >
                {isMutating ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk delete selected positions — confirmation */}
      <Dialog
        open={isBulkDeletePositionsOpen}
        onOpenChange={setIsBulkDeletePositionsOpen}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Delete {deletablePositionIds.length} role application
              {deletablePositionIds.length === 1 ? "" : "s"}?
            </DialogTitle>
            <p className="text-sm text-slate-500">
              Only closed positions are deleted; any open ones stay untouched.
              This action cannot be undone.
            </p>
            <div className="mt-2 flex w-full justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 rounded-full"
                onClick={() => setIsBulkDeletePositionsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-9 flex-1 rounded-full bg-red-500 hover:bg-red-600"
                disabled={isMutating}
                onClick={handleBulkDeletePositions}
              >
                {isMutating ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruitmentViews;
