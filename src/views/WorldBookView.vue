<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useI18n } from '../composables/useI18n'
import { useDialog } from '../composables/useDialog'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import {
  normalizeWorldBookPointIds,
  normalizeWorldBookSource,
  normalizeWorldBookTagFilter,
  normalizeWorldBookUsageFilter,
} from '../lib/worldbook-navigation'
import { pushReturnTarget, resolveReturnLabel } from '../lib/navigation-return'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()
const { user } = storeToRefs(systemStore)
const { roleProfiles, contacts } = storeToRefs(chatStore)

const globalWorldview = computed({
  get: () =>
    typeof user.value.globalWorldview === 'string'
      ? user.value.globalWorldview
      : user.value.worldBook || '',
  set: (value) => {
    systemStore.setGlobalWorldview(value)
  },
})

const worldBookCount = computed(() => (globalWorldview.value || '').length)
const knowledgePoints = computed(() => systemStore.listKnowledgePoints())
const knowledgeSearchKeyword = ref('')
const knowledgeTagFilter = ref('all')
const knowledgeUsageFilter = ref('all')
const knowledgeUsageSort = ref('recent')
const knowledgeDeepLinkPointIds = ref([])
const knowledgeDeepLinkSource = ref('')
const knowledgeDeepLinkKeyword = ref('')
const knowledgeDeepLinkTag = ref('all')
const knowledgeDeepLinkUsage = ref('all')
const roleProfileChatBindingMap = computed(() => {
  const map = new Map()
  contacts.value.forEach((contact) => {
    if (!contact || (contact.kind || 'role') !== 'role') return
    const profileId = Number(contact.profileId)
    if (!Number.isFinite(profileId) || profileId <= 0) return
    map.set(profileId, (map.get(profileId) || 0) + 1)
  })
  return map
})
const saved = ref(false)
const uiNotice = ref('')
const knowledgeDraft = reactive({
  title: '',
  content: '',
  tags: '',
})
const editingKnowledgePointId = ref('')
let savedTimerId = null
const returnLabelKey = computed(() => resolveReturnLabel(route, 'Settings'))
const returnButtonLabel = computed(() =>
  returnLabelKey.value === 'Home'
    ? t('主页', 'Home')
    : returnLabelKey.value === 'Chat'
      ? t('聊天', 'Chat')
      : returnLabelKey.value === 'Map'
        ? t('地图', 'Map')
        : returnLabelKey.value === 'Calendar'
          ? t('日历', 'Calendar')
          : t('设置', 'Settings'),
)

const goSettings = () => {
  pushReturnTarget(router, route, '/settings')
}

const pulseSaved = (message = '') => {
  if (message) uiNotice.value = message
  saved.value = true
  if (savedTimerId) clearTimeout(savedTimerId)
  savedTimerId = setTimeout(() => {
    saved.value = false
    uiNotice.value = ''
  }, 1400)
}

const saveWorldBook = () => {
  systemStore.saveNow()
  pulseSaved(t('世界观已保存。', 'Worldview saved.'))
}

const parseTagDraft = (raw) =>
  raw
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)

