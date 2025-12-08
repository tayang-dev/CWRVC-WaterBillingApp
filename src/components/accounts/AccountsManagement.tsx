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
import * as XLSX from "xlsx"; // Add this import for parsing Excel/CSV files
import Papa from "papaparse"; // For CSV parsing


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
  

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
 const [dialogSubmitFn, setDialogSubmitFn] = useState<(() => Promise<void> | void) | null>(null);
 const [isAdding, setIsAdding] = useState(false);


  // ...existing code...
const handleDownloadTemplate = async () => {
  // Use the same color constants as exportToExcel
  const EXCEL_BLUE_HEADER = "4472C4";
  const EXCEL_DARK_BLUE = "1F4E79";
  const EXCEL_LIGHT_BLUE = "E6F2FF";
  const EXCEL_VERY_LIGHT_BLUE = "F0F8FF";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Water Billing System";
  workbook.lastModifiedBy = "Water Billing System";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  workbook.title = "Customer Import Template";
  workbook.subject = "Customer Data Import";
  workbook.keywords = "water billing, customers, import, template";
  workbook.category = "Templates";

  // Create worksheet with styled tab
  const sheet = workbook.addWorksheet("Customer Import Template", {
    properties: { tabColor: { argb: `FF${EXCEL_BLUE_HEADER}` } }
  });

  // Set column widths and headers
  const columns = [
    { header: "Account Number", width: 15 },
    { header: "First Name", width: 15 },
    { header: "Last Name", width: 15 },
    { header: "Middle Initial", width: 10 },
    { header: "Email/Contact", width: 25 },
    { header: "Phone Number", width: 15 },
    { header: "Site", width: 10 },
    { header: "Senior Citizen", width: 12 },
    { header: "Block", width: 8 },
    { header: "Lot", width: 8 },
    { header: "Meter Number", width: 15 }
  ];
  sheet.columns = columns;

  // Header row (row 1) - styled
  const headerRow = sheet.getRow(1);
  headerRow.values = columns.map(col => col.header);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${EXCEL_BLUE_HEADER}` }
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = 18;
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  });

  // Sample data row (row 2) - styled
  const sampleRow = sheet.addRow([
    "21-12-2156", "Analiza", "De Castro", "L", "", "09970754514", "site3", "Yes", "21", "56", "13343711"
  ]);
  sampleRow.font = { color: { argb: "FF555555" } };
  sampleRow.alignment = { horizontal: "center", vertical: "middle" };
  sampleRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${EXCEL_VERY_LIGHT_BLUE}` }
    };
  });

  // Add some empty rows with borders for user to fill
  for (let i = 3; i <= 12; i++) {
    const emptyRow = sheet.getRow(i);
    emptyRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber <= columns.length) {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } }
        };
      }
    });
  }

  // Freeze the header row
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  // Auto-filter on header row
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  };

  // Download the file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, "customer_import_template.xlsx");
};
// ...existing code...
  // --- Import Customers Handler ---

