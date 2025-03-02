import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Heart, 
  Share2,
  MoreHorizontal,
  Clock,
  PlayCircle
} from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';

const Track = () => {
  const { trackId } = useParams();
  const { 
    playTrack, 
    currentTrack, 
    isPlaying, 
    togglePlay,
    addToQueue 
  } = useAudio();
  
  const [track, setTrack] = useState(null);
  const [album, setAlbum] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const trackResponse = await MusicAPI.getTrack(trackId);
        setTrack(trackResponse.data);

        if (trackResponse.data.album_id) {
          const albumResponse = await MusicAPI.getAlbum(trackResponse.data.album_id);
          setAlbum(albumResponse.data);
        }

        const favoritesResponse = await MusicAPI.getFavoriteTracks();
        setIsLiked(favoritesResponse.data.tracks?.some(t => t.id === parseInt(trackId)));
      } catch (err) {
        console.error('Error fetching track data:', err);
        setError('Failed to load track details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trackId]);

  const toggleLike = async () => {
    try {
      if (isLiked) {
        await MusicAPI.unfavoriteTrack(trackId);
      } else {
        await MusicAPI.favoriteTrack(trackId);
      }
      setIsLiked(!isLiked);
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleAddToQueue = () => {
    if (track) {
      addToQueue(track);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: track.title,
        text: `Check out ${track.title} by ${track.artist}`,
        url: window.location.href
      }).catch((error) => console.log('Error sharing:', error));
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!track) return null;

  const isCurrentTrack = currentTrack?.id === track.id;

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Section */}
      <div className="relative h-[400px]">
        {/* Background Image */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface/90 to-background">
          <img 
            src={track.track_image + "?h=60"}
            alt=""
            className="w-full h-full object-cover opacity-30 blur-md"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full container mx-auto px-4 py-8 flex items-end">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-8">
            {/* Track Image */}
            <div className="relative group shrink-0">
              <img 
                src={track.track_image + "?h=256"}
                alt={track.title}
                className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-lg shadow-2xl"
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

            {/* Track Info */}
            <div className="flex-1">
              <h5 className="text-sm text-white/80 mb-2">Song</h5>
              <h1 className="text-4xl md:text-6xl font-bold mb-4">{track.title}</h1>
              <div className="flex items-center gap-2 text-sm">
                {track.artistId ? (
                  <Link 
                    to={`/profile/${track.artistId}`}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {track.artist}
                  </Link>
                ) : (
                  <span className="text-white/60">{track.artist}</span>
                )}
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

      {/* Actions Bar */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4">
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
            onClick={handleAddToQueue}
            className="p-2 text-gray-400 hover:text-white"
            title="Add to queue"
          >
            <PlayCircle size={24} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            className="p-2 text-gray-400 hover:text-white"
            title="Share track"
          >
            <Share2 size={24} />
          </motion.button>
        </div>
      </div>

      {/* Album Context */}
      {album && album.tracks && (
        <div className="container mx-auto px-4 mt-8">
          <h2 className="text-2xl font-bold mb-6">From the Album</h2>
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
                  <div className="w-8 text-sm text-gray-400 group-hover:text-white text-center">
                    {isCurrentAlbumTrack && isPlaying ? (
                      <div className="w-4 h-4 mx-auto relative">
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