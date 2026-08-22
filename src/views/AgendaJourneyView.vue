<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useAgendaJourneyStore } from '../stores/agendaJourney'
import { useActivitySessionStore } from '../stores/activitySession'
import { useMapStore } from '../stores/map'
import { useSimulationStore } from '../stores/simulation'
import ActivityFocusCompanion from '../components/calendar/ActivityFocusCompanion.vue'
import { useI18n } from '../composables/useI18n'
import { startOfCalendarDay } from '../lib/calendar-schedule'
import {
  AGENDA_JOURNEY_STATUS,
  AGENDA_JOURNEY_STEP_KIND,
} from '../lib/agenda-journey'
import { MAP_TRANSPORT_MODES } from '../lib/map-journey'
import {
  ACTIVITY_SESSION_COMPLETION_POLICY,
  ACTIVITY_SESSION_PAUSE_POLICY,
  deriveActivitySessionProjection,
} from '../lib/activity-session'
import { reconcileActivitySessionOwners } from '../lib/activity-session-runtime'
import { resolveActivitySessionCheckpointEvent as resolveActivitySessionCheckpointEventRequest } from '../lib/simulation/adapters/activity-session-events'
import {
  normalizeAgendaJourneyIdQuery,
  normalizeHomePageQuery,
  pushReturnTarget,
} from '../lib/navigation-return'

const DAY_MS = 24 * 60 * 60 * 1000
const TERMINAL_STATUSES = new Set(['completed', 'missed', 'skipped', 'cancelled'])

const router = useRouter()
const route = useRoute()
const agendaJourneyStore = useAgendaJourneyStore()
const activitySessionStore = useActivitySessionStore()
const mapStore = useMapStore()
const simulationStore = useSimulationStore()
const { t, systemLanguage } = useI18n()
const { orderedJourneys } = storeToRefs(agendaJourneyStore)
const { activeMapPlaces, activeMapPack, currentLocation, tripState, tripHistory } =
  storeToRefs(mapStore)

const now = ref(Date.now())
const selectedFilter = ref('today')
const selectedJourneyId = ref('')
const createOpen = ref(false)
const createError = ref('')
const actionNotice = ref({ tone: '', text: '' })
const mobileOverviewVisible = ref(false)
const activitySessionDraft = ref({
  completionPolicy: ACTIVITY_SESSION_COMPLETION_POLICY.USER_CONFIRMATION,
  pausePolicy: ACTIVITY_SESSION_PAUSE_POLICY.ALLOW_PAUSE,
})
let presentationClockTimer = null
let mapEvidenceTimer = null

const pad = (value) => String(value).padStart(2, '0')
const formatDateTimeInput = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const createDefaultStart = () => {
  const date = new Date(Date.now() + 60 * 60_000)
  date.setMinutes(date.getMinutes() < 30 ? 30 : 0, 0, 0)
  if (date.getMinutes() === 0) date.setHours(date.getHours() + 1)
  return date.getTime()
}

const createDraft = ref({
  title: '',
  startsAtInput: formatDateTimeInput(createDefaultStart()),
  durationMinutes: 60,
  requirement: 'required',
  locationKey: '',
})

const languageTag = computed(() =>
  String(systemLanguage.value || '').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US',
)

const formatTime = (timestamp) =>
  new Intl.DateTimeFormat(languageTag.value, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))

