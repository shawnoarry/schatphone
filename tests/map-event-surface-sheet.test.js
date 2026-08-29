import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import MapEventSurfaceSheet from '../src/components/map/MapEventSurfaceSheet.vue'

const copy = {
  title: 'Production arrival notes',
  opening: 'The production floor is settling into its first briefing.',
  environment: 'A call sheet is waiting beside the access desk.',
  dialogue: [{ speakerRef: 'coordinator', text: 'Choose how you want to prepare.' }],
  choiceLabels: {
    review_brief: 'Review the brief',
    check_equipment: 'Check the equipment',
    wait_for_staff: 'Wait for staff',
  },
  consequenceByOutcomeId: {
    brief_reviewed: 'The notes are clear and no external record changes.',
    preview_steady: 'The situation remains manageable.',
  },
}

const surface = {
  id: 'event_surface:map:event_instance_test',
  status: 'ready',
  availability: { state: 'available', reason: '' },
  copy: {
    titleZh: 'Production arrival notes',
    titleEn: 'Production arrival notes',
    statusLabelZh: 'Ready',
    statusLabelEn: 'Ready',
  },
}

const instance = {
  id: 'event_instance_test',
  lifecycle: 'active',
  text: { source: 'local', normalizedCopy: copy },
  choices: {
    allowedIds: ['review_brief', 'check_equipment', 'wait_for_staff'],
    selectedId: '',
    outcomeId: '',
  },
}

const media = {
  labelZh: '地点实景',
  labelEn: 'Exact-place photo',
  asset: {
    url: 'https://example.com/broadcast-center.webp',
    altZh: '电视台建筑入口',
    altEn: 'Broadcast center entrance',
  },
}

const createWrapper = (overrides = {}) =>
  mount(MapEventSurfaceSheet, {
    attachTo: document.body,
    props: {
      surface,
      instance,
      media,
      placeName: 'MBC Broadcast Center',
      t: (_zh, en) => en,
      ...overrides,
    },
  })

