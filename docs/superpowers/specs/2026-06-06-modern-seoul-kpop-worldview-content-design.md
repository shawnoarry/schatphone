# Modern Seoul K-pop Worldview Content Design

Updated: 2026-06-06

Status: `CONTENT_DESIGN_REVIEW`

## 1. Goal

Design the first built-in worldview content set for **现代首尔 K-pop 娱乐圈**.

This is a broad AU industry-world framework, not a fixed plot, not a default world, and not a single trainee-start scenario. The user's profile, role bindings, Book additions, and later WorldBook edits decide the user's exact identity, career level, relationships, and starting situation.

## 2. Skill Use

- Use `brainstorming` for requirement gathering, content design, and review.
- Do not use `chinese-novelist` for this design stage because we are not writing chapters or scenes.
- Use `chinese-novelist` later only if an approved asset needs a more literary prose pass or example narration.
- Use implementation planning only after the content design and writing plan are approved.

## 3. Confirmed Direction

### 3.1 World Premise

The worldview is a **real Seoul + semi-real K-pop industry AU**.

- Seoul and South Korea are real-world anchors.
- Real companies, labels, groups, programs, platforms, charts, awards, and generation labels can be used as public industry coordinates.
- New events, relationships, roster changes, user self-inserts, replacement members, mixed-gender variants, and alternate career paths belong to the AU and can be freely set by the user.
- The worldview must not lock the user into a trainee, idol, fan, producer, manager, or any other single role.

### 3.2 Tone

The tone is **balanced realism**.

The world should include contracts, training pressure, media attention, fandom behavior, business decisions, and PR crises, while still allowing stage glamour, friendship, romance, ambition, career growth, creative achievement, and satisfying comeback arcs.

### 3.3 Timeframe

The current industry state is a **fixed 2026 contemporary snapshot**.

The setting can reference earlier generations and debut eras as industry coordinates, but it should not chase live news after the content is written.

### 3.4 AU Roster Freedom

AU roster freedom is a core rule.

Users can:

- insert their self-defined role into an existing real group;
- replace a real member;
- add or remove members;
- turn a male or female group into a mixed group;
- change a group's member count;
- move a real member into another role, another career, or remove them from that AU entirely;
- create original groups, companies, staff, fandoms, and events through their own profile, Book additions, or WorldBook edits.

The built-in worldview should not explain, justify, compensate for, or restrict these changes. It only establishes that real industry coordinates are AU-mutable.

### 3.5 Real Entity Scope

The entity scope is **Korean mainstream K-pop + global linkage**.

The content should cover:

- Korean agencies, labels, groups, music shows, platforms, charts, awards, and fandom spaces;
- global market coordinates such as overseas touring, Billboard, Spotify, YouTube, TikTok, Japanese market activity, Chinese-language fandom spaces, Southeast Asian fandom, and global brand work.

It should not become a general global idol-industry textbook. K-pop and Seoul remain the center.

### 3.6 User Role Range

The world supports the full industry ecosystem, not only idols.

Supported identity zones include:

- idols and trainees;
- producers, songwriters, A&R, performance directors, choreographers, stylists, and creative staff;
- managers, road staff, security, translators, coordinators, and company employees;
- journalists, entertainment reporters, broadcasters, PDs, editors, and media operators;
- fan creators, fansites, translators, forum users, community organizers, and data-focused fans;
- brands, advertisers, investors, venue operators, ticketing partners, and platform staff.

This primarily affects profile templates and encyclopedia coverage. The main worldview should describe the ecosystem rather than listing every possible user role.

### 3.7 Relationship And Romance Role

Romance and private relationships are an **important gameplay entry**, not the only theme.

The worldview should support:

- secret relationships;
- public relationships;
- business CP, fan-service CP, and CP fandom;
- senior-junior tension;
- same-company and cross-company relationship pressure;
- company management, fan response, media exposure, sponsor risk, and rumor escalation.

The built-in worldview must not default to any particular relationship, partner, or scandal. Those belong to user profiles, role bindings, Book additions, Chat, and later story content.

### 3.8 Crisis Depth

Crisis depth is **realistic PR crisis**.

Allowed world mechanisms include:

