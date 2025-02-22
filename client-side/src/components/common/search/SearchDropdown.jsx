import { useState } from "react";
import PropTypes from "prop-types";
import TextInput from "../TextInput";

const SearchDropdown = ({ label, options, onOptionSelect, placeholder = "Search..." }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFilteredOptions(
      options.filter((option) =>
        option.label.toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setSearchTerm("");
    setFilteredOptions([]);
    onOptionSelect(option);
  };

  const handleRemoveSelectedOption = () => {
    setSelectedOption(null);
    onOptionSelect(null);
  };

  return (
    <div className="relative overflow-visible">
      <label className="text-lg">{label}</label>
      {selectedOption ? (
        <div className="flex items-center border border-gray-300 rounded px-2 py-1">
          <div className="bg-slate-800 text-white p-1 px-2 rounded">
            <span>{selectedOption.label}</span>
            <button
              className="ml-2 text-red-500"
              onClick={handleRemoveSelectedOption}
            >
              &times;
            </button>
          </div>
        </div>
      ) : (
        <TextInput
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder={placeholder}
        />
      )}
      {filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-scroll">
          {filteredOptions.map((option, index) => (
            <li
              key={index}
              className="px-4 py-2 cursor-pointer hover:bg-gray-200"
              onClick={() => handleOptionClick(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

SearchDropdown.propTypes = {
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.any.isRequired,
    })
  ).isRequired,
  onOptionSelect: PropTypes.func.isRequired,
  placeholder: PropTypes.string
};

export default SearchDropdown;