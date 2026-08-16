import { createUISFX } from 'uisfx'

const UI_SFX_PACK = 'soft'
const UI_SFX_VOLUME = 0.5

let player = null
let playerFailed = false
let unlockStarted = false

const resolvePlayer = () => {
  if (player) return player
  if (playerFailed) return null
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  try {
    player = createUISFX({
      pack: UI_SFX_PACK,
      volume: UI_SFX_VOLUME,
    })
  } catch {
    playerFailed = true
    return null
  }
  return player
}

export const playUiCue = (cue, options = {}) => {
  if (typeof cue !== 'string' || !cue) return null
  const activePlayer = resolvePlayer()
  if (!activePlayer) return null
  try {
    return activePlayer.play(cue, options)
  } catch {
    return null
  }
}

export const unlockUiSfx = () => {
  if (unlockStarted) return
  unlockStarted = true
  const activePlayer = resolvePlayer()
  if (!activePlayer) return
  try {
    Promise.resolve(activePlayer.unlock()).catch(() => {})
  } catch {
    // Audio unlock is best-effort; playback stays silent on failure.
  }
}
