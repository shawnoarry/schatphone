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
const searchKeyword = ref('')
const roleFilter = ref('all')
const serviceFilter = ref('all')
const batchMode = ref(false)
const selectedContactIds = ref([])
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

const roleMetaTemplatePresets = [
  {
    id: 'polite_start',
    titleCn: '礼貌初识',
    titleEn: 'Polite Start',
    relationshipLevel: 45,
    relationshipNoteCn: '保持礼貌边界，慢速建立信任。',
    relationshipNoteEn: 'Keep polite boundaries and build trust slowly.',
  },
  {
    id: 'warm_daily',
    titleCn: '日常升温',
    titleEn: 'Warm Daily',
    relationshipLevel: 65,
    relationshipNoteCn: '日常互动偏主动，关注对方情绪变化。',
    relationshipNoteEn: 'Use proactive daily interactions and track mood changes.',
  },
  {
    id: 'close_bond',
    titleCn: '高亲密关系',
    titleEn: 'Close Bond',
    relationshipLevel: 82,
    relationshipNoteCn: '称呼更亲近，回应节奏更密集。',
    relationshipNoteEn: 'Use closer addressing and denser reply rhythm.',
  },
]

const serviceTemplatePresets = [
  {
    id: 'sys_notice',
    kind: 'service',
    nameCn: '系统通知',
    nameEn: 'System Notice',
    templateCn: '系统通知模板',
    templateEn: 'System Notification Template',
    bioCn: '用于发系统消息、状态变更和提醒。',
    bioEn: 'For status updates and in-app reminders.',
  },
  {
    id: 'task_assistant',
    kind: 'service',
    nameCn: '任务助手',
    nameEn: 'Task Assistant',
    templateCn: '任务流转模板',
    templateEn: 'Task Flow Template',
    bioCn: '用于派发任务、催办和结果反馈。',
    bioEn: 'For task assignment, follow-up, and result feedback.',
  },
  {
    id: 'world_feed',
    kind: 'official',
    nameCn: '世界动态',
    nameEn: 'World Feed',
    templateCn: '资讯播报模板',
    templateEn: 'News Broadcast Template',
    bioCn: '用于剧情动态、公共消息与活动公告。',
    bioEn: 'For world events, public updates, and announcements.',
  },
]

const selectedRoleTemplateId = ref(roleMetaTemplatePresets[0]?.id || '')
const selectedServiceTemplateId = ref(serviceTemplatePresets[0]?.id || '')

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

const unboundRoleProfilesRaw = computed(() =>
  roleProfiles.value.filter((profile) => !boundProfileIds.value.has(Number(profile.id))),
)

const serviceContacts = computed(() =>
  contacts.value
    .filter((item) => item.kind === 'service' || item.kind === 'official')
    .map((item) => chatStore.getContactById(item.id))
    .filter(Boolean),
)

const roleFilterOptions = computed(() => [
  { key: 'all', label: t('全部', 'All') },
  { key: 'main', label: t('主角色', 'Main') },
  { key: 'npc', label: t('NPC', 'NPC') },
])

const serviceFilterOptions = computed(() => [
  { key: 'all', label: t('全部', 'All') },
  { key: 'service', label: t('服务号', 'Service') },
  { key: 'official', label: t('公众号', 'Official') },
])

const normalizedSearchKeyword = computed(() => searchKeyword.value.trim().toLowerCase())

const includesSearch = (...fields) => {
  if (!normalizedSearchKeyword.value) return true
  return fields.some((field) =>
    typeof field === 'string' && field.toLowerCase().includes(normalizedSearchKeyword.value),
  )
}

const matchRoleType = (target) => {
  if (roleFilter.value === 'main') return target?.isMain === true
  if (roleFilter.value === 'npc') return target?.isMain !== true
  return true
}

const filteredRoleBindings = computed(() =>
  roleBindings.value.filter(
    (contact) =>
      matchRoleType(contact) &&
      includesSearch(
        contact?.name,
        contact?.role,
        contact?.bio,
        contact?.relationshipNote,
        contact?.lastMessage,
      ),
  ),
)

