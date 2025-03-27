import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Mail, Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface Bill {
  id: string;
  customerId: string;
  customerName: string;
  accountNumber: string;
  date: string;
  amount: number;
  currentAmountDue?: number;
  status: "paid" | "pending" | "overdue";
  dueDate: string;
  description?: string;
  waterUsage?: number;
}

const BillingHistory = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const fetchBillingHistory = async () => {
    setLoading(true);
    try {
      const customersCollection = collection(db, "customers");
      const customersSnapshot = await getDocs(customersCollection);
      let allBills: Bill[] = [];
  
      for (const customerDoc of customersSnapshot.docs) {
        const customerData = customerDoc.data();
        const accountNumber = customerData.accountNumber;
  
        if (!accountNumber) continue;
  
        const billsCollection = collection(db, "bills", accountNumber, "records");
        const billsQuery = query(billsCollection, orderBy("date", "desc"));
        const billsSnapshot = await getDocs(billsQuery);
  
        const customerBills = billsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            customerId: data.customerId || "",
            customerName: customerData.name,
            accountNumber: data.accountNumber || accountNumber,
            date: data.date || "",
            amount: data.amount || 0,
            amountAfterDue: data.amountAfterDue || 0,
            currentAmountDue: data.currentAmountDue ?? data.amount, // ✅ Use `currentAmountDue` if available
            status: data.status || "pending",
            dueDate: data.dueDate || "",
            billingPeriod: data.billingPeriod || "",
            waterUsage: data.waterUsage || data.meterReading?.consumption || 0,
            penalty: data.penalty || 0,
            tax: data.tax || 0,
            seniorDiscount: data.seniorDiscount || 0,
            waterCharge: data.waterCharge || 0,
            waterChargeBeforeTax: data.waterChargeBeforeTax || 0,
          };
        });
  
        allBills = [...allBills, ...customerBills];
      }
  
      setBills(allBills);
    } catch (error) {
      console.error("Error fetching billing history:", error);
    } finally {
      setLoading(false);
    }
  };
  

  function formatDate(dateStr: string) {
    const parts = dateStr.split("/"); // Split by "/"
    if (parts.length !== 3) return "Invalid Date"; // Ensure valid format
    
    const [day, month, year] = parts.map(Number); // Convert to numbers
    const date = new Date(year, month - 1, day); // Month is zero-based

    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString("en-GB"); // Use UK format for dd/mm/yyyy
}


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500">
            Pending
          </Badge>
        );
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter bills based on search term and filters
  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      searchTerm === "" ||
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || bill.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">Billing History</h1>
            <p className="text-gray-600 mt-1">View and manage all customer billing records</p>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Bills</CardTitle>
            <CardDescription>Complete history of all bills generated in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative flex-grow mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by customer name, account number, or bill ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading billing history...</p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Account #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Current Amount Due</TableHead>
                      <TableHead>Water Usage</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.length > 0 ? (
                      filteredBills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell>{bill.id}</TableCell>
                          <TableCell>{bill.customerName}</TableCell>
                          <TableCell>{bill.accountNumber}</TableCell>
                          <TableCell>{formatDate(bill.date)}</TableCell>
                          <TableCell>{formatDate(bill.dueDate)}</TableCell>
                          <TableCell>{formatCurrency(bill.amount)}</TableCell>
                          <TableCell>{formatCurrency(bill.currentAmountDue ?? bill.amount)}</TableCell>
                          <TableCell>{bill.waterUsage ? `${bill.waterUsage} m³` : "N/A"}</TableCell>
                          <TableCell>{getStatusBadge(bill.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No bills found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BillingHistory;
