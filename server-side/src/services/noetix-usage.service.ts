import { NoetixUsageLog } from "../models/noetixUsageLog.model";
import mongoose from "mongoose";

export interface NoetixUsageLogEntry {
  _id: string;
  session_id: string;
  admin: string;
  admin_id: string;
  goal: string;
  tool_names: string[];
  success: boolean;
  error?: string;
  iterations: number;
  mode: "agent" | "goal";
  timestamp: Date;
}

export interface NoetixUsageStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalIterations: number;
  avgIterations: number;
  topTools: Array<{ name: string; count: number }>;
  byAdmin: Array<{ admin: string; count: number }>;
  todayCalls: number;
  yesterdayCalls: number;
}

export interface NoetixUsageQueryParams {
  admin?: string;
  success?: string;
  toolName?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  skip?: number;
}

export const createNoetixUsageLog = async (
  params: Omit<
    NoetixUsageLogEntry,
    "_id" | "timestamp"
  > & { timestamp?: Date }
): Promise<NoetixUsageLogEntry> => {
  const log = new NoetixUsageLog({
    ...params,
    admin_id: new mongoose.Types.ObjectId(params.admin_id),
    timestamp: params.timestamp || new Date(),
  });
  await log.save();
  return {
    ...log.toJSON(),
    _id: log._id.toString(),
    admin_id: log.admin_id.toString(),
    timestamp: log.timestamp,
  };
};

export const getNoetixUsageLogs = async (
  params: NoetixUsageQueryParams
): Promise<{ entries: NoetixUsageLogEntry[]; total: number }> => {
  const query: Record<string, unknown> = {};

  if (params.admin) {
    query.admin = { $regex: params.admin, $options: "i" };
  }
  if (params.success !== undefined) {
    query.success = params.success === "true";
  }
  if (params.toolName) {
    query.tool_names = { $in: [params.toolName] };
  }
  if (params.dateFrom || params.dateTo) {
    const timeQuery: Record<string, Date> = {};
    if (params.dateFrom) timeQuery.$gte = params.dateFrom;
    if (params.dateTo) timeQuery.$lte = params.dateTo;
    query.timestamp = timeQuery;
  }

  const [entries, total] = await Promise.all([
    NoetixUsageLog.find(query)
      .sort({ timestamp: -1 })
      .skip(params.skip || 0)
      .limit(params.limit || 50)
      .lean(),
    NoetixUsageLog.countDocuments(query),
  ]);

  return {
    entries: entries.map((e: any) => ({
      _id: e._id.toString(),
      session_id: e.session_id,
      admin: e.admin,
      admin_id: e.admin_id.toString(),
      goal: e.goal,
      tool_names: e.tool_names ?? [],
      success: e.success,
      error: e.error,
      iterations: e.iterations,
      mode: e.mode,
      timestamp: e.timestamp,
    })),
    total,
  };
};

export const getNoetixUsageStats = async (): Promise<NoetixUsageStats> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  );

  const [
    totalResult,
    successResult,
    failedResult,
    iterResult,
    topTools,
    byAdmin,
    todayCount,
    yesterdayCount,
  ] = await Promise.all([
    NoetixUsageLog.countDocuments({}),
    NoetixUsageLog.countDocuments({ success: true }),
    NoetixUsageLog.countDocuments({ success: false }),
    NoetixUsageLog.aggregate([
      { $group: { _id: null, total: { $sum: "$iterations" } } },
    ]),
    NoetixUsageLog.aggregate([
      { $match: { tool_names: { $ne: [], $exists: true } } },
      { $unwind: "$tool_names" },
      { $group: { _id: "$tool_names", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]),
    NoetixUsageLog.aggregate([
      { $group: { _id: "$admin", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          admin: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]),
    NoetixUsageLog.countDocuments({
      timestamp: { $gte: todayStart },
    }),
    NoetixUsageLog.countDocuments({
      timestamp: { $gte: yesterdayStart, $lt: todayStart },
    }),
  ]);

  const totalIterations = iterResult[0]?.total ?? 0;

  return {
    totalCalls: totalResult,
    successfulCalls: successResult,
    failedCalls: failedResult,
    totalIterations,
    avgIterations: totalResult > 0 ? Math.round(totalIterations / totalResult * 10) / 10 : 0,
    topTools: topTools as Array<{ name: string; count: number }>,
    byAdmin: byAdmin as Array<{ admin: string; count: number }>,
    todayCalls: todayCount,
    yesterdayCalls: yesterdayCount,
  };
};

export const deleteOldNoetixUsageLogs = async (
  days: number
): Promise<number> => {
  if (days < 1 || days > 365) {
    throw new Error("days must be between 1 and 365");
  }
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await NoetixUsageLog.deleteMany({
    timestamp: { $lt: cutoffDate },
  });

  return result.deletedCount || 0;
};
