export const BROWSER_SHELL_STORAGE_KEY = 'schatphone:browser-shell:s1-state'

export const BROWSER_SOURCE_KINDS = Object.freeze(['all', 'help', 'world', 'web'])

export const BROWSER_SOURCE_META = Object.freeze({
  help: {
    icon: 'fa-circle-question',
    labelZh: '使用帮助',
    labelEn: 'Help',
  },
  world: {
    icon: 'fa-earth-asia',
    labelZh: '现代首尔',
    labelEn: 'Modern Seoul',
  },
  web: {
    icon: 'fa-globe',
    labelZh: '互联网',
    labelEn: 'Web',
  },
})

export const BROWSER_HELP_ARTICLES = Object.freeze([
  {
    resultId: 'help_calendar_agenda_journey',
    sourceKind: 'help',
    sourceLabelZh: '使用帮助',
    sourceLabelEn: 'Help',
    titleZh: '日历、日程和行程有什么区别？',
    titleEn: 'What is the difference between Calendar, Agenda, and Journey?',
    summaryZh: '日历保存时间安排，日程描述要做的事，行程负责从当前位置前往活动地点。',
    summaryEn: 'Calendar keeps time plans, an agenda describes the activity, and a journey gets you to its place.',
    keywords: ['日历', '日程', '行程', '迟到', 'calendar', 'agenda', 'journey', 'schedule'],
    bodyZh: [
      {
        heading: '日历：什么时候发生',
        paragraphs: [
          '日历负责保存已经确认的日期、开始时间、结束时间和提醒。一个活动出现在日历里，只代表你计划在那个时间做这件事。',
          '如果活动还没有确定，不要把临时想法当作已经确认的安排。你可以先保留草稿，等时间和地点都明确后再确认。',
        ],
      },
      {
        heading: '日程：到场后做什么',
        paragraphs: [
          '日程说明活动内容，例如彩排、录制、会议或就诊。它可以包含联系人、准备事项和现场步骤，但不会替代地图中的出发与到达判断。',
        ],
      },
      {
        heading: '行程：怎样到达',
        paragraphs: [
          '当日程绑定了明确地点，你可以从日历进入行程。行程会根据当前出发点、交通方式和预计时间提供路线，并在真正开始移动后更新进度。',
          '遇到受阻时，应重新估算到达时间或选择可行的换乘方案；“保持原样”只保留当前选择，不代表延误已经被处理。',
        ],
      },
    ],
    bodyEn: [
      {
        heading: 'Calendar: when it happens',
        paragraphs: [
          'Calendar stores a confirmed date, start time, end time, and reminders. An item appearing there means you plan to do it at that time.',
          'If the activity is not confirmed yet, keep it as a draft instead of presenting it as a final commitment.',
        ],
      },
      {
        heading: 'Agenda: what happens there',
        paragraphs: [
          'The agenda describes the activity itself, such as rehearsal, recording, a meeting, or an appointment. It may include contacts and preparation, but it does not replace Map travel and arrival.',
        ],
      },
      {
        heading: 'Journey: how you get there',
        paragraphs: [
          'When an agenda has a stable place, you can start a journey from Calendar. Journey uses the departure place, travel mode, and estimate to guide the trip and only updates progress after travel really starts.',
          'When travel is disrupted, re-estimate arrival or choose a viable transfer. Keeping the current choice does not mean the delay has been resolved.',
        ],
      },
    ],
    ownerModule: 'calendar',
    targetKind: 'help_article',
    targetRef: '/calendar',
    actionLabelZh: '前往日历',
    actionLabelEn: 'Open Calendar',
    availability: 'available',
    updatedAt: '2026-08-23',
  },
  {
    resultId: 'help_map_position_place_arrival',
    sourceKind: 'help',
    sourceLabelZh: '使用帮助',
    sourceLabelEn: 'Help',
    titleZh: '当前位置、进入地点和行程到达并不是一回事',
    titleEn: 'Current position, entering a place, and journey arrival are different',
    summaryZh: '手动移动地图不会伪造旅程到达；进入地点需要一次明确操作。',
    summaryEn: 'Moving the map manually never fakes a journey arrival; entering a place is an explicit action.',
    keywords: ['地图', '当前位置', '地点', '进入', '离开', '到达', 'map', 'position', 'place', 'arrival'],
    bodyZh: [
      {
        heading: '当前位置',
        paragraphs: ['当前位置表示手机目前用于地图体验的位置来源。拖动地图或查看另一个区域，不会自动改变它。'],
      },
      {
        heading: '进入与离开地点',
        paragraphs: ['进入地点是你明确开始一次地点体验；离开会结束这次体验。仅仅看到一个坐标或图钉，不会自动发现地点，也不会创建行程效果。'],
      },
      {
        heading: '行程到达',
        paragraphs: ['行程到达来自已经开始的行程及其检查点。手动把当前位置移到终点附近，不会被当作已经完成行程。'],
      },
    ],
    bodyEn: [
      { heading: 'Current position', paragraphs: ['Current position is the location source used by the Map experience. Panning the map or viewing another area does not change it.'] },
      { heading: 'Enter and leave a place', paragraphs: ['Entering a place explicitly begins a place experience; leaving ends it. Seeing a coordinate or pin does not discover a place or create journey effects.'] },
      { heading: 'Journey arrival', paragraphs: ['Arrival comes from an active journey and its checkpoints. Manually moving the current position near a destination is not treated as completing that journey.'] },
    ],
    ownerModule: 'map',
    targetKind: 'help_article',
    targetRef: '/map',
    actionLabelZh: '前往地图',
    actionLabelEn: 'Open Map',
    availability: 'available',
    updatedAt: '2026-08-23',
  },
  {
    resultId: 'help_food_delivery_change_address',
    sourceKind: 'help',
    sourceLabelZh: '使用帮助',
    sourceLabelEn: 'Help',
    titleZh: '如何修改外卖配送地址？',
    titleEn: 'How do I change a food-delivery address?',
    summaryZh: '是否能直接修改取决于商家和配送员是否已经处理订单。',
    summaryEn: 'Whether you can edit directly depends on whether the merchant and courier have processed the order.',
    keywords: ['外卖', '地址', '配送', '骑手', '订单', '修改外卖地址', 'food delivery', 'address', 'courier', 'order'],
    bodyZh: [
      { heading: '从订单发起', paragraphs: ['打开对应订单并选择联系商家或配送员。修改地址属于订单内行为，不会根据你当前所在位置自动判断。'] },
      { heading: '尚未取餐', paragraphs: ['如果订单仍允许修改，平台会展示地址确认流程。请重新选择地址并确认，原地址不会因发送一句消息而自动被覆盖。'] },
      { heading: '已经取餐', paragraphs: ['如果配送员已经取餐，需要先发送改址请求。配送员明确同意后再选择新地址；未回应时可以使用订单内提供的联络方式。'] },
    ],
    bodyEn: [
      { heading: 'Start from the order', paragraphs: ['Open the relevant order and contact the merchant or courier. Address correction is an order action; it is never inferred from your current position.'] },
      { heading: 'Before pickup', paragraphs: ['If editing is still allowed, the platform shows an address confirmation flow. Select and confirm the new address; a message alone does not overwrite the original.'] },
      { heading: 'After pickup', paragraphs: ['Send an address-change request first. Choose the new address after the courier agrees; if they do not respond, use the contact option provided in the order.'] },
    ],
    ownerModule: 'food-delivery',
    targetKind: 'help_article',
    targetRef: '/food-delivery',
    actionLabelZh: '打开外卖',
    actionLabelEn: 'Open Food Delivery',
    availability: 'available',
    updatedAt: '2026-08-23',
  },
  {
    resultId: 'help_wallet_ledger_immutable',
    sourceKind: 'help',
    sourceLabelZh: '使用帮助',
    sourceLabelEn: 'Help',
    titleZh: '为什么钱包流水不能直接删除？',
    titleEn: 'Why can’t I delete a Wallet transaction?',
    summaryZh: '流水是已经发生的资金记录；纠正时应添加来源明确的冲正或退款。',
    summaryEn: 'A ledger entry records money that already moved; corrections use a traceable reversal or refund.',
    keywords: ['钱包', '流水', '删除', '退款', '冲正', 'wallet', 'transaction', 'delete', 'refund'],
    bodyZh: [
      { heading: '流水记录已经发生的变化', paragraphs: ['一笔已经确认的付款或退款会保留流水编号和来源。删除它会让余额与订单、账单或退款失去对应关系。'] },
      { heading: '怎样纠正', paragraphs: ['如果交易需要撤销，应从原订单或业务页面发起退款或冲正。钱包会保留原记录，并新增一笔可追溯的反向变化。'] },
    ],
    bodyEn: [
      { heading: 'Ledger entries record completed changes', paragraphs: ['A confirmed payment or refund keeps its reference and source. Deleting it would break the connection between balance, order, bill, and refund.'] },
      { heading: 'How corrections work', paragraphs: ['Start a refund or reversal from the source order or service. Wallet keeps the original entry and adds a traceable opposite change.'] },
    ],
    ownerModule: 'wallet',
    targetKind: 'help_article',
    targetRef: '/wallet',
    actionLabelZh: '前往钱包',
    actionLabelEn: 'Open Wallet',
    availability: 'available',
    updatedAt: '2026-08-23',
  },
  {
    resultId: 'help_browser_sources',
    sourceKind: 'help',
    sourceLabelZh: '使用帮助',
    sourceLabelEn: 'Help',
    titleZh: '怎样分辨帮助、当前世界和互联网结果？',
    titleEn: 'How do I tell Help, World, and Web results apart?',
    summaryZh: '每条结果都有持续可见的来源标签；不同来源不会被合并成一段无出处的答案。',
    summaryEn: 'Every result keeps a visible source label, and sources are never merged into an unattributed answer.',
    keywords: ['浏览器', '搜索', '来源', '帮助', '世界', '互联网', 'browser', 'search', 'source', 'help', 'world', 'web'],
    bodyZh: [
      { heading: '使用帮助', paragraphs: ['说明 SchatPhone 中已经存在的功能、限制和操作方式。它不会替你执行操作，也不会把计划中的功能写成已经可用。'] },
      { heading: '当前世界', paragraphs: ['展示当前虚拟世界中可公开检索的地点、机构和知识。世界页面不等于真实互联网资料，切换世界后不适用的页面会停止显示。'] },
      { heading: '互联网', paragraphs: ['真实网页需要外部搜索服务或跳转到外部搜索网站。折光浏览器不会把虚构页面伪装成真实网站，也不会把设备中的私密内容发给外部服务。'] },
    ],
    bodyEn: [
      { heading: 'Help', paragraphs: ['Explains available SchatPhone features, boundaries, and steps. It does not perform actions for you or describe planned features as available.'] },
      { heading: 'Current world', paragraphs: ['Shows publicly searchable places, organizations, and knowledge from the active fictional world. World pages are not real-web facts and stop displaying when they no longer apply.'] },
      { heading: 'Web', paragraphs: ['Real webpages require an external search service or a handoff to an external search site. Prism never disguises fictional pages as real sites or sends private device content to a provider.'] },
    ],
    ownerModule: 'browser',
    targetKind: 'help_article',
    targetRef: '',
    actionLabelZh: '',
    actionLabelEn: '',
    availability: 'available',
    updatedAt: '2026-08-23',
  },
])

