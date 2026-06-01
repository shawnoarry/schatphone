# App Store App Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users customize each app icon from that app's App Store detail, including built-in icon/accent presets, Gallery images, local uploads, preview, save, and restore default.

**Architecture:** Keep the persisted location compatible with the current system by extending `settings.appearance.appIconOverrides`, but move the user-facing owner to App Store. Rendering goes through one shared icon visual component so Home, Dock, App Store, and in-shell notifications read the same resolved app identity.

**Tech Stack:** Vue 3, Pinia, Vitest, Vue Test Utils, existing Gallery asset storage, existing Font Awesome icon classes.

---

## File Structure

- Modify: `src/lib/app-icon-presentation.js`
  - Extend normalization so legacy `{ icon, accent }` overrides still work.
  - Add Gallery image icon fields without requiring Appearance to own the UI.
- Modify: `src/stores/system.js`
  - Add `setAppIconOverride(appId, override)` and `clearAppIconOverride(appId)` actions.
  - Keep persistence and restore paths using `normalizeAppIconOverrides`.
- Create: `src/components/shared/AppIconVisual.vue`
  - Render a stable square icon.
  - Use an image when the resolved app icon has a usable preview URL.
  - Fall back to the built-in/preset Font Awesome glyph when the image is missing.
- Modify: `src/views/AppStoreView.vue`
  - Add `Icon & Appearance` action in each app detail.
  - Add a root-level identity editor sheet.
  - Support built-in preset/accent selection, Gallery asset selection, local upload into Gallery, save, and restore default.
- Modify: `src/views/HomeView.vue`
  - Render image icons for Home app tiles, folder-like app tiles, Dock, and app candidates where possible.
- Modify: `src/App.vue` and `src/views/LockScreen.vue`
  - Render image icons for supported in-shell and lock-screen notification module identity.
- Modify: `tests/app-icon-presentation.test.js`
  - Cover legacy, built-in, and Gallery image icon normalization/resolution.
- Modify: `tests/app-store-ui.test.js`
  - Cover App Store detail icon editor, Gallery image icon save, upload save, restore default, and Home render.
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
  - Record that App Store now owns app identity/icon editing.

---

### Task 1: Tests First

**Files:**
- Modify: `tests/app-icon-presentation.test.js`
- Modify: `tests/app-store-ui.test.js`

- [x] **Step 1: Add helper tests for image icon overrides**

Add a test that keeps old icon overrides valid and adds Gallery image fields:

```js
test('normalizes gallery image icon overrides while preserving legacy built-in overrides', () => {
  const normalized = normalizeAppIconOverrides({
    app_chat: {
      icon: 'fas fa-comment-dots',
      accent: 'cool',
    },
    app_gallery: {
      sourceType: 'gallery',
      galleryAssetId: 'asset_gallery_icon',
      accent: 'warm',
    },
    app_map: {
      sourceType: 'gallery',
      galleryAssetId: '',
      icon: 'fas fa-route',
      accent: 'cool',
    },
  })

  expect(normalized.app_chat).toEqual({
    sourceType: 'preset',
    icon: 'fas fa-comment-dots',
    accent: 'cool',
    galleryAssetId: '',
  })
  expect(normalized.app_gallery).toEqual({
    sourceType: 'gallery',
    icon: 'fas fa-images',
    accent: 'warm',
    galleryAssetId: 'asset_gallery_icon',
  })
  expect(normalized.app_map).toEqual({
    sourceType: 'preset',
    icon: 'fas fa-route',
    accent: 'cool',
    galleryAssetId: '',
  })
})
```

- [x] **Step 2: Add resolver tests for image metadata**

Add a test that `resolveAppIconMeta` exposes image state for renderers:

```js
test('resolves gallery image app icons with a built-in fallback glyph', () => {
  const meta = resolveAppIconMeta(
    'app_gallery',
    {
      app_gallery: {
        sourceType: 'gallery',
        galleryAssetId: 'asset_gallery_icon',
        accent: 'warm',
      },
    },
    'en-US',
  )

  expect(meta.sourceType).toBe('gallery')
  expect(meta.galleryAssetId).toBe('asset_gallery_icon')
  expect(meta.hasImageIcon).toBe(true)
  expect(meta.icon).toBe('fas fa-images')
  expect(meta.toneClass).toBe('accent-warm')
})
```

