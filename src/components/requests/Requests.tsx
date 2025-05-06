import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Search, Filter, FileText, BarChart } from "lucide-react";
import ExcelJS from 'exceljs';
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
  attachmentUri: string;
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
  // New state for confirmation of status update; holds the new status to be set.
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");

  const location = useLocation();


  // Updated Stats: now including Maintenance, Billing Issue, Complaint, Service Inquiry and Other
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0,
    maintenance: 0,
    billingIssues: 0,
    complaints: 0,
    serviceInquiries: 0,
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
          attachmentUri: doc.data().attachmentUri || "", // Add this line for attachment
        }));

        setServiceRequests(requestsList);
        setFilteredRequests(requestsList);
        
        // Updated stats calculation based on the available types and statuses
        const stats = {
          total: requestsList.length,
          pending: requestsList.filter(req => req.status === "pending").length,
          inProgress: requestsList.filter(req => req.status === "in-progress").length,
          completed: requestsList.filter(req => req.status === "completed").length,
          rejected: requestsList.filter(req => req.status === "rejected").length,
          maintenance: requestsList.filter(req => req.type === "Maintenance").length,
          billingIssues: requestsList.filter(req => req.type === "Billing Issue").length,
          complaints: requestsList.filter(req => req.type === "Complaint").length,
          serviceInquiries: requestsList.filter(req => req.type === "Service Inquiry").length,
          other: requestsList.filter(req => 
            !["Maintenance", "Billing Issue", "Complaint", "Service Inquiry"].includes(req.type)
          ).length
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

    // Handle tab and request selection from URL (for notification redirection)
    useEffect(() => {
      const searchParams = new URLSearchParams(location.search);
      const tab = searchParams.get("tab");
      const id = searchParams.get("id");
  
      // Set the active tab if present
      if (tab) {
        // If using shadcn Tabs, you may need to control the value via state:
        // setActiveTab(tab);
        // If using uncontrolled Tabs, you can use defaultValue, but for notification, use controlled:
        // See below for how to add this state if not present
        document.querySelector(`[data-state="active"][data-value="${tab}"]`)?.scrollIntoView();
        // Or, if you have a state for the tab, set it here
      }
  
      // Open the details dialog if an ID is present and data is loaded
      if (id && serviceRequests.length > 0) {
        const target = serviceRequests.find((req) => req.id === id);
        if (target) {
          setSelectedRequest(target);
          setShowDetails(true);
        }
      }
    }, [location.search, serviceRequests]);
  

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
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

// Function to update the request status and add a notification under /notifications/{accountNumber}/records
const updateRequestStatus = async (newStatus: string, remarks?: string) => {
  if (!selectedRequest) return;
  try {
    const { doc, updateDoc, collection, addDoc, serverTimestamp } = await import("firebase/firestore");
    const { db } = await import("../../lib/firebase");

    // Update the request document
    await updateDoc(doc(db, "requests", selectedRequest.id), {
      status: newStatus,
      ...(remarks ? { remarks } : {}),
    });

    // Update local state for requests and selected request
    setServiceRequests(prev =>
      prev.map(req =>
        req.id === selectedRequest.id ? { ...req, status: newStatus, ...(remarks ? { remarks } : {}) } : req
      )
    );
    setSelectedRequest({ ...selectedRequest, status: newStatus, ...(remarks ? { remarks } : {}) });

    // Create a notification document in the nested "records" subcollection under notifications/{accountNumber}
    const notificationsRef = collection(db, "notifications", selectedRequest.accountNumber, "records");
    await addDoc(notificationsRef, {
      serviceId: selectedRequest.serviceId,
      accountNumber: selectedRequest.accountNumber,
      type: selectedRequest.type,
      subject: selectedRequest.subject,
      description: `Your service request ${selectedRequest.serviceId} is now ${newStatus}.`,
      ...(remarks ? { remarks } : {}),
      email: selectedRequest.email,
      read: false,
      status: newStatus,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating status:", error);
  }
};



// Make sure to import ExcelJS at the top of your file:
// import ExcelJS from 'exceljs';

const exportToXLSX = () => {
  if (filteredRequests.length === 0) return;

  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = "Water Management System";
  workbook.lastModifiedBy = "Water Management System";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;
  
  // Custom properties
  workbook.title = "Service Requests Report";
  workbook.subject = "Customer Service Requests Analysis";
  workbook.keywords = "service, requests, water, management";
  
  // Color palette
  const colors = {
    primary: { argb: 'FF1A5980' },       // Deep blue
    primaryLight: { argb: 'FF4F81BD' },  // Medium blue
    accent: { argb: 'FF00ACC1' },        // Teal accent
    headerBg: { argb: 'FFD0E0F2' },      // Light blue for headers
    white: { argb: 'FFFFFFFF' },
    altRow: { argb: 'FFF5F9FC' },        // Very light blue for alternating rows
    success: { argb: 'FFD8F0D8' },       // Light green for completed
    warning: { argb: 'FFFFF9E6' },       // Light yellow for in-progress
    error: { argb: 'FFF2DEDE' },         // Light red for rejected
    neutral: { argb: 'FFE6E6E6' },       // Light gray for pending
  };
  
  // Styling functions
  const applyTitleStyle = (row) => {
    row.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    row.height = 36;
    
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.primary
      };
      cell.border = {
        bottom: { style: 'medium', color: colors.primaryLight }
      };
    });
  };
  
  const applySubtitleStyle = (row) => {
    row.font = { bold: true, size: 14, color: colors.primary };
    row.height = 24;
    row.alignment = { horizontal: 'center', vertical: 'middle' };
  };
  
  const applyHeaderStyle = (row) => {
    row.height = 26;
    row.eachCell(cell => {
      cell.font = { bold: true, color: colors.primary, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.headerBg
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: colors.primaryLight },
        left: { style: 'thin', color: colors.primaryLight },
        bottom: { style: 'thin', color: colors.primaryLight },
        right: { style: 'thin', color: colors.primaryLight }
      };
    });
  };
  
  // For section headers
  const applySectionHeaderStyle = (row) => {
    row.height = 22;
    row.eachCell(cell => {
      cell.font = { bold: true, color: colors.white, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.accent
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      cell.border = {
        bottom: { style: 'thin', color: colors.primaryLight }
      };
    });
  };
  
  // For normal data cells
  const applyDataRowStyle = (row, isAlternate = false) => {
    row.height = 20;
    row.eachCell(cell => {
      if (isAlternate) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.altRow
        };
      }
      cell.border = {
        top: { style: 'hair', color: colors.primaryLight },
        left: { style: 'hair', color: colors.primaryLight },
        bottom: { style: 'hair', color: colors.primaryLight },
        right: { style: 'hair', color: colors.primaryLight }
      };
      cell.alignment = { vertical: 'middle' };
    });
  };
  
  // Create Overview worksheet
  const overview = workbook.addWorksheet('Overview');
  
  // Set column widths
  overview.getColumn(1).width = 24;
  overview.getColumn(2).width = 50;
  
  // Add logo and title
  overview.addRow([]);
  const logoRow = overview.addRow(['💧']);
  logoRow.height = 40;
  logoRow.getCell(1).font = { size: 36, color: colors.primaryLight };
  logoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  overview.mergeCells(logoRow.number, 1, logoRow.number, 2);
  
  const titleRow = overview.addRow(['SERVICE REQUESTS REPORT']);
  applyTitleStyle(titleRow);
  overview.mergeCells(titleRow.number, 1, titleRow.number, 2);
  
  const subtitleRow = overview.addRow(['Comprehensive Analysis of Customer Service Requests']);
  applySubtitleStyle(subtitleRow);
  overview.mergeCells(subtitleRow.number, 1, subtitleRow.number, 2);
  
  overview.addRow([]);
  
  // Add report information
  const reportInfoRow = overview.addRow(['REPORT INFORMATION']);
  applySectionHeaderStyle(reportInfoRow);
  overview.mergeCells(reportInfoRow.number, 1, reportInfoRow.number, 2);
  
  const generateDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Build the info rows
  const infoRows = [
    ['Generated On', generateDate],
    ['Total Requests', filteredRequests.length.toString()],
    ['Status Filter', statusFilter !== "all" ? statusFilter : "All"],
    ['Type Filter', typeFilter !== "all" ? typeFilter : "All"],
    ['Date Range', dateRange !== "all" ? dateRange : "All Time"]
  ];
  
  // Add the info rows with alternating background
  infoRows.forEach((rowData, index) => {
    const row = overview.addRow(rowData);
    row.getCell(1).font = { bold: true };
    row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    
    if (index % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.altRow
        };
      });
    }
    
    row.eachCell(cell => {
      cell.border = {
        bottom: { style: 'hair', color: colors.primaryLight }
      };
    });
  });
  
  overview.addRow([]);
  
  // Add status summary
  const statusSummaryRow = overview.addRow(['STATUS SUMMARY']);
  applySectionHeaderStyle(statusSummaryRow);
  overview.mergeCells(statusSummaryRow.number, 1, statusSummaryRow.number, 2);
  
  // Calculate status count
  const pendingCount = filteredRequests.filter(req => req.status === "pending").length;
  const inProgressCount = filteredRequests.filter(req => req.status === "in-progress").length;
  const completedCount = filteredRequests.filter(req => req.status === "completed").length;
  const rejectedCount = filteredRequests.filter(req => req.status === "rejected").length;
  
  const statusCountRows = [
    ['Pending', pendingCount.toString()],
    ['In Progress', inProgressCount.toString()],
    ['Completed', completedCount.toString()],
    ['Rejected', rejectedCount.toString()],
    ['Total', filteredRequests.length.toString()]
  ];
  
  // Add status counts with special formatting
  statusCountRows.forEach((rowData, index) => {
    const row = overview.addRow(rowData);
    row.getCell(1).font = { bold: true };
    row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    
    // Apply special background for each status
    if (index < 4) { // Skip the total row
      let bgColor;
      switch (rowData[0]) {
        case 'Pending': bgColor = colors.neutral; break;
        case 'In Progress': bgColor = colors.warning; break;
        case 'Completed': bgColor = colors.success; break;
        case 'Rejected': bgColor = colors.error; break;
      }
      
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: bgColor
        };
      });
    } else {
      // Make the total row bold
      row.eachCell(cell => {
        cell.font = { bold: true };
        cell.border = {
          top: { style: 'thin', color: colors.primaryLight },
          bottom: { style: 'thin', color: colors.primaryLight }
        };
      });
    }
  });
  
  overview.addRow([]);
  
  // Add footer
  const footerRow = overview.addRow(['Report generated by Water Management System']);
  footerRow.getCell(1).font = { italic: true, color: colors.primary, size: 10 };
  footerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  overview.mergeCells(footerRow.number, 1, footerRow.number, 2);
  
  // Create main data worksheet
  const requests = workbook.addWorksheet('Service Requests');
  
  // Set column widths for better readability
  requests.getColumn(1).width = 15;  // Service ID
  requests.getColumn(2).width = 15;  // Account Number
  requests.getColumn(3).width = 18;  // Type
  requests.getColumn(4).width = 35;  // Subject
  requests.getColumn(5).width = 50;  // Description
  requests.getColumn(6).width = 15;  // Status
  requests.getColumn(7).width = 25;  // Email
  requests.getColumn(8).width = 15;  // Date
  requests.getColumn(9).width = 20;  // Attachment
  
  // Add the title
  const mainTitleRow = requests.addRow(['SERVICE REQUESTS DATA']);
  applyTitleStyle(mainTitleRow);
  requests.mergeCells(mainTitleRow.number, 1, mainTitleRow.number, 9);
  
  requests.addRow([]);
  
  // Add headers
  const headerRow = requests.addRow([
    "Service ID",
    "Account Number",
    "Request Type",
    "Subject",
    "Description",
    "Status",
    "Email",
    "Submission Date",
    "Attachment"
  ]);
  applyHeaderStyle(headerRow);
  
  // Add data rows with alternating background and status-based formatting
  filteredRequests.forEach((req, index) => {
    const dataRow = requests.addRow([
      req.serviceId,
      req.accountNumber,
      req.type,
      req.subject,
      req.description,
      req.status,
      req.email,
      formatDate(req.timestamp),
      req.attachmentUri ? "Yes" : "No"
    ]);
    
    // Apply alternating row styling
    applyDataRowStyle(dataRow, index % 2 === 0);
    
    // Custom alignment for specific columns
    dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }; // Service ID
    dataRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }; // Account Number
    dataRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; // Type
    dataRow.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; // Subject
    dataRow.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true }; // Description
    dataRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }; // Status
    dataRow.getCell(7).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; // Email
    dataRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' }; // Date
    dataRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' }; // Attachment
    
    // Status-based styling
    const statusCell = dataRow.getCell(6);
    let statusColor;
    let textColor = { argb: '00000000' }; // Default black
    
    switch (req.status.toLowerCase()) {
      case 'completed':
        statusColor = colors.success;
        statusCell.font = { bold: true, color: { argb: 'FF008000' } }; // Dark green
        break;
      case 'in-progress':
        statusColor = colors.warning;
        statusCell.font = { bold: true, color: { argb: 'FF8B6508' } }; // Dark amber
        break;
      case 'rejected':
        statusColor = colors.error;
        statusCell.font = { bold: true, color: { argb: 'FF8B0000' } }; // Dark red
        break;
      default: // pending
        statusColor = colors.neutral;
        statusCell.font = { bold: true, color: { argb: 'FF808080' } }; // Gray
    }
    
    statusCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: statusColor
    };
    
    // Set row height based on description length
    if (req.description && req.description.length > 100) {
      dataRow.height = Math.min(120, Math.max(20, Math.ceil(req.description.length / 50) * 15));
    }
    
    // Style attachment cell
    const attachmentCell = dataRow.getCell(9);
    if (req.attachmentUri) {
      attachmentCell.font = { bold: true, color: { argb: 'FF4F81BD' } }; // Blue
    }
  });
  
  // Add a summary footer row
  requests.addRow([]);
  const summaryRow = requests.addRow([
    `Total: ${filteredRequests.length} request(s)`, '', '', '', '', '', '', '', ''
  ]);
  summaryRow.getCell(1).font = { bold: true, color: colors.primary };
  requests.mergeCells(summaryRow.number, 1, summaryRow.number, 9);
  summaryRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  
  // Add a note about attachment
  requests.addRow([]);
  const noteRow = requests.addRow([
    'Note: For security reasons, attachments are only indicated as "Yes" or "No". Please view attachments in the application.', 
    '', '', '', '', '', '', '', ''
  ]);
  noteRow.getCell(1).font = { italic: true, size: 10, color: colors.primary };
  requests.mergeCells(noteRow.number, 1, noteRow.number, 9);
  noteRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  
  // Create a Type Distribution worksheet
  const typesDist = workbook.addWorksheet('Type Distribution');
  typesDist.getColumn(1).width = 25;
  typesDist.getColumn(2).width = 15;
  typesDist.getColumn(3).width = 15;
  
  // Add title
  const typesTitleRow = typesDist.addRow(['SERVICE REQUEST TYPES']);
  applyTitleStyle(typesTitleRow);
  typesDist.mergeCells(typesTitleRow.number, 1, typesTitleRow.number, 3);
  
  typesDist.addRow([]);
  
  // Add headers
  const typesHeaderRow = typesDist.addRow(['Request Type', 'Count', 'Percentage']);
  applyHeaderStyle(typesHeaderRow);
  
  // Calculate type distribution
  const typeDistribution = {};
  filteredRequests.forEach(req => {
    typeDistribution[req.type] = (typeDistribution[req.type] || 0) + 1;
  });
  
  // Add type data rows
  Object.entries(typeDistribution).forEach(([type, count], index) => {
    const percentage = ((count as number) / filteredRequests.length * 100).toFixed(2) + '%';
    const row = typesDist.addRow([type, count.toString(), percentage]);
    
    applyDataRowStyle(row, index % 2 === 0);
    
    // Align numbers to right
    row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
  });
  
  // Add a total row
  const typeTotalRow = typesDist.addRow(['Total', filteredRequests.length.toString(), '100.00%']);
  typeTotalRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'thin', color: colors.primaryLight },
      bottom: { style: 'thin', color: colors.primaryLight }
    };
  });
  typeTotalRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
  typeTotalRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
  
  // Create a Status Distribution worksheet
  const statusDist = workbook.addWorksheet('Status Distribution');
  statusDist.getColumn(1).width = 25;
  statusDist.getColumn(2).width = 15;
  statusDist.getColumn(3).width = 15;
  
  // Add title
  const statusTitleRow = statusDist.addRow(['SERVICE REQUEST STATUSES']);
  applyTitleStyle(statusTitleRow);
  statusDist.mergeCells(statusTitleRow.number, 1, statusTitleRow.number, 3);
  
  statusDist.addRow([]);
  
  // Add headers
  const statusHeaderRow = statusDist.addRow(['Status', 'Count', 'Percentage']);
  applyHeaderStyle(statusHeaderRow);
  
  // Add status data rows with color coding
  const statusRows = [
    ['Pending', pendingCount, colors.neutral],
    ['In Progress', inProgressCount, colors.warning],
    ['Completed', completedCount, colors.success],
    ['Rejected', rejectedCount, colors.error]
  ];
  
  statusRows.forEach(([status, count, color], index) => {
    const percentage = (count as number) > 0 
      ? ((count as number) / filteredRequests.length * 100).toFixed(2) + '%' 
      : '0.00%';
    
    const row = statusDist.addRow([status, count.toString(), percentage]);
    
    // Style the row
    row.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: color as any
      };
      cell.border = {
        top: { style: 'hair', color: colors.primaryLight },
        left: { style: 'hair', color: colors.primaryLight },
        bottom: { style: 'hair', color: colors.primaryLight },
        right: { style: 'hair', color: colors.primaryLight }
      };
    });
    
    // Align numbers to right
    row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
  });
  
  // Add a total row
  const statusTotalRow = statusDist.addRow(['Total', filteredRequests.length.toString(), '100.00%']);
  statusTotalRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'thin', color: colors.primaryLight },
      bottom: { style: 'thin', color: colors.primaryLight }
    };
  });
  statusTotalRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
  statusTotalRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
  
  // Apply print settings for all worksheets
  [overview, requests, typesDist, statusDist].forEach(sheet => {
    // Freeze the header rows
    sheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: sheet === requests ? 3 : 4, activeCell: 'A1' }
    ];
    
    // Set print properties
    sheet.pageSetup.paperSize = 9; // A4
    sheet.pageSetup.orientation = 'landscape';
    sheet.pageSetup.fitToPage = true;
    sheet.pageSetup.fitToWidth = 1;
    sheet.pageSetup.fitToHeight = 0;
    sheet.pageSetup.margins = {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    };
    
    // Add page numbers in footer
    sheet.headerFooter.oddFooter = '&CPage &P of &N';
  });
  
  // Generate file and trigger download
  const filename = `service-requests-${new Date().toISOString().split('T')[0]}.xlsx`;
  
  workbook.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.click();
    
    window.URL.revokeObjectURL(url);
  }).catch(err => {
    console.error('Error generating Excel file:', err);
  });
};

  // Handle confirmation for status update
  const handleConfirmStatus = (newStatus: string) => {
    setConfirmStatus(newStatus);
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
            onClick={exportToXLSX}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Rejected</CardTitle>
                  <CardDescription>Requests not approved</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500">{stats.rejected}</div>
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
                      <span>Maintenance</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full" 
                            style={{ width: `${stats.total ? (stats.maintenance / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats.maintenance}</span>
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
                      <span>Complaint</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-600 rounded-full" 
                            style={{ width: `${stats.total ? (stats.complaints / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats.complaints}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Service Inquiry</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-600 rounded-full" 
                            style={{ width: `${stats.total ? (stats.serviceInquiries / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{stats.serviceInquiries}</span>
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
                    
                    <div className="flex justify-between items-center">
                      <span>Rejected</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 rounded-full" 
                            style={{ width: `${stats.total ? (stats.rejected / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {stats.total ? ((stats.rejected / stats.total) * 100).toFixed(1) : 0}%
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
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Request Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Billing Issue">Billing Issue</SelectItem>
                        <SelectItem value="Complaint">Complaint</SelectItem>
                        <SelectItem value="Service Inquiry">Service Inquiry</SelectItem>
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-white z-10 pb-4 border-b">
              <DialogTitle>Service Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-6 py-2">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedRequest.subject}</h2>
                    <p className="text-sm text-gray-500">{selectedRequest.serviceId}</p>
                  </div>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-gray-500">Account Number</h3>
                    <p className="font-medium">{selectedRequest.accountNumber}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-gray-500">Request Type</h3>
                    <p className="font-medium">{selectedRequest.type}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="font-medium">{selectedRequest.email}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-gray-500">Date Submitted</h3>
                    <p className="font-medium">{formatDate(selectedRequest.timestamp)}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="whitespace-pre-line">{selectedRequest.description}</p>
                  </div>
                </div>

                {/* Improved Attachment Display with Constrained Size */}
                {selectedRequest.attachmentUri && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Attachment</h3>
                    <div className="border rounded-md p-2 bg-gray-50">
                      <div className="h-48 overflow-hidden rounded-md relative">
                        <img 
                          src={selectedRequest.attachmentUri} 
                          alt="Service Request Attachment" 
                          className="w-full h-full object-contain" 
                        />
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="absolute bottom-2 right-2"
                          onClick={() => window.open(selectedRequest.attachmentUri, '_blank')}
                        >
                          View Full Size
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Update Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button 
                      variant={selectedRequest.status === "pending" ? "default" : "outline"}
                      className={`${selectedRequest.status === "pending" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                      onClick={() => handleConfirmStatus("pending")}
                    >
                      Pending
                    </Button>
                    <Button 
                      variant={selectedRequest.status === "in-progress" ? "default" : "outline"}
                      className={`${selectedRequest.status === "in-progress" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                      onClick={() => handleConfirmStatus("in-progress")}
                    >
                      In Progress
                    </Button>
                    <Button 
                      variant={selectedRequest.status === "completed" ? "default" : "outline"}
                      className={`${selectedRequest.status === "completed" ? "bg-green-600 hover:bg-green-700" : ""}`}
                      onClick={() => handleConfirmStatus("completed")}
                    >
                      Completed
                    </Button>
                    <Button 
                      variant={selectedRequest.status === "rejected" ? "default" : "outline"}
                      className={`${selectedRequest.status === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}`}
                      onClick={() => handleConfirmStatus("rejected")}
                    >
                      Rejected
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {confirmStatus && (
  <Dialog open={true} onOpenChange={() => setConfirmStatus(null)}>
    <DialogContent className="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>Confirm Status Update</DialogTitle>
        <p className="text-sm text-gray-600">
          Are you sure you want to update the status to <span className="font-bold">{confirmStatus}</span>?
        </p>
      </DialogHeader>

      {/* Remarks Input Field */}
      <div className="mt-4">
        <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
          Remarks (optional)
        </label>
        <textarea
          id="remarks"
          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Enter remarks here..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={() => setConfirmStatus(null)}>
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={async () => {
            if (confirmStatus) {
              await updateRequestStatus(confirmStatus, remarks); // Pass remarks
              setConfirmStatus(null);
              setRemarks(""); // Clear after submission
            }
          }}
        >
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

export default Requests;
