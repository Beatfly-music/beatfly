// src/pages/PlaylistDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Clock, MoreHorizontal, Share2, Edit3, Trash2 } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import MusicAPI from '../services/api';

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack } = useAudio();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const response = await MusicAPI.getPlaylist(id);
        setPlaylist(response.data);
      } catch (err) {
        console.error('Error fetching playlist:', err);
        setError('Failed to load playlist');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => alert('Playlist URL copied to clipboard!'))
      .catch(() => alert('Failed to copy URL.'));
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      try {
        await MusicAPI.deletePlaylist(playlist.id);
        navigate('/library'); // Navigate back to library or appropriate page
      } catch (err) {
        console.error('Error deleting playlist:', err);
        setError('Failed to delete playlist');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
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

  if (!playlist) {
    return <div className="min-h-full p-8 text-white">No playlist found.</div>;
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-blue-900/30 to-background p-8">
      {/* Header */}
      <div className="flex items-end gap-6 mb-8">
        <div className="w-52 h-52 bg-surface shadow-lg rounded-md overflow-hidden">
          {playlist.image ? (
            <img 
              src={MusicAPI.getImage('albumArt', playlist.image)} 
              alt={playlist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center">
              <span className="text-6xl font-bold text-white/20">#{playlist.id}</span>
            </div>
          )}
        </div>
        <div>
          <h5 className="text-sm text-white/80">Playlist</h5>
          <h1 className="text-5xl font-bold mb-4">{playlist.name}</h1>
          <p className="text-white/60 text-sm">
            Created on {new Date(playlist.created_at).toLocaleDateString()}
          </p>
          {playlist.description && (
            <p className="text-white mt-2">{playlist.description}</p>
          )}
        </div>
      </div>

      {/* Playlist Actions */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={handleShare}
          className="flex items-center text-white hover:text-accent transition-colors"
        >
          <Share2 size={24} />
          <span className="ml-2 hidden sm:inline">Share</span>
        </button>
        <Link
          to={`/playlist/edit/${playlist.id}`}
          className="flex items-center text-white hover:text-accent transition-colors"
        >
          <Edit3 size={24} />
          <span className="ml-2 hidden sm:inline">Edit</span>
        </Link>
        <button 
          onClick={handleDelete}
          className="flex items-center text-white hover:text-red-500 transition-colors"
        >
          <Trash2 size={24} />
          <span className="ml-2 hidden sm:inline">Delete</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 my-8">
        <button 
          className="w-12 h-12 rounded-full bg-accent flex items-center justify-center hover:scale-105 transition-transform"
          onClick={() => {
            if (playlist.tracks && playlist.tracks.length > 0) {
              playTrack(playlist.tracks[0]);
            }
          }}
        >
          <Play size={24} className="text-white ml-1" />
        </button>
        <button className="text-white/80 hover:text-white">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* Tracks Header */}
      <div className="grid grid-cols-[16px,5fr,2fr,1fr] gap-4 px-4 py-2 text-sm text-gray-400 border-b border-white/10">
        <div>#</div>
        <div>Title</div>
        <div>Date Added</div>
        <div className="flex justify-end">
          <Clock size={16} />
        </div>
      </div>

      {/* Tracks List */}
      {playlist.tracks && playlist.tracks.length > 0 ? (
        playlist.tracks.map((track, index) => (
          <div 
            key={track.id}
            className="flex items-center px-4 py-2 hover:bg-surface-light group"
          >
            <div className="w-8 text-gray-400 text-sm">{index + 1}</div>
            <div className="flex items-center gap-4 flex-1">
              <img 
                src={MusicAPI.getImage('albumArt', track.track_image)}
                alt={track.title}
                className="w-10 h-10 rounded mr-4 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/default-album-art.png';
                }}
              />
              <div className="flex-1">
                <div className="font-medium text-white">{track.title}</div>
                <div className="text-sm text-gray-400">{track.artist}</div>
              </div>
            </div>
            <div className="text-gray-400">
              {track.date_added ? new Date(track.date_added).toLocaleDateString() : 'N/A'}
            </div>
            <div className="flex justify-end text-gray-400">
              {track.duration ? track.duration : ''}
            </div>
          </div>
        ))
      ) : (
        <div className="text-sm text-gray-400 flex items-center justify-center py-8">
          No tracks in this playlist
        </div>
      )}
    </div>
  );
};

export default PlaylistDetail;
