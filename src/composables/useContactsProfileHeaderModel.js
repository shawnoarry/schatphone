import { computed } from 'vue'
import { CONTACTS_ENTITY_TYPES } from '../lib/role-profile-schema'

const defaultT = (zh, en) => en || zh

export function buildContactsProfileHeader(
  profile,
  {
    chatBound = false,
    t = defaultT,
    getAvatarUrl = () => '',
    formatRoleId = (_roleId, id) => id,
  } = {},
) {
  if (!profile?.id) {
    return {
      exists: false,
      profile: null,
      avatarUrl: '',
      eyebrow: t('\u6863\u6848', 'Profile'),
      name: '',
      metaText: '',
      bioText: '',
      isNpc: false,
      upgradeHint: '',
    }
  }

  return {
    exists: true,
    profile,
    avatarUrl: getAvatarUrl(profile),
    eyebrow: t('\u6863\u6848', 'Profile'),
    name: profile.name || '',
    metaText: `${profile.role || t('\u672a\u8bbe\u7f6e\u89d2\u8272', 'Role not set')} \u00b7 ID ${formatRoleId(profile.roleId, profile.id)}`,
    bioText: profile.bio || t('\u6682\u65e0\u6863\u6848\u7b80\u4ecb\u3002', 'No profile intro yet.'),
    isNpc: profile.entityType === CONTACTS_ENTITY_TYPES.NPC,
    upgradeHint: chatBound
      ? t('Existing Chat binding will be preserved.', 'Existing Chat binding will be preserved.')
      : t('Upgrade will not force Chat Directory binding.', 'Upgrade will not force Chat Directory binding.'),
  }
}

export function useContactsProfileHeaderModel({
  selectedProfile,
  selectedProfileChatBound,
  t = defaultT,
  getAvatarUrl = () => '',
  formatRoleId = (_roleId, id) => id,
} = {}) {
  const selectedProfileHeader = computed(() =>
    buildContactsProfileHeader(selectedProfile?.value, {
      chatBound: Boolean(selectedProfileChatBound?.value),
      t,
      getAvatarUrl,
      formatRoleId,
    }),
  )

  return {
    selectedProfileHeader,
  }
}
