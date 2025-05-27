import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { X, ListMusic, GripHorizontal } from 'lucide-react';
import MusicAPI from '../../../services/api';

/* ─────────────────────────────────────────────── *
 *               QueuePanel                       *
 * ─────────────────────────────────────────────── */
const QueuePanel = ({ queue, showExpanded, setShowQueue, removeFromQueue, clearQueue, showQueue }) => {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const controls = useAnimation();
  const y = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  // Detect if mobile
  const isMobile = window.innerWidth <= 768;

  // Transform for opacity during drag
  const opacity = useTransform(y, [0, 300], [1, 0.5]);

  // Handle drag end
  const handleDragEnd = (event, info) => {
    setIsDragging(false);

    // If dragged down more than 100px or with velocity, close the panel
    if (info.offset.y > 100 || info.velocity.y > 500) {
      controls.start({ x: '100%' }).then(() => {
        setShowQueue(false);
      });
    } else {
      // Snap back to open position
      controls.start({ y: 0 });
    }
  };

  // Handle backdrop click on mobile
  const handleBackdropClick = (e) => {
    if (isMobile && e.target === e.currentTarget) {
      setShowQueue(false);
    }
  };

  // Prevent body scroll when panel is open on mobile
  useEffect(() => {
    if (isMobile && showQueue) {
      document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = 'unset';
  };
    }
  }, [showQueue, isMobile]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showQueue) {
        setShowQueue(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showQueue, setShowQueue]);

  // Prevent accidental swipes from triggering
  const handleTouchStart = (e) => {
    // Only allow drag from the header area
    const header = panelRef.current?.querySelector('.drag-handle');
    if (header && header.contains(e.target)) {
      setIsDragging(true);
    }
  };

  if (!showQueue) return null;

  return (
    <>
    {/* Mobile backdrop */}
    {isMobile && (
      <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 z-30 md:hidden"
      />
    )}

    <motion.div
    ref={panelRef}
    initial={{ x: '100%' }}
    animate={controls}
    exit={{ x: '100%' }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    drag={isMobile ? 'y' : false}
    dragDirectionLock
    dragConstraints={{ top: 0, bottom: 300 }}
    dragElastic={0.2}
    onDragStart={() => setIsDragging(true)}
    onDragEnd={handleDragEnd}
    onTouchStart={handleTouchStart}
    style={{ y, opacity: isMobile ? opacity : 1 }}
    className={`fixed ${
      isMobile
      ? 'inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh]'
      : 'right-0 top-0 w-80'
    } bg-surface border-l border-white/5 overflow-hidden z-40 ${
      showExpanded && !isMobile ? 'bottom-0' : 'bottom-24'
    } ${isMobile ? 'shadow-2xl' : ''}`}
    >
    {/* Drag indicator for mobile */}
    {isMobile && (
      <div className="flex justify-center pt-2 pb-1">
      <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
      </div>
    )}

    {/* Header */}
    <div className={`drag-handle p-4 border-b border-white/5 flex items-center justify-between ${
      isMobile ? 'cursor-grab active:cursor-grabbing' : ''
    }`}>
    <div className="flex items-center gap-3">
    {isMobile && <GripHorizontal size={20} className="text-gray-400" />}
    <h2 className="text-lg font-bold select-none">Play Queue</h2>
    <span className="text-sm text-gray-400">({queue.length})</span>
    </div>
    <motion.button
    onClick={() => setShowQueue(false)}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className="text-gray-400 hover:text-white p-1 -m-1"
    >
    <X size={20} />
    </motion.button>
    </div>

    {/* Queue content */}
    <div className={`overflow-y-auto ${
      isMobile
      ? 'h-[calc(100%-8rem)]'
  : `h-[calc(100%-${queue.length > 0 ? '8rem' : '4rem'})]`
    } p-2 ${isDragging ? 'pointer-events-none' : ''}`}>
    {queue.length > 0 ? (
      <div className="space-y-1">
      {queue.map((track, index) => (
        <motion.div
        key={`${track.id}-${index}`}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-light group relative"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.03, 0.3) }}
        onClick={(e) => {
          // Prevent navigation when removing from queue
          if (e.target.closest('.remove-button')) return;
        }}
        >
        <img
        src={
          track.track_image
          ? MusicAPI.getImage('albumArt', track.track_image)
          : '/default-album-art.png'
        }
        alt={track.title}
        className="w-10 h-10 rounded object-cover flex-shrink-0"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/default-album-art.png';
        }}
        draggable="false"
        />
        <div className="flex-1 min-w-0">
        <div
        className="font-medium truncate cursor-pointer hover:text-accent transition-colors"
        onClick={() => {
          navigate(`/track/${track.id}`);
          if (isMobile) setShowQueue(false);
        }}
        >
        {track.title}
        </div>
        <div
        className="text-sm text-gray-400 truncate cursor-pointer hover:text-white transition-colors"
        onClick={() => {
          navigate(`/profile/${track.artistId}`);
          if (isMobile) setShowQueue(false);
        }}
        >
        {track.artist}
        </div>
        </div>
        <motion.button
        onClick={(e) => {
          e.stopPropagation();
          removeFromQueue(index);
        }}
        className={`remove-button ${
          isMobile
          ? 'opacity-100'
          : 'opacity-0 group-hover:opacity-100'
        } transition-opacity text-gray-400 hover:text-white p-2 -m-2`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        >
        <X size={16} />
        </motion.button>
        </motion.div>
      ))}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
      <ListMusic size={48} className="mb-4 opacity-50" />
      <p className="text-sm">Your queue is empty</p>
      <p className="text-xs mt-2">Add some tracks to get started</p>
      </div>
    )}
    </div>

    {/* Clear queue button */}
    {queue.length > 0 && (
      <div className={`absolute bottom-0 left-0 right-0 p-4 bg-surface border-t border-white/5 ${
        !showExpanded && !isMobile ? 'mb-24' : ''
      }`}>
      <motion.button
      onClick={() => {
        clearQueue();
        setTimeout(() => setShowQueue(false), 300);
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
    </>
  );
};

export default QueuePanel;
