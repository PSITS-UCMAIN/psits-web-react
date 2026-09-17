import axios from "axios";
import type { AxiosError, AxiosResponse } from "axios";
import backendConnection from "@/api/backendApi";
import { showToast } from "@/utils/alertHelper";
import type { PromoLogEntry, PromoListRow } from "../types/promo.types";

interface ApiErrorResponse {
  message?: string;
}

const getAuthToken = (): string | null => sessionStorage.getItem("Token");

const createHeaders = () => ({
  "Content-Type": "application/json",
  ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
});

const handleApiError = (error: unknown, showUser = true): void => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const message = axiosError.response?.data?.message || "An error occurred";
    if (showUser) showToast("error", message);
    console.error(
      "API Error:",
      axiosError.response?.data || axiosError.message
    );
  } else {
    if (showUser) showToast("error", "An unexpected error occurred");
    console.error("Unexpected Error:", error);
  }
};

export interface CreatePromoPayload {
  promoName: string;
  type: string;
  limitType: string;
  singleStudent: string;
  selectedAudience: string[] | "All Students";
  selectedMerchandise: Array<{ _id: string; name: string }>;
  selectedCategories: string[];
  promoScope: "Merchandise" | "Category" | "Both";
  discount: number;
  startDate: string;
  endDate: string;
  quantity: number;
}

export const createPromoCode = async (data: CreatePromoPayload): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.post(
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

export interface UpdatePromoPayload extends CreatePromoPayload {
  promoId: string;
}

export const updatePromoCode = async (data: UpdatePromoPayload): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.post(
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

export const getAllPromoCodes = async (): Promise<PromoListRow[] | undefined> => {
  try {
    const response: AxiosResponse<{ promo?: PromoListRow[] }> = await axios.get(
      `${backendConnection()}/api/promo/fetch`,
      { headers: createHeaders() }
    );
    return response.data?.promo ?? [];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    handleApiError(error);
  }
};

export const deletePromo = async (id: string): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.delete(
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

export const getPromoLogs = async (): Promise<PromoLogEntry[] | undefined> => {
  try {
    const response: AxiosResponse<{ log: PromoLogEntry[] }> = await axios.get(
      `${backendConnection()}/api/promo/log`,
      { headers: createHeaders() }
    );
    if (response.status === 200) {
      return response.data.log;
    }
    return undefined;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    handleApiError(error);
    return undefined;
  }
};
