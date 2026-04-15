import { describe, expect, test } from 'vitest'
import {
  MEDIA_KIND,
  MEDIA_SIZE_SCENE,
  formatBytesCompact,
  guessMediaKindFromFile,
  resolveMediaSizeLimitBytes,
  validateMediaFileBySize,
} from '../src/lib/media-policy'

describe('media policy', () => {
  test('detects gif/image/video kind from file metadata', () => {
    const gif = new File(['gif-data'], 'funny.gif', { type: 'image/gif' })
    const image = new File(['png-data'], 'avatar.png', { type: 'image/png' })
    const video = new File(['mp4-data'], 'clip.mp4', { type: 'video/mp4' })

    expect(guessMediaKindFromFile(gif)).toBe(MEDIA_KIND.GIF)
    expect(guessMediaKindFromFile(image)).toBe(MEDIA_KIND.IMAGE)
    expect(guessMediaKindFromFile(video)).toBe(MEDIA_KIND.VIDEO)
  })

  test('uses scene-specific limits', () => {
    const galleryImage = resolveMediaSizeLimitBytes(MEDIA_KIND.IMAGE, {
      scene: MEDIA_SIZE_SCENE.GALLERY_IMPORT,
    })
    const inlineImage = resolveMediaSizeLimitBytes(MEDIA_KIND.IMAGE, {
      scene: MEDIA_SIZE_SCENE.ONE_OFF_INLINE,
    })
    expect(galleryImage).toBeGreaterThan(inlineImage)
  })

  test('validates file size with deterministic too_large signal', () => {
    const inlineLimit = resolveMediaSizeLimitBytes(MEDIA_KIND.IMAGE, {
      scene: MEDIA_SIZE_SCENE.ONE_OFF_INLINE,
    })
    const oversized = new File([new Uint8Array(inlineLimit + 1)], 'oversized.png', {
      type: 'image/png',
    })
    const okFile = new File([new Uint8Array(Math.max(1, inlineLimit - 10))], 'ok.png', {
      type: 'image/png',
    })

    const blocked = validateMediaFileBySize(oversized, {
      scene: MEDIA_SIZE_SCENE.ONE_OFF_INLINE,
      fallbackKind: MEDIA_KIND.IMAGE,
    })
    const allowed = validateMediaFileBySize(okFile, {
      scene: MEDIA_SIZE_SCENE.ONE_OFF_INLINE,
      fallbackKind: MEDIA_KIND.IMAGE,
    })

    expect(blocked.ok).toBe(false)
    expect(blocked.reason).toBe('too_large')
    expect(blocked.maxBytes).toBe(inlineLimit)
    expect(allowed.ok).toBe(true)
  })

  test('formats byte labels for user-facing copy', () => {
    expect(formatBytesCompact(512)).toBe('512 B')
    expect(formatBytesCompact(2048)).toBe('2 KB')
    expect(formatBytesCompact(2 * 1024 * 1024)).toBe('2.0 MB')
  })
})

