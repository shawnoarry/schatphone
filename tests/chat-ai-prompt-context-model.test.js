import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import {
  clampChatPromptContextTurns,
  clampChatPromptReplyCount,
  formatChatTruthTimestampForPrompt,
  resolveChatAssistantImageBlockPolicy,
  summarizeChatTruthEventsForPrompt,
  useChatAiPromptContextModel,
} from '../src/composables/useChatAiPromptContextModel'
import { DEFAULT_CHAT_THREAD_AI_PREFS } from '../src/composables/useChatActiveThreadModel'
import {
  WEATHER_DISPLAY_MODE_CUSTOM,
  normalizeWeatherSettings,
} from '../src/lib/weather-contract'

const createChatStore = ({ messages = [], contacts = [], roleProfiles = [] } = {}) => ({
  roleProfiles,
  getMessagesByContactId: () => messages,
  getRoleProfileById: (profileId) =>
    roleProfiles.find((profile) => Number(profile.id) === Number(profileId)) || null,
  getModuleIdentity: () => ({ nickname: 'Tester' }),
  isModuleIdentityAnonymousForContact: (contactId) => contactId === 404,
  getServiceAccountLinkContract: () => ({
    sourceNotificationPlan: {
      summary: 'Shopping and delivery updates after join',
      rows: [{ label: 'Shopping', sourceModule: 'shopping' }],
    },
  }),
  getContactById: (contactId) => contacts.find((contact) => contact.id === contactId) || null,
})

const createSystemStore = () => ({
  user: {
    globalWorldview: 'Default city rules',
    worldBookSourceLinks: [],
    activeWorldPackId: 'default',
    worldPacks: [],
  },
  getChatTruthSnapshot: () => ({
    relationship: {
      stage: 'warm',
      affinity: 62,
      trust: 71,
      distance: 28,
      dependency: 24,
      tension: 6,
    },
    counters: {
      userMessageCount: 2,
      assistantMessageCount: 1,
      manualTriggerCount: 1,
      autoTriggerCount: 0,
      rerollCount: 0,
      notifyOnlySkipCount: 1,
      resumeSettlementCount: 1,
    },
    timestamps: {
      lastInteractionAt: Date.UTC(2026, 0, 1, 1),
      lastUserMessageAt: Date.UTC(2026, 0, 1, 2),
      lastAssistantMessageAt: Date.UTC(2026, 0, 1, 3),
    },
    recentEvents: [
      { at: Date.UTC(2026, 0, 1, 4), action: 'resume_settlement', payload: { missedCycles: 3 } },
      { at: Date.UTC(2026, 0, 1, 5), action: 'notify_only_skip' },
    ],
  }),
  getUserAiContextSummary: ({ displayName }) => ({
    promptText: `User profile: ${displayName}`,
  }),
})

const createModel = ({
  messages = [],
  contacts = [],
  roleProfiles = [],
  user = { name: 'Fallback User' },
  relationshipRuntimeStore,
  systemStore = createSystemStore(),
  weatherStore,
  mapStore,
  systemLanguage,
} = {}) =>
  useChatAiPromptContextModel({
    chatStore: createChatStore({ messages, contacts, roleProfiles }),
    systemStore,
    bookStore: { assets: [] },
    relationshipRuntimeStore:
      relationshipRuntimeStore || {
        buildPromptContextForTarget: (target) =>
          target.entityKey ? `Runtime facts for ${target.entityKey}` : '',
      },
    weatherStore,
    mapStore,
    user: ref(user),
    systemLanguage,
    responseStyleOptions: ref([
      { value: 'immersive' },
      { value: 'natural' },
      { value: 'concise' },
    ]),
    defaultThreadAiPrefs: DEFAULT_CHAT_THREAD_AI_PREFS,
    getMessagePrimaryText: (message) => message.displayText || message.content || '',
    getActiveMessageSenderName: () => 'Mina',
  })

