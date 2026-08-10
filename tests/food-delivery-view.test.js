import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  FOOD_DELIVERY_ORDER_EVENT_TYPE,
  FOOD_DELIVERY_ORDER_STATUS,
  useFoodDeliveryStore,
} from '../src/stores/foodDelivery'
import { useChatStore } from '../src/stores/chat'
import { useGalleryStore } from '../src/stores/gallery'
import { useMapStore } from '../src/stores/map'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSimulationStore } from '../src/stores/simulation'
import { useSystemStore } from '../src/stores/system'
import { useWalletStore } from '../src/stores/wallet'
import {
  DASH_GRILL_MENU_COPY_BY_ID,
  getDashGrillMenuSearchValues,
  resolveDashGrillMenuItemCopy,
} from '../src/lib/food-delivery-dash-grill-copy'
import FoodDeliveryView from '../src/views/FoodDeliveryView.vue'

const DummyView = { template: '<div />' }
const INTERNAL_DELIVERY_DIAGNOSTIC_COPY =
  /(?:\b(?:owner|source|boundary|simulation|sourceplan)\b|\bread[- ]?only\b|\bdoes not start a trip\b|\btrigger delivery event\b|归属|来源|边界|模拟|只读|不会启动行程|触发配送事件)/iu

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: DummyView },
      { path: '/food-delivery', component: FoodDeliveryView },
    ],
  })