const filteredUnboundRoleProfiles = computed(() =>
  unboundRoleProfilesRaw.value.filter(
    (profile) =>
      matchRoleType(profile) &&
      includesSearch(profile?.name, profile?.role, profile?.bio, (profile?.tags || []).join(' ')),
  ),
)

const filteredServiceContacts = computed(() =>
  serviceContacts.value.filter((contact) => {
    if (serviceFilter.value === 'service' && contact.kind !== 'service') return false
    if (serviceFilter.value === 'official' && contact.kind !== 'official') return false
    return includesSearch(
      contact?.name,
      contact?.role,
      contact?.serviceTemplate,
      contact?.bio,
      contact?.lastMessage,
    )
  }),
)

const searchPlaceholder = computed(() =>
  activeSection.value === 'roles'
    ? t('搜索角色名/设定/备注', 'Search role name/profile/note')
    : t('搜索服务号/模板/说明', 'Search service account/template/description'),
)

const selectedContactIdSet = computed(() =>
  new Set(selectedContactIds.value.map((id) => Number(id)).filter((id) => Number.isFinite(id))),
)

const filteredRoleIds = computed(() =>
  filteredRoleBindings.value.map((contact) => Number(contact.id)).filter((id) => Number.isFinite(id)),
)

const filteredServiceIds = computed(() =>
  filteredServiceContacts.value.map((contact) => Number(contact.id)).filter((id) => Number.isFinite(id)),
)

const selectedRoleCount = computed(() =>
  filteredRoleIds.value.filter((id) => selectedContactIdSet.value.has(id)).length,
)

const selectedServiceCount = computed(() =>
  filteredServiceIds.value.filter((id) => selectedContactIdSet.value.has(id)).length,
)

const allFilteredSelected = computed(() => {
  const targetIds = activeSection.value === 'roles' ? filteredRoleIds.value : filteredServiceIds.value
  if (targetIds.length === 0) return false
  return targetIds.every((id) => selectedContactIdSet.value.has(id))
})

const selectedCountCurrentSection = computed(() =>
  activeSection.value === 'roles' ? selectedRoleCount.value : selectedServiceCount.value,
)

const goBack = () => {
  router.push('/chat')
}

const clearSelection = () => {
  selectedContactIds.value = []
}

const setBatchMode = (enabled) => {
  batchMode.value = Boolean(enabled)
  if (!batchMode.value) clearSelection()
}

const toggleBatchMode = () => {
  setBatchMode(!batchMode.value)
}

const isContactSelected = (contactId) => selectedContactIdSet.value.has(Number(contactId))

const toggleSelectContact = (contactId) => {
  if (!batchMode.value) return
  const numericId = Number(contactId)
  if (!Number.isFinite(numericId)) return
  if (selectedContactIdSet.value.has(numericId)) {
    selectedContactIds.value = selectedContactIds.value.filter((id) => Number(id) !== numericId)
    return
  }
  selectedContactIds.value = [...selectedContactIds.value, numericId]
}

const toggleSelectAllFiltered = () => {
  if (!batchMode.value) return
  const targetIds = activeSection.value === 'roles' ? filteredRoleIds.value : filteredServiceIds.value
  if (targetIds.length === 0) return

  if (allFilteredSelected.value) {
    const targetSet = new Set(targetIds)
    selectedContactIds.value = selectedContactIds.value.filter((id) => !targetSet.has(Number(id)))
    return
  }

  const merged = new Set([...selectedContactIds.value.map((id) => Number(id)), ...targetIds])
  selectedContactIds.value = [...merged]
}

const switchSection = (section) => {
  activeSection.value = section === 'service' ? 'service' : 'roles'
  searchKeyword.value = ''
  setBatchMode(false)
}

const openChat = (contact) => {
  chatStore.ensureConversationForContact(contact.id)
  chatStore.markConversationRead(contact.id)
  router.push(`/chat/${contact.id}`)
}

