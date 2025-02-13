// src/contexts/AudioContext.jsx
import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import MusicAPI from '../services/api';

const AudioContext = createContext(null);

export const AudioProvider = ({ children }) => {
  // Audio element reference
  const audioRef = useRef(new Audio());

  // Player state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(() => {
    return parseFloat(localStorage.getItem('volume')) || 1;
  });

  // Queue state
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueHistory, setQueueHistory] = useState([]);

  // Playback settings
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none'); // 'none', 'all', 'one'

  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [buffering, setBuffering] = useState(false);

  // Basic playback controls
  const togglePlay = useCallback(async () => {
    if (!currentTrack) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling play:', error);
      setError('Failed to toggle playback');
    }
  }, [currentTrack, isPlaying]);

  const seek = useCallback(
    (time) => {
      if (!currentTrack) return;
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    },
    [currentTrack]
  );

  const setAudioVolume = useCallback((value) => {
    audioRef.current.volume = value;
    setVolume(value);
    localStorage.setItem('volume', value.toString());
  }, []);

  // Playback control functions
  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((current) => {
      switch (current) {
        case 'none':
          return 'all';
        case 'all':
          return 'one';
        case 'one':
          return 'none';
        default:
          return 'none';
      }
    });
  }, []);

  // Queue management functions
  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(0);
    setQueueHistory([]);
  }, []);

  const addToQueue = useCallback((tracks) => {
    const tracksArray = Array.isArray(tracks) ? tracks : [tracks];
    setQueue((prev) => [...prev, ...tracksArray]);
  }, []);

  const removeFromQueue = useCallback(
    (index) => {
      setQueue((prev) => prev.filter((_, i) => i !== index));
      if (index < queueIndex) {
        setQueueIndex((prev) => prev - 1);
      }
    },
    [queueIndex]
  );

  // Play track function – always fetch updated track info from API.
  const playTrack = useCallback(
    async (track, addToQueue = true) => {
      try {
        setError(null);
        setLoading(true);
        let trackInfo = track;

        // Ensure we have a valid track ID
        if (!trackInfo || !trackInfo.id) {
          setError('Invalid track information');
          setLoading(false);
          return;
        }

        // Always call the API to fetch updated track info
        try {
          const response = await MusicAPI.getTrack(trackInfo.id);
          trackInfo = response.data;
        } catch (error) {
          console.error('Error fetching track:', error);
          setError('Track not found or inaccessible');
          setLoading(false);
          return;
        }

        // If the same track is playing, simply toggle play/pause.
        if (currentTrack?.id === trackInfo.id) {
          togglePlay();
          setLoading(false);
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        const audio = audioRef.current;
        try {
          // Fetch the audio stream with proper headers
          const streamInfo = MusicAPI.streamTrack(trackInfo.id);
          const response = await fetch(streamInfo.url, {
            headers: streamInfo.headers,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Create a blob from the audio stream
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          // Create a promise that resolves when the audio is loaded
          const loadPromise = new Promise((resolve, reject) => {
            const loadedHandler = () => {
              audio.removeEventListener('loadeddata', loadedHandler);
              audio.removeEventListener('error', errorHandler);
              resolve();
            };

            const errorHandler = (e) => {
              audio.removeEventListener('loadeddata', loadedHandler);
              audio.removeEventListener('error', errorHandler);
              URL.revokeObjectURL(audio.src);
              reject(new Error(e.target.error?.message || 'Failed to load audio'));
            };

            audio.addEventListener('loadeddata', loadedHandler);
            audio.addEventListener('error', errorHandler);
          });

          // Clean up any existing blob URL
          if (audio.src && audio.src.startsWith('blob:')) {
            URL.revokeObjectURL(audio.src);
          }

          // Set the new audio source
          audio.src = blobUrl;
          audio.load();

          await loadPromise;

          if (addToQueue) {
            if (currentTrack) {
              setQueueHistory((prev) => [...prev, currentTrack]);
            }
            setQueue((prev) => [...prev, trackInfo]);
            setQueueIndex(queue.length);
          }

          setCurrentTrack(trackInfo);

          try {
            await audio.play();
            setIsPlaying(true);
            setLoading(false);
            // Optionally update play count on server (non-blocking)
            MusicAPI.updatePlayCount?.(trackInfo.id).catch(console.error);
          } catch (playError) {
            console.error('Play error:', playError);
            setError('Failed to start playback. Please try again.');
            setLoading(false);
          }
        } catch (loadError) {
          console.error('Load error:', loadError);
          setError('Failed to load audio. Please check your connection and try again.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error playing track:', error);
        setError(error.message || 'Failed to play track');
        setLoading(false);
      }
    },
    [currentTrack, queue.length, togglePlay]
  );

  // Cleanup for blob URLs
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio.src && audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
    };
  }, []);

  // Navigation functions
  const playNext = useCallback(
    (forcePlay = false) => {
      if (queue.length === 0) return;
      let nextIndex;
      if (shuffle) {
        const availableIndices = Array.from({ length: queue.length }, (_, i) => i).filter(
          (i) => i !== queueIndex
        );
        if (availableIndices.length === 0) return;
        nextIndex =
          availableIndices[Math.floor(Math.random() * availableIndices.length)];
      } else {
        nextIndex = (queueIndex + 1) % queue.length;
      }
      setQueueIndex(nextIndex);
      playTrack(queue[nextIndex], false);
    },
    [queue, queueIndex, shuffle, playTrack]
  );

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    if (currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (queueHistory.length > 0) {
      const previousTrack = queueHistory[queueHistory.length - 1];
      setQueueHistory((prev) => prev.slice(0, -1));
      playTrack(previousTrack, false);
      return;
    }
    let prevIndex;
    if (shuffle) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = queueIndex === 0 ? queue.length - 1 : queueIndex - 1;
    }
    setQueueIndex(prevIndex);
    playTrack(queue[prevIndex], false);
  }, [queue, queueIndex, currentTime, shuffle, queueHistory, playTrack]);

  const handleTrackEnd = useCallback(() => {
    if (repeat === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    } else if (repeat === 'all' && queue.length > 0) {
      playNext(true);
    } else if (queueIndex < queue.length - 1) {
      playNext();
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [repeat, queue.length, queueIndex, playNext]);

  // Initialize audio element and event listeners
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;
    const handleLoadStart = () => {
      setLoading(true);
      setBuffering(true);
    };
    const handleLoadedData = () => {
      setLoading(false);
      setBuffering(false);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleDurationChange = () => {
      setDuration(audio.duration);
    };
    const handleError = (e) => {
      console.error('Audio error:', e);
      setError('Error playing track');
      setLoading(false);
      setBuffering(false);
    };
    const handleWaiting = () => {
      setBuffering(true);
    };
    const handlePlaying = () => {
      setBuffering(false);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleTrackEnd);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
    };
  }, [volume, handleTrackEnd]);

  const value = {
    currentTrack,
    isPlaying,
    duration,
    currentTime,
    volume,
    queue,
    queueIndex,
    queueHistory,
    shuffle,
    repeat,
    loading,
    error,
    buffering,
    playTrack,
    togglePlay,
    seek,
    setVolume: setAudioVolume,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    clearQueue,
    addToQueue,
    removeFromQueue,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export default AudioProvider;
