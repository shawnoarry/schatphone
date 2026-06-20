import { DEFAULT_CHAT_THREAD_AI_PREFS } from './useChatActiveThreadModel'
import {
  buildWorldPromptBlock,
  resolveWorldContextForConsumer,
} from '../lib/world-interface'

export const CHAT_AI_PROMPT_CONTEXT_LIMITS = Object.freeze({
  quotePreviewChars: 240,
  smartReplyHistoryMessages: 5,
  automationFingerprintMessages: 6,
  automationFingerprintChars: 1200,
})

const valueOf = (source) => (source && typeof source === 'object' && 'value' in source ? source.value : source)

const optionValues = (options) => {
  const list = valueOf(options)
  return Array.isArray(list) ? list : []
}

const truncatePromptPreview = (text, maxLength = 72) => {
  const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
}

export const formatChatTruthTimestampForPrompt = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return 'none'
  return new Date(ts).toISOString()
}

export const summarizeChatTruthEventsForPrompt = (events = []) => {
  if (!Array.isArray(events) || events.length === 0) return 'none'
  return events
    .slice(0, 4)
    .map((event) => {
      const at = formatChatTruthTimestampForPrompt(event?.at)
      const action = typeof event?.action === 'string' ? event.action : 'interaction'
      if (action === 'resume_settlement') {
        const cycles = Number(event?.payload?.missedCycles)
        const count = Number.isFinite(cycles) ? Math.max(1, Math.floor(cycles)) : 1
        return `${at}: resume_settlement(${count})`
      }
      if (action === 'notify_only_skip') return `${at}: notify_only_skip`
      if (action === 'assistant_reply') return `${at}: assistant_reply`
      if (action === 'user_message') return `${at}: user_message`
      return `${at}: ${action}`
    })
    .join('; ')
}

export const clampChatPromptContextTurns = (
  value,
  defaultThreadAiPrefs = DEFAULT_CHAT_THREAD_AI_PREFS,
) => {
  const turns = Number(value)
  if (!Number.isFinite(turns)) return defaultThreadAiPrefs.contextTurns
  return Math.min(20, Math.max(2, Math.floor(turns)))
}

export const clampChatPromptReplyCount = (
  value,
  defaultThreadAiPrefs = DEFAULT_CHAT_THREAD_AI_PREFS,
) => {
  const count = Number(value)
  if (!Number.isFinite(count)) return defaultThreadAiPrefs.replyCount
  return Math.min(3, Math.max(1, Math.floor(count)))
}

export const resolveChatAssistantImageBlockPolicy = (aiPrefs, imageReferences = []) => {
  const referenceCount = Array.isArray(imageReferences) ? imageReferences.length : 0
  const allowWithoutReference = Boolean(aiPrefs?.allowImageVirtualWithoutReference)
  return {
    referenceCount,
    allowWithoutReference,
    allowImageVirtual: referenceCount > 0 || allowWithoutReference,
  }
}

export const isChatPromptRecalledMessage = (message) =>
  Boolean(Number(message?.recalledAt || 0) > 0)

export const hasChatPromptRichMessageBlocks = (blocks = []) =>
  Array.isArray(blocks) && blocks.some((block) => block?.type && block.type !== 'text')

const formatProfileValuesForPrompt = (values = []) =>
  Array.isArray(values) && values.length > 0
    ? values
        .map((item) => `${item.fieldId}: ${Array.isArray(item.value) ? item.value.join(', ') : item.value}`)
        .join('; ')
    : 'none'

const serviceNotificationContextText = (block = {}) => {
  if (!block || block.type !== 'service_notification') return ''
  const sourceLabel = block.serviceLabel || block.serviceKey || 'Service account'
  const details = [
    `[service notification] ${sourceLabel}`,
    block.title ? `title: ${block.title}` : '',
    block.statusLabel ? `status: ${block.statusLabel}` : '',
    block.amount ? `amount: ${block.amount}` : '',
    block.summary ? `summary: ${block.summary}` : '',
    block.route ? `source action: ${block.route}` : '',
  ].filter(Boolean)
  return details.join(' | ')
}

