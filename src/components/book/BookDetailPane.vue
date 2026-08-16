<script setup>
import { computed, ref } from 'vue'
import { useI18n } from '../../composables/useI18n'
import BookCover from './BookCover.vue'

const props = defineProps({
  asset: { type: Object, required: true },
  typeLabel: { type: String, default: '' },
  statusLabel: { type: String, default: '' },
  updatedText: { type: String, default: '' },
  rating: { type: Object, default: () => ({ score: 0, stars: 0 }) },
  summary: { type: String, default: '' },
  tags: { type: Array, default: () => [] },
  sections: { type: Array, default: () => [] },
  lineCount: { type: Number, default: 0 },
  linkCount: { type: Number, default: 0 },
  usageSummary: { type: String, default: '' },
  isBuiltIn: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  actionDisabled: { type: Boolean, default: false },
  editGuardVisible: { type: Boolean, default: false },
})

const emit = defineEmits([
  'edit',
  'confirm-guard',
  'export',
  'delete',
  'toggle-favorite',
  'open-usage',
  'open-shelf',
])

const { t } = useI18n()
const readAnchor = ref(null)

const starStates = computed(() => [1, 2, 3, 4, 5].map((i) => i <= props.rating.stars))

const scrollToRead = () => {
  readAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <section class="book-detail" data-testid="book-detail">
    <button
      type="button"
      class="book-detail__shelf-back"
      data-testid="book-detail-open-shelf"
      @click="emit('open-shelf')"
    >
      <i class="fas fa-chevron-left" aria-hidden="true"></i>
      <span>{{ t('书架', 'Shelf') }}</span>
    </button>

    <div class="book-detail__hero">
      <BookCover
        size="lg"
        :title="asset.title"
        :category="asset.category || asset.assetType"
        :category-label="typeLabel"
        :active="asset.status === 'active_source'"
        :band-label="t('在读', 'Active')"
      />
      <h2>{{ asset.title }}</h2>
      <p class="book-detail__sub">
        {{ typeLabel }} · {{ statusLabel }}<template v-if="updatedText"> · {{ updatedText }}</template>
      </p>
      <div class="book-detail__rate">
        <template v-if="rating.score >= 1">
          <span class="book-stars" aria-hidden="true">
            <span v-for="(lit, n) in starStates" :key="n" :class="{ 'is-dim': !lit }">★</span>
          </span>
          <b>{{ rating.score.toFixed(1) }}</b>
          <small>{{ t('资料完整度', 'Completeness') }}</small>
        </template>
        <small v-else>{{ t('暂无评分 · 内容还很少', 'Not rated yet · content is thin') }}</small>
      </div>
      <div class="book-detail__chips">
        <span v-for="tag in tags" :key="tag" class="book-chip">{{ tag }}</span>
        <span v-if="asset.status === 'active_source'" class="book-chip is-hot">
          ● {{ t('正在影响世界书', 'Used by WorldBook') }}
        </span>
        <span v-if="asset.locked" class="book-chip">{{ t('已锁定', 'Locked') }}</span>
      </div>
    </div>

    <div class="book-detail__body">
      <div v-if="linkCount > 0" class="book-usage" data-testid="book-worldbook-usage">
        <div>
          <strong>{{ t('正在被 WorldBook 使用', 'Used by WorldBook') }}</strong>
          <span>{{ usageSummary }}</span>
        </div>
        <button type="button" class="book-usage__button" @click="emit('open-usage')">
          {{ t('查看启用设置', 'View activation') }}
        </button>
      </div>

      <div v-if="editGuardVisible" class="book-guard" data-testid="book-edit-guard">
        <strong>
          {{
            isBuiltIn
              ? t('这是内置来源', 'This is a built-in source')
              : t('这是启用或锁定的来源', 'This source is active or locked')
          }}
        </strong>
        <p>
          {{
            isBuiltIn
              ? t('继续后会创建一份可编辑副本，内置模板本身不会被改动。', 'Continuing creates an editable copy; the built-in template stays unchanged.')
              : t('编辑前请确认：保存后可能改变之后的世界书上下文。', 'Confirm before editing: saving may change future WorldBook context.')
          }}
        </p>
        <button
          type="button"
          class="book-guard__confirm"
          :disabled="actionDisabled"
          data-testid="book-edit-guard-confirm"
          @click="emit('confirm-guard')"
        >
          {{ isBuiltIn ? t('复制后编辑', 'Copy and edit') : t('继续编辑', 'Continue editing') }}
        </button>
      </div>

      <h3 class="book-detail__sec-title">{{ t('内容简介', 'Introduction') }}</h3>
      <p class="book-detail__intro">{{ summary }}</p>

      <div class="book-facts" aria-label="Book facts">
        <div>
          <b>{{ asset.content.length }}</b>
          <small>{{ t('字数', 'chars') }}</small>
        </div>
        <div>
          <b>{{ sections.length }}</b>
          <small>{{ t('段落', 'sections') }}</small>
        </div>
        <div>
          <b>{{ linkCount }}</b>
          <small>{{ t('世界书引用', 'links') }}</small>
        </div>
        <div>
          <b>{{ tags.length }}</b>
          <small>{{ t('标签', 'tags') }}</small>
        </div>
      </div>

      <template v-if="sections.length > 0">
        <h3 class="book-detail__sec-title">{{ t('目录', 'Outline') }}</h3>
        <div class="book-outline">
          <span v-for="section in sections" :key="section.id">{{ section.title }}</span>
        </div>
      </template>

      <h3 ref="readAnchor" class="book-detail__sec-title">{{ t('全文', 'Full text') }}</h3>
      <div class="book-read" data-testid="book-read-mode">
        <pre>{{ asset.content }}</pre>
      </div>
    </div>

    <footer class="book-detail__actionbar">
      <button
        v-if="!isBuiltIn"
        type="button"
        :class="['book-action-ghost', { 'is-fav': favorite }]"
        :aria-label="favorite ? t('取消收藏', 'Unfavorite') : t('收藏', 'Favorite')"
        :disabled="actionDisabled"
        data-testid="book-favorite"
        @click="emit('toggle-favorite')"
      >
        <i :class="favorite ? 'fas fa-heart' : 'far fa-heart'" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="book-action-ghost"
        :aria-label="t('编辑', 'Edit')"
        :disabled="actionDisabled"
        data-testid="book-edit"
        @click="emit('edit')"
      >
        <i class="fas fa-pen" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="book-action-ghost"
        :aria-label="t('导出', 'Export')"
        data-testid="book-export"
        @click="emit('export')"
      >
        <i class="fas fa-arrow-up-from-bracket" aria-hidden="true"></i>
      </button>
      <button
        v-if="!isBuiltIn"
        type="button"
        class="book-action-ghost is-danger"
        :aria-label="t('删除', 'Delete')"
        :disabled="actionDisabled"
        data-testid="book-delete"
        @click="emit('delete')"
      >
        <i class="fas fa-trash-can" aria-hidden="true"></i>
      </button>
      <button type="button" class="book-action-primary" data-testid="book-read" @click="scrollToRead">
        {{ t('开始阅读', 'Read') }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.book-detail {
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-lg);
  background: var(--book-card);
  box-shadow: var(--book-shadow-soft);
}

.book-detail__shelf-back {
  display: none;
  align-items: center;
  gap: 6px;
  margin: 12px 16px 0;
  padding: 6px 10px;
  align-self: flex-start;
  border: 1px solid var(--book-line);
  border-radius: 999px;
  color: var(--book-ink-2);
  background: var(--book-card);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.book-detail__hero {
  padding: 22px 20px 20px;
  text-align: center;
  background: radial-gradient(120% 90% at 50% 0%, #f3ede2 0%, var(--book-card) 68%);
  border-bottom: 1px solid var(--book-line);
}

.book-detail__hero .book-cover {
  margin: 0 auto;
}

.book-detail__hero h2 {
  margin: 16px 0 0;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 22px;
  font-weight: 900;
  color: var(--book-ink);
  overflow-wrap: anywhere;
}

.book-detail__sub {
  margin: 5px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--book-ink-2);
}

.book-detail__rate {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.book-detail__rate .book-stars {
  color: var(--book-gold);
  font-size: 13px;
  letter-spacing: 1px;
}

.book-stars .is-dim {
  color: #ddd8cc;
}

.book-detail__rate b {
  font-size: 15px;
  color: var(--book-ink);
}

.book-detail__rate small {
  font-size: 10px;
  color: var(--book-ink-3);
}

.book-detail__chips {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
}

.book-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--book-field);
  color: var(--book-ink-2);
  font-size: 10px;
  font-weight: 700;
}

.book-chip.is-hot {
  color: var(--book-accent);
  background: var(--book-accent-soft);
}

.book-detail__body {
  flex: 1;
  padding: 16px 20px 20px;
  display: grid;
  gap: 12px;
  align-content: start;
}

.book-detail__sec-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 900;
  color: var(--book-ink);
}

