import cron from "node-cron";
import mongoose, { Types } from "mongoose";
import axios from "axios";
import { AutomationJob, IAutomationJob } from "../models/automationJob.model";
import { Admin } from "../models/admin.model";
import { EmailQueue } from "../models/email.model";
import { CronExecutionLog } from "../models/cronExecutionLog.model";
import {
  AUTOMATION_FUNCTIONS,
  AutomationFunctionResult,
} from "./automationFunctions";
import { logService } from "./log.service";
import { logs_action } from "../enums/logs.enums";
import { account_status } from "../enums/status.enums";

const LOG_RETENTION_DAYS = 90;
/** Functions run serially under a process-wide lock, so one slow query stalls every job. */
const FUNCTION_TIMEOUT_MS = 30000;
let isExecuting = false;

export interface JobListResult {
  jobs: IAutomationJob[];
  total: number;
}

export interface ExecuteResult {
  job: IAutomationJob;
  results: AutomationFunctionResult[];
  emailQueued: boolean;
  webhookSent: boolean;
  targets: Array<{ name: string; email: string }>;
}

type AutomationRunType = "manual" | "scheduled" | "retry";

interface AutomationWebhookPayload {
  event: "automation.job.executed";
  source: "psits-web";
  sentAt: string;
  job: {
    id: string;
    name: string;
    description?: string;
    functionKeys: string[];
    runType: AutomationRunType;
    startedAt: string;
  };
  email: {
    subject: string;
    includeSummary: boolean;
    includeRawData: boolean;
    useNoetix: boolean;
    skipIfEmpty: boolean;
  };
  recipients: Array<{
    name: string;
    email: string;
    position: string;
  }>;
  results: AutomationFunctionResult[];
  summary: {
    totalFunctions: number;
    successfulFunctions: number;
    failedFunctions: number;
    totalRecords: number;
    targetCount: number;
    allEmpty: boolean;
  };
}

// ─── Schedule Builders ──────────────────────────────────────────────────

