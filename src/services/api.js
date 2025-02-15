import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/xrpc',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach the token (if any) to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const MusicAPI = {
  // ========== Auth Endpoints ==========
  login: (email, password) => api.post('/account.login', { email, password }),
  register: (data) => api.post('/account.register', data),
  getProfile: () => api.get('/account.profile'),
  forgotPassword: (email) => api.post('/account.forgotPassword', { email }),
  resetPassword: (data) => api.post('/account.resetPassword', data),

  // ========== Music Management ==========
  createAlbum: (data) =>
    api.post('/music/album.create', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAlbum: (albumId) => api.get(`/music/album/${albumId}`),
  editAlbum: (albumId, data) => api.put(`/music/album.edit/${albumId}`, data),
  deleteAlbum: (albumId) => api.delete(`/music/album.delete/${albumId}`),

  // ========== Track Management ==========
  getTrack: (trackId) => api.get(`/music/track/${trackId}`),
  streamTrack: (trackId) => {
    const token = localStorage.getItem('token');
    return {
      url: `${api.defaults.baseURL}/music/stream/${trackId}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  },

  // ========== Playlist Management ==========
  getPlaylists: () => api.get('/music/playlists'),
  createPlaylist: (data) => api.post('/music/playlist.create', data),
  editPlaylist: (playlistId, data) => api.put(`/music/playlist.edit/${playlistId}`, data),
  deletePlaylist: (playlistId) => api.delete(`/music/playlist.delete/${playlistId}`),
  addToPlaylist: (playlistId, trackId) => api.post('/music/playlist.addTrack', { playlistId, trackId }),
  removeFromPlaylist: (playlistId, trackId) =>
    api.delete('/music/playlist.removeTrack', { data: { playlistId, trackId } }),

  // ========== Favorite Management ==========
  getFavorites: () => api.get('/music/favourite.all'),
  favoriteTrack: (trackId) => api.post('/music/favourite.track', { trackId }),
  unfavoriteTrack: (trackId) => api.delete(`/music/favourite.track/${trackId}`),
  favoriteAlbum: (albumId) => api.post('/music/favourite.album', { albumId }),
  unfavoriteAlbum: (albumId) => api.delete(`/music/favourite.album/${albumId}`),
  favoriteArtist: (artistId) => api.post('/music/favourite.artist', { artistId }),
  unfavoriteArtist: (artistId) => api.delete(`/music/favourite.artist/${artistId}`),
  getFavoriteTracks: () => api.get('/music/favourite.tracks'),

  // ========== Profile Management ==========
  getUserProfile: () => api.get('/profile.get'),
  updateUserProfile: (data) =>
    api.post('/profile.update', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getArtistProfile: (user_id) => api.get('/artist.getProfile', { params: { user_id } }),
  updateArtistProfile: (data) => api.post('/artist.updateProfile', data),

  // ========== Search ==========
  search: (query) => api.get('/search', { params: { q: query } }),

  // ========== Featured Content ==========
  getFeaturedAlbums: () => api.get('/music.featuredAlbums'),

  // ========== Recommendations ==========
  getRecommendations: () => api.get('/music.recommendations'),

  // ========== Single Playlist ==========
  getPlaylist: (playlistId) => api.get(`/music/playlist/${playlistId}`),

  // ========== Images ==========
  getImage: (folder, imageName) => {
    if (typeof imageName !== 'string') return '';
    if (imageName.startsWith('uploads/')) {
      imageName = imageName.substring(imageName.lastIndexOf('/') + 1);
    }
    return `http://localhost:5000/xrpc/images/${folder}/${imageName}`;
  },

  // ========== Reporting ==========
  reportArtist: (data) =>
    api.post('/report.artist', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default MusicAPI;