.book-detail__sec-title::before {
  content: "";
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: var(--book-accent);
}

.book-detail__intro {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--book-ink-2);
}

.book-usage {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-md);
  background: var(--book-paper);
}

.book-usage div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.book-usage strong {
  color: var(--book-ink);
  font-size: 13px;
}

.book-usage span {
  color: var(--book-ink-2);
  font-size: 12px;
}

.book-usage__button {
  flex: 0 0 auto;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-sm);
  padding: 8px 12px;
  color: var(--book-ink);
  background: var(--book-card);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.book-guard {
  padding: 13px;
  border: 1px solid rgba(200, 69, 44, 0.3);
  border-radius: var(--book-radius-md);
  background: var(--book-accent-soft);
}

.book-guard strong {
  color: var(--book-ink);
  font-size: 13px;
}

.book-guard p {
  margin: 6px 0 12px;
  color: var(--book-ink-2);
  font-size: 13px;
  line-height: 1.55;
}

.book-guard__confirm {
  min-height: 38px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--book-radius-sm);
  color: #fff;
  background: var(--book-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.book-guard__confirm:disabled {
  opacity: 0.5;
  cursor: default;
}

.book-facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 12px 0;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-md);
  background: var(--book-card);
}

.book-facts div {
  text-align: center;
  min-width: 0;
}

