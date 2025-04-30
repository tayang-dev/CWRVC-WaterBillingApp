import * as XLSX from "xlsx";

// Enhanced Excel export function with better styling and sheet titles
export const exportDashboardData = ({
  dashboardStats,
  leakageData,
  billingTrends,
  paymentStatus,
  customerUsage,
}: {
  dashboardStats: Record<string, string>;
  leakageData: any[];
  billingTrends: any[];
  paymentStatus: any[];
  customerUsage: any[];
}) => {
  const workbook = XLSX.utils.book_new();
  const currentDate = new Date().toLocaleDateString();
  
  // Custom styling for headers
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4472C4" } },
    alignment: { horizontal: "center" }
  };
  
  // Add company information and report metadata
  const infoSheet = XLSX.utils.aoa_to_sheet([
    ["WATER UTILITY DASHBOARD REPORT"],
    ["Generated on: " + currentDate],
    [""],
    ["This report contains key metrics and analytics about water utility operations"],
    ["including customer data, leakage information, billing trends, and payment status."]
  ]);
  
  // Set title formatting
  if (!infoSheet["!merges"]) infoSheet["!merges"] = [];
  infoSheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });
  infoSheet["!rows"] = [{ hpt: 30 }]; // Taller first row for title
  
  // Apply custom styles to info sheet
  infoSheet["A1"] = { v: "WATER UTILITY DASHBOARD REPORT", t: "s", s: { 
    font: { bold: true, sz: 16, color: { rgb: "000000" } },
    alignment: { horizontal: "center" }
  }};
  
  XLSX.utils.book_append_sheet(workbook, infoSheet, "Dashboard Report");

  // 1. Dashboard KPIs
  const kpiSheetData = [
    ["KEY PERFORMANCE INDICATORS"], // Title row
    [""], // Empty row for spacing
    ["Metric", "Value"], // Header row
    ...Object.entries(dashboardStats), // Data rows
  ];
  const kpiSheet = XLSX.utils.aoa_to_sheet(kpiSheetData);
  
  // Style KPI sheet
  kpiSheet["A1"] = { v: "KEY PERFORMANCE INDICATORS", t: "s", s: { 
    font: { bold: true, sz: 14, color: { rgb: "000000" } },
    alignment: { horizontal: "center" }
  }};
  if (!kpiSheet["!merges"]) kpiSheet["!merges"] = [];
  kpiSheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
  
  // Style the header row
  ["A3", "B3"].forEach(cell => {
    kpiSheet[cell].s = headerStyle;
  });
  
  XLSX.utils.book_append_sheet(workbook, kpiSheet, "Dashboard KPIs");

  // 2. Leakage Data
  const leakageSheetData = [
    ["WATER LEAKAGE ANALYSIS"], // Title row
    [""], // Empty row for spacing
    ["Site", "Leak Count", "% of Total"], // Enhanced header row
    ...leakageData.map((item) => [
      item.name, 
      item.value,
      // Calculate percentage of total leaks
      `${((item.value / leakageData.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(1)}%`
    ]), // Data rows with percentages
  ];
  const leakageSheet = XLSX.utils.aoa_to_sheet(leakageSheetData);
  
  // Style leakage sheet
  leakageSheet["A1"] = { v: "WATER LEAKAGE ANALYSIS", t: "s", s: { 
    font: { bold: true, sz: 14, color: { rgb: "000000" } },
    alignment: { horizontal: "center" }
  }};
  if (!leakageSheet["!merges"]) leakageSheet["!merges"] = [];
  leakageSheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });
  
  // Style the header row
  ["A3", "B3", "C3"].forEach(cell => {
    leakageSheet[cell].s = headerStyle;
  });
  
  XLSX.utils.book_append_sheet(workbook, leakageSheet, "Water Leakage");

  // 3. Billing Trends (Customer Distribution)
  const billingSheetData = [
    ["CUSTOMER POPULATION DISTRIBUTION"], // Title row
    [""], // Empty row for spacing
    ["Site", "Customer Count", "% of Total"], // Enhanced header row
    ...billingTrends.map((item) => [
      item.name, 
      item.value,
      // Calculate percentage of total customers
      `${((item.value / billingTrends.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(1)}%`
    ]), // Data rows with percentages
  ];
  const billingSheet = XLSX.utils.aoa_to_sheet(billingSheetData);
  
  // Style billing trends sheet
  billingSheet["A1"] = { v: "CUSTOMER POPULATION DISTRIBUTION", t: "s", s: { 
    font: { bold: true, sz: 14, color: { rgb: "000000" } },
    alignment: { horizontal: "center" }
  }};
  if (!billingSheet["!merges"]) billingSheet["!merges"] = [];
  billingSheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });
  
  // Style the header row
  ["A3", "B3", "C3"].forEach(cell => {
    billingSheet[cell].s = headerStyle;
  });
  
  XLSX.utils.book_append_sheet(workbook, billingSheet, "Customer Population");

  // 4. Payment Status
  const paymentSheetData = [
    ["PAYMENT STATUS BREAKDOWN"], // Title row
    [""], // Empty row for spacing
    ["Status", "Count", "% of Total"], // Enhanced header row
    ...paymentStatus.map((item) => [
      item.name, 
      item.value,
      // Calculate percentage of total payments
      `${((item.value / paymentStatus.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(1)}%`
    ]), // Data rows with percentages
  ];
  const paymentSheet = XLSX.utils.aoa_to_sheet(paymentSheetData);
  
  // Style payment status sheet
  paymentSheet["A1"] = { v: "PAYMENT STATUS BREAKDOWN", t: "s", s: { 
    font: { bold: true, sz: 14, color: { rgb: "000000" } },
    alignment: { horizontal: "center" }
  }};
  if (!paymentSheet["!merges"]) paymentSheet["!merges"] = [];
  paymentSheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });
  
  // Style the header row
  ["A3", "B3", "C3"].forEach(cell => {
    paymentSheet[cell].s = headerStyle;
  });
  
  XLSX.utils.book_append_sheet(workbook, paymentSheet, "Payment Status");

  // 5. Customer Water Usage Ranking
  const usageSheetData = [
    ["CUSTOMER WATER USAGE RANKING"], // Title row
    [""], // Empty row for spacing
    ["Customer Name", "Account Number", "Site", "Total Water Usage (m³)", "Usage Category"], // Enhanced header row
    ...customerUsage.map((customer) => {
      const usage = customer.totalWaterUsage || 0;
      // Add usage category
      let category = "Low";
      if (usage > 100) category = "High";
      else if (usage > 50) category = "Medium";
      
      return [
        customer.name,
        customer.accountNumber,
        customer.site,
        usage,
        category
      ];
    }), // Data rows with usage category
  ];
  const usageSheet = XLSX.utils.aoa_to_sheet(usageSheetData);
  
  // Style usage sheet
  usageSheet["A1"] = { v: "CUSTOMER WATER USAGE RANKING", t: "s", s: { 
    font: { bold: true, sz: 14, color: { rgb: "000000" } },
    alignment: { horizontal: "center" }
  }};
  if (!usageSheet["!merges"]) usageSheet["!merges"] = [];
  usageSheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });
  
  // Style the header row
  ["A3", "B3", "C3", "D3", "E3"].forEach(cell => {
    usageSheet[cell].s = headerStyle;
  });
  
  XLSX.utils.book_append_sheet(workbook, usageSheet, "Usage Ranking");

  // Improved auto-width function for all sheets
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
    
    // Set the calculated column widths
    sheet["!cols"] = columnWidths.map(width => ({ wch: width }));
  };

  // Apply auto-width to all sheets
  [infoSheet, kpiSheet, leakageSheet, billingSheet, paymentSheet, usageSheet].forEach(autoWidth);

  // Add header and footer to the workbook
  workbook.Props = {
    Title: "Water Utility Dashboard Report",
    Subject: "Utility Analytics",
    Author: "Water Management System",
    CreatedDate: new Date()
  };

  // Download the file with date in filename
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  XLSX.writeFile(workbook, `Water_Utility_Dashboard_Report_${dateStr}.xlsx`);
  
  return `Report generated successfully as 'Water_Utility_Dashboard_Report_${dateStr}.xlsx'`;
};