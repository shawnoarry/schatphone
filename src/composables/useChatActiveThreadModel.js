import { computed } from 'vue'
import { resolveAvatarWithHierarchy } from '../lib/avatar'
import { resolveAvatarImageSourceUrl } from '../lib/avatar-image-source-resolver'

export const DEFAULT_CHAT_THREAD_AI_PREFS = Object.freeze({
  suggestedRepliesEnabled: false,
  contextTurns: 8,
  bilingualEnabled: false,
  secondaryLanguage: 'en',
  allowQuoteReply: true,
  allowSelfQuote: false,
  virtualVoiceEnabled: true,
  replyMode: 'manual',
  replyCount: 1,
  responseStyle: 'immersive',
  proactiveOpenerEnabled: false,
  proactiveOpenerStrategy: 'on_enter_once',
  imageReferenceMode: 'auto',
  allowImageVirtualWithoutReference: false,
  autoInvokeEnabled: false,
  autoInvokeIntervalSec: 360,
})

export const useChatActiveThreadModel = ({
  route,
  chatStore,
  contactsForList,
  settings,
  user,
  galleryStore,
  avatarPreviewMap,
  t,
  defaultThreadAiPrefs = DEFAULT_CHAT_THREAD_AI_PREFS,
} = {}) => {
  const activeChatId = computed(() => {
    const id = Number(route?.params?.id)
    return Number.isNaN(id) ? null : id
  })

  const activeChat = computed(() => {
    if (!activeChatId.value) return null
    const contacts = Array.isArray(contactsForList?.value) ? contactsForList.value : []
    return contacts.find((contact) => contact.id === activeChatId.value) || null
  })

  const activeConversation = computed(() => {
    if (!activeChat.value) return null
    return chatStore.getConversationByContactId(activeChat.value.id)
  })

  const activeAiPrefs = computed(() => {
    if (!activeConversation.value?.aiPrefs) return defaultThreadAiPrefs
    return {
      ...defaultThreadAiPrefs,
      ...activeConversation.value.aiPrefs,
    }
  })

  const activeMessages = computed(() => {
    if (!activeChat.value) return []
    return chatStore.getMessagesByContactId(activeChat.value.id) || []
  })

  const activeChatSocialState = computed(() =>
    chatStore.getContactChatSocialState(activeChat.value),
  )

  const canActiveChatCommunicate = computed(() =>
    activeChat.value ? chatStore.canContactSendMessages(activeChat.value) : false,
  )

  const activeChatAppearance = computed(() => settings?.value?.appearance?.chat || {})

  const activeChatMessageLayout = computed(() =>
    activeChatAppearance.value.messageLayout || 'kakao',
  )

  const chatShellClasses = computed(() => [
    `chat-preset-${activeChatAppearance.value.presetId || 'kakao_immersive'}`,
    `chat-layout-${activeChatMessageLayout.value}`,
  ])

  const isActiveServiceChat = computed(() =>
    Boolean(activeChat.value && ['service', 'official'].includes(activeChat.value.kind || 'role')),
  )

  const activeServiceIsMuted = computed(() =>
    activeChat.value ? chatStore.isChatSubscriptionMuted(activeChat.value) : false,
  )

  const activeServiceIsFolded = computed(() =>
    activeChat.value ? chatStore.isChatSubscriptionFolded(activeChat.value) : false,
  )

  const contactHasThreadOrModuleAvatarOverride = (contactId) => {
    const id = Number(contactId)
    if (!Number.isFinite(id) || id <= 0) return false
    const threadOverrides = chatStore.getConversationIdentityOverrides(id)
    if (threadOverrides.contactAvatar) return true
    if (chatStore.getModuleContactAvatarOverride(id)) return true
    const moduleAvatarOverrides = chatStore.getModuleAvatarOverrides()
    return Boolean(moduleAvatarOverrides.defaultContactAvatar)
  }

  const resolveContactAvatarImageUrl = (contact) =>
    resolveAvatarImageSourceUrl({
      galleryStore,
      previewMap: avatarPreviewMap,
      avatarImage: contact?.avatarImage,
      legacyAvatar: contact?.avatar,
      fallbackAlt: contact?.name || t('联系人', 'Contact'),
    })

  const resolveContactDisplayAvatar = (contact) => {
    if (!contact?.id) {
      return resolveAvatarWithHierarchy({
        fallbackSeed: contact?.name || t('联系人', 'Contact'),
      })
    }

    if (contactHasThreadOrModuleAvatarOverride(contact.id)) {
      return chatStore.resolveContactAvatar(contact.id)
    }

    return resolveContactAvatarImageUrl(contact) || chatStore.resolveContactAvatar(contact.id)
  }

  const activeContactAvatar = computed(() => {
    if (!activeChat.value) {
      return resolveAvatarWithHierarchy({ fallbackSeed: t('联系人', 'Contact') })
    }
    return resolveContactDisplayAvatar(activeChat.value)
  })

  const activeModuleIdentity = computed(() => chatStore.getModuleIdentity())

  const activeModuleNickname = computed(
    () => activeModuleIdentity.value.nickname || user?.value?.name || t('自己', 'Me'),
  )

  const activeSelfAvatar = computed(() => {
    const moduleIdentity = activeModuleIdentity.value
    const threadOverrides = activeChat.value
      ? chatStore.getConversationIdentityOverrides(activeChat.value.id)
      : { selfAvatar: '' }
    const userAvatarUrl = resolveAvatarImageSourceUrl({
      galleryStore,
      previewMap: avatarPreviewMap,
      avatarImage: user?.value?.avatarImage,
      legacyAvatar: user?.value?.avatar,
      fallbackAlt: activeModuleNickname.value,
    })

    return resolveAvatarWithHierarchy({
      threadAvatar: threadOverrides.selfAvatar,
      moduleAvatar: moduleIdentity.avatar,
      globalAvatar: userAvatarUrl,
      fallbackSeed: activeModuleNickname.value,
    })
  })

  return {
    activeChatId,
    activeChat,
    activeConversation,
    activeAiPrefs,
    activeMessages,
    activeChatSocialState,
    canActiveChatCommunicate,
    activeChatAppearance,
    activeChatMessageLayout,
    chatShellClasses,
    isActiveServiceChat,
    activeServiceIsMuted,
    activeServiceIsFolded,
    contactHasThreadOrModuleAvatarOverride,
    resolveContactAvatarImageUrl,
    resolveContactDisplayAvatar,
    activeContactAvatar,
    activeModuleIdentity,
    activeModuleNickname,
    activeSelfAvatar,
  }
}
