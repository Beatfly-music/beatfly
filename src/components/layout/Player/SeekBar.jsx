import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

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

export default SeekBar;