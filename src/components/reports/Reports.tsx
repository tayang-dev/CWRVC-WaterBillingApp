import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Search, Filter, MapPin, BarChart, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Textarea } from "../ui/textarea";

interface LeakReport {
  id: string;
  accountNumber: string;
  address: string;
  imageUrl: string;
  leakDescription: string;
  timestamp: any;
  uniqueUserId: string;
  resolved?: boolean;
  rejected?: boolean;
}

interface ReportsProps {}

const Reports = ({}: ReportsProps) => {
  const [leakReports, setLeakReports] = useState<LeakReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<LeakReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all");
  // New state for status filtering: "all", "resolved", "pending", or "rejected"
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<LeakReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  // New state for confirmation dialog; "resolved" or "rejected"
  const [confirmAction, setConfirmAction] = useState<"resolved" | "rejected" | null>(null);
  const [remarks, setRemarks] = useState("");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    withImages: 0,
    addressMissing: 0,
    lastWeek: 0,
    lastMonth: 0,
    rejected: 0,
  });

  // Real-time subscription to leak reports
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    (async () => {
      try {
        const { collection, query, orderBy, onSnapshot } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");

        const leaksQuery = query(
          collection(db, "leaks"),
          orderBy("timestamp", "desc")
        );

        unsubscribe = onSnapshot(leaksQuery, (leaksSnapshot) => {
          const leaksList = leaksSnapshot.docs.map((doc) => ({
            id: doc.id,
            accountNumber: doc.data().accountNumber || "",
            address: doc.data().address || "Address not available",
            imageUrl: doc.data().imageUrl || "",
            leakDescription: doc.data().leakDescription || "",
            timestamp: doc.data().timestamp?.toDate() || new Date(),
            uniqueUserId: doc.data().uniqueUserId || "",
            resolved: doc.data().resolved || false,
            rejected: doc.data().rejected || false,
          }));

          setLeakReports(leaksList);
          setFilteredReports(leaksList);

          // Calculate stats
          const now = new Date();
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(now.getDate() - 7);
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(now.getMonth() - 1);

          const stats = {
            total: leaksList.length,
            withImages: leaksList.filter(report => report.imageUrl && report.imageUrl !== "").length,
            addressMissing: leaksList.filter(report => report.address === "Address not available").length,
            lastWeek: leaksList.filter(report => report.timestamp >= oneWeekAgo).length,
            lastMonth: leaksList.filter(report => report.timestamp >= oneMonthAgo).length,
            rejected: leaksList.filter(report => report.rejected).length,
          };

          setStats(stats);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error fetching leak reports:", error);
        setLeakReports([]);
        setFilteredReports([]);
        setLoading(false);
      }
    })();

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter function
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...leakReports];

      // Apply search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (report) =>
            report.accountNumber.toLowerCase().includes(term) ||
            report.address.toLowerCase().includes(term) ||
            report.leakDescription.toLowerCase().includes(term) ||
            report.uniqueUserId.toLowerCase().includes(term)
        );
      }

      // Apply date range filter
      if (dateRange !== "all") {
        const now = new Date();
        let cutoffDate = new Date();

        switch (dateRange) {
          case "today":
            cutoffDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case "month":
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
          case "quarter":
            cutoffDate.setMonth(now.getMonth() - 3);
            break;
        }

        filtered = filtered.filter(
          (report) => new Date(report.timestamp) >= cutoffDate
        );
      }

      // Apply status filter
      if (statusFilter !== "all") {
        filtered = filtered.filter((report) => {
          if (statusFilter === "resolved") {
            return report.resolved;
          } else if (statusFilter === "rejected") {
            return report.rejected;
          } else if (statusFilter === "pending") {
            return !report.resolved && !report.rejected;
          }
          return true;
        });
      }

      setFilteredReports(filtered);
    };

    applyFilters();
  }, [leakReports, searchTerm, dateRange, statusFilter]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setDateRange("all");
    setStatusFilter("all");
  };

  const handleViewDetails = (report: LeakReport) => {
    setSelectedReport(report);
    setShowDetails(true);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimestamp = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
      timeZone: "Asia/Singapore",
    };
    const dateTimeString = date.toLocaleString("en-US", options);
    return dateTimeString.replace(",", " at") + " UTC+8";
  };

  // Functions that perform the status update and save notifications.
