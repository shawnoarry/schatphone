import { projectUiAssetUrl } from './project-assets'

export const MAP_PLACE_MEDIA_SCHEMA_VERSION = 1
export const MAP_PLACE_MEDIA_SLOT = Object.freeze({
  HERO: 'hero',
  DETAIL_GALLERY: 'detail_gallery',
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

const MAP_PLACE_FALLBACK_ASSETS = Object.freeze({
  'real-seoul-v1': Object.freeze({
    url: projectUiAssetUrl('apps/map/seoul-street-map-v1.webp'),
    width: 4096,
    height: 3319,
    mimeType: 'image/webp',
    sha256: 'f7c06dd333f67bee6064a8a320964c7acff54bf882ba6b1d65d84b92799be794',
    altZh: '首尔街道与城市轮廓类别示意图',
    altEn: 'Category visual based on Seoul streets and city form',
  }),
  'cyber-wasteland-v1': Object.freeze({
    url: projectUiAssetUrl('apps/map/cyber-wasteland-city-v1.svg'),
    width: 1600,
    height: 1280,
    mimeType: 'image/svg+xml',
    sha256: 'f15c8837e7ad5274e2d17de1066160c483600001793bed5d666b921ebfab7fab',
    altZh: '赛博废都地图类别示意图',
    altEn: 'Category visual based on the Cyber Wasteland map',
  }),
})

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

const fallbackRuntimeAsset = (mapPackId = '') => ({
  ...(MAP_PLACE_FALLBACK_ASSETS[mapPackId] || MAP_PLACE_FALLBACK_ASSETS['real-seoul-v1']),
})

const fallbackSource = (mapPackId = '') => (
  mapPackId === 'cyber-wasteland-v1'
    ? {
        type: FALLBACK_SOURCE_TYPE,
        provider: 'schatphone',
        creator: 'SchatPhone project artwork',
        licenseId: 'project_owned',
        attributionRequired: false,
        changesZh: '作为类别示意裁切显示，不代表地点真实外观。',
        changesEn: 'Displayed as a cropped category visual; it does not represent the place appearance.',
      }
    : {
        type: FALLBACK_SOURCE_TYPE,
        provider: 'vectormap_commons',
        sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Seoul_South_Korea_street_map_SVG.svg',
        creator: 'Kirill Shrayber / VectorMap',
        licenseId: 'CC0 1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        attributionRequired: false,
        changesZh: '项目将源 SVG 栅格化为 WebP；此处仅作类别示意，不代表地点真实外观。',
        changesEn: 'The source SVG was rasterized to WebP; this is a category visual, not the place appearance.',
      }
)

const licensedPhoto = ({
  id,
  placeId,
  slot = MAP_PLACE_MEDIA_SLOT.HERO,
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
  accessedAt = '2026-08-15',
  reviewedAt = '2026-08-15',
  sourceArchiveBatch = 'map-place-media-pilot-20260815',
}) => deepFreeze({
  schemaVersion: MAP_PLACE_MEDIA_SCHEMA_VERSION,
  id,
  mapPackId: 'real-seoul-v1',
  placeId,
  slot,
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
    accessedAt,
    sourceSha256,
    changesZh: '已裁切为 16:9 并转换为 WebP，未进行生成式修改。',
    changesEn: 'Cropped to 16:9 and converted to WebP; no generative edit.',
  },
  review: {
    status: APPROVED_STATUS,
    reviewedAt,
    reviewer: 'map_place_media_audit',
    sourceArchiveBatch,
  },
})

const MAP_PLACE_MEDIA_BATCH_20260822 = [
  {
    id: 'map-media-seoul-gwanghwamun-hero-v1',
    placeId: 'seoul-gwanghwamun',
    kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
    filename: 'seoul-gwanghwamun-hero-v1.webp',
    runtimeSha256: '71738f93a8723d9cfcb2a351967891f7e1f240b9d744afc2955113ca214ae006',
    altZh: '夜色中的光化门广场与世宗大路',
    altEn: 'Gwanghwamun Square and Sejong-daero at night',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Nightview_of_the_Gwanghwamun_Square_2024.jpg',
    creator: 'Seoul Tourism Organization',
    licenseId: 'KOGL Type 1',
    licenseUrl: 'https://www.kogl.or.kr/info/licenseType1.do',
    sourceSha256: '73b77645994a42674ba37f4772b1c9902365bd58cbb7749a22c393e4b29c855a',
  },
  {
    id: 'map-media-seoul-gwanghwamun-gallery-03-v1',
    placeId: 'seoul-gwanghwamun',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-gwanghwamun-gallery-03-v1.webp',
    runtimeSha256: '7c91c264cd35bb9483417e74eff270b55b95f38b70f2b1bf5aee5b76acac9ab5',
    altZh: '光化门广场向光化门方向的开阔步行空间',
    altEn: 'Open pedestrian space at Gwanghwamun Square facing Gwanghwamun',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Gwanghwamun_Square,_Seoul_(26259210037).jpg',
    creator: 'Richard Mortel',
    licenseId: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceSha256: '1e4d8310855cd0013a367835c4e0ae286c9f1bba132624fbadc9b37b2e406559',
  },
  {
    id: 'map-media-seoul-gwanghwamun-gallery-04-v1',
    placeId: 'seoul-gwanghwamun',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-gwanghwamun-gallery-04-v1.webp',
    runtimeSha256: '2698a5a1800dfe446d4462281f85ca4426c759fe2bf90f7676db2b4bef711059',
    altZh: '光化门广场及周边政府建筑俯瞰',
    altEn: 'Elevated view of Gwanghwamun Square and nearby government buildings',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Gwanghwamun_Square_20220806_06.jpg',
    creator: 'Republic of Korea',
    licenseId: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    sourceSha256: 'e9bab2986d55a1ac63cdfab6405bde85ae0d617795b07048d0d7c4b9bbd3176a',
  },
  {
    id: 'map-media-seoul-gwanghwamun-gallery-05-v1',
    placeId: 'seoul-gwanghwamun',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-gwanghwamun-gallery-05-v1.webp',
    runtimeSha256: 'bfcd063c9b1153814778c91b5af943938d20a14210c95c9cedc92f0cce04c5ed',
    altZh: '光化门广场附近的世宗大路建筑街景',
    altEn: 'Buildings along Sejong-daero near Gwanghwamun Square',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Gwanghwamun_Square_4.jpg',
    creator: 'kallerna',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: 'dd0c8be902c20f6a946744331d643525bdbe87a15263342e098c7cbf1fd1c6a7',
  },
  {
    id: 'map-media-seoul-city-hall-hero-v1',
    placeId: 'seoul-city-hall',
    kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
    filename: 'seoul-city-hall-hero-v1.webp',
    runtimeSha256: 'bbb7ff4862516df3fed709327128bf09cf307639d197daa0f530eef14d56fe1b',
    altZh: '首尔市厅新旧建筑与首尔广场',
    altEn: 'Old and new Seoul City Hall buildings beside Seoul Plaza',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Seoul_City_Hall_from_Plaza.jpg',
    creator: 'Tristan Surtel',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: '313dabae23630143e7ef60b57e2cc955818e3199cdae3c47a7c2db79985cb08f',
  },
  {
    id: 'map-media-seoul-city-hall-gallery-01-v1',
    placeId: 'seoul-city-hall',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
    filename: 'seoul-city-hall-gallery-01-v1.webp',
    runtimeSha256: '20809695a1221484cf10a366ff1630c8b48f4db4d05304391be651f7dfbdc1ed',
    altZh: '从首尔广场远望首尔市厅新旧建筑',
    altEn: 'Seoul City Hall buildings viewed across Seoul Plaza',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Seoul_City_Hall_20190608_001.jpg',
    creator: 'Mobius6',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: '84262d14d7b8b3062c445daa6ce6ffbd6c06c067c4de8050a19f5083cbaf1b03',
  },
  {
    id: 'map-media-seoul-city-hall-gallery-04-v1',
    placeId: 'seoul-city-hall',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-city-hall-gallery-04-v1.webp',
    runtimeSha256: 'e467b17ec93c41d7a24fff8ae445d395468d64d7a1c2d0dd5b5638ab4631c13c',
    altZh: '首尔市厅入口与周边步行空间',
    altEn: 'Seoul City Hall entrance and surrounding pedestrian space',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Seoul_City_Hall_20190608_004.jpg',
    creator: 'Mobius6',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: '0f87ba115cfd2cd901bda30320a3fed75033dfaaf175f6c8e0df22131313c2fe',
  },
  {
    id: 'map-media-seoul-city-hall-gallery-05-v1',
    placeId: 'seoul-city-hall',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-city-hall-gallery-05-v1.webp',
    runtimeSha256: 'bafd7fd91e2d58f5c78e801a7089dfca38622a204cf6f2b7fe73fbd7bb3d918f',
    altZh: '首尔市厅建筑与广场绿地',
    altEn: 'Seoul City Hall buildings and landscaped plaza',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Seoul_City_Hall_20190608_005.jpg',
    creator: 'Mobius6',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: '5ff2f51507a4be8f0fbe60a4444f151bbc97f5d61adadb789629f0b07f5f5d3d',
  },
  {
    id: 'map-media-seoul-n-tower-hero-v1',
    placeId: 'seoul-n-tower',
    kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
    filename: 'seoul-n-tower-hero-v1.webp',
    runtimeSha256: '85e563439e86c10ef659c1325f007f93969ddf37cf799778cb5a831a5b7f70ba',
    altZh: '首尔夜景中的南山首尔塔',
    altEn: 'N Seoul Tower rising above the Seoul night skyline',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:N_Seoul_Tower_Panorama_Night_(cropped).jpg',
    creator: 'Johnx85dt',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: 'ab1c4a95f009622e9911fd3e1e84f27ef560c2928193e015a3380572057d26a5',
  },
  {
    id: 'map-media-seoul-n-tower-gallery-02-v1',
    placeId: 'seoul-n-tower',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-n-tower-gallery-02-v1.webp',
    runtimeSha256: '75736225055bc5cfbc964c7c43c4606acbceaa104ce30f68ca791bb980987c23',
    altZh: '南山八角亭与南山首尔塔',
    altEn: 'Namsan pavilion with N Seoul Tower behind it',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:N_Seoul_Tower_(13952097192).jpg',
    creator: 'Eugene Lim',
    licenseId: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceSha256: '1bef45f50f69ea666377d2d9b9a8638bbeae98eff47f619b2d823c2d273619c7',
  },
  {
    id: 'map-media-seoul-n-tower-gallery-03-v1',
    placeId: 'seoul-n-tower',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-n-tower-gallery-03-v1.webp',
    runtimeSha256: '973c71e31a3adb1fa1d4fdade623a2978b9bbb022e612fd950803f51dd841f31',
    altZh: '南山首尔塔与首尔夜间城市景观',
    altEn: 'N Seoul Tower within the Seoul night cityscape',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:N_Seoul_Tower_Panorama_Night.jpg',
    creator: 'Johnx85dt',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: 'df2f80e3ce8fcb5e46313bed59f36bcfaf1affdbbd349b435c27dd9a709cee55',
  },
  {
    id: 'map-media-seoul-n-tower-gallery-05-v1',
    placeId: 'seoul-n-tower',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-n-tower-gallery-05-v1.webp',
    runtimeSha256: '64fa6cc18282ee352a444fc69604ea9258293ecf7d054c80f74208a03386b008',
    altZh: '南山首尔塔建筑群内的灯光步道',
    altEn: 'Illuminated walkway within the N Seoul Tower complex',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:N_Seoul_Tower_complex_staircase.jpg',
    creator: 'Kanishk0001',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: 'd9eccc81e89c2f2ae33cf7fb35398a55086a8e6e6b087821b7e34045ccf02752',
  },
  {
    id: 'map-media-seoul-n-tower-gallery-06-v1',
    placeId: 'seoul-n-tower',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-n-tower-gallery-06-v1.webp',
    runtimeSha256: 'cef6b0c5a1026095754b6187642189714fbd6da3104e3c038a537356c512df26',
    altZh: '城市建筑之间远望南山首尔塔',
    altEn: 'Distant view of N Seoul Tower between city buildings',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:N_Seoul_Tower_from_far.jpg',
    creator: 'Devianagloria',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: '433342e8384d28bc77a2d8add1c0d5ca5870a6321c12beed72a25561f6f94ba7',
  },
  {
    id: 'map-media-seoul-n-tower-gallery-08-v1',
    placeId: 'seoul-n-tower',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-n-tower-gallery-08-v1.webp',
    runtimeSha256: 'f614f0c2b82711f4b9f4004fe40bbaef3734ef4dc5521f7188faff5af15b9aa6',
    altZh: '夕阳云层下的南山首尔塔剪影',
    altEn: 'Silhouette of N Seoul Tower beneath sunset clouds',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Namsan_Tower_sunset,_Seoul.jpg',
    creator: 'Rtflakfizer',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: '71851a9d621018c3a0dd84b9bee47f698bf67e7ef6ddeecaf8deec2b3e80e777',
  },
  {
    id: 'map-media-seoul-ddp-hero-v1',
    placeId: 'seoul-ddp',
    kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
    filename: 'seoul-ddp-hero-v1.webp',
    runtimeSha256: '64ff6d977425a2600f984e1968423b6d8136a4fbfe740d453ccf7114a6ec63a2',
    altZh: '东大门设计广场的曲面建筑与周边街景',
    altEn: 'Curved Dongdaemun Design Plaza building and nearby streets',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:20240601_144028_Dongdaemun_Design_Plaza,_Seoul_08.jpg',
    creator: 'Dwxn',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: '4676b63fca72421c1ec4c4f0d8f9fb37d7e722f43628f3c86d7fce282a0a3719',
  },
  {
    id: 'map-media-seoul-ddp-gallery-04-v1',
    placeId: 'seoul-ddp',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-ddp-gallery-04-v1.webp',
    runtimeSha256: '02db19e22a2651d910bf4fa1d54f7773ab268c384f2fc7e4aa7e26a7e14f256d',
    altZh: '夜间的东大门设计广场曲面外墙',
    altEn: 'Curved exterior of Dongdaemun Design Plaza at night',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Dongdaemun_Design_Plaza_-_DDP2369.jpg',
    creator: 'lumoplank',
    licenseId: 'CC0',
    licenseUrl: '',
    sourceSha256: '347e5fc9c9e000d6b10bb34ac9bbc4257a5534cd848005a4376dbbf1b99eed3c',
  },
  {
    id: 'map-media-seoul-ddp-gallery-05-v1',
    placeId: 'seoul-ddp',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-ddp-gallery-05-v1.webp',
    runtimeSha256: 'fea1439f071769018d430e1d439be55d370added44020c8bca1008bf5a20e9a1',
    altZh: '东大门设计广场金属外墙细部',
    altEn: 'Metal facade detail at Dongdaemun Design Plaza',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Dongdaemun_Design_Plaza_-_DDP2376.jpg',
    creator: 'lumoplank',
    licenseId: 'CC0',
    licenseUrl: '',
    sourceSha256: '9d08db827da481a625770595119f75f93e617e395276d75104564fb74a02b42c',
  },
  {
    id: 'map-media-seoul-ddp-gallery-06-v1',
    placeId: 'seoul-ddp',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-ddp-gallery-06-v1.webp',
    runtimeSha256: 'dc8a9df951a34214aeddf3a3046bd23d1c5746c654ea44534ee2caaa5913a1f8',
    altZh: '东大门设计广场与周边夜间城市景观',
    altEn: 'Dongdaemun Design Plaza within the surrounding night cityscape',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Dongdaemun_Design_Plaza_at_night,_Seoul,_Korea.jpg',
    creator: 'Eugene Lim',
    licenseId: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceSha256: '0a25359b4e7e9e94b70b7b1b5dc52b6393983429803f274504ceb112b304ce42',
  },
  {
    id: 'map-media-seoul-lotte-world-tower-hero-v1',
    placeId: 'seoul-lotte-world-tower',
    kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
    filename: 'seoul-lotte-world-tower-hero-v1.webp',
    runtimeSha256: '3b50c07894313e500b7511508d15651a7b7b78cc3a22a76c6876dfd51e54b439',
    altZh: '隔汉江远望乐天世界塔',
    altEn: 'Lotte World Tower viewed across the Han River',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Lotte_World_Tower_near_Cheongdam_Bridge.jpg',
    creator: 'Ox1997cow',
    licenseId: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    sourceSha256: 'ccd72d678ae87cdf3b20bcc0393ecf6aec39ce52c47981e32f9206b405a4c7f8',
  },
  {
    id: 'map-media-seoul-lotte-world-tower-gallery-02-v1',
    placeId: 'seoul-lotte-world-tower',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-lotte-world-tower-gallery-02-v1.webp',
    runtimeSha256: '092ed4ddf9c594722973b9c06552d2f2cdf4980aa6ce5143d983d14e60ce28f7',
    altZh: '汉江与乐天世界塔周边天际线',
    altEn: 'Han River and skyline surrounding Lotte World Tower',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Lotte_World_Tower_near_Cheongdam_Bridge_2022.jpg',
    creator: 'Ox1997cow',
    licenseId: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    sourceSha256: 'a8689cf4c8dbb27a63de714abe07a2719dc225bdc12b978e6ebb653f6f07eb58',
  },
  {
    id: 'map-media-seoul-lotte-world-tower-gallery-04-v1',
    placeId: 'seoul-lotte-world-tower',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-lotte-world-tower-gallery-04-v1.webp',
    runtimeSha256: '27ff0eea7dd9613c728f432a820b5fd6aa191910053cb78cc62a3bc904590f46',
    altZh: '乐天世界园区与乐天世界塔',
    altEn: 'Lotte World complex with Lotte World Tower',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Lotte_World_day_view_5.jpg',
    creator: 'kallerna',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: 'ed51a17a75187badbe406f30dddc0ceb60c00f5a7890543647c0339c58541e26',
  },
  {
    id: 'map-media-seoul-lotte-world-tower-gallery-05-v1',
    placeId: 'seoul-lotte-world-tower',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-lotte-world-tower-gallery-05-v1.webp',
    runtimeSha256: 'b42f9c42996c103446c5cfbb6026174d8495857225f871c8d3b35b66e8863067',
    altZh: '傍晚的乐天世界园区与乐天世界塔',
    altEn: 'Lotte World complex and Lotte World Tower at dusk',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Lotte_World_morning_view_8.jpg',
    creator: 'kallerna',
    licenseId: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceSha256: 'b7200482ea647411fad425448fdb070a74132a5c162640f3eeefe1a2906d43c8',
  },
  {
    id: 'map-media-seoul-lotte-world-tower-gallery-07-v1',
    placeId: 'seoul-lotte-world-tower',
    slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
    kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
    filename: 'seoul-lotte-world-tower-gallery-07-v1.webp',
    runtimeSha256: 'ca5bb527bcbc7f972f9c204dd44b4a3e9d6282c58d7939bcdc15ae8bc6bf9a50',
    altZh: '夜色中的乐天世界塔与周边住宅天际线',
    altEn: 'Lotte World Tower and nearby residential skyline at night',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Seoul_Skyline_Night_2018.jpg',
    creator: 'mauveine.kim',
    licenseId: 'CC0',
    licenseUrl: '',
    sourceSha256: 'c27dee469fa935754a60014b0756fdf87e870a7ed748d7eefe40b0cb5cbe48c3',
  },
  {
    id: 'map-media-seoul-incheon-airport-t1-hero-v1',
    placeId: 'seoul-incheon-airport-t1',
    kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
    filename: 'seoul-incheon-airport-t1-hero-v1.webp',
    runtimeSha256: 'd4b89cd7394f2620fa120bcb0d7150661a08a128dcfb666c23342ce875704c4f',
    altZh: '仁川国际机场一号航站楼出发大厅',
    altEn: 'Departure hall inside Incheon International Airport Terminal 1',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Incheon_International_Airport_Terminal_1_Departure.jpg',
    creator: 'Arne Mueseler',
    licenseId: 'CC BY-SA 3.0 de',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/de/deed.en',
    sourceSha256: 'ef234da15f3f7f87c557496cfa8d03696593eefcee762ff6a24c1c9d33444937',
  },
].map((record) => licensedPhoto({
  ...record,
  accessedAt: '2026-08-22',
  reviewedAt: '2026-08-22',
  sourceArchiveBatch: 'map-place-media-search-20260821',
}))

export const MAP_PLACE_MEDIA_RECORDS = deepFreeze([
  ...MAP_PLACE_MEDIA_BATCH_20260822,
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
    asset: fallbackRuntimeAsset('cyber-wasteland-v1'),
    source: fallbackSource('cyber-wasteland-v1'),
    review: {
      status: FALLBACK_STATUS,
      reviewedAt: '2026-08-15',
      reviewer: 'map_place_media_audit',
    },
  }),
])

