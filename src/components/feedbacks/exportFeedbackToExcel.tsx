import ExcelJS from "exceljs";

// Define TypeScript interfaces
interface Feedback {
  id: string;
  categories: string[];
  feedback: string;
  rating: number;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
  userId: string;
}

interface CategoryCount {
  [key: string]: number;
}

interface RatingCount {
  [key: number]: number;
}

// Type guards for ExcelJS cell values
const isCellRichTextValue = (value: any): value is ExcelJS.CellRichTextValue => {
  return value && typeof value === 'object' && 'richText' in value;
};

const isCellHyperlinkValue = (value: any): value is ExcelJS.CellHyperlinkValue => {
  return value && typeof value === 'object' && 'hyperlink' in value && 'text' in value;
};

export const exportFeedbackToExcel = (feedbackList: Feedback[]): Promise<string> => {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const currentDate = new Date().toLocaleDateString();
  
  // Set workbook properties
  workbook.creator = "Feedback Management System";
  workbook.lastModifiedBy = "Feedback Management System";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;
  
  // Set custom properties for title and metadata
  (workbook as any).title = "User Feedback Report";
  (workbook as any).subject = "Customer Feedback Analysis";
  (workbook as any).keywords = "feedback, customer, ratings, categories";
  
  // Color palette with blue theme
  const colors = {
    darkBlue: { argb: 'FF1A5980' },      // Deep blue
    mediumBlue: { argb: 'FF1E88E5' },    // Medium blue
    lightBlue: { argb: 'FFB3E0FF' },     // Light blue
    paleBlue: { argb: 'FFE1F5FE' },      // Very light blue
    accentTeal: { argb: 'FF00ACC1' },    // Teal accent
    accentYellow: { argb: 'FFFFAB40' },  // Yellow accent for ratings
    white: { argb: 'FFFFFFFF' },
    lightGreen: { argb: 'FFD8F0D8' },    // For positive feedback
    lightYellow: { argb: 'FFFFF9E6' },   // For neutral feedback
    lightRed: { argb: 'FFF2DEDE' },      // For negative feedback
  };
  
  // Common styling functions
  const applyTitleStyle = (row: ExcelJS.Row): void => {
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
  
  const applySubtitleStyle = (row: ExcelJS.Row): void => {
    row.font = { bold: true, size: 12, color: colors.darkBlue };
    row.height = 22;
    row.alignment = { horizontal: 'center', vertical: 'middle' };
  };
  
  const applyHeaderStyle = (row: ExcelJS.Row): void => {
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

  const applyDataRowStyle = (row: ExcelJS.Row, isAlternate: boolean = false): void => {
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
  
  // Add an icon emoji
  const addIconEmoji = (sheet: ExcelJS.Worksheet): void => {
    const iconRow = sheet.addRow(['']);
    iconRow.getCell(1).value = {
      richText: [
        { 
          text: '📊 ', 
          font: { size: 16, color: colors.mediumBlue }
        },
        { 
          text: 'Customer Feedback Analysis',
          font: { bold: true, size: 12, color: colors.darkBlue } 
        }
      ]
    };
  };

  // Add a section header
  const addSectionHeader = (sheet: ExcelJS.Worksheet, title: string, columnCount: number): void => {
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
  
  // Add a footer to each sheet
  const addFooter = (sheet: ExcelJS.Worksheet, columnCount: number): void => {
    // Add blank rows for spacing
    sheet.addRow(['']);
    sheet.addRow(['']);
    
    // Add a footer row with message
    const footerRow = sheet.addRow(['User feedback helps us improve our services. Thank you!']);
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
  
  // Function to auto-size columns based on content - TypeScript-safe version
  const autoSizeColumns = (worksheet: ExcelJS.Worksheet): void => {
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        // Skip empty cells
        if (cell.value === null || cell.value === undefined) {
          return;
        }
        
        let cellLength = 0;
        
        // Handle different types of values
        if (typeof cell.value === 'string') {
          cellLength = cell.value.length;
        } else if (typeof cell.value === 'number') {
          cellLength = cell.value.toString().length;
        } else if (cell.value instanceof Date) {
          cellLength = cell.value.toLocaleDateString().length;
        } else if (isCellRichTextValue(cell.value)) {
          // Handle rich text
          cellLength = cell.value.richText.reduce((sum, fragment) => {
            return sum + (fragment.text ? fragment.text.length : 0);
          }, 0);
        } else if (isCellHyperlinkValue(cell.value)) {
          // Handle hyperlinks
          cellLength = cell.value.text.length;
        } else {
          // For other types, try converting to string when possible
          try {
            const str = String(cell.value);
            cellLength = str.length;
          } catch (e) {
            // If conversion fails, use a default length
            cellLength = 10;
          }
        }
        
        // Update max length
        maxLength = Math.max(maxLength, cellLength);
      });
      
      // Add extra space for padding and set a min/max width
      const padding = 4;
      column.width = Math.max(10, Math.min(maxLength + padding, 100));
    });
  };
  
  // Set fixed column widths and skip auto-sizing completely - simplest option
  const setFixedColumnWidths = (sheet: ExcelJS.Worksheet, columnWidths: number[]): void => {
    columnWidths.forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });
  };
  
  // 1. Cover Sheet
  const coverSheet = workbook.addWorksheet('Feedback Overview');
  
  // Set fixed column widths
  setFixedColumnWidths(coverSheet, [25, 25, 25, 25, 25]);
  
  // Add some spacing
  coverSheet.addRow(['']);
  coverSheet.addRow(['']);
  
  // Add an icon/emoji as a logo placeholder
  const logoRow = coverSheet.addRow(['📝']);
  logoRow.height = 40;
  logoRow.getCell(1).font = { size: 36, color: colors.mediumBlue };
  logoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  coverSheet.mergeCells(logoRow.number, 1, logoRow.number, 5);
  
  // Add title row
  const coverTitle = coverSheet.addRow(['USER FEEDBACK REPORT']);
  applyTitleStyle(coverTitle);
  coverSheet.mergeCells(coverTitle.number, 1, coverTitle.number, 5);
  
  // Add subtitle
  const coverSubtitle = coverSheet.addRow(['Comprehensive Feedback Analysis']);
  applySubtitleStyle(coverSubtitle);
  coverSheet.mergeCells(coverSubtitle.number, 1, coverSubtitle.number, 5);
  
  // Add spacing
  coverSheet.addRow(['']);
  coverSheet.addRow(['']);
  
  // Add information section
  addSectionHeader(coverSheet, 'REPORT INFORMATION', 5);
  
  const infoRows = [
    ['Generated on:', currentDate],
    ['Report Type:', 'User Feedback Analysis'],
    ['Total Feedback Items:', feedbackList.length.toString()],
    ['Purpose:', 'Analyze customer feedback and ratings for service improvement'],
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
    ['1.', 'Feedback Statistics', 'Key metrics and summary statistics'],
    ['2.', 'Category Analysis', 'Feedback breakdown by category'],
    ['3.', 'Rating Distribution', 'Analysis of ratings distribution'],
    ['4.', 'Feedback List', 'Complete list of all feedback entries'],
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
  addSectionHeader(coverSheet, 'FEEDBACK TIP', 5);
  
  const tipRow = coverSheet.addRow(['Actively responding to feedback can increase customer satisfaction by up to 25%.']);
  tipRow.getCell(1).font = { italic: true, color: colors.accentTeal };
  coverSheet.mergeCells(tipRow.number, 1, tipRow.number, 5);
  
  // Add footer
  addFooter(coverSheet, 5);
  
  // 2. Feedback Statistics Sheet
  const statsSheet = workbook.addWorksheet('Feedback Statistics');
  
  // Set fixed column widths
  setFixedColumnWidths(statsSheet, [30, 20]);
  
  // Add title
  const statsTitle = statsSheet.addRow(['FEEDBACK STATISTICS']);
  applyTitleStyle(statsTitle);
  statsSheet.mergeCells(1, 1, 1, 2);
  
  // Add icon
  addIconEmoji(statsSheet);
  
  statsSheet.addRow(['']); // Blank row
  
  // Calculate statistics from feedback data
  const totalFeedback = feedbackList.length;
  const averageRating = totalFeedback > 0 
    ? feedbackList.reduce((sum, f) => sum + f.rating, 0) / totalFeedback 
    : 0;
  
  // Extract all unique categories from feedback
  const allCategories = new Set<string>();
  feedbackList.forEach(feedback => {
    feedback.categories.forEach(category => {
      allCategories.add(category);
    });
  });
  
  // Count feedback by category
  const categoryCounts: CategoryCount = {};
  allCategories.forEach(category => {
    categoryCounts[category] = feedbackList.filter(f => 
      f.categories.includes(category)).length;
  });
  
  // Count ratings distribution
  const ratingCounts: RatingCount = {};
  for (let i = 1; i <= 5; i++) {
    ratingCounts[i] = feedbackList.filter(f => f.rating === i).length;
  }
  
  // Add header row
  const statsHeader = statsSheet.addRow(['Metric', 'Value']);
  applyHeaderStyle(statsHeader);
  
  // Add data rows with alternating colors
  const statsData = [
    ['Total Feedback Received', totalFeedback.toString()],
    ['Average Rating', averageRating.toFixed(1)],
    ['Highest Rating Count', Math.max(...Object.values(ratingCounts) as number[]).toString()],
    ['Total Categories', allCategories.size.toString()]
  ];
  
  statsData.forEach((item, index) => {
    const row = statsSheet.addRow(item);
    applyDataRowStyle(row, index % 2 === 0);
    
    // Right align value cell
    row.getCell(2).alignment = { horizontal: 'right' };
    
    // Add icons based on metric type with proper typing
    if (item[0].includes('Total Feedback')) {
      row.getCell(1).value = {
        richText: [
          { text: '📊 ', font: { size: 12, color: colors.mediumBlue } },
          { text: item[0], font: { bold: true } }
        ]
      };
    } else if (item[0].includes('Average Rating')) {
      row.getCell(1).value = {
        richText: [
          { text: '⭐ ', font: { size: 12 } },
          { text: item[0], font: { bold: true } }
        ]
      };
    } else if (item[0].includes('Highest Rating')) {
      row.getCell(1).value = {
        richText: [
          { text: '🏆 ', font: { size: 12 } },
          { text: item[0], font: { bold: true } }
        ]
      };
    } else if (item[0].includes('Categories')) {
      row.getCell(1).value = {
        richText: [
          { text: '🏷️ ', font: { size: 12 } },
          { text: item[0], font: { bold: true } }
        ]
      };
    }
  });
  
  // Add section header for category breakdown
  addSectionHeader(statsSheet, 'CATEGORY BREAKDOWN', 2);
  
  // Sort categories by frequency
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1]);
  
  // Add category data rows
  sortedCategories.forEach((item, index) => {
    const [category, count] = item;
    const percentage = ((count / totalFeedback) * 100).toFixed(1) + '%';
    
    const row = statsSheet.addRow([`${category}`, `${count} (${percentage})`]);
    applyDataRowStyle(row, index % 2 === 0);
    
    // Right align value cell
    row.getCell(2).alignment = { horizontal: 'right' };
    
    // Highlight common categories
    if (count > totalFeedback * 0.2) {
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
  
  // Add footer
  addFooter(statsSheet, 2);
  
  // 3. Rating Distribution Sheet
  const ratingSheet = workbook.addWorksheet('Rating Distribution');
  
  // Set fixed column widths
  setFixedColumnWidths(ratingSheet, [15, 20, 20]);
  
  // Add title
  const ratingTitle = ratingSheet.addRow(['RATING DISTRIBUTION']);
  applyTitleStyle(ratingTitle);
  ratingSheet.mergeCells(1, 1, 1, 3);
  
  // Add icon
  addIconEmoji(ratingSheet);
  
  ratingSheet.addRow(['']); // Blank row
  
  // Add header row
  const ratingHeader = ratingSheet.addRow(['Rating', 'Count', 'Percentage']);
  applyHeaderStyle(ratingHeader);
  
  // Add data rows
  for (let rating = 5; rating >= 1; rating--) {
    const count = ratingCounts[rating] || 0;
    const percentage = totalFeedback > 0 
      ? ((count / totalFeedback) * 100).toFixed(1) + '%' 
      : '0.0%';
    
    const row = ratingSheet.addRow([rating.toString(), count.toString(), percentage]);
    applyDataRowStyle(row, (5 - rating) % 2 === 0);
    
    // Right align value cells
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).alignment = { horizontal: 'right' };
    
    // Add star icons and color coding based on rating
    const ratingCell = row.getCell(1);
    const stars = '⭐'.repeat(rating);
    
    ratingCell.value = {
      richText: [
        { text: stars, font: { size: 12 } },
        { text: ` (${rating})`, font: { bold: true } }
      ]
    };
    
    // Color code by rating
    if (rating >= 4) {
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.lightGreen
        };
      });
    } else if (rating <= 2) {
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.lightRed
        };
      });
    } else {
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: colors.lightYellow
        };
      });
    }
  }
  
  // Add a section for insights
  addSectionHeader(ratingSheet, 'RATING INSIGHTS', 3);
  
  const insightRow = ratingSheet.addRow(['Rating distribution helps identify areas of strength and opportunities for improvement in customer service.']);
  insightRow.getCell(1).font = { italic: true, color: colors.accentTeal };
  ratingSheet.mergeCells(insightRow.number, 1, insightRow.number, 3);
  
  // Add footer
  addFooter(ratingSheet, 3);
  
  // 4. Feedback List Sheet - Matching the exact table structure from the UI
  const detailSheet = workbook.addWorksheet('Feedback List');
  
  // Set fixed column widths
  setFixedColumnWidths(detailSheet, [25, 45, 10, 15, 25]);
  
  // Add title
  const detailTitle = detailSheet.addRow(['FEEDBACK LIST']);
  applyTitleStyle(detailTitle);
  detailSheet.mergeCells(1, 1, 1, 5);
  
  // Add icon
  addIconEmoji(detailSheet);
  
  detailSheet.addRow(['']); // Blank row
  
  // Add header row - match your UI table structure
  const detailHeader = detailSheet.addRow(['Category', 'Feedback', 'Rating', 'Date', 'User ID']);
  applyHeaderStyle(detailHeader);
  
  // Format function for timestamps
  const formatDate = (timestamp: { seconds: number; nanoseconds?: number } | undefined): string => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  
  // Add data rows with alternating colors - match UI table structure
  feedbackList.forEach((feedback, index) => {
    const row = detailSheet.addRow([
      feedback.categories.join(", "),
      feedback.feedback,
      feedback.rating.toString(),
      formatDate(feedback.timestamp),
      feedback.userId
    ]);
    
    applyDataRowStyle(row, index % 2 === 0);
    
    // Add rating with stars and color coding
    const ratingCell = row.getCell(3);
    ratingCell.value = {
      richText: [
        { text: feedback.rating.toString(), font: { bold: true } }
      ]
    };
    ratingCell.alignment = { horizontal: 'center' };
    
    // Color code by rating
    if (feedback.rating >= 4) {
      ratingCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.lightGreen
      };
    } else if (feedback.rating <= 2) {
      ratingCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.lightRed
      };
    } else {
      ratingCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: colors.lightYellow
      };
    }
    
    // Wrap text for feedback content
    row.getCell(2).alignment = { 
      wrapText: true, 
      vertical: 'top' 
    };
    
    // Set a dynamic height for rows with longer content
    if (feedback.feedback.length > 50) {
      // Calculate row height based on text length
      row.height = Math.max(40, Math.ceil(feedback.feedback.length / 30) * 15);
    }
  });
  
  // Add footer
  addFooter(detailSheet, 5);
  
  // Apply print settings to all worksheets
  [coverSheet, statsSheet, ratingSheet, detailSheet].forEach(sheet => {
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
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    };
    
    // Ensure gridlines are shown in the printout
    sheet.pageSetup.showGridLines = true;
  });
  
  // Generate and download the file
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `User_Feedback_Report_${dateStr}.xlsx`;
  
  // Return a promise that resolves when the file is generated
  return new Promise<string>((resolve, reject) => {
    // For browser environment
    workbook.xlsx.writeBuffer()
      .then(buffer => {
        const blob = new Blob([buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.click();
        
        window.URL.revokeObjectURL(url);
        resolve(`Feedback report generated successfully as '${filename}' with enhanced design`);
      })
      .catch(err => {
        console.error('Error generating Excel file:', err);
        reject(err);
      });
  });
};