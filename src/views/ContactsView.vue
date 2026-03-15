<script setup>
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { callAI } from '../lib/ai'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const { t } = useI18n()

const { user, settings } = storeToRefs(systemStore)
const { roleProfiles, loadingAI } = storeToRefs(chatStore)

const showProfileModal = ref(false)
const profileModalMode = ref('create')
const editingProfileId = ref(0)
const profileDraft = reactive({ name: '', role: '', isMain: false, bio: '' })
const mainProfiles = computed(() => roleProfiles.value.filter((item) => Boolean(item.isMain)))
const npcProfiles = computed(() => roleProfiles.value.filter((item) => !item.isMain))

const goHome = () => {
  router.push('/home')
}

const resetProfileDraft = () => {
  profileDraft.name = ''
  profileDraft.role = ''
  profileDraft.bio = ''
  profileDraft.isMain = false
}

const openCreateProfile = () => {
  profileModalMode.value = 'create'
  editingProfileId.value = 0
  resetProfileDraft()
  showProfileModal.value = true
}

const openEditProfile = (profile) => {
  if (!profile) return
  profileModalMode.value = 'edit'
  editingProfileId.value = Number(profile.id) || 0
  profileDraft.name = profile.name || ''
  profileDraft.role = profile.role || ''
  profileDraft.bio = profile.bio || ''
  profileDraft.isMain = Boolean(profile.isMain)
  showProfileModal.value = true
}

const closeProfileModal = () => {
  showProfileModal.value = false
  editingProfileId.value = 0
}

const saveProfile = () => {
  const name = profileDraft.name.trim()
  if (!name) {
    alert(t('请填写角色名称。', 'Please enter a profile name.'))
    return
  }

  const payload = {
    name,
    role: profileDraft.role,
    isMain: profileDraft.isMain,
    bio: profileDraft.bio,
  }

  if (profileModalMode.value === 'create') {
    chatStore.addRoleProfile({
      ...payload,
      avatar: '',
    })
    closeProfileModal()
    return
  }

  if (!editingProfileId.value) return
  const ok = chatStore.updateRoleProfile(editingProfileId.value, payload)
  if (!ok) {
    alert(t('保存失败，请重试。', 'Save failed, please retry.'))
    return
  }
  closeProfileModal()
}

const removeProfile = (profile) => {
  if (!profile?.id) return
  const boundHint = chatStore.isRoleProfileBound(profile.id)
    ? t('该角色已绑定会话，删除后会同时移除会话侧绑定。', 'This profile is bound to chat entries. Deleting it will remove those bindings too.')
    : t('删除后不可恢复。', 'This action cannot be undone.')
  const ok = window.confirm(
    `${t('确认删除角色档案', 'Delete role profile')}「${profile.name || ''}」？\n${boundHint}`,
  )
  if (!ok) return
  chatStore.removeRoleProfile(profile.id, { removeBindings: true })
}

const autoGenerateProfile = async () => {
  if (!profileDraft.name) {
    alert(t('请至少输入一个名字！', 'Please enter at least one name.'))
    return
  }

  loadingAI.value = true
  const prompt = `我想要添加一个名为“${profileDraft.name}”的角色。
职业/身份倾向: ${profileDraft.role || '随机有趣的角色'}。
请生成 JSON 格式: {"role": "简短职业", "bio": "详细性格描述"}。只返回 JSON。`

  try {
    const text = await callAI({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: 'You are a creative writer helper.',
      settings: settings.value,
    })
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(cleanText)

    profileDraft.role = data.role
    profileDraft.bio = data.bio
  } catch (error) {
    alert(`${t('生成失败', 'Generation failed')}: ${error.message}`)
  } finally {
    loadingAI.value = false
  }
}
</script>

