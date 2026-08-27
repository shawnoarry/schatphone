import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import MiniSceneRetentionManager from '../src/components/MiniSceneRetentionManager.vue'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import { useMiniSceneStore } from '../src/stores/miniScene'

const createArtifact = (index) => ({
  artifactId: `event_${index}:mini_scene:ai:text:v1`,
  requestId: `event_${index}:mini_scene`,
  source: { moduleKey: 'simulation', recordId: `event_${index}`, eventId: `event_${index}` },
  sceneType: 'event.runtime',
  worldId: 'legacy_single_world',
  content: {
    title: `Saved scene ${index}`,
    summary: `Summary ${index}`,
    textFallback: `Text ${index}`,
    beats: [],
    choices: [],
    document: { templateId: '', variantId: '', slots: {}, assetIds: [] },
  },
  provenance: {
    sourceKind: 'ai',
    providerId: 'openai_compatible',
    generatedAt: 1_787_180_000_000 + index,
  },
})

describe('MiniSceneRetentionManager', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    resetDialogServiceForTest()
  })

  afterEach(() => {
    resetDialogServiceForTest()
  })

  test('pages retained scenes and supports open, archive, restore, and confirmed delete', async () => {
    const store = useMiniSceneStore()
    Array.from({ length: 9 }, (_, index) => store.commitArtifact(createArtifact(index + 1)))
    expect(store.saveNow()).toMatchObject({ ok: true })
    const wrapper = mount(MiniSceneRetentionManager)

    expect(wrapper.findAll('[data-testid="mini-scene-history-item"]')).toHaveLength(8)
    expect(wrapper.get('[data-testid="mini-scene-history-next"]').exists()).toBe(true)

    const first = store.artifacts[0]
    await wrapper
      .get(`[data-testid="mini-scene-history-open-${first.artifactId}"]`)
      .trigger('click')
    expect(store.activeArtifact?.artifactId).toBe(first.artifactId)

    await wrapper
      .get(`[data-testid="mini-scene-history-archive-${first.artifactId}"]`)
      .trigger('click')
    expect(store.findArtifactById(first.artifactId)?.retention.state).toBe('archived')

    await wrapper.get('[data-testid="mini-scene-history-filter-archived"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="mini-scene-history-item"]')).toHaveLength(1)

    await wrapper
      .get(`[data-testid="mini-scene-history-archive-${first.artifactId}"]`)
      .trigger('click')
    expect(store.findArtifactById(first.artifactId)?.retention.state).toBe('retained')

    await wrapper.get('[data-testid="mini-scene-history-filter-retained"]').trigger('click')
    await flushPromises()
    await wrapper
      .get(`[data-testid="mini-scene-history-delete-${first.artifactId}"]`)
      .trigger('click')
    useDialog().submitDialog()
    await flushPromises()

    expect(store.findArtifactById(first.artifactId)).toBeNull()
    expect(store.artifacts).toHaveLength(8)
    wrapper.unmount()
  })
})
