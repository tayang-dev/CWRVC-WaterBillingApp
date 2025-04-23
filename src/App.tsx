import { Suspense, lazy } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import routes from "tempo-routes";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleBasedRoute from "./components/RoleBasedRoute";
import AdminLayout from "./components/layout/AdminLayout";
import PaymentManagement from "./components/payment/PaymentMangement";
import CustomerSupport from "./components/chat/CustomerSupport";
import UserManagement from "./components/users/UserManagement";
import SettingsPage from "./components/settings/SettingPage";
import MeterReading from "./components/meters/meterReading";
import ViewBills from "./components/bills/bill"; // Moved import to top
import Feedback from "./components/feedbacks/Feedbacks"; // Import Feedback component

// Lazy load components for better performance
const Dashboard = lazy(() => import("./components/dashboard/Dashboard"));
const AccountsManagement = lazy(
  () => import("./components/accounts/AccountsManagement")
);
const CustomerService = lazy(
  () => import("./components/customer-service/CustomerService")
);
const RequestsPage = lazy(() => import("./components/requests/Requests"));
const ReportsPage = lazy(() => import("./components/reports/Reports"));
const MeterReadingPage = lazy(() => import("./components/meters/meterReading"));
const Bill = lazy(() => import("./components/bills/bill"));

function App() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          Loading...
        </div>
      }
    >
      <>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/accounts"
            element={
              <RoleBasedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AccountsManagement />
                </AdminLayout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <PaymentManagement />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/customer-support"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <CustomerSupport />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <RoleBasedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <UserManagement />
                </AdminLayout>
              </RoleBasedRoute>
            }
          />

          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <RequestsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <ReportsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <SettingsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Meter Reading route for staff */}
          <Route
          path="/meters"
          element={
            <RoleBasedRoute allowedRoles={["meter_reader"]}> {/* Restrict to Meter Reader */}
              <AdminLayout>
                <MeterReading />
              </AdminLayout>
            </RoleBasedRoute>
          }
        />

          {/* Bills routes */}
          <Route
            path="/bills"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Bill />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Feedback />
                </AdminLayout>
              </ProtectedRoute>
            }
           />
      

          {/* View Individual Bill route */}
          <Route
            path="/view-bills/:accountNumber/:billId"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <ViewBills />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* For Tempo routes */}
          {import.meta.env.VITE_TEMPO === "true" && (
            <Route path="/tempobook/*" />
          )}
        </Routes>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      </>
    </Suspense>
  );
}

export default App;