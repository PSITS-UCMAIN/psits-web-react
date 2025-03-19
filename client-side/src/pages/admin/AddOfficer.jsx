import React, { useState, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ConfirmationModal from "../../components/common/modal/ConfirmationModal";
import { ConfirmActionType } from "../../enums/commonEnums";
import { addOfficer } from "../../api/admin";

const AddOfficer = ({ isVisible, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    id_number: "",
    email: "",
    password: "",
    confirm_password: "",
    name: "",
    course: "",
    year: "",
    position: "",
    status: "Request",
    campus: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const toggleConfirmPasswordVisibility = () =>
    setShowConfirmPassword(!showConfirmPassword);
  const [confirmModal, setConfirmModal] = useState(false);

  const handleConfirmModal = (e) => {
    e.preventDefault();
    setConfirmModal(true);
  };
  const handleCloseModal = () => {
    setConfirmModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    handleCloseModal();
    if (formData.password === formData.confirm_password) {
      // console.log(formData);
      if (await addOfficer(formData)) {
        onClose();
      }
    } else {
      alert("Password is incorrect");
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div className="bg-slate-200 rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
				<button
					type="button"
					onClick={onClose}
					className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
					<AiOutlineClose size={24} />
				</button>

				<form>
					<h2 className="text-xl font-semibold mb-4">Add Officer</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<div className="mb-4">
								<label className="block text-sm font-medium">ID Number</label>
								<input
									type="text"
									name="id_number"
									onChange={handleChange}
									className="mt-1 block w-full rounded-md p-2 border-gray-300 shadow-sm "
								/>
							</div>

							<div className="mb-4">
								<label className="block text-sm font-medium">Name</label>
								<input
									type="text"
									name="name"
									onChange={handleChange}
									className="mt-1 block w-full rounded-md p-2 border-gray-300 shadow-sm"
								/>
							</div>
							<div className="mb-4">
								<label htmlFor="password" className="block text-sm font-medium">
									Password
								</label>
								<div className="relative">
									<input
										type={showPassword ? "text" : "password"}
										name="password"
										id="password"
										onChange={handleChange}
										className="mt-1 block w-full rounded-md p-2 border border-gray-300 shadow-sm pr-10"
									/>
									<span
										onClick={togglePasswordVisibility}
										className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-500">
										<FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
									</span>
								</div>
							</div>

							<div className="mb-4">
								<label
									htmlFor="confirm_password"
									className="block text-sm font-medium">
									Confirm Password
								</label>
								<div className="relative">
									<input
										type={showConfirmPassword ? "text" : "password"}
										name="confirm_password"
										id="confirm_password"
										onChange={handleChange}
										className="mt-1 block w-full rounded-md p-2 border border-gray-300 shadow-sm pr-10"
									/>
									<span
										onClick={toggleConfirmPasswordVisibility}
										className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-500">
										<FontAwesomeIcon
											icon={showConfirmPassword ? faEyeSlash : faEye}
										/>
									</span>
								</div>
							</div>

							<div className="mb-4">
								<label className="block text-sm font-medium">Position</label>
								<select
									className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm"
									id="position"
									name="position"
									onChange={handleChange}
									required>
									<option value="none" selected disabled hidden>
										Select Position
									</option>
									<option value="President">President</option>
									<option value="Vice-President Internal">
										Vice-President Internal
									</option>
									<option value="Vice-President External">
										Vice-President External
									</option>
									<option value="Secretary">Secretary</option>
									<option value="Treasurer">Treasurer</option>
									<option value="Assistant Treasurer">
										Assistant Treasurer
									</option>
									<option value="Auditor">Auditor</option>
									<option value="P.I.O">P.I.O</option>
									<option value="P.R.O">P.R.O</option>
									<option value="Chief Volunteer">Chief Volunteer</option>
									<option value="1st Year Representative">
										1st Year Representative
									</option>
									<option value="2nd Year Representative">
										2nd Year Representative
									</option>
									<option value="3rd Year Representative">
										3rd Year Representative
									</option>
									<option value="4th Year Representative">
										4th Year Representative
									</option>
								</select>
							</div>
						</div>

						<div>
							<div className="mb-4">
								<label className="block text-sm font-medium">Email</label>
								<input
									type="email"
									name="email"
									value={formData.email || ""}
									onChange={handleChange}
									className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm"
								/>
							</div>

							<div className="mb-4">
								<label className="block text-sm font-medium">Course</label>
								<select
									className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm"
									id="course"
									name="course"
									onChange={handleChange}
									required>
									<option value="none" selected disabled hidden>
										Select Course
									</option>
									<option value="BSIT">BSIT</option>
									<option value="BSCS">BSCS</option>
									<option value="ACT">ACT</option>
								</select>
							</div>

							<div className="mb-4">
								<label className="block text-sm font-medium">Year</label>
								<select
									className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm"
									id="year"
									name="year"
									onChange={handleChange}
									required>
									<option value="none" selected disabled hidden>
										Select Year
									</option>
									<option value="1">1</option>
									<option value="2">2</option>
									<option value="3">3</option>
									<option value="4">4</option>
								</select>
							</div>
							<div className="mb-4">
								<label className="block text-sm font-medium">Campus</label>
								<select
									className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm"
									id="campus"
									name="campus"
									onChange={handleChange}
									required>
									<option value="none" selected disabled hidden>
										Select Campus
									</option>
									<option value="UC-Main">UC Main</option>
									<option value="UC-Banilad">UC Banilad</option>
									<option value="UC-LM">UC Lapu-Lapu Mandaue</option>
									<option value="UC-PT">UC Pardo Talisay</option>
									<option value="UC-CS">UC Main CSPS</option>
								</select>
							</div>
						</div>
					</div>

					<div className="flex justify-end">
						<button
							type="button"
							onClick={onClose}
							className="mr-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md">
							Cancel
						</button>
						<button
							className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md"
							onClick={handleConfirmModal}>
							Save
						</button>
					</div>
				</form>
			</div>
			{confirmModal && (
				<>
					<ConfirmationModal
						confirmType={ConfirmActionType.APPROVAL}
						onConfirm={() => handleSubmit()}
						onCancel={() => handleCloseModal()}
					/>
				</>
			)}
		</div>
	);
};

export default AddOfficer;
