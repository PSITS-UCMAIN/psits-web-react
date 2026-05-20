import backendConnection from "../../../api/backendApi";
import axios from "axios";
import type { AxiosError, AxiosResponse } from "axios";
import { showToast } from "../../../utils/alertHelper";

interface CartItem {
  product_id?: string;
  imageUrl1?: string;
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
}

interface OrderResponse {
  id_number: string;
  rfid?: string;
  membership_discount?: boolean;
  promo?: PromoOrder | null;
  student_name?: string;
  course?: string;
  year?: number;
  items?: CartItem[];
  total?: number;
  order_date?: string | Date;
  transaction_date?: string | Date;
  order_status?: string;
  admin?: string;
  reference_code?: string;
  role?: string;
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

export const makeOrder = async (formData: OrderFormData): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/orders/student-order`,
      formData,
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

export const getAllPendingOrders = async (): Promise<
  OrderResponse[] | null
> => {
  try {
    const response: AxiosResponse<OrderResponse[]> = await axios.get(
      `${backendConnection()}/api/orders/get-all-pending-orders`,
      { headers: createHeaders() }
    );

    return response.status === 200 ? response.data : null;
  } catch (error) {
    handleApiError(error, false);
    return null;
  }
};

export const getAllPaidOrders = async (): Promise<OrderResponse[] | null> => {
  try {
    const response: AxiosResponse<OrderResponse[]> = await axios.get(
      `${backendConnection()}/api/orders/get-all-paid-orders`,
      { headers: createHeaders() }
    );

    return response.status === 200 ? response.data : null;
  } catch (error) {
    handleApiError(error, false);
    return null;
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
