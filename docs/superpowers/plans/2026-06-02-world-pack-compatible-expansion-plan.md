# World Pack Compatible Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 "main worldview plus compatible enabled expansions" chain for WorldBook, World Pack recommendations, App Store world entries, and Chat service candidates.

**Architecture:** Keep Book and WorldBook as the main worldview source path, preserve the legacy single-pack activation API for existing tests and users, and add a parallel multi-pack enablement layer. Pure compatibility/profile logic lives in new focused helpers; stores expose enabled-pack and recommendation state; WorldBook presents AI analysis, recommended expansions, enabled expansions, and all-pack browse without becoming a launcher.

**Tech Stack:** Vue 3, Pinia, Vite, Vitest, Vue Test Utils, existing SchatPhone WorldBook/World Pack helpers.

---

## File Structure

- Create `src/lib/world-pack-compatibility.js`
  - Owns world-profile normalization, pack compatibility-rule normalization, fit scoring, merge-safe preview rows, and recommendation grouping.
  - Has no Vue or Pinia imports.

- Create `src/lib/world-profile-analysis.js`
  - Owns the AI prompt and response parsing for world-profile analysis.
  - Calls through `src/lib/ai.js` only.
  - Returns normalized advisory profile data; it never enables packs.

- Modify `src/lib/world-pack-schema.js`
  - Adds compatibility metadata to normalized packs.
  - Adds built-in expansion packs for school, business-family, and urban mystery trial paths.
  - Keeps existing built-in pack ids stable.

- Modify `src/stores/system.js`
  - Adds persisted `worldProfileAnalysis`, `enabledWorldPackIds`, and `worldPackEnablements`.
  - Adds store APIs for recommendation review and enable/disable.
  - Keeps `activateWorldPack(packId)` as a backward-compatible single-pack path.

- Modify `src/lib/world-interface.js`
  - Exposes enabled expansion counts and pack summaries while preserving `activePack`.

- Modify `src/lib/world-pack-app-bindings.js`
  - Builds App Store/Home world app entries from all enabled packs.
  - Resolves target-app context by route query across enabled packs.

- Modify `src/lib/world-pack-service-accounts.js`
  - Adds a helper to build Chat service candidate rows from multiple packs without losing original pack ids.

- Modify `src/views/WorldBookView.vue`
  - Wires AI profile analysis, recommendation review, pack enable/disable actions, and multi-pack rows into the Pack panel.

- Modify `src/components/worldbook/CurrentWorldPackPanel.vue`
  - Presents Main Worldview, AI World Profile, Recommended Expansions, Enabled Expansions, and All Packs.
  - Uses product copy first: "adds App Store entries", "adds service accounts", "needs dedicated app".

- Modify Chat Services surfaces only if they currently read `getActiveWorldPack()` directly for candidates.
  - Expected file: `src/views/ChatDirectoryView.vue`.
  - The scope is to list candidates from enabled packs while keeping join/edit/reset ownership in Chat Services.

- Modify tests:
  - `tests/world-pack-compatibility.test.js`
  - `tests/world-profile-analysis.test.js`
  - `tests/world-pack-schema.test.js`
  - `tests/system-world-pack.test.js`
  - `tests/world-interface.test.js`
  - `tests/world-pack-app-bindings.test.js`
  - `tests/worldbook-functional-ia.test.js`
  - `tests/app-store-ui.test.js`
  - `tests/chat-service-subscriptions.test.js`

- Sync docs:
  - `docs/roadmap/TODO_ROADMAP.md`
  - `docs/pm/TODO_PM_STATUS_REPORT.md` if this round changes PM-visible status
  - `docs/overview/PROJECT_MASTER_GUIDE.md`
  - `docs/architecture/ARCHITECTURE.md`
  - `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`
  - `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md` if Chat Services candidate behavior changes

---

### Task 1: Pure Compatibility Helper

**Files:**
- Create: `src/lib/world-pack-compatibility.js`
- Test: `tests/world-pack-compatibility.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/world-pack-compatibility.test.js`:

```js
import { describe, expect, test } from 'vitest'
import {
  WORLD_PACK_FIT_STATUS,
  buildWorldPackCompatibilityReview,
  groupWorldPackRecommendations,
  normalizeWorldPackCompatibility,
  normalizeWorldProfile,
} from '../src/lib/world-pack-compatibility'

describe('world pack compatibility', () => {
  test('normalizes an AI-derived world profile', () => {
    const profile = normalizeWorldProfile({
      era: 'Modern',
      settingTraits: ['school', 'entertainment', 'school'],
      realism: 'realistic',
      socialRoles: ['student', 'fan'],
      economyTraits: ['ordinary'],
      technologyLevel: 'real_world',
      confidence: 'HIGH',
      evidence: ['mentions a campus', 'uses real social media'],
    })

    expect(profile).toMatchObject({
      era: 'modern',
      settingTraits: ['school', 'entertainment'],
      realism: 'realistic',
      socialRoles: ['student', 'fan'],
      economyTraits: ['ordinary'],
      technologyLevel: 'real_world',
      confidence: 'high',
      evidence: ['mentions a campus', 'uses real social media'],
    })
  })

  test('classifies recommended, adaptable, needs-context, conflicting, and unsupported packs', () => {
    const worldProfile = normalizeWorldProfile({
      era: 'modern',
      settingTraits: ['school'],
      realism: 'realistic',
      socialRoles: ['student'],
      economyTraits: ['ordinary'],
      technologyLevel: 'real_world',
      confidence: 'high',
    })

    const recommended = buildWorldPackCompatibilityReview({
      pack: {
        id: 'school_life',
        name: 'School life',
        compatibility: {
          recommended: { settingTraits: ['school'], socialRoles: ['student'] },
        },
      },
      worldProfile,
    })
    const adaptable = buildWorldPackCompatibilityReview({
      pack: {
        id: 'fan_culture',
        name: 'Fan culture',
        compatibility: {
          recommended: { era: ['modern'], settingTraits: ['entertainment'] },
          adaptable: { settingTraits: ['school'] },
        },
      },
      worldProfile,
    })
    const needsContext = buildWorldPackCompatibilityReview({
      pack: {
        id: 'urban_mystery',
        name: 'Urban mystery',
        compatibility: {
          requiresConfirmation: { realism: ['supernatural'] },
          recommended: { era: ['modern'] },
        },
      },
      worldProfile,
    })
    const conflicting = buildWorldPackCompatibilityReview({
      pack: {
        id: 'survival_city',
        name: 'Survival city',
        compatibility: {
          conflicts: { economyTraits: ['ordinary'] },
        },
      },
      worldProfile,
    })
    const unsupported = buildWorldPackCompatibilityReview({
      pack: {
        id: 'black_market',
        name: 'Black market',
        supportState: 'unsupported',
        unsupportedReason: 'needs_dedicated_app',
      },
      worldProfile,
    })

    expect(recommended.fitStatus).toBe(WORLD_PACK_FIT_STATUS.RECOMMENDED)
    expect(adaptable.fitStatus).toBe(WORLD_PACK_FIT_STATUS.ADAPTABLE)
    expect(needsContext.fitStatus).toBe(WORLD_PACK_FIT_STATUS.NEEDS_CONTEXT)
    expect(conflicting.fitStatus).toBe(WORLD_PACK_FIT_STATUS.CONFLICTING)
    expect(unsupported.fitStatus).toBe(WORLD_PACK_FIT_STATUS.UNSUPPORTED)
    expect(unsupported.enableable).toBe(false)
  })

  test('groups recommendations without hiding supported packs', () => {
    const grouped = groupWorldPackRecommendations([
      { packId: 'a', fitStatus: 'recommended' },
      { packId: 'b', fitStatus: 'conflicting' },
      { packId: 'c', fitStatus: 'adaptable' },
      { packId: 'd', fitStatus: 'unsupported' },
    ])

    expect(grouped.recommended.map((item) => item.packId)).toEqual(['a'])
    expect(grouped.adaptable.map((item) => item.packId)).toEqual(['c'])
    expect(grouped.conflicting.map((item) => item.packId)).toEqual(['b'])
    expect(grouped.unsupported.map((item) => item.packId)).toEqual(['d'])
    expect(grouped.browseable.map((item) => item.packId)).toEqual(['a', 'c', 'b'])
  })
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
npm.cmd test -- tests/world-pack-compatibility.test.js
```

