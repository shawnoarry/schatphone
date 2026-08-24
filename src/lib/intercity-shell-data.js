export const INTERCITY_SHELL_STORAGE_KEY = 'schatphone:intercity-shell:preview-state'
export const INTERCITY_SHELL_STORAGE_VERSION = 1

export const INTERCITY_BRAND = Object.freeze({
  nameZh: '联程',
  nameEn: 'VIA',
  taglineZh: '把下一段路，先接起来。',
  taglineEn: 'Join the next leg before you leave.',
})

export const INTERCITY_MODES = Object.freeze([
  Object.freeze({ id: 'all', labelZh: '全部', labelEn: 'All', icon: 'fas fa-arrows-left-right' }),
  Object.freeze({ id: 'rail', labelZh: '铁路', labelEn: 'Rail', icon: 'fas fa-train' }),
  Object.freeze({ id: 'flight', labelZh: '航班', labelEn: 'Flights', icon: 'fas fa-plane' }),
  Object.freeze({ id: 'coach', labelZh: '长途巴士', labelEn: 'Coach', icon: 'fas fa-bus-simple' }),
  Object.freeze({ id: 'ferry', labelZh: '渡轮', labelEn: 'Ferry', icon: 'fas fa-ship' }),
])

export const INTERCITY_AVAILABILITY_META = Object.freeze({
  available: Object.freeze({ labelZh: '可建立意向', labelEn: 'Draft available', tone: 'available' }),
  limited: Object.freeze({ labelZh: '余位较少', labelEn: 'Limited seats', tone: 'limited' }),
  sold_out: Object.freeze({ labelZh: '当前售罄', labelEn: 'Sold out', tone: 'closed' }),
  unavailable: Object.freeze({ labelZh: '当前不可用', labelEn: 'Unavailable', tone: 'closed' }),
  source_stale: Object.freeze({ labelZh: '班次来源已过期', labelEn: 'Schedule stale', tone: 'stale' }),
})

