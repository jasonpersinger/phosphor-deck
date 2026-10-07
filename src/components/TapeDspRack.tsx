import React from 'react';
import { Gauge, Radio, Volume2, Timer, Flame } from 'lucide-react';
import type { DspConfig } from '../audioEngine';

interface TapeDspRackProps {
  dsp: DspConfig;
  onChangeDsp: (dsp: DspConfig) => void;
  radioVolume: number;
  onChangeRadioVolume: (vol: number) => void;
  masterVolume: number;
  onChangeMasterVolume: (vol: number) => void;
  sleepMinutes: number | null;
  onSetSleepTimer: (minutes: number | null) => void;
  theme: 'green' | 'amber' | 'cyan';
}

export const TapeDspRack: React.FC<TapeDspRackProps> = ({
  dsp,
  onChangeDsp,
  radioVolume,
  onChangeRadioVolume,
  masterVolume,
  onChangeMasterVolume,
  sleepMinutes,
  onSetSleepTimer,
  theme
}) => {
  const glowClass = theme === 'green' ? 'glow-green' : theme === 'amber' ? 'glow-amber' : 'glow-cyan';
  const activeBg = theme === 'green' ? 'bg-[#39ff7a]' : theme === 'amber' ? 'bg-[#ffb830]' : 'bg-[#3fe8ff]';

  return (
    <div className="inset-bezel p-4 rounded border border-zinc-800">
      {/* Rack Title */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4 select-none">
        <div className="flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-zinc-400" />
          <h3 className="font-tech text-xs tracking-wider uppercase text-zinc-300 font-bold">
            MASTER DSP // TAPE DECK PROCESSOR
          </h3>
        </div>

        {/* Sleep Timer Selector */}
        <div className="flex items-center space-x-1.5 text-xs font-mono">
          <Timer className="w-3.5 h-3.5 text-zinc-500 mr-1" />
          <span className="text-zinc-500 mr-1">SLEEP:</span>
          {[null, 15, 30, 60].map((mins) => (
            <button
              key={mins ?? 'off'}
              onClick={() => onSetSleepTimer(mins)}
              className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                sleepMinutes === mins
                  ? `border-zinc-500 bg-zinc-800 text-white font-bold`
                  : `border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200`
              }`}
            >
              {mins ? `${mins}m` : 'OFF'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Control 1: Tape Age (Lowpass) */}
        <div className="p-3 bg-black/40 rounded border border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <span className="font-tech text-xs font-semibold text-zinc-200">
              TAPE AGE / WEAR
            </span>
            <span className="font-mono text-xs text-zinc-400">
              {dsp.tapeAge}%
            </span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mb-2">
            12dB/oct head rolloff
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={dsp.tapeAge}
            onChange={(e) => onChangeDsp({ ...dsp, tapeAge: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Control 2: Wow & Flutter (Pitch drift) */}
        <div className="p-3 bg-black/40 rounded border border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <span className="font-tech text-xs font-semibold text-zinc-200">
              WOW & FLUTTER
            </span>
            <span className="font-mono text-xs text-zinc-400">
              {dsp.wowFlutter}%
            </span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mb-2">
            Motor drift & wobble
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={dsp.wowFlutter}
            onChange={(e) => onChangeDsp({ ...dsp, wowFlutter: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Control 3: Tape Saturation Toggle */}
        <div className="p-3 bg-black/40 rounded border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-tech text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              TAPE SATURATION
            </span>
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${dsp.tapeSaturation ? `${activeBg} shadow-[0_0_6px_currentColor]` : 'bg-zinc-700'}`}></span>
              <span className={`text-[11px] font-mono ${dsp.tapeSaturation ? glowClass : 'text-zinc-500'}`}>
                {dsp.tapeSaturation ? 'ON' : 'BYPASS'}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono mb-2">
            Warm polynomial soft-clip
          </p>
          <button
            onClick={() => onChangeDsp({ ...dsp, tapeSaturation: !dsp.tapeSaturation })}
            className={`w-full py-1.5 rounded text-xs font-tech font-semibold uppercase tracking-wider border transition-all ${
              dsp.tapeSaturation
                ? 'bg-zinc-800 border-zinc-500 text-white shadow-inner'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {dsp.tapeSaturation ? 'DISENGAGE DRIVE' : 'ENGAGE DRIVE'}
          </button>
        </div>

        {/* Control 4: Dual Volume Faders (Radio + Master) */}
        <div className="p-3 bg-black/40 rounded border border-zinc-800 space-y-2">
          {/* Radio Volume */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-tech text-zinc-300">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-zinc-400" /> RADIO GAIN
              </span>
              <span className="font-mono text-zinc-400">{Math.round(radioVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={radioVolume}
              onChange={(e) => onChangeRadioVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Master Volume */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-tech text-zinc-300">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-zinc-400" /> MASTER OUTPUT
              </span>
              <span className="font-mono text-zinc-400">{Math.round(masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onChangeMasterVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
