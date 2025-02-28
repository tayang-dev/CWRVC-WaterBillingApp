import React from "react";
import KpiCards from "./KpiCards";
import BillingTrendsChart from "./BillingTrendsChart";
import PaymentStatusChart from "./PaymentStatusChart";

interface DashboardProps {
  title?: string;
  subtitle?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  title = "Water Billing Dashboard",
  subtitle = "Overview of billing metrics and customer data",
}) => {
  return (
    <div className="w-full h-full p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="text-gray-500">{subtitle}</p>
      </div>

      <div className="mb-6">
        <KpiCards
          totalCustomers="1,245"
          totalRevenue="$48,352"
          pendingPayments="$12,430"
          waterConsumption="845,210 gal"
          customerGrowth="+5.2%"
          revenueGrowth="+10.5%"
          pendingChange="+2.4%"
          consumptionChange="-3.1%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <BillingTrendsChart
            title="Billing Trends"
            description="Monthly billing and collection trends"
          />
        </div>
        <div>
          <PaymentStatusChart
            title="Payment Status Distribution"
            description="Overview of customer payment statuses"
          />
        </div>
      </div>

      <div className="mt-6 p-6 bg-white rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[
            {
              id: 1,
              action: "New customer registered",
              time: "Today, 10:30 AM",
              user: "System",
            },
            {
              id: 2,
              action: "Payment received",
              time: "Today, 09:15 AM",
              user: "John Smith",
            },
            {
              id: 3,
              action: "Bill generated",
              time: "Yesterday, 03:45 PM",
              user: "Admin",
            },
            {
              id: 4,
              action: "Support ticket resolved",
              time: "Yesterday, 01:20 PM",
              user: "Support Agent",
            },
            {
              id: 5,
              action: "System maintenance completed",
              time: "Jul 15, 2023",
              user: "System Admin",
            },
          ].map((activity) => (
            <div
              key={activity.id}
              className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-md"
            >
              <div>
                <p className="font-medium">{activity.action}</p>
                <p className="text-sm text-gray-500">{activity.time}</p>
              </div>
              <div className="text-sm text-gray-600">{activity.user}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
