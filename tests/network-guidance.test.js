import { describe, expect, test } from 'vitest'
import {
  applyNetworkProviderTemplate,
  buildNetworkEndpointGuidance,
  buildNetworkFailureGuidance,
  buildNetworkPresetSaveGuidance,
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

  test('summarizes official and custom endpoint quality', () => {
    const official = buildNetworkEndpointGuidance({
      url: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
    })
    expect(official.visible).toBe(true)
    expect(official.customGateway).toBe(false)
    expect(official.pathLooksOk).toBe(true)
    expect(official.tone).toBe('success')
    expect(official.modelFallbackEn).toContain('gpt-4o-mini')

    const gateway = buildNetworkEndpointGuidance({
      url: 'https://gateway.example.com/proxy',
      model: '',
    })
    expect(gateway.customGateway).toBe(true)
    expect(gateway.pathLooksOk).toBe(false)
    expect(gateway.tone).toBe('warn')
    expect(gateway.checklist.some((item) => item.id === 'cors' && item.tone === 'warn')).toBe(true)
    expect(gateway.modelFallbackEn).toContain('enter a model')
  })

  test('flags malformed endpoint before fetch', () => {
    const guidance = buildNetworkEndpointGuidance({
      url: 'ftp://api.example.com/v1/chat/completions',
    })

    expect(guidance.visible).toBe(true)
    expect(guidance.validHttpUrl).toBe(false)
    expect(guidance.tone).toBe('error')
    expect(guidance.checklist[0].id).toBe('protocol')
  })

  test('summarizes preset save safety', () => {
    const clean = buildNetworkPresetSaveGuidance({
      url: 'https://api.openai.com/v1/chat/completions',
      key: 'sk-test',
      model: 'gpt-4o-mini',
    })
    expect(clean.tone).toBe('success')
    expect(clean.canSaveCleanly).toBe(true)
    expect(clean.confirmations.some((item) => item.id === 'key_storage')).toBe(true)

    const gateway = buildNetworkPresetSaveGuidance({
      url: 'https://gateway.example.com/proxy',
      key: 'gateway-key',
      model: '',
    })
    expect(gateway.tone).toBe('warn')
    expect(gateway.blocking).toHaveLength(0)
    expect(gateway.warnings.some((item) => item.id === 'custom_gateway')).toBe(true)
    expect(gateway.warnings.some((item) => item.id === 'model')).toBe(true)

    const invalid = buildNetworkPresetSaveGuidance({
      url: 'ftp://api.example.com/v1/chat/completions',
      key: '',
      model: '',
    })
    expect(invalid.tone).toBe('error')
    expect(invalid.canSaveCleanly).toBe(false)
    expect(invalid.blocking.map((item) => item.id)).toEqual(['url', 'key'])
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
