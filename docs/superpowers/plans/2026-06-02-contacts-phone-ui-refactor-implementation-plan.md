# Contacts Phone UI Refactor Implementation Plan

**Execution Status:** Implemented. This file is retained as execution history and test/design rationale, not as the active task source. Current Contacts follow-up work should start from `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md` and the current WorldBook -> Contacts handoff when relevant.

> **For agentic workers:** This file is no longer an active execution checklist. Checked steps below record the implemented slice.

**Goal:** Turn Contacts' first screen into a phone-like contact list with Search -> My Profile -> Recent interactions -> Main Roles -> NPC / World Roles, while preserving the WorldBook profile-field chain.

**Architecture:** Keep the current Contacts ownership model and avoid a data-model rewrite. Add small view-level helpers in `ContactsView.vue` for search filtering, contact-row summaries, and recent interaction shortcuts; keep deep role hub, relationship, memory, world-field, and danger flows in the selected contact detail.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest with Vue Test Utils, Playwright, Vite.

---

### Task 1: Lock Contacts First-Screen Behavior With Focused Tests

**Files:**
- Modify: `tests/contacts-profile-template-view.test.js`

- [x] **Step 1: Add a test for the phone Contacts first-screen order**

Add a behavior test that seeds one self profile, one main role, and one NPC, then asserts the rendered order is Search -> My Profile -> Recent interactions -> Main Roles -> NPC / World roles.

```js
test('orders Contacts first screen like a phone contacts app', async () => {
  const chatStore = useChatStore()
  const selfProfile = chatStore.addRoleProfile({
    roleId: '1301',
    name: 'My world self',
    entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
  })
  const mainRole = chatStore.addRoleProfile({
    roleId: '1302',
    name: 'Main contact',
    entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
  })
  const npc = chatStore.addRoleProfile({
    roleId: '1303',
    name: 'NPC contact',
    entityType: CONTACTS_ENTITY_TYPES.NPC,
  })
  chatStore.bindRoleProfile(mainRole.id)

  const wrapper = await mountContactsView()
  const text = wrapper.text()

  expect(text.indexOf('Search name, role ID, or world fields')).toBeGreaterThanOrEqual(0)
  expect(text.indexOf('My Profile')).toBeGreaterThan(text.indexOf('Search name, role ID, or world fields'))
  expect(text.indexOf('Recent interactions')).toBeGreaterThan(text.indexOf('My Profile'))
  expect(text.indexOf('Main Roles')).toBeGreaterThan(text.indexOf('Recent interactions'))
  expect(text.indexOf('NPC / World roles')).toBeGreaterThan(text.indexOf('Main Roles'))
  expect(wrapper.get(`[data-testid="contacts-row-${selfProfile.id}"]`).text()).toContain('My world self')
  expect(wrapper.get(`[data-testid="contacts-row-${mainRole.id}"]`).text()).toContain('Main contact')
  expect(wrapper.get(`[data-testid="contacts-row-${npc.id}"]`).text()).toContain('NPC contact')

  wrapper.unmount()
})
```

- [x] **Step 2: Add a test for recent shortcuts not removing full-list entries**

Use a Chat-bound main role and an NPC with a memory/activity hint. Assert both can appear in the recent shortcut row and still appear in their normal sections.

```js
test('shows recent interaction shortcuts without removing contacts from full lists', async () => {
  const chatStore = useChatStore()
  const relationshipRuntimeStore = useRelationshipRuntimeStore()
  const mainRole = chatStore.addRoleProfile({
    roleId: '1310',
    name: 'Bound main role',
    entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
  })
  const npc = chatStore.addRoleProfile({
    roleId: '1311',
    name: 'Memory NPC',
    entityType: CONTACTS_ENTITY_TYPES.NPC,
  })
  chatStore.bindRoleProfile(mainRole.id)
  relationshipRuntimeStore.recordRelationshipFact({
    target: { profileId: npc.id, name: npc.name },
    sourceModule: 'relationship_map_shared_route',
    sourceId: 'recent_route_1311',
    memoryKey: 'recent_memory_1311',
    factType: 'shared_route',
    summary: 'Shared route with Memory NPC.',
    metricDeltas: { affinity: 1 },
  })

  const wrapper = await mountContactsView()

  expect(wrapper.get('[data-testid="contacts-recent-interactions"]').text()).toContain('Bound main role')
  expect(wrapper.get('[data-testid="contacts-recent-interactions"]').text()).toContain('Memory NPC')
  expect(wrapper.get(`[data-testid="contacts-row-${mainRole.id}"]`).text()).toContain('Bound main role')
  expect(wrapper.get(`[data-testid="contacts-row-${npc.id}"]`).text()).toContain('Memory NPC')

  wrapper.unmount()
})
```

