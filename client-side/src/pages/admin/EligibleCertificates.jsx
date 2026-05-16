import React, { useState, useEffect } from "react";
import {
  getEligibleCertificatesByEvent,
  addEligibleCertificates,
  removeEligibleCertificates,
  bulkCheckEligibility,
  importEligibleCertificatesFromCSV,
} from "../../api/admin";
import { showToast } from "../../utils/alertHelper";
import { getEvents, getAttendees } from "../../api/event";

const EligibleCertificates = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [eligibleCerts, setEligibleCerts] = useState([]);
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all, eligible, non-eligible
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [showImportResults, setShowImportResults] = useState(false);
  const [importResults, setImportResults] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchAttendees();
      fetchEligibleCertificates();
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const response = await getEvents();
      if (response && response.data) {
        setEvents(response.data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      showToast("error", "Failed to load events");
    }
  };

  const fetchAttendees = async () => {
    try {
      setIsLoading(true);
      const response = await getAttendees(selectedEvent);
      if (response && response.attendees) {
        // Normalize attendee shape to support both embedded event.attendees and referenced attendee documents.
        const normalized = response.attendees.map((a) => {
          // If attendee already has studentId subobject, normalize its fields
          if (a.studentId && typeof a.studentId === "object") {
            return {
              ...a,
              studentId: {
                _id: a.studentId._id || a._id || a.studentId.studentId || a.id_number || a._id,
                studentId: a.studentId.studentId || a.id_number || "",
                name: a.studentId.name || a.name || "",
                email: a.studentId.email || a.email || "",
              },
              _id: a._id || a.studentId._id || a.id_number,
            };
          }

          // Otherwise, map embedded attendee to expected shape
          return {
            ...a,
            _id: a._id || a.id_number, // ensure unique key
            studentId: {
              _id: a._id || a.id_number,
              studentId: a.id_number || "",
              name: a.name || "",
              email: a.email || "",
            },
          };
        });
        setAttendees(normalized);
      }
    } catch (error) {
      console.error("Error fetching attendees:", error);
      showToast("error", "Failed to load attendees");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEligibleCertificates = async () => {
    try {
      const response = await getEligibleCertificatesByEvent(selectedEvent);
      if (response && response.data) {
        setEligibleCerts(response.data);
      }
    } catch (error) {
      console.error("Error fetching eligible certificates:", error);
    }
  };

  const isEligible = (attendeeId) => {
    if (!attendeeId) return false;

    // Try to find the attendee object in current attendees list to extract its student id number (id_number)
    const attendeeObj = attendees.find((a) => {
      const candidate = a && a.studentId && a.studentId._id ? String(a.studentId._id) : String(a._id || a.id_number || "");
      return candidate === String(attendeeId);
    });

    const attendeeStudentNumber = attendeeObj ? (attendeeObj.studentId && attendeeObj.studentId.studentId ? attendeeObj.studentId.studentId : attendeeObj.id_number || "") : "";

    return eligibleCerts.some((cert) => {
      if (!cert) return false;

      // If certificate stores the studentIdNumber (preferred), compare by student id number (handles embedded attendees)
      if (cert.studentIdNumber && attendeeStudentNumber) {
        return String(cert.studentIdNumber) === String(attendeeStudentNumber);
      }

      // Fallback: compare by attendeeId (could be raw id or object with _id)
      const certIdCandidate = cert.attendeeId && (cert.attendeeId._id || cert.attendeeId);
      if (!certIdCandidate) return false;
      return String(certIdCandidate) === String(attendeeId);
    });
  };

  const handleSelectAll = () => {
    const filteredAttendees = getFilteredAttendees();
    if (selectedAttendees.length === filteredAttendees.length) {
      setSelectedAttendees([]);
    } else {
      setSelectedAttendees(filteredAttendees.map((a) => a.studentId._id));
    }
  };

  const handleSelectAttendee = (attendeeId) => {
    if (selectedAttendees.includes(attendeeId)) {
      setSelectedAttendees(selectedAttendees.filter((id) => id !== attendeeId));
    } else {
      setSelectedAttendees([...selectedAttendees, attendeeId]);
    }
  };

  const handleBulkCheck = async () => {
    if (selectedAttendees.length === 0) {
      showToast("error", "Please select at least one attendee");
      return;
    }

    try {
      setIsLoading(true);
      // Get student ID numbers for selected attendees
      const studentIdNumbers = attendees
        .filter((a) => selectedAttendees.includes(a.studentId._id))
        .map((a) => a.studentId.studentId);

      const response = await bulkCheckEligibility(selectedEvent, studentIdNumbers);
      if (response && response.results) {
        setValidationResults(response.results);
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error("Error checking eligibility:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEligible = async (validStudents = null) => {
    try {
      setIsLoading(true);
      const attendeeIds = validStudents
        ? validStudents.map((s) => s.attendeeId)
        : selectedAttendees;

      if (attendeeIds.length === 0) {
        showToast("error", "No students to add");
        return;
      }

      await addEligibleCertificates(selectedEvent, attendeeIds);
      await fetchEligibleCertificates();
      setSelectedAttendees([]);
      setShowValidationModal(false);
    } catch (error) {
      console.error("Error adding eligible certificates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveEligible = async () => {
    if (selectedAttendees.length === 0) {
      showToast("error", "Please select at least one attendee");
      return;
    }

    if (!window.confirm(`Remove eligibility for ${selectedAttendees.length} student(s)?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await removeEligibleCertificates(selectedEvent, selectedAttendees);
      await fetchEligibleCertificates();
      setSelectedAttendees([]);
    } catch (error) {
      console.error("Error removing eligible certificates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      showToast("error", "Please upload a CSV file");
      return;
    }

    try {
      setIsLoading(true);
      const response = await importEligibleCertificatesFromCSV(selectedEvent, file);
      if (response && response.results) {
        setImportResults(response.results);
        setShowImportResults(true);
        await fetchEligibleCertificates();
      }
    } catch (error) {
      console.error("Error importing CSV:", error);
    } finally {
      setIsLoading(false);
      event.target.value = ""; // Reset file input
    }
  };

  const getFilteredAttendees = () => {
    if (filter === "eligible") {
      return attendees.filter((a) => isEligible(a.studentId._id));
    } else if (filter === "non-eligible") {
      return attendees.filter((a) => !isEligible(a.studentId._id));
    }
    return attendees;
  };

  const filteredAttendees = getFilteredAttendees();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Certificate Eligibility Management</h1>

      {/* Event Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Event</label>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">-- Select an Event --</option>
          {events.map((event) => {
            const eventName = event.eventName || event.name || "Untitled Event";
            const rawDate = event.eventDate || event.date || "";
            let formattedDate = "TBA";
            if (rawDate) {
              const d = new Date(rawDate);
              formattedDate = Number.isNaN(d.getTime()) ? String(rawDate) : d.toLocaleDateString();
            }
            return (
              <option key={event._id} value={event._id}>
                {eventName} - {formattedDate}
              </option>
            );
          })}
        </select>
      </div>

      {selectedEvent && (
        <>
          {/* Action Buttons */}
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              onClick={handleBulkCheck}
              disabled={isLoading || selectedAttendees.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              Validate Selected ({selectedAttendees.length})
            </button>
            <button
              onClick={() => handleAddEligible()}
              disabled={isLoading || selectedAttendees.length === 0}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              Add to Eligible
            </button>
            <button
              onClick={handleRemoveEligible}
              disabled={isLoading || selectedAttendees.length === 0}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300"
            >
              Remove Eligibility
            </button>
            <label className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 cursor-pointer">
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </div>

          {/* Filter */}
          <div className="mb-4 flex items-center gap-4">
            <label className="text-sm font-medium">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">All Attendees ({attendees.length})</option>
              <option value="eligible">
                Eligible Only ({attendees.filter((a) => isEligible(a.studentId._id)).length})
              </option>
              <option value="non-eligible">
                Non-Eligible Only (
                {attendees.filter((a) => !isEligible(a.studentId._id)).length})
              </option>
            </select>
          </div>

          {/* Attendees Table */}
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedAttendees.length === filteredAttendees.length &&
                        filteredAttendees.length > 0
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-left">Student ID</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : filteredAttendees.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-500">
                      No attendees found
                    </td>
                  </tr>
                ) : (
                  filteredAttendees.map((attendee) => {
                    const eligible = isEligible(attendee.studentId._id);
                    return (
                      <tr key={attendee._id} className="border-t hover:bg-gray-50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedAttendees.includes(attendee.studentId._id)}
                            onChange={() => handleSelectAttendee(attendee.studentId._id)}
                          />
                        </td>
                        <td className="p-3">{attendee.studentId.studentId}</td>
                        <td className="p-3">{attendee.studentId.name}</td>
                        <td className="p-3">{attendee.studentId.email}</td>
                        <td className="p-3">
                          {eligible ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                              Eligible
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                              Not Eligible
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Validation Modal */}
      {showValidationModal && validationResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Validation Results</h2>

            {validationResults.valid.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-green-600 mb-2">
                  Valid Students ({validationResults.valid.length})
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {validationResults.valid.map((student) => (
                    <li key={student.studentId}>
                      {student.studentId} - {student.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validationResults.invalid.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-red-600 mb-2">
                  Invalid Students ({validationResults.invalid.length})
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {validationResults.invalid.map((student) => (
                    <li key={student.studentId}>
                      {student.studentId} - {student.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validationResults.duplicates.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-yellow-600 mb-2">
                  Already Eligible ({validationResults.duplicates.length})
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {validationResults.duplicates.map((student) => (
                    <li key={student.studentId}>{student.studentId}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {validationResults.valid.length > 0 && (
                <button
                  onClick={() => handleAddEligible(validationResults.valid)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Add Valid Students ({validationResults.valid.length})
                </button>
              )}
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Results Modal */}
      {showImportResults && importResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">CSV Import Results</h2>

            <div className="mb-4">
              <p className="text-lg">
                <span className="font-semibold">Successfully Imported:</span>{" "}
                {importResults.imported}
              </p>
            </div>

            {importResults.invalid.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-red-600 mb-2">
                  Invalid Students ({importResults.invalid.length})
                </h3>
                <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                  {importResults.invalid.map((student, idx) => (
                    <li key={idx}>
                      {student.studentId} - {student.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {importResults.duplicates.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-yellow-600 mb-2">
                  Already Eligible ({importResults.duplicates.length})
                </h3>
                <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                  {importResults.duplicates.map((student, idx) => (
                    <li key={idx}>{student.studentId}</li>
                  ))}
                </ul>
              </div>
            )}

            {importResults.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-red-600 mb-2">
                  Errors ({importResults.errors.length})
                </h3>
                <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                  {importResults.errors.map((error, idx) => (
                    <li key={idx}>
                      {error.studentId} - {error.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setShowImportResults(false)}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EligibleCertificates;