const formatDate = (timestamp) =>
  new Intl.DateTimeFormat(languageTag.value, {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(timestamp))

const formatDateTime = (timestamp) => `${formatDate(timestamp)} · ${formatTime(timestamp)}`

const todayStartsAt = computed(() => startOfCalendarDay(now.value))
const tomorrowStartsAt = computed(() => {
  const date = new Date(todayStartsAt.value)
  date.setDate(date.getDate() + 1)
  return date.getTime()
})

const filterOptions = computed(() => [
  { id: 'today', label: t('今天', 'Today') },
  { id: 'upcoming', label: t('近期', 'Upcoming') },
  { id: 'active', label: t('进行中', 'In progress') },
  { id: 'finished', label: t('已收束', 'Finished') },
])

const filteredJourneys = computed(() => {
  const list = orderedJourneys.value
  if (selectedFilter.value === 'active') {
    return list.filter((journey) => journey.status === AGENDA_JOURNEY_STATUS.ACTIVE)
  }
  if (selectedFilter.value === 'finished') {
    return list.filter((journey) => TERMINAL_STATUSES.has(journey.status))
  }
  if (selectedFilter.value === 'upcoming') {
    return list.filter(
      (journey) =>
        journey.scheduledStartsAt >= tomorrowStartsAt.value &&
        journey.scheduledStartsAt < todayStartsAt.value + 15 * DAY_MS &&
        !TERMINAL_STATUSES.has(journey.status),
    )
  }
  return list.filter(
    (journey) =>
      journey.scheduledStartsAt >= todayStartsAt.value &&
      journey.scheduledStartsAt < tomorrowStartsAt.value,
  )
})

const selectedJourney = computed(() =>
  orderedJourneys.value.find((journey) => journey.id === selectedJourneyId.value) || null,
)
const selectedTravelStep = computed(
  () =>
    selectedJourney.value?.steps.find(
      (step) => step.kind === AGENDA_JOURNEY_STEP_KIND.TRAVEL,
    ) || null,
)
const selectedActivityStep = computed(
  () =>
    selectedJourney.value?.steps.find(
      (step) => step.kind === AGENDA_JOURNEY_STEP_KIND.ACTIVITY,
    ) || null,
)
const selectedActivitySession = computed(() =>
  selectedActivityStep.value
    ? activitySessionStore.findSessionByStepId(selectedActivityStep.value.id)
    : null,
)
const selectedActivitySessionProjection = computed(() =>
  selectedActivitySession.value
    ? deriveActivitySessionProjection(selectedActivitySession.value, { now: now.value })
    : null,
)
const selectedActivitySessionEvent = computed(() =>
  selectedActivitySession.value
    ? simulationStore.findActivitySessionEventForSession(selectedActivitySession.value.id, {
        pendingOnly: true,
      })
    : null,
)

const availablePlaces = computed(() =>
  activeMapPlaces.value
    .filter((place) => place?.mapPackId && place?.placeId && place?.position)
    .map((place) => ({
      ...place,
      key: `${place.mapPackId}::${place.placeId}`,
      labelZh: place.nameZh || place.labelZh || place.label || place.nameEn || '地图地点',
      labelEn: place.nameEn || place.labelEn || place.label || place.nameZh || 'Map place',
    }))
    .sort((left, right) =>
      t(left.labelZh, left.labelEn).localeCompare(t(right.labelZh, right.labelEn)),
    ),
)

const travelProjection = computed(() => {
  const step = selectedTravelStep.value
  if (!step || !step.locationRef) return null
  return mapStore.getScheduledTravelProjection({
    startsAt: step.desiredArrivalAt || selectedJourney.value?.scheduledStartsAt,
    locationRef: step.locationRef,
    transportMode: step.transportMode,
    now: now.value,
  })
})

const linkedMapJourneyActive = computed(() => {
  const step = selectedTravelStep.value
  if (!step) return false
  return Boolean(
    tripState.value?.status !== 'idle' &&
      (tripState.value.sourceAgendaJourneyStepId === step.id ||
        (step.mapJourneyId && tripState.value.journeyId === step.mapJourneyId)),
  )
})

const summaryCounts = computed(() => ({
  today: orderedJourneys.value.filter(
    (journey) =>
      journey.scheduledStartsAt >= todayStartsAt.value &&
      journey.scheduledStartsAt < tomorrowStartsAt.value,
  ).length,
  active: orderedJourneys.value.filter((journey) => journey.status === 'active').length,
  upcoming: orderedJourneys.value.filter(
    (journey) =>
      journey.scheduledStartsAt >= tomorrowStartsAt.value &&
      journey.scheduledStartsAt < todayStartsAt.value + 15 * DAY_MS &&
      !TERMINAL_STATUSES.has(journey.status),
  ).length,
}))

const statusLabel = (status) => {
  const labels = {
    planned: ['待执行', 'Planned'],
    active: ['进行中', 'In progress'],
    completed: ['已完成', 'Completed'],
    missed: ['未完成', 'Missed'],
    skipped: ['已跳过', 'Skipped'],
    cancelled: ['已取消', 'Cancelled'],
    available: ['可开始', 'Ready'],
  }
  const pair = labels[status] || ['待确认', 'Pending']
  return t(pair[0], pair[1])
}

const requirementLabel = (requirement) =>
  requirement === 'optional' ? t('可选', 'Optional') : t('必须完成', 'Required')

const projectionFailureText = (code) => {
  const messages = {
    current_position_missing: ['地图中还没有可用的当前位置。', 'Map has no usable current position yet.'],
    destination_missing: ['这项计划没有可验证的地图地点。', 'This plan has no validated Map destination.'],
    destination_off_pack: ['目的地不在当前地图包内。', 'The destination is outside the current Map pack.'],
    destination_stale: ['目的地引用已失效，请新建或调整计划。', 'The destination reference is stale. Create or adjust the plan.'],
    map_pack_mismatch: ['当前位置与目的地不在同一地图包。', 'Current position and destination use different Map packs.'],
    transport_required: ['请先选择出行方式。', 'Choose a transport mode first.'],
  }
  const pair = messages[code] || ['暂时无法计算这段行程。', 'This trip cannot be calculated right now.']
  return t(pair[0], pair[1])
}

const reconcileMapEvidence = () => {
  agendaJourneyStore.reconcileMapEvidence({
    activeMapJourney: tripState.value,
    mapJourneyHistory: tripHistory.value,
    now: Date.now(),
  })
}

const reconcileActivitySessions = () =>
  reconcileActivitySessionOwners({
    activitySessionStore,
    agendaJourneyStore,
    simulationStore,
    now: Date.now(),
  })

const selectJourney = (journeyId) => {
  const normalized = normalizeAgendaJourneyIdQuery(journeyId)
  if (!normalized || !agendaJourneyStore.findJourneyById(normalized)) return
  selectedJourneyId.value = normalized
  actionNotice.value = { tone: '', text: '' }
  mobileOverviewVisible.value = false
  router.replace({
    path: '/agenda-journey',
    query: { ...route.query, journeyId: normalized },
  })
}

const clearSelectedJourney = () => {
  selectedJourneyId.value = ''
  actionNotice.value = { tone: '', text: '' }
  mobileOverviewVisible.value = true
  const query = { ...route.query }
  delete query.journeyId
  router.replace({ path: '/agenda-journey', query })
}

const goHome = () => pushReturnTarget(router, route, '/home')

const formatDateQueryValue = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const openCalendarForSelectedDay = () => {
  const day = selectedJourney.value?.scheduledStartsAt || now.value
  router.push({
    path: '/calendar',
    query: {
      source: 'agenda-journey',
      date: formatDateQueryValue(day),
      ...(route.query.homePage ? { homePage: route.query.homePage } : {}),
    },
  })
}

const applyDateQuery = (value) => {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || !raw.trim()) return
  const parsed = new Date(`${raw.trim().slice(0, 10)}T00:00`).getTime()
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return
  const dayStart = startOfCalendarDay(parsed)
  if (dayStart === todayStartsAt.value) selectedFilter.value = 'today'
  else if (dayStart > todayStartsAt.value) selectedFilter.value = 'upcoming'
  else selectedFilter.value = 'finished'
  const journey = orderedJourneys.value.find(
    (item) => startOfCalendarDay(item.scheduledStartsAt) === dayStart,
  )
  if (journey) {
    selectedJourneyId.value = journey.id
    // keep the journey deep link in the query so the journeyId watcher agrees
    void router.replace({ path: route.path, query: { ...route.query, journeyId: journey.id } })
  }
}

watch(
  () => route.query.date,
  (value) => {
    if (value) applyDateQuery(value)
  },
  { immediate: true },
)

const openCreate = () => {
  const startsAt = createDefaultStart()
  createDraft.value = {
    title: '',
    startsAtInput: formatDateTimeInput(startsAt),
    durationMinutes: 60,
    requirement: 'required',
    locationKey: '',
  }
  createError.value = ''
  createOpen.value = true
}

const saveManualPlan = () => {
  const title = String(createDraft.value.title || '').trim()
  const startsAt = new Date(createDraft.value.startsAtInput).getTime()
  const durationMinutes = Math.max(15, Number(createDraft.value.durationMinutes) || 60)
  const selectedPlace = availablePlaces.value.find(
    (place) => place.key === createDraft.value.locationKey,
  )
  if (!title || !Number.isFinite(startsAt)) {
    createError.value = t('请填写标题和有效时间。', 'Add a title and valid start time.')
    return
  }
  const result = agendaJourneyStore.createManualPlan(
    {
      title,
      startsAt,
      endsAt: startsAt + durationMinutes * 60_000,
      requirement: createDraft.value.requirement,
      locationRef: selectedPlace
        ? {
            owner: 'map',
            mapPackId: selectedPlace.mapPackId,
            placeId: selectedPlace.placeId,
            labelZh: selectedPlace.labelZh,
            labelEn: selectedPlace.labelEn,
          }
        : null,
    },
    { now: Date.now() },
  )
  if (!result.ok) {
    createError.value =
      result.code === 'MANUAL_AGENDA_JOURNEY_OUTSIDE_HORIZON'
        ? t('手动计划只能安排在今天到未来 14 天内。', 'Manual plans must be within today and the next 14 days.')
        : t('无法创建这项计划，请检查输入。', 'This plan could not be created. Check the details.')
    return
  }
  createOpen.value = false
  selectedFilter.value = startsAt < tomorrowStartsAt.value ? 'today' : 'upcoming'
  selectJourney(result.journey.id)
}

const setTravelMode = (mode) => {
  const journey = selectedJourney.value
  const step = selectedTravelStep.value
  if (!journey || !step) return
  if (agendaJourneyStore.setStepTransportMode(journey.id, step.id, mode, { now: Date.now() })) {
    actionNotice.value = { tone: 'info', text: t('已重新计算当前起点的预计时间。', 'Estimate recalculated from the current origin.') }
  }
}

