<script setup>
import { useI18n } from '../../composables/useI18n'
import AssetStatusBadge from '../assets/AssetStatusBadge.vue'

defineProps({
  currentLocationText: {
    type: String,
    default: '',
  },
  resolvedMapVisualMode: {
    type: String,
    default: 'default',
  },
  mapVisualPreviewUrl: {
    type: String,
    default: '',
  },
  mapOneOffVisualUrl: {
    type: String,
    default: '',
  },
  mapOneOffVisualName: {
    type: String,
    default: '',
  },
  mapProviderGeneratedImageUrl: {
    type: String,
    default: '',
  },
  mapVisualBindingStatusText: {
    type: String,
    default: '',
  },
  showMapVisualOnboarding: {
    type: Boolean,
    default: false,
  },
  mapVisualSettings: {
    type: Object,
    required: true,
  },
  mapVisualAssetOptions: {
    type: Array,
    default: () => [],
  },
  mapVisualSelectedAsset: {
    type: Object,
    default: null,
  },
  mapVisualSelectionTitle: {
    type: String,
    default: '',
  },
  mapVisualSelectionDescription: {
    type: String,
    default: '',
  },
  mapVisualQuickAssetOptions: {
    type: Array,
    default: () => [],
  },
  mapVisualQuickOverflowCount: {
    type: Number,
    default: 0,
  },
  mapVisualQuickPreviewMap: {
    type: Object,
    default: () => ({}),
  },
  mapAutomationRuntime: {
    type: Object,
    default: () => ({}),
  },
  mapAiVisualAutomationPolicy: {
    type: Object,
    default: () => ({}),
  },
  mapAiPolicySummary: {
    type: String,
    default: '',
  },
  mapAiPolicyHint: {
    type: String,
    default: '',
  },
  mapProviderStatusLabel: {
    type: String,
    default: '',
  },
  mapAiVisualRefreshing: {
    type: Boolean,
    default: false,
  },
  mapVisualLoading: {
    type: Boolean,
    default: false,
  },
  mapVisualHint: {
    type: Object,
    default: () => ({ tone: '', message: '' }),
  },
  formatTime: {
    type: Function,
    required: true,
  },
})

defineEmits([
  'apply-quick-map-visual-asset',
  'change-map-visual-asset',
  'change-map-visual-mode',
  'clear-map-one-off-visual',
  'clear-map-visual-binding',
  'open-automation-settings',
  'open-gallery',
  'open-upload-picker',
  'restore-default-map-visual',
  'toggle-map-ai-visual',
  'toggle-map-provider-visual',
  'trigger-map-ai-visual-refresh',
  'use-default-map-visual',
  'use-gallery-map-visual',
])

const { t } = useI18n()
</script>

