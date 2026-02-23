import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../src/stores/chat'

describe('chat store model', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('creates conversation metadata from default contacts', () => {
    const store = useChatStore()
    const contact = store.contacts[0]
    const conversation = store.getConversationByContactId(contact.id)
    const messages = store.getMessagesByContactId(contact.id)

    expect(conversation.contactId).toBe(contact.id)
    expect(conversation.unread).toBe(0)
    expect(typeof conversation.createdAt).toBe('number')
    expect(messages.length).toBeGreaterThan(0)
    expect(messages[0].id).toContain('msg_')
    expect(messages[0].status).toBe('sent')
    expect(Array.isArray(messages[0].blocks)).toBe(true)
    expect(messages[0].blocks[0]?.type).toBe('text')
  })

  test('supports draft, unread and message status updates', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id

    store.setConversationDraft(contactId, 'Draft text')
    store.incrementConversationUnread(contactId, 2)

    const userMessage = store.appendMessage(contactId, {
      role: 'user',
      content: 'Test delivery state',
      status: 'delivered',
    })

    expect(userMessage.status).toBe('delivered')
    expect(store.updateMessageStatus(contactId, userMessage.id, 'read')).toBe(true)
    store.markConversationRead(contactId)

    const conversation = store.getConversationByContactId(contactId)
    const messages = store.getMessagesByContactId(contactId)
    const target = messages.find((item) => item.id === userMessage.id)

    expect(conversation.draft).toBe('Draft text')
    expect(conversation.unread).toBe(0)
    expect(target?.status).toBe('read')
  })

  test('supports per-conversation ai preference updates', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id

    const defaults = store.getConversationAiPrefs(contactId)
    expect(defaults.suggestedRepliesEnabled).toBe(false)
    expect(defaults.contextTurns).toBe(8)
    expect(defaults.bilingualEnabled).toBe(false)
    expect(defaults.replyMode).toBe('manual')
    expect(defaults.replyCount).toBe(1)
    expect(defaults.responseStyle).toBe('immersive')
    expect(defaults.proactiveOpenerEnabled).toBe(false)
    expect(defaults.proactiveOpenerStrategy).toBe('on_enter_once')

    store.setConversationAiPrefs(contactId, {
      suggestedRepliesEnabled: true,
      contextTurns: 99,
      bilingualEnabled: true,
      secondaryLanguage: ' ja ',
      allowQuoteReply: true,
      allowSelfQuote: true,
      virtualVoiceEnabled: false,
      replyMode: 'auto',
      replyCount: 99,
      responseStyle: 'concise',
      proactiveOpenerEnabled: true,
      proactiveOpenerStrategy: 'on_every_enter_if_empty',
    })

    const prefs = store.getConversationAiPrefs(contactId)
    expect(prefs.suggestedRepliesEnabled).toBe(true)
    expect(prefs.contextTurns).toBe(20)
    expect(prefs.bilingualEnabled).toBe(true)
    expect(prefs.secondaryLanguage).toBe('ja')
    expect(prefs.allowQuoteReply).toBe(true)
    expect(prefs.allowSelfQuote).toBe(true)
    expect(prefs.virtualVoiceEnabled).toBe(false)
    expect(prefs.replyMode).toBe('auto')
    expect(prefs.replyCount).toBe(3)
    expect(prefs.responseStyle).toBe('concise')
    expect(prefs.proactiveOpenerEnabled).toBe(true)
    expect(prefs.proactiveOpenerStrategy).toBe('on_every_enter_if_empty')
  })

  test('supports proactive opener timestamp mark/reset', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id

    const before = store.getConversationByContactId(contactId)
    expect(before.proactiveOpenedAt).toBe(0)

    store.markConversationProactiveOpened(contactId, 123456)
    const marked = store.getConversationByContactId(contactId)
    expect(marked.proactiveOpenedAt).toBe(123456)

    store.resetConversationProactiveOpened(contactId)
    const reset = store.getConversationByContactId(contactId)
    expect(reset.proactiveOpenedAt).toBe(0)
  })

  test('supports structured assistant blocks and summary fallback', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id

    const assistantMessage = store.appendMessage(contactId, {
      role: 'assistant',
      content: '',
      blocks: [
        {
          type: 'module_link',
          label: 'Open wallet',
          route: '/wallet',
        },
      ],
      quote: {
        messageId: 'msg_prev',
        role: 'user',
        preview: 'Previous message',
      },
      aiMeta: {
        replyType: 'quote_user',
        bilingual: true,
      },
      status: 'sent',
    })

    const conversation = store.getConversationByContactId(contactId)

    expect(assistantMessage.blocks[0]?.type).toBe('module_link')
    expect(assistantMessage.quote?.role).toBe('user')
    expect(assistantMessage.aiMeta?.replyType).toBe('quote_user')
    expect(conversation.lastMessage).toContain('Open wallet')
  })

  test('supports contact kind update and remove', () => {
    const store = useChatStore()
    const created = store.addContact({
      name: 'Service Bot',
      kind: 'service',
      role: 'Service account',
      serviceTemplate: 'Order notification template',
    })

    expect(created.kind).toBe('service')
    expect(created.serviceTemplate).toBe('Order notification template')

    store.updateContact(created.id, { kind: 'official', serviceTemplate: 'Announcement template' })
    const updated = store.contacts.find((item) => item.id === created.id)
    expect(updated?.kind).toBe('official')
    expect(updated?.serviceTemplate).toBe('Announcement template')

    const removed = store.removeContact(created.id)
    expect(removed).toBe(true)
    expect(store.contacts.some((item) => item.id === created.id)).toBe(false)
  })
})
