import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Heart, Clock, Share2, Plus, ListMusic } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { useResponsive } from '../components/layout/MainLayout';
import { motion } from 'framer-motion';
import MusicAPI from '../services/api';

// Explicit Icon Component with Background
const ExplicitIcon = ({
  size = 24,
  className = '',
  bgColor = '#1a1a1a',
  textColor = 'white'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background Rectangle */}
    <rect width="24" height="24" fill={bgColor} rx="4" />
    {/* Letter E */}
    <text x="6" y="18" fontSize="16" fontWeight="bold" fill={textColor}>
      E
    </text>
  </svg>
);

// Fixed MarqueeText component that maintains scrolling animation while preventing overflow
const MarqueeText = ({ text, className = '', bgColor = 'var(--background)' }) => {
  // Base duration is adjusted according to text length
  const baseDuration = 20; // seconds
  const duration = Math.max(baseDuration, text.length * 0.4);

  return (
    <div className={`relative overflow-hidden w-full ${className}`}>
      {/* Fade at left edge - using a specific background color for perfect blending */}
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10" 
           style={{ background: `linear-gradient(to right, ${bgColor}, transparent)` }}></div>
      
      <div className="overflow-hidden w-full">
        <motion.div
          className="whitespace-nowrap inline-block"
          initial={{ x: 0 }}
          animate={{ x: "-100%" }}
          transition={{
            x: {
              duration: duration,
              ease: "linear",
              repeat: Infinity,
              repeatType: "loop"
            }
          }}
        >
          {/* Original text followed by a copy for seamless loop */}
          <span className="inline-block">{text}</span>
          <span className="inline-block pl-6">{text}</span>
        </motion.div>
      </div>
      
      {/* Fade at right edge - using a specific background color for perfect blending */}
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10" 
           style={{ background: `linear-gradient(to left, ${bgColor}, transparent)` }}></div>
    </div>
  );
};

// Toast notification component
const Toast = ({ message, isVisible }) => (
  isVisible && (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-accent text-white px-4 py-2 rounded-full text-sm shadow-lg z-50">
      {message}
    </div>
  )
);

