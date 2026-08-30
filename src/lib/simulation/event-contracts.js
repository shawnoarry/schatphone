export const EVENT_TEMPLATE_SCHEMA_VERSION = 2
export const EVENT_VARIANT_PACK_SCHEMA_VERSION = 1
export const EVENT_INSTANCE_SCHEMA_VERSION = 1
export const EVENT_TEXT_SCHEMA_VERSION = 1
export const EVENT_MEDIA_INTENT_SCHEMA_VERSION = 1

export const EVENT_INSTANCE_LIFECYCLE = Object.freeze({
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
  UNAVAILABLE: 'unavailable',
})

export const EVENT_TEXT_MODE = Object.freeze({
  LOCAL_ONLY: 'local_only',
  OPTIONAL_AI_AFTER_ENTRY: 'optional_ai_after_entry',
})

export const EVENT_TEXT_STATUS = Object.freeze({
  LOCAL_ONLY: 'local_only',
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FALLBACK: 'fallback',
})

export const EVENT_TEXT_SOURCE = Object.freeze({
  LOCAL: 'local',
  AI: 'ai',
})

export const EVENT_TEXT_FAILURE_CODE = Object.freeze({
  TEXT_MODE_LOCAL_ONLY: 'text_mode_local_only',
  PROVIDER_DISABLED: 'provider_disabled',
  OFFLINE: 'offline',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  PROVIDER_TIMEOUT: 'provider_timeout',
  RATE_LIMITED: 'rate_limited',
  QUOTA_EXHAUSTED: 'quota_exhausted',
  INVALID_SCHEMA: 'invalid_schema',
  CONTENT_REJECTED: 'content_rejected',
  CONTEXT_STALE: 'context_stale',
  REQUEST_INTERRUPTED: 'request_interrupted',
})

export const EVENT_TEXT_LIMITS = Object.freeze({
  requestTimeoutMs: 20_000,
  serializedRequestCharacters: 8_000,
  worldContextDigestCharacters: 1_200,
  participants: 4,
  contextFacts: 24,
  contextFactCharacters: 160,
  titleCharacters: 80,
  openingCharacters: 800,
  environmentCharacters: 500,
  dialogueBeats: 6,
  dialogueBeatCharacters: 240,
  choiceLabelCharacters: 80,
  consequenceCharacters: 320,
  totalOutputCharacters: 3_200,
})

const ACTIVATION_SCOPES = new Set([
  'remote',
  'nearby',
  'onsite',
  'interior',
  'journey_checkpoint',
  'activity_checkpoint',
])
const DISCOVERABILITY_MODES = new Set([
  'visible',
  'locked_teaser',
  'hidden_until_eligible',
  'hidden',
])
const EVENT_LIFECYCLES = new Set(Object.values(EVENT_INSTANCE_LIFECYCLE))
const EVENT_TEXT_MODES = new Set(Object.values(EVENT_TEXT_MODE))
const EVENT_TEXT_STATUSES = new Set(Object.values(EVENT_TEXT_STATUS))
const EVENT_TEXT_SOURCES = new Set(Object.values(EVENT_TEXT_SOURCE))
const EVENT_TEXT_FAILURE_CODES = new Set(Object.values(EVENT_TEXT_FAILURE_CODE))
const POSITION_PROVENANCE = new Set(['manual', 'journey_arrival'])
const REQUEST_STATES = new Set(['not_requested', 'pending', 'validated', 'rejected'])
const RENDER_MODES = new Set(['text_only', 'asset'])

export const isEventPlainObject = (value) =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

export const cloneEventValue = (value) => {
  if (Array.isArray(value)) return value.map((item) => cloneEventValue(item))
  if (isEventPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneEventValue(item)]),
    )
  }
  return value
}

export const normalizeEventText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

export const normalizeEventId = (value, max = 180) =>
  normalizeEventText(value, '', max).toLowerCase()

const normalizeVersion = (value, fallback = 1) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback
}

const normalizeTimestamp = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : Math.max(0, fallback)
}

const normalizeProbability = (value, fallback = 1) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback
}

const normalizeIdList = (items, maxItems = 24, allowedValues = null) => {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  const output = []
  items.forEach((item) => {
    const normalized = normalizeEventId(item)
    if (!normalized || seen.has(normalized) || (allowedValues && !allowedValues.has(normalized))) {
      return
    }
    seen.add(normalized)
    output.push(normalized)
  })
  return output.slice(0, maxItems)
}

