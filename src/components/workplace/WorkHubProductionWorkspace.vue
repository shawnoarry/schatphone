<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCalendarStore } from '../../stores/calendar'
import { useWorkHubStore } from '../../stores/workHub'
import { useSimulationStore } from '../../stores/simulation'
import { useI18n } from '../../composables/useI18n'
import { WORK_HUB_RECORD_TYPES } from '../../lib/work-hub-contracts'
import { pushReturnTarget } from '../../lib/navigation-return'
import {
  reconcileWorkScheduleChangeEvent,
  respondToWorkScheduleChangeEvent,
  startWorkScheduleChangeEvent,
} from '../../lib/simulation/work-hub-event-runtime'
import {
  WORK_HUB_EVENT_TEMPLATE_ID,
  WORK_HUB_SCHEDULE_CHANGE_RESULT,
} from '../../lib/simulation/work-hub-event-templates'

defineProps({
  appName: { type: String, default: 'Work Hub' },
})

const router = useRouter()
const route = useRoute()
const workHubStore = useWorkHubStore()
const simulationStore = useSimulationStore()
const calendarStore = useCalendarStore()
const { languageBase, t } = useI18n()
const adjustmentDrafts = reactive({})
const reportDrafts = reactive({})
const feedback = ref('')
const failed = ref(false)

const isZh = computed(() => languageBase.value === 'zh')
const organization = computed(() => workHubStore.activeOrganization)
const membership = computed(() => workHubStore.activeMembership)
const role = computed(() => workHubStore.activeRoles[0] || null)
const text = (record, zhKey = 'nameZh', enKey = 'nameEn') =>
  (isZh.value ? record?.[zhKey] : record?.[enKey]) || record?.[zhKey] || record?.[enKey] || ''
const receiptFor = (recordType, recordId) => workHubStore.receiptForSource(recordType, recordId)
const exactLinkedCalendarEvent = (proposalId) =>
  calendarStore.events.find(
    (event) =>
      event.sourceRef?.sourceOwner === 'workplace' &&
      event.sourceRef?.sourceRecordId === proposalId,
  ) || null
const previousProposalFor = (proposal) =>
  proposal?.changeOfRef
    ? workHubStore.activeScheduleProposals.find(
        (candidate) =>
          candidate.id === proposal.changeOfRef.recordId &&
          candidate.revision === proposal.changeOfRef.revision,
      ) || null
    : null
const calendarEventForReview = (proposal) =>
  exactLinkedCalendarEvent(proposal.id) ||
  (proposal.changeOfRef
    ? calendarStore.findEventByScheduleHandoffSource('workplace', proposal.changeOfRef.recordId)
    : null)
const scheduleChangeInstanceFor = (proposalId) =>
  simulationStore.eventInstancesV2.find(
    (instance) =>
      instance.templateId === WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE &&
      instance.contextRefs.schedule_proposal_id === proposalId,
  ) || null
const pendingScheduleChangeRequestFor = (proposalId) =>
  scheduleChangeInstanceFor(proposalId)?.pendingOwnerRequests.find(
    (request) => request.targetModule === 'work_hub' && request.status === 'pending',
  ) || null
const scheduleChangeResultFor = (proposalId) =>
  scheduleChangeInstanceFor(proposalId)?.resultCodes.at(-1) || ''
