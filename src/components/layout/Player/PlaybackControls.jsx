import React from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Sliders,
} from 'lucide-react';

/* ─────────────────────────────────────────────── *
 *              PlaybackControls                  *
 * ─────────────────────────────────────────────── */
const PlaybackControls = ({
  size = 'small',
  isPlaying,
  loading,
  currentTrack,
  toggleShuffle,
  playPrevious,
  togglePlay,
  playNext,
  toggleRepeat,
  shuffle,
  repeat,
  isMobile = false,
  onEqClick = null,
}) => {
  const isLarge = size === 'large';
  const buttonSize = isLarge ? 28 : (isMobile ? 18 : 20);
  const playButtonSize = isLarge ? 32 : (isMobile ? 20 : 24);
  const containerClass = isLarge ? 'gap-6' : (isMobile ? 'gap-3' : 'gap-4');

  return (
    <div className={`flex items-center ${containerClass} select-none player-controls`}>
      {!isMobile && (
        <motion.button
          onClick={toggleShuffle}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`transition-all duration-200 ${
            shuffle
              ? 'text-accent hover:text-accent/80'
              : 'text-gray-400 hover:text-white'
          }`}
          disabled={!currentTrack}
        >
          <Shuffle size={buttonSize} />
        </motion.button>
      )}

      <motion.button
        onClick={playPrevious}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="text-gray-400 hover:text-white transition-all duration-200"
        disabled={!currentTrack}
      >
        <SkipBack size={buttonSize} />
      </motion.button>

      <motion.button
        onClick={(e) => {
          e.stopPropagation(); // Prevent expansion when clicking play/pause
          togglePlay();
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`flex items-center justify-center rounded-full ${
          isLarge ? 'w-16 h-16' : (isMobile ? 'w-8 h-8' : 'w-10 h-10')
        } ${
          currentTrack
            ? 'bg-accent text-white hover:bg-accent/80'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        } transition-all duration-300`}
        disabled={!currentTrack || loading}
      >
        {loading ? (
          <div
            className={`border-2 border-white/30 border-t-white rounded-full animate-spin ${
              isLarge ? 'w-8 h-8' : (isMobile ? 'w-4 h-4' : 'w-5 h-5')
            }`}
          />
        ) : isPlaying ? (
          <Pause size={playButtonSize} />
        ) : (
          <Play size={playButtonSize} className="ml-1" />
        )}
      </motion.button>

      <motion.button
        onClick={playNext}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="text-gray-400 hover:text-white transition-all duration-200"
        disabled={!currentTrack}
      >
        <SkipForward size={buttonSize} />
      </motion.button>

      {!isMobile ? (
        <motion.button
          onClick={toggleRepeat}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`transition-all duration-200 ${
            repeat !== 'none'
              ? 'text-accent hover:text-accent/80'
              : 'text-gray-400 hover:text-white'
          }`}
          disabled={!currentTrack}
        >
          {repeat === 'one' ? (
            <Repeat1 size={buttonSize} />
          ) : (
            <Repeat size={buttonSize} />
          )}
        </motion.button>
      ) : (
        onEqClick && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onEqClick();
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-gray-400 hover:text-white transition-all duration-200"
          >
            <Sliders size={buttonSize} />
          </motion.button>
        )
      )}
    </div>
  );
};

export default PlaybackControls;