<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useTtsStore } from '../stores/tts'
import { useSystemStore } from '../stores/system'
import { getChatAppearanceClasses } from '../lib/chat-appearance'
import {
  MELOTTS_LANGUAGES,
  TTS_ADAPTER_KINDS,
  TTS_EMOTIONS,
  TTS_LIMITS,
  getTtsProviderCapabilities,
} from '../lib/tts-contract'

const router = useRouter()
const { t } = useI18n()
const ttsStore = useTtsStore()
const systemStore = useSystemStore()

const previewText = ref('你好，这是 SchatPhone 的中文语音测试。愿今天的每一次对话，都清晰而自然。')
const apiKeyDraft = ref('')
let activeAbortController = null

const profile = computed(() => ttsStore.activeProfile)
const chatShellClasses = computed(() =>
  getChatAppearanceClasses(systemStore.settings.appearance?.chat),
)
const capabilities = computed(() => getTtsProviderCapabilities(profile.value?.adapterKind))
const isMiniMax = computed(
  () => profile.value?.adapterKind === TTS_ADAPTER_KINDS.MINIMAX_T2A,
)
const characterCount = computed(() => previewText.value.length)
const canGenerate = computed(
  () =>
    previewText.value.trim().length > 0 &&
    characterCount.value <= TTS_LIMITS.maxTextChars &&
    ttsStore.preview.status !== 'loading',
)

const providerMeta = computed(() =>
  isMiniMax.value
    ? t('中文音色与情绪验证', 'Chinese voice and emotion validation')
    : t('开发期默认语音通道', 'Development default speech channel'),
)

const errorMessage = computed(() => {
  const messages = {
    TTS_PROVIDER_UNAVAILABLE: t(
      'Cloudflare 语音服务暂时不可用，请稍后重试或切换 MiniMax。',
      'Cloudflare speech is temporarily unavailable. Try again later or switch to MiniMax.',
    ),
    TEXT_REQUIRED: t('请输入试听文本。', 'Enter preview text.'),
    TEXT_TOO_LONG: t('试听文本超过 600 字符。', 'Preview text exceeds 600 characters.'),
    API_KEY_REQUIRED: t('请先填写 MiniMax API Key。', 'Enter a MiniMax API key first.'),
    AUTHENTICATION_FAILED: t('API Key 无效或没有访问权限。', 'The API key is invalid or unauthorized.'),
    RATE_LIMITED: t('请求过于频繁，请稍后重试。', 'Too many requests. Try again later.'),
    TIMEOUT: t('语音生成超时，请重试。', 'Speech generation timed out.'),
    ABORTED: t('语音生成已取消。', 'Speech generation was cancelled.'),
    TTS_NOT_CONFIGURED: t('Cloudflare Worker 尚未绑定 Workers AI。', 'Workers AI is not bound to the Cloudflare Worker.'),
    ENDPOINT_NOT_FOUND: t('语音服务地址不可用。', 'The speech endpoint is unavailable.'),
    ORIGIN_NOT_ALLOWED: t('当前站点不在 Worker 允许来源中。', 'This site is not allowed by the Worker.'),
    PROVIDER_REJECTED: t('供应商拒绝了本次语音请求。', 'The provider rejected this speech request.'),
  }
  return messages[ttsStore.preview.errorCode] || t('语音生成失败，请检查配置后重试。', 'Speech generation failed. Check the configuration and retry.')
})

const syncCredentialDraft = () => {
  apiKeyDraft.value = ttsStore.getCredentials(profile.value?.id).apiKey
}

watch(() => profile.value?.id, syncCredentialDraft, { immediate: true })

const selectProvider = (profileId) => {
  activeAbortController?.abort()
  activeAbortController = null
  ttsStore.setActiveProfile(profileId)
}

const updateProfile = (updates) => {
  if (!profile.value?.id) return
  ttsStore.updateProfile(profile.value.id, updates)
  ttsStore.clearPreview()
}

