<script setup>
import CameraSettingsShell from '../components/camera/CameraSettingsShell.vue'
import { useI18n } from '../composables/useI18n'
import { useImageGenerationStore } from '../stores/imageGeneration'

const { t } = useI18n()
const imageStore = useImageGenerationStore()

const profileName = (profileId) => imageStore.getProfileById(profileId)?.name || t('未知接口', 'Unknown provider')
const formatTime = (value) => value ? new Date(value).toLocaleString() : '—'
</script>

<template>
  <CameraSettingsShell
    :title="t('诊断与隐私', 'Diagnostics & Privacy')"
    :back-label="t('设置', 'Settings')"
  >
    <section class="camera-privacy-list">
      <div>
        <span class="is-green"><i class="fas fa-key" aria-hidden="true"></i></span>
        <p><strong>{{ t('凭据仅在本机', 'Credentials stay local') }}</strong><small>{{ t('Key 与代理 Token 不进入普通明文备份', 'Keys and proxy tokens are excluded from ordinary plaintext backup') }}</small></p>
      </div>
      <div>
        <span class="is-blue"><i class="fas fa-images" aria-hidden="true"></i></span>
        <p><strong>{{ t('候选图不是相册资产', 'Candidates are not Gallery assets') }}</strong><small>{{ t('只有“保留到相册”会创建可复用素材', 'Only Keep in Gallery creates reusable media') }}</small></p>
      </div>
      <div>
        <span class="is-gray"><i class="fas fa-eye-slash" aria-hidden="true"></i></span>
        <p><strong>{{ t('诊断已脱敏', 'Diagnostics are redacted') }}</strong><small>{{ t('不记录 Key、Token、查询参数或完整请求体', 'No keys, tokens, query strings, or full request bodies') }}</small></p>
      </div>
    </section>

    <div class="camera-diagnostics-heading">
      <h2>{{ t('最近记录', 'RECENT DIAGNOSTICS') }}</h2>
      <button v-if="imageStore.diagnostics.length" type="button" @click="imageStore.clearDiagnostics">
        {{ t('清空', 'Clear') }}
      </button>
    </div>

    <section v-if="imageStore.diagnostics.length" class="camera-diagnostics-list">
      <article v-for="item in imageStore.diagnostics" :key="item.id" :class="`is-${item.level}`">
        <span class="camera-diagnostic-dot"></span>
        <div>
          <div class="camera-diagnostic-title">
            <strong>{{ profileName(item.profileId) }}</strong>
            <time>{{ formatTime(item.createdAt) }}</time>
          </div>
          <p>{{ item.message }}</p>
          <small>{{ item.action }} · {{ item.code || '—' }}</small>
        </div>
      </article>
    </section>
    <div v-else class="camera-diagnostics-empty">
      <i class="fas fa-circle-check" aria-hidden="true"></i>
      <p>{{ t('暂无诊断记录', 'No diagnostic records') }}</p>
    </div>
  </CameraSettingsShell>
</template>

<style scoped>
.camera-privacy-list,
.camera-diagnostics-list {
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 8px;
  background: #fff;
}

.camera-privacy-list > div {
  min-height: 62px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  padding: 10px 13px;
}

.camera-privacy-list > div + div { border-top: 1px solid rgba(17, 24, 39, 0.08); }
.camera-privacy-list span { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 7px; color: #fff; }
.camera-privacy-list span.is-green { background: #259a54; }
.camera-privacy-list span.is-blue { background: #1570ef; }
.camera-privacy-list span.is-gray { background: #666a73; }
.camera-privacy-list p,
.camera-privacy-list strong,
.camera-privacy-list small { display: block; margin: 0; }
.camera-privacy-list strong { font-size: 11px; }
.camera-privacy-list small { margin-top: 3px; color: #777a82; font-size: 8px; line-height: 1.4; }

.camera-diagnostics-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 18px 4px 7px;
}

.camera-diagnostics-heading h2 { margin: 0; color: #7a7e86; font-size: 8px; }
.camera-diagnostics-heading button { color: #c23a33; font-size: 9px; }

.camera-diagnostics-list article {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  gap: 9px;
  padding: 11px 13px;
}

.camera-diagnostics-list article + article { border-top: 1px solid rgba(17, 24, 39, 0.08); }
.camera-diagnostic-dot { width: 7px; height: 7px; margin-top: 4px; border-radius: 50%; background: #1570ef; }
.camera-diagnostics-list article.is-error .camera-diagnostic-dot { background: #d84239; }
.camera-diagnostics-list article.is-warning .camera-diagnostic-dot { background: #d3941d; }
.camera-diagnostic-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.camera-diagnostic-title strong { font-size: 10px; }
.camera-diagnostic-title time { color: #a0a3a9; font-size: 7px; }
.camera-diagnostics-list p { margin: 4px 0 0; color: #555a63; font-size: 9px; line-height: 1.4; }
.camera-diagnostics-list small { display: block; margin-top: 4px; color: #9699a0; font-size: 7px; }

.camera-diagnostics-empty {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 8px;
  color: #259a54;
  background: #fff;
}

.camera-diagnostics-empty i { font-size: 24px; }
.camera-diagnostics-empty p { margin: 0; color: #777a82; font-size: 10px; }
</style>
