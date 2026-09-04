import { Router } from "express";
import {
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2,
  adminAccessAuthenticateV2,
} from "../middlewares/authV2.middleware";
import { devtoolsController } from "../controllers/devtools.v2.controller";
import { psits_roles } from "../enums/role.enums";

const router = Router();

// All routes: DB-checked admin with PSITS_ADMIN or PSITS_DEV access, campus=MAIN
const authChain = [
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.DEVELOPER]),
];

// Admin-only routes (stricter access)
const adminOnlyAuthChain = [
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN]),
];

// Email queue
router.get("/email-queue", ...authChain, devtoolsController.getEmailQueue);
router.post(
  "/email-resend/:id",
  ...authChain,
  devtoolsController.resendSingleEmail
);
router.get(
  "/email-export",
  ...authChain,
  devtoolsController.exportEmailQueueCsv
);

// Health
router.get("/health", ...authChain, devtoolsController.getHealth);

// Sessions
router.get("/sessions", ...authChain, devtoolsController.getSessions);
router.delete(
  "/sessions/expired",
  ...authChain,
  devtoolsController.clearExpiredSessions
);
router.post(
  "/sessions/invalidate",
  ...authChain,
  devtoolsController.invalidateSession
);
router.post(
  "/sessions/invalidate-bulk",
  ...authChain,
  devtoolsController.invalidateBulkSessions
);

// Actions
router.post(
  "/actions/cron",
  ...authChain,
  devtoolsController.triggerCron
);

// Expired orders
router.get(
  "/expired-orders",
  ...authChain,
  devtoolsController.getExpiredOrders
);
router.post(
  "/actions/cancel-expired",
  ...authChain,
  devtoolsController.cancelExpiredOrders
);

// Tester
router.post(
  "/test-endpoint",
  ...authChain,
  devtoolsController.testEndpoint
);

// Cron monitor
router.get(
  "/cron-status",
  ...authChain,
  devtoolsController.getCronStatus
);

// Env inspector
router.get(
  "/env-status",
  ...authChain,
  devtoolsController.getEnvStatus
);

// Rate limiter
router.get(
  "/rate-limit-stats",
  ...authChain,
  devtoolsController.getRateLimitStats
);

// DB performance
router.get(
  "/db-performance",
  ...authChain,
  devtoolsController.getDbPerformance
);
router.post(
  "/db/rebuild-indexes",
  ...authChain,
  devtoolsController.rebuildDbIndexes
);

// Activity logs
router.get(
  "/logs",
  ...authChain,
  devtoolsController.getLogs
);
router.delete(
  "/logs/old",
  ...authChain,
  devtoolsController.deleteOldLogs
);

// Order Manager
router.get(
  "/orders",
  ...authChain,
  devtoolsController.getOrders
);
router.get(
  "/orders/:id",
  ...authChain,
  devtoolsController.getOrderDetails
);

// Certificate Templates
router.get(
  "/certificates",
  ...authChain,
  devtoolsController.getCertificateTemplates
);

// Data Export
router.get(
  "/export",
  ...authChain,
  devtoolsController.exportCollection
);

// Membership Revenue
router.get(
  "/membership-revenue",
  ...authChain,
  devtoolsController.getMembershipRevenue
);

// Stock Alerts
router.get(
  "/stock-alerts",
  ...authChain,
  devtoolsController.getStockAlerts
);

// System Settings
router.get(
  "/settings",
  ...authChain,
  devtoolsController.getSystemSettings
);

// Chatbot toggle
router.get(
  "/settings/chatbot",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  devtoolsController.getChatbotEnabled
);
router.patch(
  "/settings/chatbot",
  ...adminOnlyAuthChain,
  devtoolsController.toggleChatbot
);

// Rate Limit Violations
router.get(
  "/rate-limit-violations",
  ...authChain,
  devtoolsController.getRateLimitViolations
);

// Email Queue Deep-Dive
router.get(
  "/email-queue/stats",
  ...authChain,
  devtoolsController.getEmailQueueStats
);
router.get(
  "/email-queue/failed",
  ...authChain,
  devtoolsController.getFailedEmailDetails
);
router.patch(
  "/email-queue/bulk-status",
  ...authChain,
  devtoolsController.bulkUpdateEmailStatus
);

// Server Error Log
router.get(
  "/errors",
  ...authChain,
  devtoolsController.getErrors
);
router.delete(
  "/errors",
  ...authChain,
  devtoolsController.clearErrors
);

// Brute Force Detector
router.get(
  "/brute-force-logs",
  ...authChain,
  devtoolsController.getBruteForceLogs
);

// API Endpoint Inventory
router.get(
  "/endpoint-inventory",
  ...authChain,
  devtoolsController.getEndpointInventory
);

// Refund Queue
router.get(
  "/refunds",
  ...authChain,
  devtoolsController.getRefundQueue
);

// Migration - Admin only
router.post(
  "/migration/backfill-created-at",
  ...adminOnlyAuthChain,
  devtoolsController.backfillCreatedAt
);

// Student Year Update - Admin only
router.post(
  "/actions/update-student-years",
  ...adminOnlyAuthChain,
  devtoolsController.updateStudentYears
);

// Student Year Decrement - Admin only
router.post(
  "/actions/decrement-student-years",
  ...adminOnlyAuthChain,
  devtoolsController.decrementStudentYears
);

// Noetix AI Usage - Admin only
router.get(
  "/noetix/usage",
  ...adminOnlyAuthChain,
  devtoolsController.getNoetixUsageLogs
);
router.get(
  "/noetix/usage/stats",
  ...adminOnlyAuthChain,
  devtoolsController.getNoetixUsageStats
);
router.delete(
  "/noetix/usage/old",
  ...adminOnlyAuthChain,
  devtoolsController.deleteOldNoetixUsageLogs
);

// Noetix Admin Disable - Admin only
router.get(
  "/noetix/settings",
  ...adminOnlyAuthChain,
  devtoolsController.getNoetixDisabledAdmins
);
router.post(
  "/noetix/settings/disable-admin",
  ...adminOnlyAuthChain,
  devtoolsController.addNoetixDisabledAdmin
);
router.delete(
  "/noetix/settings/disable-admin/:adminId",
  ...adminOnlyAuthChain,
  devtoolsController.removeNoetixDisabledAdmin
);

// Noetix Tool Disable - Admin only
router.get(
  "/noetix/tools",
  ...adminOnlyAuthChain,
  devtoolsController.getNoetixDisabledTools
);
router.get(
  "/noetix/tools/registry",
  ...adminOnlyAuthChain,
  devtoolsController.getNoetixToolRegistry
);
router.post(
  "/noetix/tools/disable",
  ...adminOnlyAuthChain,
  devtoolsController.addNoetixDisabledTool
);
router.delete(
  "/noetix/tools/disable/:toolName",
  ...adminOnlyAuthChain,
  devtoolsController.removeNoetixDisabledTool
);

// Noetix Max Iterations - Admin only
router.get(
  "/noetix/settings/max-iterations",
  ...adminOnlyAuthChain,
  devtoolsController.getNoetixMaxIterations
);
router.patch(
  "/noetix/settings/max-iterations",
  ...adminOnlyAuthChain,
  devtoolsController.setNoetixMaxIterations
);

export default router;
