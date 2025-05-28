import { useEffect, Dispatch, SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import { projectService } from '../../lib/supabase';

/**
 * Custom hook to load a project by projectId from the URL and populate state setters.
 * @param setExcelDataSets Setter for excelDataSets
 * @param setOrderNo Setter for orderNo
 * @param setShopOrderNote Setter for shopOrderNote
 * @param setHidePanelColumns Setter for hidePanelColumns toggle state
 * @param createMergedData Function to create merged data after loading project
 * @param setImages Setter for images array (optional)
 * @param setHighlightedCells Setter for highlighted cells (optional)
 */
export function useProjectLoader({ 
  setExcelDataSets, 
  setOrderNo, 
  setShopOrderNote, 
  setHidePanelColumns,
  createMergedData,
  setImages,
  setHighlightedCells
}: { 
  setExcelDataSets: Dispatch<SetStateAction<any[]>>, 
  setOrderNo: Dispatch<SetStateAction<string>>, 
  setShopOrderNote: Dispatch<SetStateAction<string>>,
  setHidePanelColumns: Dispatch<SetStateAction<boolean>>,
  createMergedData?: (datasets: any[]) => void,
  setImages?: Dispatch<SetStateAction<any[]>>,
  setHighlightedCells?: Dispatch<SetStateAction<Set<string>>>
}){
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (!projectId) return;    (async () => {
      const project = await projectService.getProject(projectId);
      if (project) {
        setOrderNo(project.order_no || '');
        setShopOrderNote(project.shop_order_note || '');
        const excelData = project.excel_data || [];
        setExcelDataSets(excelData);
          // Load images if setImages is provided
        if (setImages && project.images) {
          console.log('Loading', project.images.length, 'images for project');
          setImages(project.images);
        }
        
        // Load highlighted cells if setHighlightedCells is provided
        if (setHighlightedCells && project.highlighted_cells) {
          console.log('Loading', project.highlighted_cells.length, 'highlighted cells for project');
          setHighlightedCells(new Set(project.highlighted_cells));
        }
        
        // Call createMergedData if provided and there's excel data
        if (createMergedData && excelData.length > 0) {
          createMergedData(excelData);
        }
        
        // Set hide panel columns to true by default when loading a project
        setHidePanelColumns(true);
      }
    })();    // Only run when projectId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, createMergedData, setImages]);
}
