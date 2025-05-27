import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, ListMusic, ChevronDown, GripHorizontal } from 'lucide-react';
import MusicAPI from '../../../services/api';

/* ─────────────────────────────────────────────── *
 *                   MobileQueue                  *
 * ─────────────────────────────────────────────── */
const MobileQueuePanel = ({ queue, showQueue, setShowQueue, removeFromQueue, clearQueue }) => {
  const dragControls = useDragControls();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (showQueue) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

  return () => {
    document.body.style.overflow = originalStyle;
    document.body.style.touchAction = 'auto';
  };
    }
  }, [showQueue]);

  // Handle back button on Android
  useEffect(() => {
    if (!showQueue) return;

    const handleBackButton = (e) => {
      e.preventDefault();
      setShowQueue(false);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [showQueue, setShowQueue]);

  // Custom navigate function that closes queue
  const handleNavigate = (path) => {
    setIsClosing(true);
    setTimeout(() => {
      navigate(path);
      setShowQueue(false);
      setIsClosing(false);
    }, 200);
  };

  // Close panel function with animation
  const closePanel = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowQueue(false);
      setIsClosing(false);
    }, 200);
  };

  // Handle drag end
  const handleDragEnd = (e, info) => {
    setIsDragging(false);

    // Close if dragged down more than 100px or with velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      closePanel();
    }
  };

  // For swipe gestures on queue items
  const handleSwipeItem = (index, info) => {
    if (info.offset.x < -100 || info.velocity.x < -500) {
      // Visual feedback with animation
      const element = document.getElementById(`queue-item-${index}`);
      if (element) {
        element.style.transition = 'all 0.3s ease-out';
        element.style.transform = 'translateX(-100%)';
        element.style.opacity = '0';

        // Wait for animation to complete before removing
        setTimeout(() => {
          removeFromQueue(index);
        }, 300);
      } else {
        removeFromQueue(index);
      }
    }
  };

  // Don't render if not showing
  if (!showQueue) return null;

  return (
    <AnimatePresence mode="wait">
    <motion.div
    ref={panelRef}
    initial={{ y: '100%' }}
    animate={{ y: isClosing ? '100%' : 0 }}
    exit={{ y: '100%' }}
    transition={{
      type: "spring",
      damping: 25,
      stiffness: 300,
      mass: 0.8
    }}
    className="fixed inset-0 bg-background z-50 flex flex-col"
    style={{ height: '100vh', maxHeight: '100vh' }}
    >
    {/* Header with drag handle */}
    <motion.div
    className="relative flex-shrink-0"
    drag="y"
    dragControls={dragControls}
    dragConstraints={{ top: 0, bottom: 300 }}
    dragElastic={0.2}
    onDragStart={() => setIsDragging(true)}
    onDragEnd={handleDragEnd}
    style={{ touchAction: 'none' }}
    >
    {/* Drag indicator */}
    <div className="flex justify-center pt-3 pb-2">
    <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
    </div>

    <div className="flex items-center justify-between px-4 pb-4">
    <div className="flex items-center gap-3">
    <GripHorizontal size={20} className="text-gray-400" />
    <h2 className="text-lg font-bold select-none">Play Queue</h2>
    <span className="text-sm text-gray-400 select-none">
    {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
    </span>
    </div>
    <motion.button
    onClick={closePanel}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className="p-2 -mr-2 text-gray-400 hover:text-white"
    >
    <ChevronDown size={24} />
    </motion.button>
    </div>

    <div className="h-px bg-white/10" />
    </motion.div>

    {/* Queue content */}
    <div
    className={`flex-1 overflow-y-auto overscroll-contain ${
      isDragging ? 'pointer-events-none' : ''
    }`}
    style={{
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}
    >
    <div className="p-3 pb-24">
    {queue.length > 0 ? (
      <div className="space-y-2">
      {queue.map((track, index) => (
        <motion.div
        id={`queue-item-${index}`}
        key={`${track.id}-${index}`}
        className="relative overflow-hidden"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          delay: Math.min(index * 0.03, 0.3),
                                    type: "spring",
                                    stiffness: 300
        }}
        >
        {/* Background for swipe indicator */}
        <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4">
        <X size={20} className="text-white" />
        </div>

        {/* Main content */}
        <motion.div
        className="relative bg-background flex items-center gap-3 p-3 rounded-lg"
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => handleSwipeItem(index, info)}
        whileTap={{ scale: 0.98 }}
        >
        <img
        src={
          track.track_image
          ? MusicAPI.getImage('albumArt', track.track_image)
          : '/default-album-art.png'
        }
        alt={track.title}
        className="w-12 h-12 rounded-lg object-cover select-none flex-shrink-0"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/default-album-art.png';
        }}
        draggable="false"
        />

        <div className="flex-1 min-w-0 select-none">
        <div
        className="font-medium truncate active:text-accent transition-colors"
        onClick={() => handleNavigate(`/track/${track.id}`)}
        >
        {track.title}
        </div>
        <div
        className="text-sm text-gray-400 truncate active:text-white transition-colors"
        onClick={() => handleNavigate(`/profile/${track.artistId}`)}
        >
        {track.artist}
        </div>
        </div>

        <motion.button
        onClick={(e) => {
          e.stopPropagation();
          removeFromQueue(index);
        }}
        className="p-2 -mr-1 text-gray-400 active:text-white"
        whileTap={{ scale: 0.8 }}
        >
        <X size={20} />
        </motion.button>
        </motion.div>
        </motion.div>
      ))}
      </div>
    ) : (
      <motion.div
      className="flex flex-col items-center justify-center py-20 text-gray-400"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      >
      <ListMusic size={56} className="mb-4 opacity-50" />
      <p className="text-base font-medium select-none">Your queue is empty</p>
      <p className="text-sm mt-2 opacity-70 select-none">Add some tracks to get started</p>
      </motion.div>
    )}
    </div>
    </div>

    {/* Clear queue button */}
    {queue.length > 0 && (
      <motion.div
      className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      >
      <motion.button
      onClick={() => {
        clearQueue();
        setTimeout(() => closePanel(), 100);
      }}
      className="w-full py-3 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 transition-colors text-white font-medium select-none shadow-lg"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      >
      Clear All Tracks
      </motion.button>
      </motion.div>
    )}
    </motion.div>
    </AnimatePresence>
  );
};

export default MobileQueuePanel;
