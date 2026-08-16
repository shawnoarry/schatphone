<script setup>
import { ref } from 'vue'
import { useI18n } from '../../composables/useI18n'
import BookCover from './BookCover.vue'

const props = defineProps({
  groups: { type: Array, default: () => [] },
  totalCount: { type: Number, default: 0 },
  tabs: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  activeTab: { type: String, default: 'all' },
  selectedId: { type: String, default: '' },
  storageState: { type: String, default: '' },
  storageMode: { type: String, default: '' },
  storageBusy: { type: Boolean, default: false },
  storageReadOnly: { type: Boolean, default: false },
  storageStatusCopy: { type: Object, default: () => ({ title: '', detail: '' }) },
  importFeedback: { type: String, default: '' },
  importFeedbackTone: { type: String, default: 'info' },
})

const emit = defineEmits([
  'update:searchQuery',
  'update:activeTab',
  'select',
  'import-file',
  'upgrade-storage',
  'retry-storage',
  'refresh-storage',
  'close',
])

const { t } = useI18n()
const importInput = ref(null)

const triggerImport = () => {
  if (props.storageReadOnly) return
  importInput.value?.click()
}

const starsOf = (n) => [1, 2, 3, 4, 5].map((i) => i <= n)
</script>

<template>
  <aside class="book-shelf" data-testid="book-library">
    <div class="book-shelf__head">
      <span class="book-shelf__head-title">{{ t('书架', 'Shelf') }}</span>
      <strong>{{ totalCount }}</strong>
      <button
        v-if="selectedId"
        type="button"
        class="book-shelf__close"
        :aria-label="t('关闭书架', 'Close shelf')"
        data-testid="book-close-shelf"
        @click="emit('close')"
      >
        <i class="fas fa-xmark" aria-hidden="true"></i>
      </button>
    </div>

    <div class="book-shelf__search">
      <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
      <input
        :value="searchQuery"
        type="search"
        :placeholder="t('搜索书名、标签、内容', 'Search title, tags, content')"
        data-testid="book-search"
        @input="emit('update:searchQuery', $event.target.value)"
      />
    </div>

    <nav class="book-shelf__tabs" data-testid="book-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="['book-shelf__tab', { 'is-active': activeTab === tab.id }]"
        :data-testid="`book-tab-${tab.id}`"
        @click="emit('update:activeTab', tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <section
      :class="['book-storage-status', `is-${storageState}`]"
      data-testid="book-storage-status"
      :data-storage-mode="storageMode"
      :data-storage-state="storageState"
      aria-live="polite"
    >
      <span class="book-storage-icon" aria-hidden="true">
        <i :class="storageMode === 'repository' ? 'fas fa-database' : 'fas fa-hard-drive'"></i>
      </span>
      <div>
        <strong>{{ storageStatusCopy.title }}</strong>
        <small>{{ storageStatusCopy.detail }}</small>
      </div>
      <button
        v-if="storageMode === 'legacy' && storageState !== 'read_only_conflict'"
        type="button"
        class="book-storage-action"
        :disabled="storageBusy"
        data-testid="book-storage-upgrade"
        @click="emit('upgrade-storage')"
      >
        {{ t('升级', 'Upgrade') }}
      </button>
      <div v-else-if="storageState === 'read_only_conflict'" class="book-storage-conflict-actions">
        <button type="button" class="book-storage-action" data-testid="book-storage-retry" @click="emit('retry-storage')">
          {{ t('重试', 'Retry') }}
        </button>
        <button type="button" class="book-storage-action is-secondary" data-testid="book-storage-refresh" @click="emit('refresh-storage')">
          {{ t('刷新', 'Refresh') }}
        </button>
      </div>
    </section>

    <button
      type="button"
      class="book-import-button"
      :disabled="storageReadOnly || storageBusy"
      data-testid="book-import-trigger"
      @click="triggerImport"
    >
      <i class="fas fa-file-import" aria-hidden="true"></i>
      <span>{{ t('导入文本', 'Import text') }}</span>
    </button>
    <input
      ref="importInput"
      class="book-hidden-input"
      type="file"
      accept=".txt,.md,.markdown,.json,.worldbook.json"
      data-testid="book-import-input"
      @change="emit('import-file', $event)"
    />

    <p v-if="importFeedback" :class="['book-feedback', `is-${importFeedbackTone}`]" data-testid="book-import-feedback">
      {{ importFeedback }}
    </p>

    <div v-if="totalCount === 0" class="book-empty" data-testid="book-empty">
      <div class="book-empty__visual" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <strong>{{ t('没有找到书籍', 'No books found') }}</strong>
      <span>{{ t('换个关键词，或新建、导入一份文本来源。', 'Try another keyword, or create / import a text source.') }}</span>
    </div>

    <div class="book-shelf__groups">
      <section v-for="group in groups" :key="group.id" class="book-shelf__group">
        <header class="book-shelf__group-head">
          <h3>{{ group.label }}</h3>
          <small>{{ group.items.length }} {{ t('本', 'books') }}</small>
          <button
            v-if="activeTab === 'all'"
            type="button"
            class="book-shelf__group-more"
            @click="emit('update:activeTab', group.id)"
          >
            {{ t('全部', 'All') }} ›
          </button>
        </header>
        <div class="book-shelf__row">
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            :class="['book-card', { 'is-active': item.id === selectedId }]"
            :data-testid="`book-asset-${item.id}`"
            @click="emit('select', item.id)"
          >
            <BookCover
              :title="item.title"
              :category="item.category"
              :category-label="item.categoryLabel"
              :active="item.status === 'active_source'"
              :band-label="t('在读', 'Active')"
            />
            <span class="book-card__meta">
              <b>{{ item.title }}</b>
              <span v-if="item.rating.score >= 1" class="book-card__rating">
                <span class="book-stars" aria-hidden="true">
                  <span v-for="(lit, n) in starsOf(item.rating.stars)" :key="n" :class="{ 'is-dim': !lit }">★</span>
                </span>
                <i>{{ item.rating.score.toFixed(1) }}</i>
              </span>
              <small v-else>{{ t('暂无评分', 'Not rated') }}</small>
            </span>
          </button>
        </div>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.book-shelf {
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-lg);
  background: var(--book-card);
  box-shadow: var(--book-shadow-soft);
}

