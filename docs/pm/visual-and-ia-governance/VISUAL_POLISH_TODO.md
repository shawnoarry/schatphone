# Visual Polish TODO (视觉专项切片计划)

Updated: 2026-08-27

Owner package: `docs/pm/visual-and-ia-governance/`.

This file is the visual-lane working plan for the ongoing UI beautification effort. It is NOT a roadmap, task board, or second authority: live priority and product status remain owned by `docs/roadmap/TODO_ROADMAP.md`, and product meaning remains owned by the task packages. When this file conflicts with those, those win.

Cross-PC resume rule: read `docs/roadmap/TODO_ROADMAP.md`, then `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`, and use this file only for the current bounded visual slice plus historical candidate detail. Load `docs/process/VISUAL_WORKFLOW.md` only when a visual implementation slice is promoted. Screenshot evidence lives in machine-local `tmp/*-visual/` folders and is NOT cross-machine evidence; validation results are re-runnable on any PC.

Working rhythm (user-set 2026-08-17): one small slice at a time; document first, then implement; each slice must independently pass the validation contract.

Validation contract per slice (visual-only code change): `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build`, plus focused Playwright screenshot evidence across `default`/`zen` and desktop/mobile when a surface changes. Run `npm.cmd run test:visual` when a gate-covered surface is touched.

## 0. Integration State (read first when resuming)

Integrated baseline: `823d108` on 2026-08-27. The live roadmap remains the execution authority; this working plan does not promote any item by itself.

Current integrated meaning:

1. the Calendar/Reminders lane in section 2 is complete historical evidence, not the active visual lane: Month/Week/Agenda, Calendar appearance markers, Calendar-to-Agenda date links, Agenda Journey, Activity Session, and Reminders presentation are already integrated;
2. Appearance now has five stylized system themes, independent system icon packs, one-click style kits, and optional companion-widget collections at their recorded scoped baselines; another theme or icon family is not the current task;
3. the accepted S1 App-shell portfolio and Notification Center are complete at simulated desktop/mobile acceptance, while installed-PWA/relaunch and named physical-device proof remain release gates;
4. Contacts V3 is the roadmap P0 lane. `PERSONA-1` is next, followed by `PERSONA-2` and purpose-specific projections before Work Hub promotion.

Current bounded working slice, explicitly accepted by the user on 2026-08-27:

1. close visual integration bookkeeping without adding a new theme, page redesign, or product capability;
2. keep registry-backed project-image-bed runtime assets out of Git when their local bytes are only untracked caches; verify registry coverage and byte identity instead;
3. retain focused regression coverage for independent App identities and system-pack preset images;
4. preserve unrelated Map screenshot evidence, Commerce documentation, generated review folders, and local audit scripts without staging, deleting, or reclassifying them;
5. after this closure, return to the roadmap queue with `PERSONA-1`, then `PERSONA-2`; treat review, conflict, confirmation, and mobile form presentation as the next UI-quality surface.

The historical completed slices and unscheduled candidate backlog remain below for context. They do not override the current roadmap or package handoff.

## 1. Completed Slices

### 2026-08-18 Gallery redesigned-IA token parity (post-integration)

- The remote redesign (tabbed Library/Albums, People/Places, album detail, sheet UI) shipped hard-coded light (`#ffffff` surfaces, ink-derived grays). Bridged `--gallery-*` locals to `--system-*`, mapped surfaces/text/semantic feedback to system tokens, and kept `#0a84ff` as the app-owned Photos accent.
- Validation: lint, targeted gallery tests 30/30, build, default/zen screenshots.

### 2026-08-18 Chat accent parity across appearance modes

