import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Check, X, ExternalLink, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ServiceRequest {
  id: string;
  serviceId: string;
  accountNumber: string;
  email: string;
  subject: string;
  description: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  timestamp: any;
  response?: string;
}

const ServiceRequests = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [responseStatus, setResponseStatus] = useState<"approved" | "rejected">(
    "approved",
  );
  const [responseNote, setResponseNote] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchServiceRequests();
  }, []);

  const fetchServiceRequests = async () => {
    setLoading(true);
    try {
      const { collection, getDocs, query, orderBy } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../../lib/firebase");

      const requestsQuery = query(
        collection(db, "requests"),
        orderBy("timestamp", "desc"),
      );

      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsList = requestsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp:
          doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp),
      })) as ServiceRequest[];

      if (requestsList.length > 0) {
        setRequests(requestsList);
      } else {
        // Fallback to mock data
        setRequests([
          {
            id: "req-1",
            serviceId: "SRV-1741062907876",
            accountNumber: "123456789",
            email: "john.doe@example.com",
            subject: "Water Leak in Bathroom",
            description:
              "There's a significant water leak in my bathroom that needs immediate attention.",
            type: "Leak",
            status: "pending",
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
          },
          {
            id: "req-2",
            serviceId: "SRV-1741062907877",
            accountNumber: "987654321",
            email: "jane.smith@example.com",
            subject: "Water Meter Reading Issue",
            description:
              "I believe my water meter is giving incorrect readings. My bill is much higher than usual.",
            type: "Billing",
            status: "pending",
            timestamp: new Date(Date.now() - 172800000), // 2 days ago
          },
          {
            id: "req-3",
            serviceId: "SRV-1741062907878",
            accountNumber: "456789123",
            email: "robert.johnson@example.com",
            subject: "New Connection Request",
            description:
              "I've recently moved to a new house and need a water connection setup.",
            type: "Connection",
            status: "approved",
            response:
              "Your connection request has been approved. Our team will contact you within 48 hours to schedule the installation.",
            timestamp: new Date(Date.now() - 259200000), // 3 days ago
          },
          {
            id: "req-4",
            serviceId: "SRV-1741062907879",
            accountNumber: "321654987",
            email: "sarah.williams@example.com",
            subject: "Water Quality Concern",
            description:
              "The water from my tap has been discolored for the past two days.",
            type: "Quality",
            status: "rejected",
            response:
              "After reviewing your area's maintenance records, we found that this is due to scheduled pipe cleaning. The water is safe to use and should clear up within 24 hours.",
            timestamp: new Date(Date.now() - 345600000), // 4 days ago
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching service requests:", error);
      // Fallback to mock data
      setRequests([
        {
          id: "req-1",
          serviceId: "SRV-1741062907876",
          accountNumber: "123456789",
          email: "john.doe@example.com",
          subject: "Water Leak in Bathroom",
          description:
            "There's a significant water leak in my bathroom that needs immediate attention.",
          type: "Leak",
          status: "pending",
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
        },
        {
          id: "req-2",
          serviceId: "SRV-1741062907877",
          accountNumber: "987654321",
          email: "jane.smith@example.com",
          subject: "Water Meter Reading Issue",
          description:
            "I believe my water meter is giving incorrect readings. My bill is much higher than usual.",
          type: "Billing",
          status: "pending",
          timestamp: new Date(Date.now() - 172800000), // 2 days ago
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setResponseStatus(request.status === "rejected" ? "rejected" : "approved");
    setResponseNote(request.response || "");
    setIsDialogOpen(true);
  };

  const handleResponseSubmit = async () => {
    if (!selectedRequest) return;

    try {
      // Update in Firestore
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      await updateDoc(doc(db, "requests", selectedRequest.id), {
        status: responseStatus,
        response: responseNote,
        respondedAt: new Date().toISOString(),
      });

      // Update local state
      setRequests(
        requests.map((req) =>
          req.id === selectedRequest.id
            ? { ...req, status: responseStatus, response: responseNote }
            : req,
        ),
      );

      // Close dialog and reset form
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setResponseStatus("approved");
      setResponseNote("");
    } catch (error) {
      console.error("Error updating service request:", error);
      alert("Failed to update the request. Please try again.");
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-100 text-yellow-800 border-yellow-300"
          >
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 border-green-300"
          >
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 border-red-300"
          >
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter requests based on search term and filters
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      searchTerm === "" ||
      request.serviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;
    const matchesType = typeFilter === "all" || request.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Get unique request types for filter dropdown
  const requestTypes = Array.from(new Set(requests.map((req) => req.type)));

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Requests</CardTitle>
          <CardDescription>
            Manage customer service and maintenance requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by ID, account number, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full"
                />
              </div>
              <div className="flex gap-2">
                <div className="w-40">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {requestTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setTypeFilter("all");
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
              <p>Loading service requests...</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service ID</TableHead>
                    <TableHead>Account #</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.serviceId}
                        </TableCell>
                        <TableCell>{request.accountNumber}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {request.subject}
                        </TableCell>
                        <TableCell>{request.type}</TableCell>
                        <TableCell>{formatDate(request.timestamp)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRequest(request)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {request.status === "pending" ? "Respond" : "View"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-500"
                      >
                        No service requests found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Service Request {selectedRequest?.serviceId}
            </DialogTitle>
            <DialogDescription>
              Review the service request details and respond to the customer.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">
                    Account Number
                  </Label>
                  <p className="font-medium">{selectedRequest.accountNumber}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Email</Label>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Type</Label>
                <p className="font-medium">{selectedRequest.type}</p>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Subject</Label>
                <p className="font-medium">{selectedRequest.subject}</p>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Description</Label>
                <div className="p-3 bg-gray-50 rounded-md mt-1">
                  <p>{selectedRequest.description}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Submitted</Label>
                <p className="font-medium">
                  {formatDate(selectedRequest.timestamp)}
                </p>
              </div>

              <div className="mt-4">
                <Label htmlFor="response-status">Response Status</Label>
                <Select
                  value={responseStatus}
                  onValueChange={(value: "approved" | "rejected") =>
                    setResponseStatus(value)
                  }
                  disabled={selectedRequest.status !== "pending"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve Request</SelectItem>
                    <SelectItem value="rejected">Reject Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-2">
                <Label htmlFor="response-note">Response Note</Label>
                <Textarea
                  id="response-note"
                  placeholder="Provide details about your response..."
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  rows={4}
                  disabled={selectedRequest.status !== "pending"}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedRequest(null);
              }}
            >
              {selectedRequest?.status === "pending" ? "Cancel" : "Close"}
            </Button>
            {selectedRequest?.status === "pending" && (
              <Button
                onClick={handleResponseSubmit}
                className={
                  responseStatus === "approved"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {responseStatus === "approved" ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Approve Request
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Reject Request
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceRequests;
