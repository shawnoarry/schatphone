<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useGalleryStore } from '../stores/gallery'
import { useI18n } from '../composables/useI18n'
import { useAppIconImagePreviews } from '../composables/useAppIconImagePreviews'
import AppIconVisual from '../components/shared/AppIconVisual.vue'
import { resolveNotificationModuleMeta as resolveNotificationModuleMetaBase } from '../lib/notification-presentation'

defineProps({
  currentTime: {
    type: String,
    default: '',
  },
  currentDate: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const systemStore = useSystemStore()
const galleryStore = useGalleryStore()
const { systemLanguage, languageBase, t } = useI18n()
const { notifications, settings } = storeToRefs(systemStore)
const LOCK_BANNER_HIDE_MS = 2600
const timeLocale = computed(() => (languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value))
const notificationLocale = computed(() =>
  languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value,
)
const appIconOverrides = computed(() => settings.value.appearance?.appIconOverrides || {})
const { appIconImageUrl } = useAppIconImagePreviews({
  galleryStore,
  appIconOverrides,
  locale: notificationLocale,
  scopeId: 'lock-screen-app-icons',
})

const lockClockStyle = computed(() => settings.value.appearance.lockClockStyle || 'classic')
const focusModeEnabled = computed(() => systemStore.isMoreFeatureToggleEnabled('focus_mode'))
const lockNotifications = computed(() => {
  return [...notifications.value]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 8)
})
const unreadCount = computed(() =>
  lockNotifications.value.reduce((count, note) => count + (note.read ? 0 : 1), 0),
)
const lockNotificationGroups = computed(() => {
  const groups = new Map()

  lockNotifications.value.forEach((note) => {
    const meta = resolveNotificationModuleMeta(note)
    const existing = groups.get(meta.key)
    if (existing) {
      existing.notes.push(note)
      existing.latestAt = Math.max(existing.latestAt, note.createdAt || 0)
      existing.unreadCount += note.read ? 0 : 1
      return
    }

    groups.set(meta.key, {
      key: meta.key,
      meta,
      notes: [note],
      latestAt: note.createdAt || 0,
      unreadCount: note.read ? 0 : 1,
    })
  })

  return [...groups.values()].sort((a, b) => b.latestAt - a.latestAt)
})
const visibleLockNotificationGroups = computed(() =>
  focusModeEnabled.value
    ? lockNotificationGroups.value.map((group) => ({
        ...group,
        notes: group.notes.slice(0, 1),
        hiddenCount: Math.max(0, group.notes.length - 1),
      }))
    : lockNotificationGroups.value.map((group) => ({
        ...group,
        hiddenCount: 0,
      })),
)
const lockBannerVisible = ref(false)
const lockBannerNote = ref(null)

let lockBannerTimerId = null
let seenNotificationIds = new Set()

const formatNotificationTime = (timestamp) => {
  if (!timestamp) return ''
  const time = new Date(timestamp)
  if (Number.isNaN(time.getTime())) return ''
  return time.toLocaleTimeString(timeLocale.value, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const resolveNotificationModuleMeta = (note) =>
  resolveNotificationModuleMetaBase(
    note,
    notificationLocale.value,
    settings.value.appearance?.appIconOverrides || {},
  )
const notificationIconImageUrl = (note) => appIconImageUrl(resolveNotificationModuleMeta(note).appId)

const unlockPhone = () => {
  lockBannerVisible.value = false
  systemStore.unlockPhone()
  router.push('/home')
}

const openNotification = (note) => {
  if (!note) return
  lockBannerVisible.value = false
  systemStore.markNotificationRead(note.id)
  systemStore.unlockPhone()

  if (typeof note.route === 'string' && note.route.trim()) {
    router.push(note.route)
    return
  }
  router.push('/home')
}

const clearBannerTimer = () => {
  if (!lockBannerTimerId) return
  clearTimeout(lockBannerTimerId)
  lockBannerTimerId = null
}

const showLockBanner = (note) => {
  if (!note) return
  lockBannerNote.value = note
  lockBannerVisible.value = true
  clearBannerTimer()
  lockBannerTimerId = setTimeout(() => {
    lockBannerVisible.value = false
  }, LOCK_BANNER_HIDE_MS)
}

const openBannerNotification = () => {
  if (!lockBannerNote.value) return
  openNotification(lockBannerNote.value)
}

watch(
  lockNotifications,
  (list, prevList) => {
    if (!Array.isArray(list) || list.length === 0) return

    // Initialize the seen set on first render to avoid replaying historical notifications.
    if (seenNotificationIds.size === 0 && (!Array.isArray(prevList) || prevList.length === 0)) {
      seenNotificationIds = new Set(list.map((item) => item.id))
      return
    }

    const newest = list[0]
    if (newest && !seenNotificationIds.has(newest.id) && !newest.read) {
      showLockBanner(newest)
    }

    list.forEach((item) => {
      if (item?.id) seenNotificationIds.add(item.id)
    })
  },
  { immediate: true, deep: true },
)

onBeforeUnmount(() => {
  clearBannerTimer()
})
</script>

<template>
  <div class="lock-shell h-full text-white">
    <div class="lock-overlay"></div>

    <transition name="lock-banner">
      <button
        v-if="lockBannerVisible && lockBannerNote"
        class="lock-banner glass"
        @click="openBannerNotification"
      >
        <AppIconVisual
          class="lock-banner-icon"
          :meta="resolveNotificationModuleMeta(lockBannerNote)"
          :image-url="notificationIconImageUrl(lockBannerNote)"
          :alt="resolveNotificationModuleMeta(lockBannerNote).label"
        />
        <div class="min-w-0 flex-1 text-left">
          <div class="lock-app-row">
            <span class="lock-app-chip" :class="resolveNotificationModuleMeta(lockBannerNote).toneClass">
              {{ resolveNotificationModuleMeta(lockBannerNote).label }}
            </span>
            <p class="lock-banner-time">{{ formatNotificationTime(lockBannerNote.createdAt) }}</p>
          </div>
          <div class="lock-banner-meta">
            <p class="lock-banner-title">{{ lockBannerNote.title }}</p>
          </div>
          <p class="lock-banner-content">{{ lockBannerNote.content }}</p>
        </div>
      </button>
    </transition>

    <section class="lock-time-panel">
      <p class="lock-label">
        <i class="fas fa-lock"></i>
        {{ t('已锁定', 'Locked') }}
      </p>
      <p
        class="lock-time"
        :class="{
          'is-outline': lockClockStyle === 'outline',
          'is-mono': lockClockStyle === 'mono',
        }"
      >
        {{ currentTime }}
      </p>
      <p class="lock-date">{{ currentDate }}</p>
    </section>

    <section class="lock-notification-stack">
      <div class="lock-notification-head">
        <p class="font-semibold">{{ t('通知中心', 'Notification Center') }}</p>
        <span class="text-xs opacity-80">{{ unreadCount }} {{ t('条未读', 'unread') }}</span>
      </div>

      <div v-if="focusModeEnabled" class="lock-focus-chip" data-testid="lock-focus-mode-chip">
        <i class="fas fa-moon"></i>
        <span>{{ t('专注模式：每组仅显示最新一条', 'Focus mode: newest item per group') }}</span>
      </div>

      <div v-if="visibleLockNotificationGroups.length > 0" class="space-y-3">
        <section
          v-for="group in visibleLockNotificationGroups"
          :key="group.key"
          class="lock-notification-group"
        >
          <div class="lock-notification-group-head">
            <div class="lock-notification-group-meta">
              <span class="lock-app-chip" :class="group.meta.toneClass">
                {{ group.meta.label }}
              </span>
              <span class="lock-notification-group-count">
                {{ group.notes.length }} {{ t('条', 'items') }}
              </span>
            </div>
            <span v-if="group.unreadCount > 0" class="lock-notification-group-unread">
              {{ group.unreadCount }} {{ t('未读', 'unread') }}
            </span>
          </div>

          <TransitionGroup name="lock-list" tag="div" class="space-y-2">
            <button
              v-for="note in group.notes"
              :key="note.id"
              class="lock-notification-card glass text-left"
              :class="{ 'is-read': note.read }"
              @click="openNotification(note)"
            >
              <AppIconVisual
                class="lock-notification-icon"
                :meta="resolveNotificationModuleMeta(note)"
                :image-url="notificationIconImageUrl(note)"
                :alt="resolveNotificationModuleMeta(note).label"
              />
              <div class="min-w-0 flex-1">
                <div class="lock-notification-row">
                  <span class="lock-notification-group-tag">
                    {{ group.meta.label }}
                  </span>
                  <p class="lock-notification-time">{{ formatNotificationTime(note.createdAt) }}</p>
                </div>
                <div class="lock-notification-meta">
                  <p class="lock-notification-title">{{ note.title }}</p>
                </div>
                <p class="lock-notification-content">{{ note.content }}</p>
              </div>
            </button>
          </TransitionGroup>
          <p v-if="group.hiddenCount > 0" class="lock-focus-hidden">
            {{ t(`已收起 ${group.hiddenCount} 条`, `${group.hiddenCount} hidden`) }}
          </p>
        </section>
      </div>

      <div v-else class="lock-notification-empty glass">
        {{ t('暂无新消息', 'No new notifications') }}
      </div>
    </section>

    <div class="lock-unlock-area">
      <button class="lock-unlock-button" @click="unlockPhone">
        {{ t('解锁进入主屏', 'Unlock to Home') }}
      </button>
      <p class="lock-unlock-hint">{{ t('提示：通知可直接点开并解锁进入对应页面', 'Tip: tap a notification to unlock and open its target page') }}</p>
    </div>
  </div>
</template>

<style scoped>
.lock-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: calc(70px + env(safe-area-inset-top)) 16px calc(22px + env(safe-area-inset-bottom));
}

.lock-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 12%, rgba(255, 255, 255, 0.16), transparent 36%),
    linear-gradient(180deg, rgba(7, 10, 24, 0.22) 0%, rgba(9, 12, 20, 0.58) 100%);
  backdrop-filter: blur(4px) saturate(1.05);
  -webkit-backdrop-filter: blur(4px) saturate(1.05);
  pointer-events: none;
}

