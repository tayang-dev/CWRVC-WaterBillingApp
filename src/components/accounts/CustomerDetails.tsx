import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase"; // Ensure correct path to `firebase.ts`

import {
  FileText,
  Mail,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Send,
} from "lucide-react";

interface CustomerDetailsProps {
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    accountNumber: string;
    status: "active" | "inactive" | "pending";
    joinDate: string;
    lastBillingDate?: string;
    lastReading?: number;
    amountDue?: number;
  };
  billingHistory?: Array<{
    billNumber: string;
    id: string;
    date: string;
    amount: number;
    status: "paid" | "pending" | "overdue";
    dueDate: string;
    waterUsage?: number;
  }>;
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({
  customer = {
    id: "CUST-001",
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "(555) 123-4567",
    address: "123 Main St, Anytown, USA 12345",
    accountNumber: "ACC-10001",
    status: "active",
    joinDate: "2022-05-15",
    lastBillingDate: "",
    lastReading: 0,
    amountDue: 0,
  },
  billingHistory = [],
}) => {
  const [isGenerateBillDialogOpen, setIsGenerateBillDialogOpen] = useState(false);
  const [customerBills, setCustomerBills] = useState(billingHistory);
  const [loading, setLoading] = useState(true);
  const [accountSummary, setAccountSummary] = useState({
    currentBalance: 0,
    dueDate: "",
    lastPayment: 0,
    lastPaymentDate: "",
    averageUsage: 0,
  });

  useEffect(() => {
    const fetchCustomerBills = async () => {
      if (!customer?.accountNumber) return;
    
      setLoading(true);
      try {
        const billsCollection = collection(db, "bills", customer.accountNumber, "records");
        const billsQuery = query(billsCollection, orderBy("date", "desc"));
        const billsSnapshot = await getDocs(billsQuery);
    
        const fetchedBills = billsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            date: data.date || "",
            amount: data.amount || 0,
            amountAfterDue: data.amountAfterDue || 0,
            currentAmountDue: data.currentAmountDue ?? data.amount, // ✅ Ensure correct outstanding balance
            status: data.status || "pending",
            dueDate: data.dueDate || "",
            billingPeriod: data.billingPeriod || "",
            billNumber: data.billNumber || "",
            waterUsage: data.waterUsage || data.meterReading?.consumption || 0,
            penalty: data.penalty || 0,
            tax: data.tax || 0,
            seniorDiscount: data.seniorDiscount || 0,
            waterCharge: data.waterCharge || 0,
            waterChargeBeforeTax: data.waterChargeBeforeTax || 0,
          };
        });
    
        setCustomerBills(fetchedBills);
    
        // **Calculate Account Summary**
        const pendingBill = fetchedBills.find((bill) => bill.status === "pending" || bill.status === "overdue");
        const lastPaidBill = fetchedBills.find((bill) => bill.status === "paid");
        const last3Bills = fetchedBills.slice(0, 3);
        const avgUsage = last3Bills.reduce((sum, bill) => sum + (bill.waterUsage || 0), 0) / (last3Bills.length || 1);
    
        setAccountSummary({
          currentBalance: pendingBill ? pendingBill.currentAmountDue! : 0,
          dueDate: pendingBill ? pendingBill.dueDate : "",
          lastPayment: lastPaidBill ? lastPaidBill.amount : 0,
          lastPaymentDate: lastPaidBill ? lastPaidBill.date : "",
          averageUsage: avgUsage,
        });
      } catch (error) {
        console.error("Error fetching customer bills:", error);
        setAccountSummary({
          currentBalance: customer.amountDue || 0,
          dueDate: "",
          lastPayment: 0,
          lastPaymentDate: "",
          averageUsage: customer.lastReading || 0,
        });
      } finally {
        setLoading(false);
      }
    };
    

    fetchCustomerBills();
  }, [customer?.id, customer?.amountDue, customer?.lastReading]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500">
            Pending
          </Badge>
        );
      case "paid":
        return <Badge variant="outline" className="text-green-500 border-green-500">Paid</Badge>;
        case "partially paid": // New case for "Partially Paid"
        return (
          <Badge variant="outline" className="text-blue-500 border-blue-500">
            Partially Paid
          </Badge>
        );
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
  
    // Check if the date is in "DD/MM/YYYY" format
    if (/\d{2}\/\d{2}\/\d{4}/.test(dateString)) {
      const [day, month, year] = dateString.split("/").map(Number); // Split and convert to numbers
      const parsedDate = new Date(year, month - 1, day); // Create a valid Date object
      return parsedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  
    // Handle other formats (e.g., ISO string or timestamp)
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date"; // Check if the date is invalid
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  return (
    <div className="w-full p-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customer Details</h1>
        <div className="flex gap-2">

          
          
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span>{getStatusBadge(customer.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Name</span>
                <span>{customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-blue-600">{customer.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Phone</span>
                <span>{customer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Address</span>
                <span className="text-right">{customer.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Account #</span>
                <span>{customer.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Join Date</span>
                <span>{formatDate(customer.joinDate)}</span>
              </div>
            </div>
          </CardContent>

        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
            <CardDescription>
              Overview of billing and payment status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-blue-700">
                    Current Balance
                  </h3>
                  <AlertCircle className="h-5 w-5 text-blue-700" />
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(accountSummary.currentBalance)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {accountSummary.dueDate 
                    ? `Due on ${formatDate(accountSummary.dueDate)}` 
                    : "No pending bills"}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-green-700">
                    Last Payment
                  </h3>
                  <CheckCircle className="h-5 w-5 text-green-700" />
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(accountSummary.lastPayment)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {accountSummary.lastPaymentDate 
                    ? `Received on ${formatDate(accountSummary.lastPaymentDate)}` 
                    : "No payment history"}
                </p>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-amber-700">
                    Average Usage
                  </h3>
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
                <p className="text-2xl font-bold text-amber-700">
                  {accountSummary.averageUsage.toFixed(1)} m³
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Recent billing period
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="billing" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="billing">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View all past and current bills</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Bill ID</th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 font-medium">Water Usage</th>
                      <th className="text-left py-3 px-4 font-medium">Due Date</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          Loading billing history...
                        </td>
                      </tr>
                    ) : customerBills.length > 0 ? (
                      customerBills.map((bill) => (
                        <tr key={bill.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{bill.billNumber}</td>
                          <td className="py-3 px-4">{formatDate(bill.date)}</td>
                          <td className="py-3 px-4">{formatCurrency(bill.amount)}</td>
                          <td className="py-3 px-4">{bill.waterUsage ? `${bill.waterUsage} m³` : "N/A"}</td>
                          <td className="py-3 px-4">{formatDate(bill.dueDate)}</td>
                          <td className="py-3 px-4">{getStatusBadge(bill.status)}</td>
                          <td className="py-3 px-4 text-right">

                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          No billing history found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-gray-500">Showing {customerBills.length} bills</p>
              
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDetails;