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

const WaterLeakagePerSite = ({
  onData,
}: {
  onData: (data: { name: string; value: number; color: string }[]) => void;
}) => {
  const [leakageData, setLeakageData] = useState(getDefaultChartData());

  useEffect(() => {
    const fetchLeakageData = async () => {
      try {
        console.log(`🚀 Fetching leakage data by site`);

        // Fetch all leaks
        const leaksSnapshot = await getDocs(collection(db, "leaks"));

        // Initialize counts
        let siteCounts = { site1: 0, site2: 0, site3: 0 };

        // Count leaks per site
        leaksSnapshot.docs.forEach((doc) => {
          const leak = doc.data();
          const site = leak.address.split(",")[1].trim(); // Extract site from address
          if (siteCounts[site] !== undefined) {
            siteCounts[site] += 1;
          }
        });

        console.log("📊 Leakage site distribution:", siteCounts);

        // If no data is found, use default values
        const totalLeaks = Object.values(siteCounts).reduce(
          (sum, val) => sum + val,
          0
        );
        if (totalLeaks === 0) {
          console.warn("⚠️ No leakage data found, using default values.");
          const defaultData = getDefaultChartData();
          setLeakageData(defaultData);
          onData(defaultData); // Pass default data to the parent component
        } else {
          const chartData = [
            { name: "Site 1", value: siteCounts.site1, color: "#4ade80" },
            { name: "Site 2", value: siteCounts.site2, color: "#facc15" },
            { name: "Site 3", value: siteCounts.site3, color: "#60a5fa" },
          ];
          setLeakageData(chartData);
          onData(chartData); // Pass fetched data to the parent component
        }
      } catch (error) {
        console.error("❌ Error fetching leakage data:", error);
      }
    };

    fetchLeakageData();
  }, [onData]);

  return (
    <Card className="w-full h-full bg-white">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Water Leakage by Site
        </CardTitle>
        <CardDescription>
          Distribution of water leaks across sites
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={leakageData}
              cx="50%"
              cy="50%"
              innerRadius={60} // Makes it a Donut Chart
              outerRadius={100}
              dataKey="value"
              label={({ name, percent, value }) =>
                percent > 0
                  ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  : ""
              }
              labelLine={false}
            >
              {leakageData.map((entry, index) => (
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

// Default chart values in case of no data
const getDefaultChartData = () => [
  { name: "Site 1", value: 1, color: "#4ade80" },
  { name: "Site 2", value: 1, color: "#facc15" },
  { name: "Site 3", value: 1, color: "#60a5fa" },
];

export default WaterLeakagePerSite;