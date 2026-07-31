const CATEGORY_DEFINITIONS = Object.freeze({
  home: Object.freeze({
    id: 'home',
    icon: 'fas fa-house',
    tone: '#2563eb',
    labelZh: '居住',
    labelEn: 'Home',
    descriptionZh: '家、宿舍与长期落脚点',
    descriptionEn: 'Homes, dorms, and long-term bases',
  }),
  work: Object.freeze({
    id: 'work',
    icon: 'fas fa-building',
    tone: '#7c3aed',
    labelZh: '工作',
    labelEn: 'Work',
    descriptionZh: '公司、办公室与工作场所',
    descriptionEn: 'Companies, offices, and workplaces',
  }),
  school: Object.freeze({
    id: 'school',
    icon: 'fas fa-graduation-cap',
    tone: '#0f766e',
    labelZh: '学校',
    labelEn: 'School',
    descriptionZh: '校园、教室与学习地点',
    descriptionEn: 'Campuses, classrooms, and study places',
  }),
  shop: Object.freeze({
    id: 'shop',
    icon: 'fas fa-store',
    tone: '#c2410c',
    labelZh: '商店',
    labelEn: 'Shop',
    descriptionZh: '购物、补给与服务场所',
    descriptionEn: 'Shopping, supplies, and services',
  }),
  leisure: Object.freeze({
    id: 'leisure',
    icon: 'fas fa-mug-hot',
    tone: '#be185d',
    labelZh: '休闲',
    labelEn: 'Leisure',
    descriptionZh: '餐饮、娱乐与社交地点',
    descriptionEn: 'Dining, entertainment, and social places',
  }),
  other: Object.freeze({
    id: 'other',
    icon: 'fas fa-location-dot',
    tone: '#475569',
    labelZh: '其他',
    labelEn: 'Other',
    descriptionZh: '不属于以上类型的自定义地点',
    descriptionEn: 'Custom places outside the other types',
  }),
  transit: Object.freeze({
    id: 'transit',
    icon: 'fas fa-train-subway',
    tone: '#0284c7',
    labelZh: '交通',
    labelEn: 'Transit',
  }),
  culture: Object.freeze({
    id: 'culture',
    icon: 'fas fa-landmark',
    tone: '#92400e',
    labelZh: '文化',
    labelEn: 'Culture',
  }),
  commerce: Object.freeze({
    id: 'commerce',
    icon: 'fas fa-store',
    tone: '#d97706',
    labelZh: '商业',
    labelEn: 'Commerce',
  }),
  medical: Object.freeze({
    id: 'medical',
    icon: 'fas fa-kit-medical',
    tone: '#dc2626',
    labelZh: '医疗',
    labelEn: 'Medical',
  }),
  faction: Object.freeze({
    id: 'faction',
    icon: 'fas fa-shield-halved',
    tone: '#6d28d9',
    labelZh: '阵营',
    labelEn: 'Faction',
  }),
  story: Object.freeze({
    id: 'story',
    icon: 'fas fa-triangle-exclamation',
    tone: '#b91c1c',
    labelZh: '事件',
    labelEn: 'Story',
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
