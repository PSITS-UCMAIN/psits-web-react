import axios from "axios";
import type { AxiosError, AxiosResponse } from "axios";
import backendConnection from "../../../api/backendApi";
import { showToast } from "../../../utils/alertHelper";

interface Student {
  id_number?: string;
  rfid?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  course?: string;
  year?: string | number;
  [key: string]: unknown;
}

interface MembershipData {
  data: Student[];
  total?: number;
  message?: string;
}

interface DeletedStudent extends Student {
  deletedAt?: string;
}

interface DeletedStudentsResponse {
  data: DeletedStudent[];
}

interface StudentCountResponse {
  count: number;
  message?: string;
}

interface MembershipRequestData {
  id_number: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  createdAt: string;
}

interface MembershipRequestResponse {
  data: MembershipRequestData[];
}

interface MerchandiseItem {
  _id: string;
  product_name: string;
  price: number;
  stock: number;
  image?: string;
  isPublished?: boolean;
  isDeleted?: boolean;
}

interface MerchandiseResponse {
  data: MerchandiseItem[];
  message?: string;
}

interface MerchandiseCount {
  count: number;
}

interface OrdersCount {
  count: number;
}

interface RenewStudentData {
  id_number: string;
  first_name: string;
  last_name: string;
  renewalDate: string;
}

interface RenewResponse {
  data: RenewStudentData[];
}

interface MembershipHistoryItem {
  id_number: string;
  student_name: string;
  action: string;
  timestamp: string;
  admin?: string;
}

interface MembershipHistoryResponse {
  data: MembershipHistoryItem[];
}

interface DashboardStats {
  totalStudents: number;
  activeMemberships: number;
  totalRevenue: number;
  pendingRequests: number;
}

interface DailySalesData {
  date: string;
  sales: number;
  orders: number;
}

interface DailySalesResponse {
  data: DailySalesData[];
}

interface Member {
  id_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  role?: string;
  course?: string;
  year?: string | number;
}

interface Officer extends Member {
  position: string;
  department?: string;
  isSuspended?: boolean;
}

interface AdminLog {
  _id: string;
  admin_id: string;
  action: string;
  target?: string;
  target_id?: string;
  target_model?: string;
  timestamp: string;
}

interface AdminLogsResponse {
  data: AdminLog[];
}

interface StudentSearchResponse {
  data: Student;
}

interface RoleRequest {
  id_number: string;
  first_name: string;
  last_name: string;
  requestedRole: string;
  status: string;
  admin?: string;
  createdAt: string;
}

interface RoleRequestResponse {
  data: RoleRequest[];
}

interface PendingCountItem {
  product_id: string;
  product_name: string;
  pendingCount: number;
  totalOrders: number;
}

interface PendingCountsResult {
  data: PendingCountItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface AdminRequest {
  id_number: string;
  first_name: string;
  last_name: string;
  email: string;
  requestedAccess: string[];
  status: string;
  createdAt: string;
}

interface MembershipHistoryData {
  id_number: string;
  status: string;
  startDate: string;
  endDate?: string;
  renewalDate?: string;
}

interface MembershipPriceData {
  membership_price: number;
}

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
    console.error("API Error:", axiosError.response?.data || axiosError.message);
  } else {
    if (showUser) showToast("error", "An unexpected error occurred");
    console.error("Unexpected Error:", error);
  }
};

export const membership = async (): Promise<MembershipData | false> => {
  try {
    const response: AxiosResponse<MembershipData> = await axios.get(`${backendConnection()}/api/students`, {
      headers: createHeaders(),
    });
    if (response.status === 200) {
      return response.data;
    } else {
      window.location.reload();
      return false;
    }
  } catch {
    return false;
  }
};