- dating exposure;
- contract disputes;
- plagiarism or creative-credit controversy;
- voting/chart dispute;
- bullying or conduct rumors as rumor mechanics;
- fandom conflict;
- malicious comments;
- overwork, hiatus, and health-related schedule adjustment;
- termination, transfer, or renegotiation.

The tone should be mature and non-sensational. Crisis is part of industry simulation, not the entire mood.

### 3.9 Minors And Young Trainees

The world can acknowledge that the K-pop industry includes minors and young trainees.

The content should express this as literary worldbuilding and institutional reality rather than hard UI rules:

- Korean legal adulthood is 19.
- Many entertainers enter training or debut while young.
- Agencies may coordinate guardianship, schooling, commuting, dorm life, health checks, schedule limits, welfare support, and dedicated life managers.
- The focus is the training system, protection mechanisms, growth environment, and industry tension.

The design should not turn this into a table of hard thresholds or default adult relationship hooks.

### 3.10 Detail Depth

The target depth is **industry bible**, but with consolidated entries.

The first version should feel like a durable industry-world foundation. It should not become dozens of tiny glossary fragments. Encyclopedia entries should be larger thematic entries with internal subsections.

### 3.11 Language

The content format is:

- Chinese main body;
- necessary English terms, platform names, program names, Korean romanization, and fandom terms retained where useful;
- a structured reference material for Chinese fandom / K-pop terminology.

A future revision may expand the terminology layer for forum and fandom-community features.

### 3.12 Writing Style

Use a **hybrid style**:

- opening sections can have literary atmosphere;
- industry mechanisms should be clearly structured;
- asset text should remain easy for WorldBook, Book export, Chat prompt context, and user editing.

## 4. Content Asset Model

Use the canonical Book / WorldBook vocabulary already implemented:

| Asset | Book category | WorldBook role | Purpose |
| --- | --- | --- | --- |
| Main worldview | `worldview` | `main_worldview` | Broad AU Seoul K-pop industry premise |
| Encyclopedia entries | `encyclopedia` | `encyclopedia` | Large reusable industry mechanisms |
| World rules | `world_rule` | `world_rule` | User-readable rules plus model-facing rules |
| Profile templates | `profile_template` | `profile_template` | Role/persona fields for multiple industry positions |
| Reference material | `reference_material` | `reference_material` | Real entity lists, terminology, and writing/reference aids |

## 5. Main Worldview Requirements

The main worldview should:

- define 2026 Seoul as the K-pop industry center;
- explain real industry entities as coordinates, not immutable canon;
- state AU roster freedom naturally;
- describe the industry as an ecosystem of agencies, idols, staff, media, fandom, platforms, brands, and global markets;
- keep the user role open;
- include public-image pressure, creative labor, commerce, media attention, and private-life tension;
- avoid fixed protagonist, fixed agency, fixed group, fixed romance, or fixed crisis.

It should not include a long real entity list. Detailed lists belong to reference material.

## 6. Encyclopedia Requirements

The first version should use **8-12 large encyclopedia entries**.

Entries should be organized primarily by industry chain, with each entry explaining how different roles participate.

Required thematic coverage:

1. Company and label ecosystem
2. Training, debut, and roster systems
3. Idol generations and group coordinates
4. Comeback, music shows, and promotion cycles
5. Platforms, charts, sales, streaming, and global metrics
6. Fandom economy and fan labor
7. Forum, social-media, and fandom-community ecosystem
8. Creative production and performance departments
9. Contracts, settlement, sponsorships, and business resources
10. Media, PR crisis, reputation, hiatus, and comeback repair
11. Touring, overseas markets, localization, and global fandom
12. Spaces and schedules: company buildings, dorms, studios, venues, broadcasts, airports, and brand events

The final V1 can merge or split these to stay readable. The content should avoid a 50+ tiny-entry glossary.

## 7. World Rule Requirements

World rules must have two layers:

### 7.1 User-Readable Rules

These rules should read like setting principles:

- this is a parallel-world / AU industry setting;
- real entities are coordinates;
- user profiles and later additions can reshape rosters, relationships, and events;
- no single career path is assumed;
- romance, competition, PR, career, fandom, and business can all become play routes.

### 7.2 Model-Facing Rules

These should be short and explicit:

- do not reduce the world to a trainee scenario;
- do not assume the user belongs to a specific company or group unless the profile says so;
- do not lock real group rosters;
- accept user-defined AU roster changes;
- do not introduce a fixed protagonist, fixed relationship, or fixed scandal from the built-in worldview alone;
- keep real entity references as industry coordinates unless the user provides a specific AU alteration.

Do not write a separate legal-style disclaimer section.

## 8. Profile Template Requirements

First version templates should cover a compact full-industry set:

1. Idol / trainee
2. Producer / A&R / songwriter
3. Manager / staff
4. Media / PD / entertainment reporter
5. Fan creator / fansite / community operator
6. Brand / business partner

Each template should include fields that help place a character in the industry without forcing plot:

- industry role;
- agency / team / platform affiliation;
- debut or career status;
- public identity and private pressure;
- schedule pattern;
- media exposure;
- fandom relationship;
- contract or resource constraints;
- key allies and rivals;
- rumor sensitivity;
- creative specialty;
- relationship boundary notes.

## 9. Reference Material Requirements

Reference material should include:

### 9.1 Real Entity Lists

Entity lists must be produced later through web-verified research.

Detailed lists should be stored as reference material, not as the main worldview body.

Review order:

1. Groups / artists and generation coordinates
2. Companies / labels / agency systems
3. Programs / platforms / charts / awards

### 9.2 Group And Artist Coordinates

Organization:

- common generation labels plus debut year;
- male and female groups separated where useful;
- boundary disputes acknowledged;
- solo and individual activity included only as lightweight coordinates.

Group records should include:

- group name;
- debut year;
- company / label;
- generation coordinate;
- broad market coordinate, not ranking.

Core groups can have basic member reference lists:

- member name;
- common stage name / real name if widely used;
- nationality or background;
- birth year;
- broad role position.

Member lists are reference only. AU rosters remain freely mutable.

Core group criteria:

- strong generation-coordinate value;
- strong company-system representation;
- strong global-market influence;
- strong fandom/platform mechanism value;
- continued reference value by the 2026 snapshot.

### 9.3 Company / Label Coordinates

Organization:

- Big 4;
- large companies;
- medium companies;
- small companies;
- independent labels;
- sub-label structures inside large systems, especially multi-label structures.

### 9.4 Programs / Platforms / Charts / Awards

Use two layers:

- explanation by artist activity chain: comeback, release, music-show promotion, fan interaction, sales counting, overseas spread, year-end awards;
- type-based reference list: music programs, domestic music platforms, global platforms, fan platforms, charts, award shows, social platforms.

### 9.5 Chinese Fandom / K-pop Terminology

First version:

- lightweight 20-40 term reference;
- aimed at forum, social-media, fandom-comment, and Chat understanding;
- can later become a larger forum/fandom language pack.

Candidate areas:

- fandom identity terms;
- CP and pairing terms;
- chart and sales terms;
- comeback and promotion terms;
- forum post types;
- rumor, clarification, anti-fan, and public-opinion terms;
- fansite and frontline terms.

## 10. App-Linking Scope

First version should include only lightweight app-linking hints.

Write common schedule, place, and notification types, such as:

- practice, recording, comeback, music show, fan sign, tour, brand shoot, variety recording, livestream, company meeting;
- agency building, practice room, dorm, TV station, studio, airport, concert venue, pop-up store, brand event venue;
- agency notice, fan platform alert, ticketing notice, music-show call time, brand contact, media reminder.

Do not design dedicated World Pack apps, service accounts, Calendar templates, or Map event types in this content pass.

## 11. Explicit Non-Goals

- Do not write the actual worldview prose in this design doc.
- Do not list real entities before the verified-list research phase.
- Do not create original fictional companies, groups, programs, platforms, or awards in the built-in content.
- Do not hard-code a starting role, agency, group, rank, or plot.
- Do not make this a default world.
- Do not turn reference material into a locked canon that overrides user AU settings.

## 12. Open Items Before Writing Final Assets

Before the actual content is written:

1. Produce and review verified real entity lists.
2. Decide which 8-12 encyclopedia entries are included in V1 after seeing the entity-list scope.
3. Confirm the profile template field names against current WorldBook / Contacts template support.
4. Decide whether the first deliverable is pure content files or app-selectable built-in data.

