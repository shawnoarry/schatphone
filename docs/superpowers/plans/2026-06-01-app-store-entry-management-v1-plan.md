# App Store Entry Management V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Implemented through App Store entry taxonomy, standard app display-name overrides, folder mini-app read/open surfaces, shop display/icon/description/tag/template presentation overrides, installed/not-installed target-folder placement, Food Delivery/Shopping surface consumption, and focused tests. Product correction is now documented: App Store is an install/facade/launch-context manager for folder mini apps, not a daily shop-browsing or commerce-organization surface.

**Goal:** Upgrade App Store from a simple app list into a user-visible entry management surface for Apps, World entries, Shops, and System entries.

**Architecture:** Keep backend app/module ids stable while allowing user-facing entry presentation to change. Add a shared presentation helper for entry type labels, ownership copy, and display-name overrides; use App Store for editing display/icon/skin/placement, while Food Delivery remains the runtime owner for restaurants, menus, carts, and orders.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils, existing SchatPhone stores and App Store/Home components.

---

## File Structure

- Create `src/lib/app-entry-presentation.js`
  - Normalizes standard app display-name overrides stored under `settings.appearance.appIconOverrides`.
  - Normalizes dynamic shop/world entry presentation overrides stored under `settings.appearance.entryPresentationOverrides`.
  - Resolves entry type labels and ownership/boundary copy for `app`, `world_app`, `shop_app`, and `system`.
  - Keeps user-visible names separate from backend ids, routes, and CSS scopes.
- Create `src/lib/food-shop-presentation.js`
  - Centralizes the Food Delivery default shop-template mapping used by App Store and Food Delivery.
- Modify `src/lib/app-icon-presentation.js`
  - Preserve optional `displayName` on app icon overrides and return it from `resolveAppIconMeta`.
- Modify `src/stores/system.js`
  - Existing `setAppIconOverride` / `clearAppIconOverride` should carry display-name overrides through the same appearance normalization.
  - Add `setEntryPresentationOverride` / `clearEntryPresentationOverride` for shop-entry presentation metadata.
- Modify `src/views/AppStoreView.vue`
  - Replace category filters with entry-type filters: `Apps`, `World`, `Shops`, `System`, plus `All`, `Home`, `Library`.
  - Add Food Delivery shop app entries from existing restaurant records.
  - Make detail surfaces sectioned: entry info, display & appearance, placement, ownership/source boundary.
  - Add display-name editing to the identity sheet.
  - Add shop-entry short description, tags, and template selection to the identity sheet.
- Modify `src/views/FoodDeliveryView.vue`
  - Read shop-entry presentation overrides for the shop launcher cards and opened shop mini-app surface.
- Modify `src/views/HomeView.vue`
  - Use the resolved display-name override for Home tiles and Dock alt labels.
- Modify `tests/app-store-ui.test.js`
  - Cover type filters, display-name override persistence and Home rendering, world-entry boundary, and shop-entry presence.
- Modify `tests/app-entry-presentation.test.js`
  - Cover dynamic entry override normalization and resolved shop presentation metadata.
- Modify `tests/food-delivery-view.test.js`
  - Cover Food Delivery consuming App Store shop-entry presentation without mutating restaurant records.
- Sync docs:
  - `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
  - `docs/roadmap/TODO_ROADMAP.md`

## Tasks

### Task 1: Presentation Helper And Display Name Normalization

- [x] Add `src/lib/app-entry-presentation.js`.
- [x] Extend `normalizeAppIconOverrides` to keep `displayName`.
- [x] Ensure `resolveAppIconMeta` returns `displayName`.
- [x] Add unit-level expectations through existing App Store tests.

### Task 2: App Store Type Taxonomy

- [x] Replace legacy category filters with entry-type filters.
- [x] Keep old module category as a visible tag/meta field.
- [x] Add `entryType` and `entryTypeLabel` to every App Store item.
- [x] Add shop entries from `foodDeliveryStore.restaurants`.

### Task 3: Detail Surface IA

- [x] Add detail sections in the desktop detail and mobile sheet.
- [x] Show backend identity/source boundary in product copy.
- [x] Keep world handoff and shop boundary copy specific to their entry type.

### Task 4: Display Name Editing

- [x] Add a display-name field to the identity sheet.
- [x] Save display name together with icon/accent/gallery override.
- [x] Restore default clears display name as well as icon override.
- [x] Home renders the display name for standard app tiles.

### Task 5: Shop Entry Presentation Editing

- [x] Save shop-entry display/icon overrides outside standard app icon overrides.
- [x] Save shop-entry short description, display tags, and selected template.
- [x] Keep template selection as presentation only; Food Delivery still owns menu/cart/order runtime.
- [x] Food Delivery launcher cards and opened shop surfaces read the App Store-side presentation.

### Task 6: Validation And Docs

- [x] Run focused App Store/Home tests.
- [x] Run focused Food Delivery shop presentation tests.
- [x] Run lint and build.
- [x] Update handoff docs.
- [ ] Commit the round.

## Follow-Up Backlog

- Generalize `Shops` before adding more Food Delivery-only polish: add explicit binding targets, migrate current entries to `food_delivery`, add `shopping` as the next allowed target, and keep arbitrary routes blocked.
- Keep App Store out of shop favorites, recent lists, sorting, and consumer category filters; those belong inside Food Delivery and Shopping.
- Add shop creation/template editing from App Store or the bound module pseudo-folder, using the selected source module as owner of records, carts, orders, downstream handoffs, and Chat service pushes.
- Allow future World Pack generated shops to appear as folder mini apps with `source: world_pack` plus a supported binding target. Do not force world storefronts into Food Delivery by default.
- Decide whether World Pack app entries can receive user-facing aliases later. Current V1 preserves world-entry names from WorldBook/pack bindings.
