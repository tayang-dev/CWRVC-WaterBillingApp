import React, { ReactNode } from "react";
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
  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar */}
      <Sidebar className="h-screen fixed left-0 top-0" />

      {/* Main Content */}
      <div className="flex flex-col flex-1 ml-64">
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
