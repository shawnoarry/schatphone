<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { formatBytesCompact } from '../lib/media-policy'
import { pushReturnTarget } from '../lib/navigation-return'
import { useFilesStore } from '../stores/files'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const filesStore = useFilesStore()
const { records: files, fileCount, favoriteCount } = storeToRefs(filesStore)

const query = ref('')
const activeTab = ref('recent')
const createName = ref('')
const fileInputRef = ref(null)
const importFeedback = ref('')
const importFeedbackType = ref('success')

const typeLabelMap = {
  markdown: 'MD',
  text: 'TXT',
  image: 'IMG',
  gif: 'GIF',
  video: 'VID',
  doc: 'DOC',
  file: 'FILE',
}

const visibleFiles = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return files.value.filter((item) => {
    if (activeTab.value === 'favorite' && !item.favorite) return false
    if (!keyword) return true
    return item.name.toLowerCase().includes(keyword)
  })
})

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const toggleFavorite = (id) => {
  filesStore.toggleFavorite(id)
}

const removeFile = (id) => {
  filesStore.removeFile(id)
}

const createQuickNote = () => {
  filesStore.createQuickNote(createName.value)
  createName.value = ''
  activeTab.value = 'recent'
}

const openFileImporter = () => {
  fileInputRef.value?.click()
}

const showImportFeedback = (type, message) => {
  importFeedbackType.value = type
  importFeedback.value = message
}

const handleFileImport = async (event) => {
  const target = event?.target
  const result = await filesStore.importLocalFiles(target?.files)
  if (target) target.value = ''

  if (result.importedCount > 0) {
    const skipped = result.skippedDuplicateCount + result.skippedTooLargeCount + result.skippedInvalidCount
    showImportFeedback(
      skipped > 0 ? 'warning' : 'success',
      skipped > 0
        ? t(
            `已索引 ${result.importedCount} 个文件，另有 ${skipped} 个被跳过。`,
            `Indexed ${result.importedCount} files and skipped ${skipped}.`,
          )
        : t(`已索引 ${result.importedCount} 个本地文件。`, `Indexed ${result.importedCount} local files.`),
    )
    activeTab.value = 'recent'
    return
  }

  if (result.reason === 'all_duplicate') {
    showImportFeedback('warning', t('这些文件已在索引中。', 'These files are already indexed.'))
    return
  }

  if (result.reason === 'all_too_large') {
    const limit = result.firstTooLarge?.maxBytes
      ? formatBytesCompact(result.firstTooLarge.maxBytes)
      : t('当前限制', 'the current limit')
    showImportFeedback(
      'warning',
      t(`媒体文件过大，单次索引上限为 ${limit}。`, `Media file is too large. Inline index limit is ${limit}.`),
    )
    return
  }

  showImportFeedback('warning', t('没有可索引的文件。', 'No files could be indexed.'))
}

const formatUpdatedAt = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return t('未知时间', 'Unknown time')
  const diffMs = Date.now() - value
  if (diffMs >= 0 && diffMs < 60 * 1000) return t('刚刚', 'Just now')
  if (diffMs >= 0 && diffMs < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)))
    return t(`${minutes} 分钟前`, `${minutes}m ago`)
  }
  if (diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.floor(diffMs / (60 * 60 * 1000)))
    return t(`${hours} 小时前`, `${hours}h ago`)
  }
  return new Date(value).toLocaleDateString()
}
</script>

<template>
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> 首页
      </button>
      <h1 class="font-bold">{{ t('文件', 'Files') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar bg-gray-50 p-4 space-y-4">
      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold mb-2">{{ t('快速检索', 'Quick Search') }}</p>
        <input
          v-model="query"
          type="text"
          class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
          :placeholder="t('搜索文件名', 'Search file name')"
        />
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('本地文件索引', 'Local File Index') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">
              {{
                t(
                  '记录文件名、类型、大小与收藏状态；不会读取、上传或复制原文件内容。',
                  'Records name, type, size, and favorite state; original file content is not read, uploaded, or copied.',
                )
              }}
            </p>
          </div>
          <button
            @click="openFileImporter"
            class="shrink-0 px-3 py-2 rounded-lg bg-blue-500 text-white text-xs hover:bg-blue-600"
          >
            {{ t('导入索引', 'Import index') }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            multiple
            class="hidden"
            @change="handleFileImport"
          />
        </div>
        <p
          v-if="importFeedback"
          class="rounded-lg border px-3 py-2 text-[11px]"
          :class="
            importFeedbackType === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          "
        >
          {{ importFeedback }}
        </p>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-semibold">{{ t('文件列表', 'File List') }}</p>
          <span class="text-[11px] text-gray-500">{{ t('共', 'Total') }} {{ fileCount }} {{ t('个', '') }}</span>
        </div>

        <div class="flex gap-2 mb-3">
          <button
            @click="activeTab = 'recent'"
            class="px-3 py-1.5 rounded-full text-xs border"
            :class="activeTab === 'recent' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'"
          >
            {{ t('最近', 'Recent') }}
          </button>
          <button
            @click="activeTab = 'favorite'"
            class="px-3 py-1.5 rounded-full text-xs border"
            :class="activeTab === 'favorite' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'"
          >
            {{ t('收藏', 'Favorites') }} {{ favoriteCount }}
          </button>
        </div>

        <div class="space-y-2" v-if="visibleFiles.length > 0">
          <div
            v-for="item in visibleFiles"
            :key="item.id"
            class="border border-gray-200 rounded-xl p-3 flex items-center gap-3"
          >
            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
              {{ typeLabelMap[item.kind] || 'FILE' }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{{ item.name }}</p>
              <p class="text-[11px] text-gray-500">
                {{ formatBytesCompact(item.sizeBytes) }} · {{ formatUpdatedAt(item.updatedAt) }}
              </p>
            </div>
            <button
              @click="toggleFavorite(item.id)"
              class="px-2 py-1 text-[11px] rounded border border-gray-200 hover:bg-gray-50"
            >
              {{ item.favorite ? t('取消收藏', 'Unfavorite') : t('收藏', 'Favorite') }}
            </button>
            <button
              @click="removeFile(item.id)"
              class="px-2 py-1 text-[11px] rounded border border-red-200 text-red-600 hover:bg-red-50"
            >
              {{ t('删除', 'Delete') }}
            </button>
          </div>
        </div>

        <p v-else class="text-xs text-gray-500">{{ t('当前筛选下没有文件。', 'No files under current filter.') }}</p>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold mb-2">{{ t('新建便签文件', 'Create quick note') }}</p>
        <div class="flex gap-2">
          <input
            v-model="createName"
            type="text"
            class="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('例如：灵感记录.txt', 'Example: inspiration-note.txt')"
          />
          <button @click="createQuickNote" class="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600">
            {{ t('新建', 'Create') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
