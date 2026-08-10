<script setup>
import { computed, ref } from 'vue'
import { useI18n } from '../composables/useI18n'

const props = defineProps({
  status: {
    type: Object,
    required: true,
  },
})

defineEmits(['retry', 'refresh', 'backup'])

const { t } = useI18n()
const isCollapsed = ref(false)

const isReadOnlyNotice = computed(() => props.status.mode === 'read_only')

const isActiveWriterPreview = computed(
  () =>
    props.status.mode === 'read_only' &&
    props.status.primaryCode === 'read_only_conflict' &&
    props.status.primaryCause === 'active_writer',
)

const presentation = computed(() => {
  if (isActiveWriterPreview.value) {
    return {
      icon: 'fa-eye',
      eyebrow: t('本地预览', 'Local preview'),
      title: t('当前页面为只读预览', 'This page is a read-only preview'),
      body: t(
        '另一个 SchatPhone 页面正在使用当前存档。你可以继续查看，写入页面关闭后会自动恢复。',
        'Another SchatPhone page is using the current save. You can keep viewing, and this page will recover automatically after the writer closes.',
      ),
    }
  }
  if (props.status.mode === 'read_only') {
    return {
      icon: 'fa-shield-halved',
      eyebrow: t('存档保护', 'Save protection'),
      title: t('当前存档已进入只读保护', 'Current save is protected as read-only'),
      body: t(
        '检测到另一个写入页面或尚未解决的存档冲突。此页面不会继续覆盖已有数据。',
        'Another writer or an unresolved save conflict was detected. This page will not overwrite the existing save.',
      ),
    }
  }
  if (props.status.mode === 'degraded') {
    return {
      icon: 'fa-triangle-exclamation',
      eyebrow: t('存档保护层', 'Save protection layer'),
      title: t('保护副本尚未完成', 'The protection copy is incomplete'),
      body: t(
        '本机主存档已经写入，但附加保护层未能确认。你可以重试或先导出完整备份。',
        'The primary local save was written, but its additional protection layer could not be confirmed. Retry or export a complete backup first.',
      ),
    }
  }
  return {
    icon: 'fa-floppy-disk',
    eyebrow: t('保存未完成', 'Save incomplete'),
    title: t('最近的更改尚未保存', 'Recent changes have not been saved'),
    body: t(
      '最近一次可读取的存档仍然保留。请重试，或先导出完整备份再重新载入。',
      'The last readable save is still preserved. Retry, or export a complete backup before reloading.',
    ),
  }
})
</script>

<template>
  <button
    v-if="isReadOnlyNotice && isCollapsed"
    type="button"
    class="persistence-recovery-compact"
    data-testid="persistence-recovery-compact"
    :aria-label="t('展开只读提示', 'Expand read-only notice')"
    :title="t('展开只读提示', 'Expand read-only notice')"
    @click="isCollapsed = false"
  >
    <i
      class="fas"
      :class="isActiveWriterPreview ? 'fa-eye' : 'fa-shield-halved'"
      aria-hidden="true"
    ></i>
    <span>{{ isActiveWriterPreview
      ? t('只读预览', 'Read-only preview')
      : t('只读保护', 'Read-only protection') }}</span>
  </button>
  <section
    v-else
    class="persistence-recovery-sheet"
    :data-mode="status.mode"
    :data-reason="isActiveWriterPreview ? 'active_writer' : status.primaryCause || undefined"
    data-testid="persistence-recovery-sheet"
    :role="isActiveWriterPreview ? 'status' : 'alert'"
    :aria-live="isActiveWriterPreview ? 'polite' : 'assertive'"
  >
    <div class="persistence-recovery-sheet__lead">
      <span class="persistence-recovery-sheet__icon" aria-hidden="true">
        <i class="fas" :class="presentation.icon"></i>
      </span>
      <div class="min-w-0">
        <p class="persistence-recovery-sheet__eyebrow">{{ presentation.eyebrow }}</p>
        <h2>{{ presentation.title }}</h2>
        <p>{{ presentation.body }}</p>
      </div>
      <button
        v-if="isReadOnlyNotice"
        type="button"
        class="persistence-recovery-sheet__collapse"
        data-testid="persistence-recovery-collapse"
        :aria-label="t('继续浏览并收起提示', 'Continue browsing and collapse notice')"
        :title="t('继续浏览', 'Continue browsing')"
        @click="isCollapsed = true"
      >
        <i class="fas fa-xmark" aria-hidden="true"></i>
      </button>
    </div>

    <div class="persistence-recovery-sheet__actions">
      <button
        type="button"
        class="persistence-recovery-sheet__action is-primary"
        data-testid="persistence-recovery-retry"
        :disabled="!status.retryAvailable || status.phase === 'retrying'"
        @click="$emit('retry')"
      >
        <i class="fas fa-rotate" aria-hidden="true"></i>
        <span>{{ status.phase === 'retrying'
          ? t('正在重试', 'Retrying')
          : isActiveWriterPreview
            ? t('检查写权', 'Check access')
            : t('重试保存', 'Retry save') }}</span>
      </button>
      <button
        type="button"
        class="persistence-recovery-sheet__action"
        data-testid="persistence-recovery-refresh"
        @click="$emit('refresh')"
      >
        <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>
        <span>{{ t('重新载入', 'Reload') }}</span>
      </button>
      <button
        v-if="!isActiveWriterPreview"
        type="button"
        class="persistence-recovery-sheet__action"
        data-testid="persistence-recovery-backup"
        @click="$emit('backup')"
      >
        <i class="fas fa-box-archive" aria-hidden="true"></i>
        <span>{{ t('完整备份', 'Full backup') }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.persistence-recovery-sheet {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(18px + env(safe-area-inset-bottom));
  z-index: 58;
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--system-accent) 22%, rgba(148, 163, 184, 0.32));
  border-radius: 8px;
  background: color-mix(in srgb, var(--system-surface) 94%, transparent);
  color: var(--system-text);
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.24);
  backdrop-filter: blur(22px) saturate(1.15);
}

