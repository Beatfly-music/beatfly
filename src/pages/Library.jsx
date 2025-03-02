import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid, List, Play, Pause, ListMusic, Music2, Disc, Loader } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { useResponsive } from '../components/layout/MainLayout'; // Import responsive context
import MusicAPI from '../services/api';

const formatDuration = (seconds) => {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Helper function to build image URL based on active tab.
const getImageForItem = (item, activeTab, width = 300) => {
  let folder = '';
  if (activeTab === 'albums') {
    folder = 'albumArt';
  } else if (activeTab === 'playlists') {
    folder = 'playlist';
  } else if (activeTab === 'tracks') {
    folder = 'albumArt';
  } else {
    folder = 'albumArt';
  }
  if (!item.album_art || item.album_art.startsWith('http')) {
    return '/default-album-art.png';
  }
  return MusicAPI.getImage(folder, item.album_art) + `?w=${width}`;
};

// Grid item component.
const GridItem = React.memo(({ item, index, activeTab, isMobile }) => {
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();
  
  // Determine if this item (or its first track) is currently playing.
  const isCurrentItem =
    activeTab === 'tracks'
      ? currentTrack?.id === item.id
      : item.tracks?.[0]?.id === currentTrack?.id;

  const handlePlay = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[GridItem] Clicked play for item:', item.id);
      if (activeTab === 'tracks') {
        currentTrack?.id === item.id ? togglePlay() : playTrack(item);
      } else if (item.tracks && item.tracks.length > 0) {
        currentTrack?.id === item.tracks[0].id ? togglePlay() : playTrack(item.tracks[0]);
      }
    },
    [activeTab, currentTrack, item, playTrack, togglePlay]
  );

  // Adjust the grid item size and styles for mobile
  const mobileClasses = isMobile ? 'p-2' : 'p-4';
  const mobileFontSize = isMobile ? 'text-sm' : '';
  const mobileSubFontSize = isMobile ? 'text-xs' : 'text-sm';
  const buttonSize = isMobile ? 'w-10 h-10' : 'w-12 h-12';
  const iconSize = isMobile ? 20 : 24;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/${
          activeTab === 'playlists'
            ? 'playlist'
            : activeTab === 'albums'
            ? 'album'
            : 'track'
        }/${item.id}`}
        className={`block ${mobileClasses} rounded-lg bg-surface hover:bg-surface-light transition-colors group`}
      >
        <div className="relative aspect-square mb-2">
          <img
            src={getImageForItem(item, activeTab, isMobile ? 200 : 300)}
            alt={item.title || item.name}
            className="w-full h-full object-cover rounded-lg shadow-lg"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-album-art.png';
            }}
          />
          <motion.button
            className={`absolute right-2 bottom-2 ${buttonSize} bg-accent rounded-full flex items-center justify-center ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity shadow-lg`}
            onClick={handlePlay}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isCurrentItem && isPlaying ? (
              <Pause size={iconSize} className="text-white" />
            ) : (
              <Play size={iconSize} className="text-white ml-1" />
            )}
          </motion.button>
        </div>
        <div className="space-y-1">
          <h3 className={`font-medium truncate ${mobileFontSize}`}>{item.title || item.name}</h3>
          <p className={`${mobileSubFontSize} text-gray-400 truncate`}>
            {activeTab === 'playlists' ? `By ${item.creator}` : item.artist}
          </p>
        </div>
      </Link>
    </motion.div>
  );
});

// List item component.
const ListItem = React.memo(({ item, index, activeTab, isMobile }) => {
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();

  const isCurrentItem =
    activeTab === 'tracks'
      ? currentTrack?.id === item.id
      : item.tracks?.[0]?.id === currentTrack?.id;

  const handlePlay = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[ListItem] Clicked play for item:', item.id);
      if (activeTab === 'tracks') {
        currentTrack?.id === item.id ? togglePlay() : playTrack(item);
      } else if (item.tracks && item.tracks.length > 0) {
        currentTrack?.id === item.tracks[0].id ? togglePlay() : playTrack(item.tracks[0]);
      }
    },
    [activeTab, currentTrack, item, playTrack, togglePlay]
  );

  const itemSize = isMobile ? 'py-2 px-2' : 'p-3';
  const indexWidth = isMobile ? 'w-6' : 'w-8';
  const imageSize = isMobile ? 'w-10 h-10' : 'w-12 h-12';
  const fontClass = isMobile ? 'text-sm' : '';
  const subFontClass = isMobile ? 'text-xs' : 'text-sm';

  return (
    <Link
      to={`/${
        activeTab === 'playlists'
          ? 'playlist'
          : activeTab === 'albums'
          ? 'album'
          : 'track'
      }/${item.id}`}
      className={`flex items-center gap-2 ${itemSize} rounded-lg hover:bg-surface transition-colors group ${
        isCurrentItem ? 'text-accent' : ''
      }`}
    >
      <div className={`${indexWidth} text-center text-gray-400`}>
        {isCurrentItem && isPlaying ? (
          <div className="w-4 h-4 mx-auto relative">
            <span className="absolute w-1 h-4 bg-accent rounded-full animate-music-bar-1" />
            <span className="absolute w-1 h-4 bg-accent rounded-full animate-music-bar-2 ml-1.5" />
            <span className="absolute w-1 h-4 bg-accent rounded-full animate-music-bar-3 ml-3" />
          </div>
        ) : (
          index + 1
        )}
      </div>
      <div className={`relative ${imageSize} flex-shrink-0`}>
        <img
          src={getImageForItem(item, activeTab, 100)}
          alt={item.title || item.name}
          className="w-full h-full rounded object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/default-album-art.png';
          }}
        />
        <motion.button
          className={`absolute inset-0 flex items-center justify-center bg-black/60 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity rounded`}
          onClick={handlePlay}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isCurrentItem && isPlaying ? (
            <Pause size={16} className="text-white" />
          ) : (
            <Play size={16} className="text-white ml-1" />
          )}
        </motion.button>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${fontClass}`}>{item.title || item.name}</div>
        <div className={`${subFontClass} text-gray-400 truncate`}>
          {activeTab === 'playlists' ? item.creator : item.artist}
        </div>
      </div>
      {activeTab === 'tracks' && !isMobile && (
        <div className="text-sm text-gray-400">{formatDuration(item.duration)}</div>
      )}
    </Link>
  );
});