.book-facts div + div {
  border-left: 1px solid var(--book-line);
}

.book-facts b {
  display: block;
  font-size: 15px;
  font-weight: 900;
  color: var(--book-ink);
}

.book-facts small {
  font-size: 10px;
  font-weight: 700;
  color: var(--book-ink-3);
}

.book-outline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-md);
  background: var(--book-paper);
}

.book-outline span {
  padding: 5px 8px;
  border-radius: var(--book-radius-sm);
  background: var(--book-card);
  color: var(--book-ink);
  font-size: 12px;
}

.book-read pre {
  min-height: 280px;
  margin: 0;
  padding: 18px;
  overflow: auto;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-md);
  color: var(--book-ink);
  background:
    linear-gradient(180deg, rgba(38, 34, 27, 0.04) 0 1px, transparent 1px) 0 26px / 100% 28px,
    linear-gradient(180deg, #fffdf8, #faf7ef);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.78;
  font-family: "Iowan Old Style", "Songti SC", "Noto Serif SC", Georgia, serif;
  font-size: 14px;
}

.book-detail__actionbar {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--book-line);
  background: var(--book-card);
}

.book-action-ghost {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--book-line);
  border-radius: var(--book-radius-md);
  color: var(--book-ink-2);
  background: var(--book-card);
  font: inherit;
  font-size: 15px;
  cursor: pointer;
  transition: transform 160ms ease;
}

.book-action-ghost.is-fav {
  color: var(--book-accent);
  border-color: rgba(200, 69, 44, 0.4);
  background: var(--book-accent-soft);
}

.book-action-ghost.is-danger:not(:disabled):hover {
  color: var(--book-accent);
  border-color: rgba(200, 69, 44, 0.4);
}

.book-action-ghost:disabled {
  opacity: 0.45;
  cursor: default;
}

.book-action-primary {
  flex: 1;
  height: 42px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  background: var(--book-ink);
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease;
}

.book-action-ghost:not(:disabled):active,
.book-action-primary:active {
  transform: scale(0.97);
}

@media (max-width: 720px) {
  .book-detail__shelf-back {
    display: inline-flex;
  }

  .book-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 10px;
    padding: 12px 0;
  }

  .book-facts div:nth-child(3) {
    border-left: 0;
  }
}
</style>
