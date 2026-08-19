# Map Place Detail Sheet UI Review

Updated: 2026-08-19

Status: `REVIEW_COMPLETE / UI_OPTIMIZATION_PROPOSAL / NO_IMPLEMENTATION_AUTHORIZATION`

## 1. Purpose And Scope

This document records the current information-architecture and interaction review of the ordinary Map place-detail sheet. It turns the 2026-08-19 review into a bounded UI direction and acceptance checklist without creating a second roadmap or authorizing implementation.

In scope:

- ordinary place selection from a map pin, search result, or Places row;
- the current place-focus overview and detail levels;
- remote, current-position, inside-place, active-journey, hidden-pin, and player-owned states;
- media hierarchy, accessibility, responsive behavior, and Map-owned actions;
- the smallest UI optimization slices that can be separately accepted later.

Out of scope:

- the separate Map Event Surface detail flow;
- Map Journey planning, Footprints, or the Places-and-Pins manager as independent redesigns;
- new live POI, navigation, traffic, public-transit, rating, opening-hours, phone, or website data;
- MJE-5 active exploration, event-driven discovery, generated candidate places, or a permanent Event entry;
- new persistence owners, schema changes, cross-owner commerce actions, or automatic place entry;
- expanding the approved place-media catalog as part of the sheet cleanup.

The governing product boundary remains [Map Calendar Reminders Product Boundary](../pm/map-calendar-reminders/PRODUCT_BOUNDARY.md). Map owns place identity, position, visibility, local distance/ETA context, place sessions, journey lineage, and place-media projection. It does not own third-party POI truth, live navigation, commerce records, Event Runtime eligibility, or Gallery asset bytes.

## 2. Evidence Reviewed

Repository evidence:

- [`MapPlaceFocusSheet.vue`](../../src/components/map/MapPlaceFocusSheet.vue) for the two-level sheet, media, actions, and dialog behavior;
- [`MapView.vue`](../../src/views/MapView.vue) for selected-place state, distance, visibility, journey locking, sharing, and current-position behavior;
- [`map-place-media.js`](../../src/lib/map-place-media.js) for exact/area/generated/category media truth;
- [`map-place-focus-sheet.test.js`](../../tests/map-place-focus-sheet.test.js) and [`map-view-information-architecture.test.js`](../../tests/map-view-information-architecture.test.js) for existing behavioral contracts;
- the Map package README, handoff, product boundary, and implementation workstreams.

Runtime evidence:

- inspected the current Map route in a desktop viewport and a `393 x 852` mobile viewport;
- opened an exact-photo world place and a player-owned category-fallback place;
- checked overview-to-detail transition, primary and secondary actions, scroll behavior, and dialog focus;
- confirmed that a hidden place can remain searchable and temporarily project its pin while selected;
- ran the two focused Vitest files: `2` files and `40` tests passed. JSDOM emitted the known non-failing `HTMLCanvasElement.getContext` warnings while MapLibre attempted initialization.

This review does not claim physical-device evidence.

## 3. Current Information Depth

The current container choice is fundamentally correct: place focus needs to preserve the map context, so one bottom sheet/dialog with progressive disclosure is appropriate. The problem is the content assigned to each level, not the absence of more containers.

| Depth | Current surface | User question | Current assessment |
| --- | --- | --- | --- |
| L0 Overview | Map, search, pins, Places list | What is around me? | Appropriate and outside this sheet review |
| L1 Focus overview | Place-focus sheet | What is this place and what can I do now? | Mostly appropriate |
| L1 Focus detail | In-sheet replacement view | What else should I know about this place? | Incomplete and misclassified |
| L2 Manage | Map Journey drawer or Map Settings Places-and-Pins page | Let me plan or manage | Ownership is appropriate |
| L3 Execute | Chat send flow or eligible Event Surface | Perform a multi-step action | Correctly remains outside ordinary place detail |

The sheet should remain one L1 surface with two internal levels. Adding tabs would increase navigation cost without creating missing information.

## 4. Current State Matrix

