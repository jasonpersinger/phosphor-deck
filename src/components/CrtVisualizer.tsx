import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../audioEngine';
import type { PlaybackStatus } from '../audioEngine';

export type VisualizerMode = 'oscilloscope' | 'spectrum' | 'vu_meters';
export type PhosphorTheme = 'green' | 'amber' | 'cyan';

interface CrtVisualizerProps {
  mode: VisualizerMode;
  theme: PhosphorTheme;
  isPlaying: boolean;
  status: PlaybackStatus;
  stationName: string;
  genre: string;
}

export const CrtVisualizer: React.FC<CrtVisualizerProps> = ({
  mode,
  theme,
  isPlaying,
  status,
  stationName,
  genre
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peakHoldRef = useRef<number[]>(new Array(32).fill(0));
  const vuNeedleRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });

  // Color profiles
  const colorMap = {
    green: {
      primary: '#39ff7a',
      dim: 'rgba(57, 255, 122, 0.25)',
      glow: 'rgba(57, 255, 122, 0.7)',
      bgFade: 'rgba(9, 18, 14, 0.25)',
      grid: 'rgba(57, 255, 122, 0.08)',
      peak: '#adff2f',
    },
    amber: {
      primary: '#ffb830',
      dim: 'rgba(255, 184, 48, 0.25)',
      glow: 'rgba(255, 184, 48, 0.7)',
      bgFade: 'rgba(21, 14, 5, 0.25)',
      grid: 'rgba(255, 184, 48, 0.08)',
      peak: '#ff5533',
    },
    cyan: {
      primary: '#3fe8ff',
      dim: 'rgba(63, 232, 255, 0.25)',
      glow: 'rgba(63, 232, 255, 0.7)',
      bgFade: 'rgba(5, 17, 20, 0.25)',
      grid: 'rgba(63, 232, 255, 0.08)',
      peak: '#ffffff',
    }
  };

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const { waveform, frequency, rms } = audioEngine.getVisualizerData();
      const currentColors = colorMap[theme];

      // CRT persistence phosphor fade
      ctx.fillStyle = currentColors.bgFade;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle phosphor reticle / oscilloscope grid lines
      drawGrid(ctx, canvas.width, canvas.height, currentColors.grid);

      if (mode === 'oscilloscope') {
        drawOscilloscope(ctx, canvas.width, canvas.height, waveform, currentColors, isPlaying);
      } else if (mode === 'spectrum') {
        drawSpectrum(ctx, canvas.width, canvas.height, frequency, currentColors, peakHoldRef.current, isPlaying);
      } else if (mode === 'vu_meters') {
        drawVuMeters(ctx, canvas.width, canvas.height, rms, currentColors, vuNeedleRef.current, isPlaying);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [mode, theme, isPlaying]);

  // Background Oscilloscope Scale Grid
  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, gridColor: string) => {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    const cols = 8;
    const rows = 6;
    for (let i = 1; i < cols; i++) {
      const x = (w / cols) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let i = 1; i < rows; i++) {
      const y = (h / rows) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center crosshairs tick marks
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(w / 2 - 15, h / 2);
    ctx.lineTo(w / 2 + 15, h / 2);
    ctx.moveTo(w / 2, h / 2 - 15);
    ctx.lineTo(w / 2, h / 2 + 15);
    ctx.stroke();
  };

  // 1. Vector CRT Beam Oscilloscope
  const drawOscilloscope = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    waveform: Uint8Array,
    colors: typeof colorMap['green'],
    playing: boolean
  ) => {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = colors.glow;
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const sliceWidth = w / (waveform.length || 1);
    let x = 0;

    if (!playing || waveform.length === 0) {
      // Idle carrier line with subtle electron jitter
      const midY = h / 2 + (Math.random() - 0.5) * 1.5;
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
    } else {
      for (let i = 0; i < waveform.length; i++) {
        const v = waveform[i] / 128.0;
        const y = (v * h) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
    }

    ctx.stroke();

    // Second faint trace pass for tube bloom
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  };

  // 2. Vintage Graphic Equalizer 32-Band Analyzer
  const drawSpectrum = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    frequency: Uint8Array,
    colors: typeof colorMap['green'],
    peaks: number[],
    playing: boolean
  ) => {
    ctx.save();
    const numBars = 32;
    const barWidth = (w - (numBars + 1) * 4) / numBars;
    const step = Math.floor((frequency.length / 2) / numBars) || 1;

    for (let i = 0; i < numBars; i++) {
      let rawVal = 0;
      if (playing && frequency.length > 0) {
        rawVal = frequency[i * step] / 255;
      } else {
        rawVal = 0.02 + Math.random() * 0.04;
      }

      const barHeight = Math.max(4, rawVal * (h - 40));

      // Peak hold ballistics
      if (barHeight > peaks[i]) {
        peaks[i] = barHeight;
      } else {
        peaks[i] = Math.max(0, peaks[i] - 1.2);
      }

      const x = 8 + i * (barWidth + 4);

      // Draw segmented LED blocks
      const segmentHeight = 5;
      const numSegments = Math.floor(barHeight / (segmentHeight + 2));

      for (let s = 0; s < numSegments; s++) {
        const segY = h - 20 - s * (segmentHeight + 2);
        // Overload top segment colors
        if (s > numSegments - 3 && rawVal > 0.75) {
          ctx.fillStyle = colors.peak;
        } else {
          ctx.fillStyle = colors.primary;
        }
        ctx.fillRect(x, segY, barWidth, segmentHeight);
      }

      // Draw peak hold dot
      if (peaks[i] > 6) {
        ctx.fillStyle = colors.peak;
        ctx.fillRect(x, h - 20 - peaks[i], barWidth, 2);
      }
    }
    ctx.restore();
  };

  // 3. Dual Analog Ballistic Needle VU Meters
  const drawVuMeters = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    rms: number,
    colors: typeof colorMap['green'],
    needleState: { left: number; right: number },
    playing: boolean
  ) => {
    ctx.save();
    const meterWidth = (w - 60) / 2;
    const meterHeight = h - 40;

    // Target needle positions with slight stereo difference
    const targetLeft = playing ? Math.min(1.0, rms * 1.35) : 0.02;
    const targetRight = playing ? Math.min(1.0, rms * 1.28 + (Math.random() - 0.5) * 0.05) : 0.02;

    // Ballistic dynamics (fast rise, smooth damped decay)
    needleState.left += (targetLeft - needleState.left) * (targetLeft > needleState.left ? 0.35 : 0.12);
    needleState.right += (targetRight - needleState.right) * (targetRight > needleState.right ? 0.35 : 0.12);

    // Left Meter
    renderSingleMeter(ctx, 20, 20, meterWidth, meterHeight, 'CH 1 // L', needleState.left, colors);
    // Right Meter
    renderSingleMeter(ctx, 40 + meterWidth, 20, meterWidth, meterHeight, 'CH 2 // R', needleState.right, colors);

    ctx.restore();
  };

  const renderSingleMeter = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    val: number,
    colors: typeof colorMap['green']
  ) => {
    // Meter Bezel Box
    ctx.strokeStyle = colors.dim;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Arc scale
    const pivotX = x + width / 2;
    const pivotY = y + height + 25;
    const radius = height * 0.95;

    ctx.strokeStyle = colors.primary;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, radius, -Math.PI * 0.72, -Math.PI * 0.28);
    ctx.stroke();

    // Scale tick marks
    const ticks = [-20, -10, -7, -5, -3, -1, 0, 1, 2, 3];
    ticks.forEach((db, idx) => {
      const angle = -Math.PI * 0.70 + (idx / (ticks.length - 1)) * (Math.PI * 0.40);
      const tx1 = pivotX + Math.cos(angle) * (radius - 8);
      const ty1 = pivotY + Math.sin(angle) * (radius - 8);
      const tx2 = pivotX + Math.cos(angle) * radius;
      const ty2 = pivotY + Math.sin(angle) * radius;

      ctx.strokeStyle = db > 0 ? colors.peak : colors.primary;
      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();

      if (idx % 2 === 0) {
        ctx.fillStyle = db > 0 ? colors.peak : colors.dim;
        ctx.font = '10px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${db}`, tx1, ty1 - 4);
      }
    });

    // Needle Angle
    const needleAngle = -Math.PI * 0.70 + val * (Math.PI * 0.40);
    const needleTipX = pivotX + Math.cos(needleAngle) * (radius - 3);
    const needleTipY = pivotY + Math.sin(needleAngle) * (radius - 3);

    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = colors.glow;
    ctx.strokeStyle = val > 0.88 ? colors.peak : colors.primary;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY - 20);
    ctx.lineTo(needleTipX, needleTipY);
    ctx.stroke();
    ctx.restore();

    // Pivot cap
    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.arc(pivotX, y + height - 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = colors.dim;
    ctx.font = '12px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, pivotX, y + height - 18);
  };

  return (
    <div className={`relative w-full rounded border border-[#1b2621] crt-screen crt-${theme} crt-scanlines crt-glass overflow-hidden shadow-2xl`}>
      {/* Upper Status Telemetry Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-black/40 bg-black/60 text-xs font-mono tracking-wider z-30 relative select-none">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${
              status === 'playing'
                ? 'bg-[#39ff7a] shadow-[0_0_8px_#39ff7a]'
                : status === 'buffering'
                ? 'bg-amber-400 animate-ping shadow-[0_0_8px_#fbbf24]'
                : status === 'error'
                ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                : 'bg-zinc-600'
            }`}></span>
            <span className={
              status === 'playing' 
                ? 'text-[#39ff7a] font-bold' 
                : status === 'buffering' 
                ? 'text-amber-400 font-bold animate-pulse' 
                : status === 'error' 
                ? 'text-red-400 font-bold' 
                : 'text-zinc-500'
            }>
              {status === 'playing' ? 'CARRIER LOCK' : status === 'buffering' ? 'TUNING CARRIER...' : status === 'error' ? 'CARRIER LOST' : 'STANDBY'}
            </span>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400 font-tech">44.1 kHz // 16-BIT STEREO</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400 font-pixel text-sm">{genre.toUpperCase()}</span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-zinc-500">MODE:</span>
          <span className={`font-semibold tracking-widest ${theme === 'green' ? 'glow-green' : theme === 'amber' ? 'glow-amber' : 'glow-cyan'}`}>
            {mode.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Canvas Screen */}
      <div className="p-2 flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={240}
          className="w-full h-[220px] md:h-[240px] block cursor-crosshair"
        />
      </div>

      {/* Bottom Station Ticker */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-black/40 bg-black/60 text-[11px] font-mono tracking-wide z-30 relative select-none">
        <div className="flex items-center space-x-2 truncate">
          <span className="text-zinc-500">TUNED:</span>
          <span className={`truncate font-medium ${theme === 'green' ? 'glow-green' : theme === 'amber' ? 'glow-amber' : 'glow-cyan'}`}>
            {stationName}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-zinc-500 shrink-0">
          <span>Q: 0.85</span>
          <span>•</span>
          <span>ATTN: -12dB</span>
        </div>
      </div>
    </div>
  );
};
