import { describe, expect, test } from 'vitest'
import {
  isMiniAppEntryInstalled,
  normalizeAppStoreMiniAppPlacements,
  setMiniAppEntryInstalled,
} from '../src/lib/app-store-mini-app-placement'

describe('App Store mini app placement helpers', () => {
  test('normalizes hidden folder mini app ids only', () => {
    expect(
      normalizeAppStoreMiniAppPlacements({
        hiddenEntryIds: ['shop_app_food_seed_moon_bistro', 'app_chat', 'shop_app_food_seed_moon_bistro'],
      }),
    ).toEqual({
      hiddenEntryIds: ['shop_app_food_seed_moon_bistro'],
    })
  })

  test('defaults entries to installed and toggles hidden state', () => {
    expect(isMiniAppEntryInstalled({}, 'shop_app_food_seed_moon_bistro')).toBe(true)

    const hidden = setMiniAppEntryInstalled({}, 'shop_app_food_seed_moon_bistro', false)
    expect(hidden.hiddenEntryIds).toEqual(['shop_app_food_seed_moon_bistro'])
    expect(isMiniAppEntryInstalled(hidden, 'shop_app_food_seed_moon_bistro')).toBe(false)

    const restored = setMiniAppEntryInstalled(hidden, 'shop_app_food_seed_moon_bistro', true)
    expect(restored.hiddenEntryIds).toEqual([])
  })
})
