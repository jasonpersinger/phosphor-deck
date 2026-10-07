// VOX-84 // PHOSPHOR DECK - High-Reliability Audio Engine & Procedural Synthesizers

export interface Station {
  id: string;
  name: string;
  genre: string;
  streamUrl: string;
  description: string;
  icon: string;
}

// 8 Verified, Fast, High-Bandwidth Live Audio Streams
export const STATIONS: Station[] = [
  {
    id: 'soma-dronezone',
    name: 'SomaFM • Drone Zone',
    genre: 'Atmospheric Space / Drone',
    streamUrl: 'https://ice4.somafm.com/dronezone-128-mp3',
    description: 'Served best chilled, safe with most medications. Atmospheric ambient space.',
    icon: '🌌'
  },
  {
    id: 'soma-darkzone',
    name: 'SomaFM • Dark Zone',
    genre: 'Subterranean Ambient',
    streamUrl: 'https://ice4.somafm.com/darkzone-128-mp3',
    description: 'Dark ambient, drone, and industrial soundscapes for deep focus.',
    icon: '🕯️'
  },
  {
    id: 'nightwave-plaza',
    name: 'Nightwave Plaza',
    genre: 'Vaporwave / Future Funk',
    streamUrl: 'https://radio.plaza.one/mp3',
    description: '24/7 nostalgic vaporwave broadcast live from the virtual shopping mall.',
    icon: '🌴'
  },
  {
    id: 'rp-mellow',
    name: 'Radio Paradise • Mellow',
    genre: 'Downtempo / Warm Chill',
    streamUrl: 'https://stream.radioparadise.com/mellow-128',
    description: 'Ultra-clean audiophile mix of acoustic, ambient, and mellow rhythms.',
    icon: '☕'
  },
  {
    id: 'hunter-lofi',
    name: 'Hunter • Lofi Chill',
    genre: 'Lofi Beats / Study Tape',
    streamUrl: 'https://live.hunter.fm/lofi_high',
    description: 'Dusty vinyl grooves, relaxed jazz chords, and mellow study beats.',
    icon: '🎧'
  },
  {
    id: 'soma-groovesalad',
    name: 'SomaFM • Groove Salad',
    genre: 'Downtempo / Ambient Chill',
    streamUrl: 'https://ice4.somafm.com/groovesalad-128-mp3',
    description: 'A nicely chilled plate of ambient/downtempo beats and grooves.',
    icon: '🥗'
  },
  {
    id: 'soma-defcon',
    name: 'SomaFM • DEF CON Radio',
    genre: 'Underground Hacker / Bass',
    streamUrl: 'https://ice4.somafm.com/defcon-128-mp3',
    description: 'Music for hacking, investigating, coding, and the digital underground.',
    icon: '💻'
  },
  {
    id: 'rp-main',
    name: 'Radio Paradise • Main',
    genre: 'Eclectic Audiophile',
    streamUrl: 'https://stream.radioparadise.com/mp3-128',
    description: 'Commercial-free world-class eclectic music curated by real humans.',
    icon: '📻'
  }
];

export interface AmbientLayerConfig {
  rain: number;
  wind: number;
  drone: number;
  tape: number;
}

export interface DspConfig {
  tapeAge: number;       // 0 to 100
  wowFlutter: number;    // 0 to 100
  tapeSaturation: boolean;
}

