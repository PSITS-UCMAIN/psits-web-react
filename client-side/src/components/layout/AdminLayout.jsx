import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AsideBar from "../common/navbar/AsideBar";
import ProfileHeader from "../ProfileHeader";
import { logsAccess, settingsAccess } from "../tools/clientTools";
import { getInformationData } from "../../authentication/Authentication";

const formatLabel = (text) => {
  if (!text) return "";
  return text
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const AdminLayout = () => {
  const location = useLocation();
  const [label, setLabel] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = getInformationData();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasRenderedBefore = localStorage.getItem("delayed_render");

    if (hasRenderedBefore) {
      setShow(true);
    } else {
      const timer = setTimeout(() => {
        setShow(true);
        localStorage.setItem("delayed_render", "true");
      }, 1);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const pathParts = location.pathname.split("/");
    const extractedLabel = pathParts[2];
    setLabel(
      extractedLabel === "profile"
        ? "Account Settings"
        : formatLabel(extractedLabel)
    );
  }, [location]);

  const toggleSidebar = () => setIsSidebarOpen(true);

  const navItems =
    user.campus === "UC-Main"
      ? [
          {
            text: "Dashboard",
            icon: "fas fa-tachometer-alt",
            path: "dashboard",
          },
          { text: "Members", icon: "fas fa-user-tie", path: "officers" },
          { text: "Students", icon: "fas fa-users", path: "students" },
          { text: "Events", icon: "fas fa-calendar-alt", path: "events" },
          { text: "Certificates", icon: "fas fa-certificate", path: "certificates" },
          { text: "Merchandise", icon: "fas fa-boxes", path: "merchandise" },
        { text: "Orders", icon: "fas fa-shopping-cart", path: "orders" },
           { text: "Refund", icon: "fas fa-money-bill-wave", path: "refund" },
          { text: "Reports", icon: "fas fa-chart-line", path: "reports" },
          { text: "Documentation", icon: "fas fa-book-open", path: "documentation" },
          logsAccess() && {
            text: "Logs",
            icon: "fa-solid fa-book",
            path: "logs",
          },
          settingsAccess() && {
            text: "Settings",
            icon: "fas fa-cog",
            path: "settings",
          },
        ].filter(Boolean)
      : [{ text: "Events", icon: "fas fa-calendar-alt", path: "events" }];

  return (
    <div className="min-h-screen relative">
      {show && (
        <>
          <AsideBar
            navItems={navItems}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
          <ProfileHeader label={label} toggleSidebar={toggleSidebar} />
          <main className="lg:ml-[15rem] min-h-main-md px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
            <Outlet />
          </main>
        </>
      )}
    </div>
  );
};

export default AdminLayout;
