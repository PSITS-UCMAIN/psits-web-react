import backendConnection from "../../../api/backendApi";
import axios from "axios";
import type { AxiosError, AxiosResponse } from "axios";
import { showToast } from "../../../utils/alertHelper";
import type { PrintableOrderReceipt } from "../types/orders.types";

interface CartItem {
  product_id?: string;
  imageUrl1?: string;
  image?: string;
  product_name: string;
  limited?: boolean;
  start_date?: string | Date;
  end_date?: string | Date;
  category?: string;
  price: number;
  quantity: number;
  sub_total: number;
  variation?: string[];
  sizes?: string[];
  batch?: string;
}

// Merchandise/Product interfaces
export interface MerchandiseItem {
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
  [key: string]: unknown;
}

export interface MerchandiseResponse {
  data: MerchandiseItem[];
  message?: string;
}

interface PromoOrder {
  _id?: string;
  promo_name: string;
  promo_discount?: boolean;
}

interface OrderFormData {
  id_number: string;
  items: CartItem[];
  total: number;
  reference_code?: string;
  [key: string]: unknown;
}

interface OrderResponse {
  _id?: string;
  id?: string;
  orderId?: string;
  id_number: string;
  rfid?: string;
  membership_discount?: boolean;
  promo?: PromoOrder | null;
  student_name?: string;
  course?: string;
  year?: number;
  items?: CartItem[];
  total?: number;
  cash?: number;
  order_date?: string | Date;
  transaction_date?: string | Date;
  order_status?: string;
  admin?: string;
  reference_code?: string;
  role?: string;
  [key: string]: unknown;
}

interface ErrorResponse {
  message?: string;
}

const getAuthToken = (): string | null => {
  return sessionStorage.getItem("Token");
};

const createHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAuthToken()}`,
});

// Helper to handle API errors
const handleApiError = (error: unknown, showUserError = true): void => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse>;
    const errorMessage =
      axiosError.response?.data?.message || "An error occurred";

    if (showUserError) {
      showToast("error", errorMessage);
    }
    console.error(
      "API Error:",
      axiosError.response?.data || axiosError.message
    );
  } else {
    if (showUserError) {
      showToast("error", "An unexpected error occurred");
    }
    console.error("Unexpected Error:", error);
  }
};

const isValidObjectId = (id?: string): boolean =>
  typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

// Validate order items before hitting the API so a malformed payload fails
// fast with a clear message instead of a generic 500 from the backend.
const validateOrderItems = (items?: CartItem[]): string | null => {
  if (!Array.isArray(items) || items.length === 0) {
    return "Your order has no items.";
  }
  for (const item of items) {
    if (!item.product_id || !isValidObjectId(String(item.product_id))) {
      return "An item in your cart is no longer valid. Please refresh and try again.";
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return "An item has an invalid quantity.";
    }
  }
  return null;
};

export const makeOrder = async (
  formData: OrderFormData & { promo_id?: string }
): Promise<boolean> => {
  const validationError = validateOrderItems(formData.items);
  if (validationError) {
    showToast("error", validationError);
    return false;
  }
  try {
    const payload: Record<string, unknown> = { items: formData.items };
    if (formData.promo_id) {
      payload.promo_id = formData.promo_id;
    }
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/orders/v2/create`,
      payload,
      { headers: createHeaders() }
    );

    return response.status === 200;
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const getOrder = async (
  id_number: string
): Promise<OrderResponse | null> => {
  try {
    const response: AxiosResponse<OrderResponse> = await axios.get(
      `${backendConnection()}/api/orders`,
      {
        params: { id_number },
        headers: createHeaders(),
      }
    );

    return response.status === 200 ? response.data : null;
  } catch (error) {
    handleApiError(error, false);
    return null;
  }
};

export const getAllOrders = async (): Promise<OrderResponse[] | null> => {
  try {
    const response: AxiosResponse<OrderResponse[]> = await axios.get(
      `${backendConnection()}/api/orders/get-all-orders`,
      { headers: createHeaders() }
    );

    return response.status === 200 ? response.data : null;
  } catch (error) {
    handleApiError(error, false);
    return null;
  }
};

export const cancelOrder = async (
  product_id: string | number
): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/orders/cancel/${product_id}`,
      {},
      { headers: createHeaders() }
    );

    if (response.status === 200) {
      showToast("success", "Cancel Order Successful");
      return true;
    } else {
      showToast("error", "Unable to cancel your order");
      return false;
    }
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const approveOrder = async (
  formData: OrderFormData
): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/orders/approve-order`,
      formData,
      { headers: createHeaders() }
    );

    return response.status === 200;
  } catch (error) {
    handleApiError(error, false);
    return false;
  }
};

