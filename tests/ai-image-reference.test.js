import { describe, expect, it } from 'vitest'
import {
  buildImageReferenceContextText,
  getAiProviderCapabilities,
  normalizeImageReferences,
} from '../src/lib/ai'

describe('ai image reference helpers', () => {
  it('normalizes and limits reference items', () => {
    const references = normalizeImageReferences([
      { label: ' A ', note: ' first note ', sourceUrl: 'https://a.example/img.png', assetId: 'asset_a' },
      { label: 'B', note: 'second', sourceUrl: 'https://b.example/img.png', assetId: 'asset_b' },
      { label: 'C', note: 'third', sourceUrl: 'https://c.example/img.png', assetId: 'asset_c' },
      { label: 'D', note: 'fourth', sourceUrl: 'https://d.example/img.png', assetId: 'asset_d' },
    ])

    expect(references).toHaveLength(3)
    expect(references[0].label).toBe('A')
    expect(references[0].note).toBe('first note')
    expect(references[0].assetId).toBe('asset_a')
  })

  it('accepts image data URLs and rejects unsafe data payloads', () => {
    const references = normalizeImageReferences([
      {
        label: 'Local image',
        sourceUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
      },
      {
        label: 'Unsafe data',
        sourceUrl: 'data:text/html;base64,PGgxPkJhZDwvaDE+',
      },
    ])

    expect(references).toHaveLength(2)
    expect(references[0].sourceUrl.startsWith('data:image/png;base64,')).toBe(true)
    expect(references[1].sourceUrl).toBe('')
  })

  it('builds readable context text for prompt fallback', () => {
    const text = buildImageReferenceContextText([
      {
        label: 'City night',
        note: 'Neon rain street',
        sourceUrl: 'https://example.com/city.png',
      },
    ])

    expect(text).toContain('[Reference Images]')
    expect(text).toContain('City night')
    expect(text).toContain('Neon rain street')
    expect(text).toContain('https://example.com/city.png')
  })

  it('prefers native-url mode on openai-compatible provider when url refs exist', () => {
    const capabilities = getAiProviderCapabilities({
      settings: {
        api: {
          url: 'https://api.openai.com/v1/chat/completions',
        },
      },
      imageReferences: [{ label: 'scene', sourceUrl: 'https://example.com/scene.png' }],
    })

    expect(capabilities.kind).toBe('openai_compatible')
    expect(capabilities.supportsNativeImageReference).toBe(true)
    expect(capabilities.preferredImageReferenceMode).toBe('native_url')
  })

  it('treats data-url references as native-capable input on openai-compatible provider', () => {
    const capabilities = getAiProviderCapabilities({
      settings: {
        api: {
          url: 'https://api.openai.com/v1/chat/completions',
        },
      },
      imageReferences: [
        {
          label: 'local',
          sourceUrl: 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4',
        },
      ],
    })

    expect(capabilities.nativeUrlReferenceCount).toBe(1)
    expect(capabilities.preferredImageReferenceMode).toBe('native_url')
  })

  it('falls back to context-only mode on gemini provider', () => {
    const capabilities = getAiProviderCapabilities({
      settings: {
        api: {
          url: 'https://generativelanguage.googleapis.com/v1beta/models',
        },
      },
      imageReferences: [{ label: 'scene', sourceUrl: 'https://example.com/scene.png' }],
    })

    expect(capabilities.kind).toBe('gemini')
    expect(capabilities.supportsNativeImageReference).toBe(false)
    expect(capabilities.preferredImageReferenceMode).toBe('context_only')
  })
})
