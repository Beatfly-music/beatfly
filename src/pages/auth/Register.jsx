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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleTermsChange = (e) => {
    setAcceptedTerms(e.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!acceptedTerms) {
      setError('You must accept the Terms of Service before creating an account.');
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

          {/* Terms of Service Section */}
          <div className="bg-gray-800 border border-gray-700 p-4 rounded">
            <h3 className="text-lg font-bold text-white mb-2">Terms of Service</h3>
            <div className="h-32 overflow-y-auto mb-2 p-2 bg-gray-900 text-gray-300 text-sm rounded">
              <p>
                By registering, you agree to our Terms of Service. We collect and hold specific data such as likes, listens, and other information necessary for the operation of the service. 
              </p>
              <p className="mt-2">
                Becoming an artist makes you solely responsible for ensuring that all music you upload complies with copyright laws. We reserve the right to remove any music or terminate your artist or personal account for any reason, including, but not limited to, violations of these Terms of Service.
              </p>
              <p className="mt-2">
                You are prohibited from using our platform to pirate, reupload unauthorized music, or distribute any music intended to target, harass, or discriminate against individuals. Additionally, while the open-source nature of our platform allows for modifications, any changes must not compromise the security, integrity, or intended purpose of our community.
              </p>
              <p className="mt-2">
                Any attempts to circumvent these rules or exploit loopholes may result in immediate account termination without notice.
              </p>
            </div>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="tos" 
                checked={acceptedTerms}
                onChange={handleTermsChange}
                className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent"
              />
              <label htmlFor="tos" className="ml-2 text-gray-200 text-sm">
                I agree to the Terms of Service
              </label>
            </div>
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
