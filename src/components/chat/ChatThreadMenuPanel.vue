<script setup>
import { computed } from 'vue'
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
  worldKernelState: {
    type: Object,
    required: true,
  },
  threadIdentityDraft: {
    type: Object,
    required: true,
  },
  threadSettingsDraft: {
    type: Object,
    required: true,
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
  'open-worldbook',
  'save-thread-identity',
  'save-thread-settings',
  'update-thread-identity',
  'update-thread-setting',
])

const { t } = useI18n()

const sourceRoleName = computed(
  () => props.worldKernelState.profileName || props.activeChat?.name || '',
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

const updateSetting = (key, value) => {
  emit('update-thread-setting', { key, value })
}

const updateNumberSetting = (key, value) => {
  const numericValue = Number(value)
  emit('update-thread-setting', {
    key,
    value: Number.isFinite(numericValue) ? numericValue : value,
  })
}
</script>

<template>
  <div class="mx-3 mt-2 rounded-2xl border border-gray-200 bg-white/90 backdrop-blur p-3 text-xs text-gray-600 space-y-3">
    <template v-if="isActiveServiceChat">
      <div class="space-y-2">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-sm text-gray-900">{{ t('服务模板摘要', 'Service template summary') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">
              {{ serviceTemplateSummary }}
            </p>
          </div>
          <button
            @click="$emit('open-chat-directory')"
            class="shrink-0 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            {{ t('去管理', 'Manage') }}
          </button>
        </div>
        <p class="text-[10px] text-gray-400">
          {{
            t(
              '服务号模板只保留一个正式编辑入口：Chat Directory。此处仅展示当前会话正在使用的模板。',
              'Service templates have one formal edit entry: Chat Directory. This menu only shows the active template.',
            )
          }}
        </p>
      </div>
    </template>

    <div
      class="space-y-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3"
      data-testid="thread-worldbook-summary"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold text-sm text-gray-900">
            {{ t('当前 WorldBook 上下文', 'Current WorldBook context') }}
          </p>
          <p class="mt-1 text-[10px] text-gray-500">
            {{
              t(
                'Chat 会始终读取全局世界观，并只注入当前角色已绑定且启用的知识点。',
                'Chat always reads the global worldview and only injects enabled knowledge points bound to this role.',
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
            {{ t('当前注入的知识点', 'Knowledge points in effect') }}
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
              '当前没有可注入的启用知识点。',
              'There are no enabled bound knowledge points active for this thread.',
            )
          }}
        </p>

        <p
          v-if="
            worldKernelState.disabledCount > 0 ||
            worldKernelState.missingCount > 0 ||
            worldKernelState.overflowCount > 0
          "
          class="mt-2 text-[10px] text-amber-600"
          data-testid="thread-worldbook-binding-note"
        >
          {{
            t(
              `未注入：停用 ${worldKernelState.disabledCount} 条，缺失 ${worldKernelState.missingCount} 条，超出上限 ${worldKernelState.overflowCount} 条。`,
              `Not injected: ${worldKernelState.disabledCount} disabled, ${worldKernelState.missingCount} missing, ${worldKernelState.overflowCount} over the limit.`,
            )
          }}
        </p>
      </div>
    </div>

    <div class="border-t border-gray-200 pt-3 space-y-2">
      <p class="font-semibold text-sm text-gray-900">{{ t('会话身份覆写', 'Thread identity overrides') }}</p>
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
        {{ t('优先级：会话 > 模块 > 全局 > 默认。留空将回退到下一级。', 'Priority: thread > module > global > fallback. Leave blank to fall back.') }}
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
          {{ t('保存身份覆写', 'Save identity overrides') }}
        </button>
      </div>
    </div>

    <div class="border-t border-gray-200 pt-3 space-y-2">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-semibold text-sm text-gray-900">{{ t('当前会话调校', 'Current thread tuning') }}</p>
          <p class="mt-0.5 text-[10px] text-gray-500">
            {{ t('回复预设在具体会话里调用，保存后只影响当前会话。', 'Apply reply presets here; saving only affects this thread.') }}
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
        <span>{{ t('回复模式', 'Reply Mode') }}</span>
        <select
          :value="threadSettingsDraft.replyMode"
          class="rounded-lg border border-gray-200 px-2 py-1"
          @change="updateSetting('replyMode', $event.target.value)"
        >
          <option v-for="item in replyModeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>

      <label class="flex items-center justify-between gap-3">
        <span>{{ t('每次触发回复条数', 'Replies per trigger') }}</span>
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
        <span>{{ t('回复风格', 'Response style') }}</span>
        <select
          :value="threadSettingsDraft.responseStyle"
          class="rounded-lg border border-gray-200 px-2 py-1"
          @change="updateSetting('responseStyle', $event.target.value)"
        >
          <option v-for="item in responseStyleOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>

      <label class="flex items-center justify-between gap-3">
        <span>{{ t('可选回复建议', 'Suggested replies') }}</span>
        <input
          :checked="threadSettingsDraft.suggestedRepliesEnabled"
          type="checkbox"
          class="h-4 w-4"
          @change="updateSetting('suggestedRepliesEnabled', $event.target.checked)"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span>{{ t('双语输出', 'Bilingual output') }}</span>
        <input
          :checked="threadSettingsDraft.bilingualEnabled"
          type="checkbox"
          class="h-4 w-4"
          @change="updateSetting('bilingualEnabled', $event.target.checked)"
        />
      </label>

      <label class="flex items-center justify-between gap-3" v-if="threadSettingsDraft.bilingualEnabled">
        <span>{{ t('第二语言', 'Secondary language') }}</span>
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
        <span>{{ t('允许引用自己', 'Allow self quote') }}</span>
        <input
          :checked="threadSettingsDraft.allowSelfQuote"
          type="checkbox"
          class="h-4 w-4"
          :disabled="!threadSettingsDraft.allowQuoteReply"
          @change="updateSetting('allowSelfQuote', $event.target.checked)"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span>{{ t('虚拟语音', 'Virtual voice') }}</span>
        <input
          :checked="threadSettingsDraft.virtualVoiceEnabled"
          type="checkbox"
          class="h-4 w-4"
          @change="updateSetting('virtualVoiceEnabled', $event.target.checked)"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span>{{ t('读取上文轮数', 'Context turns') }}</span>
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
        <span>{{ t('参考图模式', 'Image reference mode') }}</span>
        <select
          :value="threadSettingsDraft.imageReferenceMode"
          class="rounded-lg border border-gray-200 px-2 py-1"
          @change="updateSetting('imageReferenceMode', $event.target.value)"
        >
          <option v-for="item in imageReferenceModeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <label class="flex items-center justify-between gap-3">
        <span>{{ t('无参考图时允许图片消息', 'Allow image blocks without references') }}</span>
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
        <span>{{ t('主动开场', 'Proactive opener') }}</span>
        <input
          :checked="threadSettingsDraft.proactiveOpenerEnabled"
          type="checkbox"
          class="h-4 w-4"
          @change="updateSetting('proactiveOpenerEnabled', $event.target.checked)"
        />
      </label>

      <label class="flex items-center justify-between gap-3" v-if="threadSettingsDraft.proactiveOpenerEnabled">
        <span>{{ t('主动策略', 'Proactive strategy') }}</span>
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
          <span>{{ t('定时自主调用', 'Timed autonomous invoke') }}</span>
          <input
            :checked="threadSettingsDraft.autoInvokeEnabled"
            type="checkbox"
            class="h-4 w-4"
            :disabled="!chatAutomationEnabled"
            @change="updateSetting('autoInvokeEnabled', $event.target.checked)"
          />
        </div>
        <label class="flex items-center justify-between gap-3">
          <span>{{ t('自主调用间隔（秒）', 'Invoke interval (sec)') }}</span>
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

      <div class="flex justify-end gap-2 pt-1">
        <button @click="$emit('close')" class="px-2.5 py-1 rounded-lg border border-gray-200">{{ t('取消', 'Cancel') }}</button>
        <button
          @click="$emit('save-thread-settings')"
          class="px-2.5 py-1 rounded-lg border"
          :class="threadSettingsSaved ? 'border-green-300 bg-green-50 text-green-700' : 'border-blue-300 bg-blue-50 text-blue-700'"
        >
          {{ threadSettingsSaved ? t('已保存', 'Saved') : t('保存本会话调校', 'Save this thread tuning') }}
        </button>
      </div>
    </div>
  </div>
</template>
