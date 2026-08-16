import { beforeEach, describe, expect, test, vi } from 'vitest'

const playMock = vi.fn(() => ({ stop: () => {} }))
const unlockMock = vi.fn(async () => true)
const createUISFXMock = vi.fn(() => ({
  play: playMock,
  unlock: unlockMock,
}))

vi.mock('uisfx', () => ({
  createUISFX: (...args) => createUISFXMock(...args),
}))

const resetModuleState = async () => {
  vi.resetModules()
  return await import('../src/lib/ui-sfx')
}

describe('ui-sfx service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('creates one lazy player with the project pack settings', async () => {
    const fresh = await resetModuleState()
    expect(createUISFXMock).not.toHaveBeenCalled()
    fresh.playUiCue('send')
    expect(createUISFXMock).toHaveBeenCalledTimes(1)
    expect(createUISFXMock).toHaveBeenCalledWith({ pack: 'soft', volume: 0.5 })
    fresh.playUiCue('notification', { cooldownMs: 1500 })
    expect(createUISFXMock).toHaveBeenCalledTimes(1)
  })

  test('delegates cues and options to the player', async () => {
    const fresh = await resetModuleState()
    fresh.playUiCue('notification', { cooldownMs: 1500 })
    expect(playMock).toHaveBeenCalledWith('notification', { cooldownMs: 1500 })
  })

  test('ignores empty cues and play failures', async () => {
    const fresh = await resetModuleState()
    expect(fresh.playUiCue('')).toBeNull()
    expect(fresh.playUiCue(null)).toBeNull()
    playMock.mockImplementationOnce(() => {
      throw new Error('no audio')
    })
    expect(fresh.playUiCue('send')).toBeNull()
  })

  test('unlock runs once and swallows unlock failures', async () => {
    const fresh = await resetModuleState()
    unlockMock.mockImplementationOnce(() => {
      throw new Error('suspended')
    })
    fresh.unlockUiSfx()
    fresh.unlockUiSfx()
    await Promise.resolve()
    expect(unlockMock).toHaveBeenCalledTimes(1)
  })
})
