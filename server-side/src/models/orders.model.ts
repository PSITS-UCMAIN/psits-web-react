import mongoose, { Schema, Document, Types } from "mongoose";
import { CartItem, cartItemSchema } from "./cart.model";
import { IOrders } from "./orders.interface";

export interface IOrdersDocument extends IOrders, Document {}

const orderSchema = new Schema<IOrdersDocument>({
  id_number: {
    type: String,
    ref: "Student",
    required: true,
  },
  rfid: {
    type: String,
  },
  membership_discount: {
    type: Boolean,
  },
  student_name: {
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
  items: [cartItemSchema],
  total: {
    type: Number,
    required: true,
  },
  order_date: {
    type: Date,
    required: true,
  },
  transaction_date: {
    type: Date,
  },
  order_status: {
    type: String,
    required: true,
  },
  admin: {
    type: String,
  },
  reference_code: {
    type: String,
  },
  role: {
    type: String,
  },
});

export const Orders = mongoose.model<IOrdersDocument>("Orders", orderSchema);
