export const TICKETS_SHELL_STORAGE_KEY = 'schatphone:tickets-shell:preview-state'
export const TICKETS_SHELL_STORAGE_VERSION = 1

export const TICKETS_BRAND = Object.freeze({
  nameZh: '入场',
  nameEn: 'GATE',
  nameKo: '게이트',
  taglineZh: '先找到想去的现场。',
  taglineEn: 'Find the room you want to be in.',
})

export const TICKET_CATEGORY_OPTIONS = Object.freeze([
  Object.freeze({ id: 'all', labelZh: '全部', labelEn: 'All' }),
  Object.freeze({ id: 'concert', labelZh: '演唱会', labelEn: 'Concerts' }),
  Object.freeze({ id: 'music_show', labelZh: '打歌现场', labelEn: 'Music shows' }),
  Object.freeze({ id: 'film', labelZh: '电影', labelEn: 'Film' }),
  Object.freeze({ id: 'exhibition', labelZh: '展览', labelEn: 'Exhibitions' }),
  Object.freeze({ id: 'fan_event', labelZh: '粉丝活动', labelEn: 'Fan events' }),
])

export const TICKET_STATUS_META = Object.freeze({
  on_sale: Object.freeze({ labelZh: '正在售票', labelEn: 'On sale', tone: 'signal' }),
  lottery_open: Object.freeze({ labelZh: '抽选开放', labelEn: 'Lottery open', tone: 'violet' }),
  reservation: Object.freeze({ labelZh: '开放预约', labelEn: 'Reservation', tone: 'blue' }),
  waitlist: Object.freeze({ labelZh: '可登记候补', labelEn: 'Waitlist', tone: 'amber' }),
  sold_out: Object.freeze({ labelZh: '已售罄', labelEn: 'Sold out', tone: 'muted' }),
})

