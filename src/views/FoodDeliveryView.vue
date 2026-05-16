<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import ImageSourcePicker from '../components/shared/ImageSourcePicker.vue'
import { useFoodDeliveryStore } from '../stores/foodDelivery'
import { useGalleryStore } from '../stores/gallery'
import { useMapStore } from '../stores/map'
import {
  FOOD_DELIVERY_CATEGORY_ENTRIES,
  FOOD_DELIVERY_SOURCE_KEYS,
  findFoodDeliveryCategory,
} from '../lib/planned-module-registry'
import { pushReturnTarget } from '../lib/navigation-return'

const route = useRoute()
const router = useRouter()
const { t, languageBase } = useI18n()
const foodDeliveryStore = useFoodDeliveryStore()
const galleryStore = useGalleryStore()
const mapStore = useMapStore()
const FOOD_DELIVERY_IMAGE_PREVIEW_SCOPE_ID = 'food-delivery-view'
const foodImagePreviewMap = reactive({})

const customFeedback = ref('')
const restaurantDraft = reactive({
  name: '',
  category: 'restaurants',
  cuisine: '',
  address: '',
  deliveryFee: '',
  distanceKm: '',
  deliveryEtaMinutes: '',
  imageSourceType: 'none',
  imageUrl: '',
  imageGalleryAssetId: '',
})
const menuDraft = reactive({
  restaurantId: '',
  title: '',
  category: 'restaurants',
  price: '',
  desc: '',
  imageSourceType: 'none',
  imageUrl: '',
  imageGalleryAssetId: '',
})

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
const galleryImageOptions = computed(() =>
  galleryStore.assets
    .filter((asset) => ['reference', 'scenario', 'wallpaper'].includes(asset.category))
    .slice(0, 80),
)
const activeMapHandoff = computed(() =>
  mapStore.buildFoodDeliveryMapHandoff({
    restaurant: activeRestaurant.value || {},
    categoryKey: activeCategory.value?.key || '',
  }),
)
const activeMapHandoffRouteSummary = computed(() =>
  languageBase.value === 'zh'
    ? activeMapHandoff.value.routeSummaryZh
    : activeMapHandoff.value.routeSummaryEn,
)
const recentOrders = computed(() => foodDeliveryStore.recentOrders)
const chatSourceOrderId = computed(() =>
  typeof route.query.orderId === 'string' ? route.query.orderId.trim() : '',
)
const isChatFoodDeliverySource = computed(() =>
  route.query.source === 'chat' && route.query.intent === 'food_delivery_order' && Boolean(chatSourceOrderId.value),
)
const chatSourceOrder = computed(() => {
  if (!chatSourceOrderId.value) return null
  return foodDeliveryStore.orders.find((order) => order.id === chatSourceOrderId.value) || null
})

const isHighlightedOrder = (orderId) => isChatFoodDeliverySource.value && orderId === chatSourceOrderId.value

const resetRestaurantDraft = () => {
  restaurantDraft.name = ''
  restaurantDraft.category = activeCategory.value?.key || 'restaurants'
  restaurantDraft.cuisine = ''
  restaurantDraft.address = ''
  restaurantDraft.deliveryFee = ''
  restaurantDraft.distanceKm = ''
  restaurantDraft.deliveryEtaMinutes = ''
  restaurantDraft.imageSourceType = 'none'
  restaurantDraft.imageUrl = ''
  restaurantDraft.imageGalleryAssetId = ''
}

const resetMenuDraft = (restaurantId = activeRestaurant.value?.id || '') => {
  menuDraft.restaurantId = restaurantId
  menuDraft.title = ''
  menuDraft.category = activeCategory.value?.key || activeRestaurant.value?.category || 'restaurants'
  menuDraft.price = ''
  menuDraft.desc = ''
  menuDraft.imageSourceType = 'none'
  menuDraft.imageUrl = ''
  menuDraft.imageGalleryAssetId = ''
}