const normalizeConditions = (items) => {
  if (!Array.isArray(items)) return []
  return items
    .filter(isEventPlainObject)
    .map((item) => ({
      key: normalizeEventText(item.key, '', 160),
      op: normalizeEventId(item.op, 40),
      value: cloneEventValue(item.value),
    }))
    .filter((item) => item.key && item.op)
    .slice(0, 24)
}

const normalizeTemplateChoices = (items) => {
  if (!Array.isArray(items)) return []
  const seenChoices = new Set()
  const seenOutcomes = new Set()
  return items
    .filter(isEventPlainObject)
    .map((item) => {
      const choiceId = normalizeEventId(item.id)
      const outcomeId = normalizeEventId(item.outcomeId)
      const adapterKey = normalizeEventId(item.effectRequest?.adapterKey)
      const payloadSchema = normalizeEventText(item.effectRequest?.payloadSchema, '', 160)
      if (
        !choiceId ||
        !outcomeId ||
        !adapterKey ||
        !payloadSchema ||
        seenChoices.has(choiceId) ||
        seenOutcomes.has(outcomeId)
      ) {
        return null
      }
      seenChoices.add(choiceId)
      seenOutcomes.add(outcomeId)
      return {
        id: choiceId,
        outcomeId,
        effectRequest: { adapterKey, payloadSchema },
      }
    })
    .filter(Boolean)
    .slice(0, 3)
}

export const normalizeEventTemplateV2 = (rawTemplate) => {
  if (!isEventPlainObject(rawTemplate) || Number(rawTemplate.schemaVersion) !== 2) return null
  const id = normalizeEventId(rawTemplate.id)
  const archetypeId = normalizeEventId(rawTemplate.archetypeId)
  const sourceModuleKey = normalizeEventId(rawTemplate.owner?.sourceModuleKey, 80)
  const effectModuleKey = normalizeEventId(rawTemplate.owner?.effectModuleKey, 80)
  const recordType = normalizeEventId(rawTemplate.source?.recordType, 120)
  const checkpointId = normalizeEventId(rawTemplate.source?.checkpointId)
  const activationScope = normalizeEventId(rawTemplate.trigger?.activationScope, 80)
  const discoverability = normalizeEventId(rawTemplate.trigger?.discoverability, 80)
  const choices = normalizeTemplateChoices(rawTemplate.choices)
  const surfaceKeys = normalizeIdList(rawTemplate.presentation?.surfaceKeys, 8)
  const expansionKind = normalizeEventId(rawTemplate.presentation?.expansionKind, 80)
  const textMaterializationMode = normalizeEventId(
    rawTemplate.presentation?.textMaterializationMode,
    80,
  )

  if (
    !id ||
    !archetypeId ||
    !sourceModuleKey ||
    !effectModuleKey ||
    !recordType ||
    !checkpointId ||
    !ACTIVATION_SCOPES.has(activationScope) ||
    !DISCOVERABILITY_MODES.has(discoverability) ||
    choices.length === 0 ||
    surfaceKeys.length === 0 ||
    !expansionKind ||
    !EVENT_TEXT_MODES.has(textMaterializationMode)
  ) {
    return null
  }

  return {
    schemaVersion: EVENT_TEMPLATE_SCHEMA_VERSION,
    id,
    version: normalizeVersion(rawTemplate.version),
    archetypeId,
    owner: { sourceModuleKey, effectModuleKey },
    source: { recordType, checkpointId },
    trigger: {
      modes: normalizeIdList(rawTemplate.trigger?.modes, 8),
      activationScope,
      discoverability,
      probability: normalizeProbability(rawTemplate.trigger?.probability),
      cooldownMs: Math.max(0, normalizeTimestamp(rawTemplate.trigger?.cooldownMs)),
      dailyLimit: Math.max(0, Math.floor(Number(rawTemplate.trigger?.dailyLimit) || 0)),
      targetScope: normalizeEventId(rawTemplate.trigger?.targetScope, 80),
      modulePermissionKey: normalizeEventId(rawTemplate.trigger?.modulePermissionKey, 80),
      intensityPolicy: normalizeEventId(rawTemplate.trigger?.intensityPolicy, 80),
    },
    eligibility: {
      requiredPlaceCategoryIds: normalizeIdList(
        rawTemplate.eligibility?.requiredPlaceCategoryIds,
        24,
      ),
      requiredCapabilityIds: normalizeIdList(rawTemplate.eligibility?.requiredCapabilityIds, 24),
      acceptedPositionProvenance: normalizeIdList(
        rawTemplate.eligibility?.acceptedPositionProvenance,
        8,
        POSITION_PROVENANCE,
      ),
      requiredPlaceSessionState: normalizeEventId(
        rawTemplate.eligibility?.requiredPlaceSessionState,
        80,
      ),
      conditions: normalizeConditions(rawTemplate.eligibility?.conditions),
    },
    presentation: {
      surfaceKeys,
      expansionKind,
      textMaterializationMode,
      mediaIntentKey: normalizeEventId(rawTemplate.presentation?.mediaIntentKey),
    },
    choices,
    safety: {
      risk: normalizeEventId(rawTemplate.safety?.risk, 40) || 'low',
      requiresAdditionalConfirmation: rawTemplate.safety?.requiresAdditionalConfirmation === true,
      reversibleExternalMutation: rawTemplate.safety?.reversibleExternalMutation === true,
      externalMutation: normalizeEventId(rawTemplate.safety?.externalMutation, 80),
      relationshipGatePresetId: normalizeEventId(rawTemplate.safety?.relationshipGatePresetId),
    },
  }
}

