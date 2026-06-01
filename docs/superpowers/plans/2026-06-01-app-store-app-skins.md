# App Store App Skins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users customize an individual app's skin from that app's App Store detail while keeping global Appearance focused on whole-phone styling.

**Architecture:** Add a shared `appSkins` data shape under `settings.appearance` for per-app skin presets and optional custom CSS. App Store owns the user-facing editor for supported app entries, and the App shell applies generated CSS through the existing scoped-style layer so each skin affects only its route scope. Global appearance packs continue to export/import only global appearance fields and preserve app-owned skin state.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils, JavaScript ES modules.

---

## Scope Check

This plan implements Package 4 from `docs/superpowers/specs/2026-06-01-appearance-app-store-food-design.md`.

In scope:

- Add per-app skin data normalization, defaults, presets, and scoped CSS builder.
- Add App Store detail action and bottom-sheet editor for supported apps.
- Persist app skin changes without changing other apps.
- Apply app skin CSS only inside that app's route scope.
- Keep global Appearance packs from exporting or importing app skin state.

Out of scope:

- Food Delivery store mini-app restructuring. That belongs to Package 5.
- Food Delivery visual redesign. That belongs to Package 6.
- Moving Chat's dedicated appearance page into App Store. Chat keeps its own deep settings owner.
- Creating a separate app-skin pack import/export format.

## File Structure

- Create `src/lib/app-skin-customization.js`
  - Defines supported app skin targets, built-in skin presets, normalization helpers, and CSS generation.
- Modify `src/stores/system.js`
  - Adds `settings.appearance.appSkins`, hydration/persistence normalization, and `setAppSkin` / `resetAppSkin` actions.
- Modify `src/App.vue`
  - Applies app-skin CSS alongside the existing legacy scoped CSS layer.
- Modify `src/views/AppStoreView.vue`
  - Adds a single-app skin action and editor for supported app entries.
- Modify `tests/appearance-scoped-css.test.js`
  - Covers per-app CSS scoping and multi-app isolation.
- Modify `tests/app-store-ui.test.js`
  - Covers changing one app skin from App Store without affecting another app.
- Modify `tests/appearance-pack.test.js`
  - Covers global appearance pack exclusion and preservation of `appSkins`.
- Modify `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
  - Records that app skins are now owned by App Store/app-level surfaces, not global Appearance.

---

### Task 1: Add Failing App Skin Tests

**Files:**
- Modify: `tests/appearance-scoped-css.test.js`
- Modify: `tests/app-store-ui.test.js`
- Modify: `tests/appearance-pack.test.js`

- [ ] **Step 1: Add app skin CSS helper expectations**

In `tests/appearance-scoped-css.test.js`, import these helpers from `../src/lib/app-skin-customization`:

```js
import {
  buildAppSkinCss,
  normalizeAppSkinSettings,
  resolveAppSkinTargetForAppId,
} from '../src/lib/app-skin-customization'
```

Add a test that proves the new builder scopes CSS to each app:

```js
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
```

Add a second test for normalization and App Store target mapping:

```js
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
```

- [ ] **Step 2: Add App Store UI behavior test**

In `tests/app-store-ui.test.js`, add this test after the icon customization tests:

```js
  test('App Store saves an app skin for one app without affecting another app', async () => {
    const router = createTestRouter()
    await router.push('/app-store')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, { global: { plugins: [router] } })

    await wrapper.get('[data-testid="app-store-item-app_food_delivery"]').trigger('click')
    await wrapper.get('[data-testid="app-store-open-skin"]').trigger('click')
    await wrapper.get('[data-testid="app-store-skin-preset"]').setValue('market_fresh')
    await wrapper.get('[data-testid="app-store-skin-css-enabled"]').setValue(true)
    await wrapper.get('[data-testid="app-store-skin-css-input"]').setValue('.store-card { border-radius: 18px; }')
    await wrapper.get('[data-testid="app-store-skin-save"]').trigger('click')
    await flushPromises()

    expect(systemStore.settings.appearance.appSkins.food_delivery).toMatchObject({
      presetId: 'market_fresh',
      customCssEnabled: true,
      customCss: '.store-card { border-radius: 18px; }',
    })
    expect(systemStore.settings.appearance.appSkins.shopping).toBeUndefined()

    wrapper.unmount()
  })
