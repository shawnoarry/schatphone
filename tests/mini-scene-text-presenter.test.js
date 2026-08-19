import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MiniSceneTextPresenter from '../src/components/MiniSceneTextPresenter.vue'
import { useMiniSceneStore } from '../src/stores/miniScene'

const DummyView = { template: '<div />' }

const commitAiArtifact = (store) => {
  const artifact = store.commitArtifact({
    artifactId: 'event_instance_1:mini_scene:ai:text:v1',
    requestId: 'event_instance_1:mini_scene',
    source: {
      moduleKey: 'simulation',
      recordId: 'event_instance_1',
      eventId: 'event_instance_1',
    },
    sceneType: 'event.runtime',
    worldId: 'legacy_single_world',
    content: {
      title: 'The cue light turns red',
      summary: 'The event has begun.',
      textFallback: 'The stage manager raises a hand. The next cue belongs to you.',
      beats: [
        {
          id: 'cue',
          text: 'The countdown starts.',
          participantIds: ['player'],
        },
      ],
      choices: [
        { id: 'step_forward', label: 'Step toward the stage', value: 'step_forward' },
      ],
      document: { templateId: '', variantId: '', slots: {}, assetIds: [] },
    },
    provenance: {
      sourceKind: 'ai',
      providerId: 'openai_compatible',
      modelId: 'test-model',
      generatedAt: 1_787_180_000_000,
    },
  })
  store.openArtifact(artifact.artifactId)
  return artifact
}

describe('MiniSceneTextPresenter', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  test('records a choice and returns to the Event Runtime source without Calendar coupling', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/home', component: DummyView },
        { path: '/control-center', component: DummyView },
      ],
    })
    await router.push('/home')
    await router.isReady()

    const store = useMiniSceneStore()
    const artifact = commitAiArtifact(store)
    const wrapper = mount(MiniSceneTextPresenter, {
      attachTo: document.body,
      global: { plugins: [router], stubs: { Teleport: true } },
    })
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(wrapper.text()).toContain('The cue light turns red')
    expect(wrapper.text()).toContain('来源事件系统验证前')

    await wrapper.get('[data-testid="mini-scene-choice-step_forward"]').trigger('click')
    expect(store.getActiveChoiceRequest()).toMatchObject({
      ok: true,
      request: {
        command: 'mini_scene.choose',
        source: { moduleKey: 'simulation', eventId: 'event_instance_1' },
        choice: { id: 'step_forward' },
      },
    })

    await wrapper.get('[data-testid="mini-scene-return-source"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value).toMatchObject({
      path: '/control-center',
      query: {
        eventId: 'event_instance_1',
        miniSceneArtifactId: artifact.artifactId,
      },
    })
    expect(store.activeArtifact).toBeNull()
    expect(store.interactionAudit.some((entry) => entry.action === 'source_opened')).toBe(true)
    wrapper.unmount()
  })
})
