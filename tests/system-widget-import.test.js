import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  CUSTOM_WIDGET_ACTION_TYPE_NONE,
  CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP,
  CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM,
} from '../src/lib/custom-widget-actions'
import { DEFAULT_HOME_LAYOUT_TEMPLATE_ID } from '../src/lib/home-layout-templates'
import { useSystemStore } from '../src/stores/system'

const snapshotWidgetState = (store) =>
  JSON.stringify({
    customWidgets: store.settings.appearance.customWidgets.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      code: item.code,
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

  test('hides Files from default and restored Home layouts', () => {
    const store = useSystemStore()

    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_files')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_shopping')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_reminders')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_food_delivery')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_assets')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_control_center')

    store.setHomeWidgetPages([
      ['app_chat', 'app_files', 'weather', 'app_control_center'],
      ['app_more'],
    ])

    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_files')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_control_center')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_chat')
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
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_network')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_chat')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_gallery')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_widgets')
  })

  test('runtime control toggle restores and removes the optional World Hub Home entry', () => {
    const store = useSystemStore()

    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_control_center')

    store.setMoreFeatureToggle('control_center', true)
    expect(store.settings.appearance.homeWidgetPages[1]).toContain('app_control_center')
    expect(store.settings.appearance.homeWidgetPages[1].indexOf('app_control_center')).toBeLessThan(
      store.settings.appearance.homeWidgetPages[1].indexOf('app_more'),
    )

    store.setMoreFeatureToggle('control_center', false)
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_control_center')
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
    expect(store.settings.appearance.homeWidgetPages[0]).toContain('music')
    expect(store.settings.appearance.homeLayoutSlotPlacements[0]).not.toContainEqual({
      slotId: 'c-wide',
      tileId: 'music',
    })

    expect(store.setHomeLayoutSlotPlacement(0, 'e-wide', 'music')).toBe(true)
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
