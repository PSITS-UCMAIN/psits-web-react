import axios from "axios";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";
import {
  membership,
  revokeAllStudent,
  studentDeletion,
  approveMembership,
} from "../../../api/admin";
import backendConnection from "../../../api/backendApi";
import { getInformationData } from "../../../authentication/Authentication";
import ChangePassword from "../../../components/ChangePassword";
import ButtonsComponent from "../../../components/Custom/ButtonsComponent";
import TableComponent from "../../../components/Custom/TableComponent";
import ConfirmationModal from "../../../components/common/modal/ConfirmationModal";
import FormButton from "../../../components/forms/FormButton";
import { getMembershipStatusStudents } from "../../../api/students";
import { ConfirmActionType } from "../../../enums/commonEnums";
import { showToast } from "../../../utils/alertHelper";
import EditMember from "./EditMember";
import StudentMembershipHistory from "./StudentMembershipHistory";
import OptionModal from "../../../components/common/modal/OptionModal";
import { generateReferenceCode } from "../../../components/tools/clientTools";

const Membership = () => {
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
  const [renewStudent, setRenewStudent] = useState(false);
  const [requestModal, setRequestModal] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [formData, setFormData] = useState({
    type: "Membership",
    id_number: requestId,
  });
  const [isDetailsView, setIsDetailsView] = useState(false);
  const token = sessionStorage.getItem("Token");
  const [isOptionModalVisible, setIsOptionModalVisible] = useState(false);
  const [studentInformation, setStudentInformation] = useState({});

  const user = getInformationData();

  const fetchData = useCallback(async () => {
    try {
      const result = await membership();
      setData(result ? result : []);
      setFilteredData(result ? result : []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data: ", error);
      window.location.reload();
      setLoading(false);
    }
  });

  const handleRenewStudent = () => {
    if (revokeAllStudent()) {
      setRenewStudent(false);
    }
  };
  const handleViewDetails = (row) => {
    setId(row.id_number);
    setIsDetailsView(true);
  };

  const handleOptionModal = (row) => {
    setStudentInformation(row);

    setIsOptionModalVisible(!isOptionModalVisible);
  };

  const handleEditButtonClick = (row) => {
    setMemberToEdit(row);
    setIsEditModalVisible(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalVisible(false);
    setMemberToEdit(null);
  };

  const handleChangePassword = (id) => {
    setId(id);
    setViewChange(true);
  };
  const handleHideChangePassword = () => {
    setViewChange(false);
  };

  const handleSaveEditedMember = async (updatedMember) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${backendConnection()}/api/editedStudent`,
        updatedMember,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // console.log(response.data.message);
      showToast("success", "Student updated successfully!");
    } catch (error) {
      console.error("Error updating student:", error);
      showToast(
        "error",
        error.response?.data?.message ||
          error.message ||
          "An unexpected error occurred."
      );
    }

    fetchData();
    setIsLoading(false);
  };

  const handleRequestMembershipModal = async (row) => {
    try {
      const response = await getMembershipStatusStudents(row.id_number);
      if (response) {
        const updatedFormData = {
          type:
            response.status === "NOT_APPLIED" && response.isFirstApplication
              ? "Membership"
              : "Renewal",
          id_number: row.id_number,
          reference_code: generateReferenceCode(),
        };

        setFormData(updatedFormData);
        setRequestId(row.id_number);
        setRequestModal(true);
      }
    } catch (error) {
      console.error("Error fetching membership status:", error);
      showToast("error", "Failed to fetch membership status.");
    }
  };

  const handleRequestMembership = async () => {
    try {
      const result = await approveMembership(formData);
      if (result) {
        setRequestModal(false);
        fetchData();
        setFormData({
          type: "Membership",
          id_number: "",
        });
      }
    } catch (error) {
      console.error("Error sending membership request:", error);
      showToast("error", "Failed to send membership request.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = data.filter((item) => {
      const searchLower = searchQuery.toLowerCase();
      return [
        item.first_name,
        item.middle_name,
        item.last_name,
        item.id_number,
        item.email,
        item.type,
        item.course,
        item.rfid,
      ]
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

  const printAction = (action) => {
    switch (action.toLowerCase()) {
      case "edit":
        handleEditButtonClick(studentInformation);
        break;
      case "delete":
        showModal(studentInformation);
        break;
      case "request":
        handleRequestMembershipModal(studentInformation);
        break;
      case "renew":
        handleRequestMembershipModal(studentInformation);
        break;
      case "change":
        handleChangePassword(studentInformation.id_number);
        break;
      case "history":
        handleViewDetails(studentInformation);

        break;
    }
  };

  const handleConfirmDeletion = async () => {
    setIsLoading(true);
    try {
      const id_number = studentIdToBeDeleted;

      if ((await studentDeletion(id_number, user.name)) === 200) {
        const updatedData = data.filter(
          (student) => student.id_number !== id_number
        );
        setData(updatedData);
        setIsModalVisible(false);
        showToast("success", "Student Deletion Successful!");
      } else {
        console.error("Failed to delete student");
        showToast("error", "Student Deletion Failed! Please try again.");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      showToast("error", "Student Deletion Failed! Please try again.");
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
      selector: (row) =>
        `${row.first_name} ${row.middle_name} ${row.last_name}`,
      sortable: true,
      cell: (row) => (
        <div className="text-xs">
          <div>{`${row.first_name} ${row.middle_name} ${row.last_name}`}</div>
          <div className="text-gray-500">RFID: {row.rfid}</div>
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
      key: "membership",
      label: "Membership",
      selector: (row) => row.membershipStatus,
      sortable: true,
      cell: (row) => (
        <div className="text-center">
          <span
            className={`px-2 py-1 rounded text-xs ${
              row.membershipStatus === "NOT_APPLIED"
                ? "bg-gray-200 text-gray-800"
                : row.membershipStatus === "PENDING"
                ? "bg-yellow-200 text-yellow-800"
                : "bg-green-200 text-green-800"
            }`}
          >
            {row.membershipStatus === "NOT_APPLIED"
              ? "Not Applied"
              : row.membershipStatus === "PENDING"
              ? "Pending"
              : row.membershipStatus === "RENEWED"
              ? "Renewed"
              : row.membershipStatus === "ACTIVE"
              ? "Active"
              : "Unknown Status"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      cell: (row) => (
        <ButtonsComponent>
          <FormButton
            text="More"
            type="button"
            onClick={() => handleOptionModal(row)}
            icon={<i className="fas fa-cog" />}
            styles="flex items-center space-x-2 bg-gray-200 text-gray-800 rounded-md px-3 py-1.5 transition duration-150 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            textClass="text-gray-800" // Elegant text color
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
        <EditMember
          isVisible={isEditModalVisible}
          onClose={handleEditModalClose}
          studentData={memberToEdit}
          onSave={handleSaveEditedMember}
        />
      )}
      {isDetailsView && (
        <StudentMembershipHistory
          studentId={id}
          onClose={() => setIsDetailsView(false)}
        />
      )}
      {isModalVisible && (
        <ConfirmationModal
          confirmType={ConfirmActionType.DELETION}
          onCancel={hideModal}
          onConfirm={handleConfirmDeletion}
        />
      )}
      {viewChange && (
        <>
          <ChangePassword
            id={id}
            onCancel={handleHideChangePassword}
            onSubmit={() => setViewChange(false)}
          />
        </>
      )}
      {renewStudent && (
        <>
          <ConfirmationModal
            confirmType={ConfirmActionType.RENEWAL}
            onCancel={() => setRenewStudent(false)}
            onConfirm={handleRenewStudent}
          />
        </>
      )}
      {requestModal && (
        <ConfirmationModal
          confirmType={ConfirmActionType.REQUEST}
          onCancel={() => setRequestModal(false)}
          onConfirm={handleRequestMembership}
        />
      )}
      {isOptionModalVisible && (
        <OptionModal
          onClose={handleOptionModal}
          onAction={{
            label: [
              "Edit",
              "Delete",
              studentInformation.isFirstApplication === true
                ? "Request_Membership"
                : "Renew_Membership",
              "Change_Password",
              "Membership_History",
            ],
          }}
          actionKey={(action) => {
            printAction(action);
          }}
          information={studentInformation}
        />
      )}
    </div>
  );
};

export default Membership;
