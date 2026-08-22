<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  asset: {
    type: Object,
    required: true,
  },
  previewUrl: {
    type: String,
    default: '',
  },
  selected: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String,
    default: 'grid',
  },
  selectionTone: {
    type: String,
    default: '',
  },
  interactive: {
    type: Boolean,
    default: true,
  },
  showName: {
    type: Boolean,
    default: true,
  },
  imageAlt: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select'])

const { t } = useI18n()

const isRailVariant = computed(() => props.variant === 'rail')
const isMiniVariant = computed(() => props.variant === 'mini')
const isTinyVariant = computed(() => props.variant === 'tiny')
const isCompactVariant = computed(() => props.variant === 'compact')
const isPortraitVariant = computed(() => props.variant === 'portrait')
const isSquareVariant = computed(() => props.variant === 'square')

const displayName = computed(() => props.asset?.name || props.asset?.label || '')

const selectedFrameClass = computed(() => {
  const tone = props.selectionTone || (isRailVariant.value ? 'cyan' : 'blue')
  if (tone === 'sky') return 'ato-selected--info'
  if (tone === 'slate') return 'ato-selected--neutral'
  if (tone === 'cyan') return 'ato-selected--rail'
  return 'ato-selected--accent'
})

const rootClass = computed(() => {
  if (isTinyVariant.value) return 'w-7 h-7 shrink-0'
  if (isMiniVariant.value) return 'w-10 h-10 shrink-0'
  if (isSquareVariant.value) return 'w-full'
  if (isCompactVariant.value) return 'shrink-0 w-14 text-left'
  if (isPortraitVariant.value) return 'shrink-0 w-16 text-left'
  if (isRailVariant.value) return 'shrink-0 w-16 text-left'
  return [
    'ato-root',
    props.selected ? selectedFrameClass.value : '',
    props.interactive ? 'ato-root--interactive' : '',
  ]
})

const frameClass = computed(() => {
  if (isTinyVariant.value) return 'w-7 h-7 rounded-md overflow-hidden ato-frame ato-frame--bordered'
  if (isMiniVariant.value) return 'w-10 h-10 rounded-lg overflow-hidden ato-frame ato-frame--bordered'
  if (isSquareVariant.value) return 'aspect-square ato-frame relative'
  if (isCompactVariant.value) {
    return [
      'w-14 h-14 rounded-xl overflow-hidden border ato-frame',
      props.selected ? selectedFrameClass.value : 'ato-frame--bordered',
    ]
  }
  if (isPortraitVariant.value) {
    return [
      'relative w-16 h-24 rounded-2xl overflow-hidden border ato-frame ato-frame--panel',
      props.selected ? selectedFrameClass.value : 'ato-frame--bordered',
    ]
  }
  if (!isRailVariant.value) return 'w-full h-14 rounded-md ato-frame overflow-hidden'
  return [
    'relative w-16 h-16 rounded-2xl overflow-hidden border bg-white/10',
    props.selected ? 'border-cyan-200 ring-2 ring-cyan-200/25' : 'border-white/15',
  ]
})

const loadingClass = computed(() => {
  const base = 'w-full h-full flex items-center justify-center ato-loading'
  if (isTinyVariant.value) return `${base} text-[8px]`
  if (isMiniVariant.value) return `${base} text-[9px]`
  if (isSquareVariant.value) return `${base} text-xs`
  if (isCompactVariant.value) return `${base} text-[9px] ato-frame`
  if (isPortraitVariant.value) return `${base} text-[9px] ato-frame`
  if (isRailVariant.value) return 'w-full h-full flex items-center justify-center text-[9px] text-cyan-50/50 bg-white/10'
  return `${base} text-[10px]`
})

const nameClass = computed(() => {
  if (isRailVariant.value) return 'mt-1 text-[10px] text-cyan-50/65 line-clamp-2 text-left'
  if (isCompactVariant.value) return 'mt-1 text-[10px] ato-name--muted line-clamp-2 text-left'
  if (isPortraitVariant.value) return 'mt-1 text-[10px] ato-name--muted truncate'
  return 'mt-1 text-[10px] font-medium ato-name line-clamp-1'
})

const resolvedAlt = computed(() =>
  props.imageAlt || displayName.value || t('素材预览', 'Asset preview'),
)

const selectAsset = () => {
  if (!props.interactive) return
  emit('select', props.asset)
}
</script>

<template>
  <button
    v-if="interactive"
    type="button"
    :class="rootClass"
    @click="selectAsset"
  >
    <div :class="frameClass">
      <img
        v-if="previewUrl"
        :src="previewUrl"
        :alt="resolvedAlt"
        class="w-full h-full object-cover"
      />
      <div v-else :class="loadingClass">
        {{ t('加载中', 'Loading') }}
      </div>
      <slot name="overlay" :asset="asset" :selected="selected"></slot>
    </div>
    <p v-if="showName" :class="nameClass">{{ displayName }}</p>
    <slot name="badges" :asset="asset" :selected="selected"></slot>
  </button>

  <div v-else :class="rootClass">
    <div :class="frameClass">
      <img
        v-if="previewUrl"
        :src="previewUrl"
        :alt="resolvedAlt"
        class="w-full h-full object-cover"
      />
      <div v-else :class="loadingClass">
        {{ t('加载中', 'Loading') }}
      </div>
      <slot name="overlay" :asset="asset" :selected="selected"></slot>
    </div>
    <p v-if="showName" :class="nameClass">{{ displayName }}</p>
    <slot name="badges" :asset="asset" :selected="selected"></slot>
  </div>
</template>

<style scoped>
.ato-root {
  border: 1px solid var(--system-subtle-border);
  border-radius: 0.5rem;
  padding: 0.375rem;
  text-align: left;
  background: var(--system-control-bg);
  transition:
    background var(--system-motion-fast),
    border-color var(--system-motion-fast),
    box-shadow var(--system-motion-fast);
}

.ato-root--interactive:hover {
  background: var(--system-hover-bg);
}

.ato-selected--accent {
  border-color: var(--system-accent) !important;
  background: var(--system-accent-soft) !important;
}

.ato-selected--info {
  border-color: var(--system-info) !important;
  box-shadow: 0 0 0 2px var(--system-info-soft);
}

.ato-selected--neutral {
  border-color: var(--system-control-border) !important;
}

.ato-selected--rail {
  border-color: rgb(165 243 252) !important;
  box-shadow: 0 0 0 2px rgba(165, 243, 252, 0.25);
}

.ato-frame {
  background: var(--system-surface-muted);
}

.ato-frame--panel {
  background: var(--system-panel-bg);
}

.ato-frame--bordered {
  border-color: var(--system-subtle-border);
}

.ato-loading {
  color: var(--system-text-soft);
}

.ato-name {
  color: var(--system-text);
}

.ato-name--muted {
  color: var(--system-text-muted);
}
</style>
