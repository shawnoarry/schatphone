import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  HAPTIC_PATTERNS,
  isHapticSupported,
  playHaptic,
  startRingVibration,
  stopRingVibration,
} from '../src/lib/haptics'

const vibrateMock = vi.fn(() => true)
const originalNavigator = window.navigator

const installVibrateStub = (enabled = true) => {
  if (!enabled) {
    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, vibrate: undefined },
      configurable: true,
    })
    return
  }
  Object.defineProperty(window, 'navigator', {
    value: { ...originalNavigator, vibrate: vibrateMock },
    configurable: true,
  })
}

const restoreNavigator = () => {
  Object.defineProperty(window, 'navigator', {
    value: originalNavigator,
    configurable: true,
  })
}

describe('haptics service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    installVibrateStub()
  })

  afterEach(() => {
    stopRingVibration()
    restoreNavigator()
    vi.useRealTimers()
  })

  test('reports support from navigator.vibrate availability', () => {
    expect(isHapticSupported()).toBe(true)
    restoreNavigator()
    installVibrateStub(false)
    expect(isHapticSupported()).toBe(false)
  })

  test('passes patterns through and respects the enabled gate', () => {
    expect(playHaptic(HAPTIC_PATTERNS.message)).toBe(true)
    expect(vibrateMock).toHaveBeenLastCalledWith(HAPTIC_PATTERNS.message)

    expect(playHaptic(12, { enabled: false })).toBe(false)
    expect(vibrateMock).toHaveBeenCalledTimes(1)
  })

  test('is a silent no-op without navigator support', () => {
    restoreNavigator()
    installVibrateStub(false)
    expect(playHaptic(HAPTIC_PATTERNS.tap)).toBe(false)
    expect(startRingVibration()).toBe(false)
    expect(vibrateMock).not.toHaveBeenCalled()
  })

  test('ring vibration loops the ring pattern and stops cleanly', () => {
    expect(startRingVibration()).toBe(true)
    expect(vibrateMock).toHaveBeenCalledTimes(1)
    expect(vibrateMock).toHaveBeenLastCalledWith(HAPTIC_PATTERNS.ring)

    vi.advanceTimersByTime(420 + 220 + 420 + 1400)
    expect(vibrateMock).toHaveBeenCalledTimes(2)

    stopRingVibration()
    vi.advanceTimersByTime(5000)
    expect(vibrateMock).toHaveBeenCalledTimes(3)
    expect(vibrateMock).toHaveBeenLastCalledWith(0)

    stopRingVibration()
    expect(vibrateMock).toHaveBeenCalledTimes(3)
  })

  test('starting a new ring vibration resets the previous loop', () => {
    startRingVibration()
    startRingVibration({ pattern: [100, 100, 100] })
    vi.advanceTimersByTime(10_000)
    const patterns = vibrateMock.mock.calls.map((call) => JSON.stringify(call[0]))
    expect(patterns.filter((item) => item === JSON.stringify([100, 100, 100])).length).toBeGreaterThanOrEqual(3)
  })
})
