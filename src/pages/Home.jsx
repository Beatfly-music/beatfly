import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { useNavigate } from 'react-router-dom';
import MusicAPI from '../services/api';

const Home = () => {
  const navigate = useNavigate();
  const [featuredAlbums, setFeaturedAlbums] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentTrack, isPlaying, playTrack } = useAudio();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const [featuredRes, recommendationsRes] = await Promise.all([
        MusicAPI.getFeaturedAlbums(),
        MusicAPI.getRecommendations()
      ]);

      // Get full album details
      const albumPromises = featuredRes.data.featured.map(album => 
        MusicAPI.getAlbum(album.id)
      );
      
      const albumDetails = await Promise.all(albumPromises);
      setFeaturedAlbums(albumDetails.map(res => res.data));
      setRecommendations(recommendationsRes.data.recommendations);
    } catch (error) {
      console.error('Error fetching content:', error);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAlbum = async (albumId, event) => {
    event.stopPropagation(); // Prevent navigation when clicking play button
    try {
      const response = await MusicAPI.getAlbum(albumId);
      const album = response.data;
      if (album.tracks?.[0]) {
        await playTrack({
          id: album.tracks[0].id,
          album_id: album.id,
          title: album.tracks[0].title,
          artist: album.tracks[0].artist,
          file_path: album.tracks[0].file_path,
          album_art: album.album_art
        });
      }
    } catch (error) {
      console.error('Error playing album:', error);
    }
  };

  const handlePlayTrack = (track, event) => {
    event.stopPropagation(); // Prevent navigation when clicking play button
    playTrack({
      id: track.id,
      album_id: track.album_id,
      title: track.title,
      artist: track.artist,
      file_path: track.file_path,
      album_art: track.album_art || track.track_image
    });
  };

  const getImageUrl = (path) => {
    if (!path) return '/default-album-art.png';
    if (path.startsWith('http')) return path;
    const filename = path.split('/').pop();
    return `http://localhost:5000/xrpc/images/albumArt/${filename}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p>{error}</p>
        <button 
          onClick={fetchContent}
          className="mt-4 px-4 py-2 bg-accent rounded-full text-white hover:bg-accent-dark transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Featured Albums */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Featured Albums</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {featuredAlbums.map(album => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              className="group relative cursor-pointer"
              onClick={() => navigate(`/album/${album.id}`)}
            >
              <div className="relative aspect-square rounded-lg overflow-hidden">
                <img 
                  src={getImageUrl(album.album_art)}
                  alt={album.title}
                  className="w-full h-full object-cover transition-transform duration-300 
                           group-hover:scale-110"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/default-album-art.png';
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 
                             transition-opacity duration-300" />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handlePlayAlbum(album.id, e)}
                  className="absolute bottom-4 right-4 w-12 h-12 bg-accent rounded-full 
                           flex items-center justify-center opacity-0 group-hover:opacity-100 
                           transition-all duration-300 transform translate-y-4 
                           group-hover:translate-y-0"
                >
                  {currentTrack?.album_id === album.id && isPlaying ? (
                    <Pause className="text-white" size={24} />
                  ) : (
                    <Play className="text-white ml-1" size={24} />
                  )}
                </motion.button>
              </div>
              <div className="mt-2">
                <h3 className="font-semibold truncate">{album.title}</h3>
                <p className="text-sm text-gray-400 truncate">{album.artist}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Recommended for You</h2>
        <div className="grid gap-2">
          {recommendations.map(track => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.01 }}
              className="bg-surface/50 hover:bg-surface p-4 rounded-lg flex items-center gap-4 
                       group transition-colors duration-200 cursor-pointer"
              onClick={() => navigate(`/track/${track.id}`)}
            >
              <div className="relative aspect-square w-16 rounded-md overflow-hidden">
                <img 
                  src={getImageUrl(track.album_art || track.track_image)}
                  alt={track.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/default-album-art.png';
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 
                             transition-opacity duration-300 flex items-center justify-center">
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause className="text-white" size={20} />
                  ) : (
                    <Play className="text-white ml-1" size={20} />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{track.title}</h3>
                <p className="text-sm text-gray-400 truncate">{track.artist}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;