import { describe, expect, test } from 'vitest'
import {
  IMAGE_ADAPTER_KIND,
  buildImageGenerationRequest,
  inferImageModelCapability,
  pruneImageCandidates,
  resolveImageAdapterKind,
  resolveImageGenerationEndpoint,
  resolveImageModelEndpointCandidates,
  resolveOpenAiImageSize,
} from '../src/lib/image-generation-contract'

describe('image generation contract', () => {
  test('detects first-batch adapters and resolves provider endpoints', () => {
    const ljq = { endpoint: 'https://ljqclub.com/', modelId: 'gpt-image-2', adapterKind: 'auto' }
    const aixoras = { endpoint: 'https://api.aixoras.com/v1', modelId: 'nano-banana-2', adapterKind: 'auto' }
    const grsai = { endpoint: 'https://grsaiapi.com/v1/api/generate', modelId: 'nano-banana-2', adapterKind: 'auto' }

    expect(resolveImageAdapterKind(ljq)).toBe(IMAGE_ADAPTER_KIND.OPENAI_IMAGES)
    expect(resolveImageGenerationEndpoint(ljq)).toBe('https://ljqclub.com/v1/images/generations')
    expect(resolveImageGenerationEndpoint(ljq, { hasReferences: true })).toBe('https://ljqclub.com/v1/images/edits')
    expect(resolveImageAdapterKind(aixoras)).toBe(IMAGE_ADAPTER_KIND.OPENAI_CHAT_IMAGE)
    expect(resolveImageGenerationEndpoint(aixoras)).toBe('https://api.aixoras.com/v1/chat/completions')
    expect(resolveImageAdapterKind(grsai)).toBe(IMAGE_ADAPTER_KIND.GRSAI_ASYNC)
    expect(resolveImageGenerationEndpoint(grsai)).toBe('https://grsaiapi.com/v1/api/generate')
  })

  test('builds model endpoint candidates without duplicating v1', () => {
    const endpoints = resolveImageModelEndpointCandidates('https://api.aixoras.com/v1/chat/completions')
    expect(endpoints[0]).toBe('https://api.aixoras.com/v1/models')
    expect(endpoints).toContain('https://api.aixoras.com/v1/model/list')
  })

  test('uses ratio-only controls for ljqclub gpt image', () => {
    const capability = inferImageModelCapability('gpt-image-2', 'https://ljqclub.com/')
    expect(capability.sizeMode).toBe('ratio_only')
    expect(capability.supportedResolutions).toEqual([])
  })

  test('constrains OpenAI-compatible pixel sizes', () => {
    expect(resolveOpenAiImageSize('1:1', '1K')).toBe('1024x1024')
    expect(resolveOpenAiImageSize('1:1', '2K')).toBe('2048x2048')
    expect(resolveOpenAiImageSize('1:1', '4K')).toBe('2880x2880')

    const [width, height] = resolveOpenAiImageSize('21:9', '4K').split('x').map(Number)
    expect(Math.max(width, height)).toBeLessThanOrEqual(3840)
    expect(width * height).toBeLessThanOrEqual(8_294_400)
    expect(width / height).toBeLessThanOrEqual(3)
    expect(width % 16).toBe(0)
    expect(height % 16).toBe(0)
  })

  test('normalizes generation requests and enforces required fields', () => {
    const profile = { endpoint: 'https://api.aixoras.com/v1', modelId: 'nano-banana-2' }
    const invalid = buildImageGenerationRequest({ prompt: '  ' }, profile)
    expect(invalid.ok).toBe(false)
    expect(invalid.errors).toContainEqual({ code: 'PROMPT_REQUIRED', path: 'prompt' })

    const valid = buildImageGenerationRequest({
      prompt: ' portrait ',
      referenceUrls: ['https://example.com/ref.png', 'javascript:bad'],
      count: 9,
    }, profile)
    expect(valid.ok).toBe(true)
    expect(valid.value.prompt).toBe('portrait')
    expect(valid.value.referenceUrls).toEqual(['https://example.com/ref.png'])
    expect(valid.value.count).toBe(4)
  })

  test('prunes candidates by age and count', () => {
    const now = 10_000
    const candidates = [
      { id: 'old', createdAt: 1 },
      { id: 'first', createdAt: 9_000 },
      { id: 'latest', createdAt: 9_500 },
    ]
    expect(pruneImageCandidates(candidates, { now, maxAgeMs: 2_000, maxCandidates: 1 }))
      .toEqual([{ id: 'latest', createdAt: 9_500 }])
  })
})
