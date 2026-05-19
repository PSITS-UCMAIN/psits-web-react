import api from "@/api/axios";
import type {
  StudentProfile,
  StudentProfileResponse,
} from "@/features/student";
import type { AxiosResponse } from "axios";
import axios, { AxiosError } from "axios";
import backendConnection from "../../../api/backendApi";
import { showToast } from "../../../utils/alertHelper";
import type { StudentSearchResult, StudentUpdateYearResponse } from "@/types/api";

interface ApiErrorResponse {
  message?: string;
}

interface CartItem {
  product_id?: string;
  product_name?: string;
  price?: number;
  quantity?: number;
  sub_total?: number;
  variation?: string[];
  sizes?: string[];
  [key: string]: any;
}

interface Student {
  id_number: string;
  [key: string]: unknown;
}

interface MembershipStatusResponse {
  status: string;
  isFirstApplication: boolean;
}

interface DeleteItemRequest {
  id_number: string;
  [key: string]: unknown;
}

interface CartItemFormData {
  product_id?: string;
  product_name?: string;
  price?: number;
  quantity?: number;
  variation?: string[] | string;
  sizes?: string[] | string;
  [key: string]: unknown;
}

const getToken = (): string | null => sessionStorage.getItem("Token");

const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const errorMessage =
      axiosError.response?.data?.message ?? "An error occurred";
    console.error("Error:", errorMessage);
    showToast("error", errorMessage);
    return errorMessage;
  } else {
    const errorMessage = "An error occurred";
    console.error("Error:", error);
    showToast("error", errorMessage);
    return errorMessage;
  }
};

export const requestMembership = async (id_number: string): Promise<void> => {
  try {
    const token = getToken();
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/students/request`,
      { id_number },
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (response.status === 200) {
      showToast("success", response.data.message);
    } else {
      showToast("error", response.data.message);
    }
  } catch (error: unknown) {
    handleApiError(error);
  }
};

export const getMembershipStatusStudents = async (
  id_number: string
): Promise<MembershipStatusResponse | undefined> => {
  try {
    const token = getToken();
    const response: AxiosResponse<MembershipStatusResponse> = await axios.get(
      `${backendConnection()}/api/students/get-membership-status/${id_number}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (response.status === 200) {
      return response.data;
    }
    return undefined;
  } catch (error: unknown) {
    handleApiError(error);
    return undefined;
  }
};

export const addToCartApi = async (
  formData: CartItemFormData
): Promise<boolean> => {
  try {
    const token = getToken();
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/cart/add-cart`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (response.status === 200) {
      return true;
    }
    return false;
  } catch (error: unknown) {
    handleApiError(error);
    return false;
  }
};

export const viewCart = async (id_number: string): Promise<CartItem[]> => {
  try {
    const token = getToken();
    const response: AxiosResponse = await axios.get(
      `${backendConnection()}/api/cart/view-cart`,
      {
        params: { id_number },
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (response.status === 200) {
      return response.data as CartItem[];
    }

    const message = response.data?.message ?? "Failed to fetch cart";
    showToast("error", message);
    throw new Error(message);
  } catch (error: unknown) {
    const message = handleApiError(error);
    throw new Error(message);
  }
};

export const deleteItem = async (data: DeleteItemRequest): Promise<boolean> => {
  try {
    const token = getToken();
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/cart/delete-item-cart`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (response.status === 200) {
      showToast("success", response.data.message);
      return true;
    } else {
      showToast("error", response.data.message);
      return false;
    }
  } catch (error: unknown) {
    handleApiError(error);
    return false;
  }
};

export const fetchSpecificStudent = async (
  id_number: string
): Promise<Student | null> => {
  try {
    const token = getToken();
    const response: AxiosResponse<{ data: Student }> = await axios.get(
      `${backendConnection()}/api/fetch-specific-student/${id_number}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (response.status === 200) {
      return response.data.data;
    }
    return null;
  } catch (error: unknown) {
    handleApiError(error);
    return null;
  }
};

export const searchStudentById = async (id_number: string): Promise<StudentSearchResult> => {
  try {
    const token = getToken();
    const response: AxiosResponse = await axios.get(
      `${backendConnection()}/api/admin/student_search/${id_number}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    return response.data.data;
  } catch (error: unknown) {
    handleApiError(error);
    throw (
      error instanceof Error ? error.message : "An error occurred while searching."
    );
  }
};

export const searchStudentByIdV2 = async (id_number: string): Promise<StudentSearchResult> => {
  try {
    const response: AxiosResponse = await api.get(
      `/api/v2/students/lookup/${id_number}`
    );
    return response.data.data;
  } catch (error: unknown) {
    handleApiError(error);
    throw (
      error instanceof Error ? error.message : "An error occurred while searching."
    );
  }
};

export const getStudentProfileV2 = async (
  id_number: string
): Promise<StudentProfile> => {
  try {
    const response = await api.get<StudentProfileResponse>(
      `/api/v2/students/profile/${id_number}`
    );
    if (response.status === 200) {
      return response.data.data;
    }
    throw new Error("Failed to fetch student profile");
  } catch (error: unknown) {
    handleApiError(error);
    throw error;
  }
};

export const updateStudentYearLevelForCurrentYear = async (
  id_number: string,
  yearToUpdate: string
): Promise<StudentUpdateYearResponse> => {
  try {
    const token = getToken();
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/students/edit-year-level/${id_number}`,
      { year: yearToUpdate },
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    return response.data;
  } catch (error: unknown) {
    handleApiError(error);
    throw error;
  }
};

export const isStudentYearUpdated = async (
  id_number: string
): Promise<boolean> => {
  try {
    const token = getToken();
    const response: AxiosResponse = await axios.get(
      `${backendConnection()}/api/students/is-year-updated/${id_number}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    return response.data.isYearUpdated;
  } catch (error: unknown) {
    handleApiError(error);
    throw error;
  }
};
