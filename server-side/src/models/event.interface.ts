import { Types } from "mongoose";
import { IAttendee } from "./attendee.interface";
export interface IEvent {
  eventId: Types.ObjectId;
  eventName: string;
  eventImage?: [String];
  eventDate: Date;
  eventDescription: string;
  attendanceType: string;
  sessionConfig: ISessionConfig;
  createdBy: string;
  attendees: IAttendee[];
  status: string;
  limit: ICampusLimit[];
  sales_data: ISalesData[];
  totalUnitsSold: number;
  totalRevenueAll: number;
}
export interface ISalesData {
  campus: "UC-Main" | "UC-Banilad" | "UC-LM" | "UC-PT" | "UC-CS";
  unitsSold: number;
  totalRevenue: number;
}
export interface ISessionConfigType {
  enabled: boolean;
  timeRange: string;
}
export interface ISessionConfig {
  morning?: ISessionConfigType;
  afternoon?: ISessionConfigType;
  evening?: ISessionConfigType;
}
export interface ICampusLimit {
  campus: "UC-Main" | "UC-Banilad" | "UC-LM" | "UC-PT" | "UC-CS";
  limit: number;
}
