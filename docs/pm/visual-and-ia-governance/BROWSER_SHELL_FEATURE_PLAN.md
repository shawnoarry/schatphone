# Prism Browser S1 Feature Plan / 折光浏览器 S1 功能梳理

Updated: 2026-08-23

Status: `SHP-BROWSER-S1 IMPLEMENTED / SHARED ENTRY INTEGRATED / UI_STRUCTURE_REVIEWED 2026-08-23 / S2 NOT AUTHORIZED`

This is the focused product file for the Browser / Search / Help preview shell promoted under roadmap 4.16. It records the implemented S1 surface, fixture and privacy boundaries, verification evidence, and later owner seams. It does not create another backlog; `docs/roadmap/TODO_ROADMAP.md` remains the live priority board.

## 1. Product identity and entry contract

- user-visible name: `折光浏览器 / Prism Browser`;
- app id: `app_browser`;
- route: `/browser`;
- accepted app-entry logo: `prism-browser-app-icon-v1.png`, using the user-selected refracted `A` monogram candidate; `fas fa-compass` remains the accessible and customization fallback glyph;
- primary color: deep-sea teal `#1F6F78`, with a dedicated night accent `#70D3C2`;
- visual thesis: `纸面索引 / quiet field guide` — an installed utility that feels like a considered search notebook rather than a generic dashboard or an imitation of a real browser brand.

Shared route, Home, App Store, icon registry, return-source registry, and persistence inventory integration are complete. Browser keeps its preview-only ownership boundary and does not gain a production Store or backup section from that wiring.

## 2. What S1 implements

### 2.1 Ordinary zero-provider loop

- a source-first home page with one primary search field and three visible spaces: `使用帮助 / Help`, `当前世界 / Current World`, and `互联网 / Web`;
- deterministic local search over published Help fixtures and allowlisted public World fixtures;
- a mixed result list with persistent source labels, source filters, result counts, compact snippets, updated dates or fictional domains, and explicit unavailable records;
- full Help article detail with headings, readable long-form body, update date, source note, optional owner-App action, bookmark action, and reliable return to the result context;
- full public World page detail with fictional-world address identity, owner projection note, public facts, body, and optional owner-App action;
- device-local search history, a history-recording toggle, per-item deletion, clear-all, bookmarks, bookmark removal, and recent visits;
- complete empty search, empty history, empty bookmarks, deterministic loading feedback, source unavailable, and stale owner-record states;
- ordinary browsing and every local action make zero AI/provider calls and create no Event Runtime facts.

### 2.2 Help content included in the first fixture publication

The bundled Help layer contains user-facing articles rather than raw `docs/**` content:

1. Calendar, Agenda, and Journey responsibilities;
2. current position, entering/leaving a place, and journey arrival;
3. changing a Food Delivery address at different order stages;
4. why Wallet ledger entries are corrected through a reversal/refund rather than deletion;
5. how to distinguish Help, Current World, and Web sources.

Every article names only behavior that exists or an explicit product boundary. No internal route names, architecture objects, task markers, implementation notes, or unfinished instructions are rendered as help content.

### 2.3 Public World fixtures

The S1 repository contains stable, read-only public projections for:

- Hanul Broadcast Center;
- Seongsu Creative Lane;
- Mirae Night Clinic;
- Former Practice Annex as a deliberately stale record used to prove fail-closed behavior.

These fixtures model the future `WorldBook + Map` projection contract. They retain `worldId`, world revision, owner module, owner stable record id, owner revision, availability, update date, and a fictional `.world` domain. Browser does not mutate them and does not become their canonical owner.

## 3. Source and privacy boundary

### Help

- source label stays visible in list and detail;
- opening, searching, bookmarking, or deleting a bookmark does not change the related App;
- owner actions are navigation only and carry Browser return context.

### Current World

- only explicitly public fixture projections are indexed;
- fictional pages retain the active-world label and a fictional domain, so they cannot be mistaken for real websites;
- stale or withdrawn projections display an unavailable page and no cached canonical body or owner action;
- a later S2 adapter must revalidate world, revision, visibility, tombstone, and owner availability when opening.

### Web

- no real Search Provider is configured in S1;
- the Web source has an honest unavailable state and preserves all successful local results;
- no fabricated real-site result, fake URL, embedded webpage, API key, hidden external query, or external-search success state exists;
- external search handoff and provider-neutral adapters remain separate future decisions.

### Explicitly excluded from public search

Mail bodies and drafts, Chat conversations and memory, Phone calls and summaries, Healthcare reports and appointments, Shopping/Food Delivery orders and addresses, Wallet balances and transactions, private Calendar/Agenda/Journey records, current position and journey history, private Contacts notes, and Event Runtime or World Hub internal records have no indexing path in this shell.

