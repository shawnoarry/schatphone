<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useDialog } from '../composables/useDialog'

const {
  dialogState,
  canSubmitDialog,
  cancelDialog,
  submitDialog,
  setDialogInputValue,
} = useDialog()

const inputRef = ref(null)

const focusInput = async () => {
  if (!dialogState.visible || dialogState.kind !== 'prompt') return
  await nextTick()
  const el = inputRef.value
  if (!el || typeof el.focus !== 'function') return
  el.focus()
  if (typeof el.select === 'function') {
    el.select()
  }
}

const onDocumentKeydown = (event) => {
  if (!dialogState.visible) return
  if (event.key === 'Escape') {
    if (dialogState.dismissible !== false) {
      event.preventDefault()
      cancelDialog()
    }
    return
  }
  if (dialogState.kind === 'prompt' && dialogState.inputMultiline) return
  if (event.key === 'Enter') {
    event.preventDefault()
    submitDialog()
  }
}

watch(
  () => dialogState.visible,
  (visible) => {
    if (visible) {
      void focusInput()
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
})

watch(
  () => dialogState.visible,
  (visible) => {
    if (visible) {
      document.addEventListener('keydown', onDocumentKeydown)
      return
    }
    document.removeEventListener('keydown', onDocumentKeydown)
  },
  { immediate: true },
)

const toneClass = () => {
  if (dialogState.tone === 'danger') {
    return 'border-red-200 bg-red-500 hover:bg-red-600 text-white'
  }
  if (dialogState.tone === 'accent') {
    return 'border-blue-200 bg-blue-500 hover:bg-blue-600 text-white'
  }
  return 'border-gray-200 bg-gray-900 hover:bg-black text-white'
}
</script>

<template>
  <Teleport to="body">
    <transition name="dialog-fade">
      <div
        v-if="dialogState.visible"
        class="fixed inset-0 z-[999] flex items-center justify-center bg-black/45 px-4"
        @click.self="dialogState.dismissible !== false ? cancelDialog() : null"
      >
        <div class="w-full max-w-sm rounded-[28px] bg-white p-4 shadow-2xl border border-black/5">
          <div class="space-y-2">
            <p v-if="dialogState.title" class="text-base font-bold text-gray-900">
              {{ dialogState.title }}
            </p>
            <p
              v-if="dialogState.message"
              class="text-sm text-gray-600 whitespace-pre-wrap leading-6"
            >
              {{ dialogState.message }}
            </p>
            <div
              v-if="dialogState.details.length > 0"
              class="space-y-1.5 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <p
                v-for="(line, index) in dialogState.details"
                :key="`dialog-line-${index}`"
                class="text-xs leading-5 text-gray-500 whitespace-pre-wrap"
              >
                {{ line }}
              </p>
            </div>
          </div>

          <div v-if="dialogState.kind === 'prompt'" class="mt-4 space-y-2">
            <label v-if="dialogState.inputLabel" class="block text-xs text-gray-500">
              {{ dialogState.inputLabel }}
            </label>
            <textarea
              v-if="dialogState.inputMultiline"
              ref="inputRef"
              :rows="dialogState.inputRows"
              :value="dialogState.inputValue"
              :placeholder="dialogState.inputPlaceholder"
              class="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none resize-none"
              @input="setDialogInputValue($event?.target?.value || '')"
            ></textarea>
            <input
              v-else
              ref="inputRef"
              :type="dialogState.inputType"
              :value="dialogState.inputValue"
              :placeholder="dialogState.inputPlaceholder"
              class="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none"
              @input="setDialogInputValue($event?.target?.value || '')"
            />
            <p v-if="dialogState.inputError" class="text-xs text-red-500">
              {{ dialogState.inputError }}
            </p>
          </div>

          <div class="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-2xl border border-gray-200 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50"
              @click="cancelDialog"
            >
              {{ dialogState.cancelText }}
            </button>
            <button
              type="button"
              class="rounded-2xl border px-3.5 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50"
              :class="toneClass()"
              :disabled="!canSubmitDialog"
              @click="submitDialog"
            >
              {{ dialogState.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from > div,
.dialog-fade-leave-to > div {
  transform: translateY(10px) scale(0.98);
}
</style>
