import { motion } from "framer-motion";
import React from "react";

const campusList = ["UC-Main", "UC-Banilad", "UC-LM", "UC-PT", "All"];

const Tabs = ({ selectedCampus, setSelectedCampus }) => {
  const handleSelectCampus = (campus) => {
    setSelectedCampus(campus);
  };

  return (
    <div className="mb-5 flex gap-2 justify-center items-center rounded-lg bg-primary 2xl:fixed 2xl:bottom-0 text-white p-2 shadow-lg">
      {campusList.map((campus) => {
        // Remove 'UC-' from the campus name for display
        const displayCampus = campus.replace("UC-", "");

        return (
          <motion.button
            key={campus}
            className={`px-4 py-2 rounded-full transition-transform duration-300 ease-in-out transform ${
              selectedCampus === campus
                ? "bg-navy scale-110 shadow-xl"
                : "hover:scale-105"
            }`}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelectCampus(campus)}
          >
            {displayCampus} {/* Display the transformed campus name */}
          </motion.button>
        );
      })}
    </div>
  );
};

export default Tabs;
