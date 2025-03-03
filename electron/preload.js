// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development';

// Create the exposure object
contextBridge.exposeInMainWorld('electron', {
  // Window control functions
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  
  // Asset path helper function
  getAssetPath: (assetName) => {
    if (isDev) {
      return `/${assetName}`;
    } else {
      return `app://dist/${assetName}`;
    }
  },
  
  // System information
  isElectron: true,
  platform: process.platform
});