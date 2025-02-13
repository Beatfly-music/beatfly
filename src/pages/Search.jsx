import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search as SearchIcon,
  Play,
  Pause,
  Clock,
  ChevronRight,
  Loader,
  Music,
  User,
} from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';

const DEFAULT_ALBUM_ART = '/default-album-art.png';
const DEFAULT_PROFILE_PIC = '/default-profile-pic.png';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await MusicAPI.search(searchQuery);
      setResults(response.data);
    } catch (err) {
      setError('Error fetching search results');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) handleSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, handleSearch]);

  // Helper to get image URLs from the API
  const getImageUrl = (folder, filename) => {
    if (!filename) return null;
    return MusicAPI.getImage(folder, filename);
  };

  // ----------------- Memoized Child Components -----------------

  // Track result component (memoized)
  const TrackResult = React.memo(({ track, index }) => {
    const { currentTrack, isPlaying, togglePlay, playTrack } = useAudio();
    const isCurrentTrack = currentTrack?.id === track.id;
    const imageUrl = getImageUrl('albumArt', track.album_art);

    const handleClick = useCallback(() => {
      if (isCurrentTrack) {
        togglePlay();
      } else {
        playTrack(track);
      }
    }, [isCurrentTrack, togglePlay, playTrack, track]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group grid grid-cols-[auto,4fr,2fr,1fr] gap-4 items-center px-4 py-2 rounded-md hover:bg-surface-light"
      >
        <div className="flex items-center justify-center w-8">
          <button onClick={handleClick} className="text-gray-400 hover:text-white">
            {isCurrentTrack && isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 bg-surface rounded overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={track.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = DEFAULT_ALBUM_ART;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music size={24} className="text-white/20" />
              </div>
            )}
          </div>
          <div>
            <div className={`font-medium ${isCurrentTrack ? 'text-accent' : ''}`}>
              {track.title}
            </div>
            <Link to={`/profile/${track.user_id}`} className="text-sm text-gray-400 hover:text-white">
              {track.artist}
            </Link>
          </div>
        </div>
        <div className="text-gray-400">{track.album_title || 'Single'}</div>
        <div className="text-sm text-gray-400 text-right">{track.duration}</div>
      </motion.div>
    );
  });

  // Artist result component (memoized)
  const ArtistResult = React.memo(({ artist }) => {
    const imageUrl = getImageUrl('profilePics', artist.profile_pic);
    return (
      <Link
        to={`/profile/${artist.id}`}
        className="p-4 bg-surface rounded-lg block hover:bg-surface-light transition-colors"
      >
        <div className="w-full aspect-square mb-4 rounded-full overflow-hidden bg-surface">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={artist.username}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = DEFAULT_PROFILE_PIC;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={32} className="text-white/20" />
            </div>
          )}
        </div>
        <h3 className="font-medium text-center truncate">{artist.username}</h3>
        <p className="text-sm text-gray-400 text-center">Artist</p>
      </Link>
    );
  });

  // Album result component (memoized)
  const AlbumResult = React.memo(({ album }) => {
    const imageUrl = getImageUrl('albumArt', album.album_art);
    return (
      <Link
        to={`/album/${album.id}`}
        className="p-4 bg-surface rounded-lg block hover:bg-surface-light transition-colors"
      >
        <div className="w-full aspect-square mb-4 rounded overflow-hidden bg-surface">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={album.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = DEFAULT_ALBUM_ART;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music size={32} className="text-white/20" />
            </div>
          )}
        </div>
        <h3 className="font-medium truncate">{album.title}</h3>
        <p className="text-sm text-gray-400 truncate">{album.artist}</p>
      </Link>
    );
  });

  // ----------------- Main Render -----------------

  return (
    <div className="min-h-full p-8">
      <div className="relative max-w-2xl mb-8">
        <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to listen to?"
          className="w-full h-12 bg-surface rounded-full pl-12 pr-4 text-white 
                     focus:outline-none focus:ring-2 focus:ring-accent transition-all"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader size={24} className="animate-spin text-accent" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div className="text-red-500">{error}</div>
        </div>
      )}

      {results && !loading && (
        <div className="space-y-8">
          {results.tracks?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Songs</h2>
                {results.tracks.length > 5 && (
                  <button className="text-gray-400 hover:text-white flex items-center gap-1">
                    Show all <ChevronRight size={20} />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {results.tracks.map((track, index) => (
                  <TrackResult key={track.id} track={track} index={index} />
                ))}
              </div>
            </div>
          )}

          {results.users?.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Artists</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {results.users.map((artist) => (
                  <motion.div
                    key={artist.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <ArtistResult artist={artist} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {results.albums?.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Albums</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {results.albums.map((album) => (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <AlbumResult album={album} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {!results.tracks?.length &&
            !results.albums?.length &&
            !results.users?.length && (
              <div className="text-center py-12">
                <p className="text-gray-400">No results found for "{query}"</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Search;