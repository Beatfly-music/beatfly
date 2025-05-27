// MainLayout.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import Player from './Player/index';

// Create contexts for sidebar and responsive state
export const SidebarContext = createContext(null);
export const ResponsiveContext = createContext(null);

// Hook for accessing sidebar state
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

// Hook for accessing responsive state
export const useResponsive = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsive must be used within a ResponsiveProvider');
  }
  return context;
};

const MainLayout = () => {
  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile on mount and resize
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    // Initial check
    checkIfMobile();

    // Add resize listener
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  return (
    <ResponsiveContext.Provider value={{ isMobile }}>
      <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
        <div className="flex flex-col h-screen bg-background">
          {/* Only show TitleBar on desktop */}
          {!isMobile && <TitleBar />}

          {/* Main content wrapper */}
          <div className="flex flex-1 overflow-hidden">
            {/* Main content area with conditional margin for desktop */}
            <motion.main
              initial={false}
              animate={{
                marginLeft: isMobile ? 0 : (isCollapsed ? '5rem' : '16rem')
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className={`flex-1 overflow-y-auto ${isMobile ? 'pb-32' : 'pb-24'}`}
            >
              <Outlet />
            </motion.main>
          </div>

          {/* Player & Sidebar */}
          <Player />
          <Sidebar />
        </div>
      </SidebarContext.Provider>
    </ResponsiveContext.Provider>
  );
};

export default MainLayout;
