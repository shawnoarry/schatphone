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
import {
  getNetworkReportActionLabel,
  getNetworkReportModuleLabel,
  getNetworkReportReasonLabel,
  getNetworkReportSuggestionLabel,
} from '../src/lib/network-report-labels'
import {
  filterNetworkReports,
  normalizeNetworkReportLevelFilter,
  normalizeNetworkReportModuleFilter,
  summarizeNetworkReports,
} from '../src/lib/network-report-state'

describe('network guidance helpers', () => {
  test('tracks setup progress and next required step', () => {
    expect(buildNetworkSetupState({}).nextStep).toBe('url')

    const withUrl = buildNetworkSetupState({
      url: 'https://api.openai.com/v1/chat/completions',
    })
    expect(withUrl.completedSteps).toBe(1)
    expect(withUrl.nextStep).toBe('key')
    expect(withUrl.detectedKind).toBe('openai_compatible')

    const localReady = buildNetworkSetupState({
      url: 'http://localhost:11434/v1',
      key: '',
      model: 'llama3',
    })
    expect(localReady.keyRequired).toBe(false)
    expect(localReady.hasKey).toBe(true)
    expect(localReady.readyToTest).toBe(true)
    expect(localReady.nextStep).toBe('test')

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

    const local = buildNetworkEndpointGuidance({
      url: 'http://localhost:11434/api/chat',
      model: 'llama3',
    })
    expect(local.localEndpoint).toBe(true)
    expect(local.keyRequired).toBe(false)
    expect(local.pathLooksOk).toBe(true)
    expect(local.tone).toBe('success')

    const responses = buildNetworkEndpointGuidance({
      url: 'https://gateway.example.com/v1/responses',
      model: 'gpt-4.1-mini',
    })
    expect(responses.pathLooksOk).toBe(true)

    const geminiRoot = buildNetworkEndpointGuidance({
      url: 'https://generativelanguage.googleapis.com/',
      model: 'gemini-2.5-flash',
    })
    expect(geminiRoot.kind).toBe('gemini')
    expect(geminiRoot.pathLooksOk).toBe(true)

    const anthropic = buildNetworkEndpointGuidance({
      url: 'https://api.anthropic.com/v1/messages',
      key: 'anthropic-key',
      model: 'claude-test',
    })
    expect(anthropic.kind).toBe('anthropic')
    expect(anthropic.providerLabelEn).toBe('Anthropic')
    expect(anthropic.pathLooksOk).toBe(true)
    expect(anthropic.checklist.some((item) => item.id === 'auth' && item.textEn.includes('x-api-key'))).toBe(true)

    const azure = buildNetworkEndpointGuidance({
      url: 'https://demo.openai.azure.com/openai/deployments/main/responses?api-version=preview',
      key: 'azure-key',
      model: 'main',
    })
    expect(azure.kind).toBe('azure_openai_responses')
    expect(azure.providerLabelEn).toBe('Azure OpenAI')
    expect(azure.pathLooksOk).toBe(true)
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
      key: '',
      model: '',
    })
    expect(gateway.tone).toBe('warn')
    expect(gateway.blocking).toHaveLength(0)
    expect(gateway.warnings.some((item) => item.id === 'custom_gateway')).toBe(true)
    expect(gateway.warnings.some((item) => item.id === 'model')).toBe(true)
    expect(gateway.confirmations.some((item) => item.id === 'no_key_required')).toBe(true)

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

  test('labels Network diagnostics reports from reusable helpers', () => {
    const passthroughT = (_zh, en) => en

    expect(getNetworkReportModuleLabel('push', passthroughT)).toBe('Push')
    expect(getNetworkReportModuleLabel('unknown', passthroughT)).toBe('Unknown module')
    expect(getNetworkReportActionLabel('chat_smoke_test', passthroughT)).toBe('Chat smoke test')
    expect(getNetworkReportActionLabel('foreground_event_tick', passthroughT)).toBe(
      'Foreground event tick',
    )
    expect(getNetworkReportActionLabel('custom_action', passthroughT)).toBe('custom_action')

    expect(
      getNetworkReportReasonLabel(
        {
          code: 'AUTH',
          statusCode: 401,
        },
        passthroughT,
      ),
    ).toContain('Authentication')
    expect(
      getNetworkReportSuggestionLabel(
        {
          code: 'STORAGE_LAYER_INVALID',
        },
        passthroughT,
      ),
    ).toContain('Export backup')
    expect(
      getNetworkReportReasonLabel(
        {
          code: 'SIMULATION_FOREGROUND_TICK_TRIGGERED',
        },
        passthroughT,
      ),
    ).toContain('Foreground event tick triggered')
    expect(
      getNetworkReportSuggestionLabel(
        {
          code: 'SIMULATION_FOREGROUND_TICK_SKIPPED',
        },
        passthroughT,
      ),
    ).toContain('No event triggered')
    expect(
      getNetworkReportReasonLabel(
        {
          statusCode: 503,
        },
        passthroughT,
      ),
    ).toContain('Server error')
  })

  test('filters and summarizes Network diagnostics reports from reusable state helpers', () => {
    const reports = [
      { id: 'a', module: 'network', level: 'error' },
      { id: 'b', module: 'network', level: 'info' },
      { id: 'c', module: 'chat', level: 'error' },
      null,
    ]

    expect(normalizeNetworkReportModuleFilter(' push ')).toBe('push')
    expect(normalizeNetworkReportModuleFilter('files')).toBe('all')
    expect(normalizeNetworkReportLevelFilter('error')).toBe('error')
    expect(normalizeNetworkReportLevelFilter('warn')).toBe('all')
    expect(filterNetworkReports(reports, { moduleFilter: 'network', levelFilter: 'error' })).toEqual([
      { id: 'a', module: 'network', level: 'error' },
    ])
    expect(filterNetworkReports(reports, { moduleFilter: 'network', limit: 1 })).toHaveLength(1)
    expect(summarizeNetworkReports(reports)).toEqual({
      total: 4,
      errorCount: 2,
      infoCount: 2,
    })
  })
})
