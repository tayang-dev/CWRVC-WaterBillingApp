import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Search, Filter, MapPin, BarChart, Calendar } from "lucide-react";
// Enhanced exportToExcel function - Converted to ExcelJS
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver'; // For browser environments
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


// Make sure to import ExcelJS at the top of your file:
// import ExcelJS from 'exceljs';

const exportToXLSX = () => {
  if (filteredReports.length === 0) return;

  // Create a new workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = "Water Management System";
  workbook.lastModifiedBy = "Water Management System";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;
  
  // Set custom properties for title and metadata
  workbook.title = "Leak Reports Summary";
  workbook.subject = "Customer Leak Reports Analysis";
  workbook.keywords = "leaks, reports, water, management";
  
  // Color palette
  const colors = {
    darkBlue: { argb: 'FF1A5980' },      // Deep blue
    mediumBlue: { argb: 'FF1E88E5' },    // Medium blue
    lightBlue: { argb: 'FFB3E0FF' },     // Light blue
    paleBlue: { argb: 'FFE1F5FE' },      // Very light blue
    accentTeal: { argb: 'FF00ACC1' },    // Teal accent
    white: { argb: 'FFFFFFFF' },
    lightGreen: { argb: 'FFD8F0D8' },    // Resolved reports
    lightYellow: { argb: 'FFFFF9E6' },   // Pending reports
    lightRed: { argb: 'FFF2DEDE' },      // Rejected reports
  };
  
  // Common styling functions - ENHANCED
  const applyTitleStyle = (row) => {
    row.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    row.height = 36; // Taller row for title
    
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.darkBlue
      };
      cell.border = {
        top: { style: 'thin', color: colors.mediumBlue },
        left: { style: 'thin', color: colors.mediumBlue },
        bottom: { style: 'thin', color: colors.mediumBlue },
        right: { style: 'thin', color: colors.mediumBlue }
      };
    });
  };
  
  const applySubtitleStyle = (row) => {
    row.font = { bold: true, size: 12, color: colors.darkBlue };
    row.height = 22;
    row.alignment = { horizontal: 'center', vertical: 'middle' };
  };
  
  const applyHeaderStyle = (row) => {
    row.height = 24; // Taller header rows
    row.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.mediumBlue
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: colors.darkBlue },
        left: { style: 'thin', color: colors.darkBlue },
        bottom: { style: 'thin', color: colors.darkBlue },
        right: { style: 'thin', color: colors.darkBlue }
      };
    });
  };

  const applyDataRowStyle = (row, isAlternate = false) => {
    row.height = 20;
    row.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: isAlternate ? colors.paleBlue : colors.white
      };
      cell.border = {
        top: { style: 'hair', color: colors.lightBlue },
        left: { style: 'hair', color: colors.lightBlue },
        bottom: { style: 'hair', color: colors.lightBlue },
        right: { style: 'hair', color: colors.lightBlue }
      };
      cell.alignment = { 
        horizontal: 'left', 
        vertical: 'middle',
        indent: 1
      };
    });
  };
  
  // IMPROVED: Function to add a section header with better visual emphasis
  const addSectionHeader = (sheet, title, columnCount) => {
    // Add a blank row before section with less height
    const spacerRow = sheet.addRow(['']);
    spacerRow.height = 10;
    
    // Add the section header with improved styling
    const sectionRow = sheet.addRow([title]);
    sheet.mergeCells(sheet.rowCount, 1, sheet.rowCount, columnCount);
    
    sectionRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: colors.accentTeal
    };
    sectionRow.getCell(1).font = { 
      bold: true, 
      color: { argb: 'FFFFFFFF' },
      size: 12
    };
    sectionRow.getCell(1).alignment = { 
      horizontal: 'left',
      vertical: 'middle',
      indent: 1
    };
    sectionRow.height = 24;
    
    // Add minimal spacing after header
    const postSpacerRow = sheet.addRow(['']);
    postSpacerRow.height = 5;
  };
  
  // IMPROVED: Function to add a footer with better spacing
  const addFooter = (sheet, columnCount) => {
    // Add single blank row for spacing
    sheet.addRow(['']);
    
    // Add a footer row with message
    const footerRow = sheet.addRow(['Water is precious. Thank you for your efforts in conservation.']);
    sheet.mergeCells(sheet.rowCount, 1, sheet.rowCount, columnCount);
    
    footerRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: colors.lightBlue
    };
    footerRow.getCell(1).font = { 
      italic: true, 
      color: colors.darkBlue,
      size: 10
    };
    footerRow.getCell(1).alignment = { 
      horizontal: 'center',
      vertical: 'middle'
    };
    
    const currentDate = new Date().toLocaleDateString();
    
    // Add the date row with better positioning
    const dateRow = sheet.addRow([`Report generated on: ${currentDate}`]);
    sheet.mergeCells(sheet.rowCount, 1, sheet.rowCount, columnCount);
    
    dateRow.getCell(1).font = { 
      italic: true, 
      color: colors.darkBlue,
      size: 8
    };
    dateRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  };
  
  // IMPROVED: Function to auto-size columns with smarter calculation
  const autoSizeColumns = (worksheet) => {
    // Define minimum and maximum widths
    const MIN_WIDTH = 10;
    const MAX_WIDTH = 80;
    
    // Set column factors for different content types
    const COLUMN_FACTORS = {
      default: 1.2,      // General text
      description: 1.4,  // Long text that might wrap
      address: 1.3,      // Addresses can be longer
      datetime: 1.1,     // Date/time values
      numeric: 1.0,      // Numbers need less padding
      id: 1.1            // IDs are typically fixed width
    };
    
    // Map columns to their types for better width calculations
    const columnTypes = {};
    
    // Identify column types based on header content
    if (worksheet.getRow(1).values) {
      worksheet.getRow(1).values.forEach((header, index) => {
        if (!header) return;
        
        const headerText = String(header).toLowerCase();
        if (headerText.includes('description') || headerText.includes('remarks')) {
          columnTypes[index] = 'description';
        } else if (headerText.includes('address')) {
          columnTypes[index] = 'address';
        } else if (headerText.includes('date') || headerText.includes('time')) {
          columnTypes[index] = 'datetime';
        } else if (headerText.includes('count') || headerText.includes('number') || headerText.includes('percentage')) {
          columnTypes[index] = 'numeric';
        } else if (headerText.includes('id') || headerText.includes('account')) {
          columnTypes[index] = 'id';
        } else {
          columnTypes[index] = 'default';
        }
      });
    }
    
    // Initialize width for each column
    const columnWidths = {};
    
    // Calculate width based on content
    worksheet.eachRow({ includeEmpty: false }, function(row, rowNumber) {
      row.eachCell({ includeEmpty: false }, function(cell, colNumber) {
        // Skip empty cells
        if (!cell.value) return;
        
        let contentLength = 0;
        
        // Handle different content types
        if (cell.value.richText) {
          let richTextLength = 0;
          cell.value.richText.forEach(item => {
            richTextLength += item.text ? item.text.length : 0;
          });
          contentLength = richTextLength;
        } else if (typeof cell.value === 'string') {
          contentLength = cell.value.length;
        } else if (cell.value instanceof Date) {
          // Date formats are typically around 20 characters
          contentLength = 20;
        } else {
          contentLength = String(cell.value).length;
        }
        
        // Apply column-specific factors
        const columnType = columnTypes[colNumber] || 'default';
        const factor = COLUMN_FACTORS[columnType];
        
        // Store the maximum width needed for this column
        if (!columnWidths[colNumber] || contentLength > columnWidths[colNumber]) {
          columnWidths[colNumber] = contentLength;
        }
      });
    });
    
    // Apply calculated widths to columns
    Object.keys(columnWidths).forEach(colNumber => {
      const columnType = columnTypes[colNumber] || 'default';
      const factor = COLUMN_FACTORS[columnType];
      
      // Calculate width with appropriate factor and constraints
      let width = Math.ceil(columnWidths[colNumber] * factor);
      
      // Special handling for description columns - cap them at a reasonable width
      if (columnType === 'description') {
        width = Math.min(width, 60);  // Cap description columns
      }
      
      // Apply min/max constraints
      width = Math.max(MIN_WIDTH, Math.min(width, MAX_WIDTH));
      
      // Set the column width
      worksheet.getColumn(Number(colNumber)).width = width;
    });
    
    // Explicitly set the wrap text property for description columns
    Object.keys(columnTypes).forEach(colNumber => {
      if (columnTypes[colNumber] === 'description') {
        worksheet.getColumn(Number(colNumber)).eachCell({ includeEmpty: false }, cell => {
          cell.alignment = Object.assign({}, cell.alignment || {}, { wrapText: true });
        });
      }
    });
  };
  
  // NEW FUNCTION: Apply better cell formatting
  const applyCellFormatting = (worksheet) => {
    // Apply conditional formatting to status cells
    worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      // Skip header rows
      if (rowIndex <= 4) return;
      
      // Find status column by header text
      let statusColIndex = null;
      worksheet.getRow(4).eachCell({ includeEmpty: false }, (cell, colIndex) => {
        if (cell.value && String(cell.value).toLowerCase().includes('status')) {
          statusColIndex = colIndex;
        }
      });
      
      // Apply status formatting if found
      if (statusColIndex) {
        const statusCell = row.getCell(statusColIndex);
        if (statusCell && statusCell.value) {
          const status = String(statusCell.value).toLowerCase();
          
          if (status.includes('resolved')) {
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: colors.lightGreen
            };
            statusCell.font = Object.assign({}, statusCell.font || {}, { color: { argb: 'FF006400' } });
          } else if (status.includes('rejected')) {
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: colors.lightRed
            };
            statusCell.font = Object.assign({}, statusCell.font || {}, { color: { argb: 'FF8B0000' } });
          } else if (status.includes('pending')) {
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: colors.lightYellow
            };
            statusCell.font = Object.assign({}, statusCell.font || {}, { color: { argb: 'FF8B6508' } });
          }
          
          // Center status values
          statusCell.alignment = Object.assign({}, statusCell.alignment || {}, { horizontal: 'center' });
        }
      }
      
      // Format image column
      let imageColIndex = null;
      worksheet.getRow(4).eachCell({ includeEmpty: false }, (cell, colIndex) => {
        if (cell.value && String(cell.value).toLowerCase().includes('image')) {
          imageColIndex = colIndex;
        }
      });
      
      if (imageColIndex) {
        const imageCell = row.getCell(imageColIndex);
        if (imageCell && imageCell.value) {
          // Center image indicators
          imageCell.alignment = Object.assign({}, imageCell.alignment || {}, { horizontal: 'center' });
        }
      }
      
      // Align number columns to the right
      let accountColIndex = null;
      worksheet.getRow(4).eachCell({ includeEmpty: false }, (cell, colIndex) => {
        if (cell.value && String(cell.value).toLowerCase().includes('account')) {
          accountColIndex = colIndex;
        }
      });
      
      if (accountColIndex) {
        const accountCell = row.getCell(accountColIndex);
        if (accountCell && accountCell.value) {
          // Right-align account numbers
          accountCell.alignment = Object.assign({}, accountCell.alignment || {}, { horizontal: 'right' });
        }
      }
    });
  };
  
  // 1. Cover Sheet with Water Theme - IMPROVED
  const coverSheet = workbook.addWorksheet('Overview');
  
  // Set initial column widths - more balanced
  coverSheet.getColumn(1).width = 22;
  coverSheet.getColumn(2).width = 28;
  coverSheet.getColumn(3).width = 25;
  coverSheet.getColumn(4).width = 25;
  coverSheet.getColumn(5).width = 25;
  
  // Add some spacing - reduced
  coverSheet.addRow(['']);
  
  // Add a logo placeholder with better emoji
  const logoRow = coverSheet.addRow(['💧']);
  logoRow.height = 40;
  logoRow.getCell(1).font = { size: 36, color: colors.mediumBlue };
  logoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  coverSheet.mergeCells(logoRow.number, 1, logoRow.number, 5);
  
  // Add title row
  const coverTitle = coverSheet.addRow(['LEAK REPORTS SUMMARY']);
  applyTitleStyle(coverTitle);
  coverSheet.mergeCells(coverTitle.number, 1, coverTitle.number, 5);
  
  // Add subtitle
  const coverSubtitle = coverSheet.addRow(['Comprehensive Analysis of Customer Reported Leaks']);
  applySubtitleStyle(coverSubtitle);
  coverSheet.mergeCells(coverSubtitle.number, 1, coverSubtitle.number, 5);
  
  // Add spacing - reduced
  coverSheet.addRow(['']);
  
  // Add information section
  addSectionHeader(coverSheet, 'REPORT INFORMATION', 5);
  
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();
  
  const infoRows = [
    ['Generated on:', `${currentDate} ${currentTime}`],
    ['Report Type:', 'Leak Reports Analysis'],
    ['Total Reports:', filteredReports.length.toString()],
    ['Status Filter:', statusFilter !== "all" ? statusFilter : "All Statuses"],
    ['Date Range:', dateRange !== "all" ? dateRange : "All Time"],
    ['Search Term:', searchTerm || "None"]
  ];
  
  infoRows.forEach((rowData, index) => {
    const row = coverSheet.addRow(rowData);
    applyDataRowStyle(row, index % 2 === 0);
    
    // Style the labels
    row.getCell(1).font = { bold: true, color: colors.darkBlue };
    
    // Merge cells for the current row
    coverSheet.mergeCells(row.number, 2, row.number, 5);
  });
  
  // Add content summary section
  addSectionHeader(coverSheet, 'REPORT CONTENTS', 5);
  
  const contentRows = [
    ['1.', 'Overview', 'Summary information and statistics'],
    ['2.', 'Leak Reports', 'Detailed list of all reported leaks'],
    ['3.', 'Status Analysis', 'Breakdown by resolution status'],
    ['4.', 'Timeline', 'Reports by date distribution']
  ];
  
  contentRows.forEach((rowData, index) => {
    const row = coverSheet.addRow(rowData);
    applyDataRowStyle(row, index % 2 === 0);
    
    // Style the number
    row.getCell(1).font = { bold: true, color: colors.mediumBlue };
    row.getCell(1).alignment = { horizontal: 'center' };
    
    // Style the sheet name
    row.getCell(2).font = { bold: true, color: colors.darkBlue };
    
    // Merge the description cells
    coverSheet.mergeCells(row.number, 3, row.number, 5);
  });
  
  // Add a tip
  addSectionHeader(coverSheet, 'WATER CONSERVATION TIP', 5);
  
  const tipRow = coverSheet.addRow(['Prompt attention to reported leaks can save thousands of gallons of water annually.']);
  tipRow.getCell(1).font = { italic: true, color: colors.accentTeal };
  coverSheet.mergeCells(tipRow.number, 1, tipRow.number, 5);
  
  // Add footer
  addFooter(coverSheet, 5);
  
  // 2. Statistics Sheet - IMPROVED
  const statsSheet = workbook.addWorksheet('Status Analysis');
  
  // Set initial column widths
  statsSheet.getColumn(1).width = 30;
  statsSheet.getColumn(2).width = 20;
  statsSheet.getColumn(3).width = 20;
  
  // Add title
  const statsTitle = statsSheet.addRow(['LEAK REPORTS STATUS ANALYSIS']);
  applyTitleStyle(statsTitle);
  statsSheet.mergeCells(1, 1, 1, 3);
  
  // Add icon
  const iconRow = statsSheet.addRow(['']);
  iconRow.getCell(1).value = {
    richText: [
      { 
        text: '📊 ', 
        font: { size: 16, color: colors.mediumBlue }
      },
      { 
        text: 'Leak Reports Analysis',
        font: { bold: true, size: 12, color: colors.darkBlue } 
      }
    ]
  };
  statsSheet.mergeCells(iconRow.number, 1, iconRow.number, 3);
  
  statsSheet.addRow(['']); // Blank row
  
  // Calculate stats
  const resolvedCount = filteredReports.filter(report => report.resolved).length;
  const rejectedCount = filteredReports.filter(report => report.rejected).length;
  const pendingCount = filteredReports.filter(report => !report.resolved && !report.rejected).length;
  const withImagesCount = filteredReports.filter(report => report.imageUrl && report.imageUrl !== "").length;
  
  // Add header row
  const statsHeader = statsSheet.addRow(['Status', 'Count', 'Percentage']);
  applyHeaderStyle(statsHeader);
  
  // IMPROVED: Add a chart for visual representation
  // Add data rows with styling and better visual indication of proportions
  const addStatusRow = (status, count, color) => {
    const percentage = filteredReports.length > 0 
      ? ((count / filteredReports.length) * 100).toFixed(1) + '%' 
      : '0.0%';
    
    const row = statsSheet.addRow([status, count.toString(), percentage]);
    applyDataRowStyle(row);
    
    // Right align numeric values
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).alignment = { horizontal: 'right' };
    
    // Add color coding
    row.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: color
      };
    });
  };
  
  addStatusRow('Resolved', resolvedCount, colors.lightGreen);
  addStatusRow('Pending', pendingCount, colors.lightYellow);
  addStatusRow('Rejected', rejectedCount, colors.lightRed);
  
  // Add a total row
  const totalRow = statsSheet.addRow(['Total', filteredReports.length.toString(), '100.0%']);
  totalRow.font = { bold: true };
  totalRow.getCell(2).alignment = { horizontal: 'right' };
  totalRow.getCell(3).alignment = { horizontal: 'right' };
  
  // Add image distribution with better spacing
  addSectionHeader(statsSheet, 'IMAGE AVAILABILITY', 3);
  
  const withImagesRow = statsSheet.addRow(['Reports with Images', withImagesCount.toString(), 
    filteredReports.length > 0 ? ((withImagesCount / filteredReports.length) * 100).toFixed(1) + '%' : '0.0%']);
  applyDataRowStyle(withImagesRow);
  
  const withoutImagesRow = statsSheet.addRow(['Reports without Images', 
    (filteredReports.length - withImagesCount).toString(),
    filteredReports.length > 0 ? (((filteredReports.length - withImagesCount) / filteredReports.length) * 100).toFixed(1) + '%' : '0.0%']);
  applyDataRowStyle(withoutImagesRow, true);
  
  // Right align numeric values
  withImagesRow.getCell(2).alignment = { horizontal: 'right' };
  withImagesRow.getCell(3).alignment = { horizontal: 'right' };
  withoutImagesRow.getCell(2).alignment = { horizontal: 'right' };
  withoutImagesRow.getCell(3).alignment = { horizontal: 'right' };
  
  // Add footer
  addFooter(statsSheet, 3);
  
  // 3. Detailed Leak Reports Sheet - IMPROVED
  const detailSheet = workbook.addWorksheet('Leak Reports');
  
  // Better column width distribution
  detailSheet.getColumn(1).width = 15;  // Account #
  detailSheet.getColumn(2).width = 28;  // Address
  detailSheet.getColumn(3).width = 40;  // Description
  detailSheet.getColumn(4).width = 10;  // Has Image
  detailSheet.getColumn(5).width = 12;  // Status
  detailSheet.getColumn(6).width = 15;  // Date Reported
  detailSheet.getColumn(7).width = 12;  // Time Reported
  detailSheet.getColumn(8).width = 20;  // User ID
  
  // Add title
  const detailTitle = detailSheet.addRow(['DETAILED LEAK REPORTS']);
  applyTitleStyle(detailTitle);
  detailSheet.mergeCells(1, 1, 1, 8);
  
  // Add icon
  const reportIconRow = detailSheet.addRow(['']);
  reportIconRow.getCell(1).value = {
    richText: [
      { 
        text: '🚰 ', 
        font: { size: 16, color: colors.mediumBlue }
      },
      { 
        text: 'Water Leak Report Details',
        font: { bold: true, size: 12, color: colors.darkBlue } 
      }
    ]
  };
  detailSheet.mergeCells(reportIconRow.number, 1, reportIconRow.number, 8);
  
  detailSheet.addRow(['']); // Blank row
  
  // Add header row
  const detailHeader = detailSheet.addRow([
    "Account Number",
    "Address",
    "Description",
    "Has Image",
    "Status",
    "Date Reported",
    "Time Reported",
    "User ID"
  ]);
  applyHeaderStyle(detailHeader);
  
  // Add data rows with alternating colors - IMPROVED
  filteredReports.forEach((report, index) => {
    const status = report.rejected ? "Rejected" : report.resolved ? "Resolved" : "Pending";
    const hasImage = report.imageUrl ? "Yes" : "No";
    
    const row = detailSheet.addRow([
      report.accountNumber,
      report.address,
      report.leakDescription,
      hasImage,
      status,
      formatDate(report.timestamp),
      formatTime(report.timestamp),
      report.uniqueUserId
    ]);
    
    applyDataRowStyle(row, index % 2 === 0);
    
    // Alignment improvements
    row.getCell(1).alignment = { horizontal: 'right' };  // Right-align account numbers
    row.getCell(4).alignment = { horizontal: 'center' }; // Center image indicator
    row.getCell(5).alignment = { horizontal: 'center' }; // Center status
    row.getCell(6).alignment = { horizontal: 'center' }; // Center date
    row.getCell(7).alignment = { horizontal: 'center' }; // Center time
    
    // Add conditional formatting for status
    const statusCell = row.getCell(5);
    if (status === 'Resolved') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.lightGreen
      };
      statusCell.font = { bold: true, color: { argb: 'FF006400' } };
    } else if (status === 'Rejected') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.lightRed
      };
      statusCell.font = { bold: true, color: { argb: 'FF8B0000' } };
    } else {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.lightYellow
      };
      statusCell.font = { bold: true, color: { argb: 'FF8B6508' } };
    }
    
    // Wrap text for description
    row.getCell(3).alignment = { 
      wrapText: true, 
      vertical: 'top' 
    };
    
    // Image cell color with better icon
    const imageCell = row.getCell(4);
    if (hasImage === 'Yes') {
      imageCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.lightGreen
      };
      imageCell.value = {
        richText: [
          { text: '📷', font: { size: 12 } }
        ]
      };
    }
    
    // Set a minimum height for rows with longer content
    if (report.leakDescription.length > 50) {
      row.height = Math.max(40, Math.ceil(report.leakDescription.length / 40) * 15);
    }
  });
  
  // Add a data summary row
  const summaryRow = detailSheet.addRow(['Total Records:', filteredReports.length.toString(), '', '', '', '', '', '']);
  summaryRow.font = { bold: true, color: colors.darkBlue };
  summaryRow.getCell(2).alignment = { horizontal: 'left' };
  
  // Add footer
  addFooter(detailSheet, 8);
  
  // 4. Timeline Sheet - IMPROVED
  const timelineSheet = workbook.addWorksheet('Timeline');
  
  // Better column widths
  timelineSheet.getColumn(1).width = 18;  // Date
  timelineSheet.getColumn(2).width = 15;  // Count
  timelineSheet.getColumn(3).width = 45;  // Visual bar (new)
  
  // Add title
  const timelineTitle = timelineSheet.addRow(['REPORT TIMELINE ANALYSIS']);
  applyTitleStyle(timelineTitle);
  timelineSheet.mergeCells(1, 1, 1, 3);
  
  // Add icon
  const timelineIconRow = timelineSheet.addRow(['']);
  timelineIconRow.getCell(1).value = {
    richText: [
      { 
        text: '📅 ', 
        font: { size: 16, color: colors.mediumBlue }
      },
      { 
        text: 'Report Distribution Over Time',
        font: { bold: true, size: 12, color: colors.darkBlue } 
      }
    ]
  };
  timelineSheet.mergeCells(timelineIconRow.number, 1, timelineIconRow.number, 3);
  
  timelineSheet.addRow(['']); // Blank row
  
  // Get distribution data
  const timelineData = getReportDistributionData(filteredReports);
  
  // Find maximum count for scaling
  const maxCount = Math.max(...timelineData.map(item => item.count), 1);
  
  // Add header row
  const timelineHeader = timelineSheet.addRow(['Date', 'Number of Reports', 'Distribution']);
  applyHeaderStyle(timelineHeader);
  
  // Add data rows with visual bar chart
  timelineData.forEach((item, index) => {
    const row = timelineSheet.addRow([
      item.date, 
      item.count.toString(),
      ''  // We'll create a visual bar in this cell
    ]);
    
    applyDataRowStyle(row, index % 2 === 0);
    
    // Right align count
    row.getCell(2).alignment = { horizontal: 'right' };
    
    // Create a visual bar using cell background
    const barCell = row.getCell(3);
    
    // Scale the bar width based on the maximum value
    const barWidth = Math.max(Math.floor((item.count / maxCount) * 100), 0);
    
    if (item.count > 0) {
      // Create a visual bar using a character repeated based on count
      const bar = '■'.repeat(Math.max(1, Math.floor(barWidth / 5)));
      barCell.value = bar;
      barCell.font = { color: colors.mediumBlue };
    }
    
    // Highlight days with high report counts
    if (item.count > 2) {
      row.eachCell(cell => {
        cell.font = Object.assign({}, cell.font || {}, { bold: true });
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.lightBlue
        };
      });
    }
  });
  
  // Add a note about the visualization
  timelineSheet.addRow(['']);
  const noteRow = timelineSheet.addRow(['Note: Each ■ symbol represents approximately 5% of the maximum daily report count.']);
  noteRow.font = { italic: true, size: 9, color: colors.darkBlue };
  timelineSheet.mergeCells(noteRow.number, 1, noteRow.number, 3);
  
  // Add footer
  addFooter(timelineSheet, 3);
  
  // Apply final formatting
  [coverSheet, statsSheet, detailSheet, timelineSheet].forEach(sheet => {
    // Auto-size columns for better fit
    autoSizeColumns(sheet);
    
    // Apply conditional formatting
    applyCellFormatting(sheet);
    
    // Freeze panes for better navigation
    sheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 4, topLeftCell: 'A5', activeCell: 'A5' }
    ];
    
    // Paper size (A4)
    sheet.pageSetup.paperSize = 9;
    
    // Landscape orientation for better fit
    sheet.pageSetup.orientation = 'landscape';
    
    // Fit all columns on one page
    sheet.pageSetup.fitToPage = true;
    sheet.pageSetup.fitToWidth = 1;
    sheet.pageSetup.fitToHeight = 0;
    
    // Header and footer margins
    sheet.pageSetup.margins = {
      left: 0.5,
      right: 0.5,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    };
    
    // Ensure gridlines are shown in the printout
    sheet.pageSetup.showGridLines = true;
    
    // Add page numbers
    sheet.headerFooter.oddFooter = '&CPage &P of &N';
  });
  
  // Generate file and trigger download
  const filename = `leak-reports-${new Date().toISOString().split("T")[0]}.xlsx`;
  
  // In browser environment
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
            onClick={exportToXLSX}
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
