import { useState } from "react";
import { Outlet } from "react-router";
import { Menu } from "lucide-react";
import { AdminSidebar } from "../features/admin/components";
import { Button } from "@/components/ui/button";

export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="bg-background flex min-h-screen overflow-hidden">
      {/* Hamburger button for mobile */}
      <Button
        variant="ghost"
        size="icon-lg"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={toggleSidebar}
        aria-label="Open sidebar"
      >
        <Menu className="h-7 w-7" />
      </Button>

      {/* Backdrop overlay for mobile — always in DOM, fades in/out */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ease-in-out lg:hidden ${
          isSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={toggleSidebar}
      />

      {/* Mobile sidebar drawer — always in DOM, slides in/out */}
      <div
        className={`bg-background fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar collapsed={false} onToggleCollapse={toggleCollapse} />
      </div>

      {/* Sidebar for desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:relative ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } hidden transition-transform duration-300 ease-in-out lg:block lg:translate-x-0`}
      >
        <AdminSidebar
          collapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
      </div>

      {/* Main Content */}
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto pt-14 lg:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
