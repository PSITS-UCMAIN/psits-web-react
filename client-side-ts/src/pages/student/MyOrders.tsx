import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getOrder, cancelOrder } from '@/features/orders/api/orders';
import type { OrderData, CartItemData } from '@/types/api';

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

const OrderCard: React.FC<{ order: Order; onCancel: (orderId: string) => void }> = ({ order, onCancel }) => {
  const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="border border-gray-100 rounded-xl p-4 mb-4 bg-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">{order.orderId}</span>
          <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600">
            Order Placed: {order.orderDate}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {(() => {
            const map: Record<string, string> = {
              Pending: 'bg-[#FF8E1D]/15 text-[#FF8E1D] border-transparent',
              Paid: 'bg-green-100 text-green-700 border-transparent',
              Cancelled: 'bg-red-100 text-red-700 border-transparent',
            }

            const dotMap: Record<string, string> = {
              Pending: 'bg-[#FF8E1D]',
              Paid: 'bg-green-500',
              Cancelled: 'bg-red-500',
            }

            const cls = map[order.status] ?? 'bg-gray-100 text-gray-700 border-transparent'
            const dot = dotMap[order.status] ?? 'bg-gray-400'

            return (
              <Badge className={cls}>
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${dot}`} />
                {order.status}
              </Badge>
            )
          })()}
        </div>
      </div>

      <div className="space-y-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white rounded-xl p-4 border border-gray-100">
            <div className="w-full sm:w-20 h-40 sm:h-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full">
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-gray-600">{item.variant}</div>
                </div>

                <div className="text-left sm:text-right mt-2 sm:mt-0">
                  <div className="text-[#1C9DDE] font-medium">₱{item.price.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">x{item.qty}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2">
        <div className="text-sm">Total:</div>
        <div className="text-[#1C9DDE] font-semibold">₱{total.toFixed(2)}</div>
      </div>

      {order.status === 'Pending' && (
          <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="rounded-2xl cursor-pointer"
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
  title?: string
  description?: string
  buttonText?: string
  href?: string
}> = ({
  title = 'Your cart is empty',
  description = "Looks like you haven't added any items yet. Start shopping to add products to your cart.",
  buttonText = 'Shop products',
  href = '/shop',
}) => {
  return (
    <div className="py-16 flex flex-col items-center justify-center w-full">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 6h13m-9-6v6m4-6v6" />
      </svg>

      <h3 className="text-lg font-semibold mt-4">{title}</h3>

      <p className="text-sm text-gray-500 mt-2 max-w-xl text-center">{description}</p>

      <div className="mt-6">
        <Button asChild>
          <a href={href}>{buttonText}</a>
        </Button>
      </div>
    </div>
  )
}

const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setLoading] = useState<boolean>(true);

  

  const mapApiToUi = (apiOrder: OrderData): Order => {
    const items = Array.isArray(apiOrder.items)
      ? apiOrder.items.map((it: CartItemData) => ({
          id: String(it.product_id ?? it._id ?? it.id ?? Math.random()),
          title: it.product_name ?? it.name ?? it.title ?? '',
          variant: Array.isArray(it.variation) ? it.variation.join(', ') : it.variant ?? it.color ?? undefined,
          price: Number(it.price ?? it.unit_price ?? it.sub_total ?? 0),
          qty: Number(it.quantity ?? it.qty ?? it.units ?? 1),
          image: it.imageUrl1 ?? it.image ?? it.img ?? undefined,
        }))
      : [];

    const orderDate = apiOrder.order_date ? new Date(apiOrder.order_date).toLocaleDateString() : (apiOrder.transaction_date ? new Date(apiOrder.transaction_date).toLocaleDateString() : '');

    return {
      orderId: String(apiOrder._id ?? apiOrder.orderId ?? apiOrder.reference_code ?? Math.random()),
      items,
      status: apiOrder.order_status ?? apiOrder.status ?? 'Pending',
      orderDate,
    };
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const possibleKeys = ['id_number', 'IdNumber', 'idNumber', 'student_id', 'StudentId', 'user'];
      let id_number: string | undefined;
      for (const k of possibleKeys) {
        const v = sessionStorage.getItem(k);
        if (!v) continue;
        if (k === 'user' || v.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(v);
            if (parsed && (parsed.id_number || parsed.idNumber || parsed.student_id)) {
              id_number = parsed.id_number || parsed.idNumber || parsed.student_id;
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
      const apiOrders = Array.isArray(apiResult) ? apiResult : (apiResult ? [apiResult] : []);
      const mapped = apiOrders.map(mapApiToUi);
      setOrders(mapped);
    } catch (error) {
      console.error('Failed to fetch orders', error);
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
        setOrders((prev) => prev.map(o => o.orderId === orderId ? { ...o, status: 'Cancelled' } : o));
      }
    } catch (err) {
      console.error('Cancel failed', err);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const paidOrders = orders.filter(o => o.status === 'Paid');
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled');

  return (
    <div className="min-h-screen  ">
      <div className=" mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">My Orders</h2>
        </div>

        <Card className="rounded-2xl p-3 sm:p-6">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-base">Orders</CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="pending">
              <div className="overflow-x-auto -mx-2 ">
                <div className="inline-block min-w-full">
                  <TabsList className="flex w-full bg-white px-3 cursor-pointer  py-7 rounded-xl">
                <TabsTrigger className="flex-1 text-center py-5 cursor-pointer" value="pending">
                  <div className="flex items-center justify-center gap-2">
                    <span>Pending</span>
                    <span className={`ml-2 inline-block text-xs px-2 py-1 rounded-full ${pendingOrders.length > 0 ? 'bg-[#1C9DDE] text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {pendingOrders.length}
                    </span>
                  </div>
                </TabsTrigger>
                <TabsTrigger className="flex-1 text-center py-5 cursor-pointer" value="paid">
                  <div className="flex items-center justify-center gap-2">
                    <span>Paid</span>
                    <span className={`ml-2 inline-block text-xs px-2 py-1 rounded-full ${paidOrders.length > 0 ? 'bg-[#1C9DDE] text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {paidOrders.length}
                    </span>
                  </div>
                </TabsTrigger>
                <TabsTrigger className="flex-1 text-center py-5 cursor-pointer" value="cancelled">
                  <div className="flex items-center justify-center gap-2">
                    <span>Cancelled</span>
                    <span className={`ml-2 inline-block text-xs px-2 py-1 rounded-full ${cancelledOrders.length > 0 ? 'bg-[#1C9DDE] text-white' : 'bg-gray-200 text-gray-600'}`}>
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
                    pendingOrders.map(order => (
                      <OrderCard 
                        key={order.orderId} 
                        order={order} 
                        onCancel={handleCancelOrder}
                      />
                    ))
                  ) : (
                    <EmptyState title="No pending orders" description="You don't have any pending orders right now." buttonText="Shop products" href="/shop" />
                  )}
                </TabsContent>

                <TabsContent value="paid">
                  {paidOrders.length > 0 ? (
                    paidOrders.map(order => (
                      <OrderCard 
                        key={order.orderId} 
                        order={order} 
                        onCancel={handleCancelOrder}
                      />
                    ))
                  ) : (
                    <EmptyState title="No paid orders" description="You have no paid orders yet. Browse products to place an order." buttonText="Shop products" href="/shop" />
                  )}
                </TabsContent>

                <TabsContent value="cancelled">
                  {cancelledOrders.length > 0 ? (
                    cancelledOrders.map(order => (
                      <OrderCard 
                        key={order.orderId} 
                        order={order} 
                        onCancel={handleCancelOrder}
                      />
                    ))
                  ) : (
                    <EmptyState title="No cancelled orders" description="You haven't cancelled any orders." buttonText="Shop products" href="/shop" />
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