- User-reported defect: Chat Settings icon tiles (and sibling accents) were hard-coded `yellow-*` utilities, so switching Chat appearance to ocean/mint/coral (or WeChat/iMessage layouts) left clashing yellow chrome.
- Fix lives in one place: a `.chat-shell`-scoped override map in `src/style.css` remaps legacy `yellow-*` utilities to `--chat-accent-soft` / `--chat-accent-ink` / `--chat-send-bg` / `--chat-send-text`, following the existing `section.bg-white` remap precedent. Zero template edits across ChatSettings/ChatMe/ChatGroups/ChatFeaturePlaceholder/ChatAppearance/ChatDirectory/ChatView.
- Follow-up from the user's custom-CSS experiment (starry-night dark theme, `tmp/chat-css-starry-night.css`): the settings-family pages also carried raw neutral grays and blue toggles that broke under dark custom themes. Extended the same map with page-scoped neutral/blue coverage (`.chat-settings-page`, `.chat-me-page`, `.chat-feature-page`, `.chat-appearance-page`, `.chat-groups-shell`): gray text -> `--chat-ink`/`--chat-muted-ink`, gray/blue surfaces -> `--chat-panel-muted-bg`/`--chat-accent-soft`, blue switch tracks -> `--chat-accent-ink`, borders -> `--chat-panel-border`; the branded `chat-settings-hero` intentionally keeps its light treatment with pinned dark text.
- Custom-CSS ceiling verified live with three experiment packs (`tmp/chat-css-*.css`, machine-local): variable reskin (starry night), material/typography/pseudo-content/motion/precision targeting (mint soda), and structural override (forum mode moves user messages to left-aligned posts — proof that the layout layer is also CSS-reachable).
- Chat Appearance advanced CSS gained file import: "从文件导入" picker loads a `.css` file into the draft, auto-enables custom CSS, and prefills the style name from the filename. `MAX_CHAT_CUSTOM_CSS_CHARS` is now exported from `lib/chat-appearance.js` (was a private const). Permanent e2e coverage in `e2e/chat-appearance.spec.js`.
- Environmental fix: added `.codex/**` to `eslint.config.js` ignores (machine-local tool files rewritten 2026-08-18 broke `npm run lint`; `.agents/**` precedent).
- Validation: lint, chat-focused tests 45/45, full suite 293 files / 2074 tests, build, e2e chat-appearance 4/4, screenshots across kakao/ocean/mint modes plus live starry-night/forum-mode custom-CSS checks.

### 2026-08-17 Gallery (Photos) token parity

- `GalleryView` fully on `--system-*` tokens (was hard-coded light iOS); `default`/`zen` parity.
- Empty state redesigned (icon tile + title + hint + primary CTA; filter-reset recovery).
- Fixed pre-existing mobile defect: controls exceeded the viewport and the photo grid collapsed to ~32px; page is now one scroll region under a persistent topbar.
- Added accessible names (2 icon buttons, 6 selects); Gallery added to the shared visual gate (`e2e/visual-quality.spec.js`, now 16 cases).
- Validation: lint, 258 files / 1913 tests, build, gate 16/16, screenshots, `git diff --check`.

### 2026-08-17 Camera settings family token parity

- `CameraSettingsShell` + 7 views (Settings, Tasks, Providers, Provider, Defaults, Routing, Diagnostics) on `--system-*` tokens.
- Category icon tiles kept as app-owned iOS-style palette; dark summary/provider tiles invert adaptively.
- Capture surface (`CameraView`) intentionally untouched (always-dark app identity).
- Validation: lint, full suite, build, 28 screenshots across 6 routes + provider detail, both themes.

### 2026-08-17 TTS voice settings Chat alignment

- `TtsSettingsView` moved from a one-off hard-coded green theme to the `--chat-*` shell variables because its visual owner is Chat (entry: Chat Settings).
- Header now uses shared `chat-native-header`/`chat-native-back` naming the real return target.
- Follows every Chat appearance preset (Kakao yellow, iMessage blue, WeChat green verified); Chat presets intentionally stay light under `zen`, matching Chat itself.
- Validation: lint, TTS unit 13/13, TTS e2e 2/2, full suite twice (one unrelated flake observed once, green on both reruns), build, screenshots.

### 2026-08-17 Network deep-form token cleanup

