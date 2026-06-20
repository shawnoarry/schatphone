import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import { useChatHomeListModel } from '../src/composables/useChatHomeListModel'

const t = (zh, en) => en || zh

const contacts = [
  { id: 1, name: 'Ada', role: 'friend', bio: 'Seoul walks' },
  { id: 2, name: 'Mira Request', role: 'stranger', bio: 'new greeting', socialState: 'request' },
  { id: 3, name: 'Market Service', role: 'service', bio: 'orders', folded: true },
  { id: 4, name: 'Blocked Role', role: 'rival', bio: 'muted path', blocked: true },
  { id: 5, name: 'Group Crew', role: 'group', bio: 'late plans' },
]

const createChatStore = ({ conversations = {} } = {}) => ({
  getConversationByContactId: (contactId) => conversations[contactId] || null,
  isChatMessageRequestContact: (contact) => contact?.socialState === 'request',
  isChatContactBlocked: (contact) => Boolean(contact?.blocked),
  isChatSubscriptionFolded: (contact) => Boolean(contact?.folded),
})

const createModel = ({ contactList = contacts, conversations } = {}) =>
  useChatHomeListModel({
    contactsForList: ref(contactList),
    chatStore: createChatStore({ conversations }),
    t,
  })

describe('Chat home list model interface', () => {
  test('groups message requests, folded subscriptions, blocked contacts, and visible main chats', () => {
    const model = createModel({
      conversations: {
        1: { unread: 2, lastMessage: 'See you soon' },
        2: { unread: 4, lastMessage: 'Hello?' },
        3: { unread: 7, lastMessage: 'Order shipped' },
        4: { unread: 5, lastMessage: 'Blocked note' },
        5: { unread: 3, lastMessage: 'Tonight?' },
      },
    })

    expect(model.chatMessageRequestContacts.value.map((contact) => contact.id)).toEqual([2])
    expect(model.chatFoldedSubscriptionContacts.value.map((contact) => contact.id)).toEqual([3])
    expect(model.chatBlockedContacts.value.map((contact) => contact.id)).toEqual([4])
    expect(model.chatMainListContacts.value.map((contact) => contact.id)).toEqual([1, 4, 5])
    expect(model.visibleChatContacts.value.map((contact) => contact.id)).toEqual([1, 4, 5])
    expect(model.showFoldedSubscriptionsCard.value).toBe(true)
    expect(model.chatHomeUnreadTotal.value).toBe(10)
    expect(model.chatFoldedSubscriptionUnreadTotal.value).toBe(7)
    expect(model.chatFoldedSubscriptionUnreadContactCount.value).toBe(1)
  })

  test('searches all contacts by profile fields, last message, and draft', () => {
    const model = createModel({
      conversations: {
        1: { lastMessage: 'Plain hello' },
        2: { lastMessage: 'Pending hello' },
        3: { lastMessage: 'Dispatch arrived' },
        4: { draft: 'Rose market plan' },
        5: { lastMessage: 'Crew dinner' },
      },
    })

    model.chatSearchKeyword.value = ' rose '

    expect(model.normalizedChatSearchKeyword.value).toBe('rose')
    expect(model.showFoldedSubscriptionsCard.value).toBe(false)
    expect(model.visibleChatContacts.value.map((contact) => contact.id)).toEqual([4])

    model.chatSearchKeyword.value = 'dispatch'
    expect(model.visibleChatContacts.value.map((contact) => contact.id)).toEqual([3])
  })

  test('prioritizes empty, request, unread, folded, blocked, and default hero copy', () => {
    const emptyModel = createModel({ contactList: [] })
    expect(emptyModel.chatHomeHeroTitle.value).toBe('Bring someone into Chat')
    expect(emptyModel.chatHomeHeroDetail.value).toBe('Bind roles from Objects, or create services and groups.')

    const requestModel = createModel({
      conversations: {
        1: { unread: 2 },
        2: { unread: 1 },
      },
    })
    expect(requestModel.chatHomeHeroTitle.value).toBe('1 message requests pending')

    const unreadModel = createModel({
      contactList: contacts.filter((contact) => contact.id === 1),
      conversations: {
        1: { unread: 3 },
      },
    })
    expect(unreadModel.chatHomeHeroTitle.value).toBe('3 unread messages')

    const foldedModel = createModel({
      contactList: contacts.filter((contact) => contact.id === 3),
    })
    expect(foldedModel.chatHomeHeroDetail.value).toBe(
      'Folded service subscriptions stay under Services, while Messages keeps active chats in view.',
    )

    const blockedModel = createModel({
      contactList: contacts.filter((contact) => contact.id === 4),
    })
    expect(blockedModel.chatHomeHeroDetail.value).toBe(
      'Blocked chats keep history and continue from the same thread after unblock.',
    )

    const defaultModel = createModel({
      contactList: contacts.filter((contact) => contact.id === 1),
      conversations: {
        1: { unread: 0 },
      },
    })
    expect(defaultModel.chatHomeHeroTitle.value).toBe('Messages, groups, and services live here')
    expect(defaultModel.chatHomeHeroDetail.value).toBe(
      'Chats stay immersive by default; controls live in threads, Me, and Settings.',
    )
  })

  test('toggles search state and clears the keyword when search closes', () => {
    const model = createModel()

    model.toggleChatSearch()
    model.chatSearchKeyword.value = 'Ada'

    expect(model.chatSearchOpen.value).toBe(true)
    expect(model.normalizedChatSearchKeyword.value).toBe('ada')

    model.toggleChatSearch()

    expect(model.chatSearchOpen.value).toBe(false)
    expect(model.chatSearchKeyword.value).toBe('')
    expect(model.normalizedChatSearchKeyword.value).toBe('')
  })

  test('returns the conversation preview through the same interface consumed by ChatView', () => {
    const model = createModel({
      conversations: {
        5: { lastMessage: 'Crew dinner', unread: 9 },
      },
    })

    expect(model.getConversationPreview(5)).toEqual({ lastMessage: 'Crew dinner', unread: 9 })
    expect(model.getConversationPreview(99)).toBeNull()
  })
})
