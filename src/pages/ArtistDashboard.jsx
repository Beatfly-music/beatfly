import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Album,
  Edit,
  Trash2,
  Loader,
  Music,
  Play,
  Clock,
  AlertTriangle,
  FileText,
  XCircle,
  CheckCircle,
  AlertCircle,
  Plus,
  Image,
  Info,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';
import axios from 'axios';

// Animation variants
const tabVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

// 3-day lockout period in milliseconds
const LOCKOUT_PERIOD = 3 * 24 * 60 * 60 * 1000;

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const { playTrack } = useAudio();
  const deleteTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Core state
  const [activeTab, setActiveTab] = useState('albums');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [profile, setProfile] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  
  // UI state
  const [expandedAlbumId, setExpandedAlbumId] = useState(null);
  const [deletingAlbumId, setDeletingAlbumId] = useState(null);
  const [deletingTrackId, setDeletingTrackId] = useState(null);
  const [editingLyricsTrackId, setEditingLyricsTrackId] = useState(null);
  const [uploadingTrack, setUploadingTrack] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);

  // Album creation state
  const [albumData, setAlbumData] = useState({
    title: '',
    artist: '',
    description: '',
    isExplicit: false,
    albumArt: null
  });
  
  // Track queue for a specific album
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [showTrackUploadModal, setShowTrackUploadModal] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  
  // Lyrics state
  const [lyricsText, setLyricsText] = useState('');

  // Profile state
  const [profileData, setProfileData] = useState({
    stageName: '',
    bio: '',
    profilePic: null
  });

  // Profile wizard state
  const [wizardData, setWizardData] = useState({
    stageName: '',
    bio: '',
    acceptedTerms: false,
    copyrightAnswer: '',
    ipAnswer: '',
    profilePic: null
  });

  // Load initial data
  useEffect(() => {
    loadArtistData();
    
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  // Success message timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load artist data from the API
  const loadArtistData = async () => {
    try {
      setLoading(true);
      const userResponse = await MusicAPI.getUserProfile();

      try {
        const artistResponse = await MusicAPI.getArtistProfile(userResponse.data.id);
        if (!artistResponse.data?.stage_name) {
          setShowProfileWizard(true);
          setWizardData(prev => ({ ...prev, stageName: userResponse.data.username }));
        } else {
          setProfile(artistResponse.data);
          setAlbums(artistResponse.data.albums || []);
          setProfileData({
            stageName: artistResponse.data.stage_name || '',
            bio: artistResponse.data.bio || '',
            profilePic: null
          });
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setShowProfileWizard(true);
          setWizardData(prev => ({ ...prev, stageName: userResponse.data.username }));
        } else {
          throw err;
        }
      }
    } catch (err) {
      setError('Failed to load profile data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create new album
  const createAlbum = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', albumData.title);
      formData.append('artist', albumData.artist || profile?.stage_name);
      formData.append('description', albumData.description || '');
      formData.append('isExplicit', albumData.isExplicit);

      if (albumData.albumArt) {
        formData.append('albumArt', albumData.albumArt);
      }

      const response = await MusicAPI.createAlbum(formData);
      const albumId = response.data.albumId;
      
      await loadArtistData();
      setSuccessMessage('Album created successfully!');
      setAlbumData({
        title: '',
        artist: '',
        description: '',
        isExplicit: false,
        albumArt: null
      });
      
      setExpandedAlbumId(albumId);
      setActiveTab('albums');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create album.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection for track uploads
  const handleTrackSelection = (files) => {
    const newTracks = Array.from(files).map(file => ({
      file,
      id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: file.name.split('.')[0],
      artist: profile?.stage_name || '',
      status: 'pending',
      progress: 0
    }));
    
    setSelectedTracks(newTracks);
    setShowTrackUploadModal(true);
  };

  // Update track details in selection modal
  const updateTrackDetail = (id, field, value) => {
    setSelectedTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === id ? { ...track, [field]: value } : track
      )
    );
  };

  // Remove track from selection
  const removeTrackFromSelection = (id) => {
    setSelectedTracks(prevTracks => prevTracks.filter(track => track.id !== id));
  };

  // Upload a single track
  const uploadSingleTrack = async (albumId, track) => {
    try {
      // Update track status
      updateTrackStatus(track.id, 'uploading');
      
      // Create FormData
      const formData = new FormData();
      formData.append('trackFile', track.file);
      formData.append('title', track.title);
      formData.append('artist', track.artist);
      
      // Get token for auth
      const token = localStorage.getItem('token');
      
      // Use XMLHttpRequest for better progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', `https://api.beatfly-music.xyz/xrpc/music/album/${albumId}/track.add`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        // Track upload progress
        xhr.upload.onprogress = (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            updateTrackProgress(track.id, percent);
          }
        };
        
        // Handle response
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            updateTrackStatus(track.id, 'complete');
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              resolve({ success: true });
            }
          } else {
            let errorMessage = 'Upload failed';
            try {
              const response = JSON.parse(xhr.responseText);
              errorMessage = response.error || errorMessage;
            } catch (e) {}
            updateTrackStatus(track.id, 'error', errorMessage);
            reject(new Error(errorMessage));
          }
        };
        
        // Handle network errors
        xhr.onerror = function() {
          const errorMsg = 'Network error during upload';
          updateTrackStatus(track.id, 'error', errorMsg);
          reject(new Error(errorMsg));
        };
        
        // Debug: Log request before sending
        console.log('Sending request to upload track:', {
          url: `https://api.beatfly-music.xyz/xrpc/music/album/${albumId}/track.add`,
          fileSize: track.file.size,
          fileName: track.file.name,
          formData: 'FormData object with trackFile, title, artist fields'
        });
        
        // Send the request
        xhr.send(formData);
      });
    } catch (error) {
      console.error(`Error uploading track ${track.title}:`, error);
      updateTrackStatus(track.id, 'error', error.message);
      throw error;
    }
  };

  // Start uploading selected tracks
  const startTrackUploads = async () => {
    if (!selectedAlbumId || selectedTracks.length === 0) return;
    
    setUploadingTrack(true);
    setCurrentTrackIndex(0);
    
    // Process tracks one by one
    for (let i = 0; i < selectedTracks.length; i++) {
      setCurrentTrackIndex(i);
      const track = selectedTracks[i];
      
      try {
        await uploadSingleTrack(selectedAlbumId, track);
      } catch (error) {
        console.error(`Error uploading track ${i + 1}:`, error);
        // Continue with next track despite errors
      }
      
      // Small delay between uploads
      if (i < selectedTracks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Reload album data when all uploads are done
    await loadArtistData();
    setSuccessMessage('Track uploads completed!');
    setUploadingTrack(false);
    setCurrentTrackIndex(-1);
    
    // Clear selection after successful upload
    setTimeout(() => {
      setShowTrackUploadModal(false);
      setSelectedTracks([]);
      setUploadProgress({});
    }, 1500);
  };

  // Update track status during upload
  const updateTrackStatus = (id, status, errorMessage = null) => {
    setSelectedTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === id 
          ? { ...track, status, ...(errorMessage && { errorMessage }) } 
          : track
      )
    );
  };

  // Update track progress during upload
  const updateTrackProgress = (id, progress) => {
    setSelectedTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === id ? { ...track, progress } : track
      )
    );
    
    setUploadProgress(prev => ({
      ...prev,
      [id]: progress
    }));
  };

  // Delete an album
  const handleDeleteAlbum = async (albumId) => {
    if (!window.confirm('Are you sure you want to delete this album and all its tracks?')) return;

    try {
      setDeletingAlbumId(albumId);
      
      // Delete from database
      await MusicAPI.deleteAlbum(albumId);
      
      // Wait for animation
      deleteTimeoutRef.current = setTimeout(() => {
        loadArtistData();
        setDeletingAlbumId(null);
        setSuccessMessage('Album deleted successfully!');
      }, 600);
    } catch (err) {
      setError('Failed to delete album. You may need to delete streaming sessions first.');
      console.error(err);
      setDeletingAlbumId(null);
    }
  };

  // Delete a track
  const handleDeleteTrack = async (albumId, trackId) => {
    if (!window.confirm('Are you sure you want to delete this track?')) return;

    try {
      setDeletingTrackId(trackId);
      
      // Delete from database
      await MusicAPI.deleteTrack(albumId, trackId);
      
      // Wait for animation
      deleteTimeoutRef.current = setTimeout(() => {
        loadArtistData();
        setDeletingTrackId(null);
        setSuccessMessage('Track deleted successfully!');
      }, 600);
    } catch (err) {
      setError('Failed to delete track. You may need to delete streaming sessions first.');
      console.error(err);
      setDeletingTrackId(null);
    }
  };

  // Update track lyrics
  const updateLyrics = async (albumId, trackId) => {
    try {
      setLoading(true);
      
      await MusicAPI.editAlbum(albumId, {
        trackLyrics: { [trackId]: lyricsText }
      });
      
      await loadArtistData();
      setEditingLyricsTrackId(null);
      setLyricsText('');
      setSuccessMessage('Lyrics updated successfully!');
    } catch (err) {
      setError('Failed to update lyrics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update artist profile
  const updateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await MusicAPI.updateArtistProfile({
        stage_name: profileData.stageName,
        bio: profileData.bio
      });

      if (profileData.profilePic) {
        const formData = new FormData();
        formData.append('biography', profileData.bio);
        formData.append('profilePic', profileData.profilePic);
        await MusicAPI.updateUserProfile(formData);
      }

      await loadArtistData();
      setSuccessMessage('Profile updated successfully!');
      setActiveTab('albums');
    } catch (err) {
      setError('Failed to update profile.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Complete the artist wizard
  const completeWizard = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const correctAnswers =
      wizardData.copyrightAnswer.trim().toLowerCase() === 'me' &&
      wizardData.ipAnswer.trim().toLowerCase().includes('creativity');

    if (!correctAnswers) {
      setError('Quiz answers incorrect. You are locked out for 3 days.');
      setLockoutUntil(Date.now() + LOCKOUT_PERIOD);
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('stage_name', wizardData.stageName);
      formData.append('bio', wizardData.bio);
      if (wizardData.profilePic) {
        formData.append('profilePic', wizardData.profilePic);
      }

      await MusicAPI.updateArtistProfile({
        stage_name: wizardData.stageName,
        bio: wizardData.bio
      });

      if (wizardData.profilePic) {
        await MusicAPI.updateUserProfile(formData);
      }

      await loadArtistData();
      setShowProfileWizard(false);
      setSuccessMessage('Artist profile created successfully!');
    } catch (err) {
      setError('Failed to create artist profile.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // UI helpers
  const getTrackStatusIcon = (status) => {
    switch (status) {
      case 'complete': return <CheckCircle size={16} className="text-green-500" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'uploading': return <Loader size={16} className="animate-spin text-accent" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  // Render lockout screen if user is locked out
  if (lockoutUntil && Date.now() < lockoutUntil) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-8">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-red-500 mb-2">Locked Out</h2>
        <p className="text-gray-200 mb-4">
          You have been locked out for failing the required tests.
        </p>
        <p className="text-gray-400">
          Please try again after: {new Date(lockoutUntil).toLocaleString()}
        </p>
      </div>
    );
  }

  // Render profile wizard if needed
  if (showProfileWizard) {
    return (
      <div className="min-h-full p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Complete Your Artist Profile</h1>
          
          <form onSubmit={completeWizard} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Stage Name</label>
                <input
                  type="text"
                  value={wizardData.stageName}
                  onChange={(e) => setWizardData(prev => ({ ...prev, stageName: e.target.value }))}
                  required
                  className="w-full h-12 px-4 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
                  placeholder="Your artist/stage name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Artist Bio</label>
                <textarea
                  value={wizardData.bio}
                  onChange={(e) => setWizardData(prev => ({ ...prev, bio: e.target.value }))}
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
                  placeholder="Tell us about yourself as an artist..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setWizardData(prev => ({ ...prev, profilePic: e.target.files[0] }))
                  }
                  className="w-full p-2 rounded-lg bg-surface border border-white/10"
                />
              </div>
              
              <div className="p-4 border border-accent/30 rounded-lg bg-accent/10">
                <h3 className="font-medium mb-4">Copyright Quiz</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Who owns the copyright to music you create and upload?
                  </label>
                  <input
                    type="text"
                    value={wizardData.copyrightAnswer}
                    onChange={(e) =>
                      setWizardData(prev => ({ ...prev, copyrightAnswer: e.target.value }))
                    }
                    required
                    className="w-full h-12 px-4 rounded-lg bg-surface border border-white/10 text-white"
                    placeholder="Your answer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    What is the most important factor in determining if a work is original?
                  </label>
                  <input
                    type="text"
                    value={wizardData.ipAnswer}
                    onChange={(e) =>
                      setWizardData(prev => ({ ...prev, ipAnswer: e.target.value }))
                    }
                    required
                    className="w-full h-12 px-4 rounded-lg bg-surface border border-white/10 text-white"
                    placeholder="Your answer"
                  />
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={wizardData.acceptedTerms}
                  onChange={(e) =>
                    setWizardData(prev => ({ ...prev, acceptedTerms: e.target.checked }))
                  }
                  required
                  className="mt-1 w-4 h-4 rounded border-white/10 bg-surface"
                />
                <label className="text-sm text-gray-200">
                  I agree to the terms of service and confirm that I have the rights to all content I upload.
                </label>
              </div>
            </div>
            
            {error && (
              <div className="p-4 border border-red-500/20 rounded-lg bg-red-500/10">
                <p className="text-red-500">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || !wizardData.acceptedTerms}
              className="w-full h-12 bg-accent rounded-lg text-white font-medium hover:bg-accent/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : 'Complete Profile'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-background" />
        <div className="relative z-10 p-8">
          <div className="flex items-end gap-6 mb-8">
            <div className="w-40 h-40 bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg rounded-lg overflow-hidden">
              {profile?.profile_pic ? (
                <img
                  src={profile.profile_pic}
                  alt={profile.stage_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music size={64} className="text-white/20" />
              )}
            </div>
            <div>
              <h5 className="text-sm text-white/80">Artist</h5>
              <h1 className="text-4xl font-bold mb-4">{profile?.stage_name}</h1>
              <p className="text-white/60 text-sm mb-6">
                {albums.length} albums •{' '}
                {albums.reduce((acc, album) => acc + (album.tracks?.length || 0), 0)} tracks
              </p>
              <div className="flex gap-4">
                {['albums', 'new-album', 'profile'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 rounded-full flex items-center gap-2 transition-colors ${
                      activeTab === tab
                        ? 'bg-white text-black'
                        : 'bg-black/20 text-white hover:bg-black/30'
                    }`}
                  >
                    {tab === 'albums' && <Album size={20} />}
                    {tab === 'new-album' && <Plus size={20} />}
                    {tab === 'profile' && <Edit size={20} />}
                    {tab === 'albums' && 'Albums'}
                    {tab === 'new-album' && 'New Album'}
                    {tab === 'profile' && 'Profile'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-8 mb-6"
          >
            <div className="p-4 border border-green-500/20 rounded-lg bg-green-500/10">
              <p className="text-green-500 flex items-center gap-2">
                <CheckCircle size={16} />
                {successMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-8 mb-6"
          >
            <div className="p-4 border border-red-500/20 rounded-lg bg-red-500/10">
              <p className="text-red-500 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="px-8 pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
          >
            {/* Albums Tab */}
            {activeTab === 'albums' && (
              <div>
                {/* Albums List */}
                <div className="space-y-6">
                  <AnimatePresence>
                    {albums.map((album) => (
                      <motion.div 
                        key={album.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: deletingAlbumId === album.id ? 0 : 1, 
                          y: 0 
                        }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="bg-surface rounded-lg overflow-hidden shadow-lg"
                      >
                        <div className="flex border-b border-white/10">
                          <div className="w-28 h-28 flex-shrink-0 overflow-hidden">
                            {album.album_art ? (
                              <img
                                src={album.album_art}
                                alt={album.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-surface-light flex items-center justify-center">
                                <Music size={24} className="text-white/30" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 p-4 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-xl font-bold">{album.title}</h3>
                                <p className="text-sm text-white/60">
                                  {album.artist} • {album.tracks?.length || 0} tracks
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => navigate(`/artist/album/${album.id}/edit`)}
                                  className="p-2 text-gray-400 hover:text-white bg-surface-light rounded-full"
                                  title="Edit album"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAlbum(album.id)}
                                  className="p-2 text-red-500 hover:text-red-400 bg-surface-light rounded-full"
                                  title="Delete album"
                                  disabled={deletingAlbumId === album.id}
                                >
                                  {deletingAlbumId === album.id ? (
                                    <Loader size={16} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={16} />
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center mt-4">
                              <p className="text-xs text-white/40">
                                Created: {new Date(album.created_at).toLocaleDateString()}
                              </p>
                              <button
                                onClick={() => setExpandedAlbumId(expandedAlbumId === album.id ? null : album.id)}
                                className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                              >
                                {expandedAlbumId === album.id ? 'Hide Tracks' : 'Show Tracks'}
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Tracks Section */}
                        <AnimatePresence>
                          {expandedAlbumId === album.id && (
                            <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="p-4">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="text-lg font-medium">Tracks</h4>
                                <button
                                  onClick={() => {
                                    setSelectedAlbumId(album.id);
                                    // Trigger file input click
                                    if (fileInputRef.current) {
                                      fileInputRef.current.click();
                                    }
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-md text-white text-sm hover:bg-accent/80 transition-colors"
                                >
                                  <Upload size={16} />
                                  Add Tracks
                                </button>
                              </div>
                              
                              {album.tracks?.length > 0 ? (
                                <div className="space-y-2">
                                  <AnimatePresence>
                                    {album.tracks.map((track) => (
                                      <motion.div
                                        key={track.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ 
                                          opacity: deletingTrackId === track.id ? 0 : 1,
                                          y: 0
                                        }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        className="flex items-center justify-between p-3 bg-surface-light rounded-md hover:bg-surface-light/70 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={() => playTrack(track)}
                                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                          >
                                            <Play size={16} fill="currentColor" />
                                          </button>
                                          <div>
                                            <h5 className="font-medium">{track.title}</h5>
                                            <p className="text-xs text-white/60">{track.artist || album.artist}</p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => {
                                              setEditingLyricsTrackId(track.id);
                                              setLyricsText(track.lyrics || '');
                                            }}
                                            className="p-2 text-gray-400 hover:text-white transition-colors"
                                            title="Edit lyrics"
                                          >
                                            <FileText size={16} />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteTrack(album.id, track.id)}
                                            className="p-2 text-red-500 hover:text-red-400 transition-colors"
                                            title="Delete track"
                                            disabled={deletingTrackId === track.id}
                                          >
                                            {deletingTrackId === track.id ? (
                                              <Loader size={16} className="animate-spin" />
                                            ) : (
                                              <Trash2 size={16} />
                                            )}
                                          </button>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </AnimatePresence>
                                </div>
                              ) : (
                                <div className="py-8 text-center">
                                  <Music size={32} className="mx-auto mb-2 text-white/20" />
                                  <p className="text-white/60">No tracks yet</p>
                                  <p className="text-sm text-white/40 mb-4">Upload tracks to this album</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {albums.length === 0 && !loading && (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <Album size={48} className="text-gray-500 mb-4" />
                    <h3 className="text-xl font-medium text-gray-300 mb-2">No Albums Yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md">
                      Start building your music portfolio by creating your first album.
                    </p>
                    <button
                      onClick={() => setActiveTab('new-album')}
                      className="px-6 py-2 bg-accent text-white rounded-full flex items-center gap-2 hover:bg-accent/80 transition-colors"
                    >
                      <Plus size={18} />
                      Create Your First Album
                    </button>
                  </div>
                )}
                
                {loading && albums.length === 0 && (
                  <div className="py-12 flex justify-center">
                    <Loader size={32} className="animate-spin text-accent" />
                  </div>
                )}
              </div>
              
              {/* Hidden file input for track selection */}
              <input
                type="file"
                ref={fileInputRef}
                accept="audio/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files.length > 0) {
                    handleTrackSelection(e.target.files);
                  }
                }}
              />
              
              {/* Lyrics Editor Modal */}
              <AnimatePresence>
                {editingLyricsTrackId && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                    onClick={() => setEditingLyricsTrackId(null)}
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="bg-surface rounded-lg w-full max-w-2xl p-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Edit Lyrics</h3>
                        <button
                          onClick={() => setEditingLyricsTrackId(null)}
                          className="p-2 text-white/60 hover:text-white transition-colors"
                        >
                          <XCircle size={24} />
                        </button>
                      </div>
                      
                      <textarea
                        value={lyricsText}
                        onChange={(e) => setLyricsText(e.target.value)}
                        className="w-full h-64 p-4 bg-surface-light border border-white/10 rounded-lg focus:border-accent transition-colors text-white"
                        placeholder="Enter lyrics here..."
                      />
                      
                      <div className="flex justify-end gap-3 mt-4">
                        <button
                          onClick={() => setEditingLyricsTrackId(null)}
                          className="px-4 py-2 bg-surface-light text-white rounded-md hover:bg-surface-light/70 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            // Find the album ID for this track
                            const album = albums.find(a => 
                              a.tracks?.some(t => t.id === editingLyricsTrackId)
                            );
                            if (album) {
                              updateLyrics(album.id, editingLyricsTrackId);
                            }
                          }}
                          className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/80 transition-colors flex items-center gap-2"
                          disabled={loading}
                        >
                          {loading ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          Save Lyrics
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Track Upload Modal */}
              <AnimatePresence>
                {showTrackUploadModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                    onClick={() => !uploadingTrack && setShowTrackUploadModal(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="bg-surface rounded-lg w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Upload Tracks</h3>
                        {!uploadingTrack && (
                          <button
                            onClick={() => setShowTrackUploadModal(false)}
                            className="p-2 text-white/60 hover:text-white transition-colors"
                          >
                            <XCircle size={24} />
                          </button>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm text-white/70">
                          Edit track details before uploading. You can customize the title and artist for each track.
                        </p>
                      </div>
                      
                      <div className="space-y-4 mb-6">
                        {selectedTracks.map((track, index) => (
                          <div 
                            key={track.id} 
                            className={`p-4 rounded-lg border ${
                              track.status === 'error' ? 'border-red-500/30 bg-red-500/10' :
                              track.status === 'complete' ? 'border-green-500/30 bg-green-500/10' :
                              track.status === 'uploading' ? 'border-accent/30 bg-accent/10' :
                              'border-white/10 bg-surface-light'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-3">
                              <div className="flex items-center gap-2 text-sm text-white/60 min-w-[40%]">
                                <Music size={16} />
                                <span className="truncate" title={track.file.name}>{track.file.name}</span>
                                <span className="text-xs opacity-70">({(track.file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                              </div>
                              
                              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                                <input 
                                  type="text"
                                  value={track.title}
                                  onChange={(e) => updateTrackDetail(track.id, 'title', e.target.value)}
                                  placeholder="Track title"
                                  className="flex-1 h-10 px-3 rounded-md bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
                                  disabled={track.status === 'uploading' || track.status === 'complete'}
                                />
                                
                                <input 
                                  type="text"
                                  value={track.artist}
                                  onChange={(e) => updateTrackDetail(track.id, 'artist', e.target.value)}
                                  placeholder={`Artist (default: ${profile?.stage_name})`}
                                  className="flex-1 h-10 px-3 rounded-md bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
                                  disabled={track.status === 'uploading' || track.status === 'complete'}
                                />
                                
                                {track.status === 'pending' && (
                                  <button 
                                    type="button"
                                    onClick={() => removeTrackFromSelection(track.id)}
                                    className="p-2 text-red-500 hover:text-red-400"
                                    title="Remove track"
                                  >
                                    <XCircle size={20} />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Progress bar */}
                            {(track.status === 'uploading' || track.status === 'complete' || track.status === 'error') && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      track.status === 'error' ? 'bg-red-500' : 'bg-accent'
                                    }`}
                                    style={{ width: `${track.progress || 0}%` }}
                                  ></div>
                                </div>
                                <div className="flex items-center gap-1 min-w-[80px]">
                                  {getTrackStatusIcon(track.status)}
                                  <span className="text-sm">
                                    {track.status === 'complete' ? 'Complete' : 
                                     track.status === 'error' ? 'Error' : 
                                     `${track.progress || 0}%`}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Error message */}
                            {track.status === 'error' && track.errorMessage && (
                              <p className="mt-2 text-sm text-red-400">{track.errorMessage}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.click();
                            }
                          }}
                          className="px-4 py-2 bg-surface-light text-white rounded-md hover:bg-surface-light/70 transition-colors flex items-center gap-2"
                          disabled={uploadingTrack}
                        >
                          <Plus size={16} />
                          Add More Tracks
                        </button>
                        
                        <div className="flex gap-3">
                          {!uploadingTrack && (
                            <button
                              type="button"
                              onClick={() => setShowTrackUploadModal(false)}
                              className="px-4 py-2 bg-surface-light text-white rounded-md hover:bg-surface-light/70 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                          
                          <button
                            type="button"
                            onClick={startTrackUploads}
                            className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent/80 transition-colors flex items-center gap-2"
                            disabled={uploadingTrack || selectedTracks.length === 0}
                          >
                            {uploadingTrack ? (
                              <>
                                <Loader size={16} className="animate-spin" />
                                Uploading {currentTrackIndex + 1} of {selectedTracks.length}
                              </>
                            ) : (
                              <>
                                <Upload size={16} />
                                Upload {selectedTracks.length} Track{selectedTracks.length !== 1 ? 's' : ''}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {/* New Album Tab */}
          {activeTab === 'new-album' && (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold mb-6">Create New Album</h2>
              
              <form onSubmit={createAlbum} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Album Title *</label>
                    <input
                      type="text"
                      value={albumData.title}
                      onChange={(e) => setAlbumData(prev => ({ ...prev, title: e.target.value }))}
                      required
                      className="w-full h-12 px-4 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
                      placeholder="Enter album title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Artist Name</label>
                    <input
                      type="text"
                      value={albumData.artist}
                      onChange={(e) => setAlbumData(prev => ({ ...prev, artist: e.target.value }))}
                      className="w-full h-12 px-4 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
                      placeholder={`Enter artist name (default: ${profile?.stage_name || 'Your stage name'})`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={albumData.description}
                      onChange={(e) => setAlbumData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
                      placeholder="Enter album description"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Album Art</label>
                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setAlbumData(prev => ({ ...prev, albumArt: e.target.files[0] }))}
                          className="w-full p-2 rounded-lg bg-surface border border-white/10"
                        />
                      </div>
                      
                      {albumData.albumArt ? (
                        <div className="w-20 h-20 bg-surface-light rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={URL.createObjectURL(albumData.albumArt)} 
                            alt="Album art preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-surface-light rounded-lg flex items-center justify-center flex-shrink-0">
                          <Image size={24} className="text-white/30" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={albumData.isExplicit}
                      onChange={(e) => setAlbumData(prev => ({ ...prev, isExplicit: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/10 bg-surface"
                      id="explicit-checkbox"
                    />
                    <label htmlFor="explicit-checkbox" className="text-sm text-gray-200">
                      This album contains explicit content
                    </label>
                  </div>
                  
                  <div className="p-4 border border-accent/20 rounded-lg bg-accent/5">
                    <div className="flex items-start gap-2">
                      <Info size={16} className="text-accent mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-white/80">
                        After creating the album, you'll be able to upload tracks from the Albums tab.
                        You can add tracks individually and customize their details before uploading.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading || !albumData.title}
                    className="px-8 h-12 bg-accent rounded-lg text-white font-medium hover:bg-accent/80 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <Loader className="animate-spin" size={20} />
                    ) : (
                      <Plus size={20} />
                    )}
                    Create Album
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setActiveTab('albums')}
                    className="px-8 h-12 bg-surface-light rounded-lg text-white/80 font-medium hover:bg-surface-light/70 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
              
              <form onSubmit={updateProfile} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Stage Name</label>
                    <input
                      type="text"
                      value={profileData.stageName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, stageName: e.target.value }))}
                      required
                      className="w-full h-12 px-4 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
                      placeholder="Enter your stage name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Artist Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
                      placeholder="Tell the world about yourself as an artist..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Profile Picture</label>
                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProfileData(prev => ({ ...prev, profilePic: e.target.files[0] }))}
                          className="w-full p-2 rounded-lg bg-surface border border-white/10"
                        />
                      </div>
                      
                      {profileData.profilePic ? (
                        <div className="w-20 h-20 bg-surface-light rounded-full overflow-hidden flex-shrink-0 border-2 border-accent">
                          <img 
                            src={URL.createObjectURL(profileData.profilePic)} 
                            alt="Profile preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : profile?.profile_pic ? (
                        <div className="w-20 h-20 bg-surface-light rounded-full overflow-hidden flex-shrink-0">
                          <img 
                            src={profile.profile_pic} 
                            alt={profile.stage_name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-surface-light rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={24} className="text-white/30" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 h-12 bg-accent rounded-lg text-white font-medium hover:bg-accent/80 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader className="animate-spin" size={20} />
                    ) : (
                      <Edit size={20} />
                    )}
                    Save Changes
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setActiveTab('albums')}
                    className="px-8 h-12 bg-surface-light rounded-lg text-white/80 font-medium hover:bg-surface-light/70 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  </div>
);
};

export default ArtistDashboard; 