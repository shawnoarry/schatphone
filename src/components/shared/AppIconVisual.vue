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
    :style="hasImage || materialClass ? undefined : accentStyle"
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

.app-icon-visual.material-sticker-pop {
  --sticker-fill: #f6d36f;
  --sticker-ink: #2f302d;
  display: grid;
  place-items: center;
  isolation: isolate;
  color: var(--sticker-ink);
  background: var(--sticker-fill);
  border: 3px solid var(--sticker-ink);
  box-shadow: 0 4px 0 var(--sticker-ink);
}

.app-icon-visual.material-sticker-pop.accent-warm {
  --sticker-fill: #ef888d;
}

.app-icon-visual.material-sticker-pop.accent-light {
  --sticker-fill: #8db4df;
}

.app-icon-visual.material-sticker-pop.accent-default {
  --sticker-fill: #72bd88;
}

.app-icon-visual.material-sticker-pop.accent-dark {
  --sticker-fill: #b9a0d8;
}

.app-icon-visual.material-sticker-pop > i {
  position: relative;
  z-index: 1;
  color: var(--sticker-ink);
  filter: none;
  transform: scale(0.94);
}

:global(:root[data-color-mode='night'] .app-icon-visual.material-sticker-pop),
:global(.app-shell[data-color-mode='night'] .app-icon-visual.material-sticker-pop) {
  --sticker-ink: #f8efe3;
  border-color: var(--sticker-ink);
  box-shadow: 0 4px 0 rgba(18, 18, 20, 0.92);
}

:global(:root[data-color-mode='night'] .app-icon-visual.material-sticker-pop > i),
:global(.app-shell[data-color-mode='night'] .app-icon-visual.material-sticker-pop > i) {
  color: #29292c;
}

.app-icon-visual.material-liquid-prism {
  --liquid-edge-primary: rgba(171, 205, 255, 0.72);
  --liquid-edge-secondary: rgba(224, 188, 235, 0.58);
  --liquid-edge-warm: rgba(255, 213, 174, 0.44);
  --liquid-glass-tint: rgba(208, 224, 244, 0.08);
  --liquid-shadow-tint: rgba(105, 128, 168, 0.18);
  --liquid-glyph-color: rgba(29, 34, 45, 0.9);
  isolation: isolate;
  color: var(--liquid-glyph-color);
  background:
    radial-gradient(circle at 28% 12%, rgba(255, 255, 255, 0.9), transparent 27%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.035) 58%),
    var(--liquid-glass-tint);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    inset 1px 1px 0 rgba(255, 255, 255, 0.96),
    inset -1px -2px 5px rgba(92, 100, 122, 0.07),
    inset 0 -7px 12px color-mix(in srgb, var(--liquid-edge-primary) 16%, transparent),
    0 9px 17px var(--liquid-shadow-tint),
    0 2px 4px rgba(44, 48, 62, 0.08);
  backdrop-filter: blur(7px) saturate(1.16) contrast(1.01);
  -webkit-backdrop-filter: blur(7px) saturate(1.16) contrast(1.01);
}

.app-icon-visual.material-liquid-prism::before,
.app-icon-visual.material-liquid-prism::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}

.app-icon-visual.material-liquid-prism::before {
  inset: 4% 11% auto;
  z-index: 1;
  height: 28%;
  border-radius: 999px 999px 46% 46%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.08));
  filter: blur(0.35px);
  opacity: 0.84;
}

.app-icon-visual.material-liquid-prism::after {
  inset: 0;
  z-index: 1;
  padding: 2px;
  background: conic-gradient(
    from 204deg,
    rgba(255, 255, 255, 0.92),
    var(--liquid-edge-primary) 19%,
    rgba(255, 255, 255, 0.46) 37%,
    var(--liquid-edge-secondary) 56%,
    var(--liquid-edge-warm) 72%,
    rgba(255, 255, 255, 0.74) 88%,
    rgba(255, 255, 255, 0.92)
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.9;
}

.app-icon-visual.material-liquid-prism.accent-warm {
  --liquid-edge-primary: rgba(249, 174, 207, 0.76);
  --liquid-edge-secondary: rgba(255, 207, 164, 0.66);
  --liquid-glass-tint: rgba(255, 216, 224, 0.1);
  --liquid-shadow-tint: rgba(224, 139, 174, 0.2);
}

.app-icon-visual.material-liquid-prism.accent-light {
  --liquid-edge-primary: rgba(157, 208, 244, 0.78);
  --liquid-edge-secondary: rgba(183, 226, 215, 0.64);
  --liquid-glass-tint: rgba(203, 232, 241, 0.1);
  --liquid-shadow-tint: rgba(105, 166, 196, 0.19);
}

.app-icon-visual.material-liquid-prism.accent-dark {
  --liquid-edge-primary: rgba(190, 180, 242, 0.76);
  --liquid-edge-secondary: rgba(230, 183, 222, 0.6);
  --liquid-glass-tint: rgba(218, 208, 240, 0.09);
  --liquid-shadow-tint: rgba(126, 106, 166, 0.2);
}

.app-icon-visual.material-liquid-prism > i,
.app-icon-visual.material-liquid-prism > .liquid-prism-glyph {
  position: relative;
  z-index: 2;
  color: var(--liquid-glyph-color);
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.5));
}

.app-icon-visual > .liquid-prism-glyph {
  width: 56%;
  height: 56%;
  display: block;
  fill: currentColor;
}

.app-icon-visual > .liquid-prism-glyph path {
  fill: currentColor;
  stroke: none;
  stroke-linejoin: round;
  stroke-linecap: round;
  paint-order: normal;
}

:global(:root[data-color-mode='night'] .app-icon-visual.material-liquid-prism),
:global(.app-shell[data-color-mode='night'] .app-icon-visual.material-liquid-prism) {
  --liquid-glyph-color: rgba(242, 245, 252, 0.94);
  --liquid-glass-tint: rgba(255, 255, 255, 0.035);
  --liquid-shadow-tint: rgba(0, 0, 0, 0.28);
  color: var(--liquid-glyph-color);
  background:
    radial-gradient(circle at 28% 12%, rgba(255, 255, 255, 0.28), transparent 29%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.018) 58%),
    var(--liquid-glass-tint);
  border-color: rgba(255, 255, 255, 0.38);
  box-shadow:
    inset 1px 1px 0 rgba(255, 255, 255, 0.52),
    inset -1px -2px 6px rgba(0, 0, 0, 0.2),
    inset 0 -7px 12px color-mix(in srgb, var(--liquid-edge-primary) 12%, transparent),
    0 9px 18px var(--liquid-shadow-tint);
}

:global(:root[data-color-mode='night'] .app-icon-visual.material-liquid-prism > i),
:global(:root[data-color-mode='night'] .app-icon-visual.material-liquid-prism > .liquid-prism-glyph),
:global(.app-shell[data-color-mode='night'] .app-icon-visual.material-liquid-prism > i),
:global(.app-shell[data-color-mode='night'] .app-icon-visual.material-liquid-prism > .liquid-prism-glyph) {
  filter:
    drop-shadow(0 1px 1px rgba(0, 0, 0, 0.72))
    drop-shadow(0 0 2px rgba(218, 231, 255, 0.16));
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
