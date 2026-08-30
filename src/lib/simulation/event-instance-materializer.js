import {
  EVENT_INSTANCE_LIFECYCLE,
  EVENT_TEXT_LIMITS,
  EVENT_TEXT_MODE,
  EVENT_TEXT_SOURCE,
  EVENT_TEXT_STATUS,
  normalizeEventId,
  normalizeEventInstanceV1,
  normalizeEventText,
  normalizeEventTextList,
} from './event-contracts'
import {
  KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
  KPOP_REALISM_EVENT_PACK_ID,
  createBuiltInKpopEventRegistries,
} from './kpop-realism-event-pack'

export const EVENT_INSTANCE_MATERIALIZATION_ERROR = Object.freeze({
  TEMPLATE_NOT_FOUND: 'template_not_found',
  VARIANT_NOT_FOUND: 'variant_not_found',
  SOURCE_MISMATCH: 'source_mismatch',
  PLACE_INELIGIBLE: 'place_ineligible',
  PRESENCE_INELIGIBLE: 'presence_ineligible',
  INSTANCE_INVALID: 'instance_invalid',
})

const stableSerialize = (value) => {
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

const hashText = (value) => {
  let hash = 2166136261
  const text = String(value)
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export const normalizeEventComposerContext = (rawContext = {}) => {
  const source = rawContext && typeof rawContext === 'object' ? rawContext : {}
  return {
    worldContextDigest: normalizeEventText(
      source.worldContextDigest,
      '',
      EVENT_TEXT_LIMITS.worldContextDigestCharacters,
    ),
    participants: Array.isArray(source.participants)
      ? source.participants
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            id: normalizeEventId(item.id),
            displayName: normalizeEventText(item.displayName, '', 80),
            role: normalizeEventText(item.role, '', 80),
          }))
          .filter((item) => item.id && item.displayName)
          .slice(0, EVENT_TEXT_LIMITS.participants)
      : [],
    facts: normalizeEventTextList(
      source.facts,
      EVENT_TEXT_LIMITS.contextFacts,
      EVENT_TEXT_LIMITS.contextFactCharacters,
    ),
  }
}

export const createEventContextHash = (context = {}) =>
  `ctx_${hashText(stableSerialize(normalizeEventComposerContext(context)))}`

const resolveLocale = (locale, supportedLocales = []) => {
  const requested = normalizeEventText(locale, 'zh-CN', 20)
  if (supportedLocales.includes(requested)) return requested
  if (requested.toLowerCase().startsWith('zh') && supportedLocales.includes('zh-CN')) return 'zh-CN'
  return supportedLocales.includes('en') ? 'en' : supportedLocales[0] || 'en'
}

const materializeLocalCopy = (variant, template, locale) => {
  const useChinese = locale.toLowerCase().startsWith('zh')
  const copy = variant.localCopy
  return {
    locale,
    title: useChinese ? copy.scene.titleZh : copy.scene.titleEn,
    opening: useChinese ? copy.scene.openingZh : copy.scene.openingEn,
    environment: useChinese ? copy.scene.environmentZh : copy.scene.environmentEn,
    dialogue: [],
    choiceLabels: Object.fromEntries(
      template.choices.map((choice) => [
        choice.id,
        useChinese ? copy.choicesById[choice.id]?.zh : copy.choicesById[choice.id]?.en,
      ]),
    ),
    consequenceByOutcomeId: Object.fromEntries(
      template.choices.map((choice) => [
        choice.outcomeId,
        useChinese
          ? copy.consequencesByOutcomeId[choice.outcomeId]?.zh
          : copy.consequencesByOutcomeId[choice.outcomeId]?.en,
      ]),
    ),
  }
}

const createFailure = (reason) => ({ ok: false, instance: null, reason })

const hasRequiredCapabilities = (requiredIds, capabilityIds) => {
  const available = new Set(
    (Array.isArray(capabilityIds) ? capabilityIds : []).map((item) => normalizeEventId(item)),
  )
  return requiredIds.every((id) => available.has(id))
}

