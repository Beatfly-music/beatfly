import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAudio } from '../../../contexts/AudioContext';

// Services
import MusicAPI from '../../../services/api';
import LocalRecentsAPI from '../../../services/localRecentsAPI';

// Layout / Utility
import { useResponsive } from '../MainLayout';

// Sub-components
import MiniPlayer from './MiniPlayer';
import ExpandedPlayer from './ExpandedPlayer';
import QueuePanel from './QueuePanel';
import MobileQueuePanel from './MobileQueuePanel';
import LyricsPanel from './LyricsPanel';
import EQPopup from './EQPopup';
import PlaylistSelectorModal from './PlaylistSelectorModal';
import ErrorToast from './ErrorToast';
import AudioVisualizer from './AudioVisualizer';

/**
 * Renders the main Player component for the app. It orchestrates:
 *   - Basic playback controls
 *   - Expanded vs. Mini player
 *   - Queue management (desktop vs. mobile)
 *   - EQ popup
 *   - Lyrics panel, etc.
 */
const Player = ({ children }) => {
  const { isMobile } = useResponsive();
  const location = useLocation();

  // Pull everything from our audio context
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

    // Audio processing
    audioContext,
    analyzerNode
  } = useAudio();

  // Local UI states
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  // Keep track of previous volume (for toggling mute)
  const [prevVolume, setPrevVolume] = useState(volume);

  // Track route changes (close open panels)
  const [prevPath, setPrevPath] = useState(location.pathname);

  // Tutorial (mobile) for gestures, saved in localStorage
  const [tutorialShown, setTutorialShown] = useState(() => {
    return localStorage.getItem('player-tutorial-shown') === 'true';
  });

  /**
   * Close any open panels (Expanded/Queue/Lyrics/EQ) 
   * when navigating to a different route
   */
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

  /**
   * Mobile-specific gesture handling
   */
  useEffect(() => {
    if (!isMobile) return;

    document.body.classList.add('select-none');
    if (!tutorialShown) {
      localStorage.setItem('player-tutorial-shown', 'true');
      setTutorialShown(true);
    }

    // Prevent default scrolling if user is interacting with player
    const preventDefaultScroll = (e) => {
      if (
        e.target.closest('.player-controls') ||
        e.target.closest('.art-container') ||
        showExpanded ||
        showQueue ||
        showLyrics ||
        showEQ
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventDefaultScroll, { passive: false });

    return () => {
      document.body.classList.remove('select-none');
      document.removeEventListener('touchmove', preventDefaultScroll);
    };
  }, [isMobile, showExpanded, showQueue, showLyrics, showEQ, tutorialShown]);

  /**
   * Close panels when tapping the background in mobile mode
   */
  const handleBackgroundTap = useCallback(
    (e) => {
      if (!isMobile) return;
      if (e.target === e.currentTarget) {
        if (showLyrics) setShowLyrics(false);
        else if (showQueue) setShowQueue(false);
        else if (showEQ) setShowEQ(false);
        else if (showExpanded) setShowExpanded(false);
      }
    },
    [isMobile, showLyrics, showQueue, showEQ, showExpanded]
  );

  /**
   * Format time into mm:ss
   */
  const formatTime = useCallback((time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, []);

  /**
   * Store the current track into local "recents"
   * whenever we begin playing
   */
  useEffect(() => {
    if (currentTrack && isPlaying) {
      LocalRecentsAPI.addRecent(currentTrack).catch((err) => {
        console.error('Error adding to recents:', err);
      });
    }
  }, [currentTrack, isPlaying]);

  /**
   * Check if the current track is liked/favorited
   */
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!currentTrack) return;
      try {
        const response = await MusicAPI.getFavoriteTracks();
        const { tracks = [] } = response.data;
        setIsLiked(tracks.some((t) => t.id === currentTrack.id));
      } catch (err) {
        console.error('Error checking favorite status:', err);
      }
    };
    checkIfLiked();
  }, [currentTrack]);

  /**
   * Toggle like/favorite status for the current track
   */
  const toggleLike = useCallback(async () => {
    if (!currentTrack) return;
    try {
      setIsLiked((prev) => !prev); // optimistic UI
      if (isLiked) {
        await MusicAPI.unfavoriteTrack(currentTrack.id);
      } else {
        await MusicAPI.favoriteTrack(currentTrack.id);
      }
    } catch (err) {
      // revert if error
      setIsLiked((prev) => !prev);
      console.error('Error toggling like:', err);
    }
  }, [currentTrack, isLiked]);

  /**
   * Handler for volume slider
   */
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

  /**
   * Toggle mute/unmute
   */
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(prevVolume > 0 ? prevVolume : 0.5);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume, prevVolume, setVolume]);

  /**
   * Safely get album art or a default placeholder
   */
  const getTrackImage = useCallback(() => {
    if (!currentTrack) return '/default-album-art.png';
    const imagePath = currentTrack.track_image || currentTrack.album_art;
    if (!imagePath) return '/default-album-art.png';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    return MusicAPI.getImage('albumArt', imagePath);
  }, [currentTrack]);

  // Common props for sub-components
  const playerProps = {
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
    showQueue,
    setShowQueue,
    showLyrics,
    setShowLyrics,
    showEQ,
    setShowEQ,
    isMobile,
    audioContext,
    analyzerNode,
    tutorialShown
  };

  return (
    <>
      {/** EXPANDED PLAYER **/}
      <AnimatePresence>
        {showExpanded && (
          <ExpandedPlayer
            {...playerProps}
            onClose={() => setShowExpanded(false)}
            setShowPlaylistModal={setShowPlaylistModal}
          />
        )}
      </AnimatePresence>

      {/** MINI PLAYER **/}
      <AnimatePresence>
        {!showExpanded && (
          <MiniPlayer
            {...playerProps}
            setShowExpanded={setShowExpanded}
            volume={volume}
            handleVolumeChange={handleVolumeChange}
            toggleMute={toggleMute}
            isMuted={isMuted}
          />
        )}
      </AnimatePresence>

      {/** QUEUE PANEL (desktop) **/}
      {!isMobile && (
        <AnimatePresence>
          {showQueue && (
            <QueuePanel
              queue={queue}
              showExpanded={showExpanded}
              setShowQueue={setShowQueue}
              removeFromQueue={removeFromQueue}
              clearQueue={clearQueue}
            />
          )}
        </AnimatePresence>
      )}

      {/** QUEUE PANEL (mobile) **/}
      {isMobile && (
        <MobileQueuePanel
          queue={queue}
          showQueue={showQueue}
          setShowQueue={setShowQueue}
          removeFromQueue={removeFromQueue}
          clearQueue={clearQueue}
        />
      )}

      {/** PLAYLIST SELECTOR **/}
      <AnimatePresence>
        {showPlaylistModal && currentTrack && (
          <PlaylistSelectorModal
            currentTrack={currentTrack}
            onClose={() => setShowPlaylistModal(false)}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/** LYRICS PANEL **/}
      <LyricsPanel
        showLyrics={showLyrics}
        setShowLyrics={setShowLyrics}
        showExpanded={showExpanded}
        lyrics={currentTrack?.lyrics}
        currentTime={currentTime}
        isMobile={isMobile}
      />

      {/** EQ POPUP **/}
      <EQPopup showEQ={showEQ} setShowEQ={setShowEQ} isMobile={isMobile} />

      {/** ERROR TOAST **/}
      <AnimatePresence>
        {error && (
          <ErrorToast
            error={error}
            showExpanded={showExpanded}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/** MAIN CONTENT (below the player) **/}
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
