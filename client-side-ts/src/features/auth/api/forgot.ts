import backendConnection from "../../../api/backendApi";
import axios, { AxiosError } from "axios";
import { showToast } from "../../../utils/alertHelper";

interface ApiErrorResponse {
  message?: string;
}

interface ApiSuccessResponse {
  message: string;
}

const getAuthToken = (): string | null => {
  return sessionStorage.getItem("Token");
};

// Helper function to handle API errors
const handleApiError = (error: unknown): void => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const errorMessage =
      axiosError.response?.data?.message || "An error occurred";
    showToast("error", errorMessage);
  } else {
    showToast("error", "An error occurred");
  }
  console.error("Error:", error);
};

export const forgotPassword = async (
  email: string,
  id_number: string
): Promise<boolean> => {
  try {
    const token = getAuthToken();
    const response = await axios.post<ApiSuccessResponse>(
      `${backendConnection()}/api/student/forgot-password`,
      {
        email,
        id_number,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const changePassword = async (
  password: string,
  id_number: string
): Promise<boolean> => {
  try {
    const token = getAuthToken();
    const response = await axios.post<ApiSuccessResponse>(
      `${backendConnection()}/api/students/change-password-admin`,
      {
        password,
        id_number,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const changePasswordAdmin = async (
  password: string,
  id_number: string
): Promise<boolean> => {
  try {
    const token = getAuthToken();
    const response = await axios.post<ApiSuccessResponse>(
      `${backendConnection()}/api/admin/change-password-officer`,
      {
        password,
        id_number,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
  } catch (error) {
    handleApiError(error);
    return false;
  }
};
