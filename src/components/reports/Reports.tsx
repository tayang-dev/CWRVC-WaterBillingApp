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

interface LeakReport {
  id: string;
  accountNumber: string;
  address: string;
  imageUrl: string;
  leakDescription: string;
  timestamp: any;
  uniqueUserId: string;
}

interface ReportsProps {}

const Reports = ({}: ReportsProps) => {
  const [leakReports, setLeakReports] = useState<LeakReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<LeakReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [selectedReport, setSelectedReport] = useState<LeakReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    withImages: 0,
    addressMissing: 0,
    lastWeek: 0,
    lastMonth: 0
  });

  // Fetch leak reports from Firestore
  useEffect(() => {
    const fetchLeakReports = async () => {
      try {
        const { collection, query, orderBy, getDocs } = await import(
          "firebase/firestore"
        );
        const { db } = await import("../../lib/firebase");

        const leaksQuery = query(
          collection(db, "leaks"),
          orderBy("timestamp", "desc")
        );

        const leaksSnapshot = await getDocs(leaksQuery);
        const leaksList = leaksSnapshot.docs.map((doc) => ({
          id: doc.id,
          accountNumber: doc.data().accountNumber || "",
          address: doc.data().address || "Address not available",
          imageUrl: doc.data().imageUrl || "",
          leakDescription: doc.data().leakDescription || "",
          timestamp: doc.data().timestamp?.toDate() || new Date(),
          uniqueUserId: doc.data().uniqueUserId || "",
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
          lastMonth: leaksList.filter(report => report.timestamp >= oneMonthAgo).length
        };
        
        setStats(stats);
      } catch (error) {
        console.error("Error fetching leak reports:", error);
        // Fallback to empty array if there's an error
        setLeakReports([]);
        setFilteredReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeakReports();
  }, []);

  // Filter function
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...leakReports];
      
      // Apply search term
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
      
      setFilteredReports(filtered);
    };
    
    applyFilters();
  }, [leakReports, searchTerm, dateRange]);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setDateRange("all");
  };
  
  // Handle view details
  const handleViewDetails = (report: LeakReport) => {
    setSelectedReport(report);
    setShowDetails(true);
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Format time
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Handle export to CSV
  const exportToCSV = () => {
    if (filteredReports.length === 0) return;
    
    const headers = ["Account Number", "Address", "Description", "User ID", "Date"];
    const csvContent = [
      headers.join(","),
      ...filteredReports.map(report => [
        report.accountNumber,
        `"${report.address.replace(/"/g, '""')}"`, // Escape quotes in CSV
        `"${report.leakDescription.replace(/"/g, '""')}"`,
        report.uniqueUserId,
        formatDate(report.timestamp)
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leak-reports-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">Leak Reports</h1>
            <p className="text-gray-600 mt-1">Manage and analyze customer reported leaks</p>
          </div>
          <Button 
            onClick={exportToCSV}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={filteredReports.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Reports
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <BarChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="leak-reports">
              <MapPin className="h-4 w-4 mr-2" />
              Leak Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Total Reports</CardTitle>
                  <CardDescription>All leak reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Reports with Images</CardTitle>
                  <CardDescription>Visual documentation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.withImages}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats.total ? ((stats.withImages / stats.total) * 100).toFixed(1) : 0}% of total
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Last 7 Days</CardTitle>
                  <CardDescription>Recent reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.lastWeek}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Last 30 Days</CardTitle>
                  <CardDescription>Monthly trend</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{stats.lastMonth}</div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report Distribution</CardTitle>
                  <CardDescription>Timeline of reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-60 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>Timeline visualization will be implemented here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
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
                        <span className="text-sm font-medium">
                          {stats.total - stats.addressMissing}
                        </span>
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
                        <span className="text-sm font-medium">
                          {stats.addressMissing}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leak-reports">
            <Card>
              <CardHeader>
                <CardTitle>Leak Reports</CardTitle>
                <CardDescription>View and filter all reported leaks</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by account, address, or description..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={handleSearch}
                      />
                    </div>
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
                    
                    <Button variant="outline" onClick={resetFilters} className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>
                
                {/* Results */}
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <p>Loading leak reports...</p>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium">No leak reports found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account #</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Has Image</TableHead>
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
                            <TableCell>{formatDate(report.timestamp)}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleViewDetails(report)}
                              >
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
                  <span>Showing {filteredReports.length} of {leakReports.length} reports</span>
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
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold">Leak Report</h2>
                    <p className="text-sm text-gray-500">Account: {selectedReport.accountNumber}</p>
                  </div>
                  <Badge className="bg-blue-500">
                    {formatDate(selectedReport.timestamp)}
                  </Badge>
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
                  <div className="p-4 bg-gray-50 rounded-md">
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
                
                <div className="pt-4 border-t">
                  <Button className="mt-2" variant="outline">
                    Mark as Resolved
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Reports;