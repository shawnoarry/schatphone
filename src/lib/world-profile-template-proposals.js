import { callAI as defaultCallAI } from './ai'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from './chat-response'
import {
  CONTACTS_ENTITY_TYPE_KEYS,
  PROFILE_TEMPLATE_FIELD_PURPOSES,
  PROFILE_TEMPLATE_FIELD_TYPE_KEYS,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_TEMPLATE_SCOPES,
  PROFILE_VISIBILITY_LEVELS,
  normalizeProfileTemplateFieldPurposes,
} from './profile-template-schema'

const MAX_CONTEXT_LENGTH = 12000
const MAX_EVIDENCE = 12

const trimText = (value = '', maxLength = 500) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)

const normalizeId = (value = '', fallback = '') => {
  const normalized = trimText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || fallback
}

const unique = (items = []) => [...new Set(items.filter(Boolean))]

const isEnglishLocale = (locale = '') => String(locale || '').toLowerCase().startsWith('en')

const localize = (locale, zh, en) => (isEnglishLocale(locale) ? en : zh)

const createCategory = (locale, id, zhLabel, enLabel, zhDescription = '', enDescription = '') => ({
  id,
  label: localize(locale, zhLabel, enLabel),
  description: localize(locale, zhDescription, enDescription),
})

const createField = (
  locale,
  {
    id,
    categoryId,
    zhLabel,
    enLabel,
    zhDescription = '',
    enDescription = '',
    type = PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
    optionsZh = [],
    optionsEn = [],
    purposes = [],
    visibility = PROFILE_VISIBILITY_LEVELS.WORLD_SPECIFIC,
    required = false,
    recommended = true,
    entityTypes = CONTACTS_ENTITY_TYPE_KEYS,
  },
) => ({
  id,
  categoryId,
  label: localize(locale, zhLabel, enLabel),
  description: localize(locale, zhDescription, enDescription),
  type,
  defaultVisibilityLevel: visibility,
  entityTypes: [...entityTypes],
  options: isEnglishLocale(locale) ? optionsEn : optionsZh,
  purposes: normalizeProfileTemplateFieldPurposes(purposes, type),
  required,
  recommended,
})

const buildBaseRule = (locale) => ({
  id: 'identity_foundation',
  label: localize(locale, '通用身份底座', 'Identity foundation'),
  templateTitle: localize(locale, '当前世界人物资料建议', 'Current-world profile suggestion'),
  categories: [
    createCategory(
      locale,
      'identity_profile',
      '身份资料',
      'Identity',
      '记录人物在当前世界中的稳定身份。',
      'Stable identity in the current world.',
    ),
    createCategory(
      locale,
      'organization_profile',
      '组织归属',
      'Organizations',
      '记录公司、学校、门派、团队或其他稳定归属。',
      'Stable company, school, faction, team, or organization references.',
    ),
  ],
  fields: [
    createField(locale, {
      id: 'occupation',
      categoryId: 'identity_profile',
      zhLabel: '职业 / 身份',
      enLabel: 'Occupation / role',
      zhDescription: '人物在当前世界中的主要职业、身份或社会角色。',
      enDescription: 'Primary occupation, identity, or social role in this world.',
      purposes: [
        PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
        PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
        PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
      ],
    }),
    createField(locale, {
      id: 'affiliation',
      categoryId: 'organization_profile',
      zhLabel: '所属组织',
      enLabel: 'Affiliation',
      zhDescription: '公司、学校、团队、门派或其他稳定组织归属。',
      enDescription: 'Company, school, team, faction, or other stable organization.',
      type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
      purposes: [
        PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
        PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
        PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
      ],
    }),
    createField(locale, {
      id: 'public_identity',
      categoryId: 'identity_profile',
      zhLabel: '公开身份',
      enLabel: 'Public identity',
      zhDescription: '人物以什么程度和身份出现在公开环境中。',
      enDescription: 'How and to what extent the person appears publicly.',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
      optionsZh: ['公开', '有限公开', '私人身份', '匿名'],
      optionsEn: ['Public', 'Limited public', 'Private', 'Anonymous'],
      purposes: [
        PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
        PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
        PROFILE_TEMPLATE_FIELD_PURPOSES.PUBLIC_CONTENT,
      ],
    }),
  ],
})

