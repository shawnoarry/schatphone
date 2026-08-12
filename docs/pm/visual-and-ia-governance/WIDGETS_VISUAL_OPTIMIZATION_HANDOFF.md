# Widget Center Visual Optimization Handoff

Updated: 2026-08-12

Purpose: provide the focused continuation record for `组件中心 / Widget Center` visual and interaction work.

This file is not a second roadmap. `docs/roadmap/TODO_ROADMAP.md` owns project priority, while this file records the accepted Widgets visual direction, current implementation, remaining acceptance, and the next safe slice. Update the visual package `STATUS_AND_HANDOFF.md` only when package status or the next safe slice changes.

The historical `docs/superpowers/plans/2026-05-25-widget-center-visual-handoff.md` predates the current market, mobile-sheet, security, Home-placement, and Today View work. It is reference material only and must not be used as the active handoff.

## 1. Product Boundary

Widget Center owns:

- the visual widget market and widget-definition library;
- official style discovery and preview;
- custom widget creation and editing;
- appearance-code import and pre-import preview;
- SchatPhone-owned click-action configuration;
- entry into Home slot editing.

Widget Center does not own:

- choosing a formal Home screen number for a widget;
- page templates or whole-page layout catalogs;
- direct placement outside Home edit mode;
- App Store app-entry management;
- Appearance themes, wallpaper, fonts, or global CSS;
- arbitrary router access or active behavior inside imported code.

Home owns exact-slot placement. Apps and folders remain `1x1`; built-in and custom widgets must exactly match one of the supported slot sizes: `1x1`, `2x1`, `2x2`, `4x1`, `4x2`, `4x3`, or `4x4`.

Custom/imported code owns appearance only. Click behavior is normalized SchatPhone metadata and may target only approved app or system entries.

## 2. Current Visual Thesis

`Visual widget market`

The primary phone-sized experience is scan-first: users should see widget effects, sizes, and library state before code or configuration. Editing and import are focused execution surfaces, not long sections appended to the market page.

Depth model:

- `L0 Market`: featured visual, size filters, built-in widgets, official styles, and saved-widget overview;
- `L1 Preview`: selected official style at a meaningful scale with add/edit actions;
- `L2 Manage`: saved custom-widget cards with edit and delete controls;
- `L3 Execute`: custom composer or import editor, presented as focused mobile sheets.

The market should feel like a phone beautification product, not a developer JSON utility. Code remains progressively disclosed after the user has selected a visual direction.

## 3. Landed Baseline

### Widget Market

- The title is `组件中心 / Widget Center`, with `创建 / Create` as the primary header command.
- The first view uses a featured large preview, exact-size filters, and a visual card grid.
- Built-in widgets and official style presets expose effect thumbnails and Home slot sizes instead of leading with descriptions.
- The built-in catalog now contains 16 options and covers every supported slot size. The current visual set includes `珐琅专注环 / Enamel Focus` (`1x1`), `今日步数 / Daily Steps` (`2x1`), `天气棱镜 / Weather Prism` and `心情百叶窗 / Mood Window` (`2x2`), `通勤轨道 / Commute Rail` and `流光声纹 / Aurora Waveform` (`4x1`), `Color Diary` paper music and `今日日程 / Today Agenda` (`4x2`), `纸上月相 / Paper Moon Week` and `世界脉冲 / World Pulse` (`4x3`), and `彩色记忆墙 / Color Memory Wall` and `昼夜流光 / Day & Night Veil` (`4x4`).
- The accepted concepts are translated into real SchatPhone widget surfaces rather than copied as isolated rendered objects. Reference-image dimensions are non-authoritative; the implementation always uses the registered Home slot size.
- The built-ins use three distinct visual families: Color Diary paper and collage, precise pocket-object controls, and dark spectrum/ambient light. Each widget keeps one primary purpose and a compact information hierarchy instead of combining every available capability into one card.
- Real Home interactions now include weather and ambient-state changes, mood-window cycling, a local focus timer, real music playback controls, selected-day changes, Map and Calendar routing, conditional World Hub routing, and explicit Gallery photo wells.
- Color Memory Wall owns three independently replaceable photo wells. Selection persists as Gallery asset IDs under built-in widget preferences; the whole card does not open Gallery, and an empty Gallery offers an explicit Gallery action.
- Starter-card thumbnails remain lightweight visual art; they do not create a grid of live iframes.
- Official styles open a focused preview before add/edit actions.
- Stable preset identity survives locale changes, and additional copies receive numbered names.
- A built-in widget that is not currently placed does not expose an ambiguous `恢复 / Restore` action. Its action hands the user to Home edit mode and exact-size slot selection.

