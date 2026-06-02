# Book / WorldBook Naming Unification Design

Updated: 2026-06-03

Status: `DESIGN_REVIEW`

## 1. Goal

Unify the product and backend names used by Book, WorldBook, World Pack, and world-context consumers before adding built-in worldviews such as the modern K-pop entertainment industry setting.

The current chain is functional, but the naming is split:

- Book uses text asset types such as `knowledge_note` and `rule_set`.
- WorldBook source links use usage values such as `knowledge_source` and `base_worldview`.
- The older WorldBook system still stores prompt-facing records as `knowledgePoints`.
- UI copy still says `Knowledge`, `knowledge point`, `知识点`, and `知识补充` in several places.

This creates one user concept with several code names. The cleanup goal is one canonical concept name per meaning, with compatibility aliases for existing saves and exports.

## 2. Product Rule

User-facing names and backend names should follow the same concept map.

Different layers may still have different field names when the meaning is genuinely different:

- a Book record has a `category`;
- a WorldBook source link has a `role`;
- a role profile stores ids of linked entries.

But the concept stem must stay the same. For example, the same thing should not appear as `knowledge_note`, `knowledge_source`, `knowledgePoints`, and `知识点`.

## 3. Canonical Vocabulary

### 3.1 User-Facing Names

| Canonical concept | Chinese copy | English copy | Meaning |
| --- | --- | --- | --- |
| `worldview` | 世界观 | Worldview | A reusable source text that defines the world premise, scope, social logic, genre boundaries, institutions, and default atmosphere. |
| `main_worldview` | 主世界观 | Main worldview | The active root worldview slot compiled into current world context. |
| `encyclopedia` | 百科 | Encyclopedia | Reusable factual or lore entries: institutions, industries, places, terminology, social norms, history, public figures, and domain knowledge. |
| `world_rule` | 世界规则 | World rules | Hard rules that govern behavior, constraints, taboos, safety boundaries, mechanics, or prompt policy inside a world. |
| `profile_template` | 人设模板 | Profile template | Template guidance for role/self/NPC profile structure. Contacts still owns concrete profile values. |
| `reference_material` | 参考资料 | Reference material | Source text kept for authoring or review, not necessarily active world context. |
| `world_pack` | 世界包 | World Pack | A selectable assembly layer that can enable app bindings, service templates, terminology, profile templates, and compatible add-ons. |

### 3.2 Backend Field Names

| Layer | Current name | Canonical name | Note |
| --- | --- | --- | --- |
| Book asset classifier | `assetType` | `category` | User-facing copy should call this `分类 / Category`. |
| Book worldview asset | `worldbook_document` | `worldview` | A source document, not the active root by itself. |
| Book knowledge asset | `knowledge_note` | `encyclopedia` | Fold old knowledge notes into encyclopedia. |
| Book glossary asset | `glossary` | `encyclopedia` | Glossary should be a presentation/filter concern later, not a separate core type now. |
| Book rule asset | `rule_set` | `world_rule` | Use the same stem as user copy. |
| Book profile asset | `profile_template_note` | `profile_template` | Avoid "note" unless it is only a reference. |
| Book reference asset | `reference_note` | `reference_material` | Use one stable name. |
| WorldBook source classifier | `usage` | `role` | `role` explains how linked source text is used in the active world. |
| WorldBook base source | `base_worldview` | `main_worldview` | The active root worldview slot. |
| WorldBook knowledge source | `knowledge_source` | `encyclopedia` | Same stem as Book category and structured entries. |
| WorldBook pack source | `pack_source` | `world_pack_reference` | A source role tied to World Pack review/support text. |
| WorldBook template source | `profile_template_reference` | `profile_template` | Same stem as profile template concept. |
| Legacy worldview text | `globalWorldview`, `worldBook` | `mainWorldview` | Keep old fields readable during migration. |
| Legacy knowledge records | `knowledgePoints` | `encyclopediaEntries` | Structured reusable entries. |
| Legacy knowledge ids | `knowledgePointIds` | `encyclopediaEntryIds` | Used by role profiles and World Packs. |

## 4. Data Model Direction

### 4.1 Book Asset

Book should write the canonical `category` field. During migration it may also read old `assetType` values.

```js
{
  id: 'book_asset_...',
  title: 'Modern Entertainment Industry',
  category: 'worldview',
  format: 'markdown',
  tags: ['kpop', 'seoul', 'entertainment'],
  content: '# ...',
  sections: [],
  status: 'draft',
  createdAt: 0,
  updatedAt: 0
}
```

Compatibility rule:

- if an imported asset has `assetType`, normalize it into `category`;
- exports should prefer `category`;
- a temporary alias may include `assetType` only if needed for older cross-device packages.

### 4.2 WorldBook Source Link

WorldBook source links should write `role`, not `usage`.

```js
{
  id: 'world_source_...',
  assetId: 'book_asset_...',
  sectionIds: ['section_industry_structure'],
  role: 'main_worldview',
  enabled: true,
  priority: 100,
  sourceFingerprint: 'fp_...',
  sourceSnapshotText: '...'
}
```

Compatibility rule:

- old `usage` values are accepted and normalized into `role`;
- the source picker should show Chinese labels from the canonical vocabulary;
- prompt compilation should not expose `usage` or `role` to users.

### 4.3 Encyclopedia Entries

The older `knowledgePoints` record family should become `encyclopediaEntries`.

