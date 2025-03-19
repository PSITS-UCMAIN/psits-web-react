import React, { useEffect, useState } from "react";
import { updateEventSettings, getEventCheck } from "../../../api/event";
import { showToast } from "../../../utils/alertHelper";

const AttendanceSettings = ({ showModal, setShowModal, eventId }) => {
  const [limits, setLimits] = useState({
		banilad: "",
		pt: "",
		lm: "",
		cs: "",
	});

	const handleChange = (e) => {
		setLimits({ ...limits, [e.target.name]: e.target.value });
	};
	const fetchEventCheck = async () => {
		const response = await getEventCheck(eventId);

		setLimits({
			banilad: response.limit.filter((i) => i.campus === "UC-Banilad")[0].limit,
			pt: response.limit.filter((i) => i.campus === "UC-PT")[0].limit,
			lm: response.limit.filter((i) => i.campus === "UC-LM")[0].limit,
			cs: response.limit.filter((i) => i.campus === "UC-CS")[0].limit,
		});
	};

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("banilad", limits.banilad);
    formData.append("pt", limits.pt);
    formData.append("lm", limits.lm);
    formData.append("cs", limits.cs);

    try {
      if (await updateEventSettings(formData, eventId)) {
        showToast("success", "Settings updated successfully");
        setShowModal(false);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("Failed to update settings");
    }
  };
  useEffect(() => {
    fetchEventCheck();
  }, []);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-semibold mb-4">Attendees Settings</h2>
        <p className="text-gray-600">
          Set the maximum limit for attendees per location.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-gray-700">UC Banilad:</label>
            <input
              type="number"
              name="banilad"
              value={limits.banilad}
              onChange={handleChange}
              className="border rounded-lg p-1 w-20 text-center"
            />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-gray-700">UC PT:</label>
            <input
              type="number"
              name="pt"
              value={limits.pt}
              onChange={handleChange}
              className="border rounded-lg p-1 w-20 text-center"
            />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-gray-700">UC LM:</label>
            <input
              type="number"
              name="lm"
              value={limits.lm}
              onChange={handleChange}
              className="border rounded-lg p-1 w-20 text-center"
            />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-gray-700">UC Main CS:</label>
            <input
              type="number"
              name="cs"
              value={limits.cs}
              onChange={handleChange}
              className="border rounded-lg p-1 w-20 text-center"
            />
          </div>
          <div className="flex justify-end mt-4 space-x-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceSettings;
