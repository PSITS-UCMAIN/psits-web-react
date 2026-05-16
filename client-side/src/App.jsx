import React from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { DarkModeProvider } from "./contexts/DarkModeContext";

import AdminLayout from "./components/layout/AdminLayout";
import LandingLayout from "./components/layout/LandingLayout";

import Explore from "./pages/Explore";
import Home from "./pages/Home";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRegister from "./pages/admin/AdminRegister";
import Delete from "./pages/admin/Delete";
import EditProduct from "./pages/admin/EditProduct";
import Attendance from "./pages/admin/Attendance/Attendance";
import Inventory from "./pages/admin/Inventory";
import MembershipHistory from "./pages/admin/MembershipHistory";
import MembershipRequest from "./pages/admin/MembershipRequest";
import Merchandise from "./pages/admin/Merchandise";
import Officers from "./pages/admin/Officers";
import AllOfficers from "./pages/admin/officers/AllOfficers";
import Request from "./pages/admin/officers/Request";
import RefundDashboard from "./pages/admin/Refund/RefundDashboard";
import ViewRefund from "./pages/admin/Refund/ViewRefund";

import Raffle from "./pages/admin/events/EventRaffle";
import RaffleTwo from './pages/admin/events/EventRaffleTwo'
import AddAttendeeForm from "./pages/admin/Attendance/AddAttendeeForm";
import AdminEvents from "./pages/admin/events/Events";

import Suspend from "./pages/admin/officers/Suspend";
import Orders from "./pages/admin/Orders";
import Product from "./pages/admin/Product";
import Renewal from "./pages/admin/Renewal";
import Reports from "./pages/admin/Reports";
import Resources from "./pages/admin/Resources";
import Students from "./pages/admin/Students";
import Settings from "./pages/admin/Settings";
import AdminAccountRequest from "./pages/admin/officers/AdminAccountRequest";
import Members from "./pages/admin/officers/Members";

import Login from "./pages/authentication/Login";
import Register from "./pages/authentication/Register";

import PrivateRouteAdmin from "./authentication/privateRouteAdmin";
import NotFound from "./components/common/NotFound";
import Profile from "./pages/admin/Profile";
import DocsHome from "./pages/docs/DocsHome";
import ApiEndpoints from "./pages/docs/ApiEndpoints";
import Features from "./pages/docs/Features";
import PrivateRouteStudent from "./authentication/privateRouteStudent";
import StudentLayout from "./components/layout/StudentLayout";
import AllMembers from "./pages/admin/membership/AllMembers";
import Statistics from "./pages/admin/Statistics";
import EmailVerification from "./pages/authentication/EmailVerification";
import ForgotPassword from "./pages/authentication/ForgotPassword";
import OTPVerifier from "./pages/authentication/OtpVerifier";
import ResetPassword from "./pages/authentication/ResetPassword";
import ProductDetail from "./pages/students/ProductDetail";
import StudentCart from "./pages/students/StudentCart";
import StudentDashboard from "./pages/students/StudentDashboard";
import StudentEvents from "./pages/students/StudentEvents";
import StudentHistory from "./pages/students/StudentHistory";
import StudentMerchandise from "./pages/students/StudentMerchandise";
import StudentOrders from "./pages/students/StudentOrders";

import Logs from "./pages/admin/Logs";
import Community from "./pages/Community";
import Events from "./pages/Events";
import DocumentationManagement from "./pages/admin/documentation/DocumentationManagement";
import EligibleCertificates from "./pages/admin/EligibleCertificates";

import StudentPaidOrders from "./pages/students/orders/PaidOrders";
import StudentPendingOrder from "./pages/students/orders/PendingOrders";
import Resouces from "./pages/students/Resouces";
import MarkAsPresent from "./pages/admin/MarkAsPresent";
import { QRCodeScanner } from "./pages/admin/QRCodeScanner";

//Promo Code
import PromoDashboard from "./pages/admin/PromoCode/PromoDashboard";


