import React, { ReactNode, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface AdminLayoutProps {
  children?: ReactNode;
  userName?: string;
  userAvatar?: string;
  unreadNotifications?: number;
}

const AdminLayout = ({
  children,
  userName = "Admin User",
  userAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
  unreadNotifications = 3,
}: AdminLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const mobileTransform = mobileOpen ? "translate-x-0" : "-translate-x-full";
  const sidebarWidth = sidebarCollapsed ? "md:w-20 w-64" : "md:w-64 w-64";

  return (
    // use .app-root helper so index.css rules apply and ensure full-width main content
    <div className="app-root min-h-screen w-full bg-gray-50 grid grid-cols-1 md:grid-cols-[auto_1fr]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar - fixed off-canvas on small screens, participates in grid on md+ */}
      <Sidebar
        className={`z-40 transform transition-transform duration-300 ${mobileTransform} md:translate-x-0 ${sidebarWidth} bg-white dark:bg-slate-900 fixed md:relative left-0 top-0 h-full md:h-auto`}
        collapsed={sidebarCollapsed}
        toggleSidebar={() => {
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            setMobileOpen(false);
          } else {
            setSidebarCollapsed((prev) => !prev);
          }
        }}
      />

      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white/90 dark:bg-slate-800 shadow-sm"
        onClick={handleToggleSidebar}
        aria-label="Toggle menu"
      >
        <svg
          className="w-5 h-5 text-gray-800 dark:text-gray-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Main content sits in second grid column on md+, full width on small */}
      <div className="flex flex-col min-h-screen w-full">
        <Header userName={userName} userAvatar={userAvatar} />

        <main className="flex-1 overflow-auto p-4 w-full">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;