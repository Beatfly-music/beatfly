import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import TitleBar from '../../components/layout/TitleBar';
import MusicAPI from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      // Adjust the endpoint if your API uses a different route
      const response = await MusicAPI.forgotPassword(email);
      setMessage(response.data.message || 'Please check your email for reset instructions.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email.');
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
        className="min-h-screen bg-gradient-to-br from-red-600 via-purple-600 to-blue-600 flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md space-y-8 bg-surface p-8 rounded-lg shadow-xl"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="flex justify-center mb-4"
            >
              <Music size={64} className="text-accent" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white">Forgot Password</h2>
            <p className="mt-2 text-gray-300">Enter your email address to reset your password</p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-200">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="text-center text-gray-300">
            <Link 
              to="/login" 
              className="block hover:text-white transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default ForgotPassword;
