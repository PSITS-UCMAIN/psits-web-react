import { ICart } from "../models/cart.interface";

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

export interface IForgotPasswordData {
  url: string;
  token: string;
}

export interface ISignee {
  name: string;
  designation: string;
}

export interface ICertificateData {
  student_name: string;
  event_name: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  event_venue: string;
  signees: ISignee[];
  extra_details?: { key: string; value: string }[];
}

