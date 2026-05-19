import { buildRelationshipEntityKey } from '../stores/relationshipRuntime'
import {
  normalizeRelationshipCleanupMode,
  RELATIONSHIP_CLEANUP_MODES,
} from './relationship-cleanup-helpers'

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const sourceRefKey = (ref = {}) => {
  const sourceModule = normalizeText(ref.sourceModule, '', 80)
  const sourceId = normalizeText(ref.sourceId, '', 140)
  return sourceModule && sourceId ? `${sourceModule}:${sourceId}` : ''
}

export const buildRoleRelationshipTarget = (profile = {}) => {
  const profileId = toInt(profile?.id ?? profile?.profileId, 0)
  return {
    entityKey: profileId > 0 ? `role:${profileId}` : '',
    profileId,
    kind: 'role',
    name: normalizeText(profile?.name, '', 100),
  }
}

export const normalizeSourceRefs = (sourceRefs = []) => {
  const seen = new Set()
  return (Array.isArray(sourceRefs) ? sourceRefs : [])
    .map((ref) => ({
      sourceModule: normalizeText(ref?.sourceModule, '', 80),
      sourceId: normalizeText(ref?.sourceId, '', 140),
    }))
    .filter((ref) => ref.sourceModule && ref.sourceId)
    .filter((ref) => {
      const key = sourceRefKey(ref)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export const summarizeSourceRefs = (sourceRefs = []) =>
  normalizeSourceRefs(sourceRefs).reduce((acc, ref) => {
    acc[ref.sourceModule] = (acc[ref.sourceModule] || 0) + 1
    return acc
  }, {})

export const cleanupRelationshipSourceRecords = (
  sourceRefs = [],
  cleanupHandlers = {},
  options = {},
) => {
  const refs = normalizeSourceRefs(sourceRefs)
  const cleanupMode = normalizeRelationshipCleanupMode(options.cleanupMode)
  const results = []
  refs.forEach((ref) => {
    const handler = cleanupHandlers?.[ref.sourceModule]
    if (typeof handler !== 'function') {
      results.push({
        ...ref,
        ok: false,
        skipped: true,
        reason: 'cleanup_handler_missing',
      })
      return
    }
    try {
      const rawResult = handler(ref.sourceId, ref, {
        ...options,
        cleanupMode,
      })
      const normalizedResult =
        rawResult && typeof rawResult === 'object'
          ? rawResult
          : {
              ok: Boolean(rawResult),
              removedCount: rawResult ? 1 : 0,
              unlinkedCount: 0,
              anonymizedCount: 0,
            }
      results.push({
        ...ref,
        ok: Boolean(normalizedResult.ok),
        skipped: false,
        reason: normalizedResult.reason || '',
        removedCount: Number(normalizedResult.removedCount || 0),
        unlinkedCount: Number(normalizedResult.unlinkedCount || 0),
        anonymizedCount: Number(normalizedResult.anonymizedCount || 0),
        updatedCount: Number(normalizedResult.updatedCount || 0),
      })
    } catch (error) {
      results.push({
        ...ref,
        ok: false,
        skipped: false,
        reason: error?.message || 'cleanup_failed',
      })
    }
  })
  return {
    requestedCount: refs.length,
    removedCount: results.reduce((sum, item) => sum + Number(item.removedCount || 0), 0),
    unlinkedCount: results.reduce((sum, item) => sum + Number(item.unlinkedCount || 0), 0),
    anonymizedCount: results.reduce((sum, item) => sum + Number(item.anonymizedCount || 0), 0),
    updatedCount: results.reduce((sum, item) => sum + Number(item.updatedCount || 0), 0),
    skippedCount: results.filter((item) => item.skipped).length,
    failedCount: results.filter((item) => !item.ok && !item.skipped).length,
    results,
  }
}

export const buildRoleDeleteImpact = ({ chatStore, relationshipRuntimeStore, profile } = {}) => {
  const target = buildRoleRelationshipTarget(profile)
  const entityKey = buildRelationshipEntityKey(target)
  const bindingContacts = (chatStore?.contacts || []).filter(
    (contact) => contact.kind === 'role' && Number(contact.profileId) === Number(profile?.id),
  )
  const memories = relationshipRuntimeStore?.listMemoryGroupsForTarget
    ? relationshipRuntimeStore.listMemoryGroupsForTarget(target, 50)
    : []
  const sourceRefs = relationshipRuntimeStore?.listSourceRefsForTarget
    ? relationshipRuntimeStore.listSourceRefsForTarget(target)
    : []
  return {
    entityKey,
    profileId: target.profileId,
    profileName: target.name,
    chatBindingCount: bindingContacts.length,
    chatConversationCount: bindingContacts.length,
    memoryGroupCount: memories.length,
    relationshipEventCount: relationshipRuntimeStore?.listEventsForTarget
      ? relationshipRuntimeStore.listEventsForTarget(target, 50).length
      : 0,
    sourceRefs: normalizeSourceRefs(sourceRefs),
    sourceModuleCounts: summarizeSourceRefs(sourceRefs),
    photosPolicy: 'unbind_only',
  }
}

export const deleteRoleProfileCascade = ({
  chatStore,
  relationshipRuntimeStore,
  profile,
  includeLinkedRecords = false,
  cleanupHandlers = {},
} = {}) => {
  if (!chatStore || !profile?.id) return { ok: false, reason: 'profile_missing' }
  const impact = buildRoleDeleteImpact({ chatStore, relationshipRuntimeStore, profile })
  const runtimeResult = relationshipRuntimeStore?.deleteRuntimeForTarget
    ? relationshipRuntimeStore.deleteRuntimeForTarget(buildRoleRelationshipTarget(profile))
    : null
  const cleanupResult = includeLinkedRecords
    ? cleanupRelationshipSourceRecords(runtimeResult?.sourceRefs || impact.sourceRefs, cleanupHandlers, {
        cleanupMode: RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE,
        profile,
      })
    : null
  const removed = chatStore.removeRoleProfile(profile.id, { removeBindings: true })
  return {
    ok: Boolean(removed),
    impact,
    runtimeResult,
    cleanupResult,
    removedProfile: Boolean(removed),
  }
}

export const resetRoleRelationshipState = ({
  chatStore,
  relationshipRuntimeStore,
  profile,
  cleanupHandlers = {},
} = {}) => {
  if (!chatStore || !profile?.id) return { ok: false, reason: 'profile_missing' }
  const target = buildRoleRelationshipTarget(profile)
  const runtimeResult = relationshipRuntimeStore?.resetRelationshipForTarget
    ? relationshipRuntimeStore.resetRelationshipForTarget(target)
    : null
  const clearedDetailItems = chatStore.clearRoleEventAttachedDetailItems(profile.id)
  const clearedChatConversationCount = chatStore.clearRoleProfileChatHistory(profile.id)
  const cleanupResult = cleanupRelationshipSourceRecords(
    runtimeResult?.sourceRefs || [],
    cleanupHandlers,
    {
      cleanupMode: RELATIONSHIP_CLEANUP_MODES.RESET_RELATIONSHIP,
      profile,
    },
  )
  return {
    ok: Boolean(runtimeResult?.ok || clearedDetailItems || clearedChatConversationCount),
    runtimeResult,
    cleanupResult,
    clearedDetailItems,
    clearedChatConversationCount,
  }
}

export const deleteRoleMemoryGroup = ({
  chatStore,
  relationshipRuntimeStore,
  profile,
  memoryKey,
  cleanupHandlers = {},
} = {}) => {
  if (!profile?.id || !relationshipRuntimeStore?.removeMemoryGroupForTarget) {
    return { ok: false, reason: 'memory_group_missing' }
  }
  const target = buildRoleRelationshipTarget(profile)
  const runtimeResult = relationshipRuntimeStore.removeMemoryGroupForTarget(target, memoryKey)
  const clearedDetailItems = chatStore?.clearRoleEventAttachedDetailItems
    ? chatStore.clearRoleEventAttachedDetailItems(profile.id, {
        memoryKey,
        sourceRefs: runtimeResult?.sourceRefs || [],
      })
    : 0
  const cleanupResult = cleanupRelationshipSourceRecords(
    runtimeResult?.sourceRefs || [],
    cleanupHandlers,
    {
      cleanupMode: RELATIONSHIP_CLEANUP_MODES.DELETE_MEMORY_GROUP,
      profile,
      memoryKey,
    },
  )
  return {
    ok: Boolean(runtimeResult?.ok || clearedDetailItems),
    runtimeResult,
    cleanupResult,
    clearedDetailItems,
  }
}
