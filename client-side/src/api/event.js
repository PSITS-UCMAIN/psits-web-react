import axios from "axios";
import "../App.css";
import { showToast } from "../utils/alertHelper";
import backendConnection from "./backendApi";

const token = sessionStorage.getItem("Token");

export const getEvents = async () => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/events/get-all-event`,
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
export const createEvent = async (data) => {
  try {
    const response = await axios.post(
      `${backendConnection()}/api/events/create-event`,
      data,
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
//getAttendee

export const getAttendees = async (id) => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/events/attendees/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      data: response.data.data[0],
      attendees: response.data.data[0].attendees,
      merch: response.data.merch_data,
    };
  } catch (error) {
    if (error.response && error.response.data) {
      return false;
    } else {
      console.log("error", "An error occurred");
      return false;
    }
  }
};

export const markAsPresent = async (
  eventId,
  attendeeId,
  campus,
  course,
  year,
  attendeeName,
  navigate
) => {
  try {
    const url = `${backendConnection()}/api/events/attendance/${eventId}/${attendeeId}`;

    const response = await axios.put(
      url,
      {
        campus,
        attendeeName,
        course,
        year,
        currentDate: new Date(),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200) {
      showToast("success", "Attendance successfully recorded!");
      return true;
    }
  } catch (error) {
    console.error("Error marking attendance:", error);

    if (error.response) {
      showToast("error", error.response.data.message || "An error occured");
    } else {
      showToast("error", "An error occurred while recording attendance.");
    }
  }
};

///check-limit/:eventId
export const getEventCheck = async (eventId) => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/events/check-limit/${eventId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return false;
    } else {
      console.log("error", "An error occurred");
      return false;
    }
  }
};

export const updateEventSettings = async (formData, eventId) => {
  try {
    const response = await axios.post(
      `${backendConnection()}/api/events/update-settings/${eventId}`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.status === 200 ? true : false;
  } catch (error) {
    if (error.response && error.response.data) {
      return false;
    } else {
      console.log("error", "An error occurred");
      return false;
    }
  }
};

export const getEligibleRaffleAttendees = async (eventId) => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/events/raffle/${eventId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching eligible attendees:", error);
    return error;
  }
};

export const raffleWinner = async (eventId, attendeeId, attendeeName) => {
  try {
    const response = await axios.post(
      `${backendConnection()}/api/events/raffle/winner/${eventId}/${attendeeId}`,
      { attendeeName },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error marking attendee as raffle winner:", error);
    return error;
  }
};

export const removeRaffleAttendee = async (
  eventId,
  attendeeId,
  attendeeName
) => {
  try {
    const response = await axios.put(
      `${backendConnection()}/api/events/raffle/remove/${eventId}/${attendeeId}`,
      { attendeeName },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error removing attendee from raffle:", error);
    return false;
  }
};

//add-attendee
export const addAttendee = async (formData) => {
  try {
    const response = await axios.post(
      `${backendConnection()}/api/events/add-attendee`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    showToast(
      response.status === 200 ? "success" : "error",
      response.data.message
    );
    return response.status === 200;
  } catch (error) {
    console.error("Error adding attendee:", error);
    showToast("error", error.response?.data?.message || "Something went wrong");
    return false;
  }
};

///get-statistics/:eventId
export const getStatistic = async (eventId) => {
  try {
    const response = await axios.get(
      `${backendConnection()}/api/events/get-statistics/${eventId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.status === 200 ? response.data : [];
  } catch (error) {
    if (error.response && error.response.data) {
      return false;
    } else {
      console.log("error", "An error occurred");
      return false;
    }
  }
};

export const removeAttendee = async (formData) => {
  try {
    const response = await axios.post(
      `${backendConnection()}/api/events/remove-attendance`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    showToast(
      response.status === 200 ? "success" : "error",
      response.data.message
    );
    return response.status === 200 ? true : false;
  } catch (error) {
    return error;
  }
};

export const removeEvent = async (eventId) => {
  try {
    const response = await axios.post(
      `${backendConnection()}/api/events/remove-event`,
      { eventId },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    showToast(
      response.status === 200 ? "success" : "error",
      response.data.message
    );
    return response.status === 200 ? true : false;
  } catch (error) {
    return error;
  }
};
