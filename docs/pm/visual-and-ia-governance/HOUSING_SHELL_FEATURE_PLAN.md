# Housing / Jari S1 Shell Feature Plan

Updated: 2026-08-23

Status: `S1_IMPLEMENTED / SHARED_ENTRY_INTEGRATED / UI_STRUCTURE_REVIEWED 2026-08-23`

Roadmap authority: `docs/roadmap/TODO_ROADMAP.md` section 4.16. This document records the Housing slice only; it is not a second roadmap.

## 1. Product Result

`住处 / Jari` is a fixture-backed ordinary-use Housing shell for browsing a possible next home. It supports one coherent no-event loop:

1. switch between rent and buy;
2. browse and search stable fixture listings;
3. filter by Map-owned area reference, room count, price band, and source availability;
4. save favorites and revisit recently opened listings;
5. inspect a listing's price, costs, availability, layout study, living radius, amenities, and long address;
6. filter by a residential area or use a separate area-map action to open that same Map-owned neighborhood reference without mutating Map state;
7. create, reschedule, cancel, and restore a device-local viewing draft.

The shell is not a contract, application, payment, confirmed appointment, current residence, property asset, or Event Runtime surface.

## 2. Visual Argument

Visual owner: installed Housing app.

Visual thesis: `warm property folio`.

- warm paper and deep residential green replace the portal, feed, and clinical visual systems used by other shells;
- the accepted Home/App Store identity is `jari-housing-app-icon-v1.png`, the user-selected blue-yellow C residence mark; `fas fa-house-chimney-window` remains the accessible and customization fallback glyph;
- asymmetric rounded corners and folio marks evoke a collected property booklet without copying a real housing brand;
- listing media is a deliberately abstract CSS layout study, not a photograph of the Map area and not a claim about a real interior;
- the no-image state stays explicit instead of substituting a neighborhood photograph;
- wide view uses navigation rail, listing folio, and living-note context; phone view uses one list/detail drill-down and a bottom app navigation;
- `default` and `zen` use separate surface, text, line, status, focus, and action values.

Depth map:

- L0: Discover, Saved, Recent, and Viewing Draft counts;
- L1: listing cards and viewing-draft rows;
- L2: listing detail and Map area handoff;
- L3: filter drawer and viewing-draft sheet.

## 3. Fixture Contract

Canonical fixture source: `src/lib/housing-shell-data.js`.

Each listing has a stable Housing-owned ID such as `housing_listing_jari_001`. A listing ID must never equal or substitute for a Map place ID.

Each listing references one read-only Map area object:

```js
{
  mapPackId: 'real-seoul-v1',
  placeId: 'seoul-sanggye-jugong-district'
}
```

The area records are read from the existing `SEOUL_EVERYDAY_PLACES` export, use `DEFAULT_MAP_PACK_ID`, and are limited to residential categories. The listing keeps its own title, address description, price, room count, area, floor, availability, summary, amenities, source status, and abstract media state.

Required fixture states are present:

- rent and buy;
- ordinary, premium, and deliberately long prices;
- long Chinese and English addresses;
- available, source unavailable, and withdrawn;
- layout study and no listing image;
- one-, two-, three-, four-, and five-room examples.

`validateHousingFixtureContract()` fails closed when IDs collide, a listing loses its Map area reference, the listing and Map IDs are conflated, required localized fields are absent, or pricing fields do not match the listing mode.

## 4. Device-Local Preview State

Owner seam: `src/composables/useHousingShellState.js`.

Storage key:

```text
schatphone:housing-shell:preview-state
```

Version 1 stores only:

- `favoriteIds`;
- `recentIds`;
- `viewingDrafts`;
- `activeMode`.

Viewing drafts contain only the stable Housing listing ID, one allowlisted local time-slot ID, a bounded personal note, local status, and update time. State normalization drops unknown listings, unknown slots, malformed records, and unsupported modes.

This S1 state is deliberately not a production Pinia Store and is not included in backup. A failed localStorage read/write cannot break browsing.

## 5. Ownership And Deep-Link Rules

### Map

Housing may open:

```text
/map?source=housing&mapPackId=<stable-pack>&placeId=<stable-area>
```

It may also preserve the existing `homePage` return context. It must not send a Housing listing ID as if it were a Map place, create a pin, create or enter a place session, change discovery, move the player, start a journey, or set a residence.

