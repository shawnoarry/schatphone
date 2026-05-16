export const SHOPPING_HOME_APP_ID = 'app_shopping'
export const SHOPPING_ROUTE = '/shopping'
export const FOOD_DELIVERY_HOME_APP_ID = 'app_food_delivery'
export const FOOD_DELIVERY_ROUTE = '/food-delivery'
export const ASSETS_HOME_APP_ID = 'app_assets'
export const ASSETS_ROUTE = '/assets'

export const SHOPPING_CATEGORY_ENTRIES = Object.freeze([
  {
    key: 'mall',
    zh: '综合购物',
    en: 'Mall',
    icon: 'fas fa-store',
    accent: 'warm',
    route: SHOPPING_ROUTE,
    descZh: '集中展示推荐商品、订单入口和跨模块购物线索。',
    descEn: 'Central entry for recommended goods, orders, and cross-module shopping cues.',
  },
  {
    key: 'fashion',
    zh: '服饰',
    en: 'Fashion',
    icon: 'fas fa-shirt',
    accent: 'cool',
    route: SHOPPING_ROUTE,
    descZh: '衣物、配饰与角色穿搭相关商品。',
    descEn: 'Clothing, accessories, and role styling goods.',
  },
  {
    key: 'beauty',
    zh: '美妆',
    en: 'Beauty',
    icon: 'fas fa-wand-magic-sparkles',
    accent: 'warm',
    route: SHOPPING_ROUTE,
    descZh: '美妆、护理和仪式感消费。',
    descEn: 'Beauty, care, and ritual purchases.',
  },
  {
    key: 'digital',
    zh: '数码',
    en: 'Digital',
    icon: 'fas fa-laptop',
    accent: 'cool',
    route: SHOPPING_ROUTE,
    descZh: '电子设备、配件与智能产品。',
    descEn: 'Electronics, accessories, and smart devices.',
  },
  {
    key: 'grocery',
    zh: '生鲜',
    en: 'Grocery',
    icon: 'fas fa-basket-shopping',
    accent: 'light',
    route: SHOPPING_ROUTE,
    descZh: '食材、日用品与即时生活补给。',
    descEn: 'Food, daily goods, and immediate life supplies.',
  },
  {
    key: 'home',
    zh: '家居',
    en: 'Home',
    icon: 'fas fa-couch',
    accent: 'light',
    route: SHOPPING_ROUTE,
    descZh: '房间布置、家具和生活空间物品。',
    descEn: 'Room styling, furniture, and living-space items.',
  },
  {
    key: 'luxury',
    zh: '奢侈品',
    en: 'Luxury',
    icon: 'fas fa-gem',
    accent: 'dark',
    route: SHOPPING_ROUTE,
    descZh: '高价值商品，可在购买后转入资产。',
    descEn: 'High-value goods that can later become assets.',
  },
  {
    key: 'gifts',
    zh: '礼物',
    en: 'Gifts',
    icon: 'fas fa-gift',
    accent: 'warm',
    route: SHOPPING_ROUTE,
    descZh: '面向角色互动、赠礼和纪念日的商品。',
    descEn: 'Goods for role interactions, gifting, and anniversaries.',
  },
  {
    key: 'logistics',
    zh: '物流',
    en: 'Logistics',
    icon: 'fas fa-truck-fast',
    accent: 'cool',
    route: SHOPPING_ROUTE,
    descZh: '集中查看购物订单的配送、到达和售后跟进线索。',
    descEn: 'Delivery, arrival, and after-sales follow-up cues for Shopping orders.',
  },
])