const buildCronExpression = (schedule: IAutomationJob["schedule"]): string => {
  const [hours, minutes] = schedule.time.split(":").map(Number);
  switch (schedule.type) {
    case "daily":
      return `${minutes} ${hours} * * *`;
    case "interval": {
      const days = schedule.intervalDays ?? 1;
      return `${minutes} ${hours} */${days} * *`;
    }
    case "weekly": {
      const day = schedule.dayOfWeek ?? 0;
      return `${minutes} ${hours} * * ${day}`;
    }
    case "cron":
      return schedule.cronExpression ?? `${minutes} ${hours} * * *`;
    default:
      return `${minutes} ${hours} * * *`;
  }
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

const addMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

const calculateNextRun = (
  schedule: IAutomationJob["schedule"],
  after: Date = new Date()
): Date => {
  const [hours, minutes] = schedule.time.split(":").map(Number);
  let next = new Date(after);
  next.setHours(hours, minutes, 0, 0);
  if (next <= after) next = addDays(next, 1);

  switch (schedule.type) {
    case "interval": {
      const days = schedule.intervalDays ?? 1;
      while (next <= after) {
        next = addDays(next, days);
      }
      return next;
    }
    case "weekly": {
      const targetDay = schedule.dayOfWeek ?? 0;
      while (next.getDay() !== targetDay || next <= after) {
        next = addDays(next, 1);
      }
      return next;
    }
    case "cron":
      return next;
    default:
      return next;
  }
};

// ─── Target Resolution ──────────────────────────────────────────────────

export interface ResolvedTarget {
  _id: string;
  name: string;
  email: string;
  position: string;
}

const resolveTargets = async (
  targetType: IAutomationJob["targetType"],
  targetIds: string[]
): Promise<ResolvedTarget[]> => {
  if (targetIds.length === 0) return [];

  const query: Record<string, unknown> = { status: account_status.ACTIVE };

  switch (targetType) {
    case "admin":
      query.id_number = { $in: targetIds };
      break;
    case "role":
    case "permission":
      query.access = { $in: targetIds };
      break;
  }

  const admins = await Admin.find(query, "name email position").lean();
  return admins
    .filter((a) => a.email)
    .map((a) => ({
      _id: (a._id as Types.ObjectId).toString(),
      name: a.name,
      email: a.email as string,
      position: a.position,
    }));
};

// ─── Function Execution ────────────────────────────────────────────────

const executeFunction = async (
  key: string,
  defaultParams: Record<string, unknown>
): Promise<AutomationFunctionResult> => {
  const def = AUTOMATION_FUNCTIONS[key];
  if (!def) {
    return {
      success: false,
      recordCount: 0,
      durationMs: 0,
      error: `Unknown function: ${key}`,
      functionKey: key,
      category: "system",
      description: key,
    };
  }

  const start = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    const data = await Promise.race([
      def.fn(defaultParams),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error(`Timed out after ${FUNCTION_TIMEOUT_MS / 1000}s`)),
          FUNCTION_TIMEOUT_MS
        );
      }),
    ]);
    const count = Array.isArray(data) ? data.length : 1;
    return {
      success: true,
      data,
      recordCount: count,
      durationMs: Date.now() - start,
      functionKey: key,
      category: def.category,
      description: def.description,
    };
  } catch (err: any) {
    return {
      success: false,
      recordCount: 0,
      durationMs: Date.now() - start,
      error: err.message,
      functionKey: key,
      category: def.category,
      description: def.description,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
};

// ─── Job Execution ──────────────────────────────────────────────────────

const buildAutomationWebhookPayload = (
  job: IAutomationJob,
  results: AutomationFunctionResult[],
  targets: ResolvedTarget[],
  startedAt: Date,
  runType: AutomationRunType
): AutomationWebhookPayload => {
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const subject = job.emailConfig.subjectTemplate
    .split("{{jobName}}")
    .join(job.name)
    .split("{{date}}")
    .join(dateStr);
  const allEmpty =
    results.length > 0 &&
    results.every((r) => r.success && r.recordCount === 0);

  return {
    event: "automation.job.executed",
    source: "psits-web",
    sentAt: new Date().toISOString(),
    job: {
      id: job._id.toString(),
      name: job.name,
      description: job.description,
      functionKeys: job.functionKeys,
      runType,
      startedAt: startedAt.toISOString(),
    },
    email: {
      subject,
      includeSummary: job.emailConfig.includeSummary,
      includeRawData: job.emailConfig.includeRawData,
      useNoetix: job.emailConfig.useNoetix,
      skipIfEmpty: Boolean(job.emailConfig.skipIfEmpty),
    },
    recipients: targets.map((t) => ({
      name: t.name,
      email: t.email,
      position: t.position,
    })),
    results,
    summary: {
      totalFunctions: results.length,
      successfulFunctions: results.filter((r) => r.success).length,
      failedFunctions: results.filter((r) => !r.success).length,
      totalRecords: results.reduce((sum, r) => sum + r.recordCount, 0),
      targetCount: targets.length,
      allEmpty,
    },
  };
};

export const sendAutomationWebhookPayload = async (
  payload: AutomationWebhookPayload
): Promise<void> => {
  const webhookUrl = process.env.MAKE_AUTOMATION_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("MAKE_AUTOMATION_WEBHOOK_URL is not configured");
  }

  const webhookKey = process.env.MAKE_AUTOMATION_WEBHOOK_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (webhookKey) {
    headers["x-make-apikey"] = webhookKey;
  }

  await axios.post(webhookUrl, payload, {
    headers,
    timeout: 15000,
  });
};

const queueReportWebhook = async (
  job: IAutomationJob,
  results: AutomationFunctionResult[],
  targets: ResolvedTarget[],
  startedAt: Date,
  runType: AutomationRunType
): Promise<boolean> => {
  const payload = buildAutomationWebhookPayload(
    job,
    results,
    targets,
    startedAt,
    runType
  );
  const queueEntry = await new EmailQueue({
    type: "automation-report",
    studentId: null,
    email: targets.map((t) => t.email).join(","),
    status: "pending",
    subtype: job.name,
    referenceCode: job._id.toString(),
    payload: JSON.stringify(payload),
    retryCount: 0,
  }).save();

  await sendAutomationWebhookPayload(payload);
  await EmailQueue.findByIdAndUpdate(queueEntry._id, { status: "sent" });
  return true;
};

