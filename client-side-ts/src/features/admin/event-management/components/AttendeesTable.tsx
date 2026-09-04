import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  Plus,
  Filter,
  Loader2,
  X,
  ArrowUpDown,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { getAttendees } from "@/features/events/api/eventService";
import { showToast } from "@/utils/alertHelper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  FilterSheet,
  AddAttendeeModal,
  AddWalkInAttendeeModal,
  MarkAttendanceButton,
  StudentDetailsModal,
  AttendanceStatusModal,
  MarkAttendanceModal,
  ScanQRModal,
  EditAttendeeModal,
  ChangePasswordModal,
  RemoveAttendeeModal,
} from "./modals";
import type {
  FilterOptions,
  AttendeeFormData,
  WalkInAttendeeFormData,
} from "./modals";
import type {
  AttendeesPagination,
  GetAttendeesParams,
  EventMerchMeta,
  QRCodePayloadV2,
} from "@/features/events/types/event.types";
import { markAttendanceV2 } from "@/features/events/api/eventService";
import { useAdminPermissions } from "@/features/admin/hooks/useAdminPermissions";
import { PSITS_ROLES } from "@/features/admin/constants/adminAccess";

interface Attendee {
  id: string;
  name: string;
  email: string;
  studentId: string;
  attendance?: {
    morning?: {
      attended?: boolean;
      timestamp?: string | Date | null;
    };
    afternoon?: {
      attended?: boolean;
      timestamp?: string | Date | null;
    };
    evening?: {
      attended?: boolean;
      timestamp?: string | Date | null;
    };
  };
  courseYear: string;
  registeredOn: string;
  registeredBy: string;
  campus?: string;
  shirtSize?: string;
  shirtPrice?: string;
  confirmedBy?: string;
  isPresent?: boolean;
}

interface AttendeesTableProps {
  venue: string;
  eventId: string;
  campusCode: string | "all";
  adminCampus?: string;
  merch?: EventMerchMeta | null;
  eventStatus?: "ongoing" | "ended" | "upcoming";
  attendanceType?: "open" | "ticketed";
}

