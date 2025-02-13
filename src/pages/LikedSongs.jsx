import React, { useState, useEffect } from 'react';
import { Play, Clock, Heart } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';
import { motion } from 'framer-motion';

const LikedSongs = () => {
  const { playTrack } = useAudio();
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLikedSongs();
  }, []);

  const fetchLikedSongs = async () => {
    try {
      const response = await MusicAPI.getFavoriteTracks();
      if (response.data && response.data.tracks) {
        const formattedTracks = response.data.tracks.map(track => ({
          ...track,
          dateAdded: formatDate(track.created_at),
          duration: formatDuration(track.duration),
          album: track.album_title || 'Unknown Album'
        }));
        setLikedSongs(formattedTracks);
      }
    } catch (error) {
      console.error('Error fetching liked songs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format date to "MMM DD, YYYY"
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format duration from seconds to "mm:ss"
  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <motion.div
        className="min-h-full flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-full bg-gradient-to-b from-accent/30 to-background p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-end gap-6 mb-8">
        <div className="w-52 h-52 bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg rounded-lg">
          <Heart size={64} className="text-white" />
        </div>
        <div>
          <h5 className="text-sm text-white/80">Playlist</h5>
          <h1 className="text-5xl font-bold mb-4">Liked Songs</h1>
          <p className="text-white/60 text-sm">{likedSongs.length} liked tracks</p>
        </div>
      </div>

      {likedSongs.length === 0 ? (
        <div className="text-sm text-gray-400 flex items-center justify-center py-8">
          No liked songs yet
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-[auto,3fr,2fr,2fr,auto] gap-4 px-4 py-2 text-sm text-gray-400 border-b border-white/10">
            <div>#</div>
            <div>Title</div>
            <div>Album</div>
            <div>Date Added</div>
            <div className="flex justify-end">
              <Clock size={16} />
            </div>
          </div>

          {likedSongs.map((song, index) => (
            <motion.div
              key={song.id}
              className="grid grid-cols-[auto,3fr,2fr,2fr,auto] gap-4 items-center px-4 py-2 hover:bg-surface-light group rounded-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="text-base text-gray-400 group-hover:text-white">
                {index + 1}
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-10 h-10">
                  <img
                    src={MusicAPI.getImage('albumArt', song.track_image)}
                    alt={song.title}
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/default-album-art.png';
                    }}
                  />
                  <button
                    onClick={() => playTrack(song)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                  >
                    <Play size={16} fill="white" />
                  </button>
                </div>
                <div>
                  <div className="font-medium truncate group-hover:text-white">
                    {song.title}
                  </div>
                  <div className="text-sm text-gray-400 truncate">
                    {song.artist}
                  </div>
                </div>
              </div>
              <div className="truncate text-gray-400 group-hover:text-white">
                {song.album}
              </div>
              <div className="truncate text-gray-400">
                {song.dateAdded}
              </div>
              <div className="flex justify-end text-gray-400">
                {song.duration}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default LikedSongs;    