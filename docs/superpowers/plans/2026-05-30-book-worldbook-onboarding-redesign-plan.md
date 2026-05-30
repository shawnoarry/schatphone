# Book WorldBook Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Book and Settings -> WorldBook understandable as a library plus activation control flow, with explicit import/export confirmations and system fallback copy-to-Book behavior.

**Architecture:** Keep the current stores and routes. Implement the first slice inside `BookView.vue` and `WorldBookView.vue`, adding only small computed state and UI helpers. Use the existing `useDialog()` service for import/export/copy confirmations and preserve `world-interface` as the source of compiled active context.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils, Playwright for later browser checks.

---

## File Structure

- Modify: `src/views/BookView.vue`
  - Move import/export execution behind confirmation dialogs.
  - Show WorldBook usage for the selected asset.
  - Keep read mode as the default and keep editing explicit.
- Modify: `src/views/WorldBookView.vue`
  - Add a first-use/source setup card when no Book source is linked.
  - Add a System fallback source presentation.
  - Add `Copy to Book` / `复制到文本库` behavior that creates a draft Book asset without linking it automatically.
  - Keep source links, diff review, world pack, knowledge points, and templates on the existing route.
- Modify: `tests/book-view.test.js`
  - Update import/export tests for dialog confirmation.
  - Add a test for WorldBook usage summary inside Book detail.
- Modify: `tests/worldbook-book-source-picker.test.js`
  - Add tests for fallback display and copying fallback text into Book.
- Modify: `docs/roadmap/TODO_ROADMAP.md`
  - Note the V1 IA improvement and App Store progressive-disclosure follow-up.

## Task 1: Book Import/Export Dialog Tests

**Files:**
- Modify: `tests/book-view.test.js`

- [ ] **Step 1: Add dialog reset/imports to the test**

Add the dialog service imports near the top:

```js
import { dialogState, resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
```

Update `beforeEach` so dialog state never leaks between tests:

```js
beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-29T10:00:00.000Z'))
  setActivePinia(createPinia())
  resetDialogServiceForTest()
  useSystemStore().settings.system.language = 'en-US'
})
```

- [ ] **Step 2: Update the successful import test to require confirmation**

Replace the import assertion flow with:

```js
await input.trigger('change')
await flushPromises()
await nextTick()

expect(store.assetCount).toBe(0)
expect(dialogState.visible).toBe(true)
expect(dialogState.title).toContain('Import')

useDialog().submitDialog()
await flushPromises()
await nextTick()

expect(store.assetCount).toBe(1)
expect(wrapper.get('[data-testid="book-import-feedback"]').text()).toContain('imported')
expect(wrapper.get('[data-testid="book-detail"]').text()).toContain('source')
```

- [ ] **Step 3: Add an import cancel test**

Add this test after the successful import test:

```js
test('canceling import confirmation leaves the library unchanged', async () => {
  const store = useBookStore()
  const { wrapper } = await mountBookView()
  const file = {
    name: 'source.md',
    type: 'text/markdown',
    size: 128,
    text: vi.fn(async () => '# Source\n\nImported text.'),
  }

  const input = wrapper.get('[data-testid="book-import-input"]')
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  })
  await input.trigger('change')
  await flushPromises()
  await nextTick()

  expect(dialogState.visible).toBe(true)
  useDialog().cancelDialog()
  await flushPromises()
  await nextTick()

  expect(store.assetCount).toBe(0)
  expect(file.text).not.toHaveBeenCalled()
})
```

- [ ] **Step 4: Update export test to require confirmation**

After triggering export, assert the dialog appears, then submit it:

```js
await wrapper.get('[data-testid="book-export"]').trigger('click')

expect(dialogState.visible).toBe(true)
expect(dialogState.title).toContain('Export')
expect(createObjectURL).not.toHaveBeenCalled()

useDialog().submitDialog()
await flushPromises()

expect(createObjectURL).toHaveBeenCalledTimes(1)
expect(clickSpy).toHaveBeenCalledTimes(1)
expect(revokeObjectURL).toHaveBeenCalledWith('blob:book-export')
```

