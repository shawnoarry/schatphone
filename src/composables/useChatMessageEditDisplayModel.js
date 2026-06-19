import { computed } from 'vue'
import { buildMessageEditValidation, MESSAGE_EDIT_REASON } from '../lib/chat-message-edit'

export const CHAT_MESSAGE_EDITABLE_RICH_TYPES = new Set([
  'voice_virtual',
  'module_link',
  'link_external',
  'transfer_virtual',
  'image_virtual',
])

const DEFAULT_MAX_ASSISTANT_TEXT_CHARS = 3000

const translateWith = (t, zh, en) => (typeof t === 'function' ? t(zh, en) : en || zh)

const readRef = (source, fallback = '') =>
  source && typeof source === 'object' && 'value' in source ? source.value : source ?? fallback

const normalizeExternalUrl = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''
  const candidate = /^https?:\/\//i.test(raw) ? raw : /^www\./i.test(raw) ? `https://${raw}` : ''
  if (!candidate) return ''
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

const normalizeRichEditLine = (value = '', max = 120) =>
  (typeof value === 'string' ? value : String(value ?? ''))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)

const normalizeRichEditText = (value = '', max = 800) =>
  (typeof value === 'string' ? value : String(value ?? '')).trim().slice(0, max)

const comparableRichEditFields = (fields = {}) =>
  JSON.stringify(
    Object.keys(fields || {})
      .sort()
      .reduce((acc, key) => {
        acc[key] = fields[key]
        return acc
      }, {}),
  )

