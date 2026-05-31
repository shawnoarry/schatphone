# World Pack Activation App Store Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WorldBook activate World Packs and hand users to App Store/Chat surfaces instead of acting as a launcher or service-account generator.

**Architecture:** Keep WorldBook as the activation/readiness surface, route world-app discovery through App Store's existing world-entry source, and keep service-account creation deferred to Chat. Guard ambiguous templates in the registry so AI review cannot silently confirm black market as Shopping.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils, existing SchatPhone stores and world-pack helpers.

---

## File Structure

- Modify `src/components/worldbook/CurrentWorldPackPanel.vue`
  - Split active-pack summary from selected-pack activation preview.
  - Replace per-app launch rows with count/status handoff cards.
  - Replace direct service-account generation rows with count-only Chat handoff.
  - Collapse nonstandard app proposal review behind an advanced disclosure.
- Modify `src/views/WorldBookView.vue`
  - Replace `open-app-binding`, `create-service-template`, and `open-service-contact` usage with App Store/Chat handoff events.
  - Push `/app-store?section=world&from=worldbook` when users choose App Store handoff.
  - Preserve existing activation, review, and proposal-confirm behavior.
- Modify `src/views/AppStoreView.vue`
  - Initialize the filter from `route.query.section=world`.
  - Add stable test ids for App Store filters.
  - Keep existing world-app open/Home placement behavior.
- Modify `src/lib/world-app-template-registry.js`
  - Mark `black_market` as requiring a dedicated app and reject it with `needs_dedicated_app`.
  - Include the unsupported state in registry copies and prompt wording.
- Modify tests:
  - `tests/worldbook-functional-ia.test.js`
  - `tests/app-store-ui.test.js`
  - `tests/world-app-template-registry.test.js`
- Sync docs:
  - `docs/overview/PROJECT_MASTER_GUIDE.md`
  - `docs/roadmap/TODO_ROADMAP.md`
  - `docs/pm/TODO_PM_STATUS_REPORT.md`
  - relevant visual/module/chat package docs if behavior wording changes.

---

### Task 1: Write Failing Tests For WorldBook Handoff

**Files:**
- Modify: `tests/worldbook-functional-ia.test.js`

- [ ] **Step 1: Update the activation test expectations**

Replace the direct launcher/service-generation assertions in `reviews and activates a built-in world pack from WorldBook` with expectations that:

```js
expect(wrapper.get('[data-testid="worldbook-current-pack-active-summary"]').text()).toContain('Supply Board')
expect(wrapper.get('[data-testid="worldbook-current-pack-active-summary"]').text()).toContain('3')
expect(wrapper.find('[data-testid="worldbook-current-pack-open-app-survival_supply_board"]').exists()).toBe(false)
expect(wrapper.find('[data-testid="worldbook-current-pack-create-service-survival_supply_dispatch"]').exists()).toBe(false)
expect(wrapper.get('[data-testid="worldbook-current-pack-service-handoff"]').text()).toContain('1')
expect(wrapper.get('[data-testid="worldbook-current-pack-service-handoff"]').text()).toContain('Chat')

await wrapper.get('[data-testid="worldbook-current-pack-open-app-store"]').trigger('click')
await flushPromises()

expect(wrapper.vm.$router.currentRoute.value.path).toBe('/app-store')
expect(wrapper.vm.$router.currentRoute.value.query).toMatchObject({
  from: 'worldbook',
  section: 'world',
})
expect(chatStore.findWorldServiceTemplateContact('survival_city', 'survival_supply_dispatch')).toBeNull()
```

- [ ] **Step 2: Add candidate-preview separation assertions**

Add assertions before activation:

```js
expect(wrapper.get('[data-testid="worldbook-current-pack-active-summary"]').text()).toContain('默认世界')
expect(wrapper.get('[data-testid="worldbook-current-pack-candidate-preview"]').text()).toContain('灾后生存都市')
expect(wrapper.get('[data-testid="worldbook-current-pack-candidate-preview"]').text()).toContain('3')
expect(wrapper.get('[data-testid="worldbook-current-pack-candidate-preview"]').text()).toContain('1')
```

- [ ] **Step 3: Run focused test and verify failure**

Run:

```bash
npm.cmd test -- tests/worldbook-functional-ia.test.js
```

Expected: FAIL because the new test ids and handoff behavior do not exist yet.

---

### Task 2: Write Failing Tests For App Store World Section

**Files:**
- Modify: `tests/app-store-ui.test.js`

- [ ] **Step 1: Add section query test**

Add a test that activates `survival_city`, opens `/app-store?section=world&from=worldbook`, and asserts:

```js
expect(wrapper.get('[data-testid="app-store-filter-World"]').classes()).toContain('is-active')
expect(wrapper.find('[data-testid="app-store-item-world_app_survival_city_survival_supply_board"]').exists()).toBe(true)
expect(wrapper.find('[data-testid="app-store-item-app_chat"]').exists()).toBe(false)
expect(wrapper.get('[data-testid="app-store-detail"]').text()).toContain('World App')
```

- [ ] **Step 2: Run focused test and verify failure**

Run:

```bash
npm.cmd test -- tests/app-store-ui.test.js
```

Expected: FAIL because filter test ids and `section=world` initialization are not implemented.

---

### Task 3: Write Failing Tests For Black Market Guard

**Files:**
- Modify: `tests/world-app-template-registry.test.js`

- [ ] **Step 1: Change registry test expectations**

Update the review test so `black_market` is rejected even when not duplicate:

```js
const review = buildWorldAppTemplateExtractionReview({
  worldPackId: 'my_world',
  existingBindings: [],
  proposals: [
    { templateId: 'transit_pass', title: 'Metro Pass', confidence: 'medium' },
    { templateId: 'black_market', title: 'Night Market', confidence: 'high' },
    { templateId: 'clinic_dispatch', title: 'Weak Clinic', confidence: 'low' },
    { templateId: 'invented_app', title: 'Invented', confidence: 'high' },
  ],
})

expect(review.rejectedProposals).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ templateId: 'black_market', rejectionReason: 'needs_dedicated_app' }),
  ]),
)
```

- [ ] **Step 2: Add binding guard assertion**

Add:

```js
expect(buildWorldAppBindingFromTemplateProposal({
  templateId: 'black_market',
  bindingId: 'my_world_black_market',
  title: 'Night Market',
  confidence: 'high',
})).toBeNull()
```

- [ ] **Step 3: Run focused test and verify failure**

Run:

```bash
npm.cmd test -- tests/world-app-template-registry.test.js
```

Expected: FAIL because `black_market` is still confirmable.

---

### Task 4: Implement Black Market Guard

**Files:**
- Modify: `src/lib/world-app-template-registry.js`
- Modify: `src/components/worldbook/CurrentWorldPackPanel.vue`

- [ ] **Step 1: Add unsupported metadata**

Add `unsupportedReason: 'needs_dedicated_app'` to the `black_market` registry entry.

- [ ] **Step 2: Update prompt registry lines**

In `buildWorldAppTemplateExtractionPrompt`, include unsupported state:

```js
const supportLabel = template.unsupportedReason
  ? `unsupported:${template.unsupportedReason}`
  : 'supported'
```

and append it to each whitelist line.

- [ ] **Step 3: Reject unsupported proposals**

In `normalizeWorldAppTemplateProposal`, compute:

```js
const unsupportedReason = template.unsupportedReason || ''
```

Then make `reviewStatus` rejected if unsupported, and set:

```js
rejectionReason: unsupportedReason || (lowConfidence ? 'low_confidence' : duplicate ? 'duplicate_binding' : '')
```

- [ ] **Step 4: Copy unsupported metadata**

Ensure `listWorldAppTemplateRegistry` and `proposal.template` copies preserve `unsupportedReason`.

- [ ] **Step 5: Add rejection label**

Add `needs_dedicated_app` to `rejectionReasonLabel` in `CurrentWorldPackPanel.vue`:

```js
needs_dedicated_app: t('需要专属应用或进一步产品确认，不能直接映射到现有应用', 'Needs a dedicated app or product approval; it cannot map directly to an existing app'),
```

- [ ] **Step 6: Run registry test**

Run:

```bash
npm.cmd test -- tests/world-app-template-registry.test.js
```

Expected: PASS.

---

### Task 5: Implement WorldBook Handoff UI

**Files:**
- Modify: `src/components/worldbook/CurrentWorldPackPanel.vue`
- Modify: `src/views/WorldBookView.vue`

- [ ] **Step 1: Change component events**

Replace launcher/service events with handoff events:

```js
'open-app-store-world-section',
'open-chat-service-handoff',
```

Remove use of:

```js
'open-app-binding',
'create-service-template',
'open-service-contact',
```

- [ ] **Step 2: Add active/candidate computed helpers**

Add computed values:

```js
const activePack = computed(() => props.overview.activePack || {})
const selectedIsActive = computed(() => selectedPack.value?.id === activePack.value?.id)
const activeAppCount = computed(() => props.appBindingRows.length)
const activeServiceCount = computed(() => props.serviceTemplateRows.length)
const candidateAppCount = computed(() =>
  props.activationReview?.effectRows?.find((row) => row.key === 'app_bindings')?.count || 0
)
const candidateServiceCount = computed(() =>
  props.activationReview?.effectRows?.find((row) => row.key === 'service_templates')?.count || 0
)
```