- [ ] **Step 5: Run the focused Book test**

Run:

```powershell
npm.cmd test -- tests/book-view.test.js
```

Expected: FAIL before implementation because import/export still execute without dialog confirmation.

## Task 2: Book Import/Export Confirmation And Usage Summary

**Files:**
- Modify: `src/views/BookView.vue`

- [ ] **Step 1: Add System store and full dialog API**

Change imports and setup:

```js
import { useSystemStore } from '../stores/system'
```

Replace the store/dialog setup with:

```js
const bookStore = useBookStore()
const systemStore = useSystemStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()
```

- [ ] **Step 2: Add selected asset WorldBook usage computed state**

Add after `selectedTags`:

```js
const selectedWorldBookLinks = computed(() => {
  const asset = selectedAsset.value
  if (!asset) return []
  return systemStore
    .listWorldBookSourceLinks()
    .filter((link) => link.assetId === asset.id)
})

const selectedWorldBookUsageSummary = computed(() => {
  const links = selectedWorldBookLinks.value
  if (links.length === 0) return ''
  const activeCount = links.filter((link) => link.enabled !== false).length
  return t(
    `${activeCount} 个启用引用，${links.length} 个总引用`,
    `${activeCount} active links, ${links.length} total links`,
  )
})
```

- [ ] **Step 3: Update import to confirm selected file before reading**

Replace `importFile` with:

```js
const importFile = async (event) => {
  const file = event?.target?.files?.[0]
  if (event?.target) event.target.value = ''
  if (!file || typeof file.text !== 'function') return

  const confirmed = await confirmDialog({
    title: t('导入文本来源', 'Import text source'),
    message: t('确认把这个文件导入文本库吗？导入后仍需在 WorldBook 中启用才会影响上下文。', 'Import this file into Book? It will only affect context after you enable it in WorldBook.'),
    details: [
      `${t('文件', 'File')}: ${file.name || 'source'}`,
      `${t('类型', 'Type')}: ${file.type || t('未知', 'Unknown')}`,
      `${t('大小', 'Size')}: ${Number(file.size || 0)} B`,
    ],
    confirmText: t('导入', 'Import'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (!confirmed) return

  const content = await file.text()
  const result = bookStore.importTextAsset({
    fileName: file.name,
    mimeType: file.type || '',
    content,
  })
  if (!result.ok) {
    importFeedbackTone.value = 'error'
    importFeedback.value = result.message || t('导入失败。', 'Import failed.')
    return
  }
  selectedAssetId.value = result.asset.id
  editMode.value = false
  importFeedbackTone.value = 'success'
  importFeedback.value = t('已导入文本来源。', 'Text source imported.')
}
```

- [ ] **Step 4: Update export to confirm before download**

Replace `exportSelected` with:

```js
const exportSelected = async () => {
  const asset = selectedAsset.value
  if (!asset) return
  const confirmed = await confirmDialog({
    title: t('导出文本来源', 'Export text source'),
    message: t('确认导出当前文本来源吗？导出的文件可在其他设备导入 Book。', 'Export this text source? The file can be imported into Book on another device.'),
    details: [
      `${t('标题', 'Title')}: ${asset.title}`,
      `${t('字数', 'Chars')}: ${asset.content.length}`,
      `${t('格式', 'Format')}: .worldbook.json`,
    ],
    confirmText: t('导出', 'Export'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (!confirmed) return
  const payload = bookStore.exportAsset(asset.id)
  if (!payload) return
  const downloaded = downloadExportPayload(asset, payload)
  importFeedbackTone.value = 'success'
  importFeedback.value = t('已生成导出数据。', 'Export data prepared.')
  if (downloaded) {
    importFeedback.value = t('已下载文本库导出文件。', 'Book export downloaded.')
  }
}
```

