# Map Place Interaction Card UI Review

Updated: 2026-08-21

Status: `CONFIRMED_ACTION_AND_TYPE_SLICE_IMPLEMENTED / DETAIL_CONTENT_MODEL_OPEN / MEDIA_AND_RESEARCH_ITEMS_OPEN / NO_ROADMAP_STAGE_CHANGE`

## 1. Review Scope And Baseline

This review treats commit `b039881` and the current Map implementation as the baseline. It does not restore the former modal sheet, repopulate place detail with Map diagnostics, or treat an unfinished media adaptation as a final product state.

Evidence reviewed:

- `src/components/map/MapPlaceFocusSheet.vue` and the current desktop/mobile screenshots;
- selected-place state and action derivation in `src/views/MapView.vue`;
- the current one-level introduction registry in `src/lib/map-place-copy.js`;
- current Map storage and player-place projection in `src/stores/map.js`;
- the Map package boundary and focused place-card tests;
- user product feedback on 2026-08-21.

The following baseline decisions remain valid:

- one non-modal, pin-anchored Map card with overview and detail replacement levels;
- the surrounding map remains visible and operable;
- overview answers what the place is, how it relates to the current position, and what can happen next;
- global language, Footprints/history, coordinate editing, relocation, and destructive management remain outside ordinary place detail;
- Event entry remains conditional on an eligible place session;
- the three action positions remain stable across place states.

This document separates the implemented first UI slice from product-decision gates and open research. The 2026-08-21 implementation covers only the confirmed action-row and readability work; it does not authorize the remaining items.

## 2. Intended Information Depth

The overview and detail may both contain an image without being duplicates when the image has a different job at each depth.

| Depth | User question | Intended content | Image role |
| --- | --- | --- | --- |
| L0 Map | What is around me? | Geography, pins, search, Map tools | Map context |
| L1 overview | What is this place, and what can I do now? | Category, small image, one-sentence introduction, current relationship, three action positions | Fast recognition thumbnail |
| L1 detail | What should I know or remember about this place? | Large image, detailed address, longer place description, user-authored note, compact Share/Manage and media information | Place inspection and atmosphere |
| L2 Manage | Let me administer Map data | Places and Pins, visibility, coordinate editing, destructive actions, global preferences | Management support only |
| L3 Execute | Let me travel or interact | Journey and eligible Event Surface | Flow-owned presentation |

The previous recommendation to remove or subordinate the detail image is withdrawn. Repetition is only a problem when overview and detail use the same crop, scale, copy, and purpose. A thumbnail-to-large-image progression is coherent.

## 3. Current Model Gaps

The intended overview/detail distinction is not fully represented by current data:

- `map-place-copy.js` resolves only one bilingual `summary` value;
- `summaryZh/summaryEn` and `descriptionZh/descriptionEn` currently collapse into that same value;
- the card uses the same resolved summary in overview and detail;
- `detail/detailZh/detailEn` is currently address or position-description truth;
- player-created places reuse `detail` as their address/location description;
- there is no persisted user-note overlay for arbitrary built-in and player-created places.

Therefore the intended detail cannot be completed safely through CSS or content ordering alone. It requires a separately accepted content and persistence contract.

## 4. Reviewed Optimization Items

### 4.1 Media Presentation: Open Until Adaptation Is Complete

The earlier review classified the current category fallback as a high-priority design defect and recommended compacting it. That conclusion was premature because the place-photo and fallback adaptation is not complete.

Current screenshots may still identify concrete crop or loading failures, but they are not sufficient evidence for the final media hierarchy. No fixed recommendation is made yet about:

- final overview thumbnail height;
- fallback illustration size;
- category-specific versus map-pack fallback treatment;
- object fit and crop rules;
- exact, area, generated, and fallback label placement.

Required next evidence: complete the intended media variants, then compare representative exact-photo, area-photo, generated, fallback, failed-load, fictional, and player-place states on desktop and mobile before choosing a shared presentation rule.

The media registry, fail-closed fallback, source/license truth, and non-photographic disclosure remain product constraints regardless of the final visual treatment.

### 4.2 Overview And Detail Roles: Product Direction Confirmed

The intended structure is:

Overview:

1. category and place identity;
2. a small, recognition-oriented image;
3. one-sentence place introduction;
4. current distance/presence/journey relationship;
5. the stable three-position action row;
6. conditional place-session invitation when eligible.

