<template>
  <article class="jari-listing" :class="[`status-${listing.sourceStatus}`, { 'is-selected': selected }]" :data-testid="`housing-listing-${listing.id}`">
    <button type="button" class="jari-listing__body" :aria-label="openLabel" @click="$emit('open', listing.id)">
      <HousingListingVisual v-bind="visualLabels" :media="listing.media" />
      <span class="jari-listing__content">
        <span class="jari-listing__topline">
          <small>{{ modeLabel }}</small>
          <span v-if="listing.sourceStatus !== 'available'" class="jari-listing__status">{{ statusLabel }}</span>
        </span>
        <strong>{{ title }}</strong>
        <span class="jari-listing__price">{{ price }}</span>
        <span class="jari-listing__facts">{{ facts }}</span>
        <span class="jari-listing__address"><i class="fas fa-location-dot" aria-hidden="true"></i>{{ address }}</span>
      </span>
    </button>
    <button
      type="button"
      class="jari-listing__save"
      :class="{ 'is-active': favorite }"
      :aria-label="favoriteLabel"
      :aria-pressed="favorite"
      :data-testid="`housing-favorite-${listing.id}`"
      @click="$emit('favorite', listing.id)"
    ><i :class="favorite ? 'fas fa-heart' : 'far fa-heart'" aria-hidden="true"></i></button>
  </article>
</template>

<script setup>
import HousingListingVisual from './HousingListingVisual.vue'

defineProps({
  listing: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  title: { type: String, required: true },
  price: { type: String, required: true },
  facts: { type: String, required: true },
  address: { type: String, required: true },
  modeLabel: { type: String, required: true },
  statusLabel: { type: String, default: '' },
  openLabel: { type: String, required: true },
  favoriteLabel: { type: String, required: true },
  visualLabels: { type: Object, required: true },
})

defineEmits(['open', 'favorite'])
</script>

<style scoped>
.jari-listing { position: relative; min-width: 0; border: 1px solid var(--jari-line); border-radius: 24px 24px 10px 24px; background: var(--jari-panel); box-shadow: 0 10px 26px color-mix(in srgb, var(--jari-shadow) 10%, transparent); transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease; }
.jari-listing:hover { transform: translateY(-2px); box-shadow: 0 16px 36px color-mix(in srgb, var(--jari-shadow) 16%, transparent); }
.jari-listing.is-selected { border-color: var(--jari-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--jari-accent) 16%, transparent); }
.jari-listing__body { width: 100%; padding: 9px; display: grid; grid-template-columns: minmax(142px, 42%) minmax(0, 1fr); gap: 15px; border: 0; color: inherit; background: transparent; text-align: left; cursor: pointer; }
.jari-listing__content { min-width: 0; padding: 9px 44px 7px 0; display: flex; flex-direction: column; }
.jari-listing__topline { display: flex; align-items: center; gap: 8px; }.jari-listing__topline small { color: var(--jari-accent-ink); font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.jari-listing__status { padding: 3px 7px; border-radius: 999px; color: var(--jari-warning-ink); background: var(--jari-warning-bg); font-size: 9px; font-weight: 850; }
.jari-listing__content > strong { margin-top: 8px; overflow-wrap: anywhere; font: 800 18px/1.25 Georgia, 'Noto Serif SC', serif; }
.jari-listing__price { margin-top: 8px; overflow-wrap: anywhere; color: var(--jari-accent-ink); font-size: 13px; font-weight: 900; line-height: 1.35; }
.jari-listing__facts { margin-top: 6px; color: var(--jari-copy); font-size: 12px; font-weight: 700; }
.jari-listing__address { margin-top: auto; padding-top: 9px; display: flex; align-items: flex-start; gap: 6px; overflow-wrap: anywhere; color: var(--jari-muted); font-size: 11px; line-height: 1.4; }.jari-listing__address i { margin-top: 2px; color: var(--jari-accent); }
.jari-listing__save { position: absolute; top: 16px; right: 16px; z-index: 2; width: 42px; height: 42px; display: grid; place-items: center; border: 1px solid var(--jari-line); border-radius: 50%; color: var(--jari-muted); background: color-mix(in srgb, var(--jari-panel) 92%, transparent); cursor: pointer; }.jari-listing__save.is-active { color: #fff; border-color: var(--jari-accent); background: var(--jari-action); }
button:focus-visible { outline: 3px solid var(--jari-focus); outline-offset: 2px; }
@media (max-width: 560px) {
  .jari-listing__body { grid-template-columns: 118px minmax(0, 1fr); gap: 11px; }.jari-listing__content { padding-right: 35px; }.jari-listing__content > strong { font-size: 15px; }.jari-listing__price { font-size: 11px; }.jari-listing__address { display: none; }.jari-listing__save { top: 13px; right: 13px; width: 38px; height: 38px; }
  :deep(.jari-visual) { min-height: 126px; border-radius: 18px 18px 7px 18px; }
}
@media (prefers-reduced-motion: reduce) { .jari-listing { transition: none; }.jari-listing:hover { transform: none; } }
</style>
