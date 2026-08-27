import {
  MINI_SCENE_ACTIVE_PRESENTATION_MODES,
  MINI_SCENE_CONTENT_DIMENSION_CHOICES,
  MINI_SCENE_ERROR_CODES,
  MINI_SCENE_LIMITS,
  MINI_SCENE_PRESENTATION_MODES,
  MINI_SCENE_SCHEMA_VERSION,
  MINI_SCENE_WORLD_SCOPE_KINDS,
  isMiniScenePlainObject,
  normalizeMiniSceneId,
  normalizeMiniSceneIdList,
  normalizeMiniSceneInlineText,
  normalizeMiniSceneRoute,
  normalizeMiniSceneText,
  sortMiniSceneIssues,
} from './mini-scene-contract'

export const MINI_SCENE_RESULT_STATUSES = Object.freeze([
  'skipped',
  'presented_text',
  'presented_interactive',
  'presented_fallback',
  'failed',
])

const PRESENTATION_MODE_SET = new Set(MINI_SCENE_PRESENTATION_MODES)
const ACTIVE_PRESENTATION_MODE_SET = new Set(MINI_SCENE_ACTIVE_PRESENTATION_MODES)
const WORLD_SCOPE_KIND_SET = new Set(MINI_SCENE_WORLD_SCOPE_KINDS)
const CONTENT_DIMENSION_CHOICE_SET = new Set(MINI_SCENE_CONTENT_DIMENSION_CHOICES)
const RETENTION_STATE_SET = new Set(['temporary', 'retained', 'archived'])

const findDuplicateIds = (items = []) => {
  const ids = items.map((item) => item?.id).filter(Boolean)
  return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].sort((a, b) =>
    a.localeCompare(b),
  )
}

const normalizePresentationMode = (value, fallback = 'unconfigured') => {
  const mode = normalizeMiniSceneId(value)
  return PRESENTATION_MODE_SET.has(mode) ? mode : fallback
}

const normalizePrimitive = (value) => {
  if (typeof value === 'string') return normalizeMiniSceneText(value, '', MINI_SCENE_LIMITS.maxTextChars)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'boolean' || value === null) return value
  return null
}

const normalizeParticipant = (raw, index) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const id = normalizeMiniSceneId(source.id, `participant_${index + 1}`)
  const name = normalizeMiniSceneInlineText(source.name, '', 120)
  if (!name) return null
  return {
    id,
    name,
    role: normalizeMiniSceneInlineText(source.role, '', 120),
  }
}

const normalizeFact = (raw, index) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const key = normalizeMiniSceneId(source.key || source.id)
  const value = normalizePrimitive(source.value)
  if (!key || value === null && source.value !== null) return null
  return {
    id: normalizeMiniSceneId(source.id, `fact_${index + 1}`),
    key,
    label: normalizeMiniSceneInlineText(source.label, '', 120),
    value,
    authority: source.authority === 'generated_fiction' ? 'generated_fiction' : 'authoritative',
  }
}

const normalizeBeat = (raw, index) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const text = normalizeMiniSceneText(source.text, '', MINI_SCENE_LIMITS.maxTextChars)
  if (!text) return null
  return {
    id: normalizeMiniSceneId(source.id, `beat_${index + 1}`),
    text,
    participantIds: normalizeMiniSceneIdList(source.participantIds, {
      maxItems: MINI_SCENE_LIMITS.maxParticipants,
    }),
  }
}

const normalizeChoice = (raw, index) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const label = normalizeMiniSceneInlineText(source.label, '', 240)
  if (!label) return null
  return {
    id: normalizeMiniSceneId(source.id, `choice_${index + 1}`),
    label,
    value: normalizeMiniSceneInlineText(source.value, '', 240),
  }
}

const normalizeSlots = (raw) => {
  if (!isMiniScenePlainObject(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw)
      .map(([key, value]) => ({
        key: normalizeMiniSceneId(key),
        value: normalizePrimitive(value),
        supported:
          typeof value === 'string' ||
          (typeof value === 'number' && Number.isFinite(value)) ||
          typeof value === 'boolean' ||
          value === null,
      }))
      .filter((item) => item.key && item.supported)
      .sort((left, right) => left.key.localeCompare(right.key))
      .slice(0, 64)
      .map((item) => [item.key, item.value]),
  )
}

export const normalizeMiniSceneWorldScope = (raw) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const kind = normalizeMiniSceneId(source.kind)
  const id = normalizeMiniSceneId(source.id)
  if (!WORLD_SCOPE_KIND_SET.has(kind) || !id) return null
  return { kind, id }
}

