import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { CHAT_SERVICE_NOTIFICATION_KIND, useChatStore } from '../src/stores/chat'

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

    const defaultPrefs = store.getDefaultConversationAiPrefs()
    expect(defaultPrefs.suggestedRepliesEnabled).toBe(false)
    expect(defaultPrefs.contextTurns).toBe(8)
    expect(defaultPrefs.bilingualEnabled).toBe(false)
    expect(defaultPrefs.replyMode).toBe('manual')
    expect(defaultPrefs.replyCount).toBe(1)
    expect(defaultPrefs.responseStyle).toBe('immersive')
    expect(defaultPrefs.proactiveOpenerEnabled).toBe(false)
    expect(defaultPrefs.proactiveOpenerStrategy).toBe('on_enter_once')
    expect(defaultPrefs.imageReferenceMode).toBe('auto')
    expect(defaultPrefs.allowImageVirtualWithoutReference).toBe(false)

    defaultPrefs.replyCount = 99
    expect(store.getDefaultConversationAiPrefs().replyCount).toBe(1)

    const defaults = store.getConversationAiPrefs(contactId)
    expect(defaults.suggestedRepliesEnabled).toBe(false)
    expect(defaults.contextTurns).toBe(8)
    expect(defaults.bilingualEnabled).toBe(false)
    expect(defaults.replyMode).toBe('manual')
    expect(defaults.replyCount).toBe(1)
    expect(defaults.responseStyle).toBe('immersive')
    expect(defaults.proactiveOpenerEnabled).toBe(false)
    expect(defaults.proactiveOpenerStrategy).toBe('on_enter_once')
    expect(defaults.imageReferenceMode).toBe('auto')
    expect(defaults.allowImageVirtualWithoutReference).toBe(false)

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
      imageReferenceMode: 'native_url',
      allowImageVirtualWithoutReference: true,
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
    expect(prefs.imageReferenceMode).toBe('native_url')
    expect(prefs.allowImageVirtualWithoutReference).toBe(true)
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
      autoLastSettledAt: 30_000,
      autoLastSettledMissedCycles: 2,
      autoPushScheduleId: 'chat_auto_1',
      autoPushScheduledAt: 61_000,
    })

    const conversation = store.getConversationByContactId(contactId)
    expect(conversation.autoNextAt).toBe(61_000)
    expect(conversation.autoLastTriggeredAt).toBe(25_000)
    expect(conversation.autoLastFingerprint).toBe('fingerprint-v1')
    expect(conversation.autoLastSettledAt).toBe(30_000)
    expect(conversation.autoLastSettledMissedCycles).toBe(2)
    expect(conversation.autoPushScheduleId).toBe('chat_auto_1')
    expect(conversation.autoPushScheduledAt).toBe(61_000)

    store.setConversationAiPrefs(contactId, { autoInvokeEnabled: false })
    expect(store.getConversationByContactId(contactId).autoNextAt).toBe(0)
    expect(store.getConversationByContactId(contactId).autoLastSettledMissedCycles).toBe(0)
    expect(store.getConversationByContactId(contactId).autoPushScheduleId).toBe('chat_auto_1')
  })

  test('settles overdue autonomous invoke checkpoints on resume', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id

    store.setConversationAiPrefs(contactId, {
      autoInvokeEnabled: true,
      autoInvokeIntervalSec: 60,
    })

    store.scheduleConversationAutoInvoke(contactId, 0, 60)

    const settled = store.settleAutoInvokeOnResume(250_000)
    expect(settled.length).toBe(1)
    expect(settled[0].contactId).toBe(contactId)
    expect(settled[0].dueAt).toBe(60_000)
    expect(settled[0].settledAt).toBe(250_000)
    expect(settled[0].overdueMs).toBe(190_000)
    expect(settled[0].missedCycles).toBe(4)
    expect(settled[0].intervalMs).toBe(60_000)

    const conversation = store.getConversationByContactId(contactId)
    expect(conversation.autoNextAt).toBe(250_000)
    expect(conversation.autoLastSettledAt).toBe(250_000)
    expect(conversation.autoLastSettledMissedCycles).toBe(4)

    expect(store.getDueAutoInvokeContactIds(250_000)).toContain(contactId)

    const nextAt = store.scheduleConversationAutoInvoke(contactId, 250_000, 60)
    expect(nextAt).toBe(310_000)
    expect(store.getConversationByContactId(contactId).autoLastSettledMissedCycles).toBe(0)
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
        imageReferenceMode: 'native_url',
        imageReferenceCount: 2,
        imageReferenceFallback: false,
        imageReferenceProvider: 'openai_compatible',
      },
      status: 'sent',
    })

    const conversation = store.getConversationByContactId(contactId)

    expect(assistantMessage.blocks[0]?.type).toBe('module_link')
    expect(assistantMessage.quote?.role).toBe('user')
    expect(assistantMessage.aiMeta?.replyType).toBe('quote_user')
    expect(assistantMessage.aiMeta?.imageReferenceMode).toBe('native_url')
    expect(assistantMessage.aiMeta?.imageReferenceCount).toBe(2)
    expect(assistantMessage.aiMeta?.imageReferenceProvider).toBe('openai_compatible')
    expect(conversation.lastMessage).toContain('Open wallet')
  })

  test('hardens structured blocks and quote fields on append', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id
    const longPreview = 'x'.repeat(400)
    const longMessageId = 'm'.repeat(220)

    const assistantMessage = store.appendMessage(contactId, {
      role: 'assistant',
      content: '',
      blocks: [
        { type: 'module_link', label: 'Open', route: 'javascript:alert(1)', note: 'n'.repeat(1200) },
        { type: 'link_external', label: 'Docs', url: 'www.example.com/help', note: 'x'.repeat(1200) },
        { type: 'transfer_virtual', label: 'Pay', amount: '  888.66 ', currency: ' usd ', actionRoute: 'https://evil.com' },
        { type: 'product_card', productId: 'product_demo', title: 'Demo Product', price: '88.00 CNY', currency: 'cny', route: 'https://evil.com', desc: 'd'.repeat(1200), serviceKey: 'style_cloud', serviceLabel: 'Style Cloud', assetEligible: true },
        { type: 'image_virtual', alt: 'Pic', url: 'javascript:alert(1)', caption: 'c'.repeat(1200) },
        { type: 'mini_scene', title: 'Scene', htmlSnippet: '<script>alert(1)</script><div>ok</div>' },
      ],
      quote: {
        messageId: longMessageId,
        role: 'assistant',
        preview: longPreview,
      },
      status: 'sent',
    })

    const moduleBlock = assistantMessage.blocks.find((item) => item.type === 'module_link')
    const externalLinkBlock = assistantMessage.blocks.find((item) => item.type === 'link_external')
    const transferBlock = assistantMessage.blocks.find((item) => item.type === 'transfer_virtual')
    const productBlock = assistantMessage.blocks.find((item) => item.type === 'product_card')
    const imageBlock = assistantMessage.blocks.find((item) => item.type === 'image_virtual')
    const sceneBlock = assistantMessage.blocks.find((item) => item.type === 'mini_scene')

    expect(moduleBlock?.route).toBe('/home')
    expect((moduleBlock?.note || '').length).toBeLessThanOrEqual(800)
    expect(externalLinkBlock?.url).toContain('https://www.example.com/help')
    expect((externalLinkBlock?.note || '').length).toBeLessThanOrEqual(800)
    expect(transferBlock?.actionRoute).toBe('/wallet')
    expect(transferBlock?.currency).toBe('USD')
    expect(productBlock).toMatchObject({
      productId: 'product_demo',
      title: 'Demo Product',
      currency: 'CNY',
      route: '/shopping',
      serviceKey: 'style_cloud',
      serviceLabel: 'Style Cloud',
      assetEligible: true,
    })
    expect((productBlock?.desc || '').length).toBeLessThanOrEqual(800)
    expect(imageBlock?.url).toBe('')
    expect(sceneBlock?.htmlSnippet).not.toContain('<script')

    expect((assistantMessage.quote?.preview || '').length).toBeLessThanOrEqual(240)
    expect((assistantMessage.quote?.messageId || '').length).toBeLessThanOrEqual(128)
  })

  test('normalizes ai meta image-reference fields on append', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id

    const assistantMessage = store.appendMessage(contactId, {
      role: 'assistant',
      content: 'Meta test',
      aiMeta: {
        replyType: 'plain',
        bilingual: false,
        imageReferenceMode: 'unsupported_mode',
        imageReferenceCount: 88,
        imageReferenceFallback: 'yes',
        imageReferenceProvider: 'provider-name-with-very-very-long-suffix-exceeds-limit',
      },
      status: 'sent',
    })

    expect(assistantMessage.aiMeta?.imageReferenceMode).toBe('none')
    expect(assistantMessage.aiMeta?.imageReferenceCount).toBe(3)
    expect(assistantMessage.aiMeta?.imageReferenceFallback).toBe(true)
    expect((assistantMessage.aiMeta?.imageReferenceProvider || '').length).toBeLessThanOrEqual(32)
  })

  test('preserves valid image assetId on image_virtual blocks', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id

    const message = store.appendMessage(contactId, {
      role: 'user',
      content: 'Send from gallery',
      blocks: [
        {
          type: 'image_virtual',
          alt: 'Gallery image',
          url: '',
          assetId: 'asset_abc123',
          caption: 'From asset center',
        },
      ],
      status: 'delivered',
    })

    expect(message.blocks[0]?.type).toBe('image_virtual')
    expect(message.blocks[0]?.assetId).toBe('asset_abc123')
  })

  test('falls back to assistant text block when payload has no usable content', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id

    const assistantMessage = store.appendMessage(contactId, {
      role: 'assistant',
      content: '   ',
      blocks: [{ type: 'unknown' }],
      status: 'sent',
    })

    expect(assistantMessage.content).toBe('...')
    expect(Array.isArray(assistantMessage.blocks)).toBe(true)
    expect(assistantMessage.blocks[0]?.type).toBe('text')
    expect(assistantMessage.blocks[0]?.text).toBe('...')
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

  test('supports semantic revision and restore for assistant rich message', () => {
    const store = useChatStore()
    const contactId = store.contacts[0].id
    const originalText = 'A cluttered desk with warm light'
    const revisedText = 'A desk with scores arranged neatly and dim light'

    const assistantMessage = store.appendMessage(contactId, {
      role: 'assistant',
      content: originalText,
      blocks: [
        {
          type: 'text',
          text: originalText,
          variant: 'primary',
          lang: 'auto',
        },
        {
          type: 'image_virtual',
          alt: 'Desk image',
          url: 'https://example.com/desk.png',
          caption: 'Reference image',
        },
      ],
      status: 'sent',
    })

    const revised = store.reviseMessageSemantic(contactId, assistantMessage.id, revisedText, {
      revisedAt: 999001,
    })
    expect(revised).toBe(true)

    const revisedMessage = store
      .getMessagesByContactId(contactId)
      .find((item) => item.id === assistantMessage.id)
    expect(revisedMessage?.semanticRevision?.originalText).toBe(originalText)
    expect(revisedMessage?.semanticRevision?.revisedText).toBe(revisedText)
    expect(revisedMessage?.semanticRevision?.revisedAt).toBe(999001)
    expect(revisedMessage?.content).toBe(revisedText)
    expect(revisedMessage?.blocks?.[0]?.type).toBe('text')
    expect(revisedMessage?.blocks?.[0]?.text).toBe(revisedText)
    expect(revisedMessage?.blocks?.[1]?.type).toBe('image_virtual')
    expect(revisedMessage?.blocks?.[1]?.url).toContain('https://example.com/desk.png')
    expect(store.getConversationByContactId(contactId).lastMessage).toContain(revisedText)

    const restored = store.restoreMessageSemanticRevision(contactId, assistantMessage.id)
    expect(restored).toBe(true)

    const restoredMessage = store
      .getMessagesByContactId(contactId)
      .find((item) => item.id === assistantMessage.id)
    expect(restoredMessage?.semanticRevision).toBe(null)
    expect(restoredMessage?.content).toBe(originalText)
    expect(restoredMessage?.blocks?.[0]?.text).toBe(originalText)
    expect(restoredMessage?.blocks?.[1]?.type).toBe('image_virtual')
  })

  test('applies avatar hierarchy for contact visuals (thread > module > global > fallback)', () => {
    const store = useChatStore()
    const created = store.addContact({
      name: 'Avatar Tester',
      kind: 'role',
      avatar: 'https://example.com/avatar-global.png',
    })

    expect(store.resolveContactAvatar(created.id)).toBe('https://example.com/avatar-global.png')

    store.setModuleAvatarOverrides({
      defaultContactAvatar: 'https://example.com/avatar-module-default.png',
    })
    expect(store.resolveContactAvatar(created.id)).toBe('https://example.com/avatar-module-default.png')

    store.setModuleContactAvatarOverride(created.id, 'https://example.com/avatar-module-contact.png')
    expect(store.resolveContactAvatar(created.id)).toBe('https://example.com/avatar-module-contact.png')

    store.setConversationIdentityOverrides(created.id, {
      contactAvatar: 'https://example.com/avatar-thread.png',
    })
    expect(store.resolveContactAvatar(created.id)).toBe('https://example.com/avatar-thread.png')

    store.setConversationIdentityOverrides(created.id, { contactAvatar: '' })
    expect(store.resolveContactAvatar(created.id)).toBe('https://example.com/avatar-module-contact.png')

    store.setModuleContactAvatarOverride(created.id, '')
    expect(store.resolveContactAvatar(created.id)).toBe('https://example.com/avatar-module-default.png')

    store.setModuleAvatarOverrides({ defaultContactAvatar: '' })
    expect(store.resolveContactAvatar(created.id)).toBe('https://example.com/avatar-global.png')

    store.updateContact(created.id, { avatar: '' })
    const fallbackAvatar = store.resolveContactAvatar(created.id)
    expect(fallbackAvatar).toContain('https://api.dicebear.com/7.x/avataaars/svg?seed=')
  })

  test('supports chat module user identity and anonymity scope', () => {
    const store = useChatStore()
    const firstContactId = store.contacts[0].id
    const secondContactId = store.contacts[1].id

    const defaults = store.getModuleIdentity()
    expect(defaults.avatar).toBe('')
    expect(defaults.nickname).toBe('')
    expect(defaults.anonymityEnabled).toBe(false)
    expect(defaults.anonymityScope).toBe('all')
    expect(defaults.anonymityContactIds).toEqual([])

    expect(
      store.setModuleIdentity({
        avatar: 'https://example.com/chat-self.png',
        nickname: 'Runner',
        anonymityEnabled: true,
        anonymityScope: 'selected',
        anonymityContactIds: [firstContactId, firstContactId, secondContactId, '0'],
      }),
    ).toBe(true)

    const updated = store.getModuleIdentity()
    expect(updated.avatar).toBe('https://example.com/chat-self.png')
    expect(updated.nickname).toBe('Runner')
    expect(updated.anonymityEnabled).toBe(true)
    expect(updated.anonymityScope).toBe('selected')
    expect(updated.anonymityContactIds).toEqual([firstContactId, secondContactId])
    expect(store.isModuleIdentityAnonymousForContact(firstContactId)).toBe(true)
    expect(store.isModuleIdentityAnonymousForContact(secondContactId)).toBe(true)
    expect(store.setModuleIdentity({ anonymityScope: 'all' })).toBe(true)
    expect(store.isModuleIdentityAnonymousForContact(firstContactId)).toBe(true)
  })

  test('keeps chat module identity avatar independent from legacy selfAvatar override', () => {
    const store = useChatStore()

    expect(
      store.setModuleAvatarOverrides({
        selfAvatar: 'https://example.com/legacy-self.png',
      }),
    ).toBe(true)

    expect(store.getModuleAvatarOverrides().selfAvatar).toBe('https://example.com/legacy-self.png')
    expect(store.getModuleIdentity().avatar).toBe('')

    expect(
      store.setModuleIdentity({
        avatar: 'https://example.com/new-chat-self.png',
      }),
    ).toBe(true)
    expect(store.getModuleIdentity().avatar).toBe('https://example.com/new-chat-self.png')

    expect(
      store.setModuleIdentity({
        avatar: '',
      }),
    ).toBe(true)
    expect(store.getModuleIdentity().avatar).toBe('')
    expect(store.getModuleAvatarOverrides().selfAvatar).toBe('https://example.com/legacy-self.png')
  })

  test('restores module/thread avatar overrides from backup snapshot', () => {
    const store = useChatStore()

    const restored = store.restoreFromBackup({
      moduleAvatarOverrides: {
        selfAvatar: 'https://example.com/self-module.png',
        defaultContactAvatar: 'https://example.com/contact-module.png',
        contactAvatars: {
          501: 'https://example.com/contact-module-specific.png',
        },
      },
      moduleIdentity: {
        avatar: 'https://example.com/chat-module-self.png',
        nickname: 'Ghost',
        anonymityEnabled: true,
        anonymityScope: 'selected',
        anonymityContactIds: [501],
      },
      roleProfiles: [
        {
          id: 301,
          name: 'Override Role',
          role: 'Guide',
          isMain: false,
          avatar: 'https://example.com/contact-global.png',
          bio: '',
        },
      ],
      contacts: [
        {
          id: 501,
          kind: 'role',
          profileId: 301,
          relationshipLevel: 50,
          relationshipNote: '',
          lastMessage: '',
        },
      ],
      conversations: {
        501: {
          id: 'conv_501',
          contactId: 501,
          identityOverrides: {
            selfAvatar: 'https://example.com/self-thread.png',
            contactAvatar: 'https://example.com/contact-thread.png',
          },
        },
      },
      messagesByConversation: {
        501: [{ role: 'assistant', content: 'Hello' }],
      },
    })

    expect(restored).toBe(true)
    expect(store.getModuleAvatarOverrides().selfAvatar).toBe('https://example.com/self-module.png')
    expect(store.getModuleIdentity().avatar).toBe('https://example.com/chat-module-self.png')
    expect(store.getModuleIdentity().nickname).toBe('Ghost')
    expect(store.isModuleIdentityAnonymousForContact(501)).toBe(true)
    expect(store.getModuleContactAvatarOverride(501)).toBe('https://example.com/contact-module-specific.png')
    expect(store.getConversationIdentityOverrides(501).selfAvatar).toBe('https://example.com/self-thread.png')
    expect(store.getConversationIdentityOverrides(501).contactAvatar).toBe('https://example.com/contact-thread.png')
    expect(store.resolveContactAvatar(501)).toBe('https://example.com/contact-thread.png')
  })

  test('migrates legacy selfAvatar into chat module identity only when moduleIdentity is missing', () => {
    const store = useChatStore()

    const restored = store.restoreFromBackup({
      moduleAvatarOverrides: {
        selfAvatar: 'https://example.com/legacy-self-only.png',
      },
      contacts: store.contacts,
      conversations: {},
      messagesByConversation: {},
    })

    expect(restored).toBe(true)
    expect(store.getModuleAvatarOverrides().selfAvatar).toBe('https://example.com/legacy-self-only.png')
    expect(store.getModuleIdentity().avatar).toBe('https://example.com/legacy-self-only.png')
  })

  test('supports contact kind update and remove', () => {
    const store = useChatStore()
    const created = store.addContact({
      name: 'Service Bot',
      kind: 'service',
      role: 'Service account',
      serviceTemplate: 'Order notification template',
      shoppingServiceKey: 'style_cloud',
      logisticsServiceKey: 'standard_courier',
      foodDeliveryServiceKey: 'food_delivery_dispatch',
    })

    expect(created.kind).toBe('service')
    expect(created.serviceTemplate).toBe('Order notification template')
    expect(created.shoppingServiceKey).toBe('style_cloud')
    expect(created.logisticsServiceKey).toBe('standard_courier')
    expect(created.foodDeliveryServiceKey).toBe('food_delivery_dispatch')

    store.updateContact(created.id, {
      kind: 'official',
      serviceTemplate: 'Announcement template',
      shoppingServiceKey: 'invalid_service',
      logisticsServiceKey: 'invalid_logistics',
      foodDeliveryServiceKey: 'invalid_food',
    })
    const updated = store.contacts.find((item) => item.id === created.id)
    expect(updated?.kind).toBe('official')
    expect(updated?.serviceTemplate).toBe('Announcement template')
    expect(updated?.shoppingServiceKey).toBe('')
    expect(updated?.logisticsServiceKey).toBe('')
    expect(updated?.foodDeliveryServiceKey).toBe('')

    const removed = store.removeContact(created.id)
    expect(removed).toBe(true)
    expect(store.contacts.some((item) => item.id === created.id)).toBe(false)
  })

  test('appends deduped service notifications without role binding state', () => {
    const store = useChatStore()
    const service = store.addContact({
      name: 'Style Cloud',
      kind: 'service',
      role: 'Service account',
      shoppingServiceKey: 'style_cloud',
    })

    const message = store.appendServiceNotification(service.id, {
      kind: CHAT_SERVICE_NOTIFICATION_KIND.SHOPPING_ORDER,
      title: 'Order placed · Nova Jacket',
      summary: 'Shopping owns this order; Chat only carries the notification.',
      statusLabel: 'Placed',
      amount: '399.00 CNY',
      sourceModule: 'shopping_order_update',
      sourceId: 'order_4_4',
      serviceKey: 'style_cloud',
      serviceLabel: 'Style Cloud',
      route: '/shopping?source=chat&intent=shopping_order&orderId=order_4_4',
      actions: [
        {
          label: 'View order',
          route: '/shopping?source=chat&intent=shopping_order&orderId=order_4_4',
        },
      ],
    })
    const duplicate = store.appendServiceNotification(service.id, {
      kind: CHAT_SERVICE_NOTIFICATION_KIND.SHOPPING_ORDER,
      title: 'Order placed duplicate',
      sourceModule: 'shopping_order_update',
      sourceId: 'order_4_4',
      route: '/shopping',
    })

    expect(duplicate?.id).toBe(message?.id)
    expect(store.getMessagesByContactId(service.id).filter((item) =>
      item.blocks.some((block) => block.type === 'service_notification'),
    )).toHaveLength(1)
    expect(store.getConversationByContactId(service.id).unread).toBe(1)
    expect(message?.blocks[0]).toMatchObject({
      type: 'service_notification',
      kind: CHAT_SERVICE_NOTIFICATION_KIND.SHOPPING_ORDER,
      sourceModule: 'shopping_order_update',
      sourceId: 'order_4_4',
      serviceKey: 'style_cloud',
      actions: [{ label: 'View order' }],
    })
    expect(store.getRoleBindingContract(service.id).roleBound).toBe(false)
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

  test('enforces visible role ids and preserves manual detail items through relationship resets', () => {
    const store = useChatStore()
    const created = store.addRoleProfile({
      roleId: '100A',
      name: 'Role Id Tester',
      role: 'Archivist',
      detailItems: [
        {
          section: 'preferences',
          sourceKind: 'manual',
          title: 'Tea',
          detail: 'Likes jasmine tea.',
        },
        {
          section: 'lifePattern',
          sourceKind: 'event_attached',
          title: 'Late call',
          detail: 'Stayed up for a call.',
          memoryKey: 'late_call',
        },
      ],
    })

    expect(created?.roleId).toBe('100A')
    expect(store.getRoleProfileByRoleId('100A')?.id).toBe(created.id)
    expect(store.isRoleIdAvailable('100A')).toBe(false)
    expect(store.addRoleProfile({ roleId: '100A', name: 'Duplicate Role' })).toBe(null)
    expect(store.addRoleProfile({ roleId: 'alpha', name: 'Invalid Role' })).toBe(null)
    expect(store.updateRoleProfile(created.id, { roleId: '200B' })).toBe(true)
    expect(store.getRoleProfileByRoleId('200B')?.name).toBe('Role Id Tester')

    const manual = store.listRoleDetailItems(created.id, 'preferences')
    expect(manual).toHaveLength(1)
    expect(manual[0]).toMatchObject({
      sourceKind: 'manual',
      title: 'Tea',
    })

    const removed = store.clearRoleEventAttachedDetailItems(created.id)
    expect(removed).toBe(1)
    expect(store.listRoleDetailItems(created.id)).toHaveLength(1)
    expect(store.listRoleDetailItems(created.id)[0]?.sourceKind).toBe('manual')
  })

  test('updates manual role detail items without changing event-attached metadata', () => {
    const store = useChatStore()
    const created = store.addRoleProfile({
      roleId: '100C',
      name: 'Role Detail Editor',
      detailItems: [
        {
          section: 'preferences',
          sourceKind: 'manual',
          title: 'Tea',
          detail: 'Likes jasmine tea.',
        },
      ],
    })

    const item = store.listRoleDetailItems(created.id, 'preferences')[0]
    const updated = store.updateRoleDetailItem(created.id, item.id, {
      title: 'Coffee',
      detail: 'Now prefers pour-over coffee.',
    })

    expect(updated).toMatchObject({
      id: item.id,
      section: 'preferences',
      sourceKind: 'manual',
      title: 'Coffee',
      detail: 'Now prefers pour-over coffee.',
    })
    expect(store.listRoleDetailItems(created.id, 'preferences')[0]).toMatchObject({
      id: item.id,
      title: 'Coffee',
      detail: 'Now prefers pour-over coffee.',
    })
  })

  test('clears role chat history without unbinding the Chat Directory contact', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      roleId: '300',
      name: 'History Reset',
      role: 'Guide',
    })
    const binding = store.bindRoleProfile(profile.id)
    store.appendMessage(binding.id, {
      role: 'user',
      content: 'Please remember this for now.',
      status: 'delivered',
    })
    expect(store.getMessagesByContactId(binding.id).length).toBeGreaterThan(0)

    const cleared = store.clearRoleProfileChatHistory(profile.id)
    expect(cleared).toBe(1)
    expect(store.getMessagesByContactId(binding.id)).toEqual([])
    expect(store.contacts.some((item) => Number(item.profileId) === profile.id)).toBe(true)
    expect(store.getConversationByContactId(binding.id).lastMessage).toBe('')
  })

  test('supports role profile asset pack binding and role chat asset context resolution', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      name: 'PackRole',
      role: 'Guide',
      isMain: false,
      assetPack: {
        wallpaperAssetIds: ['asset_wall_a'],
        emojiAssetIds: ['asset_emoji_a'],
        referenceAssetIds: ['asset_ref_a', 'asset_ref_b'],
        scenarioAssetIds: ['asset_scene_a'],
      },
      assetFolderBindings: {
        imageReference: {
          folderId: 'folder_ref_default',
          folderPriority: 10,
        },
      },
    })

    const updated = store.setRoleProfileAssetPack(profile.id, {
      referenceAssetIds: ['asset_ref_c', 'asset_ref_c'],
    })
    expect(updated).toBe(true)
    const pack = store.getRoleProfileAssetPack(profile.id)
    expect(pack.referenceAssetIds).toEqual(['asset_ref_c'])
    expect(pack.wallpaperAssetIds).toEqual(['asset_wall_a'])

    const folderBindingsUpdated = store.setRoleProfileAssetFolderBindings(profile.id, {
      imageReference: {
        folderId: 'folder_ref_override',
      },
      emojiPack: {
        folderId: 'folder_emoji_pack',
      },
    })
    expect(folderBindingsUpdated).toBe(true)
    const folderBindings = store.getRoleProfileAssetFolderBindings(profile.id)
    expect(folderBindings.imageReference.folderId).toBe('folder_ref_override')
    expect(folderBindings.emojiPack.folderId).toBe('folder_emoji_pack')
    expect(folderBindings.imageReference.folderPriority).toBe(10)

    const binding = store.bindRoleProfile(profile.id, { relationshipLevel: 55 })
    const contextBeforeOverride = store.getRoleBindingAssetContext(binding.id)
    expect(contextBeforeOverride.profileId).toBe(profile.id)
    expect(contextBeforeOverride.profileAssetIds).toContain('asset_ref_c')
    expect(contextBeforeOverride.recommendedImageAssetId).toBe('asset_ref_c')
    expect(contextBeforeOverride.profileAssetFolderBindings.imageReference.folderId).toBe(
      'folder_ref_override',
    )

    store.updateRoleBindingMeta(binding.id, { preferredImageAssetId: 'asset_scene_custom' })
    const contextAfterOverride = store.getRoleBindingAssetContext(binding.id)
    expect(contextAfterOverride.preferredImageAssetId).toBe('asset_scene_custom')
    expect(contextAfterOverride.recommendedImageAssetId).toBe('asset_scene_custom')
  })

  test('exposes cross-module role binding contract with stable avatar and asset fields', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      name: 'Contract Role',
      role: 'Navigator',
      isMain: false,
      avatar: 'https://example.com/global-avatar.png',
      assetPack: {
        referenceAssetIds: ['asset_ref_1'],
      },
      assetFolderBindings: {
        profileImage: {
          folderId: 'folder_profile_main',
        },
      },
    })

    const binding = store.bindRoleProfile(profile.id, {
      relationshipLevel: 72,
      relationshipNote: 'Contract note',
    })

    store.setModuleAvatarOverrides({
      defaultContactAvatar: 'https://example.com/module-default.png',
    })
    store.setModuleContactAvatarOverride(binding.id, 'https://example.com/module-contact.png')
    store.setConversationIdentityOverrides(binding.id, {
      contactAvatar: 'https://example.com/thread-contact.png',
    })
    store.updateRoleBindingMeta(binding.id, {
      preferredImageAssetId: 'asset_pref_1',
    })

    const contract = store.getRoleBindingContract(binding.id, {
      moduleKey: 'map',
    })
    expect(contract.moduleKey).toBe('map')
    expect(contract.roleBound).toBe(true)
    expect(contract.contact.id).toBe(binding.id)
    expect(contract.profile.id).toBe(profile.id)
    expect(contract.relationship.level).toBe(72)
    expect(contract.relationship.note).toBe('Contract note')
    expect(contract.assets.preferredImageAssetId).toBe('asset_pref_1')
    expect(contract.assets.recommendedImageAssetId).toBe('asset_pref_1')
    expect(contract.assets.profileAssetIds).toContain('asset_ref_1')
    expect(contract.assets.profileAssetFolderBindings.profileImage.folderId).toBe(
      'folder_profile_main',
    )
    expect(contract.avatar.activeLayer).toBe('thread')
    expect(contract.avatar.resolved).toBe('https://example.com/thread-contact.png')

    store.setConversationIdentityOverrides(binding.id, { contactAvatar: '' })
    const moduleLayerContract = store.getRoleBindingContract(binding.id, {
      moduleKey: 'forum',
    })
    expect(moduleLayerContract.avatar.activeLayer).toBe('module')
    expect(moduleLayerContract.avatar.resolved).toBe('https://example.com/module-contact.png')

    const list = store.listRoleBindingContracts([binding.id], { moduleKey: 'forum' })
    expect(Array.isArray(list)).toBe(true)
    expect(list).toHaveLength(1)
    expect(list[0].moduleKey).toBe('forum')

    const service = store.addContact({
      name: 'Service Entry',
      kind: 'service',
      role: 'Service',
    })
    const serviceContract = store.getRoleBindingContract(service.id, {
      moduleKey: 'map',
    })
    expect(serviceContract.roleBound).toBe(false)
    expect(serviceContract.contact.kind).toBe('service')
    expect(serviceContract.assets.profileAssetIds).toEqual([])
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
