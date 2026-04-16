import http from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, 'data')
const CONFIG_PATH = resolve(DATA_DIR, 'push-config.json')
const SUBSCRIPTIONS_PATH = resolve(DATA_DIR, 'push-subscriptions.json')
const SCHEDULES_PATH = resolve(DATA_DIR, 'push-schedules.json')

const DEFAULT_PORT = Number(process.env.PUSH_SERVER_PORT || 8787)
const DEFAULT_HOST = process.env.PUSH_SERVER_HOST || '0.0.0.0'
const DEFAULT_SUBJECT = process.env.PUSH_VAPID_SUBJECT || 'mailto:schatphone@example.com'
const SCHEDULE_RETRY_DELAY_MS = 30 * 1000
const MAX_SCHEDULE_ATTEMPTS = 3

const ensureDataDir = () => {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

const readJsonFile = (filePath, fallbackValue) => {
  try {
    if (!existsSync(filePath)) return fallbackValue
    const raw = readFileSync(filePath, 'utf8')
    if (!raw.trim()) return fallbackValue
    return JSON.parse(raw)
  } catch {
    return fallbackValue
  }
}

const writeJsonFile = (filePath, data) => {
  ensureDataDir()
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

const sanitizeDeviceId = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw.slice(0, 120)
}

const sanitizeScheduleId = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw.slice(0, 120)
}

const sanitizeText = (value, max = 160, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed
}

const normalizeNotificationPayload = (rawPayload = {}) => {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
  return {
    title: sanitizeText(payload.title, 60, 'SchatPhone'),
    body: sanitizeText(payload.body || payload.content, 160, ''),
    route:
      typeof payload.route === 'string' && payload.route.trim()
        ? payload.route.trim()
        : '/lock',
    icon:
      typeof payload.icon === 'string' && payload.icon.trim()
        ? payload.icon.trim()
        : '/icons/pwa-icon.svg',
    badge:
      typeof payload.badge === 'string' && payload.badge.trim()
        ? payload.badge.trim()
        : '/icons/pwa-icon.svg',
    tag:
      typeof payload.tag === 'string' && payload.tag.trim()
        ? payload.tag.trim()
        : `push_note_${Date.now()}`,
    source:
      typeof payload.source === 'string' && payload.source.trim()
        ? payload.source.trim()
        : 'system',
    createdAt:
      Number.isFinite(Number(payload.createdAt)) && Number(payload.createdAt) > 0
        ? Math.floor(Number(payload.createdAt))
        : Date.now(),
  }
}

