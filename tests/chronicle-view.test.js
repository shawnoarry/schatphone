import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ChronicleView from '../src/views/ChronicleView.vue'
import { useChronicleStore } from '../src/stores/chronicle'

const NOW = new Date('2026-08-30T13:00:00+08:00').getTime()
const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chronicle', component: ChronicleView },
      { path: '/home', component: DummyView },
      { path: '/calendar', component: DummyView },
      { path: '/agenda-journey', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/workplace', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await Promise.resolve()
  await flushPromises()
}

describe('Chronicle view', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('keeps the ordinary flow on one date and saves a user-authored note', async () => {
    const router = createTestRouter()
    await router.push('/chronicle?from=home&homePage=2')
    await router.isReady()
    const wrapper = mount(ChronicleView, { global: { plugins: [router] } })
    await flushUi()

    expect(wrapper.get('[data-testid="chronicle-empty"]').text()).toContain('这一天还很安静')
    await wrapper.get('[data-testid="chronicle-create-open"]').trigger('click')
    await wrapper.get('[data-testid="chronicle-editor-title"]').setValue('周日午后')
    await wrapper.get('[data-testid="chronicle-editor-body"]').setValue('今天终于把事情慢慢理清了。')
    await wrapper.get('[data-testid="chronicle-editor-tags"]').setValue('休息, 整理')
    await wrapper.get('[data-testid="chronicle-editor-save"]').trigger('submit')
    await flushUi()

    const store = useChronicleStore()
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0]).toMatchObject({
      entryDate: '2026-08-30',
      title: '周日午后',
      body: '今天终于把事情慢慢理清了。',
      tags: ['休息', '整理'],
    })
    expect(wrapper.get('[data-testid="chronicle-detail"]').text()).toContain('今天终于把事情慢慢理清了。')
    wrapper.unmount()
  })

  test('opens from an exact diary deep link and returns to the originating Home page', async () => {
    const store = useChronicleStore()
    const created = store.addEntry({
      entryDate: '2026-08-29',
      body: '昨天的记录。',
    }, { now: NOW - 24 * 60 * 60_000 })
    const router = createTestRouter()
    await router.push({
      path: '/chronicle',
      query: { date: '2026-08-29', entryId: created.entry.id, from: 'home', homePage: '3' },
    })
    await router.isReady()
    const wrapper = mount(ChronicleView, { global: { plugins: [router] } })
    await flushUi()

    expect(wrapper.get('[data-testid="chronicle-date-input"]').element.value).toBe('2026-08-29')
    expect(wrapper.get('[data-testid="chronicle-detail"]').text()).toContain('昨天的记录。')
    await wrapper.get('.chronicle-topbar .chronicle-icon-button').trigger('click')
    await flushUi()
    expect(router.currentRoute.value).toMatchObject({ path: '/home', query: { homePage: '3' } })
    wrapper.unmount()
  })
})
