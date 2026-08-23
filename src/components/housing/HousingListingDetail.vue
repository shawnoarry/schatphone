<template>
  <section class="jari-detail" data-testid="housing-listing-detail" :aria-labelledby="titleId">
    <header class="jari-detail__header">
      <button type="button" class="jari-detail__back" :aria-label="backLabel" data-testid="housing-detail-back" @click="$emit('back')"><i class="fas fa-arrow-left" aria-hidden="true"></i><span>{{ backText }}</span></button>
      <button type="button" class="jari-detail__heart" :class="{ 'is-active': favorite }" :aria-label="favoriteLabel" :aria-pressed="favorite" data-testid="housing-detail-favorite" @click="$emit('favorite', listing.id)"><i :class="favorite ? 'fas fa-heart' : 'far fa-heart'" aria-hidden="true"></i></button>
    </header>

    <div class="jari-detail__scroll">
      <HousingListingVisual v-bind="visualLabels" :media="listing.media" />
      <div v-if="listing.sourceStatus !== 'available'" class="jari-detail__source" :class="`is-${listing.sourceStatus}`" role="status" data-testid="housing-source-state">
        <i :class="listing.sourceStatus === 'withdrawn' ? 'fas fa-house-circle-xmark' : 'fas fa-link-slash'" aria-hidden="true"></i>
        <span><strong>{{ sourceTitle }}</strong><small>{{ sourceDescription }}</small></span>
      </div>

      <div class="jari-detail__intro">
        <span>{{ modeLabel }} · {{ areaName }}</span>
        <h1 :id="titleId">{{ title }}</h1>
        <strong>{{ price }}</strong>
        <p>{{ summary }}</p>
      </div>

      <dl class="jari-detail__facts">
        <div><dt>{{ areaLabel }}</dt><dd>{{ listing.areaSqm }} m²</dd></div>
        <div><dt>{{ roomsLabel }}</dt><dd>{{ roomValue }}</dd></div>
        <div><dt>{{ floorLabel }}</dt><dd>{{ floor }}</dd></div>
        <div><dt>{{ orientationLabel }}</dt><dd>{{ orientation }}</dd></div>
      </dl>

      <section class="jari-detail__section">
        <h2>{{ costsTitle }}</h2>
        <dl class="jari-detail__costs">
          <div v-if="listing.mode === 'rent'"><dt>{{ depositLabel }}</dt><dd>{{ deposit }}</dd></div>
          <div v-if="listing.mode === 'rent'"><dt>{{ monthlyLabel }}</dt><dd>{{ monthly }}</dd></div>
          <div v-else><dt>{{ purchaseLabel }}</dt><dd>{{ purchase }}</dd></div>
          <div><dt>{{ maintenanceLabel }}</dt><dd>{{ maintenance }}</dd></div>
          <div><dt>{{ availableLabel }}</dt><dd>{{ availableFrom }}</dd></div>
        </dl>
      </section>

      <section class="jari-detail__section">
        <h2>{{ lifeTitle }}</h2>
        <p class="jari-detail__commute"><i class="fas fa-train-subway" aria-hidden="true"></i>{{ commute }}</p>
        <div class="jari-detail__amenities">
          <span v-for="amenity in amenities" :key="amenity.id"><i class="fas" :class="amenity.icon" aria-hidden="true"></i>{{ amenity.label }}</span>
        </div>
      </section>

      <section class="jari-detail__section is-location">
        <div><small>{{ mapEyebrow }}</small><h2>{{ areaName }}</h2><p>{{ address }}</p></div>
        <button type="button" data-testid="housing-open-map" @click="$emit('map', listing.areaRef)"><i class="fas fa-map" aria-hidden="true"></i>{{ mapLabel }}</button>
      </section>

      <div class="jari-detail__boundary"><i class="fas fa-circle-info" aria-hidden="true"></i>{{ areaReferenceNote }}</div>
    </div>

    <footer>
      <span v-if="viewingDraft"><i class="fas fa-pencil" aria-hidden="true"></i><strong>{{ draftStatusLabel }}</strong><small>{{ draftSlotLabel }}</small></span>
      <button type="button" data-testid="housing-viewing-open" :disabled="listing.sourceStatus !== 'available'" @click="$emit('viewing', listing.id)">{{ viewingButtonLabel }}</button>
    </footer>
  </section>
