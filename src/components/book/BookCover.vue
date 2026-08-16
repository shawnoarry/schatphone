<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  category: { type: String, default: 'encyclopedia' },
  categoryLabel: { type: String, default: '' },
  active: { type: Boolean, default: false },
  bandLabel: { type: String, default: '' },
  size: { type: String, default: 'md' },
})

const toneClass = computed(
  () => ({ worldview: 'is-wv', world_rule: 'is-wr' }[props.category] || 'is-en'),
)
</script>

<template>
  <span :class="['book-cover', toneClass, `is-${size}`]" aria-hidden="true">
    <span class="book-cover__motif"></span>
    <span class="book-cover__cat">{{ categoryLabel }}</span>
    <span class="book-cover__title">{{ title }}</span>
    <span v-if="active && bandLabel" class="book-cover__band">{{ bandLabel }}</span>
  </span>
</template>

<style scoped>
.book-cover {
  position: relative;
  display: block;
  width: 96px;
  height: 136px;
  border-radius: 4px 10px 10px 4px;
  overflow: hidden;
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.94);
  box-shadow:
    inset 4px 0 8px rgba(0, 0, 0, 0.18),
    0 8px 18px rgba(38, 34, 27, 0.18);
}

.book-cover.is-wv { background: linear-gradient(160deg, var(--book-wv-a), var(--book-wv-b)); }
.book-cover.is-en { background: linear-gradient(160deg, var(--book-en-a), var(--book-en-b)); }
.book-cover.is-wr { background: linear-gradient(160deg, var(--book-wr-a), var(--book-wr-b)); }

.book-cover::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 7px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.28), transparent);
}

.book-cover::after {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.04) 0 2px, transparent 2px 5px);
}

.book-cover__motif {
  position: absolute;
  right: -14px;
  bottom: -14px;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
}

.book-cover__motif::after {
  content: "";
  position: absolute;
  inset: 14px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.18);
}

.book-cover__cat {
  position: absolute;
  top: 10px;
  left: 12px;
  padding: 3px 6px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 3px;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.2em;
}

.book-cover__title {
  position: absolute;
  top: 34px;
  left: 12px;
  right: 10px;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.35;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-cover__band {
  position: absolute;
  left: 0;
  bottom: 12px;
  padding: 3px 8px 3px 10px;
  border-radius: 0 3px 3px 0;
  background: var(--book-accent);
  color: #fff;
  font-size: 8px;
  font-weight: 800;
}

.book-cover.is-lg {
  width: 128px;
  height: 182px;
  border-radius: 5px 12px 12px 5px;
  box-shadow:
    inset 5px 0 10px rgba(0, 0, 0, 0.2),
    0 18px 34px rgba(38, 34, 27, 0.24);
}

.book-cover.is-lg .book-cover__title {
  top: 44px;
  font-size: 20px;
}

.book-cover.is-lg .book-cover__cat {
  font-size: 9px;
}
</style>
