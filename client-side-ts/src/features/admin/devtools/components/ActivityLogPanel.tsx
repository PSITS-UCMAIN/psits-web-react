import { useState, useEffect } from "react";
import { getLogs, deleteOldLogs } from "../api/devtools.api";
import type { LogEntry } from "../types/devtools.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { showToast } from "@/utils/alertHelper";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react";

const ACTION_FILTER_OPTIONS = [
  { value: "Invalidated Session", label: "Invalidated Session" },
  { value: "Bulk Session Invalidation", label: "Bulk Session Invalidation" },
  { value: "Cleared Expired Sessions", label: "Cleared Expired Sessions" },
  { value: "Resend Email", label: "Resend Email" },
  { value: "Export Report", label: "Export Report" },
  { value: "Trigger Cron Job", label: "Trigger Cron Job" },
  { value: "Rebuild Database Indexes", label: "Rebuild Database Indexes" },
  { value: "Cancel Expired Orders", label: "Cancel Expired Orders" },
  { value: "Approve Order", label: "Approve Order" },
  { value: "Cancel Order", label: "Cancel Order" },
  { value: "Refund Order", label: "Refund Order" },
  { value: "Noetix AI Action", label: "AI Chatbot Actions" },
  { value: "Toggled Chatbot", label: "Toggled Chatbot" },
];

export const ActivityLogPanel = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteDays, setDeleteDays] = useState("30");

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        limit: pageSize,
        skip: (page - 1) * pageSize,
      };
      if (actionFilter) params.action = actionFilter;
      if (searchFilter) params.search = searchFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const data = await getLogs(params);
      setEntries(data.data);
      setTotal(data.total);
    } catch {
      showToast("error", "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [actionFilter, searchFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchEntries();
  }, [page, actionFilter, searchFilter, dateFrom, dateTo]);

  const handleDeleteOld = async () => {
    try {
      const result = await deleteOldLogs(parseInt(deleteDays));
      showToast("success", `Deleted ${result.deletedCount} log entries`);
      setConfirmDelete(false);
      fetchEntries();
    } catch {
      showToast("error", "Failed to delete old logs");
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#858585]" />
          <input
            type="text"
            placeholder="Search by admin or target..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#c2c2c2] bg-white pr-3 pl-9 text-sm"
          />
        </div>
        <Select
          value={actionFilter || "all"}
          onValueChange={(value) =>
            setActionFilter(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="h-9 w-[200px] rounded-xl border-[#c2c2c2] text-sm">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTION_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-xl border bg-white px-3 text-sm"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-xl border bg-white px-3 text-sm"
            placeholder="To"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={fetchEntries}
        >
          <RotateCw className="mr-1 h-4 w-4 text-green-400" />
          Refresh
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="mr-1 h-4 w-4 text-red-400" />
          Delete Old
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="py-16 text-center text-sm text-[#777]">
          No activity logs found.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] table-fixed border-collapse text-sm">
            <thead>
              <tr className="rounded-md bg-[#efefef] text-[#2f2f2f]">
                <th className="w-[15%] rounded-l-md px-2 py-2 text-left font-medium">
                  Timestamp
                </th>
                <th className="w-[15%] px-2 py-2 text-left font-medium">
                  Admin
                </th>
                <th className="w-[20%] px-2 py-2 text-left font-medium">
                  Action
                </th>
                <th className="w-[20%] px-2 py-2 text-left font-medium">
                  Target
                </th>
                <th className="w-[15%] px-2 py-2 text-left font-medium">
                  Target Model
                </th>
                <th className="w-[15%] rounded-r-md px-2 py-2 text-left font-medium">
                  Target ID
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry._id}
                  className="border-b border-[#ededed] text-[#303030]"
                >
                  <td className="px-2 py-3">{formatDate(entry.timestamp)}</td>
                  <td className="truncate px-2 py-3">{entry.admin}</td>
                  <td className="px-2 py-3">{entry.action}</td>
                  <td className="truncate px-2 py-3">{entry.target || "-"}</td>
                  <td className="px-2 py-3">{entry.target_model || "-"}</td>
                  <td className="truncate px-2 py-3">
                    {entry.target_id || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-[#8a8a8a]">
            Showing {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-[#8a8a8a]">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Delete old logs?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#777]">
            This will permanently delete all log entries older than{" "}
            <span className="font-medium">{deleteDays} days</span>.
          </p>
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">
              Days to keep
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={deleteDays}
              onChange={(e) => setDeleteDays(e.target.value)}
              className="h-9 w-full rounded-lg border-[#ececec] bg-white px-3 text-sm"
            />
          </div>
          <DialogFooter className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-red-500 hover:bg-red-600"
              onClick={handleDeleteOld}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
