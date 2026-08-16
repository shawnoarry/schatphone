import { projectUiAssetUrl } from './project-assets'

export const MAP_PLACE_MEDIA_SCHEMA_VERSION = 1
export const MAP_PLACE_MEDIA_SLOT = Object.freeze({
  HERO: 'hero',
})
export const MAP_PLACE_MEDIA_KIND = Object.freeze({
  EXACT_PHOTO: 'exact_photo',
  AREA_ATMOSPHERE: 'area_atmosphere',
  GENERATED_RECONSTRUCTION: 'generated_reconstruction',
  CATEGORY_FALLBACK: 'category_fallback',
})
export const MAP_PLACE_MEDIA_AUTHENTICITY_GRADE = Object.freeze({
  EXACT_PLACE: 'A',
  AREA_ONLY: 'B',
  RECONSTRUCTED: 'C',
  GENERIC: 'D',
})

const PHOTO_SOURCE_TYPE = 'licensed_external_photo'
const GENERATED_SOURCE_TYPE = 'generated_asset'
const FALLBACK_SOURCE_TYPE = 'project_rendered'
const APPROVED_STATUS = 'approved'
const FALLBACK_STATUS = 'system_fallback'
const SHA256_PATTERN = /^[a-f0-9]{64}$/

const MEDIA_KIND_TO_GRADE = Object.freeze({
  [MAP_PLACE_MEDIA_KIND.EXACT_PHOTO]: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
  [MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE]: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.AREA_ONLY,
  [MAP_PLACE_MEDIA_KIND.GENERATED_RECONSTRUCTION]: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.RECONSTRUCTED,
  [MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK]: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.GENERIC,
})

const MEDIA_PRESENTATION_COPY = Object.freeze({
  [MAP_PLACE_MEDIA_KIND.EXACT_PHOTO]: Object.freeze({
    labelZh: '地点实景',
    labelEn: 'Exact-place photo',
    noteZh: '照片直接展示这一地点。',
    noteEn: 'This photograph directly shows the place.',
  }),
  [MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE]: Object.freeze({
    labelZh: '周边实景',
    labelEn: 'Area view',
    noteZh: '展示所在街区或周边环境，不代表具体门面。',
    noteEn: 'Shows the surrounding district, not the exact facade.',
  }),
  [MAP_PLACE_MEDIA_KIND.GENERATED_RECONSTRUCTION]: Object.freeze({
    labelZh: '生成重建',
    labelEn: 'Generated reconstruction',
    noteZh: '根据已知信息生成，不是现场照片。',
    noteEn: 'Generated from reviewed context; this is not an onsite photograph.',
  }),
  [MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK]: Object.freeze({
    labelZh: '类别示意',
    labelEn: 'Category visual',
    noteZh: '仅表示地点类型，不代表真实外观。',
    noteEn: 'Represents the place category, not its real appearance.',
  }),
})

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const runtimeAsset = (filename, sha256) => ({
  url: projectUiAssetUrl(`apps/map/places/real-seoul-v1/${filename}`),
  width: 1600,
  height: 900,
  mimeType: 'image/webp',
  sha256,
})

const licensedPhoto = ({
  id,
  placeId,
  kind,
  filename,
  runtimeSha256,
  altZh,
  altEn,
  sourcePageUrl,
  creator,
  licenseId,
  licenseUrl,
  sourceSha256,
}) => deepFreeze({
  schemaVersion: MAP_PLACE_MEDIA_SCHEMA_VERSION,
  id,
  mapPackId: 'real-seoul-v1',
  placeId,
  slot: MAP_PLACE_MEDIA_SLOT.HERO,
  kind,
  authenticityGrade: MEDIA_KIND_TO_GRADE[kind],
  ...MEDIA_PRESENTATION_COPY[kind],
  asset: {
    ...runtimeAsset(filename, runtimeSha256),
    altZh,
    altEn,
  },
  source: {
    type: PHOTO_SOURCE_TYPE,
    provider: 'wikimedia_commons',
    sourcePageUrl,
    creator,
    licenseId,
    licenseUrl,
    attributionRequired: licenseId !== 'CC0',
    accessedAt: '2026-08-15',
    sourceSha256,
    changesZh: '已裁切为 16:9 并转换为 WebP，未进行生成式修改。',
    changesEn: 'Cropped to 16:9 and converted to WebP; no generative edit.',
  },
  review: {
    status: APPROVED_STATUS,
    reviewedAt: '2026-08-15',
    reviewer: 'map_place_media_audit',
    sourceArchiveBatch: 'map-place-media-pilot-20260815',
  },
})

