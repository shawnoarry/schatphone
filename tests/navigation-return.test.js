import { describe, expect, test } from 'vitest'
import { buildWorldBookRouteQuery } from '../src/lib/worldbook-navigation'
import {
  buildChatReturnSourceQuery,
  buildContactsChatSourceQuery,
  buildHomeSourceQuery,
  buildReturnSourceQuery,
  buildRouteWithReturnSource,
  normalizeChatThreadIdQuery,
  normalizeContactsProfileIdQuery,
  normalizeHomePageQuery,
  resolveContactsReturnTarget,
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
    expect(resolveReturnTarget({ query: { source: 'map', homePage: '2' } }, '/settings')).toEqual({
      path: '/map',
      query: { from: 'home', homePage: '2' },
    })
    expect(resolveReturnLabel({ query: { source: 'calendar' } }, 'Settings')).toBe('Calendar')
    expect(resolveReturnTarget({ query: { source: 'map-settings' } }, '/home')).toBe('/map/settings')
    expect(resolveReturnLabel({ query: { source: 'map-settings' } }, 'Home')).toBe('Map settings')
    expect(resolveReturnTarget({ query: { source: 'worldbook' } }, '/home')).toBe('/worldbook')
    expect(resolveReturnLabel({ query: { source: 'worldbook' } }, 'Home')).toBe('WorldBook')
  })

  test('returns Network to one validated Chat thread while preserving the ancestor Home page', () => {
    expect(normalizeChatThreadIdQuery(' 12 ')).toBe('12')
    expect(normalizeChatThreadIdQuery(4)).toBe('4')
    expect(normalizeChatThreadIdQuery(0)).toBe('')
    expect(normalizeChatThreadIdQuery('../settings')).toBe('')
    expect(normalizeChatThreadIdQuery('https://example.test')).toBe('')

    expect(
      buildChatReturnSourceQuery({ query: { from: 'home', homePage: '2' } }, 12, {
        reportModule: 'chat',
      }),
    ).toEqual({
      reportModule: 'chat',
      source: 'chat',
      chatId: '12',
      homePage: '2',
    })

    expect(
      resolveReturnTarget({ query: { source: 'chat', chatId: '12', homePage: '2' } }, '/home'),
    ).toEqual({
      path: '/chat/12',
      query: { from: 'home', homePage: '2' },
    })
  })

  test('does not treat an invalid Chat return value as a redirect target', () => {
    expect(
      buildChatReturnSourceQuery({ query: { homePage: '1' } }, 'javascript:alert(1)'),
    ).toEqual({})
    expect(
      resolveReturnTarget(
        { query: { source: 'chat', chatId: 'https://example.test/steal', homePage: '1' } },
        '/home',
      ),
    ).toBe('/chat')
  })

  test('keeps Contacts profile context bounded across Chat and Network', () => {
    expect(normalizeContactsProfileIdQuery(' 17 ')).toBe('17')
    expect(normalizeContactsProfileIdQuery(['22', '23'])).toBe('22')
    expect(normalizeContactsProfileIdQuery(0)).toBe('')
    expect(normalizeContactsProfileIdQuery('../settings')).toBe('')
    expect(normalizeContactsProfileIdQuery(Number.MAX_SAFE_INTEGER + 1)).toBe('')

    expect(buildContactsChatSourceQuery(17)).toEqual({
      source: 'contacts',
      profileId: '17',
    })
    expect(
      resolveContactsReturnTarget({ query: { source: 'contacts', profileId: '17' } }),
    ).toEqual({
      path: '/contacts',
      query: { profileId: '17' },
    })

    expect(
      buildChatReturnSourceQuery(
        { query: { source: 'contacts', profileId: '17' } },
        31,
      ),
    ).toEqual({
      source: 'chat',
      chatId: '31',
      from: 'contacts',
      profileId: '17',
    })
    expect(
      resolveReturnTarget({
        query: { source: 'chat', chatId: '31', from: 'contacts', profileId: '17' },
      }),
    ).toEqual({
      path: '/chat/31',
      query: { source: 'contacts', profileId: '17' },
    })
  })

  test('discards invalid Contacts context instead of accepting a redirect value', () => {
    expect(buildContactsChatSourceQuery('https://example.test/steal')).toEqual({})
    expect(
      resolveContactsReturnTarget({
        query: { source: 'contacts', profileId: 'javascript:alert(1)' },
      }),
    ).toBeNull()
    expect(
      buildChatReturnSourceQuery(
        { query: { source: 'contacts', profileId: '../settings' } },
        31,
      ),
    ).toEqual({ source: 'chat', chatId: '31' })
    expect(
      resolveReturnTarget({
        query: { source: 'chat', chatId: '31', from: 'contacts', profileId: '/settings' },
      }),
    ).toEqual({ path: '/chat/31' })
  })
})
