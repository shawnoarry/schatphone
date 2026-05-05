<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useFoodDeliveryStore } from '../stores/foodDelivery'
import {
  FOOD_DELIVERY_CATEGORY_ENTRIES,
  FOOD_DELIVERY_SOURCE_KEYS,
  findFoodDeliveryCategory,
} from '../lib/planned-module-registry'

const route = useRoute()
const router = useRouter()
const { t, languageBase } = useI18n()
const foodDeliveryStore = useFoodDeliveryStore()

const activeCategoryKey = computed(() =>
  typeof route.query.category === 'string' ? route.query.category : 'restaurants',
)
const activeCategory = computed(() => findFoodDeliveryCategory(activeCategoryKey.value))

const categoryCards = computed(() =>
  FOOD_DELIVERY_CATEGORY_ENTRIES.map((entry) => ({
    ...entry,
    label: languageBase.value === 'zh' ? entry.zh : entry.en,
    desc: languageBase.value === 'zh' ? entry.descZh : entry.descEn,
    active: entry.key === activeCategory.value?.key,
  })),
)

const sourcePlan = computed(() => [
  {
    key: FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH,
    title: t('外卖服务号推送', 'Food delivery service pushes'),
    desc: t(
      '外卖通知服务号承载接单、备餐、骑手取餐、送达和异常提醒。',
      'The food delivery service account carries accepted, cooking, rider pickup, delivered, and exception alerts.',
    ),
  },
  {
    key: FOOD_DELIVERY_SOURCE_KEYS.MAP_RESTAURANT_LOCATION,
    title: t('Map 餐厅位置', 'Map restaurant location'),
    desc: t(
      'Map 提供餐厅位置、配送地址、附近筛选和距离判断，但不拥有外卖订单。',
      'Map provides restaurant location, delivery address, nearby filters, and distance context without owning food orders.',
    ),
  },
  {
    key: FOOD_DELIVERY_SOURCE_KEYS.MAP_COURIER_ROUTE,
    title: t('Map 骑手路线 / ETA', 'Map courier route / ETA'),
    desc: t(
      '后续骑手路线、预计送达和取餐点可进入 Map 行程系统。',
      'Courier route, ETA, and pickup points can later become Map trip context.',
    ),
  },
  {
    key: FOOD_DELIVERY_SOURCE_KEYS.WALLET_EXPENSE,
    title: t('Wallet 外卖支出', 'Wallet food expense'),
    desc: t(
      'Wallet 可记录外卖消费流水，但外卖订单仍归外卖模块。',
      'Wallet can record food-delivery expenses while food orders remain owned by Food Delivery.',
    ),
  },
])

const activeCategoryLabel = computed(() =>
  languageBase.value === 'zh' ? activeCategory.value.zh : activeCategory.value.en,
)
const activeCategoryDesc = computed(() =>
  languageBase.value === 'zh' ? activeCategory.value.descZh : activeCategory.value.descEn,
)
const activeRestaurants = computed(() => {
  const restaurants = foodDeliveryStore.listRestaurantsByCategory(activeCategory.value?.key)
  if (restaurants.length > 0) return restaurants
  return foodDeliveryStore.restaurants.slice(0, 4)
})
const activeRestaurant = computed(() => activeRestaurants.value[0] || foodDeliveryStore.restaurants[0] || null)
const activeMenuItems = computed(() =>
  activeRestaurant.value ? foodDeliveryStore.listMenuByRestaurant(activeRestaurant.value.id) : [],
)
const recentOrders = computed(() => foodDeliveryStore.recentOrders)

const openCategory = (key) => {
  router.push({
    path: '/food-delivery',
    query: { category: key },
  })
}

const addMenuItemToCart = (menuItemId) => {
  foodDeliveryStore.addToCart(menuItemId, 1, {
    sourceModule: FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH,
  })
}

const checkoutFoodDelivery = () => {
  foodDeliveryStore.checkoutCart({
    deliveryAddress: t('Map 当前配送地址', 'Current Map delivery address'),
    note: t('外卖模块基础订单', 'Food Delivery baseline order'),
  })
}

const goHome = () => {
  router.push('/home')
}
</script>

