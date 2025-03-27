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

const PaymentStatusChart = () => {
  const [selectedSite, setSelectedSite] = useState("site1");
  const [chartData, setChartData] = useState(getDefaultChartData());

  useEffect(() => {
    const fetchPaymentsBySite = async () => {
      try {
        console.log(`🚀 Fetching customers for site: ${selectedSite}`);

        // 🔹 Fetch customers based on the selected site
        const customersQuery = query(
          collection(db, "customers"),
          where("site", "==", selectedSite)
        );
        const customersSnapshot = await getDocs(customersQuery);

        const customers = customersSnapshot.docs.map(doc => ({
          id: doc.id,
          accountNumber: doc.data().accountNumber
        }));

        console.log(`👥 Found ${customers.length} customers in ${selectedSite}:`, customers);

        if (customers.length === 0) {
          console.warn(`⚠️ No customers found in ${selectedSite}`);
          setChartData(getDefaultChartData());
          return;
        }

        let paymentStatusCounts = { Paid: 0, Pending: 0, Overdue: 0, "Partially Paid": 0 };

        // 🔹 Loop through customers to fetch their bills
        for (const customer of customers) {
          console.log(`📄 Fetching bills for account: ${customer.accountNumber}`);

          const recordsQuery = collection(db, "bills", customer.accountNumber, "records");
          const recordsSnapshot = await getDocs(recordsQuery);

          console.log(`📦 Found ${recordsSnapshot.docs.length} bills for account: ${customer.accountNumber}`);

          recordsSnapshot.docs.forEach((doc) => {
            const bill = doc.data();
            console.log(`🔍 Bill Data (${doc.id}):`, bill);

            // ✅ Normalize status (convert to lowercase)
            const billStatus = bill.status.toLowerCase();

            if (billStatus === "paid") paymentStatusCounts.Paid += 1;
            else if (billStatus === "pending") paymentStatusCounts.Pending += 1;
            else if (billStatus === "overdue") paymentStatusCounts.Overdue += 1;
            else if (billStatus === "partially paid") paymentStatusCounts["Partially Paid"] += 1;
            else console.warn(`⚠️ Unknown bill status: ${bill.status} in ${doc.id}`);
          });
        }

        console.log("📊 Payment status counts:", paymentStatusCounts);

        // ✅ Ensure at least one non-zero value in the dataset
        const totalBills = Object.values(paymentStatusCounts).reduce((sum, val) => sum + val, 0);

        if (totalBills === 0) {
          console.warn(`⚠️ No billing data found for ${selectedSite}, showing default values.`);
          setChartData(getDefaultChartData());
        } else {
          setChartData([
            { name: "Paid", value: paymentStatusCounts.Paid, color: "#4ade80" },
            { name: "Pending", value: paymentStatusCounts.Pending, color: "#facc15" },
            { name: "Overdue", value: paymentStatusCounts.Overdue, color: "#f87171" },
            { name: "Partially Paid", value: paymentStatusCounts["Partially Paid"], color: "#60a5fa" },
          ]);
        }
      } catch (error) {
        console.error("❌ Error fetching payment data:", error);
      }
    };

    fetchPaymentsBySite();
  }, [selectedSite]);

  return (
    <Card className="w-full h-full bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              Payment Status by Site
            </CardTitle>
            <CardDescription>View payments for each site</CardDescription>
          </div>
          {/* 🔹 Dropdown for site selection */}
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="site1">Site 1</SelectItem>
              <SelectItem value="site2">Site 2</SelectItem>
              <SelectItem value="site3">Site 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
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
                percent > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ""
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
      </CardContent>
    </Card>
  );
};

// 🔹 Helper function for default chart values
const getDefaultChartData = () => [
  { name: "Paid", value: 1, color: "#4ade80" },
  { name: "Pending", value: 1, color: "#facc15" },
  { name: "Overdue", value: 1, color: "#f87171" },
  { name: "Partially Paid", value: 1, color: "#60a5fa" },
];

export default PaymentStatusChart;
