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

  test('supports autonomous invoke prefs clamp and auto state scheduling', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id

    store.setConversationAiPrefs(contactId, {
      autoInvokeEnabled: true,
      autoInvokeIntervalSec: 1,
    })

    const prefs = store.getConversationAiPrefs(contactId)
    expect(prefs.autoInvokeEnabled).toBe(true)
    expect(prefs.autoInvokeIntervalSec).toBe(60)

    const nextAt = store.scheduleConversationAutoInvoke(contactId, 1000, prefs.autoInvokeIntervalSec)
    expect(nextAt).toBe(61_000)

    store.setConversationAutoState(contactId, {
      autoLastTriggeredAt: 25_000,
      autoLastFingerprint: 'fingerprint-v1',
    })

    const conversation = store.getConversationByContactId(contactId)
    expect(conversation.autoNextAt).toBe(61_000)
    expect(conversation.autoLastTriggeredAt).toBe(25_000)
    expect(conversation.autoLastFingerprint).toBe('fingerprint-v1')

    store.setConversationAiPrefs(contactId, { autoInvokeEnabled: false })
    expect(store.getConversationByContactId(contactId).autoNextAt).toBe(0)
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

  test('supports message edit, replace and delete operations', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id

    const userMessage = store.appendMessage(contactId, {
      role: 'user',
      content: 'Original user line',
      status: 'delivered',
    })
    const assistantMessage = store.appendMessage(contactId, {
      role: 'assistant',
      content: 'Original assistant line',
      status: 'sent',
    })

    const editOk = store.updateMessageContent(contactId, userMessage.id, 'Edited user line', {
      markEdited: true,
      editedAt: 1234567890,
    })
    expect(editOk).toBe(true)

    const replaced = store.replaceMessage(
      contactId,
      assistantMessage.id,
      {
        id: assistantMessage.id,
        role: 'assistant',
        content: 'Rerolled assistant line',
        aiMeta: { replyType: 'plain', bilingual: false, rerollOf: assistantMessage.id },
        status: 'sent',
      },
      { keepCreatedAt: true },
    )
    expect(replaced?.content).toBe('Rerolled assistant line')
    expect(replaced?.aiMeta?.rerollOf).toBe(assistantMessage.id)

    store.incrementConversationUnread(contactId, 2)
    const removed = store.removeMessage(contactId, assistantMessage.id)
    expect(removed?.id).toBe(assistantMessage.id)

    const messages = store.getMessagesByContactId(contactId)
    const editedUser = messages.find((item) => item.id === userMessage.id)
    expect(editedUser?.content).toBe('Edited user line')
    expect(editedUser?.editedAt).toBe(1234567890)

    const conversation = store.getConversationByContactId(contactId)
    expect(conversation.lastMessage).toContain('Edited user line')
    expect(conversation.unread).toBe(1)
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

  test('supports role profile binding lifecycle without deleting global profile on unbind', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      name: 'Mia',
      role: 'Mediator',
      isMain: false,
      bio: 'Global role profile',
    })

    const binding = store.bindRoleProfile(profile.id, {
      relationshipLevel: 88,
      relationshipNote: 'Thread-local note',
    })
    expect(binding?.profileId).toBe(profile.id)
    expect(store.isRoleProfileBound(profile.id)).toBe(true)

    store.updateRoleProfile(profile.id, { name: 'Mia Prime' })
    const resolved = store.getContactById(binding.id)
    expect(resolved?.name).toBe('Mia Prime')
    expect(resolved?.relationshipLevel).toBe(88)

    const unbound = store.unbindRoleContact(binding.id)
    expect(unbound).toBe(true)
    expect(store.contacts.some((item) => item.id === binding.id)).toBe(false)
    expect(store.isRoleProfileBound(profile.id)).toBe(false)
    expect(store.getRoleProfileById(profile.id)?.name).toBe('Mia Prime')
  })

  test('removing global role profile clears bound chat entries', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      name: 'Tara',
      role: 'Guide',
      isMain: false,
    })
    const binding = store.bindRoleProfile(profile.id, { relationshipLevel: 70 })
    expect(store.contacts.some((item) => item.id === binding.id)).toBe(true)

    const removed = store.removeRoleProfile(profile.id, { removeBindings: true })
    expect(removed).toBe(true)
    expect(store.getRoleProfileById(profile.id)).toBe(null)
    expect(store.contacts.some((item) => Number(item.profileId) === profile.id)).toBe(false)
  })

  test('restores new-shape backup with role profile bindings', () => {
    const store = useChatStore()

    const restored = store.restoreFromBackup({
      roleProfiles: [
        {
          id: 101,
          name: 'Alpha',
          role: 'Guide',
          isMain: true,
          avatar: '',
          bio: 'Primary role profile',
        },
      ],
      contacts: [
        {
          id: 201,
          kind: 'role',
          profileId: 101,
          relationshipLevel: 66,
          relationshipNote: 'Recovered note',
          lastMessage: 'Recovered last message',
        },
      ],
      conversations: {
        201: {
          id: 'conv_201',
          contactId: 201,
          aiPrefs: {
            contextTurns: 6,
          },
        },
      },
      messagesByConversation: {
        201: [{ role: 'assistant', content: 'Recovered message' }],
      },
    })

    expect(restored).toBe(true)
    expect(store.getRoleProfileById(101)?.name).toBe('Alpha')
    expect(store.getContactById(201)?.name).toBe('Alpha')
    expect(store.getContactById(201)?.relationshipLevel).toBe(66)
    expect(store.getMessagesByContactId(201).at(-1)?.content).toContain('Recovered message')
  })

  test('restores legacy backup and derives role profiles', () => {
    const store = useChatStore()

    const restored = store.restoreFromBackup({
      contacts: [
        {
          id: 301,
          name: 'Legacy Contact',
          kind: 'role',
          role: 'Archivist',
          lastMessage: 'Legacy summary',
        },
      ],
      chatHistory: {
        301: [{ role: 'assistant', content: 'Legacy message' }],
      },
    })

    expect(restored).toBe(true)
    expect(store.getContactById(301)?.profileId).toBeGreaterThan(0)
    expect(store.getRoleProfileById(store.getContactById(301)?.profileId)?.name).toBe('Legacy Contact')
  })
})