const WORLD_PROFILE_RULE_BUILDERS = [
  {
    id: 'modern',
    packIds: ['modern_parallel'],
    keywords: ['modern', 'contemporary', '现代', '都市', '城市', '职场'],
    traits: ['modern', 'urban', 'real_world'],
    build: (locale) => ({
      label: localize(locale, '现代社会', 'Modern society'),
      templateTitle: localize(locale, '现代世界人物资料建议', 'Modern-world profile suggestion'),
      categories: [
        createCategory(locale, 'daily_context', '社会与日常', 'Society and daily life'),
      ],
      fields: [
        createField(locale, {
          id: 'position_title',
          categoryId: 'organization_profile',
          zhLabel: '职位 / 职责',
          enLabel: 'Position / responsibilities',
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
          ],
        }),
        createField(locale, {
          id: 'communication_style',
          categoryId: 'daily_context',
          zhLabel: '沟通习惯',
          enLabel: 'Communication style',
          type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
          purposes: [PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT],
        }),
      ],
    }),
  },
  {
    id: 'fandom',
    packIds: ['fandom_parallel'],
    keywords: ['fandom', 'idol', 'k-pop', 'kpop', 'celebrity', '偶像', '娱乐圈', '艺人', '组合', '粉丝'],
    traits: ['entertainment', 'celebrity', 'fan', 'manager'],
    build: (locale) => ({
      label: localize(locale, '偶像与娱乐行业', 'Idol and entertainment'),
      templateTitle: localize(locale, '偶像企划人物资料建议', 'Fandom profile suggestion'),
      categories: [
        createCategory(locale, 'public_activity', '公开活动', 'Public activity'),
      ],
      fields: [
        createField(locale, {
          id: 'affiliation',
          categoryId: 'organization_profile',
          zhLabel: '所属公司 / 团队',
          enLabel: 'Agency / team',
          type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
            PROFILE_TEMPLATE_FIELD_PURPOSES.PUBLIC_CONTENT,
          ],
        }),
        createField(locale, {
          id: 'stage_name',
          categoryId: 'identity_profile',
          zhLabel: '艺名',
          enLabel: 'Stage name',
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.PUBLIC_CONTENT,
          ],
        }),
        createField(locale, {
          id: 'group_role',
          categoryId: 'organization_profile',
          zhLabel: '队内职务',
          enLabel: 'Group role',
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
            PROFILE_TEMPLATE_FIELD_PURPOSES.PUBLIC_CONTENT,
          ],
        }),
        createField(locale, {
          id: 'debut_date',
          categoryId: 'public_activity',
          zhLabel: '出道日期',
          enLabel: 'Debut date',
          type: PROFILE_TEMPLATE_FIELD_TYPES.DATE,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.PUBLIC_CONTENT,
          ],
        }),
        createField(locale, {
          id: 'specialties',
          categoryId: 'public_activity',
          zhLabel: '擅长领域',
          enLabel: 'Specialties',
          type: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
            PROFILE_TEMPLATE_FIELD_PURPOSES.PUBLIC_CONTENT,
          ],
        }),
        createField(locale, {
          id: 'public_activity_scope',
          categoryId: 'public_activity',
          zhLabel: '公开活动范围',
          enLabel: 'Public activity scope',
          type: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.PUBLIC_CONTENT,
          ],
        }),
      ],
    }),
  },
  {
    id: 'school',
    packIds: ['school_life'],
    keywords: ['school', 'campus', 'student', 'teacher', '校园', '学校', '学生', '教师', '班级', '社团'],
    traits: ['school', 'student'],
    build: (locale) => ({
      label: localize(locale, '校园生活', 'School life'),
      templateTitle: localize(locale, '校园人物资料建议', 'School profile suggestion'),
      categories: [
        createCategory(locale, 'campus_profile', '校园资料', 'Campus profile'),
      ],
      fields: [
        createField(locale, {
          id: 'occupation',
          categoryId: 'identity_profile',
          zhLabel: '校园身份',
          enLabel: 'Campus role',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
          optionsZh: ['学生', '教师', '职员', '校友', '校外人员'],
          optionsEn: ['Student', 'Teacher', 'Staff', 'Alumni', 'Visitor'],
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
          ],
        }),
        createField(locale, {
          id: 'affiliation',
          categoryId: 'organization_profile',
          zhLabel: '学校 / 院系',
          enLabel: 'School / faculty',
          type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
          ],
        }),
        createField(locale, {
          id: 'grade_class',
          categoryId: 'campus_profile',
          zhLabel: '年级 / 班级',
          enLabel: 'Grade / class',
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
          ],
        }),
        createField(locale, {
          id: 'club_affiliation',
          categoryId: 'campus_profile',
          zhLabel: '社团',
          enLabel: 'Club',
          type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
          ],
        }),
        createField(locale, {
          id: 'enrollment_date',
          categoryId: 'campus_profile',
          zhLabel: '入学 / 入职日期',
          enLabel: 'Enrollment / start date',
          type: PROFILE_TEMPLATE_FIELD_TYPES.DATE,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
          ],
        }),
      ],
    }),
  },
  {
    id: 'business_family',
    packIds: ['business_family'],
    keywords: ['corporate', 'business family', 'board', '财阀', '企业', '集团', '董事', '家族办公室'],
    traits: ['business_family', 'corporate'],
    build: (locale) => ({
      label: localize(locale, '企业与家族组织', 'Corporate and family organization'),
      templateTitle: localize(locale, '企业家族人物资料建议', 'Corporate-family profile suggestion'),
      categories: [
        createCategory(locale, 'authority_profile', '职权与关系', 'Authority and reporting'),
      ],
      fields: [
        createField(locale, {
          id: 'position_title',
          categoryId: 'organization_profile',
          zhLabel: '职位',
          enLabel: 'Position',
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
          ],
        }),
        createField(locale, {
          id: 'family_branch',
          categoryId: 'organization_profile',
          zhLabel: '家族分支',
          enLabel: 'Family branch',
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
          ],
        }),
        createField(locale, {
          id: 'reports_to',
          categoryId: 'authority_profile',
          zhLabel: '直接负责人',
          enLabel: 'Reports to',
          type: PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
          ],
        }),
        createField(locale, {
          id: 'authority_scope',
          categoryId: 'authority_profile',
          zhLabel: '职权范围',
          enLabel: 'Authority scope',
          type: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
          ],
        }),
      ],
    }),
  },
  {
    id: 'urban_mystery',
    packIds: ['urban_mystery'],
    keywords: ['mystery', 'supernatural', 'investigation', '怪谈', '灵异', '异常', '调查', '都市传说'],
    traits: ['investigation', 'supernatural'],
    build: (locale) => ({
      label: localize(locale, '怪谈与调查', 'Mystery and investigation'),
      templateTitle: localize(locale, '都市怪谈人物资料建议', 'Urban-mystery profile suggestion'),
      categories: [
        createCategory(locale, 'anomaly_profile', '异常与调查', 'Anomalies and investigation'),
      ],
      fields: [
        createField(locale, {
          id: 'investigation_role',
          categoryId: 'identity_profile',
          zhLabel: '调查身份',
          enLabel: 'Investigation role',
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
          ],
        }),
        createField(locale, {
          id: 'anomaly_exposure',
          categoryId: 'anomaly_profile',
          zhLabel: '是否接触异常',
          enLabel: 'Exposed to anomalies',
          type: PROFILE_TEMPLATE_FIELD_TYPES.BOOLEAN,
          purposes: [PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY],
        }),
        createField(locale, {
          id: 'anomaly_notes',
          categoryId: 'anomaly_profile',
          zhLabel: '已知异常经历',
          enLabel: 'Known anomaly history',
          type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
          purposes: [PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT],
        }),
        createField(locale, {
          id: 'ability_limitations',
          categoryId: 'anomaly_profile',
          zhLabel: '能力与限制',
          enLabel: 'Abilities and limits',
          type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
          purposes: [PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT],
        }),
      ],
    }),
  },
  {
    id: 'survival',
    packIds: ['survival_city'],
    keywords: ['survival', 'post-disaster', 'resource', '灾后', '末日', '生存', '避难', '补给'],
    traits: ['survival', 'resource_scarce'],
    build: (locale) => ({
      label: localize(locale, '灾后生存', 'Post-disaster survival'),
      templateTitle: localize(locale, '生存都市人物资料建议', 'Survival-city profile suggestion'),
      categories: [
        createCategory(locale, 'survival_profile', '生存资料', 'Survival profile'),
      ],
      fields: [
        createField(locale, {
          id: 'survival_role',
          categoryId: 'identity_profile',
          zhLabel: '生存职责',
          enLabel: 'Survival role',
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
          ],
        }),
        createField(locale, {
          id: 'safe_zone',
          categoryId: 'organization_profile',
          zhLabel: '所属安全区 / 据点',
          enLabel: 'Safe zone / base',
          type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
          ],
        }),
        createField(locale, {
          id: 'survival_skills',
          categoryId: 'survival_profile',
          zhLabel: '生存技能',
          enLabel: 'Survival skills',
          type: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
          ],
        }),
        createField(locale, {
          id: 'clearance_level',
          categoryId: 'survival_profile',
          zhLabel: '通行等级',
          enLabel: 'Clearance level',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
          optionsZh: ['未登记', '访客', '居民', '工作人员', '核心权限'],
          optionsEn: ['Unregistered', 'Visitor', 'Resident', 'Staff', 'Core access'],
          purposes: [PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY],
        }),
      ],
    }),
  },
  {
    id: 'xianxia',
    packIds: [],
    keywords: ['xianxia', 'cultivation', 'sect', '仙侠', '修仙', '门派', '宗门', '灵根', '法器'],
    traits: ['xianxia', 'cultivation'],
    build: (locale) => ({
      label: localize(locale, '仙侠修行', 'Xianxia cultivation'),
      templateTitle: localize(locale, '仙侠人物资料建议', 'Xianxia profile suggestion'),
      categories: [
        createCategory(locale, 'origin_profile', '出身与种族', 'Origin and lineage'),
        createCategory(locale, 'cultivation_profile', '修行体系', 'Cultivation'),
        createCategory(locale, 'artifact_profile', '法器与能力', 'Artifacts and abilities'),
      ],
      fields: [
        createField(locale, {
          id: 'affiliation',
          categoryId: 'organization_profile',
          zhLabel: '门派 / 宗门',
          enLabel: 'Sect / faction',
          type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
          ],
        }),
        createField(locale, {
          id: 'species_origin',
          categoryId: 'origin_profile',
          zhLabel: '出身 / 种族',
          enLabel: 'Origin / species',
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
          ],
        }),
        createField(locale, {
          id: 'master_reference',
          categoryId: 'organization_profile',
          zhLabel: '师承',
          enLabel: 'Master / lineage',
          type: PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
          ],
        }),
        createField(locale, {
          id: 'cultivation_stage',
          categoryId: 'cultivation_profile',
          zhLabel: '修行境界',
          enLabel: 'Cultivation stage',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
          ],
        }),
        createField(locale, {
          id: 'spiritual_root',
          categoryId: 'cultivation_profile',
          zhLabel: '灵根 / 资质',
          enLabel: 'Spiritual root / aptitude',
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
          ],
        }),
        createField(locale, {
          id: 'artifacts_and_abilities',
          categoryId: 'artifact_profile',
          zhLabel: '法器与能力',
          enLabel: 'Artifacts and abilities',
          type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
          purposes: [PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT],
        }),
      ],
    }),
  },
]

