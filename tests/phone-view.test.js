import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import PhoneView from '../src/views/PhoneView.vue'
import { usePhoneStore } from '../src/stores/phone'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/phone', component: PhoneView },
      { path: '/home', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountPhoneView = async () => {
  const router = createTestRouter()
  await router.push('/phone')
  await router.isReady()
  const wrapper = mount(PhoneView, {
    global: {
      plugins: [router],
    },
  })
  await flushUi()
  return { wrapper, router }
}

describe('PhoneView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-17T08:00:00.000Z'))
    setActivePinia(createPinia())
    usePhoneStore().resetForTesting()
    useRelationshipRuntimeStore().resetForTesting()
  })

  test('records a selected Chat contact call as a relationship fact', async () => {
    const phoneStore = usePhoneStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { wrapper } = await mountPhoneView()

    await wrapper.get('[data-testid="phone-relationship-contact"]').setValue('1')
    await wrapper.findAll('select')[1].setValue('incoming')
    const durationInput = wrapper.findAll('input').find((input) => input.attributes('type') === 'number')
    await durationInput.setValue('4')
    await wrapper.get('[data-testid="phone-save-call"]').trigger('click')
    await flushUi()

    expect(phoneStore.callCount).toBe(1)
    expect(phoneStore.recentCalls[0]).toMatchObject({
      contactName: 'Eva',
      direction: 'incoming',
      durationSec: 240,
    })
    expect(relationshipRuntimeStore.events).toHaveLength(1)
    expect(relationshipRuntimeStore.events[0]).toMatchObject({
      factType: 'completed_call',
      sourceModule: 'relationship_phone_call',
      targetLabel: 'Eva',
      status: 'applied',
    })
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 1, name: 'Eva' }).metrics.affinity).toBe(54)

    wrapper.unmount()
  })
})
