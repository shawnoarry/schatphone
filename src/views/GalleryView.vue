<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { GALLERY_ASSET_CATEGORIES, useGalleryStore } from '../stores/gallery'

const router = useRouter()
const galleryStore = useGalleryStore()
const { t } = useI18n()

const activeCategory = ref('all')
const localImportCategory = ref('reference')
const localFileInput = ref(null)
const feedback = reactive({
  type: '',
  text: '',
})
const urlForm = reactive({
  url: '',
  name: '',
  category: 'reference',
})
const previewMap = reactive({})

const categoryLabel = (key) => {
  if (key === 'all') return t('全部', 'All')
  if (key === 'wallpaper') return t('壁纸', 'Wallpaper')
  if (key === 'emoji') return t('表情', 'Emoji')
  if (key === 'reference') return t('参考图', 'Reference')
  if (key === 'scenario') return t('场景图', 'Scenario')
  return key
}

const categoryTabs = computed(() => [
  { key: 'all', label: categoryLabel('all'), count: galleryStore.categoryCounts.all || 0 },
  ...GALLERY_ASSET_CATEGORIES.map((key) => ({
    key,
    label: categoryLabel(key),
    count: galleryStore.categoryCounts[key] || 0,
  })),
])

const visibleAssets = computed(() => galleryStore.getAssetsByCategory(activeCategory.value))

const setFeedback = (type, text) => {
  feedback.type = type
  feedback.text = text
  if (!text) return
  setTimeout(() => {
    if (feedback.text === text) {
      feedback.type = ''
      feedback.text = ''
    }
  }, 1800)
}

const goHome = () => {
  router.push('/home')
}

const openLocalImport = () => {
  localFileInput.value?.click()
}

const handleLocalImport = async (event) => {
  const files = event?.target?.files
  if (!files || files.length === 0) return

  const result = await galleryStore.importAssetsFromFiles(files, {
    category: localImportCategory.value,
  })

  if (event?.target) {
    event.target.value = ''
  }

  if (!result.ok) {
    setFeedback('error', t('没有可导入的有效图片文件。', 'No valid image file was imported.'))
    return
  }

  const parts = [
    t(`已导入 ${result.importedCount} 项`, `${result.importedCount} imported`),
  ]
  if (result.skippedDuplicateCount > 0) {
    parts.push(t(`跳过重复 ${result.skippedDuplicateCount} 项`, `${result.skippedDuplicateCount} duplicates skipped`))
  }
  if (result.skippedUnsupportedCount > 0) {
    parts.push(
      t(`跳过不支持格式 ${result.skippedUnsupportedCount} 项`, `${result.skippedUnsupportedCount} unsupported skipped`),
    )
  }
  setFeedback('success', parts.join(' · '))
}

const importFromUrl = () => {
  const result = galleryStore.importAssetFromUrl({
    url: urlForm.url,
    name: urlForm.name,
    category: urlForm.category,
  })
  if (!result.ok) {
    if (result.reason === 'duplicate') {
      setFeedback('warn', t('该 URL 已存在于素材库。', 'This URL already exists in the library.'))
      return
    }
    setFeedback('error', t('URL 无效，仅支持 http/https。', 'Invalid URL, only http/https is supported.'))
    return
  }

  urlForm.url = ''
  urlForm.name = ''
  setFeedback('success', t('URL 素材导入成功。', 'URL asset imported.'))
}

const renameAsset = (asset) => {
  const nextName = window.prompt(
    t('输入新的素材名称：', 'Input new asset name:'),
    asset?.name || '',
  )
  if (nextName == null) return
  const ok = galleryStore.renameAsset(asset.id, nextName)
  if (ok) {
    setFeedback('success', t('素材名称已更新。', 'Asset name updated.'))
  }
}

const moveAssetToCategory = (assetId, category) => {
  const ok = galleryStore.moveAssetToCategory(assetId, category)
  if (ok) {
    setFeedback('success', t('素材分类已更新。', 'Asset category updated.'))
  }
}

const removeAsset = async (asset) => {
  const guard = galleryStore.getAssetDeletionGuard(asset.id)
  const usageText = guard.usages?.length
    ? `${t('当前被使用于', 'Currently used by')}: ${guard.usages.map((item) => item.label).join(', ')}`
    : ''

  const confirmed = window.confirm(
    [
      t(`确认删除素材“${asset.name}”吗？`, `Delete "${asset.name}"?`),
      usageText,
      guard.blocked
        ? t('该素材正在被使用，确认后将强制删除。', 'This asset is in use and will be force removed.')
        : t('删除后不可恢复。', 'Deletion cannot be undone.'),
    ]
      .filter(Boolean)
      .join('\n'),
  )
  if (!confirmed) return

  const result = await galleryStore.removeAsset(asset.id, {
    force: guard.blocked,
  })
  if (!result.ok) {
    setFeedback('error', t('删除失败，请重试。', 'Delete failed, please try again.'))
    return
  }

  delete previewMap[asset.id]
  setFeedback('success', t('素材已删除。', 'Asset removed.'))
}

const hydrateAssetPreview = async (assetId) => {
  if (!assetId || previewMap[assetId]) return
  const previewUrl = await galleryStore.getAssetPreviewUrl(assetId)
  previewMap[assetId] = previewUrl || ''
}

