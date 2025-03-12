import React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  CreditCard,
  Clock,
  Droplet,
} from "lucide-react";

interface KpiCardsProps {
  totalCustomers?: string;
  totalRevenue?: string;
  pendingPayments?: string;
  waterConsumption?: string;
  customerGrowth?: string;
  revenueGrowth?: string;
  pendingChange?: string;
  consumptionChange?: string;
}

const KpiCards: React.FC<KpiCardsProps> = ({
  totalCustomers = "1,245",
  totalRevenue = "₱48,352",
  pendingPayments = "₱12,430",
  waterConsumption = "845,210 gal",
  customerGrowth = "+5.2%",
  revenueGrowth = "+10.5%",
  pendingChange = "+2.4%",
  consumptionChange = "-3.1%",
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              Total Customers
            </p>
            <h3 className="text-2xl font-bold text-gray-900">
              {totalCustomers}
            </h3>
          </div>
          <div className="p-2 bg-blue-50 rounded-full">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span
            className={`text-xs font-medium ${customerGrowth.startsWith("+") ? "text-green-600" : "text-red-600"}`}
          >
            {customerGrowth}
          </span>
          {customerGrowth.startsWith("+") ? (
            <ArrowUpRight className="h-3 w-3 text-green-600 ml-1" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-red-600 ml-1" />
          )}
          <span className="text-xs text-gray-500 ml-1.5">from last month</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              Total Revenue
            </p>
            <h3 className="text-2xl font-bold text-gray-900">{totalRevenue}</h3>
          </div>
          <div className="p-2 bg-green-50 rounded-full">
            <CreditCard className="h-6 w-6 text-green-500" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span
            className={`text-xs font-medium ${revenueGrowth.startsWith("+") ? "text-green-600" : "text-red-600"}`}
          >
            {revenueGrowth}
          </span>
          {revenueGrowth.startsWith("+") ? (
            <ArrowUpRight className="h-3 w-3 text-green-600 ml-1" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-red-600 ml-1" />
          )}
          <span className="text-xs text-gray-500 ml-1.5">from last month</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              Pending Payments
            </p>
            <h3 className="text-2xl font-bold text-gray-900">
              {pendingPayments}
            </h3>
          </div>
          <div className="p-2 bg-yellow-50 rounded-full">
            <Clock className="h-6 w-6 text-yellow-500" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span
            className={`text-xs font-medium ${pendingChange.startsWith("+") ? "text-red-600" : "text-green-600"}`}
          >
            {pendingChange}
          </span>
          {pendingChange.startsWith("+") ? (
            <ArrowUpRight className="h-3 w-3 text-red-600 ml-1" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-green-600 ml-1" />
          )}
          <span className="text-xs text-gray-500 ml-1.5">from last month</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              Water Consumption
            </p>
            <h3 className="text-2xl font-bold text-gray-900">
              {waterConsumption}
            </h3>
          </div>
          <div className="p-2 bg-blue-50 rounded-full">
            <Droplet className="h-6 w-6 text-blue-500" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span
            className={`text-xs font-medium ${consumptionChange.startsWith("-") ? "text-green-600" : "text-red-600"}`}
          >
            {consumptionChange}
          </span>
          {consumptionChange.startsWith("-") ? (
            <ArrowDownRight className="h-3 w-3 text-green-600 ml-1" />
          ) : (
            <ArrowUpRight className="h-3 w-3 text-red-600 ml-1" />
          )}
          <span className="text-xs text-gray-500 ml-1.5">from last month</span>
        </div>
      </div>
    </div>
  );
};

export default KpiCards;
