import React, { useState } from "react";
import { getInformationData } from "../../authentication/Authentication";

import FormInput from "../../components/forms/FormInput";
import FormSelect from "../../components/forms/FormSelect";
import FormButton from "../../components/forms/FormButton";
import FormTextArea from "../../components/forms/FormTextArea";

const Profile = () => {
  const user = getInformationData();
  const [profile, setProfile] = useState({
    id_number: user.id_number,
    name: user.name,
    bio: "",
    email: user.email,
    course: user.course,
    year: user.year,
    campus: user.campus,
    position: user.position,
  });

  const [isEditable, setIsEditable] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleEdit = () => setIsEditable(true);
  const handleCancel = () => setIsEditable(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    edit(profile);
    setIsEditable(false);
  };

  const courseOptions = [
    { value: "BSIT", label: "BSIT" },
    { value: "BSCS", label: "BSCS" },
    { value: "ACT", label: "ACT" },
  ];

  const yearOptions = [
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: 4, label: "4" },
  ];
  return (
    <div className="py-5">
      <div className="w-full rounded-sm bg-white p-6">
        <h3 className="text-md md:text-lg font-bold mb-3">Your Profile</h3>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div className="flex flex-col items-center mb-4">
            <img
              alt="Profile Preview"
              className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-full border border-gray-300"
              src="https://static.thenounproject.com/png/4530368-200.png"
            />
          </div>

          {user.role === "Admin" ? (
            <div className="space-y-10">
              <FormInput
                label="ID Number"
                type="text"
                id="id-number"
                value={profile.id_number}
                name="id_number"
                onChange={handleChange}
                styles="w-full p-2 text-sm border border-gray-300 rounded-md"
                disabled={!isEditable}
              />
              <FormInput
                label="Full Name"
                type="text"
                id="name"
                value={profile.name}
                name="name"
                onChange={handleChange}
                styles="w-full p-2 text-sm border border-gray-300 rounded-md"
                disabled={!isEditable}
              />
              <FormInput
                label="Position"
                type="text"
                id="position"
                value={profile.position}
                name="position"
                onChange={handleChange}
                styles="w-full p-2 text-sm border border-gray-300 rounded-md"
                disabled={!isEditable}
              />
              <FormInput
                label="Campus"
                type="text"
                id="campus"
                value={profile.campus}
                name="campus"
                onChange={handleChange}
                styles="w-full p-2 text-sm border border-gray-300 rounded-md"
                disabled={!isEditable}
              />
              <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
                <FormSelect
                  label="Course"
                  name="course"
                  value={profile.course}
                  onChange={handleChange}
                  options={courseOptions}
                  styles="flex-1 text-sm"
                  disabled={!isEditable}
                />
                <FormSelect
                  label="Year"
                  name="year"
                  value={profile.year}
                  onChange={handleChange}
                  options={yearOptions}
                  styles="flex-1 text-sm"
                  disabled={!isEditable}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              <FormInput
                label="ID Number"
                type="text"
                id="id-number"
                value={profile.id_number}
                name="id_number"
                styles="w-full p-2 text-sm border border-gray-300 rounded-md"
                disabled
              />
              <FormInput
                label="Full Name"
                type="text"
                id="name"
                value={profile.name}
                name="name"
                styles="w-full p-2 text-sm border border-gray-300 rounded-md"
                disabled
              />
              <FormInput
                label="Email"
                type="text"
                id="email"
                value={profile.email}
                name="email"
                styles="w-full p-2 text-sm border border-gray-300 rounded-md"
                disabled
              />
              <FormSelect
                label="Course"
                name="course"
                value={profile.course}
                onChange={handleChange}
                options={courseOptions}
                styles="w-full text-sm"
                disabled
              />
              <FormSelect
                label="Year"
                name="year"
                value={profile.year}
                onChange={handleChange}
                options={yearOptions}
                styles="w-full text-sm"
                disabled
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile;
