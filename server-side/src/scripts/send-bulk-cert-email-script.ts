import fs from "fs";
import path from "path";
import { TCertificateData } from "../mail_template/mail.interface";
import { normalizeFinalPath } from "../utils/path-normalizer";
import { CertificateDataSchema } from "../mail_template/mail.schema";

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

import { certificateOfParticipationEmail } from "../mail_template/mail.template"; // Important: Must be after dotenv

export interface IBulkEmail {
  studentData: TCertificateData;
  studentEmail: string;
}

const ROOT = path.resolve(__dirname, "..");

/**
 * Generate automated participation certs and sending email payloads to multiple users
 */
async function sendBulkCertEmails(testDataPath: string) {
  const fullDataPath = normalizeFinalPath(ROOT, testDataPath);

  if (!fs.existsSync(fullDataPath))
    throw Error("The path to test data does not exist.");

  const students = JSON.parse(
    fs.readFileSync(fullDataPath, "utf-8")
  ) as IBulkEmail[];

  for (const student of students) {
    const start = performance.now();

    const parsedData = CertificateDataSchema.parse(student.studentData);
    const res = (await certificateOfParticipationEmail(
      parsedData,
      student.studentEmail
    )) as { status: boolean; message: string };
    if (!res.status) throw new Error(res.message);
    console.log("Successfully sent email");

    const end = performance.now();
    console.log(`Execution time: ${end - start} ms`);
  }

  console.log({ status: true, message: "Succesfully sent all emails." });
}

const args = process.argv.slice(2);

sendBulkCertEmails(args[0] || "");

// run script: npx ts-node scripts/send-bulk-cert-email-script.ts [path-to-test=data]
