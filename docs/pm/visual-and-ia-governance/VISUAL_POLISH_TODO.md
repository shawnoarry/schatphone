# Visual Polish TODO (视觉专项切片计划)

Updated: 2026-08-17

Owner package: `docs/pm/visual-and-ia-governance/`.

This file is the visual-lane working plan for the ongoing UI beautification effort. It is NOT a roadmap, task board, or second authority: live priority and product status remain owned by `docs/roadmap/TODO_ROADMAP.md`, and product meaning remains owned by the task packages. When this file conflicts with those, those win.

Cross-PC resume rule: read this file, then `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md` (the authoritative record of landed slices), then `docs/process/VISUAL_WORKFLOW.md`. Screenshot evidence lives in machine-local `tmp/*-visual/` folders and is NOT cross-machine evidence; validation results are re-runnable on any PC.

Working rhythm (user-set 2026-08-17): one small slice at a time; document first, then implement; each slice must independently pass the validation contract.

Validation contract per slice (visual-only code change): `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build`, plus focused Playwright screenshot evidence across `default`/`zen` and desktop/mobile when a surface changes. Run `npm.cmd run test:visual` when a gate-covered surface is touched.

## 0. Integration State (read first when resuming)

2026-08-17 integration: local visual work was rebased onto `origin/main` (4 remote commits: EVE-4B food-delivery event chain, commerce event foundation, CJA-1..CJA-5 calendar/agenda/weather, widget e2e stabilization). Two conflicts resolved: package handoff (kept newer date line) and `GalleryView.vue` (adopted the remote redesigned IA wholesale — tabbed Library/Albums, People/Places, album detail — then re-applied tokenization as the follow-up slice below). `npm ci` was required for new remote dependencies (`uisfx`, `opencc-js`). Merged-baseline validation at that point: lint, **290 files / 2047 tests**, build, visual gate 16/16 — all green.

Latest slice (same day): tokenized the redesigned Gallery (`--gallery-*` bridged to `--system-*`; surfaces/text/semantic colors on system tokens; `#0a84ff` kept as app-owned accent). Validation now includes lint, the full **290 files / 2047 tests**, build, the default/zen visual gate **16/16**, targeted Gallery tests 30/30, and screenshots.

Local git state after cross-PC sync: `main` matches `origin/main` at `d0a0b1d`; no tracked local changes remain, and only unrelated untracked temporary directories are present.

Known flake: one intermittent single-test failure observed twice across many full runs (unidentified, always green on rerun).

NOT done / open for the next session:

1. Re-evaluate the Calendar lane (section 2) against the now-integrated CJA implementation: remote already ships Month/Week/Agenda (`CalendarWorkspace.vue`, `CalendarEventEditor.vue`), the Agenda Journey app, Activity Session, and Weather. The drafted month-grid Slice A is likely obsolete — review `output/e2e/calendar-cja1/` screenshots and the new components first, then decide what (if anything) remains for the visual lane. The two `PENDING RE-CONFIRMATION` items (month-grid direction, cross-app date links) must be re-discussed with the user in this new context.
2. The 12-marker system stays a user-approved idea, but its mapping target changed: it should attach to the remote `CalendarEventEditor`/workspace, not the old list cards. Do not start before the re-discussion in item 1.
3. `npm run test:e2e` full run has not been executed on the merged baseline (only the 16-case visual gate and the focused event E2E set have passed).

## 1. Completed Slices

### 2026-08-18 Gallery redesigned-IA token parity (post-integration)

- The remote redesign (tabbed Library/Albums, People/Places, album detail, sheet UI) shipped hard-coded light (`#ffffff` surfaces, ink-derived grays). Bridged `--gallery-*` locals to `--system-*`, mapped surfaces/text/semantic feedback to system tokens, and kept `#0a84ff` as the app-owned Photos accent.
- Validation: lint, targeted gallery tests 30/30, build, default/zen screenshots.

### 2026-08-18 Chat accent parity across appearance modes

