<template>
  <div class="jari-overlay" data-testid="housing-filter-sheet" @click.self="$emit('close')">
    <section class="jari-filter" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <header>
        <div><small>{{ eyebrow }}</small><h2 :id="titleId">{{ title }}</h2></div>
        <button type="button" :aria-label="closeLabel" data-testid="housing-filter-close" @click="$emit('close')"><i class="fas fa-xmark" aria-hidden="true"></i></button>
      </header>

      <div class="jari-filter__body">
        <fieldset>
          <legend>{{ areaLabel }}</legend>
          <div class="jari-filter__chips">
            <button v-for="option in areaOptions" :key="option.value" type="button" :class="{ 'is-active': draft.area === option.value }" :aria-pressed="draft.area === option.value" @click="draft.area = option.value">{{ option.label }}</button>
          </div>
        </fieldset>
        <fieldset>
          <legend>{{ roomsLabel }}</legend>
          <div class="jari-filter__chips">
            <button v-for="option in roomOptions" :key="option.value" type="button" :class="{ 'is-active': draft.rooms === option.value }" :aria-pressed="draft.rooms === option.value" @click="draft.rooms = option.value">{{ option.label }}</button>
          </div>
        </fieldset>
        <fieldset>
          <legend>{{ priceLabel }}</legend>
          <div class="jari-filter__chips is-column">
            <button v-for="option in priceOptions" :key="option.value" type="button" :class="{ 'is-active': draft.price === option.value }" :aria-pressed="draft.price === option.value" @click="draft.price = option.value"><span>{{ option.label }}</span><i v-if="draft.price === option.value" class="fas fa-check" aria-hidden="true"></i></button>
          </div>
        </fieldset>
        <label class="jari-filter__check"><input v-model="draft.availableOnly" type="checkbox" /><span><strong>{{ availableLabel }}</strong><small>{{ availableHint }}</small></span></label>
      </div>

      <footer>
        <button type="button" class="jari-filter__reset" data-testid="housing-filter-reset" @click="reset">{{ resetLabel }}</button>
        <button type="button" class="jari-filter__apply" data-testid="housing-filter-apply" @click="$emit('apply', { ...draft })">{{ applyLabel }}</button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  value: { type: Object, required: true },
  eyebrow: { type: String, required: true },
  title: { type: String, required: true },
  closeLabel: { type: String, required: true },
  areaLabel: { type: String, required: true },
  roomsLabel: { type: String, required: true },
  priceLabel: { type: String, required: true },
  availableLabel: { type: String, required: true },
  availableHint: { type: String, required: true },
  resetLabel: { type: String, required: true },
  applyLabel: { type: String, required: true },
  areaOptions: { type: Array, required: true },
  roomOptions: { type: Array, required: true },
  priceOptions: { type: Array, required: true },
})

defineEmits(['close', 'apply'])
const titleId = 'housing-filter-title'
const draft = reactive({ area: 'all', rooms: 'all', price: 'all', availableOnly: false })

watch(() => props.value, (value) => Object.assign(draft, value), { immediate: true, deep: true })
const reset = () => Object.assign(draft, { area: 'all', rooms: 'all', price: 'all', availableOnly: false })
</script>

<style scoped>
.jari-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: stretch; justify-content: flex-end; background: rgba(20, 25, 23, .38); backdrop-filter: blur(5px); }
.jari-filter { width: min(420px, 100%); min-width: 0; display: flex; flex-direction: column; color: var(--jari-ink); background: var(--jari-panel); box-shadow: -24px 0 70px rgba(10, 18, 15, .22); }
.jari-filter header { padding: calc(34px + env(safe-area-inset-top)) 24px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--jari-line); }
:global(.app-shell[data-statusbar='off']) .jari-filter header { padding-top: calc(14px + env(safe-area-inset-top)); }
.jari-filter header small { color: var(--jari-accent-ink); font-size: 10px; font-weight: 900; letter-spacing: .13em; }.jari-filter h2 { margin: 4px 0 0; font: 850 27px/1.1 Georgia, 'Noto Serif SC', serif; }
.jari-filter header button { width: 44px; height: 44px; border: 1px solid var(--jari-line); border-radius: 50%; color: inherit; background: var(--jari-soft); cursor: pointer; }
.jari-filter__body { flex: 1; min-height: 0; padding: 23px 24px; overflow-y: auto; }.jari-filter fieldset { margin: 0 0 24px; padding: 0; border: 0; }.jari-filter legend { margin-bottom: 11px; color: var(--jari-copy); font-size: 12px; font-weight: 850; }
.jari-filter__chips { display: flex; flex-wrap: wrap; gap: 8px; }.jari-filter__chips button { min-height: 42px; padding: 0 13px; border: 1px solid var(--jari-line); border-radius: 14px; color: var(--jari-copy); background: var(--jari-ground); font-weight: 750; cursor: pointer; }.jari-filter__chips button.is-active { color: #fff; border-color: var(--jari-action); background: var(--jari-action); }
.jari-filter__chips.is-column { display: grid; }.jari-filter__chips.is-column button { display: flex; align-items: center; justify-content: space-between; text-align: left; }
.jari-filter__check { min-height: 58px; padding: 11px 13px; display: grid; grid-template-columns: auto minmax(0,1fr); align-items: center; gap: 11px; border: 1px solid var(--jari-line); border-radius: 16px; background: var(--jari-soft); cursor: pointer; }.jari-filter__check input { width: 20px; height: 20px; accent-color: var(--jari-action); }.jari-filter__check strong, .jari-filter__check small { display: block; }.jari-filter__check small { margin-top: 2px; color: var(--jari-muted); font-size: 11px; line-height: 1.35; }
.jari-filter footer { padding: 16px 24px calc(16px + env(safe-area-inset-bottom)); display: grid; grid-template-columns: 1fr 1.6fr; gap: 10px; border-top: 1px solid var(--jari-line); }.jari-filter footer button { min-height: 48px; border-radius: 15px; font-weight: 850; cursor: pointer; }.jari-filter__reset { border: 1px solid var(--jari-line); color: var(--jari-copy); background: var(--jari-ground); }.jari-filter__apply { border: 0; color: #fff; background: var(--jari-action); }
button:focus-visible, input:focus-visible { outline: 3px solid var(--jari-focus); outline-offset: 2px; }
</style>
