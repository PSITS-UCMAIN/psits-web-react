import cron from "node-cron";
import mongoose, { Types } from "mongoose";
import path from "path";
import ejs from "ejs";
import { Resend } from "resend";
import { marked } from "marked";
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
import { psits_roles } from "../enums/role.enums";
import { queryNoetixAiAgent } from "./noetix-chat.service";

const LOG_RETENTION_DAYS = 90;
const LOCK_KEY = "automation_job_lock";
let isExecuting = false;

export interface JobListResult {
  jobs: IAutomationJob[];
  total: number;
}

export interface ExecuteResult {
  job: IAutomationJob;
  results: AutomationFunctionResult[];
  emailQueued: boolean;
  targets: Array<{ name: string; email: string }>;
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
  try {
    const data = await def.fn(defaultParams);
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
  }
};

// ─── Email Rendering ────────────────────────────────────────────────────

const compressResultsForNoetix = (
  results: AutomationFunctionResult[]
): Record<string, unknown> => {
  const compact: Record<string, unknown> = {};
  for (const r of results) {
    const key = r.functionKey ?? "unknown";
    if (r.success) {
      if (Array.isArray(r.data) && r.data.length > 0) {
        const samples = (r.data as Record<string, unknown>[]).slice(0, 3);
        compact[key] = {
          recordCount: r.data.length,
          samples: samples.map((row) => {
            const flat: Record<string, unknown> = {};
            const keys = Object.keys(row);
            for (let i = 0; i < Math.min(keys.length, 5); i++) {
              const val = row[keys[i]];
              if (
                val !== null &&
                val !== undefined &&
                typeof val !== "object"
              ) {
                flat[keys[i]] = String(val).substring(0, 100);
              }
            }
            return flat;
          }),
        };
      } else if (r.data) {
        compact[key] = r.data;
      } else {
        compact[key] = { recordCount: r.recordCount };
      }
    } else {
      compact[key] = { error: r.error };
    }
  }
  return compact;
};

const renderEmailTemplate = async (
  job: IAutomationJob,
  results: AutomationFunctionResult[],
  targets: ResolvedTarget[]
): Promise<string> => {
  const templatePath = path.join(
    __dirname,
    "../templates/automation-report.ejs"
  );
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
  const subject = job.emailConfig.subjectTemplate
    .split("{{jobName}}")
    .join(job.name)
    .split("{{date}}")
    .join(dateStr);

  return ejs.renderFile(templatePath, {
    jobName: job.name,
    executionTime: `${dateStr} at ${timeStr} (Asia/Manila)`,
    results,
    includeSummary: job.emailConfig.includeSummary,
    includeRawData: job.emailConfig.includeRawData,
    targetCount: targets.length,
    subject,
  });
};

// ─── Email Queue ────────────────────────────────────────────────────────

const queueReportEmail = async (
  job: IAutomationJob,
  results: AutomationFunctionResult[],
  targets: ResolvedTarget[]
): Promise<boolean> => {
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
  const subject = job.emailConfig.subjectTemplate
    .split("{{jobName}}")
    .join(job.name)
    .split("{{date}}")
    .join(dateStr);

  const reportPayload = {
    jobName: job.name,
    executionTime: new Date().toISOString(),
    results,
    includeSummary: job.emailConfig.includeSummary,
    includeRawData: job.emailConfig.includeRawData,
    subject,
  };

  const templatePath = path.join(
    __dirname,
    "../templates/automation-report.ejs"
  );
  const fallbackHtml = await ejs.renderFile(templatePath, {
    jobName: job.name,
    executionTime: `${dateStr} at ${timeStr} (Asia/Manila)`,
    results,
    includeSummary: job.emailConfig.includeSummary,
    includeRawData: job.emailConfig.includeRawData,
    targetCount: targets.length,
    subject,
  });

  let htmlBody: string | null = null;

  if (job.emailConfig.useNoetix) {
    const noetixData = compressResultsForNoetix(results);
    try {
      const noetixMarkdown = await (async () => {
        const tools = (await import("../types/chat-tool.types")).getToolRegistry().map((t) => ({
          name: t.name,
          description: t.description,
        }));
        const res = await queryNoetixAiAgent(
          "EMAIL_SENDER",
          `Generate a professional daily operational report for "${job.name}". Include key metrics, highlights, and any concerns from the data below.`,
          tools,
          undefined,
          JSON.stringify(noetixData),
          false
        );
        return res.data.final_result;
      })();
      htmlBody = marked(noetixMarkdown) as string;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[Automation] Noetix email generation failed for job ${job.name}:`,
        message
      );
      htmlBody = null;
    }
  }

  const html = htmlBody ?? fallbackHtml;

  const logoPath = path.join(__dirname, "../assets/psits.jpg");
  const logoBuffer = await import("fs/promises").then((fs) =>
    fs.readFile(logoPath)
  );
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL;

  if (!from) throw new Error("EMAIL is not configured");

  const sendOne = async (t: ResolvedTarget): Promise<void> => {
    const { error } = await resend.emails.send({
      from,
      to: t.email,
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
    if (error) throw new Error(error.message);

    await new EmailQueue({
      type: "automation-report",
      studentId: null,
      email: t.email,
      status: "sent",
      subtype: job.name,
      referenceCode: job.name,
      payload: JSON.stringify(reportPayload),
      htmlBody: htmlBody ?? undefined,
      retryCount: 0,
    }).save();
  };

  await Promise.all(targets.map(sendOne));
  return true;
};

// ─── Job Execution ──────────────────────────────────────────────────────

export const executeJob = async (jobId: string): Promise<ExecuteResult> => {
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

  // Queue email if enabled
  let emailQueued = false;
  if (job.emailConfig.enabled && targets.length > 0) {
    try {
      await queueReportEmail(job, results, targets);
      emailQueued = true;
    } catch (err: any) {
      console.error(
        `[Automation] Failed to queue email for job ${jobId}:`,
        err.message
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
      emailQueued,
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
    emailQueued,
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
  const updated = (await AutomationJob.findByIdAndUpdate(
    jobId,
    {
      ...data,
      ...(data.schedule
        ? {
            nextRunAt: calculateNextRun(
              data.schedule as IAutomationJob["schedule"]
            ),
          }
        : {}),
    },
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

  return executeJob(jobId);
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
