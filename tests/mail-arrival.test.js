import { beforeEach, describe, expect, test } from 'vitest'
import {
  buildMailArrivalPrompt,
  extractMailArrivalJson,
  isMailArrivalProviderConfigured,
  receiveMailArrival,
  resolveMailArrivalLanguageName,
  setMailArrivalRunnerOverrideForTesting,
  validateMailArrivalDraft,
} from '../src/lib/mail-shell-arrival'
import { MAIL_SHELL_THREADS } from '../src/lib/mail-shell-data'
import {
  resetMailShellSendersForTesting,
  useMailShellSenders,
} from '../src/composables/useMailShellSenders'
import { MAIL_SHELL_SENDER_WHITELIST_STORAGE_KEY } from '../src/composables/useMailShellSenders'

const KNOWN_SENDERS = [
  { id: 'mail_sender_schedule@hanul-enter.kr', name: '한울 엔터테인먼트', address: 'schedule@hanul-enter.kr', tone: 'green', origin: 'fixture' },
  { id: 'mail_sender_reserve@snuh-health.kr', name: '서울대학교병원', address: 'reserve@snuh-health.kr', tone: 'blue', origin: 'fixture' },
]

const VALID_DRAFT = {
  senderName: '한울 엔터테인먼트',
  senderAddress: 'schedule@hanul-enter.kr',
  subject: '[공지] 리허설 시간 변경 안내',
  body: ['다음 주 리허설이 한 시간 앞당겨졌습니다.', '참고 부탁드립니다.'],
  label: 'schedule',
}

