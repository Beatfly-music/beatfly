import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from './MainLayout';
import {
  Home, Search, Library, PlusSquare,
  Heart, Clock, Music, ChevronLeft,
  ChevronRight, Plus, Settings, Mic
} from 'lucide-react';
import MusicAPI from '../../services/api'

const Sidebar = () => {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [playlists, setPlaylists] = useState([]);
  const [playlistsExpanded, setPlaylistsExpanded] = useState(true);
  const [isArtist, setIsArtist] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetchPlaylists();
    checkArtistStatus();
    const interval = setInterval(fetchPlaylists, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkArtistStatus = async () => {
    try {
      const userProfile = await MusicAPI.getUserProfile();
      const artistProfile = await MusicAPI.getArtistProfile(userProfile.data.id);
      setIsArtist(!!artistProfile.data?.stage_name);
    } catch (error) {
      setIsArtist(false);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await MusicAPI.getPlaylists();
      // Only update if the playlists have actually changed
      setPlaylists(prevPlaylists => {
        const newPlaylists = response.data.playlists || response.data;
        if (JSON.stringify(prevPlaylists) !== JSON.stringify(newPlaylists)) {
          return newPlaylists;
        }
        return prevPlaylists;
      });
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const NavItem = ({ to, icon: Icon, children }) => {
    const isActive = location.pathname === to;
    const [showTooltip, setShowTooltip] = useState(false);

    return (
      <NavLink
        to={to}
        className={`relative flex items-center gap-3 px-4 py-3 text-sm font-medium
          transition-all duration-200 ease-out group rounded-md mx-2
          ${isActive
            ? 'text-white bg-accent/20'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        onMouseEnter={() => isCollapsed && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Icon
          size={20}
          className={`transition-transform duration-200 min-w-[20px]
            ${isActive ? 'text-accent' : ''}`}
        />
<AnimatePresence>
  {!isCollapsed && (
    <motion.span
      initial={false}
      animate={{ opacity: 1, width: 'auto' }}
      exit={{ opacity: 0, width: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.span>
  )}
</AnimatePresence>


        <AnimatePresence>
          {isCollapsed && showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute left-full ml-2 px-2 py-1 bg-surface-light
                       text-white rounded-md text-xs whitespace-nowrap z-50"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </NavLink>
    );
  };

  return (
    <motion.div
      animate={{ width: isCollapsed ? '5rem' : '16rem' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed top-0 left-0 bottom-24 bg-[#121212] flex flex-col
                 overflow-hidden z-30 border-r border-white/5"
    >
      <div className="flex justify-end p-2">
        <motion.button
          onClick={() => setIsCollapsed(!isCollapsed)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-full hover:bg-white/5 text-gray-400 
                   hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </motion.button>
      </div>

      <div className="flex flex-col flex-1">
        <div className="space-y-1 py-2">
          <NavItem to="/" icon={Home}>Home</NavItem>
          <NavItem to="/search" icon={Search}>Search</NavItem>
          <NavItem to="/library" icon={Library}>Your Library</NavItem>
        </div>

        <div className="mt-6 space-y-1 py-2">
          <NavItem to="/create-playlist" icon={PlusSquare}>Create Playlist</NavItem>
          <NavItem to="/liked-songs" icon={Heart}>Liked Songs</NavItem>
          <NavItem to="/recent" icon={Clock}>Recently Played</NavItem>
          {isArtist && (
            <NavItem to="/artist/dashboard" icon={Mic}>Artist Dashboard</NavItem>
          )}
        </div>

        <div className="mt-6 flex-1 overflow-hidden">
          <motion.div 
            className="px-4 py-2 flex items-center justify-between cursor-pointer"
            onClick={() => !isCollapsed && setPlaylistsExpanded(!playlistsExpanded)}
          >
            {!isCollapsed && (
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Your Playlists
              </div>
            )}
          </motion.div>

          <AnimatePresence initial={false}>
            {(!isCollapsed && playlistsExpanded) && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-y-auto"
              >
                {playlists.map((playlist) => (
                  <NavLink
                    key={playlist.id}
                    to={`/playlist/${playlist.id}`}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-6 py-2 text-sm
                      transition-all duration-200 hover:bg-white/5
                      ${isActive
                        ? 'text-white bg-white/10'
                        : 'text-gray-400 hover:text-white'
                      }
                    `}
                  >
                    <Music size={16} />
                    <span className="truncate">{playlist.name}</span>
                  </NavLink>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Actions */}
      {!isCollapsed && (
        <div className="p-4 border-t border-white/5">
          <NavLink
            to="/create-playlist"
            className="flex items-center justify-center gap-2 h-10 bg-white/5 
                     hover:bg-white/10 rounded-full text-white transition-colors"
          >
            <Plus size={20} />
            <span className="text-sm font-medium">New Playlist</span>
          </NavLink>
        </div>
      )}
    </motion.div>
  );
};

export default Sidebar;