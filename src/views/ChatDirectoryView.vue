<script setup>
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const chatStore = useChatStore()
const { t } = useI18n()
const { contacts, roleProfiles } = storeToRefs(chatStore)

const activeSection = ref('roles')
const showBindModal = ref(false)
const bindProfileId = ref(0)

const showRoleMetaModal = ref(false)
const editingRoleContactId = ref(0)
const roleMetaDraft = reactive({
  relationshipLevel: 50,
  relationshipNote: '',
})

const showServiceModal = ref(false)
const serviceModalMode = ref('create')
const editingServiceId = ref(0)
const serviceDraft = reactive({
  name: '',
  kind: 'service',
  template: '',
  bio: '',
})

const roleBindings = computed(() =>
  contacts.value
    .filter((item) => (item.kind || 'role') === 'role')
    .map((item) => chatStore.getContactById(item.id))
    .filter(Boolean),
)

const boundProfileIds = computed(() =>
  new Set(
    contacts.value
      .filter((item) => (item.kind || 'role') === 'role' && Number(item.profileId) > 0)
      .map((item) => Number(item.profileId)),
  ),
)

const unboundRoleProfiles = computed(() =>
  roleProfiles.value.filter((profile) => !boundProfileIds.value.has(Number(profile.id))),
)

const serviceContacts = computed(() =>
  contacts.value
    .filter((item) => item.kind === 'service' || item.kind === 'official')
    .map((item) => chatStore.getContactById(item.id))
    .filter(Boolean),
)

const goBack = () => {
  router.push('/chat')
}

const switchSection = (section) => {
  activeSection.value = section === 'service' ? 'service' : 'roles'
}

const openChat = (contact) => {
  chatStore.ensureConversationForContact(contact.id)
  chatStore.markConversationRead(contact.id)
  router.push(`/chat/${contact.id}`)
}

const openBindModal = () => {
  if (unboundRoleProfiles.value.length === 0) {
    alert(t('暂无可绑定角色，请先在主通讯录创建角色档案。', 'No profiles available. Create role profiles in main Contacts first.'))
    return
  }
  bindProfileId.value = Number(unboundRoleProfiles.value[0]?.id || 0)
  showBindModal.value = true
}

const closeBindModal = () => {
  showBindModal.value = false
}

const bindSelectedProfile = () => {
  if (!bindProfileId.value) return
  const created = chatStore.bindRoleProfile(bindProfileId.value, {
    relationshipLevel: 60,
    relationshipNote: '',
  })
  if (!created) {
    alert(t('绑定失败，请重试。', 'Bind failed, please retry.'))
    return
  }
  closeBindModal()
}

const openRoleMetaModal = (contact) => {
  editingRoleContactId.value = contact.id
  roleMetaDraft.relationshipLevel = Number.isFinite(Number(contact.relationshipLevel))
    ? Number(contact.relationshipLevel)
    : 50
  roleMetaDraft.relationshipNote = contact.relationshipNote || ''
  showRoleMetaModal.value = true
}

const closeRoleMetaModal = () => {
  showRoleMetaModal.value = false
  editingRoleContactId.value = 0
}

const saveRoleMeta = () => {
  if (!editingRoleContactId.value) return
  const ok = chatStore.updateRoleBindingMeta(editingRoleContactId.value, {
    relationshipLevel: roleMetaDraft.relationshipLevel,
    relationshipNote: roleMetaDraft.relationshipNote,
  })
  if (!ok) {
    alert(t('保存失败，请重试。', 'Save failed, please retry.'))
    return
  }
  closeRoleMetaModal()
}

const unbindRole = (contact) => {
  const ok = window.confirm(
    `${t('确认解除会话绑定', 'Unbind this chat entry')}「${contact.name}」${t('吗？不会删除主通讯录档案。', '? Main profile will be kept.')}`,
  )
  if (!ok) return
  chatStore.unbindRoleContact(contact.id)
}

const resetServiceDraft = () => {
  serviceDraft.name = ''
  serviceDraft.kind = 'service'
  serviceDraft.template = ''
  serviceDraft.bio = ''
}

const openCreateService = (kind = 'service') => {
  serviceModalMode.value = 'create'
  editingServiceId.value = 0
  resetServiceDraft()
  serviceDraft.kind = kind === 'official' ? 'official' : 'service'
  showServiceModal.value = true
}

const openEditService = (contact) => {
  serviceModalMode.value = 'edit'
  editingServiceId.value = contact.id
  serviceDraft.name = contact.name || ''
  serviceDraft.kind = contact.kind === 'official' ? 'official' : 'service'
  serviceDraft.template = contact.serviceTemplate || ''
  serviceDraft.bio = contact.bio || ''
  showServiceModal.value = true
}

const closeServiceModal = () => {
  showServiceModal.value = false
  editingServiceId.value = 0
}

