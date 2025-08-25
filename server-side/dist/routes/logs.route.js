"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const log_controller_1 = require("../controllers/log.controller");
const custom_authenticate_token_1 = require("../middlewares/custom_authenticate_token");
const router = (0, express_1.Router)();
// Fetch all logs
router.get("/", custom_authenticate_token_1.admin_authenticate, log_controller_1.getAllLogsController);
// Add a new log
router.post("/", custom_authenticate_token_1.admin_authenticate, log_controller_1.addNewLogController);
exports.default = router;
