import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleSlash,
  Eye,
  EyeOff,
  Filter,
  KeyRound,
  Lock,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UserCog,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
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
import { useOrganizationData } from "../hooks/useOrganizationData";
import type {
  OrganizationAccount,
  OrganizationAccountFormValues,
  OrganizationAction,
  OrganizationFilters,
  OrganizationSortField,
  OrganizationTab,
} from "../types/organization.types";

const tabs: Array<{
  key: OrganizationTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "admins", label: "Admins", icon: UserCog },
  { key: "members", label: "Members", icon: UsersRound },
  { key: "suspended", label: "Suspended", icon: CircleSlash },
  { key: "adminRequests", label: "Admin Request", icon: Mail },
];

const courses = ["BSIT", "BSCS", "ACT"];
const years = ["1", "2", "3", "4"];
const campuses = [
  "UC_MAIN",
  "UC_BANILAD",
  "UC_LM",
  "UC_PT",
  "UC_JONES",
  "OTHER_CAMPUS",
];
const adminRoles = [
  "President",
  "Vice-President Internal",
  "Vice-President External",
  "Secretary",
  "Treasurer",
  "Assistant Treasurer",
  "Auditor",
  "P.I.O",
  "P.R.O",
  "Chief Volunteer",
  "1st Year Representative",
  "2nd Year Representative",
  "3rd Year Representative",
  "4th Year Representative",
  "Developer",
  "Head Developer",
  "Quality Assurance",
  "Lead Developer",
];
const memberRoles = ["developer", "officers", "media", "volunteer"];
const avatarColors = [
  "bg-[#ffb284]",
  "bg-[#8698f7]",
  "bg-[#bd76f4]",
  "bg-[#ff7f87]",
  "bg-[#d95c00]",
  "bg-[#078b35]",
  "bg-[#c30000]",
  "bg-[#f05ec1]",
];

const initialFormValues: OrganizationAccountFormValues = {
  id_number: "",
  name: "",
  email: "",
  course: "BSIT",
  year: "3",
  position: "Developer",
  campus: "UC_MAIN",
  githubUsername: "",
  password: "",
  confirm_password: "",
};

const getFormInitialValues = (
  account?: OrganizationAccount | null
): OrganizationAccountFormValues =>
  account
    ? {
        id_number: account.id_number,
        name: account.name,
        email: account.email,
        course: account.course || "BSIT",
        year: account.year || "3",
        position: account.position || account.role || "Developer",
        campus: account.campus || "UC_MAIN",
        githubUsername: account.githubUsername || "",
        password: "",
        confirm_password: "",
      }
    : initialFormValues;

const formatYear = (year: string) => {
  if (year === "1") return "1st Year";
  if (year === "2") return "2nd Year";
  if (year === "3") return "3rd Year";
  if (year === "4") return "4th Year";
  return year || "Year";
};

const shortCampus = (campus: string) =>
  campus.replace("UC_", "UC - ").replace("MAIN", "Main");

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getAvatarColor = (name: string) => {
  const index = name
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return avatarColors[index % avatarColors.length];
};

const pageRange = (currentPage: number, totalPages: number) => {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 2) return [1, 2, 3];
  if (currentPage >= totalPages - 1) {
    return [totalPages - 2, totalPages - 1, totalPages];
  }
  return [currentPage - 1, currentPage, currentPage + 1];
};

interface OrganizationTableProps {
  activeTab: OrganizationTab;
  data: OrganizationAccount[];
  isAdminAccess: boolean;
  isExecutiveAccess: boolean;
  isLoading: boolean;
  page: number;
  selectedIds: string[];
  sortField: OrganizationSortField;
  total: number;
  totalPages: number;
  onAction: (
    action: OrganizationAction,
    records: OrganizationAccount[]
  ) => void;
  onChangePassword: (account: OrganizationAccount) => void;
  onEdit: (account: OrganizationAccount) => void;
  onPageChange: (page: number) => void;
  onSelect: (idNumber: string) => void;
  onSelectPage: () => void;
  onSort: (field: OrganizationSortField) => void;
}

