import { useState } from "react";
import CustomTailSpinner from "../CustomTailSpinner";

export default function ForcedInputModal({
  studentIdNumber,
  isOpen,
  onSubmit,
  loading,
}) {
  const [yearLevel, setYearLevel] = useState(0);
  const [error, setError] = useState("");

  const yearLevels = [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    // "5th Year",
    // "Irregular"
  ];

  const yearNumbers = [1, 2, 3, 4];

  if (!isOpen) return null;

  const handleChange = (e) => {
    const value = e.target.value;
    const numValue = Number(value); // Convert to number
    setYearLevel(numValue);
    if (error) setError("");
  };

  const validateForm = () => {
    if (!yearLevel || yearLevel < 1 || yearLevel > 5) {
      setError("Year level is required");
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(studentIdNumber, yearLevel);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 bg-opacity-40 backdrop-blur-sm z-[51]">
      <div className="bg-white p-8 mx-4 rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#08568a]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-[#08568a]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#08568a] mb-2">
            Update Your Details
          </h2>
          <p className="text-gray-600 text-sm">
            Please select your current year level to continue
          </p>
        </div>

        {/* Year Level Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Year Level <span className="text-red-500">*</span>
          </label>
          <select
            name="yearLevel"
            className={`w-full border-2 p-3 rounded-xl px-4 focus:ring-2 focus:ring-[#08568a] focus:border-[#08568a] outline-none transition-all duration-200 ${
              error
                ? "border-red-500 bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            value={yearLevel}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
          >
            <option value={0} className="text-gray-400">
              Select your year level
            </option>
            {yearLevels.map((year, index) => (
              <option
                key={index}
                value={yearNumbers[index]}
                className="text-gray-700"
              >
                {year}
              </option>
            ))}
          </select>
          {error && (
            <div className="flex items-center gap-2 mt-2">
              <svg
                className="w-4 h-4 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className={`w-full bg-[#08568a] ${
            loading && "disabled"
          }  hover:bg-[#074873] text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer`}
          disabled={loading}
        >
          <span className="flex flex-row gap-2 w-full justify-center">
            {loading && <CustomTailSpinner />} Save & Continue
          </span>
        </button>
      </div>
    </div>
  );
}