export const MAP_PLACE_MEDIA_RECORDS = deepFreeze([
  licensedPhoto({
    id: 'map-media-seoul-gyeongbokgung-hero-v1',
    placeId: 'seoul-gyeongbokgung',
    kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
    filename: 'seoul-gyeongbokgung-hero-v1.webp',
    runtimeSha256: 'c089f20156a36a07d19b97e93e6b3ae1d7de94de09e41aeb9d1c476f17abf645',
    altZh: '景福宫勤政殿与广场',
    altEn: 'Geunjeongjeon Hall and courtyard at Gyeongbokgung Palace',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Front_view_of_the_Imperial_Throne_Hall_Geunjeongjeon_at_Gyeongbokgung_Palace_with_blue_sky_in_Seoul.jpg',
    creator: 'Basile Morin',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: 'e84a943cd3ca6a1f856beb116fd3f219efae1fb8d24268cfb150f07640daa623',
  }),
  licensedPhoto({
    id: 'map-media-seoul-station-hero-v1',
    placeId: 'seoul-station',
    kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
    filename: 'seoul-station-hero-v1.webp',
    runtimeSha256: '7ef6563c309e4f6fbacd9de713f58432a680ef1f5923be2eeca08edec849bb91',
    altZh: '首尔站现代站房入口',
    altEn: 'Entrance to the modern Seoul Station building',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:The_entrance_of_Seoul_Station_on_April_17th_2016.jpg',
    creator: '대경찰청',
    licenseId: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceSha256: '1ce3a3fc350c45ff7d83839871c09bee715feda93242843f0a8605faf47184b2',
  }),
  licensedPhoto({
    id: 'map-media-seoul-forest-hero-v1',
    placeId: 'seoul-forest',
    kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
    filename: 'seoul-forest-hero-v1.webp',
    runtimeSha256: '370551dbab81d2b6f9c0566ba5b5f9be2cbfe7face99dcc54affa94946a18621',
    altZh: '首尔林的林荫步道',
    altEn: 'Tree-lined walking path in Seoul Forest',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Seoul_Forest_Walk_Path.jpg',
    creator: 'Qhairy',
    licenseId: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceSha256: '88a2b32dc21d0761ebe205c334df29869172abc5a376d5e29cbcf342dbaa4fad',
  }),
  licensedPhoto({
    id: 'map-media-seoul-sm-hq-hero-v1',
    placeId: 'seoul-sm-hq',
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-sm-hq-hero-v1.webp',
    runtimeSha256: 'dc86566f95d5c4a5e283b70cc6b82149c0fdd3af48cc7320cdb51ef4fd076a8a',
    altZh: 'SM 总部所在的圣水洞街区店面',
    altEn: 'Storefronts in Seongsu-dong, the district around SM Entertainment headquarters',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Seongsu-dong_storefronts.jpg',
    creator: 'Jyrki Salmi',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: 'b5ea2b6b8b87b5b5ded33a024f27dc8401c3db6f5e21c7d43a95960442e2f143',
  }),
  licensedPhoto({
    id: 'map-media-seoul-starfield-coex-mall-hero-v1',
    placeId: 'seoul-starfield-coex-mall',
    kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
    filename: 'seoul-starfield-coex-mall-hero-v1.webp',
    runtimeSha256: '673325d09cb404e041b6a7db5e6789e71f3680842fb15ed23d4340f9f2b9ae53',
    altZh: 'Starfield COEX Mall 内的别马当图书馆',
    altEn: 'Starfield Library inside Starfield COEX Mall',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Starfield_Library_COEX_20240218.jpg',
    creator: 'Sean Young (@assanges)',
    licenseId: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceSha256: 'c45d900b22622dee9ae66f33bffed1ed3c2d185e445461d79bbddff14c45a13d',
  }),
  licensedPhoto({
    id: 'map-media-seoul-myeongdong-kyoja-main-hero-v1',
    placeId: 'seoul-myeongdong-kyoja-main',
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-myeongdong-kyoja-main-hero-v1.webp',
    runtimeSha256: '06e64de8feb76cea09f50d7085de2140c042fddf2cba91e854ef8ed21bcd2578',
    altZh: '明洞饺子总店所在的明洞街区',
    altEn: 'Myeongdong streets around Myeongdong Kyoja Main Store',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Myeongdong_street.jpg',
    creator: 'Izzatfikry99',
    licenseId: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceSha256: 'a93b89147456a4ab1dc3da5cf9933205cc11f686f09c67858cd75ac7235505dc',
  }),
  licensedPhoto({
    id: 'map-media-seoul-sillim-one-room-district-hero-v1',
    placeId: 'seoul-sillim-one-room-district',
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-sillim-one-room-district-hero-v1.webp',
    runtimeSha256: '8f5277daf41a6a1f5164d3df16835bfe850b3d3f52c80577806cd3bae9d726c7',
    altZh: '新林洞住宅街区的夜间道路',
    altEn: 'Night street in the Sillim-dong residential area',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:%ED%98%B8%EC%95%94%EB%A1%9C(%EC%84%9C%EC%9A%B8).jpg',
    creator: 'Kth696586',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: '318cced954ae2f2cc02bf4741ce61dc0d8ac9d5a69860b4532341dd04f9e7941',
  }),
  deepFreeze({
    schemaVersion: MAP_PLACE_MEDIA_SCHEMA_VERSION,
    id: 'map-media-waste-helix-spire-category-v1',
    mapPackId: 'cyber-wasteland-v1',
    placeId: 'waste-helix-spire',
    slot: MAP_PLACE_MEDIA_SLOT.HERO,
    kind: MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK,
    authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.GENERIC,
    ...MEDIA_PRESENTATION_COPY[MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK],
    asset: null,
    source: {
      type: FALLBACK_SOURCE_TYPE,
      provider: 'schatphone',
      licenseId: 'not_applicable',
      attributionRequired: false,
    },
    review: {
      status: FALLBACK_STATUS,
      reviewedAt: '2026-08-15',
      reviewer: 'map_place_media_audit',
    },
  }),
])

