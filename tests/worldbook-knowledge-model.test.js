import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import { useWorldBookKnowledgeModel } from '../src/composables/useWorldBookKnowledgeModel'

const t = (zh, en) => en || zh

const createFixture = () => {
  const points = [
    {
      id: 'kp_unused',
      title: 'Unused Term',
      content: 'Dorm vocabulary.',
      tags: ['culture'],
      enabled: true,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'kp_profile',
      title: 'Profile Only',
      content: 'A field used by an unbound profile.',
      tags: ['profile', 'culture'],
      enabled: true,
      createdAt: 2000,
      updatedAt: 2000,
    },
    {
      id: 'kp_chat',
      title: 'Chat Ready',
      content: 'A prompt-ready fact for linked contacts.',
      tags: ['chat', 'map'],
      enabled: true,
      createdAt: 3000,
      updatedAt: 3000,
    },
    {
      id: 'kp_disabled',
      title: 'Disabled Fact',
      content: 'Paused context.',
      tags: ['map'],
      enabled: false,
      createdAt: 4000,
      updatedAt: 4000,
    },
  ]
  const pointById = new Map(points.map((point) => [point.id, point]))
  const systemStore = {
    getKnowledgePointById: (id) => pointById.get(id) || null,
    listKnowledgePoints: ({ keyword = '' } = {}) => {
      const normalized = String(keyword || '').trim().toLowerCase()
      if (!normalized) return points
      return points.filter((point) =>
        [point.title, point.content, ...(Array.isArray(point.tags) ? point.tags : [])]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
    },
  }
  return { points, systemStore }
}

const createModel = ({
  points,
  systemStore,
  roleProfiles = [
    { id: 1, name: 'Ada', knowledgePointIds: ['kp_profile'] },
    { id: 2, name: 'Ben', knowledgePointIds: ['kp_chat'] },
    { id: 3, name: 'Cy', knowledgePointIds: ['kp_chat'] },
    { id: 4, name: 'Dia', knowledgePointIds: ['kp_disabled'] },
  ],
  contacts = [
    { id: 'contact_ben', kind: 'role', profileId: 2 },
    { id: 'contact_cy_a', kind: 'role', profileId: 3 },
    { id: 'contact_cy_b', kind: 'role', profileId: 3 },
  ],
  search = '',
  tag = 'all',
  usage = 'all',
  sort = 'recent',
  deepLinkPointIds = [],
  deepLinkSource = '',
  deepLinkKeyword = '',
  deepLinkTag = 'all',
  deepLinkUsage = 'all',
} = {}) => {
  const state = {
    knowledgeSearchKeyword: ref(search),
    knowledgeTagFilter: ref(tag),
    knowledgeUsageFilter: ref(usage),
    knowledgeUsageSort: ref(sort),
    knowledgeDeepLinkPointIds: ref(deepLinkPointIds),
    knowledgeDeepLinkSource: ref(deepLinkSource),
    knowledgeDeepLinkKeyword: ref(deepLinkKeyword),
    knowledgeDeepLinkTag: ref(deepLinkTag),
    knowledgeDeepLinkUsage: ref(deepLinkUsage),
  }
  const model = useWorldBookKnowledgeModel({
    systemStore,
    knowledgePoints: ref(points),
    roleProfiles: ref(roleProfiles),
    contacts: ref(contacts),
    ...state,
    t,
  })
  return { model, state }
}

describe('WorldBook knowledge model interface', () => {
  test('classifies encyclopedia usage by profile and Chat bindings', () => {
    const fixture = createFixture()
    const { model } = createModel(fixture)

    expect(model.enabledKnowledgePointCount.value).toBe(3)
    expect(model.boundKnowledgePointCount.value).toBe(3)
    expect(model.chatReadyKnowledgePointCount.value).toBe(1)
    expect(model.getKnowledgePointUsageState(fixture.points[0])).toBe('unused')
    expect(model.getKnowledgePointUsageState(fixture.points[1])).toBe('profile_only')
    expect(model.getKnowledgePointUsageState(fixture.points[2])).toBe('chat_ready')
    expect(model.getKnowledgePointUsageState(fixture.points[3])).toBe('disabled')
    expect(model.getKnowledgePointUsage(fixture.points[2])).toMatchObject({
      chatBindingCount: 3,
      chatProfileCount: 2,
    })
    expect(model.getKnowledgePointUsageBadge(fixture.points[2])).toMatchObject({
      label: 'In Chat',
      tone: 'emerald',
    })
    expect(model.describeKnowledgePointUsage(fixture.points[2])).toContain(
      '2 profiles connect to 3 Chat contacts',
    )
  })

  test('filters by keyword, usage, and tag with stable option counts', () => {
    const fixture = createFixture()
    const { model } = createModel({
      ...fixture,
      search: 'fact',
      usage: 'chat_ready',
      tag: 'map',
    })

    expect(model.searchedKnowledgePoints.value.map((point) => point.id)).toEqual([
      'kp_chat',
      'kp_disabled',
    ])
    expect(model.knowledgeUsageFilterOptions.value).toEqual([
      { value: 'all', label: 'All', count: 2 },
      { value: 'chat_ready', label: 'In Chat', count: 1 },
      { value: 'profile_only', label: 'Profile only', count: 0 },
      { value: 'unused', label: 'Unused', count: 0 },
      { value: 'disabled', label: 'Disabled', count: 1 },
    ])
    expect(model.knowledgeTagFilterOptions.value).toEqual([
      { value: 'all', label: 'All tags', count: 1 },
      { value: 'chat', label: '#chat', count: 1 },
      { value: 'map', label: '#map', count: 1 },
    ])
    expect(model.visibleKnowledgePoints.value.map((point) => point.id)).toEqual(['kp_chat'])
  })

  test('keeps a selected missing tag option visible with zero count', () => {
    const fixture = createFixture()
    const { model } = createModel({
      ...fixture,
      usage: 'profile_only',
      tag: 'missing-tag',
    })

    expect(model.knowledgeTagFilterOptions.value).toContainEqual({
      value: 'missing-tag',
      label: '#missing-tag',
      count: 0,
    })
    expect(model.visibleKnowledgePoints.value).toEqual([])
  })

  test('sorts visible entries by state, role count, title, and recency', () => {
    const fixture = createFixture()
    const { model, state } = createModel(fixture)

    expect(model.visibleKnowledgePoints.value.map((point) => point.id)).toEqual([
      'kp_disabled',
      'kp_chat',
      'kp_profile',
      'kp_unused',
    ])

    state.knowledgeUsageSort.value = 'state'
    expect(model.visibleKnowledgePoints.value.map((point) => point.id)).toEqual([
      'kp_unused',
      'kp_profile',
      'kp_disabled',
      'kp_chat',
    ])

    state.knowledgeUsageSort.value = 'role_count'
    expect(model.visibleKnowledgePoints.value.map((point) => point.id)).toEqual([
      'kp_chat',
      'kp_disabled',
      'kp_profile',
      'kp_unused',
    ])

    state.knowledgeUsageSort.value = 'title'
    expect(model.visibleKnowledgePoints.value.map((point) => point.id)).toEqual([
      'kp_chat',
      'kp_disabled',
      'kp_profile',
      'kp_unused',
    ])
  })

  test('syncs route deep-link query into filters and scopes to existing entries', () => {
    const fixture = createFixture()
    const { model, state } = createModel(fixture)

    model.syncWorldBookDeepLink({
      source: 'map',
      entries: 'kp_chat,kp_missing,kp_disabled',
      tag: 'map',
      usage: 'disabled',
    })

    expect(state.knowledgeDeepLinkSource.value).toBe('map')
    expect(state.knowledgeDeepLinkPointIds.value).toEqual(['kp_chat', 'kp_disabled'])
    expect(state.knowledgeSearchKeyword.value).toBe('')
    expect(state.knowledgeTagFilter.value).toBe('map')
    expect(state.knowledgeUsageFilter.value).toBe('disabled')
    expect(model.knowledgeDeepLinkActive.value).toBe(true)
    expect(model.knowledgeDeepLinkSummary.value).toBe(
      'Map scoped 2 related encyclopedia entries.',
    )
    expect(model.visibleKnowledgePoints.value.map((point) => point.id)).toEqual(['kp_disabled'])
    expect(model.isDeepLinkedKnowledgePoint(fixture.points[2])).toBe(true)
  })

  test('single-entry deep links seed search text from the entry title', () => {
    const fixture = createFixture()
    const { model, state } = createModel(fixture)

    model.syncWorldBookDeepLink({
      source: 'chat',
      entry: 'kp_chat',
    })

    expect(state.knowledgeSearchKeyword.value).toBe('Chat Ready')
    expect(model.knowledgeDeepLinkPoints.value.map((point) => point.id)).toEqual(['kp_chat'])
    expect(model.knowledgeDeepLinkSummary.value).toBe(
      'Chat scoped 1 related encyclopedia entries.',
    )
  })

  test('formats bound role names with overflow copy', () => {
    const fixture = createFixture()
    const { model } = createModel({
      ...fixture,
      roleProfiles: [
        { id: 1, name: 'Ada', knowledgePointIds: ['kp_chat'] },
        { id: 2, name: 'Ben', knowledgePointIds: ['kp_chat'] },
        { id: 3, name: 'Cy', knowledgePointIds: ['kp_chat'] },
        { id: 4, name: 'Dia', knowledgePointIds: ['kp_chat'] },
        { id: 5, name: 'Eli', knowledgePointIds: ['kp_chat'] },
      ],
      contacts: [],
    })

    expect(model.formatKnowledgePointProfileNames(fixture.points[2])).toBe('Ada / Ben / Cy / Dia +1')
  })
})
