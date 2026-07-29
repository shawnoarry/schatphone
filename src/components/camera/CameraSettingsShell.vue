<script setup>
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: 'CAMERA' },
  backTo: { type: String, default: '/camera/settings' },
  backLabel: { type: String, default: 'Back' },
})

const router = useRouter()
const route = useRoute()

const goBack = () => {
  router.push({ path: props.backTo, query: { ...route.query } })
}
</script>

<template>
  <div class="camera-settings-shell">
    <header class="camera-settings-nav">
      <button type="button" class="camera-settings-back" :aria-label="backLabel" @click="goBack">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
        <span>{{ backLabel }}</span>
      </button>
      <div class="camera-settings-heading">
        <span>{{ eyebrow }}</span>
        <h1>{{ title }}</h1>
      </div>
      <div class="camera-settings-actions">
        <slot name="actions"></slot>
      </div>
    </header>

    <main class="camera-settings-content no-scrollbar">
      <slot></slot>
    </main>
  </div>
</template>

<style scoped>
.camera-settings-shell {
  --camera-ink: #17181b;
  --camera-muted: #74777f;
  --camera-line: rgba(19, 24, 33, 0.1);
  --camera-accent: #1570ef;
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--camera-ink);
  background: #f4f5f7;
}

.camera-settings-nav {
  min-height: 84px;
  padding: 34px 18px 10px;
  display: grid;
  grid-template-columns: minmax(72px, 1fr) auto minmax(72px, 1fr);
  align-items: center;
  border-bottom: 1px solid var(--camera-line);
  background: rgba(250, 250, 251, 0.9);
  backdrop-filter: blur(24px);
  z-index: 2;
}

.camera-settings-back,
.camera-settings-actions {
  min-width: 0;
}

.camera-settings-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--camera-accent);
  font-size: 13px;
  justify-self: start;
}

.camera-settings-back span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.camera-settings-heading {
  min-width: 0;
  text-align: center;
}

.camera-settings-heading span {
  display: block;
  color: var(--camera-muted);
  font-size: 8px;
  font-weight: 800;
}

.camera-settings-heading h1 {
  margin: 2px 0 0;
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 760;
}

.camera-settings-actions {
  justify-self: end;
}

.camera-settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 18px 16px calc(34px + env(safe-area-inset-bottom));
}

@media (min-width: 720px) {
  .camera-settings-content {
    width: min(100%, 720px);
    margin: 0 auto;
    padding-top: 24px;
  }
}
</style>