- The page shell was already tokenized; the actual residual lived in the two child panels' uncovered utility colors. Extended the existing `:deep()` override map in `NetworkView.vue` to cover `emerald` -> `--system-success*`, `amber` -> `--system-warning*`, and `indigo` -> `--system-info`/control tokens. Zero template/logic change, child components untouched.
- Validation: lint, focused tests 29/29, full suite 258 files / 1913 tests, build, default/zen screenshots (status boxes now read as proper semantic tones in both themes).

## 2. Completed Historical Lane: Calendar / Reminders Schedule Identity

Audit basis (visual package 2026-07-16 matrix): schedule surfaces read as generic status cards; Calendar/Reminders are targeted rebuild candidates. Hard constraints: Reminders stays the unconfirmed-cue inbox, Calendar stays the confirmed-schedule owner.

### 2.0 What the integrated baseline already ships (verified from code + `output/e2e/calendar-cja1/` screenshots)

- **CJA-1 is landed**: Calendar has Month / Week / Agenda views over Calendar-owned events — Mon-first month grid with today accent circle and selected-day outline, neutral event indicator bars, month navigation plus Today, `+ New` event authoring in `CalendarEventEditor` (required/optional cards, reminder select, Map-place binding without coordinate copying), Agenda view with day-grouped cards. Zen parity verified.
- **CJA-2..CJA-5 are landed**: hidden Schedule Orchestrator, the visible Agenda Journey app at `/agenda-journey` (own green-accent identity, travel steps, transport chooser, Map-linked journeys), Activity Session, and one low-impact event family.
- No `markerId`/event-color concept exists anywhere in `src/` — the marker system below is still unbuilt and is the main remaining visual-lane item in this lane.

### 2.1 Resolution of the two 2026-08-17 PENDING RE-CONFIRMATION items

