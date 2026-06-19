import { describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import {
  CHAT_MESSAGE_ACTION_IDS,
  useChatMessageActionSheetModel,
} from '../src/composables/useChatMessageActionSheetModel'

const t = (zh, en) => en || zh
const editableRichTypes = new Set([
  'voice_virtual',
  'module_link',
  'link_external',
  'transfer_virtual',
  'image_virtual',
])

const createModel = ({ messages = [], isService = false, closeUserActionPanel = vi.fn() } = {}) =>
  useChatMessageActionSheetModel({
    activeMessages: ref(messages),
    isActiveServiceChat: ref(isService),
    editableRichMessageTypes: editableRichTypes,
    closeUserActionPanel,
    t,
  })

describe('Chat message action sheet model interface', () => {
  test('opens a target message and returns normal user-message action rows', () => {
    const closeUserActionPanel = vi.fn()
    const message = {
      id: 'm-user',
      role: 'user',
      content: 'hello',
      savedAt: 0,
    }
    const model = createModel({
      messages: [message],
      closeUserActionPanel,
    })

    model.openMessageActions(' m-user ')

    expect(closeUserActionPanel).toHaveBeenCalledTimes(1)
    expect(model.activeMessageActionId.value).toBe('m-user')
    expect(model.activeActionMessage.value).toMatchObject(message)
    expect(model.hasActiveMessageActions.value).toBe(true)
    expect(model.messageActionRows.value.map((action) => action.id)).toEqual([
      CHAT_MESSAGE_ACTION_IDS.QUOTE,
      CHAT_MESSAGE_ACTION_IDS.COPY,
      CHAT_MESSAGE_ACTION_IDS.SAVE,
      CHAT_MESSAGE_ACTION_IDS.EDIT,
      CHAT_MESSAGE_ACTION_IDS.RECALL,
      CHAT_MESSAGE_ACTION_IDS.DELETE,
    ])
    expect(model.messageActionRows.value.find((action) => action.id === CHAT_MESSAGE_ACTION_IDS.SAVE)?.label).toBe(
      'Save',
    )
  })

  test('uses unsave, restore, reroll, and contact recall labels when message state supports them', () => {
    const message = {
      id: 'm-assistant',
      role: 'assistant',
      savedAt: 123,
      semanticRevision: {
        revisedText: 'revised',
        originalText: 'original',
      },
    }
    const model = createModel({
      messages: [message],
    })

    model.openMessageActions('m-assistant')

    expect(model.messageActionRows.value.map((action) => action.id)).toEqual([
      CHAT_MESSAGE_ACTION_IDS.QUOTE,
      CHAT_MESSAGE_ACTION_IDS.COPY,
      CHAT_MESSAGE_ACTION_IDS.SAVE,
      CHAT_MESSAGE_ACTION_IDS.EDIT,
      CHAT_MESSAGE_ACTION_IDS.RESTORE,
      CHAT_MESSAGE_ACTION_IDS.REROLL,
      CHAT_MESSAGE_ACTION_IDS.RECALL,
      CHAT_MESSAGE_ACTION_IDS.DELETE,
    ])
    expect(model.messageActionRows.value.find((action) => action.id === CHAT_MESSAGE_ACTION_IDS.SAVE)?.label).toBe(
      'Unsave',
    )
    expect(model.messageActionRows.value.find((action) => action.id === CHAT_MESSAGE_ACTION_IDS.RECALL)?.label).toBe(
      'Make contact recall',
    )
  })

  test('keeps service-thread actions read-only for saved and recall semantics', () => {
    const model = createModel({
      isService: true,
      messages: [
        {
          id: 'm-service',
          role: 'assistant',
          content: 'service update',
        },
      ],
    })

    model.openMessageActions('m-service')

    expect(model.messageActionRows.value.map((action) => action.id)).toEqual([
      CHAT_MESSAGE_ACTION_IDS.QUOTE,
      CHAT_MESSAGE_ACTION_IDS.COPY,
      CHAT_MESSAGE_ACTION_IDS.EDIT,
      CHAT_MESSAGE_ACTION_IDS.REROLL,
      CHAT_MESSAGE_ACTION_IDS.DELETE,
    ])
  })

  test('hides original-message actions for recalled messages but keeps delete available', () => {
    const model = createModel({
      messages: [
        {
          id: 'm-recalled',
          role: 'user',
          content: 'hidden',
          recalledAt: 1000,
        },
      ],
    })

    model.openMessageActions('m-recalled')

    expect(model.messageActionRows.value.map((action) => action.id)).toEqual([
      CHAT_MESSAGE_ACTION_IDS.DELETE,
    ])
  })

  test('only exposes edit for supported rich-card messages', () => {
    const editableModel = createModel({
      messages: [
        {
          id: 'm-voice',
          role: 'assistant',
          blocks: [{ type: 'voice_virtual', transcript: 'memo' }],
        },
      ],
    })
    editableModel.openMessageActions('m-voice')

    expect(editableModel.messageActionRows.value.map((action) => action.id)).toContain(
      CHAT_MESSAGE_ACTION_IDS.EDIT,
    )

    const sourceOwnedModel = createModel({
      messages: [
        {
          id: 'm-share',
          role: 'assistant',
          blocks: [{ type: 'share_card', title: 'source record' }],
        },
      ],
    })
    sourceOwnedModel.openMessageActions('m-share')

    expect(sourceOwnedModel.messageActionRows.value.map((action) => action.id)).not.toContain(
      CHAT_MESSAGE_ACTION_IDS.EDIT,
    )
  })
})
