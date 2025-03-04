import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, FileText, Download } from "lucide-react";
import CustomerSearch from "./CustomerSearch";
import CustomerList from "./CustomerList";
import CustomerDetails from "./CustomerDetails";
import AddCustomerForm from "./AddCustomerForm";

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

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch customers from Firestore
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { collection, getDocs } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");

        const customersCollection = collection(db, "customers");
        const customersSnapshot = await getDocs(customersCollection);

        const customersList = customersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          status: doc.data().status || "active",
          lastBillingDate:
            doc.data().lastBillingDate ||
            new Date().toISOString().split("T")[0],
          amountDue: doc.data().amountDue || 0,
        }));

        setCustomers(customersList);
      } catch (error) {
        console.error("Error fetching customers:", error);
        // Fallback to mock data if there's an error
        setCustomers([
          {
            id: "1",
            name: "John Doe",
            email: "john.doe@example.com",
            phone: "(555) 123-4567",
            address: "123 Main St, Anytown, USA 12345",
            accountNumber: "WB-10001",
            status: "active",
            lastBillingDate: "2023-04-15",
            amountDue: 78.5,
            joinDate: "2022-05-15",
          },
          {
            id: "2",
            name: "Jane Smith",
            email: "jane.smith@example.com",
            phone: "(555) 987-6543",
            address: "456 Oak Ave, Somewhere, USA 67890",
            accountNumber: "WB-10002",
            status: "active",
            lastBillingDate: "2023-04-15",
            amountDue: 65.75,
            joinDate: "2022-06-20",
          },
          {
            id: "3",
            name: "Robert Johnson",
            email: "robert.johnson@example.com",
            phone: "(555) 456-7890",
            address: "789 Pine Rd, Elsewhere, USA 54321",
            accountNumber: "WB-10003",
            status: "inactive",
            lastBillingDate: "2023-03-15",
            amountDue: 0,
            joinDate: "2022-03-10",
          },
          {
            id: "4",
            name: "Sarah Williams",
            email: "sarah.williams@example.com",
            phone: "(555) 234-5678",
            address: "101 Cedar Ln, Nowhere, USA 13579",
            accountNumber: "WB-10004",
            status: "pending",
            lastBillingDate: "2023-04-15",
            amountDue: 92.25,
            joinDate: "2022-07-05",
          },
          {
            id: "5",
            name: "Michael Brown",
            email: "michael.brown@example.com",
            phone: "(555) 876-5432",
            address: "202 Elm St, Anyplace, USA 24680",
            accountNumber: "WB-10005",
            status: "active",
            lastBillingDate: "2023-04-15",
            amountDue: 45.0,
            joinDate: "2022-04-25",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Mock billing history data
  const billingHistory = [
    {
      id: "BILL-001",
      date: "2023-04-01",
      amount: 78.5,
      status: "paid" as const,
      dueDate: "2023-04-15",
    },
    {
      id: "BILL-002",
      date: "2023-05-01",
      amount: 82.75,
      status: "pending" as const,
      dueDate: "2023-05-15",
    },
    {
      id: "BILL-003",
      date: "2023-06-01",
      amount: 85.2,
      status: "overdue" as const,
      dueDate: "2023-06-15",
    },
  ];

  // Mock payment tracking data
  const paymentTracking = [
    {
      id: "PAY-001",
      date: "2023-04-10",
      amount: 78.5,
      method: "Credit Card",
      status: "completed" as const,
    },
    {
      id: "PAY-002",
      date: "2023-05-12",
      amount: 82.75,
      method: "Bank Transfer",
      status: "processing" as const,
    },
    {
      id: "PAY-003",
      date: "2023-06-18",
      amount: 85.2,
      method: "Credit Card",
      status: "failed" as const,
    },
  ];

  const handleSearch = async (query: string, filters: any) => {
    setSearchFilters({ query, filters });
    setLoading(true);

    try {
      // Search customers in Firestore
      const {
        collection,
        query: firestoreQuery,
        where,
        getDocs,
      } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      let customersRef = collection(db, "customers");
      let constraints = [];

      // Add filters if they exist
      if (filters.status && filters.status !== "all") {
        constraints.push(where("status", "==", filters.status));
      }

      if (filters.billingCycle && filters.billingCycle !== "all") {
        constraints.push(where("billingCycle", "==", filters.billingCycle));
      }

      if (filters.location && filters.location !== "all") {
        constraints.push(where("location", "==", filters.location));
      }

      const q =
        constraints.length > 0
          ? firestoreQuery(customersRef, ...constraints)
          : firestoreQuery(customersRef);

      const querySnapshot = await getDocs(q);

      // Filter results by search term (client-side)
      const searchLower = query.toLowerCase();
      const filteredCustomers = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
        .filter(
          (customer) =>
            !searchLower ||
            customer.name?.toLowerCase().includes(searchLower) ||
            customer.email?.toLowerCase().includes(searchLower) ||
            customer.accountNumber?.toLowerCase().includes(searchLower) ||
            customer.phone?.toLowerCase().includes(searchLower),
        );

      if (filteredCustomers.length > 0) {
        setCustomers(filteredCustomers);
      }
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setLoading(false);
    }
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
              Accounts Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage customer accounts, billing, and payment information
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="flex items-center gap-2">
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
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger
                  value="accounts"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Customer Accounts
                </TabsTrigger>
                <TabsTrigger
                  value="reports"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Reports
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="accounts" className="p-0">
              {view === "list" ? (
                <div className="space-y-6 p-6">
                  <CustomerSearch onSearch={handleSearch} />
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <p>Loading customers...</p>
                    </div>
                  ) : (
                    <CustomerList
                      customers={customers}
                      onViewCustomer={handleViewCustomer}
                      onEditCustomer={handleEditCustomer}
                      onDeleteCustomer={handleDeleteCustomer}
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
                      billingHistory={billingHistory}
                      paymentTracking={paymentTracking}
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

            <TabsContent value="reports" className="p-6">
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-700">
                  Reports Feature Coming Soon
                </h3>
                <p className="text-gray-500 mt-2">
                  This feature is currently under development. Check back later
                  for billing reports, usage analytics, and more.
                </p>
              </div>
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
