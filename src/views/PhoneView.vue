<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  playCallAudio,
  resolveGlobalCallAudioSettings,
  stopCallAudio,
} from '../lib/call-audio'
import {
  RELATIONSHIP_FACT_SOURCE_KEYS,
  recordPhoneCallRelationshipFact,
} from '../lib/relationship-fact-adapters'
import { resolveShoppingGiftExperienceId } from '../lib/shared-experience-contract'
import { useChatStore } from '../stores/chat'
import { PHONE_CALL_DIRECTION, PHONE_INCOMING_CALL_STATUS, usePhoneStore } from '../stores/phone'
import { useSystemStore } from '../stores/system'
import { useFoodDeliveryStore } from '../stores/foodDelivery'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'
import { useShoppingStore } from '../stores/shopping'

const CALL_FILTER = Object.freeze({
  ALL: 'all',
  MISSED: 'missed',
})

const PHONE_TAB = Object.freeze({
  RECENTS: 'recents',
  CONTACTS: 'contacts',
  KEYPAD: 'keypad',
})

const CALL_SESSION_STATE = Object.freeze({
  CALLING: 'calling',
  CONNECTED: 'connected',
})

const DIAL_KEYS = Object.freeze([
  { value: '1', letters: '' },
  { value: '2', letters: 'ABC' },
  { value: '3', letters: 'DEF' },
  { value: '4', letters: 'GHI' },
  { value: '5', letters: 'JKL' },
  { value: '6', letters: 'MNO' },
  { value: '7', letters: 'PQRS' },
  { value: '8', letters: 'TUV' },
  { value: '9', letters: 'WXYZ' },
  { value: '*', letters: '' },
  { value: '0', letters: '+' },
  { value: '#', letters: '' },
])

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { confirmDialog } = useDialog()
const chatStore = useChatStore()
const phoneStore = usePhoneStore()
const systemStore = useSystemStore()
const foodDeliveryStore = useFoodDeliveryStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const shoppingStore = useShoppingStore()
const { callCount, missedCallCount, completedCallCount, recentCalls, activeSession } = storeToRefs(phoneStore)
const { settings: systemSettings } = storeToRefs(systemStore)

const callDraft = ref({
  contactId: '',
  contactName: '',
  phoneNumber: '',
  direction: PHONE_CALL_DIRECTION.OUTGOING,
  durationMinutes: '3',
  summary: '',
  sharedExperienceId: '',
})
const activeTab = ref(PHONE_TAB.RECENTS)
const activeFilter = ref(CALL_FILTER.ALL)
const contactSearch = ref('')
const dialValue = ref('')
const composerOpen = ref(false)
const selectedCall = ref(null)
const activeCall = ref(null)
const sessionElapsedSec = ref(0)
const composerSheetRef = ref(null)
const detailSheetRef = ref(null)
const activeCallRef = ref(null)
const feedback = ref('')
const feedbackType = ref('success')
let overlayReturnTarget = null
let connectTimer = null
let durationTimer = null

const callAudioSettings = computed(() =>
  resolveGlobalCallAudioSettings(systemSettings.value.appearance),
)

const playPhoneAudio = (cue, options = {}) => {
  if (!callAudioSettings.value.enabled) return null
  return playCallAudio(cue, {
    profile: callAudioSettings.value.profile,
    ...options,
  })
}

const relationshipContactOptions = computed(() =>
  chatStore.contacts
    .filter((contact) => contact.kind !== 'service' && contact.kind !== 'official')
    .map((contact) => ({
      ...contact,
      optionValue: String(contact.id),
      optionLabel: contact.name || `Contact ${contact.id}`,
    })),
)

const selectedRelationshipContact = computed(() =>
  relationshipContactOptions.value.find(
    (contact) => contact.optionValue === String(callDraft.value.contactId || ''),
  ) || null,
)

const giftRecipientMatchesContact = (recipient, contact) => {
  if (!recipient || !contact) return false
  const profileId = Number(recipient.profileId || 0)
  const contactId = Number(recipient.contactId ?? recipient.chatId ?? 0)
  if (profileId > 0 && Number(contact.profileId || 0) === profileId) return true
  if (contactId > 0 && Number(contact.id || 0) === contactId) return true
  if (profileId > 0 || contactId > 0) return false
  return Boolean(recipient.name && contact.name && recipient.name === contact.name)
}

const giftExperienceOptions = computed(() => {
  const contact = selectedRelationshipContact.value
  if (!contact || callDraft.value.direction !== PHONE_CALL_DIRECTION.INCOMING) return []
  return shoppingStore.orders
    .filter(
      (order) =>
        order.status === 'completed' &&
        giftRecipientMatchesContact(order.giftRecipient, contact),
    )
    .map((order) => ({
      experienceId: resolveShoppingGiftExperienceId(order),
      order,
      label:
        order.items?.map((item) => item.title).filter(Boolean).slice(0, 2).join(' / ') ||
        t('礼物订单', 'Gift order'),
    }))
    .filter((item) => item.experienceId)
})

const selectedGiftExperience = computed(() =>
  giftExperienceOptions.value.find(
    (item) => item.experienceId === callDraft.value.sharedExperienceId,
  ) || null,
)

watch(
  [() => callDraft.value.contactId, () => callDraft.value.direction, giftExperienceOptions],
  () => {
    if (
      callDraft.value.sharedExperienceId &&
      !giftExperienceOptions.value.some(
        (item) => item.experienceId === callDraft.value.sharedExperienceId,
      )
    ) {
      callDraft.value.sharedExperienceId = ''
    }
  },
)

const contactPhoneNumber = (contact) => {
  if (!contact) return ''
  const rememberedCall = recentCalls.value.find((call) => {
    const boundContactId = Number(call?.relationshipBinding?.contactId || 0)
    return (
      Boolean(call?.phoneNumber) &&
      (boundContactId === Number(contact.id) || call?.contactName === contact.name)
    )
  })
  if (rememberedCall?.phoneNumber) return rememberedCall.phoneNumber
  return `100${Math.max(1, Math.floor(Number(contact.id) || 1))}`
}

const visibleContacts = computed(() => {
  const query = contactSearch.value.trim().toLocaleLowerCase()
  if (!query) return relationshipContactOptions.value
  return relationshipContactOptions.value.filter((contact) =>
    [contact.name, contact.role, contactPhoneNumber(contact)]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(query)),
  )
})

const dialedContact = computed(() => {
  const normalized = normalizeDialValue(dialValue.value)
  if (!normalized) return null
  return (
    relationshipContactOptions.value.find(
      (contact) => normalizeDialValue(contactPhoneNumber(contact)) === normalized,
    ) || null
  )
})

const dialedHistoryMatch = computed(() => {
  const normalized = normalizeDialValue(dialValue.value)
  if (!normalized) return null
  return (
    recentCalls.value.find(
      (call) => normalizeDialValue(call?.phoneNumber || '') === normalized,
    ) || null
  )
})

const dialTargetLabel = computed(
  () => dialedContact.value?.name || dialedHistoryMatch.value?.contactName || '',
)

const activeCallStatusText = computed(() => {
  if (!activeCall.value) return ''
  if (activeCall.value.state === CALL_SESSION_STATE.CALLING) {
    return t('正在呼叫...', 'Calling...')
  }
  return formatConnectedDuration(sessionElapsedSec.value)
})

const filteredCalls = computed(() => {
  if (activeFilter.value === CALL_FILTER.MISSED) {
    return recentCalls.value.filter((call) => isMissedCall(call))
  }
  return recentCalls.value
})

const groupedCalls = computed(() => {
  const groups = []
  filteredCalls.value.forEach((call) => {
    const dayKey = callDayKey(call.startedAt)
    const currentGroup = groups.at(-1)
    if (currentGroup?.key === dayKey) {
      currentGroup.calls.push(call)
      return
    }
    groups.push({
      key: dayKey,
      label: formatDayLabel(call.startedAt),
      calls: [call],
    })
  })
  return groups
})

