// Daon Mail AI arrival pipeline (roadmap 4.16 / SHP-1B).
// One explicit user-triggered provider call per "receive" action; strict draft
// validation; fail-closed without a deterministic substitute. Ordinary browsing
// stays zero-token. Generated letters are in-world display content with provider
// provenance and never become relationship, world, or owner facts.

import { callAI, requiresApiKeyForUrl } from './ai'
import { MAIL_SHELL_LABELS } from './mail-shell-data'

export const MAIL_ARRIVAL_LABEL_IDS = Object.freeze(Object.keys(MAIL_SHELL_LABELS))

const MAIL_ARRIVAL_TIMEOUT_MS = 45_000
const SENDER_NAME_MAX = 40
const SENDER_ADDRESS_MAX = 120
const SUBJECT_MAX = 120
const PARAGRAPH_MAX = 600
const BODY_PARAGRAPH_MIN = 1
const BODY_PARAGRAPH_MAX = 4
const WORLDVIEW_CONTEXT_MAX = 320
const PERSONA_CONTEXT_MAX = 120

const EMAIL_LIKE_PATTERN = /^[^\s@]{1,48}@[^\s@.]{2,}(\.[^\s@.]{2,})+$/
const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i

const LANGUAGE_NAMES = {
  zh: 'Simplified Chinese (简体中文)',
  en: 'English',
  ko: 'Korean (한국어)',
  ja: 'Japanese (日本語)',
}

export const resolveMailArrivalLanguageName = (languageBase = '') =>
  LANGUAGE_NAMES[languageBase] || LANGUAGE_NAMES.en

const clipContext = (text, limit) => {
  const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
  if (!normalized) return ''
  return normalized.length > limit ? `${normalized.slice(0, limit)}…` : normalized
}

export const buildMailArrivalPrompt = ({
  senders = [],
  allowNewSenders = true,
  worldName = '',
  worldview = '',
  persona = '',
  languageName = LANGUAGE_NAMES.en,
} = {}) => {
  const senderLines = senders
    .slice(0, 60)
    .map((sender) => `- ${sender.name} <${sender.address}>`)
    .join('\n')

  const systemPrompt = [
    'You write one incoming email for a life-simulation phone world (SchatPhone, default modern Seoul / K-pop setting).',
    'Output strict JSON only. No markdown fences, no HTML, no commentary.',
    'JSON shape: {"senderName": string, "senderAddress": string, "subject": string, "body": string[], "label": string}',
    `body is 1-4 paragraphs, each 1-3 sentences. label is one of ${JSON.stringify([
      ...MAIL_ARRIVAL_LABEL_IDS,
      '',
    ])} or an empty string.`,
    `The sender MUST be one of the known senders listed by the user (copy name and address exactly)${
      allowNewSenders
        ? ', OR you may invent ONE new fictional sender that fits this world (a fictional counterpart of a real-life service is fine; never use a real brand or trademark as the sender name)'
        : ' (inventing new senders is currently disabled)'
    }.`,
    'The letter must be an everyday, plausible piece of mail: a notice, schedule update, reservation, receipt or statement, subscription or membership message, fan-community letter, or a personal note.',
    'Never claim the letter itself changed any fact, balance, schedule, or relationship. Never request sensitive real-world data. Keep the tone consistent with the sender.',
    `Write the sender name, subject, and body in ${languageName}. Keep brand-style names (like 다온메일) as-is.`,
    'Stay consistent with the provided world and persona context when present.',
  ].join('\n')

  const contextLines = []
  const worldLine = clipContext(worldName, 80)
  if (worldLine) contextLines.push(`World: ${worldLine}`)
  const worldviewLine = clipContext(worldview, WORLDVIEW_CONTEXT_MAX)
  if (worldviewLine) contextLines.push(`World setting excerpt: ${worldviewLine}`)
  const personaLine = clipContext(persona, PERSONA_CONTEXT_MAX)
  if (personaLine) contextLines.push(`User persona: ${personaLine}`)
  contextLines.push('Known senders:')
  contextLines.push(senderLines || '- (none)')

  const messages = [
    {
      role: 'user',
      content: `${contextLines.join('\n')}\n\nGenerate one new incoming letter now. Output strict JSON only.`,
    },
  ]

  return { systemPrompt, messages }
}

export const extractMailArrivalJson = (text) => {
  const raw = typeof text === 'string' ? text.trim() : ''
  if (!raw) return null
  const attempts = [raw]
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    attempts.push(raw.slice(firstBrace, lastBrace + 1))
  }
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {
      // try next attempt
    }
  }
  return null
}

const asTrimmedString = (value, limit) => {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, limit)
}

