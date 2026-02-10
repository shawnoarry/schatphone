<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { detectApiKindFromUrl, fetchAvailableModels } from '../lib/ai'

const router = useRouter()
const systemStore = useSystemStore()
const { settings } = storeToRefs(systemStore)

const modelOptions = ref([])
const modelsLoading = ref(false)
const modelsError = ref('')
const presetName = ref('')
const showApiKey = ref(false)

let modelFetchTimerId = null
let modelFetchToken = 0

const ensurePresetState = () => {
  if (!Array.isArray(settings.value.api.presets)) {
    settings.value.api.presets = []
  }
  if (typeof settings.value.api.activePresetId !== 'string') {
    settings.value.api.activePresetId = ''
  }
}

const apiKindLabel = computed(() => {
  const kind = settings.value.api.resolvedKind
  if (kind === 'gemini') return 'Gemini API'
  if (kind === 'openai_compatible') return 'OpenAI-Compatible'
  return 'Auto'
})

const presets = computed(() => settings.value.api.presets || [])

const savePreset = () => {
  ensurePresetState()
  const name = presetName.value.trim()
  const url = settings.value.api.url?.trim()
  const key = settings.value.api.key?.trim()
  const model = settings.value.api.model?.trim()

  if (!name) {
    alert('请输入预设名称。')
    return
  }
  if (!url || !key) {
    alert('请先填写 URL 和 Key。')
    return
  }

  const now = Date.now()
  const existing = presets.value.find((item) => item.name === name)
  if (existing) {
    existing.url = url
    existing.key = key
    existing.model = model
    existing.updatedAt = now
    settings.value.api.activePresetId = existing.id
  } else {
    const preset = {
      id: `preset_${now}`,
      name,
      url,
      key,
      model,
      createdAt: now,
      updatedAt: now,
    }
    settings.value.api.presets.push(preset)
    settings.value.api.activePresetId = preset.id
  }

  presetName.value = ''
}

const applyPreset = (presetId) => {
  ensurePresetState()
  if (!presetId) return

  const selected = presets.value.find((item) => item.id === presetId)
  if (!selected) return

  settings.value.api.url = selected.url || ''
  settings.value.api.key = selected.key || ''
  settings.value.api.model = selected.model || settings.value.api.model
  settings.value.api.activePresetId = selected.id
}

const removeActivePreset = () => {
  ensurePresetState()
  const activeId = settings.value.api.activePresetId
  if (!activeId) return

  const index = presets.value.findIndex((item) => item.id === activeId)
  if (index < 0) return

  const ok = window.confirm('确认删除当前预设吗？')
  if (!ok) return

  settings.value.api.presets.splice(index, 1)

  if (settings.value.api.presets.length > 0) {
    settings.value.api.activePresetId = settings.value.api.presets[0].id
    applyPreset(settings.value.api.activePresetId)
  } else {
    settings.value.api.activePresetId = ''
  }
}

const clearAllPresets = () => {
  ensurePresetState()
  if (settings.value.api.presets.length === 0) return

  const ok = window.confirm('确认清空全部预设吗？此操作不可撤销。')
  if (!ok) return

  settings.value.api.presets.splice(0, settings.value.api.presets.length)
  settings.value.api.activePresetId = ''
}

const goHome = () => {
  router.push('/home')
}

const goSettings = () => {
  router.push('/settings')
}

const clearModelState = () => {
  modelOptions.value = []
  modelsError.value = ''
}

const loadModels = async () => {
  const apiUrl = settings.value.api.url?.trim()
  const apiKey = settings.value.api.key?.trim()

  settings.value.api.resolvedKind = detectApiKindFromUrl(apiUrl)

  if (!apiUrl || !apiKey) {
    clearModelState()
    return
  }

  const currentToken = ++modelFetchToken
  modelsLoading.value = true
  modelsError.value = ''

  try {
    const { kind, models } = await fetchAvailableModels({ settings: settings.value })
    if (currentToken !== modelFetchToken) return

    settings.value.api.resolvedKind = kind
    modelOptions.value = [...new Set(models)]

    if (!settings.value.api.model && modelOptions.value.length > 0) {
      settings.value.api.model = modelOptions.value[0]
    }
  } catch (error) {
    if (currentToken !== modelFetchToken) return
    modelOptions.value = []
    modelsError.value = error?.message || 'Load models failed'
  } finally {
    if (currentToken === modelFetchToken) {
      modelsLoading.value = false
    }
  }
}

const scheduleAutoLoadModels = () => {
  if (modelFetchTimerId) {
    clearTimeout(modelFetchTimerId)
    modelFetchTimerId = null
  }

  const apiUrl = settings.value.api.url?.trim()
  const apiKey = settings.value.api.key?.trim()

  settings.value.api.resolvedKind = detectApiKindFromUrl(apiUrl)

  if (!apiUrl || !apiKey) {
    clearModelState()
    return
  }

  modelFetchTimerId = setTimeout(() => {
    loadModels()
  }, 600)
}