- [x] **Step 3: Add App Store UI tests**

Add tests in `tests/app-store-ui.test.js`:

```js
test('App Store saves a built-in icon preset from the app detail identity sheet', async () => {
  const router = createTestRouter()
  await router.push('/app-store')
  await router.isReady()
  const systemStore = useSystemStore()
  systemStore.settings.system.language = 'en-US'

  const wrapper = mount(AppStoreView, { global: { plugins: [router] } })

  await wrapper.get('[data-testid="app-store-item-app_chat"]').trigger('click')
  await wrapper.get('[data-testid="app-store-open-identity"]').trigger('click')
  await wrapper.get('[data-testid="app-store-identity-icon-preset"]').setValue('fas fa-paper-plane')
  await wrapper.get('[data-testid="app-store-identity-accent"]').setValue('dark')
  await wrapper.get('[data-testid="app-store-identity-save"]').trigger('click')
  await flushPromises()

  expect(systemStore.settings.appearance.appIconOverrides.app_chat).toMatchObject({
    sourceType: 'preset',
    icon: 'fas fa-paper-plane',
    accent: 'dark',
  })

  wrapper.unmount()
})
```

Add a Gallery image test:

```js
test('App Store saves a Gallery image icon and Home renders the same image icon', async () => {
  const router = createTestRouter()
  const systemStore = useSystemStore()
  const galleryStore = useGalleryStore()
  galleryStore.resetForTesting()
  const imported = galleryStore.importAssetFromUrl({
    url: 'https://example.com/icon-gallery.png',
    name: 'Gallery Icon',
    category: 'reference',
  })
  expect(imported.ok).toBe(true)

  await router.push('/app-store')
  await router.isReady()
  systemStore.settings.system.language = 'en-US'

  const wrapper = mount(AppStoreView, { global: { plugins: [router] } })
  await wrapper.get('[data-testid="app-store-item-app_gallery"]').trigger('click')
  await wrapper.get('[data-testid="app-store-open-identity"]').trigger('click')
  await wrapper.get('[data-testid="app-store-identity-source-gallery"]').trigger('click')
  await wrapper.get('[data-testid="app-store-identity-gallery-asset"]').setValue(imported.assetId)
  await wrapper.get('[data-testid="app-store-identity-save"]').trigger('click')
  await flushPromises()

  expect(systemStore.settings.appearance.appIconOverrides.app_gallery).toMatchObject({
    sourceType: 'gallery',
    galleryAssetId: imported.assetId,
  })

  wrapper.unmount()

  await router.push('/home')
  await router.isReady()
  const homeWrapper = mount(HomeView, {
    props: { currentDate: 'Jan 1', currentTime: '09:00' },
    global: { plugins: [router] },
  })
  await flushPromises()

  expect(homeWrapper.get('[data-testid="home-app-icon-app_gallery"] img').attributes('src')).toBe(
    'https://example.com/icon-gallery.png',
  )
  homeWrapper.unmount()
})
```

Add an upload test that uses a `File`, confirms a Gallery asset is created, and confirms the chosen app uses that new asset:

```js
test('App Store uploads a local image into Gallery and uses it as the selected app icon', async () => {
  const router = createTestRouter()
  const systemStore = useSystemStore()
  const galleryStore = useGalleryStore()
  galleryStore.resetForTesting()
  await router.push('/app-store')
  await router.isReady()

  const wrapper = mount(AppStoreView, { global: { plugins: [router] } })
  await wrapper.get('[data-testid="app-store-item-app_map"]').trigger('click')
  await wrapper.get('[data-testid="app-store-open-identity"]').trigger('click')

  const file = new File(['icon'], 'map-icon.png', { type: 'image/png' })
  const input = wrapper.get('[data-testid="app-store-identity-upload-input"]')
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  })
  await input.trigger('change')
  await flushPromises()
  await wrapper.get('[data-testid="app-store-identity-save"]').trigger('click')
  await flushPromises()

  const saved = systemStore.settings.appearance.appIconOverrides.app_map
  expect(saved.sourceType).toBe('gallery')
  expect(saved.galleryAssetId).toBeTruthy()
  expect(galleryStore.findAssetById(saved.galleryAssetId)?.name).toBe('map-icon.png')

  wrapper.unmount()
})
```

