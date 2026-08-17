<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CameraSettingsShell from '../components/camera/CameraSettingsShell.vue'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { useImageGenerationStore } from '../stores/imageGeneration'
import { IMAGE_ADAPTER_KIND, resolveImageAdapterKind } from '../lib/image-generation-contract'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { confirmDialog } = useDialog()
const imageStore = useImageGenerationStore()

const isNew = computed(() => route.params.profileId === 'new')
const existingProfile = computed(() => isNew.value ? null : imageStore.getProfileById(route.params.profileId))
const showApiKey = ref(false)
const showProxyToken = ref(false)
const saving = ref(false)
const testing = ref(false)
const loadingModels = ref(false)
const feedback = ref({ tone: '', text: '' })

const draft = reactive({
  id: '',
  name: '',
  endpoint: '',
  adapterKind: IMAGE_ADAPTER_KIND.AUTO,
  modelId: '',
  enabled: true,
  useProxy: false,
  proxyUrl: '',
  apiKey: '',
  proxyToken: '',
})

const modelState = computed(() => draft.id ? imageStore.modelStateByProfile[draft.id] : null)
const modelOptions = computed(() => modelState.value?.models || [])
const resolvedAdapter = computed(() => resolveImageAdapterKind(draft))

const resetDraft = () => {
  const profile = existingProfile.value
  const credentials = profile ? imageStore.getCredentials(profile.id) : {}
  Object.assign(draft, profile || {
    id: '',
    name: t('自定义接口', 'Custom provider'),
    endpoint: '',
    adapterKind: IMAGE_ADAPTER_KIND.AUTO,
    modelId: '',
    enabled: true,
    useProxy: false,
    proxyUrl: '',
  }, credentials)
}

watch(() => route.params.profileId, resetDraft, { immediate: true })

const setFeedback = (tone, text) => { feedback.value = { tone, text } }

const saveProfile = async ({ quiet = false } = {}) => {
  if (!draft.name.trim() || !draft.endpoint.trim() || !draft.modelId.trim()) {
    setFeedback('error', t('请填写名称、URL 和模型。', 'Name, URL, and model are required.'))
    return null
  }
  saving.value = true
  const profile = imageStore.upsertProfile({
    id: draft.id,
    name: draft.name,
    endpoint: draft.endpoint,
    adapterKind: draft.adapterKind,
    modelId: draft.modelId,
    enabled: draft.enabled,
    useProxy: draft.useProxy,
    proxyUrl: draft.proxyUrl,
  })
  saving.value = false
  if (!profile) {
    setFeedback('error', t('接口配置未能保存。', 'The provider profile could not be saved.'))
    return null
  }
  draft.id = profile.id
  imageStore.setCredentials(profile.id, {
    apiKey: draft.apiKey,
    proxyToken: draft.proxyToken,
  })
  if (isNew.value) {
    await router.replace({
      path: `/camera/settings/providers/${profile.id}`,
      query: { ...route.query },
    })
  }
  if (!quiet) setFeedback('success', t('配置已保存到当前设备。', 'Profile saved on this device.'))
  return profile
}

const loadModels = async () => {
  const profile = await saveProfile({ quiet: true })
  if (!profile) return
  loadingModels.value = true
  const result = await imageStore.loadModels(profile.id)
  loadingModels.value = false
  if (!result.ok) {
    setFeedback('error', result.error?.message || t('模型拉取失败。', 'Could not load models.'))
    return
  }
  if (!result.models.some((model) => model.id === draft.modelId) && result.models[0]) {
    draft.modelId = result.models[0].id
  }
  setFeedback(
    result.source === 'built_in' ? 'warning' : 'success',
    result.source === 'built_in'
      ? t('接口未返回模型列表，当前显示内置备用列表。', 'Provider list unavailable. Showing the built-in fallback list.')
      : t(`已拉取 ${result.models.length} 个模型。`, `Loaded ${result.models.length} models.`),
  )
}

const testConnection = async () => {
  const profile = await saveProfile({ quiet: true })
  if (!profile) return
  testing.value = true
  const result = await imageStore.testConnection(profile.id)
  testing.value = false
  if (!result.ok) {
    setFeedback('error', result.error?.message || t('连接测试失败。', 'Connection test failed.'))
    return
  }
  setFeedback(
    result.source === 'built_in' ? 'warning' : 'success',
    result.source === 'built_in'
      ? t('接口可访问，但模型列表使用内置备用数据。', 'Provider reached; model list uses built-in fallback data.')
      : t('连接与模型列表均可用。', 'Connection and model list are ready.'),
  )
}

const makeDefault = async () => {
  const profile = await saveProfile({ quiet: true })
  if (!profile) return
  imageStore.setActiveProfile(profile.id)
  setFeedback('success', t('已设为默认生图接口。', 'Set as the default image provider.'))
}

