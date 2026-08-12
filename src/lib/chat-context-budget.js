export const CHAT_CONTEXT_BUDGET_DEFAULTS = Object.freeze({
  characters: 12_000,
  truncationMarker: '\n[earlier content omitted to fit context]\n',
})

const normalizeBudget = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return CHAT_CONTEXT_BUDGET_DEFAULTS.characters
  return Math.max(0, Math.floor(number))
}

const normalizeText = (value) => (typeof value === 'string' ? value : '')

export const truncateChatContextText = (
  value,
  maxCharacters,
  marker = CHAT_CONTEXT_BUDGET_DEFAULTS.truncationMarker,
) => {
  const text = normalizeText(value)
  const limit = normalizeBudget(maxCharacters)
  if (text.length <= limit) return text
  if (limit <= 0) return ''

  const normalizedMarker = normalizeText(marker)
  if (!normalizedMarker || normalizedMarker.length >= limit) {
    return text.slice(-limit)
  }

  const remaining = limit - normalizedMarker.length
  const headLength = Math.ceil(remaining / 2)
  const tailLength = remaining - headLength
  return `${text.slice(0, headLength)}${normalizedMarker}${tailLength > 0 ? text.slice(-tailLength) : ''}`
}

const normalizeAiMessage = (message) => ({
  role: typeof message?.role === 'string' && message.role ? message.role : 'user',
  content: normalizeText(message?.content),
})

export const projectChatContextBudget = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const sourceMessages = Array.isArray(source.sourceMessages) ? source.sourceMessages : []
  const aiMessages = Array.isArray(source.aiMessages) ? source.aiMessages : []
  const characterBudget = normalizeBudget(source.characterBudget)
  const candidateCount = Math.min(sourceMessages.length, aiMessages.length)

  if (candidateCount <= 0 || characterBudget <= 0) {
    return {
      sourceMessages: [],
      aiMessages: [],
      diagnostics: {
        characterBudget,
        candidateCount,
        includedCount: 0,
        omittedCount: candidateCount,
        includedCharacters: 0,
        truncatedMessageCount: 0,
      },
    }
  }

  const selected = []
  let includedCharacters = 0
  let truncatedMessageCount = 0

  for (let index = candidateCount - 1; index >= 0; index -= 1) {
    const message = normalizeAiMessage(aiMessages[index])
    const remaining = characterBudget - includedCharacters
    const isNewest = index === candidateCount - 1

    if (message.content.length > remaining) {
      if (isNewest) {
        const content = truncateChatContextText(
          message.content,
          remaining,
          source.truncationMarker,
        )
        selected.push({
          sourceMessage: sourceMessages[index],
          aiMessage: { ...message, content },
        })
        includedCharacters += content.length
        truncatedMessageCount += 1
      }
      break
    }

    selected.push({
      sourceMessage: sourceMessages[index],
      aiMessage: message,
    })
    includedCharacters += message.content.length
  }

  selected.reverse()

  return {
    sourceMessages: selected.map((entry) => entry.sourceMessage),
    aiMessages: selected.map((entry) => entry.aiMessage),
    diagnostics: {
      characterBudget,
      candidateCount,
      includedCount: selected.length,
      omittedCount: candidateCount - selected.length,
      includedCharacters,
      truncatedMessageCount,
    },
  }
}
