<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  options: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'select'])
const { t } = useI18n()
</script>

<template>
  <template v-if="open">
    <div class="book-sheet-backdrop" @click="emit('close')"></div>
    <section
      class="book-sheet book-export"
      data-testid="book-export-sheet"
      role="dialog"
      aria-modal="true"
      :aria-label="t('导出文稿', 'Export manuscript')"
    >
      <div class="book-sheet__head">
        <div>
          <p>{{ t('导出文稿', 'Export manuscript') }}</p>
          <h3>{{ title }}</h3>
        </div>
        <button
          type="button"
          class="book-sheet__close"
          :aria-label="t('关闭', 'Close')"
          data-testid="book-export-close"
          @click="emit('close')"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <p class="book-export__intro">
        {{ t('选择这一次需要的文件；不会改变 Book 文稿或 WorldBook 启用状态。', 'Choose the file you need. Exporting never changes Book text or WorldBook activation.') }}
      </p>
      <div class="book-export__options">
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          :data-testid="`book-export-format-${option.id}`"
          @click="emit('select', option.id)"
        >
          <span class="book-export__icon" aria-hidden="true">
            <i :class="option.icon"></i>
          </span>
          <span class="book-export__copy">
            <strong>{{ option.title }}</strong>
            <small>{{ option.detail }}</small>
          </span>
          <em>{{ option.extension }}</em>
        </button>
      </div>
    </section>
  </template>
</template>

<style scoped>
.book-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 76;
  background: rgba(38, 34, 27, 0.28);
  backdrop-filter: blur(10px);
}

.book-sheet {
  position: fixed;
  left: max(18px, env(safe-area-inset-left));
  right: max(18px, env(safe-area-inset-right));
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 77;
  display: grid;
  gap: 12px;
  width: min(620px, calc(100% - 36px));
  max-height: min(680px, calc(100dvh - 36px));
  margin: 0 auto;
  padding: 16px;
  overflow-y: auto;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-lg);
  color: var(--book-ink);
  background: var(--book-card);
  box-shadow: var(--book-shadow-deep);
}

.book-sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.book-sheet__head > div {
  min-width: 0;
}

.book-sheet__head p,
.book-sheet__head h3 {
  margin: 0;
}

.book-sheet__head p {
  color: var(--book-ink-3);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.book-sheet__head h3 {
  margin-top: 3px;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 19px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.book-sheet__close {
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

.book-export__intro {
  margin: 0;
  color: var(--book-ink-2);
  font-size: 12px;
  line-height: 1.55;
}

.book-export__options {
  display: grid;
  gap: 8px;
}

.book-export__options > button {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 74px;
  padding: 11px;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-md);
  color: var(--book-ink);
  background: var(--book-paper);
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.book-export__options > button:focus-visible {
  outline: 2px solid var(--book-ink);
  outline-offset: 2px;
}

.book-export__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--book-radius-sm);
  color: var(--book-ink);
  background: var(--book-accent-soft);
}

.book-export__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.book-export__copy strong {
  font-size: 13px;
  font-weight: 850;
}

.book-export__copy small {
  color: var(--book-ink-2);
  font-size: 11px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.book-export__options em {
  color: var(--book-ink-3);
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
}

@media (max-width: 720px) {
  .book-sheet {
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-height: calc(100dvh - 62px - env(safe-area-inset-top));
    padding: 16px 14px calc(16px + env(safe-area-inset-bottom));
    border-radius: var(--book-radius-lg) var(--book-radius-lg) 0 0;
  }

  .book-export__options > button {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .book-export__options em {
    grid-column: 2;
  }
}
</style>
