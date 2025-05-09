import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  CreditCard,
  BarChart,
  ClipboardList,
  Menu,
  ArrowLeft,
  MessageCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import logo from "../../assets/logo.png";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  isActive?: boolean;
  hasSubItems?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
  subItems?: Array<{ label: string; path: string }>;
  collapsed: boolean;
}

const SidebarItem = ({
  icon = <LayoutDashboard className="h-5 w-5" />,
  label = "Menu Item",
  path = "/",
  isActive = false,
  hasSubItems = false,
  isOpen = false,
  onClick = () => {},
  subItems = [],
  collapsed,
}: SidebarItemProps) => {
  const baseClasses = "flex items-center px-3 py-2 rounded-md transition-colors";
  const activeClasses = "bg-blue-100 text-blue-700";
  const inactiveClasses = "text-gray-700 hover:bg-blue-50 hover:text-blue-600";

  const content = (
    <div className={cn(baseClasses, isActive ? activeClasses : inactiveClasses)}>
      <span className="mr-3">{icon}</span>
      {!collapsed && <span className="font-medium">{label}</span>}
    </div>
  );

  if (hasSubItems) {
    return (
      <div className="mb-1">
        <Collapsible open={isOpen} onOpenChange={onClick}>
          <CollapsibleTrigger className="w-full">{content}</CollapsibleTrigger>
          {!collapsed && (
            <CollapsibleContent>
              <div className="pl-10 mt-1 space-y-1">
                {subItems.map((item, index) => (
                  <Link to={item.path} key={index}>
                    <div
                      className={cn(
                        "px-3 py-2 rounded-md text-sm transition-colors",
                        path === item.path
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                      )}
                    >
                      {item.label}
                    </div>
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <Link to={path}>{content}</Link>
    </div>
  );
};

interface SidebarProps {
  className?: string;
  collapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ className = "", collapsed, toggleSidebar }: SidebarProps) => {
  const location = useLocation();
  const [openSection, setOpenSection] = useState<string | null>("accounts");
  const { userRole } = useAuth();

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (confirmLogout) {
      try {
        const { signOut } = await import("firebase/auth");
        const { auth } = await import("../../lib/firebase");
        await signOut(auth);
        window.location.href = "/";
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  };

  return (
    <div
      className={cn(
        collapsed ? "w-20" : "w-64",
        "h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <img
            src={logo}
            alt="CWRVC Logo"
            className="h-10 w-10 object-contain mr-2"
          />
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-blue-800">
                CWRVC - Water Billing App
              </h1>
              <p className="text-xs text-gray-500">
                {userRole === "admin"
                  ? "Admin Portal"
                  : userRole === "meter_reader"
                  ? "Meter Reader Portal"
                  : "Cashier Portal"}
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="p-1"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Dashboard should be visible for all roles */}
        <SidebarItem
          icon={<LayoutDashboard className="h-5 w-5" />}
          label="Dashboard"
          path="/dashboard"
          isActive={location.pathname === "/dashboard"}
          collapsed={collapsed}
        />

        {userRole === "admin" && (
          <>
            <SidebarItem
              icon={<Users className="h-5 w-5" />}
              label="Accounts"
              path="#"
              hasSubItems
              isOpen={openSection === "accounts" || location.pathname.startsWith("/staff-management")}
              onClick={() => toggleSection("accounts")}
              isActive={
                location.pathname.startsWith("/accounts") ||
                location.pathname.startsWith("/staff-management")
              }
              subItems={[
                { label: "Customer Management", path: "/accounts" },
                { label: "Staff Management", path: "/staff-management" },
              ]}
              collapsed={collapsed}
            />
            
            {/* Payment Management and Bills */}
            <SidebarItem
              icon={<CreditCard className="h-5 w-5" />}
              label="Payment Management"
              path="/payments"
              isActive={location.pathname.startsWith("/payments")}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={<FileText className="h-5 w-5" />}
              label="Bills"
              path="/bills"
              isActive={location.pathname.startsWith("/bills")}
              collapsed={collapsed}
            />
            
            <SidebarItem
              icon={<MessageSquare className="h-5 w-5" />}
              label="Customer Service"
              path="/customer-support"
              isActive={location.pathname.startsWith("/customer-support")}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={<ClipboardList className="h-5 w-5" />}
              label="Service Requests"
              path="/requests"
              isActive={location.pathname.startsWith("/requests")}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={<BarChart className="h-5 w-5" />}
              label="Leaks"
              path="/reports"
              isActive={location.pathname.startsWith("/reports")}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={<MessageCircle className="h-5 w-5" />}
              label="Feedback"
              path="/feedback"
              isActive={location.pathname.startsWith("/feedback")}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={<Settings className="h-5 w-5" />}
              label="Settings"
              path="/settings"
              isActive={location.pathname === "/settings"}
              collapsed={collapsed}
            />
          </>
        )}

        {userRole === "meter_reader" && (
          <SidebarItem
            icon={<ClipboardList className="h-5 w-5" />}
            label="Meter Reading"
            path="/meters"
            isActive={location.pathname.startsWith("/meters")}
            collapsed={collapsed}
          />
        )}

        {userRole === "staff" && (
          <>
            <SidebarItem
              icon={<CreditCard className="h-5 w-5" />}
              label="Payment Management"
              path="/payments"
              isActive={location.pathname.startsWith("/payments")}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={<FileText className="h-5 w-5" />}
              label="Bills"
              path="/bills"
              isActive={location.pathname.startsWith("/bills")}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={<MessageSquare className="h-5 w-5" />}
              label="Customer Service"
              path="/customer-support"
              isActive={location.pathname.startsWith("/customer-support")}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={<ClipboardList className="h-5 w-5" />}
              label="Service Requests"
              path="/requests"
              isActive={location.pathname.startsWith("/requests")}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={<BarChart className="h-5 w-5" />}
              label="Leaks"
              path="/reports"
              isActive={location.pathname.startsWith("/reports")}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={<Settings className="h-5 w-5" />}
              label="Settings"
              path="/settings"
              isActive={location.pathname === "/settings"}
              collapsed={collapsed}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <Button
          variant="outline"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          {!collapsed && "Logout"}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;