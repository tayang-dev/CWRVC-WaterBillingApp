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
import BillingHistory from "./components/accounts/BillingHistory";

// Lazy load components for better performance
const Dashboard = lazy(() => import("./components/dashboard/Dashboard"));
const AccountsManagement = lazy(
  () => import("./components/accounts/AccountsManagement"),
);
const CustomerService = lazy(
  () => import("./components/customer-service/CustomerService"),
);

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

          {/* Billing history route removed as requested */}
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
            path="/settings"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <SettingsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Add more routes as needed */}

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