export const normalizeMiniSceneWorldContext = (raw = {}) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  return {
    worldId: normalizeMiniSceneId(source.worldId, 'legacy_single_world'),
    mainWorldviewAssetId: normalizeMiniSceneId(source.mainWorldviewAssetId),
    activeWorldPackId: normalizeMiniSceneId(source.activeWorldPackId),
    manualScopeId: normalizeMiniSceneId(source.manualScopeId),
  }
}

export const normalizeMiniSceneModulePolicy = (raw = {}) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  return {
    moduleKey: normalizeMiniSceneId(source.moduleKey),
    mode: normalizePresentationMode(source.mode),
  }
}

export const resolveMiniScenePresentationPolicy = ({
  policy = {},
  pauseAll = false,
  supportedModes = MINI_SCENE_ACTIVE_PRESENTATION_MODES,
  presentationHint = '',
  interactiveAvailable = true,
} = {}) => {
  const normalizedPolicy = normalizeMiniSceneModulePolicy(policy)
  const supported = new Set(
    (Array.isArray(supportedModes) ? supportedModes : [])
      .map((mode) => normalizePresentationMode(mode, ''))
      .filter((mode) => ACTIVE_PRESENTATION_MODE_SET.has(mode)),
  )

  if (pauseAll) return { mode: 'off', reason: 'paused' }
  if (normalizedPolicy.mode === 'unconfigured') return { mode: 'off', reason: 'unconfigured' }
  if (normalizedPolicy.mode === 'off') return { mode: 'off', reason: 'user_off' }

  let mode = normalizedPolicy.mode
  const hint = normalizePresentationMode(presentationHint, '')
  if (mode === 'interactive_html' && hint === 'text') mode = 'text'
  if (mode === 'interactive_html' && !interactiveAvailable) mode = 'text'
  if (mode === 'interactive_html' && !supported.has('interactive_html')) mode = 'text'

  if (mode === 'text' && supported.has('text')) {
    return {
      mode: 'text',
      reason: normalizedPolicy.mode === 'interactive_html' ? 'downgraded_to_text' : 'user_text',
    }
  }
  if (mode === 'interactive_html' && supported.has('interactive_html')) {
    return { mode: 'interactive_html', reason: 'user_interactive_html' }
  }
  return { mode: 'off', reason: 'unsupported' }
}

export const normalizeMiniSceneProfileBinding = (raw = {}, index = 0) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const scope = normalizeMiniSceneWorldScope(source.scope)
  const rawChoices = isMiniScenePlainObject(source.contentDimensionChoices)
    ? source.contentDimensionChoices
    : {}
  const contentDimensionChoices = Object.fromEntries(
    Object.entries(rawChoices)
      .map(([dimensionId, choice]) => [normalizeMiniSceneId(dimensionId), normalizeMiniSceneId(choice)])
      .filter(([dimensionId, choice]) => dimensionId && CONTENT_DIMENSION_CHOICE_SET.has(choice))
      .sort(([left], [right]) => left.localeCompare(right)),
  )

  return {
    id: normalizeMiniSceneId(source.id, `mini_scene_binding_${index + 1}`),
    worldId: normalizeMiniSceneId(source.worldId, 'legacy_single_world'),
    profileId: normalizeMiniSceneId(source.profileId),
    scope,
    active: source.active === true,
    contentDimensionChoices,
  }
}

export const normalizeMiniSceneRequest = (raw = {}) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const sourceRef = isMiniScenePlainObject(source.source) ? source.source : {}
  const time = isMiniScenePlainObject(source.time) ? source.time : {}
  const place = isMiniScenePlainObject(source.place) ? source.place : {}

  return {
    schemaVersion: MINI_SCENE_SCHEMA_VERSION,
    requestId: normalizeMiniSceneId(source.requestId),
    source: {
      moduleKey: normalizeMiniSceneId(sourceRef.moduleKey),
      recordId: normalizeMiniSceneId(sourceRef.recordId),
      eventId: normalizeMiniSceneId(sourceRef.eventId),
      route: normalizeMiniSceneRoute(sourceRef.route),
    },
    sceneType: normalizeMiniSceneId(source.sceneType),
    worldContext: normalizeMiniSceneWorldContext(source.worldContext),
    participants: (Array.isArray(source.participants) ? source.participants : [])
      .slice(0, MINI_SCENE_LIMITS.maxParticipants)
      .map(normalizeParticipant)
      .filter(Boolean),
    time: {
      startAt: normalizeMiniSceneInlineText(time.startAt, '', 80),
      endAt: normalizeMiniSceneInlineText(time.endAt, '', 80),
      label: normalizeMiniSceneInlineText(time.label, '', 160),
      timeZone: normalizeMiniSceneInlineText(time.timeZone, '', 80),
    },
    place: {
      placeId: normalizeMiniSceneId(place.placeId || place.id),
      name: normalizeMiniSceneInlineText(place.name, '', 160),
      address: normalizeMiniSceneInlineText(place.address, '', 300),
    },
    facts: (Array.isArray(source.facts) ? source.facts : [])
      .slice(0, MINI_SCENE_LIMITS.maxFacts)
      .map(normalizeFact)
      .filter(Boolean),
    presentationHint: ACTIVE_PRESENTATION_MODE_SET.has(
      normalizePresentationMode(source.presentationHint, ''),
    )
      ? normalizePresentationMode(source.presentationHint, '')
      : '',
  }
}

