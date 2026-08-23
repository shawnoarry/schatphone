<template>
  <section class="daon-list" data-testid="mail-thread-list" :aria-label="listAriaLabel">
    <div class="daon-list-search" role="search">
      <i class="fas fa-magnifying-glass daon-list-search__icon" aria-hidden="true"></i>
      <input
        class="daon-list-search__input"
        type="search"
        :value="searchQuery"
        :placeholder="searchPlaceholder"
        :aria-label="searchAriaLabel"
        data-testid="mail-search-input"
        @input="$emit('update:search-query', $event.target.value)"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="daon-list-search__clear"
        :aria-label="clearSearchLabel"
        data-testid="mail-search-clear"
        @click="$emit('update:search-query', '')"
      >
        <i class="fas fa-circle-xmark" aria-hidden="true"></i>
      </button>
    </div>

    <p v-if="searchQuery" class="daon-list-meta" role="status">
      {{ resultMeta }}
    </p>

    <div class="daon-list-scroll">
      <ul v-if="rows.length" class="daon-list-rows" role="list">
        <li
          v-for="(row, index) in rows"
          :key="row.id"
          role="listitem"
          class="daon-list-row-wrap"
          :style="{ '--row-index': Math.min(index, 11) }"
        >
          <div
            class="daon-list-row"
            :class="{ 'is-selected': row.selected, 'is-unread': row.unread }"
            role="button"
            tabindex="0"
            :data-testid="`mail-thread-row-${row.id}`"
            :aria-label="`${row.title} · ${row.subject}`"
            @click="$emit('select', row)"
            @keydown.enter.prevent="$emit('select', row)"
            @keydown.space.prevent="$emit('select', row)"
          >
            <span class="daon-list-row__avatar" :class="`is-tone-${row.avatarTone}`" aria-hidden="true">
              {{ row.avatarText }}
            </span>
            <span class="daon-list-row__body">
              <span class="daon-list-row__top">
                <span class="daon-list-row__sender">{{ row.title }}</span>
                <span class="daon-list-row__time">{{ row.timeLabel }}</span>
              </span>
              <span class="daon-list-row__subject">
                <span
                  v-for="chip in row.chips"
                  :key="chip.id"
                  class="daon-chip"
                  :class="`is-tone-${chip.tone}`"
                >
                  {{ chip.text }}
                </span>
                <span class="daon-list-row__subject-text">{{ row.subject }}</span>
              </span>
              <span class="daon-list-row__preview">
                <i v-if="row.hasAttachment" class="fas fa-paperclip" aria-hidden="true"></i>
                {{ row.preview }}
              </span>
            </span>
            <span class="daon-list-row__side">
              <span v-if="row.unread" class="daon-list-row__dot" aria-hidden="true"></span>
              <button
                v-if="row.starred !== undefined"
                type="button"
                class="daon-list-row__star"
                :class="{ 'is-starred': row.starred }"
                :aria-label="row.starred ? unstarLabel(row.title) : starLabel(row.title)"
                :data-testid="`mail-star-${row.id}`"
                @click.stop="$emit('toggle-star', row.id)"
              >
                <i class="fas fa-star" aria-hidden="true"></i>
              </button>
              <button
                v-if="row.deletable"
                type="button"
                class="daon-list-row__star"
                :aria-label="deleteDraftLabel(row.subject)"
                :data-testid="`mail-draft-delete-${row.id}`"
                @click.stop="$emit('delete-draft', row.id)"
              >
                <i class="fas fa-trash-can" aria-hidden="true"></i>
              </button>
            </span>
          </div>
        </li>
      </ul>

      <div v-else class="daon-list-empty" data-testid="mail-list-empty">
        <i class="daon-list-empty__icon" :class="emptyIcon" aria-hidden="true"></i>
        <p class="daon-list-empty__title">{{ emptyTitle }}</p>
        <p class="daon-list-empty__hint">{{ emptyHint }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  rows: { type: Array, required: true },
  searchQuery: { type: String, default: '' },
  searchPlaceholder: { type: String, default: '' },
  searchAriaLabel: { type: String, default: '' },
  clearSearchLabel: { type: String, default: '' },
  resultMeta: { type: String, default: '' },
  listAriaLabel: { type: String, default: 'Mail list' },
  emptyIcon: { type: String, default: 'fas fa-inbox' },
  emptyTitle: { type: String, required: true },
  emptyHint: { type: String, default: '' },
  starLabel: { type: Function, required: true },
  unstarLabel: { type: Function, required: true },
  deleteDraftLabel: { type: Function, default: () => '' },
})

defineEmits(['select', 'toggle-star', 'delete-draft', 'update:search-query'])
</script>

<style scoped>
.daon-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  background: var(--daon-panel);
}

.daon-list-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--daon-line);
  background: var(--daon-panel);
}

.daon-list-search__icon {
  font-size: 12px;
  color: var(--daon-ink-faint);
}

.daon-list-search__input {
  flex: 1;
  min-width: 0;
  border: none;
  background: var(--daon-paper);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 16px;
  font-family: inherit;
  color: var(--daon-ink);
  outline: none;
}

.daon-list-search__input::placeholder {
  color: var(--daon-ink-faint);
  font-size: 13px;
}

.daon-list-search__input:focus-visible {
  outline: 3px solid var(--daon-green);
  outline-offset: 1px;
}

