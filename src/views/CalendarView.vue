<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useSystemNotifications } from '../composables/useSystemNotifications'
import { useCalendarStore } from '../stores/calendar'
import { useChatStore } from '../stores/chat'
import { useMapStore } from '../stores/map'
import { useRemindersStore } from '../stores/reminders'
import { useSystemStore } from '../stores/system'
import { useWorkHubStore } from '../stores/workHub'
import { buildWorldBookRouteQuery } from '../lib/worldbook-navigation'
import { pushReturnTarget } from '../lib/navigation-return'
import { RELATIONSHIP_FACT_SOURCE_KEYS } from '../lib/relationship-fact-adapters'
import { resolveWorldAppUxContext } from '../lib/world-pack-app-bindings'
import { MAP_TRANSPORT_MODES } from '../lib/map-journey'
import { resolveScheduleHandoffSourceDraftV1 } from '../lib/schedule-handoff-sources'
import {
  SCHEDULE_HANDOFF_CONFLICT_DECISIONS,
  resolveScheduleHandoffConflictV1,
} from '../lib/schedule-handoff'
import {
  addCalendarDays,
  addCalendarMonths,
  calendarOccurrencesForDay,
  endOfCalendarDay,
  expandCalendarEventOccurrences,
  getCalendarViewRange,
  getNextCalendarEventReminderAt,
  isSameCalendarDay,
  normalizeCalendarViewMode,
  startOfCalendarDay,
} from '../lib/calendar-schedule'
import CalendarEventCard from '../components/calendar/CalendarEventCard.vue'
import CalendarEventEditor from '../components/calendar/CalendarEventEditor.vue'
import CalendarWorkspace from '../components/calendar/CalendarWorkspace.vue'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const calendarStore = useCalendarStore()
const chatStore = useChatStore()
const mapStore = useMapStore()
const remindersStore = useRemindersStore()
const systemStore = useSystemStore()
const workHubStore = useWorkHubStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const systemNotifications = useSystemNotifications({ systemStore })
const { confirmedEvents } = storeToRefs(calendarStore)
const { activeReminderItems } = storeToRefs(remindersStore)
const {
  activeMapAllPlaces,
  mapCalendarReminders,
  mapAreaFeedback,
  mapPacks,
  tripRuntime,
} = storeToRefs(mapStore)
const { settings } = storeToRefs(systemStore)
const calendarMarkers = computed(() => settings.value.appearance?.calendar?.markers || [])
const calendarColorPreset = computed(
  () => settings.value.appearance?.calendar?.colorPreset || 'default',
)
const calendarGlyphStyle = computed(
  () => settings.value.appearance?.calendar?.glyphStyle || 'bar',
)
const openCalendarAppearance = () => {
  router.push({ path: '/calendar/settings/appearance', query: { ...route.query } })
}
const calendarRelationshipDrafts = ref({})
const relationshipFeedbackByEventId = ref({})
const departureModeByEventId = ref({})
const departureFeedbackByEventId = ref({})
const departureNow = ref(Date.now())
const calendarViewMode = ref(normalizeCalendarViewMode(route.query.view))
const calendarAnchorAt = ref(startOfCalendarDay(Date.now()))
const selectedCalendarDate = ref(startOfCalendarDay(Date.now()))
const selectedEventId = ref('')
const selectedOccurrenceId = ref('')
const hasResolvedInitialCalendarSelection = ref(false)
const editorOpen = ref(false)
const editorMode = ref('create')
const editorDraft = ref({})
const editorValidationMessage = ref('')
const editorSaving = ref(false)
const openedScheduleHandoffId = ref('')
let departureClockTimer = null

const calendarEventCount = computed(() => confirmedEvents.value.length)
const calendarViewRange = computed(() =>
  getCalendarViewRange({
    viewMode: calendarViewMode.value,
    anchorAt: calendarAnchorAt.value,
  }),
)
const calendarOccurrences = computed(() =>
  expandCalendarEventOccurrences({
    events: confirmedEvents.value,
    rangeStart: calendarViewRange.value.rangeStart,
    rangeEnd: calendarViewRange.value.rangeEnd,
  }),
)
const selectedOccurrence = computed(
  () =>
    calendarOccurrences.value.find(
      (occurrence) => occurrence.occurrenceId === selectedOccurrenceId.value,
    ) || null,
)
const selectedSourceEvent = computed(() =>
  selectedEventId.value ? calendarStore.findEventById(selectedEventId.value) : null,
)
const selectedEventPresentation = computed(() => {
  const source = selectedSourceEvent.value
  const occurrence = selectedOccurrence.value
  if (!source || !occurrence || occurrence.sourceEventId !== source.id) return null
  return {
    ...source,
    startsAt: occurrence.startsAt,
    endsAt: occurrence.endsAt,
    sourceEventId: source.id,
    sourceStartsAt: source.startsAt,
    sourceEndsAt: source.endsAt,
    occurrenceId: occurrence.occurrenceId,
    occurrenceIndex: occurrence.occurrenceIndex,
    isRecurring: occurrence.isRecurring,
    isMultiDay: occurrence.isMultiDay,
  }
})
const calendarWorldAppContext = computed(() =>
  resolveWorldAppUxContext({
    systemStore,
    moduleKey: 'calendar',
    routeQuery: route.query,
    expectedArchetypes: ['reservation'],
  }),
)
const calendarTitle = computed(
  () => calendarWorldAppContext.value?.bindingTitle || t('日历', 'Calendar'),
)
const calendarOverviewEyebrow = computed(
  () =>
    calendarWorldAppContext.value?.packName ||
    calendarWorldAppContext.value?.packTitle ||
    t('日程中心', 'Schedule center'),
)
const calendarOverviewTitle = computed(
  () =>
    calendarWorldAppContext.value?.bindingTitle ||
    t('已确认的事项在这里排程。', 'Confirmed items are scheduled here.'),
)
const calendarOverviewDescription = computed(() => {
  if (calendarWorldAppContext.value) return calendarWorldAppContext.value.boundaryCopy
  return t(
    '还没确认的事会先进提醒事项；确认后在这里定好时间，到点提醒你。',
    'Unconfirmed items go to Reminders first; once confirmed, they get a time here and remind you on schedule.',
  )
})
const calendarOverviewClass = computed(() =>
  calendarWorldAppContext.value ? 'calendar-overview--world' : '',
)
const singleRouteQueryValue = (value) => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim() : ''
}
const calendarScheduleHandoffDraft = computed(() =>
  resolveScheduleHandoffSourceDraftV1({
    sourceOwner: singleRouteQueryValue(route.query.source),
    sourceRecordId: singleRouteQueryValue(route.query.sourceRecordId),
    productionWorkHubResolver: workHubStore.resolveScheduleHandoffDraft,
    productionWorkHubOwnsRecord: workHubStore.ownsScheduleProposal,
  }),
)
const calendarScheduleHandoffExistingEvent = computed(() => {
  const draft = calendarScheduleHandoffDraft.value
  if (!draft) return null
  return (
    calendarStore.findEventByScheduleHandoffSource(draft.sourceOwner, draft.sourceRecordId) ||
    (draft.replacesSourceRef
      ? calendarStore.findEventByScheduleHandoffSource(
          draft.replacesSourceRef.sourceOwner,
          draft.replacesSourceRef.sourceRecordId,
        )
      : null)
  )
})
const calendarScheduleHandoffResolution = computed(() => {
  const draft = calendarScheduleHandoffDraft.value
  if (!draft) return null
  const existing = calendarScheduleHandoffExistingEvent.value
  return resolveScheduleHandoffConflictV1({
    draft,
    existingReference: existing
      ? {
          ...existing.sourceRef,
          calendarEventId: existing.id,
        }
      : null,
  })
})
const calendarSourceHandoff = computed(() => {
  const source = singleRouteQueryValue(route.query.source).toLowerCase()
  const sourceRecordId = singleRouteQueryValue(route.query.sourceRecordId)
  const draft = calendarScheduleHandoffDraft.value
  const resolution = calendarScheduleHandoffResolution.value
  const completed =
    resolution?.decision === SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REUSE_CONFIRMED
  const sourceChanged =
    resolution?.decision === SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_SOURCE_CHANGE
  if (source === 'mail') {
    return {
      source,
      icon: 'fas fa-envelope',
      eyebrowZh: completed ? '已关联日程' : sourceChanged ? '来源有更新' : '尚未创建日程',
      eyebrowEn: completed
        ? 'Linked Calendar event'
        : sourceChanged
          ? 'Source update available'
          : 'No Calendar event yet',
      titleZh: draft?.proposedTitleZh || '来自邮件的预约',
      titleEn: draft?.proposedTitleEn || 'Appointment from Mail',
      descriptionZh: completed
        ? '这项预约已经关联到同一条日历安排，不会重复创建。'
        : sourceChanged
          ? '邮件预约内容已有新版本，现有日历安排不会被静默覆盖。'
        : sourceRecordId && !draft
          ? '无法验证这封邮件的预约信息，因此没有预填或创建日程。'
          : draft
            ? '预约信息已准备好，请在日历编辑器中核对；只有确认后才会创建日程。'
            : '这封邮件目前只是来源引用，日历中还没有对应日程。',
      descriptionEn: completed
        ? 'This appointment is linked to the same Calendar event and will not be duplicated.'
        : sourceChanged
          ? 'Mail has a newer appointment revision. The existing Calendar event was not overwritten.'
        : sourceRecordId && !draft
          ? 'Calendar could not verify this Mail appointment, so nothing was prefilled or created.'
          : draft
            ? 'The appointment is ready for review. Calendar creates it only after you confirm.'
            : 'This message is currently only a source reference; Calendar has no matching event yet.',
      returnZh: '返回邮件',
      returnEn: 'Return to Mail',
      reviewZh: sourceChanged ? '审阅并更新' : '审阅并添加',
      reviewEn: sourceChanged ? 'Review and update' : 'Review and add',
      canReview: Boolean(
        draft &&
          ((resolution?.decision === SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_NEW &&
            resolution.mayCreateAfterReview) ||
            (resolution?.decision === SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_SOURCE_CHANGE &&
              resolution.mayUpdateAfterReview)),
      ),
    }
  }
  if (source === 'workplace') {
    return {
      source,
      icon: 'fas fa-briefcase',
      eyebrowZh: completed ? '已关联日程' : sourceChanged ? '来源有更新' : '尚未创建日程',
      eyebrowEn: completed
        ? 'Linked Calendar event'
        : sourceChanged
          ? 'Source update available'
          : 'No Calendar event yet',
      titleZh: draft?.proposedTitleZh || '来自工作台的排期提案',
      titleEn: draft?.proposedTitleEn || 'Schedule proposal from Work Hub',
      descriptionZh: completed
        ? '这项提案已经关联到同一条日历安排，不会重复创建。'
        : sourceChanged
          ? '工作台提案已有新版本，现有日历安排不会被静默覆盖。'
        : sourceRecordId && !draft
          ? '无法验证这项已接受的工作台提案，因此没有预填或创建日程。'
          : draft
            ? '提案信息已准备好，请在日历编辑器中核对；只有确认后才会创建日程。'
            : '这项提案目前只是工作台引用，日历中还没有对应日程。',
      descriptionEn: completed
        ? 'This proposal is linked to the same Calendar event and will not be duplicated.'
        : sourceChanged
          ? 'Work Hub has a newer proposal revision. The existing Calendar event was not overwritten.'
        : sourceRecordId && !draft
          ? 'Calendar could not verify this accepted Work Hub proposal, so nothing was prefilled or created.'
          : draft
            ? 'The proposal is ready for review. Calendar creates it only after you confirm.'
            : 'This proposal is currently only a Work Hub reference; Calendar has no matching event yet.',
      returnZh: '返回工作台',
      returnEn: 'Return to Work Hub',
      reviewZh: sourceChanged ? '审阅并更新' : '审阅并添加',
      reviewEn: sourceChanged ? 'Review and update' : 'Review and add',
      canReview: Boolean(
        draft &&
          ((resolution?.decision === SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_NEW &&
            resolution.mayCreateAfterReview) ||
            (resolution?.decision === SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_SOURCE_CHANGE &&
              resolution.mayUpdateAfterReview)),
      ),
    }
  }
  return null
})
const calendarBackLabel = computed(() => {
  if (calendarSourceHandoff.value?.source === 'mail') return t('邮件', 'Mail')
  if (calendarSourceHandoff.value?.source === 'workplace') return t('工作台', 'Work Hub')
  return t('首页', 'Home')
})
const pendingReminderItems = computed(() =>
  activeReminderItems.value.filter((item) => item.status !== 'confirmed' && item.pinned !== true),
)
const pendingReminderCount = computed(() => pendingReminderItems.value.length)
const pendingReminderSourceCounts = computed(() =>
  pendingReminderItems.value.reduce((counts, item) => {
    counts[item.source] = (counts[item.source] || 0) + 1
    return counts
  }, {}),
)
const reminderSummaryItems = computed(() => [
  {
    key: 'map',
    labelZh: '地图',
    labelEn: 'Map',
    count: pendingReminderSourceCounts.value.map || 0,
    className: 'calendar-cue-source--map',
  },
  {
    key: 'phone',
    labelZh: '电话',
    labelEn: 'Phone',
    count: pendingReminderSourceCounts.value.phone || 0,
    className: 'calendar-cue-source--phone',
  },
  {
    key: 'shopping',
    labelZh: '购物',
    labelEn: 'Shopping',
    count: pendingReminderSourceCounts.value.shopping || 0,
    className: 'calendar-cue-source--shopping',
  },
  {
    key: 'stock',
    labelZh: '股票',
    labelEn: 'Stock',
    count: pendingReminderSourceCounts.value.stock || 0,
    className: 'calendar-cue-source--stock',
  },
])
const eventTimeQuickShiftOptions = [
  { key: 'plus_hour', labelZh: '+1 小时', labelEn: '+1h', offsetMs: 60 * 60 * 1000 },
  { key: 'plus_day', labelZh: '+1 天', labelEn: '+1d', offsetMs: 24 * 60 * 60 * 1000 },
]
const departureTransportModes = MAP_TRANSPORT_MODES
const defaultDepartureTransportMode = 'public_transit'

