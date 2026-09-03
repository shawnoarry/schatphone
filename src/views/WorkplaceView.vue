<script setup>
import { computed, ref, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useCalendarStore } from '../stores/calendar'
import { useWorkHubStore } from '../stores/workHub'
import { useI18n } from '../composables/useI18n'
import { useWorkplaceShellState } from '../composables/useWorkplaceShellState'
import { resolveAppIconMeta } from '../lib/app-icon-presentation'
import { buildContactsWorkHubProjection } from '../lib/contacts-work-hub-projection'
import { resolveCurrentWorldContext } from '../lib/world-interface'
import {
  WORKPLACE_BRAND,
  WORKPLACE_CALL_SHEET,
  WORKPLACE_CHANNELS,
  WORKPLACE_MEMBERSHIP,
  WORKPLACE_SCHEDULE_PROPOSALS,
  WORKPLACE_STATUS_OPTIONS,
  WORKPLACE_TASKS,
  WORKPLACE_TEAM,
} from '../lib/workplace-shell-data'
import { pushReturnTarget } from '../lib/navigation-return'
import { resolveActiveWorldSemanticBinding } from '../lib/world-setting-state'
import WorkHubProductionWorkspace from '../components/workplace/WorkHubProductionWorkspace.vue'

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const calendarStore = useCalendarStore()
const workHubStore = useWorkHubStore()
const { settings } = storeToRefs(systemStore)
const { languageBase, t } = useI18n()
const workplaceState = useWorkplaceShellState()

const activeSection = ref(route.query.section === 'tasks' ? 'tasks' : 'today')
const activeChannelId = ref(WORKPLACE_CHANNELS[0].id)
const messageDraft = ref('')
const statusId = ref('ready')
const statusNote = ref('')
const feedback = ref('')
const storageError = ref(false)
const identityEditorOpen = ref(false)
const appNameDraft = ref('')
const organizationNameDraft = ref('')

const isZh = computed(() => languageBase.value === 'zh')
// Work Hub is an independent app with a fixed warm-paper identity: it never
// follows the system day/night switch (independent-app rule).
const activeChannel = computed(
  () => WORKPLACE_CHANNELS.find((channel) => channel.id === activeChannelId.value) || WORKPLACE_CHANNELS[0],
)
const activeChannelMessages = computed(() => workplaceState.messagesForChannel(activeChannelId.value))
const completedCount = computed(() => workplaceState.completedTaskIds.value.length)
const remainingTasks = computed(() => WORKPLACE_TASKS.length - completedCount.value)
const latestStatusReport = computed(() => workplaceState.statusReports.value.at(-1) || null)
const workplaceAppMeta = computed(() => resolveAppIconMeta(
  'app_workplace',
  settings.value.appearance?.appIconOverrides,
  settings.value.system?.language,
  settings.value.appearance?.systemAppIconTheme,
))
const workplaceDisplayName = computed(
  () => workplaceAppMeta.value.displayName || workplaceAppMeta.value.label,
)
const organizationDisplayName = computed(
  () => workplaceState.organizationDisplayName.value || (isZh.value ? WORKPLACE_BRAND.companyZh : WORKPLACE_BRAND.companyEn),
)
const contactsWorkIdentity = computed(() => {
  const worldContext = resolveCurrentWorldContext({
    systemStore,
    chatStore,
    consumer: 'contacts',
  })
  const worldId = worldContext?.identity?.worldId || ''
  const matchesWorld = (profileWorldId) =>
    profileWorldId === worldId ||
    (['legacy_single_world', 'default_world'].includes(profileWorldId) &&
      ['legacy_single_world', 'default_world'].includes(worldId))
  const selfProfiles = chatStore.roleProfiles.filter(
    (profile) => profile.entityType === 'self_profile' && matchesWorld(profile.templateLink?.primaryWorldId),
  )
  if (selfProfiles.length !== 1) return null
  const profile = selfProfiles[0]
  const template = systemStore.getProfileTemplateById(profile.templateLink?.profileTemplateId)
  const result = buildContactsWorkHubProjection({
    profile,
    template,
    expectedWorldId: worldId,
    expectedProfileRevision: profile.revision,
  })
  return result.ok ? result.projection : null
})
const workHubRuntimeBinding = computed(() => {
  const world = resolveActiveWorldSemanticBinding(systemStore.user.worldSetting)
  const profileRef = contactsWorkIdentity.value?.profileRef
  if (!world.worldId || !world.semanticManifestRevision || !profileRef?.profileId || !profileRef?.revision) {
    return null
  }
  return {
    worldId: world.worldId,
    worldRevision: world.semanticManifestRevision,
    contactsProfileId: String(profileRef.profileId),
    contactsProfileRevision: profileRef.revision,
  }
})
watchEffect(() => {
  workHubStore.bindRuntimeContext(workHubRuntimeBinding.value || {})
})
const isPreviewMode = computed(() => route.query.preview === '1')
const openPreview = () => router.replace({ query: { ...route.query, preview: '1' } })
const calendarEventForProposal = (proposalId) =>
  calendarStore.findEventByScheduleHandoffSource('workplace', proposalId)

const text = (record, zhKey, enKey) => (isZh.value ? record?.[zhKey] : record?.[enKey]) || ''

const setFeedback = (zh, en) => {
  feedback.value = t(zh, en)
  window.setTimeout(() => {
    if (feedback.value === t(zh, en)) feedback.value = ''
  }, 2400)
}

const handleReceipt = (result, successZh, successEn) => {
  storageError.value = result?.ok !== true
  if (!result?.ok) return false
  setFeedback(successZh, successEn)
  return true
}

const toggleTask = (taskId) => {
  const result = workplaceState.toggleTask(taskId)
  handleReceipt(result, result.completed ? '任务已完成' : '任务已恢复', result.completed ? 'Task completed' : 'Task reopened')
}

const sendMessage = () => {
  const result = workplaceState.sendMessage(activeChannelId.value, messageDraft.value)
  if (!handleReceipt(result, '消息已发到团队频道', 'Message sent to the team channel')) return
  messageDraft.value = ''
}

const submitStatus = () => {
  const result = workplaceState.submitStatusReport(statusId.value, statusNote.value)
  if (!handleReceipt(result, '状态已报备给团队', 'Status reported to the team')) return
  statusNote.value = ''
}

const decideProposal = (proposalId, decision) => {
  const result = workplaceState.decideProposal(proposalId, decision)
  handleReceipt(
    result,
    decision === 'accepted' ? '已接受提案，等待排期确认' : '已谢绝提案',
    decision === 'accepted' ? 'Proposal accepted; scheduling confirmation is pending' : 'Proposal declined',
  )
}

const submitArtistApplication = () => {
  const result = workplaceState.submitArtistApplication()
  handleReceipt(result, '艺人入口申请已提交', 'Artist access application submitted')
}

const openIdentityEditor = () => {
  appNameDraft.value = workplaceDisplayName.value
  organizationNameDraft.value = organizationDisplayName.value
  identityEditorOpen.value = true
}

