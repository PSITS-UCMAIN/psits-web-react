import React, { useState, useEffect } from "react";
import { QRCode } from "react-qr-code";
import { formatDate } from "../../utils/stringUtils";
import { getInformationData } from "../../authentication/Authentication";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import backendConnection from "../../api/backendApi";
import { InfinitySpin } from "react-loader-spinner";

const QRCodePage = ({ closeView, event }) => {
  const [isAttendee, setIsAttendee] = useState(false);
  const [studentId, setStudentId] = useState();
  const [studentName, setStudentName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceStatus, setAttendanceStatus] = useState();
  const navigate = useNavigate();

  const handleBackdropClick = (e) => {
    if (e.target.id === "modal-backdrop") {
      closeView();
    }
  };

  const checkIfUserIsAttendee = () => {
    setIsLoading(true);
    const student = getInformationData();
    setStudentId(student.id_number);

    const attendee = event.attendees.find(
      (attendee) => attendee.id_number === student.id_number
    );

    if (attendee) {
      setIsAttendee(true);
      setStudentName(attendee.name);
      setAttendanceStatus(attendee.isAttended);
    } else {
      setIsAttendee(false);
      setStudentName("");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkIfUserIsAttendee();
  }, [event]);

  const fetchMerchData = async () => {
    try {
			const token = sessionStorage.getItem("Token");

			const response = await axios.get(
				`${backendConnection()}/api/merch/retrieve/${event.eventId}`,
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				}
			);
			const data = response.data;

			navigate(`/student/merchandise/${event.eventId}`, {
				state: data,
			});
		} catch (error) {
      console.error("Error fetching merchandise data:", error);
    }
  };

  const renderStatusBadge = () => {
    let bgColor = "bg-gray-200";
    let textColor = "text-gray-700";
    let statusText = "Unknown";

    if (attendanceStatus === true) {
      bgColor = "bg-green-100";
      textColor = "text-green-800";
      statusText = "Present";
    } else if (attendanceStatus === false) {
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      statusText = "Not Recorded / Absent";
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
      >
        {statusText}
      </span>
    );
  };

  return (
    <div
      id="modal-backdrop"
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white p-8 rounded-2xl shadow-2xl w-full sm:max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-screen overflow-auto">
        <i
          className="fas fa-times absolute top-4 right-4 text-2xl text-gray-400 hover:text-red-600 transition duration-200 cursor-pointer"
          onClick={closeView}
        ></i>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#074873]">
              {event.eventName}
            </h1>
            <p className="text-gray-500 mb-4 text-sm">
              {formatDate(event.eventDate)}
            </p>
            <div className="w-full overflow-hidden rounded-xl">
              <img
                src={event.eventImage[0]}
                alt={event.eventName}
                className="w-full h-[300px] object-cover"
              />
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[#074873]">
                Event Details
              </h2>
              <p className="text-gray-700 text-sm text-justify leading-relaxed">
                {event.eventDescription}
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <h2 className="text-lg font-semibold text-[#074873] mb-4">
                QR Code for Attendance
              </h2>
              {isLoading ? (
                <InfinitySpin width="200" color="#074873" />
              ) : isAttendee ? (
                <>
                  <div className="flex flex-col items-center">
                    <QRCode
                      value={`/admin/attendance/${event.eventId}/${event.eventName}/markAsPresent/${studentId}/${studentName}`}
                      size={170}
                      fgColor="#074873"
                    />
                    <div className="mt-4 flex flex-col items-center">
                      <div className="text-sm text-gray-700 font-medium mb-1">
                        Attendance Status:
                      </div>
                      {renderStatusBadge()}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    Scan this code to confirm your attendance.
                  </p>
                </>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mt-4">
                    You have not purchased a ticket for this event.{" "}
                    <Link
                      to="#"
                      className="text-blue-600 cursor-pointer"
                      onClick={fetchMerchData}
                    >
                      Click here
                    </Link>{" "}
                    to order. Pay in the PSITS Office afterwards to confirm
                    purchase.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodePage;
