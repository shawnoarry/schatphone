# Appearance Global Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Appearance a global phone customization center by removing app-identity, Widget Center, and app/world-app scoped CSS ownership from the Appearance surface and appearance-pack format.

**Architecture:** Keep existing global Appearance capabilities in `AppearanceView.vue`: theme, wallpaper, lock clock, font stack, status bar, haptics, Today View, Home layout preview, global CSS, and global appearance-pack import/export. Move app-owned concepts out by removing App Icons, Widget Center, and scoped CSS authoring from the page, while preserving the underlying scoped CSS state for upcoming app-owned editors. Update `appearance-pack.js` so global packs ignore and preserve legacy app icon/scoped CSS fields instead of exporting or importing them.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils, JavaScript ES modules.

---

## Scope Check

This plan implements Package 2 from `docs/superpowers/specs/2026-06-01-appearance-app-store-food-design.md`.

Out of scope:

- Moving app icon customization into App Store. That belongs to Package 3.
- Creating per-app skin editors. That belongs to Package 4.
- Removing the underlying `settings.appearance.scopedCustomCss` state. It remains available for future app-owned editors and old persisted state.
- Changing Chat Appearance. Chat keeps owning its own appearance page.
- Food Delivery UI work.

## File Structure

- Modify `tests/appearance-pack.test.js`
  - Assert global appearance packs exclude `scopedCustomCss` and `appIconOverrides`.
  - Assert legacy imports with scoped/app icon fields preserve current app-owned state instead of importing those fields.
- Modify `tests/appearance-wallpaper-picker.test.js`
  - Assert Appearance root no longer shows App Icons or Widget Center as main cards.
  - Assert the global CSS sheet no longer exposes App/World App scoped CSS controls.
  - Assert Appearance pack export/import excludes scoped CSS and app icons while preserving existing app-owned state.
  - Assert font wording still describes a CSS font-family stack, not a font-file import.
- Modify `src/lib/appearance-pack.js`
  - Remove app-icon and scoped-CSS fields from the appearance-pack schema.
  - Keep raw/global pack detection working for supported global fields.
  - Preserve current non-pack appearance data during merges.
- Modify `src/views/AppearanceView.vue`
  - Remove App Icons imports, computed state, actions, root menu card, page title branch, and icon subpage template.
  - Remove Widget Center root actions and router helper.
  - Remove App/World App scoped CSS controls from the Advanced CSS sheet.
  - Rename the remaining CSS copy to "Global CSS".
  - Update Appearance Pack copy to describe global theme/wallpaper/font/global CSS only.
- Modify `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
  - Record that Appearance is now global-only and that app identity/skins move to upcoming App Store/app-owned slices.

---

### Task 1: Add Failing Package 2 Tests

**Files:**
- Modify: `tests/appearance-pack.test.js`
- Modify: `tests/appearance-wallpaper-picker.test.js`

- [ ] **Step 1: Update `tests/appearance-pack.test.js` export expectations**

In `exports only portable visual appearance fields`, keep the existing input object with `scopedCustomCss`, `appIconOverrides`, `customWidgets`, `homeWidgetPages`, and `chat`, but replace the expected `toMatchObject` block with:

```js
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
```

Keep the existing checks that `customWidgets`, `homeWidgetPages`, and `chat` are undefined.

- [ ] **Step 2: Add a legacy-import preservation assertion**

In `merges an imported pack without replacing non-pack appearance data`, expand the current appearance object and imported pack:

```js
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
```

Add these expectations after the existing `toMatchObject`:

```js
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
```

- [ ] **Step 3: Update the Appearance root test**

In `tests/appearance-wallpaper-picker.test.js`, update `presents the root Appearance screen as a system look control surface`:

```js
    expect(wrapper.find('.appearance-overview-card').exists()).toBe(true)
    expect(wrapper.find('.appearance-layout-card').exists()).toBe(true)
    expect(wrapper.findAll('.appearance-menu-card')).toHaveLength(2)
    expect(wrapper.find('.appearance-menu-icon.is-theme').exists()).toBe(true)
    expect(wrapper.find('.appearance-menu-icon.is-font').exists()).toBe(true)
    expect(wrapper.find('.appearance-menu-icon.is-icons').exists()).toBe(false)
    expect(wrapper.find('.appearance-menu-icon.is-widget').exists()).toBe(false)
    expect(wrapper.text()).toContain('褰撳墠澶栬')
    expect(wrapper.text()).toContain('妗岄潰妯℃澘')
