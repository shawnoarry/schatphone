import { runEventAdapter } from '../event-engine'
import {
  createBuiltInVariantPack,
  selectEventVariant,
} from '../event-variants'
import { createSeededRandom, normalizeRandomValue } from '../random'
import {
  WORLD_CONTEXT_FAMILY,
  normalizeWorldContext,
} from '../world-context'

export const MAP_JOURNEY_EVENT_MODULE_KEY = 'map'
export const MAP_JOURNEY_EVENT_ADAPTER_KEY = 'map.journey.propose_interruption'
export const MAP_JOURNEY_ROUTE_CONDITION_EVENT_ID = 'map.journey.route_condition.v1'
export const MAP_JOURNEY_EVENT_COOLDOWN_MS = 30 * 60 * 1000
export const MAP_JOURNEY_EVENT_DAILY_LIMIT = 1
export const MAP_JOURNEY_EVENT_DELAY_SECONDS = 2 * 60

export const MAP_JOURNEY_EVENT_OUTCOME = Object.freeze({
  CONTINUE: 'continue',
  DELAY: 'delay',
})

export const MAP_JOURNEY_EVENT_PROPOSAL_STATUS = Object.freeze({
  PENDING_REVIEW: 'pending_review',
  APPLIED: 'applied',
  DISMISSED: 'dismissed',
  FAILED: 'failed',
})

export const MAP_JOURNEY_EVENT_ELIGIBLE_CHECKPOINT_IDS = Object.freeze([
  'en_route',
  'near_arrival',
])

const ELIGIBLE_CHECKPOINT_IDS = new Set(MAP_JOURNEY_EVENT_ELIGIBLE_CHECKPOINT_IDS)
const OUTCOME_IDS = new Set(Object.values(MAP_JOURNEY_EVENT_OUTCOME))
const PROPOSAL_STATUS_IDS = new Set(Object.values(MAP_JOURNEY_EVENT_PROPOSAL_STATUS))

const normalizeText = (value, fallback = '', max = 240) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeTimestamp = (value, fallback = Date.now()) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(parsed)
}

const normalizePositiveSeconds = (value, fallback = 0) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(parsed)
}

const normalizeTextList = (items, allowedValues = null, maxItems = 16) => {
  if (!Array.isArray(items)) return []
  const output = []
  items.forEach((item) => {
    const value = normalizeText(item, '', 160)
    if (!value || output.includes(value) || (allowedValues && !allowedValues.has(value))) return
    output.push(value)
  })
  return output.slice(0, maxItems)
}

const cloneValue = (value) => {
  if (Array.isArray(value)) return value.map((item) => cloneValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]))
  }
  return value
}

const MAP_JOURNEY_ROUTE_CONDITION_TEMPLATE = Object.freeze({
  id: MAP_JOURNEY_ROUTE_CONDITION_EVENT_ID,
  moduleKey: MAP_JOURNEY_EVENT_MODULE_KEY,
  triggerModes: Object.freeze(['random']),
  probability: 0.3,
  cooldownMs: MAP_JOURNEY_EVENT_COOLDOWN_MS,
  dailyLimit: MAP_JOURNEY_EVENT_DAILY_LIMIT,
  conditions: Object.freeze([
    Object.freeze({ key: 'journey.status', op: 'eq', value: 'traveling' }),
    Object.freeze({
      key: 'journey.checkpointId',
      op: 'in',
      value: MAP_JOURNEY_EVENT_ELIGIBLE_CHECKPOINT_IDS,
    }),
  ]),
  effect: Object.freeze({
    adapterKey: MAP_JOURNEY_EVENT_ADAPTER_KEY,
    payloadSchema: 'MapJourneyEventProposalV1',
  }),
})

const createVariant = ({
  id,
  worldScope,
  titleZh,
  titleEn,
  summaryZh,
  summaryEn,
  detailZh,
  detailEn,
} = {}) =>
  Object.freeze({
    id,
    templateId: MAP_JOURNEY_ROUTE_CONDITION_EVENT_ID,
    worldScope: Object.freeze(worldScope),
    title: titleEn,
    titleZh,
    titleEn,
    summaryZh,
    summaryEn,
    detailZh,
    detailEn,
    impactLevel: 'low',
    reversible: true,
    requiresUserConfirmation: true,
    safetyTags: Object.freeze(['journey_only', 'no_owner_mutation', 'bounded_delay']),
  })