.lock-time-panel,
.lock-notification-stack,
.lock-unlock-area {
  position: relative;
  z-index: 1;
}

.lock-banner {
  position: relative;
  z-index: 2;
  width: 100%;
  margin-bottom: 10px;
  border: 1px solid var(--system-border-light);
  border-radius: var(--system-radius-md);
  padding: 11px 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(255, 255, 255, 0.22);
  box-shadow: var(--system-shadow-soft);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.18);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.18);
}

.lock-banner-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.24);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.lock-banner-icon.accent-default,
.lock-notification-icon.accent-default,
.lock-app-chip.accent-default {
  background: linear-gradient(135deg, rgba(93, 130, 149, 0.94) 0%, rgba(56, 94, 117, 0.9) 100%);
  color: #fff;
}

.lock-banner-icon.accent-cool,
.lock-notification-icon.accent-cool,
.lock-app-chip.accent-cool {
  background: linear-gradient(135deg, rgba(111, 148, 154, 0.94) 0%, rgba(61, 105, 116, 0.9) 100%);
  color: #fff;
}

.lock-banner-icon.accent-warm,
.lock-notification-icon.accent-warm,
.lock-app-chip.accent-warm {
  background: linear-gradient(135deg, rgba(186, 133, 104, 0.94) 0%, rgba(143, 95, 79, 0.9) 100%);
  color: #fff;
}