## 4. Local state and deletion semantics

S1 stores its preview state under:

```text
schatphone:browser-shell:s1-state
```

State version 1 contains only:

- `historyEnabled`;
- bounded search history with query and timestamp;
- bookmarked stable result ids;
- recently visited stable result ids.

History and bookmarks are private device state and are never added to the World index or sent to a Web Provider. Removing history does not delete Help/World content. Removing a bookmark does not delete its target. Production Store ownership, backup/restore, sync, incognito mode, tabs, downloads, and cache policy are S2 decisions and are not implied by this local preview key.

## 5. Navigation and return context

The Browser shell accepts these route-query recovery fields:

```text
q
scope: all | help | world | web
result
homePage
```

An owner-App action emits:

```text
source=browser
browserQuery
browserResult
browserScope
homePage?
```

The serial shared-navigation integration should register `browser -> /browser` and preserve those fields. Until that shared registry is integrated, normal browser history still returns to the intact in-memory detail/search context, but cross-App return cannot be claimed as complete solely from the shell files.

## 6. Visual and accessibility contract

- installed-app visual ownership remains with Prism Browser even when it displays Map/WorldBook projections;
- the home uses an editorial masthead and source ledger; result pages use a compact sticky search workspace; detail pages become a calm reading surface rather than extending the home vertically;
- Help uses amber provenance accents, Current World uses teal, and Web uses slate; icon, label, and copy accompany color in every state;
- `default` and `zen` have separate surfaces, text, border, focus, warning, action, and hero tokens rather than a simple brightness filter;
- utility actions keep accessible names and at least 40–44 px targets; History and Bookmarks also expose visible desktop labels while remaining compact icons on phone widths;
- focus-visible states, reduced-motion behavior, long title/body/domain wrapping, desktop composition, simulated Pixel 5 composition, and horizontal-overflow checks are included;
- the S1 experience uses no required image asset: direct subject imagery is not central to this utility role, and the deliberate no-image treatment avoids inventing photos for public records that are not canonical media owners.

## 7. Focused verification

Implemented focused coverage:

- `tests/browser-view.test.js`: deterministic Help/World search, source identity, full help detail, owner navigation context, stale fail-closed, Web isolation, empty recovery, history/bookmark persistence and deletion, English, `zen`, and unsupported-source normalization;
- `e2e/browser-app.spec.js`: 3 journeys across desktop Chromium and simulated Pixel 5 (6 cases total), including Help and World reading, zero-provider presentation, Web unavailable recovery, reload persistence, Chinese night mode, stale fail-closed, critical WCAG checks, night color contrast, page errors, and zero horizontal overflow;
- scoped ESLint and production build include all Browser shell files;
- the 2026-08-23 lightweight structure review kept the source-first home/result/detail hierarchy and promoted History/Bookmarks from icon-only desktop controls to visible utility destinations.

This is simulated-browser evidence only. It does not claim true-device touch, mobile browser chrome, safe-area feel, external Provider behavior, or real network privacy evidence.

## 8. S2 and S3 seams, not implemented

### S2 owner-ready Browser / Help

- choose the formal owning package, Store, schema, migration, backup, restore, and bounded cache policy;
- publish a versioned Help content schema and release process independent of developer documents;
- replace World fixtures with owner-submitted public projections plus revision/tombstone/off-world validation;
- register the local preview key in the persistence inventory or migrate it to the accepted owner state;
- add provider-neutral Web gateway, credentials, quota, safe search, timeout, cache, privacy disclosure, external-page handoff, and failure isolation only after the separate network slice is accepted;
- separately decide tabs, incognito, downloads, external-browser behavior, and device-private search.

### S3 world and event integration

- index only owner-confirmed public publications from Community/Media or institution owners;
- allow notifications, Mail, or owner pages to deep-link into a stable Browser result/page;
- keep search, open, read, history, and bookmark actions from becoming event completion or world truth;
- Event Runtime must not ask Browser to invent a page or treat search text as user intent beyond the submitted query fact.

## 9. Files that own this S1 surface

- `src/lib/browser-shell-data.js` — source metadata, Help/World fixtures, deterministic ranking, state normalization and persistence;
- `src/views/BrowserView.vue` — route-level shell, navigation context, source workspace, history/bookmark/recent state actions;
- `src/components/browser/BrowserSearchBar.vue` — primary search control;
- `src/components/browser/BrowserResultList.vue` — source-labelled result projection;
- `src/components/browser/BrowserDetail.vue` — Help/World detail and stale fail-closed;
- `src/components/browser/BrowserEmptyState.vue` — honest empty and recovery states;
- `tests/browser-view.test.js` and `e2e/browser-app.spec.js` — focused behavior, accessibility, theme, responsive, and overflow evidence.