### Custom Widgets

- Starter thumbnails lead into the composer without creating a widget immediately.
- The draft renders a real sandboxed preview before code is expanded.
- Appearance code is collapsed by default and can be disclosed for editing.
- Common placeholders can be inserted without requiring users to memorize syntax.
- Saved definitions render as preview cards with slot selection, edit, and delete controls.
- A saved widget that is not placed opens Home edit mode with that widget preselected; a placed widget returns to its existing Home entry for editing.
- Click action is configured separately from appearance code.

### Import

- Import is framed as creating widget previews and definitions, not as operating a JSON console.
- The default example shows what valid imported widgets will become.
- Pasted content is parsed and previewed before the import action is enabled.
- Invalid payloads keep feedback inside the active editor and do not mutate the existing library.
- Import adds definitions to the library; it never chooses a Home screen or slot.
- Successful create and import feedback offers `选择槽位 / Choose Slot`; multi-widget import preselects the first imported definition, while every saved card remains independently placeable.

### Security And Rendering Parity

- Direct create/update, JSON import, persisted legacy hydration, market preview, and Home rendering use one appearance-code validation and sanitization boundary.
- Active elements, inline handlers, navigation attributes, script content, and dangerous CSS are rejected or removed according to the shared contract.
- Preview iframes are scriptless and CSP-restricted.
- Built-in market metadata and visual composition are shared with Home through `BuiltInWidgetVisual.vue`; Market, formal Home cards, the Home library, and slot previews no longer maintain separate built-in widget markup.
- Built-in size metadata is the source of truth when Store defaults and slot placements are generated. New `4x1`, `4x3`, and `4x4` variants are no longer normalized through a legacy `2x2` fallback.
- New large widgets preserve their identity in compact Home-library and slot-preview states by removing secondary copy rather than scaling the entire full-size composition into unreadable text.
- Official/custom definitions preserve their actual appearance code through preview and Home rendering.
- A market thumbnail may simplify the composition for scanning, but it must not advertise a size, hierarchy, or effect that the resulting Home widget cannot reproduce.

### Home And Recovery

- `编辑主屏 / Edit Home` opens slot-first Home edit mode and preserves the originating Home page context.
- Home handles exact-size placement and does not show empty slots in normal mode.
- Layout changes return unmatched content to the appropriate library without deleting custom widget definitions.
- The current system default Home uses a restrained representative set of the new shared visuals: Weather Prism, Mood Window, Color Diary music, and Enamel Focus. Only the prior system-authored default migrates to this set; user-customized Home pages remain untouched.
- Catalog expansion does not place every new built-in on Home. Remaining variants enter the unplaced Home library and remain available only to exact-size slots.
- The left-side Today View is a fixed native-system recovery surface. App Store remains reachable there; enabled World Hub and future Cheats entries are fixed system entries rather than removable Home content.
- Widget Center remains reachable from the Dock on every formal Home page.

### Responsive Shell Prerequisite

- Home slot gaps and row heights adapt to available phone height with `vh`, `svh`, and `dvh` fallbacks instead of assuming a fixed `78px` row and `12px` gap.
- Drag hit-testing reads the rendered grid geometry, so pointer placement stays aligned with responsive slots.
- Extremely short screens can scroll Home content vertically while page dots, Dock, and edit controls remain inside the phone shell.
- The narrow portrait edit toolbar recomposes into two rows; short landscape keeps a compact row. The toolbar, recovery/library cue, and transient feedback have explicit non-overlap coverage.
- Simulated boundary coverage now includes `320x568`, `360x640`, `375x667`, `390x844`, `430x932`, and `844x390`, plus deep scroll and horizontal-drag checks for Settings, Widgets, Wallet, Map, and App Store return controls.
- This browser matrix is a completed prerequisite, not a substitute for WVO-1 physical-device Safari/PWA and Android Chrome/PWA acceptance.