export const deletedStudent = async (): Promise<DeletedStudentsResponse | void> => {
  try {
    const response: AxiosResponse<DeletedStudentsResponse> = await axios.get(
      `${backendConnection()}/api/students/deleted-students`,
      { headers: createHeaders() }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getCountStudent = async (): Promise<StudentCountResponse | false> => {
  try {
    const response: AxiosResponse<StudentCountResponse> = await axios.get(
      `${backendConnection()}/api/admin/get-students-count`,
      { headers: createHeaders() }
    );
    return response.data;
  } catch {
    return false;
  }
};

export const getCountActiveMemberships = async (): Promise<number | false> => {
  try {
    const response: AxiosResponse<{ message: number }> = await axios.get(
      `${backendConnection()}/api/admin/get-active-membership-count`,
      { headers: createHeaders() }
    );
    return response.data.message;
  } catch {
    return false;
  }
};

export const membershipRequest = async (): Promise<MembershipRequestResponse | void> => {
  try {
    const response: AxiosResponse<MembershipRequestResponse> = await axios.get(
      `${backendConnection()}/api/admin/membership-request`,
      { headers: createHeaders() }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const revokeAllStudent = async (): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/revoke-student`,
      {},
      { headers: createHeaders() }
    );
    if (response.status === 200) showToast("success", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const approveMembership = async (formData: FormData): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/admin/approve-membership`,
      formData,
      { headers: createHeaders() }
    );
    if (response.status === 200) {
      showToast("success", "Membership Approved");
      return true;
    }
    showToast("error", response.data?.message || "An error occurred");
  } catch (error) {
    handleApiError(error);
  }
};

export const merchCreated = async (): Promise<MerchandiseCount | void> => {
  try {
    const response: AxiosResponse<{ message: MerchandiseCount }> = await axios.get(
      `${backendConnection()}/api/admin/merchandise-created`,
      { headers: createHeaders() }
    );
    return response.data.message;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const placedOrders = async (): Promise<OrdersCount | void> => {
  try {
    const response: AxiosResponse<{ message: OrdersCount }> = await axios.get(
      `${backendConnection()}/api/admin/placed-orders`,
      { headers: createHeaders() }
    );
    return response.data.message;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const renewStudent = async (): Promise<RenewResponse | void> => {
  try {
    const response: AxiosResponse<RenewResponse> = await axios.get(`${backendConnection()}/api/renew`, {
      headers: createHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const membershipHistory = async (): Promise<MembershipHistoryResponse | void> => {
  try {
    const response: AxiosResponse<MembershipHistoryResponse> = await axios.get(`${backendConnection()}/api/admin/history`, {
      headers: createHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const merchandise = async (): Promise<MerchandiseResponse | void> => {
  try {
    const response: AxiosResponse<MerchandiseResponse> = await axios.get(`${backendConnection()}/api/merch/retrieve`, {
      headers: createHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const activePublishMerchandise = async (): Promise<MerchandiseResponse | void> => {
  try {
    const response: AxiosResponse<MerchandiseResponse> = await axios.get(
      `${backendConnection()}/api/merch/retrieve-publish-merchandise`,
      { headers: createHeaders() }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const merchandiseAdmin = async (): Promise<MerchandiseResponse | void> => {
  try {
    const response: AxiosResponse<MerchandiseResponse> = await axios.get(`${backendConnection()}/api/merch/retrieve-admin`, {
      headers: createHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteMerchandise = async (_id: string): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/merch/delete-soft`,
      { _id },
      { headers: createHeaders() }
    );
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const publishMerchandise = async (_id: string): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/merch/publish`,
      { _id },
      { headers: createHeaders() }
    );
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const cancelMembership = async (id_number: string): Promise<void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/students/cancel-membership`,
      { id_number },
      { headers: createHeaders() }
    );
    if (response.status === 200) showToast("success", response.data.message);
  } catch (error) {
    handleApiError(error);
  }
};

export const studentDeletion = async (id_number: string, name: string): Promise<number | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/students/softdelete`,
      { id_number, name },
      { headers: createHeaders() }
    );
    return response.status;
  } catch (error) {
    handleApiError(error);
  }
};

export const studentRestore = async (id_number: string): Promise<number | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/students/restore`,
      { id_number },
      { headers: createHeaders() }
    );
    return response.status;
  } catch (error) {
    handleApiError(error);
  }
};

export const addMerchandise = async (formData: FormData): Promise<boolean> => {
  try {
    const token = getAuthToken();
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/merch`, formData, {
      headers: {
        // allow axios to set the correct multipart boundary when sending FormData
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "multipart/form-data",
      },
    });
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const getDashboardStats = async (): Promise<DashboardStats | void> => {
  try {
    const response: AxiosResponse<DashboardStats> = await axios.get(
      `${backendConnection()}/api/admin/dashboard-stats`, {
      headers: createHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const getDailySales = async (): Promise<DailySalesResponse | void> => {
  try {
    const response: AxiosResponse<DailySalesResponse> = await axios.get(
      `${backendConnection()}/api/admin/get-daily-sales`, {
      headers: createHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const deleteReports = async (product_id: string, id: string, merchName: string): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.delete(
      `${backendConnection()}/api/merch/delete-report`, {
      data: { product_id, id, merchName },
      headers: createHeaders(),
    });
    if (response.status === 200) showToast("success", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const getAllMembers = async (): Promise<Member[] | void> => {
  try {
    const response: AxiosResponse<{ data: Member[] }> = await axios.get(
      `${backendConnection()}/api/admin/get-all-members`, {
      headers: createHeaders(),
    });
    return response.status === 200 ? response.data.data : [];
  } catch (error) {
    handleApiError(error, false);
  }
};

export const getAllOfficers = async (): Promise<Officer[] | void> => {
  try {
    const response: AxiosResponse<{ data: Officer[] }> = await axios.get(
      `${backendConnection()}/api/admin/get-all-officers`, {
      headers: createHeaders(),
    });
    return response.status === 200 ? response.data.data : [];
  } catch (error) {
    handleApiError(error, false);
  }
};

export const roleRemove = async (id_number: string): Promise<number | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/role-remove`, 
      { id_number }, 
      { headers: createHeaders() });
    return response.status;
  } catch (error) {
    handleApiError(error);
  }
};

export const getSuspendOfficers = async (): Promise<Officer[] | void> => {
  try {
    const response: AxiosResponse<{ data: Officer[] }> = await axios.get(
      `${backendConnection()}/api/admin/get-suspend-officers`, { headers: createHeaders() });
    return response.status === 200 ? response.data.data : [];
  } catch (error) {
    handleApiError(error, false);
  }
};

export const editOfficerApi = async (updatedMember: Partial<Officer>): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/admin/edit-officer`, 
      updatedMember, 
      { headers: createHeaders() });
    if (response.status === 200) {
      showToast("success", response.data.message);
      return true;
    }
  } catch (error) {
    handleApiError(error);
  }
};

export const officerSuspend = async (id_number: string): Promise<number | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/suspend`, 
      { id_number }, 
      { headers: createHeaders() });
    return response.status;
  } catch (error) {
    handleApiError(error);
  }
};

export const officerRestore = async (id_number: string): Promise<number | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/restore-officer`, 
      { id_number }, 
      { headers: createHeaders() });
    return response.status;
  } catch (error) {
    handleApiError(error);
  }
};

export const logAdminAction = async (payload: { 
  admin_id: string; 
  action: string; 
  target?: string; 
  target_id?: string; 
  target_model?: string 
}): Promise<void> => {
  try {
    await axios.post(
      `${backendConnection()}/api/logs`, 
      payload, 
      { headers: { Authorization: `Bearer ${getAuthToken()}` } });
  } catch (error) {
    console.error("Error logging admin action:", (error as AxiosError)?.response?.data || (error as Error)?.message);
  }
};

export const fetchAdminLogs = async (): Promise<AdminLogsResponse | void> => {
  try {
    const response: AxiosResponse<AdminLogsResponse> = await axios.get(
      `${backendConnection()}/api/logs`, 
      { headers: { Authorization: `Bearer ${getAuthToken()}` } });
    return response.data;
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    throw new Error("Unable to fetch admin logs");
  }
};

export const fetchStudentName = async (id_number: string): Promise<StudentSearchResponse | void> => {
  try {
    const response: AxiosResponse<StudentSearchResponse> = await axios.get(
      `${backendConnection()}/api/admin/student_search/${id_number}`, 
      { headers: createHeaders() });
    return response.data;
  } catch (error) {
    console.error("Error fetching student:", error);
  }
};

export const requestRoleAdmin = async (role: string, id_number: string, admin: string): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/request-role`, 
      { role, id_number, admin }, 
      { headers: createHeaders() });
    if (response.status === 200) showToast("success", response.data.message); else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const fetchAllStudentRequestRole = async (): Promise<RoleRequest[] | void> => {
  try {
    const response: AxiosResponse<RoleRequestResponse> = await axios.get(
      `${backendConnection()}/api/admin/get-request-role`, 
      { headers: { Authorization: `Bearer ${getAuthToken()}` } });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching student:", error);
  }
};

export const approveRole = async (id_number: string): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/approve-role`, 
      { id_number }, 
      { headers: createHeaders() });
    if (response.status === 200) showToast("success", response.data.message); else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const declineRole = async (id_number: string): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/decline-role`, 
      { id_number }, 
      { headers: createHeaders() });
    if (response.status === 200) showToast("success", response.data.message); else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const fetchAllPendingCounts = async ({ 
  limit = 10, 
  page = 1, 
  sort = [{ field: "product_name", direction: "asc" as const }], 
  search = "" }
   = {}): Promise<PendingCountsResult> => {
  try {
    const response: AxiosResponse<PendingCountsResult> = await axios.get(
      `${backendConnection()}/api/orders/get-all-pending-counts`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      params: { page, limit, sort, search },
    });
    return {
      data: response.data.data || [],
      total: response.data.total || 0,
      page: response.data.page || 1,
      totalPages: response.data.totalPages || 1,
      limit: response.data.limit || limit,
    };
  } catch (error) {
    console.error("Error fetching student:", error);
    return { data: [], page: 1, total: 0, totalPages: 0, limit };
  }
};

export const addOfficer = async (formData: Partial<Officer>): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/admin/add-officer`, 
      formData, 
      { headers: createHeaders() });
    if (response.status === 200) { showToast("success", response.data.message); return true; }
  } catch (error) {
    handleApiError(error);
  }
};

export const getRequestAdminAccount = async (): Promise<AdminRequest[] | void> => {
  try {
    const response: AxiosResponse<{ data: AdminRequest[] }> = await axios.get(
      `${backendConnection()}/api/admin/get-request-admin`, 
      { headers: createHeaders() });
    return response.status === 200 ? response.data.data : [];
  } catch (error) {
    handleApiError(error, false);
  }
};

export const approveAdminAccount = async (id_number: string): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/approve-admin-account`, 
      { id_number }, 
      { headers: createHeaders() });
    if (response.status === 200) showToast("success", response.data.message); else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const declineAdminAccount = async (id_number: string): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/decline-admin-account`, 
      { id_number }, 
      { headers: createHeaders() });
    if (response.status === 200) showToast("success", response.data.message); else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const editAdminAccess = async (id_number: string, newAccess: string[]): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/update-admin-access`, 
      { id_number, newAccess }, 
      { headers: createHeaders() });
    if (response.status === 200) showToast("success", response.data.message); else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const getStudentMembershipHistory = async (studentId: string): Promise<MembershipHistoryData[] | void> => {
  try {
    const response: AxiosResponse<{ data: MembershipHistoryData[] }> = await axios.get(
      `${backendConnection()}/api/students/student-membership-history/${studentId}`, 
      { headers: createHeaders() });
    return response.data.data;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const membershipPrice = async (): Promise<number | false> => {
  try {
    const response: AxiosResponse<{ data: MembershipPriceData }> = await axios.get(
      `${backendConnection()}/api/admin/get-membership-price`, 
      { headers: createHeaders() });
    return response.status === 200 ? response.data.data.membership_price : false;
  } catch {
    return false;
  }
};

export const changeMembershipPrice = async (price: string | number): Promise<boolean> => {
  const newPriceFormData = new FormData();
  newPriceFormData.set("price", String(price));
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/change-membership-price`, 
      newPriceFormData,
      { headers: createHeaders() });
    if (response.status === 200) showToast("success", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const updateStudent = async (
  id_number: string,
  rfid: string,
  first_name: string,
  middle_name: string,
  last_name: string,
  email: string,
  course: string,
  year: string | number
): Promise<AxiosResponse | void> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/students/edited-student`,
      { id_number, rfid, first_name, middle_name, last_name, email, course, year },
      { headers: createHeaders() }
    );
    return response;
  } catch (error) {
    console.error("Error updating student:", error);
    throw error;
  }
};