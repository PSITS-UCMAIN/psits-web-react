import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  exportMerchandiseReports,
  membershipHistory,
  membershipOptions,
  merchandiseReportFilterOptions,
  merchandiseReports,
} from "@/features/admin/api/admin";
import type { MembershipOption } from "@/features/admin/api/admin";
import { showToast } from "@/utils/alertHelper";
import type {
  MembershipReportRow,
  MerchandiseOrderDetail,
  MerchandiseReportProductOption,
  ReportsFilters,
  ReportsStatus,
  ReportsTab,
} from "../types/reports.types";

export const ROWS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 250;
const EMPTY_MEMBERSHIP_ROWS: MembershipReportRow[] = [];

export const DEFAULT_FILTERS: ReportsFilters = {
  id: "",
  name: "",
  rfid: "",
  course: "",
  year: "",
  productId: "",
  batch: "",
  size: "",
  color: "",
  dateFrom: "",
  dateTo: "",
  term: "",
  type: "",
  membershipName: "",
};

const toDateKey = (value: string | Date | undefined): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const flattenVariantField = (value: unknown): string[] => {
  if (value == null) return [];
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(flattenVariantField);
  if (
    typeof value === "object" &&
    "$each" in (value as Record<string, unknown>)
  ) {
    return flattenVariantField((value as { $each: unknown }).$each);
  }
  return [];
};

