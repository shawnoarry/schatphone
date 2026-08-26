<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useGalleryStore } from '../stores/gallery'
import { useI18n } from '../composables/useI18n'
import { useAppIconImagePreviews } from '../composables/useAppIconImagePreviews'
import { useSystemNotifications } from '../composables/useSystemNotifications'
import { resolveNotificationModuleMeta as resolveNotificationModuleMetaBase } from '../lib/notification-presentation'
import AppIconVisual from './shared/AppIconVisual.vue'

const emit = defineEmits(['open-change'])

defineProps({
  currentTime: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const galleryStore = useGalleryStore()
const { settings } = storeToRefs(systemStore)
const { systemLanguage, languageBase, t } = useI18n()
const systemNotifications = useSystemNotifications({ systemStore })

const shadeOpen = ref(false)
const activeFilter = ref('all')
const shadePanel = ref(null)
const previousFocus = ref(null)
const dragStartY = ref(null)
const dragPointerId = ref(null)
const dragOpened = ref(false)

const notificationLocale = computed(() =>
  languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value,
)
const timeLocale = computed(() =>
  languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value,
)
const appIconOverrides = computed(() => settings.value.appearance?.appIconOverrides || {})
const systemAppIconTheme = computed(() => settings.value.appearance?.systemAppIconTheme)
const preferSystemAppIconTheme = computed(
  () => settings.value.appearance?.preferSystemAppIconTheme === true,
)
const { appIconImageUrl } = useAppIconImagePreviews({
  galleryStore,
  appIconOverrides,
  locale: notificationLocale,
  systemAppIconTheme,
  preferSystemAppIconTheme,
  scopeId: 'system-notification-shade-app-icons',
})

const resolveNotificationModuleMeta = (note) =>
  resolveNotificationModuleMetaBase(
    note,
    notificationLocale.value,
    settings.value.appearance?.appIconOverrides || {},
    settings.value.appearance?.systemAppIconTheme,
    settings.value.appearance?.preferSystemAppIconTheme === true,
  )

const sortedNotifications = computed(() =>
  [...systemNotifications.notificationItems.value].sort(
    (a, b) => (b?.createdAt || 0) - (a?.createdAt || 0),
  ),
)
const visibleNotifications = computed(() =>
  activeFilter.value === 'unread'
    ? sortedNotifications.value.filter((note) => note?.read !== true)
    : sortedNotifications.value,
)
const notificationGroups = computed(() => {
  const groups = new Map()

  visibleNotifications.value.forEach((note) => {
    const meta = resolveNotificationModuleMeta(note)
    const existing = groups.get(meta.key)
    if (existing) {
      existing.notes.push(note)
      existing.unreadCount += note?.read ? 0 : 1
      return
    }

    groups.set(meta.key, {
      key: meta.key,
      meta,
      notes: [note],
      unreadCount: note?.read ? 0 : 1,
    })
  })

  return [...groups.values()]
})
const hasNotifications = computed(() => sortedNotifications.value.length > 0)
const hasVisibleNotifications = computed(() => visibleNotifications.value.length > 0)
const unreadCount = computed(() => systemNotifications.unreadNotificationCount.value)

const focusPanel = async () => {
  await nextTick()
  shadePanel.value?.focus?.()
}

const setShadeOpen = (open) => {
  const next = open === true
  if (shadeOpen.value === next) return

  if (next) {
    previousFocus.value = typeof document !== 'undefined' ? document.activeElement : null
    shadeOpen.value = true
    emit('open-change', true)
    void focusPanel()
    return
  }

  shadeOpen.value = false
  emit('open-change', false)
  const focusTarget = previousFocus.value
  previousFocus.value = null
  if (focusTarget && typeof focusTarget.focus === 'function') {
    void nextTick(() => focusTarget.focus())
  }
}

const openShade = () => setShadeOpen(true)
const closeShade = () => setShadeOpen(false)

const startStatusBarGesture = (event) => {
  if (shadeOpen.value || event?.button > 0) return
  dragStartY.value = Number(event?.clientY) || 0
  dragPointerId.value = event?.pointerId ?? null
  dragOpened.value = false
  event?.currentTarget?.setPointerCapture?.(event.pointerId)
}

const moveStatusBarGesture = (event) => {
  if (dragStartY.value === null) return
  const deltaY = (Number(event?.clientY) || 0) - dragStartY.value
  if (deltaY < 32 || dragOpened.value) return
  dragOpened.value = true
  openShade()
}

const finishStatusBarGesture = (event) => {
  if (dragPointerId.value !== null) {
    event?.currentTarget?.releasePointerCapture?.(dragPointerId.value)
  }
  dragStartY.value = null
  dragPointerId.value = null
  dragOpened.value = false
}

const formatNotificationTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(timeLocale.value, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const persistNotifications = () => systemStore.saveNow()

const openNotification = async (note) => {
  if (!note?.id) return
  systemNotifications.markNotificationRead(note.id)
  persistNotifications()

  const target = typeof note.route === 'string' ? note.route.trim() : ''
  if (!target) return
  closeShade()
  await router.push(target)
}

const dismissNotification = (note) => {
  if (!note?.id) return
  systemNotifications.removeNotification(note.id, { save: true })
}

const clearNotifications = () => {
  systemNotifications.clearNotifications({ save: true })
}

const markAllRead = () => {
  systemNotifications.markAllNotificationsRead()
  persistNotifications()
}

const openNotificationSettings = async () => {
  closeShade()
  await router.push('/settings?menu=notification')
}

const focusableElements = () => {
  if (!shadePanel.value) return []
  return [...shadePanel.value.querySelectorAll(
    'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.getAttribute('aria-hidden') !== 'true')
}

const handleShadeKeydown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeShade()
    return
  }
  if (event.key !== 'Tab') return

  const focusable = focusableElements()
  if (focusable.length === 0) {
    event.preventDefault()
    shadePanel.value?.focus?.()
    return
  }

  const currentIndex = focusable.indexOf(document.activeElement)
  if (event.shiftKey && currentIndex <= 0) {
    event.preventDefault()
    focusable.at(-1)?.focus()
  } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
    event.preventDefault()
    focusable[0]?.focus()
  }
}

watch(
  () => route.fullPath,
  () => {
    if (shadeOpen.value) closeShade()
  },
)

onBeforeUnmount(() => {
  if (shadeOpen.value) emit('open-change', false)
})
</script>

<template>
  <button
    v-if="!shadeOpen"
    type="button"
    class="notification-shade-trigger"
    data-testid="notification-shade-trigger"
    :aria-label="t('打开通知中心', 'Open Notification Center')"
    @click="openShade"
    @pointerdown="startStatusBarGesture"
    @pointermove="moveStatusBarGesture"
    @pointerup="finishStatusBarGesture"
    @pointercancel="finishStatusBarGesture"
  ></button>

  <Transition name="notification-shade">
    <section
      v-if="shadeOpen"
      ref="shadePanel"
      class="notification-shade"
      data-testid="notification-shade"
      role="dialog"
      aria-modal="true"
      :aria-label="t('通知中心', 'Notification Center')"
      tabindex="-1"
      @keydown="handleShadeKeydown"
    >
      <div class="notification-shade-scrim" aria-hidden="true" @click="closeShade"></div>
      <div class="notification-shade-sheet">
        <div class="notification-shade-grabber" aria-hidden="true"></div>
        <div class="notification-shade-status" aria-hidden="true">
          <span>{{ currentTime }}</span>
          <span class="notification-shade-status-icons">
            <i class="fas fa-signal"></i>
            <i class="fas fa-wifi"></i>
            <i class="fas fa-battery-full"></i>
          </span>
        </div>

        <header class="notification-shade-header">
          <div class="notification-shade-title-row">
            <div>
              <h1>{{ t('通知中心', 'Notification Center') }}</h1>
              <p>{{ unreadCount }} {{ t('条未读', 'unread') }}</p>
            </div>
            <div class="notification-shade-header-actions">
              <button
                v-if="hasNotifications"
                type="button"
                class="notification-shade-text-action"
                data-testid="notification-shade-clear-all"
                @click="clearNotifications"
              >
                {{ t('全部清除', 'Clear all') }}
              </button>
              <button
                type="button"
                class="notification-shade-close"
                data-testid="notification-shade-close"
                :aria-label="t('关闭通知中心', 'Close Notification Center')"
                @click="closeShade"
              >
                <i class="fas fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <div class="notification-shade-filters" role="tablist" :aria-label="t('通知筛选', 'Notification filters')">
            <button
              type="button"
              role="tab"
              data-testid="notification-shade-filter-all"
              :aria-selected="activeFilter === 'all'"
              :class="{ 'is-active': activeFilter === 'all' }"
              @click="activeFilter = 'all'"
            >
              {{ t('全部', 'All') }}
            </button>
            <button
              type="button"
              role="tab"
              data-testid="notification-shade-filter-unread"
              :aria-selected="activeFilter === 'unread'"
              :class="{ 'is-active': activeFilter === 'unread' }"
              @click="activeFilter = 'unread'"
            >
              {{ t(`未读 ${unreadCount}`, `Unread ${unreadCount}`) }}
            </button>
          </div>
        </header>

        <div class="notification-shade-content">
          <div v-if="!systemNotifications.notificationEnabled.value" class="notification-shade-state">
            <span class="notification-shade-state-icon" aria-hidden="true">
              <i class="fas fa-bell-slash"></i>
            </span>
            <h2>{{ t('通知已关闭', 'Notifications are off') }}</h2>
            <p>{{ t('你仍可在设置中重新开启系统通知。', 'You can turn system notifications back on in Settings.') }}</p>
            <button type="button" data-testid="notification-shade-open-settings" @click="openNotificationSettings">
              {{ t('前往设置', 'Open Settings') }}
            </button>
          </div>

          <div v-else-if="hasVisibleNotifications" class="notification-shade-groups">
            <section
              v-for="group in notificationGroups"
              :key="group.key"
              class="notification-shade-group"
              :data-testid="`notification-shade-group-${group.key}`"
            >
              <div class="notification-shade-group-header">
                <AppIconVisual
                  class="notification-shade-app-icon"
                  :meta="group.meta"
                  :image-url="appIconImageUrl(group.meta.appId)"
                  :alt="group.meta.label"
                />
                <div class="notification-shade-group-copy">
                  <h2>{{ group.meta.label }}</h2>
                  <p>
                    {{ group.notes.length }} {{ t('条', 'items') }}
                    <span v-if="group.unreadCount > 0">· {{ group.unreadCount }} {{ t('未读', 'unread') }}</span>
                  </p>
                </div>
              </div>

              <TransitionGroup name="notification-row" tag="div" class="notification-shade-list">
                <div
                  v-for="note in group.notes"
                  :key="note.id"
                  class="notification-shade-row"
                  :class="{ 'is-read': note.read }"
                  :data-testid="`notification-shade-note-${note.id}`"
                >
                  <button
                    type="button"
                    class="notification-shade-note-main"
                    :class="{ 'has-route': Boolean(note.route) }"
                    :aria-label="note.route ? t(`打开：${note.title}`, `Open: ${note.title}`) : t(`标为已读：${note.title}`, `Mark read: ${note.title}`)"
                    @click="openNotification(note)"
                  >
                    <span class="notification-shade-note-copy">
                      <span class="notification-shade-note-meta">
                        <span v-if="!note.read" class="notification-shade-unread-dot" aria-hidden="true"></span>
                        <span class="notification-shade-note-time">{{ formatNotificationTime(note.createdAt) }}</span>
                      </span>
                      <strong>{{ note.title }}</strong>
                      <span>{{ note.content }}</span>
                    </span>
                    <i v-if="note.route" class="fas fa-chevron-right" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    class="notification-shade-dismiss"
                    :data-testid="`notification-shade-dismiss-${note.id}`"
                    :aria-label="t(`清除：${note.title}`, `Dismiss: ${note.title}`)"
                    @click="dismissNotification(note)"
                  >
                    <i class="fas fa-xmark" aria-hidden="true"></i>
                  </button>
                </div>
              </TransitionGroup>
            </section>
          </div>

          <div v-else class="notification-shade-state">
            <span class="notification-shade-state-icon" aria-hidden="true">
              <i :class="activeFilter === 'unread' ? 'fas fa-check' : 'fas fa-bell'"></i>
            </span>
            <h2>
              {{ activeFilter === 'unread' ? t('没有未读通知', 'No unread notifications') : t('暂无通知', 'No notifications') }}
            </h2>
            <p>
              {{ activeFilter === 'unread' ? t('所有消息都已经读过了。', 'Everything has been read.') : t('新的系统和应用消息会显示在这里。', 'New system and app updates will appear here.') }}
            </p>
          </div>
        </div>

        <footer v-if="systemNotifications.notificationEnabled.value && hasNotifications" class="notification-shade-footer">
          <button
            type="button"
            data-testid="notification-shade-mark-all-read"
            :disabled="unreadCount === 0"
            @click="markAllRead"
          >
            <i class="fas fa-check-double" aria-hidden="true"></i>
            {{ t('全部标为已读', 'Mark all as read') }}
          </button>
        </footer>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.notification-shade-trigger {
  position: absolute;
  top: 0;
  left: 0;
  right: 44px;
  z-index: 41;
  height: calc(32px + env(safe-area-inset-top));
  border: 0;
  padding: 0;
  background: transparent;
  touch-action: pan-x;
  cursor: ns-resize;
}

.notification-shade-trigger:focus-visible {
  outline: 2px solid var(--system-focus-ring);
  outline-offset: -3px;
  border-radius: 10px;
}

.notification-shade {
  position: absolute;
  inset: 0;
  z-index: 80;
  overflow: hidden;
  color: var(--system-text);
  outline: none;
}

.notification-shade-scrim {
  position: absolute;
  inset: 0;
  background: rgba(18, 26, 38, 0.18);
  backdrop-filter: blur(10px) saturate(1.08);
  -webkit-backdrop-filter: blur(10px) saturate(1.08);
}

.notification-shade-sheet {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: calc(10px + env(safe-area-inset-top)) 14px calc(20px + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--system-page-bg) 82%, transparent);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.18);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.18);
}

