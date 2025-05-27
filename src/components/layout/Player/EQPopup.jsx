import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  X, Save, RotateCcw, Upload, Download, Sparkles, AudioWaveform,
  GripHorizontal, Music, Headphones, Volume2, ChevronLeft, ChevronRight,
  Zap, Waves, Disc, Sliders, Info, Check, AlertCircle, TrendingUp,
  Activity, BarChart3, Gauge
} from 'lucide-react';
import { useAudio } from '../../../contexts/AudioContext';

const EQPopup = ({ showEQ, setShowEQ, isMobile = false }) => {
  const {
    // EQ mode & states
    eqMode,
    toggleEqMode,
    eqGains,
    setEqGain,
    advancedEqGains,
    setAdvancedEqGain,
    targetEqGains,
    targetAdvancedEqGains,
    resetEq,
    applyEqPreset,

    // EQSmart
    eqSmartEnabled,
    eqSmartProcessing,
    toggleEqSmart,
    eqSmartSuggestions,
    applyEqSmartSettings,

    // Dynamic EQ
    dynamicEqEnabled,
    toggleDynamicEq,
    realtimeAnalysisData,

    // For pointer-based drag transitions on sliders
    startEqDrag,
    endEqDrag,

    // Current track and audio info
    currentTrack,
    visualizerData,
    frequencyBands,
    presets,
    frequencies
  } = useAudio();

  // Get frequencies and labels based on mode
  const isAdvanced = eqMode === 'advanced';
  const freqList = isAdvanced ? (frequencies?.advanced || []) : (frequencies?.standard || [60, 230, 910, 3600, 14000]);
  const currentGains = isAdvanced ? (advancedEqGains || []) : (eqGains || []);
  const currentTargets = isAdvanced ? (targetAdvancedEqGains || []) : (targetEqGains || []);
  const currentSuggestions = isAdvanced
  ? (eqSmartSuggestions?.advanced || Array(freqList.length).fill(0))
  : (eqSmartSuggestions?.standard || Array(freqList.length).fill(0));
  const currentPresets = presets?.[eqMode] || [];

  // Format frequency labels
  const formatFrequency = (freq) => {
    if (freq >= 1000) return `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}k`;
    return freq.toString();
  };

  // Local states
  const [notification, setNotification] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showPresetList, setShowPresetList] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Visual feedback states
  const [recentChanges, setRecentChanges] = useState({});
  const [isComparing, setIsComparing] = useState(false);
  const [compareGains, setCompareGains] = useState(null);
  const [changeHistory, setChangeHistory] = useState([]);

  // For advanced mode scrolling
  const sliderContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // For slider drag interaction
  const [draggedBand, setDraggedBand] = useState(null);
  const [hoveredBand, setHoveredBand] = useState(null);
  const [fineAdjustMode, setFineAdjustMode] = useState(false);

  // Slider precision based on fine adjust mode
  const sliderPrecision = fineAdjustMode ? 0.01 : 0.1;

  // Track EQ changes for visual feedback
  useEffect(() => {
    const newChanges = {};
    let hasChanges = false;

    currentGains.forEach((gain, index) => {
      const prevGain = compareGains ? compareGains[index] : 0;
      if (Math.abs(gain - prevGain) > 0.1) {
        newChanges[index] = {
          direction: gain > prevGain ? 'increase' : 'decrease',
          delta: gain - prevGain
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setRecentChanges(newChanges);

      // Add to history
      setChangeHistory(prev => [...prev.slice(-4), {
        timestamp: Date.now(),
                       changes: newChanges,
                       gains: [...currentGains]
      }]);
    }

    const timer = setTimeout(() => setRecentChanges({}), 3000);
    return () => clearTimeout(timer);
  }, [currentGains]);

  // Update scroll indicators
  useEffect(() => {
    if (!isAdvanced) return;

    const updateScrollIndicators = () => {
      const container = sliderContainerRef.current;
      if (!container) return;

      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
    };

    const timeoutId = setTimeout(updateScrollIndicators, 100);

    const container = sliderContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollIndicators);
      window.addEventListener('resize', updateScrollIndicators);
    }

    return () => {
      clearTimeout(timeoutId);
      if (container) {
        container.removeEventListener('scroll', updateScrollIndicators);
      }
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [isAdvanced, showEQ]);

  // Popup dragging (Desktop only)
  const popupRef = useRef(null);
  const dragHandleRef = useRef(null);
  const mainDragControls = useDragControls();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handlePopupDragStart = useCallback((e) => {
    if (isMobile) return;
    if (e.button !== 0 || !dragHandleRef.current?.contains(e.target)) return;
    mainDragControls.start(e);
  }, [isMobile, mainDragControls]);

  const handlePopupDragEnd = useCallback((event, info) => {
    setOffset(info.offset);
  }, []);

  // Enhanced slider handlers with better precision
  const handleSliderInteraction = useCallback((index, clientY, rect) => {
    const relY = clientY - rect.top;
    const percentage = 1 - (relY / rect.height);
    let newGain = (percentage - 0.5) * 24;

    // Fine adjust mode for precise control
    if (fineAdjustMode) {
      newGain = Math.round(newGain / sliderPrecision) * sliderPrecision;
    } else {
      // Snap to 0 if close
      if (Math.abs(newGain) < 0.5) {
        newGain = 0;
      } else {
        newGain = Math.round(newGain * 10) / 10;
      }
    }

    newGain = Math.max(-12, Math.min(12, newGain));

    if (isAdvanced) {
      setAdvancedEqGain(index, newGain);
    } else {
      setEqGain(index, newGain);
    }
  }, [isAdvanced, fineAdjustMode, sliderPrecision, setAdvancedEqGain, setEqGain]);

  const handleSliderMouseDown = useCallback((index, e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();

    setDraggedBand(index);
    startEqDrag?.();

    handleSliderInteraction(index, e.clientY, rect);

    const onMouseMove = (moveEvent) => {
      handleSliderInteraction(index, moveEvent.clientY, rect);
    };

    const onMouseUp = () => {
      setDraggedBand(null);
      endEqDrag?.();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [handleSliderInteraction, startEqDrag, endEqDrag]);

  const handleSliderTouchStart = useCallback((index, e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();

    setDraggedBand(index);
    startEqDrag?.();

    handleSliderInteraction(index, touch.clientY, rect);

    const onTouchMove = (moveEvent) => {
      if (moveEvent.touches.length === 1) {
        handleSliderInteraction(index, moveEvent.touches[0].clientY, rect);
      }
    };

    const onTouchEnd = () => {
      setDraggedBand(null);
      endEqDrag?.();
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, [handleSliderInteraction, startEqDrag, endEqDrag]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') setFineAdjustMode(true);

      // Quick preset shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key >= '1' && e.key <= '9') {
          const presetIndex = parseInt(e.key) - 1;
          if (currentPresets[presetIndex]) {
            applyPreset(currentPresets[presetIndex]);
          }
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') setFineAdjustMode(false);
    };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
  }, [currentPresets]);

  // Scroll helpers
  const scrollSliders = useCallback((direction) => {
    const container = sliderContainerRef.current;
    if (!container) return;

    const scrollAmount = direction === 'left' ? -200 : 200;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }, []);

  // Import/Export functions
  const exportEQSettings = useCallback(() => {
    const settings = {
      version: '2.0',
      mode: eqMode,
      gains: currentGains,
      preset: selectedPreset,
      timestamp: new Date().toISOString(),
                                       trackInfo: currentTrack ? {
                                         title: currentTrack.title,
                                         artist: currentTrack.artist
                                       } : null
    };

    navigator.clipboard.writeText(JSON.stringify(settings, null, 2))
    .then(() => {
      setNotification('Settings copied to clipboard');
      setTimeout(() => setNotification(''), 3000);
    })
    .catch(() => {
      // Fallback: download as file
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beatfly-eq-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotification('Settings downloaded');
      setTimeout(() => setNotification(''), 3000);
    });
  }, [eqMode, currentGains, selectedPreset, currentTrack]);

  const importEQSettings = useCallback(() => {
    try {
      const parsed = JSON.parse(importValue);
      const gains = parsed.gains || parsed;

      if (Array.isArray(gains)) {
        if (gains.length === freqList.length) {
          gains.forEach((val, i) => {
            if (isAdvanced) setAdvancedEqGain(i, val);
            else setEqGain(i, val);
          });
            setNotification('Settings imported successfully');
            setShowImportModal(false);
            setImportValue('');
        } else {
          throw new Error('Incompatible frequency count');
        }
      } else {
        throw new Error('Invalid format');
      }
    } catch (err) {
      setNotification('Invalid settings format');
      console.error(err);
    }
    setTimeout(() => setNotification(''), 3000);
  }, [importValue, isAdvanced, freqList.length, setAdvancedEqGain, setEqGain]);

  const applyPreset = useCallback((preset) => {
    if (!preset) return;
    setCompareGains([...currentGains]);
    applyEqPreset?.(preset);
    setSelectedPreset(preset.id);
    setNotification(`Applied "${preset.name}" preset`);
    setTimeout(() => setNotification(''), 3000);
  }, [currentGains, applyEqPreset]);

  const toggleComparison = useCallback(() => {
    if (isComparing) {
      setIsComparing(false);
      setCompareGains(null);
    } else {
      setIsComparing(true);
      setCompareGains([...currentGains]);
    }
  }, [isComparing, currentGains]);

  // Get frequency band color
  const getFrequencyColor = (freq) => {
    if (!frequencyBands || !Array.isArray(frequencyBands)) return '#DB2777';
    const band = frequencyBands.find(b => freq >= b.min && freq <= b.max);
    return band?.color || '#DB2777';
  };

  // Calculate overall EQ curve characteristics
  const getEQCharacteristics = useCallback(() => {
    const bassGain = currentGains.slice(0, Math.floor(freqList.length * 0.3))
    .reduce((sum, gain) => sum + gain, 0) / Math.floor(freqList.length * 0.3);
    const midGain = currentGains.slice(Math.floor(freqList.length * 0.3), Math.floor(freqList.length * 0.7))
    .reduce((sum, gain) => sum + gain, 0) / Math.floor(freqList.length * 0.4);
    const highGain = currentGains.slice(Math.floor(freqList.length * 0.7))
    .reduce((sum, gain) => sum + gain, 0) / Math.floor(freqList.length * 0.3);

    return {
      bass: bassGain,
      mid: midGain,
      high: highGain,
      overall: currentGains.reduce((sum, gain) => sum + gain, 0) / currentGains.length
    };
  }, [currentGains, freqList]);

  const characteristics = getEQCharacteristics();

  // Don't render if no frequencies data
  if (!freqList.length) return null;

  return (
    <AnimatePresence>
    {showEQ && (
      <motion.div
      ref={popupRef}
      className={`fixed z-50 bg-gradient-to-b from-background to-background/95 text-white backdrop-blur-2xl shadow-2xl border border-white/10 ${
        isMobile ? 'inset-x-0 bottom-0 pb-20 rounded-t-2xl' : 'rounded-2xl w-full max-w-4xl'
      }`}
      initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9 }}
      animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, x: offset.x, y: offset.y }}
      exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      drag={!isMobile}
      dragControls={mainDragControls}
      dragMomentum={false}
      dragListener={false}
      onDragEnd={handlePopupDragEnd}
      dragElastic={0.2}
      style={!isMobile ? {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      } : {}}
      >
      {/* Enhanced Header */}
      <div className="flex justify-between items-center px-6 pt-5 pb-3">
      <div ref={dragHandleRef} onMouseDown={handlePopupDragStart} className="flex items-center gap-4 cursor-move flex-1">
      {!isMobile && <GripHorizontal size={16} className="text-gray-500" />}

      {/* Album art and track info */}
      <div className="flex items-center gap-4">
      {currentTrack?.album_art ? (
        <img
        src={currentTrack.album_art}
        alt={currentTrack.title || 'Album art'}
        className="w-12 h-12 rounded-lg object-cover shadow-lg"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
        />
      ) : null}
      <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center shadow-lg" style={{ display: currentTrack?.album_art ? 'none' : 'flex' }}>
      <Disc size={24} className="text-gray-500" />
      </div>

      <div className="flex flex-col">
      <h3 className="text-2xl font-bold bg-gradient-to-r from-accent-light to-accent-dark bg-clip-text text-transparent flex items-center gap-2">
      Beatfly UltraEQ
      {fineAdjustMode && (
        <span className="text-xs text-blue-400 font-normal px-2 py-1 bg-blue-400/10 rounded-full">Fine Adjust</span>
      )}
      </h3>

      {currentTrack && (
        <p className="text-sm text-gray-400 flex items-center gap-2">
        <Music size={14} />
        {currentTrack.title} • {currentTrack.artist}
        </p>
      )}
      </div>
      </div>
      </div>

      <div className="flex items-center gap-2">
      {/* Info button */}
      <motion.button
      onClick={() => setShowInfo(!showInfo)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`p-2 rounded-full transition-colors ${
        showInfo ? 'bg-accent text-white' : 'text-gray-400 hover:text-white hover:bg-surface/50'
      }`}
      >
      <Info size={20} />
      </motion.button>

      {/* Close button */}
      <motion.button
      onClick={() => setShowEQ(false)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="text-gray-400 hover:text-white p-2 hover:bg-surface/50 rounded-full transition-colors"
      >
      <X size={20} />
      </motion.button>
      </div>
      </div>

      {/* Notification banner */}
      <AnimatePresence>
      {notification && (
        <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mx-6 mb-3 px-4 py-2 bg-accent/20 border border-accent/30 rounded-lg flex items-center gap-2"
        >
        <Check size={16} className="text-accent" />
        <span className="text-sm text-accent">{notification}</span>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Info panel */}
      <AnimatePresence>
      {showInfo && (
        <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="overflow-hidden"
        >
        <div className="px-6 pb-3 space-y-2 text-sm text-gray-400">
        <p className="flex items-center gap-2">
        <Sliders size={14} />
        Click and drag sliders to adjust frequency bands
        </p>
        <p className="flex items-center gap-2">
        <Gauge size={14} />
        Hold Shift for fine adjustments (±0.01 dB precision)
        </p>
        <p className="flex items-center gap-2">
        <Sparkles size={14} />
        EQSmart™ analyzes your music and suggests optimal settings
        </p>
        <p className="flex items-center gap-2">
        <Activity size={14} />
        Dynamic EQ adjusts in real-time based on audio content
        </p>
        </div>
        <div className="h-px bg-white/10 mx-6 mb-3" />
        </motion.div>
      )}
      </AnimatePresence>

      {/* Enhanced Controls Bar */}
      <div className="px-6 py-4 space-y-4 border-b border-white/10 bg-surface/30">
      {/* Primary controls */}
      <div className="flex justify-between items-center">
      <div className="flex items-center gap-6">
      {/* Mode Toggle */}
      <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400">Mode:</span>
      <button
      onClick={toggleEqMode}
      className="relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
      style={{ backgroundColor: isAdvanced ? 'rgb(219, 39, 119)' : 'rgb(75, 85, 99)' }}
      >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
        isAdvanced ? 'translate-x-7' : 'translate-x-1'
      }`} />
      </button>
      <span className="text-sm font-medium">{isAdvanced ? 'Advanced' : 'Standard'}</span>
      </div>

      {/* EQSmart Toggle */}
      <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400">EQSmart:</span>
      <button
      onClick={() => {
        toggleEqSmart();
        if (!eqSmartEnabled && currentTrack) {
          applyEqSmartSettings(currentTrack.id);
        }
      }}
      className="relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-background"
      style={{ backgroundColor: eqSmartEnabled ? 'rgb(34, 197, 94)' : 'rgb(75, 85, 99)' }}
      >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
        eqSmartEnabled ? 'translate-x-7' : 'translate-x-1'
      }`} />
      </button>
      <span className="text-sm font-medium flex items-center gap-1">
      <Sparkles size={14} className={eqSmartEnabled ? 'text-green-400' : ''} />
      {eqSmartProcessing ? 'Analyzing...' : eqSmartEnabled ? 'Active' : 'Inactive'}
      </span>
      </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
      <motion.button
      onClick={() => setShowAnalysis(!showAnalysis)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
        showAnalysis
        ? 'bg-purple-600 text-white'
        : 'text-gray-300 hover:text-white bg-surface/30 hover:bg-surface/50'
      }`}
      >
      <BarChart3 size={16} />
      <span className="text-sm">Analysis</span>
      </motion.button>

      <motion.button
      onClick={toggleComparison}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
        isComparing
        ? 'bg-blue-600 text-white'
        : 'text-gray-300 hover:text-white bg-surface/30 hover:bg-surface/50'
      }`}
      >
      <Zap size={16} />
      <span className="text-sm">Compare</span>
      </motion.button>

      <div className="w-px bg-white/10" />

      <motion.button
      onClick={() => setShowImportModal(true)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-2 text-gray-300 hover:text-white bg-surface/30 hover:bg-surface/50 rounded-lg transition-colors"
      title="Import"
      >
      <Upload size={16} />
      </motion.button>

      <motion.button
      onClick={exportEQSettings}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-2 text-gray-300 hover:text-white bg-surface/30 hover:bg-surface/50 rounded-lg transition-colors"
      title="Export"
      >
      <Download size={16} />
      </motion.button>

      <motion.button
      onClick={() => resetEq(eqMode)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-2 text-gray-300 hover:text-white bg-surface/30 hover:bg-surface/50 rounded-lg transition-colors"
      title="Reset"
      >
      <RotateCcw size={16} />
      </motion.button>
      </div>
      </div>

      {/* EQSmart Status */}
      {eqSmartEnabled && (
        <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
        >
        <div className="bg-gradient-to-r from-green-950/30 to-green-900/20 border border-green-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${
          eqSmartProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
        }`} />
        <div>
        <p className={`text-sm font-medium ${
          eqSmartProcessing ? 'text-yellow-400' : 'text-green-400'
        }`}>
        {eqSmartProcessing
          ? 'Analyzing and optimizing audio...'
          : 'EQSmart is actively enhancing your music'
        }
        </p>
        {realtimeAnalysisData && !eqSmartProcessing && (
          <p className="text-xs text-gray-400 mt-1">
          Target loudness: {realtimeAnalysisData.loudness?.toFixed(1)} LUFS
          </p>
        )}
        </div>
        </div>

        {/* Dynamic EQ Toggle */}
        <button
        onClick={toggleDynamicEq}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          dynamicEqEnabled
          ? 'bg-blue-600 text-white'
          : 'bg-blue-950/30 border border-blue-500/20 text-blue-400'
        }`}
        >
        <AudioWaveform size={16} className={dynamicEqEnabled ? 'animate-pulse' : ''} />
        <span className="text-sm font-medium">Dynamic EQ</span>
        <div
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ml-2"
        style={{ backgroundColor: dynamicEqEnabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}
        >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          dynamicEqEnabled ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
        </div>
        </button>
        </div>
        </div>
        </motion.div>
      )}

      {/* Analysis Panel */}
      <AnimatePresence>
      {showAnalysis && (
        <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-4"
        >
        <h4 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
        <BarChart3 size={16} />
        Frequency Analysis
        </h4>
        <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
        <p className="text-xs text-gray-400">Bass</p>
        <p className="text-lg font-bold text-white">{characteristics.bass.toFixed(1)} dB</p>
        <div className="h-1 bg-gray-700 rounded-full mt-1">
        <div
        className="h-full bg-purple-500 rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, (characteristics.bass + 12) / 24 * 100))}%` }}
        />
        </div>
        </div>
        <div className="text-center">
        <p className="text-xs text-gray-400">Mids</p>
        <p className="text-lg font-bold text-white">{characteristics.mid.toFixed(1)} dB</p>
        <div className="h-1 bg-gray-700 rounded-full mt-1">
        <div
        className="h-full bg-green-500 rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, (characteristics.mid + 12) / 24 * 100))}%` }}
        />
        </div>
        </div>
        <div className="text-center">
        <p className="text-xs text-gray-400">Highs</p>
        <p className="text-lg font-bold text-white">{characteristics.high.toFixed(1)} dB</p>
        <div className="h-1 bg-gray-700 rounded-full mt-1">
        <div
        className="h-full bg-orange-500 rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, (characteristics.high + 12) / 24 * 100))}%` }}
        />
        </div>
        </div>
        <div className="text-center">
        <p className="text-xs text-gray-400">Overall</p>
        <p className="text-lg font-bold text-white">{characteristics.overall.toFixed(1)} dB</p>
        <div className="h-1 bg-gray-700 rounded-full mt-1">
        <div
        className="h-full bg-accent rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, (characteristics.overall + 12) / 24 * 100))}%` }}
        />
        </div>
        </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
      </div>

      {/* Preset Bar */}
      {currentPresets.length > 0 && (
        <div className="px-6 py-4 border-b border-white/10 bg-surface/20">
        <div className="flex items-center justify-between mb-3">
        <button
        onClick={() => setShowPresetList(!showPresetList)}
        className="text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-2"
        >
        <Headphones size={16} />
        Presets
        <motion.div
        animate={{ rotate: showPresetList ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        >
        <ChevronRight size={16} className="transform rotate-90" />
        </motion.div>
        </button>

        {selectedPreset && (
          <span className="text-xs text-accent bg-accent/10 px-3 py-1 rounded-full">
          Current: {currentPresets.find(p => p.id === selectedPreset)?.name}
          </span>
        )}
        </div>

        <AnimatePresence>
        {showPresetList && (
          <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
          >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {currentPresets.map((preset, index) => (
            <motion.button
            key={preset.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => applyPreset(preset)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedPreset === preset.id
              ? 'bg-accent text-white shadow-lg'
              : 'bg-surface/50 hover:bg-surface/70 text-gray-300'
            }`}
            >
            <div className="flex items-center gap-2">
            {index < 9 && (
              <span className="text-xs opacity-50">⌘{index + 1}</span>
            )}
            {preset.name}
            </div>
            </motion.button>
          ))}
          </div>
          </motion.div>
        )}
        </AnimatePresence>
        </div>
      )}

      {/* Enhanced EQ Sliders */}
      <div className="relative">
      {/* Scroll buttons for advanced mode */}
      {isAdvanced && (
        <>
        <AnimatePresence>
        {canScrollLeft && (
          <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => scrollSliders('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-background/90 rounded-full shadow-lg hover:bg-surface/90 transition-colors"
          >
          <ChevronLeft size={20} />
          </motion.button>
        )}
        </AnimatePresence>

        <AnimatePresence>
        {canScrollRight && (
          <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => scrollSliders('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-background/90 rounded-full shadow-lg hover:bg-surface/90 transition-colors"
          >
          <ChevronRight size={20} />
          </motion.button>
        )}
        </AnimatePresence>
        </>
      )}

      <div
      ref={sliderContainerRef}
      className={`p-6 ${isAdvanced ? 'overflow-x-auto hide-scrollbar' : ''}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
      {/* dB Scale */}
      <div className="mb-4 px-4">
      <div className="relative h-8">
      <div className="absolute inset-0 flex justify-between items-center">
      <span className="text-xs text-gray-500 font-mono">+12 dB</span>
      <div className="flex-1 mx-4 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
      <span className="text-xs text-gray-500 font-mono">0 dB</span>
      <div className="flex-1 mx-4 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
      <span className="text-xs text-gray-500 font-mono">-12 dB</span>
      </div>
      </div>
      </div>

      {/* Visualizer Background */}
      {visualizerData?.bands && (
        <div className="absolute inset-0 pointer-events-none">
        {visualizerData.bands.map((band, index) => (
          <motion.div
          key={band.name}
          className="absolute bottom-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          style={{
            left: `${(index / visualizerData.bands.length) * 100}%`,
                                                    width: `${100 / visualizerData.bands.length}%`,
                                                    height: `${band.value * 100}%`,
                                                    background: `linear-gradient(to top, ${band.color}00, ${band.color}40)`,
          }}
          />
        ))}
        </div>
      )}

      <div className={`flex ${isAdvanced ? 'w-max gap-3' : 'justify-between gap-4'}`} style={{ height: '280px' }}>
      {freqList.map((freq, index) => {
        const gain = currentGains[index] || 0;
        const targetGain = currentTargets[index] || 0;
        const suggestion = currentSuggestions[index] || 0;
        const compareGain = compareGains?.[index] || 0;
        const isActive = draggedBand === index;
        const isHovered = hoveredBand === index;
        const hasRecentChange = recentChanges[index];
        const bandColor = getFrequencyColor(freq);

        return (
          <motion.div
          key={`freq-${freq}-${index}`}
          className="flex flex-col items-center"
          style={{ minWidth: isAdvanced ? '50px' : 'auto' }}
          onMouseEnter={() => setHoveredBand(index)}
          onMouseLeave={() => setHoveredBand(null)}
          >
          {/* Gain value display */}
          <motion.div
          className={`text-sm text-center h-8 font-mono transition-all flex items-center justify-center ${
            isActive || isHovered ? 'text-white font-medium' : 'text-gray-300'
          }`}
          animate={{
            scale: isActive ? 1.2 : 1,
            color: hasRecentChange
            ? hasRecentChange.direction === 'increase' ? '#10B981' : '#EF4444'
            : undefined
          }}
          >
          <span className={`px-2 py-1 rounded-md ${
            Math.abs(gain) > 0.1 ? 'bg-surface/50' : ''
          }`}>
          {gain >= 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
          </span>
          </motion.div>

          {/* Slider container */}
          <div
          className={`relative h-full w-14 bg-gradient-to-b from-surface/20 to-surface/40 rounded-xl cursor-pointer transition-all ${
            isActive ? 'ring-2 ring-accent shadow-xl scale-105' : ''
          } ${isHovered ? 'bg-surface/60' : ''}`}
          onMouseDown={(e) => handleSliderMouseDown(index, e)}
          onTouchStart={(e) => handleSliderTouchStart(index, e)}
          >
          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 right-0 top-1/4 h-px bg-white/5" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10" />
          <div className="absolute left-0 right-0 top-3/4 h-px bg-white/5" />
          </div>

          {/* Comparison indicator */}
          {isComparing && compareGain !== gain && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="absolute left-2 right-2 bg-gray-400/40 rounded-lg"
            style={{
              height: `${(Math.abs(compareGain) / 12) * 50}%`,
                                                   bottom: compareGain >= 0
                                                   ? '50%'
          : `calc(50% - ${(Math.abs(compareGain) / 12) * 50}%)`
            }}
            />
          )}

          {/* EQSmart suggestion */}
          {eqSmartEnabled && Math.abs(suggestion) > 0.1 && (
            <motion.div
            className="absolute left-2 right-2 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            style={{
              background: `linear-gradient(to top, ${bandColor}40, ${bandColor}20)`,
                                                            height: `${(Math.abs(suggestion) / 12) * 50}%`,
                                                            bottom: suggestion >= 0
                                                            ? '50%'
          : `calc(50% - ${(Math.abs(suggestion) / 12) * 50}%)`
            }}
            />
          )}

          {/* Current gain bar */}
          <motion.div
          className="absolute left-2 right-2 rounded-lg shadow-lg"
          style={{
            background: `linear-gradient(to ${gain >= 0 ? 'top' : 'bottom'}, ${bandColor}CC, ${bandColor}FF)`,
          }}
          animate={{
            height: `${(Math.abs(gain) / 12) * 50}%`,
                bottom: gain >= 0
                ? '50%'
                : `calc(50% - ${(Math.abs(gain) / 12) * 50}%)`,
          }}
          transition={{
            type: 'spring',
            damping: isActive ? 50 : 25,
            stiffness: 300
          }}
          />

          {/* Drag handle */}
          <AnimatePresence>
          {(isActive || isHovered) && (
            <motion.div
            className="absolute left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full border-2 border-white shadow-2xl flex items-center justify-center"
            style={{
              backgroundColor: bandColor,
              bottom: gain >= 0
              ? `calc(50% + ${(Math.abs(gain) / 12) * 50}% - 20px)`
              : `calc(50% - ${(Math.abs(gain) / 12) * 50}% - 20px)`
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            >
            <div className="w-3 h-3 bg-white rounded-full" />
            </motion.div>
          )}
          </AnimatePresence>

          {/* Fine adjust indicator */}
          {fineAdjustMode && (isActive || isHovered) && (
            <div className="absolute inset-0 border-2 border-blue-400/50 rounded-xl pointer-events-none animate-pulse" />
          )}

          {/* Change indicator */}
          <AnimatePresence>
          {hasRecentChange && (
            <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
              hasRecentChange.direction === 'increase' ? 'bg-green-500' : 'bg-red-500'
            }`}
            >
            <TrendingUp
            size={14}
            className={`text-white ${
              hasRecentChange.direction === 'decrease' ? 'rotate-180' : ''
            }`}
            />
            </motion.div>
          )}
          </AnimatePresence>
          </div>

          {/* Frequency label */}
          <div className={`text-sm h-8 text-center pt-2 transition-all ${
            isActive || isHovered ? 'text-white font-medium' : 'text-gray-500'
          }`}>
          {formatFrequency(freq)}
          </div>
          </motion.div>
        );
      })}
      </div>
      </div>
      </div>

      {/* Enhanced Tips Footer */}
      <div className="px-6 py-4 bg-surface/20 rounded-b-2xl">
      <div className="flex items-center justify-between text-xs text-gray-400">
      <div className="flex items-center gap-4">
      {fineAdjustMode ? (
        <span className="flex items-center gap-1 text-blue-400">
        <Gauge size={14} />
        Fine adjust mode active (±0.01 dB)
        </span>
      ) : (
        <span className="flex items-center gap-1">
        <Info size={14} />
        Hold Shift for fine adjustments
        </span>
      )}
      {isAdvanced && (
        <span className="flex items-center gap-1">
        <Sliders size={14} />
        {freqList.length} bands active
        </span>
      )}
      </div>

      {changeHistory.length > 0 && (
        <button
        onClick={() => {
          if (changeHistory.length > 1) {
            const previousState = changeHistory[changeHistory.length - 2];
            previousState.gains.forEach((gain, i) => {
              if (isAdvanced) setAdvancedEqGain(i, gain);
              else setEqGain(i, gain);
            });
              setChangeHistory(prev => prev.slice(0, -1));
          }
        }}
        className="flex items-center gap-1 hover:text-white transition-colors"
        >
        <RotateCcw size={14} />
        Undo last change
        </button>
      )}
      </div>
      </div>

      {/* Import Modal */}
      <AnimatePresence>
      {showImportModal && (
        <motion.div
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowImportModal(false)}
        >
        <motion.div
        className="bg-surface rounded-2xl p-6 w-full max-w-md"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        >
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Upload size={24} />
        Import EQ Settings
        </h3>
        <p className="text-sm text-gray-400 mb-4">
        Paste your EQ settings JSON below or drag and drop a file
        </p>
        <textarea
        value={importValue}
        onChange={(e) => setImportValue(e.target.value)}
        className="w-full p-4 bg-surface-light border border-white/10 rounded-xl text-white focus:border-accent focus:outline-none text-sm font-mono resize-none"
        placeholder={`Example:\n{\n  "version": "2.0",\n  "mode": "standard",\n  "gains": [0, 2.5, -1.0, 3.0, 0]\n}`}
        rows={8}
        />
        <div className="flex justify-end gap-3 mt-6">
        <motion.button
        onClick={() => setShowImportModal(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-6 py-2 bg-surface-light hover:bg-surface-light/70 text-white rounded-lg text-sm transition-colors"
        >
        Cancel
        </motion.button>
        <motion.button
        onClick={importEQSettings}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-6 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
        >
        <Upload size={16} />
        Import
        </motion.button>
        </div>
        </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      </motion.div>
    )}
    </AnimatePresence>
  );
};

export default EQPopup;
