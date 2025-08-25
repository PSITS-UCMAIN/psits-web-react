import "../App.css";
import { showToast } from "../utils/alertHelper";
import backendConnection from "./backendApi";
import axios from "axios";

const token = sessionStorage.getItem("Token");

export const membership = async () => {
  try {
    const response = await axios.get(`${backendConnection()}/api/students`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.status === 200) {
      return response.data;
    } else {
      window.location.reload();
    }
  } catch (error) {
    if (error.response && error.response.data) {
      return false;
    } else {
      console.log("error", "An error occurred");
      return false;
    }
  }
};
export const deletedStudent = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/students/deleted-students`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

//Student tab admin count

export const getCountStudent = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/get-students-count`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      window.location.reload();
      return false;
    } else {
      console.log("error", "An error occurred");
      return false;
    }
  }
};

export const getCountActiveMemberships = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/get-active-membership-count`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.message;
  } catch (error) {
    if (error.response && error.response.data) {
      return false;
    } else {
      console.log("error", "An error occurred");
      return false;
    }
  }
};

export const membershipRequest = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/membership-request`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

export const revokeAllStudent = async () => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/admin/revoke-student`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      showToast("success", response.data.message);
    }
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Renew all students error:", error);
    return false;
  }
};

export const approveMembership = async (formData) => {
  try {
    const response = await axios.post(
      `${backendConnection()}/api/admin/approve-membership`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      showToast("success", "Membership Approved");
      return true;
    } else {
      console.error(response.data.message);
      showToast("error", response.data.message || "An error occurred");
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.error(error);
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      console.error(error);
      showToast("error", "An error occurred");
    }
  }
};

export const merchCreated = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/merchandise-created`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.message;
  } catch (error) {
    if (error.response && error.response.data) {
      console.log("error", error.response.data.message || "An error occurred");
    } else {
      console.log("error", "An error occurred");
    }
  }
};
export const placedOrders = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/placed-orders`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.message;
  } catch (error) {
    if (error.response && error.response.data) {
      console.log("error", error.response.data.message || "An error occurred");
    } else {
      console.log("error", "An error occurred");
    }
  }
};

export const renewStudent = async () => {
  try {
    const response = await axios.get(`${backendConnection()}/api/renew`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      console.log("error", error.response.data.message || "An error occurred");
    } else {
      console.log("error", "An error occurred");
    }
  }
};

export const membershipHistory = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/history`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      console.log("error", error.response.data.message || "An error occurred");
    } else {
      console.log("error", "An error occurred");
    }
  }
};

export const merchandise = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/merch/retrieve`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
      window.location.reload();
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

export const merchandiseAdmin = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/merch/retrieve-admin`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

export const deleteMerchandise = async (_id) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/merch/delete-soft`,
      { _id },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

export const publishMerchandise = async (_id) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/merch/publish`,
      { _id },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};
//Hard Delete
export const cancelMembership = async (id_number) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/students/cancel-membership`,
      {
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
    } else {
      showToast("error", response.data.message || "An error occurred");
    }
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

export const studentDeletion = async (id_number, name) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/students/softdelete`,
      { id_number, name },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.status;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};
export const studentRestore = async (id_number) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/students/restore`,
      { id_number },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.status;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

//Create Merchandise
export const addMerchandise = async (formData) => {
  try {
    const response = await axios.post(
      `${backendConnection()}/api/merch`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
      return false;
    } else {
      showToast("error", "An error occurred");
      return false;
    }
  }
};

export const getDashboardStats = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/dashboard-stats`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      console.log("error", error.response.data.message || "An error occurred");
    } else {
      console.log("error", "An error occurred");
    }
  }
};