.daon-list-search__clear {
  border: none;
  background: transparent;
  color: var(--daon-ink-faint);
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  font-size: 15px;
  cursor: pointer;
  border-radius: 50%;
}

.daon-list-search__clear:hover {
  color: var(--daon-ink);
}

.daon-list-meta {
  padding: 6px 16px;
  font-size: 11.5px;
  color: var(--daon-green-deep);
  background: var(--daon-green-soft);
  border-bottom: 1px solid var(--daon-line);
  font-variant-numeric: tabular-nums;
}

.daon-list-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.daon-list-rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.daon-list-row-wrap {
  animation: daon-row-in 220ms var(--daon-ease) both;
  animation-delay: calc(var(--row-index, 0) * 18ms);
}

@keyframes daon-row-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.daon-list-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 11px 14px;
  border: none;
  border-bottom: 1px solid var(--daon-line);
  background: transparent;
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: background-color var(--daon-motion);
}

.daon-list-row:hover {
  background: var(--daon-green-soft);
}

.daon-list-row.is-selected {
  background: var(--daon-green-soft);
  box-shadow: inset 3px 0 0 var(--daon-green);
}

.daon-list-row__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 800;
}

.daon-list-row__avatar.is-tone-green {
  background: var(--daon-tone-green-soft);
  color: var(--daon-tone-green);
}
.daon-list-row__avatar.is-tone-blue {
  background: var(--daon-tone-blue-soft);
  color: var(--daon-tone-blue);
}
.daon-list-row__avatar.is-tone-rose {
  background: var(--daon-tone-rose-soft);
  color: var(--daon-tone-rose);
}
.daon-list-row__avatar.is-tone-amber {
  background: var(--daon-tone-amber-soft);
  color: var(--daon-tone-amber);
}
.daon-list-row__avatar.is-tone-violet {
  background: var(--daon-tone-violet-soft);
  color: var(--daon-tone-violet);
}
.daon-list-row__avatar.is-tone-teal {
  background: var(--daon-tone-teal-soft);
  color: var(--daon-tone-teal);
}
.daon-list-row__avatar.is-tone-slate {
  background: var(--daon-tone-slate-soft);
  color: var(--daon-tone-slate);
}

.daon-list-row__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.daon-list-row__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.daon-list-row__sender {
  font-size: 13.5px;
  color: var(--daon-ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daon-list-row.is-unread .daon-list-row__sender {
  color: var(--daon-ink);
  font-weight: 700;
}

.daon-list-row__time {
  font-size: 11px;
  color: var(--daon-ink-faint);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.daon-list-row__subject {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.daon-list-row__subject-text {
  font-size: 13.5px;
  color: var(--daon-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daon-list-row.is-unread .daon-list-row__subject-text {
  font-weight: 700;
}

.daon-chip {
  flex: none;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 1.5px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.daon-chip.is-tone-green {
  background: var(--daon-tone-green-soft);
  color: var(--daon-tone-green);
}
.daon-chip.is-tone-blue {
  background: var(--daon-tone-blue-soft);
  color: var(--daon-tone-blue);
}
.daon-chip.is-tone-rose {
  background: var(--daon-tone-rose-soft);
  color: var(--daon-tone-rose);
}
.daon-chip.is-tone-amber {
  background: var(--daon-tone-amber-soft);
  color: var(--daon-tone-amber);
}
.daon-chip.is-tone-violet {
  background: var(--daon-tone-violet-soft);
  color: var(--daon-tone-violet);
}
.daon-chip.is-tone-teal {
  background: var(--daon-tone-teal-soft);
  color: var(--daon-tone-teal);
}
.daon-chip.is-tone-slate {
  background: var(--daon-tone-slate-soft);
  color: var(--daon-tone-slate);
}

.daon-list-row__preview {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--daon-ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daon-list-row__preview i {
  font-size: 10px;
  flex: none;
}

.daon-list-row__side {
  display: flex;
  align-items: center;
  gap: 4px;
}

.daon-list-row__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--daon-green);
  flex: none;
}

.daon-list-row__star {
  border: none;
  background: transparent;
  color: var(--daon-line-strong);
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  font-size: 14px;
  cursor: pointer;
  border-radius: 50%;
  transition: color var(--daon-motion);
}

.daon-list-row__star:hover {
  color: var(--daon-star);
}

.daon-list-row__star.is-starred {
  color: var(--daon-star);
}

.daon-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 56px 24px;
  text-align: center;
}

.daon-list-empty__icon {
  font-size: 30px;
  color: var(--daon-line-strong);
}

.daon-list-empty__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--daon-ink-soft);
}

.daon-list-empty__hint {
  font-size: 12px;
  line-height: 1.7;
  color: var(--daon-ink-faint);
  max-width: 260px;
}

.daon-list-row:focus-visible,
.daon-list-search__clear:focus-visible {
  outline: 3px solid var(--daon-green);
  outline-offset: -3px;
}

@media (max-width: 390px) {
  .daon-list-row {
    grid-template-columns: 32px minmax(0, 1fr) auto;
    gap: 9px;
    padding: 10px 12px;
  }

  .daon-list-row__avatar {
    width: 32px;
    height: 32px;
    font-size: 13px;
  }

  .daon-list-row__star {
    min-width: 38px;
    min-height: 38px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .daon-list-row-wrap {
    animation: none;
  }

  .daon-list-row,
  .daon-list-row__star {
    transition: none;
  }
}
</style>
