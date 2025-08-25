import mongoose, { Schema, Document } from "mongoose";
import { IOrderDetails, ISales, IMerch } from "./merch.interface";

export interface IOrderDetailsDocument extends IOrderDetails, Document {}

const orderDetailSchema = new Schema<IOrderDetailsDocument>({
  product_name: {
    type: String,
  },
  reference_code: {
    type: String,
  },
  id_number: {
    type: String,
    required: true,
  },
  student_name: {
    type: String,
    required: true,
  },
  rfid: {
    type: String,
  },
  course: {
    type: String,
  },
  year: {
    type: Number,
  },
  batch: {
    type: String,
  },
  size: {
    type: [String],
  },
  variation: {
    type: [String],
  },
  quantity: {
    type: Number,
  },
  total: {
    type: Number,
    required: true,
  },
  order_date: {
    type: String,
    required: true,
  },
  transaction_date: {
    type: String,
  },
});

export interface ISalesDataDocument extends ISales, Document {}
const salesDataSchema = new Schema<ISalesDataDocument>({
  unitsSold: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
});

export interface IMerchDocument extends IMerch, Document {}

const merchSchema = new Schema<IMerchDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    stocks: {
      type: Number,
      required: true,
    },
    batch: {
      type: String,
    },
    description: {
      type: String,
    },
    selectedVariations: {
      type: [String],
    },
    selectedSizes: {
      type: Map,
      of: new mongoose.Schema({
        custom: Boolean,
        price: String,
      }),
    },
    selectedAudience: {
      type: String,
    },
    control: {
      type: String,
      required: true,
    },
    created_by: {
      type: String,
      required: true,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
    },
    is_active: {
      type: Boolean,
      default: true,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: [String],
    },

    sales_data: {
      type: salesDataSchema,
      default: () => ({}),
    },
    order_details: [orderDetailSchema],
  },
  { timestamps: true }
);

export const Merch = mongoose.model<IMerchDocument>("merch", merchSchema);