</template>

<script setup>
import HousingListingVisual from './HousingListingVisual.vue'

defineProps({
  listing: { type: Object, required: true },
  favorite: { type: Boolean, default: false },
  viewingDraft: { type: Object, default: null },
  title: { type: String, required: true },
  price: { type: String, required: true },
  summary: { type: String, required: true },
  address: { type: String, required: true },
  areaName: { type: String, required: true },
  modeLabel: { type: String, required: true },
  sourceTitle: { type: String, default: '' },
  sourceDescription: { type: String, default: '' },
  backLabel: { type: String, required: true }, backText: { type: String, required: true },
  favoriteLabel: { type: String, required: true },
  areaLabel: { type: String, required: true }, roomsLabel: { type: String, required: true }, floorLabel: { type: String, required: true }, orientationLabel: { type: String, required: true },
  roomValue: { type: String, required: true }, floor: { type: String, required: true }, orientation: { type: String, required: true },
  costsTitle: { type: String, required: true }, depositLabel: { type: String, required: true }, monthlyLabel: { type: String, required: true }, purchaseLabel: { type: String, required: true }, maintenanceLabel: { type: String, required: true }, availableLabel: { type: String, required: true },
  deposit: { type: String, default: '' }, monthly: { type: String, default: '' }, purchase: { type: String, default: '' }, maintenance: { type: String, required: true }, availableFrom: { type: String, required: true },
  lifeTitle: { type: String, required: true }, commute: { type: String, required: true }, amenities: { type: Array, required: true },
  mapEyebrow: { type: String, required: true }, mapLabel: { type: String, required: true }, areaReferenceNote: { type: String, required: true },
  draftStatusLabel: { type: String, default: '' }, draftSlotLabel: { type: String, default: '' }, viewingButtonLabel: { type: String, required: true },
  visualLabels: { type: Object, required: true },
})

defineEmits(['back', 'favorite', 'map', 'viewing'])
const titleId = 'housing-detail-title'
</script>

