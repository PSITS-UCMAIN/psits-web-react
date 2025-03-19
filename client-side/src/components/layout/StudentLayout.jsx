import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AsideBar from "../common/navbar/AsideBar";
import ProfileHeader from "../ProfileHeader";

const StudentLayout = () => {
  const location = useLocation();
  const [label, setLabel] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const pathParts = location.pathname.split("/");
    const extractedLabel = pathParts[2];
    setLabel(
      extractedLabel === "profile" ? "Account Settings" : extractedLabel
    );
  }, [location]);

  const toggleSidebar = () => setIsSidebarOpen(true);
  const toggleCloseSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {});
  const navItems = [
    { text: "Dashboard", icon: "fas fa-tachometer-alt", path: "dashboard" },
    { text: "Merchandise", icon: "fas fa-boxes", path: "merchandise" },

    { text: "Cart", icon: "fas fa-shopping-cart", path: "cart" },
    { text: "Orders", icon: "fas fa-clipboard-list", path: "orders" },
    { text: "Events", icon: "fas fa-calendar-alt", path: "events" },
    { text: "Resources", icon: "fas fa-book-open", path: "resources" },
  ]; 

  return (
    <div className="min-h-screen relative">
      <AsideBar
        navItems={navItems}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <ProfileHeader label={label} toggleSidebar={toggleSidebar} />
      <main className="lg:ml-[15rem] min-h-main-md px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