| Selected-place state | Context shown now | Primary action now | Assessment |
| --- | --- | --- | --- |
| Idle remote place with distance | Distance from current position | `Go / 前往` | Appropriate |
| Idle remote place without comparable coordinates | `Available place / 可用地点` | `Go / 前往` | Too vague |
| Exact stable current place | Current position | `Enter / 进入` | Appropriate |
| Inside selected place | Inside this place | `Leave / 离开` | Appropriate |
| Eligible inside-place event | Inside state plus invitation | Explicit expand command | Appropriate and correctly conditional |
| Active journey destination | Heading here | View current journey | Appropriate |
| Other place during locked journey | Active journey, browsing place | View current journey | Appropriate; relocation controls are correctly hidden |
| Player-owned place | Same state model plus Manage | Contextual primary action | Manage ownership is correct; destructive placement is not |
| Hidden but searchable place | Same as a visible place | Same contextual action | Missing visibility explanation and recovery action |

The state-aware primary action is the strongest part of the current design and should remain unchanged unless a later product decision changes journey or place-session semantics.

## 5. Findings

### P0: The Detail Level Does Not Provide Deeper Place Information

`selectedPlaceSummary` falls back to the localized detail/address when a place has no authored summary or description. The detail level then displays the same address again. For most catalog and player places, `Details / 详情` therefore reveals no new place meaning.

The remaining detail content is:

- a global place-name display preference;
- `Use as trip start / 设为行程起点`;
- `Relocate now / 立即修改位置`;
- player-place deletion.

These are global presentation, journey preparation, sandbox relocation, and management actions. They are not mutually exhaustive categories of place information, and labeling their container `Details` creates a false promise.

Impact:

- users cannot answer what the place is beyond its name, category, and address;
- overview and detail duplicate the same text;
- advanced or consequential actions receive more depth than place meaning;
- the language preference appears local even though it changes every authored pin, search result, Places row, and detail name/address.

### P0: Modal Focus And Keyboard Dismissal Are Incomplete

The sheet declares `role="dialog"`, `aria-modal="true"`, `tabindex="-1"`, and a local Escape handler, but opening it does not move focus into the dialog or trap focus. Runtime inspection confirmed that focus stayed on the background Places-row button and pressing Escape there did not close the sheet.

Required behavior:

- move focus to the dialog or its first meaningful control on open;
- keep keyboard focus within the modal surface while it is open;
- close on Escape regardless of which sheet control currently owns focus;
- restore focus to the originating pin, search result, or Places row after close;
- prevent background controls from remaining keyboard-operable under `aria-modal`.

### P1: Category Fallback Media Has Disproportionate Visual Weight

The current media resolver always returns one `hero` presentation, including grade-D category fallbacks. The sheet renders that media block before both overview and detail content. Seoul V1 currently has `106` read-only places but only `7` reviewed real-photo derivatives; the remaining built-in places and player places resolve a category fallback unless a later reviewed asset exists.

Consequences:

- a generic icon placeholder receives the same `16:9` area as verified place photography;
- the fallback repeats information already carried by the category icon and label;
- desktop users may need to scroll before reaching `Details` and `Share`;
- the detail level repeats the same large media before showing its limited content;
- overview-to-detail transitions can preserve an unhelpful prior scroll position, obscuring the changed header and back control.

Recommended media hierarchy:

- exact-photo, area-atmosphere, and later approved generated-reconstruction media may retain a strong overview hero;
- category fallback should collapse to a compact category treatment or rely on the existing header icon;
- the detail level should not repeat the large overview hero;
- full source, license, and change disclosure should remain reachable in the detail level, while the overview retains a concise truth-grade label and required attribution treatment;
- every image error must continue to fail closed to the explicit category fallback without affecting place truth.

### P1: Hidden-Pin State Is Missing From Place Focus

Visibility is an existing Map-owned presentation preference. A hidden place remains searchable and usable, and selection may temporarily reveal its marker for the active detail context. The sheet receives no visibility state and offers no explanation or toggle.

This can look like a disappearing marker: the place is visible while selected, then vanishes after close. The overview should identify `Pin hidden / 图钉已隐藏` and offer a small reversible `Show on map / 在地图显示` action. It must not describe marker visibility as discovery or place knowledge.

### P1: Place-Specific Footprint Context Is Missing

Map already owns completed journey history, destination-place lineage, place knowledge/discovery evidence, current-position provenance, and explicit inside sessions. The ordinary place sheet does not summarize any of that place-specific context.