export const normalizeMediaIntentV1 = (rawIntent) => {
  if (!isEventPlainObject(rawIntent) || Number(rawIntent.schemaVersion) !== 1) return null
  const slot = normalizeEventId(rawIntent.slot, 80)
  const sceneKey = normalizeEventId(rawIntent.sceneKey)
  if (!slot || !sceneKey) return null
  return {
    schemaVersion: EVENT_MEDIA_INTENT_SCHEMA_VERSION,
    slot,
    sceneKey,
    placeCategoryId: normalizeEventId(rawIntent.placeCategoryId),
    capabilityIds: normalizeIdList(rawIntent.capabilityIds || rawIntent.requiredCapabilityIds, 24),
    toneTags: normalizeIdList(rawIntent.toneTags, 16),
    required: rawIntent.required === true,
    fallbackMode: normalizeEventId(rawIntent.fallbackMode, 40) || 'text_only',
  }
}

const normalizeLocalizedValue = (rawValue, max) => {
  const source = isEventPlainObject(rawValue) ? rawValue : {}
  return {
    zh: normalizeEventText(source.zh ?? source.labelZh, '', max),
    en: normalizeEventText(source.en ?? source.labelEn, '', max),
  }
}

const normalizeLocalCopy = (rawCopy) => {
  if (!isEventPlainObject(rawCopy)) return null
  const source = rawCopy
  const invitation = isEventPlainObject(source.invitation) ? source.invitation : {}
  const scene = isEventPlainObject(source.scene) ? source.scene : {}
  const choicesById = isEventPlainObject(source.choicesById)
    ? Object.fromEntries(
        Object.entries(source.choicesById)
          .map(([id, value]) => [normalizeEventId(id), normalizeLocalizedValue(value, 80)])
          .filter(([id, value]) => id && value.zh && value.en),
      )
    : {}
  const consequencesByOutcomeId = isEventPlainObject(source.consequencesByOutcomeId)
    ? Object.fromEntries(
        Object.entries(source.consequencesByOutcomeId)
          .map(([id, value]) => [normalizeEventId(id), normalizeLocalizedValue(value, 320)])
          .filter(([id, value]) => id && value.zh && value.en),
      )
    : {}
  const normalized = {
    invitation: {
      titleZh: normalizeEventText(invitation.titleZh, '', 80),
      titleEn: normalizeEventText(invitation.titleEn, '', 80),
      summaryZh: normalizeEventText(invitation.summaryZh, '', 320),
      summaryEn: normalizeEventText(invitation.summaryEn, '', 320),
    },
    scene: {
      titleZh: normalizeEventText(scene.titleZh, '', 80),
      titleEn: normalizeEventText(scene.titleEn, '', 80),
      openingZh: normalizeEventText(scene.openingZh, '', 800),
      openingEn: normalizeEventText(scene.openingEn, '', 800),
      environmentZh: normalizeEventText(scene.environmentZh, '', 500),
      environmentEn: normalizeEventText(scene.environmentEn, '', 500),
    },
    choicesById,
    consequencesByOutcomeId,
  }
  if (
    !normalized.invitation.titleZh ||
    !normalized.invitation.titleEn ||
    !normalized.scene.titleZh ||
    !normalized.scene.titleEn ||
    !normalized.scene.openingZh ||
    !normalized.scene.openingEn
  ) {
    return null
  }
  return normalized
}

