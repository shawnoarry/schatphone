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
</script>

<template>
  <span
    class="app-icon-visual"
    :class="[toneClass, { 'has-image': hasImage }]"
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
</style>
