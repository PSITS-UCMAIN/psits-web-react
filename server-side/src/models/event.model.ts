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
  extends ISessionConfigType,
    Document {}
export interface IEventDocument extends IEvent, Document {}

const salesDataSchema = new Schema<ISalesDataDocument>({
  campus: {
    type: String,
    enum: ["UC-Main", "UC-Banilad", "UC-LM", "UC-PT", "UC-CS"],
    required: true,
  },
  unitsSold: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
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
  eventName: {
    type: String,
    required: true,
  },
  eventImage: {
    type: Array,
  },
  eventDate: {
    type: Date,
  },
  eventDescription: {
    type: String,
    required: true,
  },
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
      },
      { _id: false }
    ),
    default: {
      morning: { enabled: true, timeRange: "" },
      afternoon: { enabled: false, timeRange: "" },
      evening: { enabled: false, timeRange: "" },
    },
  },
  createdBy: { type: String, required: true },
  attendees: {
    type: [attendeeSchema],
    default: [],
  },
  status: {
    type: String,
    required: true,
  },
  limit: {
    type: [
      {
        campus: {
          type: String,
          enum: ["UC-Main", "UC-Banilad", "UC-LM", "UC-PT", "UC-CS"],
          required: true,
        },
        limit: {
          type: Number,
          required: true,
        },
      },
    ],
    default: [
      { campus: "UC-Main", limit: 0 },
      { campus: "UC-Banilad", limit: 0 },
      { campus: "UC-LM", limit: 0 },
      { campus: "UC-PT", limit: 0 },
      { campus: "UC-CS", limit: 0 },
    ],
  },
  sales_data: {
    type: [salesDataSchema],
    default: [
      { campus: "UC-Main", unitsSold: 0, totalRevenue: 0 },
      { campus: "UC-Banilad", unitsSold: 0, totalRevenue: 0 },
      { campus: "UC-LM", unitsSold: 0, totalRevenue: 0 },
      { campus: "UC-PT", unitsSold: 0, totalRevenue: 0 },
      { campus: "UC-CS", unitsSold: 0, totalRevenue: 0 },
    ],
  },
  totalUnitsSold: {
    type: Number,
    default: 0,
  },
  totalRevenueAll: {
    type: Number,
    default: 0,
  },
});

export const Event = mongoose.model<IEventDocument>("event", eventSchema);
