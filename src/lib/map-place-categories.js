const CATEGORY_DEFINITIONS = Object.freeze({
  home: Object.freeze({
    id: 'home',
    icon: 'fas fa-house',
    tone: '#2563eb',
    labelZh: '居住',
    labelEn: 'Home',
    descriptionZh: '家、宿舍与长期落脚点',
    descriptionEn: 'Homes, dorms, and long-term bases',
    searchTerms: ['住所', '住处', '公寓', 'residence', 'apartment'],
  }),
  work: Object.freeze({
    id: 'work',
    icon: 'fas fa-building',
    tone: '#7c3aed',
    labelZh: '工作',
    labelEn: 'Work',
    descriptionZh: '公司、办公室与工作场所',
    descriptionEn: 'Companies, offices, and workplaces',
    searchTerms: ['总部', '职场', '办公楼', 'headquarters'],
  }),
  school: Object.freeze({
    id: 'school',
    icon: 'fas fa-graduation-cap',
    tone: '#0f766e',
    labelZh: '学校',
    labelEn: 'School',
    descriptionZh: '校园、教室与学习地点',
    descriptionEn: 'Campuses, classrooms, and study places',
    searchTerms: ['大学', '学院', '学习', 'university', 'college'],
  }),
  shop: Object.freeze({
    id: 'shop',
    icon: 'fas fa-store',
    tone: '#c2410c',
    labelZh: '商店',
    labelEn: 'Shop',
    descriptionZh: '购物、补给与服务场所',
    descriptionEn: 'Shopping, supplies, and services',
    searchTerms: ['美容', '造型', '门店', 'salon', 'beauty', 'service'],
  }),
  leisure: Object.freeze({
    id: 'leisure',
    icon: 'fas fa-mug-hot',
    tone: '#be185d',
    labelZh: '休闲',
    labelEn: 'Leisure',
    descriptionZh: '餐饮、娱乐与社交地点',
    descriptionEn: 'Dining, entertainment, and social places',
    searchTerms: ['咖啡', '演出', '演唱会', '场馆', 'cafe', 'concert', 'venue'],
  }),
  other: Object.freeze({
    id: 'other',
    icon: 'fas fa-location-dot',
    tone: '#475569',
    labelZh: '其他',
    labelEn: 'Other',
    descriptionZh: '不属于以上类型的自定义地点',
    descriptionEn: 'Custom places outside the other types',
    searchTerms: ['地标', '公共服务', 'landmark', 'public service'],
  }),
  transit: Object.freeze({
    id: 'transit',
    icon: 'fas fa-train-subway',
    tone: '#0284c7',
    labelZh: '交通',
    labelEn: 'Transit',
    descriptionZh: '车站、机场与公共交通节点',
    descriptionEn: 'Stations, airports, and public transport nodes',
    searchTerms: ['火车', '地铁', '公交', '机场', 'station', 'subway', 'airport'],
  }),
  culture: Object.freeze({
    id: 'culture',
    icon: 'fas fa-landmark',
    tone: '#92400e',
    labelZh: '文化',
    labelEn: 'Culture',
    descriptionZh: '博物馆、宫殿、广场与文化地标',
    descriptionEn: 'Museums, palaces, squares, and cultural landmarks',
    searchTerms: ['博物馆', '宫殿', '广场', '展览', 'museum', 'palace', 'exhibition'],
  }),
  commerce: Object.freeze({
    id: 'commerce',
    icon: 'fas fa-store',
    tone: '#d97706',
    labelZh: '商业',
    labelEn: 'Commerce',
    descriptionZh: '市场、交易与商业聚集地',
    descriptionEn: 'Markets, trade, and commercial gathering places',
    searchTerms: ['市场', '集市', '交易', '购物', 'market', 'trade', 'shopping'],
  }),
  medical: Object.freeze({
    id: 'medical',
    icon: 'fas fa-kit-medical',
    tone: '#dc2626',
    labelZh: '医疗',
    labelEn: 'Medical',
    descriptionZh: '医院、诊所与医疗服务地点',
    descriptionEn: 'Hospitals, clinics, and medical services',
    searchTerms: ['医院', '诊所', '药店', 'hospital', 'clinic', 'pharmacy'],
  }),
  faction: Object.freeze({
    id: 'faction',
    icon: 'fas fa-shield-halved',
    tone: '#6d28d9',
    labelZh: '阵营',
    labelEn: 'Faction',
    descriptionZh: '阵营总部、据点与控制区域',
    descriptionEn: 'Faction headquarters, bases, and controlled areas',
    searchTerms: ['总部', '据点', '领地', 'base', 'territory'],
  }),
  story: Object.freeze({
    id: 'story',
    icon: 'fas fa-triangle-exclamation',
    tone: '#b91c1c',
    labelZh: '事件',
    labelEn: 'Story',
    descriptionZh: '剧情、任务与高风险地点',
    descriptionEn: 'Story, mission, and high-risk locations',
    searchTerms: ['剧情', '任务', '危险', 'mission', 'danger', 'event'],
  }),
})

export const MAP_USER_PLACE_CATEGORIES = Object.freeze(
  ['home', 'work', 'school', 'shop', 'leisure', 'other'].map(
    (categoryId) => CATEGORY_DEFINITIONS[categoryId],
  ),
)

export const normalizeUserMapPlaceCategory = (value) => {
  const categoryId = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return MAP_USER_PLACE_CATEGORIES.some((category) => category.id === categoryId)
    ? categoryId
    : categoryId
      ? 'other'
      : 'home'
}

export const getMapPlaceCategoryVisual = (categoryId = '') =>
  CATEGORY_DEFINITIONS[categoryId] || CATEGORY_DEFINITIONS.other

export const resolveMapPlaceVisual = (place = {}, factions = []) => {
  const category = getMapPlaceCategoryVisual(place.category)
  const faction = (Array.isArray(factions) ? factions : []).find(
    (item) => item.id === place.factionId,
  )
  return {
    ...category,
    icon: place.icon || category.icon,
    tone: faction?.tone || category.tone,
  }
}
