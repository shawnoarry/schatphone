# Visual And IA Governance Implementation Workstreams / 视觉与信息架构治理实施工作流

Updated: 2026-05-31

## 1. Workstream A: Shell And Entry Ownership

- lock/home/settings/appearance/widget ownership
- hidden-system placeholders
- app entry clarity
- Home template-slot desktop model
- `主屏 / 桌面 / Home` as a system desktop layer, not a user-facing app entry
- `组件 / Widgets` as widget creation/import/action-config/edit entry, not a whole-page template catalog
- `外观 / Appearance` as broader visual customization and possible template-management surface
- `应用商城 / App Store` as the standalone App Library-like entry-management host
- App Library / App Store-like surface as app-entry visibility management only
- World Pack global app-entry unlocks now have a first seam through the same Home/App Store/App Library ownership rules; Current World Pack must hand off to App Store's `World` section and must not regress into Settings -> WorldBook-only launch links

## 2. Workstream B: Module IA

- list/detail hierarchy
- destructive action placement
- progressive disclosure
- empty/loading/error states
- Chat installed-app entry split: `Me` for identity/social presence, Chat Settings for behavior/appearance/diagnostics
- world UX package effects: existing apps keep their visual owner, while active World Pack may provide labels, terminology, accents, contextual banners, and safe default UX variants that are visible in the actual app. The first consumers are Shopping marketplace context, Food Delivery dispatch context, Calendar reservation context, and Map transit context.
- nonstandard World Pack app review states must make AI extraction loading, empty results, parse/API errors, rejected reasons, and explicit confirmation readable before any proposal can become a global app entry.
- unsupported nonstandard proposals such as `black_market` must be blocked with a clear reason until a dedicated app shell exists; they must not be visually repackaged as an unrelated existing app.
- scoped customization layers: global Appearance CSS, Chat-scoped CSS, and app/world-app CSS should layer predictably, with user-authored overrides above World Pack defaults. Shell-level `data-app`, `data-route-scope`, `data-world-pack`, and `data-world-app` hooks are now available, and Appearance Advanced CSS can now save app/world-app scoped CSS layers with active World Pack entry selection, target selector preview, and pause/clear recovery.
- app-scoped CSS and world-app-scoped CSS should remain predictable when they target the same element: app scope provides the broad app layer, while world-app scope is narrower and emitted later for the selected `data-world-pack`/`data-world-app`.

## 3. Workstream C: Visual Rebuild Queue

- decide rebuild vs polish
- keep references per module
- align with actual product maturity
- Chat message layout modes should change row structure, not only toggle avatar visibility

## 4. Semantic Guardrails

Treat these as bugs:

1. UI polish hides unresolved IA confusion
2. system shell and app-owned surfaces borrow the wrong visual owner
3. destructive actions are made visually equivalent to normal edits
4. Chat Me becomes a duplicate settings page, or Chat Settings becomes a duplicate identity/social page
5. World Pack changes app UI/UX in documentation or Settings only, without reflecting in the target app, Home, and App Store entry surfaces
6. World app entries bypass App Store/Home placement rules or mutate target-app business state when launched
7. Custom CSS for one app or world-app relies on brittle generated class names instead of stable scope hooks
8. AI-proposed nonstandard app entries bypass Current World Pack review or appear in App Store before explicit confirmation
9. Current World Pack starts creating Chat service accounts or launching world apps directly from Settings instead of handing off to Chat/App Store owners