const performMarkAsResolved = async (remarks: string) => {
  if (!selectedReport) return;
  try {
    const { updateDoc, doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const { db } = await import("../../lib/firebase");

    await updateDoc(doc(db, "leaks", selectedReport.id), {
      resolved: true,
      rejected: false,
      remarks: remarks || null,
    });

    setLeakReports((prev) =>
      prev.map((report) =>
        report.id === selectedReport.id ? { ...report, resolved: true, rejected: false, remarks } : report
      )
    );

    await setDoc(
      doc(
        db,
        "notifications",
        selectedReport.accountNumber,
        "records",
        selectedReport.id
      ),
      {
        timestamp: serverTimestamp(),
        accountNumber: selectedReport.accountNumber,
        description: "Report marked as resolved",
        status: "resolved",
        type: "report",
        verificationId: selectedReport.id,
        remarks: remarks || null,
      }
    );

    setShowDetails(false);
  } catch (error) {
    console.error("Error marking report as resolved:", error);
  }
};

const performMarkAsRejected = async (remarks: string) => {
  if (!selectedReport) return;
  try {
    const { updateDoc, doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const { db } = await import("../../lib/firebase");

    await updateDoc(doc(db, "leaks", selectedReport.id), {
      rejected: true,
      resolved: false,
      remarks: remarks || null,
    });

    setLeakReports((prev) =>
      prev.map((report) =>
        report.id === selectedReport.id ? { ...report, rejected: true, resolved: false, remarks } : report
      )
    );

    await setDoc(
      doc(
        db,
        "notifications",
        selectedReport.accountNumber,
        "records",
        selectedReport.id
      ),
      {
        timestamp: serverTimestamp(),
        accountNumber: selectedReport.accountNumber,
        description: "Report marked as rejected",
        status: "rejected",
        type: "report",
        verificationId: selectedReport.id,
        remarks: remarks || null,
      }
    );

    setShowDetails(false);
  } catch (error) {
    console.error("Error marking report as rejected:", error);
  }
};

  

  // Wrap the actions in confirmation dialogs.
  const handleConfirmAction = (action: "resolved" | "rejected") => {
    setConfirmAction(action);
  };


  
  const onConfirmAction = async () => {
    if (confirmAction === "resolved") {
      await performMarkAsResolved(remarks);
    } else if (confirmAction === "rejected") {
      await performMarkAsRejected(remarks);
    }
  
    setConfirmAction(null);
    setRemarks(""); // clear the remarks after action
  };
  
  

  const onCancelAction = () => {
    setConfirmAction(null);
  };

  const exportToCSV = () => {
    if (filteredReports.length === 0) return;

    const headers = ["Account Number", "Address", "Description", "User ID", "Date"];
    const csvContent = [
      headers.join(","),
      ...filteredReports.map(report =>
        [
          report.accountNumber,
          `"${report.address.replace(/"/g, '""')}"`,
          `"${report.leakDescription.replace(/"/g, '""')}"`,
          report.uniqueUserId,
          formatDate(report.timestamp)
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leak-reports-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resolvedCount = leakReports.filter((report) => report.resolved).length;

  const getReportDistributionData = (reports: LeakReport[]) => {
    const data: { date: string; count: number }[] = [];
    const dateMap: { [key: string]: number } = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dateMap[key] = 0;
    }
    reports.forEach((report) => {
      const d = new Date(report.timestamp);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (key in dateMap) {
        dateMap[key]++;
      }
    });
    for (const key in dateMap) {
      data.push({ date: key, count: dateMap[key] });
    }
    return data;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-800">Leak Reports</h1>
            <p className="text-gray-600 mt-1">Manage and analyze customer reported leaks</p>
          </div>
          <Button
            onClick={exportToCSV}
            className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700"
            disabled={filteredReports.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Reports
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="mb-4 border-b">
            <TabsTrigger value="overview" className="px-4 py-2">
              <BarChart className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="leak-reports" className="px-4 py-2">
              <MapPin className="mr-2 h-4 w-4" />
              Leak Reports
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="shadow-lg rounded-lg text-center">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base font-medium">Total Reports</CardTitle>
                  <CardDescription className="text-sm">All leak reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                </CardContent>
              </Card>

              <Card className="shadow-lg rounded-lg text-center">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base font-medium">With Images</CardTitle>
                  <CardDescription className="text-sm">Visual documentation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.withImages}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.total ? ((stats.withImages / stats.total) * 100).toFixed(1) : 0}%
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg rounded-lg text-center">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base font-medium">Last 7 Days</CardTitle>
                  <CardDescription className="text-sm">Recent reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.lastWeek}</div>
                </CardContent>
              </Card>

              <Card className="shadow-lg rounded-lg text-center">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base font-medium">Last 30 Days</CardTitle>
                  <CardDescription className="text-sm">Monthly trend</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.lastMonth}</div>
                </CardContent>
              </Card>

              <Card className="shadow-lg rounded-lg text-center">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base font-medium">Resolved</CardTitle>
                  <CardDescription className="text-sm">Marked as resolved</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
                </CardContent>
              </Card>

              <Card className="shadow-lg rounded-lg text-center">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-base font-medium">Rejected</CardTitle>
                  <CardDescription className="text-sm">Marked as rejected</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-lg rounded-lg">
                <CardHeader>
                  <CardTitle>Report Distribution</CardTitle>
                  <CardDescription>Timeline of reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getReportDistributionData(leakReports)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#8884d8" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg rounded-lg">
                <CardHeader>
                  <CardTitle>Address Distribution</CardTitle>
                  <CardDescription>Reports by location</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>With Address</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${stats.total ? ((stats.total - stats.addressMissing) / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats.total - stats.addressMissing}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span>Missing Address</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${stats.total ? (stats.addressMissing / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats.addressMissing}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leak Reports Tab */}
          <TabsContent value="leak-reports" className="space-y-6">
            <Card className="shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle>Leak Reports</CardTitle>
                <CardDescription>View and filter all reported leaks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by account, address, or description..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={handleSearch}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                        <SelectItem value="quarter">Last 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={resetFilters} className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Results */}
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-gray-600">Loading leak reports...</p>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium">No leak reports found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="rounded-md border shadow-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account #</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Has Image</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date Reported</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium">{report.accountNumber}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{report.address}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{report.leakDescription}</TableCell>
                            <TableCell>
                              {report.imageUrl ? (
                                <Badge className="bg-green-500">Yes</Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {report.rejected ? (
                                <Badge className="bg-red-500">Rejected</Badge>
                              ) : report.resolved ? (
                                <Badge className="bg-green-500">Resolved</Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(report.timestamp)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleViewDetails(report)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
                  <span>
                    Showing {filteredReports.length} of {leakReports.length} reports
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Report Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Leak Report Details</DialogTitle>
              <p className="text-sm text-gray-600">
                Review the details below before confirming any actions.
              </p>
            </DialogHeader>
            {selectedReport && (
              <div className="max-h-[70vh] overflow-y-auto space-y-6 p-4">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h2 className="text-2xl font-semibold">Leak Report</h2>
                    <p className="text-sm text-gray-500">Account: {selectedReport.accountNumber}</p>
                  </div>
                  <Badge className="bg-blue-500 text-white p-2 rounded">{formatDate(selectedReport.timestamp)}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Address</h3>
                    <p>{selectedReport.address}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Time Submitted</h3>
                    <p>{formatTime(selectedReport.timestamp)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">User ID</h3>
                    <p className="truncate">{selectedReport.uniqueUserId}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <div className="p-4 bg-gray-50 rounded-md border">
                    <p className="whitespace-pre-line">{selectedReport.leakDescription}</p>
                  </div>
                </div>

                {selectedReport.imageUrl && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Image</h3>
                    <div className="border rounded-md overflow-hidden">
                      <img
                        src={selectedReport.imageUrl}
                        alt="Leak Report"
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleConfirmAction("resolved")}
                    className="mt-2"
                    disabled={!!confirmAction || selectedReport?.resolved || selectedReport?.rejected}
                  >
                    Mark as Resolved
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleConfirmAction("rejected")}
                    className="mt-2"
                    disabled={!!confirmAction || selectedReport?.resolved || selectedReport?.rejected}
                  >
                    Mark as Rejected
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {confirmAction && (
  <Dialog open={true} onOpenChange={() => setConfirmAction(null)}>
    <DialogContent className="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>Are you sure?</DialogTitle>
        <p className="text-sm text-gray-600">
          {confirmAction === "resolved"
            ? "Do you really want to mark this report as resolved? This action cannot be undone."
            : "Do you really want to mark this report as rejected? This action cannot be undone."}
        </p>
      </DialogHeader>

      <Textarea
        className="mt-4"
        placeholder="Optional remarks..."
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
      />

      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={onCancelAction}>
          Cancel
        </Button>
        <Button variant="default" onClick={onConfirmAction}>
          Confirm
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)}

      </div>
    </div>
  );
};

export default Reports;
