import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { RefundDetail } from "../types/orders.types";

interface OrderDetailItem {
  title: string;
  variant?: string;
  price: number;
  qty: number;
}

interface OrderDetail {
  _id: string;
  reference_code?: string;
  student_name?: string;
  id_number?: string;
  course?: string;
  year?: number;
  order_date?: string | Date;
  transaction_date?: string | Date;
  status: string;
  admin?: string;
  items: OrderDetailItem[];
  total?: number;
}

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetail;
  refunds?: RefundDetail[];
  refundLoading?: boolean;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  refunds = [],
  refundLoading = false,
}) => {
  if (!order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "text-orange-600 bg-orange-50 border border-orange-200";
      case "Paid":
        return "text-green-600 bg-green-50 border border-green-200";
      case "Refunded":
        return "text-red-600 bg-red-50 border border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border border-gray-200";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-auto max-h-auto w-3xl overflow-y-auto rounded-3xl sm:h-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500">Order ID: </span>
            <span className="font-mono break-all">{order._id}</span>
          </div>
          <div>
            <span className="text-gray-500">Reference Code: </span>
            <span>{order.reference_code || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">Student Name: </span>
            <span>{order.student_name || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">ID Number: </span>
            <span>{order.id_number || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">Course: </span>
            <span>{order.course || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">Year: </span>
            <span>{order.year || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">Order Date: </span>
            <span>
              {order.order_date
                ? new Date(order.order_date).toLocaleString()
                : "-"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Transaction Date: </span>
            <span>
              {order.transaction_date
                ? new Date(order.transaction_date).toLocaleString()
                : "-"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Status: </span>
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
            >
              {order.status}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Admin: </span>
            <span>{order.admin || "-"}</span>
          </div>
        </div>

        <h4 className="mt-6 mb-2 text-base font-semibold">Items</h4>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 text-center font-medium">Variation</th>
                <th className="px-4 py-2 text-right font-medium">Price</th>
                <th className="px-4 py-2 text-center font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2">{item.title || "-"}</td>
                  <td className="px-4 py-2 text-center">
                    {item.variant || "-"}
                  </td>
                  <td className="px-4 py-2 text-right text-[#1C9DDE]">
                    ₱{item.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-center">{item.qty}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    ₱{(item.price * item.qty).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-4 text-lg">
          <span className="font-medium">Total:</span>
          <span className="text-2xl font-bold text-[#1C9DDE]">
            ₱{order.total?.toFixed(2)}
          </span>
        </div>

        {(refundLoading || refunds.length > 0) && (
          <>
            <h4 className="mt-6 mb-2 text-base font-semibold">
              Refund Details
            </h4>
            {refundLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                <Spinner className="size-4" />
                Loading refund details...
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-2 font-medium">Refund ID</th>
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 text-right font-medium">
                        Refund Amount
                      </th>
                      <th className="px-4 py-2 font-medium">Refunded By</th>
                      <th className="px-4 py-2 font-medium">Refund Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((r: RefundDetail) => (
                      <tr key={r._id} className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">
                          {r.refund_id}
                        </td>
                        <td className="px-4 py-2">{r.product_name}</td>
                        <td className="px-4 py-2 text-right font-medium text-red-600">
                          -₱{r.refund_price?.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">{r.refund_admin}</td>
                        <td className="px-4 py-2">
                          {new Date(r.refund_date).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex justify-end">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailModal;
