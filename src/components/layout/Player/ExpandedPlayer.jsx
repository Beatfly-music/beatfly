import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Heart,
  ListMusic,
  Share2,
  Plus,
  Pause,
  Play,
  X,
  Sliders,
  FileText,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  Music,
  Sparkles,
  Activity,
  BarChart2,
  Radio,
  Disc,
  Waves
} from 'lucide-react';
import SeekBar from './SeekBar';
import AudioVisualizer from './AudioVisualizer';

// Separate component for visualizer to prevent re-renders
const VisualizerWrapper = React.memo(({
  audioContext,
  analyzerNode,
  type,
  colors,
  settings,
  style
}) => {
  return (
    <AudioVisualizer
    audioContext={audioContext}
    analyzerNode={analyzerNode}
    type={type}
    colors={colors}
    settings={settings}
    style={style}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.type === nextProps.type &&
    JSON.stringify(prevProps.colors) === JSON.stringify(nextProps.colors) &&
    JSON.stringify(prevProps.settings) === JSON.stringify(nextProps.settings) &&
    prevProps.audioContext === nextProps.audioContext &&
    prevProps.analyzerNode === nextProps.analyzerNode
  );
});

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
    isMobile = false,
    audioContext,
    analyzerNode,
}) => {
  const navigate = useNavigate();

  // State Management with refs for visualizer to prevent re-renders
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [vizType, setVizType] = useState('bars');
  const [activePreset, setActivePreset] = useState('Default');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Use refs for frequently changing values
  const vizSettingsRef = useRef({
    mirror: false,
    reactive: true,
    smoothing: 0.8,
    gradient: true,
    count: 64,
    speed: 1,
    connections: false,
    rotation: true,
  });

  // State for UI updates
  const [vizSettingsState, setVizSettingsState] = useState(vizSettingsRef.current);

  // Visualization Types
  const visualizationTypes = [
    { id: 'bars', icon: BarChart2, name: 'Bars' },
    { id: 'waveform', icon: Waves, name: 'Wave' },
    { id: 'radial', icon: Radio, name: 'Radial' },
    { id: 'particles', icon: Sparkles, name: 'Particles' },
    { id: 'circular', icon: Disc, name: 'Circular' },
    { id: 'spectrum', icon: Activity, name: 'Spectrum' }
  ];

  // Color Presets
  const colorPresets = {
    'Default': {
      bars: ['#00D9FF', '#00FF88', '#FF006E'],
      waveform: ['#FF006E', '#00D9FF'],
      radial: ['#00FF88', '#FFE600', '#FF006E'],
      particles: ['#00D9FF', '#FF006E', '#00FF88'],
      circular: ['#00D9FF', '#00FF88'],
      spectrum: ['#FF006E', '#00D9FF', '#00FF88', '#FFE600'],
    },
    'Neon': {
      bars: ['#FF00FF', '#00FFFF', '#FFFF00'],
      waveform: ['#FF00FF', '#00FFFF'],
      radial: ['#FF00FF', '#00FFFF', '#FFFF00'],
      particles: ['#FF00FF', '#00FFFF', '#FFFF00'],
      circular: ['#FF00FF', '#00FFFF'],
      spectrum: ['#FF00FF', '#00FFFF', '#FFFF00', '#00FF00'],
    },
    'Sunset': {
      bars: ['#FF6B6B', '#FFE66D', '#FF6B6B'],
      waveform: ['#FF6B6B', '#FFE66D'],
      radial: ['#FF6B6B', '#FFE66D', '#4ECDC4'],
      particles: ['#FF6B6B', '#FFE66D', '#4ECDC4'],
      circular: ['#FF6B6B', '#FFE66D'],
      spectrum: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#FF8E53'],
    },
    'Ocean': {
      bars: ['#0066CC', '#00CCCC', '#00CC66'],
      waveform: ['#0066CC', '#00CCCC'],
      radial: ['#0066CC', '#00CCCC', '#00CC66'],
      particles: ['#0066CC', '#00CCCC', '#00CC66'],
      circular: ['#0066CC', '#00CCCC'],
      spectrum: ['#0066CC', '#00CCCC', '#00CC66', '#0099CC'],
    }
  };

  // Memoize current colors
  const currentColors = useMemo(() => {
    return colorPresets[activePreset] || colorPresets['Default'];
  }, [activePreset]);

  // Update visualization type
  const handleVizTypeChange = useCallback((newType) => {
    console.log('Changing visualization type to:', newType);
    setVizType(newType);
  }, []);

  // Update settings with debouncing for smooth interaction
  const updateSettingsDebounced = useRef(null);

  const handleSettingChange = useCallback((key, value) => {
    console.log('Updating setting:', key, value);

    // Update ref immediately for visualizer
    vizSettingsRef.current = {
      ...vizSettingsRef.current,
      [key]: value
    };

    // Debounce state update for UI
    if (updateSettingsDebounced.current) {
      clearTimeout(updateSettingsDebounced.current);
    }

    updateSettingsDebounced.current = setTimeout(() => {
      setVizSettingsState({...vizSettingsRef.current});
    }, 50);
  }, []);

  // Apply preset
  const handlePresetChange = useCallback((presetName) => {
    console.log('Applying preset:', presetName);
    setActivePreset(presetName);
  }, []);

  // Navigation handler
  const handleNavigate = useCallback((path) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  // Share functionality
  const handleShare = useCallback(() => {
    if (navigator.share && currentTrack) {
      navigator.share({
        title: currentTrack.title,
        text: `Listen to ${currentTrack.title} by ${currentTrack.artist}`,
        url: window.location.href
      }).catch(() => setShowShareMenu(true));
    } else {
      setShowShareMenu(true);
    }
  }, [currentTrack]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareMenu(false);
  }, []);

  // Double tap to like functionality
  const lastTapRef = useRef(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      toggleLike();
    }
    lastTapRef.current = now;
  }, [toggleLike]);

  // Visualizer Controls Component - Memoized to prevent re-renders
  const VisualizerControls = React.memo(() => {
    return (
      <div className="h-full flex flex-col">
      {/* Visualization Types */}
      <div className="mb-6">
      <h4 className="text-sm font-medium text-white/60 mb-3">Visualization Type</h4>
      <div className="grid grid-cols-3 gap-2">
      {visualizationTypes.map(({ id, icon: Icon, name }) => (
        <button
        key={id}
        onClick={() => handleVizTypeChange(id)}
        className={`relative p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all duration-200 ${
          vizType === id
          ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
        }`}
        >
        <Icon size={20} />
        <span className="text-xs font-medium">{name}</span>
        </button>
      ))}
      </div>
      </div>

      {/* Color Presets */}
      <div className="mb-6">
      <h4 className="text-sm font-medium text-white/60 mb-3">Color Presets</h4>
      <div className="grid grid-cols-2 gap-2">
      {Object.keys(colorPresets).map((presetName) => (
        <button
        key={presetName}
        onClick={() => handlePresetChange(presetName)}
        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          activePreset === presetName
          ? 'bg-white/20 text-white ring-2 ring-white/30'
          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
        }`}
        >
        {presetName}
        </button>
      ))}
      </div>
      </div>

      {/* Settings */}
      <div className="flex-1 overflow-y-auto">
      <h4 className="text-sm font-medium text-white/60 mb-4">Settings</h4>
      <div className="space-y-5">
      {/* Mirror Effect Toggle */}
      <div className="flex items-center justify-between">
      <span className="text-sm text-white/70">Mirror Effect</span>
      <button
      type="button"
      role="switch"
      aria-checked={vizSettingsState.mirror}
      onClick={() => handleSettingChange('mirror', !vizSettingsState.mirror)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        vizSettingsState.mirror ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-white/20'
      }`}
      >
      <span
      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
        vizSettingsState.mirror ? 'translate-x-5' : 'translate-x-0'
      }`}
      />
      </button>
      </div>

      {/* Reactive Toggle */}
      <div className="flex items-center justify-between">
      <span className="text-sm text-white/70">Reactive</span>
      <button
      type="button"
      role="switch"
      aria-checked={vizSettingsState.reactive}
      onClick={() => handleSettingChange('reactive', !vizSettingsState.reactive)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        vizSettingsState.reactive ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-white/20'
      }`}
      >
      <span
      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
        vizSettingsState.reactive ? 'translate-x-5' : 'translate-x-0'
      }`}
      />
      </button>
      </div>

      {/* Smoothing Slider */}
      <div className="space-y-2">
      <div className="flex items-center justify-between">
      <span className="text-sm text-white/70">Smoothing</span>
      <span className="text-xs text-white/50 font-mono">
      {Math.round(vizSettingsState.smoothing * 100)}%
      </span>
      </div>
      <div className="relative h-2">
      <div className="absolute inset-0 bg-white/10 rounded-full" />
      <div
      className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-200"
      style={{ width: `${(vizSettingsState.smoothing - 0.5) / 0.45 * 100}%` }}
      />
      <input
      type="range"
      min="0.5"
      max="0.95"
      step="0.05"
      value={vizSettingsState.smoothing}
      onChange={(e) => handleSettingChange('smoothing', parseFloat(e.target.value))}
      className="absolute inset-0 w-full opacity-0 cursor-pointer"
      style={{ WebkitAppearance: 'none' }}
      />
      <div
      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 pointer-events-none"
      style={{ left: `calc(${(vizSettingsState.smoothing - 0.5) / 0.45 * 100}% - 8px)` }}
      />
      </div>
      </div>

      {/* Type-specific settings */}
      {vizType === 'bars' && (
        <>
        <div className="space-y-2">
        <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">Bar Count</span>
        <span className="text-xs text-white/50 font-mono">{vizSettingsState.count}</span>
        </div>
        <div className="relative h-2">
        <div className="absolute inset-0 bg-white/10 rounded-full" />
        <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-200"
        style={{ width: `${(vizSettingsState.count - 16) / 112 * 100}%` }}
        />
        <input
        type="range"
        min="16"
        max="128"
        step="8"
        value={vizSettingsState.count}
        onChange={(e) => handleSettingChange('count', parseInt(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
        style={{ WebkitAppearance: 'none' }}
        />
        <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 pointer-events-none"
        style={{ left: `calc(${(vizSettingsState.count - 16) / 112 * 100}% - 8px)` }}
        />
        </div>
        </div>

        <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">Gradient</span>
        <button
        type="button"
        role="switch"
        aria-checked={vizSettingsState.gradient}
        onClick={() => handleSettingChange('gradient', !vizSettingsState.gradient)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          vizSettingsState.gradient ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-white/20'
        }`}
        >
        <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
          vizSettingsState.gradient ? 'translate-x-5' : 'translate-x-0'
        }`}
        />
        </button>
        </div>
        </>
      )}

      {vizType === 'particles' && (
        <>
        <div className="space-y-2">
        <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">Particle Count</span>
        <span className="text-xs text-white/50 font-mono">{vizSettingsState.count}</span>
        </div>
        <div className="relative h-2">
        <div className="absolute inset-0 bg-white/10 rounded-full" />
        <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-200"
        style={{ width: `${(vizSettingsState.count - 50) / 150 * 100}%` }}
        />
        <input
        type="range"
        min="50"
        max="200"
        step="10"
        value={vizSettingsState.count}
        onChange={(e) => handleSettingChange('count', parseInt(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
        style={{ WebkitAppearance: 'none' }}
        />
        <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 pointer-events-none"
        style={{ left: `calc(${(vizSettingsState.count - 50) / 150 * 100}% - 8px)` }}
        />
        </div>
        </div>

        <div className="space-y-2">
        <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">Speed</span>
        <span className="text-xs text-white/50 font-mono">{vizSettingsState.speed.toFixed(1)}x</span>
        </div>
        <div className="relative h-2">
        <div className="absolute inset-0 bg-white/10 rounded-full" />
        <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-200"
        style={{ width: `${(vizSettingsState.speed - 0.1) / 1.9 * 100}%` }}
        />
        <input
        type="range"
        min="0.1"
        max="2"
        step="0.1"
        value={vizSettingsState.speed}
        onChange={(e) => handleSettingChange('speed', parseFloat(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
        style={{ WebkitAppearance: 'none' }}
        />
        <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 pointer-events-none"
        style={{ left: `calc(${(vizSettingsState.speed - 0.1) / 1.9 * 100}% - 8px)` }}
        />
        </div>
        </div>

        <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">Connections</span>
        <button
        type="button"
        role="switch"
        aria-checked={vizSettingsState.connections}
        onClick={() => handleSettingChange('connections', !vizSettingsState.connections)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          vizSettingsState.connections ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-white/20'
        }`}
        >
        <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
          vizSettingsState.connections ? 'translate-x-5' : 'translate-x-0'
        }`}
        />
        </button>
        </div>
        </>
      )}

      {(vizType === 'radial' || vizType === 'circular') && (
        <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">Rotation</span>
        <button
        type="button"
        role="switch"
        aria-checked={vizSettingsState.rotation}
        onClick={() => handleSettingChange('rotation', !vizSettingsState.rotation)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          vizSettingsState.rotation ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-white/20'
        }`}
        >
        <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
          vizSettingsState.rotation ? 'translate-x-5' : 'translate-x-0'
        }`}
        />
        </button>
        </div>
      )}
      </div>
      </div>
      </div>
    );
  });

  // Get track image with fallback
  const trackImage = useCallback(() => {
    try {
      return getTrackImage ? getTrackImage() : '/default-album.jpg';
    } catch (error) {
      console.error('Error getting track image:', error);
      return '/default-album.jpg';
    }
  }, [getTrackImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateSettingsDebounced.current) {
        clearTimeout(updateSettingsDebounced.current);
      }
    };
  }, []);

  // MOBILE LAYOUT
  if (isMobile) {
    return (
      <>
      <motion.div
      className="fixed inset-0 z-40 bg-gradient-to-b from-gray-900 via-black to-black"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
      {/* Background Effect */}
      <div className="absolute inset-0 opacity-30">
      <div
      className="absolute inset-0"
      style={{
        backgroundImage: imageLoaded ? `url(${trackImage()})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(80px)',
            transform: 'scale(1.2)'
      }}
      />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4">
      <button
      onClick={onClose}
      className="p-2 -m-2 rounded-full hover:bg-white/10"
      >
      <ChevronDown size={24} className="text-white/70" />
      </button>

      <div className="text-center">
      <p className="text-xs text-white/60 uppercase tracking-wider">Now Playing</p>
      {currentTrack?.album && (
        <p className="text-sm text-white/80 font-medium mt-1">
        {currentTrack.album}
        </p>
      )}
      </div>

      <button
      onClick={() => setShowQueue(!showQueue)}
      className={`p-2 -m-2 rounded-full hover:bg-white/10 ${
        showQueue ? 'text-accent' : 'text-white/70'
      }`}
      >
      <ListMusic size={24} />
      </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 pb-6">
      {/* Album Art */}
      <div className="flex-1 flex items-center justify-center py-4">
      <div
      className="relative w-full max-w-sm aspect-square"
      onDoubleClick={handleDoubleTap}
      >
      <div className="absolute inset-0 bg-black/20 rounded-2xl blur-2xl transform translate-y-4" />

      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-900">
      <img
      src={trackImage()}
      alt={currentTrack?.title}
      className="w-full h-full object-cover"
      onLoad={() => setImageLoaded(true)}
      onError={(e) => {
        e.target.src = '/default-album.jpg';
      }}
      />

      {/* Visualizer Overlay */}
      {analyzerNode && audioContext && isPlaying && !loading && (
        <div className="absolute inset-0 pointer-events-none">
        <VisualizerWrapper
        audioContext={audioContext}
        analyzerNode={analyzerNode}
        type={vizType}
        colors={currentColors}
        settings={vizSettingsRef.current}
        style={{ height: '100%', width: '100%', opacity: 0.8 }}
        />
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
        <div className="w-16 h-16 border-3 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}
      </div>
      </div>
      </div>

      {/* Track Info & Controls */}
      <div className="space-y-4">
      {/* Track Info */}
      <div className="text-center">
      <h1 className="text-2xl font-bold text-white line-clamp-1">
      {currentTrack?.title || 'Unknown Track'}
      </h1>
      <p className="text-lg text-white/60 line-clamp-1">
      {currentTrack?.artist || 'Unknown Artist'}
      </p>
      </div>

      {/* Progress Bar */}
      <SeekBar
      currentTime={currentTime}
      duration={duration}
      onSeek={seek}
      formatTime={formatTime}
      containerClass="w-full"
      barClass="relative h-1 bg-white/10 rounded-full mt-2 mb-1"
      progressClass="absolute inset-y-0 bg-white rounded-full"
      thumbClass="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg -ml-2"
      />

      {/* Playback Controls */}
      <div className="flex items-center justify-between px-4">
      <button
      onClick={toggleLike}
      className="p-2"
      >
      <Heart
      size={24}
      className={isLiked ? 'text-pink-500 fill-current' : 'text-white/60'}
      />
      </button>

      <div className="flex items-center gap-6">
      <button
      onClick={toggleShuffle}
      className={shuffle ? 'text-accent' : 'text-white/60'}
      >
      <Shuffle size={20} />
      </button>

      <button
      onClick={playPrevious}
      disabled={!currentTrack}
      className="disabled:opacity-50"
      >
      <SkipBack size={24} className="text-white" />
      </button>

      <button
      onClick={togglePlay}
      className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl"
      disabled={!currentTrack || loading}
      >
      {loading ? (
        <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
      ) : isPlaying ? (
        <Pause size={24} className="text-black" />
      ) : (
        <Play size={24} className="text-black ml-1" />
      )}
      </button>

      <button
      onClick={playNext}
      disabled={!currentTrack}
      className="disabled:opacity-50"
      >
      <SkipForward size={24} className="text-white" />
      </button>

      <button
      onClick={toggleRepeat}
      className={repeat !== 'none' ? 'text-accent' : 'text-white/60'}
      >
      {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
      </button>
      </div>

      <button
      onClick={handleShare}
      className="p-2"
      >
      <Share2 size={24} className="text-white/60" />
      </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-3 pt-2">
      <button
      onClick={() => setShowPlaylistModal(true)}
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 backdrop-blur-sm"
      >
      <Plus size={20} className="text-white/70" />
      <span className="text-xs text-white/50">Playlist</span>
      </button>

      <button
      onClick={() => setShowLyrics(!showLyrics)}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl backdrop-blur-sm ${
        showLyrics ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/70'
      }`}
      >
      <FileText size={20} />
      <span className="text-xs">Lyrics</span>
      </button>

      <button
      onClick={() => setShowEQ(!showEQ)}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl backdrop-blur-sm ${
        showEQ ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/70'
      }`}
      >
      <Sliders size={20} />
      <span className="text-xs">EQ</span>
      </button>

      <button
      onClick={() => setShowVisualizer(true)}
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 backdrop-blur-sm"
      >
      <Activity size={20} className="text-white/70" />
      <span className="text-xs text-white/50">Visual</span>
      </button>
      </div>
      </div>
      </div>
      </motion.div>

      {/* Mobile Visualizer Modal */}
      <AnimatePresence>
      {showVisualizer && (
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
        >
        <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white">Visualizer</h2>
        <button
        onClick={() => setShowVisualizer(false)}
        className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
        <X size={24} className="text-white" />
        </button>
        </div>

        {/* Visualizer */}
        <div className="flex-1 p-4">
        {analyzerNode && audioContext ? (
          <VisualizerWrapper
          audioContext={audioContext}
          analyzerNode={analyzerNode}
          type={vizType}
          colors={currentColors}
          settings={vizSettingsRef.current}
          style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
          <p className="text-white/50">No audio data available</p>
          </div>
        )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-white/10 max-h-[40vh] overflow-y-auto">
        <VisualizerControls />
        </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Share Menu */}
      <AnimatePresence>
      {showShareMenu && (
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={() => setShowShareMenu(false)}
        >
        <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        >
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
        <h3 className="text-lg font-bold text-white mb-4">Share Track</h3>
        <div className="space-y-3">
        <button
        onClick={copyLink}
        className="w-full p-4 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-colors"
        >
        Copy Link
        </button>
        <button
        onClick={() => setShowShareMenu(false)}
        className="w-full p-3 text-white/60"
        >
        Cancel
        </button>
        </div>
        </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      </>
    );
  }

  // DESKTOP LAYOUT
  return (
    <>
    <motion.div
    className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    >
    {/* Background */}
    <div className="absolute inset-0">
    <div
    className="absolute inset-0 opacity-20"
    style={{
      backgroundImage: imageLoaded ? `url(${trackImage()})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(100px) saturate(200%)',
          transform: 'scale(1.1)'
    }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
    </div>

    {/* Close button */}
    <button
    onClick={onClose}
    className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
    >
    <X size={24} className="text-white" />
    </button>

    {/* Main content */}
    <div className="relative z-10 h-full flex items-center justify-center p-8">
    <div className="w-full max-w-7xl flex gap-12 items-center">
    {/* Left side - Album art */}
    <div className="flex-shrink-0">
    <div className="relative w-[450px] h-[450px] group">
    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-3xl transform translate-y-8 scale-95" />

    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">
    <img
    src={trackImage()}
    alt={currentTrack?.title}
    className="w-full h-full object-cover"
    onLoad={() => setImageLoaded(true)}
    onError={(e) => {
      e.target.src = '/default-album.jpg';
    }}
    />

    {/* Visualizer overlay */}
    {analyzerNode && audioContext && isPlaying && !loading && (
      <div className="absolute inset-0 pointer-events-none">
      <VisualizerWrapper
      audioContext={audioContext}
      analyzerNode={analyzerNode}
      type={vizType}
      colors={currentColors}
      settings={vizSettingsRef.current}
      style={{ height: '100%', width: '100%', opacity: 0.7 }}
      />
      </div>
    )}

    {/* Hover overlay */}
    <div
    className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
    onClick={toggleLike}
    >
    <Heart
    size={60}
    className={isLiked ? 'text-pink-500 fill-current' : 'text-white/60'}
    />
    </div>

    {/* Loading overlay */}
    {loading && (
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
      <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )}
    </div>
    </div>
    </div>

    {/* Right side - Controls */}
    <div className="flex-1 max-w-xl">
    {/* Track info */}
    <div className="mb-8">
    <h1
    onClick={() => handleNavigate(`/track/${currentTrack?.id}`)}
    className="text-5xl font-bold text-white mb-3 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-600 transition-all cursor-pointer line-clamp-2"
    >
    {currentTrack?.title || 'Unknown Track'}
    </h1>
    <p
    onClick={() => handleNavigate(`/artist/${currentTrack?.artistId}`)}
    className="text-2xl text-white/60 hover:text-white/80 transition-colors cursor-pointer"
    >
    {currentTrack?.artist || 'Unknown Artist'}
    </p>
    {currentTrack?.album && (
      <p className="text-lg text-white/40 mt-2">
      {currentTrack.album}
      </p>
    )}
    </div>

    {/* Progress bar */}
    <SeekBar
    currentTime={currentTime}
    duration={duration}
    onSeek={seek}
    formatTime={formatTime}
    containerClass="w-full mb-8"
    barClass="relative h-2 bg-white/10 rounded-full group cursor-pointer my-2"
    progressClass="absolute inset-y-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full"
    thumbClass="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg -ml-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
    />

    {/* Main controls */}
    <div className="flex items-center justify-center gap-6 mb-10">
    <button
    onClick={toggleShuffle}
    className={`p-3 rounded-full transition-all ${
      shuffle
      ? 'text-white bg-gradient-to-r from-pink-500/20 to-purple-600/20 shadow-lg'
      : 'text-white/60 hover:text-white hover:bg-white/10'
    }`}
    >
    <Shuffle size={22} />
    </button>

    <button
    onClick={playPrevious}
    className="p-3 text-white hover:bg-white/10 rounded-full transition-all"
    disabled={!currentTrack}
    >
    <SkipBack size={32} />
    </button>

    <button
    onClick={togglePlay}
    className="relative w-24 h-24 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:shadow-pink-500/25 transition-all"
    disabled={!currentTrack || loading}
    >
    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-xl opacity-50" />
    {loading ? (
      <div className="relative w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
    ) : isPlaying ? (
      <Pause size={36} className="relative" />
    ) : (
      <Play size={36} className="relative ml-1" />
    )}
    </button>

    <button
    onClick={playNext}
    className="p-3 text-white hover:bg-white/10 rounded-full transition-all"
    disabled={!currentTrack}
    >
    <SkipForward size={32} />
    </button>

    <button
    onClick={toggleRepeat}
    className={`p-3 rounded-full transition-all ${
      repeat !== 'none'
      ? 'text-white bg-gradient-to-r from-pink-500/20 to-purple-600/20 shadow-lg'
      : 'text-white/60 hover:text-white hover:bg-white/10'
    }`}
    >
    {repeat === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
    </button>
    </div>

    {/* Secondary controls */}
    <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
    <button
    onClick={toggleLike}
    className={`p-3 rounded-full transition-all ${
      isLiked
      ? 'text-pink-500 bg-pink-500/20'
      : 'text-white/60 hover:text-white hover:bg-white/10'
    }`}
    >
    <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
    </button>

    <button
    onClick={() => setShowPlaylistModal(true)}
    className="p-3 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-all"
    >
    <Plus size={24} />
    </button>

    <button
    onClick={handleShare}
    className="p-3 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-all"
    >
    <Share2 size={24} />
    </button>
    </div>

    <div className="flex items-center gap-2">
    <button
    onClick={() => setShowQueue(!showQueue)}
    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
      showQueue
      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
      : 'bg-white/10 text-white hover:bg-white/20'
    }`}
    >
    <ListMusic size={18} className="inline mr-2" />
    Queue
    </button>

    <button
    onClick={() => setShowLyrics(!showLyrics)}
    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
      showLyrics
      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
      : 'bg-white/10 text-white hover:bg-white/20'
    }`}
    >
    <FileText size={18} className="inline mr-2" />
    Lyrics
    </button>

    <button
    onClick={() => setShowEQ(!showEQ)}
    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
      showEQ
      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
      : 'bg-white/10 text-white hover:bg-white/20'
    }`}
    >
    <Sliders size={18} className="inline mr-2" />
    Equalizer
    </button>

    <button
    onClick={() => setShowVisualizer(true)}
    className="px-5 py-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 text-sm font-medium transition-all"
    >
    <Activity size={18} className="inline mr-2" />
    Visualizer
    </button>
    </div>
    </div>
    </div>
    </div>
    </div>
    </motion.div>

    {/* Desktop Visualizer Modal */}
    <AnimatePresence>
    {showVisualizer && (
      <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl"
      >
      <div className="h-full flex">
      {/* Main visualizer area */}
      <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-white/10">
      <h2 className="text-3xl font-bold text-white">Audio Visualizer</h2>
      <button
      onClick={() => setShowVisualizer(false)}
      className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
      <X size={24} className="text-white" />
      </button>
      </div>

      <div className="flex-1 p-8">
      {analyzerNode && audioContext ? (
        <VisualizerWrapper
        audioContext={audioContext}
        analyzerNode={analyzerNode}
        type={vizType}
        colors={currentColors}
        settings={vizSettingsRef.current}
        style={{ height: '100%', width: '100%' }}
        />
      ) : (
        <div className="h-full flex items-center justify-center">
        <div className="text-center">
        <Music size={64} className="text-white/20 mx-auto mb-4" />
        <p className="text-white/50 text-lg">No audio data available</p>
        <p className="text-white/30 text-sm mt-2">Play a track to see the visualizer</p>
        </div>
        </div>
      )}
      </div>
      </div>

      {/* Controls sidebar */}
      <div className="w-96 bg-black/50 backdrop-blur-sm border-l border-white/10 p-6">
      <h3 className="text-xl font-semibold text-white mb-6">Visualizer Settings</h3>
      <VisualizerControls />
      </div>
      </div>
      </motion.div>
    )}
    </AnimatePresence>

    {/* Share Modal */}
    <AnimatePresence>
    {showShareMenu && (
      <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={() => setShowShareMenu(false)}
      >
      <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-gray-900 rounded-2xl p-8 max-w-md w-full"
      onClick={(e) => e.stopPropagation()}
      >
      <h3 className="text-2xl font-bold text-white mb-6">Share Track</h3>
      <div className="space-y-3">
      <button
      onClick={copyLink}
      className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all flex items-center justify-center gap-3"
      >
      <Share2 size={20} />
      Copy Link
      </button>
      <button
      onClick={() => setShowShareMenu(false)}
      className="w-full p-3 text-white/60 hover:text-white transition-colors"
      >
      Cancel
      </button>
      </div>
      </motion.div>
      </motion.div>
    )}
    </AnimatePresence>
    </>
  );
};

export default ExpandedPlayer;
