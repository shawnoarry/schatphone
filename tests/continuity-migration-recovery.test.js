import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  COMPLETE_BACKUP_SECTION_PATHS,
  createCompleteBackupPackage,
  inspectCompleteBackupPackage,
} from '../src/lib/complete-backup-package'
import {
  COMMERCE_EVENT_TEMPLATE_ID,
  getBuiltInCommerceEventTemplate,
} from '../src/lib/simulation/commerce-event-templates'
import { EVENT_INSTANCE_V2_LIFECYCLE } from '../src/lib/simulation/commerce-interaction-contracts'
import { createEventInstanceV2 } from '../src/lib/simulation/event-instance-v2'
import { useMiniSceneStore } from '../src/stores/miniScene'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSimulationStore } from '../src/stores/simulation'

const BASE_TIME = 1_800_000_000_000

const createRelationshipSnapshot = (count = 501) => ({
  settings: {},
  entities: [
    {
      entityKey: 'role:701',
      profileId: 701,
      kind: 'role',
      displayName: 'Continuity role',
    },
  ],
  events: Array.from({ length: count }, (_, index) => ({
    id: `continuity_relationship_${index}`,
    entityKey: 'role:701',
    targetLabel: 'Continuity role',
    sourceModule: 'continuity_recovery_test',
    sourceId: `relationship_source_${index}`,
    memoryKey: `continuity_memory_${index}`,
    sharedExperienceId: index === count - 1 ? 'gift:continuity_order' : '',
    factType: 'history_note',
    summary: `Relationship continuity item ${index}.`,
    metricDeltas: {},
    status: 'applied',
    effectApplied: false,
    createdAt: BASE_TIME + index,
  })),
})

const createEventInstanceSnapshot = (count = 241) => {
  const template = getBuiltInCommerceEventTemplate(
    COMMERCE_EVENT_TEMPLATE_ID.DESTINATION_CHANGE_AFTER_FULFILLMENT,
  )
  const eventInstancesV2 = Array.from({ length: count }, (_, index) => {
    const instance = createEventInstanceV2({
      id: `continuity_event_${index}`,
      template,
      contextRefs: {
        order_id: `continuity_order_${index}`,
        service_case_id: `continuity_case_${index}`,
        fulfillment_phase: 'en_route',
      },
      now: BASE_TIME + index,
    })
    if (!instance) throw new Error(`Failed to create continuity Event Instance ${index}`)
    if (index !== count - 1) return instance
    return {
      ...instance,
      lifecycle: EVENT_INSTANCE_V2_LIFECYCLE.RESOLVED,
      resultCodes: ['address_change_closed'],
      updatedAt: BASE_TIME + index + 1,
    }
  })
  return { eventInstancesV2, settings: {} }
}

const createMiniSceneSnapshot = (count = 125) => ({
  schemaVersion: 2,
  modulePolicies: [{ moduleKey: 'simulation', mode: 'text' }],
  profileBindings: [],
  artifacts: Array.from({ length: count }, (_, index) => ({
    artifactId: `continuity_event_${index}:mini_scene:ai:text:v1`,
    requestId: `continuity_event_${index}:mini_scene`,
    source: {
      moduleKey: 'simulation',
      recordId: `continuity_event_${index}`,
      eventId: `continuity_event_${index}`,
    },
    sceneType: 'event.runtime',
    worldId: 'legacy_single_world',
    content: {
      title: `Continuity scene ${index}`,
      summary: `Retained continuity scene ${index}.`,
      textFallback: `The retained scene ${index} remains available after recovery.`,
      beats: [],
      choices: [],
      document: { templateId: '', variantId: '', slots: {}, assetIds: [] },
    },
    provenance: {
      sourceKind: 'ai',
      providerId: 'openai_compatible',
      modelId: 'continuity-test-model',
      generatedAt: BASE_TIME + index,
    },
    retention: {
      state: index % 5 === 0 ? 'archived' : 'retained',
      retainedAt: BASE_TIME + index,
      archivedAt: index % 5 === 0 ? BASE_TIME + index + 1 : 0,
    },
  })),
  interactionAudit: [],
})

