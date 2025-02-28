import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface BillingTrendsChartProps {
  data?: Array<{
    month: string;
    billed: number;
    collected: number;
    outstanding: number;
  }>;
  title?: string;
  description?: string;
}

const defaultData = [
  { month: "Jan", billed: 4000, collected: 3400, outstanding: 600 },
  { month: "Feb", billed: 4200, collected: 3800, outstanding: 400 },
  { month: "Mar", billed: 4500, collected: 4100, outstanding: 400 },
  { month: "Apr", billed: 4800, collected: 4300, outstanding: 500 },
  { month: "May", billed: 5000, collected: 4500, outstanding: 500 },
  { month: "Jun", billed: 5200, collected: 4700, outstanding: 500 },
  { month: "Jul", billed: 5500, collected: 4900, outstanding: 600 },
  { month: "Aug", billed: 5700, collected: 5100, outstanding: 600 },
  { month: "Sep", billed: 6000, collected: 5300, outstanding: 700 },
  { month: "Oct", billed: 6200, collected: 5500, outstanding: 700 },
  { month: "Nov", billed: 6500, collected: 5700, outstanding: 800 },
  { month: "Dec", billed: 6800, collected: 5900, outstanding: 900 },
];

const BillingTrendsChart: React.FC<BillingTrendsChartProps> = ({
  data = defaultData,
  title = "Billing Trends",
  description = "Monthly billing and collection trends",
}) => {
  const [timeRange, setTimeRange] = useState("yearly");
  const [chartType, setChartType] = useState("all");

  // Filter data based on time range
  const filteredData =
    timeRange === "quarterly"
      ? data.slice(-3)
      : timeRange === "half-yearly"
        ? data.slice(-6)
        : data;

  return (
    <Card className="w-full h-full bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            defaultValue={timeRange}
            onValueChange={(value) => setTimeRange(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarterly">Last Quarter</SelectItem>
              <SelectItem value="half-yearly">Last 6 Months</SelectItem>
              <SelectItem value="yearly">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs defaultValue="all" onValueChange={setChartType}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Metrics</TabsTrigger>
            <TabsTrigger value="billed">Billed</TabsTrigger>
            <TabsTrigger value="collected">Collected</TabsTrigger>
            <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="billed"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="collected"
                  stroke="#10b981"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="outstanding"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="billed" className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="billed"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="collected" className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="collected"
                  stroke="#10b981"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="outstanding" className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="outstanding"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BillingTrendsChart;
