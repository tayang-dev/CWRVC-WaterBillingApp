import React, { useState } from 'react';
import Sidebar from './Sidebar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State to manage sidebar collapse
  const [collapsed, setCollapsed] = useState(false);

  // Create a handler function that can be passed to the Sidebar
  const handleToggleSidebar = () => {
    setCollapsed(prevState => !prevState);
  };

  return (
    <div className="flex">
      {/* Pass collapsed state and toggle handler to Sidebar */}
      <Sidebar 
        collapsed={collapsed} 
        toggleSidebar={handleToggleSidebar} 
      />
      
      {/* Main content area adjusts based on sidebar state */}
      <main
        className={`flex-1 pt-0 transition-all duration-300 ${
          collapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;