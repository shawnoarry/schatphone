import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import {
  buildMemoryDeleteFinalDetails,
  buildMemoryDeletePreviewDetails,
  buildMemoryDeletePreviewMessage,
  buildRoleDangerImpactText,
  useContactsDangerZoneModel,
} from '../src/composables/useContactsDangerZoneModel'

const t = (zh, en) => en || zh

const formatSourceModuleSummary = (counts = {}) =>
  Object.entries(counts)
    .map(([sourceModule, count]) => `${sourceModule}:${count}`)
    .join(', ') || 'No cross-module sources'

const formatCleanupCoverage = (counts = {}) => `Cleanup coverage: ${formatSourceModuleSummary(counts)}`

const createModel = ({ includeLinkedRecords = false, impact } = {}) =>
  useContactsDangerZoneModel({
    selectedProfile: ref({
      id: 7,
      roleId: 'ada',
      name: 'Ada',
    }),
    selectedRelationshipSnapshot: ref({
      relationshipStage: 'close',
    }),
    selectedDeleteImpact: ref(impact ?? {
      chatBindingCount: 2,
      memoryGroupCount: 3,
      sourceModuleCounts: {
        calendar: 1,
        map: 2,
      },
    }),
    dangerIncludeLinkedRecords: ref(includeLinkedRecords),
    t,
    formatRoleId: (roleId, id) => roleId || `role_${id}`,
    formatRelationshipStageLabel: (stage) => `Stage: ${stage}`,
    formatSourceModuleSummary,
    formatCleanupCoverage,
  })

describe('Contacts danger zone model interface', () => {
  test('builds an impact summary from role delete impact counts', () => {
    expect(
      buildRoleDangerImpactText(
        {
          chatBindingCount: 2,
          memoryGroupCount: 3,
          sourceModuleCounts: {
            calendar: 1,
            map: 2,
          },
        },
        {
          t,
          formatSourceModuleSummary,
        },
      ),
    ).toBe('Impact: Chat bindings 2 · memories 3 · sources calendar:1, map:2')
    expect(buildRoleDangerImpactText(null, { t, formatSourceModuleSummary })).toBe('')
  })

  test('builds reset confirmation details without reading stores directly', () => {
    const model = createModel()

    expect(model.resetRelationshipDialogDetails.value).toEqual([
      'Current stage: Stage: close',
      'Memory groups: 3',
      'Cross-module sources: calendar:1, map:2',
      'Cleanup coverage: calendar:1, map:2',
    ])
  })

  test('builds role deletion preview and scope details with linked-record policy', () => {
    const retained = createModel({ includeLinkedRecords: false })
    const cleanup = createModel({ includeLinkedRecords: true })

    expect(retained.deleteRoleProfileDialogDetails.value).toEqual([
      'Role: Ada · ID ada',
      'Chat bindings: 2',
      'Memory groups: 3',
      'Photos assets are not silently deleted; role references are unbound only. Delete images manually in Gallery if needed.',
    ])
    expect(retained.deleteRoleScopeDialogDetails.value).toEqual([
      'Scope: Contacts profile · Chat Directory binding · Chat history · Relationship runtime',
      'Role: Ada · ID ada',
      'Impact: Chat bindings 2 · memories 3 · sources calendar:1, map:2',
      'Cross-module source records will not be deleted; they stay in the impact summary only.',
      'Photos assets are unbound only; source images are not silently deleted.',
    ])
    expect(cleanup.deleteRoleScopeDialogDetails.value[3]).toBe(
      'Cleanup coverage: calendar:1, map:2',
    )
    expect(cleanup.dangerIncludeLinkedRecordsText.value).toBe(
      'Also attempt to delete cross-module source records with explicit cleanup handlers. Missing or ambiguous records stay in the impact summary only.',
    )
  })

  test('builds memory deletion preview and final safety details', () => {
    const memory = {
      memoryKey: 'shared_trip',
      primarySummary: 'Primary fallback.',
      supportingCount: 4,
    }
    const detail = {
      displaySummary: 'Shared route to gallery.',
      events: [{ id: 'event_1' }, { id: 'event_2' }],
      sourceModuleCounts: {
        map: 2,
      },
    }

    expect(buildMemoryDeletePreviewMessage({ memory, detail })).toBe('Shared route to gallery.')
    expect(
      buildMemoryDeletePreviewDetails(
        {
          memory,
          detail,
        },
        {
          t,
          formatSourceModuleSummary,
          formatCleanupCoverage,
        },
      ),
    ).toEqual([
      'Relationship events: 2',
      'Sources: map:2',
      'Cleanup coverage: map:2',
    ])
    expect(buildMemoryDeleteFinalDetails({ memory }, { t })).toEqual([
      'Memory key: shared_trip',
      'Normal free-form chat messages will not be deleted.',
      'Delete original chat text from the Chat conversation if needed.',
    ])
  })
})
