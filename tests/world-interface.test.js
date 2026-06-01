import { describe, expect, test } from 'vitest'
import {
  buildWorldPromptBlock,
  resolveActiveWorldOverview,
  resolveRoleKnowledgeState,
  resolveWorldContextForConsumer,
  resolveWorldviewText,
} from '../src/lib/world-interface'

const createSystemStore = ({
  globalWorldview = '',
  worldBook = '',
  knowledgePoints = [],
  profileTemplates = [],
  activePack = null,
  enabledPacks = [],
} = {}) => ({
  user: {
    globalWorldview,
    worldBook,
    knowledgePoints,
    profileTemplates,
    activeWorldPackId: activePack?.id || 'default_world',
    worldPackActivation: activePack
      ? { activePackId: activePack.id, state: 'active' }
      : { activePackId: 'default_world', state: 'active' },
  },
  getActiveWorldPack() {
    return activePack || {
      id: 'default_world',
      name: 'Default world',
      title: '默认世界',
      state: 'active',
      appBindings: [],
      serviceAccountTemplates: [],
    }
  },
  listEnabledWorldPacks() {
    if (enabledPacks.length > 0) return enabledPacks
    return activePack && activePack.id !== 'default_world' ? [activePack] : []
  },
  listKnowledgePoints(options = {}) {
    return options.enabledOnly
      ? this.user.knowledgePoints.filter((point) => point.enabled !== false)
      : this.user.knowledgePoints
  },
  listWorldProfileTemplates(worldId = 'default_world') {
    return this.user.profileTemplates.filter(
      (template) => template.scope === 'world' && template.worldId === worldId,
    )
  },
})

const createChatStore = (roleProfiles = []) => ({
  roleProfiles,
  getRoleProfileById(profileId) {
    return this.roleProfiles.find((profile) => Number(profile.id) === Number(profileId)) || null
  },
})

