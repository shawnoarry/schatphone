import { describe, expect, test, vi } from 'vitest'
import {
  BOOK_TEXT_ASSET_TYPES,
  BOOK_TEXT_EXPORT_FORMATS,
  WORLDBOOK_SOURCE_USAGES,
  buildBookAssetPortableExport,
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
    ])
    expect(WORLDBOOK_SOURCE_USAGES).toEqual([
      'main_worldview',
      'encyclopedia',
      'world_rule',
    ])
    expect(BOOK_TEXT_EXPORT_FORMATS).toEqual(['worldbook_json', 'markdown', 'text'])
  })

  test('exports lossless JSON plus editable Markdown and plain text files', () => {
    vi.setSystemTime(new Date('2026-07-22T08:00:00.000Z'))
    const asset = normalizeBookTextAsset({
      id: 'asset_portable',
      title: '首尔舞台规则',
      category: 'world_rule',
      format: 'markdown',
      tags: ['K-pop', 'stage'],
      content: '# Arrival\n\nKeep the confirmed schedule.',
    })

    const jsonFile = buildBookAssetPortableExport(asset, 'worldbook_json')
    const markdownFile = buildBookAssetPortableExport(asset, 'markdown')
    const textFile = buildBookAssetPortableExport(asset, 'text')

    expect(jsonFile).toMatchObject({
      fileName: '首尔舞台规则.worldbook.json',
      mimeType: 'application/json;charset=utf-8',
    })
    expect(JSON.parse(jsonFile.content).asset).toMatchObject({
      id: 'asset_portable',
      category: 'world_rule',
      tags: ['K-pop', 'stage'],
    })
    expect(markdownFile).toMatchObject({
      fileName: '首尔舞台规则.md',
      mimeType: 'text/markdown;charset=utf-8',
    })
    expect(markdownFile.content).toContain('schatphoneBookText: 1')
    expect(markdownFile.content).toContain('title: "首尔舞台规则"')
    expect(markdownFile.content).toContain('category: "world_rule"')
    expect(markdownFile.content).toContain('tags: ["K-pop","stage"]')
    expect(markdownFile.content).toContain('# Arrival\n\nKeep the confirmed schedule.')
    expect(textFile).toEqual({
      format: 'text',
      fileName: '首尔舞台规则.txt',
      mimeType: 'text/plain;charset=utf-8',
      content: '# Arrival\n\nKeep the confirmed schedule.',
    })
  })

  test('re-imports exported Markdown with reversible metadata while keeping body text exact', () => {
    const exported = buildBookAssetPortableExport({
      title: 'City Rules',
      category: 'world_rule',
      categoryId: 'night_district_rules',
      format: 'markdown',
      tags: ['city, night', 'stage:live'],
      content: '---\nThis is user-authored body content.\n---\n\n# Rules',
    }, 'markdown')

    const imported = buildBookAssetFromImportedText({
      fileName: exported.fileName,
      mimeType: exported.mimeType,
      content: exported.content,
    })

    expect(imported).toMatchObject({
      ok: true,
      asset: {
        title: 'City Rules',
        category: 'world_rule',
        categoryId: 'night_district_rules',
        tags: ['city, night', 'stage:live'],
        content: '---\nThis is user-authored body content.\n---\n\n# Rules',
      },
    })
    expect(imported.asset.content).not.toContain('schatphoneBookText: 1')
  })

  test('does not treat an unmarked opening delimiter block as SchatPhone metadata', () => {
    const content = [
      '---',
      'title: A user-authored divider',
      'tags: prose, not metadata',
      '---',
      '',
      'The complete block belongs to the manuscript.',
    ].join('\n')

    const imported = buildBookAssetFromImportedText({
      fileName: 'opening-block.md',
      mimeType: 'text/markdown',
      content,
    })

    expect(imported.ok).toBe(true)
    expect(imported.asset.title).toBe('opening-block')
    expect(imported.asset.tags).toEqual([])
    expect(imported.asset.content).toBe(content)
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

    expect(asset.category).toBe('encyclopedia')
    expect(asset.assetType).toBe('encyclopedia')
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
          category: 'world_rule',
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

  test('round-trips every exported Book asset field except imported-file source provenance', () => {
    vi.setSystemTime(new Date('2026-07-22T09:30:00.000Z'))
    const asset = normalizeBookTextAsset({
      id: 'book_asset_round_trip',
      title: 'Round-trip rule',
      category: 'world_rule',
      format: 'markdown',
      categoryId: 'custom_rules',
      tags: ['city, night', 'continuity'],
      content: '# Rule\n\nKeep the public timeline stable.',
      status: 'archived',
      locked: true,
      favorite: true,
      source: { kind: 'user_authored', note: 'keep this provenance detail' },
      version: 4,
      createdAt: 1760000000000,
      updatedAt: 1765000000000,
    })
    const exported = buildBookAssetPortableExport(asset, 'worldbook_json')
    const exportedAsset = JSON.parse(exported.content).asset
    const imported = buildBookAssetFromImportedText({
      fileName: exported.fileName,
      mimeType: exported.mimeType,
      content: exported.content,
    })

    expect(imported.ok).toBe(true)
    const { source: exportedSource, ...exportedFields } = exportedAsset
    const { source: importedSource, ...importedFields } = imported.asset
    expect(importedFields).toEqual(exportedFields)
    expect(exportedSource).toEqual({
      kind: 'user_authored',
      note: 'keep this provenance detail',
    })
    expect(importedSource).toEqual({
      kind: 'imported_file',
      note: 'keep this provenance detail',
      fileName: 'Round-trip-rule.worldbook.json',
      mimeType: 'application/json;charset=utf-8',
      importedAt: Date.now(),
    })
  })

  test.each([
    {
      name: 'wrong export type',
      payload: { type: 'other.export', version: 1, asset: {} },
      reason: 'invalid_worldbook_envelope',
    },
    {
      name: 'missing version',
      payload: { type: 'schatphone.bookTextAsset', asset: {} },
      reason: 'invalid_worldbook_envelope',
    },
    {
      name: 'unknown version',
      payload: { type: 'schatphone.bookTextAsset', version: 2, asset: {} },
      reason: 'unsupported_worldbook_version',
    },
    {
      name: 'incomplete asset',
      payload: {
        type: 'schatphone.bookTextAsset',
        version: 1,
        asset: { id: 'missing_content', title: 'Missing content' },
      },
      reason: 'invalid_worldbook_asset',
    },
  ])('rejects $name in strict .worldbook.json imports', ({ payload, reason }) => {
    const result = buildBookAssetFromImportedText({
      fileName: 'strict.worldbook.json',
      content: JSON.stringify(payload),
      mimeType: 'application/json',
    })

    expect(result).toMatchObject({ ok: false, reason })
  })

  test('keeps ordinary JSON compatibility separate from strict .worldbook.json validation', () => {
    const result = buildBookAssetFromImportedText({
      fileName: 'legacy.json',
      content: JSON.stringify({
        title: 'Legacy loose JSON',
        assetType: 'knowledge_note',
        content: 'Still accepted through the ordinary JSON path.',
      }),
      mimeType: 'application/json',
    })

    expect(result).toMatchObject({
      ok: true,
      asset: {
        title: 'Legacy loose JSON',
        category: 'encyclopedia',
        format: 'structured_json',
        content: 'Still accepted through the ordinary JSON path.',
      },
    })
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

  test('invalid category falls back to encyclopedia', () => {
    const asset = normalizeBookTextAsset({
      id: 'sample',
      title: '',
      assetType: 'made_up',
      content: 'Reference material.',
      locked: 'yes',
    })

    expect(asset.title).toBe('Untitled text 1')
    expect(asset.category).toBe('encyclopedia')
    expect(asset.assetType).toBe('encyclopedia')
    expect(asset.locked).toBe(false)
    expect(asset.content).toBe('Reference material.')
  })
})
