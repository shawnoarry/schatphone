<template>
  <section class="prism-results" :aria-label="listLabel">
    <article
      v-for="result in results"
      :key="result.resultId"
      class="prism-result"
      :class="[`is-${result.sourceKind}`, { 'is-unavailable': result.availability !== 'available' }]"
      :data-testid="`browser-result-${result.resultId}`"
    >
      <button class="prism-result__body" type="button" @click="$emit('open', result.resultId)">
        <span class="prism-result__eyebrow">
          <span class="prism-result__source">
            <i class="fas" :class="sourceMeta[result.sourceKind].icon" aria-hidden="true"></i>
            {{ isZh ? result.sourceLabelZh : result.sourceLabelEn }}
          </span>
          <span v-if="result.domain" class="prism-result__domain">{{ result.domain }}</span>
          <span v-else class="prism-result__date">{{ formatDate(result.updatedAt) }}</span>
        </span>
        <span class="prism-result__title">{{ isZh ? result.titleZh : result.titleEn }}</span>
        <span class="prism-result__summary">{{ isZh ? result.summaryZh : result.summaryEn }}</span>
        <span v-if="result.availability !== 'available'" class="prism-result__availability">
          <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
          {{ unavailableLabel }}
        </span>
      </button>

      <button
        type="button"
        class="prism-result__bookmark"
        :class="{ 'is-active': bookmarkedIds.includes(result.resultId) }"
        :aria-pressed="bookmarkedIds.includes(result.resultId) ? 'true' : 'false'"
        :aria-label="bookmarkLabel(result)"
        :data-testid="`browser-bookmark-${result.resultId}`"
        @click="$emit('bookmark', result.resultId)"
      >
        <i
          :class="bookmarkedIds.includes(result.resultId) ? 'fas fa-bookmark' : 'far fa-bookmark'"
          aria-hidden="true"
        ></i>
      </button>
    </article>
  </section>
</template>

<script setup>
import { BROWSER_SOURCE_META } from '../../lib/browser-shell-data'

const props = defineProps({
  results: { type: Array, default: () => [] },
  bookmarkedIds: { type: Array, default: () => [] },
  isZh: { type: Boolean, default: true },
  listLabel: { type: String, required: true },
  unavailableLabel: { type: String, required: true },
  bookmarkLabel: { type: Function, required: true },
})

defineEmits(['open', 'bookmark'])

const sourceMeta = BROWSER_SOURCE_META
const formatDate = (date) => {
  if (!date) return ''
  const locale = props.isZh ? 'zh-CN' : 'en-US'
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`))
}
</script>

<style scoped>
.prism-results {
  display: grid;
  gap: 12px;
}

.prism-result {
  position: relative;
  min-width: 0;
  border: 1px solid var(--prism-border);
  border-radius: 18px;
  background: var(--prism-panel);
  box-shadow: var(--prism-panel-shadow);
  overflow: hidden;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.prism-result::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--prism-help);
  content: '';
}

.prism-result.is-world::before {
  background: var(--prism-world);
}

.prism-result:hover {
  border-color: var(--prism-border-strong);
  box-shadow: var(--prism-panel-shadow-hover);
  transform: translateY(-1px);
}

.prism-result__body {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 7px;
  padding: 17px 58px 17px 20px;
  border: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.prism-result__eyebrow {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: var(--prism-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.prism-result__source {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  color: var(--prism-help-text);
}

.is-world .prism-result__source {
  color: var(--prism-world-text);
}

.prism-result__domain {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prism-result__date {
  margin-left: auto;
}

.prism-result__title {
  color: var(--prism-text);
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: clamp(1.02rem, 2vw, 1.22rem);
  font-weight: 700;
  line-height: 1.36;
  overflow-wrap: anywhere;
}

.prism-result__summary {
  display: -webkit-box;
  color: var(--prism-text-soft);
  font-size: 0.89rem;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.prism-result__availability {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  padding: 5px 8px;
  border-radius: 8px;
  color: var(--prism-warning-text);
  background: var(--prism-warning-bg);
  font-size: 0.76rem;
  font-weight: 700;
}

.prism-result__bookmark {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 0;
  border-radius: 12px;
  color: var(--prism-muted);
  background: transparent;
  cursor: pointer;
}

.prism-result__bookmark:hover {
  color: var(--prism-accent);
  background: var(--prism-hover);
}

.prism-result__bookmark.is-active {
  color: var(--prism-accent);
}

.prism-result__body:focus-visible,
.prism-result__bookmark:focus-visible {
  outline: 3px solid var(--prism-focus);
  outline-offset: -3px;
}

@media (max-width: 560px) {
  .prism-result__body {
    padding: 15px 52px 15px 17px;
  }

  .prism-result__eyebrow {
    flex-wrap: wrap;
  }

  .prism-result__date {
    margin-left: 0;
  }
}
</style>
