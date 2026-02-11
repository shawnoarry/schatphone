<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const query = ref('')
const activeTab = ref('recent')
const createName = ref('')

const files = ref([
  { id: 1, name: '角色设定.md', type: 'markdown', size: '12 KB', updatedAt: '今天 10:18', favorite: true },
  { id: 2, name: '世界观草案.txt', type: 'text', size: '8 KB', updatedAt: '今天 09:43', favorite: false },
  { id: 3, name: '界面参考.png', type: 'image', size: '256 KB', updatedAt: '昨天 22:12', favorite: true },
  { id: 4, name: '需求清单-v2.doc', type: 'doc', size: '76 KB', updatedAt: '昨天 18:07', favorite: false },
])

const typeLabelMap = {
  markdown: 'MD',
  text: 'TXT',
  image: 'IMG',
  doc: 'DOC',
}

const visibleFiles = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return files.value.filter((item) => {
    if (activeTab.value === 'favorite' && !item.favorite) return false
    if (!keyword) return true
    return item.name.toLowerCase().includes(keyword)
  })
})

const favoriteCount = computed(() => files.value.filter((item) => item.favorite).length)

const goHome = () => {
  router.push('/home')
}

const toggleFavorite = (id) => {
  const target = files.value.find((item) => item.id === id)
  if (!target) return
  target.favorite = !target.favorite
}

const removeFile = (id) => {
  files.value = files.value.filter((item) => item.id !== id)
}

const createQuickNote = () => {
  const name = createName.value.trim() || '新建便签.txt'
  const nextId = files.value.reduce((max, item) => Math.max(max, item.id), 0) + 1
  files.value.unshift({
    id: nextId,
    name,
    type: 'text',
    size: '1 KB',
    updatedAt: '刚刚',
    favorite: false,
  })
  createName.value = ''
  activeTab.value = 'recent'
}
</script>

<template>
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> 首页
      </button>
      <h1 class="font-bold">Files</h1>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar bg-gray-50 p-4 space-y-4">
      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold mb-2">快速检索</p>
        <input
          v-model="query"
          type="text"
          class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
          placeholder="搜索文件名"
        />
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-semibold">文件列表</p>
          <span class="text-[11px] text-gray-500">共 {{ files.length }} 个</span>
        </div>

        <div class="flex gap-2 mb-3">
          <button
            @click="activeTab = 'recent'"
            class="px-3 py-1.5 rounded-full text-xs border"
            :class="activeTab === 'recent' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'"
          >
            最近
          </button>
          <button
            @click="activeTab = 'favorite'"
            class="px-3 py-1.5 rounded-full text-xs border"
            :class="activeTab === 'favorite' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'"
          >
            收藏 {{ favoriteCount }}
          </button>
        </div>

        <div class="space-y-2" v-if="visibleFiles.length > 0">
          <div
            v-for="item in visibleFiles"
            :key="item.id"
            class="border border-gray-200 rounded-xl p-3 flex items-center gap-3"
          >
            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
              {{ typeLabelMap[item.type] || 'FILE' }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{{ item.name }}</p>
              <p class="text-[11px] text-gray-500">{{ item.size }} · {{ item.updatedAt }}</p>
            </div>
            <button
              @click="toggleFavorite(item.id)"
              class="px-2 py-1 text-[11px] rounded border border-gray-200 hover:bg-gray-50"
            >
              {{ item.favorite ? '取消收藏' : '收藏' }}
            </button>
            <button
              @click="removeFile(item.id)"
              class="px-2 py-1 text-[11px] rounded border border-red-200 text-red-600 hover:bg-red-50"
            >
              删除
            </button>
          </div>
        </div>

        <p v-else class="text-xs text-gray-500">当前筛选下没有文件。</p>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold mb-2">新建便签文件</p>
        <div class="flex gap-2">
          <input
            v-model="createName"
            type="text"
            class="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
            placeholder="例如：灵感记录.txt"
          />
          <button @click="createQuickNote" class="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600">
            新建
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
