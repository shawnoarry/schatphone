import { describe, expect, test } from 'vitest'
import {
  buildActiveWorldAppEntryRows,
  buildShoppingWorldAppFilterQuery,
  buildWorldAppEntryRows,
  buildWorldAppHomeTileId,
  buildWorldAppBindingRows,
  findWorldAppBindingForModule,
  isWorldAppHomeTileId,
  resolveWorldAppUxContext,
  resolveShoppingWorldAppContext,
} from '../src/lib/world-pack-app-bindings'
import { BUILT_IN_WORLD_PACKS, normalizeWorldPack } from '../src/lib/world-pack-schema'

const survivalPack = normalizeWorldPack(
  BUILT_IN_WORLD_PACKS.find((pack) => pack.id === 'survival_city'),
)
const fandomPack = normalizeWorldPack(
  BUILT_IN_WORLD_PACKS.find((pack) => pack.id === 'fandom_parallel'),
)

const createSystemStore = (activePack = survivalPack) => ({
  user: {
    activeWorldPackId: activePack.id,
    worldPacks: [activePack],
  },
  getActiveWorldPack() {
    return activePack
  },
})

describe('world pack app bindings', () => {
  test('builds launch rows for active pack app bindings', () => {
    const rows = buildWorldAppBindingRows({ pack: survivalPack })

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'survival_supply_board',
          title: '补给站',
          archetype: 'marketplace',
          moduleKey: 'shopping',
          route: '/shopping',
          targetLabel: 'Shopping',
          launchable: true,
          query: {
            worldPack: 'survival_city',
            worldApp: 'survival_supply_board',
          },
        }),
      ]),
    )
  })

  test('builds stable global app entries for active world app bindings', () => {
    const entries = buildWorldAppEntryRows({ pack: survivalPack })

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'world_app_survival_city_survival_supply_board',
          bindingId: 'survival_supply_board',
          entryKind: 'world_app',
          worldAppEntry: true,
          categoryEn: 'World',
          route: '/shopping',
          routeQuery: {
            worldPack: 'survival_city',
            worldApp: 'survival_supply_board',
          },
        }),
      ]),
    )
    expect(buildWorldAppHomeTileId({ packId: 'survival_city', bindingId: 'survival_supply_board' })).toBe(
      'world_app_survival_city_survival_supply_board',
    )
    expect(isWorldAppHomeTileId('world_app_survival_city_survival_supply_board')).toBe(true)
    expect(isWorldAppHomeTileId('app_shopping')).toBe(false)
  })

  test('resolves active system-store world app entries without mutating modules', () => {
    const entries = buildActiveWorldAppEntryRows({ systemStore: createSystemStore() })

    expect(entries.map((entry) => entry.id)).toContain('world_app_survival_city_survival_supply_board')
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          worldPackId: 'survival_city',
          moduleKey: 'shopping',
          targetLabel: 'Shopping',
        }),
      ]),
    )
  })

  test('builds active world app entries from multiple enabled packs', () => {
    const schoolPack = normalizeWorldPack({
      id: 'school_life',
      name: 'School life expansion',
      appBindings: [
        {
          id: 'school_schedule_board',
          archetype: 'reservation',
          title: 'Campus Schedule',
          moduleKey: 'calendar',
          route: '/calendar',
        },
      ],
    })
    const businessPack = normalizeWorldPack({
      id: 'business_family',
      name: 'Business family expansion',
      appBindings: [
        {
          id: 'business_office_feed',
          archetype: 'publication_feed',
          title: 'Family Office',
          moduleKey: 'chat',
          route: '/chat-contacts',
        },
      ],
    })

    const entries = buildActiveWorldAppEntryRows({
      systemStore: {
        listEnabledWorldPacks: () => [schoolPack, businessPack],
      },
    })

    expect(entries.map((entry) => entry.id)).toEqual([
      'world_app_school_life_school_schedule_board',
      'world_app_business_family_business_office_feed',
    ])
  })

  test('resolves target app context across enabled packs by route query', () => {
    const schoolPack = normalizeWorldPack({
      id: 'school_life',
      appBindings: [
        {
          id: 'school_schedule_board',
          archetype: 'reservation',
          title: 'Campus Schedule',
          moduleKey: 'calendar',
          route: '/calendar',
        },
      ],
    })

    const context = resolveWorldAppUxContext({
      systemStore: {
        listEnabledWorldPacks: () => [schoolPack],
      },
      moduleKey: 'calendar',
      expectedArchetypes: ['reservation'],
      routeQuery: {
        worldPack: 'school_life',
        worldApp: 'school_schedule_board',
      },
    })

    expect(context).toMatchObject({
      packId: 'school_life',
      bindingId: 'school_schedule_board',
      moduleKey: 'calendar',
    })
  })

  test('resolves the requested active Shopping marketplace binding', () => {
    const binding = findWorldAppBindingForModule({
      pack: survivalPack,
      moduleKey: 'shopping',
      routeQuery: {
        worldPack: 'survival_city',
        worldApp: 'survival_supply_board',
      },
    })

    expect(binding).toMatchObject({
      id: 'survival_supply_board',
      archetype: 'marketplace',
      moduleKey: 'shopping',
    })
  })

  test('ignores stale query params for another active pack', () => {
    expect(
      findWorldAppBindingForModule({
        pack: survivalPack,
        moduleKey: 'shopping',
        routeQuery: {
          worldPack: 'fandom_parallel',
          worldApp: 'survival_supply_board',
        },
      }),
    ).toBeNull()
  })

  test('resolves Shopping world context without mutating stores', () => {
    const systemStore = createSystemStore()

    const context = resolveShoppingWorldAppContext({
      systemStore,
      routeQuery: {
        worldPack: 'survival_city',
        worldApp: 'survival_supply_board',
      },
    })

    expect(context).toMatchObject({
      packId: 'survival_city',
      packTitle: '灾后生存都市',
      bindingId: 'survival_supply_board',
      bindingTitle: '补给站',
      serviceKey: 'daily_fresh',
      categoryKey: 'grocery',
    })
  })

  test('resolves generic World UX context for dispatch target apps', () => {
    const context = resolveWorldAppUxContext({
      systemStore: createSystemStore(),
      moduleKey: 'food_delivery',
      routeQuery: {
        worldPack: 'survival_city',
        worldApp: 'survival_dispatch',
      },
      expectedArchetypes: ['dispatch'],
    })

    expect(context).toMatchObject({
      packId: 'survival_city',
      bindingId: 'survival_dispatch',
      archetype: 'dispatch',
      moduleKey: 'food_delivery',
      route: '/food-delivery',
      routeQuery: {
        worldPack: 'survival_city',
        worldApp: 'survival_dispatch',
      },
      targetLabel: 'Food Delivery',
      uxPackage: {
        labels: true,
        terminology: true,
        accent: true,
        contextBanner: true,
        safeDefaults: true,
      },
    })
    expect(context.boundaryCopy).toContain('Food Delivery keeps its own records')
  })

  test('resolves generic World UX context for Calendar reservation target apps', () => {
    const context = resolveWorldAppUxContext({
      systemStore: createSystemStore(fandomPack),
      moduleKey: 'calendar',
      routeQuery: {
        worldPack: 'fandom_parallel',
        worldApp: 'fandom_schedule_board',
      },
      expectedArchetypes: ['reservation'],
    })

    expect(context).toMatchObject({
      packId: 'fandom_parallel',
      bindingId: 'fandom_schedule_board',
      archetype: 'reservation',
      moduleKey: 'calendar',
      route: '/calendar',
      routeQuery: {
        worldPack: 'fandom_parallel',
        worldApp: 'fandom_schedule_board',
      },
      targetLabel: 'Calendar',
      uxPackage: {
        labels: true,
        terminology: true,
        accent: true,
        contextBanner: true,
        safeDefaults: true,
      },
    })
    expect(context.boundaryCopy).toContain('Calendar keeps its own records')
  })

  test('resolves generic World UX context for Map transit target apps', () => {
    const context = resolveWorldAppUxContext({
      systemStore: createSystemStore(),
      moduleKey: 'map',
      routeQuery: {
        worldPack: 'survival_city',
        worldApp: 'survival_safe_route_pass',
      },
      expectedArchetypes: ['transit'],
    })

    expect(context).toMatchObject({
      packId: 'survival_city',
      bindingId: 'survival_safe_route_pass',
      archetype: 'transit',
      moduleKey: 'map',
      route: '/map',
      routeQuery: {
        worldPack: 'survival_city',
        worldApp: 'survival_safe_route_pass',
      },
      targetLabel: 'Map',
      uxPackage: {
        labels: true,
        terminology: true,
        accent: true,
        contextBanner: true,
        safeDefaults: true,
      },
    })
    expect(context.boundaryCopy).toContain('Map keeps its own records')
  })

  test('rejects non-transit bindings for Map-specific transit contexts', () => {
    expect(
      resolveWorldAppUxContext({
        systemStore: createSystemStore(),
        moduleKey: 'map',
        routeQuery: {
          worldPack: 'survival_city',
          worldApp: 'survival_safe_route_pass',
        },
        expectedArchetypes: ['reservation'],
      }),
    ).toBeNull()
  })

  test('builds a route-only filter query for Shopping world context', () => {
    const context = resolveShoppingWorldAppContext({
      systemStore: createSystemStore(),
      routeQuery: {
        worldPack: 'survival_city',
        worldApp: 'survival_supply_board',
      },
    })

    expect(
      buildShoppingWorldAppFilterQuery({
        context,
        currentQuery: {
          source: 'worldbook',
        },
      }),
    ).toEqual({
      source: 'worldbook',
      worldPack: 'survival_city',
      worldApp: 'survival_supply_board',
      service: 'daily_fresh',
      category: 'grocery',
    })
  })

  test('does not resolve disabled or non-marketplace Shopping bindings', () => {
    const disabledPack = normalizeWorldPack({
      id: 'quiet_pack',
      appBindings: [
        {
          id: 'quiet_shop',
          archetype: 'marketplace',
          moduleKey: 'shopping',
          title: 'Quiet Shop',
          enabled: false,
        },
      ],
    })

    expect(
      resolveShoppingWorldAppContext({
        systemStore: createSystemStore(disabledPack),
        routeQuery: {
          worldPack: 'quiet_pack',
          worldApp: 'quiet_shop',
        },
      }),
    ).toBeNull()
  })
})