const normalizeVariant = (rawVariant) => {
  if (!isEventPlainObject(rawVariant)) return null
  const id = normalizeEventId(rawVariant.id)
  const localCopy = normalizeLocalCopy(rawVariant.localCopy)
  const mediaIntent = normalizeMediaIntentV1(rawVariant.mediaIntent)
  if (!id || !localCopy || !mediaIntent) return null
  return {
    id,
    version: normalizeVersion(rawVariant.version),
    placeCategoryIds: normalizeIdList(rawVariant.placeCategoryIds, 24),
    toneTags: normalizeIdList(rawVariant.toneTags, 16),
    participantSlots: Array.isArray(rawVariant.participantSlots)
      ? rawVariant.participantSlots
          .filter(isEventPlainObject)
          .map((slot) => ({
            id: normalizeEventId(slot.id),
            kind: normalizeEventId(slot.kind, 80),
            required: slot.required === true,
            fallbackLabelZh: normalizeEventText(slot.fallbackLabelZh, '', 80),
            fallbackLabelEn: normalizeEventText(slot.fallbackLabelEn, '', 80),
          }))
          .filter((slot) => slot.id && slot.kind)
          .slice(0, EVENT_TEXT_LIMITS.participants)
      : [],
    localCopy,
    mediaIntent,
  }
}

export const normalizeEventVariantPackV1 = (rawPack) => {
  if (!isEventPlainObject(rawPack) || Number(rawPack.schemaVersion) !== 1) return null
  const id = normalizeEventId(rawPack.id)
  const worldContextFamily = normalizeEventId(rawPack.worldContextFamily, 80)
  const contentProfileId = normalizeEventId(rawPack.contentProfileId, 80)
  if (!id || !worldContextFamily || !contentProfileId) return null
  const sourceVariants = isEventPlainObject(rawPack.templateVariants)
    ? rawPack.templateVariants
    : {}
  const templateVariants = Object.fromEntries(
    Object.entries(sourceVariants)
      .map(([templateId, rawVariants]) => [
        normalizeEventId(templateId),
        Array.isArray(rawVariants) ? rawVariants.map(normalizeVariant).filter(Boolean) : [],
      ])
      .filter(([templateId, variants]) => templateId && variants.length > 0),
  )
  if (Object.keys(templateVariants).length === 0) return null
  return {
    schemaVersion: EVENT_VARIANT_PACK_SCHEMA_VERSION,
    id,
    version: normalizeVersion(rawPack.version),
    worldContextFamily,
    contentProfileId,
    locales: normalizeEventTextList(rawPack.locales, 8, 20),
    templateVariants,
  }
}

export const normalizeEventTextList = (items, maxItems = 24, maxLength = 160) => {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  const output = []
  items.forEach((item) => {
    const normalized = normalizeEventText(item, '', maxLength)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    output.push(normalized)
  })
  return output.slice(0, maxItems)
}