const handleImportCustomers = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      // Read file as ArrayBuffer for xlsx, or text for csv
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      let rows: any[] = [];

      if (isExcel) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      } else if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true });
        rows = parsed.data as any[];
      } else {
        setImportError("Unsupported file type. Please upload a CSV or Excel file.");
        setImporting(false);
        alert("Import failed: Unsupported file type. Please upload a CSV or Excel file.");
        return;
      }

      if (!rows.length) {
        setImportError("No data found in the file. Please check your file content.");
        setImporting(false);
        alert("Import failed: No data found in the file. Please check your file content.");
        return;
      }

      // Normalize and validate rows
      const { collection, getDocs, where, query, addDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      // Fetch all existing account numbers, meter numbers, emails, phones for duplicate check
      const customersRef = collection(db, "customers");
      const existingSnapshot = await getDocs(customersRef);
      const existing = existingSnapshot.docs.map(doc => doc.data());
      const existingAccountNumbers = new Set(existing.map(c => c.accountNumber));
      const existingMeterNumbers = new Set(existing.map(c => c.meterNumber));
      const existingEmails = new Set(existing.map(c => c.email).filter(Boolean));
      const existingPhones = new Set(existing.map(c => c.phone).filter(Boolean));

      // Helper: Clean and map row to AddCustomerForm fields
      const mapRow = (row: any) => {
        // Accept both camelCase and Excel-style headers
        return {
          firstName: row.firstName || row["First Name"] || "",
          lastName: row.lastName || row["Last Name"] || "",
          middleInitial: row.middleInitial || row["Middle Initial"] || "",
          email: row.email || row["Email/Contact"] || "",
          phone: row.phone || row["Phone Number"] || "",
          site: row.site || row["Site"] || "",
          isSenior: row.isSenior === true || row.isSenior === "true" || row["Senior Citizen"] === "Yes" || false,
          accountNumber: row.accountNumber || row["Account Number"] || "",
          meterNumber: row.meterNumber || row["Meter Number"] || "",
          block: row.block || row["Block"] || "",
          lot: row.lot || row["Lot"] || "",
        };
      };

      // Validate and filter out duplicates
      const validRows: any[] = [];
      const duplicateRows: any[] = [];
      const missingFieldsRows: any[] = [];
      for (const row of rows) {
        const mapped = mapRow(row);

        // Skip if required fields are missing
        if (
          !mapped.firstName ||
          !mapped.lastName ||
          !mapped.accountNumber ||
          !mapped.meterNumber ||
          !mapped.site ||
          !mapped.block ||
          !mapped.lot
        ) {
          missingFieldsRows.push(mapped);
          continue;
        }

        // Check for duplicates in DB
        if (
          existingAccountNumbers.has(mapped.accountNumber) ||
          existingMeterNumbers.has(mapped.meterNumber) ||
          (mapped.email && existingEmails.has(mapped.email)) ||
          (mapped.phone && existingPhones.has(mapped.phone))
        ) {
          duplicateRows.push(mapped);
          continue;
        }

        // Check for duplicates in the same import batch
        if (
          validRows.some(
            v =>
              v.accountNumber === mapped.accountNumber ||
              v.meterNumber === mapped.meterNumber ||
              (mapped.email && v.email === mapped.email) ||
              (mapped.phone && v.phone === mapped.phone)
          )
        ) {
          duplicateRows.push(mapped);
          continue;
        }

        validRows.push(mapped);
      }

      // Add valid customers to Firestore
      let addedCount = 0;
      let failedAdds: any[] = [];
      for (const customer of validRows) {
        try {
          // Compose full name and address as in AddCustomerForm
          const siteAddresses = {
            site1: "Site 1, Brgy. Dayap, Calauan, Laguna",
            site2: "Site 2, Brgy. Dayap, Calauan, Laguna",
            site3: "Site 3, Brgy. Dayap, Calauan, Laguna",
          };
          const fullName = `${customer.firstName} ${customer.middleInitial ? customer.middleInitial + ". " : ""}${customer.lastName}`.trim();
         
          // Ensure all fields (except isSenior) are strings
          const customerData = {
            accountNumber: String(customer.accountNumber || ""),
            address: String(siteAddresses[customer.site as keyof typeof siteAddresses] || ""),
            block: String(customer.block || ""),
            email: customer.email ? String(customer.email) : null,
            firstName: String(customer.firstName || ""),
            joinDate: new Date().toISOString().split("T")[0], // Default to today's date
            lastBillingDate: new Date().toISOString().split("T")[0], // Default to today's date
            lastName: String(customer.lastName || ""),
            lot: String(customer.lot || ""),
            meterNumber: String(customer.meterNumber || ""),
            middleInitial: String(customer.middleInitial || ""),
            name: fullName,
            phone: String(customer.phone || ""),
            site: String(customer.site || ""),
            status: "active",
            isSenior: Boolean(customer.isSenior), // Ensure isSenior is a boolean
          };

          await addDoc(customersRef, customerData);
          addedCount++;
        } catch (e) {
          failedAdds.push(customer);
        }
      }

      // Refresh customer list after import
      const refreshedSnapshot = await getDocs(customersRef);
      const refreshedList = refreshedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomers(refreshedList);

      setImporting(false);

      let msg = `Imported ${addedCount} customers successfully.`;
      if (duplicateRows.length > 0) {
        msg += `\n${duplicateRows.length} rows were skipped due to duplicate account number, meter number, email, or phone.`;
      }
      if (missingFieldsRows.length > 0) {
        msg += `\n${missingFieldsRows.length} rows were skipped due to missing required fields (first name, last name, account number, meter number, site, block, or lot).`;
      }
      if (failedAdds.length > 0) {
        msg += `\n${failedAdds.length} rows failed to add due to a database error.`;
      }
      if (addedCount === 0) {
        msg = "No customers were imported.\n" + msg;
        alert(msg);
      } else {
        alert(msg);
      }
    } catch (err: any) {
      setImportError("Import failed: " + (err.message || "Unknown error"));
      setImporting(false);
      alert("Import failed: " + (err.message || "Unknown error"));
    }
  };




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
    coverSheet.addRow(['CWRVC Water Billing App']); // Changed title
    coverSheet.addRow(['CUSTOMER DATA REPORT']);
    coverSheet.addRow(['Southville 7, Site 3, Brgy. Sto. Tomas, Calauan, Laguna']); // Added address
    coverSheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
    coverSheet.addRow([`Total Records: ${data.length}`]);
    coverSheet.addRow(['']);
    coverSheet.addRow(['This report contains detailed information about customers registered in the Water Billing System.']);
    coverSheet.addRow(['For assistance, please contact the system administrator.']);
    
    // Merge cells for title rows and other centered content
    coverSheet.mergeCells('A1:F1'); // Title
    coverSheet.mergeCells('A2:F2'); // Subtitle
    coverSheet.mergeCells('A3:F3'); // Address
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





