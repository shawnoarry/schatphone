import { describe, expect, test } from 'vitest'
import { createMiniSceneModuleRegistry } from '../src/lib/mini-scene-module-registry'

const buildRequest = (overrides = {}) => {
  const { source: sourceOverrides = {}, ...requestOverrides } = overrides
  return {
    requestId: 'request_1',
    source: {
      moduleKey: 'calendar',
      recordId: 'event_1',
      route: '/calendar',
      ...sourceOverrides,
    },
    sceneType: 'schedule.music_show_day',
    ...requestOverrides,
  }
}

describe('mini scene module registry', () => {
  test('starts empty and lists only modules explicitly registered by source adapters', () => {
    const registry = createMiniSceneModuleRegistry()

    expect(registry.list()).toEqual([])
    expect(registry.get('calendar')).toBeNull()
  })

  test('normalizes registrations, strips unknown fields, and lists them deterministically', () => {
    const registry = createMiniSceneModuleRegistry()
    registry.register({
      moduleKey: 'Map',
      labelZh: '地图',
      labelEn: 'Map',
      route: '/map',
      sceneTypes: ['trip.arrival'],
      supportedModes: ['interactive_html', 'text', 'unknown'],
      trigger: () => 'must not escape',
    })
    const calendarResult = registry.register({
      moduleKey: 'Calendar',
      labelZh: '日历',
      labelEn: 'Calendar',
      route: '/calendar',
      sceneTypes: ['schedule.music_show_day'],
      supportedModes: ['text'],
    })

    expect(calendarResult.ok).toBe(true)
    expect(registry.list().map((entry) => entry.moduleKey)).toEqual(['calendar', 'map'])
    expect(registry.get('map')).toEqual({
      moduleKey: 'map',
      labelZh: '地图',
      labelEn: 'Map',
      route: '/map',
      sceneTypes: ['trip.arrival'],
      supportedModes: ['interactive_html', 'text'],
    })
    expect(registry.get('map').trigger).toBeUndefined()
  })

  test('rejects duplicate or incomplete registrations with stable codes', () => {
    const registry = createMiniSceneModuleRegistry([
      {
        moduleKey: 'calendar',
        route: '/calendar',
        sceneTypes: ['schedule.music_show_day'],
      },
    ])

    expect(
      registry.register({
        moduleKey: 'calendar',
        route: '/calendar',
        sceneTypes: ['schedule.other'],
      }),
    ).toMatchObject({
      ok: false,
      errors: [{ code: 'MINI_SCENE_MODULE_DUPLICATE', path: 'moduleKey' }],
    })
    expect(
      registry.register({ moduleKey: 'unsafe', route: 'javascript:alert(1)', sceneTypes: [] }),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        { code: 'MINI_SCENE_MODULE_INVALID', path: 'route' },
        { code: 'MINI_SCENE_MODULE_INVALID', path: 'sceneTypes' },
      ]),
    })
  })

  test('validates source identity, registered scene type, and registered route', () => {
    const registry = createMiniSceneModuleRegistry([
      {
        moduleKey: 'calendar',
        route: '/calendar',
        sceneTypes: ['schedule.music_show_day'],
        supportedModes: ['text', 'interactive_html'],
      },
    ])

    expect(registry.validateRequest(buildRequest())).toMatchObject({
      ok: true,
      registration: {
        moduleKey: 'calendar',
        route: '/calendar',
      },
    })
    expect(
      registry.validateRequest(buildRequest({ source: { moduleKey: 'map', route: '/map' } })),
    ).toMatchObject({
      ok: false,
      errors: [{ code: 'MINI_SCENE_MODULE_NOT_REGISTERED', path: 'source.moduleKey' }],
    })
    expect(registry.validateRequest(buildRequest({ sceneType: 'schedule.invented' }))).toMatchObject({
      ok: false,
      errors: [{ code: 'MINI_SCENE_SCENE_TYPE_UNSUPPORTED', path: 'sceneType' }],
    })
    expect(
      registry.validateRequest(buildRequest({ source: { moduleKey: 'calendar', route: '/map' } })),
    ).toMatchObject({
      ok: false,
      errors: [{ code: 'MINI_SCENE_SOURCE_ROUTE_MISMATCH', path: 'source.route' }],
    })
  })

  test('does not expose mutable registry state through returned entries', () => {
    const registry = createMiniSceneModuleRegistry([
      {
        moduleKey: 'calendar',
        route: '/calendar',
        sceneTypes: ['schedule.music_show_day'],
      },
    ])
    const entry = registry.get('calendar')
    entry.sceneTypes.push('schedule.injected')

    expect(registry.get('calendar').sceneTypes).toEqual(['schedule.music_show_day'])
    expect(registry.unregister('calendar')).toBe(true)
    expect(registry.list()).toEqual([])
  })
})
