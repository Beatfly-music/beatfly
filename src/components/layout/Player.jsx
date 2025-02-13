import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  ListMusic,
  Maximize2,
  Music2,
  X,
  FileText,
  Plus,
} from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';
import MusicAPI from '../../services/api';
import LocalRecentsAPI from '../../services/localRecentsAPI'; // NEW: Import local recents API

/* ─────────────────────────────────────────────── *
 *                   SeekBar                      *
 * ─────────────────────────────────────────────── */
const SeekBar = ({
  currentTime,
  duration,
  onSeek,
  formatTime,
  containerClass,
  barClass,
  progressClass,
  thumbClass,
}) => {
  const barRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(
    duration ? (currentTime / duration) * 100 : 0
  );

  useEffect(() => {
    if (!dragging && duration) {
      setLocalProgress((currentTime / duration) * 100);
    }
  }, [currentTime, duration, dragging]);

  const updateProgress = (clientX) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    let percent = ((clientX - rect.left) / rect.width) * 100;
    percent = Math.max(0, Math.min(percent, 100));
    setLocalProgress(percent);
  };

  const handlePointerDown = (e) => {
    setDragging(true);
    updateProgress(e.clientX);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (dragging) updateProgress(e.clientX);
    };

    const handlePointerUp = (e) => {
      if (dragging && duration) {
        updateProgress(e.clientX);
        setDragging(false);
        const newTime = (localProgress / 100) * duration;
        onSeek(newTime);
      }
    };

    if (dragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, localProgress, duration, onSeek]);

  return (
    <div className={containerClass}>
      <span className="text-xs text-gray-400">{formatTime(currentTime)}</span>
      <div ref={barRef} onPointerDown={handlePointerDown} className={barClass}>
        <motion.div
          className={progressClass}
          style={{ width: `${localProgress}%` }}
        />
        {dragging && (
          <motion.div
            className={thumbClass}
            style={{ left: `${localProgress}%` }}
          />
        )}
      </div>
      <span className="text-xs text-gray-400">{formatTime(duration)}</span>
    </div>
  );
};

/* ─────────────────────────────────────────────── *
 *              PlaybackControls                *
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
}) => {
  const isLarge = size === 'large';
  const buttonSize = isLarge ? 28 : 20;
  const playButtonSize = isLarge ? 32 : 24;
  const containerClass = isLarge ? 'gap-6' : 'gap-4';

  return (
    <div className={`flex items-center ${containerClass}`}>
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
        onClick={togglePlay}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`flex items-center justify-center rounded-full ${
          isLarge ? 'w-16 h-16' : 'w-10 h-10'
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
              isLarge ? 'w-8 h-8' : 'w-5 h-5'
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
    </div>
  );
};

/* ─────────────────────────────────────────────── *
 *                LyricsPanel                   *
 * ─────────────────────────────────────────────── */
