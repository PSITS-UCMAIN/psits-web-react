import {
  PrintShell,
  ReceiptFooter,
  ReceiptHeader,
  formatReceiptCurrency,
  formatReceiptDateTime,
  formatReceiptReference,
} from "@/components/print";
import type { MembershipReportRow } from "../types/reports.types";

interface PrintableMembershipReceiptProps {
  receipt: MembershipReportRow | null;
}

export const PrintableMembershipReceipt = ({
  receipt,
}: PrintableMembershipReceiptProps) => {
  if (!receipt) return null;

  const referenceDisplay = formatReceiptReference(
    receipt.reference_code,
    receipt.term_name
  );

  return (
    <PrintShell>
      <div className="px-2 py-3 text-[9px] leading-tight">
        <ReceiptHeader copyLabel="Membership Copy" />

        <div className="space-y-1 border-b border-dashed border-black pb-3">
          <p>
            <span className="font-semibold">Name:</span> {receipt.name || "-"}
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
            {referenceDisplay}
          </p>
          <p>
            <span className="font-semibold">Date:</span>{" "}
            {formatReceiptDateTime(receipt.date)}
          </p>
          <p>
            <span className="font-semibold">Managed by:</span>{" "}
            {receipt.admin || "-"}
          </p>
        </div>

        <div className="border-b border-dashed border-black py-3">
          <p className="mb-2 font-semibold">Item</p>
          <div className="flex justify-between gap-2">
            <p className="font-semibold">Membership</p>
            <p className="shrink-0 font-semibold">
              {formatReceiptCurrency(receipt.total)}
            </p>
          </div>
        </div>

        <div className="space-y-1 border-b border-dashed border-black py-3">
          <div className="flex justify-between pt-1 text-xs font-bold">
            <span>Total</span>
            <span>{formatReceiptCurrency(receipt.total)}</span>
          </div>
        </div>

        <ReceiptFooter
          referenceCode={referenceDisplay}
          note="Thank you for your membership!"
        />
      </div>
    </PrintShell>
  );
};
