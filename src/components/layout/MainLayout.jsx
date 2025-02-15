import React, { createContext, useContext, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import Player from './Player';

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
        <TitleBar />
        
        {/* Main content wrapper */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main content area */}
          <motion.main
            initial={false}
            animate={{
              marginLeft: isCollapsed ? '5rem' : '16rem'
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-1 overflow-y-auto pb-24" // Added padding bottom for player
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