const getDepartureMode = (eventId) =>
  departureModeByEventId.value[eventId] || defaultDepartureTransportMode

const departureProjectionByEventId = computed(() =>
  selectedEventPresentation.value?.locationRef && !selectedEventPresentation.value?.allDay
    ? {
        [selectedEventPresentation.value.id]: mapStore.getScheduledTravelProjection({
          startsAt: selectedEventPresentation.value.startsAt,
          locationRef: selectedEventPresentation.value.locationRef,
          transportMode: getDepartureMode(selectedEventPresentation.value.id),
          now: departureNow.value,
        }),
      }
    : {},
)

const getDepartureProjection = (eventId) => departureProjectionByEventId.value[eventId] || null

const getActiveJourneyForEvent = (eventId) => {
  const state = tripRuntime.value || {}
  if (state.status === 'idle' || state.sourceCalendarEventId !== eventId) return null
  return state
}

const hasOtherActiveJourney = (eventId) => {
  const state = tripRuntime.value || {}
  return state.status !== 'idle' && state.sourceCalendarEventId !== eventId
}

const getDepartureFeedback = (eventId) => departureFeedbackByEventId.value[eventId] || null

const setDepartureFeedback = (eventId, feedback = null) => {
  const next = { ...departureFeedbackByEventId.value }
  if (feedback) next[eventId] = feedback
  else delete next[eventId]
  departureFeedbackByEventId.value = next
}

const updateDepartureMode = (event, transportMode) => {
  if (!event?.id || !MAP_TRANSPORT_MODES.some((mode) => mode.id === transportMode)) return
  departureModeByEventId.value = {
    ...departureModeByEventId.value,
    [event.id]: transportMode,
  }
  departureNow.value = Date.now()
  setDepartureFeedback(event.id, null)
}

const openEventJourney = (event) => {
  const calendarEventId = event?.sourceEventId || event?.id
  if (!calendarEventId) return
  router.push({
    path: '/map',
    query: {
      source: 'calendar',
      calendarEventId,
    },
  })
}

