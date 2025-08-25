"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addNewLogController = exports.getAllLogsController = void 0;
const log_model_1 = require("../models/log.model");
const admin_model_1 = require("../models/admin.model");
const getAllLogsController = async (req, res) => {
    try {
        const logs = await log_model_1.Log.find().sort({ timestamp: -1 }); // Fetch logs,
        if (!logs) {
            res.status(400).json({ message: "No logs" });
        }
        res.status(200).json(logs);
    }
    catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({ message: "Internal Server Error", error: error });
    }
};
exports.getAllLogsController = getAllLogsController;
const addNewLogController = async (req, res) => {
    try {
        const { admin_id, action, target, target_id, target_model } = req.body;
        // Find the admin using the admin_id
        const admin = await admin_model_1.Admin.findOne({ id_number: admin_id });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        const log = new log_model_1.Log({
            admin: admin.name,
            admin_id: admin._id,
            action,
            target,
            target_id,
            target_model,
        });
        await log.save();
        res.status(200).json({ message: "Action logged successfully" });
    }
    catch (error) {
        console.error("Error logging action:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.addNewLogController = addNewLogController;
