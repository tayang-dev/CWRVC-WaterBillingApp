import React from "react";
import {
  Users,
  CreditCard,
  Clock,
  Droplet,
} from "lucide-react";

interface KpiProps {
  totalCustomers: string;
  totalRevenue: string;
  pendingPayments: string;
  waterConsumption: string;
  // Growth percentages removed from interface
}

const KpiCards: React.FC<KpiProps> = ({
  totalCustomers,
  totalRevenue,
  pendingPayments,
  waterConsumption,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Customers */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Customers</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalCustomers}</h3>
            {/* Growth percentage removed */}
          </div>
          <div className="p-2 bg-blue-50 rounded-full">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalRevenue}</h3>
            {/* Growth percentage removed */}
          </div>
          <div className="p-2 bg-green-50 rounded-full">
            <CreditCard className="h-6 w-6 text-green-500" />
          </div>
        </div>
      </div>

      {/* Pending Payments */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Pending Payments</p>
            <h3 className="text-2xl font-bold text-gray-900">{pendingPayments}</h3>
            {/* Growth percentage removed */}
          </div>
          <div className="p-2 bg-yellow-50 rounded-full">
            <Clock className="h-6 w-6 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Water Consumption */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Water Consumption</p>
            <h3 className="text-2xl font-bold text-gray-900">{waterConsumption}</h3>
            {/* Growth percentage removed */}
          </div>
          <div className="p-2 bg-blue-50 rounded-full">
            <Droplet className="h-6 w-6 text-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiCards;