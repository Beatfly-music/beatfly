import React, { useState, useEffect } from 'react';
import { Play, Clock, Heart } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';
import { motion } from 'framer-motion';

// Updated MarqueeText Component with fixed width and no fades
const MarqueeText = ({ text, className = '' }) => {
  const baseDuration = 20;
  const duration = Math.max(baseDuration, text.length * 0.4);

  return (
    <div className={`relative overflow-hidden w-48 ${className}`}>
      <motion.div
        className="whitespace-nowrap"
        animate={{ x: [0, "-100%"] }}
        transition={{
          x: {
            duration: duration,
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop"
          }
        }}
      >
        {text}
      </motion.div>
    </div>
  );
};

const LikedSongs = () => {
  const { playTrack } = useAudio();
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;

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
      className="min-h-full bg-gradient-to-b from-accent/30 to-background p-4 sm:p-8 overflow-x-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-end gap-4 mb-6">
        <div className="w-40 h-40 sm:w-52 sm:h-52 bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg rounded-lg">
          <Heart size={48} className="text-white" />
        </div>
        <div>
          <h5 className="text-xs sm:text-sm text-white/80">Playlist</h5>
          <h1 className="text-3xl sm:text-5xl font-bold mb-2">Liked Songs</h1>
          <p className="text-xs sm:text-sm text-white/60">{likedSongs.length} liked tracks</p>
        </div>
      </div>

      {likedSongs.length === 0 ? (
        <div className="text-sm text-gray-400 flex items-center justify-center py-4">
          No liked songs yet
        </div>
      ) : (
        <>
          {/* Desktop Grid Header */}
          {!isMobile && (
            <div className="grid grid-cols-[auto,3fr,2fr,2fr,auto] gap-4 px-4 py-2 text-sm text-gray-400 border-b border-white/10">
              <div>#</div>
              <div>Title</div>
              <div>Album</div>
              <div>Date Added</div>
              <div className="flex justify-end">
                <Clock size={16} />
              </div>
            </div>
          )}

          {likedSongs.map((song, index) => (
            <motion.div
              key={song.id}
              onClick={() => playTrack(song)}
              className={`${
                isMobile
                  ? "flex items-center gap-2 p-2 hover:bg-surface-light rounded-md"
                  : "grid grid-cols-[auto,3fr,2fr,2fr,auto] gap-4 items-center px-4 py-2 hover:bg-surface-light group rounded-md"
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className={`${isMobile ? "w-6 text-center" : "text-base text-gray-400 group-hover:text-white"}`}>
                {index + 1}
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="relative w-10 h-10">
                  <img
                    src={MusicAPI.getImage('albumArt', song.track_image + "?w=40")}
                    alt={song.title}
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/default-album-art.png';
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playTrack(song);
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                  >
                    <Play size={16} fill="white" />
                  </button>
                </div>
                <div className="flex-1">
                  {isMobile ? (
                    <MarqueeText text={song.title} className="font-medium text-sm" />
                  ) : (
                    <div className="font-medium truncate group-hover:text-white">
                      {song.title}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 truncate">{song.artist}</div>
                </div>
              </div>
              {!isMobile && (
                <>
                  <div className="truncate text-gray-400 group-hover:text-white">
                    {song.album}
                  </div>
                  <div className="truncate text-gray-400">{song.dateAdded}</div>
                  <div className="flex justify-end text-gray-400">{song.duration}</div>
                </>
              )}
              {isMobile && (
                <div className="text-xs text-gray-400">{song.duration}</div>
              )}
            </motion.div>
          ))}
        </>
      )}
    </motion.div>
  );
};

export default LikedSongs;
