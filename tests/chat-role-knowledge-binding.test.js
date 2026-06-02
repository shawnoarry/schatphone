import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../src/stores/chat'

describe('chat role knowledge binding contract', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('normalizes encyclopediaEntryIds and mirrors legacy knowledgePointIds', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      name: 'Nova',
      role: 'Companion',
      encyclopediaEntryIds: ['kp_a', 'kp_a', 'invalid id', 'kp_b'],
    })

    expect(profile.encyclopediaEntryIds).toEqual(['kp_a', 'kp_b'])
    expect(profile.knowledgePointIds).toEqual(['kp_a', 'kp_b'])

    const contact = store.bindRoleProfile(profile.id)
    const contract = store.getRoleBindingContract(contact.id, { moduleKey: 'chat' })

    expect(contract.roleBound).toBe(true)
    expect(contract.profile.id).toBe(profile.id)
    expect(contract.profile.encyclopediaEntryIds).toEqual(['kp_a', 'kp_b'])
    expect(contract.profile.knowledgePointIds).toEqual(['kp_a', 'kp_b'])
  })

  test('accepts legacy knowledgePointIds when updating role profiles', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      name: 'Iris',
      role: 'Operator',
    })

    const ok = store.updateRoleProfile(profile.id, {
      knowledgePointIds: ['kp_1', 'kp_2', 'kp_2'],
    })

    expect(ok).toBe(true)
    expect(store.getRoleProfileById(profile.id)?.encyclopediaEntryIds).toEqual(['kp_1', 'kp_2'])
    expect(store.getRoleProfileById(profile.id)?.knowledgePointIds).toEqual(['kp_1', 'kp_2'])
  })
})
