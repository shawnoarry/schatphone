<template>
  <section class="daon-compose" data-testid="mail-compose" :aria-label="composeAriaLabel">
    <header class="daon-compose-toolbar">
      <button type="button" class="daon-compose-tool" :aria-label="cancelLabel" data-testid="mail-compose-cancel" @click="$emit('cancel')">
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
        <span class="daon-compose-tool__text">{{ cancelText }}</span>
      </button>
      <span class="daon-compose-toolbar__spacer"></span>
      <button
        type="button"
        class="daon-compose-tool"
        :aria-label="saveDraftLabel"
        data-testid="mail-compose-save"
        :disabled="!canSave"
        @click="$emit('save', { draftId: draft?.id || '', to: to.trim(), subject: subject.trim(), body })"
      >
        <i class="fas fa-file-arrow-down" aria-hidden="true"></i>
        <span class="daon-compose-tool__text">{{ saveDraftText }}</span>
      </button>
      <button
        type="button"
        class="daon-compose-send"
        :aria-label="sendLabel"
        data-testid="mail-compose-send"
        :disabled="!canSend"
        @click="$emit('send', { to: to.trim(), subject: subject.trim(), body })"
      >
        <i class="fas fa-paper-plane" aria-hidden="true"></i>
        <span>{{ sendText }}</span>
      </button>
    </header>

    <div class="daon-compose-scroll">
      <div class="daon-compose-form">
        <label class="daon-compose-field">
          <span class="daon-compose-field__label">{{ toLabel }}</span>
          <input
            v-model="to"
            type="text"
            class="daon-compose-field__input"
            :placeholder="toPlaceholder"
            data-testid="mail-compose-to"
            autocomplete="off"
          />
        </label>
        <label class="daon-compose-field">
          <span class="daon-compose-field__label">{{ subjectLabel }}</span>
          <input
            v-model="subject"
            type="text"
            class="daon-compose-field__input"
            :placeholder="subjectPlaceholder"
            data-testid="mail-compose-subject"
          />
        </label>
        <label class="daon-compose-field is-body">
          <span class="daon-compose-field__label sr-only">{{ bodyLabel }}</span>
          <textarea
            v-model="body"
            class="daon-compose-field__textarea"
            :placeholder="bodyPlaceholder"
            data-testid="mail-compose-body"
          ></textarea>
        </label>

        <p v-if="savedNote" class="daon-compose-note" role="status" data-testid="mail-compose-note">{{ savedNote }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  draft: { type: Object, default: null },
  savedNote: { type: String, default: '' },
  composeAriaLabel: { type: String, default: 'Compose mail' },
  cancelLabel: { type: String, default: 'Cancel' },
  cancelText: { type: String, default: '' },
  saveDraftLabel: { type: String, default: 'Save draft' },
  saveDraftText: { type: String, default: '' },
  sendLabel: { type: String, default: 'Send' },
  sendText: { type: String, default: '' },
  toLabel: { type: String, default: 'To' },
  toPlaceholder: { type: String, default: '' },
  subjectLabel: { type: String, default: 'Subject' },
  subjectPlaceholder: { type: String, default: '' },
  bodyLabel: { type: String, default: 'Body' },
  bodyPlaceholder: { type: String, default: '' },
})

defineEmits(['cancel', 'save', 'send'])

const to = ref(props.draft?.to || '')
const subject = ref(props.draft?.subject || '')
const body = ref(props.draft?.body || '')

watch(
  () => props.draft,
  (next) => {
    to.value = next?.to || ''
    subject.value = next?.subject || ''
    body.value = next?.body || ''
  },
)

const hasContent = computed(() => Boolean(to.value.trim() || subject.value.trim() || body.value.trim()))
const canSave = computed(() => hasContent.value)
const canSend = computed(() => Boolean(to.value.trim()) && hasContent.value)
</script>

<style scoped>
.daon-compose {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  background: var(--daon-panel);
}

.daon-compose-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--daon-line);
  background: var(--daon-panel);
}

.daon-compose-toolbar__spacer {
  flex: 1;
}

.daon-compose-tool {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  background: transparent;
  color: var(--daon-ink-soft);
  font: inherit;
  font-size: 13px;
  min-height: 44px;
  padding: 6px 10px;
  border-radius: var(--daon-radius-sm);
  cursor: pointer;
  transition: background-color var(--daon-motion), color var(--daon-motion);
}

.daon-compose-tool:hover:not(:disabled) {
  background: var(--daon-green-soft);
  color: var(--daon-ink);
}

.daon-compose-tool:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.daon-compose-tool__text {
  font-size: 12.5px;
}

.daon-compose-send {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: var(--daon-action-bg);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  min-height: 44px;
  padding: 8px 18px;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color var(--daon-motion);
}

.daon-compose-send:hover:not(:disabled) {
  background: var(--daon-action-hover);
}

.daon-compose-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.daon-compose-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.daon-compose-form {
  max-width: 720px;
  margin: 0 auto;
  padding: 18px clamp(14px, 3.5vw, 36px) 56px;
  display: flex;
  flex-direction: column;
}

.daon-compose-field {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--daon-line);
}

.daon-compose-field.is-body {
  grid-template-columns: minmax(0, 1fr);
  border-bottom: none;
  padding-top: 14px;
}

.daon-compose-field__label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--daon-accent-text);
}

.daon-compose-field__input {
  border: none;
  background: transparent;
  font: inherit;
  font-size: 16px;
  color: var(--daon-ink);
  padding: 6px 0;
  min-width: 0;
  outline: none;
}

.daon-compose-field__input::placeholder,
.daon-compose-field__textarea::placeholder {
  color: var(--daon-ink-faint);
}

.daon-compose-field__textarea {
  border: 1px solid var(--daon-line);
  border-radius: var(--daon-radius);
  background: var(--daon-panel-soft);
  font: inherit;
  font-size: 16px;
  line-height: 1.8;
  color: var(--daon-ink);
  padding: 14px 16px;
  min-height: 240px;
  resize: vertical;
  outline: none;
}

.daon-compose-field__input:focus-visible,
.daon-compose-field__textarea:focus-visible {
  outline: 3px solid var(--daon-focus);
  outline-offset: 1px;
}

.daon-compose-note {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--daon-accent-text);
  background: var(--daon-green-soft);
  border-radius: 999px;
  padding: 7px 14px;
  align-self: flex-start;
}

.daon-compose-tool:focus-visible,
.daon-compose-send:focus-visible {
  outline: 3px solid var(--daon-focus);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 390px) {
  .daon-compose-tool__text {
    display: none;
  }

  .daon-compose-tool:first-child .daon-compose-tool__text {
    display: inline;
  }

  .daon-compose-field {
    grid-template-columns: 3.6rem minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .daon-compose-tool,
  .daon-compose-send {
    transition: none;
  }
}
</style>
