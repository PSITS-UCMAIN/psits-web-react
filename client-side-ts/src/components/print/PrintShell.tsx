import type { ReactNode } from "react";

interface PrintShellProps {
  /** Receipt body. Nothing renders while this is null. */
  children: ReactNode;
}

/**
 * Parks a receipt off-screen and, while printing, hides the rest of the page so
 * only the receipt reaches the printer.
 *
 * `body *` is hidden globally, so only one shell may be mounted at a time.
 */
export const PrintShell = ({ children }: PrintShellProps) => {
  if (!children) return null;

  return (
    <div className="receipt-print-shell" aria-hidden="true">
      <style>
        {`
          .receipt-print-shell {
            position: fixed;
            left: -10000px;
            top: 0;
            width: 48mm;
            background: #fff;
            color: #000;
            font-family: Inter, Arial, sans-serif;
            pointer-events: none;
          }

          @media print {
            /**
             * 58mm thermal roll. Omitting the @page size declaration lets the
             * printer driver's 58mm paper form control the page; 48mm content
             * width targets the ~50mm printable area of the 58mm printers in
             * use, with ~2mm safety and the remainder as right-edge slack.
             */
            @page {
              margin: 0;
            }

            body * {
              visibility: hidden !important;
            }

            .receipt-print-shell,
            .receipt-print-shell * {
              visibility: visible !important;
            }

            .receipt-print-shell {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 48mm !important;
              padding: 0 !important;
              margin: 0 !important;
              pointer-events: auto !important;
            }
          }
        `}
      </style>
      {children}
    </div>
  );
};
