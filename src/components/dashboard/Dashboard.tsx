import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import KpiCards from "./KpiCards";
import BillingTrendsChart from "./BillingTrendsChart";
import PaymentStatusChart from "./PaymentStatusChart";
import WaterLeakagePerSite from "./WaterLeakagePerSite"; // Import the new component
import CustomerWaterUsageRanking from "./CustomerWaterUsageRanking"; // Import the new component

// Helper: Currency Formatter
const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalCustomers: "0",
    totalRevenue: "₱0",
    pendingPayments: "₱0",
    waterConsumption: "0 m³",
    customerGrowth: "+0%",
    revenueGrowth: "+0%",
    pendingChange: "+0%",
    consumptionChange: "+4%",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Filters
  const [selectedSite, setSelectedSite] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All"); // Change to string
  const [selectedYear, setSelectedYear] = useState("All"); // Change to string

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSite(e.target.value);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value); // Keep as string
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value); // Keep as string
  };

  const formatCurrency = (amount: number) => currencyFormatter.format(amount);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const debug: string[] = [];
      setLoading(true);
  
      try {
        let totalConsumption = 0;
        let totalRevenue = 0;
        let pendingAmount = 0;
        const customersProcessed: string[] = [];
  
        debug.push("🚀 Starting filtered dashboard data fetch");
  
        const customerSnapshot = await getDocs(collection(db, "customers"));
  
        if (customerSnapshot.empty) {
          debug.push("⚠️ No customers found in Firestore!");
          setError("No customer data available.");
          setLoading(false);
          setDebugInfo(debug);
          return;
        }
  
        const filteredCustomers = customerSnapshot.docs.filter((doc) => {
          const site = doc.data()?.site || "unknown";
          return selectedSite === "All" || site.toLowerCase() === selectedSite;
        });
  
        debug.push(`📊 Found ${filteredCustomers.length} customers for site: ${selectedSite}`);
  
        const billsPromises = filteredCustomers.map(async (customerDoc) => {
          const customerData = customerDoc.data();
          const accountNumber = customerData.accountNumber;
          if (!accountNumber) {
            debug.push(`⚠️ Customer ${customerDoc.id} has no account number`);
            return null;
          }
          customersProcessed.push(accountNumber);
          debug.push(`🔍 Processing customer: ${customerData.name} (Account: ${accountNumber})`);
  
          const billsRef = collection(db, "bills", accountNumber, "records");
          const billsSnapshot = await getDocs(billsRef);
          return billsSnapshot;
        });
  
        const billsSnapshots = await Promise.all(billsPromises);
  
        billsSnapshots.forEach((billsSnapshot) => {
          if (billsSnapshot) {
            billsSnapshot.docs.forEach((billDoc) => {
              const billData = billDoc.data();
              const billDate = new Date(billData.date);
              const billMonth = billDate.getMonth() + 1;
              const billYear = billDate.getFullYear();
  
              // Handle "All" for month and year properly
              const isMonthAll = selectedMonth === "All";
              const isYearAll = selectedYear === "All";
              const selectedMonthNumber = isMonthAll ? null : parseInt(selectedMonth);
              const selectedYearNumber = isYearAll ? null : parseInt(selectedYear);
  
              const matchesMonth = isMonthAll || (selectedMonthNumber !== null && billMonth === selectedMonthNumber);
              const matchesYear = isYearAll || (selectedYearNumber !== null && billYear === selectedYearNumber);
  
              if (!matchesMonth || !matchesYear) return;
  
              if (typeof billData.waterUsage === "number") {
                totalConsumption += billData.waterUsage;
              }
  
              if (
                typeof billData.amount === "number" &&
                (billData.status === "pending" || billData.status === "overdue")
              ) {
                pendingAmount += billData.amount;
              }
            });
          }
        });
  
        debug.push(`👥 Processed accounts: ${customersProcessed.join(", ")}`);
        debug.push(`💧 Filtered Total Water Usage: ${totalConsumption} m³`);
        debug.push(`⏳ Filtered Pending Payments: ${formatCurrency(pendingAmount)}`);
  
        const paymentSnapshot = await getDocs(collection(db, "paymentVerifications"));
        paymentSnapshot.forEach((doc) => {
          const data = doc.data();
          const paymentDate = new Date(data.date);
          const month = paymentDate.getMonth() + 1;
          const year = paymentDate.getFullYear();
  
          // Ensure selectedMonth and selectedYear are compared as numbers
          const isMonthAll = selectedMonth === "All";
          const isYearAll = selectedYear === "All";
          const selectedMonthNumber = isMonthAll ? null : parseInt(selectedMonth);
          const selectedYearNumber = isYearAll ? null : parseInt(selectedYear);
  
          const matchesMonth = isMonthAll || (selectedMonthNumber !== null && month === selectedMonthNumber);
          const matchesYear = isYearAll || (selectedYearNumber !== null && year === selectedYearNumber);
  
          if (matchesMonth && matchesYear) {
            const amount = parseFloat(data.amount);
            if (!isNaN(amount)) {
              totalRevenue += amount;
            }
          }
        });
  
        debug.push(`💸 Filtered Total Revenue: ${formatCurrency(totalRevenue)}`);
  
        setDashboardData({
          totalCustomers: filteredCustomers.length.toString(),
          totalRevenue: formatCurrency(totalRevenue),
          pendingPayments: formatCurrency(pendingAmount),
          waterConsumption: `${totalConsumption} m³`,
          customerGrowth: "+5%",
          revenueGrowth: "+8%",
          pendingChange: "+3%",
          consumptionChange: "+4%",
        });
  
        setError(null);
      } catch (err: any) {
        debug.push(`❌ Error: ${err.message}`);
        setError("Failed to fetch dashboard data.");
      } finally {
        setLoading(false);
        setDebugInfo(debug);
      }
    };
  
    fetchDashboardData();
  }, [selectedSite, selectedMonth, selectedYear]);
  
  return (
    <div className="w-full h-full p-6 bg-gray-50">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Overview of billing metrics and customer data</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {/* Site Filter */}
          <select
            value={selectedSite}
            onChange={handleSiteChange}
            className="px-3 py-2 border rounded bg-white shadow-sm"
          >
            <option value="All">All Sites</option>
            <option value="site1">Site 1</option>
            <option value="site2">Site 2</option>
            <option value="site3">Site 3</option>
          </select>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="px-3 py-2 border rounded bg-white shadow-sm"
          >
            <option value="All">All Time</option>
            {Array.from({ length: 12 }, (_, i) => {
              const month = (i + 1).toString().padStart(2, "0");
              return (
                <option key={month} value={month}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              );
            })}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={handleYearChange}
            className="px-3 py-2 border rounded bg-white shadow-sm"
          >
            <option value="All">All Time</option>
            {Array.from({ length: 6 }, (_, i) => {
              const year = (2024 + i).toString();
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>

        </div>
      </div>

      {/* Loader / Error / Content */}
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : error ? (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error Loading Data</p>
          <p>{error}</p>
          <details className="mt-4 cursor-pointer">
            <summary className="text-sm text-red-600">Debug Info</summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
              {debugInfo.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </pre>
          </details>
        </div>
      ) : (
        <>
          <KpiCards {...dashboardData} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <BillingTrendsChart />
            <PaymentStatusChart />
            <CustomerWaterUsageRanking />
            <WaterLeakagePerSite />
          </div>

          
        </>
      )}
    </div>
  );
};

export default Dashboard;