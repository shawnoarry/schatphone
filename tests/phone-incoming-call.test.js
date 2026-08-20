import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePhoneStore } from '../src/stores/phone'
import { useSystemStore } from '../src/stores/system'
import {
  DEFAULT_RINGTONE_ID,
  RINGTONE_OPTIONS,
  getRingtoneLabel,
  normalizeRingtoneId,
} from '../src/lib/ringtone'
import { normalizeAppearancePackAppearance, buildAppearancePack } from '../src/lib/appearance-pack'

describe('ringtone library', () => {
  test('normalizes unknown ids to the default ringtone', () => {
    expect(normalizeRingtoneId('gran-vals')).toBe('gran-vals')
    expect(normalizeRingtoneId('not-a-ringtone')).toBe(DEFAULT_RINGTONE_ID)
    expect(normalizeRingtoneId('')).toBe(DEFAULT_RINGTONE_ID)
  })

  test('exposes built-in and Samsung ringtones with localized labels and audio files', () => {
    expect(RINGTONE_OPTIONS).toHaveLength(10)
    for (const ringtone of RINGTONE_OPTIONS) {
      expect(ringtone.file).toMatch(/^audio\/(ringtones|brand)\/.+\.(wav|mp3)$/)
      expect(getRingtoneLabel(ringtone.id)).toBeTruthy()
      expect(getRingtoneLabel(ringtone.id, (zh, en) => en)).toBe(ringtone.labelEn)
    }
    expect(RINGTONE_OPTIONS.map((ringtone) => ringtone.id)).toEqual(
      expect.arrayContaining([
        'samsung-over-the-horizon',
        'samsung-atomic-bell',
        'samsung-80s-phone',
        'samsung-arcade',
      ]),
    )
  })

  test('ringtone settings survive appearance pack export and import', () => {
    const pack = buildAppearancePack({
      ringtoneEnabled: false,
      ringtoneId: 'classic-bell',
    })
    expect(pack.appearance.ringtoneEnabled).toBe(false)
    expect(pack.appearance.ringtoneId).toBe('classic-bell')

    const normalized = normalizeAppearancePackAppearance({ ringtoneId: 'bogus' })
    expect(normalized.ringtoneEnabled).toBe(true)
    expect(normalized.ringtoneId).toBe(DEFAULT_RINGTONE_ID)
  })
})

describe('phone incoming call', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('rings, is accepted, and leaves the state machine clean', () => {
    const store = usePhoneStore()
    store.resetForTesting()

    const received = store.receiveIncomingCall({
      name: 'Mika',
      phoneNumber: '1001',
      contactId: '7',
      relationshipBinding: { contactId: 7, kind: 'role', name: 'Mika' },
      sourceModule: 'phone_simulate',
    })

    expect(received).toMatchObject({ ok: true, reason: '' })
    expect(received.incomingCall).toMatchObject({
      status: 'ringing',
      participant: { name: 'Mika', phoneNumber: '1001' },
      sourceModule: 'phone_simulate',
    })
    expect(store.incomingCall).toBe(received.incomingCall)

    const second = store.receiveIncomingCall({ name: 'Nova' })
    expect(second).toMatchObject({ ok: false, reason: 'incoming_active' })

    const accepted = store.acceptIncomingCall()
    expect(accepted).toMatchObject({ status: 'accepted', participant: { name: 'Mika' } })

    const consumed = store.consumeAcceptedIncomingCall()
    expect(consumed).toMatchObject({ id: accepted.id, status: 'accepted' })
    expect(store.consumeAcceptedIncomingCall()).toBeNull()
    expect(store.incomingCall).toBeNull()
  })

  test('declining logs a declined incoming call and clears state', () => {
    const store = usePhoneStore()
    store.resetForTesting()
    store.receiveIncomingCall({ name: 'Nova', phoneNumber: '1002', sourceModule: 'phone_simulate' })

    const declined = store.declineIncomingCall()

    expect(declined).toMatchObject({
      contactName: 'Nova',
      direction: 'incoming',
      status: 'declined',
      durationSec: 0,
      sourceModule: 'phone_simulate',
    })
    expect(store.incomingCall).toBeNull()
    expect(store.declineIncomingCall()).toBeNull()
  })

  test('an unanswered call becomes a missed call with a notification after the ring timeout', () => {
    const store = usePhoneStore()
    store.resetForTesting()
    store.receiveIncomingCall({
      name: 'Mika',
      phoneNumber: '1001',
      sourceModule: 'phone_simulate',
      ringTimeoutMs: 25_000,
    })

    vi.advanceTimersByTime(24_999)
    expect(store.incomingCall).not.toBeNull()

    vi.advanceTimersByTime(1)
    expect(store.incomingCall).toBeNull()

    const missed = store.calls[0]
    expect(missed).toMatchObject({
      contactName: 'Mika',
      direction: 'incoming',
      status: 'missed',
      durationSec: 0,
      sourceModule: 'phone_simulate',
    })
    const systemStore = useSystemStore()
    expect(systemStore.notifications.some((note) => note.source === 'phone_missed_call')).toBe(true)
  })

  test('requires a caller name and defaults the ring timeout', () => {
    const store = usePhoneStore()
    store.resetForTesting()

    const rejected = store.receiveIncomingCall({ name: '   ' })
    expect(rejected).toMatchObject({ ok: false, reason: 'name_required', incomingCall: null })
  })
})
