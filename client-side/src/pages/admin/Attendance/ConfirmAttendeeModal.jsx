import React from "react";
import { AiOutlineClose } from "react-icons/ai";



const ConfirmAttendeeModal = ({ formData, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ">
      <div className=" bg-white rounded-lg shadow-lg w-full max-w-2xl  relative sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl max-h-screen overflow-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <AiOutlineClose size={24} />
        </button>

        <div className="p-5 w-full sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl max-h-screen ">
          <h3 className="text-xl font-bold mb-1 ">Confirm Information</h3>
          {/* <div className="bg-white p-6 rounded w-96">

            <div className="space-y-2">
              <p><strong>ID Number:</strong> {formData.id_number}</p>
              <p><strong>First Name:</strong> {formData.first_name}</p>
              <p><strong>Middle Name:</strong> {formData.middle_name || "N/A"}</p>
              <p><strong>Last Name:</strong> {formData.last_name}</p>
              <p><strong>Email:</strong> {formData.email}</p>
              <p><strong>Course:</strong> {formData.course}</p>
              <p><strong>Year:</strong> {formData.year}</p>
              <p><strong>Campus:</strong> {formData.campus}</p>
              <p><strong>T-Shirt Size:</strong> {formData.shirt_size}</p>
            </div>

          </div> */}

          <div id="modal-description" className="space-y-4 mt-5">
          {Object.entries(formData || {})
            .filter(([key]) => key !== "_id" && key !== "isAttended") // Exclude specific keys
            .map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium text-gray-700 capitalize">
                  {key.replace(/_/g, " ")}:
                </span>
                <span className="text-gray-900">{value}</span>
              </div>
            ))}

          </div>
          <div className="flex justify-end mt-4 space-x-2">
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded"
                onClick={onClose}
              >
                Edit
              </button>
              <button
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  onClick={onConfirm}
                >
                  Confirm
                </button>
            </div>
        </div>
      </div>
    </div>

  );
};

export default ConfirmAttendeeModal;