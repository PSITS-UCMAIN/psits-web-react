import { Types } from "mongoose";
import { IAttendee } from "./attendee.interface";

export interface IEvent {
  eventId: Types.ObjectId;
  eventName: string;
  eventImage?: [String];
  eventDate: Date;
  eventEndDate?: Date;
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
  isGenerateCertificate?: boolean;
  certificateTemplate?: Types.ObjectId;
  eligibleStudentsForCertificate?: string[];
  eventVenue?: string;
  eventTheme?: string;
  eventVenueSpecific?: string;
  eventStartTime?: string;
  eventEndTime?: string;
}

export interface ISalesData {
  campus: "UC_MAIN" | "UC_BANILAD" | "UC_LM" | "UC_PT" | "UC_CS";
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
  oneSessionOnly?: boolean;
}

export interface ICampusLimit {
  campus: "UC_MAIN" | "UC_BANILAD" | "UC_LM" | "UC_PT" | "UC_CS";
  limit: number;
}