Detail:

1. category, place identity, Back, Share, optional Manage, and Close;
2. a larger image intended for inspection and atmosphere;
3. detailed address with copy action;
4. a longer place description that adds information beyond the overview sentence;
5. one user-editable private note area;
6. image source/license information in a subordinate disclosure.

The unresolved part is not the information architecture. It is the content contract for long description and private note.

### 4.3 Three-Position Action Row: Implemented

The action row remains:

| Place state | Journey position | Detail position | Entry position |
| --- | --- | --- | --- |
| Remote and idle | active `Go / 前往` | `Place details / 地点详情` | subdued `Enter / 进入`; click explains not nearby |
| Active journey | active `View journey / 查看行程` | `Place details / 地点详情` | subdued `Enter / 进入`; click explains not nearby |
| Exact current place | subdued `Go / 前往`; click reports `目前正在此处` | `Place details / 地点详情` | active `Enter / 进入` |
| Inside place | subdued `Go / 前往`; click reports `目前正在此处` | `Place details / 地点详情` | active `Leave / 离开` |

The subdued controls are explanatory states. Their activation may announce why the domain action cannot execute, but it must not create a journey, change position, enter, or leave.

The first-position whitespace is not considered a defect. `Place details` does not expand across it. The journey position now remains visible with the explanatory current-place `Go` state.

Implementation notes:

- `MapView` derives a distinct `current` primary-action state instead of removing the first action;
- the current-place control remains focusable and visually subdued rather than using the native disabled state;
- activation announces `目前正在此处 / You are currently here` through a transient status message;
- the `current` path does not emit `go`, create a Journey, expose a route card, or change position;
- remote `Go`, active `View journey`, exact-current `Enter`, and inside `Leave` retain their existing owner actions.

### 4.4 Event Invitation Layout: Research Required

The earlier review recommended a sticky action shelf because screenshots suggested that an eligible invitation could push other controls below the initial card viewport. That is only one possible interpretation and has not been sufficiently studied.

Before choosing a fix, inspect:

- whether `Place details` and `Leave` remain discoverable through normal card scrolling;
- whether the scroll boundary has enough visual affordance;
- whether the invitation should appear before or after the standard action row;
- whether compacting the invitation is sufficient;
- whether a sticky action shelf would cover content, compete with the pin anchor, or make the floating card feel modal.

The current requirement is narrower: an eligible invitation must not make `Leave` or `Place details` unreachable. No sticky, reorder, or compaction solution is approved yet.

### 4.5 Typography And Touch Targets: Implemented

The previous component used `8-11px` text for several metadata, summary, provenance, and action styles. Compact-phone rules reduced primary controls to `34px` height. This was too small for repeated reading and touch use.

Recommended floors:

- at least `12px` for secondary metadata;
- at least `14px` for body and action text;
- at least `44px` high for mobile interactive targets;
- at least `40px` high for compact desktop interactive targets;
- no viewport-scaled font sizes.

The implemented floors are:

- `12px` for secondary metadata and status copy;
- `14px` for body and action text;
- `44px` for mobile interactive targets;
- `40px` for compact desktop interactive targets;
- fixed font sizes without viewport scaling.

On short mobile viewports, the overview introduction is a one-line preview and non-media vertical spacing is compressed so the three action positions remain initially reachable. The detail retains the full current summary. This slice does not change media height, aspect ratio, crop, fallback selection, or truth-label semantics.

### 4.6 Non-Modal Keyboard Path: Research Candidate

The current non-modal role and absence of a focus trap are appropriate. The possible gap is the path from a keyboard-activated marker, search result, or Places row into a card that is appended after the main Map content.

The proposed behavior is plausible but not yet approved:

- keyboard activation may move focus to the card heading or first control;
- pointer activation may preserve map focus while announcing the selected-place region;
- Back may restore focus to the `Place details` trigger;
- Close may restore focus to the latest opener;
- Escape should continue to close the card without introducing a focus trap.

Required next evidence: test the complete keyboard sequence from each opener and confirm the screen-reader announcement behavior before selecting the focus policy.

### 4.7 Media Truth Labels: Merged Into Media Adaptation

The former item referred to visible badges such as `Exact-place photo / 地点实景`, `Area atmosphere / 区域氛围`, and `Category visual / 类别示意`, plus the explanatory line stating whether an image represents the exact place.