const LyricsPanel = ({ showLyrics, setShowLyrics, showExpanded, lyrics, currentTime }) => {
  // Parse LRC lyrics into an array of { time, text }
  const parseLRC = (lrc) => {
    if (!lrc) return [];
    const lines = lrc.split('\n');
    const lyricLines = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;
    lines.forEach((line) => {
      const match = line.match(timeRegex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const millis = match[3] ? parseInt(match[3], 10) : 0;
        const timeInSeconds =
          minutes * 60 + seconds + (millis < 100 ? millis / 100 : millis / 1000);
        // Remove all timestamps from the line
        const text = line.replace(/\[.*?\]/g, '').trim();
        lyricLines.push({ time: timeInSeconds, text });
      }
    });
    lyricLines.sort((a, b) => a.time - b.time);
    return lyricLines;
  };

  const lyricLines = parseLRC(lyrics);

  // Determine the current lyric line index
  const currentLineIndex = lyricLines.findIndex((line, index) => {
    const nextLine = lyricLines[index + 1];
    if (!nextLine) return currentTime >= line.time;
    return currentTime >= line.time && currentTime < nextLine.time;
  });

  return (
    <AnimatePresence>
      {showLyrics && (
        <motion.div
          drag={!showExpanded}
          dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
          className={`absolute z-50 bg-background/95 backdrop-blur-lg p-4 rounded-lg shadow-lg ${
            showExpanded
              ? 'right-0 top-0 bottom-0 w-1/3'
              : 'bottom-24 left-1/2 transform -translate-x-1/2'
          }`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Lyrics</h3>
            <motion.button
              onClick={() => setShowLyrics(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={20} />
            </motion.button>
          </div>
          <div className="overflow-y-auto max-h-full space-y-2">
            {lyricLines.length > 0 ? (
              lyricLines.map((line, index) => (
                <p
                  key={index}
                  className={`text-sm transition-colors duration-200 ${
                    index === currentLineIndex ? 'text-white font-bold' : 'text-gray-300'
                  }`}
                >
                  {line.text || '...'}
                </p>
              ))
            ) : (
              <p className="text-sm text-gray-300">No lyrics available.</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────── *
 *           PlaylistSelectorModal              *
 * ─────────────────────────────────────────────── */
const PlaylistSelectorModal = ({ currentTrack, onClose }) => {
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState({}); // mapping playlistId -> boolean
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await MusicAPI.getPlaylists();
        const data = response.data.playlists || response.data;
        setPlaylists(data);
        // Initialize selection based on whether currentTrack is in each playlist (if available)
        const initialSelected = {};
        data.forEach((playlist) => {
          if (playlist.tracks && Array.isArray(playlist.tracks)) {
            initialSelected[playlist.id] = playlist.tracks.some(
              (t) => (t.id ? t.id === currentTrack.id : t === currentTrack.id)
            );
          } else {
            initialSelected[playlist.id] = false;
          }
        });
        setSelected(initialSelected);
      } catch (err) {
        setError('Failed to fetch playlists');
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, [currentTrack]);

  const toggleSelection = (playlistId) => {
    setSelected((prev) => ({
      ...prev,
      [playlistId]: !prev[playlistId],
    }));
  };

  const handleSave = async () => {
    try {
      await Promise.all(
        playlists.map(async (playlist) => {
          const isSelected = selected[playlist.id];
          const alreadyIn =
            playlist.tracks &&
            Array.isArray(playlist.tracks) &&
            playlist.tracks.some(
              (t) => (t.id ? t.id === currentTrack.id : t === currentTrack.id)
            );
          if (isSelected && !alreadyIn) {
            await MusicAPI.addToPlaylist(playlist.id, currentTrack.id);
          } else if (!isSelected && alreadyIn) {
            await MusicAPI.removeFromPlaylist(playlist.id, currentTrack.id);
          }
        })
      );
      onClose();
    } catch (err) {
      setError('Failed to update playlists');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-surface p-6 rounded-lg w-full max-w-md"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
        >
          <h2 className="text-xl font-bold mb-4">Add to Playlist</h2>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {playlists.map((playlist) => (
                <div key={playlist.id} className="flex items-center justify-between">
                  <span>{playlist.name}</span>
                  <input
                    type="checkbox"
                    checked={!!selected[playlist.id]}
                    onChange={() => toggleSelection(playlist.id)}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded bg-accent text-white hover:bg-accent-dark transition"
            >
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────── *
 *               ExpandedPlayer                 *
 * ─────────────────────────────────────────────── */
const ExpandedPlayer = ({
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
  setShowQueue,
  showQueue,
  showLyrics,
  setShowLyrics,
  onClose,
  setShowPlaylistModal,
}) => {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 z-30"
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{
          scale: showLyrics ? 1.05 : 1.1,
          opacity: 1,
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          backgroundImage: `url(${getTrackImage()})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(20px)',
        }}
      />
      <motion.button
        onClick={onClose}
        className="absolute top-6 right-6 z-50 text-gray-400 hover:text-white"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X size={24} />
      </motion.button>

      {/* Main content container shifts left when lyrics are enabled */}
      <motion.div
        className="relative z-40 max-w-screen-sm w-full px-8"
        animate={{ x: showLyrics ? "-25%" : "0%" }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="aspect-square w-full mb-8"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <img
            src={getTrackImage()}
            alt={currentTrack?.title || 'Album Art'}
            className="w-full h-full object-cover rounded-lg shadow-2xl"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-album-art.png';
            }}
          />
        </motion.div>

        <motion.div
          className="text-center mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-center gap-4">
            <h2 className="text-2xl font-bold">{currentTrack?.title}</h2>
            {/* Add to Playlist button */}
            <motion.button
              onClick={() => setShowPlaylistModal(true)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Plus size={24} />
            </motion.button>
          </div>
          <p className="text-gray-400">{currentTrack?.artist}</p>
        </motion.div>

        <SeekBar
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          formatTime={formatTime}
          containerClass="w-full flex items-center gap-2 mb-8"
          barClass="relative flex-1 h-1.5 group cursor-pointer bg-gray-600/50 rounded-full"
          progressClass="absolute inset-y-0 bg-accent transition-colors duration-200"
          thumbClass="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-accent rounded-full shadow-lg -ml-2"
        />

        <div className="flex flex-col items-center gap-6">
          <PlaybackControls
            size="large"
            isPlaying={isPlaying}
            loading={loading}
            currentTrack={currentTrack}
            toggleShuffle={toggleShuffle}
            playPrevious={playPrevious}
            togglePlay={togglePlay}
            playNext={playNext}
            toggleRepeat={toggleRepeat}
            shuffle={shuffle}
            repeat={repeat}
          />

          <div className="flex items-center gap-4">
            <motion.button
              onClick={toggleLike}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`${isLiked ? 'text-accent' : 'text-gray-400 hover:text-white'}`}
            >
              <Heart
                size={24}
                fill={isLiked ? 'currentColor' : 'none'}
                className="transition-colors duration-300"
              />
            </motion.button>

            <motion.button
              onClick={() => setShowQueue((prev) => !prev)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`${showQueue ? 'text-accent' : 'text-gray-400 hover:text-white'}`}
            >
              <ListMusic size={24} />
            </motion.button>

            <motion.button
              onClick={() => setShowLyrics((prev) => !prev)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`${showLyrics ? 'text-accent' : 'text-gray-400 hover:text-white'}`}
            >
              <FileText size={24} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────── *
 *                   MiniPlayer                   *
 * ─────────────────────────────────────────────── */
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
}) => {
  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-surface to-background border-t border-white/5 px-4 flex items-center z-50"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Track Info */}
      <div className="w-1/4 flex items-center min-w-0 group">
        {currentTrack ? (
          <>
            <motion.div
              className="relative cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowExpanded(true)}
            >
              <img
                src={getTrackImage()}
                alt={currentTrack.title || 'Album Art'}
                className="h-14 w-14 rounded-md shadow-lg object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/default-album-art.png';
                }}
              />
              <motion.div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                <Maximize2 size={20} className="text-white" />
              </motion.div>
            </motion.div>

            <div className="ml-4 min-w-0">
              <div className="text-sm font-medium truncate hover:text-accent transition-colors cursor-pointer">
                {currentTrack.title}
              </div>
              <div className="text-xs text-gray-400 truncate hover:text-white transition-colors cursor-pointer">
                {currentTrack.artist}
              </div>
            </div>

            <motion.button
              onClick={toggleLike}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`ml-4 ${isLiked ? 'text-accent' : 'text-gray-400 hover:text-white'}`}
            >
              <Heart
                size={20}
                fill={isLiked ? 'currentColor' : 'none'}
                className="transition-colors duration-300"
              />
            </motion.button>
          </>
        ) : (
          <div className="flex items-center text-gray-400 text-sm">
            <Music2 size={20} className="mr-2" />
            Select a track to play
          </div>
        )}
      </div>

      {/* Playback & Seek */}
      <div className="flex-1 flex flex-col items-center max-w-2xl px-4">
        <PlaybackControls
          size="small"
          isPlaying={isPlaying}
          loading={loading}
          currentTrack={currentTrack}
          toggleShuffle={toggleShuffle}
          playPrevious={playPrevious}
          togglePlay={togglePlay}
          playNext={playNext}
          toggleRepeat={toggleRepeat}
          shuffle={shuffle}
          repeat={repeat}
        />

        <SeekBar
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          formatTime={formatTime}
          containerClass="w-full flex items-center gap-2 mt-2"
          barClass="relative flex-1 h-1 group cursor-pointer bg-gray-600/50 rounded-full"
          progressClass="absolute inset-y-0 bg-white group-hover:bg-accent transition-colors duration-200"
          thumbClass="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-accent rounded-full shadow-lg -ml-1.5"
        />
      </div>

      {/* Volume, Queue & Lyrics */}
      <div className="w-1/4 flex items-center justify-end gap-4">
        <motion.button
          onClick={() => setShowQueue((prev) => !prev)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`transition-colors ${showQueue ? 'text-accent' : 'text-gray-400 hover:text-white'}`}
        >
          <ListMusic size={20} />
        </motion.button>

        <motion.button
          onClick={() => setShowLyrics((prev) => !prev)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`transition-colors ${showLyrics ? 'text-accent' : 'text-gray-400 hover:text-white'}`}
        >
          <FileText size={20} />
        </motion.button>

        <div className="flex items-center gap-2 group">
          <motion.button
            onClick={toggleMute}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </motion.button>

          <div className="w-24 h-1 bg-gray-600/50 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-white group-hover:bg-accent transition-colors duration-200"
              style={{ width: `${volume * 100}%` }}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────── *
 *                  ErrorToast                    *
 * ─────────────────────────────────────────────── */
const ErrorToast = ({ error, showExpanded }) => {
  return (
    <motion.div
      className={`fixed left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50 ${
        showExpanded ? 'bottom-8' : 'bottom-28'
      }`}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
    >
      {error}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────── *
 *                   Main Player                  *
 * ─────────────────────────────────────────────── */
const Player = ({ children }) => {
  // Audio Context
  const {
    currentTrack,
    isPlaying,
    duration,
    currentTime,
    volume,
    repeat,
    shuffle,
    queue,
    loading,
    error,
    togglePlay,
    seek,
    setVolume,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    removeFromQueue,
    clearQueue,
  } = useAudio();

  // Local State
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

  const formatTime = useCallback((time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // NEW: Update local recents whenever a track is playing
  useEffect(() => {
    if (currentTrack && isPlaying) {
      LocalRecentsAPI.addRecent(currentTrack).catch((err) =>
        console.error('Error adding to recents:', err)
      );
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    const checkIfLiked = async () => {
      if (!currentTrack) return;
      try {
        const response = await MusicAPI.getFavoriteTracks();
        setIsLiked(response.data.tracks.some((t) => t.id === currentTrack.id));
      } catch (err) {
        console.error('Error checking favorite status:', err);
      }
    };
    checkIfLiked();
  }, [currentTrack]);

  const toggleLike = async () => {
    if (!currentTrack) return;
    try {
      if (isLiked) {
        await MusicAPI.unfavoriteTrack(currentTrack.id);
        setIsLiked(false);
      } else {
        await MusicAPI.favoriteTrack(currentTrack.id);
        setIsLiked(true);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleVolumeChange = useCallback(
    (e) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
      if (newVolume > 0) {
        setPrevVolume(newVolume);
      }
    },
    [setVolume]
  );

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume, prevVolume, setVolume]);

  const getTrackImage = useCallback(() => {
    if (!currentTrack) return '/default-album-art.png';
    const imagePath = currentTrack.track_image || currentTrack.album_art;
    if (!imagePath) return '/default-album-art.png';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    return MusicAPI.getImage('albumArt', imagePath);
  }, [currentTrack]);

  return (
    <>
      {/* Expanded Player */}
      <AnimatePresence>
        {showExpanded && (
          <ExpandedPlayer
            currentTrack={currentTrack}
            getTrackImage={getTrackImage}
            formatTime={formatTime}
            currentTime={currentTime}
            duration={duration}
            seek={seek}
            togglePlay={togglePlay}
            playNext={playNext}
            playPrevious={playPrevious}
            toggleShuffle={toggleShuffle}
            toggleRepeat={toggleRepeat}
            shuffle={shuffle}
            repeat={repeat}
            loading={loading}
            isPlaying={isPlaying}
            isLiked={isLiked}
            toggleLike={toggleLike}
            setShowQueue={setShowQueue}
            showQueue={showQueue}
            showLyrics={showLyrics}
            setShowLyrics={setShowLyrics}
            onClose={() => setShowExpanded(false)}
            setShowPlaylistModal={setShowPlaylistModal}
          />
        )}
      </AnimatePresence>

      {/* Mini Player */}
      <AnimatePresence>
        {!showExpanded && (
          <MiniPlayer
            currentTrack={currentTrack}
            getTrackImage={getTrackImage}
            formatTime={formatTime}
            currentTime={currentTime}
            duration={duration}
            seek={seek}
            togglePlay={togglePlay}
            playNext={playNext}
            playPrevious={playPrevious}
            toggleShuffle={toggleShuffle}
            toggleRepeat={toggleRepeat}
            shuffle={shuffle}
            repeat={repeat}
            loading={loading}
            isPlaying={isPlaying}
            isLiked={isLiked}
            toggleLike={toggleLike}
            setShowExpanded={setShowExpanded}
            setShowQueue={setShowQueue}
            showQueue={showQueue}
            volume={volume}
            handleVolumeChange={handleVolumeChange}
            toggleMute={toggleMute}
            isMuted={isMuted}
            showLyrics={showLyrics}
            setShowLyrics={setShowLyrics}
          />
        )}
      </AnimatePresence>

      {/* Queue Panel */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed right-0 top-0 w-80 bg-surface border-l border-white/5 overflow-hidden z-40 ${
              showExpanded ? 'bottom-0' : 'bottom-24'
            }`}
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Play Queue</h2>
              <motion.button
                onClick={() => setShowQueue(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </motion.button>
            </div>

            <div className="overflow-y-auto h-full p-2">
              {queue.length > 0 ? (
                queue.map((track, index) => (
                  <motion.div
                    key={`${track.id}-${index}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-light group relative"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <img
                      src={
                        track.track_image
                          ? MusicAPI.getImage('albumArt', track.track_image)
                          : '/default-album-art.png'
                      }
                      alt={track.title}
                      className="w-10 h-10 rounded object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/default-album-art.png';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{track.title}</div>
                      <div className="text-sm text-gray-400 truncate">
                        {track.artist}
                      </div>
                    </div>
                    <motion.button
                      onClick={() => removeFromQueue(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={16} />
                    </motion.button>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ListMusic size={48} className="mb-4 opacity-50" />
                  <p className="text-sm">Your queue is empty</p>
                  <p className="text-xs mt-2">Add some tracks to get started</p>
                </div>
              )}
            </div>

            {queue.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-surface border-t border-white/5">
                <motion.button
                  onClick={() => {
                    clearQueue();
                    setShowQueue(false);
                  }}
                  className="w-full py-2 px-4 rounded-full bg-accent hover:bg-accent/80 transition-colors text-sm font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Clear Queue
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist Selector Modal */}
      <AnimatePresence>
        {showPlaylistModal && currentTrack && (
          <PlaylistSelectorModal
            currentTrack={currentTrack}
            onClose={() => setShowPlaylistModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Lyrics Panel */}
      <LyricsPanel
        showLyrics={showLyrics}
        setShowLyrics={setShowLyrics}
        showExpanded={showExpanded}
        lyrics={currentTrack?.lyrics}   // LRC lyrics from current track
        currentTime={currentTime}         // Pass current playback time
      />

      {/* Error Toast */}
      <AnimatePresence>
        {error && <ErrorToast error={error} showExpanded={showExpanded} />}
      </AnimatePresence>
    </>
  );
};

export default Player;
