import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CommunityView from '../src/views/CommunityView.vue'
import { useSystemStore } from '../src/stores/system'
import {
  COMMUNITY_POSTS,
  getCommunityClaim,
  resolveCommunityTruthPresentation,
  validateCommunityFixtureContract,
} from '../src/lib/community-shell-data'
import {
  COMMUNITY_SHELL_STATE_STORAGE_KEY,
  loadCommunityShellState,
  normalizeCommunityShellState,
} from '../src/lib/community-shell-state'

const DummyView = { template: '<div />' }
const createTestRouter = () => createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/home', component: DummyView },
    { path: '/community', component: CommunityView },
  ],
})

const mountCommunity = async () => {
  const router = createTestRouter()
  await router.push('/community')
  await router.isReady()
  const wrapper = mount(CommunityView, { global: { plugins: [router, createPinia()] } })
  return { router, wrapper }
}

describe('Community Core S1 fixture shell', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })

  test('fixture contract keeps confirmed facts, claims, and committed posts separate', () => {
    expect(validateCommunityFixtureContract()).toBe(true)
    expect(COMMUNITY_POSTS.every((post) => post.publicationState === 'committed')).toBe(true)
    expect(getCommunityClaim('claim_midnight_rehearsal').truthStatus).toBe('unverified')
    expect(
      resolveCommunityTruthPresentation(
        COMMUNITY_POSTS.find((post) => post.id === 'post_room404_midnight_claim'),
        true,
      ).label,
    ).toBe('未经证实')
  })

  test('renders a Chinese Following feed without Korean UI copy', async () => {
    const { wrapper } = await mountCommunity()
    expect(wrapper.get('[data-testid="community-app"]').text()).toContain('涟漪')
    expect(wrapper.get('[data-testid="community-channel-following"]').attributes('aria-current')).toBe('page')
    expect(wrapper.get('[data-testid="community-post-post_hanul_showcase_notice"]').text()).toContain('已核实')
    expect(wrapper.get('.ripple-feed__legend').text()).toContain('账号说法')
    expect(wrapper.get('.ripple-feed__legend').text()).toContain('已发布内容')
    expect(wrapper.text()).not.toMatch(/[가-힯]/)
    wrapper.unmount()
  })

  test('Explore makes an unverified account claim visibly different from confirmed content', async () => {
    const { wrapper } = await mountCommunity()
    await wrapper.get('[data-testid="community-channel-explore"]').trigger('click')
    const claimPost = wrapper.get('[data-testid="community-post-post_room404_midnight_claim"]')
    expect(claimPost.text()).toContain('未经证实')
    expect(claimPost.text()).toContain('不是已确认事实')
    expect(claimPost.classes()).toContain('truth-unverified')
    wrapper.unmount()
  })

  test('opening a post marks it read and exposes sources in detail', async () => {
    const { wrapper } = await mountCommunity()
    await wrapper.get('[data-testid="community-post-post_hanul_showcase_notice"] .ripple-post__open').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="community-post-detail"]').text()).toContain('官方公开行程')
    expect(wrapper.get('[data-testid="community-detail-truth"]').text()).toContain('已核实')
    const stored = JSON.parse(localStorage.getItem(COMMUNITY_SHELL_STATE_STORAGE_KEY))
    expect(stored.readPostIds).toContain('post_hanul_showcase_notice')
    await wrapper.get('[data-testid="community-detail-back"]').trigger('click')
    expect(wrapper.find('[data-testid="community-post-detail"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('bookmarks persist and form a useful saved-feed loop', async () => {
    const { wrapper } = await mountCommunity()
    await wrapper.get('[data-testid="community-bookmark-post_hanul_showcase_notice"]').trigger('click')
    await wrapper.get('[data-testid="community-channel-bookmarks"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="community-post-post_hanul_showcase_notice"]').exists()).toBe(true)
    expect(loadCommunityShellState().bookmarkedPostIds).toContain('post_hanul_showcase_notice')
    wrapper.unmount()
  })

  test('Saved starts with an honest empty state', async () => {
    const { wrapper } = await mountCommunity()
    await wrapper.get('[data-testid="community-channel-bookmarks"]').trigger('click')
    expect(wrapper.get('[data-testid="community-empty-state"]').text()).toContain('还没有收藏')
    wrapper.unmount()
  })

  test('account panel follow action persists without changing another owner', async () => {
    const { wrapper } = await mountCommunity()
    await wrapper.get('[data-testid="community-account-account_stagewire"]').trigger('click')
    expect(wrapper.get('[data-testid="community-account-panel"]').text()).toContain('舞台通讯')
    await wrapper.get('[data-testid="community-account-follow"]').trigger('click')
    expect(loadCommunityShellState().followedAccountIds).toContain('account_stagewire')
    wrapper.unmount()
  })

  test('local refresh is explicit, deterministic, and does not use fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { wrapper } = await mountCommunity()
    await wrapper.get('[data-testid="community-refresh"]').trigger('click')
    expect(wrapper.get('[data-testid="community-refresh-notice"]').text()).toContain('未调用 AI')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
    wrapper.unmount()
  })

  test('source-unavailable post fails closed and keeps the published text honest', async () => {
    const { wrapper } = await mountCommunity()
    await wrapper.get('[data-testid="community-channel-news"]').trigger('click')
    const post = wrapper.get('[data-testid="community-post-post_radio_archive_unavailable"]')
    expect(post.text()).toContain('来源暂不可用')
    await post.get('.ripple-post__open').trigger('click')
    expect(wrapper.get('[data-testid="community-post-detail"]').text()).toContain('未补写缺失内容')
    wrapper.unmount()
  })

  test('English and zen theme apply to all visible shell layers', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.settings.appearance.currentTheme = 'zen'
    const { wrapper } = await mountCommunity()
    expect(wrapper.get('[data-testid="community-app"]').classes()).toContain('is-night')
    expect(wrapper.get('[data-testid="community-channel-following"]').text()).toContain('Following')
    expect(wrapper.text()).toContain('Confirmed')
    wrapper.unmount()
  })

  test('state normalization discards invalid routes and malformed IDs', () => {
    const state = normalizeCommunityShellState({
      activeChannelId: 'admin', followedAccountIds: ['good', 7, 'good'], bookmarkedPostIds: null,
    })
    expect(state.activeChannelId).toBe('following')
    expect(state.followedAccountIds).toEqual(['good'])
    expect(state.bookmarkedPostIds).toEqual([])
  })
})
