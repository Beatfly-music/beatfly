// src/contexts/AudioContext.jsx

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import MusicAPI from '../services/api';

/* ───────────────────────────────────────────────
 F REQUENCIES & CONSTANTS                                     *
 ─────────────────────────────────────────────── */
const STANDARD_FREQUENCIES = [60, 230, 910, 3600, 14000];
const ADVANCED_FREQUENCIES = [
  20, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000,
];

const FREQUENCY_BANDS = [
  { name: 'sub-bass', min: 20, max: 60, color: '#8B5CF6' },
{ name: 'bass', min: 60, max: 250, color: '#6366F1' },
{ name: 'low-mids', min: 250, max: 500, color: '#3B82F6' },
{ name: 'mids', min: 500, max: 2000, color: '#10B981' },
{ name: 'high-mids', min: 2000, max: 4000, color: '#F59E0B' },
{ name: 'presence', min: 4000, max: 8000, color: '#EF4444' },
{ name: 'brilliance', min: 8000, max: 20000, color: '#EC4899' },
];

const EQ_PRESETS = {
  standard: [
    { id: 'flat', name: 'Flat', values: [0, 0, 0, 0, 0] },
    { id: 'balanced', name: 'Balanced', values: [1, 1, 0, 1, 1] },
    { id: 'bass-reduction', name: 'Bass Reduction', values: [-3, -2, 0, 0, 0] },
    { id: 'vocal', name: 'Vocal Clarity', values: [-1, -1, 1, 2, 1] },
    { id: 'warmth', name: 'Warmth', values: [2, 1, 0, -1, -1] },
    { id: 'presence', name: 'Presence', values: [0, 0, 1, 2, 1] },
    { id: 'sparkle', name: 'Sparkle', values: [0, 0, 0, 1, 2] },
    { id: 'podcast', name: 'Podcast/Speech', values: [-2, 0, 2, 2, 0] },
    { id: 'night', name: 'Night Mode', values: [-1, -1, 0, -1, -2] },
    { id: 'clarity', name: 'Crystal Clear', values: [-1, 0, 1, 2, 2] },
  ],
  advanced: [
    { id: 'studio', name: 'Studio Reference', values: Array(30).fill(0) },
    { id: 'natural', name: 'Natural Enhancement',
      values: [0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    { id: 'detailed', name: 'Detailed & Clean',
      values: [-1, -1, -1, -0.5, 0, 0, 0, 0.5, 1, 1, 1.5, 1.5, 2, 2, 2, 2, 1.5, 1, 1, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
  ],
};

const CACHE_CONFIG = {
  shortTerm: 24 * 60 * 60 * 1000,
  mediumTerm: 7 * 24 * 60 * 60 * 1000,
  longTerm: 30 * 24 * 60 * 60 * 1000,
};

const REALTIME_CONFIG = {
  analysisInterval: 10,
  sampleSize: 2048,
  smoothingFactor: 0.85,
  targetLoudness: -16,
  maxBoost: 6,
  maxCut: -10,
  adaptiveSpeed: 0.1,
  frequencyResolution: 4096,
};

/* ───────────────────────────────────────────────
 C ACHE MANAGER                                               *
 ─────────────────────────────────────────────── */
class CacheManager {
  constructor() {
    this.db = null;
    this.ready = this.init();
    this.memoryCache = new Map();
  }

  async init() {
    if (this.db) return true;

    try {
      const request = indexedDB.open('beatfly-audio-cache', 6);

      this.db = await new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          const stores = [
            { name: 'tracks', keyPath: 'id' },
            { name: 'audio-files', keyPath: 'id' },
            { name: 'album-art', keyPath: 'url' },
            { name: 'eq-presets', keyPath: 'id' },
            { name: 'audio-analysis', keyPath: 'trackId' },
            { name: 'waveforms', keyPath: 'trackId' },
          ];

          stores.forEach((store) => {
            if (!db.objectStoreNames.contains(store.name)) {
              db.createObjectStore(store.name, { keyPath: store.keyPath });
            }
          });
        };
      });

      return true;
    } catch (err) {
      console.error('Cache initialization failed:', err);
      return false;
    }
  }

  async get(storeName, key) {
    const cacheKey = `${storeName}:${key}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey);
    }

    await this.ready;
    if (!this.db) return null;

    try {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            this.memoryCache.set(cacheKey, result);
          }
          resolve(result);
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async put(storeName, item) {
    await this.ready;
    if (!this.db) return false;

    try {
      const itemWithTimestamp = { ...item, cachedAt: Date.now() };
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(itemWithTimestamp);

      const cacheKey = `${storeName}:${item.id || item.url || item.trackId}`;
      this.memoryCache.set(cacheKey, itemWithTimestamp);

      return true;
    } catch {
      return false;
    }
  }

  async clear(storeName) {
    await this.ready;
    if (!this.db) return false;

    try {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();

      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(`${storeName}:`)) {
          this.memoryCache.delete(key);
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  isStale(cachedAt, maxAge = CACHE_CONFIG.shortTerm) {
    return !cachedAt || Date.now() - cachedAt > maxAge;
  }
}

const cacheInstance = new CacheManager();

/* ───────────────────────────────────────────────
 I NTELLIGENT AUDIO ANALYZER                                  *
 ─────────────────────────────────────────────── */
class IntelligentAudioAnalyzer {
  constructor(audioContext, analyzerNode) {
    this.audioContext = audioContext;
    this.analyzer = analyzerNode;
    this.frequencyData = new Float32Array(analyzerNode.frequencyBinCount);
    this.timeData = new Float32Array(analyzerNode.fftSize);

    this.contentType = 'unknown';
    this.dynamicRange = 0;
    this.spectralBalance = { bass: 0, mid: 0, treble: 0 };
    this.clarity = 0;

    this.history = {
      gains: null,
      loudness: [],
      spectrum: [],
      dynamics: [],
    };

    this.adaptiveParams = {
      bassControl: 1.0,
      midControl: 1.0,
      trebleControl: 1.0,
      clarityEnhancement: 0,
      dynamicCompression: 0,
    };
  }

  safeDivide(a, b, defaultValue = 0) {
    if (!isFinite(b) || b === 0) return defaultValue;
    const result = a / b;
    return isFinite(result) ? result : defaultValue;
  }

  safeLog10(value) {
    if (value <= 0) return -100;
    const result = Math.log10(value);
    return isFinite(result) ? result : -100;
  }

  analyzeContentType() {
    this.analyzer.getFloatFrequencyData(this.frequencyData);
    this.analyzer.getFloatTimeDomainData(this.timeData);

    let zeroCrossings = 0;
    for (let i = 1; i < this.timeData.length; i++) {
      if ((this.timeData[i] >= 0) !== (this.timeData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / this.timeData.length;

    const nyquist = this.audioContext.sampleRate / 2;
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < this.frequencyData.length; i++) {
      const freq = (i / this.frequencyData.length) * nyquist;
      const magnitude = Math.pow(10, this.frequencyData[i] / 20);
      weightedSum += freq * magnitude;
      magnitudeSum += magnitude;
    }

    const spectralCentroid = this.safeDivide(weightedSum, magnitudeSum, 1000);

    if (zcr > 0.1 && spectralCentroid < 2000) {
      this.contentType = 'speech';
    } else if (zcr < 0.05 && spectralCentroid > 1000) {
      this.contentType = 'music';
    } else {
      this.contentType = 'mixed';
    }

    return this.contentType;
  }

  calculateLoudness() {
    let sum = 0;
    let count = 0;

    for (let i = 0; i < this.frequencyData.length; i++) {
      const freq = (i / this.frequencyData.length) * (this.audioContext.sampleRate / 2);

      let weight = 1;
      if (freq < 100) weight = 0.5;
      else if (freq < 1000) weight = 0.8 + (freq / 1000) * 0.2;
      else if (freq > 6000) weight = 0.8 - ((freq - 6000) / 14000) * 0.3;

      const amplitude = Math.pow(10, this.frequencyData[i] / 20);
      sum += amplitude * amplitude * weight;
      count += weight;
    }

    const rms = Math.sqrt(this.safeDivide(sum, count));
    return -0.691 + 10 * this.safeLog10(rms);
  }

  analyzeSpectralBalance() {
    const nyquist = this.audioContext.sampleRate / 2;
    const bands = { bass: 0, mid: 0, treble: 0 };
    const counts = { bass: 0, mid: 0, treble: 0 };

    for (let i = 0; i < this.frequencyData.length; i++) {
      const freq = (i / this.frequencyData.length) * nyquist;
      const amplitude = Math.pow(10, this.frequencyData[i] / 20);

      if (freq < 250) {
        bands.bass += amplitude;
        counts.bass++;
      } else if (freq < 4000) {
        bands.mid += amplitude;
        counts.mid++;
      } else if (freq < 12000) {
        bands.treble += amplitude;
        counts.treble++;
      }
    }

    this.spectralBalance = {
      bass: this.safeDivide(bands.bass, counts.bass),
      mid: this.safeDivide(bands.mid, counts.mid),
      treble: this.safeDivide(bands.treble, counts.treble),
    };

    return this.spectralBalance;
  }

  generateAdaptiveEQ(frequencies, isAdvanced = false) {
    this.analyzer.getFloatFrequencyData(this.frequencyData);
    this.analyzer.getFloatTimeDomainData(this.timeData);

    this.analyzeContentType();
    this.analyzeSpectralBalance();
    const loudness = this.calculateLoudness();

    this.history.loudness.push(loudness);
    if (this.history.loudness.length > 10) {
      this.history.loudness.shift();
    }

    const avgLoudness = this.history.loudness.reduce((a, b) => a + b, 0) / this.history.loudness.length;

    this.updateAdaptiveParams(avgLoudness);

    const adjustments = frequencies.map((freq) => {
      let gain = 0;

      const band = this.getFrequencyBand(freq);
      if (!band) return 0;

      const loudnessError = REALTIME_CONFIG.targetLoudness - avgLoudness;
      const loudnessCorrection = this.calculateLoudnessCorrection(freq, loudnessError);
      const balanceCorrection = this.calculateBalanceCorrection(freq, band);
      const clarityBoost = this.calculateClarityEnhancement(freq);
      const contentAdjustment = this.getContentSpecificAdjustment(freq);

      gain = loudnessCorrection + balanceCorrection + clarityBoost + contentAdjustment;
      gain = this.applyFrequencyLimits(freq, gain, isAdvanced);

      if (this.history.gains) {
        const index = frequencies.indexOf(freq);
        const previousGain = this.history.gains[index] || 0;
        gain = previousGain * REALTIME_CONFIG.smoothingFactor + gain * (1 - REALTIME_CONFIG.smoothingFactor);
      }

      return Math.round(gain * 10) / 10;
    });

    this.history.gains = adjustments;
    return adjustments;
  }

  updateAdaptiveParams(avgLoudness) {
    const rate = REALTIME_CONFIG.adaptiveSpeed;

    if (this.contentType === 'speech') {
      this.adaptiveParams.bassControl *= (1 - rate);
      this.adaptiveParams.bassControl += 0.5 * rate;
    } else if (this.spectralBalance.bass > this.spectralBalance.mid * 2) {
      this.adaptiveParams.bassControl *= (1 - rate);
      this.adaptiveParams.bassControl += 0.7 * rate;
    } else {
      this.adaptiveParams.bassControl *= (1 - rate);
      this.adaptiveParams.bassControl += 1.0 * rate;
    }

    if (this.contentType === 'speech' || this.contentType === 'mixed') {
      this.adaptiveParams.clarityEnhancement = Math.min(2, this.adaptiveParams.clarityEnhancement + rate);
    } else {
      this.adaptiveParams.clarityEnhancement = Math.max(0, this.adaptiveParams.clarityEnhancement - rate);
    }
  }

  calculateLoudnessCorrection(freq, loudnessError) {
    if (Math.abs(loudnessError) < 2) return 0;

    let correction = 0;
    if (freq < 100) {
      correction = loudnessError * 0.1;
    } else if (freq < 1000) {
      correction = loudnessError * 0.3;
    } else if (freq < 4000) {
      correction = loudnessError * 0.4;
    } else {
      correction = loudnessError * 0.2;
    }

    return Math.max(-3, Math.min(3, correction));
  }

  calculateBalanceCorrection(freq, band) {
    const balance = this.spectralBalance;
    const avgLevel = (balance.bass + balance.mid + balance.treble) / 3;

    let correction = 0;

    if (band === 'bass' && balance.bass > avgLevel * 1.5) {
      correction = -1 * this.adaptiveParams.bassControl;
    } else if (band === 'mid' && balance.mid < avgLevel * 0.8) {
      correction = 1 * this.adaptiveParams.midControl;
    } else if (band === 'treble' && balance.treble < avgLevel * 0.7) {
      correction = 0.5 * this.adaptiveParams.trebleControl;
    }

    return correction;
  }

  calculateClarityEnhancement(freq) {
    if (this.adaptiveParams.clarityEnhancement === 0) return 0;

    if (freq >= 1000 && freq <= 4000) {
      return this.adaptiveParams.clarityEnhancement * 0.5;
    } else if (freq >= 4000 && freq <= 8000) {
      return this.adaptiveParams.clarityEnhancement * 0.3;
    }

    return 0;
  }

  getContentSpecificAdjustment(freq) {
    switch (this.contentType) {
      case 'speech':
        if (freq < 80) return -2;
        if (freq >= 200 && freq <= 500) return -1;
        if (freq >= 2000 && freq <= 4000) return 1;
        break;

      case 'music':
        if (freq >= 40 && freq <= 80) return 0.5;
        if (freq >= 10000) return 0.5;
        break;
    }

    return 0;
  }

  applyFrequencyLimits(freq, gain, isAdvanced) {
    const limits = isAdvanced ?
    { min: REALTIME_CONFIG.maxCut, max: REALTIME_CONFIG.maxBoost } :
    { min: REALTIME_CONFIG.maxCut * 0.7, max: REALTIME_CONFIG.maxBoost * 0.7 };

    if (freq < 40) {
      return Math.max(limits.min * 0.5, Math.min(1, gain));
    } else if (freq < 100) {
      return Math.max(limits.min * 0.7, Math.min(2, gain));
    } else if (freq > 10000) {
      return Math.max(limits.min, Math.min(3, gain));
    }

    return Math.max(limits.min, Math.min(limits.max, gain));
  }

  getFrequencyBand(freq) {
    if (freq < 250) return 'bass';
    if (freq < 4000) return 'mid';
    if (freq < 12000) return 'treble';
    return 'ultra-high';
  }
}

/* ───────────────────────────────────────────────
 S TATIC AUDIO ANALYZER                                       *
 ─────────────────────────────────────────────── */
class AudioAnalyzer {
  static async analyzeAudio(audioBlob, audioCtx) {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;

      const bands = this.analyzeBands(channelData, sampleRate);
      const characteristics = this.detectCharacteristics(bands);
      const waveform = this.generateWaveform(audioBuffer);

      return {
        bands,
        characteristics,
        duration: audioBuffer.duration,
        sampleRate,
        waveform,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error analyzing audio:', error);
      return null;
    }
  }

  static analyzeBands(channelData, sampleRate) {
    const bands = {};

    FREQUENCY_BANDS.forEach(band => {
      bands[band.name] = {
        average: 0,
        peak: 0,
        energy: 0,
      };
    });

    const blockSize = 2048;
    const blocks = Math.floor(channelData.length / blockSize);

    for (let i = 0; i < blocks; i++) {
      const start = i * blockSize;
      const block = channelData.slice(start, start + blockSize);

      const energy = block.reduce((sum, sample) => sum + sample * sample, 0) / blockSize;

      Object.values(bands).forEach(band => {
        band.energy += energy / bands.length;
      });
    }

    return bands;
  }

  static detectCharacteristics(bands) {
    const totalEnergy = Object.values(bands).reduce((sum, band) => sum + band.energy, 0);

    return {
      balanced: true,
      needsBassReduction: bands['sub-bass']?.energy > totalEnergy * 0.3,
      needsClarityBoost: bands['mids']?.energy < totalEnergy * 0.2,
      needsPresenceBoost: bands['presence']?.energy < totalEnergy * 0.1,
    };
  }

  static generateWaveform(audioBuffer, samples = 1000) {
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const waveform = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);

      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += Math.abs(channelData[j]);
      }

      waveform[i] = sum / (end - start);
    }

    return waveform;
  }

  static generateEQCurve(analysis, frequencies, isAdvanced = false) {
    if (!analysis) return frequencies.map(() => 0);

    const { characteristics } = analysis;
    const curve = frequencies.map(freq => {
      let adjustment = 0;

      if (characteristics.needsBassReduction && freq < 100) {
        adjustment = -2;
      } else if (characteristics.needsClarityBoost && freq >= 1000 && freq <= 4000) {
        adjustment = 1.5;
      } else if (characteristics.needsPresenceBoost && freq >= 4000 && freq <= 8000) {
        adjustment = 1;
      }

      return adjustment;
    });

    return curve;
  }
}

/* ───────────────────────────────────────────────
 A UDIO NODE MANAGER - Single Context Management              *
 ─────────────────────────────────────────────── */
class AudioNodeManager {
  constructor() {
    this.audioContext = null;
    this.nodes = {
      source: null,
      gain: null,
      analyzer: null,
      compressor: null,
      standardFilters: null,
      advancedFilters: null,
    };
    this.currentMode = 'standard';
    this.isConnected = false;
  }

  async initialize(volume = 1, eqGains = null, advancedEqGains = null) {
    // Only create context once
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Create nodes only if they don't exist
    if (!this.nodes.gain) {
      this.nodes.gain = this.audioContext.createGain();
      this.nodes.gain.gain.value = volume;
    }

    if (!this.nodes.analyzer) {
      this.nodes.analyzer = this.audioContext.createAnalyser();
      this.nodes.analyzer.fftSize = REALTIME_CONFIG.frequencyResolution;
      this.nodes.analyzer.smoothingTimeConstant = 0.8;
    }

    if (!this.nodes.compressor) {
      this.nodes.compressor = this.audioContext.createDynamicsCompressor();
      this.nodes.compressor.threshold.value = -12;
      this.nodes.compressor.knee.value = 20;
      this.nodes.compressor.ratio.value = 3;
      this.nodes.compressor.attack.value = 0.005;
      this.nodes.compressor.release.value = 0.1;
    }

    // Create filters only if they don't exist
    if (!this.nodes.standardFilters) {
      this.nodes.standardFilters = STANDARD_FREQUENCIES.map((freq, index) => {
        const filter = this.audioContext.createBiquadFilter();
        if (freq === 60) {
          filter.type = 'highshelf';
          filter.frequency.value = 80;
        } else if (freq === 14000) {
          filter.type = 'highshelf';
          filter.frequency.value = 10000;
        } else {
          filter.type = 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1.5;
        }
        filter.gain.value = eqGains?.[index] || 0;
        return filter;
      });
    }

    if (!this.nodes.advancedFilters) {
      this.nodes.advancedFilters = ADVANCED_FREQUENCIES.map((freq, index) => {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = freq < 100 ? 0.7 : freq < 1000 ? 1.2 : 2.0;
        filter.gain.value = advancedEqGains?.[index] || 0;
        return filter;
      });
    }

    return this.audioContext;
  }

  createSourceForElement(audioElement) {
    // Only create source if it doesn't exist or is for a different element
    if (!this.nodes.source || this.nodes.source.mediaElement !== audioElement) {
      if (this.nodes.source) {
        this.disconnect();
      }
      this.nodes.source = this.audioContext.createMediaElementSource(audioElement);
    }
    return this.nodes.source;
  }

  connect(mode = 'standard') {
    if (!this.nodes.source || this.isConnected) return;

    this.disconnect();

    const filters = mode === 'advanced' ? this.nodes.advancedFilters : this.nodes.standardFilters;
    this.currentMode = mode;

    // Build connection chain
    let lastNode = this.nodes.source;

    // Connect through filters
    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        lastNode.connect(filter);
        lastNode = filter;
      });
    }

    // Connect through compressor and gain
    lastNode.connect(this.nodes.compressor);
    this.nodes.compressor.connect(this.nodes.gain);
    this.nodes.gain.connect(this.nodes.analyzer);
    this.nodes.analyzer.connect(this.audioContext.destination);

    this.isConnected = true;
  }

  disconnect() {
    if (!this.isConnected) return;

    try {
      // Disconnect all nodes safely
      const disconnectNode = (node) => {
        if (node && node.numberOfOutputs > 0) {
          try {
            node.disconnect();
          } catch (e) {
            // Ignore disconnect errors
          }
        }
      };

      disconnectNode(this.nodes.source);
      this.nodes.standardFilters?.forEach(disconnectNode);
      this.nodes.advancedFilters?.forEach(disconnectNode);
      disconnectNode(this.nodes.compressor);
      disconnectNode(this.nodes.gain);
      disconnectNode(this.nodes.analyzer);

      this.isConnected = false;
    } catch (e) {
      console.error('Error disconnecting nodes:', e);
    }
  }

  updateFilterGain(mode, index, value) {
    const filters = mode === 'advanced' ? this.nodes.advancedFilters : this.nodes.standardFilters;
    if (filters && filters[index]) {
      filters[index].gain.setValueAtTime(value, this.audioContext.currentTime);
    }
  }

  updateVolume(value) {
    if (this.nodes.gain) {
      this.nodes.gain.gain.setValueAtTime(value, this.audioContext.currentTime);
    }
  }

  getContext() {
    return this.audioContext;
  }

  getAnalyzer() {
    return this.nodes.analyzer;
  }
}

/* ───────────────────────────────────────────────
 M AIN AUDIO CONTEXT                                          *
 ─────────────────────────────────────────────── */
const AudioContextData = createContext(null);

export const AudioProvider = ({ children }) => {
  // Single instance of node manager
  const nodeManagerRef = useRef(null);
  const audioRef = useRef(null);
  const intelligentAnalyzerRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  const visualizerIntervalRef = useRef(null);
  const currentBlobUrlRef = useRef(null);

  // Initialize node manager once
  useEffect(() => {
    if (!nodeManagerRef.current) {
      nodeManagerRef.current = new AudioNodeManager();
    }
  }, []);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  // EQ state
  const [eqMode, setEqMode] = useState(() =>
  localStorage.getItem('eq-mode') || 'standard'
  );

  const [eqGains, setEqGains] = useState(() => {
    try {
      const saved = localStorage.getItem('eq-gains');
      return saved ? JSON.parse(saved) : STANDARD_FREQUENCIES.map(() => 0);
    } catch {
      return STANDARD_FREQUENCIES.map(() => 0);
    }
  });

  const [advancedEqGains, setAdvancedEqGains] = useState(() => {
    try {
      const saved = localStorage.getItem('advanced-eq-gains');
      return saved ? JSON.parse(saved) : ADVANCED_FREQUENCIES.map(() => 0);
    } catch {
      return ADVANCED_FREQUENCIES.map(() => 0);
    }
  });

  // EQSmart state
  const [eqSmartEnabled, setEqSmartEnabled] = useState(() =>
  localStorage.getItem('eq-smart-enabled') === 'true'
  );
  const [eqSmartProcessing, setEqSmartProcessing] = useState(false);
  const [eqSmartSuggestions, setEqSmartSuggestions] = useState({
    standard: STANDARD_FREQUENCIES.map(() => 0),
                                                               advanced: ADVANCED_FREQUENCIES.map(() => 0),
  });
  const [dynamicEqEnabled, setDynamicEqEnabled] = useState(() =>
  localStorage.getItem('dynamic-eq-enabled') === 'true'
  );
  const [realtimeAnalysisData, setRealtimeAnalysisData] = useState(null);

  // UI state
  const [targetEqGains, setTargetEqGains] = useState([...eqGains]);
  const [targetAdvancedEqGains, setTargetAdvancedEqGains] = useState([...advancedEqGains]);
  const [isDraggingEQ, setIsDraggingEQ] = useState(false);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(() =>
  parseFloat(localStorage.getItem('volume')) || 1
  );
  const [buffering, setBuffering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Queue state
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueHistory, setQueueHistory] = useState([]);
  const [shuffle, setShuffle] = useState(() =>
  localStorage.getItem('shuffle') === 'true'
  );
  const [repeat, setRepeat] = useState(() =>
  localStorage.getItem('repeat') || 'none'
  );

  // Network state
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
  const [offlineMode, setOfflineMode] = useState(false);

  // Visualizer state
  const [visualizerData, setVisualizerData] = useState(null);

  /* ───────────────────────────────────────────────
   C ore Audio Functions                                      *
   ─────────────────────────────────────────────── */

  const initializeAudio = useCallback(async () => {
    if (!nodeManagerRef.current) return null;

    const ctx = await nodeManagerRef.current.initialize(volume, eqGains, advancedEqGains);

    // Create intelligent analyzer if needed
    if (!intelligentAnalyzerRef.current && nodeManagerRef.current.getAnalyzer()) {
      intelligentAnalyzerRef.current = new IntelligentAudioAnalyzer(
        ctx,
        nodeManagerRef.current.getAnalyzer()
      );
    }

    return ctx;
  }, [volume, eqGains, advancedEqGains]);

  const connectAudioNodes = useCallback(() => {
    if (!nodeManagerRef.current || !audioRef.current.src) return;

    nodeManagerRef.current.connect(eqMode);
  }, [eqMode]);

  /* ───────────────────────────────────────────────
   E Q Control Functions                                      *
   ─────────────────────────────────────────────── */

  const applyRealtimeEQ = useCallback((adjustments) => {
    if (!nodeManagerRef.current || isDraggingEQ) return;

    const validAdjustments = adjustments.map((adj) => {
      if (typeof adj !== 'number' || !isFinite(adj)) return 0;
      return Math.max(-12, Math.min(12, adj));
    });

    validAdjustments.forEach((adjustment, index) => {
      nodeManagerRef.current.updateFilterGain(eqMode, index, adjustment);
    });

    if (eqMode === 'advanced') {
      setAdvancedEqGains(validAdjustments);
      setTargetAdvancedEqGains(validAdjustments);
    } else {
      setEqGains(validAdjustments);
      setTargetEqGains(validAdjustments);
    }
  }, [eqMode, isDraggingEQ]);

  const startIntelligentAnalysis = useCallback(() => {
    if (!intelligentAnalyzerRef.current || !eqSmartEnabled || !dynamicEqEnabled) return;

    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }

    analysisIntervalRef.current = setInterval(() => {
      if (!isDraggingEQ && isPlaying) {
        const frequencies = eqMode === 'advanced' ? ADVANCED_FREQUENCIES : STANDARD_FREQUENCIES;
        const adjustments = intelligentAnalyzerRef.current.generateAdaptiveEQ(
          frequencies,
          eqMode === 'advanced'
        );

        applyRealtimeEQ(adjustments);

        setRealtimeAnalysisData({
          adjustments,
          contentType: intelligentAnalyzerRef.current.contentType,
          spectralBalance: intelligentAnalyzerRef.current.spectralBalance,
          timestamp: Date.now(),
        });
      }
    }, REALTIME_CONFIG.analysisInterval);
  }, [eqSmartEnabled, dynamicEqEnabled, eqMode, isDraggingEQ, isPlaying, applyRealtimeEQ]);

  const stopIntelligentAnalysis = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
  }, []);

  const setEqGain = useCallback((index, value) => {
    const clampedValue = Math.max(-12, Math.min(12, value));

    if (eqMode === 'standard') {
      setEqGains((prev) => {
        const newGains = [...prev];
        newGains[index] = clampedValue;
        return newGains;
      });

      nodeManagerRef.current?.updateFilterGain('standard', index, clampedValue);
    }
  }, [eqMode]);

  const setAdvancedEqGain = useCallback((index, value) => {
    const clampedValue = Math.max(-12, Math.min(12, value));

    if (eqMode === 'advanced') {
      setAdvancedEqGains((prev) => {
        const newGains = [...prev];
        newGains[index] = clampedValue;
        return newGains;
      });

      nodeManagerRef.current?.updateFilterGain('advanced', index, clampedValue);
    }
  }, [eqMode]);

  const resetEq = useCallback((mode = null) => {
    const targetMode = mode || eqMode;

    stopIntelligentAnalysis();

    if (targetMode === 'advanced') {
      const zeros = ADVANCED_FREQUENCIES.map(() => 0);
      setAdvancedEqGains(zeros);
      setTargetAdvancedEqGains(zeros);

      zeros.forEach((_, index) => {
        nodeManagerRef.current?.updateFilterGain('advanced', index, 0);
      });
    } else {
      const zeros = STANDARD_FREQUENCIES.map(() => 0);
      setEqGains(zeros);
      setTargetEqGains(zeros);

      zeros.forEach((_, index) => {
        nodeManagerRef.current?.updateFilterGain('standard', index, 0);
      });
    }

    if (eqSmartEnabled && dynamicEqEnabled && isPlaying) {
      setTimeout(startIntelligentAnalysis, 100);
    }
  }, [eqMode, stopIntelligentAnalysis, startIntelligentAnalysis, eqSmartEnabled, dynamicEqEnabled, isPlaying]);

  const applyEqPreset = useCallback((preset) => {
    if (!preset?.values) return;

    stopIntelligentAnalysis();

    if (eqMode === 'advanced' && preset.values.length === ADVANCED_FREQUENCIES.length) {
      preset.values.forEach((value, index) => {
        setAdvancedEqGain(index, value);
      });
    } else if (eqMode === 'standard' && preset.values.length === STANDARD_FREQUENCIES.length) {
      preset.values.forEach((value, index) => {
        setEqGain(index, value);
      });
    }

    if (eqSmartEnabled && dynamicEqEnabled && isPlaying) {
      setTimeout(startIntelligentAnalysis, 100);
    }
  }, [eqMode, setEqGain, setAdvancedEqGain, stopIntelligentAnalysis, startIntelligentAnalysis, eqSmartEnabled, dynamicEqEnabled, isPlaying]);

  /* ───────────────────────────────────────────────
   T rack Analysis                                            *
   ─────────────────────────────────────────────── */

  const analyzeCurrentTrack = useCallback(async (trackId) => {
    if (!trackId) return null;

    try {
      const cached = await cacheInstance.get('audio-analysis', trackId);
      if (cached && !cacheInstance.isStale(cached.timestamp, CACHE_CONFIG.longTerm)) {
        return cached;
      }

      const audioFile = await cacheInstance.get('audio-files', trackId);
      if (!audioFile?.blob) {
        console.log('No cached audio for analysis');
        return null;
      }

      await initializeAudio();
      const ctx = nodeManagerRef.current?.getContext();
      if (!ctx) return null;

      const analysis = await AudioAnalyzer.analyzeAudio(audioFile.blob, ctx);

      if (analysis) {
        await cacheInstance.put('audio-analysis', { trackId, ...analysis });
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing track:', error);
      return null;
    }
  }, [initializeAudio]);

  const applyEqSmartSettings = useCallback(async (trackId) => {
    if (!trackId || !eqSmartEnabled) return false;

    try {
      setEqSmartProcessing(true);

      const analysis = await analyzeCurrentTrack(trackId);
      if (!analysis) {
        setEqSmartProcessing(false);
        return false;
      }

      const standardCurve = AudioAnalyzer.generateEQCurve(
        analysis,
        STANDARD_FREQUENCIES,
        false
      );
      const advancedCurve = AudioAnalyzer.generateEQCurve(
        analysis,
        ADVANCED_FREQUENCIES,
        true
      );

      setEqSmartSuggestions({
        standard: standardCurve,
        advanced: advancedCurve,
      });

      if (eqSmartEnabled && !dynamicEqEnabled) {
        if (eqMode === 'advanced') {
          advancedCurve.forEach((value, index) => {
            setAdvancedEqGain(index, value);
          });
        } else {
          standardCurve.forEach((value, index) => {
            setEqGain(index, value);
          });
        }
      }

      setEqSmartProcessing(false);

      if (dynamicEqEnabled && isPlaying) {
        startIntelligentAnalysis();
      }

      return true;
    } catch (error) {
      console.error('Error applying EQSmart:', error);
      setEqSmartProcessing(false);
      return false;
    }
  }, [
    eqSmartEnabled,
    dynamicEqEnabled,
    analyzeCurrentTrack,
    eqMode,
    isPlaying,
    setEqGain,
    setAdvancedEqGain,
    startIntelligentAnalysis
  ]);

  /* ───────────────────────────────────────────────
   P layback Functions                                        *
   ─────────────────────────────────────────────── */

  const playTrack = useCallback(async (track, addToQueueFlag = true) => {
    if (!track?.id) {
      setError('Invalid track data');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      stopIntelligentAnalysis();

      const token = localStorage.getItem('token');
      if (!token && !offlineMode && networkStatus) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }

      // Initialize audio context
      await initializeAudio();

      // Toggle play/pause for same track
      if (currentTrack?.id === track.id && audioRef.current.src && nodeManagerRef.current?.isConnected) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
          stopIntelligentAnalysis();
        } else {
          await audioRef.current.play();
          setIsPlaying(true);
          if (eqSmartEnabled && dynamicEqEnabled) {
            startIntelligentAnalysis();
          }
        }
        setLoading(false);
        return;
      }

      // Clean up previous audio
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }

      if (audioRef.current.src) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Get track info
      let trackInfo = track;
      const cachedTrack = await cacheInstance.get('tracks', track.id);

      if (cachedTrack && !cacheInstance.isStale(cachedTrack.cachedAt)) {
        trackInfo = cachedTrack;
      } else if (networkStatus && !offlineMode) {
        try {
          const response = await MusicAPI.getTrack(track.id);
          trackInfo = response.data;
          await cacheInstance.put('tracks', trackInfo);
        } catch (err) {
          if (cachedTrack) {
            trackInfo = cachedTrack;
          } else {
            throw err;
          }
        }
      } else if (!cachedTrack) {
        throw new Error('Track not available offline');
      }

      // Load audio
      const audio = audioRef.current;
      let audioUrl;

      const cachedAudio = await cacheInstance.get('audio-files', trackInfo.id);

      if (cachedAudio?.blob) {
        audioUrl = URL.createObjectURL(cachedAudio.blob);
        currentBlobUrlRef.current = audioUrl;
      } else if (networkStatus && !offlineMode) {
        try {
          const streamInfo = MusicAPI.streamTrack(trackInfo.id);

          if (!streamInfo.url) {
            throw new Error('No stream URL provided');
          }

          // Fetch with auth headers
          const response = await fetch(streamInfo.url, {
            headers: streamInfo.headers
          });

          if (!response.ok) {
            throw new Error(`Failed to load audio: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();
          audioUrl = URL.createObjectURL(blob);
          currentBlobUrlRef.current = audioUrl;

          // Cache the blob
          cacheInstance.put('audio-files', { id: trackInfo.id, blob })
          .catch(err => console.error('Cache error:', err));

        } catch (err) {
          console.error('Error loading audio:', err);
          throw new Error(err.message || 'Failed to get audio stream');
        }
      } else {
        throw new Error('Audio not available offline');
      }

      // Set audio source
      audio.src = audioUrl;
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';

      // Create source node
      nodeManagerRef.current.createSourceForElement(audio);

      // Load the audio
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Audio loading timeout'));
        }, 30000);

        const cleanup = () => {
          clearTimeout(timeout);
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('error', onError);
        };

        const onCanPlay = () => {
          cleanup();
          resolve();
        };

        const onError = (e) => {
          cleanup();
          console.error('Audio load error event:', e);
          const errorMessage = audio.error?.message || 'Failed to load audio';
          reject(new Error(errorMessage));
        };

        audio.addEventListener('canplaythrough', onCanPlay, { once: true });
        audio.addEventListener('error', onError, { once: true });

        audio.load();
      });

      // Connect audio nodes
      connectAudioNodes();

      setDuration(audio.duration || 0);
      setCurrentTrack(trackInfo);

      // Update queue
      if (addToQueueFlag) {
        if (currentTrack) {
          setQueueHistory(prev => [...prev, currentTrack]);
        }
        setQueue(prev => {
          const newQueue = [...prev];
          if (!newQueue.find(t => t.id === trackInfo.id)) {
            newQueue.push(trackInfo);
          }
          return newQueue;
        });
        setQueueIndex(queue.length);
      }

      // Start playback
      await audio.play();
      setIsPlaying(true);
      setLoading(false);

      // Apply EQSmart
      if (eqSmartEnabled) {
        applyEqSmartSettings(trackInfo.id);
      }

      // Update play count
      if (networkStatus && MusicAPI.updatePlayCount) {
        MusicAPI.updatePlayCount(trackInfo.id).catch(console.error);
      }

      // Start visualizer
      startVisualizer();

    } catch (error) {
      console.error('Playback error:', error);
      setError(error.message || 'Failed to play track');
      setLoading(false);
      setIsPlaying(false);

      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
    }
  }, [
    currentTrack,
    isPlaying,
    networkStatus,
    offlineMode,
    queue,
    eqSmartEnabled,
    dynamicEqEnabled,
    initializeAudio,
    connectAudioNodes,
    applyEqSmartSettings,
    stopIntelligentAnalysis,
    startIntelligentAnalysis,
  ]);

  const togglePlay = useCallback(async () => {
    if (!currentTrack || !audioRef.current.src) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        stopVisualizer();
        stopIntelligentAnalysis();
      } else {
        const ctx = nodeManagerRef.current?.getContext();
        if (ctx?.state === 'suspended') {
          await ctx.resume();
        }
        await audioRef.current.play();
        setIsPlaying(true);
        startVisualizer();
        if (eqSmartEnabled && dynamicEqEnabled) {
          startIntelligentAnalysis();
        }
      }
    } catch (error) {
      console.error('Toggle play error:', error);
      setError('Playback error');
    }
  }, [currentTrack, isPlaying, eqSmartEnabled, dynamicEqEnabled, startIntelligentAnalysis, stopIntelligentAnalysis]);

  const seek = useCallback((time) => {
    if (!audioRef.current) return;
    const clampedTime = Math.max(0, Math.min(time, duration));
    audioRef.current.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, [duration]);

  const setAudioVolume = useCallback((value) => {
    const clampedVolume = Math.max(0, Math.min(1, value));
    setVolume(clampedVolume);

    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }

    nodeManagerRef.current?.updateVolume(clampedVolume);

    localStorage.setItem('volume', clampedVolume.toString());
  }, []);

  /* ───────────────────────────────────────────────
   Q ueue Management                                          *
   ─────────────────────────────────────────────── */

  const addToQueue = useCallback((tracks, playImmediately = false) => {
    const tracksArray = Array.isArray(tracks) ? tracks : [tracks];

    setQueue((prev) => {
      const newQueue = [...prev];
      tracksArray.forEach((track) => {
        if (!newQueue.find(t => t.id === track.id)) {
          newQueue.push(track);
        }
      });
      return newQueue;
    });

    if (playImmediately && tracksArray.length > 0) {
      playTrack(tracksArray[0], false);
    }
  }, [playTrack]);

  const removeFromQueue = useCallback((index) => {
    if (index < 0 || index >= queue.length) return;

    setQueue((prev) => {
      const newQueue = [...prev];
      newQueue.splice(index, 1);
      return newQueue;
    });

    if (index < queueIndex) {
      setQueueIndex((prev) => Math.max(0, prev - 1));
    } else if (index === queueIndex && queue.length > 1) {
      const nextIndex = Math.min(index, queue.length - 2);
      setQueueIndex(nextIndex);
      if (queue[nextIndex]) {
        playTrack(queue[nextIndex], false);
      }
    }
  }, [queue, queueIndex, playTrack]);

  const playNext = useCallback(() => {
    if (!queue.length) return;

    let nextIndex;

    if (shuffle) {
      const availableIndices = queue
      .map((_, index) => index)
      .filter(index => index !== queueIndex);

      if (availableIndices.length === 0) {
        nextIndex = 0;
      } else {
        nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      }
    } else {
      nextIndex = (queueIndex + 1) % queue.length;
    }

    setQueueIndex(nextIndex);
    playTrack(queue[nextIndex], false);
  }, [queue, queueIndex, shuffle, playTrack]);

  const playPrevious = useCallback(() => {
    if (!queue.length) return;

    if (currentTime > 3) {
      seek(0);
      return;
    }

    if (queueHistory.length > 0) {
      const previousTrack = queueHistory[queueHistory.length - 1];
      setQueueHistory(prev => prev.slice(0, -1));
      playTrack(previousTrack, false);
      return;
    }

    let prevIndex;

    if (shuffle) {
      prevIndex = Math.floor(Math.random() * queue.length);
    } else {
      prevIndex = queueIndex === 0 ? queue.length - 1 : queueIndex - 1;
    }

    setQueueIndex(prevIndex);
    playTrack(queue[prevIndex], false);
  }, [queue, queueIndex, queueHistory, currentTime, shuffle, playTrack, seek]);

  /* ───────────────────────────────────────────────
   V isualizer                                                *
   ─────────────────────────────────────────────── */

  const startVisualizer = useCallback(() => {
    const analyzer = nodeManagerRef.current?.getAnalyzer();
    if (!analyzer || visualizerIntervalRef.current) return;

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);

    visualizerIntervalRef.current = setInterval(() => {
      analyzer.getByteFrequencyData(dataArray);

      const ctx = nodeManagerRef.current?.getContext();
      const sampleRate = ctx?.sampleRate || 44100;

      const bandData = FREQUENCY_BANDS.map((band) => {
        const nyquist = sampleRate / 2;
        const startIndex = Math.floor((band.min / nyquist) * dataArray.length);
        const endIndex = Math.floor((band.max / nyquist) * dataArray.length);

        let sum = 0;
        let count = 0;

        for (let i = startIndex; i <= endIndex && i < dataArray.length; i++) {
          sum += dataArray[i];
          count++;
        }

        return {
          name: band.name,
          value: count > 0 ? sum / count / 255 : 0,
          color: band.color,
        };
      });

      setVisualizerData({
        frequency: Array.from(dataArray),
                        bands: bandData,
                        timestamp: Date.now(),
      });
    }, 50);
  }, []);

  const stopVisualizer = useCallback(() => {
    if (visualizerIntervalRef.current) {
      clearInterval(visualizerIntervalRef.current);
      visualizerIntervalRef.current = null;
    }
  }, []);

  /* ───────────────────────────────────────────────
   E ffects & Event Handlers                                  *
   ─────────────────────────────────────────────── */

  // Resume audio context on user interaction
  useEffect(() => {
    const resumeContext = async () => {
      const ctx = nodeManagerRef.current?.getContext();
      if (ctx && ctx.state === 'suspended') {
        try {
          await ctx.resume();
          console.log('Audio context resumed');
        } catch (e) {
          console.error('Failed to resume audio context:', e);
        }
      }
    };

    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, resumeContext, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resumeContext);
      });
    };
  }, []);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlers = {
      loadstart: () => {
        console.log('Audio load started');
        setBuffering(true);
      },
      loadeddata: () => {
        console.log('Audio data loaded');
        setBuffering(false);
      },
      canplay: () => {
        console.log('Audio can play');
        setBuffering(false);
      },
      timeupdate: () => setCurrentTime(audio.currentTime),
            durationchange: () => {
              if (isFinite(audio.duration)) {
                setDuration(audio.duration);
              }
            },
            ended: () => {
              setIsPlaying(false);
              stopVisualizer();
              stopIntelligentAnalysis();

              if (repeat === 'one') {
                audio.currentTime = 0;
                audio.play().catch(console.error);
              } else if (repeat === 'all' || queueIndex < queue.length - 1) {
                playNext();
              }
            },
            error: (e) => {

              const errorMessage = audio.error?.message || 'Unknown playback error';
  console.error('Audio error details:', {
    code: audio.error?.code,
    message: errorMessage,
    networkState: audio.networkState,
    readyState: audio.readyState,
    src: audio.src
  });


  setIsPlaying(false);
  setBuffering(false);
  stopVisualizer();
  stopIntelligentAnalysis();
            },
            waiting: () => setBuffering(true),
            playing: () => {
              setBuffering(false);
              setIsPlaying(true);
            },
            pause: () => {
              setIsPlaying(false);
            },
            stalled: () => {
              console.log('Audio stalled');
              setBuffering(true);
            },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      audio.addEventListener(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        audio.removeEventListener(event, handler);
      });
    };
  }, [repeat, queue.length, queueIndex, playNext, stopVisualizer, stopIntelligentAnalysis]);

  // Network status
  useEffect(() => {
    const handleOnline = () => setNetworkStatus(true);
    const handleOffline = () => setNetworkStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('eq-mode', eqMode);
  }, [eqMode]);

  useEffect(() => {
    localStorage.setItem('eq-gains', JSON.stringify(eqGains));
  }, [eqGains]);

  useEffect(() => {
    localStorage.setItem('advanced-eq-gains', JSON.stringify(advancedEqGains));
  }, [advancedEqGains]);

  useEffect(() => {
    localStorage.setItem('eq-smart-enabled', eqSmartEnabled.toString());
  }, [eqSmartEnabled]);

  useEffect(() => {
    localStorage.setItem('dynamic-eq-enabled', dynamicEqEnabled.toString());
  }, [dynamicEqEnabled]);

  useEffect(() => {
    localStorage.setItem('shuffle', shuffle.toString());
  }, [shuffle]);

  useEffect(() => {
    localStorage.setItem('repeat', repeat);
  }, [repeat]);

  // Update filters when gains change (manual mode)
  useEffect(() => {
    if (!nodeManagerRef.current || (eqSmartEnabled && dynamicEqEnabled)) return;

    if (eqMode === 'standard') {
      eqGains.forEach((gain, index) => {
        nodeManagerRef.current.updateFilterGain('standard', index, gain);
      });
    }
  }, [eqGains, eqMode, eqSmartEnabled, dynamicEqEnabled]);

  useEffect(() => {
    if (!nodeManagerRef.current || (eqSmartEnabled && dynamicEqEnabled)) return;

    if (eqMode === 'advanced') {
      advancedEqGains.forEach((gain, index) => {
        nodeManagerRef.current.updateFilterGain('advanced', index, gain);
      });
    }
  }, [advancedEqGains, eqMode, eqSmartEnabled, dynamicEqEnabled]);

  // Reconnect nodes when EQ mode changes
  useEffect(() => {
    if (nodeManagerRef.current && audioRef.current.src && nodeManagerRef.current.isConnected) {
      // Disconnect and reconnect with new mode
      nodeManagerRef.current.disconnect();
      nodeManagerRef.current.connect(eqMode);
    }
  }, [eqMode]);

  // Start/stop intelligent analysis
  useEffect(() => {
    if (eqSmartEnabled && dynamicEqEnabled && isPlaying && !isDraggingEQ) {
      startIntelligentAnalysis();
    } else {
      stopIntelligentAnalysis();
    }

    return () => {
      stopIntelligentAnalysis();
    };
  }, [eqSmartEnabled, dynamicEqEnabled, isPlaying, isDraggingEQ, startIntelligentAnalysis, stopIntelligentAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVisualizer();
      stopIntelligentAnalysis();

      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      }

      const ctx = nodeManagerRef.current?.getContext();
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(console.error);
      }
    };
  }, [stopVisualizer, stopIntelligentAnalysis]);

  /* ───────────────────────────────────────────────
   C ontext Value            *
   ─────────────────────────────────────────────── */

  const contextValue = useMemo(() => ({
    // Audio nodes
    audioContext: nodeManagerRef.current?.getContext(),
                                      analyzerNode: nodeManagerRef.current?.getAnalyzer(),

                                      // EQ state
                                      eqMode,
                                      setEqMode: (mode) => {
                                        setEqMode(mode);
                                        // Force reconnection when switching modes
                                        if (nodeManagerRef.current && audioRef.current.src && nodeManagerRef.current.isConnected) {
                                          nodeManagerRef.current.disconnect();
                                          nodeManagerRef.current.connect(mode);
                                        }
                                      },
                                      toggleEqMode: () => {
                                        const newMode = eqMode === 'standard' ? 'advanced' : 'standard';
                                        setEqMode(newMode);
                                        // Force reconnection when toggling modes
                                        if (nodeManagerRef.current && audioRef.current.src && nodeManagerRef.current.isConnected) {
                                          nodeManagerRef.current.disconnect();
                                          nodeManagerRef.current.connect(newMode);
                                        }
                                      },
                                      eqGains,
                                      setEqGain,
                                      advancedEqGains,
                                      setAdvancedEqGain,
                                      resetEq,
                                      targetEqGains,
                                      targetAdvancedEqGains,
                                      applyEqPreset,

                                      // EQ drag state
                                      startEqDrag: () => setIsDraggingEQ(true),
                                      endEqDrag: () => setIsDraggingEQ(false),

                                      // EQSmart
                                      eqSmartEnabled,
                                      toggleEqSmart: () => setEqSmartEnabled(prev => !prev),
                                      eqSmartProcessing,
                                      eqSmartSuggestions,
                                      applyEqSmartSettings,
                                      dynamicEqEnabled,
                                      toggleDynamicEq: () => setDynamicEqEnabled(prev => !prev),
                                      realtimeAnalysisData,

                                      // Playback state
                                      currentTrack,
                                      isPlaying,
                                      duration,
                                      currentTime,
                                      volume,
                                      buffering,
                                      loading,
                                      error,

                                      // Playback controls
                                      playTrack,
                                      togglePlay,
                                      seek,
                                      setVolume: setAudioVolume,

                                      // Queue
                                      queue,
                                      queueIndex,
                                      queueHistory,
                                      addToQueue,
                                      removeFromQueue,
                                      clearQueue: () => {
                                        setQueue([]);
                                        setQueueIndex(0);
                                        setQueueHistory([]);
                                      },
                                      playNext,
                                      playPrevious,

                                      // Settings
                                      shuffle,
                                      toggleShuffle: () => setShuffle(prev => !prev),
                                      repeat,
                                      toggleRepeat: () => setRepeat(prev => {
                                        if (prev === 'none') return 'all';
                                        if (prev === 'all') return 'one';
                                        return 'none';
                                      }),

                                      // Network
                                      networkStatus,
                                      offlineMode,
                                      toggleOfflineMode: () => setOfflineMode(prev => !prev),

                                      // Visualizer
                                      visualizerData,

                                      // Cache management
                                      clearCache: async () => {
                                        try {
                                          await cacheInstance.clear('tracks');
                                          await cacheInstance.clear('audio-files');
                                          await cacheInstance.clear('album-art');
                                          await cacheInstance.clear('audio-analysis');
                                          await cacheInstance.clear('waveforms');
                                          return true;
                                        } catch (error) {
                                          console.error('Clear cache error:', error);
                                          return false;
                                        }
                                      },

                                      getCacheSize: async () => {
                                        try {
                                          await cacheInstance.ready;
                                          if (!cacheInstance.db) return { totalMB: '0', tracks: 0, audioFiles: 0 };

                                          const stores = ['tracks', 'audio-files', 'album-art', 'audio-analysis', 'waveforms'];
                                          let totalSize = 0;
                                          const counts = {};

                                          for (const storeName of stores) {
                                            try {
                                              const tx = cacheInstance.db.transaction(storeName, 'readonly');
                                              const store = tx.objectStore(storeName);
                                              const items = await new Promise((resolve) => {
                                                const request = store.getAll();
                                                request.onsuccess = () => resolve(request.result || []);
                                                request.onerror = () => resolve([]);
                                              });

                                              counts[storeName] = items.length;

                                              items.forEach(item => {
                                                if (item?.blob?.size) {
                                                  totalSize += item.blob.size;
                                                } else if (item) {
                                                  totalSize += JSON.stringify(item).length;
                                                }
                                              });
                                            } catch {
                                              counts[storeName] = 0;
                                            }
                                          }

                                          return {
                                            totalMB: (totalSize / (1024 * 1024)).toFixed(2),
                                      tracks: counts['tracks'] || 0,
                                      audioFiles: counts['audio-files'] || 0,
                                      albumArt: counts['album-art'] || 0,
                                      analysis: counts['audio-analysis'] || 0,
                                      waveforms: counts['waveforms'] || 0,
                                          };
                                        } catch (error) {
                                          console.error('Error getting cache size:', error);
                                          return { totalMB: '0', tracks: 0, audioFiles: 0 };
                                        }
                                      },

                                      // Constants
                                      frequencies: {
                                        standard: STANDARD_FREQUENCIES,
                                        advanced: ADVANCED_FREQUENCIES,
                                      },
                                      frequencyBands: FREQUENCY_BANDS,
                                      presets: EQ_PRESETS,

                                      // Real-time config
                                      realtimeConfig: REALTIME_CONFIG,

                                      // Utility functions
                                      checkAuthentication: async () => {
                                        const token = localStorage.getItem('token');
                                        if (!token) return false;

                                        try {
                                          const response = await fetch('https://api.beatfly-music.xyz/xrpc/auth/verify', {
                                            headers: {
                                              'Authorization': `Bearer ${token}`
                                            }
                                          });

                                          return response.ok;
                                        } catch {
                                          return false;
                                        }
                                      },

                                      prefetchTrack: async (track) => {
                                        if (!track?.id || !networkStatus) return;

                                        try {
                                          const cachedAudio = await cacheInstance.get('audio-files', track.id);
                                          if (cachedAudio?.blob) return;

                                          const token = localStorage.getItem('token');
                                          const streamInfo = MusicAPI.streamTrack(track.id);

                                          const response = await fetch(streamInfo.url, {
                                            headers: streamInfo.headers
                                          });

                                          if (response.ok) {
                                            const blob = await response.blob();
                                            await cacheInstance.put('audio-files', { id: track.id, blob });
                                          }
                                        } catch (error) {
                                          console.error('Error prefetching track:', error);
                                        }
                                      },

                                      getWaveform: async (trackId) => {
                                        try {
                                          const cached = await cacheInstance.get('waveforms', trackId);
                                          if (cached?.waveform) {
                                            return cached.waveform;
                                          }

                                          const audioFile = await cacheInstance.get('audio-files', trackId);
                                          if (audioFile?.blob) {
                                            await initializeAudio();
                                            const ctx = nodeManagerRef.current?.getContext();
                                            if (!ctx) return null;

                                            const arrayBuffer = await audioFile.blob.arrayBuffer();
                                            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                                            const waveform = AudioAnalyzer.generateWaveform(audioBuffer);

                                            await cacheInstance.put('waveforms', {
                                              trackId,
                                              waveform,
                                              duration: audioBuffer.duration
                                            });

                                            return waveform;
                                          }

                                          return null;
                                        } catch (error) {
                                          console.error('Error getting waveform:', error);
                                          return null;
                                        }
                                      },

                                      // Analysis info for UI
                                      getAnalysisInfo: () => {
                                        if (!intelligentAnalyzerRef.current) return null;

                                        return {
                                          contentType: intelligentAnalyzerRef.current.contentType,
                                          spectralBalance: intelligentAnalyzerRef.current.spectralBalance,
                                          adaptiveParams: intelligentAnalyzerRef.current.adaptiveParams,
                                          dynamicRange: intelligentAnalyzerRef.current.dynamicRange,
                                        };
                                      },

                                      // Export audio state for debugging
                                      getAudioState: () => ({
                                        audioContextState: nodeManagerRef.current?.getContext()?.state,
                                                            audioInitialized: !!nodeManagerRef.current,
                                                            currentTime: audioRef.current?.currentTime,
                                                            duration: audioRef.current?.duration,
                                                            src: audioRef.current?.src,
                                                            volume: audioRef.current?.volume,
                                                            paused: audioRef.current?.paused,
                                                            readyState: audioRef.current?.readyState,
                                                            networkState: audioRef.current?.networkState,
                                                            error: audioRef.current?.error,
                                                            sourceNodeConnected: nodeManagerRef.current?.isConnected,
                                                            currentMode: nodeManagerRef.current?.currentMode,
                                      }),

                                      // EQ curve export/import
                                      exportEQCurve: () => {
                                        const curve = eqMode === 'advanced' ? advancedEqGains : eqGains;
                                        return {
                                          version: '3.0',
                                          mode: eqMode,
                                          frequencies: eqMode === 'advanced' ? ADVANCED_FREQUENCIES : STANDARD_FREQUENCIES,
                                          gains: curve,
                                          timestamp: new Date().toISOString(),
                                        };
                                      },

                                      importEQCurve: (data) => {
                                        try {
                                          if (!data || !data.gains || !Array.isArray(data.gains)) {
                                            throw new Error('Invalid EQ curve data');
                                          }

                                          const targetFreqs = data.mode === 'advanced' ? ADVANCED_FREQUENCIES : STANDARD_FREQUENCIES;

                                          if (data.gains.length !== targetFreqs.length) {
                                            throw new Error('Incompatible frequency count');
                                          }

                                          if (data.mode === 'advanced' && eqMode === 'advanced') {
                                            data.gains.forEach((gain, index) => {
                                              setAdvancedEqGain(index, gain);
                                            });
                                          } else if (data.mode === 'standard' && eqMode === 'standard') {
                                            data.gains.forEach((gain, index) => {
                                              setEqGain(index, gain);
                                            });
                                          } else {
                                            throw new Error('EQ mode mismatch');
                                          }

                                          return true;
                                        } catch (error) {
                                          console.error('Import error:', error);
                                          return false;
                                        }
                                      },

                                      // Force audio context initialization (useful for debugging)
                                      forceInitAudio: async () => {
                                        try {
                                          await initializeAudio();
                                          console.log('Audio context force initialized');
                                          return true;
                                        } catch (error) {
                                          console.error('Force init failed:', error);
                                          return false;
                                        }
                                      },

                                      // Manual connection refresh (useful for fixing connection issues)
                                      refreshConnections: () => {
                                        if (nodeManagerRef.current && audioRef.current.src) {
                                          console.log('Refreshing audio connections...');
                                          nodeManagerRef.current.disconnect();
                                          nodeManagerRef.current.connect(eqMode);
                                          return true;
                                        }
                                        return false;
                                      },
  }), [
    eqMode,
    eqGains,
    advancedEqGains,
    targetEqGains,
    targetAdvancedEqGains,
    eqSmartEnabled,
    eqSmartProcessing,
    eqSmartSuggestions,
    dynamicEqEnabled,
    realtimeAnalysisData,
    currentTrack,
    isPlaying,
    duration,
    currentTime,
    volume,
    buffering,
    loading,
    error,
    queue,
    queueIndex,
    queueHistory,
    shuffle,
    repeat,
    networkStatus,
    offlineMode,
    visualizerData,
    setEqGain,
    setAdvancedEqGain,
    resetEq,
    applyEqPreset,
    applyEqSmartSettings,
    playTrack,
    togglePlay,
    seek,
    setAudioVolume,
    addToQueue,
    removeFromQueue,
    playNext,
    playPrevious,
    initializeAudio,
  ]);

  return (
    <AudioContextData.Provider value={contextValue}>
    {children}
    </AudioContextData.Provider>
  );
};

// Export hook
export const useAudio = () => {
  const context = useContext(AudioContextData);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export default AudioProvider;
