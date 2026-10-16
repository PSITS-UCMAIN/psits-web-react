export interface SelectedMerchandise {
  _id: string;
  name: string;
}

export type PromoType =
  | "Members"
  | "Students"
  | "All Students"
  | "Specific"
  | "Membership";

export type PromoScope = "Merchandise" | "Category" | "Both";

export type LimitType = "Limited" | "Unlimited";

export type SingleStudentLimit = "yes" | "no";

export type StatusBadge = "Active" | "Upcoming" | "Expired";

export interface PromoFormData {
  promoName: string;
  type: PromoType;
  limitType: LimitType;
  singleStudent: SingleStudentLimit;
  selectedAudience: string[] | "All Students";
  selectedMerchandise: SelectedMerchandise[];
  selectedCategories: string[];
  promoScope: PromoScope;
  discount: number;
  quantity: number;
  startDate: string;
  endDate: string;
}

export interface PromoUsageItem {
  id_number: string;
  promo_used?: string;
}

export interface PromoListRow {
  _id: string;
  promo_name: string;
  type: string;
  limit_type: string;
  one_person_limit: boolean;
  selected_audience: string[];
  selected_specific_students: string[];
  selected_categories: string[];
  promo_scope: string;
  discount: number;
  quantity: number;
  start_date: string;
  end_date: string;
  status: string;
  created_by?: string;
  selected_merchandise: SelectedMerchandise[];
}

export interface PromoViewData extends PromoListRow {
  items?: Array<{
    _id: string;
    id_number: string;
    name?: string;
    promo_used?: string;
  }>;
}

export interface PromoLogEntry {
  _id: string;
  description: string;
  date: string;
}

export const TEAM_ROLES = [
  "officers",
  "media",
  "developer",
  "volunteer",
  "finance",
] as const;
