import { computed } from 'vue'
import { CONTACTS_ENTITY_TYPES, normalizeRoleId } from '../lib/role-profile-schema'

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
  t = defaultT,
  isChatBound = () => false,
  getRelationshipSnapshot = () => null,
  getEventAttachedCount = () => 0,
  formatEntityTypeLabel = (entityType) => entityType || '',
} = {}) {
  const allRoleProfiles = computed(() => (Array.isArray(roleProfiles?.value) ? roleProfiles.value : []))

  const selfProfiles = computed(() =>
    allRoleProfiles.value.filter((item) => item.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE),
  )

  const mainRoleProfiles = computed(() =>
    allRoleProfiles.value.filter(
      (item) => (item.entityType || CONTACTS_ENTITY_TYPES.MAIN_ROLE) === CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    ),
  )

  const npcRoleProfiles = computed(() =>
    allRoleProfiles.value.filter((item) => item.entityType === CONTACTS_ENTITY_TYPES.NPC),
  )

  const normalizedContactsSearchQuery = computed(() =>
    normalizeContactsSearchText(contactsSearchQuery?.value),
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
    mainRoleProfiles,
    npcRoleProfiles,
    normalizedContactsSearchQuery,
    isContactsSearchActive,
    filteredSelfProfiles,
    filteredMainProfiles,
    filteredNpcProfiles,
    recentInteractionContacts,
    contactRecentScore,
    contactRecentSourceLabel,
  }
}