const startEventTravel = (event) => {
  const calendarEventId = event?.sourceEventId || event?.id
  if (!calendarEventId) return
  const result = mapStore.startScheduledTravel({
    calendarEventId,
    startsAt: event.startsAt,
    locationRef: event.locationRef,
    transportMode: getDepartureMode(event.id),
    now: Date.now(),
  })
  if (result?.ok) {
    openEventJourney(event)
    return
  }
  setDepartureFeedback(event.id, {
    tone: 'warning',
    messageZh:
      result?.code === 'TRIP_ALREADY_IN_PROGRESS' || result?.code === 'TRIP_ARRIVAL_PENDING'
        ? '已有另一段行程正在处理，请先在地图中完成或取消。'
        : '当前位置或预约地点已变化，暂时无法开始这段行程。',
    messageEn:
      result?.code === 'TRIP_ALREADY_IN_PROGRESS' || result?.code === 'TRIP_ARRIVAL_PENDING'
        ? 'Another journey is active. Finish or cancel it in Map first.'
        : 'The current position or appointment place changed, so this trip cannot start yet.',
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

const calendarPushRuntime = computed(() => {
  const systemSettings = settings.value.system || {}
  const automationSettings = settings.value.aiAutomation || {}
  const quietHoursActive = systemStore.isAiAutomationQuietHoursActive(Date.now())
  const quietHoursEnabled = automationSettings.quietHoursEnabled === true
  const base = {
    ready: false,
    labelZh: '推送未就绪',
    labelEn: 'Push not ready',
    detailZh: '需要先在设置里启用真实推送并完成设备订阅。',
    detailEn: 'Enable real push and subscribe this device in Settings first.',
    toneClass: 'calendar-status--neutral',
    quietHoursEnabled,
    quietHoursActive,
    quietHoursStart: automationSettings.quietHoursStart || '23:00',
    quietHoursEnd: automationSettings.quietHoursEnd || '07:00',
    displayMode: systemSettings.pushDisplayMode || 'minimal',
  }

  if (!systemNotifications.notificationEnabled.value) {
    return {
      ...base,
      detailZh: '系统通知总开关已关闭，Calendar 不会安排真实推送。',
      detailEn: 'System notifications are off, so Calendar cannot schedule real push.',
    }
  }
  if (systemSettings.realPushEnabled !== true) {
    return {
      ...base,
      detailZh: '真实推送未启用；事件仍会保留在 Calendar 内。',
      detailEn: 'Real push is disabled; events remain visible inside Calendar.',
    }
  }
  if (systemSettings.pushSubscriptionActive !== true) {
    return {
      ...base,
      detailZh: '当前设备尚未订阅推送，需在设置里重新订阅。',
      detailEn: 'This device is not subscribed yet; resubscribe in Settings.',
    }
  }
  if (!systemSettings.pushServerUrl || !systemSettings.pushDeviceId) {
    return {
      ...base,
      detailZh: '推送服务地址或设备标识缺失，无法安排定时推送。',
      detailEn: 'Push server URL or device ID is missing, so schedules cannot be armed.',
    }
  }

  return {
    ...base,
    ready: true,
    labelZh: '推送就绪',
    labelEn: 'Push ready',
    detailZh: '已确认的 Calendar 事件会按各自的提前提醒策略安排真实推送。',
    detailEn: 'Confirmed Calendar events schedule real push from their reminder policy.',
    toneClass: 'calendar-status--success',
  }
})

const selectCalendarOccurrence = (occurrence, dayStartsAt = occurrence?.startsAt) => {
  if (!occurrence?.sourceEventId || !occurrence?.occurrenceId) return
  hasResolvedInitialCalendarSelection.value = true
  selectedEventId.value = occurrence.sourceEventId
  selectedOccurrenceId.value = occurrence.occurrenceId
  if (dayStartsAt) selectedCalendarDate.value = startOfCalendarDay(dayStartsAt)
}

const selectCalendarDay = (dayStartsAt) => {
  if (!dayStartsAt) return
  hasResolvedInitialCalendarSelection.value = true
  selectedCalendarDate.value = startOfCalendarDay(dayStartsAt)
}

const updateCalendarView = (viewMode) => {
  calendarViewMode.value = normalizeCalendarViewMode(viewMode)
  calendarAnchorAt.value = selectedCalendarDate.value
}

const shiftCalendarPeriod = (direction) => {
  hasResolvedInitialCalendarSelection.value = true
  const amount = Number(direction) < 0 ? -1 : 1
  if (calendarViewMode.value === 'week') {
    calendarAnchorAt.value = addCalendarDays(calendarAnchorAt.value, amount * 7)
    selectedCalendarDate.value = addCalendarDays(selectedCalendarDate.value, amount * 7)
    return
  }
  calendarAnchorAt.value = addCalendarMonths(calendarAnchorAt.value, amount)
  selectedCalendarDate.value = addCalendarMonths(selectedCalendarDate.value, amount)
}

const goToCalendarToday = () => {
  hasResolvedInitialCalendarSelection.value = true
  const today = startOfCalendarDay(Date.now())
  calendarAnchorAt.value = today
  selectedCalendarDate.value = today
}

const goHome = () => {
  const context = calendarScheduleHandoffDraft.value?.sourceReturnContext
  if (context?.path) {
    router.push({
      path: context.path,
      query: {
        ...(context.query || {}),
        ...(singleRouteQueryValue(route.query.homePage)
          ? { homePage: singleRouteQueryValue(route.query.homePage) }
          : {}),
      },
    })
    return
  }
  pushReturnTarget(router, route, '/home')
}

const openSelectedEventSource = () => {
  const context = selectedSourceEvent.value?.sourceRef?.sourceReturnContext
  if (!context?.path) return
  router.push({ path: context.path, query: { ...(context.query || {}) } })
}

const openMap = () => {
  router.push('/map')
}

const openReminders = () => {
  router.push({
    path: '/reminders',
    query:
      route.query.from === 'home' && route.query.homePage
        ? { from: 'home', homePage: route.query.homePage }
        : {},
  })
}

const openWorldBook = (options = {}) => {
  router.push({
    path: '/worldbook',
    query: buildWorldBookRouteQuery({
      source: 'calendar',
      homePage: route.query.homePage,
      pointIds: options.pointIds,
      keyword: options.keyword,
      tag: options.tag,
      usage: options.usage,
    }),
  })
}

const buildKnowledgePointContextTags = (item = {}) => {
  const tags = []
  const source = typeof item.source === 'string' ? item.source.trim() : ''
  if (source === 'map_area_feedback' || source === 'map_calendar_reminder') {
    tags.push('map', 'travel')
  }
  const areaId =
    typeof item.areaId === 'string' && item.areaId.trim()
      ? item.areaId.trim()
      : typeof item.sourceAreaId === 'string' && item.sourceAreaId.trim()
        ? item.sourceAreaId.trim()
        : ''
  if (areaId) tags.push(areaId)
  return tags
}

const buildKnowledgePointContextTexts = (item = {}) =>
  [item.titleZh, item.titleEn, item.summaryZh, item.summaryEn]
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)

const buildRelatedKnowledgePointIndex = (items = []) =>
  Object.fromEntries(
    items.map((item) => [
      item.id,
      systemStore.findRelevantKnowledgePoints({
        texts: buildKnowledgePointContextTexts(item),
        tags: buildKnowledgePointContextTags(item),
        limit: 3,
      }),
    ]),
  )

const eventKnowledgePoints = computed(() =>
  buildRelatedKnowledgePointIndex(confirmedEvents.value),
)

const getRelatedKnowledgePoints = (collection, itemId) => {
  const source = collection?.value ?? collection ?? {}
  return source[itemId] || []
}

const getSelectedRelationshipContact = (eventId) => {
  const selectedId = String(calendarRelationshipDrafts.value[eventId] || '')
  if (!selectedId) return null
  return (
    relationshipContactOptions.value.find((contact) => contact.optionValue === selectedId) || null
  )
}

const getEventRelationshipSuggestion = (event) =>
  calendarStore.buildEventRelationshipSuggestion(
    event?.id,
    event?.id ? getSelectedRelationshipContact(event.id) : null,
  )

const calendarSourceLabel = (event = {}) => {
  if (event.source === 'map_calendar_reminder') return t('Map follow-up', 'Map follow-up')
  if (event.source === 'phone_missed_call') return t('Phone callback', 'Phone callback')
  if (event.source === 'shopping_delivery') return t('Shopping delivery', 'Shopping delivery')
  if (event.source === 'stock_market_move') return t('Stock review', 'Stock review')
  return t('Manual calendar event', 'Manual calendar event')
}

const buildCalendarEventLineageNotes = (event = {}) =>
  [
    event.sourceReminderId
      ? t(`提醒来源：${event.sourceReminderId}`, `Reminder source: ${event.sourceReminderId}`)
      : '',
    event.sourceTripId
      ? t(`路线来源：${event.sourceTripId}`, `Route source: ${event.sourceTripId}`)
      : '',
    event.sourceAreaId
      ? t(`地点来源：${event.sourceAreaId}`, `Area source: ${event.sourceAreaId}`)
      : '',
  ].filter(Boolean)

const getCalendarEventRelationshipReview = (event) => {
  if (!event?.id) return null
  const facts = relationshipRuntimeStore.listRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.CALENDAR_CONFIRMED_EVENT,
    event.id,
    3,
  )
  const fact = facts[0] || null
  const summary = fact
    ? relationshipRuntimeStore.summarizeEntityForTarget(
        { entityKey: fact.entityKey },
        {
          eventLimit: 3,
          memoryLimit: 3,
        },
      )
    : null
  const memory =
    fact?.memoryKey && Array.isArray(summary?.memorySummaries)
      ? summary.memorySummaries.find((item) => item.memoryKey === fact.memoryKey) || null
      : null
  const binding = event.relationshipBinding || {}
  const targetName = fact?.targetLabel || binding.name || ''
  const notes = [
    ...buildCalendarEventLineageNotes(event),
    fact
      ? fact.effectApplied === false
        ? t(
            '作为补充记录加入同一段记忆；不重复增加关系数值。',
            'Supporting record in the same memory; no duplicate relationship growth.',
          )
        : t(
            '已作为主要日程记忆计入关系进展。',
            'Applied as the primary calendar relationship memory.',
          )
      : t(
          '确认联系人后可写入关系记忆。',
          'Choose a contact to record this as relationship memory.',
        ),
  ].filter(Boolean)
  return {
    sourceLabel: calendarSourceLabel(event),
    targetName,
    memoryKey: fact?.memoryKey || '',
    memoryRole: fact?.memoryRole || '',
    effectApplied: fact?.effectApplied === true,
    imported: Boolean(fact),
    recallSummary: memory?.recallSummary || memory?.displaySummary || fact?.summary || '',
    notes,
  }
}

const getRelationshipFeedbackForEvent = (eventId) =>
  relationshipFeedbackByEventId.value[eventId] || null

const setRelationshipFeedbackForEvent = (eventId, feedback = null) => {
  if (!eventId) return
  const nextFeedback = { ...relationshipFeedbackByEventId.value }
  if (feedback) {
    nextFeedback[eventId] = feedback
  } else {
    delete nextFeedback[eventId]
  }
  relationshipFeedbackByEventId.value = nextFeedback
}

const setEventRelationshipContact = (event, contactId) => {
  if (!event?.id) return
  calendarRelationshipDrafts.value = {
    ...calendarRelationshipDrafts.value,
    [event.id]: String(contactId || ''),
  }
  setRelationshipFeedbackForEvent(event.id, null)
}

const recordEventRelationship = (event) => {
  if (!event?.id) return
  const target = getSelectedRelationshipContact(event.id)
  if (!target) {
    setRelationshipFeedbackForEvent(event.id, {
      type: 'warning',
      className: 'calendar-feedback--warning',
      messageZh: 'Select a relationship contact first.',
      messageEn: 'Select a relationship contact first.',
    })
    return
  }

  const suggestion = calendarStore.buildEventRelationshipSuggestion(event.id, target)
  if (suggestion.imported) {
    setRelationshipFeedbackForEvent(event.id, {
      type: 'success',
      className: 'calendar-feedback--success',
      messageZh: 'Relationship fact already recorded.',
      messageEn: 'Relationship fact already recorded.',
    })
    return
  }

  const fact = calendarStore.recordEventRelationshipFact(event.id, target)
  setRelationshipFeedbackForEvent(
    event.id,
    fact
      ? {
          type: 'success',
          className: 'calendar-feedback--success',
          messageZh: 'Relationship fact recorded.',
          messageEn: 'Relationship fact recorded.',
        }
      : {
          type: 'warning',
          className: 'calendar-feedback--warning',
          messageZh: 'This event cannot be recorded as a relationship fact.',
          messageEn: 'This event cannot be recorded as a relationship fact.',
        },
  )
}

const syncReminderEvent = (reminder) => {
  if (!reminder?.id) return
  if (reminder.status === 'dismissed') {
    void calendarStore.cancelEventPushScheduledBySourceReminderId(reminder.id, {
      source: 'calendar_reminder_dismiss',
    })
    calendarStore.removeEventBySourceReminderId(reminder.id)
    return
  }
  if (reminder.status === 'confirmed' || reminder.pinned) {
    const event = calendarStore.upsertEventFromMapReminder(reminder)
    if (event?.id) {
      void calendarStore.ensureEventPushScheduled(event.id, {
        source: 'calendar_reminder_sync',
      })
    }
    return
  }
  void calendarStore.cancelEventPushScheduledBySourceReminderId(reminder.id, {
    source: 'calendar_reminder_remove',
  })
  calendarStore.removeEventBySourceReminderId(reminder.id)
}

const padDatePart = (value) => String(value).padStart(2, '0')

const formatDateTimeInput = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return ''
  const date = new Date(ts)
  return [
    date.getFullYear(),
    '-',
    padDatePart(date.getMonth() + 1),
    '-',
    padDatePart(date.getDate()),
    'T',
    padDatePart(date.getHours()),
    ':',
    padDatePart(date.getMinutes()),
  ].join('')
}

