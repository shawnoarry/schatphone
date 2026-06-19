# Modern Seoul K-pop Worldview Content Style Guide

Updated: 2026-06-19

Status: `STYLE_GUIDE_ACCEPTED`

This style guide applies to the built-in worldview **现代首尔 K-pop 娱乐圈** and its related Book / WorldBook assets.

General workflow authority: `docs/superpowers/specs/2026-06-19-worldview-content-production-workflow.md`

## 1. Goal

Write the worldview and knowledge assets as **setting entries**, not prose fiction.

The content should help AI and users quickly understand:

- what this world is;
- what entities, mechanisms, roles, places, schedules, and conflicts exist;
- what the user can freely change through profile, Book additions, and WorldBook edits;
- which keywords should be available for Chat, Calendar, Map, forum, fandom, and role-profile context.

Future style or prose-flavor patches can add literary voice. The base worldview should prioritize clarity, keywords, and editable structure.

Main worldview and encyclopedia bodies must remain world-internal. Do not write backend loading rules, app routing rules, model invocation notes, or response-mode instructions into these bodies. Put reply mechanics and functional boundaries only in world rules.

## 2. Style Rules

Use direct declarative sentences.

Prefer:

- `本世界观设定在 2026 年的现代首尔。`
- `现实公司、团体、节目、平台、榜单和奖项作为行业坐标使用。`
- `用户设定拥有最高优先级。`
- `AU 名册、履历和关系以用户写明版本为准。`

Avoid repeated contrast-heavy patterns:

- avoid frequent `不是……而是……`;
- avoid defensive legal-style disclaimers;
- avoid long explanations about why the setting is allowed;
- avoid literary paragraphs that bury usable setting keywords.
- avoid backend or model-facing phrases such as `AI 应`, `AI 可以`, `调用`, `装载`, `Book`, `WorldBook`, `Chat`, `Calendar`, and `Map` in main worldview and encyclopedia bodies.

Use concise paragraphs with dense nouns and mechanisms. Each paragraph should contribute concrete setting information.

## 3. Content Shape

Main worldview:

- compact, direct overview of the world;
- 2026 Seoul, K-pop industry, real-entity coordinates, AU mutability, role range, company system, fandom, media, crisis, romance, global markets, schedules, and app-linking hints;
- no long tables inside the main worldview.

Encyclopedia / knowledge supplements:

- structured Chinese entries;
- clear section titles;
- short explanatory paragraphs;
- prefer grouped entries, key-value clauses, and compact bullet lists;
- avoid Markdown tables in active Book / WorldBook assets;
- keywords and examples prioritized over literary atmosphere.
- use `场景作用`, `使用边界`, `关键词`, and `场景用途` when a section needs to explain how the material behaves inside the world;
- do not use `AI 使用`, `调用强度`, or backend app names in loaded bodies.

World rules:

- user-readable principles first;
- model-facing rules in direct imperative form;
- no ornamental prose.
- reply mode, online/offline boundaries, real-time handling, active-message boundaries, and app-record boundaries belong here, not in main worldview or encyclopedia assets.

Profile templates:

- field-oriented;
- role-neutral where possible;
- easy for users to fill and edit.

Reference material:

- internal review files may use lists and tables;
- accuracy notes, source trails, verification links, and reference lists must stay in separate internal review files;
- before a text is loaded into Book / WorldBook context, convert tables into setting entries or key-value lists;
- before a text is loaded into Book / WorldBook context, remove source notes, reference sections, verification links, and audit trails from the loaded body;
- detailed real-entity lists should stay here, not in the main worldview.
- backend names, loading notes, indexing notes, source trails, and audit notes must stay here or in plans, never in active loaded bodies.

## 4. Keyword Priority

Each asset should preserve terms that help downstream app and AI context:

- industry roles: idol, trainee, producer, A&R, manager, PD, reporter, fansite, forum operator, brand partner;
- entity types: company, label, group, unit, project group, solo, fandom, platform, chart, award, music show;
- schedule types: practice, recording, comeback, music show, fan sign, video call, tour, livestream, brand shoot, airport, company meeting;
- places: company building, practice room, recording studio, dorm, TV station, salon, airport, venue, pop-up store, brand event;
- mechanisms: AU roster change, comeback cycle, fan economy, charting, public opinion, PR crisis, contract, settlement, sponsorship, global market.

## 5. Acceptance Checks

A content asset passes this style guide when:

- it describes what the world is in direct statements;
- it is easy for a user to scan and edit;
- it outputs useful setting keywords;
- it avoids excessive `不是……而是……` contrast clauses;
- it avoids high-literary narration unless a later style patch explicitly adds it;
- it avoids Markdown tables when the asset is meant to be loaded as Book / WorldBook context;
- it avoids source notes, reference lists, verification links, and audit trails in the loaded Book / WorldBook body;
- it keeps detailed entity lists in reference material;
- it preserves user freedom and AU mutability clearly.
- main worldview and encyclopedia bodies pass the workflow scan in `2026-06-19-worldview-content-production-workflow.md`.
