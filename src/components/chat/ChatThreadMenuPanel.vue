<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  activeChat: {
    type: Object,
    default: null,
  },
  isActiveServiceChat: {
    type: Boolean,
    default: false,
  },
  subscriptionMuted: {
    type: Boolean,
    default: false,
  },
  subscriptionFolded: {
    type: Boolean,
    default: false,
  },
  worldKernelState: {
    type: Object,
    required: true,
  },
  tokenEstimate: {
    type: Object,
    default: () => ({
      totalTokens: 0,
      worldContextTokens: 0,
      supportingContextTokens: 0,
      recentConversationTokens: 0,
    }),
  },
  threadIdentityDraft: {
    type: Object,
    required: true,
  },
  threadSettingsDraft: {
    type: Object,
    required: true,
  },
  threadSettingsDefaults: {
    type: Object,
    default: () => ({}),
  },
  replyModeOptions: {
    type: Array,
    default: () => [],
  },
  responseStyleOptions: {
    type: Array,
    default: () => [],
  },
  imageReferenceModeOptions: {
    type: Array,
    default: () => [],
  },
  proactiveStrategyOptions: {
    type: Array,
    default: () => [],
  },
  roleImageReferenceAvailability: {
    type: Object,
    default: () => ({ hasAny: false }),
  },
  threadImageBlockPolicyHint: {
    type: String,
    default: '',
  },
  chatAutomationEnabled: {
    type: Boolean,
    default: false,
  },
  autoScheduleHintText: {
    type: String,
    default: '',
  },
  autoBackgroundReminderHint: {
    type: Object,
    default: () => ({ text: '', tone: 'muted' }),
  },
  autoLastTriggeredHintText: {
    type: String,
    default: '',
  },
  autoRestoreSettlementHintText: {
    type: String,
    default: '',
  },
  threadSettingsSaved: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'clear-thread-identity',
  'close',
  'apply-default-thread-preset',
  'open-chat-directory',
  'open-contacts-profile',
  'open-worldbook',
  'open-worldbook-disabled',
  'save-thread-identity',
  'save-thread-settings',
  'toggle-subscription-muted',
  'toggle-subscription-folded',
  'update-thread-identity',
  'update-thread-setting',
])

const { systemLanguage, t } = useI18n()

const formatNumber = (value) =>
  new Intl.NumberFormat(systemLanguage.value).format(Math.max(0, Number(value) || 0))

const tokenEstimateRows = computed(() => [
  {
    id: 'world',
    label: t('世界设定', 'World setting'),
    tokens: props.tokenEstimate.worldContextTokens,
  },
  {
    id: 'supporting',
    label: t('人物、记忆与回复规则', 'People, memory, and reply rules'),
    tokens: props.tokenEstimate.supportingContextTokens,
  },
  {
    id: 'conversation',
    label: t('最近对话', 'Recent conversation'),
    tokens: props.tokenEstimate.recentConversationTokens,
  },
])

const sourceRoleName = computed(
  () => props.worldKernelState.profileName || props.activeChat?.name || '',
)

const contactAvatar = computed(
  () =>
    props.threadIdentityDraft.contactAvatar ||
    props.activeChat?.avatar ||
    props.activeChat?.avatarUrl ||
    '',
)

const serviceTemplateSummary = computed(
  () =>
    props.activeChat?.serviceTemplate ||
    t(
      '当前服务号暂未设置模板。请到会话通讯录统一编辑。',
      'No template is set yet. Edit it from Chat Directory.',
    ),
)

const updateIdentity = (key, value) => {
  emit('update-thread-identity', { key, value })
}

const threadSettingsDirty = ref(false)

const isThreadSettingOverridden = (key) =>
  Object.prototype.hasOwnProperty.call(props.threadSettingsDefaults, key) &&
  props.threadSettingsDraft[key] !== props.threadSettingsDefaults[key]

watch(
  () => props.threadSettingsSaved,
  (saved) => {
    if (saved) threadSettingsDirty.value = false
  },
)

const updateSetting = (key, value) => {
  threadSettingsDirty.value = true
  emit('update-thread-setting', { key, value })
}

