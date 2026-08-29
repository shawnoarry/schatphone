import { describe, expect, test } from 'vitest'
import projectAssetRegistry from '../config/project-assets.json'
import {
  MAP_PLACE_MEDIA_AUTHENTICITY_GRADE,
  MAP_PLACE_MEDIA_KIND,
  MAP_PLACE_MEDIA_RECORDS,
  MAP_PLACE_MEDIA_SLOT,
  getMapPlaceMediaGallery,
  getMapPlaceMediaRecord,
  resolveMapPlaceMediaGallery,
  resolveMapPlaceMedia,
  validateMapPlaceMediaRecord,
} from '../src/lib/map-place-media'
import { getMapPackById } from '../src/lib/map-packs'

const REAL_PILOT_PLACE_IDS = [
  'seoul-gyeongbokgung',
  'seoul-station',
  'seoul-forest',
  'seoul-sm-hq',
  'seoul-starfield-coex-mall',
  'seoul-myeongdong-kyoja-main',
  'seoul-sillim-one-room-district',
]

const EXPANDED_PLACE_IDS = [
  'seoul-gimpo-airport',
  'seoul-gangnam-station',
  'seoul-express-bus-terminal',
  'seoul-yongsan-station',
  'seoul-63-square',
  'seoul-national-museum',
  'seoul-times-square',
  'seoul-lotte-department-main',
  'seoul-hyundai-apgujeong-main',
  'seoul-olympic-park',
]

const APPROVED_HERO_BATCH_IDS = [
  'seoul-national-assembly',
  'seoul-coex',
  'seoul-lotte-world',
  'seoul-the-hyundai-seoul',
  'seoul-national-university',
  'seoul-yonsei-university',
  'seoul-korea-university',
  'seoul-jamsil-sports-complex',
  'seoul-mokdong-sports-complex',
  'seoul-jangchung-arena',
]

const APPROVED_HERO_BATCH_02_IDS = [
  'seoul-cheongnyangni-station',
  'seoul-bank-of-korea-main',
  'seoul-national-museum',
  'seoul-express-bus-terminal',
  'seoul-national-university-hospital',
  'seoul-severance-hospital',
  'seoul-kbs-hq',
  'seoul-shilla-hotel',
  'seoul-woori-bank-headquarters',
  'seoul-national-police-agency',
]

const APPROVED_HERO_BATCH_03_IDS = [
  'seoul-metropolitan-police-agency',
  'seoul-fire-disaster-headquarters',
  'seoul-gocheok-dome',
  'seoul-shinhan-bank-headquarters',
  'seoul-ytn-newsquare',
  'seoul-yeouido-hangang-park',
  'seoul-times-square',
  'seoul-four-seasons-hotel',
]

const APPROVED_HERO_BATCH_04_IDS = [
  'seoul-asan-medical-center',
  'seoul-kspo-dome',
  'seoul-sbs-hq',
  'seoul-amorepacific-hq',
  'seoul-gangnam-fire-station',
]

const APPROVED_HERO_BATCH_06_IDS = [
  'seoul-samsung-town',
  'seoul-jtbc-hq',
  'seoul-sk-seorin',
  'seoul-shinsegae-gangnam',
  'seoul-gangnam-station',
  'seoul-megabox-coex',
]

const APPROVED_HERO_BATCH_06_SELECTED_IDS = [
  'seoul-mbc-hq',
  'seoul-cgv-yongsan-ipark',
  'seoul-galleria-luxury-hall',
  'seoul-hybe-hq',
]

const APPROVED_HERO_BATCH_07_IDS = [
  'seoul-jyp-hq',
  'seoul-yg-hq',
  'seoul-cj-enm-center',
  'seoul-samsung-medical-center',
  'seoul-signiel',
  'seoul-kb-kookmin-headquarters',
  'seoul-lotte-cinema-world-tower',
  'seoul-lotte-department-main',
]

const APPROVED_HERO_BATCH_08_IDS = [
  'seoul-starship-hq',
  'seoul-hyundai-apgujeong-main',
  'seoul-lotte-mart-seoul-station',
  'seoul-id-hospital',
]

const APPROVED_HERO_BATCH_09_IDS = [
  'seoul-cube-hq',
  'seoul-fnc-hq',
  'seoul-lotte-avenuel-world-tower',
  'seoul-homeplus-world-cup',
  'seoul-cgv-wangsimni',
  'seoul-jennyhouse-cheongdam-hill',
  'seoul-a-by-bom-cheongdam',
  'seoul-cakeshop',
  'seoul-raemian-one-bailey',
  'seoul-ph129-cheongdam',
]

