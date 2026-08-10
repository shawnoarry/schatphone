const listeners = new Set()

const state = {
  track: null,
  status: 'idle',
  currentTime: 0,
  duration: 0,
  volume: 0.82,
  muted: false,
  errorCode: '',
  sessionActive: false,
}

let audio = null
let eventsBound = false

const snapshot = () => ({ ...state, track: state.track ? { ...state.track } : null })

const emit = (type = 'state') => {
  const payload = { type, snapshot: snapshot() }
  listeners.forEach((listener) => listener(payload))
}

const setState = (patch, type = 'state') => {
  Object.assign(state, patch)
  emit(type)
}

const bindAudioEvents = () => {
  if (!audio || eventsBound) return
  eventsBound = true
  audio.addEventListener('loadstart', () => setState({ status: 'buffering', errorCode: '' }))
  audio.addEventListener('waiting', () => setState({ status: 'buffering' }))
  audio.addEventListener('canplay', () => {
    if (audio?.paused) setState({ status: 'paused' })
  })
  audio.addEventListener('play', () => setState({ status: 'playing', errorCode: '', sessionActive: true }))
  audio.addEventListener('playing', () => setState({ status: 'playing', errorCode: '', sessionActive: true }))
  audio.addEventListener('pause', () => {
    if (state.status !== 'ended') setState({ status: state.track ? 'paused' : 'idle' })
  })
  audio.addEventListener('timeupdate', () => {
    setState(
      {
        currentTime: Math.max(0, Number(audio?.currentTime) || 0),
        duration: Math.max(0, Number(audio?.duration) || state.track?.durationSec || 0),
      },
      'timeupdate',
    )
  })
  audio.addEventListener('durationchange', () => {
    setState({ duration: Math.max(0, Number(audio?.duration) || state.track?.durationSec || 0) })
  })
  audio.addEventListener('volumechange', () => {
    setState({
      volume: Math.max(0, Math.min(1, Number(audio?.volume) || 0)),
      muted: audio?.muted === true,
    })
  })
  audio.addEventListener('ended', () => setState({ status: 'ended', currentTime: 0 }, 'ended'))
  audio.addEventListener('error', () =>
    setState({ status: 'error', errorCode: 'AUDIO_UNAVAILABLE', sessionActive: true }, 'error'),
  )
}

const ensureAudio = () => {
  if (audio) return audio
  if (typeof Audio !== 'function') return null
  audio = new Audio()
  audio.preload = 'metadata'
  audio.volume = state.volume
  audio.muted = state.muted
  bindAudioEvents()
  return audio
}

const syncMediaSession = (track) => {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  try {
    if (typeof MediaMetadata === 'function') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track?.title || '',
        artist: track?.artist || '',
        album: track?.album || '',
        artwork: track?.coverUrl
          ? [
              { src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      })
    }
  } catch {
    // Media Session metadata is an enhancement; playback remains authoritative.
  }
}

export const musicPlaybackRuntime = {
  getSnapshot: snapshot,

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {}
    listeners.add(listener)
    listener({ type: 'initial', snapshot: snapshot() })
    return () => listeners.delete(listener)
  },

  async load(track, { autoplay = false } = {}) {
    const player = ensureAudio()
    if (!player) {
      setState({ track, status: 'error', errorCode: 'AUDIO_UNSUPPORTED', sessionActive: true }, 'error')
      return { ok: false, code: 'AUDIO_UNSUPPORTED' }
    }
    if (!track?.audioUrl) {
      setState({ track, status: 'error', errorCode: 'AUDIO_URL_MISSING', sessionActive: true }, 'error')
      return { ok: false, code: 'AUDIO_URL_MISSING' }
    }
    player.pause()
    player.src = track.audioUrl
    player.currentTime = 0
    setState({
      track: { ...track },
      status: 'paused',
      currentTime: 0,
      duration: track.durationSec || 0,
      errorCode: '',
      sessionActive: true,
    })
    syncMediaSession(track)
    player.load()
    return autoplay ? this.play() : { ok: true }
  },

  async play() {
    const player = ensureAudio()
    if (!player || !state.track) return { ok: false, code: 'TRACK_MISSING' }
    try {
      await player.play()
      return { ok: true }
    } catch (error) {
      const code = error?.name === 'NotAllowedError' ? 'PLAYBACK_GESTURE_REQUIRED' : 'PLAYBACK_FAILED'
      setState({ status: 'error', errorCode: code, sessionActive: true }, 'error')
      return { ok: false, code }
    }
  },

  pause() {
    if (!audio) return false
    audio.pause()
    return true
  },

  stop() {
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    setState({
      track: null,
      status: 'idle',
      currentTime: 0,
      duration: 0,
      errorCode: '',
      sessionActive: false,
    })
  },

  seek(seconds) {
    if (!audio || !state.track) return false
    const duration = Math.max(0, Number(audio.duration) || state.duration || 0)
    const target = Math.max(0, Math.min(duration || Number(seconds) || 0, Number(seconds) || 0))
    audio.currentTime = target
    setState({ currentTime: target }, 'timeupdate')
    return true
  },

  setVolume(value) {
    const volume = Math.max(0, Math.min(1, Number(value) || 0))
    state.volume = volume
    const player = ensureAudio()
    if (player) player.volume = volume
    emit('volumechange')
  },

  setMuted(value) {
    const muted = value === true
    state.muted = muted
    const player = ensureAudio()
    if (player) player.muted = muted
    emit('volumechange')
  },

  setMediaActionHandlers(handlers = {}) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const actionMap = {
      play: handlers.play,
      pause: handlers.pause,
      previoustrack: handlers.previous,
      nexttrack: handlers.next,
      seekto: handlers.seekTo,
    }
    Object.entries(actionMap).forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, typeof handler === 'function' ? handler : null)
      } catch {
        // Unsupported Media Session actions are ignored per browser capability.
      }
    })
  },
}