const MAP_JOURNEY_ROUTE_CONDITION_VARIANTS = Object.freeze([
  createVariant({
    id: 'map.journey.route_condition.daily.brief_slowdown.v1',
    worldScope: [WORLD_CONTEXT_FAMILY.DAILY],
    titleZh: '前方通行稍缓',
    titleEn: 'Brief slowdown ahead',
    summaryZh: '途中出现短暂拥堵，行程会继续；你也可以为预计到达留出两分钟缓冲。',
    summaryEn: 'A brief slowdown is forming. The journey continues; you can add a two-minute ETA buffer.',
    detailZh: '这是本地行程事件估计，不代表实时路况或导航信息。',
    detailEn: 'This is a local journey event estimate, not live traffic or navigation data.',
  }),
  createVariant({
    id: 'map.journey.route_condition.sci_fi.corridor_check.v1',
    worldScope: [WORLD_CONTEXT_FAMILY.SCI_FI],
    titleZh: '通行廊道短暂校验',
    titleEn: 'Corridor check in progress',
    summaryZh: '前方通行节点正在校验，行程会继续；你也可以为预计到达留出两分钟等待窗口。',
    summaryEn: 'A transit node is validating passage. The journey continues; you can add a two-minute ETA window.',
    detailZh: '结果只影响本次行程的本地预计时间。',
    detailEn: 'The result only adjusts this journey\'s local estimated time.',
  }),
  createVariant({
    id: 'map.journey.route_condition.apocalypse.passage_check.v1',
    worldScope: [WORLD_CONTEXT_FAMILY.APOCALYPSE],
    titleZh: '前方通道需要确认',
    titleEn: 'Passage check ahead',
    summaryZh: '前方通道暂时收紧，行程会继续；你也可以为预计到达增加两分钟观察时间。',
    summaryEn: 'The passage ahead has narrowed. The journey continues; you can add two minutes to the ETA.',
    detailZh: '不会改变目的地、物资、关系或其他世界状态。',
    detailEn: 'This does not change destination, supplies, relationships, or other world state.',
  }),
])

const MAP_JOURNEY_BUILT_IN_VARIANTS = Object.freeze({
  [MAP_JOURNEY_ROUTE_CONDITION_EVENT_ID]: MAP_JOURNEY_ROUTE_CONDITION_VARIANTS,
})

const getSurpriseMode = (simulationStore) => {
  const value = simulationStore?.surpriseMode
  if (value && typeof value === 'object' && 'value' in value) return value.value
  return value || simulationStore?.settings?.surpriseMode || 'low'
}

const getProbabilityForSurpriseMode = (mode) => {
  if (mode === 'high') return 1
  if (mode === 'balanced') return 0.55
  if (mode === 'low') return 0.3
  return 0
}

const createProposalId = (journeyId, checkpointId) =>
  `map_journey_event_${journeyId}_${checkpointId}`
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .slice(0, 180)

const normalizeProposalSource = (rawSource = {}) => {
  const source = rawSource && typeof rawSource === 'object' ? rawSource : {}
  return {
    journeyId: normalizeText(source.journeyId, '', 140),
    journeySchemaVersion: Math.max(0, Math.floor(Number(source.journeySchemaVersion) || 0)),
    checkpointId: normalizeText(source.checkpointId, '', 80),
    checkpointReachedAt: normalizeTimestamp(source.checkpointReachedAt, 0),
    mapPackId: normalizeText(source.mapPackId, '', 140),
    worldPackId: normalizeText(source.worldPackId, '', 140),
    fromLabel: normalizeText(source.fromLabel, '', 160),
    toLabel: normalizeText(source.toLabel, '', 160),
    transportMode: normalizeText(source.transportMode, '', 80),
  }
}

const normalizeProposalProvenance = (rawProvenance = {}) => {
  const provenance = rawProvenance && typeof rawProvenance === 'object' ? rawProvenance : {}
  return {
    runtimeLogId: normalizeText(provenance.runtimeLogId, '', 180),
    triggerSource: normalizeText(provenance.triggerSource, 'random', 40),
    variantId: normalizeText(provenance.variantId, '', 180),
    variantPackId: normalizeText(provenance.variantPackId, '', 180),
    worldContextId: normalizeText(provenance.worldContextId, '', 180),
    activeWorldBookIds: normalizeTextList(provenance.activeWorldBookIds, null, 24),
  }
}