describe('MapEventSurfaceSheet', () => {
  test('renders the local text and emits one of exactly three allowlisted choices', async () => {
    const wrapper = createWrapper()
    expect(wrapper.attributes('data-v-app')).toBeUndefined()
    expect(wrapper.get('[data-testid="map-event-surface-sheet"]').attributes('role')).toBe('dialog')
    expect(wrapper.text()).toContain('MBC Broadcast Center')
    expect(wrapper.text()).toContain('Local text')
    expect(wrapper.get('[data-testid="map-event-scene-image"]').attributes('src')).toBe(
      media.asset.url,
    )
    expect(wrapper.get('[data-testid="map-event-scene-image"]').attributes('alt')).toBe(
      media.asset.altEn,
    )
    expect(wrapper.find('.map-event-scene-fallback').exists()).toBe(true)
    await wrapper.get('[data-testid="map-event-scene-image"]').trigger('load')
    expect(wrapper.get('[data-testid="map-event-scene-image"]').classes()).toContain('is-ready')
    expect(wrapper.find('.map-event-scene-fallback').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-event-choices"]').findAll('button')).toHaveLength(3)

    await wrapper.get('[data-testid="map-event-choice-check_equipment"]').trigger('click')
    expect(wrapper.emitted('choose')).toEqual([['check_equipment']])
    await wrapper.get('[data-testid="map-event-dismiss"]').trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)

    await wrapper
      .get('[data-testid="map-event-surface-sheet"]')
      .trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  test('keeps a stale active source visible but disables every outcome command', () => {
    const wrapper = createWrapper({
      surface: {
        ...surface,
        status: 'unavailable',
        availability: { state: 'stale', reason: 'source_stale' },
      },
    })
    expect(wrapper.get('[data-testid="map-event-source-stale"]').text()).toContain(
      'choices are no longer available',
    )
    wrapper
      .get('[data-testid="map-event-choices"]')
      .findAll('button')
      .forEach((button) => {
        expect(button.attributes('disabled')).toBeDefined()
      })
    wrapper.unmount()
  })

  test('shows the validated consequence with an explicit return action', async () => {
    const wrapper = createWrapper({
      surface: { ...surface, status: 'resolved' },
      instance: {
        ...instance,
        lifecycle: 'resolved',
        choices: { ...instance.choices, selectedId: 'review_brief', outcomeId: 'brief_reviewed' },
      },
    })
    expect(wrapper.get('[data-testid="map-event-consequence"]').text()).toContain(
      'no external record changes',
    )
    expect(wrapper.find('[data-testid="map-event-choices"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="map-event-dismiss"]').exists()).toBe(false)
    await wrapper.get('[data-testid="map-event-complete"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  test('shows a durable d100 receipt for a settled preview', () => {
    const wrapper = createWrapper({
      preview: true,
      surface: { ...surface, status: 'resolved' },
      settlement: {
        instanceId: instance.id,
        choiceId: 'review_brief',
        outcomeId: 'preview_steady',
        randomKind: 'd100',
        roll: 42,
        rangeMin: 1,
        rangeMax: 100,
        provenance: 'client_runtime',
        canonicalMutation: 'none',
      },
      instance: {
        ...instance,
        lifecycle: 'resolved',
        choices: { ...instance.choices, selectedId: 'review_brief', outcomeId: 'preview_steady' },
      },
    })

    expect(wrapper.get('[data-testid="map-event-settlement-roll"]').text()).toContain('D100 42')
    expect(wrapper.get('[data-testid="map-event-settlement-choice"]').text()).toContain(
      'Review the brief',
    )
    expect(wrapper.get('[data-testid="map-event-settlement-outcome"]').text()).toContain('Steady')
    expect(wrapper.get('[data-testid="map-event-settlement-final"]').text()).toContain(
      'will not run again',
    )
    expect(wrapper.find('[data-testid="map-event-choices"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('uses warning semantics for a settled preview setback', () => {
    const wrapper = createWrapper({
      preview: true,
      surface: { ...surface, status: 'resolved' },
      settlement: {
        instanceId: instance.id,
        choiceId: 'review_brief',
        outcomeId: 'preview_setback',
        randomKind: 'd100',
        roll: 89,
        rangeMin: 1,
        rangeMax: 100,
        provenance: 'client_runtime',
        canonicalMutation: 'none',
      },
      instance: {
        ...instance,
        lifecycle: 'resolved',
        text: {
          ...instance.text,
          normalizedCopy: {
            ...copy,
            consequenceByOutcomeId: {
              ...copy.consequenceByOutcomeId,
              preview_setback: 'You need to retrace your steps.',
            },
          },
        },
        choices: { ...instance.choices, selectedId: 'review_brief', outcomeId: 'preview_setback' },
      },
    })

    const consequence = wrapper.get('[data-testid="map-event-consequence"]')
    expect(consequence.classes()).toContain('is-settlement-negative')
    expect(consequence.get('i').classes()).toContain('fa-triangle-exclamation')
    expect(consequence.text()).toContain('Setback')
    wrapper.unmount()
  })

  test('reveals an ephemeral test interaction one beat at a time before choices', async () => {
    const wrapper = createWrapper({ preview: true })
    expect(wrapper.text()).toContain('Test event')
    expect(wrapper.text()).toContain('TEST · SCENE')
    expect(wrapper.get('[data-testid="map-event-preview-beat"]').text()).toBe(copy.opening)
    expect(wrapper.find('[data-testid="map-event-choices"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-event-preview-advance"]').trigger('click')
    expect(wrapper.get('[data-testid="map-event-preview-beat"]').text()).toBe(copy.environment)
    expect(wrapper.find('[data-testid="map-event-choices"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-event-preview-advance"]').trigger('click')
    expect(wrapper.get('[data-testid="map-event-preview-beat"]').text()).toBe(copy.dialogue[0].text)
    expect(wrapper.get('[data-testid="map-event-choices"]').findAll('button')).toHaveLength(3)
    wrapper.unmount()
  })

  test('presents a deterministic stack and opens the selected projection', async () => {
    const stack = [
      surface,
      {
        ...surface,
        id: 'event_surface:map:event_instance_test_2',
        copy: { ...surface.copy, titleZh: 'Second briefing', titleEn: 'Second briefing' },
      },
    ]
    const wrapper = createWrapper({ surface: null, instance: null, stack })
    expect(wrapper.get('[data-testid="map-event-stack"]').findAll('button')).toHaveLength(2)
    await wrapper.get('[data-testid="map-event-stack"]').findAll('button')[1].trigger('click')
    expect(wrapper.emitted('select-surface')).toEqual([[stack[1].id]])
    wrapper.unmount()
  })
})
