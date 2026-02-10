<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'

const HOME_TILE_OPTIONS = [
  { id: 'weather', label: '天气组件', kind: 'widget' },
  { id: 'calendar', label: '日历组件', kind: 'widget' },
  { id: 'music', label: '音乐组件', kind: 'widget' },
  { id: 'system', label: '系统组件', kind: 'widget' },
  { id: 'quick_heart', label: '快捷心形', kind: 'widget' },
  { id: 'quick_disc', label: '快捷唱片', kind: 'widget' },
  { id: 'app_network', label: 'Network', kind: 'app' },
  { id: 'app_chat', label: 'Chat', kind: 'app' },
  { id: 'app_wallet', label: 'Wallet', kind: 'app' },
  { id: 'app_themes', label: 'Themes', kind: 'app' },
  { id: 'app_phone', label: 'Phone', kind: 'app' },
  { id: 'app_map', label: 'Map', kind: 'app' },
  { id: 'app_calendar', label: 'Calendar', kind: 'app' },
  { id: 'app_files', label: 'Files', kind: 'app' },
  { id: 'app_stock', label: 'Stock', kind: 'app' },
  { id: 'app_contacts', label: 'Contacts', kind: 'app' },
  { id: 'app_settings', label: 'Settings', kind: 'app' },
  { id: 'app_gallery', label: 'Photos', kind: 'app' },
  { id: 'app_more', label: 'More', kind: 'app' },
]

const router = useRouter()
const systemStore = useSystemStore()

const { settings, availableThemes } = storeToRefs(systemStore)
const saved = ref(false)
let savedTimerId = null

const homeWidgetPages = computed(() => settings.value.appearance.homeWidgetPages || [])

const tilePositionMap = computed(() => {
  const map = new Map()
  homeWidgetPages.value.forEach((page, pageIndex) => {
    page.forEach((tileId, tileIndex) => {
      map.set(tileId, { pageIndex, tileIndex })
    })
  })
  return map
})

const visibleTiles = computed(() => {
  return HOME_TILE_OPTIONS.filter((tile) => tilePositionMap.value.has(tile.id)).sort((a, b) => {
    const posA = tilePositionMap.value.get(a.id)
    const posB = tilePositionMap.value.get(b.id)
    if (!posA || !posB) return 0
    if (posA.pageIndex !== posB.pageIndex) return posA.pageIndex - posB.pageIndex
    return posA.tileIndex - posB.tileIndex
  })
})

const hiddenTiles = computed(() => {
  return HOME_TILE_OPTIONS.filter((tile) => !tilePositionMap.value.has(tile.id))
})

const triggerSaved = () => {
  systemStore.saveNow()
  saved.value = true
  if (savedTimerId) clearTimeout(savedTimerId)
  savedTimerId = setTimeout(() => {
    saved.value = false
  }, 1200)
}

const goHome = () => {
  router.push('/home')
}

const goSettings = () => {
  router.push('/settings')
}

const setTheme = (themeId) => {
  systemStore.setTheme(themeId)
}

const clearCustomCss = () => {
  settings.value.appearance.customCss = ''
}

const saveAppearance = () => {
  triggerSaved()
}

const saveHomeLayout = () => {
  triggerSaved()
}

const withRemovedTile = (tileId) => {
  return homeWidgetPages.value.map((page) => page.filter((id) => id !== tileId))
}

const assignTileToPage = (tileId, pageIndex) => {
  const nextPages = withRemovedTile(tileId).map((page) => [...page])
  while (nextPages.length <= pageIndex) {
    nextPages.push([])
  }
  nextPages[pageIndex].push(tileId)
  systemStore.setHomeWidgetPages(nextPages)
}

const hideTile = (tileId) => {
  const nextPages = withRemovedTile(tileId)
  systemStore.setHomeWidgetPages(nextPages)
}

const moveTileInPage = (tileId, direction) => {
  const position = tilePositionMap.value.get(tileId)
  if (!position) return

  const page = [...homeWidgetPages.value[position.pageIndex]]
  const nextIndex = position.tileIndex + direction
  if (nextIndex < 0 || nextIndex >= page.length) return

  const temp = page[position.tileIndex]
  page[position.tileIndex] = page[nextIndex]
  page[nextIndex] = temp

  const nextPages = homeWidgetPages.value.map((items, index) =>
    index === position.pageIndex ? page : [...items],
  )
  systemStore.setHomeWidgetPages(nextPages)
}

const resetHomeLayout = () => {
  const ok = window.confirm('确认恢复 Home 默认布局吗？')
  if (!ok) return
  systemStore.resetHomeWidgetPages()
}

const tilePageLabel = (tileId) => {
  const position = tilePositionMap.value.get(tileId)
  if (!position) return '已隐藏'
  return `第${position.pageIndex + 1}屏`
}

onBeforeUnmount(() => {
  if (savedTimerId) clearTimeout(savedTimerId)
})
</script>