export type PlaybackStatus = 'idle' | 'buffering' | 'playing' | 'error';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private radioAudio: HTMLAudioElement | null = null;

  // Master DSP nodes for ambient synths
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private tapeFilterNode: BiquadFilterNode | null = null;
  private waveshaperNode: WaveShaperNode | null = null;
  private flutterDelayNode: DelayNode | null = null;
  private flutterLfoGain: GainNode | null = null;
  private flutterLfoOsc: OscillatorNode | null = null;

  // Visualizer carrier oscillator (drives CRT meters during radio playback)
  private visualizerCarrierGain: GainNode | null = null;
  private visualizerCarrierOsc1: OscillatorNode | null = null;
  private visualizerCarrierOsc2: OscillatorNode | null = null;

  // Ambient Layer Nodes
  private ambientBusGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private tapeGain: GainNode | null = null;

  private isInitialized = false;
  private isRadioPlaying = false;
  private isSwitchingStation = false;
  private currentStationId = STATIONS[0].id;
  private status: PlaybackStatus = 'idle';
  private statusListeners: ((status: PlaybackStatus, error?: string) => void)[] = [];

  // Volumes
  private radioVol = 0.85;
  private masterVol = 0.80;

  // Synth cleanups
  private rainNodeCleanup: (() => void) | null = null;
  private windNodeCleanup: (() => void) | null = null;
  private droneNodeCleanup: (() => void) | null = null;
  private tapeHissCleanup: (() => void) | null = null;

  public onStatusChange(listener: (status: PlaybackStatus, error?: string) => void) {
    this.statusListeners.push(listener);
    listener(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private setStatus(newStatus: PlaybackStatus, errorMsg?: string) {
    this.status = newStatus;
    this.statusListeners.forEach(l => l(newStatus, errorMsg));
  }

  public async ensureContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn("AudioContext resume note:", e);
      }
    }

    if (!this.isInitialized) {
      this.setupAudioGraph();
    }
  }

  private setupAudioGraph() {
    if (!this.ctx) return;

    // 1. Analyser & Master Gain
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.82;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);

    // 2. Tape Saturation (Waveshaper)
    this.waveshaperNode = this.ctx.createWaveShaper();
    this.updateDistortionCurve(0.2);

    // 3. Tape High-Frequency Darkening Filter
    this.tapeFilterNode = this.ctx.createBiquadFilter();
    this.tapeFilterNode.type = 'lowpass';
    this.tapeFilterNode.frequency.setValueAtTime(16000, this.ctx.currentTime);
    this.tapeFilterNode.Q.setValueAtTime(0.7, this.ctx.currentTime);

    // 4. Wow & Flutter (Delay + LFO)
    this.flutterDelayNode = this.ctx.createDelay(0.1);
    this.flutterDelayNode.delayTime.setValueAtTime(0.005, this.ctx.currentTime);

    this.flutterLfoOsc = this.ctx.createOscillator();
    this.flutterLfoOsc.frequency.setValueAtTime(0.55, this.ctx.currentTime);
    this.flutterLfoGain = this.ctx.createGain();
    this.flutterLfoGain.gain.setValueAtTime(0.0003, this.ctx.currentTime);

    this.flutterLfoOsc.connect(this.flutterLfoGain);
    this.flutterLfoGain.connect(this.flutterDelayNode.delayTime);
    this.flutterLfoOsc.start();

    // 5. Connect DSP Chain:
    this.waveshaperNode.connect(this.tapeFilterNode);
    this.tapeFilterNode.connect(this.flutterDelayNode);
    this.flutterDelayNode.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // 6. Visualizer Carrier Simulation Nodes
    this.visualizerCarrierGain = this.ctx.createGain();
    this.visualizerCarrierGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const visFilter = this.ctx.createBiquadFilter();
    visFilter.type = 'lowpass';
    visFilter.frequency.setValueAtTime(600, this.ctx.currentTime);

    this.visualizerCarrierOsc1 = this.ctx.createOscillator();
    this.visualizerCarrierOsc1.type = 'triangle';
    this.visualizerCarrierOsc1.frequency.setValueAtTime(65, this.ctx.currentTime);

    this.visualizerCarrierOsc2 = this.ctx.createOscillator();
    this.visualizerCarrierOsc2.type = 'sine';
    this.visualizerCarrierOsc2.frequency.setValueAtTime(130, this.ctx.currentTime);

    this.visualizerCarrierOsc1.connect(visFilter);
    this.visualizerCarrierOsc2.connect(visFilter);
    visFilter.connect(this.visualizerCarrierGain);
    this.visualizerCarrierGain.connect(this.analyser);

    this.visualizerCarrierOsc1.start();
    this.visualizerCarrierOsc2.start();

    // 7. Ambient Bus
    this.ambientBusGain = this.ctx.createGain();
    this.ambientBusGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.ambientBusGain.connect(this.waveshaperNode);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.25 * 0.45, this.ctx.currentTime);
    this.rainGain.connect(this.ambientBusGain);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.15 * 0.5, this.ctx.currentTime);
    this.windGain.connect(this.ambientBusGain);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.40 * 0.6, this.ctx.currentTime);
    this.droneGain.connect(this.ambientBusGain);

    this.tapeGain = this.ctx.createGain();
    this.tapeGain.gain.setValueAtTime(0.35 * 0.35, this.ctx.currentTime);
    this.tapeGain.connect(this.ambientBusGain);

    // Start Procedural Synthesizers
    this.startRainSynth();
    this.startWindSynth();
    this.startDroneSynth();
    this.startTapeHissSynth();

    // 8. Create Dedicated, Unrestricted HTML5 Audio Player
    this.createRadioElement();

    this.isInitialized = true;
  }

  private createRadioElement() {
    if (this.radioAudio) {
      try {
        this.radioAudio.pause();
        this.radioAudio.src = '';
      } catch { /* ignore */ }
    }

    this.radioAudio = new Audio();
    this.radioAudio.preload = 'auto';
    this.radioAudio.volume = this.radioVol * this.masterVol;

    this.radioAudio.addEventListener('loadstart', () => {
      this.setStatus('buffering');
    });

    this.radioAudio.addEventListener('waiting', () => {
      this.setStatus('buffering');
    });

    this.radioAudio.addEventListener('canplay', () => {
      if (this.isRadioPlaying) {
        this.isSwitchingStation = false;
        this.setStatus('playing');
        this.setVisualizerCarrier(true);
      }
    });

    this.radioAudio.addEventListener('playing', () => {
      this.isSwitchingStation = false;
      this.isRadioPlaying = true;
      this.setStatus('playing');
      this.setVisualizerCarrier(true);
    });

    this.radioAudio.addEventListener('pause', () => {
      // If we are actively switching stations, ignore the automatic pause of the old URL!
      if (this.isSwitchingStation) {
        return;
      }
      this.isRadioPlaying = false;
      this.setVisualizerCarrier(false);
      this.setStatus('idle');
    });

    this.radioAudio.addEventListener('error', () => {
      const err = this.radioAudio?.error;
      // Code 1 is MEDIA_ERR_ABORTED (normal when switching tracks)
      if (!err || err.code === 1 || this.isSwitchingStation) {
        return;
      }
      console.warn("Audio element error reported:", err);
      this.setVisualizerCarrier(false);
      this.setStatus('error', 'Carrier connection lost');
    });
  }

  private setVisualizerCarrier(active: boolean) {
    if (!this.ctx || !this.visualizerCarrierGain) return;
    const target = active ? 0.08 : 0.0;
    this.visualizerCarrierGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
  }

  // --- Saturation Curve Generator ---
  private updateDistortionCurve(amount: number) {
    if (!this.waveshaperNode || !this.ctx) return;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    const k = amount * 50;

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (amount <= 0.01) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    this.waveshaperNode.curve = curve;
  }

  // --- Procedural Layer 1: Rain ---
  private startRainSynth() {
    if (!this.ctx || !this.rainGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(250, this.ctx.currentTime);

    whiteNoise.connect(highpass);
    highpass.connect(filter);
    filter.connect(this.rainGain);
    whiteNoise.start();

    this.rainNodeCleanup = () => {
      try { whiteNoise.stop(); } catch { /* ignore */ }
    };
  }

  // --- Procedural Layer 2: Mountain Wind ---
  private startWindSynth() {
    if (!this.ctx || !this.windGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(450, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(2.5, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(320, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);

    noiseSource.connect(bandpass);
    bandpass.connect(this.windGain);

    noiseSource.start();
    lfo.start();

    this.windNodeCleanup = () => {
      try { noiseSource.stop(); lfo.stop(); } catch { /* ignore */ }
    };
  }

  // --- Procedural Layer 3: Crypt / Hearth Low Drone ---
  private startDroneSynth() {
    if (!this.ctx || !this.droneGain) return;
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(36.7, this.ctx.currentTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(55.2, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, this.ctx.currentTime);
    filter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(this.droneGain);

    osc1.start();
    osc2.start();

    this.droneNodeCleanup = () => {
      try { osc1.stop(); osc2.stop(); } catch { /* ignore */ }
    };
  }

  // --- Procedural Layer 4: Worn Cassette Tape Hiss ---
  private startTapeHissSynth() {
    if (!this.ctx || !this.tapeGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(3200, this.ctx.currentTime);

    const hum = this.ctx.createOscillator();
    hum.frequency.setValueAtTime(60, this.ctx.currentTime);
    const humGain = this.ctx.createGain();
    humGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    noise.connect(hp);
    hp.connect(this.tapeGain);
    hum.connect(humGain);
    humGain.connect(this.tapeGain);

    noise.start();
    hum.start();

    this.tapeHissCleanup = () => {
      try { noise.stop(); hum.stop(); } catch { /* ignore */ }
    };
  }

  // --- Public Control APIs ---

  public async setRadioStation(stationId: string, customUrl?: string) {
    await this.ensureContext();

    let url = customUrl;
    if (!url) {
      const found = STATIONS.find(s => s.id === stationId);
      url = found ? found.streamUrl : STATIONS[0].streamUrl;
    }
    this.currentStationId = stationId;

    if (!this.radioAudio) {
      this.createRadioElement();
    }
    if (!this.radioAudio) return;

    this.isSwitchingStation = true;
    this.isRadioPlaying = true;
    this.setStatus('buffering');

    // Update stream source
    this.radioAudio.src = url;
    this.radioAudio.volume = this.radioVol * this.masterVol;

    try {
      await this.radioAudio.play();
      this.isSwitchingStation = false;
      this.setStatus('playing');
      this.setVisualizerCarrier(true);
    } catch (e: unknown) {
      const err = e as { name?: string };
      // AbortError is normal when switching quickly between stations or buffering
      if (err?.name === 'AbortError') {
        return;
      }
      console.warn("Play on station switch exception:", e);
      if (this.radioAudio.error && this.radioAudio.error.code !== 1) {
        this.setStatus('error', 'Carrier connection lost');
      }
    }
  }

  public async playRadio() {
    await this.ensureContext();
    if (!this.radioAudio) {
      this.createRadioElement();
    }
    if (!this.radioAudio) return;

    if (!this.radioAudio.src) {
      await this.setRadioStation(this.currentStationId);
      return;
    }

    this.isRadioPlaying = true;
    this.setStatus('buffering');
    try {
      await this.radioAudio.play();
      this.setStatus('playing');
      this.setVisualizerCarrier(true);
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === 'AbortError') {
        return;
      }
      console.warn("Radio play exception:", e);
      this.setStatus('error', 'Carrier connection lost');
    }
  }

  public pauseRadio() {
    if (this.radioAudio) {
      this.isSwitchingStation = false;
      this.radioAudio.pause();
      this.isRadioPlaying = false;
      this.setVisualizerCarrier(false);
      this.setStatus('idle');
    }
  }

  public async toggleRadio(): Promise<boolean> {
    await this.ensureContext();
    if (this.isRadioPlaying) {
      this.pauseRadio();
      return false;
    } else {
      await this.playRadio();
      return true;
    }
  }

  public setRadioVolume(vol: number) {
    this.radioVol = Math.max(0, Math.min(1, vol));
    if (this.radioAudio) {
      this.radioAudio.volume = this.radioVol * this.masterVol;
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVol = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
    }
    if (this.radioAudio) {
      this.radioAudio.volume = this.radioVol * this.masterVol;
    }
  }

  public setAmbientLayers(config: AmbientLayerConfig) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.rainGain) this.rainGain.gain.setTargetAtTime(config.rain * 0.45, now, 0.05);
    if (this.windGain) this.windGain.gain.setTargetAtTime(config.wind * 0.5, now, 0.05);
    if (this.droneGain) this.droneGain.gain.setTargetAtTime(config.drone * 0.6, now, 0.05);
    if (this.tapeGain) this.tapeGain.gain.setTargetAtTime(config.tape * 0.35, now, 0.05);
  }

  public setDsp(config: DspConfig) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.tapeFilterNode) {
      const cutoff = 16000 - (config.tapeAge / 100) * 13200;
      this.tapeFilterNode.frequency.setTargetAtTime(cutoff, now, 0.05);
    }

    if (this.flutterLfoGain) {
      const depth = (config.wowFlutter / 100) * 0.0018;
      this.flutterLfoGain.gain.setTargetAtTime(depth, now, 0.05);
    }

    if (config.tapeSaturation) {
      this.updateDistortionCurve(0.35 + (config.tapeAge / 100) * 0.4);
    } else {
      this.updateDistortionCurve(0.0);
    }
  }

  public getVisualizerData(): { waveform: Uint8Array; frequency: Uint8Array; rms: number } {
    if (!this.analyser) {
      return {
        waveform: new Uint8Array(0),
        frequency: new Uint8Array(0),
        rms: 0
      };
    }

    const waveform = new Uint8Array(this.analyser.frequencyBinCount);
    const frequency = new Uint8Array(this.analyser.frequencyBinCount);

    this.analyser.getByteTimeDomainData(waveform);
    this.analyser.getByteFrequencyData(frequency);

    let sum = 0;
    for (let i = 0; i < waveform.length; i++) {
      const val = (waveform[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.min(1.0, Math.sqrt(sum / waveform.length) * 2.2);

    return { waveform, frequency, rms };
  }

  public cleanup() {
    this.pauseRadio();
    if (this.rainNodeCleanup) this.rainNodeCleanup();
    if (this.windNodeCleanup) this.windNodeCleanup();
    if (this.droneNodeCleanup) this.droneNodeCleanup();
    if (this.tapeHissCleanup) this.tapeHissCleanup();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}

export const audioEngine = new AudioEngine();
