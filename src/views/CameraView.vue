<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useGalleryStore } from '../stores/gallery'
import { useImageGenerationStore } from '../stores/imageGeneration'
import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_RESOLUTIONS,
  inferImageModelCapability,
} from '../lib/image-generation-contract'
import { pushReturnTarget } from '../lib/navigation-return'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const galleryStore = useGalleryStore()
const imageStore = useImageGenerationStore()

const previewScope = 'camera-reference-picker'
const prompt = ref('')
const mode = ref('create')
const referencePickerOpen = ref(false)
const selectedReferenceIds = ref([])
const referencePreviewMap = ref({})
const selectedCandidateId = ref('')
const busy = ref(false)
const feedback = ref({ tone: '', text: '' })

const modes = computed(() => [
  { id: 'create', label: t('创作', 'Create'), icon: 'fas fa-wand-magic-sparkles' },
  { id: 'reference', label: t('参考', 'Reference'), icon: 'fas fa-user' },
  { id: 'edit', label: t('编辑', 'Edit'), icon: 'fas fa-pen' },
])

const activeProfile = computed(() => imageStore.getProfileForModule('camera'))
const capability = computed(() => inferImageModelCapability(
  activeProfile.value?.modelId,
  activeProfile.value?.endpoint,
))
const referenceAssets = computed(() => galleryStore.getAssetsByCategory('reference').slice(0, 40))
const selectedReferences = computed(() => referenceAssets.value.filter((asset) =>
  selectedReferenceIds.value.includes(asset.id),
))
const candidates = computed(() => imageStore.recentCandidates)
const currentCandidate = computed(() =>
  candidates.value.find((candidate) => candidate.id === selectedCandidateId.value) || candidates.value[0] || null,
)
const canGenerate = computed(() => Boolean(prompt.value.trim() && activeProfile.value && !busy.value))
const profileReady = computed(() => Boolean(
  activeProfile.value && imageStore.getCredentials(activeProfile.value.id).apiKey,
))
const shutterLabel = computed(() => busy.value
  ? t('正在生成', 'Generating')
  : t('生成图片', 'Generate image'))

const setFeedback = (tone, text) => {
  feedback.value = { tone, text }
}

const refreshReferencePreviews = async () => {
  galleryStore.releaseAssetPreviewScope(previewScope)
  const next = {}
  for (const asset of referenceAssets.value) {
    const preview = await galleryStore.getAssetPreviewUrl(asset.id, { scopeId: previewScope })
    if (preview) next[asset.id] = preview
  }
  referencePreviewMap.value = next
}

watch(
  () => referenceAssets.value.map((asset) => `${asset.id}:${asset.updatedAt}`).join('|'),
  () => { void refreshReferencePreviews() },
  { immediate: true },
)

watch(mode, (value) => {
  if (value === 'create') referencePickerOpen.value = false
})

watch(
  () => route.query.candidate,
  (value) => {
    const candidateId = Array.isArray(value) ? value[0] : value
    if (typeof candidateId === 'string' && candidates.value.some((item) => item.id === candidateId)) {
      selectedCandidateId.value = candidateId
    }
  },
  { immediate: true },
)

const toggleReference = (assetId) => {
  if (selectedReferenceIds.value.includes(assetId)) {
    selectedReferenceIds.value = selectedReferenceIds.value.filter((id) => id !== assetId)
    return
  }
  if (selectedReferenceIds.value.length >= 4) {
    setFeedback('warning', t('最多选择 4 张参考图。', 'Choose up to 4 references.'))
    return
  }
  selectedReferenceIds.value = [...selectedReferenceIds.value, assetId]
}

const resolveSelectedReferenceUrls = async () => {
  const urls = []
  for (const assetId of selectedReferenceIds.value) {
    const resolved = await galleryStore.getAssetAiReferenceUrl(assetId)
    if (resolved.ok) urls.push(resolved.url)
  }
  return urls
}

