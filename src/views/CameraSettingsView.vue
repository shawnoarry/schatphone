<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CameraSettingsShell from '../components/camera/CameraSettingsShell.vue'
import { useI18n } from '../composables/useI18n'
import { useImageGenerationStore } from '../stores/imageGeneration'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const imageStore = useImageGenerationStore()

const activeProfile = computed(() => imageStore.getProfileForModule('camera'))
const connectionReady = computed(() => Boolean(
  activeProfile.value && imageStore.getCredentials(activeProfile.value.id).apiKey,
))

const rows = computed(() => [
  {
    id: 'providers',
    icon: 'fas fa-server',
    tone: 'blue',
    title: t('接口与模型', 'Providers & Models'),
    detail: t(`${imageStore.profiles.length} 个配置`, `${imageStore.profiles.length} profiles`),
    route: '/camera/settings/providers',
  },
  {
    id: 'defaults',
    icon: 'fas fa-sliders',
    tone: 'amber',
    title: t('默认生成参数', 'Generation Defaults'),
    detail: `${imageStore.defaults.aspectRatio} · ${imageStore.defaults.resolution || t('比例模式', 'Ratio only')} · ${imageStore.defaults.count}×`,
    route: '/camera/settings/defaults',
  },
  {
    id: 'routing',
    icon: 'fas fa-share-nodes',
    tone: 'green',
    title: t('其他功能使用的接口', 'App Routing'),
    detail: t('聊天、社区、地图', 'Chat, Community, Map'),
    route: '/camera/settings/app-routing',
  },
  {
    id: 'diagnostics',
    icon: 'fas fa-stethoscope',
    tone: 'gray',
    title: t('诊断与隐私', 'Diagnostics & Privacy'),
    detail: imageStore.diagnostics.length
      ? t(`${imageStore.diagnostics.length} 条记录`, `${imageStore.diagnostics.length} records`)
      : t('暂无异常', 'No recent issues'),
    route: '/camera/settings/diagnostics',
  },
])

const openRow = (path) => router.push({ path, query: { ...route.query } })
</script>

<template>
  <CameraSettingsShell
    :title="t('相机设置', 'Camera Settings')"
    :back-label="t('相机', 'Camera')"
    back-to="/camera"
  >
    <section class="camera-settings-summary">
      <div class="camera-settings-summary-icon">
        <i class="fas fa-camera" aria-hidden="true"></i>
      </div>
      <div class="camera-settings-summary-copy">
        <span>{{ connectionReady ? t('可以生成', 'READY') : t('需要配置', 'SETUP NEEDED') }}</span>
        <h2>{{ activeProfile?.name || t('尚未选择接口', 'No provider selected') }}</h2>
        <p>{{ activeProfile?.modelId || t('进入接口与模型完成设置', 'Open Providers & Models to finish setup') }}</p>
      </div>
      <span class="camera-settings-status" :class="{ 'is-ready': connectionReady }"></span>
    </section>

    <section class="camera-settings-group" aria-label="Camera configuration categories">
      <button
        v-for="row in rows"
        :key="row.id"
        type="button"
        class="camera-settings-row"
        :data-testid="`camera-settings-${row.id}`"
        @click="openRow(row.route)"
      >
        <span class="camera-settings-row-icon" :class="`is-${row.tone}`">
          <i :class="row.icon" aria-hidden="true"></i>
        </span>
        <span class="camera-settings-row-copy">
          <strong>{{ row.title }}</strong>
          <small>{{ row.detail }}</small>
        </span>
        <i class="fas fa-chevron-right camera-settings-chevron" aria-hidden="true"></i>
      </button>
    </section>

    <p class="camera-settings-note">
      {{ t('API Key 与代理 Token 只保存在当前设备，不会进入普通明文备份。', 'API keys and proxy tokens stay on this device and are excluded from ordinary plaintext backups.') }}
    </p>
  </CameraSettingsShell>
</template>

<style scoped>
.camera-settings-summary {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 10px;
  align-items: center;
  gap: 13px;
  min-height: 86px;
  padding: 14px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 8px;
  background: #fff;
}

.camera-settings-summary-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  background: #17191d;
  font-size: 20px;
}

.camera-settings-summary-copy {
  min-width: 0;
}

.camera-settings-summary-copy span {
  color: #7b7e86;
  font-size: 8px;
  font-weight: 850;
}

.camera-settings-summary-copy h2,
.camera-settings-summary-copy p {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.camera-settings-summary-copy h2 {
  margin-top: 3px;
  font-size: 16px;
}

.camera-settings-summary-copy p {
  margin-top: 4px;
  color: #767982;
  font-size: 10px;
}

.camera-settings-status {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ff453a;
}

.camera-settings-status.is-ready { background: #2ebd55; }

.camera-settings-group {
  overflow: hidden;
  margin-top: 18px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 8px;
  background: #fff;
}

.camera-settings-row {
  width: 100%;
  min-height: 66px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 11px;
  padding: 10px 13px;
  text-align: left;
}

.camera-settings-row + .camera-settings-row {
  border-top: 1px solid rgba(17, 24, 39, 0.08);
}

.camera-settings-row-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  color: #fff;
  font-size: 13px;
}

.camera-settings-row-icon.is-blue { background: #1570ef; }
.camera-settings-row-icon.is-amber { background: #e59b15; }
.camera-settings-row-icon.is-green { background: #259a54; }
.camera-settings-row-icon.is-gray { background: #62666f; }

.camera-settings-row-copy {
  min-width: 0;
}

.camera-settings-row-copy strong,
.camera-settings-row-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.camera-settings-row-copy strong {
  font-size: 13px;
  font-weight: 690;
}

.camera-settings-row-copy small {
  margin-top: 3px;
  color: #7a7d85;
  font-size: 9px;
}

.camera-settings-chevron {
  color: #b1b3b8;
  font-size: 10px;
}

.camera-settings-note {
  margin: 12px 5px 0;
  color: #777a82;
  font-size: 9px;
  line-height: 1.55;
}
</style>
