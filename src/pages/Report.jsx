// src/pages/Report.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, Upload } from 'lucide-react';
import MusicAPI from '../services/api';

const reportCategories = [
  'Copyright',
  'Spam',
  'Invalid Use of an Artist',
  'Illicit Content',
];

const Report = () => {
  const [category, setCategory] = useState(reportCategories[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!description) {
      setError('Please provide a description of the issue.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description);
      if (attachment) {
        formData.append('attachment', attachment);
      }
      // Call your API to report the artist
      await MusicAPI.reportArtist(formData);
      setSuccess('Your report has been submitted successfully.');
      setDescription('');
      setAttachment(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="relative h-60 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-background" />
        <div className="relative z-10 text-center p-4">
          <AlertTriangle size={48} className="text-red-500 mb-4 inline-block" />
          <h1 className="text-4xl font-bold text-white mb-2">Report Artist</h1>
          <p className="text-white/60 max-w-md mx-auto">
            You cannot harass others. Please report only for issues like copyright,
            spam, invalid use of an artist, or illicit content.
          </p>
        </div>
      </header>

      {/* Form Card (placed below header) */}
      <div className="px-4 py-8 sm:py-10 max-w-xl mx-auto bg-surface-light rounded-lg shadow-lg mt-6">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded">
            <p className="text-red-500">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded">
            <p className="text-green-500">{success}</p>
          </div>
        )}

        <form onSubmit={handleReportSubmit} className="space-y-6">
          {/* Report Category Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium mb-2 text-white/80">
              Report Category
            </label>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="w-full flex justify-between items-center h-12 px-4 rounded-lg bg-surface border border-white/10 text-white focus:border-accent"
            >
              <span>{category}</span>
              <ChevronDown size={20} />
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.ul
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-20 w-full bg-surface border border-white/10 rounded-lg mt-2"
                >
                  {reportCategories.map((cat) => (
                    <li key={cat}>
                      <button
                        type="button"
                        onClick={() => {
                          setCategory(cat);
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-surface-light transition-colors"
                      >
                        {cat}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2 text-white/80">
              Description
            </label>
            <textarea
              id="description"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the issue..."
              required
              className="w-full px-4 py-3 rounded-lg bg-surface border border-white/10 text-white placeholder-white/40 focus:border-accent"
            />
          </div>

          {/* Attachment */}
          <div>
            <label htmlFor="attachment" className="block text-sm font-medium mb-2 text-white/80">
              Attachment (Optional)
            </label>
            <input
              id="attachment"
              type="file"
              accept="image/*, application/pdf"
              onChange={(e) => setAttachment(e.target.files[0])}
              className="w-full p-2 rounded-lg bg-surface border border-white/10 text-white"
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 px-8 h-12 bg-accent rounded-full text-white font-medium hover:bg-accent/80 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <motion.div
                  className="w-6 h-6 border-2 border-t-transparent border-accent rounded-full animate-spin"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <>
                  <Upload size={20} /> Submit Report
                </>
              )}
            </button>
            <Link to="/" className="text-sm text-gray-400 hover:underline">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Report;
