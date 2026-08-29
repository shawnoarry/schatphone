import { describe, expect, test } from 'vitest'
import {
  EVENT_POLICY_REASON,
  normalizeEventPolicySnapshot,
  resolveOptionalEventPolicy,
} from '../src/lib/simulation/event-policy'

const probabilityByIntensity = Object.freeze({
  off: 0,
  low: 0.25,
  balanced: 0.6,
  high: 1,
})

describe('optional event runtime policy', () => {
  test('resolves permission, intensity, probability, and presentation through one interface', () => {
    const simulationStore = {
      surpriseMode: 'balanced',
      isModuleEventsEnabled: (moduleKey) => moduleKey === 'activity_session',
      getEventPresentationMode: () => 'text',
    }

    const policy = resolveOptionalEventPolicy({
      simulationStore,
      moduleKey: 'activity_session',
      probabilityByIntensity,
      presentationModuleKey: 'activity_session',
      presentationFallback: 'off',
    })

    expect(policy).toEqual({
      schemaVersion: 1,
      moduleKey: 'activity_session',
      moduleEventsEnabled: true,
      intensity: 'balanced',
      presentationMode: 'text',
      probability: 0.6,
      allowed: true,
      reason: EVENT_POLICY_REASON.ALLOWED,
    })
    expect(Object.isFrozen(policy)).toBe(true)
  })

  test('fails closed for disabled modules and optional events switched off', () => {
    const disabled = resolveOptionalEventPolicy({
      simulationStore: {
        surpriseMode: 'high',
        isModuleEventsEnabled: () => false,
      },
      moduleKey: 'map',
      probabilityByIntensity,
    })
    expect(disabled).toMatchObject({
      allowed: false,
      probability: 1,
      reason: EVENT_POLICY_REASON.MODULE_DISABLED,
    })

    const switchedOff = resolveOptionalEventPolicy({
      simulationStore: {
        surpriseMode: 'off',
        isModuleEventsEnabled: () => true,
      },
      moduleKey: 'map',
      probabilityByIntensity,
    })
    expect(switchedOff).toMatchObject({
      allowed: false,
      probability: 0,
      reason: EVENT_POLICY_REASON.INTENSITY_OFF,
    })
  })

  test('normalizes persisted snapshots without trusting derived fields', () => {
    expect(
      normalizeEventPolicySnapshot({
        moduleKey: 'map',
        moduleEventsEnabled: false,
        intensity: 'high',
        presentationMode: 'text',
        probability: 2,
        allowed: true,
        reason: 'forged',
      }),
    ).toEqual({
      schemaVersion: 1,
      moduleKey: 'map',
      moduleEventsEnabled: false,
      intensity: 'high',
      presentationMode: 'text',
      probability: 1,
      allowed: false,
      reason: EVENT_POLICY_REASON.MODULE_DISABLED,
    })
  })
})
