# Widget Center Visual Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Home beautification flow from "functionally usable" to a mobile-polished Widget Center experience built around visual thumbnails, easy custom widget editing, and fixed Home template slots.

**Architecture:** Keep Home as the system desktop layer and keep `组件 / Widgets` as the user-facing widget creation and editing entry. Template selection surfaces should use curated thumbnail effect images or CSS-drawn thumbnails; do not render every template card as a live iframe. Live iframe preview belongs in the custom editor draft and saved custom widget cards, where the user needs to verify actual code output.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, CSS grid, scoped CSS, project-local visual workflow docs.

---

## Current State For Handoff

The local branch is `main` and is currently ahead of `origin/main` by 4 commits. Before another machine starts, push or otherwise transfer these commits:

```text
8d51322 feat: add custom widget code starters
4c6b5b4 feat: refine home widget layout system
96ab06c perf: defer startup font and push work
14308d9 fix: remove blocking remote font import
```

The only untracked item on this machine after the latest implementation work was:

```text
artifacts/
```

Do not add `artifacts/` unless a later task explicitly explains what it contains and why it belongs in git.

Required docs to read before editing:

```text
docs/process/VISUAL_WORKFLOW.md
docs/process/DEVELOPMENT_TOOLING.md
docs/product-decisions/HOME_DESKTOP_LAYOUT_SYSTEM.md
docs/references/VISUAL_ASSET_LIBRARY.md
docs/process/NAVIGATION_RETURN_CONTRACT.md
```

Useful current files:

```text
src/views/WidgetsView.vue
src/lib/widget-style-presets.js
src/lib/home-layout-templates.js
src/lib/widget-schema.js
src/stores/system.js
src/views/HomeView.vue
src/views/AppearanceView.vue
tests/widgets-view-custom-template.test.js
tests/system-widget-import.test.js
tests/home-folder-entry.test.js
tests/home-layout-templates.test.js
```

Current product rules:

- Home is a system desktop, not a visible user-facing app.
- Visible app names should be discussed as `组件 / Widgets`, `外观 / Appearance`, `更多 / More`, etc.
- The Home model is Today View + 5 formal Home pages + persistent Dock.
- Formal Home pages use fixed templates over a 4 column x 6 row grid.
- Supported slot sizes are `1x1`, `2x1`, `2x2`, `4x1`, `4x2`, `4x3`, and `4x4`.
- Apps and folders are `1x1` only.
- Built-in widgets and custom widget instances must match the slot size exactly.
- Empty slots are invisible in normal mode and visible only in Home edit mode.
- `组件 / Widgets` is now in Dock by default; `相册 / Photos` is a normal Home entry by default.
- Custom widget code owns appearance only. Click behavior is configured in SchatPhone UI metadata.

Important correction for the next AI worker:

- Do not replace user-facing template cards with iframe code previews.
- Template selection should use thumbnail effect images or fast CSS thumbnail art.
- The live iframe preview belongs in the custom editor draft and saved custom widget library cards.