const persistApiKey = () => {
  if (!profile.value?.id) return
  ttsStore.setCredentials(profile.value.id, { apiKey: apiKeyDraft.value })
  ttsStore.clearPreview()
}

const generatePreview = async () => {
  if (!canGenerate.value) return
  activeAbortController?.abort()
  activeAbortController = new AbortController()
  await ttsStore.synthesizePreview(previewText.value, {
    signal: activeAbortController.signal,
  })
  activeAbortController = null
}

onBeforeUnmount(() => {
  activeAbortController?.abort()
  ttsStore.clearPreview()
})
</script>

<template>
  <div class="tts-settings-page chat-shell" :class="chatShellClasses" data-testid="tts-settings-page">
    <header class="tts-header">
      <button
        type="button"
        class="tts-icon-button"
        :title="t('返回 Chat 设置', 'Back to Chat settings')"
        :aria-label="t('返回 Chat 设置', 'Back to Chat settings')"
        @click="router.push('/chat-settings')"
      >
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <div class="tts-header-copy">
        <h1>{{ t('语音与朗读', 'Voice & Read Aloud') }}</h1>
        <p>{{ providerMeta }}</p>
      </div>
      <span class="tts-status-dot" :class="{ 'is-busy': ttsStore.preview.status === 'loading' }" aria-hidden="true"></span>
    </header>

    <main class="tts-content">
      <div class="tts-provider-tabs" role="tablist" :aria-label="t('语音供应商', 'Speech provider')">
        <button
          v-for="item in ttsStore.profiles"
          :key="item.id"
          type="button"
          role="tab"
          :aria-selected="item.id === ttsStore.activeProfileId"
          :class="{ 'is-active': item.id === ttsStore.activeProfileId }"
          :data-testid="`tts-provider-${item.id}`"
          @click="selectProvider(item.id)"
        >
          <i :class="item.adapterKind === TTS_ADAPTER_KINDS.MINIMAX_T2A ? 'fas fa-wave-square' : 'fas fa-cloud'" aria-hidden="true"></i>
          <span>{{ item.adapterKind === TTS_ADAPTER_KINDS.MINIMAX_T2A ? 'MiniMax' : 'MeloTTS' }}</span>
        </button>
      </div>

      <section class="tts-section" data-testid="tts-provider-settings">
        <div class="tts-section-heading">
          <div>
            <h2>{{ profile.name }}</h2>
            <p>{{ profile.modelId }}</p>
          </div>
          <span class="tts-provider-badge">
            {{ capabilities.requiresApiKey ? t('自备 Key', 'Bring your key') : t('Worker 托管', 'Worker managed') }}
          </span>
        </div>

        <label v-if="!isMiniMax" class="tts-field">
          <span>{{ t('Cloudflare Worker 地址', 'Cloudflare Worker URL') }}</span>
          <input
            type="text"
            :value="profile.endpoint"
            data-testid="tts-cloudflare-endpoint"
            spellcheck="false"
            @change="updateProfile({ endpoint: $event.target.value })"
          />
        </label>

        <label v-if="!isMiniMax" class="tts-field">
          <span>{{ t('语言', 'Language') }}</span>
          <select :value="profile.language" data-testid="tts-language" @change="updateProfile({ language: $event.target.value })">
            <option v-for="language in MELOTTS_LANGUAGES" :key="language" :value="language">
              {{ language === 'zh' ? t('中文', 'Chinese') : language.toUpperCase() }}
            </option>
          </select>
        </label>

        <template v-else>
          <label class="tts-field">
            <span>MiniMax API Key</span>
            <input
              v-model="apiKeyDraft"
              type="password"
              autocomplete="off"
              data-testid="tts-minimax-api-key"
              placeholder="sk-..."
              @change="persistApiKey"
            />
          </label>

          <div class="tts-two-column">
            <label class="tts-field">
              <span>{{ t('模型', 'Model') }}</span>
              <select :value="profile.modelId" data-testid="tts-model" @change="updateProfile({ modelId: $event.target.value })">
                <option value="speech-2.8-turbo">speech-2.8-turbo</option>
                <option value="speech-2.8-hd">speech-2.8-hd</option>
              </select>
            </label>
            <label class="tts-field">
              <span>{{ t('情绪', 'Emotion') }}</span>
              <select :value="profile.emotion" data-testid="tts-emotion" @change="updateProfile({ emotion: $event.target.value })">
                <option v-for="emotion in TTS_EMOTIONS" :key="emotion" :value="emotion">{{ emotion }}</option>
              </select>
            </label>
          </div>

          <label class="tts-field">
            <span>{{ t('音色 ID', 'Voice ID') }}</span>
            <input
              type="text"
              list="minimax-voice-options"
              :value="profile.voiceId"
              data-testid="tts-voice-id"
              @change="updateProfile({ voiceId: $event.target.value })"
            />
            <datalist id="minimax-voice-options">
              <option value="Chinese (Mandarin)_Lyrical_Voice"></option>
              <option value="Chinese (Mandarin)_HK_Flight_Attendant"></option>
            </datalist>
          </label>

          <label class="tts-range-field">
            <span>{{ t('语速', 'Speed') }}</span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              :value="profile.speed"
              data-testid="tts-speed"
              @input="updateProfile({ speed: $event.target.value })"
            />
            <output>{{ Number(profile.speed).toFixed(2) }}x</output>
          </label>
        </template>
      </section>

      <section class="tts-section tts-preview-section">
        <div class="tts-section-heading">
          <h2>{{ t('中文试听', 'Chinese Preview') }}</h2>
          <span class="tts-character-count" :class="{ 'is-over': characterCount > TTS_LIMITS.maxTextChars }">
            {{ characterCount }}/{{ TTS_LIMITS.maxTextChars }}
          </span>
        </div>
        <textarea
          v-model="previewText"
          rows="5"
          :maxlength="TTS_LIMITS.maxTextChars + 1"
          data-testid="tts-preview-text"
        ></textarea>

        <div v-if="ttsStore.preview.status === 'error'" class="tts-feedback is-error" role="alert" data-testid="tts-error">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
          <span>{{ errorMessage }}</span>
        </div>

        <audio
          v-if="ttsStore.preview.audioUrl"
          class="tts-audio"
          :src="ttsStore.preview.audioUrl"
          controls
          data-testid="tts-preview-audio"
        ></audio>

        <button
          type="button"
          class="tts-generate-button"
          :disabled="!canGenerate"
          data-testid="tts-generate"
          @click="generatePreview"
        >
          <i :class="ttsStore.preview.status === 'loading' ? 'fas fa-spinner fa-spin' : 'fas fa-volume-high'" aria-hidden="true"></i>
          <span>{{ ttsStore.preview.status === 'loading' ? t('生成中', 'Generating') : t('生成试听', 'Generate preview') }}</span>
        </button>
      </section>

      <p class="tts-local-note">
        <i class="fas fa-shield-halved" aria-hidden="true"></i>
        {{ t('MiniMax Key 仅保存在当前设备，不进入普通备份。', 'The MiniMax key stays on this device and is excluded from ordinary backups.') }}
      </p>
    </main>
  </div>
