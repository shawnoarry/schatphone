<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import ImageSourcePicker from '../components/shared/ImageSourcePicker.vue'
import { useI18n } from '../composables/useI18n'
import {
  ASSET_CATEGORY_ENTRIES,
  ASSET_SOURCE_KEYS,
  MODULE_RELATIONSHIP_BOUNDARIES,
  findAssetCategory,
} from '../lib/planned-module-registry'
import { ASSET_STATUS, useAssetsStore } from '../stores/assets'
import { useGalleryStore } from '../stores/gallery'
import { pushReturnTarget } from '../lib/navigation-return'

const route = useRoute()
const router = useRouter()
const assetsStore = useAssetsStore()
const galleryStore = useGalleryStore()
const { t, languageBase } = useI18n()
const { assetCount, activeAssetCount, primaryTotalValue, categorySummaries, recentAssets } =
  storeToRefs(assetsStore)

const activeCategoryKey = computed(() =>
  typeof route.query.category === 'string' ? route.query.category : 'real_estate',
)
const activeCategory = computed(() => findAssetCategory(activeCategoryKey.value))
const activeCategoryLabel = computed(() =>
  languageBase.value === 'zh' ? activeCategory.value.zh : activeCategory.value.en,
)
const activeCategorySummary = computed(
  () =>
    categorySummaries.value.find((item) => item.key === activeCategory.value?.key) || {
      count: 0,
      activeCount: 0,
      primaryTotal: { currency: 'CNY', amount: '0.00', amountCents: 0 },
    },
)
const activeAssets = computed(() => assetsStore.listAssetsByCategory(activeCategory.value?.key || 'real_estate'))
const ASSETS_IMAGE_PREVIEW_SCOPE_ID = 'assets-records-view'
const assetImagePreviewMap = reactive({})

const categoryCards = computed(() =>
  ASSET_CATEGORY_ENTRIES.map((entry) => {
    const summary = categorySummaries.value.find((item) => item.key === entry.key) || {
      count: 0,
      primaryTotal: { currency: 'CNY', amount: '0.00' },
    }
    return {
      ...entry,
      label: languageBase.value === 'zh' ? entry.zh : entry.en,
      desc: languageBase.value === 'zh' ? entry.descZh : entry.descEn,
      active: entry.key === activeCategory.value?.key,
      count: summary.count,
      primaryTotal: summary.primaryTotal,
    }
  }),
)
const galleryImageOptions = computed(() =>
  galleryStore.assets
    .filter((asset) => ['reference', 'scenario', 'wallpaper'].includes(asset.category))
    .slice(0, 80),
)

const statusOptions = computed(() => [
  { key: ASSET_STATUS.ACTIVE, label: t('Active', 'Active') },
  { key: ASSET_STATUS.WATCHING, label: t('Watching', 'Watching') },
  { key: ASSET_STATUS.ARCHIVED, label: t('Archived', 'Archived') },
  { key: ASSET_STATUS.SOLD, label: t('Sold', 'Sold') },
])

const sourcePlan = computed(() => [
  {
    key: ASSET_SOURCE_KEYS.SHOPPING_PURCHASE,
    title: t('Shopping purchase intake', 'Shopping purchase intake'),
    desc: t('Eligible purchases can become long-term owned assets.', 'Eligible purchases can become long-term owned assets.'),
  },
  {
    key: ASSET_SOURCE_KEYS.STOCK_HOLDINGS_SUMMARY,
    title: t('Stock holdings summary', 'Stock holdings summary'),
    desc: t('Assets may read investment summaries without owning market behavior.', 'Assets may read investment summaries without owning market behavior.'),
  },
  {
    key: ASSET_SOURCE_KEYS.MAP_LOCATION_CONTEXT,
    title: t('Map location context', 'Map location context'),
    desc: t('Properties and vehicles can later become place or trip context.', 'Properties and vehicles can later become place or trip context.'),
  },
  {
    key: ASSET_SOURCE_KEYS.WALLET_CASHFLOW_CONTEXT,
    title: t('Wallet cashflow context', 'Wallet cashflow context'),
    desc: t('Wallet records money; Assets records owned objects; read-only summaries connect them.', 'Wallet records money; Assets records owned objects; read-only summaries connect them.'),
  },
])

const boundaryCards = computed(() =>
  MODULE_RELATIONSHIP_BOUNDARIES.filter((item) => item.owner === 'assets' || item.owner === 'stock'),
)

const createAssetDraft = (category = activeCategoryKey.value) => ({
  name: '',
  category: findAssetCategory(category)?.key || 'real_estate',
  estimatedValue: '',
  currency: 'CNY',
  location: '',
  note: '',
  status: ASSET_STATUS.ACTIVE,
  imageSourceType: 'none',
  imageUrl: '',
  imageGalleryAssetId: '',
})

