import { describe, expect, test } from 'vitest'
import {
  buildShoppingWorldAppFilterQuery,
  buildWorldAppBindingRows,
  findWorldAppBindingForModule,
  resolveShoppingWorldAppContext,
} from '../src/lib/world-pack-app-bindings'
import { BUILT_IN_WORLD_PACKS, normalizeWorldPack } from '../src/lib/world-pack-schema'

const survivalPack = normalizeWorldPack(
  BUILT_IN_WORLD_PACKS.find((pack) => pack.id === 'survival_city'),
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

