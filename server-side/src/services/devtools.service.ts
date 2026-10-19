import { EmailQueue } from "../models/email.model";
import { Orders } from "../models/orders.model";
import { MembershipHistory } from "../models/history.model";
import { Admin } from "../models/admin.model";
import { Student } from "../models/student.model";
import { Merch } from "../models/merch.model";
import { Event } from "../models/event.model";
import { Settings } from "../models/settings.model";
import path from "path";
import fs from "fs/promises";
import os from "os";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import { emailService } from "./email.service";
import {
  renderMembershipReceiptHtml,
  renderOrderReceiptHtml,
} from "./receipt.service";
import { account_status, active_status_values } from "../enums/status.enums";

export const getEmailQueueEntries = async ({
  status,
  subtype,
  limit = 100,
  skip = 0,
}: {
  status?: string;
  subtype?: string;
  limit?: number;
  skip?: number;
} = {}) => {
  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (subtype) query.subtype = subtype;

  return await EmailQueue.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);
};

export const getEmailQueueCount = async ({
  status,
  subtype,
}: {
  status?: string;
  subtype?: string;
} = {}) => {
  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (subtype) query.subtype = subtype;

  return await EmailQueue.countDocuments(query);
};

export const resendSingleEmail = async (id: string) => {
  const entry = await EmailQueue.findById(id);
  if (!entry) throw new Error("Email queue entry not found");
  if (entry.status === "sent") throw new Error("Email has already been sent");

  if (entry.type !== "receipt" && entry.type !== "automation-report") {
    throw new Error("Only receipt and automation report emails can be resent");
  }

  if (entry.type === "automation-report") {
    let payload: unknown;
    try {
      payload = JSON.parse(entry.payload || "{}");
    } catch {
      throw new Error("Invalid automation report payload");
    }

    const { sendAutomationWebhookPayload } =
      await import("./automation.service");
    await sendAutomationWebhookPayload(
      payload as Parameters<typeof sendAutomationWebhookPayload>[0]
    );
    await emailService.updateStatusById(String(entry._id), "sent");
    return { success: true, type: entry.type, subtype: entry.subtype };
  }

  if (!entry.subtype) {
    throw new Error("Entry has no subtype");
  }

  let html: string;
  let subject: string;

  if (entry.subtype === "membership") {
    html = await renderMembershipReceiptHtml(String(entry.referenceCode));
    subject = "Your Receipt from PSITS - UC Main";
  } else if (entry.subtype === "order") {
    html = await renderOrderReceiptHtml(String(entry.referenceCode));
    subject = "Your Order Receipt from PSITS - UC Main";
  } else {
    throw new Error(`Unknown subtype: ${entry.subtype}`);
  }

  const logoPath = path.join(__dirname, "../assets/psits.jpg");
  const logoBuffer = await fs.readFile(logoPath);

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL;

  if (!from) throw new Error("EMAIL is not configured");

  const { error } = await resend.emails.send({
    from,
    to: String(entry.email),
    subject,
    html,
    attachments: [
      {
        filename: "psits.jpg",
        content: logoBuffer,
        contentType: "image/jpeg",
        contentId: "logo",
      },
    ],
  });

  if (error) {
    throw new Error(error.message);
  }

  await emailService.updateStatusById(String(entry._id), "sent");

  return { success: true, type: entry.type, subtype: entry.subtype };
};

export const getHealthStats = async () => {
  const uptimeSeconds = Math.floor(process.uptime());
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptime = `${days}d ${hours}h ${minutes}m`;

  const memUsed = process.memoryUsage().rss;
  const memTotal = os.totalmem();
  const memUsedMB = Math.round(memUsed / 1024 / 1024);
  const memTotalMB = Math.round(memTotal / 1024 / 1024);

  const emailConfigured = !!(process.env.EMAIL && process.env.RESEND_API_KEY);

  return {
    uptime,
    memory: { used: memUsedMB, total: memTotalMB },
    emailConfigured,
  };
};

