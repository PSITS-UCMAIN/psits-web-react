import React, { useState } from "react";
import { fetchStudentName, requestRoleAdmin } from "../../../api/admin";
import { getInformationData } from "../../../authentication/Authentication";

function SearchModal({ position, onClose }) {
  const [number, setNumber] = useState("");
  const [result, setResult] = useState(null);
  const [response, setResponse] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = getInformationData();

  const handleSearch = async () => {
    setLoading(true);
    const response = await fetchStudentName(number);

    setTimeout(() => {
      if (response) {
        setResult(
          `Result: ${response.data.first_name + " " + response.data.last_name}`
        );
        setResponse(true);
        setLoading(false);
      } else {
        setResult("No student found or it already added");
        setLoading(false);
        setResponse(false);
      }
    }, 1000);
  };

  const handleRequest = async () => {
    const lowerCase = position.toLowerCase();

    if (await requestRoleAdmin(lowerCase, number, user?.name)) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60">
      <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full relative">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-semibold">Add {position} Role</h1>
          <button
            onClick={onClose}
            className="text-3xl text-gray-500 hover:text-gray-700 transition"
          >
            &times;
          </button>
        </div>

        <h2 className="text-lg font-medium mb-3">Enter ID Number</h2>
        <input
          type="number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Enter ID number"
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          className={`mt-4 w-full p-2 rounded-lg text-white transition ${
            loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Searching..." : "Search"}
        </button>

        {result && (
          <div className="mt-4 text-sm text-gray-700 bg-gray-100 p-3 rounded-lg">
            {result}
          </div>
        )}

        {response && (
          <div className="mt-5 flex gap-3">
            <button
              onClick={handleRequest}
              className="flex-1 p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition"
            >
              Request
            </button>
            <button
              onClick={onClose}
              className="flex-1 p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchModal;