A bounded detail projection can answer:

- whether the place is currently discovered in a Footprints-gated world;
- whether the role is currently here or inside;
- the most recent completed arrival, when stable destination lineage exists;
- the count of completed journeys to this stable place;
- whether the current position came from manual relocation or validated journey arrival, when that distinction affects available actions.

This must remain a read-only projection over Map-owned truth. It must not create a second history or imply active exploration.

### P1: Coordinate-Unavailable Context Has No Recovery Explanation

When current and selected positions cannot be compared, the sheet falls back to `Available place / 可用地点`. That phrase does not distinguish:

- current role position has no canonical coordinate;
- current and selected places belong to different map packs;
- selected place is unpositioned or stale;
- distance is intentionally unavailable while other place actions remain valid.

The state strip should name the real bounded condition and, when permitted, link to the existing role-position or place-management path. It must not imply device GPS or geocoding.

### P2: Player Management Is Split Across Two Depths

Player-owned overview exposes `Manage`, correctly handing off to the Settings-owned Places-and-Pins page, while the in-sheet detail also exposes direct deletion. This divides one management family across L1 and L2 and places a destructive action inside an ordinary information view.

Recommended direction: keep `Manage` as the single L2 entry and keep edit/delete/coordinate administration in Map Settings. If direct delete is retained later, it needs a separately justified danger-management pattern and should not compete with ordinary place details.

## 6. Target Sheet Structure

### 6.1 Focus Overview

First viewport promise: identify the place, explain its relation to the current Map state, and expose exactly one primary next action.

Recommended order:

1. source, category, primary name, and optional secondary name;
2. meaningful media only: strong hero for reviewed exact/area/generated media, compact treatment for category fallback;
3. one authored place summary when available, otherwise one non-duplicated address line;
4. one state strip: distance, current, inside, heading here, journey locked, pin hidden, or explicit coordinate-unavailable reason;
5. eligible event invitation only while inside and eligible;
6. one state-derived primary action: Go, View Journey, Enter, Leave, or none;
7. compact secondary actions: Details, Share, and player-owned Manage; hidden-pin recovery may appear as a small reversible tool.

The primary action should remain visible in the initial mobile and desktop composition. It may use a sticky action area inside the sheet if real content would otherwise push it below the viewport.

### 6.2 Focus Detail

The detail level should replace the overview body and answer deeper place questions without becoming a second management page.

Recommended sections:

| Section | Content | Source |
| --- | --- | --- |
| About | Authored summary/description and category semantics | Map pack or player-place display metadata |
| Location | Primary/secondary address, coordinate readiness, map-pack context | Map |
| Map state | Visible/hidden pin, known/discovered state, current/inside state | Map |
| Footprints | Last stable arrival and completed journey count when derivable | Map journey history |
| Media info | Truth grade, note, source, creator, license, disclosed changes | Map place-media projection |
| Advanced actions | Use as trip start and explicit sandbox relocation | Existing Map actions |
| Manage | One player-owned handoff to Places and Pins | Map Settings |

The global place-name display preference should move to Map Settings or a clearly global Map overflow. It should not be presented as a property of the selected place.

## 7. Recommended Optimization Slices

These are proposal slices, not roadmap entries. Each requires a separate implementation decision before work starts.

### Slice A: Interaction And Accessibility Foundation

Goal: make the current two-level sheet reliable without changing domain behavior.

Changes:

- focus entry, focus containment, Escape dismissal, and focus restoration;
- reset sheet scroll position when switching overview/detail or selecting another place;
- preserve background-click dismissal only on the real backdrop;
- add unit and E2E coverage for keyboard behavior and scroll reset;
- keep all current primary-action decisions unchanged.

Risk: low product risk, medium interaction risk because the sheet is shared by all ordinary places.

### Slice B: Media And First-Viewport Hierarchy

Goal: give visual weight only to media that helps identify the place.

Changes:

- retain strong overview media for exact/area/generated kinds;
- compact or remove the large category-fallback frame;
- remove repeated hero media from the detail level;
- keep truth-grade labeling and required attribution reachable;
- ensure the primary action remains visible on desktop and phone-sized screens.

