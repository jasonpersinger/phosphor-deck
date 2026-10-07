import React, { useState } from 'react';
import { Radio, Plus, Check, Play, Pause, ExternalLink } from 'lucide-react';
import { STATIONS } from '../audioEngine';
import type { PlaybackStatus } from '../audioEngine';

interface StationTunerProps {
  currentStationId: string;
  isPlaying: boolean;
  status: PlaybackStatus;
  onSelectStation: (stationId: string, customUrl?: string) => void;
  onTogglePlay: () => void;
  theme: 'green' | 'amber' | 'cyan';
}

export const StationTuner: React.FC<StationTunerProps> = ({
  currentStationId,
  isPlaying,
  status,
  onSelectStation,
  onTogglePlay,
  theme
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');

  const activeBorder = theme === 'green' ? 'border-[#39ff7a] text-[#39ff7a] shadow-[0_0_12px_rgba(57,255,122,0.2)]' : theme === 'amber' ? 'border-[#ffb830] text-[#ffb830] shadow-[0_0_12px_rgba(255,184,48,0.2)]' : 'border-[#3fe8ff] text-[#3fe8ff] shadow-[0_0_12px_rgba(63,232,255,0.2)]';
  const glowClass = theme === 'green' ? 'glow-green' : theme === 'amber' ? 'glow-amber' : 'glow-cyan';
  const activeDot = theme === 'green' ? 'bg-[#39ff7a]' : theme === 'amber' ? 'bg-[#ffb830]' : 'bg-[#3fe8ff]';

  const handleTuneCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onSelectStation('custom-stream', customUrl.trim());
    setShowCustomModal(false);
  };

  return (
    <div className="inset-bezel p-4 rounded border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3 select-none">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-zinc-400" />
          <h3 className="font-tech text-xs tracking-wider uppercase text-zinc-300 font-bold">
            RECEIVER TUNER // STATION PRESETS
          </h3>
        </div>

        <div className="flex items-center space-x-3">
          {/* Main Power/Play Rocker */}
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1 rounded text-xs font-tech font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all ${
              isPlaying
                ? 'bg-red-950/80 border border-red-500/80 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : `${theme === 'green' ? 'bg-[#39ff7a]/20 border border-[#39ff7a] text-[#39ff7a]' : theme === 'amber' ? 'bg-[#ffb830]/20 border border-[#ffb830] text-[#ffb830]' : 'bg-[#3fe8ff]/20 border border-[#3fe8ff] text-[#3fe8ff]'}`
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>MUTE STREAM</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>ENGAGE STREAM</span>
              </>
            )}
          </button>

          {/* Custom Stream Button */}
          <button
            onClick={() => setShowCustomModal(true)}
            className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 text-xs text-zinc-300 flex items-center space-x-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span className="font-mono text-[11px]">CUSTOM URL</span>
          </button>
        </div>
      </div>

      {/* Preset Bank Buttons Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {STATIONS.map((station, idx) => {
          const isSelected = currentStationId === station.id;

          return (
            <button
              key={station.id}
              onClick={() => onSelectStation(station.id)}
              className={`p-2.5 text-left rounded bg-zinc-950/70 border transition-all flex flex-col justify-between group relative overflow-hidden ${
                isSelected
                  ? `${activeBorder} bg-zinc-900/90`
                  : 'border-zinc-800/90 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-mono text-[10px] text-zinc-500 group-hover:text-zinc-400">
                  CH-0{idx + 1}
                </span>
                <span className="text-sm">{station.icon}</span>
              </div>

              <div>
                <div className={`font-tech text-xs font-bold tracking-tight truncate ${isSelected ? glowClass : 'text-zinc-200'}`}>
                  {station.name.replace('SomaFM • ', '')}
                </div>
                <div className="font-mono text-[10px] text-zinc-500 truncate mt-0.5">
                  {station.genre}
                </div>
              </div>

              {/* Active Indicator LED */}
              {isSelected && (
                <div className="absolute top-1.5 left-1.5 flex items-center space-x-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    status === 'playing'
                      ? `${activeDot} animate-ping`
                      : status === 'buffering'
                      ? 'bg-amber-400 animate-ping'
                      : status === 'error'
                      ? 'bg-red-500'
                      : 'bg-zinc-600'
                  }`}></span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Stream URL Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#14171a] border border-zinc-700 rounded-lg p-5 max-w-md w-full shadow-2xl font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h4 className="font-tech text-sm uppercase text-zinc-200 font-bold flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                Tune Custom Audio Stream
              </h4>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTuneCustom} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  DIRECT STREAM URL (MP3 / AAC / ICECAST / SHOUTCAST)
                </label>
                <input
                  type="url"
                  placeholder="https://stream.server.org:8000/stream.mp3"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-black/80 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  STREAM LABEL (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="My Synth Stream"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/80 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3 py-1.5 rounded border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-xs text-white font-bold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Connect Carrier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
