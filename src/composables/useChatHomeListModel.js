import { computed, ref } from 'vue'

const translateWith = (t, zh, en) => (typeof t === 'function' ? t(zh, en) : en || zh)

const getContactList = (contactsForList) =>
  Array.isArray(contactsForList?.value) ? contactsForList.value : []

const getConversation = (chatStore, contactId) =>
  typeof chatStore?.getConversationByContactId === 'function'
    ? chatStore.getConversationByContactId(contactId)
    : null

const getUnreadCount = (conversation) => Math.max(0, Number(conversation?.unread) || 0)

const contactMatchesKeyword = ({ contact, conversation, keyword }) =>
  [contact?.name, contact?.role, contact?.bio, conversation?.lastMessage, conversation?.draft].some(
    (field) => typeof field === 'string' && field.toLowerCase().includes(keyword),
  )

export const useChatHomeListModel = ({ contactsForList, chatStore, t } = {}) => {
  const translate = (zh, en) => translateWith(t, zh, en)
  const chatSearchOpen = ref(false)
  const chatSearchKeyword = ref('')

  const normalizedChatSearchKeyword = computed(() => chatSearchKeyword.value.trim().toLowerCase())

  const getConversationPreview = (contactId) => getConversation(chatStore, contactId)

  const isMessageRequestContact = (contact) =>
    typeof chatStore?.isChatMessageRequestContact === 'function'
      ? chatStore.isChatMessageRequestContact(contact)
      : false

  const isBlockedContact = (contact) =>
    typeof chatStore?.isChatContactBlocked === 'function'
      ? chatStore.isChatContactBlocked(contact)
      : false

  const isFoldedSubscriptionContact = (contact) =>
    typeof chatStore?.isChatSubscriptionFolded === 'function'
      ? chatStore.isChatSubscriptionFolded(contact)
      : false

  const chatMessageRequestContacts = computed(() =>
    getContactList(contactsForList).filter((contact) => isMessageRequestContact(contact)),
  )

  const chatBlockedContacts = computed(() =>
    getContactList(contactsForList).filter((contact) => isBlockedContact(contact)),
  )

  const chatFoldedSubscriptionContacts = computed(() =>
    getContactList(contactsForList).filter((contact) => isFoldedSubscriptionContact(contact)),
  )

  const chatFoldedSubscriptionUnreadTotal = computed(() =>
    chatFoldedSubscriptionContacts.value.reduce((sum, contact) => {
      const conversation = getConversationPreview(contact.id)
      return sum + getUnreadCount(conversation)
    }, 0),
  )

  const chatFoldedSubscriptionUnreadContactCount = computed(
    () =>
      chatFoldedSubscriptionContacts.value.filter((contact) => {
        const conversation = getConversationPreview(contact.id)
        return getUnreadCount(conversation) > 0
      }).length,
  )

  const showFoldedSubscriptionsCard = computed(() =>
    !normalizedChatSearchKeyword.value && chatFoldedSubscriptionContacts.value.length > 0,
  )

  const chatMainListContacts = computed(() =>
    getContactList(contactsForList).filter(
      (contact) => !isMessageRequestContact(contact) && !isFoldedSubscriptionContact(contact),
    ),
  )

  const visibleChatContacts = computed(() => {
    const keyword = normalizedChatSearchKeyword.value
    const source = keyword ? getContactList(contactsForList) : chatMainListContacts.value
    if (!keyword) return source
    return source.filter((contact) => {
      const conversation = getConversationPreview(contact.id)
      return contactMatchesKeyword({ contact, conversation, keyword })
    })
  })

  const chatHomeUnreadTotal = computed(() =>
    chatMainListContacts.value.reduce((sum, contact) => {
      const conversation = getConversationPreview(contact.id)
      return sum + getUnreadCount(conversation)
    }, 0),
  )

  const chatHomeHeroTitle = computed(() => {
    if (getContactList(contactsForList).length === 0) {
      return translate('先把对象带进 Chat', 'Bring someone into Chat')
    }
    if (chatMessageRequestContacts.value.length > 0) {
      return translate(
        `${chatMessageRequestContacts.value.length} 条消息请求待处理`,
        `${chatMessageRequestContacts.value.length} message requests pending`,
      )
    }
    if (chatHomeUnreadTotal.value > 0) {
      return translate(
        `有 ${chatHomeUnreadTotal.value} 条未读消息`,
        `${chatHomeUnreadTotal.value} unread messages`,
      )
    }
    return translate('消息、群聊和服务号都在这里', 'Messages, groups, and services live here')
  })

  const chatHomeHeroDetail = computed(() => {
    if (getContactList(contactsForList).length === 0) {
      return translate(
        '从对象页绑定角色，或创建服务号与群聊。',
        'Bind roles from Objects, or create services and groups.',
      )
    }
    if (chatFoldedSubscriptionContacts.value.length > 0) {
      return translate(
        '折叠的服务号收在服务号页里，消息页只保留正在看的会话。',
        'Folded service subscriptions stay under Services, while Messages keeps active chats in view.',
      )
    }
    if (chatBlockedContacts.value.length > 0) {
      return translate(
        '已屏蔽会话会保留历史，解除后继续使用原记录。',
        'Blocked chats keep history and continue from the same thread after unblock.',
      )
    }
    return translate(
      '聊天默认保持沉浸，控制项放在会话内、我和设置里。',
      'Chats stay immersive by default; controls live in threads, Me, and Settings.',
    )
  })

  const toggleChatSearch = () => {
    chatSearchOpen.value = !chatSearchOpen.value
    if (!chatSearchOpen.value) chatSearchKeyword.value = ''
  }

  return {
    chatSearchOpen,
    chatSearchKeyword,
    normalizedChatSearchKeyword,
    chatMessageRequestContacts,
    chatBlockedContacts,
    chatFoldedSubscriptionContacts,
    chatFoldedSubscriptionUnreadTotal,
    chatFoldedSubscriptionUnreadContactCount,
    showFoldedSubscriptionsCard,
    chatMainListContacts,
    visibleChatContacts,
    chatHomeUnreadTotal,
    chatHomeHeroTitle,
    chatHomeHeroDetail,
    getConversationPreview,
    toggleChatSearch,
  }
}
