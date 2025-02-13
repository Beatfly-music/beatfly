import React, { createContext, useContext, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import Player from './Player';

// Create context for sidebar state
export const SidebarContext = createContext(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

const MainLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="flex flex-col h-screen bg-background">
        {/* Title bar */}
        <TitleBar />

        {/* Main content wrapper */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - will now use the shared context */}
          <Sidebar />

          {/* Main content area - dynamically adjusts margin based on sidebar state */}
          <motion.main
            initial={false}
            animate={{
              marginLeft: isCollapsed ? '5rem' : '16rem'
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-1 overflow-y-auto mb-24"
          >
            <Outlet />
          </motion.main>
        </div>

        {/* Player */}
        <Player />
      </div>
    </SidebarContext.Provider>
  );
};

export default MainLayout;  