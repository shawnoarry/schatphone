import { computed, ref } from 'vue'
import { describe, expect, test } from 'vitest'
import { useWorldSettingWorkspaceModel } from '../src/composables/useWorldSettingWorkspaceModel'

const t = (_zh, en) => en

const createModel = ({
  activeTextCount = 0,
  catalogCount = 8,
  issueCount = 0,
  knowledgeCount = 0,
  enabledKnowledgeCount = 0,
  templateCount = 0,
  expansionIds = [],
  appBindingCount = 0,
  serviceTemplateCount = 0,
  fallback = '',
  identityTitle = '',
} = {}) =>
  useWorldSettingWorkspaceModel({
    worldOverview: computed(() => ({
      activePack: { id: 'default_world', title: '默认世界', name: 'Default world' },
      identity: identityTitle ? { worldId: 'legacy_single_world', title: identityTitle } : undefined,
      knowledgeCount,
      enabledKnowledgeCount,
      worldPackAppBindingCount: appBindingCount,
      worldPackServiceTemplateCount: serviceTemplateCount,
    })),
    activeBookSourceCount: ref(activeTextCount),
    sourcePickerAssets: ref(Array.from({ length: catalogCount }, (_, index) => ({ id: `asset_${index}` }))),
    bookSourceIssueCount: ref(issueCount),
    worldProfileTemplates: ref(Array.from({ length: templateCount }, (_, index) => ({ id: `template_${index}` }))),
    enabledExpansionPackIds: ref(expansionIds),
    fallbackWorldview: ref(fallback),
    t,
  }).worldSettingWorkspace

describe('world setting workspace model', () => {
  test('treats setting carriers as parallel layers instead of required setup steps', () => {
    const workspace = createModel().value

    expect(workspace.state).toBe('empty')
    expect(workspace.status).toBe('No layers active')
    expect(workspace.activeWorldTitle).toBe('Current world setting')
    expect(workspace.metrics.map((metric) => [metric.id, metric.value])).toEqual([
      ['active-texts', 0],
      ['book-catalog', 8],
      ['issues', 0],
    ])
    expect(workspace.layers.map((layer) => layer.id)).toEqual([
      'sources',
      'knowledge',
      'templates',
      'pack',
      'kernel',
    ])
    expect(workspace.layers.find((layer) => layer.id === 'knowledge')).toMatchObject({
      state: 'optional',
      status: 'Optional',
    })
    expect(workspace.layers.find((layer) => layer.id === 'sources')).toMatchObject({
      kind: 'independent',
      state: 'empty',
    })
    expect(workspace.layers.find((layer) => layer.id === 'pack')).toMatchObject({
      title: 'Capabilities and apps',
      state: 'optional',
    })
  })

  test.each([
    {
      label: 'only an optional capability Pack',
      input: { expansionIds: ['school_life'] },
      activeLayerId: 'pack',
    },
    {
      label: 'only structured encyclopedia entries',
      input: { knowledgeCount: 3, enabledKnowledgeCount: 2 },
      activeLayerId: 'knowledge',
    },
    {
      label: 'only compatibility fallback text',
      input: { fallback: 'A compact compatibility note.' },
      activeLayerId: 'kernel',
    },
  ])('treats $label as a valid active world-setting state', ({ input, activeLayerId }) => {
    const workspace = createModel(input).value

    expect(workspace.state).toBe('active')
    expect(workspace.status).toBe('Settings active')
    expect(workspace.layers.find((layer) => layer.id === activeLayerId)?.state).toBe('active')
    expect(workspace.layers.find((layer) => layer.id === 'sources')?.state).toBe('empty')
  })

  test('uses canonical world identity without presenting the active Pack as the world', () => {
    const workspace = createModel({
      identityTitle: 'Independent city setting',
      expansionIds: ['school_life'],
    }).value

    expect(workspace.activeWorldTitle).toBe('Independent city setting')
    expect(workspace.activeWorldTitle).not.toBe('Default world')
  })

  test('localizes the compatibility identity title instead of exposing an English sentinel label', () => {
    const workspace = createModel({ identityTitle: 'Current world' }).value

    expect(workspace.activeWorldTitle).toBe('Current world setting')
  })

  test('supports independent Book-source combinations without activating other layers', () => {
    const workspace = createModel({
      activeTextCount: 3,
      knowledgeCount: 6,
      enabledKnowledgeCount: 0,
      templateCount: 0,
      expansionIds: [],
    }).value

    expect(workspace.state).toBe('active')
    expect(workspace.layers.find((layer) => layer.id === 'sources')).toMatchObject({
      state: 'active',
      status: '3 active',
    })
    expect(workspace.layers.find((layer) => layer.id === 'knowledge')).toMatchObject({
      state: 'optional',
      status: '0 / 6 enabled',
    })
    expect(workspace.layers.find((layer) => layer.id === 'pack')?.state).toBe('optional')
  })

  test('reports active text and review issues without auto-enabling optional layers', () => {
    const workspace = createModel({
      activeTextCount: 2,
      issueCount: 1,
      knowledgeCount: 6,
      enabledKnowledgeCount: 0,
      templateCount: 1,
      expansionIds: ['school_life'],
      appBindingCount: 2,
    }).value

    expect(workspace.state).toBe('attention')
    expect(workspace.layers.find((layer) => layer.id === 'sources')).toMatchObject({
      state: 'attention',
      status: '1 to review',
    })
    expect(workspace.layers.find((layer) => layer.id === 'knowledge')).toMatchObject({
      state: 'optional',
      status: '0 / 6 enabled',
    })
    expect(workspace.layers.find((layer) => layer.id === 'templates')?.state).toBe('active')
    expect(workspace.layers.find((layer) => layer.id === 'pack')?.state).toBe('active')
  })
})
