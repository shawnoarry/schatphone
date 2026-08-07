import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import FoodDeliveryJadeHearthApp from '../src/components/FoodDeliveryJadeHearthApp.vue'
import { useSystemStore } from '../src/stores/system'

const restaurant = {
  id: 'food_custom_lotus_room',
  name: 'Lotus Room',
  rating: 4.8,
  image: { sourceType: 'url', url: '', alt: '' },
}

const createMenuItem = (id, menuSection, title) => ({
  id,
  menuSection,
  title,
  desc: `${title} description`,
  ingredients: `${title} ingredients`,
  price: '28.00',
  currency: 'CNY',
  image: { sourceType: 'url', url: '', alt: title },
})

const menuItems = [
  createMenuItem('custom_house_first', 'house_table', 'House First'),
  createMenuItem('custom_house_second', 'house_table', 'House Second'),
  createMenuItem('custom_house_third', 'house_table', 'House Third'),
  createMenuItem('custom_small_first', 'small_plates', 'Small First'),
  createMenuItem('custom_small_second', 'small_plates', 'Small Second'),
  createMenuItem('custom_wok_first', 'wok_favorites', 'Wok First'),
  createMenuItem('custom_claypot_first', 'claypot', 'Claypot First'),
  createMenuItem('custom_rice_first', 'rice_noodles', 'Rice First'),
  createMenuItem('custom_rice_second', 'rice_noodles', 'Rice Second'),
  createMenuItem('custom_sweet_first', 'tea_sweets', 'Sweet First'),
  createMenuItem('custom_sweet_second', 'tea_sweets', 'Sweet Second'),
]

const baseProps = {
  restaurant,
  displayName: 'Lotus Room',
  shortDescription: 'Seasonal Chinese table cooking.',
  menuItems,
  etaText: '25-35 min',
  feeText: '4.00 CNY',
  distanceText: '2.1 km',
  deliveryAddress: '88 Garden Road',
}

describe('FoodDeliveryJadeHearthApp', () => {
  let pinia

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    useSystemStore().settings.system.language = 'en-US'
  })

  test('builds feast collections from current menu sections without Jade item ids', async () => {
    const wrapper = mount(FoodDeliveryJadeHearthApp, {
      props: { ...baseProps, page: 'feast' },
      global: { plugins: [pinia] },
    })

    const collections = wrapper
      .get('[data-testid="food-delivery-jade-feast-page"]')
      .findAll('article')

    expect(collections).toHaveLength(3)
    expect(collections[0].text()).toContain('House Second')
    expect(collections[0].text()).toContain('Claypot First')
    expect(collections[0].text()).toContain('Small Second')
    expect(collections[1].text()).toContain('House First')
    expect(collections[1].text()).toContain('House Third')
    expect(collections[1].text()).toContain('Wok First')
    expect(collections[1].text()).toContain('Rice First')
    expect(collections[2].text()).toContain('Rice Second')
    expect(collections[2].text()).toContain('Sweet First')
    expect(collections[2].text()).toContain('Sweet Second')

    await wrapper.get('[data-testid="food-delivery-add-custom_house_second"]').trigger('click')
    expect(wrapper.emitted('add-item')?.[0]?.slice(0, 2)).toEqual(['custom_house_second', 1])

    wrapper.unmount()
  })

  test('uses the current display name across the table-menu brand surfaces', async () => {
    const wrapper = mount(FoodDeliveryJadeHearthApp, {
      props: { ...baseProps, page: 'home' },
      global: { plugins: [pinia] },
    })

    expect(wrapper.text()).toContain('Lotus Room')
    expect(wrapper.get('[data-testid="food-delivery-jade-hero"] [aria-hidden="true"]').text()).toBe(
      'L',
    )
    expect(wrapper.text()).not.toMatch(/Jade Hearth|青炉/u)

    await wrapper.setProps({ page: 'menu' })
    expect(wrapper.get('[data-testid="food-delivery-jade-menu-page"]').text()).toContain(
      'LOTUS ROOM MENU',
    )
    expect(wrapper.text()).not.toMatch(/THE JADE CARD|青炉/u)

    await wrapper.setProps({ page: 'orders' })
    expect(wrapper.get('[data-testid="food-delivery-jade-orders-page"]').text()).toContain(
      'No Lotus Room orders yet',
    )

    useSystemStore().settings.system.language = 'zh-CN'
    await nextTick()
    expect(wrapper.get('[data-testid="food-delivery-jade-orders-page"]').text()).toContain(
      '还没有Lotus Room订单',
    )
    expect(wrapper.text()).not.toContain('青炉')

    wrapper.unmount()
  })

  test('uses chapter navigation and paper-banquet dish controls instead of generic round adds', async () => {
    const wrapper = mount(FoodDeliveryJadeHearthApp, {
      props: { ...baseProps, page: 'menu' },
      global: { plugins: [pinia] },
    })

    expect(wrapper.find('[data-testid="food-delivery-store-menu-section-all"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.get('[data-testid="food-delivery-store-menu-section-rail"]').attributes('tabindex'),
    ).toBe('0')
    expect(
      wrapper
        .get('[data-testid="food-delivery-menu-custom_house_first"]')
        .attributes('data-menu-card-style'),
    ).toBe('paper-banquet-entry')
    const addDish = wrapper.get('[data-testid="food-delivery-add-custom_house_first"]')
    expect(addDish.text()).toContain('Add dish')
    expect(addDish.classes()).not.toContain('rounded-full')

    await wrapper
      .get('[data-testid="food-delivery-store-menu-section-small_plates"]')
      .trigger('click')
    expect(wrapper.find('[data-testid="food-delivery-menu-custom_house_first"]').exists()).toBe(
      false,
    )
    expect(wrapper.find('[data-testid="food-delivery-menu-custom_small_first"]').exists()).toBe(
      true,
    )

    wrapper.unmount()
  })
})