const parseDateTimeInput = (value) => {
  if (typeof value !== 'string' || !value.trim()) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const formatDateInput = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return ''
  const date = new Date(ts)
  return [
    date.getFullYear(),
    '-',
    padDatePart(date.getMonth() + 1),
    '-',
    padDatePart(date.getDate()),
  ].join('')
}

const parseDateInput = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 0
  const timestamp = new Date(`${value}T00:00:00`).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const getDefaultManualEventStart = (dayStartsAt) => {
  const dayStart = startOfCalendarDay(dayStartsAt || Date.now())
  const now = Date.now()
  const date = new Date(dayStart)
  if (isSameCalendarDay(dayStart, now)) {
    const current = new Date(now)
    const nextHalfHour = current.getMinutes() < 30 ? 30 : 60
    date.setHours(current.getHours(), nextHalfHour, 0, 0)
    if (nextHalfHour === 60) date.setMinutes(0)
    return date.getTime()
  }
  date.setHours(9, 0, 0, 0)
  return date.getTime()
}

const buildCalendarEditorDraft = ({ event = null, dayStartsAt = Date.now() } = {}) => {
  const startsAt = event?.startsAt || getDefaultManualEventStart(dayStartsAt)
  const endsAt = Math.max(startsAt + 60_000, event?.endsAt || startsAt + 60 * 60_000)
  const allDay = event?.allDay === true
  return {
    eventId: event?.id || '',
    titleZh: event?.titleZh || '',
    titleEn: event?.titleEn || '',
    notesZh: event?.notesZh || '',
    notesEn: event?.notesEn || '',
    allDay,
    startsAtInput: formatDateTimeInput(startsAt),
    endsAtInput: formatDateTimeInput(endsAt),
    startDate: formatDateInput(startsAt),
    endDate: formatDateInput(allDay ? Math.max(startsAt, endsAt - 1) : endsAt),
    recurrence: event?.recurrence || 'none',
    recurrenceUntilDate: formatDateInput(event?.recurrenceUntil || 0),
    requirement: event?.requirement || 'required',
    reminderLeadMinutes: Number(event?.reminderLeadMinutes || 0),
    locationRef: event?.locationRef ? { ...event.locationRef } : null,
    markerId: event?.markerId || '',
  }
}

const openCreateCalendarEvent = (dayStartsAt = selectedCalendarDate.value) => {
  editorMode.value = 'create'
  editorValidationMessage.value = ''
  editorDraft.value = buildCalendarEditorDraft({ dayStartsAt })
  editorOpen.value = true
}

const openEditCalendarEvent = (event = selectedSourceEvent.value) => {
  const source = event?.sourceEventId
    ? calendarStore.findEventById(event.sourceEventId)
    : calendarStore.findEventById(event?.id)
  if (!source) return
  editorMode.value = 'edit'
  editorValidationMessage.value = ''
  editorDraft.value = buildCalendarEditorDraft({ event: source })
  editorOpen.value = true
}

const closeCalendarEventEditor = () => {
  if (editorSaving.value) return
  editorOpen.value = false
  editorValidationMessage.value = ''
}

const openScheduleHandoffEditor = () => {
  const handoff = calendarScheduleHandoffDraft.value
  const resolution = calendarScheduleHandoffResolution.value
  if (
    !handoff ||
    ![
      SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_NEW,
      SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_SOURCE_CHANGE,
    ].includes(resolution?.decision) ||
    (!resolution.mayCreateAfterReview && !resolution.mayUpdateAfterReview)
  ) {
    return
  }
  const existing = calendarScheduleHandoffExistingEvent.value
  editorMode.value = existing ? 'handoff_update' : 'create'
  editorValidationMessage.value = ''
  editorDraft.value = {
    ...buildCalendarEditorDraft({
      event: {
        ...(existing || {}),
        titleZh: handoff.proposedTitleZh,
        titleEn: handoff.proposedTitleEn,
        startsAt: handoff.proposedStartsAt,
        endsAt: handoff.proposedEndsAt,
        locationRef: handoff.proposedLocationRef,
      },
    }),
    scheduleHandoffId: handoff.id,
    eventId: existing?.id || '',
  }
  editorOpen.value = true
}

const focusCalendarEvent = (event) => {
  if (!event?.id || !event.startsAt) return
  calendarAnchorAt.value = event.startsAt
  selectedCalendarDate.value = startOfCalendarDay(event.startsAt)
  selectedEventId.value = event.id
  selectedOccurrenceId.value = `${event.id}::${event.startsAt}`
  hasResolvedInitialCalendarSelection.value = true
}

watch(
  [calendarScheduleHandoffDraft, calendarScheduleHandoffResolution],
  ([handoff, resolution]) => {
    if (!handoff || !resolution) return
    if (resolution.decision === SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REUSE_CONFIRMED) {
      editorOpen.value = false
      focusCalendarEvent(calendarScheduleHandoffExistingEvent.value)
      return
    }
    const reviewId = `${handoff.id}::${handoff.sourceRevision}`
    if (
      ![
        SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_NEW,
        SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_SOURCE_CHANGE,
      ].includes(resolution.decision) ||
      openedScheduleHandoffId.value === reviewId
    ) {
      return
    }
    openedScheduleHandoffId.value = reviewId
    openScheduleHandoffEditor()
  },
  { immediate: true },
)