const generate = async () => {
  if (!prompt.value.trim()) {
    setFeedback('warning', t('先写下你想拍到的画面。', 'Describe the image first.'))
    return
  }
  if (!activeProfile.value) {
    setFeedback('error', t('没有可用的生图配置。', 'No image profile is available.'))
    return
  }
  if (!profileReady.value) {
    setFeedback('warning', t('当前配置还没有 API Key，请先打开相机设置。', 'Add an API key in Camera settings first.'))
    return
  }
  if (mode.value !== 'create' && selectedReferenceIds.value.length === 0) {
    setFeedback('warning', t('这个模式需要先从相册选择参考图。', 'Choose a Gallery reference for this mode.'))
    referencePickerOpen.value = true
    return
  }

  busy.value = true
  setFeedback('', '')
  const referenceUrls = mode.value === 'create' ? [] : await resolveSelectedReferenceUrls()
  if (mode.value !== 'create' && referenceUrls.length === 0) {
    busy.value = false
    setFeedback('error', t('参考图暂时无法读取，请在相册中检查素材。', 'The selected references could not be read.'))
    return
  }

  const result = await imageStore.generateForModule({
    moduleKey: 'camera',
    input: {
      prompt: prompt.value,
      referenceUrls,
      intent: mode.value === 'edit' ? 'edit' : mode.value === 'reference' ? 'reference' : 'create',
      aspectRatio: imageStore.defaults.aspectRatio,
      resolution: imageStore.defaults.resolution,
      count: imageStore.defaults.count,
    },
  })
  busy.value = false
  if (!result.ok) {
    const requestIssue = result.errors?.[0]?.code
    setFeedback('error', result.error?.message || requestIssue || t('生成失败，请查看诊断。', 'Generation failed. Check Diagnostics.'))
    return
  }
  selectedCandidateId.value = result.candidates[0]?.id || ''
  setFeedback('success', t('候选图已生成，确认后再保留到相册。', 'Candidate ready. Keep it only after review.'))
}

const dataUrlToFile = (dataUrl, name) => {
  const match = dataUrl.match(/^data:([^;,]+)?;base64,(.+)$/i)
  if (!match) return null
  try {
    const binary = atob(match[2])
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new File([bytes], name, { type: match[1] || 'image/png', lastModified: Date.now() })
  } catch {
    return null
  }
}

const keepCurrentCandidate = async () => {
  const candidate = currentCandidate.value
  if (!candidate || candidate.galleryAssetId) return
  const name = `Camera ${new Date(candidate.createdAt).toLocaleString()}`
  let imported
  if (candidate.imageUrl.startsWith('data:image/')) {
    const file = dataUrlToFile(candidate.imageUrl, `camera-${candidate.id}.png`)
    imported = file
      ? await galleryStore.importAssetsFromFiles([file], { category: 'scenario' })
      : { ok: false, reason: 'invalid_data_url' }
  } else {
    imported = galleryStore.importAssetFromUrl({
      url: candidate.imageUrl,
      name,
      category: 'scenario',
    })
  }

  const galleryAssetId = imported.assetId || imported.importedIds?.[0] || imported.duplicatedAssetId || ''
  if (!galleryAssetId) {
    setFeedback('error', t('无法写入相册，请检查存储空间。', 'Could not keep this image in Gallery.'))
    return
  }
  imageStore.markCandidateKept(candidate.id, galleryAssetId)
  setFeedback('success', t('已保留到相册，不会自动成为人物参考图。', 'Kept in Gallery without making it a person reference.'))
}

