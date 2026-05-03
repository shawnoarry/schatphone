import { describe, expect, test } from 'vitest'
import {
  applyNetworkProviderTemplate,
  buildNetworkFailureGuidance,
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

  test('classifies missing key before a connection attempt', () => {
    const guidance = buildNetworkFailureGuidance(
      { code: 'NO_API_KEY' },
      {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
      },
    )

    expect(guidance.code).toBe('NO_API_KEY')
    expect(guidance.provider).toBe('openai_compatible')
    expect(guidance.titleEn).toContain('API key')
    expect(guidance.fixEn).toContain('key')
  })

  test('classifies provider and gateway failures with actionable copy', () => {
    const auth = buildNetworkFailureGuidance(
      { code: 'AUTH', status: 403 },
      {
        url: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: 'gemini-2.5-flash',
      },
    )
    expect(auth.provider).toBe('gemini')
    expect(auth.statusCode).toBe(403)
    expect(auth.fixEn).toContain('Gemini')

    const cors = buildNetworkFailureGuidance(
      { code: 'NETWORK' },
      {
        url: 'https://your-gateway.example.com/v1/chat/completions',
        model: 'gpt-4o-mini',
      },
    )
    expect(cors.titleEn).toContain('CORS')
    expect(cors.fixEn).toContain('gateway')
  })
})