const openLinkedMapJourney = () => {
  const journey = selectedJourney.value
  const step = selectedTravelStep.value
  if (!journey || !step) return

  const result = mapStore.startScheduledTravel({
    calendarEventId: journey.sourceCalendarEventId,
    agendaJourneyStepId: step.id,
    startsAt: step.desiredArrivalAt || journey.scheduledStartsAt,
    locationRef: step.locationRef,
    transportMode: step.transportMode,
    now: Date.now(),
  })
  if (!result.ok) {
    actionNotice.value = {
      tone: 'warning',
      text:
        result.code === 'TRIP_ALREADY_IN_PROGRESS' || result.code === 'TRIP_ARRIVAL_PENDING'
          ? t('地图中已有另一段行程，请先处理那段行程。', 'Another Map Journey is active. Finish or cancel it first.')
          : projectionFailureText(result.code),
    }
    return
  }
  agendaJourneyStore.linkMapJourney(journey.id, step.id, result, { now: Date.now() })
  const homePage = normalizeHomePageQuery(route.query.homePage)
  router.push({
    path: '/map',
    query: {
      source: 'agenda-journey',
      journeyId: journey.id,
      ...(homePage ? { homePage } : {}),
    },
  })
}

const transitionActivity = (action) => {
  const journey = selectedJourney.value
  const step = selectedActivityStep.value
  if (!journey || !step) return
  const result = agendaJourneyStore.transitionActivity(journey.id, step.id, action, {
    now: Date.now(),
  })
  if (result.ok) reconcileActivitySessions()
  actionNotice.value = result.ok
    ? {
        tone: 'success',
        text:
          action === 'start'
            ? t('活动已开始，完成仍需要你的明确确认。', 'Activity started. Completion still needs your confirmation.')
            : action === 'complete'
              ? t('计划已按你的确认收束。', 'The plan was closed from your confirmation.')
              : t('这一步已按规则跳过。', 'This step was skipped under its requirement policy.'),
      }
    : { tone: 'warning', text: t('当前状态不允许这个操作。', 'That action is not available in the current state.') }
}

const startActivitySession = () => {
  const journey = selectedJourney.value
  const step = selectedActivityStep.value
  if (!journey || !step) return
  const prepared = agendaJourneyStore.prepareActivitySession(journey.id, step.id, {
    completionPolicy: activitySessionDraft.value.completionPolicy,
    pausePolicy: activitySessionDraft.value.pausePolicy,
  })
  if (!prepared.ok) {
    actionNotice.value = {
      tone: 'warning',
      text: t('当前活动不能开始计时。', 'This activity cannot start a timer right now.'),
    }
    return
  }
  const inspection = activitySessionStore.inspectStartRequest(prepared.request)
  if (!inspection.ok) {
    actionNotice.value = {
      tone: 'warning',
      text:
        inspection.code === 'ACTIVITY_SESSION_ACTIVE_CONFLICT'
          ? t('已有另一项活动正在计时，请先回到那项活动。', 'Another activity is already timing. Return to that activity first.')
          : t('这项活动已有不可重复的计时记录。', 'This activity already has a terminal timing record.'),
    }
    return
  }
  const started = activitySessionStore.startForAgendaRequest(prepared.request, {
    now: Date.now(),
  })
  if (!started.ok) {
    actionNotice.value = {
      tone: 'warning',
      text: t('计时未能开始，请稍后重试。', 'The timer could not start. Try again.'),
    }
    return
  }
  const begun = agendaJourneyStore.beginActivitySession(journey.id, step.id, {
    completionPolicy: prepared.request.completionPolicy,
    now: started.session.startedAt,
  })
  if (!begun.ok) {
    activitySessionStore.cancelSession(started.session.id, {
      now: Date.now(),
      reason: 'agenda_owner_rejected_start',
    })
    actionNotice.value = {
      tone: 'warning',
      text: t('行程状态已变化，计时没有继续。', 'Agenda Journey changed, so the timer did not continue.'),
    }
    return
  }
  actionNotice.value = {
    tone: 'success',
    text: t('活动与专注计时已开始；切换页面不会停止计时。', 'The activity and focus timer started. Navigating will not stop the clock.'),
  }
}

const pauseActivitySession = () => {
  const session = selectedActivitySession.value
  if (!session) return
  const result = activitySessionStore.pauseSession(session.id, { now: Date.now() })
  actionNotice.value = result.ok
    ? { tone: 'info', text: t('计时已暂停。', 'Timer paused.') }
    : { tone: 'warning', text: t('当前计时不能暂停。', 'This timer cannot be paused now.') }
}

const resumeActivitySession = () => {
  const session = selectedActivitySession.value
  if (!session) return
  const result = activitySessionStore.resumeSession(session.id, { now: Date.now() })
  actionNotice.value = result.ok
    ? { tone: 'success', text: t('计时已继续，并按暂停时长顺延。', 'Timer resumed and its end time shifted by the pause.') }
    : { tone: 'warning', text: t('当前计时不能继续。', 'This timer cannot resume now.') }
}

const completeActivitySession = () => {
  const session = selectedActivitySession.value
  if (!session) return
  const result = activitySessionStore.completeSession(session.id, {
    now: Date.now(),
    reason: 'user_confirmation',
  })
  if (!result.ok) {
    actionNotice.value = {
      tone: 'warning',
      text: t('当前计时还不能完成。', 'This timer cannot complete yet.'),
    }
    return
  }
  const reconciled = reconcileActivitySessions()
  actionNotice.value = reconciled.applied > 0
    ? { tone: 'success', text: t('计时证据已由行程验证，活动完成。', 'Agenda Journey validated the timing evidence and completed the activity.') }
    : { tone: 'info', text: t('计时已完成，行程会在恢复时再次核验。', 'The timer completed and Agenda Journey will validate it on resume.') }
}

const setActivitySessionMinimized = (minimized) => {
  const session = selectedActivitySession.value
  if (!session) return
  activitySessionStore.setMinimized(session.id, minimized)
}

const resolveActivitySessionEvent = (outcomeId) => {
  const record = selectedActivitySessionEvent.value
  if (!record) return
  const result = resolveActivitySessionCheckpointEventRequest({
    simulationStore,
    activitySessionStore,
    eventRecordId: record.id,
    outcomeId,
    now: Date.now(),
  })
  if (!result.ok) {
    actionNotice.value = {
      tone: 'warning',
      text: t(
        '这次节奏选择已失效，基础活动仍会继续。',
        'This rhythm choice is no longer current. The base activity still continues.',
      ),
    }
    return
  }
  actionNotice.value =
    outcomeId === 'add_recovery_buffer'
      ? {
          tone: 'success',
          text: t(
            '本次活动已增加 2 分钟恢复缓冲。',
            'A two-minute recovery buffer was added to this activity.',
          ),
        }
      : {
          tone: 'info',
          text: t('保持原来的活动节奏。', 'The current activity rhythm was kept.'),
        }
}