Expected: fail because `src/lib/world-pack-compatibility.js` does not exist.

- [ ] **Step 3: Add the pure helper**

Create `src/lib/world-pack-compatibility.js` with these exports:

```js
export const WORLD_PACK_FIT_STATUS = Object.freeze({
  RECOMMENDED: 'recommended',
  ADAPTABLE: 'adaptable',
  NEEDS_CONTEXT: 'needs_context',
  CONFLICTING: 'conflicting',
  UNSUPPORTED: 'unsupported',
})

const FIT_ORDER = [
  WORLD_PACK_FIT_STATUS.RECOMMENDED,
  WORLD_PACK_FIT_STATUS.ADAPTABLE,
  WORLD_PACK_FIT_STATUS.NEEDS_CONTEXT,
  WORLD_PACK_FIT_STATUS.CONFLICTING,
  WORLD_PACK_FIT_STATUS.UNSUPPORTED,
]

const WORLD_PROFILE_FIELDS = [
  'era',
  'settingTraits',
  'realism',
  'socialRoles',
  'economyTraits',
  'technologyLevel',
]

const normalizeText = (value, fallback = '', maxLength = 500) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return fallback
  return text.slice(0, maxLength)
}

const normalizeId = (value, fallback = '') => {
  const text = normalizeText(value, fallback, 120).toLowerCase()
  const normalized = text.replace(/[^a-z0-9_:-]+/g, '_').replace(/^_+|_+$/g, '')
  return normalized || fallback
}

const normalizeStringList = (value, maxLength = 80) => {
  const source = Array.isArray(value) ? value : value ? [value] : []
  const seen = new Set()
  const result = []
  source.forEach((item) => {
    const normalized = normalizeId(item, '')
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    result.push(normalized.slice(0, maxLength))
  })
  return result
}

const normalizeConfidence = (value) => {
  const normalized = normalizeId(value, 'low')
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') return normalized
  return 'low'
}

const normalizeTraitCondition = (value = {}) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(
    WORLD_PROFILE_FIELDS.map((field) => [field, normalizeStringList(source[field])]).filter(
      ([, items]) => items.length > 0,
    ),
  )
}

const countMatches = (worldProfile, condition = {}) => {
  const matched = []
  const missing = []
  Object.entries(condition).forEach(([field, requiredValues]) => {
    const profileValues = Array.isArray(worldProfile[field])
      ? worldProfile[field]
      : normalizeStringList(worldProfile[field])
    requiredValues.forEach((value) => {
      if (profileValues.includes(value)) matched.push(`${field}:${value}`)
      else missing.push(`${field}:${value}`)
    })
  })
  return { matched, missing }
}

export const normalizeWorldProfile = (raw = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    era: normalizeId(source.era, 'unknown'),
    settingTraits: normalizeStringList(source.settingTraits),
    realism: normalizeId(source.realism, 'unknown'),
    socialRoles: normalizeStringList(source.socialRoles),
    economyTraits: normalizeStringList(source.economyTraits),
    technologyLevel: normalizeId(source.technologyLevel, 'unknown'),
    confidence: normalizeConfidence(source.confidence),
    evidence: normalizeStringList(source.evidence, 220).slice(0, 8),
    analyzedAt: Number.isFinite(Number(source.analyzedAt)) ? Math.max(0, Math.floor(Number(source.analyzedAt))) : 0,
  }
}

export const normalizeWorldPackCompatibility = (raw = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    required: normalizeTraitCondition(source.required),
    recommended: normalizeTraitCondition(source.recommended),
    adaptable: normalizeTraitCondition(source.adaptable),
    requiresConfirmation: normalizeTraitCondition(source.requiresConfirmation),
    conflicts: normalizeTraitCondition(source.conflicts),
  }
}

export const buildWorldPackCompatibilityReview = ({ pack = {}, worldProfile = {} } = {}) => {
  const normalizedProfile = normalizeWorldProfile(worldProfile)
  const compatibility = normalizeWorldPackCompatibility(pack.compatibility)
  const supportState = normalizeId(pack.supportState, 'supported')
  const unsupportedReason = normalizeId(pack.unsupportedReason, '')
  const required = countMatches(normalizedProfile, compatibility.required)
  const recommended = countMatches(normalizedProfile, compatibility.recommended)
  const adaptable = countMatches(normalizedProfile, compatibility.adaptable)
  const needsContext = countMatches(normalizedProfile, compatibility.requiresConfirmation)
  const conflicts = countMatches(normalizedProfile, compatibility.conflicts)

  let fitStatus = WORLD_PACK_FIT_STATUS.ADAPTABLE
  if (supportState === 'unsupported' || unsupportedReason) {
    fitStatus = WORLD_PACK_FIT_STATUS.UNSUPPORTED
  } else if (conflicts.matched.length > 0) {
    fitStatus = WORLD_PACK_FIT_STATUS.CONFLICTING
  } else if (required.missing.length > 0 || needsContext.missing.length > 0) {
    fitStatus = WORLD_PACK_FIT_STATUS.NEEDS_CONTEXT
  } else if (recommended.matched.length > 0 && recommended.missing.length === 0) {
    fitStatus = WORLD_PACK_FIT_STATUS.RECOMMENDED
  } else if (adaptable.matched.length > 0 || recommended.matched.length > 0) {
    fitStatus = WORLD_PACK_FIT_STATUS.ADAPTABLE
  }

  const reasons = [
    ...recommended.matched.map((item) => `matches ${item}`),
    ...adaptable.matched.map((item) => `can adapt through ${item}`),
    ...required.missing.map((item) => `missing required ${item}`),
    ...needsContext.missing.map((item) => `needs confirmation for ${item}`),
    ...conflicts.matched.map((item) => `conflicts with ${item}`),
  ]

  return {
    packId: normalizeId(pack.id, ''),
    packTitle: normalizeText(pack.title || pack.name || pack.id, 'World Pack', 120),
    packName: normalizeText(pack.name || pack.title || pack.id, 'World Pack', 120),
    fitStatus,
    enableable: fitStatus !== WORLD_PACK_FIT_STATUS.UNSUPPORTED,
    unsupportedReason: fitStatus === WORLD_PACK_FIT_STATUS.UNSUPPORTED ? unsupportedReason || 'unsupported' : '',
    score:
      recommended.matched.length * 4 +
      adaptable.matched.length * 2 -
      required.missing.length * 3 -
      needsContext.missing.length * 2 -
      conflicts.matched.length * 5,
    reasons: reasons.slice(0, 12),
    required,
    recommended,
    adaptable,
    needsContext,
    conflicts,
  }
}

export const groupWorldPackRecommendations = (reviews = []) => {
  const normalized = (Array.isArray(reviews) ? reviews : [])
    .filter((item) => item && typeof item === 'object')
    .sort((a, b) => FIT_ORDER.indexOf(a.fitStatus) - FIT_ORDER.indexOf(b.fitStatus) || (b.score || 0) - (a.score || 0))

  const groups = {
    recommended: [],
    adaptable: [],
    needsContext: [],
    conflicting: [],
    unsupported: [],
    browseable: [],
  }

  normalized.forEach((review) => {
    if (review.fitStatus === WORLD_PACK_FIT_STATUS.RECOMMENDED) groups.recommended.push(review)
    else if (review.fitStatus === WORLD_PACK_FIT_STATUS.ADAPTABLE) groups.adaptable.push(review)
    else if (review.fitStatus === WORLD_PACK_FIT_STATUS.NEEDS_CONTEXT) groups.needsContext.push(review)
    else if (review.fitStatus === WORLD_PACK_FIT_STATUS.CONFLICTING) groups.conflicting.push(review)
    else groups.unsupported.push(review)
  })

  groups.browseable = [
    ...groups.recommended,
    ...groups.adaptable,
    ...groups.needsContext,
    ...groups.conflicting,
  ]

  return groups
}
```

- [ ] **Step 4: Verify the pure helper passes**

Run:

```bash
npm.cmd test -- tests/world-pack-compatibility.test.js
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/world-pack-compatibility.js tests/world-pack-compatibility.test.js
git commit -m "feat: add world pack compatibility scoring"
```

