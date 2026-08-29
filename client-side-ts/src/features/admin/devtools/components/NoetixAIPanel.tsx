import { useState, useEffect, useCallback } from "react";
import {
  getNoetixUsageLogs,
  getNoetixUsageStats,
  deleteOldNoetixUsageLogs,
  getNoetixDisabledAdmins,
  addNoetixDisabledAdmin,
  removeNoetixDisabledAdmin,
  getNoetixToolRegistry,
  disableNoetixTool,
  enableNoetixTool,
  getNoetixMaxIterations,
  setNoetixMaxIterations,
} from "../api/devtools.api";
import type { NoetixUsageLog, NoetixUsageStats, NoetixToolItem } from "../types/devtools.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/utils/alertHelper";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Bot,
  Plus,
  X,
  RotateCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Clock,
  User,
  Target,
  Cpu,
  Shield,
  Lock,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SUCCESS_COLOR = "text-green-600 bg-green-50 border-green-200";
const FAILURE_COLOR = "text-red-600 bg-red-50 border-red-200";

export const NoetixAIPanel = () => {
  const [stats, setStats] = useState<NoetixUsageStats | null>(null);
  const [logs, setLogs] = useState<NoetixUsageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [logLoading, setLogLoading] = useState(true);
  const [disabledAdmins, setDisabledAdmins] = useState<string[]>([]);
  const [disabledLoading, setDisabledLoading] = useState(true);
  const [tools, setTools] = useState<NoetixToolItem[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [adminFilter, setAdminFilter] = useState("");
  const [successFilter, setSuccessFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteDays, setDeleteDays] = useState("30");
  const [disableConfirm, setDisableConfirm] = useState<string | null>(null);
  const [newAdminId, setNewAdminId] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [selectedLog, setSelectedLog] = useState<NoetixUsageLog | null>(null);
  const [maxIterations, setMaxIterations] = useState<number>(10);
  const [maxIterationsLoading, setMaxIterationsLoading] = useState(false);
  const [maxIterationsValue, setMaxIterationsValue] = useState("10");

  const fetchStats = useCallback(async () => {
    try {
      const data = await getNoetixUsageStats();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const params: Record<string, string | number> = {
        limit: pageSize,
        skip: (page - 1) * pageSize,
      };
      if (adminFilter) params.admin = adminFilter;
      if (successFilter) params.success = successFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const data = await getNoetixUsageLogs(params);
      setLogs(data.data);
      setTotal(data.total);
    } catch {
      showToast("error", "Failed to load Noetix usage logs");
    } finally {
      setLogLoading(false);
    }
  }, [page, adminFilter, successFilter, dateFrom, dateTo, pageSize]);

  const fetchDisabledAdmins = useCallback(async () => {
    setDisabledLoading(true);
    try {
      const data = await getNoetixDisabledAdmins();
      setDisabledAdmins(data.noetixDisabledAdmins);
    } catch {
      // ignore
    } finally {
      setDisabledLoading(false);
    }
  }, []);

  const fetchTools = useCallback(async () => {
    setToolsLoading(true);
    try {
      const data = await getNoetixToolRegistry();
      setTools(data);
    } catch {
      // ignore
    } finally {
      setToolsLoading(false);
    }
  }, []);

  const fetchMaxIterations = useCallback(async () => {
    try {
      const value = await getNoetixMaxIterations();
      setMaxIterations(value);
      setMaxIterationsValue(String(value));
    } catch {
      // ignore
    }
  }, []);

  const handleSaveMaxIterations = async () => {
    const parsed = parseInt(maxIterationsValue, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50) {
      showToast("error", "Max iterations must be between 1 and 50");
      return;
    }
    setMaxIterationsLoading(true);
    try {
      const updated = await setNoetixMaxIterations(parsed);
      setMaxIterations(updated);
      showToast("success", `Noetix max iterations set to ${updated}`);
    } catch {
      showToast("error", "Failed to save max iterations");
    } finally {
      setMaxIterationsLoading(false);
    }
  };

  const handleToggleTool = async (tool: NoetixToolItem) => {
    try {
      if (tool.enabled) {
        await enableNoetixTool(tool.name);
      } else {
        await disableNoetixTool(tool.name);
      }
      setTools((prev) =>
        prev.map((t) =>
          t.name === tool.name ? { ...t, enabled: !t.enabled } : t
        )
      );
      showToast(
        "success",
        `Tool "${tool.name}" ${tool.enabled ? "disabled" : "enabled"}`
      );
    } catch {
      showToast("error", `Failed to toggle tool "${tool.name}"`);
      setTools((prev) =>
        prev.map((t) =>
          t.name === tool.name ? { ...t, enabled: !t.enabled } : t
        )
      );
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLogs();
    fetchDisabledAdmins();
    fetchTools();
    fetchMaxIterations();
  }, [fetchStats, fetchLogs, fetchDisabledAdmins, fetchTools, fetchMaxIterations]);

  useEffect(() => {
    setPage(1);
  }, [adminFilter, successFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDeleteOld = async () => {
    try {
      const result = await deleteOldNoetixUsageLogs(parseInt(deleteDays));
      showToast("success", `Deleted ${result.deletedCount} usage log entries`);
      setConfirmDelete(false);
      fetchStats();
      fetchLogs();
    } catch {
      showToast("error", "Failed to delete old logs");
    }
  };

  const handleAddDisabledAdmin = async () => {
    if (!newAdminId.trim()) return;
    setAddingAdmin(true);
    try {
      await addNoetixDisabledAdmin(newAdminId.trim());
      setNewAdminId("");
      fetchDisabledAdmins();
      fetchStats();
      showToast("success", "Admin disabled from Noetix AI");
    } catch {
      showToast("error", "Failed to disable admin");
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveDisabledAdmin = async (adminId: string) => {
    try {
      await removeNoetixDisabledAdmin(adminId);
      fetchDisabledAdmins();
      fetchStats();
      showToast("success", "Admin re-enabled for Noetix AI");
    } catch {
      showToast("error", "Failed to re-enable admin");
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  };

  const handleRefresh = () => {
    fetchStats();
    fetchLogs();
    fetchDisabledAdmins();
    fetchTools();
  };

  if (logLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Bot}
          label="Total Calls"
          value={stats?.totalCalls ?? 0}
          color="text-[#1c9dde]"
        />
        <StatCard
          icon={CheckCircle2}
          label="Successful"
          value={stats?.successfulCalls ?? 0}
          color="text-green-600"
        />
        <StatCard
          icon={XCircle}
          label="Failed"
          value={stats?.failedCalls ?? 0}
          color="text-red-600"
        />
        <StatCard
          icon={RotateCw}
          label="Today"
          value={stats?.todayCalls ?? 0}
          color="text-[#1c9dde]"
        />
      </div>

      {/* Max Iterations Setting */}
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-[#1c9dde]" />
          <p className="text-sm font-medium text-[#2b2b2b]">
            Agent Max Iterations
          </p>
        </div>
        <p className="mb-3 text-xs text-[#858585]">
          Maximum number of tool-call iterations per AI agent session. Values
          outside 1–50 are rejected. Default is 10.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#555]">
            Current: <span className="font-mono font-semibold text-[#1c9dde]">{maxIterations}</span>
          </span>
          <input
            type="number"
            min="1"
            max="50"
            value={maxIterationsValue}
            onChange={(e) => setMaxIterationsValue(e.target.value)}
            className="h-9 w-20 rounded-lg border-[#ececec] bg-white px-3 text-sm font-mono"
          />
          <Button
            type="button"
            size="sm"
            className="rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
            onClick={handleSaveMaxIterations}
            disabled={maxIterationsLoading || maxIterationsValue === String(maxIterations)}
          >
            {maxIterationsLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#858585]" />
          <input
            type="text"
            placeholder="Filter by admin..."
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            className="h-9 w-full rounded-lg border-[#ececec] bg-white pr-3 pl-9 text-sm"
          />
        </div>
        <select
          value={successFilter}
          onChange={(e) => setSuccessFilter(e.target.value)}
          className="h-9 rounded-lg border-[#ececec] bg-white px-3 text-sm"
        >
          <option value="">All Status</option>
          <option value="true">Success</option>
          <option value="false">Failed</option>
        </select>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#858585]" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-lg border-[#ececec] bg-white px-3 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-lg border-[#ececec] bg-white px-3 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={handleRefresh}
        >
          <RotateCw className="mr-1 h-4 w-4" />
          Refresh
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Delete Old
        </Button>
      </div>

      {/* Logs Table */}
      {logLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-[#858585]" />
          <p className="text-sm text-[#777]">No Noetix AI usage logs found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] table-fixed border-collapse text-sm">
            <thead>
              <tr className="rounded-md bg-[#efefef] text-[#2f2f2f]">
                <th className="w-[15%] rounded-l-md px-2 py-2 text-left font-medium">
                  Timestamp
                </th>
                <th className="w-[12%] px-2 py-2 text-left font-medium">
                  Admin
                </th>
                <th className="w-[18%] px-2 py-2 text-left font-medium">
                  Tool(s)
                </th>
                <th className="w-[8%] px-2 py-2 text-left font-medium">
                  Status
                </th>
                <th className="w-[8%] px-2 py-2 text-left font-medium">
                  Iterations
                </th>
                <th className="w-[20%] px-2 py-2 text-left font-medium">
                  Goal
                </th>
                <th className="w-[12%] px-2 py-2 text-left font-medium">
                  Session ID
                </th>
                <th className="w-[4%] px-2 py-2 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log._id}
                  className="border-b border-[#ededed] text-[#303030]"
                >
                  <td className="truncate px-2 py-3">
                    {log.timestamp
                      ? formatDate(log.timestamp)
                      : "—"}
                  </td>
                  <td className="truncate px-2 py-3">{log.admin}</td>
                  <td className="px-2 py-3">
                    {log.tool_names && log.tool_names.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {log.tool_names.map((t, i) => (
                          <span key={i} className="font-mono text-xs bg-[#f0f0f0] rounded px-1.5 py-0.5 text-[#444]">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#858585]">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs",
                        log.success ? SUCCESS_COLOR : FAILURE_COLOR
                      )}
                    >
                      {log.success ? "Success" : "Failed"}
                    </Badge>
                  </td>
                  <td className="px-2 py-3 text-center">{log.iterations}</td>
                  <td className="truncate px-2 py-3" title={log.goal ?? ""}>
                    {log.goal
                      ? log.goal.length > 60
                        ? `${log.goal.slice(0, 60)}...`
                        : log.goal
                      : "—"}
                  </td>
                  <td className="truncate px-2 py-3 font-mono text-xs text-[#858585]">
                    {log.session_id ? `${log.session_id.slice(0, 8)}...` : "—"}
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="rounded-full p-1 hover:bg-[#e9f4fb] text-[#1c9dde]"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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

      {/* Disabled Admins Section */}
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[#1c9dde]" />
          <p className="text-sm font-medium text-[#2b2b2b]">
            Disabled Noetix Admins
          </p>
        </div>
        <p className="mb-3 text-xs text-[#858585]">
          Admins in this list cannot use the Noetix AI chat. They can still
          access other system features.
        </p>

        {disabledLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <div className="mb-3 flex flex-wrap gap-2">
            {disabledAdmins.length === 0 ? (
              <span className="text-sm text-[#858585]">
                No admins disabled.
              </span>
            ) : (
              disabledAdmins.map((adminId) => (
                <div
                  key={adminId}
                  className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700"
                >
                  <span className="font-mono">{adminId}</span>
                  <button
                    type="button"
                    onClick={() => setDisableConfirm(adminId)}
                    className="ml-1 rounded-full hover:bg-red-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <input
              type="text"
              placeholder="Admin ID to disable..."
              value={newAdminId}
              onChange={(e) => setNewAdminId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDisabledAdmin()}
              className="h-9 w-full rounded-lg border-[#ececec] bg-white pr-3 pl-3 text-sm"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
            onClick={handleAddDisabledAdmin}
            disabled={addingAdmin || !newAdminId.trim()}
          >
            <Plus className="mr-1 h-4 w-4" />
            Disable
          </Button>
        </div>
      </div>

      {/* Tool Registry Section */}
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4 text-[#1c9dde]" />
          <p className="text-sm font-medium text-[#2b2b2b]">
            Noetix AI Tool Registry
          </p>
        </div>
        <p className="mb-3 text-xs text-[#858585]">
          Toggle tools on or off. Disabled tools will not be available to the
          AI agent. Permission labels indicate who can execute each tool.
        </p>

        {toolsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <ToolRegistryList
            tools={tools}
            onToggle={handleToggleTool}
          />
        )}
      </div>

      {/* Delete Old Logs Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Delete old usage logs?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#777]">
            This will permanently delete all Noetix usage log entries older than{" "}
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

      {/* Disable Admin Confirm Dialog */}
      <Dialog
        open={Boolean(disableConfirm)}
        onOpenChange={(open) => !open && setDisableConfirm(null)}
      >
        <DialogContent className="max-w-sm rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Re-enable admin?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#777]">
            This will allow{" "}
            <span className="font-mono font-medium">{disableConfirm}</span> to
            use Noetix AI again.
          </p>
          <DialogFooter className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setDisableConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
              onClick={() => {
                if (disableConfirm) {
                  handleRemoveDisabledAdmin(disableConfirm);
                  setDisableConfirm(null);
                }
              }}
            >
              Re-enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View Details Dialog */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg rounded-[20px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#1c9dde]" />
              Usage Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <DetailRow icon={Clock} label="Timestamp" value={formatDate(selectedLog.timestamp)} />
                <DetailRow icon={User} label="Admin" value={selectedLog.admin} />
                <DetailRow icon={Bot} label="Mode" value={selectedLog.mode} />
                <DetailRow
                  icon={selectedLog.success ? CheckCircle2 : XCircle}
                  label="Status"
                  value={selectedLog.success ? "Success" : "Failed"}
                  valueClass={selectedLog.success ? "text-green-600" : "text-red-600"}
                />
                <DetailRow icon={Cpu} label="Iterations" value={String(selectedLog.iterations)} />
                <DetailRow icon={Bot} label="Session ID" value={selectedLog.session_id} mono />
              </div>
              <DetailRow icon={Target} label="Goal" value={selectedLog.goal} multiline />
              <div className="rounded-lg bg-[#f7f7f7] p-3">
                <p className="mb-2 text-xs font-medium text-[#858585] uppercase tracking-wide">
                  Tool(s) Called
                </p>
                {selectedLog.tool_names && selectedLog.tool_names.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLog.tool_names.map((t, i) => (
                      <span key={i} className="font-mono text-xs bg-white border border-[#e0e0e0] rounded px-2 py-1 text-[#333]">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#858585]">—</p>
                )}
              </div>
              {selectedLog.error && (
                <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                  <p className="mb-2 text-xs font-medium text-red-500 uppercase tracking-wide">Error</p>
                  <p className="font-mono text-xs text-red-700 break-all">{selectedLog.error}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setSelectedLog(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
  multiline,
  mono,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  multiline?: boolean;
  mono?: boolean;
  valueClass?: string;
}) => (
  <div className={`${multiline ? "" : "flex items-start gap-2"}`}>
    <Icon className={`h-4 w-4 mt-0.5 shrink-0 text-[#1c9dde]`} />
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-[#858585] uppercase tracking-wide">{label}</p>
      <p className={`text-sm ${mono ? "font-mono break-all" : multiline ? "break-words" : "truncate"} ${valueClass ?? "text-[#2b2b2b]"}`}>
        {value}
      </p>
    </div>
  </div>
);
const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) => (
  <div className="flex items-center gap-3 rounded-xl border border-[#e5e5e5] bg-white px-4 py-3">
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e9f4fb]">
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
    <div>
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  </div>
);

const PERM_LABELS: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  read: { label: "Read", cls: "bg-green-50 text-green-700 border-green-200", icon: Unlock },
  admin_finance: { label: "Read/Write (Finance)", cls: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Shield },
  admin_only: { label: "Admin Only", cls: "bg-red-50 text-red-700 border-red-200", icon: Lock },
  admin_full: { label: "Full Admin", cls: "bg-purple-50 text-purple-700 border-purple-200", icon: Shield },
};

const ToolRegistryList = ({
  tools,
  onToggle,
}: {
  tools: NoetixToolItem[];
  onToggle: (tool: NoetixToolItem) => void;
}) => {
  const grouped = tools.reduce<Record<string, NoetixToolItem[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, categoryTools]) => (
        <div key={category}>
          <p className="mb-2 text-xs font-semibold text-[#858585] uppercase tracking-wide">
            {category}
          </p>
          <div className="space-y-1.5">
            {categoryTools.map((tool) => {
              const perm = PERM_LABELS[tool.permission] ?? PERM_LABELS.read;
              const PermIcon = perm.icon;
              return (
                <div
                  key={tool.name}
                  className="flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-[#2b2b2b]">
                        {tool.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${perm.cls}`}
                        title={tool.description}
                      >
                        <span className="inline-flex items-center gap-1">
                          <PermIcon className="h-3 w-3" />
                          {perm.label}
                        </span>
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[#858585]">
                      {tool.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggle(tool)}
                    className={`ml-3 shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                      tool.enabled
                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                    }`}
                    title={tool.enabled ? "Click to disable" : "Click to enable"}
                  >
                    {tool.enabled ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {tool.enabled ? "On" : "Off"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