export const executeJob = async (
  jobId: string,
  runType: AutomationRunType = "scheduled"
): Promise<ExecuteResult> => {
  const job = (await AutomationJob.findById(
    jobId
  ).lean()) as IAutomationJob | null;
  if (!job) throw new Error("Job not found");

  const startedAt = new Date();

  // Resolve targets
  const targets = await resolveTargets(job.targetType, job.targetIds);
  if (targets.length === 0) {
    throw new Error("No active targets found for this job");
  }

  // Execute functions
  const results: AutomationFunctionResult[] = [];
  for (const key of job.functionKeys) {
    const def = AUTOMATION_FUNCTIONS[key];
    if (def) {
      results.push(await executeFunction(key, def.defaultParams));
    }
  }

  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  const allSuccess = results.every((r) => r.success);
  const someSuccess = results.some((r) => r.success);

  // Send the webhook when delivery is enabled. Alert-style jobs opt out of
  // "nothing to report" payloads so a daily empty report doesn't train
  // admins to ignore them. A failed function also reports zero records, so
  // require success here — failures must still reach Make.com.
  const allEmpty =
    results.length > 0 &&
    results.every((r) => r.success && r.recordCount === 0);
  const skippedAsEmpty = Boolean(job.emailConfig.skipIfEmpty) && allEmpty;

  let webhookSent = false;
  if (job.emailConfig.enabled && targets.length > 0 && !skippedAsEmpty) {
    try {
      webhookSent = await queueReportWebhook(
        job,
        results,
        targets,
        startedAt,
        runType
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[Automation] Failed to send webhook for job ${jobId}:`,
        message
      );
    }
  }

  // Update job
  await AutomationJob.findByIdAndUpdate(jobId, {
    lastRunAt: startedAt,
    nextRunAt: calculateNextRun(job.schedule, startedAt),
    runCount: job.runCount + 1,
  });

  // Log execution
  await logCronExecutionForJob(
    jobId,
    job.name,
    startedAt,
    {
      results,
      targetCount: targets.length,
      webhookSent,
      skippedAsEmpty,
      totalDuration,
    },
    someSuccess
  );

  // Log in activity log
  await logService.create({
    admin: "System",
    action: logs_action.RUN_AUTOMATION_JOB,
    target: `Job: ${job.name} — ${results.filter((r) => r.success).length}/${results.length} functions succeeded`,
    target_id: jobId,
    target_model: "AutomationJob",
  });

  return {
    job: job as IAutomationJob,
    results,
    emailQueued: webhookSent,
    webhookSent,
    targets,
  };
};

const logCronExecutionForJob = async (
  jobId: string,
  jobName: string,
  startedAt: Date,
  metadata: Record<string, unknown>,
  success: boolean
) => {
  try {
    await new CronExecutionLog({
      jobName: `automation-${jobName}`,
      scheduledAt: startedAt,
      startedAt,
      completedAt: new Date(),
      durationMs: metadata.totalDuration as number,
      success,
      errorMessage: success ? undefined : "Partial or full failure",
      metadata,
      createdAt: new Date(),
    }).save();
  } catch {
    // Log failure is non-critical
  }

  // Prune old logs
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LOG_RETENTION_DAYS);
    await CronExecutionLog.deleteMany({
      startedAt: { $lt: cutoff },
    });
  } catch {
    // Cleanup failure is non-critical
  }
};

// ─── Cron Scheduling ────────────────────────────────────────────────────

const taskMap = new Map<string, ReturnType<typeof cron.schedule>>();

export const scheduleAllJobs = async (): Promise<void> => {
  // Clear existing tasks
  for (const [, task] of taskMap) {
    task.stop();
  }
  taskMap.clear();

  const jobs = (await AutomationJob.find({
    isActive: true,
  }).lean()) as unknown as IAutomationJob[];

  for (const job of jobs) {
    try {
      const expression = buildCronExpression(job.schedule);
      const jobId = job._id.toString();

      const task = cron.schedule(
        expression,
        async () => {
          if (isExecuting) {
            console.log(
              `[Automation] Job ${jobId} skipped: another job is running`
            );
            return;
          }
          isExecuting = true;
          try {
            await executeJob(jobId);
          } catch (err: any) {
            console.error(`[Automation] Job ${jobId} failed:`, err.message);
            await logCronExecutionForJob(
              jobId,
              job.name,
              new Date(),
              {
                error: err.message,
              },
              false
            );
          } finally {
            isExecuting = false;
          }
        },
        {
          timezone: "Asia/Manila",
        }
      );

      task.start();
      taskMap.set(jobId, task);
      console.log(
        `[Automation] Scheduled job "${job.name}" (${jobId}) → ${expression}`
      );
    } catch (err: any) {
      console.error(
        `[Automation] Failed to schedule job ${job._id}:`,
        err.message
      );
    }
  }

  console.log(`[Automation] Registered ${taskMap.size} job(s)`);
};

export const rescheduleJob = async (jobId: string): Promise<void> => {
  const task = taskMap.get(jobId);
  if (task) task.stop();
  taskMap.delete(jobId);

  const job = (await AutomationJob.findById(
    jobId
  ).lean()) as IAutomationJob | null;
  if (!job || !job.isActive) return;

  try {
    const expression = buildCronExpression(job.schedule);
    const task = cron.schedule(
      expression,
      async () => {
        if (isExecuting) return;
        isExecuting = true;
        try {
          await executeJob(jobId);
        } catch (err: any) {
          console.error(`[Automation] Job ${jobId} failed:`, err.message);
        } finally {
          isExecuting = false;
        }
      },
      { timezone: "Asia/Manila" }
    );
    task.start();
    taskMap.set(jobId, task);
  } catch (err: any) {
    console.error(
      `[Automation] Failed to reschedule job ${jobId}:`,
      err.message
    );
  }
};

export const stopJob = async (jobId: string): Promise<void> => {
  const task = taskMap.get(jobId);
  if (task) {
    task.stop();
    taskMap.delete(jobId);
  }
};

// ─── CRUD Operations ────────────────────────────────────────────────────

export const createJob = async (
  data: Omit<IAutomationJob, "_id" | "createdAt" | "updatedAt" | "runCount">,
  createdBy: Types.ObjectId
): Promise<IAutomationJob> => {
  const job = await AutomationJob.create({
    ...data,
    createdBy,
    runCount: 0,
    nextRunAt: calculateNextRun(data.schedule),
  });
  await rescheduleJob(job._id.toString());
  return job;
};

export const updateJob = async (
  jobId: string,
  data: Partial<IAutomationJob>
): Promise<IAutomationJob | null> => {
  // Drop undefined keys so Mongoose does not silently skip clearing fields
  // (e.g. `description` sent as undefined when the admin clears it).
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) clean[key] = value;
  }

  // Force full replacement of the nested emailConfig and array fields so
  // stale sub-fields are not carried over by Mongoose's partial merge.
  const set = { ...clean } as Record<string, unknown>;
  if (clean.emailConfig) set.emailConfig = { ...(clean.emailConfig as object) };
  if (clean.targetIds) set.targetIds = [...(clean.targetIds as string[])];
  if (clean.functionKeys)
    set.functionKeys = [...(clean.functionKeys as string[])];

  if (data.schedule) {
    set.nextRunAt = calculateNextRun(
      data.schedule as IAutomationJob["schedule"]
    );
  }

  const updated = (await AutomationJob.findByIdAndUpdate(
    jobId,
    { $set: set },
    { new: true }
  ).lean()) as IAutomationJob | null;

  if (updated) {
    await rescheduleJob(jobId);
  }
  return updated;
};

export const deleteJob = async (jobId: string): Promise<boolean> => {
  await stopJob(jobId);
  const result = await AutomationJob.findByIdAndDelete(jobId);
  return !!result;
};

export const getJobs = async (
  isActive?: boolean,
  limit = 50,
  skip = 0
): Promise<JobListResult> => {
  const query: Record<string, unknown> = {};
  if (isActive !== undefined) query.isActive = isActive;

  const [jobs, total] = await Promise.all([
    AutomationJob.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AutomationJob.countDocuments(query),
  ]);

  return { jobs: jobs as unknown as IAutomationJob[], total };
};

export const getJobById = async (
  jobId: string
): Promise<IAutomationJob | null> => {
  return (await AutomationJob.findById(
    jobId
  ).lean()) as unknown as IAutomationJob | null;
};

export const toggleJobActive = async (
  jobId: string
): Promise<IAutomationJob | null> => {
  const job = await AutomationJob.findById(jobId);
  if (!job) return null;
  job.isActive = !job.isActive;
  await job.save();
  if (job.isActive) {
    await rescheduleJob(jobId);
  } else {
    await stopJob(jobId);
  }
  return job;
};

// ─── Execution Logs ─────────────────────────────────────────────────────

export const getJobExecutionLogs = async (
  jobId: string,
  limit = 20,
  skip = 0
): Promise<
  Array<{
    _id: string;
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }>
> => {
  return (await CronExecutionLog.find({
    jobName: { $regex: `^automation-`, $options: "i" },
    metadata: { $regex: new RegExp(jobId) },
  })
    .sort({ startedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()) as unknown as Array<{
    _id: string;
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }>;
};

// ─── Function Registry ──────────────────────────────────────────────────

export const getFunctionRegistry = (): Array<{
  key: string;
  description: string;
  category: string;
  defaultParams: Record<string, unknown>;
}> => {
  return Object.entries(AUTOMATION_FUNCTIONS).map(([key, def]) => ({
    key,
    description: def.description,
    category: def.category,
    defaultParams: def.defaultParams,
  }));
};

// ─── Manual Run ─────────────────────────────────────────────────────────

export const runJobManually = async (
  jobId: string,
  createdBy: Types.ObjectId
): Promise<ExecuteResult> => {
  const job = await AutomationJob.findById(jobId);
  if (!job) throw new Error("Job not found");

  await logService.create({
    admin: "System",
    admin_id: createdBy,
    action: logs_action.RUN_AUTOMATION_JOB,
    target: `Manual run — Job: ${job.name}`,
    target_id: jobId,
    target_model: "AutomationJob",
  });

  return executeJob(jobId, "manual");
};

const automationService = {
  scheduleAllJobs,
  rescheduleJob,
  stopJob,
  createJob,
  updateJob,
  deleteJob,
  getJobs,
  getJobById,
  toggleJobActive,
  executeJob,
  runJobManually,
  getFunctionRegistry,
  getJobExecutionLogs,
};

export { automationService };
