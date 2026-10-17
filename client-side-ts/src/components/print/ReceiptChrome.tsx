import logo from "@/assets/logo.png";

interface ReceiptHeaderProps {
  /** Small line under the title, e.g. "Order Copy" or "Membership Copy". */
  copyLabel: string;
}

export const ReceiptHeader = ({ copyLabel }: ReceiptHeaderProps) => (
  <>
    <div className="mb-3 flex items-center gap-3">
      <img
        src={logo}
        alt="PSITS"
        className="h-14 w-14 rounded-full object-cover"
      />
      <div>
        <p className="text-base font-semibold leading-none">Official</p>
        <p className="text-base font-semibold leading-none">Receipt</p>
        <p className="mt-1 text-[8px] text-black">{copyLabel}</p>
      </div>
    </div>

    <div className="mb-3 border-b border-dashed border-black pb-3">
      <p className="text-[10px] font-semibold">University of Cebu Main Campus</p>
      <p className="text-[8px] text-black">
        Sanciangko Street Cebu City, 6000
      </p>
    </div>
  </>
);

interface ReceiptFooterProps {
  referenceCode?: string;
  note: string;
}

export const ReceiptFooter = ({ referenceCode, note }: ReceiptFooterProps) => (
  <div className="pt-3 text-center">
    <p className="text-[10px] font-semibold">{referenceCode}</p>
    <p className="mt-1 text-[8px] text-black">{note}</p>
    <p className="mt-1 text-[8px] text-black">
      PSITS - University of Cebu Main Campus
    </p>
  </div>
);