.notification-shade-grabber {
  width: 36px;
  height: 4px;
  margin: 0 auto 10px;
  border-radius: 999px;
  background: var(--system-text-soft);
}

.notification-shade-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
  margin-bottom: 14px;
  padding: 0 6px;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.notification-shade-status-icons {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.notification-shade-header {
  flex: 0 0 auto;
}

.notification-shade-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.notification-shade-title-row h1 {
  margin: 0;
  font-size: clamp(24px, 7vw, 30px);
  font-weight: 760;
  line-height: 1.08;
  letter-spacing: -0.035em;
}

.notification-shade-title-row p {
  margin: 5px 0 0;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.3;
}

.notification-shade-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  min-width: 0;
}

.notification-shade-text-action,
.notification-shade-close {
  min-height: 44px;
  border: 0;
  color: var(--system-accent-strong);
  background: transparent;
}

.notification-shade-text-action {
  padding: 0 9px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.notification-shade-close {
  width: 44px;
  border-radius: 50%;
}

.notification-shade-close:hover,
.notification-shade-close:active,
.notification-shade-text-action:hover,
.notification-shade-text-action:active {
  background: var(--system-hover-bg);
}

.notification-shade-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  margin-top: 18px;
  padding: 4px;
  border: 1px solid var(--system-border-light);
  border-radius: 999px;
  background: var(--system-surface);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.notification-shade-filters button {
  min-width: 0;
  min-height: 44px;
  border: 0;
  border-radius: 999px;
  color: var(--system-text-muted);
  background: transparent;
  font-size: 14px;
  font-weight: 700;
}

.notification-shade-filters button.is-active {
  color: var(--system-text);
  background: var(--system-control-bg-strong);
  box-shadow: var(--system-shadow-control);
}

.notification-shade-content {
  min-height: 0;
  flex: 1 1 auto;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 18px -4px 0;
  padding: 0 4px 18px;
  scrollbar-width: thin;
}

.notification-shade-groups {
  display: grid;
  gap: 12px;
}

.notification-shade-group {
  overflow: hidden;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background: var(--system-surface-strong);
  box-shadow: var(--system-shadow-card);
}

.notification-shade-group-header {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  padding: 12px 13px 10px;
}

.notification-shade-app-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 14px;
  color: var(--system-on-accent);
  box-shadow: var(--system-shadow-control);
}