---

### Task 2: World Profile AI Analysis Helper

**Files:**
- Create: `src/lib/world-profile-analysis.js`
- Test: `tests/world-profile-analysis.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/world-profile-analysis.test.js`:

```js
import { describe, expect, test, vi } from 'vitest'
import {
  analyzeWorldProfileWithAI,
  buildWorldProfileAnalysisPrompt,
  parseWorldProfileAnalysisResponse,
} from '../src/lib/world-profile-analysis'

describe('world profile analysis', () => {
  test('builds a constrained prompt from active world context', () => {
    const prompt = buildWorldProfileAnalysisPrompt({
      worldContextText: 'A modern school world with idol fan culture and ordinary smartphones.',
    })

    expect(prompt).toContain('Return JSON only')
    expect(prompt).toContain('era')
    expect(prompt).toContain('settingTraits')
    expect(prompt).toContain('modern school world')
    expect(prompt).not.toContain('enable any pack')
  })

  test('parses assistant JSON into a normalized world profile', () => {
    const profile = parseWorldProfileAnalysisResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              era: 'modern',
              settingTraits: ['school', 'entertainment'],
              realism: 'realistic',
              socialRoles: ['student', 'fan'],
              economyTraits: ['ordinary'],
              technologyLevel: 'real_world',
              confidence: 'high',
              evidence: ['campus and fan accounts are mentioned'],
            }),
          },
        },
      ],
    })

    expect(profile).toMatchObject({
      era: 'modern',
      settingTraits: ['school', 'entertainment'],
      confidence: 'high',
      evidence: ['campus_and_fan_accounts_are_mentioned'],
    })
  })

  test('calls AI through the shared AI seam and never enables packs', async () => {
    const callAi = vi.fn().mockResolvedValue(
      JSON.stringify({
        era: 'modern',
        settingTraits: ['school'],
        realism: 'realistic',
        confidence: 'medium',
      }),
    )

    const result = await analyzeWorldProfileWithAI({
      worldContextText: 'A realistic campus world.',
      settings: { api: { model: 'test' } },
      callAi,
    })

    expect(result.ok).toBe(true)
    expect(result.profile).toMatchObject({
      era: 'modern',
      settingTraits: ['school'],
      confidence: 'medium',
    })
    expect(callAi).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining('You classify SchatPhone world context'),
      }),
    )
  })
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
npm.cmd test -- tests/world-profile-analysis.test.js
```

Expected: fail because `src/lib/world-profile-analysis.js` does not exist.

- [ ] **Step 3: Add the AI helper**

Create `src/lib/world-profile-analysis.js`:

```js
import { callAI as defaultCallAI } from './ai'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from './chat-response'
import { normalizeWorldProfile } from './world-pack-compatibility'

const normalizeText = (value, fallback = '', maxLength = 6000) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return fallback
  return text.slice(0, maxLength)
}

const parsePayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null
  const text = extractAssistantPayloadText(response)
  const parsed = text ? parseAssistantJsonPayload(text) : null
  return parsed || response
}

export const buildWorldProfileAnalysisPrompt = ({ worldContextText = '' } = {}) =>
  [
    'Analyze the active SchatPhone main worldview so the product can recommend optional compatible World Packs.',
    'Return JSON only with this shape:',
    '{"era":"","settingTraits":[],"realism":"","socialRoles":[],"economyTraits":[],"technologyLevel":"","confidence":"high|medium|low","evidence":[]}',
    'Use concise lowercase English trait ids such as modern, school, entertainment, business_family, urban, supernatural, realistic, resource_scarce, real_world.',
    'Do not enable any pack, create records, create apps, create routes, or make product decisions. This is advisory classification only.',
    'World context:',
    normalizeText(worldContextText, '(empty)', 6000),
  ].join('\n')

export const parseWorldProfileAnalysisResponse = (response) => {
  const payload = parsePayload(response)
  return normalizeWorldProfile(payload || {})
}

export const analyzeWorldProfileWithAI = async ({
  worldContextText = '',
  settings = {},
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const prompt = buildWorldProfileAnalysisPrompt({ worldContextText })
  const response = await callAi({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt:
      'You classify SchatPhone world context into advisory compatibility traits. Return valid JSON only.',
    settings,
    signal,
  })
  const profile = parseWorldProfileAnalysisResponse(response)
  return {
    ok: Boolean(profile.confidence),
    profile,
    rawPayload: response,
  }
}
```

- [ ] **Step 4: Verify the helper passes**

Run:

```bash
npm.cmd test -- tests/world-profile-analysis.test.js
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/world-profile-analysis.js tests/world-profile-analysis.test.js
git commit -m "feat: add world profile analysis helper"
```

---

### Task 3: Schema Metadata And Trial Expansion Packs

**Files:**
- Modify: `src/lib/world-pack-schema.js`
- Test: `tests/world-pack-schema.test.js`

- [ ] **Step 1: Add failing schema assertions**

Append these tests inside `describe('world pack schema', () => { ... })` in `tests/world-pack-schema.test.js`:

```js
  test('normalizes world pack compatibility metadata', () => {
    const pack = normalizeWorldPack({
      id: 'school_life',
      title: 'School Life',
      supportState: 'supported',
      compatibility: {
        recommended: {
          era: ['modern'],
          settingTraits: ['school'],
          socialRoles: ['student'],
        },
        conflicts: {
          economyTraits: ['resource_scarce'],
        },
      },
    })

    expect(pack).toMatchObject({
      id: 'school_life',
      supportState: 'supported',
      unsupportedReason: '',
      compatibility: {
        recommended: {
          era: ['modern'],
          settingTraits: ['school'],
          socialRoles: ['student'],
        },
        conflicts: {
          economyTraits: ['resource_scarce'],
        },
      },
    })
  })

  test('includes trial compatible expansion packs', () => {
    const packs = normalizeWorldPacks([])
    expect(packs.map((pack) => pack.id)).toEqual(
      expect.arrayContaining(['school_life', 'business_family', 'urban_mystery']),
    )
    expect(packs.find((pack) => pack.id === 'school_life')).toMatchObject({
      supportState: 'supported',
      appBindings: expect.arrayContaining([
        expect.objectContaining({
          archetype: 'reservation',
          moduleKey: 'calendar',
        }),
      ]),
    })
    expect(packs.find((pack) => pack.id === 'urban_mystery')).toMatchObject({
      compatibility: {
        requiresConfirmation: {
          realism: ['supernatural'],
        },
      },
    })
  })
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
npm.cmd test -- tests/world-pack-schema.test.js
```

Expected: fail because packs do not have compatibility metadata yet.

- [ ] **Step 3: Add schema fields**

In `src/lib/world-pack-schema.js`, import the compatibility normalizer:

```js
import { normalizeWorldPackCompatibility } from './world-pack-compatibility'
```

Add support-state helpers near the existing activation-state helpers:

```js
const WORLD_PACK_SUPPORT_STATES = new Set(['supported', 'unsupported'])

const normalizeSupportState = (value) => {
  const normalized = normalizeInlineText(value, 'supported', 80).toLowerCase()
  return WORLD_PACK_SUPPORT_STATES.has(normalized) ? normalized : 'supported'
}
```

Add these fields to the object returned by `normalizeWorldPack()`:

```js
    supportState: normalizeSupportState(source.supportState),
    unsupportedReason: normalizeId(source.unsupportedReason, ''),
    compatibility: normalizeWorldPackCompatibility(source.compatibility),
```

- [ ] **Step 4: Add built-in trial expansions**

In `BUILT_IN_WORLD_PACKS`, add these objects before `survival_city` so modern/ordinary expansions are easy to find:

