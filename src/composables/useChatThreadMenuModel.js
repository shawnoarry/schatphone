import { reactive, ref } from 'vue'
import { DEFAULT_CHAT_THREAD_AI_PREFS } from './useChatActiveThreadModel'

const DEFAULT_LIMITS = Object.freeze({
  minContextTurns: 2,
  maxContextTurns: 20,
  minReplyCount: 1,
  maxReplyCount: 3,
  minAutoInvokeIntervalSec: 60,
  maxAutoInvokeIntervalSec: 86400,
})

const getDefaultPrefs = (defaultThreadAiPrefs) => ({
  ...DEFAULT_CHAT_THREAD_AI_PREFS,
  ...(defaultThreadAiPrefs || {}),
})

const getOptionList = (options) => {
  if (Array.isArray(options?.value)) return options.value
  if (Array.isArray(options)) return options
  return []
}

const getOptionValues = (options) =>
  getOptionList(options)
    .map((item) => (typeof item === 'string' ? item : item?.value))
    .filter((value) => typeof value === 'string' && value)

const normalizeOptionValue = (value, options, fallback) =>
  getOptionValues(options).includes(value) ? value : fallback

const clampInteger = (value, fallback, min, max) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.floor(number)))
}

const normalizeSecondaryLanguageDraft = (value, fallback) =>
  typeof value === 'string' && value ? value : fallback

const normalizeSecondaryLanguagePayload = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback || 'en'

const createInitialThreadSettingsDraft = (defaultThreadAiPrefs) => {
  const prefs = getDefaultPrefs(defaultThreadAiPrefs)
  return {
    suggestedRepliesEnabled: prefs.suggestedRepliesEnabled,
    contextTurns: prefs.contextTurns,
    bilingualEnabled: prefs.bilingualEnabled,
    secondaryLanguage: prefs.secondaryLanguage,
    allowQuoteReply: prefs.allowQuoteReply,
    allowSelfQuote: prefs.allowSelfQuote,
    virtualVoiceEnabled: prefs.virtualVoiceEnabled,
    replyMode: prefs.replyMode,
    replyCount: prefs.replyCount,
    responseStyle: prefs.responseStyle,
    proactiveOpenerEnabled: prefs.proactiveOpenerEnabled,
    proactiveOpenerStrategy: prefs.proactiveOpenerStrategy,
    imageReferenceMode: prefs.imageReferenceMode,
    allowImageVirtualWithoutReference: prefs.allowImageVirtualWithoutReference,
    autoInvokeEnabled: prefs.autoInvokeEnabled,
    autoInvokeIntervalSec: prefs.autoInvokeIntervalSec,
  }
}

