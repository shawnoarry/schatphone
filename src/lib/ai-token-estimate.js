const MESSAGE_WRAPPER_TOKENS = 4
const REQUEST_WRAPPER_TOKENS = 2

const normalizeText = (value) => (typeof value === 'string' ? value : '')

const isCjkCodePoint = (codePoint) =>
  (codePoint >= 0x2e80 && codePoint <= 0x303f) ||
  (codePoint >= 0x3040 && codePoint <= 0x30ff) ||
  (codePoint >= 0x3100 && codePoint <= 0x31ef) ||
  (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
  (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
  (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
  (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
  (codePoint >= 0x20000 && codePoint <= 0x3134f)

const textFromMessageContent = (content) => {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  return content
    .map((part) => {
      if (typeof part === 'string') return part
      if (!part || typeof part !== 'object') return ''
      if (typeof part.text === 'string') return part.text
      if (part.type === 'text' && typeof part.content === 'string') return part.content
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

export const estimateTextTokens = (value) => {
  const text = normalizeText(value)
  if (!text) return 0

  let cjkCharacters = 0
  let otherCharacters = 0

  for (const character of text) {
    if (isCjkCodePoint(character.codePointAt(0))) {
      cjkCharacters += 1
    } else {
      otherCharacters += 1
    }
  }

  return cjkCharacters + Math.ceil(otherCharacters / 4)
}

export const estimateChatMessagesTokens = (messages = []) =>
  (Array.isArray(messages) ? messages : []).reduce((total, message) => {
    if (!message || typeof message !== 'object') return total
    return (
      total +
      MESSAGE_WRAPPER_TOKENS +
      estimateTextTokens(message.role) +
      estimateTextTokens(message.name) +
      estimateTextTokens(textFromMessageContent(message.content))
    )
  }, 0)

export const estimateChatRequestTokens = ({ systemPrompt = '', messages = [] } = {}) => {
  const normalizedSystemPrompt = normalizeText(systemPrompt)
  const systemTokens = normalizedSystemPrompt
    ? MESSAGE_WRAPPER_TOKENS + estimateTextTokens(normalizedSystemPrompt)
    : 0

  return REQUEST_WRAPPER_TOKENS + systemTokens + estimateChatMessagesTokens(messages)
}

export const estimateTokenParts = (parts = []) => {
  const sourceParts = Array.isArray(parts)
    ? parts
    : parts && typeof parts === 'object'
      ? Object.entries(parts).map(([id, text]) => ({ id, text }))
      : []
  const estimatedParts = sourceParts.map((part, index) => ({
    ...part,
    id: part?.id || `part_${index + 1}`,
    tokens: estimateTextTokens(part?.text),
  }))

  return {
    totalTokens: estimatedParts.reduce((total, part) => total + part.tokens, 0),
    parts: estimatedParts,
  }
}
