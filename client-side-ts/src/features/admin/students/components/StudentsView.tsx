import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  Filter,
  History,
  KeyRound,
  Mail,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCcw,
  RotateCcw,
  Search,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddMembershipDialog } from "./AddMembershipDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { showToast } from "@/utils/alertHelper";
import { useStudentsData } from "../hooks/useStudentsData";
import type {
  AdminStudent,
  StudentAction,
  StudentFilters,
  StudentFormValues,
  StudentMembershipHistoryItem,
  StudentPasswordValues,
  StudentSortField,
  StudentsTab,
} from "../types/students.types";

const tabs: Array<{
  key: StudentsTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "all", label: "All Members", icon: UsersRound },
  { key: "requests", label: "Membership Requests", icon: Clock3 },
  { key: "deleted", label: "Suspended", icon: Trash2 },
];

const courses = ["BSIT", "BSCS", "ACT"];
const years = ["1", "2", "3", "4"];
const membershipStatuses = ["ACTIVE", "PENDING", "NONE"];

const initialFormValues: StudentFormValues = {
  id_number: "",
  rfid: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  course: "BSIT",
  year: "1",
};

const emptyPasswordValues: StudentPasswordValues = {
  password: "",
  confirm_password: "",
};

const formatMembership = (status: string) => {
  if (status === "ACTIVE") return "Active";
  if (status === "PENDING") return "Pending";
  return "Not Applied";
};

const membershipTone = (status: string) => {
  if (status === "ACTIVE") {
    return "bg-green-100 text-green-600";
  }
  if (status === "PENDING") return "bg-sky-100 text-sky-600";
  return "bg-[#f2f2f2] text-[#979797]";
};

const formatHistoryType = (type: string) => {
  if (type === "MEMBERSHIP_TYPE_MEMBER") return "Membership";
  if (type === "MEMBERSHIP_TYPE_RENEWAL") return "Renewal";
  return type;
};

const formatYear = (year: string) => {
  if (year === "1") return "1st Year";
  if (year === "2") return "2nd Year";
  if (year === "3") return "3rd Year";
  if (year === "4") return "4th Year";
  return `${year} Year`;
};

const formatDate = (value: string | Date) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDeletedDate = (value: string) => {
  if (!value) return "-";
  const parts = value.split(" ");
  if (parts.length >= 4) {
    return (
      <>
        <span>{parts.slice(0, 3).join(" ")}</span>
        <span className="block text-xs text-[#8a8a8a]">
          {parts.slice(3).join(" ")}
        </span>
      </>
    );
  }
  return value;
};

const formValuesFromStudent = (
  student?: AdminStudent | null
): StudentFormValues =>
  student
    ? {
        id_number: student.id_number,
        rfid: student.rfid,
        first_name: student.first_name,
        middle_name: student.middle_name,
        last_name: student.last_name,
        email: student.email,
        course: student.course || "BSIT",
        year: student.year || "1",
      }
    : initialFormValues;

const pageRange = (currentPage: number, totalPages: number) => {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);

  return Array.from(pages).sort((left, right) => left - right);
};

interface SortLabelProps {
  field: StudentSortField;
  onSort: (field: StudentSortField) => void;
  children: string;
}

const SortLabel = ({ field, onSort, children }: SortLabelProps) => (
  <button
    type="button"
    className="inline-flex cursor-pointer items-center gap-1 text-left"
    onClick={() => onSort(field)}
  >
    {children}
    <ChevronsUpDown className="h-3 w-3 text-[#7d7d7d]" />
  </button>
);

interface StudentsTableProps {
  activeTab: StudentsTab;
  data: AdminStudent[];
  isLoading: boolean;
  page: number;
  selectedIds: string[];
  total: number;
  totalPages: number;
  onAction: (action: StudentAction, records: AdminStudent[]) => void;
  onChangePassword: (student: AdminStudent) => void;
  onEdit: (student: AdminStudent) => void;
  onHistory: (student: AdminStudent) => void;
  onPageChange: (page: number) => void;
  onSelect: (idNumber: string) => void;
  onSelectPage: () => void;
  onSort: (field: StudentSortField) => void;
}

