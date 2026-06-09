<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'
import { compareSoftwareVersions } from '../../lib/app-update'

const props = defineProps({
  buildChannel: {
    type: String,
    required: true,
  },
  updateState: {
    type: Object,
    required: true,
  },
  releaseNotes: {
    type: Array,
    default: () => [],
  },
  feedbackType: {
    type: String,
    default: '',
  },
  feedbackMessage: {
    type: String,
    default: '',
  },
  formatTime: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'check-update',
  'install-update',
  'postpone-update',
  'restart-update',
])

const { t } = useI18n()

const currentVersion = computed(() => props.updateState?.currentVersion || '1.2.0')
const availableVersion = computed(() => props.updateState?.availableVersion || currentVersion.value)
const updateStatus = computed(() => props.updateState?.status || 'idle')
const restartRequired = computed(() => props.updateState?.restartRequired === true)
const updateAvailable = computed(() =>
  compareSoftwareVersions(availableVersion.value, currentVersion.value) > 0,
)
const canInstall = computed(
  () =>
    updateAvailable.value &&
    !restartRequired.value &&
    ['available', 'postponed'].includes(updateStatus.value),
)
const canPostpone = computed(() => canInstall.value || restartRequired.value)

const statusLabel = computed(() => {
  if (restartRequired.value) return t('需要重启', 'Restart required')
  if (updateStatus.value === 'available') return t('有可用更新', 'Update available')
  if (updateStatus.value === 'postponed') return t('稍后更新', 'Postponed')
  if (!updateAvailable.value && updateStatus.value === 'idle') return t('已是最新版本', 'Up to date')
  return t('尚未检查', 'Not checked')
})

const statusClass = computed(() => {
  if (restartRequired.value) return 'is-restart'
  if (updateStatus.value === 'available') return 'is-available'
  if (updateStatus.value === 'postponed') return 'is-postponed'
  return 'is-idle'
})

const primaryTitle = computed(() =>
  restartRequired.value || canInstall.value
    ? `SchatPhone ${availableVersion.value}`
    : `SchatPhone ${currentVersion.value}`,
)

const lastCheckedLabel = computed(() => props.formatTime(props.updateState?.lastCheckedAt || 0))
const downloadedLabel = computed(() => props.formatTime(props.updateState?.downloadedAt || 0))
const feedbackClass = computed(() => {
  if (props.feedbackType === 'success') return 'is-success'
  if (props.feedbackType === 'warn') return 'is-warn'
  if (props.feedbackType === 'error') return 'is-error'
  return 'is-info'
})
</script>

