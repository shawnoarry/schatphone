# SchatPhone Project Module Audit

Updated: 2026-05-29

> **Candidate pool only / 仅候选池**
>
> This file is not an active roadmap or implementation source. Use it to compare module maturity and discover candidates. Promote any chosen slice into `docs/roadmap/TODO_ROADMAP.md` and the matching task package handoff before implementation.

Purpose: this document is the candidate pool and product-level module audit for future planning.

Use it to answer:

- which modules are already stable enough to expand;
- which ones still have product or ownership risk;
- which candidate directions are worth promotion into the live roadmap later.

Authority:

- this file is not the live execution board;
- active implementation order still belongs in `docs/roadmap/TODO_ROADMAP.md`;
- handoff-oriented engineering risk still belongs in `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`;
- package ownership and workflow rules still belong in `docs/pm/TASK_PACKAGE_INDEX.md` and `docs/process/AI_WORK_MODE.md`.

## 1. Quick Judgment

SchatPhone has passed the "can the shell run?" stage.

Current product reality:

1. the shell is real;
2. Chat and relationship continuity are real;
3. Map / Reminders / Calendar / push is a meaningful cross-module loop;
4. Gallery is a real asset center;
5. runtime and World Hub exist as narrow, optional layers;
6. several support modules are real MVPs rather than pure placeholders;
7. Book now exists as a trial-ready V1 text-source library for WorldBook activation.

Main product risk now:

> module maturity is uneven, and old ownership confusion can still come back if candidate ideas are promoted too casually.

## 2. How To Read This Audit

For each module:

- `current state` = what is actually true today;
- `main gap` = the most visible missing piece from a product perspective;
- `boundary risk` = where a future change is likely to break ownership clarity;
- `candidate next move` = a reasonable future direction, not an already-approved task;
- `priority` = candidate priority only, not live roadmap status.

Priority legend:

- `P0.5`: near-term stabilization or polish before broader expansion
- `P1`: strong candidate for active immersive-expansion work
- `P2`: later module growth
- `Watch`: keep healthy, no immediate feature push

## 3. Module Candidate Audit