```

Remove the old expectation that the root contains `Widget 涓績`.

- [ ] **Step 4: Replace the scoped CSS authoring test**

Replace `edits app and world-app scoped custom CSS from the advanced CSS sheet` with:

```js
  test('keeps the advanced CSS sheet global-only', async () => {
    const router = createTestRouter()
    await router.push('/appearance')
    await router.isReady()

    const wrapper = mount(AppearanceView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    await wrapper.findAll('.appearance-menu-card')[0].trigger('click')
    await wrapper.get('[data-testid="appearance-open-css-editor"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="appearance-global-css-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="appearance-app-scoped-css-toggle"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="appearance-world-app-scoped-css-toggle"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="appearance-scoped-css-recovery"]').exists()).toBe(false)

    wrapper.unmount()
  })
```

- [ ] **Step 5: Update the appearance-pack UI test**

In `exports and imports portable appearance packs from the CSS sheet`, remove scoped-CSS UI interactions and use store state to simulate existing app-owned state:

```js
    systemStore.settings.appearance.customWidgets = [{ id: 'local_widget', name: 'Local' }]
    systemStore.settings.appearance.homeWidgetPages = [['local_widget'], [], [], [], []]
    systemStore.settings.appearance.chat = { bubbleStyle: 'compact' }
    systemStore.settings.appearance.customCss = '.shell { color: teal; }'
    systemStore.settings.appearance.scopedCustomCss.app = {
      enabled: true,
      target: 'contacts',
      css: '.screen { background: black; }',
    }
    systemStore.settings.appearance.appIconOverrides = {
      app_chat: {
        icon: 'fas fa-comment',
        accent: 'warm',
      },
    }
```

After export, expect:

```js
    expect(exported).toMatchObject({
      kind: 'schatphone.appearance-pack',
      appearance: {
        customCss: '.shell { color: teal; }',
      },
    })
    expect(exported.appearance.scopedCustomCss).toBeUndefined()
    expect(exported.appearance.appIconOverrides).toBeUndefined()
    expect(exported.appearance.customWidgets).toBeUndefined()
    expect(exported.appearance.homeWidgetPages).toBeUndefined()
    expect(exported.appearance.chat).toBeUndefined()
```

Set the import payload to include legacy fields that should be ignored:

```js
    await wrapper.get('[data-testid="appearance-pack-import-input"]').setValue(
      JSON.stringify({
        appearance: {
          currentTheme: 'zen',
          customCss: '.imported { color: green; }',
          scopedCustomCss: {
            worldApp: {
              enabled: true,
              worldPack: 'survival_city',
              worldApp: 'survival_safe_route_pass',
              css: '.map-route-card { border-color: cyan; }',
            },
          },
          appIconOverrides: {
            app_chat: {
              icon: 'fas fa-star',
              accent: 'dark',
            },
          },
        },
      }),
    )
```

After import, expect current app-owned state is preserved:

```js
    expect(systemStore.settings.appearance.currentTheme).toBe('zen')
    expect(systemStore.settings.appearance.customCss).toBe('.imported { color: green; }')
    expect(systemStore.settings.appearance.scopedCustomCss.app).toMatchObject({
      enabled: true,
      target: 'contacts',
      css: '.screen { background: black; }',
    })
    expect(systemStore.settings.appearance.appIconOverrides).toMatchObject({
      app_chat: {
        icon: 'fas fa-comment',
        accent: 'warm',
      },
    })