export const SHOPPING_SERVICE_PRESETS = Object.freeze([
  {
    key: 'schat_mall',
    zh: 'Schat Mall',
    en: 'Schat Mall',
    icon: 'fas fa-store',
    accent: 'warm',
    categoryKeys: ['mall', 'gifts', 'home'],
    descZh: '综合购物、礼品和生活用品平台。',
    descEn: 'General mall for gifts and everyday lifestyle goods.',
  },
  {
    key: 'style_cloud',
    zh: 'Style Cloud',
    en: 'Style Cloud',
    icon: 'fas fa-shirt',
    accent: 'cool',
    categoryKeys: ['fashion', 'beauty', 'luxury'],
    descZh: '服饰、美妆和高价值穿搭平台。',
    descEn: 'Fashion, beauty, and high-value styling platform.',
  },
  {
    key: 'nova_digital',
    zh: 'Nova Digital',
    en: 'Nova Digital',
    icon: 'fas fa-laptop',
    accent: 'cool',
    categoryKeys: ['digital', 'luxury'],
    descZh: '数码设备、配件和智能产品平台。',
    descEn: 'Digital devices, accessories, and smart-product platform.',
  },
  {
    key: 'daily_fresh',
    zh: 'Daily Fresh',
    en: 'Daily Fresh',
    icon: 'fas fa-basket-shopping',
    accent: 'light',
    categoryKeys: ['grocery', 'home'],
    descZh: '生鲜、日用和即时生活补给平台。',
    descEn: 'Grocery, daily supplies, and immediate-life platform.',
  },
])

export const SHOPPING_PLATFORM_APP_ENTRIES = Object.freeze(
  SHOPPING_SERVICE_PRESETS.map((entry) => {
    const defaultCategory =
      Array.isArray(entry.categoryKeys) && entry.categoryKeys.length > 0 ? entry.categoryKeys[0] : 'mall'

    return Object.freeze({
      ...entry,
      route: SHOPPING_ROUTE,
      defaultCategory,
      folderQuery: Object.freeze({
        service: entry.key,
        category: defaultCategory,
      }),
    })
  }),
)

export const LOGISTICS_SERVICE_PRESETS = Object.freeze([
  {
    key: 'local_express',
    zh: '同城急送',
    en: 'Local Express',
    icon: 'fas fa-motorcycle',
    accent: 'cool',
    descZh: '面向同城即时配送、跑腿和短距离取送件的物流服务号。',
    descEn: 'Logistics service account for local instant delivery, errands, and short-distance pickup.',
  },
  {
    key: 'standard_courier',
    zh: '普通快递',
    en: 'Standard Courier',
    icon: 'fas fa-box',
    accent: 'warm',
    descZh: '面向普通网购物流、包裹到达和取件提醒的物流服务号。',
    descEn: 'Logistics service account for standard parcel delivery, arrival, and pickup reminders.',
  },
  {
    key: 'international_logistics',
    zh: '国际物流',
    en: 'International Logistics',
    icon: 'fas fa-plane-departure',
    accent: 'dark',
    descZh: '面向跨境运输、清关节点和国际包裹追踪的物流服务号。',
    descEn: 'Logistics service account for cross-border shipping, customs milestones, and international tracking.',
  },
])