| Module | Current state | Main gap | Boundary risk | Candidate next move | Priority |
| --- | --- | --- | --- | --- | --- |
| Lock Screen | stable shell entry with notification tap-through and unlock flow | finer visual/device polish | future modules bypassing shell notification rules | keep new module notification metadata aligned with shell rules | Watch |
| Home | stable app-entry shell with folder model and gated layout editing | customization discoverability remains intentionally low | turning Home into a second control console | keep it focused on phone entry, not deep product logic | Watch |
| Settings | strong configuration hub for backup, diagnostics, automation, push, and appearance | page density is still high | mixing system config changes with domain ownership changes | continue low-risk section cleanup only when UX needs it | P0.5 |
| Network | technically usable provider setup and diagnostics | provider setup still feels technical | transport changes hidden inside UI polish work | improve guidance and examples instead of changing transport semantics | P1 |
| Chat | strongest immersive core loop | large view and dense thread settings | Chat-side compatibility fields being mistaken for truth again | keep refining presentation and IA before adding more side-systems | P0.5 |
| Chat Directory | real Chat-side role/service management surface | concept density is high for non-technical readers | drifting back into global role-truth ownership | keep meaning narrow and plain-language | P1 |
| Contacts | real role archive and relationship-management lane | full role-detail IA still needs polish | destructive flows and relationship truth are semantically sensitive | finish Contacts V2 detail IA and memory presentation | P1 |
| Gallery | real shared media center and cross-module asset source | still balancing album feel and asset-management feel | forcing it into high-friction relationship-memory authoring too early | keep it asset/atmosphere-first | P0.5 |
| Appearance | strong MVP for wallpaper, theme, and icon presets | broader visual identity work is still parked | accidentally reopening the global visual rebuild | revisit only in explicit visual slices | P2 |
| WorldBook | real shared world-context layer with Book source links, World Pack activation, and user-approved service-template generation | readability matters more than new feature count | turning it into a universal control console | extract panels before the next major behavior slice | P1 |
| Book | trial-ready text-source library with WorldBook source links | visual diff review is still basic | becoming Files, a reader app, or an activation console | phone-test source activation, then harden diff review | P1 |
| Map | strong simulation-first baseline with trip, route, familiarity, and area-feedback loops | still product-rich and easy to overload | re-absorbing reminder or memory ownership | keep Map as travel/context owner, not reminder or relationship truth owner | P1 |
| Calendar | real schedule/date app with confirmed events and push hooks | fuller event-management polish can still improve | slipping back into raw cue inbox behavior | keep it confirmed schedule/date-first | P1 |
| Reminders | real cross-module cue and follow-up surface | longer-term task/objective presentation is still light | being collapsed back into Calendar or being mistaken for World Hub | keep raw cues and follow-up meaning here | P1 |
| Files | internal metadata/index component by decision | user-facing expectations must stay low | reopening Files as a normal public app | only expand when another module truly needs an internal bridge | P2 |
| More | lightweight utility/labs surface | feature toggles are intentionally modest | becoming a random dump for unresolved product ideas | let current toggles mature before adding more | P2 |
| Profile | useful support surface for user identity context | still more support than standalone fantasy | decorative field sprawl with no downstream use | only add fields that real consumers use | P2 |
| Phone | working support loop for call logs and callback-style continuity | not yet a deep fantasy lane | over-investing before Chat/Calendar/support loops need it | keep it support-focused for now | P2 |
| Wallet | real downstream ledger and continuity connector | broader economy fantasy is still intentionally light | turning Wallet into order or relationship truth owner | preserve downstream-ledger meaning | P2 |
| Stock | support module with working simulated baseline | not yet central to the product fantasy | trying to push it into mainline loops too early | keep it secondary until narrative economy is justified | P2 |
| Shopping | stable independent commerce lane with relationship-memory connectors | logistics/social continuity can deepen further | ownership leaking into Wallet, Chat, or World Hub | continue service-account and continuity polish through existing seams | P1 |
| Food Delivery | strongest low-risk event pilot lane | still only one safe automatic pilot family | over-broad automation before review/explanation quality is ready | keep using it as the safest runtime-expansion test lane | P1 |
| Assets | useful supporting module with continuity value | not yet a headline user fantasy | unclear overlap with Gallery or Files | deepen only through clearly owned use cases | P2 |
| World Hub | narrow optional runtime review/control surface | detail readability must improve before stronger controls | becoming mandatory or turning into a generic admin console | improve review quality before control breadth | P1 |
| Push / relay path | real delivery channel baseline exists | no true closed-page autonomous event generation | confusing delivery with backend orchestration | keep delivery-only language honest until a later decision | P1 decision |

## 4. Cross-Cutting Candidate Workstreams

| Workstream | Why it matters | Candidate next move |
| --- | --- | --- |
| Contacts role-hub polish | Contacts is now a product-critical role and destructive-action surface | finish role-detail IA and memory management presentation |
| Memory dedupe and recall | several modules now feed relationship continuity | tighten primary-memory vs supporting-attachment behavior |
| Runtime review clarity | event/runtime systems already exist, but stronger control would confuse users too early | improve World Hub detail panels and explanation quality |
| Large-view cleanup | a few oversized views still carry too many unrelated flows | continue low-risk component extraction without rewriting truth layers |
| Delivery vs autonomy clarity | push exists, backend orchestration does not | keep product language honest and defer backend-autonomy promises |

## 5. Recommended Promotion Rules

Before promoting a candidate from this audit into the live roadmap:

1. confirm the module owner is still clear;
2. confirm the task does not conflict with frozen boundaries such as `Contacts vs Chat Directory`, `Calendar vs Reminders`, or `World Hub vs Cheats`;
3. move the concrete slice into `docs/roadmap/TODO_ROADMAP.md`;
4. if the slice changes semantics, sync the matching task package and strategy/decision docs in the same round.

## 6. Recommended Current Candidate Order

If the team needs the next best candidate pool order, use:

1. Contacts role-hub and memory-management polish
2. relationship-memory dedupe / merge / recall cleanup
3. World Hub review clarity
4. service-account continuity polish in Shopping and Food Delivery
5. only then broader secondary-module deepening

## 7. Reading Path

For live action:

1. `docs/roadmap/TODO_ROADMAP.md`
2. `docs/pm/TASK_PACKAGE_INDEX.md`
3. matching package docs
4. `docs/process/AI_WORK_MODE.md`

For engineering risk:

1. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
2. `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`

## 8. Change Log

1. 2026-05-04: created as a product planning and engineering handoff audit.
2. 2026-05-19: rewritten to remove mixed-encoding residue, align with the current ownership model, and reposition the file as a candidate pool rather than a semi-live task log.
