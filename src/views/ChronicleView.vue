<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useDialog } from '../composables/useDialog'
import { pushReturnTarget } from '../lib/navigation-return'
import { CHRONICLE_MOOD, chronicleDateKey } from '../lib/chronicle'
import {
  inspectChronicleSourceRef,
  projectChronicleTimeline,
} from '../lib/chronicle-projection'
import { useActivitySessionStore } from '../stores/activitySession'
import { useAgendaJourneyStore } from '../stores/agendaJourney'
import { useCalendarStore } from '../stores/calendar'
import { useChronicleStore } from '../stores/chronicle'
import { useMapStore } from '../stores/map'
import { useSimulationStore } from '../stores/simulation'
import { useSystemStore } from '../stores/system'
import { useWorkHubStore } from '../stores/workHub'

const router = useRouter()
const route = useRoute()
const { t, languageBase } = useI18n()
const { confirmDialog } = useDialog()

const systemStore = useSystemStore()
const chronicleStore = useChronicleStore()
const calendarStore = useCalendarStore()
const agendaJourneyStore = useAgendaJourneyStore()
const mapStore = useMapStore()
const activitySessionStore = useActivitySessionStore()
const workHubStore = useWorkHubStore()
const simulationStore = useSimulationStore()

const { events: calendarEvents } = storeToRefs(calendarStore)
const { journeys: agendaJourneys } = storeToRefs(agendaJourneyStore)
const { tripState, tripHistory } = storeToRefs(mapStore)
const { sessions: activitySessions } = storeToRefs(activitySessionStore)
const { receipts: workHubReceipts } = storeToRefs(workHubStore)
const { eventInstancesV2, ownerFacts } = storeToRefs(simulationStore)
const { orderedEntries } = storeToRefs(chronicleStore)

const todayKey = ref(chronicleDateKey(Date.now()))
const selectedDate = ref(todayKey.value)
const viewMode = ref('day')
const sourceFilter = ref('all')
const selectedItem = ref(null)
const editorOpen = ref(false)
const editorMode = ref('create')
const feedback = reactive({ type: '', message: '' })

const editor = reactive({
  id: '',
  entryDate: todayKey.value,
  title: '',
  body: '',
  mood: CHRONICLE_MOOD.UNMARKED,
  tags: '',
  sourceRefs: [],
})

const activeWorldId = computed(() =>
  String(systemStore.user.worldSetting?.identity?.worldId || '').trim(),
)

const timelineNodes = computed(() =>
  projectChronicleTimeline({
    calendarEvents: calendarEvents.value,
    agendaJourneys: agendaJourneys.value,
    mapTripState: tripState.value,
    mapTripHistory: tripHistory.value,
    activitySessions: activitySessions.value,
    workHubReceipts: workHubReceipts.value,
    eventInstances: eventInstancesV2.value,
    ownerFacts: ownerFacts.value,
    worldId: activeWorldId.value,
  }),
)

const moodOptions = computed(() => [
  { value: CHRONICLE_MOOD.UNMARKED, label: t('不标记', 'Unmarked'), icon: 'fa-minus' },
  { value: CHRONICLE_MOOD.CALM, label: t('平静', 'Calm'), icon: 'fa-water' },
  { value: CHRONICLE_MOOD.BRIGHT, label: t('明亮', 'Bright'), icon: 'fa-sun' },
  { value: CHRONICLE_MOOD.EXCITED, label: t('雀跃', 'Excited'), icon: 'fa-bolt' },
  { value: CHRONICLE_MOOD.TIRED, label: t('疲惫', 'Tired'), icon: 'fa-moon' },
  { value: CHRONICLE_MOOD.HEAVY, label: t('沉重', 'Heavy'), icon: 'fa-cloud' },
])

const sourceOptions = computed(() => [
  { value: 'all', label: t('全部', 'All') },
  { value: 'diary', label: t('我的记录', 'My notes') },
  { value: 'work-hub', label: t('工作', 'Work') },
  { value: 'calendar', label: t('日历', 'Calendar') },
  { value: 'agenda-journey', label: t('行程', 'Agenda') },
  { value: 'map', label: t('地图', 'Map') },
  { value: 'activity-session', label: t('活动', 'Activity') },
])

const ownerLabel = (owner) => ({
  calendar: t('日历', 'Calendar'),
  'agenda-journey': t('行程', 'Agenda Journey'),
  map: t('地图', 'Map'),
  'activity-session': t('活动记录', 'Activity'),
  'work-hub': t('工作台', 'Work Hub'),
  'event-runtime': t('事件来源', 'Event source'),
}[owner] || t('来源', 'Source'))

