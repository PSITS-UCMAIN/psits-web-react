import { Request, Response } from "express";
import { Types } from "mongoose";
import { catchAsync } from "../util/catch.async.util";
import {
  getEmailQueueEntries,
  getEmailQueueCount,
  resendSingleEmail,
  getHealthStats,
  getDatabaseCounts,
  checkMongoConnection,
  getCronExecutionLogs,
  getEnvStatus,
  getRateLimitStats as getRateLimitStatsService,
  getCollectionStats,
  rebuildIndexes,
  getLogEntries,
  deleteOldLogs,
  searchOrders,
  getOrderDetails,
  getCertificateTemplates,
  exportCollection,
  getMembershipRevenue,
  getStockAlerts,
  getSystemSettings,
  getEmailQueueStats,
  getFailedEmailDetails,
  bulkUpdateEmailStatus,
  getRateLimitViolations as getRateLimitViolationsService,
  logServerError,
  getErrors,
  clearErrors,
  incrementFailedAuthAttempt,
  getBruteForceLogs,
  getEndpointInventory,
  getRefundQueue,
  backfillCreatedAt,
  updateStudentYears,
  decrementStudentYears,
  suspendOldStudents,
  isRefreshTokenExpired,
  clearExpiredSessions,
  StudentYearCooldownError,
  EMAIL_QUEUE_STATUSES,
} from "../services/devtools.service";
import { Admin } from "../models/admin.model";
import { Student } from "../models/student.model";
import { resendPendingEmails } from "../services/email.resend.service";
import { checkPromos } from "../custom_function/check_promo";
import { orderService } from "../services/order.service";
import { campus_type } from "../enums/campus.enums";
import { logService } from "../services/log.service";
import { logs_action } from "../enums/logs.enums";

const ALLOWED_CAMPUS = [campus_type.MAIN] as string[];

// Express parses `?status[$ne]=x` into an object, which Mongoose would read as
// a query operator. Filters only ever accept plain strings.
const queryString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

