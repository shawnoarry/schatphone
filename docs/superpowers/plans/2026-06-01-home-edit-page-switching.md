# Home Edit Page Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users switch Home screens while they are in Home edit mode, including the Widget Center return flow.

**Architecture:** Keep Home as the only owner of screen and slot placement. Change `HomeView.vue` so edit mode still supports page-dot navigation and empty-area swipe navigation, while edit controls, sheets, and Dock icons do not accidentally open apps. Cover the behavior with Vue unit tests around Home edit mode.

**Tech Stack:** Vue 3, Vue Router, Pinia, Vitest, Vue Test Utils, scoped CSS.

---

## Scope Check

This plan implements Package 1 from `docs/superpowers/specs/2026-06-01-appearance-app-store-food-design.md`.

Out of scope:

- Edge-drag page switching while carrying a tile.
- Appearance cleanup.
- App Store icon customization.
- Per-app skin ownership.
- Food Delivery store mini-app work.

## File Structure

- Modify `src/views/HomeView.vue`
  - Add stable page-dot test IDs.
  - Allow edit-mode page-dot clicks.
  - Track page swipe gestures in edit mode when the gesture starts from the Home background.
  - Keep Dock app buttons inactive while editing.
- Modify `tests/home-folder-entry.test.js`
  - Add coverage for edit-mode page-dot switching.
  - Add coverage for edit-mode swipe switching.
  - Add coverage for placing a library candidate after switching screens.
- Modify `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
  - Record the Home edit mode behavior change after implementation.

---

### Task 1: Add Failing Home Edit Mode Tests

**Files:**
- Modify: `tests/home-folder-entry.test.js`

- [ ] **Step 1: Add tests for edit-mode page switching**

Append these tests near the existing Home edit-mode tests in `tests/home-folder-entry.test.js`, after `shows neutral Home layout templates in edit mode and saves the current page choice`.

```js
  test('switches Home pages from page dots while staying in edit mode', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=1')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    expect(wrapper.find('.home-edit-topbar').exists()).toBe(true)
    expect(wrapper.get('[data-testid="home-page-dot-1"]').classes()).toContain('is-active')

    await wrapper.get('[data-testid="home-page-dot-3"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-edit-topbar').exists()).toBe(true)
    expect(wrapper.get('[data-testid="home-page-dot-3"]').classes()).toContain('is-active')
    expect(wrapper.get('[data-testid="home-page-dot-1"]').classes()).not.toContain('is-active')

    wrapper.unmount()
  })

  test('swipes between Home pages while staying in edit mode', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=1')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    const shell = wrapper.get('.home-shell')
    await shell.trigger('touchstart', {
      changedTouches: [{ clientX: 300, clientY: 520 }],
      target: shell.element,
    })
    await shell.trigger('touchmove', {
      changedTouches: [{ clientX: 220, clientY: 520 }],
      target: shell.element,
    })
    await shell.trigger('touchend')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-edit-topbar').exists()).toBe(true)
    expect(wrapper.get('[data-testid="home-page-dot-2"]').classes()).toContain('is-active')

    wrapper.unmount()
  })

  test('places a library item after switching pages in Home edit mode', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=1&libraryTile=app_gallery')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])
    store.setHomeLayoutTemplate(4, 'layout-b')

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="home-library-candidate-app_gallery"]').classes()).toContain('is-active')

    await wrapper.get('[data-testid="home-page-dot-4"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-testid="home-empty-slot-4-b-small-1"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeWidgetPages[4]).toContain('app_gallery')
    expect(store.settings.appearance.homeLayoutSlotPlacements[4]).toContainEqual({
      slotId: 'b-small-1',
      tileId: 'app_gallery',
    })
    expect(wrapper.find('[data-home-tile-id="app_gallery"]').exists()).toBe(true)

    wrapper.unmount()
  })
```

- [ ] **Step 2: Run the focused test file and verify failure**

Run:

```bash
npm run test -- tests/home-folder-entry.test.js
```

Expected result:

- FAIL because `home-page-dot-*` test IDs do not exist yet.
- The swipe test remains on the original page because edit mode currently ignores touch paging.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/home-folder-entry.test.js
git commit -m "test: cover home edit page switching"
```

---

### Task 2: Add Edit-Mode Swipe State And Page-Dot Test IDs

**Files:**
- Modify: `src/views/HomeView.vue`

- [ ] **Step 1: Add swipe state and shared threshold**

In `src/views/HomeView.vue`, near the current touch refs:

```js
const currentPage = ref(DEFAULT_HOME_RETURN_PAGE)
const touchStartX = ref(0)
const touchDeltaX = ref(0)
const touchPageSwipeEnabled = ref(false)
```

Near the current long-press constants, add:

```js
const PAGE_SWIPE_THRESHOLD = 48
```

- [ ] **Step 2: Add edit-mode swipe gating helpers**

Place these helpers near `canStartLayoutLongPress`:

```js
const canStartHomePageSwipe = (event) => {
  if (!layoutEditMode.value) return true
  const target = event?.target
  if (!(target instanceof HTMLElement)) return true
  return !target.closest(
    '.home-edit-topbar, .home-content-library, .home-slot-content-sheet, .home-template-picker, .home-bottom-area, [data-no-layout-longpress]',
  )
}

const completeHomePageSwipe = () => {
  if (touchDeltaX.value <= -PAGE_SWIPE_THRESHOLD) {
    setPage(currentPage.value + 1)
  } else if (touchDeltaX.value >= PAGE_SWIPE_THRESHOLD) {
    setPage(currentPage.value - 1)
  }
  touchDeltaX.value = 0
  touchPageSwipeEnabled.value = false
}
```

