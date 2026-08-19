export const DEFAULT_RINGTONE_ID = 'gran-vals'

export const RINGTONE_OPTIONS = Object.freeze([
  {
    id: 'gran-vals',
    labelZh: '古典华尔兹',
    labelEn: 'Classic Vals',
    file: 'audio/ringtones/gran-vals.wav',
  },
  {
    id: 'morning-marimba',
    labelZh: '晨光木琴',
    labelEn: 'Morning Marimba',
    file: 'audio/ringtones/morning-marimba.wav',
  },
  {
    id: 'soft-piano',
    labelZh: '柔板钢琴',
    labelEn: 'Soft Piano',
    file: 'audio/ringtones/soft-piano.wav',
  },
  {
    id: 'classic-bell',
    labelZh: '老式电话铃',
    labelEn: 'Classic Bell',
    file: 'audio/ringtones/classic-bell.wav',
  },
  {
    id: 'digital-early',
    labelZh: '数字时代',
    labelEn: 'Digital Early',
    file: 'audio/ringtones/digital-early.wav',
  },
  {
    id: 'gentle-chime',
    labelZh: '轻柔风铃',
    labelEn: 'Gentle Chime',
    file: 'audio/ringtones/gentle-chime.wav',
  },
])

const RINGTONE_VOLUME = 0.9
const activeRingtones = new Set()

const resolveRingtone = (ringtoneId) =>
  RINGTONE_OPTIONS.find((ringtone) => ringtone.id === ringtoneId) ||
  RINGTONE_OPTIONS.find((ringtone) => ringtone.id === DEFAULT_RINGTONE_ID) ||
  RINGTONE_OPTIONS[0]

export const normalizeRingtoneId = (ringtoneId) => {
  const ringtone = resolveRingtone(ringtoneId)
  return ringtone ? ringtone.id : DEFAULT_RINGTONE_ID
}

export const getRingtone = (ringtoneId) => resolveRingtone(ringtoneId)

export const getRingtoneLabel = (ringtoneId, t = (zh) => zh) => {
  const ringtone = resolveRingtone(ringtoneId)
  return ringtone ? t(ringtone.labelZh, ringtone.labelEn) : ''
}

const resolveAudioUrl = (audioPath) => {
  const baseUrl = import.meta.env?.BASE_URL || '/'
  return baseUrl.replace(/\/$/, '') + '/' + audioPath
}

const stopAllRingtones = () => {
  for (const audio of [...activeRingtones]) {
    try {
      audio.pause()
      audio.currentTime = 0
    } catch {
      // Stopping is best-effort.
    }
    activeRingtones.delete(audio)
  }
}

export const playRingtone = (ringtoneId, { loop = false, volume = RINGTONE_VOLUME } = {}) => {
  const ringtone = resolveRingtone(ringtoneId)
  if (!ringtone || typeof window === 'undefined' || typeof Audio === 'undefined') return null
  stopAllRingtones()
  let audio = null
  try {
    audio = new Audio(resolveAudioUrl(ringtone.file))
    audio.preload = 'auto'
    audio.loop = Boolean(loop)
    audio.volume = Math.max(0, Math.min(1, Number(volume) || RINGTONE_VOLUME))
    activeRingtones.add(audio)
    Promise.resolve(audio.play()).catch(() => {})
  } catch {
    if (audio) activeRingtones.delete(audio)
    return null
  }
  return {
    stop: () => {
      try {
        audio.pause()
        audio.currentTime = 0
      } catch {
        // Stopping is best-effort.
      }
      activeRingtones.delete(audio)
    },
  }
}

export const stopRingtone = () => {
  stopAllRingtones()
}
