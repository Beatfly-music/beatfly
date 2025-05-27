import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * Enhanced AudioVisualizer with multiple visualization types and customization options
 */
const AudioVisualizer = ({
  audioContext,
  analyzerNode,
  type = 'bars',
  colors = {},
  style = {},
  settings = {},
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const waveHistoryRef = useRef([]);

  // Default settings for each visualization type
  const defaultSettings = useMemo(() => ({
    bars: {
      count: 64,
      gap: 2,
      rounded: true,
      mirror: false,
      gradient: true,
      reactive: true,
      smoothing: 0.8,
    },
    waveform: {
      lineWidth: 3,
      mirror: true,
      fill: false,
      points: 256,
      smoothing: 0.85,
      glow: true,
    },
    radial: {
      innerRadius: 0.3,
      outerRadius: 0.8,
      segments: 128,
      rotation: true,
      mirror: true,
      smoothing: 0.7,
    },
    particles: {
      count: 100,
      size: 3,
      speed: 1,
      fadeSpeed: 0.02,
      reactive: true,
      connections: true,
    },
    circular: {
      radius: 0.4,
      lineWidth: 3,
      segments: 256,
      rotation: true,
      smoothing: 0.8,
      pulse: true,
    },
    spectrum: {
      bands: 32,
      height: 0.8,
      width: 0.9,
      gap: 1,
      rounded: true,
      gradient: true,
      labels: true,
    }
  }), []);

  // Merge default settings with provided settings
  const vizSettings = useMemo(() => ({
    ...defaultSettings[type],
    ...settings
  }), [type, settings, defaultSettings]);

  // Default colors for each visualization type
  const defaultColors = useMemo(() => ({
    bars: ['#00D9FF', '#00FF88', '#FF006E'],
    waveform: ['#FF006E', '#00D9FF'],
    radial: ['#00FF88', '#FFE600', '#FF006E'],
    particles: ['#00D9FF', '#FF006E', '#00FF88'],
    circular: ['#00D9FF', '#00FF88'],
    spectrum: ['#FF006E', '#00D9FF', '#00FF88', '#FFE600'],
  }), []);

  // Get colors for current visualization
  const vizColors = useMemo(() => {
    return colors[type] || defaultColors[type] || defaultColors.bars;
  }, [type, colors, defaultColors]);

  // Resize canvas to match container
  const resizeCanvas = useCallback((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    }
  }, []);

  // Initialize particles for particle visualization
  const initParticles = useCallback((width, height) => {
    particlesRef.current = Array.from({ length: vizSettings.count }, () => ({
      x: Math.random() * width,
                                                                            y: Math.random() * height,
                                                                            vx: (Math.random() - 0.5) * vizSettings.speed,
                                                                            vy: (Math.random() - 0.5) * vizSettings.speed,
                                                                            size: Math.random() * vizSettings.size + 1,
                                                                            color: vizColors[Math.floor(Math.random() * vizColors.length)],
                                                                            energy: 0,
    }));
  }, [vizSettings, vizColors]);

  // Enhanced bar visualization
  const drawBars = useCallback((ctx, dataArray, w, h) => {
    const { count, gap, rounded, mirror, gradient, reactive, smoothing } = vizSettings;
    const barCount = Math.min(dataArray.length, count);
    const barWidth = (w - gap * (barCount - 1)) / barCount;

    // Apply smoothing
    const smoothedData = new Uint8Array(barCount);
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor(i * dataArray.length / barCount);
      smoothedData[i] = dataArray[dataIndex] * smoothing + (smoothedData[i] || 0) * (1 - smoothing);
    }

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const value = smoothedData[i] / 255;
      const barHeight = value * h * 0.8;
      const x = i * (barWidth + gap);

      if (gradient) {
        const gradientSteps = vizColors.length;
        const gradientHeight = mirror ? barHeight * 2 : barHeight;
        const grad = ctx.createLinearGradient(0, h, 0, h - gradientHeight);

        vizColors.forEach((color, index) => {
          grad.addColorStop(index / (gradientSteps - 1), color);
        });

        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = vizColors[0];
      }

      // Add glow effect for reactive bars
      if (reactive && value > 0.7) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = vizColors[1] || vizColors[0];
      } else {
        ctx.shadowBlur = 0;
      }

      // Draw bar
      if (rounded) {
        const radius = Math.min(barWidth * 0.3, barHeight * 0.1);
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x, h - barHeight + radius);
        ctx.quadraticCurveTo(x, h - barHeight, x + radius, h - barHeight);
        ctx.lineTo(x + barWidth - radius, h - barHeight);
        ctx.quadraticCurveTo(x + barWidth, h - barHeight, x + barWidth, h - barHeight + radius);
        ctx.lineTo(x + barWidth, h);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(x, h - barHeight, barWidth, barHeight);
      }

      // Mirror effect
      if (mirror) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.translate(0, h);
        ctx.scale(1, -0.5);

        if (rounded) {
          const radius = Math.min(barWidth * 0.3, barHeight * 0.1);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, barHeight - radius);
          ctx.quadraticCurveTo(x, barHeight, x + radius, barHeight);
          ctx.lineTo(x + barWidth - radius, barHeight);
          ctx.quadraticCurveTo(x + barWidth, barHeight, x + barWidth, barHeight - radius);
          ctx.lineTo(x + barWidth, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(x, 0, barWidth, barHeight);
        }

        ctx.restore();
      }
    }
  }, [vizSettings, vizColors]);

  // Enhanced waveform visualization
  const drawWaveform = useCallback((ctx, dataArray, w, h) => {
    const { lineWidth, mirror, fill, points, smoothing, glow } = vizSettings;
    const pointCount = Math.min(dataArray.length, points);

    // Add to wave history for trails effect
    if (waveHistoryRef.current.length > 5) {
      waveHistoryRef.current.shift();
    }
    waveHistoryRef.current.push([...dataArray]);

    // Draw trails
    ctx.globalAlpha = 0.1;
    waveHistoryRef.current.forEach((historicalData, histIndex) => {
      if (histIndex < waveHistoryRef.current.length - 1) {
        drawWaveformPath(ctx, historicalData, w, h, pointCount, false);
      }
    });
    ctx.globalAlpha = 1;

    // Draw main waveform
    if (glow) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = vizColors[0];
    }

    drawWaveformPath(ctx, dataArray, w, h, pointCount, fill);

    // Mirror effect
    if (mirror) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.translate(0, h);
      ctx.scale(1, -1);
      drawWaveformPath(ctx, dataArray, w, h, pointCount, false);
      ctx.restore();
    }

    function drawWaveformPath(ctx, data, w, h, points, shouldFill) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = vizColors[0];
      ctx.beginPath();

      const sliceWidth = w / points;
      let x = 0;

      for (let i = 0; i < points; i++) {
        const dataIndex = Math.floor(i * data.length / points);
        const v = data[dataIndex] / 255;
        const y = h / 2 + (v - 0.5) * h * 0.8;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Smooth curve
          const prevIndex = Math.floor((i - 1) * data.length / points);
          const prevV = data[prevIndex] / 255;
          const prevY = h / 2 + (prevV - 0.5) * h * 0.8;
          const cpx = x - sliceWidth / 2;
          const cpy = (y + prevY) / 2;
          ctx.quadraticCurveTo(cpx, prevY, x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();

      if (shouldFill) {
        ctx.lineTo(w, h / 2);
        ctx.lineTo(0, h / 2);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, vizColors[0] + '40');
        gradient.addColorStop(0.5, vizColors[0] + '20');
        gradient.addColorStop(1, vizColors[0] + '40');
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }
  }, [vizSettings, vizColors]);

  // Enhanced radial visualization
  const drawRadial = useCallback((ctx, dataArray, w, h) => {
    const { innerRadius, outerRadius, segments, rotation, mirror, smoothing } = vizSettings;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) / 2;
    const innerR = maxRadius * innerRadius;
    const outerR = maxRadius * outerRadius;
    const segmentCount = Math.min(dataArray.length, segments);
    const angleStep = (Math.PI * 2) / segmentCount;

    ctx.save();

    if (rotation) {
      ctx.translate(centerX, centerY);
      ctx.rotate(Date.now() * 0.0001);
      ctx.translate(-centerX, -centerY);
    }

    // Create gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, innerR, centerX, centerY, outerR);
    vizColors.forEach((color, index) => {
      gradient.addColorStop(index / (vizColors.length - 1), color);
    });

    for (let i = 0; i < segmentCount; i++) {
      const dataIndex = Math.floor(i * dataArray.length / segmentCount);
      const value = dataArray[dataIndex] / 255;
      const smoothedValue = value * smoothing + (ctx.smoothedValues?.[i] || 0) * (1 - smoothing);

      const barLength = smoothedValue * (outerR - innerR);
      const startAngle = i * angleStep;
      const endAngle = startAngle + angleStep * 0.8;

      ctx.beginPath();
      ctx.arc(centerX, centerY, innerR, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerR + barLength, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = gradient;
      ctx.fill();

      if (mirror) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerR - barLength * 0.5, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerR, endAngle, startAngle, true);
        ctx.closePath();
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }, [vizSettings, vizColors]);

  // Particle visualization
  const drawParticles = useCallback((ctx, dataArray, w, h) => {
    const { speed, fadeSpeed, reactive, connections } = vizSettings;

    if (particlesRef.current.length === 0) {
      initParticles(w, h);
    }

    // Clear with fade effect
    ctx.fillStyle = `rgba(0, 0, 0, ${fadeSpeed})`;
    ctx.fillRect(0, 0, w, h);

    const avgFrequency = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255;

    particlesRef.current.forEach((particle, i) => {
      // Update particle position
      particle.x += particle.vx * speed;
      particle.y += particle.vy * speed;

      // Bounce off walls
      if (particle.x < 0 || particle.x > w) particle.vx *= -1;
      if (particle.y < 0 || particle.y > h) particle.vy *= -1;

      // Keep particles in bounds
      particle.x = Math.max(0, Math.min(w, particle.x));
      particle.y = Math.max(0, Math.min(h, particle.y));

      // React to audio
      if (reactive) {
        const freqIndex = Math.floor(i * dataArray.length / particlesRef.current.length);
        particle.energy = dataArray[freqIndex] / 255;
        particle.size = (vizSettings.size + particle.energy * 10);
      }

      // Draw particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = 0.5 + particle.energy * 0.5;
      ctx.fill();

      // Draw connections
      if (connections) {
        particlesRef.current.forEach((other, j) => {
          if (j > i) {
            const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
            if (distance < 100) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(other.x, other.y);
              ctx.strokeStyle = particle.color;
              ctx.globalAlpha = (1 - distance / 100) * 0.2 * avgFrequency;
              ctx.stroke();
            }
          }
        });
      }
    });

    ctx.globalAlpha = 1;
  }, [vizSettings, initParticles]);

  // Circular visualization
  const drawCircular = useCallback((ctx, dataArray, w, h) => {
    const { radius, lineWidth, segments, rotation, smoothing, pulse } = vizSettings;
    const centerX = w / 2;
    const centerY = h / 2;
    const baseRadius = Math.min(w, h) * radius;
    const segmentCount = Math.min(dataArray.length, segments);
    const angleStep = (Math.PI * 2) / segmentCount;

    ctx.save();

    if (rotation) {
      ctx.translate(centerX, centerY);
      ctx.rotate(Date.now() * 0.0002);
      ctx.translate(-centerX, -centerY);
    }

    // Calculate average frequency for pulse effect
    const avgFreq = pulse ? dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255 : 0;
    const pulseRadius = baseRadius + avgFreq * 50;

    // Create gradient
    const gradient = ctx.createLinearGradient(centerX - pulseRadius, centerY - pulseRadius, centerX + pulseRadius, centerY + pulseRadius);
    vizColors.forEach((color, index) => {
      gradient.addColorStop(index / (vizColors.length - 1), color);
    });

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = gradient;
    ctx.beginPath();

    for (let i = 0; i <= segmentCount; i++) {
      const dataIndex = Math.floor(i * dataArray.length / segmentCount) % dataArray.length;
      const value = dataArray[dataIndex] / 255;
      const smoothedValue = value * smoothing + (ctx.smoothedCircularValues?.[i] || 0) * (1 - smoothing);

      const angle = i * angleStep;
      const r = pulseRadius + smoothedValue * 50;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.stroke();

    // Add glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = vizColors[0];
    ctx.stroke();

    ctx.restore();
  }, [vizSettings, vizColors]);

  // Spectrum analyzer visualization
  const drawSpectrum = useCallback((ctx, dataArray, w, h) => {
    const { bands, height, width, gap, rounded, gradient, labels } = vizSettings;
    const bandCount = Math.min(dataArray.length / 4, bands);
    const totalWidth = w * width;
    const totalHeight = h * height;
    const bandWidth = (totalWidth - gap * (bandCount - 1)) / bandCount;
    const startX = (w - totalWidth) / 2;
    const startY = (h - totalHeight) / 2;

    // Frequency labels
    const freqLabels = ['Sub', 'Bass', 'Low', 'Mid', 'High', 'Presence', 'Brilliance'];

    for (let i = 0; i < bandCount; i++) {
      // Get frequency range for this band
      const startIndex = Math.floor(i * dataArray.length / bandCount);
      const endIndex = Math.floor((i + 1) * dataArray.length / bandCount);

      // Calculate average for this band
      let sum = 0;
      for (let j = startIndex; j < endIndex; j++) {
        sum += dataArray[j];
      }
      const avg = sum / (endIndex - startIndex) / 255;

      const barHeight = avg * totalHeight;
      const x = startX + i * (bandWidth + gap);
      const y = startY + totalHeight - barHeight;

      if (gradient) {
        const grad = ctx.createLinearGradient(x, y + barHeight, x, y);
        const colorIndex = Math.floor(i * vizColors.length / bandCount);
        grad.addColorStop(0, vizColors[colorIndex % vizColors.length]);
        grad.addColorStop(1, vizColors[(colorIndex + 1) % vizColors.length]);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = vizColors[i % vizColors.length];
      }

      if (rounded) {
        const radius = Math.min(bandWidth * 0.2, 10);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + bandWidth - radius, y);
        ctx.quadraticCurveTo(x + bandWidth, y, x + bandWidth, y + radius);
        ctx.lineTo(x + bandWidth, y + barHeight);
        ctx.lineTo(x, y + barHeight);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(x, y, bandWidth, barHeight);
      }

      // Draw frequency labels
      if (labels && i < freqLabels.length) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(freqLabels[i], x + bandWidth / 2, startY + totalHeight + 20);
      }
    }
  }, [vizSettings, vizColors]);

  // Main animation loop
  useEffect(() => {
    if (!analyzerNode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configure analyzer
    analyzerNode.fftSize = 2048;
    const bufferLength = analyzerNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Animation loop
    const render = () => {
      animationRef.current = requestAnimationFrame(render);

      // Get frequency data
      analyzerNode.getByteFrequencyData(dataArray);

      // Resize canvas if needed
      resizeCanvas(canvas);

      // Get actual canvas dimensions
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Clear canvas
      if (type !== 'particles') {
        ctx.clearRect(0, 0, w, h);
      }

      // Draw visualization
      switch (type) {
        case 'waveform':
          drawWaveform(ctx, dataArray, w, h);
          break;
        case 'radial':
          drawRadial(ctx, dataArray, w, h);
          break;
        case 'particles':
          drawParticles(ctx, dataArray, w, h);
          break;
        case 'circular':
          drawCircular(ctx, dataArray, w, h);
          break;
        case 'spectrum':
          drawSpectrum(ctx, dataArray, w, h);
          break;
        case 'bars':
        default:
          drawBars(ctx, dataArray, w, h);
      }
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyzerNode, type, resizeCanvas, drawBars, drawWaveform, drawRadial, drawParticles, drawCircular, drawSpectrum]);

  return (
    <motion.div
    className="visualizer-container relative w-full h-full"
    style={style}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    >
    <canvas
    ref={canvasRef}
    className="w-full h-full rounded-lg bg-black/20 backdrop-blur-sm"
    />
    </motion.div>
  );
};

AudioVisualizer.propTypes = {
  audioContext: PropTypes.object,
  analyzerNode: PropTypes.object,
  type: PropTypes.oneOf(['bars', 'waveform', 'radial', 'particles', 'circular', 'spectrum']),
  colors: PropTypes.object,
  style: PropTypes.object,
  settings: PropTypes.object,
};

export default AudioVisualizer;
