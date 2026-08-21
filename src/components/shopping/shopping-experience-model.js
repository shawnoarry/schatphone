export const SHOPPING_EXPERIENCE_MODELS = Object.freeze({
  city_market: {
    listMode: 'fulfillment-list',
    pdpMode: 'fulfillment-console',
    indexLabel: ['搜索结果', 'SEARCH RESULTS'],
    productKicker: ['配送承诺先于故事', 'FULFILLMENT BEFORE STORY'],
    primaryFact: ['明日到达', 'Arrives tomorrow'],
    secondaryFact: ['免费退货 · 本地配送追踪', 'Free returns · local tracking'],
    detailSections: [
      ['配送与退货', 'Delivery & returns'],
      ['商品信息', 'Product information'],
      ['购买评价', 'Buyer reviews'],
    ],
  },
  tech_catalog: {
    listMode: 'editorial-index',
    pdpMode: 'object-editorial',
    indexLabel: ['本周选物索引', 'THIS WEEK\'S OBJECT INDEX'],
    productKicker: ['一件物品，一段使用提案', 'ONE OBJECT, ONE WAY OF LIVING'],
    primaryFact: ['编辑推荐', 'Editor selected'],
    secondaryFact: ['Objects / Issue / Special Order', 'Objects / Issue / Special Order'],
    detailSections: [
      ['编辑手记', 'Editor note'],
      ['物品细节', 'Object details'],
      ['与它一起生活', 'Live with it'],
    ],
  },
  fresh_market: {
    listMode: 'fresh-aisle',
    pdpMode: 'fresh-specification',
    indexLabel: ['按温层逛市场', 'SHOP BY TEMPERATURE'],
    productKicker: ['产地、保鲜与到货时间', 'ORIGIN, FRESHNESS, ARRIVAL'],
    primaryFact: ['首尔晨间配送', 'Seoul dawn delivery'],
    secondaryFact: ['冷藏 / 冷冻 / 常温分袋', 'Chilled / frozen / ambient lanes'],
    detailSections: [
      ['产地与规格', 'Origin & specification'],
      ['保鲜方式', 'Freshness guide'],
      ['烹调与搭配', 'Cooking & pairing'],
    ],
  },
  fashion_editorial: {
    listMode: 'drop-lookbook',
    pdpMode: 'streetwear-sheet',
    indexLabel: ['DROP 目录', 'DROP DIRECTORY'],
    productKicker: ['版型、尺码与造型', 'FIT, SIZE, STYLING'],
    primaryFact: ['限量批次', 'Limited release'],
    secondaryFact: ['Drop archive · Lookbook notes', 'Drop archive · Lookbook notes'],
    detailSections: [
      ['尺码与版型', 'Size & fit'],
      ['造型提案', 'Styling notes'],
      ['发售档案', 'Release archive'],
    ],
  },
  room_planner: {
    listMode: 'room-inventory',
    pdpMode: 'room-specification',
    indexLabel: ['从房间进入商品', 'ENTER THROUGH THE ROOM'],
    productKicker: ['尺寸、材质与空间适配', 'MEASURE, MATERIAL, ROOM FIT'],
    primaryFact: ['可加入房间清单', 'Add to room list'],
    secondaryFact: ['包装尺寸与自提信息完整展示', 'Package dimensions and pickup details'],
    detailSections: [
      ['尺寸与包装', 'Measurements & package'],
      ['材质与养护', 'Material & care'],
      ['房间搭配', 'Room combinations'],
    ],
  },
  care_lab: {
    listMode: 'routine-ranking',
    pdpMode: 'routine-guide',
    indexLabel: ['功效与趋势排行', 'CONCERN & TREND RANKING'],
    productKicker: ['功效、肤质与使用顺序', 'BENEFIT, SKIN TYPE, ROUTINE'],
    primaryFact: ['步骤 02 · 日常护理', 'Step 02 · daily routine'],
    secondaryFact: ['成分提示 · 使用顺序 · 搭配禁忌', 'Ingredients · order · pairing cautions'],
    detailSections: [
      ['适合谁', 'Who it suits'],
      ['成分与功效', 'Ingredients & benefit'],
      ['使用顺序', 'Routine order'],
    ],
  },
  member_warehouse: {
    listMode: 'warehouse-ledger',
    pdpMode: 'bulk-value-sheet',
    indexLabel: ['会员仓储货架', 'MEMBER WAREHOUSE LEDGER'],
    productKicker: ['整箱价值与单位成本', 'CASE VALUE & UNIT COST'],
    primaryFact: ['会员整箱价', 'Member case price'],
    secondaryFact: ['显示包装数、单件成本与搬运方式', 'Pack count, unit value, handling'],
    detailSections: [
      ['包装与单价', 'Pack & unit value'],
      ['仓库库存', 'Warehouse stock'],
      ['家庭补货计划', 'Restock planning'],
    ],
  },
  neighborhood_convenience: {
    listMode: 'pickup-shelf',
    pdpMode: 'pickup-ticket',
    indexLabel: ['附近货架', 'NEARBY SHELVES'],
    productKicker: ['库存、取货时间与即时搭配', 'STOCK, PICKUP, QUICK PAIRING'],
    primaryFact: ['预计 12 分钟可取', 'Pickup in about 12 min'],
    secondaryFact: ['夜间库存与热柜状态按门店显示', 'Local late-night and hot-counter status'],
    detailSections: [
      ['附近库存', 'Nearby stock'],
      ['取货说明', 'Pickup guide'],
      ['顺手一起买', 'Quick pairings'],
    ],
  },
  fashion_catalog: {
    listMode: 'fashion-ranking',
    pdpMode: 'fashion-commerce',
    indexLabel: ['品牌与排行', 'BRANDS & RANKING'],
    productKicker: ['品牌、尺码、评价与穿搭', 'BRAND, SIZE, REVIEW, OUTFIT'],
    primaryFact: ['本周风格榜', 'This week\'s style rank'],
    secondaryFact: ['品牌页、快照评价与搭配单', 'Brand page, review snapshots, outfit sets'],
    detailSections: [
      ['尺码推荐', 'Size recommendation'],
      ['用户评价', 'Member reviews'],
      ['搭配商品', 'Complete the look'],
    ],
  },
  buyer_atelier: {
    listMode: 'buyer-rack',
    pdpMode: 'atelier-consultation',
    indexLabel: ['买手衣架', 'BUYER RACK'],
    productKicker: ['面料、廓形与试衣预约', 'FABRIC, SILHOUETTE, FITTING'],
    primaryFact: ['买手可预约', 'Buyer appointment available'],
    secondaryFact: ['材质桌 · 修改建议 · 私人试衣间', 'Material desk · alterations · fitting room'],
    detailSections: [
      ['买手观点', 'Buyer perspective'],
      ['材质档案', 'Material dossier'],
      ['预约试衣', 'Book a fitting'],
    ],
  },
  luxury_hall: {
    listMode: 'luxury-hall',
    pdpMode: 'private-hall',
    indexLabel: ['私人展厅目录', 'PRIVATE HALL DIRECTORY'],
    productKicker: ['工艺、来源与礼宾服务', 'CRAFT, PROVENANCE, CONCIERGE'],
    primaryFact: ['礼宾专员确认', 'Concierge confirmation'],
    secondaryFact: ['预约鉴赏 · 包装礼遇 · 私人配送', 'Viewing · presentation · private delivery'],
    detailSections: [
      ['工艺档案', 'Craft dossier'],
      ['品牌展厅', 'Maison hall'],
      ['礼宾服务', 'Concierge service'],
    ],
  },
})

