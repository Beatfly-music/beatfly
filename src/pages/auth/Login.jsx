import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Music, ArrowRight } from 'lucide-react';
import TitleBar from '../../components/layout/TitleBar';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to log in');
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
        className="flex-1 bg-gradient-to-br from-blue-900/50 via-purple-800/50 to-blue-700/50 flex items-center justify-center p-4 pt-16"
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
                <Music size={32} className="text-white" />
              </div>
            </motion.div>
            <h2 className="text-3xl font-bold text-white">Welcome to Beatfly</h2>
            <p className="mt-2 text-gray-300">Sign in to continue your musical journey</p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-200">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg bg-surface-light border border-gray-600 px-4 py-3 text-white focus:border-accent focus:ring-1 focus:ring-accent"
                required
                disabled={loading}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-200">Password</label>
                <Link 
                  to="/forgot-password" 
                  className="text-xs text-accent hover:text-accent-dark transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg bg-surface-light border border-gray-600 px-4 py-3 text-white focus:border-accent focus:ring-1 focus:ring-accent"
                required
                disabled={loading}
                placeholder="Enter your password"
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
                'Sign In'
              )}
            </motion.button>
          </form>

          <div className="text-center">
            <div className="mb-4 text-gray-300">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent hover:text-accent-dark transition-colors inline-flex items-center gap-1">
                Sign up <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;