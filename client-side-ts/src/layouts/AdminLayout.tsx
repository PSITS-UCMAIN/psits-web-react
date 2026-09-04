import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { Menu } from "lucide-react";
import { AdminSidebar } from "../features/admin/components";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { AgentChatToggle } from "@/features/admin/agent-chat/components/AgentChatToggle";
import { ChatTourOverlay } from "@/features/admin/agent-chat/components/ChatTourOverlay";
import { getChatbotEnabled, getNoetixDisabledAdmins } from "@/features/admin/devtools/api/devtools.api";
import { useAuth } from "@/features/auth";

export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatbotEnabled, setIsChatbotEnabled] = useState(true);
  const [isNoetixDisabled, setIsNoetixDisabled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    getChatbotEnabled()
      .then(setIsChatbotEnabled)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getNoetixDisabledAdmins()
      .then((data) => setIsNoetixDisabled(data.noetixDisabledAdmins.includes(user.id)))
      .catch(() => {});
  }, [user?.id]);

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
        className="bg-background fixed top-4 left-4 z-50 transition-all shadow-sm duration-300 lg:hidden"
        onClick={toggleSidebar}
        aria-label="Open sidebar"
      >
        <Menu className="h-6 w-6" />
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
        <AdminSidebar
          collapsed={false}
          onToggleCollapse={toggleCollapse}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />
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
        <div className="flex-1 overflow-y-auto overscroll-contain pt-14 lg:pt-0">
          <Outlet />
        </div>
      </main>
      <Toaster position="bottom-right" />
      {isChatbotEnabled && !isNoetixDisabled && (
        <>
          <AgentChatToggle isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
          <ChatTourOverlay
            isChatOpen={isChatOpen}
            onOpenChat={() => setIsChatOpen(true)}
          />
        </>
      )}
    </div>
  );
};
