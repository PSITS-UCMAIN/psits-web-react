import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAllPendingPaidOrdersV2,
  approveOrderV2,
  cancelOrderV2,
  refundOrderV2,
} from "@/features/orders/api/orders";
import { useAdminPermissions } from "@/features/admin/hooks/useAdminPermissions";
import { showToast } from "@/utils/alertHelper";
import type { OrdersTab, OrdersStatus } from "../types/orders.types";
import type { OrderRow, ApprovePayload } from "../types/orders.types";

export const ROWS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 250;

export const useOrdersData = () => {
  const { canManageOrders } = useAdminPermissions();

  const [activeTab, setActiveTab] = useState<OrdersTab>("pending");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isMutating, setIsMutating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pending state
  const [pendingData, setPendingData] = useState<OrderRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);
  const [pendingStatus, setPendingStatus] = useState<OrdersStatus>("idle");
  const pendingRef = useRef(0);

  // Paid state
  const [paidData, setPaidData] = useState<OrderRow[]>([]);
  const [paidTotal, setPaidTotal] = useState(0);
  const [paidTotalPages, setPaidTotalPages] = useState(1);
  const [paidStatus, setPaidStatus] = useState<OrdersStatus>("idle");
  const paidRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPending = useCallback(
    async (requestedPage: number) => {
      const requestId = ++pendingRef.current;
      setPendingStatus("loading");
      try {
        const result = await getAllPendingPaidOrdersV2({
          status: "Pending",
          page: requestedPage,
          limit: ROWS_PER_PAGE,
          search: debouncedSearch,
        });
        if (requestId !== pendingRef.current) return;
        if (!result || !result.data) {
          setPendingData([]);
          setPendingTotal(0);
          setPendingTotalPages(1);
          setPendingStatus("error");
          return;
        }
        setPendingData(result.data as OrderRow[]);
        setPendingTotal(result.total);
        setPendingTotalPages(result.totalPages);
        setPendingStatus("success");
      } catch {
        if (requestId !== pendingRef.current) return;
        setPendingData([]);
        setPendingTotal(0);
        setPendingTotalPages(1);
        setPendingStatus("error");
      }
    },
    [debouncedSearch]
  );

  const fetchPaid = useCallback(
    async (requestedPage: number) => {
      const requestId = ++paidRef.current;
      setPaidStatus("loading");
      try {
        const result = await getAllPendingPaidOrdersV2({
          status: "Paid",
          page: requestedPage,
          limit: ROWS_PER_PAGE,
          search: debouncedSearch,
        });
        if (requestId !== paidRef.current) return;
        if (!result || !result.data) {
          setPaidData([]);
          setPaidTotal(0);
          setPaidTotalPages(1);
          setPaidStatus("error");
          return;
        }
        setPaidData(result.data as OrderRow[]);
        setPaidTotal(result.total);
        setPaidTotalPages(result.totalPages);
        setPaidStatus("success");
      } catch {
        if (requestId !== paidRef.current) return;
        setPaidData([]);
        setPaidTotal(0);
        setPaidTotalPages(1);
        setPaidStatus("error");
      }
    },
    [debouncedSearch]
  );

  useEffect(() => {
    if (activeTab === "pending") {
      void fetchPending(page);
      void fetchPaid(1);
    } else if (activeTab === "paid") {
      void fetchPaid(page);
      void fetchPending(1);
    }
  }, [activeTab, page, fetchPending, fetchPaid]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch]);

  const handleApprove = useCallback(
    async (payload: ApprovePayload): Promise<boolean> => {
      if (!canManageOrders) {
        showToast("error", "Unauthorized.");
        return false;
      }
      setIsMutating(true);
      try {
        const success = await approveOrderV2(
          payload.order_id,
          payload.cash || undefined
        );
        if (success) {
          showToast("success", "Order approved successfully.");
          await fetchPending(page);
          await fetchPaid(1);
          return true;
        }
        showToast("error", "Failed to approve order.");
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [canManageOrders, page, fetchPending, fetchPaid]
  );

  const handleCancel = useCallback(
    async (orderId: string): Promise<boolean> => {
      if (!canManageOrders) {
        showToast("error", "Unauthorized.");
        return false;
      }
      setIsMutating(true);
      try {
        const success = await cancelOrderV2(orderId);
        if (success) {
          if (activeTab === "pending") {
            await fetchPending(page);
          } else {
            await fetchPaid(page);
          }
          return true;
        }
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [canManageOrders, activeTab, page, fetchPending, fetchPaid]
  );

  const handleRefund = useCallback(
    async (orderId: string): Promise<boolean> => {
      if (!canManageOrders) {
        showToast("error", "Unauthorized.");
        return false;
      }
      setIsMutating(true);
      try {
        const success = await refundOrderV2(orderId);
        if (success) {
          await fetchPaid(page);
          return true;
        }
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [canManageOrders, page, fetchPaid]
  );

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const toggleAllOnPage = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      const newSet = new Set([...prev, ...ids]);
      return Array.from(newSet);
    });
  }, []);

  const selectedCount = selectedIds.length;

  return {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    page,
    setPage,
    pendingData,
    pendingTotal,
    pendingTotalPages,
    pendingStatus,
    paidData,
    paidTotal,
    paidTotalPages,
    paidStatus,
    isMutating,
    selectedIds,
    selectedCount,
    canManageOrders,
    toggleSelection,
    toggleAllOnPage,
    handleApprove,
    handleCancel,
    handleRefund,
    refetchPending: () => fetchPending(page),
    refetchPaid: () => fetchPaid(page),
  };
};
