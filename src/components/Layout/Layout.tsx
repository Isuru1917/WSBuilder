import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

type LayoutProps = {
  children: React.ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-20">
        <Header />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;