.book-shelf__head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--book-ink);
}

.book-shelf__head-title {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.book-shelf__head strong {
  display: grid;
  place-items: center;
  min-width: 28px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--book-accent-soft);
  color: var(--book-accent);
  font-size: 12px;
}

.book-shelf__close {
  display: none;
  margin-left: auto;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-sm);
  color: var(--book-ink);
  background: var(--book-card);
  cursor: pointer;
  font: inherit;
}

.book-shelf__search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--book-field);
  color: var(--book-ink-3);
}

.book-shelf__search input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--book-ink);
  font: inherit;
  font-size: 13px;
}

.book-shelf__tabs {
  display: flex;
  gap: 18px;
  padding: 0 2px;
  border-bottom: 1px solid var(--book-line);
}

.book-shelf__tab {
  position: relative;
  padding: 0 0 9px;
  border: 0;
  background: transparent;
  color: var(--book-ink-3);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.book-shelf__tab.is-active {
  color: var(--book-ink);
}

.book-shelf__tab.is-active::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -1px;
  width: 18px;
  height: 3px;
  border-radius: 2px;
  background: var(--book-accent);
  transform: translateX(-50%);
}

.book-storage-status {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 10px;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-md);
  background: var(--book-paper);
}

.book-storage-status.is-read_only_conflict,
.book-storage-status.is-error {
  border-color: rgba(151, 61, 45, 0.42);
  background: #fdece7;
}

.book-storage-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--book-ink);
}

