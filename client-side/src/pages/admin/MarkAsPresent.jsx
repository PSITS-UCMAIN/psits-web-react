import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { markAsPresent } from "../../api/event"; // Import markAsPresent

const MarkAsPresent = () => {
  const { eventId, eventName, attendeeId, attendeeName } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex justify-center items-center h-[80vh]">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-semibold text-center mb-4">
          Are you sure you want to mark{" "}
          <span className="font-bold">{`${attendeeId} - ${attendeeName}`}</span>{" "}
          present for the event <span className="font-bold">{eventName}</span>?
        </h2>
        <div className="flex justify-around">
          <button
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={() => markAsPresent(eventId, attendeeId, navigate)} // Pass navigate
          >
            Mark As Present
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkAsPresent;
