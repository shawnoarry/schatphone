# Modern Seoul K-pop Worldview Writing Plan

Updated: 2026-06-06

Status: `WRITING_PLAN_REVIEW`

## 1. Goal

Plan the content-writing work for **现代首尔 K-pop 娱乐圈** after the content design is approved.

This plan does not contain final worldview prose. It lists the assets to write, the order to write them, review gates, research gates, and acceptance checks.

## 2. Inputs

Primary design:

- `docs/superpowers/specs/2026-06-06-modern-seoul-kpop-worldview-content-design.md`

Earlier question-gathering notes:

- `docs/superpowers/plans/2026-06-03-modern-kpop-worldview-content-plan.md`

Canonical naming baseline:

- Book categories: `worldview`, `encyclopedia`, `world_rule`, `profile_template`, `reference_material`
- WorldBook roles: `main_worldview`, `encyclopedia`, `world_rule`, `profile_template`, `reference_material`

## 3. Work Rules

- Do not write code in this content-writing pass unless a later implementation plan explicitly asks for it.
- Do not add built-in selectable data before the content is reviewed.
- Do not create original fictional companies, groups, programs, platforms, or awards in V1.
- Do not lock real group rosters; all rosters are AU-mutable.
- Do not list real entities without web verification in the entity-list phase.
- Keep the main worldview readable; keep long lists in reference material.
- Use Chinese body text, with English / romanized terms where useful.

## 4. Deliverable Set

### Asset A: Main Worldview

Working title:

- `现代首尔 K-pop 娱乐圈：主世界观`

Canonical mapping:

- Book category: `worldview`
- WorldBook role: `main_worldview`

Target length:

- 4,000-7,000 Chinese characters

Planned structure:

1. Opening atmosphere: Seoul as a stage, workplace, market, and rumor network
2. AU premise: real industry coordinates, mutable rosters, user profile priority
3. The 2026 industry snapshot
4. Agency and label ecosystem
5. Idol generations, seniority, debut eras, and public coordinates
6. Training, debut, comeback, promotion, and touring rhythm
7. Fandom, platforms, forums, and public opinion
8. Work roles beyond idols: creative, management, media, fan, brand, platform
9. Romance, private life, public image, and PR pressure
10. Global linkage: Japan, China-facing fandom, Southeast Asia, North America, Europe, global platforms
11. Schedule and place texture for Calendar / Map / Chat context
12. Ending principle: the user's role decides the entry point

Review focus:

- Does it remain a broad world framework?
- Does it avoid becoming a trainee plot?
- Does it state AU roster freedom clearly but naturally?
- Does it leave detailed lists to reference material?

### Asset B: Encyclopedia Entries

Canonical mapping:

- Book category: `encyclopedia`
- WorldBook role: `encyclopedia`
- Structured entries: `encyclopediaEntries`

Target count:

- 8-12 large entries

Target length:

- 600-1,200 Chinese characters per entry

V1 candidate entries:

1. `公司、厂牌与资源阶层`
2. `练习生、出道与名册机制`
3. `代际坐标与团体市场位置`
4. `回归、打歌与宣传周期`
5. `平台、榜单、销量与流媒体指标`
6. `粉丝经济、应援与消费结构`
7. `论坛、社媒与粉圈社区`
8. `创作、舞台与视觉制作部门`
9. `合同、结算、商务与品牌资源`
10. `媒体、PR 危机与声誉修复`
11. `巡演、海外市场与全球粉圈`
12. `空间、日程与行业动线`

Each entry should include:

- concept overview;
- how idols / trainees encounter it;
- how staff / companies encounter it;
- how media / platforms / fans encounter it where relevant;
- Chat / Calendar / Map usefulness notes where relevant;
- no fixed user role or plot.

Possible merge rules:

- If entries become too long, split only after review.
- If entries feel too fragmented, merge related entries, especially platform/chart/sales or media/PR/forum sections.

### Asset C: World Rules

Canonical mapping:

- Book category: `world_rule`
- WorldBook role: `world_rule`

Target length:

- 1,500-2,500 Chinese characters total

Structure:

1. User-readable rules
2. Model-facing injection rules

User-readable rule topics:

- AU world status
- Real entities as coordinates
- Roster and relationship mutability
- User profile priority
- Full-industry role support
- Romance / PR / career routes as optional routes
- Young trainee institutional context
- 2026 snapshot and non-live-update expectation

Model-facing rules:

- Do not reduce the world to a trainee story.
- Do not assign the user to a company, group, role, status, partner, or scandal unless provided.
- Treat real company / group / platform names as coordinates.
- Accept user-defined roster changes, replacement members, mixed-gender variants, and altered member counts.
- Do not auto-explain missing or replaced real members.
- Keep detailed real entity lists as reference material unless activated or requested.

### Asset D: Profile Templates

Canonical mapping:

- Book category: `profile_template`
- WorldBook role: `profile_template`

Target count:

- 6 templates

Templates:

1. `偶像 / 练习生`
2. `制作人 / A&R / 创作人员`
3. `经纪人 / 工作人员`
4. `媒体 / PD / 娱乐记者`
5. `粉丝创作者 / 站子 / 社区运营`
6. `品牌 / 商务合作方`

Shared field candidates:

- industry role
- agency / label / team / platform affiliation
- debut or career status
- public identity
- private pressure
- schedule pattern
- media exposure
- fandom relationship
- contract or resource constraint
- key allies and rivals
- rumor sensitivity
- creative specialty
- relationship boundary notes
- AU roster change note

Review requirement:

- Check these fields against existing Contacts / WorldBook profile-template support before implementation.

### Asset E: Reference Material - Real Entity Lists

Canonical mapping:

- Book category: `reference_material`
- WorldBook role: `reference_material`

Research requirement:

- Must browse and verify before drafting.
- Use current, reputable sources where possible.
- Include update date.
- Keep this as reference material, not main-worldview body.

Review order:

1. Groups / artists and generation coordinates
2. Companies / labels / agency systems
3. Programs / platforms / charts / awards

Planned structure:

1. Generation coordinate notes
2. Representative group table
3. Core group member reference table
4. Company / label table
5. Program / platform / chart / award table
6. Notes for AU mutability

Group table fields:

- name
- debut year
- company / label
- common generation coordinate
- gender category / group type where relevant
- broad market coordinate
- notes

Core member table fields:

- group
- member name
- common stage name / real name where widely used
- nationality or background
- birth year
- broad role position

Broad market coordinate vocabulary:

- global top-tier
- domestic stronghold
- fandom / sales-driven
- digital-chart strong
- performance-focused
- experimental / concept-forward
- rising
- new-generation reference
- long-running benchmark

No ranking tables.

### Asset F: Reference Material - Chinese Fandom / K-pop Terminology

Canonical mapping:

- Book category: `reference_material`
- WorldBook role: `reference_material`

Target count:

- 20-40 terms for V1

Purpose:

- support forum, social-media, fandom-community, and Chat interpretation;
- not a complete dictionary yet.

Candidate sections:

1. Fan identity terms
2. CP and relationship-discourse terms
3. Comeback / music-show terms
4. Chart / sales / streaming terms
5. Fansite / frontline / photo-video terms
6. Forum / rumor / clarification / anti-fan terms
7. Translation / overseas fandom terms

Fields:

- Chinese term
- English / romanized equivalent where useful
- brief explanation
- usage tone or caution

## 5. Writing Sequence

### Phase 1: Confirm Design And Plan

Actions:

1. User reviews the content design spec.
2. User reviews this writing plan.
3. Revise both docs until the scope is approved.

Exit condition:

- User says the design and writing plan are ready for drafting.

### Phase 2: Verified Entity List Research

Actions:

1. Browse for current company, group, program, platform, chart, and award references.
2. Draft the real entity candidate list.
3. Present the entity list for user review before writing final assets.
4. User approves, deletes, adds, or reprioritizes entities.

Exit condition:

- User approves the first entity-list scope.

### Phase 3: Asset Outline Pass

Actions:

1. Produce the exact final table of assets.
2. Confirm encyclopedia entry titles and merge/split decisions.
3. Confirm profile template titles and fields.
4. Confirm reference material sections.

Exit condition:

- User approves the exact asset list.

### Phase 4: Draft Content Assets

Actions:

1. Draft the main worldview.
2. Draft world rules.
3. Draft encyclopedia entries.
4. Draft profile templates.
5. Draft reference materials.

Review gates:

- Main worldview reviewed first.
- World rules reviewed second.
- Encyclopedia entries can be reviewed in batches.
- Reference materials reviewed after entity-list verification.

### Phase 5: Product Integration Planning

Actions:

1. Decide whether assets remain markdown-only or become selectable built-in data.
2. If selectable built-in data is required, write an implementation plan.
3. Plan tests for WorldBook selection, Book export, source linking, encyclopedia binding, and Chat context.

Exit condition:

- Ready for implementation plan and code/data work.

## 6. Acceptance Checks

Content acceptance:

- The world supports many user roles, not only trainees or idols.
- Real entities function as coordinates, not hard canon.
- AU roster changes are explicitly allowed.
- The world has enough industry detail for long-term simulation.
- Encyclopedia entries are consolidated big themes, not tiny glossary fragments.
- Forum / social-media / fandom-community ecology is a standalone encyclopedia topic.
- Reference material holds detailed entity lists and terminology.

Product-chain acceptance later:

- The main worldview can be linked as `main_worldview`.
- Encyclopedia entries can be enabled and bound to role profiles.
- Book assets use canonical `category`.
- WorldBook source links use canonical `role`.
- Chat context sees `encyclopedia entries` language, not old knowledge-point copy.
- The user can export or inspect assets in Book.

## 7. Validation Before Any Implementation

Before code or data integration:

1. Review both docs with the user.
2. Produce and review the verified entity list.
3. Decide asset storage shape.
4. Write a separate implementation plan if data needs to be built into the app.

Do not skip the entity-list review because the user explicitly requested accuracy and review over real companies, groups, programs, platforms, charts, and awards.

