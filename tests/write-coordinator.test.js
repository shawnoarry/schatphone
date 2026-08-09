import { describe, expect, test } from 'vitest'
import {
  REPOSITORY_WRITE_SCOPE,
  WRITE_COORDINATOR_DEFAULTS,
  createWriteCoordinator,
} from '../src/lib/write-coordinator'

class FakeLockManager {
  held = new Set()

  async request(name, _options, callback) {
    if (this.held.has(name)) return callback(null)
    this.held.add(name)
    try {
      return await callback({ name })
    } finally {
      this.held.delete(name)
    }
  }
}

class FakeBroadcastChannel {
  static messages = []
  static channels = new Set()

  constructor(name) {
    this.name = name
    this.listeners = new Set()
    FakeBroadcastChannel.channels.add(this)
  }

  postMessage(message) {
    FakeBroadcastChannel.messages.push({ channel: this.name, message })
    for (const channel of FakeBroadcastChannel.channels) {
      if (channel === this || channel.name !== this.name) continue
      for (const listener of channel.listeners) listener({ data: message })
    }
  }

  addEventListener(type, listener) {
    if (type === 'message') this.listeners.add(listener)
  }

  removeEventListener(type, listener) {
    if (type === 'message') this.listeners.delete(listener)
  }

  close() {
    FakeBroadcastChannel.channels.delete(this)
    this.listeners.clear()
  }
}

class ThrowingLockManager {
  async request() {
    throw new Error('lock manager unavailable')
  }
}

