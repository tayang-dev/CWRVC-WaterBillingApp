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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
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
import GenerateBillForm from "./GenerateBillForm";

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
  };
  billingHistory?: Array<{
    id: string;
    date: string;
    amount: number;
    status: "paid" | "pending" | "overdue";
    dueDate: string;
  }>;
  paymentTracking?: Array<{
    id: string;
    date: string;
    amount: number;
    method: string;
    status: "completed" | "processing" | "failed";
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
  },
  billingHistory = [
    {
      id: "BILL-001",
      date: "2023-04-01",
      amount: 78.5,
      status: "paid",
      dueDate: "2023-04-15",
    },
    {
      id: "BILL-002",
      date: "2023-05-01",
      amount: 82.75,
      status: "pending",
      dueDate: "2023-05-15",
    },
    {
      id: "BILL-003",
      date: "2023-06-01",
      amount: 85.2,
      status: "overdue",
      dueDate: "2023-06-15",
    },
  ],
  paymentTracking = [
    {
      id: "PAY-001",
      date: "2023-04-10",
      amount: 78.5,
      method: "Credit Card",
      status: "completed",
    },
    {
      id: "PAY-002",
      date: "2023-05-12",
      amount: 82.75,
      method: "Bank Transfer",
      status: "processing",
    },
    {
      id: "PAY-003",
      date: "2023-06-18",
      amount: 85.2,
      method: "Credit Card",
      status: "failed",
    },
  ],
}) => {
  const [isGenerateBillDialogOpen, setIsGenerateBillDialogOpen] =
    useState(true);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [paymentTracking, setPaymentTracking] = useState<any[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Fetch billing history from Firestore
  useEffect(() => {
    const fetchBillingHistory = async () => {
      if (!customer?.id) return;

      try {
        const { collection, query, where, orderBy, getDocs } = await import(
          "firebase/firestore"
        );
        const { db } = await import("../../lib/firebase");

        const billsQuery = query(
          collection(db, "bills"),
          where("customerId", "==", customer.id),
          orderBy("date", "desc"),
        );

        const billsSnapshot = await getDocs(billsQuery);
        const billsList = billsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          status: doc.data().status || "pending",
        }));

        setBillingHistory(
          billsList.length > 0
            ? billsList
            : [
                {
                  id: "BILL-001",
                  date: "2023-04-01",
                  amount: 78.5,
                  status: "paid",
                  dueDate: "2023-04-15",
                },
                {
                  id: "BILL-002",
                  date: "2023-05-01",
                  amount: 82.75,
                  status: "pending",
                  dueDate: "2023-05-15",
                },
                {
                  id: "BILL-003",
                  date: "2023-06-01",
                  amount: 85.2,
                  status: "overdue",
                  dueDate: "2023-06-15",
                },
              ],
        );
      } catch (error) {
        console.error("Error fetching billing history:", error);
        // Fallback to mock data
        setBillingHistory([
          {
            id: "BILL-001",
            date: "2023-04-01",
            amount: 78.5,
            status: "paid",
            dueDate: "2023-04-15",
          },
          {
            id: "BILL-002",
            date: "2023-05-01",
            amount: 82.75,
            status: "pending",
            dueDate: "2023-05-15",
          },
          {
            id: "BILL-003",
            date: "2023-06-01",
            amount: 85.2,
            status: "overdue",
            dueDate: "2023-06-15",
          },
        ]);
      } finally {
        setLoadingBills(false);
      }
    };

    const fetchPaymentTracking = async () => {
      if (!customer?.id) return;

      try {
        const { collection, query, where, orderBy, getDocs } = await import(
          "firebase/firestore"
        );
        const { db } = await import("../../lib/firebase");

        const paymentsQuery = query(
          collection(db, "payments"),
          where("customerId", "==", customer.id),
          orderBy("date", "desc"),
        );

        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentsList = paymentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          status: doc.data().status || "completed",
        }));

        setPaymentTracking(
          paymentsList.length > 0
            ? paymentsList
            : [
                {
                  id: "PAY-001",
                  date: "2023-04-10",
                  amount: 78.5,
                  method: "Credit Card",
                  status: "completed",
                },
                {
                  id: "PAY-002",
                  date: "2023-05-12",
                  amount: 82.75,
                  method: "Bank Transfer",
                  status: "processing",
                },
                {
                  id: "PAY-003",
                  date: "2023-06-18",
                  amount: 85.2,
                  method: "Credit Card",
                  status: "failed",
                },
              ],
        );
      } catch (error) {
        console.error("Error fetching payment tracking:", error);
        // Fallback to mock data
        setPaymentTracking([
          {
            id: "PAY-001",
            date: "2023-04-10",
            amount: 78.5,
            method: "Credit Card",
            status: "completed",
          },
          {
            id: "PAY-002",
            date: "2023-05-12",
            amount: 82.75,
            method: "Bank Transfer",
            status: "processing",
          },
          {
            id: "PAY-003",
            date: "2023-06-18",
            amount: 85.2,
            method: "Credit Card",
            status: "failed",
          },
        ]);
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchBillingHistory();
    fetchPaymentTracking();
  }, [customer?.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-500 border-yellow-500"
          >
            Pending
          </Badge>
        );
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "processing":
        return (
          <Badge variant="outline" className="text-blue-500 border-blue-500">
            Processing
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="w-full p-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customer Details</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog
            open={isGenerateBillDialogOpen}
            onOpenChange={setIsGenerateBillDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    // Generate a new bill in Firestore
                    const { collection, addDoc } = await import(
                      "firebase/firestore"
                    );
                    const { db } = await import("../../lib/firebase");

                    const billData = {
                      customerId: customer.id,
                      date: new Date().toISOString().split("T")[0],
                      amount: 87.5, // This would be calculated based on usage
                      status: "pending",
                      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split("T")[0], // 30 days from now
                      description: "Monthly water bill",
                      billingPeriodStart: new Date(
                        Date.now() - 30 * 24 * 60 * 60 * 1000,
                      )
                        .toISOString()
                        .split("T")[0],
                      billingPeriodEnd: new Date().toISOString().split("T")[0],
                      waterUsage: 2450, // gallons
                    };

                    const docRef = await addDoc(
                      collection(db, "bills"),
                      billData,
                    );
                    console.log("Bill generated with ID:", docRef.id);

                    // Refresh billing history
                    const billsQuery = await import("firebase/firestore").then(
                      ({ collection, query, where, orderBy, getDocs }) => {
                        return query(
                          collection(db, "bills"),
                          where("customerId", "==", customer.id),
                          orderBy("date", "desc"),
                        );
                      },
                    );

                    const billsSnapshot = await getDocs(billsQuery);
                    const billsList = billsSnapshot.docs.map((doc) => ({
                      id: doc.id,
                      ...doc.data(),
                    }));

                    setBillingHistory(billsList);

                    // Close the dialog
                    setIsGenerateBillDialogOpen(false);
                  } catch (error) {
                    console.error("Error generating bill:", error);
                  }
                }}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Generate Bill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <GenerateBillForm
                customerId={customer.id}
                customerName={customer.name}
                accountNumber={customer.accountNumber}
                onSubmit={async (data) => {
                  // Refresh billing history after generating bill
                  try {
                    const { collection, query, where, orderBy, getDocs } =
                      await import("firebase/firestore");
                    const { db } = await import("../../lib/firebase");

                    const billsQuery = query(
                      collection(db, "bills"),
                      where("customerId", "==", customer.id),
                      orderBy("date", "desc"),
                    );

                    const billsSnapshot = await getDocs(billsQuery);
                    const billsList = billsSnapshot.docs.map((doc) => ({
                      id: doc.id,
                      ...doc.data(),
                    }));

                    setBillingHistory(billsList);
                    setIsGenerateBillDialogOpen(false);
                  } catch (error) {
                    console.error("Error refreshing billing history:", error);
                  }
                }}
                onCancel={() => setIsGenerateBillDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
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
          <CardFooter className="flex justify-end">
            <Button variant="outline" size="sm">
              <Mail className="mr-2 h-4 w-4" />
              Contact
            </Button>
          </CardFooter>
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
                  {formatCurrency(85.2)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Due on {formatDate("2023-07-15")}
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
                  {formatCurrency(78.5)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Received on {formatDate("2023-04-10")}
                </p>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-amber-700">
                    Average Usage
                  </h3>
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
                <p className="text-2xl font-bold text-amber-700">2,450 gal</p>
                <p className="text-xs text-amber-600 mt-1">
                  Last 3 months average
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="billing" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="billing">Billing History</TabsTrigger>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
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
                      <th className="text-left py-3 px-4 font-medium">
                        Bill ID
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Due Date
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((bill) => (
                      <tr key={bill.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{bill.id}</td>
                        <td className="py-3 px-4">{formatDate(bill.date)}</td>
                        <td className="py-3 px-4">
                          {formatCurrency(bill.amount)}
                        </td>
                        <td className="py-3 px-4">
                          {formatDate(bill.dueDate)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(bill.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-gray-500">
                Showing {billingHistory.length} of {billingHistory.length} bills
              </p>
              <Button variant="outline" size="sm">
                View All Bills
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Tracking</CardTitle>
              <CardDescription>
                Monitor payment history and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">
                        Payment ID
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Method
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentTracking.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">{payment.id}</td>
                        <td className="py-3 px-4">
                          {formatDate(payment.date)}
                        </td>
                        <td className="py-3 px-4">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="py-3 px-4">{payment.method}</td>
                        <td className="py-3 px-4">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-gray-500">
                Showing {paymentTracking.length} of {paymentTracking.length}{" "}
                payments
              </p>
              <Button variant="outline" size="sm">
                View All Payments
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDetails;
