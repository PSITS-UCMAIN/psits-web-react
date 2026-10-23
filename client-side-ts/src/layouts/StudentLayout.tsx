import { CampusView } from "@/components/common/CampusView";
import { useAuth } from "@/features/auth";
import { normalizeMembershipStatus } from "@/features/student";
import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

export const StudentLayout: React.FC = () => {
  const { user } = useAuth();
  const userName = user?.name || "Student";
  const location = useLocation();
  const isIndexRoute =
    location.pathname === "/student" || location.pathname === "/student/";
  const isMembershipRoute = location.pathname.startsWith("/student/membership");
  const showMembershipLink =
    user?.role === "student" &&
    normalizeMembershipStatus(user.membershipStatus) !== "active";

  return (
    <div className="w-full">
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mt-15 mb-15 flex flex-col gap-6 sm:mt-20 sm:mb-20 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="m-0 text-3xl font-light sm:text-4xl lg:text-5xl">
            Hello! {userName}
          </h1>

          <p className="m-0 max-w-md text-sm text-gray-500 sm:text-base">
            Welcome to your account! Track your attendance, manage orders, and
            update your account details—all in one place
          </p>
        </div>

        <nav className="mt-6 border-gray-100">
          <ul className="flex flex-wrap gap-6 text-sm">
            <li>
              <NavLink
                to="event-attendance"
                className={({ isActive }) =>
                  `pb-3 ${isActive ? "border-b-4 border-sky-400" : "border-b-4 border-transparent"}`
                }
              >
                Event Attendance
              </NavLink>
            </li>
            <CampusView allowedCampuses={["UC_MAIN"]} role="student">
              <li>
                <NavLink
                  to="my-orders"
                  className={({ isActive }) =>
                    `pb-3 ${isActive ? "border-b-4 border-sky-400" : "border-b-4 border-transparent"}`
                  }
                >
                  My Orders
                </NavLink>
              </li>
            </CampusView>

            <li>
              <NavLink
                to="certificates"
                className={({ isActive }) =>
                  `pb-3 ${isActive ? "border-b-4 border-sky-400" : "border-b-4 border-transparent"}`
                }
              >
                Certificates
              </NavLink>
            </li>

            <li>
              <NavLink
                to="account-settings"
                className={({ isActive }) =>
                  `pb-3 ${isActive || isIndexRoute ? "border-b-4 border-sky-400" : "border-b-4 border-transparent"}`
                }
              >
                Account Settings
              </NavLink>
            </li>
            {showMembershipLink && (
              <li>
                <NavLink
                  to="membership-required"
                  className={() =>
                    `pb-3 ${isMembershipRoute ? "border-b-4 border-sky-400" : "border-b-4 border-transparent"}`
                  }
                >
                  Membership
                </NavLink>
              </li>
            )}
            <li>
              <NavLink
                to="application"
                className={({ isActive }) =>
                  `pb-3 ${isActive ? "border-b-4 border-sky-400" : "border-b-4 border-transparent"}`
                }
              >
                Application
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>

      <div className="bg-gray-100">
        <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default StudentLayout;
