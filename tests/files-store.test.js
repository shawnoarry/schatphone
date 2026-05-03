import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFilesStore } from '../src/stores/files'
import { MEDIA_KIND, MEDIA_SIZE_SCENE, resolveMediaSizeLimitBytes } from '../src/lib/media-policy'

describe('files store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('seeds starter records and persists quick-note updates', () => {
    const store = useFilesStore()

    expect(store.fileCount).toBeGreaterThan(0)
    store.resetForTesting()

    const note = store.createQuickNote('灵感记录.txt', { content: 'hello' })
    expect(note?.kind).toBe('text')
    expect(note?.sourceType).toBe('quick_note')
    expect(store.fileCount).toBe(1)

    expect(store.toggleFavorite(note.id)).toBe(true)
    expect(store.findFileById(note.id)?.favorite).toBe(true)

    const snapshot = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restoredStore = useFilesStore()

    expect(restoredStore.restoreFromBackup({ files: snapshot })).toBe(true)
    expect(restoredStore.fileCount).toBe(1)
    expect(restoredStore.findFileById(note.id)?.favorite).toBe(true)
  })

  test('imports local file metadata and dedupes by local fingerprint', async () => {
    const store = useFilesStore()
    store.resetForTesting()

    const markdown = new File(['# intro'], '角色.md', {
      type: 'text/markdown',
      lastModified: 101,
    })
    const image = new File(['image'], 'reference.png', {
      type: 'image/png',
      lastModified: 102,
    })

    const result = await store.importLocalFiles([markdown, image])

    expect(result.ok).toBe(true)
    expect(result.importedCount).toBe(2)
    expect(store.records.map((item) => item.kind)).toEqual(['image', 'markdown'])

    const duplicate = await store.importLocalFiles([markdown])

    expect(duplicate.ok).toBe(false)
    expect(duplicate.reason).toBe('all_duplicate')
    expect(duplicate.skippedDuplicateCount).toBe(1)
    expect(store.fileCount).toBe(2)
  })

  test('applies media size guard for local media indexing', async () => {
    const store = useFilesStore()
    store.resetForTesting()
    const maxBytes = resolveMediaSizeLimitBytes(MEDIA_KIND.IMAGE, {
      scene: MEDIA_SIZE_SCENE.ONE_OFF_INLINE,
    })
    const oversized = new File([new Uint8Array(maxBytes + 1)], 'too-large.png', {
      type: 'image/png',
      lastModified: 201,
    })

    const result = await store.importLocalFiles([oversized])

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('all_too_large')
    expect(result.skippedTooLargeCount).toBe(1)
    expect(result.firstTooLarge).toEqual(
      expect.objectContaining({
        name: 'too-large.png',
        maxBytes,
      }),
    )
    expect(store.fileCount).toBe(0)
  })

  test('removes records without touching unrelated entries', () => {
    const store = useFilesStore()
    store.resetForTesting()
    const first = store.createQuickNote('first.txt')
    const second = store.createQuickNote('second.txt')

    expect(store.removeFile(first.id)).toBe(true)

    expect(store.findFileById(first.id)).toBeNull()
    expect(store.findFileById(second.id)?.name).toBe('second.txt')
    expect(store.removeFile('missing')).toBe(false)
  })
})