### Mobile Interaction And Accessibility

- Custom and Import open as focused phone-sized sheets while desktop keeps the wider working layout.
- Mobile sheets own focus entry, Tab containment, Escape close, background inertness, and focus restoration.
- Style previews also restore focus to the opening card.
- Validation feedback is associated with the active editor, including `aria-invalid` for invalid import content.
- Focused automated coverage exists for desktop Chromium and simulated Pixel 5, including overflow, page errors, default/zen themes, security failures, import recovery, preview focus, and Home edit handoff.
- Widgets release coverage verifies shared Market/Home built-in composition and create/import/saved-widget `libraryTile` or `focusTile` handoff into Home.
- Focused coverage verifies full built-in size coverage, `4x3` and `4x4` exact-slot candidates, expanded Market composition, horizontal-overflow safety, and the selected large-widget Home-library preview.
- Focused Home coverage verifies Weather Prism and Mood Window state changes, Enamel Focus countdown, Commute Rail routing, and Color Memory Wall Gallery selection and persistence.

## 4. Open TODO

### WVO-1: Named True-Device Acceptance

Status: `NEXT WITHIN THIS FOCUSED HANDOFF`

Run the current flow on available named physical devices. Target one iPhone-class Safari/PWA environment and one Android-class Chrome/PWA environment; when either class is unavailable, record that gap instead of claiming complete cross-platform true-device acceptance.

Acceptance:

- Market cards, featured preview, filters, and bilingual labels do not clip or overlap.
- Opening and closing Custom, Import, and style preview preserves the correct scroll and focus context.
- The software keyboard does not cover the name, code, action, import, validation, or save controls.
- Browser chrome expansion/collapse and safe-area insets do not hide sheet headers, actions, or the gesture-area clearance.
- Textarea scrolling does not leak into or trap the background page.
- Touch targets remain usable without accidental card activation or sheet dismissal.
- Default and zen themes retain readable panel, field, disabled, selected, error, and destructive states.
- `Edit Home` returns to the originating formal Home page and opens edit mode without changing another page's layout.
- A valid import survives app relaunch, appears in the custom library, and can be placed only into an exact-size slot.
- No visible control uses `Restore` unless the action and consequence are explicit and immediate.

Record device, OS, browser/PWA mode, viewport/orientation, observed issue, and evidence path. Do not commit general-purpose `artifacts/` output unless the user explicitly requests repository evidence.

### WVO-2: Observed Release Corrections

Status: `CONDITIONAL`

Fix only issues demonstrated by WVO-1 or a reproducible browser regression. Likely correction areas are:

- keyboard and safe-area sheet geometry;
- long user-authored names and validation messages;
- market-thumbnail versus resulting Home-widget visual mismatch;
- selected, disabled, error, destructive, and focus contrast in default/zen;
- wide-viewport density that makes the phone market feel sparse or stretched;
- remaining raw utility colors in touched native-system controls.
- whether real device density requires another compact-state reduction for the `4x3` or `4x4` built-ins.

Do not start a broad visual restart when a bounded responsive or state correction is sufficient.

### WVO-3: Conditional Structural Follow-Ups

Status: `NOT PROMOTED`

- Per-instance action overrides, only if one widget definition must behave differently in different Home slots.
- Stronger hidden/unplaced-content recovery, only if device testing shows Widget Center, Home library, App Store, and Today View paths remain too indirect.
- Controlled quick actions or richer custom interaction, only through a separately approved allowlisted message protocol.
- Live data bindings for steps, commute, agenda, rhythm, or memory content, only after the source module and stale/empty/error behavior are explicitly owned. The current built-ins are polished visual baselines, not claims of shared health, transit, calendar, or gallery truth.

These are product/behavior slices, not unfinished visual polish. Promote them through the roadmap and owning package before implementation.

### WVO-4: Selected Visual Continuations

