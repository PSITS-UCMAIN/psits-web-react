import { createBrowserRouter, Outlet } from "react-router-dom";
import { AdminHomeRedirect } from "./components/common/AdminHomeRedirect";
import { AdminCampusRouteGuard } from "./components/common/AdminCampusRouteGuard";
import { PublicShopCampusGuard } from "./components/common/PublicShopCampusGuard";
import { AdminRouteGuard } from "./components/common/RouteGuards";
import { StudentCampusRouteGuard } from "./components/common/StudentCampusRouteGuard";
import { AdminLayout } from "./layouts/AdminLayout";
import { MainLayout } from "./layouts/MainLayout";
import StudentLayout from "./layouts/StudentLayout";
import EventManagement from "./pages/admin/EventManagement";
import EventsPage from "./pages/admin/EventsPage";
import EventStatisticsPage from "./pages/admin/EventStatisticsPage";
import EventRafflePage from "./pages/admin/EventRafflePage";
import GeneralAdminPage from "./pages/admin/GeneralAdminPage";
import { MainCampusFinancePage } from "./pages/admin/MainCampusFinancePage";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Login from "./pages/auth/Login";
import OTPCode from "./pages/auth/OtpCode";
import SetNewPassword from "./pages/auth/SetNewPassword";
import { ErrorPage } from "./pages/ErrorPage";
import { Events } from "./pages/events";
import { Resources } from "./pages/home/sections/Resources";
import { Cart } from "./pages/orders/components/Cart";
import { ProductDetailsPage } from "./pages/orders/components/ProductDetails";
import { Shop } from "./pages/orders/components/Shop";
import { Organizations } from "./pages/organizations";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import AccountSettings from "./pages/student/AccountSettings";
import EventAttendance from "./pages/student/EventAttendance";
import MyOrders from "./pages/student/MyOrders";
import CertificatesPage from "./pages/CertificatesPage";
import { TermsOfCondition } from "./pages/TermsOfCondition";
import { UnderConstruction } from "./pages/UnderConstruction";

const router = createBrowserRouter([
  {
    path: "/",
    Component: Outlet,
    ErrorBoundary: ErrorPage,
    children: [
      // Public / Student / Landing Routes
      {
        Component: MainLayout,
        children: [
          { index: true, Component: AdminHomeRedirect },
          { path: "events", Component: Events },
          { path: "organizations", Component: Organizations },
          { path: "resources", Component: Resources },
          {
            Component: PublicShopCampusGuard,
            children: [
              { path: "shop", Component: Shop },
              { path: "shop/:id", Component: ProductDetailsPage },
              { path: "cart", Component: Cart },
            ],
          },
          {
            path: "student",
            Component: StudentLayout,
            children: [
              { index: true, Component: AccountSettings },
              { path: "event-attendance", Component: EventAttendance },
              { path: "account-settings", Component: AccountSettings },
              { path: "certificates", Component: CertificatesPage },
              {
                element: (
                  <StudentCampusRouteGuard allowedCampuses={["UC-Main"]} />
                ),
                children: [{ path: "my-orders", Component: MyOrders }],
              },
            ],
          },
        ],
      },
      // Static Pages (No Header/Footer)
      { path: "privacy", Component: PrivacyPolicy },
      { path: "terms", Component: TermsOfCondition },
      // Authentication Routes
      {
        path: "auth",
        children: [
          { path: "login", Component: Login },
          { path: "signup", Component: UnderConstruction },
          { path: "forgot-password", Component: ForgotPassword },
          { path: "otp", Component: OTPCode },
          { path: "reset-password", Component: SetNewPassword },
        ],
      },
      // Admin Routes
      {
        path: "admin",
        Component: AdminRouteGuard,
        children: [
          {
            path: "under-construction",
            Component: UnderConstruction,
          },
          {
            Component: AdminLayout,
            children: [
              // { path: "dashboard", Component: Dashboard },
              { path: "events", Component: EventsPage },
              { path: "events/:eventId", Component: EventManagement },
              {
                path: "events/:eventId/statistics",
                Component: EventStatisticsPage,
              },
              {
                element: (
                  <AdminCampusRouteGuard
                    allowedCampuses={["UC-Main"]}
                    campusUnauthorizedToastMessage="Unauthorized"
                  />
                ),
                children: [
                  {
                    path: "events/:eventId/raffle",
                    Component: EventRafflePage,
                  },
                ],
              },
              // TODO: Remove this sample
              // Example of a general admin page with campus-specific component
              { path: "general", Component: GeneralAdminPage },
            ],
          },
          // TODO: Remove this sample
          // Example of a campus-specific route
          {
            path: "finances",
            element: <AdminCampusRouteGuard allowedCampuses={["UC-Main"]} />,
            children: [{ index: true, Component: MainCampusFinancePage }],
          },
        ],
      },
    ],
  },
]);

export default router;