const saveIdentityDisplay = () => {
  const normalizedAppName = appNameDraft.value.trim()
  const normalizedOrganizationName = organizationNameDraft.value.trim()
  if (!normalizedAppName || !normalizedOrganizationName) return
  const organizationResult = workplaceState.setOrganizationDisplayName(normalizedOrganizationName)
  if (!handleReceipt(organizationResult, '工作台名称已更新', 'Work Hub names updated')) return
  const currentOverride = settings.value.appearance?.appIconOverrides?.app_workplace || {}
  systemStore.setAppIconOverride('app_workplace', {
    ...currentOverride,
    displayName: normalizedAppName,
  })
  identityEditorOpen.value = false
}

const resetIdentityDisplay = () => {
  const organizationResult = workplaceState.resetOrganizationDisplayName()
  if (!organizationResult.ok) {
    handleReceipt(organizationResult, '', '')
    return
  }
  const currentOverride = settings.value.appearance?.appIconOverrides?.app_workplace
  if (currentOverride) {
    systemStore.setAppIconOverride('app_workplace', {
      ...currentOverride,
      displayName: '',
    })
  }
  appNameDraft.value = isZh.value ? WORKPLACE_BRAND.nameZh : WORKPLACE_BRAND.nameEn
  organizationNameDraft.value = isZh.value ? WORKPLACE_BRAND.companyZh : WORKPLACE_BRAND.companyEn
  identityEditorOpen.value = false
  setFeedback('已恢复默认名称', 'Default names restored')
}

const homePageQuery = () => (route.query.homePage ? { homePage: route.query.homePage } : {})

const openCalendar = (sourceRecordId = WORKPLACE_CALL_SHEET.calendarRef.recordId) => {
  const linkedEvent = calendarEventForProposal(sourceRecordId)
  router.push({
    path: '/calendar',
    query: {
      source: 'workplace',
      sourceRecordId,
      ...(linkedEvent?.id ? { calendarEventId: linkedEvent.id } : {}),
      ...homePageQuery(),
    },
  })
}

const openAgenda = () => router.push({
  path: '/agenda-journey',
  query: { source: 'workplace', workplacePreview: WORKPLACE_CALL_SHEET.agendaRef.recordId, ...homePageQuery() },
})

const openMap = () => router.push({
  path: '/map',
  query: {
    source: 'workplace',
    placeId: WORKPLACE_CALL_SHEET.mapRef.recordId,
    mapPackId: WORKPLACE_CALL_SHEET.mapRef.mapPackId,
    placeRevision: String(WORKPLACE_CALL_SHEET.mapRef.revision),
    world: WORKPLACE_CALL_SHEET.mapRef.worldId,
    returnPath: '/workplace',
    returnLabel: workplaceDisplayName.value,
    ...homePageQuery(),
  },
})

const closeApp = () => pushReturnTarget(router, route, '/home')
</script>

