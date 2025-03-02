// src/pages/Profile.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Share2, MoreHorizontal, Music, Disc, AlertTriangle } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';

const Profile = () => {
  const { userId } = useParams();
  const { playTrack, currentTrack, isPlaying } = useAudio();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef(null);

  useEffect(() => {
    fetchProfile();

    // Close the dropdown if clicking outside
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await MusicAPI.getArtistProfile(userId);
      setProfile(response.data);
    } catch (err) {
      setError('Failed to load profile.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShareProfile = async () => {
    const profileUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile.stage_name}'s Profile`,
          text: `Check out ${profile.stage_name}'s profile on MusicApp!`,
          url: profileUrl,
        });
      } else {
        await navigator.clipboard.writeText(profileUrl);
        alert('Profile URL copied to clipboard!');
      }
      setShowOptions(false);
    } catch (err) {
      console.error('Error sharing profile:', err);
    }
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
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-full relative">
      {/* Profile Header */}
      <header className="relative h-64 sm:h-80">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-background" />
        <div className="relative z-10 flex items-center p-4 sm:p-8 h-full">
          <img
            src={profile.profile_pic + "?w=192"}
            alt={profile.stage_name}
            className="w-32 h-32 sm:w-48 sm:h-48 rounded-full object-cover shadow-2xl"
          />
          <div className="ml-4 sm:ml-6">
            <h5 className="text-xs sm:text-sm text-white/80">Artist</h5>
            <h1 className="text-3xl sm:text-6xl font-bold">{profile.stage_name}</h1>
            <p className="text-xs sm:text-sm text-white/60 mt-1">
              {profile.tracks?.length || 0} tracks • {profile.albums?.length || 0} albums
            </p>
          </div>
        </div>
      </header>

      {/* Action Buttons */}
      <div className="px-4 sm:px-8 py-4 flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => profile.tracks && profile.tracks.length > 0 && playTrack(profile.tracks[0])}
          className="px-4 sm:px-8 h-10 sm:h-12 bg-accent rounded-full flex items-center justify-center shadow-lg hover:bg-accent/80 transition-colors"
        >
          Play All
        </motion.button>
        <div className="relative" ref={optionsRef}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowOptions((prev) => !prev)}
            className="p-2 text-gray-400 hover:text-white"
          >
            <MoreHorizontal size={24} />
          </motion.button>
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-40 sm:w-48 bg-surface border border-white/10 rounded-lg shadow-lg z-20"
              >
                <ul className="py-2">
                  <li>
                    <button
                      onClick={handleShareProfile}
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-surface-light transition-colors"
                    >
                      <Share2 size={16} /> Share Profile
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(window.location.href);
                        alert('Profile URL copied to clipboard!');
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-surface-light transition-colors"
                    >
                      <Disc size={16} /> Copy Profile Link
                    </button>
                  </li>
                  <li>
                    <Link
                      to="/report"
                      onClick={() => setShowOptions(false)}
                      className="block px-4 py-2 text-sm flex items-center gap-2 hover:bg-surface-light transition-colors"
                    >
                      <AlertTriangle size={16} /> Report Artist
                    </Link>
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Artist Bio */}
      {profile.bio && (
        <section className="px-4 sm:px-8 mb-4 sm:mb-8">
          <p className="text-gray-400 whitespace-pre-line text-sm">{profile.bio}</p>
        </section>
      )}

      {/* Popular Tracks */}
      {profile.tracks && profile.tracks.length > 0 && (
        <section className="px-4 sm:px-8 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-3">Popular</h2>
          <div className="space-y-2">
            {profile.tracks.slice(0, 5).map((track, index) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => playTrack(track)}
                  className="flex items-center gap-3 p-2 sm:p-3 rounded-md hover:bg-surface-light cursor-pointer group"
                >
                  <div className="w-6 text-center text-gray-400">
                    {isCurrent && isPlaying ? (
                      <div className="w-3 h-3 mx-auto relative">
                        <span className="absolute w-0.5 h-3 bg-accent rounded-full animate-music-bar-1"></span>
                        <span className="absolute w-0.5 h-3 bg-accent rounded-full animate-music-bar-2 ml-1"></span>
                        <span className="absolute w-0.5 h-3 bg-accent rounded-full animate-music-bar-3 ml-2"></span>
                      </div>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <img
                    src={track.track_image}
                    alt={track.title}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isCurrent ? 'text-accent' : ''} text-sm`}>
                      {track.title}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400 truncate">
                      {track.listens || 0} plays
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Albums */}
      {profile.albums && profile.albums.length > 0 && (
        <section className="px-4 sm:px-8 pb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-3">Albums</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {profile.albums.map((album, index) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/album/${album.id}`}
                  className="p-2 sm:p-4 bg-surface rounded-lg block hover:bg-surface-light transition-colors"
                >
                  <img
                    src={album.album_art}
                    alt={album.title}
                    className="w-full aspect-square object-cover rounded-md shadow-lg mb-2 sm:mb-4"
                  />
                  <h3 className="font-medium truncate text-sm">{album.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Album • {new Date(album.created_at).getFullYear()}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Profile;