```

Add a smaller ownership test for Chat:

```js
  test('App Store keeps Chat deep appearance owned by Chat settings', async () => {
    const router = createTestRouter()
    await router.push('/app-store')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, { global: { plugins: [router] } })

    await wrapper.get('[data-testid="app-store-item-app_chat"]').trigger('click')

    expect(wrapper.find('[data-testid="app-store-open-skin"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="app-store-open-identity"]').exists()).toBe(true)

    wrapper.unmount()
  })
```

- [ ] **Step 3: Add appearance-pack exclusion and preservation test**

In `tests/appearance-pack.test.js`, extend the existing export test input with:

```js
      appSkins: {
        food_delivery: {
          presetId: 'market_fresh',
          customCssEnabled: true,
          customCss: '.store-card { color: red; }',
        },
      },
```

Assert:

```js
    expect(pack.appearance.appSkins).toBeUndefined()
```

In the merge test, add current `appSkins` and imported `appSkins` values, then assert the current value is preserved:

```js
    expect(result.appearance.appSkins).toMatchObject({
      food_delivery: {
        presetId: 'market_fresh',
        customCssEnabled: true,
      },
    })
```

- [ ] **Step 4: Run failing tests**

Run:

```bash
npm.cmd run test -- tests/appearance-scoped-css.test.js tests/app-store-ui.test.js tests/appearance-pack.test.js
```

Expected: fail because `app-skin-customization.js`, store actions, and App Store skin UI do not exist yet.

- [ ] **Step 5: Commit failing tests**

```bash
git add tests/appearance-scoped-css.test.js tests/app-store-ui.test.js tests/appearance-pack.test.js
git commit -m "test: cover app store app skin ownership"
```

---

### Task 2: Add Shared App Skin Data And CSS Builder

**Files:**
- Create: `src/lib/app-skin-customization.js`
- Modify: `tests/appearance-scoped-css.test.js`

- [ ] **Step 1: Create the app skin helper module**

Create `src/lib/app-skin-customization.js` with:

```js
import { normalizeScopeToken } from './app-shell-scope'
import { scopeCssToSelector } from './appearance-scoped-css'

const MAX_APP_SKIN_CSS_LENGTH = 50_000
const DEFAULT_APP_SKIN_PRESET_ID = 'default'

export const APP_SKIN_PRESETS = Object.freeze([
  {
    id: DEFAULT_APP_SKIN_PRESET_ID,
    labelZh: '默认',
    labelEn: 'Default',
    descriptionZh: '跟随当前全局主题。',
    descriptionEn: 'Follow the current global theme.',
    css: '',
  },
  {
    id: 'market_fresh',
    labelZh: '清新店铺',
    labelEn: 'Market fresh',
    descriptionZh: '更明亮的卡片、柔和的绿色强调，适合外卖和生活类 app。',
    descriptionEn: 'Brighter cards with a soft green accent for food and lifestyle apps.',
    css: ':scope { --system-accent: #0f9f6e; --system-accent-soft: rgba(15, 159, 110, 0.15); --system-panel-bg: rgba(255, 255, 255, 0.9); }',
  },
  {
    id: 'catalog_clean',
    labelZh: '清爽目录',
    labelEn: 'Catalog clean',
    descriptionZh: '减少装饰感，让列表和商品信息更容易扫读。',
    descriptionEn: 'Quieter surfaces for scanning lists and product details.',
    css: ':scope { --system-accent: #2563eb; --system-panel-bg: rgba(248, 250, 252, 0.92); --system-card-border: rgba(37, 99, 235, 0.18); }',
  },
  {
    id: 'night_service',
    labelZh: '夜间服务',
    labelEn: 'Night service',
    descriptionZh: '偏深色的沉浸界面，适合地图、夜间订单或工具类 app。',
    descriptionEn: 'A darker immersive surface for maps, evening orders, or utilities.',
    css: ':scope { --system-page-bg: #0f172a; --system-panel-bg: rgba(15, 23, 42, 0.86); --system-text: #f8fafc; --system-text-muted: rgba(226, 232, 240, 0.72); --system-accent: #38bdf8; --system-accent-soft: rgba(56, 189, 248, 0.16); }',
  },
])

