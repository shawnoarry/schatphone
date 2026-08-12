export const MEMORY_RECALL_LIMITS = Object.freeze({
  queryMessages: 4,
  queryCharacters: 1600,
  resultItems: 3,
  resultCharacters: 720,
})

const LATIN_STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'and',
  'are',
  'but',
  'can',
  'did',
  'for',
  'from',
  'have',
  'how',
  'just',
  'not',
  'that',
  'the',
  'then',
  'this',
  'was',
  'what',
  'when',
  'where',
  'with',
  'you',
  'your',
])

const CJK_STOP_SIGNALS = new Set([
  '一个',
  '一下',
  '不是',
  '什么',
  '但是',
  '你们',
  '他们',
  '今天',
  '可以',
  '已经',
  '怎么',
  '我们',
  '没有',
  '然后',
  '现在',
  '自己',
  '这个',
  '那个',
  '还是',
  '就是',
])

const normalizeText = (value) =>
  typeof value === 'string'
    ? value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
    : ''

const normalizeDisplayText = (value) =>
  typeof value === 'string' ? value.normalize('NFKC').replace(/\s+/g, ' ').trim() : ''

const clampInteger = (value, fallback, min, max) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.floor(number)))
}

const messageContentToText = (content) => {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map((item) => (typeof item?.text === 'string' ? item.text : '')).filter(Boolean).join(' ')
}

export const buildMemoryRecallQuery = (messages = [], options = {}) => {
  const safeOptions = options && typeof options === 'object' && !Array.isArray(options) ? options : {}
  const messageLimit = clampInteger(
    safeOptions.messageLimit,
    MEMORY_RECALL_LIMITS.queryMessages,
    0,
    12,
  )
  const characterLimit = clampInteger(
    safeOptions.characterLimit,
    MEMORY_RECALL_LIMITS.queryCharacters,
    0,
    4000,
  )
  if (messageLimit === 0 || characterLimit === 0) return ''
  const query = (Array.isArray(messages) ? messages : [])
    .slice(-messageLimit)
    .map((message) => messageContentToText(message?.content))
    .filter(Boolean)
    .join('\n')
    .trim()

  return query.length <= characterLimit ? query : query.slice(-characterLimit)
}

const addCjkSignals = (signals, sequence) => {
  if (sequence.length === 1) return
  if (sequence.length <= 4 && !CJK_STOP_SIGNALS.has(sequence)) signals.add(sequence)
  for (let index = 0; index < sequence.length - 1; index += 1) {
    const pair = sequence.slice(index, index + 2)
    if (!CJK_STOP_SIGNALS.has(pair)) signals.add(pair)
  }
}

const extractRecallSignals = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) return []
  const signals = new Set()

  for (const match of normalized.matchAll(/[a-z0-9][a-z0-9_-]+/g)) {
    const token = match[0]
    if (token.length >= 2 && !LATIN_STOP_WORDS.has(token)) signals.add(token)
  }
  for (const match of normalized.matchAll(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/g)) {
    addCjkSignals(signals, match[0])
  }

  return [...signals]
}

const memoryRecallText = (memory = {}) => {
  const source = memory && typeof memory === 'object' ? memory : {}
  return normalizeDisplayText(
    source.recallSummary ||
      source.displaySummary ||
      source.primarySummary ||
      source.latestSummary ||
      source.memoryKey,
  )
}

