import React, { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  Grid,
  Calendar,
  BarChart3,
  FileText,
  GraduationCap,
  MoreVertical,
  PanelLeft,
  LogOut,
  Settings,
  ShoppingBag,
  Users,
  UserRoundPlus,
  Code,
  Award,
  BookOpenCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { useAuth } from "@/features/auth";
import { useCampusCheck } from "@/features/auth/hooks/useCampusCheck";
import { logAdminAction } from "@/features/admin/api/admin";
import { showToast } from "@/utils/alertHelper";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { PSITS_ROLES } from "@/features/admin/constants/adminAccess";

interface AdminSidebarProps {
  userName?: string;
  userRole?: string;
  userInitials?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  userName = "Jan Lorenz Laroco",
  userRole = "Developer",
  userInitials = "JL",
  collapsed = false,
  onToggleCollapse,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isUcMainAdmin = useCampusCheck(["UC_MAIN"]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [merchandiseOpen, setMerchandiseOpen] = useState(
    location.pathname.startsWith("/admin/merchandise")
  );
  const menuRef = useRef<HTMLDivElement>(null);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    isRestricted = false
  ) => {
    if (isRestricted && !isUcMainAdmin) {
      e.preventDefault();
      showToast("error", "Unauthorized.");
      return;
    }
    onCloseMobile?.();
  };

  const isActivePath = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const getNavButtonClass = (path: string, isDisabled = false) =>
    cn(
      "w-full",
      collapsed ? "h-10 justify-center px-0" : "justify-start",
      isActivePath(path) &&
        "bg-[#1C9DDE]/10 text-[#1C9DDE] hover:bg-[#1C9DDE]/20 hover:text-[#1C9DDE]",
      isDisabled && "cursor-not-allowed text-gray-400 opacity-50"
    );

  const restrictedNavButtonClass = cn(
    "w-full",
    collapsed ? "h-10 justify-center px-0" : "justify-start",
    !isUcMainAdmin && "cursor-not-allowed text-gray-400 opacity-50"
  );

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutsideMenu = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideMenu);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideMenu);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      if (user?.id) {
        await logAdminAction({
          admin_id: user.id,
          action: "Admin Logged Out (V2)",
        });
      }
      await logout();
      showToast("success", "Logged out successfully");
      navigate("/auth/login", { replace: true });
    } catch {
      showToast("error", "Logout failed. Please try again.");
    }
  };
  return (
    <TooltipProvider delayDuration={700}>
      <aside
        className={cn(
          "group/sidebar bg-background fixed top-0 flex h-screen flex-col border transition-all duration-300 lg:sticky",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo and Collapse Button */}
        <div
          className={cn(
            "relative p-4",
            collapsed && "flex h-20 items-center justify-center px-2 py-4"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3",
              collapsed ? "justify-center" : "justify-between"
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center gap-3",
                collapsed && "justify-center"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
                <img
                  src={logo}
                  alt="PSITS Logo"
                  className="h-full w-full rounded-full object-contain"
                />
              </div>
              {!collapsed && (
                // hide long text on very small screens to avoid overflow
                <div className="hidden truncate sm:block">
                  <h1 className="m-0 text-xs leading-tight font-semibold">
                    Philippines Society of
                  </h1>
                  <h2 className="m-0 text-xs leading-tight font-semibold">
                    Information Technology
                  </h2>
                  <h3 className="m-0 text-xs leading-tight font-semibold">
                    Students
                  </h3>
                </div>
              )}
            </div>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleCollapse}
                className={cn(
                  "hidden shrink-0 transition-all duration-300 lg:flex",
                  collapsed &&
                    "bg-background absolute top-4 right-1 h-7 w-7 border opacity-0 shadow-sm group-hover/sidebar:opacity-100 focus-visible:opacity-100"
                )}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <PanelLeft
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    collapsed && "rotate-180"
                  )}
                />
              </Button>
            )}
          </div>
        </div>

        {/* <Separator /> */}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            {!collapsed && (
              <h3 className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
                Navigation
              </h3>
            )}
            <ul className="space-y-1">
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={getNavButtonClass(
                        "/admin/dashboard",
                        !isUcMainAdmin
                      )}
                      asChild
                    >
                      <Link
                        to={isUcMainAdmin ? "/admin/dashboard" : "#"}
                        onClick={(e) => handleNavClick(e, true)}
                      >
                        <Grid className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Dashboard</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Dashboard</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={getNavButtonClass(
                        "/admin/organization",
                        !isUcMainAdmin
                      )}
                      asChild
                    >
                      <Link
                        to={isUcMainAdmin ? "/admin/organization" : "#"}
                        onClick={(e) => handleNavClick(e, true)}
                      >
                        <Users className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Organization</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Organization</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={getNavButtonClass(
                        "/admin/recuitment-management",
                        !isUcMainAdmin
                      )}
                      asChild
                    >
                      <Link
                        to={
                          isUcMainAdmin ? "/admin/recuitment-management" : "#"
                        }
                        onClick={(e) => handleNavClick(e, true)}
                      >
                        <UserRoundPlus className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Recruitment</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Recruitment</p>
                    </TooltipContent> 
                  )}
                </Tooltip>
              </li>
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={getNavButtonClass(
                        "/admin/contributions",
                        !isUcMainAdmin
                      )}
                      asChild
                    >
                      <Link
                        to={isUcMainAdmin ? "/admin/contributions" : "#"}
                        onClick={(e) => handleNavClick(e, true)}
                      >
                        <BookOpenCheck className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Contributions</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Contributions</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={getNavButtonClass(
                        "/admin/students",
                        !isUcMainAdmin
                      )}
                      asChild
                    >
                      <Link
                        to={isUcMainAdmin ? "/admin/students" : "#"}
                        onClick={(e) => handleNavClick(e, true)}
                      >
                        <GraduationCap className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Students</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Students</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={getNavButtonClass("/admin/events")}
                      asChild
                    >
                      <Link
                        to="/admin/events"
                        onClick={(e) => handleNavClick(e, false)}
                      >
                        <Calendar className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                          <span className="font-medium">Events</span>
                        )}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Events</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={getNavButtonClass("/admin/certificates")}
                      asChild
                    >
                      <Link
                        to="/admin/certificates"
                        onClick={(e) => handleNavClick(e, false)}
                      >
                        <Award className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                          <span className="font-medium">Certificates</span>
                        )}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Certificates</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
            </ul>
          </div>

          <div className="mb-4">
            {!collapsed && (
              <h3 className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
                Operations
              </h3>
            )}
            <ul className="space-y-1">
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className={getNavButtonClass(
                        "/admin/merchandise",
                        !isUcMainAdmin
                      )}
                      aria-expanded={!collapsed && merchandiseOpen}
                      onClick={() => {
                        if (!isUcMainAdmin) {
                          showToast("error", "Unauthorized.");
                          return;
                        }
                        setMerchandiseOpen((current) => !current);
                      }}
                    >
                      <ShoppingBag className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Merchandise</span>}
                      {!collapsed && (
                        <ChevronDown
                          className={cn(
                            "ml-auto h-4 w-4 transition-transform",
                            merchandiseOpen && "rotate-180"
                          )}
                        />
                      )}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Merchandise</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                {!collapsed && isUcMainAdmin && merchandiseOpen && (
                  <div className="mt-1 ml-9 space-y-1">
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-8 w-full justify-start px-2 text-sm font-normal",
                        isActivePath("/admin/merchandise/products") &&
                          "text-[#1C9DDE]"
                      )}
                      asChild
                    >
                      <Link
                        to="/admin/merchandise/products"
                        onClick={(e) => handleNavClick(e, false)}
                      >
                        Products
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-8 w-full justify-start px-2 text-sm font-normal",
                        isActivePath("/admin/merchandise/promo") &&
                          "text-[#1C9DDE]"
                      )}
                      asChild
                    >
                      <Link
                        to="/admin/merchandise/promo"
                        onClick={(e) => handleNavClick(e, false)}
                      >
                        Promo
                      </Link>
                    </Button>
                  </div>
                )}
              </li>
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={getNavButtonClass("/admin/orders")}
                      asChild
                    >
                      <Link
                        to="/admin/orders"
                        onClick={(e) => handleNavClick(e, false)}
                      >
                        <ClipboardList className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Orders</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Orders</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
              {user?.access === PSITS_ROLES.DEVELOPER ||
              user?.access === PSITS_ROLES.ADMIN ? (
                <li>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={getNavButtonClass("/admin/devtools")}
                        asChild
                      >
                        <Link
                          to="/admin/devtools"
                          onClick={(e) => handleNavClick(e, false)}
                        >
                          <Code className="h-5 w-5 shrink-0" />
                          {!collapsed && <span>Developer Tools</span>}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        <p>Developer Tools</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </li>
              ) : null}

              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={getNavButtonClass(
                        "/admin/reports",
                        !isUcMainAdmin
                      )}
                      asChild
                    >
                      <Link
                        to={isUcMainAdmin ? "/admin/reports" : "#"}
                        onClick={(e) => handleNavClick(e, true)}
                      >
                        <BarChart3 className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Reports</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Reports</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
            </ul>
          </div>

          <div>
            {!collapsed && (
              <h3 className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
                General
              </h3>
            )}
            <ul className="space-y-1">
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={getNavButtonClass("/admin/settings")}
                      asChild
                    >
                      <Link
                        to="/admin/settings"
                        onClick={(e) => handleNavClick(e, false)}
                      >
                        <Settings className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Settings</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Settings</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={restrictedNavButtonClass}
                      asChild
                    >
                      <Link
                        to={isUcMainAdmin ? "/admin/documentation" : "#"}
                        onClick={(e) => handleNavClick(e, true)}
                      >
                        <BookOpen className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Documentation</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Documentation</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={restrictedNavButtonClass}
                      asChild
                    >
                      <Link
                        to={isUcMainAdmin ? "/admin/logs" : "#"}
                        onClick={(e) => handleNavClick(e, true)}
                      >
                        <FileText className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Logs</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>Logs</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
            </ul>
          </div>
        </nav>

        {/* User Profile */}
        <div className="rounded-3xl p-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <Avatar className="h-10 w-10 cursor-pointer">
                    <AvatarFallback className="bg-orange-400 font-semibold text-white">
                      {user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("") || userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div>
                  <p className="font-medium">{user?.name || userName}</p>
                  <p className="text-muted-foreground text-xs">
                    {user?.role || userRole}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3 rounded-full border border-gray-200 px-3 py-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-orange-400 font-semibold text-white">
                  {user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("") || userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user?.name || userName}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {user?.role || userRole}
                </p>
              </div>
              <div className="relative" ref={menuRef}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setMenuOpen((s) => !s)}
                  aria-label="More options"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 bottom-full z-50 mb-2 w-40 rounded-md border border-gray-200 bg-white text-black">
                    <button
                      className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm font-medium transition-colors hover:bg-gray-100"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default AdminSidebar;