const StudentsTable = ({
  activeTab,
  data,
  isLoading,
  page,
  selectedIds,
  total,
  totalPages,
  onAction,
  onChangePassword,
  onEdit,
  onHistory,
  onPageChange,
  onSelect,
  onSelectPage,
  onSort,
}: StudentsTableProps) => {
  const visiblePages = pageRange(page, totalPages);
  const pageIds = data.map((student) => student.id_number);
  const isPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const isSomePageSelected =
    !isPageSelected && pageIds.some((id) => selectedIds.includes(id));
  const isDeletedTab = activeTab === "deleted";
  const isRequestTab = activeTab === "requests";

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-12" />
            <col className={isDeletedTab ? "w-[24%]" : "w-[30%]"} />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[15%]" />
            {!isRequestTab && (
              <col className={isDeletedTab ? "w-[14%]" : "w-[17%]"} />
            )}
            {isDeletedTab && <col className="w-[14%]" />}
            <col className={isRequestTab ? "w-[190px]" : "w-16"} />
          </colgroup>
          <thead>
            <tr className="rounded-md bg-[#efefef] text-[#2f2f2f]">
              <th className="rounded-l-md px-2 py-2 text-center align-middle">
                <Checkbox
                  checked={
                    isPageSelected || (isSomePageSelected && "indeterminate")
                  }
                  onCheckedChange={onSelectPage}
                  className="border-[#a7a7a7] data-[state=checked]:border-[#1c9dde] data-[state=checked]:bg-[#1c9dde]"
                  aria-label="Select visible rows"
                />
              </th>
              <th className="px-2 py-2 text-left align-middle font-medium">
                <SortLabel field="name" onSort={onSort}>
                  Name
                </SortLabel>
              </th>
              <th className="px-2 py-2 text-left align-middle font-medium">
                <SortLabel field="id_number" onSort={onSort}>
                  Student ID
                </SortLabel>
              </th>
              <th className="px-2 py-2 text-left align-middle font-medium">
                <SortLabel field="rfid" onSort={onSort}>
                  RFID
                </SortLabel>
              </th>
              <th className="px-2 py-2 text-left align-middle font-medium">
                <SortLabel field="courseYear" onSort={onSort}>
                  Course & Year
                </SortLabel>
              </th>
              {!isRequestTab && (
                <th className="px-2 py-2 text-left align-middle font-medium">
                  <SortLabel
                    field={isDeletedTab ? "deletedDate" : "membershipStatus"}
                    onSort={onSort}
                  >
                    {isDeletedTab ? "Suspended on" : "Membership"}
                  </SortLabel>
                </th>
              )}
              {isDeletedTab && (
                <th className="px-2 py-2 text-left align-middle font-medium">
                    <SortLabel field="deletedBy" onSort={onSort}>
                      Suspended by
                  </SortLabel>
                </th>
              )}
              <th className="rounded-r-md px-2 py-2 text-right align-middle" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }, (_, index) => (
                <tr key={index} className="border-b border-[#ededed]">
                  {Array.from(
                    { length: isDeletedTab ? 8 : isRequestTab ? 6 : 7 },
                    (_, cell) => (
                      <td key={cell} className="px-2 py-3">
                        <Skeleton className="h-4 w-full rounded-full" />
                      </td>
                    )
                  )}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((student) => {
                return (
                  <tr
                    key={`${activeTab}-${student.id_number}`}
                    className="border-b border-[#ededed] text-[#303030]"
                  >
                    <td className="px-2 py-3 text-center align-middle">
                      <Checkbox
                        checked={selectedIds.includes(student.id_number)}
                        onCheckedChange={() => onSelect(student.id_number)}
                        className="border-[#a7a7a7] data-[state=checked]:border-[#1c9dde] data-[state=checked]:bg-[#1c9dde]"
                        aria-label={`Select ${student.name}`}
                      />
                    </td>
                    <td className="px-2 py-3 text-left align-middle">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {student.name}
                        </p>
                        <p className="truncate text-xs text-[#929292]">
                          {student.email || "No email"}
                        </p>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-left align-middle">
                      {student.id_number}
                    </td>
                    <td className="px-2 py-3 text-left align-middle">
                      {student.rfid || "N/A"}
                    </td>
                    <td className="px-2 py-3 text-left align-middle">
                      {student.course || "-"}{" "}
                      {student.year ? `- ${student.year}` : ""}
                    </td>
                    {!isRequestTab && (
                      <td className="px-2 py-3 text-left align-middle">
                        {isDeletedTab ? (
                          formatDeletedDate(student.deletedDate)
                        ) : (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                              membershipTone(student.membershipStatus)
                            )}
                          >
                            {formatMembership(student.membershipStatus)}
                          </span>
                        )}
                      </td>
                    )}
                    {isDeletedTab && (
                      <td className="truncate px-2 py-3 text-left align-middle">
                        {student.deletedBy || "-"}
                      </td>
                    )}
                    <td className="px-2 py-3 text-right align-middle">
                      {isRequestTab ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-full bg-emerald-50 px-3 text-xs text-emerald-700 hover:bg-emerald-100"
                            onClick={() => onAction("approve", [student])}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-full bg-red-50 px-3 text-xs text-red-600 hover:bg-red-100"
                            onClick={() => onAction("cancelRequest", [student])}
                          >
                            <X className="h-3.5 w-3.5" />
                            Deny
                          </Button>
                        </div>
                      ) : isDeletedTab ? (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="h-7 w-7 rounded-full text-green-600"
                          title="Restore account"
                          onClick={() => onAction("restore", [student])}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-7 w-7 rounded-full border border-[#eeeeee]"
                              aria-label={`Actions for ${student.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-52 rounded-xl p-1.5"
                          >
                            <DropdownMenuItem onClick={() => onEdit(student)}>
                              <Edit3 className="h-4 w-4" />
                              Edit Account Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onChangePassword(student)}
                            >
                              <KeyRound className="h-4 w-4" />
                              Change Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onHistory(student)}
                            >
                              <History className="h-4 w-4" />
                              Membership History
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onAction("delete", [student])}
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Suspend Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={isDeletedTab ? 8 : isRequestTab ? 6 : 7}
                  className="px-3 py-16 text-center text-sm text-[#777]"
                >
                  No student records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-7 flex flex-col items-center justify-between gap-3 text-xs text-[#8a8a8a] sm:flex-row">
        <span>
          Showing {total > 0 ? (page - 1) * 8 + 1 : 0} to{" "}
          {Math.min(page * 8, total)} of {total}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 disabled:cursor-not-allowed disabled:text-[#c9c9c9]"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-3 w-3" />
            Previous
          </button>
          {visiblePages.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center gap-1">
              {index > 0 && item - visiblePages[index - 1] > 1 && (
                <span className="px-1">...</span>
              )}
              <button
                type="button"
                onClick={() => onPageChange(item)}
                className={cn(
                  "h-7 min-w-7 cursor-pointer rounded-full px-2",
                  item === page
                    ? "bg-[#1c9dde] text-white"
                    : "border border-[#eeeeee] bg-white text-[#696969]"
                )}
              >
                {item}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 disabled:cursor-not-allowed disabled:text-[#c9c9c9]"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </>
  );
};

interface StudentsFilterPopoverProps {
  filters: StudentFilters;
  onApply: (filters: StudentFilters) => void;
}

const StudentsFilterPopover = ({
  filters,
  onApply,
}: StudentsFilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<StudentFilters>(filters);
  const emptyFilters: StudentFilters = {
    courses: [],
    years: [],
    membershipStatus: "all",
  };
  const hasActiveFilters =
    filters.courses.length > 0 ||
    filters.years.length > 0 ||
    filters.membershipStatus !== "all";

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const toggleValue = (field: "courses" | "years", value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  };

  const resetFilter = () => setDraft(emptyFilters);

  const clearAppliedFilters = () => {
    setDraft(emptyFilters);
    onApply(emptyFilters);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setDraft(filters);
    setIsOpen(false);
  };

  const handleApply = () => {
    onApply(draft);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full border-[#e8e8e8] bg-white px-4 hover:bg-white"
          >
            <Filter className="h-4 w-4" />
            Filter
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
              onClick={resetFilter}
            >
              Reset Filter
            </button>
          </div>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium">Course</p>
              <div className="flex flex-wrap gap-2">
                {courses.map((course) => (
                  <button
                    key={course}
                    type="button"
                    className={cn(
                      "cursor-pointer rounded-full border px-4 py-2 text-xs",
                      draft.courses.includes(course)
                        ? "border-[#1c9dde] bg-sky-50 text-[#1c9dde]"
                        : "border-[#dedede] bg-white"
                    )}
                    onClick={() => toggleValue("courses", course)}
                  >
                    {course}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium">Year Level</p>
              <div className="flex flex-wrap gap-2">
                {years.map((year) => (
                  <button
                    key={year}
                    type="button"
                    className={cn(
                      "cursor-pointer rounded-full border px-4 py-2 text-xs",
                      draft.years.includes(year)
                        ? "border-[#1c9dde] bg-sky-50 text-[#1c9dde]"
                        : "border-[#dedede] bg-white"
                    )}
                    onClick={() => toggleValue("years", year)}
                  >
                    {formatYear(year)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-xs font-medium">
                Membership Type
              </Label>
              <Select
                value={draft.membershipStatus}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    membershipStatus: value,
                  }))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-[#ececec]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {membershipStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatMembership(status)}
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

interface StudentFormDialogProps {
  account?: AdminStudent | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: StudentFormValues) => Promise<boolean>;
}

const StudentFormDialog = ({
  account,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: StudentFormDialogProps) => {
  const [values, setValues] = useState<StudentFormValues>(
    formValuesFromStudent(account)
  );

  const updateValue = (field: keyof StudentFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const handleSubmit = async () => {
    const success = await onSubmit(values);
    if (success) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[95vh] w-[95vw] overflow-y-auto rounded-[24px] border-0 p-0 sm:h-auto sm:w-[480px]">
        <DialogTitle className="sr-only">Edit student account</DialogTitle>
        <DialogDescription className="sr-only">
          Update the selected student's account details.
        </DialogDescription>
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium">{account?.name}</h2>
              <p className="text-sm text-[#8f8f8f]">{account?.email}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs font-medium">
                  Student ID Number
                </Label>
                <Input
                  value={values.id_number}
                  readOnly
                  className="h-10 rounded-lg border-0 bg-[#efefef]"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-medium">RFID</Label>
                <Input
                  value={values.rfid}
                  onChange={(event) => updateValue("rfid", event.target.value)}
                  className="h-10 rounded-lg border-[#ececec]"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="mb-1.5 block text-xs font-medium">
                  First Name
                </Label>
                <Input
                  value={values.first_name}
                  onChange={(event) =>
                    updateValue("first_name", event.target.value)
                  }
                  className="h-10 rounded-lg border-[#ececec]"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-medium">
                  Middle Name
                </Label>
                <Input
                  value={values.middle_name}
                  onChange={(event) =>
                    updateValue("middle_name", event.target.value)
                  }
                  className="h-10 rounded-lg border-[#ececec]"
                  placeholder="Enter middle name"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-medium">
                  Last Name
                </Label>
                <Input
                  value={values.last_name}
                  onChange={(event) =>
                    updateValue("last_name", event.target.value)
                  }
                  className="h-10 rounded-lg border-[#ececec]"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#777]" />
                <Input
                  value={values.email}
                  onChange={(event) => updateValue("email", event.target.value)}
                  className="h-10 rounded-lg border-[#ececec] pl-9"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs font-medium">
                  Course
                </Label>
                <Select
                  value={values.course}
                  onValueChange={(value) => updateValue("course", value)}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-[#ececec]">
                    <SelectValue />
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
                  value={values.year}
                  onValueChange={(value) => updateValue("year", value)}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-[#ececec]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {formatYear(year)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-28 rounded-full"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 min-w-32 rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
              disabled={isSaving}
              onClick={handleSubmit}
            >
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface PasswordDialogProps {
  account?: AdminStudent | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (idNumber: string, password: string) => Promise<boolean>;
}

const PasswordDialog = ({
  account,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: PasswordDialogProps) => {
  const [values, setValues] =
    useState<StudentPasswordValues>(emptyPasswordValues);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account) return;
    if (!values.password || values.password !== values.confirm_password) {
      showToast("error", "Passwords do not match.");
      return;
    }

    const success = await onSubmit(account.id_number, values.password);
    if (success) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-[24px] border-0 p-0 sm:w-[280px] md:w-[420px]">
        <DialogTitle className="sr-only">Change student password</DialogTitle>
        <DialogDescription className="sr-only">
          Change the selected student's account password.
        </DialogDescription>
        <form className="p-6" onSubmit={handleSubmit}>
          <div className="mb-6">
            <h2 className="text-lg font-medium">{account?.name}</h2>
            <p className="text-sm text-[#8f8f8f]">{account?.email}</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                New Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={values.password}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  className="h-10 rounded-lg border-[#ececec] pr-10"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#8f8f8f]"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                Re-enter your new password
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={values.confirm_password}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      confirm_password: event.target.value,
                    }))
                  }
                  className="h-10 rounded-lg border-[#ececec] pr-10"
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#8f8f8f]"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-28 rounded-full"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 min-w-32 rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
              disabled={isSaving}
            >
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface HistoryDialogProps {
  account?: AdminStudent | null;
  isOpen: boolean;
  onClose: () => void;
  onFetch: (idNumber: string) => Promise<StudentMembershipHistoryItem[]>;
}

const HistoryDialog = ({
  account,
  isOpen,
  onClose,
  onFetch,
}: HistoryDialogProps) => {
  const [history, setHistory] = useState<StudentMembershipHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !account) return;

    const loadHistory = async () => {
      setIsLoading(true);
      setHistory(await onFetch(account.id_number));
      setIsLoading(false);
    };

    loadHistory();
  }, [account, isOpen, onFetch]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] rounded-[24px] border-0 p-0 sm:w-[600px] sm:max-w-[720px] md:w-[720px]">
        <DialogTitle className="sr-only">Membership history</DialogTitle>
        <DialogDescription className="sr-only">
          View the selected student's membership transactions.
        </DialogDescription>
        <div className="min-w-0 p-6">
          <div className="mb-6 flex items-center justify-between pr-8">
            <h2 className="flex items-center gap-2 text-lg font-medium">
              <History className="h-5 w-5" />
              Membership History
            </h2>
          </div>
          <div className="max-h-[380px] overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-[#efefef] text-left text-[#3a3a3a]">
                  <th className="rounded-l-md px-3 py-2 font-medium">
                    Reference Code
                  </th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Membership Type</th>
                  <th className="px-3 py-2 font-medium">Managed by</th>
                  <th className="rounded-r-md px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <tr key={index} className="border-b border-[#ededed]">
                      <td colSpan={5} className="px-3 py-3">
                        <Skeleton className="h-4 w-full rounded-full" />
                      </td>
                    </tr>
                  ))
                ) : history.length > 0 ? (
                  history.map((item) => (
                    <tr
                      key={`${item.reference_code}-${item.date}`}
                      className="border-b border-[#ededed]"
                    >
                      <td className="px-3 py-3">{item.reference_code}</td>
                      <td className="px-3 py-3">{formatDate(item.date)}</td>
                      <td className="px-3 py-3">
                        {formatHistoryType(item.type)}
                      </td>
                      <td className="px-3 py-3">{item.admin || "-"}</td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full"
                          onClick={() => window.print()}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-12 text-center text-[#777]"
                    >
                      No membership history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              className="h-10 min-w-32 rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ConfirmDialogState {
  action: StudentAction;
  records: AdminStudent[];
}

interface ConfirmDialogProps {
  state: ConfirmDialogState | null;
  isSaving: boolean;
  membershipFee: number;
  onClose: () => void;
  onConfirm: (
    action: StudentAction,
    records: AdminStudent[]
  ) => Promise<boolean>;
}

const ConfirmDialog = ({
  state,
  isSaving,
  membershipFee,
  onClose,
  onConfirm,
}: ConfirmDialogProps) => {
  const action = state?.action;
  const isDelete = action === "delete";
  const isRestore = action === "restore";
  const isCancel = action === "cancelRequest";
  const isMembership = action === "approve";
  const primaryLabel = isDelete
    ? "Suspend"
    : isRestore
      ? "Restore"
      : isCancel
        ? "Deny"
        : action === "approve"
          ? "Approve"
          : "Request";
  const title = isDelete
    ? "Are you sure you want to suspend this account?"
    : isRestore
      ? "Restore this student account?"
      : isCancel
        ? "Cancel this membership request?"
        : action === "approve"
          ? "Approve this membership request?"
          : "Confirm Request";
  const description = isDelete
    ? "The user will no longer be able to access the system. This action requires administrative review to reverse."
    : isRestore
      ? "The student account will become active again."
      : isCancel
        ? "The student's membership status will return to not applied."
        : `Are you sure you want to request membership for this student, and that the payment of PHP ${membershipFee.toLocaleString()} will be charged automatically?`;

  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[420px] rounded-[24px] border-0 p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <div className="p-8">
          <div
            className={cn(
              "mb-6 grid h-9 w-9 place-items-center rounded-full",
              isDelete
                ? "bg-red-100 text-red-500"
                : "bg-green-100 text-green-600"
            )}
          >
            {isDelete ? (
              <Trash2 className="h-5 w-5" />
            ) : isRestore ? (
              <RotateCcw className="h-5 w-5" />
            ) : isCancel ? (
              <Ban className="h-5 w-5" />
            ) : (
              <RefreshCcw className="h-5 w-5" />
            )}
          </div>
          <h2 className="mb-3 text-lg font-medium">{title}</h2>
          <p className="mb-8 text-sm leading-relaxed text-[#8a8a8a]">
            {description}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant={isDelete ? "destructive" : "outline"}
              className="h-10 rounded-full"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={isDelete ? "outline" : "default"}
              className={cn(
                "h-10 rounded-full",
                isMembership && "bg-green-600 hover:bg-green-700",
                isCancel && "bg-red-500 hover:bg-red-600",
                isRestore && "bg-[#1c9dde] hover:bg-[#168bc7]"
              )}
              disabled={isSaving || !state}
              onClick={async () => {
                if (!state) return;
                const success = await onConfirm(state.action, state.records);
                if (success) onClose();
              }}
            >
              {primaryLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const StudentsView = () => {
  const {
    activeTab,
    canManageMembership,
    error,
    fetchMembershipHistory,
    filters,
    isLoading,
    isMutating,
    isUcMainAdmin,
    membershipFee,
    page,
    pagedStudents,
    refresh,
    runAction,
    saveStudent,
    search,
    selectedIds,
    selectedStudents,
    setActiveTab,
    setFilters,
    setPage,
    setSearch,
    tabCounts,
    total,
    totalPages,
    togglePageSelection,
    toggleSort,
    toggleStudentSelection,
    updatePassword,
  } = useStudentsData();
  const [isAddMembershipOpen, setIsAddMembershipOpen] = useState(false);
  const [formStudent, setFormStudent] = useState<AdminStudent | null>(null);
  const [passwordStudent, setPasswordStudent] = useState<AdminStudent | null>(
    null
  );
  const [historyStudent, setHistoryStudent] = useState<AdminStudent | null>(
    null
  );
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(
    null
  );

  const bulkAction = useMemo(() => {
    if (activeTab === "deleted") return "restore";
    if (activeTab === "requests") return "approve";
    return "delete";
  }, [activeTab]) as StudentAction;

  const bulkLabel =
    bulkAction === "restore"
      ? "Restore"
      : bulkAction === "approve"
        ? "Approve"
        : "Suspend";

  return (
    <div className="bg-background flex min-h-full flex-1 flex-col text-[#333] [&_[data-disabled]]:pointer-events-auto [&_[data-disabled]]:cursor-not-allowed [&_[role=menuitem]]:cursor-pointer [&_a]:cursor-pointer [&_button:disabled]:pointer-events-auto [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer">
      <header className="flex flex-col justify-between gap-4 px-4 py-4 sm:flex-row sm:items-start sm:px-6 sm:py-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Students</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage registered student accounts
          </p>
        </div>

        {activeTab === "requests" && canManageMembership && (
          <Button
            type="button"
            className="h-10 shrink-0 rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
            onClick={() => setIsAddMembershipOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Membership
          </Button>
        )}
      </header>

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex [scrollbar-width:none] gap-6 overflow-x-auto border-b border-[#eeeeee] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cn(
                "relative flex shrink-0 cursor-pointer items-center gap-1.5 pb-3 text-sm whitespace-nowrap text-[#858585]",
                activeTab === tab.key && "font-medium text-[#1c9dde]"
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className="text-xs text-current/70">
                ({tabCounts[tab.key].toLocaleString()})
              </span>
              {activeTab === tab.key && (
                <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-[#1c9dde]" />
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-[22px] border border-[#e5e5e5] bg-white px-4 py-5 sm:px-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-[260px]">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9b9b9b]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="h-9 rounded-full border-[#e8e8e8] pl-9 text-sm"
              />
            </div>
            <StudentsFilterPopover filters={filters} onApply={setFilters} />
          </div>

          <StudentsTable
            activeTab={activeTab}
            data={pagedStudents}
            isLoading={isLoading}
            page={page}
            selectedIds={selectedIds}
            total={total}
            totalPages={totalPages}
            onAction={(action, records) => {
              if (action === "approve" && !canManageMembership) {
                showToast("error", "Unauthorized.");
                return;
              }
              if (!isUcMainAdmin) {
                showToast("error", "Unauthorized.");
                return;
              }
              setConfirmState({ action, records });
            }}
            onChangePassword={(student) => {
              if (!isUcMainAdmin) {
                showToast("error", "Unauthorized.");
                return;
              }
              setPasswordStudent(student);
            }}
            onEdit={(student) => {
              if (!isUcMainAdmin) {
                showToast("error", "Unauthorized.");
                return;
              }
              setFormStudent(student);
            }}
            onHistory={setHistoryStudent}
            onPageChange={setPage}
            onSelect={toggleStudentSelection}
            onSelectPage={togglePageSelection}
            onSort={toggleSort}
          />
        </section>
      </div>

      {selectedStudents.length > 0 && (
        <div className="fixed bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center overflow-hidden rounded-full bg-[#2f2f2f] px-4 py-3 text-sm text-white shadow-2xl">
          <span className="pr-5">
            {selectedStudents.length} of {total} selected
          </span>
          <span className="h-6 w-px bg-white/20" />
          <button
            type="button"
            className="flex items-center gap-2 px-5 disabled:opacity-40"
            disabled={
              !isUcMainAdmin ||
              ((activeTab === "requests" || bulkAction === "approve") &&
                !canManageMembership)
            }
            onClick={() =>
              setConfirmState({ action: bulkAction, records: selectedStudents })
            }
          >
            {bulkAction === "delete" ? (
              <Trash2 className="h-4 w-4" />
            ) : bulkAction === "restore" ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {bulkLabel}
          </button>
        </div>
      )}

      <StudentFormDialog
        key={formStudent?.id_number ?? "student-form-closed"}
        account={formStudent}
        isOpen={Boolean(formStudent)}
        isSaving={isMutating}
        onClose={() => setFormStudent(null)}
        onSubmit={saveStudent}
      />

      <PasswordDialog
        key={passwordStudent?.id_number ?? "student-password-closed"}
        account={passwordStudent}
        isOpen={Boolean(passwordStudent)}
        isSaving={isMutating}
        onClose={() => setPasswordStudent(null)}
        onSubmit={updatePassword}
      />

      <HistoryDialog
        account={historyStudent}
        isOpen={Boolean(historyStudent)}
        onClose={() => setHistoryStudent(null)}
        onFetch={fetchMembershipHistory}
      />

      <ConfirmDialog
        state={confirmState}
        isSaving={isMutating}
        membershipFee={membershipFee}
        onClose={() => setConfirmState(null)}
        onConfirm={runAction}
      />

      <AddMembershipDialog
        open={isAddMembershipOpen}
        onClose={() => setIsAddMembershipOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
};
