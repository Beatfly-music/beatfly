import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Album,
  Plus,
  Edit,
  Trash2,
  Loader,
  Music,
  Play,
  Clock,
  User,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';

// Lockout period: 3 days (in milliseconds)
const LOCKOUT_PERIOD = 3 * 24 * 60 * 60 * 1000;

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const { playTrack } = useAudio();

  // General states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('albums');
  const [profile, setProfile] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState(null);

  // 10-stage profile wizard state
  const [currentStage, setCurrentStage] = useState(1);
  const [wizardData, setWizardData] = useState({
    stageName: '',
    bio: '',
    acceptedTerms: false,
    copyrightAnswer: '',
    ipAnswer: '',
    sampleWork: null,
    profilePic: null,
  });

  // Album upload state (unchanged from previous)
  const [uploadData, setUploadData] = useState({
    title: '',
    artist: '',
    description: '',
    albumArt: null,
    tracks: [],
    trackTitles: [],
    trackArtists: [],
    isExplicit: false,
    acceptedTerms: false,
  });

  // Load artist data on mount
  useEffect(() => {
    loadArtistData();
  }, []);

  const loadArtistData = async () => {
    try {
      setLoading(true);
      const userResponse = await MusicAPI.getUserProfile();
      try {
        const artistResponse = await MusicAPI.getArtistProfile(userResponse.data.id);
        if (!artistResponse.data || !artistResponse.data.stage_name) {
          // No artist profile yet – show the wizard
          setShowProfileWizard(true);
          setWizardData((prev) => ({ ...prev, stageName: userResponse.data.username }));
        } else {
          setProfile(artistResponse.data);
          setAlbums(artistResponse.data.albums || []);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setShowProfileWizard(true);
          setWizardData((prev) => ({ ...prev, stageName: userResponse.data.username }));
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

  // Check quiz answers (stages 4 and 5)
  const quizPassed = () => {
    const correctCopyright = wizardData.copyrightAnswer.trim().toLowerCase() === 'me';
    const correctIP = wizardData.ipAnswer.trim().toLowerCase().includes('creativity');
    return correctCopyright && correctIP;
  };

  // Final submit handler for the profile wizard
  const handleWizardSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // If quiz answers are wrong, lock out the user
    if (!quizPassed()) {
      setError('Your quiz answers were incorrect. You are locked out for 3 days.');
      setLockoutUntil(Date.now() + LOCKOUT_PERIOD);
      setLoading(false);
      return;
    }
    try {
      // Prepare FormData for profilePic upload
      const formData = new FormData();
      formData.append('stage_name', wizardData.stageName);
      formData.append('bio', wizardData.bio);
      if (wizardData.profilePic) {
        formData.append('profilePic', wizardData.profilePic);
      }
      await MusicAPI.updateArtistProfile({
        stage_name: wizardData.stageName,
        bio: wizardData.bio,
      });
      if (wizardData.profilePic) {
        await MusicAPI.updateUserProfile(formData);
      }
      await loadArtistData();
      setShowProfileWizard(false);
      setCurrentStage(1);
    } catch (err) {
      setError('Failed to create artist profile.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handler for album upload submission
  const handleAlbumSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', uploadData.title);
      formData.append('artist', uploadData.artist || profile?.stage_name);
      formData.append('description', uploadData.description);
      formData.append('isExplicit', uploadData.isExplicit);
      if (uploadData.albumArt) {
        formData.append('albumArt', uploadData.albumArt);
      }
      uploadData.tracks.forEach((track, idx) => {
        formData.append('tracks', track);
        formData.append('trackTitles', uploadData.trackTitles[idx] || '');
        formData.append('trackArtists', uploadData.trackArtists[idx] || uploadData.artist || profile?.stage_name || '');
      });
      await MusicAPI.createAlbum(formData);
      await loadArtistData();
      setUploadData({
        title: '',
        artist: '',
        description: '',
        albumArt: null,
        tracks: [],
        trackTitles: [],
        trackArtists: [],
        isExplicit: false,
        acceptedTerms: false,
      });
      setActiveTab('albums');
    } catch (err) {
      setError(err.response?.data?.error || 'Album upload failed.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlbum = async (albumId) => {
    if (!window.confirm('Are you sure you want to delete this album?')) return;
    try {
      setLoading(true);
      await MusicAPI.deleteAlbum(albumId);
      await loadArtistData();
    } catch (err) {
      setError('Failed to delete album.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Stage Animation Variants ---
  const variants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  // --- Wizard Stage Content ---
  const renderStageContent = (stage) => {
    switch (stage) {
      case 1:
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Enter Your Stage Name</label>
            <input
              type="text"
              placeholder="e.g., DJ Awesome"
              value={wizardData.stageName}
              onChange={(e) =>
                setWizardData({ ...wizardData, stageName: e.target.value })
              }
              required
              className="w-full h-12 px-4 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
            />
          </div>
        );
      case 2:
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Artist Bio</label>
            <textarea
              placeholder="Tell us about your artistry..."
              value={wizardData.bio}
              onChange={(e) =>
                setWizardData({ ...wizardData, bio: e.target.value })
              }
              rows={4}
              required
              className="w-full px-4 py-3 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
            />
          </div>
        );
      case 3:
        return (
          <div className="p-4 bg-white/5 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Terms & Rights</h2>
            <p className="text-sm text-gray-200 mb-4">
              By proceeding, you confirm that any content you upload is solely yours and that you hold all necessary rights.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wizardData.acceptedTerms}
                onChange={(e) =>
                  setWizardData({ ...wizardData, acceptedTerms: e.target.checked })
                }
                required
                className="w-4 h-4 rounded border-white/10 bg-surface"
              />
              <span className="text-sm text-gray-200">I agree to the terms.</span>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              Copyright Quiz: Who owns the copyright to your original work?
            </label>
            <p className="text-xs text-gray-400 mb-2">(Hint: Answer "me")</p>
            <input
              type="text"
              value={wizardData.copyrightAnswer}
              onChange={(e) =>
                setWizardData({ ...wizardData, copyrightAnswer: e.target.value })
              }
              required
              className="w-full h-12 px-4 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
            />
          </div>
        );
      case 5:
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              Intellectual Property Quiz: What is intellectual property?
            </label>
            <p className="text-xs text-gray-400 mb-2">(Hint: It involves creativity)</p>
            <input
              type="text"
              value={wizardData.ipAnswer}
              onChange={(e) =>
                setWizardData({ ...wizardData, ipAnswer: e.target.value })
              }
              required
              className="w-full h-12 px-4 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
            />
          </div>
        );
      case 6:
        return (
          <div className="p-4 bg-red-500/10 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Important Lockout Warning</h2>
            <p className="text-sm text-gray-200">
              Failing the quiz questions (steps 4 and 5) will lock you out for 3 days before you can resubmit your profile.
            </p>
          </div>
        );
      case 7:
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Upload a Sample of Your Work</label>
            <input
              type="file"
              accept="audio/*, image/*"
              onChange={(e) =>
                setWizardData({ ...wizardData, sampleWork: e.target.files[0] })
              }
              required
              className="w-full p-2 rounded-lg bg-surface border border-white/10"
            />
          </div>
        );
      case 8:
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Upload Your Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setWizardData({ ...wizardData, profilePic: e.target.files[0] })
              }
              className="w-full p-2 rounded-lg bg-surface border border-white/10"
            />
            {wizardData.profilePic && (
              <div className="mt-4">
                <p className="text-sm text-gray-200 mb-2">Preview:</p>
                <img
                  src={URL.createObjectURL(wizardData.profilePic)}
                  alt="Profile Preview"
                  className="w-32 h-32 object-cover rounded-full"
                />
              </div>
            )}
          </div>
        );
      case 9:
        return (
          <div className="p-4 bg-white/5 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Final Profile Preview</h2>
            <p>
              <strong>Stage Name:</strong> {wizardData.stageName}
            </p>
            <p>
              <strong>Bio:</strong> {wizardData.bio}
            </p>
            {wizardData.sampleWork && (
              <p>
                <strong>Sample Work:</strong> {wizardData.sampleWork.name}
              </p>
            )}
            {wizardData.profilePic && (
              <div className="mt-2">
                <p className="text-sm text-gray-200 mb-1">Profile Picture Preview:</p>
                <img
                  src={URL.createObjectURL(wizardData.profilePic)}
                  alt="Profile Preview"
                  className="w-32 h-32 object-cover rounded-full"
                />
              </div>
            )}
          </div>
        );
      case 10:
        return (
          <div className="text-center">
            <p className="text-lg font-bold mb-4">Confirm and Submit Your Profile</p>
            <p className="text-sm text-gray-200 mb-4">
              By clicking submit, you acknowledge that you understand all instructions and that all uploaded content is your property.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="px-8 h-12 bg-accent rounded-full text-white font-medium hover:bg-accent/80 transition-colors flex items-center gap-2 mx-auto"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />}
              Create Profile
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  // Handler for advancing wizard stages with basic validation
  const goToNextStage = () => {
    if (currentStage === 1 && !wizardData.stageName) {
      setError('Please enter your stage name.');
      return;
    }
    if (currentStage === 2 && !wizardData.bio) {
      setError('Please provide an artist bio.');
      return;
    }
    if (currentStage === 3 && !wizardData.acceptedTerms) {
      setError('You must agree to the terms.');
      return;
    }
    if (currentStage === 4 && !wizardData.copyrightAnswer) {
      setError('Please answer the copyright question.');
      return;
    }
    if (currentStage === 5 && !wizardData.ipAnswer) {
      setError('Please answer the intellectual property question.');
      return;
    }
    if (currentStage === 7 && !wizardData.sampleWork) {
      setError('Please upload a sample of your work.');
      return;
    }
    setError('');
    setCurrentStage((prev) => prev + 1);
  };

  // --- Render locked-out view if applicable ---
  if (lockoutUntil && Date.now() < lockoutUntil) {
    const unlockTime = new Date(lockoutUntil).toLocaleString();
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-8">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-red-500 mb-2">Locked Out</h2>
        <p className="text-gray-200 mb-4">
          You have been locked out for failing the required tests.
        </p>
        <p className="text-gray-400">Please try again after: {unlockTime}</p>
      </div>
    );
  }

  // --- Render Profile Wizard if needed ---
  if (showProfileWizard) {
    return (
      <div className="min-h-full">
        {/* Background Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-background" />
          <div className="relative z-10 p-8">
            <div className="flex items-end gap-6 mb-8">
              <div className="w-52 h-52 bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg rounded-lg">
                <User size={64} className="text-white/20" />
              </div>
              <div>
                <h5 className="text-sm text-white/80">Welcome</h5>
                <h1 className="text-5xl font-bold mb-4">Create Your Artist Profile</h1>
                <p className="text-white/60 text-sm">
                  Follow the 10 steps below. Failing the quizzes will lock you out for 3 days.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Wizard Form */}
        <div className="px-8 max-w-2xl mx-auto bg-surface-light p-8 rounded-lg shadow-lg">
          {error && (
            <div className="mb-4 p-4 border border-red-500/20 rounded-lg bg-red-500/10">
              <p className="text-red-500">{error}</p>
            </div>
          )}
          <form onSubmit={handleWizardSubmit}>
            <AnimatePresence exitBeforeEnter>
              <motion.div
                key={currentStage}
                variants={variants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.4 }}
              >
                {renderStageContent(currentStage)}
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-between mt-8">
              {currentStage > 1 && currentStage < 10 && (
                <button
                  type="button"
                  onClick={() => setCurrentStage((prev) => prev - 1)}
                  className="px-6 h-12 bg-surface-light rounded-full text-white font-medium hover:bg-surface transition-colors"
                >
                  Back
                </button>
              )}
              {currentStage < 10 && (
                <button
                  type="button"
                  onClick={goToNextStage}
                  className="ml-auto px-6 h-12 bg-accent rounded-full text-white font-medium hover:bg-accent/80 transition-colors flex items-center gap-2"
                >
                  Next <Plus size={20} />
                </button>
              )}
              {/* When on stage 10, the submit button is rendered as part of stage 10 */}
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- Render Main Dashboard if profile exists ---
  return (
    <div className="min-h-full">
      {/* Header with Gradient */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-background" />
        <div className="relative z-10 p-8">
          <div className="flex items-end gap-6 mb-8">
            <div className="w-52 h-52 bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg rounded-lg overflow-hidden">
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
              <h1 className="text-5xl font-bold mb-4">{profile?.stage_name}</h1>
              <p className="text-white/60 text-sm mb-6">
                {albums.length} albums •{' '}
                {albums.reduce((acc, album) => acc + (album.tracks?.length || 0), 0)} tracks
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('albums')}
                  className={`px-6 py-2 rounded-full flex items-center gap-2 ${
                    activeTab === 'albums'
                      ? 'bg-white text-black'
                      : 'bg-black/20 text-white hover:bg-black/30'
                  }`}
                >
                  <Album size={20} />
                  Albums
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-6 py-2 rounded-full flex items-center gap-2 ${
                    activeTab === 'upload'
                      ? 'bg-white text-black'
                      : 'bg-black/20 text-white hover:bg-black/30'
                  }`}
                >
                  <Upload size={20} />
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-8 mb-6">
          <div className="p-4 border border-red-500/20 rounded-lg bg-red-500/10">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'albums' && renderAlbumsTab(albums, playTrack, navigate, handleDeleteAlbum)}
        {activeTab === 'upload' && renderUploadTab(uploadData, setUploadData, loading, handleAlbumSubmit)}
      </div>
    </div>
  );
};

// --- Render Albums Tab ---
function renderAlbumsTab(albums, playTrack, navigate, handleDeleteAlbum) {
  return (
    <div className="px-8">
      <div className="grid grid-cols-[auto,4fr,2fr,1fr] gap-4 px-4 py-2 text-sm text-gray-400 border-b border-white/10">
        <div>#</div>
        <div>Title</div>
        <div>Date Added</div>
        <div className="flex justify-end">
          <Clock size={16} />
        </div>
      </div>
      <div className="space-y-1 mt-2">
        {albums.map((album, idx) => (
          <motion.div
            key={album.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group grid grid-cols-[auto,4fr,2fr,1fr] gap-4 items-center px-4 py-2 rounded-md hover:bg-surface-light"
          >
            <div className="text-gray-400 group-hover:hidden">{idx + 1}</div>
            <button
              className="hidden group-hover:flex items-center justify-center"
              onClick={() => album.tracks?.[0] && playTrack(album.tracks[0])}
            >
              <Play size={16} />
            </button>
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12">
                <img
                  src={album.album_art}
                  alt={album.title}
                  className="w-full h-full object-cover rounded"
                />
              </div>
              <div>
                <div className="font-medium">{album.title}</div>
                <div className="text-sm text-gray-400">{album.track_count || 0} tracks</div>
              </div>
            </div>
            <div className="text-gray-400">
              {new Date(album.created_at).toLocaleDateString()}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => navigate(`/artist/album/${album.id}/edit`)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleDeleteAlbum(album.id)}
                className="p-2 text-red-500 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --- Render Upload Tab ---
function renderUploadTab(uploadData, setUploadData, loading, handleAlbumSubmit) {
  return (
    <div className="px-8">
      <form onSubmit={handleAlbumSubmit} className="max-w-3xl space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Album Title</label>
            <input
              type="text"
              value={uploadData.title}
              onChange={(e) =>
                setUploadData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
              className="w-full h-12 px-4 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
              placeholder="Enter album title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Artist Name</label>
            <input
              type="text"
              value={uploadData.artist}
              onChange={(e) =>
                setUploadData((prev) => ({ ...prev, artist: e.target.value }))
              }
              required
              className="w-full h-12 px-4 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
              placeholder="Enter artist name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={uploadData.description}
              onChange={(e) =>
                setUploadData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
              placeholder="Enter album description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Album Art</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setUploadData((prev) => ({ ...prev, albumArt: e.target.files[0] }))
              }
              className="w-full p-2 rounded-lg bg-surface border border-white/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Tracks</label>
            <div className="space-y-4">
              {uploadData.tracks.map((_, index) => (
                <div key={index} className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Track Title"
                    value={uploadData.trackTitles[index] || ''}
                    onChange={(e) => {
                      const titles = [...uploadData.trackTitles];
                      titles[index] = e.target.value;
                      setUploadData((prev) => ({ ...prev, trackTitles: titles }));
                    }}
                    className="flex-1 h-12 px-4 rounded-lg bg-surface border border-white/10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUploadData((prev) => ({
                        ...prev,
                        tracks: prev.tracks.filter((_, i) => i !== index),
                        trackTitles: prev.trackTitles.filter((_, i) => i !== index),
                        trackArtists: prev.trackArtists.filter((_, i) => i !== index),
                      }));
                    }}
                    className="p-3 text-red-500 hover:text-red-400"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files);
                setUploadData((prev) => ({
                  ...prev,
                  tracks: [...prev.tracks, ...files],
                  trackTitles: [...prev.trackTitles, ...files.map(() => '')],
                  trackArtists: [...prev.trackArtists, ...files.map(() => uploadData.artist)],
                }));
              }}
              className="mt-4 w-full p-2 rounded-lg bg-surface border border-white/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={uploadData.isExplicit}
              onChange={(e) =>
                setUploadData((prev) => ({ ...prev, isExplicit: e.target.checked }))
              }
              className="w-4 h-4 rounded border-white/10 bg-surface"
            />
            <label className="text-sm text-gray-200">
              This album contains explicit content
            </label>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-8 h-12 bg-accent rounded-full text-white font-medium hover:bg-accent/80 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader className="animate-spin" size={20} /> : <Upload size={20} />}
            Upload Album
          </button>
        </div>
      </form>
    </div>
  );
}

export default ArtistDashboard;
