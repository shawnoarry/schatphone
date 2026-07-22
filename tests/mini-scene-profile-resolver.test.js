import { describe, expect, test } from 'vitest'
import { resolveMiniSceneProfile } from '../src/lib/mini-scene-profile-resolver'
import { validateMiniSceneTransformProfile } from '../src/lib/mini-scene-transform-profile'

const createProfile = ({ profileId, worldScopes, moduleKeys = ['calendar'], sceneTypes = ['schedule.music_show_day'] }) =>
  validateMiniSceneTransformProfile({
    type: 'schatphone.mini_scene_transform_profile',
    schemaVersion: 1,
    profileId,
    worldScopes,
    appliesTo: { moduleKeys, sceneTypes },
    contentDimensions: [],
    templateId: `${profileId}.template`,
    rules: [],
  }).profile

const KPOP_SCOPE = {
  kind: 'book_worldview',
  id: 'built_in_modern_seoul_kpop_main_worldview',
}

describe('mini scene profile resolver', () => {
  test('prefers an explicit main-worldview binding and preserves explicit dimension choices', () => {
    const kpop = createProfile({ profileId: 'kpop.v1', worldScopes: [KPOP_SCOPE] })
    const manual = createProfile({
      profileId: 'manual.v1',
      worldScopes: [{ kind: 'manual', id: 'my_world' }],
    })
    const result = resolveMiniSceneProfile({
      profiles: [manual, kpop],
      bindings: [
        {
          id: 'manual_binding',
          profileId: 'manual.v1',
          scope: { kind: 'manual', id: 'my_world' },
          active: true,
        },
        {
          id: 'kpop_binding',
          profileId: 'kpop.v1',
          scope: KPOP_SCOPE,
          active: true,
          contentDimensionChoices: {
            romance: 'include',
            sensitive: 'unconfigured',
          },
        },
      ],
      worldContext: {
        mainWorldviewAssetId: KPOP_SCOPE.id,
        manualScopeId: 'my_world',
        activeWorldPackId: 'fandom_parallel',
      },
      acceptedWorldPackProfileIds: ['pack.v1'],
      moduleKey: 'calendar',
      sceneType: 'schedule.music_show_day',
    })

    expect(result).toMatchObject({
      kind: 'book_worldview',
      reason: 'explicit_book_worldview',
      profile: { profileId: 'kpop.v1' },
      binding: { id: 'kpop_binding' },
      contentDimensionChoices: { romance: 'include' },
    })
  })

  test('uses an explicit manual scope for a custom world without a World Pack', () => {
    const profile = createProfile({
      profileId: 'custom_world.v1',
      worldScopes: [{ kind: 'manual', id: 'custom_world' }],
    })
    const result = resolveMiniSceneProfile({
      profiles: [profile],
      bindings: [
        {
          id: 'custom_binding',
          profileId: 'custom_world.v1',
          scope: { kind: 'manual', id: 'custom_world' },
          active: true,
        },
      ],
      worldContext: { manualScopeId: 'custom_world' },
      moduleKey: 'calendar',
      sceneType: 'schedule.music_show_day',
    })

    expect(result).toMatchObject({
      kind: 'manual',
      reason: 'explicit_manual',
      profile: { profileId: 'custom_world.v1' },
    })
  })

  test('resolves only explicitly accepted active World Pack profile references', () => {
    const profileA = createProfile({
      profileId: 'pack_b.v1',
      worldScopes: [{ kind: 'world_pack', id: 'fandom_parallel' }],
    })
    const profileB = createProfile({
      profileId: 'pack_a.v1',
      worldScopes: [{ kind: 'world_pack', id: 'fandom_parallel' }],
    })
    const result = resolveMiniSceneProfile({
      profiles: [profileA, profileB],
      bindings: [
        {
          id: 'pack_binding',
          profileId: 'pack_a.v1',
          scope: { kind: 'world_pack', id: 'fandom_parallel' },
          active: true,
          contentDimensionChoices: { backstage_tension: 'include' },
        },
      ],
      worldContext: { activeWorldPackId: 'fandom_parallel' },
      acceptedWorldPackProfileIds: ['pack_b.v1', 'pack_a.v1'],
      moduleKey: 'calendar',
      sceneType: 'schedule.music_show_day',
    })

    expect(result).toMatchObject({
      kind: 'world_pack',
      reason: 'accepted_world_pack',
      profile: { profileId: 'pack_a.v1' },
      binding: { id: 'pack_binding' },
      contentDimensionChoices: { backstage_tension: 'include' },
    })
  })

  test('fails closed to neutral when an explicit binding is missing or incompatible', () => {
    const packProfile = createProfile({
      profileId: 'pack.v1',
      worldScopes: [{ kind: 'world_pack', id: 'fandom_parallel' }],
    })
    const missing = resolveMiniSceneProfile({
      profiles: [packProfile],
      bindings: [
        {
          id: 'missing_binding',
          profileId: 'missing.v1',
          scope: KPOP_SCOPE,
          active: true,
        },
      ],
      worldContext: {
        mainWorldviewAssetId: KPOP_SCOPE.id,
        activeWorldPackId: 'fandom_parallel',
      },
      acceptedWorldPackProfileIds: ['pack.v1'],
      moduleKey: 'calendar',
      sceneType: 'schedule.music_show_day',
    })

    expect(missing).toMatchObject({
      kind: 'neutral',
      reason: 'binding_profile_missing',
      profile: null,
    })

    const incompatibleProfile = createProfile({
      profileId: 'map_only.v1',
      worldScopes: [KPOP_SCOPE],
      moduleKeys: ['map'],
      sceneTypes: ['trip.arrival'],
    })
    const incompatible = resolveMiniSceneProfile({
      profiles: [incompatibleProfile],
      bindings: [
        {
          id: 'map_binding',
          profileId: 'map_only.v1',
          scope: KPOP_SCOPE,
          active: true,
        },
      ],
      worldContext: { mainWorldviewAssetId: KPOP_SCOPE.id },
      moduleKey: 'calendar',
      sceneType: 'schedule.music_show_day',
    })

    expect(incompatible).toMatchObject({
      kind: 'neutral',
      reason: 'binding_profile_incompatible',
      profile: null,
    })
  })

  test('uses neutral behavior when no explicit profile applies', () => {
    expect(
      resolveMiniSceneProfile({
        profiles: [],
        bindings: [],
        worldContext: { mainWorldviewAssetId: 'user_world' },
        moduleKey: 'calendar',
        sceneType: 'schedule.music_show_day',
      }),
    ).toEqual({
      kind: 'neutral',
      reason: 'no_explicit_profile',
      profile: null,
      binding: null,
      contentDimensionChoices: {},
    })
  })
})
