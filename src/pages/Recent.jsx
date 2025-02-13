import React, { useState, useEffect } from 'react';
import { Clock, Play } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';
import { motion } from 'framer-motion';
import LocalRecentsAPI from '../services/localRecentsAPI';

const Recent = () => {
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useAudio();

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
      className="min-h-screen bg-gradient-to-b from-purple-900/30 to-background p-8"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-end gap-6 mb-8">
        <div className="w-52 h-52 bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center shadow-lg rounded-lg">
          <Clock size={64} className="text-white" />
        </div>
        <div>
          <h5 className="text-sm text-white/80">History</h5>
          <h1 className="text-5xl font-bold mb-4 text-white">Recently Played</h1>
          <p className="text-white/60 text-sm">Your listening history</p>
        </div>
      </div>

      {recentTracks.length === 0 ? (
        <div className="text-center text-white">
          <p className="text-xl">No recent tracks found</p>
          <p className="mt-2 text-gray-400">Start playing some music to see them here.</p>
        </div>
      ) : (
        /* Recently Played Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-8">
          {recentTracks.map((track) => (
            <motion.div
              key={track.id}
              className="bg-surface p-4 rounded-lg hover:bg-surface-light transition-colors group"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <img 
                  src={track.track_image || '/default-track.png'} 
                  alt={track.title}
                  className="aspect-square object-cover rounded-md mb-4"
                />
                <button 
                  onClick={() => playTrack(track)}
                  className="absolute bottom-4 right-2 w-10 h-10 bg-accent rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg"
                >
                  <Play size={20} className="text-white" />
                </button>
              </div>
              <h3 className="font-medium truncate text-white">{track.title}</h3>
              <p className="text-sm text-gray-400 truncate">{track.artist}</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Recent;
