import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

describe('system user AI context summary', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('builds a prompt-facing profile summary from user fields', () => {
    const store = useSystemStore()

    store.user.name = 'V'
    store.user.gender = 'female'
    store.user.birthday = '1997-08-12'
    store.user.occupation = 'Mercenary'
    store.user.relationship = 'Partner'
    store.user.bio = 'Quiet, direct, and loyal.'

    const summary = store.getUserAiContextSummary()

    expect(summary.hasRecommendedBaseline).toBe(true)
    expect(summary.missingRecommendedKeys).toEqual([])
    expect(summary.fields.map((field) => field.key)).toEqual([
      'name',
      'gender',
      'birthday',
      'occupation',
      'relationship',
      'bio',
    ])
    expect(summary.promptText).toContain('User profile context:')
    expect(summary.promptText).toContain('Display name: V')
    expect(summary.promptText).toContain('Occupation: Mercenary')
    expect(summary.promptText).toContain('Relationship setting: Partner')
    expect(summary.promptText).toContain('Profile bio: Quiet, direct, and loyal.')
  })

  test('reports missing recommended identity fields and supports display-name override', () => {
    const store = useSystemStore()

    store.user.name = ''
    store.user.occupation = ''
    store.user.relationship = ''
    store.user.bio = ''

    const summary = store.getUserAiContextSummary({ displayName: 'Thread Alias' })

    expect(summary.promptText).toContain('Display name: Thread Alias')
    expect(summary.missingRecommendedKeys).toEqual(['occupation', 'relationship', 'bio'])
    expect(summary.hasRecommendedBaseline).toBe(false)
  })

  test('keeps restored profile fields visible to AI context summary', () => {
    const store = useSystemStore()

    expect(
      store.restoreFromBackup({
        user: {
          name: 'Mika',
          occupation: 'Archivist',
          relationship: 'Old friend',
          bio: 'Keeps careful notes about every promise.',
        },
      }),
    ).toBe(true)

    const summary = store.getUserAiContextSummary()

    expect(summary.promptText).toContain('Display name: Mika')
    expect(summary.promptText).toContain('Occupation: Archivist')
    expect(summary.promptText).toContain('Relationship setting: Old friend')
    expect(summary.promptText).toContain('Profile bio: Keeps careful notes about every promise.')
  })
})
