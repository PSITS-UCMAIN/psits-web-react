/**
 * Central API Response Types
 *
 * This file contains all TypeScript interfaces for API requests and responses
 * across the application. These types ensure type safety and reduce the use
 * of `any` types throughout the codebase.
 */

// ============================================================================
// Student API Types
// ============================================================================

export interface StudentSearchResult {
  _id?: string;
  id_number: string;
  first_name: string;
  last_name: string;
  name?: string;
  email?: string;
  course?: string;
  year?: string | number;
  campus?: string;
  [key: string]: unknown;
}

export interface StudentUpdateYearResponse {
  message: string;
  updatedStudent?: StudentSearchResult;
}

// ============================================================================
// Orders API Types
// ============================================================================

export interface CartItemData {
  product_id?: string;
  _id?: string;
  id?: string;
  product_name?: string;
  name?: string;
  title?: string;
  price?: number;
  unit_price?: number;
  sub_total?: number;
  quantity?: number;
  qty?: number;
  units?: number;
  variation?: string[];
  sizes?: string[];
  imageUrl1?: string;
  image?: string;
  img?: string;
  color?: string;
  variant?: string;
  batch?: string;
  category?: string;
  start_date?: string | Date;
  end_date?: string | Date;
  limited?: boolean;
}

export interface PromoData {
  _id?: string;
  promo_name: string;
  promo_discount?: boolean;
}

export interface OrderData {
  _id?: string;
  orderId?: string;
  id_number: string;
  rfid?: string;
  membership_discount?: boolean;
  promo?: PromoData | null;
  student_name?: string;
  course?: string;
  year?: number;
  items?: CartItemData[];
  total?: number;
  order_date?: string | Date;
  transaction_date?: string | Date;
  order_status?: string;
  status?: string;
  admin?: string;
  reference_code?: string;
  role?: string;
}

// ============================================================================
// Authentication API Types
// ============================================================================

export interface LoginFormData {
  idNumber: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  passwordConfirm?: string;
  firstName?: string;
  lastName?: string;
  idNumber?: string;
}

export interface LoginResponse {
  role: string;
  campus: string;
  token: string;
  message: string;
}

// ============================================================================
// Certificate API Types
// ============================================================================

export interface CertificateSearchError {
  success?: boolean;
  message: string;
  error?: string;
  retryAfter?: number;
}

// ============================================================================
// Merchandise/Product Types
// ============================================================================

export interface MerchandiseItemData {
  _id: string;
  name: string;
  product_name?: string;
  price: number;
  stocks?: number;
  stock?: number;
  imageUrl?: string[];
  imageUrl1?: string;
  imageUrl2?: string;
  description?: string;
  category?: string;
  is_active?: boolean;
  isPublished?: boolean;
  isDeleted?: boolean;
  selectedSizes?: Record<string, { custom: boolean; price: string }>;
  sizes?: string[];
  colors?: string[];
  selectedVariations?: string[];
  variation?: string[];
  batch?: string;
  limited?: boolean;
  start_date?: string | Date;
  end_date?: string | Date;
}

// ============================================================================
// Organization/Member Types
// ============================================================================

export interface Member {
  id?: string;
  _id?: string;
  name: string;
  role?: string;
  image?: string;
  [key: string]: unknown;
}

export interface OrganizationTabData {
  id: string;
  title: string;
  officers?: Member[];
  developers?: Member[];
  volunteers?: Member[];
  [key: string]: unknown;
}

// ============================================================================
// Event Types
// ============================================================================

export interface EventPayload {
  eventName: string;
  eventDescription?: string;
  eventDate?: string;
  location?: string;
  image?: File | null;
  [key: string]: unknown;
}

// ============================================================================
// Resource Types
// ============================================================================

export interface TutorialData {
  course: string;
  excerpt?: string;
  image?: string;
  link?: string;
  [key: string]: unknown;
}
