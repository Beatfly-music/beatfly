// src/pages/AlbumDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, Heart, MoreHorizontal, Clock } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';

// Custom Explicit Icon Component
const ExplicitIcon = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <text x="4" y="18" fontSize="16" fontWeight="bold">E</text>
  </svg>
);

const AlbumDetail = () => {
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudio();

  useEffect(() => {
    fetchAlbumDetails();
  }, [albumId]);

  const fetchAlbumDetails = async () => {
    try {
      const response = await fetch(`http://localhost:5000/xrpc/music/album/${albumId}`);
      const data = await response.json();
      setAlbum(data);

      // Check if album is liked
      const token = localStorage.getItem('token');
      if (token) {
        const likeResponse = await fetch(
          `http://localhost:5000/xrpc/music/favourite.album/check/${albumId}`,
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

      await fetch(`http://localhost:5000/xrpc${endpoint}`, {
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

  return (
    <div className="flex-1 overflow-auto">
      {/* Album Header */}
      <div className="relative h-96 bg-gradient-to-b from-accent/30 to-background p-8 flex items-end">
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="relative flex items-end gap-6">
          <img
            src={album.album_art}
            alt={album.title}
            className="w-56 h-56 shadow-lg rounded-lg"
          />
          <div>
            <div className="text-sm font-medium mb-2">Album</div>
            <div className="flex items-center">
              {/* Title and explicit icon rendered separately */}
              <h1 className="text-5xl font-bold mb-4 flex-grow truncate">
                {album.title}
              </h1>
              {album.isExplicit ? (
                <div className="ml-4 flex-shrink-0">
                  <ExplicitIcon size={24} className="text-white" />
                </div>
              ) : null}
            </div>
            <div className="flex items-center text-sm">
              <img
                src={album.artist_image}
                alt={album.artist}
                className="w-6 h-6 rounded-full mr-2"
              />
              <span className="font-medium">{album.artist}</span>
              <span className="mx-2">•</span>
              <span>{album.year}</span>
              <span className="mx-2">•</span>
              <span>{album.tracks.length} songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-8 py-4 flex items-center gap-4">
        <button
          onClick={() => {
            if (isAlbumPlaying) {
              togglePlay();
            } else {
              playTrack(album.tracks[0]);
            }
          }}
          className="w-14 h-14 bg-accent rounded-full flex items-center justify-center hover:bg-accent-dark"
        >
          {isAlbumPlaying ? (
            <Pause size={28} fill="white" />
          ) : (
            <Play size={28} fill="white" />
          )}
        </button>
        <button
          onClick={toggleLike}
          className={`w-10 h-10 flex items-center justify-center rounded-full
            ${isLiked ? 'text-accent' : 'text-white hover:text-accent'}`}
        >
          <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:text-accent">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* Track List */}
      <div className="px-8">
        <div className="grid gap-[1px] bg-surface-light rounded-lg overflow-hidden">
          <div className="grid grid-cols-[16px,4fr,3fr,1fr] gap-4 px-4 py-2 text-sm text-gray-400 bg-surface">
            <div>#</div>
            <div>Title</div>
            <div>Artist</div>
            <div className="flex justify-end">
              <Clock size={16} />
            </div>
          </div>
          {album.tracks.map((track, index) => (
            <div
              key={track.id}
              className={`grid grid-cols-[16px,4fr,3fr,1fr] gap-4 px-4 py-2 bg-surface hover:bg-surface-light group
                ${currentTrack?.id === track.id ? 'text-accent' : ''}`}
            >
              <div className="flex items-center text-sm text-gray-400 group-hover:hidden">
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
              <div className="flex items-center">
                <div>
                  <div className="font-medium">{track.title}</div>
                </div>
              </div>
              <div className="flex items-center text-gray-400">
                {track.artist}
              </div>
              <div className="flex items-center justify-end text-gray-400">
                {track.duration}
              </div>
            </div>
          ))}
        </div>

        {/* Album Info */}
        <div className="mt-8 pb-8 text-gray-400">
          <div className="mb-4">
            <div className="text-sm">Released</div>
            <div>{album.release_date}</div>
          </div>
          {album.description && (
            <div>
              <div className="text-sm">About</div>
              <p className="mt-1">{album.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumDetail;
