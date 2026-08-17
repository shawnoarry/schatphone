import { beforeEach, describe, expect, test, vi } from 'vitest'

const playMock = vi.fn(() => ({ stop: () => {} }))
const unlockMock = vi.fn(async () => true)
const setPackMock = vi.fn()
const createUISFXMock = vi.fn(() => ({
  play: playMock,
  unlock: unlockMock,
  setPack: setPackMock,
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
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  test('creates one lazy player with the project pack settings', async () => {
    const fresh = await resetModuleState()
    expect(createUISFXMock).not.toHaveBeenCalled()
    fresh.playUiCue('send')
    expect(createUISFXMock).toHaveBeenCalledTimes(1)
    expect(createUISFXMock).toHaveBeenCalledWith({ pack: 'soft', volume: 0.5 })
    fresh.playUiCue('notification', { profile: 'minimal', cooldownMs: 1500 })
    expect(createUISFXMock).toHaveBeenCalledTimes(1)
  })

  test('normalizes the legacy arcade profile to the system profile', async () => {
    const fresh = await resetModuleState()
    expect(fresh.normalizeUiSfxProfile('arcade')).toBe('minimal')
    expect(fresh.getUiSfxProfile('arcade').visible).toBe(false)
  })

  test('switches built-in packs when the profile changes', async () => {
    const fresh = await resetModuleState()
    fresh.playUiCue('send', { profile: 'imessage' })
    expect(createUISFXMock).toHaveBeenCalledWith({ pack: 'glass', volume: 0.5 })
    fresh.playUiCue('send', { profile: 'arcade' })
    expect(setPackMock).toHaveBeenCalledWith('arcade')
    expect(playMock).toHaveBeenNthCalledWith(2, 'send', {})
  })

  test('resolves global defaults and Chat overrides independently', async () => {
    const fresh = await resetModuleState()

    expect(fresh.resolveGlobalUiSfxSettings({
      soundEffectsEnabled: false,
      soundEffectsProfile: 'kakaotalk',
    })).toMatchObject({
      enabled: false,
      profile: 'kakaotalk',
    })

    expect(fresh.resolveChatUiSfxSettings({
      soundEffectsEnabled: false,
      soundEffectsProfile: 'wechat',
      chat: {},
    })).toMatchObject({
      enabled: false,
      profile: 'wechat',
      followsGlobal: true,
    })

    expect(fresh.resolveChatUiSfxSettings({
      soundEffectsEnabled: false,
      soundEffectsProfile: 'wechat',
      chat: {
        soundEffectsEnabled: true,
        soundEffectsProfile: 'kakaotalk-single',
      },
    })).toMatchObject({
      enabled: true,
      profile: 'kakaotalk-single',
      followsGlobal: false,
    })
  })

  test('plays the KakaoTalk audio file for the custom profile', async () => {
    const audio = {
      pause: vi.fn(),
      play: vi.fn(async () => true),
      currentTime: 4,
      preload: '',
      volume: 0,
    }
    const AudioMock = vi.fn(function AudioMock(src) {
      this.src = src
      this.pause = audio.pause
      this.play = audio.play
      this.currentTime = audio.currentTime
      this.preload = audio.preload
      this.volume = audio.volume
    })
    vi.stubGlobal('Audio', AudioMock)
    const fresh = await resetModuleState()
    const playback = fresh.playUiCue('notification', { profile: 'kakaotalk' })

    expect(createUISFXMock).not.toHaveBeenCalled()
    expect(AudioMock).toHaveBeenCalledTimes(1)
    expect(AudioMock.mock.calls[0][0]).toContain('audio/ui-sfx/kakaotalk-sms-tone.mp3')
    expect(audio.pause).toHaveBeenCalledTimes(1)
    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(playback).toBeTruthy()
    playback.stop()
    expect(audio.pause).toHaveBeenCalledTimes(2)
  })
  test('uses distinct community audio files for iMessage and WeChat', async () => {
    const audioInstances = []
    const AudioMock = vi.fn(function AudioMock(src) {
      this.src = src
      this.pause = vi.fn()
      this.play = vi.fn(async () => true)
      this.currentTime = 0
      this.preload = ''
      this.volume = 0
      audioInstances.push(this)
    })
    vi.stubGlobal('Audio', AudioMock)
    const fresh = await resetModuleState()

    fresh.playUiCue('notification', { profile: 'imessage' })
    fresh.playUiCue('notification', { profile: 'wechat' })

    expect(createUISFXMock).not.toHaveBeenCalled()
    expect(AudioMock).toHaveBeenCalledTimes(2)
    expect(AudioMock.mock.calls[0][0]).toContain('audio/ui-sfx/imessage-like.mp3')
    expect(AudioMock.mock.calls[1][0]).toContain('audio/ui-sfx/wechat-like.mp3')
    expect(audioInstances[0].play).toHaveBeenCalledTimes(1)
    expect(audioInstances[1].play).toHaveBeenCalledTimes(1)
  })

  test('routes every media profile to its own local audio asset', async () => {
    const AudioMock = vi.fn(function AudioMock(src) {
      this.src = src
      this.pause = vi.fn()
      this.play = vi.fn(async () => true)
      this.currentTime = 0
      this.preload = ''
      this.volume = 0
    })
    vi.stubGlobal('Audio', AudioMock)
    const fresh = await resetModuleState()
    const expectedPaths = {
      'kakaotalk-single': 'audio/ui-sfx/kakaotalk-sms-tone-single.wav',
      msn: 'audio/ui-sfx/msn-message.mp3',
      icq: 'audio/ui-sfx/icq-messenger.mp3',
      line: 'audio/ui-sfx/line-messenger.mp3',
      discord: 'audio/ui-sfx/discord-sound-effect.mp3',
      whatsapp: 'audio/ui-sfx/whatsapp-notification.mp3',
    }

    Object.entries(expectedPaths).forEach(([profile, path]) => {
      fresh.playUiCue('notification', { profile })
      expect(AudioMock.mock.calls.at(-1)[0]).toContain(path)
    })
    expect(AudioMock).toHaveBeenCalledTimes(Object.keys(expectedPaths).length)
    expect(createUISFXMock).not.toHaveBeenCalled()
  })

  test('delegates cues and options to the player', async () => {
    const fresh = await resetModuleState()
    fresh.playUiCue('notification', { profile: 'minimal', cooldownMs: 1500 })
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
