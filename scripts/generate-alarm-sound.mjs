// Writes assets/sounds/alarm.wav — the sound task alarms and medicine
// reminders ring with, both as a notification sound and looped by the in-app
// alarm screen.
//
// Generated rather than downloaded so there's no licence to track and the
// sound can be tuned by editing numbers here: `node scripts/generate-alarm-sound.mjs`.
//
// Shape: four quick two-tone beeps, a short rest, repeat — the pattern people
// already read as "alarm clock", not "message arrived". 20 seconds long: iOS
// plays at most 30 s of a notification sound, and each alarm re-rings every
// minute or so anyway (see src/lib/alarms/ringing.ts).
//
// Uncompressed 16-bit PCM WAV, mono, 22.05 kHz: the one format both Android's
// res/raw and iOS notification sounds accept without conversion.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22050;
const DURATION_S = 20;
const AMPLITUDE = 0.85;

const BEEP_S = 0.12;
const BEEP_GAP_S = 0.08;
const BEEPS_PER_BURST = 4;
const BURST_REST_S = 0.5;
const FADE_S = 0.005;

// Two close, bright tones: cuts through background noise and small phone
// speakers better than a single pure sine.
const TONES = [
  { hz: 1760, gain: 0.6 },
  { hz: 2093, gain: 0.4 },
];

const total = SAMPLE_RATE * DURATION_S;
const samples = new Int16Array(total);
const burst = BEEPS_PER_BURST * (BEEP_S + BEEP_GAP_S) + BURST_REST_S;

for (let i = 0; i < total; i++) {
  const t = i / SAMPLE_RATE;
  const inBurst = t % burst;
  const slot = Math.floor(inBurst / (BEEP_S + BEEP_GAP_S));
  const inBeep = inBurst - slot * (BEEP_S + BEEP_GAP_S);
  if (slot >= BEEPS_PER_BURST || inBeep >= BEEP_S) continue;

  // A few milliseconds of fade either side, so beeps don't click.
  const envelope = Math.min(1, inBeep / FADE_S, (BEEP_S - inBeep) / FADE_S);
  let value = 0;
  for (const { hz, gain } of TONES) value += gain * Math.sin(2 * Math.PI * hz * t);
  samples[i] = Math.round(value * envelope * AMPLITUDE * 0x7fff);
}

const dataBytes = samples.length * 2;
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + dataBytes, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // PCM chunk size
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32); // block align
header.writeUInt16LE(16, 34); // bits per sample
header.write('data', 36);
header.writeUInt32LE(dataBytes, 40);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds', 'alarm.wav');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, Buffer.from(samples.buffer)]));
console.log(`Wrote ${out} (${((44 + dataBytes) / 1024).toFixed(0)} KB)`);