```js
  {
    id: 'school_life',
    title: '校园生活拓展',
    name: 'School life expansion',
    description: 'Adds campus schedules, class notices, and school-service context to a modern or near-future main worldview.',
    source: 'built_in',
    state: 'available',
    supportState: 'supported',
    compatibility: {
      recommended: {
        era: ['modern'],
        settingTraits: ['school'],
        socialRoles: ['student'],
        technologyLevel: ['real_world'],
      },
      adaptable: {
        settingTraits: ['urban', 'entertainment'],
      },
      conflicts: {
        economyTraits: ['resource_scarce'],
      },
    },
    terminology: {
      reservation: '课表',
      publication: '校内公告',
    },
    appBindings: [
      {
        id: 'school_schedule_board',
        archetype: 'reservation',
        title: '课表看板',
        moduleKey: 'calendar',
        route: '/calendar',
        description: 'Connects campus schedules to Calendar while Calendar keeps confirmed events.',
      },
      {
        id: 'school_bulletin_feed',
        archetype: 'publication_feed',
        title: '校内公告',
        moduleKey: 'chat',
        route: '/chat-contacts',
        description: 'A school bulletin entry for reviewed service candidates and notices.',
      },
    ],
    serviceAccountTemplates: [
      {
        id: 'school_affairs_office',
        title: '学生事务处',
        category: 'publication',
        description: 'Publishes campus notices after the user joins it in Chat Services.',
        linkedAppBindingId: 'school_bulletin_feed',
      },
    ],
  },
  {
    id: 'business_family',
    title: '商业财阀拓展',
    name: 'Business family expansion',
    description: 'Adds family-office, board-calendar, and resource hierarchy context to modern or future social worlds.',
    source: 'built_in',
    state: 'available',
    supportState: 'supported',
    compatibility: {
      recommended: {
        era: ['modern', 'future'],
        settingTraits: ['business_family', 'corporate', 'urban'],
        economyTraits: ['luxury', 'corporate_controlled'],
      },
      adaptable: {
        settingTraits: ['school', 'entertainment'],
      },
    },
    terminology: {
      reservation: '会议日程',
      publication: '家族办公室',
    },
    appBindings: [
      {
        id: 'business_board_calendar',
        archetype: 'reservation',
        title: '董事日程',
        moduleKey: 'calendar',
        route: '/calendar',
        description: 'Adds board and family-office schedule framing while Calendar keeps event truth.',
      },
      {
        id: 'business_office_feed',
        archetype: 'publication_feed',
        title: '家族办公室',
        moduleKey: 'chat',
        route: '/chat-contacts',
        description: 'A family-office style feed for service-account candidates.',
      },
    ],
    serviceAccountTemplates: [
      {
        id: 'family_office_channel',
        title: '家族办公室',
        category: 'publication',
        description: 'Publishes office notices and resource reminders after the user joins it in Chat Services.',
        linkedAppBindingId: 'business_office_feed',
      },
    ],
  },
  {
    id: 'urban_mystery',
    title: '都市怪谈拓展',
    name: 'Urban mystery expansion',
    description: 'Adds supernatural rumor and investigation context to an urban main worldview after user confirmation.',
    source: 'built_in',
    state: 'available',
    supportState: 'supported',
    compatibility: {
      recommended: {
        era: ['modern'],
        settingTraits: ['urban', 'investigation'],
      },
      requiresConfirmation: {
        realism: ['supernatural'],
      },
      adaptable: {
        settingTraits: ['school', 'business_family', 'entertainment'],
      },
    },
    terminology: {
      publication: '怪谈线索',
      transit: '异常地点',
    },
    appBindings: [
      {
        id: 'urban_rumor_feed',
        archetype: 'publication_feed',
        title: '怪谈线索',
        moduleKey: 'chat',
        route: '/chat-contacts',
        description: 'A rumor-feed style entry for reviewed service candidates.',
      },
      {
        id: 'urban_incident_map',
        archetype: 'transit',
        title: '异常地点',
        moduleKey: 'map',
        route: '/map',
        description: 'Adds incident-location framing while Map keeps route and trip truth.',
      },
    ],
    serviceAccountTemplates: [
      {
        id: 'urban_rumor_channel',
        title: '匿名怪谈投稿箱',
        category: 'publication',
        description: 'Publishes reviewed rumor prompts after the user joins it in Chat Services.',
        linkedAppBindingId: 'urban_rumor_feed',
      },
    ],
  },
```

- [ ] **Step 5: Verify schema tests**

Run:

```bash
npm.cmd test -- tests/world-pack-schema.test.js
```

Expected: pass after updating any existing exact built-in pack list expectations to include the new pack ids in sorted order.

- [ ] **Step 6: Commit**

```bash
git add src/lib/world-pack-schema.js tests/world-pack-schema.test.js
git commit -m "feat: add compatible world pack metadata"
```

---

### Task 4: Store State For World Profile And Enabled Expansions

**Files:**
- Modify: `src/stores/system.js`
- Test: `tests/system-world-pack.test.js`

- [ ] **Step 1: Add failing store tests**

Append these tests inside `describe('system world pack store', () => { ... })`:

```js
  test('stores world profile analysis and recommends compatible packs', () => {
    const store = useSystemStore()

    store.setWorldProfileAnalysis({
      era: 'modern',
      settingTraits: ['school'],
      realism: 'realistic',
      socialRoles: ['student'],
      economyTraits: ['ordinary'],
      technologyLevel: 'real_world',
      confidence: 'high',
      evidence: ['campus setting'],
    })

    const review = store.buildWorldPackRecommendationReview()

    expect(store.user.worldProfileAnalysis).toMatchObject({
      era: 'modern',
      settingTraits: ['school'],
      confidence: 'high',
    })
    expect(review.grouped.recommended.map((item) => item.packId)).toContain('school_life')
    expect(review.grouped.adaptable.map((item) => item.packId)).toContain('business_family')
    expect(review.grouped.unsupported.every((item) => item.enableable === false)).toBe(true)
  })

  test('enables and disables multiple compatible world packs without auto-joining services', () => {
    const store = useSystemStore()

    const school = store.enableWorldPack('school_life')
    const business = store.enableWorldPack('business_family')

    expect(school.ok).toBe(true)
    expect(business.ok).toBe(true)
    expect(store.user.enabledWorldPackIds).toEqual(['school_life', 'business_family'])
    expect(store.listEnabledWorldPacks().map((pack) => pack.id)).toEqual(['school_life', 'business_family'])
    expect(store.user.worldPackEnablements.school_life.reviewSnapshot.summary.appBindingCount).toBeGreaterThan(0)

    const disabled = store.disableWorldPack('school_life')

    expect(disabled.ok).toBe(true)
    expect(store.user.enabledWorldPackIds).toEqual(['business_family'])
    expect(store.listEnabledWorldPacks().map((pack) => pack.id)).toEqual(['business_family'])
  })

  test('legacy activateWorldPack remains a single-pack path and seeds enabled expansions', () => {
    const store = useSystemStore()

    expect(store.activateWorldPack('survival_city').ok).toBe(true)

    expect(store.user.activeWorldPackId).toBe('survival_city')
    expect(store.user.enabledWorldPackIds).toEqual(['survival_city'])
    expect(store.listEnabledWorldPacks().map((pack) => pack.id)).toEqual(['survival_city'])
  })
```

- [ ] **Step 2: Run the failing store tests**

Run:

```bash
npm.cmd test -- tests/system-world-pack.test.js
```

Expected: fail because the new store APIs do not exist.

- [ ] **Step 3: Import compatibility helpers**

In `src/stores/system.js`, add:

```js
import {
  buildWorldPackCompatibilityReview,
  groupWorldPackRecommendations,
  normalizeWorldProfile,
} from '../lib/world-pack-compatibility'
```

- [ ] **Step 4: Add normalized persisted fields**

In `normalizeUserWorldKernel()`, add:

```js
    worldProfileAnalysis: normalizeWorldProfile(source.worldProfileAnalysis),
    enabledWorldPackIds: normalizeWorldPackIdList(source.enabledWorldPackIds),
    worldPackEnablements: normalizeWorldPackEnablements(source.worldPackEnablements),
```

Near the other local normalizers in `system.js`, add:

```js
const normalizeWorldPackIdList = (value = []) => {
  const seen = new Set()
  const result = []
  ;(Array.isArray(value) ? value : []).forEach((item) => {
    const id = typeof item === 'string' ? item.trim() : ''
    if (!id || seen.has(id)) return
    seen.add(id)
    result.push(id)
  })
  return result.slice(0, 24)
}

const normalizeWorldPackEnablements = (value = {}) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(
    Object.entries(source)
      .map(([packId, raw]) => {
        const id = typeof packId === 'string' ? packId.trim() : ''
        const enablement = raw && typeof raw === 'object' ? raw : {}
        if (!id) return null
        return [
          id,
          {
            packId: id,
            enabledAt: toInt(enablement.enabledAt, 0),
            fitStatus: typeof enablement.fitStatus === 'string' ? enablement.fitStatus : '',
            reviewSnapshot:
              enablement.reviewSnapshot && typeof enablement.reviewSnapshot === 'object'
                ? { ...enablement.reviewSnapshot }
                : {},
          },
        ]
      })
      .filter(Boolean),
  )
}
```

In the default `user` object, add:

```js
    worldProfileAnalysis: normalizeWorldProfile({}),
    enabledWorldPackIds: [],
    worldPackEnablements: {},
```

- [ ] **Step 5: Add store APIs**

Near the existing world pack store functions, add:

```js
  const setWorldProfileAnalysis = (profile = {}) => {
    user.worldProfileAnalysis = normalizeWorldProfile({
      ...profile,
      analyzedAt: Date.now(),
    })
    return { ...user.worldProfileAnalysis }
  }

  const listEnabledWorldPacks = () => {
    const ids = normalizeWorldPackIdList(user.enabledWorldPackIds)
    if (ids.length === 0 && user.activeWorldPackId && user.activeWorldPackId !== DEFAULT_WORLD_PACK_ID) {
      return [getWorldPackById(user.activeWorldPackId)].filter(Boolean)
    }
    return ids.map((id) => getWorldPackById(id)).filter(Boolean)
  }

  const buildWorldPackRecommendationReview = () => {
    const worldProfile = normalizeWorldProfile(user.worldProfileAnalysis)
    const reviews = listWorldPacks()
      .filter((pack) => pack.id !== DEFAULT_WORLD_PACK_ID)
      .map((pack) => buildWorldPackCompatibilityReview({ pack, worldProfile }))
    return {
      worldProfile,
      reviews,
      grouped: groupWorldPackRecommendations(reviews),
    }
  }

  const buildWorldPackEnablementReview = (packId = '') => {
    const activationReview = buildWorldPackActivationReview(packId)
    const pack = getWorldPackById(packId)
    const recommendation = buildWorldPackCompatibilityReview({
      pack: pack || {},
      worldProfile: user.worldProfileAnalysis,
    })
    return {
      packId: pack?.id || packId,
      blocked: Boolean(activationReview?.blocked) || !recommendation.enableable,
      activationReview,
      recommendation,
    }
  }

  const enableWorldPack = (packId = '') => {
    const pack = getWorldPackById(packId)
    if (!pack) return { ok: false, reason: 'not_found', pack: null, review: null }
    const review = buildWorldPackEnablementReview(pack.id)
    if (review.blocked) {
      return {
        ok: false,
        reason: review.recommendation?.enableable === false ? 'unsupported' : 'blocked',
        pack,
        review,
      }
    }
    const ids = normalizeWorldPackIdList(user.enabledWorldPackIds)
    if (!ids.includes(pack.id)) ids.push(pack.id)
    user.enabledWorldPackIds = ids
    user.worldPackEnablements = normalizeWorldPackEnablements({
      ...user.worldPackEnablements,
      [pack.id]: {
        packId: pack.id,
        enabledAt: Date.now(),
        fitStatus: review.recommendation.fitStatus,
        reviewSnapshot: {
          summary: { ...(review.activationReview?.summary || {}) },
          effectRows: Array.isArray(review.activationReview?.effectRows)
            ? review.activationReview.effectRows.map((row) => ({ ...row }))
            : [],
          recommendation: {
            fitStatus: review.recommendation.fitStatus,
            reasons: [...(review.recommendation.reasons || [])],
          },
        },
      },
    })
    normalizeCurrentHomeWidgetPages()
    return { ok: true, reason: 'enabled', pack, review }
  }

  const disableWorldPack = (packId = '') => {
    const id = typeof packId === 'string' ? packId.trim() : ''
    if (!id) return { ok: false, reason: 'not_found' }
    const before = normalizeWorldPackIdList(user.enabledWorldPackIds)
    user.enabledWorldPackIds = before.filter((item) => item !== id)
    const nextEnablements = { ...normalizeWorldPackEnablements(user.worldPackEnablements) }
    delete nextEnablements[id]
    user.worldPackEnablements = nextEnablements
    normalizeCurrentHomeWidgetPages()
    return { ok: before.includes(id), reason: before.includes(id) ? 'disabled' : 'not_enabled' }
  }
```

Update `activateWorldPack()` after `user.activeWorldPackId = pack.id`:

```js
    user.enabledWorldPackIds = pack.id === DEFAULT_WORLD_PACK_ID ? [] : [pack.id]
    user.worldPackEnablements = pack.id === DEFAULT_WORLD_PACK_ID
      ? {}
      : normalizeWorldPackEnablements({
          [pack.id]: {
            packId: pack.id,
            enabledAt: Date.now(),
            fitStatus: 'recommended',
            reviewSnapshot: {
              summary: { ...review.summary },
              effectRows: review.effectRows.map((row) => ({ ...row })),
            },
          },
        })
```

Return the new APIs from the store.

- [ ] **Step 6: Include fields in backup and restore**

Where backup serializes `system.user`, include:

```js
          worldProfileAnalysis: { ...normalizeWorldProfile(user.worldProfileAnalysis) },
          enabledWorldPackIds: normalizeWorldPackIdList(user.enabledWorldPackIds),
          worldPackEnablements: normalizeWorldPackEnablements(user.worldPackEnablements),
```

Where restore applies normalized world kernel state, assign:

```js
    user.worldProfileAnalysis = normalizedWorldKernel.worldProfileAnalysis
    user.enabledWorldPackIds = normalizedWorldKernel.enabledWorldPackIds
    user.worldPackEnablements = normalizedWorldKernel.worldPackEnablements
```

- [ ] **Step 7: Verify store tests**

Run:

```bash
npm.cmd test -- tests/system-world-pack.test.js
```

Expected: pass after updating exact built-in list expectations for the new pack ids.

- [ ] **Step 8: Commit**

```bash
git add src/stores/system.js tests/system-world-pack.test.js
git commit -m "feat: store enabled world pack expansions"
```

---

### Task 5: Multi-Pack Consumer Helpers

**Files:**
- Modify: `src/lib/world-interface.js`
- Modify: `src/lib/world-pack-app-bindings.js`
- Modify: `src/lib/world-pack-service-accounts.js`
- Test: `tests/world-interface.test.js`
- Test: `tests/world-pack-app-bindings.test.js`

- [ ] **Step 1: Add failing world-interface tests**

In `tests/world-interface.test.js`, add `enabledPacks = []` to `createSystemStore()` and implement:

```js
  listEnabledWorldPacks() {
    return enabledPacks
  },
```

Add this test:

```js
  test('exposes enabled expansion packs without replacing the main active pack', () => {
    const systemStore = createSystemStore({
      globalWorldview: 'Modern campus baseline.',
      activePack: {
        id: 'default_world',
        name: 'Default world',
        title: '默认世界',
        state: 'active',
        appBindings: [],
        serviceAccountTemplates: [],
      },
      enabledPacks: [
        {
          id: 'school_life',
          name: 'School life expansion',
          title: '校园生活拓展',
          appBindings: [{ id: 'school_schedule_board' }],
          serviceAccountTemplates: [{ id: 'school_affairs_office' }],
        },
        {
          id: 'business_family',
          name: 'Business family expansion',
          title: '商业财阀拓展',
          appBindings: [{ id: 'business_board_calendar' }],
          serviceAccountTemplates: [],
        },
      ],
    })

    const overview = resolveActiveWorldOverview({ systemStore })

    expect(overview.activePack.id).toBe('default_world')
    expect(overview.enabledWorldPackCount).toBe(2)
    expect(overview.enabledWorldPacks.map((pack) => pack.id)).toEqual(['school_life', 'business_family'])
    expect(overview.worldPackAppBindingCount).toBe(2)
    expect(overview.worldPackServiceTemplateCount).toBe(1)
  })
```

- [ ] **Step 2: Add failing app-binding tests**