describe('mail arrival prompt and JSON extraction', () => {
  test('prompt lists known senders and reflects the new-sender policy', () => {
    const open = buildMailArrivalPrompt({
      senders: KNOWN_SENDERS,
      allowNewSenders: true,
      languageName: 'Simplified Chinese (简体中文)',
    })
    expect(open.systemPrompt).toContain('OR you may invent ONE new fictional sender')
    expect(open.systemPrompt).toContain('Simplified Chinese')
    expect(open.messages[0].content).toContain('schedule@hanul-enter.kr')
    expect(open.messages[0].content).not.toContain('invent')

    const locked = buildMailArrivalPrompt({ senders: KNOWN_SENDERS, allowNewSenders: false })
    expect(locked.systemPrompt).toContain('inventing new senders is currently disabled')
  })

  test('extracts strict JSON from raw and fenced responses', () => {
    expect(extractMailArrivalJson('{"a":1}')).toEqual({ a: 1 })
    expect(extractMailArrivalJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(extractMailArrivalJson('前置说明 {"a":1} 后置说明')).toEqual({ a: 1 })
    expect(extractMailArrivalJson('not json at all')).toBeNull()
    expect(extractMailArrivalJson('')).toBeNull()
  })

  test('resolves the generation language from the system language base', () => {
    expect(resolveMailArrivalLanguageName('zh')).toContain('Simplified Chinese')
    expect(resolveMailArrivalLanguageName('en')).toBe('English')
    expect(resolveMailArrivalLanguageName('ko')).toContain('Korean')
  })
})

describe('mail arrival draft validation', () => {
  test('accepts a valid draft from a known sender', () => {
    const result = validateMailArrivalDraft(VALID_DRAFT, { senders: KNOWN_SENDERS, allowNewSenders: true })
    expect(result.ok).toBe(true)
    expect(result.isNewSender).toBe(false)
    expect(result.enrollSender).toBeNull()
    expect(result.mail.body).toHaveLength(2)
  })

  test('accepts and enrolls a new sender when allowed', () => {
    const draft = { ...VALID_DRAFT, senderName: '스트릠리 Streamly', senderAddress: 'news@streamly.kr' }
    const result = validateMailArrivalDraft(draft, { senders: KNOWN_SENDERS, allowNewSenders: true })
    expect(result.ok).toBe(true)
    expect(result.isNewSender).toBe(true)
    expect(result.enrollSender).toEqual({ name: '스트릠리 Streamly', address: 'news@streamly.kr' })
  })

  test('rejects new senders when the policy is off', () => {
    const draft = { ...VALID_DRAFT, senderName: 'Streamly', senderAddress: 'news@streamly.kr' }
    const result = validateMailArrivalDraft(draft, { senders: KNOWN_SENDERS, allowNewSenders: false })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('new_sender_disabled')
  })

  test.each([
    ['bad address', { senderAddress: 'not-an-address' }, 'sender_address_invalid'],
    ['missing subject', { subject: '' }, 'subject_missing'],
    ['empty body', { body: [] }, 'body_paragraph_count_invalid'],
    ['html in body', { body: ['<b>hi</b>'] }, 'html_rejected'],
    ['unknown label', { label: 'urgent' }, 'label_invalid'],
  ])('rejects %s', (_name, overrides, expectedError) => {
    const result = validateMailArrivalDraft(
      { ...VALID_DRAFT, ...overrides },
      { senders: KNOWN_SENDERS, allowNewSenders: true },
    )
    expect(result.ok).toBe(false)
    expect(result.errors).toContain(expectedError)
  })

  test('provider configuration check follows url and key rules', () => {
    expect(isMailArrivalProviderConfigured({})).toBe(false)
    expect(isMailArrivalProviderConfigured({ api: { url: '' } })).toBe(false)
    expect(isMailArrivalProviderConfigured({ api: { url: 'https://x.test/v1', key: 'k' } })).toBe(true)
  })
})

describe('receiveMailArrival orchestration', () => {
  beforeEach(() => {
    setMailArrivalRunnerOverrideForTesting(null)
  })

  test('returns PROVIDER_MISSING without any provider call', async () => {
    let called = 0
    setMailArrivalRunnerOverrideForTesting(async () => {
      called += 1
      return { text: '{}' }
    })
    const result = await receiveMailArrival({
      settings: { api: { url: '', key: '' } },
      senders: KNOWN_SENDERS,
      allowNewSenders: true,
    })
    expect(result).toEqual({ ok: false, code: 'PROVIDER_MISSING' })
    expect(called).toBe(0)
  })

  test('commits one validated mail with model provenance', async () => {
    setMailArrivalRunnerOverrideForTesting(async () => ({
      text: JSON.stringify(VALID_DRAFT),
      model: 'test-model-a',
    }))
    const result = await receiveMailArrival({
      settings: { api: { url: 'https://x.test/v1', key: 'k' } },
      senders: KNOWN_SENDERS,
      allowNewSenders: true,
    })
    expect(result.ok).toBe(true)
    expect(result.mail.subject).toBe(VALID_DRAFT.subject)
    expect(result.model).toBe('test-model-a')
    expect(result.isNewSender).toBe(false)
  })

  test('fails closed on provider errors and invalid responses', async () => {
    setMailArrivalRunnerOverrideForTesting(async () => {
      throw new Error('network down')
    })
    const failed = await receiveMailArrival({
      settings: { api: { url: 'https://x.test/v1', key: 'k' } },
      senders: KNOWN_SENDERS,
    })
    expect(failed.ok).toBe(false)
    expect(failed.code).toBe('PROVIDER_FAILED')

    setMailArrivalRunnerOverrideForTesting(async () => ({ text: 'garbage' }))
    const invalid = await receiveMailArrival({
      settings: { api: { url: 'https://x.test/v1', key: 'k' } },
      senders: KNOWN_SENDERS,
    })
    expect(invalid.ok).toBe(false)
    expect(invalid.code).toBe('RESPONSE_INVALID')

    setMailArrivalRunnerOverrideForTesting(async () => ({
      text: JSON.stringify({ ...VALID_DRAFT, senderAddress: 'broken' }),
    }))
    const rejected = await receiveMailArrival({
      settings: { api: { url: 'https://x.test/v1', key: 'k' } },
      senders: KNOWN_SENDERS,
    })
    expect(rejected.ok).toBe(false)
    expect(rejected.code).toBe('RESPONSE_INVALID')
  })
})

describe('mail sender whitelist store', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMailShellSendersForTesting()
  })

  test('seeds defaults from the in-world fixture senders', () => {
    const { senders } = useMailShellSenders()
    const fixtureAddress = MAIL_SHELL_THREADS[0].senderAddress
    expect(senders.value.some((sender) => sender.address === fixtureAddress)).toBe(true)
    expect(new Set(senders.value.map((sender) => sender.address)).size).toBe(senders.value.length)
    expect(senders.value.every((sender) => sender.origin === 'fixture')).toBe(true)
  })

  test('adds, rejects duplicates and invalid addresses, and persists', () => {
    const store = useMailShellSenders()
    expect(store.addSender({ name: 'Streamly', address: 'news@streamly.kr' })).not.toBeNull()
    expect(store.addSender({ name: 'Dup', address: 'news@streamly.kr' })).toBeNull()
    expect(store.addSender({ name: 'Bad', address: 'nope' })).toBeNull()

    const stored = JSON.parse(localStorage.getItem(MAIL_SHELL_SENDER_WHITELIST_STORAGE_KEY))
    expect(stored.version).toBe(1)
    expect(stored.senders.some((sender) => sender.address === 'news@streamly.kr' && sender.origin === 'user')).toBe(true)
  })

  test('enrolls generated senders with an explicit origin and can remove or restore', () => {
    const store = useMailShellSenders()
    const enrolled = store.enrollGeneratedSender({ name: 'Streamly', address: 'news@streamly.kr' })
    expect(enrolled.origin).toBe('generated')

    store.removeSender(enrolled.id)
    expect(store.senders.value.some((sender) => sender.id === enrolled.id)).toBe(false)

    store.removeSender(store.senders.value[0].id)
    expect(store.senders.value.length).toBeLessThanOrEqual(MAIL_SHELL_THREADS.length - 1)
    store.restoreDefaults()
    expect(store.senders.value.length).toBe(new Set(MAIL_SHELL_THREADS.map((t) => t.senderAddress)).size)
  })

  test('toggles the allow-new-senders policy and persists it', () => {
    const store = useMailShellSenders()
    store.setAllowNewSenders(false)
    expect(store.allowNewSenders.value).toBe(false)
    const stored = JSON.parse(localStorage.getItem(MAIL_SHELL_SENDER_WHITELIST_STORAGE_KEY))
    expect(stored.allowNewSenders).toBe(false)
  })
})