const normalizeDialValue = (value = '') =>
  String(value)
    .replace(/[^0-9*#+]/g, '')
    .slice(0, 24)

const switchTab = (tab) => {
  activeTab.value = tab
  feedback.value = ''
  if (tab !== PHONE_TAB.CONTACTS) contactSearch.value = ''
}

const appendDialKey = (key) => {
  if (dialValue.value.length >= 24) return
  dialValue.value = normalizeDialValue(`${dialValue.value}${key}`)
}

const removeDialKey = () => {
  dialValue.value = dialValue.value.slice(0, -1)
}

const clearDialValue = () => {
  dialValue.value = ''
}

const handleDialInput = (event) => {
  dialValue.value = normalizeDialValue(event?.target?.value || '')
}

const contactAvatarUrl = (contact) => {
  if (!contact) return ''
  const resolved = chatStore.resolveContactAvatar(contact.id)
  return typeof resolved === 'string' ? resolved : ''
}

const relationshipBindingForContact = (contact) =>
  contact
    ? {
        contactId: Number(contact.id) || 0,
        profileId: Number(contact.profileId || 0),
        kind: contact.kind || (contact.profileId ? 'role' : 'contact'),
        name: contact.name || '',
        sourceModule: 'chat',
        sourceId: String(contact.id),
      }
    : null

const clearSessionTimers = () => {
  if (connectTimer) window.clearTimeout(connectTimer)
  if (durationTimer) window.clearInterval(durationTimer)
  connectTimer = null
  durationTimer = null
}

const beginConnectedCall = () => {
  if (!activeCall.value) return
  stopCallAudio()
  activeCall.value.state = CALL_SESSION_STATE.CONNECTED
  playPhoneAudio('connected')
  sessionElapsedSec.value = 0
  durationTimer = window.setInterval(() => {
    sessionElapsedSec.value += 1
  }, 1000)
}

const startCall = ({ contact = null, name = '', phoneNumber = '' } = {}) => {
  const normalizedNumber = normalizeDialValue(phoneNumber)
  const resolvedContact = contact || null
  const contactName = String(resolvedContact?.name || name || normalizedNumber).trim()

  if (!contactName) {
    showFeedback('warning', t('请输入号码或选择联系人。', 'Enter a number or choose a contact.'))
    activeTab.value = PHONE_TAB.KEYPAD
    return
  }

  rememberOverlayReturnTarget()
  selectedCall.value = null
  composerOpen.value = false
  feedback.value = ''
  clearSessionTimers()
  sessionElapsedSec.value = 0
  activeCall.value = {
    contact: resolvedContact,
    contactName,
    phoneNumber: normalizedNumber || contactPhoneNumber(resolvedContact),
    startedAt: Date.now(),
    state: CALL_SESSION_STATE.CALLING,
    muted: false,
    speaker: false,
    keypadOpen: false,
    tones: '',
  }
  void focusOverlay(activeCallRef)
  playPhoneAudio('ringback', { loop: true })
  connectTimer = window.setTimeout(beginConnectedCall, 900)
}

const startDialedCall = () => {
  const phoneNumber = normalizeDialValue(dialValue.value)
  if (!phoneNumber) {
    showFeedback('warning', t('请先输入号码。', 'Enter a number first.'))
    return
  }
  const contact = dialedContact.value
  startCall({
    contact,
    name: contact?.name || dialedHistoryMatch.value?.contactName || phoneNumber,
    phoneNumber,
  })
}

const callContact = (contact) => {
  startCall({ contact, phoneNumber: contactPhoneNumber(contact) })
}

const simulateIncomingCall = (contact) => {
  if (!contact) return
  const result = phoneStore.receiveIncomingCall({
    name: contact.name,
    phoneNumber: contactPhoneNumber(contact),
    contactId: String(contact.id),
    relationshipBinding: relationshipBindingForContact(contact),
    sourceModule: 'phone_simulate',
  })
  if (!result?.ok) {
    showFeedback('warning', t('已有来电等待接听。', 'An incoming call is already ringing.'))
    return
  }
  showFeedback('success', t(`来自 ${contact.name} 的来电…`, `Incoming call from ${contact.name}…`))
}

const beginIncomingCall = (accepted) => {
  clearSessionTimers()
  sessionElapsedSec.value = 0
  const contact = accepted.participant.id
    ? relationshipContactOptions.value.find((item) => item.optionValue === accepted.participant.id) || null
    : null
  activeCall.value = {
    contact,
    contactName: accepted.participant.name,
    phoneNumber: accepted.participant.phoneNumber,
    startedAt: accepted.startedAt,
    state: CALL_SESSION_STATE.CONNECTED,
    direction: PHONE_CALL_DIRECTION.INCOMING,
    relationshipBinding: accepted.relationshipBinding,
    muted: false,
    speaker: false,
    keypadOpen: false,
    tones: '',
  }
  beginConnectedCall()
  void focusOverlay(activeCallRef)
}

watch(
  () => phoneStore.incomingCall,
  (incoming) => {
    if (incoming?.status !== PHONE_INCOMING_CALL_STATUS.ACCEPTED) return
    const accepted = phoneStore.consumeAcceptedIncomingCall()
    if (!accepted) return
    beginIncomingCall(accepted)
  },
  { immediate: true },
)

const callFromHistory = (call) => {
  if (!call) return
  startCall({
    contact: contactForCall(call),
    name: call.contactName,
    phoneNumber: call.phoneNumber || contactPhoneNumber(contactForCall(call)),
  })
}

const appendCallTone = (key) => {
  if (!activeCall.value || activeCall.value.tones.length >= 24) return
  activeCall.value.tones += key
  playPhoneAudio('dtmf', { key })
}

const toggleCallControl = (control) => {
  if (!activeCall.value) return
  activeCall.value[control] = !activeCall.value[control]
}

const saveCompletedSession = () => {
  if (!activeCall.value) return null
  const target = activeCall.value.contact
  const wasConnected = activeCall.value.state === CALL_SESSION_STATE.CONNECTED
  const direction = activeCall.value.direction || PHONE_CALL_DIRECTION.OUTGOING
  const call = phoneStore.addCallLog({
    contactName: activeCall.value.contactName,
    phoneNumber: activeCall.value.phoneNumber,
    direction,
    status: wasConnected ? 'completed' : 'failed',
    durationSec: wasConnected ? sessionElapsedSec.value : 0,
    summary: wasConnected
      ? activeCall.value.tones
        ? t(`通话中输入：${activeCall.value.tones}`, `Keypad input: ${activeCall.value.tones}`)
        : direction === PHONE_CALL_DIRECTION.INCOMING
          ? t('接听的来电。', 'Answered incoming call.')
          : ''
      : t('呼叫在接通前结束。', 'Call ended before connecting.'),
    sourceModule: direction === PHONE_CALL_DIRECTION.INCOMING ? 'phone_session_incoming' : 'phone_session',
    relationshipBinding: activeCall.value.relationshipBinding || relationshipBindingForContact(target),
    startedAt: activeCall.value.startedAt,
  })
  if (wasConnected && target && call) {
    recordPhoneCallRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      call,
      target,
    })
  }
  return call
}

const endCall = () => {
  if (!activeCall.value) return
  const savedCall = saveCompletedSession()
  clearSessionTimers()
  stopCallAudio()
  playPhoneAudio('call-ended')
  activeCall.value = null
  dialValue.value = ''
  activeFilter.value = CALL_FILTER.ALL
  activeTab.value = PHONE_TAB.RECENTS
  showFeedback(
    savedCall ? 'success' : 'warning',
    savedCall
      ? t('通话已结束并保存到最近通话。', 'Call ended and was saved to Recents.')
      : t('通话未能保存。', 'The call could not be saved.'),
  )
  void restoreOverlayFocus()
}