export const materializeLocalEventInstanceV1 = ({
  instanceId = '',
  templateId = KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
  variantPackId = KPOP_REALISM_EVENT_PACK_ID,
  templateRegistry: providedTemplateRegistry = null,
  variantPackRegistry: providedVariantPackRegistry = null,
  source = {},
  world = {},
  place = {},
  presence = {},
  runtime = {},
  locale = 'zh-CN',
  textMode = EVENT_TEXT_MODE.LOCAL_ONLY,
  textContext = {},
  contextHash = '',
  seed = '',
  now = Date.now(),
} = {}) => {
  const builtIn =
    providedTemplateRegistry && providedVariantPackRegistry
      ? null
      : createBuiltInKpopEventRegistries()
  const templateRegistry = providedTemplateRegistry || builtIn.templateRegistry
  const variantPackRegistry = providedVariantPackRegistry || builtIn.variantPackRegistry
  const template = templateRegistry.get(templateId)
  if (!template) return createFailure(EVENT_INSTANCE_MATERIALIZATION_ERROR.TEMPLATE_NOT_FOUND)

  if (
    normalizeEventId(source.moduleKey, 80) !== template.owner.sourceModuleKey ||
    normalizeEventId(source.recordType, 120) !== template.source.recordType ||
    normalizeEventId(source.checkpointId) !== template.source.checkpointId ||
    !normalizeEventText(source.recordId, '', 180) ||
    Number(source.recordRevision) <= 0
  ) {
    return createFailure(EVENT_INSTANCE_MATERIALIZATION_ERROR.SOURCE_MISMATCH)
  }

  const placeCategoryId = normalizeEventId(place.placeCategoryId)
  if (
    !template.eligibility.requiredPlaceCategoryIds.includes(placeCategoryId) ||
    !hasRequiredCapabilities(template.eligibility.requiredCapabilityIds, place.capabilityIds)
  ) {
    return createFailure(EVENT_INSTANCE_MATERIALIZATION_ERROR.PLACE_INELIGIBLE)
  }

  const normalizedProvenance = normalizeEventId(presence.provenance, 80)
  if (
    normalizeEventId(presence.activationScope, 80) !== template.trigger.activationScope ||
    normalizeEventId(presence.relation, 80) !== template.eligibility.requiredPlaceSessionState ||
    !template.eligibility.acceptedPositionProvenance.includes(normalizedProvenance) ||
    !normalizeEventText(presence.placeSessionId, '', 180) ||
    Number(presence.placeSessionRevision) <= 0
  ) {
    return createFailure(EVENT_INSTANCE_MATERIALIZATION_ERROR.PRESENCE_INELIGIBLE)
  }

  const normalizedSeed = normalizeEventText(
    seed,
    `${source.recordId}:${source.recordRevision}:${template.id}`,
    240,
  )
  const resolvedVariant = variantPackRegistry.resolveVariant({
    packId: variantPackId,
    templateId: template.id,
    placeCategoryId,
    seed: normalizedSeed,
  })
  if (!resolvedVariant.ok) {
    return createFailure(EVENT_INSTANCE_MATERIALIZATION_ERROR.VARIANT_NOT_FOUND)
  }
  const { pack, variant } = resolvedVariant
  const normalizedLocale = resolveLocale(locale, pack.locales)
  const localCopy = materializeLocalCopy(variant, template, normalizedLocale)
  const normalizedContextHash =
    normalizeEventText(contextHash, '', 180) || createEventContextHash(textContext)
  const timestamp = Math.max(0, Math.floor(Number(now) || 0))
  const generatedId = `event_instance_${hashText(
    `${source.recordId}:${source.recordRevision}:${template.id}:${normalizedSeed}`,
  )}`
  const normalizedInstanceId = normalizeEventId(instanceId || generatedId, 220)
  const normalizedTextMode =
    textMode === EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY
      ? EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY
      : EVENT_TEXT_MODE.LOCAL_ONLY
  const adapterKeys = [
    ...new Set(template.choices.map((choice) => choice.effectRequest.adapterKey)),
  ]
  const mediaIntent = variant.mediaIntent
  const rawInstance = {
    schemaVersion: 1,
    id: normalizedInstanceId,
    lifecycle: EVENT_INSTANCE_LIFECYCLE.ACTIVE,
    templateRef: {
      id: template.id,
      schemaVersion: template.schemaVersion,
      version: template.version,
    },
    source: {
      moduleKey: source.moduleKey,
      recordType: source.recordType,
      recordId: source.recordId,
      recordRevision: source.recordRevision,
      checkpointId: source.checkpointId,
      checkpointAt: source.checkpointAt || timestamp,
    },
    world: {
      worldId: world.worldId || '',
      worldContextId: world.worldContextId || 'world_context_daily',
      worldPackId: world.worldPackId || 'default_world',
      variantPackId: pack.id,
      variantPackVersion: pack.version,
      mapPackId: world.mapPackId,
      mapPackVersion: world.mapPackVersion || 1,
      semanticVersionId: world.semanticVersionId || '',
      semanticManifestRevision: world.semanticManifestRevision || 0,
      semanticManifestHash: world.semanticManifestHash || '',
      semanticSourceFingerprint: world.semanticSourceFingerprint || '',
    },
    place: {
      placeId: place.placeId,
      placeCategoryId,
      capabilityIds: place.capabilityIds,
      anchor: place.anchor || {
        kind: 'stable_place',
        mapPackId: world.mapPackId,
        placeId: place.placeId,
      },
    },
    presence: {
      activationScope: presence.activationScope,
      relation: presence.relation,
      provenance: normalizedProvenance,
      placeSessionId: presence.placeSessionId,
      placeSessionRevision: presence.placeSessionRevision,
      journeyId: presence.journeyId || '',
      evidenceAt: presence.evidenceAt || timestamp,
    },
    selection: {
      seed: normalizedSeed,
      variantId: variant.id,
      variantVersion: variant.version,
    },
    runtime: {
      proposalId: runtime.proposalId || '',
      eligibilityLogId: runtime.eligibilityLogId || '',
      outcomeLogId: '',
    },
    text: {
      schemaVersion: 1,
      status:
        normalizedTextMode === EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY
          ? EVENT_TEXT_STATUS.PENDING
          : EVENT_TEXT_STATUS.LOCAL_ONLY,
      source: EVENT_TEXT_SOURCE.LOCAL,
      attemptCount: 0,
      cacheKey: `event-text:v1:${normalizedInstanceId}:${template.version}:${variant.version}:${normalizedContextHash}`,
      contextHash: normalizedContextHash,
      failureCode: '',
      provenance: { providerId: '', modelId: '', requestId: '', generatedAt: 0 },
      normalizedCopy: localCopy,
    },
    media: {
      intent: {
        schemaVersion: 1,
        slot: mediaIntent.slot,
        sceneKey: mediaIntent.sceneKey,
        placeCategoryId,
        capabilityIds: mediaIntent.capabilityIds,
        toneTags: mediaIntent.toneTags,
        required: mediaIntent.required,
      },
      resolvedAssetRef: null,
      resolutionReason: 'no_authored_asset',
      renderMode: mediaIntent.fallbackMode || 'text_only',
    },
    choices: {
      allowedIds: template.choices.map((choice) => choice.id),
      selectedId: '',
      outcomeId: '',
    },
    outcome: {
      adapterKey: adapterKeys.length === 1 ? adapterKeys[0] : '',
      requestState: 'not_requested',
      ownerResultCode: '',
      ownerResultRef: '',
    },
    timestamps: {
      createdAt: timestamp,
      enteredAt: timestamp,
      resolvedAt: 0,
      dismissedAt: 0,
      updatedAt: timestamp,
    },
  }
  const instance = normalizeEventInstanceV1(rawInstance)
  return instance
    ? { ok: true, instance, reason: 'local_instance_materialized' }
    : createFailure(EVENT_INSTANCE_MATERIALIZATION_ERROR.INSTANCE_INVALID)
}