<template>
  <div class="w-full h-full bg-white flex flex-col">
    <div class="pt-12 pb-2 px-4 flex justify-between items-center border-b">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> 首页
      </button>
      <span class="font-bold">联系人</span>
      <button @click="openCreateProfile" class="text-blue-500 text-xl"><i class="fas fa-plus"></i></button>
    </div>

    <div v-if="showProfileModal" class="absolute inset-0 bg-white z-20 pt-12 px-4 flex flex-col animate-slide-in">
      <div class="flex justify-between mb-6">
        <button @click="closeProfileModal" class="text-blue-500">{{ t('取消', 'Cancel') }}</button>
        <span class="font-bold">
          {{ profileModalMode === 'create' ? t('新建角色档案', 'Create Role Profile') : t('编辑角色档案', 'Edit Role Profile') }}
        </span>
        <button @click="saveProfile" class="text-blue-500 font-bold">
          {{ profileModalMode === 'create' ? t('创建', 'Create') : t('保存', 'Save') }}
        </button>
      </div>
      <div class="flex flex-col items-center mb-6 relative">
        <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-3xl mb-2 overflow-hidden shadow-inner">
          <img
            v-if="profileDraft.name"
            :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${profileDraft.name}`"
            class="w-full h-full object-cover"
          />
          <i v-else class="fas fa-camera"></i>
        </div>
        <span class="text-blue-500 text-sm">输入名字自动生成头像</span>
      </div>
      <div class="space-y-4">
        <input
          v-model="profileDraft.name"
          placeholder="名字 / 昵称 (例如: 赛博侦探)"
          class="w-full border-b py-2 outline-none"
        />
        <div class="flex gap-2">
          <input v-model="profileDraft.role" placeholder="职业 / 身份" class="flex-1 border-b py-2 outline-none" />
          <button
            @click="autoGenerateProfile"
            class="bg-purple-100 text-purple-600 px-3 rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <i class="fas fa-magic"></i>
            {{ loadingAI ? '生成中...' : 'AI 补全人设' }}
          </button>
        </div>

        <div class="bg-gray-50 p-2 rounded-lg mt-2">
          <label class="text-[10px] text-gray-400 uppercase font-bold">{{ t('详细人设', 'Detailed Prompt') }}</label>
          <textarea
            v-model="profileDraft.bio"
            class="w-full bg-transparent text-xs h-20 outline-none resize-none mt-1"
            placeholder="点击上方 AI 补全按钮，或手动输入..."
          ></textarea>
        </div>

        <div class="flex items-center justify-between border-b py-2">
          <span>类型</span>
          <div class="flex gap-2">
            <button
              @click="profileDraft.isMain = true"
              :class="profileDraft.isMain ? 'bg-blue-500 text-white' : 'bg-gray-200'"
              class="px-3 py-1 rounded text-xs"
            >
              主角
            </button>
            <button
              @click="profileDraft.isMain = false"
              :class="!profileDraft.isMain ? 'bg-blue-500 text-white' : 'bg-gray-200'"
              class="px-3 py-1 rounded text-xs"
            >
              NPC
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar">
      <div class="px-4 py-2">
        <div class="bg-gray-100 rounded-lg px-3 py-1.5 flex items-center text-gray-500 text-sm">
          <i class="fas fa-search mr-2"></i> 搜索
        </div>
      </div>

      <div class="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <div class="w-14 h-14 rounded-full bg-gray-300 overflow-hidden">
          <img
            :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-col flex">
          <span class="font-bold text-lg">{{ user.name }}</span>
          <span class="text-xs text-gray-400">我的名片</span>
        </div>
      </div>

      <div class="px-4 py-2">
        <div class="text-xs font-bold text-gray-500 mb-2">{{ t('我的 AI（主角色）', 'My AI (Main)') }}</div>
        <div
          v-for="contact in mainProfiles"
          :key="contact.id"
          class="flex items-center gap-3 py-2 border-b border-gray-50"
        >
          <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img
              :src="contact.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.name"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ contact.name }}</p>
            <p class="text-[11px] text-gray-400 truncate">{{ contact.role || t('未设置角色', 'Role not set') }}</p>
          </div>
          <button @click="openEditProfile(contact)" class="text-xs text-blue-500">{{ t('编辑', 'Edit') }}</button>
          <button @click="removeProfile(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
        </div>

        <div class="text-xs font-bold text-gray-500 mt-4 mb-2">{{ t('其他联系人（NPC）', 'Other Contacts (NPC)') }}</div>
        <div
          v-for="contact in npcProfiles"
          :key="contact.id"
          class="flex items-center gap-3 py-2 border-b border-gray-50"
        >
          <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img
              :src="contact.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.name"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ contact.name }}</p>
            <p class="text-[11px] text-gray-400 truncate">{{ contact.role || t('未设置角色', 'Role not set') }}</p>
          </div>
          <button @click="openEditProfile(contact)" class="text-xs text-blue-500">{{ t('编辑', 'Edit') }}</button>
          <button @click="removeProfile(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