const ownerIcon = (owner) => ({
  calendar: 'fa-calendar-days',
  'agenda-journey': 'fa-route',
  map: 'fa-location-dot',
  'activity-session': 'fa-stopwatch',
  'work-hub': 'fa-briefcase',
  'event-runtime': 'fa-circle-nodes',
}[owner] || 'fa-link')

const stageIcon = (stage) => ({
  work_decision: 'fa-briefcase',
  calendar_commitment: 'fa-calendar-check',
  agenda_execution: 'fa-route',
  map_journey: 'fa-location-dot',
  activity_session: 'fa-stopwatch',
}[stage] || 'fa-circle')

const moodMeta = (mood) =>
  moodOptions.value.find((option) => option.value === mood) || moodOptions.value[0]

const diaryItems = computed(() =>
  orderedEntries.value.map((entry) => ({
    kind: 'diary',
    id: entry.id,
    dateKey: entry.entryDate,
    occurredAt: entry.updatedAt,
    title: entry.title || t('我的记录', 'My note'),
    summary: entry.body,
    status: entry.mood,
    sourceRefs: entry.sourceRefs,
    sourceOwner: 'diary',
    entry,
  })),
)

const projectedItems = computed(() =>
  timelineNodes.value.map((node) => ({
    kind: 'timeline',
    id: node.id,
    dateKey: node.dateKey,
    occurredAt: node.occurredAt,
    title: languageBase.value === 'zh' ? node.titleZh : node.titleEn,
    summary: languageBase.value === 'zh' ? node.summaryZh : node.summaryEn,
    status: node.status,
    stage: node.stage,
    sourceRefs: node.sourceRefs,
    sourceOwner: node.sourceRefs[0]?.owner || '',
    node,
  })),
)

const allItems = computed(() =>
  [...projectedItems.value, ...diaryItems.value].sort(
    (left, right) => right.occurredAt - left.occurredAt || left.id.localeCompare(right.id),
  ),
)

const visibleItems = computed(() => {
  const byMode = viewMode.value === 'day'
    ? allItems.value.filter((item) => item.dateKey === selectedDate.value)
    : allItems.value.slice(0, 60)
  if (sourceFilter.value === 'all') return byMode
  return byMode.filter((item) => {
    if (sourceFilter.value === 'diary') return item.kind === 'diary'
    return item.sourceOwner === sourceFilter.value ||
      item.sourceRefs.some((reference) => reference.owner === sourceFilter.value)
  })
})

const groupedItems = computed(() => {
  const groups = new Map()
  visibleItems.value.forEach((item) => {
    if (!groups.has(item.dateKey)) groups.set(item.dateKey, [])
    groups.get(item.dateKey).push(item)
  })
  return [...groups.entries()].map(([dateKey, items]) => ({ dateKey, items }))
})

const selectedItemSources = computed(() =>
  (selectedItem.value?.sourceRefs || []).map((sourceRef) => ({
    sourceRef,
    inspection: selectedItem.value?.kind === 'timeline'
      ? { ok: true, code: 'chronicle_source_verified' }
      : inspectChronicleSourceRef(sourceRef, timelineNodes.value),
  })),
)