1. **Month-grid calendar home** — SUPERSEDED BY INTEGRATION. The user-proposed direction (iOS-like month grid + tap-a-day detail) is what the integrated CJA-1 shipped. No build work remains for the visual lane here; only polish-level review if issues are observed. This record stays as the decision trail.
2. **Cross-app date links (日历↔行程↔日记)** — `PARTIAL_DONE 2026-08-19 (Calendar ↔ Agenda Journey live; Diary still gated)`: Calendar's selected-day header gained a `看行程 / View journey` link deep-linking to `/agenda-journey?source=calendar&date=YYYY-MM-DD`, and Agenda Journey's topbar gained a `看日历` button deep-linking back to `/calendar?source=agenda-journey&date=YYYY-MM-DD`; both sides parse `?date=` (Calendar anchors and selects that day, Agenda Journey picks the matching filter tab and selects the day's first journey, keeping the journeyId query in sync so the existing watcher does not clear it). Return context rides the existing navigation-return contract (calendar and agenda-journey are already registered return targets). Diary links stay gated on roadmap 4.12 CJA-6/CJA-6A approval. Validated: lint, focused tests 22/22 including new date-link cases in `tests/agenda-journey-view.test.js`, full suite 302 files / 2161 tests, build, new `e2e/calendar-agenda-date-links.spec.js` 2/2 plus related calendar/agenda specs green.

### 2.2 Remaining work in this lane (re-mapped)

- **Slice B (12-marker 便签系统, user-approved model)** — `DONE 2026-08-19`: `src/lib/calendar-markers.js` holds the palette + 12 default markers (约会/生日/事业活动/纪念日/重要会议/其他/自定义1-6) + `normalizeCalendarMarkers`/`normalizeCalendarAppearance`/resolve helpers; events carry optional additive `markerId` (store normalize + updateEventDetails passthrough); `settings.appearance.calendar` normalizes on both hydration passes and rides the `system-settings` backup section; `CalendarEventEditor` has a 12-chip marker picker (clearable); `CalendarWorkspace` renders marker colors on month pills, agenda rows, and selected-day rows (border bar + label chip); and `CalendarEventCard` shows the marker chip in the event detail meta row (added in the follow-up micro-slice). Validated: lint, targeted tests + `tests/calendar-markers.test.js`, full suite 299 files / 2109 tests (green on rerun; the recurring intermittent single-test flake persists — always green on rerun), build, and `e2e/calendar-presentation.spec.js` marker flow 6/6 (persisted-record poll + has-marker DOM + agenda chip). Note: a reload-immediately-after-write probe was intentionally dropped from that e2e — immediate reload after a write hits the same-container conflict-protection read-only state (persistence-lane behavior, not marker-specific).
- **Slice C (Calendar appearance settings)** — `DONE 2026-08-19`: `/calendar/settings/appearance` (new `CalendarAppearanceView.vue`, gear entry in the Calendar header). `settings.appearance.calendar` now also carries `colorPreset` (default/muted/candy, each redefining the 12 curated hues) and `glyphStyle` (bar/dot/icon_tint), normalized alongside markers on both hydration passes and backed up via `system-settings`. V1 controls: 3 whole-set preset cards with swatch strips, glyph style cards with mini previews, per-marker label edit + hue swatch swap from the active preset, and reset-all. Workspace and editor render from the active preset and glyph style (mobile month indicators stay solid bars under every glyph). Calendar owns this layer (Chat Appearance precedent); excluded from global appearance packs. Validated: lint, new `tests/calendar-markers.test.js` + `tests/calendar-appearance-view.test.js`, full suite 300 files / 2113 tests, build, default/zen screenshots of the settings page plus a candy-pink dot-glyph workspace proof.
- **Reminders polish** — `DONE 2026-08-19`: the smart count cards (待处理/已确认/已固定) are now tappable status filters with toggle behavior and active states; the redundant static source-stats row was removed (counts live in the filter chips); reminder source icon tiles carry per-source subtle tints (map/phone/shopping/stock); card actions now read as hierarchy — 确认进日历 is a filled success-primary while pin/source/dismiss are quiet secondaries (dismiss gains danger only on hover); the Calendar boundary panel is demoted to a dashed quiet strip with a link-style button (dead `bg-blue-500` class removed). Zero logic change. Validated: lint, reminders store tests 5/5, `e2e/reminders-presentation.spec.js` 4/4, build, default/zen screenshots with seeded phone/shopping/stock cues plus a smart-filter interaction proof.
- **Quiet Timeline language** stays reserved for Agenda Journey's future depth (its current identity is green-accent travel/activity cards and does not use this language).

### 2.3 Historical record (2026-08-17 planning, pre-integration)

The original Slice A/B/C draft below was written before the CJA integration landed locally. It is kept as decision evidence; section 2.2 supersedes it for execution.

Reserved design language for a future Agenda Journey depth slice, or a later Calendar Agenda-view refinement: today anchor block, day-grouped quiet timeline, time-column event rows. The current Agenda Journey app is already integrated; do not infer this visual candidate as unfinished route or owner work.

### Slice A (drafted 2026-08-17 as Calendar month-grid home + selected-day detail — starts only after the user re-confirms the month-grid direction above)

- Month grid: Monday-first week rows; today = accent filled circle; selected day = ring; outside-month days dimmed; per-cell marker dots (up to 3, then `+N`); month chevron navigation plus a `回到今天 / Today` action.
- Selected-day detail below the grid (phone) or beside it (wide): date + weekday header, that day's event list (time column `HH:mm` / 全天 + neutral accent bar in Slice A + title + small source chip), honest empty state (`这一天没有安排`).
- Event detail (L1) keeps every existing function (time edit, push status, relationship facts); presentation only.
- Reminders slice (unchanged by the course correction): Apple-style smart count row driving existing filters; reminder card = source icon tile + title + one-line time; primary action accent-filled, secondary actions icon buttons; boundary panel demoted to a quiet strip.
- Everything on `--system-*` tokens, `default`/`zen` parity, targeted e2e for grid/day-tap/empty-state/overflow.

### Slice B (marker system 便签系统 — needs explicit approval: tiny persisted field)

Decision 2026-08-17 (user-confirmed model 方案丙, expanded to 12): calendar categories are USER-MEANING types, NOT event-source lineage. Model = marker registry: **12 built-in markers**, each = stable id + editable label + swappable curated color. Default labels: 约会(coral), 生日(pink), 事业活动(blue), 纪念日(violet), 重要会议(indigo), 其他(neutral), plus 自定义1..自定义6 for uncertain events (labels editable by design). Events carry an optional `markerId`; event detail gains a marker picker. Source lineage stays visible as a small text chip only. Palette is user-changeable by requirement: **V1 confirmed = curated, both-themes-verified swatch palette in the Slice C settings page**; a hue wheel/slider (storing hue-angle only, deriving per-theme values via color-mix) is an unpromised later candidate; raw free hex is rejected; full freedom remains the later security-reviewed Calendar-scoped custom CSS path.

Marker rendering after Slice B: month-grid cells show marker-colored dots; selected-day event rows show the marker color bar plus a small marker label chip. Slice A ships with a neutral accent bar and neutral dots only.

Remaining confirmations before Slice B starts:

1. persisted shape: `settings.appearance.calendar.markers` (12 entries: id, label, colorKey) + optional event `markerId` (additive, backward compatible);
2. the 6 named default labels above (自定义1..6 fill the rest).

### Slice C (Calendar appearance settings — needs explicit approval: new route + settings field)

- Entry: Calendar header gear -> `/calendar/settings/appearance` (mirrors `/chat-settings/appearance`).
- Ownership: Calendar owns its appearance layer, same precedent as Chat Appearance; excluded from global appearance packs.
- V1 controls: per-marker color swap from curated palette, marker glyph style (bar / dot / icon-tint only), 3 whole-set presets (default / muted / candy), reset all.
- Persistence: `settings.appearance.calendar` + small normalize lib + tests.
- V1 color control = curated swatch palette (both themes verified); V2 candidate = hue wheel storing hue-angle only, deriving per-theme values (see Slice B decision).
- Later, unpromised: Calendar-scoped custom CSS (security review required), shareable packs.

## 2A. Thread Menu Card (会话内"⋯"设定卡) Audit And Fix Slices

User report 2026-08-19: the per-thread details card (top-right `⋯` in a conversation) is inconveniently positioned, many rows merely mirror global settings, and some threads cannot load dedicated knowledge points.

Full problem list (audit of `ChatThreadMenuPanel.vue` + `useChatThreadMenuModel.js` + `role-binding-contract.js`):

1. Container: bottom sheet is `absolute inset-0` inside the thread page — on phone it hides the conversation it configures; on wide viewports it stretches into a full-width sheet (wide-shell stretch again).
2. "Global mirror" impression: the 16 AI prefs ARE thread-level drafts with their own save, but nothing marks "following global default" vs "overridden here", so users read them as mirrors and fear editing.
3. Knowledge root cause: knowledge points bind to ROLE profiles only (`roleBound = contactKind === 'role' && profileId > 0` in `role-binding-contract.js`). A thread not bound to a role profile gets zero injected points; the card's WorldBook area is read-only (counts + preview + a link out) with no in-place repair, and the "disabled/missing/over-limit" note is not actionable.
4. Mixed commit semantics in one card: subscription mute/fold apply instantly, AI prefs need manual save, avatars have their own separate save.
5. The AI-prefs save row lives inside a collapsed `<details>` (invisible when collapsed) and shows no dirty indicator.
6. The token-estimate block is prominent but read-only.
7. Role threads lack quick management actions (those live in Chat Directory); service threads get only subscription toggles — asymmetric.
8. 16 flat fields inside one disclosure mix overview/execution/diagnostics (violates the project's own container gate).
9. The card is hard-coded `bg-white` + gray utilities, so it ignores custom CSS themes (e.g. stayed white under the starry-night experiment) — the `.chat-shell` override map did not cover it.

Fix slices (sized):

1. `DONE 2026-08-19` — Card follows Chat appearance: `.chat-shell`-scoped overrides now cover the thread-menu layer (panel/field surfaces, text, borders, blue/violet/emerald/green/amber/orange accents); wide viewports cap the sheet at 560px centered.
2. `DONE 2026-08-19` — Clarity pass: per-field "已覆盖 / Custom" chips when a value differs from the global default (defaults exposed from the menu model), the AI-prefs save row moved to a sticky card footer (always visible), a dirty dot marks unsaved edits, and a one-line note clarifies that thread avatars save separately.
- Validation for both: lint, chat-focused tests 48/48, full suite 293 files / 2074 tests, build, and live screenshots covering Kakao default, a custom-CSS dark theme (card now follows), wide desktop (capped/centered), the "已覆盖" chip, and the dirty footer dot.
3. ~~`TODO (medium)`~~ `DONE 2026-08-19` — WorldBook area is repairable in place: the "未注入" note became tappable repair links. `resolveRoleKnowledgeState` now also returns `profileId`, `disabledPointIds`, and `missingPointIds` (additive). Disabled points deep-link into WorldBook focused on those entries; missing/over-limit counts deep-link to the bound role's Contacts profile with chat-thread return context. Permanent coverage: `tests/world-interface.test.js` (new field assertions) + `e2e/chat-thread-menu-repair.spec.js` (route-level proof for both links).
4. `TODO (needs product approval, NOT visual)` — Optional thread-level knowledge binding (thread-scoped point IDs) so a conversation without a role profile can still carry dedicated knowledge. Must go through the chat package product boundary, not this lane.

## 3. Visual Backlog (not scheduled, one slice at a time)

1. Shopping platform identity (audit: remains generic; leverage six storefront brand icons).
2. Chat supporting pages density alignment (ChatMe / ChatSettings / ChatGroups toward the main Chat identity).
3. ~~Network deep-form token cleanup~~ — done 2026-08-17 (see section 1).
4. Contacts / WorldBook density polish (typography subtraction only; do not rebuild completed ownership loops).
5. Wide-viewport shell contract (needs a contract decision before page-level work; Lock/notification evidence).
6. ~~Shared component residuals~~ — `DONE 2026-08-19`: `AssetStatusBadge` tone palette moved to semantic tokens (neutral/amber/emerald/red -> muted/warning/success/danger soft pairs; default blue -> accent; sky-solid kept as its deliberate solid identity); `AssetThumbnailOption` placeholder frames, names, loading text, and selection frames moved to `--system-*` tokens (selection tones unify on accent/info/neutral; the cyan rail variant stays as-is for its dark media-surface context). Both follow the theme across their ~12 consuming surfaces (Gallery, Assets, Camera, Appearance, Contacts, Chat panels, Map panels, WorldBook, pickers). Validated: lint, 47 focused tests across the consuming surfaces, full suite green on rerun, build, default/zen screenshots. Note: the suite-wide intermittent single-test flake is getting more frequent as the suite grows (roughly 1-in-3 runs) and deserves its own investigation outside this lane.
7. Visual gate extension policy: add surfaces only for repeated regression risk (Gallery added 2026-08-17).

## 4. Deferred / Do Not Do

- ~~No Month/Week/Agenda calendar views~~ — superseded 2026-08-17: user gave the CJA-1 Month-first direction (see section 2); Week/Agenda views and multi-day spans remain unstarted 4.12 stages, and the reserved Quiet Timeline language stays parked for Agenda Journey.
- No event authoring model changes (CJA-1 authoring scope is a separate roadmap stage).
- No Gallery Photos-first entry or People views (deferred by package handoff).
- No Wallet / Food Delivery / Map / Music / Home / Appearance rework (accepted directions to preserve).
- No Calendar execution-model UI (checkboxes, step ordering) — that language belongs to the existing Agenda Journey owner and may deepen only through its own promoted slice.
