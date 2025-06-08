import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import KpiCards from "./KpiCards";
import BillingTrendsChart from "./BillingTrendsChart";
import PaymentStatusChart from "./PaymentStatusChart";
import WaterLeakagePerSite from "./WaterLeakagePerSite";
import CustomerWaterUsageRanking from "./CustomerWaterUsageRanking";
import { exportDashboardData } from "./exportDashboardData";
import { useNavigate } from "react-router-dom"; // Add this import at the top
import { CreditCard, Download, Wallet } from "lucide-react";


const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalCustomers: "0",
    totalRevenue: "₱0",
    pendingPayments: "₱0",
    waterConsumption: "0 m³",
    // Growth percentages removed
  });

  const [leakageData, setLeakageData] = useState([]);
  const [billingData, setBillingData] = useState([]);
  const [paymentStatusData, setPaymentStatusData] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Filters
  const [selectedSite, setSelectedSite] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");

  const navigate = useNavigate();


  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSite(e.target.value);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
  };

// Update the fetchDashboardData function to handle the new read field
useEffect(() => {
  const fetchDashboardData = async () => {
    const debug: string[] = [];
    setLoading(true);

    try {
      let totalConsumption = 0;
      let totalRevenue = 0;
      let pendingAmount = 0;

      debug.push("🚀 Starting optimized dashboard data fetch");

      // Fetch customers filtered by site in one query
      const customerQuery =
        selectedSite === "All"
          ? collection(db, "customers")
          : query(collection(db, "customers"), where("site", "==", selectedSite));
      const customerSnapshot = await getDocs(customerQuery);

      if (customerSnapshot.empty) {
        debug.push("⚠️ No customers found in Firestore!");
        setError("No customer data available.");
        setLoading(false);
        setDebugInfo(debug);
        return;
      }

      const customers = customerSnapshot.docs.map((doc) => ({
        id: doc.id,
        accountNumber: doc.data().accountNumber,
        ...doc.data(),
      }));

      debug.push(`📊 Found ${customers.length} customers for site: ${selectedSite}`);

      // Fetch all bills and payments in parallel - Handle potential errors for each promise
      try {
        const [billsSnapshots, paymentSnapshot] = await Promise.all([
          Promise.all(
            customers.map((customer) =>
              customer.accountNumber 
                ? getDocs(collection(db, "bills", customer.accountNumber, "records"))
                  .catch(err => {
                    debug.push(`⚠️ Error fetching bills for customer ${customer.accountNumber}: ${err.message}`);
                    return { docs: [] }; // Return empty docs if there's an error
                  })
                : { docs: [] } // Handle missing accountNumber
            )
          ),
          getDocs(collection(db, "paymentVerifications")),
        ]);

        // Process bills with better error handling
        billsSnapshots.forEach((billsSnapshot) => {
          if (!billsSnapshot.docs) return; // Skip if no docs property
          
          if (Array.isArray(billsSnapshot.docs)) {
            billsSnapshot.docs.forEach((billDoc) => {
              try {
                const billData = billDoc.data();
                if (!billData.date) return; // Skip if no date
                
                const billDate = new Date(billData.date);
                const billMonth = billDate.getMonth() + 1;
                const billYear = billDate.getFullYear();

                const matchesMonth =
                  selectedMonth === "All" || parseInt(selectedMonth) === billMonth;
                const matchesYear =
                  selectedYear === "All" || parseInt(selectedYear) === billYear;

                if (matchesMonth && matchesYear) {
                  if (typeof billData.waterUsage === "number") {
                    totalConsumption += billData.waterUsage;
                  }
                  if (
                    typeof billData.amount === "number" &&
                    (billData.status === "pending" || billData.status === "overdue")
                  ) {
                    pendingAmount += billData.amount;
                  }
                }
              } catch (err) {
                debug.push(`⚠️ Error processing bill data: ${err.message}`);
              }
            });
          }
        });

        debug.push(`💧 Filtered Total Water Usage: ${totalConsumption} m³`);
        debug.push(`⏳ Filtered Pending Payments: ${pendingAmount}`);

        // Process payments with better error handling
        paymentSnapshot.forEach((doc) => {
          try {
            const data = doc.data();
            // Use paymentDate and filter by status: "verified"
            if (!data.paymentDate || data.status !== "verified") return;
        
            // Parse paymentDate (format: MM/DD/YYYY)
            const [monthStr, dayStr, yearStr] = data.paymentDate.split("/");
            const paymentMonth = parseInt(monthStr, 10);
            const paymentYear = parseInt(yearStr, 10);
        
            const matchesMonth =
              selectedMonth === "All" || parseInt(selectedMonth) === paymentMonth;
            const matchesYear =
              selectedYear === "All" || parseInt(selectedYear) === paymentYear;
        
            if (matchesMonth && matchesYear) {
              const amount = parseFloat(data.amount);
              if (!isNaN(amount)) {
                totalRevenue += amount;
              }
            }
          } catch (err) {
            debug.push(`⚠️ Error processing payment data: ${err.message}`);
          }
        });

        debug.push(`💸 Filtered Total Revenue: ${totalRevenue}`);
      } catch (err) {
        debug.push(`❌ Error in Promise.all: ${err.message}`);
        throw err;
      }

      setDashboardData({
        totalCustomers: customers.length.toString(),
        totalRevenue: `₱${totalRevenue.toFixed(2)}`,
        pendingPayments: `₱${pendingAmount.toFixed(2)}`,
        waterConsumption: `${totalConsumption} m³`,
        // Growth percentages removed
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

        {/* Pay in Cash and Export Buttons in the same row */}
        <div className="mb-6 flex justify-end gap-3">
              <button
                className="px-5 py-2.5 bg-sky-600 text-white font-medium rounded-md shadow hover:bg-sky-700 transition-colors duration-200 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"
                onClick={() => navigate("/payments?tab=cash-payment")}
              >
                <Wallet size={18} />
                <span>Pay in Cash</span>
              </button>
              
              <button
                className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-md shadow hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                onClick={() =>
                  exportDashboardData({
                    dashboardStats: dashboardData,
                    leakageData,
                    billingTrends: billingData,
                    paymentStatus: paymentStatusData,
                    customerUsage: filteredCustomers,
                  })
                }
              >
                <Download size={18} />
                <span>Export Dashboard Data</span>
              </button>
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
            <BillingTrendsChart onData={setBillingData} />
            <PaymentStatusChart onData={setPaymentStatusData} />
            <CustomerWaterUsageRanking onData={setFilteredCustomers} />
            <WaterLeakagePerSite onData={setLeakageData} />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;