<template>
  <section class="software-update-stack" data-testid="settings-software-update-section">
    <div class="software-update-card software-update-summary">
      <div class="software-update-summary-head">
        <div>
          <p class="software-update-eyebrow">{{ t('软件更新', 'Software Update') }}</p>
          <h2>{{ primaryTitle }}</h2>
        </div>
        <span class="software-update-status" :class="statusClass" data-testid="settings-software-update-status">
          {{ statusLabel }}
        </span>
      </div>

      <div class="software-update-system-row">
        <div class="software-update-icon">
          <i class="fas fa-arrow-rotate-right"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p>{{ t('系统版本', 'System version') }}</p>
          <span>{{ t('确认版本后再安装，安装完成后手动重启。', 'Confirm the version before installing, then restart manually after install.') }}</span>
        </div>
      </div>

      <div class="software-update-list">
        <div class="software-update-row">
          <span>{{ t('当前版本', 'Current version') }}</span>
          <strong data-testid="settings-software-update-current">{{ currentVersion }}</strong>
        </div>
        <div class="software-update-row">
          <span>{{ t('可用版本', 'Available version') }}</span>
          <strong data-testid="settings-software-update-available">{{ availableVersion }}</strong>
        </div>
        <div class="software-update-row">
          <span>{{ t('渠道', 'Channel') }}</span>
          <strong>{{ buildChannel }}</strong>
        </div>
        <div class="software-update-row">
          <span>{{ t('上次检查', 'Last checked') }}</span>
          <strong>{{ lastCheckedLabel }}</strong>
        </div>
        <div v-if="props.updateState?.downloadedAt" class="software-update-row">
          <span>{{ t('安装时间', 'Installed') }}</span>
          <strong>{{ downloadedLabel }}</strong>
        </div>
      </div>
    </div>

    <div class="software-update-card">
      <p class="software-update-section-title">{{ t('更新内容', 'Release notes') }}</p>
      <ul class="software-update-notes">
        <li v-for="note in releaseNotes" :key="note.en || note.zh">
          {{ t(note.zh, note.en) }}
        </li>
      </ul>
    </div>

    <div
      v-if="feedbackMessage"
      class="software-update-feedback"
      :class="feedbackClass"
      data-testid="settings-software-update-feedback"
    >
      {{ feedbackMessage }}
    </div>

    <div class="software-update-actions">
      <button
        type="button"
        class="software-update-button is-secondary"
        data-testid="settings-software-update-check"
        @click="emit('check-update')"
      >
        <i class="fas fa-magnifying-glass"></i>
        <span>{{ t('检查更新', 'Check Update') }}</span>
      </button>
      <button
        v-if="canInstall"
        type="button"
        class="software-update-button is-primary"
        data-testid="settings-software-update-install"
        @click="emit('install-update')"
      >
        <i class="fas fa-download"></i>
        <span>{{ t('下载并安装', 'Download and Install') }}</span>
      </button>
      <button
        v-if="restartRequired"
        type="button"
        class="software-update-button is-primary"
        data-testid="settings-software-update-restart"
        @click="emit('restart-update')"
      >
        <i class="fas fa-power-off"></i>
        <span>{{ t('重启并进入新版', 'Restart into New Version') }}</span>
      </button>
      <button
        v-if="canPostpone"
        type="button"
        class="software-update-button is-plain"
        data-testid="settings-software-update-postpone"
        @click="emit('postpone-update')"
      >
        {{ t('稍后', 'Later') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.software-update-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.software-update-card {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  padding: 16px;
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.software-update-summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.software-update-summary-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.software-update-eyebrow,
.software-update-section-title {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.software-update-summary h2 {
  margin-top: 4px;
  color: var(--system-text);
  font-size: 21px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: 0;
}

.software-update-status {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 800;
  background: var(--system-surface-muted);
  color: var(--system-text-muted);
}

.software-update-status.is-available,
.software-update-status.is-restart {
  background: var(--system-accent-soft);
  color: var(--system-accent);
}

.software-update-status.is-postponed {
  background: var(--system-warning-soft);
  color: var(--system-warning);
}

.software-update-system-row {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: var(--system-radius-md);
  padding: 12px;
  background: var(--system-surface-muted);
}

.software-update-icon {
  display: flex;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: var(--system-on-accent);
  background: var(--system-accent);
  font-size: 16px;
}

.software-update-system-row p {
  color: var(--system-text);
  font-size: 14px;
  font-weight: 800;
}

.software-update-system-row span {
  display: block;
  margin-top: 2px;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.software-update-list {
  overflow: hidden;
  border: 1px solid var(--system-subtle-border);
  border-radius: var(--system-radius-md);
}

.software-update-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  border-bottom: 1px solid var(--system-subtle-border);
  padding: 0 12px;
  font-size: 13px;
}

.software-update-row:last-child {
  border-bottom: 0;
}

.software-update-row span {
  color: var(--system-text-muted);
}

.software-update-row strong {
  color: var(--system-text);
  font-weight: 800;
  text-align: right;
}

.software-update-notes {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: var(--system-text);
  font-size: 13px;
  line-height: 1.45;
}

.software-update-notes li {
  position: relative;
  padding-left: 14px;
}

.software-update-notes li::before {
  position: absolute;
  top: 0.62em;
  left: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--system-accent);
  content: '';
}

.software-update-feedback {
  border-radius: var(--system-radius-md);
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 700;
  background: var(--system-accent-soft);
  color: var(--system-accent);
}

.software-update-feedback.is-success {
  background: var(--system-success-soft);
  color: var(--system-success);
}

.software-update-feedback.is-warn {
  background: var(--system-warning-soft);
  color: var(--system-warning);
}

.software-update-feedback.is-error {
  background: var(--system-danger-soft);
  color: var(--system-danger);
}

.software-update-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.software-update-button {
  display: inline-flex;
  min-height: 46px;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 800;
  transition:
    transform var(--system-motion-fast),
    background var(--system-motion-fast);
}

.software-update-button:active {
  transform: scale(0.985);
}

.software-update-button.is-primary {
  border-color: var(--system-accent);
  background: var(--system-accent);
  color: var(--system-on-accent);
}

.software-update-button.is-secondary,
.software-update-button.is-plain {
  background: var(--system-control-bg);
  color: var(--system-accent);
}

.software-update-button.is-plain {
  min-height: 40px;
  border-color: transparent;
  background: transparent;
}
</style>