.book-storage-status > div:not(.book-storage-conflict-actions) {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.book-storage-status strong {
  color: var(--book-ink);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.book-storage-status small {
  color: var(--book-ink-2);
  font-size: 10px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.book-storage-action {
  min-width: 44px;
  min-height: 36px;
  border: 0;
  border-radius: var(--book-radius-sm);
  padding: 0 12px;
  color: #fff;
  background: var(--book-ink);
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.book-storage-action.is-secondary {
  color: var(--book-ink);
  background: var(--book-field);
}

.book-storage-action:disabled,
.book-import-button:disabled {
  cursor: default;
  opacity: 0.5;
}

.book-storage-conflict-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.book-import-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border: 1px dashed rgba(38, 34, 27, 0.28);
  border-radius: var(--book-radius-md);
  color: var(--book-ink);
  background: var(--book-paper);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.book-hidden-input {
  display: none;
}

.book-feedback {
  margin: 0;
  padding: 9px 10px;
  border-radius: var(--book-radius-sm);
  font-size: 12px;
  font-weight: 700;
}

.book-feedback.is-success {
  color: #176144;
  background: #dff5ea;
}

.book-feedback.is-error {
  color: #9c2525;
  background: #fee2e2;
}

.book-feedback.is-info {
  color: var(--book-ink-2);
  background: var(--book-field);
}

.book-empty {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 200px;
  padding: 24px 18px;
  border: 1px dashed rgba(38, 34, 27, 0.2);
  border-radius: var(--book-radius-lg);
  color: var(--book-ink-2);
  text-align: center;
}

.book-empty__visual {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 7px;
  width: 120px;
  height: 88px;
}

.book-empty__visual::before {
  content: "";
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 3px;
  height: 8px;
  border-radius: 999px;
  background: rgba(38, 34, 27, 0.14);
}

.book-empty__visual span {
  position: relative;
  z-index: 1;
  width: 26px;
  border: 1px solid rgba(38, 34, 27, 0.16);
  border-radius: 8px 8px 4px 4px;
  background: linear-gradient(180deg, #fff, #e7e2d6);
  box-shadow: 0 10px 16px rgba(38, 34, 27, 0.1);
}

.book-empty__visual span:nth-child(1) { height: 62px; transform: rotate(-6deg); }
.book-empty__visual span:nth-child(2) { height: 78px; background: linear-gradient(180deg, #f6d9cf, #e8b7a6); }
.book-empty__visual span:nth-child(3) { height: 54px; transform: rotate(5deg); }

.book-empty strong {
  color: var(--book-ink);
}

.book-shelf__groups {
  display: grid;
  gap: 18px;
  padding-bottom: 4px;
}

.book-shelf__group-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.book-shelf__group-head h3 {
  margin: 0;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 17px;
  font-weight: 900;
  color: var(--book-ink);
}

.book-shelf__group-head small {
  font-size: 11px;
  font-weight: 700;
  color: var(--book-ink-3);
}

.book-shelf__group-more {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--book-ink-2);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.book-shelf__row {
  display: flex;
  gap: 14px;
  margin-top: 12px;
  padding-bottom: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.book-shelf__row::-webkit-scrollbar {
  display: none;
}

.book-card {
  display: grid;
  gap: 0;
  justify-items: start;
  width: 96px;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
  border-radius: var(--book-radius-sm);
  transition: transform 160ms ease;
}

.book-card:active {
  transform: scale(0.97);
}

.book-card.is-active .book-cover {
  outline: 2px solid var(--book-accent);
  outline-offset: 2px;
}

.book-card__meta {
  display: grid;
  gap: 3px;
  min-width: 0;
  width: 100%;
  padding: 8px 2px 0;
}

.book-card__meta b {
  font-size: 12px;
  font-weight: 700;
  color: var(--book-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-card__meta small {
  font-size: 10px;
  color: var(--book-ink-3);
}

.book-card__rating {
  display: flex;
  align-items: center;
  gap: 4px;
}

.book-card__rating i {
  font-style: normal;
  font-size: 10px;
  font-weight: 700;
  color: var(--book-ink-2);
}

.book-stars {
  color: var(--book-gold);
  font-size: 10px;
  letter-spacing: 1px;
}

.book-stars .is-dim {
  color: #ddd8cc;
}

@media (max-width: 720px) {
  .book-shelf__close {
    display: grid;
  }
}
</style>
