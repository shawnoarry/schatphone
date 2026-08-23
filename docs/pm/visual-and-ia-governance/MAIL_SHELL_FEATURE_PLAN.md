# Daon Mail Shell Feature Plan / 다온메일 壳功能梳理

Updated: 2026-08-23

Status: `SHP-1 / SHP-1B LANDED / S2 OWNER IMPLEMENTATION NOT AUTHORIZED HERE`

This is the focused product file for the Daon Mail preview shell (roadmap 4.16). It records what the shell owns today, the accepted AI-arrival rules, and the separately gated follow-ups. It does not create a second backlog; `docs/roadmap/TODO_ROADMAP.md` still owns priority.

## 1. What is landed

### SHP-1 S1 fixture shell (DONE 2026-08-23)

- fictional Korean portal-mail identity (다온메일 Daon Mail) with the portal-green system, folder rail, dense row list, reading pane, mobile drawer, compose/drafts/local-sent, search, and complete empty states;
- nine bilingual inbox fixture threads plus one spam fixture referencing the existing Seoul world;
- device-local preview state under `schatphone:mail-shell:preview-state` (registered, excluded from backup);
- Home formal page-2 entry through the `layout-h` default template, App Store entry, icon customization, and a `mail` return source so the Calendar invitation deep link round-trips.

### SHP-1B AI arrival (DONE 2026-08-23)

- a `接收 / Receive` header action performs exactly one provider call per click through the shared `callAI` transport (direct or proxy, the user's Network & API settings);
- the prompt carries bounded context only: user-managed sender whitelist, active world name plus a ~320-character worldview excerpt, the Self Profile display name and public role line (~120 characters), and the current system language;
- ordinary browsing, folder switches, search, read/star/archive, and opens remain zero-token; the receive button is the only provider entry;
- the response must parse as strict JSON and pass validation (sender name/address shape, subject and paragraph caps, label allowlist, HTML rejection) before one unread letter is committed locally with provider/model provenance;
- fail-closed everywhere: missing provider surfaces the honest recovery action into Network & API, provider failures and invalid drafts create no letter and never fall back to a deterministic substitute mail;
- generated letters are in-world display content. They never write relationship facts, metrics, world state, or any other owner.

## 2. Sender whitelist product rules

- the whitelist is user configuration, not a hardcoded list: `schatphone:mail-shell:sender-whitelist` (registered, excluded from backup) defaults to the fixture institutions and is managed from the in-app sheet (add/remove/restore defaults);
- `allowNewSenders` (default on) lets the model invent one new fictional sender per receive; a validated invention is enrolled with origin `generated`, shown with an `AI 新增 / AI-added` badge, and can be deleted or restored away like any entry;
- the prompt directs inventions toward fictional counterparts of real services (a Netflix-like or Google-like service is welcome as a fictional brand; real trademarks are not);
- user-added entries (origin `user`) are the user's own world-building choice and are not filtered.

## 3. Language policy

- generation follows the current system language (zh/en today, new languages work automatically when the system adds them); Korean stays as brand flavor in names, not as a content requirement;
- no bilingual dual storage: the generated letter is stored once and displayed as received.

## 4. Separately gated follow-ups (recorded, not implemented)

1. **System notification on arrival** — the user explicitly wants a lock-screen/banner notification with a `route: '/mail'` deep link when a generated letter arrives. This writes another owner (system notification layer) and therefore waits for the System Notification Center shell (`EVENT_APP_SHELL_PRIORITY_MATRIX.md` A2-4) so grouping, deep-link recovery, and quiet-hours semantics are designed once. Do not bolt it onto the shell privately.
2. **World-pack shipped mail histories** — packs seeding pre-existing app histories (mailbox backfill on world activation) is a larger content contract; requires the World Suite owner adapters and a pack manifest slice. First-entry generation today is prompt-grounded (world + persona), not historical backfill.
3. **S2 owner implementation** — production Store, backup section, revisioned records, and cross-owner Interfaces remain unpromoted; the preview-state composable is the intended seam.
4. **Reply/forward prefill, batch operations, attachment lightbox, Home unread badge** — small follow-ups parked in the package working plan until the user picks them up.

## 5. Files that own this surface

- `src/lib/mail-shell-data.js` — fixtures, labels, time labels;
- `src/lib/mail-shell-arrival.js` — prompt, one-call orchestration, validation, error copy;
- `src/composables/useMailShellState.js` — preview state v2 (read/star/archive/drafts/sent/received);
- `src/composables/useMailShellSenders.js` — user-managed whitelist;
- `src/views/MailView.vue` and `src/components/mail/*` — shell UI including `MailSettingsSheet.vue`;
- focused tests: `tests/mail-view.test.js`, `tests/mail-arrival.test.js`, `e2e/mail-app.spec.js`, visual-gate `mail` surface.