</template>

<style scoped>
.tts-settings-page {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f3f5f4;
  color: #17211d;
}

.tts-header {
  display: grid;
  min-height: 96px;
  grid-template-columns: 40px minmax(0, 1fr) 16px;
  align-items: end;
  gap: 12px;
  border-bottom: 1px solid #dce3df;
  background: #ffffff;
  padding: 36px 18px 14px;
}

.tts-icon-button {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid #d7dfda;
  border-radius: 8px;
  color: #33483e;
}

.tts-icon-button:active { transform: scale(0.96); }
.tts-icon-button:focus-visible,
.tts-provider-tabs button:focus-visible,
.tts-generate-button:focus-visible { outline: 2px solid #238765; outline-offset: 2px; }
.tts-header-copy { min-width: 0; }
.tts-header h1 { font-size: 19px; font-weight: 850; line-height: 1.25; }
.tts-header p { margin-top: 3px; color: #6d7d74; font-size: 10px; line-height: 1.3; }
.tts-status-dot { width: 8px; height: 8px; margin-bottom: 16px; border-radius: 50%; background: #238765; }
.tts-status-dot.is-busy { background: #d1972a; }

.tts-content {
  height: calc(100% - 96px);
  overflow-y: auto;
  padding: 18px 16px calc(24px + env(safe-area-inset-bottom));
}

.tts-provider-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  border: 1px solid #d6ded9;
  border-radius: 8px;
  background: #e8ece9;
  padding: 4px;
}

.tts-provider-tabs button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 6px;
  color: #68776f;
  font-size: 11px;
  font-weight: 800;
}

.tts-provider-tabs button.is-active {
  background: #ffffff;
  color: #17664f;
  box-shadow: 0 2px 8px rgba(31, 55, 43, 0.1);
}

.tts-section {
  display: grid;
  gap: 14px;
  margin-top: 14px;
  border: 1px solid #dce3df;
  border-radius: 8px;
  background: #ffffff;
  padding: 16px;
}

.tts-section-heading {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.tts-section h2 { font-size: 13px; font-weight: 850; line-height: 1.3; }
.tts-section-heading p { margin-top: 3px; color: #79877f; font-size: 9px; }
.tts-provider-badge { flex: 0 0 auto; border-radius: 6px; background: #eef4f0; padding: 5px 7px; color: #17664f; font-size: 9px; font-weight: 800; }
.tts-character-count { color: #7c8982; font-size: 10px; font-variant-numeric: tabular-nums; }
.tts-character-count.is-over { color: #b33b32; }

.tts-field { display: grid; min-width: 0; gap: 6px; }
.tts-field > span,
.tts-range-field > span { color: #53645b; font-size: 10px; font-weight: 800; }
.tts-field input,
.tts-field select,
.tts-preview-section textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid #ccd7d1;
  border-radius: 7px;
  background: #fbfcfb;
  padding: 10px 11px;
  color: #1e2d25;
  font-size: 11px;
  outline: none;
}
.tts-field input:focus,
.tts-field select:focus,
.tts-preview-section textarea:focus { border-color: #238765; box-shadow: 0 0 0 3px rgba(35, 135, 101, 0.12); }
.tts-two-column { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.tts-range-field { display: grid; grid-template-columns: 42px minmax(0, 1fr) 42px; align-items: center; gap: 8px; }
.tts-range-field input { accent-color: #238765; }
.tts-range-field output { color: #34483e; font-size: 10px; font-variant-numeric: tabular-nums; text-align: right; }
.tts-preview-section textarea { min-height: 112px; resize: vertical; line-height: 1.65; }

.tts-feedback {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border: 1px solid #e2b7b2;
  border-radius: 7px;
  background: #fff1ef;
  padding: 9px 10px;
  color: #9c352f;
  font-size: 10px;
  line-height: 1.5;
}

.tts-audio { width: 100%; height: 42px; }
.tts-generate-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 7px;
  background: #17664f;
  color: #ffffff;
  font-size: 11px;
  font-weight: 850;
}
.tts-generate-button:disabled { cursor: not-allowed; opacity: 0.45; }
.tts-generate-button:not(:disabled):active { transform: scale(0.985); }
.tts-local-note { display: flex; align-items: flex-start; gap: 7px; margin: 12px 4px 0; color: #6d7a73; font-size: 9px; line-height: 1.5; }

@media (min-width: 760px) {
  .tts-content { width: min(680px, 100%); margin: 0 auto; padding-top: 24px; }
}

@media (max-width: 360px) {
  .tts-two-column { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .tts-icon-button,
  .tts-generate-button { transition: none; }
}
</style>