Risk: medium visual/product risk because the current place-media pilot approved a fixed hero slot and its visible disclosure requirements must remain satisfied.

### Slice C: Real Place Detail And Existing-State Projection

Goal: make `Details` provide new information using existing Map truth.

Changes:

- add visibility, coordinate-readiness, current/inside, and discovery state;
- derive last stable arrival and completed journey count by `placeId` where lineage exists;
- expose pin visibility recovery without changing place knowledge;
- move global language preference out of the place detail level;
- consolidate player-place management under the existing Settings handoff.

Risk: medium. No new store is required for the first projection, but legacy journeys without stable destination lineage must fail closed rather than be matched by ambiguous address text.

### Slice D: Authored Place Summaries

Goal: give catalog places concise identity beyond category and address.

Changes:

- define bounded bilingual summary fields or a separate reviewed place-copy projection;
- author content by stable `mapPackId + placeId`;
- keep summaries factual, local/versioned, and independent from live POI claims;
- ensure search metadata and display copy do not accidentally become provider truth or event eligibility.

Risk: separate content-governance and catalog-review slice. It should not be bundled into the interaction cleanup.

Recommended order: `A -> B -> C`, with `D` independently reviewed and able to proceed later. Slice A is the smallest safe implementation candidate.

## 8. Acceptance Matrix For A Future Implementation

### Functional States

- remote positioned place with valid distance;
- remote place when distance cannot be computed;
- exact current stable place before Enter;
- inside place with and without an eligible event invitation;
- active journey destination;
- unrelated place during a locked journey;
- visible and hidden world place;
- visible and hidden player-owned place;
- exact photo, area atmosphere, category fallback, and media-load failure;
- system, Chinese, English, and bilingual place-name presentation;
- legacy journey/history records without stable place lineage.

### Interaction And Accessibility

- opening the sheet moves focus into it;
- Tab and Shift+Tab do not escape into the map while the sheet is modal;
- Escape closes from overview and detail;
- close, backdrop dismissal, and primary actions restore or intentionally transfer focus;
- switching levels resets scroll and keeps the header/back control visible;
- background pins, search, and Places controls are not keyboard-operable while the dialog is open;
- icon-only controls retain accessible names and stable hit areas;
- destructive actions do not appear in the ordinary scan path;
- browsing during a locked journey cannot change destination, origin, or current position.

### Responsive And Visual

- verify at minimum desktop `1024 x 768` and mobile `393 x 852` compositions;
- name, state, and primary action are visible in the initial viewport for normal content;
- long bilingual names, addresses, media attribution, and event copy wrap without horizontal overflow;
- category fallback does not dominate the sheet;
- detail content is not hidden behind a preserved overview scroll position;
- exact/area media keeps a stable crop and explicit truth label;
- failed media falls back without stale attribution;
- the map remains visually available as context behind the sheet without competing for focus.

### Data And Ownership

- selecting or closing a place does not mutate current position, journey, visibility, discovery, or history;
- a visibility toggle changes marker presentation only;
- place knowledge and discovery remain separate from marker visibility;
- visit summaries use stable journey/place lineage and do not guess from free-form text;
- global place-name preference remains Map-owned and does not mutate canonical records;
- no live provider or cross-owner business data enters the sheet.

## 9. Likely Implementation Surface

A future accepted UI slice would primarily touch:

- `src/components/map/MapPlaceFocusSheet.vue`;
- `src/views/MapView.vue`;
- `tests/map-place-focus-sheet.test.js`;
- `tests/map-view-information-architecture.test.js`;
- targeted Map Playwright coverage when user-visible behavior changes.

Potential content work may additionally touch a reviewed Map-owned place-copy registry or versioned map-pack data, but that should remain separate from the first interaction/accessibility slice.

## 10. Decision Summary

Keep the current one-sheet, two-level model. Preserve the state-aware primary actions, conditional Event invitation, Chat share handoff, and Settings-owned player-place management. Improve the sheet by making category fallback media compact, turning the detail level into genuine place information, exposing existing visibility and Footprints context, naming coordinate-unavailable states, and completing modal accessibility.

Do not solve the problem by adding more tabs, importing live POI data, duplicating Journey or Settings controls, or broadening Event/Exploration scope.
