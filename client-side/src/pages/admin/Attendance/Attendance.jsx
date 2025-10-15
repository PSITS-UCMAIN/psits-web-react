import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { FaUserCheck } from "react-icons/fa";
import { IoArrowBack } from "react-icons/io5";
import { Link, useNavigate, useParams } from "react-router-dom";
import "react-tabs/style/react-tabs.css";
import {
  getAttendees,
  getEventCheck,
  removeAttendee,
} from "../../../api/event";
import { getInformationData } from "../../../authentication/Authentication";
import ConfirmationModal from "../../../components/common/modal/ConfirmationModal";
import ButtonsComponent from "../../../components/Custom/ButtonsComponent";
import FormButton from "../../../components/forms/FormButton";
import { ConfirmActionType } from "../../../enums/commonEnums";
import AttendanceSettings from "./AttendanceSettings";
import AttendanceTab from "./AttendanceTab";
import ViewStudentAttendance from "./ViewStudentAttendance";

const Attendance = (props) => {
  // TODO(Adriane): Refactor the entire logic, so many unused variables, no DRY principle and spaghetti logic
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [attendees, setAttendees] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [eventHasEnded, setEventHasEnded] = useState(false);
  const [viewSettings, setViewSettings] = useState(false);
  const user = getInformationData();
  const [isDisabled, setIsDisabled] = useState(false);
  const [eventDate, setEventDate] = useState(new Date());
  const currentDate = new Date();
  const [removeModal, setRemoveModal] = useState(false);
  const [dataToRemove, setDataToRemove] = useState({
    merchId: eventId,
    id_number: "",
  });
  const [displayLimit, setDisplayLimit] = useState("");
  const [eventDateToCondition, setEventDateToCondition] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [merchData, setMerchData] = useState("");

  const handleRowSelection = (id) => {
    setSelectedRows((prevSelectedRows) =>
      prevSelectedRows.includes(id)
        ? prevSelectedRows.filter((rowId) => rowId !== id) // Use "rowId" instead of "id" to avoid shadowing
        : [...prevSelectedRows, id]
    );
  };
  const handleSettingsView = () => {
    setViewSettings(true);
  };
  const handleCloseSettingsView = () => {
    setViewSettings(false);
  };
  const fetchEventLimit = useCallback(async () => {
    try {
      const response = await getEventCheck(eventId);
      const campusLimit = response.limit.find((l) => l.campus === user.campus)
        ? response.limit.find((l) => l.campus === user.campus)
        : response.limit;

      if (!campusLimit) return;

      const attendeeCount = response.attendees.filter(
        (att) => att.campus === user.campus
      ).length;
      setDisplayLimit(campusLimit.limit);
      setIsDisabled(attendeeCount >= campusLimit.limit);
    } catch (error) {
      console.error(error);
    }
  });

  const handleOpenRemoveModal = (data) => {
    setRemoveModal(true);
    setDataToRemove({
      merchId: eventId,
      id_number: data,
    });
  };
  const handleRemoveApi = async () => {
    try {
      if (await removeAttendee(dataToRemove)) {
        fetchData();
        fetchEventLimit();
        setRemoveModal(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getAllAttendees = async () => {
    return await getAttendees(eventId);
  };
  useEffect(() => {
    fetchEventLimit();
  }, []);
  useEffect(() => {
    if (selectAll) {
      setSelectedRows(filteredData.map((item) => item.id_number));
    } else {
      setSelectedRows([]);
    }
  }, [selectAll, filteredData]);

  const handleCloseModal = () => {
    setShowModal(false);
  };
  const handleViewBtn = (studentData) => {
    setSelectedData(studentData);
    setShowModal(true);
  };

  const computeAttendanceStatus = (row) => {
    const attendance = row.attendance || {};
    const sessionConfig = eventData.sessionConfig || {};
    const enabledSessions = Object.keys(sessionConfig).filter(
      (session) => sessionConfig[session]?.enabled
    );

    const currentDate = new Date();
    const eventDateObj = new Date(eventDate);

    const isAllDayEvent =
      enabledSessions.length > 0 &&
      enabledSessions.every((s) => !sessionConfig[s]?.timeRange);

    if (isAllDayEvent) {
      const attended =
        row.isAttended ||
        enabledSessions.some((s) => attendance[s]?.attended === true);

      if (eventDateObj < currentDate) return attended ? "Attended" : "Absent";
      return attended ? "Attended" : "Ongoing";
    }

    // No sessions
    if (enabledSessions.length === 0) {
      if (eventDateObj < currentDate) return "Absent";
      return "Ongoing";
    }

    const hasAttendedAny = enabledSessions.some(
      (session) => attendance[session]?.attended === true
    );
    const attendedAll = enabledSessions.every(
      (session) => attendance[session]?.attended === true
    );

    if (attendedAll) row.isAttended = true;

    if (eventDateObj.toDateString() === currentDate.toDateString()) {
      if (attendedAll) return "Attended";
      return "Ongoing";
    }
    if (attendedAll) return "Attended";
    if (!hasAttendedAny) return "Absent";
    return "Incomplete";
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
      key: "id_number",
      label: "ID",
      sortable: true,
      selector: (row) => row.id_number, // Add selector for the student field
      cell: (row) => (
        <div className="text-left">
          <div className="text-xs text-gray-500">ID: {row.id_number}</div>
        </div>
      ),
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      selector: (row) => row.name, // Add selector for the student field
      cell: (row) => (
        <div className="text-left">
          <div className="font-semibold text-gray-900">{row.name}</div>
        </div>
      ),
    },
    {
      key: "course",
      label: "Course",
      sortable: true,
      selector: (row) => row.course, // Add selector for course field
      cell: (row) => row.course,
    },
    {
      key: "year",
      label: "Year",
      sortable: true,
      selector: (row) => row.year, // Add selector for year field
      cell: (row) => row.year,
    },
    {
      key: "isAttended",
      label: "Status",
      sortable: true,
      selector: (row) => computeAttendanceStatus(row),
      cell: (row) => {
        const status = computeAttendanceStatus(row);

        const statusClasses = {
          Attended: "bg-green-200 text-green-800",
          Absent: "bg-red-600 text-white",
          Incomplete: "bg-orange-200 text-orange-800",
          Ongoing: "bg-yellow-200 text-yellow-800",
          Upcoming: "bg-gray-600 text-white",
        };

        return (
          <div className="text-left">
            <span
              className={`px-2 py-1 rounded text-xs ${statusClasses[status]}`}
            >
              {status}
            </span>
          </div>
        );
      },
    },
    {
      key: "attendDate",
      label: "Confirmed Date",
      sortable: true,
      selector: (row) => row.attendDate,
      cell: (row) =>
        row.attendDate && !isNaN(new Date(row.attendDate))
          ? new Date(row.attendDate).toLocaleString()
          : "TBA",
    },
    {
      key: "confirmedBy",
      label: "Confirmed By",
      sortable: true,
      selector: (row) => row.confirmedBy,
      cell: (row) => (row.confirmedBy ? row.confirmedBy : "None"),
    },
    {
      key: "action",
      label: "Action",
      cell: (row) => {
        const isSameDate =
          eventDate.getFullYear() === currentDate.getFullYear() &&
          eventDate.getMonth() === currentDate.getMonth() &&
          eventDate.getDate() === currentDate.getDate();

        const isPastEvent = eventDate < currentDate && !isSameDate;
        const attendanceStatus = computeAttendanceStatus(row);
        const hasMultipleSessions =
          eventData.sessionConfig &&
          Object.keys(eventData.sessionConfig).length > 1;

        return (
          <ButtonsComponent>
            {isSameDate && attendanceStatus === "Ongoing" ? (
              <FormButton
                type="button"
                text="Attendance"
                onClick={() => handleViewBtn(row)}
                icon={<FaUserCheck size={20} />}
                styles="px-4 bg-[#074873] text-[#DFF6FF] hover:bg-[#09618F] active:bg-[#0B729C] rounded-md p-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0A5C88] flex items-center gap-2"
                textClass="text-blue-100"
                whileHover={{ scale: 1.02, opacity: 0.95 }}
                whileTap={{ scale: 0.98, opacity: 0.9 }}
              />
            ) : isPastEvent ? (
              // Show view button for past events with multiple sessions
              hasMultipleSessions || attendanceStatus === "Incomplete" ? (
                <FormButton
                  type="button"
                  text="View Details"
                  onClick={() => handleViewBtn(row)}
                  icon={<FaUserCheck size={20} />}
                  styles="px-4 bg-[#074873] text-[#DFF6FF] hover:bg-[#09618F] active:bg-[#0B729C] rounded-md p-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0A5C88] flex items-center gap-2"
                  textClass="text-blue-100"
                  whileHover={{ scale: 1.02, opacity: 0.95 }}
                  whileTap={{ scale: 0.98, opacity: 0.9 }}
                />
              ) : (
                <></>
              )
            ) : attendanceStatus === "Attended" ? (
              <FormButton
                type="button"
                text="Attended"
                onClick={() => handleViewBtn(row)}
                icon={<FaUserCheck size={20} />}
                styles="px-4 bg-green-600 text-[#DFF6FF] hover:bg-green-500 rounded-md p-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 flex items-center gap-2"
                textClass="text-blue-100"
                whileHover={{ scale: 1.02, opacity: 0.95 }}
                whileTap={{ scale: 0.98, opacity: 0.9 }}
                // disabled
              />
            ) : (
              <FormButton
                type="button"
                text="Remove"
                onClick={() => handleOpenRemoveModal(row.id_number)}
                icon={<i className="fas fa-trash"></i>}
                styles="px-4 bg-red-500 text-[#DFF6FF] hover:bg-red-600 active:bg-red-700 rounded-md p-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center gap-2"
                textClass="text-white"
                whileHover={{ scale: 1.02, opacity: 0.95 }}
                whileTap={{ scale: 0.98, opacity: 0.9 }}
              />
            )}
          </ButtonsComponent>
        );
      },
    },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // TODO:Done modify to get the real data
      const result = await getAllAttendees();
      setEventDateToCondition(
        new Date(result.data.eventDate ? result.data.eventDate : new Date())
      );
      setEventDate(
        new Date(result.data.eventDate ? result.data.eventDate : new Date())
      );
      setStartDate(
        new Date(result.merch.start_date ? result.merch.start_date : new Date())
      );
      setEndDate(
        new Date(result.merch.end_date ? result.merch.end_date : new Date())
      );

      setData(result.attendees ? result.attendees : []);
      setFilteredData(result.attendees ? result.attendees : []);
      setEventData(result.data ? result.data : []);
      setMerchData(result.merch ? result.merch : "");
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data: ", error);
      setLoading(false);
    }
  });

  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    const filtered = data.filter((item) => {
      const searchLower = searchQuery.toLowerCase();
      return [
        item.id_number,
        item.first_name,
        item.middle_name,
        item.last_name,
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
  const handleNavigate = (pageRoute) => () => {
    navigate(pageRoute);
  };

  const isSameDate =
    eventDate.getFullYear() === currentDate.getFullYear() &&
    eventDate.getMonth() === currentDate.getMonth() &&
    eventDate.getDate() === currentDate.getDate();

  const isPastEvent = eventDate < currentDate && !isSameDate;
  const isSoonEvent = eventDate > currentDate && !isSameDate;
  return (
    <div className="container mx-auto p-4 ">
      <div className="flex flex-col gap-5 p-2 md:flex-col sm:flex-col">
        <div className="flex justify-start">
          <button
            onClick={handleNavigate("/admin/events")}
            className="flex items-center gap-2"
          >
            <IoArrowBack size={20} />
            Back
          </button>
        </div>

        <div className=" shadow-sm rounded-sm border bg-white p-2 space-y-4">
          <motion.div
            className="flex flex-col sm:flex-row justify-between items-center product-detail p-3 sm:p-2 mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="ml-2 w-full">
              <h2 className="text-3xl font-bold">{eventData.eventName} </h2>
              {user.campus !== "UC-Main" && <p>Limit: {displayLimit}</p>}
            </div>

            <div className="w-full sm:w-auto flex justify-center sm:justify-end mt-4 sm:mt-0 whitespace-nowrap">
              {isPastEvent ? (
                <ButtonsComponent>
                  <div className="py-2">
                    <motion.button
                      type="button"
                      text=" Ended"
                      className="bg-red-500 text-white hover:bg-red-600 active:bg-red-700 rounded-md px-4 py-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center justify-center gap-2"
                      textClass="sm:block hidden text-white"
                      whileHover={{ scale: 1.01, opacity: 0.95 }}
                      whileTap={{ scale: 0.98, opacity: 0.9 }}
                    >
                      <i className="fas fa-ban"></i>Event Ended
                    </motion.button>
                  </div>
                </ButtonsComponent>
              ) : isSoonEvent ? (
                <ButtonsComponent>
                  <div className="py-2">
                    <motion.button
                      type="button"
                      text="Coming soon..."
                      className="bg-gray-500 text-white hover:bg-gray-600 active:bg-gray-700 rounded-md px-4 py-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 flex items-center justify-center gap-2"
                      textClass="sm:block hidden text-white"
                      whileHover={{ scale: 1.01, opacity: 0.95 }}
                      whileTap={{ scale: 0.98, opacity: 0.9 }}
                      disabled
                    >
                      <i className="fas fa-add"></i> Coming soon...
                    </motion.button>
                  </div>
                </ButtonsComponent>
              ) : isDisabled ? (
                <ButtonsComponent>
                  <div className="py-2">
                    <motion.button
                      type="button"
                      text="Limit Reached"
                      className="bg-red-500 text-white hover:bg-red-600 active:bg-red-700 rounded-md px-4 py-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center justify-center gap-2"
                      textClass="sm:block hidden text-white"
                      whileHover={{ scale: 1.01, opacity: 0.95 }}
                      whileTap={{ scale: 0.98, opacity: 0.9 }}
                    >
                      <i className="fas fa-ban"></i> Limit Reached
                    </motion.button>
                  </div>
                </ButtonsComponent>
              ) : (
                <ButtonsComponent>
                  <div className="py-2">
                    <Link to={`/admin/addAttendee/${eventId}`}>
                      <motion.button
                        type="button"
                        text="Add Attendee"
                        className="bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 rounded-md px-4 py-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center justify-center gap-2"
                        textClass="sm:block hidden text-white"
                        whileHover={{ scale: 1.01, opacity: 0.95 }}
                        whileTap={{ scale: 0.98, opacity: 0.9 }}
                      >
                        <i className="fas fa-add"></i> Add Attendee
                      </motion.button>
                    </Link>
                  </div>
                </ButtonsComponent>
              )}
            </div>
          </motion.div>
        </div>

        <div>
          <div className="w-full sm:w-auto flex justify-center sm:justify-end mt-4 sm:mt-0 whitespace-nowrap">
            {user.campus === "UC-Main" && (
              <ButtonsComponent>
                <div className="py-2">
                  <motion.button
                    type="button"
                    text="Settings"
                    onClick={() => handleSettingsView()}
                    className="bg-gray-500 text-white hover:bg-gray-600 active:bg-gray-700 rounded-md px-4 py-2 text-sm transition duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 flex items-center justify-center gap-2"
                    textClass="sm:block hidden text-white"
                    whileHover={{ scale: 1.01, opacity: 0.95 }}
                    whileTap={{ scale: 0.98, opacity: 0.9 }}
                  >
                    <i className="fas fa-cog"></i> Settings
                  </motion.button>
                </div>
              </ButtonsComponent>
            )}
          </div>
        </div>
        <div className="md:overflow-x-auto shadow-sm rounded-sm space-y-4">
          <AttendanceTab
            columns={columns}
            filteredData={filteredData}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setIsFilterOpen={setIsFilterOpen}
            fetchData={fetchData}
            loading={loading}
            eventId={eventId}
            eventName={eventData.eventName}
            eventAttendanceType={eventData.attendanceType}
          />
        </div>
      </div>

      {viewSettings && (
        <AttendanceSettings
          showModal={viewSettings}
          setShowModal={handleCloseSettingsView}
          eventId={eventId}
        />
      )}
      {/* View Student Attendance Modal*/}
      {showModal && (
        <ViewStudentAttendance
          isVisible={showModal}
          onClose={handleCloseModal}
          studentData={selectedData}
          eventId={eventId}
          eventName={eventData.eventName}
          eventSessionConfig={eventData.sessionConfig}
          eventDate={eventDate}
        />
      )}
      {removeModal && (
        <>
          <ConfirmationModal
            confirmType={ConfirmActionType.REMOVE}
            type="attendance"
            onConfirm={() => handleRemoveApi()}
            onCancel={() => setRemoveModal(false)}
          />
        </>
      )}
    </div>
  );
};

export default Attendance;