const createCustomRestaurant = () => {
  customFeedback.value = ''
  const imageSourceType = restaurantDraft.imageSourceType
  const restaurant = foodDeliveryStore.upsertRestaurant({
    name: restaurantDraft.name,
    category: restaurantDraft.category,
    cuisine: restaurantDraft.cuisine,
    address: restaurantDraft.address,
    deliveryFee: restaurantDraft.deliveryFee,
    distanceKm: restaurantDraft.distanceKm,
    deliveryEtaMinutes: restaurantDraft.deliveryEtaMinutes,
    sourceModule: 'food_delivery_user_custom_restaurant',
    imageSourceType,
    imageUrl: imageSourceType === 'url' ? restaurantDraft.imageUrl : '',
    imageGalleryAssetId: imageSourceType === 'gallery' ? restaurantDraft.imageGalleryAssetId : '',
  })
  if (!restaurant) {
    customFeedback.value = t('请输入有效餐厅名称。', 'Please enter a valid restaurant name.')
    return
  }
  customFeedback.value = t('自定义餐厅已加入外卖列表。', 'Custom restaurant added to Food Delivery.')
  resetRestaurantDraft()
  resetMenuDraft(restaurant.id)
  router.push({
    path: '/food-delivery',
    query: { category: restaurant.category },
  })
}

const createCustomMenuItem = () => {
  customFeedback.value = ''
  const restaurantId = menuDraft.restaurantId || activeRestaurant.value?.id || ''
  const restaurant = foodDeliveryStore.findRestaurantById(restaurantId)
  const imageSourceType = menuDraft.imageSourceType
  const item = foodDeliveryStore.upsertMenuItem({
    restaurantId,
    title: menuDraft.title,
    category: menuDraft.category || restaurant?.category || 'restaurants',
    price: menuDraft.price,
    desc: menuDraft.desc,
    sourceModule: 'food_delivery_user_custom_menu',
    imageSourceType,
    imageUrl: imageSourceType === 'url' ? menuDraft.imageUrl : '',
    imageGalleryAssetId: imageSourceType === 'gallery' ? menuDraft.imageGalleryAssetId : '',
  })
  if (!item) {
    customFeedback.value = t('请输入有效菜单名称、餐厅和价格。', 'Please enter a valid menu name, restaurant, and price.')
    return
  }
  customFeedback.value = t('自定义菜单项已加入当前餐厅。', 'Custom menu item added to the restaurant.')
  resetMenuDraft(item.restaurantId)
}

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
  const mapHandoff = activeMapHandoff.value
  foodDeliveryStore.checkoutCart({
    deliveryAddress: mapHandoff.deliveryAddress || t('Map 当前配送地址', 'Current Map delivery address'),
    note: activeMapHandoffRouteSummary.value || t('外卖模块基础订单', 'Food Delivery baseline order'),
    sourceModule: mapHandoff.sourceModule,
    sourceId: mapHandoff.sourceId,
  })
}

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const foodImageUrl = (item) => {
  const image = item?.image || {}
  if (image.sourceType === 'url') return image.url || ''
  if (image.sourceType === 'gallery' && image.galleryAssetId) {
    return foodImagePreviewMap[image.galleryAssetId] || ''
  }
  return ''
}

const foodImageSourceLabel = (item) => {
  const sourceType = item?.image?.sourceType || 'none'
  if (sourceType === 'url') return t('URL image', 'URL image')
  if (sourceType === 'gallery') return t('Gallery asset', 'Gallery asset')
  if (sourceType === 'ai') return t('AI image reserved', 'AI image reserved')
  return t('Default icon', 'Default icon')
}

watch(
  activeCategoryKey,
  () => {
    if (!restaurantDraft.name) restaurantDraft.category = activeCategory.value?.key || 'restaurants'
    if (!menuDraft.title) menuDraft.category = activeCategory.value?.key || 'restaurants'
  },
  { immediate: true },
)