export const APP_SKIN_TARGETS = Object.freeze([
  { appId: 'app_store', scope: 'app_store', labelZh: '应用商城', labelEn: 'App Store' },
  { appId: 'app_contacts', scope: 'contacts', labelZh: '联系人', labelEn: 'Contacts' },
  { appId: 'app_gallery', scope: 'gallery', labelZh: '相册', labelEn: 'Photos' },
  { appId: 'app_map', scope: 'map', labelZh: '地图', labelEn: 'Map' },
  { appId: 'app_calendar', scope: 'calendar', labelZh: '日历', labelEn: 'Calendar' },
  { appId: 'app_shopping', scope: 'shopping', labelZh: '购物', labelEn: 'Shopping' },
  { appId: 'app_food_delivery', scope: 'food_delivery', labelZh: '外卖', labelEn: 'Food Delivery' },
  { appId: 'app_themes', scope: 'appearance', labelZh: '外观', labelEn: 'Appearance' },
])

const PRESET_IDS = new Set(APP_SKIN_PRESETS.map((preset) => preset.id))
const TARGETS_BY_APP_ID = new Map(APP_SKIN_TARGETS.map((target) => [target.appId, target]))
const TARGETS_BY_SCOPE = new Map(APP_SKIN_TARGETS.map((target) => [target.scope, target]))

const normalizeCssText = (value = '') =>
  typeof value === 'string' ? value.slice(0, MAX_APP_SKIN_CSS_LENGTH) : ''

const normalizeEnabled = (value) => (typeof value === 'boolean' ? value : false)

export const resolveAppSkinTargetForAppId = (appId = '') => {
  const normalizedId = typeof appId === 'string' ? appId.trim() : ''
  return TARGETS_BY_APP_ID.get(normalizedId) || null
}

export const resolveAppSkinTargetForScope = (scope = '') => {
  const normalizedScope = normalizeScopeToken(scope, '')
  return TARGETS_BY_SCOPE.get(normalizedScope) || null
}

export const resolveAppSkinPreset = (presetId = '') => {
  const normalizedId = typeof presetId === 'string' ? presetId.trim() : ''
  return APP_SKIN_PRESETS.find((preset) => preset.id === normalizedId) || APP_SKIN_PRESETS[0]
}

export const normalizeAppSkin = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const presetId = typeof source.presetId === 'string' && PRESET_IDS.has(source.presetId)
    ? source.presetId
    : DEFAULT_APP_SKIN_PRESET_ID
  return {
    presetId,
    customCssEnabled: normalizeEnabled(source.customCssEnabled),
    customCss: normalizeCssText(source.customCss),
  }
}

export const normalizeAppSkinSettings = (input = {}) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  return Object.fromEntries(
    Object.entries(input)
      .map(([rawScope, rawSkin]) => {
        const target = resolveAppSkinTargetForScope(rawScope)
        if (!target) return null
        const skin = normalizeAppSkin(rawSkin)
        const isDefault =
          skin.presetId === DEFAULT_APP_SKIN_PRESET_ID &&
          skin.customCssEnabled === false &&
          skin.customCss.trim() === ''
        return isDefault ? null : [target.scope, skin]
      })
      .filter(Boolean),
  )
}

