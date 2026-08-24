export const PARCEL_STORAGE_KEY = 'schatphone:parcel-shell:preview-state'
export const PARCEL_STORAGE_VERSION = 1
export const PARCEL_SHIPMENTS = Object.freeze([
  Object.freeze({ id: 'posta-shipment-olive-0824', code: 'PS-260824-0182', titleZh: '日常护理补充装', titleEn: 'Daily care refill', senderZh: 'OLIVE YOUNG', senderEn: 'OLIVE YOUNG', status: 'in_transit', statusZh: '运输中', statusEn: 'In transit', etaZh: '预计 8 月 25 日', etaEn: 'Expected Aug 25', lastZh: '城东分拨中心已出库', lastEn: 'Departed Seongdong hub', mapPlaceId: '' }),
  Object.freeze({ id: 'posta-shipment-studio-0823', code: 'PS-260823-0047', titleZh: '录音棚线材包', titleEn: 'Studio cable kit', senderZh: 'WORKSOUT', senderEn: 'WORKSOUT', status: 'pickup_ready', statusZh: '可取件', statusEn: 'Ready for pickup', etaZh: '保留至 8 月 27 日', etaEn: 'Held until Aug 27', lastZh: '已到达圣水自提柜', lastEn: 'At Seongsu pickup locker', mapPlaceId: 'seoul-seongsu' }),
  Object.freeze({ id: 'posta-shipment-archive-0819', code: 'PS-260819-0091', titleZh: '合同材料副本', titleEn: 'Contract document copies', senderZh: '工作台', senderEn: 'Work Hub', status: 'delivered', statusZh: '已送达', statusEn: 'Delivered', etaZh: '8 月 21 日送达', etaEn: 'Delivered Aug 21', lastZh: '由门卫室签收', lastEn: 'Received by front desk', mapPlaceId: '' }),
  Object.freeze({ id: 'posta-shipment-stale-0820', code: 'PS-260820-7710', titleZh: '海外样品包', titleEn: 'Overseas sample pack', senderZh: '外部寄件方', senderEn: 'External sender', status: 'source_stale', statusZh: '来源已过期', statusEn: 'Source stale', etaZh: '暂无可用预计', etaEn: 'No valid estimate', lastZh: '旧物流信息不可继续使用', lastEn: 'Old tracking data cannot be used', mapPlaceId: '' }),
])
export const getParcelShipment = (id) => PARCEL_SHIPMENTS.find((item) => item.id === id) || null
