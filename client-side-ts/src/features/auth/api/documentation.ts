import axios from "axios";
import type { AxiosError, AxiosResponse } from "axios";
import backendConnection from "../../../api/backendApi";
import { showToast } from "../../../utils/alertHelper";

// Types
interface DocEndpointParams {
  page?: string;
  limit?: string;
  method?: string;
  category?: string;
  access?: string;
  search?: string;
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

interface Endpoint {
  id?: string;
  endpointId?: string;
  method?: string;
  url?: string;
  title?: string;
  description?: string;
  access?: string;
  category?: string;
  parameters?: Parameter[];
  exampleRequest?: Record<string, unknown>;
  exampleResponse?: Record<string, unknown>;
  isActive?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RelatedEndpoint {
  endpointId: string;
  method: string;
  url: string;
  description?: string;
}

interface ImplementationStep {
  step: number;
  title: string;
  description: string;
  code?: string;
}

interface Feature {
  id?: string;
  featureId?: string;
  title?: string;
  category?: string;
  description?: string;
  implementationFlow?: ImplementationStep[];
  relatedEndpoints?: RelatedEndpoint[];
  tags?: string[];
  access?: string;
  isActive?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DocStats {
  totalApiEndpoints?: number;
  totalFeatures?: number;
  totalServices?: number;
}

interface ApiEndpointsResponse {
  data: Endpoint[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface FeaturesResponse {
  data: Feature[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface FeatureCategory {
  category: string;
  count: number;
}

interface FeatureCategoriesResponse {
  data: FeatureCategory[];
}

interface ApiMethod {
  method: string;
  count: number;
}

interface ApiMethodsResponse {
  data: ApiMethod[];
}

interface CreateEndpointData {
  method: string;
  url: string;
  title: string;
  description: string;
  access: string;
  category: string;
  parameters?: Parameter[];
  exampleRequest?: Record<string, unknown>;
  exampleResponse?: Record<string, unknown>;
}

interface CreateFeatureData {
  title: string;
  category: string;
  description: string;
  implementationFlow?: ImplementationStep[];
  relatedEndpoints?: string[];
  tags?: string[];
  access: string;
}

type UpdateEndpointData = Partial<CreateEndpointData>;

type UpdateFeatureData = Partial<CreateFeatureData>;

interface ApiSuccessResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

interface TransformedDocStats {
  apiEndpoints?: number;
  features?: number;
  services?: number;
}

interface ApiErrorResponse {
  message?: string;
}

// Helpers
const getAuthToken = (): string | null => sessionStorage.getItem("Token");

const createHeaders = () => ({
  "Content-Type": "application/json",
  ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
});

const handleApiError = (error: unknown): void => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const status = axiosError.response?.status;
    const message = axiosError.response?.data?.message || "An error occurred";

    if (status === 401) {
      sessionStorage.removeItem("Token");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return;
    }

    showToast("error", message);
    console.error("API Error:", axiosError.response?.data || axiosError.message);
  } else {
    showToast("error", "An unexpected error occurred");
    console.error("Unexpected Error:", error);
  }
};

// API
export const documentationAPI = {
  getStats: async (): Promise<DocStats> => {
    try {
      const response: AxiosResponse<DocStats> = await axios.get(
        `${backendConnection()}/api/docs/stats`,
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getApiEndpoints: async (params: DocEndpointParams = {}): Promise<ApiEndpointsResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append("page", params.page);
      if (params.limit) queryParams.append("limit", params.limit);
      if (params.method && params.method !== "ALL") queryParams.append("method", params.method);
      if (params.category && params.category !== "all") queryParams.append("category", params.category);
      if (params.access && params.access !== "all") queryParams.append("access", params.access);

      const queryString = queryParams.toString();
      const url = `${backendConnection()}/api/docs/endpoints${queryString ? `?${queryString}` : ""}`;

      const response: AxiosResponse<ApiEndpointsResponse> = await axios.get(url, { headers: createHeaders() });
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getApiEndpointById: async (endpointId: string): Promise<Endpoint> => {
    try {
      const response: AxiosResponse<Endpoint> = await axios.get(
        `${backendConnection()}/api/docs/endpoints/${endpointId}`,
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getFeatures: async (params: DocEndpointParams = {}): Promise<FeaturesResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append("page", params.page);
      if (params.limit) queryParams.append("limit", params.limit);
      if (params.category && params.category !== "all") queryParams.append("category", params.category);
      if (params.search) queryParams.append("search", params.search);

      const queryString = queryParams.toString();
      const url = `${backendConnection()}/api/docs/features${queryString ? `?${queryString}` : ""}`;

      const response: AxiosResponse<FeaturesResponse> = await axios.get(url, { headers: createHeaders() });
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getFeatureById: async (featureId: string): Promise<Feature> => {
    try {
      const response: AxiosResponse<Feature> = await axios.get(
        `${backendConnection()}/api/docs/features/${featureId}`,
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getFeatureCategories: async (): Promise<FeatureCategoriesResponse> => {
    try {
      const response: AxiosResponse<FeatureCategoriesResponse> = await axios.get(
        `${backendConnection()}/api/docs/feature-categories`,
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getApiMethods: async (): Promise<ApiMethodsResponse> => {
    try {
      const response: AxiosResponse<ApiMethodsResponse> = await axios.get(
        `${backendConnection()}/api/docs/api-methods`,
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  createApiEndpoint: async (endpointData: CreateEndpointData): Promise<ApiSuccessResponse> => {
    try {
      const response: AxiosResponse<ApiSuccessResponse> = await axios.post(
        `${backendConnection()}/api/docs/endpoints`,
        endpointData,
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  createFeature: async (featureData: CreateFeatureData): Promise<ApiSuccessResponse> => {
    try {
      const response: AxiosResponse<ApiSuccessResponse> = await axios.post(
        `${backendConnection()}/api/docs/features`,
        featureData,
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  updateApiEndpoint: async (endpointId: string, data: UpdateEndpointData): Promise<ApiSuccessResponse> => {
    try {
      const response: AxiosResponse<ApiSuccessResponse> = await axios.put(
        `${backendConnection()}/api/docs/endpoints/${endpointId}`,
        data,
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  deleteApiEndpoint: async (endpointId: string): Promise<ApiSuccessResponse> => {
    try {
      const response: AxiosResponse<ApiSuccessResponse> = await axios.delete(
        `${backendConnection()}/api/docs/endpoints/${endpointId}`,
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  toggleEndpointStatus: async (endpointId: string): Promise<ApiSuccessResponse> => {
    try {
      const response: AxiosResponse<ApiSuccessResponse> = await axios.patch(
        `${backendConnection()}/api/docs/endpoints/${endpointId}/toggle`,
        {},
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  updateFeature: async (featureId: string, data: UpdateFeatureData): Promise<ApiSuccessResponse> => {
    try {
      const response: AxiosResponse<ApiSuccessResponse> = await axios.put(
        `${backendConnection()}/api/docs/features/${featureId}`,
        data,
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  deleteFeature: async (featureId: string): Promise<ApiSuccessResponse> => {
    try {
      const response: AxiosResponse<ApiSuccessResponse> = await axios.delete(
        `${backendConnection()}/api/docs/features/${featureId}`,
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  toggleFeatureStatus: async (featureId: string): Promise<ApiSuccessResponse> => {
    try {
      const response: AxiosResponse<ApiSuccessResponse> = await axios.patch(
        `${backendConnection()}/api/docs/features/${featureId}/toggle`,
        {},
        { headers: createHeaders() }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

// Transform helpers
export const transformApiEndpoints = (endpoints: Endpoint[]): Endpoint[] => {
  return endpoints.map((endpoint) => ({
    id: endpoint.endpointId,
    endpointId: endpoint.endpointId,
    method: endpoint.method,
    url: endpoint.url,
    title: endpoint.title,
    description: endpoint.description,
    access: endpoint.access,
    category: endpoint.category,
    parameters: endpoint.parameters,
    exampleRequest: endpoint.exampleRequest,
    exampleResponse: endpoint.exampleResponse,
    isActive: endpoint.isActive,
    createdBy: endpoint.createdBy,
    updatedBy: endpoint.updatedBy,
    createdAt: endpoint.createdAt,
    updatedAt: endpoint.updatedAt,
  }));
};

export const transformFeatures = (features: Feature[]): Feature[] => {
  return features.map((feature) => ({
    id: feature.featureId,
    featureId: feature.featureId,
    title: feature.title,
    category: feature.category,
    description: feature.description,
    implementationFlow: feature.implementationFlow,
    relatedEndpoints: feature.relatedEndpoints,
    tags: feature.tags,
    access: feature.access,
    isActive: feature.isActive,
    createdBy: feature.createdBy,
    updatedBy: feature.updatedBy,
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
  }));
};

export const transformDocStats = (stats: DocStats): TransformedDocStats => {
  return {
    apiEndpoints: stats.totalApiEndpoints,
    features: stats.totalFeatures,
    services: stats.totalServices,
  };
};

export default documentationAPI;