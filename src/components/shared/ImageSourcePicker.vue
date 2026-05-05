<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  sourceType: {
    type: String,
    default: 'none',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  galleryAssetId: {
    type: String,
    default: '',
  },
  galleryAssets: {
    type: Array,
    default: () => [],
  },
  sourceOptions: {
    type: Array,
    default: () => [
      { value: 'none', labelZh: '默认图标', labelEn: 'Default icon' },
      { value: 'url', labelZh: 'URL 图片', labelEn: 'URL image' },
      { value: 'gallery', labelZh: 'Gallery 素材', labelEn: 'Gallery asset' },
      { value: 'ai', labelZh: 'AI 图片预留', labelEn: 'AI image reserved' },
    ],
  },
  urlPlaceholderZh: {
    type: String,
    default: 'https:// 图片地址',
  },
  urlPlaceholderEn: {
    type: String,
    default: 'https:// image URL',
  },
  galleryPlaceholderZh: {
    type: String,
    default: '选择 Gallery 素材',
  },
  galleryPlaceholderEn: {
    type: String,
    default: 'Choose Gallery asset',
  },
  size: {
    type: String,
    default: 'sm',
  },
  testIdPrefix: {
    type: String,
    default: 'image-source',
  },
})

const emit = defineEmits([
  'update:sourceType',
  'update:source-type',
  'update:imageUrl',
  'update:image-url',
  'update:galleryAssetId',
  'update:gallery-asset-id',
])
const { t } = useI18n()

const normalizedSourceOptions = computed(() =>
  props.sourceOptions
    .map((option) => {
      if (typeof option === 'string') {
        return { value: option, labelZh: option, labelEn: option }
      }
      const value = typeof option?.value === 'string' ? option.value : ''
      const fallbackLabel = typeof option?.label === 'string' ? option.label : value
      return {
        value,
        labelZh: typeof option?.labelZh === 'string' ? option.labelZh : fallbackLabel,
        labelEn: typeof option?.labelEn === 'string' ? option.labelEn : fallbackLabel,
      }
    })
    .filter((option) => option.value),
)

const inputClass = computed(() =>
  props.size === 'xs'
    ? 'rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none'
    : 'rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none',
)

const hasDetailInput = computed(() => ['url', 'gallery'].includes(props.sourceType))

const updateSourceType = (event) => {
  const sourceType = event.target.value
  emit('update:sourceType', sourceType)
  emit('update:source-type', sourceType)
  if (sourceType !== 'url') {
    emit('update:imageUrl', '')
    emit('update:image-url', '')
  }
  if (sourceType !== 'gallery') {
    emit('update:galleryAssetId', '')
    emit('update:gallery-asset-id', '')
  }
}

const updateImageUrl = (value) => {
  emit('update:imageUrl', value)
  emit('update:image-url', value)
}

const updateGalleryAssetId = (value) => {
  emit('update:galleryAssetId', value)
  emit('update:gallery-asset-id', value)
}
</script>

<template>
  <div class="grid gap-2" :class="hasDetailInput ? 'grid-cols-2' : 'grid-cols-1'">
    <select
      :value="sourceType"
      :class="inputClass"
      :data-testid="`${testIdPrefix}-image-source`"
      @change="updateSourceType"
    >
      <option
        v-for="option in normalizedSourceOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ t(option.labelZh, option.labelEn) }}
      </option>
    </select>
    <input
      v-if="sourceType === 'url'"
      :value="imageUrl"
      :class="inputClass"
      :data-testid="`${testIdPrefix}-image-url`"
      :placeholder="t(urlPlaceholderZh, urlPlaceholderEn)"
      @input="updateImageUrl($event.target.value)"
    />
    <select
      v-else-if="sourceType === 'gallery'"
      :value="galleryAssetId"
      :class="inputClass"
      :data-testid="`${testIdPrefix}-gallery-asset`"
      @change="updateGalleryAssetId($event.target.value)"
    >
      <option value="">{{ t(galleryPlaceholderZh, galleryPlaceholderEn) }}</option>
      <option v-for="asset in galleryAssets" :key="asset.id" :value="asset.id">
        {{ asset.name }}
      </option>
    </select>
  </div>
</template>