The intent was to ask which truth information belongs on the overview image and which belongs in the detail disclosure. Because the media presentation is still unfinished, this is not useful as a separate optimization item. It is now part of the media-adaptation decision in section 4.1.

No truth metadata is proposed for deletion. Only its eventual placement and visual priority remain open.

## 5. Long Description And User Note Decision Gate

The detail concept needs three distinct text meanings:

| Content | Owner and meaning | Current support |
| --- | --- | --- |
| Overview introduction | Map-authored, short place identity | Implemented as one `summary` projection |
| Detailed description | Map-pack or player-place authored, longer place information | Not independently modeled |
| User note | Private user annotation about this place | Not modeled or persisted |

`detail` must remain address/location-description truth and should not be reused as the user note.

Before implementing notes, decide:

1. whether notes apply to both built-in and player-created places;
2. whether the note is one freeform value or a dated list;
3. whether editing is inline in detail or handed off to another surface;
4. whether saving is explicit, on blur, or autosaved with visible feedback;
5. maximum length and empty-state presentation;
6. whether notes participate in Map search;
7. whether notes may be included when sharing a place to Chat;
8. whether Event Runtime or AI callers may read notes;
9. how notes survive map-pack upgrades, place deletion, backup, and import.

A conservative candidate, not an accepted contract, is one device-local Map-owned note keyed by stable `mapPackId + placeId`, editable inline in detail, excluded from search, Chat sharing, Event eligibility, and canonical place records by default.

## 6. Revised Work Classification

### Implemented In The 2026-08-21 UI Slice

- raised typography and target sizes;
- preserved the three-position action row;
- added the explanatory current-place `Go` state with no domain side effect;
- kept the bounded floating-card scroll model and left media treatment unchanged.

### Requires Product Decisions First

- split one-sentence overview copy from longer detail description;
- define the private user-note contract and editor behavior.

### Requires Focused Research First

- final media sizing, cropping, fallback, and truth-label presentation;
- Event invitation placement and action reachability;
- keyboard-initiated focus and announcement policy.

The remaining classifications are not roadmap entries or implementation authorization.

## 7. Acceptance Evidence

The implemented action and typography slice has focused evidence for:

- remote, active-journey, exact-current, and inside states;
- all three action positions remaining stable;
- current-place `Go` reporting `目前正在此处` without a Journey or position mutation;
- remote `Enter` retaining its proximity explanation without creating a session;
- desktop Chromium and simulated Pixel 5 card rendering;
- the agreed text and target-size floors, action reachability, critical Axe checks, and zero horizontal overflow.

Focused Vitest passes `2 files / 45 tests`. The place-media Playwright flow passes `2/2` across desktop Chromium and simulated Pixel 5 and records the default and current-location-feedback states. Repository-wide validation is recorded in the implementation handoff rather than inferred here.

For later detail-content work:

- overview and detail must use distinct short and long copy rather than truncating one value differently;
- the detail large image must have a deliberate crop and must not prevent the address, description, and note from being discoverable;
- user notes must remain distinguishable from canonical address and authored place description;
- note persistence, backup, deletion, sharing, search, and Event/AI visibility must follow the accepted contract.

For research items, record evidence before recommending a concrete implementation. Do not treat one intermediate screenshot as final media or interaction proof.

## 8. Likely Implementation Surface

Confirmed action and type work would primarily touch:

- `src/components/map/MapPlaceFocusSheet.vue`;
- `src/views/MapView.vue`;
- `tests/map-place-focus-sheet.test.js`;
- focused Map Playwright coverage.

An accepted long-description or note slice would additionally require a focused content/persistence design across:

- `src/lib/map-place-copy.js` or a separate long-copy registry;
- `src/stores/map.js` and its persisted schema/migration;
- player-place management only if authored description semantics change;
- backup/restore coverage and Map package documentation.

## 9. Decision Summary

Preserve the current non-modal card and three-position action model. Withdraw the premature category-fallback and detail-image-removal recommendations. The intended depth is now clear: overview uses a small image, category, and one-sentence introduction; detail uses a large image, detailed address, longer description, and a private user note. The remaining blocker is the missing long-description and note contract, not the container layout.

Typography and target sizing are confirmed improvements. Event invitation layout and non-modal keyboard behavior remain reasonable research questions rather than approved fixes. Media truth labels are no longer a separate recommendation and will be decided with the complete media adaptation.
