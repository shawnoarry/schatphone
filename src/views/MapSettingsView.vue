<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { normalizeHomePageQuery } from '../lib/navigation-return'
import { getRecommendedMapPackIdForWorldPack } from '../lib/map-packs'
import { useGalleryStore } from '../stores/gallery'
import { useImageGenerationStore } from '../stores/imageGeneration'
import { useMapStore } from '../stores/map'
import { useSystemStore } from '../stores/system'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const mapStore = useMapStore()
const galleryStore = useGalleryStore()
const imageStore = useImageGenerationStore()
const systemStore = useSystemStore()

const previewScopeId = 'map-settings'
const importOpen = ref(false)
const generateOpen = ref(false)
const importFileInputRef = ref(null)
const importFile = ref(null)
const importFileDimensions = ref({ width: 1600, height: 1024 })
const customPreviewMap = reactive({})
const generatedCandidate = ref(null)
const generationBusy = ref(false)
const feedback = ref({ tone: '', text: '' })

const importForm = reactive({
  name: '',
  distanceScaleKm: 24,
  factions: '',
})

const generationForm = reactive({
  name: '',
  prompt: '',
  distanceScaleKm: 24,
  factions: '螺旋协约, 赤锈同盟, 翠域协议, 无旗自由带',
})

const activeWorldPack = computed(() => systemStore.getActiveWorldPack?.() || {
  id: 'default_world',
  title: '默认世界',
  name: 'Default world',
})
const activeWorldPackId = computed(() => activeWorldPack.value?.id || 'default_world')
const activeWorldName = computed(() =>
  t(
    activeWorldPack.value?.title || activeWorldPack.value?.name || '默认世界',
    activeWorldPack.value?.name || activeWorldPack.value?.title || 'Default world',
  ),
)
const recommendedMapPackId = computed(() =>
  getRecommendedMapPackIdForWorldPack(activeWorldPack.value),
)
const boundMapPackId = computed(() => mapStore.resolveMapPackIdForWorld(activeWorldPack.value))
const boundMapPack = computed(() =>
  mapStore.mapPacks.find((pack) => pack.id === boundMapPackId.value) || mapStore.mapPacks[0],
)
const hasWorldOverride = computed(() =>
  Boolean(mapStore.worldMapPackBindings[activeWorldPackId.value]),
)
const activeProfile = computed(() => imageStore.getProfileForModule('map'))
const profileReady = computed(() => {
  const profile = activeProfile.value
  if (!profile) return false
  const credentials = imageStore.getCredentials(profile.id)
  return Boolean(credentials.apiKey || credentials.proxyToken)
})
const boundMapPreviewUrl = computed(() =>
  boundMapPack.value?.source === 'custom'
    ? customPreviewMap[boundMapPack.value.id] || ''
    : boundMapPack.value?.assetUrl || '',
)

const mapPackName = (pack) => t(pack?.labelZh || '', pack?.labelEn || '')
const mapPackDescription = (pack) => t(pack?.descriptionZh || '', pack?.descriptionEn || '')

const setFeedback = (tone, text) => {
  feedback.value = { tone, text }
}

const refreshCustomPreviews = async () => {
  galleryStore.releaseAssetPreviewScope(previewScopeId)
  const nextIds = new Set()
  for (const pack of mapStore.customMapPacks) {
    nextIds.add(pack.id)
    const preview = await galleryStore.getAssetPreviewUrl(pack.assetId, { scopeId: previewScopeId })
    customPreviewMap[pack.id] = preview || ''
  }
  Object.keys(customPreviewMap).forEach((packId) => {
    if (!nextIds.has(packId)) delete customPreviewMap[packId]
  })
}

watch(
  () => mapStore.customMapPacks.map((pack) => `${pack.id}:${pack.assetId}:${pack.updatedAt}`).join('|'),
  () => { void refreshCustomPreviews() },
  { immediate: true },
)

