const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value))

const tone = (frequencies, duration, gain = 1) => ({
  frequencies: Array.isArray(frequencies) ? frequencies : [frequencies],
  duration,
  gain,
})

const silence = (duration) => ({ frequencies: [], duration, gain: 0 })

const CLASSIC_CALL_AUDIO_PATTERNS = Object.freeze({
  'dial-tone': [tone([350, 440], 1400)],
  ringback: [tone([440, 480], 1800), silence(4000)],
  'call-waiting': [tone([440, 480], 300), silence(100), tone([440, 480], 300), silence(3000)],
  'busy-tone': [tone([480, 620], 500), silence(500)],
  'unassigned-number': [
    tone(425, 250),
    silence(250),
    tone(425, 250),
    silence(250),
    tone(425, 250),
    silence(700),
  ],
  'no-service': [
    tone(950, 180),
    silence(120),
    tone(700, 220),
    silence(120),
    tone(450, 300),
    silence(500),
  ],
  voicemail: [tone([350, 440], 650), silence(120), tone(1000, 360), silence(180)],
  connected: [tone([440, 480], 180)],
  'call-ended': [tone([480, 620], 250), silence(160), tone([480, 620], 250)],
})

const MOBILE_CALL_AUDIO_PATTERNS = Object.freeze({
  'dial-tone': [tone([425, 475], 1200, 0.82)],
  ringback: [tone([425, 475], 1000, 0.86), silence(3500)],
  'call-waiting': [tone(880, 180, 0.8), silence(120), tone(880, 180, 0.8), silence(2800)],
  'busy-tone': [tone(425, 350, 0.82), silence(350)],
  'unassigned-number': [tone(425, 220, 0.78), silence(180), tone(425, 220, 0.78), silence(600)],
  'no-service': [
    tone(880, 160, 0.76),
    silence(100),
    tone(660, 200, 0.76),
    silence(100),
    tone(440, 240, 0.76),
  ],
  voicemail: [tone(425, 480, 0.78), silence(100), tone(880, 300, 0.78), silence(120)],
  connected: [tone(660, 160, 0.78)],
  'call-ended': [tone(660, 180, 0.78), silence(120), tone(440, 220, 0.78)],
})

const RESTRAINED_CALL_AUDIO_PATTERNS = Object.freeze({
  'dial-tone': [tone([392, 494], 900, 0.68)],
  ringback: [tone([392, 494], 700, 0.7), silence(2600)],
  'call-waiting': [tone(784, 150, 0.66), silence(110), tone(784, 150, 0.66), silence(2400)],
  'busy-tone': [tone(392, 260, 0.68), silence(280)],
  'unassigned-number': [tone(392, 180, 0.62), silence(160), tone(392, 180, 0.62), silence(500)],
  'no-service': [
    tone(784, 130, 0.6),
    silence(100),
    tone(523, 160, 0.6),
    silence(100),
    tone(392, 210, 0.6),
  ],
  voicemail: [tone([392, 494], 360, 0.64), silence(100), tone(784, 220, 0.64), silence(100)],
  connected: [tone(523, 130, 0.62)],
  'call-ended': [tone(523, 140, 0.62), silence(100), tone(392, 170, 0.62)],
})

export const DEFAULT_CALL_AUDIO_PROFILE = 'classic-telephone'

export const CALL_AUDIO_PROFILE_OPTIONS = Object.freeze([
  {
    id: 'classic-telephone',
    labelZh: '经典电话',
    labelEn: 'Classic telephone',
    descriptionZh: '熟悉的固定电话双频节奏，适合回铃、忙线和状态提示。',
    descriptionEn: 'Familiar PSTN-style dual-tone cadences for ringback, busy, and status cues.',
    patterns: CLASSIC_CALL_AUDIO_PATTERNS,
  },
  {
    id: 'mobile-carrier',
    labelZh: '移动网络',
    labelEn: 'Mobile carrier',
    descriptionZh: '更短、更轻的移动网络状态音，适合现代电话模式。',
    descriptionEn: 'Shorter, lighter carrier-style cues for a modern phone mode.',
    patterns: MOBILE_CALL_AUDIO_PATTERNS,
  },
  {
    id: 'restrained-line',
    labelZh: '克制线路',
    labelEn: 'Restrained line',
    descriptionZh: '低存在感的短提示，保留通话状态但减少打扰。',
    descriptionEn: 'Quiet short cues that preserve call state without demanding attention.',
    patterns: RESTRAINED_CALL_AUDIO_PATTERNS,
  },
])

export const CALL_AUDIO_CUE_OPTIONS = Object.freeze([
  { id: 'dial-tone', labelZh: '拨号音', labelEn: 'Dial tone' },
  { id: 'ringback', labelZh: '回铃音', labelEn: 'Ringback' },
  { id: 'call-waiting', labelZh: '呼叫等待', labelEn: 'Call waiting' },
  { id: 'busy-tone', labelZh: '忙线音', labelEn: 'Busy tone' },
  { id: 'unassigned-number', labelZh: '空号提示', labelEn: 'Unassigned number' },
  { id: 'no-service', labelZh: '无服务提示', labelEn: 'No service' },
  { id: 'voicemail', labelZh: '语音信箱提示', labelEn: 'Voicemail prompt' },
  { id: 'call-ended', labelZh: '通话结束', labelEn: 'Call ended' },
])

