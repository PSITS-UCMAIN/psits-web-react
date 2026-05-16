import dotenv from "dotenv";
import mongoose from "mongoose";
import cron from "node-cron";
import dns from "node:dns";

import { checkPromos } from "./custom_function/check_promo";
import { createApp } from "./app";

dotenv.config();

// Force DNS servers to avoid Windows SRV ECONNREFUSED issues (see https://alexbevi.com/blog/2023/11/13/querysrv-errors-when-connecting-to-mongodb-atlas/)
// Only apply this workaround when running against the local/test database name `psits-test`.
if ((process.env.DB_NAME ?? "psits-test") === "psits-test" && process.env.FORCE_DNS !== "false") {
  try {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
    console.log('Set DNS servers to 1.1.1.1,8.8.8.8 for Atlas SRV lookups (applied for psits-test)');
  } catch (err) {
    console.warn('Failed to set DNS servers:', err);
  }
}


const app = createApp();

const allowedOrigins = [
  process.env.CORS,
  process.env.CORS2,
  process.env.CORS3,
].filter((origin): origin is string => Boolean(origin));

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

    cron.schedule("0 0 * * *", async () => {
      console.log("Running daily promo check...");
      await checkPromos();
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
}

startServer();
