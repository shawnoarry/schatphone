<script setup>
import { computed, ref } from 'vue'
import CameraSettingsShell from '../components/camera/CameraSettingsShell.vue'
import { useI18n } from '../composables/useI18n'
import { useImageGenerationStore } from '../stores/imageGeneration'

const { t } = useI18n()
const imageStore = useImageGenerationStore()
const savedModule = ref('')

const modules = computed(() => [
  { key: 'camera', icon: 'fas fa-camera', label: t('相机', 'Camera'), note: t('手动创作与编辑', 'Manual creation and editing') },
  { key: 'chat', icon: 'fas fa-comment', label: t('聊天', 'Chat'), note: t('角色发送图片时', 'When a role sends an image') },
  { key: 'community', icon: 'fas fa-users', label: t('社区', 'Community'), note: t('动态与帖子配图', 'Post and feed imagery') },
  { key: 'map', icon: 'fas fa-map-location-dot', label: t('地图', 'Map'), note: t('地点与场景图片', 'Place and scene imagery') },
])

const routeValue = (moduleKey) => {
  const route = imageStore.moduleRouting[moduleKey]
  return route?.mode === 'profile' && route.profileId ? route.profileId : 'default'
}

const updateRoute = (moduleKey, value) => {
  imageStore.updateModuleRoute(moduleKey, value === 'default'
    ? { mode: 'default', profileId: '' }
    : { mode: 'profile', profileId: value })
  savedModule.value = moduleKey
  window.setTimeout(() => {
    if (savedModule.value === moduleKey) savedModule.value = ''
  }, 1000)
}
</script>

<template>
  <CameraSettingsShell
    :title="t('接口分配', 'App Routing')"
    :back-label="t('设置', 'Settings')"
  >
    <section class="camera-routing-intro">
      <i class="fas fa-share-nodes" aria-hidden="true"></i>
      <div>
        <h2>{{ t('一套配置，多处使用', 'One registry, app-specific choices') }}</h2>
        <p>{{ t('未单独指定的功能始终跟随默认接口；这里只保存配置引用，不复制 URL 或 Key。', 'Apps follow the default provider unless overridden here. Routing stores a profile reference, never another URL or key.') }}</p>
      </div>
    </section>

    <section class="camera-routing-list">
      <label v-for="item in modules" :key="item.key" class="camera-routing-row">
        <span class="camera-routing-icon"><i :class="item.icon" aria-hidden="true"></i></span>
        <span class="camera-routing-copy">
          <strong>{{ item.label }}</strong>
          <small>{{ item.note }}</small>
        </span>
        <select :value="routeValue(item.key)" @change="updateRoute(item.key, $event.target.value)">
          <option value="default">{{ t('跟随默认', 'Use Default') }}</option>
          <option v-for="profile in imageStore.profiles" :key="profile.id" :value="profile.id">
            {{ profile.name }}
          </option>
        </select>
        <i v-if="savedModule === item.key" class="fas fa-check camera-routing-saved" aria-hidden="true"></i>
      </label>
    </section>
  </CameraSettingsShell>
</template>

<style scoped>
.camera-routing-intro {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 12px;
  padding: 13px;
  border: 1px solid rgba(21, 112, 239, 0.12);
  border-radius: 8px;
  color: #155fb9;
  background: rgba(21, 112, 239, 0.06);
}

.camera-routing-intro > i {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  color: #fff;
  background: #1570ef;
}

.camera-routing-intro h2,
.camera-routing-intro p { margin: 0; }
.camera-routing-intro h2 { font-size: 12px; }
.camera-routing-intro p { margin-top: 5px; color: #55708d; font-size: 9px; line-height: 1.45; }

.camera-routing-list {
  overflow: hidden;
  margin-top: 17px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 8px;
  background: #fff;
}

.camera-routing-row {
  position: relative;
  min-height: 72px;
  display: grid;
  grid-template-columns: 36px minmax(82px, 1fr) minmax(96px, auto);
  align-items: center;
  gap: 10px;
  padding: 10px 13px;
}

.camera-routing-row + .camera-routing-row { border-top: 1px solid rgba(17, 24, 39, 0.08); }

.camera-routing-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  color: #4a4f57;
  background: #eceef1;
}

.camera-routing-copy { min-width: 0; }
.camera-routing-copy strong,
.camera-routing-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.camera-routing-copy strong { font-size: 11px; }
.camera-routing-copy small { margin-top: 3px; color: #85888f; font-size: 8px; }

.camera-routing-row select {
  max-width: 132px;
  min-width: 0;
  color: #1566ce;
  background: transparent;
  text-align: right;
  font-size: 9px;
  outline: none;
}

.camera-routing-saved {
  position: absolute;
  top: 6px;
  right: 7px;
  color: #23964f;
  font-size: 7px;
}
</style>