const createScheduleId = () => `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeDeliverAt = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.floor(parsed)
}

const loadPushConfig = () => {
  ensureDataDir()
  const persisted = readJsonFile(CONFIG_PATH, {})
  const envPublicKey = process.env.PUSH_VAPID_PUBLIC_KEY
  const envPrivateKey = process.env.PUSH_VAPID_PRIVATE_KEY

  const publicKey =
    typeof envPublicKey === 'string' && envPublicKey.trim()
      ? envPublicKey.trim()
      : typeof persisted.publicKey === 'string' && persisted.publicKey.trim()
        ? persisted.publicKey.trim()
        : ''
  const privateKey =
    typeof envPrivateKey === 'string' && envPrivateKey.trim()
      ? envPrivateKey.trim()
      : typeof persisted.privateKey === 'string' && persisted.privateKey.trim()
        ? persisted.privateKey.trim()
        : ''
  const subject =
    typeof persisted.subject === 'string' && persisted.subject.trim()
      ? persisted.subject.trim()
      : DEFAULT_SUBJECT

  if (publicKey && privateKey) {
    return { publicKey, privateKey, subject }
  }

  const generated = webpush.generateVAPIDKeys()
  const config = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject,
  }
  writeJsonFile(CONFIG_PATH, config)
  return config
}

const config = loadPushConfig()
webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)

let subscriptions = readJsonFile(SUBSCRIPTIONS_PATH, [])
if (!Array.isArray(subscriptions)) {
  subscriptions = []
}

let scheduledJobs = readJsonFile(SCHEDULES_PATH, [])
if (!Array.isArray(scheduledJobs)) {
  scheduledJobs = []
}
let scheduledJobProcessing = false

const saveSubscriptions = () => {
  writeJsonFile(SUBSCRIPTIONS_PATH, subscriptions)
}

const saveScheduledJobs = () => {
  writeJsonFile(SCHEDULES_PATH, scheduledJobs)
}

const getSubscriptionRecord = (deviceId) =>
  subscriptions.find((item) => item.deviceId === sanitizeDeviceId(deviceId)) || null

const upsertSubscriptionRecord = ({
  deviceId,
  subscription,
  locale = '',
  userAgent = '',
  appVersion = '',
}) => {
  const normalizedDeviceId = sanitizeDeviceId(deviceId)
  if (!normalizedDeviceId || !subscription || typeof subscription !== 'object') {
    return null
  }

  const now = Date.now()
  const existingIndex = subscriptions.findIndex((item) => item.deviceId === normalizedDeviceId)
  const nextRecord = {
    deviceId: normalizedDeviceId,
    subscription,
    locale: sanitizeText(locale, 64, ''),
    userAgent: sanitizeText(userAgent, 240, ''),
    appVersion: sanitizeText(appVersion, 32, ''),
    createdAt:
      existingIndex >= 0 && Number.isFinite(Number(subscriptions[existingIndex]?.createdAt))
        ? subscriptions[existingIndex].createdAt
        : now,
    updatedAt: now,
  }

  if (existingIndex >= 0) {
    subscriptions[existingIndex] = nextRecord
  } else {
    subscriptions.push(nextRecord)
  }
  saveSubscriptions()
  return nextRecord
}

const removeSubscriptionRecord = (deviceId) => {
  const normalizedDeviceId = sanitizeDeviceId(deviceId)
  const before = subscriptions.length
  subscriptions = subscriptions.filter((item) => item.deviceId !== normalizedDeviceId)
  if (subscriptions.length !== before) {
    saveSubscriptions()
    return true
  }
  return false
}

const getScheduledJobRecord = (scheduleId) =>
  scheduledJobs.find((item) => item.id === sanitizeScheduleId(scheduleId)) || null

const upsertScheduledJobRecord = ({
  scheduleId = '',
  deviceId,
  deliverAt,
  payload,
  source = '',
  category = '',
}) => {
  const normalizedDeviceId = sanitizeDeviceId(deviceId)
  const normalizedDeliverAt = normalizeDeliverAt(deliverAt)
  if (!normalizedDeviceId || !normalizedDeliverAt) {
    return null
  }

  const now = Date.now()
  const nextId = sanitizeScheduleId(scheduleId) || createScheduleId()
  const existingIndex = scheduledJobs.findIndex((item) => item.id === nextId)
  const existingRecord = existingIndex >= 0 ? scheduledJobs[existingIndex] : null
  const nextRecord = {
    id: nextId,
    deviceId: normalizedDeviceId,
    deliverAt: normalizedDeliverAt,
    payload: normalizeNotificationPayload(payload),
    source: sanitizeText(source, 80, ''),
    category: sanitizeText(category, 80, ''),
    attempts:
      existingRecord && Number.isFinite(Number(existingRecord.attempts))
        ? Math.max(0, Math.floor(Number(existingRecord.attempts)))
        : 0,
    maxAttempts:
      existingRecord && Number.isFinite(Number(existingRecord.maxAttempts))
        ? Math.max(1, Math.floor(Number(existingRecord.maxAttempts)))
        : MAX_SCHEDULE_ATTEMPTS,
    createdAt:
      existingRecord && Number.isFinite(Number(existingRecord.createdAt))
        ? Math.floor(Number(existingRecord.createdAt))
        : now,
    updatedAt: now,
  }

  if (existingIndex >= 0) {
    scheduledJobs[existingIndex] = nextRecord
  } else {
    scheduledJobs.push(nextRecord)
  }
  saveScheduledJobs()
  return nextRecord
}

const removeScheduledJobRecord = (scheduleId) => {
  const normalizedScheduleId = sanitizeScheduleId(scheduleId)
  if (!normalizedScheduleId) return false
  const before = scheduledJobs.length
  scheduledJobs = scheduledJobs.filter((item) => item.id !== normalizedScheduleId)
  if (scheduledJobs.length !== before) {
    saveScheduledJobs()
    return true
  }
  return false
}

const sendJson = (response, statusCode, payload, origin = '*') => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  })
  response.end(JSON.stringify(payload))
}

const readRequestBody = async (request) => {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const sendPushToRecord = async (record, payload) => {
  try {
    await webpush.sendNotification(record.subscription, JSON.stringify(payload), {
      TTL: 60,
      urgency: 'normal',
    })
    return {
      ok: true,
    }
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 0
    const expired = statusCode === 404 || statusCode === 410
    if (expired) {
      removeSubscriptionRecord(record.deviceId)
    }
    return {
      ok: false,
      reason: expired ? 'subscription_expired' : 'send_failed',
      statusCode,
      message:
        typeof error?.body === 'string' && error.body.trim()
          ? error.body.trim()
          : typeof error?.message === 'string' && error.message.trim()
            ? error.message.trim()
            : 'Push delivery failed.',
    }
  }
}

const processScheduledJobs = async () => {
  if (scheduledJobProcessing) return
  if (scheduledJobs.length === 0) return
  scheduledJobProcessing = true

  try {
    const now = Date.now()
    const dueJobs = scheduledJobs
      .filter((item) => normalizeDeliverAt(item?.deliverAt) > 0 && normalizeDeliverAt(item.deliverAt) <= now)
      .sort((a, b) => normalizeDeliverAt(a.deliverAt) - normalizeDeliverAt(b.deliverAt))

    if (dueJobs.length === 0) return

    let changed = false
    for (const job of dueJobs) {
      const currentRecord = getScheduledJobRecord(job.id)
      if (!currentRecord) continue

      const subscriptionRecord = getSubscriptionRecord(currentRecord.deviceId)
      if (!subscriptionRecord) {
        scheduledJobs = scheduledJobs.filter((item) => item.id !== currentRecord.id)
        changed = true
        continue
      }

      const delivery = await sendPushToRecord(subscriptionRecord, currentRecord.payload)
      if (delivery.ok) {
        scheduledJobs = scheduledJobs.filter((item) => item.id !== currentRecord.id)
        changed = true
        continue
      }

      const nextAttempts = Math.max(0, Math.floor(Number(currentRecord.attempts || 0))) + 1
      const shouldDrop =
        delivery.reason === 'subscription_expired' ||
        nextAttempts >= Math.max(1, Number(currentRecord.maxAttempts || MAX_SCHEDULE_ATTEMPTS))

      if (shouldDrop) {
        scheduledJobs = scheduledJobs.filter((item) => item.id !== currentRecord.id)
        changed = true
        continue
      }

      const targetIndex = scheduledJobs.findIndex((item) => item.id === currentRecord.id)
      if (targetIndex >= 0) {
        scheduledJobs[targetIndex] = {
          ...currentRecord,
          attempts: nextAttempts,
          deliverAt: now + SCHEDULE_RETRY_DELAY_MS,
          updatedAt: now,
        }
        changed = true
      }
    }

    if (changed) {
      saveScheduledJobs()
    }
  } finally {
    scheduledJobProcessing = false
  }
}

const scheduledJobTimer = setInterval(() => {
  void processScheduledJobs()
}, 1000)

if (typeof scheduledJobTimer.unref === 'function') {
  scheduledJobTimer.unref()
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin || '*'
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {}, origin)
    return
  }

  if (request.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/push/health')) {
    sendJson(
      response,
      200,
      {
        ok: true,
        port: DEFAULT_PORT,
        host: DEFAULT_HOST,
        subscriptionCount: subscriptions.length,
        scheduledCount: scheduledJobs.length,
      },
      origin,
    )
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/push/vapid-public-key') {
    sendJson(
      response,
      200,
      {
        ok: true,
        publicKey: config.publicKey,
      },
      origin,
    )
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/push/subscribe') {
    const body = await readRequestBody(request)
    if (!body) {
      sendJson(response, 400, { ok: false, reason: 'invalid_json', message: 'Invalid JSON body.' }, origin)
      return
    }

    const record = upsertSubscriptionRecord(body)
    if (!record) {
      sendJson(
        response,
        400,
        {
          ok: false,
          reason: 'invalid_subscription',
          message: 'deviceId or subscription missing.',
        },
        origin,
      )
      return
    }

    sendJson(
      response,
      200,
      {
        ok: true,
        deviceId: record.deviceId,
        updatedAt: record.updatedAt,
      },
      origin,
    )
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/push/unsubscribe') {
    const body = await readRequestBody(request)
    if (!body) {
      sendJson(response, 400, { ok: false, reason: 'invalid_json', message: 'Invalid JSON body.' }, origin)
      return
    }

    const removed = removeSubscriptionRecord(body.deviceId)
    sendJson(
      response,
      200,
      {
        ok: true,
        removed,
      },
      origin,
    )
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/push/schedules') {
    const deviceId = sanitizeDeviceId(url.searchParams.get('deviceId') || '')
    const rows = scheduledJobs
      .filter((item) => (deviceId ? item.deviceId === deviceId : true))
      .sort((a, b) => normalizeDeliverAt(a.deliverAt) - normalizeDeliverAt(b.deliverAt))
      .slice(0, 100)
      .map((item) => ({
        id: item.id,
        deviceId: item.deviceId,
        deliverAt: normalizeDeliverAt(item.deliverAt),
        source: item.source || '',
        category: item.category || '',
        attempts: Math.max(0, Math.floor(Number(item.attempts || 0))),
        createdAt: Math.max(0, Math.floor(Number(item.createdAt || 0))),
        updatedAt: Math.max(0, Math.floor(Number(item.updatedAt || 0))),
      }))

    sendJson(
      response,
      200,
      {
        ok: true,
        count: rows.length,
        schedules: rows,
      },
      origin,
    )
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/push/schedule') {
    const body = await readRequestBody(request)
    if (!body) {
      sendJson(response, 400, { ok: false, reason: 'invalid_json', message: 'Invalid JSON body.' }, origin)
      return
    }

    const record = upsertScheduledJobRecord(body)
    if (!record) {
      sendJson(
        response,
        400,
        {
          ok: false,
          reason: 'invalid_schedule',
          message: 'deviceId or deliverAt missing.',
        },
        origin,
      )
      return
    }

    sendJson(
      response,
      200,
      {
        ok: true,
        scheduleId: record.id,
        deliverAt: record.deliverAt,
        queueCount: scheduledJobs.length,
      },
      origin,
    )
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/push/schedule/cancel') {
    const body = await readRequestBody(request)
    if (!body) {
      sendJson(response, 400, { ok: false, reason: 'invalid_json', message: 'Invalid JSON body.' }, origin)
      return
    }

    const removed = removeScheduledJobRecord(body.scheduleId)
    sendJson(
      response,
      200,
      {
        ok: true,
        removed,
      },
      origin,
    )
    return
  }

  if (
    request.method === 'POST' &&
    (url.pathname === '/api/push/notify' || url.pathname === '/api/push/test')
  ) {
    const body = await readRequestBody(request)
    if (!body) {
      sendJson(response, 400, { ok: false, reason: 'invalid_json', message: 'Invalid JSON body.' }, origin)
      return
    }

    const deviceId = sanitizeDeviceId(body.deviceId)
    const record = getSubscriptionRecord(deviceId)
    if (!record) {
      sendJson(
        response,
        404,
        {
          ok: false,
          reason: 'subscription_not_found',
          message: 'No push subscription found for device.',
        },
        origin,
      )
      return
    }

    const payload =
      url.pathname === '/api/push/test'
        ? normalizeNotificationPayload({
            title: 'SchatPhone',
            body: 'Push test delivered successfully.',
            route: '/settings',
            source: 'push_test',
            tag: `push_test_${Date.now()}`,
          })
        : normalizeNotificationPayload(body.payload)

    const delivery = await sendPushToRecord(record, payload)
    if (!delivery.ok) {
      sendJson(
        response,
        502,
        {
          ok: false,
          reason: delivery.reason,
          message: delivery.message,
          statusCode: delivery.statusCode,
        },
        origin,
      )
      return
    }

    sendJson(
      response,
      200,
      {
        ok: true,
        delivered: true,
        deviceId,
      },
      origin,
    )
    return
  }

  sendJson(
    response,
    404,
    {
      ok: false,
      reason: 'not_found',
      message: 'Route not found.',
    },
    origin,
  )
})

server.listen(DEFAULT_PORT, DEFAULT_HOST, () => {
  console.log(
    `[push-server] listening on http://${DEFAULT_HOST}:${DEFAULT_PORT} | subscriptions=${subscriptions.length} | schedules=${scheduledJobs.length}`,
  )
  console.log(`[push-server] public key: ${config.publicKey}`)
})
