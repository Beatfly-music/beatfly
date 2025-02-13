import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid, List, Play, Pause, ListMusic, Music2, Disc, Loader } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';

// Helpers
const getContentImage = (item) => {
  // Try the possible image properties
  const image = item.cover || item.image || item.artwork;
  if (!image) return '/default-cover.png';
  // If the image is already a full URL, return it directly
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  // Otherwise, assume it's a filename and prepend the backend URL
  return `http://localhost:5000/xrpc/images/${image}`;
};

const formatDuration = (seconds) => {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Grid item component – audio-related state is used here.
const GridItem = React.memo(({ item, index, activeTab }) => {
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();

  const isCurrentItem =
    activeTab === 'tracks'
      ? currentTrack?.id === item.id
      : item.tracks?.[0]?.id === currentTrack?.id;

  const handlePlay = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeTab === 'tracks') {
        currentTrack?.id === item.id ? togglePlay() : playTrack(item);
      } else if (item.tracks?.[0]) {
        currentTrack?.id === item.tracks[0].id ? togglePlay() : playTrack(item.tracks[0]);
      }
    },
    [activeTab, currentTrack, item, playTrack, togglePlay]
  );

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
        className="block p-4 rounded-lg bg-surface hover:bg-surface-light transition-colors group"
      >
        <div className="relative aspect-square mb-4">
          <img
            src={getContentImage(item)}
            alt={item.title || item.name}
            className="w-full h-full object-cover rounded-lg shadow-lg"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-cover.png';
            }}
          />
          <motion.button
            className="absolute right-2 bottom-2 w-12 h-12 bg-accent rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            onClick={handlePlay}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isCurrentItem && isPlaying ? (
              <Pause size={24} className="text-white" />
            ) : (
              <Play size={24} className="text-white ml-1" />
            )}
          </motion.button>
        </div>
        <div className="space-y-1">
          <h3 className="font-medium truncate">{item.title || item.name}</h3>
          <p className="text-sm text-gray-400 truncate">
            {activeTab === 'playlists' ? `By ${item.creator}` : item.artist}
          </p>
        </div>
      </Link>
    </motion.div>
  );
});

// List item component – audio state is used locally here.
const ListItem = React.memo(({ item, index, activeTab }) => {
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();

  const isCurrentItem =
    activeTab === 'tracks'
      ? currentTrack?.id === item.id
      : item.tracks?.[0]?.id === currentTrack?.id;

  const handlePlay = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeTab === 'tracks') {
        currentTrack?.id === item.id ? togglePlay() : playTrack(item);
      } else if (item.tracks?.[0]) {
        currentTrack?.id === item.tracks[0].id ? togglePlay() : playTrack(item.tracks[0]);
      }
    },
    [activeTab, currentTrack, item, playTrack, togglePlay]
  );

  return (
    <Link
      to={`/${
        activeTab === 'playlists'
          ? 'playlist'
          : activeTab === 'albums'
          ? 'album'
          : 'track'
      }/${item.id}`}
      className={`flex items-center gap-4 p-3 rounded-lg hover:bg-surface transition-colors group ${
        isCurrentItem ? 'text-accent' : ''
      }`}
    >
      <div className="w-8 text-center text-gray-400">
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
      <div className="relative w-12 h-12 flex-shrink-0">
        <img
          src={getContentImage(item)}
          alt={item.title || item.name}
          className="w-full h-full rounded object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/default-cover.png';
          }}
        />
        <motion.button
          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded"
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
        <div className="font-medium truncate">{item.title || item.name}</div>
        <div className="text-sm text-gray-400 truncate">
          {activeTab === 'playlists' ? item.creator : item.artist}
        </div>
      </div>
      {activeTab === 'tracks' && (
        <div className="text-sm text-gray-400">{formatDuration(item.duration)}</div>
      )}
    </Link>
  );
});

const Library = () => {
  const [view, setView] = useState('grid');
  const [activeTab, setActiveTab] = useState('playlists');
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
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

      const response = await fetch(`http://localhost:5000/xrpc${endpoint}`, {
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
        return <ListMusic size={20} />;
      case 'albums':
        return <Disc size={20} />;
      case 'tracks':
        return <Music2 size={20} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-background" />
        <div className="relative z-10 p-8">
          <div className="flex items-end gap-6 mb-8">
            <div className="w-52 h-52 bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg rounded-lg">
              {getTabIcon(activeTab)}
            </div>
            <div className="flex-1">
              <div className="flex items-end justify-between">
                <div>
                  <h5 className="text-sm text-white/80">Library</h5>
                  <h1 className="text-5xl font-bold mb-4">Your Collection</h1>
                  <p className="text-white/60 text-sm mb-6">
                    {content.length} {activeTab}
                  </p>
                  <div className="flex gap-4">
                    {['playlists', 'albums', 'tracks'].map((tab) => (
                      <motion.button
                        key={tab}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-full capitalize flex items-center gap-2 ${
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader size={24} className="animate-spin text-accent" />
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
                className="mt-4 px-6 py-2 bg-accent rounded-full text-sm font-medium hover:bg-accent/80 transition-colors"
              >
                Create Playlist
              </Link>
            )}
          </motion.div>
        )}

        {!loading && !error && content.length > 0 && (
          <AnimatePresence mode="wait">
            {view === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {content.map((item, index) => (
                  <GridItem key={item.id} item={item} index={index} activeTab={activeTab} />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {content.map((item, index) => (
                  <ListItem key={item.id} item={item} index={index} activeTab={activeTab} />
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
