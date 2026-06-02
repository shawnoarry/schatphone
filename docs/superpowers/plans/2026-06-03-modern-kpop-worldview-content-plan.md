# Modern K-pop Worldview Content Planning Notes

Updated: 2026-06-03

Status: `QUESTION_GATHERING`

## 1. Purpose

Plan the first built-in worldview content package for a modern parallel-world Seoul entertainment industry / K-pop setting.

This document does not contain the final worldview prose. It lists what must be decided first, what content assets should be written after approval, and what should stay out of scope until the product/content boundary is clear.

## 2. Skill Routing

- Use `brainstorming` for this phase because the task is creative product definition and requirement gathering.
- Do not use `chinese-novelist` for this phase because we are not writing chapters, scenes, or a continuous novel yet.
- Use `chinese-novelist` later only if the approved worldview needs a more literary long-form prose pass, example snippets, or story-facing sample narration.
- Use SchatPhone workflow and an implementation plan only after the content structure is approved and we are ready to add selectable built-in data to the app.

## 3. Product Principle

The built-in worldview should define a broad world framework, not a fixed starting plot.

It must support multiple user premises, for example:

- a user who starts as a small-agency trainee;
- a user who is already a world-famous idol;
- a user who is a producer, manager, choreographer, journalist, fan creator, company executive, or outsider entering the industry;
- a user who wants romance, rivalry, career growth, business drama, friendship, or social-media conflict without changing the core world.

The user's own profile should decide the role, status, age, power level, and starting situation. The worldview should provide the industry logic around them.

## 4. Non-Goals For This Planning Step

- Do not write the final worldview text yet.
- Do not write a protagonist, plot hook, opening scene, chapter, or fixed trainee scenario.
- Do not add code, built-in registries, app data, or tests yet.
- Do not use real idol names, real company names, or claims about real people.
- Do not turn this into a real-world K-pop database.
- Do not make this a default world. It should be selectable when the built-in worldview feature is implemented.

## 5. Proposed Content Assets To Write After Approval

### 5.1 Main Worldview Document

Canonical type:

- Book category: `worldview`
- WorldBook source role: `main_worldview`

Planned sections:

1. World premise and scope
2. Entertainment industry structure
3. Agency hierarchy and career ladders
4. Idol, trainee, producer, manager, staff, media, and fan ecosystem
5. Public image, private life, and reputation economy
6. Seoul and global-market geography
7. Money, contracts, sponsorships, touring, streaming, and platform logic
8. Social norms, power dynamics, and crisis management
9. How different user profiles fit into the world
10. Continuity rules for Chat, Contacts, Calendar, Map, and Book exports

This should be broad enough to compile into Chat prompt context without forcing one story route.

### 5.2 Encyclopedia Entries

Canonical type:

- Book category: `encyclopedia`
- WorldBook source role: `encyclopedia`
- Structured entries: `encyclopediaEntries`

Candidate entries to create after approval:

1. Agency classes and company scale
2. Trainee system
3. Debut pipeline
4. Comeback cycle
5. Music shows and chart logic
6. Streaming and platform metrics
7. Fandom economy
8. Fan communication apps and paid community spaces
9. Media outlets, gossip accounts, and broadcast programs
10. Contract, settlement, and exclusivity norms
11. Creative departments: A&R, producers, choreographers, stylists, visual directors
12. Managers, road staff, security, and logistics
13. Variety shows, acting crossover, fashion, and brand deals
14. Scandals, rumor handling, apologies, hiatus, and comeback repair
15. Global touring, overseas fandom, and translation culture
16. Idol housing, schedules, practice rooms, studios, and company buildings

Final count can be smaller for V1. The goal is enough coverage to test WorldBook -> Book export -> Chat/Contacts context without overbuilding.

### 5.3 World Rules

Canonical type:

- Book category: `world_rule`
- WorldBook source role: `world_rule`

Candidate rule groups:

1. Fictionalization rules: all companies, groups, idols, staff, and incidents are fictional.
2. User-profile flexibility: the world must support any user status from unknown trainee to global celebrity.
3. No fixed protagonist rule: the world should not assume the user belongs to one company or starts at one career level.
4. Realism level rules: decide how close the industry logic is to real entertainment business.
5. Safety and boundaries: privacy, stalking, coercion, minors, mental health, labor exploitation, defamation, and illegal acts.
6. Reputation logic: public image, fan response, media escalation, and sponsor risk.
7. Calendar and event logic: schedules, rehearsals, live stages, travel, shoots, meetings, and public appearances.
8. Relationship logic: private relationships, public friendships, fan service, workplace boundaries, and rumor pressure.

These rules should be prompt-facing guardrails, not plot.

### 5.4 Profile Templates

Canonical type:

- Book category: `profile_template`
- WorldBook source role: `profile_template`

