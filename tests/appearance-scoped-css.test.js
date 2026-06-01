import { describe, expect, test } from 'vitest'
import {
  SCOPED_CUSTOM_CSS_KEYS,
  buildScopedCustomCss,
  normalizeScopedCustomCss,
  scopeCssToSelector,
} from '../src/lib/appearance-scoped-css'
import {
  buildAppSkinCss,
  normalizeAppSkinSettings,
  resolveAppSkinTargetForAppId,
} from '../src/lib/app-skin-customization'

describe('appearance scoped CSS helpers', () => {
  test('normalizes scoped custom CSS state with stable scope tokens', () => {
    const normalized = normalizeScopedCustomCss({
      app: {
        enabled: true,
        target: 'Food Delivery',
        css: '.screen { color: red; }',
      },
      worldApp: {
        enabled: 'yes',
        worldPack: 'Survival City',
        worldApp: 'Dispatch Board',
        css: 42,
      },
    })

    expect(normalized[SCOPED_CUSTOM_CSS_KEYS.APP]).toEqual({
      enabled: true,
      target: 'food_delivery',
      css: '.screen { color: red; }',
    })
    expect(normalized[SCOPED_CUSTOM_CSS_KEYS.WORLD_APP]).toEqual({
      enabled: false,
      worldPack: 'survival_city',
      worldApp: 'dispatch_board',
      css: '',
    })
  })

  test('prefixes ordinary selectors and scoping at-rules', () => {
    const scoped = scopeCssToSelector(
      '.screen, .hero:is(.active, .ready) { color: red; }\n@media (max-width: 640px) { .screen { color: blue; } }',
      '[data-app="food_delivery"]',
    )

    expect(scoped).toContain('[data-app="food_delivery"] .screen')
    expect(scoped).toContain('[data-app="food_delivery"] .hero:is(.active, .ready)')
    expect(scoped).toContain('@media (max-width: 640px)')
    expect(scoped).toContain('[data-app="food_delivery"] .screen { color: blue; }')
  })

  test('wraps declaration-only CSS in the selected shell scope', () => {
    expect(scopeCssToSelector('--accent-color: #f59e0b;', '[data-app="shopping"]')).toBe(
      '[data-app="shopping"] {\n--accent-color: #f59e0b;\n}',
    )
  })

  test('builds app and world-app scoped CSS layers', () => {
    const css = buildScopedCustomCss({
      app: {
        enabled: true,
        target: 'food-delivery',
        css: '.screen { color: red; }',
      },
      worldApp: {
        enabled: true,
        worldPack: 'survival_city',
        worldApp: 'survival_dispatch',
        css: '.hero { color: orange; }',
      },
    })

    expect(css).toContain('[data-app="food_delivery"] .screen')
    expect(css).toContain(
      '[data-world-pack="survival_city"][data-world-app="survival_dispatch"] .hero',
    )
  })

  test('keeps world-app CSS narrower and later than app-scoped CSS', () => {
    const css = buildScopedCustomCss({
      app: {
        enabled: true,
        target: 'food_delivery',
        css: '.world-banner { --accent: orange; }',
      },
      worldApp: {
        enabled: true,
        worldPack: 'default_world',
        worldApp: 'default_world_dispatch_board',
        css: '.world-banner { --accent: skyblue; }',
      },
    })

    const appSelector = '[data-app="food_delivery"] .world-banner'
    const worldAppSelector =
      '[data-world-pack="default_world"][data-world-app="default_world_dispatch_board"] .world-banner'
    expect(css).toContain(appSelector)
    expect(css).toContain(worldAppSelector)
    expect(css.indexOf(worldAppSelector)).toBeGreaterThan(css.indexOf(appSelector))
  })

  test('builds independent app skin CSS layers per route scope', () => {
    const css = buildAppSkinCss({
      food_delivery: {
        presetId: 'market_fresh',
        customCssEnabled: true,
        customCss: '.store-card { border-radius: 18px; }',
      },
      shopping: {
        presetId: 'catalog_clean',
        customCssEnabled: true,
        customCss: '.shop-card { border-color: teal; }',
      },
    })

    expect(css).toContain('[data-app="food_delivery"]')
    expect(css).toContain('[data-app="food_delivery"] .store-card')
    expect(css).toContain('[data-app="shopping"]')
    expect(css).toContain('[data-app="shopping"] .shop-card')
    expect(css).not.toContain('[data-app="food_delivery"] .shop-card')
  })

  test('normalizes app skin settings and maps App Store entries to route scopes', () => {
    expect(resolveAppSkinTargetForAppId('app_food_delivery')).toMatchObject({
      appId: 'app_food_delivery',
      scope: 'food_delivery',
    })
    expect(resolveAppSkinTargetForAppId('app_chat')).toBeNull()

    expect(
      normalizeAppSkinSettings({
        food_delivery: {
          presetId: 'market_fresh',
          customCssEnabled: 'yes',
          customCss: '.food { color: tomato; }',
        },
        unsupported_app: {
          presetId: 'market_fresh',
          customCssEnabled: true,
          customCss: '.x { color: red; }',
        },
      }),
    ).toEqual({
      food_delivery: {
        presetId: 'market_fresh',
        customCssEnabled: false,
        customCss: '.food { color: tomato; }',
      },
    })
  })
})
