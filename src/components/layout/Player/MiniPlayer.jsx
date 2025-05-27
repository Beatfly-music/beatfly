import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Heart,
  Music2,
  Volume2,
  VolumeX,
  ListMusic,
  FileText,
  Sliders,
  Maximize2,
  SkipForward,
  SkipBack,
  ChevronUp,
  Shuffle,
  Repeat,
  Repeat1
} from 'lucide-react';

/**
 * Enhanced Mini Player with perfect alignment for mobile and desktop
 * Note: isMobile is passed as a prop from the parent component
 */
const MiniPlayer = ({
  currentTrack,
  getTrackImage,
  formatTime,
    currentTime,
    duration,
    seek,
    togglePlay,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    shuffle,
    repeat,
    loading,
    isPlaying,
    isLiked,
    toggleLike,
    setShowExpanded,
    setShowQueue,
    showQueue,
    volume,
    handleVolumeChange,
    toggleMute,
    isMuted,
    showLyrics,
    setShowLyrics,
    setShowEQ,
    showEQ,
    isMobile = false,
}) => {
  const navigate = useNavigate();
  const miniPlayerRef = useRef(null);
  const controls = useAnimation();

  // Touch state management
  const [touchInfo, setTouchInfo] = useState({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    isActive: false
  });

  // Animation states
  const [showHeart, setShowHeart] = useState(false);
  const [swipeFeedback, setSwipeFeedback] = useState(null);

  // Navigate without closing player
  const handleNavigate = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    if (!touch) return;

    setTouchInfo({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startTime: Date.now(),
                 isActive: true
    });
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchInfo.isActive) return;
    const touch = e.touches[0];
    if (!touch) return;

    setTouchInfo(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY
    }));
  }, [touchInfo.isActive]);

  const handleTouchEnd = useCallback((e) => {
    if (!touchInfo.isActive) return;

    const deltaX = touchInfo.currentX - touchInfo.startX;
    const deltaY = touchInfo.startY - touchInfo.currentY;
    const touchDuration = Date.now() - touchInfo.startTime;

    // Check if touch is on control
    const isControl = e.target.closest('.player-control');

    if (!isControl) {
      // Quick tap to expand
      if (touchDuration < 200 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        setShowExpanded(true);
      }
      // Swipe up to expand
      else if (deltaY > 50) {
        setShowExpanded(true);
      }
      // Horizontal swipes
      else if (Math.abs(deltaX) > 80 && currentTrack) {
        if (deltaX < 0) {
          playNext();
          setSwipeFeedback('next');
        } else {
          playPrevious();
          setSwipeFeedback('prev');
        }
        setTimeout(() => setSwipeFeedback(null), 300);
      }
    }

    setTouchInfo({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      startTime: 0,
      isActive: false
    });
  }, [touchInfo, currentTrack, setShowExpanded, playNext, playPrevious]);

  // Double tap handler
  const lastTapRef = useRef(0);
  const handleDoubleTap = useCallback((e) => {
    if (e.target.closest('.player-control')) return;

    const now = Date.now();
    if (now - lastTapRef.current < 300 && currentTrack) {
      toggleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTapRef.current = now;
  }, [currentTrack, toggleLike]);

  // MOBILE LAYOUT
  if (isMobile) {
    return (
      <motion.div
      ref={miniPlayerRef}
      className="fixed bottom-16 left-0 right-0 h-20 bg-black/95 backdrop-blur-xl border-t border-white/10 z-40"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleDoubleTap}
      >
      {/* Swipe indicator */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/30 rounded-full" />

      {/* Content container */}
      <div className="h-full px-4 flex items-center justify-between">
      {/* Left: Track info */}
      <div className="flex items-center flex-1 min-w-0 mr-3">
      {currentTrack ? (
        <>
        {/* Album art */}
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-surface flex-shrink-0">
        <img
        src={getTrackImage() + "?w=96"}
        alt={currentTrack.title}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/default-album-art.png';
        }}
        />
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        </div>

        {/* Track details */}
        <div className="ml-3 flex-1 min-w-0">
        <div className="font-medium text-white text-sm truncate">{currentTrack.title}</div>
        <div className="text-gray-400 text-xs truncate mt-0.5">{currentTrack.artist}</div>
        </div>
        </>
      ) : (
        <div className="flex items-center text-gray-400">
        <Music2 size={20} className="mr-3" />
        <span className="text-sm">No track playing</span>
        </div>
      )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
      {currentTrack && (
        <>
        <motion.button
        className="player-control p-2"
        onClick={(e) => {
          e.stopPropagation();
          toggleLike();
        }}
        whileTap={{ scale: 0.8 }}
        >
        <Heart size={20} className={isLiked ? 'text-pink-500 fill-current' : 'text-gray-400'} />
        </motion.button>

        <motion.button
        className="player-control w-10 h-10 rounded-full bg-white flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        whileTap={{ scale: 0.9 }}
        disabled={loading}
        >
        {loading ? (
          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause size={18} className="text-black" />
        ) : (
          <Play size={18} className="text-black ml-0.5" />
        )}
        </motion.button>

        <motion.button
        className="player-control p-2"
        onClick={(e) => {
          e.stopPropagation();
          setShowQueue(true);
        }}
        whileTap={{ scale: 0.8 }}
        >
        <ListMusic size={20} className={showQueue ? 'text-accent' : 'text-gray-400'} />
        </motion.button>
        </>
      )}
      </div>
      </div>

      {/* Progress bar */}
      {currentTrack && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <div
        className="h-full bg-accent transition-all duration-100"
        style={{ width: `${(currentTime / duration) * 100}%` }}
        />
        </div>
      )}

      {/* Swipe feedback */}
      <AnimatePresence>
      {swipeFeedback && (
        <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        >
        {swipeFeedback === 'next' ? (
          <SkipForward size={40} className="text-white/50" />
        ) : (
          <SkipBack size={40} className="text-white/50" />
        )}
        </motion.div>
      )}
      </AnimatePresence>

      {/* Double tap heart */}
      <AnimatePresence>
      {showHeart && (
        <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 1.5, opacity: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        >
        <Heart size={60} className="text-pink-500 fill-current" />
        </motion.div>
      )}
      </AnimatePresence>
      </motion.div>
    );
  }

  // DESKTOP LAYOUT
  return (
    <motion.div
    className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-surface/95 backdrop-blur-xl border-t border-white/10 z-40"
    initial={{ y: 100 }}
    animate={{ y: 0 }}
    exit={{ y: 100 }}
    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
    <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center justify-between">
    {/* Left section - Track info (1/3 width) */}
    <div className="w-1/3 flex items-center min-w-0">
    {currentTrack ? (
      <>
      {/* Album art */}
      <motion.div
      className="relative group cursor-pointer flex-shrink-0"
      whileHover={{ scale: 1.05 }}
      onClick={() => setShowExpanded(true)}
      >
      <div className="w-14 h-14 rounded-lg overflow-hidden shadow-lg bg-surface">
      <img
      src={getTrackImage() + "?w=112"}
      alt={currentTrack.title || 'Album Art'}
      className="w-full h-full object-cover"
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = '/default-album-art.png';
      }}
      />
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <Maximize2 size={20} className="text-white" />
      </div>
      </div>
      </motion.div>

      {/* Track info */}
      <div className="ml-4 flex-1 min-w-0">
      <div
      onClick={() => handleNavigate(`/track/${currentTrack.id}`)}
      className="text-sm font-medium text-white truncate hover:text-accent transition-colors cursor-pointer"
      >
      {currentTrack.title}
      </div>
      <div
      onClick={() => handleNavigate(`/profile/${currentTrack.artistId}`)}
      className="text-xs text-gray-400 truncate hover:text-gray-300 transition-colors cursor-pointer mt-1"
      >
      {currentTrack.artist}
      </div>
      </div>

      {/* Like button */}
      <motion.button
      onClick={toggleLike}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="ml-4 p-2"
      >
      <Heart
      size={20}
      className={isLiked ? 'text-pink-500 fill-current' : 'text-gray-400 hover:text-gray-300'}
      />
      </motion.button>
      </>
    ) : (
      <div className="flex items-center text-gray-400">
      <Music2 size={20} className="mr-3" />
      <span className="text-sm">Select a track to play</span>
      </div>
    )}
    </div>

    {/* Center section - Playback controls (1/3 width) */}
    <div className="w-1/3 flex flex-col items-center">
    {/* Control buttons */}
    <div className="flex items-center justify-center gap-4 mb-2">
    <motion.button
    onClick={toggleShuffle}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className={`p-1 transition-colors ${
      shuffle ? 'text-accent' : 'text-gray-400 hover:text-gray-300'
    }`}
    disabled={!currentTrack}
    >
    <Shuffle size={16} />
    </motion.button>

    <motion.button
    onClick={playPrevious}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className="text-gray-300 hover:text-white transition-colors"
    disabled={!currentTrack}
    >
    <SkipBack size={20} />
    </motion.button>

    <motion.button
    onClick={togglePlay}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
      currentTrack ? 'bg-white hover:bg-gray-100' : 'bg-gray-700 cursor-not-allowed'
    }`}
    disabled={!currentTrack || loading}
    >
    {loading ? (
      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
    ) : isPlaying ? (
      <Pause size={20} className="text-black" />
    ) : (
      <Play size={20} className="text-black ml-0.5" />
    )}
    </motion.button>

    <motion.button
    onClick={playNext}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className="text-gray-300 hover:text-white transition-colors"
    disabled={!currentTrack}
    >
    <SkipForward size={20} />
    </motion.button>

    <motion.button
    onClick={toggleRepeat}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className={`p-1 transition-colors ${
      repeat !== 'none' ? 'text-accent' : 'text-gray-400 hover:text-gray-300'
    }`}
    disabled={!currentTrack}
    >
    {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
    </motion.button>
    </div>

    {/* Seek bar */}
    <div className="w-full max-w-md flex items-center gap-2">
    <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
    <div className="flex-1 h-1 bg-gray-700 rounded-full group cursor-pointer relative">
    <div
    className="absolute inset-y-0 left-0 bg-white rounded-full transition-all group-hover:bg-accent"
    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
    />
    <input
    type="range"
    min="0"
    max={duration || 0}
    value={currentTime}
    onChange={(e) => seek(parseFloat(e.target.value))}
    className="absolute inset-0 w-full opacity-0 cursor-pointer"
    disabled={!currentTrack || !duration}
    />
    </div>
    <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
    </div>
    </div>

    {/* Right section - Additional controls (1/3 width) */}
    <div className="w-1/3 flex items-center justify-end gap-4">
    {/* Feature buttons */}
    <motion.button
    onClick={() => setShowQueue(!showQueue)}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className={`p-2 transition-colors ${
      showQueue ? 'text-accent' : 'text-gray-400 hover:text-gray-300'
    }`}
    >
    <ListMusic size={18} />
    </motion.button>

    <motion.button
    onClick={() => setShowLyrics(!showLyrics)}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className={`p-2 transition-colors ${
      showLyrics ? 'text-accent' : 'text-gray-400 hover:text-gray-300'
    }`}
    >
    <FileText size={18} />
    </motion.button>

    <motion.button
    onClick={() => setShowEQ(!showEQ)}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className={`p-2 transition-colors ${
      showEQ ? 'text-accent' : 'text-gray-400 hover:text-gray-300'
    }`}
    >
    <Sliders size={18} />
    </motion.button>

    <div className="w-px h-8 bg-gray-700 mx-2" />

    {/* Volume control */}
    <div className="flex items-center gap-2">
    <motion.button
    onClick={toggleMute}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className="text-gray-400 hover:text-gray-300 transition-colors"
    >
    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </motion.button>

    <div className="w-24 h-1 bg-gray-700 rounded-full group cursor-pointer relative">
    <div
    className="absolute inset-y-0 left-0 bg-gray-400 rounded-full transition-all group-hover:bg-white"
    style={{ width: `${volume * 100}%` }}
    />
    <input
    type="range"
    min="0"
    max="1"
    step="0.01"
    value={volume}
    onChange={handleVolumeChange}
    className="absolute inset-0 w-full opacity-0 cursor-pointer"
    />
    </div>
    </div>
    </div>
    </div>
    </motion.div>
  );
};

export default MiniPlayer;
