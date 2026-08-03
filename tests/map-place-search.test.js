import { describe, expect, test } from 'vitest'
import {
  normalizeMapPlaceSearchText,
  searchMapPlaces,
  suggestMapPlaces,
} from '../src/lib/map-place-search'

const PLACES = [
  {
    id: 'hongdae',
    placeId: 'hongdae',
    nameZh: '弘大入口',
    nameEn: 'Hongik University Street',
    detailZh: '首尔特别市麻浦区洪益路',
    detailEn: 'Hongik-ro, Mapo-gu, Seoul',
    aliases: ['Hongdae', '麻浦'],
    category: 'leisure',
    source: 'map_pack',
    position: { kind: 'geo', lat: 37.55, lng: 126.92 },
  },
  {
    id: 'salon',
    placeId: 'salon',
    nameZh: 'Jenny House 清潭店',
    nameEn: 'Jenny House Cheongdam',
    detailZh: '首尔特别市江南区宣陵路',
    detailEn: 'Seolleung-ro, Gangnam-gu, Seoul',
    aliases: ['美容室', 'Cheongdam'],
    category: 'shop',
    source: 'map_pack',
    position: { kind: 'geo', lat: 37.52, lng: 127.04 },
  },
  {
    id: 'company',
    placeId: 'company',
    nameZh: 'Starship 娱乐总部',
    nameEn: 'Starship Entertainment HQ',
    detailZh: '首尔特别市江南区三成路',
    detailEn: 'Samseong-ro, Gangnam-gu, Seoul',
    aliases: ['Starship'],
    category: 'work',
    source: 'map_pack',
    position: { kind: 'geo', lat: 37.52, lng: 127.05 },
  },
  {
    id: 'station',
    placeId: 'station',
    nameZh: '首尔站',
    nameEn: 'Seoul Station',
    detailZh: '首尔特别市龙山区汉江大路',
    detailEn: 'Hangang-daero, Yongsan-gu, Seoul',
    category: 'transit',
    source: 'map_pack',
    position: { kind: 'geo', lat: 37.55, lng: 126.97 },
  },
  {
    id: 'airport',
    placeId: 'airport',
    nameZh: '仁川国际机场',
    nameEn: 'Incheon International Airport',
    detailZh: '仁川广域市中区机场路',
    detailEn: 'Gonghang-ro, Jung-gu, Incheon',
    category: 'transit_hub',
    source: 'map_pack',
    position: { kind: 'geo', lat: 37.46, lng: 126.44 },
  },
  {
    id: 'saved-home',
    placeId: 'address:1',
    label: '我的公寓',
    detail: '城东区安静住宅街',
    category: 'home',
    source: 'user',
    position: { kind: 'geo', lat: 37.54, lng: 127.03 },
  },
  {
    id: 'budget-home',
    placeId: 'budget-home',
    nameZh: '青年公共住宅',
    nameEn: 'Youth Public Housing',
    detailZh: '首尔特别市城东区',
    detailEn: 'Seongdong-gu, Seoul',
    category: 'residence_budget',
    source: 'map_pack',
    position: { kind: 'geo', lat: 37.55, lng: 127.04 },
  },
  {
    id: 'luxury-home',
    placeId: 'luxury-home',
    nameZh: '汉南顶层公寓',
    nameEn: 'Hannam Penthouse',
    detailZh: '首尔特别市龙山区汉南洞',
    detailEn: 'Hannam-dong, Yongsan-gu, Seoul',
    category: 'residence_luxury',
    source: 'map_pack',
    position: { kind: 'geo', lat: 37.54, lng: 127.0 },
  },
  {
    id: 'convenience',
    placeId: 'convenience',
    nameZh: 'CU BGF 总部店',
    nameEn: 'CU BGF Headquarters Store',
    detailZh: '首尔特别市江南区德黑兰路',
    detailEn: 'Teheran-ro, Gangnam-gu, Seoul',
    aliases: ['CU'],
    category: 'convenience_store',
    source: 'map_pack',
    position: { kind: 'geo', lat: 37.5, lng: 127.05 },
  },
]

describe('map place search', () => {
  test('normalizes width, accents, punctuation, casing, and spacing', () => {
    expect(normalizeMapPlaceSearchText('  ＣＡＦÉ－Hongdae  ')).toBe('cafe hongdae')
  })

  test('requires every query term while matching address and category semantics', () => {
    const results = searchMapPlaces(PLACES, '江南 美容')

    expect(results.map((result) => result.place.id)).toEqual(['salon'])
    expect(results[0].match).toMatchObject({ kind: 'alias', value: '美容室' })
  })

  test('supports bounded latin typos without using fuzzy matching for short tokens', () => {
    expect(searchMapPlaces(PLACES, 'Hongde')[0]).toMatchObject({
      place: { id: 'hongdae' },
      match: { quality: 'fuzzy' },
    })
    expect(searchMapPlaces(PLACES, 'SML')).toEqual([])
  })

  test('ranks a name match above address-only matches and respects broad category filters', () => {
    expect(searchMapPlaces(PLACES, 'Seoul')[0].place.id).toBe('station')
    expect(
      searchMapPlaces(PLACES, 'Seoul', { categoryId: 'shopping' }).map(
        (result) => result.place.id,
      ),
    ).toEqual(['salon'])
  })

  test('groups icon subtypes for filters while preserving subtype search semantics', () => {
    expect(
      suggestMapPlaces(PLACES, { categoryId: 'residence', limit: 20 }).map(
        (result) => result.place.id,
      ),
    ).toEqual(['saved-home', 'budget-home', 'luxury-home'])
    expect(
      suggestMapPlaces(PLACES, { categoryId: 'transit', limit: 20 }).map(
        (result) => result.place.id,
      ),
    ).toEqual(['station', 'airport'])
    expect(searchMapPlaces(PLACES, '豪华住宅')[0].place.id).toBe('luxury-home')
    expect(searchMapPlaces(PLACES, '住宅', { categoryId: 'residence' })).toHaveLength(3)
  })

  test('automatically searches future places through standard fields and category terms', () => {
    const futurePlace = {
      id: 'future-museum',
      placeId: 'future-museum',
      nameZh: '星光纪念馆',
      nameEn: 'Starlight Memorial Hall',
      detailZh: '钟路区北侧',
      detailEn: 'North Jongno-gu',
      category: 'culture',
      position: { kind: 'geo', lat: 37.58, lng: 126.98 },
    }

    expect(searchMapPlaces([futurePlace], '纪念馆')).toHaveLength(1)
    expect(searchMapPlaces([futurePlace], '博物馆')).toHaveLength(1)
    expect(searchMapPlaces([futurePlace], 'Jongno')).toHaveLength(1)
  })

  test('suggests recent destinations first, then saved and category-diverse places', () => {
    const suggestions = suggestMapPlaces(PLACES, {
      recentDestinationTexts: ['Hongdae'],
      limit: 5,
    })

    expect(suggestions[0].place.id).toBe('hongdae')
    expect(suggestions[1].place.id).toBe('saved-home')
    expect(new Set(suggestions.map((result) => result.place.category)).size).toBeGreaterThan(2)
  })

  test('keeps convenience stores out of broad suggestions but available by search or category', () => {
    expect(suggestMapPlaces(PLACES, { limit: 20 }).map((result) => result.place.id)).not.toContain(
      'convenience',
    )
    expect(searchMapPlaces(PLACES, 'CU')[0].place.id).toBe('convenience')
    expect(
      suggestMapPlaces(PLACES, { categoryId: 'convenience_store' })[0].place.id,
    ).toBe('convenience')
  })
})