const formatDayHeading = (dateKey) => {
  const date = new Date(`${dateKey}T12:00:00`)
  if (Number.isNaN(date.getTime())) return dateKey
  return new Intl.DateTimeFormat(languageBase.value === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

const formatTime = (timestamp) =>
  new Intl.DateTimeFormat(languageBase.value === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))

const moveDate = (delta) => {
  const date = new Date(`${selectedDate.value}T12:00:00`)
  date.setDate(date.getDate() + delta)
  const next = chronicleDateKey(date.getTime())
  if (next > todayKey.value) return
  selectedDate.value = next
}

const resetEditor = ({ entry = null, sourceRefs = [] } = {}) => {
  editorMode.value = entry ? 'edit' : 'create'
  editor.id = entry?.id || ''
  editor.entryDate = entry?.entryDate || selectedItem.value?.dateKey || selectedDate.value
  editor.title = entry?.title || ''
  editor.body = entry?.body || ''
  editor.mood = entry?.mood || CHRONICLE_MOOD.UNMARKED
  editor.tags = Array.isArray(entry?.tags) ? entry.tags.join(', ') : ''
  editor.sourceRefs = entry?.sourceRefs?.map((reference) => ({ ...reference })) ||
    sourceRefs.map((reference) => ({ ...reference }))
}

const openNewEditor = (sourceRefs = []) => {
  resetEditor({ sourceRefs })
  editorOpen.value = true
}

const openEditEditor = (entry) => {
  resetEditor({ entry })
  editorOpen.value = true
}

const saveEditor = () => {
  const input = {
    entryDate: editor.entryDate,
    title: editor.title,
    body: editor.body,
    mood: editor.mood,
    tags: editor.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
    sourceRefs: editor.sourceRefs,
  }
  const result = editorMode.value === 'edit'
    ? chronicleStore.editEntry(editor.id, input)
    : chronicleStore.addEntry(input)
  if (!result.ok) {
    feedback.type = 'error'
    feedback.message = result.code === 'chronicle_entry_invalid'
      ? t('写下一点内容后再保存。', 'Write something before saving.')
      : t('这次保存没有完成，请稍后重试。', 'This save did not finish. Try again.')
    return
  }
  feedback.type = 'success'
  feedback.message = editorMode.value === 'edit'
    ? t('记录已更新。', 'Note updated.')
    : t('已经写进生活志。', 'Added to Chronicle.')
  selectedDate.value = result.entry.entryDate
  viewMode.value = 'day'
  editorOpen.value = false
  selectedItem.value = diaryItems.value.find((item) => item.id === result.entry.id) || null
}

const deleteSelectedEntry = async () => {
  const entry = selectedItem.value?.entry
  if (!entry) return
  const confirmed = await confirmDialog({
    title: t('删除这篇记录？', 'Delete this note?'),
    message: t(
      '只会删除你写下的内容，不会改变日历、行程或其他来源。',
      'Only your note will be deleted. Calendar, journeys, and other sources stay unchanged.',
    ),
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return
  const result = chronicleStore.deleteEntry(entry.id)
  if (!result.ok) return
  selectedItem.value = null
  feedback.type = 'success'
  feedback.message = t('记录已删除，来源没有变化。', 'Note deleted. Sources were not changed.')
}

const openSource = (sourceRef) => {
  const inspection = selectedItemSources.value.find(
    (candidate) => candidate.sourceRef.owner === sourceRef.owner &&
      candidate.sourceRef.recordId === sourceRef.recordId &&
      candidate.sourceRef.revision === sourceRef.revision,
  )?.inspection
  if (inspection?.ok !== true) return
  const homePage = typeof route.query.homePage === 'string' ? route.query.homePage : ''
  router.push({
    path: sourceRef.route,
    query: {
      ...sourceRef.query,
      source: 'chronicle',
      chronicleDate: selectedItem.value?.dateKey || selectedDate.value,
      ...(selectedItem.value?.kind === 'diary'
        ? { chronicleEntryId: selectedItem.value.id }
        : {}),
      ...(homePage ? { homePage } : {}),
    },
  })
}

const goBack = () => pushReturnTarget(router, route, '/home')

watch(
  () => route.query,
  (query) => {
    const date = typeof query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
      ? query.date
      : ''
    if (date) {
      selectedDate.value = date
      viewMode.value = 'day'
    }
    const entryId = typeof query.entryId === 'string' ? query.entryId.trim() : ''
    if (entryId) selectedItem.value = diaryItems.value.find((item) => item.id === entryId) || null
  },
  { immediate: true },
)
</script>

<template>
  <div class="chronicle-view" data-app="chronicle">
    <header class="chronicle-topbar">
      <button type="button" class="chronicle-icon-button" :aria-label="t('返回主页', 'Return Home')" @click="goBack">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <div class="chronicle-title-block">
        <span>{{ t('生活回顾', 'Life review') }}</span>
        <h1>{{ t('生活志', 'Chronicle') }}</h1>
      </div>
      <button
        type="button"
        class="chronicle-write-button"
        data-testid="chronicle-create-open"
        :aria-label="t('写一笔', 'Write')"
        @click="openNewEditor()"
      >
        <i class="fas fa-pen" aria-hidden="true"></i>
        <span>{{ t('写一笔', 'Write') }}</span>
      </button>
    </header>

    <main class="chronicle-main">
      <section class="chronicle-overview" aria-labelledby="chronicle-overview-title">
        <div class="chronicle-overview-copy">
          <span>{{ viewMode === 'day' ? formatDayHeading(selectedDate) : t('最近的日子', 'Recent days') }}</span>
          <h2 id="chronicle-overview-title">
            {{ viewMode === 'day' && selectedDate === todayKey ? t('今天，慢慢看', 'Today, at your pace') : t('留下来的片段', 'What remains') }}
          </h2>
          <p>{{ t('已确认的生活轨迹和你亲手写下的内容，会在这里按日期相遇。', 'Confirmed life traces and your own words meet here by date.') }}</p>
        </div>
        <div class="chronicle-overview-count" aria-live="polite">
          <strong>{{ visibleItems.length }}</strong>
          <span>{{ t('条记录', 'records') }}</span>
        </div>
      </section>

      <section class="chronicle-controls" aria-label="Chronicle controls">
        <div class="chronicle-segmented" role="tablist" :aria-label="t('查看范围', 'View range')">
          <button type="button" role="tab" :aria-selected="viewMode === 'day'" :class="{ 'is-active': viewMode === 'day' }" @click="viewMode = 'day'">
            {{ t('日期', 'Day') }}
          </button>
          <button type="button" role="tab" :aria-selected="viewMode === 'recent'" :class="{ 'is-active': viewMode === 'recent' }" @click="viewMode = 'recent'">
            {{ t('最近', 'Recent') }}
          </button>
        </div>

        <div v-if="viewMode === 'day'" class="chronicle-date-control">
          <button type="button" :aria-label="t('前一天', 'Previous day')" @click="moveDate(-1)">
            <i class="fas fa-chevron-left" aria-hidden="true"></i>
          </button>
          <label>
            <span class="sr-only">{{ t('选择日期', 'Choose date') }}</span>
            <input v-model="selectedDate" type="date" :max="todayKey" data-testid="chronicle-date-input" />
          </label>
          <button type="button" :disabled="selectedDate >= todayKey" :aria-label="t('后一天', 'Next day')" @click="moveDate(1)">
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>

        <label class="chronicle-source-filter">
          <i class="fas fa-filter" aria-hidden="true"></i>
          <span class="sr-only">{{ t('筛选来源', 'Filter source') }}</span>
          <select v-model="sourceFilter" data-testid="chronicle-source-filter">
            <option v-for="option in sourceOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
      </section>

      <p v-if="feedback.message" class="chronicle-feedback" :data-tone="feedback.type" role="status">
        {{ feedback.message }}
      </p>

      <section v-if="groupedItems.length" class="chronicle-stream" aria-live="polite">
        <section v-for="group in groupedItems" :key="group.dateKey" class="chronicle-day-group">
          <header>
            <strong>{{ formatDayHeading(group.dateKey) }}</strong>
            <span>{{ group.items.length }}</span>
          </header>
          <div class="chronicle-day-list">
            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              class="chronicle-entry-row"
              :class="{ 'is-diary': item.kind === 'diary' }"
              :data-testid="`chronicle-item-${item.id}`"
              @click="selectedItem = item"
            >
              <span class="chronicle-entry-marker">
                <i v-if="item.kind === 'diary'" :class="['fas', moodMeta(item.status).icon]" aria-hidden="true"></i>
                <i v-else :class="['fas', stageIcon(item.stage)]" aria-hidden="true"></i>
              </span>
              <span class="chronicle-entry-copy">
                <span class="chronicle-entry-meta">
                  <time>{{ formatTime(item.occurredAt) }}</time>
                  <em>{{ item.kind === 'diary' ? t('我的记录', 'My note') : ownerLabel(item.sourceOwner) }}</em>
                </span>
                <strong>{{ item.title }}</strong>
                <span>{{ item.summary }}</span>
              </span>
              <i class="fas fa-chevron-right chronicle-entry-chevron" aria-hidden="true"></i>
            </button>
          </div>
        </section>
      </section>

      <section v-else class="chronicle-empty" data-testid="chronicle-empty">
        <i class="fas fa-book-open" aria-hidden="true"></i>
        <h2>{{ t('这一天还很安静', 'This day is still quiet') }}</h2>
        <p>{{ t('你可以写下一点什么，也可以等真实发生的行程自然来到这里。', 'Write something, or let confirmed journeys arrive here in their own time.') }}</p>
        <button type="button" @click="openNewEditor()">
          <i class="fas fa-pen" aria-hidden="true"></i>
          {{ t('写下第一笔', 'Write the first note') }}
        </button>
      </section>
    </main>

    <div v-if="selectedItem" class="chronicle-overlay" @click.self="selectedItem = null">
      <article class="chronicle-sheet chronicle-detail-sheet" data-testid="chronicle-detail">
        <header class="chronicle-sheet-header">
          <div>
            <span>{{ formatDayHeading(selectedItem.dateKey) }}</span>
            <h2>{{ selectedItem.title }}</h2>
          </div>
          <button type="button" class="chronicle-icon-button" :aria-label="t('关闭详情', 'Close detail')" @click="selectedItem = null">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <div class="chronicle-detail-body">
          <p>{{ selectedItem.summary }}</p>
          <div v-if="selectedItem.kind === 'diary' && selectedItem.entry.tags.length" class="chronicle-tags">
            <span v-for="tag in selectedItem.entry.tags" :key="tag">#{{ tag }}</span>
          </div>
          <section v-if="selectedItemSources.length" class="chronicle-source-section">
            <h3>{{ t('相关来源', 'Related sources') }}</h3>
            <button
              v-for="candidate in selectedItemSources"
              :key="`${candidate.sourceRef.owner}-${candidate.sourceRef.recordId}-${candidate.sourceRef.revision}`"
              type="button"
              class="chronicle-source-row"
              :disabled="!candidate.inspection.ok"
              @click="openSource(candidate.sourceRef)"
            >
              <i :class="['fas', ownerIcon(candidate.sourceRef.owner)]" aria-hidden="true"></i>
              <span>
                <strong>{{ ownerLabel(candidate.sourceRef.owner) }}</strong>
                <small>{{ candidate.inspection.ok ? t('可以回到原记录', 'Open original record') : t('来源已变化或不可用', 'Source changed or unavailable') }}</small>
              </span>
              <i :class="['fas', candidate.inspection.ok ? 'fa-arrow-up-right-from-square' : 'fa-link-slash']" aria-hidden="true"></i>
            </button>
          </section>
        </div>
        <footer class="chronicle-sheet-actions">
          <template v-if="selectedItem.kind === 'diary'">
            <button type="button" class="is-danger" @click="deleteSelectedEntry">
              <i class="fas fa-trash" aria-hidden="true"></i>
              {{ t('删除', 'Delete') }}
            </button>
            <button type="button" class="is-primary" data-testid="chronicle-edit-open" @click="openEditEditor(selectedItem.entry)">
              <i class="fas fa-pen" aria-hidden="true"></i>
              {{ t('编辑', 'Edit') }}
            </button>
          </template>
          <button v-else type="button" class="is-primary" data-testid="chronicle-link-write" @click="openNewEditor(selectedItem.sourceRefs)">
            <i class="fas fa-pen" aria-hidden="true"></i>
            {{ t('写下这一刻', 'Write about this') }}
          </button>
        </footer>
      </article>
    </div>

    <div v-if="editorOpen" class="chronicle-overlay" @click.self="editorOpen = false">
      <form class="chronicle-sheet chronicle-editor-sheet" data-testid="chronicle-editor" @submit.prevent="saveEditor">
        <header class="chronicle-sheet-header">
          <div>
            <span>{{ editorMode === 'edit' ? t('修改记录', 'Edit note') : t('新的记录', 'New note') }}</span>
            <h2>{{ t('写下此刻', 'Write this moment') }}</h2>
          </div>
          <button type="button" class="chronicle-icon-button" :aria-label="t('关闭编辑', 'Close editor')" @click="editorOpen = false">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <div class="chronicle-editor-fields">
          <label>
            <span>{{ t('日期', 'Date') }}</span>
            <input v-model="editor.entryDate" type="date" :max="todayKey" data-testid="chronicle-editor-date" required />
          </label>
          <label>
            <span>{{ t('标题', 'Title') }} <small>{{ t('可选', 'Optional') }}</small></span>
            <input v-model="editor.title" type="text" maxlength="160" :placeholder="t('给今天一个名字', 'Name this moment')" data-testid="chronicle-editor-title" />
          </label>
          <label>
            <span>{{ t('正文', 'Note') }}</span>
            <textarea v-model="editor.body" maxlength="12000" rows="8" :placeholder="t('只写你想留下的部分。', 'Keep only what you want to remember.')" data-testid="chronicle-editor-body" required></textarea>
          </label>
          <fieldset>
            <legend>{{ t('心情', 'Mood') }}</legend>
            <div class="chronicle-mood-grid">
              <button
                v-for="option in moodOptions"
                :key="option.value"
                type="button"
                :class="{ 'is-active': editor.mood === option.value }"
                :aria-pressed="editor.mood === option.value"
                @click="editor.mood = option.value"
              >
                <i :class="['fas', option.icon]" aria-hidden="true"></i>
                <span>{{ option.label }}</span>
              </button>
            </div>
          </fieldset>
          <label>
            <span>{{ t('标签', 'Tags') }} <small>{{ t('用逗号分隔', 'Comma separated') }}</small></span>
            <input v-model="editor.tags" type="text" :placeholder="t('工作, 夜晚', 'work, evening')" data-testid="chronicle-editor-tags" />
          </label>
          <div v-if="editor.sourceRefs.length" class="chronicle-editor-source">
            <i class="fas fa-link" aria-hidden="true"></i>
            <span>{{ t('会保留与这条原记录的联系', 'This note will keep a link to the original record') }}</span>
          </div>
        </div>
        <footer class="chronicle-sheet-actions">
          <button type="button" @click="editorOpen = false">{{ t('取消', 'Cancel') }}</button>
          <button type="submit" class="is-primary" data-testid="chronicle-editor-save">
            <i class="fas fa-check" aria-hidden="true"></i>
            {{ t('保存', 'Save') }}
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<style scoped>
.chronicle-view {
  --chronicle-ink: #2e302c;
  --chronicle-muted: #666a60;
  --chronicle-line: rgba(74, 78, 67, 0.14);
  --chronicle-paper: rgba(255, 255, 252, 0.9);
  --chronicle-accent: #b45f3c;
  --chronicle-accent-text: #8c4025;
  --chronicle-accent-soft: rgba(180, 95, 60, 0.12);
  min-height: 100%;
  color: var(--chronicle-ink);
  background:
    linear-gradient(rgba(255, 255, 255, 0.68), rgba(244, 246, 239, 0.9)),
    repeating-linear-gradient(0deg, transparent 0 31px, rgba(93, 100, 84, 0.035) 31px 32px);
  overflow: auto;
}

.chronicle-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 74px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--chronicle-line);
  background: rgba(248, 249, 244, 0.9);
  backdrop-filter: blur(18px);
}

.chronicle-title-block { min-width: 0; }
.chronicle-title-block span,
.chronicle-sheet-header span,
.chronicle-overview-copy > span {
  display: block;
  color: var(--chronicle-muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.chronicle-title-block h1,
.chronicle-sheet-header h2,
.chronicle-overview h2 { margin: 2px 0 0; letter-spacing: 0; }
.chronicle-title-block h1 { font-size: 22px; }

.chronicle-icon-button,
.chronicle-date-control button {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--chronicle-line);
  border-radius: 8px;
  color: inherit;
  background: rgba(255, 255, 255, 0.68);
}

.chronicle-write-button,
.chronicle-empty button,
.chronicle-sheet-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--chronicle-line);
  border-radius: 8px;
  color: inherit;
  background: rgba(255, 255, 255, 0.76);
  font-weight: 700;
}
.chronicle-write-button { color: #fff; border-color: transparent; background: var(--chronicle-accent); }

.chronicle-main { width: min(920px, 100%); margin: 0 auto; padding: 22px 18px 72px; }
.chronicle-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: end;
  padding: 12px 0 24px;
  border-bottom: 1px solid var(--chronicle-line);
}
.chronicle-overview h2 { font-size: 30px; line-height: 1.16; }
.chronicle-overview p { max-width: 620px; margin: 8px 0 0; color: var(--chronicle-muted); line-height: 1.65; }
.chronicle-overview-count { min-width: 80px; text-align: right; }
.chronicle-overview-count strong { display: block; font-size: 34px; line-height: 1; }
.chronicle-overview-count span { color: var(--chronicle-muted); font-size: 12px; }