const parseKnowledgePointTags = (raw) => {
  const normalized = typeof raw === 'string' ? raw.replace(/[，；]/g, ',').replace(/;/g, ',') : ''
  const parsed = parseTagDraft(normalized)
  if (
    parsed.length === 1 &&
    parsed[0] &&
    typeof parsed[0] === 'string' &&
    /,/.test(parsed[0])
  ) {
    return parsed[0]
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return parsed
}

const createKnowledgePoint = () => {
  const title = knowledgeDraft.title.trim()
  const content = knowledgeDraft.content.trim()
  if (!title && !content) {
    uiNotice.value = t('请先输入标题或内容。', 'Please enter title or content first.')
    return
  }
  const created = systemStore.upsertKnowledgePoint({
    title,
    content,
    tags: parseKnowledgePointTags(knowledgeDraft.tags),
    enabled: true,
  })
  if (!created) {
    uiNotice.value = t('知识点保存失败（可能已达上限）。', 'Knowledge point save failed (limit reached).')
    return
  }
  resetKnowledgeDraft()
  systemStore.saveNow()
  pulseSaved(t('知识点已添加。', 'Knowledge point added.'))
}

const resetKnowledgeDraft = () => {
  knowledgeDraft.title = ''
  knowledgeDraft.content = ''
  knowledgeDraft.tags = ''
  editingKnowledgePointId.value = ''
}

const formatKnowledgePointTags = (point) =>
  Array.isArray(point?.tags) ? point.tags.join(', ') : ''

const editingKnowledgePoint = computed(() =>
  editingKnowledgePointId.value ? systemStore.getKnowledgePointById(editingKnowledgePointId.value) : null,
)

const isEditingKnowledgePoint = computed(() => Boolean(editingKnowledgePoint.value?.id))

const openEditKnowledgePoint = (point) => {
  if (!point?.id) return
  editingKnowledgePointId.value = point.id
  knowledgeDraft.title = point.title || ''
  knowledgeDraft.content = point.content || ''
  knowledgeDraft.tags = formatKnowledgePointTags(point)
  saved.value = false
  uiNotice.value = ''
}

const cancelKnowledgePointEdit = () => {
  resetKnowledgeDraft()
  uiNotice.value = ''
  saved.value = false
}

const submitKnowledgePoint = () => {
  if (!editingKnowledgePointId.value) {
    createKnowledgePoint()
    return
  }

  const title = knowledgeDraft.title.trim()
  const content = knowledgeDraft.content.trim()
  if (!title && !content) {
    uiNotice.value = t('璇峰厛杈撳叆鏍囬鎴栧唴瀹广€?', 'Please enter title or content first.')
    return
  }

  if (!editingKnowledgePoint.value?.id) {
    resetKnowledgeDraft()
    uiNotice.value = t('要编辑的知识点已不存在。', 'The knowledge point you were editing no longer exists.')
    return
  }

  const savedPoint = systemStore.upsertKnowledgePoint({
    id: editingKnowledgePoint.value.id,
    title,
    content,
    tags: parseKnowledgePointTags(knowledgeDraft.tags),
    enabled: editingKnowledgePoint.value.enabled !== false,
  })
  if (!savedPoint) {
    uiNotice.value = t('知识点保存失败（可能已达上限）。', 'Knowledge point save failed (limit reached).')
    return
  }

  resetKnowledgeDraft()
  systemStore.saveNow()
  pulseSaved(t('知识点已更新。', 'Knowledge point updated.'))
}

const toggleKnowledgePoint = (point) => {
  if (!point?.id) return
  systemStore.setKnowledgePointEnabled(point.id, !point.enabled)
  systemStore.saveNow()
}

const getKnowledgePointUsage = (point) => {
  const pointId = typeof point?.id === 'string' ? point.id.trim() : ''
  if (!pointId) {
    return {
      profiles: [],
      chatBindingCount: 0,
      chatProfileCount: 0,
    }
  }

  const profiles = roleProfiles.value.filter((profile) =>
    Array.isArray(profile?.knowledgePointIds) && profile.knowledgePointIds.includes(pointId),
  )
  const chatProfiles = profiles.filter((profile) =>
    (roleProfileChatBindingMap.value.get(Number(profile.id)) || 0) > 0,
  )
  const chatBindingCount = chatProfiles.reduce(
    (sum, profile) => sum + (roleProfileChatBindingMap.value.get(Number(profile.id)) || 0),
    0,
  )

  return {
    profiles,
    chatBindingCount,
    chatProfileCount: chatProfiles.length,
  }
}

const getKnowledgePointUsageBadge = (point) => {
  const state = getKnowledgePointUsageState(point)
  if (state === 'unused') {
    return {
      label: t('未使用', 'Unused'),
      tone: 'neutral',
      icon: 'fas fa-circle',
    }
  }
  if (state === 'disabled') {
    return {
      label: t('已停用', 'Disabled'),
      tone: 'amber',
      icon: 'fas fa-pause',
    }
  }
  if (state === 'profile_only') {
    return {
      label: t('仅角色档案', 'Profile only'),
      tone: 'amber',
      icon: 'fas fa-user-tag',
    }
  }
  return {
    label: t('进入 Chat', 'In Chat'),
    tone: 'emerald',
    icon: 'fas fa-comments',
  }
}

const getKnowledgePointUsageState = (point) => {
  const usage = getKnowledgePointUsage(point)
  if (point?.enabled === false) return 'disabled'
  if (usage.profiles.length <= 0) return 'unused'
  if (usage.chatBindingCount <= 0) return 'profile_only'
  return 'chat_ready'
}

const knowledgeUsageFilterOptions = computed(() => {
  const counts = scopedKnowledgePoints.value.reduce(
    (acc, point) => {
      const state = getKnowledgePointUsageState(point)
      acc.all += 1
      acc[state] = (acc[state] || 0) + 1
      return acc
    },
    {
      all: 0,
      unused: 0,
      profile_only: 0,
      chat_ready: 0,
      disabled: 0,
    },
  )

  return [
    { value: 'all', label: t('全部', 'All'), count: counts.all },
    { value: 'chat_ready', label: t('已进入 Chat', 'In Chat'), count: counts.chat_ready },
    { value: 'profile_only', label: t('仅角色档案', 'Profile only'), count: counts.profile_only },
    { value: 'unused', label: t('未使用', 'Unused'), count: counts.unused },
    { value: 'disabled', label: t('已停用', 'Disabled'), count: counts.disabled },
  ]
})

const normalizedKnowledgeSearchKeyword = computed(() => knowledgeSearchKeyword.value.trim())

const searchedKnowledgePoints = computed(() =>
  systemStore.listKnowledgePoints({
    keyword: normalizedKnowledgeSearchKeyword.value,
  }),
)

const scopedKnowledgePoints = computed(() => {
  if (knowledgeDeepLinkPointIds.value.length <= 0) return searchedKnowledgePoints.value
  const pointIdSet = new Set(knowledgeDeepLinkPointIds.value)
  return searchedKnowledgePoints.value.filter((point) => pointIdSet.has(point.id))
})

const knowledgeSearchPlaceholder = computed(() =>
  t('搜索标题、内容或标签', 'Search title, content, or tags'),
)

const knowledgeTagFilterOptions = computed(() => {
  const counts = new Map()
  const usageFilteredPoints = scopedKnowledgePoints.value.filter(
    (point) =>
      knowledgeUsageFilter.value === 'all' || getKnowledgePointUsageState(point) === knowledgeUsageFilter.value,
  )

  usageFilteredPoints.forEach((point) => {
    if (!Array.isArray(point?.tags)) return
    point.tags.forEach((tag) => {
      if (typeof tag !== 'string' || !tag.trim()) return
      counts.set(tag, (counts.get(tag) || 0) + 1)
    })
  })

  const options = [
    {
      value: 'all',
      label: t('全部标签', 'All tags'),
      count: usageFilteredPoints.length,
    },
    ...[...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
      .map(([tag, count]) => ({
        value: tag,
        label: `#${tag}`,
        count,
      })),
  ]

  if (
    knowledgeTagFilter.value !== 'all' &&
    !options.some((option) => option.value === knowledgeTagFilter.value)
  ) {
    options.push({
      value: knowledgeTagFilter.value,
      label: `#${knowledgeTagFilter.value}`,
      count: 0,
    })
  }

  return options
})

const knowledgeUsageSortOptions = computed(() => [
  { value: 'recent', label: t('最近更新', 'Recent') },
  { value: 'state', label: t('使用状态', 'Usage state') },
  { value: 'role_count', label: t('绑定角色数', 'Bound roles') },
  { value: 'title', label: t('标题', 'Title') },
])

const knowledgePointUpdatedAt = (point) => {
  const updatedAt = Number(point?.updatedAt)
  if (Number.isFinite(updatedAt) && updatedAt > 0) return updatedAt
  const createdAt = Number(point?.createdAt)
  return Number.isFinite(createdAt) && createdAt > 0 ? createdAt : 0
}

const compareKnowledgePointTitle = (a, b) => {
  const titleA = typeof a?.title === 'string' ? a.title.trim() : ''
  const titleB = typeof b?.title === 'string' ? b.title.trim() : ''
  return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' })
}

const visibleKnowledgePoints = computed(() => {
  const filter = knowledgeUsageFilter.value
  const sort = knowledgeUsageSort.value
  const tagFilter = knowledgeTagFilter.value
  const usageStateOrder = {
    unused: 0,
    profile_only: 1,
    disabled: 2,
    chat_ready: 3,
  }

  return scopedKnowledgePoints.value
    .filter((point) => filter === 'all' || getKnowledgePointUsageState(point) === filter)
    .filter(
      (point) =>
        tagFilter === 'all' ||
        (Array.isArray(point?.tags) && point.tags.some((tag) => tag === tagFilter)),
    )
    .slice()
    .sort((a, b) => {
      if (sort === 'title') return compareKnowledgePointTitle(a, b)
      if (sort === 'role_count') {
        const usageA = getKnowledgePointUsage(a)
        const usageB = getKnowledgePointUsage(b)
        return usageB.profiles.length - usageA.profiles.length || compareKnowledgePointTitle(a, b)
      }
      if (sort === 'state') {
        return (
          usageStateOrder[getKnowledgePointUsageState(a)] -
            usageStateOrder[getKnowledgePointUsageState(b)] ||
          compareKnowledgePointTitle(a, b)
        )
      }
      return knowledgePointUpdatedAt(b) - knowledgePointUpdatedAt(a) || compareKnowledgePointTitle(a, b)
    })
})

const knowledgeDeepLinkPoints = computed(() =>
  knowledgeDeepLinkPointIds.value
    .map((pointId) => systemStore.getKnowledgePointById(pointId))
    .filter(Boolean),
)

const knowledgeDeepLinkActive = computed(
  () =>
    knowledgeDeepLinkPointIds.value.length > 0 ||
    Boolean(knowledgeDeepLinkSource.value) ||
    Boolean(knowledgeDeepLinkKeyword.value) ||
    knowledgeDeepLinkTag.value !== 'all' ||
    knowledgeDeepLinkUsage.value !== 'all',
)

const knowledgeDeepLinkSourceLabel = computed(() => {
  if (knowledgeDeepLinkSource.value === 'calendar') return t('Calendar', 'Calendar')
  if (knowledgeDeepLinkSource.value === 'map') return t('Map', 'Map')
  if (knowledgeDeepLinkSource.value === 'chat') return t('Chat', 'Chat')
  return t('模块上下文', 'Module context')
})

const knowledgeDeepLinkSummary = computed(() => {
  if (knowledgeDeepLinkPointIds.value.length > 0) {
    return t(
      `${knowledgeDeepLinkSourceLabel.value} 带来了 ${knowledgeDeepLinkPointIds.value.length} 条相关知识点筛选。`,
      `${knowledgeDeepLinkSourceLabel.value} scoped ${knowledgeDeepLinkPointIds.value.length} related knowledge points.`,
    )
  }
  if (knowledgeDeepLinkKeyword.value) {
    return t(
      `${knowledgeDeepLinkSourceLabel.value} 预填了关键字：${knowledgeDeepLinkKeyword.value}`,
      `${knowledgeDeepLinkSourceLabel.value} prefilled keyword: ${knowledgeDeepLinkKeyword.value}`,
    )
  }
  if (knowledgeDeepLinkTag.value !== 'all' || knowledgeDeepLinkUsage.value !== 'all') {
    return t(
      `${knowledgeDeepLinkSourceLabel.value} 带来了筛选条件，可直接继续查看相关知识点。`,
      `${knowledgeDeepLinkSourceLabel.value} applied direct filters for related knowledge points.`,
    )
  }
  return t(
    `${knowledgeDeepLinkSourceLabel.value} 已把你带到当前相关的 WorldBook 范围。`,
    `${knowledgeDeepLinkSourceLabel.value} brought you into the relevant WorldBook scope.`,
  )
})

const isDeepLinkedKnowledgePoint = (point) =>
  Boolean(point?.id) && knowledgeDeepLinkPointIds.value.includes(point.id)

const syncWorldBookDeepLink = () => {
  knowledgeDeepLinkSource.value = normalizeWorldBookSource(route.query.source)
  knowledgeDeepLinkKeyword.value =
    typeof route.query.keyword === 'string' ? route.query.keyword.trim() : ''
  knowledgeDeepLinkTag.value = normalizeWorldBookTagFilter(route.query.tag)
  knowledgeDeepLinkUsage.value = normalizeWorldBookUsageFilter(route.query.usage)

  const pointIds = normalizeWorldBookPointIds(route.query.points || route.query.point)
  const existingPointIds = new Set(knowledgePoints.value.map((point) => point.id))
  knowledgeDeepLinkPointIds.value = pointIds.filter((pointId) => existingPointIds.has(pointId))

  const singlePoint =
    knowledgeDeepLinkPointIds.value.length === 1
      ? systemStore.getKnowledgePointById(knowledgeDeepLinkPointIds.value[0])
      : null

  knowledgeSearchKeyword.value = knowledgeDeepLinkKeyword.value || singlePoint?.title || ''
  knowledgeTagFilter.value = knowledgeDeepLinkTag.value
  knowledgeUsageFilter.value = knowledgeDeepLinkUsage.value
}

const clearKnowledgeDeepLink = () => {
  router.replace('/worldbook')
}

const describeKnowledgePointUsage = (point) => {
  const usage = getKnowledgePointUsage(point)
  if (usage.profiles.length <= 0) {
    return t('还没有角色绑定这个知识点。', 'No role profile is bound to this point yet.')
  }

  const profileCount = usage.profiles.length
  if (point?.enabled === false) {
    return t(
      `已被 ${profileCount} 个角色绑定，但当前停用，不会注入 Chat。`,
      `${profileCount} role profiles are bound, but this point is disabled and will not be injected into Chat.`,
    )
  }
  if (usage.chatBindingCount <= 0) {
    return t(
      `已被 ${profileCount} 个角色绑定；这些角色尚未绑定到 Chat 会话，因此暂未进入 Chat 提示词链路。`,
      `${profileCount} role profiles are bound; none are bound to Chat contacts yet, so this point is not in the Chat prompt chain.`,
    )
  }
  return t(
    `已被 ${profileCount} 个角色绑定，其中 ${usage.chatProfileCount} 个角色已连接 ${usage.chatBindingCount} 个 Chat 会话；启用时会进入这些会话的提示词链路。`,
    `${profileCount} role profiles are bound; ${usage.chatProfileCount} profiles connect to ${usage.chatBindingCount} Chat contacts, so this enabled point enters those Chat prompt chains.`,
  )
}

const formatKnowledgePointProfileNames = (point) => {
  const usage = getKnowledgePointUsage(point)
  if (usage.profiles.length <= 0) return ''
  const names = usage.profiles
    .map((profile) => (typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : t('未命名角色', 'Unnamed role')))
    .slice(0, 4)
  const overflow = Math.max(0, usage.profiles.length - names.length)
  return overflow > 0 ? `${names.join(' / ')} +${overflow}` : names.join(' / ')
}

const removeKnowledgePoint = async (point) => {
  if (!point?.id) return
  const ok = await confirmDialog({
    title: t('删除知识点', 'Delete knowledge point'),
    message: `${t('确认删除知识点', 'Delete knowledge point')}「${point.title || ''}」？`,
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return
  systemStore.removeKnowledgePoint(point.id)
  if (editingKnowledgePointId.value === point.id) {
    resetKnowledgeDraft()
  }
  systemStore.saveNow()
  pulseSaved(t('知识点已删除。', 'Knowledge point deleted.'))
}

watch(
  () => route.fullPath,
  () => {
    syncWorldBookDeepLink()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (savedTimerId) clearTimeout(savedTimerId)
})
</script>

<template>
  <div class="worldbook-shell w-full h-full bg-[#f2f2f7] text-black flex flex-col">
    <div class="worldbook-header pt-12 pb-3 px-4 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center gap-3">
      <button @click="goSettings" class="worldbook-nav-button text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ returnButtonLabel }}
      </button>
      <h1 class="font-bold text-xl">{{ t('世界书', 'World Book') }}</h1>
    </div>

    <div class="worldbook-scroll flex-1 px-4 py-4 overflow-y-auto no-scrollbar space-y-4">
      <div class="rounded-2xl bg-white border border-gray-200 p-4">
        <p class="text-sm font-semibold">{{ t('全局世界观（必选）', 'Global worldview (required)') }}</p>
        <p class="text-xs text-gray-500 mt-1">
          {{
            t(
              '全局世界观会作为所有聊天和模块生成的基础背景。',
              'Global worldview is used as the base context for all chats and modules.',
            )
          }}
        </p>
        <textarea
          v-model="globalWorldview"
          class="w-full h-48 mt-3 border border-gray-200 rounded-lg p-3 text-sm outline-none resize-none"
          :placeholder="
            t(
              '例如：世界规则、时代背景、组织结构、角色关系约束...',
              'Example: world rules, era background, organization structure, and role constraints...',
            )
          "
        ></textarea>
        <p class="text-[11px] text-gray-400 mt-2">
          {{ t('当前字数：', 'Current count: ') }}{{ worldBookCount }}
        </p>
        <button
          @click="saveWorldBook"
          class="mt-3 w-full py-2.5 rounded-lg text-sm font-semibold transition"
          :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
        >
          {{ saved ? t('已保存', 'Saved') : t('保存世界观', 'Save worldview') }}
        </button>
      </div>

      <div class="rounded-2xl bg-white border border-gray-200 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold">{{ t('知识点（可绑定角色）', 'Knowledge points (bindable)') }}</p>
          <span class="text-[11px] text-gray-400">
            {{ t('总数', 'Count') }} {{ knowledgePoints.length }}
          </span>
        </div>
        <p class="text-xs text-gray-500">
          {{
            t(
              '知识点用于角色级补丁（如语言规范、额外设定、模型偏好），可在通讯录绑定到指定角色。',
              'Knowledge points are role-level patches (language rules, extra lore, model hints) and can be bound in Contacts.',
            )
          }}
        </p>

        <div class="space-y-2 rounded-xl border border-gray-200 p-3">
          <div v-if="isEditingKnowledgePoint" class="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            <span data-testid="knowledge-editing-state">
              {{ t('正在编辑已有知识点', 'Editing existing knowledge point') }}
            </span>
            <button
              type="button"
              data-testid="knowledge-edit-cancel"
              class="font-semibold text-amber-700"
              @click="cancelKnowledgePointEdit"
            >
              {{ t('取消编辑', 'Cancel edit') }}
            </button>
          </div>
          <input
            v-model="knowledgeDraft.title"
            data-testid="knowledge-draft-title"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('知识点标题（如：角色A语言规范）', 'Point title (e.g. Role A language rule)')"
          />
          <textarea
            v-model="knowledgeDraft.content"
            data-testid="knowledge-draft-content"
            class="w-full h-20 border rounded-lg px-3 py-2 text-sm outline-none resize-none"
            :placeholder="t('知识点内容', 'Knowledge point content')"
          ></textarea>
          <input
            v-model="knowledgeDraft.tags"
            data-testid="knowledge-draft-tags"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('标签（逗号分隔）', 'Tags (comma separated)')"
          />
          <button
            v-if="isEditingKnowledgePoint"
            @click="submitKnowledgePoint"
            data-testid="knowledge-draft-submit"
            class="w-full py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold"
          >
            {{ t('保存修改', 'Save changes') }}
          </button>
          <button
            v-else
            @click="submitKnowledgePoint"
            data-testid="knowledge-draft-submit"
            class="w-full py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold"
          >
            {{ t('新增知识点', 'Add knowledge point') }}
          </button>
        </div>

        <div v-if="knowledgePoints.length > 0" class="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div
            v-if="knowledgeDeepLinkActive"
            data-testid="knowledge-deeplink-banner"
            class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-800 space-y-2"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-medium">
                  {{ t('来自模块上下文的筛选', 'Scoped from module context') }}
                </p>
                <p class="mt-1 text-blue-700">
                  {{ knowledgeDeepLinkSummary }}
                </p>
              </div>
              <button
                type="button"
                data-testid="knowledge-deeplink-clear"
                class="shrink-0 text-[11px] text-blue-600"
                @click="clearKnowledgeDeepLink"
              >
                {{ t('清除', 'Clear') }}
              </button>
            </div>
            <div v-if="knowledgeDeepLinkPoints.length > 0" class="flex flex-wrap gap-1.5">
              <span
                v-for="point in knowledgeDeepLinkPoints"
                :key="point.id"
                :data-testid="`knowledge-deeplink-point-${point.id}`"
                class="rounded-full border border-blue-200 bg-white px-2 py-1 text-[11px] text-blue-700"
              >
                {{ point.title }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <i class="fas fa-search text-[11px] text-gray-400"></i>
            <input
              v-model="knowledgeSearchKeyword"
              data-testid="knowledge-search-input"
              class="min-w-0 flex-1 bg-transparent text-xs outline-none"
              :placeholder="knowledgeSearchPlaceholder"
            />
            <button
              v-if="knowledgeSearchKeyword"
              type="button"
              data-testid="knowledge-search-clear"
              class="text-[11px] text-gray-400"
              @click="knowledgeSearchKeyword = ''"
            >
              {{ t('清空', 'Clear') }}
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="option in knowledgeUsageFilterOptions"
              :key="`knowledge-filter-${option.value}`"
              type="button"
              class="rounded-full border px-2 py-1 text-[11px] transition"
              :class="
                knowledgeUsageFilter === option.value
                  ? 'border-blue-300 bg-blue-50 text-blue-600'
                  : 'border-gray-200 bg-white text-gray-500'
              "
              @click="knowledgeUsageFilter = option.value"
            >
              {{ option.label }} · {{ option.count }}
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="option in knowledgeTagFilterOptions"
              :key="`knowledge-tag-${option.value}`"
              :data-testid="`knowledge-tag-filter-${option.value}`"
              type="button"
              class="rounded-full border px-2 py-1 text-[11px] transition"
              :class="
                knowledgeTagFilter === option.value
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-500'
              "
              @click="knowledgeTagFilter = option.value"
            >
              {{ option.label }} · {{ option.count }}
            </button>
          </div>
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] text-gray-500">
              {{ t('当前显示', 'Showing') }} {{ visibleKnowledgePoints.length }} / {{ knowledgePoints.length }}
            </p>
            <select
              v-model="knowledgeUsageSort"
              class="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] outline-none"
            >
              <option
                v-for="option in knowledgeUsageSortOptions"
                :key="`knowledge-sort-${option.value}`"
                :value="option.value"
              >
                {{ t('排序', 'Sort') }}: {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="knowledgePoints.length === 0" class="text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg p-3 text-center">
          {{ t('暂无知识点。', 'No knowledge points yet.') }}
        </div>

        <div
          v-else-if="visibleKnowledgePoints.length === 0"
          class="text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg p-3 text-center"
        >
          {{ t('当前筛选下没有知识点。', 'No knowledge points match the current filter.') }}
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="point in visibleKnowledgePoints"
            :key="point.id"
            data-testid="knowledge-point-card"
            class="rounded-xl border p-3 space-y-1"
            :class="isDeepLinkedKnowledgePoint(point) ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold truncate">{{ point.title }}</p>
              <div class="flex items-center gap-2 shrink-0">
                <AssetStatusBadge
                  :label="getKnowledgePointUsageBadge(point).label"
                  :tone="getKnowledgePointUsageBadge(point).tone"
                  :icon="getKnowledgePointUsageBadge(point).icon"
                  :truncate="false"
                />
                <button
                  @click="toggleKnowledgePoint(point)"
                  class="px-2 py-0.5 rounded text-[11px] border"
                  :class="point.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-600'"
                >
                  {{ point.enabled ? t('启用', 'Enabled') : t('停用', 'Disabled') }}
                </button>
                <button
                  :data-testid="`knowledge-edit-${point.id}`"
                  class="text-[11px] text-blue-500"
                  @click="openEditKnowledgePoint(point)"
                >
                  {{ t('编辑', 'Edit') }}
                </button>
                <button @click="removeKnowledgePoint(point)" class="text-[11px] text-red-500">
                  {{ t('删除', 'Delete') }}
                </button>
              </div>
            </div>
            <p class="text-xs text-gray-600 whitespace-pre-wrap">{{ point.content }}</p>
            <p v-if="Array.isArray(point.tags) && point.tags.length > 0" class="text-[11px] text-gray-400">
              #{{ point.tags.join(' #') }}
            </p>
            <div class="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600 space-y-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <AssetStatusBadge
                  :label="t(`角色 ${getKnowledgePointUsage(point).profiles.length} 个`, `${getKnowledgePointUsage(point).profiles.length} roles`)"
                  icon="fas fa-user"
                  tone="neutral"
                  :truncate="false"
                />
                <AssetStatusBadge
                  :label="t(`Chat ${getKnowledgePointUsage(point).chatBindingCount} 个`, `${getKnowledgePointUsage(point).chatBindingCount} chats`)"
                  icon="fas fa-comment"
                  :tone="point.enabled === false || getKnowledgePointUsage(point).chatBindingCount <= 0 ? 'neutral' : 'emerald'"
                  :truncate="false"
                />
              </div>
              <p>{{ describeKnowledgePointUsage(point) }}</p>
              <p v-if="formatKnowledgePointProfileNames(point)" class="text-gray-500">
                {{ t('绑定角色', 'Bound roles') }}: {{ formatKnowledgePointProfileNames(point) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p v-if="uiNotice" class="text-[12px]" :class="saved ? 'text-emerald-600' : 'text-amber-600'">
        {{ uiNotice }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.worldbook-shell {
  background: var(--system-page-bg);
  color: var(--system-text);
}

.worldbook-header {
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  box-shadow: var(--system-shadow-chrome);
  backdrop-filter: blur(var(--system-blur-md));
  -webkit-backdrop-filter: blur(var(--system-blur-md));
}

.worldbook-header h1 {
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: 0;
  color: var(--system-text);
}

.worldbook-nav-button {
  min-height: 36px;
  color: var(--system-accent);
  -webkit-tap-highlight-color: transparent;
}

.worldbook-scroll {
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.worldbook-scroll > .rounded-2xl {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.worldbook-scroll p {
  letter-spacing: 0;
}

.worldbook-scroll .text-gray-500 {
  color: var(--system-text-muted);
}

.worldbook-scroll .text-gray-400 {
  color: var(--system-text-soft);
}

.worldbook-scroll textarea,
.worldbook-scroll input,
.worldbook-scroll select {
  border-color: var(--system-border);
  background: var(--system-control-bg);
  color: var(--system-text);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
  transition:
    border-color var(--system-motion-fast),
    box-shadow var(--system-motion-fast),
    background var(--system-motion-fast);
}

.worldbook-scroll textarea:focus,
.worldbook-scroll input:focus,
.worldbook-scroll select:focus {
  border-color: var(--system-accent);
  background: var(--system-control-bg-strong);
  box-shadow: 0 0 0 4px var(--system-focus-ring);
}

.worldbook-scroll textarea {
  line-height: 1.65;
}

.worldbook-scroll button {
  -webkit-tap-highlight-color: transparent;
}

.worldbook-scroll > .rounded-2xl > button,
.worldbook-scroll [data-testid='knowledge-draft-submit'] {
  min-height: 42px;
  border-radius: 14px;
  background: var(--system-text);
  color: var(--system-text-inverse);
  box-shadow: var(--system-shadow-control);
}

.worldbook-scroll > .rounded-2xl > button.bg-green-500 {
  background: var(--system-success);
}

.worldbook-scroll .rounded-xl {
  border-color: var(--system-border);
}

.worldbook-scroll .bg-gray-50 {
  background: var(--system-surface-muted);
}

.worldbook-scroll .bg-white {
  background: var(--system-control-bg);
}

.worldbook-scroll [data-testid='knowledge-deeplink-banner'],
.worldbook-scroll .bg-blue-50,
.worldbook-scroll .bg-blue-50\/30 {
  border-color: var(--system-control-border);
  background: var(--system-info-soft);
}

.worldbook-scroll .bg-emerald-50 {
  background: var(--system-success-soft);
}

.worldbook-scroll .bg-amber-50 {
  background: var(--system-warning-soft);
}

.worldbook-scroll [data-testid='knowledge-point-card'] {
  border-radius: var(--system-radius-md);
  box-shadow: var(--system-shadow-control);
  transition:
    transform var(--system-motion-fast),
    box-shadow var(--system-motion-fast),
    border-color var(--system-motion-fast);
}

.worldbook-shell :deep(.text-blue-500),
.worldbook-shell :deep(.text-blue-600),
.worldbook-shell :deep(.text-blue-700),
.worldbook-shell :deep(.text-blue-800) {
  color: var(--system-info);
}

.worldbook-shell :deep(.text-red-500),
.worldbook-shell :deep(.text-red-600),
.worldbook-shell :deep(.text-red-700) {
  color: var(--system-danger);
}

.worldbook-shell :deep(.text-emerald-700) {
  color: var(--system-success);
}

.worldbook-shell :deep(.border-gray-100),
.worldbook-shell :deep(.border-gray-200),
.worldbook-shell :deep(.border-blue-200),
.worldbook-shell :deep(.border-blue-300),
.worldbook-shell :deep(.border-emerald-300),
.worldbook-shell :deep(.border-emerald-200) {
  border-color: var(--system-control-border);
}

.worldbook-scroll [data-testid='knowledge-point-card']:active {
  transform: scale(0.992);
}
</style>
