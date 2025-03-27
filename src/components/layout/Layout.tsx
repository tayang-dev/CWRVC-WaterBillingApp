import React from 'react';
import Sidebar from './Sidebar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-72 pt-0 transition-all duration-300">
        {children}
      </main>
    </div>
  );
};

export default Layout;