import { Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth";
import type { Campus } from "@/features/auth/types/auth.types";
import { showToast } from "@/utils/alertHelper";

interface ProtectedRouteProps {
  /** Which roles are allowed through. Omit to allow any authenticated user. */
  allowedRoles?: Array<"Admin" | "Student">;
  /** Which campuses are allowed. Only applies to Admins. Omit to allow all. */
  allowedCampuses?: Campus[];
  /** Optional toast shown when blocked by campus restrictions. */
  campusUnauthorizedToastMessage?: string;
  /** Where to redirect unauthenticated users. Defaults to /auth/login. */
  redirectTo?: string;
}

/**
 * Route guard component.
 *
 * - While auth is loading (silent refresh), shows a centered spinner.
 * - Redirects unauthenticated users to the login page.
 * - If `allowedRoles` is set, redirects users whose role isn't in the list.
 * - If `allowedCampuses` is set, redirects admins whose campus isn't in the list.
 * - Otherwise renders `<Outlet />` (child routes).
 */
export default function ProtectedRoute({
  allowedRoles,
  allowedCampuses,
  campusUnauthorizedToastMessage,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [hasShownCampusUnauthorizedToast, setHasShownCampusUnauthorizedToast] =
    useState(false);

  useEffect(() => {
    if (allowedCampuses && user && !allowedCampuses.includes(user.campus)) {
      if (campusUnauthorizedToastMessage && !hasShownCampusUnauthorizedToast) {
        showToast("error", campusUnauthorizedToastMessage);
        const t = setTimeout(() => setHasShownCampusUnauthorizedToast(true), 0);
        return () => clearTimeout(t);
      }
    }
    return;
  }, [
    allowedCampuses,
    user,
    campusUnauthorizedToastMessage,
    hasShownCampusUnauthorizedToast,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User is authenticated but lacks role — send to a safe landing page
    return <Navigate to="/" replace />;
  }

  if (allowedCampuses && user && !allowedCampuses.includes(user.campus)) {
    // User's campus is not allowed, send to a safe dashboard based on role
    const fallback = user.role === "Admin" ? "/admin/events" : "/";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