.notification-shade-app-icon.accent-default {
  background: var(--home-icon-default-bg);
  color: var(--home-icon-default-fg);
}

.notification-shade-app-icon.accent-cool {
  background: var(--home-icon-cool-bg);
  color: var(--home-icon-cool-fg);
}

.notification-shade-app-icon.accent-warm {
  background: var(--home-icon-warm-bg);
  color: var(--home-icon-warm-fg);
}

.notification-shade-app-icon.accent-light {
  background: var(--home-icon-light-bg);
  color: var(--home-icon-light-fg);
}

.notification-shade-app-icon.accent-dark {
  background: var(--home-icon-dark-bg);
  color: var(--home-icon-dark-fg);
}

.notification-shade-group-copy {
  min-width: 0;
  flex: 1;
}

.notification-shade-group-copy h2 {
  margin: 0;
  overflow: hidden;
  color: var(--system-text);
  font-size: 15px;
  font-weight: 760;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-shade-group-copy p {
  margin: 3px 0 0;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.25;
}

.notification-shade-list {
  border-top: 1px solid var(--system-subtle-border);
}

.notification-shade-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  min-width: 0;
  border-bottom: 1px solid var(--system-subtle-border);
}

.notification-shade-row:last-child {
  border-bottom: 0;
}

.notification-shade-row.is-read {
  opacity: 0.68;
}

