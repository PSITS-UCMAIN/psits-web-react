import { Request, Response } from "express";
import { Log } from "../models/log.model";
import { Admin } from "../models/admin.model";

export const getAllLogsController = async (req: Request, res: Response) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }); // Fetch logs,
    if (!logs) {
      res.status(400).json({ message: "No logs" });
    }
    res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Internal Server Error", error: error });
  }
};

export const addNewLogController = async (req: Request, res: Response) => {
  try {
    const { admin_id, action, target, target_id, target_model } = req.body;

    // Find the admin using the admin_id
    const admin = await Admin.findOne({ id_number: admin_id });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const log = new Log({
      admin: admin.name,
      admin_id: admin._id,
      action,
      target,
      target_id,
      target_model,
    });

    await log.save();

    res.status(200).json({ message: "Action logged successfully" });
  } catch (error) {
    console.error("Error logging action:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