const normalizeDisplayCopy = (
  rawCopy,
  { choiceIds = [], outcomeIds = [], participantIds = [], requireAllChoiceLabels = false } = {},
) => {
  if (!isEventPlainObject(rawCopy)) return null
  const allowedChoices = new Set(normalizeIdList(choiceIds, 3))
  const allowedOutcomes = new Set(normalizeIdList(outcomeIds, 3))
  const allowedParticipants = new Set(
    normalizeIdList(participantIds, EVENT_TEXT_LIMITS.participants),
  )
  const choiceEntries = isEventPlainObject(rawCopy.choiceLabels)
    ? Object.entries(rawCopy.choiceLabels)
    : []
  const consequenceEntries = isEventPlainObject(rawCopy.consequenceByOutcomeId)
    ? Object.entries(rawCopy.consequenceByOutcomeId)
    : []
  if (
    choiceEntries.some(([id]) => !allowedChoices.has(normalizeEventId(id))) ||
    consequenceEntries.some(([id]) => !allowedOutcomes.has(normalizeEventId(id)))
  ) {
    return null
  }
  const choiceLabels = Object.fromEntries(
    choiceEntries
      .map(([id, value]) => [
        normalizeEventId(id),
        normalizeEventText(value, '', EVENT_TEXT_LIMITS.choiceLabelCharacters),
      ])
      .filter(([id, value]) => allowedChoices.has(id) && value),
  )
  if (
    requireAllChoiceLabels &&
    (Object.keys(choiceLabels).length !== allowedChoices.size ||
      [...allowedChoices].some((id) => !choiceLabels[id]))
  ) {
    return null
  }
  const consequenceByOutcomeId = Object.fromEntries(
    consequenceEntries
      .map(([id, value]) => [
        normalizeEventId(id),
        normalizeEventText(value, '', EVENT_TEXT_LIMITS.consequenceCharacters),
      ])
      .filter(([id, value]) => allowedOutcomes.has(id) && value),
  )
  const dialogue = Array.isArray(rawCopy.dialogue)
    ? rawCopy.dialogue
        .filter(isEventPlainObject)
        .map((beat) => ({
          speakerRef: normalizeEventId(beat.speakerRef),
          text: normalizeEventText(beat.text, '', EVENT_TEXT_LIMITS.dialogueBeatCharacters),
        }))
        .filter(
          (beat) =>
            beat.text &&
            (!beat.speakerRef ||
              allowedParticipants.size === 0 ||
              allowedParticipants.has(beat.speakerRef)),
        )
        .slice(0, EVENT_TEXT_LIMITS.dialogueBeats)
    : []
  const normalized = {
    locale: normalizeEventText(rawCopy.locale, 'en', 20),
    title: normalizeEventText(rawCopy.title, '', EVENT_TEXT_LIMITS.titleCharacters),
    opening: normalizeEventText(rawCopy.opening, '', EVENT_TEXT_LIMITS.openingCharacters),
    environment: normalizeEventText(
      rawCopy.environment,
      '',
      EVENT_TEXT_LIMITS.environmentCharacters,
    ),
    dialogue,
    choiceLabels,
    consequenceByOutcomeId,
  }
  if (!normalized.title || !normalized.opening) return null
  return JSON.stringify(normalized).length <= EVENT_TEXT_LIMITS.totalOutputCharacters
    ? normalized
    : null
}

export const normalizeTextMaterializationResultV1 = (
  rawResult,
  { choiceIds = [], outcomeIds = [], participantIds = [], requireAllChoiceLabels = false } = {},
) => {
  if (!isEventPlainObject(rawResult) || Number(rawResult.schemaVersion) !== 1) return null
  const status = normalizeEventId(rawResult.status, 40)
  const source = normalizeEventId(rawResult.source, 40)
  const failureCode = normalizeEventId(rawResult.failureCode, 80)
  const normalizedCopy = normalizeDisplayCopy(rawResult.normalizedCopy, {
    choiceIds,
    outcomeIds,
    participantIds,
    requireAllChoiceLabels,
  })
  if (
    !EVENT_TEXT_STATUSES.has(status) ||
    !EVENT_TEXT_SOURCES.has(source) ||
    (failureCode && !EVENT_TEXT_FAILURE_CODES.has(failureCode)) ||
    !normalizedCopy
  ) {
    return null
  }
  if (source === EVENT_TEXT_SOURCE.AI && status !== EVENT_TEXT_STATUS.SUCCEEDED) return null
  if (status === EVENT_TEXT_STATUS.SUCCEEDED && source !== EVENT_TEXT_SOURCE.AI) return null
  return {
    schemaVersion: EVENT_TEXT_SCHEMA_VERSION,
    status,
    source,
    attemptCount: Math.min(1, Math.max(0, Math.floor(Number(rawResult.attemptCount) || 0))),
    cacheKey: normalizeEventText(rawResult.cacheKey, '', 420),
    contextHash: normalizeEventText(rawResult.contextHash, '', 180),
    failureCode,
    provenance: {
      providerId: normalizeEventText(rawResult.provenance?.providerId, '', 160),
      modelId: normalizeEventText(rawResult.provenance?.modelId, '', 160),
      requestId: normalizeEventText(rawResult.provenance?.requestId, '', 180),
      generatedAt: normalizeTimestamp(rawResult.provenance?.generatedAt),
    },
    normalizedCopy,
  }
}

