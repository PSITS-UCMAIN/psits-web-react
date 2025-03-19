import { motion } from 'framer-motion';
import React, { useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';

const FilterAttendees = ({
  selectedCourses, onCourseChange,
  selectedYears, onYearChange,
  selectedSchools, onSchoolChange,
  selectedSizes, onSizeChange,
  selectedStatus, onStatusChange,
  onClose, onReset
}) => {
  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '18'];
  const courseOptions = ['BSIT', 'BSCS'];
  const yearOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const schoolOptions = ["UC-Main", "UC-Banilad", "UC-LM", "UC-PT", "UC-CS"];
  const statusOptions = ['Present', 'Absent'];
  const modalRef = useRef();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const FilterSection = ({ title, options, selectedOptions, onChange, isColor = false }) => (
    <div className="mb-4">
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const value = typeof option === 'object' ? option.value : option;
          const label = typeof option === 'object' ? option.label : option;
          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                selectedOptions.includes(value)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${isColor ? 'w-6 h-6 p-0' : ''}`}
              style={isColor ? { backgroundColor: value } : {}}
            >
              {isColor ? '' : label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const handleReset = () => {
    onCourseChange([]);
    onYearChange([]);
    onSchoolChange([]);
    onSizeChange([]);
    onStatusChange('');
    onReset();
  };

  return (
    <motion.div 
      className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-lg"
        ref={modalRef}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Filter Options</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <FilterSection
          title="Course"
          options={courseOptions}
          selectedOptions={selectedCourses}
          onChange={onCourseChange}
        />

        <FilterSection
          title="Year Level"
          options={yearOptions}
          selectedOptions={selectedYears}
          onChange={onYearChange}
        />

        <FilterSection
          title="School"
          options={schoolOptions}
          selectedOptions={selectedSchools}
          onChange={onSchoolChange}
        />

        <FilterSection
          title="T-Shirt Size"
          options={sizeOptions}
          selectedOptions={selectedSizes}
          onChange={onSizeChange}
        />

        <FilterSection
          title="Status"
          options={statusOptions}
          selectedOptions={selectedStatus}
          onChange={onStatusChange}
        />

        <div className="flex justify-between mt-6">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
          >
            Reset
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FilterAttendees;