const mediaByPlaceKey = new Map(
  MAP_PLACE_MEDIA_RECORDS
    .filter((record) => record.slot === MAP_PLACE_MEDIA_SLOT.HERO)
    .map((record) => [`${record.mapPackId}:${record.placeId}`, record]),
)

const mediaGalleryByPlaceKey = new Map()
for (const record of MAP_PLACE_MEDIA_RECORDS) {
  if (![MAP_PLACE_MEDIA_SLOT.HERO, MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY].includes(record.slot)) {
    continue
  }
  const key = `${record.mapPackId}:${record.placeId}`
  const gallery = mediaGalleryByPlaceKey.get(key) || []
  gallery.push(record)
  mediaGalleryByPlaceKey.set(key, gallery)
}

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
  if (!Object.values(MAP_PLACE_MEDIA_SLOT).includes(record.slot)) errors.push('slot')
  if (!Object.values(MAP_PLACE_MEDIA_KIND).includes(record.kind)) errors.push('kind')
  if (MEDIA_KIND_TO_GRADE[record.kind] !== record.authenticityGrade) errors.push('authenticity_grade')
  if (!record.labelZh || !record.labelEn || !record.noteZh || !record.noteEn) errors.push('presentation_copy')

  if (record.kind === MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK) {
    if (record.slot !== MAP_PLACE_MEDIA_SLOT.HERO) errors.push('fallback_slot')
    if (!record.asset || !isHttpsUrl(record.asset.url)) errors.push('fallback_asset_url')
    if (!Number.isFinite(record.asset?.width) || record.asset.width <= 0) errors.push('fallback_width')
    if (!Number.isFinite(record.asset?.height) || record.asset.height <= 0) errors.push('fallback_height')
    if (!String(record.asset?.mimeType || '').startsWith('image/')) errors.push('fallback_mime')
    if (!SHA256_PATTERN.test(record.asset?.sha256 || '')) errors.push('fallback_sha256')
    if (!record.asset?.altZh || !record.asset?.altEn) errors.push('fallback_alt_text')
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

export const getMapPlaceMediaGallery = (mapPackId, placeId) => {
  const records = mediaGalleryByPlaceKey.get(
    `${String(mapPackId || '').trim()}:${String(placeId || '').trim()}`,
  ) || []
  return records.filter((record) => validateMapPlaceMediaRecord(record).valid)
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
    asset: fallbackRuntimeAsset(mapPackId),
    source: fallbackSource(mapPackId),
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

export const resolveMapPlaceMediaGallery = (place, fallbackMapPackId = '') => {
  const placeId = String(place?.placeId || place?.id || '').trim()
  const mapPackId = String(place?.mapPackId || fallbackMapPackId || '').trim()
  const gallery = getMapPlaceMediaGallery(mapPackId, placeId)
  return gallery.length > 0 ? gallery : [createMapPlaceMediaFallback(place, fallbackMapPackId)]
}
