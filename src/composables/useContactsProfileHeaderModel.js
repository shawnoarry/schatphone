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
      roleId: '',
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
    roleId: formatRoleId(profile.roleId, profile.id),
    metaText: profile.role || t('\u672a\u8bbe\u7f6e\u89d2\u8272', 'Role not set'),
    bioText: profile.bio || t('\u6682\u65e0\u6863\u6848\u7b80\u4ecb\u3002', 'No profile intro yet.'),
    isNpc: profile.entityType === CONTACTS_ENTITY_TYPES.NPC,
    upgradeHint: chatBound
      ? t('已有的聊天绑定会保留。', 'Existing Chat binding will be preserved.')
      : t('升级不会强制绑定到 Chat 通讯录。', 'Upgrade will not force Chat Directory binding.'),
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
