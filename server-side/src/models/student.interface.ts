import { ICart } from "./cart.interface";
import { ICartDocument } from "./cart.model";

export interface IStudent {
  id_number: string;
  rfid?: string;
  password: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  course: string;
  year: number;
  status: string;
  membershipStatus: string;
  applied?: string;
  campus: string;
  deletedBy: string;
  deletedDate: string;
  isFirstApplication: boolean;
  role: string;
  isRequest: boolean;
  adminRequest: string;
  cart: ICartDocument[];
}
