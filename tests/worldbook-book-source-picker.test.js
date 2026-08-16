import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import WorldBookView from '../src/views/WorldBookView.vue'
import { dialogState, resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import { useBookStore } from '../src/stores/book'
import { useSystemStore } from '../src/stores/system'
import { buildWorldBookSourceSnapshot } from '../src/lib/book-text-schema'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/worldbook', component: WorldBookView },
      { path: '/settings', component: DummyView },
      { path: '/book', component: DummyView },
    ],
  })

const mountWorldBook = async () => {
  const router = createTestRouter()
  await router.push('/worldbook')
  await router.isReady()

  const wrapper = mount(WorldBookView, {
    global: {
      plugins: [router],
    },
  })
  await flushPromises()
  await nextTick()
  return { wrapper, router }
}

describe('WorldBook setting text picker', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'))
    setActivePinia(createPinia())
    resetDialogServiceForTest()
    useSystemStore().settings.system.language = 'en-US'
  })

  test('shows built-in Book sources without creating a user Book asset', async () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    systemStore.setGlobalWorldview('Fallback city rules.')

    const { wrapper, router } = await mountWorldBook()

    const fallback = wrapper.get('[data-testid="worldbook-system-fallback"]')
    expect(fallback.text()).toContain('Base worldview')
    expect(fallback.text()).toContain('Fallback city rules')
    expect(bookStore.assetCount).toBe(0)
    expect(wrapper.get('[data-testid="worldbook-book-source-add"]').text()).toContain('Add from Book')
    expect(wrapper.get('[data-testid="worldbook-onboarding-card"]').text()).toContain(
      'Choose worldbook text from Book',
    )
    expect(wrapper.get('[data-testid="worldbook-source-stats"]').text()).toContain(
      'No books active yet',
    )

    await wrapper.get('[data-testid="worldbook-open-book-library"]').trigger('click')
    await nextTick()

    expect(router.currentRoute.value.path).toBe('/worldbook')
    expect(wrapper.get('[data-testid="worldbook-source-picker"]').text()).toContain('Book catalog')
    expect(wrapper.get('[data-testid="worldbook-source-catalog"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="worldbook-source-picker-group-main_worldview"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="worldbook-source-picker-group-world_rule"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="worldbook-source-picker-group-encyclopedia"]').exists()).toBe(true)
    expect(
      wrapper
        .get(
          '[data-testid="worldbook-source-picker-card-built_in_modern_seoul_kpop_main_worldview"]',
        )
        .exists(),
    ).toBe(true)

    wrapper.unmount()
  })

  test('links the built-in K-pop worldview as active Book context', async () => {
    const bookStore = useBookStore()
    const systemStore = useSystemStore()

    const { wrapper, router } = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-book-source-add"]').trigger('click')
    await nextTick()

    const picker = wrapper.get('[data-testid="worldbook-source-picker"]')
    expect(router.currentRoute.value.path).toBe('/worldbook')
    expect(
      wrapper
        .get(
          '[data-testid="worldbook-source-picker-card-built_in_modern_seoul_kpop_main_worldview"]',
        )
        .text(),
    ).toContain('Built-in')
    expect(picker.text()).toContain('现代首尔 K-pop 娱乐圈：主世界观')
    expect(bookStore.assetCount).toBe(0)

    await wrapper.get('[data-testid="worldbook-source-picker-confirm"]').trigger('click')
    await nextTick()

    const link = systemStore.listWorldBookSourceLinks()[0]
    expect(link).toMatchObject({
      assetId: 'built_in_modern_seoul_kpop_main_worldview',
      role: 'main_worldview',
      enabled: true,
    })
    expect(link.sourceSnapshotText).toContain('现代首尔 K-pop 娱乐圈')
    expect(bookStore.assetCount).toBe(0)
    expect(wrapper.get('[data-testid="worldbook-active-source-list"]').text()).toContain(
      '现代首尔 K-pop 娱乐圈：主世界观',
    )
    expect(wrapper.get(`[data-testid="worldbook-book-source-${link.id}"]`).text()).toContain(
      'Built-in text',
    )

    await wrapper.get(`[data-testid="worldbook-book-source-toggle-${link.id}"]`).trigger('click')
    await nextTick()

    expect(systemStore.listWorldBookSourceLinks()[0].enabled).toBe(false)
    expect(bookStore.assetCount).toBe(0)
    expect(wrapper.get('[data-testid="worldbook-source-maintenance"]').text()).toContain(
      '现代首尔 K-pop 娱乐圈：主世界观',
    )

    await wrapper.get(`[data-testid="worldbook-book-source-toggle-maintenance-${link.id}"]`).trigger('click')
    await nextTick()

    expect(systemStore.listWorldBookSourceLinks()[0].enabled).toBe(true)

    wrapper.unmount()
  })

  test('enabling a second worldview requires confirmation and switches atomically', async () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    const secondWorldview = bookStore.createAsset({
      id: 'asset_second_worldview',
      title: 'Parallel City Worldview',
      category: 'worldview',
      content: 'A different world premise.',
    })

    const { wrapper } = await mountWorldBook()

    // 启用第一份世界观（内置主世界观），无冲突时直接生效
    await wrapper.get('[data-testid="worldbook-book-source-add"]').trigger('click')
    await nextTick()
    await wrapper
      .get('[data-testid="worldbook-source-picker-card-built_in_modern_seoul_kpop_main_worldview"]')
      .trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="worldbook-source-picker-confirm"]').trigger('click')
    await nextTick()

    const firstLink = systemStore
      .listWorldBookSourceLinks()
      .find((link) => (link.role || link.usage) === 'main_worldview')
    expect(firstLink).toMatchObject({
      assetId: 'built_in_modern_seoul_kpop_main_worldview',
      enabled: true,
    })

    // 启用第二份世界观：必须先经过切换确认
    await wrapper.get('[data-testid="worldbook-book-source-add"]').trigger('click')
    await nextTick()
    await wrapper
      .get(`[data-testid="worldbook-source-picker-card-${secondWorldview.id}"]`)
      .trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="worldbook-source-picker-confirm"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(dialogState.visible).toBe(true)
    expect(dialogState.title).toContain('Switch worldview')
    // 确认前状态不变
    expect(systemStore.listWorldBookSourceLinks().filter((link) => link.enabled !== false)).toHaveLength(1)
    expect(systemStore.listWorldBookSourceLinks().some((link) => link.assetId === secondWorldview.id)).toBe(false)

    // 取消：不切换
    useDialog().cancelDialog()
    await flushPromises()
    await nextTick()
    expect(systemStore.listWorldBookSourceLinks().some((link) => link.assetId === secondWorldview.id)).toBe(false)

    // 再次确认：旧版停用，新版启用，全程唯一生效
    await wrapper.get('[data-testid="worldbook-source-picker-confirm"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(dialogState.visible).toBe(true)
    useDialog().submitDialog()
    await flushPromises()
    await nextTick()

    const links = systemStore.listWorldBookSourceLinks()
    const activeWorldviews = links.filter(
      (link) => (link.role || link.usage) === 'main_worldview' && link.enabled !== false,
    )
    expect(activeWorldviews).toHaveLength(1)
    expect(activeWorldviews[0].assetId).toBe(secondWorldview.id)
    expect(links.find((link) => link.id === firstLink.id)?.enabled).toBe(false)

    wrapper.unmount()
  })

  test('defaults built-in K-pop world rules to the world-rule source role', async () => {
    const systemStore = useSystemStore()
    const { wrapper } = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-book-source-add"]').trigger('click')
    await nextTick()

    await wrapper
      .get(
        '[data-testid="worldbook-source-picker-card-built_in_modern_seoul_kpop_world_rules"]',
      )
      .trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-source-picker-usage"]').element.value).toBe(
      'world_rule',
    )

    await wrapper.get('[data-testid="worldbook-source-picker-confirm"]').trigger('click')
    await nextTick()

    expect(systemStore.listWorldBookSourceLinks()[0]).toMatchObject({
      assetId: 'built_in_modern_seoul_kpop_world_rules',
      role: 'world_rule',
    })

    wrapper.unmount()
  })

  test('links the music-show-day rule only after explicit selection without enabling encyclopedias', async () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    const { wrapper } = await mountWorldBook()

    expect(systemStore.listWorldBookSourceLinks()).toHaveLength(0)

    await wrapper.get('[data-testid="worldbook-book-source-add"]').trigger('click')
    await nextTick()

    await wrapper
      .get(
        '[data-testid="worldbook-source-picker-card-built_in_modern_seoul_kpop_music_show_day_mini_scene_rule"]',
      )
      .trigger('click')
    await nextTick()

    expect(systemStore.listWorldBookSourceLinks()).toHaveLength(0)
    expect(wrapper.get('[data-testid="worldbook-source-picker-usage"]').element.value).toBe(
      'world_rule',
    )

    await wrapper.get('[data-testid="worldbook-source-picker-confirm"]').trigger('click')
    await nextTick()

    const links = systemStore.listWorldBookSourceLinks()
    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({
      assetId: 'built_in_modern_seoul_kpop_music_show_day_mini_scene_rule',
      role: 'world_rule',
      enabled: true,
    })
    expect(links[0].sourceSnapshotText).toContain('音乐节目打歌日')
    expect(links.some((link) => link.role === 'encyclopedia')).toBe(false)
    expect(bookStore.assetCount).toBe(0)

    wrapper.unmount()
  })

  test.each([
    ['built_in_modern_seoul_kpop_industry_career_operation', 'encyclopedia', 'K-pop 行业与事业'],
    ['built_in_modern_seoul_kpop_production_stage_live', 'encyclopedia', 'K-pop 作品、舞台与通告'],
    ['built_in_modern_seoul_kpop_fandom_platform_public_opinion', 'encyclopedia', 'K-pop 粉丝、平台与舆情'],
    ['built_in_modern_seoul_kpop_city_life_state_relationship', 'encyclopedia', '首尔艺人日常与关系网络'],
    ['built_in_modern_seoul_kpop_real_entity_member_coordinate', 'encyclopedia', 'K-pop 实体与成员坐标'],
    ['built_in_modern_seoul_kpop_industry_celebrity_functional_role', 'encyclopedia', 'K-pop 行业名人与功能角色'],
  ])('selects built-in encyclopedia Book asset %s with role %s', async (assetId, expectedRole, expectedTitle) => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    const { wrapper, router } = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-book-source-add"]').trigger('click')
    await nextTick()

    const card = wrapper.get(`[data-testid="worldbook-source-picker-card-${assetId}"]`)
    expect(card.text()).toContain('Built-in')
    expect(card.text()).toContain(expectedTitle)
    expect(
      wrapper.get(`[data-testid="worldbook-source-picker-group-${expectedRole}"]`).text(),
    ).toContain(card.text().split('\n')[0])

    await card.trigger('click')
    await nextTick()

    expect(router.currentRoute.value.path).toBe('/worldbook')
    expect(wrapper.get('[data-testid="worldbook-source-picker-usage"]').element.value).toBe(
      expectedRole,
    )

    await wrapper.get('[data-testid="worldbook-source-picker-confirm"]').trigger('click')
    await nextTick()

    expect(systemStore.listWorldBookSourceLinks()[0]).toMatchObject({
      assetId,
      role: expectedRole,
      enabled: true,
    })
    expect(systemStore.listWorldBookSourceLinks()[0].sourceSnapshotText).toContain(expectedTitle)
    expect(systemStore.listWorldBookSourceLinks()[0].sourceSnapshotText).not.toContain('后续校订点')
    expect(systemStore.listWorldBookSourceLinks()[0].sourceSnapshotText).not.toContain('内部校订备注')
    expect(bookStore.assetCount).toBe(0)

    wrapper.unmount()
  })

  test('enables an encyclopedia manuscript from the overview category directory without binding it as worldview', async () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    const { wrapper } = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-overview-text-category-encyclopedia"]').trigger('click')
    await nextTick()

    // 百科可多选：目录行点按即启用，不再经过卡片菜单
    await wrapper
      .get(
        '[data-testid="worldbook-source-directory-asset-built_in_modern_seoul_kpop_industry_career_operation"]',
      )
      .trigger('click')
    await nextTick()

    expect(systemStore.listWorldBookSourceLinks()[0]).toMatchObject({
      assetId: 'built_in_modern_seoul_kpop_industry_career_operation',
      role: 'encyclopedia',
      enabled: true,
    })
    expect(bookStore.assetCount).toBe(0)
    expect(wrapper.get('[data-testid="worldbook-overview-text-category-encyclopedia"]').text()).toContain(
      'K-pop 行业与事业',
    )
    expect(wrapper.get('[data-testid="worldbook-overview-text-category-worldview"]').text()).toContain(
      'Not set',
    )

    // 再次点按即停用
    await wrapper
      .get(
        '[data-testid="worldbook-source-directory-asset-built_in_modern_seoul_kpop_industry_career_operation"]',
      )
      .trigger('click')
    await nextTick()

    expect(systemStore.listWorldBookSourceLinks()[0]).toMatchObject({
      assetId: 'built_in_modern_seoul_kpop_industry_career_operation',
      enabled: false,
    })

    // 批量启用/停用
    await wrapper.get('[data-testid="worldbook-source-directory-enable-all"]').trigger('click')
    await nextTick()
    const enabledLinks = systemStore
      .listWorldBookSourceLinks()
      .filter((link) => link.role === 'encyclopedia' && link.enabled !== false)
    expect(enabledLinks.length).toBeGreaterThan(1)

    await wrapper.get('[data-testid="worldbook-source-directory-disable-all"]').trigger('click')
    await nextTick()
    expect(
      systemStore
        .listWorldBookSourceLinks()
        .filter((link) => link.role === 'encyclopedia' && link.enabled !== false),
    ).toHaveLength(0)

    wrapper.unmount()
  })

  test('clears base worldview without changing Book assets', async () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    systemStore.setGlobalWorldview('Fallback city rules.')

    const { wrapper } = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-panel-tab-kernel"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="worldbook-global-worldview"]').element.value).toBe(
      'Fallback city rules.',
    )

    await wrapper.get('[data-testid="worldbook-clear-worldview"]').trigger('click')
    expect(dialogState.visible).toBe(true)
    expect(dialogState.title).toContain('Clear')

    useDialog().submitDialog()
    await flushPromises()
    await nextTick()

    expect(systemStore.user.globalWorldview).toBe('')
    expect(systemStore.user.worldBook).toBe('')
    expect(bookStore.assetCount).toBe(0)
    expect(wrapper.get('[data-testid="worldbook-global-worldview"]').element.value).toBe('')

    wrapper.unmount()
  })

  test('copies system fallback into Book as a draft asset', async () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    systemStore.setGlobalWorldview('Fallback city rules.')

    const { wrapper, router } = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-copy-fallback-to-book"]').trigger('click')
    expect(dialogState.visible).toBe(true)
    expect(dialogState.title).toContain('Copy')

    useDialog().submitDialog()
    await flushPromises()
    await nextTick()

    expect(bookStore.assetCount).toBe(1)
    const asset = bookStore.assets[0]
    expect(asset).toMatchObject({
      assetType: 'worldview',
      status: 'draft',
    })
    expect(asset.content).toContain('Fallback city rules.')
    expect(asset.source.kind).toBe('worldbook_fallback_copy')
    expect(systemStore.listWorldBookSourceLinks()).toHaveLength(0)
    expect(router.currentRoute.value.path).toBe('/book')
    expect(router.currentRoute.value.query.asset).toBe(asset.id)

    wrapper.unmount()
  })

  test('links selected Book sections instead of the whole document', async () => {
    const bookStore = useBookStore()
    const systemStore = useSystemStore()
    const asset = bookStore.createAsset({
      id: 'asset_sections',
      title: 'Sectioned World',
      assetType: 'worldbook_document',
      format: 'markdown',
      content: '# Basics\n\nVisible rules.\n\n## Secrets\n\nHidden rules.',
    })

    const { wrapper } = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-book-source-add"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-source-picker"]').text()).toContain('Sectioned World')

    await wrapper.get('input[value="sections"]').setValue(true)
    await nextTick()
    await wrapper
      .get('[data-testid="worldbook-source-picker-section-section_basics_1"] input')
      .setValue(true)
    await wrapper.get('[data-testid="worldbook-source-picker-confirm"]').trigger('click')
    await nextTick()

    const link = systemStore.listWorldBookSourceLinks()[0]
    expect(link).toMatchObject({
      assetId: asset.id,
      sectionIds: ['section_basics_1'],
      role: 'main_worldview',
      usage: 'main_worldview',
      enabled: true,
      sourceSnapshotText: 'Visible rules.',
    })
    expect(bookStore.findAssetById(asset.id)?.status).toBe('active_source')
    expect(wrapper.get(`[data-testid="worldbook-book-source-${link.id}"]`).text()).toContain(
      'Basics',
    )
  })

  test('loads old source-link usage values as canonical roles', async () => {
    const bookStore = useBookStore()
    const systemStore = useSystemStore()
    const asset = bookStore.createAsset({
      id: 'asset_legacy_usage',
      title: 'Legacy Usage',
      content: 'Legacy source text.',
    })
    systemStore.addWorldBookSourceLink({
      assetId: asset.id,
      usage: 'base_worldview',
      enabled: true,
    })

    const { wrapper } = await mountWorldBook()
    const link = systemStore.listWorldBookSourceLinks()[0]

    expect(link).toMatchObject({
      role: 'main_worldview',
      usage: 'main_worldview',
    })
    expect(wrapper.get(`[data-testid="worldbook-book-source-${link.id}"]`).text()).toContain(
      'Main worldview',
    )
  })

  test('separates in-use setting text from advanced maintenance items', async () => {
    const bookStore = useBookStore()
    const systemStore = useSystemStore()
    const activeAsset = bookStore.createAsset({
      id: 'asset_active_context',
      title: 'Active Setting Text',
      content: 'Current world rules.',
    })
    const disabledAsset = bookStore.createAsset({
      id: 'asset_disabled_context',
      title: 'Unused Setting Text',
      content: 'Optional world rules.',
    })
    const activeLink = systemStore.addWorldBookSourceLink({
      assetId: activeAsset.id,
      enabled: true,
      sourceVersion: activeAsset.version,
      sourceFingerprint: activeAsset.contentFingerprint,
      ...buildWorldBookSourceSnapshot(activeAsset.content),
    })
    const disabledLink = systemStore.addWorldBookSourceLink({
      assetId: disabledAsset.id,
      enabled: false,
      sourceVersion: disabledAsset.version,
      sourceFingerprint: disabledAsset.contentFingerprint,
      ...buildWorldBookSourceSnapshot(disabledAsset.content),
    })

    const { wrapper } = await mountWorldBook()

    expect(wrapper.get('[data-testid="worldbook-source-stats"]').text()).toContain('Reading 1 book(s)')
    expect(wrapper.get('[data-testid="worldbook-active-source-list"]').text()).toContain('Active Setting Text')
    expect(wrapper.find(`[data-testid="worldbook-book-source-maintenance-${activeLink.id}"]`).exists()).toBe(false)
    expect(wrapper.get('[data-testid="worldbook-source-maintenance"]').text()).toContain('1 inactive')
    expect(wrapper.get(`[data-testid="worldbook-book-source-maintenance-${disabledLink.id}"]`).text()).toContain(
      'Unused Setting Text',
    )
  })

  test('reviews and accepts a changed Book source reference', async () => {
    const bookStore = useBookStore()
    const systemStore = useSystemStore()
    const asset = bookStore.createAsset({
      id: 'asset_changed_ui',
      title: 'Changed UI Source',
      content: 'Original source text.',
    })
    const link = systemStore.addWorldBookSourceLink({
      assetId: asset.id,
      sourceVersion: asset.version,
      sourceFingerprint: asset.contentFingerprint,
      ...buildWorldBookSourceSnapshot(asset.content),
    })

    bookStore.updateAsset(asset.id, { content: 'Updated source text.' })

    const { wrapper } = await mountWorldBook()
    const changedAsset = bookStore.findAssetById(asset.id)

    await wrapper.get(`[data-testid="worldbook-book-source-review-${link.id}"]`).trigger('click')
    await nextTick()

    const panel = wrapper.get('[data-testid="worldbook-book-source-review-panel"]')
    expect(panel.text()).toContain('Original source text.')
    expect(panel.text()).toContain('Updated source text.')
    expect(wrapper.find('[data-testid="worldbook-source-diff-removed"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="worldbook-source-diff-added"]').exists()).toBe(true)

    await wrapper.get('[data-testid="worldbook-book-source-review-accept"]').trigger('click')
    await nextTick()

    const refreshed = systemStore.listWorldBookSourceLinks()[0]
    expect(refreshed.sourceFingerprint).toBe(changedAsset.contentFingerprint)
    expect(refreshed.sourceVersion).toBe(changedAsset.version)
    expect(refreshed.sourceSnapshotText).toBe('Updated source text.')
    expect(wrapper.find(`[data-testid="worldbook-book-source-review-${link.id}"]`).exists()).toBe(
      false,
    )
  })
})
