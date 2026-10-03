import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addOfficer,
  approveAdminAccount,
  approveRole,
  declineAdminAccount,
  declineRole,
  editOfficerApi,
  fetchAllStudentRequestRole,
  fetchStudentName,
  getAllMembers,
  getAllOfficers,
  getRequestAdminAccount,
  getSuspendOfficers,
  officerRestore,
  officerSuspend,
  requestRoleAdmin,
  roleRemove,
} from "@/features/admin/api/admin";
import { useAuth } from "@/features/auth";
import { normalizeCampus } from "@/features/auth/utils/campus";
import { changePasswordAdmin } from "@/features/auth/api/forgot";
import { showToast } from "@/utils/alertHelper";
import { PSITS_ROLES } from "../../constants/adminAccess";
import type {
  OrganizationAccount,
  OrganizationAccountFormValues,
  OrganizationAction,
  OrganizationFilters,
  OrganizationRoleRequestFormValues,
  OrganizationSort,
  OrganizationSortField,
  OrganizationTab,
} from "../types/organization.types";

const DEFAULT_FILTERS: OrganizationFilters = {
  courses: [],
  years: [],
  campuses: [],
  role: "all",
};

const DEFAULT_SORT: OrganizationSort = {
  field: "name",
  direction: "asc",
};

const ROWS_PER_PAGE = 8;

interface OrganizationApiRecord {
  _id?: string;
  id_number?: string;
  name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  course?: string;
  year?: string | number;
  role?: string;
  position?: string;
  campus?: string;
  status?: string;
  access?: string | string[];
  isRequest?: boolean;
  adminRequest?: string;
  githubUsername?: string;
}

const ORGANIZATION_TABS: OrganizationTab[] = [
  "admins",
  "members",
  "suspended",
  "memberRequests",
  "adminRequests",
];

const EMPTY_TAB_COUNTS: Record<OrganizationTab, number> = {
  admins: 0,
  members: 0,
  suspended: 0,
  memberRequests: 0,
  adminRequests: 0,
};

const fetchRecordsForTab = async (
  tab: OrganizationTab
): Promise<OrganizationApiRecord[]> => {
  const result =
    tab === "admins"
      ? await getAllOfficers()
      : tab === "members"
        ? await getAllMembers()
        : tab === "suspended"
          ? await getSuspendOfficers()
          : tab === "memberRequests"
            ? await fetchAllStudentRequestRole()
            : await getRequestAdminAccount();

  return (result || []) as OrganizationApiRecord[];
};

