# UI And App Store Safe Polish Guide After Governance Facades

Updated: 2026-06-15

This note answers a narrow follow-up question: after the `systemStore` notification facade and API reports facade are in place, which UI or App Store polish slices can continue without undoing that governance work?

Short answer: yes, UI and App Store polish can continue safely as long as it stays presentation-first and does not bypass or reshape the new system facades.

## 1. Current Governance Boundaries

The recently completed governance slices created two stable interfaces:

- `src/composables/useSystemNotifications.js`
  - owns ordinary system-notification reads, unread counts, add, mark-read, remove, clear, and notification-enabled state access;
  - already used by Lock Screen, App shell foreground notification handling, Phone, Map, Calendar, Settings, Chat Settings, and Chat notification flows.
- `src/composables/useSystemApiReports.js`
  - owns API/storage diagnostic report reads, summaries, filtered lists, add, clear, latest-by-module, and count-by-filter;
  - already used by Network diagnostics and Settings storage diagnostics.

UI polish should not reach around these interfaces for ordinary notification or diagnostic-report behavior.

## 2. Will UI Or App Store Polish Affect These Slices?

Usually no.

App Store visual work is mostly about entry presentation, detail hierarchy, icon/cover/skin presentation, mobile sheets, filters, and ownership copy. Those surfaces are not the owners of notification persistence, API reports, push delivery, network provider settings, backup payloads, or storage hydration.

It can affect the governance slices only if the polish work:

- edits `useSystemNotifications.js` or `useSystemApiReports.js`;
- writes directly to `systemStore.notifications` or `systemStore.apiReports` for ordinary UI behavior;
- changes `systemStore.addNotification`, `systemStore.addApiReport`, `systemStore.clearApiReports`, notification settings, or persistence shape;
- changes backup/import/export payload shape for `notifications` or `apiReports`;
- changes report emitters while doing visual work.

## 3. Green-Light Polish Slices

These are good next tasks because they are visual, local, and unlikely to disturb the governed slices.

1. App Store catalog craft pass
   - Improve list/card spacing, selected states, category filter rhythm, search field finish, empty search state, and desktop density.
   - Primary files: `src/views/AppStoreView.vue`, possibly `src/style.css` if shared tokens are needed.
   - Avoid: changing entry taxonomy, install state semantics, or route targets.

2. App Store detail hierarchy pass
   - Improve the detail hero, icon/cover composition, metadata rows, action grouping, and protected-entry note.
   - Keep existing actions and saved data shape unchanged.
   - Good focus: primary action clarity, danger-action separation, and mobile/desktop parity.

3. App Store mobile detail sheet polish
   - Improve sheet safe-area spacing, sticky action area, close affordance, scroll shadows, focus order, and touch target consistency.
   - Avoid: changing route behavior or placement/open semantics.
   - Verify with mobile viewport tests or screenshots.

4. Icon & Appearance sheet visual polish
   - Improve built-in glyph grid, Gallery image picker layout, preview states, restore-default affordance, and save feedback.
   - Keep `appIconOverrides` payload semantics unchanged.
   - Do not move global Appearance ownership back into App Store.

5. App Skin sheet preview polish
   - Improve preset cards, app-skin preview readability, scoped-CSS editor layout, and restore-default copy.
   - Keep the existing supported-app rules.
   - Do not broaden Chat into the generic app-skin editor; Chat Appearance remains Chat-owned.

6. World entry handoff card polish
   - Improve World Pack badge, target-app row, accent treatment, and ownership copy readability.
   - Keep activation/review ownership in WorldBook.
   - Do not make App Store activate, edit, or review World Packs.

7. Mini app / shop facade polish
   - Improve cover media display, binding-target badges, install-state chips, tag layout, and shop-template preview feel.
   - Keep menu/product/cart/order truth inside Food Delivery or Shopping.
   - Do not make App Store a daily shop browsing surface.

8. Home/App Store entry rendering polish
   - Improve shared app-icon rendering, tile labels, pseudo-folder shell visuals, and entry-card consistency.
   - Safe if placement logic, page return context, and store shape are unchanged.
   - Primary candidates: `AppIconVisual`, Home tile presentation, App Store list/detail rendering.

9. Theme parity and token cleanup
   - Replace raw visual colors in touched App Store/UI surfaces with existing system tokens where appropriate.
   - Check both `default` and `zen`.
   - Avoid rewriting theme architecture.

