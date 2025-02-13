import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save,
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  Loader
} from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';

const AlbumEditor = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [album, setAlbum] = useState(null);
  const [form, setForm] = useState({
    title: '',
    artist: '',
    description: '',
    albumArt: null,
    isExplicit: false
  });
  
  // State to hold the preview URL for the new cover image
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  
  // Fetch album data when albumId changes
  useEffect(() => {
    fetchAlbum();
  }, [albumId]);
  
  // Create and clean up preview URL when form.albumArt changes
  useEffect(() => {
    if (form.albumArt) {
      const objectUrl = URL.createObjectURL(form.albumArt);
      setCoverPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setCoverPreviewUrl(null);
    }
  }, [form.albumArt]);

  const fetchAlbum = async () => {
    try {
      setLoading(true);
      const response = await MusicAPI.getAlbum(albumId);
      setAlbum(response.data);
      setForm({
        title: response.data.title,
        artist: response.data.artist,
        description: response.data.description || '',
        albumArt: null, // reset file input
        isExplicit: response.data.isExplicit || false
      });
    } catch (err) {
      setError('Failed to load album');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('artist', form.artist);
      formData.append('description', form.description);
      formData.append('isExplicit', form.isExplicit);
      
      if (form.albumArt) {
        formData.append('albumArt', form.albumArt);
      }

      await MusicAPI.editAlbum(albumId, formData);
      navigate('/artist/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update album');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrack = async (trackId) => {
    if (!window.confirm('Are you sure you want to delete this track?')) return;
    
    try {
      setLoading(true);
      await MusicAPI.deleteTrack(trackId);
      await fetchAlbum();
    } catch (err) {
      setError('Failed to delete track');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !album) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!album) return null;

  return (
    <div className="min-h-full">
      {/* Header with Gradient */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-background" />
        <div className="relative z-10 p-8">
          <button
            type="button"
            onClick={() => navigate('/artist/dashboard')}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-8"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>

          <div className="flex items-end gap-6">
            <div className="w-52 h-52 bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg rounded-lg overflow-hidden">
              {coverPreviewUrl ? (
                // Show new cover preview
                <div className="relative w-full h-full group">
                  <img 
                    src={coverPreviewUrl}
                    alt="New cover preview"
                    className="w-full h-full object-cover"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="text-white text-sm">Change Cover</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        setForm(prev => ({ ...prev, albumArt: e.target.files[0] }))
                      }
                    />
                  </label>
                </div>
              ) : album.album_art ? (
                // Show current album art
                <div className="relative w-full h-full group">
                  <img 
                    src={album.album_art}
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="text-white text-sm">Change Cover</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        setForm(prev => ({ ...prev, albumArt: e.target.files[0] }))
                      }
                    />
                  </label>
                </div>
              ) : (
                // Prompt to add a cover
                <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-white/5">
                  <span className="text-white/40 text-sm">Add Cover</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setForm(prev => ({ ...prev, albumArt: e.target.files[0] }))
                    }
                  />
                </label>
              )}
            </div>
            <div>
              <h5 className="text-sm text-white/80">Editing Album</h5>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="text-5xl font-bold bg-transparent border-none px-0 mb-4 text-white w-full focus:ring-0"
                placeholder="Album Title"
              />
              <p className="text-white/60 text-sm">
                {album.tracks?.length || 0} tracks • Created {new Date(album.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="text-red-500">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Artist Name</label>
              <input
                type="text"
                value={form.artist}
                onChange={(e) => setForm(prev => ({ ...prev, artist: e.target.value }))}
                className="w-full h-12 rounded-lg bg-surface border border-white/10 px-4 text-white"
                placeholder="Artist name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full rounded-lg bg-surface border border-white/10 px-4 py-3 text-white"
                placeholder="Album description..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="explicit"
                checked={form.isExplicit}
                onChange={(e) => setForm(prev => ({ ...prev, isExplicit: e.target.checked }))}
                className="w-4 h-4 rounded border-white/10 bg-surface"
              />
              <label htmlFor="explicit" className="text-sm text-gray-200">
                This album contains explicit content
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Tracks</h3>
            <div className="grid grid-cols-[auto,4fr,1fr] gap-4 px-4 py-2 text-sm text-gray-400 border-b border-white/10">
              <div>#</div>
              <div>Title</div>
              <div className="text-right">Actions</div>
            </div>

            <div className="space-y-1">
              {album.tracks?.map((track) => {
                const isCurrentTrack = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    className="grid grid-cols-[auto,4fr,1fr] gap-4 items-center px-4 py-2 rounded-md hover:bg-surface-light group"
                  >
                    <div className="flex items-center justify-center w-8">
                      <button 
                        type="button"
                        onClick={() => isCurrentTrack ? togglePlay() : playTrack(track)}
                        className="text-gray-400 hover:text-white"
                      >
                        {isCurrentTrack && isPlaying ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                      </button>
                    </div>

                    <input
                      type="text"
                      value={track.title}
                      className="bg-transparent border-none px-0 text-white focus:ring-0"
                      readOnly
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteTrack(track.id)}
                        className="p-2 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 h-12 bg-accent rounded-full text-white font-medium hover:bg-accent/80 transition-colors flex items-center gap-2"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => navigate('/artist/dashboard')}
              className="px-8 h-12 bg-surface rounded-full text-white font-medium hover:bg-surface-light transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AlbumEditor;