const mapContextQuery = computed(() => {
  const homePage = normalizeHomePageQuery(route.query.homePage)
  return {
    ...(route.query.from === 'home' ? { from: 'home' } : {}),
    ...(homePage ? { homePage } : {}),
  }
})

const openMap = () => router.push({ path: '/map', query: mapContextQuery.value })

const openPlaceSettings = () => {
  router.push({ path: '/map/settings/places', query: mapContextQuery.value })
}

const openWorldSettings = () => {
  router.push({
    path: '/worldbook',
    query: { source: 'map-settings', panel: 'pack' },
  })
}

const openImageSettings = () => {
  router.push({
    path: '/camera/settings/providers',
    query: { source: 'map-settings' },
  })
}

const openVisualSettings = () => {
  router.push({
    path: '/map',
    query: { source: 'map-settings', panel: 'visual' },
  })
}

const mapVisualModeLabel = computed(() =>
  mapStore.mapVisualSettings?.mode === 'gallery'
    ? t('素材库视觉', 'Gallery visual')
    : t('默认视觉', 'Default visual'),
)

const useMapPack = (packId) => {
  const ok = mapStore.bindMapPackToWorld(activeWorldPack.value, packId)
  setFeedback(
    ok ? 'success' : 'warning',
    ok
      ? t('当前世界的地图已更新。', 'The map for this world has been updated.')
      : t('行程进行中，暂时不能更换地图。', 'The map cannot be changed during an active trip.'),
  )
}

const useRecommendedMap = () => {
  const ok = mapStore.resetWorldMapPackBinding(activeWorldPack.value)
  setFeedback(
    ok ? 'success' : 'warning',
    ok
      ? t('已恢复当前世界的推荐地图。', 'The recommended map is active again.')
      : t('行程进行中，暂时不能更换地图。', 'The map cannot be changed during an active trip.'),
  )
}

const parseFactions = (value) =>
  String(value || '')
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((label, index, list) => {
      const columns = list.length <= 4 ? 2 : 3
      const row = Math.floor(index / columns)
      const column = index % columns
      return {
        id: `faction-${index + 1}`,
        labelZh: label,
        labelEn: label,
        position: {
          kind: 'canvas',
          x: (column + 1) / (columns + 1),
          y: (row + 1) / (Math.ceil(list.length / columns) + 1),
        },
      }
    })

const readImageDimensions = (source) =>
  new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve({
      width: Math.max(320, image.naturalWidth || 1600),
      height: Math.max(240, image.naturalHeight || 1024),
    })
    image.onerror = () => resolve({ width: 1600, height: 1024 })
    image.src = source
  })

const onImportFilePicked = async (event) => {
  const file = event?.target?.files?.[0]
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    importFile.value = null
    setFeedback('warning', t('请选择地图图片。', 'Choose a map image.'))
    return
  }
  importFile.value = file
  if (!importForm.name.trim()) importForm.name = file.name.replace(/\.[^.]+$/, '')
  const objectUrl = URL.createObjectURL(file)
  importFileDimensions.value = await readImageDimensions(objectUrl)
  URL.revokeObjectURL(objectUrl)
}

const saveMapPackFromAsset = ({ assetId, name, dimensions, distanceScaleKm, factions }) => {
  const pack = mapStore.createCustomMapPack({
    assetId,
    labelZh: name,
    labelEn: name,
    shortLabelZh: name,
    shortLabelEn: name,
    assetWidth: dimensions.width,
    assetHeight: dimensions.height,
    distanceScaleKm,
    factions: parseFactions(factions),
  })
  if (!pack) return null
  return mapStore.bindMapPackToWorld(activeWorldPack.value, pack.id) ? pack : null
}

