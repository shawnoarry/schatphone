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
  messageEditState: {
    type: Object,
    required: true,
  },
})

defineEmits(['close', 'submit', 'update:editing-message-draft-text'])

const { t } = useI18n()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 pb-4 sm:pb-0">
    <button
      type="button"
      class="absolute inset-0 bg-black/35"
      @click="$emit('close')"
    ></button>

    <div class="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-2xl">
      <p class="text-sm font-semibold text-gray-900">
        {{
          editingMessageRole === 'assistant'
            ? t('修订 AI 消息', 'Revise AI message')
            : t('编辑用户消息', 'Edit user message')
        }}
      </p>
      <p class="mt-1 text-[11px] text-gray-500">
        {{
          editingMessageRole === 'assistant'
            ? t('修订内容会进入后续上下文，避免对话断层。', 'Revised text will be used for following context.')
            : t('将直接更新当前消息文本。', 'This will update the current message text directly.')
        }}
      </p>

      <textarea
        :value="editingMessageDraftText"
        rows="5"
        class="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none resize-none"
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
          class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          @click="$emit('close')"
        >
          {{ t('取消', 'Cancel') }}
        </button>
        <button
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