export const getDailySales = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/get-daily-sales`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      console.log("error", error.response.data.message || "An error occurred");
    } else {
      console.log("error", "An error occurred");
    }
  }
};

export const deleteReports = async (product_id, id, merchName) => {
  try {
    const response = await axios.delete(
      `${backendConnection()}/api/merch/delete-report`,

      {
        data: { product_id, id, merchName },
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
      return false;
    }
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

//Get all members

export const getAllMembers = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/get-all-members`,

      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      // console.log(response.data.data);
      return response.data.data;
    }
  } catch (error) {
    if (error.response && error.response.data) {
      //showToast("error", error.response.data.message || "An error occurred");
    } else {
      //showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

//get-all-officers

export const getAllOfficers = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/get-all-officers`,

      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      return response.data.data;
    }
  } catch (error) {
    if (error.response && error.response.data) {
      //showToast("error", error.response.data.message || "An error occurred");
    } else {
      //showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

//TODO:remove role officer

export const roleRemove = async (id_number) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/admin/role-remove`,
      { id_number },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    // console.log(response.data.message);
    return response.status;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

export const getSuspendOfficers = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/get-suspend-officers`,

      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      // console.log(response.data.data);
      return response.data.data;
    }
  } catch (error) {
    if (error.response && error.response.data) {
      //showToast("error", error.response.data.message || "An error occurred");
    } else {
      //showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

export const editOfficerApi = async (updatedMember) => {
  try {
    const response = await axios.post(
      `${backendConnection()}/api/admin/edit-officer`,
      updatedMember,
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
      console.error(response.data.message);
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.error(error);
    } else {
      console.error(error);
    }
  }
};

export const officerSuspend = async (id_number) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/admin/suspend`,
      { id_number },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    // console.log(response.data.message);
    return response.status;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};
export const officerRestore = async (id_number) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/admin/restore-officer`,
      { id_number },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.status;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

export const logAdminAction = async ({
  admin_id,
  action,
  target,
  target_id,
  target_model,
}) => {
  try {
    // Prepare the log payload
    const logPayload = {
      admin_id,
      action,
      target,
      target_id,
      target_model,
    };

    // Send the request to the logging endpoint
    const response = await axios.post(
      `${backendConnection()}/api/logs`,
      logPayload,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("Token")}`, // Ensure a valid token is included
        },
      }
    );

    // console.log("Action logged successfully:", response.data.message);
  } catch (error) {
    console.error(
      "Error logging admin action:",
      error.response?.data || error.message
    );
  }
};

export const fetchAdminLogs = async () => {
  try {
    const response = await axios.get(`${backendConnection()}/api/logs`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("Token")}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    throw new Error("Unable to fetch admin logs");
  }
};

//fetch student name
export const fetchStudentName = async (id_number) => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/search_student/${id_number}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching student:", error);
  }
};

export const requestRoleAdmin = async (role, id_number, admin) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/admin/request-role`,
      { role, id_number, admin },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      showToast("success", response.data.message);
    } else {
      showToast("error", response.data.message);
    }
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

//fetch request students role
export const fetchAllStudentRequestRole = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/get-request-role`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("Token")}`,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error fetching student:", error);
  }
};
//Approve Role President
export const approveRole = async (id_number) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/admin/approve-role`,
      { id_number },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      showToast("success", response.data.message);
    } else {
      showToast("error", response.data.message);
    }
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};
//Decline Role President
export const declineRole = async (id_number) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/admin/decline-role`,
      { id_number },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      showToast("success", response.data.message);
    } else {
      showToast("error", response.data.message);
    }
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

//get-all-pending-counts
export const fetchAllPendingCounts = async ({
  limit = 10,
  page = 1,
  sort = [{ field: "product_name", direction: "asc" }],
  search = "",
} = {}) => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/orders/get-all-pending-counts`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("Token")}`,
        },
        params: {
          page,
          limit,
          sort,
          search,
        },
      }
    );

    // console.log('pending counts: ', response.data);

    return {
      data: response.data.data || [],
      total: response.data.total || 0,
      page: response.data.page || 1,
      totalPages: response.data.totalPages || 1,
      limit: response.data.limit || limit,
    };
  } catch (error) {
    console.error("Error fetching student:", error);
    return {
      data: [],
      page: 1,
      total: 0,
      totalPages: 0,
    };
  }
};

export const addOfficer = async (formData) => {
  try {
    const response = await axios.post(
      `${backendConnection()}/api/admin/add-officer`,
      formData,
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
      console.error(response.data.message);
      showToast("error", response.data.message || "An error occurred");
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.error(error);
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      console.error(error);
      showToast("error", "An error occurred");
    }
  }
};

//get-request-admin

export const getRequestAdminAccount = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/admin/get-request-admin`,

      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      // console.log(response.data.data);
      return response.data.data;
    }
  } catch (error) {
    if (error.response && error.response.data) {
      //showToast("error", error.response.data.message || "An error occurred");
    } else {
      //showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

export const approveAdminAccount = async (id_number) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/admin/approve-admin-account`,
      { id_number },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      showToast("success", response.data.message);
    } else {
      showToast("error", response.data.message);
    }
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};
//Decline Role President
export const declineAdminAccount = async (id_number) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/admin/decline-admin-account`,
      { id_number },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      showToast("success", response.data.message);
    } else {
      showToast("error", response.data.message);
    }
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};
//Update Individual Role
export const editAdminAccess = async (id_number, newAccess) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/admin/update-admin-access`,
      { id_number, newAccess },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      showToast("success", response.data.message);
    } else {
      showToast("error", response.data.message);
    }
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.data) {
      showToast("error", error.response.data.message || "An error occurred");
    } else {
      showToast("error", "An error occurred");
    }
    console.error("Error:", error);
  }
};

export const getStudentMembershipHistory = async (studentId) => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/students/student-membership-history/${studentId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("response", response.data);
    return response.data.data;
  } catch (error) {
    if (error.response && error.response.data) {
      console.log("error", error.response.data.message || "An error occurred");
    } else {
      console.log("error", "An error occurred");
    }
  }
};
