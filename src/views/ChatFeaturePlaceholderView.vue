<script setup>
import { computed, reactive, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { useI18n } from '../composables/useI18n'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const { contactsForList } = storeToRefs(chatStore)
const { t } = useI18n()

const featureMeta = computed(() => {
  const id = typeof route.params.feature === 'string' ? route.params.feature.trim() : ''
  if (id === 'preferences') {
    return {
      id,
      title: t('聊天偏好', 'Chat Preferences'),
      description: t(
        '占位页：后续用于集中管理聊天皮肤、签名、会话体验偏好等。',
        'Placeholder: this will host chat skin, signature, and conversation experience preferences.',
      ),
      icon: 'fas fa-sliders',
    }
  }
  if (id === 'identity') {
    return {
      id,
      title: t('身份与头像', 'Identity & Avatar'),
      description: t(
        '这里可配置 Chat 模块级身份头像覆写；会话级覆写请在具体会话菜单中设置。',
        'Configure module-level identity avatar overrides here. Thread-level overrides are in each chat menu.',
      ),
      icon: 'fas fa-user-secret',
    }
  }
  if (id === 'labs') {
    return {
      id,
      title: t('聊天实验室', 'Chat Labs'),
      description: t(
        '占位页：后续用于聊天新能力灰度开关与实验功能入口。',
        'Placeholder: this will host staged rollout toggles and experimental chat features.',
      ),
      icon: 'fas fa-flask',
    }
  }
  return {
    id: id || 'unknown',
    title: t('功能占位', 'Feature Placeholder'),
    description: t(
      '该功能位已预留，后续将接入具体能力。',
      'This feature slot is reserved and will be connected to real capabilities later.',
    ),
    icon: 'fas fa-puzzle-piece',
  }
})

const isIdentityFeature = computed(() => featureMeta.value.id === 'identity')
const contacts = computed(() => contactsForList.value || [])

const moduleAvatarDraft = reactive({
  selfAvatar: '',
  defaultContactAvatar: '',
})

const contactOverrideDrafts = reactive({})

const syncIdentityDraft = () => {
  const moduleOverrides = chatStore.getModuleAvatarOverrides()
  moduleAvatarDraft.selfAvatar = moduleOverrides.selfAvatar || ''
  moduleAvatarDraft.defaultContactAvatar = moduleOverrides.defaultContactAvatar || ''

  Object.keys(contactOverrideDrafts).forEach((key) => {
    delete contactOverrideDrafts[key]
  })
}

watch(
  () => featureMeta.value.id,
  (id) => {
    if (id !== 'identity') return
    syncIdentityDraft()
  },
  { immediate: true },
)

const goBack = () => {
  router.push('/chat')
}

const openThread = (contactId) => {
  const id = Number(contactId)
  if (!Number.isFinite(id) || id <= 0) return
  router.push(`/chat/${id}`)
}

const saveModuleOverrides = () => {
  const changed = chatStore.setModuleAvatarOverrides({
    selfAvatar: moduleAvatarDraft.selfAvatar,
    defaultContactAvatar: moduleAvatarDraft.defaultContactAvatar,
  })
  if (changed) chatStore.saveNow()
}

const draftKey = (contactId) => String(Number(contactId) || 0)

const moduleContactOverrideInputValue = (contactId) => {
  const key = draftKey(contactId)
  if (!Object.prototype.hasOwnProperty.call(contactOverrideDrafts, key)) {
    contactOverrideDrafts[key] = chatStore.getModuleContactAvatarOverride(contactId) || ''
  }
  return contactOverrideDrafts[key] || ''
}

const updateModuleContactOverrideInput = (contactId, event) => {
  const key = draftKey(contactId)
  const nextValue =
    event?.target && typeof event.target.value === 'string' ? event.target.value : ''
  contactOverrideDrafts[key] = nextValue
}

const saveModuleContactOverride = (contactId) => {
  const key = draftKey(contactId)
  const changed = chatStore.setModuleContactAvatarOverride(contactId, contactOverrideDrafts[key] || '')
  if (changed) chatStore.saveNow()
}

const clearModuleContactOverride = (contactId) => {
  const key = draftKey(contactId)
  contactOverrideDrafts[key] = ''
  const changed = chatStore.setModuleContactAvatarOverride(contactId, '')
  if (changed) chatStore.saveNow()
}
</script>

<template>
  <div class="w-full h-full bg-[#f2f2f7] text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center gap-3">
      <button @click="goBack" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('聊天', 'Chat') }}
      </button>
      <h1 class="font-bold text-xl">{{ featureMeta.title }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
      <div class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold flex items-center gap-2">
          <i :class="featureMeta.icon"></i>
          {{ featureMeta.title }}
        </p>
        <p class="mt-2 text-xs text-gray-500">{{ featureMeta.description }}</p>
      </div>

      <template v-if="isIdentityFeature">
        <div class="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
          <p class="text-sm font-semibold text-gray-900">{{ t('模块级覆写', 'Module-level overrides') }}</p>
          <label class="block space-y-1">
            <span class="text-[11px] text-gray-500">{{ t('我的头像（模块级）', 'My avatar (module-level)') }}</span>
            <input
              v-model="moduleAvatarDraft.selfAvatar"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
              placeholder="https://..."
            />
          </label>
          <label class="block space-y-1">
            <span class="text-[11px] text-gray-500">{{ t('默认对方头像（模块级）', 'Default contact avatar (module-level)') }}</span>
            <input
              v-model="moduleAvatarDraft.defaultContactAvatar"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
              placeholder="https://..."
            />
          </label>
          <p class="text-[10px] text-gray-400">
            {{ t('优先级：会话 > 模块 > 全局 > 默认。', 'Priority: thread > module > global > fallback.') }}
          </p>
          <div class="flex justify-end gap-2 pt-1">
            <button
              @click="moduleAvatarDraft.selfAvatar = ''; moduleAvatarDraft.defaultContactAvatar = ''"
              class="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600"
            >
              {{ t('清空', 'Clear') }}
            </button>
            <button
              @click="saveModuleOverrides"
              class="px-2.5 py-1 rounded-lg border border-violet-200 bg-violet-50 text-violet-700"
            >
              {{ t('保存模块覆写', 'Save module overrides') }}
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-gray-900">{{ t('按联系人覆写（模块级）', 'Per-contact overrides (module-level)') }}</p>
            <p class="text-[11px] text-gray-400">{{ t('会话级请在聊天内设置', 'Use chat menu for thread-level') }}</p>
          </div>

          <div v-if="contacts.length === 0" class="text-xs text-gray-400 py-2">
            {{ t('暂无联系人。', 'No contacts yet.') }}
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="contact in contacts"
              :key="contact.id"
              class="rounded-xl border border-gray-100 bg-white p-2.5 space-y-2"
            >
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg overflow-hidden bg-gray-200">
                  <img :src="chatStore.resolveContactAvatar(contact.id)" class="w-full h-full object-cover" />
                </div>
                <p class="text-sm font-medium truncate flex-1">{{ contact.name }}</p>
                <button
                  @click="openThread(contact.id)"
                  class="px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 text-[11px]"
                >
                  {{ t('进会话设置', 'Open thread') }}
                </button>
              </div>

              <input
                :value="moduleContactOverrideInputValue(contact.id)"
                @input="updateModuleContactOverrideInput(contact.id, $event)"
                type="text"
                class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
                placeholder="https://..."
              />

              <div class="flex justify-end gap-2">
                <button
                  @click="clearModuleContactOverride(contact.id)"
                  class="px-2 py-1 rounded border border-gray-200 text-gray-600 text-[11px]"
                >
                  {{ t('清除该联系人覆写', 'Clear override') }}
                </button>
                <button
                  @click="saveModuleContactOverride(contact.id)"
                  class="px-2 py-1 rounded border border-violet-200 bg-violet-50 text-violet-700 text-[11px]"
                >
                  {{ t('保存', 'Save') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

