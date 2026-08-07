# Visual And IA Governance Implementation Workstreams / 视觉与信息架构治理实施工作流

Updated: 2026-08-07

## 1. Workstream A: Shell And Entry Ownership

- lock/home/settings/appearance/widget ownership
- hidden-system placeholders
- app entry clarity
- Home template-slot desktop model
- default Home release curation: two normal-mode pages for glanceable/personal and daily-life entry groups, with secondary utilities remaining recoverable from App Store or Widget Center
- `主屏 / 桌面 / Home` as a system desktop layer, not a user-facing app entry
- `组件 / Widgets` as widget creation/import/action-config/edit entry, not a whole-page template catalog
- `外观 / Appearance` as broader visual customization and possible template-management surface
- `应用商城 / App Store` as the standalone App Library-like entry-management host
- App Library / App Store-like surface as app-entry visibility management only
- World Pack global app-entry unlocks now have a first seam through the same Home/App Store/App Library ownership rules; Optional capability Packs may tell users that entries live in App Store's `World` section, but must not regress into Settings -> WorldBook-only launch links or App Store jump buttons
- App Store folder mini-app entries now use explicit target-folder bindings. App Store owns install identity/facade/open context, installed/not-installed target-folder placement, and an `Add mini app` owner handoff sheet, while `food_delivery` and `shopping` targets own menu/product/cart/order/service-notification runtime state plus consumer shop browsing organization such as filters, favorites, and recent lists.
- Camera is a direct installed-app entry in Home and App Store. Its main surface stays capture-first, and its provider/default/routing/diagnostic pages remain Camera-owned rather than becoming another system Settings registry.

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
- Network & API setup should keep the URL-first flow: endpoint input and saved API configuration loading are the main path; provider-brand templates can exist as helper data but should not render as first-level buttons.
- Book/WorldBook content carriers keep core texts and encyclopedia manuscripts independent. WorldBook source links are created only by explicit per-manuscript user action and must preserve arbitrary subsets, including zero encyclopedia selections.
- Book writing/storage/export and WorldBook activation now share one world-setting workspace flow. The workspace uses parallel setting layers rather than a mandatory sequence, provides a direct Book handoff and return path, and keeps every activation action explicit.
- Book portable export provides strict versioned/lossless `.worldbook.json`, editable/re-importable `.md`, and body-only `.txt`; portable files do not carry WorldBook activation state.
- Pure Book/encyclopedia content does not create a World Pack. A future pack must be justified by separately approved grouped app, service, runtime, or similar capability behavior.
- Mini Scene Settings and presenters follow `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md`: registered modules expose unconfigured/off, text, or interactive modes; profile binding is separate from WorldBook activation; interactive failure visibly falls back to text.
- Book may later edit structured Mini Scene transform profiles as `structured_json`, but the editor must validate profile scope/rules and preview through the shared Module rather than executing regex or HTML inside Book/WorldBook.
- Camera's embedded Gallery picker remains a host-owned sheet. Candidate Download, Keep in Gallery, and Discard actions must stay distinct, and Gallery People curation must be promoted separately from the completed capture/settings shell.

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
8. AI-proposed nonstandard app entries bypass Optional capability Packs review or appear in App Store before explicit confirmation
9. The Optional capability Packs surface starts creating Chat service accounts, launching world apps, or jumping to App Store directly from Settings instead of staying a lightweight activation/status surface
10. Shop-entry UI treats Food Delivery as the only possible runtime target, or lets App Store mutate Shopping/Food Delivery business records instead of handing off to the selected owner.
11. Network setup asks the user to choose a provider brand before allowing direct endpoint entry, even though the transport type can be inferred from URL.
12. Choosing or activating a Book core text automatically selects, enables, or binds encyclopedia manuscripts.
13. WorldBook presents Setting Text, encyclopedia entries, templates, World Pack capabilities, or fallback text as a mandatory linear setup sequence instead of independently selectable layers.
14. Optional built-in K-pop content is presented as the only supported world, or its authoring policy becomes a global restriction on user-authored/imported material.
15. Mini Scene Settings hides the difference between WorldBook narrative activation, profile binding, and per-module popup mode, or defaults a new module to automatic popup.
16. the interactive Presenter renders raw AI/profile/legacy Chat HTML, lacks a visible text fallback, or visually escapes its sandbox as trusted system UI.
