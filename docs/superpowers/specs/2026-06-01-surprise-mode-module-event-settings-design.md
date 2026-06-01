# Surprise Mode And Module Event Settings Design

Date: 2026-06-01

## Product Meaning

`设置 / Settings -> AI 自动响应 / AI Automation` should explain not only whether foreground event checking is on, but also how much randomness the user allows and which modules may receive runtime events.

Users should be able to see and change:

1. `惊喜模式 / Surprise Mode`: the global intensity gate for random or scheduled simulation checks;
2. `模块事件权限 / Module event permissions`: whether the event runtime may create or propose events for visible pilot modules;
3. the difference between AI auto-reply switches and runtime event switches.

## Scope

In scope:

1. expose `Surprise Mode` as Off / Low / Balanced / High in Settings;
2. expose module-event switches for current foreground-tick coverage modules:
   - `Chat 角色主动联系 / Chat role contact events`;
   - `外卖安全事件 / Food Delivery safety events`;
3. keep all copy bilingual and product-facing;
4. add Settings tests for changing these controls;
5. update event-runtime handoff docs.

Out of scope:

1. changing event probabilities;
2. adding new event types;
3. exposing broad World Hub or Cheats-style value editing;
4. moving Chat social review ownership into Contacts or Settings.

## Acceptance

The Settings page should make this clear:

- Foreground Tick decides whether the app checks while open.
- Surprise Mode decides how much random/event activity is allowed.
- Module event permissions decide which app lane may receive runtime events.
- High-risk generated Chat social changes still go through World Hub review.