const App = () => {
  return (
    <DarkModeProvider>
      <Router>
        <Routes>
        <Route path="/" element={<LandingLayout />}>
          <Route index element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/event" element={<Events />} />
          <Route path="/community" element={<Community />} />
          <Route path="/admin-register" element={<AdminRegister />} />
        </Route>
        
        {/* Protected docs routes - requires admin authentication with login modal */}
        <Route path="/docs" element={<PrivateRouteAdmin element={DocsHome} />} />
        <Route path="/docs/api" element={<PrivateRouteAdmin element={ApiEndpoints} />} />
        <Route path="/docs/features" element={<PrivateRouteAdmin element={Features} />} />
        <Route
          path="/admin/"
          element={<PrivateRouteAdmin element={AdminLayout} />}
        >
          <Route
            path="dashboard"
            element={<PrivateRouteAdmin element={AdminDashboard} />}
          />
          <Route
            path="officers/"
            element={<PrivateRouteAdmin element={Officers} />}
          >
            <Route
              index
              element={<PrivateRouteAdmin element={AllOfficers} />}
            />
            <Route
              path="suspend"
              element={<PrivateRouteAdmin element={Suspend} />}
            />

            <Route
              path="members"
              element={<PrivateRouteAdmin element={Members} />}
            />

            <Route
              path="request"
              element={<PrivateRouteAdmin element={Request} />}
            />
            <Route
              path="admin-request"
              element={<PrivateRouteAdmin element={AdminAccountRequest} />}
            />
          </Route>
          <Route
            path="events/"
            element={<PrivateRouteAdmin element={AdminEvents} />}
          />
          <Route
            path="certificates"
            element={<PrivateRouteAdmin element={EligibleCertificates} />}
          />
          <Route
            path="attendance/:eventId"
            element={<PrivateRouteAdmin element={Attendance} />}
          />
          <Route
            path="attendance/:eventId/:eventName/markAsPresent/:attendeeId/:attendeeName"
            element={<PrivateRouteAdmin element={MarkAsPresent} />}
          />
          <Route
            path="qrCodeScanner"
            element={<PrivateRouteAdmin element={QRCodeScanner} />}
          />
          <Route
            path="raffle/:eventId"
            element={<PrivateRouteAdmin element={RaffleTwo} />}
          />

          <Route
            path="statistics/:eventId"
            element={<PrivateRouteAdmin element={Statistics} />}
          />
          <Route
            path="addAttendee/:eventId"
            element={<PrivateRouteAdmin element={AddAttendeeForm} />}
          />

          <Route
            path="register"
            element={<PrivateRouteAdmin element={AdminRegister} />}
          />

          <Route
            path="students/"
            element={<PrivateRouteAdmin element={Students} />}
          >
            <Route index element={<PrivateRouteAdmin element={AllMembers} />} />
            <Route
              path="request"
              element={<PrivateRouteAdmin element={MembershipRequest} />}
            />

            <Route
              path="renewal"
              element={<PrivateRouteAdmin element={Renewal} />}
            />
            <Route
              path="delete"
              element={<PrivateRouteAdmin element={Delete} />}
            />
            <Route
              path="history"
              element={<PrivateRouteAdmin element={MembershipHistory} />}
            />
          </Route>
          <Route
            path="merchandise/"
            element={<PrivateRouteAdmin element={Merchandise} />}
          >
            <Route
              path="product"
              element={<PrivateRouteAdmin element={Product} />}
            >
              <Route
                path="edit"
                element={<PrivateRouteAdmin element={EditProduct} />}
              />
            </Route>
          </Route>
          <Route
            path="inventory"
            element={<PrivateRouteAdmin element={Inventory} />}
          />
          <Route
            path="orders"
            element={<PrivateRouteAdmin element={Orders} />}
            ></Route>
            <Route
            path="refund"
            element={<PrivateRouteAdmin element={RefundDashboard} />}
            >
           

             
            </Route>
               <Route path="refund/view"
            element={<PrivateRouteAdmin element={ViewRefund} />}/> 
          <Route
            path="reports"
            element={<PrivateRouteAdmin element={Reports} />}
          />
          <Route
            path="documentation"
            element={<PrivateRouteAdmin element={DocumentationManagement} />}
          />
          <Route
            path="resources"
            element={<PrivateRouteAdmin element={Resources} />}
          />
          <Route
            path="settings"
            element={<PrivateRouteAdmin element={Settings} />}
          />
          <Route
            path="profile"
            element={<PrivateRouteAdmin element={Profile} />}
          ></Route>

          <Route path="logs" element={<PrivateRouteAdmin element={Logs} />} />
          <Route
            path="promo-dashboard"
            element={<PrivateRouteAdmin element={PromoDashboard} />}
          />
        </Route>

        <Route
          path="/student/"
          element={<PrivateRouteStudent element={StudentLayout} />}
        >
          <Route
            path="cart"
            element={<PrivateRouteStudent element={StudentCart} />}
          />
          <Route
            path="events"
            element={<PrivateRouteStudent element={StudentEvents} />}
          />
          {/* <Route
            path="QR"
            element={<PrivateRouteStudent element={QRCodePage} />}
          /> */}
          <Route
            path="dashboard"
            element={<PrivateRouteStudent element={StudentDashboard} />}
          ></Route>
          <Route
            path="history"
            element={<PrivateRouteStudent element={StudentHistory} />}
          />
          <Route
            path="resources"
            element={<PrivateRouteStudent element={Resouces} />}
          />
          <Route
            path="shop"
            element={<PrivateRouteStudent element={StudentHistory} />}
          />
          <Route
            path="merchandise"
            element={<PrivateRouteStudent element={StudentMerchandise} />}
          />

          <Route
            path="merchandise/:id"
            element={<PrivateRouteStudent element={ProductDetail} />}
          />

          <Route
            path="orders"
            element={<PrivateRouteStudent element={StudentOrders} />}
          >
            <Route
              index
              element={<PrivateRouteStudent element={StudentPendingOrder} />}
            />
            <Route
              path="paid"
              element={<PrivateRouteStudent element={StudentPaidOrders} />}
            />
          </Route>

          <Route path="resources" />
          <Route
            path="settings"
            element={<PrivateRouteStudent element={Settings} />}
          />

          <Route
            path="profile"
            element={<PrivateRouteStudent element={Profile} />}
          ></Route>
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/email-verification/:email"
          element={<EmailVerification />}
        />
        <Route path="/otp-verify" element={<OTPVerifier />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
    <ToastContainer
      position="top-right"
      autoClose={2000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
    />
    </DarkModeProvider>
  );
};

export default App;
