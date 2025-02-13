import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const result = await register(formData.username, formData.email, formData.password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to create account');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-blue-700 via-purple-600 to-pink-500 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md space-y-8 bg-surface p-8 rounded-lg shadow-xl"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Create Account</h2>
          <p className="mt-2 text-gray-300">Join BeatFly and start your musical journey</p>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="mt-1 w-full rounded bg-surface-light border border-gray-600 px-4 py-2 text-white focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 w-full rounded bg-surface-light border border-gray-600 px-4 py-2 text-white focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 w-full rounded bg-surface-light border border-gray-600 px-4 py-2 text-white focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="mt-1 w-full rounded bg-surface-light border border-gray-600 px-4 py-2 text-white focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-accent hover:bg-accent-dark text-white py-2 px-4 rounded transition duration-200"
          >
            Create Account
          </button>
        </form>

        <div className="text-center text-gray-300">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-dark transition-colors">
            Log in
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Register;
