// localRecentsAPI.js

// The key used to store recents in localStorage.
const RECENTS_KEY = 'recentTracks';

/**
 * Retrieves the recent tracks from local storage.
 * @returns {Array} Array of recent track objects.
 */
const getRecents = () => {
  const recents = localStorage.getItem(RECENTS_KEY);
  if (recents) {
    try {
      return JSON.parse(recents);
    } catch (error) {
      console.error('Error parsing recents from localStorage:', error);
      return [];
    }
  }
  return [];
};

/**
 * Saves the given array of tracks to local storage.
 * @param {Array} tracks Array of track objects.
 */
const setRecents = (tracks) => {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(tracks));
};

/**
 * Adds a track to the recent tracks.
 * If the track already exists (by id), it is moved to the top.
 * Limits the list to 10 items.
 * @param {Object} track The track object to add.
 */
const addRecent = (track) => {
  let recents = getRecents();
  // Remove any existing instance of this track.
  recents = recents.filter((t) => t.id !== track.id);
  // Add the track to the beginning.
  recents.unshift(track);
  // Limit the recents list to 10 items.
  if (recents.length > 10) {
    recents = recents.slice(0, 10);
  }
  setRecents(recents);
};

/**
 * Removes a track from the recent tracks by its ID.
 * @param {string|number} trackId The ID of the track to remove.
 */
const removeRecent = (trackId) => {
  let recents = getRecents();
  recents = recents.filter((t) => t.id !== trackId);
  setRecents(recents);
};

/**
 * Clears all recent tracks from local storage.
 */
const clearRecents = () => {
  localStorage.removeItem(RECENTS_KEY);
};

/**
 * Local API for managing recent tracks.
 * All methods return promises to simulate an asynchronous API.
 */
const LocalRecentsAPI = {
  getRecents: () => Promise.resolve(getRecents()),
  addRecent: (track) => {
    addRecent(track);
    return Promise.resolve(true);
  },
  removeRecent: (trackId) => {
    removeRecent(trackId);
    return Promise.resolve(true);
  },
  clearRecents: () => {
    clearRecents();
    return Promise.resolve(true);
  },
};

export default LocalRecentsAPI;