const recalledMessageContextText = (message, getActiveMessageSenderName) => {
  if (message?.role === 'user') {
    return '[message recalled] The user recalled one of their messages. The original content is unavailable.'
  }
  const senderName =
    typeof getActiveMessageSenderName === 'function'
      ? getActiveMessageSenderName()
      : 'Contact'
  return `[message recalled] ${senderName} recalled one of their own messages. The original content is unavailable.`
}

const messageBlockContextText = (block = {}) => {
  if (!block || typeof block !== 'object') return ''
  if (block.type === 'text') return block.text || ''
  if (block.type === 'voice_virtual') {
    return [
      '[voice]',
      block.label ? `label: ${block.label}` : '',
      block.durationSec ? `duration: ${block.durationSec}s` : '',
      block.transcript ? `transcript: ${block.transcript}` : '',
    ]
      .filter(Boolean)
      .join(' | ')
  }
  if (block.type === 'module_link') {
    return ['[link]', block.label || '', block.note || '', block.route ? `route: ${block.route}` : '']
      .filter(Boolean)
      .join(' | ')
  }
  if (block.type === 'link_external') {
    return ['[external_link]', block.label || '', block.note || '', block.url || ''].filter(Boolean).join(' | ')
  }
  if (block.type === 'transfer_virtual') {
    return [
      '[transfer]',
      block.label || '',
      `${block.amount || ''} ${block.currency || ''}`.trim(),
      block.to ? `to: ${block.to}` : '',
      block.note ? `note: ${block.note}` : '',
    ]
      .filter(Boolean)
      .join(' | ')
  }
  if (block.type === 'product_card') {
    return [
      '[product]',
      block.title || '',
      `${block.price || ''} ${block.currency || ''}`.trim(),
      block.category ? `category: ${block.category}` : '',
      block.desc || '',
    ]
      .filter(Boolean)
      .join(' | ')
  }
  if (block.type === 'share_card') {
    return [
      '[share]',
      block.shareType ? `type: ${block.shareType}` : '',
      block.title || '',
      block.statusLabel ? `status: ${block.statusLabel}` : '',
      block.amountLabel ? `amount: ${block.amountLabel}` : '',
      block.category ? `category: ${block.category}` : '',
      block.summary || '',
      block.aiContext?.recipientMeaning ? `meaning: ${block.aiContext.recipientMeaning}` : '',
      block.aiContext?.sourceTruthOwner ? `source owner: ${block.aiContext.sourceTruthOwner}` : '',
      block.aiContext?.mutationBoundary ? `boundary: ${block.aiContext.mutationBoundary}` : '',
    ]
      .filter(Boolean)
      .join(' | ')
  }
  if (block.type === 'service_notification') return serviceNotificationContextText(block)
  if (block.type === 'image_virtual') {
    return ['[image]', block.alt || '', block.caption ? `caption: ${block.caption}` : '']
      .filter(Boolean)
      .join(' | ')
  }
  if (block.type === 'mini_scene') {
    return ['[scene]', block.title || '', block.description || ''].filter(Boolean).join(' | ')
  }
  return ''
}

const messageBlocksContextText = (blocks = []) =>
  Array.isArray(blocks)
    ? blocks.map(messageBlockContextText).filter(Boolean).join('\n').trim()
    : ''

