import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve('super_sean_007_full_project_wired');
const audioRoot = path.join(projectRoot, 'assets', 'audio');
const manifestPath = path.join(projectRoot, 'data', 'audio-manifest.json');
const sampleRate = 44100;

function clamp(value) {
  return Math.max(-1, Math.min(1, value));
}

function writeWav(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(Math.round(clamp(samples[i]) * 32767), 44 + i * 2);
  }
  return buffer;
}

function sine(freq, time) {
  return Math.sin(Math.PI * 2 * freq * time);
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function square(freq, time) {
  return sine(freq, time) >= 0 ? 1 : -1;
}

function envelope(time, duration, attack = 0.015, release = 0.12) {
  const a = Math.min(1, time / attack);
  const r = Math.min(1, (duration - time) / release);
  return Math.max(0, Math.min(a, r));
}

function makeMusic({ duration, bpm, chords, lead, pad = 0.18 }) {
  const total = Math.floor(duration * sampleRate);
  const samples = new Float32Array(total);
  const beat = 60 / bpm;
  for (let i = 0; i < total; i += 1) {
    const t = i / sampleRate;
    const chord = chords[Math.floor(t / (beat * 4)) % chords.length];
    let value = 0;
    chord.forEach((note, index) => {
      value += sine(note, t) * (pad / (index + 1));
      value += sine(note * 2, t) * 0.025;
    });
    const leadNote = lead[Math.floor(t / beat) % lead.length];
    const pulse = envelope(t % beat, beat, 0.01, 0.18);
    value += square(leadNote, t) * pulse * 0.08;
    value += sine(leadNote * 2, t) * pulse * 0.04;
    samples[i] = value * 0.55;
  }
  return samples;
}

function makeSfx({ duration, start, end = start, wave = 'sine', gain = 0.45, noise = 0 }) {
  const total = Math.floor(duration * sampleRate);
  const samples = new Float32Array(total);
  const random = seededRandom(hashString(`${duration}:${start}:${end}:${wave}:${gain}:${noise}`));
  for (let i = 0; i < total; i += 1) {
    const t = i / sampleRate;
    const p = t / duration;
    const freq = start + (end - start) * p;
    const tone = wave === 'square' ? square(freq, t) : sine(freq, t);
    const hiss = (random() * 2 - 1) * noise;
    samples[i] = (tone + hiss) * envelope(t, duration, 0.005, duration * 0.62) * gain;
  }
  return samples;
}

const assets = [
  {
    type: 'music',
    id: 'title',
    file: 'assets/audio/music/title-theme.wav',
    loop: true,
    description: 'Bright title theme for the key-art screen.',
    samples: makeMusic({
      duration: 16,
      bpm: 108,
      chords: [[261.63, 329.63, 392], [293.66, 369.99, 440], [246.94, 329.63, 392], [261.63, 349.23, 440]],
      lead: [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 440, 493.88]
    })
  },
  {
    type: 'music',
    id: 'village',
    file: 'assets/audio/music/village-loop.wav',
    loop: true,
    description: 'Soft village exploration loop.',
    samples: makeMusic({
      duration: 14,
      bpm: 92,
      chords: [[220, 277.18, 329.63], [246.94, 293.66, 369.99], [196, 246.94, 293.66], [174.61, 220, 261.63]],
      lead: [440, 493.88, 523.25, 493.88, 392, 440, 329.63, 369.99],
      pad: 0.14
    })
  },
  {
    type: 'music',
    id: 'battle',
    file: 'assets/audio/music/battle-loop.wav',
    loop: true,
    description: 'Energetic JRPG battle loop.',
    samples: makeMusic({
      duration: 12,
      bpm: 138,
      chords: [[220, 261.63, 329.63], [196, 246.94, 293.66], [233.08, 277.18, 349.23], [246.94, 293.66, 369.99]],
      lead: [659.25, 659.25, 587.33, 523.25, 783.99, 659.25, 587.33, 493.88],
      pad: 0.11
    })
  },
  {
    type: 'music',
    id: 'victory',
    file: 'assets/audio/music/victory-fanfare.wav',
    loop: false,
    description: 'Short victory fanfare after battle.',
    samples: makeMusic({
      duration: 4,
      bpm: 120,
      chords: [[261.63, 329.63, 392], [329.63, 392, 523.25], [392, 493.88, 659.25], [523.25, 659.25, 783.99]],
      lead: [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1174.66, 1318.51],
      pad: 0.2
    })
  },
  { type: 'sfx', id: 'ui_confirm', file: 'assets/audio/sfx/ui-confirm.wav', description: 'Menu confirm chirp.', samples: makeSfx({ duration: 0.18, start: 660, end: 990 }) },
  { type: 'sfx', id: 'menu_open', file: 'assets/audio/sfx/menu-open.wav', description: 'Quest/inventory open sound.', samples: makeSfx({ duration: 0.22, start: 440, end: 660, gain: 0.32 }) },
  { type: 'sfx', id: 'slash', file: 'assets/audio/sfx/slash.wav', description: 'Crystal Slash sweep.', samples: makeSfx({ duration: 0.32, start: 880, end: 180, wave: 'square', gain: 0.28, noise: 0.35 }) },
  { type: 'sfx', id: 'hit', file: 'assets/audio/sfx/hit.wav', description: 'Enemy hit impact.', samples: makeSfx({ duration: 0.2, start: 180, end: 70, wave: 'square', gain: 0.38, noise: 0.28 }) },
  { type: 'sfx', id: 'chest', file: 'assets/audio/sfx/chest.wav', description: 'Treasure chest sparkle.', samples: makeSfx({ duration: 0.5, start: 520, end: 1180, gain: 0.36 }) },
  { type: 'sfx', id: 'level_up', file: 'assets/audio/sfx/level-up.wav', description: 'Level-up sparkle.', samples: makeSfx({ duration: 0.65, start: 392, end: 1568, gain: 0.34 }) },
  { type: 'sfx', id: 'reward', file: 'assets/audio/sfx/reward.wav', description: 'Rewarded ad placeholder completion.', samples: makeSfx({ duration: 0.42, start: 587, end: 1175, gain: 0.34 }) },
  { type: 'sfx', id: 'portal', file: 'assets/audio/sfx/portal.wav', description: 'Region portal shimmer.', samples: makeSfx({ duration: 0.7, start: 220, end: 740, gain: 0.3, noise: 0.08 }) }
];

await mkdir(path.join(audioRoot, 'music'), { recursive: true });
await mkdir(path.join(audioRoot, 'sfx'), { recursive: true });

const manifest = {
  generatedAt: 'deterministic-build',
  format: 'PCM WAV, mono, 44.1kHz, 16-bit',
  licenseNote: 'Procedurally generated for this project by scripts/generate-audio.mjs.',
  music: {},
  sfx: {}
};

for (const asset of assets) {
  const outputPath = path.join(projectRoot, asset.file);
  await writeFile(outputPath, writeWav(asset.samples));
  manifest[asset.type][asset.id] = {
    file: asset.file,
    loop: Boolean(asset.loop),
    description: asset.description
  };
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${assets.length} audio files and data/audio-manifest.json`);
