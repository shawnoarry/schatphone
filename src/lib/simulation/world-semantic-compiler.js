import { sha256Canonical } from '../persistence-repository-schema'
import { normalizeReviewedWorldSemanticManifest } from './world-semantic-contract'

export const WORLD_SEMANTIC_RUNTIME_REGISTRY_SCHEMA_VERSION = 1
export const WORLD_SEMANTIC_COMPILED_SCHEMA_VERSION = 1
export const WORLD_SEMANTIC_COMPILER_VERSION = 1

const NAMESPACED_ID_PATTERN = /^[a-z][a-z0-9_]*(?::[a-z][a-z0-9_]*)+$/
const SIMPLE_ID_PATTERN = /^[a-z][a-z0-9_]{1,79}$/

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const normalizeText = (value, max = 180) =>
  typeof value === 'string' ? value.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max) : ''

const compareStableText = (left, right) => {
  const leftText = String(left)
  const rightText = String(right)
  if (leftText === rightText) return 0
  return leftText < rightText ? -1 : 1
}

const stableSort = (items, selector = (item) => item.id) =>
  [...items].sort((left, right) => compareStableText(selector(left), selector(right)))

const pushError = (errors, code, path, details = {}) => errors.push({ code, path, ...details })

const normalizeRuntimeRegistry = (rawRegistry = {}) => {
  const source = rawRegistry && typeof rawRegistry === 'object' && !Array.isArray(rawRegistry)
    ? rawRegistry
    : {}
  const errors = []
  if (source.schemaVersion !== WORLD_SEMANTIC_RUNTIME_REGISTRY_SCHEMA_VERSION) {
    pushError(errors, 'unsupported_runtime_registry_schema', 'runtimeRegistry.schemaVersion')
  }
  const registryVersion = normalizeText(source.registryVersion, 80)
  if (!registryVersion) pushError(errors, 'missing_runtime_registry_version', 'runtimeRegistry.registryVersion')

  const capabilityIds = []
  const seenCapabilities = new Set()
  if (!Array.isArray(source.capabilityIds)) {
    pushError(errors, 'invalid_runtime_capability_list', 'runtimeRegistry.capabilityIds')
  } else {
    source.capabilityIds.forEach((rawId, index) => {
      const id = normalizeText(rawId, 180)
      if (!NAMESPACED_ID_PATTERN.test(id)) {
        pushError(errors, 'invalid_runtime_capability_id', `runtimeRegistry.capabilityIds.${index}`)
      } else if (seenCapabilities.has(id)) {
        pushError(errors, 'duplicate_runtime_capability_id', `runtimeRegistry.capabilityIds.${index}`, { id })
      } else {
        seenCapabilities.add(id)
        capabilityIds.push(id)
      }
    })
  }

  const ownerModules = []
  const seenOwners = new Set()
  if (!Array.isArray(source.ownerModules)) {
    pushError(errors, 'invalid_owner_module_list', 'runtimeRegistry.ownerModules')
  } else {
    source.ownerModules.forEach((rawOwner, index) => {
      const owner = rawOwner && typeof rawOwner === 'object' && !Array.isArray(rawOwner) ? rawOwner : {}
      const id = normalizeText(owner.id, 80).toLowerCase()
      if (!SIMPLE_ID_PATTERN.test(id)) {
        pushError(errors, 'invalid_owner_module_id', `runtimeRegistry.ownerModules.${index}.id`)
        return
      }
      if (seenOwners.has(id)) {
        pushError(errors, 'duplicate_owner_module_id', `runtimeRegistry.ownerModules.${index}.id`, { id })
        return
      }
      seenOwners.add(id)
      const actionIds = []
      const seenActions = new Set()
      if (!Array.isArray(owner.actionIds)) {
        pushError(errors, 'invalid_owner_action_list', `runtimeRegistry.ownerModules.${index}.actionIds`)
      } else {
        owner.actionIds.forEach((rawActionId, actionIndex) => {
          const actionId = normalizeText(rawActionId, 180)
          if (!NAMESPACED_ID_PATTERN.test(actionId)) {
            pushError(
              errors,
              'invalid_owner_action_id',
              `runtimeRegistry.ownerModules.${index}.actionIds.${actionIndex}`,
            )
          } else if (seenActions.has(actionId)) {
            pushError(
              errors,
              'duplicate_owner_action_id',
              `runtimeRegistry.ownerModules.${index}.actionIds.${actionIndex}`,
              { actionId },
            )
          } else {
            seenActions.add(actionId)
            actionIds.push(actionId)
          }
        })
      }
      ownerModules.push({ id, actionIds: actionIds.sort() })
    })
  }

  return deepFreeze({
    ok: errors.length === 0,
    registry: deepFreeze({
      schemaVersion: WORLD_SEMANTIC_RUNTIME_REGISTRY_SCHEMA_VERSION,
      registryVersion,
      capabilityIds: capabilityIds.sort(),
      ownerModules: stableSort(ownerModules),
    }),
    errors: deepFreeze(errors),
  })
}

