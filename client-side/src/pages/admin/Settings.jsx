import { useState, useEffect } from "react";
import { getAllOfficers, editAdminAccess } from "../../api/admin";
import { getInformationData } from "../../authentication/Authentication";
import {
  financeConditionalAccess,
  executiveConditionalAccess,
  adminConditionalAccess,
} from "../../components/tools/clientTools";
import { revokeAllStudent } from "../../api/admin";
import ConfirmationModal from "../../components/common/modal/ConfirmationModal";
import { ConfirmActionType } from "../../enums/commonEnums";
import FormInput from "../../components/forms/FormInput";

const Settings = () => {
  const accessLevels = ["none", "standard", "finance", "executive", "admin"];
  const enums = {
    none: "None UC-Main Campus",
    standard: "Basic/Standard Access",
    finance: "Finance Access",
    executive: "Executive Access",
    admin: "Admin Access",
  };
  const [renewStudentStatus, setRenewStudentStatus] = useState(false);

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const data = getInformationData();

  const fetchUsers = async () => {
    try {
      const response = await getAllOfficers();

      setUsers(response ? response : []);
      setSelectedUsers([]);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserSelect = (userId, isSelected) => {
    if (isSelected) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    }
  };

  const handleShowModalRenewStudent = async () => {
    setRenewStudentStatus(true);
  };
  const handleRenewStudent = async () => {
    if (await revokeAllStudent()) {
      setRenewStudentStatus(false);
      fetchUsers();
    }
  };

  const handleIndividualAccessChange = async (id_number, newAccess) => {
    const updatedUsers = users.map((user) =>
      user.id_number === id_number ? { ...user, access: newAccess } : user
    );

    try {
      const response = await editAdminAccess(id_number, newAccess);
      if (response) {
        setUsers(updatedUsers);
        fetchUsers();
        if (id_number === data.id_number) {
          window.location.reload();
        }
      } else {
        console.error("Error updating access:", response);
      }
    } catch (error) {
      console.error("Error updating access:", error);
    }
  };

  return (
    <div className="max-w-full mx-auto p-6 space-y-10 text-gray-800">
      {/* User Access Section */}
      <section className="bg-white rounded-2xl shadow p-6 space-y-6">
        <h2 className="text-xl font-medium border-b pb-2">
          User Access Management
        </h2>
        {renewStudentStatus && (
          <ConfirmationModal
            confirmType={ConfirmActionType.RESET}
            onConfirm={() => handleRenewStudent()}
            onCancel={() => setRenewStudentStatus(false)}
          />
        )}
        {/* Bulk Access Control */}

        {/* User List */}
        <div>
          <h3 className="text-lg font-medium mb-2">All Users</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full text-sm border rounded-md">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3">Select</th>
                  <th className="p-3">ID</th>
                  <th className="p-3">Officer Name</th>
                  <th className="p-3">Campus</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Current Access</th>
                  <th className="p-3">Change Access</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id_number} className="border-t">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id_number)}
                        onChange={(e) =>
                          handleUserSelect(user.id, e.target.checked)
                        }
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="p-3">{user.id_number}</td>
                    <td className="p-3">{user.name}</td>
                    <td className="p-3">{user.campus}</td>
                    <td className="p-3">{user.position}</td>
                    <td className="p-3 capitalize">{enums[user.access]}</td>
                    <td className="p-3">
                      <select
                        value={user.access}
                        onChange={(e) =>
                          handleIndividualAccessChange(
                            user.id_number,
                            e.target.value
                          )
                        }
                        disabled={
                          (financeConditionalAccess() &&
                            (user.access === "executive" ||
                              user.access === "admin")) ||
                          (executiveConditionalAccess() &&
                            user.access === "admin")
                        }
                        className={`px-2 py-1 border rounded-md text-sm ${
                          data.access === "standard"
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {accessLevels.map((level) => (
                          <option
                            key={level}
                            value={level}
                            disabled={
                              (financeConditionalAccess() &&
                                (level === "executive" || level === "admin")) ||
                              (executiveConditionalAccess() &&
                                level === "admin")
                            }
                            className={`${
                              financeConditionalAccess() &&
                              (level === "executive" || level === "admin")
                                ? "text-gray-400"
                                : executiveConditionalAccess() &&
                                  level === "admin"
                                ? "text-gray-400"
                                : ""
                            }`}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Membership Renewal Section */}
      <section className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h2 className="text-xl font-medium border-b pb-2">Membership</h2>
        <div className=" pt-2 flex flex-row items-center justify-between space-x-3">
          <FormInput label="Change Membership Fee" type="number" />
          <FormInput label="Change Renewal Fee" type="number" />
        </div>
        <div>
          <button
            onClick={() => handleShowModalRenewStudent()}
            className={
              adminConditionalAccess()
                ? "px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium"
                : "px-4 py-2 bg-gray-300 text-gray-500 rounded-md font-medium cursor-not-allowed"
            }
            disabled={!adminConditionalAccess()}
          >
            Change Fee
          </button>
        </div>
        <div className="space-y-2">
          <p>Reset all active membership.</p>
          <button
            onClick={() => handleShowModalRenewStudent()}
            className={
              adminConditionalAccess()
                ? "px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium"
                : "px-4 py-2 bg-gray-300 text-gray-500 rounded-md font-medium cursor-not-allowed"
            }
            disabled={!adminConditionalAccess()}
          >
            Reset Membership
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