- [x] **Step 3: Add a test for search filtering full lists**

Drive the search input through the DOM and assert the matching NPC remains visible while an unmatched main role is hidden.

```js
test('filters Contacts full lists by search text', async () => {
  const chatStore = useChatStore()
  const mainRole = chatStore.addRoleProfile({
    roleId: '1320',
    name: 'Archive main',
    role: 'Archivist',
    entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
  })
  const npc = chatStore.addRoleProfile({
    roleId: '1321',
    name: 'Campus witness',
    role: 'Student',
    entityType: CONTACTS_ENTITY_TYPES.NPC,
  })

  const wrapper = await mountContactsView()
  await wrapper.get('[data-testid="contacts-search-input"]').setValue('campus')
  await flushUi()

  expect(wrapper.find(`[data-testid="contacts-row-${mainRole.id}"]`).exists()).toBe(false)
  expect(wrapper.get(`[data-testid="contacts-row-${npc.id}"]`).text()).toContain('Campus witness')

  wrapper.unmount()
})
```

- [x] **Step 4: Run focused tests and confirm the new tests fail before implementation**

Run:

```powershell
npm.cmd run test -- tests/contacts-profile-template-view.test.js
```

Expected before implementation: the new assertions fail because Search is not an input and Recent interactions does not exist yet.

### Task 2: Implement Contacts List Search, My Profile, Recent Shortcuts, And Phone-Like Rows

**Files:**
- Modify: `src/views/ContactsView.vue`

- [x] **Step 1: Add reactive search state and helper functions**

Add these view-level helpers near the profile grouping computed values.

```js
const contactsSearchQuery = ref('')

const normalizeContactSearchText = (value = '') => String(value || '').trim().toLowerCase()

const contactSearchText = (profile = {}) =>
  [
    profile.name,
    profile.role,
    normalizeRoleId(profile.roleId, profile.id),
    profile.bio,
    ...(Array.isArray(profile.profileValues) ? profile.profileValues.map((value) => value.value) : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const filterContactsBySearch = (profiles = []) => {
  const query = normalizeContactSearchText(contactsSearchQuery.value)
  if (!query) return profiles
  return profiles.filter((profile) => contactSearchText(profile).includes(query))
}
```

- [x] **Step 2: Replace list sources with filtered sources**

Add filtered computeds and keep the existing unfiltered grouping for recent interactions.

```js
const filteredSelfProfiles = computed(() => filterContactsBySearch(selfProfiles.value))
const filteredMainProfiles = computed(() => filterContactsBySearch(mainRoleProfiles.value))
const filteredNpcProfiles = computed(() => filterContactsBySearch(npcRoleProfiles.value))
```

- [x] **Step 3: Add recent-interaction shortcut helpers**

Use existing signals only: Chat binding, runtime memory count, event-attached detail count, and recent source hints. Do not persist a new history store in this V1. Place these helpers after `detailItemsForSection()` is defined so event-attached detail counting can use the existing role-detail helper safely.

```js
const contactRecentScore = (profile = {}) => {
  if (profile?.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) return 0
  const snapshot = profile?.id
    ? relationshipRuntimeStore.summarizeEntityForTarget(profileRelationshipTarget(profile), { memoryLimit: 1 })
    : null
  const chatScore = profile?.id && chatStore.isRoleProfileBound(profile.id) ? 100 : 0
  const memoryScore = Number(snapshot?.totalMemoryCount || 0) * 10
  const detailScore = Object.values(ROLE_DETAIL_SECTIONS).reduce(
    (sum, section) =>
      sum +
      detailItemsForSection(profile, section).filter(
        (item) => item.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED,
      ).length,
    0,
  )
  return chatScore + memoryScore + detailScore
}

const recentInteractionContacts = computed(() =>
  [...mainRoleProfiles.value, ...npcRoleProfiles.value]
    .map((profile) => ({ profile, score: contactRecentScore(profile) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.profile.id) - Number(a.profile.id))
    .slice(0, 10),
)
```

- [x] **Step 4: Replace the top list template**

Use this visible order in the scroll area:

