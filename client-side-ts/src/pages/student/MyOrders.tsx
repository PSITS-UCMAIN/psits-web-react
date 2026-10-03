import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cancelOrder } from "@/features/orders/api/orders";
import {
  getStudentOrders,
  getRefundByOrderId,
} from "@/features/orders/api/orders";
import type {
  OrdersTab,
  RefundDetail,
} from "@/features/orders/types/orders.types";
import OrderDetailModal from "@/features/orders/components/OrderDetailModal";

const ROWS_PER_PAGE = 8;
const ORDER_STATUS_BY_TAB: Record<OrdersTab, "Pending" | "Paid" | "Refunded"> =
  {
    pending: "Pending",
    paid: "Paid",
    refunded: "Refunded",
  };

const EMPTY_COUNTS: Record<OrdersTab, number> = {
  pending: 0,
  paid: 0,
  refunded: 0,
};

interface OrderItem {
  id: string;
  title: string;
  variant?: string;
  variation?: string[];
  price: number;
  qty: number;
  image?: string;
}

interface Order {
  _id: string;
  id_number?: string;
  items: OrderItem[];
  status: string;
  orderDate: string;
  order_date?: string | Date;
  orderId: string;
  student_name?: string;
  course?: string;
  year?: number;
  reference_code?: string;
  transaction_date?: string | Date;
  admin?: string;
  total: number;
}

interface ApiOrderItem {
  product_id?: string;
  _id?: string;
  id?: string;
  product_name?: string;
  name?: string;
  title?: string;
  variation?: string[];
  variant?: string;
  color?: string;
  price?: number;
  unit_price?: number;
  sub_total?: number;
  quantity?: number;
  qty?: number;
  units?: number;
  imageUrl1?: string;
  image?: string;
  img?: string;
}

interface ApiOrder {
  _id?: string;
  id?: string;
  id_number?: string;
  orderId?: string;
  reference_code?: string;
  items?: ApiOrderItem[];
  order_date?: string | Date;
  order_status?: string;
  status?: string;
  student_name?: string;
  course?: string;
  year?: number;
  transaction_date?: string | Date;
  admin?: string;
  total?: number;
}

const mapApiToUi = (apiOrder: ApiOrder): Order => {
  const items = Array.isArray(apiOrder.items)
    ? apiOrder.items.map((it) => ({
        id: String(it.product_id ?? it._id ?? it.id ?? Math.random()),
        title: it.product_name ?? it.name ?? it.title ?? "",
        variant: Array.isArray(it.variation)
          ? it.variation.join(", ")
          : (it.variant ?? it.color ?? undefined),
        price: Number(it.price ?? it.unit_price ?? it.sub_total ?? 0),
        qty: Number(it.quantity ?? it.qty ?? it.units ?? 1),
        image: it.imageUrl1 ?? it.image ?? it.img ?? undefined,
      }))
    : [];

  const orderDate = apiOrder.order_date
    ? new Date(apiOrder.order_date).toLocaleDateString()
    : "";

  return {
    _id: apiOrder._id || apiOrder.id || Math.random().toString(),
    id_number: apiOrder.id_number,
    orderId: String(
      apiOrder._id ??
        apiOrder.orderId ??
        apiOrder.reference_code ??
        Math.random()
    ),
    items,
    status: apiOrder.order_status ?? apiOrder.status ?? "Pending",
    orderDate,
    order_date: apiOrder.order_date,
    student_name: apiOrder.student_name,
    course: apiOrder.course,
    year: apiOrder.year,
    reference_code: apiOrder.reference_code,
    transaction_date: apiOrder.transaction_date,
    admin: apiOrder.admin,
    total: Number(apiOrder.total ?? 0),
  };
};

