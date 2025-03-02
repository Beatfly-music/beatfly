// src/components/auth/Login.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-surface p-8 rounded-lg w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/logo.svg" alt="BeatFly" className="h-12" />
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-6">Login to BeatFly</h2>
        
        {error && (
          <div className="bg-red-500 text-white p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded bg-surface-light text-white focus:ring-2 focus:ring-accent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded bg-surface-light text-white focus:ring-2 focus:ring-accent"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-3 rounded-full bg-accent hover:bg-accent-dark transition-colors font-medium"
          >
            Log In
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-white">
            Forgot your password?
          </Link>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-gray-400">Don't have an account?</p>
          <Link 
            to="/register" 
            className="mt-2 block py-3 rounded-full border border-gray-700 hover:border-white transition-colors font-medium"
          >
            Sign up for BeatFly
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;