const SortLabel = ({
  children,
  field,
  onSort,
}: {
  children: string;
  field: OrganizationSortField;
  onSort: (field: OrganizationSortField) => void;
}) => (
  <button
    type="button"
    onClick={() => onSort(field)}
    className="flex items-center gap-1 text-left"
  >
    {children}
    <ChevronsUpDown className="h-3 w-3 text-[#737373]" />
  </button>
);

const OrganizationTable = ({
  activeTab,
  data,
  isAdminAccess,
  isExecutiveAccess,
  isLoading,
  page,
  selectedIds,
  total,
  totalPages,
  onAction,
  onChangePassword,
  onEdit,
  onPageChange,
  onSelect,
  onSelectPage,
  onSort,
}: OrganizationTableProps) => {
  const visiblePages = pageRange(page, totalPages);
  const pageIds = data.map((record) => record.id_number);
  const isPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const isSomePageSelected =
    !isPageSelected && pageIds.some((id) => selectedIds.includes(id));

  const canUseAdminActions = activeTab !== "members" && isAdminAccess;
  const canUseMemberActions = activeTab === "members" && isExecutiveAccess;
  const isRequestTab =
    activeTab === "memberRequests" || activeTab === "adminRequests";
  const campusHeader =
    activeTab === "memberRequests"
      ? "Requested By"
      : activeTab === "adminRequests"
        ? "Status"
        : "Campus";

  return (
    <>
      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full table-fixed border-collapse text-sm",
            isRequestTab ? "min-w-[920px]" : "min-w-[760px]"
          )}
        >
          <thead>
            <tr className="rounded-md bg-[#efefef] text-[#2f2f2f]">
              <th className="w-10 rounded-l-md px-2 py-2 text-left">
                <Checkbox
                  checked={
                    isPageSelected || (isSomePageSelected && "indeterminate")
                  }
                  onCheckedChange={onSelectPage}
                  className="border-[#a7a7a7] data-[state=checked]:border-[#1c9dde] data-[state=checked]:bg-[#1c9dde]"
                  aria-label="Select visible rows"
                />
              </th>
              <th className="w-[30%] px-2 py-2 font-medium">
                <SortLabel field="name" onSort={onSort}>
                  Name
                </SortLabel>
              </th>
              <th className="w-[14%] px-2 py-2 font-medium">
                <SortLabel field="id_number" onSort={onSort}>
                  Student ID
                </SortLabel>
              </th>
              <th className="w-[15%] px-2 py-2 font-medium">
                <SortLabel field="courseYear" onSort={onSort}>
                  Course & Year
                </SortLabel>
              </th>
              <th className="w-[18%] px-2 py-2 font-medium">
                <SortLabel field="role" onSort={onSort}>
                  {isRequestTab ? "Requested Role" : "Role"}
                </SortLabel>
              </th>
              <th className="w-[14%] px-2 py-2 font-medium">
                <SortLabel field="campus" onSort={onSort}>
                  {campusHeader}
                </SortLabel>
              </th>
              <th
                className={cn(
                  "rounded-r-md px-2 py-2",
                  isRequestTab ? "w-[190px]" : "w-11"
                )}
              />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }, (_, index) => (
                <tr key={index} className="border-b border-[#ededed]">
                  <td className="px-2 py-3">
                    <Skeleton className="h-4 w-4 rounded" />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-32 rounded-full" />
                        <Skeleton className="h-3 w-40 rounded-full" />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <Skeleton className="h-3 w-20 rounded-full" />
                  </td>
                  <td className="px-2 py-3">
                    <Skeleton className="h-3 w-16 rounded-full" />
                  </td>
                  <td className="px-2 py-3">
                    <Skeleton className="h-3 w-24 rounded-full" />
                  </td>
                  <td className="px-2 py-3">
                    <Skeleton className="h-3 w-20 rounded-full" />
                  </td>
                  <td className="px-2 py-3">
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </td>
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((account) => (
                <tr
                  key={`${activeTab}-${account.id_number}`}
                  className="border-b border-[#ededed] text-[#303030]"
                >
                  <td className="px-2 py-3">
                    <Checkbox
                      checked={selectedIds.includes(account.id_number)}
                      onCheckedChange={() => onSelect(account.id_number)}
                      className="border-[#a7a7a7] data-[state=checked]:border-[#1c9dde] data-[state=checked]:bg-[#1c9dde]"
                      aria-label={`Select ${account.name}`}
                    />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white",
                          getAvatarColor(account.name)
                        )}
                      >
                        {getInitials(account.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {account.name}
                        </p>
                        <p className="truncate text-xs text-[#929292]">
                          {account.email || "No email"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">{account.id_number}</td>
                  <td className="px-2 py-3">
                    {account.course || "-"}{" "}
                    {account.year ? `- ${account.year}` : ""}
                  </td>
                  <td className="truncate px-2 py-3">{account.role || "-"}</td>
                  <td className="px-2 py-3">
                    {activeTab === "memberRequests"
                      ? account.adminRequest || "-"
                      : activeTab === "adminRequests"
                        ? account.status || "-"
                        : account.campus
                          ? shortCampus(account.campus)
                          : "-"}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {isRequestTab ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!isAdminAccess}
                          className="h-8 rounded-full bg-emerald-50 px-3 text-xs text-emerald-700 hover:bg-emerald-100"
                          onClick={() => onAction("approve", [account])}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!isAdminAccess}
                          className="h-8 rounded-full bg-red-50 px-3 text-xs text-red-600 hover:bg-red-100"
                          onClick={() => onAction("decline", [account])}
                        >
                          <X className="h-3.5 w-3.5" />
                          Deny
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7 rounded-full border border-[#eeeeee]"
                            aria-label={`Actions for ${account.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-52 rounded-xl p-1.5"
                        >
                          {activeTab === "admins" && (
                            <>
                              <DropdownMenuItem
                                disabled={!canUseAdminActions}
                                onClick={() => onEdit(account)}
                              >
                                <UserRoundCheck className="h-4 w-4" />
                                Edit Account Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!canUseAdminActions}
                                onClick={() => onChangePassword(account)}
                              >
                                <KeyRound className="h-4 w-4" />
                                Change Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!canUseAdminActions}
                                onClick={() => onAction("suspend", [account])}
                              >
                                <Ban className="h-4 w-4" />
                                Suspend Account
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>
                                <Lock className="h-4 w-4" />
                                Disable Account
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled variant="destructive">
                                <Trash2 className="h-4 w-4" />
                                Delete Account
                              </DropdownMenuItem>
                            </>
                          )}
                          {activeTab === "members" && (
                            <DropdownMenuItem
                              disabled={!canUseMemberActions}
                              onClick={() => onAction("removeRole", [account])}
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove Role
                            </DropdownMenuItem>
                          )}
                          {activeTab === "suspended" && (
                            <DropdownMenuItem
                              disabled={!canUseAdminActions}
                              onClick={() => onAction("restore", [account])}
                            >
                              <Check className="h-4 w-4" />
                              Restore Account
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                  No organization records found.
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
            className="flex items-center gap-1 rounded-full px-2 py-1 disabled:text-[#c9c9c9]"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-3 w-3" />
            Previous
          </button>
          {visiblePages.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => onPageChange(item)}
              className={cn(
                "h-7 min-w-7 rounded-full px-2",
                item === page
                  ? "bg-[#1c9dde] text-white"
                  : "border border-[#eeeeee] bg-white text-[#696969]"
              )}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            className="flex items-center gap-1 rounded-full px-2 py-1 disabled:text-[#c9c9c9]"
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

interface OrganizationFilterPopoverProps {
  filters: OrganizationFilters;
  roleOptions: string[];
  onApply: (filters: OrganizationFilters) => void;
}

const toggleFilterItem = (items: string[], value: string) =>
  items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];

const OrganizationFilterPopover = ({
  filters,
  roleOptions,
  onApply,
}: OrganizationFilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const emptyFilters: OrganizationFilters = {
    courses: [],
    years: [],
    campuses: [],
    role: "all",
  };
  const hasActiveFilters =
    filters.courses.length > 0 ||
    filters.years.length > 0 ||
    filters.campuses.length > 0 ||
    filters.role !== "all";

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

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
            variant="outline"
            className="h-9 rounded-full border-[#e5e5e5] px-4 text-sm"
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
          className="w-[330px] rounded-2xl border-[#eeeeee] p-5 shadow-xl"
        >
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-base font-medium">Filter</h3>
            <button
              type="button"
              className="text-xs text-red-500"
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
                    type="button"
                    key={course}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        courses: toggleFilterItem(current.courses, course),
                      }))
                    }
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-xs",
                      draft.courses.includes(course)
                        ? "border-[#1c9dde] bg-[#1c9dde]/10 text-[#1c9dde]"
                        : "border-[#e5e5e5] text-[#5f5f5f]"
                    )}
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
                    type="button"
                    key={year}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        years: toggleFilterItem(current.years, year),
                      }))
                    }
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-xs",
                      draft.years.includes(year)
                        ? "border-[#1c9dde] bg-[#1c9dde]/10 text-[#1c9dde]"
                        : "border-[#e5e5e5] text-[#5f5f5f]"
                    )}
                  >
                    {formatYear(year)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium">Role</p>
              <Select
                value={draft.role}
                onValueChange={(role) =>
                  setDraft((current) => ({ ...current, role }))
                }
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-[#e5e5e5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium">Campus</p>
              <div className="flex flex-wrap gap-2">
                {campuses.map((campus) => (
                  <button
                    type="button"
                    key={campus}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        campuses: toggleFilterItem(current.campuses, campus),
                      }))
                    }
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-xs",
                      draft.campuses.includes(campus)
                        ? "border-[#1c9dde] bg-[#1c9dde]/10 text-[#1c9dde]"
                        : "border-[#e5e5e5] text-[#5f5f5f]"
                    )}
                  >
                    {campus.replace("UC-", "UC ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full px-5"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#1c9dde] px-5 hover:bg-[#168bc7]"
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

interface AccountFormDialogProps {
  account?: OrganizationAccount | null;
  isSubmitting: boolean;
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OrganizationAccountFormValues) => Promise<boolean>;
}

const AccountFormDialog = ({
  account,
  isSubmitting,
  mode,
  open,
  onOpenChange,
  onSubmit,
}: AccountFormDialogProps) => {
  const [values, setValues] = useState(() => getFormInitialValues(account));
  const isCreate = mode === "create";

  const updateValue = (
    field: keyof OrganizationAccountFormValues,
    value: string
  ) => setValues((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await onSubmit(values);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[520px] rounded-[20px] p-0"
        showCloseButton={false}
      >
        <form onSubmit={handleSubmit} className="p-6">
          <DialogHeader className="mb-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-full text-base font-semibold text-white",
                    getAvatarColor(values.name || "Account")
                  )}
                >
                  {getInitials(values.name || "Account")}
                </div>
                <div>
                  <DialogTitle className="text-base">
                    {values.name || (isCreate ? "New account" : "Account")}
                  </DialogTitle>
                  <p className="text-xs text-[#8b8b8b]">
                    {values.email || "Add account details"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="grid h-8 w-8 place-items-center rounded-full border border-[#eeeeee] text-[#777]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Student ID Number</Label>
              <div className="relative mt-1">
                <Input
                  value={values.id_number}
                  onChange={(event) =>
                    //"-admin" is shown as a fixed affix, so it never belongs in
                    //the typed value, the server appends it on create
                    updateValue(
                      "id_number",
                      event.target.value.replace(/-admin$/i, "")
                    )
                  }
                  className={cn(
                    "h-10 rounded-lg border-[#eeeeee] bg-[#f1f1f1]",
                    isCreate && "pr-16"
                  )}
                  disabled={!isCreate}
                  required
                />
                {isCreate && (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-[#8b8b8b]">
                    -admin
                  </span>
                )}
              </div>
              {isCreate && (
                <p className="mt-1 text-[11px] text-[#8b8b8b]">
                  The account will be saved as{" "}
                  {values.id_number.trim() || "<student ID>"}-admin
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-medium">Name</Label>
                <Input
                  value={values.name}
                  onChange={(event) => updateValue("name", event.target.value)}
                  className="mt-1 h-10 rounded-lg border-[#eeeeee]"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Course</Label>
                <Select
                  value={values.course}
                  onValueChange={(value) => updateValue("course", value)}
                >
                  <SelectTrigger className="mt-1 h-10 w-full rounded-lg border-[#eeeeee]">
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
                <Label className="text-xs font-medium">Year Level</Label>
                <Select
                  value={values.year}
                  onValueChange={(value) => updateValue("year", value)}
                >
                  <SelectTrigger className="mt-1 h-10 w-full rounded-lg border-[#eeeeee]">
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

            <div>
              <Label className="text-xs font-medium">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8b8b8b]" />
                <Input
                  type="email"
                  value={values.email}
                  onChange={(event) => updateValue("email", event.target.value)}
                  className="h-10 rounded-lg border-[#eeeeee] pl-9"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium">Role</Label>
                <Select
                  value={values.position}
                  onValueChange={(value) => updateValue("position", value)}
                >
                  <SelectTrigger className="mt-1 h-10 w-full rounded-lg border-[#eeeeee]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Campus</Label>
                <Select
                  value={values.campus}
                  onValueChange={(value) => updateValue("campus", value)}
                >
                  <SelectTrigger className="mt-1 h-10 w-full rounded-lg border-[#eeeeee]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map((campus) => (
                      <SelectItem key={campus} value={campus}>
                        {campus.replace("UC-", "UC ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">GitHub Username</Label>
              <Input
                value={values.githubUsername || ""}
                onChange={(event) =>
                  updateValue("githubUsername", event.target.value)
                }
                className="mt-1 h-10 rounded-lg border-[#eeeeee]"
                placeholder="e.g. octocat"
              />
            </div>

            {isCreate && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium">Password</Label>
                  <Input
                    type="password"
                    value={values.password || ""}
                    onChange={(event) =>
                      updateValue("password", event.target.value)
                    }
                    className="mt-1 h-10 rounded-lg border-[#eeeeee]"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">
                    Confirm Password
                  </Label>
                  <Input
                    type="password"
                    value={values.confirm_password || ""}
                    onChange={(event) =>
                      updateValue("confirm_password", event.target.value)
                    }
                    className="mt-1 h-10 rounded-lg border-[#eeeeee]"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-7">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-8"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[#1c9dde] px-8 hover:bg-[#168bc7]"
            >
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface PasswordDialogProps {
  account?: OrganizationAccount | null;
  isSubmitting: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (idNumber: string, password: string) => Promise<boolean>;
}

const PasswordDialog = ({
  account,
  isSubmitting,
  open,
  onOpenChange,
  onSubmit,
}: PasswordDialogProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account) return;
    if (password !== confirmPassword) {
      showToast("error", "Passwords do not match.");
      return;
    }

    const result = await onSubmit(account.id_number, password);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[420px] rounded-[20px] p-0"
        showCloseButton={false}
      >
        <form onSubmit={handleSubmit} className="p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-full text-base font-semibold text-white",
                    getAvatarColor(account?.name || "Account")
                  )}
                >
                  {getInitials(account?.name || "Account")}
                </div>
                <div>
                  <DialogTitle className="text-base">
                    {account?.name || "Account"}
                  </DialogTitle>
                  <p className="text-xs text-[#8b8b8b]">
                    {account?.email || "Change password"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="grid h-8 w-8 place-items-center rounded-full border border-[#eeeeee] text-[#777]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">New Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your new password"
                  className="h-10 rounded-lg border-[#eeeeee] pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#777]"
                  onClick={() => setShowPassword((current) => !current)}
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
              <Label className="text-xs font-medium">
                Re-enter your new password
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm password"
                  className="h-10 rounded-lg border-[#eeeeee] pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#777]"
                  onClick={() => setShowConfirmPassword((current) => !current)}
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
          <DialogFooter className="mt-7">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-8"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[#1c9dde] px-8 hover:bg-[#168bc7]"
            >
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface RoleRequestDialogProps {
  isSubmitting: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (idNumber: string) => Promise<OrganizationAccount | null>;
  onSubmit: (values: { id_number: string; role: string }) => Promise<boolean>;
}

const RoleRequestDialog = ({
  isSubmitting,
  open,
  onOpenChange,
  onSearch,
  onSubmit,
}: RoleRequestDialogProps) => {
  const [idNumber, setIdNumber] = useState("");
  const [role, setRole] = useState("developer");
  const [result, setResult] = useState<OrganizationAccount | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    const account = await onSearch(idNumber);
    setResult(account);
    if (!account)
      showToast("error", "No student found or it is already added.");
    setIsSearching(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await onSubmit({ id_number: idNumber, role });
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] rounded-[20px]" showCloseButton>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Member Role</DialogTitle>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <div>
              <Label className="text-xs font-medium">Student ID Number</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={idNumber}
                  onChange={(event) => setIdNumber(event.target.value)}
                  className="h-10 rounded-lg border-[#eeeeee]"
                  required
                />
                <Button
                  type="button"
                  className="bg-[#1c9dde] hover:bg-[#168bc7]"
                  disabled={isSearching}
                  onClick={handleSearch}
                >
                  Search
                </Button>
              </div>
            </div>
            {result && (
              <>
                <div className="rounded-xl border border-[#eeeeee] p-3">
                  <p className="text-sm font-medium">{result.name}</p>
                  <p className="text-xs text-[#8b8b8b]">{result.email}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="mt-1 h-10 w-full rounded-lg border-[#eeeeee]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {memberRoles.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item.charAt(0).toUpperCase() + item.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="mt-7">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-8"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!result || isSubmitting}
              className="rounded-full bg-[#1c9dde] px-8 hover:bg-[#168bc7]"
            >
              Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface ConfirmDialogState {
  action: OrganizationAction;
  records: OrganizationAccount[];
}

interface ConfirmActionDialogProps {
  state: ConfirmDialogState | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmActionDialog = ({
  state,
  isSubmitting,
  onCancel,
  onConfirm,
}: ConfirmActionDialogProps) => {
  const actionLabel =
    state?.action === "suspend"
      ? "Suspend"
      : state?.action === "restore"
        ? "Restore"
        : state?.action === "removeRole"
          ? "Remove role from"
          : state?.action === "approve"
            ? "Approve"
            : "Decline";
  const count = state?.records.length || 0;

  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm rounded-[20px]">
        <DialogHeader>
          <DialogTitle>{actionLabel} account?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#777]">
          This will apply to {count} selected{" "}
          {count === 1 ? "record" : "records"}.
        </p>
        <DialogFooter className="mt-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            className={cn(
              "rounded-full",
              state?.action === "removeRole" || state?.action === "decline"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-[#1c9dde] hover:bg-[#168bc7]"
            )}
            onClick={onConfirm}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const OrganizationView = () => {
  const {
    activeTab,
    currentPage,
    error,
    filters,
    isAdminAccess,
    isExecutiveAccess,
    isLoading,
    isMutating,
    pagedAccounts,
    roleOptions,
    search,
    selectedAccounts,
    selectedIds,
    sort,
    tabCounts,
    total,
    totalPages,
    clearSelection,
    createAdminAccount,
    findStudentById,
    requestMemberRole,
    runAction,
    saveAdminAccount,
    setActiveTab,
    setFilters,
    setPage,
    setSearch,
    toggleAccountSelection,
    togglePageSelection,
    toggleSort,
    updatePassword,
  } = useOrganizationData();
  const [formMode, setFormMode] = useState<"create" | "edit">("edit");
  const [formAccount, setFormAccount] = useState<OrganizationAccount | null>(
    null
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [passwordAccount, setPasswordAccount] =
    useState<OrganizationAccount | null>(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isRoleRequestOpen, setIsRoleRequestOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(
    null
  );

  const selectedAction = useMemo(() => {
    if (activeTab === "admins") return "suspend";
    if (activeTab === "members") return "removeRole";
    if (activeTab === "suspended") return "restore";
    return "approve";
  }, [activeTab]) as OrganizationAction;

  const selectedActionLabel =
    selectedAction === "suspend"
      ? "Suspend"
      : selectedAction === "restore"
        ? "Restore"
        : selectedAction === "removeRole"
          ? "Remove role"
          : "Approve";

  const handleAddClick = () => {
    if (activeTab === "members") {
      if (!isExecutiveAccess) {
        showToast("error", "Unauthorized.");
        return;
      }
      setIsRoleRequestOpen(true);
      return;
    }

    if (!isAdminAccess) {
      showToast("error", "Unauthorized.");
      return;
    }

    setFormMode("create");
    setFormAccount(null);
    setIsFormOpen(true);
  };

  const showAddButton = activeTab === "admins" || activeTab === "members";

  return (
    <div className="bg-background flex min-h-full flex-1 flex-col text-[#333] [&_[data-disabled]]:pointer-events-auto [&_[data-disabled]]:cursor-not-allowed [&_[role=menuitem]]:cursor-pointer [&_[role=menuitem][data-disabled]]:cursor-not-allowed [&_[role=option]]:cursor-pointer [&_a]:cursor-pointer [&_button:disabled]:pointer-events-auto [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer">
      <header className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Organization</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage registered members and their details
        </p>
      </header>

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap gap-8 border-b border-[#eeeeee]">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={cn(
                "relative flex cursor-pointer items-center gap-2 pb-3 text-sm text-[#858585]",
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
            <div className="flex flex-wrap items-center justify-end gap-3">
              <OrganizationFilterPopover
                filters={filters}
                roleOptions={roleOptions}
                onApply={setFilters}
              />
              {showAddButton && (
                <Button
                  type="button"
                  className="h-9 rounded-full bg-[#1c9dde] px-5 hover:bg-[#168bc7]"
                  onClick={handleAddClick}
                >
                  <Plus className="h-4 w-4" />
                  {activeTab === "members" ? "Add Member Role" : "Add Account"}
                </Button>
              )}
            </div>
          </div>

          <OrganizationTable
            activeTab={activeTab}
            data={pagedAccounts}
            isAdminAccess={isAdminAccess}
            isExecutiveAccess={isExecutiveAccess}
            isLoading={isLoading}
            page={currentPage}
            selectedIds={selectedIds}
            sortField={sort.field}
            total={total}
            totalPages={totalPages}
            onAction={(action, records) => setConfirmState({ action, records })}
            onChangePassword={(account) => {
              setPasswordAccount(account);
              setIsPasswordOpen(true);
            }}
            onEdit={(account) => {
              setFormMode("edit");
              setFormAccount(account);
              setIsFormOpen(true);
            }}
            onPageChange={setPage}
            onSelect={toggleAccountSelection}
            onSelectPage={togglePageSelection}
            onSort={toggleSort}
          />
        </section>
      </div>

      {selectedAccounts.length > 0 && (
        <div className="fixed bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center overflow-hidden rounded-full bg-[#2f2f2f] px-4 py-3 text-sm text-white shadow-2xl">
          <span className="pr-5">
            {selectedAccounts.length} of {total} selected
          </span>
          <span className="h-6 w-px bg-white/20" />
          <button
            type="button"
            className="flex items-center gap-2 px-5 disabled:opacity-40"
            disabled={
              (activeTab === "members" && !isExecutiveAccess) ||
              (activeTab !== "members" && !isAdminAccess)
            }
            onClick={() =>
              setConfirmState({
                action: selectedAction,
                records: selectedAccounts,
              })
            }
          >
            {selectedAction === "removeRole" ? (
              <Trash2 className="h-4 w-4" />
            ) : selectedAction === "restore" || selectedAction === "approve" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            {selectedActionLabel}
          </button>
          <span className="h-6 w-px bg-white/20" />
          <button
            type="button"
            className="px-5 text-white/70"
            onClick={clearSelection}
          >
            Clear
          </button>
        </div>
      )}

      <AccountFormDialog
        key={`${formMode}-${formAccount?.id_number || "new"}-${isFormOpen}`}
        account={formAccount}
        isSubmitting={isMutating}
        mode={formMode}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={formMode === "create" ? createAdminAccount : saveAdminAccount}
      />
      <PasswordDialog
        key={`${passwordAccount?.id_number || "password"}-${isPasswordOpen}`}
        account={passwordAccount}
        isSubmitting={isMutating}
        open={isPasswordOpen}
        onOpenChange={setIsPasswordOpen}
        onSubmit={updatePassword}
      />
      <RoleRequestDialog
        key={`role-request-${isRoleRequestOpen}`}
        isSubmitting={isMutating}
        open={isRoleRequestOpen}
        onOpenChange={setIsRoleRequestOpen}
        onSearch={findStudentById}
        onSubmit={requestMemberRole}
      />
      <ConfirmActionDialog
        state={confirmState}
        isSubmitting={isMutating}
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (!confirmState) return;
          await runAction(confirmState.action, confirmState.records);
          setConfirmState(null);
        }}
      />
    </div>
  );
};
