import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSidebar } from './MainLayout';
import {
  Home, Search, Library, PlusSquare,
  Heart, Clock, Music, ChevronLeft,
  ChevronRight, Plus, Mic, RefreshCcw,
  Music2
} from 'lucide-react';
import MusicAPI from '../../services/api';

const NavItem = ({ to, icon: Icon, children, isCollapsed }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <NavLink
    to={to}
    className={`
      relative flex items-center gap-3 px-4 py-3 text-sm font-medium
      transition-all duration-200 ease-out group rounded-md mx-2
      ${isActive
        ? 'text-white bg-accent/20'
        : 'text-gray-400 hover:text-white hover:bg-white/5'
      }
      `}
      onMouseEnter={() => isCollapsed && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      >
      <Icon
      size={20}
      className={`transition-transform duration-200 min-w-[20px]
        ${isActive ? 'text-accent' : ''}`}
        />
        <motion.div
        animate={{ width: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
        className="overflow-hidden whitespace-nowrap"
        >
        {children}
        </motion.div>

        {isCollapsed && showTooltip && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-surface-light
          text-white rounded-md text-xs whitespace-nowrap z-50">
          {children}
          </div>
        )}
        </NavLink>
  );
};

const PlaylistSection = ({ isCollapsed, playlists, fetchPlaylists }) => {
  return (
    <div className="mt-6 flex-1 overflow-hidden">
    <div className="px-4 py-2 flex items-center justify-between">
    {!isCollapsed && (
      <div className="flex items-center gap-3">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
      Your Playlists
      </div>
      <button
      onClick={fetchPlaylists}
      className="text-gray-400 hover:text-white transition-colors"
      >
      <RefreshCcw size={16} />
      </button>
      </div>
    )}
    </div>

    <motion.div
    animate={{
      height: !isCollapsed ? 'auto' : 0,
      opacity: !isCollapsed ? 1 : 0
    }}
    className="overflow-y-auto"
    >
    {playlists.length === 0 ? (
      <div className="flex flex-col gap-2 px-6 py-2 text-sm text-gray-400">
      <div className="flex items-center gap-2">
      <Music size={16} />
      <span>No playlists found.</span>
      </div>
      <NavLink
      to="/create-playlist"
      className="flex items-center gap-2 w-fit px-3 py-1 bg-white/5
      hover:bg-white/10 rounded-full text-white transition-colors"
      >
      <Plus size={16} />
      <span className="text-sm font-medium">Create Playlist</span>
      </NavLink>
      </div>
    ) : (
      playlists.map((playlist) => (
        <NavLink
        key={playlist.id}
        to={`/playlist/${playlist.id}`}
        className={({ isActive }) => `
        flex items-center gap-3 px-6 py-2 text-sm
        transition-all duration-200 hover:bg-white/5
        ${isActive ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'}
        `}
        >
        <Music size={16} />
        <span className="truncate">{playlist.name}</span>
        </NavLink>
      ))
    )}
    </motion.div>
    </div>
  );
};

const Sidebar = () => {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [playlists, setPlaylists] = useState([]);
  const [isArtist, setIsArtist] = useState(false);
  const navigate = useNavigate();

  const fetchPlaylists = async () => {
    try {
      const response = await MusicAPI.getPlaylists();
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

  const checkArtistStatus = async () => {
    try {
      const userProfile = await MusicAPI.getUserProfile();
      const artistProfile = await MusicAPI.getArtistProfile(userProfile.data.id);
      setIsArtist(!!artistProfile.data?.stage_name);
    } catch (error) {
      setIsArtist(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
    checkArtistStatus();
    const interval = setInterval(fetchPlaylists, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleBecomeArtist = () => {
    navigate('/artist/dashboard');
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
    <NavItem to="/" icon={Home} isCollapsed={isCollapsed}>Home</NavItem>
    <NavItem to="/search" icon={Search} isCollapsed={isCollapsed}>Search</NavItem>
    <NavItem to="/library" icon={Library} isCollapsed={isCollapsed}>Your Library</NavItem>
    </div>

    <div className="mt-6 space-y-1 py-2">
    <NavItem to="/create-playlist" icon={PlusSquare} isCollapsed={isCollapsed}>Create Playlist</NavItem>
    <NavItem to="/liked-songs" icon={Heart} isCollapsed={isCollapsed}>Liked Songs</NavItem>
    <NavItem to="/recent" icon={Clock} isCollapsed={isCollapsed}>Recently Played</NavItem>
    {isArtist && (
      <NavItem to="/artist/dashboard" icon={Mic} isCollapsed={isCollapsed}>Artist Dashboard</NavItem>
    )}
    </div>

    <PlaylistSection
    isCollapsed={isCollapsed}
    playlists={playlists}
    fetchPlaylists={fetchPlaylists}
    />
    </div>

    {!isCollapsed && (
      <div className="p-4 space-y-4 border-t border-white/5">
      <NavLink
      to="/create-playlist"
      className="flex items-center justify-center gap-2 h-10 bg-white/5
      hover:bg-white/10 rounded-full text-white transition-colors"
      >
      <Plus size={20} />
      <span className="text-sm font-medium">New Playlist</span>
      </NavLink>

      {!isArtist && (
        <button
        onClick={handleBecomeArtist}
        className="flex items-center justify-center w-full gap-2 h-10
        bg-gradient-to-r from-accent to-accent-light
        hover:opacity-90 rounded-full text-white transition-colors"
        >
        <Music2 size={20} />
        <span className="text-sm font-medium">Become an Artist</span>
        </button>
      )}
      </div>
    )}
    </motion.div>
  );
};

export default Sidebar;
