# Visual And IA Governance Status And Handoff

Updated: 2026-05-19

This file is the handoff page for visual hierarchy, information architecture, and rebuild-vs-polish decisions.

## 1. Current Status

Status: `PARTIAL_DONE`

What is already landed:

1. this package now exists as the place to separate structural IA issues from simple styling issues;
2. several functional lanes already have clearer structure baselines, such as map-first Map and safer in-app confirmation/dialog patterns;
3. the product direction is explicit that current UI is still functional scaffolding in many places, not final visual immersion.

Still incomplete:

1. the global shell, Chat, Map, Gallery, Shopping, and Food Delivery all still need later rebuild-quality passes;
2. some pages still mix destructive actions and ordinary edits too closely;
3. Contacts detail IA remains an immediate practical presentation gap.

## 2. Recommended Next Slice

1. Finish the Contacts detail IA presentation work before broad visual repainting.
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

