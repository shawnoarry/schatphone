<template>
  <div class="jari-overlay" data-testid="housing-viewing-sheet" @click.self="$emit('close')">
    <section class="jari-viewing" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <header>
        <div><small>{{ eyebrow }}</small><h2 :id="titleId">{{ title }}</h2><p>{{ listingTitle }}</p></div>
        <button type="button" :aria-label="closeLabel" data-testid="housing-viewing-close" @click="$emit('close')"><i class="fas fa-xmark" aria-hidden="true"></i></button>
      </header>
      <div class="jari-viewing__body">
        <div class="jari-viewing__notice"><i class="fas fa-pencil" aria-hidden="true"></i><span><strong>{{ draftOnlyLabel }}</strong><small>{{ draftOnlyHint }}</small></span></div>
        <fieldset>
          <legend>{{ slotLabel }}</legend>
          <label v-for="slot in slots" :key="slot.id" class="jari-viewing__slot" :class="{ 'is-active': form.slotId === slot.id }">
            <input v-model="form.slotId" type="radio" name="viewing-slot" :value="slot.id" />
            <span><strong>{{ slot.date }}</strong><small>{{ slot.time }}</small></span>
            <i v-if="form.slotId === slot.id" class="fas fa-check" aria-hidden="true"></i>
          </label>
        </fieldset>
        <label class="jari-viewing__note"><span>{{ noteLabel }}</span><textarea v-model="form.note" rows="4" maxlength="600" :placeholder="notePlaceholder" data-testid="housing-viewing-note"></textarea><small>{{ form.note.length }} / 600</small></label>
      </div>
      <footer>
        <button v-if="existingDraft && existingDraft.status !== 'cancelled'" type="button" class="jari-viewing__cancel" data-testid="housing-viewing-cancel" @click="$emit('cancel')">{{ cancelLabel }}</button>
        <button type="button" class="jari-viewing__save" data-testid="housing-viewing-save" :disabled="!form.slotId" @click="$emit('save', { slotId: form.slotId, note: form.note })">{{ saveLabel }}</button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  listingTitle: { type: String, required: true },
  existingDraft: { type: Object, default: null },
  slots: { type: Array, required: true },
  eyebrow: { type: String, required: true },
  title: { type: String, required: true },
  closeLabel: { type: String, required: true },
  draftOnlyLabel: { type: String, required: true },
  draftOnlyHint: { type: String, required: true },
  slotLabel: { type: String, required: true },
  noteLabel: { type: String, required: true },
  notePlaceholder: { type: String, required: true },
  cancelLabel: { type: String, required: true },
  saveLabel: { type: String, required: true },
})

defineEmits(['close', 'save', 'cancel'])
const titleId = 'housing-viewing-title'
const form = reactive({ slotId: '', note: '' })
watch(() => props.existingDraft, (draft) => {
  form.slotId = draft?.slotId || props.slots[0]?.id || ''
  form.note = draft?.note || ''
}, { immediate: true })
</script>

<style scoped>
.jari-overlay { position: fixed; inset: 0; z-index: 70; display: flex; align-items: flex-end; justify-content: center; padding: 22px; background: rgba(20, 25, 23, .42); backdrop-filter: blur(6px); }
.jari-viewing { width: min(620px, 100%); max-height: min(760px, calc(100% - 12px)); display: flex; flex-direction: column; overflow: hidden; color: var(--jari-ink); background: var(--jari-panel); border-radius: 30px 30px 12px 30px; box-shadow: 0 26px 90px rgba(9, 15, 13, .28); }
.jari-viewing header { padding: 23px 24px 17px; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; border-bottom: 1px solid var(--jari-line); }.jari-viewing header small { color: var(--jari-accent-ink); font-size: 10px; font-weight: 900; letter-spacing: .13em; }.jari-viewing h2 { margin: 5px 0 0; font: 850 27px/1.1 Georgia, 'Noto Serif SC', serif; }.jari-viewing header p { margin: 5px 0 0; color: var(--jari-muted); font-size: 12px; }.jari-viewing header button { flex: none; width: 44px; height: 44px; border: 1px solid var(--jari-line); border-radius: 50%; color: inherit; background: var(--jari-soft); cursor: pointer; }
.jari-viewing__body { min-height: 0; padding: 20px 24px; overflow-y: auto; }.jari-viewing__notice { margin-bottom: 20px; padding: 13px; display: grid; grid-template-columns: 38px minmax(0,1fr); gap: 10px; align-items: center; border-radius: 17px; color: var(--jari-notice-ink); background: var(--jari-notice-bg); }.jari-viewing__notice > i { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 12px; background: color-mix(in srgb, var(--jari-notice-ink) 11%, transparent); }.jari-viewing__notice strong, .jari-viewing__notice small { display: block; }.jari-viewing__notice small { margin-top: 2px; font-size: 11px; line-height: 1.35; }
.jari-viewing fieldset { margin: 0; padding: 0; border: 0; }.jari-viewing legend, .jari-viewing__note > span { margin-bottom: 10px; color: var(--jari-copy); font-size: 12px; font-weight: 850; }
.jari-viewing__slot { min-height: 58px; margin-bottom: 8px; padding: 8px 13px; display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 11px; border: 1px solid var(--jari-line); border-radius: 16px; background: var(--jari-ground); cursor: pointer; }.jari-viewing__slot.is-active { border-color: var(--jari-accent); background: var(--jari-accent-soft); }.jari-viewing__slot input { width: 19px; height: 19px; accent-color: var(--jari-action); }.jari-viewing__slot strong, .jari-viewing__slot small { display: block; }.jari-viewing__slot small { margin-top: 2px; color: var(--jari-muted); }.jari-viewing__slot > i { color: var(--jari-accent-ink); }
.jari-viewing__note { margin-top: 20px; display: grid; }.jari-viewing__note textarea { min-width: 0; resize: vertical; padding: 13px; border: 1px solid var(--jari-line); border-radius: 15px; color: var(--jari-ink); background: var(--jari-ground); font: inherit; line-height: 1.5; }.jari-viewing__note > small { margin-top: 5px; color: var(--jari-muted); text-align: right; }
.jari-viewing footer { padding: 15px 24px calc(15px + env(safe-area-inset-bottom)); display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--jari-line); }.jari-viewing footer button { min-height: 48px; padding: 0 20px; border-radius: 15px; font-weight: 850; cursor: pointer; }.jari-viewing__cancel { border: 1px solid var(--jari-danger); color: var(--jari-danger); background: transparent; }.jari-viewing__save { border: 0; color: #fff; background: var(--jari-action); }.jari-viewing__save:disabled { opacity: .45; cursor: not-allowed; }
button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid var(--jari-focus); outline-offset: 2px; }
@media (max-width: 620px) { .jari-overlay { padding: 0; }.jari-viewing { width: 100%; max-height: calc(100% - 28px); border-radius: 28px 28px 0 0; }.jari-viewing header { padding-top: 19px; }.jari-viewing footer { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); }.jari-viewing footer button:only-child { grid-column: 1 / -1; } }
</style>
