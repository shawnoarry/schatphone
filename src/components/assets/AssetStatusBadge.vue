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
  if (props.tone === 'neutral') return 'border-neutral-200 bg-neutral-50 text-neutral-400'
  if (props.tone === 'amber') return 'border-amber-100 bg-amber-50 text-amber-600'
  if (props.tone === 'emerald') return 'border-emerald-100 bg-emerald-50 text-emerald-600'
  if (props.tone === 'red') return 'border-red-100 bg-red-50 text-red-500'
  if (props.tone === 'sky-solid') return 'border-transparent bg-sky-500/90 text-white'
  return 'border-blue-100 bg-blue-50 text-blue-500'
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