const downloadCurrentCandidate = async () => {
  const candidate = currentCandidate.value
  if (!candidate) return
  const anchor = document.createElement('a')
  anchor.href = candidate.imageUrl
  anchor.download = `camera-${candidate.id}.png`
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

const discardCurrentCandidate = () => {
  const candidate = currentCandidate.value
  if (!candidate) return
  imageStore.removeCandidate(candidate.id)
  selectedCandidateId.value = imageStore.recentCandidates[0]?.id || ''
  setFeedback('success', t('候选图已丢弃；已保留的相册素材不受影响。', 'Candidate discarded. Kept Gallery media is unchanged.'))
}

const openSettings = () => router.push({ path: '/camera/settings', query: { ...route.query } })
const openTasks = () => router.push({ path: '/camera/tasks', query: { ...route.query } })
const goBack = () => pushReturnTarget(router, route, '/home')

onBeforeUnmount(() => galleryStore.releaseAssetPreviewScope(previewScope))
</script>

<template>
  <div class="camera-view" data-testid="camera-view">
    <header class="camera-topbar">
      <button type="button" class="camera-icon-button" :aria-label="t('返回', 'Back')" @click="goBack">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <button type="button" class="camera-profile-chip" @click="openSettings">
        <span class="camera-profile-dot" :class="{ 'is-ready': profileReady }"></span>
        <span>{{ activeProfile?.name || t('未配置', 'Not configured') }}</span>
        <small>{{ activeProfile?.modelId || t('选择模型', 'Choose model') }}</small>
      </button>
      <div class="camera-top-actions">
        <button type="button" class="camera-icon-button" :aria-label="t('任务', 'Tasks')" @click="openTasks">
          <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="camera-icon-button"
          :aria-label="t('相机设置', 'Camera settings')"
          data-testid="camera-settings-button"
          @click="openSettings"
        >
          <i class="fas fa-sliders" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <main class="camera-stage">
      <div class="camera-viewfinder" :class="{ 'has-result': currentCandidate }">
        <img
          v-if="currentCandidate"
          :src="currentCandidate.imageUrl"
          :alt="t('当前生成候选图', 'Current generated candidate')"
          class="camera-result-image"
        />
        <div v-else class="camera-empty-state">
          <span class="camera-lens-mark"><i class="fas fa-camera" aria-hidden="true"></i></span>
          <p>{{ t('写下画面，然后按下快门', 'Frame the idea, then press the shutter') }}</p>
        </div>

        <div v-if="busy" class="camera-loading" role="status">
          <span class="camera-loading-ring"></span>
          <p>{{ t('正在显影', 'Developing') }}</p>
        </div>

        <div v-if="currentCandidate" class="camera-result-actions">
          <button
            type="button"
            class="camera-result-action"
            :aria-label="t('下载到设备', 'Download to device')"
            :title="t('下载到设备', 'Download to device')"
            @click="downloadCurrentCandidate"
          >
            <i class="fas fa-download" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="camera-result-action"
            :aria-label="t('丢弃候选图', 'Discard candidate')"
            :title="t('丢弃候选图', 'Discard candidate')"
            data-testid="camera-discard-candidate"
            @click="discardCurrentCandidate"
          >
            <i class="fas fa-trash" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="camera-keep-action"
            :disabled="Boolean(currentCandidate.galleryAssetId)"
            data-testid="camera-keep-gallery"
            @click="keepCurrentCandidate"
          >
            <i :class="currentCandidate.galleryAssetId ? 'fas fa-check' : 'fas fa-images'" aria-hidden="true"></i>
            <span>{{ currentCandidate.galleryAssetId ? t('已在相册', 'In Gallery') : t('保留到相册', 'Keep in Gallery') }}</span>
          </button>
        </div>
      </div>

      <div v-if="candidates.length > 1" class="camera-filmstrip no-scrollbar" aria-label="Recent candidates">
        <button
          v-for="candidate in candidates"
          :key="candidate.id"
          type="button"
          class="camera-film-frame"
          :class="{ 'is-active': currentCandidate?.id === candidate.id }"
          @click="selectedCandidateId = candidate.id"
        >
          <img :src="candidate.imageUrl" alt="" />
          <i v-if="candidate.galleryAssetId" class="fas fa-check" aria-hidden="true"></i>
        </button>
      </div>
    </main>

    <section class="camera-console">
      <div class="camera-mode-strip" role="tablist" :aria-label="t('生成模式', 'Generation mode')">
        <button
          v-for="item in modes"
          :key="item.id"
          type="button"
          role="tab"
          :aria-selected="mode === item.id"
          :class="{ 'is-active': mode === item.id }"
          :data-testid="`camera-mode-${item.id}`"
          @click="mode = item.id"
        >
          <i :class="item.icon" aria-hidden="true"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div class="camera-prompt-row">
        <button
          type="button"
          class="camera-reference-button"
          :class="{ 'has-selection': selectedReferenceIds.length > 0 }"
          :aria-label="t('选择相册参考图', 'Choose Gallery references')"
          data-testid="camera-reference-button"
          @click="referencePickerOpen = !referencePickerOpen"
        >
          <i class="fas fa-photo-film" aria-hidden="true"></i>
          <span v-if="selectedReferenceIds.length">{{ selectedReferenceIds.length }}</span>
        </button>
        <label class="camera-prompt-field">
          <span class="sr-only">{{ t('画面描述', 'Image description') }}</span>
          <textarea
            v-model="prompt"
            rows="2"
            maxlength="12000"
            :placeholder="t('描述人物、动作、光线与氛围…', 'Describe subject, action, light, and mood...')"
            data-testid="camera-prompt"
          ></textarea>
        </label>
        <button
          type="button"
          class="camera-shutter"
          :disabled="!canGenerate"
          :aria-label="shutterLabel"
          data-testid="camera-shutter"
          @click="generate"
        >
          <span></span>
        </button>
      </div>

      <div class="camera-parameter-row">
        <label>
          <i class="fas fa-crop-simple" aria-hidden="true"></i>
          <select v-model="imageStore.defaults.aspectRatio" @change="imageStore.updateDefaults({ aspectRatio: imageStore.defaults.aspectRatio })">
            <option v-for="ratio in IMAGE_ASPECT_RATIOS" :key="ratio" :value="ratio">{{ ratio }}</option>
          </select>
        </label>
        <label v-if="capability.sizeMode !== 'ratio_only'">
          <i class="fas fa-expand" aria-hidden="true"></i>
          <select v-model="imageStore.defaults.resolution" @change="imageStore.updateDefaults({ resolution: imageStore.defaults.resolution })">
            <option v-for="resolution in IMAGE_RESOLUTIONS" :key="resolution" :value="resolution">{{ resolution }}</option>
          </select>
        </label>
        <span class="camera-parameter-meta">
          {{ imageStore.defaults.count }}× · {{ mode === 'create' ? t('无参考', 'No reference') : `${selectedReferenceIds.length} ${t('张参考', 'refs')}` }}
        </span>
      </div>

      <p v-if="feedback.text" class="camera-feedback" :class="`is-${feedback.tone}`" role="status">
        {{ feedback.text }}
      </p>
    </section>

    <transition name="camera-sheet">
      <aside v-if="referencePickerOpen" class="camera-reference-sheet" data-testid="camera-reference-sheet">
        <div class="camera-sheet-handle"></div>
        <div class="camera-sheet-head">
          <div>
            <p>{{ t('相册', 'GALLERY') }}</p>
            <h2>{{ t('人物参考', 'Person references') }}</h2>
          </div>
          <button type="button" :aria-label="t('关闭', 'Close')" @click="referencePickerOpen = false">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <div v-if="referenceAssets.length" class="camera-reference-grid no-scrollbar">
          <button
            v-for="asset in referenceAssets"
            :key="asset.id"
            type="button"
            :class="{ 'is-selected': selectedReferenceIds.includes(asset.id) }"
            :data-testid="`camera-reference-${asset.id}`"
            @click="toggleReference(asset.id)"
          >
            <img v-if="referencePreviewMap[asset.id]" :src="referencePreviewMap[asset.id]" :alt="asset.name" />
            <span v-else><i class="fas fa-image" aria-hidden="true"></i></span>
            <i class="fas fa-check camera-reference-check" aria-hidden="true"></i>
          </button>
        </div>
        <button v-else type="button" class="camera-gallery-empty" @click="router.push({ path: '/gallery', query: { source: 'camera' } })">
          <i class="fas fa-images" aria-hidden="true"></i>
          <span>{{ t('相册还没有参考图', 'No reference images in Gallery') }}</span>
          <small>{{ t('前往相册添加', 'Open Gallery') }}</small>
        </button>
        <div class="camera-sheet-footer">
          <span>{{ selectedReferences.map((asset) => asset.name).join(' · ') || t('尚未选择', 'Nothing selected') }}</span>
          <button type="button" @click="referencePickerOpen = false">{{ t('完成', 'Done') }}</button>
        </div>
      </aside>
    </transition>
  </div>
</template>

<style scoped>
.camera-view {
  --camera-yellow: #ffd533;
  --camera-white: #f8f8f6;
  --camera-muted: rgba(248, 248, 246, 0.58);
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  color: var(--camera-white);
  background: #060708;
}

.camera-topbar {
  min-height: 78px;
  padding: 34px 14px 8px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  background: #060708;
  z-index: 4;
}

.camera-icon-button {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--camera-white);
  background: rgba(255, 255, 255, 0.09);
}

