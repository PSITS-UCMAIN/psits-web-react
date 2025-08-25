import { Types } from "mongoose";

export interface ICart {
  product_id: Types.ObjectId;
  imageUrl1: string;
  product_name: string;
  limited: boolean;
  start_date: Date;
  end_date: Date;
  category: string;
  price: number;
  quantity: number;
  sub_total: number;
  variation?: [String];
  sizes?: [String];
  batch: string;
}
