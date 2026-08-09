import { describe, expect, test } from 'vitest'
import {
  MAP_PLACE_DISPLAY_MODE,
  normalizeMapPlaceDisplayMode,
  resolveMapPlacePresentation,
} from '../src/lib/map-place-localization'

const bilingualPlace = {
  nameZh: '汝矣岛汉江公园',
  nameEn: 'Yeouido Hangang Park',
  detailZh: '首尔特别市永登浦区汝矣东路 330',
  detailEn: '330 Yeouidong-ro, Yeongdeungpo-gu, Seoul',
}

describe('map place localization', () => {
  test('normalizes unsupported display modes to the old-save-compatible system mode', () => {
    expect(normalizeMapPlaceDisplayMode('en')).toBe(MAP_PLACE_DISPLAY_MODE.EN)
    expect(normalizeMapPlaceDisplayMode('unsupported')).toBe(MAP_PLACE_DISPLAY_MODE.SYSTEM)
    expect(normalizeMapPlaceDisplayMode()).toBe(MAP_PLACE_DISPLAY_MODE.SYSTEM)
  })

  test('follows the system language unless Map has an explicit override', () => {
    expect(
      resolveMapPlacePresentation(bilingualPlace, {
        mode: MAP_PLACE_DISPLAY_MODE.SYSTEM,
        systemLanguage: 'zh-CN',
      }).name,
    ).toBe('汝矣岛汉江公园')
    expect(
      resolveMapPlacePresentation(bilingualPlace, {
        mode: MAP_PLACE_DISPLAY_MODE.SYSTEM,
        systemLanguage: 'en-US',
      }).name,
    ).toBe('Yeouido Hangang Park')
    expect(
      resolveMapPlacePresentation(bilingualPlace, {
        mode: MAP_PLACE_DISPLAY_MODE.EN,
        systemLanguage: 'zh-CN',
      }).detail,
    ).toBe('330 Yeouidong-ro, Yeongdeungpo-gu, Seoul')
  })

  test('uses the product locale fallback when a Korean place translation is absent', () => {
    const presentation = resolveMapPlacePresentation(bilingualPlace, {
      mode: MAP_PLACE_DISPLAY_MODE.SYSTEM,
      systemLanguage: 'ko-KR',
    })

    expect(presentation.primaryLanguage).toBe('ko')
    expect(presentation.name).toBe('汝矣岛汉江公园')
  })

  test('projects both authored languages without duplicating single-language player pins', () => {
    expect(
      resolveMapPlacePresentation(bilingualPlace, {
        mode: MAP_PLACE_DISPLAY_MODE.BILINGUAL,
        systemLanguage: 'zh-CN',
      }),
    ).toMatchObject({
      name: '汝矣岛汉江公园',
      detail: '首尔特别市永登浦区汝矣东路 330',
      secondaryName: 'Yeouido Hangang Park',
      secondaryDetail: '330 Yeouidong-ro, Yeongdeungpo-gu, Seoul',
    })

    expect(
      resolveMapPlacePresentation(
        {
          label: 'My studio',
          detail: 'Third floor',
          nameZh: 'My studio',
          nameEn: 'My studio',
          detailZh: 'Third floor',
          detailEn: 'Third floor',
        },
        { mode: MAP_PLACE_DISPLAY_MODE.BILINGUAL },
      ),
    ).toMatchObject({
      name: 'My studio',
      detail: 'Third floor',
      secondaryName: '',
      secondaryDetail: '',
    })
  })
})
