import { getAllOrders, cancelOrder } from "../../api/orders";
import ButtonsComponent from "../../components/Custom/ButtonsComponent";
import ApproveModal from "../../components/admin/ApproveModal";
import Receipt from "../../components/common/Receipt";
import ConfirmationModal from "../../components/common/modal/ConfirmationModal";
import FormButton from "../../components/forms/FormButton";
import {
  conditionalPosition,
  formattedDate,
} from "../../components/tools/clientTools";
import { ConfirmActionType } from "../../enums/commonEnums";
import React, { useState, useEffect, useRef } from "react";
import ReactToPrint from "react-to-print";
import Modal from "../../components/common/modal/Modal"
import Button from "../../components/common/Button";
import SearchDropdown from "../../components/common/search/SearchDropdown";
import backendConnection from "../../api/backendApi";
import { membership } from "../../api/admin";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedTab, setSelectedTab] = useState("Pending");
  const [rowData, setPrintData] = useState(null);
  const [selectedStudent, setSelectedStudentName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [delModal, setDelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [error, setError] = useState(null);
  const componentRef = useRef();
  const printRef = useRef();

  console.log(filteredOrders);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getAllOrders();

        if (data === 0 || data.length === 0) {
          setOrders([]);
          setFilteredOrders([]);
          setError("No orders found.");
        } else {
          setOrders(data);
          setFilteredOrders(data);
          setError(null);
        }
      } catch (err) {
        setOrders([]);
        setFilteredOrders([]);
        setError("Failed to fetch orders. Please try again later.");
        console.error("Error fetching orders:", err);
      }
    };

    fetchOrders();
  }, []);
  useEffect(() => {
    const filtered = orders.filter((order) => {
      const matchesStatus = order.order_status === selectedTab;

      const searchTermLower = searchTerm?.toLowerCase() || "";
      const matchesSearch =
        order.student_name?.toLowerCase().includes(searchTermLower) ||
        order.id_number?.toLowerCase().includes(searchTermLower) ||
        order.rfid?.toLowerCase().includes(searchTermLower) ||
        order.items?.some((item) =>
          item.product_name?.toLowerCase().includes(searchTermLower)
        ) ||
        (order.reference_code &&
          order.reference_code.toString().includes(searchTerm));

      return matchesStatus && (searchTerm === "" || matchesSearch);
    });

    setFilteredOrders(filtered);
    setCurrentPage(1); // Reset to first page when filter changes
  }, [orders, selectedTab, searchTerm]);

  const handlePrintData = (row) => {
    setPrintData(row);
    setShouldPrint(true);
    const name = row.student_name;
    const words = name.split(" ");
    let fullName = "";

    for (let i = 0; i < words.length - 1; i++) {
      fullName += words[i].charAt(0) + ".";
    }
    fullName += " " + words[words.length - 1];

    setSelectedStudentName(fullName);
  };
  useEffect(() => {
    if (rowData) {
      printRef.current.click();
    }
  }, [rowData]);

  const handlePrintComplete = () => {
    console.log("Print Completed");
    setPrintData(null);
    setShouldPrint(false);
  };

  const handleApproveClick = (order) => {
    setSelectedOrder(order);
    const name = order.student_name;
    const words = name.split(" ");
    let fullName = "";

    for (let i = 0; i < words.length - 1; i++) {
      fullName += words[i].charAt(0) + ".";
    }
    fullName += " " + words[words.length - 1];

    setSelectedStudentName(fullName);
    setIsModalOpen(true);
  };
  const handleCancelClick = (order) => {
    setSelectedOrder(order);
    setDelModal(true);
  };
  const handleConfirmDeletion = async () => {
    await cancelOrder(selectedOrder._id);

    handleDeleteModal();
    window.location.reload();
  };
  const handleDeleteModal = () => {
    setDelModal(false);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleApproveConfirm = () => {
    window.location.reload();
    handleModalClose();
  };

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  {/* Manual Order here */}

  {/* Add Order Modal */}
  const [isAddOrderModalShown, showAddOrderModal] = useState(false);
  const [studentOptions, setStudentOptions] = useState([]);
  const [modalSelectedStudent, setSelectedStudent] = useState();

  const openAddModalHandler = async () => {
    try {
      const result = await membership();
      const options = result.filter(student => student.membership === "None").map(student => ({
        label: `${student.id_number} - ${student.first_name} ${student.last_name}`,
        value: student.id_number
      }))
      setStudentOptions(options);
    } catch (error) {
      console.error("Error fetching data:", error);
    }

    showAddOrderModal(true);
  }

  const closeAddModal = () => {
    showAddOrderModal(false);
  }

  const clearAddModal = () => {
    setSelectedStudent(null);
  }

  const createOrderHandler = () => {
    console.log(modalSelectedStudent);
    closeAddModal();
    clearAddModal();
  }

  return (
    <div className="p-4 pt-20">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md w-full"
        />
      </div>

      <Button
        onClick={openAddModalHandler}
      >
        Add Order
      </Button>

      {
        isAddOrderModalShown && (
          <Modal onClose={() => closeAddModal()}>
            <div className="p-4 h-full">
              <h1 className="text-2xl font-semibold"> Add Order </h1>
              <SearchDropdown options={studentOptions} placeholder="Select student..." onOptionSelect={(opt) => setSelectedStudent(opt)} />
              <Button size="full" onClick={createOrderHandler}>Create Order</Button>
            </div>
          </Modal>
        )
      }

      {
        
      }

      {/* Tabs */}
      <div className="flex flex-wrap justify-around bg-gray-100 p-2 rounded">
        {["Pending", "Paid"].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 ${
              selectedTab === tab ? "bg-[#002E48] text-white" : "text-gray-600"
            }`}
          >
            {tab} ({orders.filter((order) => order.order_status === tab).length}
            )
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div
        className="mt-4  shadow rounded-md overflow-x-auto "
        style={{ backgroundColor: "#0e4a6a", color: "#fff" }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                {selectedTab === "Pending" ? "ID" : "Reference"}
              </th>
              <th className="p-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                Name
              </th>
              <th className="p-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                Membership
              </th>
              <th className="p-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                Total
              </th>
              <th className="p-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                Date
              </th>
              {selectedTab === "Paid" && (
                <th className="p-2 text-left text-xs font-medium text-white  uppercase tracking-wider">
                  Transaction Date
                </th>
              )}
              <th className="p-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                Status
              </th>
              {selectedTab === "Paid" && (
                <th className="p-2 text-left text-xs font-medium text-white  uppercase tracking-wider">
                  Managed
                </th>
              )}
              {selectedTab !== "Paid" ? (
                <th className="p-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              ) : (
                <th className="p-2 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-400">
            {currentOrders.length > 0 ? (
              currentOrders.map((order) => (
                <React.Fragment
                  key={
                    selectedTab === "Pending" ? order._id : order.reference_code
                  }
                >
                  <tr className="hover:bg-gray-50">
                    <td className="p-2 text-xs text-gray-500">
                      {selectedTab === "Pending"
                        ? order.id_number
                        : order.reference_code}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      <div>{order.student_name}</div>
                      {selectedTab !== "Pending" && (
                        <div className="text-xs text-gray-500">
                          ID: {order.id_number}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        RFID: {order.rfid}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.course}-{order.year}
                      </div>
                    </td>
                    <td className="p-2 text-sm text-gray-500">
                      {order.membership_discount ? "Discounted" : "No Discount"}
                    </td>
                    <td className="p-2 text-sm text-gray-500">
                      ₱{order.total}
                    </td>
                    <td className="p-2 text-sm text-gray-500">
                      {formattedDate(order.order_date)}
                    </td>
                    {order.order_status === "Paid" && (
                      <td className="p-2 text-sm text-gray-500">
                        {formattedDate(order.transaction_date)}
                      </td>
                    )}
                    <td className="p-2 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full ${
                          order.order_status === "Completed"
                            ? "bg-green-100 text-green-700"
                            : order.order_status === "Cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {order.order_status}
                      </span>
                    </td>
                    {order.order_status === "Paid" && (
                      <td className="p-2 text-sm text-gray-500">
                        {order.admin}
                      </td>
                    )}
                    <td className="p-2 text-sm ">
                      <ButtonsComponent>
                        <FormButton
                          type="button"
                          onClick={() => toggleDropdown(order._id)}
                          icon={
                            <i
                              className={`fa ${
                                openDropdown === order._id
                                  ? "fa fa-chevron-up"
                                  : "fa fa-chevron-down"
                              }`}
                            ></i>
                          }
                          styles={`relative flex items-center justify-center  px-2 py-2 rounded text-white bg-[#002E48]`}
                          textClass="text-white text-sm"
                          whileHover={{ scale: 1.02, opacity: 0.95 }}
                          whileTap={{ scale: 0.98, opacity: 0.9 }}
                        />
                      </ButtonsComponent>
                    </td>
                    {order.order_status !== "Paid" && (
                      <td className="p-2 text-sm flex gap-2 mt-4 ">
                        <ButtonsComponent>
                          <FormButton
                            type="button"
                            text={
                              !conditionalPosition()
                                ? "Not Authorized"
                                : "Approve"
                            }
                            onClick={() => {
                              if (conditionalPosition()) {
                                handleApproveClick(order);
                              }
                            }}
                            icon={
                              <i
                                className={`fa ${
                                  !conditionalPosition()
                                    ? "fa-lock"
                                    : "fa-check"
                                }`}
                              ></i>
                            }
                            styles={`relative flex items-center justify-center space-x-2 px-3 py-2 rounded text-white ${
                              !conditionalPosition()
                                ? "bg-gray-500 cursor-not-allowed"
                                : "bg-[#002E48]"
                            }`}
                            textClass="text-white text-sm"
                            whileHover={{ scale: 1.02, opacity: 0.95 }}
                            whileTap={{ scale: 0.98, opacity: 0.9 }}
                            disabled={!conditionalPosition()}
                          />
                        </ButtonsComponent>
                        <ButtonsComponent>
                          <FormButton
                            type="button"
                            text={
                              !conditionalPosition()
                                ? "Not Authorized"
                                : "Cancel"
                            }
                            onClick={() => {
                              if (conditionalPosition()) {
                                handleCancelClick(order);
                              }
                            }}
                            icon={
                              <i
                                className={`fa ${
                                  !conditionalPosition()
                                    ? "fa-lock"
                                    : "fa-times"
                                }`}
                              ></i>
                            }
                            styles={`relative flex items-center justify-center space-x-2 px-3 py-2 rounded text-white ${
                              !conditionalPosition()
                                ? "bg-gray-500 cursor-not-allowed"
                                : "bg-[#4398AC]"
                            }`}
                            textClass="text-white text-sm" // Ensure the text size is consistent
                            whileHover={{ scale: 1.02, opacity: 0.95 }}
                            whileTap={{ scale: 0.98, opacity: 0.9 }}
                            disabled={!conditionalPosition()}
                          />
                        </ButtonsComponent>
                      </td>
                    )}

                    {order.order_status === "Paid" && (
                      <td className="p-4">
                        <ButtonsComponent>
                          <FormButton
                            type="button"
                            text={
                              !conditionalPosition()
                                ? "Not Authorized"
                                : "Print"
                            }
                            onClick={() => {
                              if (conditionalPosition()) {
                                handlePrintData(order);
                              }
                            }}
                            icon={
                              <i
                                className={
                                  !conditionalPosition()
                                    ? "fa fa-lock"
                                    : "fa fa-print"
                                }
                              ></i>
                            }
                            styles={`relative flex items-center space-x-2 px-4 py-2 rounded  text-white ${
                              !conditionalPosition()
                                ? "bg-gray-500 cursor-not-allowed"
                                : "bg-[#002E48]"
                            }`}
                            textClass="text-white"
                            whileHover={{ scale: 1.02, opacity: 0.95 }}
                            whileTap={{ scale: 0.98, opacity: 0.9 }}
                            disabled={!conditionalPosition()}
                          />
                        </ButtonsComponent>
                      </td>
                    )}
                  </tr>
                  {openDropdown === order._id && (
                    <tr>
                      <td colSpan="10" className="p-4">
                        <ul>
                          {order.items.map((item, index) => (
                            <li
                              key={index}
                              className="text-sm mb-2 p-2 flex flex-row items-center gap-4"
                            >
                              <img
                                src={item.imageUrl1}
                                className="w-16 h-16"
                                alt={item.product_name}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {item.product_name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ID: {item._id}
                                </span>
                                <div className="text-xs text-gray-500">
                                  Price: ₱{item.price}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Quantity: {item.quantity}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Variation: {item.variation || "Null"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Size: {item.sizes || "Null"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Batch: {item.batch || "Null"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Subtotal: ₱{item.sub_total || "Null"}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="p-4 text-center text-gray-500">
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div className="mt-4 flex justify-between items-center p-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-1 bg-[#002E48] text-white rounded-md disabled:bg-white disabled:text-black"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-1 bg-[#002E48] text-white rounded-md disabled:bg-white disabled:text-black"
          >
            Next
          </button>
        </div>
      </div>

      {isModalOpen && selectedOrder && (
        <ApproveModal
          reference_code={
            Math.floor(Math.random() * (999999999 - 111111111)) + 111111111
          }
          order_id={selectedOrder._id}
          id_number={selectedOrder.id_number}
          course={selectedOrder.course}
          year={selectedOrder.year}
          name={selectedStudent}
          type={"Order"}
          membership={
            selectedOrder.membership_discount ? "Discounted" : "No Discount"
          }
          onCancel={handleModalClose}
          onSubmit={handleApproveConfirm}
          items={selectedOrder.items}
          total={selectedOrder.total}
        />
      )}
      {delModal && (
        <ConfirmationModal
          confirmType={ConfirmActionType.ORDER}
          onCancel={handleDeleteModal}
          onConfirm={handleConfirmDeletion}
        />
      )}

      {/* Conditional Rendering of Receipt */}
      <div style={{ display: "none" }}>
        {shouldPrint && rowData && (
          <ReactToPrint
            trigger={() => (
              <button ref={printRef} style={{ display: "none" }}>
                Print
              </button>
            )}
            content={() => componentRef.current}
            onAfterPrint={handlePrintComplete}
          />
        )}

        {shouldPrint && rowData && (
          <Receipt
            ref={componentRef}
            reference_code={rowData.reference_code}
            course={rowData.course}
            product_name={rowData.product_name}
            batch={rowData.batch}
            size={rowData.size}
            variation={rowData.variation}
            total={rowData.total}
            cash={rowData.cash}
            year={rowData.year}
            name={selectedStudent}
            type={"Order"}
            admin={rowData.admin}
            membership={
              rowData.membership_discount ? "Discounted" : "No Discount"
            }
            reprint={true}
            qty={rowData.qty}
            itemTotal={rowData.itemTotal}
            items={rowData.items}
          />
        )}
      </div>
    </div>
  );
};

export default Orders;
