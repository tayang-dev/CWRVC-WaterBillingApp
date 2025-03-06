import { Suspense, lazy } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import routes from "tempo-routes";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/layout/AdminLayout";
import PaymentManagement from "./components/payment/PaymentMangement";

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
              <ProtectedRoute>
                <AdminLayout>
                  <AccountsManagement />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts/new"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AccountsManagement initialView="list" />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts/billing"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AccountsManagement />
                </AdminLayout>
              </ProtectedRoute>
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
            path="/customer-service"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <CustomerService />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer-service/tickets"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <CustomerService />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer-service/tickets/new"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <CustomerService />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer-service/knowledge"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <CustomerService />
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
