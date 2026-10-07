import React from 'react';
import { CloudRain, Wind, Flame, Disc, Volume2, VolumeX, Sparkles } from 'lucide-react';
import type { AmbientLayerConfig } from '../audioEngine';

interface AmbientMixerProps {
  layers: AmbientLayerConfig;
  onChange: (layers: AmbientLayerConfig) => void;
  theme: 'green' | 'amber' | 'cyan';
}

export const AmbientMixer: React.FC<AmbientMixerProps> = ({
  layers,
  onChange,
  theme
}) => {
  const glowClass = theme === 'green' ? 'glow-green' : theme === 'amber' ? 'glow-amber' : 'glow-cyan';
  const borderActive = theme === 'green' ? 'border-[#39ff7a]/40 text-[#39ff7a]' : theme === 'amber' ? 'border-[#ffb830]/40 text-[#ffb830]' : 'border-[#3fe8ff]/40 text-[#3fe8ff]';

  const updateLayer = (key: keyof AmbientLayerConfig, val: number) => {
    onChange({
      ...layers,
      [key]: val
    });
  };

  const applyPreset = (preset: 'crypt' | 'rainy' | 'tape' | 'silent') => {
    switch (preset) {
      case 'crypt':
        onChange({ rain: 0.15, wind: 0.35, drone: 0.85, tape: 0.40 });
        break;
      case 'rainy':
        onChange({ rain: 0.85, wind: 0.40, drone: 0.20, tape: 0.30 });
        break;
      case 'tape':
        onChange({ rain: 0.0, wind: 0.10, drone: 0.15, tape: 0.90 });
        break;
      case 'silent':
        onChange({ rain: 0.0, wind: 0.0, drone: 0.0, tape: 0.0 });
        break;
    }
  };

  const channels: { key: keyof AmbientLayerConfig; label: string; sub: string; icon: React.ReactNode }[] = [
    { key: 'rain', label: 'RAIN // DROPS', sub: 'Brownian Filter', icon: <CloudRain className="w-4 h-4" /> },
    { key: 'wind', label: 'WIND // SWELLS', sub: 'Bandpass LFO', icon: <Wind className="w-4 h-4" /> },
    { key: 'drone', label: 'CRYPT // DRONE', sub: 'Sub-Bass Detune', icon: <Flame className="w-4 h-4" /> },
    { key: 'tape', label: 'TAPE // HISS', sub: 'Ferric Ground Hum', icon: <Disc className="w-4 h-4" /> },
  ];

  return (
    <div className="inset-bezel p-4 rounded border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4 select-none">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
          <h3 className="font-tech text-xs tracking-wider uppercase text-zinc-300 font-bold">
            PROCEDURAL AMBIENT SYNTHESIZERS
          </h3>
        </div>

        {/* Quick Ambient Presets */}
        <div className="flex items-center space-x-1.5 text-[11px] font-mono">
          <span className="text-zinc-500 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> SET:
          </span>
          <button
            onClick={() => applyPreset('crypt')}
            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700/60 hover:border-zinc-500 text-zinc-300 hover:text-white transition-colors"
          >
            CRYPT
          </button>
          <button
            onClick={() => applyPreset('rainy')}
            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700/60 hover:border-zinc-500 text-zinc-300 hover:text-white transition-colors"
          >
            DELUGE
          </button>
          <button
            onClick={() => applyPreset('tape')}
            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700/60 hover:border-zinc-500 text-zinc-300 hover:text-white transition-colors"
          >
            LO-FI
          </button>
          <button
            onClick={() => applyPreset('silent')}
            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700/60 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            OFF
          </button>
        </div>
      </div>

      {/* 4-Channel Sliders Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {channels.map(({ key, label, sub, icon }) => {
          const val = layers[key];
          const isMuted = val === 0;

          return (
            <div
              key={key}
              className={`p-3 rounded bg-black/40 border transition-all ${
                !isMuted ? borderActive : 'border-zinc-800/80 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <span className={!isMuted ? glowClass : 'text-zinc-500'}>{icon}</span>
                  <span className="font-tech text-xs font-semibold tracking-wide text-zinc-200">
                    {label}
                  </span>
                </div>
                <button
                  onClick={() => updateLayer(key, isMuted ? 0.5 : 0)}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="text-[10px] text-zinc-500 font-mono mb-2">
                {sub}
              </div>

              {/* Fader */}
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={val}
                  onChange={(e) => updateLayer(key, parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="font-mono text-xs w-8 text-right font-medium text-zinc-300">
                  {Math.round(val * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
