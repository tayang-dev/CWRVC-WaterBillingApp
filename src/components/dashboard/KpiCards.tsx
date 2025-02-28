import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Users,
  DollarSign,
  Droplets,
} from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
}

const KpiCard = ({
  title = "Metric",
  value = "0",
  change = "+0%",
  isPositive = true,
  icon = <DollarSign className="h-5 w-5" />,
}: KpiCardProps) => {
  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="rounded-full bg-blue-50 p-2 text-blue-600">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center mt-1">
          {isPositive ? (
            <ArrowUpCircle className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <ArrowDownCircle className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span
            className={`text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}
          >
            {change}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

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

const KpiCards = ({
  totalCustomers = "1,245",
  totalRevenue = "$48,352",
  pendingPayments = "$12,430",
  waterConsumption = "845,210 gal",
  customerGrowth = "+5.2%",
  revenueGrowth = "+10.5%",
  pendingChange = "+2.4%",
  consumptionChange = "-3.1%",
}: KpiCardsProps) => {
  return (
    <div className="w-full bg-white p-4 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Customers"
          value={totalCustomers}
          change={customerGrowth}
          isPositive={true}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          title="Total Revenue"
          value={totalRevenue}
          change={revenueGrowth}
          isPositive={true}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Pending Payments"
          value={pendingPayments}
          change={pendingChange}
          isPositive={false}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Water Consumption"
          value={waterConsumption}
          change={consumptionChange}
          isPositive={false}
          icon={<Droplets className="h-5 w-5" />}
        />
      </div>
    </div>
  );
};

export default KpiCards;
