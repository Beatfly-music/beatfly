import React, { createContext, useContext, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext({
    showToast: () => {},
                                   clearToast: () => {},
});

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const TOAST_TYPES = {
    success: {
        icon: CheckCircle,
        bgColor: 'bg-green-500/90',
        borderColor: 'border-green-400',
    },
    error: {
        icon: AlertCircle,
        bgColor: 'bg-red-500/90',
        borderColor: 'border-red-400',
    },
    info: {
        icon: Info,
        bgColor: 'bg-blue-500/90',
        borderColor: 'border-blue-400',
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'bg-yellow-500/90',
        borderColor: 'border-yellow-400',
    },
};

const Toast = ({ message, type = 'info', onClose }) => {
    const { icon: Icon, bgColor, borderColor } = TOAST_TYPES[type];

    return (
        <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.3 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
        className={`
            fixed bottom-6 left-1/2 transform -translate-x-1/2
            flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg
            border ${borderColor} ${bgColor} text-white
            backdrop-blur-sm z-50
            `}
            >
            <Icon size={18} />
            <span className="text-sm font-medium">{message}</span>
            <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="ml-2 hover:opacity-80 transition-opacity"
            >
            <X size={18} />
            </motion.button>
            </motion.div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback(({ message, type = 'info', duration = 5000 }) => {
        const id = Date.now();

        setToasts(prev => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                clearToast(id);
            }, duration);
        }

        return id;
    }, []);

    const clearToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const contextValue = {
        showToast,
        clearToast,
    };

    return (
        <ToastContext.Provider value={contextValue}>
        {children}
        <AnimatePresence mode="sync">
        {toasts.map(toast => (
            <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => clearToast(toast.id)}
            />
        ))}
        </AnimatePresence>
        </ToastContext.Provider>
    );
};

// Example usage:
/*
 i m*port { useToast } from './contexts/ToastContext';

 const MyComponent = () => {
 const { showToast } = useToast();

 const handleSuccess = () => {
 showToast({
 message: 'Operation completed successfully!',
 type: 'success',
 duration: 3000
 });
 };

 const handleError = () => {
 showToast({
 message: 'Something went wrong!',
 type: 'error'
 });
 };

 return (
     <div>
     <button onClick={handleSuccess}>Show Success</button>
     <button onClick={handleError}>Show Error</button>
     </div>
     );
     };
     */
