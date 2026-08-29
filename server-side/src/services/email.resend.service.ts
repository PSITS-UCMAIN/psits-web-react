import ejs from "ejs";
import path from "path";
import fs from "fs/promises";
import { emailService } from "./email.service";
import { Orders } from "../models/orders.model";
import { MembershipHistory } from "../models/history.model";
import { orderService } from "./order.service";
import { format } from "date-fns";
import { Resend } from "resend";
import { EmailQueue } from "../models/email.model";
import { AutomationJob } from "../models/automationJob.model";

const MAX_RETRIES = 3;

interface PendingEntry {
  _id: string;
  email: string;
  subtype: string;
  referenceCode: string;
  payload?: string;
  htmlBody?: string;
  retryCount: number;
  type?: string;
}

const toPendingEntry = (entry: any): PendingEntry => ({
  _id: entry._id.toString(),
  email: String(entry.email),
  subtype: entry.subtype || "",
  referenceCode: entry.referenceCode || "",
  payload: entry.payload || undefined,
  htmlBody: entry.htmlBody || undefined,
  retryCount: entry.retryCount || 0,
});

const renderMembershipEmail = async (data: {
  name: string;
  reference_code: string;
  cash: number;
  total: number;
  course: string;
  year: number;
  admin: string;
  date: string;
  change: number;
}) => {
  const templatePath = path.join(
    __dirname,
    "../assets/appr-membership-receipt.ejs"
  );
  const html = await ejs.renderFile(templatePath, data);
  return html;
};

const renderOrderEmail = async (data: {
  reference_code: string;
  transaction_date: string;
  student_name: string;
  id_number: string;
  course: string;
  year: number;
  admin: string;
  items: Array<{
    product_name: string;
    batch: string | number;
    sizes: string[];
    variation: string[];
    quantity: number;
    sub_total: number;
  }>;
  cash: number;
  total: number;
}) => {
  const templatePath = path.join(__dirname, "../assets/appr-order-receipt.ejs");
  const html = await ejs.renderFile(templatePath, data);
  return html;
};

const sendWithResend = async ({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename?: string;
    content?: Buffer;
    contentType?: string;
    contentId?: string;
  }>;
}) => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL;

  if (!from) throw new Error("EMAIL is not configured");

  console.log("Function is called");
  const result = await resend.emails.send({
    from,
    to,
    subject,
    html,
    attachments,
  });
  console.log("Resend result:", result);
  if (result.error) throw new Error(result.error.message);
  return result.data?.id;
};

const RESEND_BATCH_LIMIT = 50;