<style scoped>
.jari-detail { width: 100%; height: 100%; min-width: 0; min-height: 0; display: flex; flex-direction: column; color: var(--jari-ink); background: var(--jari-panel); }
.jari-detail__header { min-height: 64px; padding: 9px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--jari-line); }.jari-detail__header button { min-height: 44px; border: 0; color: inherit; background: transparent; cursor: pointer; }.jari-detail__back { padding: 0 9px; display: inline-flex; align-items: center; gap: 8px; border-radius: 13px !important; font-weight: 800; }.jari-detail__heart { width: 44px; display: grid; place-items: center; border: 1px solid var(--jari-line) !important; border-radius: 50%; color: var(--jari-muted) !important; }.jari-detail__heart.is-active { color: #fff !important; border-color: var(--jari-action) !important; background: var(--jari-action); }
.jari-detail__scroll { flex: 1; min-height: 0; padding: 0 24px 30px; overflow-y: auto; }.jari-detail__scroll > :deep(.jari-visual) { min-height: 260px; margin: 16px 0 0; border-radius: 28px 28px 10px 28px; }
.jari-detail__source { margin-top: 14px; padding: 13px; display: grid; grid-template-columns: 39px minmax(0,1fr); align-items: center; gap: 10px; border-radius: 16px; color: var(--jari-warning-ink); background: var(--jari-warning-bg); }.jari-detail__source > i { width: 39px; height: 39px; display: grid; place-items: center; border-radius: 12px; background: color-mix(in srgb, var(--jari-warning-ink) 11%, transparent); }.jari-detail__source strong, .jari-detail__source small { display: block; }.jari-detail__source small { margin-top: 3px; line-height: 1.4; }
.jari-detail__intro { padding: 24px 2px 20px; }.jari-detail__intro > span { color: var(--jari-accent-ink); font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }.jari-detail__intro h1 { margin: 8px 0 10px; overflow-wrap: anywhere; font: 850 clamp(28px, 3vw, 40px)/1.08 Georgia, 'Noto Serif SC', serif; letter-spacing: -.025em; }.jari-detail__intro > strong { display: block; overflow-wrap: anywhere; color: var(--jari-accent-ink); font-size: 17px; line-height: 1.4; }.jari-detail__intro p { margin: 14px 0 0; color: var(--jari-copy); line-height: 1.7; }
.jari-detail__facts { margin: 0; display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); border: 1px solid var(--jari-line); border-radius: 18px; overflow: hidden; }.jari-detail__facts div { min-width: 0; padding: 13px 10px; border-right: 1px solid var(--jari-line); }.jari-detail__facts div:last-child { border: 0; }.jari-detail dt { color: var(--jari-muted); font-size: 10px; font-weight: 750; }.jari-detail dd { margin: 5px 0 0; overflow-wrap: anywhere; font-weight: 850; }
.jari-detail__section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--jari-line); }.jari-detail__section h2 { margin: 0 0 13px; font: 800 18px/1.2 Georgia, 'Noto Serif SC', serif; }.jari-detail__costs { margin: 0; display: grid; gap: 9px; }.jari-detail__costs div { min-width: 0; display: flex; justify-content: space-between; gap: 18px; }.jari-detail__costs dd { max-width: 65%; text-align: right; }
.jari-detail__commute { margin: 0; display: flex; gap: 9px; color: var(--jari-copy); }.jari-detail__commute i { color: var(--jari-accent); }.jari-detail__amenities { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 7px; }.jari-detail__amenities span { padding: 8px 10px; display: inline-flex; align-items: center; gap: 7px; border-radius: 11px; color: var(--jari-copy); background: var(--jari-soft); font-size: 11px; font-weight: 750; }.jari-detail__amenities i { color: var(--jari-accent-ink); }
.jari-detail__section.is-location { padding: 18px; display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 16px; border: 1px solid var(--jari-line); border-radius: 18px 18px 7px 18px; background: var(--jari-soft); }.jari-detail__section.is-location small { color: var(--jari-accent-ink); font-size: 9px; font-weight: 900; letter-spacing: .12em; }.jari-detail__section.is-location h2 { margin: 5px 0 4px; }.jari-detail__section.is-location p { margin: 0; overflow-wrap: anywhere; color: var(--jari-muted); font-size: 11px; line-height: 1.45; }.jari-detail__section.is-location button { min-height: 44px; padding: 0 13px; display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--jari-accent); border-radius: 13px; color: var(--jari-accent-ink); background: var(--jari-panel); font-weight: 850; cursor: pointer; }
.jari-detail__boundary { margin-top: 13px; display: flex; align-items: flex-start; gap: 8px; color: var(--jari-muted); font-size: 10px; line-height: 1.5; }.jari-detail__boundary i { margin-top: 2px; }
.jari-detail footer { min-height: 78px; padding: 12px 20px calc(12px + env(safe-area-inset-bottom)); display: flex; align-items: center; justify-content: flex-end; gap: 14px; border-top: 1px solid var(--jari-line); background: color-mix(in srgb, var(--jari-panel) 94%, transparent); }.jari-detail footer > span { min-width: 0; margin-right: auto; display: grid; grid-template-columns: auto minmax(0,1fr); column-gap: 7px; }.jari-detail footer > span i { grid-row: 1 / 3; color: var(--jari-accent-ink); }.jari-detail footer strong, .jari-detail footer small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.jari-detail footer small { color: var(--jari-muted); }.jari-detail footer > button { min-height: 48px; padding: 0 18px; border: 0; border-radius: 15px; color: #fff; background: var(--jari-action); font-weight: 850; cursor: pointer; }.jari-detail footer > button:disabled { color: var(--jari-muted); background: var(--jari-soft); cursor: not-allowed; }
button:focus-visible { outline: 3px solid var(--jari-focus); outline-offset: 2px; }
@media (max-width: 560px) { .jari-detail__scroll { padding-inline: 16px; }.jari-detail__scroll > :deep(.jari-visual) { min-height: 220px; }.jari-detail__facts { grid-template-columns: repeat(2,minmax(0,1fr)); }.jari-detail__facts div:nth-child(2) { border-right: 0; }.jari-detail__facts div:nth-child(-n+2) { border-bottom: 1px solid var(--jari-line); }.jari-detail__section.is-location { grid-template-columns: 1fr; }.jari-detail__section.is-location button { width: 100%; justify-content: center; }.jari-detail footer > span { max-width: 52%; }.jari-detail footer > button { padding-inline: 14px; } }
</style>