const ProductThumb: React.FC<{ src?: string; title: string }> = ({
  src,
  title,
}) => {
  const [failed, setFailed] = useState(false);
  const fallback = title.trim().charAt(0).toUpperCase() || "?";

  if (!src || failed) {
    return (
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-sky-50 text-sm font-semibold text-[#1C9DDE] ring-1 ring-sky-100">
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-gray-100"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

const OrderCard: React.FC<{
  order: Order;
  onCancel: (orderId: string) => void;
  onViewDetails: (order: Order) => void;
}> = ({ order, onCancel, onViewDetails }) => {
  const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);

  const statusColors: Record<string, string> = {
    Pending: "bg-[#FF8E1D]/15 text-[#FF8E1D] border-transparent",
    Paid: "bg-green-100 text-green-700 border-transparent",
    Refunded: "bg-red-100 text-red-700 border-transparent",
    Cancelled: "bg-gray-100 text-gray-600 border-transparent",
  };

  const dotColors: Record<string, string> = {
    Pending: "bg-[#FF8E1D]",
    Paid: "bg-green-500",
    Refunded: "bg-red-500",
    Cancelled: "bg-gray-400",
  };

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4">
      <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">{order.orderId}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {order.orderDate}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Badge
            className={
              statusColors[order.status] ??
              "border-transparent bg-gray-100 text-gray-700"
            }
          >
            <span
              className={`mr-2 inline-block h-2 w-2 rounded-full ${dotColors[order.status] ?? "bg-gray-400"}`}
            />
            {order.status}
          </Badge>
          {(order.status === "Paid" || order.status === "Refunded") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(order)}
            >
              Details
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4"
          >
            <ProductThumb src={item.image} title={item.title} />
            <div className="min-w-0 flex-1">
              <div className="flex w-full flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <div className="font-medium">{item.title}</div>
                  {item.variant ? (
                    <div className="text-sm text-gray-600">{item.variant}</div>
                  ) : null}
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-medium text-[#1C9DDE]">
                    ₱{item.price.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">x{item.qty}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col items-start justify-end gap-2 sm:flex-row sm:items-center">
        <div className="text-sm">Total:</div>
        <div className="font-semibold text-[#1C9DDE]">₱{total.toFixed(2)}</div>
      </div>

      {order.status === "Pending" && (
        <div className="mt-4 flex justify-end">
          <CancelConfirm onConfirm={() => onCancel(order._id)} />
        </div>
      )}
    </div>
  );
};

const CancelConfirm: React.FC<{
  onConfirm: () => void;
}> = ({ onConfirm }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer rounded-2xl"
        onClick={() => setOpen(true)}
      >
        Cancel Order
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order?</DialogTitle>
            <DialogDescription>
              The order will be deleted and stock will be restored. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const EmptyState: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="flex w-full flex-col items-center justify-center py-16">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="mb-4 h-16 w-16 text-sky-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 6h13m-9-6v6m4-6v6"
      />
    </svg>
    <h3 className="mb-2 text-lg font-semibold">{title}</h3>
    <p className="max-w-xl text-center text-sm text-gray-500">{description}</p>
  </div>
);

const Pagination: React.FC<{
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}> = ({ current, total, pageSize, onChange }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
      >
        Previous
      </Button>
      <span className="px-3 text-sm">
        Page {current} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={current >= totalPages}
        onClick={() => onChange(current + 1)}
      >
        Next
      </Button>
    </div>
  );
};

const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrdersTab>("pending");
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [_totalPages, setTotalPages] = useState(0);
  const [statusCounts, setStatusCounts] =
    useState<Record<OrdersTab, number>>(EMPTY_COUNTS);

  // Detail modal state
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refundData, setRefundData] = useState<RefundDetail[]>([]);
  const [refundLoading, setRefundLoading] = useState(false);

  // Guards against out-of-order responses overwriting newer state when the
  // user switches tabs or pages faster than requests resolve.
  const requestSeqRef = useRef(0);

  const fetchStatusCounts = useCallback(async () => {
    const entries = await Promise.all(
      (Object.keys(ORDER_STATUS_BY_TAB) as OrdersTab[]).map(async (tab) => {
        const result = await getStudentOrders({
          status: ORDER_STATUS_BY_TAB[tab],
          page: 1,
          limit: 1,
        });
        return [tab, result?.total ?? 0] as const;
      })
    );

    setStatusCounts(Object.fromEntries(entries) as Record<OrdersTab, number>);
  }, []);

  const fetchOrders = useCallback(async () => {
    const requestId = ++requestSeqRef.current;
    setLoadError(null);
    setLoading(true);
    try {
      const result = await getStudentOrders({
        status: ORDER_STATUS_BY_TAB[activeTab],
        page,
        limit: ROWS_PER_PAGE,
      });

      if (requestId !== requestSeqRef.current) return;

      if (!result) {
        setLoadError("Unable to load orders. Please try again.");
        setOrders([]);
        setTotalOrders(0);
        setTotalPages(0);
        return;
      }

      if (result && result.data) {
        const mapped = result.data.map(mapApiToUi);
        setOrders(mapped);
        setTotalOrders(result.total);
        setTotalPages(result.totalPages);
        setStatusCounts((prev) => ({ ...prev, [activeTab]: result.total }));
      } else {
        setOrders([]);
        setTotalOrders(0);
        setTotalPages(0);
        setStatusCounts((prev) => ({ ...prev, [activeTab]: 0 }));
      }
    } catch (error) {
      if (requestId !== requestSeqRef.current) return;
      console.error("Failed to fetch orders", error);
      setLoadError("Unable to load orders. Please try again.");
      setOrders([]);
      setTotalOrders(0);
      setTotalPages(0);
      setStatusCounts((prev) => ({ ...prev, [activeTab]: 0 }));
    } finally {
      if (requestId === requestSeqRef.current) setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOrders]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchStatusCounts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchStatusCounts]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as OrdersTab);
    setPage(1);
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const ok = await cancelOrder(orderId);
      if (ok) {
        await Promise.all([fetchOrders(), fetchStatusCounts()]);
      }
    } catch (err) {
      console.error("Cancel failed", err);
    }
  };

  const handleViewDetails = async (order: Order) => {
    const isRefunded = order.status === "Refunded";
    setDetailOrder(order);
    setDetailOpen(true);
    setRefundData([]);
    setRefundLoading(isRefunded);

    if (isRefunded) {
      try {
        const refunds = await getRefundByOrderId(order._id);
        if (refunds) {
          setRefundData(refunds);
        }
      } catch (err) {
        console.error("Failed to fetch refund", err);
      } finally {
        setRefundLoading(false);
      }
    }
  };

  const pendingCount = statusCounts.pending;
  const paidCount = statusCounts.paid;
  const refundedCount = statusCounts.refunded;

  // Shared content for every status tab so loading/error/empty handling stays
  // consistent across Pending, Paid, and Refunded.
  const renderTabContent = (emptyTitle: string, emptyDescription: string) =>
    loading ? (
      <div className="py-8 text-center text-gray-500">Loading...</div>
    ) : orders.length > 0 ? (
      orders.map((order) => (
        <OrderCard
          key={order._id}
          order={order}
          onCancel={handleCancelOrder}
          onViewDetails={handleViewDetails}
        />
      ))
    ) : loadError ? (
      <div className="py-8 text-center">
        <p className="mb-2 text-red-600">{loadError}</p>
        <Button variant="outline" size="sm" onClick={() => void fetchOrders()}>
          Retry
        </Button>
      </div>
    ) : (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">My Orders</h2>
        </div>

        <Card className="rounded-2xl p-3 sm:p-6">
          <CardHeader className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <CardTitle className="text-base">Orders</CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="-mx-2 overflow-x-auto">
                <div className="inline-block min-w-full">
                  <TabsList className="flex w-full cursor-pointer rounded-xl bg-white px-3 py-7">
                    <TabsTrigger
                      className="flex-1 cursor-pointer py-5 text-center"
                      value="pending"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>Pending</span>
                        <span
                          className={`ml-2 inline-block rounded-full px-2 py-1 text-xs ${pendingCount > 0 ? "bg-[#1C9DDE] text-white" : "bg-gray-200 text-gray-600"}`}
                        >
                          {pendingCount}
                        </span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      className="flex-1 cursor-pointer py-5 text-center"
                      value="paid"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>Paid</span>
                        <span
                          className={`ml-2 inline-block rounded-full px-2 py-1 text-xs ${paidCount > 0 ? "bg-[#1C9DDE] text-white" : "bg-gray-200 text-gray-600"}`}
                        >
                          {paidCount}
                        </span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      className="flex-1 cursor-pointer py-5 text-center"
                      value="refunded"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>Refunded</span>
                        <span
                          className={`ml-2 inline-block rounded-full px-2 py-1 text-xs ${refundedCount > 0 ? "bg-[#1C9DDE] text-white" : "bg-gray-200 text-gray-600"}`}
                        >
                          {refundedCount}
                        </span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <div className="mt-6">
                <TabsContent value="pending">
                  {renderTabContent(
                    "No pending orders",
                    "You don't have any pending orders right now. Start shopping to add items to your order."
                  )}
                </TabsContent>

                <TabsContent value="paid">
                  {renderTabContent(
                    "No paid orders",
                    "You have no paid orders yet. Browse products to place an order."
                  )}
                </TabsContent>

                <TabsContent value="refunded">
                  {renderTabContent(
                    "No refunded orders",
                    "You have no refunded orders."
                  )}
                </TabsContent>
              </div>
            </Tabs>

            {/* Pagination */}
            {!loading && totalOrders > ROWS_PER_PAGE && (
              <Pagination
                current={page}
                total={totalOrders}
                pageSize={ROWS_PER_PAGE}
                onChange={(newPage) => setPage(newPage)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      {detailOrder && (
        <OrderDetailModal
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          order={detailOrder}
          refunds={refundData}
          refundLoading={refundLoading}
        />
      )}
    </div>
  );
};

export default MyOrders;