export const validateMiniSceneRequest = (raw = {}) => {
  const request = normalizeMiniSceneRequest(raw)
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const errors = []
  if (!request.requestId) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.REQUEST_INVALID, path: 'requestId', reason: 'required' })
  }
  if (!request.source.moduleKey) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.REQUEST_INVALID, path: 'source.moduleKey', reason: 'required' })
  }
  if (!request.source.recordId) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.REQUEST_INVALID, path: 'source.recordId', reason: 'required' })
  }
  if (!request.sceneType) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.REQUEST_INVALID, path: 'sceneType', reason: 'required' })
  }
  if (Array.isArray(source.participants) && source.participants.length > MINI_SCENE_LIMITS.maxParticipants) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.REQUEST_INVALID,
      path: 'participants',
      reason: 'limit_exceeded',
      max: MINI_SCENE_LIMITS.maxParticipants,
    })
  }
  if (Array.isArray(source.facts) && source.facts.length > MINI_SCENE_LIMITS.maxFacts) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.REQUEST_INVALID,
      path: 'facts',
      reason: 'limit_exceeded',
      max: MINI_SCENE_LIMITS.maxFacts,
    })
  }
  const duplicateParticipantIds = findDuplicateIds(request.participants)
  if (duplicateParticipantIds.length > 0) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.REQUEST_INVALID,
      path: 'participants',
      reason: 'duplicate_id',
      ids: duplicateParticipantIds,
    })
  }
  const duplicateFactIds = findDuplicateIds(request.facts)
  if (duplicateFactIds.length > 0) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.REQUEST_INVALID,
      path: 'facts',
      reason: 'duplicate_id',
      ids: duplicateFactIds,
    })
  }
  return { ok: errors.length === 0, request, errors: sortMiniSceneIssues(errors) }
}

export const normalizeMiniSceneDraft = (raw = {}) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const document = isMiniScenePlainObject(source.document) ? source.document : {}
  return {
    schemaVersion: MINI_SCENE_SCHEMA_VERSION,
    title: normalizeMiniSceneInlineText(source.title, '', MINI_SCENE_LIMITS.maxTitleChars),
    summary: normalizeMiniSceneText(source.summary, '', MINI_SCENE_LIMITS.maxSummaryChars),
    textFallback: normalizeMiniSceneText(source.textFallback, '', MINI_SCENE_LIMITS.maxTextChars),
    beats: (Array.isArray(source.beats) ? source.beats : [])
      .slice(0, MINI_SCENE_LIMITS.maxBeats)
      .map(normalizeBeat)
      .filter(Boolean),
    choices: (Array.isArray(source.choices) ? source.choices : [])
      .slice(0, MINI_SCENE_LIMITS.maxChoices)
      .map(normalizeChoice)
      .filter(Boolean),
    document: {
      templateId: normalizeMiniSceneId(document.templateId),
      variantId: normalizeMiniSceneId(document.variantId),
      slots: normalizeSlots(document.slots),
      assetIds: normalizeMiniSceneIdList(document.assetIds, {
        maxItems: MINI_SCENE_LIMITS.maxAssetIds,
      }),
    },
  }
}

export const validateMiniSceneDraft = (raw = {}) => {
  const draft = normalizeMiniSceneDraft(raw)
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const errors = []
  if (!draft.title) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.DRAFT_INVALID, path: 'title', reason: 'required' })
  }
  if (!draft.textFallback) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.DRAFT_INVALID, path: 'textFallback', reason: 'required' })
  }
  if (Array.isArray(source.beats) && source.beats.length > MINI_SCENE_LIMITS.maxBeats) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.DRAFT_INVALID,
      path: 'beats',
      reason: 'limit_exceeded',
      max: MINI_SCENE_LIMITS.maxBeats,
    })
  }
  if (Array.isArray(source.choices) && source.choices.length > MINI_SCENE_LIMITS.maxChoices) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.DRAFT_INVALID,
      path: 'choices',
      reason: 'limit_exceeded',
      max: MINI_SCENE_LIMITS.maxChoices,
    })
  }
  const duplicateBeatIds = findDuplicateIds(draft.beats)
  if (duplicateBeatIds.length > 0) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.DRAFT_INVALID,
      path: 'beats',
      reason: 'duplicate_id',
      ids: duplicateBeatIds,
    })
  }
  const duplicateChoiceIds = findDuplicateIds(draft.choices)
  if (duplicateChoiceIds.length > 0) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.DRAFT_INVALID,
      path: 'choices',
      reason: 'duplicate_id',
      ids: duplicateChoiceIds,
    })
  }
  return { ok: errors.length === 0, draft, errors: sortMiniSceneIssues(errors) }
}

