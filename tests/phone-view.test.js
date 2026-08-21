import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import PhoneView from '../src/views/PhoneView.vue'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import { usePhoneStore } from '../src/stores/phone'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useShoppingStore } from '../src/stores/shopping'
import { useChatStore } from '../src/stores/chat'
import {
  recordShoppingGiftDeliveryRelationshipFact,
  recordShoppingGiftRelationshipFact,
} from '../src/lib/relationship-fact-adapters'

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
    useShoppingStore().resetForTesting()
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

  test('links recipient feedback to the same delivered gift memory', async () => {
    const shoppingStore = useShoppingStore()
    const phoneStore = usePhoneStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const product = shoppingStore.upsertProduct({
      id: 'product_xia_gift_feedback',
      title: 'Moon Lamp',
      category: 'gifts',
      price: '88.00',
      giftable: true,
    })
    shoppingStore.addToCart(product.id)
    const order = shoppingStore.checkoutCart({
      giftRecipient: {
        name: 'Eva',
        contactId: 1,
        profileId: 1,
        kind: 'role',
        sourceModule: 'chat',
        sourceId: '1',
      },
    })
    shoppingStore.markOrderCompleted(order.id)
    recordShoppingGiftRelationshipFact({ relationshipRuntimeStore, order })
    recordShoppingGiftDeliveryRelationshipFact({ relationshipRuntimeStore, order })
    const duplicateEva = useChatStore().addContact({
      name: 'Eva',
      kind: 'role',
      role: 'Same-name test contact',
    })

    const { wrapper } = await mountPhoneView()
    await wrapper.get('[data-testid="phone-open-composer"]').trigger('click')
    await wrapper.get('[data-testid="phone-relationship-contact"]').setValue(String(duplicateEva.id))
    await wrapper.get('[data-testid="phone-direction-incoming"]').trigger('click')
    await flushUi()
    expect(wrapper.find('[data-testid="phone-gift-experience"]').exists()).toBe(false)

    await wrapper.get('[data-testid="phone-relationship-contact"]').setValue('1')
    await flushUi()

    expect(wrapper.get('[data-testid="phone-gift-experience"]').text()).toContain('Moon Lamp')
    await wrapper.get('[data-testid="phone-gift-experience"]').setValue(order.sharedExperienceId)
    await wrapper.get('[data-testid="phone-summary"]').setValue('I love it.')
    await wrapper.get('[data-testid="phone-composer-sheet"]').trigger('submit')
    await flushUi()

    expect(phoneStore.recentCalls[0]).toMatchObject({
      contactName: 'Eva',
      direction: 'incoming',
      sharedExperienceId: order.sharedExperienceId,
      summary: 'I love it.',
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(
      { profileId: 1, contactId: 1, name: 'Eva' },
      { memoryLimit: 10 },
    )
    expect(summary.memorySummaries).toHaveLength(1)
    expect(summary.memorySummaries[0]).toMatchObject({
      memoryKey: `shared_experience__${order.sharedExperienceId}`,
      supportingCount: 3,
    })
    expect(summary.memorySummaries[0].displaySummary).toContain('I love it.')
    expect(summary.metrics).toMatchObject({ affinity: 58, trust: 53, intimacy: 24 })

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
