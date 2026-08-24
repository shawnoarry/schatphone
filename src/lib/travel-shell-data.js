export const TRAVEL_SHELL_STORAGE_KEY = 'schatphone:travel-shell:preview-state'
export const TRAVEL_SHELL_STORAGE_VERSION = 1

export const TRAVEL_BRAND = Object.freeze({
  nameZh: '漫泊',
  nameEn: 'ROAM',
  taglineZh: '先把想去的地方，安放进行程前。',
  taglineEn: 'A quiet place for the trip before the trip.',
})

export const TRAVEL_FILTERS = Object.freeze([
  Object.freeze({ id: 'all', labelZh: '全部', labelEn: 'All stays' }),
  Object.freeze({ id: 'city', labelZh: '城市周末', labelEn: 'City breaks' }),
  Object.freeze({ id: 'coast', labelZh: '海岸', labelEn: 'Coast' }),
  Object.freeze({ id: 'nature', labelZh: '山野', labelEn: 'Nature' }),
  Object.freeze({ id: 'culture', labelZh: '文化街区', labelEn: 'Culture' }),
])

export const TRAVEL_AVAILABILITY_META = Object.freeze({
  available: Object.freeze({ labelZh: '可建立意向', labelEn: 'Draft available', tone: 'available' }),
  limited: Object.freeze({ labelZh: '房型较少', labelEn: 'Limited rooms', tone: 'limited' }),
  unavailable: Object.freeze({ labelZh: '当前不可用', labelEn: 'Unavailable', tone: 'closed' }),
  source_stale: Object.freeze({ labelZh: '来源已过期', labelEn: 'Source stale', tone: 'stale' }),
})

