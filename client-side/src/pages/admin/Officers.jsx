import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Tab from "../../components/Tab";
import {
  presidentPosition,
  headDevPosition,
} from "../../components/tools/clientTools";

const Officers = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const tabs = [
    {
      path: "/admin/officers",
      text: `Admin Account`,
      icon: "fas fa-users",
    },
    {
      path: "/admin/officers/student-account",
      text: `Officers`,
      icon: "fas fa-users",
    },
    {
      path: "/admin/officers/developers",
      text: `Developers`,
      icon: "fas fa-code",
    },
    {
      path: "/admin/officers/media",
      text: `Media`,
      icon: "fas fa-photo-video",
    },
    {
      path: "/admin/officers/volunteers",
      text: `Volunteers`,
      icon: "fas fa-hands-helping",
    },
    {
      path: "/admin/officers/suspend",
      text: `Suspended`,
      icon: "fas fa-ban",
    },
    presidentPosition() || headDevPosition()
      ? {
          path: "/admin/officers/request",
          text: `Request `,
          icon: "fas fa-envelope-open-text",
        }
      : {
          path: "#",
          text: `Disabled `,
          icon: "fas fa-lock",
          disabled: true,
        },
    presidentPosition() || headDevPosition()
      ? {
          path: "/admin/officers/admin-request",
          text: `Admin Request `,
          icon: "fas fa-envelope",
        }
      : {
          path: "#",
          text: `Disabled `,
          icon: "fas fa-lock",
          disabled: true,
        },
  ];

  return (
    <div>
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
    </div>
  );
};

export default Officers;
