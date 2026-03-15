export const VALID_WIDGET_SIZES = Object.freeze(['1x1', '2x1', '2x2', '4x2', '4x3'])

export const WIDGET_IMPORT_LIMITS = Object.freeze({
  maxBatch: 50,
  maxPayloadChars: 300_000,
  maxNameChars: 40,
  maxCodeChars: 16_000,
})

const ALLOWED_IMPORT_KEYS = new Set(['name', 'size', 'code'])

const DANGEROUS_CODE_PATTERNS = [
  { code: 'SCRIPT_TAG', regex: /<\s*script\b/i },
  { code: 'INLINE_HANDLER', regex: /\bon[a-z0-9_-]+\s*=/i },
  { code: 'JS_PROTOCOL', regex: /javascript\s*:/i },
  { code: 'IFRAME_TAG', regex: /<\s*iframe\b/i },
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

    const code = typeof item.code === 'string' ? item.code : ''
    if (!code.trim()) {
      errors.push({ index, code: 'EMPTY_CODE' })
      return
    }
    if (code.length > limits.maxCodeChars) {
      errors.push({
        index,
        code: 'CODE_TOO_LONG',
        max: limits.maxCodeChars,
      })
      return
    }

    const danger = DANGEROUS_CODE_PATTERNS.find((rule) => rule.regex.test(code))
    if (danger) {
      errors.push({
        index,
        code: 'DANGEROUS_CODE',
        pattern: danger.code,
      })
      return
    }

    normalizedItems.push({
      name,
      size,
      code,
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