const importMap = async () => {
  if (!(importFile.value instanceof File) || !importForm.name.trim()) {
    setFeedback('warning', t('请选择图片并填写地图名称。', 'Choose an image and name the map.'))
    return
  }
  const result = await galleryStore.importAssetsFromFiles([importFile.value], { category: 'scenario' })
  const assetId = result.importedIds?.[0] || result.duplicateAssetIds?.[0] || ''
  if (!assetId) {
    setFeedback('error', t('地图图片未能保存，请检查文件大小和存储空间。', 'The map image could not be saved. Check its size and storage.'))
    return
  }
  const pack = saveMapPackFromAsset({
    assetId,
    name: importForm.name.trim(),
    dimensions: importFileDimensions.value,
    distanceScaleKm: importForm.distanceScaleKm,
    factions: importForm.factions,
  })
  if (!pack) {
    setFeedback('warning', t('地图已导入，但行程进行中，暂时不能绑定。', 'The map was imported but cannot be bound during an active trip.'))
    return
  }
  importOpen.value = false
  importFile.value = null
  importForm.name = ''
  importForm.factions = ''
  setFeedback('success', t('地图已导入并绑定到当前世界。', 'The map was imported and bound to this world.'))
}

const generateMap = async () => {
  if (!generationForm.name.trim() || !generationForm.prompt.trim()) {
    setFeedback('warning', t('填写地图名称和画面描述后再生成。', 'Name and describe the map before generating.'))
    return
  }
  if (!profileReady.value) {
    setFeedback('warning', t('图像生成服务尚未配置。', 'Image generation is not configured.'))
    return
  }
  generationBusy.value = true
  generatedCandidate.value = null
  const factionNames = parseFactions(generationForm.factions).map((item) => item.labelZh).join(', ')
  const result = await imageStore.generateForModule({
    moduleKey: 'map',
    input: {
      prompt: [
        'Create a top-down illustrated city map for an interactive narrative game.',
        generationForm.prompt.trim(),
        factionNames ? `Clearly divide these factions with readable territory boundaries: ${factionNames}.` : '',
        'Show coherent districts, roads, landmarks, terrain, and open space for map pins.',
        'No UI, labels, legend, watermark, perspective view, or decorative frame.',
      ].filter(Boolean).join('\n'),
      intent: 'create',
      aspectRatio: '16:9',
      resolution: imageStore.defaults.resolution,
      count: 1,
    },
  })
  generationBusy.value = false
  if (!result.ok || !result.candidates?.[0]) {
    setFeedback('error', result.error?.message || t('地图生成失败，请检查图像服务。', 'Map generation failed. Check the image service.'))
    return
  }
  generatedCandidate.value = result.candidates[0]
}

const dataUrlToFile = (dataUrl, name) => {
  const match = String(dataUrl || '').match(/^data:([^;,]+)?;base64,(.+)$/i)
  if (!match) return null
  try {
    const binary = atob(match[2])
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new File([bytes], name, { type: match[1] || 'image/png', lastModified: Date.now() })
  } catch {
    return null
  }
}

const useGeneratedMap = async () => {
  const candidate = generatedCandidate.value
  if (!candidate) return
  let imported
  if (candidate.imageUrl.startsWith('data:image/')) {
    const file = dataUrlToFile(candidate.imageUrl, `map-${candidate.id}.png`)
    imported = file
      ? await galleryStore.importAssetsFromFiles([file], { category: 'scenario' })
      : { ok: false }
  } else {
    imported = galleryStore.importAssetFromUrl({
      url: candidate.imageUrl,
      name: generationForm.name.trim(),
      category: 'scenario',
    })
  }
  const assetId = imported.assetId || imported.importedIds?.[0] || imported.duplicatedAssetId || ''
  if (!assetId) {
    setFeedback('error', t('生成结果未能保存。', 'The generated map could not be saved.'))
    return
  }
  const dimensions = await readImageDimensions(candidate.imageUrl)
  const pack = saveMapPackFromAsset({
    assetId,
    name: generationForm.name.trim(),
    dimensions,
    distanceScaleKm: generationForm.distanceScaleKm,
    factions: generationForm.factions,
  })
  if (!pack) {
    setFeedback('warning', t('地图已保存，但行程进行中，暂时不能绑定。', 'The map was saved but cannot be bound during an active trip.'))
    return
  }
  imageStore.markCandidateKept(candidate.id, assetId)
  generatedCandidate.value = null
  generateOpen.value = false
  setFeedback('success', t('生成地图已绑定到当前世界。', 'The generated map is now bound to this world.'))
}

