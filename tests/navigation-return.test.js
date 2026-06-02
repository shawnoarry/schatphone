import { describe, expect, test } from 'vitest'
import { buildWorldBookRouteQuery } from '../src/lib/worldbook-navigation'
import {
  buildHomeSourceQuery,
  buildReturnSourceQuery,
  buildRouteWithReturnSource,
  normalizeHomePageQuery,
  resolveReturnLabel,
  resolveReturnTarget,
} from '../src/lib/navigation-return'

describe('navigation return helpers', () => {
  test('preserves explicit Home and Settings sources', () => {
    expect(buildRouteWithReturnSource('/appearance', 'settings')).toEqual({
      path: '/appearance',
      query: { from: 'settings' },
    })

    expect(resolveReturnTarget({ query: { from: 'settings' } }, '/home')).toBe('/settings')
    expect(resolveReturnLabel({ query: { from: 'settings' } }, 'Home')).toBe('Settings')
    expect(resolveReturnTarget({ query: { from: 'home' } }, '/settings')).toBe('/home')
    expect(resolveReturnLabel({ query: { from: 'home' } }, 'Settings')).toBe('Home')
  })

  test('preserves Home page context for WorldBook module deep links', () => {
    expect(
      buildWorldBookRouteQuery({
        source: 'map',
        homePage: '2',
        pointIds: ['route-memory'],
      }),
    ).toEqual({
      source: 'map',
      homePage: '2',
      entry: 'route-memory',
      point: 'route-memory',
    })
  })

  test('preserves Home page context across return targets', () => {
    expect(normalizeHomePageQuery(' 2 ')).toBe('2')
    expect(normalizeHomePageQuery(-1)).toBe('')
    expect(normalizeHomePageQuery('2.5')).toBe('')

    expect(buildHomeSourceQuery(2, { category: 'nearby' })).toEqual({
      category: 'nearby',
      from: 'home',
      homePage: '2',
    })

    expect(buildRouteWithReturnSource('/widgets', 'home', { homePage: 2 })).toEqual({
      path: '/widgets',
      query: { homePage: '2', from: 'home' },
    })

    expect(resolveReturnTarget({ query: { from: 'home', homePage: '2' } }, '/settings')).toEqual({
      path: '/home',
      query: { homePage: '2' },
    })
  })

  test('keeps ancestor Home page when returning from Settings-owned pages', () => {
    expect(buildReturnSourceQuery('settings', { query: { from: 'home', homePage: '1' } })).toEqual({
      from: 'settings',
      homePage: '1',
    })

    expect(resolveReturnTarget({ query: { from: 'settings', homePage: '1' } }, '/home')).toEqual({
      path: '/settings',
      query: { from: 'home', homePage: '1' },
    })
  })

  test('uses cross-module source when no explicit shell source exists', () => {
    expect(resolveReturnTarget({ query: { source: 'chat' } }, '/settings')).toBe('/chat')
    expect(resolveReturnLabel({ query: { source: 'chat' } }, 'Settings')).toBe('Chat')
    expect(resolveReturnTarget({ query: { source: ' Map ' } }, '/settings')).toBe('/map')
    expect(resolveReturnLabel({ query: { source: 'calendar' } }, 'Settings')).toBe('Calendar')
  })
})