Add a restore test:

```js
test('App Store restores the selected app default icon', async () => {
  const router = createTestRouter()
  const systemStore = useSystemStore()
  systemStore.setAppIconOverride('app_chat', {
    icon: 'fas fa-paper-plane',
    accent: 'dark',
  })
  await router.push('/app-store')
  await router.isReady()

  const wrapper = mount(AppStoreView, { global: { plugins: [router] } })
  await wrapper.get('[data-testid="app-store-item-app_chat"]').trigger('click')
  await wrapper.get('[data-testid="app-store-open-identity"]').trigger('click')
  await wrapper.get('[data-testid="app-store-identity-restore"]').trigger('click')
  await flushPromises()

  expect(systemStore.settings.appearance.appIconOverrides.app_chat).toBeUndefined()
  wrapper.unmount()
})
```

- [x] **Step 4: Run tests to confirm failure**

Run:

```bash
npm.cmd run test -- tests/app-icon-presentation.test.js tests/app-store-ui.test.js
```

Expected: FAIL because image icon fields, store actions, App Store identity controls, and Home image icon test IDs do not exist yet.

- [x] **Step 5: Commit failing tests**

```bash
git add tests/app-icon-presentation.test.js tests/app-store-ui.test.js
git commit -m "test: cover app store icon identity editing"
```

---

### Task 2: Icon Data Contract And Store Actions

**Files:**
- Modify: `src/lib/app-icon-presentation.js`
- Modify: `src/stores/system.js`
- Test: `tests/app-icon-presentation.test.js`

- [x] **Step 1: Extend icon override normalization**

In `src/lib/app-icon-presentation.js`, make normalized overrides include these fields:

```js
{
  sourceType: 'preset' | 'gallery',
  icon: 'fas fa-...',
  accent: 'default' | 'cool' | 'warm' | 'light' | 'dark',
  galleryAssetId: '',
}
```

Rules:

- legacy `{ icon, accent }` becomes `sourceType: 'preset'`;
- `{ sourceType: 'gallery', galleryAssetId }` is valid when `galleryAssetId` is non-empty;
- Gallery image icon still keeps a built-in fallback `icon`;
- invalid app ids are ignored;
- invalid Gallery payload falls back to a valid preset payload when possible.

- [x] **Step 2: Extend `resolveAppIconMeta`**

Return these additional fields:

```js
sourceType: override?.sourceType || 'preset',
galleryAssetId: override?.sourceType === 'gallery' ? override.galleryAssetId : '',
hasImageIcon: override?.sourceType === 'gallery' && Boolean(override.galleryAssetId),
```

Keep existing `icon`, `accent`, `toneClass`, and `label` behavior compatible with current tests.

- [x] **Step 3: Add system store actions**

In `src/stores/system.js`, add:

```js
const setAppIconOverride = (appId, override = {}) => {
  const normalizedId = typeof appId === 'string' ? appId.trim() : ''
  if (!normalizedId) return false
  const nextOverrides = {
    ...(settings.appearance.appIconOverrides || {}),
    [normalizedId]: override,
  }
  const normalized = normalizeAppIconOverrides(nextOverrides)
  if (!normalized[normalizedId]) return false
  settings.appearance.appIconOverrides = normalized
  return true
}

const clearAppIconOverride = (appId) => {
  const normalizedId = typeof appId === 'string' ? appId.trim() : ''
  if (!normalizedId) return false
  const nextOverrides = { ...(settings.appearance.appIconOverrides || {}) }
  const existed = Boolean(nextOverrides[normalizedId])
  delete nextOverrides[normalizedId]
  settings.appearance.appIconOverrides = normalizeAppIconOverrides(nextOverrides)
  return existed
}
```