const DTMF_FREQUENCIES = Object.freeze({
  1: [697, 1209],
  2: [697, 1336],
  3: [697, 1477],
  4: [770, 1209],
  5: [770, 1336],
  6: [770, 1477],
  7: [852, 1209],
  8: [852, 1336],
  9: [852, 1477],
  '*': [941, 1209],
  0: [941, 1336],
  '#': [941, 1477],
})

const activePlaybacks = new Set()
let audioContext = null

const resolveProfile = (profileId) =>
  CALL_AUDIO_PROFILE_OPTIONS.find((profile) => profile.id === profileId) ||
  CALL_AUDIO_PROFILE_OPTIONS.find((profile) => profile.id === DEFAULT_CALL_AUDIO_PROFILE) ||
  CALL_AUDIO_PROFILE_OPTIONS[0]

export const normalizeCallAudioProfile = (profileId) => resolveProfile(profileId).id

export const getCallAudioProfile = (profileId) => resolveProfile(profileId)

export const getCallAudioCueLabel = (cueId, t = (zh) => zh) => {
  const cue = CALL_AUDIO_CUE_OPTIONS.find((item) => item.id === cueId)
  return cue ? t(cue.labelZh, cue.labelEn) : ''
}

export const resolveGlobalCallAudioSettings = (appearance = {}) => ({
  enabled: appearance?.callAudioEnabled !== false,
  profile: normalizeCallAudioProfile(appearance?.callAudioProfile),
})

const getAudioContext = () => {
  if (typeof window === 'undefined') return null
  const Context = window.AudioContext || window.webkitAudioContext
  if (typeof Context !== 'function') return null
  if (!audioContext) {
    try {
      audioContext = new Context()
    } catch {
      return null
    }
  }
  return audioContext
}

const stopPlayback = (playback) => {
  if (!playback || playback.stopped) return
  playback.stopped = true
  for (const timer of playback.timers) clearTimeout(timer)
  playback.timers.clear()
  for (const oscillator of playback.oscillators) {
    try {
      oscillator.stop()
    } catch {
      // The oscillator may already have completed.
    }
  }
  playback.oscillators.clear()
  activePlaybacks.delete(playback)
}

export const stopCallAudio = () => {
  for (const playback of [...activePlaybacks]) stopPlayback(playback)
}

const resolvePattern = (profile, cue, key) => {
  if (cue === 'dtmf') {
    const frequencies = DTMF_FREQUENCIES[String(key || '')]
    return frequencies ? [tone(frequencies, 120, 0.55)] : []
  }
  return profile.patterns[cue] || profile.patterns['call-ended']
}

const schedulePattern = (context, pattern, volume, playback) => {
  const startAt = context.currentTime + 0.02
  let offset = 0

  for (const segment of pattern) {
    const durationSec = Math.max(0.01, Number(segment.duration || 0) / 1000)
    const frequencies = Array.isArray(segment.frequencies)
      ? segment.frequencies.filter(Boolean)
      : []
    if (frequencies.length) {
      const gain = context.createGain()
      const segmentGain = clamp(Number(segment.gain) || 1, 0, 1)
      const peak = clamp(volume * segmentGain, 0, 1)
      const segmentStart = startAt + offset
      const segmentEnd = segmentStart + durationSec
      gain.gain.setValueAtTime(0, segmentStart)
      gain.gain.linearRampToValueAtTime(peak, segmentStart + Math.min(0.02, durationSec / 4))
      gain.gain.setValueAtTime(
        peak,
        Math.max(segmentStart, segmentEnd - Math.min(0.03, durationSec / 4)),
      )
      gain.gain.linearRampToValueAtTime(0, segmentEnd)
      gain.connect(context.destination)
      for (const frequency of frequencies) {
        const oscillator = context.createOscillator()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency, segmentStart)
        oscillator.connect(gain)
        oscillator.addEventListener?.('ended', () => playback.oscillators.delete(oscillator))
        oscillator.start(segmentStart)
        oscillator.stop(segmentEnd + 0.02)
        playback.oscillators.add(oscillator)
      }
    }
    offset += durationSec
  }

  return offset
}

export const playCallAudio = (
  cue,
  { profile: profileId, loop = false, volume = 0.28, key = '' } = {},
) => {
  if (typeof cue !== 'string' || !cue) return null
  const context = getAudioContext()
  if (!context) return null
  const profile = resolveProfile(profileId)
  const pattern = resolvePattern(profile, cue, key)
  if (!pattern.length) return null

  stopCallAudio()
  const playback = {
    stopped: false,
    timers: new Set(),
    oscillators: new Set(),
  }
  activePlaybacks.add(playback)
  playback.stop = () => stopPlayback(playback)

  const run = () => {
    if (playback.stopped) return
    const durationSec = schedulePattern(
      context,
      pattern,
      clamp(Number(volume) || 0.28, 0, 1),
      playback,
    )
    if (loop) {
      const timer = setTimeout(
        () => {
          playback.timers.delete(timer)
          run()
        },
        Math.max(60, durationSec * 1000 + 40),
      )
      playback.timers.add(timer)
      return
    }
    const timer = setTimeout(
      () => {
        playback.timers.delete(timer)
        stopPlayback(playback)
      },
      Math.max(80, durationSec * 1000 + 80),
    )
    playback.timers.add(timer)
  }

  try {
    if (context.state === 'suspended') Promise.resolve(context.resume()).catch(() => {})
    run()
  } catch {
    stopPlayback(playback)
    return null
  }
  return playback
}
