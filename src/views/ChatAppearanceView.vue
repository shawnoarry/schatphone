<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import {
  CHAT_CUSTOM_CSS_PROFILE_LIMIT,
  CHAT_CUSTOM_CSS_PROFILE_NAME_MAX_CHARS,
  DEFAULT_CHAT_APPEARANCE,
  MAX_CHAT_CUSTOM_CSS_CHARS,
  getChatAppearanceClasses,
  normalizeChatCssProfiles,
  normalizeChatAppearance,
} from '../lib/chat-appearance'
import { useI18n } from '../composables/useI18n'
import ChatMessageRow from '../components/chat/ChatMessageRow.vue'

const router = useRouter()
const systemStore = useSystemStore()
const { settings } = storeToRefs(systemStore)
const { t } = useI18n()

const actionFeedbackType = ref('')
const actionFeedbackMessage = ref('')
const customCssProfileName = ref('')
let actionFeedbackTimerId = null

const chatAppearanceDraft = reactive(normalizeChatAppearance(settings.value.appearance?.chat))
const appliedChatShellClasses = computed(() =>
  getChatAppearanceClasses(settings.value.appearance?.chat),
)

const savedCssProfiles = computed(() =>
  Array.isArray(chatAppearanceDraft.customCssProfiles) ? chatAppearanceDraft.customCssProfiles : [],
)
const activeCustomCssProfile = computed(() =>
  savedCssProfiles.value.find(
    (profile) => profile.id === chatAppearanceDraft.activeCustomCssProfileId,
  ) || null,
)
customCssProfileName.value = activeCustomCssProfile.value?.name || ''

const showActionFeedback = (type, message, durationMs = 1800) => {
  const text = typeof message === 'string' ? message.trim() : ''
  if (!text) return
  actionFeedbackType.value = type
  actionFeedbackMessage.value = text
  if (actionFeedbackTimerId) clearTimeout(actionFeedbackTimerId)
  actionFeedbackTimerId = setTimeout(() => {
    actionFeedbackType.value = ''
    actionFeedbackMessage.value = ''
  }, durationMs)
}

onBeforeUnmount(() => {
  if (actionFeedbackTimerId) clearTimeout(actionFeedbackTimerId)
})

const syncDraftFromStore = () => {
  Object.assign(chatAppearanceDraft, normalizeChatAppearance(settings.value.appearance?.chat))
  customCssProfileName.value = activeCustomCssProfile.value?.name || ''
}

watch(
  () => settings.value.appearance?.chat,
  syncDraftFromStore,
  { deep: true },
)

const layoutOptions = computed(() => [
  {
    value: 'kakao',
    label: t('Kakao 式', 'Kakao-like'),
    detail: t('暖黄外壳与浅蓝聊天底色；对方保留左侧身份锚点。', 'Warm shell and blue-gray thread; the contact keeps a left identity anchor.'),
  },
  {
    value: 'wechat',
    label: t('微信式', 'WeChat-like'),
    detail: t('浅绿聊天底色与绿色己方气泡；双方头像更明确。', 'Pale green thread with a green user bubble and clear avatar gutters.'),
  },
  {
    value: 'imessage',
    label: t('iMessage 式', 'iMessage-like'),
    detail: t('浅蓝灰底色；顶栏显示圆形头像、姓名和备注，消息两侧不放头像。', 'Blue-gray thread; the header shows avatar, name, and note while rows stay avatarless.'),
  },
])

const activeLayoutOption = computed(() =>
  layoutOptions.value.find((option) => option.value === chatAppearanceDraft.messageLayout)
  || layoutOptions.value[0],
)

const avatarModeOptions = computed(() => [
  {
    value: 'layout',
    label: t('随风格', 'By layout'),
  },
  {
    value: 'all',
    label: t('始终显示', 'Always show'),
  },
  {
    value: 'hidden',
    label: t('隐藏', 'Hide'),
  },
])

const bubbleModeOptions = computed(() => [
  {
    value: 'bubble',
    label: t('随风格', 'Follow style'),
    detail: t('按所选布局使用气泡形状', 'Use the selected layout shape and color.'),
  },
  {
    value: 'soft',
    label: t('柔和', 'Soft fill'),
    detail: t('大圆角和轻微阴影', 'Rounded fill with a quiet shadow.'),
  },
  {
    value: 'outline',
    label: t('描边', 'Outline'),
    detail: t('透明底色和清晰边线', 'Transparent surface with a crisp border.'),
  },
  {
    value: 'glass',
    label: t('轻透', 'Glass'),
    detail: t('半透明层次和轻微模糊', 'Translucent surface with light blur.'),
  },
])

