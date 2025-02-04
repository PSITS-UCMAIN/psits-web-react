import { useState } from "react";
import PropTypes from "prop-types";
import TextInput from "../TextInput";

const SearchDropdown = ({ options, onOptionSelect, placeholder = "Search..." }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState([]);

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
    setSearchTerm(option.label);
    setFilteredOptions([]);
    onOptionSelect(option);
  };

  return (
    <div className="relative overflow-visible">
      <TextInput
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder={placeholder}
      />
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