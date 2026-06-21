import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import { ROLE_DETAIL_SECTIONS, ROLE_DETAIL_SOURCE_KINDS } from '../src/lib/role-profile-schema'
import {
  buildRoleDetailItemGroups,
  roleDetailSourceHint,
  roleDetailSourceLabel,
  splitRoleDetailItems,
  useContactsDetailSectionModel,
} from '../src/composables/useContactsDetailSectionModel'

const t = (zh, en) => en || zh

const manualDetail = {
  id: 'manual_1',
  sourceKind: ROLE_DETAIL_SOURCE_KINDS.MANUAL,
  title: 'Coffee',
}

const eventDetail = {
  id: 'event_1',
  sourceKind: ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED,
  title: 'Dinner',
  memoryKey: 'memory_dinner',
  sourceModule: 'relationship_calendar_confirmed_event',
}

const createModel = ({
  selectedProfile = { id: 7 },
  detailItemsBySection = {},
} = {}) =>
  useContactsDetailSectionModel({
    selectedProfile: ref(selectedProfile),
    t,
    listDetailItemsForSection: (_profile, section) => detailItemsBySection[section] || [],
  })

describe('Contacts detail section model interface', () => {
  test('splits role detail items into manual and event-attached stats', () => {
    expect(splitRoleDetailItems([manualDetail, eventDetail, { id: 'legacy' }])).toEqual({
      items: [manualDetail, eventDetail, { id: 'legacy' }],
      stats: {
        total: 3,
        manual: 2,
        eventAttached: 1,
      },
      manualItems: [manualDetail, { id: 'legacy' }],
      eventAttachedItems: [eventDetail],
    })
  })

  test('builds section rows with localized metadata, stats, and grouped items', () => {
    const model = createModel({
      detailItemsBySection: {
        [ROLE_DETAIL_SECTIONS.PREFERENCES]: [manualDetail, eventDetail],
      },
    })

    expect(model.roleDetailSections.value.map((section) => [section.key, section.title])).toEqual([
      [ROLE_DETAIL_SECTIONS.PREFERENCES, 'Preferences'],
      [ROLE_DETAIL_SECTIONS.LIFE_PATTERN, 'Life Pattern'],
      [ROLE_DETAIL_SECTIONS.SOCIAL_GRAPH, 'Social Graph'],
    ])

    const [preferences, lifePattern] = model.selectedDetailSectionRows.value
    expect(preferences).toMatchObject({
      key: ROLE_DETAIL_SECTIONS.PREFERENCES,
      title: 'Preferences',
      empty: 'No preference entries yet.',
      stats: {
        total: 2,
        manual: 1,
        eventAttached: 1,
      },
    })
    expect(preferences.groups.map((group) => [group.key, group.title, group.items])).toEqual([
      [ROLE_DETAIL_SOURCE_KINDS.MANUAL, 'Manual details', [manualDetail]],
      [ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED, 'Event-attached', [eventDetail]],
    ])
    expect(lifePattern.items).toEqual([])
    expect(lifePattern.stats).toEqual({
      total: 0,
      manual: 0,
      eventAttached: 0,
    })
  })

  test('returns empty section rows without a selected profile', () => {
    const model = createModel({
      selectedProfile: null,
      detailItemsBySection: {
        [ROLE_DETAIL_SECTIONS.PREFERENCES]: [manualDetail],
      },
    })

    expect(model.selectedDetailSectionRows.value[0]).toMatchObject({
      key: ROLE_DETAIL_SECTIONS.PREFERENCES,
      items: [],
      stats: {
        total: 0,
        manual: 0,
        eventAttached: 0,
      },
      groups: [],
    })
  })

  test('labels source chips and explains manual versus event-attached cleanup policy', () => {
    expect(roleDetailSourceLabel(manualDetail, t)).toBe('Manual')
    expect(roleDetailSourceLabel(eventDetail, t)).toBe('Event-attached')
    expect(roleDetailSourceHint(manualDetail, t)).toBe(
      'User-entered detail. It can be deleted directly.',
    )
    expect(roleDetailSourceHint(eventDetail, t)).toBe(
      [
        'Attached by relationship events; delete the linked memory or reset the relationship to clear it.',
        'Memory: memory_dinner',
        'Source: relationship_calendar_confirmed_event',
      ].join(' \u00b7 '),
    )
  })

  test('builds only non-empty groups and exposes the shared policy copy', () => {
    const model = createModel()

    expect(buildRoleDetailItemGroups([manualDetail], { t })).toEqual([
      {
        key: ROLE_DETAIL_SOURCE_KINDS.MANUAL,
        title: 'Manual details',
        description: 'User-maintained stable facts that can be deleted here.',
        items: [manualDetail],
      },
    ])
    expect(model.roleDetailPolicyText.value).toBe(
      'Manual entries are user-maintained; event-attached entries come from Chat, Map, Calendar, and other development, and are cleared with memory deletion or relationship reset.',
    )
  })
})
