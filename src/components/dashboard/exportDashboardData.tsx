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
  (workbook as any).keywords = "water, utility, dashboard, report, billing";
  
  // Water-themed color palette
  const colors = {
    darkBlue: { argb: 'FF1A5980' },       // Deep water blue
    mediumBlue: { argb: 'FF1E88E5' },     // Medium water blue
    lightBlue: { argb: 'FFB3E0FF' },      // Light water blue
    paleBlue: { argb: 'FFE1F5FE' },       // Very light water blue
    accentGreen: { argb: 'FF26A69A' },    // Teal/green for accents
    accentTeal: { argb: 'FF00ACC1' },     // Teal accent
    white: { argb: 'FFFFFFFF' },
    lightGreen: { argb: 'FFD8F0D8' },     // For positive indicators
    lightYellow: { argb: 'FFFFF9E6' },    // For warning indicators
    lightRed: { argb: 'FFF2DEDE' },       // For negative indicators
  };
  
  // Common styling functions with water-themed design
  const applyTitleStyle = (row) => {
    row.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    row.height = 36; // Taller row for title
    
    // Apply gradient-like effect with cell by cell coloring
    row.eachCell((cell, colNumber) => {
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
      // Zebra striping effect
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
      // Add a slight padding for text
      cell.alignment = { 
        horizontal: 'left', 
        vertical: 'middle',
        indent: 1
      };
    });
  };
  
  const addWaterDropImage = (sheet) => {
    // This would be a placeholder for adding a water drop image
    // In a real implementation, you would need to have the image file
    // available and use the addImage method appropriately
    
    // Add a cell for a note about the image
    const imageNote = sheet.addRow(['']);
    imageNote.getCell(1).value = {
      richText: [
        { 
          text: '💧 ', 
          font: { size: 16, color: colors.mediumBlue }
        },
        { 
          text: 'Water Conservation is Our Priority',
          font: { bold: true, size: 12, color: colors.darkBlue } 
        }
      ]
    };
  };

  // Add a decorative section header
  const addSectionHeader = (sheet, title, columnCount) => {
    // Add a blank row before section
    sheet.addRow(['']);
    
    // Add the section header
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
    
    // Add blank row after section header
    sheet.addRow(['']);
  };
  
  // Add a water-themed footer to each sheet
  const addWaterFooter = (sheet, columnCount) => {
    // Add blank rows for spacing
    sheet.addRow(['']);
    sheet.addRow(['']);
    
    // Add a footer row with a water conservation message
    const footerRow = sheet.addRow(['Water is precious. Please conserve it.']);
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
    
    // Add the date row
    const dateRow = sheet.addRow([`Report generated on: ${currentDate}`]);
    sheet.mergeCells(sheet.rowCount, 1, sheet.rowCount, columnCount);
    
    dateRow.getCell(1).font = { 
      italic: true, 
      color: colors.darkBlue,
      size: 8
    };
    dateRow.getCell(1).alignment = { horizontal: 'right' };
  };
  
  // 1. Cover Sheet with Water Theme
  const coverSheet = workbook.addWorksheet('Dashboard Overview');
  
  // Set column widths - FIX: Manually set each column width instead of using forEach
  // Bug was likely here - using .forEach on coverSheet.columns which might be null
  coverSheet.getColumn(1).width = 20;
  coverSheet.getColumn(2).width = 20;
  coverSheet.getColumn(3).width = 20;
  coverSheet.getColumn(4).width = 20;
  coverSheet.getColumn(5).width = 20;
  
  // Add some rows for spacing at the top
  coverSheet.addRow(['']);
  coverSheet.addRow(['']);
  
  // Add a water droplet ASCII art or emoji as a logo placeholder
  const logoRow = coverSheet.addRow(['💧']);
  logoRow.height = 40;
  logoRow.getCell(1).font = { size: 36, color: colors.mediumBlue };
  logoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  coverSheet.mergeCells(logoRow.number, 1, logoRow.number, 5);
  
  // Add title row
  const coverTitle = coverSheet.addRow(['WATER UTILITY DASHBOARD REPORT']);
  applyTitleStyle(coverTitle);
  coverSheet.mergeCells(coverTitle.number, 1, coverTitle.number, 5);
  
  // Add subtitle
  const coverSubtitle = coverSheet.addRow(['Complete Analytics and Billing Information']);
  applySubtitleStyle(coverSubtitle);
  coverSheet.mergeCells(coverSubtitle.number, 1, coverSubtitle.number, 5);
  
  // Add some spacing
  coverSheet.addRow(['']);
  coverSheet.addRow(['']);
  
  // Add information section
  addSectionHeader(coverSheet, 'REPORT INFORMATION', 5);
  
  const infoRows = [
    ['Generated on:', currentDate],
    ['Report Type:', 'Water Utility Dashboard Analytics'],
    ['Scope:', 'All water districts and customers'],
    ['Purpose:', 'Analysis of water usage, billing trends, and payment statuses'],
  ];
  
  infoRows.forEach((rowData, index) => {
    const row = coverSheet.addRow(rowData);
    applyDataRowStyle(row, index % 2 === 0);
    
    // Style the labels
    row.getCell(1).font = { bold: true, color: colors.darkBlue };
    
    // Only merge cells for the current row, starting from column 2 to 5
    coverSheet.mergeCells(row.number, 2, row.number, 5);
  });
  
  // Add content summary section
  addSectionHeader(coverSheet, 'REPORT CONTENTS', 5);
  
  const contentRows = [
    ['1.', 'Dashboard KPIs', 'Key metrics and performance indicators'],
    ['2.', 'Water Leakage', 'Analysis of water leakage by location'],
    ['3.', 'Customer Population', 'Distribution of customers across sites'],
    ['4.', 'Payment Status', 'Breakdown of payment statuses'],
    ['5.', 'Usage Ranking', 'Customer water usage ranking and categories'],
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
  
  // Add a water conservation tip
  addSectionHeader(coverSheet, 'WATER CONSERVATION TIP', 5);
  
  const tipRow = coverSheet.addRow(['Did you know? Fixing a leaky faucet can save up to 3,000 gallons of water per year.']);
  tipRow.getCell(1).font = { italic: true, color: colors.accentGreen };
  coverSheet.mergeCells(tipRow.number, 1, tipRow.number, 5);
  
  // Add the footer
  addWaterFooter(coverSheet, 5);
  
  // 2. Dashboard KPIs with Water Theme
  const kpiSheet = workbook.addWorksheet('Dashboard KPIs');
  
  // FIX: Set column widths manually
  kpiSheet.getColumn(1).width = 30;
  kpiSheet.getColumn(2).width = 20;
  
  // Add title
  const kpiTitle = kpiSheet.addRow(['KEY PERFORMANCE INDICATORS']);
  applyTitleStyle(kpiTitle);
  kpiSheet.mergeCells(1, 1, 1, 2);
  
  // Add water droplet icon
  addWaterDropImage(kpiSheet);
  
  kpiSheet.addRow(['']); // Blank row
  
  // Add header row
  const kpiHeader = kpiSheet.addRow(['Metric', 'Value']);
  applyHeaderStyle(kpiHeader);
  
  // Add data rows with alternating colors
  if (dashboardStats && Object.entries(dashboardStats).length > 0) {
    Object.entries(dashboardStats).forEach(([key, value], index) => {
      const row = kpiSheet.addRow([key, value]);
      applyDataRowStyle(row, index % 2 === 0);
      
      // Right-align the value cell
      row.getCell(2).alignment = { horizontal: 'right' };
      
      // Add icons or color coding based on metric type
      if (key.toLowerCase().includes('usage') || key.toLowerCase().includes('consumption')) {
        row.getCell(1).value = {
          richText: [
            { text: '💧 ', font: { size: 12, color: colors.mediumBlue } },
            { text: key, font: { bold: true } }
          ]
        };
      } else if (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('billing')) {
        row.getCell(1).value = {
          richText: [
            { text: '💰 ', font: { size: 12 } },
            { text: key, font: { bold: true } }
          ]
        };
      } else if (key.toLowerCase().includes('customer')) {
        row.getCell(1).value = {
          richText: [
            { text: '👥 ', font: { size: 12 } },
            { text: key, font: { bold: true } }
          ]
        };
      } else if (key.toLowerCase().includes('leak')) {
        row.getCell(1).value = {
          richText: [
            { text: '🚰 ', font: { size: 12, color: { argb: 'FFFF0000' } } },
            { text: key, font: { bold: true } }
          ]
        };
      }
    });
  } else {
    // Handle case when dashboardStats is null or empty
    const emptyRow = kpiSheet.addRow(['No KPI data available', '']);
    emptyRow.getCell(1).font = { italic: true, color: colors.darkBlue };
  }
  
  // Add footer
  addWaterFooter(kpiSheet, 2);
  
  // 3. Leakage Data with enhanced water theme
  const leakageSheet = workbook.addWorksheet('Water Leakage');
  
  // FIX: Set column widths manually
  leakageSheet.getColumn(1).width = 30;
  leakageSheet.getColumn(2).width = 15;
  leakageSheet.getColumn(3).width = 15;
  
  // Add title
  const leakageTitle = leakageSheet.addRow(['WATER LEAKAGE ANALYSIS']);
  applyTitleStyle(leakageTitle);
  leakageSheet.mergeCells(1, 1, 1, 3);
  
  // Add water droplet icon
  addWaterDropImage(leakageSheet);
  
  leakageSheet.addRow(['']); // Blank row
  
  // Add info text
  const leakageInfo = leakageSheet.addRow(['Identifying and addressing water leakage is crucial for conservation efforts.']);
  leakageInfo.getCell(1).font = { italic: true, color: colors.accentGreen };
  leakageSheet.mergeCells(leakageInfo.number, 1, leakageInfo.number, 3);
  
  leakageSheet.addRow(['']); // Blank row
  
  // Add header row
  const leakageHeader = leakageSheet.addRow(['Site', 'Leak Count', '% of Total']);
  applyHeaderStyle(leakageHeader);
  
  // Check if leakageData is valid before processing
  if (leakageData && leakageData.length > 0) {
    // Calculate total for percentages
    const totalLeaks = leakageData.reduce((sum, item) => sum + (item.value || 0), 0);
    
    // Add data rows with alternating colors
    leakageData.forEach((item, index) => {
      const percentage = ((item.value / totalLeaks) * 100).toFixed(1) + '%';
      const row = leakageSheet.addRow([item.name || 'Unknown', item.value || 0, percentage]);
      applyDataRowStyle(row, index % 2 === 0);
      
      // Right-align numeric values
      row.getCell(2).alignment = { horizontal: 'right' };
      row.getCell(3).alignment = { horizontal: 'right' };
      
      // Add color coding based on leak severity
      const leakPercent = (item.value / totalLeaks) * 100;
      if (leakPercent > 20) {
        // High leakage area
        row.eachCell(cell => {
          cell.font = { color: { argb: 'FF9C0006' } }; // Dark red text
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFD9D9' } // Light red background
          };
        });
      } else if (leakPercent > 10) {
        // Medium leakage area
        row.eachCell(cell => {
          cell.font = { color: { argb: 'FF9C6500' } }; // Dark orange text
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF9E6' } // Light yellow background
          };
        });
      }
    });
  } else {
    // Handle case when leakageData is null or empty
    const emptyRow = leakageSheet.addRow(['No leakage data available', '', '']);
    emptyRow.getCell(1).font = { italic: true, color: colors.darkBlue };
    leakageSheet.mergeCells(emptyRow.number, 1, emptyRow.number, 3);
  }
  
  // Add a section header for recommendations
  addSectionHeader(leakageSheet, 'RECOMMENDATIONS', 3);
  
  // Add recommendation text
  const recommendationRow = leakageSheet.addRow(['Focus maintenance efforts on sites with highest leak percentages to maximize water conservation impact.']);
  recommendationRow.getCell(1).font = { italic: true, color: colors.accentGreen };
  leakageSheet.mergeCells(recommendationRow.number, 1, recommendationRow.number, 3);
  
  // Add footer
  addWaterFooter(leakageSheet, 3);
  
  // 4. Billing Trends (Customer Distribution) with water theme
  const billingSheet = workbook.addWorksheet('Customer Population');
  
  // FIX: Set column widths manually
  billingSheet.getColumn(1).width = 30;
  billingSheet.getColumn(2).width = 15;
  billingSheet.getColumn(3).width = 15;
  
  // Add title
  const billingTitle = billingSheet.addRow(['CUSTOMER POPULATION DISTRIBUTION']);
  applyTitleStyle(billingTitle);
  billingSheet.mergeCells(1, 1, 1, 3);
  
  // Add water droplet icon
  addWaterDropImage(billingSheet);
  
  billingSheet.addRow(['']); // Blank row
  
  // Add header row
  const billingHeader = billingSheet.addRow(['Site', 'Customer Count', '% of Total']);
  applyHeaderStyle(billingHeader);
  
  // Check if billingTrends is valid before processing
  if (billingTrends && billingTrends.length > 0) {
    // Calculate total for percentages
    const totalCustomers = billingTrends.reduce((sum, item) => sum + (item.value || 0), 0);
    
    // Add data rows with alternating colors
    billingTrends.forEach((item, index) => {
      const percentage = ((item.value / totalCustomers) * 100).toFixed(1) + '%';
      const row = billingSheet.addRow([item.name || 'Unknown', item.value || 0, percentage]);
      applyDataRowStyle(row, index % 2 === 0);
      
      // Right-align numeric values
      row.getCell(2).alignment = { horizontal: 'right' };
      row.getCell(3).alignment = { horizontal: 'right' };
      
      // Highlight the most populated areas
      const populationPercent = (item.value / totalCustomers) * 100;
      if (populationPercent > 20) {
        // Densely populated area
        row.eachCell(cell => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: colors.lightBlue
          };
        });
      }
    });
  } else {
    // Handle case when billingTrends is null or empty
    const emptyRow = billingSheet.addRow(['No customer population data available', '', '']);
    emptyRow.getCell(1).font = { italic: true, color: colors.darkBlue };
    billingSheet.mergeCells(emptyRow.number, 1, emptyRow.number, 3);
  }
  
  // Add a section header for insights
  addSectionHeader(billingSheet, 'INSIGHTS', 3);
  
  // Add insights text
  const insightsRow = billingSheet.addRow(['Customer density information can help optimize service delivery and resource allocation.']);
  insightsRow.getCell(1).font = { italic: true, color: colors.accentGreen };
  billingSheet.mergeCells(insightsRow.number, 1, insightsRow.number, 3);
  
  // Add footer
  addWaterFooter(billingSheet, 3);
  
  // 5. Payment Status with enhanced water theme
  const paymentSheet = workbook.addWorksheet('Payment Status');
  
  // FIX: Set column widths manually
  paymentSheet.getColumn(1).width = 25;
  paymentSheet.getColumn(2).width = 15;
  paymentSheet.getColumn(3).width = 15;
  
  // Add title
  const paymentTitle = paymentSheet.addRow(['PAYMENT STATUS BREAKDOWN']);
  applyTitleStyle(paymentTitle);
  paymentSheet.mergeCells(1, 1, 1, 3);
  
  // Add water droplet icon
  addWaterDropImage(paymentSheet);
  
  paymentSheet.addRow(['']); // Blank row
  
  // Add header row
  const paymentHeader = paymentSheet.addRow(['Status', 'Count', '% of Total']);
  applyHeaderStyle(paymentHeader);
  
  // Check if paymentStatus is valid before processing
  if (paymentStatus && paymentStatus.length > 0) {
    // Calculate total for percentages
    const totalPayments = paymentStatus.reduce((sum, item) => sum + (item.value || 0), 0);
    
    // Add data rows with enhanced status styling
    paymentStatus.forEach((item, index) => {
      const percentage = ((item.value / totalPayments) * 100).toFixed(1) + '%';
      const row = paymentSheet.addRow([item.name || 'Unknown', item.value || 0, percentage]);
      applyDataRowStyle(row, index % 2 === 0);
      
      // Right-align numeric values
      row.getCell(2).alignment = { horizontal: 'right' };
      row.getCell(3).alignment = { horizontal: 'right' };
      
      // Enhanced status cell styling with icons
      const statusCell = row.getCell(1);
      const statusLower = (item.name || '').toLowerCase();
      
      if (statusLower === 'paid' || statusLower.includes('complete')) {
        statusCell.value = {
          richText: [
            { text: '✅ ', font: { size: 12 } },
            { text: item.name, font: { bold: true, color: { argb: 'FF006100' } } }
          ]
        };
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.lightGreen
        };
      } else if (statusLower === 'pending' || statusLower.includes('process')) {
        statusCell.value = {
          richText: [
            { text: '⏳ ', font: { size: 12 } },
            { text: item.name, font: { bold: true, color: { argb: 'FF9C6500' } } }
          ]
        };
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.lightYellow
        };
      } else if (statusLower === 'overdue' || statusLower.includes('fail')) {
        statusCell.value = {
          richText: [
            { text: '❌ ', font: { size: 12 } },
            { text: item.name, font: { bold: true, color: { argb: 'FF9C0006' } } }
          ]
        };
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.lightRed
        };
      }
    });
  } else {
    // Handle case when paymentStatus is null or empty
    const emptyRow = paymentSheet.addRow(['No payment status data available', '', '']);
    emptyRow.getCell(1).font = { italic: true, color: colors.darkBlue };
    paymentSheet.mergeCells(emptyRow.number, 1, emptyRow.number, 3);
  }
  
  // Add a section header for revenue impact
  addSectionHeader(paymentSheet, 'REVENUE IMPACT ANALYSIS', 3);
  
  // Add explanation text
  const explanationRow = paymentSheet.addRow(['Payment status distribution directly impacts cash flow and operational capabilities.']);
  explanationRow.getCell(1).font = { italic: true, color: colors.accentGreen };
  paymentSheet.mergeCells(explanationRow.number, 1, explanationRow.number, 3);
  
  // Add footer
  addWaterFooter(paymentSheet, 3);
  
  // 6. Customer Water Usage Ranking with expanded water theme
  const usageSheet = workbook.addWorksheet('Usage Ranking');
  
  // FIX: Set column widths manually
  usageSheet.getColumn(1).width = 25; // Customer Name
  usageSheet.getColumn(2).width = 20; // Account Number  
  usageSheet.getColumn(3).width = 20; // Site
  usageSheet.getColumn(4).width = 22; // Usage
  usageSheet.getColumn(5).width = 15; // Category
  
  // Add title
  const usageTitle = usageSheet.addRow(['CUSTOMER WATER USAGE RANKING']);
  applyTitleStyle(usageTitle);
  usageSheet.mergeCells(1, 1, 1, 5);
  
  // Add water droplet icon
  addWaterDropImage(usageSheet);
  
  usageSheet.addRow(['']); // Blank row
  
  // Add a brief explanation
  const usageExplanation = usageSheet.addRow(['This sheet ranks customers by their water consumption and categorizes their usage levels.']);
  usageExplanation.getCell(1).font = { italic: true, color: colors.accentGreen };
  usageSheet.mergeCells(usageExplanation.number, 1, usageExplanation.number, 5);
  
  usageSheet.addRow(['']); // Blank row
  
  // Add header row
  const usageHeader = usageSheet.addRow(['Customer Name', 'Account Number', 'Site', 'Total Water Usage (m³)', 'Usage Category']);
  applyHeaderStyle(usageHeader);
  
  // Check if customerUsage is valid before processing
  if (customerUsage && customerUsage.length > 0) {
    // Add data rows with enhanced styling and water-themed indicators
    customerUsage.forEach((customer, index) => {
      const usage = customer.totalWaterUsage || 0;
      
      // Add usage category with water-themed terminology
      let category = "Conservation";  // Low usage
      let categoryColor = colors.lightGreen;
      let dropletIcons = "💧";
      
      if (usage > 100) {
        category = "High Consumption";
        categoryColor = colors.lightRed;
        dropletIcons = "💧💧💧";
      } else if (usage > 50) {
        category = "Moderate";
        categoryColor = colors.lightYellow;
        dropletIcons = "💧💧";
      }
      
      const row = usageSheet.addRow([
        customer.name || 'Unknown',
        customer.accountNumber || 'N/A',
        customer.site || 'Unknown',
        usage,
        category
      ]);
      
      applyDataRowStyle(row, index % 2 === 0);
      
      // Format the usage column as number with 2 decimal places
      row.getCell(4).numFmt = '0.00';
      row.getCell(4).alignment = { horizontal: 'right' };
      
      // Enhanced category cell with water droplet indicators
      const categoryCell = row.getCell(5);
      categoryCell.value = {
        richText: [
          { text: dropletIcons + ' ', font: { size: 12 } },
          { text: category, font: { bold: true } }
        ]
      };
      categoryCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: categoryColor
      };
      categoryCell.alignment = { horizontal: 'center' };
      
      // Add special styling for high usage customers
      if (category === "High Consumption") {
        row.getCell(1).font = { bold: true };
      }
    });
  } else {
    // Handle case when customerUsage is null or empty
    const emptyRow = usageSheet.addRow(['No customer usage data available', '', '', '', '']);
    emptyRow.getCell(1).font = { italic: true, color: colors.darkBlue };
    usageSheet.mergeCells(emptyRow.number, 1, emptyRow.number, 5);
  }
  
  // Add a section header for water saving tips
  addSectionHeader(usageSheet, 'WATER CONSERVATION OPPORTUNITIES', 5);
  
  // Add tips for high consumption users
  const tipsRows = [
    ['1.', 'Identify customers in the "High Consumption" category for targeted conservation programs.'],
    ['2.', 'Consider implementing tier-based pricing to encourage water conservation.'],
    ['3.', 'Provide water-saving tips and incentives to customers with above-average usage.']
  ];
  
  tipsRows.forEach((rowData, index) => {
    const row = usageSheet.addRow([rowData[0], rowData[1]]);
    row.getCell(1).font = { bold: true, color: colors.accentTeal };
    row.getCell(1).alignment = { horizontal: 'right' };
    usageSheet.mergeCells(row.number, 2, row.number, 5);
  });
  
  // Add footer
  addWaterFooter(usageSheet, 5);
  
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
  
  return `Report generated successfully as '${filename}' with enhanced water-themed design`;
};