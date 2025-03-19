import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import {
  membershipHistory,
  merchandiseAdmin,
  deleteReports,
  logAdminAction,
} from "../../api/admin";
import ButtonsComponent from "../../components/Custom/ButtonsComponent";
import ConfirmationModal from "../../components/common/modal/ConfirmationModal";
import FormButton from "../../components/forms/FormButton";
import { formattedDate } from "../../components/tools/clientTools";
import { deletePosition } from "../../components/tools/clientTools";
import { ConfirmActionType } from "../../enums/commonEnums";
import { CSVLink } from "react-csv";
import { getInformationData } from "../../authentication/Authentication";

const Reports = () => {
  const [membershipData, setMembershipData] = useState([]);
  const [merchandiseData, setMerchandiseData] = useState([]);
  const [filteredMembershipData, setFilteredMembershipData] = useState([]);
  const [filteredMerchandiseData, setFilteredMerchandiseData] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [productNames, setProductNames] = useState([]);
  const [salesData, setSalesData] = useState({});
  const [confirmModal, setConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [productDeleteId, setProductDeleteId] = useState("");
  const [deleteName, setDeleteName] = useState("");

  const [filterID, setFilterID] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterRFID, setFilterRFID] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterSize, setFilterSize] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [getData, setGetData] = useState([]);

  const userData = getInformationData();

  const customStyles = {
    rows: {
      style: {
        padding: "2px",
      },
    },
    headCells: {
      style: {
        paddingLeft: "2px",
        paddingRight: "2px",
        padding: "1rem",
        backgroundColor: "#0e4a6a",
        color: "#fff",
        fontSize: "10px",
        fontWeight: "bold",
      },
    },
    cells: {
      style: {
        paddingLeft: "10px",
        paddingRight: "10px",
        padding: "1rem",
        fontSize: "12px",
        color: "#333",
      },
    },
  };

  const handleConfirmModal = (id, name) => {
    const product = getData.find((order) =>
      order.order_details.some((detail) => detail._id === id)
    );
    setProductDeleteId(product._id);

    setDeleteId(id);
    setDeleteName(name);
    setConfirmModal(true);
  };
  const handleHideConfirmModal = () => {
    setConfirmModal(false);
    setDeleteId("");
    setDeleteName("");
  };

  const handleDeleteReport = async () => {
    //logic
    if (await deleteReports(productDeleteId,deleteId, deleteName)) {
      handleHideConfirmModal();
      fetchMerchandiseData();
    }
  };

  useEffect(() => {
    if (activeTab === 0) {
      fetchMembershipData();
    } else {
      fetchMerchandiseData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 0) {
      applyFilter(membershipData, setFilteredMembershipData);
    } else {
      applyFilter(merchandiseData, setFilteredMerchandiseData);
      calculateSalesData();
    }
  }, [
    membershipData,
    merchandiseData,
    filterID,
    filterName,
    filterRFID,
    filterCourse,
    filterYear,
    filterDateFrom,
    filterDateTo,
    filterProductName,
    filterBatch,
    filterSize,
    filterColor,
    filterType,
    activeTab,
  ]);

  const fetchMembershipData = async () => {
    try {
      const data = await membershipHistory();
      setMembershipData(data);
      setFilteredMembershipData(data);
    } catch (error) {
      console.error("Error fetching membership data:", error);
    }
  };

  const fetchMerchandiseData = async () => {
    try {
      const data = await merchandiseAdmin();
      const allOrderDetails = data
        ? data.flatMap((order) => order.order_details || [])
        : [];
      const filteredOrderDetails = allOrderDetails.filter(
        (detail) => detail !== undefined
      );
      const allSalesData = data
        ? data.flatMap((sales) => sales.sales_data || [])
        : [];
      // console.dir(data, { depth: null }); // This will properly display the full object structure
      // console.dir(allOrderDetails, { depth: null });
      // console.dir(filteredOrderDetails, { depth: null });
      setGetData(data);
      setMerchandiseData(filteredOrderDetails);
      setFilteredMerchandiseData(filteredOrderDetails);
      setProductNames(filteredOrderDetails);
      setSalesData(allSalesData);
      // console.log(allOrderDetails);
    } catch (error) {
      console.error("Error fetching merchandise data:", error);
    }
  };

  const applyFilter = (data, setData) => {
    let filteredData = data;

    if (activeTab === 0) {
      if (filterID) {
        filteredData = filteredData.filter((item) =>
          item.reference_code?.includes(filterID)
        );
      }
      if (filterName) {
        filteredData = filteredData.filter((item) =>
          item.name?.toLowerCase().includes(filterName.toLowerCase())
        );
      }
      if (filterType) {
        filteredData = filteredData.filter((item) =>
          item.type?.toLowerCase().includes(filterType.toLowerCase())
        );
      }
      if (filterRFID) {
        filteredData = filteredData.filter((item) =>
          item.rfid?.includes(filterRFID)
        );
      }
      if (filterCourse) {
        filteredData = filteredData.filter((item) =>
          item.course?.toLowerCase().includes(filterCourse.toLowerCase())
        );
      }
      if (filterYear) {
        filteredData = filteredData.filter((item) =>
          item.year?.includes(filterYear)
        );
      }
    } else {
      if (filterID) {
        filteredData = filteredData.filter((item) =>
          item.id_number?.includes(filterID)
        );
      }
      if (filterCourse) {
        filteredData = filteredData.filter((item) =>
          item.course?.toLowerCase().includes(filterCourse.toLowerCase())
        );
      }
      if (filterYear) {
        filteredData = filteredData.filter((item) =>
          String(item.year).includes(filterYear)
        );
      }

      if (filterName) {
        filteredData = filteredData.filter((item) =>
          item.student_name?.toLowerCase().includes(filterName.toLowerCase())
        );
      }
      if (filterProductName) {
        filteredData = filteredData.filter((item) =>
          item.product_name
            ?.toLowerCase()
            .includes(filterProductName.toLowerCase())
        );
      }
      if (filterRFID) {
        filteredData = filteredData.filter((item) =>
          item.rfid?.includes(filterRFID)
        );
      }
      if (filterDateFrom && filterDateTo) {
        filteredData = filteredData.filter(
          (item) =>
            new Date(formattedDate(item.transaction_date)) >=
              new Date(formattedDate(filterDateFrom)) &&
            new Date(formattedDate(item.transaction_date)) <=
              new Date(formattedDate(filterDateTo))
        );

        // console.log(filteredData);
      }

      if (filterBatch) {
        filteredData = filteredData.filter((item) =>
          item.batch?.includes(filterBatch)
        );
      }
      if (filterSize) {
        filteredData = filteredData.filter((item) =>
          item.size?.[0]?.$each?.[0]?.includes(filterSize)
        );
      }
      if (filterColor) {
        filteredData = filteredData.filter((item) =>
          item.variation?.[0]?.$each?.[0]?.includes(filterColor)
        );
      }
    }

    setData(filteredData);
  };

  const calculateSalesData = () => {
    if (activeTab === 1 && filteredMerchandiseData.length) {
      const salesMap = filteredMerchandiseData.reduce((acc, item) => {
        if (!acc[item.product_name]) {
          acc[item.product_name] = { unitsSold: 0, totalRevenue: 0 };
        }
        acc[item.product_name].unitsSold += item.quantity;
        acc[item.product_name].totalRevenue += item.total;
        return acc;
      }, {});

      setSalesData(salesMap);
    } else {
      setSalesData({});
    }
  };
  // console.log("This is filter batch" + filterBatch);
  const handleFilter = () => {
    if (activeTab === 0) {
      applyFilter(membershipData, setFilteredMembershipData);
      calculateSalesData();
    } else {
      applyFilter(merchandiseData, setFilteredMerchandiseData);
      calculateSalesData();
    }
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setFilterID("");
    setFilterName("");
    setFilterRFID("");
    setFilterCourse("");
    setFilterYear("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterProductName("");
    setFilterBatch("");
    setFilterSize("");
    setFilterColor("");
    setFilterType("");

    if (activeTab === 0) {
      setFilteredMembershipData(membershipData);
    } else {
      setFilteredMerchandiseData(merchandiseData);
    }
  };

  const membershipColumns = [
    {
      name: "Reference Code",
      selector: (row) => row.reference_code,
      sortable: true,
      wrap: true,
      cell: (row) => <div className="text-xs">{row.reference_code}</div>,
    },
    {
      name: "ID Number",
      selector: (row) => row.id_number,
      sortable: true,
      wrap: true,
      cell: (row) => <div className="text-xs">{row.id_number}</div>,
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
      wrap: true,
      cell: (row) => <div className="text-xs">{row.name}</div>,
    },
    { name: "RFID", selector: (row) => row.rfid, sortable: true },
    { name: "Course", selector: (row) => row.course, sortable: true },
    { name: "Year", selector: (row) => row.year, sortable: true },
    {
      name: "Date",
      selector: (row) => formattedDate(row.date),
      sortable: true,
    },
    { name: "Type", selector: (row) => row.type, sortable: true },
  ];

  const merchandiseColumns = [
    {
      name: "Order ID",
      selector: (row) => row.reference_code,
      sortable: true,
      wrap: true,
      cell: (row) => <div className="text-xs">{row.reference_code}</div>,
    },
    {
      name: "Name",
      selector: (row) => row.student_name,
      sortable: true,
      wrap: true,
      cell: (row) => <div className="text-xs">{row.student_name}</div>,
    },
    {
      name: "Product Name",
      selector: (row) => row.product_name,
      sortable: true,
      wrap: true,
      cell: (row) => <div className="text-xs">{row.product_name}</div>,
    },
    {
      name: "Course",
      selector: (row) => row.course,
      sortable: true,
      width: "70px",
    },
    {
      name: "Year",
      selector: (row) => row.year,
      sortable: true,
      width: "70px",
    },
    {
      name: "Batch",
      selector: (row) => row.batch,
      sortable: true,
      width: "70px",
    },
    {
      name: "Size",
      selector: (row) => row.size?.[0]?.$each?.[0] || "",
      sortable: true,
      width: "70px",
    },
    {
      name: "Color",
      selector: (row) => row.variation?.[0]?.$each?.[0] || "",
      sortable: true,
    },

    { name: "Quantity", selector: (row) => row.quantity, sortable: true },

    { name: "Total", selector: (row) => row.total, sortable: true },
    {
      name: "Transaction Date",
      selector: (row) => formattedDate(row.transaction_date),
      sortable: true,
    },
    ...(deletePosition()
      ? [
          {
            name: "Action",
            selector: (row) => row.product_name,
            wrap: true,
            cell: (row) => (
              <div className="text-xs">
                <ButtonsComponent>
                  <FormButton
                    type="button"
                    text="Delete"
                    onClick={() =>
                      handleConfirmModal(row._id, row.product_name)
                    }
                    icon={<i className="fas fa-trash" />}
                    styles="flex items-center space-x-2 bg-gray-200 text-red-800 rounded-md px-1 py-2 transition duration-150 hover:bg-red-300  focus:outline-none focus:ring-2 focus:ring-gray-400"
                    textClass="text-gray-800"
                    whileHover={{ scale: 1.02, opacity: 0.95 }}
                    whileTap={{ scale: 0.98, opacity: 0.9 }}
                  />
                </ButtonsComponent>
              </div>
            ),
          },
        ]
      : []),
  ];
  const getMembershipCounts = (membershipData) => {
    try {
      // Ensure membershipData is an array
      if (!Array.isArray(membershipData)) {
        throw new Error(
          "Invalid data format: membershipData should be an array."
        );
      }

      const membershipCount = membershipData.filter(
        (data) => data.type === "Membership"
      ).length;

      const renewalCount = membershipData.filter(
        (data) => data.type === "Renewal"
      ).length;

      return { membershipCount, renewalCount };
    } catch (error) {
      console.error("Error processing membership data:", error);

      return { membershipCount: 0, renewalCount: 0 };
    }
  };

  const { membershipCount, renewalCount } = getMembershipCounts(membershipData);

  const membershipRevenue = membershipCount * 50;
  const renewalRevenue = renewalCount * 50;

  const formattedMerchandiseData = filteredMerchandiseData.map((row) => ({
    ...row,
    size: row.size?.[0]?.$each?.[0] || "",
    variation: row.variation?.[0]?.$each?.[0] || "",
  }));
  const uniqueProductNames = Array.from(
    new Set(productNames.map((detail) => detail.product_name))
  );
  return (
    <div className="container mx-auto p-4">
      <Tabs selectedIndex={activeTab} onSelect={(index) => setActiveTab(index)}>
        <TabList>
          <Tab>Membership</Tab>
          <Tab>Merchandise</Tab>
        </TabList>

        <TabPanel>
          <div className="mb-6 p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Membership Sales Summary</h2>
            <table className="min-w-full bg-gray-100 rounded-lg overflow-hidden shadow-md">
              <thead style={{ backgroundColor: "#0e4a6a", color: "#fff" }}>
                <tr>
                  <th className="border px-4 py-2 text-left">
                    Membership Type
                  </th>
                  <th className="border px-4 py-2 text-left">
                    Registered Students
                  </th>
                  <th className="border px-4 py-2 text-left">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-4 py-2">Membership</td>
                  <td className="border px-4 py-2">{membershipCount}</td>
                  <td className="border px-4 py-2">
                    ₱{membershipRevenue.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="border px-4 py-2">Renewal</td>
                  <td className="border px-4 py-2">{renewalCount}</td>
                  <td className="border px-4 py-2">
                    ₱{renewalRevenue.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Membership Tab Content */}
          <div className="flex justify-between items-center mb-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setIsFilterOpen(true)}
            >
              Filter
            </button>
            <CSVLink
              data={filteredMembershipData.length ? filteredMembershipData : []}
              filename="membership-data.csv"
            >
              <button
                className="bg-green-500 text-white px-4 py-2 rounded"
                onClick={() => {
                  logAdminAction({
                    admin_id: userData.id_number,
                    action: "Exported Membership Report CSV",
                  });
                }}
              >
                Export CSV
              </button>
            </CSVLink>
          </div>

          <DataTable
            columns={membershipColumns}
            data={filteredMembershipData}
            customStyles={customStyles}
            pagination
          />
        </TabPanel>

        <TabPanel>
          <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">
              Merchandise Sales Summary
            </h2>
            <div className="overflow-hidden">
              <div className="h-36 overflow-y-auto">
                {" "}
                <table className="min-w-full  rounded-lg shadow-md">
                  <thead style={{ backgroundColor: "#0e4a6a", color: "#fff" }}>
                    <tr>
                      <th className="border px-4 py-2 text-left">
                        Product Name
                      </th>
                      <th className="border px-4 py-2 text-left">Units Sold</th>
                      <th className="border px-4 py-2 text-left">
                        Total Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(salesData).map(([productName, data]) => (
                      <tr key={productName}>
                        <td className="border px-4 py-2">{productName}</td>
                        <td className="border px-4 py-2">{data.unitsSold}</td>
                        <td className="border px-4 py-2">
                          ₱{data.totalRevenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Merchandise Tab Content */}
          <div className="flex justify-between items-center mb-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setIsFilterOpen(true)}
            >
              Filter
            </button>

            <CSVLink
              data={
                formattedMerchandiseData.length ? formattedMerchandiseData : []
              }
              filename="merchandise-data.csv"
            >
              <button
                className="bg-green-500 text-white px-4 py-2 rounded"
                onClick={() => {
                  logAdminAction({
                    admin_id: userData.id_number,
                    action: "Exported Merchandise Report CSV",
                  });
                }}
              >
                Export CSV
              </button>
            </CSVLink>
          </div>
          <DataTable
            columns={merchandiseColumns}
            data={filteredMerchandiseData}
            customStyles={customStyles}
            pagination
            responsive={true}
          />
        </TabPanel>
      </Tabs>
      {confirmModal && (
        <ConfirmationModal
          confirmType={ConfirmActionType.DELETION}
          onConfirm={handleDeleteReport}
          onCancel={handleHideConfirmModal}
        />
      )}
      {isFilterOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-600 bg-opacity-75">
          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
            <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">
              Filter Data
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="border w-full p-1 sm:p-2 mb-2"
                placeholder="ID Number"
                value={filterID}
                onChange={(e) => setFilterID(e.target.value)}
              />
              <input
                className="border w-full p-1 sm:p-2 mb-2"
                placeholder="Name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
              {activeTab !== 0 && (
                <>
                  <select
                    className="border w-full p-1 sm:p-2 mb-2"
                    value={filterProductName}
                    onChange={(e) => {
                      setFilterProductName(e.target.value);
                      setFilterBatch("");
                    }}
                  >
                    <option value="">Select a Product</option>
                    {uniqueProductNames.map((name, index) => (
                      <option key={index} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="border w-full p-1 sm:p-2 mb-2"
                    value={filterSize}
                    onChange={(e) => setFilterSize(e.target.value)}
                  >
                    <option value="">Select Size</option>
                    <option key="18" value="18">
                      18
                    </option>
                    <option key="XS" value="XS">
                      XS
                    </option>
                    <option key="S" value="S">
                      S
                    </option>
                    <option key="M" value="M">
                      M
                    </option>
                    <option key="L" value="L">
                      L
                    </option>
                    <option key="XL" value="XL">
                      XL
                    </option>
                    <option key="2XL" value="2XL">
                      2XL
                    </option>
                    <option key="3XL" value="3XL">
                      3XL
                    </option>
                  </select>
                  {filterProductName && (
                    <select
                      className="border w-full p-1 sm:p-2 mb-2"
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                    >
                      <option value="">Select Batch</option>
                      {[
                        ...new Set(
                          merchandiseData
                            .filter(
                              (product) =>
                                product.product_name === filterProductName
                            )
                            .map((product) => product.batch)
                        ),
                      ].map((batch) => (
                        <option key={batch} value={batch}>
                          {batch}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
              <input
                className="border w-full p-1 sm:p-2 mb-2"
                placeholder="RFID"
                value={filterRFID}
                onChange={(e) => setFilterRFID(e.target.value)}
              />
              {activeTab === 0 && (
                <select
                  className="border w-full p-1 sm:p-2 mb-2"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">Select Type</option>
                  <option key="Membership" value="Membership">
                    Membership
                  </option>
                  <option key="Renewal" value="Renewal">
                    Renewal
                  </option>
                </select>
              )}
              <select
                className="border w-full p-1 sm:p-2 mb-2"
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
              >
                <option value="">Select Course</option>
                <option key="BSIT" value="BSIT">
                  BSIT
                </option>
                <option key="BSCS" value="BSCS">
                  BSCS
                </option>
                <option key="ACT" value="ACT">
                  ACT
                </option>
              </select>
              <select
                className="border w-full p-1 sm:p-2 mb-2"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">Select Year</option>
                <option key="1" value="1">
                  1
                </option>
                <option key="2" value="2">
                  2
                </option>
                <option key="3" value="3">
                  3
                </option>
                <option key="4" value="4">
                  4
                </option>
              </select>
              <div>
                <label className="block text-sm font-medium">Start Date</label>
                <input
                  className="border w-full p-1 sm:p-2 mb-2"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">End Date</label>
                <input
                  className="border w-full p-1 sm:p-2 mb-2"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2">
              <button
                className="bg-[#4398AC] text-white px-4 py-2 rounded mb-2 sm:mb-0"
                onClick={() => setIsFilterOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-[#002E48] text-white px-4 py-2 rounded"
                onClick={handleFilter}
              >
                Apply
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded mb-2 sm:mb-0"
                onClick={handleClearFilters}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Reports;
