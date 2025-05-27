import React, { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * parseLRC - given an LRC string, returns an array of { time, text } objects
 */
function parseLRC(lrcString) {
  if (!lrcString) return [];
  
  const lines = lrcString.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

  for (const line of lines) {
    const match = line.match(timeRegex);
    if (!match) continue;

    const [ , mm, ss, msRaw ] = match;
    const minutes = parseInt(mm, 10) || 0;
    const seconds = parseInt(ss, 10) || 0;
    const millis = msRaw ? parseInt(msRaw, 10) : 0;

    // For something like "03" in the third capturing group,
    // treat < 100 as hundredths, else thousandths
    const totalSeconds = minutes * 60 + seconds + (millis < 100 ? millis / 100 : millis / 1000);

    const text = line.replace(/\[.*?\]/g, '').trim();
    result.push({ time: totalSeconds, text });
  }

  // Sort by time ascending
  return result.sort((a, b) => a.time - b.time);
}

const LyricsPanel = ({
  showLyrics,
  setShowLyrics,
  showExpanded,
  lyrics,
  currentTime,
  isMobile = false,
}) => {
  const dragControls = useDragControls();
  const containerRef = useRef(null);

  // Parse the LRC lines
  const lyricLines = parseLRC(lyrics);

  // Figure out which line is currently active
  const currentLineIndex = lyricLines.findIndex((line, idx) => {
    const nextLine = lyricLines[idx + 1];
    // if no next line, we match if currentTime >= this line's time
    if (!nextLine) {
      return currentTime >= line.time;
    }
    // else we match if currentTime is between line.time and nextLine.time
    return currentTime >= line.time && currentTime < nextLine.time;
  });

  /**
   * Scroll the active lyric line into view when it changes.
   */
  useEffect(() => {
    if (!showLyrics || currentLineIndex < 0) return;
    if (!containerRef.current) return;

    const scroller = containerRef.current.querySelector('.lyric-scroller');
    if (!scroller) return;

    const activeEl = scroller.children?.[currentLineIndex];
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [showLyrics, currentLineIndex]);

  /**
   * Drag: If user drags downward >100px, close the panel (mobile).
   */
  const handleDragEnd = useCallback((_, info) => {
    if (isMobile && info.offset.y > 100) {
      setShowLyrics(false);
    }
  }, [isMobile, setShowLyrics]);

  /**
   * Renders the actual motion panel if showLyrics is true.
   * We do the AnimatePresence and the motion.div inside
   * so that when showLyrics flips to false, it triggers
   * the exit animation and unmounts.
   */
  return (
    <AnimatePresence>
      {showLyrics && (
        <motion.div
          ref={containerRef}
          // Drag for mobile or if not expanded
          drag={isMobile ? 'y' : (!showExpanded ? 'y' : false)}
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className={`fixed z-50 bg-background/90 backdrop-blur-md rounded-lg shadow-xl p-4
            ${isMobile ? 'inset-0 overflow-hidden'
                       : showExpanded
                          ? 'top-0 bottom-0 right-0 w-1/3'
                          : 'bottom-24 left-1/2 transform -translate-x-1/2'
            }`}
          // AnimatePresence states
          initial={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, x: 50 }}
          animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
          exit={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, x: 50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/** TOP BAR **/}
          <div className="flex items-center justify-between mb-4 select-none relative">
            {isMobile && (
              <div
                className="absolute top-1 left-1/2 transform -translate-x-1/2 w-16 h-1 rounded-full bg-gray-500/30"
                onPointerDown={(e) => dragControls.start(e)}
              />
            )}
            <h3 className="text-lg font-bold">Lyrics</h3>
            <motion.button
              onClick={() => setShowLyrics(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1"
            >
              <X size={20} />
            </motion.button>
          </div>

          {/** LYRICS SCROLLER **/}
          <div className="lyric-scroller overflow-y-auto max-h-full space-y-3 pb-8 pr-2">
            {lyricLines.length ? (
              lyricLines.map((line, idx) => {
                const isActive = idx === currentLineIndex;
                return (
                  <motion.p
                    key={`lyric-line-${idx}`}
                    className={`transition-all duration-300 py-1 select-none text-sm 
                      ${isActive ? 'text-white font-bold text-base scale-105' : 'text-gray-300'}`}
                    animate={isActive ? { opacity: 1 } : { opacity: 0.7 }}
                  >
                    {line.text || '...'}
                  </motion.p>
                );
              })
            ) : (
              <p className="text-sm text-gray-300 select-none">No lyrics available.</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LyricsPanel;
