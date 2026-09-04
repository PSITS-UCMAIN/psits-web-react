import dotenv from "dotenv";
import mongoose from "mongoose";
import cron from "node-cron";
import dns from "node:dns";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import express from "express";
import path from "path";
import "express-async-errors";

import { checkPromos } from "./custom_function/check_promo";
import { resendPendingEmails } from "./services/email.resend.service";
import { logCronExecution } from "./services/devtools.service";
import devtoolsRoutes from "./routes/devtools.v2.route";
import { orderService } from "./services/order.service";
import adminRoutes from "./routes/admin.route";
import authV2Routes from "./routes/authV2.route";
import cartRoutes from "./routes/cart.route";
import documentationRoutes from "./routes/documentation.route";
import eventRoutes from "./routes/events.route";
import eventsV2Routes from "./routes/eventsV2.route";
import indexRoutes from "./routes/index.route";
import logRoutes from "./routes/logs.route";
import merchRoutes from "./routes/merchandise.route";
import merchandiseV2Routes from "./routes/merchandise.v2.route";
import orderRoutes from "./routes/orders.route";
import privateRoutes from "./routes/private.route";
import promoRoutes from "./routes/promo.route";
import studentRoutes from "./routes/students.route";
import studentV2Routes from "./routes/studentsV2.route";
import indexV2Routes from "./routes/index.v2.route";
import reportV2Routes from "./routes/report.v2.route";
import recruitmentRoutes from "./routes/recruitment.route";
import { hardDeleteSoftDeletedMerch } from "./controllers/merchandise.v2.controller";
import certificateV2Routes from "./routes/certificateV2.route";
import { errorHandler } from "./util/errors.util";
import { globalErrorHandler } from "./middlewares/global.error.middleware";
import contributionsV2Routes from "./routes/contributions.v2.route";
import automationRoutes from "./routes/automation.v2.route";
import noetixChatRoutes from "./routes/noetix-chat.v2.route";
import { automationService } from "./services/automation.service";
import webhookRoutes from "./routes/webhook.route";
dotenv.config();

const app = express();

const allowedOrigins = [
  process.env.CORS,
  process.env.CORS2,
  process.env.CORS3,
].filter((origin): origin is string => Boolean(origin));

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Refresh-Request"],
    credentials: true,
  })
);
app.use("/api/webhooks",bodyParser.raw({ type: "application/json" }), webhookRoutes);
app.set("trust proxy", 1);
app.use(bodyParser.json());

app.use("/assets", express.static(path.join(__dirname, "assets")));
// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api", indexV2Routes);
app.use("/api", studentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/merch", merchRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/promo", promoRoutes);
app.use("/api/reports", reportV2Routes);
app.use("/api", privateRoutes);
app.use("/api/docs", documentationRoutes);
app.use("/api/v2/auth", authV2Routes);
app.use("/api/v2/events", eventsV2Routes);
app.use("/api/v2/merchandise", merchandiseV2Routes);
app.use("/api/v2/students", studentV2Routes);
app.use("/api/v2/recruitment", recruitmentRoutes);
app.use("/api/v2/dev", devtoolsRoutes);
app.use("/api/v2/certificates", certificateV2Routes);
app.use("/api/v2/contributions", contributionsV2Routes);
app.use("/api/v2/dev/automation", automationRoutes);
app.use("/api/v2/chat", noetixChatRoutes);