const removeProfile = async () => {
  if (!existingProfile.value) return
  const confirmed = await confirmDialog({
    title: t('删除接口配置', 'Delete provider profile'),
    message: t('Key 与代理 Token 也会从当前设备移除。', 'Its API key and proxy token will also be removed from this device.'),
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return
  if (!imageStore.removeProfile(existingProfile.value.id)) {
    setFeedback('error', t('至少需要保留一个接口配置。', 'At least one provider profile is required.'))
    return
  }
  router.push({ path: '/camera/settings/providers', query: { ...route.query } })
}
</script>

<template>
  <CameraSettingsShell
    :title="isNew ? t('新增接口', 'New Provider') : draft.name"
    :back-label="t('接口', 'Providers')"
    back-to="/camera/settings/providers"
  >
    <template #actions>
      <button type="button" class="camera-provider-save" :disabled="saving" @click="saveProfile()">
        {{ t('保存', 'Save') }}
      </button>
    </template>

    <section class="camera-form-group">
      <label class="camera-form-row">
        <span>{{ t('名称', 'Name') }}</span>
        <input v-model="draft.name" type="text" maxlength="80" :placeholder="t('主要接口', 'Primary provider')" />
      </label>
      <label class="camera-form-row is-stacked">
        <span>URL</span>
        <input v-model="draft.endpoint" type="url" placeholder="https://example.com/v1" data-testid="camera-provider-url" />
      </label>
      <label class="camera-form-row">
        <span>{{ t('适配器', 'Adapter') }}</span>
        <select v-model="draft.adapterKind">
          <option :value="IMAGE_ADAPTER_KIND.AUTO">{{ t('自动识别', 'Auto detect') }}</option>
          <option :value="IMAGE_ADAPTER_KIND.OPENAI_IMAGES">OpenAI Images</option>
          <option :value="IMAGE_ADAPTER_KIND.OPENAI_CHAT_IMAGE">OpenAI Chat Image</option>
          <option :value="IMAGE_ADAPTER_KIND.GRSAI_ASYNC">Grsai Async</option>
        </select>
      </label>
      <p class="camera-form-hint">{{ t('当前识别：', 'Resolved:') }} {{ resolvedAdapter }}</p>
    </section>

    <section class="camera-form-group">
      <label class="camera-form-row is-stacked">
        <span>API Key</span>
        <span class="camera-secret-field">
          <input v-model="draft.apiKey" :type="showApiKey ? 'text' : 'password'" autocomplete="off" data-testid="camera-provider-key" />
          <button type="button" :aria-label="t('显示或隐藏 Key', 'Show or hide key')" @click="showApiKey = !showApiKey">
            <i :class="showApiKey ? 'fas fa-eye-slash' : 'fas fa-eye'" aria-hidden="true"></i>
          </button>
        </span>
      </label>
      <label class="camera-form-row is-stacked">
        <span>{{ t('模型', 'Model') }}</span>
        <span class="camera-model-field">
          <input v-model="draft.modelId" list="camera-provider-models" placeholder="gpt-image-2" data-testid="camera-provider-model" />
          <button type="button" :disabled="loadingModels" @click="loadModels">
            <i class="fas fa-rotate" :class="{ 'is-spinning': loadingModels }" aria-hidden="true"></i>
            <span>{{ t('拉取', 'Load') }}</span>
          </button>
        </span>
        <datalist id="camera-provider-models">
          <option v-for="model in modelOptions" :key="model.id" :value="model.id">{{ model.name }}</option>
        </datalist>
      </label>
      <p v-if="modelState?.source === 'built_in'" class="camera-form-hint is-warning">
        {{ t('当前模型来自内置备用列表。', 'Models currently come from the built-in fallback list.') }}
      </p>
    </section>

    <section class="camera-form-group">
      <label class="camera-toggle-row">
        <span>
          <strong>{{ t('通过代理请求', 'Use proxy') }}</strong>
          <small>{{ t('仅在浏览器直连受限时开启', 'Enable only when direct browser requests are blocked') }}</small>
        </span>
        <input v-model="draft.useProxy" type="checkbox" />
      </label>
      <template v-if="draft.useProxy">
        <label class="camera-form-row is-stacked">
          <span>{{ t('代理 URL', 'Proxy URL') }}</span>
          <input v-model="draft.proxyUrl" type="url" placeholder="https://your-proxy.example/api/proxy" />
        </label>
        <label class="camera-form-row is-stacked">
          <span>{{ t('代理 Token', 'Proxy token') }}</span>
          <span class="camera-secret-field">
            <input v-model="draft.proxyToken" :type="showProxyToken ? 'text' : 'password'" autocomplete="off" />
            <button type="button" :aria-label="t('显示或隐藏 Token', 'Show or hide token')" @click="showProxyToken = !showProxyToken">
              <i :class="showProxyToken ? 'fas fa-eye-slash' : 'fas fa-eye'" aria-hidden="true"></i>
            </button>
          </span>
        </label>
      </template>
    </section>

    <section class="camera-provider-actions">
      <button type="button" :disabled="testing" data-testid="camera-provider-test" @click="testConnection">
        <i class="fas fa-plug-circle-check" aria-hidden="true"></i>
        <span>{{ testing ? t('测试中', 'Testing') : t('测试连接', 'Test Connection') }}</span>
      </button>
      <button type="button" :disabled="imageStore.defaults.activeProfileId === draft.id" @click="makeDefault">
        <i class="fas fa-star" aria-hidden="true"></i>
        <span>{{ imageStore.defaults.activeProfileId === draft.id ? t('当前默认', 'Current Default') : t('设为默认', 'Make Default') }}</span>
      </button>
    </section>

    <p v-if="feedback.text" class="camera-provider-feedback" :class="`is-${feedback.tone}`" role="status">
      {{ feedback.text }}
    </p>

    <button v-if="!isNew" type="button" class="camera-provider-delete" @click="removeProfile">
      {{ t('删除这个接口配置', 'Delete This Provider') }}
    </button>
  </CameraSettingsShell>
</template>

<style scoped>
.camera-provider-save {
  min-height: 32px;
  color: var(--system-accent);
  font-size: 12px;
  font-weight: 750;
}

.camera-form-group {
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid var(--system-subtle-border);
  border-radius: 8px;
  background: var(--system-panel-bg);
}

.camera-form-row,
.camera-toggle-row {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 13px;
}

.camera-form-row + .camera-form-row,
.camera-toggle-row + .camera-form-row,
.camera-form-row + .camera-toggle-row {
  border-top: 1px solid var(--system-subtle-border);
}

.camera-form-row > span:first-child {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 650;
}

.camera-form-row > input,
.camera-form-row > select {
  min-width: 0;
  flex: 1;
  border: 0;
  color: var(--system-text);
  background: transparent;
  text-align: right;
  font-size: 11px;
  outline: none;
}

.camera-form-row.is-stacked {
  align-items: stretch;
  flex-direction: column;
  gap: 7px;
}

.camera-form-row.is-stacked > input {
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 6px;
  background: var(--system-control-bg);
  text-align: left;
}

.camera-secret-field,
.camera-model-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  overflow: hidden;
  min-height: 36px;
  border-radius: 6px;
  background: var(--system-control-bg);
}

.camera-secret-field input,
.camera-model-field input {
  min-width: 0;
  padding: 0 10px;
  color: var(--system-text);
  background: transparent;
  font-size: 11px;
  outline: none;
}

.camera-secret-field button,
.camera-model-field button {
  min-width: 38px;
  min-height: 36px;
  padding: 0 10px;
  color: var(--system-accent);
}

.camera-model-field button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-left: 1px solid var(--system-subtle-border);
  font-size: 10px;
}

