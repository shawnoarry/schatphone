# World Pack Compatible Expansion Design

Date: 2026-06-02

Status: `PENDING_REVIEW`

## Goal

Turn World Pack from a single current-world preset into a compatible expansion system.

User-facing outcome:

1. The user chooses or imports one main worldview.
2. AI analyzes that worldview and explains what kind of world it appears to be.
3. WorldBook recommends compatible World Packs.
4. The user can still browse and enable other supported packs after seeing fit, conflict, and missing-context notes.
5. Enabled packs combine into App Store entries, Home/App Library launch context, Chat service candidates, terminology, and target-app UX without moving business records out of their owning apps.

## Product Decision

Do not add a visible "base worldview" selection layer such as modern, ancient, or future.

Those labels are useful as compatibility traits, but they should not become a required setup step. Users care about the concrete main worldview: modern school, entertainment industry, urban mystery, survival city, business family, fantasy court, and so on.

The product model becomes:

- Main worldview: the active world source text and rules, stored through Book and activated through WorldBook.
- World profile: AI-derived traits from the current main worldview.
- Compatible World Packs: optional expansion packs that declare fit rules and user-visible effects.
- Enabled expansions: the user's confirmed set of active packs.

## Existing Architecture Fit

Keep the current ownership boundaries:

- Book owns long source text.
- WorldBook owns activation, review, changed-source warnings, and world-governance UI.
- World Interface compiles active world context for Chat, runtime, and target consumers.
- World Pack owns expansion metadata: app bindings, service-account templates, terminology, compatibility rules, and review results.
- App Store and Home own discovery, placement, and launch entry management.
- Target apps own their records and workflows.
- Chat Services owns service/official account opt-in and joined subscriptions.

This design changes the current "one active pack per save" model into "one main worldview plus multiple enabled packs".

## Compatibility Model

Each World Pack should declare:

- required traits: conditions that must be true or user-confirmed before enabling;
- recommended traits: traits that make the pack a strong fit;
- conflict traits: traits that make the pack risky or awkward;
- support state: whether the current program can actually carry the pack;
- effects: app bindings, service-account templates, terminology, profile-template additions, knowledge links, and relationship category/modifier additions.

Fit categories shown to users:

- Recommended: strong fit, safe to enable.
- Adaptable: can work, may add a side plot or social layer.
- Needs Context: asks the user to add or confirm missing world facts.
- Conflicting: allowed only after a clear warning.
- Unsupported: cannot be enabled because the product does not yet have the required app/module boundary.

Unsupported is the only hard block. AI can advise, but it must not remove user choice for supported packs.

## AI World Profile

AI analysis reads active WorldBook context, including linked Book source sections and global fallback text, and produces a structured world profile.

V1 profile fields:

- era: modern, ancient, future, fantasy, post_apocalyptic, mixed, unknown;
- settingTraits: school, entertainment, business_family, urban, survival, supernatural, corporate, court, guild, investigation, travel, etc.;
- realism: realistic, light_fantasy, supernatural, sci_fi, mythic, unknown;
- socialRoles: student, celebrity, manager, fan, heir, investigator, survivor, merchant, official, etc.;
- economyTraits: ordinary, resource_scarce, luxury, barter, corporate_controlled, unknown;
- technologyLevel: real_world, low_tech, near_future, high_future, magical, unknown;
- confidence: high, medium, low;
- evidence: short user-readable reasons from the active worldview.

The AI result is advisory. If confidence is low, the recommendation screen should say that clearly and invite the user to browse all packs.

## Recommendation Flow

1. User opens Settings -> WorldBook.
2. WorldBook shows the active main worldview and source status.
3. User runs "Analyze world for expansion packs".
4. AI returns a world profile with evidence.
5. The local compatibility matcher scores built-in and user packs.
6. WorldBook shows recommended packs first, then adaptable, needs-context, conflicting, and unsupported.
7. User can open any supported pack to preview effects.
8. User confirms enablement.
9. WorldBook records the enabled pack with its review snapshot.
10. App Store/Home/Chat Services/target apps consume the combined enabled-pack context.

## Browse-All Rule

Users must be able to browse all available packs after AI recommendation.

The UI should not say "AI did not recommend this, so you cannot use it." It should say:

- why the pack was not recommended;
- what it may add to the current world;
- what facts are missing;
- what may conflict;
- which app entries, service candidates, and terminology changes will appear;
- whether the product currently supports it.

## Multi-Pack Merge Rules

Enabled packs are merged in a deterministic order:

1. main worldview sources;
2. built-in enabled packs in user-chosen order;
3. user-created enabled packs in user-chosen order;
4. user Appearance and scoped CSS overrides after all World Pack visual defaults.

Merge behavior:

- app bindings are deduped by stable binding id and module/archetype target;
- service-account templates are deduped by stable template id and linked app binding;
- terminology conflicts are shown in preview and resolved by pack order;
- relationship category/modifier additions are deduped by id;
- unsupported bindings are excluded from enablement and shown as blocked effects;
- target apps keep their business records unchanged.

V1 can start with simple pack order: newest enabled pack wins terminology conflicts, with an explicit preview warning.

## UI Changes

WorldBook Pack panel should become:

- Main Worldview: active Book/world source status and changed-source warning summary.
- AI World Profile: last analysis result, confidence, and reasons.
- Recommended Expansions: AI-ranked World Packs.
- Enabled Expansions: currently active compatible packs with effect counts.
- All Packs: searchable/browsable list with fit category chips.

The panel should avoid technical labels like "schema" or "binding" in primary copy. Use product language first:

- "Adds App Store entries"
- "Adds service accounts you can join in Chat"
- "Changes Shopping wording into a world-specific market"
- "Needs a dedicated app before it can be used"

## Guardrails

- Do not generate arbitrary routes, stores, event rules, products, orders, schedules, or messages.
- Do not auto-enable packs from AI output.
- Do not auto-join Chat service accounts.
- Do not let WorldBook become an app launcher.
- Do not map ambiguous unsupported packs such as black market onto Shopping unless a dedicated product decision approves that route.
- Do not hide supported packs merely because AI did not recommend them.

## Out Of Scope

- A standalone world-store, DLC shop, token economy, or marketplace.
- Dedicated new app modules for unsupported archetypes.
- Full automatic event/runtime behavior from packs.
- Editing source-module business data from WorldBook.
- Replacing Book import/export or changed-source diff behavior.

## Acceptance Criteria

The design is acceptable when:

- users can keep one main worldview and enable multiple compatible packs;
- AI recommendation explains fit without becoming a hard gate;
- all supported packs remain browseable;
- unsupported packs are blocked by product capability, not by taste;
- enabled packs merge into existing App Store/Home/Chat Services/target-app seams;
- existing Book, WorldBook, World Interface, App Store, Home, Chat Services, and target-app ownership boundaries remain intact;
- the first implementation can be tested with an imported or built-in modern world, then adding entertainment, school, business-family, or supernatural-style expansions.
