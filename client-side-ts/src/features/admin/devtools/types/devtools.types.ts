export interface EmailQueueEntry {
  _id: string;
  type: string;
  subtype?: string;
  email: string;
  status: string;
  referenceCode?: string;
  retryCount: number;
  timestamp: Date;
}

export interface HealthStats {
  uptime: string;
  memory: { used: number; total: number };
  emailConfigured: boolean;
  mongoConnected: boolean;
  students: number;
  pendingOrders: number;
  merchItems: number;
  activeEvents: number;
  memberships: number;
}

export interface SessionInfo {
  id: string;
  name: string;
  idNumber: string;
  role: "admin" | "student";
  campus?: string;
  position?: string;
}

export interface CronExecutionLog {
  _id: string;
  jobName: string;
  scheduledAt: Date;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface EnvStatusItem {
  key: string;
  configured: boolean;
  required?: boolean;
}

export interface RateLimitStats {
  windowMs: number;
  maxRequests: number;
  blockedToday: number;
}

export interface CollectionStat {
  name: string;
  docs: number;
  avgObjSize: number;
  storageSize: number;
  indexes: number;
  warning?: string;
}

export interface LogEntry {
  _id: string;
  timestamp: string;
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
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  skip?: number;
}

export interface LogsResponse {
  data: LogEntry[];
  total: number;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  batch: string | number;
  sizes: string[];
  variation: string[];
  quantity: number;
  sub_total: number;
}

export interface OrderDetail {
  _id: string;
  reference_code: string;
  student_name: string;
  id_number: string;
  course: string;
  year: number;
  campus: string;
  order_status: string;
  transaction_date?: string;
  order_date: string;
  total: number;
  items: OrderItem[];
  admin?: string;
  rfid?: string;
}

export interface OrderSearchParams {
  query?: string;
  status?: string;
  limit?: number;
  skip?: number;
}

export interface OrdersResponse {
  data: OrderDetail[];
  total: number;
}

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

export interface ServerError {
  message: string;
  stack?: string;
  path: string;
  method: string;
  ip: string;
  timestamp: string;
}

export interface BruteForceLog {
  ip: string;
  count: number;
  lastAttempt: string;
  attempts: Array<{ timestamp: string }>;
}

export interface EndpointInfo {
  method: string;
  path: string;
  auth: string;
  description?: string;
}

export interface RefundEntry {
  _id: string;
  refund_id: string;
  order_reference: string;
  product_name: string;
  refund_price: number;
  refund_admin: string;
  refund_date: string;
}

export interface BackfillResult {
  migrated: number;
  skipped: number;
}

export interface StudentYearUpdateResult {
  totalChecked: number;
  eligible: number;
  updated: number;
  skippedYear4: number;
}

export interface StudentYearDecrementResult {
  totalChecked: number;
  eligible: number;
  updated: number;
  skippedYear1: number;
}

export interface MigrationStatus {
  studentCreatedAtBackfilled: boolean;
  studentYearLastUpdated: string | null;
}

export interface NoetixUsageLog {
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
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  skip?: number;
}

export interface NoetixToolItem {
  name: string;
  description: string;
  permission: "read" | "admin_finance" | "admin_only" | "admin_full";
  category: string;
  enabled: boolean;
}

export interface NoetixMaxIterations {
  noetixMaxIterations: number;
}
