import { useState, useEffect, useCallback, useMemo } from "react";
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
import type {
  NoetixUsageLog,
  NoetixUsageStats,
  NoetixToolItem,
} from "../types/devtools.types";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  const [toolCategoryFilter, setToolCategoryFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");
  const [appliedAdminFilter, setAppliedAdminFilter] = useState("");
  const [successFilter, setSuccessFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
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
      if (appliedAdminFilter) params.admin = appliedAdminFilter;
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
  }, [page, appliedAdminFilter, successFilter, dateFrom, dateTo, pageSize]);

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

  const toolCategories = useMemo(() => {
    const seen: string[] = [];
    for (const t of tools) {
      if (!seen.includes(t.category)) seen.push(t.category);
    }
    return seen;
  }, [tools]);

  const filteredTools = useMemo(
    () =>
      toolCategoryFilter
        ? tools.filter((t) => t.category === toolCategoryFilter)
        : tools,
    [tools, toolCategoryFilter]
  );

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
    fetchDisabledAdmins();
    fetchTools();
    fetchMaxIterations();
  }, [fetchStats, fetchDisabledAdmins, fetchTools, fetchMaxIterations]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedAdminFilter(adminFilter.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [adminFilter]);

  useEffect(() => {
    setPage(1);
  }, [appliedAdminFilter, successFilter, dateFrom, dateTo]);

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
            Current:{" "}
            <span className="font-mono font-semibold text-[#1c9dde]">
              {maxIterations}
            </span>
          </span>
          <input
            type="number"
            min="1"
            max="50"
            value={maxIterationsValue}
            onChange={(e) => setMaxIterationsValue(e.target.value)}
            className="h-9 w-20 rounded-lg border-[#ececec] bg-white px-3 font-mono text-sm"
          />
          <Button
            type="button"
            size="sm"
            className="rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
            onClick={handleSaveMaxIterations}
            disabled={
              maxIterationsLoading ||
              maxIterationsValue === String(maxIterations)
            }
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
            className="h-9 w-full rounded-xl border border-[#c2c2c2] bg-white pr-3 pl-9 text-sm"
          />
        </div>
        <Select
          value={successFilter || "all"}
          onValueChange={(value) =>
            setSuccessFilter(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="h-9 w-[130px] rounded-xl border-[#c2c2c2] text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Success</SelectItem>
            <SelectItem value="false">Failed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-xl border bg-white px-3 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-xl border bg-white px-3 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={handleRefresh}
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
                    {log.timestamp ? formatDate(log.timestamp) : "—"}
                  </td>
                  <td className="truncate px-2 py-3">{log.admin}</td>
                  <td className="px-2 py-3">
                    {log.tool_names && log.tool_names.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {log.tool_names.map((t, i) => (
                          <span
                            key={i}
                            className="rounded bg-[#f0f0f0] px-1.5 py-0.5 font-mono text-xs text-[#444]"
                          >
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
                      className="rounded-full p-1 text-[#1c9dde] hover:bg-[#e9f4fb]"
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

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-[#8a8a8a]">
            Showing {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, total)} of {total}
          </span>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(pageNum);
                      }}
                      isActive={page === pageNum}
                      className={
                        page === pageNum
                          ? "bg-sky-400 text-white hover:bg-sky-500"
                          : ""
                      }
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              {totalPages > 5 && page < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              {totalPages > 5 && page < totalPages - 2 && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(totalPages);
                    }}
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) setPage(page + 1);
                  }}
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#1c9dde]" />
            <p className="text-sm font-medium text-[#2b2b2b]">
              Noetix AI Tool Registry
            </p>
          </div>
          <Select
            value={toolCategoryFilter || "all"}
            onValueChange={(value) =>
              setToolCategoryFilter(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="h-9 w-[160px] rounded-full border-[#c2c2c2] text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {toolCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="mb-3 text-xs text-[#858585]">
          Toggle tools on or off. Disabled tools will not be available to the AI
          agent. Permission labels indicate who can execute each tool.
        </p>

        {toolsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filteredTools.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#777]">
            No tools found for this category.
          </p>
        ) : (
          <ToolRegistryList tools={filteredTools} onToggle={handleToggleTool} />
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
      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#1c9dde]" />
              Usage Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <DetailRow
                  icon={Clock}
                  label="Timestamp"
                  value={formatDate(selectedLog.timestamp)}
                />
                <DetailRow
                  icon={User}
                  label="Admin"
                  value={selectedLog.admin}
                />
                <DetailRow icon={Bot} label="Mode" value={selectedLog.mode} />
                <DetailRow
                  icon={selectedLog.success ? CheckCircle2 : XCircle}
                  label="Status"
                  value={selectedLog.success ? "Success" : "Failed"}
                  valueClass={
                    selectedLog.success ? "text-green-600" : "text-red-600"
                  }
                />
                <DetailRow
                  icon={Cpu}
                  label="Iterations"
                  value={String(selectedLog.iterations)}
                />
                <DetailRow
                  icon={Bot}
                  label="Session ID"
                  value={selectedLog.session_id}
                  mono
                />
              </div>
              <DetailRow
                icon={Target}
                label="Goal"
                value={selectedLog.goal}
                multiline
              />
              <div className="rounded-lg bg-[#f7f7f7] p-3">
                <p className="mb-2 text-xs font-medium tracking-wide text-[#858585] uppercase">
                  Tool(s) Called
                </p>
                {selectedLog.tool_names && selectedLog.tool_names.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLog.tool_names.map((t, i) => (
                      <span
                        key={i}
                        className="rounded border border-[#e0e0e0] bg-white px-2 py-1 font-mono text-xs text-[#333]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#858585]">—</p>
                )}
              </div>
              {selectedLog.error && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <p className="mb-2 text-xs font-medium tracking-wide text-red-500 uppercase">
                    Error
                  </p>
                  <p className="font-mono text-xs break-all text-red-700">
                    {selectedLog.error}
                  </p>
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
    <Icon className={`mt-0.5 h-4 w-4 shrink-0 text-[#1c9dde]`} />
    <div className="min-w-0">
      <p className="text-[10px] font-medium tracking-wide text-[#858585] uppercase">
        {label}
      </p>
      <p
        className={`text-sm ${mono ? "font-mono break-all" : multiline ? "break-words" : "truncate"} ${valueClass ?? "text-[#2b2b2b]"}`}
      >
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

const PERM_LABELS: Record<
  string,
  {
    label: string;
    cls: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  read: {
    label: "Read",
    cls: "bg-green-50 text-green-700 border-green-200",
    icon: Unlock,
  },
  admin_finance: {
    label: "Read/Write (Finance)",
    cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: Shield,
  },
  admin_only: {
    label: "Admin Only",
    cls: "bg-red-50 text-red-700 border-red-200",
    icon: Lock,
  },
  admin_full: {
    label: "Full Admin",
    cls: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Shield,
  },
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
          <p className="mb-2 text-xs font-semibold tracking-wide text-[#858585] uppercase">
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
                    className={`ml-3 flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      tool.enabled
                        ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    }`}
                    title={
                      tool.enabled ? "Click to disable" : "Click to enable"
                    }
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