export const buildAppSkinCss = (appSkins = {}) => {
  const normalized = normalizeAppSkinSettings(appSkins)
  return Object.entries(normalized)
    .map(([scope, skin]) => {
      const preset = resolveAppSkinPreset(skin.presetId)
      const customCss = skin.customCssEnabled ? skin.customCss : ''
      const css = [preset.css, customCss].filter((chunk) => chunk && chunk.trim()).join('\n\n')
      return css ? scopeCssToSelector(css, `[data-app="${scope}"]`) : ''
    })
    .filter(Boolean)
    .join('\n\n')
}
```

- [ ] **Step 2: Run helper tests**

Run:

```bash
npm.cmd run test -- tests/appearance-scoped-css.test.js
```

Expected: helper tests pass.

- [ ] **Step 3: Commit helper module**

```bash
git add src/lib/app-skin-customization.js tests/appearance-scoped-css.test.js
git commit -m "feat: add app skin css helpers"
```

---

### Task 3: Persist And Apply App Skins

**Files:**
- Modify: `src/stores/system.js`
- Modify: `src/App.vue`
- Modify: `tests/appearance-pack.test.js`

- [ ] **Step 1: Wire app skins into the system store**

In `src/stores/system.js`, import:

```js
import {
  normalizeAppSkinSettings,
  resolveAppSkinTargetForScope,
} from '../lib/app-skin-customization'
```

Add `appSkins: normalizeAppSkinSettings(),` to `settings.appearance`.

Add store actions near `setScopedCustomCss`:

```js
  const setAppSkin = (scope, updates = {}) => {
    const target = resolveAppSkinTargetForScope(scope)
    if (!target) return false
    const current = normalizeAppSkinSettings(settings.appearance.appSkins)
    const next = normalizeAppSkinSettings({
      ...current,
      [target.scope]: {
        ...(current[target.scope] || {}),
        ...(updates && typeof updates === 'object' ? updates : {}),
      },
    })
    settings.appearance.appSkins = next
    return true
  }

  const resetAppSkin = (scope) => {
    const target = resolveAppSkinTargetForScope(scope)
    if (!target) return false
    const current = normalizeAppSkinSettings(settings.appearance.appSkins)
    const existed = Boolean(current[target.scope])
    const next = { ...current }
    delete next[target.scope]
    settings.appearance.appSkins = normalizeAppSkinSettings(next)
    return existed
  }
```

Normalize `appearance.appSkins` during import, hydration, final normalization, and persistence:

```js
settings.appearance.appSkins = normalizeAppSkinSettings(appearance.appSkins)
```

```js
appSkins: normalizeAppSkinSettings(settings.appearance.appSkins),
```

Return `setAppSkin` and `resetAppSkin` from the store.

- [ ] **Step 2: Apply app skin CSS in the app shell**

In `src/App.vue`, import:

```js
import { buildAppSkinCss } from './lib/app-skin-customization'
```

Change `syncScopedCustomCss` so it accepts the full appearance object:

```js
const syncScopedCustomCss = (appearance = {}) => {
  const styleEl = ensureScopedCustomCssStyleEl()
  styleEl.textContent = [
    buildScopedCustomCss(appearance.scopedCustomCss),
    buildAppSkinCss(appearance.appSkins),
  ].filter(Boolean).join('\n\n')
}
```

Update the watcher:

```js
watch(
  () => settings.value.appearance,
  (value) => {
    syncScopedCustomCss(value)
  },
  { deep: true, immediate: true },
)
```

- [ ] **Step 3: Run store/CSS tests**

Run:

```bash
npm.cmd run test -- tests/appearance-scoped-css.test.js tests/appearance-pack.test.js tests/app-shell-scope.test.js
```

Expected: pass.

- [ ] **Step 4: Commit store and shell integration**

```bash
git add src/stores/system.js src/App.vue tests/appearance-pack.test.js
git commit -m "feat: persist and apply app skins"
```

---

### Task 4: Add App Store App Skin Editor

**Files:**
- Modify: `src/views/AppStoreView.vue`
- Modify: `tests/app-store-ui.test.js`

- [ ] **Step 1: Import app skin helpers**

In `src/views/AppStoreView.vue`, import:

```js
import {
  APP_SKIN_PRESETS,
  resolveAppSkinPreset,
  resolveAppSkinTargetForAppId,
} from '../lib/app-skin-customization'
```

- [ ] **Step 2: Add skin editor state and actions**

Add state near the identity editor state:

```js
const selectedAppSkinTarget = computed(() =>
  selectedApp.value?.worldAppEntry ? null : resolveAppSkinTargetForAppId(selectedApp.value?.id),
)
const selectedAppCanCustomizeSkin = computed(() => Boolean(selectedAppSkinTarget.value))
const skinEditorOpen = ref(false)
const skinFeedback = ref('')
const skinDraft = reactive({
  presetId: 'default',
  customCssEnabled: false,
  customCss: '',
})

