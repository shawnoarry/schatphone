<script setup>
import { computed } from 'vue'

const props = defineProps({
  meta: {
    type: Object,
    default: () => ({}),
  },
  imageUrl: {
    type: String,
    default: '',
  },
  accentStyle: {
    type: Object,
    default: null,
  },
  alt: {
    type: String,
    default: '',
  },
})

const iconClass = computed(() => props.meta?.icon || 'fas fa-circle')
const toneClass = computed(() => props.meta?.toneClass || `accent-${props.meta?.accent || 'default'}`)
const hasImage = computed(() => typeof props.imageUrl === 'string' && props.imageUrl.trim())
const isCloudPastelAnimal = computed(() =>
  props.imageUrl.includes('/cloud-pastel-animals-v1/'),
)
</script>

<template>
  <span
    class="app-icon-visual"
    :class="[
      toneClass,
      {
        'has-image': hasImage,
        'is-cloud-pastel-animal': isCloudPastelAnimal,
      },
    ]"
    :style="hasImage ? undefined : accentStyle"
  >
    <img v-if="hasImage" :src="imageUrl" :alt="alt || meta.label || ''" />
    <i v-else :class="iconClass" aria-hidden="true"></i>
  </span>
</template>

<style scoped>
.app-icon-visual {
  position: relative;
  overflow: hidden;
}

.app-icon-visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

:global(:root[data-color-mode='night'] .app-icon-visual.is-cloud-pastel-animal img) {
  filter: brightness(0.9) saturate(0.9) contrast(0.98);
}

:global(:root[data-color-mode='night'] .app-icon-visual.is-cloud-pastel-animal::after) {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: rgba(18, 30, 52, 0.06);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 -8px 14px rgba(8, 14, 26, 0.04);
  mix-blend-mode: multiply;
}
</style>
