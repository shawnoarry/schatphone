import { describe, expect, test } from 'vitest'
import { reactive, ref } from 'vue'
import {
  CHAT_MESSAGE_EDITABLE_RICH_TYPES,
  useChatMessageEditDisplayModel,
} from '../src/composables/useChatMessageEditDisplayModel'

const t = (zh, en) => en || zh

const createModel = ({
  richType = '',
  richFields = {},
  originalRichFields = {},
  draftText = '',
  originalText = '',
  role = 'user',
  maxChars = 3000,
} = {}) => {
  const fields = reactive({
    label: '',
    url: '',
    note: '',
    transcript: '',
    durationSec: '',
    amount: '',
    currency: '',
    alt: '',
    caption: '',
    ...richFields,
  })

  return {
    fields,
    model: useChatMessageEditDisplayModel({
      editingMessageRichType: ref(richType),
      editingMessageRichFields: fields,
      editingMessageOriginalRichFields: ref(originalRichFields),
      editingMessageDraftText: ref(draftText),
      editingMessageOriginalText: ref(originalText),
      editingMessageRole: ref(role),
      maxAssistantTextChars: maxChars,
      t,
    }),
  }
}

describe('Chat message edit display model interface', () => {
  test('returns translated text-edit validation display state', () => {
    const { model } = createModel({
      draftText: ' revised assistant text ',
      originalText: 'original assistant text',
      role: 'assistant',
      maxChars: 12,
    })

    expect(model.messageEditRichFieldDefinitions.value).toEqual([])
    expect(model.messageEditState.value).toMatchObject({
      valid: false,
      reason: 'too_long',
      message: 'Text cannot exceed 12 chars.',
    })
  })

  test('normalizes external-link card edits and detects unchanged fields', () => {
    const { model } = createModel({
      richType: 'link_external',
      richFields: {
        label: '  Docs   Link  ',
        url: 'www.example.com/guide',
        note: '  Updated note  ',
      },
      originalRichFields: {
        label: 'Docs Link',
        url: 'https://www.example.com/guide',
        note: 'Updated note',
      },
    })

    expect(model.messageEditRichFieldDefinitions.value.map((field) => field.key)).toEqual([
      'label',
      'url',
      'note',
    ])
    expect(model.messageEditState.value).toMatchObject({
      valid: false,
      message: 'Card fields unchanged.',
      blockPatch: {
        label: 'Docs Link',
        url: 'https://www.example.com/guide',
        note: 'Updated note',
      },
      content: 'Docs Link\nhttps://www.example.com/guide',
    })
  })

  test('builds transfer card patch, content, and display definitions', () => {
    const { model } = createModel({
      richType: 'transfer_virtual',
      richFields: {
        amount: '88.50',
        currency: 'usd',
        note: '  dinner  ',
      },
      originalRichFields: {
        amount: '80',
        currency: 'USD',
        note: 'old',
      },
    })

    expect(model.messageEditRichFieldDefinitions.value.map((field) => field.key)).toEqual([
      'amount',
      'currency',
      'note',
    ])
    expect(model.messageEditState.value).toMatchObject({
      valid: true,
      message: 'Card fields will be updated for later context.',
      blockPatch: {
        amount: '88.50',
        currency: 'USD',
        note: 'dinner',
      },
      content: 'Transfer 88.50 USD',
    })
  })

  test('guards voice card transcript and duration validation', () => {
    const invalidTranscript = createModel({
      richType: 'voice_virtual',
      richFields: {
        transcript: ' ',
        durationSec: '12',
      },
    })

    expect(invalidTranscript.model.messageEditState.value).toMatchObject({
      valid: false,
      message: 'Voice transcript cannot be empty.',
    })

    const invalidDuration = createModel({
      richType: 'voice_virtual',
      richFields: {
        transcript: 'memo',
        durationSec: 'soon',
      },
    })

    expect(invalidDuration.model.messageEditState.value).toMatchObject({
      valid: false,
      message: 'Invalid duration format.',
    })
  })

  test('keeps the editable rich-card type list explicit', () => {
    expect(Array.from(CHAT_MESSAGE_EDITABLE_RICH_TYPES)).toEqual([
      'voice_virtual',
      'module_link',
      'link_external',
      'transfer_virtual',
      'image_virtual',
    ])
  })
})