describe('FoodDeliveryView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('renders folder-backed categories without exposing shop order controls on the platform', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.get('[data-testid="food-delivery-pseudo-folder-home"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-platform-entry"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-platform-search"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-platform-location"]').text()).toContain(
      '配送到',
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-greeting"]').text()).toContain(
      '今天想吃点什么',
    )
    expect(
      wrapper.get('[data-testid="food-delivery-platform-rider"] img').attributes('src'),
    ).toContain('delivery-rider-mascot-01.png')
    expect(wrapper.get('[data-testid="food-delivery-platform-banner-rail"]').text()).not.toContain(
      '免配送权益',
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-platform-banner-action-club_free_delivery"]')
        .attributes('aria-label'),
    ).toContain('免配送权益')
    expect(wrapper.find('[data-testid="food-delivery-platform-benefits"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="food-delivery-platform-hero-image"]').exists()).toBe(true)
    const recommendedMerchantIds = wrapper
      .get('[data-testid="food-delivery-shop-app-list"]')
      .findAll('[data-platform-category]')
      .map((merchant) => merchant.attributes('data-testid'))
    expect(recommendedMerchantIds).toHaveLength(3)
    expect(new Set(recommendedMerchantIds).size).toBe(3)
    expect(wrapper.get('[data-testid="food-delivery-data-baseline"]').text()).toContain('为你推荐')
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-summary"]').text()).toContain(
      '随机推荐 3 家 · 共 11 家',
    )
    expect(
      wrapper.find('[data-testid="food-delivery-shop-app-food_seed_moon_bistro"]').exists(),
    ).toBe(false)
    expect(wrapper.get('[data-testid="food-delivery-category-panel"]').text()).toContain('全部')
    const categoryGrid = wrapper.get('[data-testid="food-delivery-category-grid"]')
    expect(categoryGrid.classes()).toContain('grid-cols-5')
    expect(categoryGrid.findAll('button')).toHaveLength(10)
    expect(
      wrapper.get('[data-testid="food-delivery-category-all"]').attributes('aria-pressed'),
    ).toBe('true')
    expect(wrapper.get('[data-testid="food-delivery-category-icon-all"]').classes()).toContain(
      'h-12',
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-category-icon-pizza"]')
        .attributes('data-required-asset'),
    ).toBe('platform/categories/icons/category-pizza-01.png')
    expect(
      wrapper.get('[data-testid="food-delivery-category-image-pizza"]').attributes('src'),
    ).toContain('platform/categories/icons/category-pizza-01.png')
    expect(wrapper.find('[data-testid="food-delivery-category-nearby"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-category-grocery_delivery"]').exists()).toBe(
      true,
    )
    expect(wrapper.find('[data-testid="food-delivery-category-noodles"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="food-delivery-category-sushi"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-data-baseline"]').text()).toContain('为你推荐')
    expect(wrapper.get('[data-testid="food-delivery-shop-app-list"]').text()).toMatch(
      /km.*\d\.\d.*min/s,
    )
    expect(wrapper.find('[data-testid="food-delivery-cart-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-orders-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-wallet-suggestions"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-map-boundary"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-map-handoff"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-custom-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-category-cafe"]').exists()).toBe(true)

    await wrapper.get('[data-testid="food-delivery-platform-search"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.platformView).toBe('search')
    expect(wrapper.get('[data-testid="food-delivery-platform-search-page"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="food-delivery-platform-banner-rail"]').exists()).toBe(false)

    await wrapper.get('[data-testid="food-delivery-platform-search-input"]').setValue('寿司')
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-platform-search-results"]').text()).toContain(
      '寿司花',
    )
    expect(
      wrapper.get('[data-testid="food-delivery-platform-search-results"]').text(),
    ).not.toContain('逆站洞韩牛汤饭')

    await wrapper
      .get('[data-testid="food-delivery-select-platform-merchant-platform_sushi_hana"]')
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.restaurantId).toBeUndefined()
    expect(router.currentRoute.value.query).toMatchObject({
      platformView: 'merchant',
      platformMerchant: 'platform_sushi_hana',
      platformReturn: 'search',
    })
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-page"]').text()).toContain(
      '寿司花',
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-menu"]').text()).toContain(
      '花见十二贯',
    )

    expect(wrapper.get('[data-testid="food-delivery-platform-minimum-order"]').text()).toContain(
      '77.76 CNY',
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-minimum-order"]').text()).toContain(
      '15,000 KRW',
    )

    await wrapper.get('[data-testid="food-delivery-platform-merchant-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.platformView).toBe('search')
    await wrapper.get('[data-testid="food-delivery-platform-page-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.platformView).toBeUndefined()
    expect(
      wrapper
        .get('[data-testid="food-delivery-shop-app-list"]')
        .findAll('[data-platform-category]')
        .map((merchant) => merchant.attributes('data-testid')),
    ).toEqual(recommendedMerchantIds)

    await wrapper.get('[data-testid="food-delivery-category-chicken"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      category: 'fast_food',
      platformFilter: 'chicken',
    })
    expect(wrapper.get('[data-testid="food-delivery-shop-app-list"]').text()).toContain(
      '脆脆炸鸡屋',
    )
    expect(wrapper.get('[data-testid="food-delivery-shop-app-list"]').text()).not.toContain(
      '花德披萨味店',
    )

    await wrapper.get('[data-testid="food-delivery-category-cafe"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/food-delivery')
    expect(router.currentRoute.value.query.category).toBe('cafe')
    expect(router.currentRoute.value.query.platformFilter).toBe('cafe')
    wrapper.unmount()
  })

  test('preserves the originating Home page through platform and merchant navigation', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby&from=home&homePage=3')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="food-delivery-platform-search"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      platformView: 'search',
      from: 'home',
      homePage: '3',
    })

    await wrapper.get('[data-testid="food-delivery-platform-search-input"]').setValue('寿司')
    await wrapper
      .get('[data-testid="food-delivery-select-platform-merchant-platform_sushi_hana"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      platformView: 'merchant',
      platformMerchant: 'platform_sushi_hana',
      platformReturn: 'search',
      from: 'home',
      homePage: '3',
    })

    await wrapper.get('[data-testid="food-delivery-platform-merchant-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      platformView: 'search',
      from: 'home',
      homePage: '3',
    })

    await wrapper.get('[data-testid="food-delivery-platform-page-back"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="food-delivery-go-home"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      path: '/home',
      query: { homePage: '3' },
    })
    wrapper.unmount()
  })

  test('expands and collapses the full platform merchant list', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    const viewAllButton = wrapper.get('[data-testid="food-delivery-platform-view-all"]')
    const merchantList = wrapper.get('[data-testid="food-delivery-shop-app-list"]')
    expect(viewAllButton.attributes('aria-expanded')).toBe('false')
    expect(viewAllButton.text()).toContain('全部查看')
    expect(merchantList.classes()).toContain('flex')
    const initialRecommendations = merchantList
      .findAll('[data-platform-category]')
      .map((merchant) => merchant.attributes('data-testid'))
    expect(initialRecommendations).toHaveLength(3)
    expect(merchantList.attributes('data-recommendation-mode')).toBe('random-three')

    await viewAllButton.trigger('click')

    expect(viewAllButton.attributes('aria-expanded')).toBe('true')
    expect(viewAllButton.text()).toContain('收起')
    expect(merchantList.classes()).toContain('grid')
    expect(merchantList.findAll('[data-platform-category]')).toHaveLength(11)
    expect(merchantList.text()).toContain('莓果晨光')
    expect(merchantList.text()).toContain('青禾鲜食补给站')
    expect(merchantList.text()).toContain('山茶牛肉面馆')
    expect(merchantList.text()).toContain('早安贝果咖啡')
    expect(merchantList.text()).toContain('榆树里蒸点铺')
    expect(merchantList.text()).toContain('南风椰香咖喱')
    expect(merchantList.text()).not.toContain('白浪手握寿司')
    const bagelCover = wrapper.get(
      '[data-testid="food-delivery-platform-merchant-card-platform_golden_chicken"]',
    )
    expect(bagelCover.attributes('data-required-asset')).toContain(
      'merchant-ad-morning-bagel-01.webp',
    )
    expect(bagelCover.attributes('data-merchant-visual-type')).toBe('ad-cover')
    expect(bagelCover.get('img').attributes('src')).toContain('merchant-ad-morning-bagel-01.webp')
    const adCoverMerchantContracts = [
      ['platform_berry_morning', 'merchant-ad-berry-morning-01.webp'],
      ['platform_green_basket', 'merchant-ad-green-basket-01.webp'],
      ['platform_golden_chicken', 'merchant-ad-morning-bagel-01.webp'],
      ['platform_nori_table', 'merchant-ad-elm-dim-sum-01.webp'],
    ]
    for (const [merchantId, fileName] of adCoverMerchantContracts) {
      const cover = wrapper.get(
        `[data-testid="food-delivery-platform-merchant-card-${merchantId}"]`,
      )
      expect(cover.attributes('data-merchant-visual-type')).toBe('ad-cover')
      expect(cover.attributes('data-required-asset')).toContain(fileName)
    }
    const photoMerchantContracts = [
      ['platform_neighborhood_soup', 'merchant-noodle-house-01.png'],
      ['platform_corner_pizza', 'merchant-coconut-curry-01.png'],
    ]
    for (const [merchantId, fileName] of photoMerchantContracts) {
      const cover = wrapper.get(
        `[data-testid="food-delivery-platform-merchant-card-${merchantId}"]`,
      )
      expect(cover.attributes('data-merchant-visual-type')).toBe('food-photo')
      expect(cover.get('img').attributes('src')).toContain(fileName)
    }

    await viewAllButton.trigger('click')
    expect(viewAllButton.attributes('aria-expanded')).toBe('false')
    expect(merchantList.classes()).toContain('flex')
    expect(merchantList.attributes('data-recommendation-mode')).toBe('random-three')
    expect(
      merchantList
        .findAll('[data-platform-category]')
        .map((merchant) => merchant.attributes('data-testid')),
    ).toEqual(initialRecommendations)
    wrapper.unmount()
  })

  test('filters and orders from newly added platform-only merchants', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-summary"]').text()).toContain(
      '随机推荐 3 家 · 共 11 家',
    )
    await wrapper.get('[data-testid="food-delivery-category-dessert"]').trigger('click')
    await flushPromises()

    const merchantList = wrapper.get('[data-testid="food-delivery-shop-app-list"]')
    expect(router.currentRoute.value.query.category).toBe('dessert')
    expect(merchantList.text()).toContain('莓果晨光')
    expect(merchantList.text()).not.toContain('逆站洞韩牛汤饭')

    await wrapper
      .get('[data-testid="food-delivery-select-platform-merchant-platform_berry_morning"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      platformView: 'merchant',
      platformMerchant: 'platform_berry_morning',
    })
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-menu"]').text()).toContain(
      '晨光莓莓云朵杯',
    )
    await wrapper
      .get('[data-testid="food-delivery-platform-menu-add-platform_berry_morning_menu_1"]')
      .trigger('click')

    expect(store.platformCartItems[0]).toMatchObject({
      merchantId: 'platform_berry_morning',
      title: '晨光莓莓云朵杯',
    })
    wrapper.unmount()
  })

  test('gives every platform merchant five dishes with stable product-image slots', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const merchants = [
      ['platform_hanwoo_gukbap', 'hanwoo-gukbap'],
      ['platform_sushi_hana', 'sushi-hana'],
      ['platform_hwadeok_pizza', 'hwadeok-pizza'],
      ['platform_salad_day', 'salad-day'],
      ['platform_chicken_crisp', 'chicken-crisp'],
      ['platform_berry_morning', 'berry-morning'],
      ['platform_green_basket', 'green-basket'],
      ['platform_neighborhood_soup', 'camellia-noodles'],
      ['platform_golden_chicken', 'morning-bagel'],
      ['platform_nori_table', 'elm-dim-sum'],
      ['platform_corner_pizza', 'coconut-curry'],
    ]

    await wrapper.get('[data-testid="food-delivery-platform-view-all"]').trigger('click')
    for (const [merchantId, assetKey] of merchants) {
      await wrapper
        .get(`[data-testid="food-delivery-select-platform-merchant-${merchantId}"]`)
        .trigger('click')
      await flushPromises()
      const menu = wrapper.get('[data-testid="food-delivery-platform-merchant-menu"]')
      const imageSlots = menu.findAll('[data-platform-menu-image]')
      expect(imageSlots).toHaveLength(5)
      expect(imageSlots[0].classes()).toEqual(expect.arrayContaining(['h-28', 'w-28']))
      expect(imageSlots[0].attributes('data-required-asset')).toBe(
        `platform/menus/${assetKey}/menu-item-01.png`,
      )
      expect(imageSlots[4].attributes('data-required-asset')).toBe(
        `platform/menus/${assetKey}/menu-item-05.png`,
      )
      await wrapper.get('[data-testid="food-delivery-platform-merchant-back"]').trigger('click')
      await flushPromises()
    }

    wrapper.unmount()
  })

  test('auto-advances the platform banner rail and pauses after manual selection', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    const bannerRail = wrapper.get('[data-testid="food-delivery-platform-banner-rail"]')
    const bannerScroller = wrapper.get('[data-testid="food-delivery-platform-banner-scroller"]')
    const scrollTo = vi.fn()
    bannerScroller.element.scrollTo = scrollTo

    expect(bannerRail.attributes('data-active-banner-index')).toBe('0')
    expect(
      wrapper.get('[data-testid="food-delivery-platform-banner-dot-0"]').attributes('aria-current'),
    ).toBe('true')

    await vi.advanceTimersByTimeAsync(5200)
    await flushPromises()

    expect(bannerRail.attributes('data-active-banner-index')).toBe('1')
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
    expect(
      wrapper.get('[data-testid="food-delivery-platform-banner-dot-1"]').attributes('aria-current'),
    ).toBe('true')

    await wrapper.get('[data-testid="food-delivery-platform-banner-dot-2"]').trigger('click')
    expect(bannerRail.attributes('data-active-banner-index')).toBe('2')

    await vi.advanceTimersByTimeAsync(5200)
    await flushPromises()
    expect(bannerRail.attributes('data-active-banner-index')).toBe('2')
    wrapper.unmount()
  })

  test('gives platform header and banner actions visible outcomes', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="food-delivery-platform-notifications"]').trigger('click')
    expect(
      wrapper
        .get('[data-testid="food-delivery-platform-utility-sheet"]')
        .attributes('data-utility-key'),
    ).toBe('notifications')
    expect(wrapper.get('[data-testid="food-delivery-platform-utility-sheet"]').text()).toContain(
      '平台消息',
    )
    await wrapper.get('[data-testid="food-delivery-platform-utility-close"]').trigger('click')

    await wrapper.get('[data-testid="food-delivery-platform-cart"]').trigger('click')
    expect(
      wrapper
        .get('[data-testid="food-delivery-platform-utility-sheet"]')
        .attributes('data-utility-key'),
    ).toBe('cart')
    await wrapper.get('[data-testid="food-delivery-platform-utility-browse"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-shop-app-list"]').classes()).toContain('grid')

    await wrapper
      .get('[data-testid="food-delivery-platform-banner-action-club_free_delivery"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      platformView: 'campaign',
      platformCampaign: 'club_free_delivery',
    })
    expect(
      wrapper
        .get('[data-testid="food-delivery-platform-campaign-page"]')
        .attributes('data-campaign-id'),
    ).toBe('club_free_delivery')
    expect(wrapper.get('[data-testid="food-delivery-platform-campaign-membership"]').exists()).toBe(
      true,
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-campaign-hero"]').text()).toBe('')
    expect(
      wrapper.get('[data-testid="food-delivery-platform-campaign-merchants"]').text(),
    ).toContain('逆站洞韩牛汤饭')
    expect(wrapper.find('[data-testid="food-delivery-platform-benefit-feedback"]').exists()).toBe(
      false,
    )
    await wrapper.get('[data-testid="food-delivery-platform-campaign-primary"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-platform-benefit-feedback"]').text()).toContain(
      '权益已加入',
    )
    await wrapper.get('[data-testid="food-delivery-platform-campaign-back"]').trigger('click')
    await flushPromises()

    await wrapper
      .get('[data-testid="food-delivery-platform-banner-action-weekend_food_map"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      platformView: 'campaign',
      platformCampaign: 'weekend_food_map',
    })
    expect(wrapper.get('[data-testid="food-delivery-platform-campaign-lottery"]').exists()).toBe(
      true,
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-platform-campaign-hero"]')
        .attributes('data-required-asset'),
    ).toBe('platform/campaigns/weekend-lucky-draw-poster-01.png')
    expect(wrapper.get('[data-testid="food-delivery-platform-campaign-hero"]').text()).toBe('')
    expect(
      wrapper.get('[data-testid="food-delivery-platform-campaign-benefits"]').text(),
    ).toContain('三种好运')
    expect(wrapper.find('[data-testid="food-delivery-platform-campaign-prize"]').exists()).toBe(
      false,
    )
    await wrapper.get('[data-testid="food-delivery-platform-campaign-primary"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-platform-campaign-prize"]').text()).toMatch(
      /满 49 减 8|0 元配送券|甜品加赠签/,
    )
    expect(
      wrapper.get('[data-testid="food-delivery-platform-campaign-primary"]').attributes('disabled'),
    ).toBeDefined()
    await wrapper.get('[data-testid="food-delivery-platform-campaign-back"]').trigger('click')
    await flushPromises()

    await wrapper
      .get('[data-testid="food-delivery-platform-banner-action-quick_lunch"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      platformView: 'campaign',
      platformCampaign: 'quick_lunch',
    })
    expect(wrapper.get('[data-testid="food-delivery-platform-campaign-menu-guide"]').exists()).toBe(
      true,
    )
    expect(
      wrapper.get('[data-testid="food-delivery-platform-campaign-menu-picks"]').text(),
    ).toContain('GOOD AM 烟熏鸡贝果')
    await wrapper.get('[data-testid="food-delivery-platform-campaign-primary"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.platformCampaign).toBe('quick_lunch')
    expect(router.currentRoute.value.query).toMatchObject({
      platformView: 'merchant',
      platformMerchant: 'platform_salad_day',
      platformReturn: 'campaign',
    })
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-page"]').text()).toContain(
      '沙拉日记',
    )
    wrapper.unmount()
  })

  test('supports merchant favorites and functional platform navigation', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="food-delivery-platform-view-all"]').trigger('click')
    const saveButton = wrapper.get(
      '[data-testid="food-delivery-platform-save-platform_hanwoo_gukbap"]',
    )
    expect(saveButton.attributes('aria-pressed')).toBe('false')
    await saveButton.trigger('click')
    expect(saveButton.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-testid="food-delivery-platform-merchant-page"]').exists()).toBe(
      false,
    )

    await wrapper.get('[data-testid="food-delivery-platform-nav-saved"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.platformView).toBe('saved')
    expect(
      wrapper.get('[data-testid="food-delivery-platform-nav-saved"]').attributes('aria-current'),
    ).toBe('page')
    expect(wrapper.get('[data-testid="food-delivery-platform-saved-page"]').text()).toContain(
      '收藏小店',
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-saved-grid"]').text()).toContain(
      '逆站洞韩牛汤饭',
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-saved-grid"]').text()).not.toContain(
      '寿司花',
    )

    await wrapper.get('[data-testid="food-delivery-platform-page-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.platformView).toBeUndefined()
    expect(wrapper.get('[data-testid="food-delivery-platform-banner-rail"]').exists()).toBe(true)

    await wrapper.get('[data-testid="food-delivery-platform-nav-profile"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.platformView).toBe('profile')
    expect(wrapper.get('[data-testid="food-delivery-platform-profile-page"]').text()).toContain(
      '过往订单',
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-profile-services"]').text()).toContain(
      '配送与沟通',
    )
    expect(
      wrapper.get('[data-testid="food-delivery-platform-nav-profile"]').attributes('aria-current'),
    ).toBe('page')

    await wrapper.get('[data-testid="food-delivery-platform-nav-orders"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.platformView).toBe('orders')
    expect(wrapper.get('[data-testid="food-delivery-platform-orders-page"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-platform-orders-empty"]').text()).toContain(
      '还没有订单',
    )
    expect(wrapper.get('[data-asset-slot="platform-orders-empty-receipt"]').exists()).toBe(true)
    expect(
      wrapper.get('[data-asset-slot="platform-orders-empty-receipt"] img').attributes('src'),
    ).toContain('platform/orders/platform-orders-empty-receipt-01.png')
    expect(
      wrapper
        .get('[data-asset-slot="platform-orders-empty-receipt"] img')
        .attributes('data-asset-placeholder'),
    ).toBeUndefined()
    wrapper.unmount()
  })

  test('selects a delivery address from the homepage dropdown', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    const locationButton = wrapper.get('[data-testid="food-delivery-platform-location"]')
    expect(locationButton.attributes('aria-expanded')).toBe('false')

    await locationButton.trigger('click')
    expect(locationButton.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-testid="food-delivery-platform-address-menu"]').exists()).toBe(true)

    const alternateAddress = wrapper.get('[data-testid="food-delivery-platform-address-1"]')
    const addressLabel = alternateAddress.text()
    await alternateAddress.trigger('click')

    expect(locationButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-testid="food-delivery-platform-address-menu"]').exists()).toBe(false)
    expect(locationButton.text()).toContain(addressLabel)
    wrapper.unmount()
  })

  test('adds platform merchant menu items to the platform-only cart', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    await wrapper.get('[data-testid="food-delivery-platform-view-all"]').trigger('click')
    await wrapper
      .get('[data-testid="food-delivery-select-platform-merchant-platform_hanwoo_gukbap"]')
      .trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-menu"]').text()).toContain(
      '海风泡菜煎饼',
    )
    expect(wrapper.findAll('[data-platform-menu-image]')).toHaveLength(5)
    const addButton = wrapper.get(
      '[data-testid="food-delivery-platform-menu-add-platform_hanwoo_gukbap_menu_1"]',
    )
    await addButton.trigger('click')

    expect(store.platformCartQuantity).toBe(1)
    expect(wrapper.get('[data-testid="food-delivery-platform-cart-feedback"]').text()).toContain(
      '已加入购物车',
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-platform-menu-quantity-platform_hanwoo_gukbap_menu_1"]')
        .text(),
    ).toBe('1')

    await wrapper
      .get('[data-testid="food-delivery-platform-menu-increase-platform_hanwoo_gukbap_menu_1"]')
      .trigger('click')
    expect(store.platformCartQuantity).toBe(2)

    await wrapper.get('[data-testid="food-delivery-platform-menu-view-cart"]').trigger('click')
    expect(router.currentRoute.value.query.platformView).toBe('merchant')
    expect(
      wrapper
        .get('[data-testid="food-delivery-platform-utility-sheet"]')
        .attributes('data-utility-key'),
    ).toBe('cart')
    expect(
      wrapper
        .get('[data-testid="food-delivery-platform-cart-line-platform_hanwoo_gukbap_menu_1"]')
        .text(),
    ).toContain('逆站洞一号韩牛汤饭')
    expect(wrapper.get('[data-testid="food-delivery-platform-cart-total"]').text()).toContain(
      '116.00',
    )

    await wrapper
      .get('[data-testid="food-delivery-platform-cart-decrease-platform_hanwoo_gukbap_menu_1"]')
      .trigger('click')
    expect(store.platformCartQuantity).toBe(1)
    expect(
      wrapper
        .get('[data-testid="food-delivery-platform-cart-quantity-platform_hanwoo_gukbap_menu_1"]')
        .text(),
    ).toBe('1')
    expect(wrapper.get('[data-testid="food-delivery-platform-cart-count"]').text()).toBe('1')
    wrapper.unmount()
  })

  test('blocks platform checkout until the structured minimum order is met', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?platformView=merchant&platformMerchant=platform_salad_day')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper
      .get('[data-testid="food-delivery-platform-menu-add-platform_salad_day_menu_1"]')
      .trigger('click')
    await wrapper.get('[data-testid="food-delivery-platform-menu-view-cart"]').trigger('click')

    const checkoutButton = wrapper.get('[data-testid="food-delivery-platform-cart-checkout"]')
    expect(checkoutButton.attributes('disabled')).toBeDefined()
    expect(
      wrapper.get('[data-testid="food-delivery-platform-cart-minimum-order"]').text(),
    ).toContain('9,000 KRW')
    expect(router.currentRoute.value.query.platformView).toBe('merchant')

    await wrapper
      .get('[data-testid="food-delivery-platform-cart-increase-platform_salad_day_menu_1"]')
      .trigger('click')
    expect(checkoutButton.attributes('disabled')).toBeUndefined()

    await checkoutButton.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.platformView).toBe('checkout')
    wrapper.unmount()
  })

  test('quotes platform campaign menu picks in the Wallet primary currency', async () => {
    const router = createTestRouter()
    const walletStore = useWalletStore()
    walletStore.setPrimaryCurrency('EUR')
    const expectedQuote = walletStore.quoteMoney({ amountMinor: 3900, currency: 'CNY' }, 'EUR')
    await router.push('/food-delivery?platformView=campaign&platformCampaign=quick_lunch')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    expect(expectedQuote.ok).toBe(true)
    const pick = wrapper.get(
      '[data-testid="food-delivery-platform-campaign-menu-platform_salad_day-0"]',
    )
    expect(pick.text()).toContain(
      `${walletStore.formatMoneyAmount(expectedQuote.quotedMoney, { useGrouping: false })} EUR`,
    )
    expect(pick.text()).not.toContain('39.00 CNY')
    wrapper.unmount()
  })

  test('places a platform order through checkout and reopens it from the platform order list', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    await wrapper.get('[data-testid="food-delivery-platform-view-all"]').trigger('click')
    await wrapper
      .get('[data-testid="food-delivery-select-platform-merchant-platform_hanwoo_gukbap"]')
      .trigger('click')
    await flushPromises()
    await wrapper
      .get('[data-testid="food-delivery-platform-menu-add-platform_hanwoo_gukbap_menu_1"]')
      .trigger('click')
    await wrapper.get('[data-testid="food-delivery-platform-menu-view-cart"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-platform-cart-checkout"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.platformView).toBe('checkout')
    expect(wrapper.get('[data-testid="food-delivery-platform-checkout-page"]').text()).toContain(
      '确认订单',
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-checkout-total"]').text()).toContain(
      '58.00',
    )
    expect(wrapper.get('[data-asset-slot="platform-checkout-takeout-bag"]').exists()).toBe(true)
    expect(
      wrapper.get('[data-asset-slot="platform-checkout-takeout-bag"] img').attributes('src'),
    ).toContain('platform/orders/platform-checkout-takeout-bag-01.png')
    expect(
      wrapper
        .get('[data-asset-slot="platform-checkout-takeout-bag"] img')
        .attributes('data-asset-placeholder'),
    ).toBeUndefined()
    expect(wrapper.find('[data-testid="food-delivery-platform-bottom-nav"]').exists()).toBe(false)

    await wrapper.get('[data-testid="food-delivery-platform-checkout-address-1"]').trigger('click')
    await wrapper
      .get('[data-testid="food-delivery-platform-checkout-note"]')
      .setValue('少辣，放门口')
    await wrapper
      .get('[data-testid="food-delivery-platform-payment-pay_on_delivery"] input')
      .setValue()
    await wrapper.get('[data-testid="food-delivery-platform-checkout-submit"]').trigger('click')
    await flushPromises()

    const order = store.platformOrders[0]
    expect(order).toMatchObject({
      merchantId: 'platform_hanwoo_gukbap',
      note: '少辣，放门口',
      paymentMethod: 'pay_on_delivery',
      deliveryAddress: '首尔市麻浦区延南洞 223-14',
      total: '58.00',
    })
    expect(store.platformCartQuantity).toBe(0)
    expect(store.orders).toHaveLength(0)
    expect(router.currentRoute.value.query).toMatchObject({
      platformView: 'order',
      platformOrderId: order.id,
    })
    expect(wrapper.get('[data-testid="food-delivery-platform-order-success"]').text()).toContain(
      '下单成功',
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-order-summary"]').text()).toContain(
      '逆站洞一号韩牛汤饭',
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-platform-order-success"]')
        .attributes('data-order-status'),
    ).toBe('placed')
    expect(wrapper.get('[data-asset-slot="platform-order-status-placed"]').exists()).toBe(true)
    expect(
      wrapper.get('[data-asset-slot="platform-order-status-placed"] img').attributes('src'),
    ).toContain('platform/orders/platform-order-status-placed-01.png')
    expect(wrapper.find('[data-testid="food-delivery-platform-bottom-nav"]').exists()).toBe(false)

    order.status = FOOD_DELIVERY_ORDER_STATUS.COOKING
    await flushPromises()
    expect(
      wrapper
        .get('[data-testid="food-delivery-platform-order-success"]')
        .attributes('data-order-status'),
    ).toBe('cooking')
    expect(wrapper.get('[data-testid="food-delivery-platform-order-success"]').text()).toContain(
      '餐点制作中',
    )
    expect(wrapper.get('[data-asset-slot="platform-order-status-preparing"]').exists()).toBe(true)
    expect(
      wrapper.get('[data-asset-slot="platform-order-status-preparing"] img').attributes('src'),
    ).toContain('platform/orders/platform-order-status-preparing-01.png')

    for (const [status, assetKey] of [
      [FOOD_DELIVERY_ORDER_STATUS.RIDER_PICKUP, 'delivering'],
      [FOOD_DELIVERY_ORDER_STATUS.DELIVERED, 'delivered'],
      [FOOD_DELIVERY_ORDER_STATUS.CANCELLED, 'cancelled'],
    ]) {
      order.status = status
      await flushPromises()
      const statusImage = wrapper.get(`[data-asset-slot="platform-order-status-${assetKey}"] img`)
      expect(statusImage.attributes('src')).toContain(
        `platform/orders/platform-order-status-${assetKey}-01.png`,
      )
      expect(statusImage.attributes('data-asset-placeholder')).toBeUndefined()
    }

    order.status = FOOD_DELIVERY_ORDER_STATUS.COOKING
    await flushPromises()

    await wrapper.get('[data-testid="food-delivery-platform-view-orders"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.platformView).toBe('orders')
    expect(wrapper.get('[data-testid="food-delivery-platform-order-list"]').text()).toContain(
      '逆站洞韩牛汤饭',
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-order-list"]').text()).toContain(
      '制作中',
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-bottom-nav"]').exists()).toBe(true)
    expect(
      wrapper.get('[data-asset-slot="platform-merchant-mark-platform_hanwoo_gukbap"]').exists(),
    ).toBe(true)
    const merchantMark = wrapper.get(
      '[data-asset-slot="platform-merchant-mark-platform_hanwoo_gukbap"] img',
    )
    expect(merchantMark.attributes('src')).toContain(
      'platform/orders/merchant-marks/platform-merchant-mark-hanwoo-01.png',
    )
    expect(merchantMark.attributes('data-asset-placeholder')).toBeUndefined()

    await wrapper
      .get(`[data-testid="food-delivery-platform-order-card-${order.id}"]`)
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.platformOrderId).toBe(order.id)
    expect(
      wrapper.get('[data-testid="food-delivery-platform-order-id"]').attributes('data-order-id'),
    ).toBe(order.id)
    expect(wrapper.get('[data-testid="food-delivery-platform-order-id"]').text()).toMatch(
      /^FD\d{6}-[A-Z0-9]{4}$/,
    )
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    })
    await wrapper.get('[data-testid="food-delivery-platform-order-copy"]').trigger('click')
    await flushPromises()
    expect(clipboardWriteText).toHaveBeenCalledWith(
      wrapper.get('[data-testid="food-delivery-platform-order-id"]').text(),
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-order-copy"]').text()).toContain(
      '订单号已复制',
    )
    wrapper.unmount()
  })

  test('hides uninstalled Food Delivery mini apps from the folder list only', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setAppStoreMiniAppInstalled('shop_app_food_seed_moon_bistro', false)
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    expect(
      wrapper.find('[data-testid="food-delivery-shop-app-food_seed_moon_bistro"]').exists(),
    ).toBe(false)
    expect(
      wrapper.get('[data-testid="food-delivery-platform-merchant-platform_hanwoo_gukbap"]').text(),
    ).toContain('逆站洞韩牛汤饭')
    expect(wrapper.find('[data-testid="food-delivery-shop-app-empty"]').exists()).toBe(false)
    expect(store.findRestaurantById('food_seed_moon_bistro')).toBeTruthy()

    await router.push('/food-delivery?restaurantId=food_seed_moon_bistro&entry=shop')
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-store-shell"]').text()).toContain('Moon Bistro')
    expect(wrapper.find('[data-testid="food-delivery-hero-title"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-platform"]').exists()).toBe(false)
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('dark_tray_menu')
    expect(wrapper.get('[data-testid="food-delivery-store-status"]').text()).toContain('Open now')
    expect(wrapper.get('[data-testid="food-delivery-store-metrics"]').text()).toContain('32 min')
    expect(wrapper.get('[data-testid="food-delivery-store-home"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="food-delivery-store-back"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-store-support-drawer"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('uses original Food Delivery UI when the World Pack has no Food Delivery UI theme package', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    expect(systemStore.activateWorldPack('survival_city').ok).toBe(true)
    await router.push('/food-delivery?worldPack=survival_city&worldApp=survival_dispatch')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    expect(wrapper.get('[data-testid="food-delivery-hero-title"]').text()).toContain(
      'Food Delivery',
    )
    expect(wrapper.find('[data-testid="food-delivery-world-app-context"]').exists()).toBe(false)
    expect(store.orderCount).toBe(0)
    expect(store.cartQuantity).toBe(0)
    expect(wrapper.get('[data-testid="food-delivery-category-panel"]').text()).toContain(
      'Restaurants',
    )

    await wrapper.get('[data-testid="food-delivery-category-cafe"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({
      category: 'cafe',
    })
    expect(router.currentRoute.value.query.worldPack).toBeUndefined()
    expect(router.currentRoute.value.query.worldApp).toBeUndefined()
    wrapper.unmount()
  })

  test('keeps World Pack explainer out of an opened Food Delivery shop', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    expect(systemStore.activateWorldPack('survival_city').ok).toBe(true)
    await router.push(
      '/food-delivery?worldPack=survival_city&worldApp=survival_dispatch&restaurantId=food_seed_moon_bistro&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain('Moon Bistro')
    expect(wrapper.find('[data-testid="food-delivery-world-app-context"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-hero-title"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('uses original Food Delivery UI for confirmed dispatch bindings without a UI theme package', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.activateWorldPack('modern_parallel')
    const confirmed = systemStore.confirmWorldAppTemplateProposal(
      {
        templateId: 'dispatch_board',
        title: 'Rescue Desk',
        confidence: 'high',
      },
      'modern_parallel',
    )
    expect(confirmed.ok).toBe(true)

    await router.push({
      path: '/food-delivery',
      query: {
        worldPack: 'modern_parallel',
        worldApp: confirmed.binding.id,
      },
    })
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    expect(wrapper.get('[data-testid="food-delivery-hero-title"]').text()).toContain(
      'Food Delivery',
    )
    expect(wrapper.find('[data-testid="food-delivery-world-app-context"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="food-delivery-category-panel"]').text()).toContain(
      'Restaurants',
    )
    expect(store.orderCount).toBe(0)
    expect(store.cartQuantity).toBe(0)

    await wrapper.get('[data-testid="food-delivery-category-cafe"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({
      category: 'cafe',
    })
    expect(router.currentRoute.value.query.worldPack).toBeUndefined()
    expect(router.currentRoute.value.query.worldApp).toBeUndefined()
    wrapper.unmount()
  })

  test('keeps platform merchants inside the platform and opens peer shops only through shop routes', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const restaurant = store.listRestaurantsByCategory('restaurants')[0]
    const menuItem = store.listMenuByRestaurant(restaurant.id)[0]

    expect(wrapper.get('[data-testid="food-delivery-platform"]').text()).toContain('Restaurants')
    expect(wrapper.find(`[data-testid="food-delivery-shop-app-${restaurant.id}"]`).exists()).toBe(
      false,
    )
    expect(
      wrapper.get('[data-testid="food-delivery-platform-merchant-platform_hanwoo_gukbap"]').text(),
    ).toContain('逆站洞韩牛汤饭')

    await wrapper
      .get('[data-testid="food-delivery-select-platform-merchant-platform_hanwoo_gukbap"]')
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.restaurantId).toBeUndefined()
    expect(router.currentRoute.value.query).toMatchObject({
      platformView: 'merchant',
      platformMerchant: 'platform_hanwoo_gukbap',
    })
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-page"]').text()).toContain(
      '逆站洞韩牛汤饭',
    )

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${restaurant.id}&entry=shop`,
    )
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain(restaurant.name)
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-id'),
    ).toBe(restaurant.id)
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('dark_tray_menu')
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').classes()).toContain(
      'food-delivery-store-dark-tray',
    )
    expect(
      wrapper.get('[data-testid="food-delivery-store-cover"] img').attributes('src'),
    ).toContain('/images/ui-assets/apps/food-delivery/moon-bistro/cover/')
    expect(wrapper.get(`[data-testid="food-delivery-menu-tray-${menuItem.id}"]`).text()).toContain(
      menuItem.title,
    )
    expect(wrapper.get(`[data-testid="food-delivery-menu-dish-${menuItem.id}"]`).exists()).toBe(
      true,
    )
    expect(wrapper.find('[data-testid="food-delivery-store-back"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('uses App Store shop-entry presentation without changing restaurant records', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const store = useFoodDeliveryStore()
    const galleryStore = useGalleryStore()
    galleryStore.resetForTesting()
    const importedCover = galleryStore.importAssetFromUrl({
      url: 'https://example.com/moon-bistro-cover.png',
      name: 'Moon Bistro Cover',
      category: 'reference',
    })
    expect(importedCover.ok).toBe(true)
    const restaurant = store.listRestaurantsByCategory('restaurants')[0]
    expect(
      systemStore.setEntryPresentationOverride(`shop_app_${restaurant.id}`, {
        displayName: 'Moon Kitchen',
        shortDescription: 'Late night comfort menu',
        tags: 'late night, comfort',
        templateId: 'standard',
        coverGalleryAssetId: importedCover.assetId,
      }),
    ).toBe(true)

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find(`[data-testid="food-delivery-shop-app-${restaurant.id}"]`).exists()).toBe(
      false,
    )
    expect(wrapper.get('[data-testid="food-delivery-shop-app-list"]').text()).not.toContain(
      'Moon Kitchen',
    )

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${restaurant.id}&entry=shop`,
    )
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain('Moon Kitchen')
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain(
      'late night · comfort',
    )
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('standard')
    expect(wrapper.get('[data-testid="food-delivery-store-cover"] img').attributes('src')).toBe(
      'https://example.com/moon-bistro-cover.png',
    )
    expect(store.findRestaurantById(restaurant.id).name).toBe(restaurant.name)

    wrapper.unmount()
  })

  test('opens real Seoul shops as standard apps with restaurant-scoped bags', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?restaurantId=food_seed_eggdrop&entry=shop&shopView=menu',
    )
    await router.isReady()

    const store = useFoodDeliveryStore()
    const eggdropItem = store.listMenuByRestaurant('food_seed_eggdrop')[0]
    const kyochonItem = store.listMenuByRestaurant('food_seed_kyochon_chicken')[0]
    const wrapper = mount(FoodDeliveryView, { global: { plugins: [router] } })

    expect(wrapper.get('[data-testid="food-delivery-store-shell"]').attributes()).toMatchObject({
      'data-store-id': 'food_seed_eggdrop',
      'data-store-template': 'standard',
    })
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain('EGGDROP')
    expect(store.listMenuByRestaurant('food_seed_eggdrop')).toHaveLength(4)
    await wrapper.get(`[data-testid="food-delivery-add-${eggdropItem.id}"]`).trigger('click')

    await router.push(
      '/food-delivery?restaurantId=food_seed_kyochon_chicken&entry=shop&shopView=menu',
    )
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-store-shell"]').attributes()).toMatchObject({
      'data-store-id': 'food_seed_kyochon_chicken',
      'data-store-template': 'standard',
    })
    await wrapper.get(`[data-testid="food-delivery-add-${kyochonItem.id}"]`).trigger('click')

    expect(store.listCartLineItemsByRestaurant('food_seed_eggdrop')).toEqual([
      expect.objectContaining({ menuItemId: eggdropItem.id, quantity: 1 }),
    ])
    expect(store.listCartLineItemsByRestaurant('food_seed_kyochon_chicken')).toEqual([
      expect.objectContaining({ menuItemId: kyochonItem.id, quantity: 1 }),
    ])

    await router.push(
      '/food-delivery?restaurantId=food_seed_eggdrop&entry=shop&shopView=bag',
    )
    await flushPromises()
    const bag = wrapper.get('[data-testid="food-delivery-cart-panel"]')
    expect(bag.text()).toContain(eggdropItem.title)
    expect(bag.text()).not.toContain(kyochonItem.title)
    wrapper.unmount()
  })

  test('returns to the originating Home page when opened from a Home folder', async () => {
    const router = createTestRouter()
    await router.push(
      '/food-delivery?restaurantId=food_seed_peach_cloud&entry=shop&from=home&homePage=1',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    const backButton = wrapper.get('[data-testid="food-delivery-store-home"]')
    expect(backButton.text().trim()).toBe('')
    expect(backButton.attributes('aria-label')).toBe('返回手机桌面')
    await backButton.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
    expect(router.currentRoute.value.query.homePage).toBe('1')
    wrapper.unmount()
  })

  test('defaults Peach Cloud product details and order surfaces to Chinese, then follows system English', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    await router.push(
      '/food-delivery?category=dessert&restaurantId=food_seed_peach_cloud&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const itemId = 'food_menu_peach_oolong_cloud'

    expect(
      wrapper
        .get('[data-testid="food-delivery-peach-cloud-poster-white-peach-lime"]')
        .attributes('aria-label'),
    ).toBe('白桃青柠气泡新品海报, 26 CNY')
    expect(wrapper.get('[data-testid="food-delivery-store-menu-section-rail"]').text()).toContain(
      '鲜果特饮',
    )
    expect(wrapper.get('[data-testid="food-delivery-store-menu-section-rail"]').text()).toContain(
      '云顶茶咖',
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-store-menu-section-fruit_sparkle"] img')
        .attributes('data-required-asset'),
    ).toBe('peach-cloud/categories/peach-cloud-fresh-fruit.svg')

    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-menu"]').trigger('click')
    await flushPromises()
    const searchCategories = wrapper.get(
      '[data-testid="food-delivery-peach-cloud-search-categories"]',
    )
    expect(searchCategories.text()).not.toContain('全部')
    expect(searchCategories.findAll('button')).toHaveLength(5)
    expect(searchCategories.classes()).toContain('grid')
    expect(searchCategories.classes()).toContain('grid-cols-5')
    expect(searchCategories.classes()).not.toContain('overflow-x-auto')
    const fruitCategory = wrapper.get(
      '[data-testid="food-delivery-peach-cloud-search-category-fruit_sparkle"]',
    )
    expect(fruitCategory.text()).toBe('鲜果')
    expect(fruitCategory.attributes('aria-label')).toBe('鲜果特饮')
    expect(
      wrapper.get('[data-testid="food-delivery-peach-cloud-search-category-seasonal_drop"]').text(),
    ).toBe('限定')
    await wrapper
      .get('[data-testid="food-delivery-peach-cloud-search-input"]')
      .setValue('Green Grape Jasmine Fruit Tea')
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-search-page"]').text()).toContain(
      '青提茉莉鲜果茶',
    )
    await wrapper
      .get('[data-testid="food-delivery-peach-cloud-search-input"]')
      .setValue('桂花雪梨暖饮')
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-search-page"]').text()).toContain(
      '桂花雪梨暖饮',
    )
    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-home"]').trigger('click')
    await flushPromises()
    await wrapper
      .get('[data-testid="food-delivery-store-menu-section-fruit_sparkle"]')
      .trigger('click')
    await flushPromises()

    await wrapper.get(`[data-testid="food-delivery-menu-open-${itemId}"]`).trigger('click')
    await flushPromises()
    const detail = wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]')
    expect(detail.text()).toContain('白桃青柠气泡')
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-desc"]').text()).toContain(
      '天然气泡水',
    )
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-ingredients"]').text()).toContain(
      '白桃、青柠、薄荷、气泡水',
    )

    await wrapper.get('[data-testid="food-delivery-menu-detail-add"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-menu-detail-close"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-cart"]').trigger('click')
    await flushPromises()
    expect(wrapper.get(`[data-testid="food-delivery-cart-${itemId}"]`).text()).toContain(
      '白桃青柠气泡',
    )
    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-checkout-sheet"]').text()).toContain(
      '白桃青柠气泡',
    )
    await wrapper.get('[data-testid="food-delivery-checkout-submit"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-order-page"]').text()).toContain(
      '白桃青柠气泡',
    )
    expect(store.orders[0].items[0].title).toBe('White Peach Lime Sparkler')

    systemStore.settings.system.language = 'en-US'
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-order-page"]').text()).toContain(
      'White Peach Lime Sparkler',
    )
    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-home"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-store-menu-section-rail"]').text()).toContain(
      'Fresh Fruit',
    )
    await wrapper
      .get('[data-testid="food-delivery-store-menu-section-fruit_sparkle"]')
      .trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Green Grape Jasmine Fruit Tea')
    wrapper.unmount()
  })

  test('keeps user-edited Peach Cloud product fields unchanged in every system language', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const store = useFoodDeliveryStore()
    const source = store.findMenuItemById('food_menu_peach_oolong_cloud')
    store.upsertMenuItem({
      ...source,
      title: '桃云私房特调',
      desc: '店主手写的自定义说明。',
    })
    await router.push(
      '/food-delivery?category=dessert&restaurantId=food_seed_peach_cloud&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    await wrapper
      .get('[data-testid="food-delivery-store-menu-section-fruit_sparkle"]')
      .trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('桃云私房特调')
    await wrapper
      .get('[data-testid="food-delivery-menu-open-food_menu_peach_oolong_cloud"]')
      .trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]').text()).toContain(
      '店主手写的自定义说明。',
    )

    systemStore.settings.system.language = 'en-US'
    await flushPromises()
    const detail = wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]')
    expect(detail.text()).toContain('桃云私房特调')
    expect(detail.text()).toContain('店主手写的自定义说明。')
    wrapper.unmount()
  })

  test('renders reusable street, journal, cafe, and shelf structures without an All section', async () => {
    const router = createTestRouter()
    await router.push(
      '/food-delivery?category=fast_food&restaurantId=food_seed_river_noodles&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('street_food_stall')
    expect(wrapper.find('[data-testid="food-delivery-store-menu-section-all"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.get('[data-testid="food-delivery-store-menu-section-broth_noodles"]').exists(),
    ).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-store-menu-section-coolers"]').exists()).toBe(
      true,
    )
    await wrapper
      .get('[data-testid="food-delivery-store-menu-section-dry_noodles"]')
      .trigger('click')
    expect(wrapper.findAll('[data-testid^="food-delivery-menu-"][data-menu-section]')).toHaveLength(
      2,
    )

    await router.push(
      '/food-delivery?category=cafe&restaurantId=food_seed_daylight_cafe&entry=shop',
    )
    await flushPromises()
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('daypart_journal')
    expect(wrapper.find('[data-testid="food-delivery-store-menu-section-all"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.get('[data-testid="food-delivery-store-menu-section-espresso_bar"]').exists(),
    ).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-store-menu-section-bakery"]').exists()).toBe(
      true,
    )
    expect(wrapper.get('img[alt="Daylight Cafe coffee"]').classes()).not.toContain(
      'object-[68%_center]',
    )

    await wrapper
      .get('[data-testid="food-delivery-menu-open-food_menu_cafe_latte"]')
      .trigger('click')
    const daylightDetailImage = wrapper
      .get('[data-testid="food-delivery-menu-detail-sheet"]')
      .get('img')
    expect(daylightDetailImage.attributes('src')).toContain(
      'daylight-cafe/products/daylight-cafe-item-01.png',
    )
    expect(daylightDetailImage.classes()).toContain('object-contain')
    await wrapper.get('[data-testid="food-delivery-menu-detail-close"]').trigger('click')

    await router.push('/food-delivery?category=cafe&restaurantId=food_seed_harbor_roast&entry=shop')
    await flushPromises()
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('harbor_roast_chain')
    expect(wrapper.get('[data-testid="food-delivery-harbor-carousel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="food-delivery-store-menu-section-all"]').exists()).toBe(
      false,
    )
    await wrapper.get('[data-testid="food-delivery-harbor-nav-menu"]').trigger('click')
    await flushPromises()
    expect(
      wrapper.get('[data-testid="food-delivery-store-menu-section-espresso_classics"]').exists(),
    ).toBe(true)
    expect(
      wrapper.get('[data-testid="food-delivery-store-menu-section-tea_counter_bakes"]').exists(),
    ).toBe(true)

    await router.push(
      '/food-delivery?category=dessert&restaurantId=food_seed_sugar_lane&entry=shop',
    )
    await flushPromises()
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('convenience_shelf')
    expect(wrapper.find('[data-testid="food-delivery-store-menu-section-all"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.get('[data-testid="food-delivery-store-menu-section-layer_cakes"]').exists(),
    ).toBe(true)
    await wrapper
      .get('[data-testid="food-delivery-store-menu-section-pastry_case"]')
      .trigger('click')
    expect(wrapper.findAll('[data-testid^="food-delivery-menu-"][data-menu-section]')).toHaveLength(
      2,
    )
    wrapper.unmount()
  })

  test('applies the reusable mosaic template to another restaurant without brand leakage', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    expect(
      systemStore.setEntryPresentationOverride('shop_app_food_seed_moon_bistro', {
        templateId: 'menu_mosaic',
      }),
    ).toBe(true)
    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_moon_bistro&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    const shell = wrapper.get('[data-testid="food-delivery-store-shell"]')
    expect(shell.attributes('data-store-template')).toBe('menu_mosaic')
    expect(shell.text()).toContain('Moon Bistro')
    expect(shell.text()).not.toContain('Daylight Cafe')
    expect(shell.text()).not.toContain('Harbor Roast')
    expect(wrapper.find('[data-testid="food-delivery-store-menu-section-all"]').exists()).toBe(
      false,
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-store-menu-items"]')
        .attributes('data-active-section'),
    ).not.toBe('all')
    wrapper.unmount()
  })

  test('creates a local food delivery order from menu actions', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const mapStore = useMapStore()
    mapStore.setCurrentLocation({
      label: 'Studio',
      detail: 'Studio Street 9',
      source: 'test',
    })
    await flushPromises()
    const activeRestaurant = store.listRestaurantsByCategory('restaurants')[0]
    const menuItem = store.listMenuByRestaurant(activeRestaurant.id)[0]

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${activeRestaurant.id}&entry=shop`,
    )
    await flushPromises()

    expect(wrapper.find('[data-testid="food-delivery-map-handoff-address"]').exists()).toBe(false)

    await wrapper.get(`[data-testid="food-delivery-add-${menuItem.id}"]`).trigger('click')
    await flushPromises()

    expect(store.cartQuantity).toBe(1)
    expect(wrapper.get(`[data-testid="food-delivery-cart-${menuItem.id}"]`).text()).toContain(
      menuItem.title,
    )

    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    await flushPromises()

    expect(store.orderCount).toBe(0)
    expect(wrapper.get('[data-testid="food-delivery-checkout-sheet"]').text()).toContain(
      activeRestaurant.name,
    )
    expect(wrapper.get('[data-testid="food-delivery-checkout-sheet"]').text()).toContain(
      'Studio Street 9',
    )
    expect(
      wrapper.get(`[data-testid="food-delivery-checkout-line-${menuItem.id}"]`).text(),
    ).toContain(menuItem.title)

    await wrapper.get('[data-testid="food-delivery-checkout-submit"]').trigger('click')
    await flushPromises()

    expect(store.orderCount).toBe(1)
    expect(wrapper.get('[data-testid="food-delivery-store-support-drawer"]').element.open).toBe(
      false,
    )
    expect(store.orders[0]).toMatchObject({
      restaurantId: activeRestaurant.id,
      restaurantName: activeRestaurant.name,
      itemCount: 1,
      deliveryAddress: 'Studio Street 9',
      sourceModule: 'food_delivery_map_courier_route',
      sourceId: `map_food_delivery_${activeRestaurant.id}`,
    })
    expect(wrapper.get('[data-testid="food-delivery-orders-panel"]').text()).toContain(
      activeRestaurant.name,
    )

    await router.push('/food-delivery?category=restaurants')
    await flushPromises()

    expect(wrapper.find('[data-testid="food-delivery-orders-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-wallet-suggestions"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('shows active food prices with the Wallet primary currency', async () => {
    const router = createTestRouter()
    const walletStore = useWalletStore()
    walletStore.setPrimaryCurrency('eur')
    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_moon_bistro&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const restaurant = store.findRestaurantById('food_seed_moon_bistro')
    const menuItem = store.listMenuByRestaurant(restaurant.id)[0]
    const sourceMenuItem = store.menuItems.find((item) => item.id === menuItem.id)
    const expectedQuote = walletStore.quoteMoney(
      { amountMinor: sourceMenuItem.priceCents, currency: sourceMenuItem.currency },
      'EUR',
    )
    await flushPromises()

    expect(store.primaryCurrency).toBe('EUR')
    expect(expectedQuote.ok).toBe(true)
    expect(menuItem).toMatchObject({
      sourcePriceCents: sourceMenuItem.priceCents,
      sourceCurrency: 'CNY',
      priceCents: expectedQuote.quotedMoney.amountMinor,
      currency: 'EUR',
    })
    expect(menuItem.priceCents).not.toBe(sourceMenuItem.priceCents)
    expect(wrapper.get(`[data-testid="food-delivery-menu-tray-${menuItem.id}"]`).text()).toContain(
      'EUR',
    )

    await wrapper.get(`[data-testid="food-delivery-add-${menuItem.id}"]`).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-cart-panel"]').text()).toContain('EUR')
    expect(store.cartPrimaryTotal.currency).toBe('EUR')
    expect(store.cartLineItems[0]).toMatchObject({
      sourceUnitPriceCents: sourceMenuItem.priceCents,
      sourceCurrency: 'CNY',
      currency: 'EUR',
    })
    wrapper.unmount()
  })

  test('opens menu item details and edits only that item copy and image', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const galleryStore = useGalleryStore()
    systemStore.settings.system.language = 'en-US'
    galleryStore.resetForTesting()
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const restaurant = store.listRestaurantsByCategory('restaurants')[0]
    const menuItem = store.listMenuByRestaurant(restaurant.id)[0]

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${restaurant.id}&entry=shop`,
    )
    await flushPromises()
    await wrapper.get(`[data-testid="food-delivery-menu-open-${menuItem.id}"]`).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]').text()).toContain(
      menuItem.title,
    )
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-desc"]').exists()).toBe(true)

    await wrapper.get('[data-testid="food-delivery-menu-detail-add"]').trigger('click')
    expect(store.cartQuantity).toBe(1)

    await wrapper.get('[data-testid="food-delivery-menu-detail-edit"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-menu-edit-title"]').setValue('Edited Lunar Rice')
    await wrapper
      .get('[data-testid="food-delivery-menu-edit-desc"]')
      .setValue('A warmer bowl for the current scene.')
    await wrapper
      .get('[data-testid="food-delivery-menu-edit-ingredients"]')
      .setValue('rice, egg, greens')
    await wrapper.get('[data-testid="food-delivery-menu-edit-image-source"]').setValue('url')
    await wrapper
      .get('[data-testid="food-delivery-menu-edit-image-url"]')
      .setValue('https://example.com/lunar-rice.png')
    await wrapper.get('[data-testid="food-delivery-menu-edit-save"]').trigger('click')
    await flushPromises()

    const editedMenuItem = store.findMenuItemById(menuItem.id)
    expect(editedMenuItem).toMatchObject({
      id: menuItem.id,
      restaurantId: restaurant.id,
      title: 'Edited Lunar Rice',
      desc: 'A warmer bowl for the current scene.',
      ingredients: 'rice, egg, greens',
      image: {
        sourceType: 'url',
        url: 'https://example.com/lunar-rice.png',
      },
    })
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]').text()).toContain(
      'Edited Lunar Rice',
    )
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-ingredients"]').text()).toContain(
      'rice, egg, greens',
    )
    expect(wrapper.get(`[data-testid="food-delivery-menu-tray-${menuItem.id}"]`).text()).toContain(
      'Edited Lunar Rice',
    )
    expect(
      wrapper.get(`[data-testid="food-delivery-menu-dish-${menuItem.id}"] img`).attributes('src'),
    ).toBe('https://example.com/lunar-rice.png')
    wrapper.unmount()
  })

  test('uses the dark tray detail sheet with embedded dish image and quantity add', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const restaurant = store.findRestaurantById('food_seed_moon_bistro')
    const menuItem = store.listMenuByRestaurant(restaurant.id)[0]

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${restaurant.id}&entry=shop`,
    )
    await flushPromises()
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('dark_tray_menu')
    expect(wrapper.get(`[data-testid="food-delivery-menu-tray-${menuItem.id}"]`).text()).toContain(
      menuItem.desc,
    )
    expect(
      wrapper.get(`[data-testid="food-delivery-menu-tray-${menuItem.id}"]`).text(),
    ).not.toContain('Default icon')

    await wrapper.get(`[data-testid="food-delivery-menu-open-${menuItem.id}"]`).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-menu-detail-round-image"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-edit"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-quantity"]').text()).toContain('1')

    await wrapper
      .get('[data-testid="food-delivery-menu-detail-quantity-increase"]')
      .trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-quantity"]').text()).toContain('2')
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-total"]').text()).toContain(
      ((menuItem.priceCents * 2) / 100).toFixed(2),
    )

    await wrapper.get('[data-testid="food-delivery-menu-detail-add"]').trigger('click')
    expect(store.cartQuantity).toBe(2)
    wrapper.unmount()
  })

  test('filters the dark tray store menu through the side section rail', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const restaurant = store.findRestaurantById('food_seed_moon_bistro')
    const pastaItems = store
      .listMenuByRestaurant(restaurant.id)
      .filter((item) => item.menuSection === 'pasta')
    const soupItems = store
      .listMenuByRestaurant(restaurant.id)
      .filter((item) => item.menuSection === 'warm_soup')
    expect(pastaItems.length).toBeGreaterThan(0)
    expect(soupItems.length).toBeGreaterThan(0)

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${restaurant.id}&entry=shop`,
    )
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-store-menu-section-rail"]').exists()).toBe(true)
    await wrapper.get('[data-testid="food-delivery-store-menu-section-pasta"]').trigger('click')
    await flushPromises()

    const menuItems = wrapper.findAll('[data-testid^="food-delivery-menu-"][data-menu-section]')
    expect(menuItems).toHaveLength(pastaItems.length)
    menuItems.forEach((item) => {
      expect(item.attributes('data-menu-section')).toBe('pasta')
    })
    expect(wrapper.find(`[data-testid="food-delivery-menu-${soupItems[0].id}"]`).exists()).toBe(
      false,
    )

    await wrapper
      .get(`[data-testid="food-delivery-menu-open-${pastaItems[0].id}"]`)
      .trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]').text()).toContain(
      pastaItems[0].title,
    )

    wrapper.unmount()
  })

  test('renders Peach Cloud as a distinct dessert-window app with working browse and quantity cart actions', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const walletStore = useWalletStore()
    const store = useFoodDeliveryStore()
    const otherSeasonalIndex = store.menuItems.findIndex(
      (item) =>
        item.restaurantId === 'food_seed_peach_cloud' &&
        item.menuSection === 'seasonal_drop' &&
        item.id !== 'food_menu_peach_golden_hour_set',
    )
    expect(otherSeasonalIndex).toBeGreaterThanOrEqual(0)
    const [otherSeasonalItem] = store.menuItems.splice(otherSeasonalIndex, 1)
    store.menuItems.unshift(otherSeasonalItem)
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?category=dessert&restaurantId=food_seed_peach_cloud&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const peachCloudMenu = store.listMenuByRestaurant('food_seed_peach_cloud')
    const teaItem = peachCloudMenu.find((item) => item.menuSection === 'cloud_tea')
    const posterItem = peachCloudMenu.find((item) => item.id === 'food_menu_peach_oolong_cloud')
    const pairingItem = peachCloudMenu.find((item) => item.id === 'food_menu_peach_golden_hour_set')
    const peachCloudView = wrapper.get('[data-testid="food-delivery-view"]')

    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('dessert_window')
    expect(peachCloudView.element.style.getPropertyValue('--peach-cloud-iron')).toBe('#444545')
    expect(peachCloudView.element.style.getPropertyValue('--peach-cloud-ink')).toBe('#2b303a')
    expect(peachCloudView.element.style.getPropertyValue('--peach-cloud-canvas')).toBe('#f2fbe0')
    expect(peachCloudView.element.style.getPropertyValue('--peach-cloud-accent')).toBe('#fd6c93')
    expect(peachCloudView.element.style.getPropertyValue('--peach-cloud-mist')).toBe('#fda1b8')
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').classes()).toContain(
      'food-delivery-store-peach-cloud',
    )
    expect(
      wrapper.get('[data-testid="food-delivery-peach-cloud-home-poster-stage"]').exists(),
    ).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-brand-hero"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-hero-cover"]').exists()).toBe(true)
    expect(
      wrapper
        .get('[data-testid="food-delivery-peach-cloud-hero-cover"] img')
        .attributes('data-required-asset'),
    ).toBe('peach-cloud/cover/peach-cloud-hero-01.png')
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-brand-hero"]').classes()).toContain(
      'aspect-[3/2]',
    )
    expect(wrapper.find('[data-testid="food-delivery-menu-panel"]').exists()).toBe(false)
    expect(
      wrapper
        .get('[data-testid="food-delivery-peach-cloud-header-profile"] img')
        .attributes('data-required-asset'),
    ).toBe('peach-cloud/brand/peach-cloud-mark-01.svg')
    expect(wrapper.findAll('[data-testid^="food-delivery-menu-"][data-menu-section]')).toHaveLength(
      0,
    )
    const productAssetPaths = wrapper
      .findAll('img[data-required-asset^="peach-cloud/products/peach-cloud-item-"]')
      .map((image) => image.attributes('data-required-asset'))
    expect(productAssetPaths).toHaveLength(0)
    expect(
      wrapper.findAll(
        '[data-testid="food-delivery-peach-cloud-campaigns"] button[data-testid^="food-delivery-peach-cloud-poster-"]',
      ),
    ).toHaveLength(3)
    expect(
      wrapper.findAll('[data-testid^="food-delivery-peach-cloud-carousel-previous-"]'),
    ).toHaveLength(3)
    expect(
      wrapper.findAll('[data-testid^="food-delivery-peach-cloud-carousel-next-"]'),
    ).toHaveLength(3)
    const posterAssetPaths = wrapper
      .findAll('img[data-required-asset^="peach-cloud/promotions/posters/"]')
      .map((image) => image.attributes('data-required-asset'))
    expect(posterAssetPaths).toEqual([
      'peach-cloud/promotions/posters/peach-cloud-poster-white-peach-lime-dynamic-price-pilot-01.png',
      'peach-cloud/promotions/posters/peach-cloud-poster-waxberry-lychee-01.png',
      'peach-cloud/promotions/posters/peach-cloud-poster-mascot-plush-01.png',
    ])
    const posterPrice = wrapper.get(
      '[data-testid="food-delivery-peach-cloud-poster-price-white-peach-lime"]',
    )
    expect(posterPrice.text()).toContain('26')
    expect(posterPrice.text()).toContain('CNY')
    expect(posterPrice.attributes('data-price-source-currency')).toBe('CNY')

    walletStore.setPrimaryCurrency('EUR')
    await flushPromises()
    expect(posterPrice.text()).toContain('3.34')
    expect(posterPrice.text()).toContain('EUR')

    walletStore.setPrimaryCurrency('KRW')
    await flushPromises()
    expect(posterPrice.text()).toContain('5015')
    expect(posterPrice.text()).toContain('KRW')

    walletStore.setPrimaryCurrency('CRD')
    await flushPromises()
    expect(posterPrice.text()).toContain('26')
    expect(posterPrice.text()).toContain('CNY')
    expect(posterPrice.text()).not.toContain('CRD')

    walletStore.setPrimaryCurrency('CNY')
    await flushPromises()
    expect(posterPrice.text()).toContain('26')

    expect(wrapper.find('[data-testid="food-delivery-peach-cloud-featured"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-nav"]').exists()).toBe(true)

    await wrapper
      .get('[data-testid="food-delivery-store-menu-section-fruit_sparkle"]')
      .trigger('click')
    await flushPromises()
    expect(
      wrapper.find('[data-testid="food-delivery-peach-cloud-home-poster-stage"]').exists(),
    ).toBe(false)
    expect(wrapper.get('[data-testid="food-delivery-menu-panel"]').exists()).toBe(true)
    expect(
      wrapper
        .get('[data-testid="food-delivery-store-menu-items"]')
        .attributes('data-active-section'),
    ).toBe('fruit_sparkle')
    expect(wrapper.findAll('[data-testid^="food-delivery-menu-"][data-menu-section]')).toHaveLength(
      5,
    )
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-clear-filter"]').text()).toContain(
      'Posters',
    )
    await wrapper.get('[data-testid="food-delivery-peach-cloud-clear-filter"]').trigger('click')
    await flushPromises()
    expect(
      wrapper.get('[data-testid="food-delivery-peach-cloud-home-poster-stage"]').exists(),
    ).toBe(true)
    expect(wrapper.find('[data-testid="food-delivery-menu-panel"]').exists()).toBe(false)
    expect(
      wrapper.findAll(
        '[data-testid="food-delivery-peach-cloud-campaigns"] button[data-testid^="food-delivery-peach-cloud-poster-"]',
      ),
    ).toHaveLength(3)

    await wrapper
      .get('[data-testid="food-delivery-peach-cloud-carousel-next-white-peach-lime"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBeUndefined()
    expect(wrapper.find('[data-testid="food-delivery-peach-cloud-campaign-page"]').exists()).toBe(
      false,
    )

    await wrapper
      .get('[data-testid="food-delivery-peach-cloud-poster-white-peach-lime"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('campaign')
    expect(router.currentRoute.value.query.shopCampaign).toBe('white-peach-lime')
    expect(wrapper.find('[data-testid="food-delivery-menu-detail-sheet"]').exists()).toBe(false)
    expect(
      wrapper
        .get('[data-testid="food-delivery-peach-cloud-campaign-page"]')
        .attributes('data-campaign-key'),
    ).toBe('white-peach-lime')
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-campaign-page"]').text()).toContain(
      posterItem.title,
    )
    expect(
      wrapper
        .findAll(
          '[data-testid="food-delivery-peach-cloud-campaign-page"] img[data-required-asset^="peach-cloud/campaigns/"]',
        )
        .map((image) => image.attributes('data-required-asset')),
    ).toEqual([
      'peach-cloud/campaigns/peach-cloud-white-peach-lime-campaign-hero-01.webp',
      'peach-cloud/campaigns/peach-cloud-white-peach-lime-campaign-bubbles-01.webp',
      'peach-cloud/campaigns/peach-cloud-white-peach-lime-campaign-ingredients-01.webp',
    ])
    expect(
      wrapper.get('[data-testid="food-delivery-peach-cloud-campaign-price"]').text(),
    ).toContain('26')
    await wrapper.get('[data-testid="food-delivery-peach-cloud-campaign-order"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]').text()).toContain(
      posterItem.title,
    )
    await wrapper.get('[data-testid="food-delivery-menu-detail-close"]').trigger('click')

    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-cart"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('bag')
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-bag-page"]').text()).toContain(
      'Your bag feels light',
    )
    expect(wrapper.find('[data-testid="food-delivery-peach-cloud-featured"]').exists()).toBe(false)

    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-menu"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('search')
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-search-page"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-search-input"]').exists()).toBe(
      true,
    )

    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-home"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBeUndefined()

    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-discover"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('new')
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-new-page"]').text()).toContain(
      'New release gallery',
    )
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-new-page"]').text()).not.toContain(
      'Pick your cloud size',
    )
    expect(wrapper.findAll('[data-testid^="food-delivery-peach-cloud-new-poster-"]')).toHaveLength(
      3,
    )
    const newPagePosterPrice = wrapper.get(
      '[data-testid="food-delivery-peach-cloud-new-price-white-peach-lime"]',
    )
    expect(newPagePosterPrice.text()).toContain('26')
    expect(newPagePosterPrice.text()).toContain('CNY')
    expect(newPagePosterPrice.attributes('data-price-source-currency')).toBe('CNY')
    expect(
      wrapper.find('[data-testid="food-delivery-menu-food_menu_peach_golden_hour_set"]').exists(),
    ).toBe(false)
    expect(
      wrapper.findAll(
        '[data-testid="food-delivery-peach-cloud-new-page"] [data-testid^="food-delivery-menu-"][data-menu-section]',
      ),
    ).toHaveLength(0)

    await wrapper
      .get('[data-testid="food-delivery-peach-cloud-new-poster-waxberry-lychee"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('campaign')
    expect(router.currentRoute.value.query.shopCampaign).toBe('waxberry-lychee')
    expect(
      wrapper
        .get('[data-testid="food-delivery-peach-cloud-campaign-page"]')
        .attributes('data-campaign-key'),
    ).toBe('waxberry-lychee')
    expect(
      wrapper
        .findAll(
          '[data-testid="food-delivery-peach-cloud-campaign-page"] img[data-required-asset^="peach-cloud/campaigns/"]',
        )
        .map((image) => image.attributes('data-required-asset')),
    ).toEqual([
      'peach-cloud/campaigns/peach-cloud-waxberry-lychee-campaign-hero-01.webp',
      'peach-cloud/campaigns/peach-cloud-waxberry-lychee-campaign-ice-01.webp',
      'peach-cloud/campaigns/peach-cloud-waxberry-lychee-campaign-ingredients-01.webp',
    ])
    await wrapper.get('[data-testid="food-delivery-peach-cloud-campaign-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('new')
    expect(router.currentRoute.value.query.shopCampaign).toBeUndefined()

    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-featured"]').text()).toContain(
      pairingItem.title,
    )
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-featured"]').text()).toContain(
      '48.00',
    )
    const promotionImage = wrapper.get('[data-testid="food-delivery-peach-cloud-promotion-image"]')
    expect(promotionImage.attributes('data-required-asset')).toBe(
      'peach-cloud/promotions/peach-cloud-golden-pairing-01.png',
    )
    expect(promotionImage.classes()).toContain('object-contain')
    await wrapper.get('[data-testid="food-delivery-peach-cloud-featured-action"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('new')
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]').text()).toContain(
      pairingItem.title,
    )
    await wrapper.get('[data-testid="food-delivery-menu-detail-close"]').trigger('click')

    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-home"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="food-delivery-store-menu-section-cloud_tea"]').trigger('click')
    await flushPromises()
    await wrapper.get(`[data-testid="food-delivery-menu-open-${teaItem.id}"]`).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]').text()).toContain(
      teaItem.title,
    )
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-quantity"]').text()).toContain('1')
    await wrapper
      .get('[data-testid="food-delivery-menu-detail-quantity-increase"]')
      .trigger('click')
    await wrapper.get('[data-testid="food-delivery-menu-detail-add"]').trigger('click')

    expect(store.cartQuantity).toBe(2)
    await wrapper.get('[data-testid="food-delivery-menu-detail-close"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-cart"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('bag')
    expect(wrapper.get('[data-testid="food-delivery-cart-panel"]').text()).toContain(teaItem.title)
    expect(wrapper.find('[data-testid="food-delivery-peach-cloud-search-page"]').exists()).toBe(
      false,
    )
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-nav"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('routes Peach Cloud membership and mascot goods separately from new releases', async () => {
    const router = createTestRouter()
    await router.push(
      '/food-delivery?category=dessert&restaurantId=food_seed_peach_cloud&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    await wrapper.get('[data-testid="food-delivery-peach-cloud-home-club"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('club')
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-club-page"]').text()).toContain(
      '桃子会本月礼遇',
    )

    await wrapper
      .get('[data-testid="food-delivery-peach-cloud-club-merch-action"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('merch')
    expect(wrapper.findAll('[data-testid^="food-delivery-peach-cloud-merch-peach_"]')).toHaveLength(
      3,
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-peach-cloud-merch-campaign-image"]')
        .attributes('data-required-asset'),
    ).toBe('peach-cloud/promotions/peach-cloud-mascot-market-01.png')
    const merchHeroCopy = wrapper.get('[data-testid="food-delivery-peach-cloud-merch-hero-copy"]')
    expect(merchHeroCopy.classes()).not.toContain('w-[48%]')
    expect(merchHeroCopy.classes()).not.toContain('bg-[var(--peach-cloud-accent)]/92')

    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-home"]').trigger('click')
    await flushPromises()
    await wrapper
      .get('[data-testid="food-delivery-peach-cloud-poster-mascot-plush"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('merch')
    expect(router.currentRoute.value.query.shopCampaign).toBeUndefined()

    await wrapper
      .get('[data-testid="food-delivery-peach-cloud-add-merch-peach_merch_cloud_plush"]')
      .trigger('click')
    expect(store.listCartLineItemsByRestaurant('food_seed_peach_cloud')).toEqual([
      expect.objectContaining({
        lineKind: 'merchandise',
        merchandiseId: 'peach_merch_cloud_plush',
      }),
    ])
    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-cart"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-bag-page"]').text()).toContain(
      '桃气云朵毛绒',
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-cart-peach_merch_cloud_plush__purchase"] img')
        .attributes('data-required-asset'),
    ).toBe('peach-cloud/merchandise/peach-cloud-merch-plush-01.png')
    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-checkout-sheet"]').text()).toContain(
      '桃气云朵毛绒',
    )
    wrapper.unmount()
  })

  test('localizes every built-in Dash Grill menu field without rewriting user copy', async () => {
    const store = useFoodDeliveryStore()
    const dashMenu = store.listMenuByRestaurant('food_seed_dash_grill')

    expect(dashMenu).toHaveLength(10)
    expect(Object.keys(DASH_GRILL_MENU_COPY_BY_ID)).toHaveLength(10)
    dashMenu.forEach((item) => {
      const copy = DASH_GRILL_MENU_COPY_BY_ID[item.id]
      expect(resolveDashGrillMenuItemCopy(item, 'zh-CN')).toMatchObject({
        title: copy.title.zh,
        desc: copy.desc.zh,
        ingredients: copy.ingredients.zh,
        image: expect.objectContaining({ alt: copy.imageAlt.zh }),
      })
      expect(resolveDashGrillMenuItemCopy(item, 'en-US')).toMatchObject({
        title: copy.title.en,
        desc: copy.desc.en,
        ingredients: copy.ingredients.en,
        image: expect.objectContaining({ alt: copy.imageAlt.en }),
      })
    })

    const shake = store.findMenuItemById('food_menu_dash_vanilla_shake')
    expect(getDashGrillMenuSearchValues(shake)).toEqual(
      expect.arrayContaining(['香草云奶昔', 'Vanilla Cloud Shake']),
    )
    expect(
      resolveDashGrillMenuItemCopy(
        {
          ...shake,
          title: '我的限定奶昔',
          desc: '用户自己写的介绍',
          ingredients: '用户自选配料',
          image: { ...shake.image, alt: '用户上传的奶昔照片' },
        },
        'en-US',
      ),
    ).toMatchObject({
      title: '我的限定奶昔',
      desc: '用户自己写的介绍',
      ingredients: '用户自选配料',
      image: expect.objectContaining({ alt: '用户上传的奶昔照片' }),
    })

    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'zh-CN'
    await router.push(
      '/food-delivery?category=fast_food&restaurantId=food_seed_dash_grill&entry=shop&shopView=menu',
    )
    await router.isReady()
    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper
      .get('[data-testid="food-delivery-quick-service-search"]')
      .setValue('Smoky BBQ Stack')
    expect(
      wrapper
        .get('[data-testid="food-delivery-dash-ticket-food_menu_dash_smoky_bbq_stack"]')
        .text(),
    ).toContain('烟熏烧烤牛肉堡')
    systemStore.settings.system.language = 'en-US'
    await flushPromises()
    expect(
      wrapper
        .get('[data-testid="food-delivery-dash-ticket-food_menu_dash_smoky_bbq_stack"]')
        .text(),
    ).toContain('Smoky BBQ Stack')
    wrapper.unmount()
  })

  test('resolves Dash Grill as a quick-service app with route-driven menu, deals, bag, and orders pages', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?category=fast_food&restaurantId=food_seed_dash_grill&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    expect(store.listMenuByRestaurant('food_seed_dash_grill')).toHaveLength(10)
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('quick_service_chain')
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').classes()).toContain(
      'food-delivery-store-quick-service',
    )
    expect(wrapper.get('[data-testid="food-delivery-quick-service-home"]').text()).toContain(
      'BUILT FAST. SERVED HOT.',
    )

    await wrapper.get('[data-testid="food-delivery-quick-service-nav-menu"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('menu')
    expect(wrapper.get('[data-testid="food-delivery-quick-service-menu-page"]').exists()).toBe(true)
    const featuredDashItem = store
      .listMenuByRestaurant('food_seed_dash_grill')
      .find((item) => item.menuSection === 'featured')
    const drinksDashItem = store
      .listMenuByRestaurant('food_seed_dash_grill')
      .find((item) => item.menuSection === 'drinks')
    expect(
      wrapper
        .get(`[data-testid="food-delivery-dash-ticket-${featuredDashItem.id}"]`)
        .attributes('data-menu-card-style'),
    ).toBe('order-ticket')
    expect(
      wrapper
        .get('[data-testid="food-delivery-store-menu-section-featured"]')
        .attributes('aria-pressed'),
    ).toBe('true')
    expect(wrapper.find('[data-testid="food-delivery-store-menu-section-all"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.get('[data-testid="food-delivery-store-menu-section-rail"]').attributes('tabindex'),
    ).toBe('0')
    await wrapper
      .get('[data-testid="food-delivery-quick-service-search"]')
      .setValue(drinksDashItem.title)
    expect(
      wrapper.get(`[data-testid="food-delivery-dash-ticket-${drinksDashItem.id}"]`).text(),
    ).toContain('Add to order')
    await wrapper.get('[data-testid="food-delivery-store-menu-section-drinks"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-quick-service-search"]').element.value).toBe('')
    expect(
      wrapper
        .get('[data-testid="food-delivery-store-menu-section-drinks"]')
        .attributes('aria-pressed'),
    ).toBe('true')

    await wrapper.get('[data-testid="food-delivery-quick-service-nav-deals"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('deals')
    expect(wrapper.get('[data-testid="food-delivery-quick-service-deals-page"]').text()).toContain(
      'MORE BITE FOR YOUR BUCK',
    )

    await wrapper.get('[data-testid="food-delivery-quick-service-nav-bag"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('bag')
    expect(wrapper.get('[data-testid="food-delivery-quick-service-bag-page"]').text()).toContain(
      'Your bag is waiting',
    )

    await wrapper.get('[data-testid="food-delivery-quick-service-nav-orders"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('orders')
    expect(wrapper.get('[data-testid="food-delivery-quick-service-orders-page"]').text()).toContain(
      'No Dash orders yet',
    )

    await wrapper.get('[data-testid="food-delivery-quick-service-nav-home"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBeUndefined()
    expect(wrapper.get('[data-testid="food-delivery-quick-service-home"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('adds a chosen Dash Grill quantity and opens the submitted Dash order route', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?category=fast_food&restaurantId=food_seed_dash_grill&entry=shop&shopView=menu',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const dashItem = store.findMenuItemById('food_menu_dash_double_stack')

    for (const [menuItemId, assetPath] of [
      [
        'food_menu_dash_double_stack',
        'dash-grill/combos/dash-grill-double-stack-combo-01.png',
      ],
      [
        'food_menu_dash_golden_chicken_stack',
        'dash-grill/combos/dash-grill-golden-chicken-combo-01.png',
      ],
    ]) {
      await wrapper.get(`[data-testid="food-delivery-menu-open-${menuItemId}"]`).trigger('click')
      await flushPromises()
      const trayImage = wrapper.get(
        '[data-testid="food-delivery-menu-detail-sheet"] [data-asset-role="combo-tray"]',
      )
      expect(trayImage.attributes('data-required-asset')).toBe(assetPath)
      expect(trayImage.attributes('src')).toContain(assetPath)
      await wrapper.get('[data-testid="food-delivery-menu-detail-close"]').trigger('click')
    }

    await wrapper.get(`[data-testid="food-delivery-menu-open-${dashItem.id}"]`).trigger('click')
    await flushPromises()
    expect(
      wrapper
        .get('[data-testid="food-delivery-dash-detail-ticket"]')
        .attributes('data-detail-layout'),
    ).toBe('tray-ticket')
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]').text()).toContain(
      'Main fixed · choose one side and one drink',
    )
    expect(wrapper.get('[data-testid="food-delivery-dash-selection-progress"]').text()).toContain(
      '2/2',
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-dash-combo-side-sea_salt_fries"] img')
        .attributes('data-required-asset'),
    ).toBe('dash-grill/products/dash-grill-item-06.png')
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-total"]').text()).toContain(
      '39.00 CNY',
    )
    await wrapper
      .get('[data-testid="food-delivery-dash-combo-side-loaded_cheese_fries"]')
      .trigger('click')
    await wrapper
      .get('[data-testid="food-delivery-dash-combo-drink-vanilla_cloud_shake"]')
      .trigger('click')
    expect(
      wrapper
        .get('[data-testid="food-delivery-dash-combo-drink-vanilla_cloud_shake"] img')
        .attributes('data-required-asset'),
    ).toBe('dash-grill/products/dash-grill-item-09.png')
    expect(
      wrapper
        .get('[data-testid="food-delivery-menu-detail-sheet"] [data-asset-role="combo-main"]')
        .attributes('data-required-asset'),
    ).toBe('dash-grill/products/dash-grill-item-01.png')
    expect(
      wrapper
        .find('[data-testid="food-delivery-menu-detail-sheet"] [data-asset-role="combo-tray"]')
        .exists(),
    ).toBe(false)
    expect(wrapper.get('[data-testid="food-delivery-dash-selection-summary"]').text()).toContain(
      'Loaded Cheese Fries · Vanilla Cloud Shake',
    )
    expect(wrapper.get('[data-testid="food-delivery-dash-footer-selection"]').text()).toContain(
      'Loaded Cheese Fries · Vanilla Cloud Shake',
    )
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-total"]').text()).toContain(
      '56.00 CNY',
    )
    await wrapper
      .get('[data-testid="food-delivery-menu-detail-quantity-increase"]')
      .trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-total"]').text()).toContain(
      '112.00 CNY',
    )
    await wrapper.get('[data-testid="food-delivery-menu-detail-add"]').trigger('click')

    expect(store.cartRestaurant.id).toBe('food_seed_dash_grill')
    expect(store.cartLineItems).toEqual([
      expect.objectContaining({
        menuItemId: dashItem.id,
        quantity: 2,
        unitPriceCents: 5600,
        selectionKey: 'combo:loaded_cheese_fries:vanilla_cloud_shake',
        selection: expect.objectContaining({
          comboSide: 'loaded_cheese_fries',
          comboDrink: 'vanilla_cloud_shake',
        }),
      }),
    ])

    await wrapper.get('[data-testid="food-delivery-menu-detail-close"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-quick-service-header-bag"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-cart-panel"]').text()).toContain(
      'Loaded Cheese Fries · Vanilla Cloud Shake',
    )

    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-checkout-sheet"]').text()).toContain(
      'Dash Grill',
    )
    expect(wrapper.get('[data-testid="food-delivery-checkout-sheet"]').text()).toContain(
      'Loaded Cheese Fries · Vanilla Cloud Shake',
    )
    await wrapper.get('[data-testid="food-delivery-checkout-submit"]').trigger('click')
    await flushPromises()

    const order = store.orders[0]
    expect(order).toMatchObject({
      restaurantId: 'food_seed_dash_grill',
      restaurantName: 'Dash Grill',
      itemCount: 2,
      items: [
        expect.objectContaining({
          menuItemId: dashItem.id,
          quantity: 2,
          unitPriceCents: 5600,
          selection: expect.objectContaining({
            comboSide: 'loaded_cheese_fries',
            comboDrink: 'vanilla_cloud_shake',
          }),
        }),
      ],
    })
    expect(router.currentRoute.value.query).toMatchObject({
      restaurantId: 'food_seed_dash_grill',
      shopView: 'order',
      shopOrderId: order.id,
    })
    const orderPage = wrapper.get('[data-testid="food-delivery-quick-service-order-page"]')
    expect(orderPage.text()).toContain(dashItem.title)
    expect(orderPage.text()).toContain('Loaded Cheese Fries · Vanilla Cloud Shake')
    wrapper.unmount()
  })

  test('requires a Dash Grill dipping-sauce choice and preserves it in the bag', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?category=fast_food&restaurantId=food_seed_dash_grill&entry=shop&shopView=menu',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const tenders = store.findMenuItemById('food_menu_dash_chicken_tenders')

    await wrapper.get('[data-testid="food-delivery-store-menu-section-chicken"]').trigger('click')
    await wrapper.get(`[data-testid="food-delivery-add-${tenders.id}"]`).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-dash-sauce-builder"]').text()).toContain(
      'One dipping sauce is included',
    )
    expect(wrapper.get('[data-testid="food-delivery-dash-selection-progress"]').text()).toContain(
      '1/1',
    )
    expect(wrapper.get('[data-testid="food-delivery-dash-selection-summary"]').text()).toContain(
      'House Dash Sauce',
    )

    await wrapper.get('[data-testid="food-delivery-dash-sauce-smoky_bbq_sauce"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-dash-selection-summary"]').text()).toContain(
      'Smoky BBQ Sauce',
    )
    await wrapper.get('[data-testid="food-delivery-menu-detail-add"]').trigger('click')

    expect(store.cartLineItems).toEqual([
      expect.objectContaining({
        menuItemId: tenders.id,
        selectionKey: 'sauce:smoky_bbq_sauce',
        selection: expect.objectContaining({
          sauce: 'smoky_bbq_sauce',
          sauceLabelEn: 'Smoky BBQ Sauce',
        }),
      }),
    ])

    await wrapper.get('[data-testid="food-delivery-menu-detail-close"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-quick-service-header-bag"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-cart-panel"]').text()).toContain(
      'Smoky BBQ Sauce',
    )
    wrapper.unmount()
  })

  test('keeps Dash Grill and Moon Bistro carts independent', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    const store = useFoodDeliveryStore()
    const moonItem = store.listMenuByRestaurant('food_seed_moon_bistro')[0]
    const dashItem = store.findMenuItemById('food_menu_dash_smoky_bbq_stack')
    store.addToCart(moonItem.id)
    await router.push(
      '/food-delivery?category=fast_food&restaurantId=food_seed_dash_grill&entry=shop&shopView=menu',
    )
    await router.isReady()
    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="food-delivery-store-menu-section-burgers"]').trigger('click')
    await wrapper.get(`[data-testid="food-delivery-add-${dashItem.id}"]`).trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="food-delivery-cart-replacement-dialog"]').exists()).toBe(
      false,
    )
    expect(store.listCartLineItemsByRestaurant('food_seed_moon_bistro')).toEqual([
      expect.objectContaining({ menuItemId: moonItem.id, quantity: 1 }),
    ])
    expect(store.listCartLineItemsByRestaurant('food_seed_dash_grill')).toEqual([
      expect.objectContaining({ menuItemId: dashItem.id, quantity: 1 }),
    ])
    expect(wrapper.text()).not.toContain('Moon Bistro')
    wrapper.unmount()
  })

  test('resolves Jade Hearth as a Chinese table app with route-driven menu, feast, bag, and orders pages', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_jade_hearth&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    expect(store.listMenuByRestaurant('food_seed_jade_hearth')).toHaveLength(12)
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('jade_table_menu')
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').classes()).toContain(
      'food-delivery-store-jade-table',
    )
    expect(wrapper.get('[data-testid="food-delivery-jade-home"]').text()).toContain(
      'A table shaped by the season.',
    )

    await wrapper.get('[data-testid="food-delivery-jade-nav-menu"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('menu')
    expect(wrapper.get('[data-testid="food-delivery-jade-menu-page"]').text()).toContain(
      'Six chapters for the table',
    )
    expect(wrapper.find('[data-testid="food-delivery-store-menu-section-all"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.get('[data-testid="food-delivery-store-menu-section-rail"]').attributes('tabindex'),
    ).toBe('0')
    expect(
      wrapper
        .get('[data-testid="food-delivery-menu-food_menu_jade_tea_smoked_chicken"]')
        .attributes('data-menu-card-style'),
    ).toBe('paper-banquet-entry')
    expect(
      wrapper.get('[data-testid="food-delivery-add-food_menu_jade_tea_smoked_chicken"]').text(),
    ).toContain('Add dish')

    systemStore.settings.system.language = 'zh-CN'
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-store-shell"]').text()).toContain('玉炉雅席')
    expect(
      wrapper.get('[data-testid="food-delivery-menu-food_menu_jade_tea_smoked_chicken"]').text(),
    ).toContain('玉炉茶熏半鸡')
    expect(store.findMenuItemById('food_menu_jade_tea_smoked_chicken').title).toBe(
      'Tea-Smoked Half Chicken',
    )

    systemStore.settings.system.language = 'en-US'
    await flushPromises()

    await wrapper.get('[data-testid="food-delivery-jade-nav-feast"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('feast')
    expect(wrapper.get('[data-testid="food-delivery-jade-feast-page"]').text()).toContain(
      'A table for every kind of gathering',
    )

    await wrapper.get('[data-testid="food-delivery-jade-nav-bag"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('bag')
    expect(wrapper.get('[data-testid="food-delivery-jade-bag-page"]').text()).toContain(
      'Your table is empty',
    )

    await wrapper.get('[data-testid="food-delivery-jade-nav-orders"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('orders')
    expect(wrapper.get('[data-testid="food-delivery-jade-orders-page"]').text()).toContain(
      'No Jade Hearth orders yet',
    )

    await wrapper.get('[data-testid="food-delivery-jade-nav-home"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBeUndefined()
    expect(wrapper.get('[data-testid="food-delivery-jade-home"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('adds a chosen Jade Hearth quantity and opens the submitted Jade order route', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_jade_hearth&entry=shop&shopView=menu',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const jadeItem = store.findMenuItemById('food_menu_jade_tea_smoked_chicken')

    await wrapper.get(`[data-testid="food-delivery-menu-open-${jadeItem.id}"]`).trigger('click')
    await flushPromises()
    expect(
      wrapper
        .get('[data-testid="food-delivery-jade-detail-menu"]')
        .attributes('data-detail-layout'),
    ).toBe('banquet-menu')
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]').text()).toContain(
      jadeItem.title,
    )
    await wrapper
      .get('[data-testid="food-delivery-menu-detail-quantity-increase"]')
      .trigger('click')
    await wrapper.get('[data-testid="food-delivery-menu-detail-add"]').trigger('click')

    expect(store.cartRestaurant.id).toBe('food_seed_jade_hearth')
    expect(store.cartLineItems).toEqual([
      expect.objectContaining({ menuItemId: jadeItem.id, quantity: 2 }),
    ])

    await wrapper.get('[data-testid="food-delivery-menu-detail-close"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-jade-header-bag"]').trigger('click')
    await flushPromises()
    expect(wrapper.get(`[data-testid="food-delivery-cart-${jadeItem.id}"]`).text()).toContain(
      jadeItem.title,
    )

    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-checkout-sheet"]').text()).toContain(
      'Jade Hearth',
    )
    await wrapper.get('[data-testid="food-delivery-checkout-submit"]').trigger('click')
    await flushPromises()

    const order = store.orders[0]
    expect(order).toMatchObject({
      restaurantId: 'food_seed_jade_hearth',
      restaurantName: 'Jade Hearth',
      itemCount: 2,
      items: [expect.objectContaining({ menuItemId: jadeItem.id, quantity: 2 })],
    })
    expect(router.currentRoute.value.query).toMatchObject({
      restaurantId: 'food_seed_jade_hearth',
      shopView: 'order',
      shopOrderId: order.id,
    })
    expect(wrapper.get('[data-testid="food-delivery-jade-order-page"]').text()).toContain(
      jadeItem.title,
    )
    wrapper.unmount()
  })

  test('opens a Chat-linked Jade order on its detail page with delivery and Wallet actions', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    const store = useFoodDeliveryStore()
    const walletStore = useWalletStore()
    const jadeItem = store.findMenuItemById('food_menu_jade_tea_smoked_chicken')
    store.addToCart(jadeItem.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Camphor Court 8',
      note: 'Open from Chat.',
    })
    const event = store.addOrderEvent(order.id, {
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
      summary: 'The rider is taking the covered lane.',
      etaMinutes: 34,
    })

    await router.push(`/food-delivery?source=chat&intent=food_delivery_order&orderId=${order.id}`)
    await router.isReady()
    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({
      restaurantId: 'food_seed_jade_hearth',
      entry: 'shop',
      shopView: 'order',
      shopOrderId: order.id,
    })
    expect(wrapper.get('[data-testid="food-delivery-jade-order-page"]').text()).toContain(
      jadeItem.title,
    )
    expect(
      wrapper.get(`[data-testid="food-delivery-jade-order-event-${event.id}"]`).text(),
    ).toContain('The rider is taking the covered lane.')
    expect(walletStore.findTransactionBySource('food_delivery_wallet_expense', order.id)).toBeNull()

    await wrapper
      .get(`[data-testid="food-delivery-jade-mark-delivered-${order.id}"]`)
      .trigger('click')
    await flushPromises()
    expect(store.findOrderById(order.id).status).toBe(FOOD_DELIVERY_ORDER_STATUS.DELIVERED)

    await wrapper
      .get(`[data-testid="food-delivery-jade-record-wallet-${order.id}"]`)
      .trigger('click')
    await flushPromises()
    expect(
      walletStore.findTransactionBySource('food_delivery_wallet_expense', order.id),
    ).toBeTruthy()
    expect(
      wrapper
        .get(`[data-testid="food-delivery-jade-record-wallet-${order.id}"]`)
        .attributes('disabled'),
    ).toBeDefined()
    wrapper.unmount()
  })

  test('keeps more than five Jade Hearth orders available from the shop order page', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    const store = useFoodDeliveryStore()
    const jadeItem = store.findMenuItemById('food_menu_jade_tea_smoked_chicken')

    for (let index = 0; index < 7; index += 1) {
      store.addToCart(jadeItem.id)
      store.checkoutCart({
        deliveryAddress: `Camphor Court ${index + 1}`,
        note: `History order ${index + 1}`,
      })
    }

    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_jade_hearth&entry=shop&shopView=orders',
    )
    await router.isReady()
    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    expect(store.orders).toHaveLength(7)
    store.orders.forEach((order) => {
      expect(wrapper.find(`[data-testid="food-delivery-order-${order.id}"]`).exists()).toBe(true)
    })
    wrapper.unmount()
  })

  test('keeps Jade Hearth and Moon Bistro carts independent', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    const store = useFoodDeliveryStore()
    const moonItem = store.listMenuByRestaurant('food_seed_moon_bistro')[0]
    const jadeItem = store.findMenuItemById('food_menu_jade_tea_smoked_chicken')
    store.addToCart(moonItem.id)
    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_jade_hearth&entry=shop&shopView=menu',
    )
    await router.isReady()
    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get(`[data-testid="food-delivery-add-${jadeItem.id}"]`).trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="food-delivery-cart-replacement-dialog"]').exists()).toBe(
      false,
    )
    expect(store.listCartLineItemsByRestaurant('food_seed_moon_bistro')).toEqual([
      expect.objectContaining({ menuItemId: moonItem.id, quantity: 1 }),
    ])
    expect(store.listCartLineItemsByRestaurant('food_seed_jade_hearth')).toEqual([
      expect.objectContaining({ menuItemId: jadeItem.id, quantity: 1 }),
    ])
    expect(wrapper.text()).not.toContain('Moon Bistro')
    wrapper.unmount()
  })

  test('runs Harbor Roast campaigns, pickup choices, branded checkout, and order detail end to end', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push('/food-delivery?category=cafe&restaurantId=food_seed_harbor_roast&entry=shop')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const harborItem = store.findMenuItemById('food_menu_harbor_sea_salt_caramel_latte')

    expect(store.listMenuByRestaurant('food_seed_harbor_roast')).toHaveLength(13)
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('harbor_roast_chain')
    expect(wrapper.findAll('[data-testid^="food-delivery-harbor-campaign-"]')).toHaveLength(4)

    for (const campaign of ['member', 'new', 'passport', 'pompompurin']) {
      await wrapper
        .get(`[data-testid="food-delivery-harbor-campaign-${campaign}"]`)
        .trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.query.shopView).toBe(campaign)
      expect(wrapper.get(`[data-testid="food-delivery-harbor-${campaign}-page"]`).exists()).toBe(
        true,
      )
      await wrapper.get('[data-testid="food-delivery-store-home"]').trigger('click')
      await flushPromises()
    }

    await wrapper.get('[data-testid="food-delivery-harbor-supply-entry"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('supply')
    expect(wrapper.get('[data-testid="food-delivery-harbor-supply-page"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="food-delivery-harbor-merchandise-"]')).toHaveLength(4)
    expect(
      wrapper
        .get('[data-testid="food-delivery-harbor-redeem-harbor_merch_captain_mug"]')
        .attributes('disabled'),
    ).toBeDefined()
    expect(
      wrapper.get('[data-testid="food-delivery-harbor-redeem-harbor_merch_captain_mug"]').text(),
    ).toContain('1 short')

    await wrapper
      .get('[data-testid="food-delivery-harbor-redeem-harbor_merch_anchor_pin"]')
      .trigger('click')
    await wrapper
      .get('[data-testid="food-delivery-harbor-buy-harbor_merch_canvas_tote"]')
      .trigger('click')
    expect(store.harborRoastBeanStamps).toBe(2)
    expect(store.listCartLineItemsByRestaurant('food_seed_harbor_roast')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          merchandiseId: 'harbor_merch_anchor_pin',
          acquisition: 'redeemed_gift',
          subtotalCents: 0,
        }),
        expect.objectContaining({
          merchandiseId: 'harbor_merch_canvas_tote',
          acquisition: 'purchase',
          unitPriceCents: 8900,
        }),
      ]),
    )

    await wrapper
      .get('[data-testid="food-delivery-harbor-merchandise-harbor_merch_sticker_pack"]')
      .find('.harbor-merch-image')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      shopView: 'supply-detail',
      shopMerchId: 'harbor_merch_sticker_pack',
    })
    expect(wrapper.get('[data-testid="food-delivery-harbor-supply-detail-page"]').text()).toContain(
      'Captain Stamp Sticker Pack',
    )
    await wrapper.get('[data-testid="food-delivery-store-home"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="food-delivery-store-home"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="food-delivery-harbor-nav-menu"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('menu')
    expect(wrapper.find('[data-testid="food-delivery-harbor-packaging-deck"]').exists()).toBe(false)
    await wrapper
      .get('[data-testid="food-delivery-store-menu-section-harbor_signatures"]')
      .trigger('click')
    expect(wrapper.find(`[data-testid="food-delivery-add-${harborItem.id}"]`).exists()).toBe(false)
    await wrapper
      .get(`[data-testid="food-delivery-harbor-customize-${harborItem.id}"]`)
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      shopView: 'detail',
      shopItemId: harborItem.id,
    })
    expect(wrapper.get('[data-testid="food-delivery-harbor-packaging-standard"]').text()).toContain(
      'Harbor classic paper cup',
    )
    expect(
      wrapper.get('[data-testid="food-delivery-harbor-packaging-pompompurin_cup"]').text(),
    ).toContain('Pompompurin collaboration cup')
    await wrapper
      .get('[data-testid="food-delivery-harbor-detail-quantity-increase"]')
      .trigger('click')
    await wrapper.get('[data-testid="food-delivery-harbor-temperature-iced"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-harbor-size-long"]').trigger('click')
    await wrapper
      .get('[data-testid="food-delivery-harbor-packaging-pompompurin_sleeve"]')
      .trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-harbor-detail-page"]').text()).toContain(
      '84.00 CNY',
    )
    await wrapper.get('[data-testid="food-delivery-harbor-detail-add"]').trigger('click')
    expect(store.getCartQuantityByRestaurant('food_seed_harbor_roast')).toBe(4)
    expect(store.listCartLineItemsByRestaurant('food_seed_harbor_roast')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          menuItemId: harborItem.id,
          unitPriceCents: 4200,
          quantity: 2,
          selection: expect.objectContaining({
            temperature: 'iced',
            size: 'long',
            packaging: 'pompompurin_sleeve',
          }),
        }),
      ]),
    )

    await wrapper.get('[data-testid="food-delivery-harbor-header-bag"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-harbor-cart-selection"]').text()).toContain(
      'Iced · Long 16oz · Collaboration cup + keepsake sleeve',
    )
    await wrapper.get('[data-testid="food-delivery-harbor-pickup-dine-in"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    expect(wrapper.find('[data-testid="food-delivery-checkout-sheet"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="food-delivery-harbor-checkout-sheet"]').text()).toContain(
      'Dine in',
    )
    await wrapper.get('[data-testid="food-delivery-harbor-checkout-submit"]').trigger('click')
    await flushPromises()

    const pickupOrder = store.orders[0]
    expect(pickupOrder).toMatchObject({
      restaurantId: 'food_seed_harbor_roast',
      fulfillmentMode: 'pickup',
      pickupMode: 'dine_in',
      deliveryFeeCents: 0,
      itemCount: 4,
      items: expect.arrayContaining([
        expect.objectContaining({
          merchandiseId: 'harbor_merch_anchor_pin',
          acquisition: 'redeemed_gift',
          unitPriceCents: 0,
        }),
        expect.objectContaining({
          merchandiseId: 'harbor_merch_canvas_tote',
          acquisition: 'purchase',
          unitPriceCents: 8900,
        }),
        expect.objectContaining({
          menuItemId: harborItem.id,
          unitPriceCents: 4200,
          selection: expect.objectContaining({
            temperature: 'iced',
            size: 'long',
            packaging: 'pompompurin_sleeve',
          }),
        }),
      ]),
    })
    expect(router.currentRoute.value.query).toMatchObject({
      shopView: 'order',
      shopOrderId: pickupOrder.id,
    })
    expect(wrapper.get('[data-testid="food-delivery-harbor-order-page"]').text()).toContain(
      'Dine in',
    )
    expect(wrapper.get('[data-testid="food-delivery-harbor-order-selection"]').text()).toContain(
      'Iced · Long 16oz · Collaboration cup + keepsake sleeve',
    )

    await wrapper.get('[data-testid="food-delivery-harbor-nav-menu"]').trigger('click')
    await flushPromises()
    await wrapper
      .get('[data-testid="food-delivery-store-menu-section-harbor_signatures"]')
      .trigger('click')
    await wrapper
      .get(`[data-testid="food-delivery-harbor-customize-${harborItem.id}"]`)
      .trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="food-delivery-harbor-detail-add"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-harbor-nav-bag"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="food-delivery-harbor-mode-delivery"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-harbor-checkout-submit"]').trigger('click')
    await flushPromises()

    const deliveryOrder = store.orders[0]
    expect(deliveryOrder).toMatchObject({
      restaurantId: 'food_seed_harbor_roast',
      fulfillmentMode: 'delivery',
      pickupMode: '',
      deliveryFeeCents: 350,
    })
    expect(wrapper.get('[data-testid="food-delivery-harbor-order-page"]').text()).toContain(
      'Delivery',
    )
    wrapper.unmount()
  })

  test('quotes Harbor Roast customization from source money exactly once', async () => {
    const router = createTestRouter()
    const walletStore = useWalletStore()
    walletStore.setPrimaryCurrency('EUR')
    await router.push('/food-delivery?category=cafe&restaurantId=food_seed_harbor_roast&entry=shop')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const menuItemId = 'food_menu_harbor_sea_salt_caramel_latte'
    const sourceItem = store.menuItems.find((item) => item.id === menuItemId)

    await wrapper.get('[data-testid="food-delivery-harbor-nav-menu"]').trigger('click')
    await flushPromises()
    await wrapper
      .get('[data-testid="food-delivery-store-menu-section-harbor_signatures"]')
      .trigger('click')
    await wrapper
      .get(`[data-testid="food-delivery-harbor-customize-${menuItemId}"]`)
      .trigger('click')
    await flushPromises()
    await wrapper
      .get('[data-testid="food-delivery-harbor-detail-quantity-increase"]')
      .trigger('click')
    await wrapper.get('[data-testid="food-delivery-harbor-size-long"]').trigger('click')
    await wrapper
      .get('[data-testid="food-delivery-harbor-packaging-pompompurin_sleeve"]')
      .trigger('click')

    const sourceUnitPriceCents = sourceItem.priceCents + 400 + 500
    const expectedUnitQuote = walletStore.quoteMoney(
      { amountMinor: sourceUnitPriceCents, currency: sourceItem.currency },
      'EUR',
    )
    const expectedTotalQuote = walletStore.quoteMoney(
      { amountMinor: sourceUnitPriceCents * 2, currency: sourceItem.currency },
      'EUR',
    )
    expect(expectedUnitQuote.ok).toBe(true)
    expect(expectedTotalQuote.ok).toBe(true)
    expect(wrapper.get('[data-testid="food-delivery-harbor-detail-page"]').text()).toContain(
      `${walletStore.formatMoneyAmount(expectedTotalQuote.quotedMoney, { useGrouping: false })} EUR`,
    )

    await wrapper.get('[data-testid="food-delivery-harbor-detail-add"]').trigger('click')
    const sourceLine = store.cartItems.find((item) => item.menuItemId === menuItemId)
    const presentedLine = store
      .listCartLineItemsByRestaurant('food_seed_harbor_roast')
      .find((item) => item.menuItemId === menuItemId)
    expect(sourceLine).toMatchObject({
      sourceUnitPriceCents,
      sourceCurrency: 'CNY',
      quantity: 2,
    })
    expect(presentedLine).toMatchObject({
      unitPriceCents: expectedUnitQuote.quotedMoney.amountMinor,
      subtotalCents: expectedTotalQuote.quotedMoney.amountMinor,
      currency: 'EUR',
    })

    await wrapper.get('[data-testid="food-delivery-harbor-header-bag"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-harbor-checkout-sheet"]').text()).toContain(
      `${walletStore.formatMoneyAmount(expectedTotalQuote.quotedMoney, { useGrouping: false })} EUR`,
    )
    wrapper.unmount()
  })

  test('resolves Verdant Day as a minimalist light-food app with route-driven detail, bag, and order pages', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_verdant_day&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const verdantItem = store.findMenuItemById('food_menu_verdant_aegean_garden')

    expect(store.listMenuByRestaurant('food_seed_verdant_day')).toHaveLength(12)
    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('minimal_light_food')
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').classes()).toContain(
      'food-delivery-store-light-food',
    )
    const hero = wrapper.get('[data-testid="food-delivery-light-brand-hero"]')
    expect(hero.text()).toBe('')
    expect(
      wrapper
        .get('[data-testid="food-delivery-light-hero-image"]')
        .attributes('data-required-asset'),
    ).toBe('verdant-day/brand/verdant-day-brand-hero-preview-02.png')
    expect(
      wrapper
        .findAll('[data-testid="food-delivery-light-featured"] [data-required-asset]')
        .map((image) => image.attributes('data-required-asset')),
    ).toEqual([
      'verdant-day/products/verdant-day-item-01.png',
      'verdant-day/products/verdant-day-item-04.png',
      'verdant-day/products/verdant-day-item-07.png',
    ])
    expect(
      wrapper
        .get('[data-testid="food-delivery-light-campaign"] [data-required-asset]')
        .attributes('data-required-asset'),
    ).toBe('verdant-day/promotions/verdant-day-promo-lunch-moment-01.png')
    expect(wrapper.find('[data-testid="food-delivery-store-menu-section-all"]').exists()).toBe(
      false,
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-store-menu-section-salads"]')
        .attributes('aria-pressed'),
    ).toBeUndefined()
    expect(wrapper.find('[data-testid="food-delivery-menu-detail-sheet"]').exists()).toBe(false)

    const addressButton = wrapper.get('[data-testid="food-delivery-light-address"]')
    expect(addressButton.attributes('aria-expanded')).toBe('false')
    await addressButton.trigger('click')
    expect(addressButton.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-testid="food-delivery-light-address-panel"]').exists()).toBe(true)

    await wrapper.get('[data-testid="food-delivery-light-campaign-open"]').trigger('click')
    const promotionDialog = wrapper.get('[data-testid="food-delivery-light-promotion-dialog"]')
    expect(promotionDialog.text()).toContain('A brighter lunch break.')
    expect(promotionDialog.get('img').attributes('data-required-asset')).toBe(
      'verdant-day/promotions/verdant-day-promo-meal-spread-01.png',
    )
    await wrapper.get('[data-testid="food-delivery-light-promotion-close"]').trigger('click')
    expect(wrapper.find('[data-testid="food-delivery-light-promotion-dialog"]').exists()).toBe(
      false,
    )

    await wrapper.get('[data-testid="food-delivery-light-nav-menu"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('menu')
    expect(wrapper.get('[data-testid="food-delivery-light-menu-page"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="food-delivery-store-menu-section-all"]').exists()).toBe(
      false,
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-store-menu-section-salads"]')
        .attributes('aria-pressed'),
    ).toBe('true')
    const initialMenuItems = wrapper.findAll(
      '[data-testid^="food-delivery-menu-"][data-menu-section]',
    )
    expect(initialMenuItems).toHaveLength(3)
    initialMenuItems.forEach((item) => {
      expect(item.attributes('data-menu-section')).toBe('salads')
    })

    await wrapper.get('[data-testid="food-delivery-light-menu-search"]').setValue('Golden Grain')
    expect(wrapper.get('[data-testid="food-delivery-menu-group-warm_bowls"]').exists()).toBe(true)
    expect(wrapper.find(`[data-testid="food-delivery-menu-open-${verdantItem.id}"]`).exists()).toBe(
      false,
    )
    await wrapper.get('[data-testid="food-delivery-light-menu-search"]').setValue('')

    await wrapper.get(`[data-testid="food-delivery-menu-open-${verdantItem.id}"]`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      shopView: 'detail',
      shopItemId: verdantItem.id,
    })
    expect(wrapper.get('[data-testid="food-delivery-light-detail-page"]').text()).toContain(
      verdantItem.title,
    )
    expect(wrapper.get('[data-testid="food-delivery-light-detail-quantity"]').text()).toContain('1')

    await wrapper
      .get('[data-testid="food-delivery-light-detail-quantity-increase"]')
      .trigger('click')
    await wrapper.get('[data-testid="food-delivery-light-detail-add"]').trigger('click')
    expect(store.cartQuantity).toBe(2)

    await wrapper.get('[data-testid="food-delivery-light-header-bag"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('bag')
    expect(wrapper.get('[data-testid="food-delivery-light-bag-page"]').text()).toContain(
      verdantItem.title,
    )

    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-checkout-sheet"]').text()).toContain(
      'Verdant Day',
    )
    expect(wrapper.get('[data-testid="food-delivery-checkout-sheet"] article').classes()).toContain(
      'bg-[#f2f4ef]',
    )
    await wrapper.get('[data-testid="food-delivery-checkout-submit"]').trigger('click')
    await flushPromises()

    const order = store.orders[0]
    expect(order).toMatchObject({
      restaurantId: 'food_seed_verdant_day',
      restaurantName: 'Verdant Day',
    })
    expect(order.items).toEqual([
      expect.objectContaining({ menuItemId: verdantItem.id, quantity: 2 }),
    ])
    expect(router.currentRoute.value.query).toMatchObject({
      shopView: 'order',
      shopOrderId: order.id,
    })
    expect(wrapper.get('[data-testid="food-delivery-light-order-page"]').text()).toContain(
      verdantItem.title,
    )
    expect(
      wrapper.get('[data-testid="food-delivery-light-nav-orders"]').attributes('aria-current'),
    ).toBe('page')
    wrapper.unmount()
  })

  test('keeps Verdant Day back navigation inside the shop until its home page', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    const routeCases = [
      { page: 'menu', expectedPage: undefined },
      {
        page: 'detail',
        extraQuery: '&shopItemId=food_menu_verdant_aegean_garden',
        expectedPage: 'menu',
      },
      { page: 'bag', expectedPage: undefined },
      { page: 'orders', expectedPage: undefined },
      { page: 'order', extraQuery: '&shopOrderId=verdant-order', expectedPage: 'orders' },
    ]

    for (const { page, extraQuery = '', expectedPage } of routeCases) {
      const router = createTestRouter()
      await router.push(
        `/food-delivery?category=restaurants&restaurantId=food_seed_verdant_day&entry=shop&shopView=${page}${extraQuery}`,
      )
      await router.isReady()
      const wrapper = mount(FoodDeliveryView, {
        global: { plugins: [router] },
      })

      const backButton = wrapper.get('[data-testid="food-delivery-store-home"]')
      expect(backButton.attributes('aria-label')).toBe('Back')
      await backButton.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/food-delivery')
      expect(router.currentRoute.value.query.shopView).toBe(expectedPage)
      expect(router.currentRoute.value.query.shopItemId).toBeUndefined()
      expect(router.currentRoute.value.query.shopOrderId).toBeUndefined()
      wrapper.unmount()
    }

    const router = createTestRouter()
    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_verdant_day&entry=shop&from=home&homePage=1',
    )
    await router.isReady()
    const wrapper = mount(FoodDeliveryView, {
      global: { plugins: [router] },
    })

    const homeButton = wrapper.get('[data-testid="food-delivery-store-home"]')
    expect(homeButton.attributes('aria-label')).toBe('Return to Home')
    await homeButton.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
    expect(router.currentRoute.value.query.homePage).toBe('1')
    wrapper.unmount()
  })

  test('adds to Verdant Day without changing the existing Moon Bistro cart', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    const store = useFoodDeliveryStore()
    const moonItem = store.listMenuByRestaurant('food_seed_moon_bistro')[0]
    const verdantItem = store.findMenuItemById('food_menu_verdant_aegean_garden')
    store.addToCart(moonItem.id)
    const moonCartState = JSON.stringify(store.cartItems)

    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_verdant_day&entry=shop&shopView=menu',
    )
    await router.isReady()
    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get(`[data-testid="food-delivery-add-${verdantItem.id}"]`).trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="food-delivery-cart-replacement-dialog"]').exists()).toBe(
      false,
    )
    expect(store.listCartLineItemsByRestaurant('food_seed_moon_bistro')).toEqual([
      expect.objectContaining({ menuItemId: moonItem.id, quantity: 1 }),
    ])
    expect(store.listCartLineItemsByRestaurant('food_seed_verdant_day')).toEqual([
      expect.objectContaining({ menuItemId: verdantItem.id, quantity: 1 }),
    ])
    expect(JSON.stringify(store.cartItems)).not.toBe(moonCartState)
    expect(wrapper.text()).not.toContain('Moon Bistro')
    wrapper.unmount()
  })

  test('adds same-shop items without opening the replacement dialog', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_moon_bistro&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const moonItem = store.listMenuByRestaurant('food_seed_moon_bistro')[0]
    const addButton = wrapper.get(`[data-testid="food-delivery-add-${moonItem.id}"]`)

    await addButton.trigger('click')
    await addButton.trigger('click')

    expect(wrapper.find('[data-testid="food-delivery-cart-replacement-dialog"]').exists()).toBe(
      false,
    )
    expect(store.cartRestaurant.id).toBe('food_seed_moon_bistro')
    expect(store.cartLineItems).toHaveLength(1)
    expect(store.cartLineItems[0]).toMatchObject({
      menuItemId: moonItem.id,
      quantity: 2,
    })
    wrapper.unmount()
  })

  test('shows and checks out only the Peach Cloud cart while preserving Moon Bistro', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_moon_bistro&entry=shop&from=home&homePage=2',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const moonItem = store.listMenuByRestaurant('food_seed_moon_bistro')[0]
    const peachItem = store.listMenuByRestaurant('food_seed_peach_cloud')[0]

    await wrapper.get(`[data-testid="food-delivery-add-${moonItem.id}"]`).trigger('click')
    await router.push(
      '/food-delivery?category=dessert&restaurantId=food_seed_peach_cloud&entry=shop&shopView=bag&from=home&homePage=2',
    )
    await flushPromises()

    expect(wrapper.find('[data-testid="food-delivery-foreign-cart-notice"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-bag-page"]').text()).toContain(
      'Your bag feels light',
    )
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-bag-page"]').text()).not.toContain(
      moonItem.title,
    )
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-bag-page"]').text()).not.toContain(
      peachItem.title,
    )

    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-menu"]').trigger('click')
    await flushPromises()
    const peachAddButton = wrapper.get(`[data-testid="food-delivery-add-${peachItem.id}"]`)
    await peachAddButton.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="food-delivery-cart-replacement-dialog"]').exists()).toBe(
      false,
    )
    expect(store.listCartLineItemsByRestaurant('food_seed_moon_bistro')).toEqual([
      expect.objectContaining({ menuItemId: moonItem.id, quantity: 1 }),
    ])
    expect(store.listCartLineItemsByRestaurant('food_seed_peach_cloud')).toEqual([
      expect.objectContaining({ menuItemId: peachItem.id, quantity: 1 }),
    ])
    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-cart"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-bag-page"]').text()).toContain(
      peachItem.title,
    )
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-bag-page"]').text()).not.toContain(
      moonItem.title,
    )
    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-checkout-submit"]').trigger('click')
    await flushPromises()

    expect(store.listCartLineItemsByRestaurant('food_seed_peach_cloud')).toEqual([])
    expect(store.listCartLineItemsByRestaurant('food_seed_moon_bistro')).toEqual([
      expect.objectContaining({ menuItemId: moonItem.id, quantity: 1 }),
    ])
    expect(store.orders[0]).toMatchObject({
      restaurantId: 'food_seed_peach_cloud',
      items: [expect.objectContaining({ menuItemId: peachItem.id, quantity: 1 })],
    })
    expect(store.cartLineItems.find((line) => line.menuItemId === peachItem.id)).toBeUndefined()
    expect(store.cartLineItems.find((line) => line.menuItemId === moonItem.id)).toMatchObject({
      menuItemId: moonItem.id,
      quantity: 1,
    })
    expect(store.orders[0].items[0]).toMatchObject({
      menuItemId: peachItem.id,
      quantity: 1,
    })
    expect(router.currentRoute.value.query).toMatchObject({ from: 'home', homePage: '2' })
    wrapper.unmount()
  })

  test('adds the requested Moon Bistro detail quantity without changing Peach Cloud', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?category=dessert&restaurantId=food_seed_peach_cloud&entry=shop',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const peachItem = store.listMenuByRestaurant('food_seed_peach_cloud')[0]
    const moonItem = store.listMenuByRestaurant('food_seed_moon_bistro')[0]

    await wrapper
      .get('[data-testid="food-delivery-store-menu-section-fruit_sparkle"]')
      .trigger('click')
    await flushPromises()
    await wrapper.get(`[data-testid="food-delivery-add-${peachItem.id}"]`).trigger('click')
    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_moon_bistro&entry=shop',
    )
    await flushPromises()
    expect(wrapper.find('[data-testid="food-delivery-foreign-cart-notice"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-cart-panel"]').exists()).toBe(false)

    await wrapper.get(`[data-testid="food-delivery-menu-open-${moonItem.id}"]`).trigger('click')
    await wrapper
      .get('[data-testid="food-delivery-menu-detail-quantity-increase"]')
      .trigger('click')
    const moonDetailAdd = wrapper.get('[data-testid="food-delivery-menu-detail-add"]')
    await moonDetailAdd.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="food-delivery-cart-replacement-dialog"]').exists()).toBe(
      false,
    )
    expect(store.listCartLineItemsByRestaurant('food_seed_peach_cloud')).toEqual([
      expect.objectContaining({ menuItemId: peachItem.id, quantity: 1 }),
    ])
    expect(store.listCartLineItemsByRestaurant('food_seed_moon_bistro')).toEqual([
      expect.objectContaining({
        menuItemId: moonItem.id,
        quantity: 2,
      }),
    ])
    wrapper.unmount()
  })

  test('does not submit another shop cart after the active shop changes', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push(
      '/food-delivery?category=restaurants&restaurantId=food_seed_moon_bistro&entry=shop&from=home&homePage=1',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const moonItem = store.listMenuByRestaurant('food_seed_moon_bistro')[0]
    store.addToCart(moonItem.id)
    await flushPromises()

    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-checkout-sheet"]').exists()).toBe(true)

    await router.push(
      '/food-delivery?category=dessert&restaurantId=food_seed_peach_cloud&entry=shop&shopView=bag&from=home&homePage=1',
    )
    await flushPromises()
    await wrapper.get('[data-testid="food-delivery-checkout-submit"]').trigger('click')
    await flushPromises()

    expect(store.orderCount).toBe(0)
    expect(store.cartRestaurant.id).toBe('food_seed_moon_bistro')
    expect(wrapper.find('[data-testid="food-delivery-checkout-sheet"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="food-delivery-foreign-cart-notice"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-bag-page"]').text()).toContain(
      'Your bag feels light',
    )
    expect(router.currentRoute.value.query).toMatchObject({ from: 'home', homePage: '1' })
    wrapper.unmount()
  })

  test('renders and checks out only active-shop lines from a restored multi-shop cart', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    const store = useFoodDeliveryStore()
    const peachItem = store.listMenuByRestaurant('food_seed_peach_cloud')[0]
    const moonItem = store.listMenuByRestaurant('food_seed_moon_bistro')[0]
    const peachLine = {
      menuItemId: peachItem.id,
      quantity: 2,
      sourceModule: 'restore_test',
      sourceId: 'mixed_active_first',
      addedAt: 101,
      updatedAt: 101,
    }
    const moonLine = {
      menuItemId: moonItem.id,
      quantity: 3,
      sourceModule: 'restore_test',
      sourceId: 'mixed_foreign_second',
      addedAt: 102,
      updatedAt: 102,
    }
    store.$patch({ cartItems: [peachLine, moonLine] })
    const activeFirstState = JSON.stringify(store.cartItems)
    await router.push(
      '/food-delivery?category=dessert&restaurantId=food_seed_peach_cloud&entry=shop&shopView=bag',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    const expectPeachCartIsolation = () => {
      expect(wrapper.find('[data-testid="food-delivery-foreign-cart-notice"]').exists()).toBe(false)
      expect(
        wrapper.get('[data-testid="food-delivery-peach-cloud-bag-page"]').text(),
      ).not.toContain(moonItem.title)
      expect(wrapper.get('[data-testid="food-delivery-active-cart-quantity"]').text()).toBe('2')
      expect(wrapper.find('[data-testid="food-delivery-active-cart-total"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="food-delivery-checkout"]').exists()).toBe(true)
      expect(wrapper.find(`[data-testid="food-delivery-cart-${peachItem.id}"]`).exists()).toBe(true)
      expect(wrapper.find(`[data-testid="food-delivery-cart-${moonItem.id}"]`).exists()).toBe(false)
    }

    expectPeachCartIsolation()
    expect(JSON.stringify(store.cartItems)).toBe(activeFirstState)
    expect(store.orderCount).toBe(0)

    store.$patch({ cartItems: [moonLine, peachLine] })
    await flushPromises()
    expectPeachCartIsolation()
    expect(store.orderCount).toBe(0)

    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-checkout-sheet"]').exists()).toBe(true)
    await wrapper.get('[data-testid="food-delivery-checkout-submit"]').trigger('click')
    await flushPromises()

    expect(store.orderCount).toBe(1)
    expect(store.orders[0]).toMatchObject({
      restaurantId: 'food_seed_peach_cloud',
      itemCount: 2,
      items: [expect.objectContaining({ menuItemId: peachItem.id, quantity: 2 })],
    })
    expect(store.listCartLineItemsByRestaurant('food_seed_peach_cloud')).toEqual([])
    expect(store.listCartLineItemsByRestaurant('food_seed_moon_bistro')).toEqual([
      expect.objectContaining({ menuItemId: moonItem.id, quantity: 3 }),
    ])
    expect(wrapper.find('[data-testid="food-delivery-checkout-sheet"]').exists()).toBe(false)
    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-cart"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-bag-page"]').text()).toContain(
      'Your bag feels light',
    )
    wrapper.unmount()
  })

  test('keeps a foreign bag private across standard and dedicated shop surfaces', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    const store = useFoodDeliveryStore()
    const longShopName = 'ExtremelyLongUnbrokenForeignRestaurantIdentityForMobileRecovery1234567890'
    const longNameRestaurant = store.upsertRestaurant({
      id: 'food_long_name_shop',
      name: longShopName,
      category: 'restaurants',
      cuisine: 'Long name test kitchen',
      deliveryFee: '3.00',
      distanceKm: 0.8,
      deliveryEtaMinutes: 16,
    })
    const longNameItem = store.upsertMenuItem({
      id: 'food_long_name_item',
      restaurantId: longNameRestaurant.id,
      title: 'Long Name Lunch',
      category: 'restaurants',
      price: '20.00',
    })
    store.addToCart(longNameItem.id)
    const foreignCartState = JSON.stringify(store.cartItems)
    await router.push('/food-delivery?category=cafe&restaurantId=food_seed_harbor_roast&entry=shop')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const shopRoutes = [
      '/food-delivery?category=cafe&restaurantId=food_seed_harbor_roast&entry=shop',
      '/food-delivery?category=dessert&restaurantId=food_seed_peach_cloud&entry=shop&shopView=bag',
      '/food-delivery?category=fast_food&restaurantId=food_seed_dash_grill&entry=shop&shopView=bag',
      '/food-delivery?category=restaurants&restaurantId=food_seed_jade_hearth&entry=shop&shopView=bag',
      '/food-delivery?category=restaurants&restaurantId=food_seed_verdant_day&entry=shop&shopView=bag',
    ]

    for (const shopRoute of shopRoutes) {
      await router.push(shopRoute)
      await flushPromises()

      expect(wrapper.find('[data-testid="food-delivery-foreign-cart-notice"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="food-delivery-open-foreign-cart-shop"]').exists()).toBe(
        false,
      )
      expect(wrapper.find('[data-testid="food-delivery-checkout"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain(longShopName)
      expect(JSON.stringify(store.cartItems)).toBe(foreignCartState)
    }
    wrapper.unmount()
  })

  test('maps Peach order states to one through four active progress segments', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    const store = useFoodDeliveryStore()
    const peachItem = store.listMenuByRestaurant('food_seed_peach_cloud')[0]
    store.addToCart(peachItem.id)
    const order = store.checkoutCart({ deliveryAddress: 'Peach Street 8' })
    await router.push(
      `/food-delivery?category=dessert&restaurantId=food_seed_peach_cloud&entry=shop&shopView=order&shopOrderId=${order.id}`,
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const activeProgressCount = () =>
      wrapper
        .findAll('[data-testid^="food-delivery-peach-cloud-progress-"]')
        .filter((segment) => segment.attributes('data-active') === 'true').length
    const statusCases = [
      [FOOD_DELIVERY_ORDER_STATUS.PLACED, 1],
      [FOOD_DELIVERY_ORDER_STATUS.COOKING, 2],
      [FOOD_DELIVERY_ORDER_STATUS.RIDER_PICKUP, 3],
      [FOOD_DELIVERY_ORDER_STATUS.DELIVERED, 4],
      [FOOD_DELIVERY_ORDER_STATUS.CANCELLED, 0],
    ]

    for (const [status, activeSegments] of statusCases) {
      if (store.findOrderById(order.id).status !== status) {
        expect(store.updateOrderStatus(order.id, status)).toBe(true)
        await flushPromises()
      }
      expect(activeProgressCount()).toBe(activeSegments)
    }

    expect(store.findOrderById(order.id)).toMatchObject({
      restaurantId: 'food_seed_peach_cloud',
      items: [expect.objectContaining({ menuItemId: peachItem.id, quantity: 1 })],
    })
    wrapper.unmount()
  })

  test('shows Chat service source banner and highlights linked food order', async () => {
    const router = createTestRouter()
    const store = useFoodDeliveryStore()
    const activeRestaurant = store.upsertRestaurant({
      id: 'food_wallet_shop',
      name: 'Wallet Kitchen',
      category: 'restaurants',
      deliveryFee: '4.00',
    })
    const menuItem = store.upsertMenuItem({
      id: 'food_wallet_item',
      restaurantId: activeRestaurant.id,
      title: 'Wallet Meal',
      price: '36.00',
    })
    store.addToCart(menuItem.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Map Pin A',
      note: 'From Chat service.',
    })
    const event = store.addOrderEvent(order.id, {
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
      summary: 'Rider is delayed by rain.',
      etaMinutes: 42,
    })
    Object.assign(event, {
      carrierName: 'Moon Courier',
      trackingCode: 'MOON-TRACK-42',
    })

    await router.push(`/food-delivery?source=chat&intent=food_delivery_order&orderId=${order.id}`)
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const mapStore = useMapStore()

    expect(wrapper.get('[data-testid="food-delivery-chat-source-banner"]').text()).toContain(
      activeRestaurant.name,
    )
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain(
      activeRestaurant.name,
    )
    expect(wrapper.get(`[data-testid="food-delivery-order-${order.id}"]`).classes()).toContain(
      'border-orange-300',
    )
    const eventCard = wrapper.get(
      `[data-testid="food-delivery-order-event-${order.id}-${event.id}"]`,
    )
    expect(eventCard.text()).toContain('Rider is delayed by rain.')
    const mapContext = wrapper.get(
      `[data-testid="food-delivery-event-map-context-${order.id}-${event.id}"]`,
    )
    const eventMapHandoff = mapStore.buildDeliveryEventMapHandoff({
      ownerModule: 'food_delivery',
      order,
      event,
    })
    expect(mapContext.text()).toMatch(/Delivery route|配送路线/)
    expect(mapContext.text()).toContain('Food Delivery')
    expect(mapContext.text()).toContain('Map Pin A')
    expect(mapContext.text()).toContain('42 min')
    const mapHookPrefix = `food-delivery-event-map-context-${order.id}-${event.id}`
    const boundaryHook = wrapper.get(`[data-testid="${mapHookPrefix}-boundary"]`)
    const pickupHook = wrapper.get(`[data-testid="${mapHookPrefix}-pickup"]`)
    const dropoffHook = wrapper.get(`[data-testid="${mapHookPrefix}-dropoff"]`)
    const metaHook = wrapper.get(`[data-testid="${mapHookPrefix}-meta"]`)
    expect(pickupHook.text()).toContain(eventMapHandoff.pickupPoint)
    expect(dropoffHook.text()).toContain(eventMapHandoff.dropoffPoint)
    expect(metaHook.text()).toContain('Moon Courier')
    expect(metaHook.text()).toContain('MOON-TRACK-42')
    expect(metaHook.text()).toContain(`${eventMapHandoff.distanceKm} km`)
    for (const hook of [boundaryHook, pickupHook, dropoffHook, metaHook]) {
      expect(hook.text()).not.toMatch(INTERNAL_DELIVERY_DIAGNOSTIC_COPY)
    }
    expect(wrapper.get('[data-testid="food-delivery-store-support-drawer"]').text()).not.toMatch(
      INTERNAL_DELIVERY_DIAGNOSTIC_COPY,
    )
    expect(mapStore.tripState.status).toBe('idle')
    expect(mapStore.tripHistory).toHaveLength(0)
    expect(store.orderCount).toBe(1)
    expect(store.cartQuantity).toBe(0)
    wrapper.unmount()
  })

  test('can trigger a safe delivery event from an order card through the simulation pilot', async () => {
    const router = createTestRouter()
    const store = useFoodDeliveryStore()
    const activeRestaurant = store.listRestaurantsByCategory('restaurants')[0]
    const menuItem = store.listMenuByRestaurant(activeRestaurant.id)[0]
    store.addToCart(menuItem.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Map Pin B',
      note: 'Random event pilot.',
    })

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${activeRestaurant.id}&entry=shop`,
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get(`[data-testid="food-delivery-trigger-event-${order.id}"]`).trigger('click')
    await flushPromises()

    expect(store.orders[0]?.events).toHaveLength(1)
    expect([
      FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
    ]).toContain(store.orders[0]?.events[0]?.type)
    expect(wrapper.get('[data-testid="food-delivery-event-feedback"]').text()).toMatch(
      /Delivery update added\.|配送更新已添加。/,
    )
    expect(
      wrapper
        .find(
          `[data-testid="food-delivery-order-event-${order.id}-${store.orders[0].events[0].id}"]`,
        )
        .exists(),
    ).toBe(true)
    wrapper.unmount()
  })

  test('shows a pending consumer ETA when an event handoff has no usable duration', async () => {
    const router = createTestRouter()
    const store = useFoodDeliveryStore()
    const mapStore = useMapStore()
    const activeRestaurant = store.upsertRestaurant({
      id: 'food_pending_eta_shop',
      name: 'Pending ETA Kitchen',
      category: 'restaurants',
      deliveryFee: '3.00',
    })
    const menuItem = store.upsertMenuItem({
      id: 'food_pending_eta_item',
      restaurantId: activeRestaurant.id,
      title: 'Pending ETA Meal',
      price: '24.00',
    })
    store.addToCart(menuItem.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Pending ETA Address',
      note: 'Pending ETA fixture.',
    })
    const event = store.addOrderEvent(order.id, {
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      summary: 'Waiting for a delivery estimate.',
    })
    vi.spyOn(mapStore, 'buildDeliveryEventMapHandoff').mockReturnValue({
      routeSummaryEn: 'Pending ETA Kitchen -> Pending ETA Address',
      pickupPoint: 'Pending ETA Kitchen',
      dropoffPoint: 'Pending ETA Address',
      distanceKm: 0,
      etaMinutes: 0,
      etaDays: null,
    })

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${activeRestaurant.id}&entry=shop`,
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const mapContext = wrapper.get(
      `[data-testid="food-delivery-event-map-context-${order.id}-${event.id}"]`,
    )
    expect(mapContext.text()).toMatch(/ETA pending|ETA 待定/)
    expect(mapContext.text()).not.toContain('0 min')
    wrapper.unmount()
  })

  test('keeps Moon order support folded and presents consumer delivery controls', async () => {
    const router = createTestRouter()
    const store = useFoodDeliveryStore()
    const simulationStore = useSimulationStore()
    const activeRestaurant = store.findRestaurantById('food_seed_moon_bistro')
    const menuItem = store.listMenuByRestaurant(activeRestaurant.id)[0]

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${activeRestaurant.id}&entry=shop`,
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('[data-testid="food-delivery-store-support-drawer"]').exists()).toBe(false)

    store.addToCart(menuItem.id)
    const order = store.checkoutCart({
      deliveryAddress:
        'ApartmentGateWithAnIntentionallyLongUnbrokenDeliveryAddressForWrappingEvidence',
      note: 'Consumer order support.',
    })
    await flushPromises()

    const drawer = wrapper.get('[data-testid="food-delivery-store-support-drawer"]')
    const summary = wrapper.get('[data-testid="food-delivery-store-support-summary"]')
    expect(drawer.element.open).toBe(false)
    expect(summary.classes()).toContain('min-h-11')
    expect(summary.classes()).toContain('focus-visible:ring-2')

    await summary.trigger('click')
    await flushPromises()
    expect(drawer.element.open).toBe(true)

    const drawerText = drawer.text()
    expect(drawerText).toMatch(/Delivery details|配送详情/)
    expect(drawerText).toMatch(/Check for update|查看配送更新/)
    expect(drawerText).toMatch(/Confirm delivery|确认已送达/)
    expect(drawerText).toMatch(/Remove from history|从记录中移除/)
    expect(drawerText).toMatch(/Save to Wallet|保存到 Wallet/)
    expect(drawerText).toMatch(
      /Nothing is saved to Wallet until you choose Record\.|选择“记录”前，不会保存到 Wallet/,
    )
    expect(wrapper.get(`[data-testid="food-delivery-order-items-${order.id}"]`).text()).toContain(
      menuItem.title,
    )
    expect(
      wrapper.get(`[data-testid="food-delivery-order-items-${order.id}"]`).classes(),
    ).toContain('[overflow-wrap:anywhere]')
    expect(drawerText).not.toMatch(INTERNAL_DELIVERY_DIAGNOSTIC_COPY)
    expect(wrapper.find('[data-testid="food-delivery-map-boundary"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="food-delivery-map-handoff-address"]').classes()).toContain(
      'min-w-0',
    )
    expect(wrapper.get('[data-testid="food-delivery-map-handoff-address"]').html()).toContain(
      '[overflow-wrap:anywhere]',
    )

    const checkForUpdate = wrapper.get(`[data-testid="food-delivery-trigger-event-${order.id}"]`)
    const confirmDelivery = wrapper.get(`[data-testid="food-delivery-mark-delivered-${order.id}"]`)
    const removeFromHistory = wrapper.get(`[data-testid="food-delivery-delete-order-${order.id}"]`)
    for (const control of [checkForUpdate, confirmDelivery, removeFromHistory]) {
      expect(control.classes()).toContain('min-h-11')
      expect(control.classes()).toContain('focus-visible:ring-2')
      expect(control.classes()).toContain('motion-reduce:transition-none')
      expect(control.classes()).toContain('[overflow-wrap:anywhere]')
    }

    simulationStore.setModuleEventsEnabled('food_delivery', false)
    await checkForUpdate.trigger('click')
    await flushPromises()
    expect(store.findOrderById(order.id).events).toHaveLength(0)
    expect(wrapper.get('[data-testid="food-delivery-event-feedback"]').text()).toMatch(
      /Delivery updates are unavailable right now\.|配送更新当前不可用。/,
    )
    expect(
      wrapper.get('[data-testid="food-delivery-event-feedback"]').attributes('aria-live'),
    ).toBe('polite')

    wrapper.unmount()
  })

  test('suggests delivered food orders for explicit Wallet expense recording', async () => {
    const router = createTestRouter()
    const store = useFoodDeliveryStore()
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const walletStore = useWalletStore()
    store.resetForTesting()
    relationshipRuntimeStore.resetForTesting()
    walletStore.resetForTesting()
    const activeRestaurant = store.upsertRestaurant({
      id: 'food_wallet_shop',
      name: 'Wallet Kitchen',
      category: 'restaurants',
      deliveryFee: '4.00',
    })
    const menuItem = store.upsertMenuItem({
      id: 'food_wallet_item',
      restaurantId: activeRestaurant.id,
      title: 'Wallet Meal',
      price: '36.00',
    })
    store.addToCart(menuItem.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Wallet Address',
      note: 'Wallet food order.',
    })

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${activeRestaurant.id}&entry=shop`,
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    expect(
      wrapper.find(`[data-testid="food-delivery-wallet-suggestion-${order.id}"]`).exists(),
    ).toBe(false)

    await wrapper.get(`[data-testid="food-delivery-mark-delivered-${order.id}"]`).trigger('click')
    await flushPromises()

    expect(store.orders[0]?.status).toBe('delivered')
    expect(
      wrapper.get(`[data-testid="food-delivery-wallet-suggestion-${order.id}"]`).text(),
    ).toContain(activeRestaurant.name)
    expect(walletStore.transactionCount).toBe(0)
    expect(wrapper.get('[data-testid="food-delivery-wallet-suggestions"]').text()).toMatch(
      /Save to Wallet|保存到 Wallet/,
    )
    expect(wrapper.get('[data-testid="food-delivery-wallet-suggestions"]').text()).toMatch(
      /Nothing is saved to Wallet until you choose Record\.|选择“记录”前，不会保存到 Wallet/,
    )

    const sharedMealContact = chatStore.getContactById(1)
    const sharedMealSelect = wrapper.get(
      `[data-testid="food-delivery-shared-meal-contact-${order.id}"]`,
    )
    expect(sharedMealSelect.attributes('aria-label')).toMatch(
      /Choose shared-meal contact|选择共享用餐联系人/,
    )
    await sharedMealSelect.setValue('1')
    await flushPromises()
    expect(
      wrapper.get(`[data-testid="food-delivery-relationship-suggestion-${order.id}"]`).text(),
    ).toContain(sharedMealContact.name)

    await wrapper.get(`[data-testid="food-delivery-transfer-wallet-${order.id}"]`).trigger('click')
    await flushPromises()

    const transaction = walletStore.findTransactionBySource(
      'food_delivery_wallet_expense',
      order.id,
    )
    const relationshipSummary = relationshipRuntimeStore.summarizeEntityForTarget({
      profileId: sharedMealContact.profileId,
      contactId: sharedMealContact.id,
      name: sharedMealContact.name,
    })
    expect(transaction).toMatchObject({
      type: 'expense',
      title: 'Food Delivery order',
      counterparty: activeRestaurant.name,
      sourceModule: 'food_delivery_wallet_expense',
      sourceId: order.id,
      quoteSnapshot: order.quoteSnapshot,
    })
    expect(relationshipSummary.metrics.affinity).toBe(56)
    expect(relationshipSummary.metrics.intimacy).toBe(25)
    expect(relationshipSummary.latestEventSummary).toContain('Shared meal')
    expect(relationshipSummary.memorySummaries).toHaveLength(1)
    expect(relationshipSummary.memorySummaries[0]).toMatchObject({
      supportingCount: 2,
      primarySourceModule: 'relationship_food_delivery_shared_meal',
    })
    expect(relationshipSummary.memorySummaries[0].sourceModules).toContain(
      'relationship_wallet_order_support',
    )
    expect(
      wrapper
        .get(`[data-testid="food-delivery-transfer-wallet-${order.id}"]`)
        .attributes('disabled'),
    ).toBeDefined()
    expect(
      wrapper.get(`[data-testid="food-delivery-transfer-wallet-${order.id}"]`).classes(),
    ).toEqual(
      expect.arrayContaining(['min-h-11', 'focus-visible:ring-2', 'motion-reduce:transition-none']),
    )
    await wrapper.get(`[data-testid="food-delivery-transfer-wallet-${order.id}"]`).trigger('click')
    await flushPromises()
    expect(walletStore.transactionCount).toBe(1)
    wrapper.unmount()
  })

  test('deletes a food order and clears its relationship runtime facts', async () => {
    const router = createTestRouter()
    const store = useFoodDeliveryStore()
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const walletStore = useWalletStore()
    store.resetForTesting()
    relationshipRuntimeStore.resetForTesting()
    walletStore.resetForTesting()
    const activeRestaurant = store.upsertRestaurant({
      id: 'food_delete_shop',
      name: 'Delete Kitchen',
      category: 'restaurants',
    })
    const menuItem = store.upsertMenuItem({
      id: 'food_delete_item',
      restaurantId: activeRestaurant.id,
      title: 'Delete Meal',
      price: '28.00',
    })
    store.addToCart(menuItem.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Delete Address',
      note: 'Delete food order.',
    })
    const sharedMealContact = chatStore.getContactById(1)
    store.updateOrderStatus(order.id, FOOD_DELIVERY_ORDER_STATUS.DELIVERED)

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${activeRestaurant.id}&entry=shop`,
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get(`[data-testid="food-delivery-shared-meal-contact-${order.id}"]`).setValue('1')
    await flushPromises()
    await wrapper.get(`[data-testid="food-delivery-transfer-wallet-${order.id}"]`).trigger('click')
    await flushPromises()

    expect(
      relationshipRuntimeStore.summarizeEntityForTarget({
        profileId: sharedMealContact.profileId,
        contactId: sharedMealContact.id,
        name: sharedMealContact.name,
      }).exists,
    ).toBe(true)

    expect(wrapper.get(`[data-testid="food-delivery-delete-order-${order.id}"]`).text()).toMatch(
      /Remove from history|从记录中移除/,
    )
    await wrapper.get(`[data-testid="food-delivery-delete-order-${order.id}"]`).trigger('click')
    await flushPromises()

    expect(store.findOrderById(order.id)).toBeNull()
    expect(wrapper.find(`[data-testid="food-delivery-order-${order.id}"]`).exists()).toBe(false)
    expect(relationshipRuntimeStore.events).toHaveLength(0)
    expect(
      relationshipRuntimeStore.summarizeEntityForTarget({
        profileId: sharedMealContact.profileId,
        contactId: sharedMealContact.id,
        name: sharedMealContact.name,
      }).exists,
    ).toBe(false)
    wrapper.unmount()
  })

  test('persists relationship binding on checkout when provided by the caller', async () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()
    const activeRestaurant = store.upsertRestaurant({
      id: 'food_binding_shop',
      name: 'Binding Kitchen',
      category: 'restaurants',
      deliveryFee: '4.00',
    })
    const menuItem = store.upsertMenuItem({
      id: 'food_binding_item',
      restaurantId: activeRestaurant.id,
      title: 'Binding Meal',
      price: '30.00',
    })

    store.addToCart(menuItem.id)
    store.checkoutCart({
      deliveryAddress: 'Studio Street 9',
      note: 'Shared meal route.',
      relationshipBinding: {
        contactId: 1,
        profileId: 1,
        kind: 'role',
        name: 'Aki',
        sourceModule: 'chat',
        sourceId: '1',
      },
    })

    expect(store.orders[0]?.relationshipBinding).toMatchObject({
      contactId: 1,
      profileId: 1,
      name: 'Aki',
      sourceModule: 'chat',
      sourceId: '1',
    })
  })

  test('creates custom restaurant and menu images from URL and Gallery sources', async () => {
    const router = createTestRouter()
    const galleryStore = useGalleryStore()
    galleryStore.resetForTesting()
    const imported = galleryStore.importAssetFromUrl({
      url: 'https://example.com/food-gallery.png',
      name: 'Food Gallery',
      category: 'reference',
    })

    await router.push(
      '/food-delivery?category=restaurants&entry=shop&createShop=1&bindingTarget=food_delivery&source=app_store',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    await wrapper
      .get('[data-testid="food-delivery-custom-restaurant-name"]')
      .setValue('Orbit Kitchen')
    await wrapper
      .get('[data-testid="food-delivery-custom-restaurant-category"]')
      .setValue('restaurants')
    await wrapper.get('[data-testid="food-delivery-custom-restaurant-cuisine"]').setValue('Fusion')
    await wrapper.get('[data-testid="food-delivery-custom-restaurant-fee"]').setValue('7.00')
    await wrapper.get('[data-testid="food-delivery-custom-restaurant-distance"]').setValue('3.2')
    await wrapper.get('[data-testid="food-delivery-custom-restaurant-eta"]').setValue('28')
    await wrapper
      .get('[data-testid="food-delivery-custom-restaurant-address"]')
      .setValue('Orbit Street 1')
    await wrapper
      .get('[data-testid="food-delivery-custom-restaurant-image-source"]')
      .setValue('url')
    await wrapper
      .get('[data-testid="food-delivery-custom-restaurant-image-url"]')
      .setValue('https://example.com/orbit-kitchen.png')
    await wrapper.get('[data-testid="food-delivery-create-restaurant"]').trigger('click')
    await flushPromises()

    const restaurant = store.restaurants.find((item) => item.name === 'Orbit Kitchen')
    expect(restaurant).toMatchObject({
      category: 'restaurants',
      cuisine: 'Fusion',
      sourceModule: 'food_delivery_user_custom_restaurant',
      image: {
        sourceType: 'url',
        url: 'https://example.com/orbit-kitchen.png',
      },
    })
    expect(imported.ok).toBe(true)
    await wrapper
      .get('[data-testid="food-delivery-custom-menu-restaurant"]')
      .setValue(restaurant.id)
    await wrapper.get('[data-testid="food-delivery-custom-menu-title"]').setValue('Orbit Bento')
    await wrapper.get('[data-testid="food-delivery-custom-menu-price"]').setValue('48.00')
    await wrapper.get('[data-testid="food-delivery-custom-menu-category"]').setValue('restaurants')
    await wrapper.get('[data-testid="food-delivery-custom-menu-image-source"]').setValue('gallery')
    await wrapper
      .get('[data-testid="food-delivery-custom-menu-gallery-asset"]')
      .setValue(imported.assetId)
    await wrapper.get('[data-testid="food-delivery-create-menu"]').trigger('click')
    await flushPromises()

    const menuItem = store.menuItems.find((item) => item.title === 'Orbit Bento')
    expect(menuItem).toMatchObject({
      restaurantId: restaurant.id,
      category: 'restaurants',
      sourceModule: 'food_delivery_user_custom_menu',
      image: {
        sourceType: 'gallery',
        galleryAssetId: imported.assetId,
      },
    })

    await router.push(
      `/food-delivery?category=restaurants&restaurantId=${restaurant.id}&entry=shop`,
    )
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-store-shell"] img').attributes('src')).toBe(
      'https://example.com/orbit-kitchen.png',
    )
    expect(
      wrapper.get(`[data-testid="food-delivery-menu-${menuItem.id}"] img`).attributes('src'),
    ).toBe('https://example.com/food-gallery.png')
    wrapper.unmount()
  })

  test('shows App Store shop creation handoff without moving restaurant ownership', async () => {
    const router = createTestRouter()
    await router.push(
      '/food-delivery?category=restaurants&entry=shop&createShop=1&bindingTarget=food_delivery&source=app_store',
    )
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.get('[data-testid="food-delivery-app-store-create-banner"]').text()).toContain(
      'Food Delivery creates the real restaurant',
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-app-store-create-banner"]')
        .attributes('data-binding-target'),
    ).toBe('food_delivery')
    expect(wrapper.find('[data-testid="food-delivery-custom-restaurant-name"]').exists()).toBe(true)

    wrapper.unmount()
  })
})
