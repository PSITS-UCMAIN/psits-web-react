import {
  getRequestAdminAccount,
  declineAdminAccount,
  approveAdminAccount,
} from "../../../api/admin";
import ChangePassword from "../../../components/ChangePassword";
import ButtonsComponent from "../../../components/Custom/ButtonsComponent";
import TableComponent from "../../../components/Custom/TableComponent";
import ConfirmationModal from "../../../components/common/modal/ConfirmationModal";
import FormButton from "../../../components/forms/FormButton";

import { ConfirmActionType } from "../../../enums/commonEnums";
import { showToast } from "../../../utils/alertHelper";
import EditOfficer from "../EditOfficer";
import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";

const AdminAccountRequest = () => {
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [studentIdToBeDeleted, setStudentIdToBeDeleted] = useState("");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [id, setId] = useState("");
  const [viewChange, setViewChange] = useState(false);
  const [approveModal, setApproveModal] = useState(false);
  const [approveId, setApproveId] = useState("");
  const [declineModal, setDeclineModal] = useState(false);
  const [declineId, setDeclineId] = useState("");

  const fetchData = async () => {
    try {
      const result = await getRequestAdminAccount();
      setData(result ? result : []);
      setFilteredData(result ? result : []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data: ", error);
      setLoading(false);
    }
  };

  const handleEditModalClose = () => {
    setIsEditModalVisible(false);
    setMemberToEdit(null);
  };

  const handleHideChangePassword = () => {
    setViewChange(false);
  };

  const handleSaveEditedMember = async (updatedMember) => {
    setIsLoading(true);
    try {
      editOfficerApi(updatedMember);
    } catch (error) {
      console.error("Error updating officer:", error);
    }

    fetchData();
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = data.filter((item) => {
      const searchLower = searchQuery.toLowerCase();
      return [item.name, item.id_number, item.email, item.position, item.course]
        .map((value) => (value ? value.toString().toLowerCase() : ""))
        .some((value) => value.includes(searchLower));
    });
    setFilteredData(filtered);
  }, [searchQuery, data]);

  const handleShowApproveModal = (row) => {
    setApproveModal(true);
    setApproveId(row.id_number);
  };
  const handleApproveRole = async () => {
    setIsLoading(true);
    try {
      const id_number = approveId;

      if (await approveAdminAccount(id_number)) {
        const updatedData = data.filter(
          (student) => student.id_number !== id_number
        );
        setData(updatedData);
        setApproveModal(false);
        showToast("success", "Admin Approved Successful!");
      } else {
        console.error("Failed to approve officer");
      }
    } catch (error) {
      console.error("Error approving officer:", error);
    }
    setIsLoading(false);
  };

  const handleShowDeclineModal = (row) => {
    setDeclineModal(true);
    setDeclineId(row.id_number);
  };
  const handleDeclineRole = async () => {
    setIsLoading(true);
    try {
      const id_number = declineId;

      if (await declineAdminAccount(id_number)) {
        const updatedData = data.filter(
          (student) => student.id_number !== id_number
        );
        setData(updatedData);
        setDeclineModal(false);
        showToast("success", "Role Declined Successful!");
      } else {
        console.error("Failed to decline ");
      }
    } catch (error) {
      console.error("Error declining officer:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectAll) {
      setSelectedRows(filteredData.map((item) => item.id_number));
    } else {
      setSelectedRows([]);
    }
  }, [selectAll, filteredData]);

  const handleRowSelection = (id_number) => {
    setSelectedRows((prevSelectedRows) =>
      prevSelectedRows.includes(id_number)
        ? prevSelectedRows.filter((id) => id !== id_number)
        : [...prevSelectedRows, id_number]
    );
  };

  const columns = [
    {
      key: "select",
      label: (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <input
            type="checkbox"
            checked={selectAll}
            onChange={() => setSelectAll(!selectAll)}
          />
        </motion.div>
      ),
      cell: (row) => (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <input
            type="checkbox"
            checked={selectedRows.includes(row.id_number)}
            onChange={() => handleRowSelection(row.id_number)}
          />
        </motion.div>
      ),
    },
    {
      key: "name",
      label: "Name",
      selector: (row) => `${row.name}`,
      sortable: true,
      cell: (row) => (
        <div className="text-xs">
          <div>{`${row.name}`}</div>
        </div>
      ),
    },
    {
      key: "id_number",
      label: "Id ",
      selector: (row) => row.id_number,
      sortable: true,
    },
    {
      key: "course",
      label: "Course",
      selector: (row) => row.course,
      sortable: true,
      cell: (row) => (
        <div className="text-xs">
          <div className="text-gray-500">
            {row.course} - {row.year}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Requested Role",
      selector: (row) => row.role,
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      selector: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <div className="text-xs">
          <div
            className={`${
              row.status === "Request" ? "text-orange-500" : "text-red-500"
            }`}
          >
            {row.status === "Request" ? "Pending" : "Denied"}
          </div>
        </div>
      ),
    },

    {
      key: "actions",
      label: "",
      cell: (row) => (
        <ButtonsComponent>
          <FormButton
            type="button"
            text="Approve"
            onClick={() => handleShowApproveModal(row)}
            icon={<i className="fas fa-check-circle" />} // Approve icon
            styles="flex items-center space-x-2 bg-green-100 text-green-800 rounded-md px-3 py-1.5 transition duration-150 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-400"
            textClass="text-green-800 font-medium" // Green text for "Approve"
            whileHover={{ scale: 1.02, opacity: 0.95 }}
            whileTap={{ scale: 0.98, opacity: 0.9 }}
          />
          <FormButton
            type="button"
            text="Deny"
            onClick={() => handleShowDeclineModal(row)}
            icon={<i className="fas fa-times-circle" />} // Deny icon
            styles="flex items-center space-x-2 bg-red-100 text-red-800 rounded-md px-3 py-1.5 transition duration-150 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400"
            textClass="text-red-800 font-medium" // Red text for "Deny"
            whileHover={{ scale: 1.02, opacity: 0.95 }}
            whileTap={{ scale: 0.98, opacity: 0.9 }}
          />
        </ButtonsComponent>
      ),
    },
  ];

  return (
    <div className="">
      <TableComponent columns={columns} data={filteredData} />
      {isEditModalVisible && (
        <EditOfficer
          isVisible={isEditModalVisible}
          onClose={handleEditModalClose}
          studentData={memberToEdit}
          onSave={handleSaveEditedMember}
        />
      )}
      {approveModal && (
        <ConfirmationModal
          confirmType={ConfirmActionType.APPROVE}
          onCancel={() => setApproveModal(false)}
          onConfirm={handleApproveRole}
          type="officer"
        />
      )}
      {declineModal && (
        <ConfirmationModal
          confirmType={ConfirmActionType.DECLINE}
          onCancel={() => setDeclineModal(false)}
          onConfirm={handleDeclineRole}
          type="officer"
        />
      )}

      {viewChange && (
        <>
          <ChangePassword
            id={id}
            onCancel={handleHideChangePassword}
            onSubmit={() => setViewChange(false)}
            position="officer"
          />
        </>
      )}
    </div>
  );
};

export default AdminAccountRequest;
