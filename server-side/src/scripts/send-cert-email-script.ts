import path from "path";
import fs from "fs";

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

import { TCertificateData } from "../mail_template/mail.interface";
import { certificateOfParticipationEmail } from "../mail_template/mail.template";
import { CertificateDataSchema } from "../mail_template/mail.schema";

/**
 * Generate automated certs and sending an email payload to target email
 */
export async function sendCertEmail(
  testDataPath: string,
  studentEmail: string
) {
  const root = path.resolve(__dirname, "..");
  const fullDataPath = path.join(root, testDataPath);

  if (!fs.existsSync(fullDataPath))
    throw Error("The path to test data does not exist.");

  const data = JSON.parse(
    fs.readFileSync(fullDataPath, "utf-8")
  ) as TCertificateData;

  if (!studentEmail) throw Error("The studentEmail argument is required.");
  if (!data) throw Error("Failed to parse data from the provided path.");

  const parsedData = CertificateDataSchema.parse(data);

  const res = (await certificateOfParticipationEmail(
    parsedData,
    studentEmail
  )) as {
    status: boolean;
    message: string;
  };
  return res;
}

const args = process.argv.slice(2);

sendCertEmail(args[0], args[1] || "");

// run script: npx ts-node scripts/send-cert-email-script.ts [path-to-test-data] [email]
