import { SEOUL_EVERYDAY_PLACES } from './seoul-map-everyday-places'
import { DEFAULT_MAP_PACK_ID } from './map-packs'

export const HOUSING_SHELL_BRAND = Object.freeze({
  nameZh: '住处',
  nameEn: 'Jari',
  taglineZh: '把下一段生活，安放在这里',
  taglineEn: 'A place for your next chapter',
})

export const HOUSING_AREA_REFS = Object.freeze(
  SEOUL_EVERYDAY_PLACES.filter((place) =>
    ['residence_budget', 'residence_standard', 'residence_premium', 'residence_luxury'].includes(
      place.category,
    ),
  ).map((place) =>
    Object.freeze({
      mapPackId: DEFAULT_MAP_PACK_ID,
      placeId: place.id,
      nameZh: place.nameZh,
      nameEn: place.nameEn,
      addressZh: place.detailZh,
      addressEn: place.detailEn,
      category: place.category,
    }),
  ),
)

const areaRef = (placeId) => {
  const place = HOUSING_AREA_REFS.find((item) => item.placeId === placeId)
  if (!place) throw new Error(`Unknown Housing Map area ref: ${placeId}`)
  return Object.freeze({ ...place })
}

const listing = (record) =>
  Object.freeze({
    sourceStatus: 'available',
    media: Object.freeze({ kind: 'plan', tone: 'linen', rooms: 1 }),
    amenities: Object.freeze([]),
    ...record,
  })