const saveService = () => {
  const name = serviceDraft.name.trim()
  if (!name) {
    alert(t('请输入名称。', 'Please enter a name.'))
    return
  }

  const payload = {
    name,
    kind: serviceDraft.kind === 'official' ? 'official' : 'service',
    role: serviceDraft.kind === 'official' ? t('公众号', 'Official') : t('服务号', 'Service'),
    serviceTemplate: serviceDraft.template.trim(),
    bio: serviceDraft.bio.trim(),
  }

  if (serviceModalMode.value === 'create') {
    const created = chatStore.addContact(payload)
    closeServiceModal()
    openChat(created)
    return
  }

  if (!editingServiceId.value) return
  const ok = chatStore.updateContact(editingServiceId.value, payload)
  if (!ok) {
    alert(t('保存失败，请重试。', 'Save failed, please retry.'))
    return
  }
  closeServiceModal()
}

const removeService = (contact) => {
  const ok = window.confirm(
    `${t('确认删除服务会话对象', 'Delete service chat entry')}「${contact.name}」${t('吗？', '?')}`,
  )
  if (!ok) return
  chatStore.removeContact(contact.id)
}

const roleTypeTag = (profile) => (profile?.isMain ? t('主角色', 'Main') : t('NPC', 'NPC'))

const serviceKindTag = (contact) =>
  contact.kind === 'official' ? t('公众号', 'Official') : t('服务号', 'Service')
</script>

