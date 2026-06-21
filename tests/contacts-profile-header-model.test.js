import { describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/role-profile-schema'
import {
  buildContactsProfileHeader,
  useContactsProfileHeaderModel,
} from '../src/composables/useContactsProfileHeaderModel'

const t = (zh, en) => en || zh

const baseProfile = {
  id: 42,
  roleId: '007',
  name: 'Mina',
  role: 'Producer',
  bio: 'Keeps the group schedule steady.',
  entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
}

describe('Contacts profile header model interface', () => {
  test('builds the selected profile header display state', () => {
    const getAvatarUrl = vi.fn(() => 'avatar://mina')
    const model = useContactsProfileHeaderModel({
      selectedProfile: ref(baseProfile),
      selectedProfileChatBound: ref(false),
      t,
      getAvatarUrl,
      formatRoleId: (roleId, id) => `${roleId}-${id}`,
    })

    expect(model.selectedProfileHeader.value).toMatchObject({
      exists: true,
      profile: baseProfile,
      avatarUrl: 'avatar://mina',
      eyebrow: 'Profile',
      name: 'Mina',
      metaText: 'Producer \u00b7 ID 007-42',
      bioText: 'Keeps the group schedule steady.',
      isNpc: false,
      upgradeHint: 'Upgrade will not force Chat Directory binding.',
    })
    expect(getAvatarUrl).toHaveBeenCalledWith(baseProfile)
  })

  test('uses stable fallback copy for missing role and bio', () => {
    expect(
      buildContactsProfileHeader(
        {
          id: 8,
          name: 'Nari',
          entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
        },
        {
          t,
          formatRoleId: (_roleId, id) => id,
        },
      ),
    ).toMatchObject({
      metaText: 'Role not set \u00b7 ID 8',
      bioText: 'No profile intro yet.',
    })
  })

  test('marks NPC profiles and explains preserved chat binding during upgrade', () => {
    const header = buildContactsProfileHeader(
      {
        ...baseProfile,
        entityType: CONTACTS_ENTITY_TYPES.NPC,
      },
      {
        chatBound: true,
        t,
        formatRoleId: (roleId) => roleId,
      },
    )

    expect(header.isNpc).toBe(true)
    expect(header.upgradeHint).toBe('Existing Chat binding will be preserved.')
  })

  test('returns an empty display state when no profile is selected', () => {
    expect(buildContactsProfileHeader(null, { t })).toEqual({
      exists: false,
      profile: null,
      avatarUrl: '',
      eyebrow: 'Profile',
      name: '',
      metaText: '',
      bioText: '',
      isNpc: false,
      upgradeHint: '',
    })
  })
})