export const normalizeMapJourneyEventProposal = (rawProposal, index = 0) => {
  if (!rawProposal || typeof rawProposal !== 'object') return null
  const source = normalizeProposalSource(rawProposal.source)
  const journeyId = normalizeText(rawProposal.journeyId || source.journeyId, '', 140)
  const checkpointId = normalizeText(rawProposal.checkpointId || source.checkpointId, '', 80)
  if (!journeyId || !ELIGIBLE_CHECKPOINT_IDS.has(checkpointId)) return null
  const createdAt = normalizeTimestamp(rawProposal.createdAt, Date.now() - index)
  const id = normalizeText(
    rawProposal.id,
    createProposalId(journeyId, checkpointId),
    180,
  )
  const status = PROPOSAL_STATUS_IDS.has(rawProposal.status)
    ? rawProposal.status
    : MAP_JOURNEY_EVENT_PROPOSAL_STATUS.PENDING_REVIEW
  const allowedOutcomes = normalizeTextList(rawProposal.allowedOutcomes, OUTCOME_IDS, 4)

  return {
    id,
    schemaVersion: 1,
    eventId: normalizeText(
      rawProposal.eventId,
      MAP_JOURNEY_ROUTE_CONDITION_EVENT_ID,
      160,
    ),
    moduleKey: MAP_JOURNEY_EVENT_MODULE_KEY,
    status,
    journeyId,
    checkpointId,
    titleZh: normalizeText(rawProposal.titleZh, '途中情况更新', 120),
    titleEn: normalizeText(rawProposal.titleEn, 'Journey update', 120),
    summaryZh: normalizeText(rawProposal.summaryZh, '', 360),
    summaryEn: normalizeText(rawProposal.summaryEn, '', 360),
    detailZh: normalizeText(rawProposal.detailZh, '', 360),
    detailEn: normalizeText(rawProposal.detailEn, '', 360),
    allowedOutcomes:
      allowedOutcomes.length > 0
        ? allowedOutcomes
        : [MAP_JOURNEY_EVENT_OUTCOME.CONTINUE, MAP_JOURNEY_EVENT_OUTCOME.DELAY],
    delaySeconds: Math.min(
      MAP_JOURNEY_EVENT_DELAY_SECONDS,
      normalizePositiveSeconds(rawProposal.delaySeconds, MAP_JOURNEY_EVENT_DELAY_SECONDS),
    ),
    selectedOutcome: OUTCOME_IDS.has(rawProposal.selectedOutcome)
      ? rawProposal.selectedOutcome
      : '',
    resolutionReason: normalizeText(rawProposal.resolutionReason, '', 160),
    source: {
      ...source,
      journeyId,
      checkpointId,
    },
    provenance: normalizeProposalProvenance(rawProposal.provenance),
    createdAt,
    reviewedAt: normalizeTimestamp(rawProposal.reviewedAt, 0),
    appliedAt: normalizeTimestamp(rawProposal.appliedAt, 0),
  }
}

