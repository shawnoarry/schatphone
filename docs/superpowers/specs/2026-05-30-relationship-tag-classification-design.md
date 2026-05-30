# Relationship Tag Classification And Event Gating Design

Updated: 2026-05-30

Status: `APPROVED_FOR_PLANNING`

## 1. Decision

SchatPhone should support user-defined relationship labels, but event logic must not read raw free-text labels directly.

Approved direction:

1. `Contacts` remains the role/profile authoring surface.
2. Users may enter free-text relationship labels for a profile.
3. AI may classify the free-text label into:
   - one stable `primary category`;
   - zero or more `modifier tags`.
4. The classification result is stored as project state and reused by runtime/event logic.
5. `Contacts` may display and edit the classification result.
6. `relationship runtime` remains the owner of current live relationship progress and current metrics.
7. Event triggering belongs to the event/runtime lane, not to `Contacts`.
8. `World Hub` remains a review and narrow-control surface.
9. `Cheats` remains the future high-power override lane for direct current-value editing and forced control.

Short version:

> Users write relationship meaning in their own words. The system translates that meaning into stable runtime categories. Contacts owns the editable profile-side classification. Runtime owns current values. Event logic reads the saved classification, not raw prose.

## 2. Problem

The project needs richer relationship meaning than a single numeric affinity or a single romance/not-romance switch.

Examples the system must support:

- very high affection without romance;
- family, best-friend, fan, mentor, servant, rival, or world-specific bonds;
- world-specific relationship types that affect event availability;
- user-written labels such as "childhood friend", "white moonlight", or "fanatic supporter".

If event logic reads only:

1. raw user text, it becomes unstable and hard to test;
2. numeric values only, it loses important semantic difference;
3. relationship stage only, it collapses non-romance high-bond paths into one bucket.

Therefore the system needs a middle layer between user prose and event rules.

## 3. Product Boundary

### 3.1 Contacts

`Contacts` owns:

- free-text relationship label input;
- optional free-text explanation for the label;
- profile-side relationship premise and role positioning;
- the editable stored classification result;
- initial relationship seed values;
- display of the current runtime relationship snapshot.

`Contacts` does not own:

- live event trigger decisions;
- current runtime metrics as authoritative truth;
- broad direct runtime overrides.

### 3.2 Relationship Runtime

`relationship runtime` owns:

- current affinity/trust/intimacy/tension/dependency;
- current relationship stage;
- milestones;
- memory groups;
- current runtime-facing relationship truth.

It may consume profile classification as one input, but it remains the owner of current values.

### 3.3 Event Runtime / Relationship Rules

The event/runtime lane owns:

- whether a relationship type permits or blocks a class of event;
- whether a scene can trigger based on classification plus current metrics plus world context plus cooldown/risk rules;
- major-effect confirmation and World Hub review hooks.

It must not read raw free-text labels as the primary event condition.

### 3.4 World Hub

`World Hub` may review:

- current runtime metrics;
- current stage;
- pending relationship events;
- memory summaries and audit details.

It is not the main relationship authoring page.

### 3.5 Cheats

`Cheats` is the future lane for:

- direct current metric editing;
- forced stage changes;
- forced trigger or unlock behavior;
- GM/debug correction flows.

This slice does not require a finished Cheats route yet.

## 4. User Model

Users should understand two different relationship concepts in `Contacts`:

1. `Relationship premise`
   - who this person is to me by identity or framing;
   - may be manually defined;
   - persists even if the relationship is reset.
2. `Current relationship`
   - what the relationship has actually developed into now;
   - shown from runtime;
   - changes through events, memories, and simulation.

This means `Contacts` should not be treated as "initial archive only".

Instead:

> Contacts is the role control page. It shows the current relationship at the top, while still storing editable profile-side relationship premise below.

## 5. Contacts Detail IA Rule

`Contacts` detail should show:

1. `Current relationship`
   - current stage;
   - current metrics;
   - current primary memory summary;
   - recent linked events or related-record summary.