const saveCalendarEventEditor = () => {
  const draft = editorDraft.value || {}
  const titleZh = String(draft.titleZh || '').trim()
  const titleEn = String(draft.titleEn || '').trim()
  if (!titleZh && !titleEn) {
    editorValidationMessage.value = t(
      '请至少填写一个标题。',
      'Enter at least one title.',
    )
    return
  }

  let startsAt = 0
  let endsAt = 0
  if (draft.allDay) {
    startsAt = parseDateInput(draft.startDate)
    const inclusiveEnd = parseDateInput(draft.endDate)
    endsAt = inclusiveEnd ? addCalendarDays(inclusiveEnd, 1) : 0
  } else {
    startsAt = parseDateTimeInput(draft.startsAtInput)
    endsAt = parseDateTimeInput(draft.endsAtInput)
  }
  if (!startsAt || !endsAt || endsAt <= startsAt) {
    editorValidationMessage.value = t(
      '结束时间必须晚于开始时间。',
      'The end must be later than the start.',
    )
    return
  }

  const recurrence = draft.recurrence || 'none'
  const recurrenceUntil =
    recurrence === 'none' || !draft.recurrenceUntilDate
      ? 0
      : endOfCalendarDay(parseDateInput(draft.recurrenceUntilDate))
  if (recurrenceUntil && recurrenceUntil < startsAt) {
    editorValidationMessage.value = t(
      '重复结束日期不能早于第一次安排。',
      'The recurrence end cannot be before the first event.',
    )
    return
  }

  editorSaving.value = true
  editorValidationMessage.value = ''
  const payload = {
    titleZh: titleZh || titleEn,
    titleEn: titleEn || titleZh,
    notesZh: String(draft.notesZh || '').trim(),
    notesEn: String(draft.notesEn || '').trim(),
    startsAt,
    endsAt,
    allDay: draft.allDay === true,
    recurrence,
    recurrenceUntil,
    requirement: draft.requirement || 'required',
    reminderLeadMinutes: Number(draft.reminderLeadMinutes || 0),
    locationRef: draft.locationRef ? { ...draft.locationRef } : null,
    markerId: String(draft.markerId || '').trim(),
  }

  let savedEvent = null
  if (editorMode.value === 'edit' && draft.eventId) {
    savedEvent = calendarStore.updateEventDetails(draft.eventId, payload)
  } else if (
    draft.scheduleHandoffId &&
    draft.scheduleHandoffId === calendarScheduleHandoffDraft.value?.id
  ) {
    savedEvent = calendarStore.createEventFromScheduleHandoff({
      event: payload,
      handoffDraft: calendarScheduleHandoffDraft.value,
    })
  } else {
    savedEvent = calendarStore.createManualEvent(payload)
  }

  if (!savedEvent) {
    editorSaving.value = false
    editorValidationMessage.value = t(
      '这项安排没有保存成功，请检查输入。',
      'The event could not be saved. Check the entered values.',
    )
    return
  }

  if (editorMode.value === 'edit' || editorMode.value === 'handoff_update') {
    void calendarStore.rescheduleEventPush(savedEvent.id, {
      source: 'calendar_event_editor_update',
    })
  } else {
    void calendarStore.ensureEventPushScheduled(savedEvent.id, {
      source: 'calendar_event_editor_create',
    })
  }

  calendarAnchorAt.value = startsAt
  selectedCalendarDate.value = startOfCalendarDay(startsAt)
  selectedEventId.value = savedEvent.id
  selectedOccurrenceId.value = `${savedEvent.id}::${startsAt}`
  editorSaving.value = false
  editorOpen.value = false
}

const resolveSourceCalendarEvent = (event) =>
  calendarStore.findEventById(event?.sourceEventId || event?.id)

const updateEventOccurrenceStartsAt = (event, nextOccurrenceStartsAt) => {
  const source = resolveSourceCalendarEvent(event)
  if (!source || !event?.startsAt || !nextOccurrenceStartsAt) return false
  const occurrenceDelta = nextOccurrenceStartsAt - event.startsAt
  return calendarStore.setEventStartsAt(source.id, source.startsAt + occurrenceDelta)
}

const updateEventStartsAt = (event, value) => {
  const startsAt = parseDateTimeInput(value)
  if (startsAt <= 0) return
  const source = resolveSourceCalendarEvent(event)
  if (source && updateEventOccurrenceStartsAt(event, startsAt)) {
    void calendarStore.rescheduleEventPush(source.id, {
      source: 'calendar_event_time_edit',
    })
  }
}

const shiftEventStartsAt = (event, offsetMs) => {
  const startsAt = Math.max(0, Number(event.startsAt || 0))
  if (startsAt <= 0) return
  const source = resolveSourceCalendarEvent(event)
  if (source && updateEventOccurrenceStartsAt(event, startsAt + offsetMs)) {
    void calendarStore.rescheduleEventPush(source.id, {
      source: 'calendar_event_time_shift',
    })
  }
}

const resetEventStartsAt = (event) => {
  const source = resolveSourceCalendarEvent(event)
  if (source && calendarStore.resetEventStartsAt(source.id)) {
    void calendarStore.rescheduleEventPush(source.id, {
      source: 'calendar_event_time_reset',
    })
  }
}

const isEventTimeEdited = (event) => Number(event.timeEditedAt || 0) > 0

const deleteCalendarEvent = (event) => {
  if (!event?.id) return
  if (event.sourceReminderId) {
    void calendarStore.cancelEventPushScheduledBySourceReminderId(event.sourceReminderId, {
      source: 'calendar_event_delete',
    })
  } else {
    void calendarStore.cancelEventPushScheduled({
      eventId: event.id,
      source: 'calendar_event_delete',
    })
  }
  if (!calendarStore.removeEventById(event.id)) return
  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.CALENDAR_CONFIRMED_EVENT,
    event.id,
  )
  const nextDrafts = { ...calendarRelationshipDrafts.value }
  delete nextDrafts[event.id]
  calendarRelationshipDrafts.value = nextDrafts
  setRelationshipFeedbackForEvent(event.id, null)
}

const getEventPushHistory = (event) =>
  Array.isArray(event?.pushHistory) ? event.pushHistory.slice(0, 3) : []

const getCalendarQuietHoursLabel = () => {
  const runtime = calendarPushRuntime.value
  if (!runtime.quietHoursEnabled) {
    return t('AI 安静时段未启用。', 'AI quiet hours are off.')
  }
  const windowText = `${runtime.quietHoursStart}-${runtime.quietHoursEnd}`
  if (runtime.quietHoursActive) {
    return t(
      `AI 安静时段生效中（${windowText}）；Calendar 定时推送仍按已排程时间执行。`,
      `AI quiet hours are active (${windowText}); Calendar scheduled push still follows its armed time.`,
    )
  }
  return t(
    `AI 安静时段为 ${windowText}；该策略不会暂停已安排的 Calendar 推送。`,
    `AI quiet hours are ${windowText}; this policy does not pause armed Calendar push schedules.`,
  )
}

const formatPushReason = (reason) => {
  if (reason === 'real_push_disabled') return t('真实推送未就绪', 'Real push not ready')
  if (reason === 'server_url_missing') return t('推送服务地址缺失', 'Push server URL missing')
  if (reason === 'schedule_failed') return t('排程失败', 'Schedule failed')
  if (reason === 'cancel_schedule_failed') return t('取消排程失败', 'Cancel schedule failed')
  if (reason === 'network_error') return t('推送服务连接失败', 'Push service network error')
  return reason || t('暂无异常', 'No error')
}

const getCalendarPushStatusMeta = (event) => {
  const source = resolveSourceCalendarEvent(event) || event
  const expectedReminderAt = getNextCalendarEventReminderAt(source, departureNow.value)
  if (source.scheduledPushId && source.scheduledPushAt === expectedReminderAt) {
    return {
      labelZh: '已排程',
      labelEn: 'Scheduled',
      className: 'calendar-status--success',
    }
  }
  if (source.pushStatus === 'needs_reschedule') {
    return {
      labelZh: '待重排',
      labelEn: 'Reschedule pending',
      className: 'calendar-status--warning',
    }
  }
  if (
    source.lastPushError ||
    source.pushStatus === 'failed' ||
    source.pushStatus === 'cancel_failed'
  ) {
    return {
      labelZh: '排程异常',
      labelEn: 'Schedule issue',
      className: 'calendar-status--danger',
    }
  }
  if (!calendarPushRuntime.value.ready) {
    return {
      labelZh: '未就绪',
      labelEn: 'Not ready',
      className: 'calendar-status--neutral',
    }
  }
  if (source.pushStatus === 'cancelled') {
    return {
      labelZh: '已取消',
      labelEn: 'Cancelled',
      className: 'calendar-status--neutral',
    }
  }
  return {
    labelZh: '待排程',
    labelEn: 'Pending',
    className: 'calendar-status--info',
  }
}

const getCalendarPushDetail = (event) => {
  const source = resolveSourceCalendarEvent(event) || event
  const expectedReminderAt = getNextCalendarEventReminderAt(source, departureNow.value)
  if (source.scheduledPushId && source.scheduledPushAt === expectedReminderAt) {
    return t(
      `提醒时间：${formatDateTime(source.scheduledPushAt)}`,
      `Reminder time: ${formatDateTime(source.scheduledPushAt)}`,
    )
  }
  if (source.lastPushError) {
    return t(
      `原因：${formatPushReason(source.lastPushError)}`,
      `Reason: ${formatPushReason(source.lastPushError)}`,
    )
  }
  if (!calendarPushRuntime.value.ready) {
    return t(calendarPushRuntime.value.detailZh, calendarPushRuntime.value.detailEn)
  }
  if (source.pushStatus === 'cancelled') {
    return t('最近一次排程已取消。', 'The most recent schedule was cancelled.')
  }
  return t(
    '等待下一次同步或手动调整后排程。',
    'Waiting for the next sync or time edit to schedule.',
  )
}

const formatPushHistoryEntry = (entry) => {
  const action = entry.action === 'cancel' ? t('取消', 'Cancel') : t('排程', 'Schedule')
  const status = entry.status === 'ok' ? t('成功', 'ok') : t('失败', 'failed')
  return `${action} ${status} · ${formatDateTime(entry.createdAt)}`
}