export const FOOD_DELIVERY_CATEGORY_ENTRIES = Object.freeze([
  {
    key: 'restaurants',
    zh: '餐厅',
    en: 'Restaurants',
    icon: 'fas fa-utensils',
    accent: 'warm',
    route: FOOD_DELIVERY_ROUTE,
    descZh: '集中浏览可点外卖的餐厅、菜单和近期订单线索。',
    descEn: 'Browse delivery restaurants, menus, and recent order cues.',
  },
  {
    key: 'nearby',
    zh: '附近',
    en: 'Nearby',
    icon: 'fas fa-location-dot',
    accent: 'cool',
    route: FOOD_DELIVERY_ROUTE,
    descZh: '按当前位置、配送距离和预计送达时间筛选餐厅。',
    descEn: 'Filter restaurants by current location, delivery distance, and ETA.',
  },
  {
    key: 'fast_food',
    zh: '快餐',
    en: 'Fast Food',
    icon: 'fas fa-burger',
    accent: 'warm',
    route: FOOD_DELIVERY_ROUTE,
    descZh: '汉堡、炸鸡、盖饭等高频快速餐饮。',
    descEn: 'Burgers, fried chicken, rice bowls, and fast everyday meals.',
  },
  {
    key: 'cafe',
    zh: '咖啡茶饮',
    en: 'Cafe & Drinks',
    icon: 'fas fa-mug-hot',
    accent: 'light',
    route: FOOD_DELIVERY_ROUTE,
    descZh: '咖啡、奶茶、甜饮和轻食下午茶。',
    descEn: 'Coffee, tea drinks, sweet beverages, and light snacks.',
  },
  {
    key: 'dessert',
    zh: '甜品',
    en: 'Dessert',
    icon: 'fas fa-ice-cream',
    accent: 'light',
    route: FOOD_DELIVERY_ROUTE,
    descZh: '蛋糕、冰淇淋、烘焙和夜间甜品。',
    descEn: 'Cake, ice cream, bakery, and late-night desserts.',
  },
  {
    key: 'grocery_delivery',
    zh: '生鲜速达',
    en: 'Grocery Delivery',
    icon: 'fas fa-basket-shopping',
    accent: 'cool',
    route: FOOD_DELIVERY_ROUTE,
    descZh: '蔬果、生鲜、便利店和即时生活补给。',
    descEn: 'Produce, groceries, convenience-store items, and instant supplies.',
  },
])

export const FOOD_DELIVERY_SERVICE_PRESETS = Object.freeze([
  {
    key: 'food_delivery_dispatch',
    zh: '外卖通知',
    en: 'Food Delivery Dispatch',
    icon: 'fas fa-bell-concierge',
    accent: 'warm',
    descZh: '统一承载外卖接单、备餐、骑手取餐、送达和异常提醒。',
    descEn: 'Unified service account for order accepted, cooking, pickup, arrival, and exception alerts.',
  },
])

export const ASSET_CATEGORY_ENTRIES = Object.freeze([
  {
    key: 'real_estate',
    zh: '不动产',
    en: 'Real Estate',
    icon: 'fas fa-building',
    accent: 'cool',
    route: ASSETS_ROUTE,
    descZh: '房产、公寓、商铺、土地和可绑定地图位置的空间资产。',
    descEn: 'Homes, apartments, shops, land, and place-bound properties.',
  },
  {
    key: 'investment',
    zh: '投资',
    en: 'Investment',
    icon: 'fas fa-chart-pie',
    accent: 'warm',
    route: ASSETS_ROUTE,
    descZh: '长期投资总览，后续可读取 Stock 持仓摘要。',
    descEn: 'Long-term investment overview, later reading Stock holdings summaries.',
  },
  {
    key: 'vehicles',
    zh: '交通工具',
    en: 'Vehicles',
    icon: 'fas fa-car-side',
    accent: 'cool',
    route: ASSETS_ROUTE,
    descZh: '汽车、摩托、船、飞机与会影响地图行程的出行资产。',
    descEn: 'Cars, bikes, boats, aircraft, and mobility assets that can affect Map trips.',
  },
  {
    key: 'special',
    zh: '特殊资产',
    en: 'Special',
    icon: 'fas fa-gem',
    accent: 'dark',
    route: ASSETS_ROUTE,
    descZh: '艺术品、稀有收藏、身份凭证、会员权益和特殊道具。',
    descEn: 'Art, rare collections, credentials, memberships, and special items.',
  },
])

export const SHOPPING_SOURCE_KEYS = Object.freeze({
  CHAT_PRODUCT_CARD: 'shopping_chat_product_card',
  CHAT_PROMOTION: 'shopping_chat_promotion',
  CHAT_RECOMMENDATION: 'shopping_chat_recommendation',
  CART_REMINDER: 'shopping_cart_reminder',
  ORDER_UPDATE: 'shopping_order_update',
  CALENDAR_DELIVERY: 'shopping_calendar_delivery',
  LOGISTICS_TRACKING: 'shopping_logistics_tracking',
  ASSET_PURCHASE: 'shopping_asset_purchase',
  WALLET_EXPENSE: 'shopping_wallet_expense',
})

