import { useState, useMemo } from "react";
import {
  BadgeDollarSign,
  Download,
  Filter,
  Package,
  Pencil,
  Printer,
  Search,
  ShoppingBag,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useReportsData,
  ROWS_PER_PAGE,
  DEFAULT_FILTERS,
} from "../hooks/useReportsData";
import { downloadCsv } from "../utils/exportCsv";
import { usePrintReceipt } from "@/components/print";
import { PrintableMembershipReceipt } from "./PrintableMembershipReceipt";
import { EditReferenceDialog } from "./EditReferenceDialog";
import type {
  MembershipReportRow,
  MerchandiseOrderDetail,
  MerchandiseReportProductOption,
  ReportsFilters,
} from "../types/reports.types";

const courses = ["BSIT", "BSCS", "ACT"];
const years = ["1", "2", "3", "4"];
const sizes = ["18", "2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"];
const TERM_OPTIONS = [
  { value: "MEMBERSHIP_TERM_FIRST", label: "1st Term" },
  { value: "MEMBERSHIP_TERM_SECOND", label: "2nd Term" },
];

const formatCurrency = (value: number) =>
  `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value: string | Date) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface ReportsFilterPopoverProps {
  activeTab: "membership" | "merchandise";
  filters: ReportsFilters;
  productOptions: MerchandiseReportProductOption[];
  membershipNameOptions: string[];
  onApply: (filters: ReportsFilters) => void;
}

const ReportsFilterPopover = ({
  activeTab,
  filters,
  productOptions,
  membershipNameOptions,
  onApply,
}: ReportsFilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  const batchOptions = useMemo(
    () =>
      productOptions.find((option) => option.productId === draft.productId)
        ?.batches ?? [],
    [draft.productId, productOptions]
  );

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const update = (field: keyof ReportsFilters, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const handleCancel = () => {
    setDraft(filters);
    setIsOpen(false);
  };

  const handleApply = () => {
    onApply(draft);
    setIsOpen(false);
  };

  const clearAppliedFilters = () => {
    setDraft(DEFAULT_FILTERS);
    onApply(DEFAULT_FILTERS);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (open) setDraft(filters);
          setIsOpen(open);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 shrink-0 rounded-full border-[#e8e8e8] bg-white px-3 hover:bg-white sm:px-4"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={8}
          collisionPadding={24}
          className="w-80 rounded-2xl p-5 shadow-xl"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-medium">Filter</h2>
            <button
              type="button"
              className="cursor-pointer text-xs text-red-500"
              onClick={() => setDraft(DEFAULT_FILTERS)}
            >
              Reset Filter
            </button>
          </div>
          <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                {activeTab === "membership" ? "Reference Code" : "Student ID"}
              </Label>
              <Input
                value={draft.id}
                onChange={(e) => update("id", e.target.value)}
                className="h-9 rounded-lg border-[#ececec]"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => update("name", e.target.value)}
                className="h-9 rounded-lg border-[#ececec]"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">RFID</Label>
              <Input
                value={draft.rfid}
                onChange={(e) => update("rfid", e.target.value)}
                className="h-9 rounded-lg border-[#ececec]"
              />
            </div>

            {activeTab === "membership" && (
              <>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium">
                    Term
                  </Label>
                  <Select
                    value={draft.term || "all"}
                    onValueChange={(v) => update("term", v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg border-[#ececec]">
                      <SelectValue placeholder="All terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All terms</SelectItem>
                      {TERM_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium">
                    Type
                  </Label>
                  <Select
                    value={draft.type || "all"}
                    onValueChange={(v) => update("type", v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg border-[#ececec]">
                      <SelectValue placeholder="All Student" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Default</SelectItem>
                      <SelectItem value="non-members">Students</SelectItem>
                      <SelectItem value="members">PSITS Personnel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium">
                    Membership Name
                  </Label>
                  <Select
                    value={draft.membershipName || "all"}
                    onValueChange={(v) =>
                      update("membershipName", v === "all" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg border-[#ececec]">
                      <SelectValue placeholder="All memberships" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All memberships</SelectItem>
                      {membershipNameOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {activeTab === "merchandise" && (
              <>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium">
                    Product
                  </Label>
                  <Select
                    value={draft.productId || "all"}
                    onValueChange={(v) => {
                      setDraft((current) => ({
                        ...current,
                        productId: v === "all" ? "" : v,
                        batch: "",
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg border-[#ececec]">
                      <SelectValue placeholder="All products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All products</SelectItem>
                      {productOptions.map((option) => (
                        <SelectItem
                          key={option.productId}
                          value={option.productId}
                        >
                          {option.productName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium">
                    Size
                  </Label>
                  <Select
                    value={draft.size}
                    onValueChange={(v) => update("size", v)}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg border-[#ececec]">
                      <SelectValue placeholder="All sizes" />
                    </SelectTrigger>
                    <SelectContent>
                      {sizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {draft.productId && (
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium">
                      Batch
                    </Label>
                    <Select
                      value={draft.batch || "all"}
                      onValueChange={(v) =>
                        update("batch", v === "all" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-9 w-full rounded-lg border-[#ececec]">
                        <SelectValue placeholder="All batches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All batches</SelectItem>
                        {batchOptions.map((batch) => (
                          <SelectItem key={batch} value={batch}>
                            {batch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div>
              <Label className="mb-1.5 block text-xs font-medium">Course</Label>
              <Select
                value={draft.course}
                onValueChange={(v) => update("course", v)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-[#ececec]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                Year Level
              </Label>
              <Select
                value={draft.year}
                onValueChange={(v) => update("year", v)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-[#ececec]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-medium">From</Label>
                <Input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) => update("dateFrom", e.target.value)}
                  className="h-9 rounded-lg border-[#ececec]"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-medium">To</Label>
                <Input
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) => update("dateTo", e.target.value)}
                  className="h-9 rounded-lg border-[#ececec]"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-4"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 rounded-full bg-[#1c9dde] px-5 hover:bg-[#168bc7]"
              onClick={handleApply}
            >
              Apply Filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Clear filters"
          title="Clear filters"
          className="h-9 w-9 rounded-full border-[#e8e8e8] bg-white text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={clearAppliedFilters}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

const pageRange = (currentPage: number, totalPages: number) => {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  return Array.from(pages).sort((a, b) => a - b);
};

interface PaginationFooterProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

const PaginationFooter = ({
  page,
  totalPages,
  total,
  onPageChange,
}: PaginationFooterProps) => {
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
        </button>
      </div>
    </div>
  );
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BadgeDollarSign;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-4 rounded-2xl border border-[#e5e5e5] bg-white px-5 py-4">
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e9f4fb] text-[#1c9dde]">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-[#2b2b2b]">{value}</p>
    </div>
  </div>
);

export const ReportsView = () => {
  const {
    activeTab,
    setActiveTab,
    membershipStatus,
    merchandiseStatus,
    search,
    setSearch,
    filters,
    setFilters,
    page,
    setPage,
    totalPages,
    pagedMembership,
    membershipRows,
    pagedMerchandise,
    tabCounts,
    totalMembershipRows,
    totalMerchandiseRows,
    membershipSummary,
    merchandiseSummary,
    merchandiseProductOptions,
    membershipNameOptions,
    isExporting,
    buildMembershipExportRows,
    exportMerchandiseReport,
    refetchMembership,
    refetchMerchandise,
  } = useReportsData();

  const isMembership = activeTab === "membership";
  const status = isMembership ? membershipStatus : merchandiseStatus;

  // Membership rows already carry every receipt field, so unlike orders there is
  // no receipt endpoint to call here.
  const { receipt: membershipReceipt, print: printMembershipReceipt } =
    usePrintReceipt<MembershipReportRow>();

  const [editingRow, setEditingRow] = useState<MembershipReportRow | null>(
    null
  );

  const handleExport = async () => {
    if (isMembership) {
      downloadCsv(buildMembershipExportRows(), "membership-report.csv");
    } else {
      await exportMerchandiseReport();
    }
  };

  return (
    <div className="bg-background flex min-h-full flex-1 flex-col text-[#333] [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer">
      <header className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Membership and merchandise sales summaries
        </p>
      </header>

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-5 flex w-full border-b border-[#eeeeee] sm:w-auto sm:gap-8">
          <button
            type="button"
            className={cn(
              "relative flex flex-1 cursor-pointer items-center justify-center gap-2 pb-3 text-sm text-[#858585]",
              "sm:flex-initial sm:justify-start",
              isMembership && "font-medium text-[#1c9dde]"
            )}
            onClick={() => setActiveTab("membership")}
          >
            <Wallet className="h-4 w-4 shrink-0" />
            <span>Membership</span>
            <span className="text-xs text-current/70">
              ({tabCounts.membership.toLocaleString()})
            </span>
            {isMembership && (
              <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-[#1c9dde]" />
            )}
          </button>
          <button
            type="button"
            className={cn(
              "relative flex flex-1 cursor-pointer items-center justify-center gap-2 pb-3 text-sm text-[#858585]",
              "sm:flex-initial sm:justify-start",
              !isMembership && "font-medium text-[#1c9dde]"
            )}
            onClick={() => setActiveTab("merchandise")}
          >
            <ShoppingBag className="h-4 w-4 shrink-0" />
            <span>Merchandise</span>
            <span className="text-xs text-current/70">
              ({tabCounts.merchandise.toLocaleString()})
            </span>
            {!isMembership && (
              <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-[#1c9dde]" />
            )}
          </button>
        </div>

        {/* Summary cards */}
        {status === "loading" ? (
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-[76px] rounded-2xl" />
            <Skeleton className="h-[76px] rounded-2xl" />
          </div>
        ) : status === "success" ? (
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isMembership ? (
              <>
                <SummaryCard
                  icon={Wallet}
                  label="Total Members (filtered)"
                  value={membershipSummary.totalMembers.toLocaleString()}
                />
                <SummaryCard
                  icon={BadgeDollarSign}
                  label="Total Revenue (filtered)"
                  value={formatCurrency(membershipSummary.totalRevenue)}
                />
              </>
            ) : (
              <>
                <SummaryCard
                  icon={Package}
                  label="Units Sold (filtered)"
                  value={merchandiseSummary.unitsSold.toLocaleString()}
                />
                <SummaryCard
                  icon={BadgeDollarSign}
                  label="Total Revenue (filtered)"
                  value={formatCurrency(merchandiseSummary.totalRevenue)}
                />
              </>
            )}
          </div>
        ) : null}

        {status === "error" && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>
              Unable to load {isMembership ? "membership" : "merchandise"}{" "}
              report data.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-red-300 bg-white text-red-700 hover:bg-red-100"
              onClick={isMembership ? refetchMembership : refetchMerchandise}
            >
              Retry
            </Button>
          </div>
        )}

        <section className="rounded-[22px] border border-[#e5e5e5] bg-white px-4 py-5 sm:px-6">
          <div className="mb-5 flex items-center gap-2 sm:justify-between sm:gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-[260px]">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9b9b9b]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-9 rounded-full border-[#e8e8e8] pl-9 text-sm"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ReportsFilterPopover
                activeTab={activeTab}
                filters={filters}
                productOptions={merchandiseProductOptions}
                membershipNameOptions={membershipNameOptions}
                onApply={setFilters}
              />
              <Button
                type="button"
                variant="outline"
                className="h-9 shrink-0 rounded-full border-[#e8e8e8] px-3 sm:px-4"
                onClick={handleExport}
                disabled={status !== "success" || isExporting}
                aria-label="Export CSV"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isExporting ? "Exporting..." : "Export CSV"}
                </span>
              </Button>
            </div>
          </div>

          {isMembership ? (
            <MembershipTable
              rows={pagedMembership}
              isLoading={status === "loading"}
              hasError={status === "error"}
              onPrint={printMembershipReceipt}
              onEditReference={setEditingRow}
            />
          ) : (
            <MerchandiseTable
              rows={pagedMerchandise}
              isLoading={status === "loading"}
              hasError={status === "error"}
            />
          )}

          <PaginationFooter
            page={page}
            totalPages={totalPages}
            total={isMembership ? totalMembershipRows : totalMerchandiseRows}
            onPageChange={setPage}
          />
        </section>
      </div>

      <PrintableMembershipReceipt receipt={membershipReceipt} />

      <EditReferenceDialog
        row={editingRow}
        rows={membershipRows}
        onClose={() => setEditingRow(null)}
        onSaved={refetchMembership}
      />
    </div>
  );
};

const MembershipTable = ({
  rows,
  isLoading,
  hasError,
  onPrint,
  onEditReference,
}: {
  rows: ReturnType<typeof useReportsData>["pagedMembership"];
  isLoading: boolean;
  hasError: boolean;
  onPrint: (row: MembershipReportRow) => void;
  onEditReference: (row: MembershipReportRow) => void;
}) => (
  <div className="overflow-x-auto">
    {/* Column widths must total 100%: this is table-fixed, so any overflow
        silently clips the last columns instead of shrinking them. */}
    <table className="w-full min-w-[1120px] table-fixed border-collapse text-sm">
      <thead>
        <tr className="rounded-md bg-[#efefef] text-[#2f2f2f]">
          <th className="w-[13%] rounded-l-md px-2 py-2 text-left font-medium">
            Reference Code
          </th>
          <th className="w-[10%] px-2 py-2 text-left font-medium">
            Student ID
          </th>
          <th className="w-[14%] px-2 py-2 text-left font-medium">Name</th>
          <th className="w-[9%] px-2 py-2 text-left font-medium">
            Course &amp; Year
          </th>
          <th className="w-[10%] px-2 py-2 text-left font-medium">Date</th>
          <th className="w-[12%] px-2 py-2 text-left font-medium">
            Managed By
          </th>
          <th className="w-[10%] px-2 py-2 text-right font-medium">Total</th>
          <th className="w-[12%] rounded-r-md px-2 py-2 text-center font-medium">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          Array.from({ length: 8 }, (_, index) => (
            <tr key={index} className="border-b border-[#ededed]">
              {Array.from({ length: 8 }, (_, cell) => (
                <td key={cell} className="px-2 py-3">
                  <Skeleton className="h-4 w-full rounded-full" />
                </td>
              ))}
            </tr>
          ))
        ) : hasError ? null : rows.length > 0 ? (
          rows.map((row, index) => (
            <tr
              key={`${row.reference_code}-${row.id_number}-${index}`}
              className="border-b border-[#ededed] text-[#303030]"
            >
              <td className="truncate px-2 py-3">{row.reference_code}</td>
              <td className="px-2 py-3">{row.id_number}</td>
              <td className="truncate px-2 py-3">{row.name}</td>
              <td className="px-2 py-3">
                {row.course} {row.year ? `- ${row.year}` : ""}
              </td>
              <td className="px-2 py-3">{formatDate(row.date)}</td>
              <td className="truncate px-2 py-3">{row.admin || "-"}</td>
              <td className="px-2 py-3 text-right font-medium whitespace-nowrap">
                {formatCurrency(row.total || 0)}
              </td>
              <td className="px-2 py-3 whitespace-nowrap">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 rounded-full px-2 text-sky-400"
                    onClick={() => onPrint(row)}
                  >
                    <Printer className="mr-1 h-3.5 w-3.5" />
                    Print
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 shrink-0 rounded-full p-0 text-[#8a8a8a] hover:text-[#2b2b2b]"
                    title="Edit reference code"
                    aria-label="Edit reference code"
                    onClick={() => onEditReference(row)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
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
              No membership records found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const MerchandiseTable = ({
  rows,
  isLoading,
  hasError,
}: {
  rows: MerchandiseOrderDetail[];
  isLoading: boolean;
  hasError: boolean;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[1080px] table-fixed border-collapse text-sm">
      <thead>
        <tr className="rounded-md bg-[#efefef] text-[#2f2f2f]">
          <th className="w-[12%] rounded-l-md px-2 py-2 text-left font-medium">
            Reference Code
          </th>
          <th className="w-[15%] px-2 py-2 text-left font-medium">Product</th>
          <th className="w-[7%] px-2 py-2 text-left font-medium">Batch</th>
          <th className="w-[11%] px-2 py-2 text-left font-medium">
            Student ID
          </th>
          <th className="w-[14%] px-2 py-2 text-left font-medium">Name</th>
          <th className="w-[10%] px-2 py-2 text-left font-medium">
            Course &amp; Year
          </th>
          <th className="w-[7%] px-2 py-2 text-left font-medium">Size</th>
          <th className="w-[8%] px-2 py-2 text-left font-medium">Color</th>
          <th className="w-[6%] px-2 py-2 text-right font-medium">Qty</th>
          <th className="w-[10%] rounded-r-md px-2 py-2 text-right font-medium">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          Array.from({ length: 8 }, (_, index) => (
            <tr key={index} className="border-b border-[#ededed]">
              {Array.from({ length: 10 }, (_, cell) => (
                <td key={cell} className="px-2 py-3">
                  <Skeleton className="h-4 w-full rounded-full" />
                </td>
              ))}
            </tr>
          ))
        ) : hasError ? null : rows.length > 0 ? (
          rows.map((detail) => (
            <tr
              key={detail._id}
              className="border-b border-[#ededed] text-[#303030]"
            >
              <td className="truncate px-2 py-3">{detail.reference_code}</td>
              <td className="truncate px-2 py-3">{detail.product_name}</td>
              <td className="px-2 py-3">{detail.batch || "-"}</td>
              <td className="px-2 py-3">{detail.id_number}</td>
              <td className="truncate px-2 py-3">{detail.student_name}</td>
              <td className="px-2 py-3">
                {detail.course} {detail.year ? `- ${detail.year}` : ""}
              </td>
              <td className="px-2 py-3">
                {detail.size.length > 0 ? detail.size.join(", ") : "-"}
              </td>
              <td className="px-2 py-3">
                {detail.variation.length > 0
                  ? detail.variation.join(", ")
                  : "-"}
              </td>
              <td className="px-2 py-3 text-right">{detail.quantity}</td>
              <td className="px-2 py-3 text-right font-medium">
                {formatCurrency(detail.total || 0)}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td
              colSpan={10}
              className="px-3 py-16 text-center text-sm text-[#777]"
            >
              No merchandise records found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
