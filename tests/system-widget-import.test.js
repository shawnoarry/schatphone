import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

const snapshotWidgetState = (store) =>
  JSON.stringify({
    customWidgets: store.settings.appearance.customWidgets.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      code: item.code,
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
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_food_delivery')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_assets')

    store.setHomeWidgetPages([
      ['app_chat', 'app_files', 'weather'],
      ['app_more'],
    ])

    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_files')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_chat')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_shopping')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_food_delivery')
    expect(store.settings.appearance.homeWidgetPages.flat()).toContain('app_assets')
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
  })
})
