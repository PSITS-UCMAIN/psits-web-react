import { CampusView } from '@/components/common/CampusView';
import { useAuth } from '@/features/auth';
import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

export const StudentLayout: React.FC = () => {
  const { user } = useAuth();
  const userName = user?.name || 'Student';
  const location = useLocation();
  const isIndexRoute = location.pathname === '/student' || location.pathname === '/student/';

  return (
    <div className="w-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col lg:flex-row mt-15 sm:mt-20 mb-15 sm:mb-20 lg:items-center lg:justify-between gap-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light m-0">Hello! {userName}</h1>

          <p className="max-w-md text-gray-500 m-0 text-sm sm:text-base">
            Welcome to your account! Track your attendance, manage orders, and update your account details—all in one place
          </p>
        </div>

        <nav className="mt-6 border-gray-100">
          <ul className="flex flex-wrap gap-6 text-sm">
            <li>
              <NavLink
                to="event-attendance"
                className={({ isActive }) =>
                  `pb-3 ${isActive ? 'border-b-4 border-sky-400' : 'border-b-4 border-transparent'}`
                }
              >
                Event Attendance
              </NavLink>
            </li>
            <CampusView allowedCampuses={['UC-Main']} role="Student">
              <li>
                <NavLink
                  to="my-orders"
                  className={({ isActive }) =>
                    `pb-3 ${isActive ? 'border-b-4 border-sky-400' : 'border-b-4 border-transparent'}`
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
                  `pb-3 ${isActive ? 'border-b-4 border-sky-400' : 'border-b-4 border-transparent'}`
                }
              >
                Event Certificates
              </NavLink>
            </li>

            <li>
              <NavLink
                to="account-settings"
                className={({ isActive }) =>
                  `pb-3 ${isActive || isIndexRoute ? 'border-b-4 border-sky-400' : 'border-b-4 border-transparent'}`
                }
              >
                Account Settings
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>

      <div className="bg-gray-100">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default StudentLayout;