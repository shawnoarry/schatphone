const uniquePush = (list, value) => {
  if (typeof value !== 'string') return
  const normalized = value.trim()
  if (!normalized) return
  if (list.includes(normalized)) return
  list.push(normalized)
}

const pushMaybeText = (list, value) => {
  if (typeof value !== 'string') return
  uniquePush(list, value)
}

const extractFromContentArrayItem = (list, item) => {
  if (!item) return
  if (typeof item === 'string') {
    pushMaybeText(list, item)
    return
  }
  if (typeof item !== 'object') return

  // Compatible with common provider payload variants:
  // - { text: "..." }
  // - { text: { value: "..." } }
  // - { value: "..." }
  pushMaybeText(list, item.text)
  pushMaybeText(list, item?.text?.value)
  pushMaybeText(list, item.value)
}

export const stripCodeFence = (text = '') =>
  (text || '').replace(/```json/gi, '').replace(/```/g, '').trim()

export const collectJsonCandidates = (rawText = '') => {
  const cleanText = stripCodeFence(rawText)
  const candidates = []
  uniquePush(candidates, cleanText)

  const objectStart = cleanText.indexOf('{')
  const objectEnd = cleanText.lastIndexOf('}')
  if (objectStart >= 0 && objectEnd > objectStart) {
    uniquePush(candidates, cleanText.slice(objectStart, objectEnd + 1))
  }

  const arrayStart = cleanText.indexOf('[')
  const arrayEnd = cleanText.lastIndexOf(']')
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    uniquePush(candidates, cleanText.slice(arrayStart, arrayEnd + 1))
  }

  return candidates
}

export const parseAssistantJsonPayload = (rawText = '') => {
  const candidates = collectJsonCandidates(rawText)
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (Array.isArray(parsed)) {
        return { messages: parsed }
      }

      if (!parsed || typeof parsed !== 'object') continue
      if (Array.isArray(parsed.messages)) return parsed
      if (parsed.data && Array.isArray(parsed.data.messages)) {
        return {
          ...parsed,
          messages: parsed.data.messages,
        }
      }
      return parsed
    } catch {
      // Try next candidate.
    }
  }
  return null
}

export const extractAssistantPayloadText = (payload) => {
  if (!payload || typeof payload !== 'object') return ''
  const candidates = []

  pushMaybeText(candidates, payload.content)
  pushMaybeText(candidates, payload.text)
  pushMaybeText(candidates, payload.message)
  pushMaybeText(candidates, payload.output_text)

  if (Array.isArray(payload.content)) {
    payload.content.forEach((item) => extractFromContentArrayItem(candidates, item))
  }

  if (Array.isArray(payload.output)) {
    payload.output.forEach((item) => extractFromContentArrayItem(candidates, item))
  }

  return candidates[0] || ''
}