In `tests/world-pack-app-bindings.test.js`, add:

```js
  test('builds active world app entries from multiple enabled packs', () => {
    const schoolPack = normalizeWorldPack({
      id: 'school_life',
      name: 'School life expansion',
      appBindings: [
        {
          id: 'school_schedule_board',
          archetype: 'reservation',
          title: 'Campus Schedule',
          moduleKey: 'calendar',
          route: '/calendar',
        },
      ],
    })
    const businessPack = normalizeWorldPack({
      id: 'business_family',
      name: 'Business family expansion',
      appBindings: [
        {
          id: 'business_office_feed',
          archetype: 'publication_feed',
          title: 'Family Office',
          moduleKey: 'chat',
          route: '/chat-contacts',
        },
      ],
    })

    const entries = buildActiveWorldAppEntryRows({
      systemStore: {
        listEnabledWorldPacks: () => [schoolPack, businessPack],
      },
    })

    expect(entries.map((entry) => entry.id)).toEqual([
      'world_app_school_life_school_schedule_board',
      'world_app_business_family_business_office_feed',
    ])
  })

  test('resolves target app context across enabled packs by route query', () => {
    const schoolPack = normalizeWorldPack({
      id: 'school_life',
      appBindings: [
        {
          id: 'school_schedule_board',
          archetype: 'reservation',
          title: 'Campus Schedule',
          moduleKey: 'calendar',
          route: '/calendar',
        },
      ],
    })

    const context = resolveWorldAppUxContext({
      systemStore: {
        listEnabledWorldPacks: () => [schoolPack],
      },
      moduleKey: 'calendar',
      expectedArchetypes: ['reservation'],
      routeQuery: {
        worldPack: 'school_life',
        worldApp: 'school_schedule_board',
      },
    })

    expect(context).toMatchObject({
      packId: 'school_life',
      bindingId: 'school_schedule_board',
      moduleKey: 'calendar',
    })
  })
```

- [ ] **Step 3: Run failing tests**

Run:

```bash
npm.cmd test -- tests/world-interface.test.js tests/world-pack-app-bindings.test.js
```

Expected: fail because multi-pack consumers are not implemented.

- [ ] **Step 4: Update world-interface**

In `src/lib/world-interface.js`, add:

```js
const listEnabledWorldPacksFromStore = (systemStore) => {
  if (typeof systemStore?.listEnabledWorldPacks === 'function') {
    return systemStore.listEnabledWorldPacks()
  }
  const active = resolveActiveWorldPack(systemStore)
  return active && active.id !== DEFAULT_WORLD_PACK_ID ? [active] : []
}

const countPackItems = (packs = [], field = '') =>
  packs.reduce((total, pack) => total + (Array.isArray(pack?.[field]) ? pack[field].length : 0), 0)
```

In both `resolveWorldContextForConsumer()` and `resolveActiveWorldOverview()`, compute:

```js
  const enabledWorldPacks = listEnabledWorldPacksFromStore(systemStore)
```

Then replace the active-pack app/service counts with enabled-pack counts and include:

```js
    enabledWorldPacks,
    enabledWorldPackCount: enabledWorldPacks.length,
    worldPackAppBindingCount: countPackItems(enabledWorldPacks, 'appBindings'),
    worldPackServiceTemplateCount: countPackItems(enabledWorldPacks, 'serviceAccountTemplates'),
```

Keep `activePack` and `worldPackActivationState` unchanged.

- [ ] **Step 5: Update app-binding helper**

In `src/lib/world-pack-app-bindings.js`, add:

```js
const resolveEnabledWorldPacks = (systemStore) => {
  if (typeof systemStore?.listEnabledWorldPacks === 'function') {
    return systemStore.listEnabledWorldPacks()
  }
  const active = resolveActiveWorldPack(systemStore)
  return active ? [active] : []
}

export const buildWorldAppEntryRowsForPacks = ({ packs = [] } = {}) =>
  (Array.isArray(packs) ? packs : []).flatMap((pack) => buildWorldAppEntryRows({ pack }))
```

Change `buildActiveWorldAppEntryRows()` to:

```js
export const buildActiveWorldAppEntryRows = ({ systemStore } = {}) =>
  buildWorldAppEntryRowsForPacks({ packs: resolveEnabledWorldPacks(systemStore) })
```

Change `resolveWorldAppUxContext()` to search the enabled pack list:

```js
  const enabledPacks = resolveEnabledWorldPacks(systemStore)
  const requestedPackId = normalizeQueryValue(routeQuery.worldPack)
  const candidatePacks = requestedPackId
    ? enabledPacks.filter((pack) => normalizeWorldPack(pack).id === requestedPackId)
    : enabledPacks
  for (const pack of candidatePacks) {
    const normalizedPack = normalizeWorldPack(pack)
    const binding = findWorldAppBindingForModule({ pack: normalizedPack, moduleKey, routeQuery })
    if (!binding) continue
    ...
    return context
  }
  return null
```

Reuse the existing context body inside the loop.

- [ ] **Step 6: Update service helper**

In `src/lib/world-pack-service-accounts.js`, add:

```js
export const buildWorldServiceTemplateGenerationRowsForPacks = ({
  packs = [],
  findExistingContact,
} = {}) =>
  (Array.isArray(packs) ? packs : []).flatMap((pack) =>
    buildWorldServiceTemplateGenerationRows({ pack, findExistingContact }),
  )
```

- [ ] **Step 7: Verify consumer tests**

Run:

```bash
npm.cmd test -- tests/world-interface.test.js tests/world-pack-app-bindings.test.js
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/world-interface.js src/lib/world-pack-app-bindings.js src/lib/world-pack-service-accounts.js tests/world-interface.test.js tests/world-pack-app-bindings.test.js
git commit -m "feat: consume enabled world pack expansions"
```

---

### Task 6: WorldBook Compatible Expansion UI

**Files:**
- Modify: `src/views/WorldBookView.vue`
- Modify: `src/components/worldbook/CurrentWorldPackPanel.vue`
- Test: `tests/worldbook-functional-ia.test.js`

- [ ] **Step 1: Add failing UI tests**

Add this test in `tests/worldbook-functional-ia.test.js`:

```js
  test('analyzes a main worldview and lets users enable recommended or browseable packs', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setWorldProfileAnalysis({
      era: 'modern',
      settingTraits: ['school'],
      realism: 'realistic',
      socialRoles: ['student'],
      economyTraits: ['ordinary'],
      technologyLevel: 'real_world',
      confidence: 'high',
      evidence: ['campus setting'],
    })

    const wrapper = await mountWorldBook()
    await wrapper.get('[data-testid="worldbook-panel-tab-pack"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-world-profile"]').text()).toContain('high')
    expect(wrapper.get('[data-testid="worldbook-pack-recommendations"]').text()).toContain('School life expansion')
    expect(wrapper.get('[data-testid="worldbook-pack-all"]').text()).toContain('Business family expansion')

    await wrapper.get('[data-testid="worldbook-enable-pack-school_life"]').trigger('click')
    await nextTick()

    expect(systemStore.user.enabledWorldPackIds).toContain('school_life')
    expect(wrapper.get('[data-testid="worldbook-enabled-expansions"]').text()).toContain('School life expansion')
    expect(wrapper.get('[data-testid="worldbook-current-pack-active-summary"]').text()).toContain('1')

    await wrapper.get('[data-testid="worldbook-enable-pack-business_family"]').trigger('click')
    await nextTick()

    expect(systemStore.user.enabledWorldPackIds).toEqual(['school_life', 'business_family'])

    await wrapper.get('[data-testid="worldbook-disable-pack-school_life"]').trigger('click')
    await nextTick()

    expect(systemStore.user.enabledWorldPackIds).toEqual(['business_family'])
    wrapper.unmount()
  })
```

- [ ] **Step 2: Run the failing UI test**

Run:

```bash
npm.cmd test -- tests/worldbook-functional-ia.test.js
```

Expected: fail because the UI does not expose profile/recommendation/enablement controls.

- [ ] **Step 3: Wire data in WorldBookView**

In `src/views/WorldBookView.vue`, import:

```js
import { analyzeWorldProfileWithAI } from '../lib/world-profile-analysis'
import { buildWorldServiceTemplateGenerationRowsForPacks } from '../lib/world-pack-service-accounts'
```

Replace the active-pack service rows with enabled-pack rows:

```js
const enabledWorldPacks = computed(() => systemStore.listEnabledWorldPacks())

const activeWorldPackServiceTemplateRows = computed(() =>
  buildWorldServiceTemplateGenerationRowsForPacks({
    packs: enabledWorldPacks.value,
    findExistingContact: (packId, templateId) =>
      chatStore.findWorldServiceTemplateContact(packId, templateId),
  }),
)
```

Add:

```js
const worldPackRecommendationReview = computed(() => systemStore.buildWorldPackRecommendationReview())
const worldProfileAnalysisLoading = ref(false)
const worldProfileAnalysisNotice = ref('')

const analyzeWorldForExpansions = async () => {
  if (worldProfileAnalysisLoading.value) return
  worldProfileAnalysisLoading.value = true
  worldProfileAnalysisNotice.value = ''
  try {
    const result = await analyzeWorldProfileWithAI({
      worldContextText: buildWorldAppTemplateContextText(),
      settings: settings.value,
    })
    systemStore.setWorldProfileAnalysis(result.profile)
    systemStore.saveNow()
    pulseSaved(t('世界画像已更新。', 'World profile updated.'))
  } catch (error) {
    worldProfileAnalysisNotice.value = formatApiErrorForUi(
      error,
      t('AI 分析失败，请检查 API 设置。', 'AI analysis failed. Check API settings.'),
    )
  } finally {
    worldProfileAnalysisLoading.value = false
  }
}

const enableWorldPackExpansion = (packId = '') => {
  const result = systemStore.enableWorldPack(packId)
  if (!result.ok) {
    uiNotice.value = result.reason === 'unsupported'
      ? t('这个包需要专门 App，当前版本不能启用。', 'This pack needs a dedicated app and cannot be enabled yet.')
      : t('这个包还有缺失引用，处理后才能启用。', 'This pack has missing references. Fix them before enabling.')
    return
  }
  systemStore.saveNow()
  pulseSaved(t('拓展包已启用。', 'Expansion pack enabled.'))
}

const disableWorldPackExpansion = (packId = '') => {
  const result = systemStore.disableWorldPack(packId)
  if (!result.ok) return
  systemStore.saveNow()
  pulseSaved(t('拓展包已停用。', 'Expansion pack disabled.'))
}
```

Pass the new props/events into `CurrentWorldPackPanel`:

```vue
        :enabled-packs="enabledWorldPacks"
        :world-profile="user.worldProfileAnalysis"
        :recommendation-review="worldPackRecommendationReview"
        :world-profile-loading="worldProfileAnalysisLoading"
        :world-profile-notice="worldProfileAnalysisNotice"
        @analyze-world-profile="analyzeWorldForExpansions"
        @enable-pack="enableWorldPackExpansion"
        @disable-pack="disableWorldPackExpansion"
```

- [ ] **Step 4: Update CurrentWorldPackPanel props and emits**

Add props:

```js
  enabledPacks: {
    type: Array,
    default: () => [],
  },
  worldProfile: {
    type: Object,
    default: null,
  },
  recommendationReview: {
    type: Object,
    default: null,
  },
  worldProfileLoading: {
    type: Boolean,
    default: false,
  },
  worldProfileNotice: {
    type: String,
    default: '',
  },
```

Add emits:

```js
  'analyze-world-profile',
  'enable-pack',
  'disable-pack',
```

Add computed helpers:

```js
const enabledPackIds = computed(() => new Set(props.enabledPacks.map((pack) => pack.id)))
const recommendationRows = computed(() => props.recommendationReview?.reviews || [])
const recommendedRows = computed(() => props.recommendationReview?.grouped?.recommended || [])
const browseableRows = computed(() => props.recommendationReview?.grouped?.browseable || [])
const unsupportedRows = computed(() => props.recommendationReview?.grouped?.unsupported || [])
const worldProfileSummary = computed(() => {
  const profile = props.worldProfile || {}
  const traits = [
    profile.era,
    ...(Array.isArray(profile.settingTraits) ? profile.settingTraits : []),
    profile.realism,
    ...(Array.isArray(profile.socialRoles) ? profile.socialRoles : []),
  ].filter(Boolean)
  return traits.length ? traits.slice(0, 8).join(' / ') : t('尚未分析', 'Not analyzed yet')
})
```

- [ ] **Step 5: Add product UI sections**

Inside the template after the handoff summary and before the old selector, add:

```vue
    <div class="current-world-pack__profile" data-testid="worldbook-world-profile">
      <div>
        <p>{{ t('AI 世界画像', 'AI World Profile') }}</p>
        <strong>{{ worldProfileSummary }}</strong>
        <small v-if="worldProfile?.confidence">
          {{ t('置信度', 'Confidence') }}: {{ worldProfile.confidence }}
        </small>
      </div>
      <button
        type="button"
        :disabled="worldProfileLoading"
        data-testid="worldbook-analyze-world-profile"
        @click="emit('analyze-world-profile')"
      >
        {{ worldProfileLoading ? t('分析中', 'Analyzing') : t('分析并推荐拓展包', 'Analyze for expansions') }}
      </button>
      <small v-if="worldProfileNotice">{{ worldProfileNotice }}</small>
    </div>

    <div class="current-world-pack__enabled" data-testid="worldbook-enabled-expansions">
      <div>
        <p>{{ t('已启用拓展包', 'Enabled Expansions') }}</p>
        <strong>{{ enabledPacks.length }}</strong>
      </div>
      <div v-if="enabledPacks.length > 0" class="current-world-pack__pack-list">
        <div
          v-for="pack in enabledPacks"
          :key="pack.id"
          class="current-world-pack__pack-row"
          :data-testid="`worldbook-enabled-pack-${pack.id}`"
        >
          <strong>{{ t(pack.title, pack.name) }}</strong>
          <span>{{ pack.description }}</span>
          <button
            type="button"
            :data-testid="`worldbook-disable-pack-${pack.id}`"
            @click="emit('disable-pack', pack.id)"
          >
            {{ t('停用', 'Disable') }}
          </button>
        </div>
      </div>
      <p v-else>{{ t('还没有启用拓展包。', 'No expansion packs are enabled yet.') }}</p>
    </div>

    <div class="current-world-pack__recommendations" data-testid="worldbook-pack-recommendations">
      <div>
        <p>{{ t('推荐拓展包', 'Recommended Expansions') }}</p>
        <strong>{{ recommendedRows.length }}</strong>
      </div>
      <div class="current-world-pack__pack-list">
        <div
          v-for="row in recommendedRows"
          :key="row.packId"
          class="current-world-pack__pack-row"
          :data-testid="`worldbook-recommended-pack-${row.packId}`"
        >
          <strong>{{ row.packName }}</strong>
          <span>{{ row.reasons.join(' / ') || row.fitStatus }}</span>
          <button
            type="button"
            :disabled="enabledPackIds.has(row.packId)"
            :data-testid="`worldbook-enable-pack-${row.packId}`"
            @click="emit('enable-pack', row.packId)"
          >
            {{ enabledPackIds.has(row.packId) ? t('已启用', 'Enabled') : t('启用', 'Enable') }}
          </button>
        </div>
      </div>
    </div>

    <details class="current-world-pack__all-packs" data-testid="worldbook-pack-all" open>
      <summary>{{ t('全部拓展包', 'All Packs') }}</summary>
      <div class="current-world-pack__pack-list">
        <div
          v-for="row in browseableRows"
          :key="row.packId"
          class="current-world-pack__pack-row"
          :data-testid="`worldbook-all-pack-${row.packId}`"
        >
          <strong>{{ row.packName }}</strong>
          <span>{{ row.fitStatus }}</span>
          <button
            type="button"
            :disabled="enabledPackIds.has(row.packId)"
            :data-testid="`worldbook-enable-pack-${row.packId}`"
            @click="emit('enable-pack', row.packId)"
          >
            {{ enabledPackIds.has(row.packId) ? t('已启用', 'Enabled') : t('启用', 'Enable') }}
          </button>
        </div>
        <div
          v-for="row in unsupportedRows"
          :key="row.packId"
          class="current-world-pack__pack-row is-disabled"
          :data-testid="`worldbook-unsupported-pack-${row.packId}`"
        >
          <strong>{{ row.packName }}</strong>
          <span>{{ t('当前程序不支持，需要专门 App。', 'Unsupported: needs a dedicated app or product support.') }}</span>
        </div>
      </div>
    </details>
```