.notification-shade-note-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 76px;
  border: 0;
  padding: 10px 8px 10px 14px;
  color: inherit;
  text-align: left;
  background: transparent;
}

.notification-shade-note-main:hover,
.notification-shade-note-main:active,
.notification-shade-dismiss:hover,
.notification-shade-dismiss:active {
  background: var(--system-hover-bg);
}

.notification-shade-note-main > .fa-chevron-right {
  flex: 0 0 auto;
  color: var(--system-text-soft);
  font-size: 11px;
}

.notification-shade-note-copy {
  display: block;
  min-width: 0;
  flex: 1;
}

.notification-shade-note-copy strong,
.notification-shade-note-copy > span:last-child {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
}

.notification-shade-note-copy strong {
  margin-top: 3px;
  color: var(--system-text);
  font-size: 13px;
  font-weight: 730;
  line-height: 1.35;
  -webkit-line-clamp: 2;
  overflow-wrap: anywhere;
}

.notification-shade-note-copy > span:last-child {
  margin-top: 3px;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.42;
  -webkit-line-clamp: 2;
  overflow-wrap: anywhere;
}

.notification-shade-note-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 12px;
}

.notification-shade-unread-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: var(--system-accent);
  box-shadow: 0 0 0 3px var(--system-accent-soft);
}

