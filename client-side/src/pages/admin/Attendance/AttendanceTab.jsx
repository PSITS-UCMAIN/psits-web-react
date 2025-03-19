import { AnimatePresence } from "framer-motion";
import React, { useState } from "react";
import { CSVLink } from "react-csv";
import { useNavigate } from "react-router-dom";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import { getInformationData } from "../../../authentication/Authentication";
import ButtonsComponent from "../../../components/Custom/ButtonsComponent";
import TableComponent from "../../../components/Custom/TableComponent";
import FormButton from "../../../components/forms/FormButton";
import { higherOfficers } from "../../../components/tools/clientTools";
import FilterAttendees from "./FilterAttendees";

const AttendanceTabs = ({
  columns,
  filteredData, // Data from parent component
  searchQuery,
  setSearchQuery,
  setIsFilterOpen,
  setShowModal,
  fetchData,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isFilterOptionOpen, setIsFilterOptionOpen] = useState(false);
  const navigate = useNavigate();
  const user = getInformationData();

  // State for filters
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]);

  // Map year options to numeric values
  const yearOptionsMap = {
    "1st Year": 1,
    "2nd Year": 2,
    "3rd Year": 3,
    "4th Year": 4,
  };

  // Filter handlers
  const handleCourseChange = (course) => {
    setSelectedCourses((prev) =>
      prev.includes(course) ? prev.filter((c) => c !== course ) : [...prev, course]
    );
  };

  const handleYearChange = (year) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleSchoolChange = (school) => {
    setSelectedSchools((prev) =>
      prev.includes(school) ? prev.filter((s) => s !== school)  : [...prev, school]
    );
  };

  const handleSizeChange = (size) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleStatusChange = (status) => {
    setSelectedStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  // Reset all filters
  const handleReset = () => {
    setSelectedCourses([]);
    setSelectedYears([]);
    setSelectedSchools([]);
    setSelectedSizes([]);
    setSelectedStatus([]);
  };

  // Branch options
  const branches = higherOfficers()
    ? ["All", "UC-Main", "UC-Banilad", "UC-LM", "UC-PT", "UC-CS"]
    : [user.campus];

  // Filter data by branch
  const branchFilteredData = (branch) => {
    return branch === "All"
      ? filteredData
      : filteredData.filter((item) => item.campus === branch);
  };

  // Apply all filters (branch, year, course, etc.)
  const applyAllFilters = (data, branch) => {
    let result = data;

    // Filter by branch
    result = branchFilteredData(branch);

    // Filter by selected courses
    if (selectedCourses.length > 0) {
      result = result.filter((item) => selectedCourses.includes(item.course));
    }

    // Filter by selected years
    if (selectedYears.length > 0) {
      // Convert selected year options to their corresponding numeric values
      const selectedYearNumbers = selectedYears.map((year) => yearOptionsMap[year]);
      result = result.filter((item) => selectedYearNumbers.includes(item.year));
    }

    // Filter by selected schools
    if (selectedSchools.length > 0) {
      result = result.filter((item) => selectedSchools.includes(item.campus));
    }

    // Filter by selected sizes
    if (selectedSizes.length > 0) {
      result = result.filter((item) => selectedSizes.includes(item.shirtSize));
    }

    // Filter by selected status
    if (selectedStatus.length > 0) {
      result = result.filter((item) =>
        selectedStatus.includes(item.isAttended ? "Present" : "Absent")
      );
    }

    return result;
  };

  // Toggle filter options
  const toggleFilterOption = () => {
    setIsFilterOptionOpen((prevState) => !prevState);
  };

  // Render tab panel content
  const renderTabPanelContent = (branchName) => {
    // Apply all filters to the data
    const filteredDataForTable = applyAllFilters(filteredData, branchName);

    const exportData = filteredDataForTable.map((item) => ({
      "Student ID": item.id_number,
      Name: item.name,
      Course: item.course,
      "Year Level": item.year,
      Campus: item.campus,
      Attendance: item.isAttended ? "Present" : "Absent",
      Confirm_Attendance_By: item.isAttended ? item.confirmedBy : "N/A",
      Processed_By: item.transactBy,
      Processed_Date: item.transactDate,
      "Shirt Size": item.shirtSize,
      "Shirt Price": item.shirtPrice,
    }));

    return (
      <div className="overflow-x-auto">
        <TableComponent
          columns={columns}
          loading={loading}
          data={filteredDataForTable} // Pass filtered data to the table
          customButtons={
            <div className="flex flex-col justify-between gap-5 container">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex justify-end gap-2">
                  <FormButton
                    type="button"
                    text="Filter"
                    icon={<i className="fas fa-filter"></i>}
                    onClick={toggleFilterOption}
                    styles="bg-gray-500 text-white hover:bg-gray-600 active:bg-gray-700 rounded-md px-4 py-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 flex items-center gap-2"
                    textClass="sm:block hidden text-white"
                    whileHover={{ scale: 1.01, opacity: 0.95 }}
                    whileTap={{ scale: 0.98, opacity: 0.9 }}
                  />

                  <AnimatePresence>
                    {isFilterOptionOpen && (
                      <FilterAttendees
                        selectedCourses={selectedCourses}
                        onCourseChange={handleCourseChange}
                        selectedYears={selectedYears}
                        onYearChange={handleYearChange}
                        selectedSchools={selectedSchools}
                        onSchoolChange={handleSchoolChange}
                        selectedSizes={selectedSizes}
                        onSizeChange={handleSizeChange}
                        selectedStatus={selectedStatus}
                        onStatusChange={handleStatusChange}
                        onClose={toggleFilterOption}
                        onReset={handleReset}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex flex-row justify-between items-center gap-2 container">
                <div>
                  <ButtonsComponent>
                    <div className="flex flex-row items-center gap-2">
                      {user.campus === "UC-Main" && (
                        <FormButton
                          type="button"
                          text="Scan QR"
                          icon={<i className="fas fa-qrcode text-base"></i>}
                          onClick={() => navigate("/admin/qrCodeScanner")}
                          styles="bg-blue-100 text-blue-800 hover:bg-blue-200 active:bg-blue-300 rounded-md px-4 py-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2"
                          textClass="sm:block hidden text-gray-800"
                          whileHover={{ scale: 1.01, opacity: 0.95 }}
                          whileTap={{ scale: 0.98, opacity: 0.9 }}
                        />
                      )}
                      <FormButton
                        type="button"
                        text="Refresh"
                        icon={<i className="fas fa-refresh"></i>}
                        styles="bg-blue-400 text-white hover:bg-blue-600 active:bg-blue-700 rounded-md px-4 py-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2"
                        textClass="sm:block hidden text-white"
                        whileHover={{ scale: 1.01, opacity: 0.95 }}
                        whileTap={{ scale: 0.98, opacity: 0.9 }}
                        onClick={fetchData}
                      />
                    </div>
                  </ButtonsComponent>
                </div>

                <div>
                  <ButtonsComponent>
                    <div className="flex flex-row justify-right gap-2">
                      <CSVLink data={exportData} filename={`attendance-${branchName}.csv`}>
                        <FormButton
                          type="button"
                          text="Export CSV"
                          icon={<i className="fas fa-file"></i>}
                          styles="bg-green-500 text-white hover:bg-green-600 active:bg-green-700 rounded-md px-4 py-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center gap-2"
                          textClass="sm:block hidden text-white"
                          whileHover={{ scale: 1.01, opacity: 0.95 }}
                          whileTap={{ scale: 0.98, opacity: 0.9 }}
                        />
                      </CSVLink>
                    </div>
                  </ButtonsComponent>
                </div>
              </div>
            </div>
          }
        />
      </div>
    );
  };

  return (
    <Tabs selectedIndex={activeTab} onSelect={(index) => setActiveTab(index)}>
      <TabList>
        {branches.map((branch) => (
          <Tab key={branch}>
            {branch} [ {applyAllFilters(filteredData, branch).length} ]
          </Tab>
        ))}
      </TabList>
      {branches.map((branch) => (
        <TabPanel key={branch}>{renderTabPanelContent(branch)}</TabPanel>
      ))}
    </Tabs>
  );
};

export default AttendanceTabs;