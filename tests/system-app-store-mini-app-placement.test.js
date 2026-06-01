import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

describe('system App Store mini app placement', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('persists folder mini app install state without deleting source records', () => {
    const store = useSystemStore()
    store.setAppStoreMiniAppInstalled('shop_app_food_seed_moon_bistro', false)
    store.saveNow()

    setActivePinia(createPinia())
    const restored = useSystemStore()
    expect(restored.hydrateFromStorage()).toBe(true)
    expect(restored.settings.appearance.appStoreMiniAppPlacements.hiddenEntryIds).toEqual([
      'shop_app_food_seed_moon_bistro',
    ])

    restored.setAppStoreMiniAppInstalled('shop_app_food_seed_moon_bistro', true)
    expect(restored.settings.appearance.appStoreMiniAppPlacements.hiddenEntryIds).toEqual([])
  })
})
