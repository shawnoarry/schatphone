export const MEMORY_CONSOLIDATION_PRESSURE_LEVELS = Object.freeze({
  NONE: 'none',
  WATCH: 'watch',
  REVIEW: 'review',
})

export const MEMORY_CONSOLIDATION_PRESSURE_REASONS = Object.freeze({
  MEMORY_COUNT: 'memory_count',
  ACTIVE_MEMORY_COUNT: 'active_memory_count',
  SOURCE_REFERENCE_COUNT: 'source_reference_count',
  SUMMARY_CHARACTERS: 'summary_characters',
  CANDIDATE_PRESSURE: 'candidate_pressure',
})

export const MEMORY_CONSOLIDATION_CANDIDATE_REASONS = Object.freeze({
  DENSE_EVIDENCE: 'dense_evidence',
  LONG_SUMMARY: 'long_summary',
})

export const DEFAULT_MEMORY_CONSOLIDATION_THRESHOLDS = Object.freeze({
  memoryCountWatch: 40,
  memoryCountReview: 80,
  activeMemoryCountWatch: 36,
  activeMemoryCountReview: 72,
  sourceReferenceCountWatch: 100,
  sourceReferenceCountReview: 220,
  summaryCharactersWatch: 8000,
  summaryCharactersReview: 16000,
  denseEvidenceWatch: 5,
  denseEvidenceReview: 10,
  longSummaryWatch: 180,
  longSummaryReview: 320,
})

const REVIEW_STATUS = Object.freeze({
  ACTIVE: 'active',
  PINNED: 'pinned',
  ARCHIVED: 'archived',
})

const normalizeText = (value) =>
  typeof value === 'string' ? value.normalize('NFKC').replace(/\s+/g, ' ').trim() : ''

const normalizeKey = (value) => normalizeText(value).toLowerCase()

const clampInteger = (value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.floor(number)))
}

const normalizeThresholdPair = (source, watchKey, reviewKey) => {
  const defaultWatch = DEFAULT_MEMORY_CONSOLIDATION_THRESHOLDS[watchKey]
  const defaultReview = DEFAULT_MEMORY_CONSOLIDATION_THRESHOLDS[reviewKey]
  const watch = clampInteger(source[watchKey], defaultWatch)
  const review = clampInteger(source[reviewKey], defaultReview, watch)
  return { watch, review }
}

const normalizeThresholds = (rawThresholds) => {
  const source =
    rawThresholds && typeof rawThresholds === 'object' && !Array.isArray(rawThresholds)
      ? rawThresholds
      : {}
  const memoryCount = normalizeThresholdPair(source, 'memoryCountWatch', 'memoryCountReview')
  const activeMemoryCount = normalizeThresholdPair(
    source,
    'activeMemoryCountWatch',
    'activeMemoryCountReview',
  )
  const sourceReferenceCount = normalizeThresholdPair(
    source,
    'sourceReferenceCountWatch',
    'sourceReferenceCountReview',
  )
  const summaryCharacters = normalizeThresholdPair(
    source,
    'summaryCharactersWatch',
    'summaryCharactersReview',
  )
  const denseEvidence = normalizeThresholdPair(
    source,
    'denseEvidenceWatch',
    'denseEvidenceReview',
  )
  const longSummary = normalizeThresholdPair(source, 'longSummaryWatch', 'longSummaryReview')
  return {
    memoryCount,
    activeMemoryCount,
    sourceReferenceCount,
    summaryCharacters,
    denseEvidence,
    longSummary,
  }
}

const normalizeReviewStatus = (value) => {
  const status = normalizeKey(value)
  return Object.values(REVIEW_STATUS).includes(status) ? status : REVIEW_STATUS.ACTIVE
}

const compareText = (left, right) => {
  if (left === right) return 0
  return left < right ? -1 : 1
}

