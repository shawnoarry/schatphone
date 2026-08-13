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
      role: 'main_worldview',
      sourceVersion: asset.version,
      sourceFingerprint: asset.contentFingerprint,
    })
    expect(systemStore.listWorldBookSourceLinks()[0]).toMatchObject({
      role: 'main_worldview',
      usage: 'main_worldview',
    })

    const context = resolveWorldContextForConsumer({
      systemStore,
      bookStore,
      consumer: 'chat',
    })

    expect(context.worldview).toContain('Linked World: Linked world rules.')
    expect(context.worldview).not.toContain('Fallback city baseline.')
    expect(context.worldview).not.toContain('Not selected.')
    expect(context.linkedBookSourceCount).toBe(1)
    expect(context.activeBookSourceCount).toBe(1)
    expect(context.missingBookSourceCount).toBe(0)
  })

  test('keeps all enabled Book manuscript text without falling back or truncating the tail', () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    const firstTail = 'FIRST_MANUSCRIPT_TAIL'
    const secondTail = 'SECOND_MANUSCRIPT_TAIL'
    systemStore.setGlobalWorldview('Old fallback must stay inactive.')

    const firstAsset = bookStore.createAsset({
      id: 'asset_long_world_a',
      title: 'Long World A',
      content: `${'A'.repeat(3200)}${firstTail}`,
    })
    const secondAsset = bookStore.createAsset({
      id: 'asset_long_world_b',
      title: 'Long World B',
      content: `${'B'.repeat(3200)}${secondTail}`,
    })
    systemStore.addWorldBookSourceLink({
      assetId: firstAsset.id,
      role: 'main_worldview',
      priority: 1,
      sourceFingerprint: firstAsset.contentFingerprint,
      ...buildWorldBookSourceSnapshot(firstAsset.content),
    })
    systemStore.addWorldBookSourceLink({
      assetId: secondAsset.id,
      role: 'world_rule',
      priority: 2,
      sourceFingerprint: secondAsset.contentFingerprint,
      ...buildWorldBookSourceSnapshot(secondAsset.content),
    })

    const context = resolveWorldContextForConsumer({
      systemStore,
      bookStore,
      consumer: 'chat',
    })

    expect(context.worldview).toContain(firstTail)
    expect(context.worldview).toContain(secondTail)
    expect(context.worldview).not.toContain('Old fallback must stay inactive.')
    expect(context.worldviewCharCount).toBeGreaterThan(6400)
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
      role: 'main_worldview',
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
      role: 'main_worldview',
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
      role: 'main_worldview',
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

  test('importing a colliding asset id never changes an existing WorldBook link target', () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    const linked = bookStore.createAsset({
      id: 'asset_linked_collision',
      title: 'Linked original',
      category: 'worldview',
      content: 'Original linked world text.',
    })
    systemStore.addWorldBookSourceLink({
      assetId: linked.id,
      role: 'main_worldview',
      sourceVersion: linked.version,
      sourceFingerprint: linked.contentFingerprint,
      ...buildWorldBookSourceSnapshot(linked.content),
    })

    const imported = bookStore.importTextAsset({
      fileName: 'collision.worldbook.json',
      mimeType: 'application/json',
      content: JSON.stringify({
        type: 'schatphone.bookTextAsset',
        version: 1,
        asset: {
          ...linked,
          title: 'Imported collision',
          content: 'Imported text must remain inactive.',
        },
      }),
    })
    const context = resolveWorldContextForConsumer({
      systemStore,
      bookStore,
      consumer: 'chat',
    })

    expect(imported.ok).toBe(true)
    expect(imported.asset.id).not.toBe(linked.id)
    expect(systemStore.listWorldBookSourceLinks()).toEqual([
      expect.objectContaining({ assetId: linked.id }),
    ])
    expect(bookStore.findAssetById(linked.id)?.content).toBe('Original linked world text.')
    expect(context.worldview).toContain('Original linked world text.')
    expect(context.worldview).not.toContain('Imported text must remain inactive.')
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
      role: 'main_worldview',
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

  test('persists an arbitrary built-in encyclopedia subset and allows returning to zero selection', () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    const candidateIds = [
      'built_in_modern_seoul_kpop_industry_career_operation',
      'built_in_modern_seoul_kpop_production_stage_live',
      'built_in_modern_seoul_kpop_fandom_platform_public_opinion',
      'built_in_modern_seoul_kpop_city_life_state_relationship',
      'built_in_modern_seoul_kpop_real_entity_member_coordinate',
      'built_in_modern_seoul_kpop_industry_celebrity_functional_role',
    ]
    const selectedIds = [candidateIds[1], candidateIds[4]]

    expect(bookStore.listAssets({ category: 'encyclopedia' }).map((asset) => asset.id)).toEqual(
      candidateIds,
    )
    expect(systemStore.listWorldBookSourceLinks()).toHaveLength(0)

    selectedIds.forEach((assetId) => {
      const asset = bookStore.findAssetById(assetId)
      systemStore.addWorldBookSourceLink({
        assetId,
        role: 'encyclopedia',
        enabled: true,
        sourceVersion: asset.version,
        sourceFingerprint: asset.contentFingerprint,
        ...buildWorldBookSourceSnapshot(asset.content),
      })
    })
    systemStore.saveNow()

    setActivePinia(createPinia())
    const restoredStore = useSystemStore()
    expect(restoredStore.listWorldBookSourceLinks().map((link) => link.assetId)).toEqual(selectedIds)
    expect(restoredStore.listWorldBookSourceLinks()).toHaveLength(2)
    expect(restoredStore.listWorldBookSourceLinks().every((link) => link.role === 'encyclopedia')).toBe(true)

    restoredStore.listWorldBookSourceLinks().forEach((link) => {
      expect(restoredStore.removeWorldBookSourceLink(link.id)).toBe(true)
    })
    restoredStore.saveNow()

    setActivePinia(createPinia())
    expect(useSystemStore().listWorldBookSourceLinks()).toHaveLength(0)
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
