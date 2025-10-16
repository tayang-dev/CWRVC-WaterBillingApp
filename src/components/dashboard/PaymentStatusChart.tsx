import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

// Define the Bill interface
interface Bill {
  id: string;
  amount: number;
  originalAmount: number;
  dueDate: string; // Assuming dueDate is a string in "DD/MM/YYYY" format
  status?: string; // <-- Add this line

}

const PaymentStatusChart = ({
  onData,
  selectedMonth,
  selectedYear,
}: {
  onData: (data: { name: string; value: number; color: string }[]) => void;
  selectedMonth: string;
  selectedYear: string;
}) => {
  const [selectedSite, setSelectedSite] = useState("All");
  const [chartData, setChartData] = useState(getDefaultChartData());

  useEffect(() => {
    const fetchPaymentsBySite = async () => {
      try {
        console.log(`🚀 Fetching customers for site: ${selectedSite}`);

        let customersSnapshot;
        if (selectedSite === "All") {
          customersSnapshot = await getDocs(collection(db, "customers"));
        } else {
          const customersQuery = query(
            collection(db, "customers"),
            where("site", "==", selectedSite)
          );
          customersSnapshot = await getDocs(customersQuery);
        }

        const customers = customersSnapshot.docs.map((doc) => ({
          id: doc.id,
          accountNumber: doc.data().accountNumber,
        }));

        console.log(
          `👥 Found ${customers.length} customers in ${selectedSite}:`,
          customers
        );

        if (customers.length === 0) {
          console.warn(`⚠️ No customers found in ${selectedSite}`);
          const defaultData = getDefaultChartData();
          setChartData(defaultData);
          onData(defaultData); // Pass default data to the parent component
          return;
        }

        let paymentStatusCounts = {
          Paid: 0,
          Pending: 0,
          Overdue: 0,
          "Partially Paid": 0,
        };

        // Fetch all bills concurrently
        const billFetchPromises = customers.map((customer) => {
          const recordsQuery = collection(
            db,
            "bills",
            customer.accountNumber,
            "records"
          );
          return getDocs(recordsQuery).then((recordsSnapshot) => {
            return recordsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...(doc.data() as Bill), // Type assertion here
            }));
          });
        });

        // Wait for all bill fetch promises to resolve
        const allBills = await Promise.all(billFetchPromises);

        // Flatten the array of bills
        const bills = allBills.flat();

        console.log(`📦 Found ${bills.length} total bills for all customers`);

        // Process each bill
        bills.forEach((bill) => {
          // Filter by date
          if (bill.dueDate) {
            // Assume dueDate is "DD/MM/YYYY"
            const [day, month, year] = bill.dueDate.split("/");
            const matchesMonth = selectedMonth === "All" || selectedMonth === month.padStart(2, "0");
            const matchesYear = selectedYear === "All" || selectedYear === year;
            if (!(matchesMonth && matchesYear)) return;
          }
          // Use the status field directly for accurate counting
          const status = (bill.status || "").toLowerCase();
          switch (status) {
            case "paid":
              paymentStatusCounts.Paid += 1;
              break;
            case "pending":
              paymentStatusCounts.Pending += 1;
              break;
            case "overdue":
              paymentStatusCounts.Overdue += 1;
              break;
            case "partially paid":
              paymentStatusCounts["Partially Paid"] += 1;
              break;
            default:
              paymentStatusCounts.Pending += 1; // fallback if status is missing
              break;
          }
        });

        console.log("📊 Payment status counts:", paymentStatusCounts);

        const totalBills = Object.values(paymentStatusCounts).reduce(
          (sum, val) => sum + val,
          0
        );

        if (totalBills === 0) {
          console.warn(
            `⚠️ No billing data found for ${selectedSite}, showing default values.`
          );
          const defaultData = getDefaultChartData();
          setChartData(defaultData);
          onData(defaultData); // Pass default data to the parent component
        } else {
          const chartData = [
            { name: "Paid", value: paymentStatusCounts.Paid, color: "#4ade80" },
            {
              name: "Pending",
              value: paymentStatusCounts.Pending,
              color: "#facc15",
            },
            {
              name: "Overdue",
              value: paymentStatusCounts.Overdue,
              color: "#f87171",
            },
            {
              name: "Partially Paid",
              value: paymentStatusCounts["Partially Paid"],
              color: "#60a5fa",
            },
          ];
          setChartData(chartData);
          onData(chartData); // Pass fetched data to the parent component
        }
      } catch (error) {
        console.error("❌ Error fetching payment data:", error);
      }
    };

    fetchPaymentsBySite();
  }, [selectedSite, onData, selectedMonth, selectedYear]);

  return (
    <Card className="w-full h-full bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              Payment Status by Site
            </CardTitle>
            <CardDescription>View payments status for each site</CardDescription>
          </div>
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Sites</SelectItem>
              <SelectItem value="site1">Site 1</SelectItem>
              <SelectItem value="site2">Site 2</SelectItem>
              <SelectItem value="site3">Site 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
          {chartData.every(d => d.value === 0) ? (
          <div className="text-center text-gray-400 py-20">
            No payment data available for the selected period and site.
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent, value }) =>
                percent > 0
                  ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  : ""
              }
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
          </PieChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

// Helper function for default chart values
const getDefaultChartData = () => [
  { name: "Paid", value: 0, color: "#4ade80" },
  { name: "Pending", value: 0, color: "#facc15" },
  { name: "Overdue", value: 0, color: "#f87171" },
  { name: "Partially Paid", value: 0, color: "#60a5fa" },
];

export default PaymentStatusChart;