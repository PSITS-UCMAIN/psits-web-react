import { IEmail } from "../models/email.interface";
import { EmailQueue } from "../models/email.model";
import { Types } from "mongoose";
import { studentService } from "./student.service";
import { AppError } from "../util/app.error.util";

class EmailService {
  //Create Queue email service
  create = async (type: string, studentId: Types.ObjectId) => {
    const student = await studentService.getSpecific({ _id: studentId });

    if (!student) {
      throw new AppError("No student found!", 404);
    }
    if (!student.email) {
      throw new AppError("No email found!", 404);
    }

    //Create
    await new EmailQueue({
      type,
      studentId,
      email: student.email,
    }).save();
  };
  //Create email queue by email directly
  createByEmail = async (
    type: string,
    email: string,
    subtype?: string,
    referenceCode?: string
  ) => {
    return await new EmailQueue({
      type,
      studentId: null,
      email,
      status: "pending",
      subtype,
      referenceCode,
    }).save();
  };
  //Update Email
  update = async (studentId: Types.ObjectId, status: string) => {
    await EmailQueue.findOneAndUpdate(
      { studentId },
      {
        $set: {
          status: status,
        },
      },
      { new: true }
    );
  };
  //Update email status in webhook using email address
  updateStatusByEmailId = async (emailId: string, status: string) => {
    const result = await EmailQueue.findOneAndUpdate(
      { emailId },
      { $set: { status } },
      { new: true }
    );
    if (!result) {
      return false;
    }
    return true;
  };
  //Update status by queue entry id
  updateStatusById = async (id: string, status: string) => {
    return await EmailQueue.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );
  };
  //Increment retry count
  incrementRetry = async (id: string) => {
    return await EmailQueue.findByIdAndUpdate(id, {
      $inc: { retryCount: 1 },
    });
  };
  //Mark as failed
  markAsFailed = async (id: string) => {
    return await EmailQueue.findByIdAndUpdate(
      id,
      { $set: { status: "failed" } },
      { new: true }
    );
  };
  //Fetch emailqueue by receipt type
  fetchByReceipt = async () => {
    return await EmailQueue.find({
      type: "receipt",
      status: "pending",
    }).sort({ createdAt: 1, retryCount: 1 });
  };
  updateEmailIdById = async (id: string, emailId: string) => {
    return await EmailQueue.findByIdAndUpdate(
      id,
      { $set: { emailId } },
      { new: true }
    );
  };

  countBySubtypeToday = async (email: string, subtype: string) => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
    }).format(new Date());
    const startOfDay = new Date(`${today}T00:00:00+08:00`);

    return await EmailQueue.countDocuments({
      email,
      subtype,
      timestamp: { $gte: startOfDay },
    });
  };
}

export const emailService = new EmailService();