const memorySearchText = (memory = {}) => {
  const source = memory && typeof memory === 'object' ? memory : {}
  return [
    memoryRecallText(source),
    source.latestSummary,
    source.reviewNote,
    source.memoryKey,
    ...(Array.isArray(source.factTypes) ? source.factTypes : []),
    ...(Array.isArray(source.growthTraits) ? source.growthTraits : []),
    ...(Array.isArray(source.milestones) ? source.milestones : []),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ')
}

const scoreMemory = (memory, querySignals) => {
  if (querySignals.length === 0) return { matchedSignalCount: 0, relevanceScore: 0 }
  const searchText = memorySearchText(memory)
  let matchedSignalCount = 0
  let relevanceScore = 0

  querySignals.forEach((signal) => {
    if (!searchText.includes(signal)) return
    matchedSignalCount += 1
    relevanceScore += Math.min(24, 6 + signal.length * 3)
  })

  return { matchedSignalCount, relevanceScore }
}

const compareRecallCandidates = (left, right) => {
  const pinnedDelta = Number(right.pinned) - Number(left.pinned)
  if (pinnedDelta !== 0) return pinnedDelta
  const relevantDelta = Number(right.relevant) - Number(left.relevant)
  if (relevantDelta !== 0) return relevantDelta
  const scoreDelta = right.relevanceScore - left.relevanceScore
  if (scoreDelta !== 0) return scoreDelta
  const timeDelta = right.latestCreatedAt - left.latestCreatedAt
  if (timeDelta !== 0) return timeDelta
  const leftMemoryKey = normalizeText(left.memoryKey)
  const rightMemoryKey = normalizeText(right.memoryKey)
  if (leftMemoryKey !== rightMemoryKey) return leftMemoryKey < rightMemoryKey ? -1 : 1
  const leftSourceKey = normalizeText(
    left.primarySourceModule || (Array.isArray(left.sourceModules) ? left.sourceModules.join('|') : ''),
  )
  const rightSourceKey = normalizeText(
    right.primarySourceModule || (Array.isArray(right.sourceModules) ? right.sourceModules.join('|') : ''),
  )
  if (leftSourceKey !== rightSourceKey) return leftSourceKey < rightSourceKey ? -1 : 1
  const leftRecallText = normalizeText(left.recallText)
  const rightRecallText = normalizeText(right.recallText)
  if (leftRecallText !== rightRecallText) return leftRecallText < rightRecallText ? -1 : 1
  return left.index - right.index
}

const fitRecallItemsToBudget = (candidates, characterBudget) => {
  const selected = []
  let usedCharacters = 0

  for (const candidate of candidates) {
    const separatorCharacters = selected.length > 0 ? 2 : 0
    const remaining = characterBudget - usedCharacters - separatorCharacters
    if (remaining <= 0) break
    if (candidate.recallText.length <= remaining) {
      selected.push(candidate)
      usedCharacters += separatorCharacters + candidate.recallText.length
      continue
    }
    if (selected.length === 0 && remaining >= 40) {
      selected.push({
        ...candidate,
        recallText: `${candidate.recallText.slice(0, Math.max(1, remaining - 3)).trimEnd()}...`,
      })
    }
    break
  }

  return selected
}

export const selectMemoryRecall = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const {
    memories = [],
    queryText = '',
    limit = MEMORY_RECALL_LIMITS.resultItems,
    characterBudget = MEMORY_RECALL_LIMITS.resultCharacters,
    includeArchived = false,
  } = source
  const resultLimit = clampInteger(limit, MEMORY_RECALL_LIMITS.resultItems, 0, 12)
  const resultCharacterBudget = clampInteger(
    characterBudget,
    MEMORY_RECALL_LIMITS.resultCharacters,
    0,
    2400,
  )
  const querySignals = extractRecallSignals(queryText)
  const candidates = (Array.isArray(memories) ? memories : [])
    .map((memory, index) => {
      const source = memory && typeof memory === 'object' ? memory : {}
      const recallText = memoryRecallText(source)
      if (!recallText) return null
      const reviewStatus = normalizeText(source.reviewStatus || source.status || 'active')
      if (!includeArchived && reviewStatus === 'archived') return null
      const score = scoreMemory(source, querySignals)
      return {
        ...source,
        recallText,
        reviewStatus,
        pinned: reviewStatus === 'pinned',
        relevant: score.matchedSignalCount > 0,
        matchedSignalCount: score.matchedSignalCount,
        relevanceScore: score.relevanceScore,
        latestCreatedAt: Math.max(0, Number(source.latestCreatedAt) || 0),
        index,
      }
    })
    .filter(Boolean)
    .sort(compareRecallCandidates)

  const selected = fitRecallItemsToBudget(
    candidates.slice(0, resultLimit),
    resultCharacterBudget,
  ).map((candidate) => {
    const result = { ...candidate }
    delete result.index
    ;['sourceModules', 'sourceIds', 'factTypes', 'growthTraits', 'milestones'].forEach((key) => {
      if (Array.isArray(result[key])) result[key] = [...result[key]]
    })
    return result
  })

  return {
    items: selected,
    text: selected.map((item) => item.recallText).join('; '),
    candidateCount: candidates.length,
    relevantCount: candidates.filter((item) => item.relevant).length,
    querySignalCount: querySignals.length,
    characterCount: selected.reduce(
      (total, item, index) => total + item.recallText.length + (index > 0 ? 2 : 0),
      0,
    ),
  }
}
