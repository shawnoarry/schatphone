import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import {
  DEFAULT_CHAT_THREAD_AI_PREFS,
  useChatActiveThreadModel,
} from '../src/composables/useChatActiveThreadModel'

const t = (zh, en) => en || zh

const createChatStore = ({
  conversations = {},
  messages = {},
  socialState = 'connected',
  canSend = true,
  serviceMuted = false,
  serviceFolded = false,
  moduleIdentity = {},
  identityOverrides = {},
  contactAvatarOverride = '',
  moduleAvatarOverrides = {},
} = {}) => ({
  getConversationByContactId: (contactId) => conversations[contactId] || null,
  getMessagesByContactId: (contactId) => messages[contactId] || [],
  getContactChatSocialState: () => socialState,
  canContactSendMessages: () => canSend,
  isChatSubscriptionMuted: () => serviceMuted,
  isChatSubscriptionFolded: () => serviceFolded,
  getConversationIdentityOverrides: (contactId) =>
    identityOverrides[contactId] || { selfAvatar: '', contactAvatar: '' },
  getModuleContactAvatarOverride: () => contactAvatarOverride,
  getModuleAvatarOverrides: () => moduleAvatarOverrides,
  resolveContactAvatar: (contactId) => `/fallback-contact-${contactId}.png`,
  getModuleIdentity: () => moduleIdentity,
})

describe('Chat active thread model interface', () => {
  test('resolves the active thread from the route and merges thread AI preferences', () => {
    const route = { params: { id: '2' } }
    const contactsForList = ref([
      { id: 1, name: 'Ada', kind: 'role' },
      { id: 2, name: 'Beacon Market', kind: 'service' },
    ])
    const chatStore = createChatStore({
      conversations: {
        2: {
          aiPrefs: {
            suggestedRepliesEnabled: true,
            contextTurns: 12,
          },
        },
      },
      messages: {
        2: [{ id: 'm1', role: 'assistant', content: 'Welcome.' }],
      },
      serviceMuted: true,
      serviceFolded: true,
    })

    const model = useChatActiveThreadModel({
      route,
      chatStore,
      contactsForList,
      settings: ref({ appearance: { chat: { presetId: 'wechat_clean', messageLayout: 'wechat' } } }),
      user: ref({ name: 'Me' }),
      galleryStore: {},
      avatarPreviewMap: {},
      t,
    })

    expect(model.activeChatId.value).toBe(2)
    expect(model.activeChat.value).toMatchObject({ id: 2, name: 'Beacon Market' })
    expect(model.activeMessages.value).toEqual([
      expect.objectContaining({ id: 'm1', content: 'Welcome.' }),
    ])
    expect(model.activeAiPrefs.value).toMatchObject({
      ...DEFAULT_CHAT_THREAD_AI_PREFS,
      suggestedRepliesEnabled: true,
      contextTurns: 12,
    })
    expect(model.isActiveServiceChat.value).toBe(true)
    expect(model.activeServiceIsMuted.value).toBe(true)
    expect(model.activeServiceIsFolded.value).toBe(true)
    expect(model.chatShellClasses.value).toEqual([
      'chat-preset-wechat_clean',
      'chat-layout-wechat',
    ])
  })

  test('falls back safely when the route does not point at a known thread', () => {
    const model = useChatActiveThreadModel({
      route: { params: { id: 'missing' } },
      chatStore: createChatStore(),
      contactsForList: ref([{ id: 1, name: 'Ada' }]),
      settings: ref({ appearance: { chat: {} } }),
      user: ref({ name: 'Me' }),
      galleryStore: {},
      avatarPreviewMap: {},
      t,
    })

    expect(model.activeChatId.value).toBeNull()
    expect(model.activeChat.value).toBeNull()
    expect(model.activeConversation.value).toBeNull()
    expect(model.activeMessages.value).toEqual([])
    expect(model.activeAiPrefs.value).toBe(DEFAULT_CHAT_THREAD_AI_PREFS)
    expect(model.canActiveChatCommunicate.value).toBe(false)
    expect(model.isActiveServiceChat.value).toBe(false)
    expect(model.activeContactAvatar.value).toContain('api.dicebear.com')
  })

  test('resolves thread and user avatars through the same hierarchy used by ChatView', () => {
    const route = { params: { id: '3' } }
    const contactsForList = ref([
      {
        id: 3,
        name: 'Gallery Friend',
        avatarImage: {
          imageSourceType: 'gallery',
          galleryAssetId: 'asset-contact',
        },
      },
    ])
    const chatStore = createChatStore({
      moduleIdentity: {
        nickname: 'Module Me',
        avatar: '/module-me.png',
      },
      identityOverrides: {
        3: {
          selfAvatar: '/thread-me.png',
          contactAvatar: '',
        },
      },
    })
    const galleryStore = {
      findAssetById: (assetId) =>
        assetId === 'asset-contact'
          ? { id: assetId, sourceType: 'url', sourceUrl: '/gallery-contact.png' }
          : null,
    }

    const model = useChatActiveThreadModel({
      route,
      chatStore,
      contactsForList,
      settings: ref({ appearance: { chat: {} } }),
      user: ref({
        name: 'User Me',
        avatarImage: {
          imageSourceType: 'url',
          imageUrl: '/global-me.png',
        },
      }),
      galleryStore,
      avatarPreviewMap: {},
      t,
    })

    expect(model.resolveContactDisplayAvatar(contactsForList.value[0])).toBe('/gallery-contact.png')
    expect(model.activeContactAvatar.value).toBe('/gallery-contact.png')
    expect(model.activeModuleNickname.value).toBe('Module Me')
    expect(model.activeSelfAvatar.value).toBe('/thread-me.png')
  })
})
