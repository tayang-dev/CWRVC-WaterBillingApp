import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const BillingTrendsChart = ({
  onData,
}: {
  onData: (data: { name: string; value: number; color: string }[]) => void;
}) => {
  const [customerData, setCustomerData] = useState(getDefaultChartData());

  useEffect(() => {
    const fetchCustomerPopulation = async () => {
      try {
        console.log(`🚀 Fetching customer population by site`);

        // Fetch all customers
        const customersSnapshot = await getDocs(collection(db, "customers"));

        // Initialize counts
        let siteCounts = { site1: 0, site2: 0, site3: 0 };

        // Count customers per site
        customersSnapshot.docs.forEach((doc) => {
          const site = doc.data().site;
          if (siteCounts[site] !== undefined) {
            siteCounts[site] += 1;
          }
        });

        console.log("📊 Customer site distribution:", siteCounts);

        // If no data is found, use default values
        const totalCustomers = Object.values(siteCounts).reduce(
          (sum, val) => sum + val,
          0
        );
        if (totalCustomers === 0) {
          console.warn("⚠️ No customer data found, using default values.");
          const defaultData = getDefaultChartData();
          setCustomerData(defaultData);
          onData(defaultData); // Pass default data to the parent component
        } else {
          const chartData = [
            { name: "Site 1", value: siteCounts.site1, color: "#4ade80" },
            { name: "Site 2", value: siteCounts.site2, color: "#facc15" },
            { name: "Site 3", value: siteCounts.site3, color: "#60a5fa" },
          ];
          setCustomerData(chartData);
          onData(chartData); // Pass fetched data to the parent component
        }
      } catch (error) {
        console.error("❌ Error fetching customer data:", error);
      }
    };

    fetchCustomerPopulation();
  }, [onData]);

  return (
    <Card className="w-full h-full bg-white">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Customer Population by Site
        </CardTitle>
        <CardDescription>
          Distribution of registered customers across sites
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={customerData}
              cx="50%"
              cy="50%"
              innerRadius={60} // 🔹 Makes it a Donut Chart
              outerRadius={100}
              dataKey="value"
              label={({ name, percent, value }) =>
                percent > 0
                  ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  : ""
              }
              labelLine={false}
            >
              {customerData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 🔹 Default chart values in case of no data
const getDefaultChartData = () => [
  { name: "Site 1", value: 1, color: "#4ade80" },
  { name: "Site 2", value: 1, color: "#facc15" },
  { name: "Site 3", value: 1, color: "#60a5fa" },
];

export default BillingTrendsChart;