export const resolveShoppingExperienceModel = (storefront = '') =>
  SHOPPING_EXPERIENCE_MODELS[storefront] || SHOPPING_EXPERIENCE_MODELS.city_market

export const SHOPPING_SERVICE_SURFACES = Object.freeze({
  city_market: { mode: 'rocket-checkout', cart: ['配送篮', 'Delivery basket'], order: ['配送订单', 'Delivery orders'], cue: ['先确认到货时间，再确认商品。', 'Confirm arrival time before the items.'] },
  tech_catalog: { mode: 'considered-bag', cart: ['选物袋', 'Considered bag'], order: ['购买档案', 'Purchase archive'], cue: ['保留编辑来源、赠礼和包装选择。', 'Keep editorial source, gifting, and presentation choices.'] },
  fresh_market: { mode: 'cold-chain-basket', cart: ['温层购物篮', 'Temperature basket'], order: ['晨间配送', 'Dawn deliveries'], cue: ['冷藏、冷冻与常温会分别核对。', 'Chilled, frozen, and ambient lanes are reviewed separately.'] },
  fashion_editorial: { mode: 'drop-bag', cart: ['DROP BAG', 'DROP BAG'], order: ['发售记录', 'Release archive'], cue: ['尺码和发售批次优先于普通配送信息。', 'Size and release batch come before ordinary delivery detail.'] },
  room_planner: { mode: 'room-list', cart: ['房间清单', 'Room list'], order: ['配送与组装', 'Delivery & assembly'], cue: ['先核对尺寸、包装件数和自提方式。', 'Check measurements, package count, and pickup first.'] },
  care_lab: { mode: 'routine-basket', cart: ['护理步骤', 'Routine basket'], order: ['护理补货', 'Routine restocks'], cue: ['按使用顺序检查重复功效与搭配。', 'Review overlapping benefits and routine order.'] },
  member_warehouse: { mode: 'bulk-checkout', cart: ['会员推车', 'Member trolley'], order: ['仓储提货单', 'Warehouse orders'], cue: ['整箱数、单件成本和搬运方式同时核对。', 'Review cases, unit value, and handling together.'] },
  neighborhood_convenience: { mode: 'pickup-bag', cart: ['快取袋', 'Pickup bag'], order: ['附近取货', 'Nearby pickup'], cue: ['选择备货门店与可取时间。', 'Choose the preparing store and pickup time.'] },
  fashion_catalog: { mode: 'size-bag', cart: ['造型购物袋', 'Style bag'], order: ['购买与退换', 'Purchases & returns'], cue: ['尺码快照与搭配关系随订单保留。', 'Size snapshots and outfit relationships stay with the order.'] },
  buyer_atelier: { mode: 'fitting-list', cart: ['试衣清单', 'Fitting list'], order: ['预约与定制', 'Fittings & alterations'], cue: ['购买前保留试衣、修改与买手备注。', 'Keep fitting, alteration, and buyer notes before purchase.'] },
  luxury_hall: { mode: 'concierge-request', cart: ['礼宾申请单', 'Concierge request'], order: ['私人服务记录', 'Private service record'], cue: ['由礼宾确认鉴赏、包装与配送安排。', 'Concierge confirms viewing, presentation, and delivery.'] },
})

