import { createClient } from '@supabase/supabase-js';

// Import ImageItem type
import type { ImageItem } from '../components/OrderList/ImageGallery';

// Replace these with your actual Supabase URL and anon key
const supabaseUrl = 'https://otapyzpvhzvakigmvnvs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90YXB5enB2aHp2YWtpZ212bnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MjQ3MTYsImV4cCI6MjA2MjEwMDcxNn0.ZkEypUzuIuEsSz6by_aRwfKm8VhQ6e4JhjPvid9xmUo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Image data type for database storage
export type ImageData = {
  id?: string;
  project_id?: string;
  image_id: string;
  src: string;
  width: number;
  height: number;
  x: number;
  y: number;
  created_at?: string;
};

// Project type definition
export type Project = {
  id?: string;
  name: string;
  order_no: string;
  shop_order_note: string;
  created_at?: string;
  user_id?: string;
  excel_data?: ExcelDataset[]; // This contains the nested structure
  images?: ImageItem[]; // Image metadata for frontend use
};

// Excel data type as stored in the database
export type ExcelData = {
  id?: string;
  project_id?: string;
  panel_no: string;
  material: string;
};

// For in-memory Excel data with nested structure
export type ExcelDataset = {
  id: string;
  rows: {
    id: string;
    panelNo: string;
    material: string;
  }[];
};

// Keyword filter type definition
export type FilterKeyword = {
  id?: string;
  keyword: string;
  created_at?: string;
};