The discovery sidebar exposes separate `filter this area` and `view this area in Map` controls. The Map action opens the existing Map route and selected neighborhood title; it never renders a Housing-owned fake map or claims a specific listing coordinate.

### Calendar, Agenda Journey, Wallet, Phone, Chat, Notifications, Assets, and Event Runtime

S1 performs no write and presents no fake success in these owners. The viewing action is visibly named a draft and explicitly says that no owner has been contacted and no Calendar entry exists.

### Listing source states

- `available`: detail and local viewing draft are available;
- `unavailable`: cached summary remains readable, missing content is not reconstructed, and viewing is disabled;
- `withdrawn`: cached summary remains readable and viewing is disabled.

## 6. Interaction And State Acceptance

The shell includes:

- normal list and detail;
- local refresh loading state;
- fixture-contract failure state with retry;
- no-result, no-favorite, no-recent, and no-viewing-draft states;
- source unavailable and withdrawn states;
- selected, favorited, saved-draft, cancelled-draft, and restored-draft states;
- filtering, search, rent/buy switch, detail return, and Map handoff;
- accessible names, `aria-current`, `aria-pressed`, dialog labels, stable 42–48 px targets, visible focus, reduced-motion fallback, and zero horizontal overflow intent.

Visible copy is localized for `zh-CN` and English. Korean-world place identity remains content context and does not replace the selected UI language.

## 7. Reserved Paths

Housing implementation owns only:

- `src/views/HousingView.vue`;
- `src/components/housing/**`;
- `src/lib/housing-shell-data.js`;
- `src/composables/useHousingShellState.js`;
- `tests/housing-view.test.js`;
- `tests/housing-shell-state.test.js`;
- `e2e/housing-app.spec.js`;
- this document.

Shared route, Home, App Store, entry registry, icon, skin, system, navigation-return, persistence inventory, roadmap, and package handoff integration belongs to the serial integration owner.

Shared entry contract:

- route: `/housing`;
- app ID: `app_jari_housing`;
- accepted app-entry logo: `jari-housing-app-icon-v1.png`;
- fallback glyph: `fas fa-house-chimney-window`;
- entry accent: `#245d4a`;
- shell scope: `data-app="housing"`.

## 8. Verification

Focused unit coverage proves:

- stable listing IDs remain separate from stable Map area IDs;
- corrupt preview state fails closed;
- favorites and recent views persist locally;
- viewing drafts save, reschedule, cancel, restore, and reject unavailable listings;
- rent/buy, search/filter recovery, detail, no-image, source failure, long price/address, Map query boundary, English, Chinese, and zen behavior.

The 2026-08-23 lightweight structure review preserved the familiar discovery/saved/recent/viewing-draft hierarchy and made Map coexistence explicit at the area level. Desktop can open the real neighborhood Map directly; phone users retain the listing-detail Map handoff. No inline fake map was added.

Focused Playwright covers desktop Chromium and simulated Pixel 5 for:

- Home entry and ordinary rent/buy browsing;
- listing detail plus area-only Map handoff;
- viewing draft persistence/reschedule/cancel;
- Chinese zen, long content, unavailable source, disabled viewing;
- axe WCAG A/AA critical and color-contrast checks;
- page errors and document/body/app horizontal overflow;
- screenshot attachments in the Playwright result rather than runtime artwork.

## 9. Later S2 Owner Work

S2 remains unimplemented and requires separate product authorization. It should decide:

- the production Housing Store, schema, revision, migration, backup, deletion, stale-source, and dedupe rules;
- the canonical listing/source model and whether fixtures come from world packs, user authoring, or controlled generated candidates;
- landlord, agent, property manager, buyer, and renter identities;
- owner-confirmed viewing requests and Calendar/Agenda Journey handoff receipts;
- application, contract, payment, refund, residence, and property-asset owners;
- contact pathways through an owner-native inquiry record or explicit Phone/Chat/Mail handoff.

No S1 field should be treated as an already approved production schema.

## 10. Later S3 Event Work

S3 remains unimplemented. The first safe event chain candidate is an owner-confirmed viewing request followed by a landlord/agent change, cancellation, or access note. Event Runtime may coordinate that fact only after Housing S2 exists.

Event Runtime must never infer housing intent from current coordinates, start an application, sign a contract, pay money, create a residence, or punish the user for not acting on a listing.
