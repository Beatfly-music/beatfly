    import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
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
    X
    } from 'lucide-react';
    import { useNavigate } from 'react-router-dom';
    import { useAudio } from '../contexts/AudioContext';
    import MusicAPI from '../services/api';

    const ArtistDashboard = () => {
    const navigate = useNavigate();
    const { playTrack, currentTrack, isPlaying } = useAudio();
    const [activeTab, setActiveTab] = useState('albums');
    const [albums, setAlbums] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [showTermsDialog, setShowTermsDialog] = useState(false);

    // Form States
    const [profileForm, setProfileForm] = useState({
        stage_name: '',
        bio: '',
        profilePic: null
    });

    const [uploadForm, setUploadForm] = useState({
        title: '',
        artist: '',
        description: '',
        albumArt: null,
        tracks: [],
        trackTitles: [],
        trackArtists: [],
        isExplicit: false,
        acceptedTerms: false
    });

    useEffect(() => {
        fetchArtistData();
    }, []);

    const fetchArtistData = async () => {
        try {
        setLoading(true);
        const userProfileResponse = await MusicAPI.getUserProfile();
        
        try {
            const artistProfileResponse = await MusicAPI.getArtistProfile(userProfileResponse.data.id);
            if (!artistProfileResponse.data || !artistProfileResponse.data.stage_name) {
            setShowProfileSetup(true);
            setProfileForm(prev => ({
                ...prev,
                stage_name: userProfileResponse.data.username
            }));
            } else {
            setProfile(artistProfileResponse.data);
            setAlbums(artistProfileResponse.data.albums || []);
            }
        } catch (err) {
            if (err.response?.status === 404) {
            setShowProfileSetup(true);
            setProfileForm(prev => ({
                ...prev,
                stage_name: userProfileResponse.data.username
            }));
            } else {
            throw err;
            }
        }
        } catch (err) {
        setError('Failed to load artist data');
        console.error(err);
        } finally {
        setLoading(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
        const formData = new FormData();
        formData.append('stage_name', profileForm.stage_name);
        formData.append('bio', profileForm.bio);
        if (profileForm.profilePic) {
            formData.append('profilePic', profileForm.profilePic);
        }

        await MusicAPI.updateArtistProfile({
            stage_name: profileForm.stage_name,
            bio: profileForm.bio
        });

        if (profileForm.profilePic) {
            await MusicAPI.updateUserProfile(formData);
        }

        await fetchArtistData();
        setShowProfileSetup(false);
        } catch (err) {
        setError('Failed to create artist profile');
        console.error(err);
        } finally {
        setLoading(false);
        }
    };

    const handleAlbumSubmit = async (e) => {
        e.preventDefault();
        
        if (!uploadForm.acceptedTerms) {
        setShowTermsDialog(true);
        return;
        }

        setLoading(true);
        setError(null);

        try {
        const formData = new FormData();
        formData.append('title', uploadForm.title);
        formData.append('artist', uploadForm.artist || profile?.stage_name);
        formData.append('description', uploadForm.description);
        formData.append('isExplicit', uploadForm.isExplicit);
        
        if (uploadForm.albumArt) {
            formData.append('albumArt', uploadForm.albumArt);
        }

        uploadForm.tracks.forEach((track, index) => {
            formData.append('tracks', track);
            formData.append('trackTitles', uploadForm.trackTitles[index] || '');
            formData.append('trackArtists', uploadForm.trackArtists[index] || uploadForm.artist || profile?.stage_name || '');
        });

        await MusicAPI.createAlbum(formData);
        await fetchArtistData();
        setUploadForm({
            title: '',
            artist: '',
            description: '',
            albumArt: null,
            tracks: [],
            trackTitles: [],
            trackArtists: [],
            isExplicit: false,
            acceptedTerms: false
        });
        setActiveTab('albums');
        } catch (err) {
        setError(err.response?.data?.error || 'Failed to upload album');
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
        await fetchArtistData();
        } catch (err) {
        setError('Failed to delete album');
        console.error(err);
        } finally {
        setLoading(false);
        }
    };

    // Terms Dialog Component
    const TermsDialog = () => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-surface max-w-2xl w-full rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle size={24} />
                <h2 className="text-xl font-bold">Content Rights & Guidelines</h2>
            </div>
            <button 
                onClick={() => setShowTermsDialog(false)}
                className="text-gray-400 hover:text-white"
            >
                <X size={24} />
            </button>
            </div>

            <div className="space-y-4 text-gray-200">
            <p>Before uploading content, please confirm that:</p>
            <ul className="list-disc pl-6 space-y-2">
                <li>You own or have licensed all necessary rights to the content you're uploading</li>
                <li>Your content complies with DMCA regulations and doesn't infringe on any copyrights</li>
                <li>You understand that your artist account may be suspended or terminated for copyright violations</li>
                <li>You accept responsibility for any claims or disputes regarding uploaded content</li>
            </ul>
            </div>

            <div className="pt-4 flex gap-4">
            <button
                onClick={() => {
                setUploadForm(prev => ({ ...prev, acceptedTerms: true }));
                setShowTermsDialog(false);
                handleAlbumSubmit(new Event('submit'));
                }}
                className="px-6 h-12 bg-accent rounded-full text-white font-medium
                        hover:bg-accent/80 transition-colors flex items-center gap-2"
            >
                I Accept & Continue
            </button>
            <button
                onClick={() => setShowTermsDialog(false)}
                className="px-6 h-12 bg-surface-light rounded-full text-white font-medium
                        hover:bg-surface transition-colors"
            >
                Cancel
            </button>
            </div>
        </div>
        </div>
    );

    // Loading State
    if (loading && !profile && !showProfileSetup) {
        return (
        <div className="min-h-full flex items-center justify-center">
            <Loader size={24} className="animate-spin text-accent" />
        </div>
        );
    }

    // Profile Setup Form
    if (showProfileSetup) {
        return (
        <div className="min-h-full">
            <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-background" />
            <div className="relative z-10 p-8">
                <div className="flex items-end gap-6 mb-8">
                <div className="w-52 h-52 bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg rounded-lg">
                    <User size={64} className="text-white/20" />
                </div>
                <div>
                    <h5 className="text-sm text-white/80">Welcome</h5>
                    <h1 className="text-5xl font-bold mb-4">Create Artist Profile</h1>
                    <p className="text-white/60 text-sm">Set up your artist profile to start sharing music</p>
                </div>
                </div>
            </div>
            </div>

            <div className="px-8">
            <form onSubmit={handleProfileSubmit} className="max-w-2xl space-y-6">
                {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                    <div className="text-red-500">{error}</div>
                </div>
                )}

                <div>
                <label className="block text-sm font-medium mb-2">Stage Name</label>
                <input
                    type="text"
                    value={profileForm.stage_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, stage_name: e.target.value }))}
                    required
                    className="w-full h-12 rounded-lg bg-surface border border-white/10 px-4 
                            text-white placeholder:text-white/40 focus:border-accent"
                />
                </div>

                <div>
                <label className="block text-sm font-medium mb-2">Biography</label>
                <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full rounded-lg bg-surface border border-white/10 px-4 py-3 
                            text-white placeholder:text-white/40 focus:border-accent"
                    placeholder="Tell us about yourself as an artist..."
                />
                </div>

                <div>
                <label className="block text-sm font-medium mb-2">Profile Picture</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfileForm(prev => ({ ...prev, profilePic: e.target.files[0] }))}
                    className="w-full p-2 rounded-lg bg-surface border border-white/10"
                />
                </div>

                <button
                type="submit"
                disabled={loading}
                className="px-8 h-12 bg-accent rounded-full text-white font-medium
                        hover:bg-accent/80 transition-colors flex items-center gap-2"
                >
                {loading ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />}
                Create Profile
                </button>
            </form>
            </div>
        </div>
        );
    }

    // Album Upload Form
    const renderUploadTab = () => (
        <div className="px-8">
        <form onSubmit={handleAlbumSubmit} className="max-w-3xl space-y-6">
            <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-2">Album Title</label>
                <input
                type="text"
                value={uploadForm.title}
                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                required
                className="w-full h-12 rounded-lg bg-surface border border-white/10 px-4 
                        text-white placeholder:text-white/40 focus:border-accent"
                placeholder="Enter album title"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Artist Name</label>
                <input
                type="text"
                value={uploadForm.artist || profile?.stage_name}
                onChange={(e) => setUploadForm(prev => ({ ...prev, artist: e.target.value }))}
                required
                className="w-full h-12 rounded-lg bg-surface border border-white/10 px-4 
                        text-white placeholder:text-white/40 focus:border-accent"
                placeholder="Enter artist name"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full rounded-lg bg-surface border border-white/10 px-4 py-3 
                        text-white placeholder:text-white/40 focus:border-accent"
                placeholder="Enter album description"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Album Art</label>
                <input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadForm(prev => ({ ...prev, albumArt: e.target.files[0] }))}
                className="w-full p-2 rounded-lg bg-surface border border-white/10"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Tracks</label>
                <div className="space-y-4">
                {uploadForm.tracks.map((_, index) => (
                    <div key={index} className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Track Title"
                        value={uploadForm.trackTitles[index] || ''}
                        onChange={(e) => {
                        const newTitles = [...uploadForm.trackTitles];
                        newTitles[index] = e.target.value;
                        setUploadForm(prev => ({ ...prev, trackTitles: newTitles }));
                        }}
                        className="flex-1 h-12 rounded-lg bg-surface border border-white/10 px-4"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => {
                        setUploadForm(prev => ({
                            ...prev,
                            tracks: prev.tracks.filter((_, i) => i !== index),
                            trackTitles: prev.trackTitles.filter((_, i) => i !== index),
                            trackArtists: prev.trackArtists.filter((_, i) => i !== index)
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
                    const newTracks = [...uploadForm.tracks, ...e.target.files];
                    const newTitles = [...uploadForm.trackTitles, ...Array(e.target.files.length).fill('')];
                    const newArtists = [...uploadForm.trackArtists, ...Array(e.target.files.length).fill(uploadForm.artist || profile?.stage_name || '')];
                    setUploadForm(prev => ({
                    ...prev,
                    tracks: newTracks,
                    trackTitles: newTitles,
                    trackArtists: newArtists
                    }));
                }}
                className="mt-4 w-full p-2 rounded-lg bg-surface border border-white/10"
                />
            </div>

            <div className="flex items-center gap-2">
                <input
                type="checkbox"
                id="explicit"
                checked={uploadForm.isExplicit}
                onChange={(e) => setUploadForm(prev => ({ ...prev, isExplicit: e.target.checked }))}
                className="w-4 h-4 rounded border-white/10 bg-surface"
                />
                <label htmlFor="explicit" className="text-sm text-gray-200">
                This album contains explicit content
                </label>
            </div>
            </div>

            <div className="flex gap-4">
            <button
                type="submit"
                disabled={loading}
                className="px-8 h-12 bg-accent rounded-full text-white font-medium
                        hover:bg-accent/80 transition-colors flex items-center gap-2"
            >
                {loading ? <Loader className="animate-spin" size={20} /> : <Upload size={20} />}
                Upload Album
            </button>
            </div>
        </form>
        </div>
    );

    // Albums List
    const renderAlbumsTab = () => (
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
            {albums.map((album, index) => (
            <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group grid grid-cols-[auto,4fr,2fr,1fr] gap-4 items-center px-4 py-2 rounded-md hover:bg-surface-light"
            >
                <div className="text-base text-gray-400 group-hover:hidden">
                {index + 1}
                </div>
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
                    <div className="text-sm text-gray-400">{album.track_count|| 0} tracks</div>
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

    // Main Dashboard Render
    return (
        <div className="min-h-full">
        {showTermsDialog && <TermsDialog />}
        
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
                    {albums.length} albums • {albums.reduce((acc, album) => acc + (album.tracks?.length || 0), 0)} tracks
                </p>
                <div className="flex gap-4">
                    <button
                    onClick={() => setActiveTab('albums')}
                    className={`px-6 py-2 rounded-full flex items-center gap-2
                        ${activeTab === 'albums' 
                        ? 'bg-white text-black' 
                        : 'bg-black/20 text-white hover:bg-black/30'}`}
                    >
                    <Album size={20} />
                    Albums
                    </button>
                    <button
                    onClick={() => setActiveTab('upload')}
                    className={`px-6 py-2 rounded-full flex items-center gap-2
                        ${activeTab === 'upload' 
                        ? 'bg-white text-black' 
                        : 'bg-black/20 text-white hover:bg-black/30'}`}
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
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                <div className="text-red-500">{error}</div>
            </div>
            </div>
        )}

        {/* Tab Content */}
        <div className="mt-8">
            {activeTab === 'albums' && renderAlbumsTab()}
            {activeTab === 'upload' && renderUploadTab()}
        </div>
        </div>
    );
    };

    export default ArtistDashboard;