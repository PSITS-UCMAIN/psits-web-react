import express, { Express } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import helmet from "helmet";
import dotenv from "dotenv";

//Routes Import
import indexRoutes from "./routes/index.route";
import adminRoutes from "./routes/admin.route";
import studentRoutes from "./routes/students.route";
import cartRoutes from "./routes/cart.route";
import orderRoutes from "./routes/orders.route";
import privateRoutes from "./routes/private.route";
import logRoutes from "./routes/logs.route";
import merchRoutes from "./routes/merchandise.route";
import eventRoutes from "./routes/events.route";

//Declaration
const app: Express = express();
dotenv.config();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.set("trust proxy", 1);
app.use(bodyParser.json());
mongoose
  .connect(process.env.MONGODB_URI ?? "", {
    dbName: process.env.DB_NAME ?? "psits-test",
  })
  .then(() =>
    console.log("MongoDB PSITS Connected [" + process.env.DB_NAME + "]")
  )
  .catch((err: any) => console.log(err));

//Routes
app.use("/api", indexRoutes);
app.use("/api", studentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/merch", merchRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/events", eventRoutes);
app.use("/api", privateRoutes);

app.listen(PORT, () => {
  console.log(`Server started, listening at port ${PORT}`);
});
