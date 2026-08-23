<template>
  <article class="prism-detail" data-testid="browser-detail">
    <header class="prism-detail__header">
      <button
        type="button"
        class="prism-detail__back"
        :aria-label="backLabel"
        data-testid="browser-detail-back"
        @click="$emit('back')"
      >
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>
      <div class="prism-detail__address">
        <i class="fas" :class="sourceMeta[record.sourceKind].icon" aria-hidden="true"></i>
        <span>{{ isZh ? record.sourceLabelZh : record.sourceLabelEn }}</span>
        <span aria-hidden="true">·</span>
        <span class="prism-detail__address-tail">{{ record.domain || productDomain }}</span>
      </div>
      <button
        type="button"
        class="prism-detail__bookmark"
        :class="{ 'is-active': bookmarked }"
        :aria-pressed="bookmarked ? 'true' : 'false'"
        :aria-label="bookmarkLabel"
        data-testid="browser-detail-bookmark"
        @click="$emit('bookmark')"
      >
        <i :class="bookmarked ? 'fas fa-bookmark' : 'far fa-bookmark'" aria-hidden="true"></i>
      </button>
    </header>

    <div v-if="record.availability !== 'available'" class="prism-detail__closed" role="status">
      <span class="prism-detail__closed-icon" aria-hidden="true">
        <i class="fas fa-link-slash"></i>
      </span>
      <h1>{{ unavailableTitle }}</h1>
      <p>{{ unavailableBody }}</p>
      <button type="button" @click="$emit('back')">{{ backToResultsLabel }}</button>
    </div>

    <template v-else>
      <div class="prism-detail__hero" :class="`is-${record.sourceKind}`">
        <p class="prism-detail__kicker">
          {{ record.sourceKind === 'help' ? helpKicker : worldKicker }}
        </p>
        <h1>{{ isZh ? record.titleZh : record.titleEn }}</h1>
        <p class="prism-detail__lede">{{ isZh ? record.summaryZh : record.summaryEn }}</p>
        <p class="prism-detail__updated">{{ updatedLabel }} · {{ formattedDate }}</p>
      </div>

      <dl v-if="localizedFacts.length" class="prism-detail__facts">
        <div v-for="fact in localizedFacts" :key="fact[0]">
          <dt>{{ fact[0] }}</dt>
          <dd>{{ fact[1] }}</dd>
        </div>
      </dl>

      <div class="prism-detail__body">
        <template v-if="record.sourceKind === 'help'">
          <section v-for="section in localizedBody" :key="section.heading">
            <h2>{{ section.heading }}</h2>
            <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
          </section>
        </template>
        <template v-else>
          <p v-for="paragraph in localizedBody" :key="paragraph">{{ paragraph }}</p>
        </template>
      </div>

      <footer class="prism-detail__footer">
        <div class="prism-detail__source-note">
          <i class="fas fa-fingerprint" aria-hidden="true"></i>
          <span>{{ sourceNote }}</span>
        </div>
        <button
          v-if="record.targetRef && localizedActionLabel"
          type="button"
          class="prism-detail__open"
          data-testid="browser-detail-owner-action"
          @click="$emit('open-owner', record)"
        >
          {{ localizedActionLabel }}
          <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </button>
      </footer>
    </template>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { BROWSER_SOURCE_META } from '../../lib/browser-shell-data'

const props = defineProps({
  record: { type: Object, required: true },
  isZh: { type: Boolean, default: true },
  bookmarked: { type: Boolean, default: false },
  backLabel: { type: String, required: true },
  bookmarkLabel: { type: String, required: true },
  unavailableTitle: { type: String, required: true },
  unavailableBody: { type: String, required: true },
  backToResultsLabel: { type: String, required: true },
  helpKicker: { type: String, required: true },
  worldKicker: { type: String, required: true },
  updatedLabel: { type: String, required: true },
  sourceNote: { type: String, required: true },
  productDomain: { type: String, required: true },
})

defineEmits(['back', 'bookmark', 'open-owner'])