const isProposalExpired = (proposal) => Boolean(proposal?.deadlineAt && proposal.deadlineAt <= Date.now())
const scheduleChangeStatusText = (proposalId) => {
  const result = scheduleChangeResultFor(proposalId)
  return scheduleChangeResultCodeText(result)
}
const scheduleChangeResultCodeText = (result) => {
  if (result === WORK_HUB_SCHEDULE_CHANGE_RESULT.EXPIRED) return t('已过期，未替你作出决定', 'Expired without deciding for you')
  if (result === WORK_HUB_SCHEDULE_CHANGE_RESULT.STALE) return t('来源已更新，请查看当前版本', 'Source changed; review the current version')
  if (result === WORK_HUB_SCHEDULE_CHANGE_RESULT.REVOKED) return t('组织已撤销这项变更', 'The organization revoked this change')
  if (result === WORK_HUB_SCHEDULE_CHANGE_RESULT.WRITE_FAILED) return t('上次回应没有保存，可重新回应', 'The last response was not saved; you can respond again')
  return ''
}
const inactiveScheduleChangeInstances = computed(() => {
  const activeProposalIds = new Set(workHubStore.activeScheduleProposals.map((proposal) => proposal.id))
  return simulationStore.eventInstancesV2.filter(
    (instance) =>
      instance.templateId === WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE &&
      instance.lifecycle !== 'active' &&
      !activeProposalIds.has(instance.contextRefs.schedule_proposal_id) &&
      scheduleChangeResultCodeText(instance.resultCodes.at(-1)),
  )
})

const showFeedback = (message, isFailure = false) => {
  feedback.value = message
  failed.value = isFailure
  window.setTimeout(() => {
    if (feedback.value === message) feedback.value = ''
  }, 2600)
}

const decide = (recordType, recordId, action) => {
  const note = action === 'adjustment_requested' ? adjustmentDrafts[recordId] || '' : ''
  const eventInstance = recordType === WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL
    ? scheduleChangeInstanceFor(recordId)
    : null
  const result = eventInstance && pendingScheduleChangeRequestFor(recordId)
    ? respondToWorkScheduleChangeEvent({
        workHubStore,
        simulationStore,
        instanceId: eventInstance.id,
        action,
        note,
      })
    : workHubStore.decideRecord(recordType, recordId, action, { note })
  if (!result.ok) {
    showFeedback(t('操作没有保存，请稍后重试。', 'The response was not saved. Try again.'), true)
    return
  }
  showFeedback(
    action === 'accepted'
      ? t('已接受并保存回执。', 'Accepted and saved.')
      : action === 'adjustment_requested'
        ? t('调整请求已保存。', 'Adjustment request saved.')
        : t('已谢绝并保存回执。', 'Declined and saved.'),
  )
}

const submitStatus = (taskId, statusKey) => {
  const result = workHubStore.submitStatusReport({
    sourceTaskId: taskId,
    statusKey,
    note: reportDrafts[taskId] || '',
  })
  if (!result.ok) {
    showFeedback(t('状态没有保存，请稍后重试。', 'The status was not saved. Try again.'), true)
    return
  }
  reportDrafts[taskId] = ''
  showFeedback(t('工作状态已保存。', 'Work status saved.'))
}

const openCalendar = (proposal) => {
  const linked = calendarEventForReview(proposal)
  router.push({
    path: '/calendar',
    query: {
      source: 'workplace',
      sourceRecordId: proposal.id,
      ...(linked?.id ? { calendarEventId: linked.id } : {}),
      ...(route.query.homePage ? { homePage: route.query.homePage } : {}),
    },
  })
}

const ensureScheduleChangeEvents = () => {
  if (!workHubStore.hasFinishedStorageHydration || !workHubStore.hasActiveAuthority) return
  workHubStore.activeScheduleProposals
    .filter((proposal) => proposal.changeOfRef)
    .forEach((proposal) => {
      const result = startWorkScheduleChangeEvent({
        workHubStore,
        simulationStore,
        proposalId: proposal.id,
      })
      const instance = result.instance || scheduleChangeInstanceFor(proposal.id)
      if (instance?.lifecycle === 'active') {
        reconcileWorkScheduleChangeEvent({
          simulationStore,
          workHubStore,
          instanceId: instance.id,
        })
      }
    })
  simulationStore.eventInstancesV2
    .filter(
      (instance) =>
        instance.templateId === WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE &&
        instance.lifecycle === 'active',
    )
    .forEach((instance) => {
      reconcileWorkScheduleChangeEvent({
        simulationStore,
        workHubStore,
        instanceId: instance.id,
      })
    })
}

