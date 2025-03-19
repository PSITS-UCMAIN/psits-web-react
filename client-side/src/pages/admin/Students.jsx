import React, { useState, useEffect, useCallback } from "react";

import { Outlet, useLocation } from "react-router-dom";
import Tab from "../../components/Tab";
import { getCountStudent } from "../../api/admin";
import { InfinitySpin } from "react-loader-spinner";

const Students = () => {
  const [counts, setCounts] = useState({
    allMembers: 0,
    request: 0,
    renewals: 0,
    deleted: 0,
    history: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const location = useLocation();
  const currentPath = location.pathname;

  const fetchData = useCallback(async () => {
    try {
      const data = await getCountStudent();

      setCounts({
        allMembers: data?.all,
        request: data?.request,
        renewals: data?.renew,
        deleted: data?.deleted,
        history: data?.history,
      });
    } catch (err) {
      console.error("Error fetching membership data: ", err);
      setError("Failed to fetch membership data.");
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchData();
    setIsLoading(false);
    const intervalId = setInterval(fetchData, 3000); // Adjusted interval

    return () => clearInterval(intervalId);
  }, [fetchData]);

  const tabs = [
    {
      path: "/admin/students",
      text: `All Members ${counts.allMembers}`,
      icon: "fas fa-users",
    },
    {
      path: "/admin/students/request",
      text: `Request ${counts.request}`,
      icon: "fas fa-hand-paper",
    },
    {
      path: "/admin/students/renewal",
      text: `Renewals ${counts.renewals}`,
      icon: "fas fa-refresh",
    },
    {
      path: "/admin/students/delete",
      text: `Deleted ${counts.deleted}`,
      icon: "fas fa-trash-alt",
    },
    {
      path: "/admin/students/history",
      text: `History ${counts.history}`,
      icon: "fas fa-history",
    },
  ];

  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-full">
          <InfinitySpin
            visible={true}
            width={200}
            color="#0d6efd"
            ariaLabel="infinity-spin-loading"
          />
        </div>
      ) : (
        <div className="flex flex-col py-4 space-y-4">
          <div className="w-full flex flex-col">
            <Tab
              tabs={tabs}
              styles={"flex flex-col lg:flex-row items-stretch"}
              activePath={currentPath}
            />
          </div>
          <Outlet />
        </div>
      )}
    </div>
  );
};

export default Students;