export const getDatabaseCounts = async () => {
  const [students, orders, merch, events, membershipHistory] =
    await Promise.all([
      Student.countDocuments(),
      Orders.countDocuments({ order_status: "Pending" }),
      Merch.countDocuments({ is_active: true }),
      // Event status casing varies between records.
      Event.countDocuments({ status: { $not: /^(ended|cancelled)$/i } }),
      MembershipHistory.countDocuments(),
    ]);

  return {
    students,
    pendingOrders: orders,
    merchItems: merch,
    activeEvents: events,
    memberships: membershipHistory,
  };
};

export const checkMongoConnection = async (): Promise<boolean> => {
  try {
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
};

const cronExecutionLogCache: { data: any[]; timestamp: number } | null = null;

// Refresh tokens are stored as the raw JWT, so expiry comes from its `exp`
// claim. A token that can't be decoded is treated as expired.
export const isRefreshTokenExpired = (token: string): boolean => {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string" || !decoded.exp) return true;
  return decoded.exp * 1000 <= Date.now();
};

export const clearExpiredSessions = async (): Promise<number> => {
  const [admins, students] = await Promise.all([
    Admin.find(
      { currentRefreshToken: { $exists: true, $ne: null } },
      { currentRefreshToken: 1 }
    ).lean(),
    Student.find(
      { currentRefreshToken: { $exists: true, $ne: null } },
      { currentRefreshToken: 1 }
    ).lean(),
  ]);

  const expiredIds = (docs: Array<{ _id: Types.ObjectId; currentRefreshToken?: string | null }>) =>
    docs
      .filter((d) => isRefreshTokenExpired(String(d.currentRefreshToken)))
      .map((d) => d._id);

  const [adminResult, studentResult] = await Promise.all([
    Admin.updateMany(
      { _id: { $in: expiredIds(admins) } },
      { $set: { currentRefreshToken: null } }
    ),
    Student.updateMany(
      { _id: { $in: expiredIds(students) } },
      { $set: { currentRefreshToken: null } }
    ),
  ]);

  return (adminResult.modifiedCount || 0) + (studentResult.modifiedCount || 0);
};

export const getCronExecutionLogs = async (jobName?: string, limit = 20) => {
  const { CronExecutionLog } = await import("../models/cronExecutionLog.model");
  const query: Record<string, unknown> = {};
  if (jobName) query.jobName = jobName;

  return await CronExecutionLog.find(query)
    .sort({ startedAt: -1 })
    .limit(limit)
    .lean();
};

export const logCronExecution = async (data: {
  jobName: string;
  scheduledAt: Date;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) => {
  const { CronExecutionLog } = await import("../models/cronExecutionLog.model");
  await new CronExecutionLog({
    ...data,
    createdAt: new Date(),
  }).save();
};

export const getEnvStatus = () => {
  const vars: Array<{ key: string; required: boolean }> = [
    { key: "EMAIL", required: true },
    { key: "RESEND_API_KEY", required: true },
    { key: "MAKE_AUTOMATION_WEBHOOK_URL", required: false },
    { key: "MAKE_AUTOMATION_WEBHOOK_API_KEY", required: false },
    { key: "BASE_URL", required: false },
    { key: "MONGODB_URI", required: true },
    { key: "R2_BUCKET_NAME", required: false },
    { key: "R2_ACCOUNT_ID", required: false },
    { key: "AWS_BUCKET_NAME", required: false },
    { key: "AWS_REGION", required: false },
  ];

  return vars.map((v) => ({
    key: v.key,
    configured: Boolean(process.env[v.key]),
    required: v.required,
  }));
};

const rateLimitBlockedCounters: { count: number; day: string } = {
  count: 0,
  day: "",
};

const rateLimitViolations: Array<{
  ip: string;
  path: string;
  timestamp: Date;
}> = [];
const MAX_VIOLATION_LOGS = 1000;

export const getRateLimitStats = () => {
  const today = new Date().toISOString().split("T")[0];
  if (rateLimitBlockedCounters.day !== today) {
    rateLimitBlockedCounters.count = 0;
    rateLimitBlockedCounters.day = today;
  }

  return {
    windowMs: 15 * 60 * 1000,
    maxRequests: process.env.NODE_ENV !== "production" ? 100 : 20,
    blockedToday: rateLimitBlockedCounters.count,
  };
};

export const incrementRateLimitBlocked = () => {
  const today = new Date().toISOString().split("T")[0];
  if (rateLimitBlockedCounters.day !== today) {
    rateLimitBlockedCounters.count = 0;
    rateLimitBlockedCounters.day = today;
  }
  rateLimitBlockedCounters.count++;
};

export interface RateLimitViolation {
  ip: string;
  path: string;
  timestamp: string;
}

export const getRateLimitViolations = (limit = 50): RateLimitViolation[] => {
  return rateLimitViolations
    .slice(-limit)
    .map((v) => ({ ...v, timestamp: v.timestamp.toISOString() }));
};

export const logRateLimitViolation = (ip: string, path: string) => {
  rateLimitViolations.push({ ip, path, timestamp: new Date() });
  if (rateLimitViolations.length > MAX_VIOLATION_LOGS) {
    rateLimitViolations.shift();
  }
};

interface CollectionStat {
  name: string;
  docs: number;
  avgObjSize: number;
  storageSize: number;
  indexes: number;
  warning?: string;
}

let dbPerfCacheData: CollectionStat[] | null = null;
let dbPerfCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Keyed by collection name ("orders"), which is what listCollections returns,
// not by model name ("Orders").
const collectionIndexMap: Record<string, string[]> = {
  [Orders.collection.collectionName]: ["order_status", "order_date"],
  [EmailQueue.collection.collectionName]: ["status", "type"],
  [Merch.collection.collectionName]: ["is_active"],
  [Admin.collection.collectionName]: ["currentRefreshToken"],
  [Student.collection.collectionName]: ["currentRefreshToken"],
};

export const getCollectionStats = async (): Promise<CollectionStat[]> => {
  if (dbPerfCacheData && Date.now() - dbPerfCacheTime < CACHE_TTL_MS) {
    return dbPerfCacheData;
  }

  const db = mongoose.connection.db;
  if (!db) return [];

  const collections = await db.listCollections().toArray();
  const stats: CollectionStat[] = [];

  for (const coll of collections) {
    const name = coll.name;
    if (name.startsWith("system.")) continue;

    try {
      // Count through the driver, not mongoose.model(name): models are
      // registered under model names ("Student"), not collection names
      // ("students"), so every lookup here threw and was swallowed below —
      // leaving this function permanently returning an empty list.
      const docCount = await db.collection(name).countDocuments();

      let info: any;
      try {
        info = await (db as any).collection(name).stats();
      } catch {
        info = { avgObjSize: 0, storageSize: 0 };
      }

      const expectedIndexes = collectionIndexMap[name] || [];
      let warning: string | undefined;
      let indexCount = 0;

      try {
        const indexes = await db.collection(name).indexes();
        indexCount = indexes.length;
        const indexedFields = indexes.flatMap((idx) => Object.keys(idx.key));
        const missing = expectedIndexes.filter(
          (f) => !indexedFields.includes(f)
        );
        if (missing.length > 0) {
          warning = `Missing indexes on: ${missing.join(", ")}`;
        }
      } catch {
        // Skip index check if unavailable
      }

      stats.push({
        name,
        docs: docCount,
        avgObjSize: Math.round(info.avgObjSize || 0),
        storageSize: Math.round((info.storageSize || 0) / 1024),
        indexes: indexCount,
        warning,
      });
    } catch {
      // Skip collections that can't be accessed
    }
  }

  dbPerfCacheData = stats;
  dbPerfCacheTime = Date.now();

  return dbPerfCacheData;
};

export const rebuildIndexes = async (): Promise<{
  message: string;
  collections: string[];
}> => {
  // reIndex() is not supported on replica sets (Atlas) and was removed from the
  // driver, so this builds any schema index that is missing instead. It never
  // drops an index.
  const models = [Orders, EmailQueue, Merch, Admin, Student];
  const rebuilt: string[] = [];
  const failed: string[] = [];

  for (const model of models) {
    try {
      await model.createIndexes();
      rebuilt.push(model.collection.collectionName);
    } catch (error: unknown) {
      console.error(`Failed to build indexes for ${model.modelName}:`, error);
      failed.push(model.collection.collectionName);
    }
  }

  dbPerfCacheTime = 0;
  dbPerfCacheData = null;

  const failedNote =
    failed.length > 0 ? `; failed on ${failed.join(", ")}` : "";
  return {
    message: `Ensured indexes on ${rebuilt.length} collection(s)${failedNote}`,
    collections: rebuilt,
  };
};

export interface LogEntry {
  _id: string;
  timestamp: Date;
  admin: string;
  admin_id?: string;
  action: string;
  target?: string;
  target_id?: string;
  target_model?: string;
}

export interface LogQueryParams {
  action?: string;
  admin?: string;
  target?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  skip?: number;
}

const escapeRegex = (text: string): string =>
  text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

export const getLogEntries = async ({
  action,
  admin,
  target,
  search,
  dateFrom,
  dateTo,
  limit = 100,
  skip = 0,
}: LogQueryParams = {}) => {
  const { Log } = await import("../models/log.model");
  const query: Record<string, unknown> = {};
  // Filters are matched as plain text: "(" or "a+" from the search box must not
  // be read as a regex (it 500s or runs a slow pattern).
  const contains = (text: string) => ({
    $regex: escapeRegex(text),
    $options: "i",
  });

  if (action) query.action = contains(action);
  if (admin) query.admin = contains(admin);
  if (target) query.target = contains(target);
  if (search) {
    query.$or = [{ admin: contains(search) }, { target: contains(search) }];
  }
  if (dateFrom || dateTo) {
    const timestampQuery: Record<string, Date> = {};
    if (dateFrom) timestampQuery.$gte = dateFrom;
    if (dateTo) timestampQuery.$lte = dateTo;
    query.timestamp = timestampQuery;
  }

  const [entries, total] = await Promise.all([
    Log.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    Log.countDocuments(query),
  ]);

  return { entries, total };
};

export const deleteOldLogs = async (days: number): Promise<number> => {
  const { Log } = await import("../models/log.model");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await Log.deleteMany({
    timestamp: { $lt: cutoffDate },
  });

  return result.deletedCount || 0;
};

export interface OrderDetail {
  _id: string;
  reference_code: string;
  student_name: string;
  id_number: string;
  course: string;
  year: number;
  campus: string;
  order_status: string;
  transaction_date?: Date;
  order_date: Date;
  total: number;
  items: Array<{
    product_id: string;
    product_name: string;
    batch: string | number;
    sizes: string[];
    variation: string[];
    quantity: number;
    sub_total: number;
  }>;
  admin?: string;
  rfid?: string;
}

export interface OrderSearchParams {
  query?: string;
  status?: string;
  limit?: number;
  skip?: number;
}

export const searchOrders = async ({
  query,
  status,
  limit = 50,
  skip = 0,
}: OrderSearchParams = {}) => {
  const { Orders } = await import("../models/orders.model");
  const { orderService } = await import("./order.service");

  if (status) {
    const result = await orderService.getAllOrdersDynamicStatus({
      query: { search: query || "", page: 1, limit },
      status,
    });
    return { entries: result.data, total: result.total };
  }

  const searchQuery = orderService.buildOrderSearchQuery(query || "");
  const [entries, total] = await Promise.all([
    Orders.find(searchQuery)
      .sort({ order_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Orders.countDocuments(searchQuery),
  ]);

  return { entries, total };
};

export const getOrderDetails = async (
  id: string
): Promise<OrderDetail | null> => {
  const { Orders } = await import("../models/orders.model");
  const order = await Orders.findById(id).lean();
  return order as OrderDetail | null;
};

export interface CertificateTemplate {
  _id: string;
  name: string;
  description?: string;
  ejsRelativePath: string;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getCertificateTemplates = async (): Promise<
  CertificateTemplate[]
> => {
  const { CertificateTemplate: CertModel } =
    await import("../models/certificateTemplate.model");
  const templates = await CertModel.find().sort({ createdAt: -1 }).lean();
  return templates.map((t: any) => ({
    _id: t._id.toString(),
    name: t.name,
    description: t.description,
    ejsRelativePath: t.ejsRelativePath,
    isActive: t.isActive,
    createdBy: t.createdBy,
    createdAt: t.createdAt?.toISOString(),
    updatedAt: t.updatedAt?.toISOString(),
  }));
};

export interface RevenueEntry {
  month: string;
  year: number;
  total: number;
  count: number;
}

export const getMembershipRevenue = async (): Promise<RevenueEntry[]> => {
  const { MembershipHistory } = await import("../models/history.model");
  const result = await MembershipHistory.aggregate([
    // Some legacy history rows store `date` as a string, which makes $year/$month
    // abort the whole aggregation. Skip anything that isn't a real date.
    { $match: { date: { $type: "date" } } },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
        },
        total: { $sum: "$total" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        year: "$_id.year",
        month: "$_id.month",
        total: { $round: ["$total", 2] },
        count: 1,
        _id: 0,
      },
    },
    { $sort: { year: -1, month: -1 } },
  ]);
  return result.map((r: any) => ({
    month: r.month,
    year: r.year,
    total: r.total,
    count: r.count,
  }));
};

export interface StockAlert {
  _id: string;
  name: string;
  stocks: number;
  price: number;
  is_active: boolean;
  category: string;
  warning: string;
}

export const getStockAlerts = async (threshold = 5): Promise<StockAlert[]> => {
  const { Merch } = await import("../models/merch.model");
  const items = await Merch.find({
    stocks: { $lte: threshold },
    is_active: true,
  }).lean();
  return items.map((item: any) => ({
    _id: item._id.toString(),
    name: item.name,
    stocks: item.stocks,
    price: item.price,
    is_active: item.is_active,
    category: item.category,
    warning: item.stocks === 0 ? "Out of stock" : "Low stock",
  }));
};

export interface SystemSettings {
  membership_price: number;
}

export const getSystemSettings = async (): Promise<SystemSettings | null> => {
  const { Settings } = await import("../models/settings.model");
  const settings = await Settings.findOne().lean();
  return settings as SystemSettings | null;
};

export interface ExportCollectionParams {
  collection: string;
  fields?: string[];
  limit?: number;
  skip?: number;
}

// Password hashes, refresh tokens (stored as the raw JWT) and reset/OTP
// values must never leave the database through an export.
const SENSITIVE_EXPORT_KEY_PATTERN = /password|token|otp|reset/i;

const isSensitiveExportKey = (key: string): boolean =>
  SENSITIVE_EXPORT_KEY_PATTERN.test(key);

export const exportCollection = async ({
  collection,
  fields,
  limit = 1000,
  skip = 0,
}: ExportCollectionParams) => {
  // Export labels shown in Devtools mapped to the names the models are
  // registered under ("merch", "event", "membershipHistory" are lowercase).
  const exportModelNames: Record<string, string> = {
    Admin: Admin.modelName,
    Student: Student.modelName,
    Orders: Orders.modelName,
    EmailQueue: EmailQueue.modelName,
    Merch: Merch.modelName,
    Event: Event.modelName,
    MembershipHistory: MembershipHistory.modelName,
    CertificateTemplate: "CertificateTemplate",
    Log: "Log",
    Settings: Settings.modelName,
  };

  const modelName = exportModelNames[collection];
  if (!modelName) {
    throw new Error(`Invalid collection: ${collection}`);
  }

  const Model = mongoose.model(modelName);
  const docs = await Model.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Requested fields are filtered through the same sensitive-key check as the
  // default export, so `fields=password` cannot pull secrets out either.
  const allowedFields = fields?.filter((field) => !isSensitiveExportKey(field));

  if (allowedFields && allowedFields.length > 0) {
    return docs.map((doc: any) => {
      const filtered: Record<string, any> = {};
      allowedFields.forEach((field) => {
        if (doc[field] !== undefined) {
          filtered[field] = doc[field];
        }
      });
      return filtered;
    });
  }

  return docs.map((doc: any) => {
    const filtered: Record<string, any> = {};
    Object.keys(doc).forEach((key) => {
      if (key !== "__v" && key !== "_id" && !isSensitiveExportKey(key)) {
        filtered[key] = doc[key];
      }
    });
    return filtered;
  });
};

export interface ServerError {
  message: string;
  stack?: string;
  path: string;
  method: string;
  ip: string;
  timestamp: string;
}

const errorLog: ServerError[] = [];
const MAX_ERROR_LOG = 200;

export const logServerError = (err: any, req: any) => {
  errorLog.push({
    message: err.message || "Internal Server Error",
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip || "unknown",
    timestamp: new Date().toISOString(),
  });
  if (errorLog.length > MAX_ERROR_LOG) {
    errorLog.shift();
  }
};

export const getErrors = (limit = 50): ServerError[] => {
  return errorLog.slice(-limit).reverse();
};

export const clearErrors = (): number => {
  const count = errorLog.length;
  errorLog.length = 0;
  return count;
};

export interface BruteForceLog {
  ip: string;
  count: number;
  lastAttempt: string;
  attempts: Array<{ timestamp: string }>;
}

const failedAuthAttempts: Map<
  string,
  { count: number; lastAttempt: Date; attempts: Date[] }
> = new Map();

export const incrementFailedAuthAttempt = (ip: string) => {
  const existing = failedAuthAttempts.get(ip) || {
    count: 0,
    lastAttempt: new Date(),
    attempts: [],
  };
  existing.count++;
  existing.lastAttempt = new Date();
  existing.attempts.push(new Date());
  if (existing.attempts.length > 100) {
    existing.attempts = existing.attempts.slice(-100);
  }
  failedAuthAttempts.set(ip, existing);
};

export const getBruteForceLogs = (
  threshold = 5,
  limit = 50
): BruteForceLog[] => {
  const result: BruteForceLog[] = [];
  for (const [ip, data] of failedAuthAttempts.entries()) {
    if (data.count >= threshold) {
      result.push({
        ip,
        count: data.count,
        lastAttempt: data.lastAttempt.toISOString(),
        attempts: data.attempts.map((t) => ({ timestamp: t.toISOString() })),
      });
    }
  }
  return result.sort((a, b) => b.count - a.count).slice(0, limit);
};

export interface EndpointInfo {
  method: string;
  path: string;
  auth: string;
  description?: string;
}

export const getEndpointInventory = (): EndpointInfo[] => {
  const endpoints: EndpointInfo[] = [];
  const addRoute = (method: string, path: string, auth: string) => {
    endpoints.push({ method: method.toUpperCase(), path, auth });
  };
  // Mirrors routes/devtools.v2.route.ts — update both together.
  addRoute("get", "/api/v2/dev/email-queue", "admin+MAIN");
  addRoute("post", "/api/v2/dev/email-resend/:id", "admin+MAIN");
  addRoute("get", "/api/v2/dev/email-export", "admin+MAIN");
  addRoute("get", "/api/v2/dev/health", "admin+MAIN");
  addRoute("get", "/api/v2/dev/sessions", "admin+MAIN");
  addRoute("delete", "/api/v2/dev/sessions/expired", "admin+MAIN");
  addRoute("post", "/api/v2/dev/sessions/invalidate", "admin+MAIN");
  addRoute("post", "/api/v2/dev/sessions/invalidate-bulk", "admin+MAIN");
  addRoute("post", "/api/v2/dev/actions/cron", "admin+MAIN");
  addRoute("get", "/api/v2/dev/expired-orders", "admin+MAIN");
  addRoute("post", "/api/v2/dev/actions/cancel-expired", "admin+MAIN");
  addRoute("post", "/api/v2/dev/test-endpoint", "admin+MAIN");
  addRoute("get", "/api/v2/dev/cron-status", "admin+MAIN");
  addRoute("get", "/api/v2/dev/env-status", "admin+MAIN");
  addRoute("get", "/api/v2/dev/rate-limit-stats", "admin+MAIN");
  addRoute("get", "/api/v2/dev/db-performance", "admin+MAIN");
  addRoute("post", "/api/v2/dev/db/rebuild-indexes", "admin+MAIN");
  addRoute("get", "/api/v2/dev/logs", "admin+MAIN");
  addRoute("delete", "/api/v2/dev/logs/old", "admin+MAIN");
  addRoute("get", "/api/v2/dev/orders", "admin+MAIN");
  addRoute("get", "/api/v2/dev/orders/:id", "admin+MAIN");
  addRoute("get", "/api/v2/dev/certificates", "admin+MAIN");
  addRoute("get", "/api/v2/dev/export", "admin+MAIN");
  addRoute("get", "/api/v2/dev/membership-revenue", "admin+MAIN");
  addRoute("get", "/api/v2/dev/stock-alerts", "admin+MAIN");
  addRoute("get", "/api/v2/dev/settings", "admin+MAIN");
  addRoute("get", "/api/v2/dev/rate-limit-violations", "admin+MAIN");
  addRoute("get", "/api/v2/dev/email-queue/stats", "admin+MAIN");
  addRoute("get", "/api/v2/dev/email-queue/failed", "admin+MAIN");
  addRoute("patch", "/api/v2/dev/email-queue/bulk-status", "admin+MAIN");
  addRoute("get", "/api/v2/dev/errors", "admin+MAIN");
  addRoute("delete", "/api/v2/dev/errors", "admin+MAIN");
  addRoute("get", "/api/v2/dev/brute-force-logs", "admin+MAIN");
  addRoute("get", "/api/v2/dev/endpoint-inventory", "admin+MAIN");
  addRoute("get", "/api/v2/dev/refunds", "admin+MAIN");
  addRoute("post", "/api/v2/dev/migration/backfill-created-at", "admin-only+MAIN");
  addRoute("post", "/api/v2/dev/actions/update-student-years", "admin-only+MAIN");
  addRoute("post", "/api/v2/dev/actions/decrement-student-years", "admin-only+MAIN");
  return endpoints;
};

export interface RefundEntry {
  _id: string;
  refund_id: string;
  order_reference: string;
  product_name: string;
  refund_price: number;
  refund_admin: string;
  refund_date: string;
}

export const getRefundQueue = async (limit = 50): Promise<RefundEntry[]> => {
  const { Refund } = await import("../models/refund.model");
  const refunds = await Refund.find()
    .sort({ refund_date: -1 })
    .limit(limit)
    .lean();
  return refunds.map((r: any) => ({
    _id: r._id.toString(),
    refund_id: r.refund_id,
    order_reference: r.order_reference,
    product_name: r.product_name,
    refund_price: r.refund_price,
    refund_admin: r.refund_admin,
    refund_date: r.refund_date?.toISOString() || new Date().toISOString(),
  }));
};

export interface EmailQueueStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  pendingHighRetry: number;
}

export const getEmailQueueStats = async (): Promise<EmailQueueStats> => {
  const { EmailQueue } = await import("../models/email.model");
  const [total, pending, sent, failed] = await Promise.all([
    EmailQueue.countDocuments(),
    EmailQueue.countDocuments({ status: "pending" }),
    EmailQueue.countDocuments({ status: "sent" }),
    EmailQueue.countDocuments({ status: "failed" }),
  ]);
  const pendingHighRetry = await EmailQueue.countDocuments({
    status: "pending",
    retryCount: { $gte: 3 },
  });
  return { total, pending, sent, failed, pendingHighRetry };
};

export interface FailedEmailDetail {
  _id: string;
  email: string;
  type: string;
  subtype?: string;
  referenceCode?: string;
  retryCount: number;
  timestamp: string;
  daysPending?: number;
  canResend: boolean;
}

export const getFailedEmailDetails = async (
  limit = 100
): Promise<FailedEmailDetail[]> => {
  const { EmailQueue } = await import("../models/email.model");
  const entries = await EmailQueue.find({ status: "failed" })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
  const now = new Date();
  return entries.map((e: any) => {
    const timestamp = new Date(e.timestamp);
    const daysPending = Math.floor(
      (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      _id: e._id.toString(),
      email: e.email,
      type: e.type,
      subtype: e.subtype,
      referenceCode: e.referenceCode,
      retryCount: e.retryCount,
      timestamp: e.timestamp.toISOString(),
      daysPending,
      canResend: e.retryCount < 3,
    };
  });
};

export const EMAIL_QUEUE_STATUSES = [
  "pending",
  "sent",
  "failed",
  "delivered",
] as const;

export const bulkUpdateEmailStatus = async (
  ids: string[],
  status: (typeof EMAIL_QUEUE_STATUSES)[number]
): Promise<number> => {
  const { EmailQueue } = await import("../models/email.model");
  const result = await EmailQueue.updateMany(
    { _id: { $in: ids } },
    { $set: { status } }
  );
  return result.modifiedCount || 0;
};

export const backfillCreatedAt = async (): Promise<{
  migrated: number;
  skipped: number;
}> => {
  const students = await Student.find({ createdAt: { $exists: false } }).lean();
  if (students.length === 0) {
    return { migrated: 0, skipped: 0 };
  }

  const operations = students.map((s) => ({
    updateOne: {
      filter: { _id: s._id },
      update: {
        $set: { createdAt: new mongoose.Types.ObjectId(s._id).getTimestamp() },
      },
    },
  }));

  await Student.bulkWrite(operations);

  const existing = await Settings.find();
  if (existing.length === 0) {
    await new Settings({ studentCreatedAtBackfilled: true }).save();
  } else {
    await Settings.updateOne(
      {},
      { $set: { studentCreatedAtBackfilled: true } }
    );
  }

  return { migrated: students.length, skipped: 0 };
};

export class StudentYearCooldownError extends Error {
  constructor(public readonly availableAt: Date) {
    super(
      `Student years were already updated. Next update is available on ${availableAt.toDateString()}.`
    );
    this.name = "StudentYearCooldownError";
  }
}

export const updateStudentYears = async (): Promise<{
  totalChecked: number;
  eligible: number;
  updated: number;
  skippedYear4: number;
}> => {
  // Same 5-month cooldown the Devtools button shows, enforced here so a second
  // tab or a direct API call can't add another year to every student.
  const settings = await Settings.findOne().lean();
  if (settings?.studentYearLastUpdated) {
    const cooldownEnds = new Date(settings.studentYearLastUpdated);
    cooldownEnds.setMonth(cooldownEnds.getMonth() + 5);
    if (cooldownEnds > new Date()) {
      throw new StudentYearCooldownError(cooldownEnds);
    }
  }

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 3);

  const students = await Student.find({
    year: { $lt: 4 },
    createdAt: { $lt: cutoffDate },
    status: { $ne: account_status.DELETED },
  }).lean();

  const eligibleIds = students.map((s) => s._id);
  const result = await Student.updateMany(
    { _id: { $in: eligibleIds } },
    { $inc: { year: 1 } }
  );

  const existing = await Settings.find();
  if (existing.length === 0) {
    await new Settings({ studentYearLastUpdated: new Date() }).save();
  } else {
    await Settings.updateOne(
      {},
      { $set: { studentYearLastUpdated: new Date() } }
    );
  }

  // The query above already excludes year 4+, so count those separately.
  const skippedYear4 = await Student.countDocuments({
    year: { $gte: 4 },
    status: { $ne: account_status.DELETED },
  });

  return {
    totalChecked: students.length + skippedYear4,
    eligible: eligibleIds.length,
    updated: result.modifiedCount,
    skippedYear4,
  };
};

export const decrementStudentYears = async (): Promise<{
  totalChecked: number;
  eligible: number;
  updated: number;
  skippedYear1: number;
}> => {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 3);

  const students = await Student.find({
    year: { $gt: 1 },
    createdAt: { $lt: cutoffDate },
    status: { $ne: account_status.DELETED },
  }).lean();

  const eligibleIds = students.map((s) => s._id);
  const result = await Student.updateMany(
    { _id: { $in: eligibleIds } },
    { $inc: { year: -1 } }
  );

  // The query above already excludes year 1, so count those separately.
  const skippedYear1 = await Student.countDocuments({
    year: { $lte: 1 },
    status: { $ne: account_status.DELETED },
  });

  return {
    totalChecked: students.length + skippedYear1,
    eligible: eligibleIds.length,
    updated: result.modifiedCount,
    skippedYear1,
  };
};

export const suspendOldStudents = async (): Promise<{
  totalChecked: number;
  suspended: number;
}> => {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const threeYearsAgo = new Date(now);
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const fourYearsAgo = new Date(now);
  fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
  const fiveYearsAgo = new Date(now);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const activeStatuses = active_status_values;

  const students = await Student.find({
    status: { $in: activeStatuses },
    $or: [
      { createdAt: { $lte: fiveYearsAgo } },
      { year: { $gte: 4 }, createdAt: { $lte: twoYearsAgo } },
      { year: { $gte: 3 }, createdAt: { $lte: threeYearsAgo } },
      { year: { $gte: 2 }, createdAt: { $lte: fourYearsAgo } },
    ],
  }).lean();

  const eligibleIds = students.map((s) => s._id);
  const result = await Student.updateMany(
    { _id: { $in: eligibleIds }, status: { $in: activeStatuses } },
    { $set: { status: account_status.SUSPENDED } }
  );

  return {
    totalChecked: students.length,
    suspended: result.modifiedCount,
  };
};
