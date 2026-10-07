# 📟 VOX-84 // PHOSPHOR DECK

> **Retro 1980s rackmount Hi-Fi internet radio, procedural ambient sound generator, and phosphor CRT vector oscilloscope.**

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio-Native%20DSP-00f5a0.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Phosphor Deck (VOX-84)** is a desktop audio workstation that blends continuous internet radio streaming with procedural background soundscapes, vintage analog tape coloration, and an oscilloscope visualizer inspired by 1980s laboratory test equipment and high-end Japanese stereo receivers.

---

## ✨ Features

### 📻 Curated Live Radio Tuner
- **8 High-Bandwidth Live Streams:** Dedicated channels including subterranean dungeon synth, deep dark ambient, vaporwave, lofi study beats, and ambient space drone.
- **Instant Stream Switching & Resilient Reconnection:** Smooth gain fading between stations without audio clipping.

### 🌧️ Procedural Ambient Sound Generator
Four independent soundscape generators synthesized entirely in real time using the native **Web Audio API** (zero audio sample dependencies):
- **Rain & Thunder:** Pink noise through resonant bandpass filters with randomized stereo envelope burst triggering.
- **Crypt Drone:** Dual sub-harmonic triangle/saw oscillators detuned with low-frequency modulation for dark subterranean warmth.
- **Forest Wind:** Modulated bandpass sweep across white noise creating atmospheric gust dynamics.
- **Cassette Hiss:** Filtered low-amplitude analog tape noise floor.

### 📼 Analog Tape DSP Rack
- **Tape Age:** Dynamic low-pass rolloff modeling high-frequency magnetic tape decay.
- **Wow & Flutter:** Dual sine LFOs modulating delay time to simulate capstan motor drift and tape warp.
- **Tape Saturation:** Custom cubic waveshaping transfer curve (`tanh`-style) providing musical odd-harmonic warmth and gentle analog compression.

### 🟢 Vector Phosphor Oscilloscope & Dual VU
- **HTML5 Canvas Vector Beam Engine:** Simulates real P31 phosphor decay, electron beam intensity, bloom halo, and graticule markings.
- **Multiple Visualization Modes:**
  - Real-time time-domain waveform
  - Stereo Lissajous X-Y phase trace
  - Frequency spectrum analyzer
- **Dual Backlit Analog VU Meters:** Realistic ballistic needle physics with peak hold indicators.

### 🎛️ 1980s Industrial Hardware UI
- Brushed charcoal-anodized aluminum rackmount aesthetic.
- Tactile toggle switches, LED status indicators, knurled volume pots, and phosphor green LED segment displays.

---

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Audio Processing:** Web Audio API (`AudioContext`, `BiquadFilterNode`, `WaveShaperNode`, `DelayNode`, `AnalyserNode`)
- **Rendering:** High-performance HTML5 Canvas 2D with requestAnimationFrame loop
- **Package Manager:** Bun / npm

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ or [Bun](https://bun.sh/) installed.

### Installation

```bash
# Clone the repository
git clone https://github.com/jasonpersinger/phosphor-deck.git
cd phosphor-deck

# Install dependencies (using Bun or npm)
bun install
# or
npm install
```

### Running Locally

```bash
# Start Vite development server
bun run dev
# or
npm run dev
```

Open your browser to `http://localhost:5173` to power on the deck.

### Production Build

```bash
# Build optimized static assets into dist/
bun run build
# or
npm run build
```

---

## 🎛️ Audio Signal Flow

```
[ Radio Stream ] ───┐
                    ├──> [ Mixer Bus ] ──> [ Tape Saturation ] ──> [ Wow & Flutter ] ──> [ Master Out ]
[ Procedural SFX ] ─┘                               │                                          │
  ├─ Rain                                           └──> [ AnalyserNode ] ─────────────────────┘
  ├─ Crypt Drone                                                │
  ├─ Forest Wind                                                ▼
  └─ Cassette Hiss                                   [ Vector CRT Canvas ]
```

---

## 📄 License

MIT © [Jason Persinger](https://jasonpersinger.me)