- [ ] **Step 3: Update the touch handlers**

Replace the existing touch handlers with:

```js
const onTouchStart = (event) => {
  const touch = event.changedTouches?.[0]
  if (!touch) return

  touchStartX.value = touch.clientX
  touchDeltaX.value = 0
  touchPageSwipeEnabled.value = canStartHomePageSwipe(event)

  if (layoutEditMode.value) return

  scheduleLongPress(event, touch.clientX, touch.clientY)
}

const onTouchMove = (event) => {
  const touch = event.changedTouches?.[0]
  if (!touch) return

  maybeCancelLongPressByMove(touch.clientX, touch.clientY)
  if (!touchPageSwipeEnabled.value || hasActiveDrag.value) return

  touchDeltaX.value = touch.clientX - touchStartX.value
}

const onTouchEnd = () => {
  clearLongPressTimer()

  if (!touchPageSwipeEnabled.value || hasActiveDrag.value) {
    touchDeltaX.value = 0
    touchPageSwipeEnabled.value = false
    return
  }

  completeHomePageSwipe()
}

const onTouchCancel = () => {
  clearLongPressTimer()
  touchDeltaX.value = 0
  touchPageSwipeEnabled.value = false
}
```

- [ ] **Step 4: Add page-dot test IDs**

In the Home bottom page dots template, update the left dot and normal dots:

```vue
        <button
          class="home-left-dot"
          :class="{ 'is-active': currentPage === LEFT_HOME_PAGE_INDEX }"
          data-testid="home-page-dot-left"
          @click="setPage(LEFT_HOME_PAGE_INDEX)"
          :aria-label="t('前往今日视图', 'Go to Today View')"
        ></button>
```

```vue
        <button
          v-for="index in totalPages"
          :key="index"
          class="home-dot"
          :class="{ 'is-active': currentPage === index - 1 }"
          :data-testid="`home-page-dot-${index - 1}`"
          @click="setPage(index - 1)"
          :aria-label="`${t('前往第', 'Go to page ')}${index}${t('页', '')}`"
        ></button>
```

- [ ] **Step 5: Run the focused test file**

Run:

```bash
npm run test -- tests/home-folder-entry.test.js
```

Expected result:

- Page-dot and swipe behavior tests pass or only CSS-related user-clickability remains unverified.

- [ ] **Step 6: Commit the Home event changes**

```bash
git add src/views/HomeView.vue tests/home-folder-entry.test.js
git commit -m "feat: allow home edit page switching"
```

---

### Task 3: Restore Edit-Mode Page-Dot Clickability Without Re-Enabling Dock Apps

**Files:**
- Modify: `src/views/HomeView.vue`

- [ ] **Step 1: Replace the editing bottom-area CSS**

Replace the current rule:

```css
.home-bottom-area.is-editing {
  opacity: 0.54;
  pointer-events: none;
}
```

with:

```css
.home-bottom-area.is-editing {
  opacity: 0.78;
  pointer-events: auto;
}

.home-bottom-area.is-editing .home-page-dots {
  pointer-events: auto;
}

.home-bottom-area.is-editing .home-dock {
  opacity: 0.54;
  pointer-events: none;
}
```

- [ ] **Step 2: Run the focused tests**

Run:

```bash
npm run test -- tests/home-folder-entry.test.js
```

Expected result:

- PASS for the focused file.

- [ ] **Step 3: Commit the CSS behavior change**

```bash
git add src/views/HomeView.vue
git commit -m "style: keep home page dots usable while editing"
```

---

### Task 4: Update Visual Governance Notes

**Files:**
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

- [ ] **Step 1: Add a status note**

Add a new numbered entry in the current landed-status list:

```md
40. Home edit mode now preserves screen navigation: page dots stay usable during editing, empty-area swipes can switch screens, and Widget Center placement flows no longer trap users on the entry screen.
```

If the list already has a `40`, use the next available number.

- [ ] **Step 2: Add a follow-up note if the file has a next-steps section**

Add this sentence to the relevant next-steps section:

```md
Home cross-screen drag placement remains a separate polish item; the shipped baseline is explicit screen switching before slot placement.
```

- [ ] **Step 3: Commit the docs update**

```bash
git add docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md
git commit -m "docs: note home edit page switching"
```

---

### Task 5: Final Validation

**Files:**
- No source changes unless validation finds a real regression.

- [ ] **Step 1: Run lint**

Run:

```bash
npm run lint
```

Expected result:

- PASS with no new lint errors.

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected result:

- PASS and Vite production build completes.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm run test -- tests/home-folder-entry.test.js tests/appearance-wallpaper-picker.test.js
```

Expected result:

- PASS. `appearance-wallpaper-picker.test.js` verifies the Appearance entry still opens Home edit mode with the selected page.

- [ ] **Step 4: Run the full unit suite**

Run:

```bash
npm run test
```

Expected result:

- PASS.

- [ ] **Step 5: Final commit if validation required small fixes**

If validation required fixes, commit them:

```bash
git add src/views/HomeView.vue tests/home-folder-entry.test.js docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md
git commit -m "fix: stabilize home edit page switching"
```

If validation required no fixes, do not create an empty commit.

---

## Self-Review Checklist

- Spec coverage: Package 1 requirements are covered by Tasks 1-5.
- Open-item scan: The plan contains no unresolved implementation gaps.
- Type consistency: The plan uses existing `HomeView.vue` state names and adds only `touchPageSwipeEnabled`, `PAGE_SWIPE_THRESHOLD`, `canStartHomePageSwipe`, and `completeHomePageSwipe`.
- Risk check: The Dock remains inactive in edit mode, while page dots remain clickable.