const addReferenceErrors = (proposal, registry, errors) => {
  const conceptIds = new Set(proposal.concepts.map((item) => item.id))
  const capabilityIds = new Set(proposal.capabilities.map((item) => item.id))
  const runtimeCapabilityIds = new Set(registry.capabilityIds)
  const ownerActions = new Map(registry.ownerModules.map((owner) => [owner.id, new Set(owner.actionIds)]))

  proposal.capabilities.forEach((capability) => {
    for (const [field, ids] of [
      ['actorConceptIds', capability.actorConceptIds],
      ['objectConceptIds', capability.objectConceptIds],
    ]) {
      ids.forEach((id) => {
        if (!conceptIds.has(id)) {
          pushError(errors, 'dangling_concept_reference', `capabilities.${capability.id}.${field}`, { id })
        }
      })
    }
    capability.effects.forEach((effect) => {
      const actions = ownerActions.get(effect.ownerModule)
      if (!actions) {
        pushError(errors, 'unknown_effect_owner', `capabilities.${capability.id}.effects.${effect.id}`, {
          ownerModule: effect.ownerModule,
        })
      } else if (!actions.has(effect.actionId)) {
        pushError(errors, 'unsupported_owner_action', `capabilities.${capability.id}.effects.${effect.id}`, {
          ownerModule: effect.ownerModule,
          actionId: effect.actionId,
        })
      }
    })
  })

  proposal.boundaries.forEach((boundary) => {
    boundary.capabilityIds.forEach((id) => {
      if (!capabilityIds.has(id)) {
        pushError(errors, 'dangling_capability_reference', `boundaries.${boundary.id}.capabilityIds`, { id })
      }
    })
  })

  proposal.bridges.forEach((bridge) => {
    const sourceExists = bridge.sourceType === 'concept'
      ? conceptIds.has(bridge.sourceId)
      : capabilityIds.has(bridge.sourceId)
    if (!sourceExists) {
      pushError(errors, 'dangling_bridge_source', `bridges.${bridge.id}.sourceId`, {
        sourceType: bridge.sourceType,
        sourceId: bridge.sourceId,
      })
    }
    if (!runtimeCapabilityIds.has(bridge.targetCapabilityId)) {
      pushError(errors, 'unsupported_runtime_capability', `bridges.${bridge.id}.targetCapabilityId`, {
        targetCapabilityId: bridge.targetCapabilityId,
      })
    }
  })

  proposal.unknowns.forEach((unknown) => {
    unknown.capabilityIds.forEach((id) => {
      if (!capabilityIds.has(id)) {
        pushError(errors, 'dangling_capability_reference', `unknowns.${unknown.id}.capabilityIds`, { id })
      } else {
        pushError(errors, 'blocking_unknown', `unknowns.${unknown.id}`, { capabilityId: id })
      }
    })
  })

  proposal.conflicts.forEach((conflict) => {
    conflict.capabilityIds.forEach((id) => {
      if (!capabilityIds.has(id)) {
        pushError(errors, 'dangling_capability_reference', `conflicts.${conflict.id}.capabilityIds`, { id })
      }
    })
    if (conflict.status !== 'resolved') {
      pushError(errors, 'unresolved_conflict', `conflicts.${conflict.id}`)
    }
  })
}

const buildAliasIndex = (concepts, errors) => {
  const index = {}
  concepts.forEach((concept) => {
    for (const alias of [concept.label, ...concept.aliases]) {
      const key = alias.normalize('NFKC').toLowerCase()
      if (index[key] && index[key] !== concept.id) {
        pushError(errors, 'ambiguous_alias', `concepts.${concept.id}.aliases`, {
          alias,
          conceptIds: [index[key], concept.id].sort(),
        })
      } else {
        index[key] = concept.id
      }
    }
  })
  return Object.fromEntries(
    Object.entries(index).sort(([left], [right]) => compareStableText(left, right)),
  )
}

