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
  'open-software-update',
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
    type="button"
    class="settings-profile-card w-full p-4 flex items-center gap-4 text-left"
    data-testid="settings-profile-entry"
    @click="emit('open-profile')"
  >
    <div class="settings-profile-avatar w-14 h-14 rounded-full overflow-hidden">
      <img
        :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.name"
        :alt="user.name || t('用户头像', 'User avatar')"
        class="w-full h-full object-cover"
      />
    </div>
    <div class="settings-profile-copy flex-1 min-w-0">
      <h2 class="settings-profile-title text-lg font-semibold">
        {{ user.name || t('未命名用户', 'Unnamed User') }}
      </h2>
      <p class="settings-profile-subtitle text-xs">
        {{ t('Apple ID、头像与基础人设', 'Apple ID, avatar and profile basics') }}
      </p>
    </div>
    <i class="settings-profile-chevron fas fa-chevron-right" aria-hidden="true"></i>
  </button>

  <div class="settings-tip-card rounded-2xl p-3.5" data-testid="settings-beginner-tip">
    <p class="settings-tip-title text-[11px] font-semibold">{{ t('新手建议', 'Beginner tip') }}</p>
    <p class="settings-tip-copy text-[11px] mt-1">
      {{
        t(
          '推荐顺序：先配置“网络与 API”，再进入会话手动触发回复，最后按需要开启自动响应。',
          'Recommended flow: set up Network & API first, then use manual trigger in chat, and enable automation only when needed.',
        )
      }}
    </p>
  </div>

  <div class="settings-section-label px-1 text-[11px] font-medium">
    {{ t('快捷入口', 'Quick Access') }}
  </div>
  <div class="settings-quick-grid grid grid-cols-3 gap-2">
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

  <div class="settings-section-label px-1 text-[11px] font-medium">
    {{ t('内容设置', 'Content Settings') }}
  </div>
  <div class="settings-group rounded-2xl overflow-hidden">
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
      subtitle-zh="系统语言、时区等基础项目"
      subtitle-en="Language, timezone and basic system options"
      icon="fas fa-sliders"
      icon-class="bg-gray-600"
      @select="emit('open-general')"
    />
    <SettingsMenuItem
      title-zh="软件更新"
      title-en="Software Update"
      subtitle-zh="版本号、更新确认与重启"
      subtitle-en="Version, install confirmation and restart"
      icon="fas fa-arrow-rotate-right"
      icon-class="bg-green-500"
      data-testid="settings-software-update-entry"
      @select="emit('open-software-update')"
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

<style scoped>
.settings-profile-card,
.settings-tip-card,
.settings-group {
  min-width: 0;
  border: 1px solid var(--system-card-border);
  background: var(--system-panel-bg);
  color: var(--system-text);
}

.settings-profile-card {
  min-height: 88px;
  border-radius: var(--system-radius-lg);
  box-shadow: var(--system-shadow-card);
  transition:
    background var(--system-motion-fast),
    border-color var(--system-motion-fast),
    box-shadow var(--system-motion-fast);
  -webkit-tap-highlight-color: transparent;
}

.settings-profile-card:active {
  border-color: var(--system-control-border);
  background: var(--system-pressed-bg);
  box-shadow: var(--system-shadow-control);
}

.settings-profile-card:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: 2px;
  box-shadow: var(--system-shadow-card);
}

.settings-profile-avatar {
  flex: 0 0 56px;
  border: 2px solid var(--system-card-border);
  background: var(--system-surface-muted);
  box-shadow: var(--system-shadow-control);
}

.settings-profile-copy,
.settings-profile-title,
.settings-profile-subtitle,
.settings-tip-title,
.settings-tip-copy,
.settings-section-label {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: normal;
}

.settings-profile-title {
  color: var(--system-text);
  line-height: 1.25;
}

.settings-profile-subtitle {
  margin-top: 2px;
  color: var(--system-text-muted);
  line-height: 1.4;
}

.settings-profile-chevron {
  flex: none;
  color: var(--system-text-soft);
}

.settings-tip-card {
  border-color: var(--system-control-border);
  background: var(--system-accent-soft);
}

.settings-tip-title {
  color: var(--system-accent-strong);
}

.settings-tip-copy {
  color: var(--system-text-muted);
  line-height: 1.5;
}

.settings-section-label {
  color: var(--system-text-soft);
  font-weight: 700;
  letter-spacing: 0;
}

.settings-quick-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  min-width: 0;
}

.settings-group {
  border-radius: var(--system-radius-lg);
  box-shadow: var(--system-shadow-card);
}

@media (hover: hover) {
  .settings-profile-card:hover {
    border-color: var(--system-control-border);
    background: var(--system-hover-bg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-profile-card {
    transition: none;
  }
}
</style>