const normalizeSourceRefs = (rawSourceRefs) => {
  const refs = Array.isArray(rawSourceRefs) ? rawSourceRefs : []
  const seen = new Set()
  return refs
    .map((ref) => ({
      sourceModule: normalizeKey(ref?.sourceModule),
      sourceId: normalizeText(ref?.sourceId),
    }))
    .filter((ref) => ref.sourceModule && ref.sourceId)
    .filter((ref) => {
      const key = `${ref.sourceModule}:${ref.sourceId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) =>
      compareText(
        `${left.sourceModule}:${left.sourceId}`,
        `${right.sourceModule}:${right.sourceId}`,
      ),
    )
}

const selectSummary = (memory) =>
  normalizeText(
    memory.displaySummary ||
      memory.primarySummary ||
      memory.latestSummary ||
      memory.recallSummary ||
      '',
  )

const normalizeMemory = (rawMemory) => {
  const memory = rawMemory && typeof rawMemory === 'object' ? rawMemory : {}
  const memoryKey = normalizeKey(memory.memoryKey)
  if (!memoryKey) return null
  const summary = selectSummary(memory)
  return {
    memoryKey,
    reviewStatus: normalizeReviewStatus(memory.reviewStatus || memory.status),
    supportingCount: clampInteger(memory.supportingCount, 0),
    summaryCharacters: summary.length,
    sourceRefs: normalizeSourceRefs(memory.sourceRefs),
  }
}

const reviewStatusPriority = (status) => {
  if (status === REVIEW_STATUS.ARCHIVED) return 2
  if (status === REVIEW_STATUS.PINNED) return 1
  return 0
}

const mergeDuplicateMemory = (left, right) => ({
  memoryKey: left.memoryKey,
  reviewStatus:
    reviewStatusPriority(right.reviewStatus) > reviewStatusPriority(left.reviewStatus)
      ? right.reviewStatus
      : left.reviewStatus,
  supportingCount: Math.max(left.supportingCount, right.supportingCount),
  summaryCharacters: Math.max(left.summaryCharacters, right.summaryCharacters),
  sourceRefs: normalizeSourceRefs([...left.sourceRefs, ...right.sourceRefs]),
})

const normalizeMemories = (rawMemories) => {
  const byMemoryKey = new Map()
  ;(Array.isArray(rawMemories) ? rawMemories : []).forEach((rawMemory) => {
    const memory = normalizeMemory(rawMemory)
    if (!memory) return
    const existing = byMemoryKey.get(memory.memoryKey)
    byMemoryKey.set(
      memory.memoryKey,
      existing ? mergeDuplicateMemory(existing, memory) : memory,
    )
  })
  return [...byMemoryKey.values()].sort((left, right) =>
    compareText(left.memoryKey, right.memoryKey),
  )
}

const thresholdLevel = (value, thresholds) => {
  if (value >= thresholds.review) return MEMORY_CONSOLIDATION_PRESSURE_LEVELS.REVIEW
  if (value >= thresholds.watch) return MEMORY_CONSOLIDATION_PRESSURE_LEVELS.WATCH
  return MEMORY_CONSOLIDATION_PRESSURE_LEVELS.NONE
}

const highestLevel = (...levels) => {
  if (levels.includes(MEMORY_CONSOLIDATION_PRESSURE_LEVELS.REVIEW)) {
    return MEMORY_CONSOLIDATION_PRESSURE_LEVELS.REVIEW
  }
  if (levels.includes(MEMORY_CONSOLIDATION_PRESSURE_LEVELS.WATCH)) {
    return MEMORY_CONSOLIDATION_PRESSURE_LEVELS.WATCH
  }
  return MEMORY_CONSOLIDATION_PRESSURE_LEVELS.NONE
}

const buildCandidate = (memory, thresholds) => {
  if (memory.reviewStatus === REVIEW_STATUS.ARCHIVED) return null
  const evidenceLevel = thresholdLevel(memory.supportingCount, thresholds.denseEvidence)
  const summaryLevel = thresholdLevel(memory.summaryCharacters, thresholds.longSummary)
  const reasons = []
  if (evidenceLevel !== MEMORY_CONSOLIDATION_PRESSURE_LEVELS.NONE) {
    reasons.push(MEMORY_CONSOLIDATION_CANDIDATE_REASONS.DENSE_EVIDENCE)
  }
  if (summaryLevel !== MEMORY_CONSOLIDATION_PRESSURE_LEVELS.NONE) {
    reasons.push(MEMORY_CONSOLIDATION_CANDIDATE_REASONS.LONG_SUMMARY)
  }
  if (reasons.length === 0) return null
  return {
    memoryKey: memory.memoryKey,
    level: highestLevel(evidenceLevel, summaryLevel),
    reasons,
    reviewStatus: memory.reviewStatus,
    supportingCount: memory.supportingCount,
    summaryCharacters: memory.summaryCharacters,
    sourceRefs: memory.sourceRefs.map((ref) => ({ ...ref })),
  }
}

const candidateLevelPriority = (level) =>
  level === MEMORY_CONSOLIDATION_PRESSURE_LEVELS.REVIEW ? 1 : 0

const compareCandidates = (left, right) => {
  const levelDelta = candidateLevelPriority(right.level) - candidateLevelPriority(left.level)
  if (levelDelta !== 0) return levelDelta
  const reasonDelta = right.reasons.length - left.reasons.length
  if (reasonDelta !== 0) return reasonDelta
  const supportingDelta = right.supportingCount - left.supportingCount
  if (supportingDelta !== 0) return supportingDelta
  const characterDelta = right.summaryCharacters - left.summaryCharacters
  if (characterDelta !== 0) return characterDelta
  return compareText(left.memoryKey, right.memoryKey)
}

export const projectMemoryConsolidationPressure = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const ownerKind = normalizeKey(source.ownerKind) || 'unknown'
  const ownerKey = normalizeText(source.ownerKey)
  const memories = normalizeMemories(source.memories)
  const thresholds = normalizeThresholds(source.thresholds)
  const counts = memories.reduce(
    (acc, memory) => {
      acc.total += 1
      acc[memory.reviewStatus] += 1
      acc.sourceReferences += memory.sourceRefs.length
      acc.characters += memory.summaryCharacters
      return acc
    },
    {
      total: 0,
      active: 0,
      pinned: 0,
      archived: 0,
      sourceReferences: 0,
      characters: 0,
    },
  )
  const candidates = memories
    .map((memory) => buildCandidate(memory, thresholds))
    .filter(Boolean)
    .sort(compareCandidates)
  const levels = {
    memoryCount: thresholdLevel(counts.total, thresholds.memoryCount),
    activeMemoryCount: thresholdLevel(counts.active + counts.pinned, thresholds.activeMemoryCount),
    sourceReferenceCount: thresholdLevel(
      counts.sourceReferences,
      thresholds.sourceReferenceCount,
    ),
    summaryCharacters: thresholdLevel(counts.characters, thresholds.summaryCharacters),
    candidatePressure: highestLevel(...candidates.map((candidate) => candidate.level)),
  }
  const reasons = []
  if (levels.memoryCount !== MEMORY_CONSOLIDATION_PRESSURE_LEVELS.NONE) {
    reasons.push(MEMORY_CONSOLIDATION_PRESSURE_REASONS.MEMORY_COUNT)
  }
  if (levels.activeMemoryCount !== MEMORY_CONSOLIDATION_PRESSURE_LEVELS.NONE) {
    reasons.push(MEMORY_CONSOLIDATION_PRESSURE_REASONS.ACTIVE_MEMORY_COUNT)
  }
  if (levels.sourceReferenceCount !== MEMORY_CONSOLIDATION_PRESSURE_LEVELS.NONE) {
    reasons.push(MEMORY_CONSOLIDATION_PRESSURE_REASONS.SOURCE_REFERENCE_COUNT)
  }
  if (levels.summaryCharacters !== MEMORY_CONSOLIDATION_PRESSURE_LEVELS.NONE) {
    reasons.push(MEMORY_CONSOLIDATION_PRESSURE_REASONS.SUMMARY_CHARACTERS)
  }
  if (levels.candidatePressure !== MEMORY_CONSOLIDATION_PRESSURE_LEVELS.NONE) {
    reasons.push(MEMORY_CONSOLIDATION_PRESSURE_REASONS.CANDIDATE_PRESSURE)
  }

  return {
    ownerKind,
    ownerKey,
    level: highestLevel(...Object.values(levels)),
    counts,
    reasons,
    candidates,
  }
}
