// Synthesizes the built-in call ringtone library into public/audio/ringtones/.
// All tones are rendered in-repo from original synthesis code; the only borrowed
// material is the public-domain Gran Vals excerpt (Tárrega, d. 1909) used by
// "gran-vals". Run with: node scripts/build-ringtones.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SAMPLE_RATE = 32000
const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio', 'ringtones')

const NOTE = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98, A6: 1760.0,
  Cs4: 277.18, Fs4: 369.99, Gs4: 415.3, Cs5: 554.37, Fs5: 739.99, Gs5: 830.61,
  Cs6: 1108.73, Fs6: 1479.98, Gs6: 1661.22,
  C3: 130.81, G3: 196.0, A3: 220.0, F3: 174.61,
}

const makeBuffer = (seconds) => new Float64Array(Math.ceil(seconds * SAMPLE_RATE))

const renderTone = (freq, dur, partials, { attack = 0.004, noise = 0, seed = 1 } = {}) => {
  const total = Math.ceil(dur * SAMPLE_RATE)
  const out = new Float64Array(total)
  let random = seed
  const nextRandom = () => {
    random = (random * 1103515245 + 12345) % 2147483648
    return random / 2147483648 - 0.5
  }
  for (let i = 0; i < total; i += 1) {
    const t = i / SAMPLE_RATE
    const attackGain = t < attack ? t / attack : 1
    let sample = 0
    for (const partial of partials) {
      const amp = partial.amp * Math.exp(-t * partial.decay)
      sample += amp * Math.sin(2 * Math.PI * freq * partial.ratio * t + (partial.phase || 0))
    }
    if (noise > 0 && t < attack * 4) sample += noise * nextRandom() * (1 - t / (attack * 4))
    out[i] = sample * attackGain
  }
  return out
}

const renderPluck = (freq, dur, { blend = 0.996 } = {}) => {
  const total = Math.ceil(dur * SAMPLE_RATE)
  const out = new Float64Array(total)
  const lineLength = Math.max(2, Math.round(SAMPLE_RATE / freq))
  const line = new Float64Array(lineLength)
  let random = 12345
  const nextRandom = () => {
    random = (random * 1103515245 + 12345) % 2147483648
    return random / 2147483648 - 0.5
  }
  for (let i = 0; i < lineLength; i += 1) line[i] = nextRandom()
  let index = 0
  for (let i = 0; i < total; i += 1) {
    const current = line[index]
    const next = line[(index + 1) % lineLength]
    const filtered = (current + next) * 0.5 * blend
    line[index] = filtered
    out[i] = current
    index = (index + 1) % lineLength
  }
  return out
}

const addToBuffer = (buf, startSec, samples, gain = 1) => {
  const start = Math.round(startSec * SAMPLE_RATE)
  for (let i = 0; i < samples.length; i += 1) {
    const target = start + i
    if (target >= 0 && target < buf.length) buf[target] += samples[i] * gain
  }
}

const normalize = (buf, peak = 0.75) => {
  let max = 0
  for (const value of buf) max = Math.max(max, Math.abs(value))
  if (max < 1e-9) return buf
  const scale = peak / max
  for (let i = 0; i < buf.length; i += 1) buf[i] *= scale
  return buf
}