// Image storage helpers
export const imageStorageService = {
  // Upload an image file to Supabase Storage using signed URL and fetch
  uploadImage: async (file: File, projectId: string): Promise<string | null> => {
    console.log('imageStorageService.uploadImage called with:', { fileName: file.name, fileSize: file.size, projectId });
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${fileExt}`;
      console.log('Generated fileName:', fileName);

      // 1. Create a signed upload URL
      console.log('Step 1: Creating signed upload URL...');
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('project-images')
        .createSignedUploadUrl(fileName);

      if (signedUrlError) {
        console.error('Failed to get signed upload URL:', signedUrlError);
        throw new Error(`Signed URL error: ${signedUrlError.message}`);
      }
      
      if (!signedUrlData?.signedUrl) {
        console.error('No signed URL returned');
        throw new Error('No signed URL returned from Supabase');
      }
      
      console.log('Signed URL created successfully');

      // 2. Upload the file via fetch PUT
      console.log('Step 2: Uploading file...');
      const uploadRes = await fetch(signedUrlData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file
      });

      if (!uploadRes.ok) {
        const responseText = await uploadRes.text();
        console.error('Direct upload failed:', uploadRes.status, uploadRes.statusText, responseText);
        throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
      }
      
      console.log('Upload successful');

      // 3. Get the public URL for the uploaded file
      console.log('Step 3: Getting public URL...');
      const { data: urlData } = supabase.storage.from('project-images').getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl;
      
      if (!publicUrl) {
        console.error('Failed to get public URL');
        throw new Error('Failed to get public URL');
      }
      
      console.log('Public URL generated:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Exception in uploadImage:', error);
      return null;
    }
  },
  // Delete an image from Supabase Storage
  deleteImage: async (publicUrl: string): Promise<boolean> => {
    // Extract the path from the public URL
    const url = new URL(publicUrl);
    const path = url.pathname.split('/project-images/')[1];
    if (!path) return false;
    const { error } = await supabase.storage.from('project-images').remove([path]);
    if (error) {
      console.error('Image delete error:', error);
      return false;
    }
    return true;
  }
};

// Helper functions to convert between ImageItem (frontend) and ImageData (database)
export const imageHelpers = {
  // Convert ImageItem[] to ImageData[] for database storage
  toImageData: (images: ImageItem[], projectId: string): ImageData[] => {
    return images.map(img => ({
      project_id: projectId,
      image_id: img.id,
      src: img.src,
      width: img.width,
      height: img.height,
      x: img.x,
      y: img.y
    }));
  },

  // Convert ImageData[] to ImageItem[] for frontend use
  toImageItems: (imageData: ImageData[]): ImageItem[] => {
    return imageData.map(data => ({
      id: data.image_id,
      src: data.src,
      width: data.width,
      height: data.height,
      x: data.x,
      y: data.y
    }));
  }
};

// Project-related functions
export const projectService = {
  // Get all projects for the current user
  getProjects: async (): Promise<Project[]> => {
    try {
      // First get all projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        return [];
      }
      
      if (!projects || projects.length === 0) {
        return [];
      }
      
      // For each project, fetch its excel data
      const projectsWithData = await Promise.all(projects.map(async (project) => {
        const { data: excelData, error: excelError } = await supabase
          .from('excel_data')
          .select('*')
          .eq('project_id', project.id);
        
        if (excelError) {
          console.error(`Error fetching excel data for project ${project.id}:`, excelError);
          return project; // Return project without excel data
        }
        
        // Group excel data by panel_no to simulate the original structure
        const excelDatasets: ExcelDataset[] = [];
        
        if (excelData && excelData.length > 0) {
          // Create a single dataset with all rows
          const dataset: ExcelDataset = {
            id: `dataset-${Date.now()}`,
            rows: excelData.map(row => ({
              id: row.id || `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              panelNo: row.panel_no,
              material: row.material
            }))
          };
          
          excelDatasets.push(dataset);
        }
        
        return {
          ...project,
          excel_data: excelDatasets
        };
      }));
      
      return projectsWithData;
    } catch (error) {
      console.error('Exception in getProjects:', error);
      return [];
    }
  },

  // Search projects by Order No
  searchProjectsByOrderNo: async (orderNo: string): Promise<Project[]> => {
    try {
      // First search projects by order_no
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .ilike('order_no', `%${orderNo}%`)
        .order('created_at', { ascending: false });
      
      if (projectsError) {
        console.error('Error searching projects:', projectsError);
        return [];
      }
      
      if (!projects || projects.length === 0) {
        return [];
      }
      
      // Same logic as getProjects to fetch excel data for each project
      const projectsWithData = await Promise.all(projects.map(async (project) => {
        const { data: excelData, error: excelError } = await supabase
          .from('excel_data')
          .select('*')
          .eq('project_id', project.id);
        
        if (excelError) {
          console.error(`Error fetching excel data for project ${project.id}:`, excelError);
          return project;
        }
        
        const excelDatasets: ExcelDataset[] = [];
        
        if (excelData && excelData.length > 0) {
          const dataset: ExcelDataset = {
            id: `dataset-${Date.now()}`,
            rows: excelData.map(row => ({
              id: row.id || `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              panelNo: row.panel_no,
              material: row.material
            }))
          };
          
          excelDatasets.push(dataset);
        }
        
        return {
          ...project,
          excel_data: excelDatasets
        };
      }));
      
      return projectsWithData;
    } catch (error) {
      console.error('Exception in searchProjectsByOrderNo:', error);
      return [];
    }
  },

  // Find project by exact Order No match (for checking duplicates)
  findProjectByOrderNo: async (orderNo: string): Promise<Project | null> => {
    try {
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('order_no', orderNo)
        .limit(1);
      
      if (projectsError) {
        console.error('Error finding project by Order No:', projectsError);
        return null;
      }
      
      if (!projects || projects.length === 0) {
        return null;
      }
      
      const project = projects[0];
      
      // Fetch excel data for the project
      const { data: excelData, error: excelError } = await supabase
        .from('excel_data')
        .select('*')
        .eq('project_id', project.id);
      
      if (excelError) {
        console.error(`Error fetching excel data for project ${project.id}:`, excelError);
        return project;
      }
      
      const excelDatasets: ExcelDataset[] = [];
      
      if (excelData && excelData.length > 0) {
        const dataset: ExcelDataset = {
          id: `dataset-${Date.now()}`,
          rows: excelData.map(row => ({
            id: row.id || `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            panelNo: row.panel_no,
            material: row.material
          }))
        };
        
        excelDatasets.push(dataset);
      }
      
      return {
        ...project,
        excel_data: excelDatasets
      };
    } catch (error) {
      console.error('Exception in findProjectByOrderNo:', error);
      return null;
    }
  },

  // This function has been replaced by the enhanced version above
  
  // Save or update a project with excel data, handling duplicates by Order No
  saveProject: async (project: Project): Promise<Project | null> => {
    try {
      console.log('Saving project to Supabase with enhanced Order No handling');

      // Step 1: Check if a project with this Order No already exists
      const { data: existingProjects, error: searchError } = await supabase
        .from('projects')
        .select('*')
        .eq('order_no', project.order_no);

      if (searchError) {
        console.error('Error checking for existing project:', searchError);
        throw new Error(`Project search error: ${searchError.message}`);
      }

      // Step 2: Extract excel data and images, prepare project object
      const excelData = project.excel_data || [];
      const images = project.images || [];
      const projectToSave = {
        name: project.name,
        order_no: project.order_no,
        shop_order_note: project.shop_order_note,
        excel_data: excelData // This will be stored as JSON in the jsonb column
      };

      let savedProject;

      if (existingProjects && existingProjects.length > 0) {
        // Update existing project
        const existingProject = existingProjects[0];
        console.log(`Updating existing project with Order No: ${project.order_no}`);
        
        const { data: updatedProject, error: updateError } = await supabase
          .from('projects')
          .update(projectToSave)
          .eq('id', existingProject.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating project:', updateError);
          throw new Error(`Project update error: ${updateError.message}`);
        }

        savedProject = updatedProject;

        // Clear existing excel data for this project
        const { error: deleteExcelError } = await supabase
          .from('excel_data')
          .delete()
          .eq('project_id', existingProject.id);

        if (deleteExcelError) {
          console.warn('Error clearing existing excel data:', deleteExcelError);
        }

        // Clear existing image data for this project
        const { error: deleteImageError } = await supabase
          .from('project_images')
          .delete()
          .eq('project_id', existingProject.id);

        if (deleteImageError) {
          console.warn('Error clearing existing image data:', deleteImageError);
        }
      } else {
        // Create new project
        console.log(`Creating new project with Order No: ${project.order_no}`);
        
        const { data: newProject, error: insertError } = await supabase
          .from('projects')
          .insert(projectToSave)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating project:', insertError);
          throw new Error(`Project creation error: ${insertError.message}`);
        }

        savedProject = newProject;
      }

      if (!savedProject || !savedProject.id) {
        throw new Error('Failed to retrieve saved project ID');
      }

      console.log('Project saved successfully:', savedProject);

      // Step 3: Prepare excel data with project_id (legacy flat table for backward compatibility)
      if (excelData.length > 0) {
        // Flatten all excel datasets and rows into individual records
        const excelRecords = [];

        for (const dataset of excelData as ExcelDataset[]) {
          for (const row of dataset.rows) {
            excelRecords.push({
              project_id: savedProject.id,
              panel_no: row.panelNo,
              material: row.material
            });
          }
        }

        // Step 4: Save excel data to excel_data table (legacy)
        const { error: excelError } = await supabase
          .from('excel_data')
          .insert(excelRecords);

        if (excelError) {
          console.error('Error saving excel data:', excelError);
          // Even if excel data save fails, we return the project
          console.warn('Project was saved but excel data failed to save');
        }
      }

      // Step 5: Save image metadata to project_images table
      if (images.length > 0) {
        console.log('Saving image metadata for', images.length, 'images');
        
        // Convert ImageItem[] to ImageData[] format
        const imageRecords = imageHelpers.toImageData(images, savedProject.id);

        const { error: imageError } = await supabase
          .from('project_images')
          .insert(imageRecords);

        if (imageError) {
          console.error('Error saving image metadata:', imageError);
          console.warn('Project was saved but image metadata failed to save');
        } else {
          console.log('Image metadata saved successfully');
        }
      }

      return savedProject;
    } catch (error) {
      console.error('Exception in saveProject:', error);
      throw error; // Re-throw to allow component-level handling
    }
  },
  
  // Get a specific project by ID with its excel data
  getProject: async (id: string): Promise<Project | null> => {
    try {
      // Get the project first
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) {
        console.error('Error fetching project:', projectError);
        return null;
      }

      if (!project) {
        return null;
      }

      // If the project has a JSON excel_data field (original structure), use it directly
      if (project.excel_data && Array.isArray(project.excel_data) && project.excel_data.length > 0 && project.excel_data[0].rows) {
        // Load image metadata for projects with new structure
        const { data: imageData, error: imageError } = await supabase
          .from('project_images')
          .select('*')
          .eq('project_id', project.id);

        if (imageError) {
          console.error(`Error fetching image data for project ${project.id}:`, imageError);
        }

        const images = imageData ? imageHelpers.toImageItems(imageData) : [];

        return {
          ...project,
          images
        };
      }

      // Otherwise, reconstruct from excel_data table (legacy fallback)
      const { data: excelData, error: excelError } = await supabase
        .from('excel_data')
        .select('*')
        .eq('project_id', project.id);

      if (excelError) {
        console.error(`Error fetching excel data for project ${project.id}:`, excelError);
        return project; // Return project without excel data
      }

      // Convert to the format expected by the application (single dataset)
      const excelDatasets: ExcelDataset[] = [];

      if (excelData && excelData.length > 0) {
        const dataset: ExcelDataset = {
          id: `dataset-${Date.now()}`,
          rows: excelData.map(row => ({
            id: row.id || `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            panelNo: row.panel_no,
            material: row.material
          }))
        };
        excelDatasets.push(dataset);
      }

      // Load image metadata
      const { data: imageData, error: imageError } = await supabase
        .from('project_images')
        .select('*')
        .eq('project_id', project.id);

      if (imageError) {
        console.error(`Error fetching image data for project ${project.id}:`, imageError);
      }

      const images = imageData ? imageHelpers.toImageItems(imageData) : [];

      return {
        ...project,
        excel_data: excelDatasets,
        images
      };
    } catch (error) {
      console.error('Exception in getProject:', error);
      return null;
    }
  },
  
  // Delete a project and its related excel data
  deleteProject: async (id: string): Promise<boolean> => {
    try {
      console.log('Deleting project and related excel data for project ID:', id);
      
      // First delete related excel data
      const { error: excelDeleteError } = await supabase
        .from('excel_data')
        .delete()
        .eq('project_id', id);
      
      if (excelDeleteError) {
        console.error('Error deleting excel data:', excelDeleteError);
        // Continue attempting to delete the project even if excel data deletion fails
      }

      // Delete related image metadata
      const { error: imageDeleteError } = await supabase
        .from('project_images')
        .delete()
        .eq('project_id', id);
      
      if (imageDeleteError) {
        console.error('Error deleting image data:', imageDeleteError);
        // Continue attempting to delete the project even if image data deletion fails
      }
      
      // Then delete the project
      const { error: projectDeleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (projectDeleteError) {
        console.error('Error deleting project:', projectDeleteError);
        return false;
      }
      
      console.log('Project and related data deleted successfully');
      return true;
    } catch (error) {
      console.error('Exception in deleteProject:', error);
      return false;
    }
  },
};

// Filter keyword service
export const filterKeywordService = {
  // Get all filter keywords
  getKeywords: async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('filter_keywords')
        .select('keyword')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching filter keywords:', error);
        return [];
      }
      
      return data.map(item => item.keyword);
    } catch (error) {
      console.error('Error in getKeywords:', error);
      return [];
    }
  },
  
  // Add a new filter keyword
  addKeyword: async (keyword: string): Promise<boolean> => {
    let localKeywords = [];
    
    try {
      // Always update the local storage first as fallback
      const storedKeywords = localStorage.getItem('filterKeywords');
      if (storedKeywords) {
        localKeywords = JSON.parse(storedKeywords);
        if (!localKeywords.includes(keyword)) {
          localKeywords.push(keyword);
          localStorage.setItem('filterKeywords', JSON.stringify(localKeywords));
        }
      } else {
        localStorage.setItem('filterKeywords', JSON.stringify([keyword]));
      }
      
      // Try to add to database, but don't worry if it fails since we have localStorage
      try {
        // Check if keyword already exists to prevent duplicates
        const { data: existingData, error: existingError } = await supabase
          .from('filter_keywords')
          .select('id')
          .eq('keyword', keyword)
          .limit(1);
        
        if (!existingError && (!existingData || existingData.length === 0)) {
          // Keyword doesn't exist, so add it
          const { error } = await supabase
            .from('filter_keywords')
            .insert([{ keyword }]);
          
          if (error) {
            console.error('Error adding filter keyword to database:', error);
            console.log('Using localStorage for keyword storage instead.');
          }
        }
      } catch (dbError) {
        console.error('Database error in addKeyword:', dbError);
        console.log('Using localStorage for keyword storage instead.');
      }
      
      // Always return true since we saved to localStorage
      return true;
    } catch (error) {
      console.error('Error in addKeyword:', error);
      return true; // Still return true since we attempted to save to localStorage
    }
  },
  
  // Remove a filter keyword
  removeKeyword: async (keyword: string): Promise<boolean> => {
    try {
      // First update localStorage
      const storedKeywords = localStorage.getItem('filterKeywords');
      if (storedKeywords) {
        const localKeywords = JSON.parse(storedKeywords);
        const updatedKeywords = localKeywords.filter((k: string) => k !== keyword);
        localStorage.setItem('filterKeywords', JSON.stringify(updatedKeywords));
      }
      
      // Then try to remove from the database
      try {
        const { error } = await supabase
          .from('filter_keywords')
          .delete()
          .eq('keyword', keyword);
        
        if (error) {
          console.error('Error removing filter keyword from database:', error);
          console.log('Using localStorage for keyword storage instead.');
        }
      } catch (dbError) {
        console.error('Database error in removeKeyword:', dbError);
        console.log('Using localStorage for keyword storage instead.');
      }
      
      // Always return true since we updated localStorage
      return true;
    } catch (error) {
      console.error('Error in removeKeyword:', error);
      // Still attempt to update localStorage if possible
      try {
        const storedKeywords = localStorage.getItem('filterKeywords');
        if (storedKeywords) {
          const localKeywords = JSON.parse(storedKeywords);
          const updatedKeywords = localKeywords.filter((k: string) => k !== keyword);
          localStorage.setItem('filterKeywords', JSON.stringify(updatedKeywords));
        }
      } catch (e) {
        console.error('Error updating localStorage:', e);
      }
      
      return true;
    }
  }
};
