import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { getUsernameFromSystem } from '../../api/userApi';

const Header: React.FC = () => {
  const [username, setUsername] = useState('User');

  useEffect(() => {
    const loadUsername = async () => {
      try {
        // Get username using our API utility
        const detectedUsername = await getUsernameFromSystem();
        setUsername(detectedUsername);
      } catch (error) {
        console.error('Failed to get username:', error);
      }
    };
    
    loadUsername();
  }, []);

  return (
    <header className="bg-white h-20 flex items-center justify-between px-8 border-b border-gray-200">
      <h1 className="text-2xl font-semibold">Hello {username} 👋</h1>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="search"
          placeholder="Search"
          className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>
    </header>
  );
};

export default Header;