onBeforeUnmount(() => galleryStore.releaseAssetPreviewScope(previewScopeId))
</script>

<template>
  <div class="map-settings-view" data-testid="map-settings-view">
    <header class="map-settings-header">
      <button type="button" class="map-settings-icon-button" :aria-label="t('返回地图', 'Back to Map')" @click="openMap">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <div class="min-w-0">
        <p>{{ t('地图', 'MAP') }}</p>
        <h1>{{ t('地图设置', 'Map settings') }}</h1>
      </div>
      <button type="button" class="map-settings-icon-button" :aria-label="t('世界观设置', 'World settings')" @click="openWorldSettings">
        <i class="fas fa-earth-asia" aria-hidden="true"></i>
      </button>
    </header>

    <main class="map-settings-content no-scrollbar">
      <section class="map-world-band">
        <div class="map-world-copy">
          <span>{{ t('当前世界', 'Current world') }}</span>
          <h2>{{ activeWorldName }}</h2>
          <p>{{ hasWorldOverride ? t('使用自定义地图绑定', 'Custom map binding') : t('使用世界推荐地图', 'Recommended world map') }}</p>
        </div>
        <button type="button" @click="openWorldSettings">
          {{ t('管理世界', 'Manage world') }}
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
      </section>

      <section class="map-source-section" data-testid="map-current-source">
        <div class="map-section-heading">
          <div>
            <span>{{ t('当前地图', 'Current map') }}</span>
            <h2>{{ mapPackName(boundMapPack) }}</h2>
          </div>
          <span class="map-source-badge">{{ boundMapPack?.coordinateKind === 'geo' ? 'OpenFreeMap' : boundMapPack?.source === 'custom' ? t('自定义', 'Custom') : t('内置', 'Built-in') }}</span>
        </div>
        <div class="map-source-preview">
          <img v-if="boundMapPreviewUrl" :src="boundMapPreviewUrl" :alt="mapPackName(boundMapPack)" />
          <div class="map-source-preview-shade"></div>
          <div class="map-source-preview-copy">
            <strong>{{ mapPackName(boundMapPack) }}</strong>
            <span>{{ boundMapPack?.coordinateKind === 'geo' ? t('真实地理坐标', 'Geographic coordinates') : t('虚构世界坐标', 'Fictional world coordinates') }}</span>
          </div>
        </div>
        <p class="map-source-description">{{ mapPackDescription(boundMapPack) }}</p>
        <div v-if="boundMapPack?.coordinateKind === 'geo'" class="map-runtime-source" data-testid="map-real-basemap-source">
          <i class="fas fa-layer-group" aria-hidden="true"></i>
          <span>
            <strong>{{ t('OpenFreeMap 矢量街道', 'OpenFreeMap vector streets') }}</strong>
            <small>{{ t('无需密钥 · 本地图包用于离线回退', 'No key required · local pack used offline') }}</small>
          </span>
        </div>
        <button v-if="hasWorldOverride" type="button" class="map-text-action" @click="useRecommendedMap">
          <i class="fas fa-rotate-left" aria-hidden="true"></i>
          {{ t('恢复推荐地图', 'Restore recommended map') }}
        </button>
      </section>

      <section class="map-management-section">
        <div class="map-section-heading">
          <div>
            <span>{{ t('地图内容', 'Map content') }}</span>
            <h2>{{ t('地点与图钉', 'Places and pins') }}</h2>
          </div>
          <span>{{ mapStore.addresses.filter((item) => item.mapPackId === boundMapPackId).length }}</span>
        </div>
        <div class="map-source-actions">
          <button type="button" data-testid="map-open-place-settings" @click="openPlaceSettings">
            <i class="fas fa-location-dot" aria-hidden="true"></i>
            <span><strong>{{ t('管理图钉', 'Manage pins') }}</strong><small>{{ t('新增、编辑资料并重新选择坐标', 'Create, edit, and reselect coordinates') }}</small></span>
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </section>

      <section class="map-create-section">
        <div class="map-section-heading">
          <div>
            <span>{{ t('地图来源', 'Map source') }}</span>
            <h2>{{ t('添加地图', 'Add a map') }}</h2>
          </div>
        </div>
        <div class="map-source-actions">
          <button type="button" data-testid="map-open-import" @click="importOpen = true">
            <i class="fas fa-file-arrow-up" aria-hidden="true"></i>
            <span><strong>{{ t('导入地图', 'Import map') }}</strong><small>{{ t('PNG、JPG 或 WebP', 'PNG, JPG, or WebP') }}</small></span>
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
          <button type="button" data-testid="map-open-generate" @click="generateOpen = true">
            <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
            <span><strong>{{ t('生成虚构地图', 'Generate fictional map') }}</strong><small>{{ activeProfile?.name || t('未配置图像服务', 'Image service not configured') }}</small></span>
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </section>

      <section class="map-presentation-section">
        <div class="map-section-heading">
          <div>
            <span>{{ t('地图显示', 'Map display') }}</span>
            <h2>{{ t('氛围图层', 'Atmosphere layer') }}</h2>
          </div>
        </div>
        <div class="map-source-actions">
          <button type="button" data-testid="map-open-visual-settings" @click="openVisualSettings">
            <i class="fas fa-layer-group" aria-hidden="true"></i>
            <span><strong>{{ t('背景与视觉', 'Background and visuals') }}</strong><small>{{ mapVisualModeLabel }}</small></span>
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </section>

      <section class="map-library-section">
        <div class="map-section-heading">
          <div>
            <span>{{ t('地图库', 'Map library') }}</span>
            <h2>{{ t('可用地图', 'Available maps') }}</h2>
          </div>
          <span>{{ mapStore.mapPacks.length }}</span>
        </div>
        <div class="map-library-list">
          <article v-for="pack in mapStore.mapPacks" :key="pack.id" class="map-library-row">
            <div class="map-library-thumb">
              <img v-if="pack.source === 'custom' ? customPreviewMap[pack.id] : pack.assetUrl" :src="pack.source === 'custom' ? customPreviewMap[pack.id] : pack.assetUrl" :alt="mapPackName(pack)" />
              <i v-else class="fas fa-map" aria-hidden="true"></i>
            </div>
            <div class="min-w-0">
              <strong>{{ mapPackName(pack) }}</strong>
              <span>{{ pack.id === recommendedMapPackId ? t('当前世界推荐', 'Recommended for this world') : pack.source === 'custom' ? t('自定义地图', 'Custom map') : t('内置地图', 'Built-in map') }}</span>
            </div>
            <button
              type="button"
              :disabled="pack.id === boundMapPackId"
              :aria-label="t(`使用${mapPackName(pack)}`, `Use ${mapPackName(pack)}`)"
              @click="useMapPack(pack.id)"
            >
              <i :class="pack.id === boundMapPackId ? 'fas fa-check' : 'fas fa-link'" aria-hidden="true"></i>
            </button>
          </article>
        </div>
      </section>

      <p v-if="feedback.text" class="map-settings-feedback" :class="`is-${feedback.tone}`" role="status">
        {{ feedback.text }}
      </p>
    </main>

    <div v-if="importOpen" class="map-settings-modal-backdrop" @click.self="importOpen = false">
      <section class="map-settings-modal" role="dialog" aria-modal="true" :aria-label="t('导入地图', 'Import map')" data-testid="map-import-dialog">
        <div class="map-modal-header">
          <div><span>{{ activeWorldName }}</span><h2>{{ t('导入地图', 'Import map') }}</h2></div>
          <button type="button" :aria-label="t('关闭', 'Close')" @click="importOpen = false"><i class="fas fa-xmark" aria-hidden="true"></i></button>
        </div>
        <input ref="importFileInputRef" type="file" class="hidden" accept="image/png,image/jpeg,image/webp" @change="onImportFilePicked" />
        <button type="button" class="map-file-picker" @click="importFileInputRef?.click()">
          <i class="fas fa-image" aria-hidden="true"></i>
          <span><strong>{{ importFile?.name || t('选择地图图片', 'Choose map image') }}</strong><small v-if="importFile">{{ importFileDimensions.width }} × {{ importFileDimensions.height }}</small></span>
        </button>
        <label class="map-form-field"><span>{{ t('地图名称', 'Map name') }}</span><input v-model="importForm.name" data-testid="map-import-name" /></label>
        <label class="map-form-field"><span>{{ t('世界跨度（公里）', 'World span (km)') }}</span><input v-model.number="importForm.distanceScaleKm" type="number" min="1" max="500" /></label>
        <label class="map-form-field"><span>{{ t('阵营（可选）', 'Factions (optional)') }}</span><textarea v-model="importForm.factions" rows="2" :placeholder="t('用逗号分隔阵营名称', 'Separate faction names with commas')"></textarea></label>
        <button type="button" class="map-modal-primary" data-testid="map-import-confirm" @click="importMap">{{ t('导入并用于当前世界', 'Import for this world') }}</button>
      </section>
    </div>

    <div v-if="generateOpen" class="map-settings-modal-backdrop" @click.self="generateOpen = false">
      <section class="map-settings-modal" role="dialog" aria-modal="true" :aria-label="t('生成虚构地图', 'Generate fictional map')" data-testid="map-generate-dialog">
        <div class="map-modal-header">
          <div><span>{{ activeWorldName }}</span><h2>{{ t('生成虚构地图', 'Generate fictional map') }}</h2></div>
          <button type="button" :aria-label="t('关闭', 'Close')" @click="generateOpen = false"><i class="fas fa-xmark" aria-hidden="true"></i></button>
        </div>
        <template v-if="!generatedCandidate">
          <label class="map-form-field"><span>{{ t('地图名称', 'Map name') }}</span><input v-model="generationForm.name" data-testid="map-generate-name" /></label>
          <label class="map-form-field"><span>{{ t('城市与地貌', 'City and terrain') }}</span><textarea v-model="generationForm.prompt" rows="4" data-testid="map-generate-prompt" :placeholder="t('例如：被沙海包围的赛博废都，中心有坍塌高架与中立集市', 'Example: a cyber wasteland surrounded by dunes, with a collapsed viaduct and neutral market')"></textarea></label>
          <label class="map-form-field"><span>{{ t('阵营', 'Factions') }}</span><textarea v-model="generationForm.factions" rows="2"></textarea></label>
          <label class="map-form-field"><span>{{ t('世界跨度（公里）', 'World span (km)') }}</span><input v-model.number="generationForm.distanceScaleKm" type="number" min="1" max="500" /></label>
          <button v-if="profileReady" type="button" class="map-modal-primary" :disabled="generationBusy" data-testid="map-generate-confirm" @click="generateMap">
            <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
            {{ generationBusy ? t('正在生成', 'Generating') : t('生成地图', 'Generate map') }}
          </button>
          <button v-else type="button" class="map-modal-primary" @click="openImageSettings">{{ t('配置图像生成服务', 'Configure image service') }}</button>
        </template>
        <template v-else>
          <div class="map-generated-preview"><img :src="generatedCandidate.imageUrl" :alt="generationForm.name" /></div>
          <div class="map-generated-actions">
            <button type="button" @click="generatedCandidate = null">{{ t('重新生成', 'Generate again') }}</button>
            <button type="button" class="is-primary" data-testid="map-use-generated" @click="useGeneratedMap">{{ t('用于当前世界', 'Use for this world') }}</button>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.map-settings-view {
  --map-ink: #17211d;
  --map-muted: #69746e;
  --map-line: #dce2de;
  --map-accent: #18705a;
  height: 100%;
  overflow: hidden;
  background: #f4f6f3;
  color: var(--map-ink);
}