<template>
  <WorkHubProductionWorkspace
    v-if="workHubStore.hasActiveAuthority && !isPreviewMode"
    :app-name="workplaceDisplayName"
  />
  <main v-else-if="!isPreviewMode" class="workplace-empty" data-testid="work-hub-empty">
    <header class="workplace-empty__bar">
      <button type="button" :aria-label="t('关闭', 'Close')" @click="closeApp"><i class="fas fa-xmark" aria-hidden="true"></i></button>
      <strong>{{ workplaceDisplayName }}</strong>
    </header>
    <section>
      <span><i class="fas fa-building-circle-exclamation" aria-hidden="true"></i></span>
      <p>{{ t('当前世界', 'Current world') }}</p>
      <h1>{{ t('尚未连接组织', 'No organization connected') }}</h1>
      <p>{{ t('当世界配置或正式组织签发你的成员身份后，通知、任务和排期会出现在这里。联系人资料只用于匹配，不会自动创建所属。', 'Notices, tasks, and schedule proposals will appear after the world configuration or an organization formally issues your membership. Contacts details can help match a workspace, but never create affiliation automatically.') }}</p>
      <button type="button" data-testid="work-hub-open-preview" @click="openPreview"><i class="fas fa-eye" aria-hidden="true"></i>{{ t('查看功能演示', 'View feature demo') }}</button>
    </section>
  </main>
  <main
    v-else
    class="workplace-app"
    data-app="workplace"
    data-testid="workplace-app"
    data-preview="true"
  >
    <p class="workplace-preview-banner"><i class="fas fa-flask" aria-hidden="true"></i>{{ t('功能演示 · 不代表当前世界的真实所属或权限', 'Feature demo · not real affiliation or authority in this world') }}</p>
    <header class="workplace-topbar">
      <button type="button" class="workplace-icon-button" :aria-label="t('返回主屏', 'Return Home')" data-testid="workplace-back" @click="closeApp">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <div class="workplace-wordmark" :aria-label="workplaceDisplayName">
        <span class="workplace-wordmark__mark">WH</span>
        <span>
          <strong>{{ workplaceDisplayName }}</strong>
          <small>{{ organizationDisplayName }}</small>
        </span>
      </div>
      <button type="button" class="workplace-profile-button" :aria-label="t('查看所属与凭证', 'View membership and credential')" @click="activeSection = 'organization'">
        <span>V</span>
      </button>
    </header>

    <nav class="workplace-tabs" :aria-label="t('工作台栏目', 'Workplace sections')">
      <button type="button" :class="{ 'is-active': activeSection === 'today' }" data-testid="workplace-tab-today" @click="activeSection = 'today'">
        <i class="fas fa-sun" aria-hidden="true"></i><span>{{ t('今日', 'Today') }}</span>
      </button>
      <button type="button" :class="{ 'is-active': activeSection === 'channels' }" data-testid="workplace-tab-channels" @click="activeSection = 'channels'">
        <i class="fas fa-comments" aria-hidden="true"></i><span>{{ t('频道', 'Channels') }}</span>
      </button>
      <button type="button" :class="{ 'is-active': activeSection === 'tasks' }" data-testid="workplace-tab-tasks" @click="activeSection = 'tasks'">
        <i class="fas fa-list-check" aria-hidden="true"></i><span>{{ t('工作', 'Work') }}</span>
        <em v-if="remainingTasks > 0">{{ remainingTasks }}</em>
      </button>
      <button type="button" :class="{ 'is-active': activeSection === 'organization' }" data-testid="workplace-tab-organization" @click="activeSection = 'organization'">
        <i class="fas fa-id-badge" aria-hidden="true"></i><span>{{ t('所属', 'Org') }}</span>
      </button>
    </nav>

    <div v-if="storageError" class="workplace-alert" role="alert" data-testid="workplace-storage-error">
      <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
      <span>{{ t('这次操作没有保存，请检查浏览器存储后重试。', 'This action was not saved. Check browser storage and try again.') }}</span>
    </div>
    <div v-if="feedback" class="workplace-toast" role="status">{{ feedback }}</div>

    <section v-if="activeSection === 'today'" class="workplace-page workplace-today" data-testid="workplace-today">
      <div class="workplace-page-heading">
        <div>
          <p>{{ t('8 月 24 日 · 周一', 'Monday · Aug 24') }}</p>
          <h1>{{ t('晚上好，V', 'Good evening, V') }}</h1>
        </div>
        <span class="workplace-role-chip"><i class="fas fa-star" aria-hidden="true"></i>{{ t('艺人', 'Artist') }}</span>
      </div>

      <article class="workplace-call-sheet" data-testid="workplace-call-sheet">
        <div class="workplace-call-sheet__index" aria-hidden="true">
          <span>CALL</span><strong>05:40</strong><small>25 AUG</small>
        </div>
        <div class="workplace-call-sheet__body">
          <div class="workplace-call-sheet__eyebrow">
            <span>{{ t('明日现场', 'Tomorrow on site') }}</span>
            <span class="workplace-pending-dot">{{ text(WORKPLACE_CALL_SHEET, 'statusZh', 'statusEn') }}</span>
          </div>
          <h2>{{ text(WORKPLACE_CALL_SHEET, 'titleZh', 'titleEn') }}</h2>
          <p class="workplace-venue"><i class="fas fa-location-dot" aria-hidden="true"></i>{{ text(WORKPLACE_CALL_SHEET, 'venueZh', 'venueEn') }}</p>
          <ol class="workplace-checkpoints">
            <li v-for="checkpoint in WORKPLACE_CALL_SHEET.checkpoints" :key="checkpoint.id">
              <time>{{ checkpoint.time }}</time><span>{{ text(checkpoint, 'labelZh', 'labelEn') }}</span>
            </li>
          </ol>
          <div class="workplace-handoffs">
            <button type="button" data-testid="workplace-open-calendar" @click="openCalendar()"><i class="fas fa-calendar-days" aria-hidden="true"></i>{{ t('去日历确认', 'Review in Calendar') }}</button>
            <button type="button" data-testid="workplace-open-agenda" @click="openAgenda"><i class="fas fa-route" aria-hidden="true"></i>{{ t('查看行程', 'Journey') }}</button>
            <button type="button" data-testid="workplace-open-map" @click="openMap"><i class="fas fa-map-location-dot" aria-hidden="true"></i>{{ t('查看地点', 'Map') }}</button>
          </div>
        </div>
      </article>

      <div class="workplace-today-grid">
        <section class="workplace-panel workplace-status-panel">
          <div class="workplace-panel-heading">
            <div><p>{{ t('显式报备', 'Status report') }}</p><h2>{{ t('向团队说明当前状态', 'Tell the team where you stand') }}</h2></div>
            <i class="fas fa-tower-broadcast" aria-hidden="true"></i>
          </div>
          <div class="workplace-status-options" role="radiogroup" :aria-label="t('选择报备状态', 'Choose report status')">
            <button v-for="option in WORKPLACE_STATUS_OPTIONS" :key="option.id" type="button" role="radio" :aria-checked="statusId === option.id" :class="{ 'is-active': statusId === option.id }" @click="statusId = option.id">
              {{ text(option, 'labelZh', 'labelEn') }}
            </button>
          </div>
          <textarea v-model="statusNote" maxlength="400" :placeholder="t('可选：补充需要团队知道的情况', 'Optional: add context the team should know')"></textarea>
          <button type="button" class="workplace-primary-action" data-testid="workplace-submit-status" @click="submitStatus">
            {{ t('提交报备', 'Submit report') }}
          </button>
          <p v-if="latestStatusReport" class="workplace-receipt" data-testid="workplace-latest-status"><i class="fas fa-circle-check" aria-hidden="true"></i>{{ t('最近一次报备已保存在工作台', 'Your latest report is saved in Workplace') }}</p>
        </section>

        <section class="workplace-panel workplace-task-glance">
          <div class="workplace-panel-heading">
            <div><p>{{ t('今晚', 'Tonight') }}</p><h2>{{ t(`${remainingTasks} 项还要确认`, `${remainingTasks} items to confirm`) }}</h2></div>
            <button type="button" class="workplace-inline-link" @click="activeSection = 'tasks'">{{ t('全部', 'All') }}</button>
          </div>
          <button v-for="task in WORKPLACE_TASKS.slice(0, 3)" :key="task.id" type="button" class="workplace-mini-task" :class="{ 'is-complete': workplaceState.completedTaskIds.value.includes(task.id) }" :data-testid="`workplace-today-task-${task.id}`" @click="toggleTask(task.id)">
            <span class="workplace-check"><i class="fas fa-check" aria-hidden="true"></i></span>
            <span><strong>{{ text(task, 'titleZh', 'titleEn') }}</strong><small>{{ text(task, 'dueZh', 'dueEn') }}</small></span>
          </button>
        </section>
      </div>

      <section class="workplace-team-strip">
        <div class="workplace-panel-heading">
          <div><p>{{ t('今日同行', 'With you today') }}</p><h2>{{ t('艺人 1 组', 'Artist Team 1') }}</h2></div>
          <button type="button" class="workplace-inline-link" @click="activeSection = 'organization'">{{ t('查看团队', 'Team') }}</button>
        </div>
        <div class="workplace-team-row">
          <div v-for="member in WORKPLACE_TEAM" :key="member.id" class="workplace-person">
            <span :class="`tone-${member.tone}`">{{ member.initials }}</span>
            <strong>{{ text(member, 'nameZh', 'nameEn') }}</strong>
            <small>{{ text(member, 'roleZh', 'roleEn') }}</small>
          </div>
        </div>
      </section>
    </section>

    <section v-else-if="activeSection === 'channels'" class="workplace-page workplace-channels" data-testid="workplace-channels">
      <div class="workplace-page-heading"><div><p>{{ t('内部通讯', 'Internal communications') }}</p><h1>{{ t('团队频道', 'Team channels') }}</h1></div></div>
      <div class="workplace-channel-layout">
        <aside class="workplace-channel-list" :aria-label="t('频道列表', 'Channel list')">
          <button v-for="channel in WORKPLACE_CHANNELS" :key="channel.id" type="button" :class="{ 'is-active': activeChannelId === channel.id }" :data-testid="`workplace-channel-${channel.id}`" @click="activeChannelId = channel.id">
            <span>#</span><span><strong>{{ text(channel, 'nameZh', 'nameEn') }}</strong><small>{{ text(channel, 'descriptionZh', 'descriptionEn') }}</small></span>
          </button>
        </aside>
        <section class="workplace-thread">
          <header><div><p># {{ text(activeChannel, 'nameZh', 'nameEn') }}</p><span>{{ text(activeChannel, 'descriptionZh', 'descriptionEn') }}</span></div><i class="fas fa-users" aria-hidden="true"></i></header>
          <div class="workplace-message-list" aria-live="polite">
            <article v-for="message in activeChannelMessages" :key="message.id" class="workplace-message" :class="{ 'is-self': message.channelId }">
              <span class="workplace-message__avatar">{{ message.channelId ? 'V' : (message.authorZh || '?').slice(0, 1) }}</span>
              <div><p><strong>{{ message.channelId ? 'V' : text(message, 'authorZh', 'authorEn') }}</strong><time>{{ message.time || new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</time></p><span>{{ message.channelId ? message.body : text(message, 'bodyZh', 'bodyEn') }}</span></div>
            </article>
          </div>
          <form class="workplace-compose" @submit.prevent="sendMessage">
            <textarea v-model="messageDraft" maxlength="600" :placeholder="t('写给团队…', 'Write to the team…')"></textarea>
            <button type="submit" data-testid="workplace-send-message" :disabled="!messageDraft.trim()" :aria-label="t('发送频道消息', 'Send channel message')"><i class="fas fa-arrow-up" aria-hidden="true"></i></button>
          </form>
        </section>
      </div>
    </section>

    <section v-else-if="activeSection === 'tasks'" class="workplace-page workplace-work" data-testid="workplace-work">
      <div class="workplace-page-heading"><div><p>{{ t('确认与提案', 'Confirmations & proposals') }}</p><h1>{{ t('我的工作', 'My work') }}</h1></div><span class="workplace-count">{{ completedCount }}/{{ WORKPLACE_TASKS.length }}</span></div>
      <div class="workplace-work-grid">
        <section class="workplace-panel">
          <div class="workplace-panel-heading"><div><p>{{ t('执行清单', 'Action list') }}</p><h2>{{ t('今天要确认的事', 'Things to confirm today') }}</h2></div></div>
          <button v-for="task in WORKPLACE_TASKS" :key="task.id" type="button" class="workplace-task-row" :class="{ 'is-complete': workplaceState.completedTaskIds.value.includes(task.id) }" :data-testid="`workplace-task-${task.id}`" @click="toggleTask(task.id)">
            <span class="workplace-check"><i class="fas fa-check" aria-hidden="true"></i></span>
            <span class="workplace-task-row__copy"><strong>{{ text(task, 'titleZh', 'titleEn') }}</strong><small>{{ text(task, 'ownerZh', 'ownerEn') }} · {{ text(task, 'dueZh', 'dueEn') }}</small></span>
            <span v-if="task.priority === 'high'" class="workplace-priority">{{ t('优先', 'Priority') }}</span>
          </button>
        </section>
        <section class="workplace-panel">
          <div class="workplace-panel-heading"><div><p>{{ t('排期提案', 'Schedule proposals') }}</p><h2>{{ t('等待你的意见', 'Waiting for your response') }}</h2></div></div>
          <article v-for="proposal in WORKPLACE_SCHEDULE_PROPOSALS" :key="proposal.id" class="workplace-proposal" :data-testid="`workplace-proposal-${proposal.id}`">
            <span class="workplace-proposal__date">27<small>AUG</small></span>
            <div><h3>{{ text(proposal, 'titleZh', 'titleEn') }}</h3><p>{{ text(proposal, 'dateZh', 'dateEn') }}</p><small>{{ text(proposal, 'requesterZh', 'requesterEn') }}</small></div>
            <p class="workplace-proposal__note">{{ text(proposal, 'noteZh', 'noteEn') }}</p>
            <div v-if="!workplaceState.proposalDecisions.value[proposal.id]" class="workplace-proposal__actions">
              <button type="button" :data-testid="`workplace-decline-${proposal.id}`" @click="decideProposal(proposal.id, 'declined')">{{ t('谢绝', 'Decline') }}</button>
              <button type="button" class="is-primary" :data-testid="`workplace-accept-${proposal.id}`" @click="decideProposal(proposal.id, 'accepted')">{{ t('接受提案', 'Accept proposal') }}</button>
            </div>
            <div v-else class="workplace-decision" data-testid="workplace-proposal-decision">
              <span><i class="fas fa-circle-check" aria-hidden="true"></i>{{ workplaceState.proposalDecisions.value[proposal.id] === 'accepted' ? (calendarEventForProposal(proposal.id) ? t('已接受 · 已关联日程', 'Accepted · linked to Calendar') : t('已接受 · 尚未创建日程', 'Accepted · no Calendar event yet')) : t('已谢绝', 'Declined') }}</span>
              <button
                v-if="workplaceState.proposalDecisions.value[proposal.id] === 'accepted'"
                type="button"
                :data-testid="`workplace-review-calendar-${proposal.id}`"
                @click="openCalendar(proposal.id)"
              >
                {{ calendarEventForProposal(proposal.id) ? t('在日历中查看', 'View in Calendar') : t('去日历确认', 'Review in Calendar') }}
              </button>
            </div>
          </article>
        </section>
      </div>
    </section>

    <section v-else class="workplace-page workplace-organization" data-testid="workplace-organization">
      <div class="workplace-page-heading">
        <div><p>{{ t('身份与团队', 'Identity & team') }}</p><h1>{{ t('我的所属', 'My organization') }}</h1></div>
        <button type="button" class="workplace-name-edit-trigger" data-testid="workplace-open-name-editor" @click="openIdentityEditor">
          <i class="fas fa-pen" aria-hidden="true"></i>{{ t('修改名称', 'Edit names') }}
        </button>
      </div>
      <section v-if="identityEditorOpen" class="workplace-panel workplace-name-editor" data-testid="workplace-name-editor">
        <div class="workplace-panel-heading">
          <div><p>{{ t('当前身份显示', 'Workspace identity') }}</p><h2>{{ t('给这套工作台换一个合适的名字', 'Name this workspace for your current role') }}</h2></div>
          <button type="button" class="workplace-name-editor__close" :aria-label="t('关闭名称编辑', 'Close name editor')" @click="identityEditorOpen = false"><i class="fas fa-xmark" aria-hidden="true"></i></button>
        </div>
        <div class="workplace-name-fields">
          <label>
            <span>{{ t('App 名称', 'App name') }}</span>
            <input v-model="appNameDraft" type="text" maxlength="40" data-testid="workplace-app-name-input" :placeholder="t('例如：星河工作台', 'For example: Aurora Work')" />
            <small>{{ t('同步显示在主屏、应用商城和当前 App 顶部。', 'Shown on Home, App Store, and this App header.') }}</small>
          </label>
          <label>
            <span>{{ t('组织显示名称', 'Organization display name') }}</span>
            <input v-model="organizationNameDraft" type="text" maxlength="60" data-testid="workplace-organization-name-input" :placeholder="t('公司、学校、工作室或其他单位', 'Company, school, studio, or another organization')" />
            <small>{{ t('只改变工作台抬头；不会修改所属凭证或组织鉴权。', 'Changes the workspace heading only, not affiliation credentials or authorization.') }}</small>
          </label>
        </div>
        <div class="workplace-name-actions">
          <button type="button" data-testid="workplace-reset-names" @click="resetIdentityDisplay">{{ t('恢复默认', 'Restore defaults') }}</button>
          <button type="button" class="is-primary" data-testid="workplace-save-names" :disabled="!appNameDraft.trim() || !organizationNameDraft.trim()" @click="saveIdentityDisplay">{{ t('保存名称', 'Save names') }}</button>
        </div>
      </section>
      <section
        v-if="contactsWorkIdentity"
        class="workplace-panel workplace-contacts-clue"
        data-testid="workplace-contacts-matching-clue"
      >
        <div class="workplace-panel-heading">
          <div>
            <p>{{ t('联系人匹配线索', 'Contacts matching clue') }}</p>
            <h2>
              {{ contactsWorkIdentity.occupation || t('未设置职业', 'Occupation not set') }}
              <template v-if="contactsWorkIdentity.affiliation">
                · {{ contactsWorkIdentity.affiliation }}
              </template>
            </h2>
          </div>
          <i class="fas fa-address-card" aria-hidden="true"></i>
        </div>
        <p>
          {{
            t(
              '这只用于选择工作台角色和组织匹配候选，不代表成员资格、凭证、签发或发布权限。正式组织行为仍需组织所有者校验。',
              'This only suggests a Work Hub role and organization match. It does not grant membership, credentials, signing, or publishing authority. Formal organization actions still require owner validation.',
            )
          }}
        </p>
      </section>
      <div class="workplace-organization-grid">
        <article class="workplace-credential" data-testid="workplace-credential">
          <div class="workplace-credential__top"><span>MRW</span><span>{{ t('所属凭证', 'AFFILIATION') }}</span></div>
          <div class="workplace-credential__portrait">V</div>
          <div class="workplace-credential__copy"><p>{{ WORKPLACE_MEMBERSHIP.stageName }}</p><h2>{{ text(WORKPLACE_MEMBERSHIP, 'credentialLabelZh', 'credentialLabelEn') }}</h2><span>{{ text(WORKPLACE_MEMBERSHIP, 'teamNameZh', 'teamNameEn') }} · REV {{ WORKPLACE_MEMBERSHIP.revision }}</span></div>
          <div class="workplace-credential__stripe"></div>
        </article>
        <section class="workplace-panel workplace-application">
          <div class="workplace-panel-heading"><div><p>{{ t('外部平台资格', 'External platform access') }}</p><h2>{{ t('申请艺人社区入口', 'Apply for artist community access') }}</h2></div><i class="fas fa-badge-check" aria-hidden="true"></i></div>
          <p>{{ t('公司所属只是申请依据。艺人发布入口仍需社区平台另行审核，不会在这里直接开通。', 'Company affiliation supports the application. Publishing access still requires separate approval from the community platform.') }}</p>
          <button v-if="!workplaceState.artistApplication.value" type="button" class="workplace-primary-action" data-testid="workplace-submit-artist-application" @click="submitArtistApplication">{{ t('提交申请', 'Submit application') }}</button>
          <div v-else class="workplace-application-pending" data-testid="workplace-artist-application-pending"><i class="fas fa-clock" aria-hidden="true"></i><span><strong>{{ t('等待平台审核', 'Platform review pending') }}</strong><small>{{ t('当前没有艺人发布权限', 'Artist publishing access is not granted') }}</small></span></div>
        </section>
      </div>
      <section class="workplace-panel workplace-roster">
        <div class="workplace-panel-heading"><div><p>{{ t('当前成员', 'Current members') }}</p><h2>{{ t('艺人 1 组', 'Artist Team 1') }}</h2></div><span>{{ WORKPLACE_TEAM.length }} {{ t('人', 'people') }}</span></div>
        <div class="workplace-roster-list">
          <article v-for="member in WORKPLACE_TEAM" :key="member.id"><span :class="`tone-${member.tone}`">{{ member.initials }}</span><div><strong>{{ text(member, 'nameZh', 'nameEn') }}</strong><small>{{ text(member, 'roleZh', 'roleEn') }}</small></div><span class="workplace-online-status"><i class="fas fa-circle" aria-hidden="true"></i><span class="sr-only">{{ t('在线', 'Online') }}</span></span></article>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.workplace-empty { min-height: 100%; color: #17233a; background: #f4f1e9; }
:global(.app-shell:has(.workplace-app) .status-fg),
:global(.app-shell:has(.workplace-empty) .status-fg) { color: #17233a; }
.workplace-empty__bar { display: flex; align-items: center; gap: 12px; min-height: 68px; padding: 10px 16px; border-bottom: 1px solid rgba(23,35,58,.14); }
.workplace-empty__bar button { display: grid; place-items: center; width: 42px; height: 42px; border: 0; border-radius: 50%; color: inherit; background: rgba(23,35,58,.07); }
.workplace-empty > section { width: min(620px, calc(100% - 32px)); margin: 0 auto; padding: 96px 0; text-align: center; }
.workplace-empty > section > span { display: grid; place-items: center; width: 68px; height: 68px; margin: 0 auto 22px; border-radius: 20px; color: #fff; background: #d76553; font-size: 24px; }
.workplace-empty section > p { margin: 0 auto; max-width: 560px; color: #687285; font-size: 12px; line-height: 1.75; }
.workplace-empty section > p:first-of-type { font-size: 10px; font-weight: 800; text-transform: uppercase; }
.workplace-empty h1 { margin: 8px 0 16px; font-size: 34px; }
.workplace-empty section > button { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin-top: 24px; padding: 0 16px; border: 1px solid rgba(23,35,58,.18); border-radius: 8px; color: inherit; background: transparent; font-weight: 800; }
.workplace-preview-banner { position: sticky; z-index: 30; top: 0; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 34px; margin: 0; padding: 6px 12px; color: #6d4b12; background: #fff1c7; font-size: 10px; font-weight: 800; text-align: center; }
.workplace-app {
  --wp-ink: #17233a;
  --wp-ink-soft: #4f5c70;
  --wp-paper: #f2eee5;
  --wp-paper-strong: #fffdf8;
  --wp-line: rgba(23, 35, 58, 0.14);
  --wp-coral: #e66b57;
  --wp-coral-soft: #f7d6cf;
  --wp-sage: #a8bca7;
  --wp-gold: #d4aa52;
  position: relative;
  min-height: 100%;
  overflow-x: hidden;
  color: var(--wp-ink);
  background:
    linear-gradient(90deg, transparent 0 23px, rgba(23, 35, 58, 0.035) 24px, transparent 25px),
    radial-gradient(circle at 82% 5%, rgba(230, 107, 87, 0.12), transparent 28%),
    var(--wp-paper);
  font-family: "Aptos", "Noto Sans SC", sans-serif;
}

button, textarea { font: inherit; }
input { font: inherit; }
button { color: inherit; }

.workplace-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  min-height: 66px;
  padding: 8px 18px;
  border-bottom: 1px solid var(--wp-line);
  background: color-mix(in srgb, var(--wp-paper) 88%, transparent);
  backdrop-filter: blur(18px);
}

.workplace-icon-button, .workplace-profile-button {
  width: 44px; height: 44px; border: 0; border-radius: 50%; background: transparent;
}
.workplace-icon-button:hover, .workplace-profile-button:hover { background: color-mix(in srgb, var(--wp-ink) 7%, transparent); }
.workplace-profile-button { display: grid; place-items: center; }
.workplace-profile-button span { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; color: #fff; background: var(--wp-coral); font-weight: 850; }

.workplace-wordmark { justify-self: center; display: flex; align-items: center; gap: 9px; min-width: 0; }
.workplace-wordmark__mark { display: grid; place-items: center; width: 34px; height: 34px; border: 2px solid var(--wp-ink); font-family: Georgia, serif; font-size: 13px; font-weight: 900; transform: rotate(-3deg); }
.workplace-wordmark > span:last-child { display: flex; flex-direction: column; min-width: 0; }
.workplace-wordmark strong { display: block; overflow: hidden; font-family: Georgia, "Noto Serif SC", serif; font-size: 18px; line-height: 1; text-overflow: ellipsis; white-space: nowrap; }
.workplace-wordmark small { display: block; margin-top: 3px; overflow: hidden; color: var(--wp-ink-soft); font-size: 8px; letter-spacing: .12em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }

.workplace-tabs {
  position: sticky; top: 66px; z-index: 19; display: flex; justify-content: center; gap: 8px; padding: 9px 18px;
  border-bottom: 1px solid var(--wp-line); background: color-mix(in srgb, var(--wp-paper) 92%, transparent); backdrop-filter: blur(18px);
}
.workplace-tabs button { position: relative; display: flex; align-items: center; justify-content: center; gap: 7px; min-width: 92px; min-height: 42px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent; color: var(--wp-ink-soft); font-size: 13px; font-weight: 750; }
.workplace-tabs button.is-active { color: var(--wp-paper-strong); background: var(--wp-ink); }
.workplace-tabs em { display: grid; place-items: center; min-width: 19px; height: 19px; padding: 0 5px; border-radius: 999px; color: #fff; background: var(--wp-coral); font-size: 10px; font-style: normal; }

.workplace-page { width: min(1100px, 100%); margin: 0 auto; padding: 30px clamp(18px, 4vw, 46px) 90px; }
.workplace-page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 24px; }
.workplace-page-heading p, .workplace-page-heading h1 { margin: 0; }
.workplace-page-heading p { color: var(--wp-coral); font-size: 11px; font-weight: 850; letter-spacing: .13em; text-transform: uppercase; }
.workplace-page-heading h1 { margin-top: 5px; font-family: Georgia, "Noto Serif SC", serif; font-size: clamp(30px, 5vw, 48px); line-height: 1; letter-spacing: -.04em; }
.workplace-role-chip, .workplace-count { display: inline-flex; align-items: center; gap: 7px; padding: 8px 12px; border: 1px solid var(--wp-line); border-radius: 999px; background: var(--wp-paper-strong); font-size: 12px; font-weight: 750; }

.workplace-call-sheet { display: grid; grid-template-columns: 142px 1fr; overflow: hidden; border: 1px solid var(--wp-line); border-radius: 26px; background: var(--wp-paper-strong); box-shadow: 0 20px 50px rgba(23, 35, 58, .09); }
.workplace-call-sheet__index { display: flex; flex-direction: column; justify-content: space-between; min-height: 330px; padding: 23px 20px; color: #fff; background: var(--wp-ink); }
.workplace-call-sheet__index span, .workplace-call-sheet__index small { font-size: 10px; font-weight: 800; letter-spacing: .15em; }
.workplace-call-sheet__index strong { writing-mode: vertical-rl; transform: rotate(180deg); font-family: Georgia, serif; font-size: 42px; letter-spacing: -.06em; }
.workplace-call-sheet__body { min-width: 0; padding: 24px clamp(20px, 4vw, 38px); }
.workplace-call-sheet__eyebrow { display: flex; justify-content: space-between; gap: 15px; color: var(--wp-ink-soft); font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.workplace-pending-dot { color: var(--wp-coral); }
.workplace-call-sheet h2 { margin: 22px 0 7px; font-family: Georgia, "Noto Serif SC", serif; font-size: clamp(28px, 4vw, 42px); line-height: 1.05; }
.workplace-venue { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--wp-ink-soft); }
.workplace-checkpoints { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; margin: 28px 0 24px; padding: 0; list-style: none; border-block: 1px solid var(--wp-line); }
.workplace-checkpoints li { display: flex; flex-direction: column; gap: 5px; min-width: 0; padding: 15px 12px; border-right: 1px solid var(--wp-line); }
.workplace-checkpoints li:last-child { border-right: 0; }
.workplace-checkpoints time { font-family: Georgia, serif; font-size: 20px; font-weight: 800; }
.workplace-checkpoints span { color: var(--wp-ink-soft); font-size: 11px; }
.workplace-handoffs { display: flex; flex-wrap: wrap; gap: 8px; }
.workplace-handoffs button { min-height: 44px; padding: 0 14px; border: 1px solid var(--wp-line); border-radius: 12px; background: transparent; font-size: 12px; font-weight: 750; }
.workplace-handoffs i { margin-right: 7px; color: var(--wp-coral); }

.workplace-today-grid, .workplace-work-grid, .workplace-organization-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-top: 18px; }
.workplace-panel, .workplace-team-strip { min-width: 0; padding: 22px; border: 1px solid var(--wp-line); border-radius: 22px; background: color-mix(in srgb, var(--wp-paper-strong) 92%, transparent); }
.workplace-panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.workplace-panel-heading p, .workplace-panel-heading h2 { margin: 0; }
.workplace-panel-heading p { color: var(--wp-coral); font-size: 10px; font-weight: 850; letter-spacing: .13em; text-transform: uppercase; }
.workplace-panel-heading h2 { margin-top: 4px; font-family: Georgia, "Noto Serif SC", serif; font-size: 21px; line-height: 1.15; }
.workplace-panel-heading > i { color: var(--wp-coral); font-size: 22px; }
.workplace-inline-link { min-height: 40px; border: 0; background: transparent; color: var(--wp-coral); font-size: 12px; font-weight: 800; }
.workplace-name-edit-trigger { display: inline-flex; align-items: center; gap: 7px; min-height: 42px; padding: 0 14px; border: 1px solid var(--wp-line); border-radius: 999px; color: var(--wp-ink); background: color-mix(in srgb, var(--wp-paper-strong) 86%, transparent); font-size: 11px; font-weight: 800; }
.workplace-name-edit-trigger i { color: var(--wp-coral); }
.workplace-name-editor { margin-bottom: 18px; }
.workplace-name-editor__close { width: 40px; height: 40px; border: 0; border-radius: 50%; color: var(--wp-ink-soft); background: color-mix(in srgb, var(--wp-paper) 78%, transparent); }
.workplace-name-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
.workplace-name-fields label { display: flex; flex-direction: column; min-width: 0; }
.workplace-name-fields label > span { margin-bottom: 7px; font-size: 11px; font-weight: 850; }
.workplace-name-fields input { width: 100%; min-height: 46px; padding: 0 13px; border: 1px solid var(--wp-line); border-radius: 13px; color: var(--wp-ink); background: color-mix(in srgb, var(--wp-paper) 68%, transparent); outline: none; }
.workplace-name-fields small { margin-top: 7px; color: var(--wp-ink-soft); font-size: 9px; line-height: 1.5; }
.workplace-name-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 17px; }
.workplace-name-actions button { min-height: 42px; padding: 0 15px; border: 1px solid var(--wp-line); border-radius: 12px; background: transparent; font-size: 11px; font-weight: 800; }
.workplace-name-actions button.is-primary { color: #fff; border-color: var(--wp-coral); background: var(--wp-coral); }
.workplace-name-actions button:disabled { opacity: .38; }

.workplace-status-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 20px 0 10px; }
.workplace-status-options button { min-height: 42px; padding: 5px 8px; border: 1px solid var(--wp-line); border-radius: 11px; background: transparent; font-size: 11px; font-weight: 750; }
.workplace-status-options button.is-active { border-color: var(--wp-coral); background: var(--wp-coral-soft); color: var(--wp-ink); }
.workplace-status-panel textarea, .workplace-compose textarea { width: 100%; resize: vertical; border: 1px solid var(--wp-line); color: var(--wp-ink); background: color-mix(in srgb, var(--wp-paper) 70%, transparent); outline: none; }
.workplace-status-panel textarea { min-height: 84px; margin-bottom: 10px; padding: 12px; border-radius: 13px; }
.workplace-primary-action { min-height: 44px; padding: 0 17px; border: 0; border-radius: 12px; color: #fff; background: var(--wp-coral); font-weight: 800; }
.workplace-receipt { display: flex; align-items: center; gap: 7px; margin: 12px 0 0; color: var(--wp-ink-soft); font-size: 11px; }
.workplace-receipt i { color: #6d9c76; }

.workplace-mini-task, .workplace-task-row { width: 100%; display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 10px; border: 0; border-bottom: 1px solid var(--wp-line); background: transparent; text-align: left; }
.workplace-mini-task { padding: 14px 0; }
.workplace-task-row { padding: 17px 4px; }
.workplace-mini-task:last-child, .workplace-task-row:last-child { border-bottom: 0; }
.workplace-check { display: grid; place-items: center; width: 24px; height: 24px; border: 1px solid var(--wp-line); border-radius: 8px; color: transparent; }
.is-complete .workplace-check { color: #fff; border-color: var(--wp-ink); background: var(--wp-ink); }
.workplace-mini-task > span:last-child, .workplace-task-row__copy { display: flex; flex-direction: column; min-width: 0; }
.workplace-mini-task strong, .workplace-task-row strong { font-size: 13px; }
.workplace-mini-task small, .workplace-task-row small { margin-top: 4px; color: var(--wp-ink-soft); font-size: 10px; }
.is-complete strong { color: var(--wp-ink-soft); text-decoration: line-through; }
.workplace-priority { padding: 5px 8px; border-radius: 999px; color: #a83e31; background: var(--wp-coral-soft); font-size: 9px; font-weight: 850; }

.workplace-team-strip { margin-top: 18px; }
.workplace-team-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; margin-top: 18px; }
.workplace-person { display: flex; flex-direction: column; align-items: center; min-width: 0; text-align: center; }
.workplace-person > span, .workplace-roster-list article > span { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 17px; color: #fff; font-weight: 850; }
.tone-ink { background: #26334a; }.tone-coral { background: #d66f5d; }.tone-sage { background: #7f9d82; }.tone-gold { background: #bc9140; }
.workplace-person strong { margin-top: 9px; font-size: 12px; }
.workplace-person small { margin-top: 2px; color: var(--wp-ink-soft); font-size: 10px; }

.workplace-channel-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: 590px; overflow: hidden; border: 1px solid var(--wp-line); border-radius: 24px; background: var(--wp-paper-strong); }
.workplace-channel-list { padding: 12px; border-right: 1px solid var(--wp-line); background: color-mix(in srgb, var(--wp-paper) 72%, transparent); }
.workplace-channel-list button { width: 100%; display: grid; grid-template-columns: 22px 1fr; gap: 8px; min-height: 68px; padding: 12px; border: 0; border-radius: 14px; background: transparent; text-align: left; }
.workplace-channel-list button.is-active { background: var(--wp-paper-strong); box-shadow: 0 8px 24px rgba(23, 35, 58, .08); }
.workplace-channel-list button > span:first-child { color: var(--wp-coral); font-family: Georgia, serif; font-size: 20px; }
.workplace-channel-list button > span:last-child { display: flex; flex-direction: column; min-width: 0; }
.workplace-channel-list strong { font-size: 12px; }
.workplace-channel-list small { display: -webkit-box; margin-top: 4px; overflow: hidden; color: var(--wp-ink-soft); font-size: 9px; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.workplace-thread { display: flex; flex-direction: column; min-width: 0; }
.workplace-thread > header { display: flex; align-items: center; justify-content: space-between; min-height: 72px; padding: 15px 20px; border-bottom: 1px solid var(--wp-line); }
.workplace-thread > header p, .workplace-thread > header span { margin: 0; }
.workplace-thread > header p { font-weight: 850; }
.workplace-thread > header span { display: block; margin-top: 4px; color: var(--wp-ink-soft); font-size: 10px; }
.workplace-message-list { flex: 1; min-height: 0; padding: 22px; overflow-y: auto; }
.workplace-message { display: grid; grid-template-columns: 38px 1fr; gap: 10px; margin-bottom: 20px; }
.workplace-message__avatar { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 12px; color: #fff; background: var(--wp-ink); font-size: 11px; font-weight: 850; }
.workplace-message.is-self .workplace-message__avatar { background: var(--wp-coral); }
.workplace-message p { display: flex; align-items: baseline; gap: 8px; margin: 0 0 5px; }
.workplace-message strong { font-size: 11px; }.workplace-message time { color: var(--wp-ink-soft); font-size: 9px; }
.workplace-message div > span { display: inline-block; max-width: 620px; padding: 11px 13px; border-radius: 5px 15px 15px 15px; background: color-mix(in srgb, var(--wp-paper) 76%, transparent); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.workplace-message.is-self div > span { background: var(--wp-coral-soft); }
.workplace-compose { display: grid; grid-template-columns: 1fr 44px; align-items: end; gap: 8px; padding: 12px; border-top: 1px solid var(--wp-line); }
.workplace-compose textarea { min-height: 48px; max-height: 130px; padding: 12px; border-radius: 15px; }
.workplace-compose button { width: 44px; height: 44px; border: 0; border-radius: 14px; color: #fff; background: var(--wp-coral); }
.workplace-compose button:disabled { opacity: .35; }

.workplace-proposal { display: grid; grid-template-columns: 62px 1fr; gap: 14px; margin-top: 20px; }
.workplace-proposal__date { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 58px; height: 68px; border: 1px solid var(--wp-line); border-radius: 15px; font-family: Georgia, serif; font-size: 24px; font-weight: 850; }
.workplace-proposal__date small { font-family: inherit; font-size: 8px; letter-spacing: .12em; }
.workplace-proposal h3, .workplace-proposal p { margin: 0; }
.workplace-proposal h3 { font-size: 14px; }.workplace-proposal div > p { margin-top: 5px; font-size: 11px; }.workplace-proposal div > small { color: var(--wp-ink-soft); font-size: 10px; }
.workplace-proposal__note { grid-column: 1 / -1; padding: 12px; border-left: 3px solid var(--wp-coral); color: var(--wp-ink-soft); background: color-mix(in srgb, var(--wp-paper) 74%, transparent); font-size: 11px; line-height: 1.55; }
.workplace-proposal__actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px; }
.workplace-proposal__actions button { min-height: 42px; padding: 0 14px; border: 1px solid var(--wp-line); border-radius: 11px; background: transparent; font-weight: 750; }
.workplace-proposal__actions button.is-primary { color: #fff; border-color: var(--wp-coral); background: var(--wp-coral); }
.workplace-decision { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: 12px; color: #52705a; background: rgba(125, 157, 130, .14); font-size: 11px; }
.workplace-decision span { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.workplace-decision button { min-height: 40px; flex: none; padding: 0 12px; border: 1px solid currentColor; border-radius: 10px; color: inherit; background: transparent; font: inherit; font-weight: 800; }

.workplace-credential { position: relative; min-height: 300px; overflow: hidden; padding: 23px; border-radius: 24px; color: #f9f6ee; background: #17233a; box-shadow: 0 24px 54px rgba(23,35,58,.22); }
.workplace-credential::after { content: ""; position: absolute; inset: -45% -20% auto auto; width: 250px; height: 250px; border: 1px solid rgba(255,255,255,.12); border-radius: 50%; box-shadow: 0 0 0 42px rgba(255,255,255,.035), 0 0 0 84px rgba(255,255,255,.025); }
.workplace-credential__top { display: flex; justify-content: space-between; font-size: 9px; font-weight: 850; letter-spacing: .14em; }
.workplace-credential__portrait { position: relative; z-index: 1; display: grid; place-items: center; width: 82px; height: 102px; margin-top: 34px; border: 1px solid rgba(255,255,255,.2); border-radius: 42px 42px 14px 14px; color: #17233a; background: #f0b2a5; font-family: Georgia, serif; font-size: 38px; }
.workplace-credential__copy { position: absolute; z-index: 1; left: 128px; right: 22px; bottom: 42px; }
.workplace-credential__copy p, .workplace-credential__copy h2 { margin: 0; }.workplace-credential__copy p { color: #f09a86; font-family: Georgia, serif; font-size: 29px; }.workplace-credential__copy h2 { margin-top: 5px; font-size: 13px; }.workplace-credential__copy span { display: block; margin-top: 8px; color: rgba(255,255,255,.58); font-size: 9px; letter-spacing: .06em; }
.workplace-credential__stripe { position: absolute; left: 0; right: 0; bottom: 0; height: 13px; background: repeating-linear-gradient(90deg, #e66b57 0 34px, #f2eee5 34px 68px, #d4aa52 68px 102px); }
.workplace-application > p { color: var(--wp-ink-soft); font-size: 12px; line-height: 1.65; }
.workplace-application-pending { display: flex; align-items: center; gap: 12px; padding: 13px; border: 1px solid var(--wp-line); border-radius: 14px; background: color-mix(in srgb, var(--wp-paper) 72%, transparent); }
.workplace-application-pending > i { color: var(--wp-gold); font-size: 20px; }.workplace-application-pending span { display: flex; flex-direction: column; }.workplace-application-pending small { margin-top: 3px; color: var(--wp-ink-soft); font-size: 10px; }
.workplace-roster { margin-top: 18px; }
.workplace-roster-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 17px; }
.workplace-roster-list article { display: grid; grid-template-columns: 48px 1fr auto; align-items: center; gap: 11px; padding: 10px; border: 1px solid var(--wp-line); border-radius: 15px; }
.workplace-roster-list article div { display: flex; flex-direction: column; min-width: 0; }.workplace-roster-list small { margin-top: 3px; color: var(--wp-ink-soft); font-size: 10px; }.workplace-online-status { display: inline-grid; place-items: center; color: #79a382; font-size: 7px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

.workplace-alert, .workplace-toast { position: fixed; z-index: 50; left: 50%; transform: translateX(-50%); width: min(520px, calc(100% - 32px)); border-radius: 14px; box-shadow: 0 16px 36px rgba(23,35,58,.2); }
.workplace-alert { top: 126px; display: flex; gap: 9px; padding: 12px 14px; color: #7f332b; background: #ffe0d8; font-size: 11px; }
.workplace-toast { bottom: 22px; padding: 12px 18px; color: #fff; background: #17233a; text-align: center; font-size: 11px; font-weight: 750; }

button:focus-visible, textarea:focus-visible, input:focus-visible { outline: 3px solid color-mix(in srgb, var(--wp-coral) 72%, white); outline-offset: 2px; }

@media (max-width: 720px) {
  .workplace-topbar { padding-inline: 10px; }
  .workplace-toast { position: static; transform: none; width: auto; margin: 12px 14px 0; }
  .workplace-tabs { top: 66px; justify-content: space-between; gap: 2px; padding: 7px 8px; }
  .workplace-tabs button { min-width: 0; flex: 1; min-height: 48px; padding: 0 5px; flex-direction: column; gap: 2px; border-radius: 13px; font-size: 9px; }
  .workplace-tabs button i { font-size: 14px; }.workplace-tabs em { position: absolute; top: 3px; right: 8px; min-width: 16px; height: 16px; font-size: 8px; }
  .workplace-page { padding: 24px 14px 88px; }
  .workplace-page-heading { align-items: flex-start; }.workplace-page-heading h1 { font-size: 32px; }
  .workplace-call-sheet { grid-template-columns: 58px minmax(0, 1fr); border-radius: 19px; }
  .workplace-call-sheet__index { min-height: 410px; padding: 18px 12px; }.workplace-call-sheet__index strong { font-size: 27px; }
  .workplace-call-sheet__body { padding: 20px 15px; }.workplace-call-sheet h2 { font-size: 27px; }
  .workplace-call-sheet__eyebrow { flex-direction: column; gap: 5px; }
  .workplace-checkpoints { grid-template-columns: repeat(2, minmax(0, 1fr)); }.workplace-checkpoints li:nth-child(2) { border-right: 0; }.workplace-checkpoints li:nth-child(-n+2) { border-bottom: 1px solid var(--wp-line); }
  .workplace-handoffs { display: grid; grid-template-columns: 1fr; }.workplace-handoffs button { text-align: left; }
  .workplace-today-grid, .workplace-work-grid, .workplace-organization-grid { grid-template-columns: 1fr; }
  .workplace-name-fields { grid-template-columns: 1fr; }
  .workplace-name-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .workplace-status-options { grid-template-columns: 1fr; }.workplace-status-options button { text-align: left; padding-inline: 12px; }
  .workplace-decision { align-items: stretch; flex-direction: column; }
  .workplace-decision button { width: 100%; min-height: 44px; }
  .workplace-team-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 19px 8px; }
  .workplace-channel-layout { grid-template-columns: 1fr; min-height: 640px; }
  .workplace-channel-list { display: flex; gap: 7px; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--wp-line); scrollbar-width: none; }
  .workplace-channel-list button { flex: 0 0 220px; }
  .workplace-message-list { padding: 17px 13px; }.workplace-message div > span { font-size: 11px; }
  .workplace-roster-list { grid-template-columns: 1fr; }
  .workplace-credential__copy { left: 117px; }.workplace-credential__copy h2 { font-size: 11px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
}
</style>
