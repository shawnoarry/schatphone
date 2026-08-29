import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import SettingsEventSection from '../src/components/settings/SettingsEventSection.vue'

const baseProps = {
  simulationSettings: {
    surpriseMode: 'high',
    foregroundSessionTickEnabled: false,
  },
  simulationForegroundTickIntervalMinutes: 10,
  simulationForegroundTickRuntimeLabel: 'Local foreground only',
  simulationForegroundTickCoverageItems: [],
  simulationForegroundTickLatestLabel: 'No tick yet',
  simulationSurpriseModeOptions: [{ value: 'high', label: 'High' }],
  simulationSurpriseModeRuntimeLabel: 'High mode',
  simulationModuleEventControls: [
    {
      id: 'activity_session',
      moduleKey: 'activity_session',
      label: 'Activity Session events',
      detail: 'Explicit checkpoints only.',
      status: 'Allowed',
      enabled: true,
    },
  ],
  simulationEventPresentationControls: [
    {
      id: 'activity_session',
      moduleKey: 'activity_session',
      label: 'Activity Session events',
      detail: 'Focus Companion presentation.',
      value: 'off',
      options: [
        { value: 'off', label: 'Off' },
        { value: 'text', label: 'Text interaction' },
      ],
    },
  ],
  miniScenePresentationControls: [
    {
      id: 'simulation',
      moduleKey: 'simulation',
      label: 'Event Mini Scenes',
      detail: 'Event Runtime asks AI to generate scenes after an event occurs.',
      value: 'unconfigured',
      options: [
        { value: 'unconfigured', label: 'Not configured (hidden)', disabled: true },
        { value: 'off', label: 'Off' },
        { value: 'text', label: 'Text modal' },
      ],
    },
  ],
}

describe('Settings event controls', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('keeps module permission separate from Activity Session presentation mode', async () => {
    const wrapper = mount(SettingsEventSection, { props: baseProps })
    const permission = wrapper.get(
      '[data-testid="settings-simulation-module-events-activity_session"]',
    )
    const presentation = wrapper.get(
      '[data-testid="settings-simulation-event-presentation-activity_session"]',
    )

    await permission.setValue(false)
    await presentation.setValue('text')

    expect(wrapper.emitted('update-simulation-module-events-enabled')).toEqual([
      ['activity_session', false],
    ])
    expect(wrapper.emitted('update-simulation-event-presentation-mode')).toEqual([
      ['activity_session', 'text'],
    ])
  })

  test('renders Mini Scene settings only for registered caller rows', async () => {
    const wrapper = mount(SettingsEventSection, { props: baseProps })
    const presentation = wrapper.get('[data-testid="settings-mini-scene-presentation-simulation"]')
    await presentation.setValue('off')
    expect(wrapper.emitted('update-mini-scene-presentation-mode')).toEqual([['simulation', 'off']])

    await wrapper.setProps({ miniScenePresentationControls: [] })
    expect(wrapper.find('[data-testid="settings-mini-scene-presentation-controls"]').exists()).toBe(
      false,
    )
  })
})