const syncSkinDraftFromSelectedApp = () => {
  const target = selectedAppSkinTarget.value
  if (!target) return
  const current = settings.value.appearance?.appSkins?.[target.scope] || {}
  const preset = resolveAppSkinPreset(current.presetId)
  skinDraft.presetId = preset.id
  skinDraft.customCssEnabled = current.customCssEnabled === true
  skinDraft.customCss = typeof current.customCss === 'string' ? current.customCss : ''
  skinFeedback.value = ''
}

watch(
  () => selectedApp.value?.id,
  () => {
    if (skinEditorOpen.value) syncSkinDraftFromSelectedApp()
  },
)

const openSkinEditor = () => {
  if (!selectedAppCanCustomizeSkin.value) return
  syncSkinDraftFromSelectedApp()
  detailSheetOpen.value = false
  skinEditorOpen.value = true
}

const closeSkinEditor = () => {
  skinEditorOpen.value = false
}

const saveSkinEditor = () => {
  const target = selectedAppSkinTarget.value
  if (!target) return
  systemStore.setAppSkin(target.scope, {
    presetId: skinDraft.presetId,
    customCssEnabled: skinDraft.customCssEnabled,
    customCss: skinDraft.customCss,
  })
  systemStore.saveNow()
  skinFeedback.value = t('这个 APP 的外观已更新。', 'This app skin has been updated.')
  closeSkinEditor()
}

const restoreSkinDefault = () => {
  const target = selectedAppSkinTarget.value
  if (!target) return
  systemStore.resetAppSkin(target.scope)
  systemStore.saveNow()
  syncSkinDraftFromSelectedApp()
  skinFeedback.value = t('已恢复默认 APP 外观。', 'Default app skin restored.')
  closeSkinEditor()
}
```

- [ ] **Step 3: Add App Store detail action**

In both inline detail and mobile detail-sheet action lists, add a skin action after the identity action:

```vue
              <button
                v-if="selectedAppCanCustomizeSkin"
                type="button"
                class="app-store-action"
                data-testid="app-store-open-skin"
                @click="openSkinEditor"
              >
                <i class="fas fa-palette" aria-hidden="true"></i>
                <span>{{ t('APP 皮肤', 'App Skin') }}</span>
              </button>
```

- [ ] **Step 4: Add the skin editor sheet**

Add the sheet after the identity editor sheet:

```vue
    <div
      v-if="skinEditorOpen"
      class="app-store-identity-backdrop"
      @click="closeSkinEditor"
    ></div>
    <section
      v-if="skinEditorOpen && selectedApp && selectedAppSkinTarget"
      class="app-store-identity-sheet app-store-skin-sheet"
      data-testid="app-store-skin-sheet"
    >
      <div class="app-store-identity-head">
        <AppIconVisual
          class="app-store-identity-preview-icon"
          :meta="selectedApp"
          :image-url="selectedApp.iconImageUrl"
          :alt="selectedApp.label"
        />
        <div class="app-store-identity-title">
          <p>{{ selectedApp.label }}</p>
          <h2>{{ t('APP 皮肤', 'App Skin') }}</h2>
          <span>{{ t('只改变这个 APP 打开后的界面氛围。', 'Changes only this app once it opens.') }}</span>
        </div>
        <button
          type="button"
          class="app-store-identity-close"
          :aria-label="t('关闭', 'Close')"
          @click="closeSkinEditor"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div class="app-store-identity-fields app-store-skin-fields">
        <label class="app-store-identity-field">
          <span>{{ t('内置皮肤', 'Built-in skin') }}</span>
          <select v-model="skinDraft.presetId" data-testid="app-store-skin-preset">
            <option
              v-for="preset in APP_SKIN_PRESETS"
              :key="preset.id"
              :value="preset.id"
            >
              {{ t(preset.labelZh, preset.labelEn) }}
            </option>
          </select>
        </label>

        <label class="app-store-skin-toggle">
          <input
            v-model="skinDraft.customCssEnabled"
            type="checkbox"
            data-testid="app-store-skin-css-enabled"
          />
          <span>{{ t('启用这个 APP 的自定义 CSS', 'Enable custom CSS for this app') }}</span>
        </label>

        <label class="app-store-identity-field app-store-skin-css-field">
          <span>{{ t('这个 APP 的 CSS', 'CSS for this app') }}</span>
          <textarea
            v-model="skinDraft.customCss"
            data-testid="app-store-skin-css-input"
            spellcheck="false"
          ></textarea>
        </label>
      </div>

      <p v-if="skinFeedback" class="app-store-identity-feedback" aria-live="polite">
        {{ skinFeedback }}
      </p>

      <div class="app-store-identity-footer">
        <button
          type="button"
          class="app-store-action"
          data-testid="app-store-skin-restore"
          @click="restoreSkinDefault"
        >
          <i class="fas fa-rotate-left" aria-hidden="true"></i>
          <span>{{ t('恢复默认', 'Restore default') }}</span>
        </button>
        <button
          type="button"
          class="app-store-action is-primary"
          data-testid="app-store-skin-save"
          @click="saveSkinEditor"
        >
          <i class="fas fa-check" aria-hidden="true"></i>
          <span>{{ t('保存', 'Save') }}</span>
        </button>
      </div>
    </section>
