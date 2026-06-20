import { afterEach, describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import { useChatThreadMenuModel } from '../src/composables/useChatThreadMenuModel'

const defaultThreadAiPrefs = {
  suggestedRepliesEnabled: false,
  contextTurns: 8,
  bilingualEnabled: false,
  secondaryLanguage: 'en',
  allowQuoteReply: true,
  allowSelfQuote: false,
  virtualVoiceEnabled: true,
  replyMode: 'manual',
  replyCount: 1,
  responseStyle: 'immersive',
  proactiveOpenerEnabled: false,
  proactiveOpenerStrategy: 'on_enter_once',
  imageReferenceMode: 'auto',
  allowImageVirtualWithoutReference: false,
  autoInvokeEnabled: false,
  autoInvokeIntervalSec: 360,
}

const createModel = (options = {}) =>
  useChatThreadMenuModel({
    defaultThreadAiPrefs,
    replyModeOptions: ref([
      { value: 'manual', label: 'Manual' },
      { value: 'auto', label: 'Auto' },
    ]),
    responseStyleOptions: ref([
      { value: 'immersive', label: 'Immersive' },
      { value: 'natural', label: 'Natural' },
      { value: 'concise', label: 'Concise' },
    ]),
    proactiveStrategyOptions: ref([
      { value: 'on_enter_once', label: 'Once' },
      { value: 'on_every_enter_if_empty', label: 'Every empty enter' },
    ]),
    imageReferenceModeOptions: ref([
      { value: 'auto', label: 'Auto' },
      { value: 'context_only', label: 'Context' },
      { value: 'native_url', label: 'Native' },
    ]),
    ...options,
  })

afterEach(() => {
  vi.useRealTimers()
})

describe('Chat thread menu model interface', () => {
  test('opens by syncing normalized thread settings and identity drafts', () => {
    const model = createModel()

    model.toggleThreadMenu({
      prefs: {
        suggestedRepliesEnabled: true,
        contextTurns: 99,
        bilingualEnabled: true,
        secondaryLanguage: ' ko ',
        allowQuoteReply: false,
        allowSelfQuote: true,
        virtualVoiceEnabled: false,
        replyMode: 'invalid',
        replyCount: 4,
        responseStyle: 'missing',
        proactiveOpenerEnabled: true,
        proactiveOpenerStrategy: 'on_every_enter_if_empty',
        imageReferenceMode: 'native_url',
        allowImageVirtualWithoutReference: true,
        autoInvokeEnabled: true,
        autoInvokeIntervalSec: 10,
      },
      identityOverrides: {
        selfAvatar: '/me.png',
        contactAvatar: '/contact.png',
      },
    })

    expect(model.showThreadMenu.value).toBe(true)
    expect(model.threadSettingsDraft.contextTurns).toBe(20)
    expect(model.threadSettingsDraft.secondaryLanguage).toBe(' ko ')
    expect(model.threadSettingsDraft.replyMode).toBe('manual')
    expect(model.threadSettingsDraft.replyCount).toBe(3)
    expect(model.threadSettingsDraft.responseStyle).toBe('immersive')
    expect(model.threadSettingsDraft.proactiveOpenerStrategy).toBe('on_every_enter_if_empty')
    expect(model.threadSettingsDraft.imageReferenceMode).toBe('native_url')
    expect(model.threadSettingsDraft.autoInvokeIntervalSec).toBe(60)
    expect(model.threadIdentityDraft).toMatchObject({
      selfAvatar: '/me.png',
      contactAvatar: '/contact.png',
    })

    model.toggleThreadMenu()
    expect(model.showThreadMenu.value).toBe(false)
  })

  test('updates and clears identity and settings drafts without accepting unknown fields', () => {
    const model = createModel()

    model.updateThreadIdentityDraft({ key: 'selfAvatar', value: '/self.png' })
    model.updateThreadIdentityDraft({ key: 'contactAvatar', value: 42 })
    model.updateThreadIdentityDraft({ key: 'unknown', value: '/ignored.png' })
    model.updateThreadSettingsDraft({ key: 'replyCount', value: '2.9' })
    model.updateThreadSettingsDraft({ key: 'unknown', value: true })

    expect(model.createThreadIdentityPayload()).toEqual({
      selfAvatar: '/self.png',
      contactAvatar: '',
    })
    expect(model.threadSettingsDraft.replyCount).toBe('2.9')
    expect(model.threadSettingsDraft.unknown).toBeUndefined()

    model.clearThreadIdentityDraft()
    expect(model.createThreadIdentityPayload()).toEqual({
      selfAvatar: '',
      contactAvatar: '',
    })

    model.syncThreadIdentityDraft(null)
    expect(model.createThreadIdentityPayload()).toEqual({
      selfAvatar: '',
      contactAvatar: '',
    })
  })

  test('creates normalized settings payloads while preserving the automation gate', () => {
    const model = createModel()

    model.syncThreadSettingsDraft({
      suggestedRepliesEnabled: false,
      contextTurns: 2.9,
      bilingualEnabled: true,
      secondaryLanguage: '  ja  ',
      allowQuoteReply: true,
      allowSelfQuote: true,
      virtualVoiceEnabled: false,
      replyMode: 'auto',
      replyCount: 1,
      responseStyle: 'natural',
      proactiveOpenerEnabled: true,
      proactiveOpenerStrategy: 'on_enter_once',
      imageReferenceMode: 'context_only',
      allowImageVirtualWithoutReference: true,
      autoInvokeEnabled: true,
      autoInvokeIntervalSec: 900.8,
    })
    model.updateThreadSettingsDraft({ key: 'replyCount', value: '2.9' })
    model.updateThreadSettingsDraft({ key: 'imageReferenceMode', value: 'unknown' })

    expect(model.createThreadSettingsPayload({ chatAutomationEnabled: false })).toEqual({
      suggestedRepliesEnabled: false,
      contextTurns: 2,
      bilingualEnabled: true,
      secondaryLanguage: 'ja',
      allowQuoteReply: true,
      allowSelfQuote: true,
      virtualVoiceEnabled: false,
      replyMode: 'auto',
      replyCount: 2,
      responseStyle: 'natural',
      proactiveOpenerEnabled: true,
      proactiveOpenerStrategy: 'on_enter_once',
      imageReferenceMode: 'auto',
      allowImageVirtualWithoutReference: true,
      autoInvokeEnabled: false,
      autoInvokeIntervalSec: 900,
    })
    expect(model.createThreadSettingsPayload({ chatAutomationEnabled: true }).autoInvokeEnabled).toBe(true)
  })

  test('tracks saved feedback with timers and clears it on reset or disposal', () => {
    vi.useFakeTimers()
    const model = createModel({ saveFeedbackDurationMs: 1200 })

    model.triggerThreadSettingsSaved()
    model.triggerThreadIdentitySaved()

    expect(model.threadSettingsSaved.value).toBe(true)
    expect(model.threadIdentitySaved.value).toBe(true)

    vi.advanceTimersByTime(1199)
    expect(model.threadSettingsSaved.value).toBe(true)
    expect(model.threadIdentitySaved.value).toBe(true)

    vi.advanceTimersByTime(1)
    expect(model.threadSettingsSaved.value).toBe(false)
    expect(model.threadIdentitySaved.value).toBe(false)

    model.triggerThreadSettingsSaved()
    model.resetThreadMenuSavedFeedback()
    vi.advanceTimersByTime(1200)
    expect(model.threadSettingsSaved.value).toBe(false)

    model.triggerThreadIdentitySaved()
    model.disposeThreadMenuModel()
    vi.advanceTimersByTime(1200)
    expect(model.threadIdentitySaved.value).toBe(false)
  })
})
