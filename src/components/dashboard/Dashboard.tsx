import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, collectionGroup } from "firebase/firestore";
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
        
        // Process each customer
        for (const customerDoc of customersSnapshot.docs) {
          const customerData = customerDoc.data();
          const customerId = customerDoc.id;
          const accountNumber = customerData.accountNumber;
          
          if (!accountNumber) {
            debug.push(`⚠️ Customer ${customerId} has no account number`);
            continue;
          }
          
          customersProcessed.push(accountNumber);
          debug.push(`🔍 Processing customer: ${customerData.name} (Account: ${accountNumber})`);
          
          // Step 2: Fetch bills from the subcollection structure
          // bills/{accountNumber}/records/{billId}
          const billsRecordsRef = collection(db, "bills", accountNumber, "records");
          const billsSnapshot = await getDocs(billsRecordsRef);
          
          if (billsSnapshot.empty) {
            debug.push(`⚠️ No bills found for account: ${accountNumber}`);
            continue;
          }
          
          debug.push(`✅ Found ${billsSnapshot.size} bills for account: ${accountNumber}`);
          
          // Process each bill
          billsSnapshot.forEach((billDoc) => {
            const billData = billDoc.data();
            
            // Validate and calculate totals
            if (typeof billData.waterUsage === "number") {
              totalConsumption += billData.waterUsage;
            }
            
            if (typeof billData.amount === "number") {
              totalRevenue += billData.amount;
              
              if (billData.status === "pending" || billData.status === "overdue") {
                pendingAmount += billData.amount;
              }
            }
          });
        }
        
        debug.push(`👥 Processed accounts: ${customersProcessed.join(", ")}`);
        debug.push(`💧 Total Water Usage: ${totalConsumption} m³`);
        debug.push(`💰 Total Revenue: ₱${totalRevenue.toFixed(2)}`);
        debug.push(`⏳ Pending Payments: ₱${pendingAmount.toFixed(2)}`);
        
        // Calculate example growth percentages
        const customerGrowth = totalCustomers > 0 ? "+5%" : "0%";
        const revenueGrowth = totalRevenue > 0 ? "+8%" : "0%";
        const pendingChange = pendingAmount > 0 ? "+3%" : "0%";
        const consumptionChange = totalConsumption > 0 ? "+4%" : "0%";
        
        // Update dashboard state
        setDashboardData({
          totalCustomers: totalCustomers.toString(),
          totalRevenue: `₱${totalRevenue.toFixed(2)}`,
          pendingPayments: `₱${pendingAmount.toFixed(2)}`,
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
          
          {/* Debug Information (for development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-gray-100 rounded">
              <details>
                <summary className="cursor-pointer text-sm text-gray-600">Debug Information</summary>
                <pre className="mt-2 text-xs overflow-x-auto">
                  {debugInfo.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </pre>
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;