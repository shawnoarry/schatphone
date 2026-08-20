# Map Place Interaction Card UI Review

Updated: 2026-08-20

Status: `INTERACTION_CARD_REVISION_IMPLEMENTED_LOCAL / AUTHORED_PLACE_COPY_INTEGRATED / NO_ROADMAP_STAGE_CHANGE`

## 1. Product Correction

The ordinary pin surface is a user-to-place interaction entry, not a readout of every Map-owned record. The prior local implementation incorrectly treated data ownership as information architecture and exposed Map state, Footprints counts, media authenticity grades, global place-name settings, and sandbox placement controls inside place detail.

Those facts may be valid Map data, but they do not answer the selected-place questions:

1. What is this place?
2. How does it relate to where I am now?
3. What can I do here?

The governing direction already existed in `MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`: selecting a pin opens concise place focus with name, category, short summary, distance or presence, and context-valid actions. Map Settings owns management. The current UI refines the older conditional-visibility rule: the `Enter` slot is always reserved so the action layout remains stable, while eligibility still comes only from Map-owned place-session validation.

## 2. Information Depth

| Depth | User intent | Surface | Content |
| --- | --- | --- | --- |
| L0 | Browse the city | Map | Geography, pins, search, compact Map controls |
| L1 overview | Recognize and act on one place | Pin-anchored floating place card | Name, category, visibly labeled place-specific introduction, stable image slot, distance/presence, journey action, detail entry, and one reserved place-entry slot |
| L1 detail | Learn enough to continue interacting | Replacement card detail | Place introduction, copyable address, reviewed image, compact Share/Manage tools, expandable image provenance, eligible interaction invitation |
| L2 | Configure or administer Map | Map Settings, Places, Footprints | Place-name language, pin management, knowledge policy, full Footprints/history, coordinate editing, destructive actions |
| L3 | Execute a focused flow | Map Journey or Event Surface | Transport planning, active journey control, eligible place-entry interaction |

The place card must not expose Map state diagnostics, journey-history counts, global language preferences, developer-facing media grades, or immediate relocation shortcuts simply because Map owns those records.

## 3. Journey And Entry Actions

The overview keeps two separate action families. They do not replace or duplicate each other:

| Place relation | Journey slot | Entry slot | Meaning |
| --- | --- | --- | --- |
| Remote, idle | `Go / 前往` | dim `Enter / 进入` | Plan a journey; clicking the dim entry control reports `当前不在设施附近` without creating a session |
| Active journey, not arrived | `View journey / 查看行程` | dim `Enter / 进入` | Return to the locked journey; remote entry remains unavailable |
| Exact stable current place | none | active `Enter / 进入` | Create or resume the explicit place session |
| Inside place | none | active `Leave / 离开` | End the explicit place session without changing the canonical position |
| No comparable position | `Go / 前往` when planning is valid | dim `Enter / 进入` | Preserve the entry location while failing closed on proximity |

The dim entry state remains a real focusable button rather than a disabled control because its click feedback explains why entry is unavailable. The visual slot and label remain stable across remote and onsite states; only emphasis, feedback, and emitted action change.

An Event entry is conditional. It appears only after an eligible place-entry projection exists; the card never reserves an empty permanent Event button.

## 4. Container And Visual Direction

The selected-place surface is non-modal and map-native:

- no full-screen backdrop, dimming, or background blur layer;
- no forced focus entry or focus trap, so Map context remains operable;
- Escape and the close control dismiss the card;
- phone and wide views anchor a bounded card near the selected pin, flipping above or below when viewport space requires it;
- the overview is intentionally short, with a 40px contextual primary control rather than a full-width banner button;
- every overview uses the same stable image slot; exact/area/generated records show their reviewed derivative, while category fallback uses an explicitly labeled non-evidentiary category visual;
- detail may expand reviewed photography and keeps required source/license attribution in a compact, user-opened `Image information` disclosure subordinate to place content.

The visual treatment remains restrained because Map is a frequent-use spatial tool. It does not adopt landing-page composition, experimental typography, or theatrical motion.

## 5. Place Introduction Fallback

Authored `summaryZh/summaryEn` or `descriptionZh/descriptionEn` remains the first choice. `src/lib/map-place-copy.js` then provides Map-owned bilingual introductions for all 106 Seoul places and all seven built-in fictional places without modifying canonical coordinates, addresses, or search records.

An unknown or player-created place receives a bounded name/address/category-aware introduction. That fallback describes only the saved record and available interactions; it does not fabricate live POI facts, ratings, opening hours, services, or historical claims.

## 6. Settings Ownership

The global `system / Chinese / English / bilingual` place-name preference now lives on the Map Settings page. It continues to update authored pin labels, search, Places rows, and place cards without mutating canonical records.

Player-place creation, editing, deletion, coordinate selection, and bulk visibility remain Settings-owned. A selected hidden pin may retain one direct `Show pin` recovery action because it resolves an immediate presentation problem for the selected place.

## 7. Acceptance

- selecting a pin leaves the map visible and usable around the card;
- the overview always contains a meaningful introduction;
- all 106 Seoul places and seven built-in fictional places resolve distinct bilingual authored introductions rather than category copy;
- reviewed media never hides the summary or primary action below the initial phone viewport;
- category fallback does not resemble place photography or dominate the card;
- `Go` and `View journey` remain state-derived journey actions;
- the entry slot remains present in every overview, dim and explanatory when remote, active as `Enter` onsite, and active as `Leave` inside;
- the detail level does not repeat journey or entry actions, and Share appears only as a compact detail-header tool;
- eligible interaction invitations remain explicit and conditional;
- detail contains no Map state, Footprints, global place-name control, immediate relocation, trip-start override, or destructive action;
- the displayed address has a keyboard-accessible copy action with success/failure feedback;
- photo source and license remain reachable through the collapsed-by-default image-information disclosure;
- long bilingual names and addresses do not create horizontal overflow;
- Escape closes the card, and switching overview/detail resets its scroll position;
- no new place, journey, event, persistence, media, or provider truth is introduced.

## 8. Implementation Surface

- `src/components/map/MapPlaceFocusSheet.vue`
- `src/views/MapView.vue`
- `src/lib/map-place-copy.js`
- `src/views/MapSettingsView.vue`
- `tests/map-place-copy.test.js`
- `tests/map-place-focus-sheet.test.js`
- `tests/map-view-information-architecture.test.js`
- `tests/map-settings-view.test.js`
- focused Map Playwright coverage

This revision changes no roadmap stage. Broader authored summaries and place-media expansion remain separate content-governance work.
