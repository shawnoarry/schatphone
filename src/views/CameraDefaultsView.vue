<script setup>
import { computed, reactive, ref } from 'vue'
import CameraSettingsShell from '../components/camera/CameraSettingsShell.vue'
import { useI18n } from '../composables/useI18n'
import { useImageGenerationStore } from '../stores/imageGeneration'
import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_RESOLUTIONS,
  inferImageModelCapability,
} from '../lib/image-generation-contract'

const { t } = useI18n()
const imageStore = useImageGenerationStore()
const saved = ref(false)
const draft = reactive({
  activeProfileId: imageStore.defaults.activeProfileId,
  aspectRatio: imageStore.defaults.aspectRatio,
  resolution: imageStore.defaults.resolution,
  count: imageStore.defaults.count,
})

const selectedProfile = computed(() => imageStore.getProfileById(draft.activeProfileId))
const capability = computed(() => inferImageModelCapability(
  selectedProfile.value?.modelId,
  selectedProfile.value?.endpoint,
))

const setCount = (delta) => {
  draft.count = Math.min(4, Math.max(1, draft.count + delta))
}

const save = () => {
  imageStore.setActiveProfile(draft.activeProfileId)
  imageStore.updateDefaults({
    aspectRatio: draft.aspectRatio,
    resolution: draft.resolution,
    count: draft.count,
  })
  saved.value = true
  window.setTimeout(() => { saved.value = false }, 1200)
}
</script>

<template>
  <CameraSettingsShell
    :title="t('默认生成参数', 'Generation Defaults')"
    :back-label="t('设置', 'Settings')"
  >
    <template #actions>
      <button type="button" class="camera-default-save" @click="save">
        {{ saved ? t('已保存', 'Saved') : t('保存', 'Save') }}
      </button>
    </template>

    <section class="camera-default-section">
      <h2>{{ t('默认接口', 'DEFAULT PROVIDER') }}</h2>
      <label class="camera-default-select-row">
        <span>{{ t('相机与未指定功能', 'Camera and apps without overrides') }}</span>
        <select v-model="draft.activeProfileId">
          <option v-for="profile in imageStore.profiles" :key="profile.id" :value="profile.id">
            {{ profile.name }} · {{ profile.modelId }}
          </option>
        </select>
      </label>
    </section>

    <section class="camera-default-section">
      <h2>{{ t('画幅比例', 'ASPECT RATIO') }}</h2>
      <div class="camera-ratio-grid">
        <button
          v-for="ratio in IMAGE_ASPECT_RATIOS"
          :key="ratio"
          type="button"
          :class="{ 'is-active': draft.aspectRatio === ratio }"
          @click="draft.aspectRatio = ratio"
        >
          <span class="camera-ratio-shape" :style="{ aspectRatio: ratio.replace(':', ' / ') }"></span>
          <strong>{{ ratio }}</strong>
        </button>
      </div>
    </section>

    <section v-if="capability.sizeMode !== 'ratio_only'" class="camera-default-section">
      <h2>{{ t('分辨率', 'RESOLUTION') }}</h2>
      <div class="camera-resolution-control" role="radiogroup">
        <button
          v-for="resolution in IMAGE_RESOLUTIONS"
          :key="resolution"
          type="button"
          :class="{ 'is-active': draft.resolution === resolution }"
          @click="draft.resolution = resolution"
        >
          {{ resolution }}
        </button>
      </div>
    </section>
    <p v-else class="camera-default-provider-note">
      <i class="fas fa-circle-info" aria-hidden="true"></i>
      {{ t('LJQ Club 的 GPT Image 2 使用比例参数，界面会隐藏不支持的 1K / 2K / 4K。', 'LJQ Club GPT Image 2 uses ratio-only sizing, so unsupported 1K / 2K / 4K controls stay hidden.') }}
    </p>

    <section class="camera-default-section">
      <h2>{{ t('每次生成', 'OUTPUT COUNT') }}</h2>
      <div class="camera-count-stepper">
        <button type="button" :disabled="draft.count <= 1" aria-label="Decrease" @click="setCount(-1)">
          <i class="fas fa-minus" aria-hidden="true"></i>
        </button>
        <strong>{{ draft.count }}</strong>
        <button type="button" :disabled="draft.count >= 4" aria-label="Increase" @click="setCount(1)">
          <i class="fas fa-plus" aria-hidden="true"></i>
        </button>
      </div>
    </section>
  </CameraSettingsShell>
</template>

<style scoped>
.camera-default-save {
  min-height: 32px;
  color: #1570ef;
  font-size: 12px;
  font-weight: 750;
}

.camera-default-section {
  margin-bottom: 17px;
}

.camera-default-section h2 {
  margin: 0 4px 7px;
  color: #7a7e86;
  font-size: 8px;
  font-weight: 850;
}

.camera-default-select-row {
  min-height: 62px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 13px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 8px;
  background: #fff;
}

.camera-default-select-row span {
  font-size: 10px;
  font-weight: 650;
}

.camera-default-select-row select {
  width: 100%;
  min-height: 34px;
  padding: 0 9px;
  border-radius: 6px;
  color: #3c3f46;
  background: #f0f1f3;
  font-size: 10px;
  outline: none;
}

.camera-ratio-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.camera-ratio-grid button {
  min-width: 0;
  height: 68px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 7px;
  color: #7a7e86;
  background: #fff;
}

.camera-ratio-grid button.is-active {
  border-color: rgba(21, 112, 239, 0.5);
  color: #1267d4;
  background: rgba(21, 112, 239, 0.06);
}

.camera-ratio-shape {
  width: auto;
  height: 26px;
  max-width: 38px;
  border: 1.5px solid currentColor;
}

.camera-ratio-grid strong { font-size: 8px; }

.camera-resolution-control {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 3px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 7px;
  background: #e8eaed;
}

.camera-resolution-control button {
  min-height: 34px;
  border-radius: 5px;
  color: #6d7179;
  font-size: 10px;
  font-weight: 750;
}

.camera-resolution-control button.is-active {
  color: #17191d;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1);
}

.camera-default-provider-note {
  display: flex;
  gap: 8px;
  margin: -3px 3px 17px;
  color: #737780;
  font-size: 9px;
  line-height: 1.5;
}

.camera-count-stepper {
  min-height: 50px;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 8px;
  background: #fff;
}

.camera-count-stepper button {
  height: 100%;
  color: #1570ef;
}

.camera-count-stepper button:disabled { color: #c2c4c8; }
.camera-count-stepper strong { text-align: center; font-size: 16px; }

@media (max-width: 390px) {
  .camera-ratio-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
