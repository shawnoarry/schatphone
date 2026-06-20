import { describe, expect, test } from 'vitest'
import {
  CHAT_ASSISTANT_RESPONSE_LIMITS,
  sanitizeChatAssistantHtmlSnippet,
  sanitizeChatAssistantImageUrl,
  trimChatAssistantText,
  useChatAssistantResponseModel,
} from '../src/composables/useChatAssistantResponseModel'

const createModel = () =>
  useChatAssistantResponseModel({
    clampReplyCount: (value) => {
      const count = Number(value)
      if (!Number.isFinite(count)) return 1
      return Math.min(2, Math.max(1, Math.floor(count)))
    },
    safeModuleRoutes: ['/home', '/wallet', '/shopping', '/map'],
  })

const baseAiPrefs = {
  allowQuoteReply: true,
  allowSelfQuote: false,
  bilingualEnabled: false,
  virtualVoiceEnabled: true,
  replyCount: 1,
}

describe('Chat assistant response model interface', () => {
  test('exposes stable text and sanitizer helpers used by Chat response normalization', () => {
    expect(trimChatAssistantText(` ${'x'.repeat(4000)} `, 12)).toBe('xxxxxxxxxxxx')
    expect(sanitizeChatAssistantImageUrl('javascript:alert(1)')).toBe('')
    expect(sanitizeChatAssistantImageUrl('https://example.test/image.png')).toBe(
      'https://example.test/image.png',
    )
    expect(
      sanitizeChatAssistantHtmlSnippet('<div onclick="javascript:alert(1)">ok</div><script>bad()</script>'),
    ).toBe('<div onclick="alert(1)">ok</div>')
  })

  test('returns a primary text fallback for non-json assistant replies', () => {
    const model = createModel()
    const parsed = model.parseAssistantResponse(' plain fallback reply ', baseAiPrefs)

    expect(parsed.socialEvents).toEqual([])
    expect(parsed.messages).toHaveLength(1)
    expect(parsed.messages[0]).toMatchObject({
      content: 'plain fallback reply',
      replyType: 'plain',
      quote: null,
    })
    expect(parsed.messages[0].blocks).toEqual([
      {
        type: 'text',
        text: 'plain fallback reply',
        variant: 'primary',
        lang: 'auto',
      },
    ])
  })

  test('normalizes reply type, quote target, bilingual text flow, and social-event proposals', () => {
    const model = createModel()
    const parsed = model.parseAssistantResponse(
      JSON.stringify({
        messages: [
          {
            replyType: 'quote_user',
            quote: { messageId: 'user-1', role: 'user', preview: 'old preview' },
            blocks: [
              { type: 'text', variant: 'primary', lang: 'zh', text: ' 主文本 ' },
              { type: 'text', variant: 'secondary', lang: 'en', text: 'Translation' },
              { type: 'text', variant: 'secondary', lang: 'en', text: 'Translation' },
              { type: 'text', variant: 'secondary', lang: 'ko', text: '主文本' },
            ],
          },
        ],
        socialEvents: [{ type: 'role_block_user', reason: ' conflict escalated ' }],
      }),
      {
        ...baseAiPrefs,
        bilingualEnabled: true,
      },
      {
        quoteCandidates: [
          { id: 'user-1', role: 'user', preview: 'quoted user text' },
          { id: 'assistant-1', role: 'assistant', preview: 'assistant text' },
        ],
      },
    )

    expect(parsed.messages[0]).toMatchObject({
      content: '主文本',
      replyType: 'quote_user',
      quote: {
        messageId: 'user-1',
        role: 'user',
        preview: 'quoted user text',
      },
    })
    expect(parsed.messages[0].blocks).toEqual([
      { type: 'text', variant: 'primary', lang: 'zh', text: '主文本' },
      { type: 'text', variant: 'secondary', lang: 'en', text: 'Translation' },
    ])
    expect(parsed.socialEvents).toEqual([
      { eventType: 'role_block_user', explanation: 'conflict escalated' },
    ])
  })

  test('falls back to plain reply when requested quote is not allowed or unresolved', () => {
    const model = createModel()

    const selfQuote = model.normalizeAssistantMessagePayload(
      {
        replyType: 'quote_self',
        quote: { messageId: 'assistant-1', role: 'assistant', preview: 'assistant text' },
        blocks: [{ type: 'text', text: 'No quote self.' }],
      },
      baseAiPrefs,
      'fallback',
      {
        quoteCandidates: [{ id: 'assistant-1', role: 'assistant', preview: 'assistant text' }],
      },
    )
    expect(selfQuote).toMatchObject({
      replyType: 'plain',
      quote: null,
      content: 'No quote self.',
    })

    const missingQuote = model.normalizeAssistantMessagePayload(
      {
        replyType: 'quote_user',
        quote: { messageId: 'missing-user', role: 'user', preview: 'missing' },
        blocks: [{ type: 'text', text: 'Missing quote.' }],
      },
      baseAiPrefs,
      'fallback',
      { quoteCandidates: [] },
    )
    expect(missingQuote).toMatchObject({
      replyType: 'plain',
      quote: null,
      content: 'Missing quote.',
    })
  })

  test('normalizes rich assistant blocks and keeps schemas behind the response Interface', () => {
    const model = createModel()
    const normalized = model.normalizeAssistantMessagePayload(
      {
        blocks: [
          { type: 'service_notification', title: 'forbidden' },
          { type: 'voice_virtual', transcript: 'spoken memo', durationSec: 'bad' },
          { type: 'module_link', route: '/admin', note: 'route note' },
          { type: 'transfer_virtual', amount: '88', currency: 'usd', actionRoute: '/admin' },
          {
            type: 'product_card',
            productId: 'p1',
            title: 'Product',
            price: '9.9',
            route: '/admin',
          },
          { type: 'image_virtual', url: 'javascript:alert(1)', caption: 'visual cue' },
          {
            type: 'mini_scene',
            description: 'scene desc',
            htmlSnippet: '<p>scene</p><script>bad()</script>',
          },
          { type: 'unknown', text: 'ignored' },
        ],
      },
      baseAiPrefs,
      'fallback',
      {
        messagePolicy: { allowImageVirtual: true },
      },
    )

    expect(normalized.content).toBe('语音消息：spoken memo')
    expect(normalized.blocks.map((block) => block.type)).toEqual([
      'text',
      'voice_virtual',
      'module_link',
      'transfer_virtual',
      'product_card',
      'image_virtual',
      'mini_scene',
    ])
    expect(normalized.blocks[1]).toMatchObject({
      label: '语音消息',
      transcript: 'spoken memo',
      durationSec: 8,
    })
    expect(normalized.blocks[2]).toMatchObject({ route: '/home' })
    expect(normalized.blocks[3]).toMatchObject({ currency: 'USD', actionRoute: '/wallet' })
    expect(normalized.blocks[4]).toMatchObject({ route: '/shopping' })
    expect(normalized.blocks[5]).toMatchObject({
      alt: '图片消息',
      url: '',
      caption: 'visual cue',
    })
    expect(normalized.blocks[6].htmlSnippet).toBe('<p>scene</p>')
  })

  test('uses payload text when image blocks are disallowed and caps reply count', () => {
    const model = createModel()
    const parsed = model.parseAssistantResponse(
      JSON.stringify({
        messages: [
          {
            content: 'first payload text',
            blocks: [{ type: 'image_virtual', alt: 'first image', caption: 'first caption' }],
          },
          { text: 'second payload text' },
          { text: 'third payload text' },
        ],
      }),
      {
        ...baseAiPrefs,
        replyCount: 3,
      },
      {
        replyCount: 3,
        messagePolicy: { allowImageVirtual: false },
      },
    )

    expect(parsed.messages).toHaveLength(2)
    expect(parsed.messages[0]).toMatchObject({
      content: 'first payload text',
      replyType: 'plain',
      quote: null,
    })
    expect(parsed.messages[0].blocks).toEqual([
      {
        type: 'text',
        text: 'first payload text',
        variant: 'primary',
        lang: 'auto',
      },
    ])
    expect(parsed.messages[1].content).toBe('second payload text')
  })

  test('respects assistant text and block caps', () => {
    const model = useChatAssistantResponseModel({
      clampReplyCount: () => 1,
      limits: {
        maxTextChars: 6,
        maxBlocks: 3,
      },
    })
    const normalized = model.normalizeAssistantMessagePayload(
      {
        blocks: [
          { type: 'text', text: '123456789' },
          { type: 'module_link', label: 'Map', route: '/map' },
          { type: 'transfer_virtual', amount: '1' },
          { type: 'mini_scene', title: 'Scene' },
        ],
      },
      baseAiPrefs,
      'fallback',
    )

    expect(normalized.content).toBe('123456')
    expect(normalized.blocks).toHaveLength(3)
    expect(normalized.blocks[0].text).toHaveLength(6)
    expect(CHAT_ASSISTANT_RESPONSE_LIMITS.maxTextChars).toBe(3000)
  })
})
