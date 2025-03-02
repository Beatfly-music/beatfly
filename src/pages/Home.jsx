import React, { useState, useEffect } from 'react';
import { Play, Pause, Sun, Coffee, Sunset, Moon, Loader } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { useNavigate } from 'react-router-dom';
import MusicAPI from '../services/api';
import { motion } from 'framer-motion';

// MarqueeText Component for infinite scrolling (right-to-left) with dynamic fade colors
const MarqueeText = ({ text, className = '' }) => {
  const baseDuration = 20;
  const duration = Math.max(baseDuration, text.length * 0.4);

  // Determine fade color based on the current hour
  const getFadeColor = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "#1a1a1a";     // dark (night)
    if (hour < 12) return "#FFA500";     // orange (morning)
    if (hour < 17) return "#87CEEB";     // sky blue (afternoon)
    if (hour < 22) return "#800080";     // purple (evening)
    return "#1a1a1a";                   // fallback
  };

  const fadeColor = getFadeColor();

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Left Fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-8 z-10"
        style={{ background: `linear-gradient(to right, ${fadeColor} 0%, transparent 100%)` }}
      ></div>
      
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: [0, "-50%"] }}
        transition={{
          x: {
            duration: duration,
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop"
          }
        }}
      >
        <span className="mr-12">{text}</span>
        <span className="mr-12">{text}</span>
      </motion.div>
      
      {/* Right Fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-8 z-10"
        style={{ background: `linear-gradient(to left, ${fadeColor} 0%, transparent 100%)` }}
      ></div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const [featuredAlbums, setFeaturedAlbums] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentTrack, isPlaying, playTrack } = useAudio();

  // Responsive state for mobile improvements.
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 640;
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getTimeIcon = () => {
    const hour = new Date().getHours();
    if (hour < 5) return <Moon size={32} className="text-white/80" />;
    if (hour < 12) return <Coffee size={32} className="text-white/80" />;
    if (hour < 17) return <Sun size={32} className="text-white/80" />;
    if (hour < 22) return <Sunset size={32} className="text-white/80" />;
    return <Moon size={32} className="text-white/80" />;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Good Night';
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 22) return 'Good Evening';
    return 'Late Night';
  };

  // New time-based background gradient for the hero header.
  const getBackgroundClasses = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "bg-gradient-to-b from-gray-900 to-black";
    if (hour < 12) return "bg-gradient-to-b from-yellow-300 to-orange-200";
    if (hour < 17) return "bg-gradient-to-b from-blue-400 to-blue-200";
    if (hour < 22) return "bg-gradient-to-b from-purple-600 to-blue-900";
    return "bg-gradient-to-b from-gray-900 to-black";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, featuredRes, recommendationsRes] = await Promise.all([
          MusicAPI.getUserProfile(),
          MusicAPI.getFeaturedAlbums(),
          MusicAPI.getRecommendations()
        ]);

        setUserProfile(profileRes.data);

        const albumPromises = featuredRes.data.featured.map(album =>
          MusicAPI.getAlbum(album.id)
        );
        const albumDetails = await Promise.all(albumPromises);
        setFeaturedAlbums(albumDetails.map(res => res.data));

        const recs = recommendationsRes.data && recommendationsRes.data.recommendations 
          ? recommendationsRes.data.recommendations 
          : [];
        setRecommendations(recs);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePlayAlbum = async (albumId, event) => {
    event.stopPropagation();
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
          album_art: album.album_art + "?h=264"
        });
      }
    } catch (error) {
      console.error('Error playing album:', error);
    }
  };

  const handlePlayTrack = (track, event) => {
    event.stopPropagation();
    playTrack({
      id: track.id,
      album_id: track.album_id,
      title: track.title,
      artist: track.artist,
      file_path: track.file_path,
      album_art: (track.album_art || track.track_image) + "?h=264"
    });
  };

  const getImageUrl = (path) => {
    if (!path) return '/default-album-art.png';
    if (path.startsWith('http')) return path;
    const filename = path.split('/').pop();
    return `https://api.beatfly-music.xyz/xrpc/images/albumArt/${filename}?h=264`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full overflow-x-hidden">
        <Loader className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 overflow-x-hidden">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-accent rounded-full text-white hover:bg-accent-dark transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full overflow-x-hidden">
      {/* Hero Header with time-based background */}
      <div className={`relative w-full ${getBackgroundClasses()}`}>
        <div className="absolute inset-0 overflow-hidden">
          {recommendations.length > 0 && (
            <>
              <img 
                src={getImageUrl(recommendations[0].album_art || recommendations[0].track_image) + "?h=264"}
                alt=""
                className="w-full h-full object-cover filter blur-2xl opacity-30"
              />
              <div className="absolute inset-0 bg-black/40" />
            </>
          )}
        </div>

        <div className="relative z-10 p-8">
          <div className="flex flex-col justify-end h-64">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                {getTimeIcon()}
                <h5 className="text-xl text-white/80">{getGreeting()}</h5>
              </div>
              <div className="flex items-center gap-4">
                {userProfile?.profile_pic && (
                  <img 
                    src={getImageUrl(userProfile.profile_pic) + "?h=45"}
                    alt={userProfile.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <motion.h1 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="text-5xl font-bold text-white"
                >
                  Welcome back, {userProfile?.username || 'Guest'}
                </motion.h1>
              </div>
              {recommendations.length > 0 && (
                isMobile ? (
                  <MarqueeText 
                    text={`Currently Trending: ${recommendations[0].title} by ${recommendations[0].artist}`}
                    className="text-white/60 text-lg mt-2"
                  />
                ) : (
                  <p className="text-white/60 text-lg mt-2">
                    Currently Trending: {recommendations[0].title} by {recommendations[0].artist}
                  </p>
                )
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-12">
        {/* Featured Albums */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-white">Featured Albums</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {featuredAlbums.map((album, index) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="group relative cursor-pointer"
                onClick={() => navigate(`/album/${album.id}`)}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden">
                  <img 
                    src={getImageUrl(album.album_art) + "?h=264"}
                    alt={album.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/default-album-art.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                  <h3 className="font-semibold truncate text-white">{album.title}</h3>
                  <p className="text-sm text-gray-400 truncate">{album.artist}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recommended for You */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-white">Recommended for You</h2>
          {recommendations.length === 0 ? (
            <p className="text-gray-400">No recommendations available. Try exploring some tracks!</p>
          ) : (
            <div className="grid gap-2">
              {recommendations.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className="bg-surface/50 hover:bg-surface p-4 rounded-lg flex items-center gap-4 
                           group transition-colors duration-200 cursor-pointer"
                  onClick={() => navigate(`/track/${track.id}`)}
                >
                  <div className="relative aspect-square w-16 rounded-md overflow-hidden">
                    <img 
                      src={getImageUrl(track.album_art || track.track_image) + "?h=60"}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/default-album-art.png';
                      }}
                    />
                    <button
                      onClick={(e) => handlePlayTrack(track, e)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 
                               transition-opacity duration-300 flex items-center justify-center"
                    >
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="text-white" size={20} />
                      ) : (
                        <Play className="text-white ml-1" size={20} />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    {isMobile ? (
                      <MarqueeText text={track.title} className="font-medium text-white w-48" />
                    ) : (
                      <div className="font-medium truncate group-hover:text-white">{track.title}</div>
                    )}
                    <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;
