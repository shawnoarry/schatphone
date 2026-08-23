<template>
  <form class="prism-search" role="search" @submit.prevent="$emit('submit')">
    <span class="prism-search__lens" aria-hidden="true">
      <i class="fas fa-magnifying-glass"></i>
    </span>
    <input
      :value="modelValue"
      class="prism-search__input"
      type="search"
      autocomplete="off"
      enterkeyhint="search"
      :placeholder="placeholder"
      :aria-label="ariaLabel"
      data-testid="browser-search-input"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <button
      v-if="modelValue"
      type="button"
      class="prism-search__clear"
      :aria-label="clearLabel"
      data-testid="browser-search-clear"
      @click="$emit('clear')"
    >
      <i class="fas fa-circle-xmark" aria-hidden="true"></i>
    </button>
    <button class="prism-search__submit" type="submit" data-testid="browser-search-submit">
      {{ submitLabel }}
    </button>
  </form>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, required: true },
  ariaLabel: { type: String, required: true },
  clearLabel: { type: String, required: true },
  submitLabel: { type: String, required: true },
})

defineEmits(['update:modelValue', 'submit', 'clear'])
</script>

<style scoped>
.prism-search {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  min-height: 56px;
  border: 1px solid var(--prism-border-strong);
  border-radius: 18px;
  background: var(--prism-search-bg);
  box-shadow: var(--prism-search-shadow);
  overflow: hidden;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.prism-search:focus-within {
  border-color: var(--prism-accent);
  box-shadow: 0 0 0 3px var(--prism-focus), var(--prism-search-shadow);
}

.prism-search__lens {
  display: grid;
  width: 50px;
  place-items: center;
  color: var(--prism-muted);
}

.prism-search__input {
  min-width: 0;
  height: 54px;
  border: 0;
  outline: 0;
  color: var(--prism-text);
  background: transparent;
  font: inherit;
  font-size: 1rem;
}

.prism-search__input::placeholder {
  color: var(--prism-muted);
}

.prism-search__clear {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 12px;
  color: var(--prism-muted);
  background: transparent;
  cursor: pointer;
}

.prism-search__clear:hover {
  color: var(--prism-text);
  background: var(--prism-hover);
}

.prism-search__submit {
  align-self: stretch;
  min-width: 72px;
  border: 0;
  color: var(--prism-action-text);
  background: var(--prism-action);
  font: inherit;
  font-weight: 760;
  cursor: pointer;
}

.prism-search__submit:hover {
  background: var(--prism-action-hover);
}

.prism-search__clear:focus-visible,
.prism-search__submit:focus-visible {
  outline: 3px solid var(--prism-focus);
  outline-offset: -3px;
}

@media (max-width: 560px) {
  .prism-search {
    min-height: 52px;
    border-radius: 16px;
  }

  .prism-search__lens {
    width: 42px;
  }

  .prism-search__input {
    height: 50px;
    font-size: 0.94rem;
  }

  .prism-search__submit {
    min-width: 64px;
  }
}
</style>