const formatConnectedDuration = (seconds) => {
  const value = Math.max(0, Math.floor(Number(seconds) || 0))
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const remainingSeconds = value % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const showFeedback = (type, message) => {
  feedbackType.value = type
  feedback.value = message
}

const resetCallDraft = () => {
  callDraft.value = {
    contactId: '',
    contactName: '',
    phoneNumber: '',
    direction: PHONE_CALL_DIRECTION.OUTGOING,
    durationMinutes: '3',
    summary: '',
    sharedExperienceId: '',
  }
}

const rememberOverlayReturnTarget = () => {
  overlayReturnTarget =
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
}

const focusOverlay = async (targetRef) => {
  await nextTick()
  targetRef.value?.focus()
}

const restoreOverlayFocus = async () => {
  await nextTick()
  overlayReturnTarget?.focus?.()
  overlayReturnTarget = null
}

const openComposer = () => {
  rememberOverlayReturnTarget()
  selectedCall.value = null
  feedback.value = ''
  composerOpen.value = true
  void focusOverlay(composerSheetRef)
}

const closeComposer = ({ preserveFeedback = false } = {}) => {
  composerOpen.value = false
  resetCallDraft()
  if (!preserveFeedback) feedback.value = ''
  void restoreOverlayFocus()
}

const openCallDetail = (call) => {
  rememberOverlayReturnTarget()
  selectedCall.value = call
  void focusOverlay(detailSheetRef)
}

const closeCallDetail = () => {
  selectedCall.value = null
  void restoreOverlayFocus()
}

const isMissedCall = (call) =>
  call?.direction === PHONE_CALL_DIRECTION.MISSED || call?.status === 'missed'

const callDayKey = (timestamp) => {
  const date = new Date(Number(timestamp) || 0)
  return Number.isNaN(date.getTime()) ? 'unknown' : date.toDateString()
}

const startOfLocalDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

const formatDayLabel = (timestamp) => {
  const date = new Date(Number(timestamp) || 0)
  if (Number.isNaN(date.getTime())) return t('未知日期', 'Unknown date')
  const dayDifference = Math.round((startOfLocalDay(new Date()) - startOfLocalDay(date)) / 86400000)
  if (dayDifference === 0) return t('今天', 'Today')
  if (dayDifference === 1) return t('昨天', 'Yesterday')
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

const formatCallTime = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return t('未知时间', 'Unknown time')
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const formatFullTime = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return t('未知时间', 'Unknown time')
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDuration = (durationSec) => {
  const value = Math.max(0, Math.floor(Number(durationSec) || 0))
  if (value <= 0) return t('未接通', 'Not connected')
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const directionLabel = (call) => {
  if (call?.status === 'declined') return t('已拒接', 'Declined')
  if (call?.status === 'failed') return t('呼叫失败', 'Failed')
  if (isMissedCall(call)) return t('未接来电', 'Missed call')
  if (call?.direction === PHONE_CALL_DIRECTION.INCOMING) return t('来电', 'Incoming')
  return t('去电', 'Outgoing')
}

const directionIconClass = (call) => {
  if (isMissedCall(call) || call?.status === 'declined') return 'fas fa-phone-slash'
  if (call?.status === 'failed') return 'fas fa-triangle-exclamation'
  if (call?.direction === PHONE_CALL_DIRECTION.INCOMING) return 'fas fa-arrow-down'
  return 'fas fa-arrow-up'
}

const directionToneClass = (call) => {
  if (isMissedCall(call) || call?.status === 'declined' || call?.status === 'failed') return 'is-missed'
  if (call?.direction === PHONE_CALL_DIRECTION.INCOMING) return 'is-incoming'
  return 'is-outgoing'
}

const callMetaText = (call) => {
  const label = directionLabel(call)
  if (isMissedCall(call) || call?.status === 'declined' || call?.status === 'failed') return label
  return `${label} · ${formatDuration(call?.durationSec)}`
}

const callInitials = (name = '') => {
  const words = String(name).trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return words.slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase()
  return Array.from(words[0] || '?').slice(0, 2).join('').toUpperCase()
}

const avatarToneClass = (name = '') => {
  const value = Array.from(String(name)).reduce((total, char) => total + char.codePointAt(0), 0)
  return `is-tone-${value % 4}`
}

const contactForCall = (call) => {
  const contactId = Number(call?.relationshipBinding?.contactId || 0)
  if (contactId > 0) {
    const byId = relationshipContactOptions.value.find((contact) => Number(contact.id) === contactId)
    if (byId) return byId
  }
  return relationshipContactOptions.value.find((contact) => contact.name === call?.contactName) || null
}

const callAvatarUrl = (call) => {
  const contact = contactForCall(call)
  return contactAvatarUrl(contact)
}

const hideBrokenAvatar = (event) => {
  if (event?.currentTarget) event.currentTarget.hidden = true
}

const submitCallLog = () => {
  const direction = callDraft.value.direction
  const relationshipTarget = selectedRelationshipContact.value
  const contactName = relationshipTarget?.name || callDraft.value.contactName
  const relationshipBinding = relationshipBindingForContact(relationshipTarget)
  const giftExperience = selectedGiftExperience.value
  const created =
    direction === PHONE_CALL_DIRECTION.MISSED
      ? phoneStore.addMissedCallWithNotification({
          contactName,
          phoneNumber: callDraft.value.phoneNumber || contactPhoneNumber(relationshipTarget),
          summary: callDraft.value.summary,
          relationshipBinding,
        })
      : phoneStore.addRoleCallLog({
          contactName,
          phoneNumber: callDraft.value.phoneNumber || contactPhoneNumber(relationshipTarget),
          direction,
          durationMinutes: callDraft.value.durationMinutes,
          summary: callDraft.value.summary,
          relationshipBinding,
          sharedExperienceId: giftExperience?.experienceId || '',
        })

  if (!created) {
    showFeedback('warning', t('请填写联系人姓名。', 'Enter a contact name.'))
    return
  }

  const call = created?.call || created
  if (relationshipTarget && call) {
    recordPhoneCallRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      call,
      target: relationshipTarget,
      giftOrder: giftExperience?.order || null,
    })
  }

  showFeedback(
    'success',
    direction === PHONE_CALL_DIRECTION.MISSED
      ? t('未接来电已记录，并加入回拨提醒。', 'Missed call recorded with a callback reminder.')
      : t('通话记录已保存。', 'Call saved.'),
  )
  activeFilter.value = CALL_FILTER.ALL
  closeComposer({ preserveFeedback: true })
}

const requestRemoveCall = async (call) => {
  if (!call) return
  const confirmed = await confirmDialog({
    title: t('删除这条通话记录？', 'Delete this call?'),
    message: t(
      `与 ${call.contactName} 的这条记录将从通话历史中移除。`,
      `This call with ${call.contactName} will be removed from call history.`,
    ),
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed || !phoneStore.removeCallLog(call.id)) return

  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.PHONE_CALL,
    call.id,
  )
  selectedCall.value = null
  showFeedback('success', t('通话记录已删除。', 'Call removed.'))
  void restoreOverlayFocus()
}

const foodCallMessageDraft = ref('')
const foodCallContext = computed(() => {
  if (route.query.source !== 'food_delivery' || typeof route.query.orderId !== 'string') return null
  return foodDeliveryStore.getOrderCallContext(route.query.orderId)
})
const isFoodDeliveryCall = computed(
  () =>
    route.query.source === 'food_delivery' ||
    activeSession.value?.sourceModule === 'food_delivery',
)

const startFoodDeliveryCall = () => {
  const context = foodCallContext.value
  if (!context) return
  const result = phoneStore.startCallSession({
    participant: {
      ...context.courier,
      name: context.courier?.name === 'Food Delivery rider'
        ? t('外卖配送员', 'Food Delivery rider')
        : context.courier?.name,
    },
    sourceModule: 'food_delivery',
    sourceId: context.orderId,
    orderId: context.orderId,
    conversationId: context.conversationId,
    journeyId: foodDeliveryStore.findOrderById(context.orderId)?.deliveryJourneyId || '',
    serviceCaseId: context.serviceCaseId,
    eventInstanceId: context.eventInstanceId,
    destinationAnchorId: context.requestedDestination?.id || '',
  })
  if (result?.ok && result.session?.id) {
    foodDeliveryStore.recordPhoneCallLifecycleFacts({
      orderId: context.orderId,
      sessionId: result.session.id,
      now: Date.now(),
    })
  }
}

const sendFoodCallMessage = () => {
  const text = foodCallMessageDraft.value.trim()
  if (!text) return
  const result = phoneStore.sendCallText({ text, now: Date.now() })
  if (result?.ok && result.proposal) {
    foodDeliveryStore.recordPhoneInteractionResolution({
      orderId: activeSession.value?.orderId,
      sessionId: activeSession.value?.id,
      now: Date.now(),
    })
  }
  foodCallMessageDraft.value = ''
}

const endFoodDeliveryCall = () => {
  const result = phoneStore.endCallSession({ now: Date.now() })
  stopCallAudio()
  playPhoneAudio('call-ended')
  const orderId = result?.session?.orderId || route.query.orderId
  phoneStore.clearCallSession()
  if (orderId) {
    router.replace({ path: '/food-delivery', query: { orderId, conversation: '1' } })
  }
}

onBeforeUnmount(() => {
  clearSessionTimers()
  stopCallAudio()
})
onMounted(() => {
  if (route.query.source === 'food_delivery') {
    startFoodDeliveryCall()
    playPhoneAudio('connected')
  }
})
</script>

<template>
  <div class="phone-app">
    <header class="phone-header">
      <div class="phone-header__inner">
        <button type="button" class="phone-back" @click="goHome">
          <i class="fas fa-chevron-left" aria-hidden="true"></i>
          <span>{{ t('首页', 'Home') }}</span>
        </button>
        <h1>{{ t('电话', 'Phone') }}</h1>
        <button
          type="button"
          class="phone-add"
          :aria-label="t('记录通话', 'Record a call')"
          :title="t('记录通话', 'Record a call')"
          data-testid="phone-open-composer"
          @click="openComposer"
        >
          <i class="fas fa-plus" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <main class="phone-scroll no-scrollbar">
      <div class="phone-content">
        <section v-if="isFoodDeliveryCall" class="phone-food-call" data-testid="phone-food-delivery-call">
          <div class="phone-food-call__head">
            <div><p class="phone-kicker">{{ t('外卖配送通话', 'Food Delivery call') }}</p><h2>{{ activeSession?.participant?.name || t('配送员', 'Delivery rider') }}</h2><p>{{ activeSession?.participant?.phoneNumber }}</p></div>
            <span class="phone-food-call__live">{{ t('通话中', 'LIVE') }}</span>
          </div>
          <div class="phone-food-call__transcript" data-testid="phone-food-delivery-transcript">
            <div v-for="turn in activeSession?.turns || []" :key="turn.id" class="phone-food-call__turn" :class="`is-${turn.speaker}`">
              <small>{{ turn.speaker === 'user' ? t('你', 'You') : t('配送员', 'Rider') }}</small><p>{{ turn.text }}</p>
            </div>
          </div>
          <div class="phone-food-call__composer">
            <textarea v-model="foodCallMessageDraft" rows="2" data-testid="phone-food-delivery-input" :placeholder="t('用文字与配送员通话……', 'Speak to the rider in text…')"></textarea>
            <button type="button" data-testid="phone-food-delivery-send" @click="sendFoodCallMessage">{{ t('发送', 'Send') }}</button>
          </div>
          <p v-if="activeSession?.resolutionProposal?.outcomeCode === 'accepted_new_destination'" class="phone-food-call__proposal" data-testid="phone-food-delivery-proposal">
            {{ t('配送员已同意改址，外卖正在核验订单与 Map 路线。', 'The rider agreed to the address change. Food Delivery is validating the order and Map route.') }}
          </p>
          <div class="phone-food-call__actions">
            <button type="button" class="is-end" data-testid="phone-food-delivery-hangup" @click="endFoodDeliveryCall">{{ t('挂断并返回订单', 'Hang up and return to order') }}</button>
          </div>
        </section>
        <p
          v-if="feedback"
          class="phone-feedback"
          :class="feedbackType === 'warning' ? 'is-warning' : 'is-success'"
          role="status"
          data-testid="phone-feedback"
        >
          <i
            :class="feedbackType === 'warning' ? 'fas fa-circle-exclamation' : 'fas fa-circle-check'"
            aria-hidden="true"
          ></i>
          <span>{{ feedback }}</span>
        </p>

        <section v-if="activeTab === PHONE_TAB.RECENTS" data-testid="phone-recents-view">
          <div class="phone-overview" aria-labelledby="phone-history-title">
            <div>
              <p class="phone-kicker">{{ t('通话历史', 'Call history') }}</p>
              <h2 id="phone-history-title">{{ t('最近通话', 'Recents') }}</h2>
            </div>
            <p class="phone-summary">
              {{ t(`${callCount} 条记录`, `${callCount} calls`) }}
              <span aria-hidden="true">·</span>
              {{ t(`${completedCallCount} 条已接通`, `${completedCallCount} completed`) }}
            </p>
          </div>

          <div class="phone-filter" role="group" :aria-label="t('筛选通话记录', 'Filter calls')">
            <button
              type="button"
              :class="{ 'is-active': activeFilter === CALL_FILTER.ALL }"
              :aria-pressed="activeFilter === CALL_FILTER.ALL"
              data-testid="phone-filter-all"
              @click="activeFilter = CALL_FILTER.ALL"
            >
              {{ t('全部', 'All') }}
              <span>{{ callCount }}</span>
            </button>
            <button
              type="button"
              :class="{ 'is-active': activeFilter === CALL_FILTER.MISSED }"
              :aria-pressed="activeFilter === CALL_FILTER.MISSED"
              data-testid="phone-filter-missed"
              @click="activeFilter = CALL_FILTER.MISSED"
            >
              {{ t('未接', 'Missed') }}
              <span>{{ missedCallCount }}</span>
            </button>
          </div>

          <div v-if="groupedCalls.length > 0" class="phone-call-days" data-testid="phone-call-list">
            <section v-for="group in groupedCalls" :key="group.key" class="phone-call-day">
              <h3>{{ group.label }}</h3>
              <div class="phone-call-group">
                <article
                  v-for="call in group.calls"
                  :key="call.id"
                  class="phone-call-row"
                  :class="{ 'is-missed': isMissedCall(call) }"
                >
                  <button
                    type="button"
                    class="phone-call-main"
                    :aria-label="`${call.contactName}, ${directionLabel(call)}, ${formatCallTime(call.startedAt)}`"
                    :data-testid="`phone-call-${call.id}`"
                    @click="openCallDetail(call)"
                  >
                    <span class="phone-avatar" :class="avatarToneClass(call.contactName)" aria-hidden="true">
                      <span>{{ callInitials(call.contactName) }}</span>
                      <img
                        v-if="callAvatarUrl(call)"
                        :src="callAvatarUrl(call)"
                        alt=""
                        @error="hideBrokenAvatar"
                      />
                      <span class="phone-direction" :class="directionToneClass(call)">
                        <i :class="directionIconClass(call)"></i>
                      </span>
                    </span>
                    <span class="phone-call-copy">
                      <strong>{{ call.contactName }}</strong>
                      <small>{{ callMetaText(call) }}</small>
                      <span v-if="call.phoneNumber || call.summary">{{ call.phoneNumber || call.summary }}</span>
                    </span>
                    <time :datetime="new Date(call.startedAt).toISOString()">{{ formatCallTime(call.startedAt) }}</time>
                  </button>
                  <button
                    type="button"
                    class="phone-row-call"
                    :aria-label="t(`回拨 ${call.contactName}`, `Call ${call.contactName}`)"
                    :title="t('回拨', 'Call back')"
                    :data-testid="`phone-redial-${call.id}`"
                    @click="callFromHistory(call)"
                  >
                    <i class="fas fa-phone" aria-hidden="true"></i>
                  </button>
                </article>
              </div>
            </section>
          </div>

          <section v-else class="phone-empty" data-testid="phone-empty-state">
            <span aria-hidden="true">
              <i :class="activeFilter === CALL_FILTER.MISSED ? 'fas fa-phone-slash' : 'fas fa-clock-rotate-left'"></i>
            </span>
            <h2>
              {{
                activeFilter === CALL_FILTER.MISSED
                  ? t('没有未接来电', 'No missed calls')
                  : t('还没有通话记录', 'No calls yet')
              }}
            </h2>
            <p>
              {{
                activeFilter === CALL_FILTER.MISSED
                  ? t('未接来电会集中显示在这里。', 'Missed calls will appear here.')
                  : t('从拨号键盘或联系人发起第一次通话。', 'Start your first call from Keypad or Contacts.')
              }}
            </p>
            <button
              v-if="activeFilter === CALL_FILTER.ALL"
              type="button"
              data-testid="phone-empty-add"
              @click="switchTab(PHONE_TAB.KEYPAD)"
            >
              <i class="fas fa-grip" aria-hidden="true"></i>
              {{ t('打开拨号键盘', 'Open keypad') }}
            </button>
          </section>
        </section>

        <section v-else-if="activeTab === PHONE_TAB.CONTACTS" class="phone-contacts" data-testid="phone-contacts-view">
          <div class="phone-overview">
            <div>
              <p class="phone-kicker">{{ t('快速呼叫', 'Quick call') }}</p>
              <h2>{{ t('联系人', 'Contacts') }}</h2>
            </div>
            <p class="phone-summary">{{ t(`${relationshipContactOptions.length} 位`, `${relationshipContactOptions.length} people`) }}</p>
          </div>

          <label class="phone-search">
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <input
              v-model="contactSearch"
              type="search"
              :placeholder="t('搜索姓名或号码', 'Search name or number')"
              :aria-label="t('搜索联系人', 'Search contacts')"
              data-testid="phone-contact-search"
            />
          </label>

          <div v-if="visibleContacts.length" class="phone-contact-list">
            <article v-for="contact in visibleContacts" :key="contact.id" class="phone-contact-row">
              <span class="phone-avatar" :class="avatarToneClass(contact.name)" aria-hidden="true">
                <span>{{ callInitials(contact.name) }}</span>
                <img
                  v-if="contactAvatarUrl(contact)"
                  :src="contactAvatarUrl(contact)"
                  alt=""
                  @error="hideBrokenAvatar"
                />
              </span>
              <span class="phone-contact-copy">
                <strong>{{ contact.name }}</strong>
                <small>{{ contactPhoneNumber(contact) }}<template v-if="contact.role"> · {{ contact.role }}</template></small>
              </span>
              <span class="phone-contact-actions">
                <button
                  type="button"
                  class="is-incoming"
                  :aria-label="t(`模拟 ${contact.name} 来电`, `Simulate incoming call from ${contact.name}`)"
                  :title="t('模拟来电', 'Simulate incoming call')"
                  :data-testid="`phone-incoming-contact-${contact.id}`"
                  @click="simulateIncomingCall(contact)"
                >
                  <i class="fas fa-phone-arrow-down-left" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  :aria-label="t(`呼叫 ${contact.name}`, `Call ${contact.name}`)"
                  :title="t('呼叫', 'Call')"
                  :data-testid="`phone-call-contact-${contact.id}`"
                  @click="callContact(contact)"
                >
                  <i class="fas fa-phone" aria-hidden="true"></i>
                </button>
              </span>
            </article>
          </div>

          <section v-else class="phone-empty is-compact">
            <span aria-hidden="true"><i class="fas fa-user-slash"></i></span>
            <h2>{{ t('没有匹配的联系人', 'No contacts found') }}</h2>
            <p>{{ t('换一个姓名或号码试试。', 'Try another name or number.') }}</p>
          </section>
        </section>

        <section v-else class="phone-keypad-view" data-testid="phone-keypad-view">
          <div class="phone-keypad-heading">
            <p>{{ dialTargetLabel || t('输入号码', 'Enter a number') }}</p>
            <div class="phone-number-line">
              <input
                :value="dialValue"
                type="tel"
                inputmode="tel"
                autocomplete="off"
                maxlength="24"
                :placeholder="t('电话号码', 'Phone number')"
                :aria-label="t('电话号码', 'Phone number')"
                data-testid="phone-dial-input"
                @input="handleDialInput"
              />
              <button
                type="button"
                :class="{ 'is-visible': dialValue }"
                :aria-label="t('删除一位', 'Delete digit')"
                :title="t('删除一位', 'Delete digit')"
                data-testid="phone-dial-delete"
                @click="removeDialKey"
              >
                <i class="fas fa-delete-left" aria-hidden="true"></i>
              </button>
            </div>
            <button v-if="dialValue" type="button" class="phone-clear-number" @click="clearDialValue">
              {{ t('清除', 'Clear') }}
            </button>
          </div>

          <div class="phone-keypad" :aria-label="t('拨号键盘', 'Dial pad')">
            <button
              v-for="key in DIAL_KEYS"
              :key="key.value"
              type="button"
              :aria-label="key.value"
              :data-testid="`phone-key-${key.value}`"
              @click="appendDialKey(key.value)"
            >
              <strong>{{ key.value }}</strong>
              <small>{{ key.letters || '\u00a0' }}</small>
            </button>
          </div>

          <button
            type="button"
            class="phone-call-button"
            :aria-label="t('拨打电话', 'Place call')"
            data-testid="phone-place-call"
            @click="startDialedCall"
          >
            <i class="fas fa-phone" aria-hidden="true"></i>
          </button>
        </section>
      </div>
    </main>

    <nav class="phone-tabbar" :aria-label="t('电话导航', 'Phone navigation')">
      <button
        v-for="tab in [
          { id: PHONE_TAB.RECENTS, icon: 'fas fa-clock-rotate-left', label: t('最近通话', 'Recents') },
          { id: PHONE_TAB.CONTACTS, icon: 'fas fa-user-group', label: t('联系人', 'Contacts') },
          { id: PHONE_TAB.KEYPAD, icon: 'fas fa-grip', label: t('拨号键盘', 'Keypad') },
        ]"
        :key="tab.id"
        type="button"
        :class="{ 'is-active': activeTab === tab.id }"
        :aria-current="activeTab === tab.id ? 'page' : undefined"
        :data-testid="`phone-tab-${tab.id}`"
        @click="switchTab(tab.id)"
      >
        <i :class="tab.icon" aria-hidden="true"></i>
        <span>{{ tab.label }}</span>
        <b v-if="tab.id === PHONE_TAB.RECENTS && missedCallCount > 0">{{ missedCallCount }}</b>
      </button>
    </nav>

    <Transition name="phone-sheet">
      <div
        v-if="composerOpen"
        class="phone-sheet-backdrop"
        data-testid="phone-composer-backdrop"
        @click.self="closeComposer()"
      >
        <form
          ref="composerSheetRef"
          class="phone-sheet phone-composer"
          role="dialog"
          aria-modal="true"
          :aria-label="t('记录通话', 'Record a call')"
          data-testid="phone-composer-sheet"
          tabindex="-1"
          @submit.prevent="submitCallLog"
          @keydown.esc="closeComposer()"
        >
          <div class="phone-sheet-handle" aria-hidden="true"></div>
          <header class="phone-sheet-head">
            <div>
              <p>{{ t('新记录', 'New entry') }}</p>
              <h2>{{ t('记录通话', 'Record a call') }}</h2>
            </div>
            <button
              type="button"
              :aria-label="t('关闭', 'Close')"
              :title="t('关闭', 'Close')"
              @click="closeComposer()"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </header>

          <div class="phone-form-scroll no-scrollbar">
            <fieldset class="phone-fieldset">
              <legend>{{ t('通话类型', 'Call type') }}</legend>
              <div class="phone-direction-picker">
                <button
                  type="button"
                  :class="{ 'is-active': callDraft.direction === PHONE_CALL_DIRECTION.OUTGOING }"
                  :aria-pressed="callDraft.direction === PHONE_CALL_DIRECTION.OUTGOING"
                  data-testid="phone-direction-outgoing"
                  @click="callDraft.direction = PHONE_CALL_DIRECTION.OUTGOING"
                >
                  <i class="fas fa-arrow-up" aria-hidden="true"></i>
                  {{ t('去电', 'Outgoing') }}
                </button>
                <button
                  type="button"
                  :class="{ 'is-active': callDraft.direction === PHONE_CALL_DIRECTION.INCOMING }"
                  :aria-pressed="callDraft.direction === PHONE_CALL_DIRECTION.INCOMING"
                  data-testid="phone-direction-incoming"
                  @click="callDraft.direction = PHONE_CALL_DIRECTION.INCOMING"
                >
                  <i class="fas fa-arrow-down" aria-hidden="true"></i>
                  {{ t('来电', 'Incoming') }}
                </button>
                <button
                  type="button"
                  class="is-missed-choice"
                  :class="{ 'is-active': callDraft.direction === PHONE_CALL_DIRECTION.MISSED }"
                  :aria-pressed="callDraft.direction === PHONE_CALL_DIRECTION.MISSED"
                  data-testid="phone-direction-missed"
                  @click="callDraft.direction = PHONE_CALL_DIRECTION.MISSED"
                >
                  <i class="fas fa-phone-slash" aria-hidden="true"></i>
                  {{ t('未接', 'Missed') }}
                </button>
              </div>
            </fieldset>

            <label class="phone-field">
              <span>{{ t('聊天联系人', 'Chat contact') }}</span>
              <span class="phone-select-wrap">
                <select v-model="callDraft.contactId" data-testid="phone-relationship-contact">
                  <option value="">{{ t('不关联聊天联系人', 'No Chat contact') }}</option>
                  <option
                    v-for="contact in relationshipContactOptions"
                    :key="contact.id"
                    :value="contact.optionValue"
                  >
                    {{ contact.optionLabel }}
                  </option>
                </select>
                <i class="fas fa-chevron-down" aria-hidden="true"></i>
              </span>
            </label>

            <div v-if="selectedRelationshipContact" class="phone-selected-contact">
              <span :class="avatarToneClass(selectedRelationshipContact.name)" aria-hidden="true">
                {{ callInitials(selectedRelationshipContact.name) }}
              </span>
              <div>
                <strong>{{ selectedRelationshipContact.name }}</strong>
                <small>{{ t('将关联到联系人关系记录', 'Linked to contact history') }}</small>
              </div>
              <i class="fas fa-link" aria-hidden="true"></i>
            </div>

            <label v-else class="phone-field">
              <span>{{ t('联系人姓名', 'Contact name') }}</span>
              <input
                v-model="callDraft.contactName"
                type="text"
                maxlength="80"
                autocomplete="off"
                data-testid="phone-contact-name"
                :placeholder="t('输入姓名', 'Enter a name')"
              />
            </label>

            <label class="phone-field">
              <span>{{ t('电话号码', 'Phone number') }} <small>{{ t('选填', 'Optional') }}</small></span>
              <input
                v-model="callDraft.phoneNumber"
                type="tel"
                inputmode="tel"
                maxlength="40"
                autocomplete="off"
                data-testid="phone-call-number"
                :placeholder="selectedRelationshipContact ? contactPhoneNumber(selectedRelationshipContact) : t('输入号码', 'Enter a number')"
              />
            </label>

            <label v-if="callDraft.direction !== PHONE_CALL_DIRECTION.MISSED" class="phone-field">
              <span>{{ t('通话时长', 'Duration') }}</span>
              <span class="phone-duration-input">
                <input
                  v-model="callDraft.durationMinutes"
                  type="number"
                  min="0"
                  max="1440"
                  step="1"
                  data-testid="phone-duration"
                  :aria-label="t('通话分钟数', 'Call duration in minutes')"
                />
                <small>{{ t('分钟', 'min') }}</small>
              </span>
            </label>

            <label
              v-if="giftExperienceOptions.length > 0"
              class="phone-field"
              data-testid="phone-gift-experience-field"
            >
              <span>{{ t('礼物反馈', 'Gift feedback') }} <small>{{ t('选填', 'Optional') }}</small></span>
              <span class="phone-select-wrap">
                <select
                  v-model="callDraft.sharedExperienceId"
                  data-testid="phone-gift-experience"
                >
                  <option value="">{{ t('不关联礼物', 'No gift') }}</option>
                  <option
                    v-for="item in giftExperienceOptions"
                    :key="item.experienceId"
                    :value="item.experienceId"
                  >
                    {{ item.label }}
                  </option>
                </select>
                <i class="fas fa-chevron-down" aria-hidden="true"></i>
              </span>
            </label>

            <label class="phone-field">
              <span>{{ t('通话备注', 'Call note') }} <small>{{ t('选填', 'Optional') }}</small></span>
              <textarea
                v-model="callDraft.summary"
                rows="3"
                maxlength="240"
                data-testid="phone-summary"
                :placeholder="t('记下需要跟进的内容', 'Add anything to follow up')"
              ></textarea>
            </label>

            <p
              v-if="feedback && feedbackType === 'warning'"
              class="phone-form-warning"
              role="alert"
            >
              <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
              {{ feedback }}
            </p>

            <p class="phone-call-boundary">
              <i class="fas fa-mobile-screen-button" aria-hidden="true"></i>
              <span>{{ t('这里只记录本地通话历史，不会拨打真实电话。', 'This records local call history and does not place a real call.') }}</span>
            </p>
          </div>

          <footer class="phone-sheet-actions">
            <button type="button" class="phone-sheet-cancel" @click="closeComposer()">
              {{ t('取消', 'Cancel') }}
            </button>
            <button type="submit" class="phone-sheet-save" data-testid="phone-save-call">
              <i class="fas fa-check" aria-hidden="true"></i>
              {{ t('保存记录', 'Save call') }}
            </button>
          </footer>
        </form>
      </div>
    </Transition>

    <Transition name="phone-sheet">
      <div
        v-if="selectedCall"
        class="phone-sheet-backdrop"
        data-testid="phone-detail-backdrop"
        @click.self="closeCallDetail"
      >
        <section
          ref="detailSheetRef"
          class="phone-sheet phone-detail"
          role="dialog"
          aria-modal="true"
          :aria-label="t('通话详情', 'Call details')"
          data-testid="phone-detail-sheet"
          tabindex="-1"
          @keydown.esc="closeCallDetail"
        >
          <div class="phone-sheet-handle" aria-hidden="true"></div>
          <header class="phone-sheet-head">
            <div>
              <p>{{ t('通话详情', 'Call details') }}</p>
              <h2>{{ selectedCall.contactName }}</h2>
            </div>
            <button
              type="button"
              :aria-label="t('关闭', 'Close')"
              :title="t('关闭', 'Close')"
              @click="closeCallDetail"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </header>

          <div class="phone-detail-identity">
            <span class="phone-avatar is-large" :class="avatarToneClass(selectedCall.contactName)" aria-hidden="true">
              <span>{{ callInitials(selectedCall.contactName) }}</span>
              <img
                v-if="callAvatarUrl(selectedCall)"
                :src="callAvatarUrl(selectedCall)"
                alt=""
                @error="hideBrokenAvatar"
              />
            </span>
            <strong>{{ selectedCall.contactName }}</strong>
            <span :class="{ 'is-missed': isMissedCall(selectedCall) }">
              <i :class="directionIconClass(selectedCall)" aria-hidden="true"></i>
              {{ directionLabel(selectedCall) }}
            </span>
          </div>

          <button
            type="button"
            class="phone-detail-call"
            :aria-label="t(`呼叫 ${selectedCall.contactName}`, `Call ${selectedCall.contactName}`)"
            data-testid="phone-detail-call"
            @click="callFromHistory(selectedCall)"
          >
            <i class="fas fa-phone" aria-hidden="true"></i>
            {{ t('呼叫', 'Call') }}
          </button>

          <dl class="phone-detail-list">
            <div>
              <dt>{{ t('时间', 'Time') }}</dt>
              <dd>{{ formatFullTime(selectedCall.startedAt) }}</dd>
            </div>
            <div>
              <dt>{{ t('时长', 'Duration') }}</dt>
              <dd>{{ formatDuration(selectedCall.durationSec) }}</dd>
            </div>
            <div v-if="selectedCall.phoneNumber">
              <dt>{{ t('号码', 'Number') }}</dt>
              <dd>{{ selectedCall.phoneNumber }}</dd>
            </div>
            <div v-if="selectedCall.summary">
              <dt>{{ t('备注', 'Note') }}</dt>
              <dd>{{ selectedCall.summary }}</dd>
            </div>
            <div v-if="selectedCall.sharedExperienceId">
              <dt>{{ t('礼物经历', 'Gift experience') }}</dt>
              <dd>{{ t('已关联到同一份礼物', 'Linked to the same gift') }}</dd>
            </div>
          </dl>

          <button
            type="button"
            class="phone-delete-call"
            :data-testid="`phone-remove-call-${selectedCall.id}`"
            @click="requestRemoveCall(selectedCall)"
          >
            <i class="fas fa-trash-can" aria-hidden="true"></i>
            {{ t('删除通话记录', 'Delete call') }}
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="phone-call">
      <div v-if="activeCall" class="phone-active-call" data-testid="phone-active-call">
        <section
          ref="activeCallRef"
          class="phone-active-call__inner"
          role="dialog"
          aria-modal="true"
          :aria-label="t(`与 ${activeCall.contactName} 通话`, `Call with ${activeCall.contactName}`)"
          tabindex="-1"
        >
          <p class="phone-live-label">
            <span :class="{ 'is-connected': activeCall.state === CALL_SESSION_STATE.CONNECTED }"></span>
            {{ activeCallStatusText }}
          </p>

          <div class="phone-live-identity">
            <span class="phone-avatar is-call" :class="avatarToneClass(activeCall.contactName)" aria-hidden="true">
              <span>{{ callInitials(activeCall.contactName) }}</span>
              <img
                v-if="contactAvatarUrl(activeCall.contact)"
                :src="contactAvatarUrl(activeCall.contact)"
                alt=""
                @error="hideBrokenAvatar"
              />
            </span>
            <h2>{{ activeCall.contactName }}</h2>
            <p>{{ activeCall.phoneNumber || t('SchatPhone 通话', 'SchatPhone call') }}</p>
          </div>

          <div v-if="activeCall.keypadOpen" class="phone-live-keypad" data-testid="phone-live-keypad">
            <output :aria-label="t('已输入按键', 'Entered tones')">{{ activeCall.tones || '\u00a0' }}</output>
            <div>
              <button
                v-for="key in DIAL_KEYS"
                :key="key.value"
                type="button"
                :aria-label="key.value"
                @click="appendCallTone(key.value)"
              >
                {{ key.value }}
              </button>
            </div>
          </div>

          <div v-else class="phone-live-controls">
            <button
              type="button"
              :class="{ 'is-active': activeCall.muted }"
              :aria-pressed="activeCall.muted"
              data-testid="phone-toggle-mute"
              @click="toggleCallControl('muted')"
            >
              <span><i :class="activeCall.muted ? 'fas fa-microphone-slash' : 'fas fa-microphone'" aria-hidden="true"></i></span>
              {{ t('静音', 'Mute') }}
            </button>
            <button
              type="button"
              :class="{ 'is-active': activeCall.speaker }"
              :aria-pressed="activeCall.speaker"
              data-testid="phone-toggle-speaker"
              @click="toggleCallControl('speaker')"
            >
              <span><i class="fas fa-volume-high" aria-hidden="true"></i></span>
              {{ t('免提', 'Speaker') }}
            </button>
            <button
              type="button"
              :aria-pressed="activeCall.keypadOpen"
              data-testid="phone-open-live-keypad"
              @click="toggleCallControl('keypadOpen')"
            >
              <span><i class="fas fa-grip" aria-hidden="true"></i></span>
              {{ t('键盘', 'Keypad') }}
            </button>
          </div>

          <button
            type="button"
            class="phone-end-call"
            :aria-label="t('结束通话', 'End call')"
            data-testid="phone-end-call"
            @click="endCall"
          >
            <i class="fas fa-phone-slash" aria-hidden="true"></i>
          </button>

          <button
            v-if="activeCall.keypadOpen"
            type="button"
            class="phone-close-live-keypad"
            @click="toggleCallControl('keypadOpen')"
          >
            {{ t('隐藏键盘', 'Hide keypad') }}
          </button>

          <p class="phone-session-boundary">
            {{ t('这是 SchatPhone 内的模拟通话，不会连接真实运营商。', 'This is a simulated SchatPhone call and does not connect to a carrier.') }}
          </p>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.phone-app {
  --phone-bg: #edf2ef;
  --phone-surface: rgba(251, 253, 251, 0.9);
  --phone-surface-strong: #ffffff;
  --phone-ink: #18231e;
  --phone-muted: #667269;
  --phone-soft: #929c95;
  --phone-line: rgba(31, 52, 41, 0.1);
  --phone-accent: #397859;
  --phone-accent-strong: #2b6348;
  --phone-accent-soft: #dcebe2;
  --phone-missed: #b95555;
  --phone-missed-soft: #f7e8e7;
  --phone-shadow: 0 16px 40px rgba(42, 68, 54, 0.12);
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--phone-bg);
  color: var(--phone-ink);
}

