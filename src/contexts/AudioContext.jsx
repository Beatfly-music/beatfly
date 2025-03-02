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

// Native IndexedDB setup for caching
const initializeDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('music-cache-db', 1);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for track metadata
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id' });
      }
      
      // Store for audio blobs
      if (!db.objectStoreNames.contains('audio-files')) {
        db.createObjectStore('audio-files', { keyPath: 'id' });
      }
      
      // Store for album art
      if (!db.objectStoreNames.contains('album-art')) {
        db.createObjectStore('album-art', { keyPath: 'url' });
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
};

// Cache manager for abstracting cache operations
const CacheManager = {
  db: null,
  
  // Initialize the database
  async init() {
    if (!this.db) {
      try {
        this.db = await initializeDB();
      } catch (err) {
        console.error('Failed to initialize IndexedDB', err);
        return null;
      }
    }
    return this.db;
  },
  
  // Helper for database operations
  async transaction(storeName, mode, callback) {
    const db = await this.init();
    if (!db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event.target.error);
      
      callback(store, resolve, reject);
    });
  },
  
  // Get track metadata from cache
  async getTrackMetadata(trackId) {
    try {
      let result = null;
      await this.transaction('tracks', 'readonly', (store, resolve) => {
        const request = store.get(trackId);
        request.onsuccess = () => {
          result = request.result;
          resolve();
        };
      });
      return result;
    } catch (error) {
      console.error('Error getting track from cache:', error);
      return null;
    }
  },
  
  // Save track metadata to cache
  async saveTrackMetadata(track) {
    try {
      // Add timestamp for cache freshness checks
      const trackWithTimestamp = {
        ...track,
        cachedAt: Date.now()
      };
      
      await this.transaction('tracks', 'readwrite', (store) => {
        store.put(trackWithTimestamp);
      });
    } catch (error) {
      console.error('Error saving track to cache:', error);
    }
  },
  
  // Get audio file from cache
  async getAudioFile(trackId) {
    try {
      let result = null;
      await this.transaction('audio-files', 'readonly', (store, resolve) => {
        const request = store.get(trackId);
        request.onsuccess = () => {
          result = request.result;
          resolve();
        };
      });
      return result;
    } catch (error) {
      console.error('Error getting audio file from cache:', error);
      return null;
    }
  },
  
  // Save audio file to cache
  async saveAudioFile(trackId, blob) {
    try {
      await this.transaction('audio-files', 'readwrite', (store) => {
        store.put({
          id: trackId,
          blob,
          cachedAt: Date.now()
        });
      });
    } catch (error) {
      console.error('Error saving audio file to cache:', error);
    }
  },
  
  // Get album art from cache
  async getAlbumArt(url) {
    try {
      let result = null;
      await this.transaction('album-art', 'readonly', (store, resolve) => {
        const request = store.get(url);
        request.onsuccess = () => {
          result = request.result;
          resolve();
        };
      });
      return result;
    } catch (error) {
      console.error('Error getting album art from cache:', error);
      return null;
    }
  },
  
  // Save album art to cache
  async saveAlbumArt(url, blob) {
    try {
      await this.transaction('album-art', 'readwrite', (store) => {
        store.put({
          url,
          blob,
          cachedAt: Date.now()
        });
      });
    } catch (error) {
      console.error('Error saving album art to cache:', error);
    }
  },
  
  // Check if cache is stale
  isCacheStale(cachedAt, maxAge = 24 * 60 * 60 * 1000) { // Default 24 hours
    return !cachedAt || (Date.now() - cachedAt > maxAge);
  },
  
  // Get all items from a store
  async getAllItems(storeName) {
    try {
      let items = [];
      await this.transaction(storeName, 'readonly', (store, resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
          items = request.result;
          resolve();
        };
      });
      return items;
    } catch (error) {
      console.error(`Error getting all items from ${storeName}:`, error);
      return [];
    }
  },
  
  // Delete item from store
  async deleteItem(storeName, key) {
    try {
      await this.transaction(storeName, 'readwrite', (store) => {
        store.delete(key);
      });
    } catch (error) {
      console.error(`Error deleting item from ${storeName}:`, error);
    }
  },
  
  // Clear a store
  async clearStore(storeName) {
    try {
      await this.transaction(storeName, 'readwrite', (store) => {
        store.clear();
      });
    } catch (error) {
      console.error(`Error clearing store ${storeName}:`, error);
    }
  },
  
  // Clean up old cache entries
  async cleanupCache(maxAge = 7 * 24 * 60 * 60 * 1000) { // Default 7 days
    try {
      const db = await this.init();
      if (!db) return;
      
      const now = Date.now();
      const cutoff = now - maxAge;
      
      // Clean up tracks
      const tracks = await this.getAllItems('tracks');
      for (const track of tracks) {
        if (track.cachedAt && track.cachedAt < cutoff) {
          await this.deleteItem('tracks', track.id);
        }
      }
      
      // Clean up audio files
      const audioFiles = await this.getAllItems('audio-files');
      for (const file of audioFiles) {
        if (file.cachedAt && file.cachedAt < cutoff) {
          await this.deleteItem('audio-files', file.id);
        }
      }
      
      // Clean up album art
      const albumArt = await this.getAllItems('album-art');
      for (const art of albumArt) {
        if (art.cachedAt && art.cachedAt < cutoff) {
          await this.deleteItem('album-art', art.url);
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }
};

// Function to cache a track in the background
const cacheTrackInBackground = async (track, networkStatus) => {
  if (!networkStatus || !track || !track.id) return;

  try {
    // First cache track metadata if needed
    const cachedTrack = await CacheManager.getTrackMetadata(track.id);
    if (!cachedTrack || CacheManager.isCacheStale(cachedTrack.cachedAt)) {
      // If track info is incomplete, fetch complete data
      if (!track.duration || !track.album_art) {
        try {
          const response = await MusicAPI.getTrack(track.id);
          const fullTrackInfo = response.data;
          await CacheManager.saveTrackMetadata(fullTrackInfo);
          // Update the local reference to use for audio caching
          track = fullTrackInfo;
        } catch (err) {
          console.log(`Couldn't fetch complete track info for ${track.id}`, err);
          // Still cache what we have if fetch failed
          await CacheManager.saveTrackMetadata(track);
        }
      } else {
        // Cache the track metadata as is
        await CacheManager.saveTrackMetadata(track);
      }
    }
    
    // Then check and cache the audio file if needed
    const cachedAudio = await CacheManager.getAudioFile(track.id);
    if (!cachedAudio) {
      // Pre-load the audio in the background
      console.log(`Pre-caching audio for queued track: ${track.id}`);
      const streamInfo = MusicAPI.streamTrack(track.id);
      fetch(streamInfo.url, { headers: streamInfo.headers })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          CacheManager.saveAudioFile(track.id, blob);
          console.log(`Successfully cached audio for track: ${track.id}`);
        })
        .catch(err => {
          console.log(`Failed to cache audio for track: ${track.id}`, err);
        });
    }
    
    // Finally, cache album art if available
    if (track.album_art) {
      const cachedArt = await CacheManager.getAlbumArt(track.album_art);
      if (!cachedArt) {
        fetch(track.album_art)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.blob();
          })
          .then(blob => {
            CacheManager.saveAlbumArt(track.album_art, blob);
          })
          .catch(err => {
            console.log(`Failed to cache album art for track: ${track.id}`, err);
          });
      }
    }
  } catch (error) {
    console.log(`Error pre-caching track ${track.id}:`, error);
  }
};

