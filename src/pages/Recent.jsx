import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { Link } from 'react-router-dom';
import MusicAPI from '../services/api';
import { motion } from 'framer-motion';
import LocalRecentsAPI from '../services/localRecentsAPI';
import { useResponsive } from '../components/layout/MainLayout'; // Import responsive context

const Recent = () => {
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();
  const { isMobile } = useResponsive(); // Get mobile state from context

  useEffect(() => {
    const fetchRecentTracks = async () => {
      try {
        const tracks = await LocalRecentsAPI.getRecents();
        setRecentTracks(tracks);
      } catch (error) {
        console.error('Error fetching recent tracks:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentTracks();
  }, []);

  const handlePlay = (track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  if (loading) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`min-h-screen bg-gradient-to-b from-purple-900/30 to-background ${isMobile ? 'p-4' : 'p-8'}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className={`flex items-end gap-4 ${isMobile ? 'mb-4' : 'mb-8'}`}>
        {!isMobile && (
          <div className="w-52 h-52 bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center shadow-lg rounded-lg">
            <Clock size={64} className="text-white" />
          </div>
        )}
        <div className={isMobile ? 'flex items-center gap-3' : ''}>
          {isMobile && (
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center shadow-lg rounded-lg">
              <Clock size={24} className="text-white" />
            </div>
          )}
          <div>
            <h5 className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/80`}>History</h5>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-5xl'} font-bold ${isMobile ? 'mb-1' : 'mb-4'} text-white`}>Recently Played</h1>
            {!isMobile && <p className="text-white/60 text-sm">Your listening history</p>}
          </div>
        </div>
      </div>

      {recentTracks.length === 0 ? (
        <div className="text-center text-white">
          <p className={`${isMobile ? 'text-lg' : 'text-xl'}`}>No recent tracks found</p>
          <p className="mt-2 text-gray-400 text-sm">Start playing some music to see them here.</p>
        </div>
      ) : (
        /* Recently Played Grid */
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6'} mt-4`}>
          {recentTracks.map((track) => (
            <motion.div
              key={track.id}
              className={`bg-surface ${isMobile ? 'p-2' : 'p-4'} rounded-lg hover:bg-surface-light transition-colors group`}
              whileHover={{ scale: isMobile ? 1.01 : 1.02 }}
            >
              <div className="relative aspect-square">
                <img
                  src={`${track.track_image}?w=${isMobile ? 150 : 231}&h=${isMobile ? 150 : 231}`}
                  alt={track.title}
                  className="w-full h-full object-cover rounded-md"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/default-album-art.png';
                  }}
                />
                <button
                  onClick={() => handlePlay(track)}
                  className={`absolute bottom-2 right-2 ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-accent rounded-full flex items-center justify-center ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all transform ${isMobile ? '' : 'translate-y-2 group-hover:translate-y-0'} shadow-lg hover:scale-105`}
                >
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause size={isMobile ? 16 : 20} className="text-white" />
                  ) : (
                    <Play size={isMobile ? 16 : 20} className="text-white ml-0.5" />
                  )}
                </button>
              </div>
              <div className={`${isMobile ? 'mt-2' : 'mt-4'}`}>
                <Link 
                  to={`/track/${track.id}`}
                  className={`font-medium text-white hover:text-accent truncate block ${isMobile ? 'text-sm' : ''}`}
                >
                  {track.title}
                </Link>     
                {track.artistId ? (
                  <Link 
                    to={`/profile/${track.artistId}`}
                    className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400 hover:text-white truncate block ${isMobile ? 'mt-0.5' : 'mt-1'}`}
                  >
                    {track.artist}
                  </Link>
                ) : (
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400 truncate ${isMobile ? 'mt-0.5' : 'mt-1'}`}>{track.artist}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Recent;