const createCompletePayload = ({ relationshipRuntime, simulation, miniScene }) => {
  const payload = Object.fromEntries(COMPLETE_BACKUP_SECTION_PATHS.map((path) => [path, {}]))
  return {
    ...payload,
    backupMeta: {
      exportedAt: BASE_TIME,
      exportMode: 'metadata_only',
      galleryAssetPackage: { requested: false, included: false },
    },
    gallery: { assets: [], folders: [], assetPackage: null },
    relationshipRuntime,
    simulation,
    miniScene,
  }
}

describe('continuity migration and complete recovery', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('restores expanded Relationship, Event Instance, and Mini Scene history together', async () => {
    const sourceRelationship = useRelationshipRuntimeStore()
    const sourceSimulation = useSimulationStore()
    const sourceMiniScene = useMiniSceneStore()

    expect(sourceRelationship.restoreFromBackup(createRelationshipSnapshot())).toBe(true)
    expect(sourceSimulation.restoreFromBackup(createEventInstanceSnapshot())).toBe(true)
    expect(sourceMiniScene.restoreFromBackup(createMiniSceneSnapshot())).toBe(true)

    const backup = await createCompleteBackupPackage(
      createCompletePayload({
        relationshipRuntime: sourceRelationship.createBackupSnapshot(),
        simulation: sourceSimulation.createBackupSnapshot(),
        miniScene: sourceMiniScene.createBackupSnapshot(),
      }),
      { packageId: 'continuity-complete-recovery' },
    )
    const inspection = await inspectCompleteBackupPackage(backup)

    expect(inspection).toMatchObject({ ok: true, classification: 'current_complete' })
    expect(backup.relationshipRuntime.events).toHaveLength(501)
    expect(backup.simulation.eventInstancesV2).toHaveLength(241)
    expect(backup.miniScene.artifacts).toHaveLength(125)

    localStorage.clear()
    setActivePinia(createPinia())
    const restoredRelationship = useRelationshipRuntimeStore()
    const restoredSimulation = useSimulationStore()
    const restoredMiniScene = useMiniSceneStore()

    expect(restoredRelationship.restoreFromBackup(backup.relationshipRuntime)).toBe(true)
    expect(restoredSimulation.restoreFromBackup(backup.simulation)).toBe(true)
    expect(restoredMiniScene.restoreFromBackup(backup.miniScene)).toBe(true)
    expect(restoredRelationship.saveNow()).toMatchObject({ ok: true })
    expect(restoredSimulation.saveNow()).toMatchObject({ ok: true })
    expect(restoredMiniScene.saveNow()).toMatchObject({ ok: true })

    setActivePinia(createPinia())
    const reopenedRelationship = useRelationshipRuntimeStore()
    const reopenedSimulation = useSimulationStore()
    const reopenedMiniScene = useMiniSceneStore()

    expect(reopenedRelationship.events).toHaveLength(501)
    expect(
      reopenedRelationship.findEventBySource(
        'continuity_recovery_test',
        'relationship_source_500',
      ),
    ).toMatchObject({
      memoryKey: 'continuity_memory_500',
      sharedExperienceId: 'gift:continuity_order',
    })
    expect(reopenedSimulation.eventInstancesV2).toHaveLength(241)
    expect(reopenedSimulation.getEventInstanceV2('continuity_event_240')).toMatchObject({
      lifecycle: 'resolved',
      resultCodes: ['address_change_closed'],
    })
    expect(reopenedMiniScene.artifacts).toHaveLength(125)
    expect(
      reopenedMiniScene.listRetainedArtifacts({ state: 'archived', pageSize: 50 }),
    ).toMatchObject({ total: 25 })
    expect(
      reopenedMiniScene.findArtifactById('continuity_event_124:mini_scene:ai:text:v1'),
    ).toMatchObject({ retention: { state: 'retained' } })
  })
})
