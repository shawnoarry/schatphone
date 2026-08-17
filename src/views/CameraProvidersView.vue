<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CameraSettingsShell from '../components/camera/CameraSettingsShell.vue'
import { useI18n } from '../composables/useI18n'
import { useImageGenerationStore } from '../stores/imageGeneration'
import { resolveImageAdapterKind } from '../lib/image-generation-contract'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const imageStore = useImageGenerationStore()
const returnsToMapSettings = computed(() => {
  const source = Array.isArray(route.query.source) ? route.query.source[0] : route.query.source
  return source === 'map-settings'
})

const profiles = computed(() => imageStore.profiles)

const adapterLabel = (profile) => {
  const kind = resolveImageAdapterKind(profile)
  if (kind === 'openai_images') return 'Images API'
  if (kind === 'grsai_async') return 'Grsai Async'
  return 'Chat Image'
}

const openProfile = (profileId) => router.push({
  path: `/camera/settings/providers/${profileId}`,
  query: { ...route.query },
})
</script>

<template>
  <CameraSettingsShell
    :title="t('接口与模型', 'Providers & Models')"
    :back-label="returnsToMapSettings ? t('地图设置', 'Map settings') : t('设置', 'Settings')"
    :back-to="returnsToMapSettings ? '/map/settings' : '/camera/settings'"
  >
    <template #actions>
      <button
        type="button"
        class="camera-add-profile"
        :aria-label="t('新增接口', 'Add provider')"
        @click="openProfile('new')"
      >
        <i class="fas fa-plus" aria-hidden="true"></i>
      </button>
    </template>

    <section class="camera-provider-list">
      <button
        v-for="profile in profiles"
        :key="profile.id"
        type="button"
        class="camera-provider-row"
        :data-testid="`camera-provider-${profile.id}`"
        @click="openProfile(profile.id)"
      >
        <span class="camera-provider-mark" :class="{ 'is-active': imageStore.defaults.activeProfileId === profile.id }">
          <i class="fas fa-server" aria-hidden="true"></i>
        </span>
        <span class="camera-provider-copy">
          <strong>{{ profile.name }}</strong>
          <small>{{ profile.modelId }}</small>
          <em>{{ adapterLabel(profile) }}</em>
        </span>
        <span class="camera-provider-state">
          <i v-if="imageStore.defaults.activeProfileId === profile.id" class="fas fa-check" aria-hidden="true"></i>
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </span>
      </button>
    </section>

    <p class="camera-provider-note">
      {{ t('默认配置供所有未单独指定接口的功能使用。每个功能的覆盖规则在“其他功能使用的接口”中设置。', 'The default profile serves every app without an override. Configure overrides under App Routing.') }}
    </p>
  </CameraSettingsShell>
</template>

<style scoped>
.camera-add-profile {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.camera-provider-list {
  overflow: hidden;
  border: 1px solid var(--system-subtle-border);
  border-radius: 8px;
  background: var(--system-panel-bg);
}

.camera-provider-row {
  width: 100%;
  min-height: 76px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding: 11px 13px;
  text-align: left;
}

.camera-provider-row + .camera-provider-row {
  border-top: 1px solid var(--system-subtle-border);
}

.camera-provider-mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
}

.camera-provider-mark.is-active {
  color: var(--system-text-inverse);
  background: var(--system-text);
}

.camera-provider-copy {
  min-width: 0;
}

.camera-provider-copy strong,
.camera-provider-copy small,
.camera-provider-copy em {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.camera-provider-copy strong { font-size: 13px; }
.camera-provider-copy small { margin-top: 3px; color: var(--system-text-muted); font-size: 10px; }
.camera-provider-copy em { margin-top: 3px; color: var(--system-text-soft); font-size: 8px; font-style: normal; }

.camera-provider-state {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--system-text-soft);
  font-size: 10px;
}

.camera-provider-state .fa-check { color: var(--system-success); }

.camera-provider-note {
  margin: 12px 5px 0;
  color: var(--system-text-soft);
  font-size: 9px;
  line-height: 1.55;
}
</style>