Baseline commands after checkout:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run lint
npm.cmd run build
git status --short --branch
```

Expected baseline after a clean checkout and after the 4 commits are present:

```text
npm.cmd test: all tests pass
npm.cmd run lint: pass
npm.cmd run build: pass, with the existing push.js dynamic/static import warning only
git status --short --branch: no modified tracked files
```

---

## File Structure For The Next Slice

Keep responsibilities split like this:

- `src/lib/widget-style-presets.js`
  - Owns official style preset data: ids, sizes, localized names, preview keys, icons, and starter code.
  - Add new preset metadata here, not inside `WidgetsView.vue`.
- `src/views/WidgetsView.vue`
  - Owns Widget Center UI, custom editor interaction, thumbnail rendering, draft preview, saved widget list, import UI, and Home edit entry buttons.
  - It may render thumbnails using preset `preview` keys, but should not contain long preset code strings.
- `tests/widgets-view-custom-template.test.js`
  - Owns Widget Center behavior tests for style starters, draft replacement confirmation, quick placeholder insertion, and future thumbnail/editor interactions.
- `docs/product-decisions/HOME_DESKTOP_LAYOUT_SYSTEM.md`
  - Update only when product semantics change.
- `docs/references/VISUAL_ASSET_LIBRARY.md`
  - Update only if a new external asset-library snapshot or path rule is recorded.

---

## Task 1: Confirm Remote Handoff And Baseline

**Files:**
- Modify: no source files

- [ ] **Step 1: Confirm current branch and commits**

Run:

```powershell
git status --short --branch
git log --oneline -6
```

Expected:

```text
main is ahead of origin/main by at least the commits listed in "Current State For Handoff", or those commits are already present on the remote branch.
```

- [ ] **Step 2: Push or pull as appropriate**

If this machine is handing off to another location, run:

```powershell
git push origin main
```

If this is the receiving machine, run:

```powershell
git pull --ff-only origin main
```

Expected:

```text
The receiving machine contains commits 8d51322 and 4c6b5b4, or newer commits that include the same work.
```

- [ ] **Step 3: Run the baseline**

Run:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected:

```text
Tests, lint, and build pass. The build may still report the known src/lib/push.js dynamic/static import warning.
```

- [ ] **Step 4: Commit**

No commit is needed for this task unless the receiving machine updates lock files after install. If `package-lock.json` changes unexpectedly, inspect it before committing; do not commit dependency churn as part of the visual slice.

---

## Task 2: Polish User-Facing Template Thumbnails, Not Code Previews

**Files:**
- Modify: `src/views/WidgetsView.vue`
- Modify: `src/lib/widget-style-presets.js`
- Test: `tests/widgets-view-custom-template.test.js`

Purpose:

The user chooses style starters by visual effect. Template starter cards should be fast, stable, market-like thumbnails. They should not be live iframes.

- [ ] **Step 1: Write the failing test**

Add this test to `tests/widgets-view-custom-template.test.js`:

```js
test('renders style starter thumbnails without iframe previews', async () => {
  useSystemStore().settings.system.language = 'en-US'
  const wrapper = await mountWidgetsView()

  await wrapper.findAll('.widgets-tab')[1].trigger('click')
  await nextTick()

  const starterCards = wrapper.findAll('.widgets-template-card')
  expect(starterCards.length).toBeGreaterThanOrEqual(6)
  expect(wrapper.find('.widgets-template-strip iframe').exists()).toBe(false)
  expect(starterCards.every((card) => card.find('.widgets-template-thumb').exists())).toBe(true)
  expect(starterCards.every((card) => card.text().match(/\d+x\d+/))).toBe(true)

  wrapper.unmount()
})
```

- [ ] **Step 2: Run the test to verify current behavior**

Run:

```powershell
npm.cmd test -- tests/widgets-view-custom-template.test.js
```

Expected:

```text
The new test should pass if the current thumbnail-only behavior is preserved. If it fails, the implementation has drifted toward iframe thumbnails and should be corrected.
```

- [ ] **Step 3: Improve thumbnail metadata only if needed**

If a new thumbnail variation is needed, add non-code metadata to `src/lib/widget-style-presets.js`. Use this shape:

```js
{
  id: 'soft_note',
  size: '2x2',
  preview: 'soft_note',
  icon: 'fas fa-note-sticky',
  nameZh: '柔雾便签',
  nameEn: 'Soft Note',
  code: `<style>
.sp-soft-note{width:100%;height:100%;box-sizing:border-box;padding:14px;border-radius:22px;background:linear-gradient(145deg,#f8f2e8,#c8d3d6);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#2f3438}
.sp-soft-note strong{display:block;font-size:18px}.sp-soft-note p{margin:8px 0 0;font-size:12px;line-height:1.35}
</style><div class="sp-soft-note"><strong>{{text:title}}</strong><p>{{text:caption}}</p></div>`,
}
```

Add matching thumbnail art in `WidgetsView.vue` by extending the existing `preset.preview` branches:

```vue
<span v-else-if="preset.preview === 'soft_note'" class="template-thumb-art is-soft-note"></span>
```

Add CSS:

```css
.template-thumb-art.is-soft-note {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.58) 0 28%, transparent 28%),
    linear-gradient(145deg, #f8f2e8, #c8d3d6);
}
```

- [ ] **Step 4: Run focused verification**

Run:

```powershell
npm.cmd test -- tests/widgets-view-custom-template.test.js tests/system-widget-import.test.js
npm.cmd run lint
```

Expected:

```text
Both test files pass and lint passes.
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/views/WidgetsView.vue src/lib/widget-style-presets.js tests/widgets-view-custom-template.test.js
git commit -m "feat: polish widget style thumbnails"
```

---

## Task 3: Make Custom Widget Placeholders More Understandable

**Files:**
- Modify: `src/views/WidgetsView.vue`
- Test: `tests/widgets-view-custom-template.test.js`

Purpose:

The editor already inserts `{{text:title}}`, `{{text:subtitle}}`, `{{text:caption}}`, and `<div data-cw-image="photo"></div>`. Improve the UI so the user understands these as editable widget placeholders rather than mysterious code fragments.

- [ ] **Step 1: Write the failing test**

Add this test to `tests/widgets-view-custom-template.test.js`:

```js
test('labels quick code snippets as editable placeholders', async () => {
  useSystemStore().settings.system.language = 'en-US'
  const wrapper = await mountWidgetsView()

  await wrapper.findAll('.widgets-tab')[1].trigger('click')
  await nextTick()

  expect(wrapper.find('.widgets-code-helper').text()).toContain('Placeholders')
  expect(wrapper.find('.widgets-code-helper').text()).toContain('editable text and image slots')

  wrapper.unmount()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm.cmd test -- tests/widgets-view-custom-template.test.js
```

Expected:

```text
FAIL because .widgets-code-helper does not exist yet.
```

- [ ] **Step 3: Add helper copy near the snippet buttons**

In `src/views/WidgetsView.vue`, inside the `Widget 内容 / Widget content` label before `.widgets-code-snippets`, add:

```vue
<small class="widgets-code-helper">
  {{ t('占位符会在组件里作为可编辑文字和图片位。', 'Placeholders become editable text and image slots inside the widget.') }}
</small>
```

Add CSS near `.widgets-code-snippets`:

```css
.widgets-code-helper {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
}
```

- [ ] **Step 4: Run the focused test**

Run:

```powershell
npm.cmd test -- tests/widgets-view-custom-template.test.js
```

Expected:

```text
PASS.
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/views/WidgetsView.vue tests/widgets-view-custom-template.test.js
git commit -m "feat: clarify widget code placeholders"
```

---

## Task 4: Add Field Configuration For Text Placeholders

**Files:**
- Modify: `src/views/WidgetsView.vue`
- Test: `tests/widgets-view-custom-template.test.js`

Purpose:

This is the next meaningful user-experience step. The editor can insert placeholders, but users should eventually edit common placeholder values from UI controls instead of hunting through code. Keep this as a local draft preview helper first; do not change persisted widget schema in this task.

Implementation shape:

- Detect placeholder tokens in `customWidgetCode`.
- Render simple inputs for `title`, `subtitle`, `caption`, `mood`, `name`, and `note` when present.
- Apply draft values only to `customWidgetDraftPreview.code`.
- Save the original code template unchanged for now.

- [ ] **Step 1: Write the failing test**

Add this test to `tests/widgets-view-custom-template.test.js`:

```js
test('previews text placeholder values without rewriting the saved code template', async () => {
  useSystemStore().settings.system.language = 'en-US'
  const wrapper = await mountWidgetsView()

  await wrapper.findAll('.widgets-tab')[1].trigger('click')
  await nextTick()

  await wrapper.find('.widgets-template-card').trigger('click')
  await nextTick()

  const titleField = wrapper.find('[data-testid="widget-placeholder-caption"]')
  expect(titleField.exists()).toBe(true)

  await titleField.setValue('Morning note')
  await nextTick()

  const iframeSrc = wrapper.find('.widgets-draft-preview iframe').attributes('srcdoc')
  expect(iframeSrc).toContain('Morning note')
  expect(wrapper.find('textarea').element.value).toContain('{{text:caption}}')

  wrapper.unmount()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm.cmd test -- tests/widgets-view-custom-template.test.js
```

Expected:

```text
FAIL because placeholder fields are not rendered yet.
```

- [ ] **Step 3: Add placeholder extraction helpers**

In `src/views/WidgetsView.vue`, add these refs and computed values near the existing custom widget draft computed values:

```js
const customWidgetPlaceholderValues = ref({})

const customWidgetTextPlaceholders = computed(() => {
  const code = customWidgetCode.value
  const matches = [...code.matchAll(/\{\{text:([a-zA-Z0-9_-]+)\}\}/g)]
  return [...new Set(matches.map((match) => match[1]))]
})

const customWidgetDraftCodeForPreview = computed(() => {
  let code = customWidgetCode.value.trim()
  customWidgetTextPlaceholders.value.forEach((key) => {
    const value = customWidgetPlaceholderValues.value[key]
    if (!value) return
    code = code.replaceAll(`{{text:${key}}}`, value)
  })
  return code
})
```

Change `customWidgetDraftPreview` to use `customWidgetDraftCodeForPreview.value`:

```js
const customWidgetDraftPreview = computed(() => ({
  size: customWidgetDraftSize.value,
  code: customWidgetDraftCodeForPreview.value,
}))
```

In `applyStylePresetToCustomForm`, reset draft values:

```js
customWidgetPlaceholderValues.value = {}
```

In `resetCustomWidgetForm`, reset draft values:

```js
customWidgetPlaceholderValues.value = {}
```

- [ ] **Step 4: Render placeholder fields**

In `src/views/WidgetsView.vue`, place this below the code textarea and before `.widgets-form-actions`:

```vue
<div v-if="customWidgetTextPlaceholders.length > 0" class="widgets-placeholder-fields">
  <label
    v-for="placeholder in customWidgetTextPlaceholders"
    :key="placeholder"
    class="widgets-field"
  >
    <span>{{ placeholder }}</span>
    <input
      v-model="customWidgetPlaceholderValues[placeholder]"
      type="text"
      :data-testid="`widget-placeholder-${placeholder}`"
      :placeholder="t('输入预览文字', 'Preview text')"
    />
  </label>
</div>
```

Add CSS:

```css
.widgets-placeholder-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
```

In the existing `@media (max-width: 380px)` block, add:

```css
.widgets-placeholder-fields {
  grid-template-columns: 1fr;
}
```

- [ ] **Step 5: Run focused verification**

Run:

```powershell
npm.cmd test -- tests/widgets-view-custom-template.test.js
npm.cmd run lint
```

Expected:

```text
Focused test and lint pass.
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/views/WidgetsView.vue tests/widgets-view-custom-template.test.js
git commit -m "feat: preview custom widget placeholder values"
```

---

## Task 5: Mobile Visual QA For Widgets

**Files:**
- Modify: `src/views/WidgetsView.vue` only if the QA finds layout issues
- Test: no new unit test unless behavior changes

Purpose:

The function is usable; the next risk is mobile density and readability. This task should be done with a running browser or mobile device.

- [ ] **Step 1: Start local dev server**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5188
```

Expected:

```text
Vite serves the app at http://127.0.0.1:5188/
```

- [ ] **Step 2: Inspect these routes**

Open:

```text
http://127.0.0.1:5188/#/widgets
http://127.0.0.1:5188/#/home?widgetEdit=1&homePage=0
http://127.0.0.1:5188/#/appearance
```

Check at mobile widths around `360x780`, `390x844`, and `430x932`.

Expected:

```text
No text overlaps.
No button label is clipped.
The style starter strip remains scannable.
The custom editor textarea remains reachable.
The live draft preview does not crowd out the form.
The Widgets Dock entry still returns to the correct Home page context.
```

- [ ] **Step 3: Fix only observed layout issues**

Prefer small CSS fixes in `src/views/WidgetsView.vue`. Examples:

```css
.widgets-template-strip {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.widgets-custom-composer {
  grid-template-columns: minmax(0, 1fr);
}
```

Do not redesign the whole surface in this task.

- [ ] **Step 4: Verify**

Run:

```powershell
npm.cmd run lint
npm.cmd test -- tests/widgets-view-custom-template.test.js tests/home-folder-entry.test.js
npm.cmd run build
```

Expected:

```text
All commands pass. The build may still show the known push.js warning.
```

- [ ] **Step 5: Commit**

If changes were made, run:

```powershell
git add src/views/WidgetsView.vue tests/widgets-view-custom-template.test.js
git commit -m "fix: polish widgets mobile layout"
```

If no changes were needed, do not create an empty commit.

---

## Task 6: Update Product Docs After The UX Direction Stabilizes

**Files:**
- Modify: `docs/product-decisions/HOME_DESKTOP_LAYOUT_SYSTEM.md`
- Optional Modify: `docs/design/DESIGN.md`

Purpose:

Only update docs after the UI direction is stable. Do not document every transient visual experiment.

- [ ] **Step 1: Update `HOME_DESKTOP_LAYOUT_SYSTEM.md` if placeholder fields ship**

Add this bullet under "Current implementation" in section 8:

```markdown
- Widget Center now provides starter style templates and quick placeholder insertion for custom widget code; placeholder field editing is preview-only until a persisted per-widget field-value model is introduced.
```

- [ ] **Step 2: Run documentation check**

Run:

```powershell
git diff --check
```

Expected:

```text
No trailing whitespace or conflict markers.
```

- [ ] **Step 3: Commit**

Run:

```powershell
git add docs/product-decisions/HOME_DESKTOP_LAYOUT_SYSTEM.md docs/design/DESIGN.md
git commit -m "docs: update widget center customization direction"
```

If `docs/design/DESIGN.md` was not changed, omit it from `git add`.

---

## Final Validation Before Handing Back

Run:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check
git status --short --branch
```

Expected:

```text
All tests pass.
Lint passes.
Build passes with only the known push.js warning.
No tracked files remain modified unless the user explicitly asked not to commit.
The branch is ahead of origin only by intentional commits.
```

Final handoff summary should include:

- which visible surfaces changed: `组件 / Widgets`, `主屏 / Home`, `外观 / Appearance` if touched;
- whether any product semantics changed;
- validation commands and outcomes;
- commit hashes;
- whether changes were pushed;
- any remaining untracked files such as `artifacts/`.