export const TICKET_EVENTS = Object.freeze([
  Object.freeze({
    id: 'gate-event-hanul-dome-20260912',
    category: 'concert',
    status: 'lottery_open',
    titleZh: 'HANUL 1st ARENA：BLUE HOUR',
    titleEn: 'HANUL 1st ARENA: BLUE HOUR',
    dateZh: '2026 年 9 月 12 日 · 18:00',
    dateEn: 'Sep 12, 2026 · 6:00 PM',
    venueZh: 'KSPO DOME',
    venueEn: 'KSPO DOME',
    districtZh: '首尔 · 松坡',
    districtEn: 'Songpa · Seoul',
    priceZh: '₩88,000 起',
    priceEn: 'From ₩88,000',
    mapPlaceId: 'seoul-kspo-dome',
    organizerZh: 'LUMEN ENTERTAINMENT',
    organizerEn: 'LUMEN ENTERTAINMENT',
    summaryZh: 'HANUL 首次竞技场巡演首尔场。当前仅开放粉丝会员抽选登记。',
    summaryEn: 'HANUL opens its first arena tour in Seoul. Fan membership lottery registration is currently available.',
    accent: '#ff4b32',
    mark: 'H',
  }),
  Object.freeze({
    id: 'gate-event-nodeul-live-20260903',
    category: 'music_show',
    status: 'reservation',
    titleZh: '江面之外 · 公开舞台',
    titleEn: 'Beyond the River · Public Stage',
    dateZh: '2026 年 9 月 3 日 · 19:30',
    dateEn: 'Sep 3, 2026 · 7:30 PM',
    venueZh: '江心现场',
    venueEn: 'Nodeul Live',
    districtZh: '首尔 · 龙山',
    districtEn: 'Yongsan · Seoul',
    priceZh: '免费预约',
    priceEn: 'Free reservation',
    mapPlaceId: 'seoul-nodeul-live-house',
    organizerZh: 'NODEUL LIVE',
    organizerEn: 'NODEUL LIVE',
    summaryZh: '三组新人音乐人的小型公开舞台。预约只是本机意向，尚未取得席位。',
    summaryEn: 'A small public stage for three emerging acts. A local draft does not secure admission.',
    accent: '#2867f0',
    mark: 'N',
  }),
  Object.freeze({
    id: 'gate-event-midnight-film-20260829',
    category: 'film',
    status: 'on_sale',
    titleZh: '《午夜之后》导演交流场',
    titleEn: 'After Midnight · Director Q&A',
    dateZh: '2026 年 8 月 29 日 · 20:20',
    dateEn: 'Aug 29, 2026 · 8:20 PM',
    venueZh: 'MEGABOX COEX',
    venueEn: 'MEGABOX COEX',
    districtZh: '首尔 · 三成',
    districtEn: 'Samseong · Seoul',
    priceZh: '₩18,000',
    priceEn: '₩18,000',
    mapPlaceId: 'seoul-megabox-coex',
    organizerZh: 'SEOUL FILM WEEK',
    organizerEn: 'SEOUL FILM WEEK',
    summaryZh: '影片放映后安排 35 分钟导演交流。首版只保存购票草稿，不锁座。',
    summaryEn: 'A 35-minute director Q&A follows the screening. S1 saves a purchase draft and does not hold a seat.',
    accent: '#f0c932',
    mark: 'M',
  }),
  Object.freeze({
    id: 'gate-event-ddp-light-20261002',
    category: 'exhibition',
    status: 'waitlist',
    titleZh: '折叠首尔：夜间光影展',
    titleEn: 'Folded Seoul: Night Light Exhibition',
    dateZh: '2026 年 10 月 2 日—11 月 8 日',
    dateEn: 'Oct 2–Nov 8, 2026',
    venueZh: '东大门设计广场',
    venueEn: 'Dongdaemun Design Plaza',
    districtZh: '首尔 · 东大门',
    districtEn: 'Dongdaemun · Seoul',
    priceZh: '₩24,000',
    priceEn: '₩24,000',
    mapPlaceId: 'seoul-dongdaemun-design-plaza',
    organizerZh: 'DDP DESIGN LAB',
    organizerEn: 'DDP DESIGN LAB',
    summaryZh: '首周末夜场名额已满，可登记本机候补意向；候补不等于获得门票。',
    summaryEn: 'Opening-weekend night sessions are full. A local waitlist draft is not a ticket.',
    accent: '#7b4bea',
    mark: 'D',
  }),
  Object.freeze({
    id: 'gate-event-iseo-listening-20260920',
    category: 'fan_event',
    status: 'sold_out',
    titleZh: '尹伊瑟 · 小型试听会',
    titleEn: 'Yun I-seo · Small Listening Session',
    dateZh: '2026 年 9 月 20 日 · 16:00',
    dateEn: 'Sep 20, 2026 · 4:00 PM',
    venueZh: '圣水录音空间',
    venueEn: 'Seongsu Listening Room',
    districtZh: '首尔 · 圣水',
    districtEn: 'Seongsu · Seoul',
    priceZh: '₩33,000',
    priceEn: '₩33,000',
    mapPlaceId: 'seoul-seongsu-district',
    organizerZh: 'ASTER × LUMEN',
    organizerEn: 'ASTER × LUMEN',
    summaryZh: '限额试听与制作笔记分享。当前售罄，首版不伪造转票或库存恢复。',
    summaryEn: 'A limited listening session and production-note talk. Sold out; S1 invents no resale or restored inventory.',
    accent: '#171717',
    mark: 'I',
  }),
])

export const getTicketEvent = (eventId) => TICKET_EVENTS.find((event) => event.id === eventId) || null
export const getTicketStatusMeta = (status) => TICKET_STATUS_META[status] || null

export const validateTicketsFixtureContract = () => {
  const ids = new Set()
  return TICKET_EVENTS.every((event) => {
    if (!event.id || ids.has(event.id) || !getTicketStatusMeta(event.status)) return false
    ids.add(event.id)
    return Boolean(event.mapPlaceId && event.titleZh && event.titleEn && event.dateZh && event.dateEn)
  })
}