```vue
<div class="contacts-search" data-testid="contacts-search">
  <i class="fas fa-search" aria-hidden="true"></i>
  <input
    v-model="contactsSearchQuery"
    data-testid="contacts-search-input"
    :placeholder="t('搜索姓名、角色 ID 或世界字段', 'Search name, role ID, or world fields')"
  />
</div>
```

Then render My Profile, Recent interactions, Main Roles, and NPC / World roles in that order. Recent interactions must use buttons with `data-testid="contacts-recent-interactions"` on the row wrapper and `data-testid="contacts-recent-${profile.id}"` for each shortcut.

- [x] **Step 5: Keep the existing detail flow and edit actions**

Do not move world-field editing, relationship classification, memories, delete/reset, Chat binding, or NPC upgrade into the list header. The list can open the selected profile; the selected detail still owns deeper work.

- [x] **Step 6: Run focused Contacts tests**

Run:

```powershell
npm.cmd run test -- tests/contacts-profile-template-view.test.js
```

Expected after implementation: all tests in the file pass.

### Task 3: Add Mobile E2E Coverage For Contacts Phone Entry

**Files:**
- Create: `e2e/contacts-phone-ui.spec.js`

- [x] **Step 1: Seed local storage with a self profile, main role, NPC, chat binding, and one relationship fact**

Use the existing persisted store keys:

```js
window.localStorage.setItem('schatphone:store:system', JSON.stringify({ version: 1, savedAt: Date.now(), data: systemSnapshot }))
window.localStorage.setItem('schatphone:store:chat', JSON.stringify({ version: 1, savedAt: Date.now(), data: chatSnapshot }))
window.localStorage.setItem('schatphone:store:relationshipRuntime', JSON.stringify({ version: 1, savedAt: Date.now(), data: relationshipSnapshot }))
```

- [x] **Step 2: Assert mobile first-screen order and shortcut behavior**

Open `/#/contacts`, set viewport to `390x844`, assert:

```js
await expect(page.getByTestId('contacts-search-input')).toBeVisible()
await expect(page.getByTestId('contacts-my-profile-section')).toBeVisible()
await expect(page.getByTestId('contacts-recent-interactions')).toBeVisible()
await expect(page.getByTestId('contacts-section-main')).toBeVisible()
await expect(page.getByTestId('contacts-section-npc')).toBeVisible()
await page.getByTestId('contacts-recent-2').click()
await expect(page.getByTestId('contacts-role-detail')).toContainText('Main contact')
await expect(page.getByTestId('contacts-row-2')).toContainText('Main contact')
```

- [x] **Step 3: Assert no horizontal overflow**

Use the same helper pattern as `e2e/worldbook-acceptance.spec.js`:

```js
const hasOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
)
expect(hasOverflow).toBe(false)
```

- [x] **Step 4: Run the focused E2E**

Run:

```powershell
npm.cmd run test:e2e -- e2e/contacts-phone-ui.spec.js --project=mobile-chrome
```

Expected: the mobile Contacts entry test passes.

### Task 4: Sync Handoff Docs And Validate The Whole Slice

**Files:**
- Modify: `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md`
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

- [x] **Step 1: Update Contacts handoff in user-facing language**

Record that Contacts now opens like a real phone contact list: Search, My Profile, Recent interactions shortcuts, Main Roles, NPC / World Roles. State that Recent interactions is a shortcut layer and does not remove people from their full sections.

- [x] **Step 2: Update Role Hub IA**

Record the L0 list-page rule and preserve the L1/L2 role-detail rule: deep world fields, relationship, memory review, and danger actions stay behind selected profile detail.

- [x] **Step 3: Update Visual handoff**

Record that Contacts has a first phone-entry refactor and still needs later true-device feel testing.

- [x] **Step 4: Run focused regression suite**

Run:

```powershell
npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js
```

Expected: 6 files pass.

- [x] **Step 5: Run broader checks**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: both pass.

- [x] **Step 6: Review changed files before commit**

Run:

```powershell
git diff -- src\views\ContactsView.vue tests\contacts-profile-template-view.test.js e2e\contacts-phone-ui.spec.js docs\pm\contacts-relationship-system-v2\STATUS_AND_HANDOFF.md docs\pm\contacts-relationship-system-v2\ROLE_HUB_INFORMATION_ARCHITECTURE.md docs\pm\visual-and-ia-governance\STATUS_AND_HANDOFF.md docs\superpowers\plans\2026-06-02-contacts-phone-ui-refactor-implementation-plan.md
git status --short
```

Expected: only this slice plus pre-existing unrelated workspace changes appear.
