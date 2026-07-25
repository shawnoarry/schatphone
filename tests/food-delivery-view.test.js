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
import { useSystemStore } from '../src/stores/system'
import { useWalletStore } from '../src/stores/wallet'
import FoodDeliveryView from '../src/views/FoodDeliveryView.vue'

const DummyView = { template: '<div />' }

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

    expect(wrapper.get('[data-testid="food-delivery-pseudo-folder-home"]').text()).toMatch(
      /Platform|平台/,
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-entry"]').text()).toMatch(
      /Platform|平台/,
    )
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
    expect(wrapper.get('[data-testid="food-delivery-platform-banner-rail"]').text()).toContain(
      '免配送权益',
    )
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
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-dialog"]').exists()).toBe(
      true,
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-detail"]').text()).toContain(
      '寿司花',
    )
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-menu"]').text()).toContain(
      '花见十二贯',
    )

    await wrapper.get('[data-testid="food-delivery-platform-merchant-close"]').trigger('click')
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
      'merchant-logo-morning-bagel-01.png',
    )
    expect(bagelCover.attributes('data-merchant-visual-type')).toBe('logo')
    expect(bagelCover.get('img').attributes('src')).toContain('merchant-logo-morning-bagel-01.png')
    const logoMerchantContracts = [
      ['platform_berry_morning', 'merchant-logo-berry-morning-01.png'],
      ['platform_green_basket', 'merchant-logo-green-basket-01.png'],
      ['platform_golden_chicken', 'merchant-logo-morning-bagel-01.png'],
      ['platform_nori_table', 'merchant-logo-elm-dim-sum-01.png'],
    ]
    for (const [merchantId, fileName] of logoMerchantContracts) {
      const cover = wrapper.get(
        `[data-testid="food-delivery-platform-merchant-card-${merchantId}"]`,
      )
      expect(cover.attributes('data-merchant-visual-type')).toBe('logo')
      expect(cover.attributes('data-required-asset')).toContain(fileName)
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
      const menu = wrapper.get('[data-testid="food-delivery-platform-merchant-menu"]')
      const imageSlots = menu.findAll('[data-platform-menu-image]')
      expect(imageSlots).toHaveLength(5)
      expect(imageSlots[0].attributes('data-required-asset')).toBe(
        `platform/menus/${assetKey}/menu-item-01.png`,
      )
      expect(imageSlots[4].attributes('data-required-asset')).toBe(
        `platform/menus/${assetKey}/menu-item-05.png`,
      )
      await wrapper.get('[data-testid="food-delivery-platform-merchant-close"]').trigger('click')
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
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-detail"]').text()).toContain(
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
    expect(wrapper.find('[data-testid="food-delivery-platform-merchant-dialog"]').exists()).toBe(
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
    ).toContain('missing-asset-placeholder.svg')
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
    expect(wrapper.find('[data-testid="food-delivery-platform-merchant-dialog"]').exists()).toBe(
      false,
    )
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
    ).toContain('missing-asset-placeholder.svg')
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
    ).toContain('missing-asset-placeholder.svg')
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
    expect(wrapper.get('[data-testid="food-delivery-platform-merchant-detail"]').text()).toContain(
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

  test('returns to the originating Home page when opened from a Home folder', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby&from=home&homePage=1')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="food-delivery-go-home"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
    expect(router.currentRoute.value.query.homePage).toBe('1')
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
    await flushPromises()

    expect(store.primaryCurrency).toBe('EUR')
    expect(wrapper.get(`[data-testid="food-delivery-menu-tray-${menuItem.id}"]`).text()).toContain(
      'EUR',
    )

    await wrapper.get(`[data-testid="food-delivery-add-${menuItem.id}"]`).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-cart-panel"]').text()).toContain('EUR')
    expect(store.cartPrimaryTotal.currency).toBe('EUR')
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
    const peachCloudMenu = store.listMenuByRestaurant('food_seed_peach_cloud')
    const teaItem = peachCloudMenu.find((item) => item.menuSection === 'cloud_tea')

    expect(
      wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template'),
    ).toBe('dessert_window')
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').classes()).toContain(
      'food-delivery-store-peach-cloud',
    )
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-featured"]').text()).toContain(
      'Golden Hour Pairing',
    )
    expect(
      wrapper
        .get('[data-testid="food-delivery-store-cover"] img')
        .attributes('data-required-asset'),
    ).toBe('peach-cloud/cover/peach-cloud-hero-01.png')
    expect(
      wrapper
        .get('[data-testid="food-delivery-peach-cloud-header-profile"] img')
        .attributes('data-required-asset'),
    ).toBe('peach-cloud/brand/peach-cloud-mark-01.svg')
    expect(wrapper.findAll('[data-testid^="food-delivery-menu-"][data-menu-section]')).toHaveLength(
      12,
    )
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-nav"]').exists()).toBe(true)

    await wrapper.get('[data-testid="food-delivery-peach-cloud-nav-cart"]').trigger('click')
    expect(wrapper.get('[data-testid="food-delivery-store-nav-feedback"]').text()).toContain(
      'bag is empty',
    )

    await wrapper.get('[data-testid="food-delivery-peach-cloud-featured-action"]').trigger('click')
    await flushPromises()
    expect(
      wrapper
        .get('[data-testid="food-delivery-store-menu-items"]')
        .attributes('data-active-section'),
    ).toBe('seasonal_drop')
    expect(wrapper.findAll('[data-testid^="food-delivery-menu-"][data-menu-section]')).toHaveLength(
      1,
    )

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
    expect(wrapper.get('[data-testid="food-delivery-cart-panel"]').text()).toContain(teaItem.title)
    expect(wrapper.get('[data-testid="food-delivery-peach-cloud-nav"]').exists()).toBe(true)
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
    expect(mapContext.text()).toContain('Map route context')
    expect(mapContext.text()).toContain('Food Delivery')
    expect(mapContext.text()).toContain('Map Pin A')
    expect(mapContext.text()).toContain('42 min')
    expect(mapContext.text()).toContain('does not start a trip')
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
    expect(wrapper.get('[data-testid="food-delivery-event-feedback"]').text()).toContain(
      'Delivery event added',
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

    const sharedMealContact = chatStore.getContactById(1)
    await wrapper.get(`[data-testid="food-delivery-shared-meal-contact-${order.id}"]`).setValue('1')
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
