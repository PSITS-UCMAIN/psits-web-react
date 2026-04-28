import { ICart } from "../models/cart.interface";
import { CertificateDataSchema, SigneeSchema } from "./mail.schema";
import { z } from "zod";

export interface IMembershipRequest {
  name: string;
  reference_code: string;
  cash: number;
  total: number;
  course: string;
  year: number;
  admin: string;
  date: string;
  change: number;
}
export interface IOrderReceipt {
  reference_code: string;
  transaction_date: string;
  student_name: string;
  rfid?: string;
  course: string;
  year: number;
  admin: string;
  items: ICart[];
  cash: number;
  total: number;
}

/**
 * Note: Use relative path to /assets. e.g. images/logo.png
 */
export type TCertificateData = z.infer<typeof CertificateDataSchema>;
export type TSignee = z.infer<typeof SigneeSchema>;
