// VOX-84 // PHOSPHOR DECK - Web Audio Engine & Procedural Synthesizers

export interface Station {
  id: string;
  name: string;
  genre: string;
  streamUrl: string;
  description: string;
  icon: string;
}

// 8 High-Bandwidth, 100% Reliable, CORS-Enabled Live Icecast Streams
export const STATIONS: Station[] = [
  {
    id: 'soma-dronezone',
    name: 'SomaFM • Drone Zone',
    genre: 'Atmospheric Space / Drone',
    streamUrl: 'https://ice2.somafm.com/dronezone-128-mp3',
    description: 'Served best chilled, safe with most medications. Atmospheric ambient space.',
    icon: '🌌'
  },
  {
    id: 'soma-darkzone',
    name: 'SomaFM • Dark Zone',
    genre: 'Subterranean Ambient',
    streamUrl: 'https://ice2.somafm.com/darkzone-128-mp3',
    description: 'Dark ambient, drone, and industrial soundscapes for deep focus.',
    icon: '🕯️'
  },
  {
    id: 'soma-vaporwaves',
    name: 'SomaFM • Vaporwaves',
    genre: 'Vaporwave / Nostalgia',
    streamUrl: 'https://ice2.somafm.com/vaporwaves-128-mp3',
    description: 'All Vaporwave, all the time. Mallsoft, future funk, and retro surrealism.',
    icon: '🌴'
  },
  {
    id: 'soma-groovesalad',
    name: 'SomaFM • Groove Salad',
    genre: 'Downtempo / Ambient Chill',
    streamUrl: 'https://ice2.somafm.com/groovesalad-128-mp3',
    description: 'A nicely chilled plate of ambient/downtempo beats and grooves.',
    icon: '🥗'
  },
  {
    id: 'soma-defcon',
    name: 'SomaFM • DEF CON Radio',
    genre: 'Underground Hacker / Bass',
    streamUrl: 'https://ice2.somafm.com/defcon-128-mp3',
    description: 'Music for hacking, investigating, coding, and the digital underground.',
    icon: '💻'
  },
  {
    id: 'soma-spacestation',
    name: 'SomaFM • Space Station',
    genre: 'Mid-Tempo Ambient Spacemusic',
    streamUrl: 'https://ice2.somafm.com/spacestation-128-mp3',
    description: 'Mid-tempo electronic ambient music for orbiting celestial bodies.',
    icon: '🛰️'
  },
  {
    id: 'soma-lush',
    name: 'SomaFM • Lush',
    genre: 'Sensuous Ethereal Electronics',
    streamUrl: 'https://ice2.somafm.com/lush-128-mp3',
    description: 'Sensuous and mellow vocals, mostly female, with an electronic influence.',
    icon: '✨'
  },
  {
    id: 'soma-secretagent',
    name: 'SomaFM • Secret Agent',
    genre: 'Retro Spy / Noir / Lounge',
    streamUrl: 'https://ice2.somafm.com/secretagent-128-mp3',
    description: 'The soundtrack for your stylish, secret, dangerous life. Shaken, not stirred.',
    icon: '🕵️'
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
  private radioSourceNode: MediaElementAudioSourceNode | null = null;
  private radioGainNode: GainNode | null = null;

  // Master DSP nodes
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private tapeFilterNode: BiquadFilterNode | null = null;
  private waveshaperNode: WaveShaperNode | null = null;
  private flutterDelayNode: DelayNode | null = null;
  private flutterLfoGain: GainNode | null = null;
  private flutterLfoOsc: OscillatorNode | null = null;

  // Ambient Layer Nodes
  private ambientBusGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private tapeGain: GainNode | null = null;

  private isInitialized = false;
  private isRadioPlaying = false;
  private currentStationId = STATIONS[0].id;
  private status: PlaybackStatus = 'idle';
  private statusListeners: ((status: PlaybackStatus, error?: string) => void)[] = [];

  // Trackers
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
        console.warn("Failed to resume AudioContext:", e);
      }
    }

    if (!this.isInitialized) {
      this.setupAudioGraph();
    }
  }

  private setupAudioGraph() {
    if (!this.ctx) return;

    // 1. Master Analyser & Gain
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.85;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    // 2. Tape Saturation (Waveshaper)
    this.waveshaperNode = this.ctx.createWaveShaper();
    this.updateDistortionCurve(0.2);

    // 3. Tape High-Frequency Darkening Filter
    this.tapeFilterNode = this.ctx.createBiquadFilter();
    this.tapeFilterNode.type = 'lowpass';
    this.tapeFilterNode.frequency.setValueAtTime(16000, this.ctx.currentTime);
    this.tapeFilterNode.Q.setValueAtTime(0.7, this.ctx.currentTime);

    // 4. Wow & Flutter (Variable Delay with slow oscillating LFO)
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
    // Sources -> Waveshaper -> TapeFilter -> FlutterDelay -> MasterGain -> Analyser -> Destination
    this.waveshaperNode.connect(this.tapeFilterNode);
    this.tapeFilterNode.connect(this.flutterDelayNode);
    this.flutterDelayNode.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // 6. Ambient Bus
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

    // 7. Setup Radio Element
    this.radioAudio = new Audio();
    this.radioAudio.crossOrigin = 'anonymous';
    this.radioAudio.preload = 'none';

    // Hook radio events
    this.radioAudio.addEventListener('loadstart', () => this.setStatus('buffering'));
    this.radioAudio.addEventListener('waiting', () => this.setStatus('buffering'));
    this.radioAudio.addEventListener('playing', () => {
      this.isRadioPlaying = true;
      this.setStatus('playing');
    });
    this.radioAudio.addEventListener('pause', () => {
      this.isRadioPlaying = false;
      this.setStatus('idle');
    });
    this.radioAudio.addEventListener('error', (e) => {
      console.error("Radio element error event:", e);
      this.setStatus('error', 'Carrier connection lost');
    });

    try {
      this.radioSourceNode = this.ctx.createMediaElementSource(this.radioAudio);
      this.radioGainNode = this.ctx.createGain();
      this.radioGainNode.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.radioSourceNode.connect(this.radioGainNode);
      this.radioGainNode.connect(this.waveshaperNode);
    } catch (e) {
      console.warn("MediaElementSource hookup note:", e);
    }

    this.isInitialized = true;
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

    if (!this.radioAudio) return;

    this.setStatus('buffering');
    this.radioAudio.src = url;
    this.radioAudio.load();

    try {
      await this.radioAudio.play();
      this.isRadioPlaying = true;
      this.setStatus('playing');
    } catch (e) {
      console.warn("Direct play attempt note:", e);
      // Auto-fallback: if crossOrigin blocked it, try direct without crossOrigin
      if (this.radioAudio.crossOrigin) {
        console.log("Retrying stream with relaxed CORS policy...");
        this.radioAudio.crossOrigin = null;
        this.radioAudio.src = url;
        this.radioAudio.load();
        try {
          await this.radioAudio.play();
          this.isRadioPlaying = true;
          this.setStatus('playing');
        } catch (e2) {
          console.error("Secondary play error:", e2);
          this.setStatus('error', 'Station unreachable');
        }
      } else {
        this.setStatus('error', 'Station unreachable');
      }
    }
  }

  public async playRadio() {
    await this.ensureContext();
    if (!this.radioAudio) return;

    if (!this.radioAudio.src) {
      await this.setRadioStation(this.currentStationId);
      return;
    }

    this.setStatus('buffering');
    try {
      await this.radioAudio.play();
      this.isRadioPlaying = true;
      this.setStatus('playing');
    } catch (e) {
      console.error("Radio play error:", e);
      this.setStatus('error', 'Play blocked by browser');
    }
  }

  public pauseRadio() {
    if (this.radioAudio) {
      this.radioAudio.pause();
      this.isRadioPlaying = false;
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
    if (this.radioGainNode && this.ctx) {
      this.radioGainNode.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
    if (this.radioAudio) {
      this.radioAudio.volume = Math.max(0, Math.min(1, vol));
    }
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
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