```

Keep the existing custom widget, Home pages, Chat, and status expectations.

- [ ] **Step 6: Add a font wording check**

Add this test after the root Appearance test:

```js
  test('describes custom fonts as a CSS font-family stack', async () => {
    const router = createTestRouter()
    await router.push('/appearance')
    await router.isReady()

    const wrapper = mount(AppearanceView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    await wrapper.findAll('.appearance-menu-card')[1].trigger('click')
    await wrapper.findAll('button').find((button) => button.text().includes('缂栬緫鑷畾涔夊瓧浣')).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('CSS font-family')

    wrapper.unmount()
  })
```

- [ ] **Step 7: Run failing tests**

Run:

```bash
npm.cmd run test -- tests/appearance-pack.test.js tests/appearance-wallpaper-picker.test.js
```

Expected result:

- FAIL because Appearance still renders App Icons, Widget Center, and scoped CSS controls.
- FAIL because appearance packs still include/import `scopedCustomCss` and `appIconOverrides`.

- [ ] **Step 8: Commit the failing tests**

```bash
git add tests/appearance-pack.test.js tests/appearance-wallpaper-picker.test.js
git commit -m "test: cover global-only appearance ownership"
```

---

### Task 2: Make Appearance Packs Global-Only

**Files:**
- Modify: `src/lib/appearance-pack.js`

- [ ] **Step 1: Remove non-global imports and schema fields**

Remove these imports from `src/lib/appearance-pack.js`:

```js
import { normalizeAppIconOverrides } from './app-icon-presentation'
import { normalizeScopedCustomCss } from './appearance-scoped-css'
```

Change `APPEARANCE_PACK_FIELD_KEYS` to:

```js
const APPEARANCE_PACK_FIELD_KEYS = Object.freeze([
  'currentTheme',
  'wallpaperMode',
  'wallpaperAssetId',
  'wallpaper',
  'showStatusBar',
  'hapticFeedbackEnabled',
  'customCss',
  'customVars',
  'lockClockStyle',
])
```

- [ ] **Step 2: Remove scoped CSS and app icons from normalized pack appearance**

Change `normalizeAppearancePackAppearance` return object to:

```js
  return {
    currentTheme: normalizeText(source.currentTheme, 'default', 80),
    wallpaperMode: normalizeText(source.wallpaperMode, 'theme', 40),
    wallpaperAssetId: normalizeText(source.wallpaperAssetId, '', 160),
    wallpaper: normalizeLooseText(source.wallpaper, '', 20_000),
    showStatusBar: normalizeBoolean(source.showStatusBar, true),
    hapticFeedbackEnabled: normalizeBoolean(source.hapticFeedbackEnabled, true),
    customCss: normalizeLooseText(source.customCss, '', 50_000),
    customVars: normalizeStringRecord(source.customVars),
    lockClockStyle: normalizeText(source.lockClockStyle, 'classic', 40),
  }
```

- [ ] **Step 3: Preserve non-pack state during merge**

Change the `appearance` block returned by `mergeAppearancePackIntoAppearance` to:

```js
    appearance: {
      ...(currentAppearance && typeof currentAppearance === 'object' ? currentAppearance : {}),
      ...normalized.pack.appearance,
      customVars: { ...normalized.pack.appearance.customVars },
    },
```

This preserves current `scopedCustomCss`, `appIconOverrides`, widgets, Home placement, and Chat appearance because those fields remain in `currentAppearance` and are not overwritten by the pack.

- [ ] **Step 4: Run package schema tests**

Run:

```bash
npm.cmd run test -- tests/appearance-pack.test.js
```

Expected result:

- PASS.

- [ ] **Step 5: Commit the schema change**

```bash
git add src/lib/appearance-pack.js tests/appearance-pack.test.js
git commit -m "feat: keep appearance packs global-only"
```

---

### Task 3: Clean Up Appearance Global UI

**Files:**
- Modify: `src/views/AppearanceView.vue`

- [ ] **Step 1: Remove App Icons and scoped CSS imports**

Remove the entire import block from `../lib/app-icon-presentation`, the import block from `../lib/appearance-scoped-css`, and the `buildActiveWorldAppEntryRows` import.

- [ ] **Step 2: Remove app-icon and scoped-CSS script state**

Delete:

```js
const selectedIconAppId = ref('')
```

Delete the computed blocks for:

- `appearanceLocale`
- `appIconOverrides`
- `appIconPresetOptions`
- `appIconAccentOptions`
- `appIconCustomizationTargets`
- `scopedCustomCss`
- `appScopedCss`
- `worldAppScopedCss`
- `appScopedCssTargetOptions`
- `activeWorldAppScopedTargetOptions`
- `selectedWorldAppScopedTargetValue`
- `selectedWorldAppScopedTarget`
- `appScopedCssSelector`
- `worldAppScopedCssSelector`
- `activeScopedCssLayerCount`
- `worldAppScopedCssTargetLabel`

If `systemLanguage` becomes unused after this, change the i18n destructuring from:

```js
const { t, systemLanguage, languageBase } = useI18n()
```

to:

```js
const { t, languageBase } = useI18n()
```

Keep `languageBase` if it is still used by wallpaper preview URLs. If it becomes unused, remove it too.

- [ ] **Step 3: Remove app-icon and scoped-CSS actions**

Delete these functions:

- `openWidgetCenter`
- `openIconEditor`
- `updateScopedCustomCss`
- `selectWorldAppScopedTarget`
- `clearScopedCustomCss`
- `disableAllScopedCustomCss`
- `clearAllScopedCustomCss`
- `setAppIconOverrideField`
- `resetAppIconOverride`

In `closeAppearanceSheet`, remove:

```js
  selectedIconAppId.value = ''
```

In `goBackToRoot`, remove:

```js
  selectedIconAppId.value = ''
```

- [ ] **Step 4: Remove the App Icons page title branch**

Change:

```js
  if (activeMenu.value === 'icons') return t('功能图标', 'App Icons')
```

by deleting that branch.

- [ ] **Step 5: Remove Widget Center root actions**

In the overview card, remove the second button that calls `openWidgetCenter` and shows the puzzle-piece icon.

In the root menu stack, remove:

- the App Icons menu card with `openMenu('icons')`;
- the Widget Center menu card with `openWidgetCenter`.

Keep Theme and Font menu cards.

- [ ] **Step 6: Make Advanced CSS global-only**

Change the Advanced CSS action button text to:

```vue
<span>{{ t('全局 CSS', 'Global CSS') }}</span>
```

Change the sheet header to:

```vue
<span>{{ t('高级', 'Advanced') }}</span>
<strong>{{ t('全局 CSS', 'Global CSS') }}</strong>
```

Change the textarea label to:

```vue
<label class="text-xs text-gray-500 block">{{ t('全局 CSS（高级）', 'Global CSS (Advanced)') }}</label>
```

Add the test id to the global CSS textarea:

```vue
data-testid="appearance-global-css-input"
```

Delete the whole scoped CSS recovery panel, App scoped CSS panel, and World App scoped CSS panel from inside the CSS sheet. The CSS sheet should contain the global textarea, the Appearance Pack panel, status, and save action.

- [ ] **Step 7: Update Appearance Pack copy**

Change export description in `exportAppearancePack` to:

```js
    description: t(
      '仅包含全局主题、壁纸、字体变量与全局 CSS。',
      'Includes global theme, wallpaper, font variables, and global CSS only.',
    ),
```

Change the pack panel description to:

```vue
{{
  t(
    '导出全局主题、壁纸、字体变量与全局 CSS；不包含 App 图标、单 App 皮肤、桌面布局、小组件或 Chat 外观。',
    'Exports global theme, wallpaper, font variables, and global CSS; excludes app icons, app skins, Home layout, widgets, and Chat appearance.',
  )
}}
```

- [ ] **Step 8: Delete the icons subpage template**

Remove the entire:

```vue
<div v-else-if="activeMenu === 'icons'" ...>
  ...
</div>
```

block.

- [ ] **Step 9: Run Appearance UI tests**

Run:

```bash
npm.cmd run test -- tests/appearance-wallpaper-picker.test.js
```

Expected result:

- PASS.

- [ ] **Step 10: Run lint for unused symbols**

Run:

```bash
npm.cmd run lint
```

Expected result:

- PASS. If lint reports unused CSS-only classes, they are safe to leave; if it reports unused JavaScript imports/variables/functions, remove them.

- [ ] **Step 11: Commit the UI cleanup**

```bash
git add src/views/AppearanceView.vue tests/appearance-wallpaper-picker.test.js
git commit -m "feat: make appearance global-only"
```

---

### Task 4: Sync Visual Governance Docs

**Files:**
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

- [ ] **Step 1: Add landed status**

Append a new numbered entry after the current landed list:

```md
47. Appearance now has a global-only ownership baseline: the root no longer promotes App Icons or Widget Center, Advanced CSS is global-only, and appearance packs exclude app icons, app/world-app scoped CSS, widgets, Home placement, and Chat appearance. App identity and app-specific skins are reserved for App Store/app-owned follow-up slices.
```

If the list number has changed, use the next available number.

- [ ] **Step 2: Update the incomplete scoped CSS note**

Find the incomplete item that currently says custom CSS exists as global Appearance CSS, Chat-scoped CSS, and app/world-app scoped CSS from Appearance Advanced CSS. Replace it with:

```md
6. Custom CSS ownership is now split by user meaning: Appearance keeps global CSS, Chat keeps Chat-scoped CSS, and app/world-app scoped CSS state remains available for the upcoming App Store/app-owned skin slices instead of being exposed from global Appearance.
```

- [ ] **Step 3: Commit docs**

```bash
git add docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md
git commit -m "docs: record global appearance ownership"
```

---

### Task 5: Final Validation

**Files:**
- No source changes unless validation finds a real regression.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm.cmd run test -- tests/appearance-pack.test.js tests/appearance-wallpaper-picker.test.js
```

Expected result:

- PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm.cmd run lint
```

Expected result:

- PASS.

- [ ] **Step 3: Run build**

Run:

```bash
npm.cmd run build
```

Expected result:

- PASS. The existing Vite chunk warning about `src/lib/push.js` may appear and is not caused by this package.

- [ ] **Step 4: Run full unit tests**

Run:

```bash
npm.cmd run test
```

Expected result:

- PASS.

- [ ] **Step 5: Final commit if validation required small fixes**

If validation required fixes, commit them:

```bash
git add src/views/AppearanceView.vue src/lib/appearance-pack.js tests/appearance-pack.test.js tests/appearance-wallpaper-picker.test.js docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md
git commit -m "fix: stabilize global appearance cleanup"
```

If validation required no fixes, do not create an empty commit.

---

## Self-Review Checklist

- Spec coverage: Package 2 requirements are covered by Tasks 1-5.
- Open-item scan: The plan contains no unresolved implementation gaps.
- Type consistency: The plan keeps scoped CSS state in `settings.appearance.scopedCustomCss` but removes it from `AppearanceView.vue` and `appearance-pack.js`.
- Risk check: App icon state is not deleted from settings; it is only removed from global Appearance and global appearance packs so Package 3 can move it into App Store.
