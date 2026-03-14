<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useI18n } from '../composables/useI18n'

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
const { systemLanguage, languageBase, t } = useI18n()
const { notifications, settings } = storeToRefs(systemStore)
const LOCK_BANNER_HIDE_MS = 2600
const timeLocale = computed(() => (languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value))

const lockClockStyle = computed(() => settings.value.appearance.lockClockStyle || 'classic')
const lockNotifications = computed(() => {
  return [...notifications.value]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 8)
})
const unreadCount = computed(() =>
  lockNotifications.value.reduce((count, note) => count + (note.read ? 0 : 1), 0),
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
        <div class="lock-banner-icon">
          <i :class="lockBannerNote.icon"></i>
        </div>
        <div class="min-w-0 flex-1 text-left">
          <div class="lock-banner-meta">
            <p class="lock-banner-title">{{ lockBannerNote.title }}</p>
            <p class="lock-banner-time">{{ formatNotificationTime(lockBannerNote.createdAt) }}</p>
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

      <TransitionGroup v-if="lockNotifications.length > 0" name="lock-list" tag="div" class="space-y-2">
        <button
          v-for="note in lockNotifications"
          :key="note.id"
          class="lock-notification-card glass text-left"
          :class="{ 'is-read': note.read }"
          @click="openNotification(note)"
        >
          <div class="lock-notification-icon">
            <i :class="note.icon"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="lock-notification-meta">
              <p class="lock-notification-title">{{ note.title }}</p>
              <p class="lock-notification-time">{{ formatNotificationTime(note.createdAt) }}</p>
            </div>
            <p class="lock-notification-content">{{ note.content }}</p>
          </div>
        </button>
      </TransitionGroup>

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
  padding: 72px 16px 22px;
}

.lock-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(7, 10, 24, 0.32) 0%, rgba(10, 12, 20, 0.56) 100%);
  backdrop-filter: blur(6px);
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
  border: 0;
  border-radius: 16px;
  padding: 10px 11px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
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

.lock-banner-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
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
  margin-bottom: 18px;
}

.lock-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.88;
}

.lock-time {
  margin-top: 8px;
  font-size: clamp(58px, 14vw, 86px);
  line-height: 1;
  font-weight: 300;
  letter-spacing: -0.03em;
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
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

.lock-notification-card {
  width: 100%;
  border: 0;
  border-radius: 16px;
  padding: 10px 11px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
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
  border-radius: 16px;
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
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  padding: 11px 14px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.lock-unlock-hint {
  margin-top: 8px;
  text-align: center;
  font-size: 10px;
  opacity: 0.68;
}

.lock-banner-enter-active,
.lock-banner-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.lock-banner-enter-from,
.lock-banner-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.lock-list-enter-active,
.lock-list-leave-active,
.lock-list-move {
  transition: transform 220ms ease, opacity 220ms ease;
}

.lock-list-enter-from,
.lock-list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