const formatDateTime = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return t('待定', 'TBD')
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatCalendarEventRange = (event = {}) => {
  const startsAt = Number(event.startsAt)
  const endsAt = Number(event.endsAt)
  if (!Number.isFinite(startsAt) || startsAt <= 0) return t('待定', 'TBD')
  const startDate = new Date(startsAt)
  const safeEndsAt = Number.isFinite(endsAt) && endsAt > startsAt ? endsAt : startsAt
  const endDate = new Date(event.allDay ? Math.max(startsAt, safeEndsAt - 1) : safeEndsAt)
  const sameDay = isSameCalendarDay(startsAt, endDate.getTime())
  if (event.allDay) {
    const startLabel = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
    if (sameDay) return t(`${startLabel} · 全天`, `${startLabel} · All day`)
    const endLabel = endDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
    return t(`${startLabel} – ${endLabel} · 全天`, `${startLabel} – ${endLabel} · All day`)
  }
  if (sameDay) {
    return `${startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  return `${formatDateTime(startsAt)} – ${formatDateTime(safeEndsAt)}`
}

const formatClockTime = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return '--:--'
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getDepartureTransportLabel = (mode, projection) => {
  const mapPack = mapPacks.value.find((pack) => pack.id === projection?.origin?.mapPackId)
  return mapPack?.kind === 'real'
    ? t(mode.labelZh, mode.labelEn)
    : t(mode.neutralLabelZh, mode.neutralLabelEn)
}

watch(
  mapCalendarReminders,
  (reminders) => {
    reminders.forEach((reminder) => syncReminderEvent(reminder))
  },
  { immediate: true, deep: true },
)

watch(
  [calendarOccurrences, selectedCalendarDate],
  ([occurrences, dayStartsAt]) => {
    const dayOccurrences = calendarOccurrencesForDay(occurrences, dayStartsAt)
    const current = dayOccurrences.find(
      (occurrence) => occurrence.occurrenceId === selectedOccurrenceId.value,
    )
    if (current) {
      hasResolvedInitialCalendarSelection.value = true
      selectedEventId.value = current.sourceEventId
      return
    }
    const first = dayOccurrences[0] || null
    if (!first && !hasResolvedInitialCalendarSelection.value && occurrences.length > 0) {
      const now = Date.now()
      const nearest =
        occurrences.find((occurrence) => occurrence.endsAt >= now) || occurrences[0]
      selectedCalendarDate.value = startOfCalendarDay(nearest.startsAt)
      selectedEventId.value = nearest.sourceEventId
      selectedOccurrenceId.value = nearest.occurrenceId
      hasResolvedInitialCalendarSelection.value = true
      return
    }
    selectedEventId.value = first?.sourceEventId || ''
    selectedOccurrenceId.value = first?.occurrenceId || ''
    if (first) hasResolvedInitialCalendarSelection.value = true
  },
  { immediate: true },
)

watch(
  [confirmedEvents, () => route.query.calendarEventId],
  ([events, requestedEventId]) => {
    const eventId = typeof requestedEventId === 'string' ? requestedEventId.trim() : ''
    if (!eventId || selectedEventId.value === eventId) return
    const event = events.find((candidate) => candidate.id === eventId)
    if (!event) return
    calendarAnchorAt.value = event.startsAt
    selectedCalendarDate.value = startOfCalendarDay(event.startsAt)
    selectedEventId.value = event.id
    selectedOccurrenceId.value = `${event.id}::${event.startsAt}`
    hasResolvedInitialCalendarSelection.value = true
  },
  { immediate: true },
)

const applyCalendarDateQuery = (value) => {
  if (route.query.calendarEventId) return
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || !raw.trim()) return
  const parsed = parseDateInput(raw.trim().slice(0, 10))
  if (!parsed) return
  calendarAnchorAt.value = parsed
  selectedCalendarDate.value = startOfCalendarDay(parsed)
  hasResolvedInitialCalendarSelection.value = true
}

watch(
  () => route.query.date,
  (value) => {
    if (value) applyCalendarDateQuery(value)
  },
  { immediate: true },
)

const formatCalendarDateQuery = (timestamp) => {
  const date = new Date(timestamp)
  const padValue = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${padValue(date.getMonth() + 1)}-${padValue(date.getDate())}`
}

const openAgendaJourneyForSelectedDay = () => {
  router.push({
    path: '/agenda-journey',
    query: {
      source: 'calendar',
      date: formatCalendarDateQuery(selectedCalendarDate.value),
      ...(route.query.homePage ? { homePage: route.query.homePage } : {}),
    },
  })
}

watch(
  [() => calendarPushRuntime.value.ready, () => calendarStore.hasFinishedStorageHydration],
  ([ready, hydrated]) => {
    if (!ready || !hydrated) return
    const now = Date.now()
    confirmedEvents.value.forEach((event) => {
      const reminderAt = getNextCalendarEventReminderAt(event, now)
      if (!reminderAt || reminderAt < now) return
      if (event.scheduledPushId && event.scheduledPushAt !== reminderAt) {
        void calendarStore.rescheduleEventPush(event.id, {
          source: 'calendar_view_rearm',
        })
        return
      }
      void calendarStore.ensureEventPushScheduled(event.id, {
        source: 'calendar_view_open',
      })
    })
  },
  { immediate: true },
)

onMounted(() => {
  departureClockTimer = setInterval(() => {
    departureNow.value = Date.now()
  }, 30_000)
})

onBeforeUnmount(() => {
  if (departureClockTimer) {
    clearInterval(departureClockTimer)
    departureClockTimer = null
  }
})
</script>

<template>
  <div class="calendar-page" data-testid="calendar-page">
    <header class="calendar-header">
      <button type="button" class="calendar-back-button" @click="goHome">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
        <span>{{ calendarBackLabel }}</span>
      </button>
      <h1 class="calendar-page-title">{{ calendarTitle }}</h1>
      <button
        type="button"
        class="calendar-appearance-button"
        :aria-label="t('日历外观', 'Calendar appearance')"
        :title="t('日历外观', 'Calendar appearance')"
        data-testid="calendar-appearance-open"
        @click="openCalendarAppearance"
      >
        <i class="fas fa-gear" aria-hidden="true"></i>
      </button>
    </header>

    <main class="calendar-content">
      <CalendarWorkspace
        :view-mode="calendarViewMode"
        :anchor-at="calendarAnchorAt"
        :selected-date="selectedCalendarDate"
        :occurrences="calendarOccurrences"
        :selected-event-id="selectedEventId"
        :selected-occurrence-id="selectedOccurrenceId"
        :markers="calendarMarkers"
        :color-preset="calendarColorPreset"
        :glyph-style="calendarGlyphStyle"
        @update-view="updateCalendarView"
        @shift-period="shiftCalendarPeriod"
        @go-today="goToCalendarToday"
        @select-day="selectCalendarDay"
        @select-event="selectCalendarOccurrence"
        @create-event="openCreateCalendarEvent"
        @open-agenda-journey="openAgendaJourneyForSelectedDay"
      />

      <section
        v-if="calendarSourceHandoff"
        class="calendar-source-handoff"
        data-testid="calendar-source-handoff"
        :data-source="calendarSourceHandoff.source"
      >
        <span class="calendar-source-handoff__icon" aria-hidden="true">
          <i :class="calendarSourceHandoff.icon"></i>
        </span>
        <div class="calendar-source-handoff__copy">
          <p>{{ t(calendarSourceHandoff.eyebrowZh, calendarSourceHandoff.eyebrowEn) }}</p>
          <h2>{{ t(calendarSourceHandoff.titleZh, calendarSourceHandoff.titleEn) }}</h2>
          <span>{{ t(calendarSourceHandoff.descriptionZh, calendarSourceHandoff.descriptionEn) }}</span>
        </div>
        <div class="calendar-source-handoff__actions">
          <button
            v-if="calendarSourceHandoff.canReview"
            type="button"
            class="calendar-action calendar-source-handoff__review"
            data-testid="calendar-source-handoff-review"
            @click="openScheduleHandoffEditor"
          >
            {{ t(calendarSourceHandoff.reviewZh, calendarSourceHandoff.reviewEn) }}
          </button>
          <button
            type="button"
            class="calendar-action calendar-source-handoff__return"
            data-testid="calendar-source-handoff-return"
            @click="goHome"
          >
            {{ t(calendarSourceHandoff.returnZh, calendarSourceHandoff.returnEn) }}
          </button>
        </div>
      </section>

      <section
        class="calendar-panel calendar-overview"
        :class="calendarOverviewClass"
        data-testid="calendar-schedule-overview"
      >
        <p class="calendar-overview__eyebrow">
          {{ calendarOverviewEyebrow }}
        </p>
        <h2 class="calendar-overview__title">
          {{ calendarOverviewTitle }}
        </h2>
        <p class="calendar-overview__description">
          {{ calendarOverviewDescription }}
        </p>

        <div
          v-if="calendarWorldAppContext"
          class="calendar-world-context"
          data-testid="calendar-world-app-context"
          :data-world-pack="calendarWorldAppContext.packId"
          :data-world-app="calendarWorldAppContext.bindingId"
        >
          <div class="calendar-world-context__header">
            <div class="calendar-world-context__identity">
              <span class="calendar-world-context__icon" aria-hidden="true">
                <i :class="calendarWorldAppContext.icon"></i>
              </span>
              <div class="calendar-world-context__copy">
                <p class="calendar-world-context__title">
                  {{ calendarWorldAppContext.bindingTitle }}
                </p>
                <p class="calendar-world-context__target">
                  {{ calendarWorldAppContext.targetLabel }}
                </p>
              </div>
            </div>
            <span class="calendar-world-context__type">
              {{ calendarWorldAppContext.archetype }}
            </span>
          </div>
          <p class="calendar-world-context__description">
            {{ calendarWorldAppContext.description || calendarWorldAppContext.boundaryCopy }}
          </p>
        </div>

        <div class="calendar-overview__summary">
          <div class="calendar-overview__metric calendar-overview__metric--events">
            <p>{{ t('日程', 'Events') }}</p>
            <strong>{{ calendarEventCount }}</strong>
          </div>
          <div class="calendar-overview__metric calendar-overview__metric--pending">
            <p>{{ t('待处理', 'Pending') }}</p>
            <strong>{{ pendingReminderCount }}</strong>
          </div>
          <div
            class="calendar-overview__metric calendar-overview__metric--push"
            :class="calendarPushRuntime.toneClass"
          >
            <p>{{ t('推送', 'Push') }}</p>
            <strong>{{ t(calendarPushRuntime.labelZh, calendarPushRuntime.labelEn) }}</strong>
          </div>
        </div>
      </section>

      <section
        v-if="selectedEventPresentation"
        class="calendar-schedule-section"
        data-testid="calendar-selected-event-detail"
      >
        <div class="calendar-section-header calendar-section-header--detail">
          <div class="calendar-section-header__copy">
            <p class="calendar-section-kicker">{{ t('选中安排', 'Selected event') }}</p>
            <h2 class="calendar-section-title">{{ t('详情与准备', 'Details and preparation') }}</h2>
          </div>
          <div class="calendar-section-header__actions">
            <button
              v-if="selectedEventPresentation.sourceRef"
              type="button"
              class="calendar-action calendar-action--source"
              data-testid="calendar-view-event-source"
              @click="openSelectedEventSource"
            >
              <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
              <span>{{ t('查看来源', 'View source') }}</span>
            </button>
            <button
              type="button"
              class="calendar-action calendar-action--edit"
              data-testid="calendar-edit-selected-event"
              @click="openEditCalendarEvent(selectedEventPresentation)"
            >
              <i class="fas fa-pen" aria-hidden="true"></i>
              <span>{{ t('编辑', 'Edit') }}</span>
            </button>
          </div>
        </div>

        <div class="calendar-push-summary">
          <div class="calendar-push-summary__header">
            <span class="calendar-push-summary__title">
              {{ t('真实推送状态', 'Real push status') }}
            </span>
            <span class="calendar-status" :class="calendarPushRuntime.toneClass">
              {{ t(calendarPushRuntime.labelZh, calendarPushRuntime.labelEn) }}
            </span>
          </div>
          <p>{{ t(calendarPushRuntime.detailZh, calendarPushRuntime.detailEn) }}</p>
          <p>{{ getCalendarQuietHoursLabel() }}</p>
        </div>

        <div class="calendar-event-list">
          <CalendarEventCard
            :key="selectedEventPresentation.occurrenceId"
            :event="selectedEventPresentation"
            :markers="calendarMarkers"
            :color-preset="calendarColorPreset"
            :related-knowledge-points="getRelatedKnowledgePoints(eventKnowledgePoints, selectedEventPresentation.id)"
            :formatted-starts-at="formatCalendarEventRange(selectedEventPresentation)"
            :formatted-input-starts-at="formatDateTimeInput(selectedEventPresentation.startsAt)"
            :is-time-edited="isEventTimeEdited(selectedEventPresentation)"
            :quick-shift-options="eventTimeQuickShiftOptions"
            :push-status-meta="getCalendarPushStatusMeta(selectedEventPresentation)"
            :push-detail="getCalendarPushDetail(selectedEventPresentation)"
            :push-history="getEventPushHistory(selectedEventPresentation)"
            :departure-projection="getDepartureProjection(selectedEventPresentation.id)"
            :departure-transport-modes="departureTransportModes"
            :selected-departure-mode="getDepartureMode(selectedEventPresentation.id)"
            :active-journey="getActiveJourneyForEvent(selectedEventPresentation.id)"
            :other-journey-active="hasOtherActiveJourney(selectedEventPresentation.id)"
            :departure-feedback="getDepartureFeedback(selectedEventPresentation.id)"
            :relationship-contact-options="relationshipContactOptions"
            :selected-relationship-contact-id="calendarRelationshipDrafts[selectedEventPresentation.id] || ''"
            :relationship-suggestion="getEventRelationshipSuggestion(selectedEventPresentation)"
            :relationship-review="getCalendarEventRelationshipReview(selectedEventPresentation)"
            :relationship-feedback="getRelationshipFeedbackForEvent(selectedEventPresentation.id)"
            :format-push-history-entry="formatPushHistoryEntry"
            :format-date-time="formatDateTime"
            :format-clock-time="formatClockTime"
            :get-departure-transport-label="getDepartureTransportLabel"
            @update-starts-at="updateEventStartsAt"
            @shift-starts-at="shiftEventStartsAt"
            @reset-starts-at="resetEventStartsAt"
            @delete-event="deleteCalendarEvent"
            @update-departure-mode="updateDepartureMode"
            @start-travel="startEventTravel"
            @open-journey="openEventJourney"
            @open-worldbook="(pointIds) => openWorldBook({ pointIds })"
            @update-relationship-contact="setEventRelationshipContact"
            @record-relationship="recordEventRelationship"
          />
        </div>
      </section>

      <section
        class="calendar-panel calendar-reminders-boundary"
        data-testid="calendar-reminder-summary"
      >
        <div class="calendar-section-header calendar-section-header--action">
          <div class="calendar-section-header__copy">
            <p class="calendar-section-kicker">{{ t('提醒事项', 'Reminders') }}</p>
            <h2 class="calendar-section-title">{{ t('待确认事项', 'Waiting for confirmation') }}</h2>
          </div>
          <button
            type="button"
            class="calendar-action calendar-action--reminders"
            data-testid="calendar-open-reminders"
            @click="openReminders"
          >
            {{ t('打开提醒事项', 'Open Reminders') }}
          </button>
        </div>
        <div class="calendar-cue-sources">
          <div
            v-for="source in reminderSummaryItems"
            :key="source.key"
            class="calendar-cue-source"
            :data-testid="`calendar-reminder-source-${source.key}`"
          >
            <p>{{ t(source.labelZh, source.labelEn) }}</p>
            <strong :class="source.className">{{ source.count }}</strong>
          </div>
        </div>
        <p class="calendar-reminders-boundary__description">
          {{
            pendingReminderCount > 0
              ? t(
                  '确认、固定或忽略都在提醒事项里处理。',
                  'Confirm, pin, or dismiss them in Reminders.',
                )
              : t('暂无待处理提醒事项。', 'No pending reminders.')
          }}
        </p>
      </section>

      <section class="calendar-panel calendar-map-boundary">
        <div class="calendar-map-boundary__layout">
          <div class="calendar-map-boundary__copy">
            <p class="calendar-map-boundary__title">
              {{ t('地图反馈', 'Map feedback') }}
            </p>
            <p class="calendar-map-boundary__description">
              {{
                t(
                  `${mapAreaFeedback.length} 条地点反馈可转成提醒`,
                  `${mapAreaFeedback.length} feedback notes can become reminders`,
                )
              }}
            </p>
          </div>
          <button type="button" class="calendar-action calendar-action--map" @click="openMap">
            {{ t('打开地图', 'Open Map') }}
          </button>
        </div>
      </section>
    </main>

    <CalendarEventEditor
      v-model="editorDraft"
      :open="editorOpen"
      :mode="editorMode"
      :places="activeMapAllPlaces"
      :markers="calendarMarkers"
      :color-preset="calendarColorPreset"
      :validation-message="editorValidationMessage"
      :saving="editorSaving"
      @save="saveCalendarEventEditor"
      @cancel="closeCalendarEventEditor"
    />
  </div>
</template>

<style scoped>
.calendar-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--system-text);
  background: var(--system-page-bg);
}