describe('world interface', () => {
  test('resolves global worldview with legacy worldBook fallback', () => {
    expect(resolveWorldviewText(createSystemStore({ globalWorldview: '  City rules  ' }))).toBe(
      'City rules',
    )
    expect(resolveWorldviewText(createSystemStore({ worldBook: 'Legacy world' }))).toBe(
      'Legacy world',
    )
  })

  test('summarizes active default world overview', () => {
    const systemStore = createSystemStore({
      globalWorldview: 'Default world baseline.',
      knowledgePoints: [
        { id: 'kp_a', title: 'A', content: 'A', enabled: true },
        { id: 'kp_b', title: 'B', content: 'B', enabled: false },
      ],
      profileTemplates: [
        { id: 'tpl_world', scope: 'world', worldId: 'default_world' },
        { id: 'tpl_other', scope: 'world', worldId: 'other_world' },
      ],
    })

    expect(resolveActiveWorldOverview({ systemStore })).toMatchObject({
      activePack: { id: 'default_world', state: 'active' },
      worldPackActivationState: 'active',
      worldPackAppBindingCount: 0,
      worldPackServiceTemplateCount: 0,
      worldviewCharCount: 23,
      knowledgeCount: 2,
      enabledKnowledgeCount: 1,
      disabledKnowledgeCount: 1,
      profileTemplateCount: 1,
      promptConsumerCount: 4,
    })
  })

  test('exposes active world pack bindings to consumers', () => {
    const systemStore = createSystemStore({
      globalWorldview: 'Pack-aware baseline.',
      activePack: {
        id: 'survival_city',
        name: 'Post-disaster survival city',
        title: '灾后生存都市',
        state: 'active',
        appBindings: [{ id: 'supply', title: '补给站', archetype: 'marketplace' }],
        serviceAccountTemplates: [{ id: 'dispatcher', title: '补给调度员' }],
      },
    })

    const context = resolveWorldContextForConsumer({
      systemStore,
      consumer: 'runtime',
    })

    expect(context).toMatchObject({
      consumer: 'runtime',
      activePack: { id: 'survival_city', title: '灾后生存都市' },
      worldPackAppBindingCount: 1,
      worldPackServiceTemplateCount: 1,
    })
    expect(context.worldPackAppBindings[0].title).toBe('补给站')
  })

  test('exposes enabled expansion packs without replacing the main active pack', () => {
    const systemStore = createSystemStore({
      globalWorldview: 'Modern campus baseline.',
      activePack: {
        id: 'default_world',
        name: 'Default world',
        title: '默认世界',
        state: 'active',
        appBindings: [],
        serviceAccountTemplates: [],
      },
      enabledPacks: [
        {
          id: 'school_life',
          name: 'School life expansion',
          title: '校园生活拓展',
          appBindings: [{ id: 'school_schedule_board' }],
          serviceAccountTemplates: [{ id: 'school_affairs_office' }],
        },
        {
          id: 'business_family',
          name: 'Business family expansion',
          title: '商业财阀拓展',
          appBindings: [{ id: 'business_board_calendar' }],
          serviceAccountTemplates: [],
        },
      ],
    })

    const overview = resolveActiveWorldOverview({ systemStore })

    expect(overview.activePack.id).toBe('default_world')
    expect(overview.enabledWorldPackCount).toBe(2)
    expect(overview.enabledWorldPacks.map((pack) => pack.id)).toEqual(['school_life', 'business_family'])
    expect(overview.worldPackAppBindingCount).toBe(2)
    expect(overview.worldPackServiceTemplateCount).toBe(1)
  })

  test('resolves enabled, disabled, missing, and overflow role-bound knowledge', () => {
    const enabledPoints = Array.from({ length: 9 }, (_, index) => ({
      id: `kp_${index + 1}`,
      title: `Point ${index + 1}`,
      content: `Content ${index + 1}`,
      tags: ['tag'],
      enabled: true,
    }))
    const systemStore = createSystemStore({
      knowledgePoints: [
        ...enabledPoints,
        { id: 'kp_disabled', title: 'Disabled', content: 'No', enabled: false },
      ],
    })
    const chatStore = createChatStore([
      {
        id: 7,
        name: 'Nova',
        knowledgePointIds: [
          ...enabledPoints.map((point) => point.id),
          'kp_disabled',
          'kp_missing',
        ],
      },
    ])

    const state = resolveRoleKnowledgeState({
      systemStore,
      chatStore,
      contact: { id: 1, kind: 'role', name: 'Nova Chat', profileId: 7 },
    })

    expect(state).toMatchObject({
      roleBound: true,
      profileName: 'Nova',
      configuredCount: 11,
      injectedCount: 8,
      disabledCount: 1,
      missingCount: 1,
      overflowCount: 1,
    })
    expect(state.injectedPoints.map((point) => point.id)).toEqual(
      enabledPoints.slice(0, 8).map((point) => point.id),
    )
  })

  test('builds prompt block from the same context consumed by Chat UI', () => {
    const systemStore = createSystemStore({
      globalWorldview: 'Night city baseline.',
      knowledgePoints: [
        {
          id: 'kp_city',
          title: 'City etiquette',
          content: 'Formal greeting only.',
          tags: ['style'],
          enabled: true,
        },
        {
          id: 'kp_hidden',
          title: 'Hidden note',
          content: 'Should stay out.',
          enabled: false,
        },
      ],
    })
    const chatStore = createChatStore([
      { id: 3, name: 'Iris', knowledgePointIds: ['kp_city', 'kp_hidden'] },
    ])

    const context = resolveWorldContextForConsumer({
      systemStore,
      chatStore,
      contact: { id: 10, kind: 'role', profileId: 3, name: 'Iris Chat' },
      consumer: 'chat',
    })
    const promptBlock = buildWorldPromptBlock(context)

    expect(context.injectedCount).toBe(1)
    expect(context.disabledCount).toBe(1)
    expect(promptBlock).toContain('Primary worldview rules: Night city baseline.')
    expect(promptBlock).toContain('City etiquette: Formal greeting only. [tags: style]')
    expect(promptBlock).not.toContain('Hidden note')
  })
})