.map-settings-header {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 12px;
  min-height: 104px;
  padding: 42px 16px 14px;
  border-bottom: 1px solid var(--map-line);
  background: rgba(250, 251, 249, 0.96);
}

.map-settings-header p,
.map-section-heading span,
.map-world-copy > span,
.map-modal-header span {
  color: var(--map-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.map-settings-header h1,
.map-section-heading h2,
.map-world-copy h2,
.map-modal-header h2 {
  margin: 2px 0 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0;
}

.map-settings-icon-button,
.map-modal-header button {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid var(--map-line);
  border-radius: 8px;
  background: #fff;
  color: var(--map-ink);
}

.map-settings-content {
  height: calc(100% - 104px);
  overflow-y: auto;
  padding-bottom: 36px;
}

.map-world-band,
.map-source-section,
.map-management-section,
.map-create-section,
.map-presentation-section,
.map-library-section {
  padding: 18px 18px 20px;
  border-bottom: 1px solid var(--map-line);
}

.map-world-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: #e8efe9;
}

.map-world-copy p {
  margin-top: 5px;
  color: var(--map-muted);
  font-size: 12px;
}

.map-world-band > button,
.map-text-action {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  color: var(--map-accent);
  font-size: 12px;
  font-weight: 800;
}

.map-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;
}