<template>
  <div class="w-full h-full bg-gray-50 flex flex-col">
    <div class="pt-12 pb-3 px-4 bg-white border-b border-gray-100">
      <div class="flex items-center justify-between">
        <button @click="goBack" class="text-sm text-blue-600 flex items-center gap-1">
          <i class="fas fa-chevron-left"></i> {{ t('聊天', 'Chat') }}
        </button>
        <span class="font-bold">{{ t('会话通讯录', 'Chat Directory') }}</span>
        <span class="text-[11px] text-gray-400">{{ t('绑定层', 'Binding Layer') }}</span>
      </div>
      <p class="mt-2 text-xs text-gray-500">
        {{
          t(
            '角色档案来自主通讯录；本页只做角色绑定与会话变量设置。服务号可在此新建/编辑/删除。',
            'Role profiles come from main Contacts. This page handles bindings and thread variables only. Service accounts are managed here.',
          )
        }}
      </p>
    </div>

    <div class="px-4 py-3 bg-white border-b border-gray-100 flex flex-wrap gap-2">
      <button
        @click="switchSection('roles')"
        class="px-3 py-1.5 rounded-full text-xs border"
        :class="
          activeSection === 'roles'
            ? 'border-violet-300 bg-violet-50 text-violet-700'
            : 'border-gray-200 bg-white text-gray-600'
        "
      >
        {{ t('角色绑定', 'Role Bindings') }}
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
        {{ t('服务号管理', 'Service Management') }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <section v-if="activeSection === 'roles'" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-gray-500 uppercase">{{ t('已绑定角色', 'Bound Roles') }}</h3>
          <button @click="openBindModal" class="px-2.5 py-1 rounded-md border border-violet-200 bg-violet-50 text-violet-700 text-xs">
            {{ t('绑定角色', 'Bind Role') }}
          </button>
        </div>

        <p v-if="roleBindings.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('暂无已绑定角色。', 'No role bindings yet.') }}
        </p>

        <div
          v-for="contact in roleBindings"
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
            <p class="text-xs text-gray-500 truncate">
              {{ contact.role || t('未设置角色', 'Role not set') }} ·
              {{ t('亲密度', 'Affinity') }} {{ contact.relationshipLevel ?? 50 }}
            </p>
            <p v-if="contact.relationshipNote" class="text-[11px] text-gray-400 truncate">
              {{ contact.relationshipNote }}
            </p>
          </div>
          <button @click="openChat(contact)" class="text-xs text-blue-600">{{ t('聊天', 'Chat') }}</button>
          <button @click="openRoleMetaModal(contact)" class="text-xs text-gray-500">{{ t('会话设定', 'Thread Meta') }}</button>
          <button @click="unbindRole(contact)" class="text-xs text-red-500">{{ t('解绑', 'Unbind') }}</button>
        </div>

        <div class="rounded-xl bg-white border border-gray-100 p-3">
          <p class="text-xs font-semibold text-gray-600 mb-2">{{ t('可绑定角色档案', 'Available Profiles') }}</p>
          <p v-if="unboundRoleProfiles.length === 0" class="text-xs text-gray-400">
            {{ t('全部角色已绑定到会话。', 'All profiles are already bound.') }}
          </p>
          <div v-else class="space-y-1.5">
            <div
              v-for="profile in unboundRoleProfiles"
              :key="profile.id"
              class="flex items-center justify-between gap-2 border border-gray-100 rounded-lg px-2.5 py-2"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ profile.name }}</p>
                <p class="text-[11px] text-gray-500 truncate">{{ roleTypeTag(profile) }} · {{ profile.role || t('未设置角色', 'Role not set') }}</p>
              </div>
              <button
                @click="bindProfileId = profile.id; bindSelectedProfile()"
                class="px-2 py-1 rounded border border-violet-200 bg-violet-50 text-violet-700 text-[11px]"
              >
                {{ t('绑定', 'Bind') }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'service'" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-gray-500 uppercase">{{ t('服务号 / 公众号', 'Service / Official') }}</h3>
          <div class="flex gap-2">
            <button @click="openCreateService('service')" class="px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">
              {{ t('新增服务号', 'Add Service') }}
            </button>
            <button @click="openCreateService('official')" class="px-2.5 py-1 rounded-md border border-sky-200 bg-sky-50 text-sky-700 text-xs">
              {{ t('新增公众号', 'Add Official') }}
            </button>
          </div>
        </div>

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
            <p class="text-xs text-gray-500 truncate">
              {{ serviceKindTag(contact) }} · {{ contact.serviceTemplate || t('未设置服务模板', 'Service template not set') }}
            </p>
          </div>
          <button @click="openChat(contact)" class="text-xs text-blue-600">{{ t('聊天', 'Chat') }}</button>
          <button @click="openEditService(contact)" class="text-xs text-gray-500">{{ t('编辑', 'Edit') }}</button>
          <button @click="removeService(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
        </div>
      </section>
    </div>

    <div
      v-if="showBindModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-center justify-center"
      @click.self="closeBindModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 shadow-2xl">
        <p class="text-base font-bold">{{ t('绑定角色到会话', 'Bind Profile to Chat') }}</p>
        <select v-model.number="bindProfileId" class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none bg-white">
          <option v-for="profile in unboundRoleProfiles" :key="profile.id" :value="profile.id">
            {{ profile.name }} · {{ profile.role || t('未设置角色', 'Role not set') }}
          </option>
        </select>
        <div class="flex justify-end gap-2">
          <button @click="closeBindModal" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">{{ t('取消', 'Cancel') }}</button>
          <button
            @click="bindSelectedProfile"
            class="px-3 py-1.5 rounded-lg border border-violet-300 bg-violet-50 text-violet-700 text-sm"
          >
            {{ t('确认绑定', 'Confirm Bind') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showRoleMetaModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-center justify-center"
      @click.self="closeRoleMetaModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 shadow-2xl">
        <p class="text-base font-bold">{{ t('会话变量设置', 'Thread Variable Settings') }}</p>
        <label class="text-xs text-gray-500 block">
          {{ t('亲密度（0-100）', 'Affinity (0-100)') }}
        </label>
        <input
          v-model.number="roleMetaDraft.relationshipLevel"
          type="number"
          min="0"
          max="100"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
        />
        <label class="text-xs text-gray-500 block">
          {{ t('会话备注（仅本会话）', 'Thread note (chat local only)') }}
        </label>
        <textarea
          v-model="roleMetaDraft.relationshipNote"
          rows="3"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none outline-none"
          :placeholder="t('例如：最近关系升温、需要更主动互动。', 'Example: relationship improved, prefer more proactive interaction.')"
        ></textarea>
        <div class="flex justify-end gap-2">
          <button @click="closeRoleMetaModal" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">{{ t('取消', 'Cancel') }}</button>
          <button
            @click="saveRoleMeta"
            class="px-3 py-1.5 rounded-lg border border-violet-300 bg-violet-50 text-violet-700 text-sm"
          >
            {{ t('保存', 'Save') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showServiceModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-center justify-center"
      @click.self="closeServiceModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 shadow-2xl">
        <p class="text-base font-bold">
          {{
            serviceModalMode === 'create'
              ? serviceDraft.kind === 'official'
                ? t('新增公众号', 'Add Official')
                : t('新增服务号', 'Add Service')
              : t('编辑服务对象', 'Edit Service Entry')
          }}
        </p>
        <input
          v-model="serviceDraft.name"
          type="text"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="t('名称', 'Name')"
        />
        <select
          v-model="serviceDraft.kind"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none bg-white"
          :disabled="serviceModalMode === 'edit'"
        >
          <option value="service">{{ t('服务号', 'Service') }}</option>
          <option value="official">{{ t('公众号', 'Official') }}</option>
        </select>
        <input
          v-model="serviceDraft.template"
          type="text"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="t('服务模板标题', 'Service template title')"
        />
        <textarea
          v-model="serviceDraft.bio"
          rows="3"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none outline-none"
          :placeholder="t('服务说明（可选）', 'Description (optional)')"
        ></textarea>
        <div class="flex justify-end gap-2">
          <button @click="closeServiceModal" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">{{ t('取消', 'Cancel') }}</button>
          <button
            @click="saveService"
            class="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm"
          >
            {{ t('保存', 'Save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
