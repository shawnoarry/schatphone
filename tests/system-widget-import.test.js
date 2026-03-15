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