const normalizeAnchor = (rawAnchor) => {
  if (!isEventPlainObject(rawAnchor)) return null
  const kind = normalizeEventId(rawAnchor.kind, 80)
  const mapPackId = normalizeEventId(rawAnchor.mapPackId)
  const placeId = normalizeEventId(rawAnchor.placeId)
  if (!kind || !mapPackId || !placeId) return null
  return { kind, mapPackId, placeId }
}

export const normalizeEventInstanceV1 = (rawInstance) => {
  if (!isEventPlainObject(rawInstance) || Number(rawInstance.schemaVersion) !== 1) return null
  const id = normalizeEventId(rawInstance.id, 220)
  const lifecycle = normalizeEventId(rawInstance.lifecycle, 40)
  const templateId = normalizeEventId(rawInstance.templateRef?.id)
  const sourceModuleKey = normalizeEventId(rawInstance.source?.moduleKey, 80)
  const sourceRecordType = normalizeEventId(rawInstance.source?.recordType, 120)
  const sourceRecordId = normalizeEventText(rawInstance.source?.recordId, '', 180)
  const placeId = normalizeEventId(rawInstance.place?.placeId)
  const activationScope = normalizeEventId(rawInstance.presence?.activationScope, 80)
  const relation = normalizeEventId(rawInstance.presence?.relation, 80)
  const provenance = normalizeEventId(rawInstance.presence?.provenance, 80)
  const anchor = normalizeAnchor(rawInstance.place?.anchor)
  const allowedIds = normalizeIdList(rawInstance.choices?.allowedIds, 3)
  const selectedId = normalizeEventId(rawInstance.choices?.selectedId)
  if (
    !id ||
    !EVENT_LIFECYCLES.has(lifecycle) ||
    !templateId ||
    Number(rawInstance.templateRef?.schemaVersion) !== 2 ||
    !sourceModuleKey ||
    !sourceRecordType ||
    !sourceRecordId ||
    !placeId ||
    !ACTIVATION_SCOPES.has(activationScope) ||
    !relation ||
    !POSITION_PROVENANCE.has(provenance) ||
    !anchor ||
    allowedIds.length === 0 ||
    (selectedId && !allowedIds.includes(selectedId))
  ) {
    return null
  }
  const outcomeIds = normalizeIdList(
    [
      rawInstance.choices?.outcomeId,
      ...Object.keys(rawInstance.text?.normalizedCopy?.consequenceByOutcomeId || {}),
    ],
    3,
  )
  const participantIds = normalizeIdList(
    (rawInstance.text?.normalizedCopy?.dialogue || []).map((item) => item?.speakerRef),
    EVENT_TEXT_LIMITS.participants,
  )
  const text = normalizeTextMaterializationResultV1(rawInstance.text, {
    choiceIds: allowedIds,
    outcomeIds,
    participantIds,
    requireAllChoiceLabels: true,
  })
  const intent = normalizeMediaIntentV1(rawInstance.media?.intent)
  const requestState = normalizeEventId(rawInstance.outcome?.requestState, 40)
  const renderMode = normalizeEventId(rawInstance.media?.renderMode, 40)
  if (!text || !intent || !REQUEST_STATES.has(requestState) || !RENDER_MODES.has(renderMode)) {
    return null
  }
  return {
    schemaVersion: EVENT_INSTANCE_SCHEMA_VERSION,
    id,
    lifecycle,
    templateRef: {
      id: templateId,
      schemaVersion: EVENT_TEMPLATE_SCHEMA_VERSION,
      version: normalizeVersion(rawInstance.templateRef?.version),
    },
    source: {
      moduleKey: sourceModuleKey,
      recordType: sourceRecordType,
      recordId: sourceRecordId,
      recordRevision: normalizeVersion(rawInstance.source?.recordRevision),
      checkpointId: normalizeEventId(rawInstance.source?.checkpointId),
      checkpointAt: normalizeTimestamp(rawInstance.source?.checkpointAt),
    },
    world: {
      worldId: normalizeEventId(rawInstance.world?.worldId),
      worldContextId: normalizeEventId(rawInstance.world?.worldContextId),
      worldPackId: normalizeEventId(rawInstance.world?.worldPackId),
      variantPackId: normalizeEventId(rawInstance.world?.variantPackId),
      variantPackVersion: normalizeVersion(rawInstance.world?.variantPackVersion),
      mapPackId: normalizeEventId(rawInstance.world?.mapPackId),
      mapPackVersion: normalizeVersion(rawInstance.world?.mapPackVersion),
      semanticVersionId: normalizeEventId(rawInstance.world?.semanticVersionId),
      semanticManifestRevision: normalizeVersion(
        rawInstance.world?.semanticManifestRevision,
        0,
      ),
      semanticManifestHash: normalizeEventText(rawInstance.world?.semanticManifestHash, '', 64),
      semanticSourceFingerprint: normalizeEventText(
        rawInstance.world?.semanticSourceFingerprint,
        '',
        64,
      ),
    },
    place: {
      placeId,
      placeCategoryId: normalizeEventId(rawInstance.place?.placeCategoryId),
      capabilityIds: normalizeIdList(rawInstance.place?.capabilityIds, 24),
      anchor,
    },
    presence: {
      activationScope,
      relation,
      provenance,
      placeSessionId: normalizeEventText(rawInstance.presence?.placeSessionId, '', 180),
      placeSessionRevision: normalizeVersion(rawInstance.presence?.placeSessionRevision),
      journeyId: normalizeEventText(rawInstance.presence?.journeyId, '', 180),
      evidenceAt: normalizeTimestamp(rawInstance.presence?.evidenceAt),
    },
    selection: {
      seed: normalizeEventText(rawInstance.selection?.seed, '', 240),
      variantId: normalizeEventId(rawInstance.selection?.variantId),
      variantVersion: normalizeVersion(rawInstance.selection?.variantVersion),
    },
    runtime: {
      proposalId: normalizeEventText(rawInstance.runtime?.proposalId, '', 180),
      eligibilityLogId: normalizeEventText(rawInstance.runtime?.eligibilityLogId, '', 180),
      outcomeLogId: normalizeEventText(rawInstance.runtime?.outcomeLogId, '', 180),
    },
    text,
    media: {
      intent: {
        schemaVersion: intent.schemaVersion,
        slot: intent.slot,
        sceneKey: intent.sceneKey,
        placeCategoryId: intent.placeCategoryId,
        capabilityIds: intent.capabilityIds,
        toneTags: intent.toneTags,
        required: intent.required,
      },
      resolvedAssetRef: isEventPlainObject(rawInstance.media?.resolvedAssetRef)
        ? cloneEventValue(rawInstance.media.resolvedAssetRef)
        : null,
      resolutionReason: normalizeEventId(rawInstance.media?.resolutionReason, 120),
      renderMode,
    },
    choices: {
      allowedIds,
      selectedId,
      outcomeId: normalizeEventId(rawInstance.choices?.outcomeId),
    },
    outcome: {
      adapterKey: normalizeEventId(rawInstance.outcome?.adapterKey),
      requestState,
      ownerResultCode: normalizeEventText(rawInstance.outcome?.ownerResultCode, '', 160),
      ownerResultRef: normalizeEventText(rawInstance.outcome?.ownerResultRef, '', 220),
    },
    timestamps: {
      createdAt: normalizeTimestamp(rawInstance.timestamps?.createdAt),
      enteredAt: normalizeTimestamp(rawInstance.timestamps?.enteredAt),
      resolvedAt: normalizeTimestamp(rawInstance.timestamps?.resolvedAt),
      dismissedAt: normalizeTimestamp(rawInstance.timestamps?.dismissedAt),
      updatedAt: normalizeTimestamp(rawInstance.timestamps?.updatedAt),
    },
  }
}

export const normalizeEventInstancesV1 = (rawInstances) => {
  if (!Array.isArray(rawInstances)) {
    return { instances: [], rejected: [], inputCount: 0 }
  }
  const seen = new Set()
  const instances = []
  const rejected = []
  rawInstances.forEach((rawInstance, index) => {
    const instance = normalizeEventInstanceV1(rawInstance)
    if (!instance) {
      rejected.push({
        index,
        id: normalizeEventText(rawInstance?.id, '', 220),
        reason: 'invalid_instance',
      })
      return
    }
    if (seen.has(instance.id)) {
      rejected.push({ index, id: instance.id, reason: 'duplicate_instance_id' })
      return
    }
    seen.add(instance.id)
    instances.push(instance)
  })
  return { instances, rejected, inputCount: rawInstances.length }
}

export const normalizeEventComposerCopyV1 = (rawCopy, contract = {}) =>
  normalizeDisplayCopy(rawCopy, { ...contract, requireAllChoiceLabels: true })