watch(
  visibleAssets,
  (list) => {
    const nextIds = new Set(list.map((item) => item.id))
    list.forEach((asset) => {
      void hydrateAssetPreview(asset.id)
    })
    Object.keys(previewMap).forEach((assetId) => {
      if (!nextIds.has(assetId)) {
        delete previewMap[assetId]
      }
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  galleryStore.clearAssetPreviewCache()
})
</script>

<template>
  <div class="w-full h-full bg-[#f2f2f7] text-gray-900 flex flex-col">
    <div class="pt-12 px-4 pb-3 bg-white border-b border-gray-100">
      <div class="flex items-center justify-between">
        <button @click="goHome" class="text-blue-500 text-lg">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="font-semibold text-[15px]">{{ t('全局素材中心', 'Global Asset Center') }}</span>
        <span class="text-xs text-gray-400">{{ galleryStore.categoryCounts.all }}</span>
      </div>
      <p class="text-[11px] text-gray-500 mt-2">
        {{ t('一次导入，全局复用：聊天、角色绑定、壁纸与场景都可共享。', 'Import once and reuse globally across chat, role binding, wallpaper and scenarios.') }}
      </p>
    </div>

    <div class="px-4 py-3 space-y-3 bg-white border-b border-gray-100">
      <div class="grid grid-cols-5 gap-2">
        <button
          v-for="tab in categoryTabs"
          :key="tab.key"
          @click="activeCategory = tab.key"
          class="rounded-lg px-2 py-2 text-[11px] border transition"
          :class="
            activeCategory === tab.key
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
          "
        >
          <p class="font-medium">{{ tab.label }}</p>
          <p class="text-[10px] mt-0.5">{{ tab.count }}</p>
        </button>
      </div>

      <div class="rounded-xl border border-gray-200 p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-semibold">{{ t('本地导入', 'Local Import') }}</p>
          <select
            v-model="localImportCategory"
            class="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
          >
            <option
              v-for="categoryKey in GALLERY_ASSET_CATEGORIES"
              :key="categoryKey"
              :value="categoryKey"
            >
              {{ categoryLabel(categoryKey) }}
            </option>
          </select>
        </div>
        <button
          @click="openLocalImport"
          class="w-full py-2.5 rounded-lg border border-dashed border-blue-300 text-blue-600 text-sm hover:bg-blue-50 transition"
        >
          <i class="fas fa-upload mr-1"></i>
          {{ t('导入 png/jpg/webp/gif', 'Import png/jpg/webp/gif') }}
        </button>
        <input
          ref="localFileInput"
          type="file"
          class="hidden"
          accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
          multiple
          @change="handleLocalImport"
        />
      </div>

      <div class="rounded-xl border border-gray-200 p-3 space-y-2">
        <p class="text-xs font-semibold">{{ t('URL 导入', 'URL Import') }}</p>
        <input
          v-model="urlForm.url"
          type="url"
          class="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none"
          :placeholder="t('https://example.com/image.png', 'https://example.com/image.png')"
        />
        <div class="grid grid-cols-[1fr,110px] gap-2">
          <input
            v-model="urlForm.name"
            type="text"
            class="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none"
            :placeholder="t('可选名称', 'Optional name')"
          />
          <select
            v-model="urlForm.category"
            class="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white"
          >
            <option
              v-for="categoryKey in GALLERY_ASSET_CATEGORIES"
              :key="categoryKey"
              :value="categoryKey"
            >
              {{ categoryLabel(categoryKey) }}
            </option>
          </select>
        </div>
        <button
          @click="importFromUrl"
          class="w-full py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 transition"
        >
          {{ t('添加 URL 素材', 'Add URL Asset') }}
        </button>
      </div>

      <p
        v-if="feedback.text"
        class="text-xs"
        :class="
          feedback.type === 'success'
            ? 'text-emerald-600'
            : feedback.type === 'warn'
              ? 'text-amber-600'
              : 'text-red-600'
        "
      >
        {{ feedback.text }}
      </p>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="visibleAssets.length === 0" class="text-center text-gray-400 text-sm pt-14">
        <i class="fas fa-images text-2xl mb-3"></i>
        <p>{{ t('当前分类暂无素材', 'No assets in this category') }}</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-3 pb-8">
        <div
          v-for="asset in visibleAssets"
          :key="asset.id"
          class="rounded-xl bg-white border border-gray-200 overflow-hidden"
        >
          <div class="aspect-square bg-gray-100 relative">
            <img
              v-if="previewMap[asset.id]"
              :src="previewMap[asset.id]"
              :alt="asset.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              {{ t('预览加载中', 'Loading...') }}
            </div>
            <button
              @click="removeAsset(asset)"
              class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/45 text-white text-xs hover:bg-black/60 transition"
              :title="t('删除', 'Delete')"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>

          <div class="p-2.5 space-y-2">
            <p class="text-xs font-medium leading-tight line-clamp-2 min-h-[30px]">{{ asset.name }}</p>
            <p class="text-[10px] text-gray-400">
              {{ categoryLabel(asset.category) }} ·
              {{
                asset.sourceType === 'file'
                  ? t('本地文件', 'Local file')
                  : t('URL', 'URL')
              }}
            </p>
            <div class="grid grid-cols-[1fr,72px] gap-2">
              <select
                :value="asset.category"
                class="text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white"
                @change="moveAssetToCategory(asset.id, $event.target.value)"
              >
                <option
                  v-for="categoryKey in GALLERY_ASSET_CATEGORIES"
                  :key="categoryKey"
                  :value="categoryKey"
                >
                  {{ categoryLabel(categoryKey) }}
                </option>
              </select>
              <button
                @click="renameAsset(asset)"
                class="text-[11px] border border-gray-200 rounded px-2 py-1 text-gray-600 hover:bg-gray-50"
              >
                {{ t('改名', 'Rename') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
