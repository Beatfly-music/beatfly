import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation, useDragControls } from 'framer-motion';
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
  ChevronDown,
  Share2,
  Sliders,
} from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';
import { useResponsive } from './MainLayout';
import MusicAPI from '../../services/api';
import LocalRecentsAPI from '../../services/localRecentsAPI';

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
      <span className="text-xs text-gray-400 select-none">{formatTime(currentTime)}</span>
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        className={barClass}
      >
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
      <span className="text-xs text-gray-400 select-none">{formatTime(duration)}</span>
    </div>
  );
};

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

/* ─────────────────────────────────────────────── *
 *         AudioVisualizer Component              *
 * ─────────────────────────────────────────────── */
const AudioVisualizer = ({ audioContext, analyserNode }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!analyserNode || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match its display size
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };
    
    resize();
    window.addEventListener('resize', resize);
    
    // Set up analyzer
    analyserNode.fftSize = 256;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Animation function
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyserNode.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, 'rgba(162, 77, 230, 0.8)'); // Bottom color
        gradient.addColorStop(1, 'rgba(124, 58, 237, 0.8)'); // Top color
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [analyserNode]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-24 rounded-lg"
    />
  );
};

/* ─────────────────────────────────────────────── *
 *                  EQ Popup                      *
 * ─────────────────────────────────────────────── */