export const BROWSER_WORLD_PAGES = Object.freeze([
  {
    resultId: 'world_hanul_broadcast_center',
    sourceKind: 'world',
    sourceLabelZh: '现代首尔',
    sourceLabelEn: 'Modern Seoul',
    titleZh: 'Hanul 放送中心',
    titleEn: 'Hanul Broadcast Center',
    summaryZh: '麻浦区的综合节目制作设施，设有公开大厅、录音棚和直播演播区。',
    summaryEn: 'A production complex in Mapo with a public lobby, recording studios, and live-broadcast stages.',
    keywords: ['hanul', '放送', '广播', '电视台', '麻浦', '录制', 'broadcast', 'mapo', 'studio'],
    factsZh: [
      ['区域', '首尔特别市 麻浦区'],
      ['开放区域', '一层大厅、访客咖啡区'],
      ['到访提示', '录制区需凭当日通行信息进入'],
    ],
    factsEn: [
      ['Area', 'Mapo-gu, Seoul'],
      ['Public areas', 'Ground-floor lobby and visitor café'],
      ['Visit note', 'Recording areas require same-day access details'],
    ],
    bodyZh: ['Hanul 放送中心承办音乐节目、广播访谈和小型现场录制。公开区域可以作为会面与等候地点，录制区域的开放情况以当日公开安排为准。'],
    bodyEn: ['Hanul Broadcast Center hosts music shows, radio interviews, and small live recordings. Public areas can be used for meetings and waiting; studio access follows the published schedule for that day.'],
    ownerModule: 'map',
    ownerRecordId: 'place_hanul_broadcast_center',
    ownerRevision: 3,
    worldId: 'world_modern_seoul',
    worldRevision: 8,
    targetKind: 'local_page',
    targetRef: '/map',
    actionLabelZh: '在地图中查看',
    actionLabelEn: 'View in Map',
    availability: 'available',
    updatedAt: '2026-08-20',
    domain: 'hanul.onair.world',
  },
  {
    resultId: 'world_seongsu_creative_lane',
    sourceKind: 'world',
    sourceLabelZh: '现代首尔',
    sourceLabelEn: 'Modern Seoul',
    titleZh: '圣水创意巷',
    titleEn: 'Seongsu Creative Lane',
    summaryZh: '由旧工厂改造的工作室、展览空间和独立商店街区。',
    summaryEn: 'A district of studios, exhibition spaces, and independent shops converted from old factories.',
    keywords: ['圣水', '创意', '展览', '工作室', '商店', 'seongsu', 'creative', 'gallery', 'studio'],
    factsZh: [['区域', '首尔特别市 城东区'], ['适合', '展览、拍摄、独立品牌探店'], ['拥挤时段', '周末 14:00–19:00']],
    factsEn: [['Area', 'Seongdong-gu, Seoul'], ['Good for', 'Exhibitions, shoots, and independent shops'], ['Busy hours', 'Weekends, 14:00–19:00']],
    bodyZh: ['圣水创意巷保留了仓库与砖墙街景，街区内的店铺更替较快。前往某家具体店铺前，请在地图地点页确认它仍然开放。'],
    bodyEn: ['Seongsu Creative Lane keeps its warehouse and brick-street character, while individual shops change often. Check the Map place page before visiting a specific venue.'],
    ownerModule: 'map',
    ownerRecordId: 'area_seongsu_creative_lane',
    ownerRevision: 4,
    worldId: 'world_modern_seoul',
    worldRevision: 8,
    targetKind: 'local_page',
    targetRef: '/map',
    actionLabelZh: '在地图中查看',
    actionLabelEn: 'View in Map',
    availability: 'available',
    updatedAt: '2026-08-18',
    domain: 'seongsu.guide.world',
  },
  {
    resultId: 'world_mirae_night_clinic',
    sourceKind: 'world',
    sourceLabelZh: '现代首尔',
    sourceLabelEn: 'Modern Seoul',
    titleZh: 'Mirae 夜间诊所',
    titleEn: 'Mirae Night Clinic',
    summaryZh: '提供晚间普通门诊的虚构社区诊所公开介绍页。',
    summaryEn: 'A public profile for a fictional neighborhood clinic offering evening general appointments.',
    keywords: ['mirae', '夜间', '诊所', '医院', '医疗', 'clinic', 'night', 'healthcare'],
    factsZh: [['区域', '首尔特别市 龙山区'], ['公开时间', '周一至周六 18:00–23:00'], ['页面性质', '当前世界虚构机构']],
    factsEn: [['Area', 'Yongsan-gu, Seoul'], ['Published hours', 'Mon–Sat, 18:00–23:00'], ['Page type', 'Fictional current-world institution']],
    bodyZh: ['本页只展示机构公开信息，不包含任何人的预约、报告或健康资料。具体服务与可预约时段应以医疗 App 中的机构页面为准。'],
    bodyEn: ['This page contains public institution information only. It never includes appointments, reports, or personal health data. Services and available times belong in the Healthcare app.'],
    ownerModule: 'map',
    ownerRecordId: 'place_mirae_night_clinic',
    ownerRevision: 2,
    worldId: 'world_modern_seoul',
    worldRevision: 8,
    targetKind: 'local_page',
    targetRef: '/map',
    actionLabelZh: '在地图中查看',
    actionLabelEn: 'View in Map',
    availability: 'available',
    updatedAt: '2026-08-21',
    domain: 'mirae-care.world',
  },
  {
    resultId: 'world_retired_training_annex',
    sourceKind: 'world',
    sourceLabelZh: '现代首尔',
    sourceLabelEn: 'Modern Seoul',
    titleZh: '旧练习楼附馆',
    titleEn: 'Former Practice Annex',
    summaryZh: '此公开地点记录已经撤回。',
    summaryEn: 'This public place record has been withdrawn.',
    keywords: ['旧练习楼', '练习室', '撤回', 'former practice annex', 'retired'],
    bodyZh: [],
    bodyEn: [],
    ownerModule: 'map',
    ownerRecordId: 'place_retired_training_annex',
    ownerRevision: 1,
    worldId: 'world_modern_seoul',
    worldRevision: 7,
    targetKind: 'local_page',
    targetRef: '',
    actionLabelZh: '',
    actionLabelEn: '',
    availability: 'stale',
    updatedAt: '2026-07-02',
    domain: 'places.modern-seoul.world',
  },
])

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, ' ')
    .trim()