export const LOGISTICS_SOURCE_KEYS = Object.freeze({
  CHAT_LOGISTICS_REMINDER: 'logistics_chat_reminder',
  SHOPPING_DELIVERY_CUE: 'logistics_shopping_delivery_cue',
  MAP_DELIVERY_LOCATION: 'logistics_map_delivery_location',
})

export const FOOD_DELIVERY_SOURCE_KEYS = Object.freeze({
  CHAT_FOOD_DELIVERY_PUSH: 'food_delivery_chat_push',
  MAP_RESTAURANT_LOCATION: 'food_delivery_map_restaurant_location',
  MAP_COURIER_ROUTE: 'food_delivery_map_courier_route',
  CALENDAR_MEAL_REMINDER: 'food_delivery_calendar_meal_reminder',
  WALLET_EXPENSE: 'food_delivery_wallet_expense',
})

export const ASSET_SOURCE_KEYS = Object.freeze({
  SHOPPING_PURCHASE: 'assets_shopping_purchase',
  STOCK_HOLDINGS_SUMMARY: 'assets_stock_holdings_summary',
  MAP_LOCATION_CONTEXT: 'assets_map_location_context',
  WALLET_CASHFLOW_CONTEXT: 'assets_wallet_cashflow_context',
})

export const MODULE_RELATIONSHIP_BOUNDARIES = Object.freeze([
  {
    owner: 'shopping',
    readsFrom: ['chat', 'wallet', 'assets', 'calendar'],
    rule: 'Shopping owns product, cart, order, and gift intent. Chat shop accounts may push new arrivals, discounts, and product cards, but logistics reminders belong to Logistics service accounts and checkout stays in Shopping.',
  },
  {
    owner: 'logistics',
    readsFrom: ['shopping', 'calendar', 'map', 'chat'],
    rule: 'Logistics owns delivery-notification identity in Chat. It may read Shopping delivery cues and later Map locations, but it should not own shopping checkout or restaurant orders.',
  },
  {
    owner: 'food_delivery',
    readsFrom: ['map', 'chat', 'wallet', 'calendar'],
    rule: 'Food Delivery owns restaurant ordering surfaces and food-delivery push identity. Map may provide restaurant location, delivery address, courier route, and ETA context without owning orders.',
  },
  {
    owner: 'assets',
    readsFrom: ['shopping', 'stock', 'map', 'wallet'],
    rule: 'Assets owns long-term owned objects. It may consume Stock, Map, and Wallet summaries without turning those modules into asset subpages.',
  },
  {
    owner: 'stock',
    readsFrom: [],
    rule: 'Stock owns watchlist and simulated-market behavior. Assets may read its holding summary but should not merge with it.',
  },
])

export const findPlannedModuleEntry = (entries, key) => {
  const normalized = typeof key === 'string' ? key.trim() : ''
  return entries.find((entry) => entry.key === normalized) || entries[0] || null
}

export const findShoppingCategory = (key) => findPlannedModuleEntry(SHOPPING_CATEGORY_ENTRIES, key)

export const findFoodDeliveryCategory = (key) => findPlannedModuleEntry(FOOD_DELIVERY_CATEGORY_ENTRIES, key)

export const findAssetCategory = (key) => findPlannedModuleEntry(ASSET_CATEGORY_ENTRIES, key)

export const findShoppingServicePreset = (key) => findPlannedModuleEntry(SHOPPING_SERVICE_PRESETS, key)

export const findShoppingPlatformApp = (key) => findPlannedModuleEntry(SHOPPING_PLATFORM_APP_ENTRIES, key)

export const findLogisticsServicePreset = (key) => findPlannedModuleEntry(LOGISTICS_SERVICE_PRESETS, key)

export const findFoodDeliveryServicePreset = (key) =>
  findPlannedModuleEntry(FOOD_DELIVERY_SERVICE_PRESETS, key)