.notification-shade-note-time {
  color: var(--system-text-soft);
  font-size: 10px;
  line-height: 1;
}

.notification-shade-dismiss {
  width: 44px;
  min-height: 44px;
  align-self: stretch;
  border: 0;
  border-left: 1px solid var(--system-subtle-border);
  color: var(--system-text-soft);
  background: transparent;
}

.notification-shade-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  padding: 32px 24px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  color: var(--system-text);
  text-align: center;
  background: var(--system-surface-strong);
  box-shadow: var(--system-shadow-card);
}

.notification-shade-state-icon {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 18px;
  color: var(--system-accent-strong);
  background: var(--system-accent-soft);
  font-size: 20px;
}

.notification-shade-state h2 {
  margin: 16px 0 0;
  font-size: 17px;
  line-height: 1.3;
}

.notification-shade-state p {
  max-width: 280px;
  margin: 7px 0 0;
  color: var(--system-text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.notification-shade-state button {
  min-width: 132px;
  min-height: 44px;
  margin-top: 18px;
  border: 0;
  border-radius: 999px;
  color: var(--system-on-accent);
  background: var(--system-accent-strong);
  font-size: 13px;
  font-weight: 700;
}

.notification-shade-footer {
  flex: 0 0 auto;
  padding-top: 10px;
}

.notification-shade-footer button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--system-border-light);
  border-radius: 999px;
  color: var(--system-accent-strong);
  background: var(--system-control-bg);
  font-size: 13px;
  font-weight: 700;
}

.notification-shade-footer button:disabled {
  cursor: default;
  opacity: 0.46;
}

.notification-shade-enter-active,
.notification-shade-leave-active {
  transition: opacity var(--system-motion-base);
}

.notification-shade-enter-active .notification-shade-sheet,
.notification-shade-leave-active .notification-shade-sheet {
  transition: transform var(--system-motion-base), opacity var(--system-motion-base);
}

.notification-shade-enter-from,
.notification-shade-leave-to {
  opacity: 0;
}

.notification-shade-enter-from .notification-shade-sheet,
.notification-shade-leave-to .notification-shade-sheet {
  opacity: 0.84;
  transform: translateY(-28px);
}

.notification-row-enter-active,
.notification-row-leave-active {
  transition: opacity var(--system-motion-fast), transform var(--system-motion-fast);
}

.notification-row-enter-from,
.notification-row-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

button:focus-visible {
  outline: 2px solid var(--system-focus-ring);
  outline-offset: -2px;
}

@media (min-width: 720px) {
  .notification-shade-sheet {
    padding-right: 22px;
    padding-left: 22px;
  }

  .notification-shade-content {
    margin-right: auto;
    margin-left: auto;
    width: min(100%, 620px);
  }

  .notification-shade-header,
  .notification-shade-footer {
    width: min(100%, 620px);
    margin-right: auto;
    margin-left: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .notification-shade-enter-active,
  .notification-shade-leave-active,
  .notification-shade-enter-active .notification-shade-sheet,
  .notification-shade-leave-active .notification-shade-sheet,
  .notification-row-enter-active,
  .notification-row-leave-active {
    transition-duration: 1ms;
  }
}
</style>