.chronicle-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 16px 0;
}
.chronicle-segmented { display: inline-grid; grid-template-columns: 1fr 1fr; padding: 3px; border-radius: 8px; background: rgba(70, 76, 64, 0.08); }
.chronicle-segmented button { min-width: 70px; height: 34px; border: 0; border-radius: 6px; color: var(--chronicle-muted); background: transparent; font-weight: 700; }
.chronicle-segmented button.is-active { color: var(--chronicle-ink); background: #fff; box-shadow: 0 1px 4px rgba(40, 42, 37, 0.1); }
.chronicle-date-control { display: inline-flex; align-items: center; gap: 6px; }
.chronicle-date-control button { width: 36px; height: 36px; }
.chronicle-date-control input,
.chronicle-source-filter select,
.chronicle-editor-fields input,
.chronicle-editor-fields textarea {
  width: 100%;
  border: 1px solid var(--chronicle-line);
  border-radius: 8px;
  color: inherit;
  background: rgba(255, 255, 255, 0.82);
  font: inherit;
}
.chronicle-date-control input { min-height: 36px; padding: 0 10px; }
.chronicle-source-filter { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; }
.chronicle-source-filter select { min-height: 36px; padding: 0 30px 0 10px; }

.chronicle-feedback { margin: 0 0 14px; padding: 10px 12px; border-left: 3px solid var(--chronicle-accent); background: var(--chronicle-accent-soft); }
.chronicle-feedback[data-tone="error"] { border-color: #a53b3b; background: rgba(165, 59, 59, 0.09); }
.chronicle-stream { display: grid; gap: 24px; }
.chronicle-day-group > header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.chronicle-day-group > header strong { font-size: 14px; }
.chronicle-day-group > header span { display: inline-grid; place-items: center; min-width: 24px; height: 20px; border-radius: 10px; color: var(--chronicle-muted); background: rgba(70, 76, 64, 0.08); font-size: 11px; }
.chronicle-day-list { border-top: 1px solid var(--chronicle-line); }
.chronicle-entry-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 18px;
  gap: 12px;
  align-items: start;
  width: 100%;
  min-height: 92px;
  padding: 16px 4px;
  border: 0;
  border-bottom: 1px solid var(--chronicle-line);
  color: inherit;
  text-align: left;
  background: transparent;
}
.chronicle-entry-row:hover,
.chronicle-entry-row:focus-visible { background: rgba(255, 255, 255, 0.6); }
.chronicle-entry-marker { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; color: #fff; background: #68766c; }
.chronicle-entry-row.is-diary .chronicle-entry-marker { color: var(--chronicle-accent); background: var(--chronicle-accent-soft); }
.chronicle-entry-copy { min-width: 0; }
.chronicle-entry-meta { display: flex; gap: 8px; align-items: center; color: var(--chronicle-muted); font-size: 11px; }
.chronicle-entry-meta em { padding: 2px 6px; border-radius: 4px; background: rgba(70, 76, 64, 0.07); font-style: normal; }
.chronicle-entry-copy > strong { display: block; margin-top: 5px; font-size: 15px; }
.chronicle-entry-copy > span:last-child { display: -webkit-box; margin-top: 4px; overflow: hidden; color: var(--chronicle-muted); line-height: 1.5; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.chronicle-entry-chevron { align-self: center; color: rgba(70, 76, 64, 0.35); }

.chronicle-empty { display: grid; justify-items: center; padding: 70px 20px; text-align: center; }
.chronicle-empty > i { font-size: 34px; color: var(--chronicle-accent); }
.chronicle-empty h2 { margin: 14px 0 6px; font-size: 22px; }
.chronicle-empty p { max-width: 430px; margin: 0 0 18px; color: var(--chronicle-muted); line-height: 1.6; }

.chronicle-overlay { position: fixed; inset: 0; z-index: 80; display: flex; align-items: flex-end; justify-content: center; padding: 16px; background: rgba(26, 28, 24, 0.38); backdrop-filter: blur(8px); }
.chronicle-sheet { display: flex; flex-direction: column; width: min(620px, 100%); max-height: min(84vh, 760px); overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.5); border-radius: 8px; background: #f8f9f4; box-shadow: 0 24px 70px rgba(30, 32, 28, 0.25); }
.chronicle-sheet-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 18px; border-bottom: 1px solid var(--chronicle-line); }
.chronicle-sheet-header > div { min-width: 0; }
.chronicle-sheet-header h2 { overflow-wrap: anywhere; font-size: 22px; }
.chronicle-detail-body,
.chronicle-editor-fields { overflow: auto; padding: 18px; }
.chronicle-detail-body > p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; }
.chronicle-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.chronicle-tags span { padding: 5px 8px; border-radius: 6px; color: var(--chronicle-accent-text); background: var(--chronicle-accent-soft); font-size: 12px; }
.chronicle-source-section { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--chronicle-line); }
.chronicle-source-section h3 { margin: 0 0 8px; font-size: 13px; }
.chronicle-source-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) 18px; gap: 10px; align-items: center; width: 100%; padding: 10px 0; border: 0; border-bottom: 1px solid var(--chronicle-line); color: inherit; text-align: left; background: transparent; }
.chronicle-source-row > i:first-child { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; color: #506156; background: rgba(80, 97, 86, 0.1); }
.chronicle-source-row span { min-width: 0; }
.chronicle-source-row strong,
.chronicle-source-row small { display: block; }
.chronicle-source-row small { margin-top: 2px; color: var(--chronicle-muted); }
.chronicle-source-row:disabled { opacity: 0.55; }
.chronicle-sheet-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--chronicle-line); }
.chronicle-sheet-actions .is-primary { color: #fff; border-color: transparent; background: var(--chronicle-accent); }
.chronicle-sheet-actions .is-danger { margin-right: auto; color: #9a3333; }

.chronicle-editor-fields { display: grid; gap: 16px; }
.chronicle-editor-fields label > span,
.chronicle-editor-fields legend { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 800; }
.chronicle-editor-fields small { color: var(--chronicle-muted); font-weight: 500; }
.chronicle-editor-fields input { min-height: 42px; padding: 0 12px; }
.chronicle-editor-fields textarea { min-height: 180px; padding: 12px; resize: vertical; line-height: 1.65; }
.chronicle-editor-fields fieldset { margin: 0; padding: 0; border: 0; }
.chronicle-mood-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }
.chronicle-mood-grid button { display: grid; justify-items: center; gap: 5px; min-width: 0; min-height: 58px; padding: 8px 4px; border: 1px solid var(--chronicle-line); border-radius: 8px; color: var(--chronicle-muted); background: rgba(255, 255, 255, 0.68); }
.chronicle-mood-grid button span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; }
.chronicle-mood-grid button.is-active { color: var(--chronicle-accent); border-color: rgba(180, 95, 60, 0.45); background: var(--chronicle-accent-soft); }
.chronicle-editor-source { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-left: 3px solid #68766c; background: rgba(104, 118, 108, 0.08); color: var(--chronicle-muted); font-size: 12px; }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

@media (min-width: 760px) {
  .chronicle-overlay { align-items: center; }
}

@media (max-width: 560px) {
  .chronicle-topbar { padding-inline: 12px; }
  .chronicle-write-button { width: 42px; padding: 0; }
  .chronicle-write-button span { display: none; }
  .chronicle-main { padding-inline: 14px; }
  .chronicle-overview { gap: 12px; }
  .chronicle-overview h2 { font-size: 25px; }
  .chronicle-overview-count strong { font-size: 28px; }
  .chronicle-controls { align-items: stretch; }
  .chronicle-source-filter { width: 100%; margin-left: 0; }
  .chronicle-source-filter select { flex: 1; }
  .chronicle-entry-row { grid-template-columns: 34px minmax(0, 1fr) 14px; gap: 9px; }
  .chronicle-overlay { padding: 0; }
  .chronicle-sheet { max-height: 92vh; border-right: 0; border-bottom: 0; border-left: 0; border-radius: 8px 8px 0 0; }
  .chronicle-mood-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

:global([data-system-color-mode='zen']) .chronicle-view {
  --chronicle-ink: #eef1e9;
  --chronicle-muted: #aeb4a9;
  --chronicle-line: rgba(231, 238, 225, 0.12);
  --chronicle-paper: rgba(36, 40, 35, 0.92);
  --chronicle-accent: #e28a64;
  --chronicle-accent-text: #f0a383;
  --chronicle-accent-soft: rgba(226, 138, 100, 0.14);
  background: linear-gradient(rgba(29, 33, 29, 0.94), rgba(23, 26, 23, 0.98));
}
:global([data-system-color-mode='zen']) .chronicle-topbar,
:global([data-system-color-mode='zen']) .chronicle-sheet { background: rgba(31, 35, 31, 0.96); }
:global([data-system-color-mode='zen']) .chronicle-icon-button,
:global([data-system-color-mode='zen']) .chronicle-entry-row:hover,
:global([data-system-color-mode='zen']) .chronicle-date-control input,
:global([data-system-color-mode='zen']) .chronicle-source-filter select,
:global([data-system-color-mode='zen']) .chronicle-editor-fields input,
:global([data-system-color-mode='zen']) .chronicle-editor-fields textarea,
:global([data-system-color-mode='zen']) .chronicle-mood-grid button { background: rgba(255, 255, 255, 0.05); }
</style>
