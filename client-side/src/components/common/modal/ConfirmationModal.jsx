import React from "react";
import {
  ConfirmActionType,
  ConfirmActionWords,
} from "../../../enums/commonEnums.js";
import { capitalizeFirstLetter } from "../../../utils/stringUtils.js";

function ConfirmationModal({ confirmType, onConfirm, onCancel, type }) {
  let confirmTypeWord = ConfirmActionWords[confirmType];

  const confirmButtonColor =
    confirmType === ConfirmActionType.DELETION ||
    confirmType === ConfirmActionType.SUSPEND ||
    confirmType === ConfirmActionType.RENEWAL ||
    confirmType === ConfirmActionType.ORDER ||
    confirmType === ConfirmActionType.CANCEL ||
    confirmType === ConfirmActionType.REMOVE ||
    confirmType === ConfirmActionType.DECLINE
      ? "bg-[#991b1b] hover:bg-[#b92121]"
      : "bg-green-500 hover:bg-green-600";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Semi-transparent background */}
      <div
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
        onClick={onCancel}
      ></div>

      {/* Modal Container */}
      <div className="bg-white rounded-xl shadow-xl min-w-96 md:min-w-[450px] w-fit z-10 overflow-hidden transform transition-all duration-300 scale-95">
        {/* Header */}
        <div
          className={`flex justify-between items-center p-5 ${confirmButtonColor} text-white rounded-t-xl shadow-md`}
        >
          <h5 className="text-xl font-primary font-bold">
            Confirm {capitalizeFirstLetter(confirmType)}{" "}
            {confirmType === ConfirmActionType.ORDER && "Cancellation"}
          </h5>
          <button
            type="button"
            className="text-3xl leading-none hover:text-gray-200 focus:outline-none"
            aria-label="Close"
            onClick={onCancel}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 font-secondary text-lg bg-gray-50 text-gray-800">
          <p>
            Are you sure you want to {confirmTypeWord === "renewal" && "do "}
            {confirmTypeWord}
            {confirmTypeWord === "cancel" ? " the membership request of " : " "}
            {confirmTypeWord === "cancel this order" ||
            confirmTypeWord === "renewal"
              ? ""
              : confirmTypeWord === "suspend"
              ? " this officer"
              : confirmTypeWord === "remove" && type === "attendance"
              ? " this  student"
              : confirmTypeWord === "remove"
              ? " this role for this student"
              : type === "officer"
              ? " this officer"
              : " this student"}
            ?
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 bg-white border-t border-gray-200 rounded-b-xl">
          <button
            type="button"
            className="px-5 py-2 text-gray-500 hover:text-gray-700 transition-all focus:outline-none rounded-md border border-gray-300 hover:border-gray-400"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`ml-3 px-6 py-2 text-white rounded ${confirmButtonColor}`}
            onClick={onConfirm}
          >
            {confirmTypeWord !== "cancel"
              ? capitalizeFirstLetter(confirmTypeWord)
              : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