const AudioContextData = createContext(null);

export const AudioProvider = ({ children }) => {
  // ---------------------------
  //   1. WEB AUDIO + EQ SETUP
  // ---------------------------
  const [audioCtx] = useState(() => new window.AudioContext());
  const audioRef = useRef(new Audio());
  // Preload metadata and set crossOrigin to help with duration detection
  audioRef.current.preload = 'auto';
  audioRef.current.crossOrigin = 'anonymous';

  // EQ filters
  const eqFiltersRef = useRef(null);
  const [eqGains, setEqGains] = useState(frequencies.map(() => 0));

  if (!eqFiltersRef.current) {
    eqFiltersRef.current = frequencies.map((freq) => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.0;
      filter.gain.value = 0;
      return filter;
    });
  }

  const sourceRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (err) {
        console.error('Error disconnecting old source:', err);
      }
    }
    sourceRef.current = audioCtx.createMediaElementSource(audio);
    const eqFilters = eqFiltersRef.current;
    for (let i = 0; i < eqFilters.length - 1; i++) {
      eqFilters[i].connect(eqFilters[i + 1]);
    }
    eqFilters[eqFilters.length - 1].connect(audioCtx.destination);
    sourceRef.current.connect(eqFilters[0]);
    // Initialize each filter with its gain value
    eqGains.forEach((gainValue, i) => {
      eqFilters[i].gain.value = gainValue;
    });
  }, []); // Only once on mount

  useEffect(() => {
    eqGains.forEach((gainValue, i) => {
      eqFiltersRef.current[i].gain.value = gainValue;
    });
  }, [eqGains]);

  const setEqGain = useCallback((index, value) => {
    setEqGains((prev) => {
      const newGains = [...prev];
      newGains[index] = value;
      return newGains;
    });
  }, []);

  // ---------------------------
  //   1.1. CACHE MANAGEMENT
  // ---------------------------
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
  
  // Monitor network status changes
  useEffect(() => {
    const handleOnline = () => setNetworkStatus(true);
    const handleOffline = () => setNetworkStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initialize DB and run cache cleanup on mount
    CacheManager.init().then(() => {
      CacheManager.cleanupCache();
    });
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pre-fetch related tracks to cache when network is available
  const prefetchRelatedTracks = useCallback(async (currentTrackId) => {
    if (!networkStatus || !currentTrackId) return;
    
    try {
      // Get recommendations or next tracks in album/playlist
      const response = await MusicAPI.getRelatedTracks(currentTrackId);
      const relatedTracks = response.data.tracks;
      
      if (relatedTracks && relatedTracks.length) {
        // Pre-fetch in background (limited to first 3 to conserve resources)
        relatedTracks.slice(0, 3).forEach(track => {
          cacheTrackInBackground(track, networkStatus);
        });
      }
    } catch (err) {
      console.log('Error fetching related tracks for prefetching', err);
    }
  }, [networkStatus]);

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

  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueHistory, setQueueHistory] = useState([]);

  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none'); // 'none', 'all', 'one'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [buffering, setBuffering] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  // Sync player state with cache
  useEffect(() => {
    // Save current queue to local storage for persistence
    localStorage.setItem('last-queue', JSON.stringify(queue));
    localStorage.setItem('last-queue-index', queueIndex.toString());
    localStorage.setItem('shuffle', shuffle.toString());
    localStorage.setItem('repeat', repeat);
  }, [queue, queueIndex, shuffle, repeat]);

  // Restore last session on app startup
  useEffect(() => {
    try {
      const savedQueue = JSON.parse(localStorage.getItem('last-queue'));
      const savedIndex = parseInt(localStorage.getItem('last-queue-index'), 10);
      const savedShuffle = localStorage.getItem('shuffle') === 'true';
      const savedRepeat = localStorage.getItem('repeat') || 'none';
      
      if (savedQueue && Array.isArray(savedQueue) && savedQueue.length > 0) {
        setQueue(savedQueue);
        setQueueIndex(isNaN(savedIndex) ? 0 : savedIndex);
        setShuffle(savedShuffle);
        setRepeat(savedRepeat);
        
        // Don't automatically play, but set the current track
        if (savedQueue[savedIndex]) {
          setCurrentTrack(savedQueue[savedIndex]);
        }
      }
    } catch (err) {
      console.error('Error restoring player session', err);
    }
  }, []);

  // ---------------------------
  //   3. BASIC CONTROLS
  // ---------------------------
  const togglePlay = useCallback(async () => {
    if (!currentTrack) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
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

  // Toggle offline mode manually
  const toggleOfflineMode = useCallback(() => {
    setOfflineMode(prev => !prev);
  }, []);

  // ---------------------------
  //   4. QUEUE MANAGEMENT
  // ---------------------------
  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(0);
    setQueueHistory([]);
  }, []);

  // Modified addToQueue with caching for tracks that aren't added via play button
  const addToQueue = useCallback((tracks, fromPlayButton = false) => {
    const tracksArray = Array.isArray(tracks) ? tracks : [tracks];
    setQueue((prev) => [...prev, ...tracksArray]);
    
    // Only pre-cache if not from play button and network is available
    if (!fromPlayButton && networkStatus) {
      // For each track, start the caching process in the background
      tracksArray.forEach(track => {
        cacheTrackInBackground(track, networkStatus);
      });
    }
  }, [networkStatus]);

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
  //   5. PLAY/LOAD TRACKS WITH CACHING
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

        // If it's the same track, toggle play/pause
        if (currentTrack?.id === trackInfo.id) {
          togglePlay();
          setLoading(false);
          return;
        }

        const token = localStorage.getItem('token');
        if (!token && !offlineMode) {
          throw new Error('Authentication required');
        }

        // Try to get updated track metadata (from cache first, then network)
        try {
          // Check if we have the track in cache first
          const cachedTrackInfo = await CacheManager.getTrackMetadata(trackInfo.id);
          
          // Use cached track if available and not online, or if cache is fresh
          const useCache = cachedTrackInfo && 
            (!networkStatus || !CacheManager.isCacheStale(cachedTrackInfo.cachedAt));
          
          if (useCache) {
            // Use the cached metadata
            trackInfo = cachedTrackInfo;
            console.log('Using cached metadata for track', trackInfo.id);
          } else if (networkStatus) {
            // Fetch from network if available
            try {
              const response = await MusicAPI.getTrack(trackInfo.id);
              trackInfo = response.data;
              
              // Update the cache with fresh metadata
              await CacheManager.saveTrackMetadata(trackInfo);
            } catch (err) {
              console.error('Network error fetching track', err);
              // Fall back to cache if network fails
              if (cachedTrackInfo) {
                trackInfo = cachedTrackInfo;
                console.log('Falling back to cached metadata after network error');
              } else {
                throw err; // Re-throw if no cache available
              }
            }
          } else if (!cachedTrackInfo) {
            throw new Error('Track not available offline');
          }
        } catch (err) {
          console.error('Error fetching track metadata:', err);
          if (!networkStatus) {
            setError('Track not available offline');
          } else {
            setError('Track not found or inaccessible');
          }
          setLoading(false);
          return;
        }

        const audio = audioRef.current;
        
        // Try to get audio from cache first
        const cachedAudio = await CacheManager.getAudioFile(trackInfo.id);
        let blobUrl;
        
        if (cachedAudio && cachedAudio.blob) {
          console.log('Using cached audio file for track', trackInfo.id);
          blobUrl = URL.createObjectURL(cachedAudio.blob);
        } else if (networkStatus) {
          // Fetch from network if not in cache and online
          try {
            const streamInfo = MusicAPI.streamTrack(trackInfo.id);
            const response = await fetch(streamInfo.url, {
              headers: streamInfo.headers,
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            blobUrl = URL.createObjectURL(blob);
            
            // Save to cache for future offline use
            await CacheManager.saveAudioFile(trackInfo.id, blob);
          } catch (err) {
            console.error('Network error fetching audio', err);
            throw new Error('Failed to load audio file');
          }
        } else {
          // Offline and no cache available
          throw new Error('Audio file not available offline');
        }

        // Use a promise that resolves when metadata is loaded
        const loadPromise = new Promise((resolve, reject) => {
          const onLoadedMetadata = () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('error', onError);
            resolve();
          };
          const onError = (e) => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('error', onError);
            URL.revokeObjectURL(audio.src);
            reject(
              new Error(e.target.error?.message || 'Failed to load audio')
            );
          };
          audio.addEventListener('loadedmetadata', onLoadedMetadata);
          audio.addEventListener('error', onError);
        });

        // Clean up old blob URL if exists
        if (audio.src && audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }

        audio.src = blobUrl;
        audio.load();

        await loadPromise;

        // Multiple verification for duration:
        // Compare audio.duration with trackInfo.duration (if available)
        let reportedDuration = audio.duration;
        if (
          trackInfo.duration &&
          (reportedDuration === Infinity ||
          Math.abs(reportedDuration - trackInfo.duration) > 5)
        ) {
          setDuration(trackInfo.duration);
        } else {
          setDuration(reportedDuration);
        }

        if (addToQueueFlag) {
          if (currentTrack) {
            setQueueHistory((prev) => [...prev, currentTrack]);
          }
          // Add to queue with fromPlayButton flag set to true
          addToQueue([trackInfo], true);
          setQueueIndex(queue.length);
        }

        setCurrentTrack(trackInfo);

        try {
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          await audio.play();
          setIsPlaying(true);
          setLoading(false);
          
          // Start prefetching related tracks
          prefetchRelatedTracks(trackInfo.id);
          
          // Update play count if online
          if (networkStatus) {
            MusicAPI.updatePlayCount?.(trackInfo.id).catch(console.error);
          }
        } catch (playError) {
          console.error('Play error:', playError);
          setError('Failed to start playback. Please try again.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error playing track:', err);
        setError(err.message || 'Failed to play track');
        setLoading(false);
      }
    },
    [currentTrack, queue.length, togglePlay, audioCtx, offlineMode, networkStatus, prefetchRelatedTracks, addToQueue]
  );

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
        const availableIndices = [...queue.keys()].filter(
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
    audio.preload = 'auto';

    const handleLoadStart = () => {
      setLoading(true);
      setBuffering(true);
    };
    const handleLoadedData = () => {
      setLoading(false);
      setBuffering(false);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
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
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleTrackEnd);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
    };
  }, [volume, handleTrackEnd]);

  // ---------------------------
  //   9. CACHE MANAGEMENT API
  // ---------------------------
  const clearCache = useCallback(async () => {
    try {
      await CacheManager.clearStore('tracks');
      await CacheManager.clearStore('audio-files');
      await CacheManager.clearStore('album-art');
      console.log('Cache cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }, []);

  const getCacheSize = useCallback(async () => {
    try {
      // Get all stored objects
      const tracks = await CacheManager.getAllItems('tracks');
      const audioFiles = await CacheManager.getAllItems('audio-files');
      const albumArt = await CacheManager.getAllItems('album-art');
      
      // Calculate size
      let totalSize = 0;
      
      // Audio files will be the largest
      audioFiles.forEach(file => {
        if (file.blob && file.blob.size) {
          totalSize += file.blob.size;
        }
      });
      
      // Album art
      albumArt.forEach(art => {
        if (art.blob && art.blob.size) {
          totalSize += art.blob.size;
        }
      });
      
      // Track metadata (rough estimate)
      totalSize += JSON.stringify(tracks).length;
      
      // Convert to MB for readability
      return {
        totalMB: (totalSize / (1024 * 1024)).toFixed(2),
        tracks: tracks.length,
        audioFiles: audioFiles.length,
        albumArt: albumArt.length
      };
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return null;
    }
  }, []);

  // ---------------------------
  //   10. PROVIDER OUTPUT
  // ---------------------------
  const value = {
    // EQ
    eqGains,
    setEqGain,
    // Player state
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
    // Network status
    networkStatus,
    offlineMode,
    toggleOfflineMode,
    // Playback methods
    playTrack,
    togglePlay,
    seek,
    setVolume: setAudioVolume,
    playNext,
    playPrevious,
    // Toggles
    toggleShuffle,
    toggleRepeat,
    // Queue management
    clearQueue,
    addToQueue,
    removeFromQueue,
    // Cache management
    clearCache,
    getCacheSize,
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