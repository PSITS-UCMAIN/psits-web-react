import axios from "axios";
import { useState } from "react";
import backendConnection from "../../../api/backendApi";
import { showToast } from "../../../utils/alertHelper.js";
function AddEvent({ handleClose }) {
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    eventName: "",
    description: "",
    eventDate: "",
    attendanceType: "open",
    sessionConfig: {
      isMorningEnabled: true,
      morningTime: "",
      isAfternoonEnabled: false,
      afternoonTime: "",
      isEveningEnabled: false,
      eveningTime: "",
    },
  });

  const [errors, setErrors] = useState({
    eventName: "",
    description: "",
    eventDate: "",
    attendanceType: "",
    sessions: "",
    images: "",
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle session configuration changes
  const handleSessionChange = (session, field, value) => {
    // Create the correct field name: is + Session + Enabled
    const fieldName = `is${
      session.charAt(0).toUpperCase() + session.slice(1)
    }${field}`;
    console.log(`Setting ${fieldName} to ${value}`); // Debug log

    setFormData((prev) => {
      const newSessionConfig = { ...prev.sessionConfig };
      newSessionConfig[fieldName] = value;

      // Remove any duplicate fields that might exist
      delete newSessionConfig[`${session}${field}`];

      return {
        ...prev,
        sessionConfig: newSessionConfig,
      };
    });
  };

  const handleAttendanceTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      attendanceType: type,
    }));
  };

  // Handle session time changes
  const handleTimeChange = (session, startTime, endTime) => {
    const timeRange = `${startTime} - ${endTime}`;
    setFormData((prev) => ({
      ...prev,
      sessionConfig: {
        ...prev.sessionConfig,
        [`${session}Time`]: timeRange,
      },
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 3) {
      alert("You can only upload up to 3 images");
      return;
    }

    setImages((prevImages) => [...prevImages, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prevPreviews) => [...prevPreviews, ...newPreviews]);
  };

  const handleRemoveImage = (index) => {
    setImages((prevImages) => {
      const updatedImages = prevImages.filter((_, i) => i !== index);
      return updatedImages;
    });

    setImagePreviews((prevPreviews) => {
      const updatedPreviews = prevPreviews.filter((_, i) => i !== index);
      return updatedPreviews;
    });
  };

  // Validation
  const validate = () => {
    const newErrors = {};
    if (!formData.eventName) newErrors.eventName = "Event name is required";
    if (!formData.eventDate) newErrors.eventDate = "Event date is required";

    // Check if at least one session is enabled and has time
    const { sessionConfig } = formData;
    const hasValidSession =
      (sessionConfig.isMorningEnabled && sessionConfig.morningTime) ||
      (sessionConfig.isAfternoonEnabled && sessionConfig.afternoonTime) ||
      (sessionConfig.isEveningEnabled && sessionConfig.eveningTime);

    if (!hasValidSession) {
      newErrors.sessions =
        "At least one session must be enabled with a time range";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validate()) {
      setIsLoading(true);

      try {
        const data = new FormData();

        // Append images to FormData
        if (images && images.length > 0) {
          images.forEach((image) => data.append("images", image));
        }

        // Append other form data
        data.append("name", formData.eventName);
        data.append("eventDate", formData.eventDate);
        data.append("description", formData.description);
        data.append("attendanceType", formData.attendanceType);
        // Handle sessionConfig - stringify it
        try {
          data.append("sessionConfig", JSON.stringify(formData.sessionConfig));
        } catch (error) {
          console.error(
            "Error stringifying sessionConfig:",
            formData.sessionConfig
          );

          setIsLoading(false);
          return;
        }

        const token = sessionStorage.getItem("Token");
        // Use axios with backendConnection utility
        const response = await axios.post(
          `${backendConnection()}/api/events/create-event`,
          data,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        showToast("success", "Event created successfully!");
        handleClose();
      } catch (error) {
        console.error("Error creating event:", error);

        if (error.response) {
          // Server responded with error status
          const errorMessage =
            error.response.data?.message || "Server error occurred";
          showToast("error", `Failed to create event: ${errorMessage}`);
        } else if (error.request) {
          // Request made but no response received
          showToast("error", "Failed to create event: No response from server");
        } else {
          // Something else happened
          showToast("error", "Failed to create event. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const parseTimeRange = (timeRange) => {
    if (!timeRange) return { start: "", end: "" };
    const [start, end] = timeRange.split(" - ");
    return { start: start || "", end: end || "" };
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="loader"></div>
          <p className="ml-4 text-white">Creating event, please wait...</p>
        </div>
      ) : (
        <div className="relative max-w-2xl w-full mx-4 p-6 bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
          >
            <span className="text-2xl">×</span>
          </button>

          <h2 className="text-2xl font-semibold mb-6">Add New Event</h2>

          <div className="space-y-4">
            {/* Image Upload */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Images
              </label>
              <input
                type="file"
                onChange={handleImageChange}
                multiple
                accept="image/*"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index}`}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Name */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Name
              </label>
              <input
                type="text"
                name="eventName"
                value={formData.eventName}
                onChange={handleChange}
                className={`block w-full px-3 py-2 border ${
                  errors.eventName ? "border-red-500" : "border-gray-300"
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                required
              />
              {errors.eventName && (
                <p className="mt-1 text-sm text-red-600">{errors.eventName}</p>
              )}
            </div>

            {/* Event Description */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Event Date */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Date
              </label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                className={`block w-full px-3 py-2 border ${
                  errors.eventDate ? "border-red-500" : "border-gray-300"
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                required
              />
              {errors.eventDate && (
                <p className="mt-1 text-sm text-red-600">{errors.eventDate}</p>
              )}
            </div>

            {/* Attendance Type */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attendance Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {/* Open Option */}
                <div
                  className={`border p-4 rounded-lg flex items-center cursor-pointer transition-colors ${
                    formData.attendanceType === "open"
                      ? "border-blue-500 bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleAttendanceTypeChange("open")}
                >
                  <input
                    type="radio"
                    name="attendanceType"
                    checked={formData.attendanceType === "open"}
                    readOnly // Since we're handling clicks via the container
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 font-medium cursor-pointer">
                    Open
                  </label>
                </div>
              </div>
              <label className="block text-sm font-medium italic text-gray-500 mt-2">
                Note: Ticketed events must be created through the Merchandise
                page.
              </label>
            </div>

            {/* Session Configuration */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Configuration
              </label>

              {/* Morning Session */}
              <div className="border p-4 rounded-lg mb-4">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={formData.sessionConfig.isMorningEnabled}
                    onChange={(e) =>
                      handleSessionChange(
                        "morning",
                        "Enabled",
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 font-medium">Morning Session</label>
                </div>
                {formData.sessionConfig.isMorningEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <input
                        type="time"
                        value={
                          parseTimeRange(formData.sessionConfig.morningTime)
                            .start
                        }
                        onChange={(e) => {
                          const endTime = parseTimeRange(
                            formData.sessionConfig.morningTime
                          ).end;
                          handleTimeChange("morning", e.target.value, endTime);
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Start time</p>
                    </div>
                    <div>
                      <input
                        type="time"
                        value={
                          parseTimeRange(formData.sessionConfig.morningTime).end
                        }
                        onChange={(e) => {
                          const startTime = parseTimeRange(
                            formData.sessionConfig.morningTime
                          ).start;
                          handleTimeChange(
                            "morning",
                            startTime,
                            e.target.value
                          );
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">End time</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Afternoon Session */}
              <div className="border p-4 rounded-lg mb-4">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={formData.sessionConfig.isAfternoonEnabled}
                    onChange={(e) =>
                      handleSessionChange(
                        "afternoon",
                        "Enabled",
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 font-medium">Afternoon Session</label>
                </div>
                {formData.sessionConfig.isAfternoonEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <input
                        type="time"
                        value={
                          parseTimeRange(formData.sessionConfig.afternoonTime)
                            .start
                        }
                        onChange={(e) => {
                          const endTime = parseTimeRange(
                            formData.sessionConfig.afternoonTime
                          ).end;
                          handleTimeChange(
                            "afternoon",
                            e.target.value,
                            endTime
                          );
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Start time</p>
                    </div>
                    <div>
                      <input
                        type="time"
                        value={
                          parseTimeRange(formData.sessionConfig.afternoonTime)
                            .end
                        }
                        onChange={(e) => {
                          const startTime = parseTimeRange(
                            formData.sessionConfig.afternoonTime
                          ).start;
                          handleTimeChange(
                            "afternoon",
                            startTime,
                            e.target.value
                          );
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">End time</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Evening Session */}
              <div className="border p-4 rounded-lg mb-4">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={formData.sessionConfig.isEveningEnabled}
                    onChange={(e) =>
                      handleSessionChange(
                        "evening",
                        "Enabled",
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 font-medium">Evening Session</label>
                </div>
                {formData.sessionConfig.isEveningEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <input
                        type="time"
                        value={
                          parseTimeRange(formData.sessionConfig.eveningTime)
                            .start
                        }
                        onChange={(e) => {
                          const endTime = parseTimeRange(
                            formData.sessionConfig.eveningTime
                          ).end;
                          handleTimeChange("evening", e.target.value, endTime);
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Start time</p>
                    </div>
                    <div>
                      <input
                        type="time"
                        value={
                          parseTimeRange(formData.sessionConfig.eveningTime).end
                        }
                        onChange={(e) => {
                          const startTime = parseTimeRange(
                            formData.sessionConfig.eveningTime
                          ).start;
                          handleTimeChange(
                            "evening",
                            startTime,
                            e.target.value
                          );
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">End time</p>
                    </div>
                  </div>
                )}
              </div>

              {errors.sessions && (
                <p className="mt-1 text-sm text-red-600">{errors.sessions}</p>
              )}
            </div>

            {/* Form Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddEvent;
