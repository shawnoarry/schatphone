<script setup>
import { reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { callAI } from '../lib/ai'

const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()

const { user, settings } = storeToRefs(systemStore)
const { contacts, loadingAI } = storeToRefs(chatStore)

const addContactMode = ref(false)
const newContact = reactive({ name: '', role: '', isMain: false, bio: '' })

const goHome = () => {
  router.push('/home')
}

const saveNewContact = () => {
  if (!newContact.name.trim()) return
  chatStore.addContact({
    name: newContact.name,
    role: newContact.role,
    isMain: newContact.isMain,
    avatar: '',
    bio: newContact.bio,
    lastMessage: '新添加的联系人',
  })
  addContactMode.value = false
  newContact.name = ''
  newContact.role = ''
  newContact.bio = ''
  newContact.isMain = false
}

const autoGenerateContact = async () => {
  if (!newContact.name) {
    alert('请至少输入一个名字！')
    return
  }

  loadingAI.value = true
  const prompt = `我想要添加一个名为“${newContact.name}”的角色。
职业/身份倾向: ${newContact.role || '随机有趣的角色'}。
请生成 JSON 格式: {"role": "简短职业", "bio": "详细性格描述"}。只返回 JSON。`

  try {
    const text = await callAI({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: 'You are a creative writer helper.',
      settings: settings.value,
    })
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(cleanText)

    newContact.role = data.role
    newContact.bio = data.bio
  } catch (error) {
    alert(`生成失败: ${error.message}`)
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
      <button @click="addContactMode = true" class="text-blue-500 text-xl"><i class="fas fa-plus"></i></button>
    </div>

    <div v-if="addContactMode" class="absolute inset-0 bg-white z-20 pt-12 px-4 flex flex-col animate-slide-in">
      <div class="flex justify-between mb-6">
        <button @click="addContactMode = false" class="text-blue-500">取消</button>
        <span class="font-bold">新建联系人</span>
        <button @click="saveNewContact" class="text-blue-500 font-bold">完成</button>
      </div>
      <div class="flex flex-col items-center mb-6 relative">
        <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-3xl mb-2 overflow-hidden shadow-inner">
          <img
            v-if="newContact.name"
            :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${newContact.name}`"
            class="w-full h-full object-cover"
          />
          <i v-else class="fas fa-camera"></i>
        </div>
        <span class="text-blue-500 text-sm">输入名字自动生成头像</span>
      </div>
      <div class="space-y-4">
        <input v-model="newContact.name" placeholder="名字 / 昵称 (例如: 赛博侦探)" class="w-full border-b py-2 outline-none" />
        <div class="flex gap-2">
          <input v-model="newContact.role" placeholder="职业 / 身份" class="flex-1 border-b py-2 outline-none" />
          <button
            @click="autoGenerateContact"
            class="bg-purple-100 text-purple-600 px-3 rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <i class="fas fa-magic"></i>
            {{ loadingAI ? '生成中...' : 'AI 补全人设' }}
          </button>
        </div>

        <div class="bg-gray-50 p-2 rounded-lg mt-2">
          <label class="text-[10px] text-gray-400 uppercase font-bold">详细人设 (Prompt)</label>
          <textarea
            v-model="newContact.bio"
            class="w-full bg-transparent text-xs h-20 outline-none resize-none mt-1"
            placeholder="点击上方 AI 补全按钮，或手动输入..."
          ></textarea>
        </div>

        <div class="flex items-center justify-between border-b py-2">
          <span>类型</span>
          <div class="flex gap-2">
            <button
              @click="newContact.isMain = true"
              :class="newContact.isMain ? 'bg-blue-500 text-white' : 'bg-gray-200'"
              class="px-3 py-1 rounded text-xs"
            >
              主角
            </button>
            <button
              @click="newContact.isMain = false"
              :class="!newContact.isMain ? 'bg-blue-500 text-white' : 'bg-gray-200'"
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
        <div class="text-xs font-bold text-gray-500 mb-2">我的 AI (Main)</div>
        <div v-for="contact in contacts.filter((item) => item.isMain)" :key="contact.id" class="flex items-center gap-3 py-2 border-b border-gray-50">
          <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img
              :src="contact.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.name"
              class="w-full h-full object-cover"
            />
          </div>
          <span class="font-medium">{{ contact.name }}</span>
        </div>

        <div class="text-xs font-bold text-gray-500 mt-4 mb-2">其他联系人 (NPC)</div>
        <div v-for="contact in contacts.filter((item) => !item.isMain)" :key="contact.id" class="flex items-center gap-3 py-2 border-b border-gray-50">
          <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img
              :src="contact.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.name"
              class="w-full h-full object-cover"
            />
          </div>
          <span class="font-medium">{{ contact.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