export const useChatThreadMenuModel = ({
  defaultThreadAiPrefs = DEFAULT_CHAT_THREAD_AI_PREFS,
  replyModeOptions = [],
  responseStyleOptions = [],
  proactiveStrategyOptions = [],
  imageReferenceModeOptions = [],
  minContextTurns = DEFAULT_LIMITS.minContextTurns,
  maxContextTurns = DEFAULT_LIMITS.maxContextTurns,
  minReplyCount = DEFAULT_LIMITS.minReplyCount,
  maxReplyCount = DEFAULT_LIMITS.maxReplyCount,
  minAutoInvokeIntervalSec = DEFAULT_LIMITS.minAutoInvokeIntervalSec,
  maxAutoInvokeIntervalSec = DEFAULT_LIMITS.maxAutoInvokeIntervalSec,
  saveFeedbackDurationMs = 1200,
} = {}) => {
  const defaults = getDefaultPrefs(defaultThreadAiPrefs)
  const showThreadMenu = ref(false)
  const threadSettingsSaved = ref(false)
  const threadIdentitySaved = ref(false)
  const threadSettingsDraft = reactive(createInitialThreadSettingsDraft(defaults))
  const threadIdentityDraft = reactive({
    selfAvatar: '',
    contactAvatar: '',
  })

  let threadSettingsSavedTimerId = null
  let threadIdentitySavedTimerId = null

  const clearThreadSettingsSavedTimer = () => {
    if (threadSettingsSavedTimerId) clearTimeout(threadSettingsSavedTimerId)
    threadSettingsSavedTimerId = null
  }

  const clearThreadIdentitySavedTimer = () => {
    if (threadIdentitySavedTimerId) clearTimeout(threadIdentitySavedTimerId)
    threadIdentitySavedTimerId = null
  }

  const clampContextTurns = (value) =>
    clampInteger(value, defaults.contextTurns, minContextTurns, maxContextTurns)

  const clampReplyCount = (value) =>
    clampInteger(value, defaults.replyCount, minReplyCount, maxReplyCount)

  const clampAutoInvokeInterval = (value) =>
    clampInteger(
      value,
      defaults.autoInvokeIntervalSec,
      minAutoInvokeIntervalSec,
      maxAutoInvokeIntervalSec,
    )

  const normalizeReplyMode = (value) =>
    normalizeOptionValue(value, replyModeOptions, defaults.replyMode)

  const normalizeResponseStyle = (value) =>
    normalizeOptionValue(value, responseStyleOptions, defaults.responseStyle)

  const normalizeProactiveStrategy = (value) =>
    normalizeOptionValue(value, proactiveStrategyOptions, defaults.proactiveOpenerStrategy)

  const normalizeImageReferenceMode = (value) =>
    normalizeOptionValue(value, imageReferenceModeOptions, defaults.imageReferenceMode)

  const syncThreadSettingsDraft = (prefs = {}) => {
    threadSettingsDraft.suggestedRepliesEnabled = Boolean(prefs.suggestedRepliesEnabled)
    threadSettingsDraft.contextTurns = clampContextTurns(prefs.contextTurns)
    threadSettingsDraft.bilingualEnabled = Boolean(prefs.bilingualEnabled)
    threadSettingsDraft.secondaryLanguage = normalizeSecondaryLanguageDraft(
      prefs.secondaryLanguage,
      defaults.secondaryLanguage,
    )
    threadSettingsDraft.allowQuoteReply = Boolean(prefs.allowQuoteReply)
    threadSettingsDraft.allowSelfQuote = Boolean(prefs.allowSelfQuote)
    threadSettingsDraft.virtualVoiceEnabled = Boolean(prefs.virtualVoiceEnabled)
    threadSettingsDraft.replyMode = normalizeReplyMode(prefs.replyMode)
    threadSettingsDraft.replyCount = clampReplyCount(prefs.replyCount)
    threadSettingsDraft.responseStyle = normalizeResponseStyle(prefs.responseStyle)
    threadSettingsDraft.proactiveOpenerEnabled = Boolean(prefs.proactiveOpenerEnabled)
    threadSettingsDraft.proactiveOpenerStrategy = normalizeProactiveStrategy(
      prefs.proactiveOpenerStrategy,
    )
    threadSettingsDraft.imageReferenceMode = normalizeImageReferenceMode(prefs.imageReferenceMode)
    threadSettingsDraft.allowImageVirtualWithoutReference = Boolean(
      prefs.allowImageVirtualWithoutReference,
    )
    threadSettingsDraft.autoInvokeEnabled = Boolean(prefs.autoInvokeEnabled)
    threadSettingsDraft.autoInvokeIntervalSec = clampAutoInvokeInterval(prefs.autoInvokeIntervalSec)
  }

  const syncThreadIdentityDraft = (overrides = {}) => {
    threadIdentityDraft.selfAvatar = typeof overrides?.selfAvatar === 'string' ? overrides.selfAvatar : ''
    threadIdentityDraft.contactAvatar =
      typeof overrides?.contactAvatar === 'string' ? overrides.contactAvatar : ''
  }

  const closeThreadMenu = () => {
    showThreadMenu.value = false
  }

  const openThreadMenu = ({ prefs = {}, identityOverrides = {} } = {}) => {
    syncThreadSettingsDraft(prefs)
    syncThreadIdentityDraft(identityOverrides)
    showThreadMenu.value = true
  }

  const toggleThreadMenu = ({ prefs = {}, identityOverrides = {} } = {}) => {
    if (showThreadMenu.value) {
      closeThreadMenu()
      return
    }
    openThreadMenu({ prefs, identityOverrides })
  }

  const clearThreadIdentityDraft = () => {
    threadIdentityDraft.selfAvatar = ''
    threadIdentityDraft.contactAvatar = ''
  }

  const updateThreadIdentityDraft = ({ key, value } = {}) => {
    if (key !== 'selfAvatar' && key !== 'contactAvatar') return
    threadIdentityDraft[key] = typeof value === 'string' ? value : ''
  }

  const updateThreadSettingsDraft = ({ key, value } = {}) => {
    if (!Object.prototype.hasOwnProperty.call(threadSettingsDraft, key)) return
    threadSettingsDraft[key] = value
  }

  const createThreadIdentityPayload = () => ({
    selfAvatar: threadIdentityDraft.selfAvatar,
    contactAvatar: threadIdentityDraft.contactAvatar,
  })

  const createThreadSettingsPayload = ({ chatAutomationEnabled = false } = {}) => ({
    suggestedRepliesEnabled: Boolean(threadSettingsDraft.suggestedRepliesEnabled),
    contextTurns: clampContextTurns(threadSettingsDraft.contextTurns),
    bilingualEnabled: Boolean(threadSettingsDraft.bilingualEnabled),
    secondaryLanguage: normalizeSecondaryLanguagePayload(
      threadSettingsDraft.secondaryLanguage,
      defaults.secondaryLanguage,
    ),
    allowQuoteReply: Boolean(threadSettingsDraft.allowQuoteReply),
    allowSelfQuote: Boolean(threadSettingsDraft.allowSelfQuote),
    virtualVoiceEnabled: Boolean(threadSettingsDraft.virtualVoiceEnabled),
    replyMode: normalizeReplyMode(threadSettingsDraft.replyMode),
    replyCount: clampReplyCount(threadSettingsDraft.replyCount),
    responseStyle: normalizeResponseStyle(threadSettingsDraft.responseStyle),
    proactiveOpenerEnabled: Boolean(threadSettingsDraft.proactiveOpenerEnabled),
    proactiveOpenerStrategy: normalizeProactiveStrategy(threadSettingsDraft.proactiveOpenerStrategy),
    imageReferenceMode: normalizeImageReferenceMode(threadSettingsDraft.imageReferenceMode),
    allowImageVirtualWithoutReference: Boolean(threadSettingsDraft.allowImageVirtualWithoutReference),
    autoInvokeEnabled: Boolean(chatAutomationEnabled) && Boolean(threadSettingsDraft.autoInvokeEnabled),
    autoInvokeIntervalSec: clampAutoInvokeInterval(threadSettingsDraft.autoInvokeIntervalSec),
  })

  const triggerThreadSettingsSaved = () => {
    threadSettingsSaved.value = true
    clearThreadSettingsSavedTimer()
    threadSettingsSavedTimerId = setTimeout(() => {
      threadSettingsSaved.value = false
      threadSettingsSavedTimerId = null
    }, saveFeedbackDurationMs)
  }

  const triggerThreadIdentitySaved = () => {
    threadIdentitySaved.value = true
    clearThreadIdentitySavedTimer()
    threadIdentitySavedTimerId = setTimeout(() => {
      threadIdentitySaved.value = false
      threadIdentitySavedTimerId = null
    }, saveFeedbackDurationMs)
  }

  const resetThreadMenuSavedFeedback = () => {
    clearThreadSettingsSavedTimer()
    clearThreadIdentitySavedTimer()
    threadSettingsSaved.value = false
    threadIdentitySaved.value = false
  }

  const disposeThreadMenuModel = () => {
    resetThreadMenuSavedFeedback()
  }

  return {
    showThreadMenu,
    threadSettingsSaved,
    threadIdentitySaved,
    threadSettingsDraft,
    threadIdentityDraft,
    syncThreadSettingsDraft,
    syncThreadIdentityDraft,
    openThreadMenu,
    closeThreadMenu,
    toggleThreadMenu,
    clearThreadIdentityDraft,
    updateThreadIdentityDraft,
    updateThreadSettingsDraft,
    createThreadIdentityPayload,
    createThreadSettingsPayload,
    triggerThreadSettingsSaved,
    triggerThreadIdentitySaved,
    resetThreadMenuSavedFeedback,
    disposeThreadMenuModel,
  }
}
