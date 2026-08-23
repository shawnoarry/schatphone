import { describe, expect, test } from 'vitest'
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

const AREA_DETAIL_ONLY_PLACE_IDS = [
  'seoul-sm-hq',
  'seoul-myeongdong-kyoja-main',
  'seoul-sillim-one-room-district',
  'seoul-express-bus-terminal',
  'seoul-gangnam-station',
  'seoul-lotte-department-main',
  'seoul-national-museum',
  'seoul-times-square',
  'seoul-hyundai-apgujeong-main',
]

const INTEGRATED_GALLERY_COUNTS = {
  'seoul-gwanghwamun': 4,
  'seoul-city-hall': 4,
  'seoul-n-tower': 6,
  'seoul-ddp': 4,
  'seoul-lotte-world-tower': 5,
  'seoul-incheon-airport-t1': 1,
  'seoul-gimpo-airport': 2,
  'seoul-gangnam-station': 2,
  'seoul-express-bus-terminal': 2,
  'seoul-yongsan-station': 2,
  'seoul-63-square': 2,
  'seoul-national-museum': 2,
  'seoul-times-square': 2,
  'seoul-lotte-department-main': 2,
  'seoul-olympic-park': 2,
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
    expect(MAP_PLACE_MEDIA_RECORDS).toHaveLength(51)
    for (const record of MAP_PLACE_MEDIA_RECORDS) {
      expect(validateMapPlaceMediaRecord(record)).toEqual({ valid: true, errors: [] })
    }
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

  test('keeps every real pilot asset on the verified project image bed with traceable Commons attribution', () => {
    for (const placeId of REAL_PILOT_PLACE_IDS) {
      const record = getMapPlaceMediaGallery('real-seoul-v1', placeId)[0]
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
      expect(getMapPlaceMediaGallery('real-seoul-v1', placeId)[0]).toMatchObject({
        kind: MAP_PLACE_MEDIA_KIND.AREA_ATMOSPHERE,
        authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.AREA_ONLY,
        slot: MAP_PLACE_MEDIA_SLOT.DETAIL_GALLERY,
      })
    }

    for (const placeId of EXPANDED_PLACE_IDS.filter((id) => ![
      'seoul-express-bus-terminal',
      'seoul-gangnam-station',
      'seoul-lotte-department-main',
      'seoul-national-museum',
      'seoul-times-square',
      'seoul-hyundai-apgujeong-main',
    ].includes(id))) {
      expect(getMapPlaceMediaRecord('real-seoul-v1', placeId)).toMatchObject({
        kind: MAP_PLACE_MEDIA_KIND.EXACT_PHOTO,
        authenticityGrade: MAP_PLACE_MEDIA_AUTHENTICITY_GRADE.EXACT_PLACE,
      })
    }
  })

  test('rejects area atmosphere when a future record attempts to occupy the hero slot', () => {
    const areaRecord = getMapPlaceMediaGallery('real-seoul-v1', 'seoul-sm-hq')[0]
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