export const INTERCITY_SERVICES = Object.freeze([
  Object.freeze({
    id: 'via-rail-seoul-busan-0828', mode: 'rail', availability: 'available', date: '2026-08-28',
    carrierZh: '汉江铁路', carrierEn: 'Hangang Rail', serviceNo: 'HR 117',
    originZh: '首尔', originEn: 'Seoul', originCode: 'SEL', originMapPlaceId: 'seoul-station',
    destinationZh: '釜山', destinationEn: 'Busan', destinationCode: 'BSN', destinationMapPlaceId: '',
    departureTime: '08:10', arrivalTime: '10:49', durationZh: '2 小时 39 分', durationEn: '2h 39m',
    noteZh: '首尔站出发的早班高速列车，适合当天抵达后继续安排住宿或活动。',
    noteEn: 'An early high-speed train from Seoul Station, leaving room for a stay or activity after arrival.',
    color: '#174f5b', platformZh: '预计 7 站台', platformEn: 'Platform 7 expected',
    fares: Object.freeze([
      Object.freeze({ id: 'rail-standard', nameZh: '标准座', nameEn: 'Standard', price: 59800, flexibilityZh: '出发前可申请变更', flexibilityEn: 'Change request before departure' }),
      Object.freeze({ id: 'rail-comfort', nameZh: '舒适座', nameEn: 'Comfort', price: 83600, flexibilityZh: '含一次变更申请', flexibilityEn: 'One change request included' }),
    ]),
  }),
  Object.freeze({
    id: 'via-flight-gimpo-jeju-0829', mode: 'flight', availability: 'limited', date: '2026-08-29',
    carrierZh: '青空航空', carrierEn: 'Bluefield Air', serviceNo: 'BF 204',
    originZh: '首尔 / 金浦', originEn: 'Seoul / Gimpo', originCode: 'GMP', originMapPlaceId: 'seoul-gimpo-airport',
    destinationZh: '济州', destinationEn: 'Jeju', destinationCode: 'CJU', destinationMapPlaceId: '',
    departureTime: '13:35', arrivalTime: '14:50', durationZh: '1 小时 15 分', durationEn: '1h 15m',
    noteZh: '午后国内航班，当前仅保留少量可选舱等，不推测后续放票。',
    noteEn: 'An afternoon domestic flight with only a few fare choices left; later inventory is not inferred.',
    color: '#286b8c', platformZh: '国内出发', platformEn: 'Domestic departures',
    fares: Object.freeze([
      Object.freeze({ id: 'flight-light', nameZh: '轻行', nameEn: 'Light', price: 74200, flexibilityZh: '不含免费托运行李', flexibilityEn: 'No checked bag included' }),
      Object.freeze({ id: 'flight-flex', nameZh: '灵活', nameEn: 'Flex', price: 109000, flexibilityZh: '含 15kg 托运行李', flexibilityEn: '15kg checked bag included' }),
    ]),
  }),
  Object.freeze({
    id: 'via-coach-seoul-sokcho-0830', mode: 'coach', availability: 'available', date: '2026-08-30',
    carrierZh: '月路客运', carrierEn: 'Moonway Coach', serviceNo: 'MW 38',
    originZh: '首尔高速客运站', originEn: 'Seoul Express Bus Terminal', originCode: 'SEO', originMapPlaceId: 'seoul-express-bus-terminal',
    destinationZh: '束草', destinationEn: 'Sokcho', destinationCode: 'SOC', destinationMapPlaceId: '',
    departureTime: '09:20', arrivalTime: '11:50', durationZh: '2 小时 30 分', durationEn: '2h 30m',
    noteZh: '前往东海岸的优等巴士班次，时间为静态班次资料，不代表实时路况。',
    noteEn: 'A premium coach to the east coast. Times are authored schedule data, not live traffic.',
    color: '#9a4f31', platformZh: '京釜线候车区', platformEn: 'Gyeongbu waiting hall',
    fares: Object.freeze([
      Object.freeze({ id: 'coach-premium', nameZh: '优等座', nameEn: 'Premium', price: 27600, flexibilityZh: '出发前可申请取消', flexibilityEn: 'Cancellation request before departure' }),
    ]),
  }),
  Object.freeze({
    id: 'via-rail-yongsan-jeonju-0831', mode: 'rail', availability: 'sold_out', date: '2026-08-31',
    carrierZh: '汉江铁路', carrierEn: 'Hangang Rail', serviceNo: 'HR 621',
    originZh: '首尔 / 龙山', originEn: 'Seoul / Yongsan', originCode: 'YOS', originMapPlaceId: 'seoul-yongsan-station',
    destinationZh: '全州', destinationEn: 'Jeonju', destinationCode: 'JEO', destinationMapPlaceId: '',
    departureTime: '17:42', arrivalTime: '19:18', durationZh: '1 小时 36 分', durationEn: '1h 36m',
    noteZh: '晚间班次当前售罄，首版不会生成候补、占座或虚构余票。',
    noteEn: 'This evening service is sold out. S1 creates no waitlist, hold, or invented inventory.',
    color: '#59646a', platformZh: '站台待定', platformEn: 'Platform pending', fares: Object.freeze([]),
  }),
  Object.freeze({
    id: 'via-flight-incheon-tokyo-0902', mode: 'flight', availability: 'source_stale', date: '2026-09-02',
    carrierZh: '曙光航空', carrierEn: 'Dawnline Air', serviceNo: 'DL 518',
    originZh: '首尔 / 仁川', originEn: 'Seoul / Incheon', originCode: 'ICN', originMapPlaceId: 'seoul-incheon-airport-t1',
    destinationZh: '东京 / 羽田', destinationEn: 'Tokyo / Haneda', destinationCode: 'HND', destinationMapPlaceId: '',
    departureTime: '10:05', arrivalTime: '12:20', durationZh: '2 小时 15 分', durationEn: '2h 15m',
    noteZh: '国际航班资料已过期，等待未来交通 owner 刷新后才允许建立意向。',
    noteEn: 'This international schedule is stale and remains closed until a future transport owner refreshes it.',
    color: '#6c6875', platformZh: '1 号航站楼', platformEn: 'Terminal 1', fares: Object.freeze([]),
  }),
  Object.freeze({
    id: 'via-ferry-incheon-jeju-0904', mode: 'ferry', availability: 'unavailable', date: '2026-09-04',
    carrierZh: '蓝港航线', carrierEn: 'Blue Harbor Lines', serviceNo: 'BH 09',
    originZh: '仁川沿岸客运码头', originEn: 'Incheon Coastal Terminal', originCode: 'INC', originMapPlaceId: '',
    destinationZh: '济州港', destinationEn: 'Jeju Port', destinationCode: 'JJP', destinationMapPlaceId: '',
    departureTime: '18:30', arrivalTime: '06:40+1', durationZh: '12 小时 10 分', durationEn: '12h 10m',
    noteZh: '当前世界包没有可核验的码头班次来源与 Map 地点引用，因此保持关闭。',
    noteEn: 'The current world pack has no verifiable terminal schedule or Map place reference, so this stays closed.',
    color: '#587b87', platformZh: '码头未接入', platformEn: 'Terminal not connected', fares: Object.freeze([]),
  }),
])

export const getIntercityService = (serviceId) => INTERCITY_SERVICES.find((service) => service.id === serviceId) || null
export const getIntercityFare = (serviceId, fareId) => getIntercityService(serviceId)?.fares.find((fare) => fare.id === fareId) || null
export const getIntercityAvailabilityMeta = (status) => INTERCITY_AVAILABILITY_META[status] || null

export const validateIntercityFixtureContract = () => {
  const serviceIds = new Set()
  const fareIds = new Set()
  return INTERCITY_SERVICES.every((service) => {
    if (!service.id || serviceIds.has(service.id) || !service.originCode || !service.destinationCode || !getIntercityAvailabilityMeta(service.availability)) return false
    serviceIds.add(service.id)
    if (['available', 'limited'].includes(service.availability) !== (service.fares.length > 0)) return false
    return service.fares.every((fare) => {
      if (!fare.id || fareIds.has(fare.id) || !Number.isFinite(fare.price) || fare.price <= 0) return false
      fareIds.add(fare.id)
      return true
    })
  })
}
