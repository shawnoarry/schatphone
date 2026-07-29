import { describe, expect, test, vi } from 'vitest'
import {
  ImageGenerationError,
  extractImageUrls,
  fetchImageModels,
  generateImage,
} from '../src/lib/image-generation-api'

const jsonResponse = (body, init = {}) => new Response(JSON.stringify(body), {
  status: init.status || 200,
  headers: { 'content-type': 'application/json', ...(init.headers || {}) },
})

describe('image generation api', () => {
  test('extracts nested and chat image response variants', () => {
    expect(extractImageUrls({
      data: [{ b64_json: 'YWJj' }],
      choices: [{ message: { images: ['https://example.com/a.png'] } }],
      output: '![result](https://example.com/b.png)',
    })).toEqual([
      'data:image/png;base64,YWJj',
      'https://example.com/a.png',
      'https://example.com/b.png',
    ])
  })

  test('sends OpenAI-compatible image generation payloads', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [{ url: 'https://example.com/result.png' }] }))
    const result = await generateImage({
      profile: { endpoint: 'https://ljqclub.com/', modelId: 'gpt-image-2', adapterKind: 'auto' },
      credentials: { apiKey: 'secret' },
      request: { prompt: 'portrait', referenceUrls: [], aspectRatio: '4:5', resolution: '', count: 1 },
      fetchImpl,
    })

    expect(result.imageUrls).toEqual(['https://example.com/result.png'])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://ljqclub.com/v1/images/generations')
    expect(JSON.parse(init.body)).toMatchObject({ model: 'gpt-image-2', size: '4:5', n: 1 })
    expect(init.headers.Authorization).toBe('Bearer secret')
  })

  test('uses multipart image edit when references are present', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).startsWith('data:image/')) {
        return { ok: true, blob: async () => new Blob(['ref'], { type: 'image/png' }) }
      }
      return jsonResponse({ data: [{ url: 'https://example.com/edited.png' }] })
    })
    await generateImage({
      profile: { endpoint: 'https://api.aixoras.com/v1', modelId: 'gpt-image-2', adapterKind: 'auto' },
      credentials: { apiKey: 'secret' },
      request: {
        prompt: 'edit',
        referenceUrls: ['data:image/png;base64,cmVm'],
        aspectRatio: '1:1',
        resolution: '1K',
        count: 1,
      },
      fetchImpl,
    })

    const [, init] = fetchImpl.mock.calls.find(([url]) => String(url).includes('/images/edits'))
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.body.get('model')).toBe('gpt-image-2')
    expect(init.body.getAll('image[]')).toHaveLength(1)
  })

  test('submits and polls a Grsai task', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { job_id: 'task-7' } }))
      .mockResolvedValueOnce(jsonResponse({ status: 'processing' }))
      .mockResolvedValueOnce(jsonResponse({ result: { images: ['https://example.com/grsai.png'] } }))
    const onTaskCreated = vi.fn()

    const result = await generateImage({
      profile: {
        endpoint: 'https://grsaiapi.com/v1/api/generate',
        modelId: 'nano-banana-2',
        adapterKind: 'grsai_async',
      },
      credentials: { apiKey: 'secret' },
      request: { prompt: 'scene', referenceUrls: [], aspectRatio: '16:9', resolution: '2K', count: 1 },
      fetchImpl,
      delayImpl: vi.fn(async () => {}),
      onTaskCreated,
    })

    expect(onTaskCreated).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task-7' }))
    expect(result.taskId).toBe('task-7')
    expect(result.imageUrls).toEqual(['https://example.com/grsai.png'])
    expect(fetchImpl.mock.calls[1][0]).toBe('https://grsaiapi.com/v1/api/result?id=task-7')
  })

  test('falls back to labeled built-in models for Grsai', async () => {
    const result = await fetchImageModels({
      profile: { endpoint: 'https://grsaiapi.com/v1/api/generate' },
      credentials: { apiKey: 'secret' },
      fetchImpl: vi.fn(async () => jsonResponse({ error: 'missing' }, { status: 404 })),
    })
    expect(result.source).toBe('built_in')
    expect(result.warning).toBe('HTTP_ERROR')
    expect(result.models.map((model) => model.id)).toContain('nano-banana-2')
  })

  test('preserves UTF-8 proxy errors and upstream auth status', async () => {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ error: '密钥无效' }))))
    const fetchImpl = vi.fn(async () => new Response(
      `${JSON.stringify({ type: 'done', status: 401, body: encoded })}\n`,
      { headers: { 'content-type': 'application/x-ndjson' } },
    ))

    await expect(fetchImageModels({
      profile: { endpoint: 'https://api.example.com/v1', useProxy: true, proxyUrl: 'https://proxy.example.com' },
      credentials: { apiKey: 'secret' },
      fetchImpl,
    })).rejects.toMatchObject({
      name: 'ImageGenerationError',
      code: 'AUTH_FAILED',
      message: '密钥无效',
    })
  })

  test('requires a local API key before generation', async () => {
    await expect(generateImage({
      profile: { endpoint: 'https://api.example.com/v1', modelId: 'gpt-image-2' },
      request: { prompt: 'test', referenceUrls: [], aspectRatio: '1:1', resolution: '1K', count: 1 },
    })).rejects.toBeInstanceOf(ImageGenerationError)
  })
})
