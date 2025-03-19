import React, { useState, useEffect } from 'react';

const OperationHours = ({ styles }) => {
  const [status, setStatus] = useState("");

  useEffect(() => {
    const getHours = () => {
      const date = new Date();
      const day = date.getDay();
      const hours = date.getHours(21);
      
      const isSunday = day === 0;
      const isHoliday = false; // Add your holiday logic here

      if (isSunday || isHoliday) {
        setStatus("Closed");
      } else {
        const isOpen = (hours >= 7 && hours < 11) || (hours >= 13 && hours < 17);
        setStatus(isOpen ? "Open" : "Closed");
      }
    };

    getHours();
    
    const interval = setInterval(getHours, 60000);
    return () => clearInterval(interval);
  }, []);

  // Updated status color for 'Closed'
  const statusColor = status === "Open" ? "bg-green-500" : "bg-neutral-medium";

  return (
    <div className={`${styles} align-center justify-center w-full md:w-auto md:p-4 bg-white rounded-lg shadow-sm space-y-4 `}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-medium">
        <h4 className="text-sm sm:text-base font-semibold text-dark">Current Office Status</h4>
        <span
          className={`text-xs sm:text-sm py-1 px-2 text-white rounded-full ${statusColor}`}
          aria-label={`Office is currently ${status}`}
        >
          {status}
        </span>
      </div>
      {/* Desktop View */}
      <div className="hidden md:block p-4 md:py-0 space-y-2">
        <p className="text-xs sm:text-sm text-dark">
          <span className="font-semibold">Open:</span> Monday to Saturday
          <br />
          <span className="font-normal">7 AM - 11 AM, 1 PM - 5 PM</span>
        </p>
        <p className="text-xs sm:text-sm text-dark">
          <span className="font-semibold">Closed:</span> Sunday & Holidays
        </p>
        <p className="text-xs sm:text-sm text-dark flex items-center space-x-2">
          <i className="fas fa-map-marker-alt text-base" aria-hidden="true" />
          <span>PSITS Office, Room 537, 5th Floor</span>
        </p>
      </div>
    </div>
  );
};

export default OperationHours;