describe('repository write coordinator', () => {
  test('keeps the accepted scope and timing defaults centralized', () => {
    expect(REPOSITORY_WRITE_SCOPE).toBe('repository-write')
    expect(WRITE_COORDINATOR_DEFAULTS).toEqual({
      waitTimeoutMs: 8000,
      leaseDurationMs: 15000,
      heartbeatMs: 5000,
    })
  })

  test('returns read-only conflict with retry and refresh instead of taking over', async () => {
    FakeBroadcastChannel.messages = []
    const locks = new FakeLockManager()
    let refreshCount = 0
    const first = createWriteCoordinator({
      locks,
      BroadcastChannelClass: FakeBroadcastChannel,
      ownerId: 'page-one',
      waitTimeoutMs: 20,
      pollIntervalMs: 2,
    })
    const second = createWriteCoordinator({
      locks,
      BroadcastChannelClass: FakeBroadcastChannel,
      ownerId: 'page-two',
      waitTimeoutMs: 20,
      pollIntervalMs: 2,
      refreshCurrentSave: async () => {
        refreshCount += 1
        return { ok: true, refreshed: true }
      },
    })

    const firstLease = await first.acquire({ operationId: 'operation-one' })
    expect(firstLease).toMatchObject({ ok: true, adapter: 'web_locks', ownerId: 'page-one' })
    const conflict = await second.acquire({ operationId: 'operation-two' })
    expect(conflict).toMatchObject({
      ok: false,
      code: 'read_only_conflict',
      cause: 'timed_out',
      readOnly: true,
      availableActions: ['retry', 'refresh_current_save'],
    })
    expect(conflict).not.toHaveProperty('forceTakeover')
    expect(await conflict.refreshCurrentSave()).toEqual({ ok: true, refreshed: true })
    expect(refreshCount).toBe(1)

    await firstLease.release()
    const retried = await conflict.retry()
    expect(retried).toMatchObject({ ok: true, ownerId: 'page-two' })
    await retried.release()
    first.close()
    second.close()
  })

  test('broadcasts bounded coordination metadata without owner payloads', async () => {
    FakeBroadcastChannel.messages = []
    const coordinator = createWriteCoordinator({
      locks: new FakeLockManager(),
      BroadcastChannelClass: FakeBroadcastChannel,
      ownerId: 'page-one',
    })
    const lease = await coordinator.acquire({
      operationId: 'bounded-operation',
      scope: { ownerId: 'book', dataClassId: 'book.asset', generationId: 'candidate' },
    })
    await lease.release()
    expect(FakeBroadcastChannel.messages.map((entry) => entry.message.type)).toEqual([
      'acquired',
      'released',
    ])
    for (const { message } of FakeBroadcastChannel.messages) {
      expect(Object.keys(message).sort()).toEqual([
        'at',
        'fencingToken',
        'operationId',
        'ownerId',
        'scopeKey',
        'type',
      ])
      expect(message).not.toHaveProperty('scope')
      expect(message).not.toHaveProperty('payload')
    }
    coordinator.close()
  })

  test('lets another page observe a bounded release for the same write scope', async () => {
    FakeBroadcastChannel.messages = []
    FakeBroadcastChannel.channels.clear()
    const locks = new FakeLockManager()
    const first = createWriteCoordinator({
      locks,
      BroadcastChannelClass: FakeBroadcastChannel,
      ownerId: 'page-one',
      scopeKey: 'current-save-write',
    })
    const second = createWriteCoordinator({
      locks,
      BroadcastChannelClass: FakeBroadcastChannel,
      ownerId: 'page-two',
      scopeKey: 'current-save-write',
    })
    const observed = []
    const unsubscribe = second.subscribe((message) => observed.push(message))

    const lease = await first.acquire({ operationId: 'page-one-session' })
    await lease.release()

    expect(observed).toEqual([
      expect.objectContaining({
        type: 'acquired',
        scopeKey: 'current-save-write',
        ownerId: 'page-one',
      }),
      expect.objectContaining({
        type: 'released',
        scopeKey: 'current-save-write',
        ownerId: 'page-one',
      }),
    ])
    unsubscribe()
    first.close()
    second.close()
  })

  test('isolates a caller-defined scope without changing the repository default', async () => {
    FakeBroadcastChannel.messages = []
    const coordinator = createWriteCoordinator({
      locks: new FakeLockManager(),
      BroadcastChannelClass: FakeBroadcastChannel,
      ownerId: 'page-writer',
      scopeKey: 'current-save-write',
    })

    const lease = await coordinator.acquire({ operationId: 'page-session' })

    expect(coordinator.scopeKey).toBe('current-save-write')
    expect(FakeBroadcastChannel.messages[0]?.message.scopeKey).toBe('current-save-write')
    await lease.release()
    coordinator.close()
  })

  test('fails closed when the active pointer changes before staging or commit', async () => {
    let pointerRevision = 2
    const coordinator = createWriteCoordinator({
      locks: new FakeLockManager(),
      BroadcastChannelClass: FakeBroadcastChannel,
      ownerId: 'stale-page',
      readActivePointer: async () => ({ generationId: 'generation-current', pointerRevision }),
    })

    const staleAtAcquire = await coordinator.acquire({
      operationId: 'stale-at-acquire',
      expectedPointerRevision: 1,
    })
    expect(staleAtAcquire).toMatchObject({
      ok: false,
      code: 'stale_generation',
      readOnly: true,
      expectedPointerRevision: 1,
      actualPointerRevision: 2,
      availableActions: ['retry', 'refresh_current_save'],
    })

    const lease = await coordinator.acquire({
      operationId: 'fresh-at-acquire',
      expectedPointerRevision: 2,
    })
    expect(lease.ok).toBe(true)
    pointerRevision = 3
    await expect(lease.verifyBeforeCommit()).resolves.toMatchObject({
      ok: false,
      code: 'stale_generation',
      expected: 2,
      actual: 3,
    })
    await lease.release()
    coordinator.close()
  })

  test('classifies a platform lock failure instead of exposing an unsafe raw exception', async () => {
    const coordinator = createWriteCoordinator({
      locks: new ThrowingLockManager(),
      BroadcastChannelClass: FakeBroadcastChannel,
      ownerId: 'unsupported-page',
    })
    await expect(coordinator.acquire({ operationId: 'unsupported-operation' })).resolves.toEqual({
      ok: false,
      code: 'unsupported',
      readOnly: true,
    })
    coordinator.close()
  })
})
