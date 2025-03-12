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

interface Bill {
  id: string;
  customerId: string;
  customerName: string;
  accountNumber: string;
  date: string;
  amount: number;
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
      const { collection, getDocs, query, orderBy } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../../lib/firebase");

      const billsQuery = query(
        collection(db, "bills"),
        orderBy("date", "desc"),
      );

      const billsSnapshot = await getDocs(billsQuery);
      const billsList = billsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bill[];

      if (billsList.length > 0) {
        setBills(billsList);
      } else {
        // Fallback to mock data
        setBills([
          {
            id: "BILL-001",
            customerId: "cust-1",
            customerName: "John Doe",
            accountNumber: "WB-10001",
            date: "2023-07-01",
            amount: 78.5,
            status: "paid",
            dueDate: "2023-07-15",
            description: "Monthly water bill",
            waterUsage: 2450,
          },
          {
            id: "BILL-002",
            customerId: "cust-2",
            customerName: "Jane Smith",
            accountNumber: "WB-10002",
            date: "2023-07-01",
            amount: 65.75,
            status: "pending",
            dueDate: "2023-07-15",
            description: "Monthly water bill",
            waterUsage: 1950,
          },
          {
            id: "BILL-003",
            customerId: "cust-3",
            customerName: "Robert Johnson",
            accountNumber: "WB-10003",
            date: "2023-06-01",
            amount: 85.2,
            status: "overdue",
            dueDate: "2023-06-15",
            description: "Monthly water bill",
            waterUsage: 2650,
          },
          {
            id: "BILL-004",
            customerId: "cust-4",
            customerName: "Sarah Williams",
            accountNumber: "WB-10004",
            date: "2023-06-01",
            amount: 92.25,
            status: "paid",
            dueDate: "2023-06-15",
            description: "Monthly water bill",
            waterUsage: 2850,
          },
          {
            id: "BILL-005",
            customerId: "cust-5",
            customerName: "Michael Brown",
            accountNumber: "WB-10005",
            date: "2023-05-01",
            amount: 45.0,
            status: "paid",
            dueDate: "2023-05-15",
            description: "Monthly water bill",
            waterUsage: 1250,
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching billing history:", error);
      // Fallback to mock data
      setBills([
        {
          id: "BILL-001",
          customerId: "cust-1",
          customerName: "John Doe",
          accountNumber: "WB-10001",
          date: "2023-07-01",
          amount: 78.5,
          status: "paid",
          dueDate: "2023-07-15",
          description: "Monthly water bill",
          waterUsage: 2450,
        },
        {
          id: "BILL-002",
          customerId: "cust-2",
          customerName: "Jane Smith",
          accountNumber: "WB-10002",
          date: "2023-07-01",
          amount: 65.75,
          status: "pending",
          dueDate: "2023-07-15",
          description: "Monthly water bill",
          waterUsage: 1950,
        },
      ]);
    } finally {
      setLoading(false);
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
      currency: "PHP",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-500 border-yellow-500"
          >
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

    const matchesStatus =
      statusFilter === "all" || bill.status === statusFilter;

    let matchesDate = true;
    if (dateFilter !== "all") {
      const billDate = new Date(bill.date);
      const now = new Date();
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      if (dateFilter === "current-month") {
        matchesDate =
          billDate.getMonth() === now.getMonth() &&
          billDate.getFullYear() === now.getFullYear();
      } else if (dateFilter === "last-month") {
        matchesDate =
          billDate.getMonth() === monthAgo.getMonth() &&
          billDate.getFullYear() === monthAgo.getFullYear();
      } else if (dateFilter === "last-3-months") {
        matchesDate = billDate >= threeMonthsAgo;
      } else if (dateFilter === "last-6-months") {
        matchesDate = billDate >= sixMonthsAgo;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">
              Billing History
            </h1>
            <p className="text-gray-600 mt-1">
              View and manage all customer billing records
            </p>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Bills</CardTitle>
            <CardDescription>
              Complete history of all bills generated in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by customer name, account number, or bill ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="w-40">
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-40">
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="current-month">
                          Current Month
                        </SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="last-3-months">
                          Last 3 Months
                        </SelectItem>
                        <SelectItem value="last-6-months">
                          Last 6 Months
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setDateFilter("all");
                    }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
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
                      <TableHead>Water Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.length > 0 ? (
                      filteredBills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">
                            {bill.id}
                          </TableCell>
                          <TableCell>{bill.customerName}</TableCell>
                          <TableCell>{bill.accountNumber}</TableCell>
                          <TableCell>{formatDate(bill.date)}</TableCell>
                          <TableCell>{formatDate(bill.dueDate)}</TableCell>
                          <TableCell>{formatCurrency(bill.amount)}</TableCell>
                          <TableCell>
                            {bill.waterUsage ? `${bill.waterUsage} gal` : "N/A"}
                          </TableCell>
                          <TableCell>{getStatusBadge(bill.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Mail className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-8 text-gray-500"
                        >
                          No bills found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-sm text-gray-500">
              Showing {filteredBills.length} of {bills.length} bills
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default BillingHistory;