export const useChatAiPromptContextModel = ({
  chatStore,
  systemStore,
  bookStore,
  relationshipRuntimeStore,
  user,
  responseStyleOptions,
  defaultThreadAiPrefs = DEFAULT_CHAT_THREAD_AI_PREFS,
  maxAssistantQuotePreviewChars = CHAT_AI_PROMPT_CONTEXT_LIMITS.quotePreviewChars,
  getMessagePrimaryText,
  getActiveMessageSenderName,
} = {}) => {
  const clampContextTurns = (value) =>
    clampChatPromptContextTurns(value, defaultThreadAiPrefs)

  const clampReplyCount = (value) =>
    clampChatPromptReplyCount(value, defaultThreadAiPrefs)

  const normalizeResponseStyle = (value) =>
    optionValues(responseStyleOptions).some((item) => item.value === value)
      ? value
      : defaultThreadAiPrefs.responseStyle

  const resolveAssistantImageBlockPolicy = (aiPrefs, imageReferences = []) =>
    resolveChatAssistantImageBlockPolicy(aiPrefs, imageReferences)

  const visibleSelfProfileValuesForRole = (visibilityLimit = 'familiar') => {
    const profiles = Array.isArray(chatStore?.roleProfiles) ? chatStore.roleProfiles : []
    const selfProfile = profiles.find((profile) => profile.entityType === 'self_profile')
    if (!selfProfile || !Array.isArray(selfProfile.profileValues)) return []
    const allowed = new Set(['public', 'familiar'])
    if (visibilityLimit === 'intimate') allowed.add('intimate')
    return selfProfile.profileValues.filter((value) => allowed.has(value.visibilityLevel))
  }

  const buildTruthPromptBlock = (contact) => {
    const snapshot =
      typeof systemStore?.getChatTruthSnapshot === 'function'
        ? systemStore.getChatTruthSnapshot(contact, { eventLimit: 4 })
        : null
    if (!snapshot) return 'Relationship truth: unavailable.'

    const relationship = snapshot.relationship || {}
    const counters = snapshot.counters || {}
    const timestamps = snapshot.timestamps || {}
    const eventsSummary = summarizeChatTruthEventsForPrompt(snapshot.recentEvents || [])

    return [
      `Relationship truth stage: ${relationship.stage || 'neutral'}.`,
      `Metrics affinity/trust/distance/dependency/tension: ${relationship.affinity ?? 50}/${relationship.trust ?? 50}/${relationship.distance ?? 50}/${relationship.dependency ?? 20}/${relationship.tension ?? 10}.`,
      `Counters user/assistant/manual/auto/reroll/notifyOnly/resumeSettle: ${counters.userMessageCount ?? 0}/${counters.assistantMessageCount ?? 0}/${counters.manualTriggerCount ?? 0}/${counters.autoTriggerCount ?? 0}/${counters.rerollCount ?? 0}/${counters.notifyOnlySkipCount ?? 0}/${counters.resumeSettlementCount ?? 0}.`,
      `Last interaction/user/assistant/warm/conflict: ${formatChatTruthTimestampForPrompt(timestamps.lastInteractionAt)}/${formatChatTruthTimestampForPrompt(timestamps.lastUserMessageAt)}/${formatChatTruthTimestampForPrompt(timestamps.lastAssistantMessageAt)}/${formatChatTruthTimestampForPrompt(timestamps.lastWarmMomentAt)}/${formatChatTruthTimestampForPrompt(timestamps.lastConflictAt)}.`,
      `Recent truth events: ${eventsSummary}.`,
    ].join('\n')
  }

  const buildRelationshipRuntimePromptBlock = (contact) => {
    const isRoleContact = (contact?.kind || 'role') === 'role'
    const target = {
      entityKey:
        contact?.profileId > 0
          ? `role:${contact.profileId}`
          : contact?.id > 0
            ? `contact:${contact.id}`
            : '',
      profileId: contact?.profileId,
      contactId: contact?.id,
      kind: contact?.kind,
      name: contact?.name,
    }
    const promptText =
      typeof relationshipRuntimeStore?.buildPromptContextForTarget === 'function'
        ? relationshipRuntimeStore.buildPromptContextForTarget(target, {
            eventLimit: 3,
            includeNeutral: isRoleContact,
          })
        : ''
    return promptText || (isRoleContact ? 'Relationship runtime snapshot: neutral / no stored cross-module facts yet.' : '')
  }

  const buildWorldKernelPromptBlock = (contact) => {
    const worldContext = resolveWorldContextForConsumer({
      systemStore,
      chatStore,
      bookStore,
      contact,
      consumer: 'chat',
    })
    const profile =
      contact?.profileId && typeof chatStore?.getRoleProfileById === 'function'
        ? chatStore.getRoleProfileById(contact.profileId)
        : null
    const roleProfileValues = profile?.profileValues || []
    const visibleSelfValues = visibleSelfProfileValuesForRole('familiar')

    return [
      buildWorldPromptBlock(worldContext),
      `Current role profile values: ${formatProfileValuesForPrompt(roleProfileValues)}.`,
      `Visible user self-profile values: ${formatProfileValuesForPrompt(visibleSelfValues)}.`,
    ].join('\n')
  }

  const buildSystemPrompt = (contact, aiPrefs, options = {}) => {
    const contactKind = contact.kind || 'role'
    const typeLabel =
      contactKind === 'group' ? 'group chat' : contactKind === 'service' ? 'service account' : contactKind === 'official' ? 'official account' : 'role chat'
    const moduleIdentity = chatStore.getModuleIdentity()
    const anonymousIdentity = chatStore.isModuleIdentityAnonymousForContact(contact.id)
    const userValue = valueOf(user) || {}
    const userDisplayName = moduleIdentity.nickname || userValue.name || 'User'
    const userAiContext = systemStore.getUserAiContextSummary({
      displayName: userDisplayName,
    })
    const serviceSourcePlan =
      contactKind === 'service' || contactKind === 'official'
        ? chatStore.getServiceAccountLinkContract(contact.id)?.sourceNotificationPlan || null
        : null
    const serviceSourcePlanInstruction = serviceSourcePlan
      ? [
          `Source notification schedule: ${serviceSourcePlan.summary}`,
          `Connected source modules: ${
            Array.isArray(serviceSourcePlan.rows) && serviceSourcePlan.rows.length > 0
              ? serviceSourcePlan.rows.map((row) => `${row.label} (${row.sourceModule})`).join('; ')
              : 'none'
          }.`,
          'These schedules are descriptive; only source modules create business records and service_notification cards.',
        ].join('\n')
      : ''

    const serviceInstruction =
      contactKind === 'service' || contactKind === 'official'
        ? [
            `Service template: ${contact.serviceTemplate || 'default service helper style, concise guidance'}.`,
            serviceSourcePlanInstruction,
            'Service account rule: behave as an interactive chat account, not a one-way announcement feed.',
            'When the user replies to or quotes a service notification, answer conversationally using the notification title, status, amount, source label, and summary available in context.',
            'Do not claim you changed, canceled, refunded, delivered, confirmed, or otherwise mutated any source-module business record from Chat.',
            'For business-state changes, explain that the user should open the linked source app/action; Chat only keeps the conversation and notification history.',
            'Do not create service_notification blocks in AI replies; use ordinary chat text unless a safe module link is useful.',
          ].join('\n')
        : `Role persona: ${contact.bio || 'none'}`
    const groupMembers =
      contactKind === 'group' && Array.isArray(contact.groupMemberIds)
        ? contact.groupMemberIds
            .map((memberId) => chatStore.getContactById(memberId))
            .filter(Boolean)
            .map((member) => `${member.name}${member.role ? ` (${member.role})` : ''}`)
        : []
    const groupInstruction =
      contactKind === 'group'
        ? [
            `Group reply mode: ${contact.groupReplyMode || 'natural'}.`,
            `Group members: ${groupMembers.length > 0 ? groupMembers.join('; ') : 'none configured'}.`,
            'When speaking for a group, make it clear which member is speaking in the message text.',
          ].join('\n')
        : ''

    const quoteRule = aiPrefs.allowQuoteReply
      ? aiPrefs.allowSelfQuote
        ? 'Allow plain, quote_user, quote_self.'
        : 'Allow plain, quote_user. Disallow quote_self.'
      : 'Only allow plain. Disallow quote reply types.'

    const bilingualRule = aiPrefs.bilingualEnabled
      ? `Output bilingual text blocks: primary in zh, secondary in ${aiPrefs.secondaryLanguage || 'en'}.`
      : 'Only output primary text blocks.'

    const voiceRule = aiPrefs.virtualVoiceEnabled
      ? 'voice_virtual blocks are allowed.'
      : 'voice_virtual blocks are disallowed.'

    const targetReplyCount = clampReplyCount(options.replyCount ?? aiPrefs.replyCount)
    const responseStyle = normalizeResponseStyle(aiPrefs.responseStyle)
    const proactiveInstruction = options.isProactive
      ? 'This is a proactive opener scene. Start naturally and do not mention trigger mechanics.'
      : 'This is a normal reply scene. Respond based on context naturally.'
    const worldKernelInstruction = buildWorldKernelPromptBlock(contact)
    const truthInstruction = buildTruthPromptBlock(contact)
    const relationshipRuntimeInstruction = buildRelationshipRuntimePromptBlock(contact)
    const imagePolicy = resolveAssistantImageBlockPolicy(aiPrefs, options.imageReferences)
    const imageReferenceCount = imagePolicy.referenceCount
    const providerCapabilities =
      options.providerCapabilities && typeof options.providerCapabilities === 'object'
        ? options.providerCapabilities
        : null
    const imageReferenceInstruction =
      imageReferenceCount > 0
        ? `Image references available in user context: ${imageReferenceCount}. Treat them as visual cues and avoid hallucinating details not supported by cues.`
        : 'No explicit image references were provided in this turn.'
    const imageBlockInstruction = imagePolicy.allowImageVirtual
      ? imagePolicy.allowWithoutReference
        ? 'image_virtual blocks are allowed. Even without explicit references, generated visual imagination is permitted for this thread.'
        : 'image_virtual blocks are allowed only when reference cues are present in this turn.'
      : 'image_virtual blocks are disallowed in this turn. Describe visuals in text instead of sending image_virtual blocks.'
    const providerCapabilityInstruction = providerCapabilities
      ? `Image-reference transport mode: ${providerCapabilities.preferredImageReferenceMode || 'none'} (provider: ${providerCapabilities.kind || 'unknown'}).`
      : 'Image-reference transport mode: unknown.'
    const userIdentityBlock = anonymousIdentity
      ? [
          'User identity: hidden.',
          'Treat the user as a stranger by default.',
          'Do not assume you know their name, background, occupation, or prior relationship unless this conversation explicitly reveals it.',
        ].join('\n')
      : userAiContext.promptText

    return `
${worldKernelInstruction}
${userIdentityBlock}
Conversation type: ${typeLabel}
Your role: ${contact.name} (${contact.role})
${serviceInstruction}
${groupInstruction}
Response style: ${responseStyle}
Target reply count: ${targetReplyCount}
${proactiveInstruction}
${truthInstruction}
${relationshipRuntimeInstruction}
${imageReferenceInstruction}
${providerCapabilityInstruction}
Stay in character and never claim you are an AI model.

You MUST return valid JSON object and never use markdown wrappers.
JSON schema:
{
  "messages": [
    {
      "replyType": "plain | quote_user | quote_self",
      "quote": {"messageId":"optional","role":"user | assistant","preview":"optional"} or null,
      "blocks": [
        {"type":"text","variant":"primary","lang":"zh","text":"..."}
      ]
    }
  ],
  "socialEvents": [
    {"type":"role_greeting_request | role_refuse_messages | role_restore_messages | role_block_user | role_unblock_user","explanation":"short reason"}
  ]
}

Rules:
- Keep messages length close to ${targetReplyCount}.
- ${quoteRule}
- ${bilingualRule}
- ${voiceRule}
- Always respect primary worldview rules, current role profile values, visible user self-profile values, and supplemental role-bound knowledge points.
- ${imageBlockInstruction}
- Optional block types: module_link, transfer_virtual, image_virtual, mini_scene.
- Each message must include at least one text block.
- socialEvents is optional. Use it only in role conversations when the character is proposing a communication-state change.
- socialEvents is a proposal only: never claim the state already changed, never include it for services, groups, or the user themself, and never use it for ordinary mood or relationship flavor.
`
  }

  const extractMessageTextForContext = (message) => {
    if (!message) return ''
    if (isChatPromptRecalledMessage(message)) {
      return recalledMessageContextText(message, getActiveMessageSenderName)
    }
    const revisedText =
      typeof message?.semanticRevision?.revisedText === 'string'
        ? message.semanticRevision.revisedText.trim()
        : ''
    if (revisedText) return revisedText
    const serviceNotificationText = Array.isArray(message.blocks)
      ? message.blocks.map(serviceNotificationContextText).find(Boolean) || ''
      : ''
    const quoteText = message.quote?.preview
      ? `[quoted ${message.quote.role === 'assistant' ? 'assistant' : 'user'}] ${message.quote.preview}`
      : ''
    if (serviceNotificationText) return [quoteText, serviceNotificationText].filter(Boolean).join('\n')
    const blockText = messageBlocksContextText(message.blocks)
    if (hasChatPromptRichMessageBlocks(message.blocks) && blockText) {
      return [quoteText, blockText].filter(Boolean).join('\n').trim()
    }
    if (typeof message.content === 'string' && message.content.trim()) {
      return [quoteText, message.content.trim()].filter(Boolean).join('\n')
    }
    if (!Array.isArray(message.blocks)) return ''

    return [quoteText, blockText].filter(Boolean).join('\n').trim()
  }

  const getContextSourceMessages = (contactId, options = {}) => {
    const allMessages =
      typeof chatStore?.getMessagesByContactId === 'function'
        ? chatStore.getMessagesByContactId(contactId)
        : []
    const result = []
    const untilMessageId =
      typeof options.untilMessageId === 'string' && options.untilMessageId.trim()
        ? options.untilMessageId
        : ''
    const beforeMessageId =
      typeof options.beforeMessageId === 'string' && options.beforeMessageId.trim()
        ? options.beforeMessageId
        : ''

    for (const item of Array.isArray(allMessages) ? allMessages : []) {
      if (beforeMessageId && item.id === beforeMessageId) break
      result.push(item)
      if (untilMessageId && item.id === untilMessageId) break
    }

    const contextTurns = clampContextTurns(options.contextTurns ?? defaultThreadAiPrefs.contextTurns)
    const messageLimit = Math.max(6, contextTurns * 2)
    return result.slice(-messageLimit)
  }

  const toQuoteCandidates = (messages = []) =>
    messages
      .filter((item) => item?.role === 'user' || item?.role === 'assistant')
      .map((item) => ({
        id: item.id,
        role: item.role,
        preview: truncatePromptPreview(
          typeof getMessagePrimaryText === 'function'
            ? getMessagePrimaryText(item)
            : item?.content,
          maxAssistantQuotePreviewChars,
        ),
      }))
      .filter((item) => item.id && item.preview)

  const toAiCallMessages = (messages = []) =>
    (Array.isArray(messages) ? messages : []).map((item) => ({
      role: item.role,
      content: extractMessageTextForContext(item),
    }))

  const toAiMessages = (contactId, untilMessageId = '', options = {}) =>
    toAiCallMessages(
      getContextSourceMessages(contactId, {
        untilMessageId,
        contextTurns: options.contextTurns,
      }),
    )

  const getSmartReplyHistory = (contactId) =>
    toAiMessages(contactId, '', { contextTurns: 4 }).slice(
      -CHAT_AI_PROMPT_CONTEXT_LIMITS.smartReplyHistoryMessages,
    )

  const getAutomationBaseFingerprint = (contactId) =>
    toAiMessages(contactId, '', { contextTurns: 4 })
      .slice(-CHAT_AI_PROMPT_CONTEXT_LIMITS.automationFingerprintMessages)
      .map((item) => `${item.role}:${(item.content || '').trim()}`)
      .join('|')
      .slice(0, CHAT_AI_PROMPT_CONTEXT_LIMITS.automationFingerprintChars)

  return {
    buildSystemPrompt,
    buildTruthPromptBlock,
    buildRelationshipRuntimePromptBlock,
    buildWorldKernelPromptBlock,
    clampContextTurns,
    clampReplyCount,
    extractMessageTextForContext,
    getAutomationBaseFingerprint,
    getContextSourceMessages,
    getSmartReplyHistory,
    hasRichMessageBlocks: hasChatPromptRichMessageBlocks,
    normalizeResponseStyle,
    resolveAssistantImageBlockPolicy,
    toAiCallMessages,
    toAiMessages,
    toQuoteCandidates,
  }
}
