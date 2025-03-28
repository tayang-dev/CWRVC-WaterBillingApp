import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import KpiCards from "./KpiCards";
import BillingTrendsChart from "./BillingTrendsChart";
import PaymentStatusChart from "./PaymentStatusChart";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalCustomers: "0",
    totalRevenue: "₱0",
    pendingPayments: "₱0",
    waterConsumption: "0 m³",
    customerGrowth: "+0%",
    revenueGrowth: "+0%",
    pendingChange: "+0%",
    consumptionChange: "0%",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);

  // ✅ Formatter & Helper
  const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  });

  const formatCurrency = (amount: number) => currencyFormatter.format(amount);

  // ✅ useEffect
  useEffect(() => {
    const fetchDashboardData = async () => {
      const debug = [];
      try {
        let totalConsumption = 0;
        let totalRevenue = 0;
        let pendingAmount = 0;
        let customersProcessed = [];

        debug.push("🚀 Starting dashboard data fetch");

        // Step 1: Fetch all customers
        const customersSnapshot = await getDocs(collection(db, "customers"));

        if (customersSnapshot.empty) {
          debug.push("⚠️ No customers found in Firestore!");
          setError("No customer data available.");
          setLoading(false);
          setDebugInfo(debug);
          return;
        }

        const totalCustomers = customersSnapshot.size;
        debug.push(`📊 Found ${totalCustomers} customers`);

        // Step 2: Process each customer for total water usage and pending payments
        for (const customerDoc of customersSnapshot.docs) {
          const customerData = customerDoc.data();
          const accountNumber = customerData.accountNumber;

          if (!accountNumber) {
            debug.push(`⚠️ Customer ${customerDoc.id} has no account number`);
            continue;
          }

          customersProcessed.push(accountNumber);
          debug.push(`🔍 Processing customer: ${customerData.name} (Account: ${accountNumber})`);

          // Step 3: Fetch all bills for water usage and pending payments
          const billsRecordsRef = collection(db, "bills", accountNumber, "records");
          const billsSnapshot = await getDocs(billsRecordsRef);

          if (billsSnapshot.empty) {
            debug.push(`⚠️ No bills found for account: ${accountNumber}`);
            continue;
          }

          // Sum water usage from all bills
          billsSnapshot.forEach((billDoc) => {
            const billData = billDoc.data();

            // Total water consumption from all bills
            if (typeof billData.waterUsage === "number") {
              totalConsumption += billData.waterUsage; // Accumulate total water usage
            }

            // Pending amounts only
            if (typeof billData.amount === "number" &&
                (billData.status === "pending" || billData.status === "overdue")) {
              pendingAmount += billData.amount; // Accumulate pending amounts
            }
          });
        }

        debug.push(`👥 Processed accounts: ${customersProcessed.join(", ")}`);
        debug.push(`💧 Total Water Usage: ${totalConsumption} m³`);
        debug.push(`⏳ Pending Payments: ${formatCurrency(pendingAmount)}`);

        // Step 4: Fetch verified payments for total revenue
        const paymentVerificationsRef = collection(db, "paymentVerifications");
        const verifiedPaymentsSnapshot = await getDocs(paymentVerificationsRef);

        if (verifiedPaymentsSnapshot.empty) {
          debug.push("⚠️ No verified payments found!");
        } else {
          debug.push(`✅ Found ${verifiedPaymentsSnapshot.size} verified payments`);

          verifiedPaymentsSnapshot.forEach((doc) => {
            const data = doc.data();
            const amount = parseFloat(data.amount); // amount is string
            if (!isNaN(amount)) {
              totalRevenue += amount; // Accumulate total revenue
            }
          });

          debug.push(`💸 Total Verified Revenue: ${formatCurrency(totalRevenue)}`);
        }

        // Step 5: Example growth (optional)
        const customerGrowth = totalCustomers > 0 ? "+5%" : "0%";
        const revenueGrowth = totalRevenue > 0 ? "+8%" : "0%";
        const pendingChange = pendingAmount > 0 ? "+3%" : "0%";
        const consumptionChange = totalConsumption > 0 ? "+4%" : "0%";

        // Step 6: Set state
        setDashboardData({
          totalCustomers: totalCustomers.toString(),
          totalRevenue: formatCurrency(totalRevenue),
          pendingPayments: formatCurrency(pendingAmount),
          waterConsumption: `${totalConsumption} m³`,
          customerGrowth,
          revenueGrowth,
          pendingChange,
          consumptionChange,
        });

        setError(null);
      } catch (error) {
        debug.push(`❌ Error: ${error.message}`);
        console.error("❌ Error fetching dashboard data:", error);
        setError("Failed to fetch data. Check Firestore connection and console for details.");
      } finally {
        setLoading(false);
        setDebugInfo(debug);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="w-full h-full p-6 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Water Billing Dashboard</h1>
        <p className="text-gray-500">Overview of billing metrics and customer data</p>
      </div>

      {/* Show Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error Loading Data</p>
          <p>{error}</p>
          <div className="mt-4">
            <details className="cursor-pointer">
              <summary className="text-sm text-red-600">Debug Information</summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {debugInfo.map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </pre>
            </details>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <KpiCards
            totalCustomers={dashboardData.totalCustomers}
            totalRevenue={dashboardData.totalRevenue}
            pendingPayments={dashboardData.pendingPayments}
            waterConsumption={dashboardData.waterConsumption}
            customerGrowth={dashboardData.customerGrowth}
            revenueGrowth={dashboardData.revenueGrowth}
            pendingChange={dashboardData.pendingChange}
            consumptionChange={dashboardData.consumptionChange}
          />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <BillingTrendsChart />
            <PaymentStatusChart />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;