import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Download } from "lucide-react";
import CustomerList from "./CustomerList";
import CustomerDetails from "./CustomerDetails";
import AddCustomerForm from "./AddCustomerForm";
// Enhanced exportToExcel function - Converted to ExcelJS
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver'; // For browser environments
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

  const exportToExcel = (data: any[], exportName: string) => {
    if (data.length === 0) {
      alert("No data to export!");
      return;
    }
  
    // Color constants
    const EXCEL_BLUE_HEADER = "4472C4";
    const EXCEL_DARK_BLUE = "1F4E79";
    const EXCEL_LIGHT_BLUE = "E6F2FF";
    const EXCEL_VERY_LIGHT_BLUE = "F0F8FF";
    
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = "Water Billing System";
    workbook.lastModifiedBy = "Water Billing System";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.properties.date1904 = false;
    
    workbook.title = "Water Billing Customer Report";
    workbook.subject = "Customer Data Export";
    workbook.keywords = "water billing, customers, report";
    workbook.category = "Reports";
    
    // COVER SHEET
    // ------------
    const coverSheet = workbook.addWorksheet('Cover Page', {
      properties: { tabColor: { argb: 'FF1F4E79' } }
    });
    
    // Set column widths
    coverSheet.columns = [
      { width: 60 }, // Make first column wide enough for centered text
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];
    
    // Add cover sheet content
    coverSheet.addRow(['WATER BILLING SYSTEM']);
    coverSheet.addRow(['CUSTOMER DATA REPORT']);
    coverSheet.addRow(['']);
    coverSheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
    coverSheet.addRow([`Total Records: ${data.length}`]);
    coverSheet.addRow(['']);
    coverSheet.addRow(['This report contains detailed information about customers registered in the Water Billing System.']);
    coverSheet.addRow(['For assistance, please contact the system administrator.']);
    
    // Merge cells for title rows and other centered content
    coverSheet.mergeCells('A1:F1'); // Title
    coverSheet.mergeCells('A2:F2'); // Subtitle
    coverSheet.mergeCells('A4:F4'); // Date
    coverSheet.mergeCells('A5:F5'); // Record count
    coverSheet.mergeCells('A7:F7'); // Description
    coverSheet.mergeCells('A8:F8'); // Contact info
    
    // Style title row
    const titleRow = coverSheet.getRow(1);
    titleRow.height = 36;
    titleRow.font = { bold: true, size: 24, color: { argb: 'FF0047AB' } };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    titleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${EXCEL_LIGHT_BLUE}` }
    };
    
    // Style subtitle row
    const subtitleRow = coverSheet.getRow(2);
    subtitleRow.height = 28;
    subtitleRow.font = { bold: true, size: 18, color: { argb: 'FF00008B' } };
    subtitleRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    subtitleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${EXCEL_VERY_LIGHT_BLUE}` }
    };
    
    // Apply row heights and styles to other rows
    coverSheet.getRow(4).height = 20; // Date row
    coverSheet.getRow(5).height = 20; // Record count row
    
    // Center all text in cover page
    for (let i = 1; i <= 8; i++) {
      const row = coverSheet.getRow(i);
      row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }
  
    // CUSTOMER DATA SHEET
    // -------------------
    const dataSheet = workbook.addWorksheet('Customer Data', {
      properties: { tabColor: { argb: 'FF4472C4' } }
    });
    
    // Define columns based on the exact Excel file structure shown in the image
    const columns = [
      { header: 'CUSTOMER DATA LISTING', width: 15 },
      { header: 'Account Number', key: 'accountNumber', width: 15 },
      { header: 'Customer Name', key: 'customer', width: 20 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Middle Initial', key: 'middleInitial', width: 10 },
      { header: 'Email/Contact', key: 'email', width: 25 },
      { header: 'Phone Number', key: 'phone', width: 15 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'User ID', key: 'userId', width: 18 },
      { header: 'Site', key: 'site', width: 8 },
      { header: 'Block', key: 'block', width: 8 },
      { header: 'Lot', key: 'lot', width: 8 },
      { header: 'Meter Number', key: 'meterNumber', width: 15 }
    ];
    
    // Set the columns
    dataSheet.columns = columns;
    

    
    // Merge cells for title across all columns
    dataSheet.mergeCells(1, 1, 1, columns.length);
    
    // Style the title
    const dataSheetTitleRow = dataSheet.getRow(1);
    dataSheetTitleRow.height = 30;
    dataSheetTitleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    dataSheetTitleRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    dataSheetTitleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${EXCEL_DARK_BLUE}` }
    };
    
    // Add header row explicitly
    const headerRow = dataSheet.addRow(columns.map(col => col.header));
    
    // Style the header row
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${EXCEL_BLUE_HEADER}` }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Format data for adding to the sheet
    const formattedData = data.map((item, index) => ({
      customerDetails: index + 1,
      accountNumber: item.accountNumber || '',
      customer: item.name || '',
      firstName: item.firstName || '',
      lastName: item.lastName || '',
      middleInitial: item.middleInitial || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      userId: item.userId || '',
      site: item.site || '',
      block: item.block || '',
      lot: item.lot || '',
      meterNumber: item.meterNumber || ''
    }));
    
    // Add data rows
    formattedData.forEach(row => {
      dataSheet.addRow(Object.values(row));
    });
    
    // Add borders to all data cells
    for (let i = 3; i <= formattedData.length + 2; i++) {
      const row = dataSheet.getRow(i);
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  
    // SUMMARY SHEET
    // -------------
    const summarySheet = workbook.addWorksheet('Summary', {
      properties: { tabColor: { argb: 'FF2F75B5' } }
    });
    
    // Set column widths for summary sheet
    summarySheet.columns = [
      { width: 25 },  // Status/Site name
      { width: 10 },  // Count
      { width: 12 },  // Percentage
      { width: 5 },   // Extra column for spacing
    ];
    
    // Calculate summary statistics
    const statusCounts: Record<string, number> = {};
    const siteCounts: Record<string, number> = {};
    let seniorCount = 0;
    
    // Calculate summary statistics
    data.forEach(customer => {
      // Count by status
      const status = customer.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Count by site
      const site = customer.site || 'Unknown';
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
    
    // Add title row
    summarySheet.addRow(['CUSTOMER DATA SUMMARY']);
    summarySheet.mergeCells('A1:D1');
    
    // Style title row
    const summaryTitleRow = summarySheet.getRow(1);
    summaryTitleRow.height = 30;
    summaryTitleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    summaryTitleRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    summaryTitleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${EXCEL_DARK_BLUE}` }
    };
    
    // Add empty row
    summarySheet.addRow([]);
    
    // Add general statistics
    summarySheet.addRow(['Total Customers:', data.length]);
    summarySheet.addRow(['Senior Citizens:', seniorCount, `${((seniorCount / data.length) * 100).toFixed(1)}%`]);
    summarySheet.addRow(['Regular Customers:', data.length - seniorCount, `${(((data.length - seniorCount) / data.length) * 100).toFixed(1)}%`]);
    
    // Add empty row
    summarySheet.addRow([]);
    
    // Add status breakdown header
    summarySheet.addRow(['CUSTOMER STATUS BREAKDOWN']);
    summarySheet.mergeCells('A7:C7');
    
    // Style section header
    const statusHeaderRow = summarySheet.getRow(7);
    statusHeaderRow.height = 25;
    statusHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    statusHeaderRow.alignment = { horizontal: 'left', vertical: 'middle' };
    statusHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F75B5' }
    };
    
    // Add status table headers
    summarySheet.addRow(['Status', 'Count', 'Percentage']);
    
    // Style status table headers
    const statusTableHeaderRow = summarySheet.getRow(8);
    statusTableHeaderRow.eachCell({ includeEmpty: false }, (cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${EXCEL_BLUE_HEADER}` }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Add status data
    let currentRow = 9;
    statusData.forEach(row => {
      summarySheet.addRow(row);
      
      // Add borders to data cells
      const dataRow = summarySheet.getRow(currentRow);
      dataRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Center align count and percentage columns
        if (colNumber > 1) {
          cell.alignment = { horizontal: 'center' };
        }
      });
      
      currentRow++;
    });
    
    // Add empty row
    summarySheet.addRow([]);
    currentRow++;
    
    // Add site distribution header
    summarySheet.addRow(['CUSTOMER SITE DISTRIBUTION']);
    summarySheet.mergeCells(currentRow, 1, currentRow, 3);
    
    // Style site distribution header
    const siteHeaderRow = summarySheet.getRow(currentRow);
    siteHeaderRow.height = 25;
    siteHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    siteHeaderRow.alignment = { horizontal: 'left', vertical: 'middle' };
    siteHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F75B5' }
    };
    
    currentRow++;
    
    // Add site table headers
    summarySheet.addRow(['Site', 'Count', 'Percentage']);
    
    // Style site table headers
    const siteTableHeaderRow = summarySheet.getRow(currentRow);
    siteTableHeaderRow.eachCell({ includeEmpty: false }, (cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${EXCEL_BLUE_HEADER}` }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    currentRow++;
    
    // Add site data
    siteData.forEach(row => {
      summarySheet.addRow(row);
      
      // Add borders to data cells
      const dataRow = summarySheet.getRow(currentRow);
      dataRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Center align count and percentage columns
        if (colNumber > 1) {
          cell.alignment = { horizontal: 'center' };
        }
      });
      
      currentRow++;
    });
    
    // Style the field names with light blue background in summary
    for (let i = 3; i <= 5; i++) {
      const cell = summarySheet.getCell(`A${i}`);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${EXCEL_VERY_LIGHT_BLUE}` }
      };
    }
  
    // EXPORT INFO SHEET
    // ----------------
    const metadataSheet = workbook.addWorksheet('Export Info', {
      properties: { tabColor: { argb: 'FFDDEBF7' } }
    });
    
    // Set column widths
    metadataSheet.columns = [
      { width: 20 },  // Field names
      { width: 40 },  // Values
    ];
    
    // Add title row
    metadataSheet.addRow(['EXPORT INFORMATION']);
    metadataSheet.mergeCells('A1:B1');
    
    // Style title row
    const metadataTitleRow = metadataSheet.getRow(1);
    metadataTitleRow.height = 30;
    metadataTitleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    metadataTitleRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    metadataTitleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${EXCEL_DARK_BLUE}` }
    };
    
    // Add empty row
    metadataSheet.addRow([]);
    
    // Add export info
    metadataSheet.addRow(['Report Name', exportName || 'Customer Data Export']);
    metadataSheet.addRow(['Export Date', new Date().toLocaleString()]);
    metadataSheet.addRow(['Total Records', data.length.toString()]);
    metadataSheet.addRow(['Export Generated By', 'Water Billing System']);
    
    // Add empty row
    metadataSheet.addRow([]);
    
    // Add notes section
    metadataSheet.addRow(['Notes:']);
    metadataSheet.addRow(['This report contains confidential customer information.']);
    metadataSheet.addRow(['Please handle in accordance with data privacy regulations.']);
    
    // Style the field names with light blue background
    for (let i = 3; i <= 6; i++) {
      const cell = metadataSheet.getCell(`A${i}`);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEDF3FA' }
      };
    }
    
    // Style the "Notes:" header
    const notesCell = metadataSheet.getCell('A8');
    notesCell.font = { bold: true };
    notesCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDDEBF7' }
    };
    
    // Generate filename with date for better organization
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = exportName 
      ? `${exportName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${date}` 
      : `water_billing_customers_${date}_${time}`;
    
    // Write the file and download
    return workbook.xlsx.writeBuffer()
      .then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${filename}.xlsx`);
        return `Report '${filename}.xlsx' generated successfully with ${data.length} records`;
      })
      .catch(err => {
        console.error('Error generating Excel file', err);
        throw err;
      });
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