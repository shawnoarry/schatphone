import { normalizeMiniSceneId, normalizeMiniSceneIdList } from './mini-scene-contract'
import {
  normalizeMiniSceneProfileBinding,
  normalizeMiniSceneWorldContext,
} from './mini-scene-schema'

export const MINI_SCENE_PROFILE_RESOLUTION_KINDS = Object.freeze([
  'book_worldview',
  'manual',
  'world_pack',
  'neutral',
])

const profileAppliesTo = (profile, moduleKey, sceneType) =>
  Array.isArray(profile?.appliesTo?.moduleKeys) &&
  profile.appliesTo.moduleKeys.includes(moduleKey) &&
  Array.isArray(profile?.appliesTo?.sceneTypes) &&
  profile.appliesTo.sceneTypes.includes(sceneType)

const profileHasScope = (profile, scope) =>
  Boolean(scope) &&
  Array.isArray(profile?.worldScopes) &&
  profile.worldScopes.some((candidate) => candidate?.kind === scope.kind && candidate?.id === scope.id)

const createNeutralResolution = (reason, details = {}) => ({
  kind: 'neutral',
  reason,
  profile: null,
  binding: null,
  contentDimensionChoices: {},
  ...details,
})

const resolveBinding = ({ binding, profileById, moduleKey, sceneType, kind }) => {
  const profile = profileById.get(binding.profileId)
  if (!profile) return createNeutralResolution('binding_profile_missing', { binding })
  if (!profileHasScope(profile, binding.scope)) {
    return createNeutralResolution('binding_profile_scope_mismatch', { binding })
  }
  if (!profileAppliesTo(profile, moduleKey, sceneType)) {
    return createNeutralResolution('binding_profile_incompatible', { binding })
  }
  return {
    kind,
    reason: `explicit_${kind}`,
    profile,
    binding,
    contentDimensionChoices: { ...binding.contentDimensionChoices },
  }
}

export const resolveMiniSceneProfile = ({
  profiles = [],
  bindings = [],
  worldContext = {},
  acceptedWorldPackProfileIds = [],
  moduleKey = '',
  sceneType = '',
} = {}) => {
  const normalizedModuleKey = normalizeMiniSceneId(moduleKey)
  const normalizedSceneType = normalizeMiniSceneId(sceneType)
  const context = normalizeMiniSceneWorldContext(worldContext)
  const normalizedProfiles = (Array.isArray(profiles) ? profiles : [])
    .filter((profile) => profile && typeof profile === 'object' && normalizeMiniSceneId(profile.profileId))
    .map((profile) => ({ ...profile, profileId: normalizeMiniSceneId(profile.profileId) }))
    .sort((left, right) => left.profileId.localeCompare(right.profileId))
  const profileById = new Map(normalizedProfiles.map((profile) => [profile.profileId, profile]))
  const normalizedBindings = (Array.isArray(bindings) ? bindings : [])
    .map(normalizeMiniSceneProfileBinding)
    .filter((binding) => binding.active && binding.profileId && binding.scope)
    .sort((left, right) => left.id.localeCompare(right.id))

  const explicitScopes = [
    context.mainWorldviewAssetId
      ? { kind: 'book_worldview', id: context.mainWorldviewAssetId }
      : null,
    context.manualScopeId ? { kind: 'manual', id: context.manualScopeId } : null,
  ].filter(Boolean)

  for (const scope of explicitScopes) {
    const binding = normalizedBindings.find(
      (candidate) => candidate.scope.kind === scope.kind && candidate.scope.id === scope.id,
    )
    if (binding) {
      return resolveBinding({
        binding,
        profileById,
        moduleKey: normalizedModuleKey,
        sceneType: normalizedSceneType,
        kind: scope.kind,
      })
    }
  }

  const acceptedProfileIds = normalizeMiniSceneIdList(acceptedWorldPackProfileIds, { sort: true })
  if (context.activeWorldPackId && acceptedProfileIds.length > 0) {
    const worldPackScope = { kind: 'world_pack', id: context.activeWorldPackId }
    for (const profileId of acceptedProfileIds) {
      const profile = profileById.get(profileId)
      if (!profile) continue
      if (!profileHasScope(profile, worldPackScope)) continue
      if (!profileAppliesTo(profile, normalizedModuleKey, normalizedSceneType)) continue
      const binding = normalizedBindings.find(
        (candidate) =>
          candidate.profileId === profileId &&
          candidate.scope.kind === worldPackScope.kind &&
          candidate.scope.id === worldPackScope.id,
      )
      return {
        kind: 'world_pack',
        reason: 'accepted_world_pack',
        profile,
        binding: binding || null,
        contentDimensionChoices: binding ? { ...binding.contentDimensionChoices } : {},
      }
    }
    return createNeutralResolution('accepted_world_pack_profile_unavailable')
  }

  return createNeutralResolution('no_explicit_profile')
}
