import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../src/stores/chat'

const createProfile = (store) => store.addRoleProfile({
  roleId: '9001',
  name: 'Persona owner test',
  entityType: 'self_profile',
  templateLink: {
    primaryWorldId: 'world_a',
    profileTemplateId: 'template_a',
    profileTemplateVersion: 2,
  },
  profileValues: [{ fieldId: 'occupation', value: 'Manager', sourceKind: 'manual' }],
})

describe('persona profile owner transaction', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  test('writes one exact owner revision and persists the confirmed profile', () => {
    const store = useChatStore()
    const profile = createProfile(store)
    const result = store.confirmPersonaProfileRevision({
      profileId: profile.id,
      expectedRevision: profile.revision,
      expectedWorldId: 'world_a',
      expectedTemplateId: 'template_a',
      expectedTemplateVersion: 2,
      updates: {
        profileValues: [{ fieldId: 'occupation', value: 'Producer', sourceKind: 'manual' }],
      },
    })

    expect(result).toMatchObject({ ok: true, reason: 'profile_revised' })
    expect(store.getRoleProfileById(profile.id)).toMatchObject({
      revision: 2,
      profileValues: [expect.objectContaining({ fieldId: 'occupation', value: 'Producer' })],
    })
    const persisted = JSON.parse(localStorage.getItem('schatphone:store:chat'))
    expect(persisted.data.roleProfiles.find((item) => item.id === profile.id)).toMatchObject({
      revision: 2,
      profileValues: [expect.objectContaining({ value: 'Producer' })],
    })
  })

  test('fails before the owner write when world, template, or revision changed', () => {
    const store = useChatStore()
    const profile = createProfile(store)
    const before = JSON.parse(JSON.stringify(profile))

    expect(store.confirmPersonaProfileRevision({
      profileId: profile.id,
      expectedRevision: profile.revision,
      expectedWorldId: 'world_b',
      expectedTemplateId: 'template_a',
      expectedTemplateVersion: 2,
      updates: { profileValues: [] },
    })).toEqual({ ok: false, reason: 'world_mismatch' })
    expect(store.getRoleProfileById(profile.id)).toEqual(before)
  })

  test('restores the complete old profile when persistence fails', () => {
    const store = useChatStore()
    const profile = createProfile(store)
    const before = JSON.parse(JSON.stringify(profile))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    const result = store.confirmPersonaProfileRevision({
      profileId: profile.id,
      expectedRevision: profile.revision,
      expectedWorldId: 'world_a',
      expectedTemplateId: 'template_a',
      expectedTemplateVersion: 2,
      updates: {
        profileValues: [{ fieldId: 'occupation', value: 'Producer', sourceKind: 'manual' }],
      },
    })

    expect(result).toMatchObject({
      ok: false,
      reason: 'persistence_failed',
      rollback: { restored: true },
    })
    expect(store.getRoleProfileById(profile.id)).toEqual(before)
  })
})