<template>
  <div class="min-h-screen bg-[#fff8ed] p-4 text-gray-950">
    <div class="mx-auto max-w-md space-y-4">
      <section class="rounded-[2rem] bg-gradient-to-br from-orange-400 via-amber-300 to-lime-200 p-5 text-white shadow-xl">
        <button
          class="mb-4 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white"
          @click="goHome"
        >
          ← {{ t('Home', 'Home') }}
        </button>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
          Food Delivery
        </p>
        <h1 class="mt-2 text-3xl font-black">{{ t('外卖', 'Food Delivery') }}</h1>
        <p class="mt-2 text-sm leading-6 text-white/85">
          {{
            t(
              '外卖模块使用主屏文件夹式入口，后续可在内部建立不同餐厅分类；订单归外卖，位置与路线由 Map 提供上下文。',
              'Food Delivery uses the Home folder pattern. It can later host restaurant categories while orders stay here and Map provides location/route context.',
            )
          }}
        </p>
      </section>

      <section class="rounded-3xl border border-orange-100 bg-white p-4" data-testid="food-delivery-category-panel">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold">{{ t('当前分类', 'Active category') }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ activeCategoryLabel }}</p>
          </div>
          <span class="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
            {{ activeCategory.key }}
          </span>
        </div>
        <p class="mt-3 rounded-2xl bg-orange-50 p-3 text-xs leading-5 text-orange-700">
          {{ activeCategoryDesc }}
        </p>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            v-for="category in categoryCards"
            :key="category.key"
            class="rounded-2xl border p-3 text-left transition"
            :class="category.active ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-gray-50'"
            :data-testid="`food-delivery-category-${category.key}`"
            @click="openCategory(category.key)"
          >
            <span
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white"
              :class="category.active ? 'bg-orange-500' : 'bg-gray-900'"
            >
              <i :class="category.icon"></i>
            </span>
            <p class="mt-2 text-xs font-bold">{{ category.label }}</p>
            <p class="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500">{{ category.desc }}</p>
          </button>
        </div>
      </section>

      <section class="rounded-3xl border border-orange-100 bg-white p-4" data-testid="food-delivery-data-baseline">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold">{{ t('餐厅与菜单基线', 'Restaurant and menu baseline') }}</p>
            <p class="mt-1 text-xs text-gray-500">
              {{ foodDeliveryStore.restaurantCount }} {{ t('家餐厅', 'restaurant(s)') }} ·
              {{ foodDeliveryStore.menuItemCount }} {{ t('个菜单项', 'menu item(s)') }}
            </p>
          </div>
          <span class="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
            {{ t('本地数据', 'Local data') }}
          </span>
        </div>

        <div class="mt-3 grid gap-2">
          <article
            v-for="restaurant in activeRestaurants"
            :key="restaurant.id"
            class="rounded-2xl border border-orange-100 bg-orange-50/60 p-3"
            :data-testid="`food-delivery-restaurant-${restaurant.id}`"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-bold">{{ restaurant.name }}</p>
                <p class="mt-1 text-[11px] text-orange-700">
                  {{ restaurant.cuisine || restaurant.category }} · {{ restaurant.rating.toFixed(1) }} ★ ·
                  {{ restaurant.deliveryEtaMinutes }} min · {{ restaurant.distanceKm }} km
                </p>
              </div>
              <span class="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-orange-600">
                {{ restaurant.deliveryFee }} {{ restaurant.currency }}
              </span>
            </div>
          </article>
        </div>

        <div v-if="activeRestaurant" class="mt-4 rounded-2xl bg-gray-50 p-3" data-testid="food-delivery-menu-panel">
          <p class="text-xs font-bold">
            {{ t('当前菜单', 'Current menu') }} · {{ activeRestaurant.name }}
          </p>
          <div class="mt-2 space-y-2">
            <article
              v-for="item in activeMenuItems"
              :key="item.id"
              class="flex items-center justify-between gap-3 rounded-xl bg-white p-2"
              :data-testid="`food-delivery-menu-${item.id}`"
            >
              <div class="min-w-0">
                <p class="truncate text-xs font-semibold">{{ item.title }}</p>
                <p class="text-[11px] text-gray-500">{{ item.price }} {{ item.currency }}</p>
              </div>
              <button
                class="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold text-white"
                :data-testid="`food-delivery-add-${item.id}`"
                @click="addMenuItemToCart(item.id)"
              >
                {{ t('加入', 'Add') }}
              </button>
            </article>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-amber-100 bg-white p-4" data-testid="food-delivery-cart-panel">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold">{{ t('外卖购物车', 'Food cart') }}</p>
            <p class="mt-1 text-xs text-gray-500">
              {{ foodDeliveryStore.cartQuantity }} {{ t('份餐品', 'item(s)') }}
            </p>
          </div>
          <span class="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
            {{ foodDeliveryStore.cartPrimaryTotal.amount }} {{ foodDeliveryStore.cartPrimaryTotal.currency }}
          </span>
        </div>
        <div v-if="foodDeliveryStore.cartLineItems.length > 0" class="mt-3 space-y-2">
          <article
            v-for="line in foodDeliveryStore.cartLineItems"
            :key="line.menuItemId"
            class="rounded-2xl bg-amber-50/70 p-3"
            :data-testid="`food-delivery-cart-${line.menuItemId}`"
          >
            <p class="text-xs font-bold">{{ line.menuItem.title }} × {{ line.quantity }}</p>
            <p class="mt-1 text-[11px] text-amber-700">{{ line.subtotal }} {{ line.currency }}</p>
          </article>
          <button
            class="w-full rounded-2xl bg-gray-950 px-4 py-3 text-sm font-bold text-white"
            data-testid="food-delivery-checkout"
            @click="checkoutFoodDelivery"
          >
            {{ t('生成外卖订单', 'Create food order') }}
          </button>
        </div>
        <p v-else class="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">
          {{ t('先从菜单里加入一份餐品，订单仍归外卖模块，位置与 ETA 后续由 Map 提供。', 'Add a menu item first. Orders stay in Food Delivery; Map can provide location and ETA later.') }}
        </p>
      </section>

      <section class="rounded-3xl border border-gray-100 bg-white p-4" data-testid="food-delivery-orders-panel">
        <p class="text-sm font-bold">{{ t('最近外卖订单', 'Recent food orders') }}</p>
        <div v-if="recentOrders.length > 0" class="mt-3 space-y-2">
          <article
            v-for="order in recentOrders"
            :key="order.id"
            class="rounded-2xl bg-gray-50 p-3"
            :data-testid="`food-delivery-order-${order.id}`"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-xs font-bold">{{ order.restaurantName }}</p>
                <p class="mt-1 text-[11px] text-gray-500">
                  {{ order.itemCount }} {{ t('份', 'item(s)') }} · {{ order.status }}
                </p>
              </div>
              <span class="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-gray-700">
                {{ order.totalCents / 100 }} {{ order.currency }}
              </span>
            </div>
          </article>
        </div>
        <p v-else class="mt-3 rounded-2xl bg-gray-50 p-3 text-xs leading-5 text-gray-500">
          {{ t('还没有外卖订单。', 'No food orders yet.') }}
        </p>
      </section>

      <section class="rounded-3xl border border-lime-100 bg-white p-4" data-testid="food-delivery-map-boundary">
        <p class="text-sm font-bold">{{ t('Map 对接边界', 'Map handoff boundary') }}</p>
        <p class="mt-2 text-xs leading-5 text-gray-500">
          {{
            t(
              '外卖可消费 Map 的餐厅位置、配送地址、附近筛选、骑手路线和 ETA；Map 不创建外卖订单，也不接管支付或商家状态。',
              'Food Delivery may consume restaurant location, delivery address, nearby filters, courier route, and ETA from Map; Map does not create food orders or own payment/merchant state.',
            )
          }}
        </p>
        <div class="mt-3 space-y-2">
          <article
            v-for="item in sourcePlan"
            :key="item.key"
            class="rounded-2xl bg-lime-50/70 p-3"
            :data-testid="`food-delivery-source-${item.key}`"
          >
            <p class="text-xs font-bold text-lime-800">{{ item.title }}</p>
            <p class="mt-1 text-[11px] leading-4 text-lime-700">{{ item.desc }}</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
