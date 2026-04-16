import { describe, expect, test } from 'vitest'
import {
  normalizeAppIconOverrides,
  resolveAppIconMeta,
} from '../src/lib/app-icon-presentation'
import { resolveNotificationModuleMeta } from '../src/lib/notification-presentation'

describe('app icon presentation helpers', () => {
  test('normalizes only supported icon overrides', () => {
    const normalized = normalizeAppIconOverrides({
      app_chat: {
        icon: 'fas fa-comment-dots',
        accent: 'cool',
      },
      app_map: {
        icon: 'not-valid',
        accent: 'invalid',
      },
      random_key: {
        icon: 'fas fa-cog',
        accent: 'dark',
      },
    })

    expect(normalized.app_chat).toEqual({
      icon: 'fas fa-comment-dots',
      accent: 'cool',
    })
    expect(normalized.app_map).toBeUndefined()
    expect(normalized.random_key).toBeUndefined()
  })

  test('resolves home app icon metadata with overrides', () => {
    const meta = resolveAppIconMeta(
      'app_gallery',
      {
        app_gallery: {
          icon: 'fas fa-camera',
          accent: 'warm',
        },
      },
      'zh-CN',
    )

    expect(meta.label).toBe('相册')
    expect(meta.icon).toBe('fas fa-camera')
    expect(meta.accent).toBe('warm')
    expect(meta.toneClass).toBe('accent-warm')
  })

  test('reuses app icon overrides in in-shell notification presentation', () => {
    const meta = resolveNotificationModuleMeta(
      {
        source: 'chat_ai_reply',
        route: '/chat/7',
      },
      'en-US',
      {
        app_chat: {
          icon: 'fas fa-paper-plane',
          accent: 'dark',
        },
      },
    )

    expect(meta.key).toBe('chat')
    expect(meta.label).toBe('Chat')
    expect(meta.icon).toBe('fas fa-paper-plane')
    expect(meta.toneClass).toBe('accent-dark')
  })
})
