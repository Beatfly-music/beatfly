import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Heart,
  Share2,
  MoreHorizontal,
  Clock,
  PlayCircle,
  Disc,
  Music,
  Sparkles
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

const Track = () => {
  const { trackId } = useParams();
  const {
    playTrack,
    currentTrack,
    isPlaying,
    togglePlay,
    addToQueue
  } = useAudio();

  const [track, setTrack] = useState(null);
  const [album, setAlbum] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredTrack, setHoveredTrack] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const trackResponse = await MusicAPI.getTrack(trackId);
        setTrack(trackResponse.data);

        if (trackResponse.data.album_id) {
          const albumResponse = await MusicAPI.getAlbum(trackResponse.data.album_id);
          setAlbum(albumResponse.data);
        }

        const favoritesResponse = await MusicAPI.getFavoriteTracks();
        setIsLiked(favoritesResponse.data.tracks?.some(t => t.id === parseInt(trackId)));
      } catch (err) {
        console.error('Error fetching track data:', err);
        setError('Failed to load track details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trackId]);

  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const toggleLike = async () => {
    try {
      if (isLiked) {
        await MusicAPI.unfavoriteTrack(trackId);
      } else {
        await MusicAPI.favoriteTrack(trackId);
      }
      setIsLiked(!isLiked);
      showToast(isLiked ? 'Removed from favorites' : 'Added to favorites');
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleAddToQueue = () => {
    if (track) {
      addToQueue(track);
      showToast(`Added "${track.title}" to queue`);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: track.title,
        text: `Check out ${track.title} by ${track.artist}`,
        url: window.location.href
      }).catch((error) => console.log('Error sharing:', error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
      <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
      <Music className="w-12 h-12 text-accent" />
      </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
      <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="text-center"
      >
      <div className="text-red-500 text-xl mb-4">{error}</div>
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

  if (!track) return null;

  const isCurrentTrack = currentTrack?.id === track.id;

  return (
    <motion.div
    className="min-h-screen pb-24 bg-gradient-to-b from-surface to-background"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    >
    {/* Hero Section */}
    <div className="relative h-[500px] overflow-hidden">
    {/* Animated Background */}
    <motion.div
    className="absolute inset-0"
    initial={{ scale: 1.2 }}
    animate={{ scale: 1 }}
    transition={{ duration: 20, repeat: Infinity, direction: "alternate" }}
    >
    <img
    src={track.track_image + "?h=100"}
    alt=""
    className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 backdrop-blur-3xl bg-black/70" />
    </motion.div>

    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

    {/* Content */}
    <div className="relative z-10 h-full container mx-auto px-4 py-8 flex items-end">
    <motion.div
    className="flex flex-col md:flex-row items-start md:items-end gap-8 w-full"
    initial={{ y: 50, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ type: "spring", stiffness: 100 }}
    >
    {/* Track Image */}
    <motion.div
    className="relative group shrink-0"
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 200 }}
    >
    <img
    src={track.track_image + "?h=320"}
    alt={track.title}
    className="w-48 h-48 md:w-72 md:h-72 object-cover rounded-xl shadow-2xl"
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = '/default-album-art.png';
    }}
    />
    <motion.button
    onClick={() => isCurrentTrack ? togglePlay() : playTrack(track)}
    className="absolute inset-0 flex items-center justify-center bg-black/60
    opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
    whileHover={{ backgroundColor: "rgba(0,0,0,0.8)" }}
    >
    <motion.div
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    >
    {isCurrentTrack && isPlaying ? (
      <Pause size={60} className="text-white" />
    ) : (
      <Play size={60} className="text-white ml-2" />
    )}
    </motion.div>
    </motion.button>
    </motion.div>

    {/* Track Info */}
    <div className="flex-1 space-y-4">
    <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    >
    <h5 className="text-sm text-white/60 mb-2 flex items-center gap-2">
    <Music size={16} />
    Song
    </h5>
    <h1 className="text-4xl md:text-7xl font-bold text-white mb-4">
    {track.title}
    </h1>
    </motion.div>

    <motion.div
    className="flex items-center gap-4 text-base"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    >
    <motion.div
    whileHover={{ scale: 1.05 }}
    className="flex items-center gap-2"
    >
    {track.artistId ? (
      <Link
      to={`/profile/${track.artistId}`}
      className="text-white/60 hover:text-white transition-colors font-medium"
      >
      {track.artist}
      </Link>
    ) : (
      <span className="text-white/60 font-medium">{track.artist}</span>
    )}
    </motion.div>

    {album && (
      <>
      <span className="text-white/40">•</span>
      <motion.div whileHover={{ scale: 1.05 }}>
      <Link
      to={`/album/${album.id}`}
      className="text-white/60 hover:text-white transition-colors flex items-center gap-2"
      >
      <Disc size={16} />
      {album.title}
      </Link>
      </motion.div>
      </>
    )}

    <span className="text-white/40">•</span>
    <span className="text-white/60 flex items-center gap-2">
    <Clock size={16} />
    {formatDuration(track.duration)}
    </span>
    </motion.div>
    </div>
    </motion.div>
    </div>
    </div>

    {/* Actions Bar */}
    <motion.div
    className="container mx-auto px-4 py-8"
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.3 }}
    >
    <div className="flex items-center gap-4">
    <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => isCurrentTrack ? togglePlay() : playTrack(track)}
    className="w-16 h-16 bg-accent rounded-full flex items-center justify-center
    shadow-2xl hover:shadow-accent/50 transition-all duration-300"
    >
    {isCurrentTrack && isPlaying ? (
      <Pause size={32} className="text-white" />
    ) : (
      <Play size={32} className="text-white ml-1" />
    )}
    </motion.button>

    <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    onClick={toggleLike}
    className={`p-3 rounded-full transition-all duration-300 ${
      isLiked ? 'text-accent bg-accent/20' : 'text-gray-400 hover:text-white hover:bg-white/10'
    }`}
    >
    <Heart
    size={28}
    fill={isLiked ? 'currentColor' : 'none'}
    className="transition-all duration-300"
    />
    </motion.button>

    <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    onClick={handleAddToQueue}
    className="p-3 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
    title="Add to queue"
    >
    <PlayCircle size={28} />
    </motion.button>

    <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    onClick={handleShare}
    className="p-3 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
    title="Share track"
    >
    <Share2 size={28} />
    </motion.button>
    </div>
    </motion.div>

    {/* Album Context */}
    {album && album.tracks && (
      <motion.div
      className="container mx-auto px-4 mt-8"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      >
      <h2 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
      <Disc className="text-accent" />
      From the Album
      </h2>

      <div className="bg-surface/30 backdrop-blur-sm rounded-xl p-6 space-y-2">
      {album.tracks.map((albumTrack, index) => {
        const isCurrentAlbumTrack = currentTrack?.id === albumTrack.id;

        return (
          <motion.div
          key={albumTrack.id}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ x: 10 }}
          onMouseEnter={() => setHoveredTrack(albumTrack.id)}
          onMouseLeave={() => setHoveredTrack(null)}
          className={`flex items-center gap-4 p-4 rounded-lg hover:bg-white/5
            group cursor-pointer transition-all duration-200
            ${isCurrentAlbumTrack ? 'bg-accent/10 text-accent' : ''}`}
            onClick={() => playTrack(albumTrack)}
            >
            <div className="w-12 text-center">
            <AnimatePresence mode="wait">
            {hoveredTrack === albumTrack.id || (isCurrentAlbumTrack && isPlaying) ? (
              <motion.div
              key="play"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              >
              {isCurrentAlbumTrack && isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
              </motion.div>
            ) : (
              <motion.span
              key="number"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="text-gray-400"
              >
              {index + 1}
              </motion.span>
            )}
            </AnimatePresence>
            </div>

            <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">
            {albumTrack.title}
            </div>
            <div className="text-sm text-gray-400 truncate">
            {albumTrack.artist}
            </div>
            </div>

            <div className="text-sm text-gray-400">
            {formatDuration(albumTrack.duration)}
            </div>
            </motion.div>
        );
      })}
      </div>
      </motion.div>
    )}

    <Toast message={toast.message} isVisible={toast.visible} />
    </motion.div>
  );
};

export default Track;
