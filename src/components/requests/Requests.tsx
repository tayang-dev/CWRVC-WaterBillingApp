import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Search, Filter, FileText, BarChart } from "lucide-react";
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

interface ServiceRequest {
  id: string;
  serviceId: string;
  accountNumber: string;
  type: string;
  subject: string;
  description: string;
  email: string;
  status: string;
  timestamp: any;
}

interface RequestsProps {}

const Requests = ({}: RequestsProps) => {
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    leakReports: 0,
    billingIssues: 0,
    serviceInterruptions: 0,
    other: 0
  });

  // Fetch service requests from Firestore
  useEffect(() => {
    const fetchServiceRequests = async () => {
      try {
        const { collection, query, orderBy, getDocs } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");

        const requestsQuery = query(
          collection(db, "requests"),
          orderBy("timestamp", "desc")
        );

        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsList = requestsSnapshot.docs.map((doc) => ({
          id: doc.id,
          serviceId: doc.data().serviceId || "",
          accountNumber: doc.data().accountNumber || "",
          type: doc.data().type || "",
          subject: doc.data().subject || "",
          description: doc.data().description || "",
          email: doc.data().email || "",
          status: doc.data().status || "pending",
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }));

        setServiceRequests(requestsList);
        setFilteredRequests(requestsList);
        
        // Calculate stats
        const stats = {
          total: requestsList.length,
          pending: requestsList.filter(req => req.status === "pending").length,
          inProgress: requestsList.filter(req => req.status === "in-progress").length,
          completed: requestsList.filter(req => req.status === "completed").length,
          leakReports: requestsList.filter(req => req.type === "Leak").length,
          billingIssues: requestsList.filter(req => req.type === "Billing").length,
          serviceInterruptions: requestsList.filter(req => req.type === "Interruption").length,
          other: requestsList.filter(req => !["Leak", "Billing", "Interruption"].includes(req.type)).length
        };
        
        setStats(stats);
      } catch (error) {
        console.error("Error fetching service requests:", error);
        setServiceRequests([]);
        setFilteredRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceRequests();
  }, []);

  // Filter function
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...serviceRequests];
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (request) =>
            request.serviceId.toLowerCase().includes(term) ||
            request.accountNumber.toLowerCase().includes(term) ||
            request.subject.toLowerCase().includes(term) ||
            request.email.toLowerCase().includes(term)
        );
      }
      
      if (statusFilter !== "all") {
        filtered = filtered.filter((request) => request.status === statusFilter);
      }
      
      if (typeFilter !== "all") {
        filtered = filtered.filter((request) => request.type === typeFilter);
      }
      
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
          (request) => new Date(request.timestamp) >= cutoffDate
        );
      }
      
      setFilteredRequests(filtered);
    };
    
    applyFilters();
  }, [serviceRequests, searchTerm, statusFilter, typeFilter, dateRange]);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateRange("all");
  };
  
  // Handle view details
  const handleViewDetails = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };
  
  // Function to get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Function to update the request status and add a notification under /notifications/{accountNumber}/records
  const updateRequestStatus = async (newStatus: string) => {
    if (!selectedRequest) return;
    try {
      const { doc, updateDoc, collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      // Update the request document
      await updateDoc(doc(db, "requests", selectedRequest.id), {
        status: newStatus
      });
      
      // Update local state for requests and selected request
      setServiceRequests(prev =>
        prev.map(req =>
          req.id === selectedRequest.id ? { ...req, status: newStatus } : req
        )
      );
      setSelectedRequest({ ...selectedRequest, status: newStatus });

      // Create a notification document in the nested "records" subcollection under notifications/{accountNumber}
      const notificationsRef = collection(db, "notifications", selectedRequest.accountNumber, "records");
      await addDoc(notificationsRef, {
        serviceId: selectedRequest.serviceId,
        accountNumber: selectedRequest.accountNumber,
        type: selectedRequest.type,
        subject: selectedRequest.subject,
        description: `Your service request ${selectedRequest.serviceId} is now ${newStatus}.`,
        email: selectedRequest.email,
        read: false,
        status: newStatus,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Handle export to CSV
  const exportToCSV = () => {
    if (filteredRequests.length === 0) return;
    
    const headers = ["Service ID", "Account Number", "Type", "Subject", "Status", "Date"];
    const csvContent = [
      headers.join(","),
      ...filteredRequests.map(req => [
        req.serviceId,
        req.accountNumber,
        req.type,
        `"${req.subject.replace(/"/g, '""')}"`,
        req.status,
        formatDate(req.timestamp)
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `service-requests-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">Service Requests</h1>
            <p className="text-gray-600 mt-1">Track and manage customer service requests</p>
          </div>
          <Button 
            onClick={exportToCSV}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={filteredRequests.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Requests
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <BarChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="service-requests">
              <FileText className="h-4 w-4 mr-2" />
              Service Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Total Requests</CardTitle>
                  <CardDescription>All service requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Pending</CardTitle>
                  <CardDescription>Awaiting response</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">In Progress</CardTitle>
                  <CardDescription>Currently being handled</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Completed</CardTitle>
                  <CardDescription>Successfully resolved</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Request Types Distribution</CardTitle>
                  <CardDescription>Breakdown by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Leak Reports</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full" 
                            style={{ width: `${stats.total ? (stats.leakReports / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats.leakReports}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Billing Issues</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-600 rounded-full" 
                            style={{ width: `${stats.total ? (stats.billingIssues / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats.billingIssues}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Service Interruptions</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-600 rounded-full" 
                            style={{ width: `${stats.total ? (stats.serviceInterruptions / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats.serviceInterruptions}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Other Requests</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gray-600 rounded-full" 
                            style={{ width: `${stats.total ? (stats.other / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats.other}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>Current state of service requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Pending</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-500 rounded-full" 
                            style={{ width: `${stats.total ? (stats.pending / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {stats.total ? ((stats.pending / stats.total) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>In Progress</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${stats.total ? (stats.inProgress / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {stats.total ? ((stats.inProgress / stats.total) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Completed</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full" 
                            style={{ width: `${stats.total ? (stats.completed / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {stats.total ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="service-requests">
            <Card>
              <CardHeader>
                <CardTitle>Service Requests</CardTitle>
                <CardDescription>View and filter all service requests</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by ID, account, or subject..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={handleSearch}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Request Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Leak">Leak</SelectItem>
                        <SelectItem value="Billing">Billing</SelectItem>
                        <SelectItem value="Interruption">Interruption</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    
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
                    <p>Loading service requests...</p>
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium">No service requests found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service ID</TableHead>
                          <TableHead>Account #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.serviceId}</TableCell>
                            <TableCell>{request.accountNumber}</TableCell>
                            <TableCell>{request.type}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{request.subject}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell>{formatDate(request.timestamp)}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleViewDetails(request)}
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
                  <span>Showing {filteredRequests.length} of {serviceRequests.length} requests</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Request Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Service Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedRequest.subject}</h2>
                    <p className="text-sm text-gray-500">{selectedRequest.serviceId}</p>
                  </div>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Account Number</h3>
                    <p>{selectedRequest.accountNumber}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Request Type</h3>
                    <p>{selectedRequest.type}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p>{selectedRequest.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Date Submitted</h3>
                    <p>{formatDate(selectedRequest.timestamp)}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="whitespace-pre-line">{selectedRequest.description}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Update Status</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant={selectedRequest.status === "pending" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => updateRequestStatus("pending")}
                    >
                      Pending
                    </Button>
                    <Button 
                      variant={selectedRequest.status === "in-progress" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => updateRequestStatus("in-progress")}
                    >
                      In Progress
                    </Button>
                    <Button 
                      variant={selectedRequest.status === "completed" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => updateRequestStatus("completed")}
                    >
                      Completed
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Requests;
