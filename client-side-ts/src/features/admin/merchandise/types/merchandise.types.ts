import type {
  MerchandiseItem,
  PromoMerchandiseItem,
} from "@/features/admin/api/admin";

export type MerchandiseSection = "products";

export type ProductStatus =
  | "Published"
  | "Inactive"
  | "Out of Stock"
  | "Expired";

export type ProductSortField =
  | "name"
  | "price"
  | "batch"
  | "control"
  | "status";

export interface ProductFilters {
  statuses: ProductStatus[];
  controls: string[];
  batches: string[];
  confirmedOn: string;
}

export interface PromoFilters {
  statuses: string[];
  types: string[];
  limitTypes: string[];
}

export interface MerchandiseSort<TField extends string> {
  field: TField;
  direction: "asc" | "desc";
}

export interface ProductSizeOption {
  custom: boolean;
  price: string;
}

export interface SessionConfigValues {
  isMorningEnabled: boolean;
  morningTime: string;
  isAfternoonEnabled: boolean;
  afternoonTime: string;
  isEveningEnabled: boolean;
  eveningTime: string;
}

export interface ProductFormValues {
  name: string;
  price: string;
  discount: string;
  stocks: string;
  batch: string;
  description: string;
  start_date: string;
  end_date: string;
  category: string;
  type: string;
  control: string;
  selectedAudience: string;
  selectedVariations: string[];
  selectedSizes: Record<string, ProductSizeOption>;
  isEvent: boolean;
  eventDate: string;
  sessionConfig: SessionConfigValues;
}

export interface ProductImageState {
  files: File[];
  previews: string[];
  removedUrls: string[];
}

export interface PromoFormValues {
  promoId?: string;
  promoName: string;
  audienceType: "Members" | "Students" | "";
  studentType: "Specific" | "All Students" | "";
  limitType: "Limited" | "Unlimited";
  singleStudent: "yes" | "no";
  selectedMembers: string[];
  selectedStudents: string[];
  selectedMerchandise: PromoMerchandiseItem[];
  startDate: string;
  endDate: string;
  quantity: string;
  discount: string;
}

export type AdminMerchandiseProduct = MerchandiseItem;

