<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  editingMessageRole: {
    type: String,
    default: 'user',
  },
  editingMessageDraftText: {
    type: String,
    default: '',
  },
  editingMessageRichType: {
    type: String,
    default: '',
  },
  editingMessageRichFields: {
    type: Object,
    default: () => ({}),
  },
  editingMessageRichFieldDefinitions: {
    type: Array,
    default: () => [],
  },
  messageEditState: {
    type: Object,
    required: true,
  },
})

defineEmits([
  'close',
  'submit',
  'update:editing-message-draft-text',
  'update:editing-message-rich-field',
])

const { t } = useI18n()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center px-3 pb-4 sm:items-center sm:pb-0">
    <button
      type="button"
      class="absolute inset-0 bg-black/35"
      @click="$emit('close')"
    ></button>

    <div class="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-2xl">
      <p class="text-sm font-semibold text-gray-900">
        <template v-if="editingMessageRichType">
          {{ editingMessageRole === 'assistant' ? t('编辑 AI 卡片', 'Edit AI card') : t('编辑卡片', 'Edit card') }}
        </template>
        <template v-else>
          {{
            editingMessageRole === 'assistant'
              ? t('修订 AI 消息', 'Revise AI message')
              : t('编辑用户消息', 'Edit user message')
          }}
        </template>
      </p>
      <p class="mt-1 text-[11px] text-gray-500">
        <template v-if="editingMessageRichType">
          {{ t('直接更新卡片字段，保持界面、复制和 AI 上下文一致。', 'Update card fields directly so UI, copy, and AI context stay aligned.') }}
        </template>
        <template v-else>
          {{
            editingMessageRole === 'assistant'
              ? t('修订内容会进入后续上下文，避免对话断层。', 'Revised text will be used for following context.')
              : t('将直接更新当前消息文本。', 'This will update the current message text directly.')
          }}
        </template>
      </p>

      <div v-if="editingMessageRichType" class="mt-3 space-y-2">
        <label
          v-for="field in editingMessageRichFieldDefinitions"
          :key="field.key"
          class="block"
        >
          <span class="text-[11px] font-medium text-gray-600">{{ field.label }}</span>
          <textarea
            v-if="field.multiline"
            :value="editingMessageRichFields[field.key] || ''"
            rows="3"
            class="mt-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
            :data-testid="`chat-message-edit-field-${field.key}`"
            @input="$emit('update:editing-message-rich-field', { key: field.key, value: $event.target.value })"
          ></textarea>
          <input
            v-else
            :type="field.inputType || 'text'"
            :value="editingMessageRichFields[field.key] || ''"
            class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
            :data-testid="`chat-message-edit-field-${field.key}`"
            @input="$emit('update:editing-message-rich-field', { key: field.key, value: $event.target.value })"
          />
        </label>
      </div>

      <textarea
        v-else
        data-testid="chat-message-edit-textarea"
        :value="editingMessageDraftText"
        rows="5"
        class="mt-3 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
        :placeholder="t('输入修订后的消息文本', 'Enter revised message text')"
        @input="$emit('update:editing-message-draft-text', $event.target.value)"
      ></textarea>

      <p
        class="mt-2 text-[11px]"
        :class="messageEditState.valid ? 'text-gray-500' : 'text-amber-600'"
      >
        {{ messageEditState.message }}
      </p>

      <div class="mt-3 flex items-center justify-end gap-2">
        <button
          data-testid="chat-message-edit-cancel"
          class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          @click="$emit('close')"
        >
          {{ t('取消', 'Cancel') }}
        </button>
        <button
          data-testid="chat-message-edit-save"
          class="rounded-lg border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="messageEditState.valid ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-gray-100 text-gray-500'"
          :disabled="!messageEditState.valid"
          @click="$emit('submit')"
        >
          {{ t('保存', 'Save') }}
        </button>
      </div>
    </div>
  </div>
</template>
