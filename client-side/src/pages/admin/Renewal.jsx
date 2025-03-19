import React, { useState, useEffect } from "react";
import "../../App.css";
import ApproveModal from "../../components/admin/ApproveModal";
import { renewStudent } from "../../api/admin";


import TableComponent from "../../components/Custom/TableComponent";
import ButtonsComponent from "../../components/Custom/ButtonsComponent";
import FormButton from "../../components/forms/FormButton";
import {
  conditionalPosition,
  formattedDate,
} from "../../components/tools/clientTools";

function MembershipRequest() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRfid, setSelectedRfid] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudentCourse, setSelectedStudentCourse] = useState("");
  const [selectedStudentYear, setSelectedStudentYear] = useState("");
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isChecked, setIsChecked] = useState(false);

  const toggleCheckbox = () => {
    setIsChecked(!isChecked);
  };

  const handleOpenModal = (row) => {
    setIsModalOpen(true);
    setSelectedStudentId(row.id_number);
    setSelectedStudentCourse(row.course);
    setSelectedStudentYear(row.year);
    setSelectedRfid(row.rfid);
    const name = row.first_name + " " + row.middle_name + " " + row.last_name;
    const words = name.split(" ");
    let fullName = "";

    for (let i = 0; i < words.length - 1; i++) {
      fullName += words[i].charAt(0) + ".";
    }
    fullName += " " + words[words.length - 1];

    setSelectedStudentName(fullName);

    // console.log(fullName);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudentId("");
    fetchData();
  };

  const handleFormSubmit = (data) => {
    // console.log("Form submitted successfully:", data);
  };

  const fetchData = async () => {
    try {
      const result = await renewStudent();
      setData(result);
      setFilteredData(result);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data: ", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = data.filter((item) => {
      const first_name = item.first_name ? item.first_name.toLowerCase() : "";
      const middle_name = item.middle_name
        ? item.middle_name.toLowerCase()
        : "";
      const last_name = item.last_name ? item.last_name.toLowerCase() : "";
      const id_number = item.id_number ? item.id_number.toLowerCase() : "";
      const course = item.course ? item.course.toString() : "";
      const email = item.email ? item.email.toString() : "";
      const type = item.type ? item.type.toString() : "";

      return (
        first_name.includes(searchQuery.toLowerCase()) ||
        middle_name.includes(searchQuery.toLowerCase()) ||
        last_name.includes(searchQuery.toLowerCase()) ||
        id_number.includes(searchQuery.toLowerCase()) ||
        email.includes(searchQuery.toLowerCase()) ||
        type.includes(searchQuery.toLowerCase()) ||
        course.includes(searchQuery)
      );
    });
    setFilteredData(filtered);
  }, [searchQuery, data]);

  const columns = [
    {
      key: "id_number",
      label: "ID",
      selector: (row) => row.id_number,
      sortable: true,
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
      key: "course",
      label: "Course & Year",
      selector: (row) => row.course,
      sortable: true,
      cell: (row) => (
        <div>
          <p className="text-xs">{row.course + "-" + row.year}</p>
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
      name: "Renewed on",
      label: "Renewed on",
      selector: (row) => row.renewedOn,
      sortable: true,
      cell: (row) => (
        <div>
          <p className="text-xs">{formattedDate(row.renewedOn)}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      selector: (row) => row.renew,
      sortable: true,
      cell: (row) => (
        <div className="text-center">
          <span
            className={`flex items-center gap-2 ${
              row.renew === "Accepted"
                ? "bg-green-200 text-green-800"
                : "bg-red-200 text-red-800"
            } px-2 py-1 rounded text-xs`}
          >
            <i
              className={`fa ${
                row.renew === "Accepted" ? "fa-check-circle" : "fa-times-circle"
              } mr-1 ${
                row.renew === "Accepted" ? "text-green-500" : "text-red-500"
              }`}
            ></i>
            {row.renew === "Accepted" ? "Paid" : "Unpaid"}
          </span>
        </div>
      ),
    },
    {
      name: "Action",
      label: "Action",
      cell: (row) => (
        <ButtonsComponent>
          <FormButton
            type="button"
            text={!conditionalPosition() ? "Not Authorized" : "Approve"}
            onClick={() => {
              if (conditionalPosition()) {
                handleOpenModal(row);
              }
            }}
            icon={
              <i
                className={`fa ${
                  !conditionalPosition() ? "fa-lock" : "fa-check"
                }`}
              ></i>
            }
            styles={`relative flex items-center space-x-2 px-4 py-2 rounded text-white ${
              !conditionalPosition()
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-[#002E48]"
            }`}
            textClass="text-white"
            whileHover={{ scale: 1.02, opacity: 0.95 }}
            whileTap={{ scale: 0.98, opacity: 0.9 }}
            disabled={!conditionalPosition()}
          />
          {!conditionalPosition() && <c visible={true}></c>}
        </ButtonsComponent>
      ),
    },
  ];

  return (
    <div className="">
      <TableComponent columns={columns} data={filteredData} />
      {isModalOpen && (
        <ApproveModal
          reference_code={
            Math.floor(Math.random() * (999999999 - 111111111)) + 111111111
          }
          id_number={selectedStudentId}
          course={selectedStudentCourse}
          year={selectedStudentYear}
          name={selectedStudentName}
          type={"Renewal"}
          onCancel={handleCloseModal}
          onSubmit={handleFormSubmit}
          qty={1}
          itemTotal={50}
          total={50}
        />
      )}
    </div>
  );
}

export default MembershipRequest;
