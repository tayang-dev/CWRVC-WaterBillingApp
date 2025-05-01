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
  // Add state for sidebar collapsed status
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Function to toggle sidebar
  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar - Add required props */}
      <Sidebar 
        className="h-screen fixed left-0 top-0" 
        collapsed={sidebarCollapsed} 
        toggleSidebar={handleToggleSidebar} 
      />

      {/* Main Content - Adjust margin based on sidebar state */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        {/* Header */}
        <Header
          userName={userName}
          userAvatar={userAvatar}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-auto">{children || <Outlet />}</main>
      </div>
    </div>
  );
};

export default AdminLayout;