const editingAssetId = ref('')
const assetDraft = ref(createAssetDraft())

const formatTotal = (total) => `${total?.amount || '0.00'} ${total?.currency || 'CNY'}`

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const openCategory = (key) => {
  if (!editingAssetId.value) {
    assetDraft.value.category = findAssetCategory(key)?.key || 'real_estate'
  }
  router.push({
    path: '/assets',
    query: { category: key },
  })
}

const resetAssetDraft = (category = activeCategoryKey.value) => {
  editingAssetId.value = ''
  assetDraft.value = createAssetDraft(category)
}

const submitAssetDraft = () => {
  const imageSourceType = assetDraft.value.imageSourceType
  const asset = assetsStore.upsertAsset({
    id: editingAssetId.value,
    ...assetDraft.value,
    imageSourceType,
    imageUrl: imageSourceType === 'url' ? assetDraft.value.imageUrl : '',
    imageGalleryAssetId: imageSourceType === 'gallery' ? assetDraft.value.imageGalleryAssetId : '',
    sourceModule: 'assets_manual',
  })
  if (!asset) return
  resetAssetDraft(asset.category)
  router.replace({
    path: '/assets',
    query: { category: asset.category },
  })
}

const startEditAsset = (asset) => {
  editingAssetId.value = asset.id
  assetDraft.value = {
    name: asset.name,
    category: asset.category,
    estimatedValue: asset.estimatedValue,
    currency: asset.currency,
    location: asset.location,
    note: asset.note,
    status: asset.status,
    imageSourceType: asset.image?.sourceType || 'none',
    imageUrl: asset.image?.sourceType === 'url' ? asset.image.url : '',
    imageGalleryAssetId: asset.image?.sourceType === 'gallery' ? asset.image.galleryAssetId : '',
  }
}

const removeAsset = (assetId) => {
  assetsStore.removeAsset(assetId)
  if (editingAssetId.value === assetId) resetAssetDraft(activeCategory.value?.key)
}

const updateAssetStatus = (asset, status) => {
  assetsStore.updateAssetStatus(asset.id, status)
}

const assetImageUrl = (asset) => {
  const image = asset?.image || {}
  if (image.sourceType === 'url') return image.url || ''
  if (image.sourceType === 'gallery' && image.galleryAssetId) {
    return assetImagePreviewMap[image.galleryAssetId] || ''
  }
  return ''
}

const assetImageSourceLabel = (asset) => {
  const sourceType = asset?.image?.sourceType || 'none'
  if (sourceType === 'url') return t('URL image', 'URL image')
  if (sourceType === 'gallery') return t('Gallery asset', 'Gallery asset')
  if (sourceType === 'ai') return t('AI image reserved', 'AI image reserved')
  return t('Default icon', 'Default icon')
}

