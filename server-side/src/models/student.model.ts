import mongoose, { Schema, Document, Types } from "mongoose";
import { IStudent } from "./student.interface";
import { CartItem, cartItemSchema } from "./cart.model";

export interface IStudentDocument extends IStudent, Document {}

const studentSchema = new Schema<IStudentDocument>({
  id_number: {
    type: String,
    unique: true,
  },
  rfid: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  first_name: {
    type: String,
    required: true,
  },
  middle_name: {
    type: String,
  },
  last_name: {
    type: String,
    required: true,
  },
  email: {
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
  isYearUpdated: {
    type: Boolean,
    required: false,
  },
  status: {
    type: String,
  },
  membershipStatus: {
    type: String,
    default: "NOT_APPLIED",
  },
  applied: {
    type: String,
  },
  campus: {
    type: String,
  },
  deletedBy: {
    type: String,
  },
  deletedDate: {
    type: String,
  },
  isFirstApplication: {
    type: Boolean,
    default: true,
  },

  role: {
    type: String,
  },
  isRequest: {
    type: Boolean,
  },
  adminRequest: {
    type: String,
  },

  cart: [cartItemSchema],
});

export const Student = mongoose.model<IStudentDocument>(
  "Student",
  studentSchema
);