```

Style the sheet by reusing the identity sheet classes and adding:

```css
.app-store-skin-fields {
  gap: 12px;
}

.app-store-skin-toggle {
  min-height: 42px;
  border: 1px solid var(--system-control-border);
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font-size: 12px;
  font-weight: 760;
}

.app-store-skin-toggle input {
  width: 16px;
  height: 16px;
  accent-color: var(--system-accent);
}

.app-store-skin-css-field textarea {
  min-height: 140px;
  resize: vertical;
  font-family: "SFMono-Regular", Consolas, monospace;
  line-height: 1.45;
}
```

- [ ] **Step 5: Run App Store tests**

Run:

```bash
npm.cmd run test -- tests/app-store-ui.test.js
```

Expected: pass.

- [ ] **Step 6: Commit App Store UI**

```bash
git add src/views/AppStoreView.vue tests/app-store-ui.test.js
git commit -m "feat: edit app skins from app store"
```

---

### Task 5: Verify, Document, And Close Package 4

**Files:**
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
- Modify: `docs/superpowers/specs/2026-06-01-appearance-app-store-food-design.md` only if the implemented behavior changes the approved spec.

- [ ] **Step 1: Update visual governance handoff**

Add a short dated note:

```md
- 2026-06-01: Package 4 complete. App-specific skin presets and per-app CSS are now edited from App Store app details for supported apps. Global Appearance remains whole-phone only; global appearance packs exclude app skins, icons, widgets, Home placement, and Chat appearance. Chat keeps its own dedicated appearance settings.
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
npm.cmd run test -- tests/appearance-scoped-css.test.js tests/app-store-ui.test.js tests/appearance-pack.test.js tests/app-shell-scope.test.js
```

Expected: pass.

- [ ] **Step 3: Run full validation**

Run:

```bash
npm.cmd run lint
npm.cmd run build
npm.cmd run test
```

Expected: pass. The existing Vite dynamic/static import warning for `push.js` may still appear during build.

- [ ] **Step 4: Commit docs**

```bash
git add docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md
git commit -m "docs: record app skin ownership"
```

---

## Acceptance Criteria

- App Store exposes an `App Skin` action for supported apps such as Food Delivery, Shopping, Map, Gallery, Calendar, Contacts, App Store, and Appearance.
- Chat does not show the generic App Store skin editor because Chat Appearance remains its own deep settings surface.
- Saving Food Delivery's skin does not change Shopping or any other app.
- Generated app skin CSS is scoped to `[data-app="<route_scope>"]`.
- Global Appearance still has no app-scoped CSS controls.
- Global appearance packs do not export or import `appSkins`.
- Focused tests, lint, build, and full test suite pass before finishing.