<template>
  <section class="map-visual-panel rounded-[2rem] p-4">
    <div class="flex items-center justify-between mb-3">
      <div>
        <p class="text-[10px] uppercase tracking-[0.24em] text-cyan-100/70">{{ t('实时视野', 'Live view') }}</p>
        <h2 class="text-xl font-semibold">{{ t('地图视觉', 'Map visual') }}</h2>
      </div>
      <span class="text-[11px] px-2 py-1 rounded-full bg-white/12 border border-white/15 text-cyan-50">
        {{ resolvedMapVisualMode === 'gallery' ? t('素材库', 'Gallery') : t('默认', 'Default') }}
      </span>
    </div>

    <div class="map-preview-stage mb-4">
      <img
        v-if="resolvedMapVisualMode === 'gallery' && mapVisualPreviewUrl"
        :src="mapVisualPreviewUrl"
        class="w-full h-full object-cover"
        :alt="t('地图视觉预览', 'Map visual preview')"
      />
      <img
        v-else-if="mapOneOffVisualUrl"
        :src="mapOneOffVisualUrl"
        class="w-full h-full object-cover"
        :alt="mapOneOffVisualName || t('单次地图背景预览', 'One-off map visual preview')"
      />
      <img
        v-else-if="mapProviderGeneratedImageUrl"
        :src="mapProviderGeneratedImageUrl"
        class="w-full h-full object-cover"
        :alt="t('供应商视觉预览', 'Provider visual preview')"
      />
      <div v-else class="map-default-canvas w-full h-full">
        <div class="map-grid-lines"></div>
        <div class="map-route-line"></div>
        <div class="map-pin map-pin-a"></div>
        <div class="map-pin map-pin-b"></div>
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent"></div>
      <div class="absolute left-4 right-4 bottom-4">
        <p class="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">{{ t('当前位置', 'Current location') }}</p>
        <p class="mt-1 text-lg font-semibold line-clamp-2">{{ currentLocationText }}</p>
        <p class="mt-1 text-xs text-cyan-50/75">{{ mapVisualBindingStatusText }}</p>
      </div>
    </div>

    <div v-if="showMapVisualOnboarding" class="mb-3 rounded-2xl border border-amber-200/40 bg-amber-300/15 p-3 text-xs text-amber-50 space-y-2">
      <p>
        {{ t('首次可选择地图视觉模式：默认样式或素材库背景。未配置素材时会自动回退为默认。', 'Choose map visual mode on first use: default style or gallery background. Missing assets auto-fallback to default.') }}
      </p>
      <div class="flex flex-wrap gap-2">
        <button @click="$emit('use-default-map-visual')" class="px-2 py-1 rounded bg-white text-slate-950">
          {{ t('保持默认', 'Keep default') }}
        </button>
        <button @click="$emit('use-gallery-map-visual')" class="px-2 py-1 rounded border border-white/25">
          {{ t('使用素材库', 'Use gallery') }}
        </button>
      </div>
    </div>

    <div class="space-y-2 text-xs text-cyan-50/80">
      <label class="inline-flex items-center gap-2 mr-4">
        <input
          type="radio"
          name="mapVisualMode"
          value="default"
          :checked="mapVisualSettings.mode === 'default'"
          @change="$emit('change-map-visual-mode', $event)"
        />
        {{ t('默认视觉', 'Default visual') }}
      </label>
      <label class="inline-flex items-center gap-2">
        <input
          type="radio"
          name="mapVisualMode"
          value="gallery"
          :checked="mapVisualSettings.mode === 'gallery'"
          @change="$emit('change-map-visual-mode', $event)"
        />
        {{ t('素材库视觉', 'Gallery visual') }}
      </label>
    </div>

    <div v-if="mapVisualSettings.mode === 'gallery'" class="mt-3 space-y-2">
      <select
        class="w-full rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none"
        :value="mapVisualSettings.assetId"
        @change="$emit('change-map-visual-asset', $event)"
      >
        <option value="">{{ t('选择地图背景素材', 'Choose map background asset') }}</option>
        <option v-for="asset in mapVisualAssetOptions" :key="asset.id" :value="asset.id">
          {{ asset.name }}
        </option>
      </select>
      <p v-if="mapVisualAssetOptions.length === 0" class="text-xs text-cyan-50/60">
        {{ t('素材库暂无可用背景图，已自动回退默认模式。', 'No gallery asset available for map background; fallback stays on default mode.') }}
      </p>

      <div
        v-else
        class="rounded-3xl border border-white/12 bg-white/10 p-3 space-y-3 backdrop-blur"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-cyan-50">{{ mapVisualSelectionTitle }}</p>
            <p
              v-if="mapVisualSelectedAsset"
              class="mt-1 text-[11px] text-cyan-100 truncate"
            >
              {{ mapVisualSelectedAsset.name }}
            </p>
            <p class="mt-1 text-[11px] text-cyan-50/60">
              {{ mapVisualSelectionDescription }}
            </p>
            <p class="mt-1 text-[11px] text-cyan-100">
              {{ mapVisualBindingStatusText }}
            </p>
          </div>
          <button
            type="button"
            @click="$emit('open-gallery')"
            class="shrink-0 rounded-xl border border-white/15 bg-white/12 px-2.5 py-1.5 text-[11px] text-cyan-50"
          >
            {{ t('打开相册', 'Open Gallery') }}
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            @click="$emit('restore-default-map-visual')"
            class="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] text-cyan-50"
          >
            {{ t('恢复默认视觉', 'Use default visual') }}
          </button>
          <button
            v-if="mapVisualSelectedAsset"
            type="button"
            @click="$emit('clear-map-visual-binding')"
            class="rounded-xl border border-amber-200/40 bg-amber-300/15 px-2.5 py-1.5 text-[11px] text-amber-50"
          >
            {{ t('清除背景绑定', 'Clear bound asset') }}
          </button>
        </div>

        <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            v-for="asset in mapVisualQuickAssetOptions"
            :key="`map-visual-chip-${asset.id}`"
            type="button"
            class="shrink-0 w-16"
            @click="$emit('apply-quick-map-visual-asset', asset.id)"
          >
            <div
              class="relative w-16 h-16 rounded-2xl overflow-hidden border bg-white/10"
              :class="
                mapVisualSelectedAsset?.id === asset.id
                  ? 'border-cyan-200 ring-2 ring-cyan-200/25'
                  : 'border-white/15'
              "
            >
              <img
                v-if="mapVisualQuickPreviewMap[asset.id]"
                :src="mapVisualQuickPreviewMap[asset.id]"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-[9px] text-cyan-50/50 bg-white/10"
              >
                {{ t('加载中', 'Loading') }}
              </div>
              <AssetStatusBadge
                v-if="mapVisualSelectedAsset?.id === asset.id"
                label-zh="使用中"
                label-en="Live"
                tone="sky-solid"
                :truncate="false"
                class="absolute left-1 top-1 font-semibold"
              />
            </div>
            <p class="mt-1 text-[10px] text-cyan-50/65 line-clamp-2 text-left">{{ asset.name }}</p>
          </button>
          <div
            v-if="mapVisualQuickOverflowCount > 0"
            class="shrink-0 rounded-xl border border-dashed border-white/20 px-3 py-2 text-[11px] text-cyan-50"
          >
            +{{ mapVisualQuickOverflowCount }}
          </div>
        </div>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button @click="$emit('open-upload-picker')" class="px-3 py-1.5 rounded-full border border-white/15 bg-white/10 text-xs text-cyan-50">
        {{ t('上传地图背景', 'Upload map visual') }}
      </button>
      <button
        v-if="mapOneOffVisualUrl"
        @click="$emit('clear-map-one-off-visual')"
        class="px-3 py-1.5 rounded-full border border-amber-200/40 text-amber-50 bg-amber-300/15 text-xs"
      >
        {{ t('清除本次背景', 'Clear one-off visual') }}
      </button>
    </div>
    <p class="mt-1 text-[11px] text-cyan-50/55">
      {{
        t(
          '支持“先入库再应用”与“单次应用不入库”双路径；单次背景只在当前会话可见。',
          'Supports both import-then-apply and one-off apply without import; one-off visual is session-only.',
        )
      }}
    </p>

    <label class="mt-3 inline-flex items-center gap-2 text-xs text-cyan-50/75">
      <input
        type="checkbox"
        class="w-4 h-4"
        :checked="mapVisualSettings.aiVisualEnabled === true"
        @change="$emit('toggle-map-ai-visual', $event)"
      />
      {{ t('启用 AI 地图视觉', 'Enable AI map visual') }}
    </label>

    <label class="mt-2 inline-flex items-center gap-2 text-xs text-cyan-50/75">
      <input
        type="checkbox"
        class="w-4 h-4"
        :checked="mapVisualSettings.providerVisualEnabled === true"
        @change="$emit('toggle-map-provider-visual', $event)"
      />
      {{ t('启用供应商视觉生成（可选）', 'Enable provider visual generation (optional)') }}
    </label>

    <div class="mt-3 rounded-2xl border border-white/12 bg-slate-950/25 p-3 text-xs text-cyan-50/70">
      <p class="font-medium text-cyan-50">
        {{ t('自动化策略状态', 'Automation policy') }}: {{ mapAiPolicySummary }}
      </p>
      <p class="mt-1">{{ mapAiPolicyHint }}</p>
      <p class="mt-1">
        {{ t('供应商状态', 'Provider status') }}: {{ mapProviderStatusLabel }}
      </p>
      <p
        v-if="mapAutomationRuntime.lastProviderSummary"
        class="mt-1 text-[11px] text-cyan-50/55"
      >
        {{ mapAutomationRuntime.lastProviderSummary }}
      </p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          @click="$emit('trigger-map-ai-visual-refresh')"
          class="px-2 py-1 rounded border"
          :class="mapAiVisualAutomationPolicy.invokeEnabled ? 'border-cyan-200/60 text-cyan-50 bg-cyan-300/15' : 'border-white/15 text-cyan-50/50 bg-white/5'"
          :disabled="mapAiVisualRefreshing"
        >
          {{ mapAiVisualRefreshing ? t('刷新中…', 'Refreshing...') : t('触发 AI 刷新', 'Trigger AI refresh') }}
        </button>
        <button @click="$emit('open-automation-settings')" class="px-2 py-1 rounded border border-white/15">
          {{ t('前往自动化设置', 'Open automation settings') }}
        </button>
      </div>
      <p v-if="mapAutomationRuntime.lastExecuteAt > 0" class="mt-1 text-[11px] text-cyan-50/55">
        {{ t('上次执行', 'Last executed') }}: {{ formatTime(mapAutomationRuntime.lastExecuteAt) }}
      </p>
    </div>

    <div class="hidden">
      <div v-if="resolvedMapVisualMode === 'gallery' && mapVisualPreviewUrl" class="aspect-[16/8] bg-black">
        <img
          :src="mapVisualPreviewUrl"
          class="w-full h-full object-cover"
          :alt="t('地图视觉预览', 'Map visual preview')"
        />
      </div>
      <div v-else-if="mapOneOffVisualUrl" class="aspect-[16/8] bg-black">
        <img
          :src="mapOneOffVisualUrl"
          class="w-full h-full object-cover"
          :alt="mapOneOffVisualName || t('单次地图背景预览', 'One-off map visual preview')"
        />
      </div>
      <div v-else-if="mapProviderGeneratedImageUrl" class="aspect-[16/8] bg-black">
        <img
          :src="mapProviderGeneratedImageUrl"
          class="w-full h-full object-cover"
          :alt="t('供应商视觉预览', 'Provider visual preview')"
        />
      </div>
      <div v-else class="aspect-[16/8] bg-gradient-to-br from-slate-200 via-slate-100 to-blue-100 flex items-center justify-center">
        <div class="text-center text-gray-600">
          <i class="fas fa-map-location-dot text-3xl mb-2"></i>
          <p class="text-xs">{{ t('默认地图视觉（可继续使用，不影响功能）', 'Default map visual (fully usable)') }}</p>
        </div>
      </div>
    </div>

    <p v-if="mapVisualLoading" class="mt-2 text-xs text-cyan-50/60">
      {{ t('正在加载素材预览…', 'Loading asset preview...') }}
    </p>
    <p
      v-if="mapVisualHint.message"
      class="mt-2 text-xs"
      :class="mapVisualHint.tone === 'success' ? 'text-emerald-200' : mapVisualHint.tone === 'warn' ? 'text-amber-200' : 'text-cyan-50/70'"
    >
      {{ mapVisualHint.message }}
    </p>
  </section>
