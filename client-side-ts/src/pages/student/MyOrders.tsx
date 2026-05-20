import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOrder, cancelOrder } from "@/features/orders/api/orders";
import type { OrderData, CartItemData } from "@/types/api";

interface OrderItem {
  id: string;
  title: string;
  variant?: string;
  price: number;
  qty: number;
  image?: string;
}

interface Order {
  orderId: string;
  items: OrderItem[];
  status: string;
  orderDate: string;
}

const OrderCard: React.FC<{
  order: Order;
  onCancel: (orderId: string) => void;
}> = ({ order, onCancel }) => {
  const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4">
      <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">{order.orderId}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            Order Placed: {order.orderDate}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {(() => {
            const map: Record<string, string> = {
              Pending: "bg-[#FF8E1D]/15 text-[#FF8E1D] border-transparent",
              Paid: "bg-green-100 text-green-700 border-transparent",
              Cancelled: "bg-red-100 text-red-700 border-transparent",
            };

            const dotMap: Record<string, string> = {
              Pending: "bg-[#FF8E1D]",
              Paid: "bg-green-500",
              Cancelled: "bg-red-500",
            };

            const cls =
              map[order.status] ??
              "bg-gray-100 text-gray-700 border-transparent";
            const dot = dotMap[order.status] ?? "bg-gray-400";

            return (
              <Badge className={cls}>
                <span
                  className={`mr-2 inline-block h-2 w-2 rounded-full ${dot}`}
                />
                {order.status}
              </Badge>
            );
          })()}
        </div>
      </div>

      <div className="space-y-4">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center"
          >
            <div className="h-40 w-full flex-shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-20 sm:w-20">
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="w-full flex-1">
              <div className="flex w-full flex-col items-start justify-between sm:flex-row sm:items-center">
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-gray-600">{item.variant}</div>
                </div>

                <div className="mt-2 text-left sm:mt-0 sm:text-right">
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
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer rounded-2xl"
            onClick={() => onCancel(order.orderId)}
          >
            Cancel Order
          </Button>
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC<{
  title?: string;
  description?: string;
  buttonText?: string;
  href?: string;
}> = ({
  title = "Your cart is empty",
  description = "Looks like you haven't added any items yet. Start shopping to add products to your cart.",
  buttonText = "Shop products",
  href = "/shop",
}) => {
  return (
    <div className="flex w-full flex-col items-center justify-center py-16">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16 text-sky-500"
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

      <h3 className="mt-4 text-lg font-semibold">{title}</h3>

      <p className="mt-2 max-w-xl text-center text-sm text-gray-500">
        {description}
      </p>

      <div className="mt-6">
        <Button asChild>
          <a href={href}>{buttonText}</a>
        </Button>
      </div>
    </div>
  );
};

const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setLoading] = useState<boolean>(true);

  const mapApiToUi = (apiOrder: OrderData): Order => {
    const items = Array.isArray(apiOrder.items)
      ? apiOrder.items.map((it: CartItemData) => ({
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
      : apiOrder.transaction_date
        ? new Date(apiOrder.transaction_date).toLocaleDateString()
        : "";

    return {
      orderId: String(
        apiOrder._id ??
          apiOrder.orderId ??
          apiOrder.reference_code ??
          Math.random()
      ),
      items,
      status: apiOrder.order_status ?? apiOrder.status ?? "Pending",
      orderDate,
    };
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const possibleKeys = [
        "id_number",
        "IdNumber",
        "idNumber",
        "student_id",
        "StudentId",
        "user",
      ];
      let id_number: string | undefined;
      for (const k of possibleKeys) {
        const v = sessionStorage.getItem(k);
        if (!v) continue;
        if (k === "user" || v.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(v);
            if (
              parsed &&
              (parsed.id_number || parsed.idNumber || parsed.student_id)
            ) {
              id_number =
                parsed.id_number || parsed.idNumber || parsed.student_id;
              break;
            }
          } catch {
            // not JSON
          }
        }
        id_number = v;
        if (id_number) break;
      }

      if (!id_number) {
        setOrders([]);
        return;
      }

      const apiResult = await getOrder(id_number as string);
      const apiOrders = Array.isArray(apiResult)
        ? apiResult
        : apiResult
          ? [apiResult]
          : [];
      const mapped = apiOrders.map(mapApiToUi);
      setOrders(mapped);
    } catch (error) {
      console.error("Failed to fetch orders", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    try {
      const ok = await cancelOrder(orderId);
      if (ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.orderId === orderId ? { ...o, status: "Cancelled" } : o
          )
        );
      }
    } catch (err) {
      console.error("Cancel failed", err);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "Pending");
  const paidOrders = orders.filter((o) => o.status === "Paid");
  const cancelledOrders = orders.filter((o) => o.status === "Cancelled");

  return (
    <div className="min-h-screen">
      <div className="mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">My Orders</h2>
        </div>

        <Card className="rounded-2xl p-3 sm:p-6">
          <CardHeader className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <CardTitle className="text-base">Orders</CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="pending">
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
                          className={`ml-2 inline-block rounded-full px-2 py-1 text-xs ${pendingOrders.length > 0 ? "bg-[#1C9DDE] text-white" : "bg-gray-200 text-gray-600"}`}
                        >
                          {pendingOrders.length}
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
                          className={`ml-2 inline-block rounded-full px-2 py-1 text-xs ${paidOrders.length > 0 ? "bg-[#1C9DDE] text-white" : "bg-gray-200 text-gray-600"}`}
                        >
                          {paidOrders.length}
                        </span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      className="flex-1 cursor-pointer py-5 text-center"
                      value="cancelled"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>Cancelled</span>
                        <span
                          className={`ml-2 inline-block rounded-full px-2 py-1 text-xs ${cancelledOrders.length > 0 ? "bg-[#1C9DDE] text-white" : "bg-gray-200 text-gray-600"}`}
                        >
                          {cancelledOrders.length}
                        </span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <div className="mt-6">
                <TabsContent value="pending">
                  {pendingOrders.length > 0 ? (
                    pendingOrders.map((order) => (
                      <OrderCard
                        key={order.orderId}
                        order={order}
                        onCancel={handleCancelOrder}
                      />
                    ))
                  ) : (
                    <EmptyState
                      title="No pending orders"
                      description="You don't have any pending orders right now."
                      buttonText="Shop products"
                      href="/shop"
                    />
                  )}
                </TabsContent>

                <TabsContent value="paid">
                  {paidOrders.length > 0 ? (
                    paidOrders.map((order) => (
                      <OrderCard
                        key={order.orderId}
                        order={order}
                        onCancel={handleCancelOrder}
                      />
                    ))
                  ) : (
                    <EmptyState
                      title="No paid orders"
                      description="You have no paid orders yet. Browse products to place an order."
                      buttonText="Shop products"
                      href="/shop"
                    />
                  )}
                </TabsContent>

                <TabsContent value="cancelled">
                  {cancelledOrders.length > 0 ? (
                    cancelledOrders.map((order) => (
                      <OrderCard
                        key={order.orderId}
                        order={order}
                        onCancel={handleCancelOrder}
                      />
                    ))
                  ) : (
                    <EmptyState
                      title="No cancelled orders"
                      description="You haven't cancelled any orders."
                      buttonText="Shop products"
                      href="/shop"
                    />
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyOrders;