watch(
  () => activeAssets.value.map((asset) => asset.image?.galleryAssetId || '').filter(Boolean),
  (assetIds) => {
    const activeSet = new Set(assetIds)
    assetIds.forEach((assetId) => {
      if (assetImagePreviewMap[assetId]) return
      void galleryStore.getAssetPreviewUrl(assetId, {
        scopeId: ASSETS_IMAGE_PREVIEW_SCOPE_ID,
      }).then((previewUrl) => {
        if (previewUrl) assetImagePreviewMap[assetId] = previewUrl
      })
    })
    Object.keys(assetImagePreviewMap).forEach((assetId) => {
      if (!activeSet.has(assetId)) {
        galleryStore.releaseAssetPreview(assetId, ASSETS_IMAGE_PREVIEW_SCOPE_ID)
        delete assetImagePreviewMap[assetId]
      }
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  galleryStore.releaseAssetPreviewScope(ASSETS_IMAGE_PREVIEW_SCOPE_ID)
  Object.keys(assetImagePreviewMap).forEach((assetId) => {
    delete assetImagePreviewMap[assetId]
  })
})
</script>

<template>
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('Home', 'Home') }}
      </button>
      <h1 class="font-bold">{{ t('Assets', 'Assets') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar bg-gray-50 px-5 py-6 space-y-4">
      <section class="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-cyan-900 p-5 text-white">
        <p class="text-xs font-semibold text-cyan-200">{{ t('Local asset baseline', 'Local asset baseline') }}</p>
        <h2 class="mt-2 text-2xl font-black">
          {{ t('Track long-term owned objects without replacing Wallet or merging Stock.', 'Track long-term owned objects without replacing Wallet or merging Stock.') }}
        </h2>
        <p class="mt-3 text-xs leading-5 text-white/70">
          {{ t('Assets now supports categories, value summaries, local CRUD, and Settings backup. Shopping, Map, Wallet, and Stock handoffs can follow as read-only integrations.', 'Assets now supports categories, value summaries, local CRUD, and Settings backup. Shopping, Map, Wallet, and Stock handoffs can follow as read-only integrations.') }}
        </p>
        <div class="mt-4 grid grid-cols-3 gap-2">
          <div class="rounded-2xl bg-white/10 p-3">
            <p class="text-[10px] text-white/55">{{ t('Records', 'Records') }}</p>
            <p class="mt-1 text-lg font-black">{{ assetCount }}</p>
          </div>
          <div class="rounded-2xl bg-white/10 p-3">
            <p class="text-[10px] text-white/55">{{ t('Active', 'Active') }}</p>
            <p class="mt-1 text-lg font-black">{{ activeAssetCount }}</p>
          </div>
          <div class="rounded-2xl bg-white/10 p-3">
            <p class="text-[10px] text-white/55">{{ t('Value', 'Value') }}</p>
            <p class="mt-1 text-sm font-black">{{ formatTotal(primaryTotalValue) }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('Active asset category', 'Active asset category') }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ activeCategoryLabel }}</p>
          </div>
          <span class="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-semibold text-cyan-700">
            {{ activeCategorySummary.count }} 璺?{{ formatTotal(activeCategorySummary.primaryTotal) }}
          </span>
        </div>
      </section>

      <section class="grid grid-cols-2 gap-3">
        <button
          v-for="category in categoryCards"
          :key="category.key"
          class="rounded-2xl border p-4 text-left transition"
          :class="category.active ? 'border-cyan-300 bg-cyan-50' : 'border-gray-200 bg-white'"
          :data-testid="`assets-category-${category.key}`"
          @click="openCategory(category.key)"
        >
          <span
            class="w-10 h-10 rounded-xl text-white flex items-center justify-center"
            :class="category.active ? 'bg-cyan-600' : 'bg-gray-900'"
          >
            <i :class="category.icon"></i>
          </span>
          <p class="mt-3 text-sm font-bold">{{ category.label }}</p>
          <p class="mt-1 text-[11px] leading-4 text-gray-500">{{ category.desc }}</p>
          <p class="mt-3 text-[11px] font-semibold text-gray-700">
            {{ category.count }} 璺?{{ formatTotal(category.primaryTotal) }}
          </p>
        </button>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold">
              {{ editingAssetId ? t('Edit asset', 'Edit asset') : t('Add asset', 'Add asset') }}
            </p>
            <p class="mt-1 text-[11px] text-gray-500">
              {{ t('Manual records land first; automatic cross-module intake comes later.', 'Manual records land first; automatic cross-module intake comes later.') }}
            </p>
          </div>
          <button
            v-if="editingAssetId"
            type="button"
            class="text-[11px] font-semibold text-gray-500"
            data-testid="assets-cancel-edit"
            @click="resetAssetDraft(activeCategory.key)"
          >
            {{ t('Cancel', 'Cancel') }}
          </button>
        </div>

        <form class="mt-4 space-y-3" data-testid="assets-draft-form" @submit.prevent="submitAssetDraft">
          <input
            v-model="assetDraft.name"
            class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-cyan-400"
            :placeholder="t('Asset name, e.g. Bayside Apartment', 'Asset name, e.g. Bayside Apartment')"
            data-testid="assets-draft-name"
          />
          <div class="grid grid-cols-2 gap-2">
            <select
              v-model="assetDraft.category"
              class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
              data-testid="assets-draft-category"
            >
              <option v-for="category in categoryCards" :key="category.key" :value="category.key">
                {{ category.label }}
              </option>
            </select>
            <select
              v-model="assetDraft.status"
              class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
              data-testid="assets-draft-status"
            >
              <option v-for="status in statusOptions" :key="status.key" :value="status.key">
                {{ status.label }}
              </option>
            </select>
          </div>
          <div class="grid grid-cols-[1fr_88px] gap-2">
            <input
              v-model="assetDraft.estimatedValue"
              inputmode="decimal"
              class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-cyan-400"
              :placeholder="t('Estimated value', 'Estimated value')"
              data-testid="assets-draft-value"
            />
            <input
              v-model="assetDraft.currency"
              class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm uppercase outline-none"
              placeholder="CNY"
              data-testid="assets-draft-currency"
            />
          </div>
          <input
            v-model="assetDraft.location"
            class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-cyan-400"
            :placeholder="t('Location/owner, e.g. Garage A', 'Location/owner, e.g. Garage A')"
            data-testid="assets-draft-location"
          />
          <ImageSourcePicker
            v-model:source-type="assetDraft.imageSourceType"
            v-model:image-url="assetDraft.imageUrl"
            v-model:gallery-asset-id="assetDraft.imageGalleryAssetId"
            :gallery-assets="galleryImageOptions"
            test-id-prefix="assets-draft"
          />
          <textarea
            v-model="assetDraft.note"
            rows="2"
            class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-cyan-400"
            :placeholder="t('Notes for future Map, Shopping, or Wallet handoff cues', 'Notes for future Map, Shopping, or Wallet handoff cues')"
            data-testid="assets-draft-note"
          ></textarea>
          <button
            type="submit"
            class="w-full rounded-xl bg-cyan-600 py-2.5 text-sm font-bold text-white shadow-sm"
            data-testid="assets-save-draft"
          >
            {{ editingAssetId ? t('Save changes', 'Save changes') : t('Save asset', 'Save asset') }}
          </button>
        </form>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold">{{ activeCategoryLabel }}</p>
          <p class="text-[11px] text-gray-500">
            {{ activeAssets.length }} {{ t('records', 'records') }}
          </p>
        </div>
        <div class="mt-3 space-y-2">
          <article
            v-for="asset in activeAssets"
            :key="asset.id"
            class="rounded-xl border border-gray-100 bg-gray-50 p-3"
            :data-testid="`assets-record-${asset.id}`"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-cyan-100 to-slate-200 flex items-center justify-center text-cyan-700">
                <img
                  v-if="assetImageUrl(asset)"
                  :src="assetImageUrl(asset)"
                  :alt="asset.image?.alt || asset.name"
                  class="h-full w-full rounded-xl object-cover"
                />
                <i v-else class="fas fa-gem"></i>
              </div>
              <div>
                <p class="text-sm font-bold text-gray-900">{{ asset.name }}</p>
                <p class="mt-1 text-[11px] text-gray-500">
                  {{ formatTotal({ amount: asset.estimatedValue, currency: asset.currency }) }}
                  <span v-if="asset.location"> 璺?{{ asset.location }}</span>
                </p>
                <p v-if="asset.note" class="mt-2 text-[11px] leading-4 text-gray-500">{{ asset.note }}</p>
                <p class="mt-1 text-[10px] text-cyan-600">{{ assetImageSourceLabel(asset) }}</p>
              </div>
              <select
                class="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px]"
                :value="asset.status"
                :data-testid="`assets-status-${asset.id}`"
                @change="updateAssetStatus(asset, $event.target.value)"
              >
                <option v-for="status in statusOptions" :key="status.key" :value="status.key">
                  {{ status.label }}
                </option>
              </select>
            </div>
            <div class="mt-3 flex items-center gap-2">
              <button
                type="button"
                class="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-cyan-700"
                :data-testid="`assets-edit-${asset.id}`"
                @click="startEditAsset(asset)"
              >
                {{ t('Edit', 'Edit') }}
              </button>
              <button
                type="button"
                class="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-red-500"
                :data-testid="`assets-delete-${asset.id}`"
                @click="removeAsset(asset.id)"
              >
                {{ t('Delete', 'Delete') }}
              </button>
              <code class="ml-auto text-[10px] text-gray-400">{{ asset.sourceModule }}</code>
            </div>
          </article>

          <div v-if="activeAssets.length === 0" class="rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-500">
            {{ t('No asset records in this category yet.', 'No asset records in this category yet.') }}
          </div>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <p class="text-sm font-semibold">{{ t('Recent assets', 'Recent assets') }}</p>
        <div class="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          <article
            v-for="asset in recentAssets"
            :key="asset.id"
            class="min-w-[150px] rounded-xl bg-gray-50 p-3"
          >
            <p class="text-xs font-bold text-gray-900 line-clamp-1">{{ asset.name }}</p>
            <p class="mt-1 text-[11px] text-gray-500">{{ formatTotal({ amount: asset.estimatedValue, currency: asset.currency }) }}</p>
          </article>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <p class="text-sm font-semibold">{{ t('Future source keys', 'Future source keys') }}</p>
        <div class="mt-3 space-y-2">
          <article v-for="item in sourcePlan" :key="item.key" class="rounded-xl bg-gray-50 p-3">
            <p class="text-xs font-semibold text-gray-900">{{ item.title }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">{{ item.desc }}</p>
            <code class="mt-2 block text-[10px] text-gray-400">{{ item.key }}</code>
          </article>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <p class="text-sm font-semibold">{{ t('Boundary rules', 'Boundary rules') }}</p>
        <div class="mt-3 space-y-2">
          <article
            v-for="item in boundaryCards"
            :key="item.owner"
            class="rounded-xl border border-gray-100 p-3"
          >
            <p class="text-xs font-semibold uppercase text-gray-500">{{ item.owner }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-600">{{ item.rule }}</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