.lock-banner-icon.accent-light,
.lock-notification-icon.accent-light,
.lock-app-chip.accent-light {
  background: rgba(255, 255, 255, 0.9);
  color: #334155;
}

.lock-banner-icon.accent-dark,
.lock-notification-icon.accent-dark,
.lock-app-chip.accent-dark {
  background: rgba(15, 23, 42, 0.9);
  color: #fff;
}

.lock-banner-icon.is-shopping,
.lock-notification-icon.is-shopping,
.lock-app-chip.is-shopping {
  background: linear-gradient(135deg, rgba(176, 103, 116, 0.94) 0%, rgba(135, 72, 82, 0.9) 100%);
  color: #fff;
}

.lock-banner-icon.is-forum,
.lock-notification-icon.is-forum,
.lock-app-chip.is-forum {
  background: linear-gradient(135deg, rgba(111, 117, 145, 0.94) 0%, rgba(75, 82, 111, 0.9) 100%);
  color: #fff;
}

.lock-banner-icon.is-system,
.lock-notification-icon.is-system,
.lock-app-chip.is-system {
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
}

.lock-app-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.lock-app-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.lock-banner-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: 5px;
}

.lock-banner-title {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lock-banner-time {
  font-size: 10px;
  opacity: 0.75;
  flex-shrink: 0;
}

.lock-banner-content {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.92;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lock-time-panel {
  text-align: center;
  margin-bottom: 20px;
}

.lock-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  opacity: 0.82;
}

.lock-time {
  margin-top: 10px;
  font-size: clamp(62px, 15vw, 92px);
  line-height: 1;
  font-weight: 300;
  letter-spacing: -0.025em;
  text-shadow: 0 14px 34px rgba(0, 0, 0, 0.24);
}

.lock-time.is-outline {
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.95);
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}