.persistence-recovery-sheet[data-mode='read_only'] {
  border-color: rgba(190, 95, 72, 0.46);
}

.persistence-recovery-sheet[data-reason='active_writer'] {
  gap: 10px;
  border-color: color-mix(in srgb, var(--system-accent) 24%, var(--system-border));
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
}

.persistence-recovery-compact {
  position: absolute;
  right: 12px;
  bottom: calc(18px + env(safe-area-inset-bottom));
  z-index: 58;
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 0 13px;
  border: 1px solid color-mix(in srgb, var(--system-accent) 24%, var(--system-border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--system-surface) 94%, transparent);
  color: var(--system-text);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(18px) saturate(1.1);
  font-size: 12px;
  font-weight: 720;
}

.persistence-recovery-compact i {
  color: var(--system-accent);
}

.persistence-recovery-sheet__lead {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 11px;
  align-items: start;
}

.persistence-recovery-sheet[data-mode='read_only'] .persistence-recovery-sheet__lead {
  grid-template-columns: 38px minmax(0, 1fr) 44px;
}

.persistence-recovery-sheet__collapse {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--system-text-muted);
}

.persistence-recovery-sheet__collapse:hover {
  background: var(--system-surface-muted);
  color: var(--system-text);
}

.persistence-recovery-sheet__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--system-accent) 14%, var(--system-surface));
  color: var(--system-accent);
}

.persistence-recovery-sheet[data-mode='read_only'] .persistence-recovery-sheet__icon {
  background: rgba(190, 95, 72, 0.12);
  color: #b4533d;
}

.persistence-recovery-sheet[data-reason='active_writer'] .persistence-recovery-sheet__icon {
  background: color-mix(in srgb, var(--system-accent) 12%, var(--system-surface));
  color: var(--system-accent);
}

.persistence-recovery-sheet__eyebrow {
  margin: 0 0 2px;
  color: var(--system-accent);
  font-size: 10px;
  font-weight: 750;
}

.persistence-recovery-sheet h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 760;
  line-height: 1.3;
}

.persistence-recovery-sheet__lead p:last-child {
  margin: 5px 0 0;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.persistence-recovery-sheet__actions {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.persistence-recovery-sheet[data-reason='active_writer'] .persistence-recovery-sheet__actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.persistence-recovery-sheet__action {
  display: inline-flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--system-border);
  border-radius: 7px;
  background: var(--system-surface-muted);
  color: var(--system-text);
  font-size: 12px;
  font-weight: 720;
}

.persistence-recovery-sheet__action.is-primary {
  border-color: transparent;
  background: var(--system-accent);
  color: var(--system-on-accent);
}

.persistence-recovery-sheet__action:disabled {
  cursor: not-allowed;
  opacity: 0.46;
}

.persistence-recovery-sheet__action:focus-visible,
.persistence-recovery-sheet__collapse:focus-visible,
.persistence-recovery-compact:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: 2px;
}

@media (min-width: 720px) {
  .persistence-recovery-sheet {
    left: auto;
    right: 20px;
    width: min(430px, calc(100% - 40px));
    bottom: 24px;
  }

  .persistence-recovery-compact {
    right: 20px;
    bottom: 24px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .persistence-recovery-sheet,
  .persistence-recovery-compact {
    animation: persistence-sheet-enter 180ms ease-out both;
  }
}

@keyframes persistence-sheet-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
