import { describe, expect, test } from 'vitest'
import {
  applyNetworkProviderTemplate,
  buildNetworkSetupCopy,
  buildNetworkSetupState,
  getNetworkProviderTemplate,
} from '../src/lib/network-guidance'

describe('network guidance helpers', () => {
  test('tracks setup progress and next required step', () => {
    expect(buildNetworkSetupState({}).nextStep).toBe('url')

    const withUrl = buildNetworkSetupState({
      url: 'https://api.openai.com/v1/chat/completions',
    })
    expect(withUrl.completedSteps).toBe(1)
    expect(withUrl.nextStep).toBe('key')
    expect(withUrl.detectedKind).toBe('openai_compatible')

    const ready = buildNetworkSetupState({
      url: 'https://generativelanguage.googleapis.com/v1beta/models',
      key: 'gemini-key',
      model: 'gemini-2.5-flash',
    })
    expect(ready.readyToTest).toBe(true)
    expect(ready.nextStep).toBe('test')
    expect(ready.progressPercent).toBe(100)
    expect(ready.detectedKind).toBe('gemini')
  })

  test('applies provider templates without touching key', () => {
    const api = {
      url: '',
      key: 'keep-me',
      model: '',
      resolvedKind: '',
    }

    expect(applyNetworkProviderTemplate(api, 'gemini')).toBe(true)
    expect(api.url).toContain('generativelanguage.googleapis.com')
    expect(api.model).toBe('gemini-2.5-flash')
    expect(api.key).toBe('keep-me')
    expect(api.resolvedKind).toBe('gemini')
  })

  test('returns stable user-facing copy for guidance states', () => {
    const template = getNetworkProviderTemplate('openai')
    expect(template?.model).toBe('gpt-4o-mini')

    const copy = buildNetworkSetupCopy(
      buildNetworkSetupState({
        url: template.url,
        key: 'sk-test',
        model: template.model,
      }),
    )

    expect(copy.tone).toBe('success')
    expect(copy.actionEn).toBe('Test connection')
  })
})
