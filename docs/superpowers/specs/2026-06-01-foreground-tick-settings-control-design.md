# Foreground Tick Settings Control Design

Date: 2026-06-01

## Product Meaning

The Settings entry for `事件前台 Tick / Foreground event tick` should tell users what the switch actually controls.

When users open `设置 / Settings -> AI Automation`, they should see:

1. whether the foreground tick is on;
2. what safe checks are currently included;
3. the latest visible runtime result;
4. a direct path to `世界中枢 / World Hub` for detailed review.

## Scope

In scope:

1. add bilingual setting copy and compact status rows;
2. show current check coverage:
   - `外卖安全事件 / Food Delivery safety events`
   - `角色主动联系候选 / Role proactive contact candidate`
3. show a latest-result summary from existing simulation event logs;
4. add a `查看世界中枢 / Open World Hub` action;
5. add tests for the automation subpage.

Out of scope:

1. new event types;
2. new random probabilities;
3. new World Hub editor controls;
4. new visual system redesign.
