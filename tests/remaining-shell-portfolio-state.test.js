import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { validateIntercityFixtureContract, INTERCITY_SHELL_STORAGE_KEY } from '../src/lib/intercity-shell-data'
import { normalizeIntercityShellState, resetIntercityShellStateForTesting, useIntercityShellState } from '../src/composables/useIntercityShellState'
import { validateCreatorRightsFixtures, CREATOR_RIGHTS_STORAGE_KEY } from '../src/lib/creator-rights-shell-data'
import { resetCreatorRightsShellStateForTesting, useCreatorRightsShellState } from '../src/composables/useCreatorRightsShellState'
import { PARCEL_STORAGE_KEY } from '../src/lib/parcel-shell-data'
import { resetParcelShellStateForTesting, useParcelShellState } from '../src/composables/useParcelShellState'
import { CAREER_STORAGE_KEY } from '../src/lib/career-shell-data'
import { resetCareerShellStateForTesting, useCareerShellState } from '../src/composables/useCareerShellState'

describe('remaining S1 shell portfolio state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetIntercityShellStateForTesting(); resetCreatorRightsShellStateForTesting(); resetParcelShellStateForTesting(); resetCareerShellStateForTesting()
    vi.restoreAllMocks()
  })

  test('keeps intercity services stable and fails closed for sold-out, stale, and malformed intents', () => {
    expect(validateIntercityFixtureContract()).toBe(true)
    const state = useIntercityShellState()
    expect(state.saveTripDraft({ serviceId: 'via-rail-seoul-busan-0828', fareId: 'rail-standard', passengers: 2 })).toEqual({ ok: true })
    expect(state.saveTripDraft({ serviceId: 'via-rail-yongsan-jeonju-0831', fareId: 'missing', passengers: 1 })).toEqual({ ok: false, error: 'draft_invalid' })
    expect(state.saveTripDraft({ serviceId: 'via-flight-incheon-tokyo-0902', fareId: 'missing', passengers: 1 })).toEqual({ ok: false, error: 'draft_invalid' })
    expect(normalizeIntercityShellState({ version: 1, activeTab: 'checkout', modeId: 'teleport', tripDrafts: [{ serviceId: 'missing' }] })).toMatchObject({ activeTab: 'discover', modeId: 'all', tripDrafts: [] })
    expect(JSON.stringify(JSON.parse(localStorage.getItem(INTERCITY_SHELL_STORAGE_KEY)))).not.toMatch(/ticketId|seatHold|wallet|payment|calendar|mapRoute|agenda|eventInstance|notification/i)
  })

  test('keeps creator rights records at a local declaration-draft boundary', () => {
    expect(validateCreatorRightsFixtures()).toBe(true)
    const state = useCreatorRightsShellState()
    expect(state.toggleDeclarationWork('credo-work-neon-weather')).toEqual({ ok: true })
    expect(state.updateDeclarationNote('Need split-sheet review.')).toEqual({ ok: true })
    const stored = JSON.parse(localStorage.getItem(CREATOR_RIGHTS_STORAGE_KEY))
    expect(stored.declarationDraft.workIds).toEqual(['credo-work-neon-weather'])
    expect(JSON.stringify(stored)).not.toMatch(/registrationApproval|credential|copyrightOwner|royaltyPayment|signature|wallet|eventInstance/i)
  })

  test('stores only parcel pins, preferences, and a local send draft', () => {
    const state = useParcelShellState()
    expect(state.togglePinned('posta-shipment-studio-0823')).toEqual({ ok: true })
    expect(state.updateSendDraft({ recipient: 'Studio desk', addressLabel: 'Work', itemType: 'document' })).toEqual({ ok: true })
    const stored = JSON.parse(localStorage.getItem(PARCEL_STORAGE_KEY))
    expect(stored.sendDraft).toMatchObject({ recipient: 'Studio desk', addressLabel: 'Work', itemType: 'document' })
    expect(JSON.stringify(stored)).not.toMatch(/"shipmentId"|shippingLabel|pickupBooking|deliveryProof|refund|mapRoute|notification|eventInstance/i)
  })

  test('allows only open career listings to create local application drafts', () => {
    const state = useCareerShellState()
    expect(state.saveApplicationDraft({ listingId: 'next-audition-vocal-0903', materialNote: '60-second vocal sample' })).toEqual({ ok: true })
    expect(state.saveApplicationDraft({ listingId: 'next-invite-radio-0828', materialNote: 'Try invite' })).toEqual({ ok: false, error: 'draft_invalid' })
    expect(state.saveApplicationDraft({ listingId: 'next-campus-producer-0829', materialNote: 'Old listing' })).toEqual({ ok: false, error: 'draft_invalid' })
    expect(JSON.stringify(JSON.parse(localStorage.getItem(CAREER_STORAGE_KEY)))).not.toMatch(/submittedAt|institutionReceipt|interview|offer|credential|calendar|mail|notification|eventInstance/i)
  })

  test('does not mutate intercity state when persistence fails', () => {
    const state = useIntercityShellState()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(state.toggleFavorite('via-rail-seoul-busan-0828')).toEqual({ ok: false, error: 'write_failed' })
    expect(state.favoriteServiceIds.value).toEqual([])
  })
})
