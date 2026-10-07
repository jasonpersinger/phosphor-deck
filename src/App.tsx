import { useState, useEffect } from 'react';
import { 
  Activity, 
  Terminal, 
  Tv, 
  Volume2, 
  VolumeX 
} from 'lucide-react';

import { audioEngine, STATIONS } from './audioEngine';
import type { AmbientLayerConfig, DspConfig, PlaybackStatus } from './audioEngine';
import { CrtVisualizer } from './components/CrtVisualizer';
import type { VisualizerMode, PhosphorTheme } from './components/CrtVisualizer';
import { AmbientMixer } from './components/AmbientMixer';
import { TapeDspRack } from './components/TapeDspRack';
import { StationTuner } from './components/StationTuner';

export function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [currentStationId, setCurrentStationId] = useState(STATIONS[0].id);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('oscilloscope');
  const [theme, setTheme] = useState<PhosphorTheme>('green');
  const [isCrtScanlines, setIsCrtScanlines] = useState(true);

  // Audio Volumes & States
  const [radioVolume, setRadioVolume] = useState(0.85);
  const [masterVolume, setMasterVolume] = useState(0.80);
  const [isMuted, setIsMuted] = useState(false);

  // Procedural Ambient Layers
  const [ambientLayers, setAmbientLayers] = useState<AmbientLayerConfig>({
    rain: 0.25,
    wind: 0.15,
    drone: 0.40,
    tape: 0.35,
  });

  // Master DSP State
  const [dspConfig, setDspConfig] = useState<DspConfig>({
    tapeAge: 35,
    wowFlutter: 45,
    tapeSaturation: true,
  });

  // Sleep Timer
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState<number | null>(null);

  // Current Station Meta
  const currentStation = STATIONS.find(s => s.id === currentStationId) || {
    id: 'custom',
    name: 'Custom Stream Carrier',
    genre: 'Direct Audio Stream',
    streamUrl: '',
    description: 'Direct internet radio link',
    icon: '📡'
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key >= '1' && e.key <= '8') {
        const idx = parseInt(e.key) - 1;
        if (STATIONS[idx]) {
          handleSelectStation(STATIONS[idx].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, masterVolume]);

  // Sleep Timer Countdown Loop
  useEffect(() => {
    if (!sleepRemainingSeconds) return;

    const interval = setInterval(() => {
      setSleepRemainingSeconds(prev => {
        if (!prev || prev <= 1) {
          audioEngine.pauseRadio();
          setIsPlaying(false);
          setSleepMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepRemainingSeconds]);

  // Subscribe to Audio Engine Playback Status & Initial Sync
  useEffect(() => {
    audioEngine.setAmbientLayers(ambientLayers);
    audioEngine.setDsp(dspConfig);

    const unsub = audioEngine.onStatusChange((status) => {
      setPlaybackStatus(status);
      setIsPlaying(status === 'playing' || status === 'buffering');
    });

    return unsub;
  }, []);

  const handleSetSleepTimer = (mins: number | null) => {
    setSleepMinutes(mins);
    if (mins) {
      setSleepRemainingSeconds(mins * 60);
    } else {
      setSleepRemainingSeconds(null);
    }
  };

  const handleTogglePlay = async () => {
    const playing = await audioEngine.toggleRadio();
    setIsPlaying(playing);
  };

  const handleSelectStation = async (stationId: string, customUrl?: string) => {
    setCurrentStationId(stationId);
    await audioEngine.setRadioStation(stationId, customUrl);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      audioEngine.setMasterVolume(masterVolume);
      setIsMuted(false);
    } else {
      audioEngine.setMasterVolume(0);
      setIsMuted(true);
    }
  };

  const handleAmbientChange = (newLayers: AmbientLayerConfig) => {
    setAmbientLayers(newLayers);
    audioEngine.setAmbientLayers(newLayers);
  };

  const handleDspChange = (newDsp: DspConfig) => {
    setDspConfig(newDsp);
    audioEngine.setDsp(newDsp);
  };

  const handleRadioVolume = (vol: number) => {
    setRadioVolume(vol);
    audioEngine.setRadioVolume(vol);
  };

  const handleMasterVolume = (vol: number) => {
    setMasterVolume(vol);
    if (!isMuted) {
      audioEngine.setMasterVolume(vol);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#07090b] text-[#c3ced2] p-3 md:p-6 flex flex-col justify-between items-center selection:bg-[#39ff7a]/20">
      {/* Outer Hi-Fi Rackmount Chassis Box */}
      <div className="w-full max-w-5xl hifi-chassis rounded-lg border border-[#23282e] p-4 md:p-7 relative shadow-2xl overflow-hidden">
        
        {/* Chassis Hex Bolt Accents */}
        <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full border border-zinc-600 bg-zinc-800 shadow-inner"></div>
        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full border border-zinc-600 bg-zinc-800 shadow-inner"></div>
        <div className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full border border-zinc-600 bg-zinc-800 shadow-inner"></div>
        <div className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full border border-zinc-600 bg-zinc-800 shadow-inner"></div>

        {/* --- Top Panel Header Strip --- */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-700/60 mb-5 gap-3">
          <div className="flex items-center space-x-3">
            {/* Status Pilot Light */}
            <div className="relative flex items-center justify-center">
              <span className={`w-3.5 h-3.5 rounded-full border border-black/80 ${
                isPlaying 
                  ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' 
                  : 'bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              }`}></span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-tech text-base md:text-lg font-bold tracking-widest text-zinc-100 uppercase">
                  VOX-84 <span className="text-zinc-500 font-light">//</span> PHOSPHOR DECK
                </h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-400">
                  RACK MK-II
                </span>
              </div>
              <p className="font-mono text-[11px] text-zinc-500">
                Hi-Fi Terminal Streamer & Procedural Ambient Synthesizer
              </p>
            </div>
          </div>

          {/* Theme & Display Mode Selectors */}
          <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
            {/* Phosphor Theme Picker */}
            <div className="flex items-center bg-black/60 rounded p-1 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 px-1.5 uppercase font-tech">COLOR:</span>
              <button
                onClick={() => setTheme('green')}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  theme === 'green' ? 'bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-500/40' : 'text-zinc-400 hover:text-white'
                }`}
              >
                P1 GREEN
              </button>
              <button
                onClick={() => setTheme('amber')}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  theme === 'amber' ? 'bg-amber-950/80 text-amber-400 font-bold border border-amber-500/40' : 'text-zinc-400 hover:text-white'
                }`}
              >
                P3 AMBER
              </button>
              <button
                onClick={() => setTheme('cyan')}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  theme === 'cyan' ? 'bg-cyan-950/80 text-cyan-400 font-bold border border-cyan-500/40' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ICE BLUE
              </button>
            </div>

            {/* Scanlines Toggle */}
            <button
              onClick={() => setIsCrtScanlines(!isCrtScanlines)}
              className={`px-2.5 py-1 rounded border text-[11px] flex items-center space-x-1 transition-colors ${
                isCrtScanlines 
                  ? 'border-zinc-600 bg-zinc-800 text-zinc-200' 
                  : 'border-zinc-800 bg-black/40 text-zinc-500'
              }`}
              title="Toggle CRT Scanline Overlay"
            >
              <Tv className="w-3 h-3" />
              <span>CRT FX</span>
            </button>
          </div>
        </header>

        {/* --- Main CRT Visualizer Display Window --- */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center space-x-2 text-xs font-tech text-zinc-400">
              <Activity className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-bold tracking-wide uppercase">CRT DISPLAY MATRIX</span>
            </div>

            {/* Visualizer Mode Buttons */}
            <div className="flex items-center space-x-1 font-mono text-[11px]">
              {(['oscilloscope', 'spectrum', 'vu_meters'] as VisualizerMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setVisualizerMode(m)}
                  className={`px-2.5 py-0.5 rounded border transition-colors uppercase ${
                    visualizerMode === m
                      ? 'border-zinc-500 bg-zinc-800 text-white font-bold'
                      : 'border-zinc-800 bg-black/40 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {m === 'oscilloscope' ? 'OSCILLOSCOPE' : m === 'spectrum' ? 'SPECTRUM 32B' : 'ANALOG VU'}
                </button>
              ))}
            </div>
          </div>

          <div className={isCrtScanlines ? '' : 'no-scanlines'}>
            <CrtVisualizer
              mode={visualizerMode}
              theme={theme}
              isPlaying={isPlaying}
              status={playbackStatus}
              stationName={currentStation.name}
              genre={currentStation.genre}
            />
          </div>
        </section>

        {/* --- Lower Hardware Sections (Grid) --- */}
        <div className="space-y-4">
          {/* Station Receiver Tuner */}
          <StationTuner
            currentStationId={currentStationId}
            isPlaying={isPlaying}
            status={playbackStatus}
            onSelectStation={handleSelectStation}
            onTogglePlay={handleTogglePlay}
            theme={theme}
          />

          {/* Procedural Ambient Synthesizer Mixer */}
          <AmbientMixer
            layers={ambientLayers}
            onChange={handleAmbientChange}
            theme={theme}
          />

          {/* Master Tape DSP & Volume Rack */}
          <TapeDspRack
            dsp={dspConfig}
            onChangeDsp={handleDspChange}
            radioVolume={radioVolume}
            onChangeRadioVolume={handleRadioVolume}
            masterVolume={masterVolume}
            onChangeMasterVolume={handleMasterVolume}
            sleepMinutes={sleepMinutes}
            onSetSleepTimer={handleSetSleepTimer}
            theme={theme}
          />
        </div>

        {/* --- Master Bottom Status Strip --- */}
        <footer className="mt-5 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-zinc-500 gap-2 select-none">
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1">
              <Terminal className="w-3 h-3 text-zinc-400" />
              <span>KEYS:</span>
            </span>
            <span><kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-300">Space</kbd> Stream</span>
            <span><kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-300">1..8</kbd> Station</span>
            <span><kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-300">M</kbd> Mute</span>
          </div>

          <div className="flex items-center space-x-3">
            {sleepRemainingSeconds && (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                ⏳ SLEEP IN {formatTime(sleepRemainingSeconds)}
              </span>
            )}
            <button
              onClick={handleToggleMute}
              className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'UNMUTE MASTER' : 'MUTE MASTER'}</span>
            </button>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-600">ZERO TRACKING • WEB AUDIO DSP</span>
          </div>
        </footer>
      </div>

      <div className="mt-4 text-center text-xs font-mono text-zinc-600">
        VOX-84 PHOSPHOR DECK // Built for deep focus, ambient listening, and retro audio exploration.
      </div>
    </div>
  );
}

export default App;
