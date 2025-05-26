import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Settings } from 'lucide-react';

type NavItemProps = {
  icon: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  tooltip?: string;
};

const NavItem: React.FC<NavItemProps> = ({ icon, isActive, onClick, tooltip }) => {
  return (
    <button
      className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
        isActive ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-100'
      }`}
      onClick={onClick}
      title={tooltip}
    >
      {icon}
    </button>
  );
};

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const goToSavedProjects = () => {
    navigate('/saved-projects');
  };
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <div className="w-20 h-screen bg-white border-r border-gray-200 flex flex-col items-center py-6 fixed left-0 top-0">
      <div className="mb-8">
        <button 
          onClick={() => window.location.reload()}
          className="w-12 h-12 flex items-center justify-center rounded-xl overflow-hidden bg-white hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          title="Refresh Page"
        >
          <img src="/aqua-logo.png" alt="WS Builder" className="w-full h-full object-contain" />
        </button>
      </div>
      
      <nav className="flex-1 flex flex-col items-center space-y-4">
        <NavItem 
          icon={<Home size={24} />} 
          isActive={isActive('/')}
          onClick={() => navigate('/')}
          tooltip="Home"
        />
        <NavItem 
          icon={<FolderOpen size={24} />} 
          isActive={isActive('/saved-projects')}
          onClick={goToSavedProjects}
          tooltip="Saved Projects"
        />
        <NavItem 
          icon={<Settings size={24} />} 
          isActive={isActive('/settings')}
          onClick={() => navigate('/settings')}
          tooltip="Settings"
        />
      </nav>
      
      <div className="mt-auto"></div>
    </div>
  );
};

export default Sidebar;