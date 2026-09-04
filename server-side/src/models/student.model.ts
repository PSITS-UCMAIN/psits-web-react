import mongoose, { Schema, Types } from "mongoose";
import { IStudentDocument } from "./student.interface";
import { CartItem, cartItemSchema } from "./cart.model";
import { membership_status } from "../enums/status.enums";

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
  },
  course: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
  },
  membershipStatus: {
    type: String,
    default: membership_status.NONE,
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

  currentRefreshToken: {
    type: String,
    default: null,
  },
});

export const Student = mongoose.model<IStudentDocument>(
  "Student",
  studentSchema
);
