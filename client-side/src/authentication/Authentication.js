import axios from "axios";
import backendConnection from "../api/backendApi";

let storedData;
let storedRole;

export const getRoute = () => {
  return storedRole || null;
};

export const setInformationData = (data, role) => {
  storedData = data;
  storedRole = role;
};

export const getInformationData = () => {
  return {
    id_number: storedData?.id_number || null,
    name: storedData?.name || null,
    email: storedData?.email || null,
    course: storedData?.course || null,
    year: storedData?.year || null,
    role: storedRole || null,
    position: storedData?.position || null,
    audience: storedData?.role || null,
    campus: storedData?.campus || null,
  };
};
export const removeAuthentication = () => {
  const userData = getInformationData();
  if (userData.role === "Admin") {
    const logData = {
      admin: userData.name || "Unknown Admin",
      admin_id: userData.id_number || "Unknown ID",
      action: "Admin Logged Out",
    };

    // Send log data to server
    axios
      .post(`${backendConnection()}/api/logs`, logData, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("Token")}`,
        },
      })
      .then(() => {
        // console.log("Logout action logged successfully.");
      })
      .catch((error) => {
        console.error("Error logging logout action:", error);
      });
  }

  // Clear client-side authentication
  sessionStorage.removeItem("Token");
  sessionStorage.removeItem("Data");
  sessionStorage.removeItem("hasReloaded");
  localStorage.removeItem("delayed_render");
  storedData = null;
  storedRole = null;
};

//Attempt Increment
export const attemptAuthentication = () => {
  let attempt = parseInt(localStorage.getItem("attempt")) || 0;
  if (attempt === 2) {
    timeOutAuthentication();
  }
  attempt++;
  localStorage.setItem("attempt", attempt);
};

//Retrieve Attempt for conditional
export const getAttemptAuthentication = () => {
  return parseInt(localStorage.getItem("attempt")) || 0;
};
//Reset Attempt when successful login
export const resetAttemptAuthentication = () => {
  localStorage.removeItem("attempt");
};
//After 3 attempts, mu set og 1 minute rest para dili stress sa database
export const timeOutAuthentication = () => {
  const currentTime = new Date().getTime();
  const time = 60 * 1000;
  const expiryTime = currentTime + time;

  localStorage.setItem("timeout", expiryTime);
};
//E retrieve ang timeout
export const getTimeout = () => {
  const now = new Date();
  const time = localStorage.getItem("timeout");

  if (!time) {
    return null;
  }

  if (now.getTime() > time) {
    localStorage.removeItem("timeout");
    localStorage.removeItem("attempt");

    return null;
  }

  return time;
};
