<script setup>
import { computed } from 'vue'
import { projectUiAssetUrl } from '../../lib/project-assets'

const props = defineProps({
  // brand: header tile · hero: home hero character · empty: empty-state figure
  size: { type: String, default: 'brand' },
  // future pose key from the upcoming asset set (standing / sitting / waving...)
  pose: { type: String, default: 'standing' },
})

const sizeClass = computed(() => `care-mascot--${props.size}`)
const mascotImageUrl = projectUiAssetUrl('shared/app-icons/ondam-care-app-icon-v2.png')
</script>

<template>
  <span
    class="care-mascot"
    :class="sizeClass"
    :data-pose="pose"
    role="img"
    aria-hidden="true"
  >
    <img
      :src="mascotImageUrl"
      alt=""
      draggable="false"
      data-required-asset="shared/app-icons/ondam-care-app-icon-v2.png"
    />
  </span>
</template>

<style scoped>
.care-mascot {
  display: inline-block;
  flex: none;
  border-radius: 22%;
  overflow: hidden;
  line-height: 0;
}

.care-mascot img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
}

.care-mascot--brand {
  width: 44px;
  height: 44px;
}

.care-mascot--hero {
  width: clamp(88px, 22vw, 132px);
  height: clamp(88px, 22vw, 132px);
}

.care-mascot--empty {
  width: 92px;
  height: 92px;
}
</style>
