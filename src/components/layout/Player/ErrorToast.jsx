// ErrorToast.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * @param {string} error       The error message to show
 * @param {number} duration    How long (ms) before auto-dismiss (defaults to 5000)
 * @param {() => void} onDismiss   Callback to hide the toast
 */
const ErrorToast = ({
  error,
  duration = 5000,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);

  // auto‐start dismiss timer
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => setVisible(false);

  return (
    <AnimatePresence>
    {visible && (
      <motion.div
      role="alert"
      aria-live="assertive"
      className="
      fixed left-1/2 bottom-8 transform -translate-x-1/2
      backdrop-blur-md bg-red-600/80
      text-white px-5 py-3
      rounded-2xl shadow-xl
      flex flex-col space-y-2
      z-50 select-none
      "
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      // when exit animation finishes, call onDismiss
      onAnimationComplete={(definition) => {
        if (definition === 'exit' && onDismiss) onDismiss();
      }}
      >
      {/* top row: icon, message & close button */}
      <div className="flex items-center space-x-3">
      <span className="text-lg">⚠️</span>
      <span className="flex-1 text-sm font-medium">{error}</span>
      <button
      onClick={handleClose}
      aria-label="Close error toast"
      className="p-1 rounded-full hover:bg-white/20 focus:outline-none"
      >
      <X size={16} />
      </button>
      </div>

      {/* progress bar */}
      <div className="h-1 w-full bg-red-500/40 rounded-full overflow-hidden">
      <motion.div
      className="h-full bg-white"
      initial={{ width: '100%' }}
      animate={{ width: 0 }}
      transition={{ duration, ease: 'linear' }}
      />
      </div>
      </motion.div>
    )}
    </AnimatePresence>
  );
};

export default ErrorToast;
