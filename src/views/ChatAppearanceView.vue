<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import {
  DEFAULT_CHAT_APPEARANCE,
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
let actionFeedbackTimerId = null

const chatAppearanceDraft = reactive(normalizeChatAppearance(settings.value.appearance?.chat))

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
    detail: t('对方头像清晰，自己侧更轻，适合作为默认沉浸样式。', 'Contact identity stays clear while the user side is lighter.'),
  },
  {
    value: 'wechat',
    label: t('微信式', 'WeChat-like'),
    detail: t('双方都有头像边栏，参与者身份感更强。', 'Both sides keep avatar gutters for stronger participant presence.'),
  },
  {
    value: 'imessage',
    label: t('iMessage 式', 'iMessage-like'),
    detail: t('头像退场，气泡更贴近屏幕边缘，界面更轻。', 'Avatars step back and bubbles sit closer to the edges.'),
  },
])

const presetOptions = computed(() => [
  {
    value: 'kakao_immersive',
    label: t('Kakao 沉浸', 'Kakao immersive'),
    detail: t('暖黄色入口，柔和聊天画布，控制项保持轻量。', 'Warm yellow entry with a calm conversation canvas.'),
  },
])

const previewShellClasses = computed(() => [
  `chat-preset-${chatAppearanceDraft.presetId || DEFAULT_CHAT_APPEARANCE.presetId}`,
  `chat-layout-${chatAppearanceDraft.messageLayout || DEFAULT_CHAT_APPEARANCE.messageLayout}`,
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

const saveChatAppearance = () => {
  const changed = systemStore.setChatAppearance({
    presetId: chatAppearanceDraft.presetId,
    messageLayout: chatAppearanceDraft.messageLayout,
    customCss: chatAppearanceDraft.customCss,
    customCssEnabled: chatAppearanceDraft.customCssEnabled,
  })
  systemStore.saveNow()
  showActionFeedback(
    changed ? 'success' : 'warning',
    changed
      ? t('Chat 外观已保存。', 'Chat appearance saved.')
      : t('Chat 外观没有变化。', 'No Chat appearance changes detected.'),
  )
}

const resetChatAppearance = () => {
  Object.assign(chatAppearanceDraft, normalizeChatAppearance(DEFAULT_CHAT_APPEARANCE))
}
</script>

<template>
  <div class="chat-appearance-page w-full h-full text-black flex flex-col">
    <div class="chat-native-header pt-12 pb-3 px-4 flex items-center gap-3">
      <button @click="router.push('/chat-settings')" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('Chat 设置', 'Chat Settings') }}
      </button>
      <h1 class="font-bold text-xl">{{ t('Chat 外观', 'Chat Appearance') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
      <section class="rounded-[28px] border border-yellow-100 bg-yellow-50 px-5 py-5">
        <p class="text-2xl font-bold leading-tight text-gray-950">{{ t('Chat 外观', 'Chat Appearance') }}</p>
        <p class="mt-2 text-sm text-gray-600">
          {{ t('调整聊天入口、会话行和 Chat 专属 CSS。', 'Tune Chat entry, message rows, and Chat-only CSS.') }}
        </p>
      </section>

      <div
        v-if="actionFeedbackMessage"
        class="rounded-xl border px-3 py-2 text-xs"
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

      <section class="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <p class="text-sm font-semibold text-gray-900">{{ t('预设', 'Preset') }}</p>
        <div class="space-y-2">
          <button
            v-for="preset in presetOptions"
            :key="preset.value"
            type="button"
            class="w-full rounded-xl border px-3 py-3 text-left"
            :class="chatAppearanceDraft.presetId === preset.value ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100 hover:bg-gray-50'"
            @click="chatAppearanceDraft.presetId = preset.value"
          >
            <span class="block text-sm font-semibold text-gray-900">{{ preset.label }}</span>
            <span class="block text-[11px] text-gray-500">{{ preset.detail }}</span>
          </button>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <p class="text-sm font-semibold text-gray-900">{{ t('会话行布局', 'Conversation row layout') }}</p>
        <div class="grid gap-2">
          <button
            v-for="option in layoutOptions"
            :key="option.value"
            type="button"
            class="chat-appearance-layout-option rounded-xl border px-3 py-3 text-left"
            :class="chatAppearanceDraft.messageLayout === option.value ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100 hover:bg-gray-50'"
            :aria-pressed="chatAppearanceDraft.messageLayout === option.value ? 'true' : 'false'"
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
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-gray-900">{{ option.label }}</span>
              <span class="block text-[11px] text-gray-500">{{ option.detail }}</span>
            </span>
            <span class="chat-appearance-layout-option__check">
              <i class="fas fa-check"></i>
            </span>
          </button>
        </div>
      </section>

      <section
        class="chat-appearance-preview chat-shell rounded-2xl overflow-hidden border border-gray-200"
        :class="previewShellClasses"
        data-testid="chat-appearance-preview"
      >
        <div class="chat-thread-header px-4 py-3 text-sm font-semibold">
          {{ t('预览会话', 'Preview thread') }}
        </div>
        <div class="chat-thread p-4 space-y-3">
          <ChatMessageRow
            :message="previewAssistantMessage"
            :layout-mode="chatAppearanceDraft.messageLayout"
            :sender-name="t('小夏', 'Nari')"
            :message-status-text="previewMessageStatusText"
          />
          <ChatMessageRow
            :message="previewUserMessage"
            :layout-mode="chatAppearanceDraft.messageLayout"
            :sender-name="t('我', 'Me')"
            :message-status-text="previewMessageStatusText"
          />
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ t('高级 CSS', 'Advanced CSS') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">{{ t('优先覆盖 Chat 变量。', 'Prefer overriding Chat variables.') }}</p>
          </div>
          <input v-model="chatAppearanceDraft.customCssEnabled" type="checkbox" class="accent-blue-500" />
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
            @click="useVariableSnippet"
          >
            {{ t('插入变量片段', 'Insert variable snippet') }}
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 text-[11px]"
            @click="chatAppearanceDraft.customCss = ''"
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
