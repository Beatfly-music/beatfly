import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AudioProvider } from './contexts/AudioContext';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
// Main Pages
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import LikedSongs from './pages/LikedSongs';
import Recent from './pages/Recent';
// Feature Pages
import PlaylistDetail from './pages/PlaylistDetail';
import CreatePlaylist from './pages/CreatePlaylist';
import AlbumDetail from './pages/AlbumDetail';
import AlbumEditor from './pages/AlbumEditor';
import Track from './pages/Track';
import Profile from './pages/Profile';
import ArtistDashboard from './pages/ArtistDashboard';


const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AudioProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes using a layout with an Outlet */}
            <Route
              element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }
            >
              {/* Main Navigation */}
              <Route index element={<Home />} />
              <Route path="search" element={<Search />} />
              <Route path="library" element={<Library />} />
              <Route path="liked-songs" element={<LikedSongs />} />
              <Route path="recent" element={<Recent />} />

              {/* Content Details */}
              <Route path="playlist/:id" element={<PlaylistDetail />} />
              <Route path="album/:albumId" element={<AlbumDetail />} />
              <Route path="track/:trackId" element={<Track />} />
              <Route path="profile/:userId" element={<Profile />} />

              {/* Creation/Management */}
              <Route path="create-playlist" element={<CreatePlaylist />} />
              <Route path="playlist/:id/edit" element={<CreatePlaylist />} />

              {/* Artist Management */}
              <Route path="/artist/dashboard" element={<ArtistDashboard />} />
              <Route path="/artist/album/:albumId/edit" element={<AlbumEditor />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AudioProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;