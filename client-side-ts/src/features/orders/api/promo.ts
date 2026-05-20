import { showToast } from "../../../utils/alertHelper";
import backendConnection from "../../../api/backendApi";
import axios, { AxiosError } from "axios";
import type { AxiosResponse } from "axios";

interface MerchandiseItem {
  id: string | number;
  name?: string;
  price?: number;
  [key: string]: unknown;
}

interface PromoCodeData {
  promoName: string;
  type: string;
  limitType: "Limited" | "Unlimited";
  singleStudent: string;
  selectedAudience: string[] | "All Students";
  selectedMerchandise: MerchandiseItem[];
  discount: number;
  quantity: number;
  startDate: string | Date;
  endDate: string | Date;
}

interface PromoCode {
  id: string | number;
  promoName: string;
  code?: string;
  type?: string;
  discount?: number;
  limitType?: "Limited" | "Unlimited";
  quantity?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  selectedMerchandise?: MerchandiseItem[];
}

interface PromoVerifyResponse {
  message: string;
  isValid: boolean;
  discount?: number;
}

interface PromoLogEntry {
  id?: string | number;
  promoCode?: string;
  studentId?: string;
  timestamp?: string | Date;
  discount?: number;
  [key: string]: unknown;
}

interface ApiResponse<T = unknown> {
  message: string;
  data?: T;
  promo?: PromoCode[];
  log?: PromoLogEntry[];
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

const handleApiError = (error: unknown): void => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse>;
    const errorMessage =
      axiosError.response?.data?.message || "An error occurred";
    showToast("error", errorMessage);
    console.error(
      "API Error:",
      axiosError.response?.data || axiosError.message
    );
  } else {
    showToast("error", "An unexpected error occurred");
    console.error("Unexpected Error:", error);
  }
};

export const createPromoCode = async (
  data: PromoCodeData
): Promise<boolean> => {
  console.warn(data);

  try {
    const response: AxiosResponse<ApiResponse> = await axios.post(
      `${backendConnection()}/api/promo/create`,
      data,
      { headers: createHeaders() }
    );

    if (response.status === 200) {
      showToast("success", response.data.message);
      return true;
    } else {
      showToast("error", response.data.message);
      return false;
    }
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const updatePromoCode = async (
  data: PromoCodeData
): Promise<boolean> => {
  console.warn(data);

  try {
    const response: AxiosResponse<ApiResponse> = await axios.post(
      `${backendConnection()}/api/promo/update`,
      data,
      { headers: createHeaders() }
    );

    if (response.status === 200) {
      showToast("success", response.data.message);
      return true;
    } else {
      showToast("error", response.data.message);
      return false;
    }
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const getAllPromoCode = async (): Promise<
  PromoCode[] | string | undefined
> => {
  try {
    const response: AxiosResponse<ApiResponse> = await axios.get(
      `${backendConnection()}/api/promo/fetch`,
      { headers: createHeaders() }
    );

    if (response.status === 200) {
      return response.data.promo;
    } else {
      return response.data.message;
    }
  } catch (error) {
    handleApiError(error);
    return undefined;
  }
};

export const verifyPromo = async (
  promo_code: string,
  merchId: string | number
): Promise<PromoVerifyResponse | false | undefined> => {
  try {
    const response: AxiosResponse<PromoVerifyResponse> = await axios.get(
      `${backendConnection()}/api/promo/verify/${promo_code}/${merchId}`,
      { headers: createHeaders() }
    );

    if (response.status === 200) {
      showToast("success", response.data.message);
      return response.data;
    } else {
      showToast("error", response.data.message);
      return false;
    }
  } catch (error) {
    handleApiError(error);
    return undefined;
  }
};

export const deletePromo = async (id: string | number): Promise<boolean> => {
  try {
    const response: AxiosResponse<ApiResponse> = await axios.delete(
      `${backendConnection()}/api/promo/delete/${id}`,
      { headers: createHeaders() }
    );

    if (response.status === 200) {
      showToast("success", response.data.message);
      return true;
    } else {
      showToast("error", response.data.message);
      return false;
    }
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const getPromoLog = async (): Promise<
  PromoLogEntry[] | string | undefined
> => {
  try {
    const response: AxiosResponse<ApiResponse> = await axios.get(
      `${backendConnection()}/api/promo/log`,
      { headers: createHeaders() }
    );

    if (response.status === 200) {
      return response.data.log;
    } else {
      return response.data.message;
    }
  } catch (error) {
    handleApiError(error);
    return undefined;
  }
};
