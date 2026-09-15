export type JobTargetType = "admin" | "role" | "permission";
export type ScheduleType = "daily" | "interval" | "weekly" | "cron";

export interface JobSchedule {
  type: ScheduleType;
  time: string;
  intervalDays?: number;
  dayOfWeek?: number;
  cronExpression?: string;
}

export type AutomationCategory =
  | "inventory"
  | "orders"
  | "members"
  | "events"
  | "system"
  | "security";

export interface EmailConfig {
  enabled: boolean;
  subjectTemplate: string;
  includeSummary: boolean;
  includeRawData: boolean;
  useNoetix: boolean;
  /** Suppress the email when every function returned zero records. */
  skipIfEmpty?: boolean;
}

export interface AutomationJob {
  _id: string;
  name: string;
  description?: string;
  targetType: JobTargetType;
  targetIds: string[];
  functionKeys: string[];
  schedule: JobSchedule;
  emailConfig: EmailConfig;
  isActive: boolean;
  createdBy: string;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationFunction {
  key: string;
  description: string;
  category: AutomationCategory;
  defaultParams: Record<string, unknown>;
}

export interface FunctionResult {
  success: boolean;
  data?: unknown;
  recordCount: number;
  durationMs: number;
  error?: string;
  functionKey: string;
}

export interface ExecuteResult {
  job: AutomationJob;
  results: FunctionResult[];
  emailQueued: boolean;
  webhookSent: boolean;
  targets: Array<{ name: string; email: string }>;
}

export interface ExecutionLog {
  _id: string;
  jobName: string;
  scheduledAt: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateJobInput {
  name: string;
  description?: string;
  targetType: JobTargetType;
  targetIds: string[];
  functionKeys: string[];
  schedule: JobSchedule;
  emailConfig: EmailConfig;
}

export interface UpdateJobInput {
  name?: string;
  description?: string;
  targetType?: JobTargetType;
  targetIds?: string[];
  functionKeys?: string[];
  schedule?: JobSchedule;
  emailConfig?: EmailConfig;
}

export interface JobsResponse {
  data: AutomationJob[];
  total: number;
}

export interface FunctionsResponse {
  data: AutomationFunction[];
}

export interface LogsResponse {
  data: ExecutionLog[];
}
