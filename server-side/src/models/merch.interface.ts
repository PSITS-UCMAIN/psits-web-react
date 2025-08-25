export interface IOrderDetails {
  product_name: string;
  reference_code: string;
  id_number: string;
  student_name: string;
  rfid?: string;
  course: string;
  year: number;
  batch: string;
  size?: [String];
  variation?: [String];
  quantity: number;
  total: number;
  order_date: string;
  transaction_date: string;
}
export interface ISales {
  unitsSold: number;
  totalRevenue: number;
}

export interface IMerch {
  name: string;
  price: number;
  stocks: number;
  batch: string;
  description: string;
  selectedVariations?: [String];
  selectedSizes: Map<string, ISelectedSize>;
  selectedAudience: string;
  control: string;
  created_by: string;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  category: string;
  type: string;
  imageUrl?: [String];
  sales_data: ISales;
  order_details: IOrderDetails[];
  timestamps: boolean;
}

export interface ISelectedSize {
  custom: boolean;
  price: string;
}
