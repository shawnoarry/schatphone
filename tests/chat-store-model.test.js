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
  })

  test('supports draft, unread and message status updates', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id

    store.setConversationDraft(contactId, '草稿文本')
    store.incrementConversationUnread(contactId, 2)

    const pending = store.appendMessage(contactId, {
      role: 'user',
      content: '测试发送',
      status: 'sending',
    })
    store.updateMessageStatus(contactId, pending.id, 'failed')
    store.updateMessageStatus(contactId, pending.id, 'sent')
    store.markConversationRead(contactId)

    const conversation = store.getConversationByContactId(contactId)
    const messages = store.getMessagesByContactId(contactId)
    const target = messages.find((item) => item.id === pending.id)

    expect(conversation.draft).toBe('草稿文本')
    expect(conversation.unread).toBe(0)
    expect(target?.status).toBe('sent')
  })
})