const openBindModal = () => {
  if (unboundRoleProfilesRaw.value.length === 0) {
    alert(t('暂无可绑定角色，请先在主通讯录创建角色档案。', 'No profiles available. Create role profiles in main Contacts first.'))
    return
  }
  bindProfileId.value = Number(unboundRoleProfilesRaw.value[0]?.id || 0)
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

const batchBindFilteredProfiles = () => {
  if (filteredUnboundRoleProfiles.value.length === 0) {
    alert(t('当前筛选下没有可批量绑定角色。', 'No available profiles to batch bind under current filter.'))
    return
  }
  const ok = window.confirm(
    t(
      `确认批量绑定当前筛选结果（${filteredUnboundRoleProfiles.value.length} 个角色）吗？`,
      `Bind all filtered profiles (${filteredUnboundRoleProfiles.value.length})?`,
    ),
  )
  if (!ok) return

  let successCount = 0
  filteredUnboundRoleProfiles.value.forEach((profile) => {
    const created = chatStore.bindRoleProfile(profile.id, {
      relationshipLevel: 60,
      relationshipNote: '',
    })
    if (created) successCount += 1
  })

  alert(
    t(
      `已批量绑定 ${successCount} 个角色会话。`,
      `Bound ${successCount} role chats.`,
    ),
  )
}

const batchUnbindSelectedRoles = () => {
  if (selectedRoleCount.value <= 0) {
    alert(t('请先选择要解绑的角色会话。', 'Select role chats to unbind first.'))
    return
  }

  const targets = filteredRoleBindings.value.filter((contact) => isContactSelected(contact.id))
  const ok = window.confirm(
    t(
      `确认批量解绑 ${targets.length} 个角色会话吗？不会删除主通讯录档案。`,
      `Unbind ${targets.length} role chats? Main profiles will be kept.`,
    ),
  )
  if (!ok) return

  let successCount = 0
  targets.forEach((contact) => {
    if (chatStore.unbindRoleContact(contact.id)) successCount += 1
  })

  clearSelection()
  alert(
    t(
      `已解绑 ${successCount} 个角色会话。`,
      `Unbound ${successCount} role chats.`,
    ),
  )
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

const batchDeleteSelectedServices = () => {
  if (selectedServiceCount.value <= 0) {
    alert(t('请先选择要删除的服务对象。', 'Select service entries to delete first.'))
    return
  }

  const targets = filteredServiceContacts.value.filter((contact) => isContactSelected(contact.id))
  const ok = window.confirm(
    t(
      `确认批量删除 ${targets.length} 个服务会话对象吗？`,
      `Delete ${targets.length} service chat entries?`,
    ),
  )
  if (!ok) return

  let successCount = 0
  targets.forEach((contact) => {
    if (chatStore.removeContact(contact.id)) successCount += 1
  })

  clearSelection()
  alert(
    t(
      `已删除 ${successCount} 个服务会话对象。`,
      `Deleted ${successCount} service chat entries.`,
    ),
  )
}

const roleTypeTag = (profile) => (profile?.isMain ? t('主角色', 'Main') : t('NPC', 'NPC'))

const serviceKindTag = (contact) =>
  contact.kind === 'official' ? t('公众号', 'Official') : t('服务号', 'Service')

const roleTemplateLabel = (preset) => t(preset?.titleCn || '', preset?.titleEn || '')
const roleTemplateNote = (preset) => t(preset?.relationshipNoteCn || '', preset?.relationshipNoteEn || '')
const servicePresetName = (preset) => t(preset?.nameCn || '', preset?.nameEn || '')
const servicePresetTemplate = (preset) => t(preset?.templateCn || '', preset?.templateEn || '')
const servicePresetBio = (preset) => t(preset?.bioCn || '', preset?.bioEn || '')

const getRoleTemplateById = (templateId) =>
  roleMetaTemplatePresets.find((preset) => preset.id === templateId) || null

const getServiceTemplateById = (templateId) =>
  serviceTemplatePresets.find((preset) => preset.id === templateId) || null

const applyRoleTemplateToDraft = (templateId = selectedRoleTemplateId.value) => {
  const template = getRoleTemplateById(templateId)
  if (!template) return
  roleMetaDraft.relationshipLevel = template.relationshipLevel
  roleMetaDraft.relationshipNote = roleTemplateNote(template)
}

const applyRoleTemplateToSelected = () => {
  if (selectedRoleCount.value <= 0) {
    alert(t('请先选择要套用模板的角色会话。', 'Select role chats before applying a template.'))
    return
  }
  const template = getRoleTemplateById(selectedRoleTemplateId.value)
  if (!template) {
    alert(t('请选择关系模板。', 'Please select a relationship template.'))
    return
  }

  const targets = filteredRoleBindings.value.filter((contact) => isContactSelected(contact.id))
  if (targets.length === 0) {
    alert(t('当前筛选中没有可套用模板的目标。', 'No selected targets under current filter.'))
    return
  }

  const ok = window.confirm(
    t(
      `确认将模板「${roleTemplateLabel(template)}」批量应用到 ${targets.length} 个角色会话吗？`,
      `Apply template "${roleTemplateLabel(template)}" to ${targets.length} role chats?`,
    ),
  )
  if (!ok) return

  let successCount = 0
  targets.forEach((contact) => {
    const applied = chatStore.updateRoleBindingMeta(contact.id, {
      relationshipLevel: template.relationshipLevel,
      relationshipNote: roleTemplateNote(template),
    })
    if (applied) successCount += 1
  })

  alert(
    t(
      `已应用模板到 ${successCount} 个角色会话。`,
      `Applied template to ${successCount} role chats.`,
    ),
  )
}

const openCreateServiceFromPreset = (templateId) => {
  const template = getServiceTemplateById(templateId)
  if (!template) return

  openCreateService(template.kind)
  serviceDraft.name = servicePresetName(template)
  serviceDraft.template = servicePresetTemplate(template)
  serviceDraft.bio = servicePresetBio(template)
}

const applyServicePresetToSelected = () => {
  if (selectedServiceCount.value <= 0) {
    alert(t('请先选择要套用模板的服务对象。', 'Select service entries before applying a template.'))
    return
  }
  const template = getServiceTemplateById(selectedServiceTemplateId.value)
  if (!template) {
    alert(t('请选择服务模板。', 'Please select a service template.'))
    return
  }

  const targets = filteredServiceContacts.value.filter(
    (contact) => isContactSelected(contact.id) && contact.kind === template.kind,
  )
  if (targets.length === 0) {
    alert(
      t(
        '当前选择中没有与模板类型匹配的服务对象。',
        'No selected entries match this template type.',
      ),
    )
    return
  }

  const ok = window.confirm(
    t(
      `确认将模板「${servicePresetTemplate(template)}」批量应用到 ${targets.length} 个服务对象吗？`,
      `Apply template "${servicePresetTemplate(template)}" to ${targets.length} service entries?`,
    ),
  )
  if (!ok) return

  let successCount = 0
  targets.forEach((contact) => {
    const applied = chatStore.updateContact(contact.id, {
      serviceTemplate: servicePresetTemplate(template),
      bio: servicePresetBio(template),
    })
    if (applied) successCount += 1
  })

  alert(
    t(
      `已应用模板到 ${successCount} 个服务对象。`,
      `Applied template to ${successCount} service entries.`,
    ),
  )
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

    <div class="px-4 py-3 bg-white border-b border-gray-100 space-y-2">
      <div class="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
        <i class="fas fa-search text-xs text-gray-400"></i>
        <input
          v-model="searchKeyword"
          type="text"
          :placeholder="searchPlaceholder"
          class="flex-1 bg-transparent text-sm outline-none"
        />
        <button
          v-if="searchKeyword"
          @click="searchKeyword = ''"
          class="text-[11px] text-gray-500 hover:text-gray-700"
        >
          {{ t('清空', 'Clear') }}
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in activeSection === 'roles' ? roleFilterOptions : serviceFilterOptions"
          :key="`${activeSection}-${option.key}`"
          @click="activeSection === 'roles' ? (roleFilter = option.key) : (serviceFilter = option.key)"
          class="px-2.5 py-1 rounded-full text-[11px] border"
          :class="
            (activeSection === 'roles' ? roleFilter : serviceFilter) === option.key
              ? activeSection === 'roles'
                ? 'border-violet-300 bg-violet-50 text-violet-700'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-white text-gray-600'
          "
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <section v-if="activeSection === 'roles'" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-gray-500 uppercase">{{ t('已绑定角色', 'Bound Roles') }}</h3>
          <div class="flex items-center gap-2">
            <button
              @click="openBindModal"
              class="px-2.5 py-1 rounded-md border border-violet-200 bg-violet-50 text-violet-700 text-xs"
            >
              {{ t('绑定角色', 'Bind Role') }}
            </button>
            <button
              @click="toggleBatchMode"
              class="px-2.5 py-1 rounded-md border text-xs"
              :class="
                batchMode
                  ? 'border-gray-300 bg-gray-100 text-gray-700'
                  : 'border-gray-200 bg-white text-gray-700'
              "
            >
              {{ batchMode ? t('退出批量', 'Exit Batch') : t('批量操作', 'Batch') }}
            </button>
          </div>
        </div>

        <p v-if="roleBindings.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('暂无已绑定角色。', 'No role bindings yet.') }}
        </p>
        <p v-else-if="filteredRoleBindings.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('当前筛选下没有匹配角色。', 'No role matches current filter.') }}
        </p>
        <div v-if="batchMode" class="rounded-xl border border-violet-100 bg-violet-50/50 p-3 space-y-2">
          <p class="text-xs text-violet-700 font-medium">
            {{ t('批量模式已开启，点击列表项可勾选。', 'Batch mode enabled. Tap items to select.') }}
          </p>
          <p class="text-xs text-violet-700">
            {{ t('已选', 'Selected') }} {{ selectedRoleCount }} {{ t('项', 'items') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              @click="toggleSelectAllFiltered"
              class="px-2.5 py-1 rounded border border-violet-200 bg-white text-violet-700 text-[11px]"
            >
              {{ allFilteredSelected ? t('取消全选', 'Unselect All') : t('全选筛选结果', 'Select All') }}
            </button>
            <button
              @click="clearSelection"
              class="px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 text-[11px]"
              :disabled="selectedCountCurrentSection === 0"
            >
              {{ t('清空选择', 'Clear Selection') }}
            </button>
            <button
              @click="batchUnbindSelectedRoles"
              class="px-2.5 py-1 rounded border border-red-200 bg-red-50 text-red-600 text-[11px]"
              :disabled="selectedRoleCount === 0"
            >
              {{ t('批量解绑', 'Batch Unbind') }}
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select
              v-model="selectedRoleTemplateId"
              class="rounded border border-violet-200 bg-white px-2 py-1 text-[11px] text-violet-700 outline-none"
            >
              <option
                v-for="preset in roleMetaTemplatePresets"
                :key="`role-template-${preset.id}`"
                :value="preset.id"
              >
                {{ roleTemplateLabel(preset) }}
              </option>
            </select>
            <button
              @click="applyRoleTemplateToSelected"
              class="px-2.5 py-1 rounded border border-violet-200 bg-white text-violet-700 text-[11px]"
              :disabled="selectedRoleCount === 0"
            >
              {{ t('批量套用模板', 'Apply Template') }}
            </button>
          </div>
        </div>

        <div
          v-for="contact in filteredRoleBindings"
          :key="contact.id"
          class="rounded-2xl border p-3 flex items-center gap-3"
          :class="
            batchMode
              ? isContactSelected(contact.id)
                ? 'bg-violet-50 border-violet-300 cursor-pointer'
                : 'bg-white border-violet-100 cursor-pointer'
              : 'bg-white border-gray-100'
          "
          @click="batchMode && toggleSelectContact(contact.id)"
        >
          <button
            v-if="batchMode"
            type="button"
            class="w-5 h-5 rounded border flex items-center justify-center text-[10px]"
            :class="
              isContactSelected(contact.id)
                ? 'border-violet-400 bg-violet-500 text-white'
                : 'border-gray-300 bg-white text-transparent'
            "
            @click.stop="toggleSelectContact(contact.id)"
          >
            <i class="fas fa-check"></i>
          </button>
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
          <template v-if="!batchMode">
            <button @click="openChat(contact)" class="text-xs text-blue-600">{{ t('聊天', 'Chat') }}</button>
            <button @click="openRoleMetaModal(contact)" class="text-xs text-gray-500">{{ t('会话设定', 'Thread Meta') }}</button>
            <button @click="unbindRole(contact)" class="text-xs text-red-500">{{ t('解绑', 'Unbind') }}</button>
          </template>
        </div>

        <div class="rounded-xl bg-white border border-gray-100 p-3">
          <div class="flex items-center justify-between gap-2 mb-2">
            <p class="text-xs font-semibold text-gray-600">{{ t('可绑定角色档案', 'Available Profiles') }}</p>
            <button
              v-if="batchMode"
              @click="batchBindFilteredProfiles"
              class="px-2 py-1 rounded border border-violet-200 bg-violet-50 text-violet-700 text-[11px]"
            >
              {{ t('批量绑定筛选结果', 'Batch Bind Filtered') }}
            </button>
          </div>
          <p v-if="unboundRoleProfilesRaw.length === 0" class="text-xs text-gray-400">
            {{ t('全部角色已绑定到会话。', 'All profiles are already bound.') }}
          </p>
          <p v-else-if="filteredUnboundRoleProfiles.length === 0" class="text-xs text-gray-400">
            {{ t('可绑定角色中暂无匹配结果。', 'No available profile matches current filter.') }}
          </p>
          <div v-else class="space-y-1.5">
            <div
              v-for="profile in filteredUnboundRoleProfiles"
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
            <button
              @click="toggleBatchMode"
              class="px-2.5 py-1 rounded-md border text-xs"
              :class="
                batchMode
                  ? 'border-gray-300 bg-gray-100 text-gray-700'
                  : 'border-gray-200 bg-white text-gray-700'
              "
            >
              {{ batchMode ? t('退出批量', 'Exit Batch') : t('批量操作', 'Batch') }}
            </button>
          </div>
        </div>

        <p v-if="serviceContacts.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('暂无服务号或公众号。', 'No service or official accounts yet.') }}
        </p>
        <p v-else-if="filteredServiceContacts.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('当前筛选下没有匹配服务对象。', 'No service entry matches current filter.') }}
        </p>
        <div v-if="batchMode" class="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-2">
          <p class="text-xs text-emerald-700 font-medium">
            {{ t('批量模式已开启，点击列表项可勾选。', 'Batch mode enabled. Tap items to select.') }}
          </p>
          <p class="text-xs text-emerald-700">
            {{ t('已选', 'Selected') }} {{ selectedServiceCount }} {{ t('项', 'items') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              @click="toggleSelectAllFiltered"
              class="px-2.5 py-1 rounded border border-emerald-200 bg-white text-emerald-700 text-[11px]"
            >
              {{ allFilteredSelected ? t('取消全选', 'Unselect All') : t('全选筛选结果', 'Select All') }}
            </button>
            <button
              @click="clearSelection"
              class="px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 text-[11px]"
              :disabled="selectedCountCurrentSection === 0"
            >
              {{ t('清空选择', 'Clear Selection') }}
            </button>
            <button
              @click="batchDeleteSelectedServices"
              class="px-2.5 py-1 rounded border border-red-200 bg-red-50 text-red-600 text-[11px]"
              :disabled="selectedServiceCount === 0"
            >
              {{ t('批量删除', 'Batch Delete') }}
            </button>
          </div>
        </div>

        <div class="rounded-xl border border-emerald-100 bg-white p-3 space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs font-semibold text-emerald-700">
              {{ t('模板预设中心', 'Template Preset Center') }}
            </p>
            <div class="flex flex-wrap items-center gap-2" v-if="batchMode">
              <select
                v-model="selectedServiceTemplateId"
                class="rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] text-emerald-700 outline-none"
              >
                <option
                  v-for="preset in serviceTemplatePresets"
                  :key="`service-template-${preset.id}`"
                  :value="preset.id"
                >
                  {{ servicePresetTemplate(preset) }} · {{ preset.kind === 'official' ? t('公众号', 'Official') : t('服务号', 'Service') }}
                </option>
              </select>
              <button
                @click="applyServicePresetToSelected"
                class="px-2.5 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px]"
                :disabled="selectedServiceCount === 0"
              >
                {{ t('批量套用模板', 'Apply Template') }}
              </button>
            </div>
          </div>
          <div class="grid gap-2">
            <div
              v-for="preset in serviceTemplatePresets"
              :key="`service-preset-card-${preset.id}`"
              class="rounded-lg border border-emerald-100 bg-emerald-50/40 px-2.5 py-2 flex items-center justify-between gap-2"
            >
              <div class="min-w-0">
                <p class="text-xs font-medium text-emerald-800 truncate">
                  {{ servicePresetName(preset) }} · {{ preset.kind === 'official' ? t('公众号', 'Official') : t('服务号', 'Service') }}
                </p>
                <p class="text-[11px] text-emerald-700 truncate">
                  {{ servicePresetTemplate(preset) }}
                </p>
              </div>
              <button
                @click="openCreateServiceFromPreset(preset.id)"
                class="px-2 py-1 rounded border border-emerald-200 bg-white text-emerald-700 text-[11px]"
              >
                {{ t('按模板新建', 'Create from Preset') }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-for="contact in filteredServiceContacts"
          :key="contact.id"
          class="rounded-2xl border p-3 flex items-center gap-3"
          :class="
            batchMode
              ? isContactSelected(contact.id)
                ? 'bg-emerald-50 border-emerald-300 cursor-pointer'
                : 'bg-white border-emerald-100 cursor-pointer'
              : 'bg-white border-gray-100'
          "
          @click="batchMode && toggleSelectContact(contact.id)"
        >
          <button
            v-if="batchMode"
            type="button"
            class="w-5 h-5 rounded border flex items-center justify-center text-[10px]"
            :class="
              isContactSelected(contact.id)
                ? 'border-emerald-400 bg-emerald-500 text-white'
                : 'border-gray-300 bg-white text-transparent'
            "
            @click.stop="toggleSelectContact(contact.id)"
          >
            <i class="fas fa-check"></i>
          </button>
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
          <template v-if="!batchMode">
            <button @click="openChat(contact)" class="text-xs text-blue-600">{{ t('聊天', 'Chat') }}</button>
            <button @click="openEditService(contact)" class="text-xs text-gray-500">{{ t('编辑', 'Edit') }}</button>
            <button @click="removeService(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
          </template>
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
          <option v-for="profile in unboundRoleProfilesRaw" :key="profile.id" :value="profile.id">
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
        <div class="space-y-1">
          <p class="text-xs text-gray-500">{{ t('快捷关系模板', 'Quick Relationship Templates') }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in roleMetaTemplatePresets"
              :key="`modal-role-template-${preset.id}`"
              @click="applyRoleTemplateToDraft(preset.id)"
              class="px-2.5 py-1 rounded border border-violet-200 bg-violet-50 text-violet-700 text-[11px]"
            >
              {{ roleTemplateLabel(preset) }}
            </button>
          </div>
        </div>
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
