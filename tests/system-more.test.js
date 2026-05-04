import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

describe('system More feature toggles', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('exposes normalized default More toggles', () => {
    const store = useSystemStore()

    expect(store.isMoreFeatureToggleEnabled('smart_panel')).toBe(true)
    expect(store.isMoreFeatureToggleEnabled('focus_mode')).toBe(false)
    expect(store.isMoreFeatureToggleEnabled('scene_switch')).toBe(false)
    expect(store.setMoreFeatureToggle('unknown', true)).toBe(false)
    expect(store.isMoreFeatureToggleEnabled('unknown')).toBe(false)
  })

  test('updates and persists More toggles through system storage', () => {
    const store = useSystemStore()

    expect(store.setMoreFeatureToggle('focus_mode', true)).toBe(true)
    expect(store.toggleMoreFeatureToggle('scene_switch')).toBe(true)
    expect(store.isMoreFeatureToggleEnabled('scene_switch')).toBe(true)
    store.saveNow()

    setActivePinia(createPinia())
    const restoredStore = useSystemStore()

    expect(restoredStore.isMoreFeatureToggleEnabled('smart_panel')).toBe(true)
    expect(restoredStore.isMoreFeatureToggleEnabled('focus_mode')).toBe(true)
    expect(restoredStore.isMoreFeatureToggleEnabled('scene_switch')).toBe(true)
  })

  test('restores More toggle snapshots with backward-compatible defaults', () => {
    const store = useSystemStore()

    expect(
      store.restoreFromBackup({
        settings: {
          more: {
            featureToggles: {
              smart_panel: false,
              focus_mode: true,
              scene_switch: 'yes',
              legacy_flag: true,
            },
          },
        },
      }),
    ).toBe(true)

    expect(store.isMoreFeatureToggleEnabled('smart_panel')).toBe(false)
    expect(store.isMoreFeatureToggleEnabled('focus_mode')).toBe(true)
    expect(store.isMoreFeatureToggleEnabled('scene_switch')).toBe(false)
    expect(store.settings.more.featureToggles).toEqual({
      smart_panel: false,
      focus_mode: true,
      scene_switch: false,
    })
  })
})
