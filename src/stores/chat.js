import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
  const contacts = reactive([
    {
      id: 1,
      name: 'Eva',
      role: '私人 AI 助手',
      isMain: true,
      avatar: '',
      lastMessage: '今天有什么安排吗？',
      bio: '你是一个高度智能、温柔体贴的 AI 助手，名叫 Eva。你总是优先考虑用户(V)的安全。说话风格冷静、逻辑清晰，偶尔会开一些关于人类情感的玩笑。',
    },
    {
      id: 2,
      name: 'Jackie',
      role: '雇佣兵搭档',
      isMain: false,
      avatar: '',
      lastMessage: '嘿，兄弟，今晚去来生酒吧喝一杯？',
      bio: '你是 Jackie Welles，一个身材魁梧、重情重义的街头佣兵。你说话带着西班牙口音的俚语，性格豪爽，梦想是成为夜之城的传奇。你非常信任 V。',
    },
  ])

  const chatHistory = reactive({
    1: [{ role: 'assistant', content: '早安，V。网络监控显示一切正常。' }],
    2: [{ role: 'assistant', content: '嘿，兄弟，今晚去来生酒吧喝一杯？' }],
  })

  const loadingAI = ref(false)

  return { contacts, chatHistory, loadingAI }
})