const localizedSearchText = (record, isZh) => {
  const body = isZh ? record.bodyZh : record.bodyEn
  const structuredBody = Array.isArray(body)
    ? body.flatMap((section) =>
        typeof section === 'string'
          ? [section]
          : [section.heading, ...(Array.isArray(section.paragraphs) ? section.paragraphs : [])],
      )
    : []
  return normalizeText(
    [
      isZh ? record.titleZh : record.titleEn,
      isZh ? record.summaryZh : record.summaryEn,
      ...(record.keywords || []),
      ...structuredBody,
    ].join(' '),
  )
}

const scoreRecord = (record, query, isZh) => {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return 1
  const title = normalizeText(isZh ? record.titleZh : record.titleEn)
  const summary = normalizeText(isZh ? record.summaryZh : record.summaryEn)
  const haystack = localizedSearchText(record, isZh)
  const tokens = normalizedQuery.split(' ').filter(Boolean)
  let score = 0
  if (title === normalizedQuery) score += 100
  if (title.includes(normalizedQuery)) score += 40
  if (summary.includes(normalizedQuery)) score += 18
  tokens.forEach((token) => {
    if (title.includes(token)) score += 12
    if (summary.includes(token)) score += 6
    if (haystack.includes(token)) score += 2
  })
  return score
}

