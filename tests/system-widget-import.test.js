import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  CUSTOM_WIDGET_ACTION_TYPE_NONE,
  CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP,
  CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM,
} from '../src/lib/custom-widget-actions'
import { DEFAULT_HOME_LAYOUT_TEMPLATE_ID } from '../src/lib/home-layout-templates'
import { writePersistedState } from '../src/lib/persistence'
import { useSystemStore } from '../src/stores/system'

const snapshotWidgetState = (store) =>
  JSON.stringify({
    customWidgets: store.settings.appearance.customWidgets.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      code: item.code,
      sourcePresetId: item.sourcePresetId,
      action: item.action,
      createdAt: item.createdAt,
    })),
    homeWidgetPages: store.settings.appearance.homeWidgetPages.map((page) => [...page]),
  })

describe('system widget import safety', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('imports valid widgets and places them on target page', () => {
    const store = useSystemStore()
    const beforeCount = store.settings.appearance.customWidgets.length

    const result = store.importCustomWidgets(
      JSON.stringify([
        {
          name: 'Widget A',
          size: '2x2',
          code: '<div>A</div>',
        },
      ]),
      3,
    )

    expect(result.ok).toBe(true)
    expect(result.importedCount).toBe(1)
    expect(result.errors).toHaveLength(0)
    expect(store.settings.appearance.customWidgets.length).toBe(beforeCount + 1)

    const importedId = result.importedIds[0]
    expect(typeof importedId).toBe('string')
    expect(store.settings.appearance.homeWidgetPages[3]).toContain(importedId)
  })

  test('can import widgets into library without placing them on Home', () => {
    const store = useSystemStore()
    const beforePages = store.settings.appearance.homeWidgetPages.map((page) => [...page])

    const result = store.importCustomWidgets(
      JSON.stringify([
        {
          name: 'Library Widget',
          size: '2x2',
          code: '<div>Library</div>',
        },
      ]),
      null,
      { placeOnHome: false },
    )

    expect(result.ok).toBe(true)
    expect(result.importedCount).toBe(1)
    expect(store.settings.appearance.customWidgets.some((item) => item.id === result.importedIds[0])).toBe(true)
    expect(store.settings.appearance.homeWidgetPages).toEqual(beforePages)
  })

  test('can create custom widgets without placing them on Home', () => {
    const store = useSystemStore()
    const beforePages = store.settings.appearance.homeWidgetPages.map((page) => [...page])

    const widgetId = store.addCustomWidget({
      name: 'Draft Widget',
      size: '2x2',
      code: '<div>Draft</div>',
      pageIndex: null,
      placeOnHome: false,
    })

    expect(widgetId).toMatch(/^custom_widget_/)
    expect(store.settings.appearance.customWidgets.some((item) => item.id === widgetId)).toBe(true)
    expect(store.settings.appearance.homeWidgetPages).toEqual(beforePages)
  })

  test('rejects unsafe appearance code in direct create and update paths', () => {
    const store = useSystemStore()

    expect(
      store.addCustomWidget({
        name: 'Unsafe create',
        size: '2x2',
        code: '<script>window.parent.hacked = true</script>',
        placeOnHome: false,
      }),
    ).toBeNull()
    expect(store.settings.appearance.customWidgets).toHaveLength(0)

    const widgetId = store.addCustomWidget({
      name: 'Safe widget',
      size: '2x2',
      code: '<div>Safe</div>',
      placeOnHome: false,
    })

    expect(
      store.updateCustomWidget(widgetId, {
        code: '<img src="preview.png" onerror="window.parent.hacked = true">',
      }),
    ).toBe(false)
    expect(store.settings.appearance.customWidgets[0].code).toBe('<div>Safe</div>')
  })

  test('sanitizes persisted unsafe widgets without deleting their definitions', () => {
    writePersistedState(
      'store:system',
      {
        settings: {
          appearance: {
            customWidgets: [
              {
                id: 'custom_widget_legacy_unsafe',
                name: 'Legacy look',
                size: '2x2',
                code: '<div onclick="alert(1)">Keep me</div><script>alert(2)</script>',
                sourcePresetId: 'mood_charm',
                createdAt: 42,
              },
            ],
          },
        },
      },
      { version: 1 },
    )

    const store = useSystemStore()
    const widget = store.settings.appearance.customWidgets.find(
      (item) => item.id === 'custom_widget_legacy_unsafe',
    )

    expect(widget).toBeTruthy()
    expect(widget.code).toContain('Keep me')
    expect(widget.code).not.toMatch(/onclick|<script/i)
    expect(widget.sourcePresetId).toBe('mood_charm')
  })

  test('persists official preset identity across store hydration', () => {
    const store = useSystemStore()
    const widgetId = store.addCustomWidget({
      name: 'Mood Charm',
      size: '1x1',
      code: '<div>Mood</div>',
      sourcePresetId: 'mood_charm',
      placeOnHome: false,
    })

    expect(store.updateCustomWidget(widgetId, { name: 'My Mood' })).toBe(true)
    store.saveNow()

    setActivePinia(createPinia())
    const restoredStore = useSystemStore()
    const restoredWidget = restoredStore.settings.appearance.customWidgets.find(
      (item) => item.id === widgetId,
    )

    expect(restoredWidget).toMatchObject({
      name: 'My Mood',
      sourcePresetId: 'mood_charm',
    })
  })

  test('stores custom widget actions as UI metadata outside import code', () => {
    const store = useSystemStore()

    const widgetId = store.addCustomWidget({
      name: 'Action Widget',
      size: '2x2',
      code: '<div>Action</div>',
      action: { type: CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP, target: 'app_chat' },
      pageIndex: null,
      placeOnHome: false,
    })

    expect(store.settings.appearance.customWidgets.find((item) => item.id === widgetId)?.action).toEqual({
      type: CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP,
      target: 'app_chat',
    })

    expect(
      store.updateCustomWidget(widgetId, {
        action: { type: CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM, target: 'appearance' },
      }),
    ).toBe(true)
    expect(store.settings.appearance.customWidgets.find((item) => item.id === widgetId)?.action).toEqual({
      type: CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM,
      target: 'appearance',
    })

    expect(
      store.updateCustomWidget(widgetId, {
        action: { type: CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP, target: 'javascript:alert(1)' },
      }),
    ).toBe(true)
    expect(store.settings.appearance.customWidgets.find((item) => item.id === widgetId)?.action).toEqual({
      type: CUSTOM_WIDGET_ACTION_TYPE_NONE,
      target: '',
    })
  })

  test('restores built-in widgets to their default page order', () => {
    const store = useSystemStore()
    store.setHomeWidgetPages([['calendar'], ['weather', 'music']])

    const ok = store.restoreBuiltInWidgetTile('weather')

    expect(ok).toBe(true)
    expect(store.settings.appearance.homeWidgetPages[0].indexOf('weather')).toBeLessThan(
      store.settings.appearance.homeWidgetPages[0].indexOf('calendar'),
    )
    expect(store.settings.appearance.homeWidgetPages[1]).not.toContain('weather')
  })

  test('updates placed custom widgets without moving them across pages', () => {
    const store = useSystemStore()
    const widgetId = store.addCustomWidget({
      name: 'Placed Widget',
      size: '2x2',
      code: '<div>Before</div>',
      pageIndex: 2,
    })

    const beforePages = store.settings.appearance.homeWidgetPages.map((page) => [...page])
    const ok = store.updateCustomWidget(widgetId, {
      name: 'Placed Widget Updated',
      code: '<div>After</div>',
    })

    expect(ok).toBe(true)
    expect(store.settings.appearance.customWidgets.find((item) => item.id === widgetId)?.name).toBe(
      'Placed Widget Updated',
    )
    expect(store.settings.appearance.homeWidgetPages).toEqual(beforePages)
  })

  test('keeps secondary utilities in the library while restoring the third default Home screen', () => {
    const store = useSystemStore()

    expect(store.settings.appearance.homeVisiblePageCount).toBe(3)
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_files')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_shopping')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_reminders')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_food_delivery')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_network')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_stock')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_assets')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_store')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_control_center')
    expect(store.settings.appearance.homeWidgetPages[2]).toEqual([
      'system',
      'quick_heart',
      'quick_disc',
      'app_browser',
      'app_community',
    ])

    store.setHomeWidgetPages([
      ['app_chat', 'app_files', 'weather', 'app_control_center'],
      ['app_store'],
    ])

    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_files')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_control_center')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_chat')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_store')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_shopping')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_reminders')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_food_delivery')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_assets')
  })

  test('allows user-managed Home app entries to stay removed until reset', () => {
    const store = useSystemStore()

    store.setHomeWidgetPages([['weather'], [], [], [], []])

    const flattened = store.settings.appearance.homeWidgetPages.flat()
    expect(flattened).toContain('weather')
    expect(flattened).not.toContain('app_network')
    expect(flattened).not.toContain('app_chat')

    store.resetHomeWidgetPages()
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_network')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_phone')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_gallery')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_stock')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_assets')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_widgets')
  })

  test('migrates persisted legacy default Home into the cleaned setup layout', () => {
    writePersistedState(
      'store:system',
      {
        settings: {
          appearance: {
            homeWidgetPages: [
              ['weather', 'calendar', 'music', 'app_network', 'app_chat', 'app_wallet', 'app_themes', 'app_gallery'],
              [
                'system',
                'quick_heart',
                'quick_disc',
                'app_phone',
                'app_map',
                'app_calendar',
                'app_reminders',
                'app_stock',
                'app_shopping',
                'app_food_delivery',
                'app_assets',
                'app_more',
              ],
              [],
              [],
              [],
            ],
            homeLayoutTemplateIds: ['layout-c', 'layout-f', 'layout-b', 'layout-d', 'layout-e'],
            homeLayoutSlotPlacements: [
              [
                { slotId: 'c-top-left', tileId: 'weather' },
                { slotId: 'c-top-right', tileId: 'calendar' },
                { slotId: 'c-wide', tileId: 'music' },
                { slotId: 'c-small-1', tileId: 'app_network' },
                { slotId: 'c-small-2', tileId: 'app_chat' },
                { slotId: 'c-small-3', tileId: 'app_wallet' },
                { slotId: 'c-small-4', tileId: 'app_themes' },
                { slotId: 'c-small-5', tileId: 'app_gallery' },
              ],
              [
                { slotId: 'f-left', tileId: 'system' },
                { slotId: 'f-small-1', tileId: 'quick_heart' },
                { slotId: 'f-small-2', tileId: 'quick_disc' },
                { slotId: 'f-small-3', tileId: 'app_phone' },
                { slotId: 'f-small-4', tileId: 'app_map' },
              ],
              [],
              [],
              [],
            ],
          },
          more: {
            featureToggles: {
              control_center: false,
            },
          },
        },
      },
      { version: 1 },
    )

    const store = useSystemStore()

    expect(store.settings.appearance.homeLayoutTemplateIds.slice(0, 3)).toEqual([
      'layout-c',
      'layout-h',
      'layout-f',
    ])
    expect(store.settings.appearance.homeWidgetPages[0]).not.toContain('app_chat')
    expect(store.settings.appearance.homeWidgetPages[1]).toContain('app_shopping')
    expect(store.settings.appearance.homeWidgetPages[1]).toContain('app_food_delivery')
    expect(store.settings.appearance.homeWidgetPages[1]).toContain('app_music')
    expect(store.settings.appearance.homeWidgetPages[1]).toContain('app_agenda_journey')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_store')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_stock')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_assets')
    expect(store.settings.appearance.homeLayoutSlotPlacements[1]).toContainEqual({
      slotId: 'h-small-8',
      tileId: 'app_food_delivery',
    })
    expect(store.settings.appearance.homeLayoutSlotPlacements[1]).toContainEqual({
      slotId: 'h-small-9',
      tileId: 'app_daon_mail',
    })
    expect(store.settings.appearance.homeLayoutSlotPlacements[1]).toContainEqual({
      slotId: 'h-small-10',
      tileId: 'app_healthcare',
    })
    expect(store.settings.appearance.homeLayoutSlotPlacements[1]).toContainEqual({
      slotId: 'h-small-11',
      tileId: 'app_jari_housing',
    })
    expect(store.settings.appearance.homeLayoutSlotPlacements[2]).toContainEqual({
      slotId: 'f-small-3',
      tileId: 'app_browser',
    })
    expect(store.settings.appearance.homeLayoutSlotPlacements[2]).toContainEqual({
      slotId: 'f-small-4',
      tileId: 'app_community',
    })
    expect(store.settings.appearance.homeDesktopSetupVersion).toBe(9)
  })

  test('migrates the previous versioned default Home into the release layout', () => {
    writePersistedState(
      'store:system',
      {
        settings: {
          appearance: {
            homeDesktopSetupVersion: 2,
            homeWidgetPages: [
              [
                'weather',
                'calendar',
                'music',
                'app_network',
                'app_wallet',
                'app_themes',
                'app_gallery',
                'app_camera',
              ],
              [
                'app_phone',
                'app_map',
                'app_calendar',
                'app_reminders',
                'app_stock',
                'app_shopping',
                'app_food_delivery',
                'app_assets',
              ],
              ['system', 'quick_heart', 'quick_disc', 'app_store'],
              [],
              [],
            ],
            homeLayoutTemplateIds: ['layout-c', 'layout-b', 'layout-f', 'layout-d', 'layout-e'],
          },
        },
      },
      { version: 1 },
    )

    const store = useSystemStore()

    expect(store.settings.appearance.homeWidgetPages[0]).not.toContain('app_chat')
    expect(store.settings.appearance.homeWidgetPages[1]).toContain('app_phone')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_network')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_stock')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_assets')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_store')
    expect(store.settings.appearance.homeDesktopSetupVersion).toBe(9)
  })

  test('migrates the prior curated two-screen default to the configurable three-screen default', () => {
    writePersistedState(
      'store:system',
      {
        settings: {
          appearance: {
            homeDesktopSetupVersion: 3,
            homeWidgetPages: [
              ['weather', 'calendar', 'music', 'app_wallet', 'app_themes', 'app_gallery', 'app_camera'],
              ['app_phone', 'app_map', 'app_calendar', 'app_reminders', 'app_shopping', 'app_food_delivery'],
              [],
              [],
              [],
            ],
            homeLayoutTemplateIds: ['layout-c', 'layout-b', 'layout-f', 'layout-d', 'layout-e'],
          },
        },
      },
      { version: 1 },
    )

    const store = useSystemStore()

    expect(store.settings.appearance.homeWidgetPages[2]).toEqual([
      'system',
      'quick_heart',
      'quick_disc',
      'app_browser',
      'app_community',
    ])
    expect(store.settings.appearance.homeVisiblePageCount).toBe(3)
    expect(store.settings.appearance.homeDesktopSetupVersion).toBe(9)
  })

  test('keeps customized Home slot setup during setup-version hydration', () => {
    writePersistedState(
      'store:system',
      {
        settings: {
          appearance: {
            homeDesktopSetupVersion: 1,
            homeWidgetPages: [['weather'], [], [], [], []],
            homeLayoutTemplateIds: ['layout-c', 'layout-b', 'layout-f', 'layout-d', 'layout-e'],
            homeLayoutSlotPlacements: [
              [{ slotId: 'c-top-left', tileId: 'weather' }],
              [],
              [],
              [],
              [],
            ],
          },
          more: {
            featureToggles: {
              control_center: false,
            },
          },
        },
      },
      { version: 1 },
    )

    const store = useSystemStore()

    expect(store.settings.appearance.homeWidgetPages[0]).toEqual(['weather'])
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_phone')
    expect(store.settings.appearance.homeVisiblePageCount).toBe(2)
    expect(store.settings.appearance.homeDesktopSetupVersion).toBe(9)
    expect(store.settings.appearance.homeLayoutSlotPlacements[0]).toContainEqual({
      slotId: 'c-top-left',
      tileId: 'weather',
    })
  })

  test('can apply current Home desktop defaults without deleting custom widgets', () => {
    const store = useSystemStore()
    const widgetId = store.addCustomWidget({
      name: 'Saved Poster',
      size: '4x4',
      code: '<div>Poster</div>',
      placeOnHome: false,
    })
    store.setHomeWidgetPages([
      ['weather', 'app_chat', widgetId],
      ['app_gallery'],
      [],
      [],
      [],
    ])

    const result = store.applyCurrentHomeDesktopDefaults()

    expect(result.ok).toBe(true)
    expect(store.settings.appearance.customWidgets.some((widget) => widget.id === widgetId)).toBe(true)
    expect(store.settings.appearance.homeWidgetPages[0]).not.toContain('app_chat')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain(widgetId)
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_widgets')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_network')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_stock')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_assets')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_store')
    expect(store.settings.appearance.homeDesktopSetupVersion).toBe(9)
  })

  test('World Hub Home entry is user-managed instead of controlled by legacy toggles', () => {
    const store = useSystemStore()

    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_control_center')

    store.setMoreFeatureToggle('control_center', true)
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_control_center')

    store.setHomeWidgetPages([
      [],
      [],
      ['app_control_center', 'app_store'],
      [],
      [],
    ])
    expect(store.settings.appearance.homeWidgetPages[2]).toContain('app_control_center')
    expect(store.settings.appearance.homeWidgetPages[2]).toContain('app_store')

    store.setMoreFeatureToggle('control_center', false)
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_control_center')
  })

  test('persists neutral Home layout template choices per formal page', () => {
    const store = useSystemStore()

    expect(store.settings.appearance.homeLayoutTemplateIds).toHaveLength(5)
    expect(store.settings.appearance.homeLayoutSlotPlacements).toHaveLength(5)

    store.setHomeLayoutTemplate(2, 'layout-e')
    expect(store.settings.appearance.homeLayoutTemplateIds[2]).toBe('layout-e')

    store.setHomeLayoutTemplate(2, 'not-a-layout')
    expect(store.settings.appearance.homeLayoutTemplateIds[2]).toBe('layout-e')

    store.setHomeLayoutTemplate(7, 'layout-c')
    expect(store.settings.appearance.homeLayoutTemplateIds).toHaveLength(8)
    expect(store.settings.appearance.homeLayoutTemplateIds[7]).toBe('layout-c')

    store.resetHomeWidgetPages()
    expect(store.settings.appearance.homeLayoutTemplateIds).toHaveLength(5)
    expect(store.settings.appearance.homeLayoutTemplateIds).toContain(DEFAULT_HOME_LAYOUT_TEMPLATE_ID)
  })

  test('stores explicit Home slot placements without disabling recovery pages', () => {
    const store = useSystemStore()

    store.setHomeWidgetPages([['weather', 'music'], [], [], [], []])
    store.setHomeLayoutTemplate(0, 'layout-c')

    expect(store.setHomeLayoutSlotPlacement(0, 'c-wide', 'music')).toBe(true)
    expect(store.settings.appearance.homeWidgetPages[0]).toContain('music')
    expect(store.settings.appearance.homeLayoutSlotPlacements[0]).toContainEqual({
      slotId: 'c-wide',
      tileId: 'music',
    })

    store.setHomeLayoutTemplate(0, 'layout-e')
    expect(store.settings.appearance.homeWidgetPages[0]).not.toContain('music')
    expect(store.settings.appearance.homeLayoutSlotPlacements[0]).not.toContainEqual({
      slotId: 'c-wide',
      tileId: 'music',
    })

    expect(store.setHomeLayoutSlotPlacement(0, 'e-wide', 'music')).toBe(true)
    expect(store.settings.appearance.homeWidgetPages[0]).toContain('music')
    expect(store.clearHomeLayoutSlotPlacement(0, 'e-wide')).toBe(true)
    expect(store.settings.appearance.homeWidgetPages[0]).toContain('music')
    expect(store.settings.appearance.homeLayoutSlotPlacements[0]).not.toContainEqual({
      slotId: 'e-wide',
      tileId: 'music',
    })
  })

  test('rejects Home slot placements when content size does not match the slot', () => {
    const store = useSystemStore()

    store.setHomeWidgetPages([['app_gallery', 'music', 'weather'], [], [], [], []])
    store.setHomeLayoutTemplate(0, 'layout-c')

    expect(store.setHomeLayoutSlotPlacement(0, 'c-wide', 'app_gallery')).toBe(false)
    expect(store.settings.appearance.homeLayoutSlotPlacements[0]).not.toContainEqual({
      slotId: 'c-wide',
      tileId: 'app_gallery',
    })

    expect(store.setHomeLayoutSlotPlacement(0, 'c-small-1', 'app_gallery')).toBe(true)
    expect(store.setHomeLayoutSlotPlacement(0, 'c-top-left', 'weather')).toBe(true)
    expect(store.setHomeLayoutSlotPlacement(0, 'c-small-2', 'weather')).toBe(false)
    expect(store.settings.appearance.homeLayoutSlotPlacements[0]).toContainEqual({
      slotId: 'c-small-1',
      tileId: 'app_gallery',
    })
    expect(store.settings.appearance.homeLayoutSlotPlacements[0]).toContainEqual({
      slotId: 'c-top-left',
      tileId: 'weather',
    })
  })

  test('blocks invalid JSON and keeps previous state unchanged', () => {
    const store = useSystemStore()
    const beforeSnapshot = snapshotWidgetState(store)

    const result = store.importCustomWidgets('{invalid_json', 0)

    expect(result.ok).toBe(false)
    expect(result.importedCount).toBe(0)
    expect(result.errors[0]?.code).toBe('INVALID_JSON')
    expect(snapshotWidgetState(store)).toBe(beforeSnapshot)
  })

  test('blocks dangerous code and keeps previous state unchanged', () => {
    const store = useSystemStore()
    const beforeSnapshot = snapshotWidgetState(store)

    const result = store.importCustomWidgets(
      JSON.stringify([
        {
          name: 'Unsafe',
          size: '2x2',
          code: '<script>alert(1)</script>',
        },
      ]),
      1,
    )

    expect(result.ok).toBe(false)
    expect(result.importedCount).toBe(0)
    expect(result.errors[0]?.code).toBe('DANGEROUS_CODE')
    expect(snapshotWidgetState(store)).toBe(beforeSnapshot)
  })

  test('imports with unsupported fields ignored and warning returned', () => {
    const store = useSystemStore()
    const result = store.importCustomWidgets(
      JSON.stringify([
        {
          name: 'Widget B',
          size: '2x1',
          code: '<div>B</div>',
          action: { type: CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP, target: 'app_chat' },
          id: 'hack',
          foo: 'bar',
        },
      ]),
      0,
    )

    expect(result.ok).toBe(true)
    expect(result.importedCount).toBe(1)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]?.code).toBe('IGNORED_FIELDS')
    expect(store.settings.appearance.customWidgets.find((item) => item.id === result.importedIds[0])?.action).toEqual({
      type: CUSTOM_WIDGET_ACTION_TYPE_NONE,
      target: '',
    })
  })

  test('supports strip and poster custom widget sizes', () => {
    const store = useSystemStore()
    const result = store.importCustomWidgets(
      JSON.stringify([
        {
          name: 'Strip',
          size: '4x1',
          code: '<div>Strip</div>',
        },
        {
          name: 'Poster',
          size: '4x4',
          code: '<div>Poster</div>',
        },
      ]),
      null,
      { placeOnHome: false },
    )

    expect(result.ok).toBe(true)
    expect(result.importedCount).toBe(2)
    expect(store.settings.appearance.customWidgets.find((item) => item.id === result.importedIds[0])?.size).toBe('4x1')
    expect(store.settings.appearance.customWidgets.find((item) => item.id === result.importedIds[1])?.size).toBe('4x4')
  })

  test('places a 4x4 custom widget only into a 4x4 template slot', () => {
    const store = useSystemStore()
    const widgetId = store.addCustomWidget({
      name: 'Poster Widget',
      size: '4x4',
      code: '<div>Poster</div>',
      pageIndex: null,
      placeOnHome: false,
    })

    store.setHomeWidgetPages([[], [], [], [], []])
    store.setHomeLayoutTemplate(0, 'layout-g')

    expect(store.setHomeLayoutSlotPlacement(0, 'g-bottom-left', widgetId)).toBe(false)
    expect(store.setHomeLayoutSlotPlacement(0, 'g-poster', widgetId)).toBe(true)
    expect(store.settings.appearance.homeLayoutSlotPlacements[0]).toContainEqual({
      slotId: 'g-poster',
      tileId: widgetId,
    })
  })
})