Keep the legacy selector below as `Prepare single legacy pack` for now so existing activation tests still pass.

- [ ] **Step 6: Add minimal CSS**

In `CurrentWorldPackPanel.vue` scoped styles, add:

```css
.current-world-pack__profile,
.current-world-pack__enabled,
.current-world-pack__recommendations,
.current-world-pack__all-packs {
  margin-top: 12px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  padding: 12px;
}

.current-world-pack__pack-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.current-world-pack__pack-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-sm);
  background: var(--system-surface-muted);
  padding: 10px;
}

.current-world-pack__pack-row span {
  grid-column: 1 / -1;
  color: var(--system-text-muted);
  font-size: 12px;
}

.current-world-pack__pack-row.is-disabled {
  opacity: 0.68;
}
```

- [ ] **Step 7: Verify WorldBook UI tests**

Run:

```bash
npm.cmd test -- tests/worldbook-functional-ia.test.js
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/views/WorldBookView.vue src/components/worldbook/CurrentWorldPackPanel.vue tests/worldbook-functional-ia.test.js
git commit -m "feat: add compatible expansion controls to worldbook"
```

---

### Task 7: App Store And Chat Services Multi-Pack Path

**Files:**
- Modify: `src/views/ChatDirectoryView.vue` if it reads only active pack templates.
- Test: `tests/app-store-ui.test.js`
- Test: `tests/chat-service-subscriptions.test.js`

- [ ] **Step 1: Add failing App Store coverage**

In `tests/app-store-ui.test.js`, add:

```js
  test('App Store exposes entries from multiple enabled World Pack expansions', async () => {
    const router = createTestRouter()
    await router.push('/app-store?section=world')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    expect(systemStore.enableWorldPack('school_life').ok).toBe(true)
    expect(systemStore.enableWorldPack('business_family').ok).toBe(true)

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('[data-testid="app-store-item-world_app_school_life_school_schedule_board"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-store-item-world_app_business_family_business_board_calendar"]').exists()).toBe(true)

    await wrapper.get('[data-testid="app-store-item-world_app_school_life_school_schedule_board"]').trigger('click')
    await wrapper.get('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/calendar')
    expect(router.currentRoute.value.query).toMatchObject({
      worldPack: 'school_life',
      worldApp: 'school_schedule_board',
    })

    wrapper.unmount()
  })
```

- [ ] **Step 2: Add failing Chat Services coverage**

In `tests/chat-service-subscriptions.test.js`, add:

```js
  test('lists service candidates from multiple enabled World Pack expansions', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    expect(systemStore.enableWorldPack('school_life').ok).toBe(true)
    expect(systemStore.enableWorldPack('business_family').ok).toBe(true)

    await router.push('/chat-contacts?section=service')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-world-service-templates"]').text()).toContain('School life expansion')
    expect(wrapper.get('[data-testid="chat-directory-world-service-templates"]').text()).toContain('Business family expansion')
    expect(wrapper.find('[data-testid="chat-directory-world-service-template-school_affairs_office"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="chat-directory-world-service-template-family_office_channel"]').exists()).toBe(true)

    wrapper.unmount()
  })
```

- [ ] **Step 3: Run failing App Store and Chat tests**

Run:

```bash
npm.cmd test -- tests/app-store-ui.test.js tests/chat-service-subscriptions.test.js
```

Expected: App Store may pass after Task 5; Chat Services fails if it still uses only active pack.

- [ ] **Step 4: Update Chat Directory candidate source**

In `src/views/ChatDirectoryView.vue`, find the computed that builds current World Pack service candidates. Replace a single active pack read such as:

```js
const activeWorldPack = computed(() => systemStore.getActiveWorldPack())
const worldServiceTemplateRows = computed(() =>
  buildWorldServiceTemplateGenerationRows({
    pack: activeWorldPack.value,
    findExistingContact: ...
  }),
)
```

with:

```js
import { buildWorldServiceTemplateGenerationRowsForPacks } from '../lib/world-pack-service-accounts'

const enabledWorldPacks = computed(() =>
  typeof systemStore.listEnabledWorldPacks === 'function'
    ? systemStore.listEnabledWorldPacks()
    : [systemStore.getActiveWorldPack()].filter(Boolean),
)

const worldServiceTemplateRows = computed(() =>
  buildWorldServiceTemplateGenerationRowsForPacks({
    packs: enabledWorldPacks.value,
    findExistingContact: (packId, templateId) =>
      chatStore.findWorldServiceTemplateContact(packId, templateId),
  }),
)
```

Keep edit/reset/join handlers passing each row's original `payload.worldPackId` or `row.payload.worldPackId`.

- [ ] **Step 5: Verify App Store and Chat path**

Run:

```bash
npm.cmd test -- tests/app-store-ui.test.js tests/chat-service-subscriptions.test.js
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/views/ChatDirectoryView.vue tests/app-store-ui.test.js tests/chat-service-subscriptions.test.js
git commit -m "feat: expose multi-pack entries in app store and chat"
```

---

### Task 8: Documentation And Full Validation

**Files:**
- Modify: `docs/roadmap/TODO_ROADMAP.md`
- Modify: `docs/overview/PROJECT_MASTER_GUIDE.md`
- Modify: `docs/architecture/ARCHITECTURE.md`
- Modify: `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md` if Chat Services changed.

- [ ] **Step 1: Update docs in product language**

Add this user-facing status language to the relevant World Pack sections:

```md
World Pack direction now uses one main worldview plus compatible enabled expansions. AI analyzes the current WorldBook/Book context into advisory world traits, recommends compatible packs, and explains conflicts or missing context. Users can still browse and enable supported packs that AI did not recommend. Unsupported packs are blocked only when the current product lacks the required app/module boundary.
```

Add this ownership language to architecture docs:

```md
WorldBook owns analysis, recommendation, and enablement review. World Pack owns expansion metadata and compatibility rules. App Store/Home consume enabled-pack app entries. Chat Services consumes enabled-pack service candidates. Target apps keep business records.
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
npm.cmd test -- tests/world-pack-compatibility.test.js tests/world-profile-analysis.test.js tests/world-pack-schema.test.js tests/system-world-pack.test.js tests/world-interface.test.js tests/world-pack-app-bindings.test.js tests/worldbook-functional-ia.test.js tests/app-store-ui.test.js tests/chat-service-subscriptions.test.js
```

Expected: pass.

- [ ] **Step 3: Run project validation**

Run:

```bash
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Expected: all pass.

- [ ] **Step 4: Commit docs and validation status**

```bash
git add docs/roadmap/TODO_ROADMAP.md docs/overview/PROJECT_MASTER_GUIDE.md docs/architecture/ARCHITECTURE.md docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md
git commit -m "docs: record compatible world pack expansion status"
```

---

## Execution Notes

- Keep the existing `activateWorldPack()` behavior working because many tests and existing user saves still rely on it.
- New UI should prefer `enableWorldPack()` for expansion-style behavior.
- Do not use mojibake terminal output as new Chinese UI copy. Write fresh valid UTF-8 Chinese when adding visible text.
- Existing dirty worktree changes in App Store, Shopping, Food Delivery, and docs may belong to another round. Do not revert them and do not include them in commits unless they are directly changed for this plan.
- Each task is independently testable. Do not wait until the end to run tests.

## Self-Review

- Spec coverage: the plan covers AI world-profile analysis, compatibility rules, browse-all behavior, supported vs unsupported gating, multi-pack enablement, App Store/Home entries, Chat service candidates, WorldBook UI, and docs.
- Compatibility: legacy single-pack activation remains available and seeds the enabled expansion list so existing flows continue to work.
- User choice: recommendations are advisory; supported packs remain browseable and enableable.
- Ownership: no task creates arbitrary app modules, source records, Chat subscriptions, event rules, orders, products, schedules, or messages.
