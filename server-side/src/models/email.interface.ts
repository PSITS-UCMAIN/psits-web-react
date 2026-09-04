import { Types } from "mongoose";
export interface IEmail {
  timestamp: Date;
  type: "receipt" | "forgot" | "auth" | "recruitment" | "automation-report";
  studentId: Types.ObjectId;
  email: String;
  status: "pending" | "sent" | "failed" | "delivered";
  subtype?: string;
  referenceCode?: string;
  payload?: string;
  htmlBody?: string;
  retryCount?: number;
  emailId?: string; // Add emailId field to store the email ID from Resend
}
