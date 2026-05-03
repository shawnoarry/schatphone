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
  if (tone === 'violet') return 'border-violet-400 ring-2 ring-violet-100'
  if (tone === 'sky') return 'border-sky-400 ring-2 ring-sky-100'
  if (tone === 'slate') return 'border-slate-400'
  if (tone === 'cyan') return 'border-cyan-200 ring-2 ring-cyan-200/25'
  return 'border-blue-300 bg-blue-50'
})

const rootClass = computed(() => {
  if (isTinyVariant.value) return 'w-7 h-7 shrink-0'
  if (isMiniVariant.value) return 'w-10 h-10 shrink-0'
  if (isSquareVariant.value) return 'w-full'
  if (isCompactVariant.value) return 'shrink-0 w-14 text-left'
  if (isPortraitVariant.value) return 'shrink-0 w-16 text-left'
  if (isRailVariant.value) return 'shrink-0 w-16 text-left'
  return [
    'rounded-lg border p-1.5 text-left transition',
    props.selected ? selectedFrameClass.value : 'border-gray-200 bg-white',
    props.interactive ? 'hover:bg-gray-50' : '',
  ]
})

const frameClass = computed(() => {
  if (isTinyVariant.value) return 'w-7 h-7 rounded-md overflow-hidden bg-gray-100 border border-gray-200'
  if (isMiniVariant.value) return 'w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200'
  if (isSquareVariant.value) return 'aspect-square bg-neutral-100 relative'
  if (isCompactVariant.value) {
    return [
      'w-14 h-14 rounded-xl overflow-hidden border bg-gray-50',
      props.selected ? selectedFrameClass.value : 'border-gray-200',
    ]
  }
  if (isPortraitVariant.value) {
    return [
      'relative w-16 h-24 rounded-2xl overflow-hidden border bg-white',
      props.selected ? selectedFrameClass.value : 'border-gray-200',
    ]
  }
  if (!isRailVariant.value) return 'w-full h-14 rounded-md bg-gray-100 overflow-hidden'
  return [
    'relative w-16 h-16 rounded-2xl overflow-hidden border bg-white/10',
    props.selected ? 'border-cyan-200 ring-2 ring-cyan-200/25' : 'border-white/15',
  ]
})

const loadingClass = computed(() =>
  isTinyVariant.value
    ? 'w-full h-full flex items-center justify-center text-[8px] text-gray-400'
    : isMiniVariant.value
    ? 'w-full h-full flex items-center justify-center text-[9px] text-gray-400'
    : isSquareVariant.value
    ? 'w-full h-full flex items-center justify-center text-neutral-400 text-xs'
    : isCompactVariant.value
    ? 'w-full h-full flex items-center justify-center text-[9px] text-gray-400 bg-gray-50'
    : isPortraitVariant.value
    ? 'w-full h-full flex items-center justify-center bg-gray-50 text-[9px] text-gray-400'
    : isRailVariant.value
    ? 'w-full h-full flex items-center justify-center text-[9px] text-cyan-50/50 bg-white/10'
    : 'w-full h-full flex items-center justify-center text-[10px] text-gray-400',
)

const nameClass = computed(() => {
  if (isRailVariant.value) return 'mt-1 text-[10px] text-cyan-50/65 line-clamp-2 text-left'
  if (isCompactVariant.value) return 'mt-1 text-[10px] text-gray-500 line-clamp-2 text-left'
  if (isPortraitVariant.value) return 'mt-1 text-[10px] text-gray-600 truncate'
  return 'mt-1 text-[10px] font-medium text-gray-700 line-clamp-1'
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
