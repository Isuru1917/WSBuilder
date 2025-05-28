import React, { useState, useRef, useEffect } from 'react';
import { useProjectLoader } from './useProjectLoader';
import { Upload, FileText, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import './OrderList.css';
import { filterKeywordService, projectService } from '../../lib/supabase';
import gsap from 'gsap';
import ImageGallery, { ImageItem } from './ImageGallery';
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
  const [orderNo, setOrderNo] = useState<string>('');
  const [shopOrderNote, setShopOrderNote] = useState<string>('');
  const [mergedData, setMergedData] = useState<any[][]>([]);
  const [mergedWebbingData, setMergedWebbingData] = useState<any[][]>([]);  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hidePanelColumns, setHidePanelColumns] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Cell highlighting state
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  // Load project from URL if projectId is present
  useProjectLoader({ 
    setExcelDataSets, 
    setOrderNo, 
    setShopOrderNote, 
    setHidePanelColumns, 
    createMergedData, 
    setImages, 
    setHighlightedCells 
  });

  // Effect: update projectId when orderNo changes
  useEffect(() => {
    if (orderNo) setProjectId(orderNo);
  }, [orderNo]);

  const [filterKeywords, setFilterKeywords] = useState<string[]>([]);
  const tableRef = useRef<HTMLTableElement>(null);
  // New state for drag and drop functionality
  const [draggedPair, setDraggedPair] = useState<{datasetIndex: number, rowIndex: number} | null>(null);
  const [dropTarget, setDropTarget] = useState<{datasetIndex: number, rowIndex: number} | null>(null);  const [isDragging, setIsDragging] = useState(false);
  // Refs for GSAP animations
  const ghostRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<{[key: string]: HTMLTableRowElement}>({});
  
  // Function to create merged data from excel datasets
  const createMergedData = (datasets: ExcelData[]) => {
    // Find the maximum number of rows across all datasets
    const maxRows = Math.max(...datasets.map(ds => ds.rows.length), 0);
    
    if (maxRows === 0) {
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
    const updatedDatasets = datasets.map((dataset) => {
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
      } else {
        // No webbing data found
        setMergedWebbingData([]);
      }
    } else {
      // No dataset with webbing found
      setMergedWebbingData([]);
    }
    
    // Combine header and regular data rows
    const newMergedData = [headerRow, ...dataRows];
    setMergedData(newMergedData);
  };

  // Load filter keywords from localStorage on component mount
  useEffect(() => {
    const loadKeywords = async () => {
      try {
        // Try to get keywords from service first
        const keywordsFromDb = await filterKeywordService.getKeywords();
        if (keywordsFromDb && keywordsFromDb.length > 0) {
          setFilterKeywords(keywordsFromDb);
        } else {
          // Fall back to localStorage if no keywords from service
          const savedKeywords = localStorage.getItem('filterKeywords');
          if (savedKeywords) {
            const parsedKeywords = JSON.parse(savedKeywords);
            setFilterKeywords(parsedKeywords);
          }
        }
      } catch (error) {
        // Fall back to localStorage if there's an error
        const savedKeywords = localStorage.getItem('filterKeywords');
        if (savedKeywords) {
          try {
            const parsedKeywords = JSON.parse(savedKeywords);
            setFilterKeywords(parsedKeywords);
          } catch (e) {
            console.error('Error parsing localStorage keywords:', e);
          }
        }
      }
    };
    
    loadKeywords();
  }, []);
  
  // Save project handler
  const handleSaveProject = async () => {
    if (!orderNo || excelDataSets.length === 0) {
      setErrorMessage('Order No and at least one Excel file are required to save.');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {      const project = {
        name: '',
        order_no: orderNo,
        shop_order_note: shopOrderNote,
        excel_data: excelDataSets,
        images, // Save images array
        highlighted_cells: Array.from(highlightedCells) // Convert Set to Array for storage
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
  
  const handleDirectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      setErrorMessage('No files selected');
      return;
    }
    
    // Clear existing data
    setExcelDataSets([]);
    setMergedData([]);
    setOrderNo('');
    setShopOrderNote('');
    
    // Process the files
    processExcelFiles(files);
  };
  
  // Extract specific cells from the Excel data (A2 and B2)
  const extractSpecificCells = (workbook: XLSX.WorkBook) => {
    try {
      // Get the first sheet
      const firstSheetName = workbook.SheetNames[0];
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
      }
      
      if (cellB3 && cellB3.v) {
        shopOrderValue = String(cellB3.v);
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
        // Extract data using more complex methods (implementation simplified for brevity)
        // This would search for order info in headers, etc.
      }
    } catch (error) {
      console.error('Error extracting order info:', error);
    }
  };
  
  const processExcelFiles = (files: FileList) => {
    setErrorMessage(''); // Clear any previous error messages
    
    // If there are no files, exit early
    if (files.length === 0) {
      setErrorMessage('No files selected for upload');
      return;
    }
    
    try {
      const newDatasets: ExcelData[] = [];
      
      const processNextFile = (index: number) => {
        if (index >= files.length) {
          // All files processed
          if (newDatasets.length === 0) {
            setErrorMessage('No valid data could be extracted from the uploaded files.');
            return;
          }
          setExcelDataSets(newDatasets);
          createMergedData(newDatasets);
          return;
        }
        
        const file = files[index];
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            if (!e.target?.result) {
              setErrorMessage(`Error reading file ${file.name}. No data found.`);
              processNextFile(index + 1);
              return;
            }
            
            const data = new Uint8Array(e.target.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
              setErrorMessage(`Error processing file ${file.name}. No worksheets found.`);
              processNextFile(index + 1);
              return;
            }
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            if (!worksheet) {
              setErrorMessage(`Error processing file ${file.name}. Worksheet is empty.`);
              processNextFile(index + 1);
              return;
            }
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
            
            // If this is the first file, try to extract order info
            if (index === 0) {
              // First try specific cells extraction (A2 and B2)
              const cellValues = extractSpecificCells(workbook);
              
              // Then use general extraction if cells were empty
              if (!orderNo || !shopOrderNote) {
                extractOrderInfo(jsonData, workbook);
                
                // If we couldn't find values, use defaults
                if (!orderNo) {
                  setOrderNo(file.name.replace(/\.[^/.]+$/, ""));
                }
                
                if (!shopOrderNote) {
                  // Set defaults for shop order note
                }
              }
            }
              // Process data and remove only the "cutting" or "cutting-s" text
            const newRows = jsonData.map((row, rowIndex) => {
              // Priority logic: Panel No first, then Note Text as fallback if Panel No is empty
              let panelNo = '';
              if (row['Panel No'] && String(row['Panel No']).trim() !== '') {
                panelNo = row['Panel No'];
              } else {
                panelNo = row['Note Text'] || row['Cutting'] || row[Object.keys(row)[0]] || '';
              }
              let material = row['Description'] || row['Material'] || row[Object.keys(row)[1]] || '';
              
              // Convert to strings
              panelNo = String(panelNo);
              material = String(material);
              
              // Remove "cutting" prefixes
              if (typeof panelNo === 'string') {
                const lowerPanelNo = panelNo.toLowerCase();
                if (lowerPanelNo.startsWith('cutting-s')) {
                  panelNo = panelNo.substring(9).trim();
                } else if (lowerPanelNo.startsWith('cutting')) {
                  panelNo = panelNo.substring(7).trim();
                }
              }
              
              if (typeof material === 'string') {
                const lowerMaterial = material.toLowerCase();
                if (lowerMaterial.startsWith('cutting-s')) {
                  material = material.substring(9).trim();
                } else if (lowerMaterial.startsWith('cutting')) {
                  material = material.substring(7).trim();
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
              if (filterKeywords.length === 0) return true;
              
              const lowerMaterial = row.material.toLowerCase();
              return !filterKeywords.some(keyword => 
                lowerMaterial.includes(keyword.toLowerCase())
              );
            });
            
            // Create a new Excel data set with filtered rows
            const { cellA2Value, cellB2Value } = extractSpecificCells(workbook);
            
            const newExcelData: ExcelData = {
              id: `excel-${Date.now()}-${index}`,
              rows: filteredRows,
              panelHeading: 'Panel No',
              materialHeading: 'Material',
              cellA2Value: cellA2Value || '',
              cellB2Value: cellB2Value || ''
            };
            
            newDatasets.push(newExcelData);
            
            // Process next file
            processNextFile(index + 1);
          } catch (error) {
            console.error(`Error processing Excel file ${file.name}:`, error);
            setErrorMessage(`Error processing Excel file ${file.name}. Please make sure it has the correct format.`);
            processNextFile(index + 1);
          }
        };
        
        reader.onerror = (error) => {
          setErrorMessage(`Error reading file ${file.name}.`);
          processNextFile(index + 1);
        };
        
        reader.readAsArrayBuffer(file);
      };
      
      // Start processing the first file
      processNextFile(0);
      
    } catch (error) {
      setErrorMessage('An unexpected error occurred during file processing. Please try again.');
    }  };

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
      mergedWebbingData,
      highlightedCells // Pass the highlighted cells to the export function
    );
  };

  // Drag and drop handlers with GSAP animations
  const handleDragStart = (datasetIndex: number, rowIndex: number) => {
    setDraggedPair({ datasetIndex, rowIndex });
    setIsDragging(true);
    
    // Get the source row for ghost preview
    const sourceKey = `row-${datasetIndex}-${rowIndex}`;
    const sourceRow = rowRefs.current[sourceKey];
    
    if (sourceRow && ghostRef.current) {
      // Clone the row for the ghost preview
      const clone = sourceRow.cloneNode(true) as HTMLElement;
      
      // Style the ghost element
      ghostRef.current.innerHTML = '';
      ghostRef.current.appendChild(clone);
      ghostRef.current.style.display = 'block';
      ghostRef.current.style.position = 'fixed';
      ghostRef.current.style.zIndex = '1000';
      ghostRef.current.style.pointerEvents = 'none';
      ghostRef.current.style.width = `${sourceRow.offsetWidth}px`;
      ghostRef.current.style.opacity = '0.8';
      ghostRef.current.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
      ghostRef.current.style.background = '#fff';
      
      // Initial GSAP setup - ready for movement
      gsap.set(ghostRef.current, {
        x: 0,
        y: 0,
        scale: 0.95,
        rotation: 0
      });
      
      // Slight "pickup" animation
      gsap.to(ghostRef.current, {
        duration: 0.2,
        scale: 1,
        boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
        ease: "back.out(1.5)"
      });
      
      // Highlight the source row
      gsap.to(sourceRow, {
        duration: 0.2,
        background: 'rgba(59, 130, 246, 0.1)',
        boxShadow: 'inset 0 0 0 2px rgba(59, 130, 246, 0.4)'
      });
    }
    
    // Add drag effect to cursor
    document.body.style.cursor = 'grabbing';
  };
  
  const handleDragOver = (e: React.DragEvent, datasetIndex: number, rowIndex: number) => {
    e.preventDefault(); // Necessary to allow dropping
    
    if (!isDragging || !draggedPair) return;
    
    setDropTarget({ datasetIndex, rowIndex });
    
    // Only update ghost position if we have a ghost and we're not trying to place it at its original position
    if (ghostRef.current && (datasetIndex !== draggedPair.datasetIndex || rowIndex !== draggedPair.rowIndex)) {
      // Get the target row element
      const targetKey = `row-${datasetIndex}-${rowIndex}`;
      const targetRow = rowRefs.current[targetKey];
      
      if (targetRow) {
        // Calculate position differences
        const rect = targetRow.getBoundingClientRect();
        const mouseY = rect.top + rect.height / 2;
        
        // Update ghost position smoothly
        gsap.to(ghostRef.current, {
          duration: 0.15,
          y: mouseY - window.innerHeight / 2 + window.scrollY,
          ease: "power2.out"
        });
        
        // Highlight the target row
        gsap.to(targetRow, {
          duration: 0.2,
          background: 'rgba(59, 130, 246, 0.1)',
          boxShadow: 'inset 0 0 0 2px rgba(59, 130, 246, 0.8)',
          ease: "power1.out"
        });
        
        // Reset highlight on other rows
        Object.keys(rowRefs.current).forEach(key => {
          if (key !== targetKey && key !== `row-${draggedPair.datasetIndex}-${draggedPair.rowIndex}`) {
            const row = rowRefs.current[key];
            gsap.to(row, {
              duration: 0.3,
              background: 'transparent',
              boxShadow: 'none',
              ease: "power1.out"
            });
          }
        });
      }
    }
  };
  
  const handleDragEnd = () => {
    if (!isDragging || !draggedPair || !dropTarget) {
      resetDragState();
      return;
    }
    
    // If source and target are different, perform the swap
    if (draggedPair.datasetIndex !== dropTarget.datasetIndex || draggedPair.rowIndex !== dropTarget.rowIndex) {
      // Make a copy of the datasets
      const updatedDatasets = [...excelDataSets];
      
      // Get source and target dataset/row
      const sourceDataset = updatedDatasets[draggedPair.datasetIndex];
      const targetDataset = updatedDatasets[dropTarget.datasetIndex];
      
      // Only proceed if both source and target datasets exist and have the needed rows
      if (sourceDataset && targetDataset && 
          draggedPair.rowIndex < sourceDataset.rows.length &&
          dropTarget.rowIndex < targetDataset.rows.length) {
        
        // Swap rows with animation
        const sourceKey = `row-${draggedPair.datasetIndex}-${draggedPair.rowIndex}`;
        const targetKey = `row-${dropTarget.datasetIndex}-${dropTarget.rowIndex}`;
        
        // Get row elements
        const sourceRow = rowRefs.current[sourceKey];
        const targetRow = rowRefs.current[targetKey];
        
        if (sourceRow && targetRow) {
          // Animation: swap rows visually
          const sourceRect = sourceRow.getBoundingClientRect();
          const targetRect = targetRow.getBoundingClientRect();
          
          // Calculate Y distances for animation
          const sourceToTargetY = targetRect.top - sourceRect.top;
          const targetToSourceY = sourceRect.top - targetRect.top;
          
          // Animate swap with GSAP
          gsap.to(sourceRow, {
            duration: 0.4,
            y: sourceToTargetY,
            ease: "power3.inOut",
            onComplete: () => {
              // Get the actual row data
              const tempRow = sourceDataset.rows[draggedPair.rowIndex];
              
              // Update data (actual swap)
              sourceDataset.rows[draggedPair.rowIndex] = targetDataset.rows[dropTarget.rowIndex];
              targetDataset.rows[dropTarget.rowIndex] = tempRow;
              
              // Update state with the swapped datasets
              setExcelDataSets(updatedDatasets);
              
              // Regenerate merged data with updated order
              createMergedData(updatedDatasets);
              
              // Reset all animations and positions
              gsap.to([sourceRow, targetRow], {
                duration: 0,
                y: 0,
                background: 'transparent',
                boxShadow: 'none',
                clearProps: "all"
              });
              
              resetDragState();
            }
          });
          
          gsap.to(targetRow, {
            duration: 0.4,
            y: targetToSourceY,
            ease: "power3.inOut"
          });
        }
      }
    } else {
      resetDragState();
    }
  };
  
  // Helper to reset drag state
  const resetDragState = () => {
    // Hide ghost element
    if (ghostRef.current) {
      gsap.to(ghostRef.current, {
        duration: 0.2,
        opacity: 0,
        scale: 0.9,
        onComplete: () => {
          if (ghostRef.current) {
            ghostRef.current.style.display = 'none';
            ghostRef.current.innerHTML = '';
          }
        }
      });
    }
    
    // Reset all row styles
    Object.values(rowRefs.current).forEach(row => {
      gsap.to(row, {
        duration: 0.3,
        background: 'transparent',
        boxShadow: 'none',
        ease: "power1.out"
      });
    });
    
    // Reset drag states
    setIsDragging(false);
    setDraggedPair(null);
    setDropTarget(null);
      // Reset cursor
    document.body.style.cursor = 'default';
  };

  // Cell highlighting handlers
  const handleCellClick = (datasetIdx: number, rowIdx: number, cellType: 'panel' | 'material') => {
    const cellKey = `${cellType}-${datasetIdx}-${rowIdx}`;
    const updatedHighlighted = new Set(highlightedCells);
    
    if (updatedHighlighted.has(cellKey)) {
      updatedHighlighted.delete(cellKey);
    } else {
      updatedHighlighted.add(cellKey);
    }
    
    setHighlightedCells(updatedHighlighted);
  };

  const clearHighlights = () => {
    setHighlightedCells(new Set());
  };

  const getCellClassName = (datasetIdx: number, rowIdx: number, cellType: 'panel' | 'material', baseClassName: string) => {
    const cellKey = `${cellType}-${datasetIdx}-${rowIdx}`;
    const isHighlighted = highlightedCells.has(cellKey);
    return `${baseClassName} ${isHighlighted ? 'highlighted-cell' : ''}`;
  };
  
  return (
    <div className="order-list-container">
      {/* Ghost element for drag preview */}
      <div 
        ref={ghostRef} 
        className="drag-ghost-element" 
        style={{ display: 'none', position: 'fixed' }}
      ></div>
      
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Direct upload only */}
        <label className="flex items-center justify-center bg-blue-50 text-blue-700 p-2 rounded-md cursor-pointer hover:bg-blue-100 transition-colors">
          <Upload size={20} className="mr-2" />
          <span>Upload Multiple Excel Files</span>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleDirectUpload}
            className="hidden"
            multiple
          />
        </label>
        
        {/* Panel No Hide Toggle - Enhanced with GSAP */}
        <button
          onClick={() => {
            const newState = !hidePanelColumns;
            setHidePanelColumns(newState);
            
            // GSAP animation for the toggle button
            const toggleCircle = document.querySelector('.toggle-circle');
            const toggleTrack = document.querySelector('.toggle-track');
            const toggleButton = document.querySelector('.toggle-button');
            
            if (toggleCircle && toggleTrack && toggleButton) {
              // Animate the circle position
              gsap.to(toggleCircle, {
                duration: 0.3,
                x: newState ? 16 : 0,
                ease: "power2.out"
              });
              
              // Animate the track color
              gsap.to(toggleTrack, {
                duration: 0.4,
                backgroundColor: newState ? '#3B82F6' : '#D1D5DB',
                ease: "power1.inOut"
              });
              
              // Add a slight bounce effect to the button
              gsap.fromTo(toggleButton, 
                { scale: 0.95 },
                { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.3)" }
              );
            }
          }}
          className={`toggle-button flex items-center px-3 py-2 text-sm rounded-md transition-colors ${hidePanelColumns ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
          title={hidePanelColumns ? "Show All Panel Columns" : "Hide Panel Columns (Keep First)"}
        >
          <span className="mr-2">{hidePanelColumns ? "Show All Panels" : "Hide Panel Columns"}</span>
          <div className={`toggle-track w-8 h-4 rounded-full flex items-center ${hidePanelColumns ? 'bg-blue-400' : 'bg-gray-300'}`}>
            <div className={`toggle-circle w-3 h-3 rounded-full bg-white absolute`} style={{ transform: hidePanelColumns ? 'translateX(16px)' : 'translateX(4px)' }}></div>
          </div>
        </button>
        
        <div className="ml-auto flex gap-2">
          {/* Save Project button */}
          <button
            onClick={handleSaveProject}
            disabled={isSaving || !orderNo || excelDataSets.length === 0}
            className="flex items-center justify-center bg-green-500 text-white p-2 rounded-md disabled:opacity-50 hover:bg-green-600 transition-colors"
            title="Save this project to Saved Projects"
          >
            <Save size={20} className="mr-2" />
            <span>{isSaving ? 'Saving...' : 'Save Project'}</span>
          </button>          {/* Export to PDF button */}
          <button
            onClick={handleExportPDF}
            disabled={mergedData.length === 0}
            className="flex items-center justify-center bg-purple-500 text-white p-2 rounded-md disabled:opacity-50 hover:bg-purple-600 transition-colors"
          >
            <FileText size={20} className="mr-2" />
            <span>PDF (A4)</span>
          </button>
          
          {/* Clear Highlights button - only visible when there are highlighted cells */}
          {highlightedCells.size > 0 && (
            <button
              onClick={clearHighlights}
              className="flex items-center justify-center bg-amber-500 text-white p-2 rounded-md hover:bg-amber-600 transition-colors"
              title="Clear all highlighted cells"
            >
              <span>Clear Highlights ({highlightedCells.size})</span>
            </button>
          )}
        </div>
      </div>
      
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p className="font-semibold">Error:</p>
          <p>{errorMessage}</p>
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          <p className="font-semibold">{successMessage}</p>
        </div>
      )}
      
      <div className="mt-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          {/* B2 value (order details) left-aligned */}
          {excelDataSets.length > 0 && excelDataSets[0].cellB2Value && (
            <div
              className="mb-4"
              style={{
                fontSize: '1.1em',
                textAlign: 'left',
                marginLeft: 0,
                whiteSpace: 'pre-line',
                wordBreak: 'break-word',
                fontWeight: 500,
                color: '#1e293b',
                flex: 1
              }}
            >
              {excelDataSets[0].cellB2Value}
            </div>
          )}
          {/* A2 value (Order No) in a small box, right-aligned, no text area limit */}
          {excelDataSets.length > 0 && excelDataSets[0].cellA2Value && (
            <div
              className="mb-4"
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '8px 16px',
                marginLeft: 24,
                color: '#334155',
                fontWeight: 600,
                fontSize: '1em',
                textAlign: 'center',
                whiteSpace: 'pre-line',
                wordBreak: 'break-word',
                alignSelf: 'flex-start',
                boxShadow: '0 1px 4px 0 rgba(0,0,0,0.04)'
              }}
              title="Order No (A2 cell)"
            >
              {excelDataSets[0].cellA2Value}
            </div>          )}
        </div>
        
        {/* Responsive Layout Container for Images and Tables */}
        <div className="main-content-layout">
          {/* Image Gallery Area */}
          {projectId && images.length > 0 && (
            <div className="image-gallery-area">
              <ImageGallery projectId={projectId} initialImages={images} onImagesChange={setImages} />
            </div>
          )}
          
          {/* Table Area */}
          <div className="table-area">
            {excelDataSets.length > 0 ? (
          <>
            <div className="overflow-x-auto clear-both">
              <table ref={tableRef} className="w-full table-auto border-collapse">
                <thead>
                  <tr>
                    {excelDataSets.map((dataset, datasetIdx) => (
                      <React.Fragment key={dataset.id}>
                        <th 
                          className={`border p-2 bg-gray-100 ${hidePanelColumns && datasetIdx > 0 ? 'hidden' : ''}`}
                          contentEditable={true}
                          suppressContentEditableWarning={true}
                          onBlur={(e) => handleHeaderEdit(datasetIdx, true, e.currentTarget.textContent || 'Panel No')}
                          style={{ minWidth: '120px' }}
                        >
                          {dataset.panelHeading}
                        </th>
                        <th 
                          className="border p-2 bg-gray-100"
                          contentEditable={true}
                          suppressContentEditableWarning={true}
                          onBlur={(e) => handleHeaderEdit(datasetIdx, false, e.currentTarget.textContent || 'Material')}
                          style={{ minWidth: '120px' }}
                        >
                          {dataset.materialHeading}
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(...excelDataSets.map(ds => ds.rows.length), 0) }).map((_, rowIdx) => (
                    <tr 
                      key={rowIdx}
                      ref={(el) => {
                        // Store refs to rows for animations
                        excelDataSets.forEach((dataset, datasetIdx) => {
                          if (rowIdx < dataset.rows.length) {
                            const key = `row-${datasetIdx}-${rowIdx}`;
                            if (el) rowRefs.current[key] = el;
                          }
                        });
                      }}
                      draggable={true}
                      onDragStart={() => {
                        // Find the first dataset that has this row
                        const datasetIndex = excelDataSets.findIndex(ds => rowIdx < ds.rows.length);
                        if (datasetIndex !== -1) {
                          handleDragStart(datasetIndex, rowIdx);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        const datasetIndex = excelDataSets.findIndex(ds => rowIdx < ds.rows.length);
                        if (datasetIndex !== -1) {
                          handleDragOver(e, datasetIndex, rowIdx);
                        }
                      }}
                      onDragEnd={handleDragEnd}
                      className="hover:bg-blue-50 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      {excelDataSets.map((dataset, datasetIdx) => (
                        <React.Fragment key={`${dataset.id}-${rowIdx}`}>
                          {rowIdx < dataset.rows.length ? (                            <>
                              <td 
                                className={getCellClassName(datasetIdx, rowIdx, 'panel', `border p-2 cursor-pointer ${hidePanelColumns && datasetIdx > 0 ? 'hidden' : ''}`)}
                                onClick={() => handleCellClick(datasetIdx, rowIdx, 'panel')}
                                title="Click to highlight"
                              >
                                {dataset.rows[rowIdx].panelNo}
                              </td>
                              <td 
                                className={getCellClassName(datasetIdx, rowIdx, 'material', 'border p-2 cursor-pointer')}
                                onClick={() => handleCellClick(datasetIdx, rowIdx, 'material')}
                                title="Click to highlight"
                              >
                                {dataset.rows[rowIdx].material}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className={`border p-2 ${hidePanelColumns && datasetIdx > 0 ? 'hidden' : ''}`}></td>
                              <td className="border p-2"></td>
                            </>
                          )}
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Webbing Details Table - Simplified with only two columns */}
            {mergedWebbingData && mergedWebbingData.length > 1 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Webbing Details</h2>
                <div className="overflow-x-auto clear-both">
                  <table className="w-full table-auto border-collapse" style={{ maxWidth: '600px' }}>
                    <thead>
                      <tr>
                        <th 
                          className="border p-2 bg-gray-100"
                          style={{ minWidth: '120px' }}
                        >
                          {mergedWebbingData[0][0] || 'Panel No'}
                        </th>
                        <th 
                          className="border p-2 bg-gray-100"
                          style={{ minWidth: '240px' }}
                        >
                          {mergedWebbingData[0][1] || 'Material'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mergedWebbingData.slice(1).map((row, rowIdx) => (
                        <tr key={`webbing-${rowIdx}`}>
                          <td className="border p-2">{row[0]}</td>
                          <td className="border p-2">{row[1]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-500">Please upload Excel files to see the merged data preview</p>        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderList;
