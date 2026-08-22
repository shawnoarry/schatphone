<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  labelZh: {
    type: String,
    default: '',
  },
  labelEn: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  tone: {
    type: String,
    default: 'blue',
  },
  truncate: {
    type: Boolean,
    default: true,
  },
})

const { t } = useI18n()

const displayLabel = computed(() => {
  if (props.label) return props.label
  if (props.labelZh || props.labelEn) return t(props.labelZh || props.labelEn, props.labelEn || props.labelZh)
  return ''
})

const toneClass = computed(() => {
  if (props.tone === 'neutral') return 'asset-status-badge--neutral'
  if (props.tone === 'amber') return 'asset-status-badge--amber'
  if (props.tone === 'emerald') return 'asset-status-badge--emerald'
  if (props.tone === 'red') return 'asset-status-badge--red'
  if (props.tone === 'sky-solid') return 'asset-status-badge--sky-solid'
  return 'asset-status-badge--blue'
})
</script>

<template>
  <span
    class="inline-flex max-w-full items-center rounded-full border px-1.5 py-0.5 text-[9px]"
    :class="toneClass"
  >
    <i v-if="icon" :class="[icon, 'mr-1 text-[9px]']"></i>
    <span :class="truncate ? 'truncate' : ''">{{ displayLabel }}</span>
  </span>
</template>

<style scoped>
.asset-status-badge--neutral {
  border-color: var(--system-subtle-border);
  background: var(--system-surface-muted);
  color: var(--system-text-soft);
}

.asset-status-badge--amber {
  border-color: var(--system-warning-soft);
  background: var(--system-warning-soft);
  color: var(--system-warning);
}

.asset-status-badge--emerald {
  border-color: var(--system-success-soft);
  background: var(--system-success-soft);
  color: var(--system-success);
}

.asset-status-badge--red {
  border-color: var(--system-danger-soft);
  background: var(--system-danger-soft);
  color: var(--system-danger);
}

.asset-status-badge--sky-solid {
  border-color: transparent;
  background: rgba(14, 165, 233, 0.9);
  color: #ffffff;
}

.asset-status-badge--blue {
  border-color: var(--system-accent-soft);
  background: var(--system-accent-soft);
  color: var(--system-accent);
}
</style>