const themeColorOptions = computed(() => [
  {
    value: 'layout',
    label: t('随布局', 'Follow layout'),
    detail: t('保留 Kakao、微信或 iMessage 的原生配色。', 'Keep the selected layout palette.'),
    primary: '#fee500',
    secondary: '#e5edf4',
    surface: '#fff7d1',
  },
  {
    value: 'ocean',
    label: t('海盐蓝', 'Sea blue'),
    detail: t('冷静蓝灰层次，适合长时间阅读。', 'Calm blue-gray layers for longer reading.'),
    primary: '#2563eb',
    secondary: '#dbeafe',
    surface: '#edf4ff',
  },
  {
    value: 'mint',
    label: t('薄荷绿', 'Mint'),
    detail: t('清爽绿色层次，整体更轻盈。', 'Fresh green layers with a lighter feel.'),
    primary: '#2f9e6f',
    secondary: '#d7f0df',
    surface: '#effaf4',
  },
  {
    value: 'coral',
    label: t('珊瑚暖调', 'Coral'),
    detail: t('温暖珊瑚色层次，保留清晰文字对比。', 'Warm coral layers with clear text contrast.'),
    primary: '#e86657',
    secondary: '#ffd9cf',
    surface: '#fff1ed',
  },
])

const bubbleColorOptions = computed(() => [
  {
    value: 'theme',
    label: t('随主题', 'Follow theme'),
    detail: t('气泡会和上面的主题配色自动协调。', 'Bubbles coordinate with the theme above.'),
    contact: '#ffffff',
    user: '#2563eb',
  },
  {
    value: 'contrast',
    label: t('清晰对比', 'Clear contrast'),
    detail: t('己方气泡更鲜明，对方保持中性。', 'A vivid user bubble with a neutral contact bubble.'),
    contact: '#ffffff',
    user: '#2563eb',
  },
  {
    value: 'soft',
    label: t('柔和协调', 'Soft harmony'),
    detail: t('低饱和填充，适合密集对话。', 'Low-saturation fills for dense conversations.'),
    contact: '#f1f3f5',
    user: '#b9e6cf',
  },
  {
    value: 'mono',
    label: t('石墨极简', 'Graphite'),
    detail: t('黑白层级突出文字和阅读节奏。', 'Monochrome layers keep focus on the text.'),
    contact: '#e5e7eb',
    user: '#111827',
  },
])

const activeThemeColorOption = computed(() =>
  themeColorOptions.value.find((option) => option.value === chatAppearanceDraft.themeColorMode)
  || themeColorOptions.value[0],
)

const activeBubbleColorOption = computed(() =>
  bubbleColorOptions.value.find((option) => option.value === chatAppearanceDraft.bubbleColorMode)
  || bubbleColorOptions.value[0],
)

const previewShellClasses = computed(() => [
  `chat-preset-${chatAppearanceDraft.presetId || DEFAULT_CHAT_APPEARANCE.presetId}`,
  `chat-layout-${chatAppearanceDraft.messageLayout || DEFAULT_CHAT_APPEARANCE.messageLayout}`,
  `chat-avatar-mode-${chatAppearanceDraft.messageAvatarMode || DEFAULT_CHAT_APPEARANCE.messageAvatarMode}`,
  `chat-bubble-mode-${chatAppearanceDraft.messageBubbleMode || DEFAULT_CHAT_APPEARANCE.messageBubbleMode}`,
  `chat-theme-color-${chatAppearanceDraft.themeColorMode || DEFAULT_CHAT_APPEARANCE.themeColorMode}`,
  `chat-bubble-color-${chatAppearanceDraft.bubbleColorMode || DEFAULT_CHAT_APPEARANCE.bubbleColorMode}`,
])

const previewAssistantMessage = computed(() => ({
  id: 'appearance-preview-assistant',
  role: 'assistant',
  content: t('今天也像真的聊天一样。', 'Today still feels like a real chat.'),
}))

const previewUserMessage = computed(() => ({
  id: 'appearance-preview-user',
  role: 'user',
  content: t('这个布局很顺眼。', 'This layout feels right.'),
  status: 'sent',
}))

const previewMessageStatusText = (message) => (message?.role === 'user' ? t('已发送', 'Sent') : '')

const PREVIEW_SCOPED_CHAT_SELECTORS = [
  ['chat-shell', '.chat-appearance-preview.chat-shell'],
  ['chat-thread-header', '.chat-appearance-preview .chat-thread-header'],
  ['chat-thread', '.chat-appearance-preview .chat-thread'],
  ['chat-message-row', '.chat-appearance-preview .chat-message-row'],
  ['chat-message-avatar', '.chat-appearance-preview .chat-message-avatar'],
  ['chat-message-content', '.chat-appearance-preview .chat-message-content'],
  ['chat-message-bubble', '.chat-appearance-preview .chat-message-bubble'],
  ['chat-message-sender', '.chat-appearance-preview .chat-message-sender'],
  ['chat-message-meta', '.chat-appearance-preview .chat-message-meta'],
  ['chat-bubble-user', '.chat-appearance-preview .chat-bubble-user'],
  ['chat-bubble-assistant', '.chat-appearance-preview .chat-bubble-assistant'],
]