const groupBy = (items, keySelector, valueSelector = (item) => item) => {
  const groups = new Map()
  items.forEach((item) => {
    const key = keySelector(item)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(valueSelector(item))
  })
  return Object.fromEntries(
    [...groups.entries()]
      .sort(([left], [right]) => compareStableText(left, right))
      .map(([key, values]) => [key, stableSort(values, (value) => value.id || String(value))]),
  )
}

export const compileReviewedWorldSemanticManifest = async ({ reviewedManifest, runtimeRegistry } = {}) => {
  const reviewedValidation = normalizeReviewedWorldSemanticManifest(reviewedManifest)
  const registryValidation = normalizeRuntimeRegistry(runtimeRegistry)
  const errors = [...reviewedValidation.errors, ...registryValidation.errors]
  if (reviewedValidation.ok) {
    const actualProposalHash = await sha256Canonical(reviewedValidation.manifest.proposal)
    if (actualProposalHash !== reviewedValidation.manifest.proposalHash) {
      pushError(errors, 'proposal_hash_mismatch', 'proposalHash')
    }
  }
  if (reviewedValidation.ok && registryValidation.ok) {
    addReferenceErrors(reviewedValidation.manifest.proposal, registryValidation.registry, errors)
  }

  const proposal = reviewedValidation.manifest.proposal
  const aliasIndex = reviewedValidation.ok ? buildAliasIndex(proposal.concepts, errors) : {}
  if (errors.length > 0) {
    return deepFreeze({ ok: false, manifest: null, receipt: null, errors: deepFreeze(errors) })
  }

  const concepts = stableSort(proposal.concepts)
  const capabilities = stableSort(proposal.capabilities)
  const boundaries = stableSort(proposal.boundaries)
  const bridges = stableSort(proposal.bridges)
  const compiledBase = {
    schemaVersion: WORLD_SEMANTIC_COMPILED_SCHEMA_VERSION,
    compilerVersion: WORLD_SEMANTIC_COMPILER_VERSION,
    runtimeRegistryVersion: registryValidation.registry.registryVersion,
    worldId: reviewedValidation.manifest.worldId,
    namespace: reviewedValidation.manifest.namespace,
    manifestRevision: reviewedValidation.manifest.manifestRevision,
    sourceFingerprint: reviewedValidation.manifest.sourceFingerprint,
    proposalHash: reviewedValidation.manifest.proposalHash,
    concepts,
    capabilities,
    boundaries,
    bridges,
    unknowns: stableSort(proposal.unknowns),
    resolvedConflicts: stableSort(proposal.conflicts),
    indexes: {
      conceptIdsByKind: groupBy(concepts, (item) => item.kind, (item) => item.id),
      conceptIdByAlias: aliasIndex,
      bridgesByRuntimeCapability: groupBy(
        bridges,
        (item) => item.targetCapabilityId,
        (item) => ({
          id: item.id,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
        }),
      ),
      boundariesByCapability: groupBy(
        boundaries.flatMap((boundary) =>
          boundary.capabilityIds.map((capabilityId) => ({ id: boundary.id, capabilityId })),
        ),
        (item) => item.capabilityId,
        (item) => item.id,
      ),
      ownerEffectsByCapability: groupBy(
        capabilities.flatMap((capability) =>
          capability.effects.map((effect) => ({
            id: effect.id,
            capabilityId: capability.id,
            ownerModule: effect.ownerModule,
            actionId: effect.actionId,
          })),
        ),
        (item) => item.capabilityId,
      ),
    },
  }
  const manifestHash = await sha256Canonical(compiledBase)
  const manifest = deepFreeze({ ...compiledBase, manifestHash })
  const receipt = deepFreeze({
    schemaVersion: WORLD_SEMANTIC_COMPILED_SCHEMA_VERSION,
    compilerVersion: WORLD_SEMANTIC_COMPILER_VERSION,
    runtimeRegistryVersion: registryValidation.registry.registryVersion,
    worldId: manifest.worldId,
    manifestRevision: manifest.manifestRevision,
    sourceFingerprint: manifest.sourceFingerprint,
    proposalHash: manifest.proposalHash,
    manifestHash,
  })
  return deepFreeze({ ok: true, manifest, receipt, errors: deepFreeze([]) })
}