Return both actions from the Pinia store.

- [x] **Step 4: Run helper tests**

Run:

```bash
npm.cmd run test -- tests/app-icon-presentation.test.js
```

Expected: PASS.

- [x] **Step 5: Commit data contract**

```bash
git add src/lib/app-icon-presentation.js src/stores/system.js
git commit -m "feat: support image app icon identity data"
```

---

### Task 3: Shared Icon Renderer

**Files:**
- Create: `src/components/shared/AppIconVisual.vue`
- Modify: `src/views/HomeView.vue`
- Modify: `src/App.vue`
- Modify: `src/views/LockScreen.vue`

- [x] **Step 1: Create `AppIconVisual.vue`**

Use this structure:

```vue
<script setup>
import { computed } from 'vue'

const props = defineProps({
  meta: {
    type: Object,
    default: () => ({}),
  },
  imageUrl: {
    type: String,
    default: '',
  },
  accentStyle: {
    type: Object,
    default: null,
  },
  alt: {
    type: String,
    default: '',
  },
})

const iconClass = computed(() => props.meta?.icon || 'fas fa-circle')
const toneClass = computed(() => props.meta?.toneClass || `accent-${props.meta?.accent || 'default'}`)
const hasImage = computed(() => typeof props.imageUrl === 'string' && props.imageUrl.trim())
</script>

<template>
  <span
    class="app-icon-visual"
    :class="[toneClass, { 'has-image': hasImage }]"
    :style="hasImage ? undefined : accentStyle"
  >
    <img v-if="hasImage" :src="imageUrl" :alt="alt || meta.label || ''" />
    <i v-else :class="iconClass" aria-hidden="true"></i>
  </span>
</template>

<style scoped>
.app-icon-visual {
  position: relative;
  overflow: hidden;
}

.app-icon-visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
</style>
```

- [x] **Step 2: Load icon image previews in Home**

In `src/views/HomeView.vue`:

- import `reactive`, `watch`, `useGalleryStore`, and `AppIconVisual`;
- create a preview scope id such as `home-app-icons`;
- watch `settings.appearance.appIconOverrides`;
- for every override with `sourceType === 'gallery'`, resolve `galleryStore.getAssetPreviewUrl(assetId, { scopeId })`;
- expose `appIconImageUrl(appId)` that returns the resolved preview URL or an empty string;
- release the preview scope in `onBeforeUnmount`.

- [x] **Step 3: Render Home and Dock through the shared component**

Replace direct app icon spans with `AppIconVisual`, preserving existing classes:

```vue
<AppIconVisual
  class="home-app-icon"
  :data-testid="`home-app-icon-${placement.tileId}`"
  :meta="tileMeta(placement.tileId)"
  :image-url="appIconImageUrl(placement.tileId)"
  :accent-style="iconStyle(tileMeta(placement.tileId).accent)"
  :alt="tileMeta(placement.tileId).label"
/>
```

For folder-like app tiles, render image icons when available and keep the folder preview grid when there is no image:

```vue
<AppIconVisual
  v-if="appIconImageUrl(placement.tileId)"
  class="home-app-icon home-folder-icon"
  :data-testid="`home-app-icon-${placement.tileId}`"
  :meta="tileMeta(placement.tileId)"
  :image-url="appIconImageUrl(placement.tileId)"
  :accent-style="iconStyle(tileMeta(placement.tileId).accent)"
  :alt="tileMeta(placement.tileId).label"
/>
```

For Dock buttons, add stable test IDs:

```vue
<AppIconVisual
  class="home-dock-icon-visual"
  data-testid="home-dock-icon-app_chat"
  :meta="dockAppMeta('app_chat')"
  :image-url="appIconImageUrl('app_chat')"
  :accent-style="iconStyle(dockAppMeta('app_chat').accent)"
  :alt="dockAppMeta('app_chat').label"
/>
```

- [x] **Step 4: Render notification icons through the shared component**

In `src/App.vue` and `src/views/LockScreen.vue`:

- import `AppIconVisual`;
- import/use `useGalleryStore` where missing;
- reuse the same preview resolution rule for `settings.appearance.appIconOverrides`;
- replace direct `<i :class="...icon">` notification icon markup with `AppIconVisual`.

- [x] **Step 5: Run focused tests**

Run:

```bash
npm.cmd run test -- tests/app-icon-presentation.test.js tests/app-store-ui.test.js tests/home-folder-entry.test.js
```

Expected: App Store UI tests may still fail until Task 4, but Home existing tests should not regress.

- [x] **Step 6: Commit renderer**

```bash
git add src/components/shared/AppIconVisual.vue src/views/HomeView.vue src/App.vue src/views/LockScreen.vue
git commit -m "feat: render shared image app icons"
```

---

### Task 4: App Store Identity Editor

**Files:**
- Modify: `src/views/AppStoreView.vue`
- Test: `tests/app-store-ui.test.js`

- [x] **Step 1: Import dependencies**

Add:

```js
import { nextTick, reactive, watch } from 'vue'
import AppIconVisual from '../components/shared/AppIconVisual.vue'
import { useGalleryStore } from '../stores/gallery'
import {
  APP_ICON_ACCENT_OPTIONS,
  APP_ICON_PRESET_OPTIONS,
  resolveAppAccentLabel,
  resolveAppIconMeta,
  resolveAppIconPresetLabel,
} from '../lib/app-icon-presentation'
```

Keep the existing `resolveAppIconMeta` import merged, not duplicated.

- [x] **Step 2: Add identity editor state**

Add:

```js
const galleryStore = useGalleryStore()
const identityEditorOpen = ref(false)
const identityFeedback = ref('')
const identityFileInput = ref(null)
const identityDraft = reactive({
  sourceType: 'preset',
  icon: '',
  accent: 'default',
  galleryAssetId: '',
})
```

Add `galleryIconAssets = computed(() => galleryStore.assets.slice(0, 120))`.

- [x] **Step 3: Add draft sync helpers**

Add helpers:

```js
const syncIdentityDraftFromSelectedApp = () => {
  const app = selectedApp.value
  if (!app) return
  const meta = resolveAppIconMeta(app.id, settings.value.appearance?.appIconOverrides || {}, locale.value)
  identityDraft.sourceType = meta.hasImageIcon ? 'gallery' : 'preset'
  identityDraft.icon = meta.icon
  identityDraft.accent = meta.accent
  identityDraft.galleryAssetId = meta.galleryAssetId || ''
  identityFeedback.value = ''
}

const openIdentityEditor = () => {
  syncIdentityDraftFromSelectedApp()
  identityEditorOpen.value = true
}

const closeIdentityEditor = () => {
  identityEditorOpen.value = false
}

const setIdentitySource = (sourceType) => {
  identityDraft.sourceType = sourceType === 'gallery' ? 'gallery' : 'preset'
}

const saveIdentityEditor = () => {
  if (!selectedApp.value) return
  const saved = systemStore.setAppIconOverride(selectedApp.value.id, {
    sourceType: identityDraft.sourceType,
    icon: identityDraft.icon,
    accent: identityDraft.accent,
    galleryAssetId: identityDraft.sourceType === 'gallery' ? identityDraft.galleryAssetId : '',
  })
  if (!saved) {
    identityFeedback.value = t('请选择可用的图标样式或图片。', 'Choose an available icon style or image.')
    return
  }
  systemStore.saveNow()
  identityFeedback.value = t('图标已更新。', 'Icon updated.')
  closeIdentityEditor()
}

const restoreIdentityDefault = () => {
  if (!selectedApp.value) return
  systemStore.clearAppIconOverride(selectedApp.value.id)
  systemStore.saveNow()
  syncIdentityDraftFromSelectedApp()
  identityFeedback.value = t('已恢复默认图标。', 'Default icon restored.')
  closeIdentityEditor()
}
```

- [x] **Step 4: Add local upload handler**

Add:

```js
const openIdentityUpload = () => {
  identityFileInput.value?.click()
}

const handleIdentityUpload = async (event) => {
  const files = event?.target?.files
  if (!files || files.length === 0) return
  const result = await galleryStore.importAssetsFromFiles(files, { category: 'reference' })
  if (event?.target) event.target.value = ''
  if (!result.ok) {
    identityFeedback.value = t('没有可用的图片文件。', 'No usable image file was imported.')
    return
  }
  const assetId = result.importedIds?.[0] || result.duplicateAssetIds?.[0] || ''
  if (!assetId) {
    identityFeedback.value = t('图片已跳过，请换一张。', 'Image was skipped. Try another one.')
    return
  }
  identityDraft.sourceType = 'gallery'
  identityDraft.galleryAssetId = assetId
  identityFeedback.value = t('图片已加入相册并设为待保存图标。', 'Image added to Gallery and selected for this icon.')
  await nextTick()
}
```

- [x] **Step 5: Add detail action button**

In both inline and sheet app details, add:

```vue
<button
  type="button"
  class="app-store-action"
  data-testid="app-store-open-identity"
  @click="openIdentityEditor"
>
  <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
  <span>{{ t('图标与外观', 'Icon & Appearance') }}</span>
</button>
```

- [x] **Step 6: Add identity editor sheet**

Add one root-level sheet after the existing app detail sheet:

```vue
<div v-if="identityEditorOpen" class="app-store-detail-backdrop" @click="closeIdentityEditor"></div>
<section v-if="identityEditorOpen && selectedApp" class="app-store-identity-sheet" data-testid="app-store-identity-sheet">
  ...
</section>
```

The sheet must include:

- large preview using `AppIconVisual`;
- source segmented buttons with `data-testid="app-store-identity-source-preset"` and `data-testid="app-store-identity-source-gallery"`;
- preset select `data-testid="app-store-identity-icon-preset"`;
- accent select `data-testid="app-store-identity-accent"`;
- Gallery asset select `data-testid="app-store-identity-gallery-asset"`;
- upload button and hidden file input `data-testid="app-store-identity-upload-input"`;
- restore button `data-testid="app-store-identity-restore"`;
- save button `data-testid="app-store-identity-save"`.

- [x] **Step 7: Add styles**

Keep the sheet product-like and compact:

- root-level bottom sheet on phone;
- side panel or centered sheet on wider screens;
- stable square preview;
- segmented controls for source type;
- no nested cards inside cards.

- [x] **Step 8: Run App Store tests**

Run:

```bash
npm.cmd run test -- tests/app-store-ui.test.js tests/app-icon-presentation.test.js
```

Expected: PASS.

- [x] **Step 9: Commit App Store editor**

```bash
git add src/views/AppStoreView.vue tests/app-store-ui.test.js
git commit -m "feat: edit app icons from app store"
```

---

### Task 5: Docs And Verification

**Files:**
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
- Modify: `docs/superpowers/plans/2026-06-01-app-store-app-identity.md`

- [x] **Step 1: Update visual handoff**

Add a landed item:

```md
48. App Store now owns app identity/icon editing: each app detail can open a focused Icon & Appearance sheet, choose a built-in glyph/accent, choose a Gallery image, upload a local image into Gallery for icon use, preview before saving, and restore default. Home, Dock, App Store, and supported notification surfaces resolve the same app identity.
```

- [x] **Step 2: Mark this plan complete**

Update every checkbox in this plan as work lands.

- [x] **Step 3: Run final checks**

Run:

```bash
npm.cmd run test -- tests/app-icon-presentation.test.js tests/app-store-ui.test.js tests/home-folder-entry.test.js tests/appearance-pack.test.js
npm.cmd run lint
npm.cmd run build
npm.cmd run test
git diff --check
git status --short
```

Expected:

- focused tests pass;
- lint passes;
- build passes with only known Vite import warnings if any;
- full test suite passes;
- only intentional files are changed before final commit.

- [x] **Step 4: Commit docs**

```bash
git add docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md docs/superpowers/plans/2026-06-01-app-store-app-identity.md
git commit -m "docs: record app store icon identity ownership"
```