- User-reported defect: Chat Settings icon tiles (and sibling accents) were hard-coded `yellow-*` utilities, so switching Chat appearance to ocean/mint/coral (or WeChat/iMessage layouts) left clashing yellow chrome.
- Fix lives in one place: a `.chat-shell`-scoped override map in `src/style.css` remaps legacy `yellow-*` utilities to `--chat-accent-soft` / `--chat-accent-ink` / `--chat-send-bg` / `--chat-send-text`, following the existing `section.bg-white` remap precedent. Zero template edits across ChatSettings/ChatMe/ChatGroups/ChatFeaturePlaceholder/ChatAppearance/ChatDirectory/ChatView.
- Follow-up from the user's custom-CSS experiment (starry-night dark theme, `tmp/chat-css-starry-night.css`): the settings-family pages also carried raw neutral grays and blue toggles that broke under dark custom themes. Extended the same map with page-scoped neutral/blue coverage (`.chat-settings-page`, `.chat-me-page`, `.chat-feature-page`, `.chat-appearance-page`, `.chat-groups-shell`): gray text -> `--chat-ink`/`--chat-muted-ink`, gray/blue surfaces -> `--chat-panel-muted-bg`/`--chat-accent-soft`, blue switch tracks -> `--chat-accent-ink`, borders -> `--chat-panel-border`; the branded `chat-settings-hero` intentionally keeps its light treatment with pinned dark text.
- Environmental fix: added `.codex/**` to `eslint.config.js` ignores (machine-local tool files rewritten 2026-08-18 broke `npm run lint`; `.agents/**` precedent).
- Validation: lint, chat-focused tests 45/45, full suite 291 files / 2067 tests (green on rerun; one intermittent single-test flake recurs — known, see §0), build, screenshots across kakao/ocean/mint modes plus live starry-night custom-CSS thread/settings checks.

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

## 2. Current Lane: Calendar / Reminders Schedule Identity

Audit basis (visual package 2026-07-16 matrix): schedule surfaces read as generic status cards; Calendar/Reminders are targeted rebuild candidates. Hard constraints: Reminders stays the unconfirmed-cue inbox, Calendar stays the confirmed-schedule owner.

**Course correction 2026-08-17 (USER-PROPOSED, PENDING RE-CONFIRMATION)**: the earlier "Quiet Timeline" agenda-list design reads as the future **Agenda Journey (行程)** surface, not Calendar. It is preserved below as reserved design language. The user proposed that the Calendar home should instead be a **perpetual month grid (万年历), iOS-Calendar-like**: month grid with tap-a-day selected-day detail. **Status: the user raised this direction and explicitly asked for it to be recorded as awaiting their re-confirmation — do not treat it as approved, do not sync it into `TODO_ROADMAP.md`, and re-confirm with the user before implementing the month-grid slice.** If confirmed, it would be the user's CJA-1 direction for roadmap 4.12 (Month view first, day-tap detail), and the month grid would ship as its own slice (new view-layer structure computed from existing event data) with targeted Playwright e2e.

**Cross-app date links 2026-08-17 (USER-PROPOSED, PENDING RE-CONFIRMATION)**: the user proposed that Calendar, the future Agenda Journey app, and a future Diary app keep independent entries but carry mutual jump buttons. Assessment recorded: endorsed, with three rules — (1) deep links carry date context (`?date=`), so Calendar day detail links to that same day in Agenda Journey and vice versa, with return context per `docs/process/NAVIGATION_RETURN_CONTRACT.md`; (2) buttons are navigation only, never data copies — each app keeps owning its truth (Calendar commitments, Agenda Journey execution, Diary narrative); (3) a link appears only when its target app exists (no placeholder dead entries), and the Diary link is additionally gated on the roadmap 4.12 CJA-6 Diary approval (product name, route, persistence owner, retention, AI-context interface are all unapproved today). Product note: the three apps are three views of the same day (commitments / execution / reflection), so date is the natural link key.

Reserved design language (for the future Agenda Journey app, or Calendar's later Agenda view): today anchor block, day-grouped quiet timeline, time-column event rows. Do not build it into Calendar now.

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

## 3. Visual Backlog (not scheduled, one slice at a time)

1. Shopping platform identity (audit: remains generic; leverage six storefront brand icons).
2. Chat supporting pages density alignment (ChatMe / ChatSettings / ChatGroups toward the main Chat identity).
3. Network deep-form token cleanup (mix of system tokens and raw utility colors).
4. Contacts / WorldBook density polish (typography subtraction only; do not rebuild completed ownership loops).
5. Wide-viewport shell contract (needs a contract decision before page-level work; Lock/notification evidence).
6. Shared component residuals: `AssetThumbnailOption` placeholder ground and `AssetStatusBadge` pastel chips under `zen` (acceptable today; shared-component slice).
7. Visual gate extension policy: add surfaces only for repeated regression risk (Gallery added 2026-08-17).

## 4. Deferred / Do Not Do

- ~~No Month/Week/Agenda calendar views~~ — superseded 2026-08-17: user gave the CJA-1 Month-first direction (see section 2); Week/Agenda views and multi-day spans remain unstarted 4.12 stages, and the reserved Quiet Timeline language stays parked for Agenda Journey.
- No event authoring model changes (CJA-1 authoring scope is a separate roadmap stage).
- No Gallery Photos-first entry or People views (deferred by package handoff).
- No Wallet / Food Delivery / Map / Music / Home / Appearance rework (accepted directions to preserve).
- No Calendar execution-model UI (checkboxes, step ordering) — that language belongs to the future Agenda Journey app.
