import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash, RefreshCw, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import { projectService, Project } from '../lib/supabase';

const SavedProjects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]); // Store all projects for filtering
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    loadProjects();
  }, []);
  
  // Real-time search effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setProjects(allProjects);
    } else {
      const filtered = allProjects.filter(p => 
        p.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.shop_order_note.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setProjects(filtered);
    }
  }, [searchTerm, allProjects]);
  
  const loadProjects = async () => {
    setLoading(true);
    try {
      const projectsList = await projectService.getProjects();
      setAllProjects(projectsList);
      setProjects(projectsList);
    } catch (error) {
      console.error('Error loading projects:', error);
      setMessage('Error loading projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = async () => {
    // This function is now mainly for the search button click
    // Real-time search is handled by the useEffect above
    if (!searchTerm.trim()) {
      setProjects(allProjects);
      return;
    }
    
    // Optional: You can implement server-side search here for better performance
    // with large datasets
    setLoading(true);
    try {
      const results = await projectService.searchProjectsByOrderNo(searchTerm);
      setProjects(results);
    } catch (error) {
      console.error('Error searching projects:', error);
      setMessage('Error searching projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        const success = await projectService.deleteProject(projectId);
        if (success) {
          // Update both state arrays
          setAllProjects(prev => prev.filter(p => p.id !== projectId));
          setProjects(prev => prev.filter(p => p.id !== projectId));
          setMessage('Project deleted successfully');
          setTimeout(() => setMessage(''), 3000);
        } else {
          setMessage('Failed to delete project');
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        setMessage('Error deleting project. Please try again.');
      }
    }
  };
  
  const navigate = useNavigate();
  
  const handleLoadProject = (projectId: string) => {
    // Redirect to main page with project ID
    navigate(`/?projectId=${projectId}`);
  };
  
  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white rounded-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Saved Projects</h1>
          <motion.button 
            onClick={loadProjects} 
            className="flex items-center px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            title="Refresh projects"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={18} className="mr-2" />
            <span>Refresh</span>
          </motion.button>
        </div>
      
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex">
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by Order No or Shop Order Note..."
            className="flex-1 px-4 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-purple-500 border-gray-300"
          />
          {searchTerm && (
            <motion.button
              onClick={() => setSearchTerm('')}
              className="bg-gray-500 text-white px-3 py-2 hover:bg-gray-600 transition-colors border-l border-gray-400"
              title="Clear search"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ×
            </motion.button>
          )}
          <motion.button
            onClick={handleSearch}
            className="bg-purple-600 text-white px-4 py-2 rounded-r hover:bg-purple-700 transition-colors"
            title="Search projects"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Search size={20} />
          </motion.button>
        </div>
      </motion.div>
      
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-3 mb-4 rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
      
      {loading ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <p className="text-gray-500">Loading projects...</p>
        </motion.div>
      ) : projects.length > 0 ? (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {projects.map((project: Project, index: number) => (
            <motion.div 
              key={project.id} 
              className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              onClick={() => handleLoadProject(project.id!)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-800 mb-1">{project.order_no}</h3>
                  {project.shop_order_note && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {project.shop_order_note}
                    </p>
                  )}
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span>
                      {project.excel_data && Array.isArray(project.excel_data) && project.excel_data.length > 0 
                        ? `${project.excel_data.reduce((total: number, dataset: any) => total + (dataset.rows?.length || 0), 0)} items`
                        : 'No data'
                      }
                    </span>
                    {project.created_at && (
                      <span>
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the card click
                    handleDeleteProject(project.id!);
                  }}
                  className="text-red-500 hover:text-red-700 ml-3 p-1 rounded hover:bg-red-50"
                  title="Delete project"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash size={18} />
                </motion.button>
              </div>
              
              {/* Project preview indicator */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Click to load project</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div 
          className="text-center py-8 border rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-gray-500">
            {searchTerm ? `No projects found matching "${searchTerm}"` : 'No projects found'}
          </p>
          {searchTerm && (
            <motion.button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-purple-600 hover:text-purple-800 hover:underline"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear search and show all projects
            </motion.button>
          )}
        </motion.div>
      )}
      </motion.div>
    </Layout>
  );
};

export default SavedProjects;