Status: `FOCUSED VISUAL TODO`

The following user-selected motifs remain valid future built-in candidates. They should be implemented as separate, single-purpose widgets only when their standard slot and interaction are clear:

- a people/contact portrait widget with one direct communication action;
- a compact gallery strip with independently replaceable image wells;
- a standalone paper music-memory strip distinct from the current `4x2` Color Diary player;
- a compact weather utility strip if it adds a genuinely different `2x1` use case from Weather Prism;
- a photo-led personal card that chooses either contact, music, or decoration as its primary purpose rather than combining all three.

Do not reuse the concept-sheet proportions as implementation sizes. Do not merge these into Color Memory Wall merely because both can show photos. Each promoted widget must define its Home slot, empty state, primary action, and whether user-selected media is decorative or navigational.

## 5. Required State Matrix

| Surface | States to preserve |
| --- | --- |
| Market | default, size-filtered, featured, style-added, long bilingual copy |
| Style preview | open, add, edit, Escape close, focus restored |
| Custom | starter selected, blank draft, preview ready, code disclosed, invalid code, save success, edit existing, delete confirmation |
| Import | example, empty, valid preview, warning, invalid payload, success, library result |
| Home handoff | originating page retained, edit mode visible, compatible slots only, normal-mode empty slots hidden |
| Themes/layout | default and zen; phone, wide viewport, software keyboard, safe-area/browser-chrome changes |

## 6. Primary Files

Implementation:

- `src/views/WidgetsView.vue`
- `src/components/widgets/BuiltInWidgetVisual.vue`
- `src/lib/widget-style-presets.js`
- `src/lib/home-widgets.js`
- `src/lib/widget-schema.js`
- `src/lib/custom-widget-preview.js`
- `src/lib/custom-widget-actions.js`
- `src/stores/system.js`
- `src/views/HomeView.vue`

Focused tests:

- `tests/widgets-view-custom-template.test.js`
- `tests/widget-appearance-security.test.js`
- `tests/system-widget-import.test.js`
- `tests/home-layout-templates.test.js`
- `tests/home-folder-entry.test.js`
- `e2e/widgets-release.spec.js`
- `e2e/shell-device-boundaries.spec.js`

Contracts:

- `docs/process/VISUAL_WORKFLOW.md`
- `docs/product-decisions/HOME_DESKTOP_LAYOUT_SYSTEM.md`
- `docs/process/NAVIGATION_RETURN_CONTRACT.md`
- `docs/references/VISUAL_ASSET_LIBRARY.md`

## 7. Validation For A Widgets Code Round

Minimum focused checks:

```text
npm.cmd run lint
npm.cmd test -- tests/widgets-view-custom-template.test.js tests/widget-appearance-security.test.js tests/system-widget-import.test.js
npm.cmd run test:e2e -- e2e/widgets-release.spec.js
npm.cmd run test:e2e -- e2e/shell-device-boundaries.spec.js
npm.cmd run build
git diff --check
```

Also run the full unit suite when shared widget schema, `systemStore`, Home placement, persistence, or navigation changes. Run the visual gate when Home or shared native-system styling changes. Capture desktop and phone screenshots for every visible Widgets round; simulated mobile evidence does not replace WVO-1.

## 8. Guardrails

- Do not bring back screen-number selectors in Widget Center.
- Do not place widgets directly from Market, Custom, or Import.
- Do not make code the first visual layer.
- Do not render every market/starter card as a live iframe.
- Do not execute imported scripts or let imported code navigate SchatPhone.
- Do not move widget packages into App Store or whole-page templates into Widget Center.
- Do not change default Home content merely to advertise every available widget.
- Do not use visual polish to alter persistence, backup, or migration contracts without a separately approved slice.
- Do not rewrite the package handoff or project roadmap for routine state, spacing, color, or responsive fixes.

## 9. Next Safe Slice

Complete WVO-1 against the deployed build after the current shared worktree is integrated. Fix only reproducible Widgets/Home issues found by that matrix. If the named devices pass without product changes, record the evidence in this file and the visual package handoff, mark WVO-1 complete, and close the current Widgets visual release slice.