export const HOUSING_LISTINGS = Object.freeze([
  listing({
    id: 'housing_listing_jari_001',
    mode: 'rent',
    titleZh: '上溪站旁，向南的小房间',
    titleEn: 'A south-facing studio near Sanggye Station',
    areaRef: areaRef('seoul-sanggye-jugong-district'),
    addressZh: '首尔特别市芦原区上溪洞住宅区，步行可达上溪站与社区市场',
    addressEn: 'Sanggye residential district, Nowon-gu, Seoul, near the station and local market',
    depositKrw: 10_000_000,
    monthlyKrw: 720_000,
    maintenanceKrw: 70_000,
    availableFrom: '2026-09-05',
    roomCount: 1,
    bathCount: 1,
    areaSqm: 24.6,
    floorZh: '7 层 / 共 14 层',
    floorEn: '7F / 14F',
    orientationZh: '南向',
    orientationEn: 'South-facing',
    summaryZh: '午后的光会落到床边，玄关与生活区有清楚分界，适合一个人稳定居住。',
    summaryEn: 'Afternoon light reaches the bed, with a clear divide between the entry and living area.',
    commuteZh: '地铁 4 号线约 8 分钟步行',
    commuteEn: 'About an 8-minute walk to Line 4',
    amenities: Object.freeze(['elevator', 'security', 'parking']),
    media: Object.freeze({ kind: 'plan', tone: 'sage', rooms: 1 }),
  }),
  listing({
    id: 'housing_listing_jari_002',
    mode: 'rent',
    titleZh: '木洞生活圈，两室一厅',
    titleEn: 'Two-bedroom home in the Mokdong neighborhood',
    areaRef: areaRef('seoul-mokdong-apartment-district'),
    addressZh: '首尔特别市阳川区木洞东路公寓带，邻近公园、学校与日常商业街',
    addressEn: 'Mokdongdong-ro apartment belt, Yangcheon-gu, near parks, schools, and daily retail',
    depositKrw: 80_000_000,
    monthlyKrw: 1_480_000,
    maintenanceKrw: 155_000,
    availableFrom: '2026-10-01',
    roomCount: 2,
    bathCount: 1,
    areaSqm: 56.2,
    floorZh: '10 层 / 共 15 层',
    floorEn: '10F / 15F',
    orientationZh: '东南向',
    orientationEn: 'Southeast-facing',
    summaryZh: '客厅连接封闭式阳台，两个卧室互不穿行，收纳空间适合长期生活。',
    summaryEn: 'The living room opens to an enclosed balcony, with two private bedrooms and practical storage.',
    commuteZh: '木洞站公交换乘约 14 分钟',
    commuteEn: 'About 14 minutes to Mokdong Station by local bus',
    amenities: Object.freeze(['elevator', 'security', 'school', 'park']),
    media: Object.freeze({ kind: 'plan', tone: 'clay', rooms: 2 }),
  }),
  listing({
    id: 'housing_listing_jari_003',
    mode: 'rent',
    titleZh: '盘浦江岸，一室景观公寓',
    titleEn: 'One-bedroom river-view home in Banpo',
    areaRef: areaRef('seoul-acro-river-park'),
    addressZh: '首尔特别市瑞草区新盘浦路 15 街 19 一带，靠近汉江公园的住宅片区',
    addressEn: 'Sinbanpo-ro 15-gil residential area, Seocho-gu, near the Han River parks',
    depositKrw: 500_000_000,
    monthlyKrw: 4_800_000,
    maintenanceKrw: 460_000,
    availableFrom: '2026-09-20',
    roomCount: 1,
    bathCount: 1,
    areaSqm: 43.8,
    floorZh: '高层',
    floorEn: 'High floor',
    orientationZh: '西南向',
    orientationEn: 'Southwest-facing',
    summaryZh: '开放式餐厨与客厅连成一体，窗边留有安静的阅读位置。',
    summaryEn: 'An open kitchen and living room share the river-facing side, with a quiet reading nook by the window.',
    commuteZh: '高速巴士客运站约 12 分钟步行',
    commuteEn: 'About a 12-minute walk to Express Bus Terminal',
    amenities: Object.freeze(['elevator', 'security', 'river', 'concierge']),
    media: Object.freeze({ kind: 'plan', tone: 'river', rooms: 1 }),
  }),
  listing({
    id: 'housing_listing_jari_004',
    mode: 'rent',
    titleZh: '紫谷洞安静单间',
    titleEn: 'Quiet compact home in Jagok-dong',
    areaRef: areaRef('seoul-lh-gangnam-complex-3'),
    addressZh: '首尔特别市江南区紫谷路 3 街公共住宅社区内',
    addressEn: 'Public housing community around Jagok-ro 3-gil, Gangnam-gu, Seoul',
    depositKrw: 5_000_000,
    monthlyKrw: 590_000,
    maintenanceKrw: 55_000,
    availableFrom: '2026-08-28',
    roomCount: 1,
    bathCount: 1,
    areaSqm: 19.8,
    floorZh: '3 层 / 共 8 层',
    floorEn: '3F / 8F',
    orientationZh: '东向',
    orientationEn: 'East-facing',
    summaryZh: '面积不大，但厨房、卫浴和睡眠区各自完整，窗外没有近距离遮挡。',
    summaryEn: 'Compact but complete, with separate kitchen, bath, and sleeping zones and an open outlook.',
    commuteZh: '社区巴士站约 4 分钟步行',
    commuteEn: 'About a 4-minute walk to the neighborhood bus stop',
    amenities: Object.freeze(['elevator', 'security']),
    media: Object.freeze({ kind: 'none', tone: 'linen', rooms: 1 }),
  }),
  listing({
    id: 'housing_listing_jari_005',
    mode: 'buy',
    titleZh: '盘浦三室家庭住宅',
    titleEn: 'Three-bedroom family home in Banpo',
    areaRef: areaRef('seoul-raemian-one-bailey'),
    addressZh: '首尔特别市瑞草区盘浦洞汉江住宅带，邻近学校、公园与社区商业设施',
    addressEn: 'Banpo riverfront residential belt, Seocho-gu, near schools, parks, and neighborhood retail',
    totalPriceKrw: 3_980_000_000,
    maintenanceKrw: 620_000,
    availableFrom: '2026-11-15',
    roomCount: 3,
    bathCount: 2,
    areaSqm: 84.9,
    floorZh: '中高层',
    floorEn: 'Mid-high floor',
    orientationZh: '南向',
    orientationEn: 'South-facing',
    summaryZh: '家庭起居空间朝南，主卧与次卧分区清楚，餐厨区适合多人共同生活。',
    summaryEn: 'South-facing family spaces, separated bedrooms, and a kitchen-dining area suited to shared routines.',
    commuteZh: '盘浦站与高速巴士客运站生活圈',
    commuteEn: 'Within the Banpo and Express Bus Terminal transit area',
    amenities: Object.freeze(['elevator', 'security', 'parking', 'park']),
    media: Object.freeze({ kind: 'plan', tone: 'sand', rooms: 3 }),
  }),
  listing({
    id: 'housing_listing_jari_006',
    mode: 'buy',
    titleZh: '汉南山坡的安静宅邸',
    titleEn: 'A quiet hillside residence in Hannam',
    areaRef: areaRef('seoul-hannam-the-hill'),
    addressZh: '首尔特别市龙山区读书堂路 111 周边高私密住宅区域，具体楼栋信息仅在房源来源恢复后提供',
    addressEn: 'High-privacy residential area around 111 Dokseodang-ro, Yongsan-gu; building details remain unavailable',
    totalPriceKrw: 14_800_000_000,
    maintenanceKrw: 1_400_000,
    availableFrom: '2027-01-10',
    roomCount: 4,
    bathCount: 3,
    areaSqm: 208.4,
    floorZh: '低层独立单元',
    floorEn: 'Low-rise private unit',
    orientationZh: '南向',
    orientationEn: 'South-facing',
    summaryZh: '房源来源目前不可用。住处只保留已缓存的公开摘要，不补写楼栋、室内或联系人信息。',
    summaryEn: 'The listing source is unavailable. Jari keeps only the cached public summary and does not reconstruct unit or contact details.',
    commuteZh: '汉南洞住宅片区参考',
    commuteEn: 'Hannam residential-area reference',
    amenities: Object.freeze(['security', 'parking', 'privacy']),
    sourceStatus: 'unavailable',
    media: Object.freeze({ kind: 'none', tone: 'charcoal', rooms: 4 }),
  }),
  listing({
    id: 'housing_listing_jari_007',
    mode: 'buy',
    titleZh: '清潭顶层复式',
    titleEn: 'Cheongdam duplex penthouse',
    areaRef: areaRef('seoul-ph129-cheongdam'),
    addressZh: '首尔特别市江南区清潭洞 129 一带，面向汉江的高私密住宅坐标（仅作区域参考）',
    addressEn: 'Around 129 Cheongdam-dong, Gangnam-gu, a high-privacy Han River residential area reference',
    totalPriceKrw: 21_500_000_000,
    maintenanceKrw: 2_050_000,
    availableFrom: '2027-02-01',
    roomCount: 5,
    bathCount: 4,
    areaSqm: 273.9,
    floorZh: '顶层复式',
    floorEn: 'Duplex penthouse',
    orientationZh: '南向',
    orientationEn: 'South-facing',
    summaryZh: '双层起居区围绕中庭组织，公共空间与卧室层分开。当前房源已撤下，不能建立看房草稿。',
    summaryEn: 'Two living levels wrap around an atrium, separating shared spaces from bedrooms. This listing is withdrawn.',
    commuteZh: '清潭洞与狎鸥亭生活圈',
    commuteEn: 'Cheongdam and Apgujeong neighborhood access',
    amenities: Object.freeze(['security', 'parking', 'river', 'privacy']),
    sourceStatus: 'withdrawn',
    media: Object.freeze({ kind: 'plan', tone: 'charcoal', rooms: 5 }),
  }),
])