app.use(errorHandler);
app.use(globalErrorHandler);

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Missing required env: MONGODB_URI");
    }

    const port = Number(process.env.PORT) || 5000;

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME ?? "psits-test",
    });

    console.log(
      `MongoDB PSITS Connected [${process.env.DB_NAME ?? "psits-test"}]`
    );
    console.log(
      `Allowed CORS origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(", ") : "none configured"}`
    );

    app.listen(port, "0.0.0.0", () => {
      console.log(`Server started, listening at port ${port}`);
    });

    const promoJob = cron.schedule("0 0 * * *", async () => {
      console.log("Running daily promo check...");
      const startedAt = new Date();
      try {
        await checkPromos();
        await logCronExecution({
          jobName: "promo-check",
          scheduledAt: startedAt,
          startedAt,
          completedAt: new Date(),
          durationMs: Date.now() - startedAt.getTime(),
          success: true,
        });
      } catch (err: any) {
        await logCronExecution({
          jobName: "promo-check",
          scheduledAt: startedAt,
          startedAt,
          completedAt: new Date(),
          durationMs: Date.now() - startedAt.getTime(),
          success: false,
          errorMessage: err.message,
        });
      }
    });

    const emailJob = cron.schedule(
      "0 1 * * *",
      async () => {
        console.log("[1AM PH] Running daily email resend job...");
        const startedAt = new Date();
        try {
          await resendPendingEmails();
          await logCronExecution({
            jobName: "email-resend",
            scheduledAt: startedAt,
            startedAt,
            completedAt: new Date(),
            durationMs: Date.now() - startedAt.getTime(),
            success: true,
          });
        } catch (err: any) {
          await logCronExecution({
            jobName: "email-resend",
            scheduledAt: startedAt,
            startedAt,
            completedAt: new Date(),
            durationMs: Date.now() - startedAt.getTime(),
            success: false,
            errorMessage: err.message,
          });
        }
      },
      { timezone: "Asia/Manila" }
    );

    const orderJob = cron.schedule(
      "0 0 1 * *",
      async () => {
        console.log("[Monthly 1st] Running expired orders cleanup...");
        const startedAt = new Date();
        try {
          const result = await orderService.cancelExpiredOrders();
          console.log(
            `[Monthly] Cancelled ${result.cancelledCount} orders, restored ${result.restoredItems} items`
          );
          await logCronExecution({
            jobName: "cancel-expired-orders",
            scheduledAt: startedAt,
            startedAt,
            completedAt: new Date(),
            durationMs: Date.now() - startedAt.getTime(),
            success: true,
            metadata: {
              cancelledCount: result.cancelledCount,
              restoredItems: result.restoredItems,
            },
          });
        } catch (err: any) {
          await logCronExecution({
            jobName: "cancel-expired-orders",
            scheduledAt: startedAt,
            startedAt,
            completedAt: new Date(),
            durationMs: Date.now() - startedAt.getTime(),
            success: false,
            errorMessage: err.message,
          });
        }
      },
      { timezone: "Asia/Manila" }
    );

    const merchCleanupJob = cron.schedule(
      "0 2 * * *",
      async () => {
        console.log("[2AM PH] Running soft-deleted merch cleanup...");
        const startedAt = new Date();
        try {
          const result = await hardDeleteSoftDeletedMerch();
          if (result.deletedCount > 0) {
            console.log(
              `[2AM PH] Permanently deleted ${result.deletedCount} expired soft-deleted merchandise`
            );
          }
          await logCronExecution({
            jobName: "merch-cleanup",
            scheduledAt: startedAt,
            startedAt,
            completedAt: new Date(),
            durationMs: Date.now() - startedAt.getTime(),
            success: true,
            metadata: { deletedCount: result.deletedCount },
          });
        } catch (err: any) {
          await logCronExecution({
            jobName: "merch-cleanup",
            scheduledAt: startedAt,
            startedAt,
            completedAt: new Date(),
            durationMs: Date.now() - startedAt.getTime(),
            success: false,
            errorMessage: err.message,
          });
        }
      },
      { timezone: "Asia/Manila" }
    );

    const contributionSyncJob = cron.schedule(
      "0 2 * * *",
      async () => {
        console.log("[2AM PH] Running developer contribution sync...");
        const startedAt = new Date();
        try {
          const { contributionService } =
            await import("./services/contribution.service");
          await contributionService.syncDeveloperContributions();
          await logCronExecution({
            jobName: "contribution-sync",
            scheduledAt: startedAt,
            startedAt,
            completedAt: new Date(),
            durationMs: Date.now() - startedAt.getTime(),
            success: true,
          });
        } catch (err: any) {
          await logCronExecution({
            jobName: "contribution-sync",
            scheduledAt: startedAt,
            startedAt,
            completedAt: new Date(),
            durationMs: Date.now() - startedAt.getTime(),
            success: false,
            errorMessage: err.message,
          });
        }
      },
      { timezone: "Asia/Manila" }
    );

    // Schedule automation jobs from database
    try {
      await automationService.scheduleAllJobs();
    } catch (err) {
      console.error("Failed to schedule automation jobs:", err);
    }
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
}

startServer();
