import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookStore } from '../src/stores/book'
import { useSystemStore } from '../src/stores/system'
import {
  resolveActiveWorldOverview,
  resolveWorldContextForConsumer,
} from '../src/lib/world-interface'
import { buildWorldBookSourceSnapshot } from '../src/lib/book-text-schema'

describe('Book and WorldBook source linking', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T11:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('active Book source contributes to resolved world context', () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    systemStore.setGlobalWorldview('Fallback city baseline.')
    const asset = bookStore.createAsset({
      id: 'asset_world',
      title: 'Linked World',
      format: 'markdown',
      content: '# Basics\n\nLinked world rules.\n\n## Hidden\n\nNot selected.',
    })
    systemStore.addWorldBookSourceLink({
      assetId: asset.id,
      sectionIds: ['section_basics_1'],
      usage: 'base_worldview',
      sourceVersion: asset.version,
      sourceFingerprint: asset.contentFingerprint,
    })

    const context = resolveWorldContextForConsumer({
      systemStore,
      bookStore,
      consumer: 'chat',
    })

    expect(context.worldview).toContain('Linked World: Linked world rules.')
    expect(context.worldview).toContain('Fallback city baseline.')
    expect(context.worldview).not.toContain('Not selected.')
    expect(context.linkedBookSourceCount).toBe(1)
    expect(context.activeBookSourceCount).toBe(1)
    expect(context.missingBookSourceCount).toBe(0)
  })

  test('disabled Book source is excluded from world context', () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    systemStore.setGlobalWorldview('Fallback only.')
    const asset = bookStore.createAsset({
      id: 'asset_disabled',
      title: 'Disabled Source',
      content: 'Should not appear.',
    })
    systemStore.addWorldBookSourceLink({
      assetId: asset.id,
      enabled: false,
      usage: 'base_worldview',
    })

    const context = resolveWorldContextForConsumer({
      systemStore,
      bookStore,
      consumer: 'chat',
    })

    expect(context.worldview).toBe('Fallback only.')
    expect(context.linkedBookSourceCount).toBe(1)
    expect(context.activeBookSourceCount).toBe(0)
  })

  test('missing Book source creates overview warning and is excluded', () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    systemStore.setGlobalWorldview('Fallback survives.')
    systemStore.addWorldBookSourceLink({
      assetId: 'asset_missing',
      usage: 'base_worldview',
    })

    const overview = resolveActiveWorldOverview({ systemStore, bookStore })
    const context = resolveWorldContextForConsumer({
      systemStore,
      bookStore,
      consumer: 'chat',
    })

    expect(overview.missingBookSourceCount).toBe(1)
    expect(overview.bookSources[0]).toMatchObject({
      assetId: 'asset_missing',
      missing: true,
      warning: 'missing_source',
    })
    expect(context.worldview).toBe('Fallback survives.')
  })

  test('changed Book source is reported for review', () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    const asset = bookStore.createAsset({
      id: 'asset_changed',
      title: 'Changed Source',
      content: 'Original text.',
    })
    systemStore.addWorldBookSourceLink({
      assetId: asset.id,
      usage: 'base_worldview',
      sourceFingerprint: asset.contentFingerprint,
    })
    bookStore.updateAsset(asset.id, { content: 'Changed text.' })

    const overview = resolveActiveWorldOverview({ systemStore, bookStore })

    expect(overview.changedBookSourceCount).toBe(1)
    expect(overview.bookSources[0]).toMatchObject({
      title: 'Changed Source',
      changed: true,
      warning: 'changed_source',
    })
  })

  test('unchanged selected sections do not create changed-source warnings', () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    const asset = bookStore.createAsset({
      id: 'asset_section_unchanged',
      title: 'Section Source',
      format: 'markdown',
      content: '# Public\n\nVisible text.\n\n## Private\n\nOld private text.',
    })
    systemStore.addWorldBookSourceLink({
      assetId: asset.id,
      sectionIds: ['section_public_1'],
      usage: 'base_worldview',
      sourceFingerprint: asset.contentFingerprint,
      ...buildWorldBookSourceSnapshot('Visible text.'),
    })

    bookStore.updateAsset(asset.id, {
      content: '# Public\n\nVisible text.\n\n## Private\n\nNew private text.',
    })

    const overview = resolveActiveWorldOverview({ systemStore, bookStore })
    const context = resolveWorldContextForConsumer({
      systemStore,
      bookStore,
      consumer: 'chat',
    })

    expect(overview.changedBookSourceCount).toBe(0)
    expect(context.worldview).toContain('Visible text.')
    expect(context.worldview).not.toContain('New private text.')
  })

  test('no Book links preserves existing global worldview behavior', () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    systemStore.setGlobalWorldview('Existing worldview.')

    const context = resolveWorldContextForConsumer({
      systemStore,
      bookStore,
      consumer: 'chat',
    })

    expect(context.worldview).toBe('Existing worldview.')
    expect(context.linkedBookSourceCount).toBe(0)
  })
})