const Library = () => {
  const { isMobile } = useResponsive();
  const [view, setView] = useState('grid');
  const [activeTab, setActiveTab] = useState('playlists');
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // On mobile, default to list view
  useEffect(() => {
    if (isMobile) {
      setView('list');
    }
  }, [isMobile]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      setError(null);
      let endpoint = '';
      switch (activeTab) {
        case 'playlists':
          endpoint = '/music/playlists';
          break;
        case 'albums':
          endpoint = '/music/favourite.albums';
          break;
        case 'tracks':
          endpoint = '/music/favourite.tracks';
          break;
        default:
          endpoint = '/music/playlists';
      }
      const response = await fetch(`https://api.beatfly-music.xyz/xrpc${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }
      const data = await response.json();
      let items = [];
      if (activeTab === 'playlists' && Array.isArray(data.playlists)) {
        items = data.playlists;
      } else if (activeTab === 'albums' && Array.isArray(data.albums)) {
        items = data.albums;
      } else if (activeTab === 'tracks' && Array.isArray(data.tracks)) {
        items = data.tracks;
      }
      setContent(items);
    } catch (error) {
      console.error('Error fetching content:', error);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const getTabIcon = (tab) => {
    switch (tab) {
      case 'playlists':
        return <ListMusic size={isMobile ? 16 : 20} />;
      case 'albums':
        return <Disc size={isMobile ? 16 : 20} />;
      case 'tracks':
        return <Music2 size={isMobile ? 16 : 20} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-background" />
        <div className={`relative z-10 ${isMobile ? 'px-4 py-4' : 'p-8'}`}>
          <div className={`flex items-end gap-6 ${isMobile ? 'mb-4' : 'mb-8'}`}>
            {!isMobile && (
              <div className="w-52 h-52 bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg rounded-lg">
                {getTabIcon(activeTab)}
              </div>
            )}
            <div className="flex-1">
              <div className={`flex ${isMobile ? 'flex-col' : 'items-end justify-between'}`}>
                <div>
                  <h5 className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/80`}>Library</h5>
                  <h1 className={`${isMobile ? 'text-2xl' : 'text-5xl'} font-bold ${isMobile ? 'mb-2' : 'mb-4'}`}>Your Collection</h1>
                  <p className={`text-white/60 ${isMobile ? 'text-xs mb-3' : 'text-sm mb-6'}`}>
                    {content.length} {activeTab}
                  </p>
                  <div className={`flex ${isMobile ? 'flex-wrap' : ''} gap-2`}>
                    {['playlists', 'albums', 'tracks'].map((tab) => (
                      <motion.button
                        key={tab}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveTab(tab)}
                        className={`${isMobile ? 'px-3 py-1 text-xs' : 'px-6 py-2'} rounded-full capitalize flex items-center gap-2 ${
                          activeTab === tab
                            ? 'bg-white text-black'
                            : 'bg-black/20 text-white hover:bg-black/30'
                        } transition-colors`}
                      >
                        {getTabIcon(tab)}
                        {tab}
                      </motion.button>
                    ))}
                  </div>
                </div>
                {!isMobile && (
                  <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 1.05 }}
                      onClick={() => setView('grid')}
                      className={`p-2 rounded transition-colors ${
                        view === 'grid'
                          ? 'bg-white text-black'
                          : 'text-white hover:bg-black/20'
                      }`}
                    >
                      <Grid size={20} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 1.05 }}
                      onClick={() => setView('list')}
                      className={`p-2 rounded transition-colors ${
                        view === 'list'
                          ? 'bg-white text-black'
                          : 'text-white hover:bg-black/20'
                      }`}
                    >
                      <List size={20} />
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Mobile view toggle */}
          {isMobile && (
            <div className="flex items-center justify-end gap-2 mb-2">
              <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 1.05 }}
                  onClick={() => setView('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    view === 'grid'
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-black/20'
                  }`}
                >
                  <Grid size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 1.05 }}
                  onClick={() => setView('list')}
                  className={`p-1.5 rounded transition-colors ${
                    view === 'list'
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-black/20'
                  }`}
                >
                  <List size={16} />
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Content */}
      <div className={`${isMobile ? 'px-4 pb-4' : 'px-8 pb-8'}`}>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader size={isMobile ? 20 : 24} className="animate-spin text-accent" />
          </div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center py-12 text-red-500"
          >
            {error}
          </motion.div>
        )}
        {!loading && !error && content.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-gray-400"
          >
            {getTabIcon(activeTab)}
            <p className="mt-4">No {activeTab} found</p>
            {activeTab === 'playlists' && (
              <Link
                to="/create-playlist"
                className={`mt-4 ${isMobile ? 'px-4 py-1.5 text-sm' : 'px-6 py-2'} bg-accent rounded-full ${isMobile ? 'text-xs' : 'text-sm'} font-medium hover:bg-accent/80 transition-colors`}
              >
                Create Playlist
              </Link>
            )}
          </motion.div>
        )}
        {!loading && !error && content.length > 0 && (
          <AnimatePresence mode="wait">
            {view === 'grid' ? (
              <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'}`}>
                {content.map((item, index) => (
                  <GridItem 
                    key={item.id} 
                    item={item} 
                    index={index} 
                    activeTab={activeTab} 
                    isMobile={isMobile}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {content.map((item, index) => (
                  <ListItem 
                    key={item.id} 
                    item={item} 
                    index={index} 
                    activeTab={activeTab}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Library;   