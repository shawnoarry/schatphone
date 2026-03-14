<script setup>
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const chatStore = useChatStore()
const { t } = useI18n()
const { contacts } = storeToRefs(chatStore)

const showCreateModal = ref(false)
const showEditModal = ref(false)
const activeSection = ref('social')
const createMode = ref('role')
const editingContactId = ref(null)

const draft = reactive({
  name: '',
  role: '',
  bio: '',
  serviceTemplate: '',
})

const roleContacts = computed(() => contacts.value.filter((item) => (item.kind || 'role') === 'role'))
const groupContacts = computed(() => contacts.value.filter((item) => item.kind === 'group'))
const serviceContacts = computed(() =>
  contacts.value.filter((item) => item.kind === 'service' || item.kind === 'official'),
)

const modeMeta = computed(() => {
  if (createMode.value === 'group') {
    return {
      title: t('新建群聊', 'Create Group Chat'),
      rolePlaceholder: t('绑定角色（逗号分隔）', 'Bind roles (comma-separated)'),
      bioPlaceholder: t('群聊设定（可选）', 'Group setting (optional)'),
    }
  }
  if (createMode.value === 'service') {
    return {
      title: t('添加服务号', 'Add Service Account'),
      rolePlaceholder: t('服务模板标题', 'Service template title'),
      bioPlaceholder: t('服务说明（可选）', 'Service description (optional)'),
    }
  }
  if (createMode.value === 'official') {
    return {
      title: t('添加公众号', 'Add Official Account'),
      rolePlaceholder: t('公众号模板标题', 'Official template title'),
      bioPlaceholder: t('服务说明（可选）', 'Service description (optional)'),
    }
  }
  return {
    title: t('新建对话', 'Create Chat'),
    rolePlaceholder: t('角色名称（如：私人助理）', 'Role name (e.g. Personal Assistant)'),
    bioPlaceholder: t('角色设定（可选）', 'Role setting (optional)'),
  }
})

const sectionTitle = computed(() =>
  activeSection.value === 'service' ? t('服务生态', 'Service Hub') : t('角色会话', 'Role Chats'),
)

const resetDraft = () => {
  draft.name = ''
  draft.role = ''
  draft.bio = ''
  draft.serviceTemplate = ''
}

const goBack = () => {
  router.push('/chat')
}

const openChat = (contact) => {
  chatStore.ensureConversationForContact(contact.id)
  chatStore.markConversationRead(contact.id)
  router.push(`/chat/${contact.id}`)
}

const openCreate = (mode) => {
  createMode.value = mode
  resetDraft()
  showCreateModal.value = true
}

const switchSection = (section) => {
  activeSection.value = section === 'service' ? 'service' : 'social'
}

const closeCreate = () => {
  showCreateModal.value = false
}

const createContact = () => {
  const name = draft.name.trim()
  if (!name) {
    alert(t('请输入名称。', 'Please enter a name.'))
    return
  }

  const kind = createMode.value
  const created = chatStore.addContact({
    name,
    kind,
    role:
      kind === 'group'
        ? `${t('群聊', 'Group')} · ${draft.role.trim() || t('未配置角色', 'Role not set')}`
        : kind === 'service'
          ? t('服务号', 'Service')
          : kind === 'official'
            ? t('公众号', 'Official')
            : draft.role.trim() || t('AI角色', 'AI Role'),
    bio: draft.bio.trim(),
    serviceTemplate: kind === 'service' || kind === 'official' ? draft.role.trim() : '',
    isMain: false,
  })
  closeCreate()
  openChat(created)
}

const openEdit = (contact) => {
  editingContactId.value = contact.id
  draft.name = contact.name || ''
  draft.role = contact.kind === 'service' || contact.kind === 'official' ? contact.serviceTemplate || '' : contact.role || ''
  draft.bio = contact.bio || ''
  draft.serviceTemplate = contact.serviceTemplate || ''
  showEditModal.value = true
}

const closeEdit = () => {
  showEditModal.value = false
  editingContactId.value = null
}

const saveEdit = () => {
  if (!editingContactId.value) return
  const target = contacts.value.find((item) => item.id === editingContactId.value)
  if (!target) return

  chatStore.updateContact(editingContactId.value, {
    name: draft.name.trim() || target.name,
    role:
      target.kind === 'service' || target.kind === 'official'
        ? target.role
        : draft.role.trim() || target.role,
    bio: draft.bio.trim(),
    serviceTemplate: target.kind === 'service' || target.kind === 'official' ? draft.role.trim() : '',
  })
  closeEdit()
}

