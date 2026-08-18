import { describe, expect, test } from 'vitest'
import {
  CHAT_AI_DISCLOSURE_MAX_CANDIDATES,
  CHAT_AI_DISCLOSURE_POLICY_MODES,
  hasChatAiDisclosureCandidates,
  normalizeChatAiDisclosureCandidates,
} from '../src/lib/chat-ai-disclosure-proposals'

const context = {
  contact: {
    id: 9,
    profileId: 21,
    kind: 'role',
    name: 'Sora',
  },
  conversationId: 'conversation_9',
  sourceMessages: [
    { id: 'user-1', role: 'user', content: '我不喜欢医院的消毒水味。' },
    { id: 'assistant-1', role: 'assistant', content: '我记住了。' },
    { id: 'user-recalled', role: 'user', recalledAt: 123, content: '不要保留。' },
  ],
  createdAt: 12345,
}

describe('chat AI disclosure candidate normalization', () => {
  test('stays disabled unless an explicit review policy is supplied', () => {
    const payload = {
      disclosureCandidates: [{ messageId: 'user-1', summary: '医院气味会让用户不舒服。' }],
    }

    expect(normalizeChatAiDisclosureCandidates(payload, context)).toEqual([])
    expect(
      normalizeChatAiDisclosureCandidates(payload, context, {
        mode: CHAT_AI_DISCLOSURE_POLICY_MODES.DISABLED,
      }),
    ).toEqual([])
  })

  test('binds a valid candidate to the trusted role and exact user message', () => {
    const normalized = normalizeChatAiDisclosureCandidates(
      {
        disclosureCandidates: [
          {
            messageId: 'user-1',
            summary: '用户不喜欢医院的消毒水味。',
            reason: '可用于未来关怀与场景回应。',
            contactId: 999,
            profileId: 999,
            memoryKey: 'should_not_survive',
            metricDeltas: { intimacy: 99 },
          },
        ],
      },
      context,
      { mode: CHAT_AI_DISCLOSURE_POLICY_MODES.REVIEW },
    )

    expect(normalized).toHaveLength(1)
    expect(normalized[0]).toMatchObject({
      kind: 'ai_disclosure_candidate',
      status: 'pending_review',
      sourceModule: 'relationship_chat_ai_disclosure_candidate',
      sourceId: 'conversation_9:profile_21:message_user-1',
      factType: 'ai_disclosure_candidate',
      summary: '用户不喜欢医院的消毒水味。',
      rationale: '可用于未来关怀与场景回应。',
      effectPolicy: 'review_only',
      modelRequired: true,
      target: {
        contactId: 9,
        profileId: 21,
        kind: 'role',
        name: 'Sora',
      },
      source: {
        moduleKey: 'chat',
        conversationId: 'conversation_9',
        messageId: 'user-1',
      },
      createdAt: 12345,
    })
    expect(normalized[0].memoryKey).toBeUndefined()
    expect(normalized[0].metricDeltas).toBeUndefined()
    expect(normalized[0].target.contactId).toBe(9)
    expect(normalized[0].target.profileId).toBe(21)
    expect(hasChatAiDisclosureCandidates(
      { disclosureCandidates: [{ messageId: 'user-1', summary: 'valid' }] },
      context,
      { mode: CHAT_AI_DISCLOSURE_POLICY_MODES.REVIEW },
    )).toBe(true)
  })

  test('rejects unknown, assistant-authored, recalled, and non-role targets', () => {
    const payload = {
      disclosure_candidates: [
        { messageId: 'missing', summary: 'unknown source' },
        { messageId: 'assistant-1', summary: 'assistant source' },
        { messageId: 'user-recalled', summary: 'recalled source' },
        { messageId: 'user-1', summary: '' },
      ],
    }

    expect(
      normalizeChatAiDisclosureCandidates(payload, context, {
        mode: CHAT_AI_DISCLOSURE_POLICY_MODES.REVIEW,
      }),
    ).toEqual([])

    expect(
      normalizeChatAiDisclosureCandidates(
        { disclosureCandidates: [{ messageId: 'user-1', summary: 'should reject' }] },
        { ...context, contact: { ...context.contact, kind: 'service' } },
        { mode: CHAT_AI_DISCLOSURE_POLICY_MODES.REVIEW },
      ),
    ).toEqual([])
  })

  test('deduplicates by source message, trims fields, and caps candidate count', () => {
    const sourceMessages = Array.from({ length: CHAT_AI_DISCLOSURE_MAX_CANDIDATES + 2 }, (_, index) => ({
      id: `user-${index}`,
      role: 'user',
    }))
    const payload = {
      disclosureCandidates: [
        { messageId: 'user-0', summary: ' first ', reason: ' reason ' },
        { messageId: 'user-0', summary: 'duplicate' },
        ...sourceMessages.slice(1).map((message) => ({
          messageId: message.id,
          summary: 'x'.repeat(300),
          rationale: 'y'.repeat(300),
        })),
      ],
    }

    const normalized = normalizeChatAiDisclosureCandidates(
      payload,
      { ...context, sourceMessages },
      { mode: CHAT_AI_DISCLOSURE_POLICY_MODES.REVIEW },
    )

    expect(normalized).toHaveLength(CHAT_AI_DISCLOSURE_MAX_CANDIDATES)
    expect(normalized[0].summary).toBe('first')
    expect(normalized[0].rationale).toBe('reason')
    expect(normalized[1].summary).toHaveLength(240)
    expect(normalized[1].rationale).toHaveLength(180)
    expect(new Set(normalized.map((item) => item.source.messageId)).size).toBe(normalized.length)
  })
})
