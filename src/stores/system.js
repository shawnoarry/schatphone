import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

export const useSystemStore = defineStore('system', () => {
  const settings = reactive({
    api: {
      provider: 'openai',
      url: 'https://api.openai.com/v1/chat/completions',
      key: '',
      model: 'gpt-3.5-turbo',
    },
    appearance: {
      currentTheme: 'day',
      wallpaper:
        'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
    },
    system: {
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      notifications: true,
    },
  })

  const user = reactive({
    name: 'V',
    bio: '夜之城的自由佣兵。',
    avatar: '',
    worldBook:
      '这是一个赛博朋克风格的近未来世界。科技高度发达但生活水平低劣。大公司控制着一切。霓虹灯闪烁在雨夜中。',
  })

  const notifications = ref([
    {
      id: 1,
      title: '系统',
      content: '系统已升级到 Open API 版本',
      icon: 'fas fa-exclamation-circle',
    },
  ])

  return { settings, user, notifications }
})
