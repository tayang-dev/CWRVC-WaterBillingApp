import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Download } from "lucide-react";
import CustomerList from "./CustomerList";
import CustomerDetails from "./CustomerDetails";
import AddCustomerForm from "./AddCustomerForm";
import * as XLSX from "xlsx";

interface AccountsManagementProps {
  initialView?: "list" | "details";
  selectedCustomerId?: string;
}

const AccountsManagement = ({
  initialView = "list",
  selectedCustomerId = "",
}: AccountsManagementProps) => {
  const [view, setView] = useState<"list" | "details" | "add">(initialView);
  const [selectedCustomer, setSelectedCustomer] =
    useState<string>(selectedCustomerId);
  const [searchFilters, setSearchFilters] = useState({
    query: "",
    filters: {
      status: "all",
      billingCycle: "all",
      location: "all",
    },
  });

  const exportToExcel = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("No data to export!");
      return;
    }
  
    // Define columns explicitly
    const formattedData = data.map((item) => ({
      "User ID": item.id || "",
      "Name": item.name || "",
      "Email": item.email || "",
      "Phone": item.phone || "",
      "Address": item.address || "",
      "Account Number": item.accountNumber || "",
      "Site": item.site || "",
      "Status": item.status || "",
      "Amount Due": item.amountDue || "",
      "Last Reading": item.lastReading || "",
      "Last Billing Date": item.lastBilling || "",
      "Verified At": item.verifiedAt ? new Date(item.verifiedAt).toLocaleDateString() : "",
      "User Verified": item.userVerified ? "Yes" : "No",
      "Is Senior": item.isSenior ? "Yes" : "No",
      "Join Date": item.joinDate ? new Date(item.joinDate).toLocaleDateString() : "",
    }));
  
    // Convert to worksheet
    const worksheet = XLSX.utils.json_to_sheet(formattedData, {
      header: [
        "User ID",
        "Name",
        "Email",
        "Phone",
        "Address",
        "Account Number",
        "Site",
        "Status",
        "Amount Due",
        "Last Reading",
        "Last Billing Date",
        "Verified At",
        "User Verified",
        "Is Senior",
        "Join Date",
      ],
    });
  
    // Auto-adjust column width
    const columnWidths = formattedData.length
      ? Object.keys(formattedData[0]).map((key) => ({ wch: key.length + 5 }))
      : [];
  
    worksheet["!cols"] = columnWidths;
  
    // Create workbook and export
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedSenior, setSelectedSenior] = useState<string>("all");


 // Fetch customers from Firestore with site and senior filters
useEffect(() => {
  const fetchCustomers = async () => {
    try {
      const { collection, getDocs, where, query } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      let customersRef = collection(db, "customers");
      let constraints = [];

      if (selectedSite !== "all") {
        constraints.push(where("site", "==", selectedSite));
      }

      if (selectedSenior !== "all") {
        const isSeniorBoolean = selectedSenior === "true"; // Convert to boolean
        constraints.push(where("isSenior", "==", isSeniorBoolean));
      }

      const q = constraints.length > 0 ? query(customersRef, ...constraints) : customersRef;
      const customersSnapshot = await getDocs(q);

      const customersList = customersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || "active",
        lastBillingDate: doc.data().lastBillingDate || new Date().toISOString().split("T")[0],
        amountDue: doc.data().amountDue || 0,
      }));

      setCustomers(customersList);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchCustomers();
}, [selectedSite, selectedSenior]); // Re-fetch when filters change


