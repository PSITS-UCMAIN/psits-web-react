import bodyParser from "body-parser";
import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";

import adminRoutes from "./routes/admin.route";
import authV2Routes from "./routes/authV2.route";
import cartRoutes from "./routes/cart.route";
import certificateRoutes from "./routes/certificate.route";
import documentationRoutes from "./routes/documentation.route";
import eligibleCertificateRoutes from "./routes/eligibleCertificate.route";
import eventRoutes from "./routes/events.route";
import eventsV2Routes from "./routes/eventsV2.route";
import indexRoutes from "./routes/index.route";
import logRoutes from "./routes/logs.route";
import merchRoutes from "./routes/merchandise.route";
import orderRoutes from "./routes/orders.route";
import privateRoutes from "./routes/private.route";
import promoRoutes from "./routes/promo.route";
import studentRoutes from "./routes/students.route";
import studentV2Routes from "./routes/studentsV2.route";
import { errorHandler } from "./util/errors.util";

export const createApp = (): Express => {
  const app: Express = express();

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
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

  app.set("trust proxy", 1);
  app.use(bodyParser.json());

  app.use("/api", indexRoutes);
  app.use("/api", studentRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin/eligible-certificates", eligibleCertificateRoutes);
  app.use("/api/certificates", certificateRoutes);
  app.use("/api/merch", merchRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/logs", logRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/promo", promoRoutes);
  app.use("/api", privateRoutes);
  app.use("/api/docs", documentationRoutes);
  app.use("/api/v2/auth", authV2Routes);
  app.use("/api/v2/events", eventsV2Routes);
  app.use("/api/v2/students", studentV2Routes);

  app.use(errorHandler);

  return app;
};
