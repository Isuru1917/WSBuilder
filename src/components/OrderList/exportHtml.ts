// Helper file to implement HTML export for order data
// This will be imported into OrderList.tsx

/**
 * Exports order data as HTML to a new browser tab
 * @param orderNo Order number
 * @param shopOrderNote Shop order note
 * @param mergedData Merged data from Excel files
 * @param excelDataSets Excel datasets with cell values (no longer used but kept for compatibility)
 * @param hidePanelColumns Whether to hide panel columns
 * @param mergedWebbingData Merged webbing data (separate table)
 * @param highlightedCells Set of highlighted cell keys
 */
export const exportOrderDataAsHTML = (
  orderNo: string,
  shopOrderNote: string,
  mergedData: any[][],
  excelDataSets: any[], // Contains Additional Info in cellB2Value
  hidePanelColumns: boolean,
  mergedWebbingData?: any[][], // Optional webbing data
  highlightedCells?: Set<string> // Optional highlighted cells
) => {
  if (mergedData.length === 0) {
    alert('No data available to export.');
    return;
  }
  // Create a new HTML document for the printable view
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up was blocked. Please allow pop-ups for this site to view the export.');
    return;
  }
  
  // Get column labels from merged data
  const columnHeaders = mergedData[0] || [];
  // Extract data rows (skip the header row)
  let dataRows = mergedData.slice(1);
  // Filter out empty rows (all cells empty or whitespace)
  dataRows = dataRows.filter(row => row.some(cell => String(cell).trim() !== ''));

  // Process webbing data if available
  let webbingColumnHeaders: any[] = [];
  let webbingDataRows: any[][] = [];
  
  if (mergedWebbingData && mergedWebbingData.length > 0) {
    webbingColumnHeaders = mergedWebbingData[0] || [];
    webbingDataRows = mergedWebbingData.slice(1);
    webbingDataRows = webbingDataRows.filter(row => row.some(cell => String(cell).trim() !== ''));
  }

  // Calculate the approximate number of rows that would fit on an A4 page
  // Typical A4 height with margins can fit about 30-35 rows
  const visibleDataRows = dataRows.slice(0, Math.min(dataRows.length, 30));
  // Write the HTML content to the new window/tab
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${orderNo || 'Order Data'}</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>        @page {
          size: A4;
          margin: 1cm;
        }
        body {
          font-family: Arial, sans-serif;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 15px;
          box-sizing: border-box;
          max-width: 794px; /* A4 width */
          margin-left: auto;
          margin-right: auto;
        }
        /* Add page break styles */
        .page-break {
          height: 0;
          border: none;
        }
        .page-break td {
          height: 0;
          padding: 0;
          border: none;
          page-break-before: always;
        }
        .container {
          width: 100%;
        }        .order-number-display {
          text-align: right;
          font-size: 11px;
          padding: 10px 0;
          margin-bottom: 10px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-weight: bold;
          background: none;
        }
        .shop-order-box {
          margin-bottom: 15px;
          padding: 8px 12px;
          font-size: 11px;
          line-height: 1.4;
          border-radius: 4px;
          background: none;
          font-weight: normal;
        }        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 10px;
          table-layout: fixed;
          font-size: 10px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          background: white;
          border: 1px solid #e2e8f0;
        }
        /* Column width styles for main data table */
        table:not(.webbing-table) th:first-child,
        table:not(.webbing-table) td:first-child {
          width: 60%; /* Give first column 60% of the width */
        }
        table:not(.webbing-table) th:not(:first-child),
        table:not(.webbing-table) td:not(:first-child) {
          width: 40%; /* Remaining columns share 40% */
        }
        /* Webbing table column widths */
        table.webbing-table th:first-child,
        table.webbing-table td:first-child {
          width: 30%; /* Panel No column */
        }
        table.webbing-table th:last-child,
        table.webbing-table td:last-child {
          width: 70%; /* Material column */
        }        table.webbing-table {
          max-width: 100%;
          margin: 0 auto;
          table-layout: fixed; /* Ensures fixed column widths */
        }
        th, td {
          padding: 8px 10px;
          text-align: left;
          vertical-align: top;
          overflow: visible;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          line-height: 1.25 !important;
          margin: 0 !important;
          font-size: 10px;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          max-width: 100%;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* Remove space after paragraphs in all table cells */
        td p, th p {
          margin: 0 !important;
          padding: 0 !important;
        }
        td:last-child {
          border-right: none;
        }
        th {
          background-color: #f8fafc;
          font-weight: 600;
          font-size: 10px;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e2e8f0;
        }
        /* Alternating row backgrounds */
        tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }/* Highlighted cell styles for PDF export */
        .highlighted {
          background-color: rgba(156, 163, 175, 0.3) !important;
          background: rgba(156, 163, 175, 0.3) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }        .empty-row td {
          height: 20px;
          border-bottom: 1px solid #e5e7eb;
        }        /* Special styling for webbing cells - Excel-like behavior */
        table.webbing-table td {
          padding: 4px 8px;
          line-height: 0.75 !important;
          font-family: Arial, sans-serif;
          font-size: 10px;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow: visible;
        }
        
        /* Remove any extra spacing from nested elements */
        table.webbing-table td p,
        table.webbing-table td span,
        table.webbing-table td div {
          margin: 0 !important;
          padding: 0 !important;
          line-height: inherit;
          display: inline;
        }
        
        /* Hide any manual line breaks and let natural wrapping occur */
        table.webbing-table td br {
          display: none;
        }@media print {
          body { 
            margin: 0;
            padding: 0.5cm;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .no-print {
            display: none;
          }
          button {
            display: none;
          }
          /* Preserve table styling in print */
          table {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
          th {
            background-color: #f8fafc !important;
            color: #374151 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          tbody tr:nth-child(even) {
            background-color: #f9fafb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* Ensure highlighted cells maintain background in print */
          .highlighted {
            background-color: rgba(156, 163, 175, 0.3) !important;
            background: rgba(156, 163, 175, 0.3) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        .print-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .print-button {
          padding: 8px 16px;
          background: #4a64d8;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .print-button:hover {
          background: #3950b3;
        }        .timestamp {
          font-size: 9px;
          color: #777;
          margin-top: 15px;
          text-align: right;
        }
      </style>
    </head>
    <body>      <div class="container">        <div class="print-controls no-print">
          <button class="print-button" onclick="window.print()">Print</button>
        </div>
        

        <!-- Flex row: shop order note left, order number right, aligned at top -->
        <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; width: 100%; margin-bottom: 10px;">
          <div class="shop-order-box" style="flex: 1; text-align: left;">
            ${shopOrderNote ? shopOrderNote.split('\n').map(line => line).join('<br>') : ''}
          </div>
          <div class="order-number-display" style="min-width: 80px; text-align: right; font-weight: bold;">
            ${excelDataSets && excelDataSets.length > 0 && excelDataSets[0].cellA2Value ? `${excelDataSets[0].cellA2Value}` : ''}
          </div>
        </div>
  `);

  // Create a table that matches the style of the example image
  printWindow.document.write(`
      <table>
        <thead>
          <tr>
  `);

  // Generate table headers, filtering out hidden columns if needed
  const visibleHeaders = [];
  for (let i = 0; i < columnHeaders.length; i++) {
    // Skip hidden panel columns if hidePanelColumns is true
    if (hidePanelColumns && i > 0 && i % 2 === 0) continue;
    visibleHeaders.push(columnHeaders[i]);
    printWindow.document.write(`<th>${columnHeaders[i]}</th>`);
  }

  printWindow.document.write(`
          </tr>
        </thead>
        <tbody>
  `);

  // Calculate how many rows fit on the first page (e.g., 30)
  const rowsPerPage = 30;  // Print only the first page's rows with header
  // Print only the first page's rows with header
  for (let rowIdx = 0; rowIdx < visibleDataRows.length && rowIdx < rowsPerPage; rowIdx++) {
    printWindow.document.write(`<tr>`);
    const row = visibleDataRows[rowIdx];
    let visibleColIndex = 0;
    for (let i = 0; i < row.length; i++) {
      if (hidePanelColumns && i > 0 && i % 2 === 0) continue;
      // Determine cell type and check if highlighted
      const datasetIdx = Math.floor(i / 2);
      const cellType = i % 2 === 0 ? 'panel' : 'material';
      const cellKey = `${cellType}-${datasetIdx}-${rowIdx}`;
      const isHighlighted = highlightedCells && highlightedCells.has(cellKey);
      const cellClass = isHighlighted ? ' class="highlighted"' : '';
      printWindow.document.write(`<td${cellClass}>${row[i] || ''}</td>`);
      visibleColIndex++;
    }
    printWindow.document.write(`</tr>`);
  }
  // Add empty rows to fill the first page if needed - but only if we need to add page breaks
  if (dataRows.length > rowsPerPage) {
    for (let i = visibleDataRows.length; i < rowsPerPage; i++) {
      printWindow.document.write(`<tr class="empty-row">`);
      for (let j = 0; j < visibleHeaders.length; j++) {
        printWindow.document.write(`<td>&nbsp;</td>`);
      }
      printWindow.document.write(`</tr>`);
    }
  }
  printWindow.document.write(`
        </tbody>
      </table>
  `);  // Add webbing data table if available - simplified version with only 2 columns
  if (webbingDataRows && webbingDataRows.length > 0) {
    printWindow.document.write(`      <div class="webbing-section" style="margin-top: 30px; margin-bottom: 10px;">
        <h2 class="section-title" style="font-size: 14px; margin-bottom: 8px; font-weight: 700; color: #1e293b; text-align: center; position: relative; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0;">Webbing Details</h2>
      </div>
      <table class="webbing-table">
        <thead>
          <tr>
    `);

    // Add the two column headers for webbing (always Panel No and Material)
    printWindow.document.write(`<th>${webbingColumnHeaders[0] || 'Panel No'}</th>`);
    printWindow.document.write(`<th>${webbingColumnHeaders[1] || 'Material'}</th>`);

    printWindow.document.write(`
          </tr>
        </thead>
        <tbody>
    `);    // Add webbing data rows - each row has only 2 cells with clean Excel-like text
    for (const row of webbingDataRows) {
      printWindow.document.write(`<tr>`);
      // Output both columns as-is, preserving line breaks and spaces (no normalization)
      const panelText = row[0] || '';
      const webbingText = row[1] || '';
      printWindow.document.write(`<td>${panelText}</td>`);
      printWindow.document.write(`<td>${webbingText}</td>`);
      printWindow.document.write(`</tr>`);
    }

    printWindow.document.write(`
        </tbody>
      </table>
    `);
  }
  // Print remaining rows (if any) without repeating table headers after page breaks
  let remainingRows = visibleDataRows.slice(rowsPerPage);
  if (remainingRows.length > 0) {
    // Continue using the same table structure for the first page, but do NOT repeat thead
    // Insert a page break row, then just add <tr> for each row
    printWindow.document.write(`
      <tr class="page-break">
        <td colspan="${visibleHeaders.length}" style="border:none; page-break-before:always;"></td>
      </tr>
    `);
    for (let pageIndex = 0; pageIndex < Math.ceil(remainingRows.length / rowsPerPage); pageIndex++) {
      const pageRows = remainingRows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
      // Insert a page break for pages after the first continuation
      if (pageIndex > 0) {
        printWindow.document.write(`
          <tr class="page-break">
            <td colspan="${visibleHeaders.length}" style="border:none; page-break-before:always;"></td>
          </tr>
        `);
      }
      // Add rows for this page (no thead)
      for (let rowIdx = 0; rowIdx < pageRows.length; rowIdx++) {
        const row = pageRows[rowIdx];
        const actualRowIdx = rowsPerPage + (pageIndex * rowsPerPage) + rowIdx;
        printWindow.document.write('<tr>');
        let visibleColIndex = 0;
        for (let i = 0; i < row.length; i++) {
          if (hidePanelColumns && i > 0 && i % 2 === 0) continue;
          // Determine cell type and check if highlighted
          const datasetIdx = Math.floor(i / 2);
          const cellType = i % 2 === 0 ? 'panel' : 'material';
          const cellKey = `${cellType}-${datasetIdx}-${actualRowIdx}`;
          const isHighlighted = highlightedCells && highlightedCells.has(cellKey);
          const cellClass = isHighlighted ? ' class="highlighted"' : '';
          printWindow.document.write(`<td${cellClass}>${row[i] || ''}</td>`);
          visibleColIndex++;
        }
        printWindow.document.write('</tr>');
      }
      // Fill the rest of the page with empty rows if needed - but only if we have more pages to come
      if ((pageIndex < Math.ceil(remainingRows.length / rowsPerPage) - 1) && pageRows.length < rowsPerPage) {
        for (let i = pageRows.length; i < rowsPerPage; i++) {
          printWindow.document.write('<tr class="empty-row">');
          for (let j = 0; j < visibleHeaders.length; j++) {
            if (hidePanelColumns && j > 0 && j % 2 === 0) continue;
            printWindow.document.write('<td>&nbsp;</td>');
          }
          printWindow.document.write('</tr>');
        }
      }
    }
    // The rows are added to the same tbody, no repeated thead
  }
  // Close the table properly
  printWindow.document.write(`
        </tbody>
      </table>
      <div class="timestamp">
        Generated: ${new Date().toLocaleString()}
      </div>
      </div>
      <script>
        // Ensure highlighted cells maintain styling during print
        window.addEventListener('beforeprint', function() {
          const highlightedCells = document.querySelectorAll('.highlighted');
          highlightedCells.forEach(function(cell) {
            cell.style.backgroundColor = '#e5e7eb !important';
            cell.style.background = '#e5e7eb !important';
            cell.style.webkitPrintColorAdjust = 'exact';
            cell.style.printColorAdjust = 'exact';
            cell.style.colorAdjust = 'exact';
          });
        });
        // Also apply on page load
        document.addEventListener('DOMContentLoaded', function() {
          const highlightedCells = document.querySelectorAll('.highlighted');
          highlightedCells.forEach(function(cell) {
            cell.style.backgroundColor = '#e5e7eb';
            cell.style.background = '#e5e7eb';
            cell.style.webkitPrintColorAdjust = 'exact';
            cell.style.printColorAdjust = 'exact';
            cell.style.colorAdjust = 'exact';
          });
        });
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
};
