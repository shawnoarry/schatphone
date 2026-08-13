import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import PhoneView from '../src/views/PhoneView.vue'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
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
    resetDialogServiceForTest()
    usePhoneStore().resetForTesting()
    useRelationshipRuntimeStore().resetForTesting()
  })

  test('records a selected Chat contact call as a relationship fact', async () => {
    const phoneStore = usePhoneStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { wrapper } = await mountPhoneView()

    await wrapper.get('[data-testid="phone-open-composer"]').trigger('click')
    await wrapper.get('[data-testid="phone-relationship-contact"]').setValue('1')
    await wrapper.get('[data-testid="phone-direction-incoming"]').trigger('click')
    await wrapper.get('[data-testid="phone-duration"]').setValue('4')
    await wrapper.get('[data-testid="phone-composer-sheet"]').trigger('submit')
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

  test('removes a call log and clears its relationship fact from the module list', async () => {
    const phoneStore = usePhoneStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { wrapper } = await mountPhoneView()

    await wrapper.get('[data-testid="phone-open-composer"]').trigger('click')
    await wrapper.get('[data-testid="phone-relationship-contact"]').setValue('1')
    await wrapper.get('[data-testid="phone-composer-sheet"]').trigger('submit')
    await flushUi()

    const call = phoneStore.recentCalls[0]
    expect(relationshipRuntimeStore.events).toHaveLength(1)

    await wrapper.get(`[data-testid="phone-call-${call.id}"]`).trigger('click')
    await wrapper.get(`[data-testid="phone-remove-call-${call.id}"]`).trigger('click')
    useDialog().submitDialog()
    await flushUi()

    expect(phoneStore.findCallById(call.id)).toBeNull()
    expect(relationshipRuntimeStore.events).toHaveLength(0)
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 1, name: 'Eva' }).exists).toBe(false)

    wrapper.unmount()
  })

  test('filters the call list to missed calls without changing stored history', async () => {
    const phoneStore = usePhoneStore()
    phoneStore.addRoleCallLog({ contactName: 'Eva', direction: 'outgoing', durationMinutes: 2 })
    const missedCall = phoneStore.addMissedCall({ contactName: 'Jackie' })
    const { wrapper } = await mountPhoneView()

    expect(wrapper.findAll('[data-testid^="phone-call-phone_call_"]')).toHaveLength(2)

    await wrapper.get('[data-testid="phone-filter-missed"]').trigger('click')
    await flushUi()

    expect(wrapper.find(`[data-testid="phone-call-${missedCall.id}"]`).exists()).toBe(true)
    expect(wrapper.text()).toContain('Jackie')
    expect(wrapper.text()).not.toContain('Eva')
    expect(phoneStore.callCount).toBe(2)

    wrapper.unmount()
  })

  test('keeps the empty history scan-first and opens recording only on request', async () => {
    const { wrapper } = await mountPhoneView()

    expect(wrapper.get('[data-testid="phone-empty-state"]').text()).toContain('还没有通话记录')
    expect(wrapper.find('[data-testid="phone-composer-sheet"]').exists()).toBe(false)

    await wrapper.get('[data-testid="phone-empty-add"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="phone-keypad-view"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="phone-tab-keypad"]').attributes('aria-current')).toBe('page')

    await wrapper.get('[data-testid="phone-open-composer"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="phone-composer-sheet"]').attributes('role')).toBe('dialog')
    expect(wrapper.get('[data-testid="phone-relationship-contact"]').text()).toContain('不关联聊天联系人')

    wrapper.unmount()
  })

  test('places a keypad call, exposes in-call controls, and saves it to Recents', async () => {
    const phoneStore = usePhoneStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { wrapper } = await mountPhoneView()

    await wrapper.get('[data-testid="phone-tab-keypad"]').trigger('click')
    for (const key of ['1', '0', '0', '1']) {
      await wrapper.get(`[data-testid="phone-key-${key}"]`).trigger('click')
    }
    await flushUi()

    expect(wrapper.get('[data-testid="phone-dial-input"]').element.value).toBe('1001')
    expect(wrapper.get('[data-testid="phone-keypad-view"]').text()).toContain('Eva')

    await wrapper.get('[data-testid="phone-place-call"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="phone-active-call"]').text()).toContain('正在呼叫')
    expect(wrapper.get('[data-testid="phone-active-call"]').text()).toContain('Eva')

    await vi.advanceTimersByTimeAsync(900)
    await vi.advanceTimersByTimeAsync(3000)
    await flushUi()

    expect(wrapper.get('[data-testid="phone-active-call"]').text()).toContain('00:03')
    await wrapper.get('[data-testid="phone-toggle-mute"]').trigger('click')
    await wrapper.get('[data-testid="phone-toggle-speaker"]').trigger('click')
    expect(wrapper.get('[data-testid="phone-toggle-mute"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="phone-toggle-speaker"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('[data-testid="phone-open-live-keypad"]').trigger('click')
    expect(wrapper.get('[data-testid="phone-live-keypad"]').exists()).toBe(true)

    await wrapper.get('[data-testid="phone-end-call"]').trigger('click')
    await flushUi()

    expect(wrapper.find('[data-testid="phone-active-call"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="phone-recents-view"]').exists()).toBe(true)
    expect(phoneStore.recentCalls[0]).toMatchObject({
      contactName: 'Eva',
      phoneNumber: '1001',
      direction: 'outgoing',
      status: 'completed',
      durationSec: 3,
      sourceModule: 'phone_session',
    })
    expect(relationshipRuntimeStore.events).toHaveLength(1)

    wrapper.unmount()
  })

  test('starts a call directly from Contacts', async () => {
    const phoneStore = usePhoneStore()
    const { wrapper } = await mountPhoneView()

    await wrapper.get('[data-testid="phone-tab-contacts"]').trigger('click')
    await wrapper.get('[data-testid="phone-contact-search"]').setValue('Eva')
    await flushUi()

    expect(wrapper.get('[data-testid="phone-contacts-view"]').text()).toContain('1001')
    expect(wrapper.get('[data-testid="phone-contacts-view"]').text()).not.toContain('Jackie')

    await wrapper.get('[data-testid="phone-call-contact-1"]').trigger('click')
    await vi.advanceTimersByTimeAsync(900)
    await vi.advanceTimersByTimeAsync(1000)
    await wrapper.get('[data-testid="phone-end-call"]').trigger('click')
    await flushUi()

    expect(phoneStore.recentCalls[0]).toMatchObject({
      contactName: 'Eva',
      phoneNumber: '1001',
      durationSec: 1,
    })

    wrapper.unmount()
  })

  test('records a call ended before connection as failed without a relationship fact', async () => {
    const phoneStore = usePhoneStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { wrapper } = await mountPhoneView()

    await wrapper.get('[data-testid="phone-tab-contacts"]').trigger('click')
    await wrapper.get('[data-testid="phone-call-contact-1"]').trigger('click')
    await wrapper.get('[data-testid="phone-end-call"]').trigger('click')
    await flushUi()

    expect(phoneStore.recentCalls[0]).toMatchObject({
      contactName: 'Eva',
      phoneNumber: '1001',
      status: 'failed',
      durationSec: 0,
    })
    expect(relationshipRuntimeStore.events).toHaveLength(0)

    wrapper.unmount()
  })
})