export const normalizeMiniSceneArtifact = (raw = {}) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const sourceRef = isMiniScenePlainObject(source.source) ? source.source : {}
  const provenance = isMiniScenePlainObject(source.provenance) ? source.provenance : {}
  const retention = isMiniScenePlainObject(source.retention) ? source.retention : {}
  const retentionState = normalizeMiniSceneId(
    retention.state || source.retentionState,
    'temporary',
  )
  return {
    schemaVersion: MINI_SCENE_SCHEMA_VERSION,
    artifactId: normalizeMiniSceneId(source.artifactId),
    requestId: normalizeMiniSceneId(source.requestId),
    source: {
      moduleKey: normalizeMiniSceneId(sourceRef.moduleKey),
      recordId: normalizeMiniSceneId(sourceRef.recordId),
      eventId: normalizeMiniSceneId(sourceRef.eventId),
    },
    sceneType: normalizeMiniSceneId(source.sceneType),
    worldId: normalizeMiniSceneId(source.worldId, 'legacy_single_world'),
    profileId: normalizeMiniSceneId(source.profileId),
    profileVersion: Math.max(0, Math.floor(Number(source.profileVersion) || 0)),
    revision: Math.max(1, Math.floor(Number(source.revision) || 1)),
    previousArtifactId: normalizeMiniSceneId(source.previousArtifactId),
    retention: {
      state: RETENTION_STATE_SET.has(retentionState) ? retentionState : 'temporary',
      retainedAt: Math.max(0, Math.floor(Number(retention.retainedAt) || 0)),
      archivedAt: Math.max(0, Math.floor(Number(retention.archivedAt) || 0)),
    },
    content: normalizeMiniSceneDraft(source.content || source),
    interactionState: {
      selectedChoiceId: normalizeMiniSceneId(source.interactionState?.selectedChoiceId),
      closed: source.interactionState?.closed === true,
    },
    provenance: {
      sourceKind: normalizeMiniSceneId(provenance.sourceKind),
      providerId: normalizeMiniSceneInlineText(provenance.providerId, '', 160),
      modelId: normalizeMiniSceneInlineText(provenance.modelId, '', 160),
      requestId: normalizeMiniSceneInlineText(provenance.requestId, '', 180),
      generatedAt: Math.max(0, Math.floor(Number(provenance.generatedAt) || 0)),
    },
  }
}

export const validateMiniSceneArtifact = (raw = {}) => {
  const artifact = normalizeMiniSceneArtifact(raw)
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const errors = []
  if (!artifact.artifactId) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.ARTIFACT_INVALID, path: 'artifactId', reason: 'required' })
  }
  if (!artifact.requestId) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.ARTIFACT_INVALID, path: 'requestId', reason: 'required' })
  }
  if (!artifact.source.moduleKey || !artifact.source.recordId) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.ARTIFACT_INVALID, path: 'source', reason: 'required' })
  }
  if (!artifact.sceneType) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.ARTIFACT_INVALID, path: 'sceneType', reason: 'required' })
  }
  if (artifact.provenance.sourceKind !== 'ai') {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.ARTIFACT_INVALID,
      path: 'provenance.sourceKind',
      reason: 'ai_required',
    })
  }
  if (!artifact.provenance.providerId) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.ARTIFACT_INVALID,
      path: 'provenance.providerId',
      reason: 'required',
    })
  }
  if (!artifact.provenance.generatedAt) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.ARTIFACT_INVALID,
      path: 'provenance.generatedAt',
      reason: 'required',
    })
  }
  const draftResult = validateMiniSceneDraft(
    isMiniScenePlainObject(source.content) ? source.content : source,
  )
  artifact.content = draftResult.draft
  draftResult.errors.forEach((error) => errors.push({ ...error, path: `content.${error.path}` }))
  return { ok: errors.length === 0, artifact, errors: sortMiniSceneIssues(errors) }
}
