import { Schema, Document } from "mongoose";
import {
  IAttendanceSessionType,
  IAttendee,
  IAttendanceSession,
} from "./attendee.interface";

export interface IAttendanceSessionTypeDocument
  extends IAttendanceSessionType,
    Document {}
export interface IAttendanceSessionDocument
  extends IAttendanceSession,
    Document {}
export interface IAttendeeDocument extends IAttendee, Document {}

const attendanceSessionSchema = new Schema<IAttendanceSessionTypeDocument>(
  {
    attended: { type: Boolean, default: false },
    timestamp: { type: Date },
  },
  { _id: false }
);

export const attendeeSchema = new Schema<IAttendeeDocument>({
  id_number: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  course: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  campus: {
    type: String,
    required: true,
  },

  attendance: {
    type: new Schema<IAttendanceSessionDocument>(
      {
        morning: attendanceSessionSchema,
        afternoon: attendanceSessionSchema,
        evening: attendanceSessionSchema,
      },
      { _id: false }
    ),
    required: false,
  },
  confirmedBy: {
    type: String,
  },
  shirtSize: {
    type: String,
  },
  shirtPrice: {
    type: Number,
  },
  raffleIsRemoved: {
    type: Boolean,
    default: false,
  },
  raffleIsWinner: {
    type: Boolean,
    default: false,
  },
  transactBy: {
    type: String,
  },
  transactDate: {
    type: Date,
  },
});