export const resolveShoppingServiceSurface = (storefront = '') =>
  SHOPPING_SERVICE_SURFACES[storefront] || SHOPPING_SERVICE_SURFACES.city_market

export const SHOPPING_PAGE_CONTRACTS = Object.freeze({
  city_market: { home: 'home', category: 'search', product: 'product', cart: 'cart', checkout: 'checkout', orders: 'orders', order: 'order', logistics: 'tracking', service: 'help', manage: 'seller' },
  tech_catalog: { home: 'home', category: 'objects', product: 'object', cart: 'bag', checkout: 'review', orders: 'archive', order: 'purchase', logistics: 'delivery', service: 'care', manage: 'studio' },
  fresh_market: { home: 'home', category: 'market', product: 'item', cart: 'basket', checkout: 'dawn-review', orders: 'deliveries', order: 'delivery', logistics: 'dawn', service: 'market-help', manage: 'pantry' },
  fashion_editorial: { home: 'home', category: 'drop', product: 'piece', cart: 'bag', checkout: 'release-check', orders: 'releases', order: 'release', logistics: 'shipping', service: 'support', manage: 'backstage' },
  room_planner: { home: 'home', category: 'rooms', product: 'product', cart: 'list', checkout: 'project-review', orders: 'projects', order: 'project', logistics: 'delivery', service: 'service', manage: 'planner' },
  care_lab: { home: 'home', category: 'ranking', product: 'care', cart: 'routine', checkout: 'routine-review', orders: 'restocks', order: 'restock', logistics: 'delivery', service: 'care-desk', manage: 'lab' },
  member_warehouse: { home: 'home', category: 'warehouse', product: 'case', cart: 'trolley', checkout: 'load-review', orders: 'pickups', order: 'pickup', logistics: 'dock', service: 'member-service', manage: 'member-desk' },
  neighborhood_convenience: { home: 'home', category: 'nearby', product: 'item', cart: 'pickup-bag', checkout: 'pickup-review', orders: 'pickups', order: 'pickup', logistics: 'store-status', service: 'store-help', manage: 'shelf' },
  fashion_catalog: { home: 'home', category: 'ranking', product: 'style', cart: 'bag', checkout: 'fit-review', orders: 'purchases', order: 'purchase', logistics: 'shipping', service: 'returns', manage: 'brand-desk' },
  buyer_atelier: { home: 'home', category: 'edit', product: 'piece', cart: 'fitting-list', checkout: 'fitting-request', orders: 'appointments', order: 'appointment', logistics: 'delivery', service: 'atelier-service', manage: 'atelier' },
  luxury_hall: { home: 'home', category: 'halls', product: 'piece', cart: 'request', checkout: 'concierge-review', orders: 'services', order: 'service', logistics: 'private-delivery', service: 'concierge', manage: 'concierge-desk' },
})

export const resolveShoppingPageContract = (storefront = '') =>
  SHOPPING_PAGE_CONTRACTS[storefront] || SHOPPING_PAGE_CONTRACTS.city_market

export const resolveShoppingCanonicalPage = (storefront = '', requested = '') => {
  const contract = resolveShoppingPageContract(storefront)
  const canonical = Object.keys(contract).find((key) => contract[key] === requested)
  if (canonical) return canonical
  return Object.prototype.hasOwnProperty.call(contract, requested) ? requested : ''
}
