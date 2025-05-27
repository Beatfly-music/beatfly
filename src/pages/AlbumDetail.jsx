import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Heart, Clock, Share2, Plus, ListMusic, Disc, Sparkles } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { motion, AnimatePresence } from 'framer-motion';
import MusicAPI from '../services/api';

// Enhanced Explicit Icon
const ExplicitIcon = ({ size = 20, className = '' }) => (
  <motion.div
  className={`inline-flex items-center justify-center rounded ${className}`}
  style={{ width: size, height: size }}
  whileHover={{ scale: 1.1 }}
  >
  <span className="bg-gray-400 text-black text-xs font-bold px-1 rounded">E</span>
  </motion.div>
);

// Enhanced MarqueeText with gradient fade
const MarqueeText = ({ text, className = '' }) => {
  const duration = Math.max(20, text.length * 0.3);

  return (
    <div className={`relative overflow-hidden ${className}`}>
    <div className="absolute left-0 top-0 bottom-0 w-12 z-10
    bg-gradient-to-r from-background to-transparent pointer-events-none" />
    <motion.div
    className="flex whitespace-nowrap"
    animate={{ x: [0, "-50%"] }}
    transition={{
      x: { duration, ease: "linear", repeat: Infinity, repeatType: "loop" }
    }}
    >
    <span className="pr-8">{text}</span>
    <span className="pr-8">{text}</span>
    </motion.div>
    <div className="absolute right-0 top-0 bottom-0 w-12 z-10
    bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
};

// Enhanced Toast notification
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

const AlbumDetail = () => {
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [artistProfile, setArtistProfile] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [hoveredTrack, setHoveredTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = useAudio();
  const [toast, setToast] = useState({ visible: false, message: '' });

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 640;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchAlbumDetails();
  }, [albumId]);

  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const addAlbumToQueue = () => {
    if (album && album.tracks.length > 0) {
      addToQueue(album.tracks);
      showToast(`Added ${album.tracks.length} tracks to queue`);
    }
  };

  const addTrackToQueue = (track, event) => {
    event.stopPropagation();
    addToQueue(track);
    showToast(`Added "${track.title}" to queue`);
  };

  const fetchAlbumDetails = async () => {
    try {
      setLoading(true);
      const response = await MusicAPI.getAlbum(albumId);
      const data = response.data;
      setAlbum(data);

      if (data.user_id) {
        const artistResponse = await MusicAPI.getArtistProfile(data.user_id);
        setArtistProfile(artistResponse.data);
      }

      const token = localStorage.getItem('token');
      if (token) {
        const likeResponse = await fetch(
          `https://api.beatfly-music.xyz/xrpc/music/favourite.album/check/${albumId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const likeData = await likeResponse.json();
        setIsLiked(likeData.isLiked);
      }
    } catch (error) {
      console.error('Error fetching album details:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async () => {
    try {
      const token = localStorage.getItem('token');
      const method = isLiked ? 'DELETE' : 'POST';
      const endpoint = isLiked
      ? `/music/favourite.album/${albumId}`
      : '/music/favourite.album';

      await fetch(`https://api.beatfly-music.xyz/xrpc${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: !isLiked ? JSON.stringify({ albumId }) : undefined
      });

      setIsLiked(!isLiked);
      showToast(isLiked ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: album.title,
        text: `Check out ${album.title} by ${album.artist}`,
        url: window.location.href
      }).catch((error) => console.log('Error sharing:', error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
      <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
      <Disc className="w-12 h-12 text-accent" />
      </motion.div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-400">Album not found</p>
      </div>
    );
  }

  const isAlbumPlaying = currentTrack && album.tracks.some(track => track.id === currentTrack.id) && isPlaying;

  return (
    <motion.div
    className="flex-1 overflow-auto"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    >
    {/* Album Header - Fixed spacing */}
    <div className="relative">
    {/* Background Image with Blur */}
    <div className="absolute inset-0 h-96">
    <img
    src={album.album_art + "?w=200"}
    alt=""
    className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 backdrop-blur-3xl bg-black/60" />
    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
    </div>

    {/* Content Container */}
    <div className="relative pt-32 pb-8 px-8">
    <div className="flex items-end gap-8 max-w-screen-2xl mx-auto">
    {/* Album Cover */}
    <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: "spring", stiffness: 100 }}
    className="flex-shrink-0"
    >
    <img
    src={album.album_art + "?w=232"}
    alt={album.title}
    className="w-56 h-56 shadow-2xl rounded"
    />
    </motion.div>

    {/* Album Info */}
    <div className="flex-1 mb-2">
    <motion.p
    className="text-sm font-medium text-white/80 mb-2"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    >
    Album
    </motion.p>

    <motion.h1
    className="text-6xl font-bold text-white mb-6"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    >
    {album.title}
    {album.isExplicit && (
      <ExplicitIcon size={24} className="ml-4 inline-block align-middle" />
    )}
    </motion.h1>

    <motion.div
    className="flex items-center gap-2 text-sm text-white/80"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    >
    {artistProfile?.profile_pic && (
      <img
      src={artistProfile.profile_pic + "?h=24"}
      alt={artistProfile.stage_name || album.artist}
      className="w-6 h-6 rounded-full"
      />
    )}
    {artistProfile ? (
      <Link
      to={`/profile/${artistProfile.user_id}`}
      className="font-semibold hover:underline"
      >
      {artistProfile.stage_name}
      </Link>
    ) : (
      <span className="font-semibold">{album.artist}</span>
    )}
    <span className="text-white/60">•</span>
    <span className="text-white/60">{new Date(album.created_at).getFullYear()}</span>
    <span className="text-white/60">•</span>
    <span className="text-white/60">{album.tracks.length} songs</span>
    </motion.div>
    </div>
    </div>
    </div>
    </div>

    {/* Controls Section */}
    <div className="px-8 py-4">
    <div className="max-w-screen-2xl mx-auto flex items-center gap-8">
    <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => {
      if (isAlbumPlaying) {
        togglePlay();
      } else if (album.tracks.length > 0) {
        playTrack(album.tracks[0]);
      }
    }}
    className="w-14 h-14 bg-accent rounded-full flex items-center justify-center
    shadow-lg hover:bg-accent/90 transition-colors"
    >
    {isAlbumPlaying ? (
      <Pause size={24} className="text-black" />
    ) : (
      <Play size={24} className="text-black ml-0.5" />
    )}
    </motion.button>

    <motion.button
    onClick={toggleLike}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className={`p-2 ${isLiked ? 'text-accent' : 'text-gray-400 hover:text-white'} transition-colors`}
    >
    <Heart size={32} fill={isLiked ? 'currentColor' : 'none'} />
    </motion.button>

    <motion.button
    onClick={addAlbumToQueue}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className="p-2 text-gray-400 hover:text-white transition-colors"
    title="Add album to queue"
    >
    <ListMusic size={32} />
    </motion.button>

    <motion.button
    onClick={handleShare}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className="p-2 text-gray-400 hover:text-white transition-colors"
    title="Share album"
    >
    <Share2 size={32} />
    </motion.button>
    </div>
    </div>

    {/* Track List */}
    <div className="px-8 pb-8">
    <div className="max-w-screen-2xl mx-auto">
    {/* Track List Header */}
    <div className="grid grid-cols-[16px_4fr_2fr_minmax(120px,1fr)] gap-4 px-4 py-2
    border-b border-white/10 text-sm text-gray-400 mb-2">
    <div>#</div>
    <div>Title</div>
    <div>Artist</div>
    <div className="text-right pr-8">
    <Clock size={16} className="inline" />
    </div>
    </div>

    {/* Tracks */}
    <div>
    {album.tracks.map((track, index) => (
      <motion.div
      key={track.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      onMouseEnter={() => setHoveredTrack(track.id)}
      onMouseLeave={() => setHoveredTrack(null)}
      onClick={() => playTrack(track)}
      className={`grid grid-cols-[16px_4fr_2fr_minmax(120px,1fr)] gap-4 px-4 py-2
        rounded hover:bg-white/10 group cursor-pointer transition-colors
        ${currentTrack?.id === track.id ? 'text-accent' : ''}`}
        >
        <div className="flex items-center justify-center text-sm">
        {hoveredTrack === track.id ? (
          <button
          onClick={(e) => {
            e.stopPropagation();
            currentTrack?.id === track.id ? togglePlay() : playTrack(track);
          }}
          >
          {currentTrack?.id === track.id && isPlaying ? (
            <Pause size={16} />
          ) : (
            <Play size={16} />
          )}
          </button>
        ) : currentTrack?.id === track.id && isPlaying ? (
          <div className="flex gap-0.5">
          <span className="w-0.5 h-3 bg-accent rounded-full animate-pulse" />
          <span className="w-0.5 h-3 bg-accent rounded-full animate-pulse delay-75" />
          <span className="w-0.5 h-3 bg-accent rounded-full animate-pulse delay-150" />
          </div>
        ) : (
          <span className="text-gray-400">{index + 1}</span>
        )}
        </div>

        <div className="flex items-center min-w-0">
        <span className={`truncate ${currentTrack?.id === track.id ? 'text-accent' : ''}`}>
        {track.title}
        </span>
        </div>

        <div className="flex items-center text-gray-400 min-w-0">
        <span className="truncate">{track.artist}</span>
        </div>

        <div className="flex items-center justify-between text-gray-400 text-sm">
        <span>{track.duration || '0:00'}</span>
        <button
        onClick={(e) => addTrackToQueue(track, e)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-2"
        >
        <Plus size={16} />
        </button>
        </div>
        </motion.div>
    ))}
    </div>

    {/* Album Info Section */}
    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
    <div>
    <h3 className="text-white/60 mb-2">Released</h3>
    <p className="text-white">
    {new Date(album.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}
    </p>
    </div>

    {album.description && (
      <div>
      <h3 className="text-white/60 mb-2">About</h3>
      <p className="text-white/80 leading-relaxed">{album.description}</p>
      </div>
    )}
    </div>
    </div>
    </div>

    <Toast message={toast.message} isVisible={toast.visible} />
    </motion.div>
  );
};

export default AlbumDetail;
