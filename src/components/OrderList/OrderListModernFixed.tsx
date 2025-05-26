import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useProjectLoader } from './useProjectLoader';
import { Upload, FileText, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import './OrderList.css';
import { filterKeywordService, projectService } from '../../lib/supabase';
import gsap from 'gsap';
import ImageGallery, { ImageItem, ImageGalleryHandle } from './ImageGallery';
import { exportOrderDataAsHTML } from './exportHtml';

// Add window augmentation for typings
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

type OrderRow = {
  id: string;
  panelNo: string;
  material: string;
};

// Adding a type for webbing items
type WebbingData = {
  id: string;
  rows: OrderRow[];
  panelHeading: string;
  materialHeading: string;
};

type ExcelData = {
  id: string;
  rows: OrderRow[];
  panelHeading: string;
  materialHeading: string;
  cellA2Value?: string; // A2 cell value from the Excel file
  cellB2Value?: string; // B2 cell value from the Excel file
};

const initialExcelData: ExcelData[] = [];
const initialWebbingData: WebbingData = {
  id: 'webbing-data',
  rows: [],
  panelHeading: 'Panel No',
  materialHeading: 'Material'
};

const OrderList = () => {
  // Image state
  const [images, setImages] = useState<ImageItem[]>([]);
  // Project ID state (use orderNo as projectId for storage, or generate a unique id if needed)
  const [projectId, setProjectId] = useState<string>('');
  const [excelDataSets, setExcelDataSets] = useState<ExcelData[]>(initialExcelData);
  const [webbingData, setWebbingData] = useState<WebbingData>(initialWebbingData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageGalleryRef = useRef<ImageGalleryHandle>(null);
  const [orderNo, setOrderNo] = useState<string>('');
  const [shopOrderNote, setShopOrderNote] = useState<string>('');
  const [mergedData, setMergedData] = useState<any[][]>([]);
  const [mergedWebbingData, setMergedWebbingData] = useState<any[][]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hidePanelColumns, setHidePanelColumns] = useState(false);  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Effect: update projectId when orderNo changes
  useEffect(() => {
    if (orderNo) setProjectId(orderNo);
  }, [orderNo]);

  // Save project handler
  const handleSaveProject = async () => {
    if (!orderNo || excelDataSets.length === 0) {
      setErrorMessage('Order No and at least one Excel file are required to save.');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const project = {
        name: '',
        order_no: orderNo,
        shop_order_note: shopOrderNote,
        excel_data: excelDataSets,
        images // Save images array
      };
      const saved = await projectService.saveProject(project);
      if (saved) {
        setSuccessMessage('Project saved successfully!');
      } else {
        setErrorMessage('Failed to save project.');
      }
    } catch (err) {
      setErrorMessage('Error saving project.');
    } finally {
      setIsSaving(false);
    }
  };

  const [filterKeywords, setFilterKeywords] = useState<string[]>([]);
  const tableRef = useRef<HTMLTableElement>(null);
  // New state for drag and drop functionality
  const [draggedPair, setDraggedPair] = useState<{datasetIndex: number, rowIndex: number} | null>(null);
  const [dropTarget, setDropTarget] = useState<{datasetIndex: number, rowIndex: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Refs for GSAP animations
  const cellRefs = useRef<{[key: string]: HTMLTableCellElement}>({});
  
  // Load filter keywords from localStorage on component mount
  useEffect(() => {
    const loadKeywords = async () => {
      try {
        // Try to get keywords from service first
        const keywordsFromDb = await filterKeywordService.getKeywords();
        if (keywordsFromDb && keywordsFromDb.length > 0) {
          setFilterKeywords(keywordsFromDb);
          console.log('Loaded filter keywords from service:', keywordsFromDb);
        } else {
          // Fall back to localStorage if no keywords from service
          const savedKeywords = localStorage.getItem('filterKeywords');
          if (savedKeywords) {
            const parsedKeywords = JSON.parse(savedKeywords);
            setFilterKeywords(parsedKeywords);
            console.log('Loaded filter keywords from localStorage:', parsedKeywords);
          }
        }
      } catch (error) {
        console.error('Error loading filter keywords:', error);
        // Fall back to localStorage if there's an error
        const savedKeywords = localStorage.getItem('filterKeywords');
        if (savedKeywords) {
          try {
            const parsedKeywords = JSON.parse(savedKeywords);
            setFilterKeywords(parsedKeywords);
            console.log('Loaded filter keywords from localStorage after error:', parsedKeywords);
          } catch (e) {
            console.error('Error parsing localStorage keywords:', e);
          }
        }
      }
    };
    
    loadKeywords();
  }, []);
  
  // Extract specific cells from the Excel data (A2 and B2)
  const extractSpecificCells = (workbook: XLSX.WorkBook) => {
    try {
      console.log('Starting direct cell extraction from Excel...');
      
      // Get the first sheet
      const firstSheetName = workbook.SheetNames[0];
      console.log('First sheet name:', firstSheetName);
      const firstSheet = workbook.Sheets[firstSheetName];
      
      // Just directly read the cells and set them without any processing
      const cellA2 = firstSheet['A2'];
      const cellB2 = firstSheet['B2'];
      const cellB3 = firstSheet['B3'];
      
      // Just get the values directly
      let orderNoValue = '';
      let shopOrderValue = '';
      let cellA2Value = '';
      let cellB2Value = '';
      

      if (cellA2 && cellA2.v) {
        cellA2Value = String(cellA2.v);
        console.log('Direct copy of cell A2:', cellA2Value);
      }

      if (cellB2 && cellB2.v) {
        let rawB2 = String(cellB2.v);
        cellB2Value = rawB2;
        // Try to extract only the order number if B2 contains a pattern like '...: ORDERNO'
        const match = rawB2.match(/:([^:]+)$/);
        if (match && match[1]) {
          orderNoValue = match[1].trim();
        } else {
          orderNoValue = rawB2.trim();
        }
        console.log('Extracted orderNo from cell B2:', orderNoValue);
      }
      
      if (cellB3 && cellB3.v) {
        shopOrderValue = String(cellB3.v);
        console.log('Direct copy of cell B3:', shopOrderValue);
      }
      
      // Set the values directly
      setOrderNo(orderNoValue);
      setShopOrderNote(shopOrderValue);
      
      return { 
        orderNo: orderNoValue, 
        shopOrderNote: shopOrderValue,
        cellA2Value,
        cellB2Value
      };
    } catch (error) {
      console.error('Error extracting cells:', error);
      return { 
        orderNo: '', 
        shopOrderNote: '',
        cellA2Value: '',
        cellB2Value: ''
      };
    }
  };
  
  // Try to extract order information from the Excel data
  const extractOrderInfo = (jsonData: any[], workbook: XLSX.WorkBook) => {
    try {
      // First try to extract specific cells A2 and B2
      const { orderNo: foundOrderNo, shopOrderNote: foundShopOrderNote } = extractSpecificCells(workbook);
      
      // If we couldn't get data from specific cells, use the more general method
      if (!foundOrderNo || !foundShopOrderNote) {
        // Check if we have headers in the data
        let shopOrderNoteValue = '';
        let orderNoValue = '';
        
        // First, check the workbook for potential named cells or metadata
        // Some Excel files store metadata in the workbook properties
        if (workbook.Props) {
          const props = workbook.Props;
          if (props.Title) {
            console.log('Found workbook title (not used):', props.Title);
            // Removed setProjectName as we're now using Order No for the project name
          }
        }
        
        // Look for columns with specific headers
        let shopOrderNoteColIndex = -1;
        let orderNoColIndex = -1;
        
        // Get all worksheet names
        const worksheets = workbook.SheetNames;
        
        // Try to find info in the first few rows of each worksheet
        for (const sheetName of worksheets) {
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON with header:1 option to get array of arrays (rows)
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          // Examine first few rows for potential metadata or order info
          const rowsToCheck = Math.min(10, rawData.length);
          
          for (let i = 0; i < rowsToCheck; i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row)) continue;
            
            // Look for cells that might contain order info
            for (let j = 0; j < row.length; j++) {
              const cell = String(row[j] || '').trim();
              
              // Check for specific column headers
              if (cell.toLowerCase().includes('shop') && cell.toLowerCase().includes('order') && cell.toLowerCase().includes('note')) {
                shopOrderNoteColIndex = j;
                // Try to get the value from the next row
                if (i + 1 < rawData.length && rawData[i+1] && rawData[i+1][j]) {
                  shopOrderNoteValue = String(rawData[i+1][j]);
                  console.log('Found shop order note value:', shopOrderNoteValue);
                }
              }
              
              if (cell.toLowerCase().includes('order') && cell.toLowerCase().includes('no')) {
                orderNoColIndex = j;
                // Try to get the value from the next row
                if (i + 1 < rawData.length && rawData[i+1] && rawData[i+1][j]) {
                  orderNoValue = String(rawData[i+1][j]);
                  console.log('Found order no value:', orderNoValue);
                }
              }
              
              // Look for standalone values that might be order info
              if (!shopOrderNoteValue && cell.length > 5) {
                const lowerCell = cell.toLowerCase();
                if (lowerCell.includes('shop') && lowerCell.includes('order')) {
                  // Extract value after the label
                  const match = cell.match(/shop\s+order\s+note[:\s]*(.+)/i);
                  if (match && match[1]) {
                    shopOrderNoteValue = match[1].trim();
                    console.log('Found shop order note from label:', shopOrderNoteValue);
                  }
                }
              }
              
              if (!orderNoValue && cell.length > 3) {
                const lowerCell = cell.toLowerCase();
                if (lowerCell.includes('order') && lowerCell.includes('no')) {
                  // Extract value after the label
                  const match = cell.match(/order\s+no[:.;\s]*(.+)/i);
                  if (match && match[1]) {
                    orderNoValue = match[1].trim();
                    console.log('Found order no from label:', orderNoValue);
                  }
                }
              }
            }
          }
          
          // If we found column indices, now try to extract the first cell data for each column
          if (shopOrderNoteColIndex >= 0 || orderNoColIndex >= 0) {
            console.log(`Found columns - Shop Order Note: ${shopOrderNoteColIndex}, Order No: ${orderNoColIndex}`);
            
            // Get the actual data (skipping the header row)
            const dataRows = jsonData;
            
            if (dataRows && dataRows.length > 0) {
              for (const row of dataRows) {
                // Extract Order No from first data cell if we found the column
                if (orderNoColIndex >= 0 && !orderNoValue) {
                  const keys = Object.keys(row);
                  if (keys.length > orderNoColIndex) {
                    const orderNoKey = keys[orderNoColIndex];
                    if (row[orderNoKey] && String(row[orderNoKey]).trim()) {
                      orderNoValue = String(row[orderNoKey]).trim();
                      console.log('Found order no from data cell:', orderNoValue);
                      break;
                    }
                  }
                }
                
                // Extract Shop Order Note from first data cell if we found the column
                if (shopOrderNoteColIndex >= 0 && !shopOrderNoteValue) {
                  const keys = Object.keys(row);
                  if (keys.length > shopOrderNoteColIndex) {
                    const shopOrderKey = keys[shopOrderNoteColIndex];
                    if (row[shopOrderKey] && String(row[shopOrderKey]).trim()) {
                      shopOrderNoteValue = String(row[shopOrderKey]).trim();
                      console.log('Found shop order note from data cell:', shopOrderNoteValue);
                      break;
                    }
                  }
                }
              }
            }
          }
          
          // If the current worksheet gave us the values we need, stop processing
          if (shopOrderNoteValue && orderNoValue) {
            break;
          }
        }
        
        // Look through the jsonData for potential field values (this is our fallback approach)
        if (!shopOrderNoteValue || !orderNoValue) {
          console.log('Falling back to scanning all jsonData for order info');
          // Scan through all data looking for potential matches
          for (const row of jsonData) {
            for (const key in row) {
              const value = String(row[key]).trim();
              
              // Look for order number
              if (!orderNoValue && 
                  (key.toLowerCase().includes('order') || 
                   value.toLowerCase().includes('order'))) {
                const potentialOrderNo = value.replace(/order\s*no\s*[:.]/i, '').trim();
                if (potentialOrderNo && potentialOrderNo !== 'undefined') {
                  orderNoValue = potentialOrderNo;
                  console.log('Found potential Order No from data scan:', orderNoValue);
                }
              }
              
              // Look for shop order note
              if (!shopOrderNoteValue && 
                  (key.toLowerCase().includes('note') || 
                   key.toLowerCase().includes('shop') ||
                   value.toLowerCase().includes('note') ||
                   value.toLowerCase().includes('shop'))) {
                const potentialNote = value.replace(/shop\s*order\s*note\s*[:.]/i, '').trim();
                if (potentialNote && potentialNote !== 'undefined' && potentialNote.length > 5) {
                  shopOrderNoteValue = potentialNote;
                  console.log('Found potential Shop Order Note from data scan:', shopOrderNoteValue);
                }
              }
            }
          }
        }
        
        // Set the found values only if we didn't already get them from A2/B2
        if (!foundShopOrderNote && shopOrderNoteValue) {
          setShopOrderNote(shopOrderNoteValue);
        }
        
        if (!foundOrderNo && orderNoValue) {
          setOrderNo(orderNoValue);
        }
      }
    } catch (error) {
      console.error('Error extracting order info:', error);
    }
  };
  
  const processExcelFiles = (files: FileList) => {
    console.log('Processing files:', files.length);
    setErrorMessage(''); // Clear any previous error messages
    
    // If there are no files, exit early
    if (files.length === 0) {
      console.log('No files to process');
      setErrorMessage('No files selected for upload');
      return;
    }
    
    try {
      const newDatasets: ExcelData[] = [];
      
      const processNextFile = (index: number) => {
        if (index >= files.length) {
          // All files processed
          console.log('All files processed. Updating state with', newDatasets.length, 'datasets');
          if (newDatasets.length === 0) {
            console.error('No valid datasets were created from the uploaded files');
            setErrorMessage('No valid data could be extracted from the uploaded files.');
            return;
          }
          setExcelDataSets(newDatasets);
          createMergedData(newDatasets);
          return;
        }
        
        const file = files[index];
        console.log(`Processing file ${index + 1}/${files.length}: ${file.name}`);
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            console.log(`File ${file.name} loaded successfully`);
            if (!e.target?.result) {
              console.error(`File ${file.name} - No result data`);
              setErrorMessage(`Error reading file ${file.name}. No data found.`);
              processNextFile(index + 1);
              return;
            }
            
            const data = new Uint8Array(e.target.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
              console.error(`File ${file.name} - No sheets found`);
              setErrorMessage(`Error processing file ${file.name}. No worksheets found.`);
              processNextFile(index + 1);
              return;
            }
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            if (!worksheet) {
              console.error(`File ${file.name} - Worksheet is empty`);
              setErrorMessage(`Error processing file ${file.name}. Worksheet is empty.`);
              processNextFile(index + 1);
              return;
            }
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
            
            console.log(`File ${file.name} parsed. Row count: ${jsonData.length}`);
            
            // If this is the first file, try to extract order info
            if (index === 0) {
              // First try specific cells extraction (A2 and B2)
              const cellValues = extractSpecificCells(workbook);
              console.log('Extracted cell values:', cellValues);
              
              // Then use general extraction if cells were empty
              if (!orderNo || !shopOrderNote) {
                extractOrderInfo(jsonData, workbook);
                
                // If we couldn't find values, set default ones based on the filename
                if (!orderNo) {
                  setOrderNo(file.name.replace(/\.[^/.]+$/, ""));
                }
                
                if (!shopOrderNote) {
                  // If file name contains "QuickReportOverview", use it as shop order note
                  if (file.name.includes("QuickReportOverview")) {
                    console.log('Using filename as shop order note:', file.name);
                    setShopOrderNote(file.name.replace(/\.[^/.]+$/, ""));
                  } else {
                    // Look for cell A1 for potential "Order No" label
                    const cellA1 = worksheet['A1'];
                    if (cellA1 && cellA1.v && String(cellA1.v).includes("Order No")) {
                      console.log('Found "Order No" label in A1, using B1 value as order no');
                      const cellB1 = worksheet['B1'];
                      if (cellB1 && cellB1.v) {
                        const b1Value = String(cellB1.v).trim();
                        setOrderNo(b1Value);
                      }
                    }
                    
                    // Look for cell A2 for potential "Shop Order Note" label
                    const cellA2 = worksheet['A2'];
                    if (cellA2 && cellA2.v && String(cellA2.v).includes("Shop Order Note")) {
                      console.log('Found "Shop Order Note" label in A2, using B2 value as shop order note');
                      const cellB2 = worksheet['B2'];
                      if (cellB2 && cellB2.v) {
                        const b2Value = String(cellB2.v).trim();
                        setShopOrderNote(b2Value);
                      } else {
                        // B2 is empty but we found the label, use filename as fallback
                        setShopOrderNote(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    } else {
                      setShopOrderNote('');
                    }
                  }
                }
              }
            }
            
            // Process data and remove only the "cutting" or "cutting-s" text
            const newRows = jsonData.map((row, rowIndex) => {
              let panelNo = row['Note Text'] || row['Panel No'] || row['Cutting'] || row[Object.keys(row)[0]] || '';
              let material = row['Description'] || row['Material'] || row[Object.keys(row)[1]] || '';
              
              // Convert to strings
              panelNo = String(panelNo);
              material = String(material);
              
              // Remove "cutting" or "cutting-s" prefixes from panelNo
              if (typeof panelNo === 'string') {
                const lowerPanelNo = panelNo.toLowerCase();
                if (lowerPanelNo.startsWith('cutting-s')) {
                  panelNo = panelNo.substring(9).trim(); // Remove 'cutting-s'
                } else if (lowerPanelNo.startsWith('cutting')) {
                  panelNo = panelNo.substring(7).trim(); // Remove 'cutting'
                }
              }
              
              // Remove "cutting" or "cutting-s" prefixes from material
              if (typeof material === 'string') {
                const lowerMaterial = material.toLowerCase();
                if (lowerMaterial.startsWith('cutting-s')) {
                  material = material.substring(9).trim(); // Remove 'cutting-s'
                } else if (lowerMaterial.startsWith('cutting')) {
                  material = material.substring(7).trim(); // Remove 'cutting'
                }
              }
              
              return {
                id: `${Date.now()}-${index}-${rowIndex}`,
                panelNo,
                material
              };
            });
            
            // Filter out rows based on filter keywords
            const filteredRows = newRows.filter(row => {
              if (filterKeywords.length === 0) return true; // Keep all rows if no filter keywords
              
              const lowerMaterial = row.material.toLowerCase();
              // Keep row only if it doesn't contain any filter keywords
              return !filterKeywords.some(keyword => 
                lowerMaterial.includes(keyword.toLowerCase())
              );
            });
            
            console.log(`Filtered rows: ${filteredRows.length} of ${newRows.length} (removed ${newRows.length - filteredRows.length})`);
            
            // Create a new Excel data set with filtered rows
            // First extract the A2 and B2 cell values for this dataset
            const { cellA2Value, cellB2Value } = extractSpecificCells(workbook);
            
            const newExcelData: ExcelData = {
              id: `excel-${Date.now()}-${index}`,
              rows: filteredRows,
              panelHeading: 'Panel No', // Default panel heading
              materialHeading: 'Material', // Default material heading
              cellA2Value: cellA2Value || '', // A2 cell value 
              cellB2Value: cellB2Value || ''  // B2 cell value
            };
            
            newDatasets.push(newExcelData);
            
            // Process next file
            processNextFile(index + 1);
          } catch (error) {
            console.error(`Error processing Excel file ${file.name}:`, error);
            setErrorMessage(`Error processing Excel file ${file.name}. Please make sure it has the correct format.`);
            // Continue with next file despite the error
            processNextFile(index + 1);
          }
        };
        
        reader.onerror = (error) => {
          console.error(`Error reading file ${file.name}:`, error);
          setErrorMessage(`Error reading file ${file.name}.`);
          // Continue with next file despite the error
          processNextFile(index + 1);
        };
        
        // Start reading the file
        reader.readAsArrayBuffer(file);
      };
      
      // Start processing the first file
      processNextFile(0);
      
    } catch (error) {
      console.error('Unexpected error during file processing:', error);
      setErrorMessage('An unexpected error occurred during file processing. Please try again.');
    }
  };
  
  const handleDirectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Direct upload triggered');
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      setErrorMessage('No files selected');
      return;
    }
    
    console.log(`Selected ${files.length} files directly`);
    
    // Clear existing data
    setExcelDataSets([]);
    setMergedData([]);
    setOrderNo('');
    setShopOrderNote('');
    
    // Process the files
    processExcelFiles(files);  };
  
  const createMergedData = useCallback((datasets: ExcelData[]) => {
    console.log('Creating merged data from datasets:', datasets.length);
    // Find the maximum number of rows across all datasets
    const maxRows = Math.max(...datasets.map(ds => ds.rows.length), 0);
    
    if (maxRows === 0) {
      console.log('No rows found in datasets, setting empty merged data');
      setMergedData([]);
      setMergedWebbingData([]);
      return;
    }
    
    // Create header row with panel and material headings for each dataset
    const headerRow: string[] = [];
    datasets.forEach((dataset) => {
      headerRow.push(dataset.panelHeading, dataset.materialHeading);
    });
    
    // Create data rows, separating webbing items
    let dataRows: any[][] = [];
    
    // First, extract rows with "webbing" in the material field for each dataset
    const webbingMap = new Map<number, OrderRow[]>();
    
    // Identify and separate webbing rows from each dataset
    datasets.forEach((dataset, datasetIdx) => {
      const webbingItems: OrderRow[] = [];
      
      dataset.rows.forEach(row => {
        if (row.material.toLowerCase().includes('webbing')) {
          webbingItems.push(row);
        }
      });
      
      if (webbingItems.length > 0) {
        webbingMap.set(datasetIdx, webbingItems);
      }
    });
    
    // Create updated datasets with webbing rows removed
    const updatedDatasets = datasets.map((dataset, datasetIdx) => {
      return {
        ...dataset,
        rows: dataset.rows.filter(row => !row.material.toLowerCase().includes('webbing'))
      };
    });
    
    // Create regular data rows (excluding webbing items)
    for (let i = 0; i < maxRows; i++) {
      const row: any[] = [];
      updatedDatasets.forEach(dataset => {
        // If this dataset has this row, add its data, otherwise add empty cells
        if (i < dataset.rows.length) {
          row.push(dataset.rows[i].panelNo, dataset.rows[i].material);
        } else {
          row.push('', '');
        }
      });
      // Only add non-empty rows
      if (row.some(cell => String(cell).trim() !== '')) {
        dataRows.push(row);
      }
    }
    
    // Create webbing data rows - only from the first Excel dataset that has webbing items
    // Find the first dataset that contains webbing items
    const firstDatasetWithWebbing = Array.from(webbingMap.keys()).sort()[0];
    
    if (firstDatasetWithWebbing !== undefined) {
      const webbingItems = webbingMap.get(firstDatasetWithWebbing) || [];
      
      if (webbingItems.length > 0) {
        // Get column headings from the dataset with webbing
        const dataset = datasets[firstDatasetWithWebbing];
        const webbingHeaderRow = [dataset.panelHeading, dataset.materialHeading];
        
        // Create webbing data rows from only the first dataset with webbing
        const rows = webbingItems.map(item => [item.panelNo, item.material]);
        
        // Set the merged webbing data (only two columns)
        setMergedWebbingData([webbingHeaderRow, ...rows]);
        console.log('Merged webbing data created with', rows.length + 1, 'rows (including header), using dataset', firstDatasetWithWebbing);
      } else {
        // No webbing data found
        setMergedWebbingData([]);
      }
    } else {
      // No dataset with webbing found
      setMergedWebbingData([]);
    }
      // Combine header and regular data rows
    const newMergedData = [headerRow, ...dataRows];    console.log('Merged data created with', newMergedData.length, 'rows (including header)');
    setMergedData(newMergedData);
  }, [setMergedData, setMergedWebbingData]);
  // Load project from URL if projectId is present
  useProjectLoader({ setExcelDataSets, setOrderNo, setShopOrderNote, setHidePanelColumns, createMergedData, setImages });
    // Handle header cell edit
  const handleHeaderEdit = (datasetIdx: number, isPanel: boolean, value: string) => {
    const updatedDatasets = [...excelDataSets];
    if (updatedDatasets[datasetIdx]) {
      if (isPanel) {
        updatedDatasets[datasetIdx].panelHeading = value;
      } else {
        updatedDatasets[datasetIdx].materialHeading = value;
      }
      
      setExcelDataSets(updatedDatasets);
      createMergedData(updatedDatasets);
    }
  };

  // HTML table export function that opens in a new tab
  const handleExportPDF = () => {
    exportOrderDataAsHTML(
      orderNo,
      shopOrderNote,
      mergedData,
      excelDataSets,
      hidePanelColumns,
      mergedWebbingData // Add webbing data to export function
    );
  };

  // Drag and drop handlers with GSAP animations
  const handleDragStart = (e: React.DragEvent, datasetIndex: number, rowIndex: number) => {
    setDraggedPair({ datasetIndex, rowIndex });
    setIsDragging(true);
    const panelKey = `panel-${datasetIndex}-${rowIndex}`;
    const materialKey = `material-${datasetIndex}-${rowIndex}`;
    const panelCell = cellRefs.current[panelKey];
    const materialCell = cellRefs.current[materialKey];
    
    if (panelCell) {
      gsap.to(panelCell, {
        duration: 0.2,
        background: 'rgba(59, 130, 246, 0.1)',
        boxShadow: 'inset 0 0 0 2px rgba(59, 130, 246, 0.4)'
      });
    }
    if (materialCell) {
      gsap.to(materialCell, {
        duration: 0.2,
        background: 'rgba(59, 130, 246, 0.1)',
        boxShadow: 'inset 0 0 0 2px rgba(59, 130, 246, 0.4)'
      });
    }
    document.body.style.cursor = 'grabbing';
  };

  const handleDragOver = (e: React.DragEvent, datasetIndex: number, rowIndex: number) => {
    if (!isDragging || !draggedPair) return;
    setDropTarget({ datasetIndex, rowIndex });
    
    const targetPanelKey = `panel-${datasetIndex}-${rowIndex}`;
    const targetMaterialKey = `material-${datasetIndex}-${rowIndex}`;
    const sourcePanelKey = `panel-${draggedPair.datasetIndex}-${draggedPair.rowIndex}`;
    const sourceMaterialKey = `material-${draggedPair.datasetIndex}-${draggedPair.rowIndex}`;
    
    // Reset all cells first
    Object.keys(cellRefs.current).forEach(key => {
      const cell = cellRefs.current[key];
      if (key !== sourcePanelKey && key !== sourceMaterialKey) {
        gsap.to(cell, {
          duration: 0.2,
          background: 'transparent',
          boxShadow: 'none',
          ease: "power1.out"
        });
      }
    });
    
    // Highlight target cells
    const targetPanelCell = cellRefs.current[targetPanelKey];
    const targetMaterialCell = cellRefs.current[targetMaterialKey];
    
    if (targetPanelCell && targetPanelKey !== sourcePanelKey) {
      gsap.to(targetPanelCell, {
        duration: 0.2,
        background: 'rgba(16, 185, 129, 0.15)',
        boxShadow: 'inset 0 0 0 2px rgba(16, 185, 129, 0.5)',
        ease: "power1.out"
      });
    }
    if (targetMaterialCell && targetMaterialKey !== sourceMaterialKey) {
      gsap.to(targetMaterialCell, {
        duration: 0.2,
        background: 'rgba(16, 185, 129, 0.15)',
        boxShadow: 'inset 0 0 0 2px rgba(16, 185, 129, 0.5)',
        ease: "power1.out"
      });
    }
  };

  const handleDragEnd = () => {
    if (!isDragging || !draggedPair || !dropTarget) {
      resetDragState();
      return;
    }
    
    // Check if we're dropping on a different position
    if (draggedPair.datasetIndex !== dropTarget.datasetIndex || draggedPair.rowIndex !== dropTarget.rowIndex) {
      const updatedDatasets = [...excelDataSets];
      const sourceDataset = updatedDatasets[draggedPair.datasetIndex];
      const targetDataset = updatedDatasets[dropTarget.datasetIndex];
      
      if (sourceDataset && targetDataset && 
          draggedPair.rowIndex < sourceDataset.rows.length &&
          dropTarget.rowIndex < targetDataset.rows.length) {
        
        // Swap the panel and material data between the two positions
        const tempPanelNo = sourceDataset.rows[draggedPair.rowIndex].panelNo;
        const tempMaterial = sourceDataset.rows[draggedPair.rowIndex].material;
        
        sourceDataset.rows[draggedPair.rowIndex].panelNo = targetDataset.rows[dropTarget.rowIndex].panelNo;
        sourceDataset.rows[draggedPair.rowIndex].material = targetDataset.rows[dropTarget.rowIndex].material;
        
        targetDataset.rows[dropTarget.rowIndex].panelNo = tempPanelNo;
        targetDataset.rows[dropTarget.rowIndex].material = tempMaterial;
        
        setExcelDataSets(updatedDatasets);
        createMergedData(updatedDatasets);
        
        // Animate highlight for both cell pairs
        const sourcePanelKey = `panel-${draggedPair.datasetIndex}-${draggedPair.rowIndex}`;
        const sourceMaterialKey = `material-${draggedPair.datasetIndex}-${draggedPair.rowIndex}`;
        const targetPanelKey = `panel-${dropTarget.datasetIndex}-${dropTarget.rowIndex}`;
        const targetMaterialKey = `material-${dropTarget.datasetIndex}-${dropTarget.rowIndex}`;
        
        [sourcePanelKey, sourceMaterialKey].forEach(key => {
          const cell = cellRefs.current[key];
          if (cell) {
            gsap.to(cell, {
              duration: 0.3,
              background: 'rgba(59, 130, 246, 0.1)',
              boxShadow: 'inset 0 0 0 2px rgba(59, 130, 246, 0.4)',
              onComplete: () => {
                gsap.to(cell, { duration: 0.3, background: 'transparent', boxShadow: 'none' });
              }
            });
          }
        });
        
        [targetPanelKey, targetMaterialKey].forEach(key => {
          const cell = cellRefs.current[key];
          if (cell) {
            gsap.to(cell, {
              duration: 0.3,
              background: 'rgba(16, 185, 129, 0.15)',
              boxShadow: 'inset 0 0 0 2px rgba(16, 185, 129, 0.5)',
              onComplete: () => {
                gsap.to(cell, { duration: 0.3, background: 'transparent', boxShadow: 'none' });
              }
            });
          }
        });
      }
    }
    resetDragState();
  };
  
  const resetDragState = () => {
    // Reset all cells
    Object.values(cellRefs.current).forEach(cell => {
      if (cell) {
        gsap.to(cell, {
          duration: 0.2,
          background: 'transparent',
          boxShadow: 'none',
          opacity: 1,
          clearProps: "all"
        });
      }
    });
    setIsDragging(false);
    setDraggedPair(null);
    setDropTarget(null);
    document.body.style.cursor = 'default';
  };
  
  // Add animation effects
  useEffect(() => {
    // Animate container entrance
    gsap.fromTo('.content-wrapper', 
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out" }
    );

    // Animate buttons with stagger
    gsap.fromTo('.action-button', 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out", delay: 0.3 }
    );  }, []);

  // State to track if table has been animated initially
  const [tableAnimated, setTableAnimated] = useState(false);

  // Animate table when data changes (only once)
  useEffect(() => {
    if (excelDataSets.length > 0 && !tableAnimated) {
      gsap.fromTo('.data-table', 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
      
      // Animate table rows with stagger
      gsap.fromTo('tbody tr', 
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "power2.out", delay: 0.2 }
      );
      
      setTableAnimated(true);
    }
  }, [excelDataSets.length, tableAnimated]);

  // Calculate max row count for table rendering
  const maxRowCount = Math.max(...excelDataSets.map(ds => ds.rows.length), 0);

  return (
    <div className="order-list-container">
      <div className="content-wrapper">
        {/* Modern Action Bar */}
        <div className="action-bar">
          {/* Modern Upload Button */}
          <label className="action-button upload-button">
            <Upload size={20} />
            <span>Upload Excel Files</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleDirectUpload}
              className="hidden"
              multiple
            />
          </label>
          
          {/* Modern Toggle Switch */}
          <button
            onClick={() => {
              const newState = !hidePanelColumns;
              setHidePanelColumns(newState);
              
              // GSAP animation for the toggle
              const toggleElement = document.querySelector('.toggle-track');
              if (toggleElement) {
                gsap.to(toggleElement, {
                  duration: 0.3,
                  backgroundColor: newState ? '#667eea' : '#cbd5e1',
                  ease: "power2.out"
                });
              }
            }}
            className="action-button toggle-button"
            title={hidePanelColumns ? "Show All Panel Columns" : "Hide Panel Columns (Keep First)"}
          >
            <span className="toggle-text">
              {hidePanelColumns ? "Panel Columns Hidden" : "Show All Panels"}
            </span>
            <div className={`toggle-track ${hidePanelColumns ? 'active' : ''}`}>
              <div className="toggle-circle"></div>
            </div>
          </button>
          
          <div className="action-group">
            {/* Modern Save Button */}
            <button
              onClick={handleSaveProject}
              disabled={isSaving || !orderNo || excelDataSets.length === 0}
              className="action-button save-button"
            >
              <Save size={18} />
              <span>{isSaving ? 'Saving...' : 'Save Project'}</span>
            </button>            {/* Modern Upload Images Button */}
            <button
              onClick={() => imageGalleryRef.current?.triggerUpload()}
              disabled={!projectId}
              className="action-button upload-images-button"
              title="Upload images for this project"
            >
              <Upload size={18} />
              <span>Upload Images</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={mergedData.length === 0}
              className="action-button pdf-button"
            >
              <FileText size={18} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
        
        {/* Modern Alert Messages */}
        {errorMessage && (
          <div className="alert-message error-message">
            <div className="alert-content">
              <strong>Error:</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="alert-message success-message">
            <div className="alert-content">
              <strong>{successMessage}</strong>
            </div>
          </div>
        )}
        
        {/* Modern Project Information Display */}
        <div className="project-info-section">
          {excelDataSets.length > 0 && excelDataSets[0].cellB2Value && (
            <div className="project-details">
              {excelDataSets[0].cellB2Value}
            </div>
          )}
          
          {excelDataSets.length > 0 && excelDataSets[0].cellA2Value && (
            <div className="order-number-badge">
              {excelDataSets[0].cellA2Value}
            </div>
          )}
        </div>        {/* Responsive Layout Container for Images and Tables */}
        <div className="main-content-layout">
          {/* Modern Image Gallery - Only show when images exist */}
          {projectId && images.length > 0 && (
            <div className="image-gallery-area">
              <ImageGallery ref={imageGalleryRef} projectId={projectId} initialImages={images} onImagesChange={setImages} />
            </div>
          )}
          
          {/* Hidden ImageGallery for upload functionality when no images */}
          {projectId && images.length === 0 && (
            <div style={{ display: 'none' }}>
              <ImageGallery ref={imageGalleryRef} projectId={projectId} initialImages={images} onImagesChange={setImages} />
            </div>
          )}
          
          {/* Modern Data Display */}
          {excelDataSets.length > 0 ? (
            <div className="table-area">
              <div className="table-container">
                <table ref={tableRef} className="modern-table data-table">
                  <thead>
                    <tr>
                      {excelDataSets.map((dataset, datasetIdx) => (
                        <React.Fragment key={dataset.id}>
                          <th 
                            className={`table-header panel-header ${hidePanelColumns && datasetIdx > 0 ? 'hidden' : ''}`}
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            onBlur={(e) => handleHeaderEdit(datasetIdx, true, e.currentTarget.textContent || 'Panel No')}
                          >
                            {dataset.panelHeading}
                          </th>
                          <th 
                            className="table-header material-header"
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            onBlur={(e) => handleHeaderEdit(datasetIdx, false, e.currentTarget.textContent || 'Material')}
                          >
                            {dataset.materialHeading}
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxRowCount }).map((_, rowIdx) => (
                      <tr key={rowIdx} className="table-row">
                        {excelDataSets.map((dataset, datasetIdx) => (
                          <React.Fragment key={`${dataset.id}-${rowIdx}`}>
                            {dataset.rows[rowIdx] ? (
                              <>
                                <td 
                                  ref={(el) => {
                                    if (el) cellRefs.current[`panel-${datasetIdx}-${rowIdx}`] = el;
                                  }}
                                  className={`table-cell panel-cell ${hidePanelColumns && datasetIdx > 0 ? 'hidden' : ''}`}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, datasetIdx, rowIdx)}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    handleDragOver(e, datasetIdx, rowIdx);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    handleDragEnd();
                                  }}
                                  onDragEnd={handleDragEnd}
                                  title="Drag to move Panel No and Material pair"
                                >
                                  {dataset.rows[rowIdx].panelNo}
                                </td>
                                <td 
                                  ref={(el) => {
                                    if (el) cellRefs.current[`material-${datasetIdx}-${rowIdx}`] = el;
                                  }}
                                  className="table-cell material-cell"
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, datasetIdx, rowIdx)}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    handleDragOver(e, datasetIdx, rowIdx);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    handleDragEnd();
                                  }}
                                  onDragEnd={handleDragEnd}
                                  title="Drag to move Panel No and Material pair"
                                >
                                  {dataset.rows[rowIdx].material}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className={`table-cell empty-cell ${hidePanelColumns && datasetIdx > 0 ? 'hidden' : ''}`}></td>
                                <td className="table-cell empty-cell"></td>
                              </>
                            )}
                          </React.Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Modern Webbing Details Table */}
              {mergedWebbingData && mergedWebbingData.length > 1 && (
                <div className="webbing-section">
                  <h2 className="section-title">Webbing Details</h2>
                  <div className="table-container">
                    <table className="modern-table webbing-table">
                      <thead>
                        <tr>
                          <th className="table-header">
                            {mergedWebbingData[0][0] || 'Panel No'}
                          </th>
                          <th className="table-header">
                            {mergedWebbingData[0][1] || 'Material'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mergedWebbingData.slice(1).map((row, rowIdx) => (
                          <tr key={`webbing-${rowIdx}`} className="table-row">
                            <td className="table-cell">{row[0]}</td>
                            <td className="table-cell">{row[1]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-content">
                <Upload size={48} className="empty-state-icon" />
                <h3 className="empty-state-title">No Data Available</h3>
                <p className="empty-state-description">
                  Please upload Excel files to see the merged data preview
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderList;