export const useReportsData = () => {
  const [activeTab, setActiveTabState] = useState<ReportsTab>("membership");
  const [page, setPage] = useState(1);

  const [membershipData, setMembershipData] = useState<MembershipReportRow[]>(
    []
  );
  const [membershipStatus, setMembershipStatus] =
    useState<ReportsStatus>("idle");

  const [merchandiseDetails, setMerchandiseDetails] = useState<
    MerchandiseOrderDetail[]
  >([]);
  const [merchandiseTotal, setMerchandiseTotal] = useState(0);
  const [merchandiseTotalPages, setMerchandiseTotalPages] = useState(1);
  const [merchandiseProductOptions, setMerchandiseProductOptions] = useState<
    MerchandiseReportProductOption[]
  >([]);
  const [merchandiseSummary, setMerchandiseSummary] = useState({
    unitsSold: 0,
    totalRevenue: 0,
  });
  const [merchandiseStatus, setMerchandiseStatus] =
    useState<ReportsStatus>("idle");

  const [filters, setFiltersState] = useState<ReportsFilters>(DEFAULT_FILTERS);
  const [search, setSearchState] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [membershipOptionsList, setMembershipOptionsList] = useState<
    MembershipOption[]
  >([]);
  const membershipOptionsRequestedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (membershipOptionsRequestedRef.current) return;
    membershipOptionsRequestedRef.current = true;
    void membershipOptions().then((result) => {
      setMembershipOptionsList(result ?? []);
    });
  }, []);

  const [isExporting, setIsExporting] = useState(false);
  const membershipRequestRef = useRef(0);
  const merchandiseRequestRef = useRef(0);
  const merchandiseOverviewRequestRef = useRef(0);
  const merchandiseOptionsRequestedRef = useRef(false);
  const merchandiseViewRequestedRef = useRef(false);

  const setActiveTab = useCallback((value: ReportsTab) => {
    setActiveTabState(value);
    setPage(1);
  }, []);

  const setFilters = useCallback((value: ReportsFilters) => {
    setFiltersState(value);
    setPage(1);
  }, []);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(1);
  }, []);

  const fetchMembership = useCallback(async () => {
    const requestId = ++membershipRequestRef.current;
    setMembershipStatus("loading");
    try {
      const result = await membershipHistory(filters.type || undefined);
      if (requestId !== membershipRequestRef.current) return;
      if (!result) throw new Error("No membership history returned");
      setMembershipData(result);
      setMembershipStatus("success");
    } catch {
      if (requestId !== membershipRequestRef.current) return;
      setMembershipData([]);
      setMembershipStatus("error");
    }
  }, [filters.type]);

  const merchandiseQuery = useMemo(
    () => ({
      search: debouncedSearch,
      studentId: filters.id,
      rfid: filters.rfid,
      name: filters.name,
      course: filters.course,
      year: filters.year,
      productId: filters.productId,
      batch: filters.batch,
      size: filters.size,
      color: filters.color,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }),
    [debouncedSearch, filters]
  );

  const fetchMerchandise = useCallback(
    async (requestedPage: number) => {
      merchandiseViewRequestedRef.current = true;
      const requestId = ++merchandiseRequestRef.current;
      setMerchandiseStatus("loading");

      if (!merchandiseOptionsRequestedRef.current) {
        merchandiseOptionsRequestedRef.current = true;
        void merchandiseReportFilterOptions().then((result) => {
          setMerchandiseProductOptions(result?.products ?? []);
        });
      }

      try {
        const result = await merchandiseReports({
          page: requestedPage,
          limit: ROWS_PER_PAGE,
          ...merchandiseQuery,
        });

        if (requestId !== merchandiseRequestRef.current) return;
        if (!result) throw new Error("No merchandise reports returned");

        const details = result.data.map((detail) => ({
          ...detail,
          size: flattenVariantField(detail.size),
          variation: flattenVariantField(detail.variation),
        }));

        setMerchandiseDetails(details.filter(Boolean));
        setMerchandiseTotal(result.total);
        setMerchandiseTotalPages(result.totalPages);
        setMerchandiseSummary(
          result.summary ?? { unitsSold: 0, totalRevenue: 0 }
        );
        setMerchandiseStatus("success");
      } catch {
        if (requestId !== merchandiseRequestRef.current) return;
        setMerchandiseDetails([]);
        setMerchandiseTotal(0);
        setMerchandiseTotalPages(1);
        setMerchandiseSummary({ unitsSold: 0, totalRevenue: 0 });
        setMerchandiseStatus("error");
      }
    },
    [merchandiseQuery]
  );

  const preloadMerchandiseOverview = useCallback(async () => {
    const requestId = ++merchandiseOverviewRequestRef.current;

    try {
      const result = await merchandiseReports({ page: 1, limit: 1 });
      if (
        requestId !== merchandiseOverviewRequestRef.current ||
        merchandiseViewRequestedRef.current ||
        !result
      ) {
        return;
      }

      setMerchandiseTotal(result.total);
      setMerchandiseSummary(
        result.summary ?? { unitsSold: 0, totalRevenue: 0 }
      );
    } catch {
      // The merchandise tab retains its normal retry behavior if this preload fails.
    }
  }, []);

  const membershipFetchKey = `${activeTab}|${filters.type}`;
  const membershipFetchKeyRef = useRef("");

  useEffect(() => {
    if (activeTab !== "membership") return;
    if (membershipFetchKeyRef.current === membershipFetchKey) return;
    membershipFetchKeyRef.current = membershipFetchKey;
    void fetchMembership();
  }, [activeTab, membershipFetchKey, fetchMembership]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeTab === "merchandise") {
        void fetchMerchandise(page);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab, page, debouncedSearch, filters, fetchMerchandise]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void preloadMerchandiseOverview();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [preloadMerchandiseOverview]);

  const filteredMembership = useMemo(() => {
    if (activeTab !== "membership") return EMPTY_MEMBERSHIP_ROWS;
    const query = debouncedSearch.trim().toLowerCase();
    return membershipData.filter((row) => {
      if (
        query &&
        !`${row.name} ${row.id_number} ${row.reference_code}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      if (filters.id && !row.reference_code?.includes(filters.id)) return false;
      if (
        filters.name &&
        !row.name?.toLowerCase().includes(filters.name.toLowerCase())
      )
        return false;
      if (filters.rfid && !row.rfid?.includes(filters.rfid)) return false;
      if (
        filters.course &&
        !row.course?.toLowerCase().includes(filters.course.toLowerCase())
      )
        return false;
      if (filters.year && String(row.year) !== filters.year) return false;
      if (filters.term && row.term_name !== filters.term) return false;
      if (
        filters.membershipName &&
        row.membership_name !== filters.membershipName
      )
        return false;
      if (filters.dateFrom && toDateKey(row.date) < filters.dateFrom)
        return false;
      if (filters.dateTo && toDateKey(row.date) > filters.dateTo) return false;
      return true;
    });
  }, [activeTab, membershipData, filters, debouncedSearch]);

  const membershipSummary = useMemo(() => {
    const totalMembers = filteredMembership.length;
    const totalRevenue = filteredMembership.reduce(
      (sum, row) => sum + (row.total || 0),
      0
    );
    return { totalMembers, totalRevenue };
  }, [filteredMembership]);

  const membershipNameOptions = useMemo(
    () =>
      Array.from(
        new Set(
          membershipOptionsList.map((option) => option.name).filter(Boolean)
        )
      ),
    [membershipOptionsList]
  );

  const activeRowCount =
    activeTab === "membership" ? filteredMembership.length : merchandiseTotal;
  const totalPages =
    activeTab === "membership"
      ? Math.max(1, Math.ceil(activeRowCount / ROWS_PER_PAGE))
      : merchandiseTotalPages;
  const currentPage = Math.min(page, totalPages);

  const pagedMembership = useMemo(
    () =>
      filteredMembership.slice(
        (currentPage - 1) * ROWS_PER_PAGE,
        currentPage * ROWS_PER_PAGE
      ),
    [filteredMembership, currentPage]
  );

  const pagedMerchandise = merchandiseDetails;

  const tabCounts = useMemo<Record<ReportsTab, number>>(
    () => ({
      membership: membershipData.length,
      merchandise: merchandiseTotal,
    }),
    [membershipData.length, merchandiseTotal]
  );

  const buildMembershipExportRows = () =>
    filteredMembership.map((row) => ({
      "Reference Code": row.reference_code,
      "Student ID": row.id_number,
      Name: row.name,
      Course: row.course,
      "Year Level": row.year,
      Date: toDateKey(row.date),
      "Approved By": row.admin || "",
    }));

  const exportMerchandiseReport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportMerchandiseReports(merchandiseQuery);
      if (!blob) throw new Error("No merchandise report export returned");

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `merchandise-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast("error", "Unable to export the merchandise report.");
    } finally {
      setIsExporting(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    membershipStatus,
    merchandiseStatus,
    search,
    setSearch,
    filters,
    setFilters,
    page: currentPage,
    setPage,
    totalPages,
    pagedMembership,
    /** Every membership row, unfiltered — used to preview cascade renumbering. */
    membershipRows: membershipData,
    pagedMerchandise,
    tabCounts,
    totalMembershipRows: filteredMembership.length,
    totalMerchandiseRows: merchandiseTotal,
    membershipSummary,
    merchandiseSummary,
    merchandiseProductOptions,
    membershipNameOptions,
    isExporting,
    buildMembershipExportRows,
    exportMerchandiseReport,
    refetchMembership: fetchMembership,
    refetchMerchandise: () => fetchMerchandise(page),
  };
};