10. Accessibility and interaction-state pass
   - Add or refine focus states, disabled states, hover/pressed states, aria labels for icon-only controls, and reduced-motion-safe transitions.
   - Safe when it does not change product behavior.

## 4. Yellow-Light Slices

These can still be good work, but they need extra care and targeted tests.

1. App Store filter taxonomy changes
   - Changing labels or grouping is safe; changing which entries appear in each group is behavior.
   - Update unit and E2E tests if category expectations change.

2. Home placement or pseudo-folder interaction polish
   - Visual polish is fine.
   - Any placement, install/uninstall, screen-slot, or return-context behavior change must use the Home/App Store tests.

3. Settings Push, Network diagnostics, or storage diagnostics UI polish
   - These surfaces consume the new facades.
   - Safe rule: keep the facade calls, change only presentation/copy.
   - Avoid direct `systemStore.notifications` or `systemStore.apiReports` reads except backup/export raw payload paths that already own storage shape.

4. App Store copy cleanup
   - Product-facing wording improvements are welcome.
   - Existing tests may assert visible text, so run targeted App Store, Home, WorldBook, Food Delivery, and Shopping tests when copy changes.

5. Shared component polish
   - Good when the component is visual-only.
   - Check every host surface, especially Lock Screen notifications, Home tiles, App Store, and Settings, before finalizing.

6. External asset import
   - Safe only with a concrete target surface and repo-local asset path.
   - Do not bulk import reference assets.

## 5. Red-Light Work For A Visual Polish Round

Avoid these unless the task is explicitly a governance or feature slice, not a beauty pass.

1. Do not edit notification persistence, backup/import/export shape, or `systemStore.notifications` storage behavior.
2. Do not edit API report persistence, backup/import/export shape, or `systemStore.apiReports` storage behavior.
3. Do not bypass `useSystemNotifications.js` for ordinary notification UI.
4. Do not bypass `useSystemApiReports.js` for Network/Settings diagnostic-report UI.
5. Do not move report emitters as part of visual polish. Keep API reports second-slice governance separate.
6. Do not make App Store own Food Delivery menus, Shopping products, carts, orders, Wallet handoffs, Map handoffs, Calendar cues, or Chat service notifications.
7. Do not make App Store own WorldBook activation, review, source management, or unsupported proposal visibility.
8. Do not rename backend ids, routes, CSS scopes, or persisted entry ids for aesthetic reasons.
9. Do not change test ids casually; they are the E2E contract for important phone flows.
10. Do not use visual polish to hide unresolved IA or ownership confusion.

## 6. Best Next Polish Queue

Recommended order if the goal is visible improvement with low governance risk:

1. App Store catalog/list craft pass.
2. App Store detail hierarchy and action grouping pass.
3. App Store mobile detail sheet ergonomics.
4. Icon & Appearance sheet polish.
5. Mini app/shop facade cards and cover-media polish.
6. World entry handoff card polish.
7. App Skin sheet preset-preview polish.
8. Shared `AppIconVisual` rendering polish if App Store and Home need the same icon quality.
9. Accessibility/focus/touch-state pass across the touched App Store surfaces.
10. Food Delivery shop-template visual polish, starting with Moon Bistro continuation, while keeping Food Delivery as the runtime owner.

## 7. Verification Matrix

For doc-only planning:

```powershell
git diff --check
```

For App Store code polish:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test -- tests/app-store-ui.test.js tests/app-store-mini-app-placement.test.js
```

If mobile App Store sheets, Home placement, Food Delivery shop entries, or Shopping shop entries are touched, also run the matching E2E or targeted unit tests:

```powershell
npm.cmd run test -- tests/food-delivery-view.test.js tests/shopping-view.test.js
```

For any change that touches notification or API report consumer surfaces:

```powershell
npm.cmd run test -- tests/system-notifications-interface.test.js tests/system-api-reports-interface.test.js tests/network-view-smoke-controls.test.js tests/settings-general-section.test.js
```

## 8. Rule Of Thumb

If a change can be described as "make the same entry clearer, better spaced, more tactile, easier to scan, or more consistent across desktop/mobile," it is probably safe.

If a change can be described as "make this surface own a new kind of data, emit a new system event, change persistence, or reinterpret an entry type," it is not just polish and should become a separate governed slice.