.calendar-header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 48px 16px 12px;
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  box-shadow: var(--system-shadow-chrome);
}

.calendar-back-button,
.calendar-action {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    color var(--system-motion-fast),
    background var(--system-motion-fast),
    border-color var(--system-motion-fast),
    box-shadow var(--system-motion-fast);
}

.calendar-back-button {
  min-width: 0;
  gap: 6px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--system-radius-sm);
  color: var(--system-accent);
  background: transparent;
  font-size: 14px;
  font-weight: 650;
}

.calendar-back-button span,
.calendar-page-title {
  overflow-wrap: anywhere;
}

.calendar-page-title {
  min-width: 0;
  margin: 0;
  font-size: 17px;
  font-weight: 750;
  flex: 1;
}

.calendar-appearance-button {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  color: var(--system-text-muted);
  background: transparent;
  font: inherit;
  cursor: pointer;
  transition:
    color var(--system-motion-fast),
    background var(--system-motion-fast);
}

.calendar-appearance-button:hover {
  color: var(--system-accent);
  background: var(--system-hover-bg);
}

.calendar-content {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 24px 20px calc(24px + env(safe-area-inset-bottom));
}

.calendar-panel {
  padding: 16px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.calendar-source-handoff {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--system-border);
  border-left: 4px solid var(--system-accent);
  border-radius: var(--system-radius-sm);
  background: var(--system-surface-muted);
}