const cancelSelectedPlan = () => {
  const journey = selectedJourney.value
  if (!journey) return
  if (agendaJourneyStore.cancelPlan(journey.id, { now: Date.now() })) {
    actionNotice.value = { tone: 'info', text: t('计划已取消；已有的地图到达证据仍被保留。', 'Plan cancelled; existing Map arrival evidence was preserved.') }
  }
}

watch(
  () => route.query.journeyId,
  (value) => {
    const journeyId = normalizeAgendaJourneyIdQuery(value)
    selectedJourneyId.value = agendaJourneyStore.findJourneyById(journeyId) ? journeyId : ''
  },
  { immediate: true },
)

watch(
  () => [
    tripState.value?.status,
    tripState.value?.journeyId,
    tripState.value?.sourceAgendaJourneyStepId,
    tripHistory.value?.[0]?.id,
  ],
  reconcileMapEvidence,
  { immediate: true },
)

watch(
  () => [
    activitySessionStore.hasFinishedStorageHydration,
    agendaJourneyStore.hasFinishedStorageHydration,
    selectedActivitySession.value?.status,
  ],
  () => reconcileActivitySessions(),
  { immediate: true },
)

presentationClockTimer = window.setInterval(() => {
  now.value = Date.now()
  reconcileActivitySessions()
}, 1000)

mapEvidenceTimer = window.setInterval(() => {
  reconcileMapEvidence()
}, 30_000)

onBeforeUnmount(() => {
  if (presentationClockTimer) window.clearInterval(presentationClockTimer)
  if (mapEvidenceTimer) window.clearInterval(mapEvidenceTimer)
})
</script>