watch(
  () => [
    workHubStore.hasFinishedStorageHydration,
    workHubStore.hasActiveAuthority,
    workHubStore.activeScheduleProposals
      .map((proposal) => `${proposal.id}:r${proposal.revision}:${proposal.revokedAt || 0}`)
      .join('|'),
  ],
  ensureScheduleChangeEvents,
  { immediate: true },
)

const closeApp = () => pushReturnTarget(router, route, '/home')
</script>

<template>
  <main class="work-hub-production" data-testid="work-hub-production">
    <header class="work-hub-bar">
      <button type="button" class="icon-button" :aria-label="t('关闭', 'Close')" @click="closeApp"><i class="fas fa-xmark" aria-hidden="true"></i></button>
      <div><strong>{{ appName }}</strong><span>{{ text(organization) }}</span></div>
      <span class="authority-state"><i class="fas fa-shield-check" aria-hidden="true"></i>{{ t('已连接', 'Connected') }}</span>
    </header>

    <section class="work-hub-intro">
      <p>{{ t('当前工作空间', 'Current workspace') }}</p>
      <h1>{{ text(organization) }}</h1>
      <div class="work-hub-role-line"><span>{{ membership?.displayLabel || t('成员', 'Member') }}</span><span v-if="role">{{ text(role) || role.roleKey }}</span></div>
    </section>

    <section class="work-hub-section">
      <header><div><p>{{ t('需要回应', 'Needs response') }}</p><h2>{{ t('通知与安排', 'Notices and plans') }}</h2></div><span>{{ workHubStore.activeWorkNotices.length + workHubStore.activeScheduleProposals.length }}</span></header>
      <div v-if="workHubStore.activeWorkNotices.length || workHubStore.activeScheduleProposals.length" class="work-hub-record-list">
        <article v-for="notice in workHubStore.activeWorkNotices" :key="notice.id" class="work-hub-record" :data-testid="`work-hub-notice-${notice.id}`">
          <div class="record-heading"><span><i class="fas fa-bullhorn" aria-hidden="true"></i></span><div><h3>{{ text(notice) }}</h3><p>{{ text(notice, 'bodyZh', 'bodyEn') }}</p></div></div>
          <template v-if="!receiptFor(WORK_HUB_RECORD_TYPES.WORK_NOTICE, notice.id)">
            <textarea v-model="adjustmentDrafts[notice.id]" :placeholder="t('需要调整时，可说明你的情况', 'Add context when asking for an adjustment')" maxlength="800"></textarea>
            <div class="record-actions"><button type="button" @click="decide(WORK_HUB_RECORD_TYPES.WORK_NOTICE, notice.id, 'declined')">{{ t('谢绝', 'Decline') }}</button><button type="button" @click="decide(WORK_HUB_RECORD_TYPES.WORK_NOTICE, notice.id, 'adjustment_requested')">{{ t('申请调整', 'Request adjustment') }}</button><button type="button" class="primary" @click="decide(WORK_HUB_RECORD_TYPES.WORK_NOTICE, notice.id, 'accepted')">{{ t('接受', 'Accept') }}</button></div>
          </template>
          <p v-else class="record-receipt" data-testid="work-hub-decision-receipt"><i class="fas fa-circle-check" aria-hidden="true"></i>{{ receiptFor(WORK_HUB_RECORD_TYPES.WORK_NOTICE, notice.id).action === 'accepted' ? t('已接受', 'Accepted') : receiptFor(WORK_HUB_RECORD_TYPES.WORK_NOTICE, notice.id).action === 'adjustment_requested' ? t('已申请调整', 'Adjustment requested') : t('已谢绝', 'Declined') }}</p>
        </article>

        <article v-for="proposal in workHubStore.activeScheduleProposals" :key="proposal.id" class="work-hub-record" :class="{ 'schedule-change-record': proposal.changeOfRef }" :data-testid="`work-hub-proposal-${proposal.id}`">
          <div class="record-heading"><span><i :class="proposal.changeOfRef ? 'fas fa-calendar-arrow-down' : 'fas fa-calendar-plus'" aria-hidden="true"></i></span><div><p v-if="proposal.changeOfRef" class="record-kicker">{{ t('日程变更', 'Schedule change') }}</p><h3>{{ text(proposal) }}</h3><p v-if="proposal.changeOfRef && previousProposalFor(proposal)" class="schedule-change-time"><s>{{ new Date(previousProposalFor(proposal).startsAt).toLocaleString() }}</s><strong>{{ new Date(proposal.startsAt).toLocaleString() }} - {{ new Date(proposal.endsAt).toLocaleTimeString() }}</strong></p><p v-else>{{ new Date(proposal.startsAt).toLocaleString() }} - {{ new Date(proposal.endsAt).toLocaleTimeString() }}</p><p v-if="proposal.changeOfRef && text(proposal, 'changeReasonZh', 'changeReasonEn')" class="schedule-change-reason">{{ text(proposal, 'changeReasonZh', 'changeReasonEn') }}</p></div></div>
          <p v-if="scheduleChangeStatusText(proposal.id)" class="record-event-state" :data-testid="`work-hub-event-state-${proposal.id}`"><i class="fas fa-circle-info" aria-hidden="true"></i>{{ scheduleChangeStatusText(proposal.id) }}</p>
          <template v-if="!receiptFor(WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL, proposal.id) && !isProposalExpired(proposal) && ![WORK_HUB_SCHEDULE_CHANGE_RESULT.STALE, WORK_HUB_SCHEDULE_CHANGE_RESULT.REVOKED].includes(scheduleChangeResultFor(proposal.id))">
            <textarea v-model="adjustmentDrafts[proposal.id]" :placeholder="t('需要调整时，可说明可行时间', 'Suggest a workable time when requesting an adjustment')" maxlength="800"></textarea>
            <div class="record-actions"><button type="button" @click="decide(WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL, proposal.id, 'declined')">{{ t('谢绝', 'Decline') }}</button><button type="button" @click="decide(WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL, proposal.id, 'adjustment_requested')">{{ t('申请调整', 'Request adjustment') }}</button><button type="button" class="primary" :data-testid="`work-hub-accept-${proposal.id}`" @click="decide(WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL, proposal.id, 'accepted')">{{ t('接受', 'Accept') }}</button></div>
          </template>
          <div v-else class="schedule-result">
            <p class="record-receipt"><i class="fas fa-circle-check" aria-hidden="true"></i>{{ receiptFor(WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL, proposal.id).action === 'accepted' ? (exactLinkedCalendarEvent(proposal.id) ? t('已接受，日历已保存', 'Accepted, saved in Calendar') : t('已接受，等待你在日历保存', 'Accepted, awaiting Calendar Save')) : receiptFor(WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL, proposal.id).action === 'adjustment_requested' ? t('已申请调整', 'Adjustment requested') : t('已谢绝', 'Declined') }}</p>
            <button v-if="receiptFor(WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL, proposal.id).action === 'accepted'" type="button" class="calendar-link" :data-testid="`work-hub-open-calendar-${proposal.id}`" @click="openCalendar(proposal)"><i class="fas fa-calendar-day" aria-hidden="true"></i>{{ exactLinkedCalendarEvent(proposal.id) ? t('在日历中查看', 'View in Calendar') : proposal.changeOfRef && calendarEventForReview(proposal) ? t('去日历审阅更新', 'Review update in Calendar') : t('去日历确认并保存', 'Review and Save in Calendar') }}</button>
          </div>
        </article>
      </div>
      <p v-else class="work-hub-empty-copy">{{ t('目前没有需要回应的通知。', 'There are no notices waiting for a response.') }}</p>
      <div v-if="inactiveScheduleChangeInstances.length" class="work-hub-history" data-testid="work-hub-schedule-change-history">
        <p class="history-title">{{ t('最近结束的变更', 'Recent closed changes') }}</p>
        <article v-for="instance in inactiveScheduleChangeInstances" :key="instance.id" class="history-row">
          <div><strong>{{ isZh ? instance.contextRefs.schedule_title_zh : instance.contextRefs.schedule_title_en }}</strong><span>{{ scheduleChangeResultCodeText(instance.resultCodes.at(-1)) }}</span></div>
          <time>{{ new Date(instance.updatedAt).toLocaleString() }}</time>
        </article>
      </div>
    </section>

    <section class="work-hub-section">
      <header><div><p>{{ t('正在进行', 'In progress') }}</p><h2>{{ t('我的任务', 'My tasks') }}</h2></div><span>{{ workHubStore.activeTasks.length }}</span></header>
      <div class="work-hub-record-list">
        <article v-for="task in workHubStore.activeTasks" :key="task.id" class="work-hub-record" :data-testid="`work-hub-task-${task.id}`">
          <div class="record-heading"><span><i class="fas fa-list-check" aria-hidden="true"></i></span><div><h3>{{ text(task) }}</h3><p>{{ task.dueAt ? new Date(task.dueAt).toLocaleString() : t('未设置截止时间', 'No due time') }}</p></div></div>
          <input v-model="reportDrafts[task.id]" type="text" maxlength="800" :placeholder="t('补充当前情况（可选）', 'Add a short update (optional)')" />
          <div class="status-actions"><button type="button" @click="submitStatus(task.id, 'ready')">{{ t('准备完成', 'Ready') }}</button><button type="button" @click="submitStatus(task.id, 'needs_support')">{{ t('需要协助', 'Need support') }}</button><button type="button" @click="submitStatus(task.id, 'running_late')">{{ t('可能延迟', 'May be late') }}</button></div>
        </article>
      </div>
    </section>

    <p v-if="feedback" class="work-hub-feedback" :class="{ failed }" role="status">{{ feedback }}</p>
  </main>