const APPROVED_HERO_BATCH_10_IDS = [
  'seoul-soonsoo-cheongdam',
  'seoul-seven-eleven-myeongdong',
  'seoul-club-nb2',
  'seoul-club-aura',
  'seoul-jk-plastic-surgery',
  'seoul-lh-gangnam-complex-3',
  'seoul-mokdong-apartment-district',
  'seoul-jongno-five-pharmacy-street',
  'seoul-gangnam-station-pharmacy-district',
  'seoul-knotted-cheongdam',
  'seoul-kyochon-chicken-yeoksam-1',
  'seoul-eggdrop-gangnam-woosung',
]

const APPROVED_HERO_BATCH_11_IDS = [
  'seoul-myeongdong-kyoja-main',
  'seoul-namdaemun-pharmacy-district',
  'seoul-london-bagel-museum-anguk',
  'seoul-hongdae',
  'seoul-sanggye-jugong-district',
  'seoul-acro-river-park',
  'seoul-hannam-the-hill',
  'seoul-club-ff',
]

const HERO_COMPLETION_EXACT_IDS = [
  'seoul-sm-hq',
  'seoul-sillim-one-room-district',
  'seoul-emart-wangsimni',
  'seoul-the-plus-plastic-surgery',
]

const HERO_COMPLETION_BRAND_REPRESENTATIVE_IDS = [
  'seoul-cu-bgf-hq',
  'seoul-gs25-gangnam-central',
]

const AREA_DETAIL_ONLY_PLACE_IDS = []

const INTEGRATED_GALLERY_COUNTS = {
  'seoul-gwanghwamun': 4,
  'seoul-city-hall': 4,
  'seoul-n-tower': 6,
  'seoul-ddp': 4,
  'seoul-lotte-world-tower': 5,
  'seoul-incheon-airport-t1': 1,
  'seoul-gimpo-airport': 2,
  'seoul-gangnam-station': 5,
  'seoul-express-bus-terminal': 4,
  'seoul-yongsan-station': 2,
  'seoul-63-square': 2,
  'seoul-national-museum': 5,
  'seoul-olympic-park': 2,
  ...Object.fromEntries(APPROVED_HERO_BATCH_IDS.map((placeId) => [placeId, 1])),
  ...Object.fromEntries(APPROVED_HERO_BATCH_02_IDS
    .filter((placeId) => !['seoul-express-bus-terminal', 'seoul-national-museum'].includes(placeId))
    .map((placeId) => [placeId, 1])),
  'seoul-national-assembly': 2,
  'seoul-coex': 2,
  'seoul-lotte-world': 2,
  'seoul-national-university': 2,
  'seoul-yonsei-university': 2,
  'seoul-korea-university': 2,
  'seoul-jamsil-sports-complex': 2,
  'seoul-mokdong-sports-complex': 2,
  'seoul-cheongnyangni-station': 3,
  'seoul-bank-of-korea-main': 2,
  'seoul-national-university-hospital': 4,
  'seoul-severance-hospital': 2,
  'seoul-kbs-hq': 4,
  'seoul-shilla-hotel': 3,
  'seoul-woori-bank-headquarters': 2,
  'seoul-national-police-agency': 3,
  ...Object.fromEntries(APPROVED_HERO_BATCH_03_IDS.map((placeId) => [placeId, 1])),
  'seoul-gocheok-dome': 3,
  'seoul-yeouido-hangang-park': 3,
  'seoul-times-square': 3,
  'seoul-four-seasons-hotel': 2,
  ...Object.fromEntries(APPROVED_HERO_BATCH_04_IDS.map((placeId) => [placeId, 1])),
  'seoul-samsung-town': 3,
  'seoul-jtbc-hq': 1,
  'seoul-sk-seorin': 2,
  'seoul-shinsegae-gangnam': 1,
  'seoul-megabox-coex': 3,
  'seoul-mbc-hq': 1,
  'seoul-cgv-yongsan-ipark': 2,
  'seoul-galleria-luxury-hall': 1,
  'seoul-hybe-hq': 3,
  ...Object.fromEntries(APPROVED_HERO_BATCH_07_IDS.map((placeId) => [placeId, 1])),
  ...Object.fromEntries(APPROVED_HERO_BATCH_08_IDS.map((placeId) => [placeId, 1])),
  ...Object.fromEntries(APPROVED_HERO_BATCH_09_IDS.map((placeId) => [placeId, 1])),
  ...Object.fromEntries(APPROVED_HERO_BATCH_10_IDS.map((placeId) => [placeId, 1])),
  ...Object.fromEntries(APPROVED_HERO_BATCH_11_IDS.map((placeId) => [placeId, 1])),
  'seoul-yg-hq': 3,
  'seoul-samsung-medical-center': 2,
  'seoul-signiel': 3,
  'seoul-kb-kookmin-headquarters': 2,
  'seoul-lotte-department-main': 3,
  'seoul-lotte-avenuel-world-tower': 3,
  'seoul-myeongdong-kyoja-main': 3,
  'seoul-sillim-one-room-district': 3,
  'seoul-namdaemun-pharmacy-district': 4,
  'seoul-london-bagel-museum-anguk': 4,
  'seoul-hongdae': 4,
  'seoul-sanggye-jugong-district': 4,
  'seoul-acro-river-park': 4,
  'seoul-hannam-the-hill': 4,
  'seoul-lg-twin-towers': 3,
  'seoul-starship-hq': 2,
  'seoul-hyundai-apgujeong-main': 3,
  'seoul-id-hospital': 2,
  'seoul-sm-hq': 7,
  'seoul-cube-hq': 2,
  'seoul-emart-wangsimni': 4,
  'seoul-homeplus-world-cup': 2,
  'seoul-the-plus-plastic-surgery': 3,
  'seoul-cgv-wangsimni': 3,
  'seoul-jennyhouse-cheongdam-hill': 2,
  'seoul-a-by-bom-cheongdam': 2,
  'seoul-club-ff': 5,
  'seoul-raemian-one-bailey': 2,
  'seoul-ph129-cheongdam': 2,
  'seoul-soonsoo-cheongdam': 3,
  'seoul-seven-eleven-myeongdong': 3,
  'seoul-club-nb2': 3,
  'seoul-club-aura': 3,
  'seoul-jk-plastic-surgery': 2,
  'seoul-lh-gangnam-complex-3': 2,
  'seoul-mokdong-apartment-district': 2,
  'seoul-jongno-five-pharmacy-street': 3,
  'seoul-gangnam-station-pharmacy-district': 3,
  'seoul-knotted-cheongdam': 4,
  'seoul-kyochon-chicken-yeoksam-1': 2,
  'seoul-eggdrop-gangnam-woosung': 3,
  'seoul-cu-bgf-hq': 1,
  'seoul-gs25-gangnam-central': 1,
}