const formatRole = (value?: string) => {
  if (!value) return "";
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getName = (record: OrganizationApiRecord) => {
  if (record.name) return record.name.replace(/\s+/g, " ").trim();

  return [record.first_name, record.middle_name, record.last_name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeAccount = (
  record: OrganizationApiRecord,
  tab: OrganizationTab
): OrganizationAccount => {
  const isAdminRequest = tab === "adminRequests";
  const isMemberRequest = tab === "memberRequests";
  const isAdminRecord =
    tab === "admins" || tab === "suspended" || isAdminRequest;
  const role = isAdminRecord
    ? record.position || record.role || "Admin"
    : formatRole(record.role) || "Member";
  const status =
    isMemberRequest || isAdminRequest
      ? record.status === "Request" || record.isRequest
        ? "Pending"
        : record.status || "Pending"
      : record.status || (tab === "suspended" ? "Suspend" : "Active");

  const requestedBy = isMemberRequest ? record.adminRequest || "" : "";

  return {
    id: String(record._id || record.id_number || crypto.randomUUID()),
    id_number: String(record.id_number || ""),
    name: getName(record) || "Unnamed Account",
    email: record.email || "",
    course: record.course || "",
    year: String(record.year || ""),
    role,
    position: record.position || role,
    campus: record.campus || "",
    status,
    access: record.access,
    isRequest: record.isRequest,
    adminRequest: record.adminRequest,
    requestedBy,
    githubUsername: record.githubUsername || undefined,
    accountType: isMemberRequest
      ? "memberRequest"
      : isAdminRequest
        ? "adminRequest"
        : isAdminRecord
          ? "admin"
          : "member",
  };
};

const searchableText = (record: OrganizationAccount) =>
  [
    record.name,
    record.email,
    record.id_number,
    record.course,
    record.year,
    record.role,
    record.campus,
    record.status,
    record.adminRequest,
    record.requestedBy,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const getSortValue = (
  record: OrganizationAccount,
  field: OrganizationSortField
) => {
  if (field === "courseYear") return `${record.course} ${record.year}`;
  if (field === "campus") {
    if (record.accountType === "memberRequest") {
      return String(record.requestedBy || record.adminRequest || "");
    }
    if (record.accountType === "adminRequest") {
      return String(record.status || "");
    }
  }
  return String(record[field] || "");
};

const isSameSelection = (left: string[], right: string[]) =>
  left.length === right.length && left.every((item) => right.includes(item));

export const useOrganizationData = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<OrganizationTab>("admins");
  const [accounts, setAccounts] = useState<OrganizationAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<OrganizationFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<OrganizationSort>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabCounts, setTabCounts] =
    useState<Record<OrganizationTab, number>>(EMPTY_TAB_COUNTS);

  const isUcMainAdmin =
    user?.role === "admin" && normalizeCampus(user.campus) === "UC_MAIN";
  const isAdminAccess = isUcMainAdmin && user?.access === PSITS_ROLES.ADMIN;
  const isExecutiveAccess =
    isUcMainAdmin &&
    (user?.access === PSITS_ROLES.EXECUTIVE ||
      user?.access === PSITS_ROLES.ADMIN);

  const fetchAccounts = useCallback(
    async (tabOverride?: OrganizationTab) => {
      const tab = tabOverride ?? activeTab;
      setIsLoading(true);
      setError(null);

      try {
        const records = await fetchRecordsForTab(tab);
        const normalizedRecords = records.map((record) =>
          normalizeAccount(record, tab)
        );

        setAccounts(normalizedRecords);
        setTabCounts((currentCounts) => ({
          ...currentCounts,
          [tab]: normalizedRecords.length,
        }));
      } catch {
        setAccounts([]);
        setError("Unable to load organization data.");
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab]
  );

  const fetchTabCounts = useCallback(async () => {
    const countEntries = await Promise.all(
      ORGANIZATION_TABS.map(async (tab) => {
        try {
          const records = await fetchRecordsForTab(tab);
          return [tab, records.length] as const;
        } catch {
          return [tab, 0] as const;
        }
      })
    );

    setTabCounts(
      countEntries.reduce<Record<OrganizationTab, number>>(
        (nextCounts, [tab, count]) => ({
          ...nextCounts,
          [tab]: count,
        }),
        { ...EMPTY_TAB_COUNTS }
      )
    );
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    void fetchTabCounts();
  }, [fetchTabCounts]);

  useEffect(() => {
    setSelectedIds([]);
    setPage(1);
    setSearch("");
    setFilters(DEFAULT_FILTERS);
  }, [activeTab]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return accounts
      .filter((record) => {
        if (query && !searchableText(record).includes(query)) return false;
        if (
          filters.courses.length > 0 &&
          !filters.courses.includes(record.course)
        ) {
          return false;
        }
        if (filters.years.length > 0 && !filters.years.includes(record.year)) {
          return false;
        }
        if (
          filters.campuses.length > 0 &&
          !filters.campuses.includes(record.campus)
        ) {
          return false;
        }
        if (filters.role !== "all" && record.role !== filters.role) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        const leftValue = getSortValue(left, sort.field).toLowerCase();
        const rightValue = getSortValue(right, sort.field).toLowerCase();
        const result = leftValue.localeCompare(rightValue, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        return sort.direction === "asc" ? result : -result;
      });
  }, [accounts, filters, search, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAccounts.length / ROWS_PER_PAGE)
  );
  const currentPage = Math.min(page, totalPages);
  const pagedAccounts = filteredAccounts.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  const selectedAccounts = useMemo(
    () => accounts.filter((record) => selectedIds.includes(record.id_number)),
    [accounts, selectedIds]
  );

  const roleOptions = useMemo(
    () =>
      Array.from(
        new Set(accounts.map((record) => record.role).filter(Boolean))
      ).sort((left, right) => left.localeCompare(right)),
    [accounts]
  );

  const toggleSort = (field: OrganizationSortField) => {
    setSort((currentSort) =>
      currentSort.field === field
        ? {
            field,
            direction: currentSort.direction === "asc" ? "desc" : "asc",
          }
        : { field, direction: "asc" }
    );
  };

  const toggleAccountSelection = (idNumber: string) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(idNumber)
        ? currentIds.filter((id) => id !== idNumber)
        : [...currentIds, idNumber]
    );
  };

  const togglePageSelection = () => {
    const pageIds = pagedAccounts.map((record) => record.id_number);
    setSelectedIds((currentIds) =>
      isSameSelection(
        currentIds.filter((id) => pageIds.includes(id)),
        pageIds
      )
        ? currentIds.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...currentIds, ...pageIds]))
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const saveAdminAccount = async (
    values: OrganizationAccountFormValues
  ): Promise<boolean> => {
    setIsMutating(true);
    try {
      const result = await editOfficerApi({
        id_number: values.id_number,
        name: values.name,
        email: values.email,
        course: values.course,
        year: values.year,
        position: values.position,
        campus: values.campus,
        githubUsername: values.githubUsername || null,
      });

      if (result) {
        await Promise.all([fetchAccounts(), fetchTabCounts()]);
        return true;
      }
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const createAdminAccount = async (
    values: OrganizationAccountFormValues
  ): Promise<boolean> => {
    if (!values.password || values.password !== values.confirm_password) {
      showToast("error", "Passwords do not match.");
      return false;
    }

    setIsMutating(true);
    try {
      const result = await addOfficer({
        id_number: values.id_number,
        name: values.name,
        email: values.email,
        password: values.password,
        course: values.course,
        year: values.year,
        position: values.position,
        campus: values.campus,
        status: "Request",
      });

      if (result) {
        await Promise.all([fetchAccounts(), fetchTabCounts()]);
        return true;
      }
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const updatePassword = async (idNumber: string, password: string) => {
    setIsMutating(true);
    try {
      const result = await changePasswordAdmin(password, idNumber);
      return result;
    } finally {
      setIsMutating(false);
    }
  };

  const findStudentById = async (idNumber: string) => {
    const result = await fetchStudentName(idNumber);
    return result?.data
      ? normalizeAccount(result.data as OrganizationApiRecord, "members")
      : null;
  };

  const requestMemberRole = async (
    values: OrganizationRoleRequestFormValues
  ) => {
    setIsMutating(true);
    try {
      const result = await requestRoleAdmin(
        values.role.toLowerCase(),
        values.id_number,
        user?.name || ""
      );
      if (result) {
        const nextTab: OrganizationTab = "memberRequests";
        setActiveTab(nextTab);
        setPage(1);
        await Promise.all([fetchAccounts(nextTab), fetchTabCounts()]);
      }
      return Boolean(result);
    } finally {
      setIsMutating(false);
    }
  };

  const runAction = async (
    action: OrganizationAction,
    records: OrganizationAccount[]
  ) => {
    if (records.length === 0) return false;

    setIsMutating(true);
    try {
      const results = await Promise.all(
        records.map((record) => {
          if (action === "suspend") return officerSuspend(record.id_number);
          if (action === "restore") return officerRestore(record.id_number);
          if (action === "removeRole") return roleRemove(record.id_number);
          if (action === "approve") {
            return record.accountType === "memberRequest"
              ? approveRole(record.id_number)
              : approveAdminAccount(record.id_number);
          }
          return record.accountType === "memberRequest"
            ? declineRole(record.id_number)
            : declineAdminAccount(record.id_number);
        })
      );

      const isSuccess = results.every((result) =>
        typeof result === "boolean" ? result : result === 200
      );

      if (isSuccess) {
        if (action === "suspend") showToast("success", "Account suspended.");
        if (action === "restore") showToast("success", "Account restored.");
        if (action === "removeRole") showToast("success", "Role removed.");

        const shouldOpenMembersTab =
          action === "approve" &&
          records.some((record) => record.accountType === "memberRequest");

        if (shouldOpenMembersTab) {
          setActiveTab("members");
          setPage(1);
          await Promise.all([fetchAccounts("members"), fetchTabCounts()]);
        } else {
          await Promise.all([fetchAccounts(), fetchTabCounts()]);
        }
        clearSelection();
      }

      return isSuccess;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    activeTab,
    accounts,
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
    total: filteredAccounts.length,
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
  };
};