export const resendPendingEmails = async () => {
  const [receiptEntries, automationEntries] = await Promise.all([
    emailService.fetchByReceipt(),
    EmailQueue.find({ type: "automation-report", status: "pending" })
      .sort({ timestamp: 1, retryCount: 1 })
      .lean(),
  ]);

  const allEntries = [...receiptEntries, ...automationEntries];
  if (allEntries.length === 0) {
    return;
  }

  const batch = allEntries.slice(0, RESEND_BATCH_LIMIT);

  for (const rawEntry of batch) {
    const entry = toPendingEntry(rawEntry);

    try {
      if (entry.retryCount >= MAX_RETRIES) {
        await emailService.markAsFailed(entry._id);
        continue;
      }

      if (entry.type === "automation-report") {
        await resendAutomationReport(entry);
      } else if (entry.subtype === "membership") {
        await resendMembership(entry);
      } else if (entry.subtype === "order") {
        await resendOrder(entry);
      }

      await emailService.updateStatusById(entry._id, "sent");
    } catch (err: any) {
      console.error(
        `[1AM PH] Failed to resend ${entry.subtype} receipt (${entry.referenceCode}):`,
        err.message
      );
      await emailService.incrementRetry(entry._id);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

const resendAutomationReport = async (entry: PendingEntry) => {
  let reportPayload: {
    jobName: string;
    executionTime: string;
    results: Array<{
      success: boolean;
      data?: unknown;
      recordCount: number;
      durationMs: number;
      error?: string;
    }>;
    includeSummary: boolean;
    includeRawData: boolean;
    subject: string;
  };

  try {
    reportPayload = JSON.parse(entry.payload || "{}");
  } catch {
    throw new Error("Invalid automation report payload");
  }

  const templatePath = path.join(
    __dirname,
    "../templates/automation-report.ejs"
  );
  let html: string;

  if (entry.htmlBody) {
    html = entry.htmlBody;
  } else {
    html = await ejs.renderFile(templatePath, {
      jobName: reportPayload.jobName,
      executionTime: new Date(reportPayload.executionTime).toLocaleString(
        "en-US",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Manila",
        }
      ),
      results: reportPayload.results,
      includeSummary: reportPayload.includeSummary,
      includeRawData: reportPayload.includeRawData,
      targetCount: 1,
      subject: reportPayload.subject,
    });
  }

  const logoPath = path.join(__dirname, "../assets/psits.jpg");
  const logoBuffer = await fs.readFile(logoPath);

  const emailId = await sendWithResend({
    to: entry.email,
    subject: reportPayload.subject,
    html,
    attachments: [
      {
        filename: "psits.jpg",
        content: logoBuffer,
        contentType: "image/jpeg",
        contentId: "logo",
      },
    ],
  });
  if (emailId) {
    await emailService.updateEmailIdById(entry._id, emailId);
  }
};

const resendMembership = async (entry: PendingEntry) => {
  const history = await MembershipHistory.findOne({
    reference_code: entry.referenceCode,
  });

  if (!history) {
    throw new Error(`Membership history not found for ${entry.referenceCode}`);
  }

  const cash = history.total;
  const data = {
    name: history.name,
    reference_code: history.reference_code,
    cash,
    total: history.total,
    course: history.course,
    year: history.year,
    admin: history.admin,
    date: format(new Date(history.date), "MMMM d, yyyy"),
    change: 0,
  };

  const html = await renderMembershipEmail(data);
  const logoPath = path.join(__dirname, "../assets/psits.jpg");
  const logoBuffer = await fs.readFile(logoPath);

  const emailId = await sendWithResend({
    to: entry.email,
    subject: "Your Receipt from PSITS - UC Main",
    html,
    attachments: [
      {
        filename: "psits.jpg",
        content: logoBuffer,
        contentType: "image/jpeg",
        contentId: "logo",
      },
    ],
  });
  if (emailId) {
    await emailService.updateEmailIdById(entry._id, emailId);
  }
};

const resendOrder = async (entry: PendingEntry) => {
  const order = await Orders.findOne({
    reference_code: entry.referenceCode,
  });

  if (!order) {
    throw new Error(`Order not found for ${entry.referenceCode}`);
  }

  const cash = order.total;
  const receiptData = {
    reference_code: order.reference_code,
    transaction_date: order.transaction_date
      ? format(new Date(order.transaction_date), "MMMM d, yyyy")
      : "N/A",
    student_name: order.student_name,
    id_number: order.id_number,
    course: order.course,
    year: order.year,
    admin: order.admin || "N/A",
    items: order.items.map((item: any) => ({
      product_name: item.product_name,
      batch: item.batch,
      sizes: item.sizes || [],
      variation: item.variation || [],
      quantity: item.quantity,
      sub_total: item.sub_total,
    })),
    cash,
    total: order.total,
  };

  const html = await renderOrderEmail(receiptData);
  const logoPath = path.join(__dirname, "../assets/psits.jpg");
  const logoBuffer = await fs.readFile(logoPath);

  const emailId = await sendWithResend({
    to: entry.email,
    subject: "Your Order Receipt from PSITS - UC Main",
    html,
    attachments: [
      {
        filename: "psits.jpg",
        content: logoBuffer,
        contentType: "image/jpeg",
        contentId: "logo",
      },
    ],
  });
  if (emailId) {
    await emailService.updateEmailIdById(entry._id, emailId);
  }
};
