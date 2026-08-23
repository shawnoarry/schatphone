<template>
  <div class="prism-empty" data-testid="browser-empty-state">
    <span class="prism-empty__icon" aria-hidden="true"><i class="fas" :class="icon"></i></span>
    <h2>{{ title }}</h2>
    <p>{{ body }}</p>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
})
</script>

<style scoped>
.prism-empty {
  display: grid;
  min-height: 330px;
  place-items: center;
  align-content: center;
  padding: 36px;
  border: 1px dashed var(--prism-border-strong);
  border-radius: 22px;
  text-align: center;
  background: color-mix(in srgb, var(--prism-panel) 80%, transparent);
}

.prism-empty__icon {
  display: grid;
  width: 66px;
  height: 66px;
  place-items: center;
  border-radius: 22px;
  color: var(--prism-accent);
  background: var(--prism-hover);
  font-size: 1.45rem;
}

.prism-empty h2 {
  margin: 18px 0 7px;
  color: var(--prism-text);
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: 1.35rem;
}

.prism-empty p {
  max-width: 48ch;
  margin: 0;
  color: var(--prism-text-soft);
  line-height: 1.7;
}

.prism-empty :deep(button) {
  min-height: 44px;
  margin-top: 18px;
  padding: 0 15px;
  border: 1px solid var(--prism-border-strong);
  border-radius: 12px;
  color: var(--prism-accent-strong);
  background: transparent;
  font: inherit;
  font-weight: 740;
  cursor: pointer;
}
</style>