.lock-time.is-mono {
  font-family: "SF Mono", "JetBrains Mono", "Fira Code", monospace;
  letter-spacing: 0;
  font-size: clamp(54px, 13vw, 78px);
  font-weight: 500;
}

.lock-date {
  margin-top: 8px;
  font-size: 14px;
  opacity: 0.9;
}

.lock-notification-stack {
  margin-top: 8px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-bottom: 10px;
}

.lock-notification-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 4px;
}

.lock-focus-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px 4px;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 700;
}

.lock-focus-hidden {
  margin-top: 8px;
  padding-left: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.68);
}

.lock-notification-group {
  display: block;
}

.lock-notification-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  padding: 0 4px;
}

.lock-notification-group-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.lock-notification-group-count,
.lock-notification-group-unread {
  font-size: 10px;
  opacity: 0.78;
}

.lock-notification-group-unread {
  flex-shrink: 0;
}

.lock-notification-card {
  width: 100%;
  border: 1px solid var(--system-border-light);
  border-radius: var(--system-radius-md);
  padding: 11px 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(var(--system-blur-md)) saturate(1.12);
  -webkit-backdrop-filter: blur(var(--system-blur-md)) saturate(1.12);
}

.lock-notification-card.is-read {
  opacity: 0.78;
}

.lock-notification-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.lock-notification-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.lock-notification-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.lock-notification-group-tag {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.78;
}

.lock-notification-title {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lock-notification-time {
  font-size: 10px;
  opacity: 0.75;
  flex-shrink: 0;
}

.lock-notification-content {
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.9;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lock-notification-empty {
  border-radius: var(--system-radius-md);
  padding: 14px 12px;
  font-size: 12px;
  text-align: center;
  opacity: 0.86;
}

.lock-unlock-area {
  margin-top: auto;
  padding-top: 10px;
}

.lock-unlock-button {
  width: 100%;
  border: 1px solid var(--system-border-light);
  border-radius: 999px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(var(--system-blur-md));
  -webkit-backdrop-filter: blur(var(--system-blur-md));
  transition: transform var(--system-motion-fast), background var(--system-motion-fast);
}

.lock-unlock-button:active {
  transform: scale(0.985);
  background: rgba(255, 255, 255, 0.24);
}

.lock-unlock-hint {
  margin-top: 8px;
  text-align: center;
  font-size: 10px;
  opacity: 0.68;
}

.lock-banner-enter-active,
.lock-banner-leave-active {
  transition: opacity var(--system-motion-base), transform var(--system-motion-base);
}

.lock-banner-enter-from,
.lock-banner-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.lock-list-enter-active,
.lock-list-leave-active,
.lock-list-move {
  transition: transform var(--system-motion-base), opacity var(--system-motion-base);
}

.lock-list-enter-from,
.lock-list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