<template>
  <main class="agenda-journey" :class="{ 'has-selection': selectedJourney }" data-testid="agenda-journey-view">
    <header class="agenda-journey__topbar">
      <button class="icon-button" type="button" :aria-label="t('返回', 'Back')" @click="goHome">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <div class="agenda-journey__identity">
        <p>{{ t('今天与近期', 'Today & near term') }}</p>
        <h1>{{ t('行程', 'Agenda Journey') }}</h1>
      </div>
      <button
        class="calendar-link-button"
        type="button"
        :aria-label="t('在日历中查看这一天', 'View this day in Calendar')"
        :title="t('在日历中查看这一天', 'View this day in Calendar')"
        data-testid="agenda-open-calendar"
        @click="openCalendarForSelectedDay"
      >
        <i class="fas fa-calendar-days" aria-hidden="true"></i>
      </button>
      <button class="create-button" type="button" data-testid="agenda-create-open" :aria-label="t('新建计划', 'New plan')" @click="openCreate">
        <i class="fas fa-plus" aria-hidden="true"></i>
        <span>{{ t('新计划', 'New plan') }}</span>
      </button>
    </header>

    <section class="agenda-journey__hero" aria-labelledby="agenda-today-title">
      <div>
        <p class="eyebrow">{{ formatDate(now) }}</p>
        <h2 id="agenda-today-title">{{ t('先看今天要真正做什么。', 'See what actually needs doing today.') }}</h2>
        <p>{{ t('日历保留长期安排；这里负责出发、抵达与活动完成。', 'Calendar keeps long-range plans; this space owns departure, arrival, and activity completion.') }}</p>
      </div>
      <dl class="agenda-summary" :aria-label="t('行程概览', 'Journey summary')">
        <div><dt>{{ t('今天', 'Today') }}</dt><dd>{{ summaryCounts.today }}</dd></div>
        <div><dt>{{ t('进行中', 'Active') }}</dt><dd>{{ summaryCounts.active }}</dd></div>
        <div><dt>{{ t('未来 14 天', 'Next 14 days') }}</dt><dd>{{ summaryCounts.upcoming }}</dd></div>
      </dl>
    </section>

    <div class="agenda-journey__workspace" :class="{ 'show-overview': mobileOverviewVisible || !selectedJourney }">
      <aside class="journey-overview" aria-label="Journey overview">
        <div class="filter-row" role="tablist" :aria-label="t('筛选行程', 'Filter journeys')">
          <button
            v-for="option in filterOptions"
            :key="option.id"
            type="button"
            role="tab"
            :aria-selected="selectedFilter === option.id"
            :class="{ active: selectedFilter === option.id }"
            @click="selectedFilter = option.id"
          >
            {{ option.label }}
          </button>
        </div>

        <div v-if="filteredJourneys.length" class="journey-list" data-testid="agenda-journey-list">
          <button
            v-for="journey in filteredJourneys"
            :key="journey.id"
            type="button"
            class="journey-row"
            :class="{ selected: selectedJourneyId === journey.id }"
            :data-testid="`agenda-journey-row-${journey.id}`"
            @click="selectJourney(journey.id)"
          >
            <span class="journey-row__time">{{ formatTime(journey.scheduledStartsAt) }}</span>
            <span class="journey-row__body">
              <strong>{{ t(journey.titleZh, journey.titleEn) }}</strong>
              <span>
                {{ journey.locationRef ? t(journey.locationRef.labelZh, journey.locationRef.labelEn) : t('无需地图地点', 'No Map destination') }}
              </span>
            </span>
            <span class="status-pill" :data-status="journey.status">{{ statusLabel(journey.status) }}</span>
          </button>
        </div>

        <div v-else class="overview-empty" data-testid="agenda-empty-state">
          <span><i class="far fa-calendar-check" aria-hidden="true"></i></span>
          <h3>{{ t('这个视图还没有计划', 'No plans in this view') }}</h3>
          <p>{{ t('你可以手动创建，已确认的近期日历安排也会出现在这里。', 'Create one manually, or let confirmed near-term Calendar events appear here.') }}</p>
          <button type="button" @click="openCreate">{{ t('创建第一项', 'Create the first one') }}</button>
        </div>
      </aside>

      <section v-if="selectedJourney" class="journey-focus" data-testid="agenda-journey-focus">
        <div class="journey-focus__mobile-nav">
          <button type="button" @click="clearSelectedJourney">
            <i class="fas fa-chevron-left" aria-hidden="true"></i>
            {{ t('所有计划', 'All plans') }}
          </button>
        </div>

        <header class="journey-focus__header">
          <div>
            <p class="eyebrow">
              {{ selectedJourney.sourceType === 'calendar_occurrence' ? t('来自日历', 'From Calendar') : t('手动计划', 'Manual plan') }}
              · {{ requirementLabel(selectedJourney.requirement) }}
            </p>
            <h2>{{ t(selectedJourney.titleZh, selectedJourney.titleEn) }}</h2>
            <p>{{ formatDateTime(selectedJourney.scheduledStartsAt) }} – {{ formatTime(selectedJourney.scheduledEndsAt) }}</p>
          </div>
          <span class="status-pill status-pill--large" :data-status="selectedJourney.status">
            {{ statusLabel(selectedJourney.status) }}
          </span>
        </header>

        <p
          v-if="actionNotice.text"
          class="action-notice"
          :data-tone="actionNotice.tone"
          aria-live="polite"
        >
          {{ actionNotice.text }}
        </p>

        <ol class="execution-timeline" :aria-label="t('执行步骤', 'Execution steps')">
          <li v-if="selectedTravelStep" class="execution-step" data-testid="agenda-travel-step">
            <span class="execution-step__rail" aria-hidden="true"><i class="fas fa-route"></i></span>
            <div class="execution-step__content">
              <div class="step-heading">
                <div>
                  <p>{{ t('旅行步骤', 'Travel step') }}</p>
                  <h3>{{ t(selectedTravelStep.titleZh, selectedTravelStep.titleEn) }}</h3>
                </div>
                <span class="status-pill" :data-status="selectedTravelStep.status">{{ statusLabel(selectedTravelStep.status) }}</span>
              </div>

              <div class="route-line">
                <span><small>{{ t('从', 'From') }}</small><strong>{{ currentLocation.label || t('当前位置', 'Current position') }}</strong><em>{{ currentLocation.detail }}</em></span>
                <i class="fas fa-arrow-right-long" aria-hidden="true"></i>
                <span><small>{{ t('到', 'To') }}</small><strong>{{ t(selectedTravelStep.locationRef?.labelZh, selectedTravelStep.locationRef?.labelEn) }}</strong><em>{{ t(activeMapPack.titleZh || activeMapPack.nameZh, activeMapPack.titleEn || activeMapPack.nameEn) }}</em></span>
              </div>

              <fieldset class="transport-picker" :disabled="['completed', 'cancelled', 'missed', 'skipped'].includes(selectedTravelStep.status)">
                <legend>{{ t('出行方式会改变预计时间', 'Transport changes the estimate') }}</legend>
                <button
                  v-for="mode in MAP_TRANSPORT_MODES"
                  :key="mode.id"
                  type="button"
                  :class="{ active: selectedTravelStep.transportMode === mode.id }"
                  :aria-pressed="selectedTravelStep.transportMode === mode.id"
                  @click="setTravelMode(mode.id)"
                >
                  <i :class="mode.icon" aria-hidden="true"></i>
                  {{ t(mode.labelZh, mode.labelEn) }}
                </button>
              </fieldset>

              <div v-if="travelProjection?.ready" class="travel-estimate" :data-late="travelProjection.isLate">
                <div><small>{{ t('预计耗时', 'Estimated time') }}</small><strong>{{ travelProjection.estimate.minutes }} {{ t('分钟', 'min') }}</strong></div>
                <div><small>{{ t('预计到达', 'Predicted arrival') }}</small><strong>{{ formatTime(travelProjection.predictedArrivalAt) }}</strong></div>
                <div><small>{{ t('建议出发', 'Leave by') }}</small><strong>{{ formatTime(travelProjection.recommendedDepartureAt) }}</strong></div>
                <p v-if="travelProjection.isLate">{{ t(`按当前位置现在出发，预计迟到 ${travelProjection.lateByMinutes} 分钟。`, `Leaving from the current position now is about ${travelProjection.lateByMinutes} min late.`) }}</p>
                <p v-else-if="travelProjection.shouldDepartNow">{{ t('已到建议出发时间。', 'It is time to leave.') }}</p>
                <p v-else>{{ t(`${travelProjection.minutesUntilDeparture} 分钟后建议出发。`, `Recommended departure is in ${travelProjection.minutesUntilDeparture} min.`) }}</p>
              </div>
              <p v-else class="projection-failure">{{ projectionFailureText(travelProjection?.code) }}</p>

              <div class="step-actions">
                <button
                  v-if="!['completed', 'cancelled', 'missed', 'skipped'].includes(selectedTravelStep.status)"
                  type="button"
                  class="primary-action"
                  :disabled="!travelProjection?.ready"
                  data-testid="agenda-open-map"
                  @click="openLinkedMapJourney"
                >
                  <i class="fas fa-location-arrow" aria-hidden="true"></i>
                  {{ linkedMapJourneyActive ? t('打开地图行程', 'Open Map Journey') : t('出发并打开地图', 'Depart in Map') }}
                </button>
                <p v-if="selectedTravelStep.status === 'completed'" class="completion-note">
                  <i class="fas fa-circle-check" aria-hidden="true"></i>
                  {{ t('地图到达已验证；活动现在可以开始，但尚未完成。', 'Map arrival verified. The activity is now available, but not completed.') }}
                </p>
              </div>
            </div>
          </li>

          <li v-if="selectedActivityStep" class="execution-step" data-testid="agenda-activity-step">
            <span class="execution-step__rail" aria-hidden="true"><i class="fas fa-play"></i></span>
            <div class="execution-step__content">
              <div class="step-heading">
                <div>
                  <p>{{ t('活动步骤', 'Activity step') }}</p>
                  <h3>{{ t(selectedActivityStep.titleZh, selectedActivityStep.titleEn) }}</h3>
                </div>
                <span class="status-pill" :data-status="selectedActivityStep.status">{{ statusLabel(selectedActivityStep.status) }}</span>
              </div>
              <p class="activity-boundary">
                {{ t('到达地点不会自动完成活动。活动计时由独立的绝对时间记录负责，切换页面或最小化不会停止它。', 'Arrival never completes the activity. A separate absolute-time session owns timing, and navigation or minimizing does not stop it.') }}
              </p>

              <div
                v-if="!selectedActivitySession && ['available', 'active'].includes(selectedActivityStep.status)"
                class="activity-session-launch"
                data-testid="activity-session-launch"
              >
                <div class="activity-session-launch__fields">
                  <label>
                    <span>{{ t('完成方式', 'Completion policy') }}</span>
                    <select
                      v-model="activitySessionDraft.completionPolicy"
                      data-testid="activity-session-completion-policy"
                    >
                      <option value="user_confirmation">{{ t('由我确认完成', 'I confirm completion') }}</option>
                      <option value="duration_sufficient">{{ t('计时结束即完成', 'Duration completes the step') }}</option>
                    </select>
                  </label>
                  <label>
                    <span>{{ t('暂停规则', 'Pause policy') }}</span>
                    <select
                      v-model="activitySessionDraft.pausePolicy"
                      data-testid="activity-session-pause-policy"
                    >
                      <option value="allow_pause">{{ t('允许暂停', 'Pause allowed') }}</option>
                      <option value="continuous">{{ t('连续计时', 'Continuous timing') }}</option>
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  class="primary-action"
                  data-testid="agenda-activity-start"
                  @click="startActivitySession"
                >
                  <i class="fas fa-play" aria-hidden="true"></i>{{ t('开始活动与计时', 'Start activity & timer') }}
                </button>
                <p>{{ t('默认跟随这项计划的预计时长；低影响事件只会在明确的计时里程碑检查，不会阻塞基础活动。', 'The timer follows this plan duration. Low-impact events are checked only at explicit timing milestones and never block the base activity.') }}</p>
              </div>

              <ActivityFocusCompanion
                v-if="selectedActivitySession && selectedActivitySessionProjection"
                :session="selectedActivitySession"
                :projection="selectedActivitySessionProjection"
                :event-record="selectedActivitySessionEvent"
                @pause="pauseActivitySession"
                @resume="resumeActivitySession"
                @complete="completeActivitySession"
                @toggle-minimized="setActivitySessionMinimized"
                @resolve-event="resolveActivitySessionEvent"
              />

              <div class="step-actions">
                <button
                  v-if="['available', 'active'].includes(selectedActivityStep.status)"
                  type="button"
                  class="secondary-action"
                  data-testid="agenda-activity-skip"
                  @click="transitionActivity('skip')"
                >
                  {{ selectedActivityStep.requirement === 'required' ? t('标记未完成', 'Mark missed') : t('跳过', 'Skip') }}
                </button>
              </div>
            </div>
          </li>
        </ol>

        <footer v-if="!TERMINAL_STATUSES.has(selectedJourney.status)" class="journey-focus__footer">
          <button type="button" class="danger-action" data-testid="agenda-cancel-plan" @click="cancelSelectedPlan">
            {{ t('取消整项计划', 'Cancel plan') }}
          </button>
          <p>{{ t('取消不会伪造到达或活动结果。', 'Cancellation never fabricates arrival or activity results.') }}</p>
        </footer>

        <section v-else-if="selectedJourney.outcomeSummaryZh || selectedJourney.outcomeSummaryEn" class="outcome-summary">
          <p>{{ t('结果', 'Outcome') }}</p>
          <strong>{{ t(selectedJourney.outcomeSummaryZh, selectedJourney.outcomeSummaryEn) }}</strong>
        </section>
      </section>

      <section v-else class="journey-focus journey-focus--empty">
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
        <h2>{{ t('选择一项计划查看执行步骤', 'Choose a plan to see its execution steps') }}</h2>
        <p>{{ t('旅行与活动分开记录，抵达不会替你完成活动。', 'Travel and activity stay separate; arrival never completes the activity for you.') }}</p>
      </section>
    </div>

    <template v-if="createOpen">
      <button class="sheet-backdrop" type="button" :aria-label="t('关闭新建计划', 'Close new plan')" @click="createOpen = false"></button>
      <form class="create-sheet" role="dialog" aria-modal="true" :aria-label="t('新建近期计划', 'Create near-term plan')" data-testid="agenda-create-sheet" @submit.prevent="saveManualPlan">
        <header>
          <div><p>{{ t('手动计划', 'Manual plan') }}</p><h2>{{ t('安排接下来要做的事', 'Plan what comes next') }}</h2></div>
          <button type="button" :aria-label="t('关闭', 'Close')" @click="createOpen = false"><i class="fas fa-xmark" aria-hidden="true"></i></button>
        </header>
        <label>
          <span>{{ t('标题', 'Title') }}</span>
          <input v-model="createDraft.title" maxlength="120" autocomplete="off" data-testid="agenda-create-title" :placeholder="t('例如：练习室排练', 'e.g. Studio rehearsal')" />
        </label>
        <div class="create-sheet__grid">
          <label><span>{{ t('开始时间', 'Start time') }}</span><input v-model="createDraft.startsAtInput" type="datetime-local" data-testid="agenda-create-start" /></label>
          <label><span>{{ t('预计时长', 'Duration') }}</span><select v-model.number="createDraft.durationMinutes"><option :value="30">30 {{ t('分钟', 'min') }}</option><option :value="60">60 {{ t('分钟', 'min') }}</option><option :value="90">90 {{ t('分钟', 'min') }}</option><option :value="120">120 {{ t('分钟', 'min') }}</option></select></label>
        </div>
        <div class="create-sheet__grid">
          <label><span>{{ t('完成要求', 'Requirement') }}</span><select v-model="createDraft.requirement"><option value="required">{{ t('必须完成', 'Required') }}</option><option value="optional">{{ t('可选', 'Optional') }}</option></select></label>
          <label><span>{{ t('地图地点（可选）', 'Map place (optional)') }}</span><select v-model="createDraft.locationKey" data-testid="agenda-create-location"><option value="">{{ t('不需要出发步骤', 'No travel step') }}</option><option v-for="place in availablePlaces" :key="place.key" :value="place.key">{{ t(place.labelZh, place.labelEn) }}</option></select></label>
        </div>
        <p class="create-sheet__hint">{{ t(`地点来自当前地图包：${t(activeMapPack.titleZh || activeMapPack.nameZh, activeMapPack.titleEn || activeMapPack.nameEn)}`, `Places come from the active Map pack: ${t(activeMapPack.titleZh || activeMapPack.nameZh, activeMapPack.titleEn || activeMapPack.nameEn)}`) }}</p>
        <p v-if="createError" class="create-sheet__error" role="alert">{{ createError }}</p>
        <footer><button type="button" @click="createOpen = false">{{ t('取消', 'Cancel') }}</button><button type="submit" class="primary-action" data-testid="agenda-create-save">{{ t('创建计划', 'Create plan') }}</button></footer>
      </form>
    </template>
  </main>
