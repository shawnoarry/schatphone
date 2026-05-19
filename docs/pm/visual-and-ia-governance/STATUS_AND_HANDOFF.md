# Visual And IA Governance Status And Handoff

Updated: 2026-05-19

This file is the handoff page for visual hierarchy, information architecture, and rebuild-vs-polish decisions.

## 1. Current Status

Status: `PARTIAL_DONE`

What is already landed:

1. this package now exists as the place to separate structural IA issues from simple styling issues;
2. several functional lanes already have clearer structure baselines, such as map-first Map and safer in-app confirmation/dialog patterns;
3. the product direction is explicit that current UI is still functional scaffolding in many places, not final visual immersion.
4. Contacts detail now has a first-pass Role Hub overview that separates L0 summary from deeper profile, relationship, memory, and danger-zone sections.
5. Contacts detail item sections now use grouped Manual details vs Event-attached presentation, with linked-memory entry points for event-attached items.
6. Contacts memory detail now exposes a small source-audit layer with per-module cards and supporting-event drill-down, making relationship-source provenance readable without moving ownership away from source modules.
7. Contacts detail now also supports inline editing for manual role-detail items and a visible linked-activity list below the summary card, making the page feel more like an active role-management hub.
8. Contacts memory presentation now includes a lightweight review toolbar and selected-memory headline facts, so memory management is no longer only a flat list-plus-delete flow.
9. Contacts memory review now includes lifecycle status and note management, making the role hub feel functionally complete enough to leave 4.1 and move on.

Still incomplete:

1. the global shell, Chat, Map, Gallery, Shopping, and Food Delivery all still need later rebuild-quality passes;
2. some pages still mix destructive actions and ordinary edits too closely;
3. Contacts detail can now move out of active IA completion work; remaining effort should focus on later polish or on 4.2 memory dedupe/recall semantics.

## 2. Recommended Next Slice

1. Continue Contacts detail item-level IA polish before broad visual repainting.
2. Keep deciding rebuild vs polish module by module instead of doing cosmetic passes everywhere.
3. Continue isolating destructive actions visually and structurally from normal edit flows.

## 3. Do Not Do

1. Do not use visual polish to hide unresolved IA confusion.
2. Do not overbuild a decorative system before the module workflow is stable.
3. Do not make destructive actions look equivalent to safe edits.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/process/VISUAL_WORKFLOW.md`
6. `docs/overview/APPEARANCE_REBUILD_SCOPE.md`
7. `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md`