</template>

<style scoped>
.work-hub-production { min-height: 100%; color: #17233a; background: #f4f1e9; padding-bottom: 72px; }
:global(.app-shell:has(.work-hub-production) .status-fg) { color: #17233a; }
.work-hub-bar { position: sticky; z-index: 10; top: 0; display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 68px; padding: 10px 18px; border-bottom: 1px solid rgba(23,35,58,.14); background: color-mix(in srgb, #fffdf8 90%, transparent); backdrop-filter: blur(16px); }
.icon-button { width: 42px; height: 42px; border: 0; border-radius: 50%; color: inherit; background: rgba(23,35,58,.07); }
.work-hub-bar > div { display: flex; flex-direction: column; min-width: 0; }.work-hub-bar strong { font-size: 14px; }.work-hub-bar div span { overflow: hidden; color: #687285; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.authority-state { display: inline-flex; align-items: center; gap: 6px; color: #4f765b; font-size: 10px; font-weight: 800; }
.work-hub-intro, .work-hub-section { width: min(1040px, calc(100% - 32px)); margin-inline: auto; }
.work-hub-intro { padding: 48px 0 34px; }.work-hub-intro p, .work-hub-section header p { margin: 0; color: #70798a; font-size: 10px; font-weight: 800; text-transform: uppercase; }.work-hub-intro h1 { margin: 7px 0 14px; font-size: 34px; }.work-hub-role-line { display: flex; flex-wrap: wrap; gap: 8px; }.work-hub-role-line span { padding: 7px 10px; border: 1px solid rgba(23,35,58,.15); border-radius: 8px; font-size: 11px; }
.work-hub-section { padding: 28px 0; border-top: 1px solid rgba(23,35,58,.13); }.work-hub-section > header { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 18px; }.work-hub-section h2 { margin: 5px 0 0; font-size: 20px; }.work-hub-section > header > span { font-size: 22px; font-weight: 800; }
.work-hub-record-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }.work-hub-record { min-width: 0; padding: 17px; border: 1px solid rgba(23,35,58,.13); border-radius: 8px; background: #fffdf8; }
.record-heading { display: grid; grid-template-columns: 36px 1fr; gap: 11px; }.record-heading > span { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 8px; color: #fff; background: #d76553; }.record-heading h3, .record-heading p { margin: 0; }.record-heading h3 { font-size: 14px; }.record-heading p { margin-top: 5px; color: #687285; font-size: 11px; line-height: 1.5; }
.schedule-change-record { border-color: rgba(176, 91, 55, .32); }.schedule-change-record .record-heading > span { background: #a8563e; }.record-heading .record-kicker { margin: 0 0 4px; color: #a8563e; font-size: 9px; font-weight: 900; text-transform: uppercase; }.schedule-change-time { display: flex; flex-direction: column; gap: 3px; }.schedule-change-time strong { color: #17233a; font-size: 11px; }.schedule-change-reason { padding-top: 5px; border-top: 1px solid rgba(23,35,58,.1); }.record-event-state { display: flex; align-items: center; gap: 7px; margin: 13px 0 0; color: #96523f; font-size: 11px; font-weight: 800; }
.work-hub-record textarea, .work-hub-record input { width: 100%; margin-top: 15px; padding: 11px 12px; border: 1px solid rgba(23,35,58,.16); border-radius: 8px; color: inherit; background: transparent; outline: none; }.work-hub-record textarea { min-height: 72px; resize: vertical; }
.record-actions, .status-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; margin-top: 11px; }.record-actions button, .status-actions button, .calendar-link { min-height: 40px; padding: 0 12px; border: 1px solid rgba(23,35,58,.18); border-radius: 8px; color: inherit; background: transparent; font-size: 11px; font-weight: 800; }.record-actions .primary { color: #fff; border-color: #d76553; background: #d76553; }
.record-receipt { display: flex; align-items: center; gap: 7px; margin: 15px 0 0; color: #4f765b; font-size: 11px; font-weight: 800; }.schedule-result { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; }.schedule-result .record-receipt { margin: 0; }.calendar-link { flex: none; display: inline-flex; align-items: center; gap: 7px; }.work-hub-empty-copy { color: #687285; font-size: 12px; }.work-hub-feedback { position: fixed; z-index: 30; right: 20px; bottom: 20px; margin: 0; padding: 12px 15px; border-radius: 8px; color: #fff; background: #253247; font-size: 12px; }.work-hub-feedback.failed { background: #9d4035; }
.work-hub-history { margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(23,35,58,.12); }.history-title { margin: 0 0 8px; color: #687285; font-size: 10px; font-weight: 800; }.history-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; }.history-row + .history-row { border-top: 1px solid rgba(23,35,58,.08); }.history-row div { display: flex; min-width: 0; flex-direction: column; gap: 3px; }.history-row strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.history-row span, .history-row time { color: #687285; font-size: 10px; }
@media (max-width: 700px) { .work-hub-bar { padding-inline: 10px; }.authority-state { font-size: 0; }.authority-state i { font-size: 14px; }.work-hub-intro, .work-hub-section { width: calc(100% - 24px); }.work-hub-intro { padding-top: 32px; }.work-hub-intro h1 { font-size: 28px; }.work-hub-record-list { grid-template-columns: 1fr; }.record-actions, .status-actions { display: grid; grid-template-columns: 1fr; }.record-actions button, .status-actions button { width: 100%; }.schedule-result { align-items: stretch; flex-direction: column; }.calendar-link { justify-content: center; width: 100%; }.work-hub-feedback { right: 12px; bottom: 12px; left: 12px; text-align: center; } }
</style>
