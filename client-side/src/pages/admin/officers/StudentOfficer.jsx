import {
 
  editOfficerApi,
  roleRemove,
} from "../../../api/admin";
import ChangePassword from "../../../components/ChangePassword";
import ButtonsComponent from "../../../components/Custom/ButtonsComponent";
import TableComponent from "../../../components/Custom/TableComponent";
import ConfirmationModal from "../../../components/common/modal/ConfirmationModal";
import FormButton from "../../../components/forms/FormButton";
import { executiveAndAdminConditionalAccess } from "../../../components/tools/clientTools";
import { ConfirmActionType } from "../../../enums/commonEnums";
import { showToast } from "../../../utils/alertHelper";
import EditOfficer from "../EditOfficer";
import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";

import SearchModal from "../../../components/common/modal/SearchModal";

const StudentOfficer = () => {
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
  const [viewAdd, setViewAdd] = useState(false);

  const fetchData = async () => {
    try {
      const result = await getAllStudentOfficers();
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

  const showModal = (row) => {
    setIsModalVisible(true);
    setStudentIdToBeDeleted(row.id_number);
  };

  const hideModal = () => {
    setIsModalVisible(false);
    setStudentIdToBeDeleted("");
  };

  const handleConfirmRemoveRole = async () => {
    setIsLoading(true);

    try {
      const id_number = studentIdToBeDeleted;
      // console.log(id_number);
      if ((await roleRemove(id_number)) === 200) {
        const updatedData = data.filter(
          (student) => student.id_number !== id_number
        );
        setData(updatedData);
        setIsModalVisible(false);
        showToast("success", "Role Remove Successful!");
      } else {
        console.error("Failed to delete officer");
      }
    } catch (error) {
      console.error("Error deleting officer:", error);
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
      key: "email",
      label: "Email Account",
      selector: (row) => row.email,
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
              row.status === "True" ? "text-green-500" : "text-red-500"
            }`}
          >
            {row.status === "True" ? "Active" : "Suspended"}
          </div>
        </div>
      ),
    },

    {
      key: "actions",
      label: "",
      cell: (row) => (
        <ButtonsComponent>
          {executiveAndAdminConditionalAccess() ? (
            <FormButton
              type="button"
              text="Remove Role"
              onClick={() => showModal(row)}
              icon={<i className="fas fa-trash" />} // Simple icon
              styles="flex items-center space-x-2 bg-gray-200 text-red-800 rounded-md px-3 py-1.5 transition duration-150 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400"
              textClass="text-red-800" // Elegant text color
              whileHover={{ scale: 1.02, opacity: 0.95 }}
              whileTap={{ scale: 0.98, opacity: 0.9 }}
            />
          ) : (
            <FormButton
              type="button"
              text="Disabled"
              icon={<i className="fas fa-ban" />} // Disabled icon
              styles="flex items-center space-x-2 bg-gray-200 text-gray-800 rounded-md px-3 py-1.5 transition duration-150 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              textClass="text-gray-800" // Elegant text color
              whileHover={{ scale: 1.02, opacity: 0.95 }}
              whileTap={{ scale: 0.98, opacity: 0.9 }}
              disabled
            />
          )}
        </ButtonsComponent>
      ),
    },
  ];

  return (
    <div className="">
      <div className="py-4 ">
        {executiveAndAdminConditionalAccess() ? (
          <>
            <button
              onClick={() => setViewAdd(true)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-400"
            >
              Add Officer Role
            </button>
          </>
        ) : (
          <button
            className="bg-gray-500 text-white p-2 rounded hover:bg-gray-400"
            disabled
          >
            Not Authorized
          </button>
        )}
      </div>

      <TableComponent columns={columns} data={filteredData} />
      {isEditModalVisible && (
        <EditOfficer
          isVisible={isEditModalVisible}
          onClose={handleEditModalClose}
          studentData={memberToEdit}
          onSave={handleSaveEditedMember}
        />
      )}
      {viewAdd && (
        <SearchModal
          isVisible={viewAdd}
          position={"Officers"}
          onClose={() => setViewAdd(false)}
        />
      )}
      {isModalVisible && (
        <ConfirmationModal
          confirmType={ConfirmActionType.REMOVE}
          onCancel={hideModal}
          onConfirm={handleConfirmRemoveRole}
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

export default StudentOfficer;
