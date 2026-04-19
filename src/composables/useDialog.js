import { computed, reactive, readonly } from 'vue'

const createDefaultState = () => ({
  visible: false,
  kind: 'confirm',
  title: '',
  message: '',
  details: [],
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  tone: 'default',
  dismissible: true,
  inputLabel: '',
  inputPlaceholder: '',
  inputType: 'text',
  inputValue: '',
  inputMultiline: false,
  inputRows: 3,
  inputRequired: false,
  inputRequiredMessage: '',
  inputError: '',
})

const state = reactive(createDefaultState())
const queue = []
let activeEntry = null

const normalizeLineList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }
  if (typeof value !== 'string') return []
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

const applyState = (patch) => {
  Object.assign(state, createDefaultState(), patch)
}

const settleActiveEntry = (result) => {
  const resolver = activeEntry?.resolve
  activeEntry = null
  applyState(createDefaultState())
  if (typeof resolver === 'function') {
    resolver(result)
  }
  if (queue.length > 0) {
    activateEntry(queue.shift())
  }
}

const computePromptError = (rawValue = state.inputValue) => {
  if (state.kind !== 'prompt') return ''
  const raw = typeof rawValue === 'string' ? rawValue : ''
  const normalized = activeEntry?.trim === false ? raw : raw.trim()
  if (state.inputRequired && !normalized) {
    return (
      state.inputRequiredMessage ||
      'Input is required.'
    )
  }
  if (typeof activeEntry?.validate === 'function') {
    const validationResult = activeEntry.validate(normalized, raw)
    if (typeof validationResult === 'string' && validationResult.trim()) {
      return validationResult.trim()
    }
  }
  return ''
}

const activateEntry = (entry) => {
  activeEntry = entry
  applyState({
    visible: true,
    kind: entry.kind,
    title: entry.title || '',
    message: entry.message || '',
    details: normalizeLineList(entry.details),
    confirmText: entry.confirmText || 'Confirm',
    cancelText: entry.cancelText || 'Cancel',
    tone: entry.tone || 'default',
    dismissible: entry.dismissible !== false,
    inputLabel: entry.inputLabel || '',
    inputPlaceholder: entry.inputPlaceholder || '',
    inputType: entry.inputType || 'text',
    inputValue: typeof entry.initialValue === 'string' ? entry.initialValue : '',
    inputMultiline: entry.inputMultiline === true,
    inputRows:
      Number.isFinite(Number(entry.inputRows)) && Number(entry.inputRows) > 1
        ? Math.floor(Number(entry.inputRows))
        : 3,
    inputRequired: entry.inputRequired === true,
    inputRequiredMessage: entry.inputRequiredMessage || '',
  })
  state.inputError = computePromptError(state.inputValue)
}

const enqueueEntry = (entry) =>
  new Promise((resolve) => {
    const payload = { ...entry, resolve }
    if (activeEntry) {
      queue.push(payload)
      return
    }
    activateEntry(payload)
  })

const confirmDialog = (options = {}) =>
  enqueueEntry({
    kind: 'confirm',
    ...options,
  }).then((result) => result === true)

const promptDialog = (options = {}) =>
  enqueueEntry({
    kind: 'prompt',
    ...options,
  }).then((result) => (typeof result === 'string' ? result : null))

const cancelDialog = () => {
  if (!activeEntry) return
  settleActiveEntry(activeEntry.kind === 'prompt' ? null : false)
}

const submitDialog = () => {
  if (!activeEntry) return
  if (state.kind === 'prompt') {
    const error = computePromptError(state.inputValue)
    state.inputError = error
    if (error) return
    const raw = typeof state.inputValue === 'string' ? state.inputValue : ''
    const nextValue = activeEntry.trim === false ? raw : raw.trim()
    settleActiveEntry(nextValue)
    return
  }
  settleActiveEntry(true)
}

const setDialogInputValue = (nextValue) => {
  state.inputValue = typeof nextValue === 'string' ? nextValue : ''
  state.inputError = computePromptError(state.inputValue)
}

const canSubmitDialog = computed(() => {
  if (!state.visible) return false
  if (state.kind !== 'prompt') return true
  return !state.inputError
})

const resetDialogServiceForTest = () => {
  queue.splice(0, queue.length)
  activeEntry = null
  applyState(createDefaultState())
}

export const dialogState = readonly(state)

export const useDialog = () => ({
  dialogState,
  canSubmitDialog,
  confirmDialog,
  promptDialog,
  cancelDialog,
  submitDialog,
  setDialogInputValue,
})

export { resetDialogServiceForTest }
