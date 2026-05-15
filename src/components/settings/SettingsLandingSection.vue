<script setup>
import { useI18n } from '../../composables/useI18n'
import SettingsMenuItem from './SettingsMenuItem.vue'
import SettingsQuickAccessButton from './SettingsQuickAccessButton.vue'

defineProps({
  user: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits([
  'open-profile',
  'open-worldbook',
  'open-general',
  'open-automation',
  'open-notification',
  'open-network',
  'open-chat-settings',
  'open-appearance',
])

const { t } = useI18n()
</script>

<template>
  <button
    class="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm text-left"
    data-testid="settings-profile-entry"
    @click="emit('open-profile')"
  >
    <div class="w-14 h-14 rounded-full bg-gray-300 overflow-hidden">
      <img
        :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.name"
        :alt="user.name || t('用户头像', 'User avatar')"
        class="w-full h-full object-cover"
      />
    </div>
    <div class="flex-1">
      <h2 class="text-lg font-semibold">{{ user.name || t('未命名用户', 'Unnamed User') }}</h2>
      <p class="text-xs text-gray-500">{{ t('Apple ID、头像与基础人设', 'Apple ID, avatar and profile basics') }}</p>
    </div>
    <i class="fas fa-chevron-right text-gray-300"></i>
  </button>

  <div class="bg-blue-50 border border-blue-100 rounded-2xl p-3.5" data-testid="settings-beginner-tip">
    <p class="text-[11px] font-semibold text-blue-700">{{ t('新手建议', 'Beginner tip') }}</p>
    <p class="text-[11px] text-blue-700/90 mt-1">
      {{
        t(
          '推荐顺序：先配置“网络与 API”，再进入会话手动触发回复，最后按需要开启自动响应。',
          'Recommended flow: set up Network & API first, then use manual trigger in chat, and enable automation only when needed.',
        )
      }}
    </p>
  </div>

  <div class="px-1 text-[11px] text-gray-500 font-medium">{{ t('快捷入口', 'Quick Access') }}</div>
  <div class="grid grid-cols-3 gap-2">
    <SettingsQuickAccessButton
      title-zh="网络与 API"
      title-en="Network & API"
      subtitle-zh="配置接口"
      subtitle-en="Configure provider"
      @select="emit('open-network')"
    />
    <SettingsQuickAccessButton
      title-zh="会话设置"
      title-en="Chat settings"
      subtitle-zh="角色与会话"
      subtitle-en="Roles and threads"
      @select="emit('open-chat-settings')"
    />
    <SettingsQuickAccessButton
      title-zh="外观工坊"
      title-en="Appearance"
      subtitle-zh="主题与壁纸"
      subtitle-en="Theme and wallpaper"
      @select="emit('open-appearance')"
    />
  </div>

  <div class="px-1 text-[11px] text-gray-500 font-medium">{{ t('内容设置', 'Content Settings') }}</div>
  <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
    <SettingsMenuItem
      title-zh="世界书"
      title-en="World Book"
      subtitle-zh="所有对话共享的世界设定"
      subtitle-en="Shared context for all chats"
      icon="fas fa-book-open"
      icon-class="bg-purple-500"
      @select="emit('open-worldbook')"
    />
    <SettingsMenuItem
      title-zh="通用"
      title-en="General"
      subtitle-zh="系统语言、时区等基础项"
      subtitle-en="Language, timezone and basic system options"
      icon="fas fa-sliders"
      icon-class="bg-gray-600"
      @select="emit('open-general')"
    />
    <SettingsMenuItem
      title-zh="AI 自动响应"
      title-en="AI Automation"
      subtitle-zh="总开关、优先级、安静时段"
      subtitle-en="Master switch, priorities and quiet hours"
      icon="fas fa-robot"
      icon-class="bg-indigo-500"
      @select="emit('open-automation')"
    />
    <SettingsMenuItem
      title-zh="通知"
      title-en="Notifications"
      subtitle-zh="消息提醒与系统提示"
      subtitle-en="Message alerts and system notifications"
      icon="fas fa-bell"
      icon-class="bg-red-500"
      :with-border="false"
      @select="emit('open-notification')"
    />
  </div>
</template>