const handleSearch = async (query: string, filters: any) => {
  setSearchFilters({ query, filters });
  setLoading(true);

  try {
    const { collection, query: firestoreQuery, where, getDocs } = await import("firebase/firestore");
    const { db } = await import("../../lib/firebase");

    let customersRef = collection(db, "customers");
    let constraints = [];

    // Apply status filter
    if (filters.status && filters.status !== "all") {
      constraints.push(where("status", "==", filters.status));
    }

    // Apply site filter
    if (filters.site && filters.site !== "all") {
      constraints.push(where("site", "==", filters.site));
    }

    // Apply senior filter
    if (filters.isSenior && filters.isSenior !== "all") {
      const isSeniorBoolean = filters.isSenior === "true";
      constraints.push(where("isSenior", "==", isSeniorBoolean));
    }

    const q = constraints.length > 0 ? firestoreQuery(customersRef, ...constraints) : firestoreQuery(customersRef);
    const querySnapshot = await getDocs(q);

    // Client-side filtering for search query
    const searchLower = query.toLowerCase();
    const filteredCustomers = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .filter(
        (customer) =>
          !searchLower ||
          customer.name?.toLowerCase().includes(searchLower) ||
          customer.email?.toLowerCase().includes(searchLower) ||
          customer.accountNumber?.toLowerCase().includes(searchLower) ||
          customer.phone?.toLowerCase().includes(searchLower)
      );

    setCustomers(filteredCustomers);
  } catch (error) {
    console.error("Error searching customers:", error);
  } finally {
    setLoading(false);
  }
};

  // Function to handle export button click
  const handleExportData = () => {
    exportToExcel(customers, "customers_data");
  };

  const handleViewCustomer = (customerId: string) => {
    setSelectedCustomer(customerId);
    setView("details");
  };

  const handleEditCustomer = (customerId: string) => {
    // In a real application, this would open an edit form or navigate to an edit page
    console.log("Edit customer:", customerId);
  };

  const handleDeleteCustomer = (customerId: string) => {
    // In a real application, this would show a confirmation dialog and then delete the customer
    console.log("Delete customer:", customerId);
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedCustomer("");
  };

  // Find the selected customer for details view
  const customerDetails = customers.find((c) => c.id === selectedCustomer);

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Customer Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage customer accounts, users, and payment information
            </p>
          </div>
          <div className="flex space-x-3">
            {/* Export Data Button */}
            <Button variant="outline" className="flex items-center gap-2" onClick={handleExportData}>
              <Download className="h-4 w-4" />
              Export Data
            </Button>
            <Button
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => setView("add")}
            >
              <PlusCircle className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <Tabs defaultValue="accounts" className="w-full">
            <div className="border-b px-6 py-3">
              <TabsList className="grid w-full max-w-md grid-cols-1">
                <TabsTrigger
                  value="accounts"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Customer Accounts
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="accounts" className="p-0">
              {view === "list" ? (
                <div className="space-y-6 p-6">
              
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <p>Loading customers...</p>
                    </div>
                  ) : (
                    <CustomerList
                      customers={customers}
                      onViewCustomer={handleViewCustomer}
                      
                      
                    />
                  )}
                </div>
              ) : view === "details" ? (
                <div className="p-6">
                  <Button
                    variant="outline"
                    onClick={handleBackToList}
                    className="mb-6"
                  >
                    ← Back to Customer List
                  </Button>
                  {customerDetails && (
                    <CustomerDetails
                      customer={{
                        id: customerDetails.id,
                        name: customerDetails.name,
                        email: customerDetails.email,
                        phone: customerDetails.phone,
                        address: customerDetails.address,
                        accountNumber: customerDetails.accountNumber,
                        status: customerDetails.status,
                        joinDate: customerDetails.joinDate,
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="p-6">
                  <Button
                    variant="outline"
                    onClick={handleBackToList}
                    className="mb-6"
                  >
                    ← Back to Customer List
                  </Button>
                  <AddCustomerForm
                    onSubmit={(data) => {
                      // Refresh customer list after adding
                      const fetchCustomers = async () => {
                        try {
                          const { collection, getDocs } = await import(
                            "firebase/firestore"
                          );
                          const { db } = await import("../../lib/firebase");

                          const customersCollection = collection(
                            db,
                            "customers",
                          );
                          const customersSnapshot =
                            await getDocs(customersCollection);

                          const customersList = customersSnapshot.docs.map(
                            (doc) => ({
                              id: doc.id,
                              ...doc.data(),
                            }),
                          );

                          setCustomers(customersList);
                        } catch (error) {
                          console.error("Error fetching customers:", error);
                        }
                      };

                      fetchCustomers();
                      setView("list");
                    }}
                    onCancel={handleBackToList}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Water Billing System - Admin Portal v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default AccountsManagement;