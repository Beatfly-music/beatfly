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

// Frequencies for each EQ band:
const frequencies = [60, 230, 910, 3600, 14000];

const AudioContextData = createContext(null);

export const AudioProvider = ({ children }) => {
  // ---------------------------
  //   1. WEB AUDIO + EQ SETUP
  // ---------------------------
  // Create the Web Audio context (only once)
  const [audioCtx] = useState(() => new window.AudioContext());

  // HTMLAudioElement reference
  const audioRef = useRef(new Audio());

  // EQ BiquadFilters for each frequency band
  const eqFiltersRef = useRef(null);
  const [eqGains, setEqGains] = useState(frequencies.map(() => 0));

  // Create the filters on first render
  if (!eqFiltersRef.current) {
    eqFiltersRef.current = frequencies.map((freq) => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.0; // Adjust as desired
      filter.gain.value = 0; // Default gain
      return filter;
    });
  }

  // We'll store the MediaElementAudioSourceNode in here:
  const sourceRef = useRef(null);

  // Connect the audio element -> filters -> audioCtx.destination
  useEffect(() => {
    const audio = audioRef.current;
    audio.crossOrigin = 'anonymous';

    // If we already created a source before, disconnect it:
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (err) {
        console.error('Error disconnecting old source:', err);
      }
    }

    // Create a new MediaElement source from our <audio> ref
    sourceRef.current = audioCtx.createMediaElementSource(audio);

    // Chain the EQ filters:
    // eqFilters[0] -> eqFilters[1] -> ... -> eqFilters[n-1] -> audioCtx.destination
    const eqFilters = eqFiltersRef.current;
    for (let i = 0; i < eqFilters.length - 1; i++) {
      eqFilters[i].connect(eqFilters[i + 1]);
    }
    eqFilters[eqFilters.length - 1].connect(audioCtx.destination);

    // Finally, connect the source to the first filter
    sourceRef.current.connect(eqFilters[0]);

    // Initialize filters with current eqGains
    eqGains.forEach((gainValue, i) => {
      eqFilters[i].gain.value = gainValue;
    });
  }, []); // Only once on mount

  // Whenever eqGains changes, update each filter's gain
  useEffect(() => {
    eqGains.forEach((gainValue, i) => {
      eqFiltersRef.current[i].gain.value = gainValue;
    });
  }, [eqGains]);

  // Provide a helper to set the gain of a specific band
  const setEqGain = useCallback((index, value) => {
    setEqGains((prev) => {
      const newGains = [...prev];
      newGains[index] = value;
      return newGains;
    });
  }, []);

  // ---------------------------
  //    2. PLAYER STATE
  // ---------------------------
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(
    () => parseFloat(localStorage.getItem('volume')) || 1
  );

  // Queue
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueHistory, setQueueHistory] = useState([]);

  // Playback settings
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none'); // 'none', 'all', 'one'

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [buffering, setBuffering] = useState(false);

  // ---------------------------
  //   3. BASIC CONTROLS
  // ---------------------------
  const togglePlay = useCallback(async () => {
    if (!currentTrack) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Because of browser policies, we must resume() the AudioContext first
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        await audioRef.current.play();
      }
      setIsPlaying((prev) => !prev);
    } catch (err) {
      console.error('Error toggling play:', err);
      setError('Failed to toggle playback');
    }
  }, [currentTrack, isPlaying, audioCtx]);

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

  // Shuffle & Repeat
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

  // ---------------------------
  //   4. QUEUE MANAGEMENT
  // ---------------------------
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

  // ---------------------------
  //   5. PLAY/LOAD TRACKS
  // ---------------------------
  const playTrack = useCallback(
    async (track, addToQueueFlag = true) => {
      try {
        setError(null);
        setLoading(true);

        let trackInfo = track;
        if (!trackInfo || !trackInfo.id) {
          setError('Invalid track information');
          setLoading(false);
          return;
        }

        // Fetch updated track info
        try {
          const response = await MusicAPI.getTrack(trackInfo.id);
          trackInfo = response.data;
        } catch (err) {
          console.error('Error fetching track:', err);
          setError('Track not found or inaccessible');
          setLoading(false);
          return;
        }

        // If it's the same track, just toggle play/pause
        if (currentTrack?.id === trackInfo.id) {
          togglePlay();
          setLoading(false);
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        // Begin loading
        const audio = audioRef.current;
        try {
          const streamInfo = MusicAPI.streamTrack(trackInfo.id);
          const response = await fetch(streamInfo.url, {
            headers: streamInfo.headers,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          // Promise that resolves when the audio has loaded enough to play
          const loadPromise = new Promise((resolve, reject) => {
            const onLoaded = () => {
              audio.removeEventListener('loadeddata', onLoaded);
              audio.removeEventListener('error', onError);
              resolve();
            };
            const onError = (e) => {
              audio.removeEventListener('loadeddata', onLoaded);
              audio.removeEventListener('error', onError);
              URL.revokeObjectURL(audio.src);
              reject(
                new Error(e.target.error?.message || 'Failed to load audio')
              );
            };
            audio.addEventListener('loadeddata', onLoaded);
            audio.addEventListener('error', onError);
          });

          // If old src was a blob, revoke it
          if (audio.src && audio.src.startsWith('blob:')) {
            URL.revokeObjectURL(audio.src);
          }

          // Assign new blob
          audio.src = blobUrl;
          audio.load();

          await loadPromise;

          // Manage queue
          if (addToQueueFlag) {
            if (currentTrack) {
              setQueueHistory((prev) => [...prev, currentTrack]);
            }
            setQueue((prev) => [...prev, trackInfo]);
            setQueueIndex(queue.length);
          }

          setCurrentTrack(trackInfo);

          // Attempt to play
          try {
            if (audioCtx.state === 'suspended') {
              // Resume context on user gesture
              await audioCtx.resume();
            }
            await audio.play();
            setIsPlaying(true);
            setLoading(false);
            // Optionally update server play count
            MusicAPI.updatePlayCount?.(trackInfo.id).catch(console.error);
          } catch (playError) {
            console.error('Play error:', playError);
            setError('Failed to start playback. Please try again.');
            setLoading(false);
          }
        } catch (loadError) {
          console.error('Load error:', loadError);
          setError(
            'Failed to load audio. Please check your connection and try again.'
          );
          setLoading(false);
        }
      } catch (err) {
        console.error('Error playing track:', err);
        setError(err.message || 'Failed to play track');
        setLoading(false);
      }
    },
    [currentTrack, queue.length, togglePlay, audioCtx]
  );

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio.src && audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
    };
  }, []);

  // ---------------------------
  //   6. NEXT / PREV TRACKS
  // ---------------------------
  const playNext = useCallback(
    (forcePlay = false) => {
      if (queue.length === 0) return;
      let nextIndex;
      if (shuffle) {
        // random track that's not the current index
        const availableIndices = [...queue.keys()].filter((i) => i !== queueIndex);
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

    // If track played more than 3 seconds, just restart
    if (currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    // If there's a history, use that
    if (queueHistory.length > 0) {
      const previousTrack = queueHistory[queueHistory.length - 1];
      setQueueHistory((prev) => prev.slice(0, -1));
      playTrack(previousTrack, false);
      return;
    }
    // Otherwise go to the previous index
    let prevIndex;
    if (shuffle) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = queueIndex === 0 ? queue.length - 1 : queueIndex - 1;
    }
    setQueueIndex(prevIndex);
    playTrack(queue[prevIndex], false);
  }, [queue, queueIndex, currentTime, shuffle, queueHistory, playTrack]);

  // ---------------------------
  //   7. HANDLE TRACK END
  // ---------------------------
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

  // ---------------------------
  //   8. SETUP AUDIO EVENTS
  // ---------------------------
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    // Event handlers
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

  // ---------------------------
  //   9. PROVIDER OUTPUT
  // ---------------------------
  const value = {
    // EQ
    eqGains,
    setEqGain,

    // Main player state
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

    // Main playback methods
    playTrack,
    togglePlay,
    seek,
    setVolume: setAudioVolume,
    playNext,
    playPrevious,

    // Settings toggles
    toggleShuffle,
    toggleRepeat,

    // Queue management
    clearQueue,
    addToQueue,
    removeFromQueue,
  };

  return (
    <AudioContextData.Provider value={value}>
      {children}
    </AudioContextData.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContextData);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export default AudioProvider;