watch(
  () => activeRestaurant.value?.id || '',
  (restaurantId) => {
    if (!menuDraft.restaurantId || !foodDeliveryStore.findRestaurantById(menuDraft.restaurantId)) {
      menuDraft.restaurantId = restaurantId
    }
  },
  { immediate: true },
)

watch(
  () => [
    ...activeRestaurants.value.map((restaurant) => restaurant.image?.galleryAssetId || ''),
    ...activeMenuItems.value.map((item) => item.image?.galleryAssetId || ''),
  ].filter(Boolean),
  (assetIds) => {
    const activeSet = new Set(assetIds)
    assetIds.forEach((assetId) => {
      if (foodImagePreviewMap[assetId]) return
      void galleryStore.getAssetPreviewUrl(assetId, {
        scopeId: FOOD_DELIVERY_IMAGE_PREVIEW_SCOPE_ID,
      }).then((previewUrl) => {
        if (previewUrl) foodImagePreviewMap[assetId] = previewUrl
      })
    })
    Object.keys(foodImagePreviewMap).forEach((assetId) => {
      if (!activeSet.has(assetId)) {
        galleryStore.releaseAssetPreview(assetId, FOOD_DELIVERY_IMAGE_PREVIEW_SCOPE_ID)
        delete foodImagePreviewMap[assetId]
      }
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  galleryStore.releaseAssetPreviewScope(FOOD_DELIVERY_IMAGE_PREVIEW_SCOPE_ID)
  Object.keys(foodImagePreviewMap).forEach((assetId) => {
    delete foodImagePreviewMap[assetId]
  })
})
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

      <section
        v-if="isChatFoodDeliverySource"
        class="rounded-3xl border border-orange-200 bg-orange-50 p-4"
        data-testid="food-delivery-chat-source-banner"
      >
        <p class="text-sm font-bold text-orange-900">
          {{ t('来自 Chat 外卖服务号', 'From Chat food delivery service') }}
        </p>
        <p class="mt-2 text-xs leading-5 text-orange-700">
          <span v-if="chatSourceOrder">
            {{
              t(
                `已定位到 ${chatSourceOrder.restaurantName} 的外卖订单，订单状态仍由 Food Delivery 管理。`,
                `Located the food order from ${chatSourceOrder.restaurantName}. Food Delivery still owns order status.`,
              )
            }}
          </span>
          <span v-else>
            {{
              t(
                '未找到对应外卖订单；可能已被删除或来自其他本地数据快照。',
                'The linked food order was not found. It may have been removed or belongs to another local data snapshot.',
              )
            }}
          </span>
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
            <div class="flex items-start gap-3">
              <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white">
                <img
                  v-if="foodImageUrl(restaurant)"
                  :src="foodImageUrl(restaurant)"
                  :alt="restaurant.image?.alt || restaurant.name"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-orange-500">
                  <i class="fas fa-utensils"></i>
                </div>
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-bold">{{ restaurant.name }}</p>
                <p class="mt-1 text-[11px] text-orange-700">
                  {{ restaurant.cuisine || restaurant.category }} · {{ restaurant.rating.toFixed(1) }} ★ ·
                  {{ restaurant.deliveryEtaMinutes }} min · {{ restaurant.distanceKm }} km
                </p>
                <p class="mt-1 text-[10px] font-semibold text-orange-500">
                  {{ foodImageSourceLabel(restaurant) }}
                </p>
              </div>
              <span class="ml-auto rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-orange-600">
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
              <div class="flex min-w-0 items-center gap-2">
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-orange-50">
                  <img
                    v-if="foodImageUrl(item)"
                    :src="foodImageUrl(item)"
                    :alt="item.image?.alt || item.title"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-orange-500">
                    <i class="fas fa-bowl-food"></i>
                  </div>
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold">{{ item.title }}</p>
                  <p class="text-[11px] text-gray-500">{{ item.price }} {{ item.currency }} · {{ foodImageSourceLabel(item) }}</p>
                </div>
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

      <section class="rounded-3xl border border-orange-100 bg-white p-4" data-testid="food-delivery-custom-form">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold">{{ t('自定义餐厅与菜单', 'Custom restaurants and menu') }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">
              {{
                t(
                  '可自定义餐厅、餐品名称、价格和 URL/Gallery 图片。本地文件仍先进入 Gallery，再被外卖引用。',
                  'Create restaurants and menu items with custom names, prices, and URL/Gallery images. Local files still enter Gallery first.',
                )
              }}
            </p>
          </div>
          <span class="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-600">
            {{ t('User origin', 'User origin') }}
          </span>
        </div>

        <div class="mt-3 rounded-2xl bg-orange-50/60 p-3">
          <p class="text-xs font-bold text-orange-900">{{ t('新增餐厅', 'New restaurant') }}</p>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <input
              v-model="restaurantDraft.name"
              data-testid="food-delivery-custom-restaurant-name"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              :placeholder="t('餐厅名称', 'Restaurant name')"
            />
            <select
              v-model="restaurantDraft.category"
              data-testid="food-delivery-custom-restaurant-category"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
            >
              <option v-for="category in categoryCards" :key="category.key" :value="category.key">
                {{ category.label }}
              </option>
            </select>
            <input
              v-model="restaurantDraft.cuisine"
              data-testid="food-delivery-custom-restaurant-cuisine"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              :placeholder="t('菜系/类型', 'Cuisine')"
            />
            <input
              v-model="restaurantDraft.deliveryFee"
              data-testid="food-delivery-custom-restaurant-fee"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              inputmode="decimal"
              :placeholder="t('配送费，例如 6.00', 'Delivery fee, e.g. 6.00')"
            />
            <input
              v-model="restaurantDraft.distanceKm"
              data-testid="food-delivery-custom-restaurant-distance"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              inputmode="decimal"
              :placeholder="t('距离 km', 'Distance km')"
            />
            <input
              v-model="restaurantDraft.deliveryEtaMinutes"
              data-testid="food-delivery-custom-restaurant-eta"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              inputmode="numeric"
              :placeholder="t('ETA 分钟', 'ETA minutes')"
            />
            <input
              v-model="restaurantDraft.address"
              data-testid="food-delivery-custom-restaurant-address"
              class="col-span-2 rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              :placeholder="t('餐厅地址/取餐点', 'Restaurant address / pickup point')"
            />
            <ImageSourcePicker
              v-model:source-type="restaurantDraft.imageSourceType"
              v-model:image-url="restaurantDraft.imageUrl"
              v-model:gallery-asset-id="restaurantDraft.imageGalleryAssetId"
              :gallery-assets="galleryImageOptions"
              size="xs"
              test-id-prefix="food-delivery-custom-restaurant"
            />
          </div>
          <button
            data-testid="food-delivery-create-restaurant"
            class="mt-3 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white"
            @click="createCustomRestaurant"
          >
            {{ t('加入餐厅', 'Add restaurant') }}
          </button>
        </div>

        <div class="mt-3 rounded-2xl bg-amber-50/70 p-3">
          <p class="text-xs font-bold text-amber-900">{{ t('新增菜单项', 'New menu item') }}</p>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <select
              v-model="menuDraft.restaurantId"
              data-testid="food-delivery-custom-menu-restaurant"
              class="col-span-2 rounded-xl border border-amber-100 px-3 py-2 text-xs outline-none"
            >
              <option value="">{{ t('选择餐厅', 'Choose restaurant') }}</option>
              <option v-for="restaurant in foodDeliveryStore.restaurants" :key="restaurant.id" :value="restaurant.id">
                {{ restaurant.name }}
              </option>
            </select>
            <input
              v-model="menuDraft.title"
              data-testid="food-delivery-custom-menu-title"
              class="rounded-xl border border-amber-100 px-3 py-2 text-xs outline-none"
              :placeholder="t('餐品名称', 'Menu item name')"
            />
            <input
              v-model="menuDraft.price"
              data-testid="food-delivery-custom-menu-price"
              class="rounded-xl border border-amber-100 px-3 py-2 text-xs outline-none"
              inputmode="decimal"
              :placeholder="t('价格，例如 28.00', 'Price, e.g. 28.00')"
            />
            <select
              v-model="menuDraft.category"
              data-testid="food-delivery-custom-menu-category"
              class="col-span-2 rounded-xl border border-amber-100 px-3 py-2 text-xs outline-none"
            >
              <option v-for="category in categoryCards" :key="category.key" :value="category.key">
                {{ category.label }}
              </option>
            </select>
            <ImageSourcePicker
              v-model:source-type="menuDraft.imageSourceType"
              v-model:image-url="menuDraft.imageUrl"
              v-model:gallery-asset-id="menuDraft.imageGalleryAssetId"
              :gallery-assets="galleryImageOptions"
              size="xs"
              test-id-prefix="food-delivery-custom-menu"
            />
            <textarea
              v-model="menuDraft.desc"
              data-testid="food-delivery-custom-menu-desc"
              class="col-span-2 rounded-xl border border-amber-100 px-3 py-2 text-xs outline-none"
              rows="2"
              :placeholder="t('餐品描述', 'Menu item description')"
            ></textarea>
          </div>
          <button
            data-testid="food-delivery-create-menu"
            class="mt-3 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white"
            @click="createCustomMenuItem"
          >
            {{ t('加入菜单', 'Add menu item') }}
          </button>
        </div>
        <p v-if="customFeedback" class="mt-2 text-[11px] font-semibold text-orange-600">
          {{ customFeedback }}
        </p>
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

      <section class="rounded-3xl border border-lime-100 bg-white p-4" data-testid="food-delivery-map-handoff">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold">{{ t('Map 配送上下文', 'Map delivery context') }}</p>
            <p class="mt-1 text-xs text-gray-500">
              {{ t('只读提供位置、距离和 ETA，不创建外卖订单。', 'Read-only location, distance, and ETA. It does not create food orders.') }}
            </p>
          </div>
          <span class="rounded-full bg-lime-50 px-3 py-1 text-[11px] font-semibold text-lime-700">
            {{ activeMapHandoff.etaMinutes }} min
          </span>
        </div>
        <div class="mt-3 grid gap-2 text-xs">
          <p
            class="rounded-2xl bg-lime-50/80 p-3 leading-5 text-lime-800"
            data-testid="food-delivery-map-handoff-route"
          >
            {{ activeMapHandoffRouteSummary }}
          </p>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-2xl bg-gray-50 p-3" data-testid="food-delivery-map-handoff-address">
              <p class="font-semibold text-gray-900">{{ t('配送地址', 'Delivery address') }}</p>
              <p class="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500">
                {{ activeMapHandoff.deliveryAddress || t('未设置', 'Not set') }}
              </p>
            </div>
            <div class="rounded-2xl bg-gray-50 p-3" data-testid="food-delivery-map-handoff-distance">
              <p class="font-semibold text-gray-900">{{ t('预计距离', 'Distance') }}</p>
              <p class="mt-1 text-[11px] text-gray-500">
                {{ activeMapHandoff.distanceKm }} km · {{ activeMapHandoff.etaMinutes }} min
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-gray-100 bg-white p-4" data-testid="food-delivery-orders-panel">
        <p class="text-sm font-bold">{{ t('最近外卖订单', 'Recent food orders') }}</p>
        <div v-if="recentOrders.length > 0" class="mt-3 space-y-2">
          <article
            v-for="order in recentOrders"
            :key="order.id"
            class="rounded-2xl p-3"
            :class="isHighlightedOrder(order.id) ? 'border-2 border-orange-300 bg-orange-50 shadow-sm' : 'bg-gray-50'"
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
