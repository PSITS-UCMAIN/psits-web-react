import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Printer,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { showToast } from "@/utils/alertHelper";
import { getOrderReceiptV2 } from "../api/orders";
import { useOrdersData, ROWS_PER_PAGE } from "../hooks/useOrdersData";
import { usePrintReceipt } from "@/components/print";
import { PrintableOrderReceipt } from "./PrintableOrderReceipt";
import type { PrintableOrderReceipt as PrintableOrderReceiptData } from "../types/orders.types";

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

const formatCurrency = (value: number) =>
  `\u20B1${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pageRange = (currentPage: number, totalPages: number) => {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  return Array.from(pages).sort((a, b) => a - b);
};

type OrderRowData = {
  _id: string;
  id_number: string;
  rfid?: string;
  student_name: string;
  course: string;
  year: number;
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
    sub_total: number;
    variation?: string[];
    sizes?: string[];
    imageUrl1?: string;
    category?: string;
    batch?: string;
    limited?: boolean;
  }>;
  total: number;
  order_date: string | Date;
  transaction_date?: string | Date;
  order_status: string;
  reference_code?: string;
  admin?: string;
  membership_discount?: boolean;
  promo?: { promo_name: string; promo_discount: boolean } | null;
};

const OrderProducts = ({ items }: { items: OrderRowData["items"] }) => {
  if (!items || items.length === 0)
    return <span className="text-[#777]">-</span>;
  const maxLen = 22;
  const displayItems = items.slice(0, 2);
  const summary = displayItems.map(
    (item) =>
      `${item.product_name.length > maxLen ? item.product_name.slice(0, maxLen) + "..." : item.product_name} (x${item.quantity})`
  );
  if (items.length > 2) {
    summary.push(`+${items.length - 2} more`);
  }
  return <span className="text-[#303030]">{summary.join(", ")}</span>;
};

const PaginationFooter = ({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (v: number) => void;
}) => {
  const visiblePages = pageRange(page, totalPages);
  return (
    <div className="mt-7 flex flex-col items-center justify-between gap-3 text-xs text-[#8a8a8a] sm:flex-row">
      <span>
        Showing {total > 0 ? (page - 1) * ROWS_PER_PAGE + 1 : 0} to{" "}
        {Math.min(page * ROWS_PER_PAGE, total)} of {total}
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
  );
};

const ApproveOrderDialog = ({
  order,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: {
  order: OrderRowData | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    order_id: string;
    reference_code?: string;
    cash: number;
    transaction_date?: string;
    admin?: string;
  }) => Promise<boolean>;
  isLoading: boolean;
}) => {
  const [cash, setCash] = useState("");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] rounded-[24px] border-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Approve Order</DialogTitle>
          <DialogDescription>
            Enter payment details to approve this order.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-medium">
                {order?.student_name || "Unknown"}
              </h2>
              <p className="mt-0.5 text-sm text-[#8f8f8f]">
                ID: {order?.id_number} &middot; {order?.course}{" "}
                {order?.year ? `- ${order.year}` : ""}
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-lg bg-[#f0fafd] px-4 py-3">
            <p className="text-sm font-medium text-[#1c9dde]">
              Order Total: {formatCurrency(order?.total ?? 0)}
            </p>
            <p className="mt-1 text-xs text-[#1c9dde]/80">
              Items:{" "}
              {order?.items
                ?.map((i) => `${i.product_name} (x${i.quantity})`)
                .join(", ") || "-"}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Cash</Label>
              <Input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="Enter cash amount"
                min={order?.total || 0}
                className="h-10 rounded-lg border-[#ececec]"
              />
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
              disabled={isLoading || !cash}
              onClick={async () => {
                if (!order) return;
                const cashNum = Number(cash);
                if (cashNum < (order.total || 0)) {
                  showToast("error", "Cash is too low!");
                  return;
                }
                const success = await onSubmit({
                  order_id: order._id,
                  cash: cashNum,
                });
                if (success) {
                  setCash("");
                  onClose();
                }
              }}
            >
              {isLoading ? "Processing..." : "Approve"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const OrdersView = () => {
  const {
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
    refetchPending,
    refetchPaid,
  } = useOrdersData();

  const [approveOrder, setApproveOrder] = useState<OrderRowData | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderRowData | null>(null);
  const [refundTarget, setRefundTarget] = useState<OrderRowData | null>(null);
  const [detailOrder, setDetailOrder] = useState<OrderRowData | null>(null);
  const { receipt, print: printReceipt } =
    usePrintReceipt<PrintableOrderReceiptData>();
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  const data = activeTab === "pending" ? pendingData : paidData;
  const totalPages =
    activeTab === "pending" ? pendingTotalPages : paidTotalPages;
  const status = activeTab === "pending" ? pendingStatus : paidStatus;
  const rowCount =
    activeTab === "pending" ? pendingData.length : paidData.length;

  const tabs = [
    {
      key: "pending" as const,
      label: "Pending",
      icon: Clock3,
      count: pendingTotal,
    },
    {
      key: "paid" as const,
      label: "Paid",
      icon: Check,
      count: paidTotal,
    },
  ];

  const pageIds = data.map((row: OrderRowData) => row._id);
  const isPageSelected =
    pageIds.length > 0 &&
    pageIds.every((id: string) => selectedIds.includes(id));
  const isSomePageSelected =
    !isPageSelected && pageIds.some((id: string) => selectedIds.includes(id));

  const selectedData = data.filter((row: OrderRowData) =>
    selectedIds.includes(row._id)
  );

  const totalPagesNum = Math.max(1, totalPages);
  const currentPage = Math.min(page, totalPagesNum);

  const handlePrintReceipt = async (order: OrderRowData) => {
    if (!canManageOrders) {
      showToast("error", "Unauthorized.");
      return;
    }

    setPrintingOrderId(order._id);
    try {
      const result = await getOrderReceiptV2(order._id);
      if (!result) {
        showToast("error", "Unable to load receipt.");
        return;
      }
      printReceipt(result);
    } finally {
      setPrintingOrderId(null);
    }
  };

  return (
    <div className="bg-background flex min-h-full flex-1 flex-col text-[#333] [&_[data-disabled]]:pointer-events-auto [&_[data-disabled]]:cursor-not-allowed [&_[role=menuitem]]:cursor-pointer [&_a]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer">
      <header className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Orders</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          View and manage student orders
        </p>
      </header>

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-8 border-b border-[#eeeeee]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cn(
                "relative flex cursor-pointer items-center gap-2 pb-3 text-sm text-[#858585]",
                activeTab === tab.key && "font-medium text-[#1c9dde]"
              )}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className="text-xs text-current/70">
                ({tab.count.toLocaleString()})
              </span>
              {activeTab === tab.key && (
                <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-[#1c9dde]" />
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {status === "error" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Unable to load {activeTab} orders.
            <button
              type="button"
              className="ml-3 underline hover:no-underline"
              onClick={activeTab === "pending" ? refetchPending : refetchPaid}
            >
              Retry
            </button>
          </div>
        )}

        <section className="rounded-[22px] border border-[#e5e5e5] bg-white px-4 py-5 sm:px-6">
          {/* Search */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-[260px]">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9b9b9b]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders"
                className="h-9 rounded-full border-[#e8e8e8] pl-9 text-sm"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-12" />
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                {activeTab === "paid" && <col className="w-[14%]" />}
                <col className="w-[14%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col style={{ width: activeTab === "paid" ? 280 : 190 }} />
              </colgroup>
              <thead>
                <tr className="rounded-md bg-[#efefef] text-[#2f2f2f]">
                  <th className="rounded-l-md px-2 py-2 text-center align-middle">
                    <Checkbox
                      checked={
                        isPageSelected ||
                        (isSomePageSelected && "indeterminate")
                      }
                      onCheckedChange={() => toggleAllOnPage(pageIds)}
                      className="border-[#a7a7a7] data-[state=checked]:border-[#1c9dde] data-[state=checked]:bg-[#1c9dde]"
                      aria-label="Select visible rows"
                    />
                  </th>
                  <th className="px-2 py-2 text-left align-middle font-medium">
                    {activeTab === "pending"
                      ? "Student Name"
                      : "Reference Code"}
                  </th>
                  <th className="px-2 py-2 text-left align-middle font-medium">
                    {activeTab === "pending" ? "Student ID" : "Student Name"}
                  </th>
                  {activeTab === "paid" && (
                    <th className="px-2 py-2 text-left align-middle font-medium">
                      Transaction Date
                    </th>
                  )}
                  <th className="px-2 py-2 text-left align-middle font-medium">
                    Course & Year
                  </th>
                  <th className="px-2 py-2 text-left align-middle font-medium">
                    {activeTab === "pending" ? "Products" : "Total"}
                  </th>
                  <th className="px-2 py-2 text-left align-middle font-medium">
                    {activeTab === "pending" ? "Order Date" : "Managed By"}
                  </th>

                  <th className="rounded-r-md px-2 py-2 text-right align-middle" />
                </tr>
              </thead>
              <tbody>
                {status === "loading" ? (
                  Array.from({ length: 8 }, (_, index) => (
                    <tr key={index} className="border-b border-[#ededed]">
                      {Array.from(
                        { length: activeTab === "paid" ? 9 : 9 },
                        (_, cell) => (
                          <td key={cell} className="px-2 py-3">
                            <Skeleton className="h-4 w-full rounded-full" />
                          </td>
                        )
                      )}
                    </tr>
                  ))
                ) : status === "error" ? null : data.length > 0 ? (
                  data.map((order: OrderRowData) => (
                    <tr
                      key={`${activeTab}-${order._id}`}
                      className="border-b border-[#ededed] text-[#303030]"
                    >
                      <td className="px-2 py-3 text-center align-middle">
                        <Checkbox
                          checked={selectedIds.includes(order._id)}
                          onCheckedChange={() => toggleSelection(order._id)}
                          className="border-[#a7a7a7] data-[state=checked]:border-[#1c9dde] data-[state=checked]:bg-[#1c9dde]"
                          aria-label={`Select ${order.student_name}`}
                        />
                      </td>
                      <td className="px-2 py-3 text-left align-middle">
                        {activeTab === "pending" ? (
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {order.student_name}
                            </p>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {order.reference_code}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-left align-middle">
                        {activeTab === "pending"
                          ? order.id_number
                          : order.student_name}
                      </td>
                      {activeTab === "paid" && (
                        <td className="px-2 py-3 text-left align-middle">
                          {formatDate(
                            order.transaction_date || order.order_date
                          )}
                        </td>
                      )}
                      <td className="px-2 py-3 text-left align-middle">
                        {order.course} {order.year ? `- ${order.year}` : ""}
                      </td>
                      <td className="px-2 py-3 text-left align-middle">
                        {activeTab === "pending" ? (
                          <OrderProducts items={order.items} />
                        ) : (
                          <span className="font-medium">
                            {formatCurrency(order.total)}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-left align-middle">
                        {activeTab === "pending" ? (
                          formatDate(order.order_date)
                        ) : (
                          <span
                            className="block max-w-full truncate"
                            title={order.admin}
                          >
                            {order.admin}
                          </span>
                        )}
                      </td>

                      <td className="px-2 py-3 text-right align-middle">
                        <div className="flex justify-end gap-2">
                          {activeTab === "pending" && canManageOrders && (
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 rounded-full bg-emerald-50 px-3 text-xs text-emerald-700 hover:bg-emerald-100"
                              onClick={() => setApproveOrder(order)}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </Button>
                          )}
                          {activeTab === "pending" && canManageOrders && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-full border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => setCancelTarget(order)}
                            >
                              <X className="mr-1 h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          )}
                          {activeTab === "paid" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-full border-[#e8e8e8] text-[#303030] hover:bg-gray-50"
                              onClick={() => setDetailOrder(order)}
                            >
                              Details
                            </Button>
                          )}
                          {activeTab === "paid" && canManageOrders && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-full border-[#d7eef9] text-[#1c9dde] hover:bg-[#f0fafd]"
                              disabled={printingOrderId === order._id}
                              onClick={() => void handlePrintReceipt(order)}
                            >
                              <Printer className="mr-1 h-3.5 w-3.5" />
                              {printingOrderId === order._id
                                ? "Preparing..."
                                : "Print"}
                            </Button>
                          )}
                          {activeTab === "paid" && canManageOrders && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-full border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => setRefundTarget(order)}
                            >
                              <X className="mr-1 h-3.5 w-3.5" />
                              Refund
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-16 text-center text-sm text-[#777]"
                    >
                      No {activeTab} orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <PaginationFooter
            page={currentPage}
            totalPages={totalPagesNum}
            total={rowCount}
            onPageChange={setPage}
          />
        </section>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && canManageOrders && (
        <div className="fixed bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center overflow-hidden rounded-full bg-[#2f2f2f] px-4 py-3 text-sm text-white shadow-2xl">
          <span className="pr-5">
            {selectedCount} of {rowCount} selected
          </span>
          <span className="h-6 w-px bg-white/20" />
          <button
            type="button"
            className="flex items-center gap-2 px-5 disabled:opacity-40"
            onClick={() => setCancelTarget(selectedData[0])}
          >
            <X className="h-4 w-4" />
            Cancel All
          </button>
        </div>
      )}

      {/* Approve Dialog */}
      <ApproveOrderDialog
        order={approveOrder}
        isOpen={!!approveOrder}
        onClose={() => setApproveOrder(null)}
        onSubmit={async (payload) => {
          const success = await handleApprove(payload);
          if (success) setApproveOrder(null);
          return success;
        }}
        isLoading={isMutating}
      />

      {/* Cancel Confirm Dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <DialogContent className="max-w-[420px] rounded-[24px] border-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order?
            </DialogDescription>
          </DialogHeader>
          <div className="p-8">
            <div className="mb-6 grid h-9 w-9 place-items-center rounded-full bg-red-100 text-red-500">
              <X className="h-5 w-5" />
            </div>
            <h2 className="mb-3 text-lg font-medium">
              {cancelTarget && selectedCount > 1
                ? `Cancel ${selectedCount} orders?`
                : "Cancel this order?"}
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-[#8a8a8a]">
              {cancelTarget && selectedCount > 1
                ? `This will cancel ${selectedCount} selected ${activeTab} orders. Stock will be restored automatically.`
                : cancelTarget
                  ? `This will cancel the order for ${cancelTarget.student_name}. Stock will be restored automatically.`
                  : "This action cannot be undone."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setCancelTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-10 rounded-full"
                disabled={isMutating}
                onClick={async () => {
                  if (selectedCount > 1) {
                    for (const orderId of selectedIds) {
                      await handleCancel(orderId);
                    }
                  } else if (cancelTarget) {
                    await handleCancel(cancelTarget._id);
                  }
                  setCancelTarget(null);
                }}
              >
                {isMutating ? "Processing..." : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Confirm Dialog */}
      <Dialog
        open={!!refundTarget}
        onOpenChange={(open) => !open && setRefundTarget(null)}
      >
        <DialogContent className="max-w-[420px] rounded-[24px] border-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Refund Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to refund this order?
            </DialogDescription>
          </DialogHeader>
          <div className="p-8">
            <div className="mb-6 grid h-9 w-9 place-items-center rounded-full bg-orange-100 text-orange-500">
              <X className="h-5 w-5" />
            </div>
            <h2 className="mb-3 text-lg font-medium">
              {refundTarget
                ? `Refund ${refundTarget.student_name}?`
                : "Refund this order?"}
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-[#8a8a8a]">
              {refundTarget
                ? `This will refund ${formatCurrency(refundTarget.total)} for ${refundTarget.student_name}. Stock will be restored automatically and the order status will change to "Refunded".`
                : "This action cannot be undone."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setRefundTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-10 rounded-full"
                disabled={isMutating}
                onClick={async () => {
                  if (!refundTarget) return;
                  const success = await handleRefund(refundTarget._id);
                  if (success) setRefundTarget(null);
                }}
              >
                {isMutating ? "Processing..." : "Confirm Refund"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog
        open={!!detailOrder}
        onOpenChange={(open) => !open && setDetailOrder(null)}
      >
        <DialogContent className="max-w-[560px] rounded-[24px] border-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              View order items for this student.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-medium">
                  {detailOrder?.student_name}
                </h2>
                <p className="mt-0.5 text-sm text-[#8f8f8f]">
                  ID: {detailOrder?.id_number} &middot; {detailOrder?.course}{" "}
                  {detailOrder?.year ? `- ${detailOrder.year}` : ""}
                  {detailOrder?.reference_code && (
                    <>&middot; Ref: {detailOrder.reference_code}</>
                  )}
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-lg bg-[#f7f7f7] px-4 py-3">
              <p className="text-sm text-[#303030]">
                Total:{" "}
                <span className="font-medium">
                  {formatCurrency(detailOrder?.total || 0)}
                </span>
              </p>
              {detailOrder?.order_status === "Paid" &&
                detailOrder?.transaction_date && (
                  <p className="mt-1 text-xs text-[#8a8a8a]">
                    Transaction Date: {formatDate(detailOrder.transaction_date)}
                  </p>
                )}
              <p className="mt-1 text-xs text-[#8a8a8a]">
                {detailOrder?.membership_discount
                  ? "Discount: Member"
                  : detailOrder?.promo?.promo_discount
                    ? `Discount: Promo${
                        detailOrder.promo.promo_name
                          ? ` — ${detailOrder.promo.promo_name}`
                          : ""
                      }`
                    : "No Discount"}
              </p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#efefef] text-left text-xs text-[#2f2f2f]">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detailOrder?.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#ededed]">
                    <td className="px-3 py-2">
                      <span>{item.product_name}</span>
                      {item.variation?.length ? (
                        <span className="ml-2 text-xs text-[#8a8a8a]">
                          ({item.variation.join(", ")})
                        </span>
                      ) : null}
                      {item.sizes?.length ? (
                        <span className="ml-1 text-xs text-[#8a8a8a]">
                          [{item.sizes.join(", ")}]
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(item.sub_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 flex justify-end">
              {detailOrder?.order_status === "Paid" && canManageOrders ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mr-3 h-10 min-w-24 rounded-full border-[#d7eef9] text-[#1c9dde] hover:bg-[#f0fafd]"
                  disabled={printingOrderId === detailOrder._id}
                  onClick={() => void handlePrintReceipt(detailOrder)}
                >
                  <Printer className="mr-1 h-4 w-4" />
                  {printingOrderId === detailOrder._id
                    ? "Preparing..."
                    : "Print"}
                </Button>
              ) : null}
              <Button
                type="button"
                className="h-10 min-w-24 rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
                onClick={() => setDetailOrder(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <PrintableOrderReceipt receipt={receipt} />
    </div>
  );
};