const scopeChatClassSelector = (cssText, className, scopedSelector) =>
  cssText.replace(new RegExp(`\\.${className}(?![\\w-])`, 'g'), scopedSelector)

const scopePreviewCustomCss = (cssText) => {
  const rawCss = typeof cssText === 'string' ? cssText.trim() : ''
  if (!rawCss) return ''
  return PREVIEW_SCOPED_CHAT_SELECTORS.reduce(
    (scopedCss, [className, scopedSelector]) => scopeChatClassSelector(scopedCss, className, scopedSelector),
    rawCss,
  )
}

const previewCustomCss = computed(() => {
  if (!chatAppearanceDraft.customCssEnabled) return ''
  return scopePreviewCustomCss(chatAppearanceDraft.customCss)
})

let previewCustomCssStyleEl = null

const ensurePreviewCustomCssStyleEl = () => {
  if (typeof document === 'undefined') return null
  if (previewCustomCssStyleEl) return previewCustomCssStyleEl
  previewCustomCssStyleEl = document.createElement('style')
  previewCustomCssStyleEl.setAttribute('data-schatphone-chat-preview-css', 'true')
  previewCustomCssStyleEl.setAttribute('data-testid', 'chat-appearance-preview-css')
  document.head.appendChild(previewCustomCssStyleEl)
  return previewCustomCssStyleEl
}

const removePreviewCustomCssStyleEl = () => {
  if (!previewCustomCssStyleEl) return
  previewCustomCssStyleEl.remove()
  previewCustomCssStyleEl = null
}

const syncPreviewCustomCssStyle = () => {
  const cssText = previewCustomCss.value
  if (!cssText) {
    removePreviewCustomCssStyleEl()
    return
  }
  const styleEl = ensurePreviewCustomCssStyleEl()
  if (styleEl) styleEl.textContent = cssText
}

onMounted(syncPreviewCustomCssStyle)

watch(previewCustomCss, syncPreviewCustomCssStyle)

onBeforeUnmount(removePreviewCustomCssStyleEl)

const cssVariableSnippet = `.chat-shell {
  --chat-bg: #fee500;
  --chat-thread-bg: #fff7d1;
  --chat-thread-header-bg: rgba(255, 247, 209, 0.92);
  --chat-page-bg: #fff9dc;
  --chat-panel-bg: #fffef7;
  --chat-panel-muted-bg: #f7f3df;
  --chat-panel-border: rgba(39, 32, 24, 0.12);
  --chat-ink: #272018;
  --chat-user-bubble-bg: #fee500;
  --chat-user-bubble-text: #272018;
  --chat-assistant-bubble-bg: #ffffff;
  --chat-assistant-bubble-text: #171717;
  --chat-input-bg: #ffffff;
  --chat-input-field-bg: #f3f3f3;
  --chat-send-bg: #fee500;
  --chat-send-text: #272018;
}`

const useVariableSnippet = () => {
  chatAppearanceDraft.customCss = chatAppearanceDraft.customCss.trim()
    ? `${chatAppearanceDraft.customCss.trim()}\n\n${cssVariableSnippet}`
    : cssVariableSnippet
  chatAppearanceDraft.customCssEnabled = true
}

const normalizeCustomCssProfileName = (value) =>
  typeof value === 'string'
    ? value.trim().slice(0, CHAT_CUSTOM_CSS_PROFILE_NAME_MAX_CHARS)
    : ''

