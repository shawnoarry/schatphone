<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useI18n } from '../composables/useI18n'
import { useDialog } from '../composables/useDialog'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'

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
let savedTimerId = null

const goSettings = () => {
  router.push('/settings')
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

const addKnowledgePoint = () => {
  const title = knowledgeDraft.title.trim()
  const content = knowledgeDraft.content.trim()
  if (!title && !content) {
    uiNotice.value = t('请先输入标题或内容。', 'Please enter title or content first.')
    return
  }
  const created = systemStore.upsertKnowledgePoint({
    title,
    content,
    tags: parseTagDraft(knowledgeDraft.tags),
    enabled: true,
  })
  if (!created) {
    uiNotice.value = t('知识点保存失败（可能已达上限）。', 'Knowledge point save failed (limit reached).')
    return
  }
  knowledgeDraft.title = ''
  knowledgeDraft.content = ''
  knowledgeDraft.tags = ''
  systemStore.saveNow()
  pulseSaved(t('知识点已添加。', 'Knowledge point added.'))
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
  const usage = getKnowledgePointUsage(point)
  if (usage.profiles.length <= 0) {
    return {
      label: t('未使用', 'Unused'),
      tone: 'neutral',
      icon: 'fas fa-circle',
    }
  }
  if (point?.enabled === false) {
    return {
      label: t('已绑定但停用', 'Bound but disabled'),
      tone: 'amber',
      icon: 'fas fa-pause',
    }
  }
  if (usage.chatBindingCount <= 0) {
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
  systemStore.saveNow()
  pulseSaved(t('知识点已删除。', 'Knowledge point deleted.'))
}

onBeforeUnmount(() => {
  if (savedTimerId) clearTimeout(savedTimerId)
})
</script>

<template>
  <div class="w-full h-full bg-[#f2f2f7] text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center gap-3">
      <button @click="goSettings" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('设置', 'Settings') }}
      </button>
      <h1 class="font-bold text-xl">{{ t('世界书', 'World Book') }}</h1>
    </div>

    <div class="flex-1 px-4 py-4 overflow-y-auto no-scrollbar space-y-4">
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
          <input
            v-model="knowledgeDraft.title"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('知识点标题（如：角色A语言规范）', 'Point title (e.g. Role A language rule)')"
          />
          <textarea
            v-model="knowledgeDraft.content"
            class="w-full h-20 border rounded-lg px-3 py-2 text-sm outline-none resize-none"
            :placeholder="t('知识点内容', 'Knowledge point content')"
          ></textarea>
          <input
            v-model="knowledgeDraft.tags"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('标签（逗号分隔）', 'Tags (comma separated)')"
          />
          <button
            @click="addKnowledgePoint"
            class="w-full py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold"
          >
            {{ t('新增知识点', 'Add knowledge point') }}
          </button>
        </div>

        <div v-if="knowledgePoints.length === 0" class="text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg p-3 text-center">
          {{ t('暂无知识点。', 'No knowledge points yet.') }}
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="point in knowledgePoints"
            :key="point.id"
            class="rounded-xl border border-gray-200 p-3 space-y-1"
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