const sourceMeta = BROWSER_SOURCE_META
const localizedBody = computed(() => (props.isZh ? props.record.bodyZh : props.record.bodyEn) || [])
const localizedFacts = computed(() => (props.isZh ? props.record.factsZh : props.record.factsEn) || [])
const localizedActionLabel = computed(() =>
  props.isZh ? props.record.actionLabelZh : props.record.actionLabelEn,
)
const formattedDate = computed(() =>
  new Intl.DateTimeFormat(props.isZh ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${props.record.updatedAt}T00:00:00`)),
)
</script>

<style scoped>
.prism-detail {
  width: min(100%, 800px);
  min-width: 0;
  margin: 0 auto;
  padding-bottom: 48px;
}

.prism-detail__header {
  position: sticky;
  z-index: 4;
  top: 0;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 8px;
  min-height: 58px;
  margin-bottom: 18px;
  padding: 7px 8px;
  border: 1px solid var(--prism-border);
  border-radius: 16px;
  background: var(--prism-toolbar);
  box-shadow: var(--prism-panel-shadow);
  backdrop-filter: blur(18px);
}

.prism-detail__back,
.prism-detail__bookmark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 12px;
  color: var(--prism-text-soft);
  background: transparent;
  cursor: pointer;
}

.prism-detail__back:hover,
.prism-detail__bookmark:hover {
  color: var(--prism-accent);
  background: var(--prism-hover);
}

.prism-detail__bookmark.is-active {
  color: var(--prism-accent);
}

.prism-detail__back:focus-visible,
.prism-detail__bookmark:focus-visible,
.prism-detail__open:focus-visible,
.prism-detail__closed button:focus-visible {
  outline: 3px solid var(--prism-focus);
  outline-offset: 2px;
}

.prism-detail__address {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--prism-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.prism-detail__address-tail {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prism-detail__hero {
  position: relative;
  padding: clamp(28px, 5vw, 54px);
  border: 1px solid var(--prism-border);
  border-radius: 30px 30px 14px 14px;
  background: var(--prism-help-hero);
  box-shadow: var(--prism-panel-shadow);
  overflow: hidden;
}

.prism-detail__hero.is-world {
  background: var(--prism-world-hero);
}

.prism-detail__hero::after {
  position: absolute;
  right: -44px;
  bottom: -64px;
  width: 190px;
  height: 190px;
  border: 30px solid var(--prism-hero-ring);
  border-radius: 50%;
  content: '';
  pointer-events: none;
}

.prism-detail__kicker {
  position: relative;
  z-index: 1;
  margin: 0 0 14px;
  color: var(--prism-accent-strong);
  font-size: 0.75rem;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.prism-detail__hero h1 {
  position: relative;
  z-index: 1;
  max-width: 17ch;
  margin: 0;
  color: var(--prism-text);
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: clamp(2rem, 6vw, 4rem);
  line-height: 1.12;
  overflow-wrap: anywhere;
}

.prism-detail__lede {
  position: relative;
  z-index: 1;
  max-width: 62ch;
  margin: 22px 0 0;
  color: var(--prism-text-soft);
  font-size: clamp(1rem, 2vw, 1.12rem);
  line-height: 1.75;
}

.prism-detail__updated {
  position: relative;
  z-index: 1;
  margin: 24px 0 0;
  color: var(--prism-muted);
  font-size: 0.78rem;
}

.prism-detail__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 12px 0 0;
  border: 1px solid var(--prism-border);
  border-radius: 14px;
  background: var(--prism-panel);
  overflow: hidden;
}

.prism-detail__facts > div {
  min-width: 0;
  padding: 18px;
  border-right: 1px solid var(--prism-border);
}

.prism-detail__facts > div:last-child {
  border-right: 0;
}

.prism-detail__facts dt {
  color: var(--prism-muted);
  font-size: 0.72rem;
  font-weight: 760;
}

.prism-detail__facts dd {
  margin: 7px 0 0;
  color: var(--prism-text);
  font-size: 0.9rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.prism-detail__body {
  padding: clamp(28px, 5vw, 54px);
  border: 1px solid var(--prism-border);
  border-top: 0;
  border-radius: 0 0 30px 30px;
  background: var(--prism-article);
}

.prism-detail__body section + section {
  margin-top: 36px;
  padding-top: 32px;
  border-top: 1px solid var(--prism-rule);
}

.prism-detail__body h2 {
  margin: 0 0 13px;
  color: var(--prism-text);
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: clamp(1.25rem, 3vw, 1.65rem);
  line-height: 1.4;
}

.prism-detail__body p {
  margin: 0;
  color: var(--prism-article-text);
  font-size: 1rem;
  line-height: 1.95;
  overflow-wrap: anywhere;
}

.prism-detail__body p + p {
  margin-top: 14px;
}

.prism-detail__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 14px;
  padding: 17px;
  border: 1px solid var(--prism-border);
  border-radius: 14px;
  background: var(--prism-panel);
}

.prism-detail__source-note {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 9px;
  color: var(--prism-muted);
  font-size: 0.78rem;
  line-height: 1.55;
}

.prism-detail__source-note i {
  margin-top: 3px;
  color: var(--prism-accent);
}

.prism-detail__open,
.prism-detail__closed button {
  display: inline-flex;
  min-height: 44px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  color: var(--prism-action-text);
  background: var(--prism-action);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 760;
  cursor: pointer;
}

.prism-detail__closed {
  display: grid;
  min-height: 420px;
  place-items: center;
  align-content: center;
  padding: 42px;
  border: 1px solid var(--prism-border);
  border-radius: 28px;
  color: var(--prism-text);
  text-align: center;
  background: var(--prism-panel);
}

.prism-detail__closed-icon {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border-radius: 24px;
  color: var(--prism-warning-text);
  background: var(--prism-warning-bg);
  font-size: 1.6rem;
}

.prism-detail__closed h1 {
  max-width: 20ch;
  margin: 20px 0 8px;
  font-family: Georgia, 'Noto Serif SC', serif;
  overflow-wrap: anywhere;
}

.prism-detail__closed p {
  max-width: 48ch;
  margin: 0 0 22px;
  color: var(--prism-text-soft);
  line-height: 1.7;
}

@media (max-width: 620px) {
  .prism-detail__header {
    margin: 0 -4px 12px;
    border-radius: 14px;
  }

  .prism-detail__hero {
    padding: 28px 22px 30px;
    border-radius: 24px 24px 12px 12px;
  }

  .prism-detail__hero h1 {
    font-size: clamp(1.8rem, 9vw, 2.65rem);
  }

  .prism-detail__facts {
    grid-template-columns: 1fr;
  }

  .prism-detail__facts > div {
    border-right: 0;
    border-bottom: 1px solid var(--prism-border);
  }

  .prism-detail__facts > div:last-child {
    border-bottom: 0;
  }

  .prism-detail__body {
    padding: 28px 22px;
    border-radius: 0 0 24px 24px;
  }

  .prism-detail__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .prism-detail__open {
    width: 100%;
  }
}
</style>