export const HOUSING_AMENITIES = Object.freeze({
  elevator: Object.freeze({ labelZh: '电梯', labelEn: 'Elevator', icon: 'fa-elevator' }),
  security: Object.freeze({ labelZh: '门禁', labelEn: 'Controlled entry', icon: 'fa-shield-halved' }),
  parking: Object.freeze({ labelZh: '停车', labelEn: 'Parking', icon: 'fa-square-parking' }),
  school: Object.freeze({ labelZh: '学校附近', labelEn: 'Near schools', icon: 'fa-school' }),
  park: Object.freeze({ labelZh: '公园附近', labelEn: 'Near parks', icon: 'fa-tree' }),
  river: Object.freeze({ labelZh: '江岸生活圈', labelEn: 'Riverside area', icon: 'fa-water' }),
  concierge: Object.freeze({ labelZh: '管理服务', labelEn: 'Managed building', icon: 'fa-bell-concierge' }),
  privacy: Object.freeze({ labelZh: '高私密', labelEn: 'High privacy', icon: 'fa-eye-slash' }),
})

export const HOUSING_VIEWING_SLOTS = Object.freeze([
  Object.freeze({ id: '2026-08-29T10:30:00+09:00', dateZh: '8 月 29 日（周六）', dateEn: 'Sat, Aug 29', time: '10:30' }),
  Object.freeze({ id: '2026-08-29T15:00:00+09:00', dateZh: '8 月 29 日（周六）', dateEn: 'Sat, Aug 29', time: '15:00' }),
  Object.freeze({ id: '2026-08-30T11:00:00+09:00', dateZh: '8 月 30 日（周日）', dateEn: 'Sun, Aug 30', time: '11:00' }),
  Object.freeze({ id: '2026-09-01T18:30:00+09:00', dateZh: '9 月 1 日（周二）', dateEn: 'Tue, Sep 1', time: '18:30' }),
])

