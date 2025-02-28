import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  isActive?: boolean;
  hasSubItems?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
  subItems?: Array<{ label: string; path: string }>;
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
}: SidebarItemProps) => {
  return (
    <div className="mb-1">
      {hasSubItems ? (
        <Collapsible open={isOpen} onOpenChange={onClick}>
          <CollapsibleTrigger className="w-full">
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
              )}
            >
              <div className="flex items-center">
                <span className="mr-3">{icon}</span>
                <span className="font-medium">{label}</span>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pl-10 mt-1 space-y-1">
              {subItems.map((item, index) => (
                <Link to={item.path} key={index}>
                  <div
                    className={cn(
                      "px-3 py-2 rounded-md text-sm transition-colors",
                      path === item.path
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-blue-50 hover:text-blue-600",
                    )}
                  >
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <Link to={path}>
          <div
            className={cn(
              "flex items-center px-3 py-2 rounded-md transition-colors",
              isActive
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
            )}
          >
            <span className="mr-3">{icon}</span>
            <span className="font-medium">{label}</span>
          </div>
        </Link>
      )}
    </div>
  );
};

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className = "" }: SidebarProps) => {
  const location = useLocation();
  const [openSection, setOpenSection] = useState<string | null>("accounts");

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div
      className={cn(
        "w-64 h-full bg-white border-r border-gray-200 flex flex-col",
        className,
      )}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Droplets className="h-8 w-8 text-blue-600 mr-2" />
          <h1 className="text-xl font-bold text-blue-800">Water Billing</h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">Admin Portal</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <SidebarItem
          icon={<LayoutDashboard className="h-5 w-5" />}
          label="Dashboard"
          path="/dashboard"
          isActive={location.pathname === "/dashboard"}
        />

        <SidebarItem
          icon={<Users className="h-5 w-5" />}
          label="Accounts Management"
          path="/accounts"
          isActive={location.pathname.startsWith("/accounts")}
          hasSubItems={true}
          isOpen={openSection === "accounts"}
          onClick={() => toggleSection("accounts")}
          subItems={[
            { label: "All Accounts", path: "/accounts" },
            { label: "Add New Account", path: "/accounts/new" },
            { label: "Billing History", path: "/accounts/billing" },
            { label: "Payment Records", path: "/accounts/payments" },
          ]}
        />

        <SidebarItem
          icon={<MessageSquare className="h-5 w-5" />}
          label="Customer Service"
          path="/customer-service"
          isActive={location.pathname.startsWith("/customer-service")}
          hasSubItems={true}
          isOpen={openSection === "customer-service"}
          onClick={() => toggleSection("customer-service")}
          subItems={[
            { label: "Support Tickets", path: "/customer-service/tickets" },
            { label: "New Ticket", path: "/customer-service/tickets/new" },
            { label: "Knowledge Base", path: "/customer-service/knowledge" },
          ]}
        />

        <SidebarItem
          icon={<Settings className="h-5 w-5" />}
          label="Settings"
          path="/settings"
          isActive={location.pathname === "/settings"}
        />
      </div>

      <div className="p-3 border-t border-gray-200">
        <Button
          variant="outline"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => {
            const { signOut } = require("firebase/auth");
            const { auth } = require("../../../lib/firebase");
            signOut(auth).then(() => {
              window.location.href = "/";
            });
          }}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
