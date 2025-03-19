import React, { useEffect, useState } from "react";
import TableComponent from "../../components/Custom/TableComponent";
import { fetchAdminLogs } from "../../api/admin";

function Logs() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await fetchAdminLogs();
        setData(result);
        // console.log("Fetched data:", result);
      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const columns = [
    {
      key: "timestamp",
      label: "Timestamp",
      selector: (row) => row.timestamp,
      sortable: true,
      cell: (row) => {
        // Convert timestamp to PHT (GMT+8)
        const date = new Date(row.timestamp); // Ensure this is a valid ISO string or timestamp
        const options = {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Manila",
        };
        const formattedDate = date.toLocaleString("en-PH", options);
        return <span className="text-xs text-gray-500">{formattedDate}</span>;
      },
    },

    {
      key: "admin",
      label: "Admin",
      selector: (row) => row.admin,
      sortable: true,
      cell: (row) => <span className="text-xs text-gray-500">{row.admin}</span>,
    },

    {
      key: "action",
      label: "Action",
      selector: (row) => row.action,
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-gray-500">{row.action}</span>
      ),
    },
    {
      key: "target",
      label: "Target",
      selector: (row) => row.target,
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-gray-500">{row.target}</span>
      ),
    },

    {
      key: "target_model",
      label: "Target Model",
      selector: (row) => row.target_model,
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-gray-500">{row.target_model}</span>
      ),
    },
  ];

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <TableComponent
          data={data}
          columns={columns}
          style="custom-table-style"
        />
      )}
    </div>
  );
}

export default Logs;
