import ExcelJS from "exceljs";

// Enhanced Excel export function with better styling and sheet titles using ExcelJS
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
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const currentDate = new Date().toLocaleDateString();
  
  // Set workbook properties
  workbook.creator = "Water Management System";
  workbook.lastModifiedBy = "Water Management System";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;
  
  // Set custom properties for title and metadata
  // Since TypeScript is complaining about these properties
  (workbook as any).title = "Water Utility Dashboard Report";
  (workbook as any).subject = "Utility Analytics";
  (workbook as any).keywords = "water, utility, dashboard, report";
  
  // Common styling functions
  const applyTitleStyle = (row) => {
    row.font = { bold: true, size: 16 };
    row.alignment = { horizontal: 'center' };
  };
  
  const applyHeaderStyle = (row) => {
    row.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' } // Blue background
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  };

  const applyDataRowStyle = (row) => {
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  };
  
  // 1. Info Sheet
  const infoSheet = workbook.addWorksheet('Dashboard Report');
  
  // Add title and information
  const infoTitle = infoSheet.addRow(['WATER UTILITY DASHBOARD REPORT']);
  applyTitleStyle(infoTitle);
  infoSheet.mergeCells(1, 1, 1, 5); // Merge cells A1:E1
  infoSheet.getRow(1).height = 30; // Taller first row for title
  
  infoSheet.addRow([`Generated on: ${currentDate}`]);
  infoSheet.addRow(['']); // Blank row
  infoSheet.addRow(['This report contains key metrics and analytics about water utility operations']);
  infoSheet.addRow(['including customer data, leakage information, billing trends, and payment status.']);
  
  // Apply column width
  infoSheet.columns.forEach(column => {
    column.width = 20;
  });
  
  // 2. Dashboard KPIs
  const kpiSheet = workbook.addWorksheet('Dashboard KPIs');
  
  // Add title
  const kpiTitle = kpiSheet.addRow(['KEY PERFORMANCE INDICATORS']);
  applyTitleStyle(kpiTitle);
  kpiSheet.mergeCells(1, 1, 1, 2); // Merge cells A1:B1
  
  kpiSheet.addRow(['']); // Blank row
  
  // Add header row
  const kpiHeader = kpiSheet.addRow(['Metric', 'Value']);
  applyHeaderStyle(kpiHeader);
  
  // Add data rows
  Object.entries(dashboardStats).forEach(([key, value]) => {
    const row = kpiSheet.addRow([key, value]);
    applyDataRowStyle(row);
  });
  
  // Auto-fit columns
  kpiSheet.columns.forEach(column => {
    column.width = 20;
  });
  
  // 3. Leakage Data
  const leakageSheet = workbook.addWorksheet('Water Leakage');
  
  // Add title
  const leakageTitle = leakageSheet.addRow(['WATER LEAKAGE ANALYSIS']);
  applyTitleStyle(leakageTitle);
  leakageSheet.mergeCells(1, 1, 1, 3); // Merge cells A1:C1
  
  leakageSheet.addRow(['']); // Blank row
  
  // Add header row
  const leakageHeader = leakageSheet.addRow(['Site', 'Leak Count', '% of Total']);
  applyHeaderStyle(leakageHeader);
  
  // Calculate total for percentages
  const totalLeaks = leakageData.reduce((sum, item) => sum + item.value, 0);
  
  // Add data rows
  leakageData.forEach(item => {
    const percentage = ((item.value / totalLeaks) * 100).toFixed(1) + '%';
    const row = leakageSheet.addRow([item.name, item.value, percentage]);
    applyDataRowStyle(row);
    
    // Right-align numeric values
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).alignment = { horizontal: 'right' };
  });
  
  // Auto-fit columns
  leakageSheet.columns.forEach((column, index) => {
    column.width = index === 0 ? 30 : 15;
  });
  
  // 4. Billing Trends (Customer Distribution)
  const billingSheet = workbook.addWorksheet('Customer Population');
  
  // Add title
  const billingTitle = billingSheet.addRow(['CUSTOMER POPULATION DISTRIBUTION']);
  applyTitleStyle(billingTitle);
  billingSheet.mergeCells(1, 1, 1, 3); // Merge cells A1:C1
  
  billingSheet.addRow(['']); // Blank row
  
  // Add header row
  const billingHeader = billingSheet.addRow(['Site', 'Customer Count', '% of Total']);
  applyHeaderStyle(billingHeader);
  
  // Calculate total for percentages
  const totalCustomers = billingTrends.reduce((sum, item) => sum + item.value, 0);
  
  // Add data rows
  billingTrends.forEach(item => {
    const percentage = ((item.value / totalCustomers) * 100).toFixed(1) + '%';
    const row = billingSheet.addRow([item.name, item.value, percentage]);
    applyDataRowStyle(row);
    
    // Right-align numeric values
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).alignment = { horizontal: 'right' };
  });
  
  // Auto-fit columns
  billingSheet.columns.forEach((column, index) => {
    column.width = index === 0 ? 30 : 15;
  });
  
  // 5. Payment Status
  const paymentSheet = workbook.addWorksheet('Payment Status');
  
  // Add title
  const paymentTitle = paymentSheet.addRow(['PAYMENT STATUS BREAKDOWN']);
  applyTitleStyle(paymentTitle);
  paymentSheet.mergeCells(1, 1, 1, 3); // Merge cells A1:C1
  
  paymentSheet.addRow(['']); // Blank row
  
  // Add header row
  const paymentHeader = paymentSheet.addRow(['Status', 'Count', '% of Total']);
  applyHeaderStyle(paymentHeader);
  
  // Calculate total for percentages
  const totalPayments = paymentStatus.reduce((sum, item) => sum + item.value, 0);
  
  // Add data rows
  paymentStatus.forEach(item => {
    const percentage = ((item.value / totalPayments) * 100).toFixed(1) + '%';
    const row = paymentSheet.addRow([item.name, item.value, percentage]);
    applyDataRowStyle(row);
    
    // Right-align numeric values
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).alignment = { horizontal: 'right' };
    
    // Add conditional formatting for status cells
    const statusCell = row.getCell(1);
    if (item.name.toLowerCase() === 'paid' || item.name.toLowerCase().includes('complete')) {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD8F0D8' } // Light green
      };
    } else if (item.name.toLowerCase() === 'pending' || item.name.toLowerCase().includes('process')) {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF9E6' } // Light yellow
      };
    } else if (item.name.toLowerCase() === 'overdue' || item.name.toLowerCase().includes('fail')) {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2DEDE' } // Light red
      };
    }
  });
  
  // Auto-fit columns
  paymentSheet.columns.forEach((column, index) => {
    column.width = index === 0 ? 25 : 15;
  });
  
  // 6. Customer Water Usage Ranking
  const usageSheet = workbook.addWorksheet('Usage Ranking');
  
  // Add title
  const usageTitle = usageSheet.addRow(['CUSTOMER WATER USAGE RANKING']);
  applyTitleStyle(usageTitle);
  usageSheet.mergeCells(1, 1, 1, 5); // Merge cells A1:E1
  
  usageSheet.addRow(['']); // Blank row
  
  // Add header row
  const usageHeader = usageSheet.addRow(['Customer Name', 'Account Number', 'Site', 'Total Water Usage (m³)', 'Usage Category']);
  applyHeaderStyle(usageHeader);
  
  // Add data rows with categories
  customerUsage.forEach(customer => {
    const usage = customer.totalWaterUsage || 0;
    
    // Add usage category
    let category = "Low";
    if (usage > 100) category = "High";
    else if (usage > 50) category = "Medium";
    
    const row = usageSheet.addRow([
      customer.name,
      customer.accountNumber,
      customer.site,
      usage,
      category
    ]);
    
    applyDataRowStyle(row);
    
    // Format the usage column as number
    row.getCell(4).numFmt = '0.00';
    
    // Add conditional formatting for usage category
    const categoryCell = row.getCell(5);
    if (category === 'High') {
      categoryCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2DEDE' } // Light red
      };
    } else if (category === 'Medium') {
      categoryCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF9E6' } // Light yellow
      };
    } else {
      categoryCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD8F0D8' } // Light green
      };
    }
  });
  
  // Set column widths
  usageSheet.getColumn(1).width = 25; // Customer Name
  usageSheet.getColumn(2).width = 20; // Account Number  
  usageSheet.getColumn(3).width = 20; // Site
  usageSheet.getColumn(4).width = 20; // Usage
  usageSheet.getColumn(5).width = 15; // Category
  
  // Generate and download the file
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `Water_Utility_Dashboard_Report_${dateStr}.xlsx`;
  
  // For browser environment
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
  
  return `Report generated successfully as '${filename}'`;
};