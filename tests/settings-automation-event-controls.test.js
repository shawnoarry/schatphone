import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import SettingsAutomationSection from '../src/components/settings/SettingsAutomationSection.vue'

const baseProps = {
  aiAutomation: {
    masterEnabled: false,
    modules: {
      chat: { enabled: true, priority: 10 },
      map: { enabled: false, priority: 20 },
      shopping: { enabled: false, priority: 30 },
    },
    notifyOnlyMode: true,
    quietHoursEnabled: false,
    quietHoursStart: '23:00',
    quietHoursEnd: '07:00',
    conflictCooldownSec: 30,
    dedupeWindowSec: 120,
  },
  automationRuntimePolicy: { notifyOnly: true, quietHoursActive: false },
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
}

describe('Settings automation event controls', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('keeps module permission separate from Activity Session presentation mode', async () => {
    const wrapper = mount(SettingsAutomationSection, { props: baseProps })
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
})
