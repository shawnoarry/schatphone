const OPENAI_DEFAULT_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini'
const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'

const normalizeUrl = (url) => (url || '').trim()

const ensureUrl = (url, fallbackUrl) => {
  const normalized = normalizeUrl(url)
  if (!normalized) return new URL(fallbackUrl)
  return new URL(normalized)
}

export const detectApiKindFromUrl = (url) => {
  const lower = normalizeUrl(url).toLowerCase()
  if (!lower) return 'openai_compatible'
  if (lower.includes('generativelanguage.googleapis.com')) return 'gemini'
  if (lower.includes('/v1beta/models') || lower.includes(':generatecontent')) return 'gemini'
  return 'openai_compatible'
}

const toOpenAIChatUrl = (url) => {
  const parsed = ensureUrl(url, OPENAI_DEFAULT_CHAT_URL)
  const path = parsed.pathname.replace(/\/+$/, '')

  if (!path || path === '') {
    parsed.pathname = '/v1/chat/completions'
    return parsed.toString()
  }

  if (path.endsWith('/chat/completions')) {
    return parsed.toString()
  }

  if (path.endsWith('/models')) {
    parsed.pathname = `${path.slice(0, -'/models'.length)}/chat/completions`
    return parsed.toString()
  }

  if (path === '/v1' || path.endsWith('/v1')) {
    parsed.pathname = `${path}/chat/completions`
    return parsed.toString()
  }

  return parsed.toString()
}

const toOpenAIModelsUrl = (url) => {
  const chatUrl = new URL(toOpenAIChatUrl(url))
  const path = chatUrl.pathname.replace(/\/+$/, '')

  if (path.endsWith('/chat/completions')) {
    chatUrl.pathname = `${path.slice(0, -'/chat/completions'.length)}/models`
    return chatUrl.toString()
  }

  if (path.endsWith('/completions')) {
    chatUrl.pathname = `${path.slice(0, -'/completions'.length)}/models`
    return chatUrl.toString()
  }

  if (path === '/v1' || path.endsWith('/v1')) {
    chatUrl.pathname = `${path}/models`
    return chatUrl.toString()
  }

  chatUrl.pathname = '/v1/models'
  return chatUrl.toString()
}

const toGeminiVersionBaseUrl = (url) => {
  const parsed = ensureUrl(url, GEMINI_DEFAULT_BASE_URL)
  const path = parsed.pathname.toLowerCase()

  if (path.includes('/v1beta')) {
    parsed.pathname = '/v1beta'
    parsed.search = ''
    return parsed.toString().replace(/\/+$/, '')
  }

  if (path.includes('/v1')) {
    parsed.pathname = '/v1'
    parsed.search = ''
    return parsed.toString().replace(/\/+$/, '')
  }

  parsed.pathname = '/v1beta'
  parsed.search = ''
  return parsed.toString().replace(/\/+$/, '')
}

const normalizeGeminiModelName = (modelName) => {
  const model = (modelName || '').trim()
  if (!model) return GEMINI_DEFAULT_MODEL
  return model.startsWith('models/') ? model.slice('models/'.length) : model
}

const toGeminiGenerateUrl = (url, modelName) => {
  const versionBaseUrl = toGeminiVersionBaseUrl(url)
  const model = encodeURIComponent(normalizeGeminiModelName(modelName))
  return `${versionBaseUrl}/models/${model}:generateContent`
}

export async function fetchAvailableModels({ settings }) {
  const key = settings.api.key?.trim()
  if (!key) {
    throw new Error('No API Key')
  }

  const kind = detectApiKindFromUrl(settings.api.url)
  if (kind === 'gemini') {
    const listUrl = `${toGeminiVersionBaseUrl(settings.api.url)}/models?key=${encodeURIComponent(key)}`
    const response = await fetch(listUrl)
    if (!response.ok) {
      throw new Error(`Load models failed: ${response.status}`)
    }

    const payload = await response.json()
    const models = (payload.models || [])
      .map((item) => item?.name)
      .filter(Boolean)
      .map((name) => normalizeGeminiModelName(name))
    return { kind, models }
  }

  const modelsUrl = toOpenAIModelsUrl(settings.api.url)
  const response = await fetch(modelsUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
    },
  })
  if (!response.ok) {
    throw new Error(`Load models failed: ${response.status}`)
  }

  const payload = await response.json()
  const models = (payload.data || payload.models || [])
    .map((item) => item?.id || item?.name)
    .filter(Boolean)
  return { kind, models }
}

export async function callAI({ messages, systemPrompt, settings }) {
  const key = settings.api.key?.trim()
  if (!key) {
    alert('Please configure API Key in Settings > API.')
    throw new Error('No API Key')
  }

  const apiKind = detectApiKindFromUrl(settings.api.url)
  settings.api.resolvedKind = apiKind

  if (apiKind === 'gemini') {
    const url = `${toGeminiGenerateUrl(settings.api.url, settings.api.model)}?key=${encodeURIComponent(key)}`

    const geminiContents = messages.map((message) => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }],
    }))

    const payload = {
      contents: geminiContents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Gemini API Request Failed: ${response.status}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  const url = toOpenAIChatUrl(settings.api.url)

  const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages]

  const payload = {
    model: settings.api.model || OPENAI_DEFAULT_MODEL,
    messages: fullMessages,
    temperature: 0.7,
    stream: false,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('OpenAI API Error', errText)
    throw new Error(`API Request Failed: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
