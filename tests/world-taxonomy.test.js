import { describe, expect, test } from 'vitest'
import {
  BOOK_TEXT_CATEGORIES,
  WORLDBOOK_SOURCE_ROLES,
  getBookTextCategoryLabel,
  getWorldBookSourceRoleLabel,
  normalizeBookTextCategory,
  normalizeWorldBookSourceRole,
  pickCanonicalField,
} from '../src/lib/world-taxonomy'

describe('world taxonomy', () => {
  test('defines the canonical Book categories in product order', () => {
    expect(BOOK_TEXT_CATEGORIES).toEqual([
      'worldview',
      'encyclopedia',
      'world_rule',
    ])
  })

  test('normalizes legacy Book asset types to canonical categories', () => {
    expect(normalizeBookTextCategory('worldbook_document')).toBe('worldview')
    expect(normalizeBookTextCategory('knowledge_note')).toBe('encyclopedia')
    expect(normalizeBookTextCategory('glossary')).toBe('encyclopedia')
    expect(normalizeBookTextCategory('rule_set')).toBe('world_rule')
    expect(normalizeBookTextCategory('profile_template_note')).toBe('encyclopedia')
    expect(normalizeBookTextCategory('reference_note')).toBe('encyclopedia')
    expect(normalizeBookTextCategory('made_up')).toBe('encyclopedia')
  })

  test('normalizes legacy WorldBook source usages to canonical roles', () => {
    expect(WORLDBOOK_SOURCE_ROLES).toEqual([
      'main_worldview',
      'encyclopedia',
      'world_rule',
    ])
    expect(normalizeWorldBookSourceRole('base_worldview')).toBe('main_worldview')
    expect(normalizeWorldBookSourceRole('knowledge_source')).toBe('encyclopedia')
    expect(normalizeWorldBookSourceRole('pack_source')).toBe('encyclopedia')
    expect(normalizeWorldBookSourceRole('profile_template_reference')).toBe('encyclopedia')
    expect(normalizeWorldBookSourceRole('made_up')).toBe('encyclopedia')
  })

  test('returns user-facing labels for canonical values', () => {
    expect(getBookTextCategoryLabel('encyclopedia')).toEqual({
      zh: '百科',
      en: 'Encyclopedia',
    })
    expect(getWorldBookSourceRoleLabel('main_worldview')).toEqual({
      zh: '主世界观',
      en: 'Main worldview',
    })
  })

  test('picks the first normalized canonical field from mixed old and new inputs', () => {
    expect(
      pickCanonicalField(
        { category: 'world_rule', assetType: 'knowledge_note' },
        ['category', 'assetType'],
        normalizeBookTextCategory,
      ),
    ).toBe('world_rule')

    expect(
      pickCanonicalField(
        { usage: 'base_worldview' },
        ['role', 'usage'],
        normalizeWorldBookSourceRole,
      ),
    ).toBe('main_worldview')
  })
})
