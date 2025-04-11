// CustomerWaterUsageRanking.tsx
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

// Define the interface for Customer data
interface Customer {
  id: string;
  accountNumber: string;
  name: string;
  site: string;
  totalWaterUsage?: number; // Optional property for total water usage
}

const CustomerWaterUsageRanking = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [siteFilter, setSiteFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("highest");

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const customersSnapshot = await getDocs(collection(db, "customers"));
        const customerData = await Promise.all(customersSnapshot.docs.map(async (doc) => {
          const customer = { id: doc.id, ...doc.data() } as Customer; // Cast to Customer type
          const totalWaterUsage = await fetchTotalWaterUsage(customer.accountNumber);
          return { ...customer, totalWaterUsage };
        }));
        setCustomers(customerData);
        setFilteredCustomers(customerData);
      } catch (error) {
        console.error("❌ Error fetching customer data:", error);
      }
    };

    fetchCustomers();
  }, []);

  const fetchTotalWaterUsage = async (accountNumber: string) => {
    let totalUsage = 0;
    try {
      const billsSnapshot = await getDocs(collection(db, "bills", accountNumber, "records"));
      billsSnapshot.forEach((billDoc) => {
        const billData = billDoc.data();
        if (typeof billData.waterUsage === "number") {
          totalUsage += billData.waterUsage;
        }
      });
    } catch (error) {
      console.error(`❌ Error fetching bills for account ${accountNumber}:`, error);
    }
    return totalUsage;
  };

  useEffect(() => {
    let filtered = customers;

    // Filter by site
    if (siteFilter !== "All") {
      filtered = filtered.filter(customer => customer.site === siteFilter);
    }

    // Sort by total water usage
    filtered.sort((a, b) => {
      if (sortOrder === "highest") {
        return (b.totalWaterUsage || 0) - (a.totalWaterUsage || 0); // Sort descending
      } else {
        return (a.totalWaterUsage || 0) - (b.totalWaterUsage || 0); // Sort ascending
      }
    });

    // Reverse the list to put the highest or lowest at the top
    filtered = filtered.reverse();

    setFilteredCustomers(filtered);
  }, [customers, siteFilter, sortOrder]);

  return (
    <Card className="w-full h-full bg-white">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Customer Water Usage Ranking</CardTitle>
        <CardDescription>List of customers and their total water usage</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex mb-4">
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="mr-4 p-2 border rounded"
          >
            <option value="All">All Sites</option>
            <option value="site1">Site 1</option>
            <option value="site2">Site 2</option>
            <option value="site3">Site 3</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="highest">Highest Usage</option>
            <option value="lowest">Lowest Usage</option>
          </select>
        </div>

        <div className="overflow-y-auto max-h-60">
          <ul>
            {filteredCustomers.map((customer) => (
              <li key={customer.id} className="flex justify-between p-2 border-b">
                <span>{customer.name} (Account: {customer.accountNumber})</span>
                <span>{customer.totalWaterUsage || 0} m³</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerWaterUsageRanking;