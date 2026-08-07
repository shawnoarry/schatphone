<script setup>
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import ChatAppTabBar from '../components/chat/ChatAppTabBar.vue'

const router = useRouter()
const chatStore = useChatStore()
const { contactsForList } = storeToRefs(chatStore)
const { confirmDialog } = useDialog()
const { t } = useI18n()

const uiNoticeType = ref('')
const uiNoticeMessage = ref('')
const showGroupModal = ref(false)
const editingGroupId = ref(0)
const groupDraft = reactive({
  name: '',
  groupReplyMode: 'natural',
  groupMemberIds: [],
})

let noticeTimerId = null

const groupReplyModeOptions = computed(() => [
  {
    value: 'natural',
    label: t('自然群聊', 'Natural group'),
    desc: t('AI 自行判断谁接话。', 'AI decides who speaks next.'),
  },
  {
    value: 'mention',
    label: t('点名回复', 'Mention to reply'),
    desc: t('优先让被提到的成员回应。', 'Prefer members mentioned in context.'),
  },
  {
    value: 'round_robin',
    label: t('轮流回复', 'Round robin'),
    desc: t('按成员顺序轮换发言。', 'Rotate speakers by member order.'),
  },
  {
    value: 'manual',
    label: t('手动选择', 'Manual pick'),
    desc: t('触发时由用户决定谁更适合说话。', 'User chooses the speaker when triggering.'),
  },
])

const roleContacts = computed(() =>
  contactsForList.value.filter((contact) => (contact.kind || 'role') === 'role'),
)

const groupContacts = computed(() =>
  contactsForList.value.filter((contact) => contact.kind === 'group'),
)

const groupModeLabel = (mode) =>
  groupReplyModeOptions.value.find((item) => item.value === mode)?.label ||
  groupReplyModeOptions.value[0].label

const showUiNotice = (type, message, durationMs = 2000) => {
  const text = typeof message === 'string' ? message.trim() : ''
  if (!text) return
  uiNoticeType.value = type
  uiNoticeMessage.value = text
  if (noticeTimerId) clearTimeout(noticeTimerId)
  noticeTimerId = setTimeout(() => {
    uiNoticeType.value = ''
    uiNoticeMessage.value = ''
  }, durationMs)
}

const resetGroupDraft = () => {
  groupDraft.name = ''
  groupDraft.groupReplyMode = 'natural'
  groupDraft.groupMemberIds = []
}

const openCreateGroup = () => {
  editingGroupId.value = 0
  resetGroupDraft()
  showGroupModal.value = true
}

const openEditGroup = (group) => {
  if (!group) return
  editingGroupId.value = Number(group.id) || 0
  groupDraft.name = group.name || ''
  groupDraft.groupReplyMode = group.groupReplyMode || 'natural'
  groupDraft.groupMemberIds = Array.isArray(group.groupMemberIds) ? [...group.groupMemberIds] : []
  showGroupModal.value = true
}

const closeGroupModal = () => {
  showGroupModal.value = false
}

const isMemberSelected = (contactId) =>
  groupDraft.groupMemberIds.map((id) => Number(id)).includes(Number(contactId))

const toggleMember = (contactId) => {
  const id = Number(contactId)
  if (!Number.isFinite(id) || id <= 0) return
  const selected = new Set(groupDraft.groupMemberIds.map((item) => Number(item)))
  if (selected.has(id)) {
    selected.delete(id)
  } else {
    selected.add(id)
  }
  groupDraft.groupMemberIds = [...selected]
}

const memberName = (contactId) => {
  const contact = chatStore.getContactById(contactId)
  return contact?.name || t('未知对象', 'Unknown')
}

const groupMemberNames = (group) => {
  const ids = Array.isArray(group?.groupMemberIds) ? group.groupMemberIds : []
  const names = ids.map((id) => memberName(id)).filter(Boolean)
  if (names.length === 0) return t('尚未选择成员', 'No members yet')
  if (names.length <= 4) return names.join('、')
  return `${names.slice(0, 4).join('、')} ${t(`等 ${names.length} 人`, `${names.length} members`)}`
}

const conversationPreviewText = (group) => {
  const conversation = chatStore.getConversationByContactId(group.id)
  if (conversation?.draft?.trim()) return `${t('草稿', 'Draft')}: ${conversation.draft.trim()}`
  return conversation?.lastMessage || t('群聊创建后可在消息页继续对话。', 'Open this group from Messages to chat.')
}

const saveGroup = () => {
  const memberIds = groupDraft.groupMemberIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
  if (memberIds.length < 2) {
    showUiNotice('warning', t('群聊至少需要 2 个对象。', 'A group needs at least 2 members.'))
    return
  }
  const name = groupDraft.name.trim() || memberIds.slice(0, 3).map((id) => memberName(id)).join('、')
  const payload = {
    kind: 'group',
    name: name || t('新的群聊', 'New group'),
    role: t('群聊', 'Group chat'),
    groupMemberIds: memberIds,
    groupReplyMode: groupDraft.groupReplyMode,
    lastMessage: '',
  }

  if (editingGroupId.value) {
    const ok = chatStore.updateContact(editingGroupId.value, payload)
    if (!ok) {
      showUiNotice('error', t('保存失败，请重试。', 'Save failed, please retry.'))
      return
    }
    chatStore.saveNow()
    showUiNotice('success', t('群聊已保存。', 'Group saved.'))
    closeGroupModal()
    return
  }

  const group = chatStore.addContact(payload)
  if (!group) {
    showUiNotice('error', t('创建失败，请重试。', 'Create failed, please retry.'))
    return
  }
  chatStore.saveNow()
  closeGroupModal()
  router.push(`/chat/${group.id}`)
}

const openChat = (group) => {
  if (!group?.id) return
  chatStore.ensureConversationForContact(group.id)
  chatStore.markConversationRead(group.id)
  router.push(`/chat/${group.id}`)
}

const removeGroup = async (group) => {
  if (!group?.id) return
  const confirmed = await confirmDialog({
    title: t('删除群聊', 'Delete group'),
    message: t(
      `确认删除群聊「${group.name}」吗？聊天记录也会一起删除。`,
      `Delete group "${group.name}"? Chat history will also be removed.`,
    ),
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return
  const ok = chatStore.removeContact(group.id)
  if (!ok) {
    showUiNotice('error', t('删除失败，请重试。', 'Delete failed, please retry.'))
    return
  }
  chatStore.saveNow()
  showUiNotice('success', t('群聊已删除。', 'Group deleted.'))
}
</script>

<template>
  <div class="w-full h-full flex flex-col chat-shell chat-groups-shell">
    <div class="chat-home-header pt-12 px-4 pb-4 chat-ink">
      <div class="flex items-center justify-between gap-3">
        <button
          @click="router.push('/chat')"
          class="chat-home-icon-button chat-ink"
          :aria-label="t('返回消息', 'Back to Messages')"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <p class="flex-1 text-[1.45rem] font-extrabold leading-tight tracking-tight">{{ t('群聊', 'Groups') }}</p>
        <button
          type="button"
          class="chat-home-icon-button chat-ink"
          :aria-label="t('新建群聊', 'New group')"
          data-testid="chat-group-create"
          @click="openCreateGroup"
        >
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>

    <div class="chat-home-sheet flex-1 overflow-y-auto no-scrollbar">
      <p
        v-if="uiNoticeMessage"
        class="mx-4 mt-3 rounded-xl px-3 py-2 text-[11px]"
        :class="uiNoticeType === 'error' ? 'bg-red-50 text-red-600' : uiNoticeType === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'"
      >
        {{ uiNoticeMessage }}
      </p>

      <section
        v-if="groupContacts.length === 0"
        class="chat-home-empty"
      >
        <span class="chat-home-empty__icon" aria-hidden="true">
          <i class="far fa-comments"></i>
        </span>
        <span class="chat-home-empty__title">{{ t('还没有群聊', 'No groups yet') }}</span>
        <span class="chat-home-empty__detail">
          {{ t('先选择至少两个 Chat 对象，创建后会出现在消息列表里。', 'Choose at least two Chat objects. The group then appears in Messages.') }}
        </span>
        <button
          type="button"
          class="chat-home-empty__action"
          @click="openCreateGroup"
        >
          {{ t('创建第一个群聊', 'Create first group') }}
        </button>
      </section>

      <div
        v-for="group in groupContacts"
        :key="group.id"
        class="chat-list-row"
        :data-testid="`chat-group-${group.id}`"
        @click="openChat(group)"
      >
        <div class="chat-list-avatar chat-list-avatar--group">
          <i class="fas fa-comments"></i>
        </div>
        <div class="chat-list-content">
          <div class="flex justify-between items-center gap-2">
            <span class="font-bold text-sm truncate">{{ group.name }}</span>
            <span class="text-[10px] text-gray-400 shrink-0">
              {{ groupModeLabel(group.groupReplyMode) }} · {{ (group.groupMemberIds || []).length }}{{ t('人', '') }}
            </span>
          </div>
          <div class="chat-list-preview text-gray-500">
            <span class="chat-list-tag bg-indigo-100 text-indigo-700">{{ t('群聊', 'Group') }}</span>
            {{ groupMemberNames(group) }}
          </div>
          <p class="mt-0.5 line-clamp-1 text-[11px] text-gray-400">{{ conversationPreviewText(group) }}</p>
        </div>
        <div class="chat-list-side">
          <button
            type="button"
            class="chat-row-icon-action"
            :aria-label="t('设置', 'Settings')"
            @click.stop="openEditGroup(group)"
          >
            <i class="fas fa-gear"></i>
          </button>
          <button
            type="button"
            class="chat-row-icon-action chat-row-icon-action--danger"
            :aria-label="t('删除', 'Delete')"
            @click.stop="removeGroup(group)"
          >
            <i class="fas fa-trash-can"></i>
          </button>
        </div>
      </div>
    </div>

    <ChatAppTabBar active="groups" />

    <div
      v-if="showGroupModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-end justify-center pb-6"
      @click.self="closeGroupModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-lg font-extrabold text-gray-950">
              {{ editingGroupId ? t('编辑群聊', 'Edit group') : t('新建群聊', 'New group') }}
            </p>
            <p class="mt-1 text-[11px] text-gray-500">
              {{ t('群成员来自已经进入 Chat 的角色对象。', 'Members come from role objects already in Chat.') }}
            </p>
          </div>
          <button type="button" class="chat-home-icon-button -mr-1 -mt-1 text-gray-400" @click="closeGroupModal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="mt-4 space-y-4">
          <label class="block space-y-1.5">
            <span class="text-xs font-semibold text-gray-600">{{ t('群名', 'Group name') }}</span>
            <input
              v-model="groupDraft.name"
              type="text"
              class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
              :placeholder="t('不填则用成员名生成', 'Leave blank to use member names')"
            />
          </label>

          <label class="block space-y-1.5">
            <span class="text-xs font-semibold text-gray-600">{{ t('群聊模式', 'Group mode') }}</span>
            <select
              v-model="groupDraft.groupReplyMode"
              class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
            >
              <option
                v-for="option in groupReplyModeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }} · {{ option.desc }}
              </option>
            </select>
          </label>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold text-gray-600">{{ t('选择成员', 'Choose members') }}</p>
              <span class="text-[10px] font-semibold text-gray-400">
                {{ groupDraft.groupMemberIds.length }} / {{ roleContacts.length }}
              </span>
            </div>
            <div
              v-if="roleContacts.length === 0"
              class="rounded-2xl border border-dashed border-gray-200 px-3 py-5 text-center text-xs text-gray-500"
            >
              {{ t('暂无可选角色，请先到对象页绑定角色。', 'No role objects yet. Bind roles from Objects first.') }}
            </div>
            <div v-else class="max-h-60 overflow-y-auto space-y-2 pr-0.5 no-scrollbar">
              <button
                v-for="contact in roleContacts"
                :key="contact.id"
                type="button"
                class="w-full rounded-2xl border px-3 py-2.5 text-left flex items-center gap-3 transition-colors"
                :class="isMemberSelected(contact.id) ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100 bg-white hover:bg-gray-50'"
                @click="toggleMember(contact.id)"
              >
                <span
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]"
                  :class="isMemberSelected(contact.id) ? 'border-yellow-400 bg-yellow-400 text-gray-950' : 'border-gray-300 text-transparent'"
                >
                  <i class="fas fa-check"></i>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-gray-900">{{ contact.name }}</span>
                  <span class="block truncate text-[11px] text-gray-500">{{ contact.role || t('角色对象', 'Role object') }}</span>
                </span>
              </button>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
              @click="closeGroupModal"
            >
              {{ t('取消', 'Cancel') }}
            </button>
            <button
              type="button"
              class="rounded-full bg-yellow-300 px-4 py-2 text-sm font-extrabold text-gray-950 shadow-sm"
              @click="saveGroup"
            >
              {{ editingGroupId ? t('保存', 'Save') : t('创建并进入', 'Create and open') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