export const useChatMessageEditDisplayModel = ({
  editingMessageRichType,
  editingMessageRichFields,
  editingMessageOriginalRichFields,
  editingMessageDraftText,
  editingMessageOriginalText,
  editingMessageRole,
  maxAssistantTextChars = DEFAULT_MAX_ASSISTANT_TEXT_CHARS,
  t,
} = {}) => {
  const translate = (zh, en) => translateWith(t, zh, en)
  const readRichType = () => readRef(editingMessageRichType, '')
  const readMaxChars = () => {
    const value = readRef(maxAssistantTextChars, DEFAULT_MAX_ASSISTANT_TEXT_CHARS)
    const numeric = Number(value)
    return Number.isFinite(numeric) && numeric > 0
      ? Math.floor(numeric)
      : DEFAULT_MAX_ASSISTANT_TEXT_CHARS
  }

  const messageEditRichFieldDefinitions = computed(() => {
    if (readRichType() === 'link_external') {
      return [
        { key: 'label', label: translate('标题', 'Title') },
        { key: 'url', label: translate('链接', 'URL') },
        { key: 'note', label: translate('说明', 'Note'), multiline: true },
      ]
    }
    if (readRichType() === 'module_link') {
      return [
        { key: 'label', label: translate('标题', 'Title') },
        { key: 'note', label: translate('位置说明', 'Location note'), multiline: true },
      ]
    }
    if (readRichType() === 'transfer_virtual') {
      return [
        { key: 'amount', label: translate('金额', 'Amount') },
        { key: 'currency', label: translate('币种', 'Currency') },
        { key: 'note', label: translate('备注', 'Note'), multiline: true },
      ]
    }
    if (readRichType() === 'voice_virtual') {
      return [
        { key: 'transcript', label: translate('语音文本', 'Transcript'), multiline: true },
        { key: 'durationSec', label: translate('时长（秒）', 'Duration (sec)'), inputType: 'number' },
      ]
    }
    if (readRichType() === 'image_virtual') {
      return [
        { key: 'alt', label: translate('图片名称', 'Image name') },
        { key: 'caption', label: translate('图片说明', 'Caption'), multiline: true },
      ]
    }
    return []
  })

  const buildRichMessageEditState = () => {
    const type = readRichType()
    const fields = readRef(editingMessageRichFields, {}) || {}
    let blockPatch = null
    let content = ''

    if (type === 'link_external') {
      const url = normalizeExternalUrl(fields.url)
      if (!url) {
        return {
          valid: false,
          message: translate('链接格式无效，仅支持 http/https。', 'Invalid URL. Only http/https is supported.'),
        }
      }
      const label = normalizeRichEditLine(fields.label, 80) || translate('外部链接', 'External link')
      const note = normalizeRichEditText(fields.note, 800)
      blockPatch = { label, url, note }
      content = `${label}\n${url}`
    } else if (type === 'module_link') {
      const label = normalizeRichEditLine(fields.label, 80) || translate('模块链接', 'Module link')
      const note = normalizeRichEditText(fields.note, 800)
      blockPatch = { label, note }
      content = note ? `${label} · ${note}` : label
    } else if (type === 'transfer_virtual') {
      const amount = normalizeRichEditLine(fields.amount, 24)
      if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
        return {
          valid: false,
          message: translate('金额格式无效。', 'Invalid amount format.'),
        }
      }
      const currency = normalizeRichEditLine(fields.currency, 8).toUpperCase() || 'CNY'
      if (!/^[A-Z]{2,8}$/.test(currency)) {
        return {
          valid: false,
          message: translate('币种格式无效。', 'Invalid currency format.'),
        }
      }
      const note = normalizeRichEditText(fields.note, 800)
      blockPatch = { amount, currency, note }
      content = `${translate('转账', 'Transfer')} ${amount} ${currency}`
    } else if (type === 'voice_virtual') {
      const transcript = normalizeRichEditText(fields.transcript, 800)
      if (!transcript) {
        return {
          valid: false,
          message: translate('语音内容不能为空。', 'Voice transcript cannot be empty.'),
        }
      }
      const duration = Number(fields.durationSec)
      if (!Number.isFinite(duration)) {
        return {
          valid: false,
          message: translate('时长格式无效。', 'Invalid duration format.'),
        }
      }
      blockPatch = { transcript, durationSec: Math.min(600, Math.max(1, Math.floor(duration))) }
      content = transcript
    } else if (type === 'image_virtual') {
      const alt = normalizeRichEditLine(fields.alt, 80) || translate('图片消息', 'Image message')
      const caption = normalizeRichEditText(fields.caption, 800)
      blockPatch = { alt, caption }
      content = `${translate('图片', 'Image')}: ${alt}`
    }

    if (!blockPatch) {
      return {
        valid: false,
        message: translate('该卡片暂不支持字段编辑。', 'This card does not support field editing yet.'),
      }
    }

    if (comparableRichEditFields(blockPatch) === comparableRichEditFields(readRef(editingMessageOriginalRichFields, {}))) {
      return {
        valid: false,
        message: translate('卡片字段未变化。', 'Card fields unchanged.'),
        blockPatch,
        content,
      }
    }

    return {
      valid: true,
      message: translate('将更新卡片字段，并同步后续上下文。', 'Card fields will be updated for later context.'),
      blockPatch,
      content,
    }
  }

  const messageEditState = computed(() => {
    if (readRichType()) {
      return buildRichMessageEditState()
    }

    const maxChars = readMaxChars()
    const validation = buildMessageEditValidation({
      draftText: readRef(editingMessageDraftText, ''),
      originalText: readRef(editingMessageOriginalText, ''),
      role: readRef(editingMessageRole, 'user'),
      maxChars,
    })

    const messageMap = {
      [MESSAGE_EDIT_REASON.EMPTY]: translate('消息不能为空。', 'Message cannot be empty.'),
      [MESSAGE_EDIT_REASON.TOO_LONG]: translate(
        `文本不能超过 ${maxChars} 字。`,
        `Text cannot exceed ${maxChars} chars.`,
      ),
      [MESSAGE_EDIT_REASON.UNCHANGED]: translate('文本未变化。', 'Text unchanged.'),
      [MESSAGE_EDIT_REASON.READY_ASSISTANT]: translate(
        '修订后文本将作为后续上下文。',
        'Revised text will be used in later context.',
      ),
      [MESSAGE_EDIT_REASON.READY_USER]: translate(
        '将直接更新这条用户消息。',
        'This will directly update the user message.',
      ),
    }

    return {
      ...validation,
      message: messageMap[validation.reason] || '',
    }
  })

  return {
    messageEditRichFieldDefinitions,
    messageEditState,
  }
}