.camera-form-hint {
  margin: 0;
  padding: 0 13px 10px;
  color: var(--system-text-soft);
  font-size: 8px;
}

.camera-form-hint.is-warning { color: var(--system-warning); }

.camera-toggle-row > span {
  min-width: 0;
}

.camera-toggle-row strong,
.camera-toggle-row small {
  display: block;
}

.camera-toggle-row strong { font-size: 11px; }
.camera-toggle-row small { margin-top: 3px; color: var(--system-text-soft); font-size: 8px; }
.camera-toggle-row input { width: 18px; height: 18px; accent-color: var(--system-accent); }

.camera-provider-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.camera-provider-actions button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--system-accent-soft);
  border-radius: 7px;
  color: var(--system-accent);
  background: var(--system-control-bg);
  font-size: 10px;
  font-weight: 700;
}

.camera-provider-actions button:disabled { color: var(--system-text-soft); border-color: var(--system-subtle-border); }

.camera-provider-feedback {
  margin: 10px 3px 0;
  color: var(--system-text-muted);
  font-size: 9px;
  line-height: 1.45;
}

.camera-provider-feedback.is-error { color: var(--system-danger); }
.camera-provider-feedback.is-warning { color: var(--system-warning); }
.camera-provider-feedback.is-success { color: var(--system-success); }

.camera-provider-delete {
  width: 100%;
  min-height: 44px;
  margin-top: 22px;
  border: 1px solid var(--system-danger-soft);
  border-radius: 7px;
  color: var(--system-danger);
  background: var(--system-panel-bg);
  font-size: 11px;
}

.is-spinning { animation: camera-spin 0.8s linear infinite; }
@keyframes camera-spin { to { transform: rotate(360deg); } }
</style>
