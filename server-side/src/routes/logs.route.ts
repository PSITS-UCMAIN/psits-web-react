import { Router } from "express";
import {
  getAllLogsController,
  addNewLogController,
} from "../controllers/log.controller";
import { admin_authenticate } from "../middlewares/custom_authenticate_token";

const router = Router();

// Fetch all logs
router.get("/", admin_authenticate, getAllLogsController);

// Add a new log
router.post("/", admin_authenticate, addNewLogController);

export default router;
