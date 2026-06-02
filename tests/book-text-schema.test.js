import { describe, expect, test, vi } from 'vitest'
import {
  BOOK_TEXT_ASSET_TYPES,
  WORLDBOOK_SOURCE_USAGES,
  buildWorldBookSourceSnapshot,
  buildBookAssetFromImportedText,
  diffWorldBookSourceText,
  extractMarkdownSections,
  normalizeBookTextAsset,
  normalizeWorldBookSourceLinks,
  resolveWorldBookSourceText,
} from '../src/lib/book-text-schema'

describe('book text schema helpers', () => {
  test('exports canonical category and role constants with legacy export names', () => {
    expect(BOOK_TEXT_ASSET_TYPES).toEqual([
      'worldview',
      'encyclopedia',
      'world_rule',
      'profile_template',
      'reference_material',
    ])
    expect(WORLDBOOK_SOURCE_USAGES).toEqual([
      'main_worldview',
      'encyclopedia',
      'world_rule',
      'world_pack_reference',
      'profile_template',
      'reference_material',
    ])
  })

  test('imports plain text as a draft worldbook document', () => {
    vi.setSystemTime(new Date('2026-05-29T08:00:00.000Z'))

    const result = buildBookAssetFromImportedText({
      fileName: 'quiet-city.txt',
      content: 'A calm city baseline.',
      mimeType: 'text/plain',
    })

    expect(result.ok).toBe(true)
    expect(result.asset.title).toBe('quiet-city')
    expect(result.asset.category).toBe('worldview')
    expect(result.asset.assetType).toBe('worldview')
    expect(result.asset.format).toBe('plain')
    expect(result.asset.content).toBe('A calm city baseline.')
    expect(result.asset.status).toBe('draft')
    expect(result.asset.sections).toEqual([])
    expect(result.asset.source.fileName).toBe('quiet-city.txt')
  })

  test('keeps canonical category separate from category id', () => {
    const asset = normalizeBookTextAsset({
      title: 'A',
      category: 'worldview',
      content: 'x',
    })

    expect(asset.category).toBe('worldview')
    expect(asset.assetType).toBe('worldview')
    expect(asset.categoryId).toBe('')
  })

  test('preserves old freeform category values as category ids', () => {
    const asset = normalizeBookTextAsset({
      title: 'A',
      category: 'custom shelf',
      content: 'x',
    })

    expect(asset.category).toBe('reference_material')
    expect(asset.assetType).toBe('reference_material')
    expect(asset.categoryId).toBe('custom_shelf')
  })

  test('extracts markdown sections in document order', () => {
    const sections = extractMarkdownSections([
      'Loose preface.',
      '',
      '# World',
      'World body.',
      '## Rules',
      'Rule body.',
      '### Etiquette',
      'Etiquette body.',
    ].join('\n'))

    expect(sections).toHaveLength(4)
    expect(sections.map((section) => section.title)).toEqual([
      'Intro',
      'World',
      'Rules',
      'Etiquette',
    ])
    expect(sections.map((section) => section.order)).toEqual([0, 1, 2, 3])
    expect(sections[2].content).toBe('Rule body.')
    expect(sections[3].level).toBe(3)
  })

  test('imports structured JSON and preserves metadata', () => {
    const result = buildBookAssetFromImportedText({
      fileName: 'default.worldbook.json',
      content: JSON.stringify({
        type: 'schatphone.bookTextAsset',
        version: 1,
        asset: {
          id: 'book_asset_default',
          title: 'Default World',
          assetType: 'rule_set',
          format: 'markdown',
          tags: ['city', 'ritual'],
          content: '# Basics\n\nNight etiquette matters.',
        },
      }),
      mimeType: 'application/json',
    })

    expect(result.ok).toBe(true)
    expect(result.asset.id).toBe('book_asset_default')
    expect(result.asset.title).toBe('Default World')
    expect(result.asset.category).toBe('world_rule')
    expect(result.asset.assetType).toBe('world_rule')
    expect(result.asset.tags).toEqual(['city', 'ritual'])
    expect(result.asset.sections[0].title).toBe('Basics')
  })

  test('malformed JSON import returns a readable error', () => {
    const result = buildBookAssetFromImportedText({
      fileName: 'broken.json',
      content: '{not json',
      mimeType: 'application/json',
    })

    expect(result).toMatchObject({
      ok: false,
      reason: 'malformed_json',
    })
  })

  test('normalizes source links and drops missing asset references', () => {
    const links = normalizeWorldBookSourceLinks([
      {
        id: 'Link 1',
        assetId: 'Book Asset 1',
        sectionIds: ['Section A', 'Section A', 'Section B'],
        usage: 'base_worldview',
        priority: 2,
        sourceSnapshotText: 'A saved source baseline.',
        sourceSnapshotUpdatedAt: 1770000000000,
        sourceSnapshotCharCount: 24,
      },
      {
        id: 'missing',
        usage: 'pack_source',
      },
    ])

    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({
      id: 'link_1',
      assetId: 'book_asset_1',
      sectionIds: ['section_a', 'section_b'],
      role: 'main_worldview',
      usage: 'main_worldview',
      enabled: true,
      priority: 2,
      sourceSnapshotText: 'A saved source baseline.',
      sourceSnapshotUpdatedAt: 1770000000000,
      sourceSnapshotCharCount: 24,
    })
  })

  test('normalizes old exported assetType and usage values into canonical fields', () => {
    const asset = normalizeBookTextAsset({
      title: 'Legacy Knowledge',
      assetType: 'knowledge_note',
      content: 'Legacy knowledge text.',
    })
    const links = normalizeWorldBookSourceLinks([
      {
        id: 'legacy_link',
        assetId: asset.id,
        usage: 'knowledge_source',
      },
    ])

    expect(asset.category).toBe('encyclopedia')
    expect(asset.assetType).toBe('encyclopedia')
    expect(links[0]).toMatchObject({
      role: 'encyclopedia',
      usage: 'encyclopedia',
    })
  })

  test('builds source snapshots and diffs changed source text', () => {
    const snapshot = buildWorldBookSourceSnapshot('Rule one.\n\nRule two.', 1770000000000)
    const diff = diffWorldBookSourceText(snapshot.sourceSnapshotText, 'Rule one.\n\nRule three.')

    expect(snapshot).toMatchObject({
      sourceSnapshotText: 'Rule one.\n\nRule two.',
      sourceSnapshotUpdatedAt: 1770000000000,
      sourceSnapshotCharCount: 20,
    })
    expect(diff).toMatchObject({
      addedCount: 1,
      removedCount: 1,
      unchangedCount: 1,
      hasPreviousSnapshot: true,
      hasChanges: true,
    })
    expect(diff.entries.map((entry) => `${entry.type}:${entry.text}`)).toEqual([
      'unchanged:Rule one.',
      'removed:Rule two.',
      'added:Rule three.',
    ])
  })

  test('resolves only selected sections for WorldBook source text', () => {
    const asset = normalizeBookTextAsset({
      id: 'sectioned',
      title: 'Sectioned',
      format: 'markdown',
      content: '# Public\n\nVisible rule.\n\n## Private\n\nHidden rule.',
    })

    expect(resolveWorldBookSourceText(asset, ['section_public_1'])).toBe('Visible rule.')
    expect(resolveWorldBookSourceText(asset, ['missing_section'])).toBe('')
  })

  test('invalid category falls back to reference material', () => {
    const asset = normalizeBookTextAsset({
      id: 'sample',
      title: '',
      assetType: 'made_up',
      content: 'Reference material.',
      locked: 'yes',
    })

    expect(asset.title).toBe('Untitled text 1')
    expect(asset.category).toBe('reference_material')
    expect(asset.assetType).toBe('reference_material')
    expect(asset.locked).toBe(false)
    expect(asset.content).toBe('Reference material.')
  })
})
