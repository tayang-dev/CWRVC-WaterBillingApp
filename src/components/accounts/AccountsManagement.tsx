import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Download } from "lucide-react";
import CustomerList from "./CustomerList";
import CustomerDetails from "./CustomerDetails";
import AddCustomerForm from "./AddCustomerForm";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

interface AccountsManagementProps {
  initialView?: "list" | "details";
  selectedCustomerId?: string;
}

const AccountsManagement = ({
  initialView = "list",
  selectedCustomerId = "",
}: AccountsManagementProps) => {
  const [view, setView] = useState<"list" | "details" | "add">(initialView);
  const [selectedCustomer, setSelectedCustomer] =
    useState<string>(selectedCustomerId);
  const [searchFilters, setSearchFilters] = useState({
    query: "",
    filters: {
      status: "all",
      billingCycle: "all",
      location: "all",
    },
  });

// Enhanced exportToExcel function with improved styling and formatting
const exportToExcel = (data: any[], exportName: string) => {
  if (data.length === 0) {
    alert("No data to export!");
    return;
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Set workbook properties
  workbook.Props = {
    Title: "Water Billing Customer Report",
    Subject: "Customer Data Export",
    Author: "Water Billing System",
    CreatedDate: new Date()
  };

  // COVER SHEET
  // ------------
  const coverSheet = XLSX.utils.aoa_to_sheet([
    ["WATER BILLING SYSTEM"],
    ["CUSTOMER DATA REPORT"],
    [""],
    ["Generated on: " + new Date().toLocaleString()],
    ["Total Records: " + data.length],
    [""],
    ["This report contains detailed information about customers registered in the Water Billing System."],
    ["For assistance, please contact the system administrator."]
  ]);

  // Style cover sheet
  coverSheet["A1"] = { 
    v: "WATER BILLING SYSTEM", 
    t: "s", 
    s: { 
      font: { bold: true, sz: 24, color: { rgb: "0047AB" } }, // Enhanced: Larger font and cobalt blue
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "E6F2FF" } } // Light blue background
    }
  };
  
  coverSheet["A2"] = { 
    v: "CUSTOMER DATA REPORT", 
    t: "s", 
    s: { 
      font: { bold: true, sz: 18, color: { rgb: "00008B" } }, // Enhanced: Dark blue
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "F0F8FF" } } // Very light blue background
    }
  };
  
  // Enhanced: Add style to date and record count
  coverSheet["A4"] = {
    v: "Generated on: " + new Date().toLocaleString(),
    t: "s",
    s: {
      font: { italic: true, color: { rgb: "555555" } },
      alignment: { horizontal: "center" }
    }
  };
  
  coverSheet["A5"] = {
    v: "Total Records: " + data.length,
    t: "s",
    s: {
      font: { bold: true, color: { rgb: "555555" } },
      alignment: { horizontal: "center" }
    }
  };
  
  // Set merge cells for title rows and other centered content
  if (!coverSheet["!merges"]) coverSheet["!merges"] = [];
  coverSheet["!merges"].push(
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Subtitle
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }, // Date
    { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } }, // Record count
    { s: { r: 6, c: 0 }, e: { r: 6, c: 5 } }, // Description
    { s: { r: 7, c: 0 }, e: { r: 7, c: 5 } }  // Contact info
  );
  
  // Enhanced: Add style to description
  coverSheet["A7"] = {
    v: "This report contains detailed information about customers registered in the Water Billing System.",
    t: "s",
    s: {
      alignment: { horizontal: "center", wrapText: true }
    }
  };
  
  coverSheet["A8"] = {
    v: "For assistance, please contact the system administrator.",
    t: "s",
    s: {
      alignment: { horizontal: "center" }
    }
  };
  
  // Set row heights
  coverSheet["!rows"] = [
    { hpt: 36 }, // Enhanced: Taller title row
    { hpt: 28 }, // Enhanced: Taller subtitle row
    { hpt: 16 }, // Spacing
    { hpt: 20 }, // Date row
    { hpt: 20 }, // Record count row
  ];
  
  XLSX.utils.book_append_sheet(workbook, coverSheet, "Cover Page");

  // CUSTOMER DATA SHEET
  // -------------------
  // Define columns explicitly with better formatting
  const formattedData = data.map((item) => ({
    "Account Number": item.accountNumber || "",
    "Name": item.name || "",
    "First Name": item.firstName || "",
    "Last Name": item.lastName || "",
    "Middle Initial": item.middleInitial || "",
    "Email": item.email || "",
    "Phone": item.phone || "",
    "Address": item.address || "",
    "User ID": item.id || "",
    "Site": item.site || "",
    "Block": item.block || "",
    "Lot": item.lot || "",
    "Meter Number": item.meterNumber || "",
    "Status": item.status || "",
    "Is Senior": item.isSenior ? "Yes" : "No",
    
  }));

  // Add a title row for the data sheet before converting to sheet
  const worksheet = XLSX.utils.json_to_sheet([]);
  XLSX.utils.sheet_add_json(worksheet, formattedData, {
    origin: "A2" // Start at A2 to leave room for title
  });
  
  // Enhanced: Add title row with better formatting
  XLSX.utils.sheet_add_aoa(worksheet, [["CUSTOMER DATA LISTING"]], { origin: "A1" });
  
  // Enhanced: Style the title row with better colors and formatting
  worksheet["A1"] = { 
    v: "CUSTOMER DATA LISTING", 
    t: "s", 
    s: { 
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, // White text
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "1F4E79" } }, // Deeper blue background
      border: {
        bottom: { style: "medium", color: { rgb: "4472C4" } } // Bottom border
      }
    }
  };
  
  // Merge cells for title
  if (!worksheet["!merges"]) worksheet["!merges"] = [];
  worksheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 15 } });
  
  // Get header range and apply styling
  const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1");
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4472C4" } }, // Standard blue
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    }
  };
  
  // Apply header styling to each header cell
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerCell = XLSX.utils.encode_cell({ r: 1, c: C });
    if (worksheet[headerCell]) {
      worksheet[headerCell].s = headerStyle;
    }
  }
  
  // Set column widths optimally based on content
  const columnWidths = [
    { wch: 15 },  // Account Number
    { wch: 20 },  // Name
    { wch: 15 },  // First Name
    { wch: 15 },  // Last Name
    { wch: 10 },  // Middle Initial
    { wch: 30 },  // Email
    { wch: 15 },  // Phone
    { wch: 40 },  // Address
    { wch: 10 },  // User ID
    { wch: 12 },  // Site
    { wch: 10 },  // Block
    { wch: 10 },  // Lot
    { wch: 15 },  // Meter Number
    { wch: 12 },  // Status
    { wch: 10 },  // Is Senior
    { wch: 18 },  // Registration Date
  ];
  
  worksheet["!cols"] = columnWidths;
  worksheet["!rows"] = [{ hpt: 30 }]; // Enhanced: Taller height for title row
  
  // Add the customer data sheet
  XLSX.utils.book_append_sheet(workbook, worksheet, "Customer Data");
  
  // SUMMARY SHEET
  // -------------
  // Create a summary sheet with key statistics
  const statusCounts: Record<string, number> = {};
  const siteCounts: Record<string, number> = {};
  let seniorCount = 0;
  
  // Calculate summary statistics
  data.forEach(customer => {
    // Count by status
    const status = customer.status || "Unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    
    // Count by site
    const site = customer.site || "Unknown";
    siteCounts[site] = (siteCounts[site] || 0) + 1;
    
    // Count seniors
    if (customer.isSenior) {
      seniorCount++;
    }
  });
  
  // Convert counts to arrays for the sheet
  const statusData = Object.entries(statusCounts).map(([status, count]) => [
    status, 
    count, 
    `${((count / data.length) * 100).toFixed(1)}%`
  ]);
  
  const siteData = Object.entries(siteCounts).map(([site, count]) => [
    site, 
    count, 
    `${((count / data.length) * 100).toFixed(1)}%`
  ]);
  
  // Create summary sheet
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["CUSTOMER DATA SUMMARY"],
    [""],
    ["Total Customers:", data.length],
    ["Senior Citizens:", seniorCount, `${((seniorCount / data.length) * 100).toFixed(1)}%`],
    ["Regular Customers:", data.length - seniorCount, `${(((data.length - seniorCount) / data.length) * 100).toFixed(1)}%`],
    [""],
    ["CUSTOMER STATUS BREAKDOWN"],
    ["Status", "Count", "Percentage"],
    ...statusData,
    [""],
    ["CUSTOMER SITE DISTRIBUTION"],
    ["Site", "Count", "Percentage"],
    ...siteData
  ]);
  
  // Enhanced: Style summary sheet with better title formatting
  summarySheet["A1"] = { 
    v: "CUSTOMER DATA SUMMARY", 
    t: "s", 
    s: { 
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, // White text
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "1F4E79" } }, // Deeper blue background
      border: {
        bottom: { style: "medium", color: { rgb: "4472C4" } } // Bottom border
      }
    }
  };
  
  // Merge cells for title
  if (!summarySheet["!merges"]) summarySheet["!merges"] = [];
  summarySheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });
  
  // Enhanced: Style section titles with background colors
  summarySheet["A7"] = { 
    v: "CUSTOMER STATUS BREAKDOWN", 
    t: "s", 
    s: { 
      font: { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "left", vertical: "center" },
      fill: { fgColor: { rgb: "2F75B5" } }, // Medium blue background
      border: {
        bottom: { style: "thin", color: { rgb: "AAAAAA" } }
      }
    }
  };
  
  // Merge the section title
  summarySheet["!merges"].push({ s: { r: 6, c: 0 }, e: { r: 6, c: 2 } });
  
  // Enhanced: Header styling for status table
  const enhancedHeaderStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4472C4" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    }
  };
  
  summarySheet["A8"] = { v: "Status", t: "s", s: enhancedHeaderStyle };
  summarySheet["B8"] = { v: "Count", t: "s", s: enhancedHeaderStyle };
  summarySheet["C8"] = { v: "Percentage", t: "s", s: enhancedHeaderStyle };
  
  // Calculate where the site distribution header row is
  const siteHeaderRow = 8 + statusData.length + 2;
  
  // Enhanced: Style site distribution title
  summarySheet[`A${siteHeaderRow}`] = { 
    v: "CUSTOMER SITE DISTRIBUTION", 
    t: "s", 
    s: { 
      font: { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "left", vertical: "center" },
      fill: { fgColor: { rgb: "2F75B5" } }, // Medium blue background
      border: {
        bottom: { style: "thin", color: { rgb: "AAAAAA" } }
      }
    }
  };
  
  // Merge the site distribution title
  summarySheet["!merges"].push({ s: { r: siteHeaderRow-1, c: 0 }, e: { r: siteHeaderRow-1, c: 2 } });
  
  // Enhanced: Header styling for site table
  summarySheet[`A${siteHeaderRow+1}`] = { v: "Site", t: "s", s: enhancedHeaderStyle };
  summarySheet[`B${siteHeaderRow+1}`] = { v: "Count", t: "s", s: enhancedHeaderStyle };
  summarySheet[`C${siteHeaderRow+1}`] = { v: "Percentage", t: "s", s: enhancedHeaderStyle };
  
  // Set column widths for summary sheet
  summarySheet["!cols"] = [
    { wch: 25 },  // Status/Site name
    { wch: 10 },  // Count
    { wch: 12 },  // Percentage
  ];
  
  // Enhanced: Set row height for title and section headers
  summarySheet["!rows"] = [
    { hpt: 30 }, // Title row
    { hpt: 20 }, // Empty row
    { hpt: 20 }, // Total customers
    { hpt: 20 }, // Senior citizens
    { hpt: 20 }, // Regular customers
    { hpt: 20 }, // Empty row
    { hpt: 25 }, // Status breakdown header
  ];
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  
  // EXPORT INFO SHEET
  // ----------------
  const metadataSheet = XLSX.utils.aoa_to_sheet([
    ["EXPORT INFORMATION"],
    [""],
    ["Report Name", exportName || "Customer Data Export"],
    ["Export Date", new Date().toLocaleString()],
    ["Total Records", data.length.toString()],
    ["Export Generated By", "Water Billing System"],
    [""],
    ["Notes:"],
    ["This report contains confidential customer information."],
    ["Please handle in accordance with data privacy regulations."]
  ]);
  
  // Enhanced: Style metadata sheet title with better formatting
  metadataSheet["A1"] = { 
    v: "EXPORT INFORMATION", 
    t: "s", 
    s: { 
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, // White text
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "1F4E79" } }, // Deeper blue background
      border: {
        bottom: { style: "medium", color: { rgb: "4472C4" } } // Bottom border
      }
    }
  };
  
  if (!metadataSheet["!merges"]) metadataSheet["!merges"] = [];
  metadataSheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
  
  // Enhanced: Style the "Notes:" header
  metadataSheet["A8"] = {
    v: "Notes:",
    t: "s",
    s: {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "DDEBF7" } }, // Light blue background
      border: {
        bottom: { style: "thin", color: { rgb: "AAAAAA" } }
      }
    }
  };
  
  // Bold the field names with light blue background
  for (let i = 2; i <= 6; i++) {
    const cell = `A${i}`;
    if (metadataSheet[cell]) {
      metadataSheet[cell].s = { 
        font: { bold: true },
        fill: { fgColor: { rgb: "EDF3FA" } } // Very light blue background
      };
    }
  }
  
  // Set column widths for metadata
  metadataSheet["!cols"] = [
    { wch: 20 },  // Field names
    { wch: 40 },  // Values
  ];
  
  // Enhanced: Set row height for title row
  metadataSheet["!rows"] = [
    { hpt: 30 }, // Title row
  ];
  
  XLSX.utils.book_append_sheet(workbook, metadataSheet, "Export Info");
  
  // Generate filename with date for better organization
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = exportName 
    ? `${exportName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${date}` 
    : `water_billing_customers_${date}_${time}`;
  
  // Improve readability of auto-width columns across all sheets
  const autoWidth = (sheet: XLSX.WorkSheet) => {
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    const columnWidths: number[] = [];
    
    // Calculate column widths based on content
    data.forEach(row => {
      (row as any[]).forEach((cell, i) => {
        const cellValue = cell !== null ? String(cell) : '';
        columnWidths[i] = Math.max(columnWidths[i] || 10, cellValue.length + 4);
      });
    });
    
    // Don't overwrite manually set column widths
    if (!sheet["!cols"]) {
      sheet["!cols"] = columnWidths.map(width => ({ wch: width }));
    }
  };
  
  // Apply auto-width to all sheets
  [coverSheet, worksheet, summarySheet, metadataSheet].forEach(autoWidth);
  
  // Write the file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
  
  return `Report '${filename}.xlsx' generated successfully with ${data.length} records`;
};

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedSenior, setSelectedSenior] = useState<string>("all");
  const [filteredCustomersForExport, setFilteredCustomersForExport] = useState<any[]>([]);


 // Fetch customers from Firestore with site and senior filters
