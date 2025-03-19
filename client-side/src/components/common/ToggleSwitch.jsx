import React from "react";

const ToggleSwitch = ({ isToggled, onToggle }) => {
  return (
    <div
      className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer ${
        isToggled ? "bg-green-500" : "bg-gray-300"
      }`}
      onClick={onToggle}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
          isToggled ? "translate-x-4" : "translate-x-0"
        }`}
      ></div>
    </div>
  );
};

export default ToggleSwitch;
