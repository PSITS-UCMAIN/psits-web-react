import axios from "axios";
import type { AxiosError, AxiosResponse } from "axios";
import backendConnection from "../../../api/backendApi";
import { showToast } from "../../../utils/alertHelper";
import type { DashboardStatsResponse } from "../dashboard/types/dashboard.types";

interface Student {
  _id?: string;
  id_number?: string;
  rfid?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  course?: string;
  year?: string | number;
  status?: string;
  membershipStatus?: string;
  applied?: string;
  campus?: string;
  deletedBy?: string;
  deletedDate?: string;
  isFirstApplication?: boolean;
  [key: string]: unknown;
}

interface MembershipData {
  data?: Student[];
  total?: number;
  message?: string;
}

type StudentsResponse = Student[] | MembershipData;

interface DeletedStudent extends Student {
  deletedAt?: string;
}

type DeletedStudentsResponse = DeletedStudent[] | { data: DeletedStudent[] };

interface StudentCountResponse {
  all: number;
  request: number;
  deleted: number;
  message?: string;
}

interface MembershipRequestData extends Student {
  id_number: string;
  email: string;
  status?: string;
  createdAt?: string;
}

type MembershipRequestResponse =
  MembershipRequestData[] | { data: MembershipRequestData[] };

export interface MerchandiseSizeOption {
  custom?: boolean;
  price?: string;
}

export interface MerchandiseItem {
  _id: string;
  name: string;
  price: number;
  stocks: number;
  batch?: string;
  description?: string;
  selectedVariations?: string[];
  selectedSizes?: Record<string, MerchandiseSizeOption>;
  selectedAudience?: string;
  control?: string;
  created_by?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  category?: string;
  type?: string;
  imageUrl?: string[];
  createdAt?: string;
  updatedAt?: string;
}

type MerchandiseResponse =
  | MerchandiseItem[]
  | {
      data?: MerchandiseItem[];
      message?: string;
    };

export interface PromoMerchandiseItem {
  _id: string;
  name: string;
  items?: Array<{
    _id?: string;
    id_number: string;
    promo_used?: string;
  }>;
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
  _id: string;
  id_number: string;
  rfid?: string;
  reference_code: string;
  name: string;
  year: string | number;
  course: string;
  type: string;
  date: string | Date;
  admin?: string;
  total?: number;
  term_name?: string;
  membership_name?: string;
}

type MembershipHistoryResponse =
  MembershipHistoryItem[] | { data: MembershipHistoryItem[] };

interface DailySalesData {
  product_name: string;
  totalQuantity: number;
  totalSubtotal: number;
}

interface MerchandiseReportOrderDetail {
  _id: string;
  product_id: string;
  reference_code: string;
  student_name: string;
  id_number: string;
  course: string;
  year: string | number;
  product_name: string;
  batch?: string;
  size?: string | string[];
  variation?: string | string[];
  quantity: number;
  total: number;
  transaction_date: string;
  rfid?: string;
}

export interface MerchandiseReportsResult {
  data: MerchandiseReportOrderDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message?: string;
  summary: { unitsSold: number; totalRevenue: number };
}

export interface MerchandiseReportProductOption {
  productId: string;
  productName: string;
  batches: string[];
}

export interface MerchandiseReportFilterOptionsResult {
  message?: string;
  products: MerchandiseReportProductOption[];
}

export interface MerchandiseReportsParams {
  page?: number;
  limit?: number;
  search?: string;
  referenceCode?: string;
  studentId?: string;
  name?: string;
  rfid?: string;
  course?: string;
  year?: string;
  productId?: string;
  productName?: string;
  batch?: string;
  size?: string;
  color?: string;
  dateFrom?: string;
  dateTo?: string;
}

type DailySalesResponse = DailySalesData[] | { data: DailySalesData[] };

interface DashboardPaidOrder {
  _id?: string;
  total?: number;
  transaction_date?: string | Date;
  order_date?: string | Date;
  order_status?: string;
}