</template>

<style scoped>
.map-visual-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.06));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(24px);
}

.map-visual-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.12), transparent 42%);
}

.map-preview-stage {
  position: relative;
  height: 310px;
  overflow: hidden;
  border-radius: 1.75rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #07111f;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.map-default-canvas {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 30% 18%, rgba(125, 211, 252, 0.35), transparent 22%),
    radial-gradient(circle at 78% 66%, rgba(20, 184, 166, 0.32), transparent 26%),
    linear-gradient(145deg, #10243a, #102033 46%, #0b1525);
}

.map-grid-lines {
  position: absolute;
  inset: -20%;
  opacity: 0.38;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.14) 1px, transparent 1px);
  background-size: 34px 34px;
  transform: rotate(-13deg) scale(1.15);
}

.map-route-line {
  position: absolute;
  left: 18%;
  top: 58%;
  width: 66%;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #67e8f9, #fef3c7, #2dd4bf);
  box-shadow: 0 0 24px rgba(103, 232, 249, 0.55);
  transform: rotate(-24deg);
}

.map-pin {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 3px solid rgba(255, 255, 255, 0.82);
  background: #22d3ee;
  box-shadow: 0 0 0 8px rgba(34, 211, 238, 0.16), 0 0 24px rgba(34, 211, 238, 0.55);
}

.map-pin-a {
  left: 20%;
  top: 56%;
}

.map-pin-b {
  right: 18%;
  top: 33%;
  background: #fbbf24;
  box-shadow: 0 0 0 8px rgba(251, 191, 36, 0.16), 0 0 24px rgba(251, 191, 36, 0.45);
}

.map-visual-panel option {
  color: #0f172a;
}
</style>
