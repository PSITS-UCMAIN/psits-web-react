import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";

const DashboardCard = ({ icon, title, count }) => {
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    hover: { scale: 1.05 },
  };

  return (
    <motion.div
      className="p-4 sm:p-6 bg-white shadow-sm rounded-lg flex flex-col items-center justify-between h-full"
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
      transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
    >
      <div className="mb-3  flex flex-col items-center justify-center gap-2">
      <FontAwesomeIcon 
        icon={icon}
        className="text-2xl sm:text-3xl text-[#074873]"
      />
        <h3 className="text-sm sm:text-base font-medium text-gray-500">
          {title}
        </h3>
      </div>
      <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#074873] mt-auto">
        {count}
      </p>
    </motion.div>
  );
};

export default DashboardCard;