export const AttendeesTable: React.FC<AttendeesTableProps> = ({
  venue,
  eventId,
  campusCode,
  adminCampus,
  merch,
  eventStatus,
  attendanceType: _attendanceType,
}) => {
  const { canManageEvents, access } = useAdminPermissions();
  const canRemoveAttendee =
    access === PSITS_ROLES.STANDARD ||
    access === PSITS_ROLES.EXECUTIVE ||
    access === PSITS_ROLES.ADMIN ||
    access === PSITS_ROLES.DEVELOPER;

  const toLocalYyyyMmDd = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Derives a "Confirmed on" label from the attendance session timestamps.
  // There is no flat `confirmedOn` field from the backend — only per-session
  // timestamps (attendance.morning/afternoon/evening.timestamp), written
  // when markAttendanceV2 / markAttendance() records that session. This
  // picks whichever session timestamp is set (an attendee can only ever
  // have one, since sessions are mutually exclusive time windows).
  const getConfirmedOnLabel = (attendance: Attendee["attendance"]): string => {
    const ts =
      attendance?.morning?.timestamp ??
      attendance?.afternoon?.timestamp ??
      attendance?.evening?.timestamp ??
      null;

    if (!ts) return "--";

    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return "--";

    return (
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }) +
      "\n" +
      date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddAttendeeOpen, setIsAddAttendeeOpen] = useState(false);
  const [isAddWalkInAttendeeOpen, setIsAddWalkInAttendeeOpen] = useState(false);
  const [isStudentDetailsOpen, setIsStudentDetailsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Attendee | null>(null);
  const [isAttendanceStatusOpen, setIsAttendanceStatusOpen] = useState(false);
  const [selectedAttendanceAttendee, setSelectedAttendanceAttendee] =
    useState<Attendee | null>(null);
  const [isScanQROpen, setIsScanQROpen] = useState(false);
  const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false);
  const [isEditAttendeeOpen, setIsEditAttendeeOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isRemoveAttendeeOpen, setIsRemoveAttendeeOpen] = useState(false);
  const [removeTargetIdNumber, setRemoveTargetIdNumber] = useState("");
  const [removeTargetName, setRemoveTargetName] = useState("");
  const [editTargetIdNumber, setEditTargetIdNumber] = useState("");
  const [editTargetName, setEditTargetName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pagination, setPagination] = useState<AttendeesPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    attendanceStatus: [],
    course: [],
    yearLevel: [],
    registeredOn: undefined,
  });

  const [attendees, setAttendees] = useState<Attendee[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
      setCurrentPage(1);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const buildFilterParams = useCallback(
    (): GetAttendeesParams => ({
      campus: campusCode === "all" ? undefined : campusCode,
      search: debouncedSearchQuery || undefined,
      attendanceStatus:
        activeFilters.attendanceStatus.length > 0
          ? activeFilters.attendanceStatus
          : undefined,
      course:
        activeFilters.course.length > 0 ? activeFilters.course : undefined,
      yearLevel:
        activeFilters.yearLevel.length > 0
          ? activeFilters.yearLevel
          : undefined,
      registeredOn: activeFilters.registeredOn
        ? toLocalYyyyMmDd(activeFilters.registeredOn)
        : undefined,
    }),
    [campusCode, debouncedSearchQuery, activeFilters]
  );

  // Fetch attendees from API
  useEffect(() => {
    let isMounted = true;

    const fetchAttendees = async () => {
      if (!eventId) return;

      setIsLoading(true);
      setLoadError(null);

      const params: GetAttendeesParams = {
        ...buildFilterParams(),
        page: currentPage,
        limit: pagination.limit,
      };

      const result = await getAttendees(eventId, params);
      if (!isMounted) return;

      if (result) {
        const mappedAttendees: Attendee[] = result.data.map((attendee) => ({
          id: attendee.id_number,
          name: attendee.name,
          email:
            typeof attendee.email === "string" ? attendee.email.trim() : "",
          studentId: attendee.id_number,
          attendance: attendee.attendance,
          courseYear: `${attendee.course} - ${attendee.year}`,
          registeredOn: attendee.transactDate
            ? new Date(attendee.transactDate).toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              }) +
              "\n" +
              new Date(attendee.transactDate).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--",
          registeredBy: attendee.transactBy || "--",
          campus: attendee.campus,
          shirtSize: attendee.shirtSize,
          shirtPrice: attendee.shirtPrice?.toString(),
          confirmedBy: attendee.confirmedBy,
        }));
        setAttendees(mappedAttendees);

        const nextPage = result.pagination.page;
        setPagination(result.pagination);

        if (nextPage !== currentPage) {
          setCurrentPage(nextPage);
        }
      } else {
        setAttendees([]);
        setLoadError("Unable to load attendees.");
      }

      setIsLoading(false);
    };

    fetchAttendees();
    return () => {
      isMounted = false;
    };
  }, [eventId, buildFilterParams, currentPage, pagination.limit, refreshTick]);

  const paginatedAttendees = attendees;
  const totalPages = pagination.totalPages;
  const totalAttendees = pagination.total;
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + paginatedAttendees.length;

  const handleFilter = () => {
    setIsFilterOpen(true);
  };

  const handleApplyFilter = (filters: FilterOptions) => {
    setActiveFilters(filters);
    setCurrentPage(1);
  };

  // TODO: wire this up to your actual sort param in buildFilterParams /
  // getAttendees once the backend supports server-side sorting.
  const handleSort = (field: "name" | "courseYear" | "registeredOn") => {
    void field;
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params: GetAttendeesParams = {
        ...buildFilterParams(),
        exportAll: true,
      };

      const result = await getAttendees(eventId, params);

      if (!result || result.data.length === 0) {
        showToast("warning", "No attendees to export");
        return;
      }

      const exportAttendees: Attendee[] = result.data.map((attendee) => ({
        id: attendee.id_number,
        name: attendee.name,
        email: typeof attendee.email === "string" ? attendee.email.trim() : "",
        studentId: attendee.id_number,
        attendance: attendee.attendance,
        courseYear: `${attendee.course} - ${attendee.year}`,
        registeredOn: attendee.transactDate
          ? new Date(attendee.transactDate).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            }) +
            "\n" +
            new Date(attendee.transactDate).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--",
        registeredBy: attendee.transactBy || "--",
        campus: attendee.campus,
        shirtSize: attendee.shirtSize,
        shirtPrice: attendee.shirtPrice?.toString(),
        confirmedBy: attendee.confirmedBy,
      }));

      const headers = [
        "Student ID",
        "Name",
        "Email",
        "Campus",
        "Course",
        "Year",
        "Status",
        "Morning Session",
        "Afternoon Session",
        "Evening Session",
        "Registered On",
        "Registered By",
        "Confirmed On",
        "Confirmed By",
        "Shirt Size",
        "Shirt Price",
      ];

      const rows = exportAttendees.map((attendee) => [
        attendee.studentId,
        attendee.name,
        attendee.email,
        attendee.campus || "",
        attendee.courseYear.split(" - ")[0] || "",
        attendee.courseYear.split(" - ")[1] || "",
        getAttendanceSummary(attendee.attendance),
        getSessionExportStatus(attendee.attendance, "morning"),
        getSessionExportStatus(attendee.attendance, "afternoon"),
        getSessionExportStatus(attendee.attendance, "evening"),
        attendee.registeredOn.replace("\n", " "),
        attendee.registeredBy,
        getConfirmedOnLabel(attendee.attendance).replace("\n", " "),
        attendee.confirmedBy || "--",
        attendee.shirtSize || "",
        attendee.shirtPrice || "",
      ]);

      const csvContent = [
        headers.map((h) => `"${h}"`).join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `attendees-${venue.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(
        "success",
        `${exportAttendees.length} attendees exported successfully`
      );
    } catch {
      showToast("error", "Failed to export attendees");
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters =
    activeFilters.attendanceStatus.length > 0 ||
    activeFilters.course.length > 0 ||
    activeFilters.yearLevel.length > 0 ||
    activeFilters.registeredOn !== undefined;

  const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
    morning_attended: "Morning Attended",
    afternoon_attended: "Afternoon Attended",
    evening_attended: "Evening Attended",
    no_sessions_attended: "No Sessions Attended",
  };

  const YEAR_LEVEL_LABELS: Record<number, string> = {
    1: "1st Year",
    2: "2nd Year",
    3: "3rd Year",
    4: "4th Year",
  };

  const handleRemoveFilter = (
    category: keyof FilterOptions,
    value?: string | number
  ) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (category === "registeredOn") {
        next.registeredOn = undefined;
      } else if (category === "attendanceStatus" && typeof value === "string") {
        next.attendanceStatus = prev.attendanceStatus.filter(
          (v) => v !== value
        );
      } else if (category === "course" && typeof value === "string") {
        next.course = prev.course.filter((v) => v !== value);
      } else if (category === "yearLevel" && typeof value === "number") {
        next.yearLevel = prev.yearLevel.filter((v) => v !== value);
      }
      return next;
    });
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setActiveFilters({
      attendanceStatus: [],
      course: [],
      yearLevel: [],
      registeredOn: undefined,
    });
    setCurrentPage(1);
  };

  const handleAddAttendee = () => {
    if (!canManageEvents) return;
    // UC_MAIN / UC_CS are blocked from the V2 add-attendee endpoint
    // (which creates student accounts), so they use the walk-in flow instead.
    if (isWalkInOnlyCampus) {
      setIsAddWalkInAttendeeOpen(true);
    } else {
      setIsAddAttendeeOpen(true);
    }
  };

  const handleAddAttendeeSubmit = (attendee: AttendeeFormData) => {
    // Modal now handles API call, this just updates local state
    const newAttendee: Attendee = {
      id: attendee.studentId,
      name: `${attendee.firstName} ${attendee.middleName} ${attendee.lastName}`.trim(),
      email: attendee.email,
      studentId: attendee.studentId,
      attendance: {
        morning: { attended: true, timestamp: new Date() },
        afternoon: { attended: false, timestamp: null },
        evening: { attended: false, timestamp: null },
      },
      courseYear: `${attendee.course} - ${attendee.yearLevel.charAt(0)}`,
      registeredOn:
        new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }) +
        "\n" +
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      registeredBy: "Admin",
      campus: attendee.campus,
      shirtSize: attendee.shirtSize,
      shirtPrice: attendee.shirtPrice,
    };
    setAttendees((prev) => [newAttendee, ...prev]);
    setCurrentPage(1);
    setRefreshTick((prev) => prev + 1);
  };

  const handleAddWalkInAttendeeSubmit = (attendee: WalkInAttendeeFormData) => {
    const newAttendee: Attendee = {
      id: attendee.studentId,
      name: `${attendee.firstName} ${attendee.middleName} ${attendee.lastName}`.trim(),
      email: attendee.email || "",
      studentId: attendee.studentId,
      attendance: {
        morning: { attended: false, timestamp: null },
        afternoon: { attended: false, timestamp: null },
        evening: { attended: false, timestamp: null },
      },
      courseYear: `${attendee.course} - ${attendee.yearLevel.charAt(0)}`,
      registeredOn:
        new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }) +
        "\n" +
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      registeredBy: "Admin",
      campus: attendee.campus,
      shirtSize: attendee.shirtSize,
      shirtPrice: attendee.shirtPrice,
    };
    setAttendees((prev) => [newAttendee, ...prev]);
    setCurrentPage(1);
    setRefreshTick((prev) => prev + 1);
  };

  const isAttendanceAvailable = eventStatus !== "upcoming";
  const isEventEnded = eventStatus === "ended";

  // Campuses blocked from addAttendeeV2Controller (account creation) use the
  // walk-in flow which is available to ALL campuses.
  const WALK_IN_ONLY_CAMPUSES = ["UC_MAIN", "UC_CS"];
  const isWalkInOnlyCampus = WALK_IN_ONLY_CAMPUSES.includes(adminCampus ?? "");

  const getAttendedSessionCount = (attendance: Attendee["attendance"]) => {
    const sessions = [
      attendance?.morning?.attended,
      attendance?.afternoon?.attended,
      attendance?.evening?.attended,
    ];
    return sessions.filter(Boolean).length;
  };

  const computeIsPresent = (attendance: Attendee["attendance"]): boolean => {
    return getAttendedSessionCount(attendance) > 0;
  };

  const getAttendanceSummary = (attendance: Attendee["attendance"]) => {
    if (!isAttendanceAvailable) {
      return "Not Available Yet";
    }

    const attendedCount = getAttendedSessionCount(attendance);
    if (attendedCount > 0) {
      return `${attendedCount}/3 Sessions`;
    }

    return isEventEnded ? "0/3 Sessions" : "--";
  };

  const getSessionExportStatus = (
    attendance: Attendee["attendance"],
    session: "morning" | "afternoon" | "evening"
  ) => {
    if (!isAttendanceAvailable) {
      return "Not Available Yet";
    }

    if (attendance?.[session]?.attended) {
      return "Present";
    }

    return isEventEnded ? "Absent" : "--";
  };

  const getAttendanceBadge = (attendance: Attendee["attendance"]) => {
    if (!isAttendanceAvailable) {
      return {
        label: "Attendee",
        className: "border-gray-200 bg-gray-300 text-gray-700",
      };
    }

    if (computeIsPresent(attendance)) {
      return {
        label: "Present",
        className: "border-green-200 bg-green-50 text-green-700",
      };
    }

    if (isEventEnded) {
      return {
        label: "Absent",
        className: "border-red-200 bg-red-50 text-red-700",
      };
    }

    return {
      label: "--",
      className: "border-gray-200 bg-gray-50 text-gray-500",
    };
  };

  const openAttendanceStatus = (attendee: Attendee) => {
    setSelectedAttendanceAttendee(attendee);
    setIsAttendanceStatusOpen(true);
  };

  const handleViewDetails = (attendeeId: string) => {
    const student = attendees.find((a) => a.id === attendeeId);
    if (student) {
      const isPresent = computeIsPresent(student.attendance);
      setSelectedStudent({
        ...student,
        isPresent: isPresent ? true : isEventEnded ? false : undefined,
      });
      setIsStudentDetailsOpen(true);
    }
  };

  const NON_UC_MAIN_EDIT_CAMPUSES = ["UC_BANILAD", "UC_LM", "UC_PT"];
  const showEditActions =
    canManageEvents && NON_UC_MAIN_EDIT_CAMPUSES.includes(adminCampus ?? "");

  const handleEditAttendee = () => {
    if (!canManageEvents) return;
    if (!selectedStudent) return;
    setEditTargetIdNumber(selectedStudent.studentId);
    setEditTargetName(selectedStudent.name);
    setIsStudentDetailsOpen(false);
    setIsEditAttendeeOpen(true);
  };

  const handleChangePassword = () => {
    if (!canManageEvents) return;
    if (!selectedStudent) return;
    setEditTargetIdNumber(selectedStudent.studentId);
    setEditTargetName(selectedStudent.name);
    setIsStudentDetailsOpen(false);
    setIsChangePasswordOpen(true);
  };

  const handleRemoveAttendee = (attendee: Attendee) => {
    if (!canRemoveAttendee || isEventEnded) return;
    setRemoveTargetIdNumber(attendee.studentId);
    setRemoveTargetName(attendee.name);
    setIsRemoveAttendeeOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Venue Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">{venue}</h3>
        <div className="mt-2 flex w-full flex-row items-center gap-2 sm:mt-0 sm:w-auto">
          {canManageEvents && (
            <div className="flex-1 sm:flex-none">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAttendee}
                className="w-full cursor-pointer rounded-xl"
              >
                <Plus className="mr-2 h-4 w-4" />
                {isWalkInOnlyCampus ? "Add Attendee" : "Add Attendee"}
              </Button>
            </div>
          )}
          {canManageEvents && (
            <div className="flex-1 sm:flex-none">
              <MarkAttendanceButton
                className="w-full"
                onScanQR={() => setIsScanQROpen(true)}
                onEnterStudentId={() => setIsMarkAttendanceOpen(true)}
                isSessionActive={eventStatus === "ongoing"}
              />
            </div>
          )}
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="rounded-2xl pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFilter}
            className="relative cursor-pointer rounded-xl"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {hasActiveFilters && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1C9DDE] text-[10px] font-bold text-white">
                {activeFilters.attendanceStatus.length +
                  activeFilters.course.length +
                  activeFilters.yearLevel.length +
                  (activeFilters.registeredOn ? 1 : 0)}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="cursor-pointer rounded-xl"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? "Exporting..." : "Export to CSV"}
          </Button>
        </div>
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            Filters:
          </span>
          {activeFilters.attendanceStatus.map((status) => (
            <span
              key={status}
              className="inline-flex items-center gap-1 rounded-full border border-[#1C9DDE]/30 bg-[#1C9DDE]/10 px-2.5 py-0.5 text-xs font-medium text-[#1C9DDE]"
            >
              {ATTENDANCE_STATUS_LABELS[status] || status}
              <button
                onClick={() => handleRemoveFilter("attendanceStatus", status)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[#1C9DDE]/20"
              >
                <X className="h-3 w-3 cursor-pointer" />
              </button>
            </span>
          ))}
          {activeFilters.course.map((course) => (
            <span
              key={course}
              className="inline-flex items-center gap-1 rounded-full border border-[#1C9DDE]/30 bg-[#1C9DDE]/10 px-2.5 py-0.5 text-xs font-medium text-[#1C9DDE]"
            >
              {course}
              <button
                onClick={() => handleRemoveFilter("course", course)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[#1C9DDE]/20"
              >
                <X className="h-3 w-3 cursor-pointer" />
              </button>
            </span>
          ))}
          {activeFilters.yearLevel.map((year) => (
            <span
              key={year}
              className="inline-flex items-center gap-1 rounded-full border border-[#1C9DDE]/30 bg-[#1C9DDE]/10 px-2.5 py-0.5 text-xs font-medium text-[#1C9DDE]"
            >
              {YEAR_LEVEL_LABELS[year] || `Year ${year}`}
              <button
                onClick={() => handleRemoveFilter("yearLevel", year)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[#1C9DDE]/20"
              >
                <X className="h-3 w-3 cursor-pointer" />
              </button>
            </span>
          ))}
          {activeFilters.registeredOn && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#1C9DDE]/30 bg-[#1C9DDE]/10 px-2.5 py-0.5 text-xs font-medium text-[#1C9DDE]">
              {format(activeFilters.registeredOn, "MMM dd, yyyy")}
              <button
                onClick={() => handleRemoveFilter("registeredOn")}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[#1C9DDE]/20"
              >
                <X className="h-3 w-3 cursor-pointer" />
              </button>
            </span>
          )}
          <button
            onClick={handleClearAllFilters}
            className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Table - desktop */}
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10">
                  <Checkbox
                    className="border border-gray-400"
                    checked={
                      selectedIds.length === paginatedAttendees.length &&
                      paginatedAttendees.length > 0
                    }
                    onCheckedChange={(checked) =>
                      setSelectedIds(
                        checked ? paginatedAttendees.map((a) => a.id) : []
                      )
                    }
                  />
                </TableHead>
                <TableHead className="min-w-[220px]">
                  <button
                    className="flex cursor-pointer items-center gap-1"
                    onClick={() => handleSort("name")}
                  >
                    Name{" "}
                    <ArrowUpDown className="text-muted-foreground h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead className="min-w-[110px]">Student ID</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[120px]">
                  <button
                    className="flex cursor-pointer items-center gap-1"
                    onClick={() => handleSort("courseYear")}
                  >
                    Course & Year{" "}
                    <ArrowUpDown className="text-muted-foreground h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead className="min-w-[140px]">
                  <button
                    className="flex cursor-pointer items-center gap-1"
                    onClick={() => handleSort("registeredOn")}
                  >
                    Confirmed on{" "}
                    <ArrowUpDown className="text-muted-foreground h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead className="min-w-[140px]">Confirmed by</TableHead>
                <TableHead className="w-[110px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-muted-foreground py-12 text-center"
                  >
                    Loading attendees...
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-muted-foreground py-12 text-center"
                  >
                    {loadError}
                  </TableCell>
                </TableRow>
              ) : paginatedAttendees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-muted-foreground py-12 text-center"
                  >
                    No attendees found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAttendees.map((attendee) => {
                  const attendanceBadge = getAttendanceBadge(
                    attendee.attendance
                  );
                  return (
                    <TableRow key={attendee.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(attendee.id)}
                          onCheckedChange={(checked) =>
                            setSelectedIds((prev) =>
                              checked
                                ? [...prev, attendee.id]
                                : prev.filter((id) => id !== attendee.id)
                            )
                          }
                          className="border border-gray-400"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{attendee.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {attendee.email}
                        </p>
                      </TableCell>
                      <TableCell>{attendee.studentId}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => openAttendanceStatus(attendee)}
                          className="cursor-pointer"
                        >
                          <Badge
                            variant="outline"
                            className={attendanceBadge.className}
                          >
                            {attendanceBadge.label}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell>{attendee.courseYear}</TableCell>
                      {/* FIX: was attendee.registeredOn (= transactDate, a
                          registration-time field that is never set by the
                          QR / manual "Mark Attendance" flow). Now derives
                          the label from the actual attendance session
                          timestamp, which IS set whenever attendance is
                          confirmed. */}
                      <TableCell>
                        <div className="text-sm">
                          {getConfirmedOnLabel(attendee.attendance)
                            .split("\n")
                            .map((line, i) => (
                              <div
                                key={i}
                                className={
                                  i === 0
                                    ? "font-medium"
                                    : "text-muted-foreground"
                                }
                              >
                                {line}
                              </div>
                            ))}
                        </div>
                      </TableCell>
                      {/* FIX: was attendee.registeredBy (= transactBy, also
                          a registration-time field). Now uses the real
                          confirmedBy value returned by the API, which is
                          written whenever an admin confirms attendance. */}
                      <TableCell className="text-sm">
                        {attendee.confirmedBy || "--"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleViewDetails(attendee.id)}
                            className="h-7 w-[130px] justify-center rounded-2xl border-gray-300 px-4 text-sm font-semibold"
                          >
                            View Details
                          </Button>
                          {canRemoveAttendee && (
                            <Button
                              variant="outline"
                              onClick={() => handleRemoveAttendee(attendee)}
                              disabled={isEventEnded}
                              title={
                                isEventEnded
                                  ? "This event has ended and can no longer be modified"
                                  : undefined
                              }
                              className="text-destructive hover:text-destructive h-7 w-[130px] justify-center rounded-2xl border-red-200 px-2 text-sm font-semibold hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cards - mobile */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
            Loading attendees...
          </div>
        ) : loadError ? (
          <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
            {loadError}
          </div>
        ) : paginatedAttendees.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
            No attendees found
          </div>
        ) : (
          paginatedAttendees.map((attendee) => {
            const attendanceBadge = getAttendanceBadge(attendee.attendance);
            return (
              <div
                key={attendee.id}
                className="space-y-3 rounded-xl border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Checkbox
                      checked={selectedIds.includes(attendee.id)}
                      onCheckedChange={(checked) =>
                        setSelectedIds((prev) =>
                          checked
                            ? [...prev, attendee.id]
                            : prev.filter((id) => id !== attendee.id)
                        )
                      }
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{attendee.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {attendee.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openAttendanceStatus(attendee)}
                    className="flex-shrink-0 cursor-pointer"
                  >
                    <Badge
                      variant="outline"
                      className={attendanceBadge.className}
                    >
                      {attendanceBadge.label}
                    </Badge>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Student ID</p>
                    <p className="font-medium">{attendee.studentId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Course & Year
                    </p>
                    <p className="font-medium">{attendee.courseYear}</p>
                  </div>
                  {/* FIX: same swap as the desktop table above */}
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Confirmed on
                    </p>
                    <p className="font-medium">
                      {getConfirmedOnLabel(attendee.attendance)
                        .split("\n")
                        .join(" · ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Confirmed by
                    </p>
                    <p className="truncate font-medium">
                      {attendee.confirmedBy || "--"}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleViewDetails(attendee.id)}
                >
                  View Details
                </Button>
                {canRemoveAttendee && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isEventEnded}
                    title={
                      isEventEnded
                        ? "This event has ended and can no longer be modified"
                        : undefined
                    }
                    className="text-destructive hover:text-destructive w-full border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                    onClick={() => handleRemoveAttendee(attendee)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove Attendee
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer with pagination and count */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Showing {totalAttendees > 0 ? startIndex + 1 : 0} to{" "}
          {Math.min(endIndex, totalAttendees)} of {totalAttendees}
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={
                  !pagination.hasPreviousPage
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
            {/* Dynamic page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(pageNum);
                    }}
                    isActive={currentPage === pageNum}
                    className={
                      currentPage === pageNum
                        ? "bg-sky-400 text-white hover:bg-sky-500"
                        : ""
                    }
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(totalPages);
                  }}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={
                  !pagination.hasNextPage
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Modals */}
      <FilterSheet
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        onApplyFilter={handleApplyFilter}
        activeFilters={activeFilters}
      />
      <AddAttendeeModal
        open={isAddAttendeeOpen}
        onOpenChange={setIsAddAttendeeOpen}
        eventId={eventId}
        onAddAttendee={handleAddAttendeeSubmit}
        adminCampus={adminCampus}
        merch={merch}
      />
      <AddWalkInAttendeeModal
        open={isAddWalkInAttendeeOpen}
        onOpenChange={setIsAddWalkInAttendeeOpen}
        eventId={eventId}
        onAddAttendee={handleAddWalkInAttendeeSubmit}
        adminCampus={adminCampus}
        merch={merch}
      />
      <StudentDetailsModal
        open={isStudentDetailsOpen}
        onOpenChange={setIsStudentDetailsOpen}
        student={selectedStudent}
        showEditActions={showEditActions}
        onEditAttendee={handleEditAttendee}
        onChangePassword={handleChangePassword}
      />
      <AttendanceStatusModal
        open={isAttendanceStatusOpen}
        onOpenChange={setIsAttendanceStatusOpen}
        attendeeName={selectedAttendanceAttendee?.name ?? ""}
        attendance={selectedAttendanceAttendee?.attendance}
        isAttendanceAvailable={isAttendanceAvailable}
        confirmedBy={selectedAttendanceAttendee?.confirmedBy}
      />
      <ScanQRModal
        open={isScanQROpen}
        onOpenChange={setIsScanQROpen}
        eventId={eventId}
        onScanSuccess={async (payload: QRCodePayloadV2) => {
          const result = await markAttendanceV2(eventId, payload.studentId, {
            campus: payload.campus,
            attendeeName: payload.name,
            course: payload.course ?? "Unknown",
            year: payload.year ?? 1,
          });
          if (result) {
            setRefreshTick((t) => t + 1);
            return true;
          }

          return false;
        }}
      />
      <MarkAttendanceModal
        open={isMarkAttendanceOpen}
        onOpenChange={setIsMarkAttendanceOpen}
        eventId={eventId}
        onAttendanceMarked={() => setRefreshTick((t) => t + 1)}
      />
      <EditAttendeeModal
        open={isEditAttendeeOpen}
        onOpenChange={setIsEditAttendeeOpen}
        onEditComplete={() => setRefreshTick((t) => t + 1)}
        eventId={eventId}
        attendeeIdNumber={editTargetIdNumber}
        adminCampus={adminCampus}
        merch={merch}
      />
      <ChangePasswordModal
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
        onPasswordChanged={() => setRefreshTick((t) => t + 1)}
        eventId={eventId}
        attendeeIdNumber={editTargetIdNumber}
        attendeeName={editTargetName}
      />
      <RemoveAttendeeModal
        open={isRemoveAttendeeOpen}
        onOpenChange={setIsRemoveAttendeeOpen}
        onAttendeeRemoved={() => setRefreshTick((t) => t + 1)}
        eventId={eventId}
        attendeeIdNumber={removeTargetIdNumber}
        attendeeName={removeTargetName}
      />
    </div>
  );
};
