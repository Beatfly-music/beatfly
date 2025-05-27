import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Sun, Coffee, Sunset, Moon, CloudRain, Cloud, Loader } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { useNavigate } from 'react-router-dom';
import MusicAPI from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

// Fixed MarqueeText with stable animation
const MarqueeText = ({ text, className = '', speed = 30 }) => {
  // Use a stable key to prevent re-mounting
  const stableKey = useRef(Math.random()).current;
  const duration = Math.max(speed, text.length * 0.3);

  return (
    <div className={`relative overflow-hidden ${className}`}>
    <motion.div
    key={stableKey} // Stable key prevents remounting
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
    <span className="pr-8">{text}</span>
    <span className="pr-8">{text}</span>
    </motion.div>
    </div>
  );
};

// Memoized animated background to prevent re-renders
const AnimatedBackground = React.memo(({ children }) => {
  const hour = new Date().getHours();
  const particles = useMemo(() => {
    const particleCount = hour >= 18 || hour < 6 ? 50 : 30;
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
                                                            y: Math.random() * 100,
                                                            size: Math.random() * 3 + 1,
                                                            duration: Math.random() * 20 + 10
    }));
  }, [hour]);

  const getGradientColors = () => {
    if (hour < 5) return ["#0a0a0a", "#1a1a2e", "#16213e"];
    if (hour < 7) return ["#355C7D", "#6C5B7B", "#C06C84"];
    if (hour < 12) return ["#F8B195", "#F67280", "#C06C84"];
    if (hour < 17) return ["#A8E6CF", "#7FD8BE", "#FFD3B6"];
    if (hour < 19) return ["#FF6B6B", "#C44536", "#772E25"];
    if (hour < 22) return ["#355C7D", "#2C3E50", "#1C2833"];
    return ["#0a0a0a", "#1a1a2e", "#16213e"];
  };

  const colors = getGradientColors();

  return (
    <div className="relative overflow-hidden">
    <motion.div
    className="absolute inset-0"
    animate={{
      background: [
        `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`,
          `linear-gradient(135deg, ${colors[2]} 0%, ${colors[0]} 50%, ${colors[1]} 100%)`,
          `linear-gradient(135deg, ${colors[1]} 0%, ${colors[2]} 50%, ${colors[0]} 100%)`
      ]
    }}
    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    />

    {particles.map(particle => (
      <motion.div
      key={particle.id}
      className="absolute rounded-full"
      style={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        width: particle.size,
        height: particle.size,
        backgroundColor: hour >= 18 || hour < 6 ? '#ffffff' : '#ffffff40'
      }}
      animate={{
        y: hour >= 18 || hour < 6 ? [0, 10, 0] : [0, 100],
        opacity: hour >= 18 || hour < 6 ? [0.2, 0.8, 0.2] : [0.6, 0, 0.6]
      }}
      transition={{
        duration: particle.duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      />
    ))}

    <div className="relative z-10">{children}</div>
    </div>
  );
});

// Memoized TimeIcon to prevent re-renders
const TimeIcon = React.memo(() => {
  const hour = new Date().getHours();

  const getIcon = () => {
    if (hour < 5) return Moon;
    if (hour < 12) return Coffee;
    if (hour < 17) return Sun;
    if (hour < 22) return Sunset;
    return Moon;
  };

  const Icon = getIcon();

  return (
    <motion.div
    animate={{
      rotate: hour >= 12 && hour < 17 ? 360 : 0,
      scale: hour >= 18 || hour < 6 ? [1, 1.2, 1] : 1,
    }}
    transition={{
      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
      scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    }}
    className="relative"
    >
    <Icon size={40} className="text-white drop-shadow-lg" />
    {hour >= 12 && hour < 17 && (
      <motion.div
      className="absolute inset-0 blur-xl"
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
      >
      <Sun size={40} className="text-yellow-300" />
      </motion.div>
    )}
    </motion.div>
  );
});

