// src/pages/auth/ResetPassword.jsx
import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import MusicAPI from '../../services/api';
import TitleBar from '../../components/layout/TitleBar';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!resetToken) {
      setError('Reset token is missing');
      return;
    }

    setLoading(true);
    try {
      const response = await MusicAPI.resetPassword({ token: resetToken, newPassword });
      setMessage(response.data.message || 'Your password has been reset successfully.');
      // Optionally redirect to login after a delay:
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TitleBar />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-500 flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md space-y-8 bg-surface p-8 rounded-lg shadow-xl"
        >
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Reset Password</h2>
            <p className="mt-2 text-gray-300">Enter your new password below</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded"
            >
              {error}
            </motion.div>
          )}

          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded"
            >
              {message}
            </motion.div>
          )}

          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-200">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded bg-surface-light border border-gray-600 px-4 py-2 text-white focus:border-accent focus:ring-1 focus:ring-accent"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded bg-surface-light border border-gray-600 px-4 py-2 text-white focus:border-accent focus:ring-1 focus:ring-accent"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark text-white py-2 px-4 rounded transition duration-200 flex items-center justify-center"
            >
              {loading ? (
                <motion.div 
                  className="flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                </motion.div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="text-center text-gray-300">
            <Link to="/login" className="hover:text-white transition-colors">
              Back to Login
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default ResetPassword;
    