// limit/skip/threshold from the query: anything missing or not a number falls
// back to the default, and values are capped so one request can't pull a whole
// collection.
const queryInt = (
  value: unknown,
  fallback: number,
  { min = 0, max = 1000 }: { min?: number; max?: number } = {}
): number => {
  const parsed = typeof value === "string" ? parseInt(value, 10) : NaN;
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

class DevToolsController {
  getEmailQueue = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { limit, skip } = req.query;
    const status = queryString(req.query.status);
    const subtype = queryString(req.query.subtype);
    const entries = await getEmailQueueEntries({
      status,
      subtype,
      limit: queryInt(limit, 100, { min: 1 }),
      skip: queryInt(skip, 0, { max: 100000 }),
    });
    const total = await getEmailQueueCount({ status, subtype });
    res.status(200).json({ data: entries, total });
  });

  exportEmailQueueCsv = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const entries = await getEmailQueueEntries({
      status: queryString(req.query.status),
      subtype: queryString(req.query.subtype),
      limit: 10000,
      skip: 0,
    });

    const headers = [
      "id",
      "type",
      "subtype",
      "email",
      "status",
      "referenceCode",
      "retryCount",
      "timestamp",
    ];
    const csvRows = [headers.join(",")];

    for (const entry of entries) {
      const row = headers.map((h) => {
        const val = (entry as any)[h];
        const str = val === undefined || val === null ? "" : String(val);
        return str.includes(",") || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      });
      csvRows.push(row.join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=email-queue-${new Date().toISOString().split("T")[0]}.csv`
    );
    const csvAdminName = String(req.admin?.name ?? "");
    await logService.create({
      admin:
        csvAdminName || String(req.userV2?.idNumber ?? "") || "Unknown Admin",
      admin_id: req.admin?._id,
      action: logs_action.EXPORT_REPORT,
      target: "Email queue CSV",
      target_model: "Report",
    });
    res.status(200).send(csvRows.join("\n"));
  });

  resendSingleEmail = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { id } = req.params;
    // resendSingleEmail marks the entry sent itself.
    const result = await resendSingleEmail(id as string);
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.RESEND_EMAIL,
      target: String(id),
      target_model:
        result.type === "automation-report"
          ? "AutomationJob"
          : result.subtype === "membership"
            ? "Membership"
            : "Order",
    });
    res.status(200).json({ message: "Email resent successfully" });
  });

  getHealth = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const [stats, counts, mongoOk] = await Promise.all([
      getHealthStats(),
      getDatabaseCounts(),
      checkMongoConnection(),
    ]);
    res.status(200).json({
      data: { ...stats, mongoConnected: mongoOk, ...counts },
    });
  });

  getSessions = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const role = queryString(req.query.role);
    const campus = queryString(req.query.campus);

    const tokenFilter = { currentRefreshToken: { $exists: true, $ne: null } };
    const [admins, students] = await Promise.all([
      Admin.find(tokenFilter, {
        name: 1,
        id_number: 1,
        campus: 1,
        position: 1,
        currentRefreshToken: 1,
      }).lean(),
      Student.find(tokenFilter, {
        first_name: 1,
        last_name: 1,
        id_number: 1,
        campus: 1,
        currentRefreshToken: 1,
      }).lean(),
    ]);

    // A stored refresh token outlives its expiry until someone logs in again,
    // so only tokens that are still valid count as active sessions.
    const isActive = (doc: { currentRefreshToken?: string | null }) =>
      !isRefreshTokenExpired(String(doc.currentRefreshToken));

    const adminList = admins.filter(isActive).map((a) => ({
      id: a._id.toString(),
      name: a.name,
      idNumber: a.id_number,
      role: "admin",
      campus: a.campus,
      position: a.position,
    }));

    const studentList = students.filter(isActive).map((s) => ({
      id: s._id.toString(),
      name: `${s.first_name} ${s.last_name}`,
      idNumber: s.id_number,
      role: "student",
      campus: s.campus,
    }));

    const sessions = [
      ...(role === "student" ? [] : adminList),
      ...(role === "admin" ? [] : studentList),
    ].filter((s) => !campus || s.campus === campus);

    res.status(200).json({ data: sessions });
  });

  clearExpiredSessions = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const clearedCount = await clearExpiredSessions();

    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.CLEAR_EXPIRED_SESSIONS,
      target: `Cleared ${clearedCount} expired sessions`,
      target_model: "Admin",
    });

    res.status(200).json({
      message: `${clearedCount} expired session(s) cleared`,
      cleared: clearedCount,
    });
  });

  invalidateSession = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { userId } = req.body;
    if (typeof userId !== "string" || !Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "A valid userId is required" });
    }

    const [adminResult, studentResult] = await Promise.all([
      Admin.updateOne({ _id: userId }, { currentRefreshToken: null }),
      Student.updateOne({ _id: userId }, { currentRefreshToken: null }),
    ]);
    if (adminResult.matchedCount + studentResult.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.INVALIDATE_SESSION,
      target: `Invalidated session for ${userId}`,
      target_model: adminResult.matchedCount > 0 ? "Admin" : "Student",
    });

    res.status(200).json({ message: "Session invalidated" });
  });

  invalidateBulkSessions = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { userIds } = req.body;

    if (
      !Array.isArray(userIds) ||
      userIds.length === 0 ||
      !userIds.every(
        (id: unknown) => typeof id === "string" && Types.ObjectId.isValid(id)
      )
    ) {
      return res
        .status(400)
        .json({ message: "userIds must be a non-empty list of valid IDs" });
    }

    const [adminResult, studentResult] = await Promise.all([
      Admin.updateMany(
        { _id: { $in: userIds } },
        { $set: { currentRefreshToken: null } }
      ),
      Student.updateMany(
        { _id: { $in: userIds } },
        { $set: { currentRefreshToken: null } }
      ),
    ]);
    const invalidated =
      (adminResult.modifiedCount || 0) + (studentResult.modifiedCount || 0);

    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.INVALIDATE_SESSION_BULK,
      target: `Bulk invalidated ${invalidated} sessions`,
      target_model: "Admin",
    });

    res.status(200).json({ message: `${invalidated} session(s) invalidated` });
  });

  triggerCron = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { type } = req.body;

    if (type === "email-resend") {
      await resendPendingEmails();
      await logService.create({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.TRIGGER_CRON,
        target: `Triggered cron job: ${type}`,
        target_model: "Order",
      });
      res.status(200).json({ message: "Email resend job triggered" });
    } else if (type === "promo-check") {
      await checkPromos();
      await logService.create({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.TRIGGER_CRON,
        target: `Triggered cron job: ${type}`,
        target_model: "Merchandise",
      });
      res.status(200).json({ message: "Promo check triggered" });
    } else if (type === "student-year4-suspend") {
      const result = await suspendOldStudents();
      await logService.create({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.SUSPEND_OLD_STUDENTS,
        target: `Suspended ${result.suspended} student(s) meeting the age/year rule`,
        target_model: "Student",
      });
      res.status(200).json({
        message: `Suspended ${result.suspended} student(s) meeting the age/year rule`,
        data: result,
      });
    } else {
      res.status(400).json({ message: "Invalid cron type" });
    }
  });

  getExpiredOrders = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const orders = await orderService.getExpiredPendingOrders();
    res.status(200).json({ data: orders });
  });

  cancelExpiredOrders = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const result = await orderService.cancelExpiredOrders();
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.CANCEL_EXPIRED_ORDERS,
      target: `Cancelled ${result.cancelledCount} expired order(s), restored ${result.restoredItems} item(s)`,
      target_model: "Order",
    });
    res.status(200).json({
      message: `${result.cancelledCount} expired order(s) cancelled`,
      data: result,
    });
  });

  getCronStatus = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const logs = await getCronExecutionLogs(
      queryString(req.query.jobName),
      queryInt(req.query.limit, 20, { min: 1, max: 200 })
    );
    res.status(200).json({ data: logs });
  });

  getEnvStatus = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const status = getEnvStatus();
    res.status(200).json({ data: status });
  });

  getRateLimitStats = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const stats = getRateLimitStatsService();
    res.status(200).json({ data: stats });
  });

  getDbPerformance = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const stats = await getCollectionStats();
    res.status(200).json({ data: stats });
  });

  rebuildDbIndexes = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const result = await rebuildIndexes();
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.REBUILD_DB_INDEXES,
      target: `Rebuilt indexes for ${result.collections?.length || 0} collection(s)`,
      target_model: "Admin",
    });
    res.status(200).json({ message: result.message, data: result.collections });
  });

  getLogs = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { limit, skip } = req.query;
    const dateFrom = queryString(req.query.dateFrom);
    const dateTo = queryString(req.query.dateTo);
    const { entries, total } = await getLogEntries({
      action: queryString(req.query.action),
      admin: queryString(req.query.admin),
      target: queryString(req.query.target),
      search: queryString(req.query.search),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: queryInt(limit, 100, { min: 1 }),
      skip: queryInt(skip, 0, { max: 100000 }),
    });
    res.status(200).json({ data: entries, total });
  });

  deleteOldLogs = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { days } = req.query;
    if (!days) {
      return res.status(400).json({ message: "days parameter required" });
    }
    // 0 or negative days moves the cutoff to now/future and wipes every log.
    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays < 1) {
      return res
        .status(400)
        .json({ message: "days must be a whole number of at least 1" });
    }
    const deletedCount = await deleteOldLogs(parsedDays);
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.DELETE_OLD_LOGS,
      target: `Deleted ${deletedCount} log entries older than ${parsedDays} days`,
      target_model: "Admin",
    });
    res
      .status(200)
      .json({ message: `Deleted ${deletedCount} log entries`, deletedCount });
  });

  getOrders = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { limit, skip } = req.query;
    const { entries, total } = await searchOrders({
      query: queryString(req.query.query),
      status: queryString(req.query.status),
      limit: queryInt(limit, 50, { min: 1 }),
      skip: queryInt(skip, 0, { max: 100000 }),
    });
    res.status(200).json({ data: entries, total });
  });

  getOrderDetails = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { id } = req.params;
    const order = await getOrderDetails(id as string);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json({ data: order });
  });

  getCertificateTemplates = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const templates = await getCertificateTemplates();
    res.status(200).json({ data: templates });
  });

  exportCollection = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { collection, fields, limit, skip } = req.query;
    if (!collection || typeof collection !== "string") {
      return res.status(400).json({ message: "collection parameter required" });
    }

    const docs = await exportCollection({
      collection,
      fields: fields ? String(fields).split(",") : undefined,
      limit: queryInt(limit, 1000, { min: 1 }),
      skip: queryInt(skip, 0, { max: 100000 }),
    });

    const headers = docs.length > 0 ? Object.keys(docs[0]) : [];
    const csvRows = [
      headers.join(","),
      ...docs.map((doc: any) =>
        headers
          .map((h) => {
            const val = doc[h];
            const str = val === undefined || val === null ? "" : String(val);
            return str.includes(",") || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(",")
      ),
    ];

    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.EXPORT_COLLECTION,
      target: `Exported ${docs.length} ${collection} record(s)`,
      target_model: "Report",
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${collection.toLowerCase()}-export-${new Date().toISOString().split("T")[0]}.csv`
    );
    res.status(200).send(csvRows.join("\n"));
  });

  getMembershipRevenue = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const revenue = await getMembershipRevenue();
    res.status(200).json({ data: revenue });
  });

  getStockAlerts = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { threshold } = req.query;
    const alerts = await getStockAlerts(
      queryInt(threshold, 5, { max: 100000 })
    );
    res.status(200).json({ data: alerts });
  });

  getSystemSettings = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const settings = await getSystemSettings();
    res.status(200).json({ data: settings });
  });

  getRateLimitViolations = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { limit } = req.query;
    const violations = getRateLimitViolationsService(
      queryInt(limit, 50, { min: 1 })
    );
    res.status(200).json({ data: violations });
  });

  getEmailQueueStats = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const stats = await getEmailQueueStats();
    res.status(200).json({ data: stats });
  });

  getFailedEmailDetails = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { limit } = req.query;
    const details = await getFailedEmailDetails(
      queryInt(limit, 100, { min: 1 })
    );
    res.status(200).json({ data: details });
  });

  bulkUpdateEmailStatus = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { ids, status } = req.body;
    if (
      !Array.isArray(ids) ||
      !ids.every(
        (id: unknown) => typeof id === "string" && Types.ObjectId.isValid(id)
      )
    ) {
      return res
        .status(400)
        .json({ message: "ids must be a list of valid email queue IDs" });
    }
    const validStatus = EMAIL_QUEUE_STATUSES.find((s) => s === status);
    if (!validStatus) {
      return res.status(400).json({
        message: `status must be one of: ${EMAIL_QUEUE_STATUSES.join(", ")}`,
      });
    }
    const updated = await bulkUpdateEmailStatus(ids, validStatus);
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.BULK_UPDATE_EMAIL_STATUS,
      target: `Set ${updated} email(s) to ${validStatus}`,
      target_model: "Settings",
    });
    res.status(200).json({ message: `Updated ${updated} email(s)`, updated });
  });

  getErrors = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { limit } = req.query;
    const errors = getErrors(queryInt(limit, 50, { min: 1 }));
    res.status(200).json({ data: errors });
  });

  clearErrors = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const count = clearErrors();
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.CLEAR_SERVER_ERRORS,
      target: `Cleared ${count} server error(s)`,
      target_model: "Settings",
    });
    res
      .status(200)
      .json({ message: `Cleared ${count} error(s)`, cleared: count });
  });

  getBruteForceLogs = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { threshold, limit } = req.query;
    const logs = getBruteForceLogs(
      queryInt(threshold, 5, { max: 100000 }),
      queryInt(limit, 50, { min: 1 })
    );
    res.status(200).json({ data: logs });
  });

  getEndpointInventory = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const endpoints = getEndpointInventory();
    res.status(200).json({ data: endpoints });
  });

  getRefundQueue = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { limit } = req.query;
    const refunds = await getRefundQueue(queryInt(limit, 50, { min: 1 }));
    res.status(200).json({ data: refunds });
  });

  testEndpoint = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { path: endpointPath, method, body } = req.body;

    if (!endpointPath || !method) {
      return res.status(400).json({ message: "path and method are required" });
    }

    // Keep in sync with ApiTesterPanel's list. Every path here must exist.
    const allowedEndpoints: Record<string, "GET" | "POST"> = {
      "/api/v2/auth/login": "POST",
      "/api/v2/merchandise": "GET",
      "/api/v2/events/get-all-event": "GET",
      "/api/v2/dev/health": "GET",
    };

    const normalizedMethod = method.toUpperCase() as "GET" | "POST";
    if (
      !allowedEndpoints[endpointPath] ||
      allowedEndpoints[endpointPath] !== normalizedMethod
    ) {
      return res
        .status(400)
        .json({ message: "Endpoint/method not allowed for testing" });
    }

    const axios = (await import("axios")).default;
    const baseUrl =
      process.env.BASE_URL || `http://localhost:${Number(process.env.PORT) || 5000}`;

    try {
      const response = await axios({
        url: `${baseUrl}${endpointPath}`,
        method: method.toLowerCase(),
        data: body,
        headers: {
          Authorization: `Bearer ${req.headers.authorization?.split(" ")[1]}`,
          "Content-Type": "application/json",
        },
      });

      res.status(200).json({
        data: response.data,
        status: response.status,
      });
    } catch (error: any) {
      res.status(error.response?.status || 500).json({
        error: error.response?.data || error.message,
      });
    }
  });

  backfillCreatedAt = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const result = await backfillCreatedAt();
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.BACKFILL_CREATED_AT,
      target: `Backfilled createdAt for ${result.migrated} student(s)`,
      target_model: "Student",
    });
    res.status(200).json({
      message: "Migration completed",
      data: result,
    });
  });

  updateStudentYears = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    let result: Awaited<ReturnType<typeof updateStudentYears>>;
    try {
      result = await updateStudentYears();
    } catch (error: unknown) {
      if (error instanceof StudentYearCooldownError) {
        return res.status(409).json({ message: error.message });
      }
      throw error;
    }
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.UPDATE_STUDENT_YEAR,
      target: `Updated year for ${result.updated} student(s), skipped ${result.skippedYear4} (year 4+)`,
      target_model: "Student",
    });
    res.status(200).json({
      message: "Student years updated",
      data: result,
    });
  });

  decrementStudentYears = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const result = await decrementStudentYears();
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.DECREMENT_STUDENT_YEAR,
      target: `Decremented year for ${result.updated} student(s), skipped ${result.skippedYear1} (year 1)`,
      target_model: "Student",
    });
    res.status(200).json({
      message: "Student years decremented",
      data: result,
    });
  });
}

export const devtoolsController = new DevToolsController();