const updateNumberSetting = (key, value) => {
  threadSettingsDirty.value = true
  const numericValue = Number(value)
  emit('update-thread-setting', {
    key,
    value: Number.isFinite(numericValue) ? numericValue : value,
  })
}
</script>

<template>
  <div
    class="chat-thread-menu-layer absolute inset-0 z-30 flex items-end bg-black/25"
    data-testid="chat-thread-details-layer"
    role="dialog"
    aria-modal="true"
    :aria-label="t('聊天详情', 'Chat details')"
  >
    <button
      type="button"
      class="absolute inset-0"
      :aria-label="t('关闭聊天详情', 'Close chat details')"
      @click="$emit('close')"
    ></button>
    <section class="relative flex max-h-[88%] w-full flex-col rounded-t-2xl bg-white text-xs text-gray-600 shadow-2xl">
      <div class="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300" aria-hidden="true"></div>
      <header class="flex items-center justify-between border-b border-gray-100 px-4 pb-3 pt-2">
        <button
          type="button"
          class="h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100"
          :aria-label="t('关闭', 'Close')"
          @click="$emit('close')"
        >
          <i class="fas fa-chevron-down"></i>
        </button>
        <p class="text-sm font-semibold text-gray-950">{{ t('聊天详情', 'Chat details') }}</p>
        <span class="h-9 w-9" aria-hidden="true"></span>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 no-scrollbar">
        <div class="flex flex-col items-center text-center">
          <span class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-lg font-semibold text-gray-600">
            <img v-if="contactAvatar" :src="contactAvatar" :alt="activeChat?.name || ''" class="h-full w-full object-cover" />
            <span v-else>{{ (activeChat?.name || '?').slice(0, 1) }}</span>
          </span>
          <p class="mt-2 text-base font-semibold text-gray-950">{{ activeChat?.name }}</p>
          <p v-if="activeChat?.relationshipNote || activeChat?.role" class="mt-0.5 text-[11px] text-gray-500">
            {{ activeChat.relationshipNote || activeChat.role }}
          </p>
        </div>

        <div class="mx-auto mt-4 grid max-w-xs grid-cols-2 gap-3">
          <button
            type="button"
            class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-gray-100 text-gray-700"
            @click="$emit('open-chat-directory')"
          >
            <i :class="isActiveServiceChat ? 'fas fa-bullhorn' : 'fas fa-user'"></i>
            <span class="text-[11px]">{{ isActiveServiceChat ? t('服务号资料', 'Service info') : t('联系人资料', 'Contact info') }}</span>
          </button>
          <button
            type="button"
            class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-gray-100 text-gray-700"
            data-testid="thread-worldbook-open-shortcut"
            @click="$emit('open-worldbook')"
          >
            <i class="fas fa-book-open"></i>
            <span class="text-[11px]">{{ t('世界设定', 'World context') }}</span>
          </button>
        </div>

        <div class="mt-5 divide-y divide-gray-100 border-y border-gray-100">
    <template v-if="isActiveServiceChat">
      <div class="space-y-3 py-4" data-testid="thread-service-subscription-panel">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-sm text-gray-900">{{ t('订阅频道', 'Subscription channel') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">
              {{ serviceTemplateSummary }}
            </p>
          </div>
          <button
            @click="$emit('open-chat-directory')"
            class="shrink-0 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            {{ t('服务号', 'Services') }}
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="rounded-xl border px-3 py-2 text-left"
            :class="subscriptionMuted ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700'"
            data-testid="thread-service-toggle-muted"
            @click="$emit('toggle-subscription-muted')"
          >
            <span class="block text-[10px] font-semibold">{{ t('免打扰', 'Mute') }}</span>
            <span class="mt-0.5 block text-[11px]">{{ subscriptionMuted ? t('已开启', 'On') : t('未开启', 'Off') }}</span>
          </button>
          <button
            type="button"
            class="rounded-xl border px-3 py-2 text-left"
            :class="subscriptionFolded ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-gray-200 bg-white text-gray-700'"
            data-testid="thread-service-toggle-folded"
            @click="$emit('toggle-subscription-folded')"
          >
            <span class="block text-[10px] font-semibold">{{ t('折叠', 'Fold') }}</span>
            <span class="mt-0.5 block text-[11px]">{{ subscriptionFolded ? t('已折叠', 'Folded') : t('消息首页可见', 'Visible') }}</span>
          </button>
        </div>
      </div>
    </template>

    <details class="group py-1">
      <summary
        class="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-medium text-gray-900"
        data-testid="thread-ai-world-summary-toggle"
      >
        <span>{{ t('AI 与世界设定', 'AI and world context') }}</span>
        <span class="flex items-center gap-2 text-[11px] font-normal text-gray-500">
          {{ worldKernelState.injectedCount }} / {{ worldKernelState.configuredCount }}
          <i class="fas fa-chevron-down transition-transform group-open:rotate-180"></i>
        </span>
      </summary>
      <div
        class="mb-4 space-y-2 rounded-xl bg-blue-50/70 p-3"
        data-testid="thread-worldbook-summary"
      >
      <div
        class="rounded-lg border border-blue-100 bg-white p-3"
        data-testid="thread-token-estimate"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[11px] font-medium text-gray-600">
              {{ t('下一次请求预计输入', 'Estimated input for the next request') }}
            </p>
            <p class="mt-0.5 text-lg font-bold leading-tight text-gray-950">
              {{ t(`约 ${formatNumber(tokenEstimate.totalTokens)} tokens`, `About ${formatNumber(tokenEstimate.totalTokens)} tokens`) }}
            </p>
          </div>
          <i class="fas fa-gauge-high mt-1 text-sm text-blue-500" aria-hidden="true"></i>
        </div>
        <div class="mt-3 grid grid-cols-1 gap-1.5 text-[11px]">
          <div
            v-for="row in tokenEstimateRows"
            :key="row.id"
            class="flex items-center justify-between gap-3"
            :data-testid="`thread-token-estimate-${row.id}`"
          >
            <span class="text-gray-500">{{ row.label }}</span>
            <strong class="font-semibold text-gray-800">
              {{ t(`约 ${formatNumber(row.tokens)}`, `About ${formatNumber(row.tokens)}`) }}
            </strong>
          </div>
        </div>
        <p class="mt-3 border-t border-gray-100 pt-2 text-[10px] leading-4 text-gray-500">
          {{
            t(
              '按当前聊天记录和已保存设置估算。不同模型会有差异；图片本身未计入，也不会因此限制或删减文本。',
              'Based on current history and saved settings. Counts vary by model; images are not included, and no text is limited or removed.',
            )
          }}
        </p>
      </div>
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold text-sm text-gray-900">
            {{ t('当前 WorldBook 上下文', 'Current WorldBook context') }}
          </p>
          <p class="mt-1 text-[10px] text-gray-500">
            {{
              t(
                'Chat 会始终读取主/全局世界观，并只注入当前角色已绑定且启用的百科条目。',
                'Chat always reads the main/global worldview and only injects enabled encyclopedia entries bound to this role.',
              )
            }}
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="thread-worldbook-open"
            class="rounded-full border border-blue-200 bg-white px-2 py-1 text-[11px] text-blue-700"
            @click="$emit('open-worldbook')"
          >
            WorldBook
          </button>
          <span class="rounded-full bg-white px-2 py-1 text-[11px] text-blue-700">
            {{ worldKernelState.injectedCount }} / {{ worldKernelState.configuredCount }}
          </span>
        </div>
      </div>

      <div class="rounded-lg border border-white bg-white/80 p-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-medium text-gray-700">
            {{ t('全局世界观', 'Global worldview') }}
          </span>
          <span
            class="text-[10px]"
            data-testid="thread-worldbook-worldview-count"
          >
            {{ worldKernelState.worldviewCharCount }}
          </span>
        </div>
        <p
          class="mt-1 text-[11px]"
          data-testid="thread-worldbook-worldview-preview"
          :class="worldKernelState.hasWorldview ? 'text-gray-600' : 'text-gray-400'"
        >
          {{
            worldKernelState.hasWorldview
              ? worldKernelState.worldviewPreview
              : t('当前没有额外世界观文本。', 'No extra worldview text is active right now.')
          }}
        </p>
      </div>

      <div class="rounded-lg border border-white bg-white/80 p-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-medium text-gray-700">
            {{ t('当前注入的百科条目', 'Encyclopedia entries in effect') }}
          </span>
          <span
            class="text-[10px] text-gray-500"
            data-testid="thread-worldbook-active-count"
          >
            {{ worldKernelState.injectedCount }} / {{ worldKernelState.configuredCount }}
          </span>
        </div>
        <p class="mt-1 text-[10px] text-gray-500">
          {{
            worldKernelState.roleBound
              ? t(`来源角色：${sourceRoleName}`, `Source role: ${sourceRoleName}`)
              : t('当前会话未绑定角色档案。', 'This thread is not bound to a role profile.')
          }}
        </p>

        <div
          v-if="worldKernelState.injectedPoints.length > 0"
          class="mt-2 flex flex-wrap gap-2"
        >
          <button
            v-for="point in worldKernelState.injectedPoints"
            :key="point.id"
            type="button"
            :data-testid="`thread-worldbook-point-${point.id}`"
            class="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700"
            @click="$emit('open-worldbook', point.id)"
          >
            {{ point.title }}
          </button>
        </div>
        <p
          v-else
          class="mt-2 text-[11px] text-gray-400"
          data-testid="thread-worldbook-empty"
        >
          {{
            t(
              '当前没有可注入的启用百科条目。',
              'There are no enabled encyclopedia entries available to inject.',
            )
          }}
        </p>

        <div
          v-if="
            worldKernelState.disabledCount > 0 ||
            worldKernelState.missingCount > 0 ||
            worldKernelState.overflowCount > 0
          "
          class="mt-2 flex flex-wrap items-center gap-1.5"
          data-testid="thread-worldbook-binding-note"
        >
          <span class="text-[10px] text-amber-600">{{ t('未注入：', 'Not injected:') }}</span>
          <button
            v-if="worldKernelState.disabledCount > 0"
            type="button"
            class="thread-repair-link"
            data-testid="thread-worldbook-disabled-link"
            @click="$emit('open-worldbook-disabled')"
          >
            {{ t(`停用 ${worldKernelState.disabledCount} 条`, `${worldKernelState.disabledCount} disabled`) }}
          </button>
          <button
            v-if="worldKernelState.missingCount > 0"
            type="button"
            class="thread-repair-link"
            data-testid="thread-worldbook-missing-link"
            @click="$emit('open-contacts-profile')"
          >
            {{ t(`缺失 ${worldKernelState.missingCount} 条`, `${worldKernelState.missingCount} missing`) }}
          </button>
          <button
            v-if="worldKernelState.overflowCount > 0"
            type="button"
            class="thread-repair-link"
            data-testid="thread-worldbook-overflow-link"
            @click="$emit('open-contacts-profile')"
          >
            {{ t(`超出上限 ${worldKernelState.overflowCount} 条`, `${worldKernelState.overflowCount} over the limit`) }}
          </button>
          <span class="text-[10px] text-gray-400">{{ t('点按可前往修复', 'Tap to repair') }}</span>
        </div>
      </div>
      </div>
    </details>

    <details class="group py-1">
      <summary class="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-medium text-gray-900">
        <span>{{ t('本会话头像', 'Chat avatars') }}</span>
        <i class="fas fa-chevron-down text-[11px] text-gray-400 transition-transform group-open:rotate-180"></i>
      </summary>
      <div class="space-y-2 pb-4">
      <label class="block space-y-1">
        <span class="text-[11px] text-gray-500">{{ t('我的头像（会话级）', 'My avatar (thread-level)') }}</span>
        <input
          :value="threadIdentityDraft.selfAvatar"
          type="text"
          class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
          placeholder="https://..."
          @input="updateIdentity('selfAvatar', $event.target.value)"
        />
      </label>
      <label class="block space-y-1">
        <span class="text-[11px] text-gray-500">{{ t('对方头像（会话级）', 'Contact avatar (thread-level)') }}</span>
        <input
          :value="threadIdentityDraft.contactAvatar"
          type="text"
          class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
          placeholder="https://..."
          @input="updateIdentity('contactAvatar', $event.target.value)"
        />
      </label>
      <p class="text-[10px] text-gray-400">
        {{ t('只影响当前聊天；留空会使用你的默认头像和联系人头像。', 'Only affects this chat. Leave blank to use the default avatars.') }}
      </p>
      <div class="flex justify-end gap-2 pt-1">
        <button
          @click="$emit('clear-thread-identity')"
          class="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600"
        >
          {{ t('清空', 'Clear') }}
        </button>
        <button
          @click="$emit('save-thread-identity')"
          class="px-2.5 py-1 rounded-lg border border-violet-200 bg-violet-50 text-violet-700"
        >
          {{ t('保存头像', 'Save avatars') }}
        </button>
      </div>
      </div>
    </details>

    <details class="group py-1">
      <summary class="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-medium text-gray-900">
        <span>{{ t('回复与自动聊天', 'Replies and auto chat') }}</span>
        <i class="fas fa-chevron-down text-[11px] text-gray-400 transition-transform group-open:rotate-180"></i>
      </summary>
      <div class="space-y-2 pb-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-semibold text-sm text-gray-900">{{ t('本会话回复偏好', 'Reply preferences for this chat') }}</p>
          <p class="mt-0.5 text-[10px] text-gray-500">
            {{ t('这些设置只影响当前聊天。', 'These settings only affect this chat.') }}
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] text-blue-700"
          @click="$emit('apply-default-thread-preset')"
        >
          {{ t('套用默认预设', 'Apply default preset') }}
        </button>
      </div>

      <label class="flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5">{{ t('回复模式', 'Reply Mode') }}<em v-if="isThreadSettingOverridden('replyMode')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <select
          :value="threadSettingsDraft.replyMode"
          class="rounded-lg border border-gray-200 px-2 py-1"
          @change="updateSetting('replyMode', $event.target.value)"
        >
          <option v-for="item in replyModeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>

      <label class="flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5">{{ t('每次触发回复条数', 'Replies per trigger') }}<em v-if="isThreadSettingOverridden('replyCount')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <input
          :value="threadSettingsDraft.replyCount"
          type="number"
          min="1"
          max="3"
          class="w-20 rounded-lg border border-gray-200 px-2 py-1 text-right"
          @input="updateNumberSetting('replyCount', $event.target.value)"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5">{{ t('回复风格', 'Response style') }}<em v-if="isThreadSettingOverridden('responseStyle')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <select
          :value="threadSettingsDraft.responseStyle"
          class="rounded-lg border border-gray-200 px-2 py-1"
          @change="updateSetting('responseStyle', $event.target.value)"
        >
          <option v-for="item in responseStyleOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>

      <label class="flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5">{{ t('可选回复建议', 'Suggested replies') }}<em v-if="isThreadSettingOverridden('suggestedRepliesEnabled')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <input
          :checked="threadSettingsDraft.suggestedRepliesEnabled"
          type="checkbox"
          class="h-4 w-4"
          @change="updateSetting('suggestedRepliesEnabled', $event.target.checked)"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5">{{ t('双语输出', 'Bilingual output') }}<em v-if="isThreadSettingOverridden('bilingualEnabled')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <input
          :checked="threadSettingsDraft.bilingualEnabled"
          type="checkbox"
          class="h-4 w-4"
          @change="updateSetting('bilingualEnabled', $event.target.checked)"
        />
      </label>

      <label class="flex items-center justify-between gap-3" v-if="threadSettingsDraft.bilingualEnabled">
        <span class="inline-flex items-center gap-1.5">{{ t('第二语言', 'Secondary language') }}<em v-if="isThreadSettingOverridden('secondaryLanguage')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <input
          :value="threadSettingsDraft.secondaryLanguage"
          type="text"
          class="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right"
          @input="updateSetting('secondaryLanguage', $event.target.value)"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span>{{ t('允许引用回复', 'Allow quote reply') }}</span>
        <input
          :checked="threadSettingsDraft.allowQuoteReply"
          type="checkbox"
          class="h-4 w-4"
          @change="updateSetting('allowQuoteReply', $event.target.checked)"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5">{{ t('允许引用自己', 'Allow self quote') }}<em v-if="isThreadSettingOverridden('allowSelfQuote')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <input
          :checked="threadSettingsDraft.allowSelfQuote"
          type="checkbox"
          class="h-4 w-4"
          :disabled="!threadSettingsDraft.allowQuoteReply"
          @change="updateSetting('allowSelfQuote', $event.target.checked)"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5">{{ t('虚拟语音', 'Virtual voice') }}<em v-if="isThreadSettingOverridden('virtualVoiceEnabled')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <input
          :checked="threadSettingsDraft.virtualVoiceEnabled"
          type="checkbox"
          class="h-4 w-4"
          @change="updateSetting('virtualVoiceEnabled', $event.target.checked)"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5">{{ t('读取上文轮数', 'Context turns') }}<em v-if="isThreadSettingOverridden('contextTurns')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <input
          :value="threadSettingsDraft.contextTurns"
          type="number"
          min="2"
          max="20"
          class="w-20 rounded-lg border border-gray-200 px-2 py-1 text-right"
          @input="updateNumberSetting('contextTurns', $event.target.value)"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5">{{ t('参考图模式', 'Image reference mode') }}<em v-if="isThreadSettingOverridden('imageReferenceMode')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <select
          :value="threadSettingsDraft.imageReferenceMode"
          class="rounded-lg border border-gray-200 px-2 py-1"
          @change="updateSetting('imageReferenceMode', $event.target.value)"
        >
          <option v-for="item in imageReferenceModeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <label class="flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5">{{ t('无参考图时允许图片消息', 'Allow image blocks without references') }}<em v-if="isThreadSettingOverridden('allowImageVirtualWithoutReference')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <input
          :checked="threadSettingsDraft.allowImageVirtualWithoutReference"
          type="checkbox"
          class="h-4 w-4"
          @change="updateSetting('allowImageVirtualWithoutReference', $event.target.checked)"
        />
      </label>
      <p class="text-[10px] text-gray-500">
        {{
          t(
            '自动模式会按供应商能力优先使用原生图输入，失败时自动回退为上下文线索。',
            'Auto mode prefers native image input when supported and falls back to context cues on unsupported responses.',
          )
        }}
      </p>
      <p
        class="text-[10px]"
        :class="roleImageReferenceAvailability.hasAny ? 'text-gray-500' : threadSettingsDraft.allowImageVirtualWithoutReference ? 'text-orange-500' : 'text-emerald-600'"
      >
        {{ threadImageBlockPolicyHint }}
      </p>
      <p class="text-[10px] text-gray-400">
        {{
          t(
            '本地素材会在大小允许时转为参考图输入；超出上限时会仅作为文字线索。',
            'Local assets are converted to reference images when size allows; oversized files degrade to text-only cues.',
          )
        }}
      </p>

      <label class="flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5">{{ t('主动开场', 'Proactive opener') }}<em v-if="isThreadSettingOverridden('proactiveOpenerEnabled')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <input
          :checked="threadSettingsDraft.proactiveOpenerEnabled"
          type="checkbox"
          class="h-4 w-4"
          @change="updateSetting('proactiveOpenerEnabled', $event.target.checked)"
        />
      </label>

      <label class="flex items-center justify-between gap-3" v-if="threadSettingsDraft.proactiveOpenerEnabled">
        <span class="inline-flex items-center gap-1.5">{{ t('主动策略', 'Proactive strategy') }}<em v-if="isThreadSettingOverridden('proactiveOpenerStrategy')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
        <select
          :value="threadSettingsDraft.proactiveOpenerStrategy"
          class="rounded-lg border border-gray-200 px-2 py-1"
          @change="updateSetting('proactiveOpenerStrategy', $event.target.value)"
        >
          <option v-for="item in proactiveStrategyOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>

      <div class="border-t border-gray-200 pt-2 space-y-2">
        <div class="flex items-center justify-between gap-3">
          <span class="inline-flex items-center gap-1.5">{{ t('定时自主调用', 'Timed autonomous invoke') }}<em v-if="isThreadSettingOverridden('autoInvokeEnabled')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
          <input
            :checked="threadSettingsDraft.autoInvokeEnabled"
            type="checkbox"
            class="h-4 w-4"
            :disabled="!chatAutomationEnabled"
            @change="updateSetting('autoInvokeEnabled', $event.target.checked)"
          />
        </div>
        <label class="flex items-center justify-between gap-3">
          <span class="inline-flex items-center gap-1.5">{{ t('自主调用间隔（秒）', 'Invoke interval (sec)') }}<em v-if="isThreadSettingOverridden('autoInvokeIntervalSec')" class="thread-override-chip">{{ t('已覆盖', 'Custom') }}</em></span>
          <input
            :value="threadSettingsDraft.autoInvokeIntervalSec"
            type="number"
            min="60"
            max="86400"
            class="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right"
            :disabled="!threadSettingsDraft.autoInvokeEnabled"
            @input="updateNumberSetting('autoInvokeIntervalSec', $event.target.value)"
          />
        </label>
        <p v-if="!chatAutomationEnabled" class="text-[10px] text-orange-500">
          {{ t('全局或 Chat 模块自动响应未开启，请先到设置中开启。', 'Global or Chat automation is disabled. Enable it in Settings first.') }}
        </p>
        <p v-else class="text-[10px] text-gray-500">
          {{ autoScheduleHintText }}
        </p>
        <p
          v-if="chatAutomationEnabled && autoBackgroundReminderHint.text"
          class="text-[10px]"
          :class="
            autoBackgroundReminderHint.tone === 'success'
              ? 'text-emerald-600'
              : autoBackgroundReminderHint.tone === 'warning'
                ? 'text-orange-500'
                : 'text-gray-500'
          "
        >
          {{ autoBackgroundReminderHint.text }}
        </p>
        <p v-if="chatAutomationEnabled && autoLastTriggeredHintText" class="text-[10px] text-gray-500">
          {{ autoLastTriggeredHintText }}
        </p>
        <p v-if="chatAutomationEnabled && autoRestoreSettlementHintText" class="text-[10px] text-gray-500">
          {{ autoRestoreSettlementHintText }}
        </p>
        <p class="text-[10px] text-gray-400">
          {{ t('手动触发优先；若与自动触发接近重叠，自动调用会顺延到下一周期。', 'Manual trigger has priority. If it overlaps with auto invoke, autonomous call is deferred to next cycle.') }}
        </p>
      </div>

      </div>
    </details>
        </div>
      </div>

      <footer class="chat-thread-menu-footer">
        <p class="chat-thread-menu-footer__note">
          {{ t('会话头像在上方「本会话头像」分区单独保存；上方修改偏好后可在此保存。', 'Thread avatars save in the Avatars section above; save preference edits here.') }}
        </p>
        <div class="chat-thread-menu-footer__actions">
          <button type="button" class="chat-thread-menu-footer__cancel" @click="$emit('close')">
            {{ t('取消', 'Cancel') }}
          </button>
          <button
            type="button"
            class="chat-thread-menu-footer__save"
            :class="{ 'is-saved': threadSettingsSaved }"
            data-testid="thread-settings-save"
            @click="$emit('save-thread-settings')"
          >
            <span v-if="threadSettingsDirty && !threadSettingsSaved" class="chat-thread-menu-footer__dirty" aria-hidden="true"></span>
            {{ threadSettingsSaved ? t('已保存', 'Saved') : t('保存设置', 'Save settings') }}
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.thread-override-chip {
  font-style: normal;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--chat-accent-soft);
  color: var(--chat-accent-ink);
}

.thread-repair-link {
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--system-warning);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.thread-repair-link:hover {
  color: var(--chat-accent-ink);
}

.chat-thread-menu-footer {
  flex: none;
  display: grid;
  gap: 8px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--chat-panel-border);
  background: var(--chat-panel-bg);
}

.chat-thread-menu-footer__note {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--chat-muted-ink);
}

.chat-thread-menu-footer__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.chat-thread-menu-footer__cancel,
.chat-thread-menu-footer__save {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid var(--chat-panel-border);
  background: var(--chat-panel-muted-bg);
  color: var(--chat-muted-ink);
  cursor: pointer;
}

.chat-thread-menu-footer__save {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-color: color-mix(in srgb, var(--chat-send-bg) 42%, transparent);
  background: var(--chat-accent-soft);
  color: var(--chat-accent-ink);
}

.chat-thread-menu-footer__save.is-saved {
  border-color: var(--system-success-soft);
  background: var(--system-success-soft);
  color: var(--system-success);
}

.chat-thread-menu-footer__dirty {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--chat-accent-ink);
}
</style>