.camera-top-actions {
  display: flex;
  gap: 7px;
}

.camera-profile-chip {
  min-width: 0;
  width: min(100%, 280px);
  display: grid;
  grid-template-columns: 8px minmax(0, auto) minmax(0, auto);
  align-items: center;
  justify-content: center;
  justify-self: center;
  gap: 7px;
  color: var(--camera-white);
  font-size: 11px;
}

.camera-profile-chip > span:nth-child(2),
.camera-profile-chip small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.camera-profile-chip small {
  color: var(--camera-muted);
  font-size: 9px;
}

.camera-profile-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff453a;
  box-shadow: 0 0 0 3px rgba(255, 69, 58, 0.14);
}

.camera-profile-dot.is-ready {
  background: #32d74b;
  box-shadow: 0 0 0 3px rgba(50, 215, 75, 0.14);
}

.camera-stage {
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.camera-viewfinder {
  position: relative;
  width: 100%;
  max-height: 100%;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    #101214;
  background-size: 33.333% 33.333%;
}

.camera-result-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #020202;
}

.camera-empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: rgba(255, 255, 255, 0.48);
}

.camera-empty-state p {
  margin: 0;
  max-width: 220px;
  text-align: center;
  font-size: 12px;
}

.camera-lens-mark {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  font-size: 19px;
  background: rgba(255, 255, 255, 0.04);
}