interface Member {
  _id?: string;
  id_number: string;
  name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email: string;
  role?: string;
  position?: string;
  course?: string;
  year?: string | number;
  campus?: string;
  status?: string;
  isRequest?: boolean;
  adminRequest?: string;
}

interface Officer extends Member {
  position: string;
  department?: string;
  isSuspended?: boolean;
  access?: string;
  password?: string;
  confirm_password?: string;
  githubUsername?: string | null;
}

interface AdminLog {
  _id: string;
  admin: string;
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
  data: Student & { name?: string };
}

interface RoleRequest extends Member {
  requestedRole?: string;
  admin?: string;
  createdAt: string;
}

interface RoleRequestResponse {
  data: RoleRequest[];
}

interface PendingCountItem {
  product_name: string;
  total: number;
  yearCounts: number[];
}

interface PendingCountsResult {
  data: PendingCountItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface DashboardPaidOrdersResult {
  data: DashboardPaidOrder[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface PendingCountSortRule {
  field: string;
  direction: "asc" | "desc";
}

interface PendingCountsParams {
  limit?: number;
  page?: number;
  sort?: string | PendingCountSortRule[];
  search?: string;
}

interface AdminRequest extends Member {
  requestedAccess?: string[];
  createdAt: string;
}

interface MembershipApprovalPayload {
  // reference_code is generated server-side (year-scoped sequence) and is no
  // longer sent by the client.
  id_number: string;
  rfid?: string;
  admin?: string;
  date?: Date;
  total?: number;
}

interface ApiErrorResponse {
  message?: string;
}

const getAuthToken = (): string | null => sessionStorage.getItem("Token");

const createHeaders = () => ({
  "Content-Type": "application/json",
  ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
});

const merchandiseV2BaseUrl = () => `${backendConnection()}/api/v2/merchandise`;

const cacheStore = new Map<string, { value: unknown; expiresAt: number }>();

const withCache = async <T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> => {
  const now = Date.now();
  const cached = cacheStore.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const value = await fetcher();
  if (value) {
    cacheStore.set(key, { value, expiresAt: now + ttlMs });
  }
  return value;
};

const cacheKey = (url: string, params: Record<string, unknown> = {}) =>
  url + JSON.stringify(params);

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

export const membership = async (): Promise<MembershipData | false> => {
  try {
    const response: AxiosResponse<MembershipData> = await axios.get(
      `${backendConnection()}/api/students`,
      {
        headers: createHeaders(),
      }
    );
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

export const getDashboardActiveStudents = async (): Promise<Student[]> => {
  try {
    const response: AxiosResponse<StudentsResponse> = await axios.get(
      `${backendConnection()}/api/students`,
      { headers: createHeaders() }
    );

    if (Array.isArray(response.data)) {
      return response.data;
    }

    return response.data.data || [];
  } catch (error) {
    handleApiError(error, false);
    return [];
  }
};

export const deletedStudent = async (): Promise<DeletedStudent[] | void> => {
  try {
    const response: AxiosResponse<DeletedStudentsResponse> = await axios.get(
      `${backendConnection()}/api/students/deleted-students`,
      { headers: createHeaders() }
    );
    return Array.isArray(response.data) ? response.data : response.data.data;
  } catch (error) {
    handleApiError(error);
  }
};
export const getDashboardStatistics = async (): Promise<
  StudentCountResponse | false
> => {
  try {
    const response: AxiosResponse<StudentCountResponse> = await axios.get(
      `${backendConnection()}/api/admin/get-dashboard`,
      { headers: createHeaders() }
    );
    return response.data;
  } catch {
    return false;
  }
};

export const getCountStudent = async (): Promise<
  StudentCountResponse | false
> => {
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

export const membershipRequest = async (): Promise<
  MembershipRequestData[] | void
> => {
  try {
    const response: AxiosResponse<MembershipRequestResponse> = await axios.get(
      `${backendConnection()}/api/admin/membership-request`,
      { headers: createHeaders() }
    );
    return Array.isArray(response.data) ? response.data : response.data.data;
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

export const approveMembership = async (
  formData: MembershipApprovalPayload
): Promise<boolean | void> => {
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

export const merchCreated = async (): Promise<number | void> => {
  try {
    const response: AxiosResponse<{ message: number }> = await axios.get(
      `${backendConnection()}/api/admin/merchandise-created`,
      { headers: createHeaders() }
    );
    return response.data.message;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const placedOrders = async (): Promise<number | void> => {
  try {
    const response: AxiosResponse<{ message: number }> = await axios.get(
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
    const response: AxiosResponse<RenewResponse> = await axios.get(
      `${backendConnection()}/api/renew`,
      {
        headers: createHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const membershipHistory = async (
  type?: string
): Promise<MembershipHistoryItem[] | void> => {
  try {
    const response: AxiosResponse<MembershipHistoryResponse> = await axios.get(
      `${backendConnection()}/api/admin/history`,
      {
        headers: createHeaders(),
        params: type ? { type } : {},
      }
    );
    return Array.isArray(response.data) ? response.data : response.data.data;
  } catch (error) {
    handleApiError(error, false);
  }
};

export interface MembershipOption {
  name: string;
  term: string;
}

export const membershipOptions = async (): Promise<MembershipOption[]> => {
  try {
    const response: AxiosResponse<{ data?: unknown[] }> = await axios.get(
      `${backendConnection()}/api/membership`,
      { headers: createHeaders() }
    );
    const rows = Array.isArray(response.data?.data)
      ? (response.data.data as Array<{
          membership_name?: string;
          term_name?: string;
        }>)
      : [];
    return rows.map((row) => ({
      name: row.membership_name ?? "",
      term: row.term_name ?? "",
    }));
  } catch (error) {
    handleApiError(error, false);
    return [];
  }
};

export interface UpdateReferenceResult {
  ok: boolean;
  /** Set when the code is already taken, so the dialog can show it inline. */
  error?: string;
  emailsRelinked?: number;
  renumbered?: Array<{ from: string; to: string }>;
}

export const updateMembershipReference = async (
  id: string,
  referenceCode: string,
  cascade = false
): Promise<UpdateReferenceResult> => {
  try {
    const response: AxiosResponse<{
      data: {
        emailsRelinked: number;
        renumbered: Array<{ from: string; to: string }>;
      };
    }> = await axios.patch(
      `${backendConnection()}/api/admin/history/${encodeURIComponent(
        id
      )}/reference`,
      { reference_code: referenceCode, cascade },
      { headers: createHeaders() }
    );
    return {
      ok: true,
      emailsRelinked: response.data?.data?.emailsRelinked,
      renumbered: response.data?.data?.renumbered,
    };
  } catch (error) {
    // A duplicate code (409) is an expected outcome the dialog reports inline,
    // so it is returned rather than raised as a generic toast.
    const status = (error as AxiosError)?.response?.status;
    const message = (error as AxiosError<{ message?: string }>)?.response?.data
      ?.message;
    if (status === 409 || status === 400) {
      return { ok: false, error: message || "Invalid reference code" };
    }
    handleApiError(error);
    return { ok: false, error: message };
  }
};

const normalizeMerchandiseResponse = (payload: MerchandiseResponse) =>
  Array.isArray(payload) ? payload : payload.data || [];

export const merchandise = async (): Promise<MerchandiseItem[] | void> => {
  try {
    const response: AxiosResponse<MerchandiseResponse> = await axios.get(
      `${merchandiseV2BaseUrl()}/active`,
      {
        headers: createHeaders(),
      }
    );
    return normalizeMerchandiseResponse(response.data);
  } catch (error) {
    handleApiError(error);
  }
};

export const activePublishMerchandise = async (): Promise<
  MerchandiseItem[] | void
> => {
  try {
    const response: AxiosResponse<MerchandiseResponse> = await axios.get(
      `${merchandiseV2BaseUrl()}/retrieve-published`,
      { headers: createHeaders() }
    );
    return normalizeMerchandiseResponse(response.data);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const merchandiseAdmin = async (): Promise<MerchandiseItem[] | void> => {
  try {
    const response: AxiosResponse<MerchandiseResponse> = await axios.get(
      merchandiseV2BaseUrl(),
      {
        headers: createHeaders(),
      }
    );
    return normalizeMerchandiseResponse(response.data);
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteMerchandise = async (
  _id: string
): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${merchandiseV2BaseUrl()}/delete-soft`,
      { _id },
      { headers: createHeaders() }
    );
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const merchandiseReports = async ({
  page = 1,
  limit = 10,
  search,
  referenceCode,
  studentId,
  name,
  rfid,
  course,
  year,
  productId,
  productName,
  batch,
  size,
  color,
  dateFrom,
  dateTo,
}: MerchandiseReportsParams = {}): Promise<MerchandiseReportsResult | void> => {
  try {
    const response: AxiosResponse<MerchandiseReportsResult> = await axios.get(
      `${backendConnection()}/api/reports`,
      {
        headers: createHeaders(),
        params: {
          page,
          limit,
          search,
          referenceCode,
          studentId,
          name,
          rfid,
          course,
          year,
          productId,
          productName,
          batch,
          size,
          color,
          dateFrom,
          dateTo,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const merchandiseReportFilterOptions =
  async (): Promise<MerchandiseReportFilterOptionsResult | void> => {
    try {
      const response: AxiosResponse<MerchandiseReportFilterOptionsResult> =
        await axios.get(`${backendConnection()}/api/reports/filter-options`, {
          headers: createHeaders(),
        });
      return response.data;
    } catch (error) {
      handleApiError(error, false);
    }
  };

export const exportMerchandiseReports = async (
  params: Omit<MerchandiseReportsParams, "page" | "limit"> = {}
): Promise<Blob | void> => {
  try {
    const response: AxiosResponse<Blob> = await axios.get(
      `${backendConnection()}/api/reports/export`,
      {
        headers: createHeaders(),
        params,
        responseType: "blob",
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const publishMerchandise = async (
  _id: string
): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${merchandiseV2BaseUrl()}/publish`,
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

export const studentDeletion = async (
  id_number: string,
  name: string
): Promise<number | void> => {
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

export const studentRestore = async (
  id_number: string
): Promise<number | void> => {
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
      merchandiseV2BaseUrl(),
      formData,
      {
        headers: {
          // allow axios to set the correct multipart boundary when sending FormData
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const updateMerchandise = async (
  id: string,
  formData: FormData
): Promise<boolean> => {
  try {
    const token = getAuthToken();
    const response: AxiosResponse = await axios.put(
      `${merchandiseV2BaseUrl()}/update/${id}`,
      formData,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
    return false;
  }
};

export const getDashboardStats =
  async (): Promise<DashboardStatsResponse | void> => {
    const url = `${backendConnection()}/api/admin/dashboard-stats`;
    return withCache<DashboardStatsResponse | void>(
      cacheKey(url),
      60_000,
      async () => {
        try {
          const response: AxiosResponse<DashboardStatsResponse> =
            await axios.get(url, {
              headers: createHeaders(),
            });
          return response.data;
        } catch (error) {
          handleApiError(error, false);
        }
      }
    );
  };

export const getDailySales = async (): Promise<DailySalesData[] | void> => {
  try {
    const response: AxiosResponse<DailySalesResponse> = await axios.get(
      `${backendConnection()}/api/admin/get-daily-sales`,
      {
        headers: createHeaders(),
      }
    );
    return Array.isArray(response.data) ? response.data : response.data.data;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const getDashboardPaidOrders = async ({
  page = 1,
  limit = 5000,
  startDate,
  endDate,
}: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
} = {}): Promise<DashboardPaidOrdersResult> => {
  const url = `${backendConnection()}/api/orders/get-all-paid-orders`;
  const params = { page, limit, startDate, endDate };
  return withCache<DashboardPaidOrdersResult>(
    cacheKey(url, params),
    60_000,
    async () => {
      try {
        const response: AxiosResponse<DashboardPaidOrdersResult> =
          await axios.get(url, {
            headers: createHeaders(),
            params,
          });

        return {
          data: response.data.data || [],
          total: response.data.total || 0,
          page: response.data.page || page,
          totalPages: response.data.totalPages || 1,
          limit: response.data.limit || limit,
        };
      } catch (error) {
        handleApiError(error, false);
        return { data: [], total: 0, page, totalPages: 1, limit };
      }
    }
  );
};

export const deleteReports = async (
  product_id: string,
  id: string,
  merchName: string
): Promise<boolean> => {
  try {
    const response: AxiosResponse = await axios.delete(
      `${backendConnection()}/api/merch/delete-report`,
      {
        data: { product_id, id, merchName },
        headers: createHeaders(),
      }
    );
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
      `${backendConnection()}/api/admin/get-all-members`,
      {
        headers: createHeaders(),
      }
    );
    return response.status === 200 ? response.data.data : [];
  } catch (error) {
    handleApiError(error, false);
  }
};

export const getAllOfficers = async (
  roleFilter?: string
): Promise<Officer[] | void> => {
  try {
    const response: AxiosResponse<{ data: Officer[] }> = await axios.get(
      `${backendConnection()}/api/admin/get-all-officers`,
      {
        headers: createHeaders(),
        params:
          roleFilter && roleFilter !== "all" ? { role_filter: roleFilter } : {},
      }
    );
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
      { headers: createHeaders() }
    );
    return response.status;
  } catch (error) {
    handleApiError(error);
  }
};

export const getSuspendOfficers = async (): Promise<Officer[] | void> => {
  try {
    const response: AxiosResponse<{ data: Officer[] }> = await axios.get(
      `${backendConnection()}/api/admin/get-suspend-officers`,
      { headers: createHeaders() }
    );
    return response.status === 200 ? response.data.data : [];
  } catch (error) {
    handleApiError(error, false);
  }
};

export const editOfficerApi = async (
  updatedMember: Partial<Officer>
): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/admin/edit-officer`,
      updatedMember,
      { headers: createHeaders() }
    );
    if (response.status === 200) {
      showToast("success", response.data.message);
      return true;
    }
  } catch (error) {
    handleApiError(error);
  }
};

export const officerSuspend = async (
  id_number: string
): Promise<number | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/suspend`,
      { id_number },
      { headers: createHeaders() }
    );
    return response.status;
  } catch (error) {
    handleApiError(error);
  }
};

export const officerRestore = async (
  id_number: string
): Promise<number | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/restore-officer`,
      { id_number },
      { headers: createHeaders() }
    );
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
  target_model?: string;
}): Promise<void> => {
  try {
    await axios.post(`${backendConnection()}/api/logs`, payload, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
  } catch (error) {
    console.error(
      "Error logging admin action:",
      (error as AxiosError)?.response?.data || (error as Error)?.message
    );
  }
};

export const fetchAdminLogs = async (): Promise<AdminLogsResponse | void> => {
  try {
    const response: AxiosResponse<AdminLogsResponse> = await axios.get(
      `${backendConnection()}/api/logs`,
      { headers: { Authorization: `Bearer ${getAuthToken()}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    throw new Error("Unable to fetch admin logs");
  }
};

export const fetchStudentName = async (
  id_number: string
): Promise<StudentSearchResponse | void> => {
  try {
    const response: AxiosResponse<StudentSearchResponse> = await axios.get(
      `${backendConnection()}/api/admin/student_search/${id_number}`,
      { headers: createHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching student:", error);
  }
};

export const requestRoleAdmin = async (
  role: string,
  id_number: string,
  admin: string
): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/request-role`,
      { role, id_number, admin },
      { headers: createHeaders() }
    );
    if (response.status === 200) showToast("success", response.data.message);
    else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const fetchAllStudentRequestRole = async (): Promise<
  RoleRequest[] | void
> => {
  try {
    const response: AxiosResponse<RoleRequestResponse> = await axios.get(
      `${backendConnection()}/api/admin/get-request-role`,
      { headers: { Authorization: `Bearer ${getAuthToken()}` } }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error fetching student:", error);
  }
};

export const approveRole = async (
  id_number: string
): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/approve-role`,
      { id_number },
      { headers: createHeaders() }
    );
    if (response.status === 200) showToast("success", response.data.message);
    else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const declineRole = async (
  id_number: string
): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/decline-role`,
      { id_number },
      { headers: createHeaders() }
    );
    if (response.status === 200)
      showToast("success", "Role declined successfully");
    else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const fetchAllPendingCounts = async ({
  limit = 10,
  page = 1,
  sort = [{ field: "product_name", direction: "asc" as const }],
  search = "",
}: PendingCountsParams = {}): Promise<PendingCountsResult> => {
  const url = `${backendConnection()}/api/orders/get-all-pending-counts`;
  const params = { page, limit, sort, search };
  return withCache<PendingCountsResult>(
    cacheKey(url, params),
    30_000,
    async () => {
      try {
        const response: AxiosResponse<PendingCountsResult> = await axios.get(
          url,
          {
            headers: { Authorization: `Bearer ${getAuthToken()}` },
            params,
          }
        );
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
    }
  );
};

export const addOfficer = async (
  formData: Partial<Officer>
): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/admin/add-officer`,
      formData,
      { headers: createHeaders() }
    );
    if (response.status === 200) {
      showToast("success", response.data.message);
      return true;
    }
  } catch (error) {
    handleApiError(error);
  }
};

export const getRequestAdminAccount = async (): Promise<
  AdminRequest[] | void
> => {
  try {
    const response: AxiosResponse<{ data: AdminRequest[] }> = await axios.get(
      `${backendConnection()}/api/admin/get-request-admin`,
      { headers: createHeaders() }
    );
    return response.status === 200 ? response.data.data : [];
  } catch (error) {
    handleApiError(error, false);
  }
};

export const approveAdminAccount = async (
  id_number: string
): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/approve-admin-account`,
      { id_number },
      { headers: createHeaders() }
    );
    if (response.status === 200) showToast("success", response.data.message);
    else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const declineAdminAccount = async (
  id_number: string
): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/decline-admin-account`,
      { id_number },
      { headers: createHeaders() }
    );
    if (response.status === 200) showToast("success", response.data.message);
    else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const editAdminAccess = async (
  id_number: string,
  newAccess: string[]
): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${backendConnection()}/api/admin/update-admin-access`,
      { id_number, newAccess },
      { headers: createHeaders() }
    );
    if (response.status === 200) showToast("success", response.data.message);
    else showToast("error", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};

export const getStudentMembershipHistory = async (
  studentId: string
): Promise<MembershipHistoryItem[] | void> => {
  try {
    const response: AxiosResponse<{ data: MembershipHistoryItem[] }> =
      await axios.get(
        `${backendConnection()}/api/students/student-membership-history/${studentId}`,
        { headers: createHeaders() }
      );
    return response.data.data;
  } catch (error) {
    handleApiError(error, false);
  }
};

export const updateStudent = async (
  id: string,
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
      {
        id,
        id_number,
        rfid,
        first_name,
        middle_name,
        last_name,
        email,
        course,
        year,
      },
      { headers: createHeaders() }
    );
    return response;
  } catch (error) {
    console.error("Error updating student:", error);
    throw error;
  }
};

export const changeStudentPasswordAdmin = async (
  id_number: string,
  password: string
): Promise<boolean | void> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${backendConnection()}/api/students/change-password-admin`,
      { id_number, password },
      { headers: createHeaders() }
    );
    if (response.status === 200) showToast("success", response.data.message);
    return response.status === 200;
  } catch (error) {
    handleApiError(error);
  }
};