useEffect(() => {
  const fetchCustomers = async () => {
    try {
      const { collection, getDocs, where, query } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      let customersRef = collection(db, "customers");
      let constraints = [];

      if (selectedSite !== "all") {
        constraints.push(where("site", "==", selectedSite));
      }

      if (selectedSenior !== "all") {
        const isSeniorBoolean = selectedSenior === "true"; // Convert to boolean
        constraints.push(where("isSenior", "==", isSeniorBoolean));
      }

      const q = constraints.length > 0 ? query(customersRef, ...constraints) : customersRef;
      const customersSnapshot = await getDocs(q);

      const customersList = customersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || "active",
        lastBillingDate: doc.data().lastBillingDate || new Date().toISOString().split("T")[0],
        amountDue: doc.data().amountDue || 0,
      }));

      setCustomers(customersList);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchCustomers();
}, [selectedSite, selectedSenior]); // Re-fetch when filters change




const handlePrintLoginCredentials = () => {
  if (filteredCustomersForExport.length === 0) {
    alert("No customers available to print login credentials.");
    return;
  }

  // Create a new PDF with letter size format
  const doc = new jsPDF({
    format: 'letter'
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Define colors for professional look
  const primaryColor = [0, 83, 156]; // Deep blue
  const secondaryColor = [100, 100, 100]; // Dark gray
  const accentColor = [240, 240, 240]; // Light gray for backgrounds

  // Company information
  const companyName = "CENTENNIAL WATER RESOURCE VENTURE CORPORATION";
  const companyAddress = "Southville 7, Site 3, Brgy. Sto. Tomas, Calauan, Laguna";
  const logoPath = "src/assets/logo.png";

  // Add company logo image
  try {
    const img = new Image();
    img.src = logoPath;

    filteredCustomersForExport.forEach((customer, index) => {
      // Add company logo/header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 42, "F");

      // Add logo with increased width (from 30 to 35)
      try {
        doc.addImage(img, "PNG", 10, 5, 35, 30);
      } catch (e) {
        console.warn("Logo couldn't be added:", e);
      }

      // Company name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255); // White text for header
      doc.text(companyName, pageWidth - 10, 15, { align: "right" });

      // Company address
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(companyAddress, pageWidth - 10, 22, { align: "right" });

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Initial Login Credentials", pageWidth - 10, 32, { align: "right" });

      // Reset text color for main content
      doc.setTextColor(0, 0, 0);

      // Add decorative element
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1.5);
      doc.line(10, 47, pageWidth - 10, 47);

      // Recommendation box
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.roundedRect(10, 52, pageWidth - 20, 20, 3, 3, "F");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(
        "These are your initial login credentials. Please change your password upon first login for security purposes.",
        pageWidth / 2,
        64,
        { align: "center", maxWidth: pageWidth - 40 }
      );

      // Customer Details Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Customer Details", 10, 85);

      // Add subtle underline for section headers
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(10, 87, 80, 87);

      // Customer info
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);

      // Create two-column layout for customer info
      const leftColX = 10;
      const rightColX = pageWidth / 2 + 10;

      doc.text(`Account Number:`, leftColX, 100);
      doc.setFont("helvetica", "bold");
      doc.text(`${customer.accountNumber || "N/A"}`, leftColX + 40, 100);

      doc.setFont("helvetica", "normal");
      doc.text(`Name:`, rightColX, 100);
      doc.setFont("helvetica", "bold");
      doc.text(`${customer.name || "N/A"}`, rightColX + 20, 100);

      // Add service address if available
      doc.setFont("helvetica", "normal");
      doc.text(`Service Address:`, leftColX, 115);
      doc.setFont("helvetica", "bold");
      doc.text(`${customer.address || "N/A"}`, leftColX + 40, 115);

      // Login Credentials Section with highlighted box
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.roundedRect(10, 130, pageWidth - 20, 60, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Login Credentials", pageWidth / 2, 145, { align: "center" });

      // Add icon-like elements for username and password
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.circle(30, 160, 3, "F");
      doc.circle(30, 175, 3, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const username = customer.email || customer.phone || "N/A";
      const password = customer.accountNumber;

      // Display credentials with proper spacing
      doc.text(`Username:`, 40, 160);
      doc.setFont("helvetica", "bold");
      doc.text(`${username}`, 90, 160);

      doc.setFont("helvetica", "normal");
      doc.text(`Password:`, 40, 175);
      doc.setFont("helvetica", "bold");
      doc.text(`${password}`, 90, 175);

      // Footer with security notice
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, pageHeight - 25, pageWidth, 25, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("IMPORTANT SECURITY NOTICE", pageWidth / 2, pageHeight - 15, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        "For your protection, please keep this document secure and change your password immediately after first login.",
        pageWidth / 2,
        pageHeight - 8,
        { align: "center", maxWidth: pageWidth - 20 }
      );

      // Add a new page for the next customer, except for the last one
      if (index < filteredCustomersForExport.length - 1) {
        doc.addPage();
      }
    });

    // Save the PDF with more descriptive filename
    doc.save(`Filtered_Login_Credentials_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (e) {
    console.error("Error generating PDF:", e);
    alert("Error generating PDF. Please try again later.");
  }
};



  // Function to handle export button click
  const handleExportData = () => {
    // Use the most recent filtered customers data
    exportToExcel(filteredCustomersForExport, "customers_data");
  };

    // Pass this to CustomerList component to get filtered data
    const handleFilteredDataChange = (filteredData: any[]) => {
      setFilteredCustomersForExport(filteredData);
    };

  const handleViewCustomer = (customerId: string) => {
    setSelectedCustomer(customerId);
    setView("details");
  };



  const handleBackToList = () => {
    setView("list");
    setSelectedCustomer("");
  };

  // Find the selected customer for details view
  const customerDetails = customers.find((c) => c.id === selectedCustomer);

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Customer Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage customer accounts, users, and payment information
            </p>
          </div>
          <div className="flex space-x-3">
            {/* Export Data Button */}
            <Button variant="outline" className="flex items-center gap-2" onClick={handleExportData}>
              <Download className="h-4 w-4" />
              Export Data
            </Button>
            
            {/* Print Login Credentials Button */}
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handlePrintLoginCredentials}
            >
              <Download className="h-4 w-4" />
              Print Login Credentials
            </Button>
            
            {/* Add Customer Button */}
            <Button
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => setView("add")}
            >
              <PlusCircle className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <Tabs defaultValue="accounts" className="w-full">
            <div className="border-b px-6 py-3">
              <TabsList className="grid w-full max-w-md grid-cols-1">
                <TabsTrigger
                  value="accounts"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Customer Accounts
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="accounts" className="p-0">
              {view === "list" ? (
                <div className="space-y-6 p-6">
              
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <p>Loading customers...</p>
                    </div>
                  ) : (
                    <CustomerList
                      customers={customers}
                      onViewCustomer={handleViewCustomer}
                      onFilteredDataChange={handleFilteredDataChange} // Add this prop
                      
                    />
                  )}
                </div>
              ) : view === "details" ? (
                <div className="p-6">
                  <Button
                    variant="outline"
                    onClick={handleBackToList}
                    className="mb-6"
                  >
                    ← Back to Customer List
                  </Button>
                  {customerDetails && (
                    <CustomerDetails
                      customer={{
                        id: customerDetails.id,
                        name: customerDetails.name,
                        email: customerDetails.email,
                        phone: customerDetails.phone,
                        address: customerDetails.address,
                        accountNumber: customerDetails.accountNumber,
                        status: customerDetails.status,
                        joinDate: customerDetails.joinDate,
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="p-6">
                  <Button
                    variant="outline"
                    onClick={handleBackToList}
                    className="mb-6"
                  >
                    ← Back to Customer List
                  </Button>
                  <AddCustomerForm
                    onSubmit={(data) => {
                      // Refresh customer list after adding
                      const fetchCustomers = async () => {
                        try {
                          const { collection, getDocs } = await import(
                            "firebase/firestore"
                          );
                          const { db } = await import("../../lib/firebase");

                          const customersCollection = collection(
                            db,
                            "customers",
                          );
                          const customersSnapshot =
                            await getDocs(customersCollection);

                          const customersList = customersSnapshot.docs.map(
                            (doc) => ({
                              id: doc.id,
                              ...doc.data(),
                            }),
                          );

                          setCustomers(customersList);
                        } catch (error) {
                          console.error("Error fetching customers:", error);
                        }
                      };

                      fetchCustomers();
                      setView("list");
                    }}
                    onCancel={handleBackToList}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Water Billing App - Admin Portal v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default AccountsManagement;