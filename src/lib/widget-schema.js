export const VALID_WIDGET_SIZES = Object.freeze(['1x1', '2x1', '2x2', '4x1', '4x2', '4x3', '4x4'])

export const WIDGET_IMPORT_LIMITS = Object.freeze({
  maxBatch: 50,
  maxPayloadChars: 300_000,
  maxNameChars: 40,
  maxCodeChars: 16_000,
})

const ALLOWED_IMPORT_KEYS = new Set(['name', 'size', 'code'])

const FORBIDDEN_WIDGET_TAGS = new Set([
  'a',
  'area',
  'audio',
  'base',
  'button',
  'embed',
  'form',
  'frame',
  'frameset',
  'iframe',
  'input',
  'link',
  'meta',
  'object',
  'option',
  'portal',
  'script',
  'select',
  'source',
  'textarea',
  'track',
  'video',
])

const FORBIDDEN_WIDGET_ATTRIBUTES = new Set([
  'action',
  'autofocus',
  'contenteditable',
  'download',
  'formaction',
  'href',
  'ping',
  'srcdoc',
  'tabindex',
  'target',
  'xlink:href',
])

const DANGEROUS_CSS_PATTERNS = [
  { code: 'CSS_IMPORT', regex: /@import\b/i },
  { code: 'CSS_EXPRESSION', regex: /expression\s*\(/i },
  { code: 'CSS_BEHAVIOR', regex: /(?:behavior|-moz-binding)\s*:/i },
  { code: 'CSS_JS_URL', regex: /url\s*\(\s*['"]?\s*(?:javascript|data\s*:\s*text\/html)\s*:/i },
]

const DANGEROUS_CODE_PATTERNS = [
  { code: 'ACTIVE_TAG', regex: /<\s*(?:script|iframe|object|embed|form|button|input|select|textarea|audio|video|link|meta|base|a)\b/i },
  { code: 'INLINE_HANDLER', regex: /\bon[a-z0-9_-]+\s*=/i },
  { code: 'JS_PROTOCOL', regex: /javascript\s*:/i },
  { code: 'NAVIGATION_ATTRIBUTE', regex: /\b(?:href|srcdoc|action|formaction|ping)\s*=/i },
  ...DANGEROUS_CSS_PATTERNS,
]

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const resolveLimits = (options = {}) => ({
  maxBatch: Math.max(1, toInt(options.maxBatch, WIDGET_IMPORT_LIMITS.maxBatch)),
  maxPayloadChars: Math.max(1_000, toInt(options.maxPayloadChars, WIDGET_IMPORT_LIMITS.maxPayloadChars)),
  maxNameChars: Math.max(1, toInt(options.maxNameChars, WIDGET_IMPORT_LIMITS.maxNameChars)),
  maxCodeChars: Math.max(100, toInt(options.maxCodeChars, WIDGET_IMPORT_LIMITS.maxCodeChars)),
})

const createWidgetMarkupTemplate = (code) => {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null
  const template = document.createElement('template')
  template.innerHTML = code
  return template
}

const inspectWidgetMarkup = (template) => {
  const elements = [...template.content.querySelectorAll('*')]
  for (const element of elements) {
    const tagName = element.tagName.toLowerCase()
    if (FORBIDDEN_WIDGET_TAGS.has(tagName)) {
      return { code: 'DANGEROUS_CODE', pattern: `ELEMENT_${tagName.toUpperCase()}` }
    }

    if (tagName === 'style') {
      const danger = DANGEROUS_CSS_PATTERNS.find((rule) => rule.regex.test(element.textContent || ''))
      if (danger) return { code: 'DANGEROUS_CODE', pattern: danger.code }
    }

    for (const attribute of [...element.attributes]) {
      const attributeName = attribute.name.toLowerCase()
      if (attributeName.startsWith('on')) {
        return { code: 'DANGEROUS_CODE', pattern: 'INLINE_HANDLER' }
      }
      if (FORBIDDEN_WIDGET_ATTRIBUTES.has(attributeName)) {
        return { code: 'DANGEROUS_CODE', pattern: `ATTRIBUTE_${attributeName.toUpperCase()}` }
      }
      if (attributeName === 'style') {
        const danger = DANGEROUS_CSS_PATTERNS.find((rule) => rule.regex.test(attribute.value || ''))
        if (danger) return { code: 'DANGEROUS_CODE', pattern: danger.code }
      }
      if ((attributeName === 'src' || attributeName === 'srcset') && /javascript\s*:|data\s*:\s*text\/html/i.test(attribute.value || '')) {
        return { code: 'DANGEROUS_CODE', pattern: 'UNSAFE_MEDIA_SOURCE' }
      }
    }
  }
  return null
}

const findWidgetAppearanceRisk = (code) => {
  const template = createWidgetMarkupTemplate(code)
  if (template) return inspectWidgetMarkup(template)

  const danger = DANGEROUS_CODE_PATTERNS.find((rule) => rule.regex.test(code))
  return danger ? { code: 'DANGEROUS_CODE', pattern: danger.code } : null
}

export const validateWidgetAppearanceCode = (codeInput, options = {}) => {
  const code = typeof codeInput === 'string' ? codeInput : ''
  const limits = resolveLimits(options)
  if (!code.trim()) {
    return { ok: false, code, errors: [{ code: 'EMPTY_CODE' }], limits }
  }
  if (code.length > limits.maxCodeChars) {
    return {
      ok: false,
      code,
      errors: [{ code: 'CODE_TOO_LONG', max: limits.maxCodeChars }],
      limits,
    }
  }

  const danger = findWidgetAppearanceRisk(code)
  return danger
    ? { ok: false, code, errors: [danger], limits }
    : { ok: true, code, errors: [], limits }
}

export const sanitizeWidgetAppearanceCode = (codeInput) => {
  const code = typeof codeInput === 'string' ? codeInput : ''
  if (!code || !findWidgetAppearanceRisk(code)) return { code, changed: false }

  const template = createWidgetMarkupTemplate(code)
  if (!template) return { code: '', changed: true }

  let changed = false
  for (const element of [...template.content.querySelectorAll('*')]) {
    const tagName = element.tagName.toLowerCase()
    if (FORBIDDEN_WIDGET_TAGS.has(tagName)) {
      element.remove()
      changed = true
      continue
    }

    if (
      tagName === 'style' &&
      DANGEROUS_CSS_PATTERNS.some((rule) => rule.regex.test(element.textContent || ''))
    ) {
      element.remove()
      changed = true
      continue
    }

    for (const attribute of [...element.attributes]) {
      const attributeName = attribute.name.toLowerCase()
      const unsafeStyle =
        attributeName === 'style' &&
        DANGEROUS_CSS_PATTERNS.some((rule) => rule.regex.test(attribute.value || ''))
      const unsafeSource =
        (attributeName === 'src' || attributeName === 'srcset') &&
        /javascript\s*:|data\s*:\s*text\/html/i.test(attribute.value || '')
      if (
        attributeName.startsWith('on') ||
        FORBIDDEN_WIDGET_ATTRIBUTES.has(attributeName) ||
        unsafeStyle ||
        unsafeSource
      ) {
        element.removeAttribute(attribute.name)
        changed = true
      }
    }
  }

  return { code: template.innerHTML, changed }
}

export const validateWidgetImportPayload = (payload, options = {}) => {
  const fallbackName =
    typeof options.fallbackName === 'string' && options.fallbackName.trim()
      ? options.fallbackName.trim()
      : '自定义组件'
  const limits = resolveLimits(options)

  const errors = []
  const warnings = []
  const normalizedItems = []

  let parsedPayload = payload

  if (typeof payload === 'string') {
    const payloadText = payload.trim()
    if (!payloadText) {
      return {
        ok: false,
        items: [],
        errors: [{ index: -1, code: 'EMPTY_PAYLOAD' }],
        warnings,
        limits,
      }
    }
    if (payloadText.length > limits.maxPayloadChars) {
      return {
        ok: false,
        items: [],
        errors: [
          {
            index: -1,
            code: 'PAYLOAD_TOO_LARGE',
            max: limits.maxPayloadChars,
          },
        ],
        warnings,
        limits,
      }
    }
    try {
      parsedPayload = JSON.parse(payloadText)
    } catch {
      return {
        ok: false,
        items: [],
        errors: [{ index: -1, code: 'INVALID_JSON' }],
        warnings,
        limits,
      }
    }
  }

  if (!Array.isArray(parsedPayload)) {
    return {
      ok: false,
      items: [],
      errors: [{ index: -1, code: 'TOP_LEVEL_NOT_ARRAY' }],
      warnings,
      limits,
    }
  }

  if (parsedPayload.length === 0) {
    return {
      ok: false,
      items: [],
      errors: [{ index: -1, code: 'EMPTY_ARRAY' }],
      warnings,
      limits,
    }
  }

  if (parsedPayload.length > limits.maxBatch) {
    return {
      ok: false,
      items: [],
      errors: [
        {
          index: -1,
          code: 'BATCH_TOO_LARGE',
          max: limits.maxBatch,
          actual: parsedPayload.length,
        },
      ],
      warnings,
      limits,
    }
  }

  parsedPayload.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ index, code: 'ITEM_NOT_OBJECT' })
      return
    }

    const unknownFields = Object.keys(item).filter((field) => !ALLOWED_IMPORT_KEYS.has(field))
    if (unknownFields.length > 0) {
      warnings.push({ index, code: 'IGNORED_FIELDS', fields: unknownFields })
    }

    const nameRaw = typeof item.name === 'string' ? item.name.trim() : ''
    const name = nameRaw || fallbackName
    if (name.length > limits.maxNameChars) {
      errors.push({
        index,
        code: 'NAME_TOO_LONG',
        max: limits.maxNameChars,
      })
      return
    }

    const size = typeof item.size === 'string' ? item.size.trim() : ''
    if (!VALID_WIDGET_SIZES.includes(size)) {
      errors.push({
        index,
        code: 'INVALID_SIZE',
        validSizes: [...VALID_WIDGET_SIZES],
      })
      return
    }

    const codeValidation = validateWidgetAppearanceCode(item.code, {
      maxCodeChars: limits.maxCodeChars,
    })
    if (!codeValidation.ok) {
      errors.push({ index, ...(codeValidation.errors[0] || { code: 'DANGEROUS_CODE' }) })
      return
    }

    normalizedItems.push({
      name,
      size,
      code: codeValidation.code,
    })
  })

  return {
    ok: errors.length === 0,
    items: normalizedItems,
    errors,
    warnings,
    limits,
  }
}