.camera-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(4, 5, 6, 0.72);
  backdrop-filter: blur(10px);
}

.camera-loading p {
  margin: 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 11px;
}

.camera-loading-ring {
  width: 34px;
  height: 34px;
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-top-color: var(--camera-yellow);
  border-radius: 50%;
  animation: camera-spin 0.8s linear infinite;
}

.camera-result-actions {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.camera-result-action,
.camera-keep-action {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 18px;
  color: #fff;
  background: rgba(8, 9, 10, 0.7);
  backdrop-filter: blur(12px);
}

.camera-result-action {
  width: 36px;
}

.camera-keep-action {
  padding: 0 13px;
  font-size: 11px;
  font-weight: 700;
}

.camera-keep-action:disabled {
  color: #32d74b;
}

.camera-filmstrip {
  flex: 0 0 auto;
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding: 8px 12px 2px;
}

.camera-film-frame {
  position: relative;
  flex: 0 0 42px;
  width: 42px;
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 5px;
  background: #17191c;
}

.camera-film-frame.is-active {
  border-color: var(--camera-yellow);
}

.camera-film-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-film-frame > i {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 13px;
  height: 13px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #071108;
  background: #32d74b;
  font-size: 7px;
}

.camera-console {
  position: relative;
  padding: 9px 14px calc(18px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: #090a0c;
  z-index: 5;
}

.camera-mode-strip {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 9px;
}

.camera-mode-strip button {
  min-width: 64px;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 10px;
  font-weight: 700;
}

.camera-mode-strip button.is-active {
  color: var(--camera-yellow);
}

.camera-prompt-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 54px;
  align-items: center;
  gap: 9px;
}

.camera-reference-button {
  position: relative;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.74);
  background: #191b1f;
}

.camera-reference-button.has-selection {
  color: var(--camera-yellow);
}

.camera-reference-button span {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 17px;
  height: 17px;
  display: grid;
  place-items: center;
  padding: 0 4px;
  border: 2px solid #090a0c;
  border-radius: 9px;
  color: #111;
  background: var(--camera-yellow);
  font-size: 8px;
  font-weight: 800;
}

.camera-prompt-field textarea {
  width: 100%;
  min-height: 44px;
  max-height: 78px;
  resize: none;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 8px;
  padding: 8px 10px;
  color: #fff;
  background: #15171a;
  font-size: 11px;
  line-height: 1.4;
  outline: none;
}