.map-section-heading > span,
.map-source-badge {
  border-radius: 999px;
  background: #e4ebe6;
  padding: 5px 8px;
  color: #426052;
  font-size: 10px;
  font-weight: 800;
}

.map-source-preview {
  position: relative;
  aspect-ratio: 16 / 8;
  overflow: hidden;
  border-radius: 8px;
  background: #26312c;
}

.map-source-preview img,
.map-generated-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.map-source-preview-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 45%, rgba(11, 20, 16, 0.78));
}

.map-source-preview-copy {
  position: absolute;
  right: 12px;
  bottom: 10px;
  left: 12px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  color: #fff;
}

.map-source-preview-copy strong { font-size: 15px; }
.map-source-preview-copy span { font-size: 10px; }
.map-source-description { margin: 11px 0 0; color: var(--map-muted); font-size: 12px; line-height: 1.65; }
.map-runtime-source { display: grid; min-height: 54px; grid-template-columns: 34px minmax(0, 1fr); align-items: center; gap: 10px; margin-top: 12px; border-top: 1px solid var(--map-line); border-bottom: 1px solid var(--map-line); }
.map-runtime-source > i { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 7px; background: #dfeae3; color: var(--map-accent); font-size: 12px; }
.map-runtime-source span { display: grid; min-width: 0; gap: 2px; }
.map-runtime-source strong { font-size: 11px; }
.map-runtime-source small { overflow: hidden; color: var(--map-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }

.map-source-actions {
  border-top: 1px solid var(--map-line);
}

.map-source-actions > button {
  display: grid;
  width: 100%;
  min-height: 68px;
  grid-template-columns: 38px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 11px;
  border-bottom: 1px solid var(--map-line);
  text-align: left;
}

.map-source-actions > button > i:first-child {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 8px;
  background: #dfeae3;
  color: var(--map-accent);
}

.map-source-actions span { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.map-source-actions strong { font-size: 13px; }
.map-source-actions small { overflow: hidden; color: var(--map-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.map-source-actions > button > i:last-child { color: #8b9690; font-size: 10px; }

.map-library-list { border-top: 1px solid var(--map-line); }
.map-library-row { display: grid; min-height: 66px; grid-template-columns: 48px minmax(0, 1fr) 38px; align-items: center; gap: 11px; border-bottom: 1px solid var(--map-line); }
.map-library-thumb { display: grid; width: 46px; height: 38px; place-items: center; overflow: hidden; border-radius: 6px; background: #dfe6e1; color: #718078; }
.map-library-thumb img { width: 100%; height: 100%; object-fit: cover; }
.map-library-row strong { display: block; overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.map-library-row span { display: block; margin-top: 3px; color: var(--map-muted); font-size: 10px; }
.map-library-row button { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid var(--map-line); border-radius: 8px; background: #fff; color: var(--map-accent); }
.map-library-row button:disabled { border-color: #b9d1c4; background: #dfece5; }

.map-settings-feedback { margin: 16px 18px 0; border: 1px solid #c9d7cf; border-radius: 8px; background: #edf3ef; padding: 10px 12px; color: #355b49; font-size: 12px; }
.map-settings-feedback.is-warning { border-color: #e3d2a2; background: #fff8e7; color: #775b16; }
.map-settings-feedback.is-error { border-color: #e5bdb8; background: #fff0ee; color: #8d332a; }

.map-settings-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(17, 28, 23, 0.46);
}

.map-settings-modal {
  width: min(100%, 620px);
  max-height: 88vh;
  overflow-y: auto;
  border-radius: 8px 8px 0 0;
  background: #f9faf8;
  padding: 18px 18px calc(22px + env(safe-area-inset-bottom));
  color: var(--map-ink);
  box-shadow: 0 -18px 60px rgba(20, 32, 26, 0.24);
}

.map-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.map-file-picker { display: grid; width: 100%; min-height: 74px; grid-template-columns: 40px minmax(0, 1fr); align-items: center; gap: 12px; border: 1px dashed #aebbb4; border-radius: 8px; background: #f1f4f1; padding: 12px; text-align: left; }
.map-file-picker > i { color: var(--map-accent); font-size: 20px; }
.map-file-picker span { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
.map-file-picker strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.map-file-picker small { color: var(--map-muted); font-size: 10px; }
.map-form-field { display: block; margin-top: 13px; }
.map-form-field > span { display: block; margin-bottom: 6px; color: var(--map-muted); font-size: 10px; font-weight: 800; }
.map-form-field input,
.map-form-field textarea { width: 100%; border: 1px solid #ced7d1; border-radius: 7px; background: #fff; padding: 10px 11px; color: var(--map-ink); font-size: 13px; outline: none; }
.map-form-field textarea { resize: vertical; }
.map-form-field input:focus,
.map-form-field textarea:focus { border-color: var(--map-accent); box-shadow: 0 0 0 3px rgba(24, 112, 90, 0.12); }
.map-modal-primary { display: inline-flex; width: 100%; min-height: 46px; align-items: center; justify-content: center; gap: 8px; margin-top: 17px; border-radius: 7px; background: var(--map-accent); padding: 0 16px; color: #fff; font-size: 13px; font-weight: 800; }
.map-modal-primary:disabled { opacity: 0.55; }
.map-generated-preview { aspect-ratio: 16 / 9; overflow: hidden; border-radius: 8px; background: #26312c; }
.map-generated-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin-top: 13px; }
.map-generated-actions button { min-height: 44px; border: 1px solid var(--map-line); border-radius: 7px; background: #fff; font-size: 12px; font-weight: 800; }
.map-generated-actions .is-primary { border-color: var(--map-accent); background: var(--map-accent); color: #fff; }

@media (min-width: 720px) {
  .map-settings-modal { margin-bottom: 24px; border-radius: 8px; }
  .map-settings-content { width: min(100%, 760px); margin: 0 auto; border-right: 1px solid var(--map-line); border-left: 1px solid var(--map-line); }
}
</style>