export const findHousingListing = (listingId) =>
  HOUSING_LISTINGS.find((item) => item.id === listingId) || null

export const formatHousingMoney = (amount, isZh = true) => {
  const value = Math.max(0, Number(amount) || 0)
  if (isZh) {
    if (value >= 100_000_000) {
      const eok = value / 100_000_000
      return `${Number.isInteger(eok) ? eok : eok.toFixed(1)} 亿韩元`
    }
    if (value >= 10_000) return `${new Intl.NumberFormat('zh-CN').format(value / 10_000)} 万韩元`
    return `${new Intl.NumberFormat('zh-CN').format(value)} 韩元`
  }
  return `₩${new Intl.NumberFormat('en-US').format(value)}`
}

export const formatHousingPrice = (item, isZh = true) => {
  if (!item) return ''
  if (item.mode === 'buy') return formatHousingMoney(item.totalPriceKrw, isZh)
  return isZh
    ? `押金 ${formatHousingMoney(item.depositKrw, true)} · 月租 ${formatHousingMoney(item.monthlyKrw, true)}`
    : `${formatHousingMoney(item.depositKrw, false)} deposit · ${formatHousingMoney(item.monthlyKrw, false)}/mo`
}

export const validateHousingFixtureContract = (listings = HOUSING_LISTINGS, areas = HOUSING_AREA_REFS) => {
  if (!Array.isArray(listings) || listings.length < 6 || !Array.isArray(areas)) return false
  const listingIds = listings.map((item) => item?.id)
  if (new Set(listingIds).size !== listingIds.length) return false
  const areaKeys = new Set(areas.map((item) => `${item.mapPackId}:${item.placeId}`))
  return listings.every((item) => {
    if (!item || !/^housing_listing_[a-z0-9_]+$/.test(item.id)) return false
    if (!['rent', 'buy'].includes(item.mode)) return false
    if (!['available', 'unavailable', 'withdrawn'].includes(item.sourceStatus)) return false
    if (!item.areaRef || item.id === item.areaRef.placeId) return false
    if (!areaKeys.has(`${item.areaRef.mapPackId}:${item.areaRef.placeId}`)) return false
    if (!item.titleZh || !item.titleEn || !item.addressZh || !item.addressEn) return false
    if (!Number.isFinite(item.areaSqm) || item.areaSqm <= 0) return false
    return item.mode === 'rent'
      ? Number.isFinite(item.depositKrw) && Number.isFinite(item.monthlyKrw)
      : Number.isFinite(item.totalPriceKrw)
  })
}
