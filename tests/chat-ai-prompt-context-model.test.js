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
} = {}) =>
  useChatAiPromptContextModel({
    chatStore: createChatStore({ messages, contacts, roleProfiles }),
    systemStore: createSystemStore(),
    bookStore: { assets: [] },
    relationshipRuntimeStore: {
      buildPromptContextForTarget: (target) =>
        target.entityKey ? `Runtime facts for ${target.entityKey}` : '',
    },
    user: ref(user),
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
    expect(rolePrompt).toContain('Image-reference transport mode: native_url (provider: openai).')

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

    expect(resolveChatAssistantImageBlockPolicy(aiPrefs, [])).toMatchObject({
      allowImageVirtual: false,
      referenceCount: 0,
    })
  })
})
