import { describe, expect, test } from 'vitest'
import {
  buildWorldPromptBlock,
  LEGACY_SINGLE_WORLD_ID,
  resolveActiveWorldOverview,
  resolveCurrentWorldContext,
  resolveRoleKnowledgeState,
  resolveWorldContextForConsumer,
  resolveWorldviewText,
} from '../src/lib/world-interface'

const createSystemStore = ({
  globalWorldview = '',
  worldBook = '',
  worldBookSourceLinks = [],
  encyclopediaEntries = [],
  knowledgePoints = encyclopediaEntries,
  profileTemplates = [],
  activePack = null,
  enabledPacks = [],
} = {}) => ({
  user: {
    globalWorldview,
    worldBook,
    worldBookSourceLinks,
    encyclopediaEntries: encyclopediaEntries.length > 0 ? encyclopediaEntries : knowledgePoints,
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
  listWorldBookSourceLinks() {
    return this.user.worldBookSourceLinks
  },
  listEncyclopediaEntries(options = {}) {
    return options.enabledOnly
      ? this.user.encyclopediaEntries.filter((point) => point.enabled !== false)
      : this.user.encyclopediaEntries
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

const createBookStore = (assets = []) => ({
  assets,
  findAssetById(assetId) {
    return this.assets.find((asset) => asset.id === assetId) || null
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
      identity: {
        worldId: LEGACY_SINGLE_WORLD_ID,
        title: 'Current world',
      },
      activePack: { id: 'default_world', state: 'active' },
      capabilities: {
        activePack: null,
        enabledPacks: [],
      },
      worldPackActivationState: 'active',
      worldPackAppBindingCount: 0,
      worldPackServiceTemplateCount: 0,
      worldviewCharCount: 23,
      knowledgeCount: 2,
      enabledKnowledgeCount: 1,
      disabledKnowledgeCount: 1,
      profileTemplateCount: 2,
      promptConsumerCount: 4,
    })
  })

  test('keeps canonical identity and setting activation stable when the active Pack changes', () => {
    const sourceAsset = {
      id: 'shared_world_source',
      title: 'Shared world source',
      content: 'The same current-world narrative.',
      contentFingerprint: 'fp_shared',
      version: 1,
      sections: [],
    }
    const sharedState = {
      globalWorldview: 'Shared fallback.',
      worldBookSourceLinks: [{
        id: 'link_shared',
        assetId: sourceAsset.id,
        role: 'main_worldview',
        enabled: true,
        sourceFingerprint: sourceAsset.contentFingerprint,
        createdAt: 1,
      }],
      encyclopediaEntries: [{
        id: 'entry_shared',
        title: 'Shared entry',
        content: 'Selected independently.',
        enabled: true,
      }],
      profileTemplates: [{
        id: 'template_legacy_pack_scope',
        scope: 'world',
        worldId: 'pack_alpha',
        enabled: true,
      }],
    }
    const packAlpha = {
      id: 'pack_alpha',
      title: 'Pack Alpha',
      appBindings: [{ id: 'alpha_app' }],
      serviceAccountTemplates: [],
    }
    const packBeta = {
      id: 'pack_beta',
      title: 'Pack Beta',
      appBindings: [{ id: 'beta_app' }],
      serviceAccountTemplates: [],
    }
    const bookStore = createBookStore([sourceAsset])

    const alpha = resolveCurrentWorldContext({
      systemStore: createSystemStore({ ...sharedState, activePack: packAlpha }),
      bookStore,
      consumer: 'runtime',
    })
    const beta = resolveCurrentWorldContext({
      systemStore: createSystemStore({ ...sharedState, activePack: packBeta }),
      bookStore,
      consumer: 'runtime',
    })

    expect(alpha.identity).toEqual({ worldId: LEGACY_SINGLE_WORLD_ID, title: 'Current world' })
    expect(beta.identity).toEqual(alpha.identity)
    expect(beta.narrative).toEqual(alpha.narrative)
    expect(beta.encyclopedia).toEqual(alpha.encyclopedia)
    expect(beta.profiles).toEqual(alpha.profiles)
    expect(alpha.profiles.enabledTemplates).toEqual([expect.objectContaining({
      id: 'template_legacy_pack_scope',
      enabled: true,
    })])
    expect(alpha.profiles.enabledTemplates[0]).not.toHaveProperty('worldId')
    expect(alpha.capabilities.activePack.id).toBe('pack_alpha')
    expect(beta.capabilities.activePack.id).toBe('pack_beta')
    expect(alpha.capabilities.appBindings).toEqual([{ id: 'alpha_app' }])
    expect(beta.capabilities.appBindings).toEqual([{ id: 'beta_app' }])
    expect(alpha).not.toHaveProperty('legacyScopeKey')
    expect(alpha.identity.worldId).not.toBe(packAlpha.id)
  })

  test('projects the built-in default Pack as zero optional capabilities', () => {
    const systemStore = createSystemStore()
    systemStore.listEnabledWorldPacks = () => [systemStore.getActiveWorldPack()]

    const context = resolveCurrentWorldContext({ systemStore, consumer: 'runtime' })

    expect(context.identity.worldId).toBe(LEGACY_SINGLE_WORLD_ID)
    expect(context.capabilities).toMatchObject({
      activePack: null,
      enabledPacks: [],
      appBindings: [],
      serviceTemplates: [],
    })
    expect(context.enabledWorldPackCount).toBe(0)
  })

  test('returns defensive immutable snapshots without changing owner state', () => {
    const pack = {
      id: 'capability_pack',
      title: 'Capability Pack',
      appBindings: [{ id: 'original_app' }],
      serviceAccountTemplates: [],
    }
    const systemStore = createSystemStore({
      activePack: pack,
      profileTemplates: [{
        id: 'template_original',
        scope: 'world',
        worldId: pack.id,
        enabled: true,
      }],
    })
    const context = resolveCurrentWorldContext({ systemStore })

    expect(Object.isFrozen(context)).toBe(true)
    expect(Object.isFrozen(context.identity)).toBe(true)
    expect(Object.isFrozen(context.capabilities.enabledPacks[0].appBindings)).toBe(true)
    expect(() => {
      context.identity.worldId = 'mutated_world'
    }).toThrow(TypeError)
    expect(() => {
      context.capabilities.enabledPacks[0].appBindings[0].id = 'mutated_app'
    }).toThrow(TypeError)
    expect(pack.appBindings[0].id).toBe('original_app')
    expect(systemStore.user.profileTemplates[0].id).toBe('template_original')
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
        encyclopediaEntryIds: [
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
    expect(state.injectedEntries?.map((entry) => entry.id)).toEqual(
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
      { id: 3, name: 'Iris', encyclopediaEntryIds: ['kp_city', 'kp_hidden'] },
    ])

    const context = resolveWorldContextForConsumer({
      systemStore,
      chatStore,
      contact: { id: 10, kind: 'role', profileId: 3, name: 'Iris Chat' },
      consumer: 'chat',
    })
    const promptBlock = buildWorldPromptBlock(context)

    expect(context.injectedCount).toBe(1)
    expect(context.injectedEntryCount).toBe(1)
    expect(context.disabledCount).toBe(1)
    expect(context.injectedEntries?.map((entry) => entry.id)).toEqual(['kp_city'])
    expect(context.injectedPoints.map((point) => point.id)).toEqual(['kp_city'])
    expect(promptBlock).toContain('Primary worldview rules: Night city baseline.')
    expect(promptBlock).toContain('City etiquette: Formal greeting only. [tags: style]')
    expect(promptBlock).not.toContain('Hidden note')
  })

  test('injects built-in K-pop Book sources through explicit WorldBook links', () => {
    const asset = {
      id: 'built_in_modern_seoul_kpop_main_worldview',
      title: '现代首尔 K-pop 娱乐圈：主世界观',
      content: '本世界观设定在 2026 年的现代首尔。K-pop 娱乐圈平行世界。',
      contentFingerprint: 'fp_kpop',
      version: 1,
      sections: [],
    }
    const systemStore = createSystemStore({
      globalWorldview: 'Fallback note.',
      worldBookSourceLinks: [
        {
          id: 'world_source_kpop',
          assetId: asset.id,
          role: 'main_worldview',
          enabled: true,
          sourceFingerprint: asset.contentFingerprint,
        },
      ],
    })
    const bookStore = createBookStore([asset])

    const context = resolveWorldContextForConsumer({
      systemStore,
      bookStore,
      consumer: 'chat',
    })

    expect(context.activeBookSourceCount).toBe(1)
    expect(context.worldview).toContain('K-pop 娱乐圈平行世界')
    expect(buildWorldPromptBlock(context)).toContain('Primary worldview rules')
    expect(buildWorldPromptBlock(context)).toContain('K-pop 娱乐圈平行世界')
  })
})
