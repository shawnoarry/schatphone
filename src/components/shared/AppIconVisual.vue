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
  glyph: {
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
const materialClass = computed(() => props.meta?.materialClass || '')
const hasImage = computed(() => typeof props.imageUrl === 'string' && props.imageUrl.trim())
const isLiquidPrism = computed(() => props.meta?.material === 'liquid-prism')
const liquidGlyph = computed(() => props.glyph || props.meta?.liquidGlyph || null)
const hasLiquidGlyph = computed(() => Boolean(liquidGlyph.value))
const isCloudPastelAnimal = computed(() =>
  props.imageUrl.includes('/cloud-pastel-animals-v1/'),
)
</script>

<template>
  <span
    class="app-icon-visual"
    :class="[
      toneClass,
      materialClass,
      {
        'has-image': hasImage,
        'has-liquid-glyph': hasLiquidGlyph,
        'is-cloud-pastel-animal': isCloudPastelAnimal,
      },
    ]"
    :style="hasImage || isLiquidPrism ? undefined : accentStyle"
  >
    <svg
      v-if="!hasImage && (isLiquidPrism || hasLiquidGlyph) && hasLiquidGlyph"
      class="liquid-prism-glyph"
      :viewBox="liquidGlyph.viewBox"
      aria-hidden="true"
      focusable="false"
    >
      <path v-for="path in liquidGlyph.paths" :key="path" :d="path" />
    </svg>
    <img v-else-if="hasImage" :src="imageUrl" :alt="alt || meta.label || ''" />
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

.app-icon-visual.material-liquid-prism {
  --liquid-edge-pink: rgba(255, 179, 214, 0.46);
  --liquid-edge-apricot: rgba(255, 205, 151, 0.42);
  --liquid-edge-blue: rgba(172, 203, 255, 0.48);
  --liquid-edge-lilac: rgba(205, 188, 255, 0.42);
  --liquid-glyph-color: rgba(124, 137, 158, 0.78);
  --liquid-glyph-stroke: rgba(255, 255, 255, 0.78);
  --liquid-glyph-stroke-width: 4px;
  isolation: isolate;
  color: rgba(31, 32, 39, 0.78);
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.54);
  box-shadow:
    inset 1px 1px 0 rgba(255, 255, 255, 0.84),
    inset -1px -2px 4px rgba(73, 70, 86, 0.08),
    inset 0 0 0 2px rgba(255, 255, 255, 0.06),
    0 6px 13px rgba(36, 35, 43, 0.12);
  backdrop-filter: blur(3px) saturate(1.12) contrast(1.02);
  -webkit-backdrop-filter: blur(3px) saturate(1.12) contrast(1.02);
}

.app-icon-visual.material-liquid-prism::before,
.app-icon-visual.material-liquid-prism::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}

.app-icon-visual.material-liquid-prism::before {
  inset: 5% 12% auto;
  z-index: 1;
  height: 24%;
  border-radius: 999px 999px 46% 46%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.06));
  filter: blur(0.45px);
  opacity: 0.74;
}

.app-icon-visual.material-liquid-prism::after {
  inset: 1px;
  z-index: 1;
  padding: 1.5px;
  background: conic-gradient(
    from 218deg,
    rgba(255, 255, 255, 0.78),
    var(--liquid-edge-blue) 16%,
    rgba(255, 255, 255, 0.34) 31%,
    var(--liquid-edge-pink) 48%,
    var(--liquid-edge-apricot) 62%,
    rgba(255, 255, 255, 0.5) 76%,
    var(--liquid-edge-lilac) 89%,
    rgba(255, 255, 255, 0.78)
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.72;
}

.app-icon-visual.material-liquid-prism.accent-warm {
  --liquid-edge-pink: rgba(255, 170, 204, 0.52);
  --liquid-edge-apricot: rgba(255, 194, 132, 0.5);
  --liquid-glyph-stroke: rgba(153, 113, 137, 0.58);
}

.app-icon-visual.material-liquid-prism.accent-light {
  --liquid-edge-blue: rgba(177, 210, 255, 0.56);
  --liquid-edge-lilac: rgba(213, 192, 255, 0.5);
  --liquid-glyph-stroke: rgba(109, 127, 160, 0.56);
}

.app-icon-visual.material-liquid-prism.accent-dark {
  color: rgba(26, 27, 34, 0.82);
  --liquid-glyph-stroke: rgba(102, 92, 132, 0.6);
}

.app-icon-visual.material-liquid-prism > i,
.app-icon-visual.material-liquid-prism > .liquid-prism-glyph {
  position: relative;
  z-index: 2;
  color: var(--liquid-glyph-color);
  filter:
    drop-shadow(0 1px 0 rgba(255, 255, 255, 0.82))
    drop-shadow(0 0 1px rgba(169, 183, 207, 0.14));
}

.app-icon-visual > .liquid-prism-glyph {
  width: 62%;
  height: 62%;
  display: block;
  fill: currentColor;
}

.app-icon-visual > .liquid-prism-glyph path {
  stroke: var(--liquid-glyph-stroke);
  stroke-width: var(--liquid-glyph-stroke-width);
  stroke-linejoin: round;
  stroke-linecap: round;
  paint-order: stroke fill;
}

:global(:root[data-color-mode='night'] .app-icon-visual.material-liquid-prism),
:global(.app-shell[data-color-mode='night'] .app-icon-visual.material-liquid-prism) {
  --liquid-glyph-color: rgba(248, 250, 255, 0.98);
  --liquid-glyph-stroke: rgba(20, 28, 43, 0.72);
  --liquid-glyph-stroke-width: 8px;
  color: rgba(250, 249, 252, 0.88);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.018) 58%),
    rgba(255, 255, 255, 0.025);
  border-color: rgba(255, 255, 255, 0.42);
  box-shadow:
    inset 1px 1px 0 rgba(255, 255, 255, 0.6),
    inset -1px -2px 5px rgba(0, 0, 0, 0.18),
    inset 0 0 0 2px rgba(255, 255, 255, 0.035),
    0 7px 16px rgba(0, 0, 0, 0.28);
}

:global(:root[data-color-mode='night'] .app-icon-visual.material-liquid-prism > i),
:global(:root[data-color-mode='night'] .app-icon-visual.material-liquid-prism > .liquid-prism-glyph),
:global(.app-shell[data-color-mode='night'] .app-icon-visual.material-liquid-prism > i),
:global(.app-shell[data-color-mode='night'] .app-icon-visual.material-liquid-prism > .liquid-prism-glyph) {
  filter:
    drop-shadow(0 1px 1px rgba(0, 0, 0, 0.86))
    drop-shadow(0 0 3px rgba(218, 231, 255, 0.28));
}

:global(:root[data-color-mode='night'] .app-icon-visual.material-liquid-prism.accent-dark),
:global(.app-shell[data-color-mode='night'] .app-icon-visual.material-liquid-prism.accent-dark) {
  color: rgba(250, 251, 255, 0.92);
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