watch(
  () => settings.value.api.activePresetId,
  (presetId) => {
    applyPreset(presetId)
  },
)

watch(
  () => [settings.value.api.url, settings.value.api.key],
  () => {
    clearModelState()
    scheduleAutoLoadModels()
  },
)

onBeforeUnmount(() => {
  if (modelFetchTimerId) {
    clearTimeout(modelFetchTimerId)
    modelFetchTimerId = null
  }
})

ensurePresetState()
</script>

<template>
  <div class="w-full h-full bg-gray-100 flex flex-col text-black">
    <div class="pt-12 pb-3 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goHome" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> 主页
      </button>
      <h1 class="text-2xl font-bold flex-1">网络与 API</h1>
      <button @click="goSettings" class="text-blue-500 text-sm">设置</button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4">
        <label class="text-xs text-gray-500 block mb-1">API Endpoint URL</label>
        <input
          v-model="settings.api.url"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm font-mono text-gray-700"
          placeholder="https://api.openai.com/v1/chat/completions"
        />
        <p class="text-[10px] text-gray-400 mt-2">输入 URL 后会自动识别类型，并尝试拉取模型列表。</p>
      </div>

      <div class="bg-white rounded-xl p-4">
        <label class="text-xs text-gray-500 block mb-1">API Key</label>
        <div class="flex items-center gap-2">
          <input
            v-model="settings.api.key"
            :type="showApiKey ? 'text' : 'password'"
            class="flex-1 border-b border-gray-200 py-1 outline-none text-sm font-mono"
            placeholder="sk-..."
          />
          <button
            @click="showApiKey = !showApiKey"
            class="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            {{ showApiKey ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4">
        <label class="text-xs text-gray-500 block mb-2">保存为预设</label>
        <div class="flex gap-2">
          <input
            v-model="presetName"
            type="text"
            class="flex-1 border-b border-gray-200 py-1 outline-none text-sm"
            placeholder="例如：主账号 / 测试网关"
          />
          <button
            @click="savePreset"
            class="px-3 py-1.5 rounded-md bg-blue-500 text-white text-xs hover:bg-blue-600 transition"
          >
            保存
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4" v-if="presets.length > 0">
        <label class="text-xs text-gray-500 block mb-1">已存预设</label>
        <select
          v-model="settings.api.activePresetId"
          class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white"
        >
          <option value="">请选择预设</option>
          <option v-for="preset in presets" :key="preset.id" :value="preset.id">
            {{ preset.name }}
          </option>
        </select>
        <div class="flex gap-2 mt-2">
          <button
            @click="removeActivePreset"
            :disabled="!settings.api.activePresetId"
            class="flex-1 px-3 py-1.5 rounded-md text-xs transition"
            :class="
              settings.api.activePresetId
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            "
          >
            删除当前预设
          </button>
          <button
            @click="clearAllPresets"
            :disabled="presets.length === 0"
            class="flex-1 px-3 py-1.5 rounded-md text-xs transition"
            :class="
              presets.length > 0
                ? 'bg-gray-800 text-white hover:bg-black'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            "
          >
            清空全部预设
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-gray-500">已识别类型</span>
          <span class="text-xs font-semibold text-gray-700">{{ apiKindLabel }}</span>
        </div>

        <button
          @click="loadModels"
          :disabled="modelsLoading"
          class="w-full rounded-lg py-2 text-sm transition"
          :class="modelsLoading ? 'bg-gray-100 text-gray-400' : 'bg-blue-500 text-white hover:bg-blue-600'"
        >
          {{ modelsLoading ? '拉取中...' : '刷新模型列表' }}
        </button>

        <p v-if="modelsError" class="text-xs text-red-500 mt-2">{{ modelsError }}</p>
      </div>

      <div class="bg-white rounded-xl p-4" v-if="modelOptions.length > 0">
        <label class="text-xs text-gray-500 block mb-1">可用模型（自动拉取）</label>
        <select
          v-model="settings.api.model"
          class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white"
        >
          <option v-for="model in modelOptions" :key="model" :value="model">{{ model }}</option>
        </select>
      </div>

      <div class="bg-white rounded-xl p-4">
        <label class="text-xs text-gray-500 block mb-1">模型名（手动兜底）</label>
        <input
          v-model="settings.api.model"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm font-mono"
          placeholder="gpt-4o-mini / gemini-2.5-flash"
        />
        <p class="text-[10px] text-gray-400 mt-2">如果模型接口受限或跨域失败，可直接手动填写模型名。</p>
      </div>
    </div>
  </div>
</template>
