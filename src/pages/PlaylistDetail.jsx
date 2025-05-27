import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Clock,
  MoreHorizontal,
  Share2,
  Edit3,
  Trash2,
  ListMusic,
  Sparkles,
  Music,
  Plus
} from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';

// Toast notification component
const Toast = ({ message, isVisible }) => (
  <AnimatePresence>
  {isVisible && (
    <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className="fixed bottom-24 left-1/2 transform -translate-x-1/2
    bg-accent text-white px-6 py-3 rounded-full text-sm
    shadow-2xl z-50 flex items-center gap-2"
    >
    <Sparkles size={16} />
    {message}
    </motion.div>
  )}
  </AnimatePresence>
);

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredTrack, setHoveredTrack] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const response = await MusicAPI.getPlaylist(id);
        setPlaylist(response.data);
      } catch (err) {
        console.error('Error fetching playlist:', err);
        setError('Failed to load playlist');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [id]);

  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: playlist.name,
        text: `Check out my playlist: ${playlist.name}`,
        url: window.location.href
      }).catch(() => {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard');
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      try {
        await MusicAPI.deletePlaylist(playlist.id);
        showToast('Playlist deleted');
        setTimeout(() => navigate('/library'), 1000);
      } catch (err) {
        console.error('Error deleting playlist:', err);
        showToast('Failed to delete playlist');
      }
    }
  };

  const handlePlayPlaylist = () => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0]);
      showToast('Playing playlist');
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
      <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
      <ListMusic className="w-12 h-12 text-accent" />
      </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center">
      <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="text-center"
      >
      <p className="text-red-500 text-xl mb-4">{error}</p>
      <button
      onClick={() => window.location.reload()}
      className="px-6 py-3 bg-accent rounded-full text-white hover:bg-accent-dark
      transition-all duration-300 transform hover:scale-105"
      >
      Retry
      </button>
      </motion.div>
      </div>
    );
  }

  if (!playlist) {
    return <div className="min-h-full p-8 text-white">No playlist found.</div>;
  }

  const isPlaylistPlaying = playlist.tracks?.some(track =>
  currentTrack?.id === track.id && isPlaying
  );

  return (
    <motion.div
    className="min-h-full bg-gradient-to-b from-surface to-background"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    >
    {/* Header */}
    <div className="relative h-[400px] overflow-hidden">
    {/* Animated Background */}
    <motion.div
    className="absolute inset-0"
    initial={{ scale: 1.1 }}
    animate={{ scale: 1 }}
    transition={{ duration: 20, repeat: Infinity, direction: "alternate" }}
    >
    {playlist.image ? (
      <img
      src={MusicAPI.getImage('albumArt', playlist.image)}
      alt=""
      className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-blue-600/30" />
    )}
    <div className="absolute inset-0 backdrop-blur-3xl bg-black/60" />
    </motion.div>

    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

    {/* Content */}
    <div className="relative z-10 h-full flex items-end p-8">
    <motion.div
    className="flex items-end gap-6"
    initial={{ y: 50, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ type: "spring", stiffness: 100 }}
    >
    <motion.div
    className="w-52 h-52 bg-surface shadow-2xl rounded-xl overflow-hidden flex-shrink-0"
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 200 }}
    >
    {playlist.image ? (
      <img
      src={MusicAPI.getImage('albumArt', playlist.image)}
      alt={playlist.name}
      className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600
      flex items-center justify-center">
      <ListMusic size={60} className="text-white/30" />
      </div>
    )}
    </motion.div>

    <div className="flex-1 space-y-2">
    <motion.h5
    className="text-sm text-white/60 flex items-center gap-2"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    >
    <ListMusic size={16} />
    Playlist
    </motion.h5>

    <motion.h1
    className="text-5xl font-bold text-white mb-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    >
    {playlist.name}
    </motion.h1>

    <motion.div
    className="text-white/60 space-y-1"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    >
    <p className="text-sm">
    Created on {new Date(playlist.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}
    </p>
    {playlist.description && (
      <p className="text-white mt-2 text-lg">{playlist.description}</p>
    )}
    <p className="text-sm">
    {playlist.tracks?.length || 0} tracks
    </p>
    </motion.div>
    </div>
    </motion.div>
    </div>
    </div>

    {/* Actions Bar */}
    <motion.div
    className="px-8 py-6 flex items-center gap-4"
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.4 }}
    >
    <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={handlePlayPlaylist}
    className="w-16 h-16 bg-accent rounded-full flex items-center justify-center
    shadow-2xl hover:shadow-accent/50 transition-all duration-300"
    >
    {isPlaylistPlaying ? (
      <Pause size={32} className="text-white" />
    ) : (
      <Play size={32} className="text-white ml-1" />
    )}
    </motion.button>

    <motion.button
    onClick={handleShare}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className="p-3 rounded-full text-gray-400 hover:text-white hover:bg-white/10
    transition-all duration-300"
    >
    <Share2 size={28} />
    </motion.button>

    <Link
    to={`/playlist/edit/${playlist.id}`}
    className="p-3 rounded-full text-gray-400 hover:text-white hover:bg-white/10
    transition-all duration-300"
    >
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
    <Edit3 size={28} />
    </motion.div>
    </Link>

    <motion.button
    onClick={handleDelete}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className="p-3 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10
    transition-all duration-300"
    >
    <Trash2 size={28} />
    </motion.button>
    </motion.div>

    {/* Tracks List */}
    <div className="px-8 pb-8">
    {/* Header */}
    <div className="grid grid-cols-[16px,5fr,2fr,1fr] gap-4 px-4 py-3
    text-sm text-gray-400 border-b border-white/10 mb-2">
    <div>#</div>
    <div>Title</div>
    <div>Date Added</div>
    <div className="flex justify-end">
    <Clock size={16} />
    </div>
    </div>

    {/* Tracks */}
    {playlist.tracks && playlist.tracks.length > 0 ? (
      <motion.div className="space-y-1">
      {playlist.tracks.map((track, index) => {
        const isCurrentTrack = currentTrack?.id === track.id;

        return (
          <motion.div
          key={track.id}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onMouseEnter={() => setHoveredTrack(track.id)}
          onMouseLeave={() => setHoveredTrack(null)}
          onClick={() => playTrack(track)}
          className={`grid grid-cols-[16px,5fr,2fr,1fr] gap-4 px-4 py-3
            rounded-lg hover:bg-white/5 group cursor-pointer
            transition-all duration-200
            ${isCurrentTrack ? 'bg-accent/10 text-accent' : ''}`}
            >
            <div className="flex items-center">
            <AnimatePresence mode="wait">
            {hoveredTrack === track.id || (isCurrentTrack && isPlaying) ? (
              <motion.button
              key="play"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                isCurrentTrack ? togglePlay() : playTrack(track);
              }}
              >
              {isCurrentTrack && isPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}
              </motion.button>
            ) : (
              <motion.span
              key="number"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="text-gray-400 text-sm"
              >
              {index + 1}
              </motion.span>
            )}
            </AnimatePresence>
            </div>

            <div className="flex items-center gap-4">
            <img
            src={MusicAPI.getImage('albumArt', track.track_image)}
            alt={track.title}
            className="w-10 h-10 rounded object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-album-art.png';
            }}
            />
            <div className="flex-1 min-w-0">
            <div className="font-medium text-white truncate">
            {track.title}
            </div>
            <div className="text-sm text-gray-400 truncate">
            {track.artist}
            </div>
            </div>
            </div>

            <div className="flex items-center text-gray-400 text-sm">
            {track.date_added ? new Date(track.date_added).toLocaleDateString() : 'N/A'}
            </div>

            <div className="flex items-center justify-end text-gray-400 text-sm">
            {track.duration || '--:--'}
            </div>
            </motion.div>
        );
      })}
      </motion.div>
    ) : (
      <motion.div
      className="text-center py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      >
      <Music size={48} className="text-gray-600 mx-auto mb-4" />
      <p className="text-gray-400 text-lg mb-4">No tracks in this playlist</p>
      <Link
      to="/search"
      className="inline-flex items-center gap-2 px-6 py-3 bg-accent rounded-full
      text-white hover:bg-accent-dark transition-all duration-300
      transform hover:scale-105"
      >
      <Plus size={20} />
      Add Tracks
      </Link>
      </motion.div>
    )}
    </div>

    <Toast message={toast.message} isVisible={toast.visible} />
    </motion.div>
  );
};

export default PlaylistDetail;
