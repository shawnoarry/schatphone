import { describe, expect, test } from 'vitest'
import { buildRoleContinuityProjection } from '../src/lib/role-continuity-projection'

const detail = (overrides = {}) => ({
  id: 'detail-1',
  section: 'preferences',
  sourceKind: 'manual',
  title: 'Tea',
  detail: 'Likes jasmine tea.',
  updatedAt: 1,
  ...overrides,
})

describe('role continuity projection Module', () => {
  test('places manual role details in stable text with deterministic section order', () => {
    const projection = buildRoleContinuityProjection({
      roleDetailItems: [
        detail({ id: 'social', section: 'socialGraph', title: 'Sister', detail: 'Calls her weekly.' }),
        detail({ id: 'life', section: 'lifePattern', title: 'Morning', detail: 'Runs before work.' }),
        detail(),
      ],
    })

    expect(projection.stableText).toContain('Preferences: Tea: Likes jasmine tea.')
    expect(projection.stableText.indexOf('Preferences:')).toBeLessThan(
      projection.stableText.indexOf('Life pattern:'),
    )
    expect(projection.stableText.indexOf('Life pattern:')).toBeLessThan(
      projection.stableText.indexOf('Social graph:'),
    )
    expect(projection.dynamicText).toBe('')
  })

  test('admits only event clues linked to recalled non-archived memories', () => {
    const projection = buildRoleContinuityProjection({
      roleDetailItems: [
        detail({
          id: 'linked',
          sourceKind: 'event_attached',
          title: 'Gift follow-up',
          detail: 'Kept the ribbon in a drawer.',
          memoryKey: 'birthday_gift',
        }),
        detail({
          id: 'orphan',
          sourceKind: 'event_attached',
          title: 'Unknown event',
          detail: 'Must stay out.',
          memoryKey: 'missing_memory',
        }),
      ],
      recalledMemories: [
        {
          memoryKey: 'birthday_gift',
          recallText: 'You gave her a birthday necklace.',
          reviewStatus: 'active',
        },
      ],
    })

    expect(projection.dynamicText).toContain('Gift follow-up: Kept the ribbon in a drawer.')
    expect(projection.dynamicText).not.toContain('Unknown event')
    expect(projection.selectedRefs.memoryKeys).toEqual(['birthday_gift'])
  })

  test('does not repeat an event clue already contained in the recalled summary', () => {
    const projection = buildRoleContinuityProjection({
      roleDetailItems: [
        detail({
          sourceKind: 'event_attached',
          title: 'Late call',
          detail: 'Stayed up for a call.',
          memoryKey: 'late_call',
        }),
      ],
      recalledMemories: [
        {
          memoryKey: 'late_call',
          recallText: 'Late call: Stayed up for a call.',
        },
      ],
    })

    expect(projection.dynamicText).toBe('')
  })

  test('caps detail output and reports omitted candidates without mutating input', () => {
    const roleDetailItems = Array.from({ length: 5 }, (_, index) =>
      detail({ id: `detail-${index}`, title: `Detail ${index}`, updatedAt: index }),
    )
    const original = structuredClone(roleDetailItems)
    const projection = buildRoleContinuityProjection({
      roleDetailItems,
      manualItemLimit: 2,
    })

    expect(projection.selectedRefs.manualDetailIds).toHaveLength(2)
    expect(projection.omittedCounts.manual).toBe(3)
    expect(roleDetailItems).toEqual(original)
  })

  test('caps final rendered text and honors zero budgets', () => {
    const roleDetailItems = [
      detail({ id: 'manual', detail: 'm'.repeat(120) }),
      detail({
        id: 'event',
        sourceKind: 'event_attached',
        memoryKey: 'linked',
        detail: 'e'.repeat(120),
      }),
    ]
    const recalledMemories = [{ memoryKey: 'linked', recallText: 'Linked memory.' }]
    const bounded = buildRoleContinuityProjection({
      roleDetailItems,
      recalledMemories,
      manualCharacterBudget: 100,
      eventCharacterBudget: 100,
    })
    const disabled = buildRoleContinuityProjection({
      roleDetailItems,
      recalledMemories,
      manualCharacterBudget: 0,
      eventCharacterBudget: 0,
    })

    expect(bounded.stableText.length).toBeLessThanOrEqual(100)
    expect(bounded.dynamicText.length).toBeLessThanOrEqual(100)
    expect(disabled.stableText).toBe('')
    expect(disabled.dynamicText).toBe('')
    expect(buildRoleContinuityProjection(null).stableText).toBe('')
  })
})