const mediaByPlaceKey = new Map(
  MAP_PLACE_MEDIA_RECORDS.map((record) => [`${record.mapPackId}:${record.placeId}`, record]),
)

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export const validateMapPlaceMediaRecord = (record) => {
  const errors = []
  if (!record || typeof record !== 'object') return { valid: false, errors: ['record_required'] }
  if (record.schemaVersion !== MAP_PLACE_MEDIA_SCHEMA_VERSION) errors.push('schema_version')
  if (!record.id || !record.mapPackId || !record.placeId) errors.push('identity')
  if (record.slot !== MAP_PLACE_MEDIA_SLOT.HERO) errors.push('slot')
  if (!Object.values(MAP_PLACE_MEDIA_KIND).includes(record.kind)) errors.push('kind')
  if (MEDIA_KIND_TO_GRADE[record.kind] !== record.authenticityGrade) errors.push('authenticity_grade')
  if (!record.labelZh || !record.labelEn || !record.noteZh || !record.noteEn) errors.push('presentation_copy')

  if (record.kind === MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK) {
    if (record.asset != null) errors.push('fallback_asset')
    if (record.source?.type !== FALLBACK_SOURCE_TYPE) errors.push('fallback_source')
    if (record.review?.status !== FALLBACK_STATUS) errors.push('fallback_review')
    return { valid: errors.length === 0, errors }
  }

  if (!record.asset || !isHttpsUrl(record.asset.url)) errors.push('runtime_asset_url')
  if (record.asset?.width !== 1600 || record.asset?.height !== 900) errors.push('runtime_dimensions')
  if (record.asset?.mimeType !== 'image/webp') errors.push('runtime_mime')
  if (!SHA256_PATTERN.test(record.asset?.sha256 || '')) errors.push('runtime_sha256')
  if (!record.asset?.altZh || !record.asset?.altEn) errors.push('alt_text')
  if (record.review?.status !== APPROVED_STATUS || !record.review?.reviewedAt) errors.push('review')

  if (record.kind === MAP_PLACE_MEDIA_KIND.GENERATED_RECONSTRUCTION) {
    if (record.source?.type !== GENERATED_SOURCE_TYPE) errors.push('generated_source')
    if (!record.source?.provider || !record.source?.model || !record.source?.promptRecordPath) {
      errors.push('generated_provenance')
    }
  } else {
    if (record.source?.type !== PHOTO_SOURCE_TYPE) errors.push('photo_source')
    if (record.source?.provider !== 'wikimedia_commons') errors.push('photo_provider')
    if (!isHttpsUrl(record.source?.sourcePageUrl)) errors.push('source_page_url')
    if (!record.source?.creator || !record.source?.licenseId) errors.push('attribution')
    if (record.source?.licenseId !== 'CC0' && !isHttpsUrl(record.source?.licenseUrl)) {
      errors.push('license_url')
    }
    if (!SHA256_PATTERN.test(record.source?.sourceSha256 || '')) errors.push('source_sha256')
    if (!record.source?.accessedAt || !record.source?.changesEn) errors.push('source_audit')
  }

  return { valid: errors.length === 0, errors }
}

export const getMapPlaceMediaRecord = (mapPackId, placeId) => {
  const record = mediaByPlaceKey.get(
    `${String(mapPackId || '').trim()}:${String(placeId || '').trim()}`,
  )
  return record && validateMapPlaceMediaRecord(record).valid ? record : null
}

export const createMapPlaceMediaFallback = (place, fallbackMapPackId = '') => {
  const placeId = String(place?.placeId || place?.id || '').trim()
  const mapPackId = String(place?.mapPackId || fallbackMapPackId || '').trim()
  return deepFreeze({
    schemaVersion: MAP_PLACE_MEDIA_SCHEMA_VERSION,
    id: `map-media-${mapPackId || 'unknown'}-${placeId || 'unknown'}-category-fallback`,
    mapPackId,
    placeId,
    slot: MAP_PLACE_MEDIA_SLOT.HERO,
    kind: MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK,
    authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.GENERIC,
    ...MEDIA_PRESENTATION_COPY[MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK],
    asset: null,
    source: {
      type: FALLBACK_SOURCE_TYPE,
      provider: 'schatphone',
      licenseId: 'not_applicable',
      attributionRequired: false,
    },
    review: {
      status: FALLBACK_STATUS,
    },
  })
}

export const resolveMapPlaceMedia = (place, fallbackMapPackId = '') => {
  const placeId = String(place?.placeId || place?.id || '').trim()
  const mapPackId = String(place?.mapPackId || fallbackMapPackId || '').trim()
  return getMapPlaceMediaRecord(mapPackId, placeId)
    || createMapPlaceMediaFallback(place, fallbackMapPackId)
}
