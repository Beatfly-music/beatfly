import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import MusicAPI from '../../../services/api';

/* ─────────────────────────────────────────────── *
 *           PlaylistSelectorModal                *
 * ─────────────────────────────────────────────── */
const PlaylistSelectorModal = ({ currentTrack, onClose, isMobile = false }) => {
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const modalRef = useRef(null);

  // Custom navigate function that closes expanded player
  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await MusicAPI.getPlaylists();
        const data = response.data.playlists || response.data;
        setPlaylists(data);
        // Initialize selection state
        const initialSelected = {};
        data.forEach((playlist) => {
          if (playlist.tracks && Array.isArray(playlist.tracks)) {
            initialSelected[playlist.id] = playlist.tracks.some(
              (t) => (t.id ? t.id === currentTrack.id : t === currentTrack.id)
            );
          } else {
            initialSelected[playlist.id] = false;
          }
        });
        setSelected(initialSelected);
      } catch (err) {
        setError('Failed to fetch playlists');
      } finally {
        setLoading(false);
      }
    };
    
    if (currentTrack) {
      fetchPlaylists();
    }
  }, [currentTrack]);

  const toggleSelection = (playlistId) => {
    setSelected((prev) => ({
      ...prev,
      [playlistId]: !prev[playlistId],
    }));
  };

  const handleSave = async () => {
    try {
      await Promise.all(
        playlists.map(async (playlist) => {
          const isSelected = selected[playlist.id];
          const alreadyIn =
            playlist.tracks &&
            Array.isArray(playlist.tracks) &&
            playlist.tracks.some(
              (t) => (t.id ? t.id === currentTrack.id : t === currentTrack.id)
            );
          if (isSelected && !alreadyIn) {
            await MusicAPI.addToPlaylist(playlist.id, currentTrack.id);
          } else if (!isSelected && alreadyIn) {
            await MusicAPI.removeFromPlaylist(playlist.id, currentTrack.id);
          }
        })
      );
      onClose();
    } catch (err) {
      setError('Failed to update playlists');
    }
  };

  // Close on drag down for mobile
  const handleDragEnd = (e, info) => {
    if (isMobile && info.offset.y > 100) {
      onClose();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={modalRef}
        className={`bg-surface p-6 rounded-lg ${isMobile ? 'w-full max-w-sm mx-4' : 'w-full max-w-md'}`}
        initial={{ scale: 0.8, opacity: 0, y: isMobile ? 100 : 0 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: isMobile ? 100 : 0 }}
        transition={{ type: "spring", damping: 25 }}
        drag={isMobile ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={isMobile ? { marginBottom: '5rem' } : {}}
      >
        {isMobile && (
          <div className="w-16 h-1 bg-gray-500/30 rounded-full absolute top-2 left-1/2 transform -translate-x-1/2" />
        )}
        
        <h2 className="text-xl font-bold mb-4 select-none">Add to Playlist</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <motion.div 
              className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : error ? (
          <div className="text-red-500 select-none">{error}</div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {playlists.map((playlist) => (
              <motion.div
                key={playlist.id}
                className="flex items-center justify-between p-2 hover:bg-surface-light rounded-lg group"
                whileHover={{ x: 5 }}
              >
                <span
                  className="cursor-pointer hover:text-accent transition-colors select-none"
                  onClick={() => handleNavigate(`/playlist/${playlist.id}`)}
                >
                  {playlist.name}
                </span>
                <input
                  type="checkbox"
                  checked={!!selected[playlist.id]}
                  onChange={() => toggleSelection(playlist.id)}
                  className="ml-4 cursor-pointer w-4 h-4"
                />
              </motion.div>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-4">
          <motion.button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 transition select-none"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Cancel
          </motion.button>
          <motion.button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-accent text-white hover:bg-accent/80 transition select-none"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Save
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PlaylistSelectorModal;