import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusSquare, Music, X } from 'lucide-react';
import MusicAPI from '../services/api';

const CreatePlaylist = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await MusicAPI.createPlaylist({
        name,
        description,
        trackIds: []
      });
      const playlistId = response.data.playlistId || response.data.id;
      navigate(`/playlist/${playlistId}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to create playlist');
    }
  };

  return (
    <div className="min-h-full">
      {/* Header with Gradient */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-background" />
        <div className="relative z-10 p-8">
          <div className="flex items-end gap-6 mb-8">
            <div className="w-52 h-52 bg-gradient-to-br from-accent to-accent-dark 
                         flex items-center justify-center shadow-lg rounded-lg">
              <PlusSquare size={64} className="text-white/20" />
            </div>
            <div>
              <h5 className="text-sm text-white/80">Create</h5>
              <h1 className="text-5xl font-bold mb-4">New Playlist</h1>
              <p className="text-white/60 text-sm">Create a new playlist to share with others</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/90 text-white px-4 py-3 rounded-lg flex items-center justify-between mb-6"
            >
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Playlist Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="My Awesome Playlist"
                className="w-full h-12 rounded-lg bg-surface border border-white/10 px-4 
                         text-white placeholder:text-white/40
                         focus:border-accent focus:ring-1 focus:ring-accent
                         hover:border-white/20 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe your playlist..."
                className="w-full rounded-lg bg-surface border border-white/10 px-4 py-3 
                         text-white placeholder:text-white/40
                         focus:border-accent focus:ring-1 focus:ring-accent
                         hover:border-white/20 transition-colors"
              />
            </div>

            <div className="flex items-center gap-4">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 h-12 bg-accent rounded-full text-white font-medium
                         hover:bg-accent/80 transition-colors flex items-center gap-2"
              >
                <PlusSquare size={20} />
                Create Playlist
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(-1)}
                className="px-8 h-12 bg-surface rounded-full text-white font-medium
                         hover:bg-surface-light transition-colors"
              >
                Cancel
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CreatePlaylist;