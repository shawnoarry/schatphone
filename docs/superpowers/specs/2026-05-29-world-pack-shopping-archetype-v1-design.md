# World Pack Shopping Archetype V1 Design

Updated: 2026-05-29

Status: `IMPLEMENTED_V1`

Implementation note:

- Active World Pack app bindings now render in the WorldBook Current World Pack panel.
- The `survival_city` pack's `survival_supply_board` binding opens Shopping with `worldPack` and `worldApp` query context.
- Shopping now shows a world-app context banner for `补给站` and offers a user-triggered Daily Fresh / Grocery filter action.
- Opening or filtering the world app does not create or mutate products, carts, orders, Wallet records, Assets records, Calendar cues, or Chat messages.

## Goal

Make the first World Pack app binding visible in a real module: the `survival_city` pack's marketplace binding opens Shopping as a world-specific `Supply Board` / `补给站` entry.

User-facing outcome:

1. The user activates `Post-disaster survival city` in `Settings -> WorldBook`.
2. The Current World Pack panel shows the active pack's world app bindings.
3. The user can open the Shopping-backed `Supply Board`.
4. Shopping shows a clear world-context banner and can apply the safe default Shopping filter.
5. Products, cart, checkout, orders, Wallet records, Assets records, Calendar cues, and Chat messages remain owned by their source modules.

## Product Boundary

World Pack owns the app-binding suggestion and terminology.

WorldBook owns activation review and the launch surface.

Shopping owns product browsing, service filters, cart, checkout, orders, logistics review, and downstream handoff suggestions.

The V1 world app binding may change the entry label, context copy, and default filter. It must not create or mutate Shopping business records by itself.

## V1 Scope

Included:

- pure helper for active-pack app-binding rows;
- pure helper for resolving the Shopping world-app context;
- `survival_supply_board` routes to `/shopping` with `worldPack` and `worldApp` query params;
- Shopping displays active pack, binding title, boundary copy, and default service/category recommendation;
- a user-triggered action applies the recommended filter;
- WorldBook component and Shopping component tests;
- e2e coverage for WorldBook -> Shopping world-app launch.

Deferred:

- concrete archetype behavior for Food Delivery, Calendar, Chat publication feeds, transit, reservations, or subscriptions;
- automatic product creation;
- separate world marketplaces, order ledgers, inventory pools, or currency systems;
- AI parsing rules for app-binding behavior;
- Home folder child-entry generation from World Pack app bindings.

## Information Architecture

WorldBook keeps the app-binding section as an active-pack L2 area:

- L0: the active world and current activation state;
- L1: review the selected pack before activation;
- L2: active pack world apps and service templates;
- L3: open a world app or create a Chat Directory service account.

Shopping keeps the world context as a banner above normal Shopping controls:

- L0: "you are viewing Shopping through this world app";
- L1: which pack and app binding supplied this context;
- L2: what default filter can be applied;
- L3: user continues with normal Shopping actions.

## Default Mapping

For V1, only the marketplace archetype maps to Shopping:

```js
{
  archetype: 'marketplace',
  moduleKey: 'shopping',
  serviceKey: 'daily_fresh',
  categoryKey: 'grocery'
}
```

For `survival_supply_board`, this means the world app can suggest `Daily Fresh / Grocery` as the supply-focused view. The user must click the action or open the query route; the helper itself does not mutate stores.

## Acceptance

The feature is acceptable when:

- a pure helper returns launchable app-binding rows for the active World Pack;
- WorldBook shows `Supply Board` / `补给站` as a world app after activating `survival_city`;
- clicking the world app opens `/shopping?worldPack=survival_city&worldApp=survival_supply_board`;
- Shopping shows a world-context banner for the active binding;
- the banner's filter action routes to the safe Shopping service/category context;
- no Shopping cart, order, Wallet, Assets, Calendar, or Chat state changes merely by opening the world app;
- unit tests, component tests, e2e, lint, build, and visual mobile/desktop checks pass.

Validation:

- Focused tests passed for app-binding helpers, WorldBook app launch, and Shopping world context.
- Full lint, build, unit test suite, e2e suite, and `git diff --check` passed.
- Desktop and mobile Playwright screenshots were captured under `artifacts/`.