const removeContact = (contact) => {
  const ok = confirm(`${t('确定删除本地会话对象', 'Delete local chat object')}「${contact.name}」${t('吗？', '?')}`)
  if (!ok) return
  chatStore.removeContact(contact.id)
}

const kindText = (contact) => {
  if (contact.kind === 'group') return t('群聊', 'Group')
  if (contact.kind === 'service') return t('服务号', 'Service')
  if (contact.kind === 'official') return t('公众号', 'Official')
  return t('角色', 'Role')
}

const kindClass = (contact) => {
  if (contact.kind === 'group') return 'bg-indigo-100 text-indigo-700'
  if (contact.kind === 'service') return 'bg-emerald-100 text-emerald-700'
  if (contact.kind === 'official') return 'bg-sky-100 text-sky-700'
  return 'bg-violet-100 text-violet-700'
}
</script>

<template>
  <div class="w-full h-full bg-gray-50 flex flex-col">
    <div class="pt-12 pb-3 px-4 bg-white border-b border-gray-100">
      <div class="flex items-center justify-between">
        <button @click="goBack" class="text-sm text-blue-600 flex items-center gap-1">
          <i class="fas fa-chevron-left"></i> {{ t('聊天', 'Chat') }}
        </button>
        <span class="font-bold">{{ t('会话通讯录', 'Chat Directory') }}</span>
        <span class="text-[11px] text-gray-400">{{ t('仅对话对象', 'Chat contacts only') }}</span>
      </div>
      <p class="mt-2 text-xs text-gray-500">
        {{ t('管理角色、群聊、服务号、公众号，和项目全局联系人分离。', 'Manage role/group/service contacts separately from global contacts.') }}
      </p>
    </div>

    <div class="px-4 py-3 bg-white border-b border-gray-100 flex flex-wrap gap-2">
      <button
        @click="switchSection('social')"
        class="px-3 py-1.5 rounded-full text-xs border"
        :class="
          activeSection === 'social'
            ? 'border-violet-300 bg-violet-50 text-violet-700'
            : 'border-gray-200 bg-white text-gray-600'
        "
      >
        {{ t('角色/群聊', 'Role/Group') }}
      </button>
      <button
        @click="switchSection('service')"
        class="px-3 py-1.5 rounded-full text-xs border"
        :class="
          activeSection === 'service'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-gray-200 bg-white text-gray-600'
        "
      >
        {{ t('服务号/公众号', 'Service/Official') }}
      </button>
      <span class="ml-auto text-[11px] text-gray-400 self-center">{{ sectionTitle }}</span>
    </div>

    <div v-if="activeSection === 'social'" class="px-4 py-3 bg-white border-b border-gray-100 flex flex-wrap gap-2">
      <button @click="openCreate('role')" class="px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white">
        {{ t('新建对话', 'Create Chat') }}
      </button>
      <button @click="openCreate('group')" class="px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white">
        {{ t('新建群聊', 'Create Group') }}
      </button>
    </div>

    <div v-else class="px-4 py-3 bg-white border-b border-gray-100 flex flex-wrap gap-2">
      <button @click="openCreate('service')" class="px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white">
        {{ t('添加服务号', 'Add Service') }}
      </button>
      <button @click="openCreate('official')" class="px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white">
        {{ t('添加公众号', 'Add Official') }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <section v-if="activeSection === 'social'" class="space-y-2">
        <h3 class="text-xs font-bold text-gray-500 uppercase">{{ t('角色会话', 'Role Chats') }}</h3>
        <p v-if="roleContacts.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('暂无角色会话，可先新建对话。', 'No role chats yet. Create one first.') }}
        </p>
        <div
          v-for="contact in roleContacts"
          :key="contact.id"
          class="rounded-2xl bg-white border border-gray-100 p-3 flex items-center gap-3"
        >
          <div class="w-10 h-10 rounded-xl bg-gray-200 overflow-hidden">
            <img
              :src="contact.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.name"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ contact.name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ contact.role || t('未设置角色', 'Role not set') }}</p>
          </div>
          <span class="px-1.5 py-0.5 text-[10px] rounded font-medium" :class="kindClass(contact)">
            {{ kindText(contact) }}
          </span>
          <button @click="openChat(contact)" class="text-xs text-blue-600">{{ t('聊天', 'Chat') }}</button>
          <button @click="openEdit(contact)" class="text-xs text-gray-500">{{ t('编辑', 'Edit') }}</button>
          <button @click="removeContact(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
        </div>
      </section>

      <section v-if="activeSection === 'social'" class="space-y-2">
        <h3 class="text-xs font-bold text-gray-500 uppercase">{{ t('群聊', 'Groups') }}</h3>
        <p v-if="groupContacts.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('暂无群聊，可先新建群聊。', 'No group chats yet. Create one first.') }}
        </p>
        <div
          v-for="contact in groupContacts"
          :key="contact.id"
          class="rounded-2xl bg-white border border-gray-100 p-3 flex items-center gap-3"
        >
          <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <i class="fas fa-users"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ contact.name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ contact.role || t('未设置成员', 'Members not set') }}</p>
          </div>
          <span class="px-1.5 py-0.5 text-[10px] rounded font-medium" :class="kindClass(contact)">
            {{ kindText(contact) }}
          </span>
          <button @click="openChat(contact)" class="text-xs text-blue-600">{{ t('聊天', 'Chat') }}</button>
          <button @click="openEdit(contact)" class="text-xs text-gray-500">{{ t('编辑', 'Edit') }}</button>
          <button @click="removeContact(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
        </div>
      </section>

      <section v-if="activeSection === 'service'" class="space-y-2">
        <h3 class="text-xs font-bold text-gray-500 uppercase">{{ t('服务号 / 公众号', 'Service / Official') }}</h3>
        <p v-if="serviceContacts.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('暂无服务号或公众号。', 'No service or official accounts yet.') }}
        </p>
        <div
          v-for="contact in serviceContacts"
          :key="contact.id"
          class="rounded-2xl bg-white border border-gray-100 p-3 flex items-center gap-3"
        >
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center"
            :class="contact.kind === 'official' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'"
          >
            <i :class="contact.kind === 'official' ? 'fas fa-newspaper' : 'fas fa-concierge-bell'"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ contact.name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ contact.serviceTemplate || t('未设置服务模板', 'Service template not set') }}</p>
          </div>
          <span class="px-1.5 py-0.5 text-[10px] rounded font-medium" :class="kindClass(contact)">
            {{ kindText(contact) }}
          </span>
          <button @click="openChat(contact)" class="text-xs text-blue-600">{{ t('聊天', 'Chat') }}</button>
          <button @click="openEdit(contact)" class="text-xs text-gray-500">{{ t('编辑', 'Edit') }}</button>
          <button @click="removeContact(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
        </div>
      </section>
    </div>

    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-center justify-center"
      @click.self="closeCreate"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 shadow-2xl">
        <p class="text-base font-bold">{{ modeMeta.title }}</p>
        <input
          v-model="draft.name"
          type="text"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="createMode === 'group' ? t('群聊名称', 'Group name') : t('会话名称', 'Chat name')"
        />
        <input
          v-model="draft.role"
          type="text"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="modeMeta.rolePlaceholder"
        />
        <textarea
          v-model="draft.bio"
          rows="3"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none outline-none"
          :placeholder="modeMeta.bioPlaceholder"
        ></textarea>
        <div class="flex justify-end gap-2">
          <button @click="closeCreate" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">{{ t('取消', 'Cancel') }}</button>
          <button
            @click="createContact"
            class="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-sm"
          >
            {{ t('创建', 'Create') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showEditModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-center justify-center"
      @click.self="closeEdit"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 shadow-2xl">
        <p class="text-base font-bold">{{ t('编辑会话对象', 'Edit chat contact') }}</p>
        <input
          v-model="draft.name"
          type="text"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="t('会话名称', 'Chat name')"
        />
        <input
          v-model="draft.role"
          type="text"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="t('角色或服务模板', 'Role or service template')"
        />
        <textarea
          v-model="draft.bio"
          rows="3"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none outline-none"
          :placeholder="t('说明（可选）', 'Description (optional)')"
        ></textarea>
        <div class="flex justify-end gap-2">
          <button @click="closeEdit" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">{{ t('取消', 'Cancel') }}</button>
          <button
            @click="saveEdit"
            class="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm"
          >
            {{ t('保存', 'Save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
