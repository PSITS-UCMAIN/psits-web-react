import mongoose, { Schema, Document } from "mongoose";
import {
  ISalesData,
  ISessionConfigType,
  IEvent,
  ISessionConfig,
} from "./event.interface";
import { attendeeSchema } from "./attendee.model";

export interface ISalesDataDocument extends ISalesData, Document {}
export interface ISessionConfigDocument extends ISessionConfig, Document {}
export interface ISessionConfigTypeDocument
  extends ISessionConfigType, Document {}
export interface IEventDocument extends IEvent, Document {}

const salesDataSchema = new Schema<ISalesDataDocument>({
  campus: {
    type: String,
    enum: ["UC_MAIN", "UC_BANILAD", "UC_LM", "UC_PT", "UC_CS"],
    required: true,
  },
  unitsSold: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
});

const sessionConfigTypeSchema = new Schema<ISessionConfigTypeDocument>(
  {
    enabled: { type: Boolean },
    timeRange: { type: String },
  },
  { _id: false }
);

const eventSchema = new Schema<IEventDocument>({
  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Merch",
    required: true,
  },
  eventName: { type: String, required: true },
  eventImage: { type: Array },
  eventDate: { type: Date },
  eventEndDate: { type: Date },
  eventDescription: { type: String, required: true },
  attendanceType: {
    type: String,
    enum: ["ticketed", "open"],
    default: "ticketed",
  },
  sessionConfig: {
    type: new Schema<ISessionConfigDocument>(
      {
        morning: { type: sessionConfigTypeSchema, required: true },
        afternoon: { type: sessionConfigTypeSchema, required: true },
        evening: { type: sessionConfigTypeSchema, required: true },
        oneSessionOnly: { type: Boolean, default: false },
      },
      { _id: false }
    ),
    default: {
      morning: { enabled: true, timeRange: "" },
      afternoon: { enabled: false, timeRange: "" },
      evening: { enabled: false, timeRange: "" },
      oneSessionOnly: false,
    },
  },
  createdBy: { type: String, required: true },
  attendees: { type: [attendeeSchema], default: [] },
  status: { type: String, required: true },

  limit: {
    type: [
      {
        campus: {
          type: String,
          enum: ["UC_MAIN", "UC_BANILAD", "UC_LM", "UC_PT", "UC_CS"],
          required: true,
        },
        limit: { type: Number, required: true },
      },
    ],
    default: [
      { campus: "UC_MAIN", limit: 0 },
      { campus: "UC_BANILAD", limit: 0 },
      { campus: "UC_LM", limit: 0 },
      { campus: "UC_PT", limit: 0 },
      { campus: "UC_CS", limit: 0 },
    ],
  },
  sales_data: {
    type: [salesDataSchema],
    default: [
      { campus: "UC_MAIN", unitsSold: 0, totalRevenue: 0 },
      { campus: "UC_BANILAD", unitsSold: 0, totalRevenue: 0 },
      { campus: "UC_LM", unitsSold: 0, totalRevenue: 0 },
      { campus: "UC_PT", unitsSold: 0, totalRevenue: 0 },
      { campus: "UC_CS", unitsSold: 0, totalRevenue: 0 },
    ],
  },
  totalUnitsSold: { type: Number, default: 0 },
  totalRevenueAll: { type: Number, default: 0 },
  isGenerateCertificate: { type: Boolean, default: false },
  certificateTemplate: { type: Schema.Types.ObjectId, ref: "CertificateTemplate" },
  eligibleStudentsForCertificate: { type: [String], default: [] },
  eventVenue: { type: String, default: "" },
  eventTheme: { type: String, default: "" },
  eventVenueSpecific: { type: String, default: "" },
  eventStartTime: { type: String, default: "" },
  eventEndTime: { type: String, default: "" },
});

// Normalize legacy hyphenated campus codes (e.g. "UC-Main") to canonical
// underscore-uppercase codes (e.g. "UC_MAIN") used by the schema enum.
const CANONICAL_CAMPUS_MAP: Record<string, string> = {
  "UC-Main": "UC_MAIN",
  "UC-Banilad": "UC_BANILAD",
  "UC-LM": "UC_LM",
  "UC-PT": "UC_PT",
  "UC-CS": "UC_CS",
};

const normalizeCampusCode = (value: unknown): string => {
  const str = String(value ?? "").trim();
  return CANONICAL_CAMPUS_MAP[str] ?? str;
};

eventSchema.pre("save", function (next) {
  if (Array.isArray(this.limit)) {
    for (const entry of this.limit) {
      if (entry && typeof entry === "object" && "campus" in entry) {
        entry.campus = normalizeCampusCode(entry.campus) as
          | "UC_MAIN"
          | "UC_BANILAD"
          | "UC_LM"
          | "UC_PT"
          | "UC_CS";
      }
    }
  }
  if (Array.isArray(this.sales_data)) {
    for (const entry of this.sales_data) {
      if (entry && typeof entry === "object" && "campus" in entry) {
        entry.campus = normalizeCampusCode(entry.campus) as
          | "UC_MAIN"
          | "UC_BANILAD"
          | "UC_LM"
          | "UC_PT"
          | "UC_CS";
      }
    }
  }
  next();
});

export const Event = mongoose.model<IEventDocument>("event", eventSchema);