2. `Relationship premise`
   - free-text relationship label;
   - optional explanation;
   - stored primary category;
   - stored modifier tags;
   - initial seed values.
3. other profile sections
   - bio;
   - preferences;
   - life pattern;
   - social graph;
   - world-template values.

The top "current relationship" block is display-first.

The editable "relationship premise" block is profile-first.

## 6. Classification Model

### 6.1 User Inputs

Each profile may store:

- `relationshipLabelText`
  - free-text user label;
- `relationshipLabelNote`
  - optional explanation;
- `initialRelationshipSeed`
  - initial profile-side seed values such as affinity/trust/intimacy/tension/dependency;
- optional manual relationship notes in ordinary profile fields.

### 6.2 Stored Classification Result

Each profile may also store:

- `primaryRelationshipCategoryId`
- `relationshipModifierIds[]`
- `classificationConfidence`
  - `high`, `medium`, or `low`
- `classificationSource`
  - `ai_auto`
  - `ai_confirmed`
  - `user_edited`
  - `world_template`
- `classificationUpdatedAt`
- `classificationExplanation`
  - short human-readable reason shown only when needed

The event/runtime lane reads these stored fields.

It does not repeatedly reinterpret the original free-text label every time an event is checked.

## 7. Primary Category Model

Approved direction:

- one fixed cross-project base set;
- optional world-specific additions;
- one stored primary category per profile.

### 7.1 Base Categories

Recommended base categories:

1. `ordinary_acquaintance`
2. `family_bond`
3. `friendship_bond`
4. `romance_candidate`
5. `romantic_bond`
6. `mentor_bond`
7. `professional_bond`
8. `power_bond`
9. `fandom_bond`
10. `rival_bond`

Notes:

- This is a runtime/event semantic set, not a user-facing vocabulary limit.
- The user may still type "childhood friend", "white moonlight", "devoted follower", or "like family".
- The system maps those expressions into a stable primary category plus modifiers.

### 7.2 World-Specific Additions

Worlds may add a small number of custom primary categories when the base set is not enough.

Examples:

- ABO world: `marked_bond`
- Sentinel/Guide world: `guide_bond`
- fantasy sect world: `sect_oath_bond`
- contract-magic world: `contract_bound_pair`

Rules:

1. world-specific additions should be rare and explicit;
2. they must be registered through world/template rules, not invented ad hoc in views;
3. event logic must define what they actually change;
4. if a world-specific category is removed, profiles should fall back to a compatible base category instead of becoming unreadable.

## 8. Modifier Tag Model

Modifier tags add nuance without replacing the primary category.

Examples:

- `childhood_connection`
- `long_term_companion`
- `unrequited`
- `mutual`
- `secret`
- `protective`
- `admiring`
- `obsessive`
- `estranged`
- `high_status_gap`
- `caretaking`

Rules:

1. modifiers do not replace the primary category;
2. modifiers help runtime pick a flavor or branch within a category;
3. modifiers may affect event weighting, copy, or branch availability;
4. too many modifiers should not be required for V1.

## 9. AI Classification Flow

### 9.1 Trigger Points

AI classification may run when:

1. a user first enters a free-text relationship label;
2. the label or explanation changes;
3. a world template changes and the user explicitly requests reclassification;
4. a profile is created from a suggested template and needs initial classification.

### 9.2 Output Shape

AI should return:

1. best primary category suggestion;
2. zero or more modifier suggestions;
3. confidence level;
4. short explanation.

### 9.3 Save Rule

Approved rule:

- `high confidence`: auto-save suggestion
- `medium/low confidence`: require user confirmation before save

This keeps the experience smooth without letting uncertain classification silently steer runtime.

### 9.4 User Editing Rule

Approved rule:

- users may manually edit both the primary category and modifier tags in `Contacts`

If the user edits classification manually:

- save `classificationSource = user_edited`;
- keep the free-text label;
- do not silently overwrite the user edit on later AI passes.

## 10. Event Gating Rule

Primary categories are not the only event condition.

Recommended event decision stack:

1. source event type;
2. primary category;
3. modifier tags;
4. current runtime metrics and current stage;
5. world/context rules;
6. cooldown and risk gates;
7. confirmation requirements when needed.

### 10.1 Hard vs Soft Gating

Approved direction: `mixed`

- low-risk events may use the category as a soft preference;
- high-risk or high-meaning events may require category gating.

Examples:

- `gift`, `visit`, `check-in`, `care`, `friendly call`
  - often soft-gated;
- `confession`, `relationship confirmation`, `jealous-control`, `binding ritual`, `irreversible oath`
  - should be hard-gated or confirmation-gated.

This avoids collapsing all high-affection paths into romance while still keeping major events believable.

## 11. Runtime Meaning Examples

Examples of intended behavior:

### 11.1 High affection, non-romance

- primary category: `friendship_bond`
- modifiers: `long_term_companion`
- high affinity + high trust

Possible events:

- unexpected call;
- gift;
- visit;
- emotional support;
- shared plan;
- strong loyalty scenes.

Not a default confession path.

### 11.2 Family-like closeness

- primary category: `family_bond`
- modifiers: `caretaking`

Possible events:

- check-in;
- concern about routine;
- care package;
- protective visit;
- family-duty conflict.

Not a romance path.

### 11.3 Fan intensity

- primary category: `fandom_bond`
- modifiers: `admiring`, optional `obsessive`

Possible events:

- support messages;
- gifts;
- social attention;
- high-intensity reactions;
- pressure or boundary scenes when tension rises.

### 11.4 Ambiguous attraction

- primary category: `romance_candidate`
- modifiers: `secret`, `mutual`, or `unrequited`

Possible events:

- late-night messaging;
- hesitation;
- jealousy cues;
- threshold-based confession candidate;
- retreat or denial scenes when tension is high.

## 12. Reset And Persistence Rules

Relationship reset should clear:

- runtime metrics;
- runtime stage;
- milestones;
- memories;
- applied relationship progress.

Relationship reset should not automatically clear:

- free-text relationship label;
- classification result;
- profile-side relationship premise;
- other ordinary profile fields.

Those belong to the profile layer unless the user deletes the whole role profile.

## 13. WorldBook / Template Interaction

World templates may provide:

- suggested base category;
- suggested modifier vocabulary;
- world-only category additions;
- explanation text for what a category means in that world.

But:

1. WorldBook does not become the main editing surface for one person's relationship premise;
2. Contacts stores the concrete profile values and classification result;
3. world suggestions must not silently erase user edits.

## 14. Out Of Scope For This Slice

This design does not freeze:

1. the final Cheats route or unlock condition;
2. broad direct current-metric editing in Contacts;
3. a complete world-category registry editor UI;
4. full automatic reclassification after every memory/event change;
5. a final event-pack authoring UI for all category rules.

Current assumption:

- `Contacts` displays current runtime values and edits profile-side premise;
- direct current runtime overrides remain primarily a future Cheats concern.

## 15. Recommended Implementation Order

1. add profile schema fields for label text, label note, stored category, modifiers, confidence, and source;
2. add a small classification seam that can call AI once and normalize results;
3. add Contacts detail UI for:
   - current relationship snapshot;
   - editable relationship premise;
   - editable stored classification;
4. define a stable base category registry plus world-extension input path;
5. let event/runtime read stored classification instead of raw label text;
6. add low-confidence confirmation UX;
7. defer broad override editing to the runtime-control / Cheats lane.

## 16. Handoff Summary

If another engineer continues from this spec, they should preserve these rules:

1. `Contacts` is the editable relationship-premise surface.
2. `relationship runtime` is the live current-truth surface.
3. event logic reads stored classification, not raw user prose.
4. use one primary category plus modifiers, not many equal primary categories.
5. use a fixed base set plus world-specific additions, not fully free runtime categories.
6. high-confidence AI suggestions may auto-save; uncertain ones require user confirmation.
7. users may manually edit the stored classification in Contacts.
8. major event gating should use mixed hard/soft rules instead of one romance-only ladder.