export const validateMailArrivalDraft = (
  payload,
  { senders = [], allowNewSenders = true } = {},
) => {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['payload_missing'] }
  }

  const senderName = asTrimmedString(payload.senderName, SENDER_NAME_MAX)
  const senderAddress = asTrimmedString(payload.senderAddress, SENDER_ADDRESS_MAX).toLowerCase()
  const subject = asTrimmedString(payload.subject, SUBJECT_MAX)
  const label = asTrimmedString(payload.label, 40)

  const errors = []
  if (!senderName) errors.push('sender_name_missing')
  if (!senderAddress || !EMAIL_LIKE_PATTERN.test(senderAddress)) errors.push('sender_address_invalid')
  if (!subject) errors.push('subject_missing')

  const rawBody = Array.isArray(payload.body) ? payload.body : []
  const body = rawBody
    .map((paragraph) => asTrimmedString(paragraph, PARAGRAPH_MAX))
    .filter((paragraph) => paragraph.length > 0)
  if (body.length < BODY_PARAGRAPH_MIN || body.length > BODY_PARAGRAPH_MAX + 2) {
    errors.push('body_paragraph_count_invalid')
  }

  if (label && !MAIL_ARRIVAL_LABEL_IDS.includes(label)) errors.push('label_invalid')
  if (HTML_TAG_PATTERN.test(senderName) || HTML_TAG_PATTERN.test(subject) || body.some((p) => HTML_TAG_PATTERN.test(p))) {
    errors.push('html_rejected')
  }

  if (errors.length) return { ok: false, errors }

  const knownSender = senders.find((sender) => sender.address === senderAddress)
  const isNewSender = !knownSender
  if (isNewSender && !allowNewSenders) {
    return { ok: false, errors: ['new_sender_disabled'] }
  }

  return {
    ok: true,
    mail: {
      senderName,
      senderAddress,
      subject,
      body: body.slice(0, BODY_PARAGRAPH_MAX),
      label: label || '',
    },
    isNewSender,
    enrollSender: isNewSender ? { name: senderName, address: senderAddress } : null,
  }
}

const MAIL_ARRIVAL_ERROR_COPY = {
  PROVIDER_MISSING: { zh: '还没有配置模型服务，先去网络与 API 设置。', en: 'No model provider configured yet. Set one up in Network & API first.' },
  PROVIDER_FAILED: { zh: '接收失败，模型服务没有返回可用结果。', en: 'Receive failed. The model service returned no usable result.' },
  RESPONSE_INVALID: { zh: '生成内容未通过校验，没有新邮件进入收件箱。', en: 'The generated letter failed validation. Nothing entered the inbox.' },
}

export const resolveMailArrivalErrorCopy = (code, isZh = true) => {
  const copy = MAIL_ARRIVAL_ERROR_COPY[code] || MAIL_ARRIVAL_ERROR_COPY.PROVIDER_FAILED
  return isZh ? copy.zh : copy.en
}

export const isMailArrivalProviderConfigured = (settings = {}) => {
  const apiUrl = typeof settings?.api?.url === 'string' ? settings.api.url.trim() : ''
  if (!apiUrl) return false
  const key = typeof settings?.api?.key === 'string' ? settings.api.key.trim() : ''
  return Boolean(key) || !requiresApiKeyForUrl(apiUrl)
}

let mailArrivalRunnerOverride = null

export const setMailArrivalRunnerOverrideForTesting = (runner) => {
  mailArrivalRunnerOverride = typeof runner === 'function' ? runner : null
}

const defaultRunner = async ({ systemPrompt, messages, settings }) => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), MAIL_ARRIVAL_TIMEOUT_MS) : null
  try {
    const result = await callAI({
      settings,
      systemPrompt,
      messages,
      withMeta: true,
      signal: controller ? controller.signal : undefined,
    })
    return {
      text: typeof result?.text === 'string' ? result.text : '',
      model: result?.meta?.model || settings?.api?.model || '',
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// One provider call, fail-closed. Never generates a deterministic substitute mail.
export const requestMailArrival = async ({ settings, prompt }) => {
  if (!isMailArrivalProviderConfigured(settings)) {
    return { ok: false, code: 'PROVIDER_MISSING' }
  }

  const runner = mailArrivalRunnerOverride || defaultRunner
  let text = ''
  let model = ''
  try {
    const result = await runner({
      systemPrompt: prompt.systemPrompt,
      messages: prompt.messages,
      settings,
    })
    text = typeof result?.text === 'string' ? result.text : ''
    model = typeof result?.model === 'string' ? result.model : ''
  } catch (error) {
    const isAbort = error?.name === 'AbortError'
    return { ok: false, code: isAbort ? 'PROVIDER_FAILED' : 'PROVIDER_FAILED', raw: String(error?.message || error) }
  }

  const payload = extractMailArrivalJson(text)
  if (!payload) {
    return { ok: false, code: 'RESPONSE_INVALID', model }
  }

  return { ok: true, payload, model }
}

// Full receive flow for the shell: bounded prompt -> one provider call -> strict
// validation against the user-managed whitelist. Returns a ready-to-commit mail.
export const receiveMailArrival = async ({
  settings,
  senders,
  allowNewSenders,
  worldName,
  worldview,
  persona,
  languageName,
}) => {
  const prompt = buildMailArrivalPrompt({
    senders,
    allowNewSenders,
    worldName,
    worldview,
    persona,
    languageName,
  })
  const result = await requestMailArrival({ settings, prompt })
  if (!result.ok) return result

  const validation = validateMailArrivalDraft(result.payload, { senders, allowNewSenders })
  if (!validation.ok) {
    return { ok: false, code: 'RESPONSE_INVALID', model: result.model }
  }

  return {
    ok: true,
    mail: validation.mail,
    isNewSender: validation.isNewSender,
    enrollSender: validation.enrollSender,
    model: result.model,
  }
}
