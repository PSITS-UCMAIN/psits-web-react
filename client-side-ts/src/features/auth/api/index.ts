import { showToast } from "@/utils/alertHelper";
import backendConnection from "@/api/backendApi";
import axios, { AxiosError } from "axios";
import type { LoginFormData, RegisterFormData } from "@/types/api";

interface LoginResponse {
  role: string;
  campus: string;
  token: string;
  message: string;
}

interface ApiErrorResponse {
  message?: string;
}

interface ApiSuccessResponse {
  message: string;
}

// Helper function to handle API errors
const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const errorMessage =
      axiosError.response?.data?.message || "An error occurred";
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

export const login = async (
  formData: LoginFormData
): Promise<LoginResponse | false> => {
  try {
    const response = await axios.post<LoginResponse>(
      `${backendConnection()}/api/login`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200) {
      sessionStorage.setItem("Token", response.data.token);

      return {
        role: response.data.role,
        campus: response.data.campus,
        token: response.data.token,
        message: response.data.message,
      };
    } else {
      showToast("error", response.data.message);
      return false;
    }
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const register = async (
  formData: RegisterFormData
): Promise<boolean | null> => {
  try {
    const response = await axios.post<ApiSuccessResponse>(
      `${backendConnection()}/api/register`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200) {
      return true;
    } else {
      showToast("error", response.data.message);
      return null;
    }
  } catch (error) {
    handleApiError(error);
    return null;
  }
};

export const handleLogouts = async (): Promise<boolean | null> => {
  try {
    const response = await axios.post<ApiSuccessResponse>(
      `${backendConnection()}/api/logout`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );

    if (response.status === 200) {
      return true;
    } else {
      showToast("error", response.data.message);
      return null;
    }
  } catch (error) {
    handleApiError(error);
    return null;
  }
};

// V2 temporary
