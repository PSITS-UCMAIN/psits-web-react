import {
  PrintShell,
  ReceiptFooter,
  ReceiptHeader,
  formatReceiptCurrency,
  formatReceiptDateTime,
  formatReceiptList,
} from "@/components/print";
import type { PrintableOrderReceipt as PrintableOrderReceiptData } from "../types/orders.types";

interface PrintableOrderReceiptProps {
  receipt: PrintableOrderReceiptData | null;
}

export const PrintableOrderReceipt = ({
  receipt,
}: PrintableOrderReceiptProps) => {
  if (!receipt) return null;

  return (
    <PrintShell>
      <div className="px-2 py-3 text-[11px] leading-tight">
        <ReceiptHeader copyLabel="Order Copy" />

        <div className="space-y-1 border-b border-dashed border-black pb-3">
          <p>
            <span className="font-semibold">Name:</span>{" "}
            {receipt.student_name || "-"}
          </p>
          <p>
            <span className="font-semibold">Student ID:</span>{" "}
            {receipt.id_number || "-"}
          </p>
          <p>
            <span className="font-semibold">Course & Year:</span>{" "}
            {receipt.course || "-"} {receipt.year ? `- ${receipt.year}` : ""}
          </p>
          <p>
            <span className="font-semibold">Reference:</span>{" "}
            {receipt.reference_code || "-"}
          </p>
          <p>
            <span className="font-semibold">Date:</span>{" "}
            {formatReceiptDateTime(
              receipt.transaction_date || receipt.order_date
            )}
          </p>
          <p>
            <span className="font-semibold">Managed by:</span>{" "}
            {receipt.admin || "-"}
          </p>
        </div>

        {receipt.membership_discount || receipt.promo_name ? (
          <div className="space-y-1 border-b border-dashed border-black py-3">
            {receipt.membership_discount ? (
              <p>
                <span className="font-semibold">Membership:</span> Discounted
              </p>
            ) : null}
            {receipt.promo_name ? (
              <p>
                <span className="font-semibold">Promo:</span>{" "}
                {receipt.promo_name}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="border-b border-dashed border-black py-3">
          <p className="mb-2 font-semibold">Items</p>
          <div className="space-y-3">
            {receipt.items.map((item, index) => (
              <div key={`${item.product_name}-${index}`}>
                <div className="flex justify-between gap-2">
                  <p className="font-semibold">{item.product_name}</p>
                  <p className="shrink-0 font-semibold">
                    {formatReceiptCurrency(item.sub_total)}
                  </p>
                </div>
                <p className="text-[10px] text-black">
                  Qty {item.quantity}
                  {item.price !== undefined
                    ? ` x ${formatReceiptCurrency(item.price)}`
                    : ""}
                </p>
                <p className="text-[10px] text-black">
                  Batch: {item.batch ?? "-"} | Size:{" "}
                  {formatReceiptList(item.sizes)} | Variation:{" "}
                  {formatReceiptList(item.variation)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 border-b border-dashed border-black py-3">
          <div className="flex justify-between">
            <span>Cash</span>
            <span>{formatReceiptCurrency(receipt.cash)}</span>
          </div>
          <div className="flex justify-between">
            <span>Change</span>
            <span>{formatReceiptCurrency(receipt.change)}</span>
          </div>
          <div className="flex justify-between pt-1 text-sm font-bold">
            <span>Total</span>
            <span>{formatReceiptCurrency(receipt.total)}</span>
          </div>
        </div>

        <ReceiptFooter
          referenceCode={receipt.reference_code}
          note="Thank you for your purchase!"
        />
      </div>
    </PrintShell>
  );
};