</template>

<style scoped>
.agenda-journey {
  --ink: #17202a;
  --muted: #6f7882;
  --line: rgba(24, 35, 45, 0.11);
  --accent: #275f59;
  min-height: 100%;
  overflow-x: hidden;
  color: var(--ink);
  background:
    radial-gradient(circle at 85% -10%, rgba(151, 207, 190, 0.34), transparent 34rem),
    linear-gradient(145deg, #f8f7f2 0%, #eef3ef 58%, #e5ece8 100%);
}

.agenda-journey__topbar {
  min-height: 72px;
  padding: 14px clamp(16px, 3vw, 36px);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid var(--line);
  background: rgba(249, 249, 245, 0.8);
  backdrop-filter: blur(18px);
}

.icon-button,
.create-button,
.calendar-link-button,
.journey-focus__mobile-nav button {
  border: 0;
  color: inherit;
  background: transparent;
}

.icon-button,
.calendar-link-button {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 8px 20px rgba(28, 47, 42, 0.08);
}

.calendar-link-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.agenda-journey__identity { min-width: 0; }
.agenda-journey__identity p,
.eyebrow,
.step-heading p,
.outcome-summary p,
.create-sheet header p {
  margin: 0;
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.agenda-journey__identity h1 { margin: 2px 0 0; font-size: 22px; }

.create-button,
.primary-action {
  min-height: 44px;
  border: 0;
  border-radius: 999px;
  padding: 11px 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: white;
  background: var(--accent);
  font-weight: 750;
  box-shadow: 0 10px 22px rgba(39, 95, 89, 0.2);
}
.primary-action:disabled { opacity: 0.45; box-shadow: none; }

.agenda-journey__hero {
  max-width: 1380px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(18px, 4vw, 52px) 24px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 28px;
}
.agenda-journey__hero h2 { margin: 7px 0 8px; max-width: 720px; font-size: clamp(26px, 4vw, 46px); line-height: 1.06; letter-spacing: -0.04em; }
.agenda-journey__hero > div > p:last-child { max-width: 700px; margin: 0; color: var(--muted); line-height: 1.6; }

.agenda-summary { margin: 0; padding: 9px; display: grid; grid-template-columns: repeat(3, minmax(84px, 1fr)); gap: 6px; border: 1px solid rgba(255, 255, 255, 0.85); border-radius: 22px; background: rgba(255, 255, 255, 0.55); box-shadow: 0 20px 50px rgba(34, 52, 46, 0.08); }
.agenda-summary div { padding: 10px 14px; border-radius: 15px; }
.agenda-summary div + div { border-left: 1px solid var(--line); }
.agenda-summary dt { color: var(--muted); font-size: 11px; }
.agenda-summary dd { margin: 4px 0 0; font-size: 25px; font-weight: 850; }

.agenda-journey__workspace {
  max-width: 1380px;
  min-width: 0;
  margin: 0 auto;
  padding: 0 clamp(18px, 4vw, 52px) 54px;
  display: grid;
  grid-template-columns: minmax(300px, 0.38fr) minmax(0, 0.62fr);
  gap: 18px;
}

.journey-overview,
.journey-focus {
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 24px 55px rgba(33, 50, 44, 0.09);
  backdrop-filter: blur(16px);
}
.journey-overview { padding: 14px; align-self: start; }
.filter-row { padding: 4px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3px; border-radius: 16px; background: rgba(32, 48, 43, 0.06); }
.filter-row button { min-width: 0; border: 0; border-radius: 12px; padding: 9px 5px; color: var(--muted); background: transparent; font-size: 12px; font-weight: 750; white-space: normal; }
.filter-row button.active { color: var(--ink); background: white; box-shadow: 0 4px 14px rgba(28, 44, 39, 0.08); }

.journey-list { margin-top: 10px; display: grid; gap: 6px; }
.journey-row { width: 100%; min-width: 0; padding: 14px 12px; display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; align-items: center; gap: 10px; border: 0; border-radius: 17px; color: inherit; text-align: left; background: transparent; }
.journey-row:hover,
.journey-row.selected { background: rgba(255, 255, 255, 0.88); }
.journey-row.selected { box-shadow: inset 3px 0 0 var(--accent), 0 9px 22px rgba(32, 50, 44, 0.07); }
.journey-row__time { font-size: 13px; font-weight: 820; font-variant-numeric: tabular-nums; }
.journey-row__body { min-width: 0; display: grid; gap: 3px; }
.journey-row__body strong,
.journey-row__body span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.journey-row__body strong { font-size: 14px; }
.journey-row__body span { color: var(--muted); font-size: 12px; }

.status-pill { width: fit-content; max-width: 100%; padding: 5px 8px; border-radius: 999px; color: #59635f; background: rgba(72, 85, 79, 0.09); font-size: 10px; font-weight: 800; white-space: nowrap; }
.status-pill[data-status='active'], .status-pill[data-status='available'] { color: #17685c; background: rgba(49, 144, 126, 0.13); }
.status-pill[data-status='completed'] { color: #375e36; background: rgba(92, 143, 77, 0.14); }
.status-pill[data-status='missed'] { color: #a2463e; background: rgba(191, 81, 67, 0.12); }
.status-pill--large { padding: 7px 11px; font-size: 11px; }

.overview-empty { padding: 54px 22px; text-align: center; }
.overview-empty > span { width: 54px; height: 54px; margin: 0 auto 16px; display: grid; place-items: center; border-radius: 18px; color: var(--accent); background: rgba(39, 95, 89, 0.1); font-size: 22px; }
.overview-empty h3 { margin: 0 0 8px; }
.overview-empty p { margin: 0; color: var(--muted); line-height: 1.55; }
.overview-empty button { margin-top: 18px; border: 0; color: var(--accent); background: transparent; font-weight: 800; }

.journey-focus { padding: clamp(20px, 3vw, 34px); }
.journey-focus__mobile-nav { display: none; }
.journey-focus__header { display: flex; justify-content: space-between; align-items: start; gap: 20px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
.journey-focus__header > div { min-width: 0; }
.journey-focus__header h2 { margin: 7px 0 8px; font-size: clamp(24px, 3vw, 36px); line-height: 1.08; letter-spacing: -0.035em; overflow-wrap: anywhere; }
.journey-focus__header > div > p:last-child { margin: 0; color: var(--muted); }
.action-notice { margin: 16px 0 0; padding: 11px 14px; border-radius: 13px; color: #275d55; background: rgba(39, 95, 89, 0.09); font-size: 13px; }
.action-notice[data-tone='warning'] { color: #8c4c2c; background: rgba(195, 121, 69, 0.12); }
.action-notice[data-tone='success'] { color: #376a38; background: rgba(86, 144, 78, 0.12); }

.execution-timeline { margin: 0; padding: 24px 0 0; list-style: none; }
.execution-step { min-width: 0; display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 16px; }
.execution-step + .execution-step { padding-top: 12px; }
.execution-step__rail { position: relative; z-index: 0; width: 42px; height: 42px; display: grid; place-items: center; border-radius: 14px; color: var(--accent); background: #e8f0ec; }
.execution-step:not(:last-child) .execution-step__rail::after { content: ''; position: absolute; z-index: -1; top: 42px; bottom: -24px; left: 20px; width: 1px; background: var(--line); }
.execution-step__content { min-width: 0; padding: 0 0 28px; }
.step-heading { display: flex; justify-content: space-between; align-items: start; gap: 16px; }
.step-heading > div { min-width: 0; }
.step-heading h3 { margin: 5px 0 0; font-size: 19px; overflow-wrap: anywhere; }

.route-line { margin-top: 17px; padding: 15px; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 14px; border-radius: 17px; background: rgba(29, 53, 46, 0.055); }
.route-line > span { min-width: 0; display: grid; gap: 2px; }
.route-line > span:last-child { text-align: right; }
.route-line small { color: var(--muted); font-size: 10px; font-weight: 750; text-transform: uppercase; letter-spacing: 0.1em; }
.route-line strong, .route-line em { overflow-wrap: anywhere; }
.route-line strong { font-size: 13px; }
.route-line em { color: var(--muted); font-size: 11px; font-style: normal; }
.route-line > i { color: #8b9791; }

.transport-picker { min-width: 0; margin: 16px 0 0; padding: 0; border: 0; }
.transport-picker legend { margin-bottom: 8px; color: var(--muted); font-size: 11px; }
.transport-picker button { margin: 0 5px 5px 0; border: 1px solid var(--line); border-radius: 999px; padding: 8px 11px; color: #56615d; background: rgba(255, 255, 255, 0.66); font-size: 12px; }
.transport-picker button.active { border-color: rgba(39, 95, 89, 0.32); color: var(--accent); background: rgba(39, 95, 89, 0.11); }
.transport-picker button i { margin-right: 5px; }

.travel-estimate { margin-top: 13px; padding: 14px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; border: 1px solid rgba(39, 95, 89, 0.13); border-radius: 17px; background: rgba(245, 250, 247, 0.76); }
.travel-estimate div { min-width: 0; display: grid; gap: 3px; }
.travel-estimate small { color: var(--muted); font-size: 10px; }
.travel-estimate strong { font-size: 13px; overflow-wrap: anywhere; }
.travel-estimate p { grid-column: 1 / -1; margin: 2px 0 0; color: #477268; font-size: 12px; }
.travel-estimate[data-late='true'] { border-color: rgba(186, 94, 65, 0.2); background: rgba(255, 244, 238, 0.8); }
.travel-estimate[data-late='true'] p { color: #a04e36; }
.projection-failure, .activity-boundary { margin: 13px 0 0; color: var(--muted); font-size: 13px; line-height: 1.55; }

.activity-session-launch {
  min-width: 0;
  margin-top: 15px;
  padding: 15px;
  border: 1px solid rgba(39, 95, 89, 0.13);
  border-radius: 18px;
  background: rgba(245, 250, 247, 0.76);
}
.activity-session-launch__fields {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.activity-session-launch label { min-width: 0; display: grid; gap: 6px; }
.activity-session-launch label span { color: var(--muted); font-size: 11px; font-weight: 750; }
.activity-session-launch select {
  width: 100%;
  min-width: 0;
  height: 44px;
  box-sizing: border-box;
  border: 1px solid rgba(28, 44, 38, 0.14);
  border-radius: 13px;
  padding: 0 11px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.9);
}
.activity-session-launch > .primary-action { margin-top: 12px; }
.activity-session-launch > p { margin: 10px 0 0; color: var(--muted); font-size: 11px; line-height: 1.5; }

.step-actions { margin-top: 15px; display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
.secondary-action, .danger-action { min-height: 44px; border: 1px solid var(--line); border-radius: 999px; padding: 10px 15px; color: var(--ink); background: rgba(255, 255, 255, 0.75); font-weight: 750; }
.completion-note { margin: 0; color: #3d725e; font-size: 13px; line-height: 1.5; }
.completion-note i { margin-right: 5px; }

.journey-focus__footer { padding-top: 18px; border-top: 1px solid var(--line); display: flex; align-items: center; gap: 14px; }
.journey-focus__footer p { margin: 0; color: var(--muted); font-size: 12px; }
.danger-action { color: #984338; }
.outcome-summary { margin-top: 8px; padding: 17px; border-radius: 17px; background: rgba(39, 95, 89, 0.08); }
.outcome-summary strong { display: block; margin-top: 5px; }
.journey-focus--empty { min-height: 380px; display: grid; place-content: center; justify-items: center; text-align: center; }
.journey-focus--empty > i { color: rgba(39, 95, 89, 0.3); font-size: 28px; }
.journey-focus--empty h2 { margin: 16px 0 8px; font-size: 20px; }
.journey-focus--empty p { max-width: 420px; margin: 0; color: var(--muted); }

.sheet-backdrop { position: fixed; z-index: 70; inset: 0; width: 100%; border: 0; background: rgba(12, 23, 20, 0.36); backdrop-filter: blur(7px); }
.create-sheet { position: fixed; z-index: 71; left: 50%; bottom: 18px; width: min(680px, calc(100vw - 28px)); max-height: calc(100vh - 36px); overflow-y: auto; transform: translateX(-50%); padding: 24px; border: 1px solid rgba(255, 255, 255, 0.86); border-radius: 28px; background: #f8faf7; box-shadow: 0 30px 90px rgba(16, 31, 27, 0.3); }
.create-sheet header { display: flex; justify-content: space-between; gap: 18px; align-items: start; }
.create-sheet header h2 { margin: 5px 0 0; font-size: 24px; }
.create-sheet header button { width: 38px; height: 38px; border: 0; border-radius: 50%; background: rgba(35, 51, 46, 0.07); }
.create-sheet > label, .create-sheet__grid label { min-width: 0; display: grid; gap: 7px; }
.create-sheet > label { margin-top: 22px; }
.create-sheet label > span { color: #59645f; font-size: 12px; font-weight: 750; }
.create-sheet input, .create-sheet select { width: 100%; min-width: 0; height: 44px; box-sizing: border-box; border: 1px solid rgba(28, 44, 38, 0.14); border-radius: 13px; padding: 0 12px; color: var(--ink); background: white; font: inherit; }
.create-sheet__grid { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.create-sheet__hint { margin: 13px 0 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
.create-sheet__error { margin: 12px 0 0; color: #a24338; font-size: 12px; }
.create-sheet footer { margin-top: 22px; display: flex; justify-content: end; gap: 9px; }
.create-sheet footer > button:first-child { border: 0; padding: 10px 15px; color: var(--muted); background: transparent; font-weight: 750; }

button, input, select { font: inherit; }
button { cursor: pointer; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid rgba(37, 116, 103, 0.28); outline-offset: 2px; }

@media (max-width: 840px) {
  .agenda-journey__topbar { min-height: 64px; padding: 11px 14px; }
  .create-button { width: 42px; height: 42px; padding: 0; }
  .create-button span { display: none; }
  .agenda-journey__hero { padding: 22px 16px 17px; align-items: stretch; flex-direction: column; gap: 18px; }
  .agenda-journey.has-selection .agenda-journey__hero { display: none; }
  .agenda-journey__hero h2 { font-size: 31px; }
  .agenda-summary { width: 100%; box-sizing: border-box; }
  .agenda-summary div { padding: 8px; }
  .agenda-journey__workspace { padding: 0 12px 34px; display: block; }
  .agenda-journey.has-selection .agenda-journey__workspace { padding-top: 12px; }
  .journey-overview { display: none; }
  .agenda-journey__workspace.show-overview .journey-overview { display: block; }
  .agenda-journey__workspace.show-overview .journey-focus { display: none; }
  .journey-focus { padding: 19px 16px; border-radius: 23px; }
  .journey-focus__mobile-nav { display: block; margin: -4px 0 15px; }
  .journey-focus__mobile-nav button { padding: 5px 0; color: var(--accent); font-weight: 750; }
  .journey-focus__mobile-nav i { margin-right: 6px; }
  .journey-focus__header { gap: 12px; }
  .journey-focus__header h2 { font-size: 27px; }
  .journey-row { grid-template-columns: 44px minmax(0, 1fr); }
  .journey-row .status-pill { grid-column: 2; }
  .route-line { grid-template-columns: minmax(0, 1fr) 20px minmax(0, 1fr); padding: 12px; gap: 8px; }
  .travel-estimate { grid-template-columns: 1fr; }
  .travel-estimate p { grid-column: 1; }
  .execution-step { grid-template-columns: 34px minmax(0, 1fr); gap: 10px; }
  .execution-step__rail { width: 34px; height: 34px; border-radius: 11px; }
  .execution-step:not(:last-child) .execution-step__rail::after { top: 34px; left: 16px; }
  .step-heading { gap: 8px; }
  .activity-session-launch__fields { grid-template-columns: 1fr; }
  .journey-focus__footer { align-items: start; flex-direction: column; }
  .create-sheet { bottom: 0; width: 100%; max-height: 92vh; box-sizing: border-box; border-radius: 26px 26px 0 0; }
  .create-sheet__grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; }
}
</style>
