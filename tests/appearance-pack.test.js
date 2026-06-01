import { describe, expect, test } from 'vitest'
import {
  APPEARANCE_PACK_KIND,
  buildAppearancePack,
  mergeAppearancePackIntoAppearance,
  normalizeAppearancePack,
} from '../src/lib/appearance-pack'

describe('appearance pack schema', () => {
  test('exports only portable visual appearance fields', () => {
    const pack = buildAppearancePack({
      currentTheme: 'zen',
      wallpaperMode: 'url',
      wallpaper: 'https://example.com/wallpaper.jpg',
      customCss: '.app-shell { color: red; }',
      scopedCustomCss: {
        app: {
          enabled: true,
          target: 'contacts',
          css: '.screen { color: blue; }',
        },
      },
      customVars: {
        '--app-font-family': '"Noto Sans SC", sans-serif',
      },
      appIconOverrides: {
        chat: { preset: 'glass', accent: 'blue' },
      },
      customWidgets: [{ id: 'do_not_export' }],
      homeWidgetPages: [['app_chat']],
      chat: { wallpaper: 'do_not_export' },
    })

    expect(pack.kind).toBe(APPEARANCE_PACK_KIND)
    expect(pack.appearance).toMatchObject({
      currentTheme: 'zen',
      wallpaperMode: 'url',
      customCss: '.app-shell { color: red; }',
      customVars: {
        '--app-font-family': '"Noto Sans SC", sans-serif',
      },
    })
    expect(pack.appearance.scopedCustomCss).toBeUndefined()
    expect(pack.appearance.appIconOverrides).toBeUndefined()
    expect(pack.appearance.customWidgets).toBeUndefined()
    expect(pack.appearance.homeWidgetPages).toBeUndefined()
    expect(pack.appearance.chat).toBeUndefined()
  })

  test('normalizes full packs and raw appearance payloads', () => {
    expect(
      normalizeAppearancePack({
        kind: APPEARANCE_PACK_KIND,
        name: 'Shared shell',
        appearance: {
          currentTheme: 'zen',
          customCss: '.shell { color: teal; }',
        },
      }),
    ).toMatchObject({
      ok: true,
      pack: {
        name: 'Shared shell',
        appearance: {
          currentTheme: 'zen',
          customCss: '.shell { color: teal; }',
        },
      },
    })

    expect(
      normalizeAppearancePack({
        customCss: '.raw { color: purple; }',
      }),
    ).toMatchObject({
      ok: true,
      pack: {
        name: 'Imported appearance pack',
        appearance: {
          customCss: '.raw { color: purple; }',
        },
      },
    })
  })

  test('merges an imported pack without replacing non-pack appearance data', () => {
    const result = mergeAppearancePackIntoAppearance(
      {
        scopedCustomCss: {
          app: {
            enabled: true,
            target: 'shopping',
            css: '.shopping { color: gold; }',
          },
        },
        appIconOverrides: {
          app_chat: {
            icon: 'fas fa-comment',
            accent: 'warm',
          },
        },
        customWidgets: [{ id: 'keep_widget' }],
        homeWidgetPages: [['app_contacts']],
        chat: { bubbleStyle: 'compact' },
      },
      {
        appearance: {
          currentTheme: 'zen',
          customCss: '.imported { color: green; }',
          scopedCustomCss: {
            app: {
              enabled: true,
              target: 'map',
              css: '.map { color: cyan; }',
            },
          },
          appIconOverrides: {
            app_chat: {
              icon: 'fas fa-star',
              accent: 'dark',
            },
          },
        },
      },
    )

    expect(result.ok).toBe(true)
    expect(result.appearance).toMatchObject({
      currentTheme: 'zen',
      customCss: '.imported { color: green; }',
      customWidgets: [{ id: 'keep_widget' }],
      homeWidgetPages: [['app_contacts']],
      chat: { bubbleStyle: 'compact' },
    })
    expect(result.appearance.scopedCustomCss).toMatchObject({
      app: {
        enabled: true,
        target: 'shopping',
        css: '.shopping { color: gold; }',
      },
    })
    expect(result.appearance.appIconOverrides).toMatchObject({
      app_chat: {
        icon: 'fas fa-comment',
        accent: 'warm',
      },
    })
  })
})