const normalizePackList = ({ worldPack = {}, worldPacks = [] } = {}) => {
  const rows = [...(Array.isArray(worldPacks) ? worldPacks : []), worldPack]
  const seen = new Set()
  return rows.filter((pack) => {
    const id = normalizeId(pack?.id, '')
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

const collectPackTraits = (packs = []) =>
  unique(
    packs.flatMap((pack) =>
      Object.values(pack?.compatibility?.recommended || {}).flatMap((value) =>
        Array.isArray(value) ? value : [],
      ),
    ),
  ).map((item) => trimText(item, 80).toLowerCase())

const collectSignalText = ({ worldContextText = '', packs = [] } = {}) =>
  [
    trimText(worldContextText, MAX_CONTEXT_LENGTH),
    ...packs.flatMap((pack) => [
      pack?.id,
      pack?.title,
      pack?.name,
      pack?.description,
      ...Object.keys(pack?.terminology || {}),
      ...Object.values(pack?.terminology || {}),
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const scoreRule = (rule, { packIds, traits, signalText }) => {
  let score = 0
  const evidence = []
  const exactPack = rule.packIds.find((id) => packIds.has(id))
  if (exactPack) {
    score += 100
    evidence.push(`world_pack:${exactPack}`)
  }
  rule.traits.forEach((trait) => {
    if (!traits.includes(trait)) return
    score += 12
    evidence.push(`trait:${trait}`)
  })
  rule.keywords.forEach((keyword) => {
    if (!signalText.includes(String(keyword).toLowerCase())) return
    score += 3
    evidence.push(`keyword:${keyword}`)
  })
  return { score, evidence: unique(evidence).slice(0, MAX_EVIDENCE) }
}

const mergeRuleSections = (sections = []) => {
  const categoryMap = new Map()
  const fieldMap = new Map()

  sections.forEach((section) => {
    section.categories.forEach((category) => {
      categoryMap.set(category.id, {
        ...(categoryMap.get(category.id) || {}),
        ...category,
      })
    })
    section.fields.forEach((field) => {
      const existing = fieldMap.get(field.id) || {}
      fieldMap.set(field.id, {
        ...existing,
        ...field,
        entityTypes: unique([...(existing.entityTypes || []), ...(field.entityTypes || [])]),
        options: unique([...(existing.options || []), ...(field.options || [])]),
        purposes: normalizeProfileTemplateFieldPurposes(
          unique([...(existing.purposes || []), ...(field.purposes || [])]),
          field.type,
        ),
      })
    })
  })

  const categories = [...categoryMap.values()].map((category, index) => ({
    ...category,
    order: index,
  }))
  const categoryIds = new Set(categories.map((category) => category.id))
  const fallbackCategoryId = categories[0]?.id || 'identity_profile'
  const fields = [...fieldMap.values()]
    .map((field) => ({
      ...field,
      categoryId: categoryIds.has(field.categoryId) ? field.categoryId : fallbackCategoryId,
    }))
    .sort((left, right) => {
      const leftCategory = categories.findIndex((category) => category.id === left.categoryId)
      const rightCategory = categories.findIndex((category) => category.id === right.categoryId)
      return leftCategory - rightCategory
    })
    .map((field, index) => ({ ...field, order: index }))

  return { categories, fields }
}

const buildDraft = ({ title, description, worldId, categories, fields }) => ({
  id: '',
  title,
  description,
  scope: PROFILE_TEMPLATE_SCOPES.WORLD,
  worldId: worldId || 'default_world',
  enabled: true,
  version: 0,
  categories,
  fields,
})

export const buildDeterministicWorldProfileTemplateProposal = ({
  worldContextText = '',
  worldPack = {},
  worldPacks = [],
  worldId = 'default_world',
  locale = 'zh-CN',
  existingTemplates = [],
} = {}) => {
  const packs = normalizePackList({ worldPack, worldPacks })
  const packIds = new Set(packs.map((pack) => normalizeId(pack?.id, '')).filter(Boolean))
  const traits = collectPackTraits(packs)
  const signalText = collectSignalText({ worldContextText, packs })
  const matchedRules = WORLD_PROFILE_RULE_BUILDERS
    .map((rule) => ({ rule, ...scoreRule(rule, { packIds, traits, signalText }) }))
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score || left.rule.id.localeCompare(right.rule.id))
    .slice(0, 2)
  const base = buildBaseRule(locale)
  const localizedMatches = matchedRules
    .slice()
    .reverse()
    .map((row) => ({ ...row.rule.build(locale), id: row.rule.id }))
  const merged = mergeRuleSections([base, ...localizedMatches])
  const primary = matchedRules[0]?.rule.build(locale) || base
  const packLabels = packs.map((pack) => trimText(pack?.title || pack?.name || pack?.id, 120))
  const evidence = unique(matchedRules.flatMap((row) => row.evidence)).slice(0, MAX_EVIDENCE)
  const description = localize(
    locale,
    `根据当前 WorldBook 与${packLabels.length ? `「${packLabels.join('、')}」` : '当前世界包'}规则生成的可编辑草稿。保存前可自由增删改。`,
    `Editable draft generated from the current WorldBook and ${packLabels.length ? packLabels.join(', ') : 'world Pack'} rules. Review freely before saving.`,
  )
  const draft = buildDraft({
    title: primary.templateTitle,
    description,
    worldId,
    ...merged,
  })

  return {
    source: 'rules',
    worldId,
    worldPackIds: [...packIds],
    worldPackLabels: packLabels,
    matchedRuleIds: matchedRules.map((row) => row.rule.id),
    matchedRuleLabels: matchedRules.map((row) => row.rule.build(locale).label),
    evidence,
    fallbackUsed: matchedRules.length === 0,
    existingTemplateCount: Array.isArray(existingTemplates) ? existingTemplates.length : 0,
    categoryCount: draft.categories.length,
    fieldCount: draft.fields.length,
    draft,
  }
}

const parseProposalPayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null
  const text = extractAssistantPayloadText(response)
  const parsed = text ? parseAssistantJsonPayload(text) : null
  return parsed || (Array.isArray(response) ? null : response)
}

const readProposalSource = (payload = {}) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {}
  if (payload.template && typeof payload.template === 'object') return payload.template
  if (payload.profileTemplate && typeof payload.profileTemplate === 'object') {
    return payload.profileTemplate
  }
  return payload
}

const createUniqueId = (value, fallback, occupiedIds) => {
  const base = normalizeId(value, fallback)
  let id = base
  let suffix = 2
  while (occupiedIds.has(id)) {
    id = `${base}_${suffix}`
    suffix += 1
  }
  occupiedIds.add(id)
  return id
}

const canonicalFieldId = (field = {}, index = 0) => {
  const raw = normalizeId(field.id || field.key || field.name || field.label, '')
  const semanticText = `${raw} ${trimText(field.label || field.title, 120).toLowerCase()}`
  if (/public_identity|public identity|公开身份/.test(semanticText)) return 'public_identity'
  if (/occupation|career|profession|job|职业|工作|社会角色/.test(semanticText)) return 'occupation'
  if (/affiliation|organization|organisation|company|agency|school|sect|组织|公司|学校|门派|宗门/.test(semanticText)) {
    return 'affiliation'
  }
  return raw || `suggested_field_${index + 1}`
}

export const normalizeWorldProfileTemplateProposalPayload = (
  payload = {},
  { worldId = 'default_world', locale = 'zh-CN', worldPacks = [], existingTemplates = [] } = {},
) => {
  const source = readProposalSource(payload)
  const rawCategories = Array.isArray(source.categories) ? source.categories : []
  const rawFields = Array.isArray(source.fields) ? source.fields : []
  if (rawFields.length === 0) return null

  const categoryIds = new Set()
  const categories = (rawCategories.length > 0
    ? rawCategories
    : [{ id: 'identity_profile', label: localize(locale, '身份资料', 'Identity') }]
  ).map((category, index) => {
    const id = createUniqueId(
      category?.id || category?.key || category?.label || category?.title,
      `suggested_category_${index + 1}`,
      categoryIds,
    )
    return {
      id,
      label: trimText(category?.label || category?.title || id, 120),
      description: trimText(category?.description || category?.helpText, 600),
      order: index,
    }
  })
  const fallbackCategoryId = categories[0].id
  const fieldIds = new Set()
  const fields = rawFields.map((field, index) => {
    const type = PROFILE_TEMPLATE_FIELD_TYPE_KEYS.includes(field?.type)
      ? field.type
      : PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT
    const id = createUniqueId(canonicalFieldId(field, index), `suggested_field_${index + 1}`, fieldIds)
    const requestedCategoryId = normalizeId(field?.categoryId || field?.sectionId, '')
    const categoryId = categoryIds.has(requestedCategoryId)
      ? requestedCategoryId
      : fallbackCategoryId
    const entityTypes = unique(
      Array.isArray(field?.entityTypes)
        ? field.entityTypes.filter((item) => CONTACTS_ENTITY_TYPE_KEYS.includes(item))
        : CONTACTS_ENTITY_TYPE_KEYS,
    )
    return {
      id,
      categoryId,
      label: trimText(field?.label || field?.title || id, 120),
      description: trimText(field?.description || field?.helpText, 600),
      type,
      defaultVisibilityLevel: Object.values(PROFILE_VISIBILITY_LEVELS).includes(
        field?.defaultVisibilityLevel,
      )
        ? field.defaultVisibilityLevel
        : PROFILE_VISIBILITY_LEVELS.WORLD_SPECIFIC,
      entityTypes: entityTypes.length > 0 ? entityTypes : [...CONTACTS_ENTITY_TYPE_KEYS],
      options: unique(
        Array.isArray(field?.options)
          ? field.options.map((option) => trimText(option, 120)).filter(Boolean)
          : [],
      ),
      purposes: normalizeProfileTemplateFieldPurposes(field?.purposes, type),
      required: field?.required === true,
      recommended: field?.recommended !== false,
      order: index,
    }
  })
  const packLabels = normalizePackList({ worldPacks }).map((pack) =>
    trimText(pack?.title || pack?.name || pack?.id, 120),
  )
  const draft = buildDraft({
    title: trimText(
      source.title,
      120,
    ) || localize(locale, 'AI 世界人物资料建议', 'AI world-profile suggestion'),
    description:
      trimText(source.description, 600) ||
      localize(
        locale,
        'AI 生成的待复核资料卡草稿；只有明确保存才会创建世界模板。',
        'AI-generated review draft; a world template is created only after explicit Save.',
      ),
    worldId,
    categories,
    fields,
  })

  return {
    source: 'ai',
    worldId,
    worldPackIds: normalizePackList({ worldPacks }).map((pack) => normalizeId(pack?.id, '')),
    worldPackLabels: packLabels,
    matchedRuleIds: [],
    matchedRuleLabels: [localize(locale, 'AI 草稿', 'AI draft')],
    evidence: unique(
      Array.isArray(payload?.evidence)
        ? payload.evidence.map((item) => trimText(item, 240))
        : [trimText(payload?.evidence || payload?.reason, 240)],
    ).slice(0, MAX_EVIDENCE),
    fallbackUsed: false,
    existingTemplateCount: Array.isArray(existingTemplates) ? existingTemplates.length : 0,
    categoryCount: draft.categories.length,
    fieldCount: draft.fields.length,
    draft,
  }
}

export const buildWorldProfileTemplateProposalPrompt = ({
  worldContextText = '',
  worldPacks = [],
  existingTemplates = [],
} = {}) => {
  const packs = normalizePackList({ worldPacks })
  const packRows = packs.map(
    (pack) => `- ${pack.id}: ${pack.title || pack.name || pack.id}; ${pack.description || ''}`,
  )
  const existingRows = (Array.isArray(existingTemplates) ? existingTemplates : []).map(
    (template) => `- ${template.id}: ${template.title}; fields=${(template.fields || []).map((field) => field.id).join(',')}`,
  )
  return [
    'Propose one editable SchatPhone Contacts profile-card template for the current world.',
    'Return JSON only with this shape:',
    '{"title":"","description":"","categories":[{"id":"","label":"","description":""}],"fields":[{"id":"","categoryId":"","label":"","description":"","type":"short_text|long_text|single_select|multi_select_tags|date|boolean|person_reference|organization_reference","options":[],"purposes":["chat_context|event_eligibility|work_hub_matching|public_content"],"entityTypes":["self_profile|main_role|supporting_role|npc"],"defaultVisibilityLevel":"public|familiar|intimate|hidden|world_specific","required":false,"recommended":true}],"evidence":[]}',
    'Use stable semantic ids. Use occupation, affiliation, and public_identity exactly when those meanings are present.',
    'Do not create values for any person. Do not create organization permissions, events, metrics, balances, affinity, fatigue, or progress fields.',
    'Keep categories and fields concise. Every suggestion remains editable and unsaved until the user confirms it.',
    packRows.length ? ['Current world Packs:', ...packRows].join('\n') : 'Current world Packs: none',
    existingRows.length
      ? ['Existing templates to avoid duplicating blindly:', ...existingRows].join('\n')
      : 'Existing templates: none',
    'WorldBook context:',
    trimText(worldContextText, MAX_CONTEXT_LENGTH) || '(empty)',
  ].join('\n')
}

export const extractWorldProfileTemplateProposalWithAI = async ({
  worldContextText = '',
  worldPacks = [],
  existingTemplates = [],
  worldId = 'default_world',
  locale = 'zh-CN',
  settings = {},
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const prompt = buildWorldProfileTemplateProposalPrompt({
    worldContextText,
    worldPacks,
    existingTemplates,
  })
  const response = await callAi({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt:
      'You propose review-only SchatPhone Contacts profile-card templates. Return valid JSON only.',
    settings,
    signal,
  })
  const payload = parseProposalPayload(response)
  const review = payload
    ? normalizeWorldProfileTemplateProposalPayload(payload, {
        worldId,
        locale,
        worldPacks,
        existingTemplates,
      })
    : null
  return {
    ok: Boolean(review),
    reason: review ? 'review_ready' : 'parse_failed',
    review,
    rawPayload: payload,
  }
}