.calendar-source-handoff__icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.calendar-source-handoff__copy {
  min-width: 0;
}

.calendar-source-handoff__copy p,
.calendar-source-handoff__copy h2,
.calendar-source-handoff__copy span {
  margin: 0;
  overflow-wrap: anywhere;
}

.calendar-source-handoff__copy p {
  color: var(--system-accent);
  font-size: 11px;
  font-weight: 750;
}

.calendar-source-handoff__copy h2 {
  margin-top: 3px;
  font-size: 16px;
  line-height: 1.25;
}

.calendar-source-handoff__copy span {
  display: block;
  margin-top: 4px;
  color: var(--system-text-muted);
  font-size: 13px;
  line-height: 1.45;
}

.calendar-source-handoff__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-source-handoff__review,
.calendar-source-handoff__return {
  padding: 0 14px;
  border: 1px solid var(--system-border);
  border-radius: var(--system-radius-sm);
  color: var(--system-accent);
  background: var(--system-panel-bg);
  font-size: 13px;
  font-weight: 700;
}

.calendar-source-handoff__review {
  border-color: var(--system-accent);
  color: var(--system-accent-contrast, #fff);
  background: var(--system-accent);
}

.calendar-overview__eyebrow,
.calendar-overview__title,
.calendar-overview__description,
.calendar-world-context__title,
.calendar-world-context__target,
.calendar-world-context__description,
.calendar-overview__metric p,
.calendar-section-kicker,
.calendar-section-title,
.calendar-push-summary p,
.calendar-cue-source p,
.calendar-reminders-boundary__description,
.calendar-empty-events__title,
.calendar-empty-events__description,
.calendar-map-boundary__title,
.calendar-map-boundary__description {
  margin: 0;
}

.calendar-overview__eyebrow {
  color: var(--system-accent);
  font-size: 12px;
  font-weight: 750;
}

.calendar-overview--world .calendar-overview__eyebrow {
  color: var(--system-info);
}

.calendar-overview__title {
  margin-top: 8px;
  overflow-wrap: anywhere;
  font-size: 19px;
  line-height: 1.4;
  font-weight: 760;
}

.calendar-overview__description {
  margin-top: 8px;
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.65;
}

.calendar-world-context {
  margin-top: 12px;
  padding-block: 12px;
  border-block: 1px solid var(--system-subtle-border);
}

.calendar-world-context__header,
.calendar-world-context__identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.calendar-world-context__header {
  justify-content: space-between;
}

.calendar-world-context__identity,
.calendar-world-context__copy {
  min-width: 0;
}

.calendar-world-context__icon {
  width: 36px;
  height: 36px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--system-radius-sm);
  color: var(--system-info);
  background: var(--system-info-soft);
}

.calendar-world-context__title,
.calendar-world-context__target,
.calendar-world-context__type,
.calendar-world-context__description {
  overflow-wrap: anywhere;
}

.calendar-world-context__title {
  font-size: 12px;
  font-weight: 700;
}

.calendar-world-context__target,
.calendar-world-context__description {
  color: var(--system-text-muted);
  font-size: 11px;
}

.calendar-world-context__target {
  margin-top: 2px;
}

.calendar-world-context__type {
  flex: none;
  max-width: 42%;
  padding: 5px 8px;
  border-radius: 999px;
  color: var(--system-info);
  background: var(--system-info-soft);
  font-size: 10px;
  font-weight: 700;
  text-align: center;
}

.calendar-world-context__description {
  margin-top: 8px;
  line-height: 1.55;
}

.calendar-overview__summary {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--system-subtle-border);
  border-radius: var(--system-radius-sm);
  background: var(--system-surface-muted);
}

.calendar-overview__metric {
  min-width: 0;
  padding: 10px 12px;
}

.calendar-overview__metric + .calendar-overview__metric {
  border-left: 1px solid var(--system-subtle-border);
}

.calendar-overview__metric p {
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 10px;
  line-height: 1.4;
}

.calendar-overview__metric strong {
  display: block;
  margin-top: 2px;
  overflow-wrap: anywhere;
  font-size: 17px;
  line-height: 1.35;
}

.calendar-overview__metric--events strong {
  color: var(--system-accent);
}

.calendar-overview__metric--pending strong {
  color: var(--system-warning);
}

.calendar-overview__metric--push strong {
  font-size: 12px;
}

.calendar-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.calendar-section-header__copy {
  min-width: 0;
}

.calendar-section-header__actions {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

.calendar-section-header__actions .calendar-action {
  max-width: none;
}

.calendar-section-kicker {
  color: var(--system-text-muted);
  font-size: 12px;
}

.calendar-section-title {
  margin-top: 2px;
  overflow-wrap: anywhere;
  font-size: 15px;
  font-weight: 720;
}

.calendar-section-count,
.calendar-status {
  flex: none;
  max-width: 46%;
  padding: 5px 8px;
  border-radius: 999px;
  overflow-wrap: anywhere;
  font-size: 10px;
  line-height: 1.35;
  font-weight: 700;
  text-align: center;
}

.calendar-section-count {
  color: var(--system-success);
  background: var(--system-success-soft);
}

.calendar-push-summary {
  margin-top: 12px;
  padding-block: 12px;
  border-block: 1px solid var(--system-subtle-border);
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.55;
}

.calendar-push-summary__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.calendar-push-summary__title {
  color: var(--system-text);
  font-weight: 700;
}

.calendar-push-summary p {
  margin-top: 5px;
  overflow-wrap: anywhere;
}

.calendar-event-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.calendar-schedule-section {
  padding-block: 2px;
}

.calendar-empty-events {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border-style: dashed;
}

.calendar-empty-events__icon {
  width: 40px;
  height: 40px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--system-radius-sm);
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.calendar-empty-events__copy {
  min-width: 0;
}

.calendar-empty-events__title {
  overflow-wrap: anywhere;
  font-size: 15px;
  font-weight: 700;
}

.calendar-empty-events__description {
  margin-top: 5px;
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.calendar-section-header--action {
  align-items: center;
}

.calendar-action {
  max-width: 48%;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  overflow-wrap: anywhere;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 700;
  text-align: center;
}

.calendar-action--reminders {
  border-color: color-mix(in srgb, var(--system-warning) 26%, transparent);
  color: var(--system-warning);
  background: var(--system-warning-soft);
}

.calendar-action--source,
.calendar-action--edit {
  flex: none;
  gap: 7px;
  border-color: color-mix(in srgb, var(--system-accent) 28%, transparent);
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.calendar-action--source {
  border-color: var(--system-border);
  color: var(--system-text-muted);
  background: var(--system-panel-bg);
}

.calendar-cue-sources {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-block: 1px solid var(--system-subtle-border);
}

.calendar-cue-source {
  min-width: 0;
  padding: 10px 4px;
}

.calendar-cue-source:nth-child(even) {
  padding-left: 12px;
  border-left: 1px solid var(--system-subtle-border);
}

.calendar-cue-source p {
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 11px;
}

.calendar-cue-source strong {
  display: block;
  margin-top: 2px;
  font-size: 16px;
}

.calendar-cue-source--map,
.calendar-cue-source--stock {
  color: var(--system-info);
}

.calendar-cue-source--phone {
  color: var(--system-danger);
}

.calendar-cue-source--shopping {
  color: var(--system-warning);
}

.calendar-reminders-boundary__description {
  margin-top: 10px;
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.calendar-map-boundary__layout {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.calendar-map-boundary__copy {
  min-width: 0;
  flex: 1 1 220px;
}

.calendar-map-boundary__title {
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 700;
}

.calendar-map-boundary__description {
  margin-top: 4px;
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.calendar-action--map {
  flex: none;
  border-color: var(--system-accent);
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.calendar-status--success {
  color: var(--system-success);
  background: var(--system-success-soft);
}

.calendar-status--warning {
  color: var(--system-warning);
  background: var(--system-warning-soft);
}

.calendar-status--danger {
  color: var(--system-danger);
  background: var(--system-danger-soft);
}

.calendar-status--info {
  color: var(--system-info);
  background: var(--system-info-soft);
}

.calendar-status--neutral {
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
}

.calendar-back-button:hover,
.calendar-action:hover {
  background: var(--system-hover-bg);
}

.calendar-page button:active {
  box-shadow: inset 0 0 0 999px var(--system-pressed-bg);
}

.calendar-page button:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: 2px;
}

@media (max-width: 380px) {
  .calendar-content {
    padding-inline: 16px;
  }

  .calendar-header {
    padding-inline: 12px;
  }

  .calendar-panel {
    padding: 15px;
  }

  .calendar-source-handoff {
    grid-template-columns: 36px minmax(0, 1fr);
    padding: 13px;
  }

  .calendar-source-handoff__icon {
    width: 36px;
    height: 36px;
  }

  .calendar-source-handoff__actions {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  }

  .calendar-source-handoff__review,
  .calendar-source-handoff__return {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .calendar-back-button,
  .calendar-action {
    transition: none;
  }
}
</style>