const writeWav = (name, buf) => {
  const data = Buffer.alloc(buf.length * 2)
  for (let i = 0; i < buf.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, buf[i]))
    data.writeInt16LE(Math.round(clamped * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  const file = join(OUT_DIR, `${name}.wav`)
  writeFileSync(file, Buffer.concat([header, data]))
  return { file, seconds: buf.length / SAMPLE_RATE }
}

const MARIMBA = (freq, dur) =>
  renderTone(freq, dur, [
    { ratio: 1, amp: 1, decay: 7 },
    { ratio: 3.93, amp: 0.22, decay: 14 },
    { ratio: 9.2, amp: 0.05, decay: 22 },
  ], { attack: 0.003, noise: 0.25 })

const PIANO = (freq, dur) =>
  renderTone(freq, dur, [
    { ratio: 1, amp: 1, decay: 2.2 },
    { ratio: 2, amp: 0.5, decay: 3 },
    { ratio: 3, amp: 0.28, decay: 3.8 },
    { ratio: 4, amp: 0.14, decay: 4.6 },
    { ratio: 5, amp: 0.07, decay: 5.4 },
    { ratio: 6, amp: 0.04, decay: 6.2 },
  ], { attack: 0.006 })

const GLOCK = (freq, dur) =>
  renderTone(freq, dur, [
    { ratio: 1, amp: 1, decay: 3.2 },
    { ratio: 2.71, amp: 0.3, decay: 5 },
    { ratio: 5.15, amp: 0.1, decay: 7 },
  ], { attack: 0.002 })

const BEEP = (freq, dur) =>
  renderTone(freq, dur, [
    { ratio: 1, amp: 1, decay: 0.9 },
    { ratio: 3, amp: 0.33, decay: 0.9 },
    { ratio: 5, amp: 0.2, decay: 0.9 },
    { ratio: 7, amp: 0.08, decay: 0.9 },
  ], { attack: 0.002 })

const bellStrike = (freq, dur = 0.14) =>
  renderTone(freq, dur, [
    { ratio: 1, amp: 1, decay: 26 },
    { ratio: 2.32, amp: 0.55, decay: 34 },
    { ratio: 3.01, amp: 0.3, decay: 42 },
    { ratio: 4.27, amp: 0.18, decay: 55 },
  ], { attack: 0.001, noise: 0.6 })

const buildGranVals = () => {
  const eighth = 0.185
  const melody = [
    [NOTE.E5, 1], [NOTE.D5, 1], [NOTE.Fs4, 2], [NOTE.Gs4, 2],
    [NOTE.Cs5, 1], [NOTE.B4, 1], [NOTE.D4, 2], [NOTE.E4, 2],
    [NOTE.B4, 1], [NOTE.A4, 1], [NOTE.Cs4, 2], [NOTE.E4, 2], [NOTE.A4, 4],
  ]
  const buf = makeBuffer(4.4)
  let cursor = 0.02
  for (const [freq, eighths] of melody) {
    const dur = eighths * eighth
    addToBuffer(buf, cursor, renderPluck(freq, dur + 0.6), 0.9)
    cursor += dur
  }
  return normalize(buf)
}

const buildMorningMarimba = () => {
  const eighth = 0.155
  const melody = [
    [NOTE.G4, 1], [NOTE.C5, 1], [NOTE.E5, 2], [NOTE.G5, 1], [NOTE.E5, 1],
    [NOTE.C5, 1], [NOTE.D5, 1], [NOTE.E5, 2], [NOTE.A4, 1], [NOTE.C5, 1],
    [NOTE.E5, 1], [NOTE.D5, 1], [NOTE.C5, 2], [NOTE.G4, 2],
  ]
  const bass = [[NOTE.C3, 0], [NOTE.G3, 4], [NOTE.A3, 8], [NOTE.F3, 12]]
  const buf = makeBuffer(4.0)
  let cursor = 0.02
  for (const [freq, eighths] of melody) {
    const dur = eighths * eighth
    addToBuffer(buf, cursor, MARIMBA(freq, dur + 0.5))
    cursor += dur
  }
  for (const [freq, beat] of bass) {
    addToBuffer(buf, 0.02 + beat * eighth, MARIMBA(freq, 0.7), 0.5)
  }
  return normalize(buf)
}

const buildSoftPiano = () => {
  const eighth = 0.24
  const melody = [
    [NOTE.A4, 1], [NOTE.Cs5, 1], [NOTE.E5, 1], [NOTE.A5, 2],
    [NOTE.Gs5, 1], [NOTE.E5, 1], [NOTE.Cs5, 1], [NOTE.A4, 2],
    [NOTE.Fs4, 1], [NOTE.A4, 1], [NOTE.Cs5, 1], [NOTE.Fs5, 2],
    [NOTE.E5, 4],
  ]
  const buf = makeBuffer(5.0)
  let cursor = 0.02
  for (const [freq, eighths] of melody) {
    const dur = eighths * eighth
    addToBuffer(buf, cursor, PIANO(freq, dur + 1.2), 0.85)
    addToBuffer(buf, cursor, PIANO(freq * 1.0015, dur + 1.2), 0.35)
    cursor += dur
  }
  return normalize(buf)
}

const buildClassicBell = () => {
  const buf = makeBuffer(6.4)
  for (const burstStart of [0.1, 2.3]) {
    for (let t = 0; t < 1.55; t += 0.05) {
      addToBuffer(buf, burstStart + t, bellStrike(830), 0.75)
      addToBuffer(buf, burstStart + t + 0.012, bellStrike(1040), 0.75)
    }
  }
  return normalize(buf)
}

const buildDigitalEarly = () => {
  const eighth = 0.115
  const phrase = [
    [NOTE.E5, 1], [NOTE.E5, 1], [NOTE.G5, 1], [NOTE.E5, 1],
    [NOTE.C6, 2], [NOTE.G5, 1], [NOTE.E5, 1], [NOTE.G5, 3],
  ]
  const buf = makeBuffer(3.6)
  for (const phraseStart of [0.05, 1.75]) {
    let cursor = phraseStart
    for (const [freq, eighths] of phrase) {
      const dur = eighths * eighth
      addToBuffer(buf, cursor, BEEP(freq, dur * 0.92), 0.8)
      cursor += dur
    }
  }
  return normalize(buf)
}

const buildGentleChime = () => {
  const eighth = 0.31
  const melody = [
    [NOTE.E6, 2], [NOTE.B5, 2], [NOTE.Gs5, 2], [NOTE.Cs6, 2],
    [NOTE.E6, 2], [NOTE.Gs6, 2], [NOTE.E6, 4],
  ]
  const buf = makeBuffer(5.2)
  let cursor = 0.02
  for (const [freq, eighths] of melody) {
    const dur = eighths * eighth
    addToBuffer(buf, cursor, GLOCK(freq, dur + 1.4), 0.8)
    cursor += dur
  }
  return normalize(buf)
}

const RESULTS = [
  ['gran-vals', buildGranVals()],
  ['morning-marimba', buildMorningMarimba()],
  ['soft-piano', buildSoftPiano()],
  ['classic-bell', buildClassicBell()],
  ['digital-early', buildDigitalEarly()],
  ['gentle-chime', buildGentleChime()],
]

mkdirSync(OUT_DIR, { recursive: true })
for (const [name, buffer] of RESULTS) {
  const { seconds } = writeWav(name, buffer)
  console.log(`${name}.wav  ${seconds.toFixed(2)}s`)
}
console.log(`written to ${OUT_DIR}`)
