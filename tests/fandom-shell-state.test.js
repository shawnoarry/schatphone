import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  normalizeFandomShellState,
  resetFandomShellStateForTesting,
  useFandomShellState,
} from '../src/composables/useFandomShellState'
import {
  FANDOM_SHELL_STORAGE_KEY,
  getFandomCommunityRows,
  validateFandomFixtureContract,
} from '../src/lib/fandom-shell-data'

describe('Aster unified fandom S1 preview state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetFandomShellStateForTesting()
    vi.restoreAllMocks()
  })

  test('reuses stable Community publication references and validates platform fixtures', () => {
    expect(validateFandomFixtureContract()).toBe(true)
    expect(getFandomCommunityRows().map((row) => row.post.id)).toEqual([
      'post_iseo_window_note',
      'post_hanul_showcase_notice',
      'post_nodeul_access_guide',
    ])
  })

  test('persists only bounded consumer preview interactions', () => {
    const state = useFandomShellState()
    expect(state.setActiveTab('messages')).toEqual({ ok: true })
    expect(state.toggleFollow('artist-hanul-ari')).toEqual({ ok: true, active: true })
    expect(state.toggleBookmark('post_hanul_showcase_notice')).toEqual({ ok: true, active: true })
    expect(state.markChannelRead('subscription-yun-iseo-preview')).toEqual({ ok: true })
    expect(state.toggleNotifications()).toEqual({ ok: true, enabled: false })
    const stored = JSON.parse(localStorage.getItem(FANDOM_SHELL_STORAGE_KEY))
    expect(stored.activeTab).toBe('messages')
    expect(stored.followedArtistIds).toContain('artist-hanul-ari')
    expect(stored.bookmarkedPostIds).toEqual(['post_hanul_showcase_notice'])
    expect(stored.readMessageIds).toHaveLength(2)
    expect(JSON.stringify(stored)).not.toMatch(/entitlement|wallet|payment|chatMessage|communityPost|eventInstance/i)
  })

  test('fails closed for unknown records and invalid restored values', () => {
    const state = useFandomShellState()
    expect(state.setActiveTab('studio')).toEqual({ ok: false, error: 'tab_invalid' })
    expect(state.toggleFollow('missing')).toEqual({ ok: false, error: 'record_missing' })
    expect(state.toggleBookmark('missing')).toEqual({ ok: false, error: 'record_missing' })
    expect(state.markChannelRead('missing')).toEqual({ ok: false, error: 'channel_missing' })
    expect(normalizeFandomShellState({ version: 1, activeTab: 'studio', followedArtistIds: ['missing'] })).toMatchObject({ activeTab: 'home', followedArtistIds: [] })
  })

  test('does not mutate reactive state when persistence fails', () => {
    const state = useFandomShellState()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(state.toggleFollow('artist-hanul-ari')).toEqual({ ok: false, error: 'write_failed' })
    expect(state.followedArtistIds.value).not.toContain('artist-hanul-ari')
  })
})
