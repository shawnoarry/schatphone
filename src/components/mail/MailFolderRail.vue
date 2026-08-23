<template>
  <nav class="daon-rail" :aria-label="railAriaLabel" data-testid="mail-folder-rail">
    <div class="daon-rail-account">
      <div class="daon-rail-account__avatar" aria-hidden="true">나</div>
      <div class="daon-rail-account__meta">
        <p class="daon-rail-account__name">{{ account.name }}</p>
        <p class="daon-rail-account__address">{{ account.address }}</p>
      </div>
      <span class="daon-rail-account__plan">{{ account.plan }}</span>
    </div>

    <ul class="daon-rail-folders" role="list">
      <li v-for="folder in folders" :key="folder.id" role="listitem">
        <button
          type="button"
          class="daon-rail-folder"
          :class="{ 'is-active': folder.active }"
          :data-testid="`mail-folder-${folder.id}`"
          :aria-current="folder.active ? 'true' : undefined"
          @click="$emit('select', folder.id)"
        >
          <i class="daon-rail-folder__icon" :class="folder.icon" aria-hidden="true"></i>
          <span class="daon-rail-folder__label">{{ folder.label }}</span>
          <span
            v-if="folder.count > 0"
            class="daon-rail-folder__count"
            :class="{ 'is-unread': folder.unread }"
          >
            {{ folder.count > 99 ? '99+' : folder.count }}
          </span>
        </button>
      </li>
    </ul>

    <p class="daon-rail-foot">{{ footNote }}</p>
  </nav>
</template>

<script setup>
defineProps({
  folders: { type: Array, required: true },
  account: { type: Object, required: true },
  railAriaLabel: { type: String, default: 'Mail folders' },
  footNote: { type: String, default: '' },
})

defineEmits(['select'])
</script>

<style scoped>
.daon-rail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  padding: 14px 10px 12px;
  background: var(--daon-panel);
  border-right: 1px solid var(--daon-line);
}

.daon-rail-account {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 10px;
  border: 1px solid var(--daon-line);
  border-radius: var(--daon-radius);
  background: var(--daon-green-soft);
  margin-bottom: 14px;
}

.daon-rail-account__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--daon-green);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
}

.daon-rail-account__meta {
  min-width: 0;
}

.daon-rail-account__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--daon-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daon-rail-account__address {
  font-size: 11.5px;
  color: var(--daon-ink-faint);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daon-rail-account__plan {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--daon-green-deep);
  border: 1px solid var(--daon-green);
  border-radius: 999px;
  padding: 2px 6px;
  white-space: nowrap;
}

.daon-rail-folders {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.daon-rail-folder {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: none;
  border-radius: var(--daon-radius-sm);
  background: transparent;
  color: var(--daon-ink-soft);
  font: inherit;
  font-size: 13.5px;
  text-align: start;
  cursor: pointer;
  transition: background-color var(--daon-motion), color var(--daon-motion);
}

.daon-rail-folder:hover {
  background: var(--daon-green-soft);
  color: var(--daon-ink);
}

.daon-rail-folder.is-active {
  background: var(--daon-green);
  color: #fff;
  font-weight: 700;
}

.daon-rail-folder__icon {
  font-size: 13px;
  text-align: center;
}

.daon-rail-folder__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daon-rail-folder__count {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 22px;
  text-align: center;
  padding: 2px 5px;
  border-radius: 999px;
  background: var(--daon-line);
  color: var(--daon-ink-soft);
}

.daon-rail-folder__count.is-unread {
  background: #fff;
  color: var(--daon-green-deep);
}

.daon-rail-folder.is-active .daon-rail-folder__count {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.daon-rail-foot {
  margin-top: auto;
  padding: 12px 10px 2px;
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--daon-ink-faint);
  border-top: 1px solid var(--daon-line);
}

.daon-rail-folder:focus-visible,
.daon-rail-account:focus-visible {
  outline: 3px solid var(--daon-green);
  outline-offset: 2px;
}

@media (max-width: 390px) {
  .daon-rail {
    padding: 10px 8px;
  }

  .daon-rail-folder {
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .daon-rail-folder {
    transition: none;
  }
}
</style>