- [ ] **Step 5: Add WorldBook usage UI to Book detail**

Add after `.book-meta-row`:

```vue
<div v-if="selectedWorldBookLinks.length > 0" class="book-usage-card" data-testid="book-worldbook-usage">
  <div>
    <strong>{{ t('正在被 WorldBook 使用', 'Used by WorldBook') }}</strong>
    <span>{{ selectedWorldBookUsageSummary }}</span>
  </div>
  <button type="button" class="book-secondary-button" @click="router.push({ path: '/worldbook', query: { from: 'settings' } })">
    {{ t('查看启用设置', 'View activation') }}
  </button>
</div>
```

Add scoped CSS:

```css
.book-usage-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-surface-muted);
}

.book-usage-card div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.book-usage-card strong {
  font-size: 13px;
  color: var(--system-text);
}

.book-usage-card span {
  font-size: 12px;
  color: var(--system-text-muted);
}
```

- [ ] **Step 6: Run the focused Book test**

Run:

```powershell
npm.cmd test -- tests/book-view.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit Book slice**

```powershell
git add src/views/BookView.vue tests/book-view.test.js
git commit -m "feat: confirm book import export flows"
```

## Task 3: WorldBook Fallback And Copy-To-Book Tests

**Files:**
- Modify: `tests/worldbook-book-source-picker.test.js`

- [ ] **Step 1: Import Book store if missing**

Ensure the test file has:

```js
import { useBookStore } from '../src/stores/book'
import { dialogState, resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
```

Add `resetDialogServiceForTest()` to its `beforeEach`.

- [ ] **Step 2: Add a test for fallback display without creating Book assets**

Add:

```js
test('shows system fallback without creating a Book asset', async () => {
  const systemStore = useSystemStore()
  const bookStore = useBookStore()
  systemStore.settings.system.language = 'en-US'
  systemStore.setGlobalWorldview('Fallback city rules.')

  const { wrapper } = await mountWorldBook()

  const fallback = wrapper.get('[data-testid="worldbook-system-fallback"]')
  expect(fallback.text()).toContain('System fallback')
  expect(fallback.text()).toContain('Fallback city rules')
  expect(bookStore.assetCount).toBe(0)
  expect(wrapper.get('[data-testid="worldbook-onboarding-card"]').text()).toContain('Start with a source')

  wrapper.unmount()
})
```

- [ ] **Step 3: Add a test for copying fallback to Book**

Add:

```js
test('copies system fallback into Book as a draft asset', async () => {
  const systemStore = useSystemStore()
  const bookStore = useBookStore()
  systemStore.settings.system.language = 'en-US'
  systemStore.setGlobalWorldview('Fallback city rules.')

  const { wrapper, router } = await mountWorldBook()

  await wrapper.get('[data-testid="worldbook-copy-fallback-to-book"]').trigger('click')
  expect(dialogState.visible).toBe(true)
  expect(dialogState.title).toContain('Copy')

  useDialog().submitDialog()
  await flushPromises()
  await nextTick()

  expect(bookStore.assetCount).toBe(1)
  const asset = bookStore.assets[0]
  expect(asset).toMatchObject({
    assetType: 'worldbook_document',
    status: 'draft',
  })
  expect(asset.content).toContain('Fallback city rules.')
  expect(asset.source.kind).toBe('worldbook_fallback_copy')
  expect(systemStore.listWorldBookSourceLinks()).toHaveLength(0)
  expect(router.currentRoute.value.path).toBe('/book')
  expect(router.currentRoute.value.query.asset).toBe(asset.id)

  wrapper.unmount()
})
```

- [ ] **Step 4: Run the focused WorldBook source tests**

Run:

```powershell
npm.cmd test -- tests/worldbook-book-source-picker.test.js
```

Expected: FAIL before implementation because fallback UI and copy action do not exist.

## Task 4: WorldBook Onboarding Card And Fallback Copy

**Files:**
- Modify: `src/views/WorldBookView.vue`

- [ ] **Step 1: Add setup/fallback computed state**

Add near other computed state:

```js
const fallbackWorldviewPreview = computed(() => {
  const text = String(globalWorldview.value || '').trim().replace(/\s+/g, ' ')
  if (!text) return t('还没有写入系统 fallback 世界观。', 'No system fallback worldview has been written yet.')
  return text.length > 140 ? `${text.slice(0, 140)}...` : text
})

const hasBookSourceLinks = computed(() => linkedBookSources.value.length > 0)

const showWorldBookOnboarding = computed(() => !hasBookSourceLinks.value)
```

- [ ] **Step 2: Add copy fallback behavior**

Add this function near source link actions:

```js
const copyFallbackWorldviewToBook = async () => {
  const content = String(globalWorldview.value || '').trim()
  if (!content) {
    uiNotice.value = t('请先写入系统 fallback 世界观，再复制到文本库。', 'Write a system fallback worldview before copying it to Book.')
    return
  }

  const confirmed = await confirmDialog({
    title: t('复制到文本库', 'Copy to Book'),
    message: t('这会创建一份可编辑的文本库副本，不会覆盖当前 Settings fallback，也不会自动启用。', 'This creates an editable Book copy. It will not overwrite the Settings fallback or become active automatically.'),
    details: [
      `${t('字数', 'Chars')}: ${content.length}`,
      t('复制后可在 Book 中编辑，再回到 WorldBook 启用。', 'After copying, edit it in Book and return to WorldBook to enable it.'),
    ],
    confirmText: t('复制', 'Copy'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (!confirmed) return

  const asset = bookStore.createAsset({
    title: t('系统世界观副本', 'System worldview copy'),
    assetType: 'worldbook_document',
    format: content.startsWith('#') ? 'markdown' : 'plain',
    content,
    status: 'draft',
    source: {
      kind: 'worldbook_fallback_copy',
      copiedAt: Date.now(),
    },
  })
  bookStore.saveNow()
  router.push({
    path: BOOK_ROUTE,
    query: {
      from: 'settings',
      asset: asset.id,
    },
  })
}
```

- [ ] **Step 3: Add onboarding card before active source management**

Place after `CurrentWorldPackPanel` and before `worldbook-book-sources`:

```vue
<section
  v-if="showWorldBookOnboarding"
  class="worldbook-onboarding-card"
  data-testid="worldbook-onboarding-card"
>
  <div>
    <p>{{ t('首次设置', 'First setup') }}</p>
    <h2>{{ t('先选择一个会影响上下文的来源', 'Start with a source') }}</h2>
    <span>
      {{ t('文本库负责保存和编辑，WorldBook 负责决定是否启用。', 'Book stores and edits text; WorldBook decides whether it is active.') }}
    </span>
  </div>
  <div class="worldbook-onboarding-actions">
    <button type="button" class="worldbook-primary-action" @click="addFirstBookSource">
      {{ sourcePickerAssets.length > 0 ? t('从文本库选择', 'Choose from Book') : t('打开文本库', 'Open Book') }}
    </button>
    <button type="button" class="worldbook-secondary-action" data-testid="worldbook-copy-fallback-to-book" @click="copyFallbackWorldviewToBook">
      {{ t('复制 fallback 到文本库', 'Copy fallback to Book') }}
    </button>
  </div>
</section>
```

- [ ] **Step 4: Add system fallback row inside source section**

Place at the top of the `worldbook-book-sources` section body, after the heading:

```vue
<div class="worldbook-system-fallback" data-testid="worldbook-system-fallback">
  <div>
    <p>{{ t('系统 fallback', 'System fallback') }}</p>
    <strong>{{ worldBookCount }} {{ t('字', 'chars') }}</strong>
    <span>{{ fallbackWorldviewPreview }}</span>
  </div>
  <button type="button" class="worldbook-secondary-action" data-testid="worldbook-copy-fallback-to-book-inline" @click="copyFallbackWorldviewToBook">
    {{ t('复制到文本库', 'Copy to Book') }}
  </button>
</div>
```

- [ ] **Step 5: Add styles**

Add to scoped style:

```css
.worldbook-onboarding-card,
.worldbook-system-fallback {
  display: grid;
  gap: 12px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.worldbook-onboarding-card {
  padding: 16px;
}

.worldbook-onboarding-card p,
.worldbook-system-fallback p {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--system-text-muted);
}

.worldbook-onboarding-card h2 {
  margin: 4px 0;
  font-size: 18px;
  line-height: 1.25;
  color: var(--system-text);
}

.worldbook-onboarding-card span,
.worldbook-system-fallback span {
  color: var(--system-text-muted);
}

.worldbook-onboarding-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.worldbook-system-fallback {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  padding: 12px;
  background: var(--system-surface-muted);
}

.worldbook-system-fallback div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.worldbook-system-fallback strong {
  color: var(--system-text);
}

@media (max-width: 520px) {
  .worldbook-system-fallback {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Run focused WorldBook source tests**

Run:

```powershell
npm.cmd test -- tests/worldbook-book-source-picker.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit WorldBook slice**

```powershell
git add src/views/WorldBookView.vue tests/worldbook-book-source-picker.test.js
git commit -m "feat: guide worldbook source setup"
```

## Task 5: Roadmap Sync And Regression Checks

**Files:**
- Modify: `docs/roadmap/TODO_ROADMAP.md`

- [ ] **Step 1: Update the 4.6 implementation note**

Add one bullet to the current Book/WorldBook status note:

```md
- Book / WorldBook IA is being tightened around a first-use source setup path: system fallback stays outside Book until copied, Book import/export uses confirmation surfaces, and active Book usage is shown from the text library detail view.
```

- [ ] **Step 2: Add App Store progressive-disclosure follow-up**

Add one sentence under remaining task structure:

```md
5. revisit App Store detail presentation if the app library grows beyond the V1 same-screen list/detail/action layout; long app lists should move detail into a drawer, modal detail, or route instead of stretching the main screen.
```

- [ ] **Step 3: Run focused tests**

Run:

```powershell
npm.cmd test -- tests/book-view.test.js tests/worldbook-book-source-picker.test.js tests/worldbook-functional-ia.test.js tests/chat-worldbook-binding-visibility.test.js tests/simulation-world-context.test.js
```

Expected: PASS.

- [ ] **Step 4: Run release checks**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: PASS. Existing Vite warnings about chunk size or duplicate emitted file names are acceptable only if they match the current baseline.

- [ ] **Step 5: Commit docs and validation cleanup**

```powershell
git add docs/roadmap/TODO_ROADMAP.md
git commit -m "docs: sync book worldbook ia status"
```

## Self-Review

Spec coverage:

- First-time guided path: Task 4 adds onboarding card.
- System fallback not in Book by default: Task 3 tests asset count stays zero; Task 4 only presents fallback in WorldBook.
- Copy fallback to Book: Task 3 test and Task 4 implementation create a draft Book asset.
- No auto-sync/auto-enable: Task 3 asserts no source links are created and asset status is draft.
- Book import/export confirmation: Task 1 tests and Task 2 implementation use `confirmDialog`.
- Book library usage visibility: Task 2 adds selected asset WorldBook usage.
- App Store progressive disclosure: Task 5 records follow-up without expanding scope.

Placeholder scan:

- No `TBD`, `TODO`, or unspecified implementation steps are left in this plan.

Type consistency:

- `worldbook_fallback_copy` is only source metadata and does not require schema expansion because Book source metadata is pass-through.
- `selectedWorldBookLinks`, `fallbackWorldviewPreview`, `showWorldBookOnboarding`, and `copyFallbackWorldviewToBook` are local view helpers and do not change store contracts.

