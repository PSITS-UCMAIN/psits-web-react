import axios from "axios";
import backendConnection from "@/api/backendApi";
import type { EmailQueueEntry, HealthStats, SessionInfo, CronExecutionLog, EnvStatusItem, RateLimitStats, CollectionStat, LogQueryParams, LogsResponse, OrderDetail, OrderSearchParams, OrdersResponse, ServerError, BruteForceLog, EndpointInfo, RefundEntry, BackfillResult, StudentYearUpdateResult, StudentYearDecrementResult, NoetixUsageLog, NoetixUsageStats, NoetixUsageQueryParams, NoetixToolItem, NoetixMaxIterations } from "../types/devtools.types";

const getAuthToken = (): string | null => sessionStorage.getItem("Token");

const api = axios.create({
  baseURL: backendConnection(),
});

export const getEmailQueue = async (params?: { status?: string; subtype?: string; limit?: number; skip?: number }) => {
  const { data } = await api.get<{ data: EmailQueueEntry[]; total: number }>("/api/v2/dev/email-queue", {
    params,
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const exportEmailQueueCsv = async (params?: { status?: string; subtype?: string }) => {
  const { data } = await api.get("/api/v2/dev/email-export", {
    params,
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
    responseType: "blob",
  });
  return data;
};

export const resendEmail = async (id: string) => {
  await api.post(`/api/v2/dev/email-resend/${id}`, {}, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
};

export const getHealth = async () => {
  const { data } = await api.get<{ data: HealthStats }>("/api/v2/dev/health", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getSessions = async (params?: { role?: string; campus?: string }) => {
  const { data } = await api.get<{ data: SessionInfo[] }>("/api/v2/dev/sessions", {
    params,
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const invalidateSession = async (userId: string) => {
  await api.post(
    "/api/v2/dev/sessions/invalidate",
    { userId },
    { headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {} }
  );
};

export const invalidateBulkSessions = async (userIds: string[]) => {
  await api.post(
    "/api/v2/dev/sessions/invalidate-bulk",
    { userIds },
    { headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {} }
  );
};

export const triggerCron = async (type: string) => {
  await api.post(
    "/api/v2/dev/actions/cron",
    { type },
    { headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {} }
  );
};

export const getExpiredOrders = async () => {
  const { data } = await api.get<{ data: any[] }>("/api/v2/dev/expired-orders", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const cancelExpiredOrders = async () => {
  const { data } = await api.post<{ data: { cancelledCount: number; restoredItems: number } }>("/api/v2/dev/actions/cancel-expired", {}, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const getCronStatus = async (jobName?: string, limit = 20) => {
  const { data } = await api.get<{ data: CronExecutionLog[] }>("/api/v2/dev/cron-status", {
    params: { jobName, limit },
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getEnvStatus = async () => {
  const { data } = await api.get<{ data: EnvStatusItem[] }>("/api/v2/dev/env-status", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getRateLimitStats = async () => {
  const { data } = await api.get<{ data: RateLimitStats }>("/api/v2/dev/rate-limit-stats", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getDbPerformance = async () => {
  const { data } = await api.get<{ data: CollectionStat[] }>("/api/v2/dev/db-performance", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const rebuildDbIndexes = async () => {
  const { data } = await api.post<{ message: string; data: string[] }>("/api/v2/dev/db/rebuild-indexes", {}, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const getLogs = async (params?: LogQueryParams) => {
  const { data } = await api.get<LogsResponse>("/api/v2/dev/logs", {
    params,
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const deleteOldLogs = async (days: number) => {
  const { data } = await api.delete<{ message: string; deletedCount: number }>("/api/v2/dev/logs/old", {
    params: { days },
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const getOrders = async (params?: OrderSearchParams) => {
  const { data } = await api.get<OrdersResponse>("/api/v2/dev/orders", {
    params,
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const getOrderDetails = async (id: string) => {
  const { data } = await api.get<{ data: OrderDetail }>(`/api/v2/dev/orders/${id}`, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getCertificateTemplates = async () => {
  const { data } = await api.get<{ data: import("../types/devtools.types").CertificateTemplate[] }>("/api/v2/dev/certificates", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const exportCollection = async (params: { collection: string; fields?: string }) => {
  const { data } = await api.get("/api/v2/dev/export", {
    params,
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
    responseType: "blob",
  });
  return data;
};

export const getMembershipRevenue = async () => {
  const { data } = await api.get<{ data: { month: number; year: number; total: number; count: number }[] }>("/api/v2/dev/membership-revenue", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getStockAlerts = async (threshold?: number) => {
  const { data } = await api.get<{ data: { _id: string; name: string; stocks: number; price: number; is_active: boolean; category: string; warning: string }[] }>("/api/v2/dev/stock-alerts", {
    params: threshold ? { threshold } : undefined,
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getSystemSettings = async () => {
  const { data } = await api.get<{ data: { membership_price: number; studentCreatedAtBackfilled?: boolean; studentYearLastUpdated?: string; chatbotEnabled?: boolean } | null }>("/api/v2/dev/settings", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getChatbotEnabled = async () => {
  const { data } = await api.get<{ enabled: boolean }>("/api/v2/dev/settings/chatbot", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.enabled;
};

export const toggleChatbot = async (enabled: boolean) => {
  const { data } = await api.patch<{ enabled: boolean }>(
    "/api/v2/dev/settings/chatbot",
    { enabled },
    { headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {} }
  );
  return data.enabled;
};

export const getRateLimitViolations = async (limit = 50) => {
  const { data } = await api.get<{ data: { ip: string; path: string; timestamp: string }[] }>("/api/v2/dev/rate-limit-violations", {
    params: { limit },
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getEmailQueueStats = async () => {
  const { data } = await api.get<{ data: { total: number; pending: number; sent: number; failed: number; pendingHighRetry: number } }>("/api/v2/dev/email-queue/stats", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getFailedEmailDetails = async (limit = 100) => {
  const { data } = await api.get<{ data: { _id: string; email: string; type: string; subtype?: string; referenceCode?: string; retryCount: number; timestamp: string; daysPending?: number; canResend: boolean }[] }>("/api/v2/dev/email-queue/failed", {
    params: { limit },
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const bulkUpdateEmailStatus = async (ids: string[], status: string) => {
  const { data } = await api.patch<{ message: string; updated: number }>("/api/v2/dev/email-queue/bulk-status", { ids, status }, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const getErrors = async (limit = 50) => {
  const { data } = await api.get<{ data: ServerError[] }>("/api/v2/dev/errors", {
    params: { limit },
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const clearErrors = async () => {
  const { data } = await api.delete<{ message: string; cleared: number }>("/api/v2/dev/errors", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const getBruteForceLogs = async (threshold = 5, limit = 50) => {
  const { data } = await api.get<{ data: BruteForceLog[] }>("/api/v2/dev/brute-force-logs", {
    params: { threshold, limit },
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getEndpointInventory = async () => {
  const { data } = await api.get<{ data: EndpointInfo[] }>("/api/v2/dev/endpoint-inventory", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getRefundQueue = async (limit = 50) => {
  const { data } = await api.get<{ data: RefundEntry[] }>("/api/v2/dev/refunds", {
    params: { limit },
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const backfillCreatedAt = async () => {
  const { data } = await api.post<{ message: string; data: BackfillResult }>("/api/v2/dev/migration/backfill-created-at", {}, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const updateStudentYears = async () => {
  const { data } = await api.post<{ message: string; data: StudentYearUpdateResult }>("/api/v2/dev/actions/update-student-years", {}, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const decrementStudentYears = async () => {
  const { data } = await api.post<{ message: string; data: StudentYearDecrementResult }>("/api/v2/dev/actions/decrement-student-years", {}, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const getNoetixUsageLogs = async (params?: NoetixUsageQueryParams) => {
  const { data } = await api.get<{ data: NoetixUsageLog[]; total: number }>("/api/v2/dev/noetix/usage", {
    params,
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const getNoetixUsageStats = async () => {
  const { data } = await api.get<{ data: NoetixUsageStats }>("/api/v2/dev/noetix/usage/stats", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const deleteOldNoetixUsageLogs = async (days: number) => {
  const { data } = await api.delete<{ message: string; deletedCount: number }>("/api/v2/dev/noetix/usage/old", {
    params: { days },
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data;
};

export const getNoetixDisabledAdmins = async () => {
  const { data } = await api.get<{ data: { noetixDisabledAdmins: string[] } }>("/api/v2/dev/noetix/settings", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const addNoetixDisabledAdmin = async (adminId: string) => {
  const { data } = await api.post<{ data: { noetixDisabledAdmins: string[] } }>("/api/v2/dev/noetix/settings/disable-admin", { adminId }, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const removeNoetixDisabledAdmin = async (adminId: string) => {
  const { data } = await api.delete<{ data: { noetixDisabledAdmins: string[] } }>(`/api/v2/dev/noetix/settings/disable-admin/${adminId}`, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const getNoetixDisabledTools = async (): Promise<string[]> => {
  const { data } = await api.get<{ data: { noetixDisabledTools: string[] } }>("/api/v2/dev/noetix/tools", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data.noetixDisabledTools ?? [];
};

export const getNoetixToolRegistry = async (): Promise<NoetixToolItem[]> => {
  const { data } = await api.get<{ data: NoetixToolItem[] }>("/api/v2/dev/noetix/tools/registry", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data;
};

export const disableNoetixTool = async (toolName: string) => {
  const { data } = await api.post<{ data: { noetixDisabledTools: string[] } }>("/api/v2/dev/noetix/tools/disable", { toolName }, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data.noetixDisabledTools;
};

export const enableNoetixTool = async (toolName: string) => {
  const { data } = await api.delete<{ data: { noetixDisabledTools: string[] } }>(`/api/v2/dev/noetix/tools/disable/${toolName}`, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data.noetixDisabledTools;
};

export const getNoetixMaxIterations = async () => {
  const { data } = await api.get<{ data: NoetixMaxIterations }>("/api/v2/dev/noetix/settings/max-iterations", {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  return data.data.noetixMaxIterations;
};

export const setNoetixMaxIterations = async (value: number) => {
  const { data } = await api.patch<{ data: NoetixMaxIterations }>(
    "/api/v2/dev/noetix/settings/max-iterations",
    { value },
    { headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {} }
  );
  return data.data.noetixMaxIterations;
};