:global(.app-shell[data-theme='zen']) .phone-app {
  --phone-bg: #111814;
  --phone-surface: rgba(25, 34, 29, 0.92);
  --phone-surface-strong: #202b25;
  --phone-ink: #edf4ef;
  --phone-muted: #a7b3aa;
  --phone-soft: #77837b;
  --phone-line: rgba(218, 234, 224, 0.11);
  --phone-accent: #76b794;
  --phone-accent-strong: #8dc6a7;
  --phone-accent-soft: rgba(118, 183, 148, 0.16);
  --phone-missed: #e08a86;
  --phone-missed-soft: rgba(224, 138, 134, 0.14);
  --phone-shadow: 0 18px 44px rgba(0, 0, 0, 0.3);
}

.phone-header {
  position: relative;
  z-index: 4;
  flex: 0 0 auto;
  border-bottom: 1px solid var(--phone-line);
  padding: calc(42px + env(safe-area-inset-top)) 16px 10px;
  background: color-mix(in srgb, var(--phone-surface-strong) 86%, transparent);
  box-shadow: 0 8px 24px rgba(38, 60, 48, 0.05);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.phone-header__inner {
  display: grid;
  width: min(100%, 760px);
  min-height: 38px;
  margin: 0 auto;
  grid-template-columns: minmax(72px, 1fr) auto minmax(72px, 1fr);
  align-items: center;
}

.phone-header h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 760;
  line-height: 1.2;
  letter-spacing: 0;
}

