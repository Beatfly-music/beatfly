import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, ArrowLeft, ShieldCheck } from 'lucide-react';
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
    <div className="h-screen flex flex-col bg-background">
      <TitleBar className="fixed top-0 left-0 right-0 z-50" />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 bg-gradient-to-br from-indigo-800/50 via-purple-700/50 to-blue-800/50 flex items-center justify-center p-4 pt-16"
      >
        <motion.div 
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md space-y-8 bg-surface p-8 rounded-lg shadow-xl"
        >
          <div className="text-center">
            <motion.div
              className="flex justify-center mb-4"
            >
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <ShieldCheck size={32} className="text-white" />
              </div>
            </motion.div>
            <h2 className="text-3xl font-bold text-white">New Password</h2>
            <p className="mt-2 text-gray-300">Create a new secure password for your account</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg"
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
                className="mt-1 w-full rounded-lg bg-surface-light border border-gray-600 px-4 py-3 text-white focus:border-accent focus:ring-1 focus:ring-accent"
                required
                disabled={loading}
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg bg-surface-light border border-gray-600 px-4 py-3 text-white focus:border-accent focus:ring-1 focus:ring-accent"
                required
                disabled={loading}
                placeholder="Confirm new password"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-accent hover:bg-accent-dark text-white py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
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
            </motion.button>
          </form>

          <div className="text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;