const Home = () => {
  const navigate = useNavigate();
  const [featuredAlbums, setFeaturedAlbums] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredAlbum, setHoveredAlbum] = useState(null);
  const { currentTrack, isPlaying, playTrack } = useAudio();

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 640;

  // Memoized greeting to prevent re-calculation
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const greetings = {
      night: ['Sweet Dreams', 'Night Owl', 'Midnight Vibes'],
      morning: ['Rise & Shine', 'Good Morning', 'Fresh Start'],
      afternoon: ['Good Afternoon', 'Midday Mix', 'Afternoon Delight'],
      evening: ['Good Evening', 'Wind Down', 'Evening Chill']
    };

    if (hour < 5) return greetings.night[0];
    if (hour < 12) return greetings.morning[0];
    if (hour < 17) return greetings.afternoon[0];
    if (hour < 22) return greetings.evening[0];
    return greetings.night[0];
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

        const recs = recommendationsRes.data?.recommendations || [];
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
      <div className="flex items-center justify-center h-full">
      <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
      <Loader className="w-12 h-12 text-accent" />
      </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      >
      <p className="text-xl mb-4">{error}</p>
      <button
      onClick={() => window.location.reload()}
      className="px-6 py-3 bg-accent rounded-full text-white hover:bg-accent-dark
      transition-all duration-300 transform hover:scale-105"
      >
      Retry
      </button>
      </motion.div>
      </div>
    );
  }

  // Memoize trending text to prevent re-renders
  const trendingText = recommendations.length > 0
  ? `${recommendations[0].title} by ${recommendations[0].artist}`
  : '';

  return (
    <div className="min-h-full w-full overflow-x-hidden">
    {/* Hero Header with animated background */}
    <AnimatedBackground>
    <div className="relative w-full min-h-[400px]">
    <div className="absolute inset-0 overflow-hidden">
    {recommendations.length > 0 && (
      <motion.img
      src={getImageUrl(recommendations[0].album_art || recommendations[0].track_image) + "?h=264"}
      alt=""
      className="w-full h-full object-cover filter blur-3xl opacity-20"
      initial={{ scale: 1.2 }}
      animate={{ scale: 1 }}
      transition={{ duration: 20 }}
      />
    )}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
    </div>

    <div className="relative z-10 p-8 md:p-12">
    <div className="flex flex-col justify-end min-h-[350px]">
    <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className="space-y-6"
    >
    <div className="flex items-center gap-4">
    <TimeIcon />
    <motion.h5
    className="text-2xl text-white/90 font-light"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.2 }}
    >
    {greeting}
    </motion.h5>
    </div>

    <div className="flex items-center gap-6">
    {userProfile?.profile_pic && (
      <motion.img
      src={getImageUrl(userProfile.profile_pic) + "?h=60"}
      alt={userProfile.username}
      className="w-16 h-16 rounded-full object-cover ring-4 ring-white/20"
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 300 }}
      />
    )}
    <motion.h1
    className="text-5xl md:text-7xl font-bold text-white"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
    >
    Welcome back, {userProfile?.username || 'Guest'}
    </motion.h1>
    </div>

    {trendingText && (
      <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex items-center gap-3"
      >
      <span className="text-white/60 text-lg">Currently Trending:</span>
      <div className="flex-1 max-w-md">
      <MarqueeText
      text={trendingText}
      className="text-white text-lg font-semibold"
      speed={25}
      />
      </div>
      </motion.div>
    )}
    </motion.div>
    </div>
    </div>
    </div>
    </AnimatedBackground>

    <div className="px-6 md:px-12 pb-12 space-y-16 bg-gradient-to-b from-black to-background">
    {/* Featured Albums */}
    <section className="pt-12">
    <motion.h2
    className="text-3xl font-bold mb-8 text-white"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5 }}
    >
    Featured Albums
    </motion.h2>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
    {featuredAlbums.map((album, index) => (
      <motion.div
      key={album.id}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
      whileHover={{ y: -10 }}
      className="group relative cursor-pointer"
      onClick={() => navigate(`/album/${album.id}`)}
      onMouseEnter={() => setHoveredAlbum(album.id)}
      onMouseLeave={() => setHoveredAlbum(null)}
      >
      <div className="relative aspect-square rounded-xl overflow-hidden shadow-2xl">
      <motion.img
      src={getImageUrl(album.album_art) + "?h=400"}
      alt={album.title}
      className="w-full h-full object-cover"
      animate={{ scale: hoveredAlbum === album.id ? 1.1 : 1 }}
      transition={{ duration: 0.4 }}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = '/default-album-art.png';
      }}
      />
      <motion.div
      className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
      initial={{ opacity: 0 }}
      animate={{ opacity: hoveredAlbum === album.id ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      />

      {/* Fixed Play Button - Bottom Right */}
      <AnimatePresence>
      {hoveredAlbum === album.id && (
        <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        onClick={(e) => handlePlayAlbum(album.id, e)}
        className="absolute bottom-4 right-4 w-12 h-12 bg-accent rounded-full
        flex items-center justify-center shadow-xl hover:bg-accent-dark
        transition-colors"
        >
        {currentTrack?.album_id === album.id && isPlaying ? (
          <Pause className="text-white" size={24} />
        ) : (
          <Play className="text-white ml-1" size={24} />
        )}
        </motion.button>
      )}
      </AnimatePresence>
      </div>

      <motion.div
      className="mt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.1 + 0.2 }}
      >
      <h3 className="font-bold text-lg text-white truncate">{album.title}</h3>
      <p className="text-sm text-gray-400 truncate mt-1">{album.artist}</p>
      </motion.div>
      </motion.div>
    ))}
    </div>
    </section>

    {/* Recommended for You */}
    <section>
    <motion.h2
    className="text-3xl font-bold mb-8 text-white"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5 }}
    >
    Recommended for You
    </motion.h2>
    {recommendations.length === 0 ? (
      <motion.p
      className="text-gray-400 text-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      >
      No recommendations available. Try exploring some tracks!
      </motion.p>
    ) : (
      <div className="grid gap-3">
      {recommendations.map((track, index) => (
        <motion.div
        key={track.id}
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
        whileHover={{ x: 10 }}
        className="bg-surface/30 backdrop-blur-sm hover:bg-surface/60 p-4 rounded-xl
        flex items-center gap-4 group transition-all duration-300 cursor-pointer
        border border-white/5 hover:border-white/10"
        onClick={() => navigate(`/track/${track.id}`)}
        >
        <motion.div
        className="relative aspect-square w-20 rounded-lg overflow-hidden shadow-lg"
        whileHover={{ scale: 1.05 }}
        >
        <img
        src={getImageUrl(track.album_art || track.track_image) + "?h=80"}
        alt={track.title}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/default-album-art.png';
        }}
        />
        <motion.button
        onClick={(e) => handlePlayTrack(track, e)}
        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
        transition-opacity duration-300 flex items-center justify-center"
        whileHover={{ backgroundColor: "rgba(0,0,0,0.8)" }}
        >
        {currentTrack?.id === track.id && isPlaying ? (
          <Pause className="text-white" size={24} />
        ) : (
          <Play className="text-white ml-1" size={24} />
        )}
        </motion.button>
        </motion.div>

        <div className="flex-1 min-w-0">
        <motion.div
        className="font-semibold text-lg text-white group-hover:text-accent transition-colors"
        >
        <span className="truncate block">{track.title}</span>
        </motion.div>
        <p className="text-sm text-gray-400 mt-1">{track.artist}</p>
        </div>

        <motion.div
        className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
        whileHover={{ scale: 1.2 }}
        >
        <Play size={20} />
        </motion.div>
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
