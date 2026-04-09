import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

describe('system backup copy tone', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('uses direct tone as default', () => {
    const store = useSystemStore()
    expect(store.settings.system.backupCopyTone).toBe('direct')
  })

  test('accepts immersive tone from backup restore', () => {
    const store = useSystemStore()
    const ok = store.restoreFromBackup({
      system: {
        settings: {
          system: {
            backupCopyTone: 'immersive',
          },
        },
      },
    })
    expect(ok).toBe(true)
    expect(store.settings.system.backupCopyTone).toBe('immersive')
  })

  test('normalizes unsupported tone to direct', () => {
    const store = useSystemStore()
    const ok = store.restoreFromBackup({
      system: {
        settings: {
          system: {
            backupCopyTone: 'story_mode',
          },
        },
      },
    })
    expect(ok).toBe(true)
    expect(store.settings.system.backupCopyTone).toBe('direct')
  })
})