const handleSendLoginCredentialsSms = async () => {
  if (filteredCustomersForExport.length === 0) {
    alert("No customers available to send SMS.");
    return;
  }

  const sendSms = async (to: string, message: string) => {
    try {
      // Adjust the URL to your deployed Cloud Function endpoint if needed
      const response = await fetch("/sendSms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send SMS");
      return true;
    } catch (error) {
      console.error("Error sending SMS:", error);
      return false;
    }
  };

  let successCount = 0;
  for (const customer of filteredCustomersForExport) {
    const username = customer.email || customer.phone || "N/A";
    const password = customer.accountNumber || "N/A";
    const to = customer.phone;
    if (!to) continue;

    const message = 
      `CENTENNIAL WATER LOGIN\n` +
      `Username: ${username}\n` +
      `Password: ${password}\n` +
      `Please change your password after first login.`;

    const sent = await sendSms(to, message);
    if (sent) successCount++;
  }

  alert(`Sent SMS to ${successCount} out of ${filteredCustomersForExport.length} customers.`);
};




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
            {/* Import Customers Button */}
            <div>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setImportDialogOpen(true)}
                disabled={importing}
              >
                <Download className="h-4 w-4" />
                Import Customers
              </Button>
            </div>
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
              onClick={() => setAddDialogOpen(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

          {importDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Import Customers</h2>
                  <button 
                    onClick={() => setImportDialogOpen(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 mb-5 border border-blue-100">
                  <p className="text-sm text-blue-800">
                    Please download and use our template. Fill it out and upload the completed file.
                  </p>
                </div>
                
                <Button
                  onClick={handleDownloadTemplate}
                  className="mb-5 w-full flex items-center justify-center"
                  variant="outline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download Template
                </Button>

                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center mb-4 transition-colors ${
                    dragging
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-blue-500"
                  }`}
                  onDragOver={e => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={e => {
                    e.preventDefault();
                    setDragging(false);
                  }}
                  onDrop={async e => {
                    e.preventDefault();
                    setDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const file = e.dataTransfer.files[0];
                      const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
                      await handleImportCustomers(fakeEvent);
                      setImportDialogOpen(false);
                    }
                  }}
                >
                  <input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    id="import-customers-input"
                    onChange={async (e) => {
                      await handleImportCustomers(e);
                      setImportDialogOpen(false);
                    }}
                    disabled={importing}
                    className="hidden"
                  />
                  <label
                    htmlFor="import-customers-input"
                    className="cursor-pointer block"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-gray-400 mb-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                      {importing ? 'Uploading...' : 'Click or drag file here to upload'}
                    </span>
                    <span className="text-xs text-gray-500 block mt-1">
                      Supported formats: CSV, XLS, XLSX
                    </span>
                  </label>
                </div>

                
                {importError && (
                  <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md mb-4 flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{importError}</span>
                  </div>
                )}
                
                <div className="flex justify-end gap-3 mt-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => setImportDialogOpen(false)}
                    className="text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="default"
                    disabled={importing}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => document.getElementById('import-customers-input').click()}
                  >
                    {importing ? 'Importing...' : 'Upload File'}
                  </Button>
                </div>
              </div>
            </div>
          )}



          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Removed Tabs since there's only one tab */}
            <div>
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
                      onFilteredDataChange={handleFilteredDataChange}
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
            </div>
          </div>


          {addDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl border border-gray-200 flex flex-col">
                <div className="p-6 flex items-center justify-between">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-blue-700">Add New Customer</h2>
                    <p className="text-gray-600 text-sm mt-1">Fill out the form below to add a new customer.</p>
                  </div>
                  <button 
                    onClick={() => setAddDialogOpen(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {/* Scrollable form area */}
                <div className="overflow-y-auto max-h-[75vh]">
                  <AddCustomerForm
                    onSubmit={(data) => {
                      // Refresh customer list after adding and close dialog
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
                      setAddDialogOpen(false);
                      setView("list");
                    }}
                    onCancel={() => setAddDialogOpen(false)}
                    noCard={true} // compact form for dialog
                    noFooter={true} // hide internal footer so we can render a small fixed footer
                    setSubmitHandler={(fn) => setDialogSubmitFn(() => fn)} // capture submit
                  />
                </div>

                {/* Compact footer outside the scroll area so it's visible immediately */}
                <div className="flex justify-end gap-3 p-4 border-t">
                  <Button 
                    variant="ghost" 
                    onClick={() => setAddDialogOpen(false)}
                    className="text-gray-700"
                  >
                    Cancel
                  </Button>
                 <Button
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={async () => {
                      if (isAdding) return;
                      setIsAdding(true);
                      try {
                        // Await the submit handler in case it returns a Promise
                        await dialogSubmitFn?.();
                      } catch (err) {
                        console.error("Add customer failed:", err);
                      } finally {
                        setIsAdding(false);
                      }
                    }}
                    disabled={isAdding}
                  >
                    {isAdding ? "Adding..." : "Add Customer"}
                  </Button>
                </div>
              </div>
            </div>
          )}


        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Water Billing App - Admin Portal v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default AccountsManagement;