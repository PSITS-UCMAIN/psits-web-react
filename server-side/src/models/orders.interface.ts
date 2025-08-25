import { ICart } from "./cart.interface";
export interface IOrders {
  id_number: string;
  rfid?: string;
  membership_discount: boolean;
  student_name: string;
  course: string;
  year: number;
  items: ICart[];
  total: number;
  order_date: Date;
  transaction_date: Date;
  order_status: string;
  admin: string;
  reference_code: string;
  role: string;
}