.camera-prompt-field textarea:focus {
  border-color: rgba(255, 213, 51, 0.5);
}

.camera-shutter {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border: 3px solid #fff;
  border-radius: 50%;
}

.camera-shutter span {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #fff;
  transition: transform 120ms ease, background 120ms ease;
}

.camera-shutter:active span {
  transform: scale(0.9);
  background: var(--camera-yellow);
}

.camera-shutter:disabled {
  opacity: 0.34;
}

.camera-parameter-row {
  min-height: 26px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 7px 63px 0 47px;
}

.camera-parameter-row label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 9px;
}

.camera-parameter-row select {
  color: rgba(255, 255, 255, 0.78);
  background: transparent;
  font-size: 9px;
  outline: none;
}

.camera-parameter-row option {
  color: #111;
}

.camera-parameter-meta {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.36);
  font-size: 9px;
  white-space: nowrap;
}

.camera-feedback {
  margin: 5px 0 0 47px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 9px;
  line-height: 1.35;
}

.camera-feedback.is-error { color: #ff7068; }
.camera-feedback.is-warning { color: #ffd35a; }
.camera-feedback.is-success { color: #64dc78; }

.camera-reference-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 12;
  max-height: 68%;
  display: flex;
  flex-direction: column;
  padding: 8px 14px calc(18px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px 14px 0 0;
  color: #f7f7f4;
  background: rgba(20, 21, 24, 0.98);
  box-shadow: 0 -18px 48px rgba(0, 0, 0, 0.5);
}

.camera-sheet-handle {
  width: 34px;
  height: 4px;
  margin: 0 auto 12px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.24);
}

.camera-sheet-head,
.camera-sheet-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.camera-sheet-head p,
.camera-sheet-head h2 {
  margin: 0;
}

.camera-sheet-head p {
  color: rgba(255, 255, 255, 0.44);
  font-size: 8px;
  font-weight: 800;
}

.camera-sheet-head h2 {
  margin-top: 2px;
  font-size: 17px;
}

.camera-sheet-head > button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.08);
}

.camera-reference-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
  overflow-y: auto;
  margin-top: 14px;
}

.camera-reference-grid button {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 4px;
  background: #2a2c31;
}

.camera-reference-grid button.is-selected {
  border-color: var(--camera-yellow);
}

.camera-reference-grid img,
.camera-reference-grid button > span {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-reference-grid button > span {
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.28);
}

.camera-reference-check {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 17px;
  height: 17px;
  display: none;
  place-items: center;
  border-radius: 50%;
  color: #111;
  background: var(--camera-yellow);
  font-size: 8px;
}

.camera-reference-grid button.is-selected .camera-reference-check {
  display: grid;
}

.camera-gallery-empty {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.66);
}

.camera-gallery-empty i { font-size: 22px; }
.camera-gallery-empty span { font-size: 11px; }
.camera-gallery-empty small { color: var(--camera-yellow); font-size: 9px; }

.camera-sheet-footer {
  min-height: 48px;
  margin-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.camera-sheet-footer span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.45);
  font-size: 9px;
}

.camera-sheet-footer button {
  flex: 0 0 auto;
  color: var(--camera-yellow);
  font-size: 12px;
  font-weight: 750;
}

.camera-sheet-enter-active,
.camera-sheet-leave-active {
  transition: transform 220ms ease, opacity 220ms ease;
}

.camera-sheet-enter-from,
.camera-sheet-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

@keyframes camera-spin { to { transform: rotate(360deg); } }

@media (min-width: 720px) {
  .camera-viewfinder {
    width: auto;
    height: min(100%, 700px);
    max-width: 560px;
    margin: 0 auto;
    border-radius: 6px;
  }

  .camera-console {
    padding-left: max(14px, calc((100% - 680px) / 2));
    padding-right: max(14px, calc((100% - 680px) / 2));
  }

  .camera-reference-sheet {
    left: 50%;
    right: auto;
    width: min(100%, 620px);
    transform: translateX(-50%);
    border-radius: 14px 14px 0 0;
  }

  .camera-sheet-enter-from,
  .camera-sheet-leave-to {
    transform: translate(-50%, 100%);
  }
}
</style>