const EQPopup = ({ showEQ, setShowEQ, isMobile = false }) => {
  const { eqGains, setEqGain, audioContext, analyserNode } = useAudio();
  const frequencies = [60, 230, 910, 3600, 14000]; // From AudioContext.jsx
  const frequencyLabels = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];
  const dragControls = useDragControls();
  
  // Fixed handleSliderChange to ensure proper slider interaction
  const handleSliderChange = (index, event) => {
    const value = parseFloat(event.target.value);
    setEqGain(index, value);
  };
  
  const resetEQ = () => {
    frequencies.forEach((_, index) => {
      setEqGain(index, 0);
    });
  };
  
  const presets = [
    { name: 'Flat', values: [0, 0, 0, 0, 0] },
    { name: 'Bass Boost', values: [6, 3, 0, 0, 0] },
    { name: 'Treble Boost', values: [0, 0, 0, 3, 6] },
    { name: 'Vocal Boost', values: [0, 0, 3, 4, 0] },
    { name: 'Loudness', values: [4, 0, 0, 2, 4] },
  ];
  
  const applyPreset = (preset) => {
    preset.values.forEach((value, index) => {
      setEqGain(index, value);
    });
  };
  
  return (
    <AnimatePresence>
      {showEQ && (
        <motion.div
          className={`fixed z-50 bg-surface/95 backdrop-blur-lg shadow-lg ${
            isMobile 
              ? 'inset-x-0 bottom-0 pb-10 rounded-t-lg' 
              : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-lg p-6'
          }`}
          initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 25 }}
          drag={isMobile ? "y" : false}
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, info) => {
            if (isMobile && info.offset.y > 100) {
              setShowEQ(false);
            }
          }}
        >
          {isMobile && (
            <div 
              className="w-16 h-1 bg-gray-500/30 rounded-full absolute top-2 left-1/2 transform -translate-x-1/2"
              onPointerDown={(e) => dragControls.start(e)}
            />
          )}
          
          <div className="flex justify-between items-center mb-4 px-6 pt-6">
            <h3 className="text-lg font-bold">Equalizer</h3>
            <motion.button
              onClick={() => setShowEQ(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </motion.button>
          </div>
          
          <div className="flex flex-col space-y-6">
            {/* Audio Visualizer */}
            <div className="px-6">
              <AudioVisualizer 
                audioContext={audioContext} 
                analyserNode={analyserNode}
              />
            </div>
            
            {/* EQ Sliders with proper vertical orientation */}
            <div className="flex justify-between items-end h-48 gap-4 px-6">
              {eqGains.map((gain, index) => (
                <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                  <span className="text-xs text-gray-300">{gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}</span>
                  <div className="relative h-36 w-full flex justify-center">
                    <div className="h-full w-1 bg-gray-700 rounded-full relative">
                      {/* Center line (0 dB) */}
                      <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-500"></div>
                      
                      {/* Gain indicator */}
                      <div 
                        className={`absolute w-full ${gain >= 0 ? 'bg-accent' : 'bg-red-500'}`}
                        style={{ 
                          height: `${Math.abs(gain) / 12 * 50}%`,
                          bottom: gain >= 0 ? '50%' : `calc(50% - ${Math.abs(gain) / 12 * 50}%)` 
                        }}
                      ></div>
                      
                      {/* Touch area overlay (bigger touch target) */}
                      <div className="absolute inset-x-0 h-full flex flex-col justify-center">
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="0.1"
                          value={gain}
                          onChange={(e) => handleSliderChange(index, e)}
                          className="w-36 h-full origin-center -rotate-90 absolute opacity-0 cursor-pointer"
                          style={{
                            // Position the range input correctly for proper vertical behavior
                            left: '-70px',
                            top: '0',
                            transformOrigin: 'center',
                            // Make the slider thumb area bigger for easier interaction
                            pointerEvents: 'auto',
                            touchAction: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{frequencyLabels[index]}</span>
                </div>
              ))}
            </div>
            
            {/* Preset Buttons */}
            <div className="px-6">
              <div className="flex flex-wrap gap-2 justify-center">
                {presets.map((preset, index) => (
                  <motion.button
                    key={index}
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {preset.name}
                  </motion.button>
                ))}
                <motion.button
                  onClick={resetEQ}
                  className="px-3 py-1.5 bg-accent hover:bg-accent/80 text-white rounded-full text-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Reset EQ
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────── *
 *                LyricsPanel                     *
 * ─────────────────────────────────────────────── */
const LyricsPanel = ({ showLyrics, setShowLyrics, showExpanded, lyrics, currentTime, isMobile = false }) => {
  const dragControls = useDragControls();
  const panelRef = useRef(null);

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
        const text = line.replace(/\[.*?\]/g, '').trim();
        lyricLines.push({ time: timeInSeconds, text });
      }
    });

    lyricLines.sort((a, b) => a.time - b.time);
    return lyricLines;
  };

  const lyricLines = parseLRC(lyrics);
  const currentLineIndex = lyricLines.findIndex((line, index) => {
    const nextLine = lyricLines[index + 1];
    if (!nextLine) return currentTime >= line.time;
    return currentTime >= line.time && currentTime < nextLine.time;
  });

  // Scroll to current lyric
  useEffect(() => {
    if (showLyrics && currentLineIndex !== -1 && panelRef.current) {
      const lyricsContainer = panelRef.current.querySelector('div.overflow-y-auto');
      const currentLine = lyricsContainer?.children[currentLineIndex];
      
      if (currentLine) {
        currentLine.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentLineIndex, showLyrics]);

  // For mobile drag behavior
  const handleLyricsDragEnd = (e, info) => {
    if (isMobile && info.offset.y > 100) {
      setShowLyrics(false);
    }
  };

  return (
    <AnimatePresence>
      {showLyrics && (
        <motion.div
          ref={panelRef}
          drag={isMobile ? "y" : (!showExpanded && !isMobile ? true : false)}
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleLyricsDragEnd}
          className={`absolute z-50 bg-background/95 backdrop-blur-lg p-4 rounded-lg shadow-lg ${
            isMobile 
              ? 'inset-0 fixed overflow-hidden'
              : showExpanded
                ? 'right-0 top-0 bottom-0 w-1/3'
                : 'bottom-24 left-1/2 transform -translate-x-1/2'
          }`}
          initial={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, x: 50 }}
          animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
          exit={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, x: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="flex justify-between items-center mb-4 select-none">
            {isMobile && (
              <div 
                className="absolute top-1 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gray-500/30 rounded-full"
                onPointerDown={(e) => dragControls.start(e)}
              />
            )}
            <h3 className="text-lg font-bold">Lyrics</h3>
            <motion.button
              onClick={() => setShowLyrics(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={20} />
            </motion.button>
          </div>
          <div className="overflow-y-auto max-h-full space-y-2 pb-8">
            {lyricLines.length > 0 ? (
              lyricLines.map((line, index) => (
                <motion.p
                  key={index}
                  className={`text-sm transition-all duration-300 py-1 select-none ${
                    index === currentLineIndex ? 
                      'text-white font-bold text-base scale-105' : 
                      'text-gray-300'
                  }`}
                  animate={index === currentLineIndex ? {
                    opacity: 1,
                    y: 0
                  } : {
                    opacity: 0.7,
                    y: 0
                  }}
                >
                  {line.text || '...'}
                </motion.p>
              ))
            ) : (
              <p className="text-sm text-gray-300 select-none">No lyrics available.</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────── *
 *           PlaylistSelectorModal                *
 * ─────────────────────────────────────────────── */
const PlaylistSelectorModal = ({ currentTrack, onClose, isMobile = false }) => {
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const modalRef = useRef(null);

  // Custom navigate function that closes expanded player
  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await MusicAPI.getPlaylists();
        const data = response.data.playlists || response.data;
        setPlaylists(data);
        // Initialize selection state
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

  // Close on drag down for mobile
  const handleDragEnd = (e, info) => {
    if (isMobile && info.offset.y > 100) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={modalRef}
          className={`bg-surface p-6 rounded-lg ${isMobile ? 'w-full max-w-sm mx-4' : 'w-full max-w-md'}`}
          initial={{ scale: 0.8, opacity: 0, y: isMobile ? 100 : 0 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: isMobile ? 100 : 0 }}
          transition={{ type: "spring", damping: 25 }}
          drag={isMobile ? "y" : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={isMobile ? { marginBottom: '5rem' } : {}}
        >
          {isMobile && (
            <div className="w-16 h-1 bg-gray-500/30 rounded-full absolute top-2 left-1/2 transform -translate-x-1/2" />
          )}
          
          <h2 className="text-xl font-bold mb-4 select-none">Add to Playlist</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <motion.div 
                className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : error ? (
            <div className="text-red-500 select-none">{error}</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {playlists.map((playlist) => (
                <motion.div
                  key={playlist.id}
                  className="flex items-center justify-between p-2 hover:bg-surface-light rounded-lg group"
                  whileHover={{ x: 5 }}
                >
                  <span
                    className="cursor-pointer hover:text-accent transition-colors select-none"
                    onClick={() => handleNavigate(`/playlist/${playlist.id}`)}
                  >
                    {playlist.name}
                  </span>
                  <input
                    type="checkbox"
                    checked={!!selected[playlist.id]}
                    onChange={() => toggleSelection(playlist.id)}
                    className="ml-4 cursor-pointer w-4 h-4"
                  />
                </motion.div>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-end gap-4">
            <motion.button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 transition select-none"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleSave}
              className="px-4 py-2 rounded bg-accent text-white hover:bg-accent/80 transition select-none"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Save
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────── *
 *               ExpandedPlayer                   *
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
  setShowEQ,
  showEQ,
  onClose,
  setShowPlaylistModal,
  isMobile = false
}) => {
  const navigate = useNavigate();
  const dragControls = useDragControls();
  const dragThreshold = useRef(50); // Threshold for drag to be considered intentional
  const dragStartY = useRef(0); // Track initial drag position
  
  // State for half-screen mode
  const [isDragging, setIsDragging] = useState(false);
  const playerRef = useRef(null);
  const imageRef = useRef(null);
  
  // Custom navigate function that closes expanded player
  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };
  
  // Enhanced touch handling for better discrimination between taps and drags
  const handleDragStart = (e, info) => {
    setIsDragging(true);
    dragStartY.current = info.point.y;
  };
  
  const handleDragEnd = (e, info) => {
    setIsDragging(false);
    
    // Only process drag if it exceeds threshold
    if (Math.abs(info.point.y - dragStartY.current) > dragThreshold.current) {
      if (info.offset.y > 100 && isMobile) {
        onClose(); // Close directly on significant downward drag
      }
    }
  };
  
  // Double tap to like
  const [lastTap, setLastTap] = useState(0);
  const handleTap = (e) => {
    // Only process taps when not actively dragging
    if (isDragging) return;
    
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTap < 300) { // Double tap threshold
      toggleLike();
      
      // Show heart animation
      const heart = document.createElement('div');
      heart.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="${isLiked ? 'none' : 'currentColor'}" 
                          stroke="currentColor" stroke-width="2" class="text-accent">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>`;
      heart.className = 'absolute z-10 pointer-events-none';
      heart.style.top = `calc(${e.clientY}px - 20px)`;
      heart.style.left = `calc(${e.clientX}px - 20px)`;
      document.body.appendChild(heart);
      
      // Animate and remove
      heart.animate([
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(2)', opacity: 0 }
      ], { duration: 700, easing: 'ease-out' });
      
      setTimeout(() => {
        document.body.removeChild(heart);
      }, 700);
    }
    setLastTap(now);
  };

  // For swipe detection
  const handleSwipe = (e, info) => {
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      // Horizontal swipe - change tracks
      if (info.offset.x < -80 && currentTrack) {
        playNext();
        // Add swipe visual feedback
        if (imageRef.current) {
          imageRef.current.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-100%)', opacity: 0 }
          ], { duration: 300, easing: 'ease-out' });
          
          setTimeout(() => {
            imageRef.current.animate([
              { transform: 'translateX(100%)', opacity: 0 },
              { transform: 'translateX(0)', opacity: 1 }
            ], { duration: 300, easing: 'ease-out' });
          }, 50);
        }
      } else if (info.offset.x > 80 && currentTrack) {
        playPrevious();
        // Add swipe visual feedback
        if (imageRef.current) {
          imageRef.current.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(100%)', opacity: 0 }
          ], { duration: 300, easing: 'ease-out' });
          
          setTimeout(() => {
            imageRef.current.animate([
              { transform: 'translateX(-100%)', opacity: 0 },
              { transform: 'translateX(0)', opacity: 1 }
            ], { duration: 300, easing: 'ease-out' });
          }, 50);
        }
      }
    }
  };

  // Mobile expanded player layout with enhanced gesture controls
  if (isMobile) {
    return (
      <motion.div
        ref={playerRef}
        className="fixed inset-0 z-40 bg-gradient-to-b from-surface to-background overflow-hidden user-select-none touch-none"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: "spring", damping: 25 }}
        drag="y"
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Header with drag handle */}
        <div 
          className="flex items-center justify-between p-4 select-none"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-gray-400"
          >
            <ChevronDown size={24} />
          </motion.button>
          
          <div className="w-16 h-1 bg-gray-500/30 rounded-full absolute left-1/2 transform -translate-x-1/2 top-2" />
          
          <div className="text-center">
            <h4 className="text-sm font-medium select-none">Now Playing</h4>
          </div>
          
          <motion.button
            onClick={() => setShowQueue((prev) => !prev)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`${showQueue ? 'text-accent' : 'text-gray-400'}`}
          >
            <ListMusic size={20} />
          </motion.button>
        </div>
        
        {/* Main content */}
        <div className="flex flex-col h-full">
          {/* Album Art with touch/gesture capabilities */}
          <div className="px-8 py-4 art-container">
            <motion.div
              ref={imageRef}
              className="aspect-square w-full mx-auto mb-6 relative select-none"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragEnd={handleSwipe}
              onTap={handleTap}
            >
              <img
                src={getTrackImage() + "?w=576"}
                alt={currentTrack?.title || 'Album Art'}
                className="w-full h-full object-cover rounded-lg shadow-lg pointer-events-none"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/default-album-art.png';
                }}
                draggable="false"
              />
              
              {/* Sweeping loading animation with enhanced visuals */}
              {loading && (
                <>
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1.5,
                      ease: "linear"
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="w-16 h-16 border-3 border-accent/30 border-t-accent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                </>
              )}
              
              {/* Swipe indicators that animate during drag */}
              <motion.div 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                initial={{ opacity: 0, x: -20 }}
                whileDrag={{ opacity: 0.8, x: 0 }}
                transition={{ type: "spring" }}
              >
                <SkipBack size={24} />
              </motion.div>
              
              <motion.div 
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                initial={{ opacity: 0, x: 20 }}
                whileDrag={{ opacity: 0.8, x: 0 }}
                transition={{ type: "spring" }}
              >
                <SkipForward size={24} />
              </motion.div>
              
              {/* Tutorial only shown first time - controlled by localStorage in Player component */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0 }}
                transition={{ delay: 1.5, duration: 0.5 }}
              >
                <div className="text-white text-center select-none">
                  <motion.div
                    className="mx-auto mb-2"
                    animate={{ 
                      scale: [1, 0.8, 1],
                    }}
                    transition={{ 
                      duration: 1, 
                      repeat: 2,
                      repeatType: "loop"
                    }}
                  >
                    <Heart size={32} />
                  </motion.div>
                  <div className="text-sm opacity-80">Double-tap to like</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
          
          {/* Track Info */}
          <div className="px-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex-1 select-none">
                <motion.h2 
                  onClick={() => handleNavigate(`/track/${currentTrack.id}`)}
                  className="text-xl font-bold truncate cursor-pointer hover:text-accent transition-colors"
                  whileHover={{ x: 3 }}
                >
                  {currentTrack?.title}
                </motion.h2>
                <motion.p
                  onClick={() => handleNavigate(`/profile/${currentTrack.artistId}`)}
                  className="text-gray-400 cursor-pointer hover:text-white transition-colors"
                  whileHover={{ x: 3 }}
                >
                  {currentTrack?.artist}
                </motion.p>
              </div>
              
              <div className="flex gap-3">
                <motion.button
                  onClick={toggleLike}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`${isLiked ? 'text-accent' : 'text-gray-400 hover:text-white'}`}
                >
                  <Heart
                    size={20}
                    fill={isLiked ? 'currentColor' : 'none'}
                    className="transition-colors duration-300"
                  />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPlaylistModal(true)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Plus size={20} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Share2 size={20} />
                </motion.button>
              </div>
            </div>
            
            {/* Seek Bar */}
            <SeekBar
              currentTime={currentTime}
              duration={duration}
              onSeek={seek}
              formatTime={formatTime}
              containerClass="w-full flex items-center gap-2 mb-6"
              barClass="relative flex-1 h-1 group cursor-pointer bg-gray-600/50 rounded-full"
              progressClass="absolute inset-y-0 bg-accent transition-colors duration-200"
              thumbClass="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-accent rounded-full shadow-lg -ml-1.5"
            />
            
            {/* Playback Controls */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="flex justify-center w-full gap-4">
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
                  <Shuffle size={20} />
                </motion.button>
                
                <PlaybackControls
                  size="large"
                  isPlaying={isPlaying}
                  loading={loading}
                  currentTrack={currentTrack}
                  playPrevious={playPrevious}
                  togglePlay={togglePlay}
                  playNext={playNext}
                  isMobile={true}
                  onEqClick={() => setShowEQ(true)}
                />
                
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
                    <Repeat1 size={20} />
                  ) : (
                    <Repeat size={20} />
                  )}
                </motion.button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center gap-3 mb-8">
              <motion.button
                onClick={() => setShowLyrics((prev) => !prev)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors select-none ${
                  showLyrics 
                  ? 'bg-accent text-white' 
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {showLyrics ? 'Hide Lyrics' : 'Lyrics'}
              </motion.button>
              
              <motion.button
                onClick={() => setShowEQ((prev) => !prev)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors select-none ${
                  showEQ 
                  ? 'bg-accent text-white' 
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {showEQ ? 'Hide EQ' : 'Equalizer'}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Desktop expanded player layout
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
          backgroundImage: `url(${getTrackImage()+"?w=100"})`,
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

      {/* Main content container */}
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
            src={getTrackImage() + "?w=576"}
            alt={currentTrack?.title || 'Album Art'}
            className="w-full h-full object-cover rounded-lg shadow-2xl"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-album-art.png';
            }}
            draggable="false"
          />
        </motion.div>

        <motion.div
          className="text-center mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-center gap-4">
            <h2
              onClick={() => handleNavigate(`/track/${currentTrack.id}`)}
              className="text-2xl font-bold cursor-pointer hover:text-accent transition-colors"
            >
              {currentTrack?.title}
            </h2>
            <motion.button
              onClick={() => setShowPlaylistModal(true)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Plus size={24} />
            </motion.button>
          </div>
          <p
            onClick={() => handleNavigate(`/profile/${currentTrack.artistId}`)}
            className="text-gray-400 cursor-pointer hover:text-white transition-colors"
          >
            {currentTrack?.artist}
          </p>
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
            
            <motion.button
              onClick={() => setShowEQ((prev) => !prev)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`${showEQ ? 'text-accent' : 'text-gray-400 hover:text-white'}`}
            >
              <Sliders size={24} />
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
  setShowEQ,
  isMobile = false,
}) => {
  const navigate = useNavigate();
  
  // For gesture controls on mobile
  const miniPlayerRef = useRef(null);
  const swipeControls = useAnimation();
  const touchStartTime = useRef(0);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchEndPos = useRef({ x: 0, y: 0 });
  const swipeThreshold = 30; // Minimum pixels to consider a swipe
  const tapThreshold = 200; // Maximum time in ms to consider a tap
  
  // Custom navigate function that doesn't close expanded player
  const handleNavigate = (path) => {
    navigate(path);
  };
  
  // Better touch handling to distinguish between taps and swipes
  const handleTouchStart = (e) => {
    touchStartTime.current = Date.now();
    touchStartPos.current = { 
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };
  
  const handleTouchMove = (e) => {
    touchEndPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };
  
  const handleTouchEnd = (e) => {
    const touchDuration = Date.now() - touchStartTime.current;
    const touchDistance = {
      x: touchEndPos.current.x - touchStartPos.current.x,
      y: touchEndPos.current.y - touchStartPos.current.y
    };
    
    // If it's a short touch and minimal movement, treat as tap
    if (touchDuration < tapThreshold && 
        Math.abs(touchDistance.x) < swipeThreshold &&
        Math.abs(touchDistance.y) < swipeThreshold) {
      // Check if tap was on the play button area
      const target = e.target;
      if (target.closest('.play-button') || target.closest('button')) {
        // Don't expand player when clicking on controls
        return;
      }
      
      setShowExpanded(true);
    } 
    // Handle vertical swipe
    else if (Math.abs(touchDistance.y) > Math.abs(touchDistance.x) && 
             touchDistance.y < -swipeThreshold) {
      setShowExpanded(true);
    }
    // Handle horizontal swipes
    else if (Math.abs(touchDistance.x) > swipeThreshold && currentTrack) {
      if (touchDistance.x < -swipeThreshold) {
        playNext();
      } else if (touchDistance.x > swipeThreshold) {
        playPrevious();
      }
    }
  };
  
  // Double tap to like
  const [lastTap, setLastTap] = useState(0);
  
  const handleTap = (e) => {
    const target = e.target;
    // Don't process taps on control buttons
    if (target.closest('button') || target.closest('.play-button')) {
      return;
    }
    
    const now = Date.now();
    if (now - lastTap < 300 && currentTrack) {
      toggleLike();
      
      // Show heart animation
      miniPlayerRef.current.animate([
        { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
        { backgroundColor: 'rgba(255, 255, 255, 0)' }
      ], { duration: 300, easing: 'ease-out' });
    } else {
      setShowExpanded(true);
    }
    setLastTap(now);
  };

  // Mobile mini player with enhanced gesture support
  if (isMobile) {
    return (
      <motion.div
        ref={miniPlayerRef}
        className="fixed bottom-16 left-0 right-0 h-16 bg-surface/90 backdrop-blur-md border-t border-white/5 px-3 flex items-center z-40 select-none touch-manipulation"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
      >
        {/* Swipe-up indicator */}
        <motion.div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-16 h-1 bg-gray-500/30 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.2, 0.5, 0.2],
            y: [-1, -3, -1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop"
          }}
        />
        
        {/* Track Info & Artwork with swipe controls */}
        <motion.div 
          className="flex items-center flex-1 min-w-0 mr-2"
          animate={swipeControls}
        >
          {currentTrack ? (
            <>
              {/* Loading animation */}
              <motion.div className="relative">
                <img
                  src={getTrackImage() + "?w=40"}
                  alt={currentTrack.title}
                  className="h-10 w-10 rounded object-cover select-none"
                  onError={(e) => {
                    e.target.onerror = null;
                  e.target.src = '/default-album-art.png';
                }}
                draggable="false"
              />
              {loading && (
                <>
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1.5,
                      ease: "linear"
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-black/30 rounded"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                </>
              )}
            </motion.div>
            
            <div className="ml-3 min-w-0 flex-1 select-none">
              <div 
                className="text-sm font-medium truncate"
                onClick={() => handleNavigate(`/track/${currentTrack.id}`)}
              >
                {currentTrack.title}
              </div>
              <div 
                className="text-xs text-gray-400 truncate"
                onClick={() => handleNavigate(`/profile/${currentTrack.artistId}`)}
              >
                {currentTrack.artist}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center text-gray-400 text-sm select-none">
            <Music2 size={18} className="mr-2" />
            Select a track
          </div>
        )}
      </motion.div>
      
      {/* Playback Controls */}
      <div className="flex items-center play-button">
        {currentTrack && (
          <>
            <motion.button
              onClick={(e) => {
                e.stopPropagation(); // Prevent expanding player
                toggleLike();
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`mr-2 ${isLiked ? 'text-accent' : 'text-gray-400'}`}
            >
              <Heart
                size={18}
                fill={isLiked ? 'currentColor' : 'none'}
              />
            </motion.button>
            
            <motion.button
              onClick={(e) => {
                e.stopPropagation(); // Prevent expanding player
                togglePlay();
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <div className="border-2 border-white/30 border-t-white rounded-full animate-spin w-4 h-4" />
              ) : isPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} className="ml-0.5" />
              )}
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}

  // Desktop mini player with improved alignment
  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-surface to-background border-t border-white/5 px-4 flex items-center justify-between z-40"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Track Info - Left section */}
      <div className="w-1/4 flex items-center min-w-0 group">
        {currentTrack ? (
          <>
            <motion.div
              className="relative cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowExpanded(true)}
            >
              <img
                src={getTrackImage() + "?w=56"}
                alt={currentTrack.title || 'Album Art'}
                className="h-14 w-14 rounded-md shadow-lg object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/default-album-art.png';
                }}
                draggable="false"
              />
              <motion.div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                <Maximize2 size={20} className="text-white" />
              </motion.div>
            </motion.div>

            <div className="ml-4 min-w-0">
              <div
                onClick={() => handleNavigate(`/track/${currentTrack.id}`)}
                className="text-sm font-medium truncate hover:text-accent transition-colors cursor-pointer"
              >
                {currentTrack.title}
              </div>
              <div
                onClick={() => handleNavigate(`/profile/${currentTrack.artistId}`)}
                className="text-xs text-gray-400 truncate hover:text-white transition-colors cursor-pointer"
              >
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

      {/* Playback & Seek - Center section */}
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

      {/* Volume, Queue & Controls - Right section */}
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
        
        <motion.button
          onClick={() => setShowEQ((prev) => !prev)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Sliders size={20} />
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
const ErrorToast = ({ error, showExpanded, isMobile = false }) => {
  return (
    <motion.div
      className={`fixed left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50 select-none ${
        isMobile ? 'bottom-36' : (showExpanded ? 'bottom-8' : 'bottom-28')
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
 *                   MobileQueue                  *
 * ─────────────────────────────────────────────── */
const MobileQueue = ({ queue, showQueue, setShowQueue, navigate, removeFromQueue, clearQueue }) => {
  const dragControls = useDragControls();
  
  // Custom navigate function that closes queue
  const handleNavigate = (path) => {
    navigate(path);
    setShowQueue(false);
  };
  
  // For swipe gestures on queue items
  const handleSwipeItem = (index, info) => {
    if (info.offset.x < -80) {
      // Visual feedback with animation
      const element = document.getElementById(`queue-item-${index}`);
      if (element) {
        element.animate([
          { transform: 'translateX(0)', opacity: 1 },
          { transform: 'translateX(-100%)', opacity: 0 }
        ], { duration: 300, easing: 'ease-out' });
        
        // Wait for animation to complete before removing
        setTimeout(() => {
          removeFromQueue(index);
        }, 300);
      } else {
        removeFromQueue(index);
      }
    }
  };
  
  return (
    <AnimatePresence>
      {showQueue && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed left-0 right-0 bottom-0 top-0 bg-background z-40"
          drag="y"
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, info) => {
            if (info.offset.y > 100) {
              setShowQueue(false);
            }
          }}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 select-none">
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
          
          {/* Drag handle indicator */}
          <div 
            className="w-16 h-1 bg-gray-500/30 rounded-full absolute left-1/2 transform -translate-x-1/2 top-2"
            onPointerDown={(e) => dragControls.start(e)}
          />

          <div className="overflow-y-auto h-[calc(100%-128px)] p-2">
            {queue.length > 0 ? (
              queue.map((track, index) => (
                <motion.div
                  id={`queue-item-${index}`}
                  key={`${track.id}-${index}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-light group relative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.8}
                  onDragEnd={(e, info) => handleSwipeItem(index, info)}
                >
                  <img
                    src={
                      track.track_image
                        ? MusicAPI.getImage('albumArt', track.track_image)
                        : '/default-album-art.png'
                    }
                    alt={track.title}
                    className="w-12 h-12 rounded object-cover select-none"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/default-album-art.png';
                    }}
                    draggable="false"
                  />
                  <div className="flex-1 min-w-0 select-none">
                    <div
                      className="font-medium truncate cursor-pointer hover:text-accent transition-colors"
                      onClick={() => handleNavigate(`/track/${track.id}`)}
                    >
                      {track.title}
                    </div>
                    <div
                      className="text-sm text-gray-400 truncate cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleNavigate(`/profile/${track.artistId}`)}
                    >
                      {track.artist}
                    </div>
                  </div>
                  <motion.button
                    onClick={() => removeFromQueue(index)}
                    className="text-gray-400 hover:text-white"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={18} />
                  </motion.button>
                  
                  {/* Swipe to remove hint - appears during drag */}
                  <motion.div 
                    className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500/80 px-3 rounded-r-lg"
                    initial={{ opacity: 0, x: "100%" }}
                    whileDrag={{ opacity: 1, x: 0 }}
                  >
                    <X size={20} className="text-white" />
                  </motion.div>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ListMusic size={48} className="mb-4 opacity-50" />
                <p className="text-sm select-none">Your queue is empty</p>
                <p className="text-xs mt-2 select-none">Add some tracks to get started</p>
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
                className="w-full py-3 rounded-full bg-accent hover:bg-accent/80 transition-colors text-sm font-medium select-none"
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
  );
};

/* ─────────────────────────────────────────────── *
 *                   Main Player                  *
 * ─────────────────────────────────────────────── */
const Player = ({ children }) => {
  // Get responsive state from context
  const { isMobile } = useResponsive();
  const location = useLocation();

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
    eqGains,
    setEqGain,
    audioContext,  // Added for visualizer
    analyserNode   // Added for visualizer
  } = useAudio();

  // Local State
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [prevPath, setPrevPath] = useState(location.pathname);
  const navigate = useNavigate();

  // Close expanded player when navigating to a different route
  useEffect(() => {
    if (location.pathname !== prevPath) {
      setShowExpanded(false);
      setShowQueue(false);
      setShowLyrics(false);
      setShowEQ(false);
      setShowPlaylistModal(false);
      setPrevPath(location.pathname);
    }
  }, [location.pathname, prevPath]);

  // Add a class to prevent text selection throughout the app when using gesture controls
  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('select-none');
      
      // Prevent default touchmove to avoid unwanted scrolling behaviors
      const preventDefaultScroll = (e) => {
        if (e.target.closest('.player-controls') || 
            e.target.closest('.art-container') ||
            showExpanded || showQueue || showLyrics || showEQ) {
          e.preventDefault();
        }
      };
      
      document.addEventListener('touchmove', preventDefaultScroll, { passive: false });
      
      return () => {
        document.body.classList.remove('select-none');
        document.removeEventListener('touchmove', preventDefaultScroll);
      };
    }
  }, [isMobile, showExpanded, showQueue, showLyrics, showEQ]);

  // For detecting background taps on mobile to close expanded views
  const handleBackgroundTap = (e) => {
    if (isMobile && e.target === e.currentTarget) {
      if (showLyrics) setShowLyrics(false);
      else if (showQueue) setShowQueue(false);
      else if (showEQ) setShowEQ(false);
      else if (showExpanded) setShowExpanded(false);
    }
  };

  const formatTime = useCallback((time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Update local recents when track is playing
  useEffect(() => {
    if (currentTrack && isPlaying) {
      LocalRecentsAPI.addRecent(currentTrack).catch((err) =>
        console.error('Error adding to recents:', err)
      );
    }
  }, [currentTrack, isPlaying]);

  // Check if current track is liked
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
      // Optimistic UI update
      setIsLiked(!isLiked);
      
      if (isLiked) {
        await MusicAPI.unfavoriteTrack(currentTrack.id);
      } else {
        await MusicAPI.favoriteTrack(currentTrack.id);
      }
    } catch (err) {
      // Revert on error
      setIsLiked(isLiked);
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
            setShowEQ={setShowEQ}
            showEQ={showEQ}
            onClose={() => setShowExpanded(false)}
            setShowPlaylistModal={setShowPlaylistModal}
            isMobile={isMobile}
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
            setShowEQ={setShowEQ}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/* Queue Panel - Desktop */}
      {!isMobile && (
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
                <h2 className="text-lg font-bold select-none">Play Queue</h2>
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
                        draggable="false"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-medium truncate cursor-pointer hover:text-accent transition-colors"
                          onClick={() => navigate(`/track/${track.id}`)}
                        >
                          {track.title}
                        </div>
                        <div
                          className="text-sm text-gray-400 truncate cursor-pointer hover:text-white transition-colors"
                          onClick={() => navigate(`/profile/${track.artistId}`)}
                        >
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
      )}

      {/* Mobile Queue Panel */}
      {isMobile && (
        <MobileQueue 
          queue={queue}
          showQueue={showQueue}
          setShowQueue={setShowQueue}
          navigate={navigate}
          removeFromQueue={removeFromQueue}
          clearQueue={clearQueue}
        />
      )}

      {/* Playlist Selector Modal */}
      <AnimatePresence>
        {showPlaylistModal && currentTrack && (
          <PlaylistSelectorModal
            currentTrack={currentTrack}
            onClose={() => setShowPlaylistModal(false)}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/* Lyrics Panel */}
      <LyricsPanel
        showLyrics={showLyrics}
        setShowLyrics={setShowLyrics}
        showExpanded={showExpanded}
        lyrics={currentTrack?.lyrics}
        currentTime={currentTime}
        isMobile={isMobile}
      />
      
      {/* EQ Panel with audio visualizer */}
      <EQPopup
        showEQ={showEQ}
        setShowEQ={setShowEQ}
        isMobile={isMobile}
      />

      {/* Error Toast */}
      <AnimatePresence>
        {error && <ErrorToast error={error} showExpanded={showExpanded} isMobile={isMobile} />}
      </AnimatePresence>

      {/* Main Content */}
      <div 
        className={`${!showExpanded ? (isMobile ? 'mb-32' : 'mb-24') : ''}`}
        onClick={handleBackgroundTap}
      >
        {children}
      </div>
    </>
  );
};

export default Player;