- [ ] **Step 3: Replace app rows with summary**

Replace per-app launch buttons with:

```vue
<div class="current-world-pack__active-summary" data-testid="worldbook-current-pack-active-summary">
  ...
  <button
    type="button"
    data-testid="worldbook-current-pack-open-app-store"
    :disabled="activeAppCount <= 0"
    @click="emit('open-app-store-world-section')"
  >
    {{ t('前往 App Store', 'Open App Store') }}
  </button>
</div>
```

The summary may list app titles as text, but must not include per-app open buttons.

- [ ] **Step 4: Add candidate preview**

Add:

```vue
<div class="current-world-pack__candidate-preview" data-testid="worldbook-current-pack-candidate-preview">
  ...
</div>
```

It must show selected pack name, `candidateAppCount`, and `candidateServiceCount`.

- [ ] **Step 5: Replace service rows with Chat handoff notice**

Add:

```vue
<div class="current-world-pack__service-handoff" data-testid="worldbook-current-pack-service-handoff">
  ...
  {{ t('可在 Chat app 内添加', 'Add them from Chat when the Chat-side flow is ready') }}
</div>
```

No direct create/open Chat Directory buttons in this component.

- [ ] **Step 6: Collapse proposal review**

Wrap the nonstandard template review in `<details class="current-world-pack__advanced">` with summary text:

```vue
<summary>{{ t('高级：提取世界专属应用提案', 'Advanced: Extract World App Proposals') }}</summary>
```

Keep existing loading/empty/error/rejection content inside.

- [ ] **Step 7: Update WorldBook event handlers**

In `WorldBookView.vue`, remove direct component bindings for open app/create service/open service. Add:

```js
const openWorldAppStoreSection = () => {
  router.push({
    path: '/app-store',
    query: {
      from: 'worldbook',
      section: 'world',
    },
  })
}

const openChatServiceHandoff = () => {
  router.push({
    path: '/chat-contacts',
    query: {
      from: 'worldbook',
      worldPack: worldOverview.value.activePack?.id || 'default_world',
      section: 'world_services',
    },
  })
}
```

Wire `@open-app-store-world-section="openWorldAppStoreSection"`.

- [ ] **Step 8: Run WorldBook focused test**

Run:

```bash
npm.cmd test -- tests/worldbook-functional-ia.test.js
```

Expected: PASS.

---

### Task 6: Implement App Store World Section Routing

**Files:**
- Modify: `src/views/AppStoreView.vue`

- [ ] **Step 1: Normalize initial section query**

Add helper:

```js
const normalizeInitialFilter = (value = '') => {
  const normalized = String(Array.isArray(value) ? value[0] : value || '').trim().toLowerCase()
  if (normalized === 'world' || normalized === 'world_apps') return 'World'
  return APP_STORE_FILTERS.includes(value) ? value : 'all'
}
```

Initialize:

```js
const selectedFilter = ref(normalizeInitialFilter(route.query.section || route.query.filter))
```

- [ ] **Step 2: Add filter test ids**

On filter buttons add:

```vue
:data-testid="`app-store-filter-${filter.id}`"
```

- [ ] **Step 3: Keep selected app stable**

After `appStoreItems` exist, selected app should fall back to first filtered item through existing `selectedApp` computed. No extra watcher is required unless tests reveal stale state.

- [ ] **Step 4: Run App Store focused test**

Run:

```bash
npm.cmd test -- tests/app-store-ui.test.js
```

Expected: PASS.

---

### Task 7: Sync Docs And Validate

**Files:**
- Modify docs listed in File Structure as needed.

- [ ] **Step 1: Sync docs**

Update docs to say:

- WorldBook activates packs and shows counts/handoffs.
- World app launch belongs to App Store/Home.
- Service account availability is shown as count; Chat-side add flow is deferred.
- `black_market` requires dedicated-app approval and is not confirmable as Shopping.

- [ ] **Step 2: Run targeted tests**

Run:

```bash
npm.cmd test -- tests/worldbook-functional-ia.test.js tests/app-store-ui.test.js tests/world-app-template-registry.test.js
```

Expected: PASS.

- [ ] **Step 3: Run full validation**

Run:

```bash
git diff --check
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Expected: all pass. Existing CRLF warnings may appear from unrelated dirty files; no whitespace errors.

- [ ] **Step 4: Browser smoke**

With the dev server on `http://127.0.0.1:5173/schatphone`, smoke:

1. Unlock.
2. Open `#/worldbook?from=settings`.
3. Switch to Pack.
4. Activate `survival_city`.
5. Confirm no per-app open buttons appear in WorldBook.
6. Click `Open App Store`.
7. Confirm App Store has World filter active and shows world app entries.
