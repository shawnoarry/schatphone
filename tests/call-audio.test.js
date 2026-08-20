import { describe, expect, test } from 'vitest'
import {
  CALL_AUDIO_CUE_OPTIONS,
  CALL_AUDIO_PROFILE_OPTIONS,
  DEFAULT_CALL_AUDIO_PROFILE,
  getCallAudioCueLabel,
  normalizeCallAudioProfile,
  resolveGlobalCallAudioSettings,
} from '../src/lib/call-audio'
import { buildAppearancePack, normalizeAppearancePackAppearance } from '../src/lib/appearance-pack'

describe('phone call audio', () => {
  test('exposes distinct phone-state profiles and cues', () => {
    expect(CALL_AUDIO_PROFILE_OPTIONS.length).toBeGreaterThanOrEqual(3)
    expect(CALL_AUDIO_CUE_OPTIONS.map((cue) => cue.id)).toEqual(
      expect.arrayContaining([
        'ringback',
        'busy-tone',
        'unassigned-number',
        'no-service',
        'voicemail',
      ]),
    )
    expect(normalizeCallAudioProfile('not-a-profile')).toBe(DEFAULT_CALL_AUDIO_PROFILE)
    expect(getCallAudioCueLabel('ringback')).toBe('回铃音')
  })

  test('normalizes global phone audio settings independently from UI effects', () => {
    expect(
      resolveGlobalCallAudioSettings({
        soundEffectsEnabled: false,
        callAudioEnabled: true,
        callAudioProfile: 'mobile-carrier',
      }),
    ).toEqual({ enabled: true, profile: 'mobile-carrier' })

    expect(resolveGlobalCallAudioSettings({ callAudioEnabled: false })).toEqual({
      enabled: false,
      profile: DEFAULT_CALL_AUDIO_PROFILE,
    })
  })

  test('keeps phone audio settings portable in appearance packs', () => {
    const pack = buildAppearancePack({
      callAudioEnabled: false,
      callAudioProfile: 'restrained-line',
    })
    expect(pack.appearance.callAudioEnabled).toBe(false)
    expect(pack.appearance.callAudioProfile).toBe('restrained-line')

    const fallback = normalizeAppearancePackAppearance({ callAudioProfile: 'unknown' })
    expect(fallback.callAudioEnabled).toBe(true)
    expect(fallback.callAudioProfile).toBe(DEFAULT_CALL_AUDIO_PROFILE)
  })
})