describe('map place media governance', () => {
  test('covers the complete 106-place Seoul catalog with an image-backed reviewed asset or fallback', () => {
    const seoulPlaces = getMapPackById('real-seoul-v1').places
    expect(seoulPlaces).toHaveLength(106)
    expect(new Set(seoulPlaces.map((place) => place.id)).size).toBe(106)

    for (const place of seoulPlaces) {
      const media = resolveMapPlaceMedia(place, 'real-seoul-v1')
      expect(validateMapPlaceMediaRecord(media).valid).toBe(true)
      expect(media.asset?.url).toMatch(/^https:\/\//)
    }
  })

  test('validates the reviewed media registry', () => {
    const seoulPlaceIds = new Set(getMapPackById('real-seoul-v1').places.map((place) => place.id))
    expect(MAP_PLACE_MEDIA_RECORDS).toHaveLength(260)
    for (const record of MAP_PLACE_MEDIA_RECORDS) {
      expect(validateMapPlaceMediaRecord(record)).toEqual({ valid: true, errors: [] })
    }
    expect([
      ...new Set(MAP_PLACE_MEDIA_RECORDS
        .filter((record) => record.mapPackId === 'real-seoul-v1' && !seoulPlaceIds.has(record.placeId))
        .map((record) => record.placeId)),
    ]).toEqual([])
  })

  test('registers every reviewed runtime URL at the exact path requested by the app', () => {
    const verifiedDownloadUrls = new Set(
      projectAssetRegistry.assets.map((asset) => asset.downloadUrl),
    )
    const missingRuntimeUrls = [
      ...new Set(MAP_PLACE_MEDIA_RECORDS
        .map((record) => record.asset?.url)
        .filter((url) => url && !verifiedDownloadUrls.has(url))),
    ]

    expect(missingRuntimeUrls).toEqual([])
  })

  test('keeps exact heroes separate from detail-only area atmosphere', () => {
    for (const [placeId, expectedCount] of Object.entries(INTEGRATED_GALLERY_COUNTS)) {
      const hero = getMapPlaceMediaRecord('real-seoul-v1', placeId)
      const gallery = getMapPlaceMediaGallery('real-seoul-v1', placeId)

      expect(gallery).toHaveLength(expectedCount)
      if (AREA_DETAIL_ONLY_PLACE_IDS.includes(placeId)) {
        expect(hero).toBeNull()
        expect(gallery.every((record) => record.slot === MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY)).toBe(true)
      } else {
        expect(hero).toMatchObject({ placeId, slot: MAP_PLACE_MEDIA_SLOT.HERO })
        expect(gallery[0]).toBe(hero)
        expect(gallery.slice(1).every((record) => (
          record.slot === MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY
        ))).toBe(true)
      }
    }
  })

  test('does not admit the two AREX station candidates as Terminal 1 media', () => {
    const gallery = getMapPlaceMediaGallery('real-seoul-v1', 'seoul-incheon-airport-t1')

    expect(gallery).toHaveLength(1)
    expect(gallery[0].source.sourcePageUrl).toContain('Terminal_1_Departure')
    expect(gallery.some((record) => record.source.sourcePageUrl.includes('AREX'))).toBe(false)
  })

  test('returns one fallback slide when a place has no reviewed gallery', () => {
    expect(resolveMapPlaceMediaGallery({ id: 'seoul-unknown' }, 'real-seoul-v1')).toEqual([
      expect.objectContaining({ kind: MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK }),
    ])
  })

  test('keeps every original real pilot asset on the verified project image bed with traceable Commons attribution', () => {
    for (const placeId of REAL_PILOT_PLACE_IDS) {
      const record = MAP_PLACE_MEDIA_RECORDS.find((candidate) => (
        candidate.placeId === placeId && candidate.source.provider === 'wikimedia_commons'
      ))
      expect(record).toBeTruthy()
      expect(record.asset.url).toMatch(/^https:\/\/cloudflare-imgbed-7z3\.pages\.dev\/file\/schatphone-assets\//)
      expect(record.source.provider).toBe('wikimedia_commons')
      expect(record.source.sourcePageUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
      expect(record.source.licenseId).toMatch(/^(CC0|CC BY(?:-SA)? [234]\.0)$/)
      expect(record.source.changesEn).toContain('no generative edit')
    }
  })

  test('allows exact photos as heroes and confines area atmosphere to the detail gallery', () => {
    expect(getMapPlaceMediaRecord('real-seoul-v1', 'seoul-gyeongbokgung')).toMatchObject({
      kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
      authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
    })
    for (const placeId of AREA_DETAIL_ONLY_PLACE_IDS) {
      expect(getMapPlaceMediaRecord('real-seoul-v1', placeId)).toBeNull()
      expect(resolveMapPlaceMedia({ id: placeId }, 'real-seoul-v1')).toMatchObject({
        kind: MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK,
        slot: MAP_PLACE_MEDIA_SLOT.HERO,
      })
      expect(getMapPlaceMediaGallery('real-seoul-v1', placeId).every((record) => (
        record.slot === MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY
      ))).toBe(true)
    }

    for (const record of MAP_PLACE_MEDIA_RECORDS.filter((candidate) => (
      candidate.kind === MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE
    ))) {
      expect(record).toMatchObject({
        slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
        kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
        authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.AREA_ONLY,
      })
    }
    expect(getMapPlaceMediaGallery('real-seoul-v1', 'seoul-cgv-wangsimni')[0]).toMatchObject({
      kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
      authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
    })

    for (const placeId of EXPANDED_PLACE_IDS.filter((id) => ![
      'seoul-gangnam-station',
      'seoul-lotte-department-main',
      'seoul-times-square',
      'seoul-hyundai-apgujeong-main',
    ].includes(id))) {
      expect(getMapPlaceMediaRecord('real-seoul-v1', placeId)).toMatchObject({
        kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
        authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
      })
    }

    for (const placeId of APPROVED_HERO_BATCH_IDS) {
      expect(getMapPlaceMediaRecord('real-seoul-v1', placeId)).toMatchObject({
        placeId,
        kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
        authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
        slot: MAP_PLACE_MEDIA_SLOT.HERO,
      })
    }

    for (const placeId of APPROVED_HERO_BATCH_02_IDS) {
      expect(getMapPlaceMediaRecord('real-seoul-v1', placeId)).toMatchObject({
        placeId,
        kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
        authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
        slot: MAP_PLACE_MEDIA_SLOT.HERO,
      })
    }

    for (const placeId of APPROVED_HERO_BATCH_06_IDS) {
      expect(getMapPlaceMediaRecord('real-seoul-v1', placeId)).toMatchObject({
        placeId,
        kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
        authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
        slot: MAP_PLACE_MEDIA_SLOT.HERO,
      })
    }

    for (const placeId of APPROVED_HERO_BATCH_06_SELECTED_IDS) {
      expect(getMapPlaceMediaRecord('real-seoul-v1', placeId)).toMatchObject({
        placeId,
        kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
        authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
        slot: MAP_PLACE_MEDIA_SLOT.HERO,
        source: {
          type: 'source_traced_external_photo',
          rightsStatus: 'source_traced_personal_project_use',
          usageScope: 'personal_project',
        },
      })
    }

    for (const placeId of APPROVED_HERO_BATCH_10_IDS) {
      expect(getMapPlaceMediaRecord('real-seoul-v1', placeId)).toMatchObject({
        placeId,
        kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
        authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
        slot: MAP_PLACE_MEDIA_SLOT.HERO,
        source: {
          type: 'source_traced_external_photo',
          rightsStatus: 'source_traced_personal_project_use',
          usageScope: 'personal_project',
        },
      })
    }

    for (const placeId of HERO_COMPLETION_EXACT_IDS) {
      expect(getMapPlaceMediaRecord('real-seoul-v1', placeId)).toMatchObject({
        placeId,
        kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
        authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
        slot: MAP_PLACE_MEDIA_SLOT.HERO,
        source: {
          type: 'source_traced_external_photo',
          rightsStatus: 'source_traced_personal_project_use',
          usageScope: 'personal_project',
        },
      })
    }

    for (const placeId of HERO_COMPLETION_BRAND_REPRESENTATIVE_IDS) {
      expect(getMapPlaceMediaRecord('real-seoul-v1', placeId)).toMatchObject({
        placeId,
        kind: MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK,
        authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.GENERIC,
        slot: MAP_PLACE_MEDIA_SLOT.HERO,
        labelZh: '品牌代表图',
        labelEn: 'Brand representative',
        source: {
          type: 'source_traced_external_photo',
          rightsStatus: 'source_traced_personal_project_use',
          usageScope: 'personal_project',
        },
      })
    }

    expect(getMapPlaceMediaRecord('real-seoul-v1', 'seoul-lg-twin-towers')).toMatchObject({
      kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
      authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
      slot: MAP_PLACE_MEDIA_SLOT.HERO,
    })
    expect(getMapPlaceMediaGallery('real-seoul-v1', 'seoul-lg-twin-towers').slice(1)).toEqual([
      expect.objectContaining({
        kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
        slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
      }),
      expect.objectContaining({
        kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
        slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
      }),
    ])
  })

  test('rejects area atmosphere when a future record attempts to occupy the hero slot', () => {
    const areaRecord = getMapPlaceMediaGallery('real-seoul-v1', 'seoul-sm-hq')
      .find((record) => record.kind === MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE)
    const invalidHero = { ...areaRecord, slot: MAP_PLACE_MEDIA_SLOT.HERO }

    expect(validateMapPlaceMediaRecord(invalidHero)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(['hero_kind', 'area_atmosphere_slot']),
    })
  })

  test('uses a non-evidentiary category visual for fictional and player places without reviewed media', () => {
    expect(resolveMapPlaceMedia({ id: 'waste-helix-spire' }, 'cyber-wasteland-v1')).toMatchObject({
      kind: MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK,
      authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.GENERIC,
      asset: expect.objectContaining({ url: expect.stringContaining('cyber-wasteland-city-v1.svg') }),
    })
    expect(resolveMapPlaceMedia({ id: 'user-cafe', source: 'user' }, 'real-seoul-v1')).toMatchObject({
      placeId: 'user-cafe',
      kind: MAP_PLACE_MEDIA_KIND.CATEGORY_FALLBACK,
      asset: expect.objectContaining({ url: expect.stringContaining('seoul-street-map-v1.webp') }),
    })
  })
})
