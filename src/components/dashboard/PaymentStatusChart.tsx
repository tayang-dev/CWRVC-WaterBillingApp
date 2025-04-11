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
}

const PaymentStatusChart = () => {
  const [selectedSite, setSelectedSite] = useState("site1");
  const [chartData, setChartData] = useState(getDefaultChartData());

  useEffect(() => {
    const fetchPaymentsBySite = async () => {
      try {
        console.log(`🚀 Fetching customers for site: ${selectedSite}`);

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

        // Fetch all bills concurrently
        const billFetchPromises = customers.map(customer => {
          const recordsQuery = collection(db, "bills", customer.accountNumber, "records");
          return getDocs(recordsQuery).then(recordsSnapshot => {
            return recordsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data() as Bill // Type assertion here
            }));
          });
        });

        // Wait for all bill fetch promises to resolve
        const allBills = await Promise.all(billFetchPromises);
        
        // Flatten the array of bills
        const bills = allBills.flat();

        console.log(`📦 Found ${bills.length} total bills for all customers`);

        // Process each bill
        bills.forEach(bill => {
          console.log(`🔍 Bill Data (${bill.id}):`, bill);

          const amount = bill.amount;
          const originalAmount = bill.originalAmount;
          const dueDate = new Date(bill.dueDate.split("/").reverse().join("-")); // Convert to YYYY-MM-DD format
          const currentDate = new Date();

          // Determine payment status
          if (amount === 0) {
            paymentStatusCounts.Paid += 1;
          } else if (amount > 0 && amount < originalAmount) {
            paymentStatusCounts["Partially Paid"] += 1;
          } else if (amount > 0 && dueDate < currentDate) {
            paymentStatusCounts.Overdue += 1;
          } else {
            paymentStatusCounts.Pending += 1;
          }
        });

        console.log("📊 Payment status counts:", paymentStatusCounts);

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

// Helper function for default chart values
const getDefaultChartData = () => [
  { name: "Paid", value: 1, color: "#4ade80" },
  { name: "Pending", value: 1, color: "#facc15" },
  { name: "Overdue", value: 1, color: "#f87171" },
  { name: "Partially Paid", value: 1, color: "#60a5fa" },
];

export default PaymentStatusChart;