export const searchBrowserShellRecords = ({ query = '', sourceKind = 'all', isZh = true } = {}) => {
  const source = BROWSER_SOURCE_KINDS.includes(sourceKind) ? sourceKind : 'all'
  const records = [...BROWSER_HELP_ARTICLES, ...BROWSER_WORLD_PAGES]
  return records
    .filter((record) => source === 'all' || record.sourceKind === source)
    .map((record) => ({ record, score: scoreRecord(record, query, isZh) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.record.resultId.localeCompare(right.record.resultId))
    .map(({ record }) => record)
}

export const getBrowserShellRecord = (resultId) =>
  [...BROWSER_HELP_ARTICLES, ...BROWSER_WORLD_PAGES].find((record) => record.resultId === resultId) || null

const createDefaultState = () => ({
  version: 1,
  historyEnabled: true,
  history: [],
  bookmarks: [],
  recent: [],
})

const normalizeEntryList = (value, max, hasQuery = false) =>
  (Array.isArray(value) ? value : [])
    .filter((entry) => entry && typeof entry.id === 'string')
    .map((entry) => ({
      id: entry.id.slice(0, 120),
      ...(hasQuery ? { query: String(entry.query || '').slice(0, 160) } : {}),
      at: Number.isFinite(entry.at) ? entry.at : Date.now(),
    }))
    .filter((entry) => !hasQuery || entry.query.trim())
    .slice(0, max)

export const loadBrowserShellState = () => {
  const fallback = createDefaultState()
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = JSON.parse(localStorage.getItem(BROWSER_SHELL_STORAGE_KEY) || 'null')
    if (!raw || raw.version !== 1) return fallback
    return {
      version: 1,
      historyEnabled: raw.historyEnabled !== false,
      history: normalizeEntryList(raw.history, 30, true),
      bookmarks: normalizeEntryList(raw.bookmarks, 80),
      recent: normalizeEntryList(raw.recent, 30),
    }
  } catch {
    return fallback
  }
}

export const saveBrowserShellState = (state) => {
  if (typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(
      BROWSER_SHELL_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        historyEnabled: state.historyEnabled !== false,
        history: normalizeEntryList(state.history, 30, true),
        bookmarks: normalizeEntryList(state.bookmarks, 80),
        recent: normalizeEntryList(state.recent, 30),
      }),
    )
    return true
  } catch {
    return false
  }
}

export const resetBrowserShellStateForTesting = () => {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(BROWSER_SHELL_STORAGE_KEY)
}