export const getAllPendingOrders = async ({
  page = 1,
  limit = 8,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<{
  data: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} | null> => {
  try {
    const response: AxiosResponse = await axios.get(
      `${backendConnection()}/api/orders/get-all-pending-orders`,
      {
        params: { page, limit, search },
        headers: createHeaders(),
      }
    );

    if (response.status === 200) {
      return {
        data: response.data.data || [],
        total: response.data.total || 0,
        page: response.data.page || page,
        limit: response.data.limit || limit,
        totalPages: response.data.totalPages || 0,
      };
    }
    return null;
  } catch (error) {
    handleApiError(error, false);
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }
};

export const getAllPaidOrders = async ({
  page = 1,
  limit = 50,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<{
  data: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} | null> => {
  try {
    const response: AxiosResponse = await axios.get(
      `${backendConnection()}/api/orders/get-all-paid-orders`,
      {
        params: { page, limit, search },
        headers: createHeaders(),
      }
    );

    if (response.status === 200) {
      return {
        data: response.data.data || [],
        total: response.data.total || 0,
        page: response.data.page || page,
        limit: response.data.limit || limit,
        totalPages: response.data.totalPages || 0,
      };
    }
    return null;
  } catch (error) {
    handleApiError(error, false);
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }
};

export const getPublishedMerchandise = async (): Promise<
  MerchandiseItem[] | null
> => {
  try {
    const response: AxiosResponse<MerchandiseResponse> = await axios.get(
      `${backendConnection()}/api/merch/retrieve-publish-merchandise`,
      { headers: createHeaders() }
    );

    return response.status === 200 ? response.data.data : null;
  } catch (error) {
    handleApiError(error, false);
    return null;
  }
};

export const getAllMerchandise = async (): Promise<
  MerchandiseItem[] | null
> => {
  try {
    const response: AxiosResponse<MerchandiseResponse> = await axios.get(
      `${backendConnection()}/api/merch/retrieve`,
      { headers: createHeaders() }
    );

    return response.status === 200 ? response.data.data : null;
  } catch (error) {
    handleApiError(error, false);
    return null;
  }
};

export const getMerchandiseById = async (
  productId: string
): Promise<MerchandiseItem | null> => {
  try {
    const response: AxiosResponse<{ data: MerchandiseItem }> = await axios.get(
      `${backendConnection()}/api/merch/retrieve/${productId}`,
      { headers: createHeaders() }
    );

    return response.status === 200 ? response.data.data : null;
  } catch (error) {
    handleApiError(error, false);
    return null;
  }
};

// ─── V2 Order APIs ─────────────────────────────────────────

export const getAllPendingPaidOrdersV2 = async ({
  status = "Pending",
  page = 1,
  limit = 8,
  search = "",
}: {
  status?: "Pending" | "Paid";
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<{
  data: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} | null> => {
  try {
    const response: AxiosResponse = await axios.get(
      `${backendConnection()}/api/orders/v2/get-all-pending-paid-orders`,
      {
        params: { status, page, limit, search },
        headers: createHeaders(),
      }
    );
    if (response.status === 200) {
      return {
        data: response.data.data || [],
        total: response.data.total || 0,
        page: response.data.page || page,
        limit: response.data.limit || limit,
        totalPages: response.data.totalPages || 0,
      };
    }
    return null;
  } catch (error) {
    handleApiError(error, false);
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }
};

export const approveOrderV2 = async (
  order_id: string,
  cash?: number
): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/orders/v2/approve`,
      { order_id, cash },
      { headers: createHeaders() }
    );
    return response.status === 200;
  } catch (error) {
    handleApiError(error, false);
    return false;
  }
};

export const cancelOrderV2 = async (order_id: string): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/orders/v2/cancel`,
      { _id: order_id },
      { headers: createHeaders() }
    );
    if (response.status === 200) {
      showToast("success", "Order cancelled successfully");
      return true;
    }
    return false;
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const refundOrderV2 = async (order_id: string): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/orders/v2/refund`,
      { order_id },
      { headers: createHeaders() }
    );
    if (response.status === 200) {
      showToast("success", "Refund processed successfully");
      return true;
    }
    return false;
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const getOrderReceiptV2 = async (
  orderId: string
): Promise<PrintableOrderReceipt | null> => {
  try {
    const response: AxiosResponse<{ data: PrintableOrderReceipt }> =
      await axios.get(
        `${backendConnection()}/api/orders/v2/${orderId}/receipt`,
        {
          headers: createHeaders(),
        }
      );

    return response.status === 200 ? response.data.data : null;
  } catch (error) {
    handleApiError(error, false);
    return null;
  }
};

// ─── Student Order APIs (V2) ─────────────────────────────────────────

export const getStudentOrders = async ({
  status = "Pending",
  page = 1,
  limit = 8,
}: {
  status?: "Pending" | "Paid" | "Refunded";
  page?: number;
  limit?: number;
} = {}): Promise<{
  data: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} | null> => {
  try {
    const response: AxiosResponse = await axios.get(
      `${backendConnection()}/api/v2/students/orders`,
      {
        params: { status, page, limit },
        headers: createHeaders(),
      }
    );
    if (response.status === 200) {
      return {
        data: response.data.data || [],
        total: response.data.total || 0,
        page: response.data.page || page,
        limit: response.data.limit || limit,
        totalPages: response.data.totalPages || 0,
      };
    }
    return null;
  } catch (error) {
    handleApiError(error, false);
    return null;
  }
};

export const getRefundByOrderId = async (orderId: string) => {
  try {
    const response: AxiosResponse = await axios.get(
      `${backendConnection()}/api/v2/students/refund/${orderId}`,
      { headers: createHeaders() }
    );
    return response.status === 200 ? response.data.data : null;
  } catch (error) {
    console.error("Failed to fetch refund details", error);
    return null;
  }
};
