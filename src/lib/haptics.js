export const HAPTIC_PATTERNS = Object.freeze({
  tap: 10,
  light: 8,
  medium: 12,
  heavy: 16,
  success: [12, 60, 24],
  warning: [20, 50, 20],
  message: [15, 40, 15],
  ring: [420, 220, 420],
})

export const isHapticSupported = () =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export const playHaptic = (pattern = HAPTIC_PATTERNS.tap, { enabled = true } = {}) => {
  if (enabled === false) return false
  if (!isHapticSupported()) return false
  try {
    return navigator.vibrate(pattern)
  } catch {
    return false
  }
}

const patternCycleMs = (pattern) =>
  (Array.isArray(pattern) ? pattern.reduce((total, step) => total + step, 0) : pattern) + 1400

let ringVibrationTimerId = null

export const stopRingVibration = () => {
  if (!ringVibrationTimerId) return
  clearInterval(ringVibrationTimerId)
  ringVibrationTimerId = null
  if (isHapticSupported()) {
    try {
      navigator.vibrate(0)
    } catch {
      // Canceling is best-effort.
    }
  }
}

export const startRingVibration = ({ enabled = true, pattern = HAPTIC_PATTERNS.ring } = {}) => {
  stopRingVibration()
  if (enabled === false) return false
  if (!isHapticSupported()) return false
  const vibrate = () => {
    try {
      navigator.vibrate(pattern)
    } catch {
      // Vibration is best-effort.
    }
  }
  vibrate()
  ringVibrationTimerId = setInterval(vibrate, patternCycleMs(pattern))
  return true
}
