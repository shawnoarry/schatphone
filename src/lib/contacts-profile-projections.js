import { CONTACTS_ENTITY_TYPES } from './profile-template-schema'

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach((item) => deepFreeze(item))
  return Object.freeze(value)
}

const toPositiveInt = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

export const projectContactsProfileReference = (profile = {}) => {
  const profileId = toPositiveInt(profile?.id ?? profile?.profileId)
  if (!profileId) return null

  return deepFreeze({
    profileId,
    roleId: typeof profile?.roleId === 'string' ? profile.roleId : '',
    entityType: typeof profile?.entityType === 'string' ? profile.entityType : '',
    name: typeof profile?.name === 'string' ? profile.name : '',
    role: typeof profile?.role === 'string' ? profile.role : '',
    worldId:
      typeof profile?.worldId === 'string'
        ? profile.worldId
        : typeof profile?.templateLink?.primaryWorldId === 'string'
          ? profile.templateLink.primaryWorldId
          : '',
    templateId:
      typeof profile?.templateId === 'string'
        ? profile.templateId
        : typeof profile?.templateLink?.profileTemplateId === 'string'
          ? profile.templateLink.profileTemplateId
          : '',
    templateVersion: Math.max(
      0,
      Number(profile?.templateVersion ?? profile?.templateLink?.profileTemplateVersion) || 0,
    ),
    revision: Math.max(1, Number(profile?.revision) || 1),
  })
}

export const projectContactsProfileReferences = (profiles = []) =>
  deepFreeze(
    (Array.isArray(profiles) ? profiles : [])
      .map((profile) => projectContactsProfileReference(profile))
      .filter(Boolean),
  )

export const projectSelfProfileSelection = (selection = {}) => {
  const status = typeof selection?.status === 'string' ? selection.status : 'missing'
  const profile = selection?.profile
  const profileRef = profile?.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE
    ? projectContactsProfileReference(profile)
    : null

  return deepFreeze({
    ok: selection?.ok === true && Boolean(profileRef),
    status,
    code: typeof selection?.code === 'string' ? selection.code : 'self_profile_missing',
    worldId: typeof selection?.worldId === 'string' ? selection.worldId : '',
    profileRef,
    profileIds: Array.isArray(selection?.profileIds)
      ? selection.profileIds.map(toPositiveInt).filter(Boolean)
      : profileRef
        ? [profileRef.profileId]
        : [],
  })
}

export const selectContactsSelfProfileReferenceForWorld = (profileOwner, worldId) => {
  if (!profileOwner || typeof profileOwner.selectSelfProfileForWorld !== 'function') {
    return projectSelfProfileSelection({
      ok: false,
      status: 'missing',
      code: 'profile_owner_unavailable',
      worldId: typeof worldId === 'string' ? worldId.trim() : '',
    })
  }
  return projectSelfProfileSelection(profileOwner.selectSelfProfileForWorld(worldId))
}
