<script setup>
import { useI18n } from '../../composables/useI18n'
import { BOOK_TEXT_ASSET_TYPES } from '../../lib/book-text-schema'
import { getBookTextCategoryLabel } from '../../lib/world-taxonomy'

defineProps({
  open: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const draft = defineModel({ type: Object, required: true })

const emit = defineEmits(['save', 'cancel'])
const { t } = useI18n()

const categoryLabel = (type) => {
  const label = getBookTextCategoryLabel(type)
  return t(label.zh, label.en)
}
</script>

<template>
  <template v-if="open">
    <div class="book-sheet-backdrop" @click="emit('cancel')"></div>
    <form
      class="book-sheet book-editor"
      data-testid="book-editor"
      role="dialog"
      aria-modal="true"
      :aria-label="t('文本编辑', 'Text editor')"
      @submit.prevent="emit('save')"
    >
      <div class="book-sheet__head">
        <div>
          <p>{{ t('文本编辑', 'Text editor') }}</p>
          <h3>{{ draft.title || t('未命名来源', 'Untitled source') }}</h3>
        </div>
        <button
          type="button"
          class="book-sheet__close"
          :aria-label="t('关闭', 'Close')"
          @click="emit('cancel')"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <label>
        <span>{{ t('标题', 'Title') }}</span>
        <input v-model="draft.title" data-testid="book-edit-title" />
      </label>
      <label>
        <span>{{ t('分类', 'Category') }}</span>
        <select v-model="draft.category" data-testid="book-edit-type">
          <option v-for="type in BOOK_TEXT_ASSET_TYPES" :key="type" :value="type">
            {{ categoryLabel(type) }}
          </option>
        </select>
      </label>
      <label>
        <span>{{ t('标签', 'Tags') }}</span>
        <input v-model="draft.tags" data-testid="book-edit-tags" :placeholder="t('用逗号分隔', 'Comma separated')" />
      </label>
      <label class="book-editor__content">
        <span>{{ t('内容', 'Content') }}</span>
        <textarea v-model="draft.content" data-testid="book-edit-content"></textarea>
      </label>
      <div class="book-sheet__actions">
        <button type="button" class="book-sheet__button is-secondary" data-testid="book-cancel" @click="emit('cancel')">
          {{ t('取消', 'Cancel') }}
        </button>
        <button type="submit" class="book-sheet__button is-primary" :disabled="disabled" data-testid="book-save">
          {{ t('保存', 'Save') }}
        </button>
      </div>
    </form>
  </template>
</template>

<style scoped>
.book-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(38, 34, 27, 0.32);
  backdrop-filter: blur(12px);
}

.book-sheet {
  position: fixed;
  top: max(24px, env(safe-area-inset-top));
  left: max(18px, env(safe-area-inset-left));
  right: max(18px, env(safe-area-inset-right));
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 81;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(190px, 0.7fr) minmax(190px, 0.7fr);
  gap: 14px;
  max-width: 980px;
  margin: 0 auto;
  padding: 18px;
  overflow: auto;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-lg);
  color: var(--book-ink);
  background: var(--book-card);
  box-shadow: var(--book-shadow-deep);
}

.book-sheet__head,
.book-editor__content,
.book-sheet__actions {
  grid-column: 1 / -1;
}

.book-sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 4px;
}

.book-sheet__head p {
  margin: 0;
  color: var(--book-ink-3);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.book-sheet__head h3 {
  margin: 2px 0 0;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 22px;
  line-height: 1.16;
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

.book-editor label {
  display: grid;
  gap: 6px;
  color: var(--book-ink-2);
  font-size: 12px;
  font-weight: 800;
}

.book-editor input,
.book-editor select,
.book-editor textarea {
  width: 100%;
  min-height: 42px;
  padding: 9px 11px;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-md);
  outline: none;
  color: var(--book-ink);
  background: var(--book-paper);
  font: inherit;
}

.book-editor textarea {
  min-height: min(44dvh, 420px);
  resize: vertical;
  line-height: 1.62;
}

.book-sheet__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.book-sheet__button {
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-md);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.book-sheet__button.is-secondary {
  color: var(--book-ink);
  background: var(--book-field);
}

.book-sheet__button.is-primary {
  color: #fff;
  background: var(--book-ink);
  border-color: transparent;
}

.book-sheet__button:disabled {
  opacity: 0.5;
  cursor: default;
}

@media (max-width: 720px) {
  .book-sheet {
    top: calc(58px + env(safe-area-inset-top));
    left: 0;
    right: 0;
    bottom: 0;
    grid-template-columns: 1fr;
    padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
    border-radius: var(--book-radius-lg) var(--book-radius-lg) 0 0;
  }
}
</style>
