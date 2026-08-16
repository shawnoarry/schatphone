<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  tools: { type: Array, default: () => [] },
  activeTool: { type: String, default: 'summary' },
  resultText: { type: String, default: '' },
})

const emit = defineEmits(['close', 'select'])
const { t } = useI18n()
</script>

<template>
  <template v-if="open">
    <div class="book-sheet-backdrop" @click="emit('close')"></div>
    <section class="book-sheet book-tools" data-testid="book-ai-sheet" aria-live="polite">
      <div class="book-tools__handle" aria-hidden="true"></div>
      <div class="book-tools__head">
        <div>
          <p>{{ t('智能工具', 'Smart tools') }}</p>
          <h3>{{ title }}</h3>
        </div>
        <button
          type="button"
          class="book-tools__close"
          :aria-label="t('关闭', 'Close')"
          @click="emit('close')"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div class="book-tools__grid">
        <button
          v-for="tool in tools"
          :key="tool.id"
          type="button"
          :class="['book-tools__tool', { 'is-active': activeTool === tool.id }]"
          :data-testid="`book-ai-tool-${tool.id}`"
          @click="emit('select', tool.id)"
        >
          <i :class="tool.icon" aria-hidden="true"></i>
          <span>{{ tool.label }}</span>
        </button>
      </div>
      <pre class="book-tools__result" data-testid="book-ai-result">{{ resultText }}</pre>
    </section>
  </template>
</template>

<style scoped>
.book-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 74;
  background: rgba(38, 34, 27, 0.24);
}

.book-sheet {
  position: fixed;
  left: max(12px, env(safe-area-inset-left));
  right: max(12px, env(safe-area-inset-right));
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 75;
  display: grid;
  gap: 12px;
  width: min(560px, calc(100% - 24px));
  max-height: min(420px, 58%);
  margin: 0 auto;
  padding: 10px 14px 14px;
  overflow-y: auto;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-lg);
  color: var(--book-ink);
  background: var(--book-card);
  box-shadow: var(--book-shadow-deep);
}

.book-tools__handle {
  width: 42px;
  height: 5px;
  border-radius: 999px;
  justify-self: center;
  background: rgba(38, 34, 27, 0.2);
}

.book-tools__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.book-tools__head p,
.book-tools__head h3 {
  margin: 0;
}

.book-tools__head p {
  color: var(--book-ink-3);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.book-tools__head h3 {
  margin-top: 2px;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 18px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.book-tools__close {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--book-line);
  border-radius: 50%;
  color: var(--book-ink-2);
  background: var(--book-card);
  cursor: pointer;
  font: inherit;
}

.book-tools__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.book-tools__tool {
  display: grid;
  gap: 6px;
  justify-items: center;
  min-height: 62px;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-md);
  color: var(--book-ink);
  background: var(--book-paper);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.book-tools__tool.is-active {
  color: #fff;
  background: var(--book-ink);
}

.book-tools__result {
  min-height: 86px;
  max-height: 150px;
  margin: 0;
  overflow: auto;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-md);
  padding: 12px;
  color: var(--book-ink);
  background: var(--book-paper);
  white-space: pre-wrap;
  word-break: break-word;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 720px) {
  .book-tools__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .book-sheet {
    max-height: 64%;
  }
}
</style>