.phone-back,
.phone-add,
.phone-sheet-head button {
  border: 0;
  -webkit-tap-highlight-color: transparent;
}

.phone-back {
  display: inline-flex;
  min-width: 0;
  min-height: 38px;
  align-items: center;
  justify-self: start;
  gap: 7px;
  border-radius: 12px;
  padding: 0 8px 0 2px;
  background: transparent;
  color: var(--phone-accent-strong);
  font-size: 14px;
  font-weight: 600;
}

.phone-back i {
  font-size: 13px;
}

.phone-add {
  display: inline-grid;
  width: 36px;
  height: 36px;
  place-items: center;
  justify-self: end;
  border-radius: 50%;
  background: var(--phone-accent);
  color: #fff;
  box-shadow: 0 8px 18px rgba(49, 111, 79, 0.24);
  transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.phone-add:hover {
  background: var(--phone-accent-strong);
  box-shadow: 0 10px 22px rgba(49, 111, 79, 0.3);
}

.phone-add:active,
.phone-back:active,
.phone-sheet-head button:active {
  transform: scale(0.96);
}

.phone-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.phone-content {
  width: min(100%, 760px);
  min-height: 100%;
  margin: 0 auto;
  padding: 26px 18px 42px;
}

.phone-overview {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 0 2px;
}

.phone-overview p,
.phone-overview h2 {
  margin: 0;
}

.phone-kicker {
  margin-bottom: 4px !important;
  color: var(--phone-accent-strong);
  font-size: 11px;
  font-weight: 750;
}

.phone-overview h2 {
  font-size: 28px;
  font-weight: 780;
  line-height: 1.12;
  letter-spacing: 0;
}

.phone-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
  padding-bottom: 3px;
  color: var(--phone-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
  text-align: right;
}

.phone-filter {
  display: grid;
  width: min(100%, 320px);
  min-height: 38px;
  margin-top: 20px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  border: 1px solid var(--phone-line);
  border-radius: 14px;
  padding: 3px;
  background: color-mix(in srgb, var(--phone-surface) 72%, transparent);
}

.phone-filter button {
  display: inline-flex;
  min-width: 0;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--phone-muted);
  font-size: 13px;
  font-weight: 650;
  transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.phone-filter button span {
  min-width: 17px;
  color: var(--phone-soft);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.phone-filter button.is-active {
  background: var(--phone-surface-strong);
  color: var(--phone-ink);
  box-shadow: 0 4px 12px rgba(39, 63, 50, 0.1);
}

.phone-filter button.is-active span {
  color: var(--phone-accent-strong);
}

.phone-feedback {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 14px 0 0;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.45;
}

.phone-feedback.is-success {
  border-color: color-mix(in srgb, var(--phone-accent) 22%, transparent);
  background: var(--phone-accent-soft);
  color: var(--phone-accent-strong);
}

.phone-feedback.is-warning {
  border-color: color-mix(in srgb, var(--phone-missed) 22%, transparent);
  background: var(--phone-missed-soft);
  color: var(--phone-missed);
}

.phone-feedback + section {
  margin-top: 22px;
}

.phone-call-days {
  display: grid;
  gap: 20px;
  margin-top: 22px;
}

.phone-call-day h3 {
  margin: 0 0 8px;
  padding: 0 3px;
  color: var(--phone-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.phone-call-group {
  overflow: hidden;
  border: 1px solid var(--phone-line);
  border-radius: 18px;
  background: var(--phone-surface);
  box-shadow: 0 10px 28px rgba(40, 64, 51, 0.06);
}

.phone-call-row {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 76px;
  grid-template-columns: minmax(0, 1fr) 48px;
  align-items: center;
  gap: 4px;
  padding: 0 8px 0 0;
  background: transparent;
  color: var(--phone-ink);
  text-align: left;
  transition: background 160ms ease;
}

.phone-call-row + .phone-call-row::before {
  content: '';
  position: absolute;
  top: 0;
  right: 14px;
  left: 75px;
  height: 1px;
  background: var(--phone-line);
}

.phone-call-row:hover {
  background: color-mix(in srgb, var(--phone-accent-soft) 42%, transparent);
}

.phone-call-main {
  display: grid;
  min-width: 0;
  min-height: 76px;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  border: 0;
  padding: 12px 6px 12px 14px;
  background: transparent;
  color: inherit;
  text-align: left;
  transition: transform 160ms ease;
  -webkit-tap-highlight-color: transparent;
}

.phone-call-main:active,
.phone-row-call:active {
  transform: scale(0.96);
}

.phone-call-main time {
  align-self: center;
  color: var(--phone-soft);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.phone-row-call {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--phone-accent-soft);
  color: var(--phone-accent-strong);
  font-size: 13px;
  transition: transform 160ms ease, background 160ms ease;
}

.phone-avatar {
  position: relative;
  display: inline-grid;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  place-items: center;
  overflow: visible;
  border-radius: 16px;
  color: #294334;
  font-size: 14px;
  font-weight: 780;
}

.phone-avatar > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.phone-avatar.is-tone-0 {
  background: #dce8e1;
}

.phone-avatar.is-tone-1 {
  background: #e8e1d7;
  color: #574737;
}

.phone-avatar.is-tone-2 {
  background: #dbe5eb;
  color: #314955;
}

.phone-avatar.is-tone-3 {
  background: #eadfdf;
  color: #594040;
}

:global(.app-shell[data-theme='zen']) .phone-avatar {
  filter: saturate(0.7) brightness(0.82);
}

.phone-direction {
  position: absolute;
  right: -4px;
  bottom: -4px;
  z-index: 2;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 2px solid var(--phone-surface-strong);
  border-radius: 50%;
  background: var(--phone-accent-soft);
  color: var(--phone-accent-strong);
  font-size: 8px;
}

.phone-direction.is-missed {
  background: var(--phone-missed-soft);
  color: var(--phone-missed);
}

.phone-direction.is-incoming {
  background: var(--phone-accent-soft);
  color: var(--phone-accent-strong);
}

.phone-call-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.phone-call-copy strong,
.phone-call-copy small,
.phone-call-copy > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phone-call-copy strong {
  font-size: 15px;
  font-weight: 720;
  line-height: 1.25;
}

.phone-call-row.is-missed .phone-call-copy strong {
  color: var(--phone-missed);
}

.phone-call-copy small {
  color: var(--phone-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
}

.phone-call-copy > span {
  color: var(--phone-soft);
  font-size: 11px;
  line-height: 1.25;
}

.phone-empty {
  display: grid;
  min-height: 320px;
  place-items: center;
  align-content: center;
  margin-top: 22px;
  padding: 32px 20px;
  text-align: center;
}

.phone-empty > span {
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border-radius: 20px;
  background: var(--phone-accent-soft);
  color: var(--phone-accent-strong);
  font-size: 23px;
}

.phone-empty h2 {
  margin: 17px 0 0;
  font-size: 17px;
  font-weight: 730;
  letter-spacing: 0;
}

.phone-empty p {
  max-width: 280px;
  margin: 7px 0 0;
  color: var(--phone-muted);
  font-size: 12px;
  line-height: 1.55;
}

.phone-empty button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  border: 0;
  border-radius: 13px;
  padding: 0 16px;
  background: var(--phone-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.phone-empty.is-compact {
  min-height: 280px;
  margin-top: 0;
}

.phone-search {
  display: grid;
  min-height: 46px;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin-top: 22px;
  border: 1px solid var(--phone-line);
  border-radius: 15px;
  padding: 0 14px;
  background: var(--phone-surface);
  color: var(--phone-soft);
}

.phone-search input {
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--phone-ink);
  outline: none;
}

.phone-search input::placeholder {
  color: var(--phone-soft);
}

.phone-contact-list {
  overflow: hidden;
  margin-top: 18px;
  border: 1px solid var(--phone-line);
  border-radius: 18px;
  background: var(--phone-surface);
  box-shadow: 0 10px 28px rgba(40, 64, 51, 0.06);
}

.phone-contact-row {
  position: relative;
  display: grid;
  min-height: 76px;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  padding: 12px 12px 12px 14px;
}

.phone-contact-row + .phone-contact-row::before {
  content: '';
  position: absolute;
  top: 0;
  right: 14px;
  left: 75px;
  height: 1px;
  background: var(--phone-line);
}

.phone-contact-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.phone-contact-copy strong,
.phone-contact-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phone-contact-copy strong {
  font-size: 15px;
  font-weight: 730;
}

.phone-contact-copy small {
  color: var(--phone-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.phone-contact-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phone-contact-actions button {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--phone-accent-soft);
  color: var(--phone-accent-strong);
  font-size: 13px;
  transition: transform 160ms ease, background 160ms ease;
}

.phone-contact-actions button.is-incoming {
  background: rgba(109, 187, 138, 0.16);
  color: #3f8a5c;
}

.phone-contact-actions button:active {
  transform: scale(0.94);
}

.phone-keypad-view {
  display: grid;
  width: min(100%, 420px);
  min-height: 100%;
  align-content: center;
  justify-items: center;
  margin: 0 auto;
  padding: 2px 0 16px;
}

.phone-keypad-heading {
  display: grid;
  width: 100%;
  min-height: 104px;
  align-content: end;
  justify-items: center;
  margin-bottom: 18px;
  text-align: center;
}

.phone-keypad-heading > p {
  min-height: 20px;
  margin: 0 0 7px;
  color: var(--phone-accent-strong);
  font-size: 13px;
  font-weight: 680;
}

.phone-number-line {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) 40px;
  align-items: center;
}

.phone-number-line input {
  min-width: 0;
  border: 0;
  padding: 0 4px 0 44px;
  background: transparent;
  color: var(--phone-ink);
  font-size: 28px;
  font-weight: 610;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  text-align: center;
  outline: none;
}

.phone-number-line input::placeholder {
  color: var(--phone-soft);
  font-size: 21px;
  font-weight: 550;
}

.phone-number-line button {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--phone-muted);
  opacity: 0;
  pointer-events: none;
}

.phone-number-line button.is-visible {
  opacity: 1;
  pointer-events: auto;
}

.phone-clear-number {
  min-height: 28px;
  border: 0;
  padding: 0 8px;
  background: transparent;
  color: var(--phone-accent-strong);
  font-size: 11px;
  font-weight: 680;
}

.phone-keypad {
  display: grid;
  width: min(100%, 336px);
  grid-template-columns: repeat(3, 76px);
  justify-content: center;
  gap: 12px 25px;
}

.phone-keypad > button {
  display: grid;
  width: 76px;
  height: 64px;
  place-items: center;
  align-content: center;
  gap: 1px;
  border: 1px solid var(--phone-line);
  border-radius: 20px;
  background: var(--phone-surface);
  color: var(--phone-ink);
  box-shadow: 0 8px 20px rgba(40, 64, 51, 0.05);
  transition: background 130ms ease, transform 130ms ease;
}

.phone-keypad > button:hover {
  background: var(--phone-surface-strong);
}

.phone-keypad > button:active {
  transform: scale(0.92);
}

.phone-keypad strong {
  font-size: 23px;
  font-weight: 610;
  line-height: 1;
}

.phone-keypad small {
  min-height: 10px;
  color: var(--phone-muted);
  font-size: 8px;
  font-weight: 720;
  line-height: 1;
}

.phone-call-button {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  margin-top: 20px;
  border: 0;
  border-radius: 50%;
  background: #338a58;
  color: #fff;
  box-shadow: 0 12px 28px rgba(35, 117, 72, 0.3);
  font-size: 22px;
  transition: filter 160ms ease, transform 160ms ease;
}

.phone-call-button:hover {
  filter: brightness(1.06);
}

.phone-call-button:active {
  transform: scale(0.93);
}

.phone-tabbar {
  position: relative;
  z-index: 5;
  display: grid;
  width: 100%;
  min-height: calc(66px + env(safe-area-inset-bottom));
  flex: 0 0 auto;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--phone-line);
  padding: 6px max(12px, env(safe-area-inset-right)) env(safe-area-inset-bottom) max(12px, env(safe-area-inset-left));
  background: color-mix(in srgb, var(--phone-surface-strong) 91%, transparent);
  box-shadow: 0 -10px 30px rgba(30, 52, 40, 0.07);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.phone-tabbar button {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 54px;
  place-items: center;
  align-content: center;
  gap: 4px;
  border: 0;
  border-radius: 13px;
  background: transparent;
  color: var(--phone-soft);
  font-size: 10px;
  font-weight: 650;
}

.phone-tabbar button > i {
  font-size: 17px;
}

.phone-tabbar button.is-active {
  color: var(--phone-accent-strong);
}

.phone-tabbar button.is-active > i {
  transform: translateY(-1px);
}

.phone-tabbar b {
  position: absolute;
  top: 2px;
  left: calc(50% + 6px);
  display: grid;
  min-width: 17px;
  height: 17px;
  place-items: center;
  border: 2px solid var(--phone-surface-strong);
  border-radius: 999px;
  padding: 0 4px;
  background: var(--phone-missed);
  color: #fff;
  font-size: 8px;
  font-variant-numeric: tabular-nums;
}

.phone-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(13, 23, 17, 0.36);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.phone-sheet {
  width: min(100%, 560px);
  max-height: min(88dvh, 720px);
  overflow: hidden;
  border: 1px solid var(--phone-line);
  border-bottom: 0;
  border-radius: 24px 24px 0 0;
  padding: 8px 18px calc(18px + env(safe-area-inset-bottom));
  background: var(--phone-surface-strong);
  color: var(--phone-ink);
  box-shadow: 0 -18px 52px rgba(18, 36, 26, 0.22);
  outline: none;
}

.phone-sheet-handle {
  width: 38px;
  height: 4px;
  margin: 0 auto 10px;
  border-radius: 999px;
  background: var(--phone-line);
}

.phone-sheet-head {
  display: flex;
  min-height: 48px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.phone-sheet-head p,
.phone-sheet-head h2 {
  margin: 0;
}

.phone-sheet-head p {
  margin-bottom: 3px;
  color: var(--phone-accent-strong);
  font-size: 10px;
  font-weight: 750;
}

.phone-sheet-head h2 {
  font-size: 21px;
  font-weight: 760;
  line-height: 1.2;
  letter-spacing: 0;
}

.phone-sheet-head button {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--phone-accent-soft);
  color: var(--phone-accent-strong);
  transition: transform 160ms ease, background 160ms ease;
}

.phone-form-scroll {
  max-height: calc(min(88dvh, 720px) - 152px);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 18px 2px 8px;
}

.phone-fieldset {
  margin: 0 0 18px;
  border: 0;
  padding: 0;
}

.phone-fieldset legend,
.phone-field > span:first-child {
  display: block;
  margin-bottom: 8px;
  color: var(--phone-muted);
  font-size: 11px;
  font-weight: 700;
}

.phone-direction-picker {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.phone-direction-picker button {
  display: inline-flex;
  min-width: 0;
  min-height: 43px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--phone-line);
  border-radius: 13px;
  background: var(--phone-surface);
  color: var(--phone-muted);
  font-size: 12px;
  font-weight: 680;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease, transform 160ms ease;
}

.phone-direction-picker button.is-active {
  border-color: color-mix(in srgb, var(--phone-accent) 38%, transparent);
  background: var(--phone-accent-soft);
  color: var(--phone-accent-strong);
}

.phone-direction-picker button.is-missed-choice.is-active {
  border-color: color-mix(in srgb, var(--phone-missed) 36%, transparent);
  background: var(--phone-missed-soft);
  color: var(--phone-missed);
}

.phone-direction-picker button:active {
  transform: scale(0.98);
}

.phone-field {
  display: block;
  margin: 0 0 16px;
}

.phone-field > span:first-child small {
  margin-left: 4px;
  color: var(--phone-soft);
  font-weight: 500;
}

.phone-field input,
.phone-field select,
.phone-field textarea {
  width: 100%;
  border: 1px solid var(--phone-line);
  border-radius: 13px;
  background: var(--phone-surface);
  color: var(--phone-ink);
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.phone-field input,
.phone-field select {
  min-height: 44px;
  padding: 0 13px;
}

.phone-field textarea {
  min-height: 82px;
  resize: vertical;
  padding: 11px 13px;
  line-height: 1.45;
}

.phone-field input::placeholder,
.phone-field textarea::placeholder {
  color: var(--phone-soft);
}

.phone-select-wrap {
  position: relative;
  display: block;
}

.phone-select-wrap select {
  appearance: none;
  padding-right: 38px;
}

.phone-select-wrap > i {
  position: absolute;
  top: 50%;
  right: 14px;
  color: var(--phone-soft);
  font-size: 10px;
  pointer-events: none;
  transform: translateY(-50%);
}

.phone-selected-contact {
  display: grid;
  min-height: 58px;
  grid-template-columns: 36px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 10px;
  margin: -5px 0 16px;
  border-radius: 13px;
  padding: 9px 11px;
  background: var(--phone-accent-soft);
  color: var(--phone-accent-strong);
}

.phone-selected-contact > span {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 12px;
  background: var(--phone-surface-strong);
  font-size: 11px;
  font-weight: 780;
}

.phone-selected-contact div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.phone-selected-contact strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 720;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phone-selected-contact small {
  color: var(--phone-muted);
  font-size: 10px;
}

.phone-duration-input {
  position: relative;
  display: block;
}

.phone-duration-input input {
  padding-right: 58px;
  font-variant-numeric: tabular-nums;
}

.phone-duration-input small {
  position: absolute;
  top: 50%;
  right: 14px;
  color: var(--phone-muted);
  font-size: 11px;
  transform: translateY(-50%);
}

.phone-form-warning,
.phone-call-boundary {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  border-radius: 12px;
  padding: 10px 11px;
  font-size: 11px;
  line-height: 1.5;
}

.phone-form-warning {
  margin: 0 0 12px;
  background: var(--phone-missed-soft);
  color: var(--phone-missed);
}

.phone-call-boundary {
  margin: 2px 0 0;
  background: var(--phone-accent-soft);
  color: var(--phone-muted);
}

.phone-call-boundary i {
  margin-top: 2px;
  color: var(--phone-accent-strong);
}

.phone-sheet-actions {
  display: grid;
  grid-template-columns: minmax(90px, 0.45fr) minmax(150px, 1fr);
  gap: 9px;
  border-top: 1px solid var(--phone-line);
  padding: 12px 2px 0;
}

.phone-sheet-actions button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 13px;
  font-size: 13px;
  font-weight: 720;
  transition: transform 160ms ease, filter 160ms ease;
}

.phone-sheet-cancel {
  border: 1px solid var(--phone-line);
  background: var(--phone-surface);
  color: var(--phone-muted);
}

.phone-sheet-save {
  border: 1px solid var(--phone-accent);
  background: var(--phone-accent);
  color: #fff;
}

.phone-sheet-actions button:hover {
  filter: brightness(0.97);
}

.phone-sheet-actions button:active {
  transform: scale(0.985);
}

.phone-detail {
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.phone-detail-identity {
  display: grid;
  place-items: center;
  padding: 24px 0 20px;
  text-align: center;
}

.phone-avatar.is-large {
  width: 74px;
  height: 74px;
  border-radius: 23px;
  font-size: 20px;
}

.phone-detail-identity > strong {
  margin-top: 13px;
  font-size: 19px;
  font-weight: 760;
}

.phone-detail-identity > span:last-child {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 5px;
  color: var(--phone-accent-strong);
  font-size: 12px;
  font-weight: 650;
}

.phone-detail-identity > span:last-child.is-missed {
  color: var(--phone-missed);
}

.phone-detail-call {
  display: flex;
  width: 88px;
  min-height: 58px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin: -5px auto 20px;
  border: 0;
  border-radius: 17px;
  background: var(--phone-accent-soft);
  color: var(--phone-accent-strong);
  font-size: 11px;
  font-weight: 700;
}

.phone-detail-call i {
  font-size: 16px;
}

.phone-detail-list {
  margin: 0;
  border-top: 1px solid var(--phone-line);
}

.phone-detail-list > div {
  display: grid;
  min-height: 48px;
  grid-template-columns: minmax(70px, 0.35fr) minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  border-bottom: 1px solid var(--phone-line);
  padding: 13px 2px;
}

.phone-detail-list dt {
  color: var(--phone-muted);
  font-size: 11px;
  font-weight: 650;
}

.phone-detail-list dd {
  margin: 0;
  color: var(--phone-ink);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.phone-delete-call {
  display: inline-flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
  border: 1px solid color-mix(in srgb, var(--phone-missed) 25%, transparent);
  border-radius: 13px;
  background: var(--phone-missed-soft);
  color: var(--phone-missed);
  font-size: 13px;
  font-weight: 700;
}

.phone-active-call {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 22%, rgba(106, 153, 128, 0.22), transparent 34%),
    linear-gradient(160deg, #19251f 0%, #0f1813 100%);
  color: #f2f7f4;
}

.phone-active-call__inner {
  display: grid;
  width: min(100%, 560px);
  min-height: 100%;
  margin: 0 auto;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
  justify-items: center;
  padding: calc(46px + env(safe-area-inset-top)) 24px calc(20px + env(safe-area-inset-bottom));
  outline: none;
}

.phone-live-label {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: rgba(237, 245, 240, 0.7);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
}

.phone-live-label span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d9a54f;
  box-shadow: 0 0 0 5px rgba(217, 165, 79, 0.11);
}

.phone-live-label span.is-connected {
  background: #64c78b;
  box-shadow: 0 0 0 5px rgba(100, 199, 139, 0.11);
}

.phone-live-identity {
  display: grid;
  justify-items: center;
  padding-top: clamp(28px, 8vh, 70px);
  text-align: center;
}

.phone-avatar.is-call {
  width: 112px;
  height: 112px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 34px;
  box-shadow: 0 24px 52px rgba(0, 0, 0, 0.28);
  font-size: 30px;
}

.phone-live-identity h2 {
  max-width: min(100%, 420px);
  margin: 20px 0 0;
  overflow-wrap: anywhere;
  font-size: 28px;
  font-weight: 720;
  line-height: 1.2;
}

.phone-live-identity p {
  margin: 8px 0 0;
  color: rgba(237, 245, 240, 0.64);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.phone-live-controls {
  display: grid;
  width: min(100%, 340px);
  align-self: end;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 34px;
}

.phone-live-controls button {
  display: grid;
  min-width: 0;
  justify-items: center;
  gap: 9px;
  border: 0;
  background: transparent;
  color: rgba(244, 248, 246, 0.75);
  font-size: 11px;
  font-weight: 620;
}

.phone-live-controls button > span {
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.11);
  color: #fff;
  font-size: 18px;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}

.phone-live-controls button.is-active > span {
  background: #f3f7f4;
  color: #17241d;
}

.phone-live-controls button:active > span {
  transform: scale(0.94);
}

.phone-live-keypad {
  display: grid;
  width: min(100%, 320px);
  align-self: end;
  justify-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.phone-live-keypad output {
  min-height: 22px;
  color: rgba(244, 248, 246, 0.74);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.phone-live-keypad > div {
  display: grid;
  grid-template-columns: repeat(3, 52px);
  gap: 8px 18px;
}

.phone-live-keypad button {
  width: 52px;
  height: 46px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.11);
  color: #fff;
  font-size: 17px;
}

.phone-end-call {
  display: grid;
  width: 66px;
  height: 66px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #d95555;
  color: #fff;
  box-shadow: 0 14px 30px rgba(180, 43, 43, 0.32);
  font-size: 21px;
  transition: filter 160ms ease, transform 160ms ease;
}

.phone-end-call:hover {
  filter: brightness(1.06);
}

.phone-end-call:active {
  transform: scale(0.93);
}

.phone-close-live-keypad {
  min-height: 34px;
  margin-top: 9px;
  border: 0;
  padding: 0 10px;
  background: transparent;
  color: rgba(244, 248, 246, 0.7);
  font-size: 11px;
}

.phone-session-boundary {
  align-self: end;
  max-width: 330px;
  margin: 14px 0 0;
  color: rgba(237, 245, 240, 0.38);
  font-size: 9px;
  line-height: 1.45;
  text-align: center;
}

.phone-app button:focus-visible,
.phone-app input:focus-visible,
.phone-app select:focus-visible,
.phone-app textarea:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--phone-accent) 58%, transparent);
  outline-offset: 2px;
}

.phone-field input:focus,
.phone-field select:focus,
.phone-field textarea:focus {
  border-color: color-mix(in srgb, var(--phone-accent) 55%, transparent);
  background: var(--phone-surface-strong);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--phone-accent) 12%, transparent);
}

.phone-sheet-enter-active,
.phone-sheet-leave-active {
  transition: opacity 190ms ease;
}

.phone-sheet-enter-active .phone-sheet,
.phone-sheet-leave-active .phone-sheet {
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.phone-sheet-enter-from,
.phone-sheet-leave-to {
  opacity: 0;
}

.phone-sheet-enter-from .phone-sheet,
.phone-sheet-leave-to .phone-sheet {
  transform: translateY(28px);
}

.phone-call-enter-active,
.phone-call-leave-active {
  transition: opacity 220ms ease;
}

.phone-call-enter-active .phone-active-call__inner,
.phone-call-leave-active .phone-active-call__inner {
  transition: transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.phone-call-enter-from,
.phone-call-leave-to {
  opacity: 0;
}

.phone-call-enter-from .phone-active-call__inner,
.phone-call-leave-to .phone-active-call__inner {
  transform: translateY(20px) scale(0.985);
}

@media (min-width: 760px) {
  .phone-content {
    padding-top: 34px;
  }

  .phone-sheet-backdrop {
    padding: 24px 24px 0;
  }

  .phone-sheet {
    border-right: 1px solid var(--phone-line);
    border-left: 1px solid var(--phone-line);
  }
}

@media (max-width: 460px) {
  .phone-content {
    padding: 22px 14px 32px;
  }

  .phone-overview {
    align-items: flex-start;
  }

  .phone-overview h2 {
    font-size: 25px;
  }

  .phone-summary {
    max-width: 122px;
  }

  .phone-filter {
    width: 100%;
  }

  .phone-call-row {
    grid-template-columns: minmax(0, 1fr) 44px;
    padding-right: 6px;
  }

  .phone-call-main {
    grid-template-columns: 46px minmax(0, 1fr) auto;
    gap: 11px;
    padding-right: 4px;
    padding-left: 12px;
  }

  .phone-avatar {
    width: 46px;
    height: 46px;
    border-radius: 15px;
  }

  .phone-row-call {
    width: 38px;
    height: 38px;
  }

  .phone-keypad {
    grid-template-columns: repeat(3, 68px);
    gap: 10px 22px;
  }

  .phone-keypad > button {
    width: 68px;
    height: 60px;
    border-radius: 19px;
  }

  .phone-number-line input {
    font-size: 25px;
  }

  .phone-active-call__inner {
    padding-right: 18px;
    padding-left: 18px;
  }

  .phone-live-identity {
    padding-top: clamp(22px, 6vh, 48px);
  }

  .phone-avatar.is-call {
    width: 98px;
    height: 98px;
    border-radius: 30px;
  }

  .phone-live-controls {
    gap: 10px;
    margin-bottom: 24px;
  }

  .phone-live-controls button > span {
    width: 58px;
    height: 58px;
  }

  .phone-sheet {
    max-height: 91dvh;
    padding-right: 14px;
    padding-left: 14px;
  }

  .phone-form-scroll {
    max-height: calc(91dvh - 152px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .phone-app *,
  .phone-app *::before,
  .phone-app *::after {
    scroll-behavior: auto !important;
    transition-duration: 0s !important;
  }
}
.phone-food-call { margin-bottom: 1rem; padding: 1rem; border: 1px solid rgba(119, 210, 255, .28); border-radius: 1.4rem; color: #edf7ff; background: linear-gradient(145deg, #18263a, #0c1421); box-shadow: 0 18px 42px rgba(6, 18, 35, .22); }
.phone-food-call__head, .phone-food-call__actions { display: flex; align-items: center; justify-content: space-between; gap: .8rem; }.phone-food-call__head h2 { margin: .2rem 0 0; font-size: 1.1rem; }.phone-food-call__head p:last-child { margin: .2rem 0 0; color: #9db3c9; font-size: .72rem; }.phone-food-call__live { padding: .25rem .45rem; border-radius: 999px; color: #071620; background: #7ce4c7; font-size: .6rem; font-weight: 900; letter-spacing: .08em; }
.phone-food-call__transcript { display: grid; gap: .55rem; max-height: 19rem; margin: .9rem 0; overflow-y: auto; padding: .2rem; }.phone-food-call__turn { max-width: 88%; padding: .6rem .7rem; border-radius: .85rem; background: rgba(255,255,255,.07); }.phone-food-call__turn.is-user { justify-self: end; color: #06211e; background: #a4f2e3; }.phone-food-call__turn small { display: block; margin-bottom: .2rem; color: #9fb0c2; font-size: .58rem; font-weight: 900; text-transform: uppercase; }.phone-food-call__turn.is-user small { color: #28645d; }.phone-food-call__turn p { margin: 0; font-size: .74rem; line-height: 1.45; }
.phone-food-call__composer { display: grid; gap: .45rem; }.phone-food-call__composer textarea { width: 100%; box-sizing: border-box; border: 1px solid rgba(255,255,255,.12); border-radius: .8rem; color: #edf7ff; background: rgba(255,255,255,.06); padding: .6rem; font: inherit; font-size: .74rem; resize: vertical; }.phone-food-call__composer button, .phone-food-call__actions button { min-height: 2.5rem; padding: .55rem .75rem; border: 0; border-radius: .75rem; color: #06211e; background: #7ce4c7; font-size: .72rem; font-weight: 900; }.phone-food-call__actions { margin-top: .65rem; }.phone-food-call__actions .is-end { color: #ffe9ed; background: #a54154; }.phone-food-call__proposal { margin: .65rem 0 0; padding: .6rem .7rem; border-radius: .75rem; color: #d9fff3; background: rgba(92, 224, 197, .12); font-size: .72rem; }
</style>