describe('Chat AI prompt context model interface', () => {
  test('projects mapped weather without exposing the private source city', () => {
    const vancouver = {
      id: 'open-meteo-6173331',
      providerId: '6173331',
      name: 'Vancouver',
      nameZh: '温哥华',
      nameEn: 'Vancouver',
      country: 'Canada',
      latitude: 49.2827,
      longitude: -123.1207,
      timezone: 'America/Vancouver',
    }
    const systemStore = createSystemStore()
    systemStore.settings = {
      system: { language: 'zh-CN' },
      weather: normalizeWeatherSettings({
        savedLocations: [vancouver],
        activeLocationId: vancouver.id,
        mapping: {
          global: {
            displayMode: WEATHER_DISPLAY_MODE_CUSTOM,
            displayName: '伊莱西亚',
            sourceLocationId: vancouver.id,
            exposeSourceLocationToAi: false,
          },
        },
      }),
    }
    const model = createModel({
      systemStore,
      weatherStore: {
        activeForecast: {
          current: {
            temperature: 12,
            apparentTemperature: 10,
            precipitationProbability: 70,
            condition: { labelZh: '小雨', labelEn: 'Light rain' },
          },
        },
      },
      mapStore: { currentLocation: { detail: '虚构城区' } },
      systemLanguage: ref('zh-CN'),
    })
    const prompt = model.buildWeatherPromptBlock()

    expect(prompt).toContain('伊莱西亚')
    expect(prompt).toContain('小雨')
    expect(prompt).not.toContain('温哥华')
    expect(prompt).not.toContain('Vancouver')
    expect(prompt).toContain('source location is private')
  })

  test('normalizes prompt limits and truth event summaries', () => {
    expect(clampChatPromptContextTurns(1)).toBe(2)
    expect(clampChatPromptContextTurns(99)).toBe(20)
    expect(clampChatPromptContextTurns('bad')).toBe(DEFAULT_CHAT_THREAD_AI_PREFS.contextTurns)
    expect(clampChatPromptReplyCount(0)).toBe(1)
    expect(clampChatPromptReplyCount(9)).toBe(3)
    expect(clampChatPromptReplyCount('bad')).toBe(DEFAULT_CHAT_THREAD_AI_PREFS.replyCount)
    expect(formatChatTruthTimestampForPrompt(0)).toBe('none')
    expect(formatChatTruthTimestampForPrompt(Date.UTC(2026, 0, 1))).toBe('2026-01-01T00:00:00.000Z')
    expect(
      summarizeChatTruthEventsForPrompt([
        { at: Date.UTC(2026, 0, 2), action: 'resume_settlement', payload: { missedCycles: 2 } },
      ]),
    ).toContain('resume_settlement(2)')
  })

  test('builds context windows, AI messages, quote candidates, and smart reply history', () => {
    const messages = Array.from({ length: 9 }, (_, index) => ({
      id: `m${index + 1}`,
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message ${index + 1}`,
      displayText: `display ${index + 1}`,
    }))
    const model = createModel({ messages })

    const context = model.getContextSourceMessages(1, { untilMessageId: 'm8', contextTurns: 3 })
    expect(context.map((message) => message.id)).toEqual(['m3', 'm4', 'm5', 'm6', 'm7', 'm8'])

    expect(model.toAiCallMessages(context)[0]).toEqual({
      role: 'user',
      content: 'message 3',
    })
    expect(model.toQuoteCandidates(context)[0]).toEqual({
      id: 'm3',
      role: 'user',
      preview: 'display 3',
    })
    expect(model.getSmartReplyHistory(1)).toHaveLength(5)
    expect(model.getAutomationBaseFingerprint(1)).toContain('message 9')
  })

  test('uses the same bounded source and AI messages for normal and reroll request paths', () => {
    const messages = [
      { id: 'old', role: 'assistant', content: 'x'.repeat(120) },
      { id: 'recent-user', role: 'user', content: 'Keep this request.' },
      { id: 'target', role: 'assistant', content: 'Replace this answer.' },
      { id: 'after-target', role: 'user', content: 'Must not enter reroll context.' },
    ]
    const model = createModel({ messages })

    const normal = model.projectAiRequestContext(1, {
      untilMessageId: 'recent-user',
      contextTurns: 4,
      characterBudget: 40,
    })
    const reroll = model.projectAiRequestContext(1, {
      beforeMessageId: 'target',
      contextTurns: 4,
      characterBudget: 40,
    })

    expect(normal.sourceMessages.map((message) => message.id)).toEqual(['recent-user'])
    expect(normal.aiMessages.map((message) => message.content)).toEqual(['Keep this request.'])
    expect(reroll.sourceMessages.map((message) => message.id)).toEqual(['recent-user'])
    expect(reroll.aiMessages).toEqual(normal.aiMessages)
  })

  test('extracts AI context from recalled, quoted, rich, service, and revised messages', () => {
    const model = createModel()

    expect(model.extractMessageTextForContext({ role: 'assistant', recalledAt: 1 })).toBe(
      '[message recalled] Mina recalled one of their own messages. The original content is unavailable.',
    )
    expect(
      model.extractMessageTextForContext({
        role: 'user',
        quote: { role: 'assistant', preview: 'older answer' },
        blocks: [{ type: 'transfer_virtual', amount: '88', currency: 'CNY', note: 'snack fund' }],
      }),
    ).toContain('[quoted assistant] older answer')
    expect(
      model.extractMessageTextForContext({
        role: 'assistant',
        blocks: [
          {
            type: 'service_notification',
            serviceLabel: 'Daily Fresh',
            title: 'Order shipped',
            amount: 'CNY 42',
            summary: 'Rider is nearby',
            route: '/shopping/orders/1',
          },
        ],
      }),
    ).toBe(
      '[service notification] Daily Fresh | title: Order shipped | amount: CNY 42 | summary: Rider is nearby | source action: /shopping/orders/1',
    )
    expect(
      model.extractMessageTextForContext({
        role: 'assistant',
        content: 'old raw',
        semanticRevision: { revisedText: 'approved revision' },
      }),
    ).toBe('approved revision')
  })

  test('builds role, service, group, anonymous, and image-policy prompt instructions', () => {
    const contacts = [
      { id: 2, name: 'Ari', role: 'leader' },
      { id: 3, name: 'Bo', role: 'manager' },
    ]
    const roleProfiles = [
      {
        id: 10,
        name: 'Mina',
        profileValues: [{ fieldId: 'favorite', value: 'tea' }],
      },
      {
        id: 999,
        entityType: 'self_profile',
        profileValues: [
          { fieldId: 'publicName', value: 'You', visibilityLevel: 'public' },
          { fieldId: 'secret', value: 'hidden', visibilityLevel: 'intimate' },
        ],
      },
    ]
    const model = createModel({ contacts, roleProfiles })
    const aiPrefs = {
      ...DEFAULT_CHAT_THREAD_AI_PREFS,
      replyCount: 2,
      responseStyle: 'natural',
      bilingualEnabled: true,
      secondaryLanguage: 'en',
      allowQuoteReply: true,
      allowSelfQuote: false,
      allowImageVirtualWithoutReference: false,
    }

    const rolePrompt = model.buildSystemPrompt(
      { id: 1, kind: 'role', name: 'Mina', role: 'idol', bio: 'Warm and precise.', profileId: 10 },
      aiPrefs,
      {
        replyCount: 2,
        imageReferences: [{ label: 'ref' }],
        providerCapabilities: { preferredImageReferenceMode: 'native_url', kind: 'openai' },
      },
    )
    expect(rolePrompt).toContain('Role persona: Warm and precise.')
    expect(rolePrompt).toContain('Current role profile values: favorite: tea.')
    expect(rolePrompt).toContain('Visible user self-profile values: publicName: You.')
    expect(rolePrompt).not.toContain('secret: hidden')
    expect(rolePrompt).toContain('Allow plain, quote_user. Disallow quote_self.')
    expect(rolePrompt).toContain('image_virtual blocks are allowed only when reference cues are present')
    expect(rolePrompt).not.toContain('native_url')
    expect(rolePrompt).not.toContain('provider: openai')
    expect(rolePrompt).toContain('Do not claim to have seen unavailable details')
    expect(rolePrompt).toContain('Never invent, guess, or output a bank name paired with an account number')
    expect(rolePrompt).toContain('Only a Wallet-confirmed receipt represents a completed transfer')

    const roleContext = model.buildPromptContext(
      { id: 1, kind: 'role', name: 'Mina', role: 'idol', bio: 'Warm and precise.', profileId: 10 },
      aiPrefs,
      {
        replyCount: 2,
        imageReferences: [{ label: 'ref' }],
        providerCapabilities: { preferredImageReferenceMode: 'native_url', kind: 'openai' },
      },
    )
    expect(roleContext.cache.key).toMatch(/^schatphone:chat:v1:id-[a-f0-9]{8}$/)
    expect(roleContext.cache.key).not.toContain('role:10')
    expect(roleContext.stablePrefix).toContain('Role persona: Warm and precise.')
    expect(roleContext.stablePrefix).not.toContain('Relationship truth stage: warm.')
    expect(roleContext.dynamicContext).toContain('Relationship truth stage: warm.')
    expect(roleContext.dynamicContext).toContain('Runtime facts for role:10')
    expect(roleContext.systemPrompt.indexOf('Role persona: Warm and precise.')).toBeLessThan(
      roleContext.systemPrompt.indexOf('Relationship truth stage: warm.'),
    )

    const servicePrompt = model.buildSystemPrompt(
      { id: 9, kind: 'service', name: 'Daily Fresh', role: 'service', serviceTemplate: 'Helpful store account' },
      aiPrefs,
    )
    expect(servicePrompt).toContain('Conversation type: service account')
    expect(servicePrompt).toContain('Service account rule: behave as an interactive chat account')
    expect(servicePrompt).toContain('These schedules are descriptive')

    const groupPrompt = model.buildSystemPrompt(
      {
        id: 8,
        kind: 'group',
        name: 'Team',
        role: 'group',
        groupReplyMode: 'round-robin',
        groupMemberIds: [2, 3],
      },
      aiPrefs,
    )
    expect(groupPrompt).toContain('Conversation type: group chat')
    expect(groupPrompt).toContain('Group members: Ari (leader); Bo (manager).')

    const anonymousPrompt = model.buildSystemPrompt(
      { id: 404, kind: 'role', name: 'Stranger', role: 'unknown' },
      aiPrefs,
    )
    expect(anonymousPrompt).toContain('User identity: hidden.')
    expect(anonymousPrompt).not.toContain('Visible user self-profile values:')
    expect(anonymousPrompt).not.toContain('publicName: You')

    expect(resolveChatAssistantImageBlockPolicy(aiPrefs, [])).toMatchObject({
      allowImageVirtual: false,
      referenceCount: 0,
    })
  })

  test('passes only a bounded recent-chat query into one relationship projection', () => {
    const relationshipRuntimeStore = {
      buildPromptProjectionForTarget: (...args) => {
        relationshipRuntimeStore.calls.push(args)
        return { text: 'Runtime recall result', memoryRecall: { items: [] } }
      },
      calls: [],
    }
    const model = createModel({
      relationshipRuntimeStore,
      roleProfiles: [{ id: 10, name: 'Mina', profileValues: [], detailItems: [] }],
    })

    model.buildPromptContext(
      { id: 7, kind: 'role', name: 'Mina', role: 'friend', profileId: 10 },
      DEFAULT_CHAT_THREAD_AI_PREFS,
      {
        contextMessages: Array.from({ length: 6 }, (_, index) => ({
          role: index % 2 === 0 ? 'user' : 'assistant',
          content: `topic-${index + 1}`,
        })),
      },
    )

    expect(relationshipRuntimeStore.calls).toHaveLength(1)
    expect(relationshipRuntimeStore.calls[0][1].recallQuery).toBe(
      'topic-3\ntopic-4\ntopic-5\ntopic-6',
    )
  })

  test('places manual role details in the stable prefix and linked event clues in the dynamic tail', () => {
    const relationshipRuntimeStore = {
      buildPromptProjectionForTarget: () => ({
        text: 'Runtime memory: birthday necklace.',
        memoryRecall: {
          items: [
            {
              memoryKey: 'birthday_necklace',
              recallText: 'Received a birthday necklace.',
              reviewStatus: 'active',
            },
          ],
        },
      }),
    }
    const model = createModel({
      relationshipRuntimeStore,
      roleProfiles: [
        {
          id: 10,
          name: 'Mina',
          profileValues: [],
          detailItems: [
            {
              id: 'manual-tea',
              section: 'preferences',
              sourceKind: 'manual',
              title: 'Tea',
              detail: 'Likes jasmine tea.',
              updatedAt: 2,
            },
            {
              id: 'event-ribbon',
              section: 'lifePattern',
              sourceKind: 'event_attached',
              title: 'Ribbon',
              detail: 'Kept the gift ribbon.',
              memoryKey: 'birthday_necklace',
              updatedAt: 1,
            },
            {
              id: 'orphan',
              section: 'lifePattern',
              sourceKind: 'event_attached',
              title: 'Orphan',
              detail: 'Must not enter the prompt.',
              memoryKey: 'missing_memory',
              updatedAt: 3,
            },
          ],
        },
      ],
    })

    const context = model.buildPromptContext(
      { id: 1, kind: 'role', name: 'Mina', role: 'friend', profileId: 10 },
      DEFAULT_CHAT_THREAD_AI_PREFS,
    )

    expect(context.stablePrefix).toContain('Preferences: Tea: Likes jasmine tea.')
    expect(context.stablePrefix).not.toContain('Kept the gift ribbon.')
    expect(context.dynamicContext).toContain('Ribbon: Kept the gift ribbon.')
    expect(context.dynamicContext).not.toContain('Must not enter the prompt.')
  })

  test('does not read role continuity for non-role contacts with stale profile ids', () => {
    const relationshipRuntimeStore = {
      buildPromptProjectionForTarget: () => {
        throw new Error('non-role contacts must not read relationship memory')
      },
    }
    const model = createModel({
      relationshipRuntimeStore,
      roleProfiles: [
        {
          id: 10,
          profileValues: [{ label: 'Secret', value: 'Role-only value' }],
          detailItems: [
            {
              id: 'role-only',
              section: 'preferences',
              sourceKind: 'manual',
              title: 'Secret',
              detail: 'Role-only detail',
            },
          ],
        },
      ],
    })

    const context = model.buildPromptContext(
      { id: 90, kind: 'service', name: 'Service', role: 'helper', profileId: 10 },
      DEFAULT_CHAT_THREAD_AI_PREFS,
    )

    expect(context.systemPrompt).not.toContain('Role-only value')
    expect(context.systemPrompt).not.toContain('Role-only detail')
  })

  test('changes the cache key when stable role identity changes but not when relationship state changes', () => {
    const roleProfiles = [
      {
        id: 10,
        name: 'Mina',
        role: 'friend',
        bio: 'Quietly playful.',
        profileValues: [{ fieldId: 'favorite', value: 'tea' }],
        detailItems: [],
      },
    ]
    const runtime = {
      currentText: 'Relationship runtime snapshot: warm.',
      buildPromptProjectionForTarget() {
        return { text: this.currentText, memoryRecall: { items: [] } }
      },
    }
    const model = createModel({ roleProfiles, relationshipRuntimeStore: runtime })
    const contact = { id: 1, kind: 'role', name: 'Mina', role: 'friend', profileId: 10 }
    const first = model.buildPromptContext(contact, DEFAULT_CHAT_THREAD_AI_PREFS)

    runtime.currentText = 'Relationship runtime snapshot: conflict.'
    const relationshipChanged = model.buildPromptContext(contact, DEFAULT_CHAT_THREAD_AI_PREFS)
    roleProfiles[0].bio = 'Direct and teasing.'
    const identityChanged = model.buildPromptContext(contact, DEFAULT_CHAT_THREAD_AI_PREFS)

    expect(relationshipChanged.cache.key).toBe(first.cache.key)
    expect(relationshipChanged.dynamicContext).not.toBe(first.dynamicContext)
    expect(identityChanged.cache.key).not.toBe(first.cache.key)
  })

  test('keeps manual role facts but excludes relationship clues when runtime is disabled', () => {
    const model = createModel({
      relationshipRuntimeStore: {
        buildPromptProjectionForTarget: () => ({
          text: '',
          memoryRecall: { items: [] },
        }),
      },
      roleProfiles: [
        {
          id: 10,
          profileValues: [],
          detailItems: [
            {
              id: 'manual-tea',
              section: 'preferences',
              sourceKind: 'manual',
              title: 'Tea',
              detail: 'Likes jasmine tea.',
            },
            {
              id: 'event-ribbon',
              section: 'lifePattern',
              sourceKind: 'event_attached',
              title: 'Ribbon',
              detail: 'Kept the gift ribbon.',
              memoryKey: 'birthday_necklace',
            },
          ],
        },
      ],
    })

    const context = model.buildPromptContext(
      { id: 1, kind: 'role', name: 'Mina', role: 'friend', profileId: 10 },
      DEFAULT_CHAT_THREAD_AI_PREFS,
    )

    expect(context.stablePrefix).toContain('Tea: Likes jasmine tea.')
    expect(context.dynamicContext).not.toContain('Kept the gift ribbon.')
  })
})
