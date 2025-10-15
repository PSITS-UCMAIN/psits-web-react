import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AsideBar from "../common/navbar/AsideBar";
import ProfileHeader from "../ProfileHeader";
import { getInformationData } from "../../authentication/Authentication";
import { isStudentYearUpdated, updateStudentYearLevelForCurrentYear } from "../../api/students";
import { showToast } from "../../utils/alertHelper";
import ForcedInputModal from '../common/modal/ForcedInputModal'

const StudentLayout = () => {
  const location = useLocation();
  const userData = getInformationData();
  const [label, setLabel] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isYearUpdated, setIsYearUpdated] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const pathParts = location.pathname.split("/");
    const extractedLabel = pathParts[2];
    setLabel(
      extractedLabel === "profile" ? "Account Settings" : extractedLabel
    );
  }, [location]);

  const toggleSidebar = () => setIsSidebarOpen(true);
  const toggleCloseSidebar = () => setIsSidebarOpen(false);

  const navItems = [
    { text: "Dashboard", icon: "fas fa-tachometer-alt", path: "dashboard" },
    { text: "Merchandise", icon: "fas fa-boxes", path: "merchandise" },
    
    { text: "Cart", icon: "fas fa-shopping-cart", path: "cart" },
    { text: "Orders", icon: "fas fa-clipboard-list", path: "orders" },
    { text: "Events", icon: "fas fa-calendar-alt", path: "events" },
    { text: "Resources", icon: "fas fa-book-open", path: "resources" },
  ]; 
  
  // Update year level before proceeding to site
  const handleUpdateYearLevel = async (idNumber, year) => {
    setLoading(true)
    try {
      await updateStudentYearLevelForCurrentYear(idNumber, year)
      showToast('success', 'Your year level has been updated. You may proceed to use the site normally.')
      setIsModalOpen(false)
    } catch(error) {
      showToast('error', error.response.data?.message || 'An error has occurred while updating your year level.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isFetchYearChecked = false
    const fetchYearUpdated = async () => {
      setIsYearUpdated(await isStudentYearUpdated(userData.id_number))
      isFetchYearChecked = true
    }
    fetchYearUpdated()
    if (isFetchYearChecked) {
      setIsModalOpen(true)
    }
  }, []);

  return (
    <div className="min-h-screen relative">
      {!isYearUpdated && <ForcedInputModal studentIdNumber={userData.id_number}  isOpen={isModalOpen} onSubmit={handleUpdateYearLevel} loading={loading} />}
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
