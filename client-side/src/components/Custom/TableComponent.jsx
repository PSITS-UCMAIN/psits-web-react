import { motion } from "framer-motion";
import React, { useMemo, useState } from "react";
import ButtonsComponent from "./ButtonsComponent";
import Pagination from "./Pagination";
import SearchComponent from "./SearchComponent";
import TableBody from "./TableBody";
import TableHeader from "./TableHeader";

const TableComponent = ({
  data = [],
  columns = [],
  style,
  customSearch,
  customButtons,
  loading,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");

  const getColumnValue = (item, key) => {
    if (key === "name") {
      return `${item.first_name} ${item.middle_name} ${item.last_name}  ${item.name} RFID: ${item.rfid}`;
    }
    return item[key];
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aValue = getColumnValue(a, sortConfig.key);
      const bValue = getColumnValue(b, sortConfig.key);
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const filteredDataBySearch = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return sortedData.filter((item) =>
      columns.some((column) => {
        const value = getColumnValue(item, column.key);
        return value && value.toString().toLowerCase().includes(searchLower);
      })
    );
  }, [sortedData, searchQuery, columns]);

  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentRows = filteredDataBySearch.slice(
    indexOfFirstRow,
    indexOfLastRow
  );

  const totalPages = Math.ceil(filteredDataBySearch.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="md:overflow-x-auto shadow-sm rounded-sm border bg-white p-6 space-y-4">
      <div className="flex flex-col gap-4 items-end justify-between">
        {customSearch || (
          <SearchComponent
            searchQuery={searchQuery}
            handleSearchChange={handleSearchChange}
            placeholder="Search data..."
            className="w-full sm:max-w-xs bg-gray-50 border rounded-lg p-2 text-sm"
          />
        )}
        {customButtons || (
          <ButtonsComponent style="flex-1 justify-between w-full flex flex-row space-x-3" />
        )}
      </div>

      <motion.div
        className={`overflow-x-auto ${style} mt-4`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.table
          aria-label="Data Table"
          role="table"
          className="min-w-full divide-y divide-gray-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <TableHeader
            columns={columns}
            sortConfig={sortConfig}
            handleSort={handleSort}
          />
          <TableBody
            columns={columns}
            currentRows={currentRows}
            loading={loading}
          />
        </motion.table>
      </motion.div>

      {/* Pagination Section */}
      <div className="mt-4 flex justify-between items-center">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
          totalItems={filteredDataBySearch.length}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
        />
      </div>
    </div>
  );
};

export default TableComponent;
