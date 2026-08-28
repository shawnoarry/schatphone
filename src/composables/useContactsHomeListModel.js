import { computed } from 'vue'
import { CONTACTS_ENTITY_TYPES, normalizeRoleId } from '../lib/role-profile-schema'
import { isContactsProfileActive, isContactsProfileArchived } from '../lib/contacts-profile-owner'

const defaultT = (zh, en) => en || zh

export const normalizeContactsSearchText = (value = '') => String(value || '').trim().toLowerCase()

export const buildContactsSearchText = (profile = {}) =>
  [
    profile.name,
    profile.role,
    normalizeRoleId(profile.roleId, profile.id),
    profile.bio,
    ...(Array.isArray(profile.profileValues) ? profile.profileValues.map((value) => value.value) : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

export function useContactsHomeListModel({
  roleProfiles,
  contactsSearchQuery,
  archivedSearchQuery,
  t = defaultT,
  isChatBound = () => false,
  getRelationshipSnapshot = () => null,
  getEventAttachedCount = () => 0,
  formatEntityTypeLabel = (entityType) => entityType || '',
} = {}) {
  const allRoleProfiles = computed(() =>
    (Array.isArray(roleProfiles?.value) ? roleProfiles.value : []).filter(isContactsProfileActive),
  )

  const archivedProfiles = computed(() =>
    (Array.isArray(roleProfiles?.value) ? roleProfiles.value : [])
      .filter(isContactsProfileArchived)
      .sort(
        (left, right) =>
          Number(right.lifecycle?.archivedAt || 0) - Number(left.lifecycle?.archivedAt || 0) ||
          Number(right.id) - Number(left.id),
      ),
  )

  const selfProfiles = computed(() =>
    allRoleProfiles.value.filter((item) => item.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE),
  )

  const mainRoleProfiles = computed(() =>
    allRoleProfiles.value.filter(
      (item) => (item.entityType || CONTACTS_ENTITY_TYPES.MAIN_ROLE) === CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    ),
  )

  const npcRoleProfiles = computed(() =>
    allRoleProfiles.value.filter(
      (item) =>
        item.entityType === CONTACTS_ENTITY_TYPES.NPC ||
        item.entityType === CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
    ),
  )

  const normalizedContactsSearchQuery = computed(() =>
    normalizeContactsSearchText(contactsSearchQuery?.value),
  )
  const normalizedArchivedSearchQuery = computed(() =>
    normalizeContactsSearchText(archivedSearchQuery?.value),
  )

  const filterContactsBySearch = (profiles = []) => {
    const query = normalizedContactsSearchQuery.value
    if (!query) return profiles
    return profiles.filter((profile) => buildContactsSearchText(profile).includes(query))
  }

  const isContactsSearchActive = computed(() => normalizedContactsSearchQuery.value.length > 0)
  const filteredSelfProfiles = computed(() => filterContactsBySearch(selfProfiles.value))
  const filteredMainProfiles = computed(() => filterContactsBySearch(mainRoleProfiles.value))
  const filteredNpcProfiles = computed(() => filterContactsBySearch(npcRoleProfiles.value))
  const isArchivedSearchActive = computed(() => normalizedArchivedSearchQuery.value.length > 0)
  const filteredArchivedProfiles = computed(() => {
    const query = normalizedArchivedSearchQuery.value
    if (!query) return archivedProfiles.value
    return archivedProfiles.value.filter((profile) => buildContactsSearchText(profile).includes(query))
  })

  const contactRecentScore = (profile = {}) => {
    if (!profile?.id || profile.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) return 0
    const snapshot = getRelationshipSnapshot(profile)
    const chatScore = isChatBound(profile) ? 100 : 0
    const memoryScore = Number(snapshot?.totalMemoryCount || 0) * 10
    const detailScore = getEventAttachedCount(profile)
    return chatScore + memoryScore + detailScore
  }

  const contactRecentSourceLabel = (profile = {}) => {
    if (isChatBound(profile)) return t('Chat', 'Chat')
    const snapshot = getRelationshipSnapshot(profile)
    if (snapshot?.totalMemoryCount > 0) return t('记忆', 'Memory')
    if (getEventAttachedCount(profile) > 0) return t('事件', 'Event')
    return formatEntityTypeLabel(profile.entityType)
  }

  const recentInteractionContacts = computed(() =>
    [...mainRoleProfiles.value, ...npcRoleProfiles.value]
      .map((profile) => ({
        profile,
        score: contactRecentScore(profile),
        sourceLabel: contactRecentSourceLabel(profile),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || Number(right.profile.id) - Number(left.profile.id))
      .slice(0, 10),
  )

  return {
    selfProfiles,
    archivedProfiles,
    mainRoleProfiles,
    npcRoleProfiles,
    normalizedContactsSearchQuery,
    normalizedArchivedSearchQuery,
    isContactsSearchActive,
    filteredSelfProfiles,
    filteredMainProfiles,
    filteredNpcProfiles,
    filteredArchivedProfiles,
    isArchivedSearchActive,
    recentInteractionContacts,
    contactRecentScore,
    contactRecentSourceLabel,
  }
}
