# Workbench And Diary Source Prototypes

Updated: 2026-08-25

Status: `USER_AUTHORED_REFERENCE / NOT_RUNTIME_IMPLEMENTATION`

These files preserve two user-authored HTML concepts exported from WorkBuddy. They are durable design inputs for later product decisions and must not be treated as implemented SchatPhone routes, accepted owner contracts, or production data models.

## Files

| File | Meaning | Runtime status |
| --- | --- | --- |
| `kpop-schedule-workbench.html` | K-pop schedule-management workbench with Today, week/month calendar, todo, dashboard, schedule detail/edit, conflict checks, backup/import, and WorkBuddy database fallback logic | Standalone source prototype |
| `kpop-schedule-schema.json` | Original WorkBuddy database schema used by the schedule prototype | Reference only |
| `kpop-schedule-overview.md` | Original delivery notes for the schedule prototype | Reference only |
| `diary-daybook.html` | `墨记` personal diary/daybook concept with mood selection, writing prompt, recent entries, diary editor, mood calendar, and profile statistics | Static interaction prototype |

All visual assets, CSS, and JavaScript used by the two pages are inline. The HTML files do not require sibling image, font, CSS, or JavaScript files to render.

## Product Reading

### K-pop schedule workbench

Useful inputs for the current `工作台 / Work Hub`:

- a compact `今天要处理` overview;
- explicit pending, confirmed, completed, and cancelled states;
- role-specific priority and schedule-conflict cues;
- schedule detail with notes and attachment references;
- Korean/Chinese workplace-language exploration.

Do not copy the whole product hierarchy into Work Hub. The prototype's week/month calendar, general todo list, and schedule dashboard overlap current owners:

- Calendar owns confirmed long-range time commitments and month/week/Agenda views;
- Agenda Journey owns today and near-term activity execution;
- Work Hub should own organization proposals, call sheets, tasks, team communication, reporting, and credentials;
- Map owns route and arrival truth.

The strongest adaptation is therefore `organization proposal or call sheet -> Calendar confirmation -> Agenda Journey execution`, with Work Hub retaining source status and stable return links rather than a second canonical calendar.

### Diary daybook

This is a strong visual and IA reference for a future personal `生活志 / Diary` surface:

- mood as an optional personal annotation;
- a writing prompt that leads directly into authoring;
- recent diary entries organized by date;
- a diary-specific calendar that summarizes mood and writing continuity rather than competing with the canonical Calendar app;
- a focused editor separated from overview;
- bounded personal statistics.

The SchatPhone adaptation should add two explicitly separate layers:

1. owner-confirmed source projections from Calendar, Agenda Journey, Map, Wallet, Assets, Relationship Runtime, and other domain owners;
2. user-authored diary text, mood, media references, tags, and review state owned by the future diary product.

The diary must not become a second schedule owner or silently turn model-generated prose into confirmed personal history.

## Known Prototype Limits

- `kpop-schedule-workbench.html` expects the WorkBuddy-only `window.__SMART_PAGE__.database` API for cloud operation and otherwise falls back to its own localStorage keys.
- The schedule prototype is not compatible with SchatPhone persistence, backup, Calendar, Agenda Journey, Work Hub, or return-context contracts without an explicit adapter and owner review.
- The schedule prototype's `cloudAdd()` success path calls its local rejection helper before resolving, so the archived source must not be treated as production-ready cloud synchronization code.
- `diary-daybook.html` implements screen switching, mood selection, and responsive scaling only. Save, edit, entry selection, calendar navigation, settings, reminders, and durable storage are presentation-only controls.
- Direct `file://` browser inspection was blocked by the available browser security policy. The archive was checked through complete HTML/CSS/JavaScript source inspection, dependency scanning, and byte comparison, not claimed as browser visual acceptance.

## Update Rule

Future revisions should replace the corresponding stable file in this directory and update this README when product meaning, dependencies, or known limitations change. Git history provides cross-machine versioning; do not create a second roadmap or mark these prototypes as implemented when only the source reference changes.

This archive does not change roadmap priority or current package status.
