// src/pages/Track.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Heart, 
  Share2,
  MoreHorizontal,
  Clock
} from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';

const Track = () => {
  const { trackId } = useParams();
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();
  const [track, setTrack] = useState(null);
  const [album, setAlbum] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTrackAndAlbum();
    checkIfLiked();
  }, [trackId]);

  const fetchTrackAndAlbum = async () => {
    try {
      setLoading(true);
      // Get track details
      const trackResponse = await MusicAPI.getTrack(trackId);
      setTrack(trackResponse.data);

      // If track belongs to an album, fetch album details
      if (trackResponse.data.album_id) {
        const albumResponse = await MusicAPI.getAlbum(trackResponse.data.album_id);
        setAlbum(albumResponse.data);
      }
    } catch (err) {
      setError('Failed to load track details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkIfLiked = async () => {
    try {
      const response = await MusicAPI.getFavoriteTracks();
      setIsLiked(response.data.tracks?.some(t => t.id === parseInt(trackId)));
    } catch (err) {
      console.error('Error checking favorite status:', err);
    }
  };

  const toggleLike = async () => {
    try {
      if (isLiked) {
        await MusicAPI.unfavoriteTrack(trackId);
      } else {
        await MusicAPI.favoriteTrack(trackId);
      }
      setIsLiked(!isLiked);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!track) return null;

  const isCurrentTrack = currentTrack?.id === track.id;

  return (
    <div className="min-h-full">
      {/* Track Header */}
      <div className="relative h-96">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-background">
          <img 
            src={track.track_image}
            alt={track.title}
            className="w-full h-full object-cover opacity-40 blur-sm"
          />
        </div>
        
        <div className="relative z-10 h-full p-8 flex flex-col justify-end">
          <div className="flex items-end gap-6">
            <div className="relative group">
              <img 
                src={track.track_image}
                alt={track.title}
                className="w-56 h-56 object-cover rounded-lg shadow-2xl"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/default-album-art.png';
                }}
              />
              <button
                onClick={() => isCurrentTrack ? togglePlay() : playTrack(track)}
                className="absolute inset-0 flex items-center justify-center bg-black/60 
                         opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
              >
                {isCurrentTrack && isPlaying ? (
                  <Pause size={48} className="text-white" />
                ) : (
                  <Play size={48} className="text-white ml-2" />
                )}
              </button>
            </div>
            
            <div>
              <h5 className="text-sm text-white/80">Song</h5>
              <h1 className="text-5xl font-bold mb-4">{track.title}</h1>
              <div className="flex items-center gap-2 text-sm">
                <Link 
                  to={`/profile/${track.user_id}`}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {track.artist}
                </Link>
                {album && (
                  <>
                    <span className="text-white/60">•</span>
                    <Link 
                      to={`/album/${album.id}`}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      {album.title}
                    </Link>
                  </>
                )}
                <span className="text-white/60">•</span>
                <span className="text-white/60">{formatDuration(track.duration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-8 py-6 flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => isCurrentTrack ? togglePlay() : playTrack(track)}
          className="w-14 h-14 bg-accent rounded-full flex items-center justify-center 
                   shadow-lg hover:bg-accent/80 transition-colors"
        >
          {isCurrentTrack && isPlaying ? (
            <Pause size={28} className="text-white" />
          ) : (
            <Play size={28} className="text-white ml-1" />
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleLike}
          className={`p-2 ${isLiked ? 'text-accent' : 'text-gray-400 hover:text-white'}`}
        >
          <Heart 
            size={24} 
            fill={isLiked ? 'currentColor' : 'none'}
            className="transition-colors duration-300"
          />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 text-gray-400 hover:text-white"
        >
          <Share2 size={24} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 text-gray-400 hover:text-white"
        >
          <MoreHorizontal size={24} />
        </motion.button>
      </div>

      {/* Album Context */}
      {album && album.tracks && (
        <div className="px-8 mt-4">
          <h2 className="text-2xl font-bold mb-4">From the Album</h2>
          <div className="space-y-1">
            {album.tracks.map((albumTrack, index) => {
              const isCurrentAlbumTrack = currentTrack?.id === albumTrack.id;
              
              return (
                <motion.div
                  key={albumTrack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-3 rounded-md hover:bg-surface-light group cursor-pointer
                           ${isCurrentAlbumTrack ? 'text-accent' : ''}`}
                  onClick={() => playTrack(albumTrack)}
                >
                  <div className="w-8 text-sm text-gray-400 group-hover:text-white">
                    {isCurrentAlbumTrack && isPlaying ? (
                      <div className="w-4 h-4 relative">
                        <span className="absolute w-1 h-4 bg-accent rounded-full animate-music-bar-1"></span>
                        <span className="absolute w-1 h-4 bg-accent rounded-full animate-music-bar-2 ml-1.5"></span>
                        <span className="absolute w-1 h-4 bg-accent rounded-full animate-music-bar-3 ml-3"></span>
                      </div>
                    ) : (
                      index + 1
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {albumTrack.title}
                    </div>
                    <div className="text-sm text-gray-400 truncate">
                      {albumTrack.artist}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    {formatDuration(albumTrack.duration)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Track;   