export const TRAVEL_STAYS = Object.freeze([
  Object.freeze({
    id: 'roam-stay-seongsu-riverside', destinationId: 'seoul', category: 'city', availability: 'available',
    nameZh: '汉江拾光酒店', nameEn: 'Riverlight Hotel', cityZh: '首尔', cityEn: 'Seoul', districtZh: '圣水', districtEn: 'Seongsu',
    pricePerNight: 168000, rating: 4.7, reviewCount: 428, mapPlaceId: 'seoul-seongsu-riverside-hotel',
    summaryZh: '靠近圣水洞和汉江步道的小型设计酒店，适合结束工作后留一个安静周末。',
    summaryEn: 'A small design hotel near Seongsu and the Han River trail, made for a quiet weekend after work.',
    featuresZh: ['汉江步道 8 分钟', '深夜自助入住', '延迟退房可申请'], featuresEn: ['8 min to the river trail', 'Late self check-in', 'Late checkout request'],
    color: '#0e5f66', stamp: 'SEOUL',
    rooms: Object.freeze([
      Object.freeze({ id: 'riverlight-studio', nameZh: '河岸开放房', nameEn: 'River Studio', price: 168000, cancellationZh: '入住前 2 日可取消', cancellationEn: 'Cancel up to 2 days before arrival' }),
      Object.freeze({ id: 'riverlight-corner', nameZh: '转角景观房', nameEn: 'Corner View', price: 214000, cancellationZh: '入住前 5 日可取消', cancellationEn: 'Cancel up to 5 days before arrival' }),
    ]),
  }),
  Object.freeze({
    id: 'roam-stay-busan-wavehouse', destinationId: 'busan', category: 'coast', availability: 'limited',
    nameZh: '青浪屋', nameEn: 'Blue Current House', cityZh: '釜山', cityEn: 'Busan', districtZh: '影岛', districtEn: 'Yeongdo',
    pricePerNight: 132000, rating: 4.8, reviewCount: 196, mapPlaceId: 'busan-yeongdo-blue-current',
    summaryZh: '由旧仓库改造的海边小住处，只有八间房，窗外是港口和早班船。',
    summaryEn: 'An eight-room harbor stay rebuilt from an old warehouse, with early ferries beyond the windows.',
    featuresZh: ['港口景观', '含简单早餐', '行李寄存'], featuresEn: ['Harbor view', 'Simple breakfast', 'Luggage storage'],
    color: '#197e9d', stamp: 'BUSAN',
    rooms: Object.freeze([
      Object.freeze({ id: 'wavehouse-harbor', nameZh: '港口大床房', nameEn: 'Harbor Queen', price: 132000, cancellationZh: '不可免费取消', cancellationEn: 'Non-refundable' }),
    ]),
  }),
  Object.freeze({
    id: 'roam-stay-gapyeong-forest-cabin', destinationId: 'gapyeong', category: 'nature', availability: 'available',
    nameZh: '林间微光屋', nameEn: 'Morrow Pine Cabin', cityZh: '加平', cityEn: 'Gapyeong', districtZh: '北汉江', districtEn: 'Bukhangang',
    pricePerNight: 189000, rating: 4.6, reviewCount: 87, mapPlaceId: 'gapyeong-morrow-pine-cabin',
    summaryZh: '靠近林道的独立小屋，保留一方书桌和面向树林的深浴池。',
    summaryEn: 'A private cabin by a forest trail, with a writing desk and deep bath facing the pines.',
    featuresZh: ['独立小屋', '深浴池', '近郊徒步'], featuresEn: ['Private cabin', 'Deep bath', 'Nearby hiking'],
    color: '#416a4c', stamp: 'FOREST',
    rooms: Object.freeze([
      Object.freeze({ id: 'morrow-pine-whole', nameZh: '整栋小屋', nameEn: 'Whole Cabin', price: 189000, cancellationZh: '入住前 7 日可取消', cancellationEn: 'Cancel up to 7 days before arrival' }),
    ]),
  }),
  Object.freeze({
    id: 'roam-stay-jeonju-paper-moon', destinationId: 'jeonju', category: 'culture', availability: 'unavailable',
    nameZh: '纸月韩屋', nameEn: 'Paper Moon Hanok', cityZh: '全州', cityEn: 'Jeonju', districtZh: '韩屋村', districtEn: 'Hanok Village',
    pricePerNight: 154000, rating: 4.9, reviewCount: 312, mapPlaceId: 'jeonju-paper-moon-hanok',
    summaryZh: '带小庭院的韩屋住宿，本期房量已用完，首版不猜测退房或候补。',
    summaryEn: 'A courtyard hanok stay. This release is unavailable; S1 does not invent cancellations or waitlists.',
    featuresZh: ['独立庭院', '韩屋早餐', '文化街区'], featuresEn: ['Private courtyard', 'Hanok breakfast', 'Culture district'],
    color: '#a85f43', stamp: 'JEONJU', rooms: Object.freeze([]),
  }),
  Object.freeze({
    id: 'roam-stay-sokcho-cloudline', destinationId: 'sokcho', category: 'coast', availability: 'source_stale',
    nameZh: '云线旅店', nameEn: 'Cloudline Lodge', cityZh: '束草', cityEn: 'Sokcho', districtZh: '青草湖', districtEn: 'Cheongcho Lake',
    pricePerNight: 118000, rating: 4.4, reviewCount: 141, mapPlaceId: 'sokcho-cloudline-lodge',
    summaryZh: '湖与海之间的旅店。房型来源已过期，需等待后续 owner 刷新。',
    summaryEn: 'A lodge between lake and sea. Its room source is stale and awaits a future owner refresh.',
    featuresZh: ['青草湖步道', '长途客车站接近'], featuresEn: ['Lake promenade', 'Near intercity terminal'],
    color: '#71808a', stamp: 'STALE', rooms: Object.freeze([]),
  }),
])

export const getTravelStay = (stayId) => TRAVEL_STAYS.find((stay) => stay.id === stayId) || null
export const getTravelRoom = (stayId, roomId) => getTravelStay(stayId)?.rooms.find((room) => room.id === roomId) || null
export const getTravelAvailabilityMeta = (status) => TRAVEL_AVAILABILITY_META[status] || null

export const validateTravelFixtureContract = () => {
  const stayIds = new Set()
  const roomIds = new Set()
  return TRAVEL_STAYS.every((stay) => {
    if (!stay.id || stayIds.has(stay.id) || !stay.mapPlaceId || !getTravelAvailabilityMeta(stay.availability)) return false
    stayIds.add(stay.id)
    return stay.rooms.every((room) => {
      if (!room.id || roomIds.has(room.id) || !Number.isFinite(room.price)) return false
      roomIds.add(room.id)
      return true
    })
  })
}
