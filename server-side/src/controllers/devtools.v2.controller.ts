import { Request, Response } from "express";
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
  isChatbotEnabled,
  setChatbotEnabled,
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
  getNoetixDisabledAdmins,
  addNoetixDisabledAdmin,
  removeNoetixDisabledAdmin,
  getNoetixDisabledTools,
  addNoetixDisabledTool,
  removeNoetixDisabledTool,
  getNoetixToolRegistry,
  getNoetixMaxIterations,
  setNoetixMaxIterations,
} from "../services/devtools.service";
import {
  getNoetixUsageLogs,
  getNoetixUsageStats,
  deleteOldNoetixUsageLogs,
} from "../services/noetix-usage.service";
import { emailService } from "../services/email.service";
import { resendPendingEmails } from "../services/email.resend.service";
import { checkPromos } from "../custom_function/check_promo";
import { orderService } from "../services/order.service";
import { campus_type } from "../enums/campus.enums";
import { logService } from "../services/log.service";
import { logs_action } from "../enums/logs.enums";

const ALLOWED_CAMPUS = [campus_type.MAIN] as string[];

class DevToolsController {
  getEmailQueue = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { status, subtype, limit, skip } = req.query;
    const entries = await getEmailQueueEntries({
      status: status as string,
      subtype: subtype as string,
      limit: limit ? parseInt(limit as string) : 100,
      skip: skip ? parseInt(skip as string) : 0,
    });
    const total = await getEmailQueueCount({
      status: status as string,
      subtype: subtype as string,
    });
    res.status(200).json({ data: entries, total });
  });

  exportEmailQueueCsv = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { status, subtype } = req.query;
    const entries = await getEmailQueueEntries({
      status: status as string,
      subtype: subtype as string,
      limit: 10000,
      skip: 0,
    });

    const headers = ["id", "type", "subtype", "email", "status", "referenceCode", "retryCount", "timestamp"];
    const csvRows = [headers.join(",")];

    for (const entry of entries) {
      const row = headers.map((h) => {
        const val = (entry as any)[h];
        const str = val === undefined || val === null ? "" : String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      });
      csvRows.push(row.join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=email-queue-${new Date().toISOString().split("T")[0]}.csv`);
    const csvAdminName = String(req.admin?.name ?? "");
    await logService.create({
      admin: csvAdminName || String(req.userV2?.idNumber ?? "") || "Unknown Admin",
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
    await resendSingleEmail(id as string);
    await emailService.updateStatusById(id as string, "sent");
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.RESEND_EMAIL,
      target: String(id),
      target_model: "Order",
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
    const { role, campus } = req.query;

    const admins = await require("../models/admin.model").Admin.find({
      currentRefreshToken: { $exists: true, $ne: null },
    }).lean();

    const students = await require("../models/student.model").Student.find({
      currentRefreshToken: { $exists: true, $ne: null },
    }).lean();

    let adminList = admins.map((a: any) => ({
      id: a._id.toString(),
      name: a.name,
      idNumber: a.id_number,
      role: "admin",
      campus: a.campus,
      position: a.position,
    }));

    let studentList = students.map((s: any) => ({
      id: s._id.toString(),
      name: `${s.first_name} ${s.last_name}`,
      idNumber: s.id_number,
      role: "student",
      campus: s.campus,
    }));

    if (role === "admin") {
      adminList = adminList.filter((a: any) => !campus || a.campus === campus);
    } else if (role === "student") {
      studentList = studentList.filter((s: any) => !campus || s.campus === campus);
    } else {
      if (campus) {
        adminList = adminList.filter((a: any) => a.campus === campus);
        studentList = studentList.filter((s: any) => s.campus === campus);
      }
    }

    const sessions = [...adminList, ...studentList];

    res.status(200).json({ data: sessions });
  });

  clearExpiredSessions = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { Admin } = await import("../models/admin.model");
    const { Student } = await import("../models/student.model");
    const now = new Date();

    const adminResult = await Admin.updateMany(
      { currentRefreshToken: { $exists: true }, updatedAt: { $lt: now } },
      { $set: { currentRefreshToken: null } }
    );
    const studentResult = await Student.updateMany(
      { currentRefreshToken: { $exists: true }, updatedAt: { $lt: now } },
      { $set: { currentRefreshToken: null } }
    );
    const invalidatedCount =
      (adminResult.modifiedCount || 0) + (studentResult.modifiedCount || 0);

    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.CLEAR_EXPIRED_SESSIONS,
      target: `Cleared ${invalidatedCount} expired sessions`,
      target_model: "Admin",
    });

    res.status(200).json({ message: "Expired sessions cleared" });
  });

  invalidateSession = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { userId } = req.body;
    const { Admin } = await import("../models/admin.model");
    const { Student } = await import("../models/student.model");

    await Admin.findByIdAndUpdate(userId, { currentRefreshToken: null });
    await Student.findByIdAndUpdate(userId, { currentRefreshToken: null });

    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.INVALIDATE_SESSION,
      target: `Invalidated session for ${userId}`,
      target_model: "Admin",
    });

    res.status(200).json({ message: "Session invalidated" });
  });

  invalidateBulkSessions = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { userIds } = req.body;
    const { Admin } = await import("../models/admin.model");
    const { Student } = await import("../models/student.model");

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds is required" });
    }

    await Admin.updateMany(
      { _id: { $in: userIds } },
      { $set: { currentRefreshToken: null } }
    );
    await Student.updateMany(
      { _id: { $in: userIds } },
      { $set: { currentRefreshToken: null } }
    );

    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.INVALIDATE_SESSION_BULK,
      target: `Bulk invalidated ${userIds.length} sessions`,
      target_model: "Admin",
    });

    res.status(200).json({ message: `${userIds.length} session(s) invalidated` });
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
    const { jobName } = req.query;
    const logs = await getCronExecutionLogs(
      jobName as string | undefined,
      parseInt((req.query.limit as string) || "20")
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
    const { action, admin, target, dateFrom, dateTo, limit, skip } = req.query;
    const { entries, total } = await getLogEntries({
      action: action as string,
      admin: admin as string,
      target: target as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : 100,
      skip: skip ? parseInt(skip as string) : 0,
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
    const deletedCount = await deleteOldLogs(parseInt(days as string));
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: "DELETE_OLD_LOGS",
      target: `Deleted ${deletedCount} log entries older than ${days} days`,
      target_model: "Admin",
    });
    res.status(200).json({ message: `Deleted ${deletedCount} log entries`, deletedCount });
  });

  getOrders = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { query, status, limit, skip } = req.query;
    const { entries, total } = await searchOrders({
      query: query as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : 50,
      skip: skip ? parseInt(skip as string) : 0,
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
      limit: limit ? parseInt(String(limit)) : 1000,
      skip: skip ? parseInt(String(skip)) : 0,
    });

    const headers = docs.length > 0 ? Object.keys(docs[0]) : [];
    const csvRows = [headers.join(","), ...docs.map((doc: any) =>
      headers.map((h) => {
        const val = doc[h];
        const str = val === undefined || val === null ? "" : String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")
    )];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${collection.toLowerCase()}-export-${new Date().toISOString().split("T")[0]}.csv`);
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
    const alerts = await getStockAlerts(threshold ? parseInt(String(threshold)) : 5);
    res.status(200).json({ data: alerts });
  });

  getSystemSettings = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const settings = await getSystemSettings();
    res.status(200).json({ data: settings });
  });

  // Readable by any authenticated admin (any campus/access level) so the
  // floating chat button can decide whether to render. Toggling it is
  // restricted (see toggleChatbot).
  getChatbotEnabled = catchAsync(async (req: Request, res: Response) => {
    const enabled = await isChatbotEnabled();
    res.status(200).json({ enabled });
  });

  toggleChatbot = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { enabled } = req.body as { enabled?: boolean };
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "enabled must be a boolean" });
    }

    await setChatbotEnabled(enabled);

    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.TOGGLE_CHATBOT,
      target: `Chatbot ${enabled ? "enabled" : "disabled"}`,
      target_model: "Settings",
    });

    res.status(200).json({ enabled });
  });

  getRateLimitViolations = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { limit } = req.query;
    const violations = getRateLimitViolationsService(limit ? parseInt(String(limit)) : 50);
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
    const details = await getFailedEmailDetails(limit ? parseInt(String(limit)) : 100);
    res.status(200).json({ data: details });
  });

  bulkUpdateEmailStatus = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !status) {
      return res.status(400).json({ message: "ids (array) and status are required" });
    }
    const updated = await bulkUpdateEmailStatus(ids, status);
    res.status(200).json({ message: `Updated ${updated} email(s)`, updated });
  });

  getErrors = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { limit } = req.query;
    const errors = getErrors(limit ? parseInt(String(limit)) : 50);
    res.status(200).json({ data: errors });
  });

  clearErrors = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const count = clearErrors();
    res.status(200).json({ message: `Cleared ${count} error(s)`, cleared: count });
  });

  getBruteForceLogs = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { threshold, limit } = req.query;
    const logs = getBruteForceLogs(
      threshold ? parseInt(String(threshold)) : 5,
      limit ? parseInt(String(limit)) : 50
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
    const refunds = await getRefundQueue(limit ? parseInt(String(limit)) : 50);
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

    const allowedEndpoints: Record<string, "GET" | "POST"> = {
      "/api/v2/auth/login": "POST",
      "/api/v2/students": "GET",
      "/api/v2/orders": "GET",
      "/api/v2/events": "GET",
    };

    const normalizedMethod = method.toUpperCase() as "GET" | "POST";
    if (!allowedEndpoints[endpointPath] || allowedEndpoints[endpointPath] !== normalizedMethod) {
      return res.status(400).json({ message: "Endpoint/method not allowed for testing" });
    }

    const axios = (await import("axios")).default;
    const baseUrl = process.env.BASE_URL || "http://localhost:3001";

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
    const result = await updateStudentYears();
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.UPDATE_STUDENT_YEAR,
      target: `Updated year for ${result.updated} student(s), skipped ${result.skippedYear4} (year 4 or deleted)`,
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

  // Noetix AI Usage
  getNoetixUsageLogs = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { admin, success, toolName, dateFrom, dateTo, limit, skip } = req.query;
    const { entries, total } = await getNoetixUsageLogs({
      admin: admin as string | undefined,
      success: success as string | undefined,
      toolName: toolName as string | undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : 50,
      skip: skip ? parseInt(skip as string) : 0,
    });
    res.status(200).json({ data: entries, total });
  });

  getNoetixUsageStats = catchAsync(async (_req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(_req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const stats = await getNoetixUsageStats();
    res.status(200).json({ data: stats });
  });

  deleteOldNoetixUsageLogs = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { days } = req.query;
    if (!days) {
      return res.status(400).json({ message: "days parameter required" });
    }
    const deletedCount = await deleteOldNoetixUsageLogs(parseInt(days as string));
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: "Deleted Noetix usage logs",
      target: `Deleted ${deletedCount} noetix usage entries older than ${days} days`,
      target_model: "Settings",
    });
    res.status(200).json({ message: `Deleted ${deletedCount} noetix usage logs`, deletedCount });
  });

  getNoetixDisabledAdmins = catchAsync(async (_req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(_req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const admins = await getNoetixDisabledAdmins();
    res.status(200).json({ data: { noetixDisabledAdmins: admins } });
  });

  addNoetixDisabledAdmin = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { adminId } = req.body as { adminId?: string };
    if (!adminId) {
      return res.status(400).json({ message: "adminId is required" });
    }
    const admins = await addNoetixDisabledAdmin(adminId);
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: "Disabled Noetix Admin",
      target: adminId,
      target_model: "Admin",
    });
    res.status(200).json({ data: { noetixDisabledAdmins: admins } });
  });

  removeNoetixDisabledAdmin = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const adminId = typeof req.params.adminId === "string" ? req.params.adminId : undefined;
    if (!adminId) {
      return res.status(400).json({ message: "adminId is required" });
    }
    const admins = await removeNoetixDisabledAdmin(adminId);
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: "Re-enabled Noetix Admin",
      target: adminId,
      target_model: "Admin",
    });
    res.status(200).json({ data: { noetixDisabledAdmins: admins } });
  });

  getNoetixDisabledTools = catchAsync(async (_req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(_req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const tools = await getNoetixDisabledTools();
    res.status(200).json({ data: { noetixDisabledTools: tools } });
  });

  getNoetixToolRegistry = catchAsync(async (_req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(_req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const [disabledTools, registry] = await Promise.all([
      getNoetixDisabledTools(),
      getNoetixToolRegistry(),
    ]);
    const disabledSet = new Set(disabledTools);
    res.status(200).json({
      data: registry.map((t) => ({
        ...t,
        enabled: !disabledSet.has(t.name),
      })),
    });
  });

  addNoetixDisabledTool = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { toolName } = req.body as { toolName?: string };
    if (!toolName) {
      return res.status(400).json({ message: "toolName is required" });
    }
    const tools = await addNoetixDisabledTool(toolName);
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: "Disabled Noetix Tool",
      target: toolName,
      target_model: "Settings",
    });
    res.status(200).json({ data: { noetixDisabledTools: tools } });
  });

  removeNoetixDisabledTool = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const toolName = typeof req.params.toolName === "string" ? req.params.toolName : undefined;
    if (!toolName) {
      return res.status(400).json({ message: "toolName is required" });
    }
    const tools = await removeNoetixDisabledTool(toolName);
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: "Enabled Noetix Tool",
      target: toolName,
      target_model: "Settings",
    });
    res.status(200).json({ data: { noetixDisabledTools: tools } });
  });

  getNoetixMaxIterations = catchAsync(async (_req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(_req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const value = await getNoetixMaxIterations();
    res.status(200).json({ data: { noetixMaxIterations: value } });
  });

  setNoetixMaxIterations = catchAsync(async (req: Request, res: Response) => {
    if (!ALLOWED_CAMPUS.includes(req.userV2.campus)) {
      return res.status(403).json({ message: "Campus not authorized" });
    }
    const { value } = req.body as { value?: unknown };
    if (value === undefined || value === null) {
      return res.status(400).json({ message: "value is required" });
    }
    const parsed = parseInt(String(value), 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50) {
      return res.status(400).json({ message: "value must be between 1 and 50" });
    }
    const updated = await setNoetixMaxIterations(parsed);
    await logService.create({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: "Updated Noetix Max Iterations",
      target: String(updated),
      target_model: "Settings",
    });
    res.status(200).json({ data: { noetixMaxIterations: updated } });
  });
}

export const devtoolsController = new DevToolsController();
