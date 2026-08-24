import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import SystemNotificationShade from '../src/components/SystemNotificationShade.vue'
import { useSystemStore } from '../src/stores/system'

const routeComponent = { template: '<div></div>' }

const createTestRouter = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: routeComponent },
      { path: '/calendar', component: routeComponent },
      { path: '/map', component: routeComponent },
      { path: '/settings', component: routeComponent },
    ],
  })
  await router.push('/home')
  await router.isReady()
  return router
}

const mountShade = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = await createTestRouter()
  const systemStore = useSystemStore()
  systemStore.settings.system.language = 'zh-CN'
  systemStore.settings.system.notifications = true
  systemStore.settings.appearance.appIconOverrides = {}

  const wrapper = mount(SystemNotificationShade, {
    global: {
      plugins: [pinia, router],
    },
  })

  return { wrapper, router, systemStore }
}

const buildNotification = (overrides = {}) => ({
  id: 'note-1',
  title: '彩排还有 45 分钟',
  content: '建议 18:20 前离开。',
  icon: 'fas fa-calendar-days',
  route: '/calendar',
  source: 'calendar_departure_ready',
  createdAt: 1_800_000,
  read: false,
  ...overrides,
})

beforeEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('SystemNotificationShade', () => {
  test('opens from the status bar and groups notifications by their resolved owner app', async () => {
    const { wrapper, systemStore } = await mountShade()
    systemStore.notifications = [
      buildNotification(),
      buildNotification({
        id: 'note-2',
        title: '建议 18:20 出发',
        content: '当前路线预计 25 分钟。',
        route: '/map',
        source: 'map_departure_estimate',
        createdAt: 1_700_000,
      }),
      buildNotification({
        id: 'note-3',
        title: '已读的日历提醒',
        read: true,
        createdAt: 1_600_000,
      }),
    ]
    await wrapper.get('[data-testid="notification-shade-trigger"]').trigger('click')

    expect(wrapper.get('[data-testid="notification-shade"]').attributes('role')).toBe('dialog')
    expect(wrapper.get('[data-testid="notification-shade-group-calendar"]').text()).toContain(
      '2 条',
    )
    expect(wrapper.get('[data-testid="notification-shade-group-map"]').text()).toContain('地图')

    await wrapper.get('[data-testid="notification-shade-filter-unread"]').trigger('click')
    expect(wrapper.find('[data-testid="notification-shade-note-note-3"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="notification-shade-note-note-1"]').exists()).toBe(true)
  })

  test('marks all notifications read without dismissing them', async () => {
    const { wrapper, systemStore } = await mountShade()
    systemStore.notifications = [
      buildNotification(),
      buildNotification({ id: 'note-2', source: 'map_eta', route: '/map' }),
    ]
    await wrapper.get('[data-testid="notification-shade-trigger"]').trigger('click')
    await wrapper.get('[data-testid="notification-shade-mark-all-read"]').trigger('click')

    expect(systemStore.notifications).toHaveLength(2)
    expect(systemStore.notifications.every((note) => note.read)).toBe(true)
  })

  test('dismisses only the selected notification record', async () => {
    const { wrapper, systemStore } = await mountShade()
    systemStore.notifications = [buildNotification(), buildNotification({ id: 'note-2' })]
    await wrapper.get('[data-testid="notification-shade-trigger"]').trigger('click')
    await wrapper.get('[data-testid="notification-shade-dismiss-note-1"]').trigger('click')

    expect(systemStore.notifications.map((note) => note.id)).toEqual(['note-2'])
  })

  test('marks a routed notification read and opens its owner route', async () => {
    const { wrapper, router, systemStore } = await mountShade()
    systemStore.notifications = [buildNotification()]
    await wrapper.get('[data-testid="notification-shade-trigger"]').trigger('click')
    await wrapper.get('[data-testid="notification-shade-note-note-1"] button').trigger('click')
    await flushPromises()

    expect(systemStore.notifications[0].read).toBe(true)
    expect(router.currentRoute.value.path).toBe('/calendar')
    expect(wrapper.find('[data-testid="notification-shade"]').exists()).toBe(false)
  })

  test('shows an honest disabled state and links to notification settings', async () => {
    const { wrapper, router, systemStore } = await mountShade()
    systemStore.settings.system.notifications = false
    await wrapper.get('[data-testid="notification-shade-trigger"]').trigger('click')

    expect(wrapper.text()).toContain('通知已关闭')
    await wrapper.get('[data-testid="notification-shade-open-settings"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/settings?menu=notification')
  })

  test('closes on Escape and restores the status-bar entry', async () => {
    const { wrapper } = await mountShade()
    await wrapper.get('[data-testid="notification-shade-trigger"]').trigger('click')
    await wrapper.get('[data-testid="notification-shade"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[data-testid="notification-shade"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="notification-shade-trigger"]').exists()).toBe(true)
  })

  test('renders long localized notification copy without discarding content', async () => {
    const { wrapper, systemStore } = await mountShade()
    const longTitle =
      'InternationalBroadcastRehearsalScheduleNeedsImmediateReviewWithoutSpaces'
    const longContent =
      'The production coordinator updated the departure window and attached a detailed route note for the rehearsal venue.'
    systemStore.notifications = [buildNotification({ title: longTitle, content: longContent })]
    await wrapper.get('[data-testid="notification-shade-trigger"]').trigger('click')

    expect(wrapper.get('[data-testid="notification-shade-note-note-1"]').text()).toContain(longTitle)
    expect(wrapper.get('[data-testid="notification-shade-note-note-1"]').text()).toContain(
      longContent,
    )
  })
})