Candidate templates:

1. Idol / debuted artist
2. Trainee / pre-debut member
3. Producer / songwriter / A&R
4. Manager / staff
5. Choreographer / performance director
6. Stylist / visual director
7. Journalist / media operator
8. Fan creator / fansite / community organizer
9. Agency executive / investor
10. Variety PD / broadcaster / brand-side partner

Possible shared fields:

- industry role;
- agency or team affiliation;
- debut or career status;
- public persona;
- private pressure;
- schedule pattern;
- media exposure;
- fandom relationship;
- contract or money constraints;
- key allies and rivals;
- rumor sensitivity;
- creative specialty;
- relationship boundary notes.

### 5.5 Reference Material

Canonical type:

- Book category: `reference_material`
- WorldBook source role: `reference_material`

Candidate references:

1. Naming guide for fictional companies, groups, fandoms, shows, apps, venues, and awards.
2. Tone guide for writing Chat responses inside this world.
3. Glossary-style reference for recurring industry terms.
4. Export notes explaining which pieces become Book assets and which pieces become structured encyclopedia entries.

## 6. Information Needed From User Before Writing

### 6.1 Required Decisions

1. Real-world closeness: should this feel documentary-realistic, heightened drama, glossy aspirational, dark industry pressure, or balanced?
2. Geography: use real Seoul/Korea labels with fictional companies, or create a lightly fictionalized Seoul-like entertainment capital?
3. Time period: contemporary 2026, slightly near-future, or timeless modern?
4. Safety boundary for minors: should the built-in world avoid minor idol/trainee storylines entirely, or allow them only as background and never as romantic/sexual material?
5. User role range: should the world explicitly support non-idol roles such as producer, manager, journalist, fan creator, staff, executive, and brand partner?
6. Romance and private relationship pressure: central, optional, or background only?
7. Scandal/crisis depth: light reputation drama, realistic PR crises, or darker exploitation/legal conflict?
8. Industry detail depth: readable high-level worldbuilding, medium detail for simulation, or dense industry bible?
9. Fictional naming style: Korean-inspired realistic names, more stylized idol-drama names, or neutral international names?
10. Language style: final content in Chinese only, bilingual labels plus Chinese body, or bilingual content?

### 6.2 Optional Decisions

1. Should the first V1 include a small set of fictional agencies and groups, or only define the system and let users create all named entities?
2. Should fandom behavior be treated sympathetically, critically, or neutrally?
3. Should money and contracts be concrete enough for Wallet/Assets hooks later?
4. Should Calendar templates include common schedule types such as practice, showcase, music show, recording, tour rehearsal, fan sign, and brand shoot?
5. Should Map context include specific fictional districts, venues, studios, dorms, and broadcast buildings?
6. Should Chat service-account templates exist later for agencies, fan platforms, ticketing, logistics, or media alerts?
7. Should there be hard prohibitions against real celebrity analogues that are too recognizable?

## 7. Proposed V1 Size

Recommended V1:

- 1 main worldview document, about 2,000 to 4,000 Chinese characters.
- 8 to 12 encyclopedia entries, each about 150 to 350 Chinese characters.
- 1 world-rule document, about 800 to 1,500 Chinese characters.
- 3 to 5 profile templates, focused on the most useful roles.
- 1 short reference/naming guide.

Reason:

This is enough to test the WorldBook setting chain without making the first built-in worldview too large to review or debug.

## 8. Suggested First Acceptance Chain

After the content plan is approved and implementation begins, the first practical test chain should be:

1. Select the built-in modern K-pop worldview in WorldBook.
2. Export or copy its source material into Book as canonical categories.
3. Link the main worldview source as `main_worldview`.
4. Enable selected encyclopedia entries.
5. Bind one or more encyclopedia entries to a role profile.
6. Open Chat and confirm the world context mentions encyclopedia entries instead of old knowledge-point language.
7. Open Book and confirm exported assets use `category`, not raw legacy names.

## 9. Risks To Control

- Too narrow: a trainee-only premise would violate the user's world-framework requirement.
- Too real: real company or idol analogues could create legal, safety, and immersion problems.
- Too vague: if the world lacks industry mechanics, Chat will not have enough texture.
- Too dark: if every rule centers exploitation, users seeking aspirational or romance-heavy play will feel constrained.
- Too app-specific: content should not assume implementation details before the built-in selection/export flow is designed.
- Too much V1 content: a huge bible makes it harder to test the actual WorldBook chain.

## 10. Next Step Protocol

1. User reviews this planning document.
2. I ask the required decisions that are still unclear.
3. After answers, I write a content design/spec, still without final prose if the user wants another review gate.
4. After design approval, I create an implementation/content-writing plan.
5. Only after approval do I write the actual worldview assets and/or implement built-in selection/export support.