const createCustomCssProfileId = () => {
  const base = `chat-css-${Date.now().toString(36)}`
  let id = base
  let suffix = 2
  while (savedCssProfiles.value.some((profile) => profile.id === id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }
  return id
}

const selectCustomCssProfile = (profile) => {
  if (!profile) return
  chatAppearanceDraft.activeCustomCssProfileId = profile.id
  chatAppearanceDraft.customCss = profile.css
  chatAppearanceDraft.customCssEnabled = true
  customCssProfileName.value = profile.name
}

const clearCustomCssDraft = () => {
  chatAppearanceDraft.customCss = ''
  chatAppearanceDraft.customCssEnabled = false
  chatAppearanceDraft.activeCustomCssProfileId = ''
  customCssProfileName.value = ''
}

const customCssFileInput = ref(null)

const openCustomCssFilePicker = () => {
  customCssFileInput.value?.click()
}

const importCustomCssFile = async (event) => {
  const target = event?.target
  const file = target?.files?.[0]
  if (target) target.value = ''
  if (!file) return
  try {
    const text = await file.text()
    if (text.length > MAX_CHAT_CUSTOM_CSS_CHARS) {
      showActionFeedback(
        'warning',
        t(
          `文件过大，最多支持 ${MAX_CHAT_CUSTOM_CSS_CHARS.toLocaleString()} 个字符。`,
          `CSS file is too large. Files can contain up to ${MAX_CHAT_CUSTOM_CSS_CHARS.toLocaleString()} characters.`,
        ),
      )
      return
    }
    chatAppearanceDraft.customCss = text
    chatAppearanceDraft.customCssEnabled = true
    chatAppearanceDraft.activeCustomCssProfileId = ''
    if (!customCssProfileName.value.trim()) {
      customCssProfileName.value = normalizeCustomCssProfileName(file.name.replace(/\.[^.]+$/, ''))
    }
    showActionFeedback('success', t('已导入 CSS 文件内容。', 'CSS file content imported.'))
  } catch {
    showActionFeedback('error', t('文件读取失败，请重试。', 'Could not read the file. Please retry.'))
  }
}

const removeCustomCssProfile = (profile) => {
  if (!profile) return
  const remaining = savedCssProfiles.value.filter((item) => item.id !== profile.id)
  chatAppearanceDraft.customCssProfiles = remaining
  if (chatAppearanceDraft.activeCustomCssProfileId === profile.id) {
    const replacement = remaining[0]
    if (replacement) {
      selectCustomCssProfile(replacement)
    } else {
      clearCustomCssDraft()
    }
  }
  saveChatAppearance()
}

const buildChatAppearanceSavePayload = () => {
  const activeProfileId = chatAppearanceDraft.activeCustomCssProfileId || ''
  const rawProfiles = savedCssProfiles.value.map((profile) => ({ ...profile }))
  const activeProfileIndex = rawProfiles.findIndex((profile) => profile.id === activeProfileId)
  if (activeProfileIndex >= 0) {
    rawProfiles[activeProfileIndex] = {
      ...rawProfiles[activeProfileIndex],
      name: normalizeCustomCssProfileName(customCssProfileName.value) || rawProfiles[activeProfileIndex].name,
      css: chatAppearanceDraft.customCss,
    }
  }
  const customCssProfiles = normalizeChatCssProfiles(rawProfiles)
  const persistedActiveProfileId = customCssProfiles.some((profile) => profile.id === activeProfileId)
    ? activeProfileId
    : ''

  return {
    presetId: chatAppearanceDraft.presetId,
    messageLayout: chatAppearanceDraft.messageLayout,
    messageAvatarMode: chatAppearanceDraft.messageAvatarMode,
    messageBubbleMode: chatAppearanceDraft.messageBubbleMode,
    themeColorMode: chatAppearanceDraft.themeColorMode,
    bubbleColorMode: chatAppearanceDraft.bubbleColorMode,
    customCss: chatAppearanceDraft.customCss,
    customCssEnabled: chatAppearanceDraft.customCssEnabled,
    customCssProfiles,
    activeCustomCssProfileId: persistedActiveProfileId,
  }
}

const saveChatAppearance = () => {
  const changed = systemStore.setChatAppearance(buildChatAppearanceSavePayload())
  systemStore.saveNow()
  showActionFeedback(
    changed ? 'success' : 'warning',
    changed
      ? t('Chat 外观已保存。', 'Chat appearance saved.')
      : t('Chat 外观没有变化。', 'No Chat appearance changes detected.'),
  )
}

const saveCustomCssProfileAs = () => {
  const css = typeof chatAppearanceDraft.customCss === 'string' ? chatAppearanceDraft.customCss : ''
  const name = normalizeCustomCssProfileName(customCssProfileName.value)
  if (!name) {
    showActionFeedback('warning', t('请先填写样式名称。', 'Enter a style name first.'))
    return
  }
  if (!css.trim()) {
    showActionFeedback('warning', t('请先写入 CSS 内容。', 'Add CSS before saving a style.'))
    return
  }
  if (savedCssProfiles.value.length >= CHAT_CUSTOM_CSS_PROFILE_LIMIT) {
    showActionFeedback(
      'warning',
      t(`最多保存 ${CHAT_CUSTOM_CSS_PROFILE_LIMIT} 个样式。`, `You can save up to ${CHAT_CUSTOM_CSS_PROFILE_LIMIT} styles.`),
    )
    return
  }
  const id = createCustomCssProfileId()
  const nextProfiles = normalizeChatCssProfiles([
    ...savedCssProfiles.value,
    { id, name, css },
  ])
  chatAppearanceDraft.customCssProfiles = nextProfiles
  chatAppearanceDraft.activeCustomCssProfileId = id
  chatAppearanceDraft.customCssEnabled = true
  customCssProfileName.value = name
  saveChatAppearance()
}

const saveCustomCssProfile = () => {
  if (!activeCustomCssProfile.value) {
    saveCustomCssProfileAs()
    return
  }
  const name = normalizeCustomCssProfileName(customCssProfileName.value) || activeCustomCssProfile.value.name
  if (!chatAppearanceDraft.customCss.trim()) {
    showActionFeedback('warning', t('请先写入 CSS 内容。', 'Add CSS before saving a style.'))
    return
  }
  customCssProfileName.value = name
  chatAppearanceDraft.customCssProfiles = savedCssProfiles.value.map((profile) =>
    profile.id === activeCustomCssProfile.value.id
      ? { ...profile, name, css: chatAppearanceDraft.customCss }
      : profile,
  )
  saveChatAppearance()
}

const saveCustomCssProfileLabel = computed(() =>
  activeCustomCssProfile.value ? t('更新样式', 'Update style') : t('保存为样式', 'Save style'),
)

const resetChatAppearance = () => {
  Object.assign(chatAppearanceDraft, normalizeChatAppearance(DEFAULT_CHAT_APPEARANCE))
  customCssProfileName.value = ''
}
</script>

<template>
  <div
    class="chat-appearance-page chat-shell w-full h-full flex flex-col"
    :class="appliedChatShellClasses"
    data-testid="chat-appearance-page"
  >
    <div class="chat-native-header pt-12 pb-3 px-4 flex items-center gap-3">
      <button @click="router.push('/chat-settings')" class="chat-native-back text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('Chat 设置', 'Chat Settings') }}
      </button>
      <h1 class="font-bold text-xl">{{ t('Chat 外观', 'Chat Appearance') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
      <p class="px-1 text-[11px] leading-4 text-gray-500">
        {{ t('先看实时效果，再调整布局、颜色与消息细节。', 'Preview the result first, then tune layout, color, and message details.') }}
      </p>

      <div
        v-if="actionFeedbackMessage"
        class="rounded-xl border px-3 py-2 text-xs"
        data-testid="chat-appearance-action-feedback"
        :class="
          actionFeedbackType === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : actionFeedbackType === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        "
      >
        {{ actionFeedbackMessage }}
      </div>

      <section
        class="chat-appearance-preview-panel rounded-2xl border border-gray-200 bg-white p-3"
        data-testid="chat-appearance-preview-panel"
      >
        <div class="chat-appearance-preview-panel__header">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900">{{ t('实时预览', 'Live preview') }}</p>
            <p class="mt-0.5 truncate text-[10px] text-gray-500" data-testid="chat-appearance-preview-summary">
              {{ activeLayoutOption.label }} · {{ activeThemeColorOption.label }} · {{ activeBubbleColorOption.label }}
            </p>
          </div>
          <div class="chat-appearance-preview-legend" data-testid="chat-appearance-preview-legend">
            <span><i class="is-contact" aria-hidden="true"></i>{{ t('左：对方', 'Left: contact') }}</span>
            <span><i class="is-user" aria-hidden="true"></i>{{ t('右：我', 'Right: me') }}</span>
          </div>
        </div>

        <div
          class="chat-appearance-preview chat-shell overflow-hidden rounded-xl border border-gray-200"
          :class="previewShellClasses"
          data-testid="chat-appearance-preview"
        >
          <div
            class="chat-thread-header chat-appearance-preview__header px-3 py-2"
            :class="`chat-thread-header--${chatAppearanceDraft.messageLayout}`"
          >
            <template v-if="chatAppearanceDraft.messageLayout === 'imessage'">
              <span class="chat-thread-header__identity-wrap">
                <span class="chat-thread-header__avatar-wrap">
                  <span
                    class="chat-thread-header__avatar"
                    data-testid="chat-appearance-preview-header-avatar"
                    :aria-label="t('可替换的头像占位', 'Replaceable avatar placeholder')"
                    :title="t('头像占位，可替换为联系人头像', 'Avatar placeholder; replaceable with a contact avatar')"
                  >N</span>
                  <span class="chat-thread-header__avatar-badge" aria-hidden="true">
                    <i class="fas fa-image"></i>
                  </span>
                </span>
                <span class="chat-thread-header__identity">
                  <span class="chat-thread-header__name">{{ t('小夏', 'Nari') }}</span>
                  <span class="chat-thread-header__note">{{ t('午后散步', 'Walk after lunch') }}</span>
                </span>
              </span>
            </template>
            <span v-else class="text-xs font-semibold">{{ t('小夏', 'Nari') }}</span>
          </div>
          <div class="chat-thread space-y-2 p-3">
            <ChatMessageRow
              :message="previewAssistantMessage"
              :layout-mode="chatAppearanceDraft.messageLayout"
              :avatar-mode="chatAppearanceDraft.messageAvatarMode"
              :bubble-mode="chatAppearanceDraft.messageBubbleMode"
              :sender-name="t('小夏', 'Nari')"
              :message-status-text="previewMessageStatusText"
            />
            <ChatMessageRow
              :message="previewUserMessage"
              :layout-mode="chatAppearanceDraft.messageLayout"
              :avatar-mode="chatAppearanceDraft.messageAvatarMode"
              :bubble-mode="chatAppearanceDraft.messageBubbleMode"
              :sender-name="t('我', 'Me')"
              :message-status-text="previewMessageStatusText"
            />
          </div>
          <div class="chat-input chat-appearance-preview__composer" data-testid="chat-appearance-preview-composer">
            <span class="chat-input-field chat-appearance-preview__input">{{ t('发送消息', 'Message') }}</span>
            <span class="chat-send chat-appearance-preview__send" aria-hidden="true">
              <i class="fas fa-paper-plane"></i>
            </span>
          </div>
        </div>

        <div class="chat-appearance-layout-control">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-semibold text-gray-900">{{ t('会话布局', 'Conversation layout') }}</p>
            <p class="truncate text-[10px] text-gray-400">{{ activeLayoutOption.detail }}</p>
          </div>
          <div class="mt-2 grid grid-cols-3 gap-2">
          <button
            v-for="option in layoutOptions"
            :key="option.value"
            type="button"
            class="chat-appearance-layout-option"
            :class="chatAppearanceDraft.messageLayout === option.value ? 'is-selected' : ''"
            :aria-pressed="chatAppearanceDraft.messageLayout === option.value ? 'true' : 'false'"
            :title="option.detail"
            :data-testid="`chat-layout-option-${option.value}`"
            @click="chatAppearanceDraft.messageLayout = option.value"
          >
            <span
              class="chat-layout-sample"
              :class="`chat-layout-sample--${option.value}`"
              :data-testid="`chat-layout-option-${option.value}-sample`"
              aria-hidden="true"
            >
              <span class="chat-layout-sample__row is-contact">
                <span class="chat-layout-sample__avatar"></span>
                <span class="chat-layout-sample__bubble"></span>
              </span>
              <span class="chat-layout-sample__row is-user">
                <span class="chat-layout-sample__bubble"></span>
                <span class="chat-layout-sample__avatar"></span>
              </span>
            </span>
            <span class="truncate text-[10px] font-semibold text-gray-700">{{ option.label }}</span>
            <span class="chat-appearance-layout-option__check">
              <i class="fas fa-check"></i>
            </span>
          </button>
        </div>
        </div>

        <p class="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400" data-testid="chat-appearance-preview-avatar-hint">
          <i class="fas fa-image" aria-hidden="true"></i>
          <span>{{ t('字母头像是可替换占位。', 'Letter avatars are replaceable placeholders.') }}</span>
        </p>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
        <div>
          <p class="text-sm font-semibold text-gray-900">{{ t('颜色与美化', 'Color and polish') }}</p>
          <p class="mt-1 text-[11px] leading-4 text-gray-500">
            {{ t('主题配色控制聊天画布与控件，气泡配色单独控制双方消息；两者可以自由组合。', 'Theme color styles the chat canvas and controls; bubble color styles both sides independently. Combine them freely.') }}
          </p>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold text-gray-900">{{ t('主题配色', 'Theme color') }}</p>
              <p class="mt-0.5 text-[10px] text-gray-500">{{ t('改变聊天背景、顶栏、输入区和主按钮。', 'Changes the chat background, header, composer, and primary action.') }}</p>
            </div>
            <span class="text-[10px] font-semibold text-gray-400">{{ themeColorOptions.length }} {{ t('种', 'options') }}</span>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="option in themeColorOptions"
              :key="option.value"
              type="button"
              class="chat-color-option chat-color-option--compact"
              :class="chatAppearanceDraft.themeColorMode === option.value ? 'is-selected' : ''"
              :aria-pressed="chatAppearanceDraft.themeColorMode === option.value ? 'true' : 'false'"
              :title="option.detail"
              :data-testid="`chat-theme-color-mode-${option.value}`"
              @click="chatAppearanceDraft.themeColorMode = option.value"
            >
              <span
                class="chat-color-option__theme-sample"
                :style="{
                  '--chat-option-primary': option.primary,
                  '--chat-option-secondary': option.secondary,
                  '--chat-option-surface': option.surface,
                }"
                :data-testid="`chat-theme-color-preview-${option.value}`"
                aria-hidden="true"
              >
                <span class="chat-color-option__theme-header"></span>
                <span class="chat-color-option__theme-thread">
                  <i class="is-contact"></i>
                  <i class="is-user"></i>
                </span>
                <span class="chat-color-option__theme-composer"><i></i><b></b></span>
              </span>
              <span class="mt-1.5 flex items-center justify-between gap-1">
                <span class="min-w-0 truncate text-[10px] font-semibold text-gray-900">{{ option.label }}</span>
                <span class="chat-color-option__status" aria-hidden="true">
                  <i class="fas fa-check"></i>
                </span>
              </span>
            </button>
          </div>
          <p class="truncate text-[10px] text-gray-500" data-testid="chat-theme-color-detail">
            {{ activeThemeColorOption.detail }}
          </p>
        </div>

        <div class="space-y-2 border-t border-gray-100 pt-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold text-gray-900">{{ t('气泡配色', 'Bubble color') }}</p>
              <p class="mt-0.5 text-[10px] text-gray-500">{{ t('只改变消息气泡的颜色层级，不会改变气泡形状。', 'Changes bubble color hierarchy without changing the selected shape.') }}</p>
            </div>
            <span class="text-[10px] font-semibold text-gray-400">{{ bubbleColorOptions.length }} {{ t('种', 'options') }}</span>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="option in bubbleColorOptions"
              :key="option.value"
              type="button"
              class="chat-color-option chat-color-option--compact"
              :class="chatAppearanceDraft.bubbleColorMode === option.value ? 'is-selected' : ''"
              :aria-pressed="chatAppearanceDraft.bubbleColorMode === option.value ? 'true' : 'false'"
              :title="option.detail"
              :data-testid="`chat-bubble-color-mode-${option.value}`"
              @click="chatAppearanceDraft.bubbleColorMode = option.value"
            >
              <span class="chat-color-option__bubble-sample" aria-hidden="true">
                <span
                  class="chat-color-option__bubble-line"
                  :style="{ '--chat-option-bubble': option.contact }"
                ></span>
                <span
                  class="chat-color-option__bubble-line is-user"
                  :style="{ '--chat-option-bubble': option.user }"
                ></span>
              </span>
              <span class="mt-1.5 flex items-center justify-between gap-1">
                <span class="min-w-0 truncate text-[10px] font-semibold text-gray-900">{{ option.label }}</span>
                <span class="chat-color-option__status" aria-hidden="true">
                  <i class="fas fa-check"></i>
                </span>
              </span>
            </button>
          </div>
          <p class="truncate text-[10px] text-gray-500" data-testid="chat-bubble-color-detail">
            {{ activeBubbleColorOption.detail }}
          </p>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
        <div>
          <p class="text-sm font-semibold text-gray-900">{{ t('消息气泡', 'Message bubbles') }}</p>
          <p class="mt-1 text-[11px] leading-4 text-gray-500">{{ t('选择一种可见的气泡样式。', 'Choose a visible bubble treatment.') }}</p>
          <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              v-for="option in bubbleModeOptions"
              :key="option.value"
              type="button"
              class="chat-appearance-bubble-option rounded-xl border px-2.5 py-2.5 text-left"
              :class="chatAppearanceDraft.messageBubbleMode === option.value ? 'is-selected border-yellow-300 bg-yellow-50' : 'border-gray-100 bg-white hover:bg-gray-50'"
              :aria-pressed="chatAppearanceDraft.messageBubbleMode === option.value ? 'true' : 'false'"
              :data-testid="`chat-message-bubble-mode-${option.value}`"
              @click="chatAppearanceDraft.messageBubbleMode = option.value"
            >
              <span
                class="chat-bubble-style-sample"
                :class="`chat-bubble-style-sample--${option.value}`"
                aria-hidden="true"
              >
                <span class="chat-bubble-style-sample__line is-contact"></span>
                <span class="chat-bubble-style-sample__line is-user"></span>
              </span>
              <span class="mt-2 block text-[11px] font-semibold text-gray-900">{{ option.label }}</span>
              <span class="mt-0.5 block text-[10px] leading-4 text-gray-500">{{ option.detail }}</span>
            </button>
          </div>
        </div>

        <div>
          <p class="text-sm font-semibold text-gray-900">{{ t('消息头像', 'Message avatars') }}</p>
          <div class="mt-2 grid grid-cols-3 overflow-hidden rounded-lg border border-gray-200">
            <button
              v-for="option in avatarModeOptions"
              :key="option.value"
              type="button"
              class="min-w-0 border-l border-gray-200 px-2 py-2 text-[11px] font-semibold first:border-l-0"
              :class="chatAppearanceDraft.messageAvatarMode === option.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
              :aria-pressed="chatAppearanceDraft.messageAvatarMode === option.value ? 'true' : 'false'"
              :data-testid="`chat-message-avatar-mode-${option.value}`"
              @click="chatAppearanceDraft.messageAvatarMode = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <p class="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-gray-500">
            <i class="fas fa-image mt-0.5 text-gray-400" aria-hidden="true"></i>
            <span>{{ t('圆形头像里的字母只是占位符；有联系人头像时会自动替换。', 'The letter is only a placeholder; a contact avatar replaces it when available.') }}</span>
          </p>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ t('高级 CSS', 'Advanced CSS') }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">{{ t('CSS 会注入 Chat 页面。建议以 .chat-shell 为前缀，优先覆盖 Chat 变量，也可以直接定位 Chat 组件。', 'CSS is injected into the Chat page. Prefix selectors with .chat-shell, prefer Chat variables, or target Chat components directly.') }}</p>
          </div>
          <label class="inline-flex items-center gap-2 text-[11px] font-semibold text-gray-600">
            <span>{{ t('启用', 'Enabled') }}</span>
            <input
              v-model="chatAppearanceDraft.customCssEnabled"
              type="checkbox"
              class="accent-blue-500"
              data-testid="chat-appearance-custom-css-enabled"
            />
          </label>
        </div>

        <div class="border-t border-gray-100 pt-3 space-y-2">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold text-gray-900">{{ t('已保存样式', 'Saved styles') }}</p>
              <p class="mt-0.5 text-[10px] text-gray-500">
                {{ t('保存后可再次载入并切换。', 'Save styles here to load and switch them later.') }}
              </p>
            </div>
            <span class="shrink-0 text-[10px] text-gray-400">
              {{ savedCssProfiles.length }}/{{ CHAT_CUSTOM_CSS_PROFILE_LIMIT }}
            </span>
          </div>

          <div v-if="savedCssProfiles.length" class="space-y-1.5" data-testid="chat-appearance-css-profiles">
            <div
              v-for="profile in savedCssProfiles"
              :key="profile.id"
              class="flex items-center gap-1.5 rounded-lg border px-2 py-1.5"
              :class="profile.id === chatAppearanceDraft.activeCustomCssProfileId ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100 bg-gray-50/70'"
              :data-testid="`chat-appearance-css-profile-${profile.id}`"
            >
              <button
                type="button"
                class="min-w-0 flex-1 text-left"
                :aria-pressed="profile.id === chatAppearanceDraft.activeCustomCssProfileId ? 'true' : 'false'"
                :data-testid="`chat-appearance-css-profile-select-${profile.id}`"
                @click="selectCustomCssProfile(profile)"
              >
                <span class="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                  <i v-if="profile.id === chatAppearanceDraft.activeCustomCssProfileId" class="fas fa-check text-[9px] text-yellow-700" aria-hidden="true"></i>
                  <span class="truncate">{{ profile.name }}</span>
                </span>
                <span class="mt-0.5 block truncate text-[10px] text-gray-400">{{ profile.css.trim().split('\n')[0] }}</span>
              </button>
              <button
                type="button"
                class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-white hover:text-red-500"
                :aria-label="t(`删除样式 ${profile.name}`, `Delete style ${profile.name}`)"
                :title="t('删除样式', 'Delete style')"
                :data-testid="`chat-appearance-css-profile-delete-${profile.id}`"
                @click.stop="removeCustomCssProfile(profile)"
              >
                <i class="fas fa-trash-can text-[10px]" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <p v-else class="rounded-lg border border-dashed border-gray-200 px-2.5 py-2 text-[10px] text-gray-400">
            {{ t('还没有保存的样式。', 'No saved styles yet.') }}
          </p>

          <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label class="block min-w-0">
              <span class="mb-1 block text-[10px] font-semibold text-gray-500">{{ t('样式名称', 'Style name') }}</span>
              <input
                v-model="customCssProfileName"
                type="text"
                :maxlength="CHAT_CUSTOM_CSS_PROFILE_NAME_MAX_CHARS"
                class="h-8 w-full rounded-md border border-gray-200 px-2 text-xs outline-none focus:border-yellow-400"
                :placeholder="t('例如：雾面蓝', 'e.g. Frosted blue')"
                data-testid="chat-appearance-css-profile-name"
              />
            </label>
            <div class="flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                class="rounded-md border border-gray-200 px-2 py-1.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-50"
                data-testid="chat-appearance-css-profile-save"
                @click="saveCustomCssProfile"
              >
                {{ saveCustomCssProfileLabel }}
              </button>
              <button
                type="button"
                class="rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-[10px] font-semibold text-yellow-800 hover:bg-yellow-100"
                data-testid="chat-appearance-css-profile-save-as"
                @click="saveCustomCssProfileAs"
              >
                {{ t('另存为', 'Save as new') }}
              </button>
            </div>
          </div>
        </div>

        <textarea
          v-model="chatAppearanceDraft.customCss"
          class="w-full h-36 border border-gray-200 rounded-md p-2 text-xs font-mono outline-none resize-none"
          placeholder=".chat-shell { --chat-bg: #fee500; }"
          data-testid="chat-appearance-custom-css"
        ></textarea>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 text-[11px]"
            data-testid="chat-appearance-custom-css-import"
            @click="openCustomCssFilePicker"
          >
            {{ t('从文件导入', 'Import file') }}
          </button>
          <input
            ref="customCssFileInput"
            type="file"
            accept=".css,text/css"
            class="hidden"
            data-testid="chat-appearance-custom-css-file"
            @change="importCustomCssFile"
          />
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 text-[11px]"
            @click="useVariableSnippet"
          >
            {{ t('插入变量片段', 'Insert variable snippet') }}
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 text-[11px]"
            data-testid="chat-appearance-custom-css-clear"
            @click="clearCustomCssDraft"
          >
            {{ t('清空 CSS', 'Clear CSS') }}
          </button>
        </div>
      </section>

      <div class="chat-appearance-actions grid grid-cols-2 gap-2">
        <button
          type="button"
          class="py-3 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700"
          @click="resetChatAppearance"
        >
          {{ t('恢复默认', 'Reset default') }}
        </button>
        <button
          type="button"
          class="py-3 rounded-xl text-sm font-semibold bg-yellow-400 text-gray-950"
          data-testid="chat-appearance-save"
          @click="saveChatAppearance"
        >
          {{ t('保存 Chat 外观', 'Save Chat Appearance') }}
        </button>
      </div>
    </div>
  </div>
</template>