```js
{
  id: 'encyclopedia_...',
  title: 'Music Show Win',
  content: '...',
  tags: ['industry', 'broadcast'],
  enabled: true,
  createdAt: 0,
  updatedAt: 0
}
```

Compatibility rule:

- `knowledgePoints` remains a read alias until saved data is migrated;
- role profile and World Pack id arrays migrate from `knowledgePointIds` to `encyclopediaEntryIds`;
- helper functions should move toward `listEncyclopediaEntries`, `upsertEncyclopediaEntry`, and `findRelevantEncyclopediaEntries`;
- old helper names can remain as compatibility wrappers for one cleanup window.

## 5. UI Naming Direction

Visible UI should avoid the word `知识点` for this layer. It is too technical and too close to implementation language.

Preferred copy:

- `百科`
- `百科条目`
- `相关百科`
- `启用百科`
- `当前注入的百科条目`
- `主世界观`
- `世界规则`
- `参考资料`

Book should present `分类 / Category`, not raw values.

WorldBook should present source roles in user language:

- `主世界观`
- `百科`
- `世界规则`
- `世界包参考`
- `人设模板`
- `参考资料`

## 6. Migration And Compatibility

This cleanup must not break existing local saves, settings backups, or exported Book assets.

Required migration behavior:

1. Read old and new names.
2. Normalize old values into canonical values at store boundaries.
3. Prefer canonical names when saving new data.
4. Keep compatibility aliases in import/export for one transition period.
5. Add regression tests for old-save restore and old Book import.

Alias map:

```js
{
  bookCategories: {
    worldbook_document: 'worldview',
    knowledge_note: 'encyclopedia',
    glossary: 'encyclopedia',
    rule_set: 'world_rule',
    profile_template_note: 'profile_template',
    reference_note: 'reference_material'
  },
  sourceRoles: {
    base_worldview: 'main_worldview',
    knowledge_source: 'encyclopedia',
    pack_source: 'world_pack_reference',
    profile_template_reference: 'profile_template'
  },
  fields: {
    assetType: 'category',
    usage: 'role',
    globalWorldview: 'mainWorldview',
    worldBook: 'mainWorldview',
    knowledgePoints: 'encyclopediaEntries',
    knowledgePointIds: 'encyclopediaEntryIds'
  }
}
```

## 7. Implementation Slices

### Slice 1: Taxonomy Constants

Add one canonical naming module for Book/WorldBook taxonomy.

Expected responsibilities:

- expose canonical category and role values;
- expose Chinese/English labels;
- expose old-to-new alias maps;
- provide normalization helpers.

Candidate file:

- `src/lib/world-taxonomy.js`

### Slice 2: Book Schema Normalization

Update Book schema and store boundaries.

Expected work:

- accept old `assetType`;
- write canonical `category`;
- update Book filters and labels;
- update Book import/export tests.

### Slice 3: WorldBook Source Link Normalization

Update source-link schema and WorldBook UI.

Expected work:

- accept old `usage`;
- write canonical `role`;
- update source picker labels;
- add `world_rule` and `reference_material` roles if active linking needs them;
- keep existing source-link behavior stable.

### Slice 4: Encyclopedia Rename

Rename the old knowledge-point family through compatibility wrappers.

Expected work:

- add canonical helpers for encyclopedia entries;
- migrate `knowledgePoints` to `encyclopediaEntries` at normalization/restore time;
- migrate `knowledgePointIds` to `encyclopediaEntryIds` in role profiles and World Packs;
- update Chat, Map, Calendar, Contacts, WorldBook, and prompt copy;
- keep old helper names temporarily as wrappers if needed by untouched tests or components.

### Slice 5: Documentation And Tests

Update product docs and regression coverage.

Expected work:

- update module glossary and WorldBook/Book specs after implementation;
- update tests that assert old labels or field names;
- add a restore test for old saves using `knowledgePoints`, `assetType`, and `usage`.

## 8. Non-Goals

This cleanup does not include:

- building the K-pop worldview itself;
- adding a new standalone WorldBook app;
- changing World Pack activation behavior;
- changing prompt-budget or retrieval strategy;
- deleting old compatibility fields without migration tests;
- turning Book into WorldBook activation;
- turning encyclopedia entries into app business records.

## 9. Acceptance Criteria

The naming cleanup is ready for implementation planning when:

1. Book categories use one canonical vocabulary in UI and backend writes.
2. WorldBook source roles use one canonical vocabulary in UI and backend writes.
3. The old knowledge-point system has a canonical encyclopedia name in user copy and new helper APIs.
4. Existing saves and imports using old names still load.
5. Tests cover alias migration for Book assets, WorldBook source links, role bindings, World Packs, and Chat/runtime world-context compilation.
6. Product docs no longer introduce new user-facing `知识点 / Knowledge point` language for this layer.

## 10. Relationship To Built-In K-Pop Worldview

The K-pop worldview should be authored after this cleanup design is accepted.

The first built-in worldview can then use the canonical structure:

- Book `category: 'worldview'` for the broad modern entertainment-industry world premise;
- Book/WorldBook `role: 'main_worldview'` when activated as the active root world;
- `encyclopedia` entries for industry terms, agencies, broadcast systems, fandom economy, trainee systems, chart mechanics, and media norms;
- `world_rule` entries for safety, privacy, social consequence, and genre boundaries;
- optional `profile_template` material for idols, trainees, managers, producers, reporters, fans, staff, and public figures.

This keeps the worldview broad enough for different user personas: small-company trainee, top idol, producer, journalist, investor, staff member, fan community operator, or global star.