<template>
  <div class="w-full h-full bg-gray-100 flex flex-col text-black">
    <div class="pt-12 pb-3 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goSettings" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> 设置
      </button>
      <h1 class="text-2xl font-bold flex-1">外观工坊</h1>
      <button @click="goHome" class="text-blue-500 text-sm">主页</button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="text-sm font-bold mb-3">主题（保留 Y2K / 纯白）</div>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="theme in availableThemes"
            :key="theme.id"
            @click="setTheme(theme.id)"
            class="h-24 rounded-lg border-2 flex items-center justify-center cursor-pointer"
            :class="settings.appearance.currentTheme === theme.id ? 'border-blue-500' : 'border-transparent'"
            :style="{ background: theme.preview }"
          >
            <span class="text-xs font-bold" :class="theme.darkText ? 'text-black' : 'text-white'">
              {{ theme.name }}
            </span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <label class="text-xs text-gray-500 block mb-1">壁纸 URL</label>
        <input
          v-model="settings.appearance.wallpaper"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          placeholder="https://..."
        />
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs text-gray-500 block">自定义 CSS（高级）</label>
          <button class="text-[11px] text-blue-500" @click="clearCustomCss">清空</button>
        </div>
        <textarea
          v-model="settings.appearance.customCss"
          class="w-full h-36 border border-gray-200 rounded-md p-2 text-xs font-mono outline-none resize-none"
          placeholder=".app-shell { --home-widget-bg: rgba(255,255,255,0.5); }"
        ></textarea>
        <p class="text-[10px] text-gray-400 mt-2">
          建议优先覆盖 CSS 变量：<code>--home-widget-bg</code>、<code>--home-dock-bg</code>、<code>--home-icon-default-bg</code>
        </p>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="text-sm font-bold">Home 布局管理</p>
            <p class="text-[11px] text-gray-500">支持显示/隐藏、屏幕切换、同屏排序</p>
          </div>
          <button
            @click="resetHomeLayout"
            class="px-3 py-1.5 rounded-md text-xs bg-gray-800 text-white hover:bg-black transition"
          >
            重置默认
          </button>
        </div>

        <div class="space-y-2">
          <div
            v-for="tile in visibleTiles"
            :key="tile.id"
            class="rounded-lg border border-gray-200 p-2.5"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-full"
                  :class="tile.kind === 'app' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'"
                >
                  {{ tile.kind }}
                </span>
                <span class="text-sm font-medium">{{ tile.label }}</span>
              </div>
              <span class="text-[11px] text-gray-500">{{ tilePageLabel(tile.id) }}</span>
            </div>

            <div class="flex flex-wrap gap-1.5">
              <button
                @click="assignTileToPage(tile.id, 0)"
                class="px-2 py-1 text-[11px] rounded border border-gray-200 hover:bg-gray-50"
              >
                第1屏
              </button>
              <button
                @click="assignTileToPage(tile.id, 1)"
                class="px-2 py-1 text-[11px] rounded border border-gray-200 hover:bg-gray-50"
              >
                第2屏
              </button>
              <button
                @click="moveTileInPage(tile.id, -1)"
                class="px-2 py-1 text-[11px] rounded border border-gray-200 hover:bg-gray-50"
              >
                上移
              </button>
              <button
                @click="moveTileInPage(tile.id, 1)"
                class="px-2 py-1 text-[11px] rounded border border-gray-200 hover:bg-gray-50"
              >
                下移
              </button>
              <button
                @click="hideTile(tile.id)"
                class="px-2 py-1 text-[11px] rounded border border-red-200 text-red-600 hover:bg-red-50"
              >
                隐藏
              </button>
            </div>
          </div>
        </div>

        <div v-if="hiddenTiles.length > 0" class="mt-4 pt-4 border-t border-gray-100">
          <p class="text-xs font-semibold text-gray-600 mb-2">已隐藏入口</p>
          <div class="space-y-2">
            <div
              v-for="tile in hiddenTiles"
              :key="tile.id"
              class="rounded-lg border border-gray-200 p-2.5 flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-2">
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-full"
                  :class="tile.kind === 'app' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'"
                >
                  {{ tile.kind }}
                </span>
                <span class="text-sm font-medium">{{ tile.label }}</span>
              </div>
              <div class="flex gap-1.5">
                <button
                  @click="assignTileToPage(tile.id, 0)"
                  class="px-2 py-1 text-[11px] rounded border border-gray-200 hover:bg-gray-50"
                >
                  加到第1屏
                </button>
                <button
                  @click="assignTileToPage(tile.id, 1)"
                  class="px-2 py-1 text-[11px] rounded border border-gray-200 hover:bg-gray-50"
                >
                  加到第2屏
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          @click="saveHomeLayout"
          class="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold transition"
          :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
        >
          {{ saved ? '已保存' : '保存 Home 布局' }}
        </button>
      </div>

      <button
        @click="saveAppearance"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? '已保存' : '保存外观设置' }}
      </button>
    </div>
  </div>
</template>