const AlbumDetail = () => {
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [artistProfile, setArtistProfile] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = useAudio();
  const { isMobile } = useResponsive();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [toast, setToast] = useState({ visible: false, message: '' });

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Force mobile view for narrow screens
  const isNarrowScreen = windowWidth < 640;
  const useScrollingText = isMobile || isNarrowScreen;

  useEffect(() => {
    fetchAlbumDetails();
  }, [albumId]);

  // Show toast notification
  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 2000);
  };

  // Add all album tracks to queue
  const addAlbumToQueue = () => {
    if (album && album.tracks.length > 0) {
      addToQueue(album.tracks);
      showToast(`Added ${album.tracks.length} tracks to queue`);
    }
  };

  // Add single track to queue
  const addTrackToQueue = (track) => {
    addToQueue(track);
    showToast(`Added "${track.title}" to queue`);
  };

  // Fetch album and artist details from MusicAPI
  const fetchAlbumDetails = async () => {
    try {
      const response = await MusicAPI.getAlbum(albumId);
      const data = response.data;
      setAlbum(data);

      if (data.user_id) {
        const artistResponse = await MusicAPI.getArtistProfile(data.user_id);
        setArtistProfile(artistResponse.data);
      }

      // Check if album is liked
      const token = localStorage.getItem('token');
      if (token) {
        const likeResponse = await fetch(
          `https://api.beatfly-music.xyz/xrpc/music/favourite.album/check/${albumId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const likeData = await likeResponse.json();
        setIsLiked(likeData.isLiked);
      }
    } catch (error) {
      console.error('Error fetching album details:', error);
    }
  };

  const toggleLike = async () => {
    try {
      const token = localStorage.getItem('token');
      const method = isLiked ? 'DELETE' : 'POST';
      const endpoint = isLiked 
        ? `/music/favourite.album/${albumId}`
        : '/music/favourite.album';

      await fetch(`https://api.beatfly-music.xyz/xrpc${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: !isLiked ? JSON.stringify({ albumId }) : undefined
      });

      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: album.title,
        text: `Check out ${album.title} by ${album.artist}`,
        url: window.location.href
      }).catch((error) => console.log('Error sharing:', error));
    }
  };

  if (!album) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
      </div>
    );
  }

  const isAlbumPlaying =
    currentTrack &&
    album.tracks.some(track => track.id === currentTrack.id) &&
    isPlaying;

  // Get header background color for gradient blending
  const headerBgColor = "rgb(17, 24, 39)"; // --background color
  const surfaceColor = "rgb(22, 27, 34)"; // surface color

  return (
    <div className="flex-1 overflow-auto">
      {/* Album Header */}
      <div className={`relative ${useScrollingText ? 'h-64' : 'h-96'} bg-gradient-to-b from-accent/30 to-background ${useScrollingText ? 'p-4' : 'p-8'} flex items-end`}>
        {/* Blurred Background */}
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src={album.album_art + "?w=100"}
            alt=""
            className="w-full h-full object-cover blur-md"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-accent/30" />
        </div>

        {/* Header Content */}
        <div className="relative flex items-end gap-4 w-full">
          <img
            src={album.album_art + `?w=${useScrollingText ? 120 : 224}`}
            alt={album.title}
            className={`${useScrollingText ? 'w-28 h-28' : 'w-56 h-56'} shadow-lg rounded-lg flex-shrink-0`}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-album-art.png';
            }}
          />
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className={`${useScrollingText ? 'text-xs' : 'text-sm'} font-medium mb-1`}>
              Album
            </div>
            <div className="flex items-center mb-2 gap-2 w-full">
              <div className={`${useScrollingText ? 'text-xl' : 'text-5xl'} font-bold flex-1 min-w-0`}>
                {useScrollingText || album.title.length > 20 ? (
                  <MarqueeText 
                    text={album.title} 
                    className="w-full"
                    bgColor={headerBgColor} 
                  />
                ) : (
                  <div className="truncate">{album.title}</div>
                )}
              </div>
              {album.isExplicit && (
                <div className="flex-shrink-0">
                  <ExplicitIcon size={useScrollingText ? 16 : 24} className="text-white" />
                </div>
              )}
            </div>
            <div className={`flex items-center ${useScrollingText ? 'text-xs' : 'text-sm'} flex-wrap`}>
              {artistProfile?.profile_pic && (
                <img
                  src={artistProfile.profile_pic + "?h=40"}
                  alt={artistProfile.stage_name || album.artist}
                  className={`${useScrollingText ? 'w-4 h-4' : 'w-6 h-6'} rounded-full mr-2 flex-shrink-0`}
                />
              )}
              {artistProfile ? (
                <Link to={`/profile/${artistProfile.user_id}`} className="font-medium hover:underline truncate max-w-[150px]">
                  {artistProfile.stage_name}
                </Link>
              ) : (
                <span className="font-medium truncate max-w-[150px]">{album.artist}</span>
              )}
              <span className="mx-2 flex-shrink-0">•</span>
              <span className="flex-shrink-0">{new Date(album.created_at).getUTCFullYear() || 'Unknown Year'}</span>
              <span className="mx-2 flex-shrink-0">•</span>
              <span className="flex-shrink-0">{album.tracks.length} songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={`${useScrollingText ? 'px-4 py-3' : 'px-8 py-4'} flex items-center gap-4`}>
        <button
          onClick={() => {
            if (isAlbumPlaying) {
              togglePlay();
            } else if (album.tracks.length > 0) {
              playTrack(album.tracks[0]);
            }
          }}
          className={`${useScrollingText ? 'w-12 h-12' : 'w-14 h-14'} bg-accent rounded-full flex items-center justify-center hover:bg-accent/80 transition-colors flex-shrink-0`}
        >
          {isAlbumPlaying ? (
            <Pause size={useScrollingText ? 24 : 28} fill="white" />
          ) : (
            <Play size={useScrollingText ? 24 : 28} fill="white" />
          )}
        </button>
        
        <button
          onClick={toggleLike}
          className={`${useScrollingText ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center rounded-full
            ${isLiked ? 'text-accent' : 'text-white hover:text-accent'} transition-colors flex-shrink-0`}
          title={isLiked ? "Remove from Liked Albums" : "Add to Liked Albums"}
        >
          <Heart size={useScrollingText ? 20 : 24} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
        
        <button
          onClick={addAlbumToQueue}
          className={`${useScrollingText ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center rounded-full
            text-white hover:text-accent transition-colors flex-shrink-0`}
          title="Add album to queue"
        >
          <ListMusic size={useScrollingText ? 20 : 24} />
        </button>
        
        <button
          onClick={handleShare}
          className={`${useScrollingText ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center rounded-full text-white hover:text-accent transition-colors flex-shrink-0`}
          title="Share album"
        >
          <Share2 size={useScrollingText ? 20 : 24} />
        </button>
      </div>

      {/* Track List */}
      <div className={`${useScrollingText ? 'px-4' : 'px-8'}`}>
        <div className="grid gap-[1px] bg-surface-light rounded-lg overflow-hidden">
          {!useScrollingText && (
            <div className="grid grid-cols-[16px,4fr,3fr,1fr,auto] gap-4 px-4 py-2 text-sm text-gray-400 bg-surface">
              <div>#</div>
              <div>Title</div>
              <div>Artist</div>
              <div className="flex justify-end">
                <Clock size={16} />
              </div>
              <div></div> {/* Actions column */}
            </div>
          )}
          
          {album.tracks.map((track, index) => (
            <div
              key={track.id}
              className={`${useScrollingText 
                ? 'grid grid-cols-[16px,1fr,auto,auto] gap-2' 
                : 'grid grid-cols-[16px,4fr,3fr,1fr,auto] gap-4'} px-4 py-2 bg-surface hover:bg-surface-light group
                ${currentTrack?.id === track.id ? 'text-accent' : ''}`}
            >
              <div className={`flex items-center ${useScrollingText ? 'text-xs' : 'text-sm'} text-gray-400 group-hover:hidden`}>
                {index + 1}
              </div>
              <button
                className="hidden group-hover:flex items-center justify-center"
                onClick={() => playTrack(track)}
              >
                {currentTrack?.id === track.id && isPlaying ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} />
                )}
              </button>
              
              {useScrollingText ? (
                <div className="flex flex-col min-w-0 max-w-full overflow-hidden">
                  <div className={`font-medium text-sm ${currentTrack?.id === track.id ? 'text-accent' : ''} w-full`}>
                    {track.title.length > 20 ? (
                      <MarqueeText 
                        text={track.title} 
                        bgColor={surfaceColor}
                      />
                    ) : (
                      <div className="truncate">{track.title}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate w-full">
                    {track.artist}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center min-w-0 overflow-hidden">
                    {track.title.length > 30 ? (
                      <div className="w-full font-medium">
                        <MarqueeText text={track.title} bgColor={surfaceColor} />
                      </div>
                    ) : (
                      <div className="font-medium truncate">{track.title}</div>
                    )}
                  </div>
                  <div className="flex items-center text-gray-400 min-w-0 overflow-hidden">
                    <span className="truncate">{track.artist}</span>
                  </div>
                </>
              )}
              
              <div className={`flex items-center justify-end text-gray-400 ${useScrollingText ? 'text-xs' : ''} flex-shrink-0`}>
                {track.duration}
              </div>
              
              {/* Add to queue button */}
              <div className="flex items-center flex-shrink-0">
                <button
                  onClick={() => addTrackToQueue(track)}
                  className="p-2 text-gray-400 hover:text-accent transition-colors"
                  title="Add to queue"
                >
                  <Plus size={useScrollingText ? 16 : 20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Album Info */}
        <div className={`${useScrollingText ? 'mt-6 pb-6 text-sm' : 'mt-8 pb-8'} text-gray-400`}>
          <div className={`${useScrollingText ? 'mb-3' : 'mb-4'}`}>
            <div className={`${useScrollingText ? 'text-xs' : 'text-sm'}`}>Released</div>
            <div>
              {new Date(album.created_at).getUTCDate()}{" "}
              {new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(new Date(album.created_at))}{" "}
              {new Date(album.created_at).getUTCFullYear()}
            </div>
          </div>
          {album.description && (
            <div>
              <div className={`${useScrollingText ? 'text-xs' : 'text-sm'}`}>About</div>
              <p className={`mt-1 ${useScrollingText ? 'text-sm' : ''}`}>{album.description}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Toast notification */}
      <Toast message={toast.message} isVisible={toast.visible} />
    </div>
  );
};

export default AlbumDetail;