export const normalizeMapJourneyEventProposals = (rawProposals) => {
  if (!Array.isArray(rawProposals)) return []
  const seen = new Set()
  return rawProposals
    .map((item, index) => normalizeMapJourneyEventProposal(item, index))
    .filter((item) => {
      if (!item || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 120)
}

export const buildMapJourneyEventVariantPack = ({ worldContext, now = Date.now() } = {}) => {
  const normalizedWorldContext = normalizeWorldContext(worldContext)
  return createBuiltInVariantPack({
    id: `map_journey_variant_pack_${normalizedWorldContext.id}`,
    worldContext: normalizedWorldContext,
    moduleKeys: [MAP_JOURNEY_EVENT_MODULE_KEY],
    variantsByTemplateId: MAP_JOURNEY_BUILT_IN_VARIANTS,
    now,
  })
}

export const resolveMapJourneyEventVariant = ({
  worldContext,
  variantPack,
  seed,
  randomValue,
  now = Date.now(),
} = {}) => {
  const normalizedWorldContext = normalizeWorldContext(worldContext)
  const pack = variantPack || buildMapJourneyEventVariantPack({
    worldContext: normalizedWorldContext,
    now,
  })
  return {
    ...selectEventVariant({
      templateId: MAP_JOURNEY_ROUTE_CONDITION_EVENT_ID,
      variantPack: pack,
      worldContext: normalizedWorldContext,
      seed,
      randomValue,
    }),
    variantPack: pack,
    worldContext: normalizedWorldContext,
  }
}

export const buildMapJourneyCheckpointEventContext = (snapshot = {}) => {
  const checkpoint = Array.isArray(snapshot.checkpoints)
    ? snapshot.checkpoints.find((item) => item?.id === snapshot.checkpointId)
    : null
  return {
    journey: {
      journeyId: normalizeText(snapshot.journeyId, '', 140),
      journeySchemaVersion: Math.max(0, Math.floor(Number(snapshot.journeySchemaVersion) || 0)),
      status: normalizeText(snapshot.status, '', 40),
      phase: normalizeText(snapshot.phase, '', 80),
      checkpointId: normalizeText(snapshot.checkpointId, '', 80),
      checkpointReachedAt: normalizeTimestamp(
        snapshot.checkpointReachedAt || checkpoint?.reachedAt,
        0,
      ),
      mapPackId: normalizeText(snapshot.mapPackId, '', 140),
      worldPackId: normalizeText(snapshot.worldPackId, '', 140),
      fromLabel: normalizeText(snapshot.fromLabel, '', 160),
      toLabel: normalizeText(snapshot.toLabel, '', 160),
      transportMode: normalizeText(snapshot.transportMode, '', 80),
    },
  }
}

const recordSkippedAttempt = ({
  simulationStore,
  snapshot,
  reason,
  now,
  variant,
  variantPack,
  worldContext,
} = {}) => {
  const logInput = {
    eventId: MAP_JOURNEY_ROUTE_CONDITION_EVENT_ID,
    moduleKey: MAP_JOURNEY_EVENT_MODULE_KEY,
    targetId: normalizeText(snapshot?.journeyId, '', 140),
    adapterKey: MAP_JOURNEY_EVENT_ADAPTER_KEY,
    triggerSource: 'random',
    status: 'skipped',
    reason,
    variantId: variant?.id || '',
    variantPackId: variantPack?.id || '',
    worldContextId: worldContext?.id || '',
    activeWorldBookIds: worldContext?.activeWorldBookIds || [],
    at: now,
  }
  const log = simulationStore?.recordEventLog?.(logInput) || logInput
  return {
    ok: false,
    status: 'skipped',
    reason,
    adapterResult: null,
    log,
  }
}

export const runMapJourneyCheckpointEvent = ({
  simulationStore,
  snapshot,
  worldContext,
  variantPack,
  randomValue,
  seed,
  now = Date.now(),
  proposalAdapter,
} = {}) => {
  const context = buildMapJourneyCheckpointEventContext(snapshot)
  const journey = context.journey
  const normalizedNow = normalizeTimestamp(now)
  const surpriseMode = getSurpriseMode(simulationStore)
  const variantResolution = resolveMapJourneyEventVariant({
    worldContext,
    variantPack,
    seed: seed || `${journey.journeyId}:${journey.checkpointId}`,
    randomValue,
    now: normalizedNow,
  })

  if (!journey.journeyId || !ELIGIBLE_CHECKPOINT_IDS.has(journey.checkpointId)) {
    return recordSkippedAttempt({
      simulationStore,
      snapshot: journey,
      ...variantResolution,
      reason: 'checkpoint_not_eligible',
      now: normalizedNow,
    })
  }
  if (simulationStore?.isModuleEventsEnabled?.(MAP_JOURNEY_EVENT_MODULE_KEY) === false) {
    return recordSkippedAttempt({
      simulationStore,
      snapshot: journey,
      ...variantResolution,
      reason: 'module_events_disabled',
      now: normalizedNow,
    })
  }
  if (surpriseMode === 'off') {
    return recordSkippedAttempt({
      simulationStore,
      snapshot: journey,
      ...variantResolution,
      reason: 'surprise_mode_off',
      now: normalizedNow,
    })
  }

  const proposalId = createProposalId(journey.journeyId, journey.checkpointId)
  if (simulationStore?.getMapJourneyEventProposal?.(proposalId)) {
    return recordSkippedAttempt({
      simulationStore,
      snapshot: journey,
      ...variantResolution,
      reason: 'checkpoint_already_evaluated',
      now: normalizedNow,
    })
  }

  const injectedRandomValue =
    randomValue === undefined
      ? normalizeRandomValue(
          createSeededRandom(
            seed || `${journey.journeyId}:${journey.checkpointId}:${variantResolution.worldContext.id}`,
          )(),
        )
      : normalizeRandomValue(randomValue)
  const template = {
    ...MAP_JOURNEY_ROUTE_CONDITION_TEMPLATE,
    probability: getProbabilityForSurpriseMode(surpriseMode),
  }
  const variant = variantResolution.variant || MAP_JOURNEY_ROUTE_CONDITION_VARIANTS[0]
  const buildProposal = () =>
    normalizeMapJourneyEventProposal({
      id: proposalId,
      eventId: MAP_JOURNEY_ROUTE_CONDITION_EVENT_ID,
      status: MAP_JOURNEY_EVENT_PROPOSAL_STATUS.PENDING_REVIEW,
      journeyId: journey.journeyId,
      checkpointId: journey.checkpointId,
      titleZh: variant.titleZh,
      titleEn: variant.titleEn,
      summaryZh: variant.summaryZh,
      summaryEn: variant.summaryEn,
      detailZh: variant.detailZh,
      detailEn: variant.detailEn,
      allowedOutcomes: [
        MAP_JOURNEY_EVENT_OUTCOME.CONTINUE,
        MAP_JOURNEY_EVENT_OUTCOME.DELAY,
      ],
      delaySeconds: MAP_JOURNEY_EVENT_DELAY_SECONDS,
      source: journey,
      provenance: {
        triggerSource: 'random',
        variantId: variant.id,
        variantPackId: variantResolution.variantPack.id,
        worldContextId: variantResolution.worldContext.id,
        activeWorldBookIds: variantResolution.worldContext.activeWorldBookIds,
      },
      createdAt: normalizedNow,
    })
  const adapter =
    typeof proposalAdapter === 'function'
      ? proposalAdapter
      : () => simulationStore?.upsertMapJourneyEventProposal?.(buildProposal())

  const result = runEventAdapter({
    template,
    context,
    adapters: {
      [MAP_JOURNEY_EVENT_ADAPTER_KEY]: adapter,
    },
    triggerSource: 'random',
    randomValue: injectedRandomValue,
    seed,
    targetId: journey.journeyId,
    now: normalizedNow,
    simulationStore,
    variant,
    variantPack: variantResolution.variantPack,
    worldContext: variantResolution.worldContext,
  })

  if (result.ok && result.adapterResult && result.log?.id) {
    const proposal = simulationStore?.upsertMapJourneyEventProposal?.({
      ...cloneValue(result.adapterResult),
      provenance: {
        ...cloneValue(result.adapterResult.provenance),
        runtimeLogId: result.log.id,
      },
    })
    return {
      ...result,
      adapterResult: proposal || result.adapterResult,
      reason: result.evaluation?.reason || 'eligible_random_passed',
    }
  }

  return {
    ...result,
    reason: result.evaluation?.reason || result.log?.reason || 'map_journey_event_not_triggered',
  }
}

export const buildMapJourneyEventReviewResult = (proposal, outcome, at = Date.now()) => {
  const normalized = normalizeMapJourneyEventProposal(proposal)
  const selectedOutcome = normalizeText(outcome, '', 40)
  if (!normalized) return { ok: false, code: 'MAP_JOURNEY_EVENT_PROPOSAL_INVALID' }
  if (normalized.status !== MAP_JOURNEY_EVENT_PROPOSAL_STATUS.PENDING_REVIEW) {
    return { ok: false, code: 'MAP_JOURNEY_EVENT_NOT_PENDING' }
  }
  if (!normalized.allowedOutcomes.includes(selectedOutcome)) {
    return { ok: false, code: 'MAP_JOURNEY_EVENT_OUTCOME_NOT_ALLOWED' }
  }
  return {
    ok: true,
    code: 'MAP_JOURNEY_EVENT_REVIEWED',
    authorization: 'event_runtime_reviewed',
    proposalId: normalized.id,
    eventId: normalized.eventId,
    journeyId: normalized.journeyId,
    checkpointId: normalized.checkpointId,
    outcome: selectedOutcome,
    delaySeconds:
      selectedOutcome === MAP_JOURNEY_EVENT_OUTCOME.DELAY
        ? normalized.delaySeconds
        : 0,
    reviewedAt: normalizeTimestamp(at),
  }
}
