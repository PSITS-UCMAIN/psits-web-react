import "../App.css";
import backendConnection from "./backendApi";
import axios from "axios";
import { showToast } from "../utils/alertHelper";
const token = sessionStorage.getItem("Token");

export const makeOrder = async (formData) => {
  try {
    const response = await axios.post(
      `${backendConnection()}/api/orders/student-order`,
      formData,
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

export const getOrder = async (id_number) => {
  try {
    const response = await axios.get(`${backendConnection()}/api/orders`, {
      params: { id_number },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 200) {
      return response.data;
    } else {
      return null;
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.error("Error:", error);
    } else {
      console.error("Error:", error);
    }
    console.error("Error:", error);
  }
};

export const getAllOrders = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/orders/get-all-orders`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      return response.data;
    } else {
      return null;
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.error("Error:", error);
    } else {
      console.error("Error:", error);
    }
    console.error("Error:", error);
  }
};
export const cancelOrder = async (product_id) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/orders/cancel/${product_id}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      showToast("success", "Cancel Order Successful");
    } else {
      showToast("error", "Unable to cancel your order");
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.error("Error:", error.response.data);
    } else {
      console.error("Error:", error.message || error);
    }
    return null;
  }
};

export const approveOrder = async (formData) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/orders/approve-order`,
      formData,
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
      console.error("Error:", error.response.data);
    } else {
      console.error("Error:", error.message || error);
    }
    return null;
  }
};


export const getAllPendingOrders = async () => {
	try {
		const response = await axios.get(
			`${backendConnection()}/api/orders/get-all-pending-orders`,
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			}
		);

		if (response.status === 200) {
			return response.data;
		} else {
			return null;
		}
	} catch (error) {
		if (error.response && error.response.data) {
			console.error("Error:", error);
		} else {
			console.error("Error:", error);
		}
		console.error("Error:", error);
	}
};

export const getAllPaidOrders = async () => {
	try {
		const response = await axios.get(
			`${backendConnection()}/api/orders/get-all-paid-orders`,
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			}
		);

		if (response.status === 200) {
			return response.data;
		} else {
			return null;
		}
	} catch (error) {
		if (error.response && error.response.data) {
			console.error("Error:", error);
		} else {
			console.error("Error:", error);
		}
		console.error("Error:", error);
	}
};
